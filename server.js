// server.js - 服务器端(安全增强版)

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const db = require('./database');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// 加载环境变量
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'default-api-key-change-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

// 初始化数据库
db.initializeDatabase();

// 存储用户信息和房间信息
const users = {}; // { socketId: { username, room } }
const rooms = {}; // { roomName: [socketId1, socketId2, ...] }

// 安全中间件
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS配置
app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: true
}));

// 速率限制
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 最多100个请求
    message: { error: '请求过于频繁,请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // 跳过健康检查端点的速率限制
        return req.path === '/health';
    }
});

// API认证中间件
function authenticateAPI(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({ error: '未授权访问' });
    }
    
    if (apiKey !== API_KEY) {
        return res.status(403).json({ error: 'API密钥无效' });
    }
    
    next();
}

// 应用速率限制到所有API路由
app.use('/api', apiLimiter);

// 应用认证到所有API路由
app.use('/api', authenticateAPI);

// 1. 设置静态文件目录，用于访问 index.html 和 css
app.use(express.static(path.join(__dirname, 'public')));

// 2. 处理根路径请求，返回 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now(),
        environment: NODE_ENV
    });
});

// API: 获取统计信息
app.get('/api/stats', (req, res) => {
    try {
        const stats = db.getStatistics();
        if (stats) {
            res.json(stats);
        } else {
            res.status(500).json({ error: '获取统计信息失败' });
        }
    } catch (error) {
        console.error('获取统计信息失败:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// API: 获取房间消息历史
app.get('/api/messages/:room', (req, res) => {
    try {
        const room = req.params.room;
        const limit = parseInt(req.query.limit) || 50;
        
        if (limit < 1 || limit > 500) {
            return res.status(400).json({ error: 'limit参数必须在1-500之间' });
        }
        
        const messages = db.getRoomMessages(room, limit);
        res.json(messages);
    } catch (error) {
        console.error('获取房间消息失败:', error);
        if (error instanceof db.ValidationError) {
            res.status(400).json({ error: error.message, field: error.field });
        } else {
            res.status(500).json({ error: '服务器内部错误' });
        }
    }
});

// API: 获取房间连接日志
app.get('/api/logs/:room', (req, res) => {
    try {
        const room = req.params.room;
        const limit = parseInt(req.query.limit) || 50;
        
        if (limit < 1 || limit > 500) {
            return res.status(400).json({ error: 'limit参数必须在1-500之间' });
        }
        
        const logs = db.getConnectionLogs(room, limit);
        res.json(logs);
    } catch (error) {
        console.error('获取连接日志失败:', error);
        if (error instanceof db.ValidationError) {
            res.status(400).json({ error: error.message, field: error.field });
        } else {
            res.status(500).json({ error: '服务器内部错误' });
        }
    }
});

// API: 获取用户消息
app.get('/api/messages/:room/:username', (req, res) => {
    try {
        const room = req.params.room;
        const username = req.params.username;
        const limit = parseInt(req.query.limit) || 50;
        
        if (limit < 1 || limit > 500) {
            return res.status(400).json({ error: 'limit参数必须在1-500之间' });
        }
        
        const messages = db.getUserMessages(username, room, limit);
        res.json(messages);
    } catch (error) {
        console.error('获取用户消息失败:', error);
        if (error instanceof db.ValidationError) {
            res.status(400).json({ error: error.message, field: error.field });
        } else {
            res.status(500).json({ error: '服务器内部错误' });
        }
    }
});

// API: 手动触发永久房间清理(仅用于测试)
app.post('/api/cleanup/permanent', (req, res) => {
    try {
        const days = parseInt(req.body.days) || 30;
        
        if (days < 1 || days > 365) {
            return res.status(400).json({ error: 'days参数必须在1-365之间' });
        }
        
        const deletedCount = db.cleanPermanentRoomsOldMessages(days);
        res.json({
            success: true,
            deletedMessages: deletedCount,
            message: `已清理永久房间(1-10) ${days} 天前的旧消息`
        });
    } catch (error) {
        console.error('清理永久房间失败:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// API: 手动触发临时房间清理(仅用于测试)
app.post('/api/cleanup/temporary', (req, res) => {
    try {
        const activeRooms = Object.keys(rooms);
        const deletedCount = db.cleanTemporaryRoomsAllMessages(activeRooms);
        res.json({
            success: true,
            deletedMessages: deletedCount,
            activeRooms: activeRooms,
            message: `已清理临时房间且无用户在线的所有消息`
        });
    } catch (error) {
        console.error('清理临时房间失败:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// API: 获取所有房间列表
app.get('/api/rooms', (req, res) => {
    try {
        const roomsList = db.getAllRoomsWithMessages();
        res.json(roomsList);
    } catch (error) {
        console.error('获取房间列表失败:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 3. 监听 WebSocket 连接
io.on('connection', (socket) => {
    console.log('一个用户连接了: ' + socket.id);

    // 监听加入房间事件
    socket.on('join room', ({ username, room }) => {
        try {
            // 输入验证
            if (!username || typeof username !== 'string' || username.trim().length === 0) {
                socket.emit('error', { message: '用户名不能为空' });
                return;
            }

            if (!room || typeof room !== 'string' || room.trim().length === 0) {
                socket.emit('error', { message: '房间号不能为空' });
                return;
            }

            username = username.trim();
            room = room.trim();

            // 验证用户名长度
            if (username.length < 1 || username.length > 20) {
                socket.emit('error', { message: '用户名长度必须在1-20个字符之间' });
                return;
            }

            // 验证房间号长度
            if (room.length < 1 || room.length > 20) {
                socket.emit('error', { message: '房间号长度必须在1-20个字符之间' });
                return;
            }

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

            // 保存用户信息
            users[socket.id] = { username, room };

            // 初始化房间(如果不存在)
            if (!rooms[room]) {
                rooms[room] = [];
            }

            // 将用户加入房间
            socket.join(room);
            rooms[room].push(socket.id);

            console.log(`${username} 加入了房间 ${room}`);

            // 记录连接日志到数据库
            const ipAddress = socket.handshake.address;
            db.insertConnectionLog(socket.id, username, room, 'join', ipAddress);

            // 发送加入成功确认
            socket.emit('room joined', { username, room });

            // 通知房间内其他用户有新人加入
            socket.to(room).emit('system message', {
                message: `${username} 加入了房间`
            });

            // 发送当前房间用户列表
            const roomUsers = rooms[room].map(id => users[id]?.username || '未知用户');
            io.to(room).emit('user list', roomUsers);

            // 发送房间历史消息给新加入的用户
            const historyMessages = db.getRoomMessages(room, 20);
            if (historyMessages.length > 0) {
                socket.emit('room history', historyMessages);
            }
        } catch (error) {
            console.error('加入房间失败:', error);
            socket.emit('error', { message: '加入房间失败,请稍后重试' });
        }
    });

    // 监听聊天消息
    socket.on('chat message', (data) => {
        try {
            const user = users[socket.id];
            
            if (!user) {
                socket.emit('error', { message: '请先加入房间' });
                return;
            }

            if (!data.text || typeof data.text !== 'string' || data.text.trim().length === 0) {
                socket.emit('error', { message: '消息内容不能为空' });
                return;
            }

            const text = data.text.trim();

            if (text.length > 500) {
                socket.emit('error', { message: '消息长度不能超过500个字符' });
                return;
            }

            console.log(`房间 ${user.room} 收到消息: ${text}`);

            // 保存消息到数据库
            db.insertChatMessage(socket.id, user.username, user.room, text);

            // 广播消息给同一房间的所有用户(包括发送者)
            io.to(user.room).emit('chat message', {
                username: user.username,
                text: text,
                time: data.time,
                socketId: socket.id
            });
        } catch (error) {
            console.error('发送消息失败:', error);
            socket.emit('error', { message: '发送消息失败,请稍后重试' });
        }
    });

    // 监听离开房间事件
    socket.on('leave room', ({ username, room }) => {
        try {
            const user = users[socket.id];
            
            if (user && user.room === room) {
                // 记录离开日志到数据库
                db.insertConnectionLog(socket.id, user.username, user.room, 'leave', socket.handshake.address);

                // 通知房间内其他用户
                socket.to(room).emit('user left', { username: user.username });

                // 从房间中移除用户
                rooms[room] = rooms[room].filter(id => id !== socket.id);

                // 如果房间为空,删除房间
                if (rooms[room].length === 0) {
                    delete rooms[room];
                }

                // 从用户列表中移除
                delete users[socket.id];

                // 离开房间
                socket.leave(room);

                console.log(`${username} 离开了房间 ${room}`);
            }
        } catch (error) {
            console.error('离开房间失败:', error);
        }
    });

    // 监听断开连接
    socket.on('disconnect', () => {
        try {
            const user = users[socket.id];
            
            if (user) {
                console.log(`用户 ${user.username} 断开连接`);

                // 记录断开连接日志到数据库
                db.insertConnectionLog(socket.id, user.username, user.room, 'disconnect', socket.handshake.address);

                // 通知房间内其他用户
                socket.to(user.room).emit('user left', { username: user.username });

                // 从房间中移除用户
                rooms[user.room] = rooms[user.room]?.filter(id => id !== socket.id);

                // 如果房间为空,删除房间
                if (rooms[user.room]?.length === 0) {
                    delete rooms[user.room];
                }

                // 从用户列表中移除
                delete users[socket.id];
            }
        } catch (error) {
            console.error('断开连接处理失败:', error);
        }
    });
});

// 4. 启动服务器,监听端口
http.listen(PORT, () => {
    console.log(`服务器正在运行，访问地址: http://localhost:${PORT}`);
    console.log(`运行环境: ${NODE_ENV}`);
});

// 5. 定时清理任务

// 每天凌晨3点清理永久房间(1-10)的旧消息(30天前)
function schedulePermanentRoomCleanup() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0);
    
    const delay = tomorrow - now;
    
    setTimeout(() => {
        console.log('开始清理永久房间(1-10)的旧消息...');
        try {
            db.cleanPermanentRoomsOldMessages(30);
        } catch (error) {
            console.error('清理永久房间失败:', error);
        }
        // 之后每24小时执行一次
        setInterval(() => {
            console.log('开始清理永久房间(1-10)的旧消息...');
            try {
                db.cleanPermanentRoomsOldMessages(30);
            } catch (error) {
                console.error('清理永久房间失败:', error);
            }
        }, 24 * 60 * 60 * 1000);
    }, delay);
    
    console.log(`已安排永久房间清理任务，将在 ${tomorrow.toLocaleString()} 执行`);
}

// 每小时整点清理临时房间(非1-10)且无用户在线的所有消息
function scheduleTemporaryRoomCleanup() {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    
    const delay = nextHour - now;
    
    setTimeout(() => {
        executeTemporaryRoomCleanup();
        // 之后每小时执行一次
        setInterval(() => {
            executeTemporaryRoomCleanup();
        }, 60 * 60 * 1000);
    }, delay);
    
    console.log(`已安排临时房间清理任务，将在 ${nextHour.toLocaleString()} 执行`);
}

// 执行临时房间清理
function executeTemporaryRoomCleanup() {
    console.log('开始清理临时房间(非1-10)且无用户在线的消息...');
    
    // 获取当前有用户在线的房间列表
    const activeRooms = Object.keys(rooms);
    console.log('当前有用户在线的房间:', activeRooms);
    
    // 清理临时房间且无用户在线的所有消息
    try {
        const deletedCount = db.cleanTemporaryRoomsAllMessages(activeRooms);
        console.log(`临时房间清理完成，删除了 ${deletedCount} 条消息`);
    } catch (error) {
        console.error('清理临时房间失败:', error);
    }
}

// 启动定时清理任务
schedulePermanentRoomCleanup();
scheduleTemporaryRoomCleanup();

// 6. 定期清理断开连接的用户(防止内存泄漏)
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

// 7. 定期分析数据库性能(每周执行一次)
const analyzeInterval = 7 * 24 * 60 * 60 * 1000; // 7天
setInterval(() => {
    try {
        db.analyzeDatabase();
    } catch (error) {
        console.error('数据库性能分析失败:', error);
    }
}, analyzeInterval);

// 8. 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    try {
        db.closeDatabase();
    } catch (error) {
        console.error('关闭数据库失败:', error);
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n正在关闭服务器...');
    try {
        db.closeDatabase();
    } catch (error) {
        console.error('关闭数据库失败:', error);
    }
    process.exit(0);
});

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
});
