import { useEffect, useRef } from 'react';
import { apiBaseURL, apiTenantSlug } from '../lib/api';
import { tokenStorage } from '../lib/tokenStorage';
import { openEventStream } from '../lib/sseClient';

// useRealtimeEvents subscribes to the backend SSE stream and invokes the
// latest onEvent callback for each parsed event. The connection is opened
// once on mount and torn down on unmount; reconnection (with backoff) is
// handled inside the SSE client.
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
    const token = tokenStorage.getAccess();
    if (!token) return undefined;

    const close = openEventStream({
      url: `${apiBaseURL}/events/stream`,
      token,
      tenantSlug: apiTenantSlug,
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
