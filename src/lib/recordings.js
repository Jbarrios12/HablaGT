import { apiBaseURL } from "./api";
import { tokenStorage } from "./tokenStorage";

// Grabaciones de llamadas: el backend las sirve en /api/v1/recordings/<canal>.wav.
// Un <audio> no puede mandar encabezados, así que el token y la empresa van
// como parámetros (el backend los acepta igual que en el audio del softphone).

const tenant = () => tokenStorage.getTenantOverride() || import.meta.env.VITE_TENANT_SLUG || "demo";

/** URL reproducible de una grabación (grabacion_url viene relativa del backend). */
export function recordingSrc(url) {
  if (!url) return "";
  const u = new URL(url, new URL(apiBaseURL).origin);
  u.searchParams.set("Authorization", `Bearer ${tokenStorage.getAccess()}`);
  u.searchParams.set("X-Tenant-Slug", tenant());
  return u.toString();
}

/**
 * Comprueba que la grabación se puede reproducir antes de darle play: un
 * <audio> que falla no dice por qué, y así el usuario ve el motivo real
 * (p. ej. "falta la URL de grabaciones en Configuración → Integraciones").
 */
export async function checkRecording(url) {
  let res;
  try {
    res = await fetch(recordingSrc(url), { headers: { Range: "bytes=0-1" } });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }
  if (res.ok) {
    res.body?.cancel?.();
    return;
  }
  if (res.status === 401) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  let msg = "No se pudo reproducir la grabación.";
  try {
    const body = await res.json();
    if (body?.error?.message) msg = body.error.message.charAt(0).toUpperCase() + body.error.message.slice(1) + ".";
  } catch {
    /* respuesta sin JSON */
  }
  throw new Error(msg);
}
