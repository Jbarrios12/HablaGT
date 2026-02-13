import { useState, useEffect } from 'react';
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
  FiCalendar,
  FiSearch,
  FiFilter,
  FiSettings,
  FiVolume2,
  FiHeadphones,
  FiActivity,
  FiTrendingUp,
  FiBarChart2,
  FiList,
  FiGrid,
  FiUser,
  FiCheck,
  FiX,
  FiChevronDown,
  FiRefreshCw,
  FiDownload,
  FiExternalLink
} from 'react-icons/fi';
import './Hablaphone.css';

// Estados disponibles del agente
const estadosAgente = [
  { id: 'disponible', label: 'Disponible', color: '#10b981', icon: FiCheck },
  { id: 'en_llamada', label: 'En Llamada', color: '#6366f1', icon: FiPhone },
  { id: 'pausa', label: 'En Pausa', color: '#f59e0b', icon: FiPause },
  { id: 'no_disponible', label: 'No Disponible', color: '#ef4444', icon: FiX }
];

// Datos de ejemplo - Historial de llamadas
const historialData = [
  { id: 1, tipo: 'saliente', numero: '+502 5555-1234', contacto: 'Carlos Mendoza', duracion: '5:23', fecha: '2024-01-15', hora: '09:15', estado: 'completada', grabacion: true },
  { id: 2, tipo: 'entrante', numero: '+502 5555-6789', contacto: 'María López', duracion: '12:45', fecha: '2024-01-15', hora: '10:30', estado: 'completada', grabacion: true },
  { id: 3, tipo: 'perdida', numero: '+502 5555-2345', contacto: 'Desconocido', duracion: '-', fecha: '2024-01-15', hora: '11:00', estado: 'perdida', grabacion: false },
  { id: 4, tipo: 'saliente', numero: '+502 5555-3456', contacto: 'Roberto Juárez', duracion: '3:12', fecha: '2024-01-15', hora: '11:45', estado: 'completada', grabacion: true },
  { id: 5, tipo: 'entrante', numero: '+502 5555-4567', contacto: 'Ana Martínez', duracion: '8:30', fecha: '2024-01-15', hora: '14:20', estado: 'completada', grabacion: false },
  { id: 6, tipo: 'saliente', numero: '+502 5555-5678', contacto: 'Pedro García', duracion: '2:15', fecha: '2024-01-14', hora: '16:00', estado: 'completada', grabacion: true },
  { id: 7, tipo: 'perdida', numero: '+502 5555-6789', contacto: 'Sandra López', duracion: '-', fecha: '2024-01-14', hora: '09:30', estado: 'perdida', grabacion: false },
  { id: 8, tipo: 'entrante', numero: '+502 5555-7890', contacto: 'Luis Hernández', duracion: '15:45', fecha: '2024-01-14', hora: '10:15', estado: 'completada', grabacion: true },
];

// Estadísticas de ejemplo
const estadisticasData = {
  hoy: {
    llamadasRealizadas: 24,
    llamadasRecibidas: 18,
    llamadasPerdidas: 3,
    tiempoTotal: '2h 45m',
    tiempoPromedio: '4:30',
    tasaRespuesta: 85
  },
  semana: {
    llamadasRealizadas: 156,
    llamadasRecibidas: 132,
    llamadasPerdidas: 12,
    tiempoTotal: '18h 30m',
    tiempoPromedio: '5:15',
    tasaRespuesta: 91
  }
};

