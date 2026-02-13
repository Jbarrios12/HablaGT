import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers,
  FiPlus,
  FiSearch,
  FiX,
  FiPhone,
  FiMail,
  FiMapPin,
  FiEdit2,
  FiTrash2,
  FiUser,
  FiTag,
  FiBriefcase,
  FiCheck,
  FiUpload,
  FiDownload,
  FiMessageSquare,
  FiClock,
  FiPhoneCall,
  FiPhoneIncoming,
  FiPhoneOutgoing,
  FiSettings
} from 'react-icons/fi';
import './Contactos.css';

// Datos de ejemplo - Contactos
const contactosData = [
  {
    id: 1,
    nombre: 'Carlos Mendoza',
    empresa: 'Tecnología GT',
    telefonoPrincipal: '+502 5555-1234',
    telefonoMovil: '+502 4444-5678',
    telefonoTrabajo: '',
    email: 'carlos@tecnologiagt.com',
    direccion: 'Zona 10, Guatemala',
    notas: 'Cliente frecuente, preferencia horario mañana',
    etiquetas: ['cliente', 'vip'],
    fechaCreacion: '2024-01-10',
    ultimoContacto: '2024-01-15 09:23'
  },
  {
    id: 2,
    nombre: 'María Fernández',
    empresa: 'Comercial ABC',
    telefonoPrincipal: '+502 5555-2345',
    telefonoMovil: '',
    telefonoTrabajo: '+502 2222-3456',
    email: 'maria@comercialabc.com',
    direccion: 'Zona 4, Guatemala',
    notas: '',
    etiquetas: ['cliente'],
    fechaCreacion: '2024-01-08',
    ultimoContacto: '2024-01-14 14:30'
  },
  {
    id: 3,
    nombre: 'Roberto Juárez',
    empresa: 'Distribuidora del Sur',
    telefonoPrincipal: '+502 5555-3456',
    telefonoMovil: '+502 3333-4567',
    telefonoTrabajo: '',
    email: 'roberto@delsur.com',
    direccion: 'Escuintla',
    notas: 'Proveedor de materiales',
    etiquetas: ['proveedor'],
    fechaCreacion: '2024-01-05',
    ultimoContacto: '2024-01-12 11:15'
  },
  {
    id: 4,
    nombre: 'Ana García',
    empresa: '',
    telefonoPrincipal: '+502 5555-4567',
    telefonoMovil: '+502 4444-5678',
    telefonoTrabajo: '',
    email: 'ana.garcia@gmail.com',
    direccion: '',
    notas: 'Contacto personal',
    etiquetas: ['personal'],
    fechaCreacion: '2024-01-03',
    ultimoContacto: '2024-01-10 16:45'
  },
  {
    id: 5,
    nombre: 'Luis Pérez',
    empresa: 'Soporte Técnico Pro',
    telefonoPrincipal: '+502 5555-5678',
    telefonoMovil: '',
    telefonoTrabajo: '+502 2222-6789',
    email: 'luis@soportepro.com',
    direccion: 'Zona 12, Guatemala',
    notas: 'Servicio técnico de equipos',
    etiquetas: ['proveedor', 'vip'],
    fechaCreacion: '2024-01-01',
    ultimoContacto: '2024-01-13 10:00'
  },
  {
    id: 6,
    nombre: 'Sandra López',
    empresa: 'Importadora Central',
    telefonoPrincipal: '+502 5555-6789',
    telefonoMovil: '+502 4444-7890',
    telefonoTrabajo: '',
    email: 'sandra@importadoracentral.com',
    direccion: 'Zona 13, Guatemala',
    notas: 'Cliente mayorista',
    etiquetas: ['cliente', 'vip'],
    fechaCreacion: '2023-12-20',
    ultimoContacto: '2024-01-15 08:30'
  },
];

