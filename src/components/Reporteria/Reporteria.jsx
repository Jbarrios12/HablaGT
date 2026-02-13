import { useState, useRef } from 'react';
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
import './Reporteria.css';

// Datos de ejemplo para CDR con grabaciones
const cdrData = [
  { id: 1, fecha: '2024-01-15 09:23:45', origen: '1001', destino: '+502 5555-1234', tipo: 'outgoing', duracion: '05:23', estado: 'answered', agente: 'Juan Pérez', grabacion: true },
  { id: 2, fecha: '2024-01-15 09:45:12', origen: '+502 4444-5678', destino: '1002', tipo: 'incoming', duracion: '02:15', estado: 'answered', agente: 'María García', grabacion: true },
  { id: 3, fecha: '2024-01-15 10:02:33', origen: '+502 3333-9012', destino: '1001', tipo: 'missed', duracion: '00:00', estado: 'no-answer', agente: 'Juan Pérez', grabacion: false },
  { id: 4, fecha: '2024-01-15 10:15:08', origen: '1003', destino: '+502 2222-3456', tipo: 'outgoing', duracion: '08:47', estado: 'answered', agente: 'Carlos López', grabacion: true },
  { id: 5, fecha: '2024-01-15 10:45:22', origen: '+502 1111-7890', destino: '1002', tipo: 'incoming', duracion: '03:02', estado: 'answered', agente: 'María García', grabacion: true },
  { id: 6, fecha: '2024-01-15 11:05:17', origen: '1001', destino: '+502 6666-4321', tipo: 'outgoing', duracion: '00:00', estado: 'busy', agente: 'Juan Pérez', grabacion: false },
  { id: 7, fecha: '2024-01-15 11:23:45', origen: '+502 7777-8765', destino: '1003', tipo: 'incoming', duracion: '12:34', estado: 'answered', agente: 'Carlos López', grabacion: true },
  { id: 8, fecha: '2024-01-15 11:45:00', origen: '+502 8888-2345', destino: '1001', tipo: 'missed', duracion: '00:00', estado: 'no-answer', agente: 'Juan Pérez', grabacion: false },
  { id: 9, fecha: '2024-01-15 12:10:33', origen: '1002', destino: '+502 9999-6789', tipo: 'outgoing', duracion: '04:56', estado: 'answered', agente: 'María García', grabacion: true },
  { id: 10, fecha: '2024-01-15 12:35:18', origen: '+502 1234-5678', destino: '1003', tipo: 'incoming', duracion: '07:22', estado: 'answered', agente: 'Carlos López', grabacion: true },
];

// Datos para gráfico de barras
const hourlyData = [
  { hora: '08:00', llamadas: 12 },
  { hora: '09:00', llamadas: 25 },
  { hora: '10:00', llamadas: 38 },
  { hora: '11:00', llamadas: 45 },
  { hora: '12:00', llamadas: 32 },
  { hora: '13:00', llamadas: 18 },
  { hora: '14:00', llamadas: 52 },
  { hora: '15:00', llamadas: 48 },
  { hora: '16:00', llamadas: 35 },
  { hora: '17:00', llamadas: 22 },
];

