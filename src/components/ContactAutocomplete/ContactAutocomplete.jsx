import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiUser } from 'react-icons/fi';
import { contactService } from '../../services';
import './ContactAutocomplete.css';

const MAX_SUGERENCIAS = 8;

export default function ContactAutocomplete({ value, onChange, onSelect, placeholder }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [contactos, setContactos] = useState([]);
  const [cargado, setCargado] = useState(false);
  const inputRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    let activo = true;
    contactService.list({ page_size: 200 }).then((res) => {
      if (!activo) return;
      setContactos(res?.items || []);
      setCargado(true);
    }).catch(() => setCargado(true));
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (popoverRef.current?.contains(e.target) || inputRef.current?.contains(e.target)) return;
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

  const abrir = () => {
    const rect = inputRef.current.getBoundingClientRect();
    const width = rect.width;
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    setCoords({ top: rect.bottom + 8, left, width });
    setOpen(true);
  };

  const seleccionar = (contacto) => {
    onSelect(contacto);
    setOpen(false);
    inputRef.current?.blur();
  };

  const filtro = (value || '').trim().toLowerCase();
  const sugerencias = filtro
    ? contactos.filter((c) => c.nombre?.toLowerCase().includes(filtro)).slice(0, MAX_SUGERENCIAS)
    : contactos.slice(0, MAX_SUGERENCIAS);

  return (
    <>
      <input
        type="text"
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); if (!open) abrir(); }}
        onFocus={abrir}
      />

      {open && coords && createPortal(
        <AnimatePresence>
          <motion.div
            ref={popoverRef}
            className="picker-popover contact-autocomplete-popover"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            {!cargado ? (
              <div className="contact-autocomplete-empty">Cargando contactos…</div>
            ) : sugerencias.length === 0 ? (
              <div className="contact-autocomplete-empty">
                {contactos.length === 0 ? 'No hay contactos registrados' : 'Sin coincidencias — se guardará el nombre escrito'}
              </div>
            ) : (
              sugerencias.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className="contact-autocomplete-item"
                  onClick={() => seleccionar(c)}
                >
                  <span className="contact-autocomplete-avatar"><FiUser /></span>
                  <span className="contact-autocomplete-info">
                    <span className="contact-autocomplete-nombre">{c.nombre}</span>
                    {c.telefono_principal && <span className="contact-autocomplete-telefono">{c.telefono_principal}</span>}
                  </span>
                </button>
              ))
            )}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
