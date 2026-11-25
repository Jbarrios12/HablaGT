import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { FiFileText, FiPlus, FiPhoneCall, FiChevronRight } from 'react-icons/fi';
import { formSubmissionService } from '../../services';

// Las ventanas traen Form.io: se cargan solo cuando se abren.
const FillFormModal = lazy(() =>
  import('../Formularios/FormModals').then((m) => ({ default: m.FillFormModal })),
);
const SubmissionModal = lazy(() =>
  import('../Formularios/FormModals').then((m) => ({ default: m.SubmissionModal })),
);

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' }) : '';

/** Sección "Formularios" de la ficha de un contacto. */
export default function ContactForms({ contacto }) {
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  const [viewing, setViewing] = useState(null);

  const load = useCallback(() => {
    let alive = true;
    formSubmissionService.search({ contact_id: contacto.id, limit: 50 })
      .then((d) => { if (alive) { setItems(d); setFailed(false); } })
      .catch(() => { if (alive) { setItems([]); setFailed(true); } });
    return () => { alive = false; };
  }, [contacto.id]);

  useEffect(() => load(), [load]);

  return (
    <div className="detalle-historial detalle-formularios">
      <h3>
        <FiFileText />
        Formularios
        <button type="button" className="detalle-mini-btn" onClick={() => setFillOpen(true)}>
          <FiPlus /> Llenar
        </button>
      </h3>

      <div className="historial-list">
        {items === null ? (
          <p className="historial-empty">Cargando…</p>
        ) : failed ? (
          <p className="historial-empty">No se pudieron cargar los formularios.</p>
        ) : items.length === 0 ? (
          <p className="historial-empty">Sin formularios llenados para este contacto</p>
        ) : (
          items.map((s) => (
            <button type="button" key={s.id} className="historial-item historial-item--btn" onClick={() => setViewing(s)}>
              <div className={`historial-icon ${s.source === 'call' ? 'entrante' : 'form'}`}>
                {s.source === 'call' ? <FiPhoneCall /> : <FiFileText />}
              </div>
              <div className="historial-info">
                <span className="historial-fecha">{s.form_title || 'Formulario'}</span>
                <span className="historial-meta">
                  {fmtDate(s.created_at)}{s.created_by_name ? ` · ${s.created_by_name}` : ''}
                  {s.source === 'call' ? ' · en llamada' : ''}
                </span>
              </div>
              <FiChevronRight className="historial-chevron" aria-hidden="true" />
            </button>
          ))
        )}
      </div>

      <Suspense fallback={null}>
        {fillOpen && (
          <FillFormModal
            context={{
              contactId: contacto.id,
              contactName: contacto.nombre,
              phone: contacto.telefonoPrincipal || undefined,
              source: 'manual',
            }}
            onClose={() => setFillOpen(false)}
            onSaved={() => load()}
          />
        )}
        {viewing && <SubmissionModal submission={viewing} onClose={() => setViewing(null)} />}
      </Suspense>
    </div>
  );
}
