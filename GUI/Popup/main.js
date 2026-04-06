import { initializeSettings } from "../../Settings/Popup/main.js";
import { sendToActiveTab } from "../../Services/TabMessenger/main.js";
import { copyText } from "../../Services/Clipboard/main.js";

const DEFAULT_POPUP_STATE = {
  activeFeature: "analyzer",
  extensionActive: false,
  selectedModel: "openai/gpt-4.1",
  toolbarAnalyzerEnabled: true,
  toolbarSnipEnabled: true,
  toolbarVoiceEnabled: true
};

const FEATURE_META = {
  analyzer: { title: "Analyzer", subtitle: "Selected feature" },
  snip: { title: "Snip", subtitle: "Selected feature" },
  voice: { title: "Voice", subtitle: "Selected feature" },
  settings: { title: "Settings", subtitle: "Control panel" }
};

async function executeSelectedFeature(feature, statusEl) {
  const setStatus = (text) => {
    if (statusEl) {
      statusEl.textContent = text;
    }
  };

  if (feature === "analyzer") {
    setStatus("Analyzing current page...");
    try {
      const response = await sendToActiveTab({ type: "CAI_ANALYZE_PAGE" });
      if (!response || !response.ok || !response.text) {
        setStatus("No question/options detected on this page.");
        return;
      }

      await copyText(response.text);
      setStatus("Analyzer done. Copied question/options.");
    } catch (error) {
      setStatus(`Analyzer failed: ${error.message}`);
    }
    return;
  }

  if (feature === "snip") {
    setStatus("Starting snip mode...");
    try {
      const response = await sendToActiveTab({ type: "CAI_START_SNIP" });
      if (!response || !response.ok) {
        setStatus(response?.message || "Unable to start snip mode.");
        return;
      }

      setStatus("Snip active. Drag over page area.");
    } catch (error) {
      setStatus(`Snip failed: ${error.message}`);
    }
    return;
  }

  if (feature === "voice") {
    setStatus("Toggling voice captions...");
    try {
      const response = await sendToActiveTab({ action: "toggleAudioCaptions" });
      setStatus(response ? `Audio: ${response.status}` : "Audio toggled.");
    } catch (_error) {
      setStatus("Error: refresh page before turning on audio captions.");
    }
  }
}

function getStorage(defaults) {
  if (!chrome.storage || !chrome.storage.sync) {
    return Promise.resolve(defaults);
  }

  return new Promise((resolve) => {
    chrome.storage.sync.get(defaults, (items) => {
      resolve({ ...defaults, ...items });
    });
  });
}

function setStorage(payload) {
  if (!chrome.storage || !chrome.storage.sync) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    chrome.storage.sync.set(payload, () => resolve());
  });
}

async function sendToPage(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || typeof tab.id !== "number") {
      return null;
    }

    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (_error) {
    return null;
  }
}

