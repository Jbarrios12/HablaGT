import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { tokenStorage } from "../../lib/tokenStorage";
import Loading from "../Loading";

// Entry point for backoffice-initiated support sessions: HablaGT-Backoffice
// opens this route in a new tab as
//   /impersonate#token=<short-lived access token>
// The token has no refresh token attached (15 min TTL) — this page's only
// job is to adopt it, resolve who it belongs to, and hand off to the normal
// authenticated app via a hard reload (so AuthProvider bootstraps fresh from
// localStorage exactly like a normal page load).
function getTokenFromHash() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("token");
}

export default function ImpersonateEntry() {
  const [error, setError] = useState(() =>
    getTokenFromHash() ? "" : "Enlace de impersonación inválido: falta el token.",
  );

  useEffect(() => {
    const token = getTokenFromHash();
    if (!token) return;

    tokenStorage.setAccess(token);

    api
      .get("/auth/me")
      .then((res) => {
        const profile = res.data ?? res;
        tokenStorage.setTenantOverride(profile.tenant?.slug || "");
        tokenStorage.setImpersonating();
        tokenStorage.setUser({
          id: profile.id,
          email: profile.email,
          nombre: profile.full_name || profile.fullName,
          rol: profile.role,
          tenant: profile.tenant,
          extension: profile.extension,
        });
        window.location.replace("/dashboard");
      })
      .catch(() => {
        tokenStorage.clear();
        setError("No se pudo iniciar la sesión de soporte. El enlace pudo haber expirado.");
      });
  }, []);

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: 12,
          color: "#0f172a",
          textAlign: "center",
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: "1.3rem" }}>No se pudo entrar como este tenant</h2>
        <p style={{ color: "#64748b", maxWidth: 380 }}>{error}</p>
        <a href="/login" style={{ color: "#2563eb" }}>
          Ir al login
        </a>
      </div>
    );
  }

  return <Loading mensaje="Iniciando sesión de soporte..." />;
}
