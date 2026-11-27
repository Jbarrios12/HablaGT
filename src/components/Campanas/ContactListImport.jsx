import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiUpload, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { contactListService } from '../../services';
import { useToast } from '../../context/ToastContext';
import { parseCsv } from '../Contactos/contactCsv';

const MAX_ROWS = 20000;

const ContactListImport = ({ campaignId, onClose, onImported }) => {
  const toast = useToast();
  const fileRef = useRef(null);
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [nombre, setNombre] = useState('');
  const [preview, setPreview] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);

  const [rows, setRows] = useState([]);

  // Lee el CSV completo con el mismo lector de Contactos (comillas, ";" de
  // Excel en español, BOM). Antes se partía por comas a mano.
  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) {
      toast.error('Solo archivos CSV');
      return;
    }
    const all = parseCsv(await f.text());
    if (all.length < 2) {
      toast.error('El archivo no tiene filas de contactos.');
      return;
    }
    const cols = all[0].map((c) => c.trim());
    const body = all.slice(1);
    if (body.length > MAX_ROWS) {
      toast.error(`El archivo tiene ${body.length.toLocaleString('es-GT')} filas; el máximo es ${MAX_ROWS.toLocaleString('es-GT')}. Divídelo en varias listas.`);
      return;
    }
    setFile(f);
    setNombre(f.name.replace(/\.csv$/i, ''));
    setColumns(cols);
    setRows(body);
    setPreview(body.slice(0, 3));
    // Mapeo automático por nombre de columna.
    const autoMap = {};
    cols.forEach((col) => {
      if (/tel[eé]fono|phone|cel|m[oó]vil|mobile/i.test(col)) autoMap[col] = autoMap[col] || 'phone';
      else if (/nombre|name/i.test(col)) autoMap[col] = 'nombre';
      else if (/email|correo/i.test(col)) autoMap[col] = 'email';
    });
    // Solo una columna de teléfono: la primera que coincida.
    let phoneSeen = false;
    Object.keys(autoMap).forEach((k) => {
      if (autoMap[k] !== 'phone') return;
      if (phoneSeen) delete autoMap[k];
      phoneSeen = true;
    });
    setMapping(autoMap);
    setStep('map');
  };

  const phoneColumn = columns.find((c) => mapping[c] === 'phone');

  // Antes solo se guardaban el nombre y las columnas: los contactos nunca se
  // enviaban y el marcador no tenía a quién llamar.
  const handleImport = async () => {
    if (!file || !campaignId) return;
    if (!phoneColumn) {
      toast.error('Elige qué columna tiene el teléfono.');
      return;
    }
    setImporting(true);
    try {
      const phoneIdx = columns.indexOf(phoneColumn);
      const payloadRows = rows.map((r) => {
        const data = {};
        columns.forEach((col, i) => {
          if (!col) return;
          const v = (r[i] ?? '').trim();
          if (v) data[col] = v;
          // También con el nombre estándar (nombre, email) para la IA.
          const std = mapping[col];
          if (v && std && std !== 'phone') data[std] = v;
        });
        return { phone: (r[phoneIdx] ?? '').trim(), data };
      });
      const res = await contactListService.create({
        campaign_id: campaignId,
        nombre,
        file_name: file.name,
        file_size: file.size,
        columns,
        mapping,
        rows: payloadRows,
      });
      const count = res?.contact_list?.row_count ?? 0;
      const skipped = res?.skipped ?? 0;
      if (count === 0) {
        toast.error('No se importó ningún contacto: ninguna fila tiene un teléfono válido.');
      } else {
        toast.success(`${count.toLocaleString('es-GT')} contactos importados${skipped ? ` · ${skipped.toLocaleString('es-GT')} filas sin teléfono válido` : ''}`);
      }
      onImported();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Error al importar el CSV');
    } finally {
      setImporting(false);
    }
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2>Importar Contactos</h2>
          <button className="modal-close" onClick={onClose}><FiX /></button>
        </div>
        <div className="modal-body">
          {step === 'upload' && (
            <div className="csv-upload-area" onClick={() => fileRef.current?.click()}>
              <FiUpload size={32} />
              <p>Arrastra un archivo CSV aquí o haz clic para seleccionar</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} hidden />
            </div>
          )}
          {step === 'map' && (
            <>
              <label>Nombre de la lista
                <input value={nombre} onChange={e => setNombre(e.target.value)} />
              </label>
              <div className="csv-preview">
                <h4>Vista previa ({columns.length} columnas)</h4>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>{columns.map(col => <th key={col}>{col}</th>)}</tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => <td key={j}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="csv-mapping">
                <h4>Mapeo de columnas</h4>
                {columns.map(col => (
                  <div key={col} className="mapping-row">
                    <span>{col}</span>
                    <span>→</span>
                    <select value={mapping[col] || ''} onChange={e => {
                      const next = { ...mapping, [col]: e.target.value };
                      // Un solo teléfono: el marcador llama a ese número.
                      if (e.target.value === 'phone') Object.keys(next).forEach((k) => { if (k !== col && next[k] === 'phone') next[k] = ''; });
                      setMapping(next);
                    }}>
                      <option value="">Ignorar</option>
                      <option value="phone">Teléfono</option>
                      <option value="nombre">Nombre</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                ))}
              </div>
              {!phoneColumn && <p className="kb-form-error" role="alert">Elige qué columna tiene el teléfono.</p>}
              <button className="btn btn-primary" onClick={handleImport} disabled={importing || !phoneColumn}>
                {importing ? 'Importando...' : `Importar ${rows.length.toLocaleString('es-GT')} contactos`}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ContactListImport;
