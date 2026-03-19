const DEFAULT_SETTINGS = {
  theme: "dark",
  selectionHighlight: false
};

function applyTheme(theme) {
  const value = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", value);
}

function saveSettings(themeToggle, selectionToggle, statusEl) {
  const payload = {
    theme: themeToggle.checked ? "light" : "dark",
    selectionHighlight: selectionToggle.checked
  };

  if (!chrome.storage || !chrome.storage.sync) {
    applyTheme(payload.theme);
    statusEl.textContent = "Settings applied locally.";
    return;
  }

  chrome.storage.sync.set(payload, () => {
    applyTheme(payload.theme);
    statusEl.textContent = "Settings saved.";
  });
}

export function initializeSettings() {
  const themeToggle = document.getElementById("themeToggle");
  const selectionToggle = document.getElementById("selectionToggle");
  const statusEl = document.getElementById("settingsStatus");

  if (!themeToggle || !selectionToggle || !statusEl) {
    return;
  }

  if (!chrome.storage || !chrome.storage.sync) {
    applyTheme(DEFAULT_SETTINGS.theme);
    themeToggle.checked = DEFAULT_SETTINGS.theme === "light";
    selectionToggle.checked = DEFAULT_SETTINGS.selectionHighlight;
    statusEl.textContent = "Settings unavailable (no storage).";
    return;
  }

  chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
    const theme = items.theme || DEFAULT_SETTINGS.theme;
    const selectionHighlight = Boolean(items.selectionHighlight);
    applyTheme(theme);
    themeToggle.checked = theme === "light";
    selectionToggle.checked = selectionHighlight;
    statusEl.textContent = "Settings loaded.";
  });

  const onChange = () => saveSettings(themeToggle, selectionToggle, statusEl);
  themeToggle.addEventListener("change", onChange);
  selectionToggle.addEventListener("change", onChange);
}
