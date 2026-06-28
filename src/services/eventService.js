import { api } from "../lib/api";

export const eventService = {
  async list(params = {}) {
    const { data } = await api.get("/events", { params });
    return data;
  },
  async get(id) {
    const { data } = await api.get(`/events/${id}`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/events", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/events/${id}`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/events/${id}`);
  },
  async complete(id) {
    const { data } = await api.patch(`/events/${id}/complete`);
    return data;
  },
};

export const eventTypeService = {
  async list() {
    const { data } = await api.get("/event-types");
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/event-types", payload);
    return data;
  },
  async update(key, payload) {
    const { data } = await api.put(`/event-types/${key}`, payload);
    return data;
  },
  async remove(key) {
    await api.delete(`/event-types/${key}`);
  },
};
