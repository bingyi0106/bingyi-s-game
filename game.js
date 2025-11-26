import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { 
    getDatabase, ref, push, get, query, orderByChild, limitToLast 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
// 確保你的 questions.js 檔案存在且內容正確
import { questionPool } from "./questions.js";

// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyAbtY6rbLP96hLZzrCZlfQf-ON9LuH3pGM",
  authDomain: "leaderboardapp-a29f3.firebaseapp.com",
  databaseURL: "https://leaderboardapp-a29f3-default-rtdb.firebaseio.com",
  projectId: "leaderboardapp-a29f3",
  storageBucket: "leaderboardapp-a29f3.firebasestorage.app",
  messagingSenderId: "308303699906",
  appId: "1:308303699906:web:d6505c7431f1798a0d405b"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM 元素快取
const els = {
    intro: document.getElementById("intro-container"),
    quiz: document.getElementById("quiz-container"),
    scoreContainer: document.getElementById("score-container"),
    question: document.getElementById("question"),
    options: Array.from(document.querySelectorAll(".option")), 
    optionTexts: document.querySelectorAll(".option-text"),
    timer: document.getElementById("timer"),
    scoreValue: document.getElementById("score-value"),
    dateTime: document.getElementById("date-time"),
    startBtn: document.getElementById("start-button"),
    backLinkContainer: document.querySelector(".back-link-container")
};

// 遊戲狀態
let gameState = {
    questions: [],
    currentIndex: 0,
    score: 0,
    timer: null,
    timeLeft: 20,
    startTime: 0,
    isAnswering: false
};

// --- 初始化：確保一開始只顯示開場畫面 ---
function init() {
    els.intro.style.display = "block";
    els.quiz.style.display = "none";
    els.scoreContainer.style.display = "none";
    els.timer.style.display = "none"; // 一開始隱藏計時器
}
init(); // 執行初始化

// --- 事件監聽 ---
els.startBtn.addEventListener("click", startGame);
els.options.forEach((option, index) => {
    option.addEventListener("click", () => selectOption(index));
});

// --- Firebase 邏輯 ---
function submitScore(playerName, score) {
    push(ref(db, "scores"), { 
        name: playerName, 
        score: Number(score),
        timestamp: Date.now() 
    }).then(() => {
        console.log("分數已送出");
    }).catch((err) => {
        console.error("送出失敗", err);
        alert("分數上傳失敗，請檢查網路");
    });
}

function getLeaderboard(callback) {
    const topScoresQuery = query(
        ref(db, "scores"), 
        orderByChild("score"), 
        limitToLast(5) // 取前 5 名即可
    );

    get(topScoresQuery).then((snapshot) => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }
        const data = [];
        snapshot.forEach((childSnapshot) => {
            data.push(childSnapshot.val());
        });
        data.reverse(); 
        callback(data);
    }).catch((err) => {
        console.error("取得排行榜失敗", err);
        callback([]);
    });
}

// --- 遊戲邏輯 ---
function startGame() {
    // 1. 切換畫面顯示
    els.intro.style.display = "none";
    els.scoreContainer.style.display = "none";
    els.quiz.style.display = "flex"; // 使用 flex 讓內容居中
    els.timer.style.display = "block"; // 顯示計時器
    
    // 2. 重置遊戲狀態
    gameState.questions = getRandomQuestions(questionPool, 10);
    gameState.currentIndex = 0;
    gameState.score = 0;
    gameState.isAnswering = false;
    
    // 3. 載入第一題
    loadQuestion();
}

function getRandomQuestions(pool, num) {
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, num);
}

function loadQuestion() {
    if (gameState.currentIndex >= gameState.questions.length) {
        displayScore();
        return;
    }

    const currentQ = gameState.questions[gameState.currentIndex];
    els.question.textContent = currentQ.question;
    
    for (let i = 0; i < els.optionTexts.length; i++) {
        if (currentQ.options[i]) {
            els.optionTexts[i].textContent = currentQ.options[i];
            els.options[i].style.display = "flex";
        } else {
            els.options[i].style.display = "none";
        }
    }
    
    gameState.startTime = Date.now();
    gameState.timeLeft = 20;
    gameState.isAnswering = false;
    
    updateTimerDisplay();
    if (gameState.timer) clearInterval(gameState.timer);
    gameState.timer = setInterval(updateTimer, 1000);
}

function updateTimer() {
    gameState.timeLeft--;
    updateTimerDisplay();
    if (gameState.timeLeft <= 0) {
        clearInterval(gameState.timer);
        nextQuestion();
    }
}

function updateTimerDisplay() {
    els.timer.textContent = `剩餘時間：${gameState.timeLeft} 秒`;
    if(gameState.timeLeft <= 5) els.timer.style.color = "#ef4444";
    else els.timer.style.color = "#8b5cf6";
}

