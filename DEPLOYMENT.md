# Chatroom 部署指南

本文档介绍如何使用自动化脚本将 Chatroom 项目部署到 CentOS 9 服务器上。

## 部署环境

- **操作系统**: CentOS 9
- **域名**: chatroom.kagerou.top
- **项目地址**: https://github.com/xiaohuliqibao/chatroom

## 前置要求

在执行部署脚本之前，请确保服务器已安装以下软件：

```bash
# 更新系统
sudo dnf update -y

# 安装必要软件
sudo dnf install -y git nginx nodejs npm certbot python3-certbot-nginx

# 启用并启动 Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 启用 firewalld（如果未启用）
sudo systemctl enable firewalld
sudo systemctl start firewalld
```

## 部署脚本说明

### 1. 完整部署脚本 (deploy.sh)

这是主要的部署脚本，执行以下操作：

- ✅ 检查系统依赖（git, nginx, certbot, node, npm, pm2）
- ✅ 备份现有数据库
- ✅ 拉取最新代码
- ✅ 安装项目依赖
- ✅ 配置环境变量（自动生成 API_KEY）
- ✅ 配置 Nginx 反向代理
- ✅ 申请/续期 HTTPS 证书（Let's Encrypt）
- ✅ 配置防火墙规则
- ✅ 使用 PM2 启动应用
- ✅ 设置开机自启

### 2. 快速更新脚本 (update.sh)

用于日常更新，仅执行以下操作：

- ✅ 备份数据库
- ✅ 拉取最新代码
- ✅ 安装依赖
- ✅ 重启应用

**注意**: 此脚本不会重新配置 Nginx 和 SSL 证书。

### 3. 数据库备份脚本 (backup.sh)

用于手动备份数据库：

- ✅ 备份数据库文件
- ✅ 压缩备份文件
- ✅ 清理7天前的旧备份

## 部署步骤

### 首次部署

```bash
# 1. 上传部署脚本到服务器
scp deploy.sh root@your-server:/root/

# 2. 登录服务器
ssh root@your-server

# 3. 给脚本添加执行权限
chmod +x deploy.sh

# 4. 执行部署脚本
./deploy.sh
```

### 日常更新

```bash
# 1. 上传更新脚本到服务器
scp update.sh root@your-server:/root/

# 2. 登录服务器
ssh root@your-server

# 3. 给脚本添加执行权限
chmod +x update.sh

# 4. 执行更新脚本
./update.sh
```

### 手动备份数据库

```bash
# 1. 上传备份脚本到服务器
scp backup.sh root@your-server:/root/

# 2. 登录服务器
ssh root@your-server

# 3. 给脚本添加执行权限
chmod +x backup.sh

# 4. 执行备份脚本
./backup.sh
```

## 配置定时任务

建议配置定时任务自动备份数据库：

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天凌晨2点自动备份）
0 2 * * * /root/backup.sh >> /var/www/chatroom/cron.log 2>&1
```

## 常用命令

### 应用管理

```bash
# 查看应用状态
pm2 status

# 查看应用日志
pm2 logs chatroom

# 查看实时日志
pm2 logs chatroom --lines 100

# 重启应用
pm2 restart chatroom

# 停止应用
pm2 stop chatroom

# 删除应用
pm2 delete chatroom

# 查看应用详细信息
pm2 show chatroom
```

### Nginx 管理

```bash
# 测试 Nginx 配置
nginx -t

# 重启 Nginx
systemctl restart nginx

# 重新加载 Nginx 配置
systemctl reload nginx

# 查看 Nginx 状态
systemctl status nginx

# 查看 Nginx 访问日志
tail -f /var/log/nginx/chatroom.kagerou.top_access.log

# 查看 Nginx 错误日志
tail -f /var/log/nginx/chatroom.kagerou.top_error.log
```

### SSL 证书管理

```bash
# 查看证书状态
certbot certificates

# 手动续期证书
certbot renew

# 测试证书续期
certbot renew --dry-run

