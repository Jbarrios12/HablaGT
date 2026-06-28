import { useState, useEffect, useRef } from 'react';
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
import { notificationService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

const Header = ({ title }) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const loadNotifications = async () => {
    try {
      const res = await notificationService.list({ limit: 20 });
      const items = res?.items || res || [];
      setNotifications(items.map((n) => ({
        id: n.id,
        text: n.texto || n.text,
        time: n.created_at,
        unread: !n.read,
        link: n.link,
      })));
      setUnreadCount(res?.unread_count ?? items.filter((n) => !n.read).length);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
      setUnreadCount(0);
    } catch (err) {
      console.error('mark all read', err);
    }
  };

  const handleMarkOne = async (id) => {
    try {
      await notificationService.markOneRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('mark one read', err);
    }
  };

  const timeAgo = (iso) => {
    if (!iso) return '';
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'ahora';
    if (m < 60) return `Hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Hace ${h} h`;
    return new Date(iso).toLocaleDateString();
  };

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
        <div className="header-dropdown" ref={dropdownRef}>
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
                  {unreadCount > 0 && (
                    <button className="mark-read" onClick={handleMarkAllRead}>
                      Marcar todo leído
                    </button>
                  )}
                </div>
                <div className="dropdown-content">
                  {notifications.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                      Sin notificaciones
                    </div>
                  )}
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`notification-item ${notif.unread ? 'unread' : ''}`}
                      onClick={() => notif.unread && handleMarkOne(notif.id)}
                      style={{ cursor: notif.unread ? 'pointer' : 'default' }}
                    >
                      <div className="notification-dot"></div>
                      <div className="notification-text">
                        <p>{notif.text}</p>
                        <span className="notification-time">{timeAgo(notif.time)}</span>
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
              <span className="user-name">{user?.nombre || user?.username || 'Usuario'}</span>
              <span className="user-role">{user?.rol || ''}</span>
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
                <a href="/configuracion" className="menu-item">
                  <FiUser />
                  <span>Mi Perfil</span>
                </a>
                <a href="/configuracion" className="menu-item">
                  <FiSettings />
                  <span>Configuración</span>
                </a>
                <div className="menu-divider"></div>
                <a
                  href="#"
                  className="menu-item logout"
                  onClick={(e) => { e.preventDefault(); logout(); }}
                >
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