const Hablaphone = () => {
  const [tabActivo, setTabActivo] = useState('telefono');
  const [estadoAgente, setEstadoAgente] = useState('disponible');
  const [showEstados, setShowEstados] = useState(false);
  const [numeroMarcado, setNumeroMarcado] = useState('');
  const [enLlamada, setEnLlamada] = useState(false);
  const [llamadaActiva, setLlamadaActiva] = useState(null);
  const [silenciado, setsilenciado] = useState(false);
  const [enEspera, setEnEspera] = useState(false);
  const [tiempoLlamada, setTiempoLlamada] = useState(0);

  // Historial
  const [historial, setHistorial] = useState(historialData);
  const [filtroHistorial, setFiltroHistorial] = useState('todos');
  const [busquedaHistorial, setBusquedaHistorial] = useState('');

  // Estadísticas
  const [periodoStats, setPeriodoStats] = useState('hoy');

  // Configuración
  const [configAudio, setConfigAudio] = useState({
    microfono: 'default',
    altavoz: 'default',
    volumenMic: 80,
    volumenAltavoz: 70,
    notificaciones: true,
    autoAnswer: false,
    grabacionAuto: true
  });

  // Timer de llamada
  useEffect(() => {
    let interval;
    if (enLlamada) {
      interval = setInterval(() => {
        setTiempoLlamada(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [enLlamada]);

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

  const handleLlamar = () => {
    if (numeroMarcado.length > 0) {
      setEnLlamada(true);
      setLlamadaActiva({
        numero: numeroMarcado,
        contacto: 'Marcando...',
        tipo: 'saliente'
      });
      setTiempoLlamada(0);
      setEstadoAgente('en_llamada');
    }
  };

  const handleColgar = () => {
    setEnLlamada(false);
    setLlamadaActiva(null);
    setTiempoLlamada(0);
    setsilenciado(false);
    setEnEspera(false);
    setEstadoAgente('disponible');
  };

  // Filtrar historial
  const historialFiltrado = historial.filter(llamada => {
    const matchTipo = filtroHistorial === 'todos' || llamada.tipo === filtroHistorial;
    const matchBusqueda = llamada.contacto.toLowerCase().includes(busquedaHistorial.toLowerCase()) ||
                          llamada.numero.includes(busquedaHistorial);
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
                {estadosAgente.map(estado => {
                  const Icon = estado.icon;
                  return (
                    <button
                      key={estado.id}
                      className={`estado-option ${estadoAgente === estado.id ? 'active' : ''}`}
                      onClick={() => {
                        setEstadoAgente(estado.id);
                        setShowEstados(false);
                      }}
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
                          onClick={() => setsilenciado(!silenciado)}
                        >
                          {silenciado ? <FiMicOff /> : <FiMic />}
                          <span>{silenciado ? 'Activar' : 'Silenciar'}</span>
                        </button>
                        <button
                          className={`control-btn ${enEspera ? 'active' : ''}`}
                          onClick={() => setEnEspera(!enEspera)}
                        >
                          {enEspera ? <FiPlay /> : <FiPause />}
                          <span>{enEspera ? 'Continuar' : 'Espera'}</span>
                        </button>
                        <button className="control-btn">
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
                          <button className="btn-accion grabar" title="Escuchar grabación">
                            <FiPlay />
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
                <button className="btn-refresh">
                  <FiRefreshCw />
                  Actualizar
                </button>
              </div>

              <div className="stats-grid">
                <div className="stat-card salientes">
                  <div className="stat-icon">
                    <FiPhoneOutgoing />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estadisticasData[periodoStats].llamadasRealizadas}</span>
                    <span className="stat-label">Llamadas Realizadas</span>
                  </div>
                </div>

                <div className="stat-card entrantes">
                  <div className="stat-icon">
                    <FiPhoneIncoming />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estadisticasData[periodoStats].llamadasRecibidas}</span>
                    <span className="stat-label">Llamadas Recibidas</span>
                  </div>
                </div>

                <div className="stat-card perdidas">
                  <div className="stat-icon">
                    <FiPhoneMissed />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estadisticasData[periodoStats].llamadasPerdidas}</span>
                    <span className="stat-label">Llamadas Perdidas</span>
                  </div>
                </div>

                <div className="stat-card tiempo">
                  <div className="stat-icon">
                    <FiClock />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estadisticasData[periodoStats].tiempoTotal}</span>
                    <span className="stat-label">Tiempo Total</span>
                  </div>
                </div>

                <div className="stat-card promedio">
                  <div className="stat-icon">
                    <FiActivity />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estadisticasData[periodoStats].tiempoPromedio}</span>
                    <span className="stat-label">Duración Promedio</span>
                  </div>
                </div>

                <div className="stat-card tasa">
                  <div className="stat-icon">
                    <FiTrendingUp />
                  </div>
                  <div className="stat-info">
                    <span className="stat-valor">{estadisticasData[periodoStats].tasaRespuesta}%</span>
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
                {/* Audio */}
                <div className="config-section">
                  <h3>
                    <FiHeadphones />
                    Dispositivos de Audio
                  </h3>

                  <div className="config-group">
                    <label>
                      <FiMic />
                      Micrófono
                    </label>
                    <select
                      value={configAudio.microfono}
                      onChange={(e) => setConfigAudio({...configAudio, microfono: e.target.value})}
                    >
                      <option value="default">Micrófono predeterminado</option>
                      <option value="headset">Headset USB</option>
                      <option value="webcam">Micrófono Webcam</option>
                    </select>
                  </div>

                  <div className="config-group">
                    <label>
                      <FiVolume2 />
                      Altavoz
                    </label>
                    <select
                      value={configAudio.altavoz}
                      onChange={(e) => setConfigAudio({...configAudio, altavoz: e.target.value})}
                    >
                      <option value="default">Altavoz predeterminado</option>
                      <option value="headset">Headset USB</option>
                      <option value="speakers">Altavoces externos</option>
                    </select>
                  </div>

                  <div className="config-group">
                    <label>Volumen Micrófono</label>
                    <div className="volume-control">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={configAudio.volumenMic}
                        onChange={(e) => setConfigAudio({...configAudio, volumenMic: parseInt(e.target.value)})}
                      />
                      <span>{configAudio.volumenMic}%</span>
                    </div>
                  </div>

                  <div className="config-group">
                    <label>Volumen Altavoz</label>
                    <div className="volume-control">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={configAudio.volumenAltavoz}
                        onChange={(e) => setConfigAudio({...configAudio, volumenAltavoz: parseInt(e.target.value)})}
                      />
                      <span>{configAudio.volumenAltavoz}%</span>
                    </div>
                  </div>

                  <button className="btn-test-audio">
                    <FiPlay />
                    Probar Audio
                  </button>
                </div>

                {/* Preferencias */}
                <div className="config-section">
                  <h3>
                    <FiSettings />
                    Preferencias
                  </h3>

                  <div className="config-toggle">
                    <div className="toggle-info">
                      <span className="toggle-label">Notificaciones de llamada</span>
                      <span className="toggle-desc">Mostrar notificación en llamadas entrantes</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={configAudio.notificaciones}
                        onChange={(e) => setConfigAudio({...configAudio, notificaciones: e.target.checked})}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="config-toggle">
                    <div className="toggle-info">
                      <span className="toggle-label">Auto-respuesta</span>
                      <span className="toggle-desc">Contestar automáticamente después de 3 segundos</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={configAudio.autoAnswer}
                        onChange={(e) => setConfigAudio({...configAudio, autoAnswer: e.target.checked})}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>

                  <div className="config-toggle">
                    <div className="toggle-info">
                      <span className="toggle-label">Grabación automática</span>
                      <span className="toggle-desc">Grabar todas las llamadas automáticamente</span>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={configAudio.grabacionAuto}
                        onChange={(e) => setConfigAudio({...configAudio, grabacionAuto: e.target.checked})}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                {/* Cuenta SIP */}
                <div className="config-section">
                  <h3>
                    <FiPhone />
                    Cuenta SIP / FreePBX
                  </h3>

                  <div className="sip-status conectado">
                    <div className="status-indicator"></div>
                    <span>Conectado a FreePBX</span>
                  </div>

                  <div className="config-group">
                    <label>Extensión</label>
                    <input type="text" value="1001" disabled />
                  </div>

                  <div className="config-group">
                    <label>Servidor</label>
                    <input type="text" value="pbx.hablagt.com" disabled />
                  </div>

                  <button className="btn-secondary">
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
