import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './DatePicker.css';

const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Parsea 'YYYY-MM-DD' como fecha local, evitando el corrimiento de día que
// causa `new Date(str)` al interpretarlo como UTC medianoche.
function parseFecha(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatearISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mismodia(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function diasDelMes(viewDate) {
  const año = viewDate.getFullYear();
  const mes = viewDate.getMonth();
  const primerDia = new Date(año, mes, 1);
  const ultimoDia = new Date(año, mes + 1, 0);
  const diasEnMes = ultimoDia.getDate();
  const primerDiaSemana = primerDia.getDay();
  const mesAnteriorUltimoDia = new Date(año, mes, 0).getDate();

  const dias = [];
  for (let i = primerDiaSemana - 1; i >= 0; i--) {
    dias.push({ dia: mesAnteriorUltimoDia - i, fuera: true, fecha: new Date(año, mes - 1, mesAnteriorUltimoDia - i) });
  }
  for (let i = 1; i <= diasEnMes; i++) {
    dias.push({ dia: i, fuera: false, fecha: new Date(año, mes, i) });
  }
  const diasRestantes = 42 - dias.length;
  for (let i = 1; i <= diasRestantes; i++) {
    dias.push({ dia: i, fuera: true, fecha: new Date(año, mes + 1, i) });
  }
  return dias;
}

export default function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const seleccionada = parseFecha(value);
  const [viewDate, setViewDate] = useState(seleccionada || new Date());
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (open) setViewDate(seleccionada || new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (popoverRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
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

  const toggleOpen = () => {
    if (!open) {
      const rect = triggerRef.current.getBoundingClientRect();
      const width = 288;
      let left = rect.left;
      if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
      setCoords({ top: rect.bottom + 8, left, width });
    }
    setOpen((v) => !v);
  };

  const seleccionar = (fecha) => {
    onChange(formatearISO(fecha));
    setOpen(false);
  };

  const hoy = new Date();
  const dias = diasDelMes(viewDate);
  const label = seleccionada
    ? `${seleccionada.getDate()} ${MESES_CORTOS[seleccionada.getMonth()]} ${seleccionada.getFullYear()}`
    : 'Seleccionar fecha';

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`picker-trigger ${!seleccionada ? 'placeholder' : ''}`}
        onClick={toggleOpen}
      >
        <FiCalendar className="picker-trigger-icon" />
        <span>{label}</span>
      </button>

      {open && coords && createPortal(
        <AnimatePresence>
          <motion.div
            ref={popoverRef}
            className="picker-popover date-picker-popover"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <div className="date-picker-header">
              <button type="button" className="date-picker-nav" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>
                <FiChevronLeft />
              </button>
              <span className="date-picker-month">{MESES[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
              <button type="button" className="date-picker-nav" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>
                <FiChevronRight />
              </button>
            </div>

            <div className="date-picker-weekdays">
              {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
            </div>

            <div className="date-picker-grid">
              {dias.map((d, i) => (
                <button
                  type="button"
                  key={i}
                  className={`date-picker-day ${d.fuera ? 'fuera' : ''} ${mismodia(d.fecha, hoy) ? 'hoy' : ''} ${mismodia(d.fecha, seleccionada) ? 'seleccionado' : ''}`}
                  onClick={() => seleccionar(d.fecha)}
                >
                  {d.dia}
                </button>
              ))}
            </div>

            <button type="button" className="date-picker-hoy-btn" onClick={() => seleccionar(new Date())}>
              Hoy
            </button>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
