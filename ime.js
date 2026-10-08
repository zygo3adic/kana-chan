// A small IME: romaji -> hiragana as you type, then kana -> kanji candidates.
if (!window.__kanaIme) {
  const d = window.__kanaData.hiragana;
  const table = new Map();
  // First spelling listed wins, so じ beats ぢ for "ji" and ず beats づ for "zu".
  for (const [kana, ...romaji] of [...d.basic, ...d.dakuten, ...d.combos]) {
    for (const r of romaji) if (r !== "n" && r !== "nn" && !table.has(r)) table.set(r, kana);
  }
  for (const [r, k] of Object.entries({
    xa: "ぁ", xi: "ぃ", xu: "ぅ", xe: "ぇ", xo: "ぉ", la: "ぁ", li: "ぃ", lu: "ぅ", le: "ぇ", lo: "ぉ",
    xya: "ゃ", xyu: "ゅ", xyo: "ょ", lya: "ゃ", lyu: "ゅ", lyo: "ょ", xtsu: "っ", xtu: "っ", ltu: "っ",
    "-": "ー", ".": "。", ",": "、", ye: "いぇ", she: "しぇ", che: "ちぇ", je: "じぇ",
    shya: "しゃ", shyu: "しゅ", shyo: "しょ", chya: "ちゃ", chyu: "ちゅ", chyo: "ちょ"
  })) table.set(r, k);

  const vowel = (c) => "aiueo".includes(c);

  // Converts romaji to hiragana. Unless `final`, a trailing "n" (or other
  // unfinished letters) is left as typed so the next keystroke can complete it.
  function toKana(src, final = false) {
    const s = src.toLowerCase();
    let out = "", i = 0;
    while (i < s.length) {
      const c = s[i];
      if (!/[a-z\-.,']/.test(c)) { out += c; i++; continue; }
      if (c === "n") {
        const nx = s[i + 1];
        if (nx === undefined) { out += final ? "ん" : "n"; i++; continue; }
        if (nx === "'") { out += "ん"; i += 2; continue; }
        if (nx === "n") {
          // "nna" is ん + な; a lone "nn" is ん.
          const after = s[i + 2];
          if (after !== undefined && (vowel(after) || after === "y")) { out += "ん"; i++; } else { out += "ん"; i += 2; }
          continue;
        }
        if (!vowel(nx) && nx !== "y") { out += "ん"; i++; continue; }
      }
      // Doubled consonant (or "tch", as in matcha): small っ.
      if ((c === s[i + 1] || (c === "t" && s[i + 1] === "c")) && !vowel(c) && /[a-z]/.test(c)) { out += "っ"; i++; continue; }
      let hit = false;
      for (const len of [4, 3, 2, 1]) {
        const k = table.get(s.slice(i, i + len));
        if (k) { out += k; i += len; hit = true; break; }
      }
      if (!hit) {
        // Not a complete syllable yet: keep the rest as typed.
        if (!final) { out += s.slice(i); break; }
        out += c; i++;
      }
    }
    return out;
  }

  // Kanji candidates for a kana reading: real matches first, then filler from
  // the pool so there is always something to choose between, then the kana itself.
  function candidates(kana, pool, size = 4) {
    const matches = pool.filter((k) => k.readings.includes(kana)).map((k) => k.word);
    const uniq = [...new Set(matches)];
    const others = pool.map((k) => k.word).filter((w) => !uniq.includes(w));
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [others[i], others[j]] = [others[j], others[i]];
    }
    const list = uniq.concat(others.slice(0, Math.max(0, size - uniq.length)));
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]];
    }
    return [...list, kana];
  }

  window.__kanaIme = { toKana, candidates };
}
