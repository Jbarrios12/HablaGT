import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFileText, FiPlus, FiSearch, FiEdit2, FiTrash2, FiPlay, FiList, FiX,
  FiArrowLeft, FiSave, FiDownload, FiUpload, FiEye, FiCode, FiCopy,
} from 'react-icons/fi';
import { Form, FormBuilder, Utils } from '@formio/react';
import { formService, formSubmissionService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { builderOptions, formOptions, FORM_TEMPLATES } from './formioSetup';
import './Formularios.css';

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' }) : '';

const downloadFile = (name, content, type) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
};

const slug = (s) => (s || 'formulario').toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Campos con valor (excluye botones y layouts) para armar la tabla de respuestas.
const inputFields = (schema) => {
  const fields = [];
  Utils.eachComponent(schema?.components || [], (c, path) => {
    if (c.input && c.type !== 'button') fields.push({ key: path || c.key, label: c.label || c.key });
  });
  return fields;
};

// Un asistente (wizard) muestra una página por cada panel de primer nivel.
// Si los componentes no están en paneles, se agrupan en "Página 1".
const toWizard = (components = []) => {
  if (components.length && components.every((c) => c.type === 'panel')) return components;
  const fields = components.filter((c) => !(c.type === 'button' && c.action === 'submit'));
  return [{ type: 'panel', key: 'pagina1', title: 'Página 1', label: 'Página 1', input: false, components: fields }];
};

const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

const displayValue = (v) => {
  if (v == null || v === '') return '';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (Array.isArray(v)) return v.map(displayValue).join(', ');
  if (typeof v === 'object') {
    const checked = Object.entries(v).filter(([, on]) => on === true).map(([k]) => k);
    return checked.length && checked.length === Object.values(v).filter((x) => typeof x === 'boolean').length
      ? checked.join(', ')
      : JSON.stringify(v);
  }
  return String(v);
};

