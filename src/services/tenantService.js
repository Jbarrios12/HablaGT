import { api } from "../lib/api";

export const tenantService = {
  async get() {
    const { data } = await api.get("/tenant");
    return data;
  },
  async update(patch) {
    const { data } = await api.patch("/tenant", patch);
    return data;
  },
};

export const notificationService = {
  async list({ unread = false, limit = 20 } = {}) {
    const { data } = await api.get("/notifications", {
      params: { unread, limit },
    });
    return data;
  },
  async markAllRead() {
    await api.post("/notifications/mark-all-read");
  },
  async markOneRead(id) {
    await api.patch(`/notifications/${id}/read`);
  },
};
