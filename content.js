if (!window.__kanaChanShow) {
  const DEFAULTS = { hiragana: true, katakana: true, dakuten: true, combos: true, kanji: true, quizScale: 100, questionCount: 5, sounds: true, themeHue: 227 };

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
    .module { position: relative; }
    /* Drag this corner out to make the whole window (and its furigana) bigger. */
    .grip {
      position: absolute; left: 0; bottom: 0; width: 18px; height: 18px; cursor: nesw-resize; z-index: 1;
      touch-action: none; border-bottom-left-radius: var(--radius);
      background: linear-gradient(45deg, transparent 0 30%, var(--border-light) 30% 38%, transparent 38% 52%, var(--border-light) 52% 60%, transparent 60%);
    }
    .grip:hover, .grip.drag { background-color: var(--hover); }
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
    .kana ruby rt, .learn ruby rt, .fb ruby rt, .misses ruby rt { font: 15px/1.1 var(--kana); color: var(--chinese); letter-spacing: 0; }
    .kana.word { font-size: 54px; line-height: 1.5; }
    .kana rt { padding-bottom: 3px; }
    .kana .blank { color: var(--border-light); }
    .meaning { text-align: center; margin: 2px 0 0; font-size: 15px; color: var(--text); }
    .cands { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .cands button { padding: 4px 10px; font: 18px var(--kana); box-shadow: 0 2px 0 0 var(--border-light); }
    .cands button small { font: 10px var(--sans); color: var(--text-muted); margin-right: 4px; vertical-align: 2px; }
    .cands button.sel { color: var(--on-accent-text); background: var(--accent); border-color: var(--border-dark); }
    .cands button.sel small { color: var(--on-accent-text); }
    .hint { margin: 2px 0 0; text-align: center; }
    .fb ruby { font: 22px/1.6 var(--kana); color: var(--text); }
    .learn { text-align: center; padding-top: 10px; }
    .learn .kana { margin-bottom: 4px; }
    .learn .reading { margin-bottom: 12px; }
    .foot { padding: 7px 10px; border-top: 1px solid var(--border-light2); background: var(--surface-1); }
  `;

  let fontReady = null;
  function loadFont() {
    // @font-face is ignored inside a shadow root, so register on the document.
    if (!fontReady) {
      const f = new FontFace("KanaChanMincho", `url("${chrome.runtime.getURL("fonts/mincho.woff2")}")`);
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
      const add = (list) => pool.push(...list.map((e) => ({ type: "kana", script, e })));
      add(d[script].basic);
      if (s.dakuten) add(d[script].dakuten);
      if (s.combos) {
        // Voiced combos (ぎゃ, じゃ…) follow the dakuten switch.
        const voiced = new Set(d[script].dakuten.map((e) => e[0]));
        add(d[script].combos.filter((e) => s.dakuten || !voiced.has(e[0][0])));
      }
    }
    if (s.kanji) pool.push(...window.__kanjiData.map((k) => ({ type: "kanji", k })));
    return pool;
  }

  // Word with furigana over each kanji. `blank` hides the kanji behind boxes.
  function rubyWord(k, blank = false) {
    const frag = document.createDocumentFragment();
    for (const p of k.parts) {
      if (!p.ruby) { frag.append(p.text); continue; }
      const r = document.createElement("ruby");
      if (blank) { const b = document.createElement("span"); b.className = "blank"; b.textContent = "\u25a1".repeat(p.text.length); r.append(b); }
      else r.append(p.text);
      const rt = document.createElement("rt"); rt.textContent = p.ruby; r.append(rt);
      frag.append(r);
    }
    return frag;
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
    // Kanji questions alternate between reading one and writing one with the IME.
    for (const q of qs) if (q.type === "kanji") q.mode = Math.random() < 0.5 ? "read" : "write";
    let seen = new Set();
    try { seen = new Set((await chrome.storage.local.get({ kanjiSeen: [] })).kanjiSeen); } catch (_) {}
    const ime = window.__kanaIme;

    host = document.createElement("kana-chan-quiz");
    const root = host.attachShadow({ mode: "closed" });
    const style = el("style"); style.textContent = css + QUIZ_CSS;
    const wrap = el("div", "wrap");
    wrap.style.setProperty("--theme-h", s.themeHue);
    const clampScale = (v) => Math.min(200, Math.max(80, Math.round(v)));
    let scale = clampScale(Number(s.quizScale) || 100);
    const applyScale = () => { wrap.style.zoom = scale / 100; };
    applyScale();
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

    // Shown the first time a kanji comes up.
    const learn = el("div", "learn");
    const learnWord = el("div", "kana word");
    const learnMeaning = el("p", "meaning");
    const learnReading = el("p", "mono reading");
    const learnGo = el("button", "primary", "Got it"); learnGo.type = "button";
    learn.append(el("p", "label", "New kanji"), learnWord, learnMeaning, learnReading, learnGo);

    const quiz = el("div");
    const kana = el("div", "kana");
    const meaning = el("p", "meaning");
    const script = el("p", "mono script");
    const label = el("label", "label", "Romaji");
    const form = el("form");
    const input = el("input"); input.type = "text"; input.autocomplete = "off"; input.spellcheck = false;
    const go = el("button", "primary", "Check"); go.type = "submit";
    form.append(input, go);
    const cands = el("div", "cands"); cands.hidden = true;
    const hint = el("p", "mono hint");
    const fb = el("p", "fb");
    quiz.append(kana, meaning, script, label, form, cands, fb, hint);
    body.append(steps, learn, quiz);

    const foot = el("div", "foot");
    foot.append("Made with ", el("span", "heart", "♥"), " by a milady");
    const grip = el("div", "grip"); grip.title = "Drag to resize";
    card.append(header, body, foot, grip);
    // The window is pinned top-right, so dragging the bottom-left corner
    // left/down grows it. Size is saved and used for every quiz after.
    grip.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      grip.setPointerCapture(e.pointerId); grip.classList.add("drag");
      const x0 = e.clientX, y0 = e.clientY, s0 = scale, w0 = wrap.getBoundingClientRect().width;
      const move = (ev) => {
        const grow = Math.max(x0 - ev.clientX, ev.clientY - y0);
        scale = clampScale(s0 * (w0 + grow) / w0); applyScale();
      };
      const up = () => {
        grip.removeEventListener("pointermove", move); grip.classList.remove("drag");
        try { chrome.storage.sync.set({ quizScale: scale }); } catch (_) {}
      };
      grip.addEventListener("pointermove", move);
      grip.addEventListener("pointerup", up, { once: true });
      grip.addEventListener("pointercancel", up, { once: true });
    });
    grip.addEventListener("dblclick", () => { scale = 100; applyScale(); try { chrome.storage.sync.set({ quizScale: 100 }); } catch (_) {} });
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
      wrap.addEventListener(ev, (e) => {
        e.stopPropagation();
        if (ev === "keydown" && e.key === "Escape" && !e.defaultPrevented) close();
      });
    }

    let i = 0, correct = 0, waiting = false;
    let retyping = false; // after a miss, the right answer must be typed to move on
    const misses = [];
    const q = () => qs[i];
    const usesIme = () => q().type === "kanji";

    function shake() { kana.classList.remove("shake"); void kana.offsetWidth; kana.classList.add("shake"); }

    function showQuestion() {
      const cur = q();
      learn.hidden = true; quiz.hidden = false;
      closeCands();
      input.value = ""; fb.replaceChildren(); fb.className = "fb"; hint.textContent = "";
      kana.classList.toggle("word", cur.type === "kanji");
      if (cur.type === "kana") {
        kana.textContent = cur.e[0];
        meaning.hidden = true;
        script.textContent = cur.script;
        label.textContent = "Romaji";
        input.placeholder = "type the reading";
      } else if (cur.mode === "read") {
        kana.textContent = cur.k.word;
        meaning.hidden = false; meaning.textContent = cur.k.meaning;
        script.textContent = "kanji \u00b7 read it";
        label.textContent = "Reading";
        input.placeholder = "type it in romaji";
      } else {
        kana.replaceChildren(rubyWord(cur.k, true));
        meaning.hidden = false; meaning.textContent = cur.k.meaning;
        script.textContent = "kanji \u00b7 write it";
        label.textContent = "Reading, then space";
        input.placeholder = "type it in romaji";
      }
      input.focus();
    }

    function render() {
      const cur = q();
      stepEls.forEach((d, k) => d.classList.toggle("cur", k === i));
      pos.textContent = `${i + 1} / ${qs.length}`;
      title.textContent = cur.type === "kanji" ? "Kanji quiz" : "Kana quiz";
      title.dataset.mark = cur.type === "kanji" ? "\u6f22\u5b57" : "\u4eee\u540d";
      if (cur.type === "kanji" && !seen.has(cur.k.word)) {
        // First time: teach it before asking.
        seen.add(cur.k.word);
        try { chrome.storage.local.set({ kanjiSeen: [...seen] }); } catch (_) {}
        quiz.hidden = true; learn.hidden = false;
        learnWord.replaceChildren(rubyWord(cur.k));
        learnMeaning.textContent = cur.k.meaning;
        learnReading.textContent = cur.k.readings.length > 1 ? `also read ${cur.k.readings.slice(1).join(", ")}` : "";
        say("hop", pick(["new kanji!!", "learn this one ♡", "this one's new"]));
        learnGo.focus();
        return;
      }
      say(null, i === 0 ? "kana time!!!!" : pick(["what's this one?", "hmm...", "you got this", "next one \u2661"]));
      showQuestion();
    }
    learnGo.onclick = () => { sfx("CLICK"); say(null, "now you try"); showQuestion(); };

    // ---- IME: live romaji -> kana, then a candidate list for kanji --------
    let candList = [], candSel = 0;
    function closeCands() { cands.hidden = true; candList = []; }
    function openCands() {
      const kanaText = ime.toKana(input.value, true);
      if (!kanaText) return;
      input.value = kanaText;
      candList = ime.candidates(kanaText, window.__kanjiData);
      candSel = 0;
      drawCands();
      cands.hidden = false;
    }
    function drawCands() {
      cands.replaceChildren(...candList.map((w, j) => {
        const b = el("button", j === candSel ? "sel" : null);
        b.type = "button";
        b.append(el("small", null, String(j + 1)), w);
        b.onclick = () => choose(j);
        return b;
      }));
    }
    function choose(j) {
      input.value = candList[j];
      closeCands();
      form.requestSubmit();
    }

    input.addEventListener("input", (e) => {
      if (!usesIme() || e.isComposing) return; // leave a real OS IME alone
      closeCands();
      const v = ime.toKana(input.value, false);
      if (v !== input.value) input.value = v;
    });

    input.addEventListener("keydown", (e) => {
      if (!usesIme()) return;
      const writing = q().mode === "write";
      if (!cands.hidden) {
        if (e.key === " " || e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); candSel = (candSel + 1) % candList.length; drawCands(); }
        else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); candSel = (candSel - 1 + candList.length) % candList.length; drawCands(); }
        else if (/^[1-9]$/.test(e.key) && Number(e.key) <= candList.length) { e.preventDefault(); choose(Number(e.key) - 1); }
        else if (e.key === "Enter") { e.preventDefault(); choose(candSel); }
        else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); closeCands(); }
        else closeCands();
        return;
      }
      // Space (or Enter on plain kana) converts, like a real IME.
      const plainKana = /^[\u3041-\u3093\u30fc]*[a-z']*$/i.test(input.value) && input.value.trim();
      if (writing && plainKana && (e.key === " " || e.key === "Enter")) { e.preventDefault(); openCands(); }
    });

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
        misses.forEach(([k, ro], j) => {
          if (j) m.append("  \u00b7  ");
          if (typeof k === "string") m.append(el("b", null, k), ` ${ro}`);
          else { const b = el("b"); b.append(rubyWord(k)); m.append(b, ` ${k.meaning}`); }
        });
      } else m.textContent = "No mistakes.";
      r.append(m);
      const done = el("button", "primary", "Bye bye"); done.type = "button"; done.onclick = close;
      r.append(done);
      body.replaceChildren(r);
      done.focus();
    }

    function next(delay) {
      waiting = true;
      setTimeout(() => {
        waiting = false; retyping = false; i++;
        if (i < qs.length) { sfx("TRANSITION"); render(); } else finish();
      }, delay);
    }

    function isRight(cur, raw) {
      if (cur.type === "kana") return cur.e.slice(1).includes(raw.trim().toLowerCase());
      if (cur.mode === "read") return cur.k.readings.includes(ime.toKana(raw.trim(), true));
      return raw.trim() === cur.k.word;
    }

    function answerFb(cur, cls, lead) {
      fb.className = `fb ${cls}`;
      fb.replaceChildren(lead);
      if (cur.type === "kanji") { fb.append(" "); const r = el("span"); r.append(rubyWord(cur.k)); fb.append(r); }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (waiting || !input.value.trim()) return;
      const cur = q(), ok = isRight(cur, input.value);
      if (retyping) {
        if (ok) { sfx("CLICK"); fb.textContent = "Got it"; fb.className = "fb ok"; say(null, "okay, next one"); next(500); }
        else { sfx("ERROR"); input.value = ""; shake(); }
        return;
      }
      stepEls[i].classList.remove("cur");
      if (ok) {
        correct++; stepEls[i].classList.add("ok");
        answerFb(cur, "ok", "Correct");
        if (cur.type === "kanji" && cur.mode === "write") kana.replaceChildren(rubyWord(cur.k));
        say("hop", pick(["yay!!", "すごい", "correct \u2661", "ez"]));
        sfx("CLICK");
        next(cur.type === "kanji" ? 1300 : 800);
      } else {
        stepEls[i].classList.add("bad");
        sfx("ERROR"); shake();
        say("shake", pick(["aww...", "so close", "it's okay..."]));
        retyping = true;
        input.value = "";
        if (cur.type === "kana") {
          misses.push([cur.e[0], cur.e[1]]);
          fb.textContent = `It's \u201c${cur.e[1]}\u201d. Type it to continue`; fb.className = "fb bad";
          input.placeholder = cur.e[1];
        } else {
          misses.push([cur.k]);
          // Reveal the word with furigana, then make them type it themselves.
          kana.replaceChildren(rubyWord(cur.k));
          fb.textContent = `It's \u201c${cur.k.reading}\u201d`; fb.className = "fb bad";
          hint.textContent = cur.mode === "read" ? "Type the reading to continue" : "Type the reading, space, and pick it to continue";
          input.placeholder = cur.k.reading;
        }
        input.focus();
      }
    });

    render();
  }

  window.__kanaChanShow = show;
}
