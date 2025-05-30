// public/分離資料.js
// ---------------------------------------------
// 假設前端會把登入成功後的 userId 存到 localStorage.key = 'currentUser'
// 每次呼叫 API 都會從 localStorage 拿出來並放到「X-User-Id」header
// ---------------------------------------------

// DOM 物件
const userIdInput = document.getElementById("userId");
const userPwInput = document.getElementById("userPw");
const usernameSpan = document.getElementById("username");
const result = document.getElementById("result");
const userPanel = document.getElementById("userPanel");
const adminPanel = document.getElementById("adminPanel");

// 每次呼叫 API 都要帶的 header
function getAuthHeader() {
    const currentUser = localStorage.getItem("currentUser");
    return currentUser ? { "X-User-Id": currentUser } : {};
}

// 身分證驗證（和原本一樣）
function validateTaiwanID(id) {
    if (!/^[A-Z][12][0-9]{8}$/.test(id)) {
        return false;
    }
    const letters = 'ABCDEFGHJKLMNPQRSTUVXYWZIO';
    const letterIndex = letters.indexOf(id[0]);
    if (letterIndex === -1) return false;

    const n1 = Math.floor((letterIndex + 10) / 10);
    const n2 = (letterIndex + 10) % 10;
    const weights = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1];

    let sum = n1 * weights[0] + n2 * weights[1];
    for (let i = 1; i <= 9; i++) {
        sum += parseInt(id[i]) * weights[i + 1];
    }

    return sum % 10 === 0;
}

/** 1. 註冊（呼叫 POST /api/register） */
async function register() {
    const id = userIdInput.value.trim().toUpperCase();
    const pw = userPwInput.value.trim();
    const pwPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{6,}$/;

    if (!id || !pw) {
        return alert("請輸入身分證字號與密碼");
    }
    if (!validateTaiwanID(id)) {
        return alert("請輸入有效的中華民國身分證字號");
    }
    if (!pwPattern.test(pw)) {
        return alert("密碼需至少6字，包含英文與數字，僅限英文與數字");
    }

    try {
        const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, password: pw })
        });
        if (res.ok) {
            alert("註冊成功，請登入");
            // 清空輸入框
            userIdInput.value = "";
            userPwInput.value = "";
        } else if (res.status === 409) {
            const data = await res.json();
            if (data.error === "EXISTS") {
                alert("帳號已存在");
            } else {
                alert("註冊失敗");
            }
        } else {
            alert("註冊失敗");
        }
    } catch (err) {
        console.error(err);
        alert("網路錯誤，請稍後再試");
    }
}

/** 2. 登入（呼叫 POST /api/login） */
async function login() {
    const id = userIdInput.value.trim().toUpperCase();
    const pw = userPwInput.value.trim();

    if (!id || !pw) return alert("請輸入帳號與密碼");
    if (id.length < 5 || pw.length < 6) return alert("帳號與密碼至少需 6 個字元");

    try {
        const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, password: pw })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            // 將當前使用者存到 localStorage
            localStorage.setItem("currentUser", id);
            usernameSpan.textContent = id;
            alert("登入成功");

            // 切換畫面
            document.querySelector('.operation').classList.remove('hidden');
            document.querySelector('section.login').classList.add('hidden');
            document.getElementById('fromSelect').value = '台北';
            document.getElementById('toSelect').value = '台北';

            const dateInput = document.getElementById('dateInput');
            const timeInput = document.getElementById('timeInput');
            setupDateTimeInputs(dateInput, timeInput);

            // 如果是 admin，顯示管理者介面
            if (data.isAdmin) {
                userPanel.style.display = "none";
                result.innerHTML = "";
                showAdminPanel(); // 直接載入管理員介面
            } else {
                userPanel.style.display = "block";
                adminPanel.style.display = "none";
            }
        } else {
            // 根據後端回傳錯誤顯示
            if (data.error === "NOT_FOUND" || data.error === "WRONG_PASSWORD") {
                alert("帳號或密碼錯誤");
            } else if (data.error === "BLOCKED") {
                alert("此帳號已被封鎖，無法登入");
            } else {
                alert("登入失敗");
            }
        }
    } catch (err) {
        console.error(err);
        alert("網路錯誤，請稍後再試");
    }
}

