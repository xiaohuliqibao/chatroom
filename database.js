// database.js - SQLite数据库初始化和操作模块

const Database = require('better-sqlite3');
const path = require('path');

// 创建或连接数据库文件
const db = new Database(path.join(__dirname, 'chatroom.db'));

// 启用外键约束
db.pragma('foreign_keys = ON');

// 初始化数据库表结构
function initializeDatabase() {
    // 创建连接日志表
    db.exec(`
        CREATE TABLE IF NOT EXISTS connection_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            socket_id TEXT NOT NULL,
            username TEXT NOT NULL,
            room TEXT NOT NULL,
            action TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            ip_address TEXT
        )
    `);

    // 创建聊天消息表
    db.exec(`
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            socket_id TEXT NOT NULL,
            username TEXT NOT NULL,
            room TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        )
    `);

    // 创建索引以提高查询性能
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_connection_logs_room ON connection_logs(room);
        CREATE INDEX IF NOT EXISTS idx_connection_logs_timestamp ON connection_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_username ON chat_messages(username);
    `);

    console.log('数据库初始化完成');
}

// 插入连接日志
function insertConnectionLog(socketId, username, room, action, ipAddress) {
    const stmt = db.prepare(`
        INSERT INTO connection_logs (socket_id, username, room, action, timestamp, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
        const result = stmt.run(socketId, username, room, action, Date.now(), ipAddress);
        console.log(`连接日志已记录: ${username} ${action} 房间 ${room}`);
        return result.lastInsertRowid;
    } catch (error) {
        console.error('插入连接日志失败:', error);
        return null;
    }
}

// 插入聊天消息
function insertChatMessage(socketId, username, room, message) {
    const stmt = db.prepare(`
        INSERT INTO chat_messages (socket_id, username, room, message, timestamp)
        VALUES (?, ?, ?, ?, ?)
    `);

    try {
        const result = stmt.run(socketId, username, room, message, Date.now());
        console.log(`聊天消息已保存: ${username} 在房间 ${room}`);
        return result.lastInsertRowid;
    } catch (error) {
        console.error('插入聊天消息失败:', error);
        return null;
    }
}

// 获取房间的聊天消息历史
function getRoomMessages(room, limit = 100) {
    const stmt = db.prepare(`
        SELECT socket_id, username, message, timestamp
        FROM chat_messages
        WHERE room = ?
        ORDER BY timestamp DESC
        LIMIT ?
    `);

    try {
        const messages = stmt.all(room, limit);
        return messages.reverse(); // 按时间正序返回
    } catch (error) {
        console.error('获取聊天消息失败:', error);
        return [];
    }
}

// 获取房间的连接日志
function getConnectionLogs(room, limit = 50) {
    const stmt = db.prepare(`
        SELECT username, action, timestamp
        FROM connection_logs
        WHERE room = ?
        ORDER BY timestamp DESC
        LIMIT ?
    `);

    try {
        const logs = stmt.all(room, limit);
        return logs.reverse();
    } catch (error) {
        console.error('获取连接日志失败:', error);
        return [];
    }
}

// 获取用户在房间的所有消息
function getUserMessages(username, room, limit = 50) {
    const stmt = db.prepare(`
        SELECT message, timestamp
        FROM chat_messages
        WHERE username = ? AND room = ?
        ORDER BY timestamp DESC
        LIMIT ?
    `);

    try {
        const messages = stmt.all(username, room, limit);
        return messages.reverse();
    } catch (error) {
        console.error('获取用户消息失败:', error);
        return [];
    }
}

// 获取统计信息
function getStatistics() {
    try {
        const totalMessages = db.prepare('SELECT COUNT(*) as count FROM chat_messages').get();
        const totalConnections = db.prepare('SELECT COUNT(*) as count FROM connection_logs').get();
        const activeRooms = db.prepare('SELECT COUNT(DISTINCT room) as count FROM chat_messages').get();
        const totalUsers = db.prepare('SELECT COUNT(DISTINCT username) as count FROM chat_messages').get();

        return {
            totalMessages: totalMessages.count,
            totalConnections: totalConnections.count,
            activeRooms: activeRooms.count,
            totalUsers: totalUsers.count
        };
    } catch (error) {
        console.error('获取统计信息失败:', error);
        return null;
    }
}

// 清理旧数据(超过30天)
function cleanOldData() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    try {
        const deletedMessages = db.prepare(`
            DELETE FROM chat_messages WHERE timestamp < ?
        `).run(thirtyDaysAgo);

        const deletedLogs = db.prepare(`
            DELETE FROM connection_logs WHERE timestamp < ?
        `).run(thirtyDaysAgo);

        console.log(`清理旧数据完成: 删除 ${deletedMessages.changes} 条消息, ${deletedLogs.changes} 条日志`);
        return {
            deletedMessages: deletedMessages.changes,
            deletedLogs: deletedLogs.changes
        };
    } catch (error) {
        console.error('清理旧数据失败:', error);
        return null;
    }
}

// 关闭数据库连接
function closeDatabase() {
    db.close();
    console.log('数据库连接已关闭');
}

module.exports = {
    initializeDatabase,
    insertConnectionLog,
    insertChatMessage,
    getRoomMessages,
    getConnectionLogs,
    getUserMessages,
    getStatistics,
    cleanOldData,
    closeDatabase
};
