// Binds every input whose id matches a setting to chrome.storage.sync.
(async () => {
  const s = await chrome.storage.sync.get(KANA_DEFAULTS);
  const msg = document.getElementById("msg");
  const inputs = Object.keys(KANA_DEFAULTS).map((k) => document.getElementById(k)).filter(Boolean);
  const applyHue = (h) => document.documentElement.style.setProperty("--theme-h", h);
  let soundsOn = s.sounds;
  const sfx = (name) => soundsOn && window.__kanaSfx && window.__kanaSfx(name);
  applyHue(s.themeHue);

  for (const input of inputs) {
    if (input.type === "checkbox") input.checked = !!s[input.id];
    else input.value = s[input.id];
    input.addEventListener("change", save);
  }
  const hue = document.getElementById("themeHue");
  if (hue) hue.addEventListener("input", () => applyHue(hue.value));
  for (const b of document.querySelectorAll("button")) b.addEventListener("click", () => sfx("CLICK"));

  async function save(e) {
    const out = {};
    for (const input of inputs) {
      if (input.type === "checkbox") out[input.id] = input.checked;
      else {
        const v = Math.round(Number(input.value));
        const min = Number(input.min) || 0, max = Number(input.max) || 1440;
        out[input.id] = Math.min(max, Math.max(min, Number.isFinite(v) && input.value !== "" ? v : KANA_DEFAULTS[input.id]));
        input.value = out[input.id];
      }
    }
    const on = ["hiragana", "katakana", "kanji"].map((id) => document.getElementById(id)).filter(Boolean);
    if (on.length && !on.some((x) => x.checked)) {
      e.target.checked = true;
      msg.textContent = "Keep at least one of hiragana, katakana or kanji on.";
      msg.className = "msg err";
      sfx("ERROR");
      return;
    }
    soundsOn = out.sounds ?? soundsOn;
    await chrome.storage.sync.set(out);
    sfx("CLICK");
    msg.textContent = "Saved";
    msg.className = "msg";
    clearTimeout(save.t);
    save.t = setTimeout(() => (msg.textContent = ""), 1200);
  }

  // Kanji intro cards: each kanji gets one the first time it comes up.
  const seenCount = document.getElementById("seenCount");
  const resetSeen = document.getElementById("resetSeen");
  if (seenCount && resetSeen) {
    const showCount = async () => {
      const { kanjiSeen } = await chrome.storage.local.get({ kanjiSeen: [] });
      seenCount.textContent = `${kanjiSeen.length}`;
    };
    resetSeen.addEventListener("click", async () => { await chrome.storage.local.set({ kanjiSeen: [] }); showCount(); msg.textContent = "Intro cards will show again"; msg.className = "msg"; });
    showCount();
  }
})();
