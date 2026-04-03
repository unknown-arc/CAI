(function () {
  const STATE = {
    enabled: false,
    indicatorEl: null,
    selectionStyleEl: null
  };

  const STYLE_ID = "cai-selection-style";

  function ensureIndicator() {
    if (STATE.indicatorEl) return STATE.indicatorEl;

    const el = document.createElement("div");
    el.id = "cai-selection-indicator";
    el.style.position = "fixed";
    el.style.right = "8px";
    el.style.bottom = "8px";
    el.style.maxWidth = "260px";
    el.style.zIndex = "2147483646";
    el.style.padding = "6px 10px";
    el.style.borderRadius = "999px";
    el.style.fontSize = "11px";
    el.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    el.style.color = "#e2e8f0";
    el.style.background = "rgba(15,23,42,0.88)";
    el.style.border = "1px solid rgba(59,130,246,0.8)";
    el.style.boxShadow = "0 8px 20px rgba(15,23,42,0.7)";
    el.style.pointerEvents = "none";
    el.style.display = "none";

    document.documentElement.appendChild(el);
    STATE.indicatorEl = el;
    return el;
  }

  function ensureSelectionStyle() {
    if (STATE.selectionStyleEl && document.contains(STATE.selectionStyleEl)) {
      return STATE.selectionStyleEl;
    }

    let styleEl = document.getElementById(STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;
      styleEl.textContent = "*::selection{background:transparent!important;}*::-moz-selection{background:transparent!important;}";
      (document.head || document.documentElement).appendChild(styleEl);
    }

    STATE.selectionStyleEl = styleEl;
    return styleEl;
  }

  function hideIndicator() {
    if (STATE.indicatorEl) {
      STATE.indicatorEl.style.display = "none";
    }
  }

  function showIndicator(text) {
    const el = ensureIndicator();
    el.textContent = text.length > 80 ? `${text.slice(0, 77)}...` : text;
    el.style.display = "block";
  }

  function onMouseUp() {
    if (!STATE.enabled) return;

    const selection = window.getSelection();
    if (!selection) {
      hideIndicator();
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      hideIndicator();
      return;
    }

    showIndicator(text);
  }

  function applyEnabled(enabled) {
    STATE.enabled = !!enabled;
    if (STATE.enabled) {
      ensureIndicator();
      ensureSelectionStyle();
    } else {
      hideIndicator();
      if (STATE.selectionStyleEl && document.contains(STATE.selectionStyleEl)) {
        STATE.selectionStyleEl.remove();
      }
      STATE.selectionStyleEl = null;
    }
  }

  function initFromStorage() {
    if (!chrome.storage || !chrome.storage.sync) {
      return;
    }

    chrome.storage.sync.get({ selectionHighlight: false }, (items) => {
      applyEnabled(items.selectionHighlight);
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync" || !changes.selectionHighlight) return;
      applyEnabled(changes.selectionHighlight.newValue);
    });
  }

  document.addEventListener("mouseup", onMouseUp);
  initFromStorage();
})();
