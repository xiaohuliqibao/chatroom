#!/bin/bash

################################################################################
# Chatroom 数据库备份脚本
# 用于定期备份数据库文件
################################################################################

set -e

# 配置变量
DEPLOY_DIR="/var/www/chatroom"
BACKUP_DIR="/var/www/chatroom/backups"
DB_FILE="$DEPLOY_DIR/data/chatroom.db"
LOG_FILE="/var/www/chatroom/backup.log"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# 日志函数
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 备份数据库
if [ -f "$DB_FILE" ]; then
    BACKUP_FILE="$BACKUP_DIR/chatroom_$(date +%Y%m%d_%H%M%S).db"
    cp "$DB_FILE" "$BACKUP_FILE"
    log "数据库备份完成: $BACKUP_FILE"

    # 压缩备份文件
    gzip "$BACKUP_FILE"
    log "备份文件已压缩: ${BACKUP_FILE}.gz"

    # 清理7天前的备份
    find "$BACKUP_DIR" -name "chatroom_*.db.gz" -mtime +7 -delete
    log "已清理7天前的旧备份"
else
    log_error "数据库文件不存在: $DB_FILE"
    exit 1
fi
