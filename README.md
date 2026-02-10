# 聊天室 (Chatroom)

一个功能完整、安全可靠的实时聊天室应用，采用现代化的技术栈，提供企业级的安全特性和完整的数据持久化功能。

## 项目亮点

- 🔒 **企业级安全**：集成 Helmet、CORS、Rate Limiting 等安全中间件
- 🚀 **高性能**：使用 better-sqlite3 同步数据库操作，Socket.io 实时通信
- 🛡️ **API 认证**：所有 API 接口都需要 API Key 认证
- 📊 **完整监控**：提供统计信息、连接日志、性能分析
- 🔄 **自动清理**：智能的消息清理策略，永久房间和临时房间分别处理
- 🌙 **用户体验**：支持夜间模式、响应式设计、流畅动画

## 功能特性

### 核心功能
- 🔥 **实时聊天**：基于 WebSocket 的毫秒级消息传递
- 🏠 **多房间支持**：支持永久房间(1-10)和临时房间
- 👥 **用户列表**：实时显示房间内在线用户，自动更新
- 🎨 **夜间模式**：本地存储主题设置，自动恢复
- 💾 **数据持久化**：SQLite 数据库存储聊天消息和用户行为日志
- 📜 **历史消息**：新用户加入时自动加载最近20条历史消息
- 📊 **数据统计**：提供完整的统计数据和查询接口
- 🛡️ **安全防护**：输入验证、速率限制、CORS 配置

### 界面特性
- 🎯 现代化的 UI 设计，渐变色彩主题
- 📱 完全响应式布局，完美支持移动端
- ✨ 平滑的动画效果和过渡
- 🎭 用户头像（首字母显示）
- ⌨️ 快捷键支持（Enter 发送消息）

## 技术栈

### 后端技术
- **Node.js**：JavaScript 运行时环境
- **Express 5.x**：Web 应用框架
- **Socket.io 4.x**：WebSocket 实时通信
- **better-sqlite3**：高性能 SQLite 数据库驱动

### 安全中间件
- **Helmet**：安全 HTTP 头设置，CSP 策略，HSTS
- **CORS**：跨域资源共享控制
- **express-rate-limit**：API 速率限制
- **dotenv**：环境变量管理

### 前端技术
- **HTML5**：语义化标记
- **CSS3**：现代样式，Flexbox 布局，动画效果
- **JavaScript (Vanilla)**：原生 JavaScript，无框架依赖
- **Socket.io Client**：WebSocket 客户端

### 数据存储
- **SQLite**：轻量级关系型数据库
- **Winston**：日志记录系统

## 项目结构

```
chatroom/
├── public/                 # 前端静态文件
│   ├── index.html          # 主页面
│   ├── style.css           # 样式文件
│   └── client.js           # 客户端逻辑
├── data/                   # 数据目录（自动创建）
│   └── chatroom.db         # SQLite 数据库
├── logs/                   # 日志目录（自动创建）
├── server.js               # 服务器入口
├── database.js             # 数据库操作模块
├── package.json            # 项目配置和依赖
├── .env.example            # 环境变量模板
├── .env                    # 环境变量文件（需自行创建）
└── README.md               # 项目文档
```

## 快速开始

### 前置要求
- **Node.js**：v14.0.0 或更高版本
- **npm**：v6.0.0 或更高版本
- **操作系统**：Windows、macOS、Linux

### 安装步骤

```bash
# 1. 克隆项目
git clone <repository-url>
cd chatroom

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，修改配置参数

# 4. 启动服务器
npm run dev
```

服务器将在 `http://localhost:3000` 启动

### 环境变量配置

创建 `.env` 文件并配置以下参数：