// Historial de llamadas de ejemplo
const historialLlamadas = [
  { id: 1, contactoId: 1, tipo: 'entrante', fecha: '2024-01-15 09:23', duracion: '05:32', agente: 'Juan Pérez' },
  { id: 2, contactoId: 1, tipo: 'saliente', fecha: '2024-01-14 11:15', duracion: '03:45', agente: 'María García' },
  { id: 3, contactoId: 1, tipo: 'entrante', fecha: '2024-01-12 14:30', duracion: '08:20', agente: 'Juan Pérez' },
  { id: 4, contactoId: 2, tipo: 'saliente', fecha: '2024-01-14 14:30', duracion: '02:15', agente: 'Carlos López' },
  { id: 5, contactoId: 3, tipo: 'entrante', fecha: '2024-01-12 11:15', duracion: '06:40', agente: 'Ana Martínez' },
];

const etiquetasDefault = {
  cliente: { label: 'Cliente', color: '#0ea5e9' },
  proveedor: { label: 'Proveedor', color: '#8b5cf6' },
  vip: { label: 'VIP', color: '#f59e0b' },
  personal: { label: 'Personal', color: '#10b981' },
};

const coloresDisponibles = [
  '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899',
  '#ef4444', '#f59e0b', '#10b981', '#14b8a6',
  '#06b6d4', '#3b82f6', '#a855f7', '#f97316'
];

