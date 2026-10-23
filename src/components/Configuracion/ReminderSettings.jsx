import { useEffect, useState } from 'react';
import { reminderService } from '../../services';
import { useToast } from '../../context/ToastContext';
import VoiceFields from '../common/VoiceFields';

const PLACEHOLDERS = ['{{contacto}}', '{{titulo}}', '{{fecha}}', '{{hora}}', '{{telefono}}'];

// Llamadas de recordatorio: la IA llama a quien tiene una cita pendiente.
// Aquí se define si se hacen, con cuánta anticipación y qué dice.
const ReminderSettings = () => {
  const toast = useToast();
  const [script, setScript] = useState(null);
  const [defaults, setDefaults] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    reminderService.get()
      .then((res) => { setScript(res.script); setDefaults(res.defaults || {}); })
      .catch(() => toast.error('No se pudo cargar el guion de recordatorios'));
  }, []);

  if (!script) return null;
  const set = (patch) => setScript((s) => ({ ...s, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await reminderService.save({ ...script, voice_id: (script.voice_id || '').trim(), hours_before: Number(script.hours_before) });
      setScript(res.script);
      toast.success('Recordatorios guardados');
    } catch (e) {
      toast.error(e?.response?.data?.error?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="setting-card reminder-card">
      <div className="card-header-row">
        <h3>Llamadas de recordatorio</h3>
        <label className="toggle">
          <input type="checkbox" checked={script.enabled} onChange={(e) => set({ enabled: e.target.checked })} /> Activas
        </label>
      </div>
      <p className="help-text">
        La IA llama a quien tiene una cita pendiente (con teléfono y agente asignado) para recordársela y confirmar si asistirá.
        Requiere la PBX y la IA configuradas en Integraciones.
      </p>
      <div className="form-group">
        <label>Llamar con anticipación de (horas)</label>
        <input type="number" min="1" max="72" value={script.hours_before} onChange={(e) => set({ hours_before: e.target.value })} />
      </div>
      <div className="form-group">
        <label>Primera frase</label>
        <input value={script.first_message} onChange={(e) => set({ first_message: e.target.value })} placeholder={defaults.first_message} />
      </div>
      <div className="form-group">
        <label>Instrucciones para la IA</label>
        <textarea rows={4} value={script.prompt} onChange={(e) => set({ prompt: e.target.value })} placeholder={defaults.prompt} />
        <small>Puedes usar {PLACEHOLDERS.map((p) => <code key={p}>{p}</code>).reduce((a, b) => [a, ' ', b])}. Vacío = el guion por defecto.</small>
      </div>
      <VoiceFields className="form-row-2" language={script.language} voiceId={script.voice_id}
        onChange={(patch) => set(patch)} />
      <div className="reminder-actions">
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
      </div>
    </div>
  );
};

export default ReminderSettings;
