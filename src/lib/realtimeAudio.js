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
  constructor({ url, onReady, onTranscript, onError, onClose, onAudio }) {
    this.url = url;
    this.onReady = onReady || (() => {});
    this.onTranscript = onTranscript || (() => {});
    this.onError = onError || (() => {});
    this.onClose = onClose || (() => {});
    this.onAudio = onAudio || (() => {});
    this.ws = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.scriptNode = null;
    this.closed = false;
    this.nextPlayTime = 0;
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
      const pcm = float32ToInt16(input);
      this.ws.send(pcm.buffer);
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

    const now = this.audioContext.currentTime;
    const startAt = Math.max(now, this.nextPlayTime);
    src.start(startAt);
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