```bash
# 服务器配置
PORT=3000                          # 服务器端口
NODE_ENV=development               # 运行环境

# API 认证密钥（生产环境务必修改）
API_KEY=your-secret-api-key-here   # API 访问密钥

# 数据库配置
DB_PATH=./data/chatroom.db         # 数据库文件路径

# CORS 配置
ALLOWED_ORIGINS=http://localhost:3000  # 允许的跨域来源

# 日志配置
LOG_LEVEL=info                     # 日志级别
LOG_FILE_PATH=./logs               # 日志文件路径

# 速率限制配置
API_RATE_LIMIT_WINDOW_MS=900000    # API 速率限制时间窗口（15分钟）
API_RATE_LIMIT_MAX=100             # 最大请求数

# Socket.io 消息速率限制
SOCKET_MESSAGE_LIMIT=10            # 消息数量限制
SOCKET_MESSAGE_WINDOW_MS=10000     # 时间窗口（10秒）
```

## 使用方法

### 启动服务器

```bash
# 开发模式
npm run dev

# 或直接运行
node server.js
```

服务器将在 `http://localhost:3000` 启动

### 访问聊天室

1. 打开浏览器访问 `http://localhost:3000`
2. 输入您的用户昵称（1-20个字符，支持字母、数字、中文和下划线）
3. 输入房间号（1-20个字符）
4. 点击"进入聊天室"或按 Enter 键开始聊天

### 房间类型

- **永久房间**：房间号 1-10，消息保留30天，每天凌晨3点自动清理旧消息
- **临时房间**：其他房间号，无用户在线时自动清理所有消息

### 多用户测试

- 在多个浏览器标签页或不同浏览器中打开 `http://localhost:3000`
- 使用相同的房间号即可在同一个房间内聊天
- 使用不同的房间号则进入不同的房间

### 快捷键

- **登录界面**：Enter 键在用户名输入框跳转到房间号输入框，在房间号输入框进入聊天室
- **聊天界面**：Enter 键发送消息

## API 接口

> **注意**：所有 API 接口都需要在请求头中包含有效的 API Key：
> ```
> X-API-Key: your-secret-api-key-here
> ```

### 健康检查
```http
GET /health
```

**响应示例：**
```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": 1234567890000,
  "environment": "development"
}
```

### 获取统计信息
```http
GET /api/stats
```

**响应示例：**
```json
{
  "totalMessages": 1000,
  "totalConnections": 500,
  "activeRooms": 10,
  "totalUsers": 200
}
```

### 获取房间消息历史
```http
GET /api/messages/:room?limit=50
```

**参数：**
- `room`：房间号（必填）
- `limit`：返回消息数量（可选，默认50，范围1-500）

**响应示例：**
```json
[
  {
    "socket_id": "abc123",
    "username": "张三",
    "message": "大家好!",
    "timestamp": 1234567890000
  }
]
```

### 获取房间连接日志
```http
GET /api/logs/:room?limit=50
```

**参数：**
- `room`：房间号（必填）
- `limit`：返回日志数量（可选，默认50，范围1-500）

**响应示例：**
```json
[
  {
    "username": "张三",
    "action": "join",
    "timestamp": 1234567890000
  }
]
```

### 获取用户消息
```http
GET /api/messages/:room/:username?limit=50
```

**参数：**
- `room`：房间号（必填）
- `username`：用户名（必填）
- `limit`：返回消息数量（可选，默认50，范围1-500）

### 获取所有房间列表
```http
GET /api/rooms
```

**响应示例：**
```json
[
  {
    "room": "1",
    "message_count": 100,
    "first_message": 1234567890000,
    "last_message": 1234567899000
  }
]
```

### 手动触发永久房间清理（测试用）
```http
POST /api/cleanup/permanent
Content-Type: application/json

{
  "days": 30
}
```

**参数：**
- `days`：清理多少天前的消息（可选，默认30，范围1-365）

**响应示例：**
```json
{
  "success": true,
  "deletedMessages": 50,
  "message": "已清理永久房间(1-10) 30 天前的旧消息"
}
```

### 手动触发临时房间清理（测试用）
```http
POST /api/cleanup/temporary
```

