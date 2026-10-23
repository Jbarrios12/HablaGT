import { api } from "../lib/api";

export const campaignService = {
  async list(params = {}) {
    const { data } = await api.get("/campaigns", { params });
    return data;
  },
  async get(id) {
    const { data } = await api.get(`/campaigns/${id}`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/campaigns", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/campaigns/${id}`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/campaigns/${id}`);
  },
};

export const agentIAService = {
  async list(params = {}) {
    const { data } = await api.get("/agents-ia", { params });
    return data;
  },
  async get(id) {
    const { data } = await api.get(`/agents-ia/${id}`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/agents-ia", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/agents-ia/${id}`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/agents-ia/${id}`);
  },
};

export const flowService = {
  async list(params = {}) {
    const { data } = await api.get("/flows", { params });
    return data;
  },
  async get(id) {
    const { data } = await api.get(`/flows/${id}`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/flows", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/flows/${id}`, payload);
    return data;
  },
  async deploy(id) {
    const { data } = await api.post(`/flows/${id}/deploy`);
    return data;
  },
};

export const kbCategoryService = {
  async list() {
    const { data } = await api.get("/kb-categories");
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/kb-categories", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/kb-categories/${id}`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/kb-categories/${id}`);
  },
};

export const kbDocumentService = {
  async list(params = {}) {
    const { data } = await api.get("/kb-documents", { params });
    return data;
  },
  async get(id) {
    const { data } = await api.get(`/kb-documents/${id}`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/kb-documents", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/kb-documents/${id}`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/kb-documents/${id}`);
  },
};

export const contactListService = {
  async list(params = {}) {
    const { data } = await api.get("/contact-lists", { params });
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/contact-lists", payload);
    return data;
  },
};

// Equipos CrewAI construidos desde el portal y su catálogo de herramientas.
export const crewService = {
  async list() {
    const { data } = await api.get("/ai-crews");
    return data;
  },
  async get(id) {
    const { data } = await api.get(`/ai-crews/${id}`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/ai-crews", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/ai-crews/${id}`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/ai-crews/${id}`);
  },
  async test(id, payload) {
    const { data } = await api.post(`/ai-crews/${id}/test`, payload, { timeout: 120000 });
    return data;
  },
};

export const aiToolService = {
  async list() {
    const { data } = await api.get("/ai-tools");
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/ai-tools", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/ai-tools/${id}`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/ai-tools/${id}`);
  },
  // Prueba una herramienta de base de datos (guardada o no): { ok, result | error }.
  async testSql(tool, args, password) {
    const { data } = await api.post("/ai-tools/sql-test", { tool, args, password });
    return data;
  },
};

// Monitoreo: cada ejecución de un equipo (llamada o prueba).
export const aiRunService = {
  async list(params = {}) {
    const { data } = await api.get("/ai-runs", { params });
    return data;
  },
  async stats(params = {}) {
    const { data } = await api.get("/ai-runs/stats", { params });
    return data;
  },
  async get(id) {
    const { data } = await api.get(`/ai-runs/${id}`);
    return data;
  },
  async purge(olderThanDays) {
    const { data } = await api.delete("/ai-runs", { params: { older_than_days: olderThanDays } });
    return data;
  },
};

// Catálogo de intenciones y su monitoreo.
export const intentService = {
  async list() {
    const { data } = await api.get("/ai-intents");
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/ai-intents", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/ai-intents/${id}`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/ai-intents/${id}`);
  },
  async test(payload) {
    const { data } = await api.post("/ai-intents/test", payload, { timeout: 70000 });
    return data;
  },
  async stats(params = {}) {
    const { data } = await api.get("/ai-intent-events/stats", { params });
    return data;
  },
};

// Guion de las llamadas de recordatorio de citas (por empresa).
// Módulos opcionales de la empresa (los activa el backoffice) y plantillas por giro.
export const moduleService = {
  async get() {
    const { data } = await api.get("/modules");
    return data;
  },
  async applyTemplate(businessType) {
    const { data } = await api.post("/business-templates/apply", { business_type: businessType });
    return data;
  },
};

export const reminderService = {
  async get() {
    const { data } = await api.get("/reminder-settings");
    return data;
  },
  async save(payload) {
    const { data } = await api.put("/reminder-settings", payload);
    return data;
  },
};
