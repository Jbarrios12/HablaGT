import { useEffect, useMemo, useState } from 'react';
import { FiClock, FiPhoneIncoming, FiPhoneOutgoing, FiPhoneMissed, FiPhone } from 'react-icons/fi';
import { cdrService } from '../../services';

// Últimos 8 dígitos: así "+502 5512-3480" y "55123480" son el mismo número.
const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-8);

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' }) : '';
const fmtDur = (s) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '0:00');

// Mismas opciones que el cierre de llamada del softphone.
const DISPOSITION = {
  sale: 'Venta', follow_up: 'Seguimiento', not_interested: 'No interesado',
  voicemail: 'Buzón de voz', wrong_number: 'Número equivocado', do_not_call: 'No llamar', other: 'Otro',
};

const TIPO = {
  inbound: { icon: FiPhoneIncoming, cls: 'entrante', label: 'Entrante' },
  outbound: { icon: FiPhoneOutgoing, cls: 'saliente', label: 'Saliente' },
  missed: { icon: FiPhoneMissed, cls: 'perdida', label: 'Perdida' },
  internal: { icon: FiPhone, cls: 'saliente', label: 'Interna' },
};

/** Historial real de llamadas del contacto (registros CDR por sus teléfonos). */
export default function ContactCallHistory({ contacto }) {
  const [calls, setCalls] = useState(null);
  const [failed, setFailed] = useState(false);
  const keysStr = useMemo(() => [...new Set([contacto.telefonoPrincipal, contacto.telefonoMovil, contacto.telefonoTrabajo]
    .map(phoneKey).filter((k) => k.length >= 7))].join(','), [contacto.telefonoPrincipal, contacto.telefonoMovil, contacto.telefonoTrabajo]);

  useEffect(() => {
    let alive = true;
    const keys = keysStr ? keysStr.split(',') : [];
    if (!keys.length) return undefined;
    Promise.all(keys.map((q) => cdrService.list({ q, page_size: 20 })))
      .then((results) => {
        if (!alive) return;
        const byId = new Map();
        results.flatMap((r) => r?.items || r || []).forEach((c) => {
          // `q` busca "contiene"; se confirma que el número coincida de verdad.
          if (keys.includes(phoneKey(c.origen)) || keys.includes(phoneKey(c.destino))) byId.set(c.id, c);
        });
        setCalls([...byId.values()].sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at))).slice(0, 10));
        setFailed(false);
      })
      .catch(() => { if (alive) { setCalls([]); setFailed(true); } });
    return () => { alive = false; };
  }, [keysStr]);

  return (
    <div className="detalle-historial">
      <h3>
        <FiClock />
        Historial de llamadas
      </h3>
      <div className="historial-list">
        {!keysStr ? (
          <p className="historial-empty">El contacto no tiene teléfonos registrados</p>
        ) : calls === null ? (
          <p className="historial-empty">Cargando…</p>
        ) : failed ? (
          <p className="historial-empty">No se pudo cargar el historial.</p>
        ) : calls.length === 0 ? (
          <p className="historial-empty">Sin llamadas registradas con este contacto</p>
        ) : (
          calls.map((c) => {
            const t = TIPO[c.tipo] || TIPO.internal;
            const Icon = t.icon;
            return (
              <div key={c.id} className="historial-item">
                <div className={`historial-icon ${t.cls}`} title={t.label}><Icon /></div>
                <div className="historial-info">
                  <span className="historial-fecha">{fmtDate(c.occurred_at)}</span>
                  <span className="historial-meta">
                    {t.label} · {fmtDur(c.duracion_seg)}{c.agente_nombre ? ` · ${c.agente_nombre}` : ''}
                    {c.disposition ? ` · ${DISPOSITION[c.disposition] || c.disposition}` : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
