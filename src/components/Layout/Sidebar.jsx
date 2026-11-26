import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome,
  FiPhone,
  FiBarChart2,
  FiUsers,
  FiCalendar,
  FiSettings,
  FiHeadphones,
  FiCpu,
  FiChevronLeft,
  FiFileText,
  FiLogOut
} from 'react-icons/fi';
import { useLoading } from '../../context/LoadingContext';
import { useAuth } from '../../context/AuthContext';
import { useModules } from '../../context/ModulesContext';
import './Sidebar.css';

const menuItems = [
  { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
  { path: '/hablaphone', icon: FiPhone, label: 'Hablaphone' },
  { path: '/reportes', icon: FiBarChart2, label: 'Reportería' },
  { path: '/agendas', icon: FiCalendar, label: 'Agendas', module: 'citas' },
  { path: '/contactos', icon: FiUsers, label: 'Contactos' },
  { path: '/campanas', icon: FiCpu, label: 'Campañas' },
  { path: '/formularios', icon: FiFileText, label: 'Formularios' },
  { path: '/ia-operadora', icon: FiHeadphones, label: 'Operadora IA' },
  { path: '/configuracion', icon: FiSettings, label: 'Configuración' },
];

// Se recuerda si el usuario dejó el menú colapsado.
const COLLAPSE_KEY = 'hablagt.sidebarCollapsed';
const readCollapsed = () => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } };

// Entre 769 y 1024 px el CSS fuerza el modo "solo iconos" (ver Sidebar.css).
const TABLET_RAIL = '(min-width: 769px) and (max-width: 1024px)';

const Sidebar = ({ mobileOpen = false, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);
  // Etiqueta flotante con el nombre de la opción en modo "solo iconos".
  // Se dibuja en <body> porque el menú tiene scroll y la recortaría.
  const [tip, setTip] = useState(null);
  const location = useLocation();

  const toggleCollapsed = () => {
    setIsCollapsed((v) => {
      try { localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1'); } catch { /* sin almacenamiento */ }
      return !v;
    });
    setTip(null);
  };

  const isRail = () => isCollapsed || window.matchMedia(TABLET_RAIL).matches;
  const showTip = (e, label) => {
    if (!isRail()) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, top: r.top + r.height / 2, left: r.right + 12 });
  };
  const hideTip = () => setTip(null);
  const tipHandlers = (label) => ({
    onMouseEnter: (e) => showTip(e, label),
    onMouseLeave: hideTip,
    onFocus: (e) => showTip(e, label),
    onBlur: hideTip,
  });

  useEffect(() => { setTip(null); }, [location.pathname]);
  const navigate = useNavigate();
  const { showLoadingFor } = useLoading();
  const { logout } = useAuth();
  const { has } = useModules();

  const handleNavClick = (e, path) => {
    onNavigate?.();
    // Solo mostrar loading si es una ruta diferente
    if (location.pathname !== path) {
      e.preventDefault();
      showLoadingFor(1200, 'Cargando...');
      setTimeout(() => {
        navigate(path);
      }, 100);
    }
  };

  const handleLogout = async () => {
    onNavigate?.();
    showLoadingFor(800, 'Cerrando sesión...');
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  return (
    <>
    <motion.aside
      className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Logo */}
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">
            <FiHeadphones />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                className="logo-text"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                HablaGT
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <button
          className="collapse-btn"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
          title={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <FiChevronLeft />
          </motion.div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <ul>
          {menuItems.filter((item) => !item.module || has(item.module)).map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
                onClick={(e) => handleNavClick(e, item.path)}
                aria-label={item.label}
                {...tipHandlers(item.label)}
              >
                <span className="nav-icon">
                  <item.icon />
                </span>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      className="nav-label"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {location.pathname === item.path && (
                  <motion.div
                    className="active-indicator"
                    layoutId="activeIndicator"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout} aria-label="Cerrar sesión" {...tipHandlers('Cerrar sesión')}>
          <span className="nav-icon">
            <FiLogOut />
          </span>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                className="nav-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Cerrar Sesión
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>

    {tip && createPortal(
      <div className="sidebar-tooltip" role="tooltip" style={{ top: tip.top, left: tip.left }}>
        {tip.label}
      </div>,
      document.body,
    )}
    </>
  );
};

export default Sidebar;
