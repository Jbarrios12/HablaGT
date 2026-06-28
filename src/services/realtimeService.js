import { api } from "../lib/api";

export const realtimeService = {
  async start(callId, { provider, voice_id, system_prompt, first_message, language }) {
    const { data } = await api.post(`/calls/${callId}/ai`, {
      provider,
      voice_id,
      system_prompt,
      first_message,
      language,
    });
    return data;
  },
  async stop(callId) {
    await api.delete(`/calls/${callId}/ai`);
  },
  async get(callId) {
    const { data } = await api.get(`/calls/${callId}/ai`);
    return data;
  },
  async say(callId, text) {
    await api.post(`/calls/${callId}/ai/say`, { text });
  },
  async transcript(callId, since) {
    const { data } = await api.get(`/calls/${callId}/ai/transcript`, {
      params: since ? { since } : {},
    });
    return data;
  },
  async list() {
    const { data } = await api.get("/calls/ai");
    return data;
  },
};