export default function Formularios() {
  const toast = useToast();
  const [forms, setForms] = useState([]);
  const [search, setSearch] = useState('');
  // view: { mode: 'list' } | { mode: 'builder'|'fill'|'submissions', form }
  const [view, setView] = useState({ mode: 'list' });
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    try {
      setForms(await formService.list());
    } catch (e) {
      toast.error(e.message || 'No se pudieron cargar los formularios');
    }
  }, [toast]);

  useEffect(() => {
    let alive = true;
    formService.list()
      .then((d) => alive && setForms(d))
      .catch((e) => toast.error(e.message || 'No se pudieron cargar los formularios'));
    return () => { alive = false; };
  }, [toast]);

  const back = () => { setView({ mode: 'list' }); load(); };

  const handleCreate = async ({ title, description, display, template }) => {
    const tpl = FORM_TEMPLATES.find((t) => t.key === template) || FORM_TEMPLATES[0];
    const form = await formService.create({
      title, description, display,
      schema: {
        display,
        components: display === 'wizard' ? toWizard(structuredClone(tpl.components)) : structuredClone(tpl.components),
      },
    });
    setCreateOpen(false);
    toast.success('Formulario creado');
    setView({ mode: 'builder', form });
  };

  const handleDuplicate = async (f) => {
    await formService.create({
      title: `${f.title} (copia)`, description: f.description, display: f.display,
      schema: structuredClone(f.schema),
    });
    toast.success('Formulario duplicado');
    load();
  };

  const handleDelete = async () => {
    await formService.remove(confirmDelete.id);
    toast.success('Formulario eliminado');
    setConfirmDelete(null);
    load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? forms.filter((f) => `${f.title} ${f.description}`.toLowerCase().includes(q)) : forms;
  }, [forms, search]);

  if (view.mode === 'builder') return <BuilderView form={view.form} onBack={back} />;
  if (view.mode === 'fill') return <FillView form={view.form} onBack={back} onSeeResponses={() => setView({ mode: 'submissions', form: view.form })} />;
  if (view.mode === 'submissions') return <SubmissionsView form={view.form} onBack={back} onFill={() => setView({ mode: 'fill', form: view.form })} />;

  return (
    <div className="formularios">
      <div className="page-header">
        <div className="page-title">
          <FiFileText className="title-icon" />
          <div>
            <h1>Formularios</h1>
            <p>Diseña formularios con arrastrar y soltar y captura respuestas</p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <FiPlus /><span>Nuevo formulario</span>
          </button>
        </div>
      </div>

      {forms.length > 0 && (
        <div className="frm-toolbar">
          <div className="search-box">
            <FiSearch />
            <input placeholder="Buscar formulario..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="frm-count">{filtered.length} de {forms.length}</span>
        </div>
      )}

      {forms.length === 0 ? (
        <div className="frm-empty">
          <FiFileText />
          <h3>Aún no tienes formularios</h3>
          <p>Crea encuestas post-llamada, registros de leads o cualquier captura de datos para tus agentes.</p>
          <button className="btn-primary" onClick={() => setCreateOpen(true)}><FiPlus /> Crear el primero</button>
        </div>
      ) : (
        <div className="frm-grid">
          {filtered.map((f) => (
            <motion.div key={f.id} className="frm-card" layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="frm-card-head">
                <div className="frm-card-icon"><FiFileText /></div>
                <span className={`frm-badge ${f.display === 'wizard' ? 'wizard' : ''}`}>
                  {f.display === 'wizard' ? 'Asistente' : 'Formulario'}
                </span>
              </div>
              <h3>{f.title}</h3>
              <p className="frm-card-desc">{f.description || 'Sin descripción'}</p>
              <div className="frm-card-meta">
                <span>{inputFields(f.schema).length} campos</span>
                <span>·</span>
                <span>{f.submissions} respuestas</span>
              </div>
              <div className="frm-card-date">Actualizado {fmtDate(f.updated_at)}</div>
              <div className="frm-card-actions">
                <button className="btn-secondary btn-sm" onClick={() => setView({ mode: 'fill', form: f })}><FiPlay /> Llenar</button>
                <button className="btn-secondary btn-sm" onClick={() => setView({ mode: 'submissions', form: f })}><FiList /> Respuestas</button>
                <div className="frm-card-icons">
                  <button className="btn-icon edit" title="Editar" onClick={() => setView({ mode: 'builder', form: f })}><FiEdit2 /></button>
                  <button className="btn-icon edit" title="Duplicar" onClick={() => handleDuplicate(f)}><FiCopy /></button>
                  <button className="btn-icon delete" title="Eliminar" onClick={() => setConfirmDelete(f)}><FiTrash2 /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {createOpen && <CreateModal onClose={() => setCreateOpen(false)} onCreate={handleCreate} />}
        {confirmDelete && (
          <Modal title="Eliminar formulario" onClose={() => setConfirmDelete(null)}>
            <div className="modal-body">
              <p>¿Eliminar <strong>{confirmDelete.title}</strong> y sus {confirmDelete.submissions} respuestas? Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn-danger" onClick={handleDelete}><FiTrash2 /> Eliminar</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Constructor ---------------- */

function BuilderView({ form: initial, onBack }) {
  const toast = useToast();
  const [meta, setMeta] = useState({ title: initial.title, description: initial.description, display: initial.display });
  const schemaRef = useRef(initial.schema);
  const [builderKey, setBuilderKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState('builder'); // builder | preview | json
  const [previewSchema, setPreviewSchema] = useState(initial.schema);
  const fileRef = useRef(null);

  // El builder se crea una sola vez con initialForm; cambiar el tipo de
  // formulario o importar un JSON requiere re-montarlo (builderKey).
  const initialForm = useMemo(
    () => ({ ...schemaRef.current, display: meta.display }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [builderKey, meta.display],
  );

  const onChange = useCallback((schema) => {
    schemaRef.current = schema;
    setDirty(true);
  }, []);

  const save = async () => {
    if (!meta.title.trim()) return toast.warning('El formulario necesita un nombre');
    await formService.update(initial.id, { ...meta, schema: { ...schemaRef.current, display: meta.display } });
    setDirty(false);
    toast.success('Formulario guardado');
  };

  const changeDisplay = (display) => {
    if (display === 'wizard') {
      schemaRef.current = { ...schemaRef.current, components: toWizard(schemaRef.current?.components) };
    }
    setMeta((m) => ({ ...m, display }));
    setBuilderKey((k) => k + 1);
    setDirty(true);
  };

  const switchTab = (t) => {
    if (t !== 'builder') setPreviewSchema({ ...schemaRef.current, display: meta.display });
    setTab(t);
  };

  const exportJson = () => downloadFile(
    `${slug(meta.title)}.json`,
    JSON.stringify({ ...schemaRef.current, display: meta.display, title: meta.title }, null, 2),
    'application/json',
  );

  const importJson = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (!Array.isArray(json.components)) throw new Error();
      schemaRef.current = json;
      if (json.display === 'wizard' || json.display === 'form') setMeta((m) => ({ ...m, display: json.display }));
      setBuilderKey((k) => k + 1);
      setDirty(true);
      toast.success('Esquema importado');
    } catch {
      toast.error('El archivo no es un esquema de Form.io válido');
    }
  };

  const leave = () => {
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Salir de todos modos?')) return;
    onBack();
  };

  return (
    <div className="formularios">
      <div className="frm-editor-head">
        <button className="btn-secondary btn-sm" onClick={leave}><FiArrowLeft /> Volver</button>
        <div className="frm-editor-meta">
          <input
            className="frm-title-input"
            value={meta.title}
            placeholder="Nombre del formulario"
            onChange={(e) => { setMeta((m) => ({ ...m, title: e.target.value })); setDirty(true); }}
          />
          <input
            className="frm-desc-input"
            value={meta.description}
            placeholder="Descripción (opcional)"
            onChange={(e) => { setMeta((m) => ({ ...m, description: e.target.value })); setDirty(true); }}
          />
        </div>
        <div className="frm-editor-actions">
          <select className="frm-select" value={meta.display} onChange={(e) => changeDisplay(e.target.value)}>
            <option value="form">Formulario</option>
            <option value="wizard">Asistente (pasos)</option>
          </select>
          <button className="btn-secondary btn-sm" onClick={() => fileRef.current?.click()} title="Importar JSON"><FiUpload /></button>
          <button className="btn-secondary btn-sm" onClick={exportJson} title="Exportar JSON"><FiDownload /></button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJson} />
          <button className="btn-primary btn-sm" onClick={save} disabled={!dirty}><FiSave /> Guardar</button>
        </div>
      </div>

      <div className="frm-tabs">
        <button className={tab === 'builder' ? 'active' : ''} onClick={() => switchTab('builder')}><FiEdit2 /> Diseñar</button>
        <button className={tab === 'preview' ? 'active' : ''} onClick={() => switchTab('preview')}><FiEye /> Vista previa</button>
        <button className={tab === 'json' ? 'active' : ''} onClick={() => switchTab('json')}><FiCode /> JSON</button>
        {dirty && <span className="frm-dirty">Cambios sin guardar</span>}
      </div>

      {/* El builder queda montado (oculto) para no perder su estado interno. */}
      <div className="frm-panel formio-scope" style={{ display: tab === 'builder' ? undefined : 'none' }}>
        <FormBuilder key={builderKey} initialForm={initialForm} options={builderOptions} onChange={onChange} />
      </div>
      {tab === 'preview' && (
        <div className="frm-panel frm-preview formio-scope">
          <Form src={previewSchema} options={{ ...formOptions, noAlerts: false }} onSubmit={() => toast.info('Vista previa: el envío no se guarda')} />
        </div>
      )}
      {tab === 'json' && (
        <pre className="frm-panel frm-json">{JSON.stringify(previewSchema, null, 2)}</pre>
      )}
    </div>
  );
}

/* ---------------- Llenar ---------------- */

function FillView({ form, onBack, onSeeResponses }) {
  const toast = useToast();
  const [round, setRound] = useState(0);
  const [count, setCount] = useState(form.submissions || 0);

  const onSubmit = async (submission) => {
    try {
      await formSubmissionService.create(form.id, submission.data);
      setCount((c) => c + 1);
      toast.success('Respuesta guardada');
      setRound((r) => r + 1); // formulario limpio para la siguiente captura
    } catch (e) {
      toast.error(e.message || 'No se pudo guardar la respuesta');
    }
  };

  return (
    <div className="formularios">
      <div className="frm-editor-head">
        <button className="btn-secondary btn-sm" onClick={onBack}><FiArrowLeft /> Volver</button>
        <div className="frm-editor-meta">
          <h2 className="frm-view-title">{form.title}</h2>
          {form.description && <p className="frm-view-desc">{form.description}</p>}
        </div>
        <div className="frm-editor-actions">
          <button className="btn-secondary btn-sm" onClick={onSeeResponses}><FiList /> Respuestas ({count})</button>
        </div>
      </div>
      <div className="frm-panel frm-fill formio-scope">
        {inputFields(form.schema).length === 0
          ? <p className="frm-muted">Este formulario aún no tiene campos. Edítalo para agregarlos.</p>
          : <Form key={round} src={form.schema} options={formOptions} onSubmit={onSubmit} />}
      </div>
    </div>
  );
}

/* ---------------- Respuestas ---------------- */

function SubmissionsView({ form, onBack, onFill }) {
  const toast = useToast();
  const [subs, setSubs] = useState([]);
  const [viewing, setViewing] = useState(null);
  const fields = useMemo(() => inputFields(form.schema), [form.schema]);

  const load = useCallback(async () => setSubs(await formSubmissionService.list(form.id)), [form.id]);
  useEffect(() => {
    let alive = true;
    formSubmissionService.list(form.id).then((d) => alive && setSubs(d));
    return () => { alive = false; };
  }, [form.id]);

  const remove = async (s) => {
    if (!window.confirm('¿Eliminar esta respuesta?')) return;
    await formSubmissionService.remove(form.id, s.id);
    toast.success('Respuesta eliminada');
    load();
  };

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Fecha', 'Capturado por', ...fields.map((f) => f.label)].map(esc).join(',');
    const rows = subs.map((s) => [
      fmtDate(s.created_at), s.created_by, ...fields.map((f) => displayValue(getPath(s.data, f.key))),
    ].map(esc).join(','));
    downloadFile(`${slug(form.title)}-respuestas.csv`, '﻿' + [header, ...rows].join('\n'), 'text/csv;charset=utf-8');
  };

  return (
    <div className="formularios">
      <div className="frm-editor-head">
        <button className="btn-secondary btn-sm" onClick={onBack}><FiArrowLeft /> Volver</button>
        <div className="frm-editor-meta">
          <h2 className="frm-view-title">Respuestas · {form.title}</h2>
          <p className="frm-view-desc">{subs.length} registros</p>
        </div>
        <div className="frm-editor-actions">
          <button className="btn-secondary btn-sm" onClick={exportCsv} disabled={!subs.length}><FiDownload /> CSV</button>
          <button className="btn-primary btn-sm" onClick={onFill}><FiPlay /> Llenar</button>
        </div>
      </div>

      {subs.length === 0 ? (
        <div className="frm-empty">
          <FiList />
          <h3>Sin respuestas todavía</h3>
          <p>Las capturas aparecerán aquí.</p>
        </div>
      ) : (
        <div className="frm-table-wrap">
          <table className="frm-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Capturado por</th>
                {fields.map((f) => <th key={f.key}>{f.label}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className="nowrap">{fmtDate(s.created_at)}</td>
                  <td>{s.created_by || '—'}</td>
                  {fields.map((f) => <td key={f.key}>{displayValue(getPath(s.data, f.key))}</td>)}
                  <td className="nowrap">
                    <button className="btn-icon edit" title="Ver" onClick={() => setViewing(s)}><FiEye /></button>
                    <button className="btn-icon delete" title="Eliminar" onClick={() => remove(s)}><FiTrash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {viewing && (
          <Modal title={`Respuesta del ${fmtDate(viewing.created_at)}`} onClose={() => setViewing(null)} wide>
            <div className="modal-body formio-scope">
              <Form src={form.schema} submission={{ data: viewing.data }} options={{ ...formOptions, readOnly: true, renderMode: 'html' }} />
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Modales ---------------- */

function Modal({ title, onClose, children, wide }) {
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className={`modal-content ${wide ? 'frm-modal-wide' : ''}`}
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}><FiX /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function CreateModal({ onClose, onCreate }) {
  const [data, setData] = useState({ title: '', description: '', display: 'form', template: 'blank' });
  const set = (k) => (e) => setData((d) => ({ ...d, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (data.title.trim()) onCreate({ ...data, title: data.title.trim() });
  };

  return (
    <Modal title="Nuevo formulario" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="form-group">
          <label>Nombre</label>
          <input autoFocus required value={data.title} onChange={set('title')} placeholder="Ej. Encuesta de satisfacción" />
        </div>
        <div className="form-group">
          <label>Descripción</label>
          <input value={data.description} onChange={set('description')} placeholder="Opcional" />
        </div>
        <div className="form-group">
          <label>Tipo</label>
          <select value={data.display} onChange={set('display')}>
            <option value="form">Formulario (una página)</option>
            <option value="wizard">Asistente (varios pasos)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Plantilla</label>
          <div className="frm-templates">
            {FORM_TEMPLATES.map((t) => (
              <button
                type="button" key={t.key}
                className={`frm-template ${data.template === t.key ? 'active' : ''}`}
                onClick={() => setData((d) => ({ ...d, template: t.key }))}
              >
                <strong>{t.label}</strong>
                <span>{t.description}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary"><FiPlus /> Crear</button>
        </div>
      </form>
    </Modal>
  );
}
