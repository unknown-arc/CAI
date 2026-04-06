(function () {
  const audio = window.__CAI_AUDIO__;

  async function requestAiResponse(prompt) {
    if (!audio.state.isActive || !audio.state.aiEnabled || !prompt) {
      return;
    }

    if (audio.state.aiRequestInFlight) {
      return;
    }

    audio.state.aiRequestInFlight = true;
    audio.appendAiResponse("Thinking...");

    try {
      const response = await fetch("http://localhost:5000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      audio.appendAiResponse(data?.response || "No AI response received.");
    } catch (_error) {
      audio.appendAiResponse("AI server unavailable. Start backend on http://localhost:5000.");
    } finally {
      audio.state.aiRequestInFlight = false;
    }
  }

  function queueAiResponse(source, text) {
    if (!audio.state.aiEnabled || !text) {
      return;
    }

    const prefix = source === "system" ? "System" : "Mic";
    const prompt = `${prefix} said: ${text}`;

    if (audio.state.aiRequestTimer) {
      clearTimeout(audio.state.aiRequestTimer);
    }

    audio.state.aiRequestTimer = setTimeout(() => {
      requestAiResponse(prompt);
    }, 700);
  }

  function getSpeechRecognitionCtor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      audio.appendCaption("Speech Recognition API is not supported in this browser.", {
        color: "#f87171",
        source: "mic"
      });
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
        audio.state.systemRecognizing = true;
        audio.appendCaption("System audio transcription started.", { color: "#38bdf8", source });
      } else {
        audio.state.micRecognizing = true;
        audio.appendCaption("Mic active. Start speaking...", { color: "#34d399", source });
      }
    };

    recognition.onerror = function (event) {
      console.error("Speech recognition error", source, event.error);
      if (event.error === "not-allowed") {
        audio.appendCaption("Microphone access denied. Please allow microphone permissions on this site.", {
          color: "#f87171",
          source
        });
        return;
      }

      if (source === "system") {
        audio.appendCaption(`System audio error: ${event.error}`, { color: "#f87171", source });
      }
    };

    recognition.onend = function () {
      if (source === "system") {
        audio.state.systemRecognizing = false;
      } else {
        audio.state.micRecognizing = false;
      }

      if (audio.state.isActive) {
        setTimeout(() => {
          try {
            if (source === "system") {
              if (
                audio.state.isActive &&
                audio.state.systemEnabled &&
                !audio.state.systemRecognizing &&
                audio.state.systemRecognition
              ) {
                const track = audio.state.systemAudioStream && audio.state.systemAudioStream.getAudioTracks
                  ? audio.state.systemAudioStream.getAudioTracks()[0]
                  : null;
                if (track) {
                  audio.state.systemRecognition.start(track);
                }
              }
            } else if (
              audio.state.isActive &&
              audio.state.micEnabled &&
              !audio.state.micRecognizing &&
              audio.state.micRecognition
            ) {
              audio.state.micRecognition.start();
            }
          } catch (_e) {
            return;
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
            audio.appendCaption(finalText, { color: source === "system" ? "#38bdf8" : "#34d399", source });
            queueAiResponse(source, finalText);
          }
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript) {
        audio.appendCaption(interimTranscript, { isInterim: true, source });
      }
    };
  }

  function startMicRecognition() {
    if (!audio.state.micEnabled || audio.state.micRecognition) return;

    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) return;

    audio.state.micRecognition = new SpeechRecognition();
    configureRecognition(audio.state.micRecognition, "mic");

    try {
      audio.state.micRecognition.start();
    } catch (e) {
      console.error(e);
    }
  }

  async function startSystemAudioRecognition() {
    if (!audio.state.systemEnabled || audio.state.systemRecognition) return;

    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) return;

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== "function") {
      audio.appendCaption("System audio capture not supported in this browser context.", {
        color: "#f87171",
        source: "system"
      });
      return;
    }

    try {
      audio.appendCaption("Allow screen/tab share with audio to transcribe system sound.", {
        color: "#fbbf24",
        source: "system"
      });

      audio.state.systemAudioStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const audioTrack = audio.state.systemAudioStream.getAudioTracks()[0];
      if (!audioTrack) {
        audio.appendCaption("No system audio track found. Enable share audio in picker.", {
          color: "#f87171",
          source: "system"
        });
        audio.state.systemAudioStream.getTracks().forEach((track) => track.stop());
        audio.state.systemAudioStream = null;
        return;
      }

      audio.state.systemRecognition = new SpeechRecognition();
      configureRecognition(audio.state.systemRecognition, "system");

      audioTrack.addEventListener("ended", () => {
        if (audio.state.isActive) {
          audio.appendCaption("System audio sharing stopped.", { color: "#f87171", source: "system" });
        }
      });

      audio.state.systemRecognition.start(audioTrack);
    } catch (_error) {
      audio.appendCaption("System audio transcription unavailable. Keep mic transcription active.", {
        color: "#f87171",
        source: "system"
      });
    }
  }

  function stopMicRecognition() {
    stopSingleRecognition(audio.state.micRecognition, audio.state.micRecognizing);
    audio.state.micRecognition = null;
    audio.state.micRecognizing = false;
  }

  function stopSystemRecognition() {
    stopSingleRecognition(audio.state.systemRecognition, audio.state.systemRecognizing);
    audio.state.systemRecognition = null;
    audio.state.systemRecognizing = false;
    stopStream(audio.state.systemAudioStream);
    audio.state.systemAudioStream = null;
  }

  function setMicEnabled(enabled) {
    audio.state.micEnabled = Boolean(enabled);
    if (!audio.state.isActive) {
      audio.renderControlState();
      return;
    }

    if (audio.state.micEnabled) {
      startMicRecognition();
      audio.appendCaption("Microphone listening enabled.", { color: "#34d399", source: "mic" });
    } else {
      stopMicRecognition();
      audio.appendCaption("Microphone listening paused.", { color: "#f87171", source: "mic" });
    }

    audio.renderControlState();
  }

  function setSystemEnabled(enabled) {
    audio.state.systemEnabled = Boolean(enabled);
    if (!audio.state.isActive) {
      audio.renderControlState();
      return;
    }

    if (audio.state.systemEnabled) {
      startSystemAudioRecognition();
      audio.appendCaption("System listening enabled.", { color: "#38bdf8", source: "system" });
    } else {
      stopSystemRecognition();
      audio.appendCaption("System listening paused.", { color: "#f87171", source: "system" });
    }

    audio.renderControlState();
  }

  function setAiEnabled(enabled) {
    audio.state.aiEnabled = Boolean(enabled);
    if (!audio.state.aiEnabled) {
      if (audio.state.aiRequestTimer) {
        clearTimeout(audio.state.aiRequestTimer);
        audio.state.aiRequestTimer = null;
      }
      audio.appendAiResponse("AI response paused (AI is OFF).");
    } else {
      audio.appendAiResponse("AI is ON. Waiting for final transcript...");
    }

    audio.renderControlState();
  }

  audio.toggleSource = function toggleSource(source) {
    if (source === "mic") {
      setMicEnabled(!audio.state.micEnabled);
      return;
    }

    if (source === "system") {
      setSystemEnabled(!audio.state.systemEnabled);
      return;
    }

    if (source === "ai") {
      setAiEnabled(!audio.state.aiEnabled);
    }
  };

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
      return;
    }
  }

  audio.startRecognition = function startRecognition() {
    if (audio.state.micEnabled) {
      startMicRecognition();
    }
    if (audio.state.systemEnabled) {
      startSystemAudioRecognition();
    }
    if (audio.state.aiEnabled) {
      audio.appendAiResponse("AI is ON. Waiting for final transcript...");
    }
    audio.renderControlState();
  };

  audio.stopRecognition = function stopRecognition() {
    audio.state.isActive = false;
    stopMicRecognition();
    stopSystemRecognition();

    if (audio.state.aiRequestTimer) {
      clearTimeout(audio.state.aiRequestTimer);
      audio.state.aiRequestTimer = null;
    }

    audio.state.aiRequestInFlight = false;
  };
})();
