import { useState, useEffect, useMemo } from 'react';
import { eventService, eventTypeService } from '../../services';
import { useLoading } from '../../context/LoadingContext';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCalendar,
  FiPlus,
  FiChevronLeft,
  FiChevronRight,
  FiPhone,
  FiUsers,
  FiCheckSquare,
  FiBell,
  FiClock,
  FiX,
  FiEdit2,
  FiTrash2,
  FiCheck,
  FiUser,
  FiMessageSquare,
  FiPhoneCall,
  FiList,
  FiGrid,
  FiSettings,
  FiTag
} from 'react-icons/fi';
import './Agendas.css';

// Configuración de tipos de eventos por defecto
const tiposEventoDefault = {
  callback: { label: 'Callback', icon: 'phone', color: '#0ea5e9' },
  cita: { label: 'Cita', icon: 'users', color: '#8b5cf6' },
  tarea: { label: 'Tarea', icon: 'check', color: '#10b981' },
  recordatorio: { label: 'Recordatorio', icon: 'bell', color: '#f59e0b' }
};

// Iconos disponibles para tipos de evento
const iconosDisponibles = {
  phone: { icon: FiPhone, label: 'Teléfono' },
  users: { icon: FiUsers, label: 'Personas' },
  check: { icon: FiCheckSquare, label: 'Tarea' },
  bell: { icon: FiBell, label: 'Campana' },
  calendar: { icon: FiCalendar, label: 'Calendario' },
  clock: { icon: FiClock, label: 'Reloj' },
  tag: { icon: FiTag, label: 'Etiqueta' },
  message: { icon: FiMessageSquare, label: 'Mensaje' }
};

// Colores disponibles
const coloresDisponibles = [
  '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899',
  '#ef4444', '#f59e0b', '#10b981', '#14b8a6',
  '#06b6d4', '#3b82f6', '#a855f7', '#f97316'
];

// Helper para obtener el componente de icono
const getIconComponent = (iconKey) => {
  return iconosDisponibles[iconKey]?.icon || FiCalendar;
};

