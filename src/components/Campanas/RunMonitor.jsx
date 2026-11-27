import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRefreshCw, FiX, FiChevronLeft, FiChevronRight, FiTrash2, FiTool, FiCpu, FiMessageSquare } from 'react-icons/fi';
import { aiRunService, intentService } from '../../services';
import { METHOD_LABELS } from './IntentSection';
import { useToast } from '../../context/ToastContext';

export const RUN_STATUS = {
  ok: { label: 'Correcta', badge: 'success' },
  error: { label: 'Error', badge: 'danger' },
  timeout: { label: 'Tiempo agotado', badge: 'warning' },
};

const SOURCES = { call: 'Llamada', test: 'Prueba' };
const PERIODS = [
  { value: '1h', label: 'Última hora' },
  { value: '24h', label: 'Últimas 24 h' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
];
const TOOL_LABELS = {
  list_events: 'Consultar citas',
  create_event: 'Agendar cita',
  cancel_event: 'Cancelar cita',
  reschedule_event: 'Reprogramar cita',
  find_or_create_contact: 'Buscar o crear contacto',
  search_kb: 'Consultar base de conocimiento',
};
const STEP_ICONS = { tool: FiTool, llm: FiCpu, agent: FiMessageSquare };
const AUTO_REFRESH_MS = 15000;

const seconds = (ms) => (ms > 0 && ms < 1000 ? `${Math.round(ms)} ms` : `${((ms || 0) / 1000).toFixed(1)} s`);
const toolName = (name) => TOOL_LABELS[name] || name;
const when = (iso) => new Date(iso).toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'medium' });
const errMsg = (e, fallback) => e?.response?.data?.error?.message || fallback;

