import { api } from "../lib/api";

export const dashboardService = {
  async summary(params = {}) {
    const { data } = await api.get("/dashboard/summary", { params });
    return data;
  },
  async aiStats(params = {}) {
    const { data } = await api.get("/dashboard/ai-stats", { params });
    return data;
  },
};
