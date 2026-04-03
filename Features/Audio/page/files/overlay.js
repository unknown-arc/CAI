(function () {
  const audio = window.__CAI_AUDIO__;

  audio.createOverlay = function createOverlay() {
    if (audio.state.audioOverlay) return;

    const overlay = document.createElement("div");
    overlay.id = "cai-audio-overlay";

    Object.assign(overlay.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      width: "80%",
      maxWidth: "800px",
      minHeight: "60px",
      maxHeight: "300px",
      overflowY: "auto",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      color: "#fff",
      borderRadius: "10px",
      padding: "20px",
      zIndex: "999999",
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
      pointerEvents: "none",
      boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      backdropFilter: "blur(5px)",
      transition: "all 0.3s ease"
    });

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "8px";

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    audio.state.audioOverlay = overlay;
    audio.state.captionsContainer = container;
  };

  audio.removeOverlay = function removeOverlay() {
    if (audio.state.audioOverlay) {
      audio.state.audioOverlay.remove();
      audio.state.audioOverlay = null;
      audio.state.captionsContainer = null;
      audio.state.currentMicInterimSpan = null;
      audio.state.currentSystemInterimSpan = null;
    }
  };

  audio.appendCaption = function appendCaption(text, options) {
    const cfg = options || {};
    const isInterim = Boolean(cfg.isInterim);
    const color = cfg.color || "#4ade80";
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
        interimSpan.style.color = "#a3a3a3";
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

      if (audio.state.captionsContainer.children.length > 10) {
        audio.state.captionsContainer.removeChild(audio.state.captionsContainer.firstChild);
      }
    }

    if (audio.state.audioOverlay) {
      audio.state.audioOverlay.scrollTop = audio.state.audioOverlay.scrollHeight;
    }
  };
})();
