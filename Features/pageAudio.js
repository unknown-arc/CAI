// Listen for message from popup to toggle captions overlay
let audioOverlay = null;
let captionsContainer = null;
let isActive = false;
let micRecognition = null;
let systemRecognition = null;
let micRecognizing = false;
let systemRecognizing = false;
let currentMicInterimSpan = null;
let currentSystemInterimSpan = null;
let systemAudioStream = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleAudioCaptions") {
    isActive = !isActive;
    if (isActive) {
      createOverlay();
      startRecognition();
      sendResponse({ status: "Captions ON" });
    } else {
      removeOverlay();
      stopRecognition();
      sendResponse({ status: "Captions OFF" });
    }
  }
});

function createOverlay() {
  if (audioOverlay) return;

  audioOverlay = document.createElement("div");
  audioOverlay.id = "cai-audio-overlay";
  
  Object.assign(audioOverlay.style, {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "80%",
    maxWidth: "800px",
    minHeight: "60px",
    maxHeight: "300px",
    overflowY: "auto",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "#fff",
    borderRadius: "10px",
    padding: "20px",
    zIndex: "999999",
    fontFamily: "Arial, sans-serif",
    fontSize: "18px",
    pointerEvents: "none",
    boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    backdropFilter: "blur(5px)",
    transition: "all 0.3s ease"
  });

  captionsContainer = document.createElement("div");
  captionsContainer.style.display = "flex";
  captionsContainer.style.flexDirection = "column";
  captionsContainer.style.gap = "8px";
  
  audioOverlay.appendChild(captionsContainer);
  document.body.appendChild(audioOverlay);
}

function removeOverlay() {
  if (audioOverlay) {
    audioOverlay.remove();
    audioOverlay = null;
    captionsContainer = null;
    currentMicInterimSpan = null;
    currentSystemInterimSpan = null;
  }
}

function appendCaption(text, { isInterim = false, color = "#4ade80", source = "mic" } = {}) {
  if (!captionsContainer) return;

  const prefix = source === "system" ? "[SYSTEM] " : "[MIC] ";
  const fullText = `${prefix}${text}`;

  const getInterimRef = () => (source === "system" ? currentSystemInterimSpan : currentMicInterimSpan);
  const setInterimRef = (value) => {
    if (source === "system") {
      currentSystemInterimSpan = value;
    } else {
      currentMicInterimSpan = value;
    }
  };

  if (isInterim) {
    let interimSpan = getInterimRef();
    if (!interimSpan) {
      interimSpan = document.createElement("div");
      interimSpan.style.color = "#a3a3a3";
      interimSpan.style.fontStyle = "italic";
      captionsContainer.appendChild(interimSpan);
      setInterimRef(interimSpan);
    }
    interimSpan.textContent = fullText;
  } else {
    const interimSpan = getInterimRef();
    if (interimSpan) {
      interimSpan.remove();
      setInterimRef(null);
    }
    const newFinalLine = document.createElement("div");
    newFinalLine.style.color = color;
    newFinalLine.textContent = fullText;
    captionsContainer.appendChild(newFinalLine);

    if (captionsContainer.children.length > 10) {
      captionsContainer.removeChild(captionsContainer.firstChild);
    }
  }

  if (audioOverlay) {
    audioOverlay.scrollTop = audioOverlay.scrollHeight;
  }
}

function getSpeechRecognitionCtor() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    appendCaption("Speech Recognition API is not supported in this browser.", { color: "#ef4444", source: "mic" });
    return null;
  }

  return SpeechRecognition;
}

function configureRecognition(recognition, source) {
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onstart = function () {
    if (source === "system") {
      systemRecognizing = true;
      appendCaption("System audio transcription started.", { color: "#38bdf8", source });
    } else {
      micRecognizing = true;
      appendCaption("Mic active. Start speaking...", { color: "#fbbf24", source });
    }
  };

  recognition.onerror = function (event) {
    console.error("Speech recognition error", source, event.error);
    if (event.error === "not-allowed") {
      appendCaption("Microphone access denied. Please allow microphone permissions on this site.", {
        color: "#ef4444",
        source
      });
      return;
    }

    if (source === "system") {
      appendCaption(`System audio error: ${event.error}`, { color: "#ef4444", source });
    }
  };

  recognition.onend = function () {
    if (source === "system") {
      systemRecognizing = false;
    } else {
      micRecognizing = false;
    }

    if (isActive) {
      setTimeout(() => {
        try {
          if (source === "system") {
            if (isActive && !systemRecognizing && systemRecognition) {
              const track = systemAudioStream?.getAudioTracks?.()[0];
              if (track) {
                systemRecognition.start(track);
              }
            }
          } else if (isActive && !micRecognizing && micRecognition) {
            micRecognition.start();
          }
        } catch (e) {
          // Ignore restart failures; next toggle can re-init.
        }
      }, 500);
    }
  };

  recognition.onresult = function (event) {
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        const finalText = event.results[i][0].transcript.trim();
        if (finalText) {
          appendCaption(finalText, { color: source === "system" ? "#38bdf8" : "#4ade80", source });
        }
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (interimTranscript) {
      appendCaption(interimTranscript, { isInterim: true, source });
    }
  };
}

function startMicRecognition() {
  const SpeechRecognition = getSpeechRecognitionCtor();
  if (!SpeechRecognition) return;

  micRecognition = new SpeechRecognition();
  configureRecognition(micRecognition, "mic");

  try {
    micRecognition.start();
  } catch (e) {
    console.error(e);
  }
}

async function startSystemAudioRecognition() {
  const SpeechRecognition = getSpeechRecognitionCtor();
  if (!SpeechRecognition) return;

  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== "function") {
    appendCaption("System audio capture not supported in this browser context.", {
      color: "#ef4444",
      source: "system"
    });
    return;
  }

  try {
    appendCaption("Allow screen/tab share with audio to transcribe system sound.", {
      color: "#fbbf24",
      source: "system"
    });

    systemAudioStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });

    const audioTrack = systemAudioStream.getAudioTracks()[0];
    if (!audioTrack) {
      appendCaption("No system audio track found. Enable share audio in picker.", {
        color: "#ef4444",
        source: "system"
      });
      systemAudioStream.getTracks().forEach((track) => track.stop());
      systemAudioStream = null;
      return;
    }

    systemRecognition = new SpeechRecognition();
    configureRecognition(systemRecognition, "system");

    audioTrack.addEventListener("ended", () => {
      if (isActive) {
        appendCaption("System audio sharing stopped.", { color: "#ef4444", source: "system" });
      }
    });

    // Experimental support in Chromium builds that accept an AudioTrack.
    systemRecognition.start(audioTrack);
  } catch (error) {
    appendCaption("System audio transcription unavailable. Keep mic transcription active.", {
      color: "#ef4444",
      source: "system"
    });
  }
}

function startRecognition() {
  startMicRecognition();
  startSystemAudioRecognition();
}

function stopStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

function stopSingleRecognition(recognition, isRecognizing) {
  if (!recognition) return;
  if (isRecognizing) {
    recognition.stop();
    return;
  }

  try {
    recognition.abort();
  } catch (_error) {
    // noop
  }
}

function stopRecognition() {
  isActive = false;
  stopSingleRecognition(micRecognition, micRecognizing);
  stopSingleRecognition(systemRecognition, systemRecognizing);

  micRecognition = null;
  systemRecognition = null;
  micRecognizing = false;
  systemRecognizing = false;

  stopStream(systemAudioStream);
  systemAudioStream = null;
}
