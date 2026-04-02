import { sendToActiveTab } from "../Services/tabMessenger.js";

export function initializeSnip({ statusEl }) {
  const snipBtn = document.getElementById("snipBtn");
  if (!snipBtn || !statusEl) return;

  snipBtn.addEventListener("click", async () => {
    snipBtn.classList.add("active");
    statusEl.textContent = "Snip mode started. Drag area, then press tick to download.";

    try {
      const response = await sendToActiveTab({ type: "CAI_START_SNIP" });
      if (!response || !response.ok) {
        statusEl.textContent = response?.message || "Unable to start snip mode.";
        return;
      }

      statusEl.textContent = "Selection active on page. Tick = download, cross = close.";
    } catch (error) {
      statusEl.textContent = `Snip failed: ${error.message}`;
    } finally {
      snipBtn.classList.remove("active");
    }
  });
}
