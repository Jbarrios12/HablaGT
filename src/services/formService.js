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
      // Si un intento anterior ya creó el formulario, se reutiliza (antes se
      // creaba otra vez y quedaba duplicado).
      let formId = f.migrated_id;
      if (!formId) {
        const { data: created } = await api.post("/forms", {
          title: f.title || "Formulario",
          description: f.description || "",
          display: f.display === "wizard" ? "wizard" : "form",
          schema: f.schema?.components ? f.schema : { components: [] },
          created_by_name: f.created_by || authorName(),
        });
        formId = created.id;
        f.migrated_id = formId;
      }
      // Cada respuesta subida se quita de la copia local al momento, así un
      // fallo a medias no las repite.
      const subs = readLegacy(legacySubsKey(f.id));
      while (subs.length) {
        const s = subs[0];
        await api.post(`/forms/${formId}/submissions`, {
          data: s.data || {},
          created_by_name: s.created_by || "",
        });
        subs.shift();
        localStorage.setItem(legacySubsKey(f.id), JSON.stringify(subs));
      }
      localStorage.removeItem(legacySubsKey(f.id));
    } catch {
      pending.push(f); // se reintenta la próxima vez (con migrated_id si ya se creó)
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
  /** Una página: { items, total }. */
  async listPage(formId, page = 1, pageSize = 50) {
    const { data } = await api.get(`/forms/${formId}/submissions`, { params: { page, page_size: pageSize } });
    return { items: data?.items || [], total: Number(data?.total) || 0 };
  },
  /** Todas las respuestas (para exportar), en páginas de 1000. */
  async listAll(formId) {
    const all = [];
    for (let page = 1; ; page++) {
      const { items, total } = await this.listPage(formId, page, 1000);
      all.push(...items);
      if (!items.length || all.length >= total) return all;
    }
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