# 查看证书详情
ls -la /etc/letsencrypt/live/chatroom.kagerou.top/
```

### 数据库管理

```bash
# 查看数据库文件
ls -lh /var/www/chatroom/data/chatroom.db

# 查看备份文件
ls -lh /var/www/chatroom/backups/

# 恢复数据库（如果需要）
cp /var/www/chatroom/backups/chatroom_YYYYMMDD_HHMMSS.db /var/www/chatroom/data/chatroom.db
pm2 restart chatroom
```

## 故障排除

### 问题 1: 端口被占用

```bash
# 检查端口占用
netstat -tlnp | grep :3000

# 如果端口被占用，停止占用进程或修改配置
```

### 问题 2: SSL 证书申请失败

```bash
# 确保域名已正确解析到服务器 IP
# 检查防火墙是否开放 80 和 443 端口
sudo firewall-cmd --list-all

# 手动申请证书
sudo certbot certonly --standalone -d chatroom.kagerou.top
```

### 问题 3: 应用无法启动

```bash
# 查看应用日志
pm2 logs chatroom --err

# 检查环境变量配置
cat /var/www/chatroom/.env

# 检查 Node.js 版本
node --version

# 重新安装依赖
cd /var/www/chatroom
npm install --production
```

### 问题 4: Nginx 配置错误

```bash
# 测试 Nginx 配置
nginx -t

# 查看错误日志
tail -f /var/log/nginx/error.log

# 检查配置文件
cat /etc/nginx/conf.d/chatroom.kagerou.top.conf
```

## 安全建议

1. **定期更新系统**
   ```bash
   sudo dnf update -y
   ```

2. **定期更新依赖**
   ```bash
   cd /var/www/chatroom
   npm audit
   npm audit fix
   ```

3. **定期备份数据库**
   - 已配置定时任务自动备份
   - 可手动执行 `./backup.sh`

4. **监控应用状态**
   ```bash
   # 设置监控脚本
   pm2 monit
   ```

5. **限制 SSH 访问**
   - 使用密钥认证
   - 禁用密码登录
   - 修改默认 SSH 端口

## 目录结构

部署完成后的目录结构：

```
/var/www/chatroom/
├── public/              # 前端静态文件
│   ├── index.html
│   ├── style.css
│   └── client.js
├── data/                # 数据目录
│   └── chatroom.db      # SQLite 数据库
├── logs/                # 日志目录
├── backups/             # 数据库备份目录
├── server.js            # 服务器入口
├── database.js          # 数据库操作模块
├── package.json         # 项目配置
├── .env                 # 环境变量配置
├── deploy.log           # 部署日志
├── backup.log           # 备份日志
└── update.log           # 更新日志
```

## 环境变量配置

部署脚本会自动创建 `.env` 文件，包含以下配置：

```bash
PORT=3000
NODE_ENV=production
API_KEY=自动生成的随机密钥
DB_PATH=./data/chatroom.db
ALLOWED_ORIGINS=https://chatroom.kagerou.top
LOG_LEVEL=info
LOG_FILE_PATH=./logs
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX=100
SOCKET_MESSAGE_LIMIT=10
SOCKET_MESSAGE_WINDOW_MS=10000
```

## 访问地址

部署完成后，可以通过以下地址访问：

- **HTTP**: http://chatroom.kagerou.top（自动重定向到 HTTPS）
- **HTTPS**: https://chatroom.kagerou.top

## API 访问

所有 API 接口都需要在请求头中包含 API Key：

```bash
curl -H "X-API-Key: your-api-key" https://chatroom.kagerou.top/api/stats
```

## 技术支持

如遇到问题，请检查：

1. 部署日志: `/var/www/chatroom/deploy.log`
2. 应用日志: `pm2 logs chatroom`
3. Nginx 日志: `/var/log/nginx/chatroom.kagerou.top_*.log`
4. 系统日志: `journalctl -xe`

## 许可证

本项目采用 ISC 许可证