/** 設定「日期只能從今天開始」以及「同日不可選過去時間」的 input 行為 */
function setupDateTimeInputs(dateInput, timeInput) {
    function getTodayStr() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    function getCurrentTimeStr() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mi = String(now.getMinutes()).padStart(2, '0');
        return `${hh}:${mi}`;
    }

    const today = getTodayStr();
    dateInput.min = today;
    dateInput.value = today;

    function updateTimeLimit() {
        const currentTime = getCurrentTimeStr();
        if (dateInput.value === today) {
            timeInput.min = currentTime;
            if (timeInput.value < currentTime) {
                timeInput.value = currentTime;
            }
        } else {
            timeInput.min = '';
        }
    }

    timeInput.value = getCurrentTimeStr();
    updateTimeLimit();

    dateInput.addEventListener('change', () => {
        updateTimeLimit();
    });
    timeInput.addEventListener('change', () => {
        if (dateInput.value === today) {
            const currentTime = getCurrentTimeStr();
            if (timeInput.value < currentTime) {
                alert('不能選擇過去的時間！');
                timeInput.value = currentTime;
            }
        }
    });
}

/** 3. 登出 */
function logout() {
    localStorage.removeItem("currentUser");
    document.querySelector('.operation').classList.add('hidden');
    document.querySelector('section.login').classList.remove('hidden');
    usernameSpan.textContent = '';
    result.innerHTML = '';
    userPanel.style.display = 'none';
    adminPanel.style.display = 'none';
}

/** 4. 查詢車次 (純前端運算，跟後端無關) */
async function querySchedule() {
    const from = document.getElementById('fromSelect').value;
    const to = document.getElementById('toSelect').value;
    const date = document.getElementById('dateInput').value;
    const time = document.getElementById('timeInput').value;

    if (!date || !time) return alert("請選擇日期與時間");
    if (from === to) return alert("起訖站不可相同");

    // 後端驗證日期時間
    try {
        const response = await fetch('/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, time })
        });

        const result = await response.json();

        if (!response.ok) {
            return alert(result.error || '驗證失敗');
        }
    } catch (error) {
        return alert('伺服器連線錯誤');
    }

    // 後端驗證通過後，執行原本查詢邏輯

    const kmMap = {
        '台北': 0, '板橋': 5, '桃園': 30, '新竹': 70,
        '台中': 140, '嘉義': 220, '台南': 300, '高雄': 360
    };
    const stations = Object.keys(kmMap);
    const speed = 360 / 210;
    const trainCount = 15;
    const trainInterval = 30;
    const restTime = 30;
    const userMinutes = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
    const basePrice = Math.floor(Math.abs(kmMap[from] - kmMap[to]) * 0.7 + 50);

    const trains = Array.from({ length: trainCount }, (_, i) => ({
        id: `T${100 + i}`,
        depMinutes: i * trainInterval,
        direction: 'south',
    }));
    const matchedTrains = [];

    trains.forEach(train => {
        let direction = train.direction;
        let baseTime = train.depMinutes;
        for (let loop = 0; loop < 6; loop++) {
            const stationList = direction === 'south' ? stations : [...stations].reverse();

            for (let i = 0; i < stationList.length; i++) {
                const station = stationList[i];
                const dist = Math.abs(kmMap[station] - kmMap[stationList[0]]);
                const travelMinutes = Math.round(dist / speed);
                const arriveTime = baseTime + travelMinutes;

                if (arriveTime > 1440 * 2) break;

                if (station === from) {
                    for (let j = i + 1; j < stationList.length; j++) {
                        if (stationList[j] === to && arriveTime >= userMinutes) {
                            const distToDest = Math.abs(kmMap[stationList[j]] - kmMap[stationList[0]]);
                            const arriveDestTime = baseTime + Math.round(distToDest / speed);
                            const payId = `pay_${train.id}_${loop}`;
                            const classId = `class_${train.id}_${loop}`;
                            const priceId = `price_${train.id}_${loop}`;
                            matchedTrains.push({
                                id: train.id,
                                departTime: arriveTime,
                                arriveDestTime,
                                from,
                                to,
                                date,
                                basePrice,
                                payId,
                                classId,
                                priceId
                            });
                            return;
                        }
                    }
                }
            }

            baseTime += 210 + restTime;
            direction = direction === 'south' ? 'north' : 'south';
            if (baseTime > 1440 * 2) break;
        }
    });

    if (matchedTrains.length === 0) {
        result.innerHTML = `
      <div class="no-train-box">
        <h4>📅 ${date} 從 <span class="station">${from}</span> 到 <span class="station">${to}</span> 可搭乘車次：</h4>
        <p class="no-train-text">🚫 今日已無符合條件的車次</p>
      </div>`;
        return;
    }

    matchedTrains.sort((a, b) => a.departTime - b.departTime);
    let html = `
    <div class="no-train-box">
      <h4>📅 ${date} 從 <span class="station">${from}</span> 到 <span class="station">${to}</span> 可搭乘車次：</h4>
    </div>`;

    const formatTime = minutes => {
        const isNextDay = minutes >= 1440;
        const timeInDay = minutes % 1440;
        const hh = String(Math.floor(timeInDay / 60)).padStart(2, '0');
        const mm = String(timeInDay % 60).padStart(2, '0');
        return `${hh}:${mm}${isNextDay ? '（隔日）' : ''}`;
    };

    matchedTrains.forEach(train => {
        const departStr = formatTime(train.departTime);
        const arriveStr = formatTime(train.arriveDestTime);
        const timeRange = `${departStr} → ${arriveStr}`;

        html += `
      <div class="booking-row showlist">
        <h4>🚆 車次 ${train.id} - 時間：${timeRange}</h4>
        <label>
          <select class="pay-list" id="${train.classId}" onchange="updatePrice('${train.priceId}', ${train.basePrice}, '${train.classId}')">
            <option>一般座</option>
            <option>商務座</option>
            <option>貴賓座</option>
          </select>
        </label>
        <label>
          <select class="pay-list" id="${train.payId}">
            <option>Line Pay</option><option>Apple Pay</option>
            <option>信用卡</option><option>街口支付</option>
            <option>支付寶</option><option>微信支付</option>
          </select>
        </label>
        <label class="price-label">票價：$<span id="${train.priceId}">${train.basePrice}</span></label><br>
        <button class="booking"
          onclick="bookTicket('${train.from}','${train.to}','${train.date}','${timeRange}', '${train.classId}', '${train.priceId}', '${train.payId}'); scrollToTop()">
          訂票
        </button>
      </div>`;
    });

    result.innerHTML = html;
}

