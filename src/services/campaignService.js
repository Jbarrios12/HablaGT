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
