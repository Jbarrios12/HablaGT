import { useEffect, useRef, useState, useCallback } from "react";
import { RealtimeAudioClient } from "../lib/realtimeAudio";
import { softphoneService, realtimeService } from "../services";

export function useRealtimeAudio(callId) {
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const clientRef = useRef(null);
  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const start = useCallback(async () => {
    if (!callId || clientRef.current || pollRef.current) return;
    setError(null);
    setStatus("connecting");
    try {
      const session = await realtimeService.start(callId, {
        provider: "stub",
        voice_id: "default",
        language: "es",
      });
      // The AI of this call runs on the PBX (the caller hears it on the
      // phone): the button only switches it on/off, so no browser
      // mic/speaker bridge is opened. Its conversation is in Operadora IA.
      if (session?.provider === "pbx") {
        setStatus("open");
        return;
      }
      const url = softphoneService.audioSocketURL(callId);
      const client = new RealtimeAudioClient({
        url,
        onReady: () => setStatus("open"),
        onTranscript: (msg) => {
          setTranscript((prev) => [
            ...prev,
            { at: Date.now(), speaker: msg.speaker || "ai", text: msg.text, isFinal: msg.is_final !== false },
          ]);
        },
        onAudio: () => {
          // noop; just to mark activity
        },
        onError: (e) => {
          setError(e.message);
          setStatus("error");
        },
        onClose: () => setStatus("closed"),
      });
      clientRef.current = client;
      await client.start();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message);
      setStatus("error");
    }
  }, [callId]);

  const stop = useCallback(async () => {
    stopPolling();
    if (clientRef.current) {
      await clientRef.current.stop();
      clientRef.current = null;
    }
    if (callId) {
      try { await realtimeService.stop(callId); } catch {}
    }
    setStatus("idle");
  }, [callId]);

  const say = useCallback((text) => {
    clientRef.current?.say(text);
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
      clientRef.current?.stop();
      clientRef.current = null;
    };
  }, []);

  return { status, transcript, error, start, stop, say };
}
