(function () {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== "CAI_ANALYZE_PAGE") return;

    const payload = window.__CAI_ANALYZER__ && window.__CAI_ANALYZER__.buildPayload
      ? window.__CAI_ANALYZER__.buildPayload()
      : null;
    if (!payload) {
      sendResponse({ ok: false });
      return;
    }

    sendResponse({ ok: true, ...payload });
  });
})();
