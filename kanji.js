// Basic kanji (JLPT N5), one common word each.
// Format: [word with furigana, meaning, ...other accepted readings].
// In the word, {漢|かん} marks a kanji and its furigana; plain kana outside braces is okurigana.
if (!window.__kanjiData) {
  const RAW = [
    ["{一|いち}", "one"], ["{二|に}", "two"], ["{三|さん}", "three"], ["{四|よん}", "four", "し"],
    ["{五|ご}", "five"], ["{六|ろく}", "six"], ["{七|なな}", "seven", "しち"], ["{八|はち}", "eight"],
    ["{九|きゅう}", "nine", "く"], ["{十|じゅう}", "ten"], ["{百|ひゃく}", "hundred"], ["{千|せん}", "thousand"],
    ["{万|まん}", "ten thousand"], ["{円|えん}", "yen; circle"],
    ["{日|ひ}", "day; sun", "にち"], ["{月|つき}", "moon; month", "げつ"], ["{火|ひ}", "fire", "か"],
    ["{水|みず}", "water", "すい"], ["{木|き}", "tree", "もく"], ["{金|かね}", "money; gold", "きん"],
    ["{土|つち}", "soil; earth", "ど"], ["{年|とし}", "year", "ねん"], ["{時|とき}", "time", "じ"],
    ["{分|ふん}", "minute", "ぶん"], ["{半|はん}", "half"], ["{今|いま}", "now"], ["{何|なに}", "what", "なん"],
    ["{人|ひと}", "person", "じん", "にん"], ["{男|おとこ}", "man"], ["{女|おんな}", "woman"], ["{子|こ}", "child"],
    ["{父|ちち}", "father"], ["{母|はは}", "mother"], ["{友|とも}", "friend"],
    ["{先|せん}{生|せい}", "teacher"], ["{学|がっ}{校|こう}", "school"], ["{名|な}{前|まえ}", "name"],
    ["{山|やま}", "mountain"], ["{川|かわ}", "river"], ["{田|た}", "rice field"], ["{天|てん}{気|き}", "weather"],
    ["{雨|あめ}", "rain"], ["{花|はな}", "flower"], ["{空|そら}", "sky"], ["{魚|さかな}", "fish"],
    ["{東|ひがし}", "east"], ["{西|にし}", "west"], ["{南|みなみ}", "south"], ["{北|きた}", "north"],
    ["{上|うえ}", "above; up"], ["{下|した}", "below; down"], ["{中|なか}", "inside; middle"], ["{外|そと}", "outside"],
    ["{右|みぎ}", "right"], ["{左|ひだり}", "left"],
    ["{大|おお}きい", "big"], ["{小|ちい}さい", "small"], ["{長|なが}い", "long"], ["{高|たか}い", "tall; expensive"],
    ["{安|やす}い", "cheap"], ["{新|あたら}しい", "new"], ["{古|ふる}い", "old"], ["{白|しろ}い", "white"],
    ["{見|み}る", "to see"], ["{行|い}く", "to go"], ["{来|く}る", "to come"], ["{帰|かえ}る", "to go home"],
    ["{食|た}べる", "to eat"], ["{飲|の}む", "to drink"], ["{買|か}う", "to buy"], ["{読|よ}む", "to read"],
    ["{書|か}く", "to write"], ["{話|はな}す", "to speak"], ["{聞|き}く", "to listen"], ["{休|やす}む", "to rest"],
    ["{出|で}る", "to go out"], ["{入|はい}る", "to enter"], ["{会|あ}う", "to meet"],
    ["{車|くるま}", "car"], ["{電|でん}{車|しゃ}", "train"], ["{日|に}{本|ほん}{語|ご}", "Japanese (language)"],
    ["{国|くに}", "country"], ["{本|ほん}", "book"], ["{道|みち}", "road"], ["{店|みせ}", "shop"], ["{駅|えき}", "station"],
    ["{口|くち}", "mouth"], ["{目|め}", "eye"], ["{耳|みみ}", "ear"], ["{手|て}", "hand"], ["{足|あし}", "foot; leg"],
    ["{毎|まい}{日|にち}", "every day"], ["{午|ご}{前|ぜん}", "morning; a.m."], ["{午|ご}{後|ご}", "afternoon; p.m."]
  ];
  window.__kanjiData = RAW.map(([f, meaning, ...alts]) => {
    // parts: [{ text, ruby? }]; ruby only on kanji segments.
    const parts = [...f.matchAll(/\{(.+?)\|(.+?)\}|([^{]+)/g)].map((m) => (m[3] ? { text: m[3] } : { text: m[1], ruby: m[2] }));
    const word = parts.map((p) => p.text).join("");
    const reading = parts.map((p) => p.ruby || p.text).join("");
    const okuri = parts.filter((p) => !p.ruby).map((p) => p.text).join("");
    return { word, reading, readings: [reading, ...alts.map((a) => a + okuri)], meaning, parts };
  });
}
