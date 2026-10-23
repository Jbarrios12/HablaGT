// Idioma y voz de una llamada de IA (Agente IA y recordatorios).
// Los códigos coinciden con los del backend (aribridge.Languages).
export const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'pt', label: 'Portugués' },
  { value: 'fr', label: 'Francés' },
];

// Voces de OpenAI (tts-1). ElevenLabs y Cartesia usan el ID de su consola.
const OPENAI_VOICES = ['alloy', 'ash', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'];

export default function VoiceFields({ language, voiceId, onChange, className = 'crew-row' }) {
  const known = !voiceId || OPENAI_VOICES.includes(voiceId);
  return (
    <div className={className}>
      <label>Idioma de la conversación
        <select value={language || 'es'} onChange={(e) => onChange({ language: e.target.value })}>
          {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </label>
      <label>Voz
        <select value={known ? (voiceId || '') : '__custom'}
          onChange={(e) => onChange({ voice_id: e.target.value === '__custom' ? ' ' : e.target.value })}>
          <option value="">La de Integraciones</option>
          {OPENAI_VOICES.map((v) => <option key={v} value={v}>OpenAI · {v}</option>)}
          <option value="__custom">Otra (ID de ElevenLabs / Cartesia)</option>
        </select>
        {!known && (
          <input value={voiceId.trim()} onChange={(e) => onChange({ voice_id: e.target.value || ' ' })} placeholder="ID de la voz" />
        )}
      </label>
    </div>
  );
}
