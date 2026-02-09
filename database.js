// database.js - SQLite数据库初始化和操作模块(安全增强版)

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 自定义错误类
class DatabaseError extends Error {
    constructor(message, code, details) {
        super(message);
        this.name = 'DatabaseError';
        this.code = code;
        this.details = details;
    }
}

class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

// 创建数据目录
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 创建或连接数据库文件
const dbPath = process.env.DB_PATH || path.join(dataDir, 'chatroom.db');
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 输入验证函数
function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        throw new ValidationError('用户名不能为空', 'username');
    }
    if (username.length < 1 || username.length > 20) {
        throw new ValidationError('用户名长度必须在1-20个字符之间', 'username');
    }
    // 只允许字母、数字、中文和下划线
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
        throw new ValidationError('用户名只能包含字母、数字、中文和下划线', 'username');
    }
    return true;
}

function validateRoomName(room) {
    if (!room || typeof room !== 'string') {
        throw new ValidationError('房间号不能为空', 'room');
    }
    if (room.length < 1 || room.length > 20) {
        throw new ValidationError('房间号长度必须在1-20个字符之间', 'room');
    }
    // 只允许字母、数字、下划线和短横线
    if (!/^[a-zA-Z0-9_-]+$/.test(room)) {
        throw new ValidationError('房间号只能包含字母、数字、下划线和短横线', 'room');
    }
    return true;
}

function validateMessage(message) {
    if (!message || typeof message !== 'string') {
        throw new ValidationError('消息内容不能为空', 'message');
    }
    if (message.length === 0 || message.length > 500) {
        throw new ValidationError('消息长度必须在1-500个字符之间', 'message');
    }
    return true;
}

function validateAction(action) {
    const validActions = ['join', 'leave', 'disconnect'];
    if (!validActions.includes(action)) {
        throw new ValidationError('无效的操作类型', 'action');
    }
    return true;
}

// 判断房间号是否为1-10
function isPermanentRoom(room) {
    const roomNum = parseInt(room);
    return !isNaN(roomNum) && roomNum >= 1 && roomNum <= 10 && roomNum.toString() === room;
}

