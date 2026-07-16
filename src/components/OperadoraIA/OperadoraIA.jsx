import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCpu,
  FiPhone,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiEye,
  FiStopCircle,
  FiSettings,
  FiMessageSquare
} from 'react-icons/fi';
import { realtimeService, tenantService, integrationService } from '../../services';
import { useToast } from '../../context/ToastContext';
import './OperadoraIA.css';

const SESSIONS_POLL_MS = 5000;
const TRANSCRIPT_POLL_MS = 2500;
const SESIONES_POR_PAGINA = 10;

const ESTADO_LABELS = {
  starting: 'Iniciando',
  active: 'Activa',
  stopping: 'Deteniendo',
  stopped: 'Detenida',
  failed: 'Falló',
};

function formatDuracion(segundos) {
  if (!segundos || segundos < 0) return '0:00';
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function calcularDuracionSeg(session, ahoraMs) {
  const inicio = new Date(session.started_at).getTime();
  const fin = session.stopped_at ? new Date(session.stopped_at).getTime() : ahoraMs;
  return Math.max(0, (fin - inicio) / 1000);
}

const OperadoraIA = () => {
  const toast = useToast();
  const [providerInfo, setProviderInfo] = useState(null);
  const [providerLoaded, setProviderLoaded] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [paginaActual, setPaginaActual] = useState(1);
  const [transcriptPanel, setTranscriptPanel] = useState(null);
  const [transcriptItems, setTranscriptItems] = useState([]);

  // Proveedor configurado de verdad en Configuración → Integraciones.
  // Solo lectura: esta pantalla no duplica ese formulario.
  useEffect(() => {
    (async () => {
      try {
        const tenant = await tenantService.get();
        const integ = await integrationService.get(tenant.id);
        setProviderInfo({
          enabled: !!integ?.voice_ai?.enabled,
          provider: integ?.voice_ai?.provider || 'stub',
        });
      } catch {
        setProviderInfo({ enabled: false, provider: null });
      } finally {
        setProviderLoaded(true);
      }
    })();
  }, []);

  const cargarSesiones = useCallback(async () => {
    try {
      const res = await realtimeService.list();
      setSessions(res?.items || []);
    } catch {
      // silencioso: no interrumpir la vista con un toast en cada poll fallido
    }
  }, []);

  useEffect(() => {
    cargarSesiones();
    const interval = setInterval(cargarSesiones, SESSIONS_POLL_MS);
    return () => clearInterval(interval);
  }, [cargarSesiones]);

  // Reloj para recalcular duraciones de sesiones activas en vivo.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [sessions.length]);

  useEffect(() => {
    if (!transcriptPanel) return undefined;
    let activo = true;
    const cargar = async () => {
      try {
        const res = await realtimeService.transcript(transcriptPanel.id);
        if (activo) setTranscriptItems(res?.items || []);
      } catch {
        // no-op
      }
    };
    cargar();
    const interval = setInterval(cargar, TRANSCRIPT_POLL_MS);
    return () => {
      activo = false;
      clearInterval(interval);
    };
  }, [transcriptPanel]);

  const cerrarTranscript = () => {
    setTranscriptPanel(null);
    setTranscriptItems([]);
  };

  const handleDetener = async (session) => {
    try {
      await realtimeService.stop(session.id);
      toast.success('Sesión de IA detenida');
      cargarSesiones();
    } catch (err) {
      toast.error('No se pudo detener la sesión: ' + (err?.response?.data?.error?.message || err.message));
    }
  };

  const sesionesActivas = sessions.filter((s) => s.state === 'active' || s.state === 'starting');
  const totalPaginas = Math.max(1, Math.ceil(sessions.length / SESIONES_POR_PAGINA));
  const sessionsPaginadas = sessions.slice(
    (paginaActual - 1) * SESIONES_POR_PAGINA,
    paginaActual * SESIONES_POR_PAGINA
  );

  return (
    <div className="operadora-ia">
      <div className="operadora-header">
        <div className="operadora-title">
          <FiCpu className="title-icon" />
          <div>
            <h1>Operadora IA</h1>
            <p>Supervisión en vivo de las sesiones de IA en llamadas</p>
          </div>
        </div>
      </div>

      <div className="operadora-status-card">
        <div className="ai-visual">
          <div className="ai-circle">
            <FiCpu className="ai-icon" />
            <div className="ai-ring ring-1"></div>
            <div className="ai-ring ring-2"></div>
          </div>
        </div>

        {providerLoaded && !providerInfo?.enabled ? (
          <div className="operadora-empty-provider">
            <p>La Operadora IA no está configurada todavía para este tenant.</p>
            <Link to="/configuracion" className="link-configurar">
              <FiSettings /> Ir a Configuración → Integraciones
            </Link>
          </div>
        ) : (
          <div className="ai-stats-grid">
            <div className="ai-stat">
              <FiCpu className="ai-stat-icon" />
              <div className="ai-stat-info">
                <span className="ai-stat-value">{providerLoaded ? (providerInfo?.provider || '—') : '…'}</span>
                <span className="ai-stat-label">Proveedor activo</span>
              </div>
            </div>
            <div className="ai-stat">
              <FiPhone className="ai-stat-icon" />
              <div className="ai-stat-info">
                <span className="ai-stat-value">{sesionesActivas.length}</span>
                <span className="ai-stat-label">Sesiones activas</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="tabla-section">
        <div className="tabla-section-header">
          <h2>Sesiones de IA</h2>
          <span className="results-count">
            {sessions.length} sesión{sessions.length !== 1 ? 'es' : ''} desde el último reinicio del servidor
          </span>
        </div>

        <div className="tabla-container">
          <table className="cdr-tabla">
            <thead>
              <tr>
                <th>Llamada</th>
                <th>Proveedor</th>
                <th>Estado</th>
                <th>Iniciada</th>
                <th>Duración</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sessionsPaginadas.map((s) => (
                <tr key={s.id}>
                  <td className="fecha-cell">{s.id.slice(0, 8)}…</td>
                  <td>{s.provider}</td>
                  <td>
                    <span className={`estado-badge ${s.state}`}>{ESTADO_LABELS[s.state] || s.state}</span>
                  </td>
                  <td className="fecha-cell">{new Date(s.started_at).toLocaleTimeString()}</td>
                  <td className="duracion-cell">{formatDuracion(calcularDuracionSeg(s, now))}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-icon-sm view" title="Ver transcript" onClick={() => setTranscriptPanel(s)}>
                        <FiEye />
                      </button>
                      {(s.state === 'active' || s.state === 'starting') && (
                        <button className="btn-icon-sm stop" title="Detener" onClick={() => handleDetener(s)}>
                          <FiStopCircle />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sessions.length === 0 && (
            <div className="empty-state">
              <FiCpu />
              <p>No hay sesiones de IA activas en este momento</p>
            </div>
          )}
        </div>

        {sessions.length > 0 && totalPaginas > 1 && (
          <div className="paginacion">
            <button className="pag-btn" disabled={paginaActual === 1} onClick={() => setPaginaActual((p) => p - 1)}>
              <FiChevronLeft />
            </button>
            <span className="pag-info">Página {paginaActual} de {totalPaginas}</span>
            <button
              className="pag-btn"
              disabled={paginaActual === totalPaginas}
              onClick={() => setPaginaActual((p) => p + 1)}
            >
              <FiChevronRight />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {transcriptPanel && (
          <>
            <motion.div
              className="transcript-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cerrarTranscript}
            />
            <motion.aside
              className="transcript-panel"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="transcript-header">
                <div>
                  <strong>Transcript en vivo</strong>
                  <span className="transcript-callid">{transcriptPanel.id}</span>
                </div>
                <button className="btn-close" onClick={cerrarTranscript}>
                  <FiX />
                </button>
              </div>
              <div className="transcript-content">
                {transcriptItems.length === 0 ? (
                  <div className="transcript-empty">
                    <FiMessageSquare />
                    <p>Todavía no hay líneas en esta conversación</p>
                  </div>
                ) : (
                  transcriptItems.map((t, i) => {
                    const ts = t.at ? new Date(t.at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
                    return (
                      <div key={i} className={`transcript-line ${t.speaker}`}>
                        <span className="transcript-speaker">{t.speaker}</span>
                        <span className="transcript-time">{ts}</span>
                        <p>{t.text}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OperadoraIA;
