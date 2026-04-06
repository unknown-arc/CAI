const DEFAULT_SETTINGS = {
  theme: "dark",
  selectionHighlight: false,
  toolbarAnalyzerEnabled: true,
  toolbarSnipEnabled: true,
  toolbarVoiceEnabled: true
};

function applyTheme(theme) {
  const value = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", value);
}

function saveSettings(toggles, statusEl, onSettingsChanged) {
  const payload = {
    theme: toggles.themeToggle.checked ? "light" : "dark",
    selectionHighlight: toggles.selectionToggle.checked,
    toolbarAnalyzerEnabled: toggles.toolbarAnalyzerToggle.checked,
    toolbarSnipEnabled: toggles.toolbarSnipToggle.checked,
    toolbarVoiceEnabled: toggles.toolbarVoiceToggle.checked
  };

  if (!chrome.storage || !chrome.storage.sync) {
    applyTheme(payload.theme);
    if (statusEl) {
      statusEl.textContent = "Settings applied locally.";
    }
    if (typeof onSettingsChanged === "function") {
      onSettingsChanged(payload);
    }
    return;
  }

  chrome.storage.sync.set(payload, () => {
    applyTheme(payload.theme);
    if (statusEl) {
      statusEl.textContent = "Settings saved.";
    }
    if (typeof onSettingsChanged === "function") {
      onSettingsChanged(payload);
    }
  });
}

export function initializeSettings(options = {}) {
  const onSettingsChanged = options.onSettingsChanged;
  const themeToggle = document.getElementById("themeToggle");
  const selectionToggle = document.getElementById("selectionToggle");
  const toolbarAnalyzerToggle = document.getElementById("toolbarAnalyzerToggle");
  const toolbarSnipToggle = document.getElementById("toolbarSnipToggle");
  const toolbarVoiceToggle = document.getElementById("toolbarVoiceToggle");
  const statusEl = document.getElementById("settingsStatus");

  if (
    !themeToggle ||
    !selectionToggle ||
    !toolbarAnalyzerToggle ||
    !toolbarSnipToggle ||
    !toolbarVoiceToggle
  ) {
    return;
  }

  if (!chrome.storage || !chrome.storage.sync) {
    applyTheme(DEFAULT_SETTINGS.theme);
    themeToggle.checked = DEFAULT_SETTINGS.theme === "light";
    selectionToggle.checked = DEFAULT_SETTINGS.selectionHighlight;
    toolbarAnalyzerToggle.checked = DEFAULT_SETTINGS.toolbarAnalyzerEnabled;
    toolbarSnipToggle.checked = DEFAULT_SETTINGS.toolbarSnipEnabled;
    toolbarVoiceToggle.checked = DEFAULT_SETTINGS.toolbarVoiceEnabled;
    if (statusEl) {
      statusEl.textContent = "Settings unavailable (no storage).";
    }
    if (typeof onSettingsChanged === "function") {
      onSettingsChanged(DEFAULT_SETTINGS);
    }
    return;
  }

  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    const theme = items.theme || DEFAULT_SETTINGS.theme;
    const selectionHighlight = Boolean(items.selectionHighlight);
    const toolbarAnalyzerEnabled = items.toolbarAnalyzerEnabled !== false;
    const toolbarSnipEnabled = items.toolbarSnipEnabled !== false;
    const toolbarVoiceEnabled = items.toolbarVoiceEnabled !== false;
    applyTheme(theme);
    themeToggle.checked = theme === "light";
    selectionToggle.checked = selectionHighlight;
    toolbarAnalyzerToggle.checked = toolbarAnalyzerEnabled;
    toolbarSnipToggle.checked = toolbarSnipEnabled;
    toolbarVoiceToggle.checked = toolbarVoiceEnabled;
    if (statusEl) {
      statusEl.textContent = "Settings loaded.";
    }
    if (typeof onSettingsChanged === "function") {
      onSettingsChanged({
        theme,
        selectionHighlight,
        toolbarAnalyzerEnabled,
        toolbarSnipEnabled,
        toolbarVoiceEnabled
      });
    }
  });

  const onChange = () =>
    saveSettings(
      {
        themeToggle,
        selectionToggle,
        toolbarAnalyzerToggle,
        toolbarSnipToggle,
        toolbarVoiceToggle
      },
      statusEl,
      onSettingsChanged
    );

  themeToggle.addEventListener("change", onChange);
  selectionToggle.addEventListener("change", onChange);
  toolbarAnalyzerToggle.addEventListener("change", onChange);
  toolbarSnipToggle.addEventListener("change", onChange);
  toolbarVoiceToggle.addEventListener("change", onChange);
}
