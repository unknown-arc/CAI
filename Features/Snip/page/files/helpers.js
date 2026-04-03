(function () {
  const snip = window.__CAI_SNIP__;

  snip.clamp = function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  };

  snip.intersects = function intersects(a, b) {
    return !(
      b.left > a.left + a.width ||
      b.left + b.width < a.left ||
      b.top > a.top + a.height ||
      b.top + b.height < a.top
    );
  };

  snip.showToast = function showToast(text) {
    const toast = document.createElement("div");
    toast.textContent = text;
    toast.style.position = "fixed";
    toast.style.bottom = "12px";
    toast.style.right = "12px";
    toast.style.zIndex = "2147483647";
    toast.style.padding = "8px 10px";
    toast.style.borderRadius = "10px";
    toast.style.color = "#e2e8f0";
    toast.style.background = "rgba(15,23,42,0.92)";
    toast.style.border = "1px solid rgba(59,130,246,0.9)";
    toast.style.fontSize = "12px";
    document.documentElement.appendChild(toast);
    setTimeout(() => {
      if (document.contains(toast)) toast.remove();
    }, 1500);
  };

  snip.cleanup = function cleanup() {
    if (snip.STATE.overlay && document.contains(snip.STATE.overlay)) {
      snip.STATE.overlay.remove();
    }
    snip.STATE.active = false;
    snip.STATE.overlay = null;
    snip.STATE.box = null;
    snip.STATE.rect = null;
  };

  snip.removeLensPanel = function removeLensPanel() {
    if (snip.STATE.lensPanel && document.contains(snip.STATE.lensPanel)) {
      snip.STATE.lensPanel.remove();
    }
    snip.STATE.lensPanel = null;
  };
})();
