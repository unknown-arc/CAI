(function () {
  const snip = window.__CAI_SNIP__;

  snip.collectTextFromRect = function collectTextFromRect(rect) {
    const selectors = "h1,h2,h3,h4,p,li,label,td,th,legend,button,span,.question,[role='heading'],[data-question]";
    const nodes = Array.from(document.querySelectorAll(selectors));
    const seen = new Set();
    const lines = [];

    for (const node of nodes) {
      if (!(node instanceof Element)) continue;
      const bounds = node.getBoundingClientRect();
      if (bounds.width < 1 || bounds.height < 1) continue;
      if (!snip.intersects(rect, bounds)) continue;

      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || text.length < 2 || text.length > 300) continue;
      if (seen.has(text)) continue;
      seen.add(text);
      lines.push(text);
      if (lines.length >= 80) break;
    }

    return lines;
  };

  function tokenize(text) {
    const stopWords = new Set([
      "the",
      "is",
      "a",
      "an",
      "of",
      "to",
      "in",
      "on",
      "for",
      "and",
      "or",
      "with",
      "what",
      "which",
      "who",
      "when",
      "where",
      "why",
      "how",
      "ka",
      "ki",
      "ke",
      "hai",
      "kya"
    ]);

    return (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && !stopWords.has(t));
  }

  function scoreLine(line, questionTokens) {
    const lineTokens = new Set(tokenize(line));
    let score = 0;
    for (const token of questionTokens) {
      if (lineTokens.has(token)) score += 1;
    }
    return score;
  }

  snip.answerFromContext = function answerFromContext(question, contextLines) {
    const q = (question || "").trim();
    if (!q) return "Type a question first.";
    if (!contextLines || contextLines.length === 0) {
      return "No readable text detected in this snip area. Try selecting a larger text region.";
    }

    const qTokens = tokenize(q);
    if (qTokens.length === 0) {
      return "Please ask with some keywords from the image/text.";
    }

    const ranked = contextLines
      .map((line) => ({ line, score: scoreLine(line, qTokens) }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (!best || best.score === 0) {
      return `I could not find a direct match. Closest visible text:\n- ${contextLines.slice(0, 3).join("\n- ")}`;
    }

    const support = ranked
      .filter((item) => item.score > 0)
      .slice(0, 3)
      .map((item) => `- ${item.line}`)
      .join("\n");

    return `Best match from selected area:\n${best.line}\n\nSupporting lines:\n${support}`;
  };
})();
