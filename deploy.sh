#!/bin/bash

################################################################################
# Chatroom 自动部署脚本
# 用于 CentOS 9 系统
# 功能：拉取最新代码、安装依赖、配置 Nginx、签发 HTTPS 证书、重启服务
################################################################################

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
REPO_URL="https://github.com/xiaohuliqibao/chatroom.git"
DEPLOY_DIR="/var/www/chatroom"
DOMAIN="chatroom.kagerou.top"
PORT=3000
BACKUP_DIR="/var/www/chatroom/backups"
LOG_FILE="/var/www/chatroom/deploy.log"

# 生成随机 API_KEY
generate_api_key() {
    openssl rand -hex 32
}

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 用户或 sudo 执行此脚本"
        exit 1
    fi
}

# 检查必要的命令是否存在
check_dependencies() {
    log_info "检查系统依赖..."

    local missing_deps=()

    for cmd in git nginx certbot node npm; do
        if ! command -v $cmd &> /dev/null; then
            missing_deps+=($cmd)
        fi
    done

    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少以下依赖: ${missing_deps[*]}"
        log_info "请先安装缺少的依赖"
        exit 1
    fi

    log "系统依赖检查完成 ✓"
}

# 检查并安装 PM2
check_pm2() {
    log_info "检查 PM2..."

    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 未安装，正在安装..."
        npm install -g pm2
        log "PM2 安装完成 ✓"
    else
        log "PM2 已安装 ✓"
    fi
}

# 创建备份目录
create_backup_dir() {
    log_info "创建备份目录..."
    mkdir -p "$BACKUP_DIR"
    log "备份目录创建完成 ✓"
}

# 备份数据库
backup_database() {
    log_info "备份数据库..."

    if [ -f "$DEPLOY_DIR/data/chatroom.db" ]; then
        local backup_file="$BACKUP_DIR/chatroom_$(date +%Y%m%d_%H%M%S).db"
        cp "$DEPLOY_DIR/data/chatroom.db" "$backup_file"
        log "数据库备份完成: $backup_file ✓"

        # 清理7天前的备份
        find "$BACKUP_DIR" -name "chatroom_*.db" -mtime +7 -delete
        log_info "已清理7天前的旧备份"
    else
        log_warning "数据库文件不存在，跳过备份"
    fi
}

# 拉取最新代码
pull_latest_code() {
    log_info "拉取最新代码..."

    if [ -d "$DEPLOY_DIR/.git" ]; then
        log_info "项目已存在，拉取最新代码..."
        cd "$DEPLOY_DIR"
        git fetch origin
        git reset --hard origin/main
        log "代码拉取完成 ✓"
    else
        log_info "首次部署，克隆项目..."
        git clone "$REPO_URL" "$DEPLOY_DIR"
        cd "$DEPLOY_DIR"
        log "项目克隆完成 ✓"
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."

    cd "$DEPLOY_DIR"

    if [ -f "package.json" ]; then
        npm install --production
        log "依赖安装完成 ✓"
    else
        log_error "package.json 文件不存在"
        exit 1
    fi
}

# 配置环境变量
configure_env() {
    log_info "配置环境变量..."

    cd "$DEPLOY_DIR"

    # 如果 .env 文件不存在，从 .env.example 复制
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "已从 .env.example 创建 .env 文件"
        else
            log_warning ".env.example 文件不存在，创建默认 .env 文件"
            cat > .env << EOF
PORT=3000
NODE_ENV=production
API_KEY=your-secret-api-key-change-this-in-production
DB_PATH=./data/chatroom.db
ALLOWED_ORIGINS=https://$DOMAIN
LOG_LEVEL=info
LOG_FILE_PATH=./logs
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX=100
SOCKET_MESSAGE_LIMIT=10
SOCKET_MESSAGE_WINDOW_MS=10000
EOF
        fi
    fi

    # 生成或更新 API_KEY
    if grep -q "your-secret-api-key-change-this-in-production" .env; then
        log_info "生成新的 API_KEY..."
        NEW_API_KEY=$(generate_api_key)
        sed -i "s/your-secret-api-key-change-this-in-production/$NEW_API_KEY/" .env
        log "API_KEY 已更新 ✓"
    fi

    # 更新环境变量配置
    sed -i "s/^PORT=.*/PORT=$PORT/" .env
    sed -i "s/^NODE_ENV=.*/NODE_ENV=production/" .env
    sed -i "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://$DOMAIN|" .env

    log "环境变量配置完成 ✓"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."

    cd "$DEPLOY_DIR"
    mkdir -p data logs
    log "目录创建完成 ✓"
}

