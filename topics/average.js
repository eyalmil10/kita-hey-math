/*
  Average (Grade 5) mini-game
  Difficulty concept:
  - Start with 1 number ("מה הממוצע של 1?")
  - After each correct answer, increase amount of numbers up to 6.
  - Timer depends on level (numbersCount):
    seconds = 60 + (level-1) * 10
  - After submit/timeout: show correct/incorrect + explanation + Next.
  - Stats stored via window.NeomiMath.
*/

const TOPIC_ID = "average";

const ui = {
  timeLeft: document.getElementById("timeLeft"),
  questionTitle: document.getElementById("questionTitle"),
  answerInput: document.getElementById("answerInput"),
  submitBtn: document.getElementById("submitBtn"),
  giveUpBtn: document.getElementById("giveUpBtn"),
  feedbackCard: document.getElementById("feedbackCard"),
  feedbackBox: document.getElementById("feedbackBox"),
  confetti: document.getElementById("confetti"),
  explanation: document.getElementById("explanation"),
  nextBtn: document.getElementById("nextBtn"),
  qCounter: document.getElementById("qCounter"),
  levelLabel: document.getElementById("levelLabel"),
  levelProgress: document.getElementById("levelProgress"),
  scoreBadge: document.getElementById("scoreBadge")
};

let current = null;
let timerId = null;
let seconds = 60;
let questionIndex = 0;
let level = 1; // number count: 1..6

function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function numbersLabel(n){
  if(n === 1) return "1 מספר";
  return `${n} מספרים`;
}

function updateLevelUI(){
  const max = 6;
  const pct = ((level - 1) / (max - 1)) * 100;
  if(ui.levelLabel) ui.levelLabel.textContent = `רמה: ${numbersLabel(level)}`;
  if(ui.levelProgress) ui.levelProgress.style.width = `${pct}%`;
}

function playResultAnimation(ok){
  if(!ui.feedbackBox) return;
  ui.feedbackBox.classList.remove("success","fail");
  void ui.feedbackBox.offsetWidth;
  ui.feedbackBox.classList.add(ok ? "success" : "fail");
  if(ok) burstConfetti();
}

