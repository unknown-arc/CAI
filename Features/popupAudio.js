export function initializeAudioPlaceholder({ statusEl }) {
  const audioBtn = document.getElementById("audioBtn");
  if (!audioBtn || !statusEl) return;

  audioBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleAudioCaptions" }, (response) => {
        if (chrome.runtime.lastError) {
          statusEl.textContent = "Error: Please refresh the page before turning on audio captions.";
        } else {
          statusEl.textContent = response ? `Audio: ${response.status}` : "Audio toggled";
        }
      });
    });
  });
}
