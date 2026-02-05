// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// 1. 设置静态文件目录，用于访问 index.html 和 css
app.use(express.static(path.join(__dirname, 'public')));

// 2. 处理根路径请求，返回 index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. 监听 WebSocket 连接
io.on('connection', (socket) => {
    console.log('一个用户连接了: ' + socket.id);

    // 广播给其他用户，有人加入了（可选功能）
    socket.broadcast.emit('system message', '有新用户加入了聊天室');

    // 修改 server.js 中的这部分
    socket.on('chat message', (data) => {
        // data 现在是 { id: socket.id, text: '消息内容' }
        console.log('收到消息: ' + data.text);
        
        // 直接将 data 对象广播给所有人
        io.emit('chat message', data);
    });

    // 监听断开连接
    socket.on('disconnect', () => {
        console.log('用户断开连接: ' + socket.id);
    });
});

// 4. 启动服务器，监听 3000 端口
const PORT = 3000;
http.listen(PORT, () => {
    console.log(`服务器正在运行，访问地址: http://localhost:${PORT}`);
});