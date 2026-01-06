/*
  Common Denominator (Grade 5) mini-game
  Rules:
  - Each question gives two fractions a/b and c/d.
  - Player must enter a common denominator (any valid common multiple of b and d).
  - Timer: 60 seconds per question.
  - After submit/timeout: show correct/incorrect + explanation + Next.
  - Stats are stored via window.NeomiMath (defined in ../app.js).
*/

const TOPIC_ID = "common-denominator";

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
let level = 0; // 0=very easy, 1=easy, 2=medium

const LEVEL_LABELS = [
  "קל מאוד",
  "קל",
  "בינוני"
];

function updateLevelUI(){
  const maxLevel = 2;
  const pct = (Math.min(level, maxLevel) / maxLevel) * 100;
  if(ui.levelLabel) ui.levelLabel.textContent = `רמה: ${LEVEL_LABELS[Math.min(level, LEVEL_LABELS.length - 1)]}`;
  if(ui.levelProgress) ui.levelProgress.style.width = `${pct}%`;
}

function playResultAnimation(ok){
  if(!ui.feedbackBox) return;

  ui.feedbackBox.classList.remove("success","fail");
  // Force restart of animation
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

function gcd(a, b){
  a = Math.abs(a); b = Math.abs(b);
  while(b !== 0){
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

function lcm(a, b){
  return Math.abs(a * b) / gcd(a, b);
}

function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr){
  return arr[randInt(0, arr.length - 1)];
}

function simplifyFraction(n, d){
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

function formatFrac(f){
  return `${f.n}/${f.d}`;
}

function generateQuestion(){
  // Difficulty model:
  // Level 0 (very easy): same denominators (LCM is one of them): (5,5), (2,2), (3,3), (4,4)...
  // Level 1 (easy): one denominator is a multiple of the other (LCM is the bigger): (2,4), (2,8), (3,6), (4,12), (5,10)...
  // Level 2 (medium): LCM is NOT one of the denominators but still small-ish: (4,10)->20, (6,10)->30, (8,12)->24, (6,8)->24
  // We intentionally avoid big combos like (24,9).

  /** @type {[number, number]} */
  let pair;

  if(level <= 0){
    const same = pick([2,3,4,5,6,8,10]);
    pair = [same, same];
  }else if(level === 1){
    // smaller -> bigger (multiple)
    const pairs = [
      [2,4],[2,6],[2,8],[2,10],
      [3,6],[3,9],[3,12],
      [4,8],[4,12],
      [5,10],
      [6,12]
    ];
    pair = pick(pairs);
  }else{
    const pairs = [
      [4,10], // 20
      [6,10], // 30
      [6,8],  // 24
      [8,12], // 24
      [9,6],  // 18
      [10,12] // 60 (still manageable)
    ];
    pair = pick(pairs);
  }

  const d1 = pair[0];
  const d2 = pair[1];

  const f1 = simplifyFraction(randInt(1, d1 - 1), d1);
  const f2 = simplifyFraction(randInt(1, d2 - 1), d2);

  const smallestCommon = lcm(f1.d, f2.d);

  // Provide example common denominators; keep them modest.
  const examples = [smallestCommon];
  if(smallestCommon * 2 <= 120) examples.push(smallestCommon * 2);
  if(smallestCommon * 3 <= 120) examples.push(smallestCommon * 3);
  while(examples.length < 3) examples.push(examples[examples.length - 1]);

  return {
    f1,
    f2,
    smallestCommon,
    examples
  };
}

function updateStatsBadges(){
  const stats = window.NeomiMath?.getStats(TOPIC_ID) || { asked: 0, correct: 0 };
  ui.scoreBadge.textContent = `נכונות: ${stats.correct}/${stats.asked}`;
}

function setMode(mode){
  // mode: "question" | "feedback"
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

function startTimer(){
  stopTimer();
  seconds = 60;
  ui.timeLeft.textContent = String(seconds);

  timerId = window.setInterval(() => {
    seconds -= 1;
    ui.timeLeft.textContent = String(seconds);

    if(seconds <= 0){
      stopTimer();
      finishQuestion({
        userAnswer: null,
        reason: "timeout"
      });
    }
  }, 1000);
}

function stopTimer(){
  if(timerId){
    clearInterval(timerId);
    timerId = null;
  }
}

function isValidCommonDenominator(answer, dA, dB){
  if(!Number.isInteger(answer) || answer <= 0) return false;
  return answer % dA === 0 && answer % dB === 0;
}

function startNewQuestion(){
  questionIndex += 1;
  current = generateQuestion();

  window.NeomiMath?.bumpAsked(TOPIC_ID);

  ui.qCounter.textContent = `שאלה ${questionIndex}`;
  updateLevelUI();
  updateStatsBadges();

  ui.questionTitle.textContent = `מצאי מכנה משותף: ${formatFrac(current.f1)} ו-${formatFrac(current.f2)}`;

  setMode("question");
  startTimer();
}

function finishQuestion({ userAnswer, reason }){
  stopTimer();

  const d1 = current.f1.d;
  const d2 = current.f2.d;

  const parsed = (userAnswer === null) ? null : Number(String(userAnswer).trim());
  const intAnswer = Number.isFinite(parsed) ? Math.trunc(parsed) : null;

  const valid = intAnswer !== null && isValidCommonDenominator(intAnswer, d1, d2);

  if(valid){
    window.NeomiMath?.bumpCorrect(TOPIC_ID);
    // Increase difficulty after a correct answer, up to level 2.
    level = Math.min(2, level + 1);
  }else{
    // Keep it friendly: if wrong/timeout, gently step down one level (but not below 0).
    level = Math.max(0, level - 1);
  }

  updateLevelUI();

  updateStatsBadges();

  const smallest = current.smallestCommon;
  const examples = current.examples;

  let headline = "";
  if(reason === "timeout"){
    headline = "הזמן נגמר!";
  }

  const okText = valid ? "תשובה נכונה!" : "לא בדיוק.";
  ui.feedbackBox.innerHTML = `
    <div style="display:grid; gap: 6px;">
      <div><strong>${headline ? headline + " " : ""}${okText}</strong></div>
      <div class="muted">השברים היו: <strong>${formatFrac(current.f1)}</strong> ו-<strong>${formatFrac(current.f2)}</strong></div>
      <div class="muted">התשובה שלך: <strong>${intAnswer === null ? "(אין)" : intAnswer}</strong></div>
    </div>
  `;

  playResultAnimation(valid);

  const expl = [];
  expl.push(`כדי שמספר יהיה <strong>מכנה משותף</strong> לשני השברים, הוא חייב להתחלק גם ב-${d1} וגם ב-${d2}.`);
  expl.push(`המכנה המשותף הקטן ביותר (מ.מ.מ) הוא <strong>${smallest}</strong>.`);

  if(level >= 2){
    expl.push(`ברמה הזאת, לפעמים המ.מ.מ <strong>לא</strong> שווה לאחד מהמכנים שבשאלה — וזה לגמרי תקין.`);
  }

  expl.push(`דוגמאות למכנים משותפים: <strong>${examples[0]}</strong>${examples[1] ? `, <strong>${examples[1]}</strong>` : ""}${examples[2] ? `, <strong>${examples[2]}</strong>` : ""}.`);

  if(!valid){
    expl.push(`דרך מהירה לבדוק: האם ${intAnswer === null ? "התשובה" : `<strong>${intAnswer}</strong>`} מתחלקת ב-${d1}? והאם היא מתחלקת ב-${d2}?`);
  }

  ui.explanation.innerHTML = expl.map(s => `<div>${s}</div>`).join("");

  setMode("feedback");
}

ui.submitBtn.addEventListener("click", () => {
  const value = ui.answerInput.value;
  finishQuestion({ userAnswer: value, reason: "submit" });
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
