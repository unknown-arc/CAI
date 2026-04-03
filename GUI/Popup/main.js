import { initializeSettings } from "../../Settings/Popup/main.js";
import { initializeAnalyzer } from "../../Features/Analyzer/popup/main.js";
import { initializeSnip } from "../../Features/Snip/popup/main.js";
import { initializeAudio } from "../../Features/Audio/popup/main.js";

function wirePopup() {
  const screenMain = document.getElementById("screen-main");
  const screenSettings = document.getElementById("screen-settings");
  const statusText = document.getElementById("statusText");
  const settingsBtn = document.getElementById("settingsBtn");

  const showMain = () => {
    screenMain.hidden = false;
    screenSettings.hidden = true;
    settingsBtn.classList.remove("active");
  };

  const showSettings = () => {
    screenMain.hidden = true;
    screenSettings.hidden = false;
    settingsBtn.classList.add("active");
  };

  settingsBtn.addEventListener("click", () => {
    if (screenSettings.hidden) {
      showSettings();
    } else {
      showMain();
    }
  });

  initializeSettings();
  initializeAnalyzer({ statusEl: statusText });
  initializeSnip({ statusEl: statusText });
  initializeAudio({ statusEl: statusText });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wirePopup);
} else {
  wirePopup();
}
