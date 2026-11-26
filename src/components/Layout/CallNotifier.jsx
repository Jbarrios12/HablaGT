import { useCallback, useEffect, useRef } from 'react';
import { useRealtimeEvents } from '../../hooks/useRealtimeEvents';
import { agentSelfService, contactService } from '../../services';
import { useToast } from '../../context/ToastContext';

// Aviso de llamada entrante en cualquier pantalla (antes solo en el
// Dashboard, sin respetar la preferencia y también en llamadas salientes).
// Respeta la preferencia "Notificaciones de llamada" del agente y, si el
// navegador lo permite y la pestaña no está a la vista, muestra además una
// notificación del sistema.

export const PREFS_EVENT = 'hablagt:prefs-updated';
const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-8);

export default function CallNotifier() {
  const toast = useToast();
  const enabledRef = useRef(true);
  const seenRef = useRef(new Set()); // un aviso por llamada

  useEffect(() => {
    agentSelfService.getPreferences()
      .then((p) => { enabledRef.current = p?.notificaciones !== false; })
      .catch(() => { /* sin preferencias guardadas: activadas */ });
    const onPrefs = (e) => { enabledRef.current = e.detail?.notificaciones !== false; };
    window.addEventListener(PREFS_EVENT, onPrefs);
    return () => window.removeEventListener(PREFS_EVENT, onPrefs);
  }, []);

  const notify = useCallback(async (p) => {
    const numero = p.from || 'número desconocido';
    let quien = numero;
    const key = phoneKey(p.from);
    if (key.length >= 7) {
      try {
        const res = await contactService.list({ q: key, page_size: 5 });
        const c = (res?.items || []).find((x) =>
          [x.telefono_principal, x.telefono_movil, x.telefono_trabajo].some((t) => phoneKey(t) === key));
        if (c) quien = `${c.nombre} (${numero})`;
      } catch { /* sin nombre: se muestra el número */ }
    }
    toast.info(`Llamada entrante de ${quien}`, 8000);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      try {
        const n = new Notification('Llamada entrante', { body: quien, tag: `call-${p.channel_id}` });
        n.onclick = () => { window.focus(); n.close(); };
      } catch { /* algunos navegadores solo permiten notificar desde un service worker */ }
    }
  }, [toast]);

  useRealtimeEvents(useCallback((evt) => {
    if (!evt || evt.type !== 'call.update') return;
    const p = evt.payload || {};
    if (p.ari_type !== 'StasisStart' || p.direction !== 'inbound') return;
    if (!enabledRef.current) return;
    const id = p.channel_id || `${p.from}-${p.occurred_at}`;
    if (seenRef.current.has(id)) return;
    seenRef.current.add(id);
    if (seenRef.current.size > 200) seenRef.current = new Set([...seenRef.current].slice(-100));
    notify(p);
  }, [notify]));

  return null;
}
