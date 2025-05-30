// server.js
// ---------------------------------------------
// 安裝套件：
//   npm install express body-parser
//   （若未安裝過，請先 npm init -y，然後上面指令）
// ---------------------------------------------
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// 載入我們剛剛寫好的 eecsDB.js
const db = require('./data/eecsDB');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/register', async (req, res) => {
    const { id, password } = req.body;
    if (!id || !password) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
    }
    try {
        await db.createUser(id, password);
        return res.json({ success: true });
    } catch (err) {
        if (err.message === 'EXISTS') {
            return res.status(409).json({ error: 'EXISTS' });
        }
        return res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

app.post('/api/login', async (req, res) => {
    const { id, password } = req.body;
    if (!id || !password) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
    }
    const user = await db.getUser(id);
    if (!user) {
        return res.status(404).json({ error: 'NOT_FOUND' });
    }
    if (user.blocked) {
        return res.status(403).json({ error: 'BLOCKED' });
    }
    if (user.password !== password) {
        return res.status(401).json({ error: 'WRONG_PASSWORD' });
    }
    const isAdmin = id === 'A123456789';
    return res.json({ success: true, isAdmin });
});

async function authMiddleware(req, res, next) {
    const userId = req.header('x-user-id');
    if (!userId) {
        return res.status(401).json({ error: 'NO_USER_ID' });
    }
    const user = await db.getUser(userId);
    if (!user) {
        return res.status(404).json({ error: 'NOT_FOUND' });
    }
    if (user.blocked) {
        return res.status(403).json({ error: 'BLOCKED' });
    }
    req.userId = userId;
    next();
}

app.get('/api/tickets', authMiddleware, async (req, res) => {
    const userId = req.userId;
    const tickets = await db.getTickets(userId);
    return res.json({ tickets });
});

app.post('/api/tickets', authMiddleware, async (req, res) => {
    const userId = req.userId;
    const { from, to, date, time, price, pay, seatClass } = req.body;
    if (!from || !to || !date || !time || !price || !pay || !seatClass) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
    }
    const existing = await db.getTickets(userId);
    if (existing.length >= 5) {
        return res.status(403).json({ error: 'MAX_5_TICKETS' });
    }
    const ticketObj = { from, to, date, time, price, pay, seatClass };
    try {
        await db.addTicket(userId, ticketObj);
        return res.json({ success: true });
    } catch (err) {
        if (err.message === 'NOT_FOUND_USER') {
            return res.status(404).json({ error: 'NOT_FOUND_USER' });
        }
        return res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

app.delete('/api/tickets/:index', authMiddleware, async (req, res) => {
    const userId = req.userId;
    const index = parseInt(req.params.index, 10);
    if (isNaN(index)) {
        return res.status(400).json({ error: 'INVALID_INDEX' });
    }
    try {
        await db.removeTicket(userId, index);
        return res.json({ success: true });
    } catch (err) {
        if (err.message === 'NOT_FOUND_USER') {
            return res.status(404).json({ error: 'NOT_FOUND_USER' });
        }
        if (err.message === 'INDEX_INVALID') {
            return res.status(400).json({ error: 'INDEX_INVALID' });
        }
        return res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

app.get('/api/allTickets', authMiddleware, async (req, res) => {
    const userId = req.userId;
    if (userId !== 'A123456789') {
        return res.status(403).json({ error: 'FORBIDDEN' });
    }
    const allData = await db.getAllTickets();
    return res.json({ users: allData.users, tickets: allData.tickets });
});

app.post('/api/blockUser', authMiddleware, async (req, res) => {
    const userId = req.userId;
    const { id, action } = req.body;
    if (userId !== 'A123456789') {
        return res.status(403).json({ error: 'FORBIDDEN' });
    }
    if (id === 'A123456789') {
        return res.status(403).json({ error: 'CANNOT_BLOCK_SELF' });
    }
    if (!id || !action) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
    }
    try {
        if (action === 'block') {
            await db.blockUser(id);
        } else if (action === 'unblock') {
            await db.unblockUser(id);
        } else {
            return res.status(400).json({ error: 'INVALID_ACTION' });
        }
        return res.json({ success: true });
    } catch (err) {
        if (err.message === 'NOT_FOUND') {
            return res.status(404).json({ error: 'NOT_FOUND_USER' });
        }
        return res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

function eecs_admin(req) {
    const token = req.query.token;
    return token === process.env.ADMIN_TOKEN;
}

app.get("/download", (req, res) => {
    if (!eecs_admin(req)) {
        return res.status(403).send("權限不足：你不是管理員");
    }

    const filePath = path.join(__dirname, "data", "db.json");

    if (!fs.existsSync(filePath)) {
        return res.status(404).send("檔案不存在");
    }

    res.setHeader("Content-Disposition", "attachment; filename=db.json");
    res.setHeader("Content-Type", "application/json");
    fs.createReadStream(filePath).pipe(res);
});

app.post('/submit', express.json(), (req, res) => {
    const { date, time } = req.body;
    if (!date || !time) {
        return res.status(400).json({ error: '缺少日期或時間' });
    }
    const now = new Date();
    const inputDateTime = new Date(`${date}T${time}:00`);
    if (inputDateTime < now) {
        return res.status(400).json({ error: '不能選擇過去的日期時間' });
    }
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

