// Tiny sound effects helper (no external audio files)
// Uses WebAudio; works after a user gesture (button click).

(function(){
  const SFX = {};

  let ctx = null;

  function getCtx(){
    if(ctx) return ctx;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if(!AudioContext) return null;
    ctx = new AudioContext();
    return ctx;
  }

  async function ensureRunning(){
    const c = getCtx();
    if(!c) return false;
    if(c.state === "suspended"){
      try{ await c.resume(); }catch{ /* ignore */ }
    }
    return c.state === "running";
  }

  function beep({ freq = 440, duration = 0.12, type = "sine", gain = 0.08, when = 0 } = {}){
    const c = getCtx();
    if(!c) return;

    const t0 = c.currentTime + when;

    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);

    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    o.connect(g);
    g.connect(c.destination);

    o.start(t0);
    o.stop(t0 + duration + 0.02);
  }

  // A short happy arpeggio
  SFX.success = async function(){
    const ok = await ensureRunning();
    if(!ok) return;

    beep({ freq: 523.25, duration: 0.09, type: "triangle", gain: 0.07, when: 0.00 }); // C5
    beep({ freq: 659.25, duration: 0.09, type: "triangle", gain: 0.07, when: 0.09 }); // E5
    beep({ freq: 783.99, duration: 0.12, type: "triangle", gain: 0.07, when: 0.18 }); // G5
  };

  // A softer "oops" two-tone
  SFX.fail = async function(){
    const ok = await ensureRunning();
    if(!ok) return;

    beep({ freq: 220, duration: 0.12, type: "sine", gain: 0.08, when: 0.00 });
    beep({ freq: 196, duration: 0.16, type: "sine", gain: 0.08, when: 0.12 });
  };

  window.NeomiSFX = SFX;
})();
