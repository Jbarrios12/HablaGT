import { api } from "../lib/api";

export const contactService = {
  async list(params = {}) {
    const { data } = await api.get("/contacts", { params });
    return data;
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
