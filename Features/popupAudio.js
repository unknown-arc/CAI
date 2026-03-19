export function initializeAudioPlaceholder({ statusEl }) {
  const audioBtn = document.getElementById("audioBtn");
  if (!audioBtn || !statusEl) return;

  audioBtn.setAttribute("title", "Voice feature is coming in next update.");

  audioBtn.addEventListener("click", () => {
    statusEl.textContent = "Voice feature is upcoming. This button is a placeholder for now.";
  });
}