// RunSteps shows what a run did, in order: model calls, tools (with their
// data when the team logs it) and each CrewAI agent's answer.
export function RunSteps({ steps }) {
  return (
    <ol className="run-steps">
      {steps.map((s, i) => {
        const Icon = STEP_ICONS[s.type] || FiTool;
        return (
          <li key={i} className={`run-step ${s.error ? 'failed' : ''}`}>
            <span className="run-step-icon"><Icon /></span>
            <div className="run-step-body">
              <div className="run-step-head">
                <strong>{s.type === 'tool' ? toolName(s.name) : s.name}</strong>
                <span className="muted">{s.type === 'agent' ? 'agente' : s.type === 'llm' ? 'modelo' : 'herramienta'}</span>
                {s.duration_ms > 0 && <span className="run-step-time">{seconds(s.duration_ms)}</span>}
              </div>
              {s.args && Object.keys(s.args).length > 0 && <code className="run-step-data">{JSON.stringify(s.args)}</code>}
              {s.error && <div className="run-step-error">{s.error}</div>}
              {s.result && <div className="run-step-result">{s.result}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function RunMonitor({ crews }) {
  const toast = useToast();
  const [filters, setFilters] = useState({ period: '24h', crew_id: '', status: '', source: '' });
  const [page, setPage] = useState(1);
  const [runs, setRuns] = useState({ items: [], total: 0, page_size: 25 });
  const [stats, setStats] = useState(null);
  const [intentStats, setIntentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [detail, setDetail] = useState(null);
  const [retention, setRetention] = useState(30);

  const load = useCallback(async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    try {
      const [list, st, ist] = await Promise.all([
        aiRunService.list({ ...params, page, page_size: 25 }),
        aiRunService.stats(params),
        intentService.stats({ period: filters.period, source: filters.source || undefined }).catch(() => null),
      ]);
      setRuns(list || { items: [], total: 0, page_size: 25 });
      setStats(st);
      setIntentStats(ist);
    } catch (e) {
      toast.error(errMsg(e, 'Error al cargar el monitoreo'));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  const setFilter = (patch) => { setPage(1); setFilters((f) => ({ ...f, ...patch })); };

  const openDetail = async (run) => {
    try {
      setDetail(await aiRunService.get(run.id));
    } catch (e) {
      toast.error(errMsg(e, 'No se pudo abrir la ejecución'));
    }
  };

  const purge = async () => {
    const days = Number(retention);
    if (!window.confirm(`¿Borrar los registros de más de ${days} días? No se puede deshacer.`)) return;
    try {
      const res = await aiRunService.purge(days);
      toast.success(`${res?.deleted ?? 0} registros borrados`);
      load();
    } catch (e) {
      toast.error(errMsg(e, 'No se pudieron borrar los registros'));
    }
  };

  const pages = Math.max(1, Math.ceil((runs.total || 0) / (runs.page_size || 25)));

  return (
    <div className="sub-section run-monitor">
      <div className="run-filters">
        <select value={filters.period} onChange={(e) => setFilter({ period: e.target.value })} aria-label="Periodo">
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={filters.crew_id} onChange={(e) => setFilter({ crew_id: e.target.value })} aria-label="Equipo">
          <option value="">Todos los equipos</option>
          {crews.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilter({ status: e.target.value })} aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(RUN_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </select>
        <select value={filters.source} onChange={(e) => setFilter({ source: e.target.value })} aria-label="Origen">
          <option value="">Llamadas y pruebas</option>
          {Object.entries(SOURCES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="run-auto">
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> Actualizar cada 15 s
        </label>
        <button className="btn btn-outline btn-sm" onClick={load}><FiRefreshCw /> Actualizar</button>
      </div>

      {stats && (
        <div className="run-kpis">
          <div className="run-kpi"><span>Ejecuciones</span><strong>{stats.runs}</strong></div>
          <div className="run-kpi"><span>Éxito</span><strong className={stats.runs && stats.success_rate < 90 ? 'bad' : ''}>{stats.runs ? `${stats.success_rate}%` : '—'}</strong></div>
          <div className="run-kpi"><span>Errores / tiempo agotado</span><strong>{stats.errors} / {stats.timeouts}</strong></div>
          <div className="run-kpi"><span>Duración promedio</span><strong>{stats.runs ? seconds(stats.avg_duration_ms) : '—'}</strong></div>
          <div className="run-kpi"><span>Duración p95</span><strong>{stats.runs ? seconds(stats.p95_duration_ms) : '—'}</strong></div>
          <div className="run-kpi"><span>Tokens (entrada / salida)</span><strong>{stats.prompt_tokens.toLocaleString()} / {stats.completion_tokens.toLocaleString()}</strong></div>
        </div>
      )}

      {stats && (stats.by_crew.length > 0 || stats.by_tool.length > 0) && (
        <div className="run-breakdowns">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Equipo</th><th>Ejecuciones</th><th>Fallas</th><th>Promedio</th></tr></thead>
              <tbody>
                {stats.by_crew.map((c) => (
                  <tr key={c.crew_id}><td>{c.crew_nombre}</td><td>{c.runs}</td><td>{c.errors}</td><td>{seconds(c.avg_duration_ms)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Herramienta</th><th>Usos</th><th>Fallas</th><th>Promedio</th></tr></thead>
              <tbody>
                {stats.by_tool.length === 0 ? (
                  <tr><td colSpan={4} className="muted">Sin uso de herramientas en el periodo</td></tr>
                ) : stats.by_tool.map((t) => (
                  <tr key={t.name}><td>{toolName(t.name)}</td><td>{t.calls}</td><td>{t.errors}</td><td>{seconds(t.avg_duration_ms)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {intentStats && intentStats.turns > 0 && <IntentStatsPanel st={intentStats} />}

      <span className="crew-test-label">Ejecuciones de equipos</span>
      {loading ? (
        <div className="empty-state"><p>Cargando...</p></div>
      ) : runs.items.length === 0 ? (
        <div className="empty-state"><p>No hay ejecuciones con estos filtros.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Equipo</th><th>Origen</th><th>Estado</th><th>Duración</th><th>Tokens</th><th>Entrada</th></tr></thead>
            <tbody>
              {runs.items.map((r) => (
                <tr key={r.id} className="run-row" onClick={() => openDetail(r)}>
                  <td>{when(r.created_at)}</td>
                  <td>{r.crew_nombre}<div className="muted run-engine">{r.engine}{r.model ? ` · ${r.model}` : ''}</div></td>
                  <td>{SOURCES[r.source] || r.source}</td>
                  <td><span className={`badge ${RUN_STATUS[r.status]?.badge || 'info'}`}>{RUN_STATUS[r.status]?.label || r.status}</span></td>
                  <td>{seconds(r.duration_ms)}</td>
                  <td>{r.prompt_tokens + r.completion_tokens || '—'}</td>
                  <td className="run-input">{r.input || <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="run-footer">
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Anterior"><FiChevronLeft /></button>
          <span>Página {page} de {pages} · {runs.total} ejecuciones</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Siguiente"><FiChevronRight /></button>
        </div>
        <div className="run-retention">
          <span>Borrar registros de más de</span>
          <input type="number" min="1" max="3650" value={retention} onChange={(e) => setRetention(e.target.value)} aria-label="Días" />
          <span>días</span>
          <button className="btn btn-outline btn-sm" onClick={purge} disabled={!(Number(retention) >= 1)}><FiTrash2 /> Borrar</button>
        </div>
      </div>

      <AnimatePresence>
        {detail && <RunDetail run={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>
    </div>
  );
}

function RunDetail({ run, onClose }) {
  const status = RUN_STATUS[run.status] || { label: run.status, badge: 'info' };
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal crew-modal crew-modal-wide" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{run.crew_nombre} · {when(run.created_at)}</h2>
          <button className="modal-close" onClick={onClose}><FiX /></button>
        </div>
        <div className="modal-body">
          <div className="crew-test-meta">
            <span className={`badge ${status.badge}`}>{status.label}</span>
            <span>{SOURCES[run.source] || run.source}</span>
            <span>{run.engine}{run.model ? ` · ${run.model}` : ''}</span>
            <span>{seconds(run.duration_ms)}</span>
            <span>{run.prompt_tokens} + {run.completion_tokens} tokens</span>
            {run.call_id && <span>Llamada <code>{run.call_id}</code></span>}
          </div>
          {run.error && <div className="crew-test-error">{run.error}</div>}
          {run.input && <div><span className="crew-test-label">Quien llama dijo</span><p className="run-text">{run.input}</p></div>}
          {run.instructions && <div><span className="crew-test-label">Instrucciones del nodo</span><p className="run-text">{run.instructions}</p></div>}
          <div><span className="crew-test-label">Respuesta</span><p className="run-text">{run.output || '(sin respuesta)'}</p></div>
          {(run.steps || []).length > 0 && (
            <div><span className="crew-test-label">Pasos</span><RunSteps steps={run.steps} /></div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// IntentStatsPanel: what callers want and what the agent did not understand.
function IntentStatsPanel({ st }) {
  const pct = (n) => (st.turns ? Math.round((n / st.turns) * 100) : 0);
  return (
    <div className="intent-stats">
      <span className="crew-test-label">Intenciones de quienes llaman</span>
      <div className="run-kpis">
        <div className="run-kpi"><span>Turnos clasificados</span><strong>{st.turns}</strong></div>
        <div className="run-kpi"><span>Reconocidos</span><strong className={pct(st.recognized) < 85 ? 'bad' : ''}>{pct(st.recognized)}%</strong></div>
        <div className="run-kpi"><span>Acciones ejecutadas</span><strong>{st.actions_run}</strong></div>
        {Object.entries(st.by_method).map(([m, n]) => (
          <div className="run-kpi" key={m}><span>{METHOD_LABELS[m] || m}</span><strong>{pct(n)}%</strong></div>
        ))}
      </div>
      <div className="run-breakdowns">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Intención</th><th>Turnos</th><th>%</th></tr></thead>
            <tbody>
              {st.by_intent.map((i) => <tr key={i.intent}><td><code>{i.intent}</code></td><td>{i.count}</td><td>{pct(i.count)}%</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>No reconocidas (más recientes)</th></tr></thead>
            <tbody>
              {st.unrecognized.length === 0 ? (
                <tr><td className="muted">Todas las frases se reconocieron</td></tr>
              ) : st.unrecognized.map((e) => <tr key={e.id}><td className="run-input" title={e.text}>{e.text}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