function wirePopup() {
  const screenMain = document.getElementById("screen-main");
  const screenSettings = document.getElementById("screen-settings");
  const statusText = document.getElementById("statusText");
  const featureTitle = document.getElementById("featureTitle");
  const featureSubtitle = document.getElementById("featureSubtitle");
  const featureBadge = document.getElementById("featureBadge");
  const activationToggle = document.getElementById("activationToggle");
  const voiceCloseBtn = document.getElementById("voiceCloseBtn");
  const modelSelect = document.getElementById("modelSelect");
  const tabs = Array.from(document.querySelectorAll(".tab-btn"));

  if (
    !screenMain ||
    !screenSettings ||
    !featureTitle ||
    !featureSubtitle ||
    !featureBadge ||
    !activationToggle ||
    !voiceCloseBtn ||
    !modelSelect
  ) {
    return;
  }

  let currentFeature = DEFAULT_POPUP_STATE.activeFeature;
  let extensionActive = DEFAULT_POPUP_STATE.extensionActive;

  const render = () => {
    tabs.forEach((button) => {
      button.classList.toggle("active", button.dataset.feature === currentFeature);
    });

    const meta = FEATURE_META[currentFeature] || FEATURE_META.analyzer;
    featureTitle.textContent = meta.title;
    featureSubtitle.textContent = meta.subtitle;

    if (currentFeature === "settings") {
      screenMain.hidden = true;
      screenSettings.hidden = false;
    } else {
      screenMain.hidden = false;
      screenSettings.hidden = true;
    }

    activationToggle.textContent = extensionActive ? "Deactivate on page" : "Activate on page";
    activationToggle.setAttribute("data-active", extensionActive ? "true" : "false");
    activationToggle.setAttribute("aria-pressed", extensionActive ? "true" : "false");
  };

  const syncToolbar = async () => {
    const items = await getStorage(DEFAULT_POPUP_STATE);
    const enabledFeatures = {
      analyzer: items.toolbarAnalyzerEnabled !== false,
      snip: items.toolbarSnipEnabled !== false,
      voice: items.toolbarVoiceEnabled !== false
    };

    await sendToPage({ type: "CAI_TOOLBAR_SET_VISIBILITY", visible: extensionActive });
    await sendToPage({ type: "CAI_TOOLBAR_SET_ENABLED_FEATURES", enabledFeatures });
    if (extensionActive) {
      await sendToPage({ type: "CAI_TOOLBAR_SET_FEATURE", feature: currentFeature });
    } else {
      await sendToPage({ type: "CAI_TOOLBAR_SET_FEATURE", feature: "analyzer" });
    }
  };

  const setFeature = async (feature) => {
    currentFeature = feature;
    render();
    await setStorage({ activeFeature: feature });

    if (extensionActive) {
      await sendToPage({ type: "CAI_TOOLBAR_SET_FEATURE", feature });
    }
  };

  tabs.forEach((button) => {
    button.addEventListener("click", () => {
      const feature = button.dataset.feature;
      if (!feature) return;
      setFeature(feature);
    });
  });

  featureBadge.addEventListener("click", async () => {
    if (currentFeature === "settings") {
      return;
    }

    await executeSelectedFeature(currentFeature, statusText);
    if (currentFeature === "voice") {
      try {
        const state = await sendToActiveTab({ action: "getAudioCaptionsState" });
        voiceCloseBtn.hidden = !state?.isActive;
      } catch (_error) {
        voiceCloseBtn.hidden = true;
      }
    }
  });

  voiceCloseBtn.addEventListener("click", async () => {
    try {
      await sendToActiveTab({ action: "closeAudioCaptions" });
      voiceCloseBtn.hidden = true;
    } catch (_error) {
      return;
    }
  });

  activationToggle.addEventListener("click", async () => {
    extensionActive = !extensionActive;
    render();
    await setStorage({ extensionActive });
    await syncToolbar();
    return;
  });

  modelSelect.addEventListener("change", async () => {
    await setStorage({ selectedModel: modelSelect.value });
  });

  getStorage(DEFAULT_POPUP_STATE).then(async (items) => {
    currentFeature = FEATURE_META[items.activeFeature] ? items.activeFeature : DEFAULT_POPUP_STATE.activeFeature;
    extensionActive = Boolean(items.extensionActive);
    modelSelect.value = items.selectedModel || DEFAULT_POPUP_STATE.selectedModel;
    voiceCloseBtn.hidden = true;
    render();
    await syncToolbar();
  });

  initializeSettings({
    onSettingsChanged: async (payload) => {
      await sendToPage({
        type: "CAI_TOOLBAR_SET_ENABLED_FEATURES",
        enabledFeatures: {
          analyzer: payload.toolbarAnalyzerEnabled !== false,
          snip: payload.toolbarSnipEnabled !== false,
          voice: payload.toolbarVoiceEnabled !== false
        }
      });
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wirePopup);
} else {
  wirePopup();
}
