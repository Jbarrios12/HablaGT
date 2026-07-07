import { useState } from 'react';
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
  FiLogOut
} from 'react-icons/fi';
import { useLoading } from '../../context/LoadingContext';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const menuItems = [
  { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
  { path: '/hablaphone', icon: FiPhone, label: 'Hablaphone' },
  { path: '/reportes', icon: FiBarChart2, label: 'Reportería' },
  { path: '/agendas', icon: FiCalendar, label: 'Agendas' },
  { path: '/contactos', icon: FiUsers, label: 'Contactos' },
  { path: '/ia-operadora', icon: FiCpu, label: 'Operadora IA' },
  { path: '/configuracion', icon: FiSettings, label: 'Configuración' },
];

const Sidebar = ({ mobileOpen = false, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { showLoadingFor } = useLoading();
  const { logout } = useAuth();

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
          onClick={() => setIsCollapsed(!isCollapsed)}
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
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
                onClick={(e) => handleNavClick(e, item.path)}
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
        <button className="logout-btn" onClick={handleLogout}>
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
  );
};

export default Sidebar;
