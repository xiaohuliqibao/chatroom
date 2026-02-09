// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const db = require('./database');

// 初始化数据库
db.initializeDatabase();

// 存储用户信息和房间信息
const users = {}; // { socketId: { username, room } }
const rooms = {}; // { roomName: [socketId1, socketId2, ...] }

// 1. 设置静态文件目录，用于访问 index.html 和 css
app.use(express.static(path.join(__dirname, 'public')));

// 2. 处理根路径请求，返回 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: 获取统计信息
app.get('/api/stats', (req, res) => {
    const stats = db.getStatistics();
    if (stats) {
        res.json(stats);
    } else {
        res.status(500).json({ error: '获取统计信息失败' });
    }
});

// API: 获取房间消息历史
app.get('/api/messages/:room', (req, res) => {
    const room = req.params.room;
    const limit = parseInt(req.query.limit) || 50;
    const messages = db.getRoomMessages(room, limit);
    res.json(messages);
});

// API: 获取房间连接日志
app.get('/api/logs/:room', (req, res) => {
    const room = req.params.room;
    const limit = parseInt(req.query.limit) || 50;
    const logs = db.getConnectionLogs(room, limit);
    res.json(logs);
});

// API: 获取用户消息
app.get('/api/messages/:room/:username', (req, res) => {
    const room = req.params.room;
    const username = req.params.username;
    const limit = parseInt(req.query.limit) || 50;
    const messages = db.getUserMessages(username, room, limit);
    res.json(messages);
});

// 3. 监听 WebSocket 连接
io.on('connection', (socket) => {
    console.log('一个用户连接了: ' + socket.id);

    // 监听加入房间事件
    socket.on('join room', ({ username, room }) => {
        // 保存用户信息
        users[socket.id] = { username, room };

        // 初始化房间（如果不存在）
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

        // 发送当前房间用户列表（可选）
        const roomUsers = rooms[room].map(id => users[id]?.username || '未知用户');
        io.to(room).emit('user list', roomUsers);

        // 发送房间历史消息给新加入的用户
        const historyMessages = db.getRoomMessages(room, 20);
        if (historyMessages.length > 0) {
            socket.emit('room history', historyMessages);
        }
    });

    // 监听聊天消息
    socket.on('chat message', (data) => {
        const user = users[socket.id];
        
        if (!user) {
            socket.emit('error', { message: '请先加入房间' });
            return;
        }

        console.log(`房间 ${user.room} 收到消息: ${data.text}`);

        // 保存消息到数据库
        db.insertChatMessage(socket.id, user.username, user.room, data.text);

        // 广播消息给同一房间的所有用户（包括发送者）
        io.to(user.room).emit('chat message', {
            username: user.username,
            text: data.text,
            time: data.time,
            socketId: socket.id
        });
    });

    // 监听离开房间事件
    socket.on('leave room', ({ username, room }) => {
        const user = users[socket.id];
        
        if (user && user.room === room) {
            // 记录离开日志到数据库
            db.insertConnectionLog(socket.id, user.username, user.room, 'leave', socket.handshake.address);

            // 通知房间内其他用户
            socket.to(room).emit('user left', { username: user.username });

            // 从房间中移除用户
            rooms[room] = rooms[room].filter(id => id !== socket.id);

            // 如果房间为空，删除房间
            if (rooms[room].length === 0) {
                delete rooms[room];
            }

            // 从用户列表中移除
            delete users[socket.id];

            // 离开房间
            socket.leave(room);

            console.log(`${username} 离开了房间 ${room}`);
        }
    });

    // 监听断开连接
    socket.on('disconnect', () => {
        const user = users[socket.id];
        
        if (user) {
            console.log(`用户 ${user.username} 断开连接`);

            // 记录断开连接日志到数据库
            db.insertConnectionLog(socket.id, user.username, user.room, 'disconnect', socket.handshake.address);

            // 通知房间内其他用户
            socket.to(user.room).emit('user left', { username: user.username });

            // 从房间中移除用户
            rooms[user.room] = rooms[user.room].filter(id => id !== socket.id);

            // 如果房间为空，删除房间
            if (rooms[user.room] && rooms[user.room].length === 0) {
                delete rooms[user.room];
            }

            // 从用户列表中移除
            delete users[socket.id];
        }
    });
});

// 4. 启动服务器，监听 3000 端口
const PORT = 3000;
http.listen(PORT, () => {
    console.log(`服务器正在运行，访问地址: http://localhost:${PORT}`);
});

// 5. 定时清理旧数据(每天凌晨3点执行)
function scheduleCleanup() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0);
    
    const delay = tomorrow - now;
    
    setTimeout(() => {
        db.cleanOldData();
        // 之后每24小时执行一次
        setInterval(() => {
            db.cleanOldData();
        }, 24 * 60 * 60 * 1000);
    }, delay);
    
    console.log(`已安排数据清理任务，将在 ${tomorrow.toLocaleString()} 执行`);
}

// 启动定时清理任务
scheduleCleanup();

// 6. 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    db.closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n正在关闭服务器...');
    db.closeDatabase();
    process.exit(0);
});