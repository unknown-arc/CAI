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

  const MIN_SELECTION_SIZE = 8;

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

  function getSafeControlPosition(rect) {
    const controlWidth = 66;
    const controlHeight = 34;
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - controlWidth - margin);
    const maxTop = Math.max(margin, window.innerHeight - controlHeight - margin);

    const desiredLeft = rect.left + rect.width + 6;
    const desiredTop = rect.top + rect.height + 6;

    return {
      left: clamp(desiredLeft, margin, maxLeft),
      top: clamp(desiredTop, margin, maxTop)
    };
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

  async function downloadSnip() {
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
      await requestDownload(croppedDataUrl, document.title || "Untitled");
      showToast("Snip downloaded.");
    } catch (error) {
      showToast(error.message || "Snip failed.");
    } finally {
      cleanup();
    }
  }

  function showControls() {
    const controls = document.createElement("div");
    controls.style.position = "absolute";
    controls.style.zIndex = "2147483647";
    controls.style.display = "inline-flex";
    controls.style.gap = "6px";
    const position = getSafeControlPosition(STATE.rect);
    controls.style.left = `${position.left}px`;
    controls.style.top = `${position.top}px`;

    // Prevent clicks from bubbling to overlay and restarting snip
    controls.addEventListener("mousedown", (e) => e.stopPropagation());
    controls.addEventListener("mouseup", (e) => e.stopPropagation());
    controls.addEventListener("click", (e) => e.stopPropagation());

    const tick = document.createElement("button");
    tick.type = "button";
    tick.textContent = "✓";
    tick.style.cssText = "width:30px;height:30px;border:none;border-radius:8px;cursor:pointer;background:#16a34a;color:white;font-size:16px;font-weight:700;";
    tick.addEventListener("click", downloadSnip);

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
      // Ignore if clicking on existing controls
      if (STATE.controls && STATE.controls.contains(event.target)) {
        return;
      }
      
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
      
      // Only show controls if a valid area was drawn
      if (STATE.rect && STATE.rect.width > 8 && STATE.rect.height > 8) {
        showControls();
      } else if (STATE.controls && document.contains(STATE.controls)) {
        STATE.controls.remove();
        STATE.controls = null;
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