# 配置 Nginx
configure_nginx() {
    log_info "配置 Nginx..."

    local nginx_config="/etc/nginx/conf.d/$DOMAIN.conf"

    # 创建 Nginx 配置文件
    cat > "$nginx_config" << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # 重定向到 HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # SSL 证书配置（由 Certbot 自动配置）
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 静态文件
    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:$PORT/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # 日志
    access_log /var/log/nginx/${DOMAIN}_access.log;
    error_log /var/log/nginx/${DOMAIN}_error.log;
}
EOF

    # 测试 Nginx 配置
    if nginx -t; then
        log "Nginx 配置测试通过 ✓"
    else
        log_error "Nginx 配置测试失败"
        exit 1
    fi

    # 重启 Nginx
    systemctl reload nginx
    log "Nginx 配置完成并已重启 ✓"
}

# 签发 HTTPS 证书
setup_ssl() {
    log_info "配置 HTTPS 证书..."

    # 检查证书是否已存在
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        log_info "SSL 证书已存在，尝试续期..."
        certbot renew --quiet
        log "SSL 证书续期完成 ✓"
    else
        log_info "申请新的 SSL 证书..."

        # 停止 Nginx 以释放 80 端口
        systemctl stop nginx

        # 申请证书
        certbot certonly --standalone \
            --email admin@$DOMAIN \
            --agree-tos \
            --no-eff-email \
            -d $DOMAIN

        # 启动 Nginx
        systemctl start nginx

        log "SSL 证书申请完成 ✓"
    fi
}

# 使用 PM2 启动应用
start_application() {
    log_info "启动应用..."

    cd "$DEPLOY_DIR"

    # 停止旧的应用实例
    if pm2 list | grep -q "chatroom"; then
        log_info "停止旧的应用实例..."
        pm2 stop chatroom || true
        pm2 delete chatroom || true
    fi

    # 启动新实例
    pm2 start server.js --name chatroom --env production

    # 设置开机自启
    pm2 startup systemd -u root --hp /root
    pm2 save

    log "应用启动完成 ✓"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."

    # 检查 firewalld 是否运行
    if systemctl is-active --quiet firewalld; then
        # 开放 HTTP 和 HTTPS 端口
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
        log "防火墙配置完成 ✓"
    else
        log_warning "firewalld 未运行，跳过防火墙配置"
    fi
}

# 设置文件权限
set_permissions() {
    log_info "设置文件权限..."

    cd "$DEPLOY_DIR"
    chown -R root:root .
    chmod -R 755 .
    chmod 644 .env
    chmod -R 755 public/
    chmod 644 public/*

    log "文件权限设置完成 ✓"
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "========================================"
    echo "        部署完成！"
    echo "========================================"
    echo ""
    echo "访问地址: https://$DOMAIN"
    echo ""
    echo "常用命令:"
    echo "  查看应用状态: pm2 status"
    echo "  查看应用日志: pm2 logs chatroom"
    echo "  重启应用:     pm2 restart chatroom"
    echo "  停止应用:     pm2 stop chatroom"
    echo "  查看 Nginx 日志: tail -f /var/log/nginx/${DOMAIN}_access.log"
    echo ""
    echo "数据库备份位置: $BACKUP_DIR"
    echo "部署日志: $LOG_FILE"
    echo ""
    echo "========================================"
}

# 主函数
main() {
    echo ""
    echo "========================================"
    echo "    Chatroom 自动部署脚本"
    echo "    域名: $DOMAIN"
    echo "========================================"
    echo ""

    # 检查 root 权限
    check_root

    # 检查依赖
    check_dependencies

    # 检查并安装 PM2
    check_pm2

    # 创建备份目录
    create_backup_dir

    # 备份数据库
    backup_database

    # 拉取最新代码
    pull_latest_code

    # 安装依赖
    install_dependencies

    # 配置环境变量
    configure_env

    # 创建必要的目录
    create_directories

    # 配置 Nginx
    configure_nginx

    # 签发 HTTPS 证书
    setup_ssl

    # 配置防火墙
    configure_firewall

    # 设置文件权限
    set_permissions

    # 启动应用
    start_application

    # 显示部署信息
    show_deployment_info
}

# 执行主函数
main
