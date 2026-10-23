import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiTarget, FiPlay, FiLock, FiDownload } from 'react-icons/fi';
import { intentService, agentIAService, moduleService } from '../../services';
import { useModules } from '../../context/ModulesContext';
import { useToast } from '../../context/ToastContext';

const errMsg = (e, fallback) => e?.response?.data?.error?.message || fallback;

export const ACTION_TYPES = [
  { value: 'none', label: 'Solo ruta del flujo', desc: 'No hace nada por sí misma; úsala en las conexiones del flujo.' },
  { value: 'agenda', label: 'Asistente de citas del agente', desc: 'Responde el equipo de citas del agente (Agente IA → Asistente de citas; por defecto, el equipo «Asistente de citas»).', module: 'citas' },
  { value: 'reply', label: 'Responder con un mensaje', desc: 'Dice el mensaje al instante, sin IA.' },
  { value: 'end', label: 'Despedirse y colgar', desc: 'Dice el mensaje (o la despedida del agente) y termina la llamada.' },
  { value: 'tool', label: 'Usar una herramienta', desc: 'Un agente rápido usa la herramienta y pide los datos que falten.' },
  { value: 'crew', label: 'Pasar a un equipo IA', desc: 'Responde uno de tus equipos CrewAI / LangChain.' },
  { value: 'transfer', label: 'Transferir a humanos', desc: 'A los agentes de la campaña (balanceo + espera).' },
  { value: 'kb', label: 'Responder con la base de conocimiento', desc: 'Busca en la KB del agente y responde.' },
];

export const METHOD_LABELS = { keyword: 'Palabra clave', llm: 'Modelo (IA)', ongoing: 'Trámite en curso', fallback: 'Respaldo (falló el modelo)' };

const lines = (text) => text.split('\n').map((s) => s.trim()).filter(Boolean);
const commas = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);

