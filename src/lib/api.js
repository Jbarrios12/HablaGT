import axios from "axios";
import { tokenStorage } from "./tokenStorage";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";
const tenantSlug = import.meta.env.VITE_TENANT_SLUG || "demo";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const access = tokenStorage.getAccess();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  if (tenantSlug) {
    config.headers["X-Tenant-Slug"] = tenantSlug;
  }
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (response) => {
    // The API wraps most responses in a standard envelope:
    //   { success: boolean, data: <payload>, meta: {...} }
    // Unwrap it so callers (services/components) receive <payload> directly.
    // Non-enveloped bodies (e.g. the raw auth/login response, 204s) have no
    // boolean `success` field and are left untouched.
    const body = response.data;
    if (body && typeof body === 'object' && typeof body.success === 'boolean' && 'data' in body) {
      response.data = body.data;
    }
    return response;
  },
  async (error) => {
    const original = error.config || {};
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = tokenStorage.getRefresh();
      if (refresh) {
        try {
          refreshing = refreshing || axios.post(
            `${baseURL}/auth/refresh`,
            { refresh_token: refresh },
            { headers: { "X-Tenant-Slug": tenantSlug } }
          );
          const res = await refreshing;
          refreshing = null;
          // The refresh endpoint returns the shared envelope
          // ({ success, data: { access_token, ... } }), while login returns
          // the tokens at the top level. Accept either shape.
          const body = res.data?.data ?? res.data;
          if (body?.access_token) {
            tokenStorage.setAccess(body.access_token);
            if (body?.refresh_token) {
              tokenStorage.setTokens(body.access_token, body.refresh_token);
            }
            original.headers.Authorization = `Bearer ${body.access_token}`;
            return api(original);
          }
        } catch (e) {
          refreshing = null;
          tokenStorage.clear();
          if (typeof window !== "undefined" && window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
      } else if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const apiBaseURL = baseURL;
export const apiTenantSlug = tenantSlug;
