// public/client.js

// 全局变量
let socket;
let currentUsername = '';
let currentRoom = '';
let isDarkMode = false;

// 获取 DOM 元素
const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room');
const joinBtn = document.getElementById('join-btn');
const leaveBtn = document.getElementById('leave-btn');
const themeBtn = document.getElementById('theme-btn');
const themeIcon = document.querySelector('.theme-icon');
const chatBox = document.getElementById('chat-box');
const msgInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');
const currentUsernameSpan = document.getElementById('current-username');
const currentRoomSpan = document.getElementById('current-room');
const userListContent = document.getElementById('user-list-content');
const userCount = document.getElementById('user-count');

// 登录功能
joinBtn.addEventListener('click', joinRoom);

function joinRoom() {
    const username = usernameInput.value.trim();
    const room = roomInput.value.trim();

    if (!username || !room) {
        alert('请输入用户名和房间号');
        return;
    }

    currentUsername = username;
    currentRoom = room;

    // 连接到服务器
    socket = io();

    // 发送加入房间事件
    socket.emit('join room', { username, room });

    // 监听连接成功事件
    socket.on('connect', () => {
        console.log('已连接到服务器');
    });

    // 监听加入房间的成功确认
    socket.on('room joined', (data) => {
        showChatRoom();
        addSystemMessage(`欢迎 ${username} 加入房间 "${room}"`);
        currentUsernameSpan.textContent = username;
        currentRoomSpan.textContent = room;
    });

    // 监听房间历史消息
    socket.on('room history', (messages) => {
        if (messages && messages.length > 0) {
            addSystemMessage(`--- 已加载 ${messages.length} 条历史消息 ---`);
            messages.forEach(msg => {
                addMessage({
                    username: msg.username,
                    text: msg.message,
                    time: msg.timestamp,
                    socketId: socket.id
                });
            });
            addSystemMessage(`--- 历史消息加载完成 ---`);
        }
    });

    // 监听用户列表更新
    socket.on('user list', (users) => {
        updateUserList(users);
    });

    // 监听聊天消息
    socket.on('chat message', (data) => {
        addMessage(data);
    });

    // 监听系统消息
    socket.on('system message', (data) => {
        addSystemMessage(data.message);
    });

    // 监听用户离开
    socket.on('user left', (data) => {
        addSystemMessage(`${data.username} 离开了房间`);
    });

    // 监听错误
    socket.on('error', (data) => {
        alert(data.message);
    });
}

// 显示聊天室界面
function showChatRoom() {
    loginContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    msgInput.focus();
}

// 退出房间
leaveBtn.addEventListener('click', leaveRoom);

function leaveRoom() {
    if (socket) {
        socket.emit('leave room', { username: currentUsername, room: currentRoom });
        socket.disconnect();
    }
    chatContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
    chatBox.innerHTML = '';
    userListContent.innerHTML = '';
    userCount.textContent = '0';
    usernameInput.value = '';
    roomInput.value = '';
    currentUsername = '';
    currentRoom = '';
}

// 更新用户列表
function updateUserList(users) {
    userListContent.innerHTML = '';
    userCount.textContent = users.length;

    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = `user-item ${user === currentUsername ? 'is-me' : ''}`;

        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.textContent = user.charAt(0).toUpperCase();

        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';

        const userName = document.createElement('div');
        userName.className = 'user-name';
        userName.textContent = user;

        const userStatus = document.createElement('div');
        userStatus.className = 'user-status online';
        userStatus.innerHTML = '<span class="user-status-dot"></span>在线';

        userInfo.appendChild(userName);
        userInfo.appendChild(userStatus);

        userItem.appendChild(avatar);
        userItem.appendChild(userInfo);

        userListContent.appendChild(userItem);
    });
}

// 夜间模式切换
themeBtn.addEventListener('click', toggleTheme);

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    themeIcon.textContent = isDarkMode ? '☀️' : '🌙';
    
    // 保存主题设置到本地存储
    localStorage.setItem('darkMode', isDarkMode);
}

// 页面加载时恢复主题设置
function loadTheme() {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'true') {
        isDarkMode = true;
        document.body.classList.add('dark-mode');
        themeIcon.textContent = '☀️';
    }
}

// 初始化时加载主题
loadTheme();

// 添加消息到聊天框
function addMessage(data) {
    const div = document.createElement('div');
    const isMe = data.socketId === socket.id;

    div.className = `message ${isMe ? 'mine' : 'others'}`;

    // 创建消息头部容器(包含用户名和时间)
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';

    const usernameSpan = document.createElement('div');
    usernameSpan.className = 'username';
    usernameSpan.textContent = data.username;

    const timeSpan = document.createElement('div');
    timeSpan.className = 'time';
    timeSpan.textContent = formatTime(data.time);

    messageHeader.appendChild(usernameSpan);
    messageHeader.appendChild(timeSpan);

    const contentSpan = document.createElement('div');
    contentSpan.className = 'content';
    contentSpan.textContent = data.text;

    div.appendChild(messageHeader);
    div.appendChild(contentSpan);

    chatBox.appendChild(div);

    // 自动滚动到底部
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 添加系统消息
function addSystemMessage(message) {
    const div = document.createElement('div');
    div.className = 'message system';
    div.textContent = message;
    chatBox.appendChild(div);

    // 自动滚动到底部
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 发送消息
function sendMessage() {
    const text = msgInput.value.trim();
    if (text && socket) {
        socket.emit('chat message', {
            username: currentUsername,
            room: currentRoom,
            text: text,
            time: Date.now()
        });
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

// 回车键登录
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        roomInput.focus();
    }
});

roomInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinRoom();
    }
});