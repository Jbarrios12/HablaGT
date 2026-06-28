import { api } from "../lib/api";

function toCSV(rows) {
  if (!rows || rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const header = cols.join(",");
  const body = rows.map((r) => cols.map((c) => escape(r[c])).join(",")).join("\n");
  return `${header}\n${body}`;
}

export const cdrService = {
  async list(params = {}) {
    const { data } = await api.get("/cdr", { params });
    return data;
  },
  async stats(params = {}) {
    const { data } = await api.get("/cdr/stats", { params });
    return data;
  },
  async get(id) {
    const { data } = await api.get(`/cdr/${id}`);
    return data;
  },
  async updateObservaciones(id, observaciones) {
    const { data } = await api.patch(`/cdr/${id}/observaciones`, { observaciones });
    return data;
  },
  async wrapUp(id, { disposition, observaciones }) {
    const { data } = await api.post(`/cdr/${id}/wrap-up`, { disposition, observaciones });
    return data;
  },
  toCSV,
};