// Datos de ejemplo
const eventosData = [
  {
    id: 1,
    titulo: 'Llamar a Carlos Mendoza',
    tipo: 'callback',
    fecha: '2024-01-15',
    hora: '09:00',
    contacto: 'Carlos Mendoza',
    telefono: '+502 5555-1234',
    descripcion: 'Seguimiento de cotización enviada',
    agente: 'Juan Pérez',
    estado: 'pendiente'
  },
  {
    id: 2,
    titulo: 'Reunión con equipo de ventas',
    tipo: 'cita',
    fecha: '2024-01-15',
    hora: '11:00',
    contacto: '',
    telefono: '',
    descripcion: 'Revisión de metas mensuales',
    agente: 'Juan Pérez',
    estado: 'pendiente'
  },
  {
    id: 3,
    titulo: 'Enviar propuesta a Importadora Central',
    tipo: 'tarea',
    fecha: '2024-01-16',
    hora: '14:00',
    contacto: 'Sandra López',
    telefono: '+502 5555-6789',
    descripcion: 'Propuesta de servicios actualizada',
    agente: 'María García',
    estado: 'pendiente'
  },
  {
    id: 4,
    titulo: 'Callback - María Fernández',
    tipo: 'callback',
    fecha: '2024-01-17',
    hora: '10:30',
    contacto: 'María Fernández',
    telefono: '+502 5555-2345',
    descripcion: 'Confirmar pedido',
    agente: 'Carlos López',
    estado: 'pendiente'
  },
  {
    id: 5,
    titulo: 'Revisar reportes semanales',
    tipo: 'recordatorio',
    fecha: '2024-01-18',
    hora: '16:00',
    contacto: '',
    telefono: '',
    descripcion: 'Generar y enviar reportes a gerencia',
    agente: 'Juan Pérez',
    estado: 'pendiente'
  },
  {
    id: 6,
    titulo: 'Llamada de seguimiento',
    tipo: 'callback',
    fecha: '2024-01-19',
    hora: '09:30',
    contacto: 'Roberto Juárez',
    telefono: '+502 5555-3456',
    descripcion: 'Consultar estado del pedido',
    agente: 'Ana Martínez',
    estado: 'completado'
  }
];

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const Agendas = () => {
  const { showLoading, hideLoading } = useLoading();
  const toast = useToast();
  const [eventos, setEventos] = useState([]);
  const [vista, setVista] = useState('calendario');
  const [fechaActual, setFechaActual] = useState(new Date());
  const [modalEvento, setModalEvento] = useState({ open: false, modo: 'crear', data: null });
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);

  const [tiposEvento, setTiposEvento] = useState(tiposEventoDefault);
  const [modalTipos, setModalTipos] = useState(false);

  useEffect(() => {
    const load = async () => {
      showLoading('Cargando agenda...');
      try {
        const [evs, types] = await Promise.all([
          eventService.list({ page_size: 100 }),
          eventTypeService.list(),
        ]);
        const items = evs?.items || evs || [];
        setEventos(
          items.map((e) => ({
            id: e.id,
            titulo: e.titulo,
            tipo: e.tipo,
            fecha: e.fecha ? e.fecha.split('T')[0] : '',
            hora: e.hora ? e.hora.substring(0, 5) : '',
            contacto: e.contacto || '',
            telefono: e.telefono || '',
            descripcion: e.descripcion || '',
            agente: e.agente_nombre || '',
            estado: e.estado || 'pendiente',
          }))
        );
        const typeMap = {};
        (types?.items || types || []).forEach((t) => {
          typeMap[t.key] = { label: t.label, icon: t.icon, color: t.color };
        });
        if (Object.keys(typeMap).length) setTiposEvento({ ...tiposEventoDefault, ...typeMap });
      } catch (err) {
        console.error('Error cargando agenda', err);
      } finally {
        hideLoading();
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Obtener días del mes actual
  const diasDelMes = useMemo(() => {
    const año = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    const primerDiaSemana = primerDia.getDay();

    const dias = [];

    // Días del mes anterior
    const mesAnterior = new Date(año, mes, 0);
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      dias.push({
        dia: mesAnterior.getDate() - i,
        mes: 'anterior',
        fecha: new Date(año, mes - 1, mesAnterior.getDate() - i)
      });
    }

    // Días del mes actual
    for (let i = 1; i <= diasEnMes; i++) {
      dias.push({
        dia: i,
        mes: 'actual',
        fecha: new Date(año, mes, i)
      });
    }

    // Días del mes siguiente
    const diasRestantes = 42 - dias.length;
    for (let i = 1; i <= diasRestantes; i++) {
      dias.push({
        dia: i,
        mes: 'siguiente',
        fecha: new Date(año, mes + 1, i)
      });
    }

    return dias;
  }, [fechaActual]);

  // Filtrar eventos
  const eventosFiltrados = eventos.filter(ev => {
    if (filtroTipo === 'todos') return true;
    return ev.tipo === filtroTipo;
  });

  // Obtener eventos de una fecha específica
  const getEventosDia = (fecha) => {
    const fechaStr = fecha.toISOString().split('T')[0];
    return eventosFiltrados.filter(ev => ev.fecha === fechaStr);
  };

  // Eventos próximos (lista)
  const eventosProximos = useMemo(() => {
    return eventosFiltrados
      .filter(ev => ev.estado === 'pendiente')
      .sort((a, b) => {
        const fechaA = new Date(`${a.fecha}T${a.hora}`);
        const fechaB = new Date(`${b.fecha}T${b.hora}`);
        return fechaA - fechaB;
      });
  }, [eventosFiltrados]);

  // Navegación del calendario
  const mesAnterior = () => {
    setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1));
  };

  const mesSiguiente = () => {
    setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 1));
  };

  const irAHoy = () => {
    setFechaActual(new Date());
  };

  // Handlers
  const handleGuardarEvento = async (data) => {
    showLoading(modalEvento.modo === 'crear' ? 'Creando evento...' : 'Guardando...');
    try {
      const payload = {
        titulo: data.titulo,
        tipo: data.tipo,
        fecha: data.fecha,
        hora: data.hora,
        contacto: data.contacto || '',
        telefono: data.telefono || '',
        descripcion: data.descripcion || '',
        estado: data.estado || 'pendiente',
      };
      if (modalEvento.modo === 'crear') {
        const created = await eventService.create(payload);
        const c = created?.event || created;
        setEventos([...eventos, {
          id: c.id,
          titulo: c.titulo,
          tipo: c.tipo,
          fecha: c.fecha ? c.fecha.split('T')[0] : '',
          hora: c.hora ? c.hora.substring(0, 5) : '',
          contacto: c.contacto || '',
          telefono: c.telefono || '',
          descripcion: c.descripcion || '',
          agente: c.agente_nombre || '',
          estado: c.estado || 'pendiente',
        }]);
      } else {
        const updated = await eventService.update(data.id, payload);
        const c = updated?.event || updated;
        setEventos(eventos.map((ev) => ev.id === data.id ? {
          ...ev,
          titulo: c.titulo,
          tipo: c.tipo,
          fecha: c.fecha ? c.fecha.split('T')[0] : '',
          hora: c.hora ? c.hora.substring(0, 5) : '',
          contacto: c.contacto || '',
          telefono: c.telefono || '',
          descripcion: c.descripcion || '',
          estado: c.estado || 'pendiente',
        } : ev));
      }
      setModalEvento({ open: false, modo: 'crear', data: null });
    } catch (err) {
      toast.error('Error guardando evento: ' + (err?.response?.data?.error?.message || err.message));
    } finally {
      hideLoading();
    }
  };

  const handleEliminarEvento = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este evento?')) return;
    showLoading('Eliminando...');
    try {
      await eventService.remove(id);
      setEventos(eventos.filter((ev) => ev.id !== id));
      setEventoSeleccionado(null);
    } catch (err) {
      toast.error('Error eliminando evento: ' + (err?.response?.data?.error?.message || err.message));
    } finally {
      hideLoading();
    }
  };

  const handleCompletarEvento = async (id) => {
    const ev = eventos.find((e) => e.id === id);
    if (!ev) return;
    const next = ev.estado === 'completado' ? 'pendiente' : 'completado';
    setEventos(eventos.map((e) => e.id === id ? { ...e, estado: next } : e));
    try {
      if (next === 'completado') {
        await eventService.complete(id);
      } else {
        await eventService.update(id, { ...ev, estado: next });
      }
    } catch (err) {
      console.error('completar error', err);
      setEventos(eventos.map((e) => e.id === id ? { ...e, estado: ev.estado } : e));
    }
  };

  const handleLlamar = (telefono) => {
    window.dispatchEvent(new CustomEvent('hablagt:softphone:call', { detail: { numero: telefono } }));
  };

  const handleNuevoEventoEnFecha = (fecha) => {
    setModalEvento({
      open: true,
      modo: 'crear',
      data: { fecha: fecha.toISOString().split('T')[0] }
    });
  };

  // Handlers para tipos de evento
  const handleAgregarTipo = async (data) => {
    const key = data.label.toLowerCase().replace(/\s+/g, '_');
    showLoading('Guardando tipo...');
    try {
      await eventTypeService.create({ key, label: data.label, icon: data.icon, color: data.color });
      setTiposEvento((prev) => ({ ...prev, [key]: data }));
    } catch (err) {
      toast.error('Error guardando tipo: ' + (err?.response?.data?.error?.message || err.message));
    } finally {
      hideLoading();
    }
  };

  const handleEditarTipo = async (key, data) => {
    showLoading('Guardando tipo...');
    try {
      await eventTypeService.update(key, { label: data.label, icon: data.icon, color: data.color });
      setTiposEvento((prev) => ({ ...prev, [key]: data }));
    } catch (err) {
      toast.error('Error guardando tipo: ' + (err?.response?.data?.error?.message || err.message));
    } finally {
      hideLoading();
    }
  };

  const handleEliminarTipo = async (key) => {
    showLoading('Eliminando tipo...');
    try {
      await eventTypeService.remove(key);
      setEventos(eventos.map((ev) => ev.tipo === key ? { ...ev, tipo: 'tarea' } : ev));
      const newTipos = { ...tiposEvento };
      delete newTipos[key];
      setTiposEvento(newTipos);
      if (filtroTipo === key) {
        setFiltroTipo('todos');
      }
    } catch (err) {
      toast.error('Error eliminando tipo: ' + (err?.response?.data?.error?.message || err.message));
    } finally {
      hideLoading();
    }
  };

  // Verificar si es hoy
  const esHoy = (fecha) => {
    const hoy = new Date();
    return fecha.toDateString() === hoy.toDateString();
  };

  return (
    <div className="agendas">
      {/* Header */}
      <div className="agendas-header">
        <div className="agendas-title">
          <FiCalendar className="title-icon" />
          <div>
            <h1>Agendas</h1>
            <p>Gestiona tus eventos, callbacks y tareas</p>
          </div>
        </div>
        <div className="agendas-actions-header">
          <div className="vista-toggle">
            <button
              className={vista === 'calendario' ? 'active' : ''}
              onClick={() => setVista('calendario')}
              title="Vista calendario"
            >
              <FiGrid />
            </button>
            <button
              className={vista === 'lista' ? 'active' : ''}
              onClick={() => setVista('lista')}
              title="Vista lista"
            >
              <FiList />
            </button>
          </div>
          <button
            className="btn-primary"
            onClick={() => setModalEvento({ open: true, modo: 'crear', data: null })}
          >
            <FiPlus />
            <span>Nuevo Evento</span>
          </button>
        </div>
      </div>

      {/* Filtros de tipo */}
      <div className="agendas-filtros">
        <button
          className={`filtro-btn ${filtroTipo === 'todos' ? 'active' : ''}`}
          onClick={() => setFiltroTipo('todos')}
        >
          Todos
        </button>
        {Object.entries(tiposEvento).map(([key, config]) => {
          const IconComponent = getIconComponent(config.icon);
          return (
            <button
              key={key}
              className={`filtro-btn ${filtroTipo === key ? 'active' : ''}`}
              onClick={() => setFiltroTipo(key)}
              style={{ '--filtro-color': config.color }}
            >
              <IconComponent />
              {config.label}
            </button>
          );
        })}
        <button
          className="btn-config-tipos"
          onClick={() => setModalTipos(true)}
          title="Gestionar tipos de evento"
        >
          <FiSettings />
        </button>
      </div>

      <div className={`agendas-layout ${eventoSeleccionado ? 'con-detalle' : ''}`}>
        {/* Contenido principal */}
        <main className="agendas-main">
          <AnimatePresence mode="wait">
            {vista === 'calendario' ? (
              <motion.div
                key="calendario"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="calendario-container"
              >
                {/* Navegación del calendario */}
                <div className="calendario-nav">
                  <button className="nav-btn" onClick={mesAnterior}>
                    <FiChevronLeft />
                  </button>
                  <h2>{MESES[fechaActual.getMonth()]} {fechaActual.getFullYear()}</h2>
                  <button className="nav-btn" onClick={mesSiguiente}>
                    <FiChevronRight />
                  </button>
                  <button className="btn-hoy" onClick={irAHoy}>Hoy</button>
                </div>

                {/* Calendario */}
                <div className="calendario">
                  <div className="calendario-inner">
                    {/* Header días */}
                    <div className="calendario-header">
                      {DIAS_SEMANA.map(dia => (
                        <div key={dia} className="dia-header">{dia}</div>
                      ))}
                    </div>

                    {/* Grid de días */}
                    <div className="calendario-grid">
                    {diasDelMes.map((diaInfo, index) => {
                      const eventosDia = getEventosDia(diaInfo.fecha);
                      return (
                        <div
                          key={index}
                          className={`dia-cell ${diaInfo.mes !== 'actual' ? 'otro-mes' : ''} ${esHoy(diaInfo.fecha) ? 'hoy' : ''}`}
                          onClick={() => handleNuevoEventoEnFecha(diaInfo.fecha)}
                        >
                          <span className="dia-numero">{diaInfo.dia}</span>
                          <div className="dia-eventos">
                            {eventosDia.slice(0, 3).map(ev => (
                              <div
                                key={ev.id}
                                className={`evento-mini ${ev.estado}`}
                                style={{ '--evento-color': tiposEvento[ev.tipo]?.color }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEventoSeleccionado(ev);
                                }}
                              >
                                <span className="evento-hora">{ev.hora}</span>
                                <span className="evento-titulo">{ev.titulo}</span>
                              </div>
                            ))}
                            {eventosDia.length > 3 && (
                              <span className="eventos-mas">+{eventosDia.length - 3} más</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="lista"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="lista-container"
              >
                <h2>Eventos Próximos</h2>
                <div className="eventos-lista">
                  {eventosProximos.length > 0 ? (
                    eventosProximos.map(evento => {
                      const TipoIcon = getIconComponent(tiposEvento[evento.tipo]?.icon);
                      return (
                        <motion.div
                          key={evento.id}
                          className={`evento-card ${evento.estado} ${eventoSeleccionado?.id === evento.id ? 'selected' : ''}`}
                          layout
                          onClick={() => setEventoSeleccionado(evento)}
                        >
                          <div
                            className="evento-tipo-icon"
                            style={{ background: `${tiposEvento[evento.tipo]?.color}20`, color: tiposEvento[evento.tipo]?.color }}
                          >
                            <TipoIcon />
                          </div>
                          <div className="evento-info">
                            <h4>{evento.titulo}</h4>
                            <div className="evento-meta">
                              <span className="evento-fecha">
                                <FiCalendar />
                                {evento.fecha}
                              </span>
                              <span className="evento-hora-lista">
                                <FiClock />
                                {evento.hora}
                              </span>
                            </div>
                            {evento.contacto && (
                              <span className="evento-contacto">
                                <FiUser />
                                {evento.contacto}
                              </span>
                            )}
                          </div>
                          <div className="evento-actions">
                            {evento.telefono && (
                              <button
                                className="btn-call-sm"
                                onClick={(e) => { e.stopPropagation(); handleLlamar(evento.telefono); }}
                                title="Llamar"
                              >
                                <FiPhoneCall />
                              </button>
                            )}
                            <button
                              className={`btn-check ${evento.estado === 'completado' ? 'checked' : ''}`}
                              onClick={(e) => { e.stopPropagation(); handleCompletarEvento(evento.id); }}
                              title={evento.estado === 'completado' ? 'Marcar pendiente' : 'Marcar completado'}
                            >
                              <FiCheck />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="empty-state">
                      <FiCalendar />
                      <p>No hay eventos próximos</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Panel de detalle del evento */}
        <AnimatePresence>
          {eventoSeleccionado && (
            <motion.aside
              className="evento-detalle"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="detalle-header">
                <button className="btn-close" onClick={() => setEventoSeleccionado(null)}>
                  <FiX />
                </button>
                <div className="detalle-actions">
                  <button
                    className="btn-icon edit"
                    onClick={() => {
                      setModalEvento({ open: true, modo: 'editar', data: eventoSeleccionado });
                      setEventoSeleccionado(null);
                    }}
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    className="btn-icon delete"
                    onClick={() => handleEliminarEvento(eventoSeleccionado.id)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>

              <div className="detalle-content">
                <div
                  className="detalle-tipo"
                  style={{ background: `${tiposEvento[eventoSeleccionado.tipo]?.color}20`, color: tiposEvento[eventoSeleccionado.tipo]?.color }}
                >
                  {(() => {
                    const TipoIcon = getIconComponent(tiposEvento[eventoSeleccionado.tipo]?.icon);
                    return <TipoIcon />;
                  })()}
                  {tiposEvento[eventoSeleccionado.tipo]?.label}
                </div>

                <h2>{eventoSeleccionado.titulo}</h2>

                <div className="detalle-fecha-hora">
                  <div className="info-item">
                    <FiCalendar />
                    <span>{eventoSeleccionado.fecha}</span>
                  </div>
                  <div className="info-item">
                    <FiClock />
                    <span>{eventoSeleccionado.hora}</span>
                  </div>
                </div>

                {eventoSeleccionado.contacto && (
                  <div className="detalle-section">
                    <h4>Contacto</h4>
                    <div className="contacto-info">
                      <span className="contacto-nombre">
                        <FiUser />
                        {eventoSeleccionado.contacto}
                      </span>
                      {eventoSeleccionado.telefono && (
                        <div className="contacto-telefono">
                          <span>{eventoSeleccionado.telefono}</span>
                          <button
                            className="btn-call"
                            onClick={() => handleLlamar(eventoSeleccionado.telefono)}
                          >
                            <FiPhoneCall />
                            Llamar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {eventoSeleccionado.descripcion && (
                  <div className="detalle-section">
                    <h4>Descripción</h4>
                    <p>{eventoSeleccionado.descripcion}</p>
                  </div>
                )}

                <div className="detalle-section">
                  <h4>Asignado a</h4>
                  <span className="agente-badge">{eventoSeleccionado.agente}</span>
                </div>

                <div className="detalle-estado">
                  <button
                    className={`btn-estado ${eventoSeleccionado.estado}`}
                    onClick={() => handleCompletarEvento(eventoSeleccionado.id)}
                  >
                    <FiCheck />
                    {eventoSeleccionado.estado === 'completado' ? 'Completado' : 'Marcar como completado'}
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Evento */}
      <ModalEvento
        isOpen={modalEvento.open}
        modo={modalEvento.modo}
        data={modalEvento.data}
        tiposEvento={tiposEvento}
        onClose={() => setModalEvento({ open: false, modo: 'crear', data: null })}
        onSave={handleGuardarEvento}
      />

      {/* Modal Tipos de Evento */}
      <ModalTipos
        isOpen={modalTipos}
        tipos={tiposEvento}
        onClose={() => setModalTipos(false)}
        onAgregar={handleAgregarTipo}
        onEditar={handleEditarTipo}
        onEliminar={handleEliminarTipo}
      />
    </div>
  );
};

// Componente Modal para Eventos
const ModalEvento = ({ isOpen, modo, data, tiposEvento, onClose, onSave }) => {
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'callback',
    fecha: '',
    hora: '09:00',
    contacto: '',
    telefono: '',
    descripcion: '',
    agente: 'Juan Pérez',
    estado: 'pendiente'
  });

  useEffect(() => {
    if (data) {
      setForm({ ...form, ...data });
    } else {
      const hoy = new Date().toISOString().split('T')[0];
      setForm({
        titulo: '',
        tipo: 'callback',
        fecha: hoy,
        hora: '09:00',
        contacto: '',
        telefono: '',
        descripcion: '',
        agente: 'Juan Pérez',
        estado: 'pendiente'
      });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, id: data?.id });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-content modal-evento"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{modo === 'crear' ? 'Nuevo Evento' : 'Editar Evento'}</h2>
            <button className="modal-close" onClick={onClose}>
              <FiX />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label>Título *</label>
              <input
                type="text"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Título del evento"
                required
              />
            </div>

            <div className="form-group">
              <label>Tipo de evento</label>
              <div className="tipo-selector">
                {Object.entries(tiposEvento).map(([key, config]) => {
                  const IconComponent = getIconComponent(config.icon);
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`tipo-btn ${form.tipo === key ? 'active' : ''}`}
                      style={{ '--tipo-color': config.color }}
                      onClick={() => setForm({ ...form, tipo: key })}
                    >
                      <IconComponent />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  <FiCalendar />
                  Fecha *
                </label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <FiClock />
                  Hora *
                </label>
                <input
                  type="time"
                  value={form.hora}
                  onChange={(e) => setForm({ ...form, hora: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  <FiUser />
                  Contacto
                </label>
                <input
                  type="text"
                  value={form.contacto}
                  onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                  placeholder="Nombre del contacto"
                />
              </div>

              <div className="form-group">
                <label>
                  <FiPhone />
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="+502 5555-1234"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Agente asignado</label>
              <select
                value={form.agente}
                onChange={(e) => setForm({ ...form, agente: e.target.value })}
              >
                <option value="Juan Pérez">Juan Pérez</option>
                <option value="María García">María García</option>
                <option value="Carlos López">Carlos López</option>
                <option value="Ana Martínez">Ana Martínez</option>
              </select>
            </div>

            <div className="form-group">
              <label>
                <FiMessageSquare />
                Descripción
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Detalles del evento..."
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                <FiCheck />
                {modo === 'crear' ? 'Crear Evento' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Componente Modal para Gestionar Tipos de Evento
const ModalTipos = ({ isOpen, tipos, onClose, onAgregar, onEditar, onEliminar }) => {
  const [nuevoTipo, setNuevoTipo] = useState({ label: '', icon: 'calendar', color: '#0ea5e9' });
  const [editando, setEditando] = useState(null);

  const handleAgregar = () => {
    if (nuevoTipo.label.trim()) {
      onAgregar(nuevoTipo);
      setNuevoTipo({ label: '', icon: 'calendar', color: '#0ea5e9' });
    }
  };

  const handleEditar = (key) => {
    onEditar(key, editando);
    setEditando(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-content modal-tipos"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>Tipos de Evento</h2>
            <button className="modal-close" onClick={onClose}>
              <FiX />
            </button>
          </div>

          <div className="modal-body">
            {/* Lista de tipos existentes */}
            <div className="tipos-lista">
              {Object.entries(tipos).map(([key, config]) => {
                const IconComponent = getIconComponent(config.icon);
                return (
                  <div key={key} className="tipo-item">
                    {editando?.key === key ? (
                      <>
                        <input
                          type="text"
                          value={editando.label}
                          onChange={(e) => setEditando({ ...editando, label: e.target.value })}
                          className="tipo-input"
                        />
                        <div className="iconos-mini">
                          {Object.entries(iconosDisponibles).map(([iconKey, iconConfig]) => {
                            const Icon = iconConfig.icon;
                            return (
                              <button
                                key={iconKey}
                                type="button"
                                className={`icono-btn-mini ${editando.icon === iconKey ? 'active' : ''}`}
                                onClick={() => setEditando({ ...editando, icon: iconKey })}
                                title={iconConfig.label}
                              >
                                <Icon />
                              </button>
                            );
                          })}
                        </div>
                        <div className="colores-mini">
                          {coloresDisponibles.map(color => (
                            <button
                              key={color}
                              type="button"
                              className={`color-btn-mini ${editando.color === color ? 'active' : ''}`}
                              style={{ background: color }}
                              onClick={() => setEditando({ ...editando, color })}
                            />
                          ))}
                        </div>
                        <div className="tipo-actions">
                          <button className="btn-icon-sm save" onClick={() => handleEditar(key)}>
                            <FiCheck />
                          </button>
                          <button className="btn-icon-sm cancel" onClick={() => setEditando(null)}>
                            <FiX />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span
                          className="tipo-icono"
                          style={{ background: `${config.color}20`, color: config.color }}
                        >
                          <IconComponent />
                        </span>
                        <span className="tipo-label">{config.label}</span>
                        <div className="tipo-actions">
                          <button
                            className="btn-icon-sm edit"
                            onClick={() => setEditando({ key, ...config })}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            className="btn-icon-sm delete"
                            onClick={() => {
                              if (confirm(`¿Eliminar el tipo "${config.label}"? Los eventos de este tipo se cambiarán a "Tarea".`)) {
                                onEliminar(key);
                              }
                            }}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Agregar nuevo tipo */}
            <div className="nuevo-tipo">
              <h4>Nuevo Tipo de Evento</h4>
              <div className="nuevo-tipo-form">
                <input
                  type="text"
                  value={nuevoTipo.label}
                  onChange={(e) => setNuevoTipo({ ...nuevoTipo, label: e.target.value })}
                  placeholder="Nombre del tipo"
                  className="tipo-input"
                />

                <div className="selector-group">
                  <label>Icono</label>
                  <div className="iconos-selector">
                    {Object.entries(iconosDisponibles).map(([iconKey, iconConfig]) => {
                      const Icon = iconConfig.icon;
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          className={`icono-btn ${nuevoTipo.icon === iconKey ? 'active' : ''}`}
                          onClick={() => setNuevoTipo({ ...nuevoTipo, icon: iconKey })}
                          title={iconConfig.label}
                        >
                          <Icon />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="selector-group">
                  <label>Color</label>
                  <div className="colores-selector">
                    {coloresDisponibles.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`color-btn ${nuevoTipo.color === color ? 'active' : ''}`}
                        style={{ background: color }}
                        onClick={() => setNuevoTipo({ ...nuevoTipo, color })}
                      />
                    ))}
                  </div>
                </div>

                <button
                  className="btn-primary"
                  onClick={handleAgregar}
                  disabled={!nuevoTipo.label.trim()}
                >
                  <FiPlus />
                  Agregar Tipo
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Agendas;
