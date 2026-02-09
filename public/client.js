// public/client.js - 客户端(安全增强版)

// 全局变量
let socket;
let currentUsername = '';
let currentRoom = '';
let isDarkMode = false;
let isConnected = false;

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

// HTML转义函数,防止XSS攻击
function escapeHtml(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'/]/g, function(m) { return map[m]; });
}

// 验证输入
function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        return { valid: false, message: '用户名不能为空' };
    }
    
    username = username.trim();
    
    if (username.length < 1) {
        return { valid: false, message: '用户名不能为空' };
    }
    
    if (username.length > 20) {
        return { valid: false, message: '用户名长度不能超过20个字符' };
    }
    
    // 只允许字母、数字、中文和下划线
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
        return { valid: false, message: '用户名只能包含字母、数字、中文和下划线' };
    }
    
    return { valid: true };
}

function validateRoom(room) {
    if (!room || typeof room !== 'string') {
        return { valid: false, message: '房间号不能为空' };
    }
    
    room = room.trim();
    
    if (room.length < 1) {
        return { valid: false, message: '房间号不能为空' };
    }
    
    if (room.length > 20) {
        return { valid: false, message: '房间号长度不能超过20个字符' };
    }
    
    // 只允许字母、数字、下划线和短横线
    if (!/^[a-zA-Z0-9_-]+$/.test(room)) {
        return { valid: false, message: '房间号只能包含字母、数字、下划线和短横线' };
    }
    
    return { valid: true };
}

function validateMessage(message) {
    if (!message || typeof message !== 'string') {
        return { valid: false, message: '消息内容不能为空' };
    }
    
    message = message.trim();
    
    if (message.length < 1) {
        return { valid: false, message: '消息内容不能为空' };
    }
    
    if (message.length > 500) {
        return { valid: false, message: '消息长度不能超过500个字符' };
    }
    
    return { valid: true };
}

// 登录功能
joinBtn.addEventListener('click', joinRoom);

function joinRoom() {
    // 防止重复连接
    if (isConnected && socket) {
        alert('您已经在聊天室中');
        return;
    }

    const username = usernameInput.value.trim();
    const room = roomInput.value.trim();

    // 验证用户名
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
        alert(usernameValidation.message);
        usernameInput.focus();
        return;
    }

    // 验证房间号
    const roomValidation = validateRoom(room);
    if (!roomValidation.valid) {
        alert(roomValidation.message);
        roomInput.focus();
        return;
    }

    currentUsername = username;
    currentRoom = room;

    try {
        // 连接到服务器
        socket = io();

        // 发送加入房间事件
        socket.emit('join room', { username, room });

        // 监听连接成功事件
        socket.on('connect', () => {
            console.log('已连接到服务器');
            isConnected = true;
        });

        // 监听连接错误
        socket.on('connect_error', (error) => {
            console.error('连接错误:', error);
            alert('连接服务器失败,请检查网络连接');
            isConnected = false;
        });

        // 监听断开连接
        socket.on('disconnect', (reason) => {
            console.log('已断开连接:', reason);
            isConnected = false;
            alert('与服务器断开连接');
            leaveRoom();
        });

        // 监听加入房间的成功确认
        socket.on('room joined', (data) => {
            showChatRoom();
            addSystemMessage(`欢迎 ${escapeHtml(username)} 加入房间 "${escapeHtml(room)}"`);
            currentUsernameSpan.textContent = escapeHtml(username);
            currentRoomSpan.textContent = escapeHtml(room);
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
            addSystemMessage(`${escapeHtml(data.username)} 离开了房间`);
        });

        // 监听错误
        socket.on('error', (data) => {
            console.error('服务器错误:', data);
            alert(data.message || '发生错误,请稍后重试');
        });
    } catch (error) {
        console.error('加入房间失败:', error);
        alert('加入房间失败,请稍后重试');
        isConnected = false;
    }
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
        socket = null;
        isConnected = false;
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
        if (!user || typeof user !== 'string') {
            return;
        }

        const userItem = document.createElement('div');
        userItem.className = `user-item ${user === currentUsername ? 'is-me' : ''}`;

        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.textContent = escapeHtml(user.charAt(0).toUpperCase());

        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';

        const userName = document.createElement('div');
        userName.className = 'user-name';
        userName.textContent = escapeHtml(user);

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
    if (!data || !data.username || !data.text) {
        return;
    }

    const div = document.createElement('div');
    const isMe = data.socketId === socket.id;

    div.className = `message ${isMe ? 'mine' : 'others'}`;

    // 创建消息头部容器(包含用户名和时间)
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';

    const usernameSpan = document.createElement('div');
    usernameSpan.className = 'username';
    usernameSpan.textContent = escapeHtml(data.username);

    const timeSpan = document.createElement('div');
    timeSpan.className = 'time';
    timeSpan.textContent = formatTime(data.time);

    messageHeader.appendChild(usernameSpan);
    messageHeader.appendChild(timeSpan);

    const contentSpan = document.createElement('div');
    contentSpan.className = 'content';
    contentSpan.textContent = data.text; // 使用 textContent 防止XSS

    div.appendChild(messageHeader);
    div.appendChild(contentSpan);

    chatBox.appendChild(div);

    // 自动滚动到底部
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 添加系统消息
function addSystemMessage(message) {
    if (!message || typeof message !== 'string') {
        return;
    }

    const div = document.createElement('div');
    div.className = 'message system';
    div.textContent = message; // 使用 textContent 防止XSS
    chatBox.appendChild(div);

    // 自动滚动到底部
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 格式化时间
function formatTime(timestamp) {
    if (!timestamp) {
        return '';
    }

    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 发送消息
function sendMessage() {
    const text = msgInput.value;
    
    if (!text || typeof text !== 'string') {
        return;
    }

    // 验证消息
    const messageValidation = validateMessage(text);
    if (!messageValidation.valid) {
        alert(messageValidation.message);
        return;
    }

    if (socket && isConnected) {
        socket.emit('chat message', {
            username: currentUsername,
            room: currentRoom,
            text: text.trim(),
            time: Date.now()
        });
        msgInput.value = '';
    } else {
        alert('未连接到服务器');
    }
}

// 点击按钮发送
sendBtn.addEventListener('click', sendMessage);

// 回车键发送
msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

// 回车键登录
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        roomInput.focus();
    }
});

roomInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        joinRoom();
    }
});

// 页面卸载时断开连接
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.disconnect();
    }
});

// 处理网络错误
window.addEventListener('offline', () => {
    if (isConnected) {
        addSystemMessage('网络连接已断开');
    }
});

window.addEventListener('online', () => {
    if (!isConnected && currentUsername && currentRoom) {
        addSystemMessage('网络已恢复,尝试重新连接...');
        // 可以在这里添加自动重连逻辑
    }
});
