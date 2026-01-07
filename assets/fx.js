// Fullscreen celebration FX (confetti burst)
// No external libs. Creates a temporary overlay for ~2 seconds.

(function(){
  const FX = {};

  function rand(min, max){
    return Math.random() * (max - min) + min;
  }

  function makePiece(colors){
    const el = document.createElement("i");
    el.className = "fx-piece";

    const size = rand(6, 14);
    el.style.width = `${size}px`;
    el.style.height = `${rand(10, 22)}px`;

    el.style.left = `${rand(0, 100)}vw`;
    el.style.top = `${rand(-10, -2)}vh`;

    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.opacity = String(rand(0.75, 1));

    // Motion vars used by CSS keyframes
    el.style.setProperty("--dx", `${rand(-40, 40)}vw`);
    el.style.setProperty("--rot", `${rand(180, 720)}deg`);
    el.style.setProperty("--dur", `${rand(1.6, 2.2)}s`);
    el.style.setProperty("--delay", `${rand(0, 0.15)}s`);

    // Some pieces look like ribbons
    if(Math.random() < 0.25){
      el.style.borderRadius = "999px";
      el.style.height = `${rand(24, 48)}px`;
      el.style.width = `${rand(4, 8)}px`;
    }

    return el;
  }

  FX.fullscreenCelebrate = function({ durationMs = 2000 } = {}){
    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "fx-overlay";

    // Center applause (WhatsApp-like vibe)
    const applause = document.createElement("div");
    applause.className = "fx-applause";
    applause.innerHTML = `<div class="fx-emoji" aria-hidden="true">👏</div>`;
    overlay.appendChild(applause);

    const colors = [
      "#7c5cff", // purple
      "#15d6ff", // cyan
      "#33d17a", // green
      "#ffcc00", // yellow
      "#ff4fd8", // pink
      "#ffffff"  // white
    ];

    // Fill with many pieces for a dramatic effect
    const count = 140;
    for(let i = 0; i < count; i++){
      overlay.appendChild(makePiece(colors));
    }

    document.body.appendChild(overlay);

    // Fade out near the end
    const fadeAt = Math.max(0, durationMs - 350);
    window.setTimeout(() => {
      overlay.classList.add("out");
    }, fadeAt);

    // Remove
    window.setTimeout(() => {
      overlay.remove();
    }, durationMs);
  };

  window.NeomiFX = FX;
})();