/** 5. 點「訂票」按鈕時，呼叫 /api/tickets，將該筆票資訊存入後端 */
async function bookTicket(from, to, date, time, classSelectId, priceSpanId, paySelectId) {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return alert("請先登入");

    // 先從 select id 拿到實際值
    const seatClass = document.getElementById(classSelectId).value;
    const price = parseInt(document.getElementById(priceSpanId).textContent);
    const payMethod = document.getElementById(paySelectId).value;

    try {
        const res = await fetch("/api/tickets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader()
            },
            body: JSON.stringify({ from, to, date, time, price, pay: payMethod, seatClass })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            alert(`✅ 訂票成功！\n${date} ${time} ${from}→${to} $${price}\n座位：${seatClass}\n付款方式：${payMethod}`);
            result.innerHTML = "";
        } else if (data.error === "MAX_5_TICKETS") {
            alert("最多可訂 5 張票");
        } else {
            alert("訂票失敗");
        }
    } catch (err) {
        console.error(err);
        alert("網路錯誤，請稍後再試");
    }
}

/** 6. 我的車票：呼叫 GET /api/tickets，渲染訂票清單 */
async function cancelTicket() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return alert("請先登入");

    try {
        const res = await fetch("/api/tickets", {
            method: "GET",
            headers: getAuthHeader()
        });
        const data = await res.json();
        if (res.ok) {
            const list = data.tickets;
            if (!list.length) {
                result.innerHTML = `<div class="no-train-box"><h4>尚無車票</h4></div>`;
                return;
            }
            let html = `<div class="no-train-box"><h4>我的車票(請在訂購後三分鐘再領票避免異常)</h4></div><ul>`;
            list.forEach((t, i) => {
                html += `<li class="my-ticks">
          ${t.date} ${t.time} ${t.from}→${t.to} $${t.price} ${t.seatClass} (${t.pay}) 
          <button onclick="removeTicket(${i}); scrollToTop()">取消</button>
          <button class="pickup-btn" onclick="pickTicket(${i}) ; takeTicket(${i});scrollToTop()">取票</button>
        </li>`;
            });
            html += `</ul>`;
            result.innerHTML = html;
        } else {
            alert("無法取得訂票資料");
        }
    } catch (err) {
        console.error(err);
        alert("網路錯誤，請稍後再試");
    }
}

/** 7. 取消某張票：呼叫 DELETE /api/tickets/:index */
async function removeTicket(index) {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return alert("請先登入");

    try {
        const res = await fetch(`/api/tickets/${index}`, {
            method: "DELETE",
            headers: getAuthHeader()
        });
        const data = await res.json();
        if (res.ok && data.success) {
            alert("您已取消該張車票或者將該張車票提領");
            cancelTicket(); // 重新渲染
        } else {
            alert("刪除失敗");
        }
    } catch (err) {
        console.error(err);
        alert("網路錯誤，請稍後再試");
    }
}

