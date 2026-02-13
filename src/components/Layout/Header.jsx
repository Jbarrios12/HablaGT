import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch,
  FiBell,
  FiUser,
  FiChevronDown,
  FiSettings,
  FiLogOut,
  FiPhone
} from 'react-icons/fi';
import './Header.css';

const Header = ({ title }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifications = [
    { id: 1, text: 'Nueva llamada entrante de +502 5555-1234', time: 'Hace 2 min', unread: true },
    { id: 2, text: 'Reporte diario generado exitosamente', time: 'Hace 1 hora', unread: true },
    { id: 3, text: 'Operadora IA: 15 llamadas atendidas', time: 'Hace 3 horas', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="header-center">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input type="text" placeholder="Buscar..." />
        </div>
      </div>

      <div className="header-right">
        {/* Estado del teléfono */}
        <div className="phone-status online">
          <FiPhone />
          <span>Disponible</span>
        </div>

        {/* Notificaciones */}
        <div className="header-dropdown">
          <button
            className="icon-btn notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <FiBell />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                className="dropdown-menu notifications-menu"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <div className="dropdown-header">
                  <span>Notificaciones</span>
                  <button className="mark-read">Marcar todo leído</button>
                </div>
                <div className="dropdown-content">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`notification-item ${notif.unread ? 'unread' : ''}`}
                    >
                      <div className="notification-dot"></div>
                      <div className="notification-text">
                        <p>{notif.text}</p>
                        <span className="notification-time">{notif.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="dropdown-footer">
                  <a href="#">Ver todas las notificaciones</a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Usuario */}
        <div className="header-dropdown">
          <button
            className="user-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-avatar">
              <FiUser />
            </div>
            <div className="user-info">
              <span className="user-name">Juan Pérez</span>
              <span className="user-role">Administrador</span>
            </div>
            <FiChevronDown className={`chevron ${showUserMenu ? 'open' : ''}`} />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                className="dropdown-menu user-menu"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <a href="#" className="menu-item">
                  <FiUser />
                  <span>Mi Perfil</span>
                </a>
                <a href="#" className="menu-item">
                  <FiSettings />
                  <span>Configuración</span>
                </a>
                <div className="menu-divider"></div>
                <a href="#" className="menu-item logout">
                  <FiLogOut />
                  <span>Cerrar Sesión</span>
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