// IntentSection is the tenant's intent catalog: what callers may want,
// how it is recognized and what runs when the flow has no route for it.
export default function IntentSection({ crews, tools, builtinTools }) {
  const toast = useToast();
  const [intents, setIntents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = async () => {
    try {
      const res = await intentService.list();
      setIntents(res?.items || []);
    } catch (e) {
      toast.error(errMsg(e, 'Error al cargar las intenciones'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    try {
      if (form.id) await intentService.update(form.id, form);
      else await intentService.create(form);
      toast.success(form.id ? 'Intención guardada' : 'Intención creada');
      setModal(null);
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Error al guardar la intención'));
    }
  };

  const toggle = async (intent) => {
    try {
      await intentService.update(intent.id, { ...intent, activa: !intent.activa });
      load();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo cambiar'));
    }
  };

  const remove = async (intent) => {
    if (!window.confirm(`¿Eliminar la intención "${intent.nombre}"? Las conexiones de flujo que la usan dejarán de cumplirse.`)) return;
    try {
      await intentService.remove(intent.id);
      toast.success('Intención eliminada');
      load();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo eliminar'));
    }
  };

  const actionLabel = (a) => {
    const type = a?.type || 'none';
    if (type === 'tool') {
      const b = builtinTools.find((t) => t.id === a.ref);
      const c = tools.find((t) => `tool:${t.id}` === a.ref);
      return `Herramienta: ${b?.label || c?.nombre || 'eliminada'}`;
    }
    if (type === 'crew') return `Equipo: ${crews.find((c) => c.id === a.ref)?.nombre || 'eliminado'}`;
    return ACTION_TYPES.find((t) => t.value === type)?.label;
  };

  return (
    <div className="crew-section">
      <BusinessTemplate intents={intents} onApplied={load} />
      <TestPhrase intents={intents} actionLabel={actionLabel} />

      <div className="sub-section">
        <div className="sub-header">
          <h3><FiTarget /> Intenciones</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setModal({ data: null })}><FiPlus /> Nueva intención</button>
        </div>
        <p className="help-text crew-intro">
          Lo que puede querer quien llama. El agente la reconoce por su descripción y ejemplos (y por palabras clave, sin costo).
          Si el flujo tiene una conexión para la intención, manda el flujo; si no, se ejecuta su acción.
          Las del sistema no se borran porque los flujos las usan, pero puedes editarlas o desactivarlas.
        </p>
        {loading ? (
          <div className="empty-state"><p>Cargando...</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Intención</th><th>Ejemplos</th><th>Palabras clave</th><th>Acción</th><th>Activa</th><th></th></tr></thead>
              <tbody>
                {intents.map((i) => (
                  <tr key={i.id} className={i.activa ? '' : 'intent-off'}>
                    <td>
                      <strong>{i.nombre}</strong> {i.sistema && <span className="badge info" title="Del sistema"><FiLock /> sistema</span>}
                      <div className="muted crew-tool-desc"><code>{i.clave}</code> · {i.descripcion}</div>
                    </td>
                    <td>{(i.ejemplos || []).length}</td>
                    <td className="intent-keywords">{(i.palabras_clave || []).join(', ') || <span className="muted">—</span>}</td>
                    <td>{actionLabel(i.accion)}</td>
                    <td><input type="checkbox" checked={i.activa} onChange={() => toggle(i)} aria-label={`Activar ${i.nombre}`} /></td>
                    <td>
                      <button className="btn-icon" onClick={() => setModal({ data: i })} title="Editar"><FiEdit2 /></button>
                      {!i.sistema && <button className="btn-icon" onClick={() => remove(i)} title="Eliminar"><FiTrash2 /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <IntentModal data={modal.data} crews={crews} tools={tools} builtinTools={builtinTools}
            onClose={() => setModal(null)} onSave={save} />
        )}
      </AnimatePresence>
    </div>
  );
}

// TestPhrase shows which intent a phrase gets for an agent, how it was
// recognized and what would run. Nothing is executed.
// BusinessTemplate offers the suggested intents of a giro (the tenant's
// one first) and creates the ones the tenant does not have.
function BusinessTemplate({ intents, onApplied }) {
  const toast = useToast();
  const { businessType, businessTypes, templates } = useModules();
  const options = businessTypes.filter((b) => templates[b.key] > 0);
  const [giro, setGiro] = useState('');
  const [applying, setApplying] = useState(false);
  const selected = giro || (templates[businessType] ? businessType : options[0]?.key) || '';
  if (options.length === 0) return null;

  const apply = async () => {
    setApplying(true);
    try {
      const res = await moduleService.applyTemplate(selected);
      const n = res?.created?.length || 0;
      if (n) toast.success(`Se agregaron ${n} intenciones sugeridas; revísalas y asígnales una acción`);
      else toast.info('Ya tienes todas las intenciones de ese giro');
      onApplied();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudieron cargar las intenciones'));
    } finally {
      setApplying(false);
    }
  };

  const mine = businessTypes.find((b) => b.key === businessType);
  return (
    <div className="sub-section business-template">
      <div className="business-template-text">
        <strong>Intenciones sugeridas por giro</strong>
        <span className="muted">
          {mine ? `Tu empresa está registrada como "${mine.nombre}". ` : ''}
          Carga las intenciones típicas del giro (por ejemplo, pedidos y reclamos para un restaurante) y luego conéctalas a tus herramientas. Las que ya tienes no se tocan.
        </span>
      </div>
      <div className="business-template-actions">
        <select value={selected} onChange={(e) => setGiro(e.target.value)} aria-label="Giro">
          {[...new Set(options.map((b) => b.grupo || 'Otros'))].map((g) => (
            <optgroup key={g} label={g}>
              {options.filter((b) => (b.grupo || 'Otros') === g)
                .map((b) => <option key={b.key} value={b.key}>{b.nombre} ({templates[b.key]})</option>)}
            </optgroup>
          ))}
        </select>
        <button className="btn btn-outline btn-sm" onClick={apply} disabled={applying || !selected}>
          <FiDownload /> {applying ? 'Cargando...' : 'Cargar intenciones'}
        </button>
      </div>
    </div>
  );
}

function TestPhrase({ intents, actionLabel }) {
  const toast = useToast();
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    agentIAService.list({ page_size: 200 }).then((r) => setAgents(r?.items || [])).catch(() => setAgents([]));
  }, []);

  const run = async (e) => {
    e.preventDefault();
    setRunning(true);
    setResult(null);
    try {
      setResult(await intentService.test({ text, agent_id: agentId || undefined }));
    } catch (err) {
      toast.error(errMsg(err, 'No se pudo clasificar'));
    } finally {
      setRunning(false);
    }
  };

  const intent = result && intents.find((i) => i.clave === result.intent);

  return (
    <form className="sub-section intent-test" onSubmit={run}>
      <div className="sub-header"><h3><FiPlay /> Probar frase</h3></div>
      <div className="intent-test-row">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej. quisiera saber cuánto debo de mi tarjeta" aria-label="Frase" />
        <select value={agentId} onChange={(e) => setAgentId(e.target.value)} aria-label="Agente IA">
          <option value="">Todas las intenciones activas</option>
          {agents.map((a) => <option key={a.id} value={a.id}>Como {a.nombre}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" disabled={running || !text.trim()}>{running ? 'Clasificando...' : 'Probar'}</button>
      </div>
      {result && (
        <div className="intent-test-result">
          <span className={`badge ${result.recognized ? 'success' : 'warning'}`}>{result.recognized ? 'Reconocida' : 'No reconocida'}</span>
          <strong>{intent?.nombre || result.nombre}</strong> <code>{result.intent}</code>
          <span className="muted">· {METHOD_LABELS[result.method] || result.method}</span>
          <span className="muted">· Acción: {actionLabel(result.action)}{result.action?.type !== 'none' ? ' (si el flujo no tiene ruta para ella)' : ''}</span>
          {!result.recognized && <p className="help-text">Ninguna intención encaja: se atiende como consulta general. Si es algo frecuente, crea una intención o agrega esta frase como ejemplo.</p>}
        </div>
      )}
    </form>
  );
}

function IntentModal({ data, crews, tools, builtinTools, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    id: data?.id,
    clave: data?.clave || '',
    nombre: data?.nombre || '',
    descripcion: data?.descripcion || '',
    ejemplos: (data?.ejemplos || []).join('\n'),
    palabras_clave: (data?.palabras_clave || []).join(', '),
    accion: { type: 'none', ref: '', message: '', ...(data?.accion || {}) },
    activa: data?.activa ?? true,
    sistema: data?.sistema || false,
    orden: data?.orden ?? 100,
    apertura: data?.apertura || false,
    por_defecto: data?.por_defecto || false,
  }));
  const { has } = useModules();
  const [saving, setSaving] = useState(false);
  const setAction = (patch) => setForm((f) => ({ ...f, accion: { ...f.accion, ...patch } }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ ...form, orden: Number(form.orden) || 100, ejemplos: lines(form.ejemplos), palabras_clave: commas(form.palabras_clave) });
    setSaving(false);
  };

  const type = form.accion.type;
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal crew-modal crew-modal-wide" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{form.id ? 'Editar intención' : 'Nueva intención'}</h2>
          <button className="modal-close" onClick={onClose}><FiX /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="crew-row">
              <label>Nombre *<input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Consultar saldo" /></label>
              <label>Clave *
                <input value={form.clave} disabled={form.sistema} required placeholder="consultar_saldo"
                  onChange={(e) => setForm({ ...form, clave: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} />
              </label>
            </div>
            {form.sistema && <p className="help-text">Intención del sistema: la clave no cambia porque los flujos la usan.</p>}
            <label>Descripción para el clasificador *
              <textarea rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required
                placeholder="Quiere saber cuánto debe o el saldo pendiente de su cuenta o tarjeta." />
            </label>
            <label>Frases de ejemplo (una por línea)
              <textarea rows={4} value={form.ejemplos} onChange={(e) => setForm({ ...form, ejemplos: e.target.value })}
                placeholder={'¿cuánto debo?\nquiero saber mi saldo\n¿cuánto me falta por pagar?'} />
            </label>
            <label>Palabras clave (separadas por coma, opcional)
              <input value={form.palabras_clave} onChange={(e) => setForm({ ...form, palabras_clave: e.target.value })} placeholder="saldo, cuánto debo" />
            </label>
            <p className="help-text">
              Se reconocen al instante y sin costo, en frases de hasta 20 palabras. Comodines: <code>cancel*</code> = cualquier
              palabra que empiece así (cancelar, cancelarla); <code>hablar con * agente</code> = hasta 3 palabras en medio.
              No cuentan después de un «no» en la misma frase («no quiero cancelar»).
            </p>
            <div className="crew-row">
              <label title="Si varias intenciones coinciden por palabras clave, gana la de número menor.">Prioridad (orden)
                <input type="number" min="1" max="999" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} />
              </label>
              <div className="crew-field">
                <label className="checkbox-item">
                  <input type="checkbox" checked={form.apertura} onChange={(e) => setForm({ ...form, apertura: e.target.checked })} />
                  Solo al inicio de la llamada (saludo): no cuenta si la frase trae otra intención
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" checked={form.por_defecto} onChange={(e) => setForm({ ...form, por_defecto: e.target.checked })} />
                  Intención por defecto: la de todo lo que no se reconozca
                </label>
              </div>
            </div>

            <div className="crew-field">
              <span>Acción</span>
              <select value={type} onChange={(e) => setAction({ type: e.target.value, ref: '' })}>
                {ACTION_TYPES.filter((t) => !t.module || has(t.module) || t.value === type)
                  .map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <small className="help-text">{ACTION_TYPES.find((t) => t.value === type)?.desc} Primero responde el flujo del agente; la acción se usa cuando el flujo no tiene respuesta para esta intención.</small>
            </div>
            {type === 'tool' && (
              <label>Herramienta
                <select value={form.accion.ref} onChange={(e) => setAction({ ref: e.target.value })} required>
                  <option value="">Seleccionar...</option>
                  <optgroup label="Incluidas">
                    {builtinTools.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </optgroup>
                  {tools.length > 0 && (
                    <optgroup label="Tus herramientas">
                      {tools.map((t) => <option key={t.id} value={`tool:${t.id}`}>{t.nombre}</option>)}
                    </optgroup>
                  )}
                </select>
              </label>
            )}
            {type === 'crew' && (
              <label>Equipo
                <select value={form.accion.ref} onChange={(e) => setAction({ ref: e.target.value })} required>
                  <option value="">Seleccionar...</option>
                  {crews.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
            )}
            {(type === 'reply' || type === 'end') && (
              <label>{type === 'reply' ? 'Mensaje *' : 'Mensaje de despedida (vacío = la despedida del agente)'}
                <input value={form.accion.message} onChange={(e) => setAction({ message: e.target.value })} required={type === 'reply'}
                  placeholder={type === 'reply' ? '¡Hola! Le atiende el asistente virtual. ¿En qué puedo ayudarle?' : 'Gracias por llamar, que tenga un buen día.'} />
              </label>
            )}
            {type === 'transfer' && (
              <label>Mensaje antes de transferir
                <input value={form.accion.message} onChange={(e) => setAction({ message: e.target.value })} placeholder="Claro, le comunico con uno de nuestros agentes." />
              </label>
            )}
            <label className="checkbox-item turns-toggle">
              <input type="checkbox" checked={form.activa} onChange={(e) => setForm({ ...form, activa: e.target.checked })} /> Activa
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : (form.id ? 'Guardar' : 'Crear')}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
