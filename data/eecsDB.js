const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

/** 內部：非同步讀檔，若失敗回傳預設結構 */
async function _readDB() {
    try {
        const raw = await fs.readFile(DB_PATH, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        return { users: {}, tickets: {} };
    }
}

/** 內部：非同步寫入 db.json */
async function _writeDB(data) {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/** 檢查使用者是否已存在 */
async function existsUser(id) {
    const db = await _readDB();
    return Object.prototype.hasOwnProperty.call(db.users, id);
}

/** 新增使用者；若已存在，就丟錯誤 */
async function createUser(id, password) {
    const db = await _readDB();
    if (db.users[id]) {
        throw new Error('EXISTS');
    }
    db.users[id] = { password, blocked: false };
    db.tickets[id] = [];
    await _writeDB(db);
}

/** 取得使用者資訊；若無此使用者回傳 null */
async function getUser(id) {
    const db = await _readDB();
    return db.users[id] || null;
}

/** 封鎖帳號 */
async function blockUser(id) {
    const db = await _readDB();
    if (!db.users[id]) throw new Error('NOT_FOUND');
    db.users[id].blocked = true;
    await _writeDB(db);
}

/** 解鎖帳號 */
async function unblockUser(id) {
    const db = await _readDB();
    if (!db.users[id]) throw new Error('NOT_FOUND');
    db.users[id].blocked = false;
    await _writeDB(db);
}

/** 取得該使用者的訂票陣列；若無資料則回傳空陣列 */
async function getTickets(userId) {
    const db = await _readDB();
    return db.tickets[userId] || [];
}

/** 新增一筆訂票 */
async function addTicket(userId, ticketObj) {
    const db = await _readDB();
    if (!db.users[userId]) throw new Error('NOT_FOUND_USER');
    if (!db.tickets[userId]) db.tickets[userId] = [];
    db.tickets[userId].push(ticketObj);
    await _writeDB(db);
}

/** 刪除指定 index 的訂票 */
async function removeTicket(userId, index) {
    const db = await _readDB();
    if (!db.users[userId]) throw new Error('NOT_FOUND_USER');
    if (!Array.isArray(db.tickets[userId]) || index < 0 || index >= db.tickets[userId].length) {
        throw new Error('INDEX_INVALID');
    }
    db.tickets[userId].splice(index, 1);
    await _writeDB(db);
}

/** 取得所有使用者與訂票資料（for 管理員） */
async function getAllTickets() {
    const db = await _readDB();
    return { users: db.users, tickets: db.tickets };
}

module.exports = {
    existsUser,
    createUser,
    getUser,
    blockUser,
    unblockUser,
    getTickets,
    addTicket,
    removeTicket,
    getAllTickets
};