import { useEffect, useRef } from 'react';
import { apiBaseURL, currentTenantSlug, refreshAccessToken } from '../lib/api';
import { tokenStorage } from '../lib/tokenStorage';
import { openEventStream } from '../lib/sseClient';

// useRealtimeEvents subscribes to the backend SSE stream and invokes the
// latest onEvent callback for each parsed event. The connection is opened
// once on mount and torn down on unmount; reconnection (with backoff and
// token renewal) is handled inside the SSE client.
//
// onEvent receives a parsed object: { type, payload, tenant_id, timestamp }
// where payload is already JSON-parsed (or null).
export function useRealtimeEvents(onEvent, { enabled = true } = {}) {
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    if (!tokenStorage.getAccess()) return undefined;

    // El token y la empresa se leen en cada reconexión: el stream vive toda
    // la sesión (avisos de llamada) y el token de acceso vence antes.
    const close = openEventStream({
      url: `${apiBaseURL}/events/stream`,
      token: () => tokenStorage.getAccess(),
      tenantSlug: currentTenantSlug,
      onUnauthorized: () => refreshAccessToken().catch(() => null),
      onEvent: (frame) => {
        if (frame.event === 'ready') return; // initial hello
        let parsed;
        try {
          parsed = JSON.parse(frame.data);
        } catch {
          return;
        }
        if (parsed && typeof parsed.payload === 'string') {
          try {
            parsed.payload = JSON.parse(parsed.payload);
          } catch {
            /* leave payload as-is */
          }
        }
        handlerRef.current?.(parsed);
      },
    });

    return close;
  }, [enabled]);
}
