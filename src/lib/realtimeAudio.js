// RealtimeAudioClient wires the browser's microphone to the backend's
// AI-bridge WebSocket at `/api/v1/calls/:id/audio`.
//
// Protocol (matches the backend's `realtime.Handler.Audio`):
//   - The socket upgrades to WebSocket. The server replies with a
//     JSON `{type:"ready", call_id:"..."}` once a session is bound.
//   - The client streams raw int16 LE PCM (16 kHz, mono) as binary
//     frames. JSON envelopes `{type:"audio", seq, pcm, final}` are
//     also accepted. As an alternative, `{type:"text", text:"..."}`
//     sends a TTS prompt to the AI without audio.
//   - The server replies with `{type:"audio", seq, pcm, final}` JSON
//     frames containing the AI's TTS audio. We play them with the
//     shared AudioContext.
//
// The class is intentionally framework-agnostic so it can be used
// from a React hook (useRealtimeAudio) or directly.

const TARGET_SAMPLE_RATE = 16000;

export class RealtimeAudioClient {
  constructor({ url, onReady, onTranscript, onError, onClose, onAudio, onSpeech, vad } = {}) {
    this.url = url;
    this.onReady = onReady || (() => {});
    this.onTranscript = onTranscript || (() => {});
    this.onError = onError || (() => {});
    this.onClose = onClose || (() => {});
    this.onAudio = onAudio || (() => {});
    // onSpeech(true|false) is fired when speech starts / ends. Useful
    // to drive a "hablando..." indicator in the UI.
    this.onSpeech = onSpeech || (() => {});
    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.scriptNode = null;
    this.closed = false;
    this.nextPlayTime = 0;
    this._sourceNodes = [];

    // Voice Activity Detection. We only stream audio while the user is
    // actually talking; otherwise the STT would transcribe the silence
    // between words as spurious phrases ("gracias", "chao", ...). While
    // speaking we send continuation frames; when the voice drops for
    // `hangoverMs` we send a `final` marker so the backend runs STT on
    // the whole utterance at once.
    this.vad = {
      enabled: vad?.enabled !== false,
      threshold: vad?.threshold ?? 0.015,
      hangoverMs: vad?.hangoverMs ?? 400,
      preRollFrames: vad?.preRollFrames ?? 2,
      minSpeechMs: vad?.minSpeechMs ?? 150,
    };
    this._speaking = false;
    this._silenceMs = 0;
    this._speechMs = 0;
    this._preRoll = [];
  }

  async start() {
    if (this.ws) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      this.onError(new Error("getUserMedia no soportado en este navegador"));
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: TARGET_SAMPLE_RATE, echoCancellation: true, noiseSuppression: true },
        video: false,
      });
    } catch (err) {
      this.onError(new Error(`Permiso de micrófono denegado: ${err.message}`));
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioCtx({ sampleRate: TARGET_SAMPLE_RATE });

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.scriptNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    source.connect(this.scriptNode);
    this.scriptNode.connect(this.audioContext.destination);

    this.scriptNode.onaudioprocess = (event) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      const input = event.inputBuffer.getChannelData(0);

      // VAD desactivado: comportamiento antiguo (envía todo en binario).
      if (!this.vad.enabled) {
        this.ws.send(float32ToInt16(input).buffer);
        return;
      }

      const frameMs = (input.length / TARGET_SAMPLE_RATE) * 1000;
      const voiced = rms(input) >= this.vad.threshold;

      if (voiced) {
        if (!this._speaking) {
          this._speaking = true;
          this._speechMs = 0;
          this.onSpeech(true);
          this.interruptPlayback();
          // Reproduce el pre-roll para no perder el arranque de la palabra.
          for (const frame of this._preRoll) this.ws.send(float32ToInt16(frame).buffer);
          this._preRoll = [];
        }
        this._speechMs += frameMs;
        this._silenceMs = 0;
        this.ws.send(float32ToInt16(input).buffer);
      } else if (this._speaking) {
        // Aún enviamos la cola del habla durante el hangover.
        this.ws.send(float32ToInt16(input).buffer);
        this._silenceMs += frameMs;
        if (this._silenceMs >= this.vad.hangoverMs) {
          const hadSpeech = this._speechMs >= this.vad.minSpeechMs;
          this._speaking = false;
          this._silenceMs = 0;
          this._speechMs = 0;
          this.onSpeech(false);
          // Cierra el turno: el backend corre STT sobre toda la frase.
          if (hadSpeech) this.endUtterance();
        }
      } else {
        // Silencio antes de hablar: mantenemos un pequeño buffer de pre-roll.
        this._preRoll.push(new Float32Array(input));
        if (this._preRoll.length > this.vad.preRollFrames) this._preRoll.shift();
      }
    };

    this.ws = new WebSocket(this.url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      // ready signal comes from the server
    };

    this.ws.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.type === "ready") {
        this.onReady(msg);
      } else if (msg.type === "audio" && Array.isArray(msg.pcm)) {
        this.onAudio(msg);
        this.playPcm(msg.pcm, !!msg.final);
      } else if (msg.type === "transcript" && msg.text) {
        this.onTranscript(msg);
      } else if (msg.type === "error") {
        this.onError(new Error(msg.error || "ai error"));
      }
    };

    this.ws.onerror = (event) => {
      this.onError(new Error("WebSocket error"));
    };

    this.ws.onclose = () => {
      this.onClose();
    };
  }

  say(text) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "text", text }));
    }
  }

  // endUtterance marca el fin de la frase actual. El backend acumula los
  // frames binarios y, al recibir este envelope con final:true, corre el
  // pipeline STT -> orquestador -> TTS sobre toda la frase.
  interruptPlayback() {
    for (const src of this._sourceNodes) {
      try { src.stop(); } catch {}
      try { src.disconnect(); } catch {}
    }
    this._sourceNodes = [];
    this.nextPlayTime = this.audioContext?.currentTime || 0;
  }

  endUtterance() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "audio", pcm: [], final: true }));
    }
  }

  playPcm(int16Array, isFinal) {
    if (!this.audioContext || !int16Array?.length) return;
    const buffer = this.audioContext.createBuffer(1, int16Array.length, TARGET_SAMPLE_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < int16Array.length; i++) {
      channel[i] = int16Array[i] / 32768;
    }
    const src = this.audioContext.createBufferSource();
    src.buffer = buffer;
    src.connect(this.audioContext.destination);
    src.onended = () => {
      const idx = this._sourceNodes.indexOf(src);
      if (idx !== -1) this._sourceNodes.splice(idx, 1);
    };

    const now = this.audioContext.currentTime;
    const startAt = Math.max(now, this.nextPlayTime);
    src.start(startAt);
    this._sourceNodes.push(src);
    this.nextPlayTime = startAt + buffer.duration;
    if (isFinal) this.nextPlayTime = now;
  }

  async stop() {
    if (this.closed) return;
    this.closed = true;
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    if (this.scriptNode) {
      try { this.scriptNode.disconnect(); } catch {}
      this.scriptNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      try { await this.audioContext.close(); } catch {}
      this.audioContext = null;
    }
  }
}

function float32ToInt16(float32) {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

// rms devuelve la energía (raíz cuadrática media) de un frame de audio
// normalizado, usada como métrica simple de actividad de voz.
function rms(float32) {
  let sum = 0;
  for (let i = 0; i < float32.length; i++) sum += float32[i] * float32[i];
  return Math.sqrt(sum / float32.length);
}
