import { api, apiBaseURL } from "../lib/api";
import { tokenStorage } from "../lib/tokenStorage";

export const softphoneService = {
  async originate(numero) {
    const { data } = await api.post("/calls/originate", { numero });
    return data;
  },
  async active() {
    const { data } = await api.get("/calls/active");
    return data;
  },
  async hangup(channelId) {
    await api.delete(`/calls/${channelId}`);
  },
  async mute(channelId, mute) {
    await api.post(`/calls/${channelId}/mute`, { mute });
  },
  async hold(channelId, hold) {
    await api.post(`/calls/${channelId}/hold`, { hold });
  },
  async transfer(channelId, destino) {
    await api.post(`/calls/${channelId}/transfer`, { destino });
  },
  audioSocketURL(channelId) {
    const base = apiBaseURL.replace(/\/api\/v1\/?$/, "");
    const wsBase = base.replace(/^http/, "ws");
    const access = tokenStorage.getAccess();
    const tenant = import.meta.env.VITE_TENANT_SLUG || "demo";
    const qs = new URLSearchParams({ Authorization: `Bearer ${access}`, "X-Tenant-Slug": tenant });
    return `${wsBase}/api/v1/calls/${channelId}/audio?${qs.toString()}`;
  },
};
