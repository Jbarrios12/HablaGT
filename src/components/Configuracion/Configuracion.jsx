import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSettings,
  FiPhone,
  FiUsers,
  FiSliders,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiX,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiUser,
  FiMail,
  FiLock,
  FiHash,
  FiUserCheck,
  FiAlertCircle
} from 'react-icons/fi';
import './Configuracion.css';

// Datos de ejemplo - Extensiones
const extensionesData = [
  { id: 1, extension: '1001', nombre: 'Recepción Principal', tipo: 'fija', estado: 'activa', agente: 'Juan Pérez' },
  { id: 2, extension: '1002', nombre: 'Ventas 1', tipo: 'softphone', estado: 'activa', agente: 'María García' },
  { id: 3, extension: '1003', nombre: 'Soporte Técnico', tipo: 'softphone', estado: 'activa', agente: 'Carlos López' },
  { id: 4, extension: '1004', nombre: 'Sala Conferencias', tipo: 'fija', estado: 'activa', agente: null },
  { id: 5, extension: '1005', nombre: 'Ventas 2', tipo: 'softphone', estado: 'inactiva', agente: null },
  { id: 6, extension: '1006', nombre: 'Gerencia', tipo: 'fija', estado: 'activa', agente: 'Ana Martínez' },
];

// Datos de ejemplo - Agentes
const agentesData = [
  { id: 1, usuario: 'jperez', nombre: 'Juan Pérez', email: 'juan@empresa.com', rol: 'admin', extension: '1001', estado: 'activo' },
  { id: 2, usuario: 'mgarcia', nombre: 'María García', email: '', rol: 'agente', extension: '1002', estado: 'activo' },
  { id: 3, usuario: 'clopez', nombre: 'Carlos López', email: 'carlos@empresa.com', rol: 'agente', extension: '1003', estado: 'activo' },
  { id: 4, usuario: 'amartinez', nombre: 'Ana Martínez', email: '', rol: 'supervisor', extension: '1006', estado: 'activo' },
  { id: 5, usuario: 'rrodriguez', nombre: 'Roberto Rodríguez', email: 'roberto@empresa.com', rol: 'agente', extension: null, estado: 'inactivo' },
];

