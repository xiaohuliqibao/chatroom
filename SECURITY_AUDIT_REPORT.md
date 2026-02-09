# 聊天室项目 - 安全与性能审计报告

## 审计日期
2026-02-09

## 审计范围
- 服务器端代码 (server.js)
- 数据库模块 (database.js)
- 客户端代码 (client.js)
- HTML 页面 (index.html)
- API 接口安全性

---

## 🔴 严重安全问题

### 1. API 接口无认证机制
**严重程度**: 🔴 严重

**问题描述**:
所有 API 接口都没有任何认证机制,任何人都可以访问:
- `GET /api/stats` - 获取统计信息
- `GET /api/messages/:room` - 获取房间消息
- `GET /api/logs/:room` - 获取连接日志
- `GET /api/messages/:room/:username` - 获取用户消息
- `POST /api/cleanup/permanent` - 手动触发清理
- `POST /api/cleanup/temporary` - 手动触发清理
- `GET /api/rooms` - 获取房间列表

**风险**:
- 外部攻击者可以获取所有聊天记录
- 可以查看用户的连接日志和IP地址
- 可以手动触发数据清理操作
- 敏感信息泄露

**修复建议**:
```javascript
// 添加 API 密钥认证中间件
const API_KEY = process.env.API_KEY || 'your-secret-key';

function authenticateAPI(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey === API_KEY) {
        next();
    } else {
        res.status(401).json({ error: '未授权访问' });
    }
}

// 应用到所有 API 路由
app.use('/api', authenticateAPI);
```

---

### 2. 数据库文件可被直接访问
**严重程度**: 🔴 严重

**问题描述**:
数据库文件 `chatroom.db` 位于项目根目录,可能被直接访问或下载。

**风险**:
- 数据库文件可能被直接下载
- 敏感数据泄露
- 数据库可能被恶意篡改

**修复建议**:
```javascript
// 1. 将数据库文件移到项目根目录之外
const db = new Database(path.join(__dirname, '../data/chatroom.db'));

// 2. 添加 .gitignore 防止数据库文件被提交
// 在 .gitignore 中添加:
// *.db
// data/
```

---

### 3. 缺少输入验证和SQL注入防护
**严重程度**: 🔴 严重

**问题描述**:
数据库操作直接使用用户输入,缺少充分的验证:
```javascript
// database.js - cleanTemporaryRoomsAllMessages
const placeholders = activeRooms.map(() => '?').join(',');
let query = `DELETE FROM chat_messages WHERE CAST(room AS INTEGER) NOT BETWEEN 1 AND 10`;
if (activeRooms.length > 0) {
    query += ` AND room NOT IN (${placeholders})`;
}
```

**风险**:
- 潜在的SQL注入风险
- 恶意用户可能构造特殊房间号绕过清理逻辑
- 数据库操作可能失败

**修复建议**:
```javascript
// 1. 添加输入验证函数
function validateRoomName(room) {
    if (!room || typeof room !== 'string') {
        return false;
    }
    // 只允许字母、数字、下划线和短横线
    return /^[a-zA-Z0-9_-]+$/.test(room);
}

function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        return false;
    }
    // 只允许字母、数字、中文和下划线
    return /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username);
}

// 2. 在所有数据库操作前验证输入
function insertChatMessage(socketId, username, room, message) {
    if (!validateUsername(username) || !validateRoomName(room)) {
        throw new Error('无效的用户名或房间号');
    }
    // ... 其余代码
}
```

---

### 4. 缺少速率限制
**严重程度**: 🟡 中等

**问题描述**:
没有对 API 接口和 Socket 连接实施速率限制。

**风险**:
- 可能遭受 DDoS 攻击
- 恶意用户可以大量发送消息
- 可能导致服务器资源耗尽
- 数据库可能被大量写入操作压垮

**修复建议**:
```javascript
const rateLimit = require('express-rate-limit');

// API 速率限制
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 最多100个请求
    message: '请求过于频繁,请稍后再试'
});

app.use('/api', apiLimiter);

// Socket.io 速率限制
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

// 或者使用内存速率限制
const ioRateLimit = require('socket.io-rate-limit');

const limitMessages = ioRateLimit(
    10, // 每个 socket 每 10 秒最多 10 条消息
    10000
);

io.on('connection', (socket) => {
    const limit = limitMessages(socket);
    socket.use((event, next) => {
        if (event[0] === 'chat message') {
            limit(() => {
                next();
            });
        } else {
            next();
        }
    });
});
```

---

### 5. 消息内容未进行XSS防护
**严重程度**: 🟡 中等

**问题描述**:
客户端直接显示消息内容,没有进行XSS过滤:
```javascript
// client.js
const contentSpan = document.createElement('div');
contentSpan.className = 'content';
contentSpan.textContent = data.text; // 使用 textContent 相对安全
```

