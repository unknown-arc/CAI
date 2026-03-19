export function initializeAudioPlaceholder({ statusEl }) {
  const audioBtn = document.getElementById("audioBtn");
  if (!audioBtn || !statusEl) return;

  audioBtn.addEventListener("click", () => {
    statusEl.textContent = "Audio feature is reserved for future update.";
  });
}
