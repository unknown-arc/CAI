(function () {
  const snip = window.__CAI_SNIP__;

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

  snip.createLensPanel = function createLensPanel(payload) {
    const imageDataUrl = payload.imageDataUrl;
    const contextLines = payload.contextLines;
    const pageTitle = payload.pageTitle;

    snip.removeLensPanel();

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
    closeBtn.addEventListener("click", snip.removeLensPanel);

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
        await snip.requestDownload(imageDataUrl, pageTitle);
        snip.showToast("Snip downloaded.");
      } catch (error) {
        snip.showToast(error.message || "Download failed.");
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
      const answer = snip.answerFromContext(question, contextLines);
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
    snip.STATE.lensPanel = panel;
  };
})();
