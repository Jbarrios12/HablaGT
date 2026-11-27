import { useState, useEffect, useMemo, useCallback } from 'react';
import { eventService, eventTypeService, contactService, agentAdminService } from '../../services';
import { useAuth } from '../../context/AuthContext';
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
import DatePicker from '../DatePicker';
import TimePicker from '../TimePicker';
import ContactAutocomplete from '../ContactAutocomplete';
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

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Fecha local "AAAA-MM-DD". toISOString() da la fecha en UTC: en Guatemala,
// después de las 18:00 ya es el día siguiente y el evento caía en otro día.
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoyStr = () => ymd(new Date());
const sumarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const fechaLarga = (s) => {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};
const apiError = (e, fallback) => e?.response?.data?.error?.message || e?.message || fallback;

const desdeApi = (e) => ({
  id: e.id,
  titulo: e.titulo,
  tipo: e.tipo,
  fecha: e.fecha ? e.fecha.split('T')[0] : '',
  hora: e.hora ? e.hora.substring(0, 5) : '',
  contacto: e.contacto || '',
  telefono: e.telefono || '',
  descripcion: e.descripcion || '',
  agente_id: e.agente_id || '',
  agente: e.agente_nombre || '',
  estado: e.estado || 'pendiente',
});

// Siempre se envía el agente: el backend lo reemplaza en cada edición y las
// llamadas de recordatorio se saltan los eventos sin agente.
const aPayload = (ev) => ({
  titulo: ev.titulo,
  tipo: ev.tipo,
  fecha: ev.fecha,
  hora: ev.hora,
  contacto: ev.contacto || '',
  telefono: ev.telefono || '',
  descripcion: ev.descripcion || '',
  agente_id: ev.agente_id || '',
  agente_nombre: ev.agente || '',
  estado: ev.estado || 'pendiente',
});

