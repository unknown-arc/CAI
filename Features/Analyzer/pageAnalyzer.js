(function () {
  function isVisible(node) {
    if (!(node instanceof Element)) return false;
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
      return false;
    }

    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function collectTexts() {
    const selectors = "h1,h2,h3,h4,p,li,label,td,th,legend,.question,[role='heading'],[data-question]";
    const nodes = Array.from(document.querySelectorAll(selectors));
    const seen = new Set();
    const texts = [];

    for (const node of nodes) {
      if (!isVisible(node)) continue;
      const raw = (node.textContent || "").replace(/\s+/g, " ").trim();
      if (!raw || raw.length < 8 || raw.length > 260) continue;
      if (seen.has(raw)) continue;
      seen.add(raw);
      texts.push(raw);
    }

    return texts;
  }

  function pickQuestion(texts) {
    const explicit = texts.find(
      (text) =>
        /^(q(uestion)?\s*\d*[:.)-])/i.test(text) ||
        text.endsWith("?") ||
        /choose|select|which\s+of\s+the\s+following|correct\s+answer/i.test(text)
    );
    if (explicit) return explicit;
    return texts.find((text) => text.length >= 20 && text.length <= 220) || "";
  }

  function pickOptions(texts) {
    const optionPattern = /^((?:[A-Da-d]|[1-4])[\).:-]|Option\s*[A-Da-d1-4]\s*[:.)-])\s+/i;
    const options = texts.filter(
      (text) =>
        optionPattern.test(text) ||
        /^(true|false)$/i.test(text) ||
        /^.{1,2}\s[-:]\s.{3,}/.test(text)
    );
    return options.slice(0, 6);
  }

  function buildPayload() {
    const texts = collectTexts();
    const question = pickQuestion(texts);
    const options = pickOptions(texts);

    if (!question && options.length === 0) {
      return null;
    }

    const lines = [];
    if (question) lines.push(`Question: ${question}`);
    if (options.length) {
      lines.push("Options:");
      options.forEach((opt, idx) => lines.push(`${idx + 1}. ${opt}`));
    }

    return {
      question,
      options,
      text: lines.join("\n")
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== "CAI_ANALYZE_PAGE") return;

    const payload = buildPayload();
    if (!payload) {
      sendResponse({ ok: false });
      return;
    }

    sendResponse({ ok: true, ...payload });
  });
})();
