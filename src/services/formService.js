import { api } from "../lib/api";
import { tokenStorage } from "../lib/tokenStorage";

// Formularios dinámicos (Form.io) guardados en el backend, por tenant:
//   GET/POST /forms, GET/PUT/DELETE /forms/:id,
//   GET/POST /forms/:id/submissions, DELETE /forms/:id/submissions/:sid
// El backend toma el autor del token; created_by_name es solo el nombre a mostrar.

const authorName = () => {
  const u = tokenStorage.getUser();
  return u?.nombre || u?.name || u?.username || "";
};

// ---- Migración única desde la versión anterior (localStorage) ----
// Antes los formularios vivían en el navegador. Si quedan, se suben al
// backend una vez y se borran localmente solo los que se subieron bien.
const tenant = () =>
  tokenStorage.getTenantOverride() || import.meta.env.VITE_TENANT_SLUG || "demo";
const legacyFormsKey = () => `hablagt_forms_${tenant()}`;
const legacySubsKey = (id) => `hablagt_form_subs_${tenant()}_${id}`;
let migration = null;

const readLegacy = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
};

async function migrateLegacy() {
  const legacy = readLegacy(legacyFormsKey());
  if (!legacy.length) return;
  const pending = [];
  for (const f of legacy) {
    try {
      const { data: created } = await api.post("/forms", {
        title: f.title || "Formulario",
        description: f.description || "",
        display: f.display === "wizard" ? "wizard" : "form",
        schema: f.schema?.components ? f.schema : { components: [] },
        created_by_name: f.created_by || authorName(),
      });
      for (const s of readLegacy(legacySubsKey(f.id))) {
        await api.post(`/forms/${created.id}/submissions`, {
          data: s.data || {},
          created_by_name: s.created_by || "",
        });
      }
      localStorage.removeItem(legacySubsKey(f.id));
    } catch {
      pending.push(f); // se reintenta la próxima vez
    }
  }
  if (pending.length) localStorage.setItem(legacyFormsKey(), JSON.stringify(pending));
  else localStorage.removeItem(legacyFormsKey());
}

export const formService = {
  async list(params = {}) {
    if (!migration) migration = migrateLegacy().catch(() => {});
    await migration;
    const { data } = await api.get("/forms", { params });
    return data?.items || [];
  },
  async get(id) {
    const { data } = await api.get(`/forms/${id}`);
    return data;
  },
  async create({ title, description = "", display = "form", schema }) {
    const { data } = await api.post("/forms", {
      title,
      description,
      display,
      schema: schema || { display, components: [] },
      created_by_name: authorName(),
    });
    return data;
  },
  async update(id, { title, description = "", display = "form", schema }) {
    const { data } = await api.put(`/forms/${id}`, { title, description, display, schema });
    return data;
  },
  async remove(id) {
    await api.delete(`/forms/${id}`);
  },
};

export const formSubmissionService = {
  async list(formId, params = {}) {
    const { data } = await api.get(`/forms/${formId}/submissions`, { params });
    return data?.items || [];
  },
  // context (opcional): { contact_id, phone, call_ref, source: 'manual'|'call' }.
  // Si hay teléfono y no contact_id, el backend busca el contacto por teléfono.
  async create(formId, data, context = {}) {
    const { data: created } = await api.post(`/forms/${formId}/submissions`, {
      data,
      ...context,
      created_by_name: authorName(),
    });
    return created;
  },
  // Respuestas de cualquier formulario por { contact_id | phone | call_ref }.
  async search(params) {
    const { data } = await api.get("/form-submissions", { params });
    return data?.items || [];
  },
  async remove(formId, subId) {
    await api.delete(`/forms/${formId}/submissions/${subId}`);
  },
};