**响应示例：**
```json
{
  "success": true,
  "deletedMessages": 100,
  "activeRooms": ["1", "2", "test"],
  "message": "已清理临时房间且无用户在线的所有消息"
}
```

### 错误响应

所有 API 接口在出错时返回统一格式：

```json
{
  "error": "错误描述信息"
}
```

**常见错误码：**
- `401`：未授权访问（缺少 API Key）
- `403`：API Key 无效
- `429`：请求过于频繁（超过速率限制）
- `500`：服务器内部错误

## 消息清除策略

系统采用两种不同的消息清除策略:

### 永久房间(房间号 1-10)
- **清除条件**: 消息时间超过 30 天
- **清除时间**: 每天凌晨 3:00
- **清除内容**: 仅删除 30 天前的旧消息,保留近期消息
- **适用场景**: 常用公共聊天室,需要保留一定历史记录

### 临时房间(房间号非 1-10)
- **清除条件**: 房间中无用户在线
- **清除时间**: 每小时整点
- **清除内容**: 删除该房间的所有消息
- **适用场景**: 临时讨论组、私人聊天等,不需要长期保存

### 清理策略对比

| 房间类型 | 房间号 | 清除条件 | 清除时间 | 清除范围 |
|---------|--------|---------|---------|---------|
| 永久房间 | 1-10 | 超过30天 | 每天3:00 | 仅旧消息 |
| 临时房间 | 其他 | 无用户在线 | 每小时整点 | 所有消息 |

## 消息清除策略

系统采用智能的双层消息清除策略：

### 永久房间（房间号 1-10）
- **清除条件**：消息时间超过 30 天
- **清除时间**：每天凌晨 3:00
- **清除内容**：仅删除 30 天前的旧消息，保留近期消息
- **适用场景**：常用公共聊天室，需要保留一定历史记录

### 临时房间（房间号非 1-10）
- **清除条件**：房间中无用户在线
- **清除时间**：每小时整点
- **清除内容**：删除该房间的所有消息
- **适用场景**：临时讨论组、私人聊天等，不需要长期保存

### 清理策略对比

| 房间类型 | 房间号 | 清除条件 | 清除时间 | 清除范围 |
|---------|--------|---------|---------|---------|
| 永久房间 | 1-10 | 超过30天 | 每天3:00 | 仅旧消息 |
| 临时房间 | 其他 | 无用户在线 | 每小时整点 | 所有消息 |

## 数据库结构

### connection_logs 表
记录用户连接行为日志

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| socket_id | TEXT | Socket 连接 ID |
| username | TEXT | 用户名 |
| room | TEXT | 房间号 |
| action | TEXT | 操作类型（join/leave/disconnect） |
| timestamp | INTEGER | 时间戳 |
| ip_address | TEXT | IP 地址 |

### chat_messages 表
记录聊天消息内容

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| socket_id | TEXT | Socket 连接 ID |
| username | TEXT | 用户名 |
| room | TEXT | 房间号 |
| message | TEXT | 消息内容 |
| timestamp | INTEGER | 时间戳 |

## 功能说明

### 用户列表
- 显示当前房间内所有在线用户
- 实时更新用户状态
- 当前用户会有特殊标识
- 显示用户在线状态和数量

### 夜间模式
- 点击右上角的 🌙/☀️ 按钮切换主题
- 主题设置会自动保存到本地存储
- 下次访问时自动恢复上次的主题设置

### 历史消息
- 新用户加入房间时自动加载最近 20 条历史消息
- 历史消息会用系统消息标记
- 支持通过 API 查询任意时间段的消息

### 数据清理
- 永久房间：每天凌晨 3 点自动清理 30 天前的旧数据
- 临时房间：每小时自动清理无用户在线房间的所有消息
- 可通过 API 手动触发清理操作

## 安全特性

### 输入验证
- 用户名：1-20个字符，仅支持字母、数字、中文和下划线
- 房间号：1-20个字符
- 消息内容：最多500个字符

