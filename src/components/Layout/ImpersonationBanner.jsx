import { FiEye, FiLogOut } from "react-icons/fi";
import { tokenStorage } from "../../lib/tokenStorage";
import { useAuth } from "../../context/AuthContext";

export default function ImpersonationBanner() {
  const { logout } = useAuth();

  if (!tokenStorage.isImpersonating()) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        background: "#7c2d12",
        color: "#fed7aa",
        fontSize: 13,
        fontWeight: 600,
        padding: "8px 16px",
      }}
    >
      <FiEye size={14} />
      Sesión de soporte — estás viendo HablaGT como {tokenStorage.getUser()?.nombre || "este tenant"}
      <button
        onClick={logout}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginLeft: 10,
          background: "rgba(255,255,255,0.12)",
          border: "none",
          borderRadius: 6,
          color: "inherit",
          padding: "3px 10px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <FiLogOut size={12} /> Salir
      </button>
    </div>
  );
}
