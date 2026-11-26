import { useState, useEffect, useCallback, useRef } from 'react';
import { cdrService, agentSelfService } from '../../services';
import { checkRecording, recordingSrc } from '../../lib/recordings';
import AudioSettings from './AudioSettings';
import { usePresence } from '../../hooks/usePresence';
import { useLoading } from '../../context/LoadingContext';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPhone,
  FiPhoneCall,
  FiPhoneOff,
  FiPhoneIncoming,
  FiPhoneOutgoing,
  FiPhoneMissed,
  FiMic,
  FiMicOff,
  FiPause,
  FiPlay,
  FiUsers,
  FiClock,
  FiSearch,
  FiSettings,
  FiActivity,
  FiTrendingUp,
  FiBarChart2,
  FiList,
  FiUser,
  FiCheck,
  FiX,
  FiChevronDown,
  FiRefreshCw
} from 'react-icons/fi';
import './Hablaphone.css';

// Estados disponibles del agente
// Mismos nombres que el selector del encabezado (usePresence). "En llamada"
// solo se muestra si el sistema lo pone; no se elige a mano.
const estadosAgente = [
  { id: 'disponible', label: 'Disponible', color: '#10b981', icon: FiCheck },
  { id: 'en_llamada', label: 'En llamada', color: '#6366f1', icon: FiPhone, auto: true },
  { id: 'pausa', label: 'Ocupado', color: '#f59e0b', icon: FiPause },
  { id: 'no_disponible', label: 'Ausente', color: '#ef4444', icon: FiX }
];

// Valores por defecto mientras cargan las estadísticas reales (CDR).
const ESTADISTICAS_VACIAS = {
  llamadasRealizadas: 0,
  llamadasRecibidas: 0,
  llamadasPerdidas: 0,
  tiempoTotal: '0h 0m',
  tiempoPromedio: '0:00',
  tasaRespuesta: 0,
};

