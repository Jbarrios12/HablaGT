import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch,
  FiBell,
  FiUser,
  FiChevronDown,
  FiSettings,
  FiLogOut,
  FiPhone,
  FiMenu,
  FiMoon,
  FiSun
} from 'react-icons/fi';
import { notificationService } from '../../services';
import { PRESENCE_OPTIONS, usePresence } from '../../hooks/usePresence';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './Header.css';

const Header = ({ title, onMenuClick }) => {
  const { user, logout } = useAuth();
  const { resolved: theme, toggleMode } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const presenceRef = useRef(null);
  const [showPresence, setShowPresence] = useState(false);
  const { presence, current: currentPresence, changePresence } = usePresence();

  useEffect(() => {
    const onClick = (e) => {
      if (presenceRef.current && !presenceRef.current.contains(e.target)) setShowPresence(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

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
        <button className="icon-btn menu-toggle" onClick={onMenuClick} aria-label="Abrir menú">
          <FiMenu />
        </button>
        <h1 className="page-title">{title}</h1>
      </div>

      <div className="header-center">
        <div className="header-search">
          <FiSearch className="search-icon" />
          <input type="text" placeholder="Buscar..." />
        </div>
      </div>

      <div className="header-right">
        {/* Estado del agente (recibe transferencias solo si está Disponible) */}
        <div className="presence-wrap" ref={presenceRef}>
          <button
            type="button"
            className={`phone-status ${currentPresence.css}`}
            onClick={() => setShowPresence((v) => !v)}
            title="Cambiar mi estado"
          >
            <FiPhone />
            <span>{currentPresence.label}</span>
            <FiChevronDown />
          </button>
          {showPresence && (
            <div className="presence-menu">
              {PRESENCE_OPTIONS.map((o) => (
                <button
                  type="button"
                  key={o.value}
                  className={`presence-option ${o.value === presence ? 'active' : ''}`}
                  onClick={() => { setShowPresence(false); changePresence(o.value); }}
                >
                  <span className={`presence-dot ${o.css}`} />
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tema claro / oscuro (más opciones en Configuración → General) */}
        <button
          type="button"
          className="icon-btn theme-toggle"
          onClick={toggleMode}
          title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        >
          {theme === 'dark' ? <FiSun /> : <FiMoon />}
        </button>

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
