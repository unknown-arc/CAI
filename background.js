function sanitizeFileName(input) {
  const base = (input || "snip")
    .replace(/[<>:\\"/|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (base || "snip").slice(0, 80);
}

function captureVisibleTab(windowId) {
  return new Promise((resolve, reject) => {
    // Explicitly query active tab if windowId is unreliable
    if (windowId == null) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return reject(new Error("No active tab for capture."));
        captureVisibleTab(tabs[0].windowId).then(resolve).catch(reject);
      });
      return;
    }

    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!dataUrl) {
        reject(new Error("Unable to capture current tab."));
        return;
      }
      resolve(dataUrl);
    });
  });
}

function downloadDataUrl(dataUrl, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url: dataUrl,
        filename,
        conflictAction: "uniquify",
        saveAs: false
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(downloadId);
      }
    );
  });
}

function sendMessageToSenderTab(sender, payload) {
  return new Promise((resolve, reject) => {
    const tabId = sender?.tab?.id;
    if (typeof tabId !== "number") {
      reject(new Error("No sender tab available."));
      return;
    }

    chrome.tabs.sendMessage(tabId, payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function handleDownloadSnip(message, sender) {
  const dataUrl = message?.dataUrl;
  if (!dataUrl || typeof dataUrl !== "string") {
    return { ok: false, message: "Download image payload missing." };
  }

  const pageTitle = sanitizeFileName(message?.pageTitle || "snip");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `CAI Snips/${pageTitle}-${timestamp}.png`;

  await downloadDataUrl(dataUrl, filename);
  return { ok: true };
}

async function handleVisibleCapture(_message, sender) {
  const dataUrl = await captureVisibleTab(sender?.tab?.windowId);
  return { ok: true, dataUrl };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return;
  }

  if (message.type === "CAI_CAPTURE_VISIBLE_TAB") {
    handleVisibleCapture(message, sender)
      .then((result) => sendResponse(result))
      .catch((error) => {
        sendResponse({ ok: false, message: error.message || "Unable to capture tab." });
      });
    return true;
  }

  if (message.type === "CAI_DOWNLOAD_IMAGE_DATA_URL") {
    handleDownloadSnip(message, sender)
      .then((result) => sendResponse(result))
      .catch((error) => {
        sendResponse({ ok: false, message: error.message || "Unable to download image." });
      });
    return true;
  }

  if (message.type === "CAI_FORWARD_TO_TAB") {
    sendMessageToSenderTab(sender, message.payload)
      .then((result) => sendResponse(result))
      .catch((error) => {
        sendResponse({ ok: false, message: error.message || "Unable to forward message." });
      });
    return true;
  }
});
