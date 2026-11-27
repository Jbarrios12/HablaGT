import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiClock } from 'react-icons/fi';
import './TimePicker.css';

// Horarios cada 30 minutos: 00:00, 00:30, 01:00, ... 23:30
const HORARIOS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

function formatear12h(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const periodo = h >= 12 ? 'p.m.' : 'a.m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${periodo}`;
}

export default function TimePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (popoverRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // Cierra si se hace scroll FUERA del popover (ej. el modal se desplaza);
    // el scroll interno de la lista (incluyendo el scrollIntoView de abajo)
    // no debe cerrarlo.
    const onScrollOrResize = (e) => {
      if (e.type === 'scroll' && popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    if (open && listRef.current) {
      const activo = listRef.current.querySelector('.time-picker-item.activo');
      activo?.scrollIntoView({ block: 'center' });
    }
  }, [open]);

  const toggleOpen = () => {
    console.log('[TimePicker] toggleOpen called, open=', open, 'triggerRef=', triggerRef.current);
    if (!open) {
      const rect = triggerRef.current.getBoundingClientRect();
      console.log('[TimePicker] rect=', rect);
      const width = 160;
      let left = rect.left;
      if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
      setCoords({ top: rect.bottom + 8, left, width });
    }
    setOpen((v) => !v);
  };

  const seleccionar = (hora) => {
    onChange(hora);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`picker-trigger ${!value ? 'placeholder' : ''}`}
        onClick={toggleOpen}
      >
        <FiClock className="picker-trigger-icon" />
        <span>{value ? formatear12h(value) : 'Seleccionar hora'}</span>
      </button>

      {open && coords && createPortal(
        <AnimatePresence>
          <motion.div
            ref={popoverRef}
            className="picker-popover time-picker-popover"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <div className="time-picker-list" ref={listRef}>
              {HORARIOS.map((h) => (
                <button
                  type="button"
                  key={h}
                  className={`time-picker-item ${h === value ? 'activo' : ''}`}
                  onClick={() => seleccionar(h)}
                >
                  {formatear12h(h)}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
