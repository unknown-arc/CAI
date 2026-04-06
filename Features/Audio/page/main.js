(function () {
  const audio = window.__CAI_AUDIO__;

  function openVoicePanel() {
    audio.state.isActive = true;
    audio.createOverlay();
    audio.startRecognition();
    return { status: "Voice panel ON", isActive: true };
  }

  function closeVoicePanel() {
    audio.state.isActive = false;
    audio.stopRecognition();
    audio.removeOverlay();
    return { status: "Voice panel OFF", isActive: false };
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (!request || typeof request.action !== "string") {
      return;
    }

    if (request.action === "toggleAudioCaptions") {
      sendResponse(audio.state.isActive ? closeVoicePanel() : openVoicePanel());
      return;
    }

    if (request.action === "closeAudioCaptions") {
      sendResponse(closeVoicePanel());
      return;
    }

    if (request.action === "getAudioCaptionsState") {
      sendResponse({ status: audio.state.isActive ? "Voice panel ON" : "Voice panel OFF", isActive: audio.state.isActive });
    }
  });
})();
