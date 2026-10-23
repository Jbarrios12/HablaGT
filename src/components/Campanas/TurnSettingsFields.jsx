import { FiCheck } from 'react-icons/fi';

// Mismos valores por defecto y rangos que aribridge.TurnSettings (backend).
export const TURN_DEFAULTS = {
  end_silence_ms: 1200,
  max_turn_seconds: 20,
  no_input_seconds: 6,
  max_turns: 40,
  max_silent_turns: 3,
  barge_in: true,
  barge_in_min_speech_ms: 400,
  sensitivity: 'media',
  noise_reduction: true,
  echo_guard: true,
  greeting_barge_in: false,
  reprompt_message: '',
  no_input_goodbye: '',
  max_turns_goodbye: '',
};

const PRESETS = [
  { id: 'agil', label: 'Ágil', desc: 'Responde rápido; para preguntas cortas', values: { end_silence_ms: 800, no_input_seconds: 5, barge_in_min_speech_ms: 300 } },
  { id: 'equilibrado', label: 'Equilibrado', desc: 'Recomendado para la mayoría', values: { end_silence_ms: 1200, no_input_seconds: 6, barge_in_min_speech_ms: 400 } },
  { id: 'paciente', label: 'Paciente', desc: 'Deja pensar; personas mayores o datos largos', values: { end_silence_ms: 2000, no_input_seconds: 10, barge_in_min_speech_ms: 600 } },
];

const NUMBER_FIELDS = [
  { key: 'end_silence_ms', label: 'Silencio que termina el turno (ms)', min: 400, max: 5000, step: 100, help: 'Pausa del cliente tras la cual la IA responde.' },
  { key: 'no_input_seconds', label: 'Espera si no habla (s)', min: 2, max: 30, help: 'Luego repregunta.' },
  { key: 'max_turn_seconds', label: 'Máximo por turno (s)', min: 5, max: 60, help: 'Corta a quien habla sin parar.' },
  { key: 'max_silent_turns', label: 'Silencios antes de colgar', min: 1, max: 10 },
  { key: 'max_turns', label: 'Turnos máximos por llamada', min: 3, max: 200 },
];

const withDefaults = (turns) => ({ ...TURN_DEFAULTS, ...(turns || {}) });

// TurnSettingsFields edita settings.turns del Agente IA: cómo toma turnos
// en el teléfono (silencios, interrupciones, límites y mensajes).
export default function TurnSettingsFields({ value, onChange }) {
  const t = withDefaults(value);
  const set = (patch) => onChange({ ...t, ...patch });
  const activePreset = PRESETS.find((p) => Object.entries(p.values).every(([k, v]) => t[k] === v))?.id;

  return (
    <details className="turns-settings">
      <summary>
        Conversación telefónica
        <span className="muted">
          {PRESETS.find((p) => p.id === activePreset)?.label || 'Personalizado'} · {t.barge_in ? 'se puede interrumpir' : 'sin interrupciones'}
        </span>
      </summary>

      <div className="turns-presets" role="radiogroup" aria-label="Ritmo de la conversación">
        {PRESETS.map((p) => (
          <button type="button" role="radio" aria-checked={activePreset === p.id} key={p.id}
            className={`crew-engine ${activePreset === p.id ? 'active' : ''}`} onClick={() => set(p.values)}>
            <strong>{activePreset === p.id && <FiCheck />} {p.label}</strong>
            <small>{p.desc}</small>
          </button>
        ))}
      </div>

      <label className="checkbox-item turns-toggle">
        <input type="checkbox" checked={t.barge_in} onChange={(e) => set({ barge_in: e.target.checked })} />
        El cliente puede interrumpir a la IA hablando encima
      </label>
      {t.barge_in && (
        <div className="crew-row">
          <label>Hablar al menos (ms) para interrumpir
            <input type="number" min="100" max="2000" step="50" value={t.barge_in_min_speech_ms}
              onChange={(e) => set({ barge_in_min_speech_ms: Number(e.target.value) })} />
          </label>
          <label>Sensibilidad a la voz
            <select value={t.sensitivity} onChange={(e) => set({ sensitivity: e.target.value })}>
              <option value="alta">Alta: capta voces bajas (lugares silenciosos)</option>
              <option value="media">Media (recomendada)</option>
              <option value="baja">Baja: ignora ruido de fondo (calle, call center)</option>
            </select>
          </label>
        </div>
      )}
      {t.barge_in && (
        <label className="checkbox-item turns-toggle" title="Evita que la IA se corte sola cuando el cliente usa altavoz o un teléfono sin cancelación de eco.">
          <input type="checkbox" checked={t.echo_guard} onChange={(e) => set({ echo_guard: e.target.checked })} />
          Protección contra eco: mientras la IA habla, solo una voz clara la interrumpe (recomendado)
        </label>
      )}
      {t.barge_in && (
        <label className="checkbox-item turns-toggle" title="Desactivado, el saludo siempre se escucha completo: es cuando más se cuela el eco o un «¿aló?».">
          <input type="checkbox" checked={t.greeting_barge_in} onChange={(e) => set({ greeting_barge_in: e.target.checked })} />
          Permitir interrumpir también el saludo
        </label>
      )}

      <label className="checkbox-item turns-toggle">
        <input type="checkbox" checked={t.noise_reduction} onChange={(e) => set({ noise_reduction: e.target.checked })} />
        Reducción de ruido antes de detectar la voz (recomendado)
      </label>

      <div className="turns-grid">
        {NUMBER_FIELDS.map((f) => (
          <label key={f.key} title={f.help}>{f.label}
            <input type="number" min={f.min} max={f.max} step={f.step || 1} value={t[f.key]}
              onChange={(e) => set({ [f.key]: Number(e.target.value) })} />
          </label>
        ))}
      </div>

      <label>Si no le escuchó
        <input value={t.reprompt_message} onChange={(e) => set({ reprompt_message: e.target.value })}
          placeholder="¿Sigue ahí? No le he escuchado bien, ¿podría repetirlo?" />
      </label>
      <label>Al colgar por silencio
        <input value={t.no_input_goodbye} onChange={(e) => set({ no_input_goodbye: e.target.value })}
          placeholder="No le escucho. Gracias por llamar, hasta luego." />
      </label>
      <label>Al llegar a los turnos máximos
        <input value={t.max_turns_goodbye} onChange={(e) => set({ max_turns_goodbye: e.target.value })}
          placeholder="Gracias por su llamada. Si necesita algo más, con gusto le atendemos de nuevo." />
      </label>
      <p className="help-text">
        La IA detecta cuándo empieza y termina de hablar el cliente. Con interrupción activada, deja de hablar en cuanto el cliente habla más que el mínimo, sin perder lo que dijo.
        Si detecta que se interrumpe con su propio eco (el cliente en altavoz), repite la frase y deja de aceptar interrupciones en esa llamada.
        Si la central no permite detectar la voz, usa turnos clásicos (silencio en segundos enteros, sin interrupción).
      </p>
    </details>
  );
}
