importScripts("defaults.js");

const ALARM = "kana-quiz";

async function getSettings() {
  return chrome.storage.sync.get(KANA_DEFAULTS);
}

async function schedule() {
  const s = await getSettings();
  await chrome.alarms.clear(ALARM);
  if (!s.enabled) return;
  const minutes = Math.max(1, Number(s.intervalMinutes) || KANA_DEFAULTS.intervalMinutes);
  chrome.alarms.create(ALARM, { delayInMinutes: minutes, periodInMinutes: minutes });
}

async function showQuiz(tabId) {
  if (tabId == null) {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) return false;
    tabId = tab.id;
  }
  try {
    // Each injected file guards against being injected twice.
    await chrome.scripting.executeScript({ target: { tabId }, files: ["kana.js", "sfx.js", "content.js"] });
    await chrome.scripting.executeScript({ target: { tabId }, func: () => window.__kanaChanShow && window.__kanaChanShow() });
    return true;
  } catch (e) {
    // Pages like chrome://, the Web Store or the new tab page can't be scripted.
    return false;
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const s = await chrome.storage.sync.get(null);
  await chrome.storage.sync.set({ ...KANA_DEFAULTS, ...s });
  schedule();
});
chrome.runtime.onStartup.addListener(schedule);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && (changes.enabled || changes.intervalMinutes)) schedule();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) showQuiz();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "quiz-now") {
    showQuiz(msg.tabId).then((ok) => sendResponse({ ok }));
    return true;
  }
  if (msg && msg.type === "get-settings") {
    getSettings().then(sendResponse);
    return true;
  }
});
