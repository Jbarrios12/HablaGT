import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPhone,
  FiPhoneIncoming,
  FiPhoneOutgoing,
  FiPhoneMissed,
  FiClock,
  FiDownload,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiTrendingUp,
  FiBarChart2,
  FiPlay,
  FiPause,
  FiVolume2,
  FiX,
  FiList,
  FiPieChart
} from 'react-icons/fi';
import { cdrService } from '../../services';
import { checkRecording, recordingSrc } from '../../lib/recordings';
import { useLoading } from '../../context/LoadingContext';
import { useToast } from '../../context/ToastContext';
import { useRealtimeEvents } from '../../hooks/useRealtimeEvents';
import './Reporteria.css';

const fmtSeg = (s) => `${Math.floor((s || 0) / 60)}:${String(Math.floor((s || 0) % 60)).padStart(2, '0')}`;

const Reporteria = () => {
  const { showLoading, hideLoading } = useLoading();
  const toast = useToast();
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [vistaActiva, setVistaActiva] = useState('tabla');

  const [cdrItems, setCdrItems] = useState([]);
  const [cdrTotal, setCdrTotal] = useState(0);
  const [stats, setStats] = useState({ totalLlamadas: 0, entrantes: 0, salientes: 0, perdidas: 0, duracionPromedio: 0, tasaConexion: 0 });
  const [hourly, setHourly] = useState([]);
  const [topAgentes, setTopAgentes] = useState([]);

  const [audioActivo, setAudioActivo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioTimes, setAudioTimes] = useState({ cur: 0, dur: 0 });
  const audioRef = useRef(null);

  const realtimeTimer = useRef(null);

  const fetchCDR = async ({ silent = false } = {}) => {
    if (!silent) showLoading('Cargando reporte...');
    try {
      const params = {
        page: paginaActual,
        page_size: 25,
      };
      if (filtroTipo !== 'all') params.direccion = filtroTipo;
      if (filtroFechaInicio) params.fecha_inicio = filtroFechaInicio;
      if (filtroFechaFin) params.fecha_fin = filtroFechaFin;
      if (busqueda) params.q = busqueda;
      const [list, st] = await Promise.all([
        cdrService.list(params),
        cdrService.stats({
          fecha_inicio: filtroFechaInicio || undefined,
          fecha_fin: filtroFechaFin || undefined,
        }),
      ]);
      const items = Array.isArray(list?.items) ? list.items : Array.isArray(list) ? list : [];
      setCdrItems(items);
      setCdrTotal(list?.total ?? items.length);
      setStats({
        totalLlamadas: st?.total || 0,
        entrantes: st?.entrantes || 0,
        salientes: st?.salientes || 0,
        perdidas: st?.perdidas || 0,
        duracionPromedio: st?.duracion_promedio_seg || 0,
        tasaConexion: st?.tasa_conexion_pct || 0,
      });
      setHourly(st?.distribucion_horaria || []);
      setTopAgentes(st?.top_agentes || []);
    } catch (err) {
      console.error('cdr load error', err);
    } finally {
      if (!silent) hideLoading();
    }
  };

  useEffect(() => {
    fetchCDR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginaActual, filtroTipo, filtroFechaInicio, filtroFechaFin]);

  // Live push: silently refresh the report when a call event arrives,
  // debounced so a burst of ARI events triggers a single reload.
  useRealtimeEvents((evt) => {
    if (!evt || evt.type !== 'call.update') return;
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
    realtimeTimer.current = setTimeout(() => fetchCDR({ silent: true }), 1500);
  });

  useEffect(() => () => {
    if (realtimeTimer.current) clearTimeout(realtimeTimer.current);
  }, []);

  const maxLlamadas = Math.max(...hourly.map((d) => d.count), 1);

  const filteredData = (Array.isArray(cdrItems) ? cdrItems : []).filter((item) => {
    if (busqueda) {
      const search = busqueda.toLowerCase();
      return (
        (item.origen || '').toLowerCase().includes(search) ||
        (item.destino || '').toLowerCase().includes(search) ||
        (item.agente_nombre || '').toLowerCase().includes(search)
      );
    }
    return true;
  });

  const handlePlayRecording = async (item) => {
    if (!item.grabacion_url) {
      toast.warning('No hay URL de grabación para esta llamada');
      return;
    }
    if (audioActivo?.id === item.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      try {
        await checkRecording(item.grabacion_url);
      } catch (err) {
        toast.error(err.message);
        return;
      }
      // El reproductor se monta al cambiar audioActivo; el efecto de abajo
      // le asigna la URL y lo inicia cuando ya existe.
      setAudioTimes({ cur: 0, dur: 0 });
      setIsPlaying(false);
      setAudioProgress(0);
      setAudioActivo(item);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audioActivo || !audio) return;
    audio.src = recordingSrc(audioActivo.grabacion_url);
    audio.play().catch(() => {
      setIsPlaying(false);
      toast.error('No se pudo reproducir la grabación.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioActivo?.id]);

  const closeAudioPlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setAudioActivo(null);
    setIsPlaying(false);
    setAudioProgress(0);
  };

  const handleExport = () => {
    if (filteredData.length === 0) return;
    const rows = filteredData.map((c) => ({
      id: c.id,
      fecha: c.occurred_at,
      origen: c.origen,
      destino: c.destino,
      tipo: c.tipo,
      duracion_seg: c.duracion_seg,
      estado: c.estado,
      agente: c.agente_nombre,
      contacto: c.contacto_nombre,
      grabacion: c.grabacion ? 'si' : 'no',
      grabacion_url: c.grabacion_url || '',
    }));
    const csv = cdrService.toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cdr-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="reporteria">
      {/* Header */}
      <div className="reporteria-header">
        <div className="reporteria-title">
          <FiBarChart2 className="title-icon" />
          <div>
            <h1>Reportería</h1>
            <p>Análisis detallado de llamadas y rendimiento</p>
          </div>
        </div>
        <div className="reporteria-actions">
          <button className="btn-export" onClick={handleExport}>
            <FiDownload />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card blue">
          <div className="stat-icon"><FiPhone /></div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalLlamadas.toLocaleString()}</span>
            <span className="stat-label">Total Llamadas</span>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon"><FiPhoneIncoming /></div>
          <div className="stat-content">
            <span className="stat-value">{stats.entrantes}</span>
            <span className="stat-label">Entrantes</span>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon"><FiPhoneOutgoing /></div>
          <div className="stat-content">
            <span className="stat-value">{stats.salientes}</span>
            <span className="stat-label">Salientes</span>
          </div>
        </div>

        <div className="stat-card red">
          <div className="stat-icon"><FiPhoneMissed /></div>
          <div className="stat-content">
            <span className="stat-value">{stats.perdidas}</span>
            <span className="stat-label">Perdidas</span>
          </div>
        </div>

        <div className="stat-card cyan">
          <div className="stat-icon"><FiClock /></div>
          <div className="stat-content">
            <span className="stat-value">{stats.duracionPromedio}</span>
            <span className="stat-label">Duración Prom.</span>
          </div>
        </div>

        <div className="stat-card orange">
          <div className="stat-icon"><FiTrendingUp /></div>
          <div className="stat-content">
            <span className="stat-value">{stats.tasaConexion}%</span>
            <span className="stat-label">Tasa Conexión</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-section">
        <div className="filtros-row">
          <div className="filtro-group">
            <label>Tipo de llamada</label>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="all">Todas</option>
              <option value="incoming">Entrantes</option>
              <option value="outgoing">Salientes</option>
              <option value="missed">Perdidas</option>
            </select>
          </div>

          <div className="filtro-group">
            <label>Fecha inicio</label>
            <input type="date" value={filtroFechaInicio} onChange={(e) => setFiltroFechaInicio(e.target.value)} />
          </div>

          <div className="filtro-group">
            <label>Fecha fin</label>
            <input type="date" value={filtroFechaFin} onChange={(e) => setFiltroFechaFin(e.target.value)} />
          </div>

          <div className="filtro-group search">
            <label>Buscar</label>
            <div className="search-input">
              <FiSearch />
              <input
                type="text"
                placeholder="Número, agente..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          <div className="filtro-group">
            <label>Vista</label>
            <div className="vista-toggle">
              <button
                className={vistaActiva === 'tabla' ? 'active' : ''}
                onClick={() => setVistaActiva('tabla')}
                title="Vista de tabla"
              >
                <FiList />
              </button>
              <button
                className={vistaActiva === 'graficos' ? 'active' : ''}
                onClick={() => setVistaActiva('graficos')}
                title="Vista de gráficos"
              >
                <FiPieChart />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido con AnimatePresence */}
      <AnimatePresence mode="wait">
        {vistaActiva === 'tabla' ? (
          <motion.div
            key="tabla"
            className="tabla-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="tabla-container">
              <table className="cdr-tabla">
                <thead>
                  <tr>
                    <th>Fecha/Hora</th>
                    <th>Tipo</th>
                    <th>Origen</th>
                    <th>Destino</th>
                    <th>Agente</th>
                    <th>Duración</th>
                    <th>Estado</th>
                    <th>Grabación</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state">
                          <FiPhone />
                          <p>No hay llamadas para los filtros seleccionados</p>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredData.map((item) => (
                    <tr key={item.id}>
                      <td className="fecha-cell">{(item.occurred_at || '').replace('T', ' ').substring(0, 19)}</td>
                      <td>
                        <span className={`tipo-badge ${item.tipo}`}>
                          {item.tipo === 'inbound' && <><FiPhoneIncoming /> Entrante</>}
                          {item.tipo === 'outbound' && <><FiPhoneOutgoing /> Saliente</>}
                          {item.tipo === 'missed' && <><FiPhoneMissed /> Perdida</>}
                          {(item.tipo !== 'inbound' && item.tipo !== 'outbound' && item.tipo !== 'missed') && item.tipo}
                        </span>
                      </td>
                      <td>{item.origen || '-'}</td>
                      <td>{item.destino || '-'}</td>
                      <td>{item.agente_nombre || '-'}</td>
                      <td className="duracion-cell">
                        {item.duracion_seg ? `${Math.floor(item.duracion_seg / 60)}:${(item.duracion_seg % 60).toString().padStart(2, '0')}` : '-'}
                      </td>
                      <td>
                        <span className={`estado-badge ${item.estado}`}>
                          {item.estado === 'completada' && 'Contestada'}
                          {item.estado === 'perdida' && 'Sin respuesta'}
                          {item.estado === 'ocupado' && 'Ocupado'}
                          {item.estado === 'fallida' && 'Fallida'}
                          {item.estado === 'en_curso' && 'En curso'}
                        </span>
                      </td>
                      <td>
                        {item.grabacion && item.grabacion_url ? (
                          <button
                            className={`btn-play ${audioActivo?.id === item.id && isPlaying ? 'playing' : ''}`}
                            onClick={() => handlePlayRecording(item)}
                            title="Reproducir grabación"
                          >
                            {audioActivo?.id === item.id && isPlaying ? <FiPause /> : <FiPlay />}
                          </button>
                        ) : (
                          <span className="no-grabacion">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="paginacion">
              <button className="pag-btn" disabled={paginaActual === 1} onClick={() => setPaginaActual(paginaActual - 1)}>
                <FiChevronLeft />
              </button>
              <span className="pag-info">Página {paginaActual} de {Math.max(1, Math.ceil(cdrTotal / 25))}</span>
              <button className="pag-btn" onClick={() => setPaginaActual(paginaActual + 1)}>
                <FiChevronRight />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="graficos"
            className="graficos-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Gráfico de llamadas por hora */}
            <div className="grafico-card">
              <div className="grafico-header">
                <h3>Llamadas por Hora</h3>
                <span className="grafico-subtitle">Distribución del día</span>
              </div>
              <div className="grafico-barras">
                {hourly.map((item, index) => (
                  <div key={index} className="barra-wrapper">
                    <motion.div
                      className="barra"
                      initial={{ height: 0 }}
                      animate={{ height: `${(item.count / maxLlamadas) * 100}%` }}
                      transition={{ delay: index * 0.05, duration: 0.5 }}
                    >
                      <span className="barra-valor">{item.count}</span>
                    </motion.div>
                    <span className="barra-label">{item.hour}:00</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribución por tipo */}
            <div className="grafico-card">
              <div className="grafico-header">
                <h3>Distribución por Tipo</h3>
                <span className="grafico-subtitle">Porcentaje de llamadas</span>
              </div>
              <div className="distribucion-tipos">
                {[
                  { key: 'Entrantes', pct: stats.total > 0 ? (stats.entrantes / stats.total * 100).toFixed(1) : 0, cls: 'entrantes' },
                  { key: 'Salientes', pct: stats.total > 0 ? (stats.salientes / stats.total * 100).toFixed(1) : 0, cls: 'salientes' },
                  { key: 'Perdidas', pct: stats.total > 0 ? (stats.perdidas / stats.total * 100).toFixed(1) : 0, cls: 'perdidas' },
                ].map((t, i) => (
                  <div key={t.key} className="tipo-item">
                    <div className="tipo-info">
                      <span className={`tipo-color ${t.cls}`}></span>
                      <span className="tipo-nombre">{t.key}</span>
                    </div>
                    <div className="tipo-barra-container">
                      <motion.div
                        className={`tipo-barra ${t.cls}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${t.pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                      />
                    </div>
                    <span className="tipo-porcentaje">{t.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Agentes */}
            <div className="grafico-card">
              <div className="grafico-header">
                <h3>Top Agentes</h3>
                <span className="grafico-subtitle">Por cantidad de llamadas</span>
              </div>
              <div className="top-agentes">
                {topAgentes.length > 0 ? topAgentes.map((agente, index) => {
                  const initials = (agente.agente_nombre || agente.nombre || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
                  const agenteTotal = agente.total || agente.total_llamadas || 0;
                  const maxCalls = Math.max(...topAgentes.map(a => a.total || a.total_llamadas || 0), 1);
                  return (
                    <div key={index} className="agente-row">
                      <div className="agente-rank">#{index + 1}</div>
                      <div className="agente-avatar">{initials}</div>
                      <div className="agente-info">
                        <span className="agente-nombre">{agente.nombre}</span>
                        <div className="agente-barra-container">
                          <motion.div
                            className="agente-barra"
                            initial={{ width: 0 }}
                            animate={{ width: `${(agenteTotal / maxCalls) * 100}%` }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                          />
                        </div>
                      </div>
                      <span className="agente-llamadas">{agenteTotal}</span>
                    </div>
                  );
                }) : (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>Sin datos de agentes</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reproductor de Audio Flotante */}
      <AnimatePresence>
        {audioActivo && (
          <motion.div
            className="audio-player"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <div className="audio-player-content">
              <div className="audio-info">
                <FiVolume2 className="audio-icon" />
                <div className="audio-details">
                  <span className="audio-title">Grabación de llamada</span>
                  <span className="audio-meta">
                    {audioActivo.origen} → {audioActivo.destino} | {audioActivo.duracion_seg ? `${Math.floor(audioActivo.duracion_seg / 60)}:${(audioActivo.duracion_seg % 60).toString().padStart(2, '0')}` : ''}
                  </span>
                </div>
              </div>

              <div className="audio-controls">
                <button
                  className="audio-btn play"
                  onClick={() => handlePlayRecording(audioActivo)}
                >
                  {isPlaying ? <FiPause /> : <FiPlay />}
                </button>

                <div className="audio-progress">
                  <div
                    className="audio-progress-bar"
                    style={{ width: `${audioProgress}%` }}
                  />
                </div>

                <span className="audio-time">
                  {fmtSeg(audioTimes.cur)} / {fmtSeg(audioTimes.dur)}
                </span>

                <button className="audio-btn close" onClick={closeAudioPlayer}>
                  <FiX />
                </button>
              </div>
            </div>
            <audio
              ref={audioRef}
              onTimeUpdate={(e) => {
                const a = e.currentTarget;
                if (a.duration) setAudioProgress((a.currentTime / a.duration) * 100);
                setAudioTimes({ cur: a.currentTime, dur: Number.isFinite(a.duration) ? a.duration : 0 });
              }}
              onEnded={() => { setIsPlaying(false); setAudioProgress(0); }}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              style={{ display: 'none' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reporteria;
