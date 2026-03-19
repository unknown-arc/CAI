(function () {
  const STATE = {
    active: false,
    startX: 0,
    startY: 0,
    rect: null,
    overlay: null,
    box: null,
    controls: null
  };

  function cleanup() {
    if (STATE.overlay && document.contains(STATE.overlay)) {
      STATE.overlay.remove();
    }
    STATE.active = false;
    STATE.overlay = null;
    STATE.box = null;
    STATE.controls = null;
    STATE.rect = null;
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

  function saveSnip() {
    if (!STATE.rect || !chrome.storage || !chrome.storage.local) {
      showToast("Snip save unavailable.");
      cleanup();
      return;
    }

    chrome.storage.local.get({ savedSnips: [] }, (items) => {
      const entry = {
        id: Date.now(),
        url: location.href,
        title: document.title || "Untitled",
        createdAt: new Date().toISOString(),
        rect: STATE.rect
      };

      const next = Array.isArray(items.savedSnips) ? items.savedSnips.slice() : [];
      next.unshift(entry);
      chrome.storage.local.set({ savedSnips: next }, () => {
        showToast("Snip saved on device.");
        cleanup();
      });
    });
  }

  function showControls() {
    const controls = document.createElement("div");
    controls.style.position = "absolute";
    controls.style.zIndex = "2147483647";
    controls.style.display = "inline-flex";
    controls.style.gap = "6px";
    controls.style.left = `${STATE.rect.left + STATE.rect.width + 6}px`;
    controls.style.top = `${STATE.rect.top + STATE.rect.height + 6}px`;

    const tick = document.createElement("button");
    tick.type = "button";
    tick.textContent = "✓";
    tick.style.cssText = "width:30px;height:30px;border:none;border-radius:8px;cursor:pointer;background:#16a34a;color:white;font-size:16px;font-weight:700;";
    tick.addEventListener("click", saveSnip);

    const cross = document.createElement("button");
    cross.type = "button";
    cross.textContent = "✕";
    cross.style.cssText = "width:30px;height:30px;border:none;border-radius:8px;cursor:pointer;background:#dc2626;color:white;font-size:16px;font-weight:700;";
    cross.addEventListener("click", cleanup);

    controls.appendChild(tick);
    controls.appendChild(cross);
    STATE.overlay.appendChild(controls);
    STATE.controls = controls;
  }

  function startSelection() {
    if (STATE.active) return false;
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
      if (STATE.controls && document.contains(STATE.controls)) {
        STATE.controls.remove();
      }
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
      showControls();
      event.preventDefault();
    });

    overlay.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      cleanup();
    });

    document.documentElement.appendChild(overlay);
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
