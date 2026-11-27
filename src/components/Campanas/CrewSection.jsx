import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiX, FiPlay, FiTool, FiUsers, FiArrowUp, FiArrowDown, FiCheck, FiZap, FiAlertCircle, FiActivity, FiTarget, FiDatabase, FiGlobe,
} from 'react-icons/fi';
import { crewService, aiToolService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { useModules } from '../../context/ModulesContext';
import RunMonitor, { RunSteps, RUN_STATUS } from './RunMonitor';
import IntentSection from './IntentSection';

export const ENGINES = {
  crewai: { label: 'CrewAI', desc: 'Hasta 4 agentes que trabajan en orden. Para analizar y luego responder; más lento.' },
  langchain: { label: 'LangChain', desc: 'Un agente que usa las herramientas directamente. Más rápido en llamadas.' },
};

export const LOG_LEVELS = [
  { value: 'full', label: 'Completo', desc: 'Entrada, respuesta y cada herramienta con sus datos' },
  { value: 'basic', label: 'Básico', desc: 'Entrada, respuesta, tiempos y qué herramientas usó, sin sus datos' },
  { value: 'errors', label: 'Solo errores', desc: 'Guarda únicamente las ejecuciones que fallan' },
  { value: 'off', label: 'Apagado', desc: 'No guarda nada' },
];

const DEFAULT_SETTINGS = { engine: 'crewai', model: '', temperature: 0.3, max_iter: 5, timeout_seconds: 45, log_level: 'full' };

const errMsg = (e, fallback) => e?.response?.data?.error?.message || fallback;

// Built-in tools of optional modules: when the module is off the backend
// leaves them out of the catalog.
const MODULE_TOOLS = {
  list_events: 'Consultar citas', create_event: 'Agendar cita', cancel_event: 'Cancelar cita', reschedule_event: 'Reprogramar cita',
};

const emptyAgent = () => ({ nombre: '', role: '', goal: '', backstory: '', tools: [], task: '', expected_output: '' });

// Plantillas para empezar: el agente de citas que ya usa la plataforma y
// dos ejemplos de equipos.
const CREW_TEMPLATES = [
  {
    id: 'agenda',
    module: 'citas',
    label: 'Asistente de agenda',
    crew: {
      nombre: 'Asistente de agenda',
      descripcion: 'Agenda, consulta y cancela citas en Agendas.',
      agents: [{
        ...emptyAgent(),
        nombre: 'Recepción',
        role: 'Asistente de agenda telefónico',
        goal: 'Agendar, consultar y cancelar citas de quien llama sin inventar horarios.',
        backstory: 'Eres la recepcionista de la empresa: amable, breve y precisa.',
        tools: ['list_events', 'create_event', 'cancel_event', 'reschedule_event', 'find_or_create_contact'],
        task: [
          'Atiende lo que pide el interlocutor sobre sus citas. Reglas:',
          '1. Usa list_events SOLO si pide consultar, cancelar o reprogramar. Al agendar NO leas las citas existentes. Cuando las leas, di solo las activas en voz alta natural (día, hora y con quién), sin IDs.',
          "2. Para AGENDAR: calcula la fecha si dice 'mañana' o un día relativo. Si dijo la hora en cualquier forma ('3 de la tarde', '10 de la mañana'), conviértela tú a HH:MM de 24 horas SIN preguntar; solo si no dijo ninguna hora, pregúntala (nunca la inventes). Necesitas también el NOMBRE: si ya lo dijo úsalo; pregúntalo como máximo una vez. En cuanto tengas fecha, hora y nombre, usa create_event en ese mismo turno (tipo = 'cita', titulo = 'Cita con <nombre>', contacto = el nombre) y confirma el día y la hora agendados. NO pidas confirmación de datos que ya dijo con claridad. No pidas el teléfono: es opcional (usa caller_number de los datos de la llamada si está).",
          '3. Para CANCELAR: busca la cita con list_events y usa cancel_event.',
          '4. Para MOVER o REPROGRAMAR: búscala con list_events, pregunta la nueva fecha y hora si faltan y usa reschedule_event (no la canceles ni crees otra).',
          '5. Si se despide, despídete cordialmente.',
        ].join('\n'),
      }],
    },
  },
  {
    id: 'pedidos',
    label: 'Toma y seguimiento de pedidos',
    crew: {
      nombre: 'Pedidos',
      descripcion: 'Toma pedidos y consulta su estado. Agrega tus herramientas (API o base de datos) del punto de venta.',
      settings: { ...DEFAULT_SETTINGS, engine: 'langchain', timeout_seconds: 30 },
      agents: [{
        ...emptyAgent(),
        nombre: 'Pedidos',
        role: 'Asistente de pedidos telefónico',
        goal: 'Tomar pedidos completos y decir el estado de los existentes sin inventar datos.',
        backstory: 'Atiendes la línea de pedidos del restaurante: amable, breve y precisa.',
        tools: ['search_kb'],
        task: [
          'Atiende lo que pide el interlocutor sobre sus pedidos. Reglas:',
          '1. Para un pedido NUEVO: pregunta qué desea (productos y cantidades), si es a domicilio o para recoger (dirección o sucursal) y la forma de pago. Usa search_kb para precios, promociones y productos; no inventes precios.',
          '2. Cuando tengas todo, repite el pedido completo con el total una sola vez y regístralo con la herramienta de tu sistema (si la tienes).',
          '3. Para el ESTADO de un pedido: búscalo con la herramienta de consulta usando caller_number (o el número que te diga) y di el estado y el tiempo estimado.',
          '4. Respuestas cortas, para voz. Si hay un reclamo, ofrece comunicarlo con un asesor.',
        ].join('\n'),
      }],
    },
  },
  {
    id: 'kb',
    label: 'Consultas con la base de conocimiento',
    crew: {
      nombre: 'Atención de consultas',
      descripcion: 'Responde preguntas de la empresa con la base de conocimiento.',
      agents: [{
        ...emptyAgent(),
        nombre: 'Consultor',
        role: 'Especialista de atención al cliente',
        goal: 'Responder con exactitud usando solo la información de la empresa.',
        tools: ['search_kb'],
        task: 'Busca en la base de conocimiento y responde la pregunta. Si no está, dilo y ofrece transferir con un agente.',
      }],
    },
  },
  {
    id: 'cobranza',
    label: 'Cobranza (análisis + gestión)',
    crew: {
      nombre: 'Cobranza',
      descripcion: 'Un agente revisa la situación del cliente y otro negocia el pago.',
      agents: [
        {
          ...emptyAgent(),
          nombre: 'Analista',
          role: 'Analista de cartera',
          goal: 'Entender la situación de pago del cliente.',
          tools: ['search_kb'],
          task: 'Revisa las políticas de pago en la base de conocimiento y resume qué opciones aplican a este cliente.',
          expected_output: 'Resumen breve de la situación y las opciones de pago posibles.',
        },
        {
          ...emptyAgent(),
          nombre: 'Gestor',
          role: 'Gestor de cobro empático',
          goal: 'Acordar un compromiso de pago realista con el cliente.',
          task: 'Con el análisis anterior, propón al cliente una opción de pago y pide su compromiso.',
        },
      ],
    },
  },
];

export default function CrewSection() {
  const toast = useToast();
  const [crews, setCrews] = useState([]);
  const [builtinTools, setBuiltinTools] = useState([]);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crewModal, setCrewModal] = useState(null); // {data}
  const [toolModal, setToolModal] = useState(null); // {data}
  const [testCrew, setTestCrew] = useState(null);
  const [view, setView] = useState('equipos');

  const load = async () => {
    try {
      const [c, t] = await Promise.all([crewService.list(), aiToolService.list()]);
      setCrews(c?.items || []);
      setBuiltinTools(c?.builtin_tools || []);
      setTools(t?.items || []);
    } catch (e) {
      toast.error(errMsg(e, 'Error al cargar los agentes CrewAI'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toolLabel = (ref) => {
    const b = builtinTools.find((t) => t.id === ref);
    if (b) return b.label;
    if (MODULE_TOOLS[ref]) return `${MODULE_TOOLS[ref]} (módulo apagado)`;
    const custom = tools.find((t) => `tool:${t.id}` === ref);
    return custom ? custom.nombre : 'Herramienta eliminada';
  };

  const saveCrew = async (form) => {
    try {
      if (form.id) await crewService.update(form.id, form);
      else await crewService.create(form);
      toast.success(form.id ? 'Equipo guardado' : 'Equipo creado');
      setCrewModal(null);
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Error al guardar el equipo'));
    }
  };

  const deleteCrew = async (crew) => {
    if (!window.confirm(`¿Eliminar el equipo "${crew.nombre}"? Los nodos de flujo que lo usan dejarán de responder con él.`)) return;
    try {
      await crewService.remove(crew.id);
      toast.success('Equipo eliminado');
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Error al eliminar el equipo'));
    }
  };

  const saveTool = async (form) => {
    try {
      if (form.id) await aiToolService.update(form.id, form);
      else await aiToolService.create(form);
      toast.success(form.id ? 'Herramienta guardada' : 'Herramienta creada');
      setToolModal(null);
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Error al guardar la herramienta'));
    }
  };

  const deleteTool = async (tool) => {
    if (!window.confirm(`¿Eliminar la herramienta "${tool.nombre}"?`)) return;
    try {
      await aiToolService.remove(tool.id);
      toast.success('Herramienta eliminada');
      load();
    } catch (e) {
      toast.error(errMsg(e, 'Error al eliminar la herramienta'));
    }
  };

  return (
    <div className="crew-section">
      <div className="crew-view-tabs" role="tablist">
        <button role="tab" aria-selected={view === 'equipos'} className={view === 'equipos' ? 'active' : ''} onClick={() => setView('equipos')}><FiUsers /> Equipos y herramientas</button>
        <button role="tab" aria-selected={view === 'intenciones'} className={view === 'intenciones' ? 'active' : ''} onClick={() => setView('intenciones')}><FiTarget /> Intenciones</button>
        <button role="tab" aria-selected={view === 'monitoreo'} className={view === 'monitoreo' ? 'active' : ''} onClick={() => setView('monitoreo')}><FiActivity /> Monitoreo</button>
      </div>

      {view === 'monitoreo' && <RunMonitor crews={crews} />}
      {view === 'intenciones' && <IntentSection crews={crews} tools={tools} builtinTools={builtinTools} />}
      {view === 'equipos' && (
      <>
      <div className="sub-section">
        <div className="sub-header">
          <h3><FiUsers /> Equipos de agentes IA</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setCrewModal({ data: null })}><FiPlus /> Nuevo equipo</button>
        </div>
        <p className="help-text crew-intro">
          Un equipo son uno o varios agentes de IA con un rol, un objetivo y herramientas, con motor <strong>CrewAI</strong> (varios agentes en orden)
          o <strong>LangChain</strong> (un agente rápido). Úsalos en un flujo con el nodo <strong>Agente con herramientas</strong>; cada ejecución queda en <strong>Monitoreo</strong>.
        </p>
        {loading ? (
          <div className="empty-state"><p>Cargando...</p></div>
        ) : crews.length === 0 ? (
          <div className="empty-state"><p>No hay equipos. Crea uno desde cero o desde una plantilla.</p></div>
        ) : (
          <div className="crew-grid">
            {crews.map((crew) => (
              <div key={crew.id} className="crew-card">
                <div className="crew-card-head">
                  <h4>{crew.nombre}</h4>
                  <div className="crew-card-actions">
                    <button className="btn-icon" onClick={() => setTestCrew(crew)} title="Probar"><FiPlay /></button>
                    <button className="btn-icon" onClick={() => setCrewModal({ data: crew })} title="Editar"><FiEdit2 /></button>
                    <button className="btn-icon" onClick={() => deleteCrew(crew)} title="Eliminar"><FiTrash2 /></button>
                  </div>
                </div>
                <div className="crew-card-meta">
                  <span className={`badge ${crew.settings?.engine === 'langchain' ? 'info' : 'brand'}`}>{ENGINES[crew.settings?.engine || 'crewai']?.label}</span>
                  <span className="muted">Registro: {LOG_LEVELS.find((l) => l.value === (crew.settings?.log_level || 'full'))?.label}</span>
                  <span className="muted">· máx. {crew.settings?.timeout_seconds || 45} s</span>
                </div>
                {crew.descripcion && <p className="crew-card-desc">{crew.descripcion}</p>}
                <ol className="crew-card-agents">
                  {(crew.agents || []).map((a, i) => (
                    <li key={i}>
                      <strong>{a.nombre || a.role}</strong>
                      {a.nombre && <span className="muted"> · {a.role}</span>}
                      {(a.tools || []).length > 0 && (
                        <div className="crew-tool-chips">
                          {a.tools.map((ref) => <span key={ref} className="badge brand">{toolLabel(ref)}</span>)}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sub-section">
        <div className="sub-header">
          <h3><FiTool /> Herramientas</h3>
          <button className="btn btn-outline btn-sm" onClick={() => setToolModal({ data: null })}><FiPlus /> Nueva herramienta</button>
        </div>
        <p className="help-text crew-intro">
          Conecta tus sistemas (CRM, ERP, punto de venta…) por <strong>API HTTP</strong> o directo a su <strong>base de datos</strong> con una consulta SQL. El agente decide cuándo usar la herramienta según su descripción y llena sus parámetros con lo que dijo quien llama.
          Además de estas, todos los agentes pueden usar las incluidas: {builtinTools.map((t) => t.label).join(', ')}.
        </p>
        {!loading && tools.length === 0 ? (
          <div className="empty-state"><p>No hay herramientas propias todavía.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nombre</th><th>Tipo</th><th>Conexión</th><th>Parámetros</th><th></th></tr></thead>
              <tbody>
                {tools.map((t) => (
                  <tr key={t.id}>
                    <td><strong>{t.nombre}</strong><div className="muted crew-tool-desc">{t.descripcion}</div></td>
                    <td><span className={`badge ${t.tipo === 'sql' ? 'info' : 'brand'}`}>{t.tipo === 'sql' ? <><FiDatabase /> Base de datos</> : <><FiGlobe /> API HTTP</>}</span></td>
                    <td><code className="crew-url">{toolSummary(t)}</code></td>
                    <td>{(t.parameters || []).map((p) => p.name).join(', ') || <span className="muted">—</span>}</td>
                    <td>
                      <button className="btn-icon" onClick={() => setToolModal({ data: t })} title="Editar"><FiEdit2 /></button>
                      <button className="btn-icon" onClick={() => deleteTool(t)} title="Eliminar"><FiTrash2 /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      <AnimatePresence>
        {crewModal && (
          <CrewModal
            data={crewModal.data}
            builtinTools={builtinTools}
            tools={tools}
            onClose={() => setCrewModal(null)}
            onSave={saveCrew}
          />
        )}
        {toolModal && <ToolModal data={toolModal.data} onClose={() => setToolModal(null)} onSave={saveTool} />}
        {testCrew && <CrewTestModal crew={testCrew} onClose={() => setTestCrew(null)} />}
      </AnimatePresence>
    </div>
  );
}

function ModalShell({ title, wide, onClose, children }) {
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className={`modal crew-modal ${wide ? 'crew-modal-wide' : ''}`}
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}><FiX /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function CrewModal({ data, builtinTools, tools, onClose, onSave }) {
  const { has: hasModule } = useModules();
  const [form, setForm] = useState(() => ({
    id: data?.id,
    nombre: data?.nombre || '',
    descripcion: data?.descripcion || '',
    agents: data?.agents?.length ? data.agents.map((a) => ({ ...emptyAgent(), ...a })) : [emptyAgent()],
    settings: { ...DEFAULT_SETTINGS, ...(data?.settings || {}) },
  }));
  const engine = form.settings.engine || 'crewai';
  const single = engine === 'langchain';
  const setSetting = (patch) => setForm((f) => ({ ...f, settings: { ...f.settings, ...patch } }));
  const visibleAgents = single ? form.agents.slice(0, 1) : form.agents;
  const [saving, setSaving] = useState(false);

  const setAgent = (i, patch) => setForm((f) => ({ ...f, agents: f.agents.map((a, j) => (j === i ? { ...a, ...patch } : a)) }));
  const toggleTool = (i, ref) => {
    const current = form.agents[i].tools || [];
    setAgent(i, { tools: current.includes(ref) ? current.filter((t) => t !== ref) : [...current, ref] });
  };
  const move = (i, delta) => setForm((f) => {
    const agents = [...f.agents];
    [agents[i], agents[i + delta]] = [agents[i + delta], agents[i]];
    return { ...f, agents };
  });
  const remove = (i) => setForm((f) => ({ ...f, agents: f.agents.filter((_, j) => j !== i) }));

  const applyTemplate = (id) => {
    const tpl = CREW_TEMPLATES.find((t) => t.id === id);
    if (tpl) setForm((f) => ({ ...f, ...JSON.parse(JSON.stringify(tpl.crew)) }));
  };

  const catalog = [
    ...builtinTools.map((t) => ({ ref: t.id, label: t.label })),
    ...tools.map((t) => ({ ref: `tool:${t.id}`, label: t.nombre, custom: true })),
  ];
  // Tools no longer available (module off or tool deleted) are dropped on save.
  const unavailable = [...new Set(visibleAgents.flatMap((a) => (a.tools || []).filter((ref) => !catalog.some((c) => c.ref === ref))))];

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const st = form.settings;
    await onSave({
      ...form,
      agents: visibleAgents.map((a) => ({ ...a, tools: (a.tools || []).filter((ref) => !unavailable.includes(ref)) })),
      settings: {
        engine,
        model: (st.model || '').trim(),
        temperature: Number(st.temperature),
        max_iter: Number(st.max_iter),
        timeout_seconds: Number(st.timeout_seconds),
        log_level: st.log_level || 'full',
      },
    });
    setSaving(false);
  };

  return (
    <ModalShell title={form.id ? 'Editar equipo de agentes' : 'Nuevo equipo de agentes'} wide onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-body">
          {unavailable.length > 0 && (
            <p className="help-text crew-warning">
              <FiAlertCircle /> Al guardar se quitarán herramientas que ya no están disponibles (módulo apagado o herramienta borrada): {unavailable.map((ref) => MODULE_TOOLS[ref] || 'herramienta borrada').join(', ')}.
            </p>
          )}
          {!form.id && (
            <label>Empezar desde
              <select defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">En blanco</option>
                {CREW_TEMPLATES.filter((t) => !t.module || hasModule(t.module)).map((t) => <option key={t.id} value={t.id}>Plantilla: {t.label}</option>)}
              </select>
            </label>
          )}
          <div className="crew-row">
            <label>Nombre *<input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required maxLength={200} /></label>
            <label>Descripción<input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Para qué sirve este equipo" /></label>
          </div>

          <div className="crew-field">
            <span>Motor</span>
            <div className="crew-engines" role="radiogroup" aria-label="Motor">
              {Object.entries(ENGINES).map(([value, e]) => (
                <button type="button" role="radio" aria-checked={engine === value} key={value}
                  className={`crew-engine ${engine === value ? 'active' : ''}`} onClick={() => setSetting({ engine: value })}>
                  <strong>{engine === value && <FiCheck />} {e.label}</strong>
                  <small>{e.desc}</small>
                </button>
              ))}
            </div>
            {single && form.agents.length > 1 && (
              <p className="help-text crew-warning"><FiAlertCircle /> LangChain usa un solo agente: al guardar se conserva solo el Agente 1.</p>
            )}
          </div>

          <div className="crew-agents">
            {visibleAgents.map((a, i) => (
              <fieldset key={i} className="crew-agent">
                <legend>
                  <span>{single ? 'Agente' : `Agente ${i + 1}`}{i === visibleAgents.length - 1 ? ' · responde al cliente' : ''}</span>
                  {!single && <span className="crew-agent-actions">
                    <button type="button" className="btn-icon" disabled={i === 0} onClick={() => move(i, -1)} title="Subir"><FiArrowUp /></button>
                    <button type="button" className="btn-icon" disabled={i === form.agents.length - 1} onClick={() => move(i, 1)} title="Bajar"><FiArrowDown /></button>
                    <button type="button" className="btn-icon" disabled={form.agents.length === 1} onClick={() => remove(i)} title="Quitar"><FiTrash2 /></button>
                  </span>}
                </legend>
                <div className="crew-row">
                  <label>Nombre<input value={a.nombre} onChange={(e) => setAgent(i, { nombre: e.target.value })} placeholder="Ej. Recepción" /></label>
                  <label>Rol *<input value={a.role} onChange={(e) => setAgent(i, { role: e.target.value })} required placeholder="Ej. Asesor de ventas" /></label>
                </div>
                <label>Objetivo *<input value={a.goal} onChange={(e) => setAgent(i, { goal: e.target.value })} required placeholder="Qué debe lograr" /></label>
                <label>Trasfondo y personalidad
                  <textarea rows={2} value={a.backstory} onChange={(e) => setAgent(i, { backstory: e.target.value })} placeholder="Vacío = usa el prompt del Agente IA que atiende la llamada" />
                </label>
                <label>Tarea
                  <textarea rows={2} value={a.task} onChange={(e) => setAgent(i, { task: e.target.value })}
                    placeholder={i === visibleAgents.length - 1 ? 'Vacío = responder a lo que dijo el interlocutor' : 'Vacío = analizar y preparar información para el siguiente agente'} />
                </label>
                <div className="crew-field">
                  <span>Herramientas</span>
                  <div className="crew-tool-picker">
                    {catalog.map((t) => {
                      const on = (a.tools || []).includes(t.ref);
                      return (
                        <button type="button" key={t.ref} className={`kb-chip ${on ? 'active' : ''}`} onClick={() => toggleTool(i, t.ref)}>
                          {on && <FiCheck />} {t.custom && <FiZap />} {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <details className="crew-advanced">
                  <summary>Resultado esperado</summary>
                  <input value={a.expected_output} onChange={(e) => setAgent(i, { expected_output: e.target.value })}
                    placeholder={i === visibleAgents.length - 1 ? 'Respuesta corta en español hablado' : 'Notas breves para el siguiente agente'} />
                </details>
              </fieldset>
            ))}
          </div>
          {!single && form.agents.length < 4 && (
            <button type="button" className="btn btn-outline btn-sm crew-add-agent" onClick={() => setForm((f) => ({ ...f, agents: [...f.agents, emptyAgent()] }))}>
              <FiPlus /> Agregar agente
            </button>
          )}

          <fieldset className="crew-settings">
            <legend>Ejecución y registro</legend>
            <div className="crew-row">
              <label>Modelo
                <input value={form.settings.model} onChange={(e) => setSetting({ model: e.target.value })} placeholder="Vacío = el de Integraciones (ej. gpt-4o)" />
              </label>
              <label>Creatividad (0 a 1)
                <input type="number" min="0" max="1" step="0.1" value={form.settings.temperature} onChange={(e) => setSetting({ temperature: e.target.value })} />
              </label>
            </div>
            <div className="crew-row">
              <label>Pasos máximos {single ? 'del agente' : 'por agente'}
                <input type="number" min="1" max="10" value={form.settings.max_iter} onChange={(e) => setSetting({ max_iter: e.target.value })} />
              </label>
              <label>Tiempo máximo (segundos)
                <input type="number" min="5" max="120" value={form.settings.timeout_seconds} onChange={(e) => setSetting({ timeout_seconds: e.target.value })} />
              </label>
            </div>
            <label>Registro de ejecuciones
              <select value={form.settings.log_level} onChange={(e) => setSetting({ log_level: e.target.value })}>
                {LOG_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}: {l.desc}</option>)}
              </select>
            </label>
            <p className="help-text">
              El modelo usa el proveedor y la API key de Configuración → Integraciones. Si se pasa del tiempo máximo, en la llamada el agente se disculpa y sigue el flujo.
              El registro se ve en la pestaña Monitoreo.
            </p>
          </fieldset>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : (form.id ? 'Guardar' : 'Crear')}</button>
        </div>
      </form>
    </ModalShell>
  );
}

const pairsFromHeaders = (headers) => Object.entries(headers || {}).map(([key, value]) => ({ key, value: String(value) }));

export const DB_ENGINES = [
  { value: 'postgres', label: 'PostgreSQL', port: 5432 },
  { value: 'mysql', label: 'MySQL / MariaDB', port: 3306 },
  { value: 'sqlserver', label: 'SQL Server', port: 1433 },
];

const SSL_MODES = [
  { value: 'require', label: 'Cifrada (sin verificar certificado)' },
  { value: 'verify', label: 'Cifrada y verificada' },
  { value: 'disable', label: 'Sin cifrar (solo redes privadas)' },
];

const EMPTY_DB = { engine: 'postgres', host: '', port: 5432, database: '', user: '', ssl_mode: 'require', query: '', max_rows: 20, allow_write: false, password_set: false };

// toolSummary describes where a tool goes, for the tools table.
export function toolSummary(t) {
  if (t.tipo === 'sql') {
    const engine = DB_ENGINES.find((e) => e.value === t.database?.engine)?.label || 'Base de datos';
    return `${engine} · ${t.database?.host || '?'}/${t.database?.database || '?'}${t.database?.allow_write ? ' · escritura' : ''}`;
  }
  return `${t.method} ${t.url}`;
}

// placeholdersIn lists the :name placeholders of a query (outside quotes,
// skipping ::casts), to suggest the parameters.
function placeholdersIn(query) {
  const clean = (query || '').replace(/'(?:[^']|'')*'|"(?:[^"]|"")*"|`[^`]*`/g, ' ').replace(/::/g, '  ');
  const out = [];
  for (const m of clean.matchAll(/(^|[^a-zA-Z0-9_]):([a-zA-Z_][a-zA-Z0-9_]*)/g)) {
    const name = m[2].toLowerCase();
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

function ToolModal({ data, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    id: data?.id,
    tipo: data?.tipo || 'http',
    nombre: data?.nombre || '',
    descripcion: data?.descripcion || '',
    method: data?.method || 'POST',
    url: data?.url || '',
    body: data?.body || '',
    timeout_seconds: data?.timeout_seconds || 8,
    parameters: data?.parameters || [],
    headers: pairsFromHeaders(data?.headers),
    database: { ...EMPTY_DB, ...(data?.database || {}) },
    password: '',
    // null = automático: se pide si la herramienta modifica datos.
    requires_confirmation: typeof data?.requires_confirmation === 'boolean' && data?.id ? data.requires_confirmation : null,
  }));
  const [saving, setSaving] = useState(false);
  const isSQL = form.tipo === 'sql';
  const sendsBody = !['GET', 'DELETE'].includes(form.method);
  const db = form.database;
  const changesData = isSQL ? !!db.allow_write : form.method !== 'GET';
  const confirmFirst = form.requires_confirmation ?? changesData;

  const setParam = (i, patch) => setForm((f) => ({ ...f, parameters: f.parameters.map((p, j) => (j === i ? { ...p, ...patch } : p)) }));
  const setHeader = (i, patch) => setForm((f) => ({ ...f, headers: f.headers.map((h, j) => (j === i ? { ...h, ...patch } : h)) }));
  const setDB = (patch) => setForm((f) => ({ ...f, database: { ...f.database, ...patch } }));

  const missingParams = isSQL ? placeholdersIn(db.query).filter((n) => !form.parameters.some((p) => p.name === n)) : [];
  const addMissing = () => setForm((f) => ({
    ...f,
    parameters: [...f.parameters, ...missingParams.map((name) => ({ name, type: 'string', description: '', required: true }))],
  }));

  // payload is what the backend stores (and what "Probar" runs).
  const payload = () => {
    const headers = {};
    form.headers.forEach(({ key, value }) => { if (key.trim()) headers[key.trim()] = value; });
    const base = {
      id: form.id,
      tipo: form.tipo,
      nombre: form.nombre,
      descripcion: form.descripcion,
      timeout_seconds: Number(form.timeout_seconds) || 8,
      parameters: form.parameters.filter((p) => p.name.trim()),
      requires_confirmation: confirmFirst,
    };
    if (isSQL) {
      return {
        ...base,
        database: { ...db, port: Number(db.port) || 0, max_rows: Number(db.max_rows) || 20, ...(form.password ? { password: form.password } : {}) },
      };
    }
    return { ...base, method: form.method, url: form.url, headers, body: sendsBody ? form.body : '' };
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(payload());
    setSaving(false);
  };

  return (
    <ModalShell title={form.id ? 'Editar herramienta' : 'Nueva herramienta'} wide onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="tool-type-switch" role="radiogroup" aria-label="Tipo de herramienta">
            {[
              { value: 'http', icon: <FiGlobe />, label: 'API HTTP', desc: 'Llama a un servicio web de tu sistema' },
              { value: 'sql', icon: <FiDatabase />, label: 'Base de datos', desc: 'Ejecuta una consulta SQL con parámetros' },
            ].map((o) => (
              <button key={o.value} type="button" role="radio" aria-checked={form.tipo === o.value}
                className={`tool-type-option${form.tipo === o.value ? ' active' : ''}`}
                disabled={!!form.id && form.tipo !== o.value}
                onClick={() => setForm({ ...form, tipo: o.value })}>
                {o.icon}<span><strong>{o.label}</strong><small>{o.desc}</small></span>
              </button>
            ))}
          </div>
          <div className="crew-row">
            <label>Nombre *
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} required placeholder={isSQL ? 'estado_pedido' : 'consultar_saldo'} />
            </label>
            <label>Tiempo máximo (segundos)
              <input type="number" min="1" max="15" value={form.timeout_seconds} onChange={(e) => setForm({ ...form, timeout_seconds: e.target.value })} />
            </label>
          </div>
          <label>Descripción para el agente *
            <textarea rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required
              placeholder={isSQL ? 'Busca el último pedido de un cliente por su teléfono y devuelve su estado y tiempo estimado.' : 'Consulta el saldo pendiente de un cliente a partir de su número de DPI.'} />
          </label>
          <label className="checkbox-item">
            <input type="checkbox" checked={confirmFirst}
              onChange={(e) => setForm({ ...form, requires_confirmation: e.target.checked })} />
            Pedir confirmación al cliente antes de ejecutarla
            <span className="muted">
              {' '}— la IA le repite los datos y solo la ejecuta si dice que sí.
              {form.requires_confirmation === null && (changesData ? ' Activada porque modifica datos.' : ' Desactivada porque solo consulta.')}
            </span>
          </label>

          {isSQL ? (
            <>
              <div className="crew-field">
                <span>Conexión</span>
                <div className="db-grid">
                  <label>Motor
                    <select value={db.engine} onChange={(e) => {
                      const next = DB_ENGINES.find((x) => x.value === e.target.value);
                      const prev = DB_ENGINES.find((x) => x.value === db.engine);
                      setDB({ engine: e.target.value, port: !db.port || Number(db.port) === prev?.port ? next.port : db.port });
                    }}>
                      {DB_ENGINES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                    </select>
                  </label>
                  <label className="db-host">Servidor *
                    <input value={db.host} onChange={(e) => setDB({ host: e.target.value.trim() })} required placeholder="db.miempresa.com" />
                  </label>
                  <label>Puerto
                    <input type="number" min="1" max="65535" value={db.port} onChange={(e) => setDB({ port: e.target.value })} />
                  </label>
                  <label>Base de datos *
                    <input value={db.database} onChange={(e) => setDB({ database: e.target.value })} required placeholder="ventas" />
                  </label>
                  <label>Usuario *
                    <input value={db.user} onChange={(e) => setDB({ user: e.target.value })} required placeholder="hablagt_lector" autoComplete="off" />
                  </label>
                  <label>Contraseña
                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password"
                      placeholder={db.password_set ? '•••••••• guardada (escribe para cambiarla)' : 'Contraseña del usuario'} />
                  </label>
                  <label className="db-ssl">Conexión segura
                    <select value={db.ssl_mode} onChange={(e) => setDB({ ssl_mode: e.target.value })}>
                      {SSL_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </label>
                </div>
                <p className="help-text">La contraseña se guarda cifrada y nunca se muestra ni sale del servidor. Usa un usuario con permiso <strong>solo de lectura</strong> sobre las tablas que necesita.</p>
              </div>

              <label>Consulta SQL *
                <textarea className="sql-editor" rows={5} spellCheck={false} value={db.query} onChange={(e) => setDB({ query: e.target.value })} required
                  placeholder={'SELECT estado, tiempo_estimado\nFROM pedidos\nWHERE telefono = :telefono\nORDER BY creado DESC\nLIMIT 1'} />
              </label>
              <p className="help-text">
                Escribe <code>:parametro</code> donde va un dato que dice quien llama; se envía aparte de la consulta (nunca se pega en el SQL), así que no hay riesgo de inyección.
                Una sola consulta, sin comentarios.
              </p>
              {missingParams.length > 0 && (
                <div className="crew-warning-box">
                  <FiAlertCircle /> La consulta usa {missingParams.map((n) => <code key={n}>:{n}</code>)} sin parámetro.
                  <button type="button" className="btn btn-outline btn-sm" onClick={addMissing}><FiPlus /> Agregarlos</button>
                </div>
              )}
              <div className="crew-row">
                <label>Filas máximas
                  <input type="number" min="1" max="100" value={db.max_rows} onChange={(e) => setDB({ max_rows: e.target.value })} />
                </label>
                <label className="crew-check db-write">
                  <input type="checkbox" checked={!!db.allow_write} onChange={(e) => setDB({ allow_write: e.target.checked })} />
                  Permitir modificar datos (INSERT / UPDATE)
                </label>
              </div>
              {db.allow_write ? (
                <p className="help-text crew-warning"><FiAlertCircle /> La consulta podrá cambiar datos de tu base cada vez que el agente la use. Limítala a lo indispensable (por ejemplo, un UPDATE por id).</p>
              ) : (
                <p className="help-text">Solo lectura: se acepta un único <code>SELECT</code> y en PostgreSQL y MySQL corre dentro de una transacción de solo lectura.</p>
              )}
            </>
          ) : (
            <div className="crew-row crew-row-method">
              <label>Método
                <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <label>URL *
                <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required placeholder="https://api.miempresa.com/clientes/{{dpi}}/saldo" />
              </label>
            </div>
          )}

          <div className="crew-field">
            <span>Parámetros que llena el agente</span>
            {form.parameters.map((p, i) => (
              <div key={i} className="crew-param">
                <input value={p.name} onChange={(e) => setParam(i, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} placeholder={isSQL ? 'telefono' : 'dpi'} />
                <select value={p.type || 'string'} onChange={(e) => setParam(i, { type: e.target.value })}>
                  <option value="string">Texto</option>
                  <option value="number">Número</option>
                  <option value="boolean">Sí / No</option>
                </select>
                <input value={p.description} onChange={(e) => setParam(i, { description: e.target.value })} placeholder={isSQL ? 'Teléfono del cliente, 8 dígitos' : 'DPI del cliente, 13 dígitos'} />
                <label className="crew-check"><input type="checkbox" checked={!!p.required} onChange={(e) => setParam(i, { required: e.target.checked })} /> Obligatorio</label>
                <button type="button" className="btn-icon" onClick={() => setForm((f) => ({ ...f, parameters: f.parameters.filter((_, j) => j !== i) }))} title="Quitar"><FiTrash2 /></button>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm((f) => ({ ...f, parameters: [...f.parameters, { name: '', type: 'string', description: '', required: true }] }))}>
              <FiPlus /> Parámetro
            </button>
          </div>

          {!isSQL && (
            <>
              <div className="crew-field">
                <span>Encabezados</span>
                {form.headers.map((h, i) => (
                  <div key={i} className="crew-header-row">
                    <input value={h.key} onChange={(e) => setHeader(i, { key: e.target.value })} placeholder="Authorization" />
                    <input value={h.value} onChange={(e) => setHeader(i, { value: e.target.value })} placeholder="Bearer TU_TOKEN" />
                    <button type="button" className="btn-icon" onClick={() => setForm((f) => ({ ...f, headers: f.headers.filter((_, j) => j !== i) }))} title="Quitar"><FiTrash2 /></button>
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm((f) => ({ ...f, headers: [...f.headers, { key: '', value: '' }] }))}>
                  <FiPlus /> Encabezado
                </button>
              </div>

              {sendsBody && (
                <label>Cuerpo (opcional)
                  <textarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                    placeholder={'{"dpi": "{{dpi}}", "telefono": "{{caller_number}}"}'} />
                </label>
              )}
              <p className="help-text">
                Usa <code>{'{{parametro}}'}</code> y las variables de la llamada (<code>{'{{caller_number}}'}</code>, las capturadas en el flujo) en la URL, encabezados y cuerpo.
                Si no usas ninguna, los parámetros se envían como JSON (o en la URL con GET). Solo se permiten URLs públicas.
              </p>
            </>
          )}

          {isSQL && <SQLTestPanel buildTool={payload} password={form.password} parameters={form.parameters.filter((p) => p.name.trim())} />}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : (form.id ? 'Guardar' : 'Crear')}</button>
        </div>
      </form>
    </ModalShell>
  );
}

// SQLTestPanel runs the query as it is in the form (saved or not) with
// sample values, and shows the rows the agent would get.
function SQLTestPanel({ buildTool, password, parameters }) {
  const [values, setValues] = useState({});
  const [running, setRunning] = useState(false);
  const [out, setOut] = useState(null); // {ok, result|error}

  const run = async () => {
    setRunning(true);
    setOut(null);
    try {
      const { database, ...tool } = buildTool();
      const { password: _omit, ...db } = database;
      const args = {};
      parameters.forEach((p) => {
        const v = values[p.name];
        if (v === undefined || v === '') return;
        args[p.name] = p.type === 'number' ? Number(v) : p.type === 'boolean' ? v === 'true' : v;
      });
      setOut(await aiToolService.testSql({ ...tool, database: db }, args, password));
    } catch (e) {
      setOut({ ok: false, error: errMsg(e, 'No se pudo probar la consulta') });
    } finally {
      setRunning(false);
    }
  };

  const rows = out?.result?.rows || [];
  const columns = out?.result?.columns?.length ? out.result.columns : Object.keys(rows[0] || {});

  return (
    <div className="crew-field sql-test">
      <span>Probar consulta</span>
      {parameters.length > 0 && (
        <div className="sql-test-params">
          {parameters.map((p) => (
            <label key={p.name}>{p.name}
              {p.type === 'boolean' ? (
                <select value={values[p.name] ?? ''} onChange={(e) => setValues({ ...values, [p.name]: e.target.value })}>
                  <option value="">—</option><option value="true">Sí</option><option value="false">No</option>
                </select>
              ) : (
                <input type={p.type === 'number' ? 'number' : 'text'} value={values[p.name] ?? ''} placeholder={p.description || p.name}
                  onChange={(e) => setValues({ ...values, [p.name]: e.target.value })} />
              )}
            </label>
          ))}
        </div>
      )}
      <div>
        <button type="button" className="btn btn-outline btn-sm" onClick={run} disabled={running}><FiPlay /> {running ? 'Ejecutando...' : 'Ejecutar prueba'}</button>
      </div>
      {out && !out.ok && <div className="sql-test-error"><FiAlertCircle /> {out.error}</div>}
      {out?.ok && (
        <div className="sql-test-result">
          <p className="muted">
            {out.result.rows_affected != null
              ? `${out.result.rows_affected} fila(s) modificada(s)`
              : `${out.result.row_count} fila(s)${out.result.truncated ? ' (hay más; se cortó en el máximo)' : ''}`} · {out.result.duration_ms} ms
          </p>
          {rows.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {rows.map((r, i) => <tr key={i}>{columns.map((c) => <td key={c}>{r[c] === null ? <span className="muted">NULL</span> : String(r[c])}</td>)}</tr>)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CrewTestModal({ crew, onClose }) {
  const [message, setMessage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const run = async (e) => {
    e.preventDefault();
    setRunning(true);
    setResult(null);
    setError('');
    const started = Date.now();
    try {
      const res = await crewService.test(crew.id, { message, instructions });
      setResult(res);
    } catch (err) {
      setError(errMsg(err, 'El equipo no respondió'));
    } finally {
      setElapsed((Date.now() - started) / 1000);
      setRunning(false);
    }
  };

  const touchesData = (crew.agents || []).some((a) => (a.tools || []).some((t) => ['create_event', 'cancel_event', 'find_or_create_contact'].includes(t) || t.startsWith('tool:')));

  return (
    <ModalShell title={`Probar: ${crew.nombre}`} onClose={onClose}>
      <form onSubmit={run}>
        <div className="modal-body">
          <label>Lo que dice quien llama *
            <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="Quiero agendar una cita para mañana a las 10, soy Ana López" />
          </label>
          <label>Instrucciones del nodo (opcional)
            <input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Como en el nodo Agente CrewAI del flujo" />
          </label>
          {touchesData && (
            <p className="help-text crew-warning"><FiAlertCircle /> Las herramientas se ejecutan de verdad: si el equipo agenda o llama a tu sistema, el cambio queda hecho.</p>
          )}
          {running && <div className="crew-test-running"><span className="crew-spinner" /> Los agentes están trabajando… puede tardar varios segundos.</div>}
          {error && <div className="crew-test-error">{error}</div>}
          {result && (
            <div className="crew-test-result">
              <div className="crew-test-meta">
                <span className={`badge ${RUN_STATUS[result.run?.status || 'ok'].badge}`}>{RUN_STATUS[result.run?.status || 'ok'].label}</span>
                <span>{((result.run?.duration_ms ?? elapsed * 1000) / 1000).toFixed(1)} s</span>
                <span>{ENGINES[result.run?.engine]?.label || ''}{result.run?.model ? ` · ${result.run.model}` : ''}</span>
                {(result.run?.prompt_tokens > 0 || result.run?.completion_tokens > 0) && (
                  <span>{result.run.prompt_tokens + result.run.completion_tokens} tokens</span>
                )}
              </div>
              {result.run?.error && <div className="crew-test-error">{result.run.error}</div>}
              <span className="crew-test-label">Respuesta</span>
              <p>{result.reply_text || '(sin respuesta)'}</p>
              {(result.run?.steps || []).length > 0 && (
                <>
                  <span className="crew-test-label">Pasos</span>
                  <RunSteps steps={result.run.steps} />
                </>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cerrar</button>
          <button type="submit" className="btn btn-primary" disabled={running || !message.trim()}><FiPlay /> {running ? 'Probando...' : 'Probar'}</button>
        </div>
      </form>
    </ModalShell>
  );
}
