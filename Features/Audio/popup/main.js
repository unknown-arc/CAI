import { sendToActiveTab } from "../../../Services/TabMessenger/main.js";

export function initializeAudio({ statusEl }) {
  const audioBtn = document.getElementById("audioBtn");
  if (!audioBtn || !statusEl) return;

  audioBtn.addEventListener("click", async () => {
    try {
      const response = await sendToActiveTab({ action: "toggleAudioCaptions" });
      statusEl.textContent = response ? `Audio: ${response.status}` : "Audio toggled";
    } catch (_error) {
      statusEl.textContent = "Error: Please refresh the page before turning on audio captions.";
    }
  });
}
