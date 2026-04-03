(function () {
  if (!window.__CAI_SNIP__) {
    window.__CAI_SNIP__ = {};
  }

  window.__CAI_SNIP__.STATE = {
    active: false,
    startX: 0,
    startY: 0,
    rect: null,
    overlay: null,
    box: null,
    lensPanel: null
  };

  window.__CAI_SNIP__.MIN_SELECTION_SIZE = 8;
})();
