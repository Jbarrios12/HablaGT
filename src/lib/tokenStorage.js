const ACCESS_KEY = "hablagt_access";
const REFRESH_KEY = "hablagt_refresh";
const USER_KEY = "hablagt_user";
// Overrides VITE_TENANT_SLUG for the current session only — set when
// entering via a backoffice impersonation link, so requests are scoped to
// the impersonated tenant instead of whatever this build's .env hardcodes.
const TENANT_OVERRIDE_KEY = "hablagt_tenant_override";
const IMPERSONATION_KEY = "hablagt_impersonation";

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY) || "",
  getRefresh: () => localStorage.getItem(REFRESH_KEY) || "",
  setTokens: (access, refresh) => {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  setAccess: (access) => {
    if (access) localStorage.setItem(ACCESS_KEY, access);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(TENANT_OVERRIDE_KEY);
    localStorage.removeItem(IMPERSONATION_KEY);
  },
  getUser: () => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearUser: () => localStorage.removeItem(USER_KEY),

  getTenantOverride: () => localStorage.getItem(TENANT_OVERRIDE_KEY) || "",
  setTenantOverride: (slug) => {
    if (slug) localStorage.setItem(TENANT_OVERRIDE_KEY, slug);
  },

  isImpersonating: () => localStorage.getItem(IMPERSONATION_KEY) === "1",
  setImpersonating: () => localStorage.setItem(IMPERSONATION_KEY, "1"),
};