const Agendas = () => {
  const { showLoading, hideLoading } = useLoading();
  const toast = useToast();
  const { user } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [vista, setVista] = useState('calendario');
  const [fechaActual, setFechaActual] = useState(new Date());
  const [modalEvento, setModalEvento] = useState({ open: false, modo: 'crear', data: null });
  const [filtroTipo, setFiltroTipo] = useState('todos');
  // Se guarda el id: el panel muestra siempre el estado actual del evento.
  const [seleccionadoId, setSeleccionadoId] = useState(null);
  const eventoSeleccionado = eventos.find((e) => e.id === seleccionadoId) || null;
  const setEventoSeleccionado = (ev) => setSeleccionadoId(ev ? ev.id : null);

  const [tiposEvento, setTiposEvento] = useState(tiposEventoDefault);
  const [modalTipos, setModalTipos] = useState(false);
  const [agentes, setAgentes] = useState([]);

  // Tipos de evento y agentes (una vez).
  useEffect(() => {
    eventTypeService.list()
      .then((types) => {
        const typeMap = {};
        (types?.items || types || []).forEach((t) => {
          typeMap[t.key] = { label: t.label, icon: t.icon, color: t.color };
        });
        if (Object.keys(typeMap).length) setTiposEvento({ ...tiposEventoDefault, ...typeMap });
      })
      .catch(() => { /* quedan los tipos por defecto */ });
    agentAdminService.list({ page_size: 200 })
      .then((res) => setAgentes((res?.items || res || []).filter((a) => a.is_active !== false)))
      .catch(() => setAgentes([]));
  }, []);

  // Rango visible: el calendario pide las 6 semanas que muestra (todos los
  // estados); la lista, los pendientes desde hace 60 días (los vencidos
  // también se ven). Antes se pedían solo 100 pendientes: los completados
  // desaparecían del calendario.
  const rango = useMemo(() => {
    if (vista === 'lista') {
      return { fecha_inicio: ymd(sumarDias(new Date(), -60)), estado: 'pendiente' };
    }
    const primero = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1);
    const inicio = sumarDias(primero, -primero.getDay());
    return { fecha_inicio: ymd(inicio), fecha_fin: ymd(sumarDias(inicio, 41)) };
  }, [vista, fechaActual]);

  const cargarEventos = useCallback(async () => {
    showLoading('Cargando agenda...');
    try {
      const evs = await eventService.list({ page_size: 500, ...rango });
      setEventos((evs?.items || evs || []).map(desdeApi));
    } catch (err) {
      toast.error(apiError(err, 'No se pudo cargar la agenda'));
    } finally {
      hideLoading();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rango]);

  useEffect(() => { cargarEventos(); }, [cargarEventos]);

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
    const fechaStr = ymd(fecha);
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
  const normalizarTelefono = (t) => (t || '').replace(/\D/g, '');

  // Si el evento trae un contacto+teléfono que no existe todavía en Contactos,
  // lo agrega al directorio. Si el teléfono ya está registrado (con este
  // nombre u otro), no crea un duplicado — el evento simplemente queda
  // vinculado por teléfono al contacto que ya existe.
  const sincronizarContacto = async (nombre, telefono) => {
    const tel = (telefono || '').trim();
    const nom = (nombre || '').trim();
    if (!tel || !nom) return;
    try {
      // Busca por los dígitos del teléfono en todos los contactos (antes solo
      // revisaba los primeros 200 y podía duplicar).
      const telNorm = normalizarTelefono(tel);
      const lista = await contactService.list({ q: telNorm, page_size: 20 });
      const yaExiste = (lista?.items || []).some((c) =>
        [c.telefono_principal, c.telefono_movil, c.telefono_trabajo].some((t) => normalizarTelefono(t) === telNorm));
      if (!yaExiste) {
        await contactService.create({ nombre: nom, telefono_principal: tel });
        toast.success(`Se agregó "${nom}" a tus contactos`);
      }
    } catch {
      // no bloquear el guardado del evento si esta sincronización falla
    }
  };

  const handleGuardarEvento = async (data) => {
    showLoading(modalEvento.modo === 'crear' ? 'Creando evento...' : 'Guardando...');
    try {
      const payload = aPayload(data);
      if (modalEvento.modo === 'crear') {
        const created = await eventService.create(payload);
        setEventos((prev) => [...prev, desdeApi(created?.event || created)]);
      } else {
        const updated = await eventService.update(data.id, payload);
        setEventos((prev) => prev.map((ev) => (ev.id === data.id ? desdeApi(updated?.event || updated) : ev)));
      }
      await sincronizarContacto(payload.contacto, payload.telefono);
      setModalEvento({ open: false, modo: 'crear', data: null });
      toast.success(modalEvento.modo === 'crear' ? 'Evento creado' : 'Cambios guardados');
    } catch (err) {
      toast.error('Error guardando evento: ' + apiError(err, ''));
    } finally {
      hideLoading();
    }
  };

  const handleEliminarEvento = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este evento?')) return;
    showLoading('Eliminando...');
    try {
      await eventService.remove(id);
      setEventos((prev) => prev.filter((ev) => ev.id !== id));
      setEventoSeleccionado(null);
    } catch (err) {
      toast.error('Error eliminando evento: ' + apiError(err, ''));
    } finally {
      hideLoading();
    }
  };

  const handleCompletarEvento = async (id) => {
    const ev = eventos.find((e) => e.id === id);
    if (!ev) return;
    const next = ev.estado === 'completado' ? 'pendiente' : 'completado';
    const cambiar = (estado) => setEventos((prev) => prev.map((e) => (e.id === id ? { ...e, estado } : e)));
    cambiar(next);
    try {
      if (next === 'completado') {
        await eventService.complete(id);
      } else {
        await eventService.update(id, aPayload({ ...ev, estado: next }));
      }
    } catch (err) {
      cambiar(ev.estado);
      toast.error(apiError(err, 'No se pudo cambiar el estado del evento'));
    }
  };

  const handleLlamar = (telefono) => {
    window.dispatchEvent(new CustomEvent('hablagt:softphone:call', { detail: { numero: telefono } }));
  };

  const handleNuevoEventoEnFecha = (fecha) => {
    setModalEvento({
      open: true,
      modo: 'crear',
      data: { fecha: ymd(fecha) }
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
      setEventos((prev) => prev.map((ev) => (ev.tipo === key ? { ...ev, tipo: 'tarea' } : ev)));
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
                <h2>Eventos pendientes</h2>
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
                                {fechaLarga(evento.fecha)}
                              </span>
                              {evento.fecha < hoyStr() && <span className="evento-vencido">Vencido</span>}
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
                      <p>No hay eventos pendientes</p>
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
                    <span>{fechaLarga(eventoSeleccionado.fecha)}</span>
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
                  {eventoSeleccionado.agente
                    ? <span className="agente-badge">{eventoSeleccionado.agente}</span>
                    : <p className="detalle-sin-asignar">Sin asignar</p>}
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
        agentes={agentes}
        usuario={user}
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
const ModalEvento = ({ isOpen, modo, data, tiposEvento, agentes, usuario, onClose, onSave }) => {
  // Por defecto el evento queda a nombre de quien lo crea.
  const vacio = () => ({
    titulo: '',
    tipo: 'callback',
    fecha: hoyStr(),
    hora: '09:00',
    contacto: '',
    telefono: '',
    descripcion: '',
    agente_id: usuario?.id || '',
    agente: usuario?.nombre || '',
    estado: 'pendiente',
  });
  const [form, setForm] = useState(vacio);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...vacio(), ...(data || {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, data]);

  // El agente guardado puede no estar en la lista (inactivo o borrado).
  const opcionesAgente = useMemo(() => {
    const list = agentes.map((a) => ({ id: a.id, nombre: a.full_name || a.username }));
    if (form.agente_id && !list.some((a) => a.id === form.agente_id)) {
      list.unshift({ id: form.agente_id, nombre: form.agente || 'Agente actual' });
    }
    if (!list.length && usuario?.id) list.push({ id: usuario.id, nombre: usuario.nombre || 'Yo' });
    return list;
  }, [agentes, form.agente_id, form.agente, usuario]);

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
                <DatePicker
                  value={form.fecha}
                  onChange={(fecha) => setForm({ ...form, fecha })}
                />
              </div>

              <div className="form-group">
                <label>
                  <FiClock />
                  Hora *
                </label>
                <TimePicker
                  value={form.hora}
                  onChange={(hora) => setForm({ ...form, hora })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  <FiUser />
                  Contacto
                </label>
                <ContactAutocomplete
                  value={form.contacto}
                  onChange={(contacto) => setForm({ ...form, contacto })}
                  onSelect={(c) => setForm({ ...form, contacto: c.nombre, telefono: c.telefono_principal || c.telefono_movil || c.telefono_trabajo || form.telefono })}
                  placeholder="Nombre del contacto"
                />
              </div>

              <div className="form-group">
                <label>
                  <FiPhone />
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="+502 5555-1234"
                  required
                  pattern="(?:\D*\d){4,}\D*"
                  title="Al menos 4 dígitos. Con este número la IA reconoce al cliente cuando llama."
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="evento-agente">Agente asignado</label>
              <select
                id="evento-agente"
                value={form.agente_id}
                onChange={(e) => {
                  const a = opcionesAgente.find((x) => x.id === e.target.value);
                  setForm({ ...form, agente_id: e.target.value, agente: a?.nombre || '' });
                }}
              >
                <option value="">Sin asignar (no recibe llamada de recordatorio)</option>
                {opcionesAgente.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
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
