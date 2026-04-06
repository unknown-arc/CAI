(function () {
  const audio = window.__CAI_AUDIO__;

  function applyToggleButtonState(button, enabled, label) {
    if (!button) return;
    button.innerHTML = `<span style="opacity:0.8;margin-right:4px;">${label}</span><span style="font-weight:800;color:${enabled ? "#10b981" : "#ef4444"}">${enabled ? "ON" : "OFF"}</span>`;
    button.style.background = enabled ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.1)";
    button.style.borderColor = enabled ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.3)";
    button.style.boxShadow = enabled ? "0 0 12px rgba(16, 185, 129, 0.15)" : "none";
  }

  audio.renderControlState = function renderControlState() {
    applyToggleButtonState(audio.state.micToggleBtn, audio.state.micEnabled, "Microphone");
    applyToggleButtonState(audio.state.systemToggleBtn, audio.state.systemEnabled, "System");
    applyToggleButtonState(audio.state.aiToggleBtn, audio.state.aiEnabled, "AI");
  };

  audio.appendAiResponse = function appendAiResponse(text) {
    if (!audio.state.aiResponseContainer) return;
    audio.state.aiResponseContainer.textContent = text;
  };

  audio.createOverlay = function createOverlay() {
    if (audio.state.audioOverlay) return;

    const overlay = document.createElement("div");
    overlay.id = "cai-audio-overlay";

    Object.assign(overlay.style, {
      position: "fixed",
      left: "2%",
      right: "2%",
      bottom: "20px",
      height: "32vh",
      minHeight: "200px",
      maxHeight: "300px",
      backgroundColor: "rgba(15, 23, 42, 0.65)",
      color: "#e5e7eb",
      borderRadius: "16px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      padding: "16px",
      zIndex: "2147483647",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: "13px",
      pointerEvents: "auto",
      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      backdropFilter: "blur(16px) saturate(180%)",
      WebkitBackdropFilter: "blur(16px) saturate(180%)",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
    });

    const styleTag = document.createElement("style");
    styleTag.textContent = `
      #cai-audio-overlay ::-webkit-scrollbar { width: 6px; }
      #cai-audio-overlay ::-webkit-scrollbar-track { background: transparent; }
      #cai-audio-overlay ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 10px; }
      #cai-audio-overlay ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
    `;
    overlay.appendChild(styleTag);

    const controls = document.createElement("div");
    Object.assign(controls.style, {
      display: "flex",
      gap: "10px",
      alignItems: "center",
      flexWrap: "wrap",
      paddingBottom: "10px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
    });

    const micToggleBtn = document.createElement("button");
    micToggleBtn.type = "button";
    const systemToggleBtn = document.createElement("button");
    systemToggleBtn.type = "button";
    const aiToggleBtn = document.createElement("button");
    aiToggleBtn.type = "button";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Close";

    [micToggleBtn, systemToggleBtn, aiToggleBtn].forEach((button) => {
      Object.assign(button.style, {
        border: "1px solid transparent",
        borderRadius: "20px",
        padding: "6px 14px",
        fontSize: "12px",
        fontWeight: "600",
        cursor: "pointer",
        color: "#f8fafc",
        transition: "all 0.2s ease",
        outline: "none"
      });
      controls.appendChild(button);
    });

    Object.assign(closeBtn.style, {
      marginLeft: "auto",
      border: "1px solid rgba(239, 68, 68, 0.45)",
      borderRadius: "10px",
      padding: "6px 10px",
      fontSize: "12px",
      fontWeight: "700",
      cursor: "pointer",
      background: "rgba(239, 68, 68, 0.18)",
      color: "#fecaca"
    });
    controls.appendChild(closeBtn);

    const splitLayout = document.createElement("div");
    Object.assign(splitLayout.style, {
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
      gap: "12px",
      flex: "1",
      minHeight: "0"
    });

    const panelStyle = {
      border: "1px solid rgba(255, 255, 255, 0.06)",
      borderRadius: "12px",
      background: "rgba(0, 0, 0, 0.25)",
      display: "flex",
      flexDirection: "column",
      minHeight: "0",
      boxShadow: "inset 0 2px 10px rgba(0,0,0,0.15)"
    };

    const leftPanel = document.createElement("div");
    Object.assign(leftPanel.style, panelStyle);

    const leftTitle = document.createElement("div");
    leftTitle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:text-bottom;"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg> Live Transcript <span style="opacity:0.5;font-weight:normal;font-size:11px;margin-left:4px;">(Mic + System)</span>`;
    Object.assign(leftTitle.style, {
      padding: "10px 14px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
      fontWeight: "700",
      fontSize: "12px",
      color: "#38bdf8",
      display: "flex",
      alignItems: "center"
    });

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "8px";
    container.style.padding = "14px";
    container.style.overflowY = "auto";
    container.style.minHeight = "0";
    container.style.fontSize = "13px";
    container.style.lineHeight = "1.5";

    const rightPanel = document.createElement("div");
    Object.assign(rightPanel.style, panelStyle);

    const rightTitle = document.createElement("div");
    rightTitle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px;vertical-align:text-bottom;"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/></svg> AI Response`;
    Object.assign(rightTitle.style, {
      padding: "10px 14px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
      fontWeight: "700",
      fontSize: "12px",
      color: "#a78bfa",
      display: "flex",
      alignItems: "center"
    });

    const aiResponse = document.createElement("div");
    aiResponse.textContent = "AI is ready. Final transcript will appear here as response.";
    Object.assign(aiResponse.style, {
      padding: "14px",
      overflowY: "auto",
      minHeight: "0",
      whiteSpace: "pre-wrap",
      lineHeight: "1.5",
      color: "#f1f5f9",
      fontSize: "13px"
    });

    leftPanel.appendChild(leftTitle);
    leftPanel.appendChild(container);

    rightPanel.appendChild(rightTitle);
    rightPanel.appendChild(aiResponse);

    splitLayout.appendChild(leftPanel);
    splitLayout.appendChild(rightPanel);

    overlay.appendChild(controls);
    overlay.appendChild(splitLayout);
    document.body.appendChild(overlay);

    audio.state.audioOverlay = overlay;
    audio.state.captionsContainer = container;
    audio.state.aiResponseContainer = aiResponse;
    audio.state.micToggleBtn = micToggleBtn;
    audio.state.systemToggleBtn = systemToggleBtn;
    audio.state.aiToggleBtn = aiToggleBtn;

    micToggleBtn.addEventListener("click", () => {
      if (typeof audio.toggleSource === "function") {
        audio.toggleSource("mic");
      }
    });

    systemToggleBtn.addEventListener("click", () => {
      if (typeof audio.toggleSource === "function") {
        audio.toggleSource("system");
      }
    });

    aiToggleBtn.addEventListener("click", () => {
      if (typeof audio.toggleSource === "function") {
        audio.toggleSource("ai");
      }
    });

    closeBtn.addEventListener("click", () => {
      audio.state.isActive = false;
      if (typeof audio.stopRecognition === "function") {
        audio.stopRecognition();
      }
      audio.removeOverlay();
    });

    audio.renderControlState();
  };

  audio.removeOverlay = function removeOverlay() {
    if (audio.state.audioOverlay) {
      audio.state.audioOverlay.remove();
      audio.state.audioOverlay = null;
      audio.state.captionsContainer = null;
      audio.state.aiResponseContainer = null;
      audio.state.micToggleBtn = null;
      audio.state.systemToggleBtn = null;
      audio.state.aiToggleBtn = null;
      audio.state.currentMicInterimSpan = null;
      audio.state.currentSystemInterimSpan = null;
    }
  };

  audio.appendCaption = function appendCaption(text, options) {
    const cfg = options || {};
    const isInterim = Boolean(cfg.isInterim);
    const color = cfg.color || "#34d399";
    const source = cfg.source || "mic";

    if (!audio.state.captionsContainer) return;

    const prefix = source === "system" ? "[SYSTEM] " : "[MIC] ";
    const fullText = `${prefix}${text}`;

    const getInterimRef = () => (source === "system" ? audio.state.currentSystemInterimSpan : audio.state.currentMicInterimSpan);
    const setInterimRef = (value) => {
      if (source === "system") {
        audio.state.currentSystemInterimSpan = value;
      } else {
        audio.state.currentMicInterimSpan = value;
      }
    };

    if (isInterim) {
      let interimSpan = getInterimRef();
      if (!interimSpan) {
        interimSpan = document.createElement("div");
        interimSpan.style.color = "#94a3b8";
        interimSpan.style.fontStyle = "italic";
        audio.state.captionsContainer.appendChild(interimSpan);
        setInterimRef(interimSpan);
      }
      interimSpan.textContent = fullText;
    } else {
      const interimSpan = getInterimRef();
      if (interimSpan) {
        interimSpan.remove();
        setInterimRef(null);
      }
      const newFinalLine = document.createElement("div");
      newFinalLine.style.color = color;
      newFinalLine.textContent = fullText;
      audio.state.captionsContainer.appendChild(newFinalLine);

      if (audio.state.captionsContainer.children.length > 30) {
        audio.state.captionsContainer.removeChild(audio.state.captionsContainer.firstChild);
      }
    }

    if (audio.state.audioOverlay) {
      const scrollContainer = audio.state.captionsContainer;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  };
})();
