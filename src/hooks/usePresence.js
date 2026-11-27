import { useCallback, useEffect, useState } from "react";
import { agentSelfService } from "../services";

// Agent status in the portal. Only "disponible" agents receive the calls
// the campaigns' AI transfers to their human agents; with "pausa"
// (Ocupado) or "no_disponible" (Ausente) the queue hands the call to
// another free agent.
export const PRESENCE_OPTIONS = [
  { value: "disponible", label: "Disponible", css: "online" },
  { value: "pausa", label: "Ocupado", css: "busy" },
  { value: "no_disponible", label: "Ausente", css: "offline" },
];

const EVENT = "hablagt:presence";

// usePresence keeps every component showing the agent status in sync.
export function usePresence() {
  const [presence, setPresence] = useState("disponible");

  useEffect(() => {
    agentSelfService.getMyPresence()
      .then((res) => { if (res?.estado) setPresence(res.estado); })
      .catch(() => {});
    const onChange = (e) => setPresence(e.detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const changePresence = useCallback(async (estado) => {
    const previous = presence;
    window.dispatchEvent(new CustomEvent(EVENT, { detail: estado }));
    try {
      await agentSelfService.setMyPresence(estado);
      return true;
    } catch {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: previous }));
      return false;
    }
  }, [presence]);

  const current = PRESENCE_OPTIONS.find((o) => o.value === presence)
    || { value: presence, label: "En llamada", css: "busy" };

  return { presence, current, changePresence };
}
