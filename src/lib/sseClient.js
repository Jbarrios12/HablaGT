// Minimal Server-Sent Events client built on fetch + ReadableStream.
//
// The browser's native EventSource cannot send custom headers, but the
// backend SSE endpoint (GET /events/stream) requires both an
// Authorization bearer token and the X-Tenant-Slug header. This client
// streams the response with fetch and parses the SSE frames manually so
// we can authenticate the connection.

// parseFrame turns a raw SSE block ("event: x\ndata: {...}") into
// { event, data }. Lines starting with ":" are comments (keep-alives).
function parseFrame(block) {
  let event = 'message';
  const dataLines = [];
  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    const idx = line.indexOf(':');
    const field = idx === -1 ? line : line.slice(0, idx);
    const value = idx === -1 ? '' : line.slice(idx + 1).replace(/^ /, '');
    if (field === 'event') event = value;
    else if (field === 'data') dataLines.push(value);
  }
  return { event, data: dataLines.join('\n') };
}

// openEventStream connects and invokes onEvent({ event, data }) for each
// frame. Returns a function that closes the connection. It auto-reconnects
// with backoff until close() is called.
export function openEventStream({ url, token, tenantSlug, onEvent, onOpen, onError }) {
  let controller = null;
  let closed = false;
  let backoff = 1000;
  const maxBackoff = 30000;

  const connect = async () => {
    if (closed) return;
    controller = new AbortController();
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}),
        },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`SSE responded ${res.status}`);
      }
      backoff = 1000; // reset after a successful connect
      if (onOpen) onOpen();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const frame = parseFrame(block);
          if (frame.data || frame.event !== 'message') onEvent(frame);
        }
      }
    } catch (err) {
      if (closed || (err && err.name === 'AbortError')) return;
      if (onError) onError(err);
    }
    // Schedule a reconnect unless we were explicitly closed.
    if (!closed) {
      setTimeout(connect, backoff);
      backoff = Math.min(backoff * 2, maxBackoff);
    }
  };

  connect();

  return () => {
    closed = true;
    if (controller) controller.abort();
  };
}
