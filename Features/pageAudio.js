// Listen for message from popup to toggle captions overlay
let audioOverlay = null;
let captionsContainer = null;
let isActive = false;
let recognition = null;
let recognizing = false;
let currentInterimSpan = null;

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
    currentInterimSpan = null;
  }
}

function appendCaption(text, isInterim = false, color = "#4ade80") {
  if (!captionsContainer) return;

  if (isInterim) {
    if (!currentInterimSpan) {
      currentInterimSpan = document.createElement("div");
      currentInterimSpan.style.color = "#a3a3a3";
      currentInterimSpan.style.fontStyle = "italic";
      captionsContainer.appendChild(currentInterimSpan);
    }
    currentInterimSpan.textContent = text;
  } else {
    if (currentInterimSpan) {
      currentInterimSpan.remove();
      currentInterimSpan = null;
    }
    const newFinalLine = document.createElement("div");
    newFinalLine.style.color = color;
    newFinalLine.textContent = text;
    captionsContainer.appendChild(newFinalLine);

    if (captionsContainer.children.length > 10) {
      captionsContainer.removeChild(captionsContainer.firstChild);
    }
  }

  audioOverlay.scrollTop = audioOverlay.scrollHeight;
}

function startRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    appendCaption("Speech Recognition API is not supported in this browser.", false, "#ef4444");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = function() {
    recognizing = true;
    appendCaption("Mic active. Start speaking...", false, "#fbbf24");
  };

  recognition.onerror = function(event) {
    console.error("Speech recognition error", event.error);
    if(event.error === 'not-allowed') {
      appendCaption("Microphone access denied. Please allow microphone permissions on this site.", false, "#ef4444");
    }
  };

  recognition.onend = function() {
    recognizing = false;
    if (isActive) {
      setTimeout(() => {
        try {
          if (isActive && !recognizing) {
             recognition.start();
          }
        } catch(e) {}
      }, 500);
    }
  };

  recognition.onresult = function(event) {
    let interim_transcript = '';
    
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        let final_text = event.results[i][0].transcript.trim();
        if (final_text) {
           appendCaption(final_text, false, "#4ade80");
        }
      } else {
        interim_transcript += event.results[i][0].transcript;
      }
    }
    
    if (interim_transcript) {
      appendCaption(interim_transcript, true);
    }
  };

  try {
    recognition.start();
  } catch (e) {
    console.error(e);
  }
}

function stopRecognition() {
  isActive = false;
  if (recognition && recognizing) {
    recognition.stop();
  }
}