### 安全中间件
- **Helmet**：设置安全 HTTP 头，包括 CSP、HSTS 等
- **CORS**：严格控制跨域访问
- **Rate Limiting**：API 速率限制（15分钟100次请求）

### API 认证
- 所有 API 接口都需要有效的 API Key
- API Key 通过环境变量配置
- 支持自定义认证逻辑

### 数据安全
- SQLite 外键约束
- 数据库输入验证和清理
- 定期清理旧数据

## 开发说明

### 数据库操作

```javascript
const db = require('./database');

// 初始化数据库
db.initializeDatabase();

// 插入连接日志
db.insertConnectionLog(socketId, username, room, 'join', ipAddress);

// 插入聊天消息
db.insertChatMessage(socketId, username, room, message);

// 获取房间消息
const messages = db.getRoomMessages(room, 50);

// 获取统计信息
const stats = db.getStatistics();

// 清理永久房间旧消息
db.cleanPermanentRoomsOldMessages(30);

// 清理临时房间消息
db.cleanTemporaryRoomsAllMessages(activeRooms);
```

### 自定义配置

#### 服务器配置

在 `.env` 文件中配置：

```bash
PORT=3000
NODE_ENV=development
API_KEY=your-secret-api-key-here
ALLOWED_ORIGINS=http://localhost:3000
```

#### 数据库配置

在 `.env` 文件中配置数据库路径：

```bash
DB_PATH=./data/chatroom.db
```

#### 安全配置

在 `.env` 文件中配置速率限制：

```bash
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX=100
SOCKET_MESSAGE_LIMIT=10
SOCKET_MESSAGE_WINDOW_MS=10000
```

## 生产环境部署

### 推荐配置

1. **使用 PM2 进行进程管理**

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name chatroom

# 设置开机自启
pm2 startup
pm2 save
```

2. **使用 Nginx 作为反向代理**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

3. **配置 HTTPS（使用 Let's Encrypt）**

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d yourdomain.com
```

4. **设置数据库备份**

```bash
# 创建备份脚本
#!/bin/bash
BACKUP_DIR="/var/www/chatroom/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /var/www/chatroom/data/chatroom.db $BACKUP_DIR/chatroom_$DATE.db
find $BACKUP_DIR -name "chatroom_*.db" -mtime +7 -delete
```

### 生产环境检查清单

- [ ] 修改默认 API_KEY
- [ ] 配置正确的 ALLOWED_ORIGINS
- [ ] 设置 NODE_ENV=production
- [ ] 配置 HTTPS
- [ ] 设置防火墙规则
- [ ] 配置数据库备份
- [ ] 设置日志轮转
- [ ] 配置监控告警
- [ ] 定期更新依赖包

## 注意事项

1. **数据安全**：生产环境务必修改默认 API_KEY
2. **并发限制**：SQLite 在高并发场景下可能需要考虑使用其他数据库（如 PostgreSQL、MySQL）
3. **数据备份**：建议定期备份数据库文件，避免数据丢失
4. **端口占用**：默认使用 3000 端口，如被占用请修改配置
5. **日志管理**：定期清理日志文件，避免磁盘占满
6. **依赖更新**：定期更新依赖包，修复安全漏洞

## 故障排除

### 问题：无法连接到服务器

**可能原因：**
- Node.js 未正确安装
- 依赖未完整安装
- 端口被占用

**解决方案：**
```bash
# 检查 Node.js 版本
node --version

# 重新安装依赖
npm install

# 检查端口占用
# Linux/macOS
lsof -i :3000
# Windows
netstat -ano | findstr :3000
```

### 问题：消息无法发送

**可能原因：**
- 未正确加入房间
- 浏览器控制台有错误
- 服务器未运行

**解决方案：**
1. 确认已成功加入房间
2. 打开浏览器开发者工具（F12）查看 Console 错误
3. 检查服务器日志：`pm2 logs chatroom`