**风险**:
- 虽然使用了 `textContent`,但如果未来改为 `innerHTML` 会有风险
- 用户名也没有进行转义
- 可能存在其他XSS攻击向量

**修复建议**:
```javascript
// 添加 HTML 转义函数
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// 在显示用户名时使用
usernameSpan.textContent = escapeHtml(data.username);
```

---

## 🟡 性能问题

### 1. 消息历史加载可能导致性能问题
**严重程度**: 🟡 中等

**问题描述**:
用户加入房间时加载最近20条历史消息,如果消息很多可能影响性能:
```javascript
// server.js
const historyMessages = db.getRoomMessages(room, 20);
```

**风险**:
- 如果数据库中有大量消息,查询可能较慢
- 同时有大量用户加入房间时可能造成数据库压力
- 历史消息传输可能占用大量带宽

**修复建议**:
```javascript
// 1. 添加数据库查询缓存
const NodeCache = require('node-cache');
const messageCache = new NodeCache({ stdTTL: 300 }); // 5分钟缓存

function getRoomMessages(room, limit = 100) {
    const cacheKey = `messages:${room}:${limit}`;
    const cached = messageCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // 查询数据库
    const stmt = db.prepare(`
        SELECT socket_id, username, message, timestamp
        FROM chat_messages
        WHERE room = ?
        ORDER BY timestamp DESC
        LIMIT ?
    `);

    const messages = stmt.all(room, limit).reverse();
    messageCache.set(cacheKey, messages);
    return messages;
}

// 2. 添加分页支持
function getRoomMessages(room, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const stmt = db.prepare(`
        SELECT socket_id, username, message, timestamp
        FROM chat_messages
        WHERE room = ?
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
    `);

    return stmt.all(room, pageSize, offset).reverse();
}
```

---

### 2. 数据库索引可能不够优化
**严重程度**: 🟡 中等

**问题描述**:
虽然创建了基本索引,但某些查询可能仍然不够高效。

**风险**:
- 复杂查询可能较慢
- 大数据量时性能下降

**修复建议**:
```javascript
// 添加复合索引
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_room_timestamp 
    ON chat_messages(room, timestamp DESC);
    
    CREATE INDEX IF NOT EXISTS idx_chat_messages_username_room 
    ON chat_messages(username, room);
`);

// 定期分析数据库性能
function analyzeDatabase() {
    db.pragma('optimize');
    db.pragma('analyze');
}

// 每周执行一次
setInterval(analyzeDatabase, 7 * 24 * 60 * 60 * 1000);
```

---

### 3. 内存泄漏风险
**严重程度**: 🟡 中等

**问题描述**:
`users` 和 `rooms` 对象可能不会正确清理:
```javascript
const users = {}; // { socketId: { username, room } }
const rooms = {}; // { roomName: [socketId1, socketId2, ...] }
```

**风险**:
- 长时间运行后可能占用大量内存
- 断开连接的用户可能没有被正确清理

**修复建议**:
```javascript
// 1. 定期清理断开连接的用户
setInterval(() => {
    const now = Date.now();
    Object.keys(users).forEach(socketId => {
        const socket = io.sockets.sockets.get(socketId);
        if (!socket) {
            // Socket 已断开,清理用户数据
            const user = users[socketId];
            if (user) {
                rooms[user.room] = rooms[user.room]?.filter(id => id !== socketId);
                if (rooms[user.room]?.length === 0) {
                    delete rooms[user.room];
                }
                delete users[socketId];
            }
        }
    });
}, 60000); // 每分钟检查一次

// 2. 使用 WeakMap 替代普通对象
const users = new WeakMap();
const rooms = new Map();
```

---

## 🔵 Bug 和逻辑问题

### 1. 客户端可能重复连接
**严重程度**: 🔵 低

**问题描述**:
客户端没有防止重复连接的机制:
```javascript
// client.js
function joinRoom() {
    // ...
    socket = io(); // 每次调用都会创建新连接
}
```

**风险**:
- 用户可能多次点击"进入聊天室"
- 创建多个 Socket 连接
- 资源浪费

**修复建议**:
```javascript
// 添加连接状态检查
let isConnected = false;

function joinRoom() {
    if (isConnected && socket) {
        alert('您已经在聊天室中');
        return;
    }

    const username = usernameInput.value.trim();
    const room = roomInput.value.trim();

    if (!username || !room) {
        alert('请输入用户名和房间号');
        return;
    }

    currentUsername = username;
    currentRoom = room;

    socket = io();
    isConnected = true;

    // ... 其余代码
}

