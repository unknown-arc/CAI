(function () {
  const audio = window.__CAI_AUDIO__;

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (!request || request.action !== "toggleAudioCaptions") {
      return;
    }

    audio.state.isActive = !audio.state.isActive;
    if (audio.state.isActive) {
      audio.createOverlay();
      audio.startRecognition();
      sendResponse({ status: "Captions ON" });
    } else {
      audio.removeOverlay();
      audio.stopRecognition();
      sendResponse({ status: "Captions OFF" });
    }
  });
})();
