import { tokenStorage } from "../lib/tokenStorage";

// Formularios dinámicos (Form.io).
//
// El backend todavía no expone /forms, así que los esquemas y respuestas se
// guardan en localStorage, separados por tenant. La API es async y tiene la
// misma forma que el resto de servicios, para que el día que exista el
// endpoint solo haya que cambiar estas funciones por llamadas a `api`:
//   GET/POST /forms, GET/PUT/DELETE /forms/:id,
//   GET/POST /forms/:id/submissions, DELETE /forms/:id/submissions/:sid

const tenant = () =>
  tokenStorage.getTenantOverride() || import.meta.env.VITE_TENANT_SLUG || "demo";
const formsKey = () => `hablagt_forms_${tenant()}`;
const subsKey = (formId) => `hablagt_form_subs_${tenant()}_${formId}`;

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const uid = () =>
  globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const now = () => new Date().toISOString();

const author = () => {
  const u = tokenStorage.getUser();
  return u?.name || u?.username || u?.email || "";
};

export const formService = {
  async list() {
    return read(formsKey())
      .map((f) => ({ ...f, submissions: read(subsKey(f.id)).length }))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },
  async get(id) {
    const form = read(formsKey()).find((f) => f.id === id);
    if (!form) throw new Error("Formulario no encontrado");
    return form;
  },
  async create({ title, description = "", display = "form", schema }) {
    const form = {
      id: uid(),
      title,
      description,
      display,
      schema: schema || { display, components: [] },
      created_at: now(),
      updated_at: now(),
      created_by: author(),
    };
    write(formsKey(), [...read(formsKey()), form]);
    return form;
  },
  async update(id, patch) {
    let updated;
    const forms = read(formsKey()).map((f) => {
      if (f.id !== id) return f;
      updated = { ...f, ...patch, id, updated_at: now() };
      return updated;
    });
    if (!updated) throw new Error("Formulario no encontrado");
    write(formsKey(), forms);
    return updated;
  },
  async remove(id) {
    write(formsKey(), read(formsKey()).filter((f) => f.id !== id));
    localStorage.removeItem(subsKey(id));
  },
};

export const formSubmissionService = {
  async list(formId) {
    return read(subsKey(formId)).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async create(formId, data) {
    const sub = { id: uid(), form_id: formId, data, created_at: now(), created_by: author() };
    write(subsKey(formId), [...read(subsKey(formId)), sub]);
    return sub;
  },
  async remove(formId, subId) {
    write(subsKey(formId), read(subsKey(formId)).filter((s) => s.id !== subId));
  },
};
