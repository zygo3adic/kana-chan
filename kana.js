// Kana tables. Each entry: [kana, accepted romaji...]; the first romaji is shown as the answer.
if (!window.__kanaData) {
  const H_BASIC = [
    ["あ","a"],["い","i"],["う","u"],["え","e"],["お","o"],
    ["か","ka"],["き","ki"],["く","ku"],["け","ke"],["こ","ko"],
    ["さ","sa"],["し","shi","si"],["す","su"],["せ","se"],["そ","so"],
    ["た","ta"],["ち","chi","ti"],["つ","tsu","tu"],["て","te"],["と","to"],
    ["な","na"],["に","ni"],["ぬ","nu"],["ね","ne"],["の","no"],
    ["は","ha"],["ひ","hi"],["ふ","fu","hu"],["へ","he"],["ほ","ho"],
    ["ま","ma"],["み","mi"],["む","mu"],["め","me"],["も","mo"],
    ["や","ya"],["ゆ","yu"],["よ","yo"],
    ["ら","ra"],["り","ri"],["る","ru"],["れ","re"],["ろ","ro"],
    ["わ","wa"],["を","wo","o"],["ん","n","nn"]
  ];
  const H_DAKUTEN = [
    ["が","ga"],["ぎ","gi"],["ぐ","gu"],["げ","ge"],["ご","go"],
    ["ざ","za"],["じ","ji","zi"],["ず","zu"],["ぜ","ze"],["ぞ","zo"],
    ["だ","da"],["ぢ","ji","di"],["づ","zu","du"],["で","de"],["ど","do"],
    ["ば","ba"],["び","bi"],["ぶ","bu"],["べ","be"],["ぼ","bo"],
    ["ぱ","pa"],["ぴ","pi"],["ぷ","pu"],["ぺ","pe"],["ぽ","po"]
  ];
  // Yōon: a consonant kana plus a small ゃ/ゅ/ょ, read as one sound.
  const H_COMBOS = [
    ["きゃ","kya"],["きゅ","kyu"],["きょ","kyo"],
    ["しゃ","sha","sya"],["しゅ","shu","syu"],["しょ","sho","syo"],
    ["ちゃ","cha","tya","cya"],["ちゅ","chu","tyu","cyu"],["ちょ","cho","tyo","cyo"],
    ["にゃ","nya"],["にゅ","nyu"],["にょ","nyo"],
    ["ひゃ","hya"],["ひゅ","hyu"],["ひょ","hyo"],
    ["みゃ","mya"],["みゅ","myu"],["みょ","myo"],
    ["りゃ","rya"],["りゅ","ryu"],["りょ","ryo"],
    ["ぎゃ","gya"],["ぎゅ","gyu"],["ぎょ","gyo"],
    ["じゃ","ja","jya","zya"],["じゅ","ju","jyu","zyu"],["じょ","jo","jyo","zyo"],
    ["ぢゃ","ja","dya"],["ぢゅ","ju","dyu"],["ぢょ","jo","dyo"],
    ["びゃ","bya"],["びゅ","byu"],["びょ","byo"],
    ["ぴゃ","pya"],["ぴゅ","pyu"],["ぴょ","pyo"]
  ];
  // Katakana is hiragana shifted by 0x60 in Unicode, character by character.
  const shift = (k) => [...k].map((c) => String.fromCharCode(c.charCodeAt(0) + 0x60)).join("");
  const toKata = (list) => list.map(([k, ...r]) => [shift(k), ...r]);
  window.__kanaData = {
    hiragana: { basic: H_BASIC, dakuten: H_DAKUTEN, combos: H_COMBOS },
    katakana: { basic: toKata(H_BASIC), dakuten: toKata(H_DAKUTEN), combos: toKata(H_COMBOS) }
  };
}
