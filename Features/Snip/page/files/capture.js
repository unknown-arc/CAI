(function () {
  const snip = window.__CAI_SNIP__;

  snip.requestVisibleTabCapture = function requestVisibleTabCapture(viewport) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "CAI_CAPTURE_VISIBLE_TAB", viewport }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || "Capture failed."));
          return;
        }

        if (!response || !response.ok || !response.dataUrl) {
          reject(new Error((response && response.message) || "Capture failed."));
          return;
        }

        resolve(response.dataUrl);
      });
    });
  };

  snip.cropImageDataUrl = function cropImageDataUrl(sourceDataUrl, rect, viewport) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const viewportWidth = Math.max(1, Number((viewport && viewport.width) || image.width));
        const viewportHeight = Math.max(1, Number((viewport && viewport.height) || image.height));
        const scaleX = image.width / viewportWidth;
        const scaleY = image.height / viewportHeight;

        const sx = snip.clamp(Math.floor(rect.left * scaleX), 0, image.width - 1);
        const sy = snip.clamp(Math.floor(rect.top * scaleY), 0, image.height - 1);
        const sw = snip.clamp(Math.floor(rect.width * scaleX), 1, image.width - sx);
        const sh = snip.clamp(Math.floor(rect.height * scaleY), 1, image.height - sy);

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
  };

  snip.requestDownload = function requestDownload(dataUrl, pageTitle) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "CAI_DOWNLOAD_IMAGE_DATA_URL",
          dataUrl,
          pageTitle
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || "Download failed."));
            return;
          }

          if (!response || !response.ok) {
            reject(new Error((response && response.message) || "Download failed."));
            return;
          }

          resolve(response);
        }
      );
    });
  };
})();
