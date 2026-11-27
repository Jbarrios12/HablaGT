import { useCallback, useEffect, useRef, useState } from 'react';
import { FiHeadphones, FiSettings, FiPlay, FiMic, FiVolume2, FiSave, FiUnlock } from 'react-icons/fi';
import { agentSelfService } from '../../services';
import { PREFS_EVENT } from '../Layout/CallNotifier';
import { useToast } from '../../context/ToastContext';
import {
  AUDIO_DEFAULTS, canChooseOutput, gainFor, listAudioDevices, loadAudioConfig,
  saveAudioConfig, unlockDeviceLabels,
} from '../../lib/audioPrefs';

const PREF_DEFAULTS = { notificaciones: true, auto_answer: false, grabacion_automatica: true };

const apiError = (e, fallback) => e?.response?.data?.error?.message || e?.message || fallback;

/**
 * Dispositivos de audio y preferencias del agente, guardados en el backend.
 * Se aplican al audio del navegador con la Operadora IA (micrófono, altavoz
 * y volúmenes); la voz de una llamada normal va por el teléfono SIP.
 */
export default function AudioSettings() {
  const toast = useToast();
  const [audio, setAudio] = useState(AUDIO_DEFAULTS);
  const [prefs, setPrefs] = useState(PREF_DEFAULTS);
  const [saved, setSaved] = useState(null); // último estado guardado (para "hay cambios")
  const [devices, setDevices] = useState({ inputs: [], outputs: [], labeled: false });
  const [saving, setSaving] = useState(false);
  const [testingSpeaker, setTestingSpeaker] = useState(false);
  const [micLevel, setMicLevel] = useState(null); // null = sin prueba en curso
  const stopMicRef = useRef(null);
  const outputSelectable = canChooseOutput();

  const refreshDevices = useCallback(async () => {
    try { setDevices(await listAudioDevices()); } catch { /* sin acceso a dispositivos */ }
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([loadAudioConfig(), agentSelfService.getPreferences().catch(() => PREF_DEFAULTS)])
      .then(([a, p]) => {
        if (!alive) return;
        const pr = { ...PREF_DEFAULTS, ...(p || {}) };
        const cleanPrefs = { notificaciones: !!pr.notificaciones, auto_answer: !!pr.auto_answer, grabacion_automatica: !!pr.grabacion_automatica };
        setAudio(a);
        setPrefs(cleanPrefs);
        setSaved(JSON.stringify({ a, p: cleanPrefs }));
      });
    refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () => {
      alive = false;
      navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
      stopMicRef.current?.();
    };
  }, [refreshDevices]);

  const dirty = saved !== null && saved !== JSON.stringify({ a: audio, p: prefs });

  const allowDevices = async () => {
    try {
      await unlockDeviceLabels();
      await refreshDevices();
    } catch {
      toast.error('El navegador no dio permiso para usar el micrófono.');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const [a, p] = await Promise.all([saveAudioConfig(audio), agentSelfService.setPreferences(prefs)]);
      const cleanPrefs = { ...prefs, ...(p ? { notificaciones: !!p.notificaciones, auto_answer: !!p.auto_answer, grabacion_automatica: !!p.grabacion_automatica } : {}) };
      setAudio(a);
      setPrefs(cleanPrefs);
      setSaved(JSON.stringify({ a, p: cleanPrefs }));
      window.dispatchEvent(new CustomEvent(PREFS_EVENT, { detail: cleanPrefs }));
      toast.success('Configuración guardada');
    } catch (e) {
      toast.error(apiError(e, 'No se pudo guardar la configuración'));
    } finally {
      setSaving(false);
    }
  };

  // Tres tonos cortos por el altavoz elegido, al volumen elegido.
  const testSpeaker = async () => {
    setTestingSpeaker(true);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    try {
      if (outputSelectable && audio.altavoz !== 'default') {
        try { await ctx.setSinkId(audio.altavoz); } catch { toast.warning('No se pudo usar ese altavoz; se usó el predeterminado.'); }
      }
      const gain = ctx.createGain();
      gain.gain.value = 0.18 * gainFor(audio.volumen_altavoz, 70);
      gain.connect(ctx.destination);
      [0, 0.35, 0.7].forEach((t, i) => {
        const osc = ctx.createOscillator();
        osc.frequency.value = [523, 659, 784][i];
        osc.connect(gain);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.25);
      });
      await new Promise((r) => setTimeout(r, 1100));
    } finally {
      ctx.close();
      setTestingSpeaker(false);
    }
  };

  // Medidor de nivel del micrófono elegido durante 6 segundos.
  const testMic = async () => {
    if (micLevel !== null) { stopMicRef.current?.(); return; }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: audio.microfono !== 'default' ? { deviceId: { exact: audio.microfono } } : true,
        video: false,
      });
    } catch {
      toast.error('No se pudo abrir ese micrófono. Revisa el permiso del navegador o que esté conectado.');
      return;
    }
    refreshDevices();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const gain = ctx.createGain();
    gain.gain.value = gainFor(audio.volumen_mic, 80);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(gain);
    gain.connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      setMicLevel(Math.min(100, Math.round(Math.sqrt(sum / data.length) * 300)));
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
      stopMicRef.current = null;
      setMicLevel(null);
    };
    const timer = setTimeout(stop, 6000);
    stopMicRef.current = stop;
    setMicLevel(0);
    tick();
  };

  const deviceName = (d, i, kind) => d.label || `${kind} ${i + 1}`;
  const hasSelected = (list, id) => id === 'default' || list.some((d) => d.deviceId === id);

  return (
    <>
      {/* Audio */}
      <div className="config-section">
        <h3>
          <FiHeadphones />
          Dispositivos de Audio
        </h3>

        {!devices.labeled && (
          <button type="button" className="btn-secondary audio-unlock" onClick={allowDevices}>
            <FiUnlock /> Permitir acceso para ver mis dispositivos
          </button>
        )}

        <div className="config-group">
          <label htmlFor="cfg-mic"><FiMic /> Micrófono</label>
          <select id="cfg-mic" value={audio.microfono} onChange={(e) => setAudio({ ...audio, microfono: e.target.value })}>
            <option value="default">Predeterminado del sistema</option>
            {devices.inputs.filter((d) => d.deviceId && d.deviceId !== 'default').map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>{deviceName(d, i, 'Micrófono')}</option>
            ))}
            {!hasSelected(devices.inputs, audio.microfono) && <option value={audio.microfono}>Guardado (no conectado)</option>}
          </select>
        </div>

        <div className="config-group">
          <label htmlFor="cfg-spk"><FiVolume2 /> Altavoz</label>
          <select
            id="cfg-spk"
            value={outputSelectable ? audio.altavoz : 'default'}
            onChange={(e) => setAudio({ ...audio, altavoz: e.target.value })}
            disabled={!outputSelectable}
          >
            <option value="default">Predeterminado del sistema</option>
            {outputSelectable && devices.outputs.filter((d) => d.deviceId && d.deviceId !== 'default').map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>{deviceName(d, i, 'Altavoz')}</option>
            ))}
            {outputSelectable && !hasSelected(devices.outputs, audio.altavoz) && <option value={audio.altavoz}>Guardado (no conectado)</option>}
          </select>
          {!outputSelectable && <small className="audio-note">Este navegador usa siempre la salida predeterminada del sistema.</small>}
        </div>

        <div className="config-group">
          <label htmlFor="cfg-vmic">Volumen del micrófono</label>
          <div className="volume-control">
            <input id="cfg-vmic" type="range" min="0" max="100" value={audio.volumen_mic}
              onChange={(e) => setAudio({ ...audio, volumen_mic: Number(e.target.value) })} />
            <span>{audio.volumen_mic}%</span>
          </div>
          {micLevel !== null && (
            <div className="mic-meter" role="meter" aria-label="Nivel del micrófono" aria-valuemin={0} aria-valuemax={100} aria-valuenow={micLevel}>
              <span style={{ width: `${micLevel}%` }} />
            </div>
          )}
        </div>

        <div className="config-group">
          <label htmlFor="cfg-vspk">Volumen del altavoz</label>
          <div className="volume-control">
            <input id="cfg-vspk" type="range" min="0" max="100" value={audio.volumen_altavoz}
              onChange={(e) => setAudio({ ...audio, volumen_altavoz: Number(e.target.value) })} />
            <span>{audio.volumen_altavoz}%</span>
          </div>
        </div>

        <div className="audio-test-row">
          <button type="button" className="btn-test-audio" onClick={testSpeaker} disabled={testingSpeaker}>
            <FiPlay /> {testingSpeaker ? 'Sonando…' : 'Probar altavoz'}
          </button>
          <button type="button" className="btn-test-audio" onClick={testMic}>
            <FiMic /> {micLevel !== null ? 'Detener prueba' : 'Probar micrófono'}
          </button>
        </div>
        <small className="audio-note">Se aplica al audio con la Operadora IA en el navegador. La voz de una llamada normal va por tu teléfono SIP.</small>
      </div>

      {/* Preferencias */}
      <div className="config-section">
        <h3>
          <FiSettings />
          Preferencias
        </h3>

        {/* Auto-respuesta y grabación automática se guardan en el backend
            pero aún nada las aplica (Asterisk graba todas las llamadas y el
            navegador no contesta llamadas), así que no se muestran. */}
        {[
          ['notificaciones', 'Notificaciones de llamada', 'Avisar de llamadas entrantes en cualquier pantalla'],
        ].map(([key, label, desc]) => (
          <div className="config-toggle" key={key}>
            <div className="toggle-info">
              <span className="toggle-label">{label}</span>
              <span className="toggle-desc">{desc}</span>
            </div>
            <label className="switch">
              <input type="checkbox" aria-label={label} checked={prefs[key]}
                onChange={(e) => {
                  setPrefs({ ...prefs, [key]: e.target.checked });
                  // Permiso para avisar también cuando la pestaña no está a la vista.
                  if (key === 'notificaciones' && e.target.checked && typeof Notification !== 'undefined' && Notification.permission === 'default') {
                    Notification.requestPermission().catch(() => {});
                  }
                }} />
              <span className="slider"></span>
            </label>
          </div>
        ))}

        <button type="button" className="btn-primary audio-save" onClick={save} disabled={!dirty || saving}>
          <FiSave /> {saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Guardado'}
        </button>
      </div>
    </>
  );
}
