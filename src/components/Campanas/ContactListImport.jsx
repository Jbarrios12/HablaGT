import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiUpload, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { contactListService } from '../../services';
import { useToast } from '../../context/ToastContext';

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

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      toast.error('Solo archivos CSV');
      return;
    }
    setFile(f);
    setNombre(f.name.replace('.csv', ''));
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').filter(Boolean);
      if (lines.length > 0) {
        const cols = lines[0].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        setColumns(cols);
        setPreview(lines.slice(1, 4).map(l =>
          l.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        ));
        // Auto-map
        const autoMap = {};
        cols.forEach(col => {
          const cl = col.toLowerCase();
          if (/tel[eé]fono|phone|cel|mobile|contacto/i.test(cl)) autoMap[col] = 'phone';
          if (/nombre|name/i.test(cl) && !autoMap[col]) autoMap[col] = 'nombre';
          if (/email|correo/i.test(cl)) autoMap[col] = 'email';
        });
        setMapping(autoMap);
      }
      setStep('map');
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file || !campaignId) return;
    setImporting(true);
    try {
      // Read full CSV content
      const text = await file.text();
      await contactListService.create({
        campaign_id: campaignId,
        nombre,
        file_name: file.name,
        file_size: file.size,
        columns,
        mapping,
      });
      toast.success('Lista de contactos importada');
      onImported();
    } catch (e) {
      toast.error('Error al importar CSV');
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
                    <select value={mapping[col] || ''} onChange={e => setMapping({ ...mapping, [col]: e.target.value })}>
                      <option value="">Ignorar</option>
                      <option value="phone">Teléfono</option>
                      <option value="nombre">Nombre</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                {importing ? 'Importando...' : 'Importar'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ContactListImport;
