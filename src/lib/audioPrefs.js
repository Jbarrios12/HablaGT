import { agentSelfService } from "../services";

// Configuración de audio del agente (backend: /agents/me/audio-config).
// Se guarda una copia local para que el audio de la Operadora IA la lea al
// instante, sin esperar a la red cuando arranca una llamada.

const CACHE_KEY = "hablagt.audioConfig";

export const AUDIO_DEFAULTS = {
  microfono: "default",
  altavoz: "default",
  volumen_mic: 80,
  volumen_altavoz: 70,
};

const clampPct = (v, def) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : def;
};

const normalize = (c = {}) => ({
  microfono: c.microfono || AUDIO_DEFAULTS.microfono,
  altavoz: c.altavoz || AUDIO_DEFAULTS.altavoz,
  volumen_mic: clampPct(c.volumen_mic, AUDIO_DEFAULTS.volumen_mic),
  volumen_altavoz: clampPct(c.volumen_altavoz, AUDIO_DEFAULTS.volumen_altavoz),
});

/** Lectura inmediata (copia local o valores por defecto). */
export function getAudioConfig() {
  try {
    return normalize(JSON.parse(localStorage.getItem(CACHE_KEY)) || {});
  } catch {
    return { ...AUDIO_DEFAULTS };
  }
}

const cache = (cfg) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cfg)); } catch { /* sin almacenamiento */ }
};

/** Carga desde el backend (si el agente aún no guardó nada, valores por defecto). */
export async function loadAudioConfig() {
  try {
    const cfg = normalize(await agentSelfService.getAudioConfig());
    cache(cfg);
    return cfg;
  } catch {
    return getAudioConfig();
  }
}

export async function saveAudioConfig(cfg) {
  const clean = normalize(cfg);
  const saved = normalize(await agentSelfService.setAudioConfig(clean));
  cache(saved);
  return saved;
}

/**
 * Ganancia para un volumen 0–100. 80 (mic) / 70 (altavoz) por defecto ≈ 1×;
 * el máximo da un poco de refuerzo para micrófonos bajos.
 */
export const gainFor = (pct, base) => (pct / base);

/** Dispositivos reales del equipo (las etiquetas requieren permiso de micrófono). */
export async function listAudioDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return { inputs: [], outputs: [], labeled: false };
  const all = await navigator.mediaDevices.enumerateDevices();
  const inputs = all.filter((d) => d.kind === "audioinput");
  const outputs = all.filter((d) => d.kind === "audiooutput");
  return { inputs, outputs, labeled: all.some((d) => d.label) };
}

/** Pide permiso de micrófono una vez para que el navegador muestre los nombres. */
export async function unlockDeviceLabels() {
  const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  s.getTracks().forEach((t) => t.stop());
}

/** El navegador permite elegir la salida de audio (Chrome/Edge). */
export const canChooseOutput = () =>
  typeof AudioContext !== "undefined" && "setSinkId" in AudioContext.prototype;
