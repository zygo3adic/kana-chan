document.getElementById("now").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const res = await chrome.runtime.sendMessage({ type: "quiz-now", tabId: tab && tab.id });
  if (res && res.ok) return window.close();
  const note = document.getElementById("note");
  note.textContent = "Chrome won't let the quiz open on this page. Try a normal website.";
  note.hidden = false;
});
document.getElementById("more").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
