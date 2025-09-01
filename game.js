import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, push, get } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { questionPool } from "./questions.js";

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

function submitScore(playerName, score) {
  push(ref(db, "scores"), { name: playerName, score });
  console.log("已送出分數:", playerName, score);
}

function getLeaderboard(callback) {
  get(ref(db, "scores")).then((snapshot) => {
    const data = snapshot.val() || {};
    const arr = Object.values(data);
    arr.sort((a, b) => b.score - a.score);
    callback(arr);
  }).catch((err) => {
    console.error("取得排行榜失敗", err);
    callback([]);
  });
}

let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let timer;
let timeLeft = 20;
let startTime;

const introContainer = document.getElementById("intro-container");
const quizContainer = document.getElementById("quiz-container");
const questionElement = document.getElementById("question");
const optionElements = Array.from(document.querySelectorAll(".option"));
const timerElement = document.getElementById("timer");
const scoreContainer = document.getElementById("score-container");

document.getElementById("start-button").addEventListener("click", startGame);
optionElements.forEach((option, index) => {
  option.addEventListener("click", () => selectOption(index));
});

function startGame() {
  introContainer.style.display = "none";
  quizContainer.style.display = "block";
  questions = getRandomQuestions(questionPool, 10);
  currentQuestionIndex = 0;
  score = 0;
  loadQuestion();
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function getRandomQuestions(pool, num) {
  const shuffled = [...pool];
  shuffle(shuffled);
  return shuffled.slice(0, num);
}

function loadQuestion() {
  const currentQuestion = questions[currentQuestionIndex];
  questionElement.textContent = currentQuestion.question;
  const optionTexts = document.querySelectorAll(".option-text");
  for (let i = 0; i < optionTexts.length; i++) {
    optionTexts[i].textContent = currentQuestion.options[i];
  }
  startTime = Date.now();
  timeLeft = 20;
  timerElement.textContent = `剩餘時間：${timeLeft} 秒`;
  timer = setInterval(updateTimer, 1000);
}

function updateTimer() {
  timeLeft--;
  timerElement.textContent = `剩餘時間：${timeLeft} 秒`;
  if (timeLeft <= 0) {
    clearInterval(timer);
    nextQuestion();
  }
}

function selectOption(optionIndex) {
  clearInterval(timer);
  const currentQuestion = questions[currentQuestionIndex];
  const elapsedTime = (Date.now() - startTime) / 1000;

  if (optionIndex === currentQuestion.answer) {
    if (elapsedTime <= 5) {
  score += 10;
    } else if (elapsedTime <= 10) {
      score += 5
    }
  }
  nextQuestion();
}

function nextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < questions.length) {
    loadQuestion();
  } else {
    displayScore();
  }
}

function displayScore() {
  quizContainer.style.display = "none";
  timerElement.style.display = "none";
  scoreContainer.style.display = "block";

  document.getElementById("score-value").textContent = score;

  let feedback = "";
  if (score < 40) feedback = "菜就多練";
  else if (score < 60) feedback = "有點東西";
  else if (score < 80) feedback = "還可以";
  else if (score < 100) feedback = "牛逼差一點";
  else feedback = "到資二甲領取麥香一杯";

  const feedbackElement = document.createElement("div");
  feedbackElement.textContent = feedback;
  feedbackElement.classList.add("feedback");
  scoreContainer.appendChild(feedbackElement);

  const dateTimeElement = document.getElementById("date-time");
  const currentDate = new Date();
  const formattedDateTime = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, "0")}/${String(currentDate.getDate()).padStart(2, "0")} ${String(currentDate.getHours()).padStart(2, "0")}:${String(currentDate.getMinutes()).padStart(2, "0")}`;
  dateTimeElement.textContent = formattedDateTime;

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "輸入姓名以顯示排行榜";
  nameInput.classList.add("name-input");

  const submitButton = document.createElement("button");
  submitButton.textContent = "提交分數";
  submitButton.classList.add("submit-button");
  submitButton.addEventListener("click", () => {
    const playerName = nameInput.value.trim();
    if (!playerName) {
      alert("請輸入名稱");
      return;
    }
    submitScore(playerName, score);
    nameInput.style.display = "none";
    submitButton.style.display = "none";

    const successMessage = document.createElement("div");
    successMessage.textContent = "分數已提交，感謝您的參與！請稍待片刻取得排行榜資料";
    successMessage.classList.add("success-message");
    scoreContainer.appendChild(successMessage);

    getLeaderboard((arr) => {
      showLeaderboard(arr);
    });
  });

  scoreContainer.appendChild(nameInput);
  scoreContainer.appendChild(submitButton);
}

function showLeaderboard(arr) {
  let leaderboardContainer = document.getElementById("leaderboard-container");
  if (!leaderboardContainer) {
    leaderboardContainer = document.createElement("div");
    leaderboardContainer.id = "leaderboard-container";
    scoreContainer.appendChild(leaderboardContainer);
  }
  leaderboardContainer.innerHTML = "";

  const title = document.createElement("h3");
  title.textContent = "排行榜";
  leaderboardContainer.appendChild(title);

  const listContainer = document.createElement("div");
  listContainer.className = "list-container";
  leaderboardContainer.appendChild(listContainer);

  arr.slice(0, 10).forEach((entry, index) => {
    const item = document.createElement("div");
    item.className = "list-item";

    const namePart = document.createElement("span");
    namePart.textContent = `${index + 1}. ${entry.name}`;

    const scorePart = document.createElement("span");
    scorePart.textContent = `${entry.score} 分`;

    item.appendChild(namePart);
    item.appendChild(scorePart);
    listContainer.appendChild(item);
  });

  if (arr.length === 0) {
    const noDataMessage = document.createElement("div");
    noDataMessage.textContent = "目前尚無排行榜資料";
    noDataMessage.className = "no-data";
    listContainer.appendChild(noDataMessage);
  }
}
