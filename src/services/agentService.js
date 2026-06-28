import { api } from "../lib/api";

export const agentSelfService = {
  async getAudioConfig() {
    const { data } = await api.get("/agents/me/audio-config");
    return data;
  },
  async setAudioConfig(payload) {
    const { data } = await api.put("/agents/me/audio-config", payload);
    return data;
  },
  async getPreferences() {
    const { data } = await api.get("/agents/me/preferences");
    return data;
  },
  async setPreferences(payload) {
    const { data } = await api.put("/agents/me/preferences", payload);
    return data;
  },
  async getSIP() {
    const { data } = await api.get("/agents/me/sip");
    return data;
  },
  async sipReconnect() {
    const { data } = await api.post("/agents/me/sip/reconnect");
    return data;
  },
  async getMyPresence() {
    const { data } = await api.get("/agents/me/status");
    return data;
  },
  async setMyPresence(estado) {
    await api.put("/agents/me/status", { estado });
  },
};

export const agentAdminService = {
  async list(params = {}) {
    const { data } = await api.get("/agents", { params });
    return data;
  },
  async get(id) {
    const { data } = await api.get(`/agents/${id}`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/agents", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/agents/${id}`, payload);
    return data;
  },
  async remove(id) {
    await api.delete(`/agents/${id}`);
  },
  async resetPassword(id, newPassword) {
    await api.post(`/agents/${id}/reset-password`, { password: newPassword });
  },
  async disable2FA(id) {
    await api.delete(`/agents/${id}/2fa`);
  },
};
