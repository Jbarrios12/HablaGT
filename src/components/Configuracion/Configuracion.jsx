import { useState, useEffect } from 'react';
import { extensionService, agentAdminService, tenantService, integrationService } from '../../services';
import { useLoading } from '../../context/LoadingContext';
import { useToast } from '../../context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSettings,
  FiPhone,
  FiUsers,
  FiSliders,
  FiServer,
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
  const { showLoading, hideLoading } = useLoading();
  const toast = useToast();
  const [tabActiva, setTabActiva] = useState('extensiones');
  const [busqueda, setBusqueda] = useState('');

  const [extensiones, setExtensiones] = useState([]);
  const [modalExtension, setModalExtension] = useState({ open: false, modo: 'crear', data: null });

  const [agentes, setAgentes] = useState([]);
  const [modalAgente, setModalAgente] = useState({ open: false, modo: 'crear', data: null });

  const [tenant, setTenant] = useState(null);
  const [tenantEdit, setTenantEdit] = useState({ nombre: '', email: '', plan: '', timezone: '' });
  const [savingTenant, setSavingTenant] = useState(false);

  const [integration, setIntegration] = useState(null);
  const [integrationForm, setIntegrationForm] = useState({
    freepbx_enabled: false,
    freepbx_provider: 'self',
    freepbx_base_url: '',
    freepbx_username: '',
    freepbx_password: '',
    freepbx_api_token: '',
    freepbx_recordings_url: '',
    voiceai_enabled: false,
    voiceai_provider: 'stub',
    voiceai_api_key: '',
    voiceai_voice_id: '',
    voiceai_agent_id: '',
    voiceai_base_url: '',
  });
  const [savingIntegration, setSavingIntegration] = useState(false);

  useEffect(() => {
    const load = async () => {
      showLoading('Cargando configuración...');
      try {
        const [exts, ags, tn] = await Promise.all([
          extensionService.list(),
          agentAdminService.list({ page_size: 100 }),
          tenantService.get().catch(() => null),
        ]);
        setExtensiones(
          (exts?.items || exts || []).map((e) => ({
            id: e.id,
            extension: e.extension,
            nombre: e.nombre,
            tipo: e.tipo || 'fija',
            estado: e.estado || 'activa',
            agente_id: e.agente_id,
            agente: e.agente_nombre || '',
          }))
        );
        setAgentes(
          (ags?.items || ags || []).map((a) => ({
            id: a.id,
            usuario: a.username || a.usuario,
            nombre: a.full_name || a.fullName || a.nombre,
            email: a.email,
            rol: a.role || a.rol,
            extension: a.extension || null,
            estado: a.is_active === false ? 'inactivo' : 'activo',
          }))
        );
        if (tn) {
          setTenant(tn);
          setTenantEdit({
            nombre: tn.nombre || '',
            email: tn.email || '',
            plan: tn.plan || '',
            timezone: tn.timezone || 'UTC',
          });
          try {
            const integ = await integrationService.get(tn.id);
            setIntegration(integ);
            setIntegrationForm({
              freepbx_enabled: integ?.freepbx?.enabled || false,
              freepbx_provider: integ?.freepbx?.provider || 'self',
              freepbx_base_url: integ?.freepbx?.base_url || '',
              freepbx_username: '',
              freepbx_password: '',
              freepbx_api_token: '',
              freepbx_recordings_url: integ?.freepbx?.recordings_url || '',
              voiceai_enabled: integ?.voice_ai?.enabled || false,
              voiceai_provider: integ?.voice_ai?.provider || 'stub',
              voiceai_api_key: '',
              voiceai_voice_id: integ?.voice_ai?.voice_id || '',
              voiceai_agent_id: integ?.voice_ai?.agent_id || '',
              voiceai_base_url: integ?.voice_ai?.base_url || '',
            });
          } catch (err) {
            console.error('integration load error', err);
          }
        }
      } catch (err) {
        console.error('configuracion load error', err);
      } finally {
        hideLoading();
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extensionesDisponibles = extensiones.filter((ext) => !ext.agente_id && ext.estado === 'activa');

  const tabs = [
    { id: 'extensiones', label: 'Extensiones', icon: FiPhone },
    { id: 'agentes', label: 'Agentes', icon: FiUsers },
    { id: 'integraciones', label: 'Integraciones', icon: FiServer },
    { id: 'general', label: 'General', icon: FiSliders },
  ];

  const extensionesFiltradas = extensiones.filter((ext) =>
    (ext.extension || '').includes(busqueda) ||
    (ext.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (ext.agente || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const agentesFiltrados = agentes.filter((ag) =>
    (ag.usuario || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (ag.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (ag.email || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  // Handlers para extensiones
  const handleGuardarExtension = async (data) => {
    showLoading('Guardando extensión...');
    try {
      const payload = {
        extension: data.extension,
        nombre: data.nombre,
        tipo: data.tipo || 'fija',
        estado: data.estado || 'activa',
      };
      if (modalExtension.modo === 'crear') {
        const created = await extensionService.create(payload);
        const c = created?.extension || created;
        setExtensiones([...extensiones, {
          id: c.id,
          extension: c.extension,
          nombre: c.nombre,
          tipo: c.tipo,
          estado: c.estado,
          agente_id: null,
          agente: '',
        }]);
      } else {
        const updated = await extensionService.update(data.id, payload);
        const c = updated?.extension || updated;
        setExtensiones(extensiones.map((ext) => ext.id === data.id ? { ...ext, ...c } : ext));
      }
      setModalExtension({ open: false, modo: 'crear', data: null });
    } catch (err) {
      toast.error('Error guardando extensión: ' + (err?.response?.data?.error?.message || err.message));
    } finally {
      hideLoading();
    }
  };

  const handleEliminarExtension = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta extensión?')) return;
    showLoading('Eliminando...');
    try {
      await extensionService.remove(id);
      setExtensiones(extensiones.filter((ext) => ext.id !== id));
    } catch (err) {
      toast.error('Error eliminando extensión: ' + (err?.response?.data?.error?.message || err.message));
    } finally {
      hideLoading();
    }
  };

  const handleGuardarAgente = async (data) => {
    showLoading('Guardando agente...');
    try {
      const payload = {
        username: data.usuario,
        full_name: data.nombre,
        email: data.email || '',
        role: data.rol,
        extension: data.extension || '',
        is_active: data.estado === 'activo',
        password: data.password || undefined,
      };
      if (modalAgente.modo === 'crear') {
        const created = await agentAdminService.create(payload);
        const c = created?.agent || created;
        setAgentes([...agentes, {
          id: c.id,
          usuario: c.username || c.usuario,
          nombre: c.full_name || c.fullName || c.nombre,
          email: c.email,
          rol: c.role || c.rol,
          extension: c.extension || null,
          estado: c.is_active === false ? 'inactivo' : 'activo',
        }]);
        if (payload.extension) {
          await loadExtensiones();
        }
      } else {
        const updated = await agentAdminService.update(data.id, payload);
        const c = updated?.agent || updated;
        setAgentes(agentes.map((ag) => ag.id === data.id ? {
          ...ag,
          nombre: c.full_name || c.fullName || c.nombre,
          email: c.email,
          rol: c.role || c.rol,
          extension: c.extension || null,
          estado: c.is_active === false ? 'inactivo' : 'activo',
        } : ag));
        await loadExtensiones();
      }
      setModalAgente({ open: false, modo: 'crear', data: null });
    } catch (err) {
      toast.error('Error guardando agente: ' + (err?.response?.data?.error?.message || err.message));
    } finally {
      hideLoading();
    }
  };

  const loadExtensiones = async () => {
    try {
      const exts = await extensionService.list();
      setExtensiones(
        (exts?.items || exts || []).map((e) => ({
          id: e.id,
          extension: e.extension,
          nombre: e.nombre,
          tipo: e.tipo || 'fija',
          estado: e.estado || 'activa',
          agente_id: e.agente_id,
          agente: e.agente_nombre || '',
        }))
      );
    } catch (err) {
      console.error('reload extensiones', err);
    }
  };

  const handleEliminarAgente = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este agente?')) return;
    showLoading('Eliminando...');
    try {
      await agentAdminService.remove(id);
      setAgentes(agentes.filter((ag) => ag.id !== id));
      await loadExtensiones();
    } catch (err) {
      toast.error('Error eliminando agente: ' + (err?.response?.data?.error?.message || err.message));
    } finally {
      hideLoading();
    }
  };

  const handleSaveTenant = async () => {
    setSavingTenant(true);
    showLoading('Guardando tenant...');
    try {
      const updated = await tenantService.update(tenantEdit);
      setTenant(updated);
    } catch (err) {
      toast.error('Error guardando tenant: ' + (err?.response?.data?.error?.message || err.message));
    } finally {
      setSavingTenant(false);
      hideLoading();
    }
  };

  const handleSaveIntegration = async () => {
    if (!tenant) return;
    setSavingIntegration(true);
    showLoading('Guardando integraciones...');
    try {
      const payload = { ...integrationForm };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });
      const updated = await integrationService.update(tenant.id, payload);
      setIntegration(updated);
      setIntegrationForm((prev) => ({
        ...prev,
        freepbx_username: '',
        freepbx_password: '',
        freepbx_api_token: '',
        voiceai_api_key: '',
      }));
    } catch (err) {
      toast.error('Error guardando integración: ' + (err?.response?.data?.error?.message || err.message));
    } finally {
      setSavingIntegration(false);
      hideLoading();
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

      {/* Barra de acciones — solo aplica a las pestañas con listado (extensiones/agentes) */}
      {(tabActiva === 'extensiones' || tabActiva === 'agentes') && (
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

        {tabActiva === 'integraciones' && (
          <motion.div
            key="integraciones"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="config-content"
          >
            <div className="integraciones-grid">
              <div className="setting-card">
                <div className="card-header-row">
                  <h3>FreePBX / Proveedor de llamadas</h3>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={integrationForm.freepbx_enabled}
                      onChange={(e) => setIntegrationForm({ ...integrationForm, freepbx_enabled: e.target.checked })}
                    />
                    <span>{integrationForm.freepbx_enabled ? 'Activado' : 'Desactivado'}</span>
                  </label>
                </div>
                {integration?.freepbx && (
                  <div className="cred-status">
                    <span className={integration.freepbx.has_password ? 'ok' : 'missing'}>
                      Contraseña: {integration.freepbx.has_password ? 'configurada' : 'falta'}
                    </span>
                    <span className={integration.freepbx.has_api_token ? 'ok' : 'missing'}>
                      API Token: {integration.freepbx.has_api_token ? 'configurado' : 'falta'}
                    </span>
                  </div>
                )}
                <div className="form-group">
                  <label>Proveedor</label>
                  <select
                    value={integrationForm.freepbx_provider}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, freepbx_provider: e.target.value })}
                    disabled={!integrationForm.freepbx_enabled}
                  >
                    <option value="self">Self-hosted (FreePBX local)</option>
                    <option value="cloud">Cloud (FreePBX hosted)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Base URL (API + ARI)</label>
                  <input
                    type="url"
                    placeholder="https://pbx.example.com"
                    value={integrationForm.freepbx_base_url}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, freepbx_base_url: e.target.value })}
                    disabled={!integrationForm.freepbx_enabled}
                  />
                </div>
                <div className="form-group">
                  <label>Usuario</label>
                  <input
                    type="text"
                    placeholder="admin"
                    value={integrationForm.freepbx_username}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, freepbx_username: e.target.value })}
                    disabled={!integrationForm.freepbx_enabled}
                  />
                </div>
                <div className="form-group">
                  <label>Contraseña {integration?.freepbx?.has_password && <span className="hint">(dejar vacío para conservar)</span>}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={integrationForm.freepbx_password}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, freepbx_password: e.target.value })}
                    disabled={!integrationForm.freepbx_enabled}
                  />
                </div>
                <div className="form-group">
                  <label>API Token {integration?.freepbx?.has_api_token && <span className="hint">(dejar vacío para conservar)</span>}</label>
                  <input
                    type="password"
                    placeholder="opcional"
                    value={integrationForm.freepbx_api_token}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, freepbx_api_token: e.target.value })}
                    disabled={!integrationForm.freepbx_enabled}
                  />
                </div>
                <div className="form-group">
                  <label>URL pública de grabaciones</label>
                  <input
                    type="url"
                    placeholder="https://pbx.example.com/recordings"
                    value={integrationForm.freepbx_recordings_url}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, freepbx_recordings_url: e.target.value })}
                    disabled={!integrationForm.freepbx_enabled}
                  />
                  <small>Para que el front pueda reproducir las grabaciones en Reportería.</small>
                </div>
              </div>

              <div className="setting-card">
                <div className="card-header-row">
                  <h3>Operadora IA (Voice AI)</h3>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={integrationForm.voiceai_enabled}
                      onChange={(e) => setIntegrationForm({ ...integrationForm, voiceai_enabled: e.target.checked })}
                    />
                    <span>{integrationForm.voiceai_enabled ? 'Activado' : 'Desactivado'}</span>
                  </label>
                </div>
                {integration?.voice_ai && (
                  <div className="cred-status">
                    <span className={integration.voice_ai.has_key ? 'ok' : 'missing'}>
                      API Key: {integration.voice_ai.has_key ? 'configurada' : 'falta'}
                    </span>
                  </div>
                )}
                <div className="form-group">
                  <label>Proveedor</label>
                  <select
                    value={integrationForm.voiceai_provider}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, voiceai_provider: e.target.value })}
                    disabled={!integrationForm.voiceai_enabled}
                  >
                    <option value="stub">Stub (dev)</option>
                    <option value="elevenlabs">ElevenLabs</option>
                    <option value="openai">OpenAI Realtime</option>
                    <option value="cartesia">Cartesia</option>
                    <option value="vapi">VAPI</option>
                    <option value="retell">Retell</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>API Key {integration?.voice_ai?.has_key && <span className="hint">(dejar vacío para conservar)</span>}</label>
                  <input
                    type="password"
                    placeholder="sk_..."
                    value={integrationForm.voiceai_api_key}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, voiceai_api_key: e.target.value })}
                    disabled={!integrationForm.voiceai_enabled}
                  />
                </div>
                <div className="form-group">
                  <label>Voice ID</label>
                  <input
                    type="text"
                    placeholder="ej. 21m00Tcm4TlvDq8ikWAM (Rachel)"
                    value={integrationForm.voiceai_voice_id}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, voiceai_voice_id: e.target.value })}
                    disabled={!integrationForm.voiceai_enabled}
                  />
                </div>
                <div className="form-group">
                  <label>Agent ID (opcional)</label>
                  <input
                    type="text"
                    value={integrationForm.voiceai_agent_id}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, voiceai_agent_id: e.target.value })}
                    disabled={!integrationForm.voiceai_enabled}
                  />
                </div>
                <div className="form-group">
                  <label>Base URL (opcional, para OpenAI-compatible)</label>
                  <input
                    type="url"
                    placeholder="https://api.openai.com/v1"
                    value={integrationForm.voiceai_base_url}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, voiceai_base_url: e.target.value })}
                    disabled={!integrationForm.voiceai_enabled}
                  />
                </div>
              </div>
            </div>

            <div className="config-footer-actions">
              <button
                className="btn-primary"
                onClick={handleSaveIntegration}
                disabled={savingIntegration}
              >
                {savingIntegration ? 'Guardando...' : 'Guardar integraciones'}
              </button>
              {integration?.updated_at && (
                <span className="updated-hint">
                  Última actualización: {new Date(integration.updated_at).toLocaleString()}
                </span>
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
                <h3>Configuración del Tenant</h3>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={tenantEdit.nombre}
                    onChange={(e) => setTenantEdit({ ...tenantEdit, nombre: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={tenantEdit.email}
                    onChange={(e) => setTenantEdit({ ...tenantEdit, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Plan</label>
                  <input
                    type="text"
                    value={tenantEdit.plan}
                    onChange={(e) => setTenantEdit({ ...tenantEdit, plan: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Zona horaria</label>
                  <input
                    type="text"
                    value={tenantEdit.timezone}
                    onChange={(e) => setTenantEdit({ ...tenantEdit, timezone: e.target.value })}
                  />
                </div>
                <button
                  className="btn-primary"
                  onClick={handleSaveTenant}
                  disabled={savingTenant}
                >
                  {savingTenant ? 'Guardando...' : 'Guardar cambios'}
                </button>
                {tenant && (
                  <div style={{ marginTop: '1rem', color: '#888', fontSize: '0.85rem' }}>
                    Slug: <strong>{tenant.slug}</strong> · Estado: {tenant.estado}
                  </div>
                )}
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
