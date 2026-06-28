import { api } from "../lib/api";

export const integrationService = {
  async get(tenantId) {
    const { data } = await api.get(`/tenants/${tenantId}/integration`);
    return data;
  },
  async update(tenantId, payload) {
    const { data } = await api.put(`/tenants/${tenantId}/integration`, payload);
    return data;
  },
};
