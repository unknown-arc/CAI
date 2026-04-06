(function () {
  const TOOLBAR_ID = "cai-floating-toolbar-root";
  const DEFAULT_POSITION = { x: 24, y: 110 };

  let currentFeature = "analyzer";
  let isVisible = false;
  let enabledFeatures = {
    analyzer: true,
    snip: true,
    voice: true
  };

  const state = {
    host: null,
    container: null,
    title: null,
    status: null,
    dragHandle: null,
    dragging: false,
    dragPointerId: null,
    offsetX: 0,
    offsetY: 0,
    lastX: DEFAULT_POSITION.x,
    lastY: DEFAULT_POSITION.y
  };

  const featureLabels = {
    analyzer: "Analyzer",
    snip: "Snip",
    voice: "Voice",
    settings: "Settings"
  };

  function setStatus(text) {
    if (!state.status) return;
    state.status.textContent = text;
  }

  function getFirstEnabledFeature() {
    if (enabledFeatures.analyzer) return "analyzer";
    if (enabledFeatures.snip) return "snip";
    if (enabledFeatures.voice) return "voice";
    return "analyzer";
  }

  function normalizeFeature(feature) {
    if (!featureLabels[feature]) {
      return getFirstEnabledFeature();
    }

    if ((feature === "analyzer" && !enabledFeatures.analyzer) ||
      (feature === "snip" && !enabledFeatures.snip) ||
      (feature === "voice" && !enabledFeatures.voice)) {
      return getFirstEnabledFeature();
    }

    return feature;
  }

  function updateFeatureButtonsVisibility() {
    if (!state.container) return;

    const buttons = state.container.querySelectorAll(".btn");
    buttons.forEach((button) => {
      const feature = button.dataset.feature;
      if (!feature) return;

      const allowed = Boolean(enabledFeatures[feature]);
      button.style.display = allowed ? "flex" : "none";
    });

    const actions = state.container.querySelector(".actions");
    if (actions) {
      const visibleCount = Array.from(buttons).filter((b) => b.style.display !== "none").length;
      actions.style.display = visibleCount > 0 ? "flex" : "none";
      if (visibleCount === 0) {
        setStatus("No feature enabled in Settings.");
      }
    }
  }

  function updateActiveButton() {
    if (!state.container) return;
    const buttons = state.container.querySelectorAll(".btn");
    buttons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.feature === currentFeature);
    });
  }

  function setFeature(feature) {
    currentFeature = normalizeFeature(feature);
    if (state.title) {
      state.title.textContent = featureLabels[currentFeature];
    }
    updateActiveButton();
  }

  function setEnabledFeatures(payload) {
    enabledFeatures = {
      analyzer: payload?.analyzer !== false,
      snip: payload?.snip !== false,
      voice: payload?.voice !== false
    };

    updateFeatureButtonsVisibility();
    setFeature(currentFeature);
  }

  function moveToolbar(x, y) {
    if (!state.container) return;
    const safeX = Math.max(8, Math.min(x, window.innerWidth - 248));
    const safeY = Math.max(8, Math.min(y, window.innerHeight - 180));
    state.lastX = safeX;
    state.lastY = safeY;
    state.container.style.left = `${safeX}px`;
    state.container.style.top = `${safeY}px`;
  }

  function ensureUi() {
    if (state.host) return;

    const host = document.createElement("div");
    host.id = TOOLBAR_ID;
    host.style.position = "fixed";
    host.style.zIndex = "2147483645";
    host.style.left = "0";
    host.style.top = "0";

    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .toolbar {
        position: fixed;
        width: 260px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #1f2937;
        user-select: none;
        overflow: hidden;
      }
      .handle {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        background: #f9fafb;
        border-bottom: 1px solid #f3f4f6;
        cursor: grab;
      }
      .handle:active { cursor: grabbing; }
      .grip-icon {
        display: flex;
        color: #9ca3af;
      }
      .title {
        flex: 1;
        font-size: 13px;
        font-weight: 700;
        text-transform: capitalize;
        color: #374151;
      }
      .close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: #9ca3af;
        border-radius: 6px;
        padding: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .close-btn:hover {
        background: #fee2e2;
        color: #ef4444;
      }
      .actions {
        display: flex;
        gap: 6px;
        padding: 12px;
      }
      .btn {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 10px;
        padding: 10px 4px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        color: #6b7280;
        transition: all 0.2s ease;
      }
      .btn:hover {
        background: #f3f4f6;
        color: #1f2937;
      }
      .btn.active {
        background: #ccfbf1;
        color: #0f766e;
        border-color: rgba(15, 118, 110, 0.2);
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
      .btn svg {
        transition: transform 0.2s ease;
      }
      .btn:hover svg {
        transform: translateY(-2px);
      }
      .status-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        border-top: 1px solid #f3f4f6;
        background: #fdfdfd;
        padding: 8px 14px;
      }
      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #10b981;
        box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
      }
      .status-text {
        font-size: 11px;
        font-weight: 600;
        color: #6b7280;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;

    const container = document.createElement("div");
    container.className = "toolbar";
    container.innerHTML = `
      <div class="handle">
        <div class="grip-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
        </div>
        <span class="title">${featureLabels[currentFeature]}</span>
        <button class="close-btn" type="button" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div class="actions">
        <button class="btn" type="button" data-feature="analyzer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <span>Analyzer</span>
        </button>
        <button class="btn" type="button" data-feature="snip">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12H8l-4 4 4 4h12"/><path d="M16 8V4l-4 4-4-4v4"/></svg>
          <span>Snip</span>
        </button>
        <button class="btn" type="button" data-feature="voice">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          <span>Voice</span>
        </button>
      </div>
      <div class="status-bar">
        <div class="status-dot"></div>
        <div class="status-text">Ready</div>
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(container);
    document.documentElement.appendChild(host);

    state.host = host;
    state.container = container;
    state.dragHandle = container.querySelector(".handle");
    state.title = container.querySelector(".title");
    state.status = container.querySelector(".status-text");

    container.querySelector(".close-btn").addEventListener("click", () => {
      isVisible = false;
      host.style.display = "none";
      if (chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ extensionActive: false });
      }
    });

    container.querySelectorAll(".btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const feature = btn.dataset.feature;
        if (!feature || !enabledFeatures[feature]) return;
        runFeature(feature);
      });
    });

    state.dragHandle.addEventListener("pointerdown", (event) => {
      state.dragging = true;
      state.dragPointerId = event.pointerId;
      state.offsetX = event.clientX - state.lastX;
      state.offsetY = event.clientY - state.lastY;
      state.dragHandle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    state.dragHandle.addEventListener("pointermove", (event) => {
      if (!state.dragging || event.pointerId !== state.dragPointerId) return;
      moveToolbar(event.clientX - state.offsetX, event.clientY - state.offsetY);
      event.preventDefault();
    });

    const stopDrag = (event) => {
      if (event.pointerId !== state.dragPointerId) return;
      state.dragging = false;
      state.dragPointerId = null;
      event.preventDefault();
    };

    state.dragHandle.addEventListener("pointerup", stopDrag);
    state.dragHandle.addEventListener("pointercancel", stopDrag);

    updateFeatureButtonsVisibility();
    updateActiveButton();
    moveToolbar(state.lastX, state.lastY);
  }

  function updateVisibility(visible) {
    isVisible = Boolean(visible);
    ensureUi();
    if (!state.host) return;
    state.host.style.display = isVisible ? "block" : "none";
  }

  async function requestForward(payload) {
    try {
      return await chrome.runtime.sendMessage({ type: "CAI_FORWARD_TO_TAB", payload });
    } catch (_error) {
      return { ok: false, message: "Unable to communicate with extension." };
    }
  }

  async function runFeature(feature) {
    setFeature(feature);

    if (feature === "analyzer") {
      setStatus("Analyzing page...");
      const response = await requestForward({ type: "CAI_ANALYZE_PAGE" });
      if (!response || !response.ok || !response.text) {
        setStatus("No question block detected.");
        return;
      }

      try {
        await navigator.clipboard.writeText(response.text);
        setStatus("Analyzer done. Copied to clipboard.");
      } catch (_error) {
        setStatus("Analyzer done. Copy permission blocked.");
      }
      return;
    }

    if (feature === "snip") {
      setStatus("Snip mode started.");
      const response = await requestForward({ type: "CAI_START_SNIP" });
      if (!response || !response.ok) {
        setStatus(response?.message || "Unable to start snip mode.");
        return;
      }
      setStatus("Select area on page.");
      return;
    }

    if (feature === "voice") {
      setStatus("Toggling voice captions...");
      const response = await requestForward({ action: "toggleAudioCaptions" });
      setStatus(response?.status || "Voice toggled.");
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message.type !== "string") {
      return;
    }

    if (message.type === "CAI_TOOLBAR_SET_VISIBILITY") {
      updateVisibility(Boolean(message.visible));
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "CAI_TOOLBAR_SET_FEATURE") {
      setFeature(message.feature);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "CAI_TOOLBAR_SET_ENABLED_FEATURES") {
      setEnabledFeatures(message.enabledFeatures);
      sendResponse({ ok: true });
    }
  });

  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(
      {
        extensionActive: false,
        activeFeature: "analyzer",
        toolbarAnalyzerEnabled: true,
        toolbarSnipEnabled: true,
        toolbarVoiceEnabled: true
      },
      (items) => {
        setEnabledFeatures({
          analyzer: items.toolbarAnalyzerEnabled !== false,
          snip: items.toolbarSnipEnabled !== false,
          voice: items.toolbarVoiceEnabled !== false
        });
        setFeature(items.activeFeature);
        updateVisibility(items.extensionActive);
      }
    );
  }
})();
