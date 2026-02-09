# 聊天室 (Chatroom)

一个基于 Node.js、Express、Socket.io 和 SQLite 的实时聊天室应用,支持多房间、用户列表、夜间模式以及完整的数据持久化功能。

## 功能特性

### 核心功能
- 🔥 **实时聊天**: 基于 WebSocket 的实时消息传递
- 🏠 **多房间支持**: 创建和加入不同的聊天房间
- 👥 **用户列表**: 实时显示房间内在线用户
- 🎨 **夜间模式**: 支持日间/夜间主题切换
- 💾 **数据持久化**: 使用 SQLite 存储聊天消息和用户行为日志
- 📜 **历史消息**: 新用户加入时自动加载历史消息
- 📊 **数据统计**: 提供完整的统计数据和查询接口

### 界面特性
- 🎯 现代化的 UI 设计
- 📱 响应式布局,支持移动端
- ✨ 平滑的动画效果
- 🌈 渐变色彩主题
- 🎭 用户头像(首字母显示)

## 技术栈

- **后端**: Node.js, Express
- **实时通信**: Socket.io
- **数据库**: SQLite (better-sqlite3)
- **前端**: HTML5, CSS3, JavaScript
- **样式**: 自定义 CSS3 (无框架)

## 项目结构

```
chatroom/
├── public/
│   ├── index.html          # 前端页面
│   ├── style.css           # 样式文件
│   └── client.js           # 客户端逻辑
├── server.js               # 服务器入口
├── database.js             # 数据库操作模块
├── package.json            # 项目配置
└── README.md               # 项目文档
```

## 安装步骤

### 前置要求
- Node.js (v14.0.0 或更高版本)
- npm 或 yarn

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd chatroom

# 安装依赖
npm install
```

## 使用方法

### 启动服务器

```bash
npm run dev
# 或
node server.js
```

服务器将在 `http://localhost:3000` 启动

### 访问聊天室

1. 打开浏览器访问 `http://localhost:3000`
2. 输入您的用户昵称
3. 输入房间号(可以是任意名称)
4. 点击"进入聊天室"开始聊天

### 多用户测试

- 在多个浏览器标签页或不同浏览器中打开 `http://localhost:3000`
- 使用相同的房间号即可在同一个房间内聊天
- 使用不同的房间号则进入不同的房间

## API 接口

### 获取统计信息
```http
GET /api/stats
```

**响应示例:**
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

**参数:**
- `room`: 房间号
- `limit`: 返回消息数量(可选,默认50)

**响应示例:**
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

**参数:**
- `room`: 房间号
- `limit`: 返回日志数量(可选,默认50)

**响应示例:**
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

**参数:**
- `room`: 房间号
- `username`: 用户名
- `limit`: 返回消息数量(可选,默认50)

## 数据库结构

### connection_logs 表
记录用户连接行为日志

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键,自增 |
| socket_id | TEXT | Socket 连接 ID |
| username | TEXT | 用户名 |
| room | TEXT | 房间号 |
| action | TEXT | 操作类型(join/leave/disconnect) |
| timestamp | INTEGER | 时间戳 |
| ip_address | TEXT | IP 地址 |

### chat_messages 表
记录聊天消息内容

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键,自增 |
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
- 系统每天凌晨 3 点自动清理 30 天前的旧数据
- 可手动调用数据库模块的 `cleanOldData()` 方法

## 快捷键

### 登录界面
- `Enter`: 在用户名输入框按回车跳转到房间号输入框
- `Enter`: 在房间号输入框按回车进入聊天室

### 聊天界面
- `Enter`: 发送消息

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

// 清理旧数据
db.cleanOldData();
```

### 自定义配置

可以在 `server.js` 中修改以下配置:

```javascript
const PORT = 3000;  // 修改端口号
```

在 `database.js` 中可以修改数据库配置:

```javascript
const db = new Database(path.join(__dirname, 'chatroom.db'));  // 修改数据库文件路径
```

## 注意事项

1. **数据安全**: 数据库文件 `chatroom.db` 会自动创建在项目根目录,请妥善保管
2. **并发限制**: SQLite 在高并发场景下可能需要考虑使用其他数据库
3. **数据清理**: 建议定期备份数据库文件,避免数据丢失
4. **端口占用**: 默认使用 3000 端口,如被占用请修改配置

## 故障排除

### 问题: 无法连接到服务器
- 检查 Node.js 是否正确安装
- 确认依赖是否完整安装: `npm install`
- 检查端口 3000 是否被占用

### 问题: 消息无法发送
- 确认已正确加入房间
- 检查浏览器控制台是否有错误信息
- 确认服务器正在运行

### 问题: 数据库错误
- 检查是否有写入权限
- 确认 `better-sqlite3` 正确安装
- 删除 `chatroom.db` 文件重新初始化

## 性能优化

- 使用数据库索引提高查询性能
- 定期清理旧数据减少数据库大小
- 限制历史消息加载数量(默认20条)
- 使用连接池管理数据库连接

## 未来计划

- [ ] 支持图片和文件上传
- [ ] 添加消息表情支持
- [ ] 实现用户注册和登录系统
- [ ] 添加房间创建和管理功能
- [ ] 支持私聊功能
- [ ] 添加消息搜索功能
- [ ] 支持消息撤回和编辑
- [ ] 添加管理员权限管理

## 贡献指南

欢迎提交 Issue 和 Pull Request!

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 ISC 许可证

## 作者

Chatroom Development Team

## 致谢

- Express 社区
- Socket.io 社区
- better-sqlite3 社区

---

**如有问题或建议,欢迎提交 Issue!**
