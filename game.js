import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { 
    getDatabase, ref, push, get, query, orderByChild, limitToLast 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
// 記得確認你的題庫檔名是 questions.js
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
    question: document.getElementById("question"),
    options: Array.from(document.querySelectorAll(".option")), 
    optionTexts: document.querySelectorAll(".option-text"),
    timer: document.getElementById("timer"),
    scoreContainer: document.getElementById("score-container"),
    scoreValue: document.getElementById("score-value"),
    dateTime: document.getElementById("date-time"),
    startBtn: document.getElementById("start-button"),
    backLink: document.getElementById("make-own") // 用來定位插入點
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

// --- 事件監聽 (Event Listeners) ---
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
        console.log("已送出分數:", playerName, score);
    }).catch((err) => {
        console.error("送出失敗", err);
        alert("分數上傳失敗，請檢查網路");
    });
}

function getLeaderboard(callback) {
    const topScoresQuery = query(
        ref(db, "scores"), 
        orderByChild("score"), 
        limitToLast(10) // 只抓前10名
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
        data.reverse(); // 因為 Firebase 是由小到大排，我們要反轉
        callback(data);
    }).catch((err) => {
        console.error("取得排行榜失敗", err);
        callback([]);
    });
}

// --- 遊戲邏輯 ---
function startGame() {
    els.intro.style.display = "none";
    els.scoreContainer.style.display = "none";
    els.quiz.style.display = "block";
    
    // 洗牌並取前10題
    gameState.questions = getRandomQuestions(questionPool, 10);
    gameState.currentIndex = 0;
    gameState.score = 0;
    gameState.isAnswering = false;
    
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
    
    // 填入選項
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

    // 答題回饋動畫
    if (optionIndex === currentQ.answer) {
        selectedEl.style.borderColor = "#10b981"; // 綠
        selectedEl.style.boxShadow = "0 0 15px rgba(16, 185, 129, 0.5)";
        
        if (elapsedTime <= 5) gameState.score += 10;
        else if (elapsedTime <= 10) gameState.score += 5;
    } else {
        selectedEl.style.borderColor = "#ef4444"; // 紅
        selectedEl.style.boxShadow = "0 0 15px rgba(239, 68, 68, 0.5)";
    }
    
    // 延遲跳轉
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
    els.quiz.style.display = "none";
    els.timer.style.display = "none";
    els.scoreContainer.style.display = "block";

    els.scoreValue.textContent = gameState.score;
    
    // 清除舊的動態元件
    const oldFeedback = document.querySelector(".feedback");
    if(oldFeedback) oldFeedback.remove();
    const oldInput = document.querySelector(".name-input-group");
    if(oldInput) oldInput.remove();
    const oldLeaderboard = document.getElementById("leaderboard-container");
    if(oldLeaderboard) oldLeaderboard.remove();

    // 評語邏輯
    let feedbackText = "";
    if (gameState.score < 40) feedbackText = "DP2A 覺得你還要再練練！";
    else if (gameState.score < 60) feedbackText = "對加密貨幣有點概念喔！";
    else if (gameState.score < 80) feedbackText = "不錯不錯，快成為專家了！";
    else if (gameState.score < 100) feedbackText = "太強了！只差一點點滿分！";
    else feedbackText = "DP2A 加密貨幣大師就是你！";

    const feedbackElement = document.createElement("div");
    feedbackElement.textContent = feedbackText;
    feedbackElement.className = "feedback";
    feedbackElement.style.textAlign = "center";
    feedbackElement.style.marginBottom = "20px";
    feedbackElement.style.color = "#10b981";
    feedbackElement.style.fontWeight = "bold";
    
    // 插入評語 (在日期之前)
    els.scoreContainer.insertBefore(feedbackElement, els.dateTime);

    // 更新時間
    const now = new Date();
    els.dateTime.textContent = now.toLocaleString('zh-TW', { hour12: false });

    // 建立輸入框
    createInputSection();
}

function createInputSection() {
    const group = document.createElement("div");
    group.className = "name-input-group";
    group.style.display = "flex";
    group.style.flexDirection = "column";
    group.style.alignItems = "center";
    group.style.gap = "15px";
    group.style.marginBottom = "20px";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "輸入姓名以顯示排行榜";
    
    const submitButton = document.createElement("button");
    submitButton.textContent = "提交分數";

    submitButton.onclick = () => {
        const playerName = nameInput.value.trim();
        if (!playerName) {
            alert("請輸入名稱");
            return;
        }
        
        group.style.display = "none"; // 隱藏輸入框
        submitScore(playerName, gameState.score);
        
        const loadingMsg = document.createElement("div");
        loadingMsg.textContent = "讀取排行榜中...";
        loadingMsg.style.textAlign = "center";
        loadingMsg.style.color = "#94a3b8";
        els.scoreContainer.insertBefore(loadingMsg, els.backLink);

        getLeaderboard((arr) => {
            loadingMsg.remove();
            showLeaderboard(arr);
        });
    };

    group.appendChild(nameInput);
    group.appendChild(submitButton);
    // 插入在 "回到官網" 連結之前
    els.scoreContainer.insertBefore(group, els.backLink);
}

function showLeaderboard(arr) {
    const container = document.createElement("div");
    container.id = "leaderboard-container";
    
    const title = document.createElement("h3");
    title.textContent = "排行榜";
    container.appendChild(title);

    const list = document.createElement("div");
    
    if (arr.length === 0) {
        list.innerHTML = "<div style='text-align:center; color:#94a3b8;'>目前尚無資料</div>";
    } else {
        arr.forEach((entry, index) => {
            const item = document.createElement("div");
            item.className = "list-item";
            
            // 前三名顏色
            if(index === 0) item.style.color = "#fbbf24";
            else if(index === 1) item.style.color = "#cbd5e1"; 
            else if(index === 2) item.style.color = "#b45309"; 

            item.innerHTML = `<span>${index + 1}. ${entry.name}</span> <span>${entry.score} 分</span>`;
            list.appendChild(item);
        });
    }

    container.appendChild(list);
    els.scoreContainer.insertBefore(container, els.backLink);
}

// --- 滑鼠跟隨特效 ---
document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    document.documentElement.style.setProperty('--mouse-x', x + '%');
    document.documentElement.style.setProperty('--mouse-y', y + '%');
});

// 手機版觸控支援
document.addEventListener('touchmove', (e) => {
    if(e.touches.length > 0) {
        const touch = e.touches[0];
        const x = (touch.clientX / window.innerWidth) * 100;
        const y = (touch.clientY / window.innerHeight) * 100;
        document.documentElement.style.setProperty('--mouse-x', x + '%');
        document.documentElement.style.setProperty('--mouse-y', y + '%');
    }
});