function burstConfetti(){
  if(!ui.confetti) return;
  ui.confetti.innerHTML = "";
  const colors = ["#7c5cff", "#15d6ff", "#33d17a", "#ffcc00", "#ffffff"];
  const count = 14;
  for(let i = 0; i < count; i++){
    const p = document.createElement("i");
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${Math.random() * 10}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 80}ms`;
    p.style.transform = `translateY(-10px) rotate(${Math.random() * 120}deg)`;
    ui.confetti.appendChild(p);
  }
  window.setTimeout(() => {
    if(ui.confetti) ui.confetti.innerHTML = "";
  }, 800);
}

function updateStatsBadges(){
  const stats = window.NeomiMath?.getStats(TOPIC_ID) || { asked: 0, correct: 0 };
  ui.scoreBadge.textContent = `נכונות: ${stats.correct}/${stats.asked}`;
}

function setMode(mode){
  const showFeedback = mode === "feedback";
  ui.feedbackCard.style.display = showFeedback ? "block" : "none";

  ui.answerInput.disabled = showFeedback;
  ui.submitBtn.disabled = showFeedback;
  ui.giveUpBtn.disabled = showFeedback;

  if(!showFeedback){
    ui.answerInput.value = "";
    ui.answerInput.focus();
  }
}

function timeForLevel(levelNumberCount){
  return 60 + (levelNumberCount - 1) * 10;
}

function startTimer(){
  stopTimer();
  seconds = timeForLevel(level);
  ui.timeLeft.textContent = String(seconds);

  timerId = window.setInterval(() => {
    seconds -= 1;
    ui.timeLeft.textContent = String(seconds);

    if(seconds <= 0){
      stopTimer();
      finishQuestion({ userAnswer: null, reason: "timeout" });
    }
  }, 1000);
}

function stopTimer(){
  if(timerId){
    clearInterval(timerId);
    timerId = null;
  }
}

function generateQuestion(){
  // Keep things friendly and mostly integers.
  // We'll craft questions where the average is an integer.
  const count = level;

  // Pick a target average first, then generate numbers around it.
  const avg = randInt(1, 12);

  const nums = [];
  if(count === 1){
    nums.push(avg);
  }else{
    // Create count-1 numbers near avg, then set last number so sum matches avg*count.
    let sum = 0;
    for(let i = 0; i < count - 1; i++){
      const n = Math.max(0, avg + randInt(-3, 3));
      nums.push(n);
      sum += n;
    }
    const last = avg * count - sum;
    nums.push(last);

    // If last got too large/negative, retry with safer range.
    if(last < 0 || last > 30){
      // fallback: all numbers equal avg
      return { nums: Array(count).fill(avg), avg };
    }
  }

  // Shuffle a bit (except count 1)
  for(let i = nums.length - 1; i > 0; i--){
    const j = randInt(0, i);
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }

  return { nums, avg };
}

function startNewQuestion(){
  questionIndex += 1;
  current = generateQuestion();

  window.NeomiMath?.bumpAsked(TOPIC_ID);

  ui.qCounter.textContent = `שאלה ${questionIndex}`;
  updateLevelUI();
  updateStatsBadges();

  if(level === 1){
    ui.questionTitle.textContent = `מה הממוצע של ${current.nums[0]}?`;
  }else{
    ui.questionTitle.textContent = `מה הממוצע של המספרים: ${current.nums.join(", ")} ?`;
  }

  setMode("question");
  startTimer();
}

function normalizeAnswer(value){
  if(value == null) return null;
  const s = String(value).trim().replace(",", ".");
  if(s === "") return null;
  const n = Number(s);
  if(!Number.isFinite(n)) return null;
  return n;
}

function finishQuestion({ userAnswer, reason }){
  stopTimer();

  const ans = normalizeAnswer(userAnswer);
  const correct = current.avg;

  // Accept exact integer match. (We currently generate integer averages.)
  const isCorrect = ans !== null && Math.abs(ans - correct) < 1e-9;

  if(isCorrect){
    window.NeomiMath?.bumpCorrect(TOPIC_ID);
    level = Math.min(6, level + 1);
  }else{
    // Friendly step down when wrong/timeout.
    level = Math.max(1, level - 1);
  }

  updateLevelUI();

  updateStatsBadges();

  let headline = "";
  if(reason === "timeout") headline = "הזמן נגמר!";

  const okText = isCorrect ? "תשובה נכונה!" : "לא בדיוק.";

  ui.feedbackBox.innerHTML = `
    <div style="display:grid; gap: 6px;">
      <div><strong>${headline ? headline + " " : ""}${okText}</strong></div>
      <div class="muted">התשובה שלך: <strong>${ans === null ? "(אין)" : ans}</strong></div>
      <div class="muted">התשובה הנכונה: <strong>${correct}</strong></div>
    </div>
  `;

  playResultAnimation(isCorrect);

  const sum = current.nums.reduce((a,b) => a + b, 0);
  const expl = [];
  expl.push(`שלב 1: מחברים את כל המספרים. סכום = <strong>${sum}</strong>.`);
  expl.push(`שלב 2: מחלקים במספר המספרים (${current.nums.length}).`);
  expl.push(`<strong>${sum} ÷ ${current.nums.length} = ${correct}</strong>`);
  expl.push(`כלל חשוב: הממוצע נמצא “באמצע” — הוא לא חייב להיות אחד מהמספרים, אבל אצלנו כרגע הוא יוצא מספר שלם כדי שיהיה קל.`);
  ui.explanation.innerHTML = expl.map(s => `<div>${s}</div>`).join("");

  setMode("feedback");
}

ui.submitBtn.addEventListener("click", () => {
  finishQuestion({ userAnswer: ui.answerInput.value, reason: "submit" });
});

ui.giveUpBtn.addEventListener("click", () => {
  finishQuestion({ userAnswer: null, reason: "giveup" });
});

ui.nextBtn.addEventListener("click", () => {
  startNewQuestion();
});

ui.answerInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter" && !ui.submitBtn.disabled){
    ui.submitBtn.click();
  }
});

// Init
startNewQuestion();