const Configuracion = () => {
  const [tabActiva, setTabActiva] = useState('extensiones');
  const [busqueda, setBusqueda] = useState('');

  // Estado para extensiones
  const [extensiones, setExtensiones] = useState(extensionesData);
  const [modalExtension, setModalExtension] = useState({ open: false, modo: 'crear', data: null });

  // Estado para agentes
  const [agentes, setAgentes] = useState(agentesData);
  const [modalAgente, setModalAgente] = useState({ open: false, modo: 'crear', data: null });

  // Extensiones disponibles (sin asignar)
  const extensionesDisponibles = extensiones.filter(ext => !ext.agente && ext.estado === 'activa');

  const tabs = [
    { id: 'extensiones', label: 'Extensiones', icon: FiPhone },
    { id: 'agentes', label: 'Agentes', icon: FiUsers },
    { id: 'general', label: 'General', icon: FiSliders },
  ];

  // Filtrar datos según búsqueda
  const extensionesFiltradas = extensiones.filter(ext =>
    ext.extension.includes(busqueda) ||
    ext.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (ext.agente && ext.agente.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const agentesFiltrados = agentes.filter(ag =>
    ag.usuario.toLowerCase().includes(busqueda.toLowerCase()) ||
    ag.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (ag.email && ag.email.toLowerCase().includes(busqueda.toLowerCase()))
  );

  // Handlers para extensiones
  const handleGuardarExtension = (data) => {
    if (modalExtension.modo === 'crear') {
      setExtensiones([...extensiones, { ...data, id: Date.now() }]);
    } else {
      setExtensiones(extensiones.map(ext => ext.id === data.id ? data : ext));
    }
    setModalExtension({ open: false, modo: 'crear', data: null });
  };

  const handleEliminarExtension = (id) => {
    if (confirm('¿Estás seguro de eliminar esta extensión?')) {
      setExtensiones(extensiones.filter(ext => ext.id !== id));
    }
  };

  // Handlers para agentes
  const handleGuardarAgente = (data) => {
    if (modalAgente.modo === 'crear') {
      setAgentes([...agentes, { ...data, id: Date.now() }]);
      // Actualizar extensión si se asignó una
      if (data.extension) {
        setExtensiones(extensiones.map(ext =>
          ext.extension === data.extension ? { ...ext, agente: data.nombre } : ext
        ));
      }
    } else {
      // Limpiar extensión anterior si cambió
      const agenteAnterior = agentes.find(a => a.id === data.id);
      if (agenteAnterior?.extension && agenteAnterior.extension !== data.extension) {
        setExtensiones(extensiones.map(ext =>
          ext.extension === agenteAnterior.extension ? { ...ext, agente: null } : ext
        ));
      }
      // Asignar nueva extensión
      if (data.extension) {
        setExtensiones(extensiones.map(ext =>
          ext.extension === data.extension ? { ...ext, agente: data.nombre } : ext
        ));
      }
      setAgentes(agentes.map(ag => ag.id === data.id ? data : ag));
    }
    setModalAgente({ open: false, modo: 'crear', data: null });
  };

  const handleEliminarAgente = (id) => {
    const agente = agentes.find(a => a.id === id);
    if (confirm('¿Estás seguro de eliminar este agente?')) {
      // Liberar extensión
      if (agente?.extension) {
        setExtensiones(extensiones.map(ext =>
          ext.extension === agente.extension ? { ...ext, agente: null } : ext
        ));
      }
      setAgentes(agentes.filter(ag => ag.id !== id));
    }
  };

  return (
    <div className="configuracion">
      {/* Header */}
      <div className="config-header">
        <div className="config-title">
          <FiSettings className="title-icon" />
          <div>
            <h1>Configuración</h1>
            <p>Gestiona extensiones, agentes y ajustes del sistema</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="config-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`config-tab ${tabActiva === tab.id ? 'active' : ''}`}
            onClick={() => { setTabActiva(tab.id); setBusqueda(''); }}
          >
            <tab.icon />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Barra de acciones */}
      {tabActiva !== 'general' && (
        <div className="config-actions">
          <div className="search-box">
            <FiSearch />
            <input
              type="text"
              placeholder={`Buscar ${tabActiva}...`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="clear-search" onClick={() => setBusqueda('')}>
                <FiX />
              </button>
            )}
          </div>
          <button
            className="btn-primary"
            onClick={() => {
              if (tabActiva === 'extensiones') {
                setModalExtension({ open: true, modo: 'crear', data: null });
              } else {
                setModalAgente({ open: true, modo: 'crear', data: null });
              }
            }}
          >
            <FiPlus />
            <span>Nuevo {tabActiva === 'extensiones' ? 'Extensión' : 'Agente'}</span>
          </button>
        </div>
      )}

      {/* Contenido */}
      <AnimatePresence mode="wait">
        {tabActiva === 'extensiones' && (
          <motion.div
            key="extensiones"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="config-content"
          >
            <div className="tabla-container">
              <table className="config-tabla">
                <thead>
                  <tr>
                    <th>Extensión</th>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Agente Asignado</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {extensionesFiltradas.map((ext) => (
                    <motion.tr
                      key={ext.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                    >
                      <td>
                        <span className="extension-number">{ext.extension}</span>
                      </td>
                      <td>{ext.nombre}</td>
                      <td>
                        <span className={`tipo-badge ${ext.tipo}`}>
                          {ext.tipo === 'fija' ? 'Fija' : 'Softphone'}
                        </span>
                      </td>
                      <td>
                        {ext.agente ? (
                          <span className="agente-asignado">
                            <FiUser />
                            {ext.agente}
                          </span>
                        ) : (
                          <span className="sin-asignar">Sin asignar</span>
                        )}
                      </td>
                      <td>
                        <span className={`estado-badge ${ext.estado}`}>
                          {ext.estado === 'activa' ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td>
                        <div className="acciones">
                          <button
                            className="btn-icon edit"
                            title="Editar"
                            onClick={() => setModalExtension({ open: true, modo: 'editar', data: ext })}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            className="btn-icon delete"
                            title="Eliminar"
                            onClick={() => handleEliminarExtension(ext.id)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {extensionesFiltradas.length === 0 && (
                <div className="empty-state">
                  <FiPhone />
                  <p>No se encontraron extensiones</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tabActiva === 'agentes' && (
          <motion.div
            key="agentes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="config-content"
          >
            <div className="tabla-container">
              <table className="config-tabla">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Extensión</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {agentesFiltrados.map((ag) => (
                    <motion.tr
                      key={ag.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                    >
                      <td>
                        <span className="usuario-cell">
                          <FiUser />
                          {ag.usuario}
                        </span>
                      </td>
                      <td>{ag.nombre}</td>
                      <td>
                        {ag.email ? (
                          <span className="email-cell">{ag.email}</span>
                        ) : (
                          <span className="sin-email">-</span>
                        )}
                      </td>
                      <td>
                        <span className={`rol-badge ${ag.rol}`}>
                          {ag.rol === 'admin' && 'Administrador'}
                          {ag.rol === 'supervisor' && 'Supervisor'}
                          {ag.rol === 'agente' && 'Agente'}
                        </span>
                      </td>
                      <td>
                        {ag.extension ? (
                          <span className="extension-cell">{ag.extension}</span>
                        ) : (
                          <span className="sin-extension">Sin extensión</span>
                        )}
                      </td>
                      <td>
                        <span className={`estado-badge ${ag.estado}`}>
                          {ag.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="acciones">
                          <button
                            className="btn-icon edit"
                            title="Editar"
                            onClick={() => setModalAgente({ open: true, modo: 'editar', data: ag })}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            className="btn-icon delete"
                            title="Eliminar"
                            onClick={() => handleEliminarAgente(ag.id)}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {agentesFiltrados.length === 0 && (
                <div className="empty-state">
                  <FiUsers />
                  <p>No se encontraron agentes</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tabActiva === 'general' && (
          <motion.div
            key="general"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="config-content"
          >
            <div className="general-settings">
              <div className="setting-card">
                <h3>Configuración del Sistema</h3>
                <p>Ajustes generales próximamente...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Extensión */}
      <ModalExtension
        isOpen={modalExtension.open}
        modo={modalExtension.modo}
        data={modalExtension.data}
        onClose={() => setModalExtension({ open: false, modo: 'crear', data: null })}
        onSave={handleGuardarExtension}
      />

      {/* Modal Agente */}
      <ModalAgente
        isOpen={modalAgente.open}
        modo={modalAgente.modo}
        data={modalAgente.data}
        extensionesDisponibles={extensionesDisponibles}
        extensionActual={modalAgente.data?.extension}
        onClose={() => setModalAgente({ open: false, modo: 'crear', data: null })}
        onSave={handleGuardarAgente}
      />
    </div>
  );
};

// Componente Modal para Extensiones
const ModalExtension = ({ isOpen, modo, data, onClose, onSave }) => {
  const [form, setForm] = useState({
    extension: '',
    nombre: '',
    tipo: 'softphone',
    estado: 'activa'
  });

  useEffect(() => {
    if (data) {
      setForm(data);
    } else {
      setForm({ extension: '', nombre: '', tipo: 'softphone', estado: 'activa' });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, id: data?.id, agente: data?.agente || null });
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
          className="modal-content"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{modo === 'crear' ? 'Nueva Extensión' : 'Editar Extensión'}</h2>
            <button className="modal-close" onClick={onClose}>
              <FiX />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label>
                <FiHash />
                Número de Extensión
              </label>
              <input
                type="text"
                value={form.extension}
                onChange={(e) => setForm({ ...form, extension: e.target.value })}
                placeholder="Ej: 1001"
                required
              />
            </div>

            <div className="form-group">
              <label>
                <FiPhone />
                Nombre / Descripción
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Recepción Principal"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  <option value="softphone">Softphone</option>
                  <option value="fija">Fija</option>
                </select>
              </div>

              <div className="form-group">
                <label>Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                >
                  <option value="activa">Activa</option>
                  <option value="inactiva">Inactiva</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                <FiCheck />
                {modo === 'crear' ? 'Crear Extensión' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Componente Modal para Agentes
const ModalAgente = ({ isOpen, modo, data, extensionesDisponibles, extensionActual, onClose, onSave }) => {
  const [form, setForm] = useState({
    usuario: '',
    nombre: '',
    email: '',
    password: '',
    rol: 'agente',
    extension: '',
    estado: 'activo'
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({ ...data, password: '' });
    } else {
      setForm({ usuario: '', nombre: '', email: '', password: '', rol: 'agente', extension: '', estado: 'activo' });
    }
  }, [data]);

  // Incluir extensión actual en las opciones si estamos editando
  const opcionesExtension = extensionActual
    ? [{ extension: extensionActual, nombre: `Actual: ${extensionActual}` }, ...extensionesDisponibles]
    : extensionesDisponibles;

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = { ...form, id: data?.id };
    // No enviar password vacío en edición
    if (modo === 'editar' && !form.password) {
      delete dataToSave.password;
    }
    onSave(dataToSave);
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
          className="modal-content modal-agente"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{modo === 'crear' ? 'Nuevo Agente' : 'Editar Agente'}</h2>
            <button className="modal-close" onClick={onClose}>
              <FiX />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label>
                  <FiUser />
                  Usuario *
                </label>
                <input
                  type="text"
                  value={form.usuario}
                  onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                  placeholder="Ej: jperez"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <FiUserCheck />
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  required
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
                  placeholder="Opcional"
                />
              </div>

              <div className="form-group">
                <label>
                  <FiLock />
                  {modo === 'crear' ? 'Contraseña *' : 'Nueva Contraseña'}
                </label>
                <div className="password-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={modo === 'crear' ? 'Contraseña' : 'Dejar vacío para mantener'}
                    required={modo === 'crear'}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Rol *</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  required
                >
                  <option value="agente">Agente</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <FiPhone />
                  Extensión
                </label>
                <select
                  value={form.extension}
                  onChange={(e) => setForm({ ...form, extension: e.target.value })}
                >
                  <option value="">Sin extensión</option>
                  {opcionesExtension.map(ext => (
                    <option key={ext.extension} value={ext.extension}>
                      {ext.extension} - {ext.nombre}
                    </option>
                  ))}
                </select>
                {extensionesDisponibles.length === 0 && !extensionActual && (
                  <span className="form-hint warning">
                    <FiAlertCircle />
                    No hay extensiones disponibles
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Estado</label>
              <div className="estado-toggle">
                <button
                  type="button"
                  className={`estado-btn ${form.estado === 'activo' ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, estado: 'activo' })}
                >
                  Activo
                </button>
                <button
                  type="button"
                  className={`estado-btn ${form.estado === 'inactivo' ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, estado: 'inactivo' })}
                >
                  Inactivo
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                <FiCheck />
                {modo === 'crear' ? 'Crear Agente' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Configuracion;
