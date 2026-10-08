# Kana-chan

A small kana and kanji quiz pops up in the top-right corner of the page you're on every few minutes (10 by default). Five questions, type the romaji, press Enter.

## Install (unpacked)
1. Click the green **Code** button on this page, then **Download ZIP**, and unzip it.
2. Open `chrome://extensions` and switch on **Developer mode** (top right).
3. Click **Load unpacked** and pick the unzipped `kana-chan-main` folder (the one containing `manifest.json`).
4. Pin the extension from the puzzle-piece menu.

To update later, download the ZIP again, replace the folder, and click the reload arrow on the extension in `chrome://extensions`.

## Use
- Click the あ icon for **Quiz me now**, the on/off switch, the interval and the hiragana/katakana/kanji toggles.
- **More settings** adds questions per quiz, dakuten (が, パ…) and combo (きゃ, キャ…) toggles, sounds on/off and a theme hue slider.
- **Kanji** (on by default) adds about 90 basic N5 kanji, each as a common word with furigana. The first time one comes up you get a short intro card with its reading and meaning. Then it's asked one of two ways:
  - **Read it:** the kanji is shown and you type its reading in romaji. It turns into kana as you type.
  - **Write it:** you see the meaning and the furigana over empty boxes. Type the reading, press Space, and pick the right kanji from the list (number keys, arrows or click), like a Japanese keyboard. Your own Japanese keyboard works too.
- Esc or × closes a quiz. After a wrong guess the answer is shown and you must type it to continue (it still counts as a miss). Accepted spellings include shi/si, chi/ti, tsu/tu, fu/hu, ji/zi, wo/o, n/nn.
- Chrome blocks extensions on chrome:// pages, the Web Store and the new tab page, so a quiz due while you're on one of those is skipped.
