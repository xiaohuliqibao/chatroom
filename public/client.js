// public/client.js

// 1. 建立与后端的 socket 连接
const socket = io();

// 获取 DOM 元素
const chatBox = document.getElementById('chat-box');
const msgInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');

// 生成一个随机的匿名颜色或标识（可选）
const isMe = (senderId) => senderId === socket.id;

// 2. 监听 'chat message' 事件，接收服务器广播的消息
socket.on('chat message', (data) => {
    // data 结构可以是简单的字符串，也可以是对象 { id: socket.id, msg: '内容' }
    // 这里我们假设后端发来的是对象，为了区分自己和他人的消息
    
    // 注意：为了简单起见，我们需要修改一下后端发送的数据格式。
    // 但如果后端只发字符串，这里就只显示字符串。
    // 让我们假设后端发来的是 { id: 'xxx', text: 'hello' }
    
    const div = document.createElement('div');
    
    // 判断消息是否是自己发的
    if (data.id === socket.id) {
        div.className = 'message mine';
        div.textContent = data.text; // 自己发的消息显示在右边
    } else {
        div.className = 'message others';
        div.textContent = `匿名用户: ${data.text}`; // 别人的消息显示在左边
    }
    
    chatBox.appendChild(div);
    
    // 自动滚动到底部
    chatBox.scrollTop = chatBox.scrollHeight;
});

// 3. 发送消息逻辑
function sendMessage() {
    const text = msgInput.value.trim();
    if (text) {
        // 发送消息给服务器
        // 为了区分身份，我们发送一个对象
        socket.emit('chat message', { id: socket.id, text: text });
        
        // 清空输入框
        msgInput.value = '';
    }
}

// 点击按钮发送
sendBtn.addEventListener('click', sendMessage);

// 回车键发送
msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});