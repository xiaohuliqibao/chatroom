#!/bin/bash

################################################################################
# Chatroom 快速更新脚本
# 仅更新代码和重启应用，不重新配置 Nginx 和 SSL
################################################################################

set -e

# 配置变量
DEPLOY_DIR="/var/www/chatroom"
BACKUP_DIR="/var/www/chatroom/backups"
LOG_FILE="/var/www/chatroom/update.log"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

echo ""
echo "========================================"
echo "    Chatroom 快速更新"
echo "========================================"
echo ""

# 备份数据库
if [ -f "$DEPLOY_DIR/data/chatroom.db" ]; then
    BACKUP_FILE="$BACKUP_DIR/chatroom_$(date +%Y%m%d_%H%M%S).db"
    cp "$DEPLOY_DIR/data/chatroom.db" "$BACKUP_FILE"
    log "数据库备份完成: $BACKUP_FILE"
else
    log_warning "数据库文件不存在，跳过备份"
fi

# 拉取最新代码
log "拉取最新代码..."
cd "$DEPLOY_DIR"
git fetch origin
git reset --hard origin/main
log "代码拉取完成"

# 安装依赖
log "安装依赖..."
npm install --production
log "依赖安装完成"

# 重启应用
log "重启应用..."
pm2 restart chatroom
log "应用重启完成"

echo ""
echo "========================================"
echo "    更新完成！"
echo "========================================"
echo ""
log "更新完成，应用已重启"