function leaveRoom() {
    if (socket) {
        socket.emit('leave room', { username: currentUsername, room: currentRoom });
        socket.disconnect();
        socket = null;
        isConnected = false;
    }
    // ... 其余代码
}
```

---

### 2. 服务器端缺少用户名重复检查
**严重程度**: 🔵 低

**问题描述**:
允许多个用户使用相同的用户名加入房间:
```javascript
// server.js
socket.on('join room', ({ username, room }) => {
    users[socket.id] = { username, room };
    // 没有检查用户名是否已存在
});
```

**风险**:
- 可能造成混淆
- 用户身份识别困难
- 可能被用于恶意冒充

**修复建议**:
```javascript
socket.on('join room', ({ username, room }) => {
    // 检查用户名是否已存在
    const existingUser = Object.values(users).find(
        u => u.username === username && u.room === room
    );

    if (existingUser) {
        socket.emit('error', { 
            message: '该用户名已在房间中使用,请选择其他用户名' 
        });
        return;
    }

    // ... 其余代码
});
```

---

### 3. 房间号判断逻辑可能不准确
**严重程度**: 🔵 低

**问题描述**:
使用 `CAST(room AS INTEGER)` 判断房间号可能不准确:
```javascript
// database.js
WHERE CAST(room AS INTEGER) NOT BETWEEN 1 AND 10
```

**风险**:
- 非数字房间号会被转换为0,可能被错误分类
- 清理逻辑可能不正确

**修复建议**:
```javascript
// 使用更准确的判断
function isPermanentRoom(room) {
    const roomNum = parseInt(room);
    return !isNaN(roomNum) && roomNum >= 1 && roomNum <= 10 && roomNum.toString() === room;
}

// 在 SQL 中使用更精确的判断
DELETE FROM chat_messages 
WHERE room NOT IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10')
  AND room NOT GLOB '[0-9]*'
```

---

### 4. 错误处理不够完善
**严重程度**: 🔵 低

**问题描述**:
很多数据库操作缺少完善的错误处理:
```javascript
// database.js
try {
    const result = stmt.run(...);
    console.log(`聊天消息已保存: ${username} 在房间 ${room}`);
    return result.lastInsertRowid;
} catch (error) {
    console.error('插入聊天消息失败:', error);
    return null; // 只返回 null,调用者不知道具体错误
}
```

**风险**:
- 错误信息不够详细
- 难以调试问题
- 可能导致静默失败

**修复建议**:
```javascript
// 使用自定义错误类
class DatabaseError extends Error {
    constructor(message, code, details) {
        super(message);
        this.name = 'DatabaseError';
        this.code = code;
        this.details = details;
    }
}

function insertChatMessage(socketId, username, room, message) {
    // ... 验证代码
    
    try {
        const result = stmt.run(socketId, username, room, message, Date.now());
        console.log(`聊天消息已保存: ${username} 在房间 ${room}`);
        return result.lastInsertRowid;
    } catch (error) {
        console.error('插入聊天消息失败:', error);
        throw new DatabaseError(
            'Failed to insert chat message',
            'INSERT_FAILED',
            { socketId, username, room, error: error.message }
        );
    }
}
```

---

## 📊 其他建议

### 1. 添加日志系统
建议使用专业的日志库如 `winston` 或 `pino`:
```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}
```

### 2. 添加环境变量配置
使用 `dotenv` 管理配置:
```javascript
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;
const DB_PATH = process.env.DB_PATH || './chatroom.db';
```

### 3. 添加健康检查端点
```javascript
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now()
    });
});
```

### 4. 添加 CORS 支持
如果需要跨域访问:
```javascript
const cors = require('cors');
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
}));
```

---

## 📋 优先修复建议

### 立即修复 (P0)
1. ✅ 添加 API 认证机制
2. ✅ 保护数据库文件不被直接访问
3. ✅ 添加输入验证防止 SQL 注入

### 高优先级 (P1)
4. ✅ 添加速率限制防止 DDoS
5. ✅ 改进错误处理机制
6. ✅ 添加消息内容 XSS 防护

### 中优先级 (P2)
7. ✅ 优化数据库查询性能
8. ✅ 防止内存泄漏
9. ✅ 修复客户端重复连接 bug

### 低优先级 (P3)
10. ✅ 添加用户名重复检查
11. ✅ 改进房间号判断逻辑
12. ✅ 添加日志系统

---

## 总结

本次审计发现了 **5 个严重安全问题**、**3 个性能问题** 和 **4 个逻辑缺陷**。建议按照优先级依次修复,特别是 API 认证、数据库保护和输入验证等严重安全问题应立即处理。

总体而言,项目的基础架构良好,但在安全性、性能和错误处理方面还有改进空间。通过实施上述修复建议,可以显著提升项目的安全性和稳定性。

---

**审计人员**: CodeArts代码智能体
**审计日期**: 2026-02-09