const Hablaphone = () => {
  const [tabActivo, setTabActivo] = useState('telefono');
  // Estado del agente compartido con el encabezado (antes era una copia
  // local que siempre arrancaba en "Disponible" y no se sincronizaba).
  const { presence: estadoAgente, changePresence } = usePresence();
  const [showEstados, setShowEstados] = useState(false);
  const [numeroMarcado, setNumeroMarcado] = useState('');
  // Estado real de la llamada, publicado por el softphone (único dueño de la
  // llamada). Esta pantalla lo muestra y le envía órdenes; antes tenía su
  // propia llamada simulada y "Colgar" no cortaba la llamada real.
  const [sp, setSp] = useState({ callState: 'idle' });
  useEffect(() => {
    const onState = (e) => setSp(e.detail || { callState: 'idle' });
    window.addEventListener('hablagt:softphone:state', onState);
    window.dispatchEvent(new CustomEvent('hablagt:softphone:command', { detail: { action: 'query' } }));
    return () => window.removeEventListener('hablagt:softphone:state', onState);
  }, []);
  const softphone = (action) =>
    window.dispatchEvent(new CustomEvent('hablagt:softphone:command', { detail: { action } }));
  const enLlamada = sp.callState === 'calling' || sp.callState === 'connected';
  const llamadaActiva = enLlamada
    ? { numero: sp.numero, contacto: sp.callState === 'calling' ? 'Marcando…' : 'Conectado' }
    : null;
  const silenciado = Boolean(sp.muted);
  const enEspera = Boolean(sp.onHold);
  const tiempoLlamada = sp.duration || 0;

  // Historial
  const [historial, setHistorial] = useState([]);
  const [filtroHistorial, setFiltroHistorial] = useState('todos');
  const [busquedaHistorial, setBusquedaHistorial] = useState('');

  // Estadísticas (CDR reales)
  const [periodoStats, setPeriodoStats] = useState('hoy');
  const [estadisticas, setEstadisticas] = useState(ESTADISTICAS_VACIAS);
  const [cargandoStats, setCargandoStats] = useState(false);

  const [sipInfo, setSipInfo] = useState({ extension: '', servidor: '', estado: 'desconectado' });
  const { showLoading, hideLoading } = useLoading();
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const [hist, sip] = await Promise.all([
          cdrService.list({ page_size: 50, page: 1 }),
          agentSelfService.getSIP().catch(() => ({})),
        ]);
        const items = hist?.items || hist || [];
        setHistorial(
          items.map((c) => ({
            id: c.id,
            // En las salientes el origen es la extensión del agente: el número
            // del cliente es el destino.
            numero: (c.tipo === 'outbound' ? c.destino || c.origen : c.origen || c.destino) || '',
            contacto: c.contacto_nombre || (c.tipo === 'outbound' ? c.destino : c.origen) || c.agente_nombre || '',
            tipo: c.tipo,
            duracion: c.duracion_seg || 0,
            fecha: c.occurred_at,
            estado: c.estado,
            grabacion: Boolean(c.grabacion && c.grabacion_url),
            grabacion_url: c.grabacion_url || '',
          }))
        );
        setSipInfo({
          extension: sip?.extension || '',
          servidor: sip?.servidor || sip?.server || '',
          estado: sip?.estado || 'desconectado',
        });
      } catch (err) {
        console.error('hablaphone load error', err);
      }
    };
    load();
  }, []);

  // Estadísticas reales (CDR) para el período seleccionado. El backend filtra
  // por occurred_at >= fecha_inicio AND < fecha_fin (acepta YYYY-MM-DD).
  const loadStats = useCallback(async () => {
    setCargandoStats(true);
    try {
      const toYMD = (d) => d.toISOString().slice(0, 10);
      const hoy = new Date();
      const inicio = new Date(hoy);
      if (periodoStats === 'semana') inicio.setDate(inicio.getDate() - 6);
      const fin = new Date(hoy);
      fin.setDate(fin.getDate() + 1);
      const st = await cdrService.stats({ fecha_inicio: toYMD(inicio), fecha_fin: toYMD(fin) });
      const porTipo = st?.por_tipo || {};
      const porEstado = st?.por_estado || {};
      const total = st?.total || 0;
      const avg = st?.duracion_promedio_seg || 0;
      const completadas = porEstado.completada || 0;
      const totalSeg = Math.round(avg * completadas); // sin SUM en el backend: avg × completadas
      const horas = Math.floor(totalSeg / 3600);
      const mins = Math.floor((totalSeg % 3600) / 60);
      const promMin = Math.floor(avg / 60);
      const promSec = Math.round(avg % 60);
      setEstadisticas({
        llamadasRealizadas: porTipo.outbound || 0,
        llamadasRecibidas: porTipo.inbound || 0,
        llamadasPerdidas: porEstado.perdida || 0,
        tiempoTotal: `${horas}h ${mins}m`,
        tiempoPromedio: `${promMin}:${String(promSec).padStart(2, '0')}`,
        tasaRespuesta: total > 0 ? Math.round((completadas / total) * 100) : 0,
      });
    } catch (err) {
      console.error('stats load error', err);
      setEstadisticas(ESTADISTICAS_VACIAS);
    } finally {
      setCargandoStats(false);
    }
  }, [periodoStats]);

  // Cargar al abrir la pestaña o cambiar de período.
  useEffect(() => {
    if (tabActivo === 'estadisticas') loadStats();
  }, [tabActivo, loadStats]);

  const handleSipReconnect = async () => {
    showLoading('Reconectando SIP...');
    try {
      await agentSelfService.sipReconnect();
      setSipInfo((prev) => ({ ...prev, estado: 'reconectando' }));
      setTimeout(async () => {
        try {
          const sip = await agentSelfService.getSIP();
          setSipInfo((prev) => ({
            extension: sip?.extension || prev.extension,
            servidor: sip?.servidor || sip?.server || prev.servidor,
            estado: sip?.estado || 'conectado',
          }));
        } finally {
          hideLoading();
        }
      }, 1500);
    } catch (err) {
      hideLoading();
      toast.error('Error al reconectar: ' + (err?.response?.data?.error?.message || err.message));
    }
  };

  const handleCambiarEstado = async (nuevoEstado) => {
    setShowEstados(false);
    if (!(await changePresence(nuevoEstado))) toast.error('No se pudo cambiar tu estado.');
  };

  const handleLlamar = async () => {
    if (numeroMarcado.length === 0) return;
    // El softphone hace la llamada real y avisa su estado (ver arriba).
    window.dispatchEvent(new CustomEvent('hablagt:softphone:call', { detail: { numero: numeroMarcado } }));
  };


  const formatTiempo = (segundos) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handlers del teclado
  const handleDigito = (digito) => {
    setNumeroMarcado(prev => prev + digito);
  };

  const handleBorrar = () => {
    setNumeroMarcado(prev => prev.slice(0, -1));
  };

  const handleColgar = () => softphone('hangup');

  // Grabaciones del historial: un solo reproductor para la página.
  const audioRef = useRef(null);
  const [sonando, setSonando] = useState(null);
  const toggleGrabacion = async (llamada) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (sonando === llamada.id) {
      audio.pause();
      setSonando(null);
      return;
    }
    try {
      await checkRecording(llamada.grabacion_url);
    } catch (err) {
      toast.error(err.message);
      return;
    }
    audio.src = recordingSrc(llamada.grabacion_url);
    audio.play().then(() => setSonando(llamada.id)).catch(() => {
      setSonando(null);
      toast.error('No se pudo reproducir la grabación.');
    });
  };

  // Filtrar historial
  const historialFiltrado = historial.filter(llamada => {
    const matchTipo = filtroHistorial === 'todos' || llamada.tipo === filtroHistorial;
    const matchBusqueda = (llamada.contacto || '').toLowerCase().includes(busquedaHistorial.toLowerCase()) ||
                          (llamada.numero || '').includes(busquedaHistorial);
    return matchTipo && matchBusqueda;
  });

  const estadoActual = estadosAgente.find(e => e.id === estadoAgente);
  const EstadoIcon = estadoActual?.icon || FiCheck;

  const tabs = [
    { id: 'telefono', label: 'Teléfono', icon: FiPhone },
    { id: 'historial', label: 'Historial', icon: FiList },
    { id: 'estadisticas', label: 'Estadísticas', icon: FiBarChart2 },
    { id: 'configuracion', label: 'Configuración', icon: FiSettings }
  ];

  return (
    <div className="hablaphone">
      <audio ref={audioRef} onEnded={() => setSonando(null)} hidden />
      {/* Header */}
      <div className="hablaphone-header">
        <div className="hablaphone-title">
          <FiPhoneCall className="title-icon" />
          <div>
            <h1>Hablaphone</h1>
            <p>Centro de control de comunicaciones</p>
          </div>
        </div>

        {/* Estado del agente */}
        <div className="agente-estado-container">
          <button
            className="agente-estado-btn"
            onClick={() => setShowEstados(!showEstados)}
            style={{ '--estado-color': estadoActual?.color }}
          >
            <span className="estado-indicator" style={{ background: estadoActual?.color }}></span>
            <EstadoIcon />
            <span>{estadoActual?.label}</span>
            <FiChevronDown className={`chevron ${showEstados ? 'open' : ''}`} />
          </button>

          <AnimatePresence>
            {showEstados && (
              <motion.div
                className="estados-dropdown"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {estadosAgente.filter((e) => !e.auto).map(estado => {
                  const Icon = estado.icon;
                  return (
                    <button
                      key={estado.id}
                      className={`estado-option ${estadoAgente === estado.id ? 'active' : ''}`}
                      onClick={() => handleCambiarEstado(estado.id)}
                    >
                      <span className="estado-dot" style={{ background: estado.color }}></span>
                      <Icon style={{ color: estado.color }} />
                      <span>{estado.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs */}
      <div className="hablaphone-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-btn ${tabActivo === tab.id ? 'active' : ''}`}
              onClick={() => setTabActivo(tab.id)}
            >
              <Icon />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      <div className="hablaphone-content">
        <AnimatePresence mode="wait">
          {/* Tab Teléfono */}
          {tabActivo === 'telefono' && (
            <motion.div
              key="telefono"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="tab-telefono"
            >
              <div className="telefono-grid">
                {/* Panel de marcación */}
                <div className="marcador-panel">
                  <div className="marcador-display">
                    <input
                      type="text"
                      value={numeroMarcado}
                      onChange={(e) => setNumeroMarcado(e.target.value)}
                      placeholder="Ingresa número..."
                      className="numero-input"
                    />
                    {numeroMarcado && (
                      <button className="btn-borrar" onClick={handleBorrar}>
                        <FiX />
                      </button>
                    )}
                  </div>

                  <div className="teclado">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(digito => (
                      <button
                        key={digito}
                        className="tecla"
                        onClick={() => handleDigito(digito)}
                      >
                        <span className="tecla-numero">{digito}</span>
                        {digito === '2' && <span className="tecla-letras">ABC</span>}
                        {digito === '3' && <span className="tecla-letras">DEF</span>}
                        {digito === '4' && <span className="tecla-letras">GHI</span>}
                        {digito === '5' && <span className="tecla-letras">JKL</span>}
                        {digito === '6' && <span className="tecla-letras">MNO</span>}
                        {digito === '7' && <span className="tecla-letras">PQRS</span>}
                        {digito === '8' && <span className="tecla-letras">TUV</span>}
                        {digito === '9' && <span className="tecla-letras">WXYZ</span>}
                        {digito === '0' && <span className="tecla-letras">+</span>}
                      </button>
                    ))}
                  </div>

                  <div className="marcador-actions">
                    {!enLlamada ? (
                      <button
                        className="btn-llamar"
                        onClick={handleLlamar}
                        disabled={!numeroMarcado}
                      >
                        <FiPhone />
                        <span>Llamar</span>
                      </button>
                    ) : (
                      <button className="btn-colgar" onClick={handleColgar}>
                        <FiPhoneOff />
                        <span>Colgar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Panel de llamada activa / Llamadas recientes */}
                <div className="info-panel">
                  {enLlamada && llamadaActiva ? (
                    <div className="llamada-activa">
                      <div className="llamada-estado">
                        <div className="llamada-pulso"></div>
                        <span>Llamada en curso</span>
                      </div>

                      <div className="llamada-info">
                        <div className="llamada-avatar">
                          <FiUser />
                        </div>
                        <h3>{llamadaActiva.contacto}</h3>
                        <p>{llamadaActiva.numero}</p>
                        <div className="llamada-tiempo">
                          <FiClock />
                          <span>{formatTiempo(tiempoLlamada)}</span>
                        </div>
                      </div>

                      <div className="llamada-controles">
                        <button
                          className={`control-btn ${silenciado ? 'active' : ''}`}
                          onClick={() => softphone('mute')}
                        >
                          {silenciado ? <FiMicOff /> : <FiMic />}
                          <span>{silenciado ? 'Activar' : 'Silenciar'}</span>
                        </button>
                        <button
                          className={`control-btn ${enEspera ? 'active' : ''}`}
                          onClick={() => softphone('hold')}
                        >
                          {enEspera ? <FiPlay /> : <FiPause />}
                          <span>{enEspera ? 'Continuar' : 'Espera'}</span>
                        </button>
                        <button className="control-btn" onClick={() => softphone('transfer')}>
                          <FiUsers />
                          <span>Transferir</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="llamadas-recientes">
                      <h3>
                        <FiClock />
                        Llamadas Recientes
                      </h3>
                      <div className="recientes-lista">
                        {historial.slice(0, 5).map(llamada => (
                          <div
                            key={llamada.id}
                            className="reciente-item"
                            onClick={() => setNumeroMarcado(llamada.numero.replace(/\s/g, ''))}
                          >
                            <div className={`reciente-icon ${llamada.tipo}`}>
                              {llamada.tipo === 'entrante' && <FiPhoneIncoming />}
                              {llamada.tipo === 'saliente' && <FiPhoneOutgoing />}
                              {llamada.tipo === 'perdida' && <FiPhoneMissed />}
                            </div>
                            <div className="reciente-info">
                              <span className="reciente-contacto">{llamada.contacto}</span>
                              <span className="reciente-numero">{llamada.numero}</span>
                            </div>
                            <div className="reciente-meta">
                              <span className="reciente-hora">{llamada.hora}</span>
                              <span className="reciente-duracion">{llamada.duracion}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab Historial */}
          {tabActivo === 'historial' && (
            <motion.div
              key="historial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="tab-historial"
            >
              <div className="historial-header">
                <div className="historial-busqueda">
                  <FiSearch />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o número..."
                    value={busquedaHistorial}
                    onChange={(e) => setBusquedaHistorial(e.target.value)}
                  />
                </div>
                <div className="historial-filtros">
                  {['todos', 'entrante', 'saliente', 'perdida'].map(filtro => (
                    <button
                      key={filtro}
                      className={`filtro-btn ${filtroHistorial === filtro ? 'active' : ''}`}
                      onClick={() => setFiltroHistorial(filtro)}
                    >
                      {filtro === 'todos' && 'Todas'}
                      {filtro === 'entrante' && <><FiPhoneIncoming /> Entrantes</>}
                      {filtro === 'saliente' && <><FiPhoneOutgoing /> Salientes</>}
                      {filtro === 'perdida' && <><FiPhoneMissed /> Perdidas</>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="historial-tabla">
                <div className="tabla-header">
                  <span>Tipo</span>
                  <span>Contacto</span>
                  <span>Número</span>
                  <span>Fecha</span>
                  <span>Hora</span>
                  <span>Duración</span>
                  <span>Acciones</span>
                </div>
                <div className="tabla-body">
                  {historialFiltrado.map(llamada => (
                    <div key={llamada.id} className="tabla-row">
                      <span className={`tipo-badge ${llamada.tipo}`}>
                        {llamada.tipo === 'entrante' && <FiPhoneIncoming />}
                        {llamada.tipo === 'saliente' && <FiPhoneOutgoing />}
                        {llamada.tipo === 'perdida' && <FiPhoneMissed />}
                      </span>
                      <span className="contacto-cell">
                        <FiUser />
                        {llamada.contacto}
                      </span>
                      <span className="numero-cell">{llamada.numero}</span>
                      <span>{llamada.fecha}</span>
                      <span>{llamada.hora}</span>
                      <span className="duracion-cell">{llamada.duracion}</span>
                      <span className="acciones-cell">
                        <button
                          className="btn-accion llamar"
                          onClick={() => {
                            setNumeroMarcado(llamada.numero.replace(/\s/g, ''));
                            setTabActivo('telefono');
                          }}
                          title="Llamar"
                        >
                          <FiPhone />
                        </button>
                        {llamada.grabacion && (
                          <button
                            className={`btn-accion grabar ${sonando === llamada.id ? 'active' : ''}`}
                            title={sonando === llamada.id ? 'Pausar grabación' : 'Escuchar grabación'}
                            aria-label={sonando === llamada.id ? 'Pausar grabación' : 'Escuchar grabación'}
                            onClick={() => toggleGrabacion(llamada)}
                          >
                            {sonando === llamada.id ? <FiPause /> : <FiPlay />}
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab Estadísticas */}
          {tabActivo === 'estadisticas' && (
            <motion.div
              key="estadisticas"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="tab-estadisticas"
            >
              <div className="stats-header">
                <div className="periodo-selector">
                  <button
                    className={periodoStats === 'hoy' ? 'active' : ''}
                    onClick={() => setPeriodoStats('hoy')}
                  >
                    Hoy
                  </button>
                  <button
                    className={periodoStats === 'semana' ? 'active' : ''}
                    onClick={() => setPeriodoStats('semana')}
                  >
                    Esta Semana
                  </button>
                </div>
                <button className="btn-refresh" onClick={loadStats} disabled={cargandoStats}>
                  <FiRefreshCw className={cargandoStats ? 'spin' : ''} />
                  Actualizar
                </button>
              </div>

              <div className="stats-grid">
                <div className="stat-card salientes">
                  <div className="stat-icon">
                    <FiPhoneOutgoing />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estadisticas.llamadasRealizadas}</span>
                    <span className="stat-label">Llamadas Realizadas</span>
                  </div>
                </div>

                <div className="stat-card entrantes">
                  <div className="stat-icon">
                    <FiPhoneIncoming />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estadisticas.llamadasRecibidas}</span>
                    <span className="stat-label">Llamadas Recibidas</span>
                  </div>
                </div>

                <div className="stat-card perdidas">
                  <div className="stat-icon">
                    <FiPhoneMissed />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estadisticas.llamadasPerdidas}</span>
                    <span className="stat-label">Llamadas Perdidas</span>
                  </div>
                </div>

                <div className="stat-card tiempo">
                  <div className="stat-icon">
                    <FiClock />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estadisticas.tiempoTotal}</span>
                    <span className="stat-label">Tiempo Total</span>
                  </div>
                </div>

                <div className="stat-card promedio">
                  <div className="stat-icon">
                    <FiActivity />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estadisticas.tiempoPromedio}</span>
                    <span className="stat-label">Duración Promedio</span>
                  </div>
                </div>

                <div className="stat-card tasa">
                  <div className="stat-icon">
                    <FiTrendingUp />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estadisticas.tasaRespuesta}%</span>
                    <span className="stat-label">Tasa de Respuesta</span>
                  </div>
                </div>
              </div>

              <div className="stats-chart-placeholder">
                <FiBarChart2 />
                <p>Gráfica de actividad por hora</p>
                <span>Integración con librería de gráficas pendiente</span>
              </div>
            </motion.div>
          )}

          {/* Tab Configuración */}
          {tabActivo === 'configuracion' && (
            <motion.div
              key="configuracion"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="tab-configuracion"
            >
              <div className="config-grid">
                <AudioSettings />

                {/* Cuenta SIP */}
                <div className="config-section">
                  <h3>
                    <FiPhone />
                    Cuenta SIP / FreePBX
                  </h3>

                  <div className={`sip-status ${sipInfo.estado === 'conectado' ? 'conectado' : 'desconectado'}`}>
                    <div className="status-indicator"></div>
                    <span>{sipInfo.estado === 'conectado' ? 'Conectado a FreePBX' : 'Desconectado'}</span>
                  </div>

                  <div className="config-group">
                    <label>Extensión</label>
                    <input type="text" value={sipInfo.extension || '—'} disabled />
                  </div>

                  <div className="config-group">
                    <label>Servidor</label>
                    <input type="text" value={sipInfo.servidor || '—'} disabled />
                  </div>

                  <button className="btn-secondary" onClick={handleSipReconnect}>
                    <FiRefreshCw />
                    Reconectar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Hablaphone;
