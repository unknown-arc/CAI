import { sendToActiveTab } from "../Services/tabMessenger.js";
import { copyText } from "../Services/clipboard.js";

function setWorking(button, value) {
  button.disabled = value;
  button.classList.toggle("active", value);
}

export function initializeAnalyzer({ statusEl, outputEl }) {
  const analyzerBtn = document.getElementById("analyzerBtn");
  if (!analyzerBtn || !statusEl || !outputEl) return;

  analyzerBtn.addEventListener("click", async () => {
    setWorking(analyzerBtn, true);
    statusEl.textContent = "Analyzing current page...";

    try {
      const response = await sendToActiveTab({ type: "CAI_ANALYZE_PAGE" });
      if (!response || !response.ok || !response.text) {
        statusEl.textContent = "No question/options found on this page.";
        outputEl.textContent = "No useful question block detected.";
        return;
      }

      outputEl.textContent = response.text;
      await copyText(response.text);
      statusEl.textContent = "Question + options copied to clipboard.";
    } catch (error) {
      statusEl.textContent = `Analyzer failed: ${error.message}`;
    } finally {
      setWorking(analyzerBtn, false);
    }
  });
}
