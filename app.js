const TOPICS = [
  {
    id: "common-denominator",
    title: "מכנה משותף",
    href: "./topics/common-denominator.html",
    level: "כיתה ה׳",
    duration: "5–10 דק׳"
  },
  {
    id: "reduce-fractions",
    title: "צימצום שברים",
    href: "./topics/reduce-fractions.html",
    level: "כיתה ה׳",
    duration: "5–10 דק׳"
  },
  {
    id: "average",
    title: "ממוצע",
    href: "./topics/average.html",
    level: "כיתה ה׳",
    duration: "5–10 דק׳"
  },
  {
    id: "fractions-on-numberline",
    title: "שברים על ציר המספרים",
    href: "./topics/fractions-on-numberline.html",
    level: "כיתה ה׳",
    duration: "5–10 דק׳"
  }
];

const STORAGE_KEY = "neomi-math-v1";

function loadProgress(){
  try{
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    // Backward compatible shape:
    // {
    //   topics: {
    //     [topicId]: { startedAt?: number, stats?: { asked: number, correct: number } }
    //   }
    // }
    if(raw && typeof raw === "object"){
      if(!raw.topics || typeof raw.topics !== "object"){
        // Migrate older shape where topic data was stored at root.
        const migrated = { topics: {} };
        for(const [k,v] of Object.entries(raw)){
          migrated.topics[k] = v;
        }
        return migrated;
      }
      return raw;
    }
    return { topics: {} };
  }catch{
    return { topics: {} };
  }
}

function saveProgress(progress){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function ensureTopic(progress, topicId){
  progress.topics ||= {};
  progress.topics[topicId] ||= {};
  progress.topics[topicId].stats ||= { asked: 0, correct: 0 };
  return progress.topics[topicId];
}

// Exposed for topic pages (game modules)
window.NeomiMath = {
  loadProgress,
  saveProgress,
  ensureTopic,
  bumpAsked(topicId){
    const p = loadProgress();
    const t = ensureTopic(p, topicId);
    t.stats.asked += 1;
    t.startedAt = t.startedAt || Date.now();
    saveProgress(p);
  },
  bumpCorrect(topicId){
    const p = loadProgress();
    const t = ensureTopic(p, topicId);
    t.stats.correct += 1;
    t.startedAt = t.startedAt || Date.now();
    saveProgress(p);
  },
  getStats(topicId){
    const p = loadProgress();
    const t = ensureTopic(p, topicId);
    return { ...t.stats };
  }
};

function openTopic(topic){
  const progress = loadProgress();
  const t = ensureTopic(progress, topic.id);
  t.startedAt = t.startedAt || Date.now();
  saveProgress(progress);

  // Navigate in the same tab
  window.location.href = topic.href;
}

function resetProgress(){
  localStorage.removeItem(STORAGE_KEY);
  render();
}

function render(){
  const grid = document.getElementById("topicsGrid");
  const progress = loadProgress();

  grid.innerHTML = "";

  for(const topic of TOPICS){
    const topicData = (progress.topics && progress.topics[topic.id]) ? progress.topics[topic.id] : {};
    const started = Boolean(topicData?.startedAt);
    const stats = topicData?.stats || { asked: 0, correct: 0 };

    const card = document.createElement("div");
    card.className = "topic";

    const title = document.createElement("h3");
    title.textContent = topic.title;

    const badges = document.createElement("div");
    badges.className = "badges";

    const b1 = document.createElement("span");
    b1.className = "badge";
    b1.textContent = topic.level;

    const b2 = document.createElement("span");
    b2.className = "badge";
    b2.textContent = `משך מומלץ: ${topic.duration}`;

    const b3 = document.createElement("span");
    b3.className = `badge ${started ? "ok" : "warn"}`;
    b3.textContent = started ? "התחלת" : "עוד לא התחלת";

  const b4 = document.createElement("span");
  b4.className = "badge";
  b4.textContent = `נשאלו: ${stats.asked} | נכונות: ${stats.correct}`;

  badges.append(b1,b2,b3,b4);

    const row = document.createElement("div");
    row.className = "row";

    const text = document.createElement("span");
    text.className = "muted";
  text.textContent = "נפתח באותו הטאב";

    const btn = document.createElement("button");
    btn.className = "btn";
    btn.type = "button";
    btn.textContent = "פתחי";
    btn.addEventListener("click", () => openTopic(topic));

    row.append(text, btn);

    card.append(title, badges, row);

    grid.append(card);
  }
}

document.getElementById("resetProgressBtn").addEventListener("click", resetProgress);
render();
