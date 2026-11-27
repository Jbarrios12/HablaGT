import { api } from "../lib/api";

export const contactService = {
  async list(params = {}) {
    const { data } = await api.get("/contacts", { params });
    return data;
  },
  // Todos los contactos, en bloques (el backend devuelve 50 por defecto).
  async listAll(params = {}, pageSize = 500, maxPages = 40) {
    const all = [];
    for (let page = 1; page <= maxPages; page++) {
      const { data } = await api.get("/contacts", { params: { ...params, page, page_size: pageSize } });
      const items = data?.items || data || [];
      all.push(...items);
      const total = data?.total ?? all.length;
      if (items.length < pageSize || all.length >= total) break;
    }
    return all;
  },
  async get(id) {
    const { data } = await api.get(`/contacts/${id}`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/contacts", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/contacts/${id}`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/contacts/${id}`);
  },
};

export const contactTagService = {
  async list() {
    const { data } = await api.get("/contact-tags");
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/contact-tags", payload);
    return data;
  },
  async update(key, payload) {
    const { data } = await api.put(`/contact-tags/${key}`, payload);
    return data;
  },
  async remove(key) {
    await api.delete(`/contact-tags/${key}`);
  },
};