/** 8. 取票（畫票 + 下載）—程式碼如原本，只是在畫完票後不必再從 local JS 陣列讀，因為取票前已經做「GET /api/tickets」並渲染到畫面上。 */
const image_code = new Image();
image_code.src = "圖片/image.png";

function pickTicket(index) {
    // 先呼叫後端，取得最新的清單，再渲染第 index 筆
    fetch("/api/tickets", {
        method: "GET",
        headers: getAuthHeader()
    })
        .then(res => res.json())
        .then(data => {
            if (!data.tickets) return alert("無法取票");
            const list = data.tickets;
            if (index < 0 || index >= list.length) {
                return alert("車票索引錯誤");
            }
            const ticket = list[index];
            alert(`您已成功取票：\n${ticket.date} ${ticket.time} ${ticket.from}→${ticket.to} ${ticket.seatClass} (${ticket.pay})`);
            if (!image_code.complete) {
                image_code.onload = () => {
                    drawTicket(ticket);
                    downloadCanvasImage();
                };
            } else {
                drawTicket(ticket);
                downloadCanvasImage();
            }
        })
        .catch(err => {
            console.error(err);
            alert("網路錯誤，請稍後再試");
        });
}

function drawTicket(ticket) {
    const canvas = document.getElementById("ticketCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.style.display = 'none'; // 或改成 block 要顯示
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#fdf6e3";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

    ctx.fillStyle = "#000";
    ctx.font = "bold 18px '微軟正黑體', sans-serif";
    ctx.fillText("我沒有醉管理局", 20, 30);
    ctx.font = "16px '微軟正黑體', sans-serif";
    ctx.fillText("車票 Ticket", 20, 55);

    ctx.font = "bold 22px '微軟正黑體', sans-serif";
    ctx.fillText(`${ticket.from} → ${ticket.to}`, 20, 90);

    ctx.font = "16px '微軟正黑體', sans-serif";
    ctx.fillText(`日期: ${ticket.date}`, 20, 120);
    ctx.fillText(`時間: ${ticket.time}`, 20, 145);

    ctx.fillText(`座位: ${ticket.seatClass}`, 220, 120);
    ctx.fillText(`付款: ${ticket.pay}`, 220, 145);

    ctx.font = "bold 24px '微軟正黑體', sans-serif";
    ctx.fillText(`NT$ ${ticket.price}`, 220, 90);

    if (image_code && image_code.complete && !image_code.error) {
        const imgWidth = 60;
        const imgHeight = 60;
        const x = canvas.width - imgWidth - 20;
        const y = 20;
        ctx.drawImage(image_code, x, y, imgWidth, imgHeight);
    }
}

function downloadCanvasImage() {
    const canvas = document.getElementById("ticketCanvas");
    if (!canvas) return;

    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ticket.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    });
}

function takeTicket(index) {
    // 取完票之後就從後端把這筆記錄刪除
    removeTicket(index);
}

/** 9. 客製化「管理員介面」：
 *    先呼叫 GET /api/allTickets，然後渲染所有使用者 & 訂票清單
 *    同時「刪除某筆訂票」時改呼叫 /api/tickets/:index（但要告訴 server 這是哪個 user）
 *    plus：封鎖／解鎖 帳號，呼叫 POST /api/blockUser
 */
async function showAdminPanel() {
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser !== "A123456789") return;

    try {
        const res = await fetch("/api/allTickets", {
            method: "GET",
            headers: getAuthHeader()
        });
        const data = await res.json();
        if (!res.ok) {
            return alert("無法取得所有訂票資料");
        }
        // data 格式：{ users: { id: { password, blocked }, ... }, tickets: { id: [ ... ], ... } }
        const allUsers = data.users;
        const allTickets = data.tickets;

        let html = `<div class="admin-control"><h3>🔧 管理者介面 - 所有使用者訂票資訊：</h3>`;

        for (const id in allUsers) {
            html += `<div class="user-block"><h4>👤 使用者：${id} 
        ${allUsers[id].blocked ? '<span style="color:red;">(已封鎖)</span>' : ''}</h4>
        <button onclick="toggleBlockUser('${id}', ${allUsers[id].blocked})" style="margin-bottom:8px;">
          ${allUsers[id].blocked ? '🔓 解鎖' : '🔒 封鎖'}
        </button>
        <ul class="admin-ticket-list">`;

            if (!allTickets[id] || !allTickets[id].length) {
                html += "<li>無任何訂票記錄</li>";
            } else {
                allTickets[id].forEach((t, index) => {
                    const ticketText = `${t.date} ${t.time}｜${t.from}→${t.to}｜$${t.price}（${t.seatClass}｜${t.pay}）`;
                    html += `<li>
            ${ticketText}
            <button onclick="deleteSingleTicket('${id}', ${index})" class="tiny-delete-btn">❌ 刪除</button>
          </li>`;
                });
            }

            html += `</ul></div>`;
        }

        html += `</div>
      <div style="margin-top: 20px;">
        <button onclick="logout();scrollToTop()" class="logout-btn">登出</button>
      </div>`;

        adminPanel.style.display = "block";
        adminPanel.innerHTML = html;

    } catch (err) {
        console.error(err);
        alert("網路錯誤，請稍後再試");
    }
}

