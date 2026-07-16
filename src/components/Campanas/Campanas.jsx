import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiCpu, FiBook, FiShare2,
  FiChevronLeft, FiChevronRight, FiPlay, FiPause, FiAlertCircle, FiCheck, FiUsers, FiUpload
} from 'react-icons/fi';
import { campaignService, agentIAService, flowService, kbDocumentService, kbCategoryService, contactListService } from '../../services';
import { useLoading } from '../../context/LoadingContext';
import { useToast } from '../../context/ToastContext';
import FlowBuilder from './FlowBuilder';
import ContactListImport from './ContactListImport';
import './Campanas.css';

const TIPO_LABELS = { inbound: 'Entrante', outbound: 'Saliente', task: 'Tarea' };
const TIPO_COLORS = { inbound: '#3b82f6', outbound: '#f59e0b', task: '#10b981' };
const STATUS_LABELS = { active: 'Activa', paused: 'Pausada', inactive: 'Inactiva' };
const FLOW_STATUS_LABELS = { draft: 'Borrador', published: 'Publicado', archived: 'Archivado' };
const KB_STATUS_LABELS = { processing: 'Procesando', ready: 'Listo', failed: 'Falló' };

const Campanas = () => {
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();
  const toast = useToast();
  const [tab, setTab] = useState('lista');
  const [campaigns, setCampaigns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [modalCampaign, setModalCampaign] = useState({ open: false, modo: 'crear', data: null });
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const [agentsIA, setAgentsIA] = useState([]);
  const [modalAgentIA, setModalAgentIA] = useState({ open: false, modo: 'crear', data: null });

  const [flows, setFlows] = useState([]);
  const [modalFlow, setModalFlow] = useState({ open: false, modo: 'crear', data: null });

  const [kbDocs, setKbDocs] = useState([]);
  const [kbCategories, setKbCategories] = useState([]);
  const [modalKBDoc, setModalKBDoc] = useState({ open: false, data: null });
  const [flowEditorId, setFlowEditorId] = useState(null);
  const [contactLists, setContactLists] = useState([]);
  const [modalContactList, setModalContactList] = useState({ open: false });

  const pageSize = 10;

  useEffect(() => {
    loadCampaigns();
    loadKBCategories();
    loadFlows();
  }, [page, filtroTipo]);

  const loadCampaigns = async () => {
    try {
      const res = await campaignService.list({ page, page_size: pageSize, tipo: filtroTipo || undefined, q: busqueda || undefined });
      setCampaigns(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      setCampaigns([]);
    }
  };

  const loadAgentsIA = async (campaignId) => {
    try {
      const res = await agentIAService.list({ campaign_id: campaignId });
      setAgentsIA(res.items || []);
    } catch (e) {
      setAgentsIA([]);
    }
  };

  const loadFlows = async () => {
    try {
      const res = await flowService.list({ page_size: 100 });
      setFlows(res.items || []);
    } catch (e) {
      setFlows([]);
    }
  };

  const loadKBCategories = async () => {
    try {
      const res = await kbCategoryService.list();
      setKbCategories(res.items || []);
    } catch (e) {
      setKbCategories([]);
    }
  };

  const loadKBDocs = async (categoryId) => {
    try {
      const res = await kbDocumentService.list({ category_id: categoryId || undefined });
      setKbDocs(res.items || []);
    } catch (e) {
      setKbDocs([]);
    }
  };

  const loadContactLists = async (campaignId) => {
    try {
      const res = await contactListService.list({ campaign_id: campaignId || undefined });
      setContactLists(res.items || []);
    } catch (e) {
      setContactLists([]);
    }
  };

  const handleCreateCampaign = async (form) => {
    try {
      await campaignService.create(form);
      toast.success('Campaña creada');
      setModalCampaign({ open: false, modo: 'crear', data: null });
      loadCampaigns();
    } catch (e) {
      toast.error('Error al crear campaña');
    }
  };

  const handleUpdateCampaign = async (id, form) => {
    try {
      await campaignService.update(id, form);
      toast.success('Campaña actualizada');
      setModalCampaign({ open: false, modo: 'crear', data: null });
      setSelectedCampaign(null);
      loadCampaigns();
    } catch (e) {
      toast.error('Error al actualizar campaña');
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('¿Eliminar esta campaña?')) return;
    try {
      await campaignService.remove(id);
      toast.success('Campaña eliminada');
      setSelectedCampaign(null);
      loadCampaigns();
    } catch (e) {
      toast.error('Error al eliminar campaña');
    }
  };

  const handleCreateAgentIA = async (form) => {
    try {
      await agentIAService.create(form);
      toast.success('Agente IA creado');
      setModalAgentIA({ open: false, modo: 'crear', data: null });
      loadAgentsIA(selectedCampaign?.id);
    } catch (e) {
      toast.error('Error al crear agente IA');
    }
  };

  const handleDeleteAgentIA = async (id) => {
    if (!window.confirm('¿Eliminar este agente IA?')) return;
    try {
      await agentIAService.remove(id);
      toast.success('Agente IA eliminado');
      loadAgentsIA(selectedCampaign?.id);
    } catch (e) {
      toast.error('Error al eliminar agente IA');
    }
  };

  const handleCreateFlow = async (form) => {
    try {
      await flowService.create(form);
      toast.success('Flow creado');
      setModalFlow({ open: false, modo: 'crear', data: null });
      loadFlows();
    } catch (e) {
      toast.error('Error al crear flow');
    }
  };

  const handleDeployFlow = async (id) => {
    try {
      await flowService.deploy(id);
      toast.success('Flow desplegado');
      loadFlows();
    } catch (e) {
      toast.error('Error al desplegar flow');
    }
  };

  const handleCreateKBDoc = async (form) => {
    try {
      await kbDocumentService.create(form);
      toast.success('Documento creado');
      setModalKBDoc({ open: false, data: null });
      loadKBDocs();
    } catch (e) {
      toast.error('Error al crear documento');
    }
  };

  const handleDeleteKBDoc = async (id) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    try {
      await kbDocumentService.remove(id);
      toast.success('Documento eliminado');
      loadKBDocs();
    } catch (e) {
      toast.error('Error al eliminar documento');
    }
  };

  const selectCampaign = (c) => {
    setSelectedCampaign(c);
    setTab('detalle');
    loadAgentsIA(c.id);
    loadKBDocs();
    loadContactLists(c.id);
  };

  const totalPages = Math.ceil(total / pageSize);

  if (flowEditorId) {
    return (
      <div className="campanas">
        <FlowBuilder flowId={flowEditorId} onBack={(newId) => {
          setFlowEditorId(null);
          loadFlows();
          if (newId) setFlowEditorId(newId);
        }} />
      </div>
    );
  }

  return (
    <div className="campanas">
      <div className="campanas-header">
        <h1>Campañas</h1>
        <button className="btn btn-primary" onClick={() => setModalCampaign({ open: true, modo: 'crear', data: null })}>
          <FiPlus /> Nueva Campaña
        </button>
      </div>

      {tab === 'lista' && !selectedCampaign && (
        <>
          <div className="campanas-filters">
            <div className="search-box">
              <FiSearch />
              <input
                type="text" placeholder="Buscar campañas..."
                value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
              />
            </div>
            <select value={filtroTipo} onChange={(e) => { setFiltroTipo(e.target.value); setPage(1); }}>
              <option value="">Todos los tipos</option>
              <option value="inbound">Entrante</option>
              <option value="outbound">Saliente</option>
              <option value="task">Tarea</option>
            </select>
          </div>

          <div className="campanas-grid">
            {campaigns.map((c) => (
              <motion.div key={c.id} className="campana-card" layout onClick={() => selectCampaign(c)}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              >
                <div className="campana-card-header">
                  <span className="tipo-badge" style={{ background: TIPO_COLORS[c.tipo] || '#64748b' }}>
                    {TIPO_LABELS[c.tipo] || c.tipo}
                  </span>
                  <span className={`status-badge ${c.status}`}>{STATUS_LABELS[c.status] || c.status}</span>
                </div>
                <h3>{c.nombre}</h3>
                {c.descripcion && <p>{c.descripcion}</p>}
                <div className="campana-card-footer">
                  <span>{c.timezone}</span>
                  <div className="card-actions">
                    <button onClick={(e) => { e.stopPropagation(); setModalCampaign({ open: true, modo: 'editar', data: c }); }}>
                      <FiEdit2 />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(c.id); }}>
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {campaigns.length === 0 && (
              <div className="empty-state">
                <FiCpu size={48} />
                <p>No hay campañas aún. Crea tu primera campaña.</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}><FiChevronLeft /></button>
              <span>{page} de {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><FiChevronRight /></button>
            </div>
          )}
        </>
      )}

      {tab === 'detalle' && selectedCampaign && (
        <CampaignDetail
          campaign={selectedCampaign}
          agentsIA={agentsIA}
          flows={flows}
          kbDocs={kbDocs}
          kbCategories={kbCategories}
          contactLists={contactLists}
          onBack={() => { setSelectedCampaign(null); setTab('lista'); }}
          onUpdate={(id, form) => handleUpdateCampaign(id, form)}
          onDelete={() => handleDeleteCampaign(selectedCampaign.id)}
          onAddAgentIA={() => setModalAgentIA({ open: true, modo: 'crear', data: null })}
          onDeleteAgentIA={handleDeleteAgentIA}
          onAddFlow={() => setModalFlow({ open: true, modo: 'crear', data: null })}
          onDeployFlow={handleDeployFlow}
          onEditFlow={(id) => setFlowEditorId(id)}
          onAddKBDoc={() => setModalKBDoc({ open: true, data: null })}
          onDeleteKBDoc={handleDeleteKBDoc}
          loadKBDocs={loadKBDocs}
          loadContactLists={loadContactLists}
          onOpenContactListImport={() => setModalContactList({ open: true })}
        />
      )}

      <AnimatePresence>
        {modalCampaign.open && (
          <CampaignModal
            modo={modalCampaign.modo}
            data={modalCampaign.data}
            onClose={() => setModalCampaign({ open: false, modo: 'crear', data: null })}
            onSave={modalCampaign.modo === 'crear' ? handleCreateCampaign : (f) => handleUpdateCampaign(modalCampaign.data.id, f)}
          />
        )}
        {modalAgentIA.open && (
          <AgentIAModal
            campaignId={selectedCampaign?.id}
            flows={flows}
            onClose={() => setModalAgentIA({ open: false, modo: 'crear', data: null })}
            onSave={handleCreateAgentIA}
          />
        )}
        {modalFlow.open && (
          <FlowModal
            onClose={() => setModalFlow({ open: false, modo: 'crear', data: null })}
            onSave={handleCreateFlow}
          />
        )}
        {modalKBDoc.open && (
          <KBDocumentModal
            categories={kbCategories}
            onClose={() => setModalKBDoc({ open: false, data: null })}
            onSave={handleCreateKBDoc}
          />
        )}
        {modalContactList.open && (
          <ContactListImport
            campaignId={selectedCampaign?.id}
            onClose={() => setModalContactList({ open: false })}
            onImported={() => { setModalContactList({ open: false }); loadContactLists(selectedCampaign?.id); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

function CampaignDetail({ campaign, agentsIA, flows, kbDocs, kbCategories, contactLists, onBack, onUpdate, onDelete, onAddAgentIA, onDeleteAgentIA, onAddFlow, onDeployFlow, onEditFlow, onAddKBDoc, onDeleteKBDoc, loadKBDocs, loadContactLists, onOpenContactListImport }) {
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ nombre: campaign.nombre, descripcion: campaign.descripcion || '', tipo: campaign.tipo, timezone: campaign.timezone || 'UTC' });
  const [subtab, setSubtab] = useState('agentes');

  const handleSave = () => {
    onUpdate(campaign.id, form);
    setEditMode(false);
  };

  return (
    <div className="campaign-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={onBack}><FiChevronLeft /> Volver</button>
        <div className="detail-actions">
          <button className="btn btn-danger" onClick={onDelete}><FiTrash2 /> Eliminar</button>
        </div>
      </div>

      <div className="detail-card">
        {!editMode ? (
          <div className="detail-info">
            <h2>{campaign.nombre}</h2>
            {campaign.descripcion && <p>{campaign.descripcion}</p>}
            <div className="detail-meta">
              <span className="tipo-badge" style={{ background: TIPO_COLORS[campaign.tipo] }}>{TIPO_LABELS[campaign.tipo] || campaign.tipo}</span>
              <span className={`status-badge ${campaign.status}`}>{STATUS_LABELS[campaign.status] || campaign.status}</span>
              <span>{campaign.timezone}</span>
            </div>
            <button className="btn btn-outline" onClick={() => setEditMode(true)}><FiEdit2 /> Editar</button>
          </div>
        ) : (
          <div className="detail-edit">
            <label>Nombre <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></label>
            <label>Descripción <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></label>
            <label>Zona Horaria <input value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })} /></label>
            <div className="edit-actions">
              <button className="btn btn-primary" onClick={handleSave}><FiCheck /> Guardar</button>
              <button className="btn btn-outline" onClick={() => setEditMode(false)}><FiX /> Cancelar</button>
            </div>
          </div>
        )}
      </div>

      <div className="detail-tabs">
        <button className={subtab === 'agentes' ? 'active' : ''} onClick={() => setSubtab('agentes')}><FiCpu /> Agentes IA</button>
        <button className={subtab === 'flujos' ? 'active' : ''} onClick={() => setSubtab('flujos')}><FiShare2 /> Flujos</button>
        <button className={subtab === 'conocimiento' ? 'active' : ''} onClick={() => setSubtab('conocimiento')}><FiBook /> Base de Conocimiento</button>
        {campaign.tipo === 'outbound' && (
          <button className={subtab === 'contactos' ? 'active' : ''} onClick={() => setSubtab('contactos')}><FiUsers /> Contactos</button>
        )}
      </div>

      <div className="detail-content">
        {subtab === 'agentes' && (
          <div className="sub-section">
            <div className="sub-header">
              <h3>Agentes IA</h3>
              <button className="btn btn-primary btn-sm" onClick={onAddAgentIA}><FiPlus /> Agregar</button>
            </div>
            {agentsIA.length === 0 ? (
              <div className="empty-state"><p>No hay agentes IA en esta campaña</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Flow</th><th>DIDs</th><th></th></tr></thead>
                  <tbody>
                    {agentsIA.map(a => (
                      <tr key={a.id}>
                        <td>{a.nombre}</td>
                        <td><span className="tipo-badge" style={{ background: TIPO_COLORS[a.tipo] }}>{TIPO_LABELS[a.tipo]}</span></td>
                        <td><span className={`status-badge ${a.status}`}>{STATUS_LABELS[a.status]}</span></td>
                        <td>{flows.find(f => f.id === a.flow_id)?.nombre || '-'}</td>
                        <td>{a.dids?.join(', ') || '-'}</td>
                        <td><button className="btn-icon" onClick={() => onDeleteAgentIA(a.id)}><FiTrash2 /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {subtab === 'flujos' && (
          <div className="sub-section">
            <div className="sub-header">
              <h3>Flujos</h3>
              <button className="btn btn-primary btn-sm" onClick={onAddFlow}><FiPlus /> Nuevo</button>
            </div>
            {flows.length === 0 ? (
              <div className="empty-state"><p>No hay flujos definidos</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nombre</th><th>Versión</th><th>Estado</th><th></th></tr></thead>
                  <tbody>
                    {flows.map(f => (
                      <tr key={f.id}>
                        <td>{f.nombre}</td>
                        <td>v{f.version}</td>
                        <td><span className={`status-badge ${f.status}`}>{FLOW_STATUS_LABELS[f.status]}</span></td>
                        <td>
                          <button className="btn btn-sm btn-outline" onClick={() => onEditFlow(f.id)} style={{ marginRight: 4 }}>
                            <FiEdit2 /> Editar
                          </button>
                          {f.status !== 'published' && (
                            <button className="btn btn-sm btn-primary" onClick={() => onDeployFlow(f.id)}><FiPlay /> Desplegar</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {subtab === 'conocimiento' && <KnowledgeBaseSection kbDocs={kbDocs} kbCategories={kbCategories} onAdd={onAddKBDoc} onDelete={onDeleteKBDoc} loadKBDocs={loadKBDocs} />}
        {subtab === 'contactos' && (
          <div className="sub-section">
            <div className="sub-header">
              <h3>Listas de Contactos</h3>
              <button className="btn btn-primary btn-sm" onClick={onOpenContactListImport}><FiUpload /> Importar CSV</button>
            </div>
            {contactLists.length === 0 ? (
              <div className="empty-state"><p>No hay listas de contactos. Importa un CSV para empezar.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nombre</th><th>Archivo</th><th>Contactos</th><th>Estado</th><th>Columnas</th></tr></thead>
                  <tbody>
                    {contactLists.map(cl => (
                      <tr key={cl.id}>
                        <td>{cl.nombre}</td>
                        <td>{cl.file_name || '-'}</td>
                        <td>{cl.row_count || 0}</td>
                        <td><span className={`status-badge ${cl.status}`}>{cl.status}</span></td>
                        <td>{cl.columns?.join(', ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KnowledgeBaseSection({ kbDocs, kbCategories, onAdd, onDelete, loadKBDocs }) {
  const [catFilter, setCatFilter] = useState('');

  useEffect(() => { loadKBDocs(catFilter); }, [catFilter]);

  return (
    <div className="sub-section">
      <div className="sub-header">
        <h3>Documentos</h3>
        <button className="btn btn-primary btn-sm" onClick={onAdd}><FiPlus /> Subir</button>
      </div>

      <div className="search-box" style={{ marginBottom: 16 }}>
        <FiSearch />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Todas las categorías</option>
          {kbCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
        </select>
      </div>

      {kbDocs.length === 0 ? (
        <div className="empty-state"><p>No hay documentos en la base de conocimiento</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Título</th><th>Categoría</th><th>Estado</th><th>Chunks</th><th>Versión</th><th></th></tr></thead>
            <tbody>
              {kbDocs.map(d => (
                <tr key={d.id}>
                  <td>{d.title}</td>
                  <td>{kbCategories.find(c => c.id === d.category_id)?.nombre || '-'}</td>
                  <td><span className={`status-badge ${d.status}`}>{KB_STATUS_LABELS[d.status]}</span></td>
                  <td>{d.chunk_count}</td>
                  <td>v{d.version}</td>
                  <td><button className="btn-icon" onClick={() => onDelete(d.id)}><FiTrash2 /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CampaignModal({ modo, data, onClose, onSave }) {
  const [form, setForm] = useState({ nombre: data?.nombre || '', descripcion: data?.descripcion || '', tipo: data?.tipo || 'inbound', timezone: data?.timezone || 'UTC' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{modo === 'crear' ? 'Nueva Campaña' : 'Editar Campaña'}</h2>
          <button className="modal-close" onClick={onClose}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label>Nombre *<input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></label>
            <label>Descripción<textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></label>
            <label>Tipo *
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                <option value="inbound">Entrante</option>
                <option value="outbound">Saliente</option>
                <option value="task">Tarea</option>
              </select>
            </label>
            <label>Zona Horaria<input value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })} /></label>
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">{modo === 'crear' ? 'Crear' : 'Guardar'}</button>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function AgentIAModal({ campaignId, flows, onClose, onSave }) {
  const [form, setForm] = useState({ campaign_id: campaignId, nombre: '', tipo: 'inbound', dids: '', flow_id: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      dids: form.dids ? form.dids.split(',').map(s => s.trim()).filter(Boolean) : [],
      flow_id: form.flow_id || undefined,
    });
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nuevo Agente IA</h2>
          <button className="modal-close" onClick={onClose}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label>Nombre *<input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></label>
            <label>Tipo *
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                <option value="inbound">Entrante</option>
                <option value="outbound">Saliente</option>
                <option value="task">Tarea</option>
              </select>
            </label>
            <label>DIDs (separados por coma)<input value={form.dids} onChange={e => setForm({ ...form, dids: e.target.value })} placeholder="+50212345678, +50287654321" /></label>
            <label>Flow
              <select value={form.flow_id} onChange={e => setForm({ ...form, flow_id: e.target.value })}>
                <option value="">Sin flow</option>
                {flows.filter(f => f.status === 'published').map(f => (
                  <option key={f.id} value={f.id}>{f.nombre} v{f.version}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">Crear</button>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function FlowModal({ onClose, onSave }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '', definition: null });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      definition: form.definition || { nodes: [], edges: [] },
    });
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nuevo Flow</h2>
          <button className="modal-close" onClick={onClose}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label>Nombre *<input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></label>
            <label>Descripción<textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></label>
            <p className="help-text">El editor visual de flujos estará disponible próximamente.</p>
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">Crear</button>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function KBDocumentModal({ categories, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', category_id: '', source_type: 'manual', content: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      category_id: form.category_id || undefined,
    });
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nuevo Documento</h2>
          <button className="modal-close" onClick={onClose}><FiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label>Título *<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></label>
            <label>Descripción<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
            <label>Categoría
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Sin categoría</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
              </select>
            </label>
            <label>Tipo
              <select value={form.source_type} onChange={e => setForm({ ...form, source_type: e.target.value })}>
                <option value="manual">Manual</option>
                <option value="upload">Archivo</option>
                <option value="url">URL</option>
              </select>
            </label>
            {form.source_type === 'manual' && (
              <label>Contenido<textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={10} /></label>
            )}
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">Crear</button>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default Campanas;