const Reporteria = () => {
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [vistaActiva, setVistaActiva] = useState('tabla');

  // Estado para reproductor de audio
  const [audioActivo, setAudioActivo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef(null);

  const stats = {
    totalLlamadas: 1256,
    entrantes: 534,
    salientes: 612,
    perdidas: 110,
    duracionPromedio: '04:32',
    tasaConexion: 91.2
  };

  const maxLlamadas = Math.max(...hourlyData.map(d => d.llamadas));

  const filteredData = cdrData.filter(item => {
    if (filtroTipo !== 'all' && item.tipo !== filtroTipo) return false;
    if (busqueda) {
      const search = busqueda.toLowerCase();
      return (
        item.origen.toLowerCase().includes(search) ||
        item.destino.toLowerCase().includes(search) ||
        item.agente.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Funciones del reproductor de audio
  const handlePlayRecording = (item) => {
    if (audioActivo?.id === item.id) {
      // Toggle play/pause
      if (isPlaying) {
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
      }
    } else {
      // Nueva grabación
      setAudioActivo(item);
      setIsPlaying(true);
      setAudioProgress(0);

      // Simular progreso de audio (en producción usarías un archivo real)
      simulateAudioProgress();
    }
  };

  const simulateAudioProgress = () => {
    setAudioProgress(0);
    const interval = setInterval(() => {
      setAudioProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsPlaying(false);
          return 100;
        }
        return prev + 1;
      });
    }, 100);
  };

  const closeAudioPlayer = () => {
    setAudioActivo(null);
    setIsPlaying(false);
    setAudioProgress(0);
  };

  return (
    <div className="reporteria">
      {/* Header */}
      <div className="reporteria-header">
        <div className="reporteria-title">
          <FiBarChart2 className="title-icon" />
          <div>
            <h1>Reportería FreePBX</h1>
            <p>Análisis detallado de llamadas y rendimiento</p>
          </div>
        </div>
        <div className="reporteria-actions">
          <button className="btn-export">
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
                  {filteredData.map((item) => (
                    <tr key={item.id}>
                      <td className="fecha-cell">{item.fecha}</td>
                      <td>
                        <span className={`tipo-badge ${item.tipo}`}>
                          {item.tipo === 'incoming' && <><FiPhoneIncoming /> Entrante</>}
                          {item.tipo === 'outgoing' && <><FiPhoneOutgoing /> Saliente</>}
                          {item.tipo === 'missed' && <><FiPhoneMissed /> Perdida</>}
                        </span>
                      </td>
                      <td>{item.origen}</td>
                      <td>{item.destino}</td>
                      <td>{item.agente}</td>
                      <td className="duracion-cell">{item.duracion}</td>
                      <td>
                        <span className={`estado-badge ${item.estado}`}>
                          {item.estado === 'answered' && 'Contestada'}
                          {item.estado === 'no-answer' && 'Sin respuesta'}
                          {item.estado === 'busy' && 'Ocupado'}
                        </span>
                      </td>
                      <td>
                        {item.grabacion ? (
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
              <span className="pag-info">Página {paginaActual} de 10</span>
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
                {hourlyData.map((item, index) => (
                  <div key={index} className="barra-wrapper">
                    <motion.div
                      className="barra"
                      initial={{ height: 0 }}
                      animate={{ height: `${(item.llamadas / maxLlamadas) * 100}%` }}
                      transition={{ delay: index * 0.05, duration: 0.5 }}
                    >
                      <span className="barra-valor">{item.llamadas}</span>
                    </motion.div>
                    <span className="barra-label">{item.hora}</span>
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
                <div className="tipo-item">
                  <div className="tipo-info">
                    <span className="tipo-color entrantes"></span>
                    <span className="tipo-nombre">Entrantes</span>
                  </div>
                  <div className="tipo-barra-container">
                    <motion.div
                      className="tipo-barra entrantes"
                      initial={{ width: 0 }}
                      animate={{ width: '42.5%' }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <span className="tipo-porcentaje">42.5%</span>
                </div>

                <div className="tipo-item">
                  <div className="tipo-info">
                    <span className="tipo-color salientes"></span>
                    <span className="tipo-nombre">Salientes</span>
                  </div>
                  <div className="tipo-barra-container">
                    <motion.div
                      className="tipo-barra salientes"
                      initial={{ width: 0 }}
                      animate={{ width: '48.7%' }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                    />
                  </div>
                  <span className="tipo-porcentaje">48.7%</span>
                </div>

                <div className="tipo-item">
                  <div className="tipo-info">
                    <span className="tipo-color perdidas"></span>
                    <span className="tipo-nombre">Perdidas</span>
                  </div>
                  <div className="tipo-barra-container">
                    <motion.div
                      className="tipo-barra perdidas"
                      initial={{ width: 0 }}
                      animate={{ width: '8.8%' }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                  </div>
                  <span className="tipo-porcentaje">8.8%</span>
                </div>
              </div>
            </div>

            {/* Top Agentes */}
            <div className="grafico-card">
              <div className="grafico-header">
                <h3>Top Agentes</h3>
                <span className="grafico-subtitle">Por cantidad de llamadas</span>
              </div>
              <div className="top-agentes">
                {[
                  { nombre: 'María García', llamadas: 156, avatar: 'MG' },
                  { nombre: 'Juan Pérez', llamadas: 142, avatar: 'JP' },
                  { nombre: 'Carlos López', llamadas: 128, avatar: 'CL' },
                  { nombre: 'Ana Martínez', llamadas: 98, avatar: 'AM' },
                ].map((agente, index) => (
                  <div key={index} className="agente-row">
                    <div className="agente-rank">#{index + 1}</div>
                    <div className="agente-avatar">{agente.avatar}</div>
                    <div className="agente-info">
                      <span className="agente-nombre">{agente.nombre}</span>
                      <div className="agente-barra-container">
                        <motion.div
                          className="agente-barra"
                          initial={{ width: 0 }}
                          animate={{ width: `${(agente.llamadas / 156) * 100}%` }}
                          transition={{ duration: 0.6, delay: index * 0.1 }}
                        />
                      </div>
                    </div>
                    <span className="agente-llamadas">{agente.llamadas}</span>
                  </div>
                ))}
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
                    {audioActivo.origen} → {audioActivo.destino} | {audioActivo.duracion}
                  </span>
                </div>
              </div>

              <div className="audio-controls">
                <button
                  className="audio-btn play"
                  onClick={() => setIsPlaying(!isPlaying)}
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
                  {Math.floor(audioProgress * 0.05)}:{String(Math.floor((audioProgress * 0.05 % 1) * 60)).padStart(2, '0')}
                </span>

                <button className="audio-btn close" onClick={closeAudioPlayer}>
                  <FiX />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reporteria;
