import { api } from "../lib/api";

export const extensionService = {
  async list() {
    const { data } = await api.get("/extensions");
    return data;
  },
  async listAssignable(includeAgentId) {
    const { data } = await api.get("/extensions/assignable", {
      params: includeAgentId ? { include_agent_id: includeAgentId } : {},
    });
    return data;
  },
  async get(id) {
    const { data } = await api.get(`/extensions/${id}`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/extensions", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/extensions/${id}`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/extensions/${id}`);
  },
};
