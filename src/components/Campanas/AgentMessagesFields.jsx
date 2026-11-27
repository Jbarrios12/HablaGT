// Frases del Agente IA fuera del flujo. Mismos textos por defecto que
// aribridge.DefaultMessages (backend): vacío = el texto por defecto.
export const MESSAGE_FIELDS = [
  { key: 'greeting', label: 'Saludo al contestar (si el flujo no tiene nodo Saludo)', def: 'Hola, le atiende el asistente virtual de HablaGT. ¿En qué puedo ayudarle?' },
  { key: 'farewell_reply', label: 'Despedida (intenciones con «Despedirse y colgar» sin mensaje propio)', def: 'Gracias por llamar, que tenga un buen día.' },
  { key: 'queue_timeout', label: 'Al volver de la cola sin que nadie atienda', def: 'Disculpe la espera, en este momento todos nuestros agentes están ocupados. ¿Puedo ayudarle en algo más o prefiere dejar un recado?' },
  { key: 'transfer_failed', label: 'Si no se pudo transferir', def: 'Lo siento, en este momento no puedo transferir su llamada. ¿Puedo ayudarle en algo más?' },
  { key: 'action_failed', label: 'Si un equipo, herramienta o acción falla o tarda demasiado', def: 'Disculpe, no pude completar eso en este momento. ¿Le puedo ayudar en algo más?' },
  { key: 'action_declined', label: 'Si el cliente no confirma una acción (dice que no)', def: 'Entendido, no lo hago. ¿Qué desea cambiar, o en qué más le puedo ayudar?' },
  { key: 'ai_error', label: 'Si la IA no pudo responder un turno', def: 'Disculpe, no entendí. ¿Podría repetirlo por favor?' },
];

export default function AgentMessagesFields({ value, onChange }) {
  const m = value || {};
  const custom = MESSAGE_FIELDS.filter((f) => (m[f.key] || '').trim()).length;
  return (
    <details className="turns-settings">
      <summary>
        Mensajes del agente
        <span className="muted">{custom ? `${custom} personalizados` : 'textos por defecto'}</span>
      </summary>
      {MESSAGE_FIELDS.map((f) => (
        <label key={f.key}>{f.label}
          <input value={m[f.key] || ''} placeholder={f.def} onChange={(e) => onChange({ ...m, [f.key]: e.target.value })} />
        </label>
      ))}
      <p className="help-text">Vacío = el texto por defecto (el que ves en gris). Escríbelos en el idioma del agente.</p>
    </details>
  );
}
