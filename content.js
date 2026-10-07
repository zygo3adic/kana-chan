if (!window.__kanaChanShow) {
  const DEFAULTS = { hiragana: true, katakana: true, dakuten: true, combos: true, questionCount: 5, sounds: true, themeHue: 227 };

  // Quiz-window layout on top of theme.css (which is shared with the popup and settings page).
  const QUIZ_CSS = `
    :host { all: initial; }
    [hidden] { display: none !important; }
    .wrap {
      position: fixed; right: 18px; top: 18px; z-index: 2147483647; width: 310px;
      font: 15px/1.4 var(--sans); color: var(--text);
      animation: pop .25s cubic-bezier(.2, 1.3, .5, 1);
    }
    @keyframes pop { from { transform: translateY(-16px) scale(.97); opacity: 0; } }
    @keyframes shake { 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
    @keyframes hop { 40% { transform: translateY(-8px); } }
    .chat { margin-bottom: 10px; }
    .mascot { width: 72px; height: 72px; }
    .mascot.hop { animation: hop .4s; } .mascot.shake { animation: shake .3s; }
    .module-header .mono { margin-left: auto; }
    .steps { display: flex; gap: 6px; justify-content: center; }
    .step { width: 22px; height: 6px; border-radius: 3px; background: var(--surface-2h); border: 1px solid var(--border-light); }
    .step.cur { background: var(--highlight); border-color: var(--accent); }
    .step.ok { background: var(--accent); border-color: var(--border-dark); }
    .step.bad { background: var(--danger-soft); border-color: var(--danger); }
    .kana {
      text-align: center; font: 68px/1.15 var(--kana); color: var(--text); margin: 6px 0 0;
    }
    .kana.shake { animation: shake .3s; }
    .script { text-align: center; margin-bottom: 12px; }
    form { display: flex; gap: 8px; align-items: center; }
    form input { flex: 1; min-width: 0; font-size: 16px; }
    .fb { min-height: 20px; margin: 10px 0 0; text-align: center; font-size: 14px; }
    .fb.ok { color: var(--accent); } .fb.bad { color: var(--danger); }
    .result { text-align: center; }
    .score { font: 46px/1.1 var(--sans); margin: 4px 0; }
    .misses { margin-bottom: 14px; line-height: 1.6; }
    .misses b { font-family: var(--kana); font-weight: 400; color: var(--chinese); }
    .foot { padding: 7px 10px; border-top: 1px solid var(--border-light2); background: var(--surface-1); }
  `;

  let fontReady = null;
  function loadFont() {
    // @font-face is ignored inside a shadow root, so register on the document.
    if (!fontReady) {
      const f = new FontFace("KanaChanMincho", `url("${chrome.runtime.getURL("fonts/RemiliaMincho-Regular.woff2")}")`);
      fontReady = f.load().then(() => document.fonts.add(f)).catch(() => {});
    }
    return fontReady;
  }

  let themeCss = null;
  async function getThemeCss() {
    if (themeCss == null) {
      try { themeCss = await (await fetch(chrome.runtime.getURL("theme.css"))).text(); }
      catch (_) { themeCss = ""; }
    }
    return themeCss;
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildPool(s) {
    const d = window.__kanaData, pool = [];
    for (const script of ["hiragana", "katakana"]) {
      if (!s[script]) continue;
      pool.push(...d[script].basic.map((e) => ({ script, e })));
      if (s.dakuten) pool.push(...d[script].dakuten.map((e) => ({ script, e })));
      if (s.combos) {
        // Voiced combos (ぎゃ, じゃ…) follow the dakuten switch.
        const voiced = new Set(d[script].dakuten.map((e) => e[0]));
        pool.push(...d[script].combos.filter((e) => s.dakuten || !voiced.has(e[0][0])).map((e) => ({ script, e })));
      }
    }
    return pool;
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  let host = null, sfx = () => {};
  function close() {
    if (!host) return;
    sfx("MENU_CLOSE");
    host.remove(); host = null;
  }

  async function show() {
    if (host) return; // a quiz is already open on this page
    host = true;
    let s = DEFAULTS;
    try { s = await chrome.storage.sync.get(DEFAULTS); } catch (_) {}
    sfx = (name) => s.sounds && window.__kanaSfx && window.__kanaSfx(name);
    const [css] = await Promise.all([getThemeCss(), loadFont()]);

    let pool = buildPool(s);
    if (!pool.length) pool = buildPool({ ...s, hiragana: true });
    const n = Math.max(1, Number(s.questionCount) || 5);
    const qs = shuffle(pool.slice()).slice(0, n);

    host = document.createElement("kana-chan-quiz");
    const root = host.attachShadow({ mode: "closed" });
    const style = el("style"); style.textContent = css + QUIZ_CSS;
    const wrap = el("div", "wrap");
    wrap.style.setProperty("--theme-h", s.themeHue);
    root.append(style, wrap);

    const chat = el("div", "chat");
    const mascot = el("img", "mascot"); mascot.src = chrome.runtime.getURL("mascot.png"); mascot.alt = "";
    const bubble = el("div", "bubble");
    chat.append(mascot, bubble);

    const card = el("section", "module");
    const header = el("div", "module-header");
    const title = el("h2", "module-title", "Kana quiz"); title.dataset.mark = "仮名";
    const pos = el("span", "mono");
    const x = el("button", "close", "×"); x.type = "button"; x.title = "Close (Esc)"; x.onclick = close;
    header.append(title, pos, x);

    const body = el("div", "module-body");
    const steps = el("div", "steps");
    const stepEls = qs.map(() => steps.appendChild(el("span", "step")));
    const kana = el("div", "kana");
    const script = el("p", "mono script");
    const label = el("label", "label", "Romaji");
    const form = el("form");
    const input = el("input"); input.type = "text"; input.placeholder = "type the reading"; input.autocomplete = "off"; input.spellcheck = false;
    const go = el("button", "primary", "Check"); go.type = "submit";
    form.append(input, go);
    const fb = el("p", "fb");
    body.append(steps, kana, script, label, form, fb);

    const foot = el("div", "foot");
    foot.append("Made with ", el("span", "heart", "♥"), " by a milady");
    card.append(header, body, foot);
    wrap.append(chat, card);
    (document.body || document.documentElement).appendChild(host);
    sfx("MENU_OPEN");

    const say = (move, line) => {
      bubble.textContent = line;
      mascot.classList.remove("hop", "shake"); void mascot.offsetWidth;
      if (move) mascot.classList.add(move);
    };
    const pick = (a) => a[Math.floor(Math.random() * a.length)];

    // Keep the host page from reacting to keystrokes typed into the quiz.
    for (const ev of ["keydown", "keyup", "keypress"]) {
      wrap.addEventListener(ev, (e) => { e.stopPropagation(); if (e.key === "Escape") close(); });
    }

    let i = 0, correct = 0, waiting = false;
    const misses = [];

    function render() {
      const q = qs[i];
      stepEls.forEach((d, k) => d.classList.toggle("cur", k === i));
      kana.textContent = q.e[0];
      script.textContent = q.script;
      pos.textContent = `${i + 1} / ${qs.length}`;
      input.value = ""; input.placeholder = "type the reading"; fb.textContent = ""; fb.className = "fb";
      say(null, i === 0 ? "kana time!!!!" : pick(["what's this one?", "hmm...", "you got this", "next one ♡"]));
      input.focus();
    }

    function finish() {
      const perfect = correct === qs.length, good = correct >= qs.length / 2;
      say(good ? "hop" : "shake", perfect ? "perfect!! すごい ♡" : good ? "nice work, いいね" : "we'll practise more... がんばって");
      if (good) sfx("SUCCESS");
      pos.textContent = "done";
      const r = el("div", "result");
      r.append(el("div", "score", `${correct} / ${qs.length}`));
      const m = el("p", "mono misses");
      if (misses.length) {
        m.append("Review: ");
        misses.forEach(([k, ro], j) => { if (j) m.append("  ·  "); m.append(el("b", null, k), ` ${ro}`); });
      } else m.textContent = "No mistakes.";
      r.append(m);
      const done = el("button", "primary", "Bye bye"); done.type = "button"; done.onclick = close;
      r.append(done);
      body.replaceChildren(r);
      done.focus();
    }

    let retyping = false; // after a miss, the right romaji must be typed to move on

    function next(delay) {
      waiting = true;
      setTimeout(() => {
        waiting = false; retyping = false; i++;
        if (i < qs.length) { sfx("TRANSITION"); render(); } else finish();
      }, delay);
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (waiting) return;
      const ans = input.value.trim().toLowerCase();
      if (!ans) return;
      const q = qs[i], ok = q.e.slice(1).includes(ans);
      if (retyping) {
        if (ok) { sfx("CLICK"); fb.textContent = "Got it"; fb.className = "fb ok"; say(null, "okay, next one"); next(500); }
        else {
          sfx("ERROR"); input.value = "";
          kana.classList.remove("shake"); void kana.offsetWidth; kana.classList.add("shake");
        }
        return;
      }
      stepEls[i].classList.remove("cur");
      if (ok) {
        correct++; stepEls[i].classList.add("ok");
        fb.textContent = "Correct"; fb.className = "fb ok";
        say("hop", pick(["yay!!", "すごい", "correct ♡", "ez"]));
        sfx("CLICK");
        next(800);
      } else {
        stepEls[i].classList.add("bad");
        misses.push([q.e[0], q.e[1]]);
        fb.textContent = `It's \u201c${q.e[1]}\u201d. Type it to continue`; fb.className = "fb bad";
        say("shake", pick(["aww...", "so close", "it's okay..."]));
        sfx("ERROR");
        kana.classList.remove("shake"); void kana.offsetWidth; kana.classList.add("shake");
        retyping = true;
        input.value = ""; input.placeholder = q.e[1]; input.focus();
      }
    });

    render();
  }

  window.__kanaChanShow = show;
}