function selectOption(optionIndex) {
    if (gameState.isAnswering || gameState.timeLeft <= 0) return;
    
    gameState.isAnswering = true;
    clearInterval(gameState.timer);
    
    const currentQ = gameState.questions[gameState.currentIndex];
    const elapsedTime = (Date.now() - gameState.startTime) / 1000;
    const selectedEl = els.options[optionIndex];

    if (optionIndex === currentQ.answer) {
        selectedEl.style.borderColor = "#10b981";
        selectedEl.style.boxShadow = "0 0 15px rgba(16, 185, 129, 0.5)";
        if (elapsedTime <= 5) gameState.score += 10;
        else if (elapsedTime <= 10) gameState.score += 5;
    } else {
        selectedEl.style.borderColor = "#ef4444";
        selectedEl.style.boxShadow = "0 0 15px rgba(239, 68, 68, 0.5)";
    }
    
    setTimeout(() => {
        selectedEl.style.borderColor = ""; 
        selectedEl.style.boxShadow = "";
        nextQuestion();
    }, 500);
}

function nextQuestion() {
    gameState.currentIndex++;
    loadQuestion();
}

function displayScore() {
    // 1. 切換畫面顯示
    els.intro.style.display = "none";
    els.quiz.style.display = "none";
    els.timer.style.display = "none"; // 隱藏計時器
    els.scoreContainer.style.display = "block";

    // 2. 更新分數
    els.scoreValue.textContent = gameState.score;
    
    // 3. 清理舊元素
    document.querySelector(".feedback")?.remove();
    document.querySelector(".name-input-group")?.remove();
    document.getElementById("leaderboard-container")?.remove();
    document.querySelector(".loading-msg")?.remove();

    // 4. 插入新元素
    const feedbackElement = createFeedback(gameState.score);
    els.scoreContainer.insertBefore(feedbackElement, els.dateTime);

    const now = new Date();
    els.dateTime.textContent = now.toLocaleString('zh-TW', { hour12: false });

    createInputSection();
}

// 輔助函式：產生評語元素
function createFeedback(score) {
    let text = "";
    let color = "#10b981"; // 預設綠色
    if (score < 40) { text = "菜就多練！"; color = "#ef4444"; }
    else if (score < 60) { text = "對加密貨幣有點概念喔！"; color = "#fbbf24"; }
    else if (score < 80) { text = "不錯不錯，快成為專家了！"; }
    else if (score < 100) { text = "太強了！只差一點點滿分！"; }
    else { text = "加密貨幣大師就是你！"; }

    const el = document.createElement("div");
    el.textContent = text;
    el.className = "feedback";
    el.style.color = color;
    return el;
}

function createInputSection() {
    const group = document.createElement("div");
    group.className = "name-input-group";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "輸入暱稱 (最多10字)";
    nameInput.maxLength = 10;
    
    const submitButton = document.createElement("button");
    submitButton.textContent = "提交分數";

    submitButton.onclick = () => {
        const playerName = nameInput.value.trim();
        if (!playerName) { alert("請輸入暱稱"); return; }
        
        group.style.display = "none";
        submitScore(playerName, gameState.score);
        
        const loadingMsg = document.createElement("div");
        loadingMsg.textContent = "讀取排行榜中...";
        loadingMsg.className = "loading-msg";
        loadingMsg.style.color = "#cbd5e1";
        loadingMsg.style.marginBottom = "2rem";
        els.scoreContainer.insertBefore(loadingMsg, els.backLinkContainer);

        getLeaderboard((arr) => {
            loadingMsg.remove();
            showLeaderboard(arr);
        });
    };

    group.appendChild(nameInput);
    group.appendChild(submitButton);
    els.scoreContainer.insertBefore(group, els.backLinkContainer);
}

function showLeaderboard(arr) {
    const container = document.createElement("div");
    container.id = "leaderboard-container";
    
    const title = document.createElement("h3");
    title.textContent = "排行榜 Top 5";
    container.appendChild(title);

    const list = document.createElement("div");
    
    if (arr.length === 0) {
        list.innerHTML = "<div style='text-align:center; color:#cbd5e1; padding: 20px;'>目前尚無資料，快來當第一名！</div>";
    } else {
        arr.forEach((entry, index) => {
            const item = document.createElement("div");
            item.className = "list-item";
            if(index === 0) item.style.color = "#fbbf24";
            else if(index === 1) item.style.color = "#b45309"; 
            else if(index === 2) item.style.color = "#b45309"; 
            item.innerHTML = `<span>${index + 1}. ${entry.name}</span> <span>${entry.score} 分</span>`;
            list.appendChild(item);
        });
    }
    container.appendChild(list);
    els.scoreContainer.insertBefore(container, els.backLinkContainer);
}

// 滑鼠跟隨特效
const handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    document.documentElement.style.setProperty('--mouse-x', x + '%');
    document.documentElement.style.setProperty('--mouse-y', y + '%');
};
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('touchmove', (e) => {
    if(e.touches.length > 0) handleMouseMove(e.touches[0]);
});