// 初始化数据库表结构
function initializeDatabase() {
    try {
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

        // 创建复合索引以优化查询
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_chat_messages_room_timestamp 
            ON chat_messages(room, timestamp DESC);
            
            CREATE INDEX IF NOT EXISTS idx_chat_messages_username_room 
            ON chat_messages(username, room);
        `);

        console.log('数据库初始化完成');
    } catch (error) {
        throw new DatabaseError(
            '数据库初始化失败',
            'INIT_FAILED',
            { error: error.message }
        );
    }
}

// 插入连接日志
function insertConnectionLog(socketId, username, room, action, ipAddress) {
    try {
        validateUsername(username);
        validateRoomName(room);
        validateAction(action);

        const stmt = db.prepare(`
            INSERT INTO connection_logs (socket_id, username, room, action, timestamp, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(socketId, username, room, action, Date.now(), ipAddress);
        console.log(`连接日志已记录: ${username} ${action} 房间 ${room}`);
        return result.lastInsertRowid;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new DatabaseError(
            '插入连接日志失败',
            'INSERT_LOG_FAILED',
            { socketId, username, room, action, error: error.message }
        );
    }
}

// 插入聊天消息
function insertChatMessage(socketId, username, room, message) {
    try {
        validateUsername(username);
        validateRoomName(room);
        validateMessage(message);

        const stmt = db.prepare(`
            INSERT INTO chat_messages (socket_id, username, room, message, timestamp)
            VALUES (?, ?, ?, ?, ?)
        `);

        const result = stmt.run(socketId, username, room, message, Date.now());
        console.log(`聊天消息已保存: ${username} 在房间 ${room}`);
        return result.lastInsertRowid;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new DatabaseError(
            '插入聊天消息失败',
            'INSERT_MESSAGE_FAILED',
            { socketId, username, room, error: error.message }
        );
    }
}

// 获取房间的聊天消息历史
function getRoomMessages(room, limit = 100) {
    try {
        validateRoomName(room);
        
        if (limit < 1 || limit > 1000) {
            limit = 100;
        }

        const stmt = db.prepare(`
            SELECT socket_id, username, message, timestamp
            FROM chat_messages
            WHERE room = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `);

        const messages = stmt.all(room, limit);
        return messages.reverse(); // 按时间正序返回
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new DatabaseError(
            '获取聊天消息失败',
            'GET_MESSAGES_FAILED',
            { room, limit, error: error.message }
        );
    }
}

// 获取房间的连接日志
function getConnectionLogs(room, limit = 50) {
    try {
        validateRoomName(room);
        
        if (limit < 1 || limit > 500) {
            limit = 50;
        }

        const stmt = db.prepare(`
            SELECT username, action, timestamp
            FROM connection_logs
            WHERE room = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `);

        const logs = stmt.all(room, limit);
        return logs.reverse();
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new DatabaseError(
            '获取连接日志失败',
            'GET_LOGS_FAILED',
            { room, limit, error: error.message }
        );
    }
}

// 获取用户在房间的所有消息
function getUserMessages(username, room, limit = 50) {
    try {
        validateUsername(username);
        validateRoomName(room);
        
        if (limit < 1 || limit > 500) {
            limit = 50;
        }

        const stmt = db.prepare(`
            SELECT message, timestamp
            FROM chat_messages
            WHERE username = ? AND room = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `);

        const messages = stmt.all(username, room, limit);
        return messages.reverse();
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new DatabaseError(
            '获取用户消息失败',
            'GET_USER_MESSAGES_FAILED',
            { username, room, limit, error: error.message }
        );
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
        throw new DatabaseError(
            '获取统计信息失败',
            'GET_STATS_FAILED',
            { error: error.message }
        );
    }
}

// 清理旧数据(超过30天)
function cleanOldData() {
    try {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

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
        throw new DatabaseError(
            '清理旧数据失败',
            'CLEAN_OLD_DATA_FAILED',
            { error: error.message }
        );
    }
}

// 清理指定房间的旧消息(超过30天) - 用于房间号1-10
function cleanRoomOldMessages(room, days = 30) {
    try {
        validateRoomName(room);
        
        const daysAgo = Date.now() - (days * 24 * 60 * 60 * 1000);

        const deletedMessages = db.prepare(`
            DELETE FROM chat_messages 
            WHERE room = ? AND timestamp < ?
        `).run(room, daysAgo);

        console.log(`清理房间 ${room} 旧消息完成: 删除 ${deletedMessages.changes} 条消息`);
        return deletedMessages.changes;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new DatabaseError(
            `清理房间 ${room} 旧消息失败`,
            'CLEAN_ROOM_OLD_MESSAGES_FAILED',
            { room, days, error: error.message }
        );
    }
}

// 清理指定房间的所有消息 - 用于非1-10房间且无用户在线
function cleanRoomAllMessages(room) {
    try {
        validateRoomName(room);

        const deletedMessages = db.prepare(`
            DELETE FROM chat_messages WHERE room = ?
        `).run(room);

        console.log(`清理房间 ${room} 所有消息完成: 删除 ${deletedMessages.changes} 条消息`);
        return deletedMessages.changes;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new DatabaseError(
            `清理房间 ${room} 所有消息失败`,
            'CLEAN_ROOM_ALL_MESSAGES_FAILED',
            { room, error: error.message }
        );
    }
}

// 获取所有有消息的房间列表
function getAllRoomsWithMessages() {
    try {
        const rooms = db.prepare(`
            SELECT DISTINCT room, COUNT(*) as message_count, 
                   MIN(timestamp) as first_message, 
                   MAX(timestamp) as last_message
            FROM chat_messages
            GROUP BY room
            ORDER BY room
        `).all();

        return rooms;
    } catch (error) {
        throw new DatabaseError(
            '获取房间列表失败',
            'GET_ROOMS_FAILED',
            { error: error.message }
        );
    }
}

// 批量清理永久房间(1-10)的旧消息
function cleanPermanentRoomsOldMessages(days = 30) {
    try {
        const daysAgo = Date.now() - (days * 24 * 60 * 60 * 1000);

        // 使用精确的房间号列表,避免使用 CAST
        const permanentRooms = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
        const placeholders = permanentRooms.map(() => '?').join(',');

        const deletedMessages = db.prepare(`
            DELETE FROM chat_messages 
            WHERE room IN (${placeholders}) AND timestamp < ?
        `).run(...permanentRooms, daysAgo);

        console.log(`清理永久房间旧消息完成: 删除 ${deletedMessages.changes} 条消息`);
        return deletedMessages.changes;
    } catch (error) {
        throw new DatabaseError(
            '清理永久房间旧消息失败',
            'CLEAN_PERMANENT_ROOMS_FAILED',
            { days, error: error.message }
        );
    }
}

// 批量清理临时房间(非1-10)的所有消息
function cleanTemporaryRoomsAllMessages(activeRooms) {
    try {
        // 验证所有活动房间号
        activeRooms.forEach(room => {
            if (room && typeof room === 'string') {
                validateRoomName(room);
            }
        });

        // 构建活动房间列表的参数占位符
        const placeholders = activeRooms.map(() => '?').join(',');
        
        let query = `
            DELETE FROM chat_messages 
            WHERE room NOT IN ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10')
        `;

        // 如果有活动房间,排除它们
        if (activeRooms.length > 0) {
            query += ` AND room NOT IN (${placeholders})`;
        }

        const stmt = db.prepare(query);
        const result = stmt.run(...activeRooms);

        console.log(`清理临时房间所有消息完成: 删除 ${result.changes} 条消息`);
        return result.changes;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new DatabaseError(
            '清理临时房间所有消息失败',
            'CLEAN_TEMPORARY_ROOMS_FAILED',
            { activeRooms, error: error.message }
        );
    }
}

// 分析数据库性能
function analyzeDatabase() {
    try {
        db.pragma('optimize');
        db.pragma('analyze');
        console.log('数据库性能分析完成');
    } catch (error) {
        throw new DatabaseError(
            '数据库性能分析失败',
            'ANALYZE_FAILED',
            { error: error.message }
        );
    }
}

// 关闭数据库连接
function closeDatabase() {
    try {
        db.close();
        console.log('数据库连接已关闭');
    } catch (error) {
        console.error('关闭数据库连接失败:', error);
    }
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
    cleanRoomOldMessages,
    cleanRoomAllMessages,
    getAllRoomsWithMessages,
    isPermanentRoom,
    cleanPermanentRoomsOldMessages,
    cleanTemporaryRoomsAllMessages,
    analyzeDatabase,
    closeDatabase,
    ValidationError,
    DatabaseError
};
