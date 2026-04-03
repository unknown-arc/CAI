(function () {
  if (!window.__CAI_AUDIO__) {
    window.__CAI_AUDIO__ = {};
  }

  window.__CAI_AUDIO__.state = {
    audioOverlay: null,
    captionsContainer: null,
    isActive: false,
    micRecognition: null,
    systemRecognition: null,
    micRecognizing: false,
    systemRecognizing: false,
    currentMicInterimSpan: null,
    currentSystemInterimSpan: null,
    systemAudioStream: null
  };
})();
