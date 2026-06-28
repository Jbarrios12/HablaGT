import { createContext, useContext, useCallback, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiCheckCircle,
  HiXCircle,
  HiInformationCircle,
  HiExclamation,
  HiX,
} from 'react-icons/hi';
import './ToastContext.css';

const ToastContext = createContext(null);

const ICONS = {
  success: HiCheckCircle,
  error: HiXCircle,
  info: HiInformationCircle,
  warning: HiExclamation,
};

const DEFAULT_DURATION = 4000;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info', duration = DEFAULT_DURATION) => {
      if (!message) return;
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message: String(message), type }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
      return id;
    },
    [remove]
  );

  // Stable API: toast.success / error / info / warning.
  const toast = useMemo(() => ({
    show: (m, type, d) => push(m, type, d),
    success: (m, d) => push(m, 'success', d),
    error: (m, d) => push(m, 'error', d),
    info: (m, d) => push(m, 'info', d),
    warning: (m, d) => push(m, 'warning', d),
    dismiss: remove,
  }), [push, remove]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="toast-container" aria-live="polite" aria-atomic="false">
          <AnimatePresence initial={false}>
            {toasts.map((t) => {
              const Icon = ICONS[t.type] || HiInformationCircle;
              return (
                <motion.div
                  key={t.id}
                  className={`toast toast-${t.type}`}
                  role={t.type === 'error' ? 'alert' : 'status'}
                  initial={{ opacity: 0, x: 60, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 60, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  layout
                >
                  <Icon className="toast-icon" />
                  <span className="toast-message">{t.message}</span>
                  <button className="toast-close" onClick={() => remove(t.id)} aria-label="Cerrar">
                    <HiX />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

// useToast returns the toast API: .success/.error/.info/.warning/.show/.dismiss.
// Co-located with the provider to mirror AuthContext/LoadingContext.
// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

export default ToastContext;
