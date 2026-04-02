(function () {
  const STATE = {
    active: false,
    startX: 0,
    startY: 0,
    rect: null,
    overlay: null,
    box: null,
    lensPanel: null
  };

  const MIN_SELECTION_SIZE = 8;

  function cleanup() {
    if (STATE.overlay && document.contains(STATE.overlay)) {
      STATE.overlay.remove();
    }
    STATE.active = false;
    STATE.overlay = null;
    STATE.box = null;
    STATE.rect = null;
  }

  function removeLensPanel() {
    if (STATE.lensPanel && document.contains(STATE.lensPanel)) {
      STATE.lensPanel.remove();
    }
    STATE.lensPanel = null;
  }

  function showToast(text) {
    const toast = document.createElement("div");
    toast.textContent = text;
    toast.style.position = "fixed";
    toast.style.bottom = "12px";
    toast.style.right = "12px";
    toast.style.zIndex = "2147483647";
    toast.style.padding = "8px 10px";
    toast.style.borderRadius = "10px";
    toast.style.color = "#e2e8f0";
    toast.style.background = "rgba(15,23,42,0.92)";
    toast.style.border = "1px solid rgba(59,130,246,0.9)";
    toast.style.fontSize = "12px";
    document.documentElement.appendChild(toast);
    setTimeout(() => {
      if (document.contains(toast)) toast.remove();
    }, 1500);
  }

  function drawRect(clientX, clientY) {
    const left = Math.min(STATE.startX, clientX);
    const top = Math.min(STATE.startY, clientY);
    const width = Math.max(1, Math.abs(clientX - STATE.startX));
    const height = Math.max(1, Math.abs(clientY - STATE.startY));

    STATE.rect = { left, top, width, height };
    STATE.box.style.left = `${left}px`;
    STATE.box.style.top = `${top}px`;
    STATE.box.style.width = `${width}px`;
    STATE.box.style.height = `${height}px`;
  }

  function isValidRect(rect) {
    return Boolean(
      rect &&
      Number.isFinite(rect.left) &&
      Number.isFinite(rect.top) &&
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height) &&
      rect.width >= MIN_SELECTION_SIZE &&
      rect.height >= MIN_SELECTION_SIZE
    );
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function requestVisibleTabCapture(viewport) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "CAI_CAPTURE_VISIBLE_TAB", viewport }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || "Capture failed."));
          return;
        }

        if (!response || !response.ok || !response.dataUrl) {
          reject(new Error(response?.message || "Capture failed."));
          return;
        }

        resolve(response.dataUrl);
      });
    });
  }

  function cropImageDataUrl(sourceDataUrl, rect, viewport) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const viewportWidth = Math.max(1, Number(viewport?.width) || image.width);
        const viewportHeight = Math.max(1, Number(viewport?.height) || image.height);
        const scaleX = image.width / viewportWidth;
        const scaleY = image.height / viewportHeight;

        const sx = clamp(Math.floor(rect.left * scaleX), 0, image.width - 1);
        const sy = clamp(Math.floor(rect.top * scaleY), 0, image.height - 1);
        const sw = clamp(Math.floor(rect.width * scaleX), 1, image.width - sx);
        const sh = clamp(Math.floor(rect.height * scaleY), 1, image.height - sy);

        const canvas = document.createElement("canvas");
        canvas.width = sw;
        canvas.height = sh;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable for snip."));
          return;
        }

        ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = () => reject(new Error("Unable to crop selected area."));
      image.src = sourceDataUrl;
    });
  }

  function requestDownload(dataUrl, pageTitle) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: "CAI_DOWNLOAD_IMAGE_DATA_URL",
        dataUrl,
        pageTitle
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || "Download failed."));
          return;
        }

        if (!response || !response.ok) {
          reject(new Error(response?.message || "Download failed."));
          return;
        }

        resolve(response);
      });
    });
  }

  function intersects(a, b) {
    return !(
      b.left > a.left + a.width ||
      b.left + b.width < a.left ||
      b.top > a.top + a.height ||
      b.top + b.height < a.top
    );
  }

  function collectTextFromRect(rect) {
    const selectors = "h1,h2,h3,h4,p,li,label,td,th,legend,button,span,.question,[role='heading'],[data-question]";
    const nodes = Array.from(document.querySelectorAll(selectors));
    const seen = new Set();
    const lines = [];

    for (const node of nodes) {
      if (!(node instanceof Element)) continue;
      const bounds = node.getBoundingClientRect();
      if (bounds.width < 1 || bounds.height < 1) continue;
      if (!intersects(rect, bounds)) continue;

      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || text.length < 2 || text.length > 300) continue;
      if (seen.has(text)) continue;
      seen.add(text);
      lines.push(text);
      if (lines.length >= 80) break;
    }

    return lines;
  }

  function tokenize(text) {
    const stopWords = new Set(["the", "is", "a", "an", "of", "to", "in", "on", "for", "and", "or", "with", "what", "which", "who", "when", "where", "why", "how", "ka", "ki", "ke", "hai", "kya"]);
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

  function answerFromContext(question, contextLines) {
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
  }

  function appendChatBubble(container, text, role) {
    const bubble = document.createElement("div");
    bubble.style.maxWidth = "90%";
    bubble.style.padding = "10px 12px";
    bubble.style.borderRadius = "12px";
    bubble.style.whiteSpace = "pre-wrap";
    bubble.style.wordBreak = "break-word";
    bubble.style.fontSize = "12px";
    bubble.style.lineHeight = "1.45";

    if (role === "user") {
      bubble.style.marginLeft = "auto";
      bubble.style.background = "#0369a1";
      bubble.style.color = "#e0f2fe";
    } else {
      bubble.style.marginRight = "auto";
      bubble.style.background = "#0f172a";
      bubble.style.border = "1px solid rgba(148,163,184,0.24)";
      bubble.style.color = "#e2e8f0";
    }

    bubble.textContent = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  function createLensPanel({ imageDataUrl, contextLines, pageTitle }) {
    removeLensPanel();

    const panel = document.createElement("aside");
    panel.style.position = "fixed";
    panel.style.top = "0";
    panel.style.right = "0";
    panel.style.width = "min(380px, 92vw)";
    panel.style.height = "100vh";
    panel.style.zIndex = "2147483647";
    panel.style.background = "linear-gradient(180deg, #0b1220 0%, #020617 100%)";
    panel.style.borderLeft = "1px solid rgba(56,189,248,0.35)";
    panel.style.boxShadow = "-8px 0 24px rgba(2,6,23,0.45)";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.color = "#e2e8f0";
    panel.style.fontFamily = "Segoe UI, Arial, sans-serif";

    const header = document.createElement("div");
    header.style.padding = "12px 14px";
    header.style.borderBottom = "1px solid rgba(148,163,184,0.2)";
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";

    const title = document.createElement("div");
    title.textContent = "CAI Lens";
    title.style.fontSize = "15px";
    title.style.fontWeight = "700";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Close";
    closeBtn.style.cssText = "border:none;border-radius:8px;padding:6px 10px;cursor:pointer;background:#1e293b;color:#e2e8f0;font-size:12px;";
    closeBtn.addEventListener("click", removeLensPanel);

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.style.flex = "1";
    body.style.display = "flex";
    body.style.flexDirection = "column";
    body.style.minHeight = "0";
    body.style.padding = "12px";
    body.style.gap = "10px";

    const image = document.createElement("img");
    image.src = imageDataUrl;
    image.alt = "Selected snip";
    image.style.width = "100%";
    image.style.maxHeight = "220px";
    image.style.objectFit = "contain";
    image.style.border = "1px solid rgba(148,163,184,0.3)";
    image.style.borderRadius = "10px";
    image.style.background = "#0f172a";

    const chatStream = document.createElement("div");
    chatStream.style.flex = "1";
    chatStream.style.minHeight = "120px";
    chatStream.style.overflowY = "auto";
    chatStream.style.display = "flex";
    chatStream.style.flexDirection = "column";
    chatStream.style.gap = "8px";
    chatStream.style.padding = "4px 0";

    const composer = document.createElement("div");
    composer.style.display = "grid";
    composer.style.gridTemplateColumns = "1fr auto";
    composer.style.gap = "8px";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Ask about this snip...";
    input.style.cssText = "height:38px;border:1px solid rgba(148,163,184,0.35);border-radius:10px;padding:0 12px;background:#0f172a;color:#e2e8f0;font-size:13px;";

    const askBtn = document.createElement("button");
    askBtn.type = "button";
    askBtn.textContent = "Send";
    askBtn.style.cssText = "border:none;border-radius:10px;padding:0 14px;height:38px;cursor:pointer;background:#0284c7;color:white;font-weight:700;";

    const actionRow = document.createElement("div");
    actionRow.style.display = "grid";
    actionRow.style.gridTemplateColumns = "1fr 1fr";
    actionRow.style.gap = "8px";

    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.textContent = "Download";
    downloadBtn.style.cssText = "border:none;border-radius:10px;padding:10px;cursor:pointer;background:#16a34a;color:white;font-weight:700;";
    downloadBtn.addEventListener("click", async () => {
      try {
        await requestDownload(imageDataUrl, pageTitle);
        showToast("Snip downloaded.");
      } catch (error) {
        showToast(error.message || "Download failed.");
      }
    });

    const useContextBtn = document.createElement("button");
    useContextBtn.type = "button";
    useContextBtn.textContent = "Show Context";
    useContextBtn.style.cssText = "border:none;border-radius:10px;padding:10px;cursor:pointer;background:#334155;color:#e2e8f0;font-weight:700;";
    useContextBtn.addEventListener("click", () => {
      const contextText = contextLines.length
        ? `Visible context (${contextLines.length} lines):\n- ${contextLines.join("\n- ")}`
        : "No text context detected in selected area.";
      appendChatBubble(chatStream, contextText, "assistant");
    });

    function sendQuestion() {
      const question = (input.value || "").trim();
      if (!question) return;
      appendChatBubble(chatStream, question, "user");
      const answer = answerFromContext(question, contextLines);
      appendChatBubble(chatStream, answer, "assistant");
      input.value = "";
    }

    askBtn.addEventListener("click", sendQuestion);

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        sendQuestion();
      }
    });

    actionRow.appendChild(downloadBtn);
    actionRow.appendChild(useContextBtn);

    body.appendChild(image);
    body.appendChild(chatStream);
    body.appendChild(actionRow);
    composer.appendChild(input);
    composer.appendChild(askBtn);
    body.appendChild(composer);

    appendChatBubble(chatStream, "Snip ready. Ask your question from selected image/text.", "assistant");

    panel.appendChild(header);
    panel.appendChild(body);
    document.documentElement.appendChild(panel);
    STATE.lensPanel = panel;
  }

  async function openLensFromSelection() {
    if (!isValidRect(STATE.rect) || !chrome.runtime) {
      showToast("Select a larger area first.");
      cleanup();
      return;
    }

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    };

    try {
      if (STATE.overlay) STATE.overlay.style.display = 'none';
      await new Promise(r => setTimeout(r, 50)); // let DOM update
      const sourceDataUrl = await requestVisibleTabCapture(viewport);
      const croppedDataUrl = await cropImageDataUrl(sourceDataUrl, STATE.rect, viewport);
      const contextLines = collectTextFromRect(STATE.rect);
      createLensPanel({
        imageDataUrl: croppedDataUrl,
        contextLines,
        pageTitle: document.title || "Untitled"
      });
      showToast("CAI Lens opened.");
    } catch (error) {
      showToast(error.message || "Snip failed.");
    } finally {
      cleanup();
    }
  }

  function startSelection() {
    if (STATE.active) return false;
    removeLensPanel();
    STATE.active = true;

    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "2147483646";
    overlay.style.cursor = "crosshair";
    overlay.style.background = "rgba(2, 6, 23, 0.18)";
    overlay.style.userSelect = "none";

    const box = document.createElement("div");
    box.style.position = "absolute";
    box.style.border = "2px solid #38bdf8";
    box.style.background = "rgba(56, 189, 248, 0.2)";
    box.style.pointerEvents = "none";
    overlay.appendChild(box);

    let dragging = false;

    overlay.addEventListener("mousedown", (event) => {
      dragging = true;
      STATE.startX = event.clientX;
      STATE.startY = event.clientY;
      drawRect(event.clientX, event.clientY);
      event.preventDefault();
    });

    overlay.addEventListener("mousemove", (event) => {
      if (!dragging) return;
      drawRect(event.clientX, event.clientY);
      event.preventDefault();
    });

    overlay.addEventListener("mouseup", (event) => {
      if (!dragging) return;
      dragging = false;
      drawRect(event.clientX, event.clientY);
      if (isValidRect(STATE.rect)) {
        openLensFromSelection();
      } else {
        showToast("Select a larger area first.");
        cleanup();
      }
      event.preventDefault();
    });

    overlay.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      cleanup();
    });

    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cleanup();
      }
    });

    document.documentElement.appendChild(overlay);
    overlay.tabIndex = 0;
    overlay.focus();
    STATE.overlay = overlay;
    STATE.box = box;
    return true;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== "CAI_START_SNIP") return;

    const started = startSelection();
    if (!started) {
      sendResponse({ ok: false, message: "Snip already active on page." });
      return;
    }

    sendResponse({ ok: true });
  });
})();