### 问题：数据库错误

**可能原因：**
- 无写入权限
- `better-sqlite3` 安装失败
- 数据库文件损坏

**解决方案：**
```bash
# 检查数据目录权限
ls -la data/

# 重新安装 better-sqlite3
npm rebuild better-sqlite3

# 删除数据库文件重新初始化
rm data/chatroom.db
npm run dev
```

### 问题：API 认证失败

**可能原因：**
- API Key 未配置或错误
- 请求头格式错误

**解决方案：**
```bash
# 检查 .env 文件中的 API_KEY 配置
# 确保请求头包含正确的 API Key
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/stats
```

### 问题：WebSocket 连接失败

**可能原因：**
- 反向代理配置错误
- 防火墙阻止 WebSocket 连接

**解决方案：**
1. 检查 Nginx 配置中的 WebSocket 升级头
2. 确认防火墙允许 WebSocket 连接
3. 检查 Socket.io 版本兼容性

## 性能优化

### 已实现的优化

- ✅ 使用 better-sqlite3 同步数据库操作，提高性能
- ✅ 数据库索引优化，提升查询速度
- ✅ 定期清理旧数据，减少数据库大小
- ✅ 限制历史消息加载数量（默认20条）
- ✅ 速率限制，防止恶意请求
- ✅ 定期数据库性能分析（每周执行一次）

### 可选优化建议

1. **使用连接池**
   - 对于高并发场景，考虑使用数据库连接池

2. **缓存策略**
   - 使用 Redis 缓存频繁访问的数据
   - 缓存房间列表、用户统计等信息

3. **负载均衡**
   - 使用 Nginx 进行负载均衡
   - 部署多个应用实例

4. **数据库优化**
   - 考虑使用 PostgreSQL 或 MySQL 替代 SQLite
   - 配置数据库主从复制

5. **CDN 加速**
   - 使用 CDN 加速静态资源加载
   - 压缩 JavaScript 和 CSS 文件

## 未来计划

- [ ] 支持图片和文件上传
- [ ] 添加消息表情支持
- [ ] 实现用户注册和登录系统
- [ ] 添加房间创建和管理功能
- [ ] 支持私聊功能
- [ ] 添加消息搜索功能
- [ ] 支持消息撤回和编辑
- [ ] 添加管理员权限管理
- [ ] 支持消息已读状态
- [ ] 添加用户在线时长统计
- [ ] 支持房间密码保护
- [ ] 添加敏感词过滤
- [ ] 支持消息举报功能
- [ ] 添加语音消息支持
- [ ] 支持多语言国际化

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用一致的代码风格
- 添加必要的注释
- 确保代码通过测试
- 更新相关文档

### 提交规范

提交信息格式：
```
<type>(<scope>): <subject>

<body>

<footer>
```

类型：
- `feat`：新功能
- `fix`：修复 bug
- `docs`：文档更新
- `style`：代码格式调整
- `refactor`：重构
- `test`：测试相关
- `chore`：构建/工具相关

## 许可证

本项目采用 ISC 许可证

## 作者

Chatroom Development Team

## 致谢

感谢以下开源项目：

- [Express](https://expressjs.com/) - Web 应用框架
- [Socket.io](https://socket.io/) - 实时通信库
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite 数据库驱动
- [Helmet](https://helmetjs.github.io/) - 安全中间件
- [Winston](https://github.com/winstonjs/winston) - 日志库

## 常用命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 查看依赖更新
npm outdated

# 更新依赖
npm update

# 审计安全漏洞
npm audit

# 修复安全漏洞
npm audit fix

# 重新构建 native 模块
npm rebuild
```

## 联系方式

- 提交 Issue：[GitHub Issues](https://github.com/your-repo/chatroom/issues)
- 发送邮件：your-email@example.com

---

**如有问题或建议，欢迎提交 Issue！**
