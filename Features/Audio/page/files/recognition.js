(function () {
  const audio = window.__CAI_AUDIO__;

  function getSpeechRecognitionCtor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      audio.appendCaption("Speech Recognition API is not supported in this browser.", {
        color: "#ef4444",
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
        audio.appendCaption("Mic active. Start speaking...", { color: "#fbbf24", source });
      }
    };

    recognition.onerror = function (event) {
      console.error("Speech recognition error", source, event.error);
      if (event.error === "not-allowed") {
        audio.appendCaption("Microphone access denied. Please allow microphone permissions on this site.", {
          color: "#ef4444",
          source
        });
        return;
      }

      if (source === "system") {
        audio.appendCaption(`System audio error: ${event.error}`, { color: "#ef4444", source });
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
              if (audio.state.isActive && !audio.state.systemRecognizing && audio.state.systemRecognition) {
                const track = audio.state.systemAudioStream && audio.state.systemAudioStream.getAudioTracks
                  ? audio.state.systemAudioStream.getAudioTracks()[0]
                  : null;
                if (track) {
                  audio.state.systemRecognition.start(track);
                }
              }
            } else if (audio.state.isActive && !audio.state.micRecognizing && audio.state.micRecognition) {
              audio.state.micRecognition.start();
            }
          } catch (_e) {
            // Ignore restart failures.
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
            audio.appendCaption(finalText, { color: source === "system" ? "#38bdf8" : "#4ade80", source });
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
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) return;

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== "function") {
      audio.appendCaption("System audio capture not supported in this browser context.", {
        color: "#ef4444",
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
          color: "#ef4444",
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
          audio.appendCaption("System audio sharing stopped.", { color: "#ef4444", source: "system" });
        }
      });

      audio.state.systemRecognition.start(audioTrack);
    } catch (_error) {
      audio.appendCaption("System audio transcription unavailable. Keep mic transcription active.", {
        color: "#ef4444",
        source: "system"
      });
    }
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

  audio.startRecognition = function startRecognition() {
    startMicRecognition();
    startSystemAudioRecognition();
  };

  audio.stopRecognition = function stopRecognition() {
    audio.state.isActive = false;
    stopSingleRecognition(audio.state.micRecognition, audio.state.micRecognizing);
    stopSingleRecognition(audio.state.systemRecognition, audio.state.systemRecognizing);

    audio.state.micRecognition = null;
    audio.state.systemRecognition = null;
    audio.state.micRecognizing = false;
    audio.state.systemRecognizing = false;

    stopStream(audio.state.systemAudioStream);
    audio.state.systemAudioStream = null;
  };
})();