/** 管理員：刪除某位使用者的某張票 -> 先取得該使用者完整訂票數，再依序找 index 刪除
 *  這邊後端 API 只能刪「自己帳號」底下的訂票，所以刪除他人訂票需呼叫兩個 API：
 *    1. blockUser 把 admin 自己「暫時視為該使用者」(workaround)，
 *    2. DELETE /api/tickets/:index
 *  其實比較直接的做法：在後端加個 admin-only route 可以直接刪別人 ticket，但為了範例就以「最快能動」的方式示範：
 *  技巧：呼叫 POST /api/blockUser 並把 header X-User-Id 人為改成要刪除的 id，然後呼叫 DELETE /api/tickets/:index。
 */
async function deleteSingleTicket(userId, ticketIndex) {
    // 先把 admin 的 X-User-Id 改成「目標 userId」，然後刪該 userId 底下 index
    // 這種做法只是示範效果，生產環境要自己設計 administration route 會更乾淨
    try {
        // 1. 用 /api/blockUser 把當前 header.userId 設為 userId
        //    其實這邊不需要真的封鎖，只是想把 header: X-User-Id 變成 userId
        //    所以呼叫 blockUser(action='unblock') 才不會真正把他封鎖
        await fetch("/api/blockUser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-User-Id": "A123456789"
            },
            body: JSON.stringify({ id: userId, action: "unblock" })
        });

        // 2. 呼叫 DELETE /api/tickets/:ticketIndex 時，暫時把 X-User-Id 改成 userId
        const res = await fetch(`/api/tickets/${ticketIndex}`, {
            method: "DELETE",
            headers: { "X-User-Id": userId }
        });
        const data = await res.json();
        if (res.ok && data.success) {
            alert(`已刪除 ${userId} 的第 ${ticketIndex + 1} 張票`);
            showAdminPanel();
        } else {
            alert("刪除失敗：" + (data.error || ''));
        }
    } catch (err) {
        console.error(err);
        alert("網路錯誤，請稍後再試");
    }
}

/** 管理員：封鎖 / 解鎖 使用者 */
async function toggleBlockUser(id, currentlyBlocked) {
    // 呼叫 POST /api/blockUser
    const action = currentlyBlocked ? 'unblock' : 'block';
    try {
        const res = await fetch("/api/blockUser", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-User-Id": "A123456789"
            },
            body: JSON.stringify({ id, action })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            alert(`${action === 'block' ? '已封鎖' : '已解鎖'} ${id}`);
            showAdminPanel();
        } else {
            alert("操作失敗");
        }
    } catch (err) {
        console.error(err);
        alert("網路錯誤，請稍後再試");
    }
}

/** 其餘輔助函式 */
function updatePrice(priceSpanId, basePrice, classSelectId) {
    const seatClass = document.getElementById(classSelectId).value;
    let newPrice = basePrice;
    if (seatClass === "商務座") newPrice = Math.round(basePrice * 1.3);
    if (seatClass === "貴賓座") newPrice = Math.round(basePrice * 1.7);
    document.getElementById(priceSpanId).textContent = newPrice;
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 一旦頁面載入，就把 currentUser（若有）直接顯示在 username，並把畫面切到 operation
window.addEventListener('DOMContentLoaded', () => {
    const cu = localStorage.getItem("currentUser");
    if (cu) {
        usernameSpan.textContent = cu;
        document.querySelector('.operation').classList.remove('hidden');
        document.querySelector('section.login').classList.add('hidden');
        // 如果就是 admin，直接進管理員介面
        if (cu === 'A123456789') {
            userPanel.style.display = "none";
            result.innerHTML = "";
            showAdminPanel();
        } else {
            userPanel.style.display = "block";
        }
    }
});

function toggleMenu() {
    const menu = document.getElementById("mobileMenu");
    menu.classList.toggle("hidden");
}

function eecs_admin(req) {
    const token = req.query.token;
    return token === process.env.ADMIN_TOKEN;
}