const Contactos = () => {
  const [contactos, setContactos] = useState(contactosData);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('todos');
  const [modalContacto, setModalContacto] = useState({ open: false, modo: 'crear', data: null });
  const [contactoDetalle, setContactoDetalle] = useState(null);

  // Estado para categorías/etiquetas
  const [etiquetasConfig, setEtiquetasConfig] = useState(etiquetasDefault);
  const [modalCategorias, setModalCategorias] = useState(false);

  // Filtrar contactos
  const contactosFiltrados = contactos.filter(contacto => {
    const matchBusqueda =
      contacto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      contacto.empresa.toLowerCase().includes(busqueda.toLowerCase()) ||
      contacto.telefonoPrincipal.includes(busqueda) ||
      contacto.email.toLowerCase().includes(busqueda.toLowerCase());

    const matchEtiqueta = filtroEtiqueta === 'todos' || contacto.etiquetas.includes(filtroEtiqueta);

    return matchBusqueda && matchEtiqueta;
  });

  // Contar por etiqueta
  const contarPorEtiqueta = (etiqueta) => {
    if (etiqueta === 'todos') return contactos.length;
    return contactos.filter(c => c.etiquetas.includes(etiqueta)).length;
  };

  // Handlers
  const handleGuardarContacto = (data) => {
    if (modalContacto.modo === 'crear') {
      const nuevoContacto = {
        ...data,
        id: Date.now(),
        fechaCreacion: new Date().toISOString().split('T')[0],
        ultimoContacto: null
      };
      setContactos([nuevoContacto, ...contactos]);
    } else {
      setContactos(contactos.map(c => c.id === data.id ? data : c));
      if (contactoDetalle?.id === data.id) {
        setContactoDetalle(data);
      }
    }
    setModalContacto({ open: false, modo: 'crear', data: null });
  };

  const handleEliminarContacto = (id) => {
    if (confirm('¿Estás seguro de eliminar este contacto?')) {
      setContactos(contactos.filter(c => c.id !== id));
      if (contactoDetalle?.id === id) {
        setContactoDetalle(null);
      }
    }
  };

  const handleLlamar = (telefono) => {
    // Aquí se integraría con el Softphone
    console.log('Llamando a:', telefono);
    alert(`Iniciando llamada a ${telefono}\n(Integración con Softphone pendiente)`);
  };

  const getHistorialContacto = (contactoId) => {
    return historialLlamadas.filter(h => h.contactoId === contactoId);
  };

  // Handlers para categorías
  const handleGuardarCategoria = (key, data) => {
    setEtiquetasConfig(prev => ({
      ...prev,
      [key]: data
    }));
  };

  const handleEliminarCategoria = (key) => {
    // Remover la categoría de todos los contactos que la tengan
    setContactos(contactos.map(c => ({
      ...c,
      etiquetas: c.etiquetas.filter(e => e !== key)
    })));
    // Eliminar la categoría
    const newConfig = { ...etiquetasConfig };
    delete newConfig[key];
    setEtiquetasConfig(newConfig);
    // Si estaba filtrado por esa categoría, volver a todos
    if (filtroEtiqueta === key) {
      setFiltroEtiqueta('todos');
    }
  };

  const handleAgregarCategoria = (data) => {
    const key = data.label.toLowerCase().replace(/\s+/g, '_');
    setEtiquetasConfig(prev => ({
      ...prev,
      [key]: data
    }));
  };

  return (
    <div className="contactos">
      {/* Header */}
      <div className="contactos-header">
        <div className="contactos-title">
          <FiUsers className="title-icon" />
          <div>
            <h1>Contactos</h1>
            <p>Gestiona tu directorio de contactos</p>
          </div>
        </div>
        <div className="contactos-actions-header">
          <button className="btn-secondary">
            <FiUpload />
            <span>Importar</span>
          </button>
          <button className="btn-secondary">
            <FiDownload />
            <span>Exportar</span>
          </button>
          <button
            className="btn-primary"
            onClick={() => setModalContacto({ open: true, modo: 'crear', data: null })}
          >
            <FiPlus />
            <span>Nuevo Contacto</span>
          </button>
        </div>
      </div>

      <div className="contactos-layout">
        {/* Sidebar de filtros */}
        <aside className="contactos-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-header">
              <h3>Categorías</h3>
              <button
                className="btn-config-cat"
                onClick={() => setModalCategorias(true)}
                title="Gestionar categorías"
              >
                <FiSettings />
              </button>
            </div>
            <ul className="etiquetas-list">
              <li
                className={filtroEtiqueta === 'todos' ? 'active' : ''}
                onClick={() => setFiltroEtiqueta('todos')}
              >
                <FiUsers />
                <span>Todos</span>
                <span className="count">{contarPorEtiqueta('todos')}</span>
              </li>
              {Object.entries(etiquetasConfig).map(([key, config]) => (
                <li
                  key={key}
                  className={filtroEtiqueta === key ? 'active' : ''}
                  onClick={() => setFiltroEtiqueta(key)}
                >
                  <FiTag style={{ color: config.color }} />
                  <span>{config.label}</span>
                  <span className="count">{contarPorEtiqueta(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Lista de contactos */}
        <main className="contactos-main">
          {/* Barra de búsqueda */}
          <div className="contactos-search">
            <div className="search-box">
              <FiSearch />
              <input
                type="text"
                placeholder="Buscar por nombre, empresa, teléfono o email..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button className="clear-search" onClick={() => setBusqueda('')}>
                  <FiX />
                </button>
              )}
            </div>
            <span className="results-count">
              {contactosFiltrados.length} contacto{contactosFiltrados.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Grid de contactos */}
          <div className="contactos-grid">
            <AnimatePresence>
              {contactosFiltrados.map((contacto) => (
                <motion.div
                  key={contacto.id}
                  className={`contacto-card ${contactoDetalle?.id === contacto.id ? 'selected' : ''}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                  onClick={() => setContactoDetalle(contacto)}
                >
                  <div className="contacto-avatar">
                    {contacto.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="contacto-info">
                    <h4>{contacto.nombre}</h4>
                    {contacto.empresa && (
                      <span className="contacto-empresa">
                        <FiBriefcase />
                        {contacto.empresa}
                      </span>
                    )}
                    <span className="contacto-telefono">
                      <FiPhone />
                      {contacto.telefonoPrincipal}
                    </span>
                  </div>
                  <div className="contacto-etiquetas">
                    {contacto.etiquetas.map(etiq => (
                      <span
                        key={etiq}
                        className="etiqueta-badge"
                        style={{ background: `${etiquetasConfig[etiq]?.color}20`, color: etiquetasConfig[etiq]?.color }}
                      >
                        {etiquetasConfig[etiq]?.label}
                      </span>
                    ))}
                  </div>
                  <div className="contacto-actions">
                    <button
                      className="btn-call"
                      onClick={(e) => { e.stopPropagation(); handleLlamar(contacto.telefonoPrincipal); }}
                      title="Llamar"
                    >
                      <FiPhoneCall />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {contactosFiltrados.length === 0 && (
              <div className="empty-state">
                <FiUsers />
                <p>No se encontraron contactos</p>
              </div>
            )}
          </div>
        </main>

        {/* Panel de detalle */}
        <AnimatePresence>
          {contactoDetalle && (
            <motion.aside
              className="contacto-detalle"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="detalle-header">
                <button className="btn-close" onClick={() => setContactoDetalle(null)}>
                  <FiX />
                </button>
                <div className="detalle-actions">
                  <button
                    className="btn-icon edit"
                    onClick={() => setModalContacto({ open: true, modo: 'editar', data: contactoDetalle })}
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    className="btn-icon delete"
                    onClick={() => handleEliminarContacto(contactoDetalle.id)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>

              <div className="detalle-perfil">
                <div className="detalle-avatar">
                  {contactoDetalle.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <h2>{contactoDetalle.nombre}</h2>
                {contactoDetalle.empresa && (
                  <span className="detalle-empresa">{contactoDetalle.empresa}</span>
                )}
                <div className="detalle-etiquetas">
                  {contactoDetalle.etiquetas.map(etiq => (
                    <span
                      key={etiq}
                      className="etiqueta-badge"
                      style={{ background: `${etiquetasConfig[etiq]?.color}20`, color: etiquetasConfig[etiq]?.color }}
                    >
                      {etiquetasConfig[etiq]?.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="detalle-telefonos">
                <h3>Teléfonos</h3>
                {contactoDetalle.telefonoPrincipal && (
                  <div className="telefono-item">
                    <div className="telefono-info">
                      <span className="telefono-label">Principal</span>
                      <span className="telefono-numero">{contactoDetalle.telefonoPrincipal}</span>
                    </div>
                    <button
                      className="btn-call-small"
                      onClick={() => handleLlamar(contactoDetalle.telefonoPrincipal)}
                    >
                      <FiPhoneCall />
                    </button>
                  </div>
                )}
                {contactoDetalle.telefonoMovil && (
                  <div className="telefono-item">
                    <div className="telefono-info">
                      <span className="telefono-label">Móvil</span>
                      <span className="telefono-numero">{contactoDetalle.telefonoMovil}</span>
                    </div>
                    <button
                      className="btn-call-small"
                      onClick={() => handleLlamar(contactoDetalle.telefonoMovil)}
                    >
                      <FiPhoneCall />
                    </button>
                  </div>
                )}
                {contactoDetalle.telefonoTrabajo && (
                  <div className="telefono-item">
                    <div className="telefono-info">
                      <span className="telefono-label">Trabajo</span>
                      <span className="telefono-numero">{contactoDetalle.telefonoTrabajo}</span>
                    </div>
                    <button
                      className="btn-call-small"
                      onClick={() => handleLlamar(contactoDetalle.telefonoTrabajo)}
                    >
                      <FiPhoneCall />
                    </button>
                  </div>
                )}
              </div>

              {contactoDetalle.email && (
                <div className="detalle-section">
                  <h3>Email</h3>
                  <a href={`mailto:${contactoDetalle.email}`} className="detalle-link">
                    <FiMail />
                    {contactoDetalle.email}
                  </a>
                </div>
              )}

              {contactoDetalle.direccion && (
                <div className="detalle-section">
                  <h3>Dirección</h3>
                  <p className="detalle-text">
                    <FiMapPin />
                    {contactoDetalle.direccion}
                  </p>
                </div>
              )}

              {contactoDetalle.notas && (
                <div className="detalle-section">
                  <h3>Notas</h3>
                  <p className="detalle-notas">{contactoDetalle.notas}</p>
                </div>
              )}

              {/* Historial de llamadas */}
              <div className="detalle-historial">
                <h3>
                  <FiClock />
                  Historial de Llamadas
                </h3>
                <div className="historial-list">
                  {getHistorialContacto(contactoDetalle.id).length > 0 ? (
                    getHistorialContacto(contactoDetalle.id).map(llamada => (
                      <div key={llamada.id} className="historial-item">
                        <div className={`historial-icon ${llamada.tipo}`}>
                          {llamada.tipo === 'entrante' ? <FiPhoneIncoming /> : <FiPhoneOutgoing />}
                        </div>
                        <div className="historial-info">
                          <span className="historial-fecha">{llamada.fecha}</span>
                          <span className="historial-meta">
                            {llamada.duracion} · {llamada.agente}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="historial-empty">Sin historial de llamadas</p>
                  )}
                </div>
              </div>

              <div className="detalle-footer">
                <span>Creado: {contactoDetalle.fechaCreacion}</span>
                {contactoDetalle.ultimoContacto && (
                  <span>Último contacto: {contactoDetalle.ultimoContacto}</span>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Contacto */}
      <ModalContacto
        isOpen={modalContacto.open}
        modo={modalContacto.modo}
        data={modalContacto.data}
        etiquetasConfig={etiquetasConfig}
        onClose={() => setModalContacto({ open: false, modo: 'crear', data: null })}
        onSave={handleGuardarContacto}
      />

      {/* Modal Categorías */}
      <ModalCategorias
        isOpen={modalCategorias}
        categorias={etiquetasConfig}
        onClose={() => setModalCategorias(false)}
        onAgregar={handleAgregarCategoria}
        onEditar={handleGuardarCategoria}
        onEliminar={handleEliminarCategoria}
      />
    </div>
  );
};

// Componente Modal para Contactos
const ModalContacto = ({ isOpen, modo, data, etiquetasConfig, onClose, onSave }) => {
  const [form, setForm] = useState({
    nombre: '',
    empresa: '',
    telefonoPrincipal: '',
    telefonoMovil: '',
    telefonoTrabajo: '',
    email: '',
    direccion: '',
    notas: '',
    etiquetas: []
  });

  useEffect(() => {
    if (data) {
      setForm(data);
    } else {
      setForm({
        nombre: '',
        empresa: '',
        telefonoPrincipal: '',
        telefonoMovil: '',
        telefonoTrabajo: '',
        email: '',
        direccion: '',
        notas: '',
        etiquetas: []
      });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, id: data?.id });
  };

  const toggleEtiqueta = (etiqueta) => {
    if (form.etiquetas.includes(etiqueta)) {
      setForm({ ...form, etiquetas: form.etiquetas.filter(e => e !== etiqueta) });
    } else {
      setForm({ ...form, etiquetas: [...form.etiquetas, etiqueta] });
    }
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
          className="modal-content modal-contacto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{modo === 'crear' ? 'Nuevo Contacto' : 'Editar Contacto'}</h2>
            <button className="modal-close" onClick={onClose}>
              <FiX />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label>
                  <FiUser />
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre del contacto"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <FiBriefcase />
                  Empresa
                </label>
                <input
                  type="text"
                  value={form.empresa}
                  onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="form-section-title">Teléfonos</div>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label>Principal *</label>
                <input
                  type="tel"
                  value={form.telefonoPrincipal}
                  onChange={(e) => setForm({ ...form, telefonoPrincipal: e.target.value })}
                  placeholder="+502 5555-1234"
                  required
                />
              </div>
              <div className="form-group">
                <label>Móvil</label>
                <input
                  type="tel"
                  value={form.telefonoMovil}
                  onChange={(e) => setForm({ ...form, telefonoMovil: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <div className="form-group">
                <label>Trabajo</label>
                <input
                  type="tel"
                  value={form.telefonoTrabajo}
                  onChange={(e) => setForm({ ...form, telefonoTrabajo: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  <FiMail />
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div className="form-group">
                <label>
                  <FiMapPin />
                  Dirección
                </label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                <FiTag />
                Etiquetas
              </label>
              <div className="etiquetas-selector">
                {Object.entries(etiquetasConfig).map(([key, config]) => (
                  <button
                    key={key}
                    type="button"
                    className={`etiqueta-btn ${form.etiquetas.includes(key) ? 'active' : ''}`}
                    style={{
                      '--etiqueta-color': config.color,
                      borderColor: form.etiquetas.includes(key) ? config.color : '#e2e8f0',
                      background: form.etiquetas.includes(key) ? `${config.color}15` : 'transparent',
                      color: form.etiquetas.includes(key) ? config.color : '#64748b'
                    }}
                    onClick={() => toggleEtiqueta(key)}
                  >
                    {form.etiquetas.includes(key) && <FiCheck />}
                    {config.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>
                <FiMessageSquare />
                Notas
              </label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Notas adicionales sobre el contacto..."
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                <FiCheck />
                {modo === 'crear' ? 'Crear Contacto' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Componente Modal para Gestionar Categorías
const ModalCategorias = ({ isOpen, categorias, onClose, onAgregar, onEditar, onEliminar }) => {
  const [nuevaCategoria, setNuevaCategoria] = useState({ label: '', color: '#0ea5e9' });
  const [editando, setEditando] = useState(null);

  const handleAgregar = () => {
    if (nuevaCategoria.label.trim()) {
      onAgregar(nuevaCategoria);
      setNuevaCategoria({ label: '', color: '#0ea5e9' });
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
          className="modal-content modal-categorias"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>Gestionar Categorías</h2>
            <button className="modal-close" onClick={onClose}>
              <FiX />
            </button>
          </div>

          <div className="modal-body">
            {/* Lista de categorías existentes */}
            <div className="categorias-lista">
              {Object.entries(categorias).map(([key, config]) => (
                <div key={key} className="categoria-item">
                  {editando?.key === key ? (
                    <>
                      <input
                        type="text"
                        value={editando.label}
                        onChange={(e) => setEditando({ ...editando, label: e.target.value })}
                        className="categoria-input"
                      />
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
                      <div className="categoria-actions">
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
                        className="categoria-color"
                        style={{ background: config.color }}
                      />
                      <span className="categoria-label">{config.label}</span>
                      <div className="categoria-actions">
                        <button
                          className="btn-icon-sm edit"
                          onClick={() => setEditando({ key, ...config })}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          className="btn-icon-sm delete"
                          onClick={() => {
                            if (confirm(`¿Eliminar la categoría "${config.label}"?`)) {
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
              ))}
            </div>

            {/* Agregar nueva categoría */}
            <div className="nueva-categoria">
              <h4>Nueva Categoría</h4>
              <div className="nueva-categoria-form">
                <input
                  type="text"
                  value={nuevaCategoria.label}
                  onChange={(e) => setNuevaCategoria({ ...nuevaCategoria, label: e.target.value })}
                  placeholder="Nombre de la categoría"
                  className="categoria-input"
                />
                <div className="colores-selector">
                  {coloresDisponibles.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-btn ${nuevaCategoria.color === color ? 'active' : ''}`}
                      style={{ background: color }}
                      onClick={() => setNuevaCategoria({ ...nuevaCategoria, color })}
                    />
                  ))}
                </div>
                <button
                  className="btn-primary"
                  onClick={handleAgregar}
                  disabled={!nuevaCategoria.label.trim()}
                >
                  <FiPlus />
                  Agregar
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

export default Contactos;
