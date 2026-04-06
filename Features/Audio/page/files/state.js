(function () {
  if (!window.__CAI_AUDIO__) {
    window.__CAI_AUDIO__ = {};
  }

  window.__CAI_AUDIO__.state = {
    audioOverlay: null,
    captionsContainer: null,
    aiResponseContainer: null,
    micToggleBtn: null,
    systemToggleBtn: null,
    aiToggleBtn: null,
    isActive: false,
    micEnabled: true,
    systemEnabled: true,
    aiEnabled: true,
    micRecognition: null,
    systemRecognition: null,
    micRecognizing: false,
    systemRecognizing: false,
    currentMicInterimSpan: null,
    currentSystemInterimSpan: null,
    systemAudioStream: null,
    aiRequestTimer: null,
    aiRequestInFlight: false
  };
})();
