import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiX, FiUser, FiPhone, FiPhoneCall, FiFileText } from 'react-icons/fi';
import { Form } from '@formio/react';
import { formService, formSubmissionService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { formOptions } from './formioSetup';
import './Formularios.css';

// Ventanas de Formularios que se abren desde otras pantallas (softphone,
// ficha de contacto). Se cargan bajo demanda para no sumar Form.io al bundle
// de esas pantallas.

const LAST_FORM_KEY = 'hablagt.lastForm';
const readLast = () => { try { return localStorage.getItem(LAST_FORM_KEY) || ''; } catch { return ''; } };
const writeLast = (id) => { try { localStorage.setItem(LAST_FORM_KEY, id); } catch { /* sin almacenamiento */ } };

const apiError = (e, fallback) => e?.response?.data?.error?.message || e?.message || fallback;

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' }) : '';

function Layer({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <motion.div
      className="modal-overlay frm-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content frm-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar"><FiX /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/**
 * Llenar un formulario ligado a un contacto y/o a una llamada.
 * context: { contactId, contactName, phone, callRef, source: 'manual'|'call' }
 */
export function FillFormModal({ context = {}, onClose, onSaved }) {
  const toast = useToast();
  const [forms, setForms] = useState(null);
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    formService.list()
      .then((list) => {
        if (!alive) return;
        setForms(list);
        const last = readLast();
        setSelected(list.some((f) => f.id === last) ? last : list[0]?.id || '');
      })
      .catch((e) => { toast.error(apiError(e, 'No se pudieron cargar los formularios')); setForms([]); });
    return () => { alive = false; };
  }, [toast]);

  const form = forms?.find((f) => f.id === selected);

  const pick = (id) => { setSelected(id); writeLast(id); };

  const onSubmit = async (submission) => {
    if (saving || !form) return;
    setSaving(true);
    try {
      const res = await formSubmissionService.create(form.id, submission.data, {
        contact_id: context.contactId || undefined,
        phone: context.phone || undefined,
        call_ref: context.callRef || undefined,
        source: context.source || 'manual',
      });
      writeLast(form.id);
      toast.success(res?.contact_name ? `Respuesta guardada en ${res.contact_name}` : 'Respuesta guardada');
      onSaved?.(res);
      onClose();
    } catch (e) {
      toast.error(apiError(e, 'No se pudo guardar la respuesta'));
      setSaving(false);
    }
  };

  const subtitle = (
    <div className="frm-context">
      {context.contactName && <span><FiUser /> {context.contactName}</span>}
      {context.phone && <span><FiPhone /> {context.phone}</span>}
      {context.source === 'call' && <span className="frm-context-call"><FiPhoneCall /> Ligado a esta llamada</span>}
    </div>
  );

  return (
    <Layer title="Llenar formulario" subtitle={subtitle} onClose={onClose}>
      <div className="modal-body">
        {forms === null ? (
          <p className="frm-muted">Cargando formularios…</p>
        ) : forms.length === 0 ? (
          <div className="frm-empty frm-empty--compact">
            <FiFileText />
            <h3>No hay formularios todavía</h3>
            <p>Crea uno en la sección Formularios para poder usarlo aquí.</p>
            <Link className="btn-primary" to="/formularios" onClick={onClose}>Ir a Formularios</Link>
          </div>
        ) : (
          <>
            <div className="form-group frm-picker">
              <label htmlFor="frm-pick">Formulario</label>
              <select id="frm-pick" value={selected} onChange={(e) => pick(e.target.value)}>
                {forms.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
              </select>
            </div>
            {form && (
              <div className="formio-scope frm-fill-inline">
                <Form key={form.id} src={form.schema} options={formOptions} onSubmit={onSubmit} />
              </div>
            )}
          </>
        )}
      </div>
    </Layer>
  );
}

/** Ver una respuesta guardada (solo lectura) con el formulario que la generó. */
export function SubmissionModal({ submission, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState(null);

  useEffect(() => {
    let alive = true;
    formService.get(submission.form_id)
      .then((f) => alive && setForm(f))
      .catch((e) => toast.error(apiError(e, 'No se pudo abrir el formulario')));
    return () => { alive = false; };
  }, [submission.form_id, toast]);

  const subtitle = (
    <div className="frm-context">
      <span>{fmtDate(submission.created_at)}</span>
      {submission.created_by_name && <span><FiUser /> {submission.created_by_name}</span>}
      {submission.source === 'call' && <span className="frm-context-call"><FiPhoneCall /> Durante una llamada</span>}
    </div>
  );

  return (
    <Layer title={submission.form_title || form?.title || 'Respuesta'} subtitle={subtitle} onClose={onClose}>
      <div className="modal-body formio-scope">
        {form
          ? <Form src={form.schema} submission={{ data: submission.data }} options={{ ...formOptions, readOnly: true, renderMode: 'html' }} />
          : <p className="frm-muted">Cargando…</p>}
      </div>
    </Layer>
  );
}
