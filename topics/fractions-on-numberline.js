/*
  Fractions on a Number Line (range multiple-choice)
  Player chooses where a fraction is located:
    - between n and n+1 (e.g., 0–1, 1–2, 3–4)
    - or "גדול מ-4"

  Difficulty / levels (0..3):
  0: proper fractions between 0 and 1
  1: improper fractions between 1 and 4 (still not too big)
  2: mix incl. endpoints near integers and some >4
  3: harder: larger numerators/denominators, must reason by division

  Timer: 60 + level*10 seconds.
  Stats stored via window.NeomiMath.
*/

const TOPIC_ID = "fractions-on-numberline";

const ui = {
  timeLeft: document.getElementById("timeLeft"),
  questionTitle: document.getElementById("questionTitle"),
  choices: document.getElementById("choices"),
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

function randInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr){
  return arr[randInt(0, arr.length - 1)];
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

function simplify(n, d){
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
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
      finishQuestion({ chosenKey: null, reason: "timeout" });
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

function setMode(mode){
  const showFeedback = mode === "feedback";
  ui.feedbackCard.style.display = showFeedback ? "block" : "none";
}

function rangeKeyForValue(val){
  // Returns one of: "0-1","1-2","2-3","3-4","gt4"
  if(val > 4) return "gt4";
  if(val >= 3 && val <= 4) return "3-4";
  if(val >= 2 && val < 3) return "2-3";
  if(val >= 1 && val < 2) return "1-2";
  return "0-1";
}

function labelForKey(key){
  switch(key){
    case "0-1": return "בין 0 ל-1";
    case "1-2": return "בין 1 ל-2";
    case "2-3": return "בין 2 ל-3";
    case "3-4": return "בין 3 ל-4";
    case "gt4": return "גדול מ-4";
    default: return key;
  }
}

function generateFraction(){
  // We generate a simplified fraction and its value.
  // Keep denominators friendly; harder levels allow slightly bigger.
  let dPool;
  if(level === 0) dPool = [2,3,4,5,6,8,10,12];
  else if(level === 1) dPool = [2,3,4,5,6,8,10,12];
  else if(level === 2) dPool = [2,3,4,5,6,7,8,9,10,12];
  else dPool = [3,4,5,6,7,8,9,10,12,14,15,16];

  const d = pick(dPool);

  let n;
  if(level === 0){
    n = randInt(1, d - 1); // proper fraction 0..1
  }else if(level === 1){
    // between 1 and 4
    n = randInt(d + 1, d * 4 - 1);
  }else if(level === 2){
    // mix, incl some > 4
    const mode = pick(["mid", "gt4"]);
    if(mode === "gt4") n = randInt(d * 5, d * 7 - 1);
    else n = randInt(1, d * 4 - 1);
  }else{
    // harder: allow up to ~8
    const mode = pick(["mid", "gt4"]);
    if(mode === "gt4") n = randInt(d * 5, d * 9 - 1);
    else n = randInt(1, d * 4 - 1);
  }

  const f = simplify(n, d);
  const value = f.n / f.d;

  return { ...f, value };
}

function buildChoices(correctKey){
  // Need 4 options. Always between integers, as requested.
  // We will sample from a fixed ordered set and ensure correct included.
  const all = ["0-1","1-2","2-3","3-4","gt4"];

  // Build without duplicates.
  const set = new Set([correctKey]);

  // Bias distractors near the correct range to make it a bit educational.
  const neighbors = {
    "0-1": ["1-2","2-3","gt4","3-4"],
    "1-2": ["0-1","2-3","3-4","gt4"],
    "2-3": ["1-2","3-4","0-1","gt4"],
    "3-4": ["2-3","1-2","gt4","0-1"],
    "gt4": ["3-4","2-3","1-2","0-1"]
  };

  for(const k of (neighbors[correctKey] || all)){
    if(set.size >= 4) break;
    set.add(k);
  }

  // In the rare case we still don't have 4
  for(const k of all){
    if(set.size >= 4) break;
    set.add(k);
  }

  // Shuffle
  const arr = Array.from(set);
  for(let i = arr.length - 1; i > 0; i--){
    const j = randInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.slice(0, 4);
}

function renderChoices(choiceKeys){
  ui.choices.innerHTML = "";

  for(const key of choiceKeys){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.style.width = "100%";
    btn.style.textAlign = "center";
    btn.textContent = labelForKey(key);
    btn.addEventListener("click", () => finishQuestion({ chosenKey: key, reason: "choose" }));
    ui.choices.appendChild(btn);
  }
}

function startNewQuestion(){
  questionIndex += 1;
  current = generateFraction();

  window.NeomiMath?.bumpAsked(TOPIC_ID);

  ui.qCounter.textContent = `שאלה ${questionIndex}`;
  updateStatsBadges();
  updateLevelUI();

  ui.questionTitle.textContent = `איפה נמצא השבר ${current.n}/${current.d} ?`;

  const correctKey = rangeKeyForValue(current.value);
  const choiceKeys = buildChoices(correctKey);
  current.correctKey = correctKey;
  current.choiceKeys = choiceKeys;

  setMode("question");
  renderChoices(choiceKeys);
  startTimer();
}

function finishQuestion({ chosenKey, reason }){
  stopTimer();

  const correctKey = current.correctKey;
  const isCorrect = chosenKey !== null && chosenKey === correctKey;

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
      ${isCorrect ? `<div style="font-size: 18px;"><strong>👏 בול במקום!</strong></div>` : ""}
      <div class="muted">השבר: <strong>${current.n}/${current.d}</strong></div>
      <div class="muted">התשובה שלך: <strong>${chosenKey ? labelForKey(chosenKey) : "(אין)"}</strong></div>
      <div class="muted">התשובה הנכונה: <strong>${labelForKey(correctKey)}</strong></div>
    </div>
  `;

  playResultAnimation(isCorrect);

  // Explanation: show the mixed number idea via division.
  const whole = Math.floor(current.n / current.d);
  const rem = current.n % current.d;

  const expl = [];
  expl.push(`מחלקים: <strong>${current.n} ÷ ${current.d}</strong>.`);

  if(rem === 0){
    expl.push(`יצא מספר שלם: <strong>${whole}</strong>. כלומר זה בדיוק על ${whole} בציר.`);
    // Map exact integer to the corresponding range (e.g., 2 is between 2-3 by our buckets)
    expl.push(`כשזה בדיוק מספר שלם, הוא נמצא על הנקודה של המספר השלם.`);
  }else{
    expl.push(`יוצא <strong>${whole}</strong> ועוד שארית <strong>${rem}</strong>. כלומר: <strong>${whole} ועוד ${rem}/${current.d}</strong>.`);
    expl.push(`אז השבר גדול מ-${whole} וקטן מ-${whole + 1} — לכן הוא ${labelForKey(correctKey)}.`);
  }

  if(correctKey === "gt4"){
    expl.push(`כי ${current.n}/${current.d} גדול מ-4.`);
  }

  ui.explanation.innerHTML = expl.map(s => `<div>${s}</div>`).join("");

  setMode("feedback");
}

ui.nextBtn.addEventListener("click", () => {
  startNewQuestion();
});

// Init
startNewQuestion();
