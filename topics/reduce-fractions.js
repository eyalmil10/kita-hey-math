/*
  Reduce Fractions (Grade 5) mini-game
  Concept:
  - Start easy and increase difficulty after correct answers.
  - Player writes the reduced fraction in a/b form.
  - Timer: 30 seconds at level 0, +10 seconds per level.

  Levels (0..3):
  0: reduce by 2 or 3, small denominators, obvious.
  1: reduce by 4/5/6, still small.
  2: composite factors (e.g., reduce 12/20 -> 3/5), include larger but still friendly numbers.
  3: trickier: multiple common factors, but final still simple.

  Stats stored via window.NeomiMath.
*/

const TOPIC_ID = "reduce-fractions";

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
let level = 0;

const LEVEL_LABELS = ["קל", "קל+", "בינוני", "בינוני+"];

function gcd(a, b){
  a = Math.abs(a); b = Math.abs(b);
  while(b !== 0){
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr){
  return arr[randInt(0, arr.length - 1)];
}

function timeForLevel(lvl){
  return 60 + lvl * 10;
}

function updateStatsBadges(){
  const stats = window.NeomiMath?.getStats(TOPIC_ID) || { asked: 0, correct: 0 };
  ui.scoreBadge.textContent = `נכונות: ${stats.correct}/${stats.asked}`;
}

function updateLevelUI(){
  const max = 3;
  const pct = (Math.min(level, max) / max) * 100;
  ui.levelLabel.textContent = `רמה: ${LEVEL_LABELS[Math.min(level, LEVEL_LABELS.length - 1)]}`;
  ui.levelProgress.style.width = `${pct}%`;
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

function stopTimer(){
  if(timerId){
    clearInterval(timerId);
    timerId = null;
  }
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

function playResultAnimation(ok){
  ui.feedbackBox.classList.remove("success","fail");
  void ui.feedbackBox.offsetWidth;
  ui.feedbackBox.classList.add(ok ? "success" : "fail");
  if(ok) burstConfetti();
}

function parseFraction(text){
  if(text == null) return null;
  const s = String(text).trim();
  if(!s) return null;

  const m = s.match(/^\s*(-?\d+)\s*\/\s*(-?\d+)\s*$/);
  if(!m) return null;

  const n = Number(m[1]);
  const d = Number(m[2]);
  if(!Number.isInteger(n) || !Number.isInteger(d) || d === 0) return null;

  // keep denominator positive
  if(d < 0) return { n: -n, d: -d };
  return { n, d };
}

function reduceFraction(n, d){
  const g = gcd(n, d);
  return { n: n / g, d: d / g, g };
}

function formatFrac(f){
  return `${f.n}/${f.d}`;
}

function generateQuestion(){
  // Choose a base reduced fraction, then multiply numerator+denominator by factor k.
  // This guarantees it can be reduced.

  // Keep final answers simple
  const basePool = [
    { n: 1, d: 2 },
    { n: 1, d: 3 },
    { n: 2, d: 3 },
    { n: 1, d: 4 },
    { n: 3, d: 4 },
    { n: 2, d: 5 },
    { n: 3, d: 5 },
    { n: 4, d: 5 },
    { n: 3, d: 8 }
  ];

  const base = pick(basePool);

  let kChoices;
  if(level === 0) kChoices = [2, 3];
  else if(level === 1) kChoices = [2, 3, 4, 5, 6];
  else if(level === 2) kChoices = [4, 6, 8, 9, 10, 12];
  else kChoices = [6, 8, 10, 12, 14, 15];

  const k = pick(kChoices);

  const n = base.n * k;
  const d = base.d * k;

  // keep numbers not too large
  if(d > 120 || n > 120){
    return { base, k: 2, n: base.n * 2, d: base.d * 2 };
  }

  return { base, k, n, d };
}

function startNewQuestion(){
  questionIndex += 1;
  current = generateQuestion();

  window.NeomiMath?.bumpAsked(TOPIC_ID);

  ui.qCounter.textContent = `שאלה ${questionIndex}`;
  updateStatsBadges();
  updateLevelUI();

  ui.questionTitle.textContent = `צמצמי את השבר: ${current.n}/${current.d}`;

  setMode("question");
  startTimer();
}

function finishQuestion({ userAnswer, reason }){
  stopTimer();

  const user = parseFraction(userAnswer);
  const reduced = reduceFraction(current.n, current.d);

  const correctFrac = { n: reduced.n, d: reduced.d };

  let isCorrect = false;
  if(user){
    const uRed = reduceFraction(user.n, user.d);
    // require fully reduced and exactly equal
    isCorrect = (uRed.g === 1) && (uRed.n === correctFrac.n) && (uRed.d === correctFrac.d);
  }

  // Sound feedback
  if(isCorrect){
    window.NeomiSFX?.success?.();
    window.NeomiFX?.fullscreenCelebrate?.({ durationMs: 2000 });
  }
  else window.NeomiSFX?.fail?.();

  if(isCorrect){
    window.NeomiMath?.bumpCorrect(TOPIC_ID);
    level = Math.min(3, level + 1);
  }else{
    level = Math.max(0, level - 1);
  }

  updateStatsBadges();
  updateLevelUI();

  let headline = "";
  if(reason === "timeout") headline = "הזמן נגמר!";

  const okText = isCorrect ? "תשובה נכונה!" : "לא בדיוק.";
  ui.feedbackBox.innerHTML = `
    <div style="display:grid; gap: 6px;">
      <div><strong>${headline ? headline + " " : ""}${okText}</strong></div>
      ${isCorrect ? `<div style="font-size: 18px;"><strong>👏 וואו! יפה!</strong></div>` : ""}
      <div class="muted">השבר היה: <strong>${current.n}/${current.d}</strong></div>
      <div class="muted">התשובה שלך: <strong>${user ? formatFrac(user) : "(לא בפורמט a/b)"}</strong></div>
      <div class="muted">התשובה המצומצמת: <strong>${formatFrac(correctFrac)}</strong></div>
    </div>
  `;

  playResultAnimation(isCorrect);

  const expl = [];
  expl.push(`מחפשים מספר שמחלק גם את המונה וגם את המחנה.`);
  expl.push(`כאן אפשר לחלק ב-<strong>${reduced.g}</strong>:`);
  expl.push(`<strong>${current.n} ÷ ${reduced.g} = ${correctFrac.n}</strong> וגם <strong>${current.d} ÷ ${reduced.g} = ${correctFrac.d}</strong>`);
  expl.push(`אחרי הצמצום, לא נשאר מספר גדול מ-1 שמחלק את שניהם — לכן זה מצומצם עד הסוף.`);
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
