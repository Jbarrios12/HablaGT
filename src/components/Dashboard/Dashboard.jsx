import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FiPhone,
  FiPhoneIncoming,
  FiPhoneOutgoing,
  FiPhoneMissed,
  FiClock,
  FiUsers,
  FiTrendingUp,
  FiActivity,
  FiCpu,
  FiCheckCircle
} from 'react-icons/fi';
import { dashboardService } from '../../services';
import { useLoading } from '../../context/LoadingContext';
import { useToast } from '../../context/ToastContext';
import { useRealtimeEvents } from '../../hooks/useRealtimeEvents';
import './Dashboard.css';

const formatDuration = (seg) => {
  if (!seg || seg < 0) return '-';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatTimeAgo = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Hace un momento';
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h} h`;
  return new Date(iso).toLocaleDateString();
};

const statusLabel = (s) => {
  switch (s) {
    case 'disponible': return 'Disponible';
    case 'en_llamada': return 'En llamada';
    case 'pausa': return 'Descanso';
    case 'no_disponible': return 'No disponible';
    default: return s;
  }
};

const Dashboard = () => {
  const { showLoading, hideLoading } = useLoading();
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [aiStats, setAiStats] = useState(null);
  const refreshTimer = useRef(null);

  // refresh re-fetches the dashboard data. withSpinner shows the full
  // loading overlay (initial load); live refreshes update silently.
  // refresh is intentionally stable (empty deps): showLoading/hideLoading from
  // LoadingContext are re-created every render, so depending on them would make
  // refresh change identity each render and turn the mount effect below into an
  // infinite fetch loop. They are idempotent setState wrappers, so capturing the
  // first render's copies is safe.
  const refresh = useCallback(async ({ withSpinner = false } = {}) => {
    if (withSpinner) showLoading('Cargando dashboard...');
    try {
      const [s, a] = await Promise.all([
        dashboardService.summary(),
        dashboardService.aiStats(),
      ]);
      setSummary(s);
      setAiStats(a);
    } catch (err) {
      console.error('dashboard load error', err);
    } finally {
      if (withSpinner) hideLoading();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh({ withSpinner: true });
  }, [refresh]);

  // Live push: when a call event arrives, debounce a silent refresh so a
  // burst of ARI events triggers a single reload. New inbound calls also
  // raise a toast.
  useRealtimeEvents(useCallback((evt) => {
    if (!evt || evt.type !== 'call.update') return;
    const p = evt.payload || {};
    if (p.ari_type === 'StasisStart') {
      const from = p.from || 'desconocido';
      toast.info(`Llamada entrante de ${from}`);
    }
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => refresh(), 1200);
  }, [refresh, toast]));

  useEffect(() => () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  }, []);

  const totalHoy = summary?.total_hoy || 0;
  const entrantes = summary?.entrantes_hoy || 0;
  const salientes = summary?.salientes_hoy || 0;
  const perdidas = summary?.perdidas_hoy || 0;
  const completadas = summary?.completadas_hoy || 0;
  const avgDur = summary?.duracion_promedio_seg || 0;
  const ocupacion = summary?.ocupacion_pct || 0;
  const distribucion = summary?.distribucion_horaria || [];
  const recientes = summary?.llamadas_recientes || [];
  const agentes = summary?.agentes || [];
  const topAgentes = summary?.top_agentes || [];

  const statsCards = [
    { title: 'Llamadas Hoy', value: totalHoy, change: '', changeType: 'positive', icon: FiPhone, color: 'blue' },
    { title: 'Entrantes', value: entrantes, change: '', changeType: 'positive', icon: FiPhoneIncoming, color: 'green' },
    { title: 'Salientes', value: salientes, change: '', changeType: 'positive', icon: FiPhoneOutgoing, color: 'purple' },
    { title: 'Perdidas', value: perdidas, change: '', changeType: 'negative', icon: FiPhoneMissed, color: 'red' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const peakHour = (() => {
    if (!distribucion.length) return null;
    let max = 0;
    let idx = 0;
    distribucion.forEach((v, i) => { if (v > max) { max = v; idx = i; } });
    return { hour: idx, count: max };
  })();
  const avgPerHour = distribucion.length
    ? Math.round(distribucion.reduce((a, b) => a + b, 0) / 24)
    : 0;

  return (
    <motion.div
      className="dashboard"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="stats-grid">
        {statsCards.map((stat, index) => (
          <motion.div key={index} className={`stat-card ${stat.color}`} variants={itemVariants}>
            <div className="stat-icon">
              <stat.icon />
            </div>
            <div className="stat-content">
              <span className="stat-title">{stat.title}</span>
              <div className="stat-value-row">
                <span className="stat-value">{stat.value}</span>
                {stat.change && (
                  <span className={`stat-change ${stat.changeType}`}>{stat.change}</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="dashboard-grid">
        <motion.div className="dashboard-card calls-card" variants={itemVariants}>
          <div className="card-header">
            <h2>Llamadas Recientes</h2>
            <a href="/reportes" className="view-all">Ver todas</a>
          </div>
          <div className="calls-list">
            {recientes.length === 0 && (
              <div className="empty-state">Sin llamadas recientes</div>
            )}
            {recientes.map((call) => (
              <div key={call.id} className="call-item">
                <div className={`call-type-icon ${call.tipo}`}>
                  {call.tipo === 'inbound' && <FiPhoneIncoming />}
                  {(call.tipo === 'outbound' || call.tipo === 'internal') && <FiPhoneOutgoing />}
                  {call.tipo === 'missed' && <FiPhoneMissed />}
                </div>
                <div className="call-info">
                  <span className="call-name">{call.contacto_nombre || call.agente_nombre || call.origen || call.destino}</span>
                  <span className="call-number">{call.destino || call.origen}</span>
                </div>
                <div className="call-meta">
                  <span className="call-duration">
                    <FiClock /> {formatDuration(call.duracion_seg)}
                  </span>
                  <span className="call-time">{formatTimeAgo(call.occurred_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className="dashboard-card ai-card" variants={itemVariants}>
          <div className="card-header">
            <h2>Operadora IA</h2>
            <span className={`ai-status ${aiStats?.active_sessions > 0 ? 'active' : ''}`}>
              <span className="status-dot"></span>
              {aiStats?.active_sessions > 0 ? 'Activa' : 'En espera'}
            </span>
          </div>
          <div className="ai-content">
            <div className="ai-visual">
              <div className="ai-circle">
                <FiCpu className="ai-icon" />
                <div className="ai-ring ring-1"></div>
                <div className="ai-ring ring-2"></div>
              </div>
            </div>
            <div className="ai-stats-grid">
              <div className="ai-stat">
                <FiPhone className="ai-stat-icon" />
                <div className="ai-stat-info">
                  <span className="ai-stat-value">{aiStats?.handled_today || 0}</span>
                  <span className="ai-stat-label">Llamadas hoy</span>
                </div>
              </div>
              <div className="ai-stat">
                <FiClock className="ai-stat-icon" />
                <div className="ai-stat-info">
                  <span className="ai-stat-value">{formatDuration(aiStats?.avg_duration_today_seg || 0)}</span>
                  <span className="ai-stat-label">Duración promedio</span>
                </div>
              </div>
              <div className="ai-stat">
                <FiCheckCircle className="ai-stat-icon" />
                <div className="ai-stat-info">
                  <span className="ai-stat-value">
                    {aiStats?.satisfaction_pct ? `${aiStats.satisfaction_pct}%` : '—'}
                  </span>
                  <span className="ai-stat-label">Satisfacción</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div className="dashboard-card activity-card" variants={itemVariants}>
          <div className="card-header">
            <h2>Actividad del Día</h2>
          </div>
          <div className="activity-chart">
            <div className="chart-bars">
              {distribucion.length === 0 && (
                <div className="empty-state">Sin datos</div>
              )}
              {distribucion.map((count, i) => {
                const max = Math.max(...distribucion, 1);
                const heightPct = Math.round((count / max) * 100);
                return (
                  <div key={i} className="chart-bar-wrapper">
                    <motion.div
                      className="chart-bar"
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ delay: i * 0.02, duration: 0.4 }}
                      title={`${count} llamadas a las ${i}:00`}
                    />
                    <span className="chart-label">{i % 3 === 0 ? `${i}h` : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="activity-summary">
            <div className="summary-item">
              <FiTrendingUp className="summary-icon positive" />
              <span>
                Hora pico: {peakHour ? `${peakHour.hour}:00 – ${peakHour.hour + 1}:00 (${peakHour.count})` : '—'}
              </span>
            </div>
            <div className="summary-item">
              <FiActivity className="summary-icon" />
              <span>Promedio: {avgPerHour} llamadas/hora</span>
            </div>
          </div>
        </motion.div>

        <motion.div className="dashboard-card agents-card" variants={itemVariants}>
          <div className="card-header">
            <h2>Agentes</h2>
            <span className="agents-count">
              {agentes.filter((a) => a.estado === 'disponible').length} / {agentes.length}
            </span>
          </div>
          <div className="agents-list">
            {agentes.length === 0 && (
              <div className="empty-state">Sin agentes en el tenant</div>
            )}
            {agentes.map((agent) => (
              <div key={agent.user_id} className="agent-item">
                <div className="agent-avatar">
                  {(agent.nombre || agent.username || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="agent-info">
                  <span className="agent-name">{agent.nombre || agent.username}</span>
                  <span className="agent-calls">@{agent.username}</span>
                </div>
                <span className={`agent-status ${agent.estado}`}>
                  {statusLabel(agent.estado)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
