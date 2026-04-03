(function () {
  const snip = window.__CAI_SNIP__;

  function drawRect(clientX, clientY) {
    const left = Math.min(snip.STATE.startX, clientX);
    const top = Math.min(snip.STATE.startY, clientY);
    const width = Math.max(1, Math.abs(clientX - snip.STATE.startX));
    const height = Math.max(1, Math.abs(clientY - snip.STATE.startY));

    snip.STATE.rect = { left, top, width, height };
    snip.STATE.box.style.left = `${left}px`;
    snip.STATE.box.style.top = `${top}px`;
    snip.STATE.box.style.width = `${width}px`;
    snip.STATE.box.style.height = `${height}px`;
  }

  function isValidRect(rect) {
    return Boolean(
      rect &&
        Number.isFinite(rect.left) &&
        Number.isFinite(rect.top) &&
        Number.isFinite(rect.width) &&
        Number.isFinite(rect.height) &&
        rect.width >= snip.MIN_SELECTION_SIZE &&
        rect.height >= snip.MIN_SELECTION_SIZE
    );
  }

  async function openLensFromSelection() {
    if (!isValidRect(snip.STATE.rect) || !chrome.runtime) {
      snip.showToast("Select a larger area first.");
      snip.cleanup();
      return;
    }

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    };

    try {
      if (snip.STATE.overlay) snip.STATE.overlay.style.display = "none";
      await new Promise((r) => setTimeout(r, 50));
      const sourceDataUrl = await snip.requestVisibleTabCapture(viewport);
      const croppedDataUrl = await snip.cropImageDataUrl(sourceDataUrl, snip.STATE.rect, viewport);
      const contextLines = snip.collectTextFromRect(snip.STATE.rect);
      snip.createLensPanel({
        imageDataUrl: croppedDataUrl,
        contextLines,
        pageTitle: document.title || "Untitled"
      });
      snip.showToast("CAI Lens opened.");
    } catch (error) {
      snip.showToast(error.message || "Snip failed.");
    } finally {
      snip.cleanup();
    }
  }

  function startSelection() {
    if (snip.STATE.active) return false;
    snip.removeLensPanel();
    snip.STATE.active = true;

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
      snip.STATE.startX = event.clientX;
      snip.STATE.startY = event.clientY;
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
      if (isValidRect(snip.STATE.rect)) {
        openLensFromSelection();
      } else {
        snip.showToast("Select a larger area first.");
        snip.cleanup();
      }
      event.preventDefault();
    });

    overlay.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      snip.cleanup();
    });

    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        snip.cleanup();
      }
    });

    document.documentElement.appendChild(overlay);
    overlay.tabIndex = 0;
    overlay.focus();
    snip.STATE.overlay = overlay;
    snip.STATE.box = box;
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
