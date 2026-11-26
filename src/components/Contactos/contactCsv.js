// Importar / exportar contactos en CSV (se abre bien en Excel).

const MAX_IMPORT_ROWS = 2000;

// Encabezados aceptados (sin acentos, minúsculas) → campo del contacto.
const HEADER_MAP = {
  nombre: 'nombre', name: 'nombre', 'nombre completo': 'nombre',
  empresa: 'empresa', company: 'empresa', compania: 'empresa',
  telefono: 'telefonoPrincipal', 'telefono principal': 'telefonoPrincipal', telefono_principal: 'telefonoPrincipal', phone: 'telefonoPrincipal', celular: 'telefonoMovil',
  movil: 'telefonoMovil', 'telefono movil': 'telefonoMovil', telefono_movil: 'telefonoMovil', mobile: 'telefonoMovil',
  trabajo: 'telefonoTrabajo', 'telefono trabajo': 'telefonoTrabajo', telefono_trabajo: 'telefonoTrabajo', work: 'telefonoTrabajo',
  email: 'email', correo: 'email', 'correo electronico': 'email', 'e-mail': 'email',
  direccion: 'direccion', address: 'direccion',
  notas: 'notas', notes: 'notas', observaciones: 'notas',
  etiquetas: 'etiquetas', tags: 'etiquetas', categorias: 'etiquetas',
};

const normalize = (s) => String(s || '').trim().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

// CSV con comillas, comillas dobles escapadas y saltos de línea en campos.
// Detecta "," o ";" (Excel en español suele guardar con ";").
export function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] || '';
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"' && clean[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === sep) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/**
 * Convierte el texto de un CSV en contactos listos para crear.
 * Devuelve { contacts: [{ fila, data }], errors: [{ fila, motivo }], unknownHeaders }.
 * `tagKeyFor(label)` traduce el nombre de una etiqueta a su clave (o null).
 */
export function parseContactsCsv(text, tagKeyFor) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { contacts: [], errors: [{ fila: 1, motivo: 'El archivo no tiene filas de datos' }], unknownHeaders: [] };
  const headers = rows[0].map((h) => HEADER_MAP[normalize(h)] || null);
  const unknownHeaders = rows[0].filter((h, i) => !headers[i] && h.trim());
  if (!headers.includes('nombre') || !headers.includes('telefonoPrincipal')) {
    return { contacts: [], errors: [{ fila: 1, motivo: 'Faltan las columnas obligatorias "Nombre" y "Teléfono"' }], unknownHeaders };
  }
  const contacts = [], errors = [];
  rows.slice(1, MAX_IMPORT_ROWS + 1).forEach((cells, idx) => {
    const fila = idx + 2;
    const c = {};
    headers.forEach((key, i) => { if (key) c[key] = (cells[i] || '').trim(); });
    if (!c.nombre) return errors.push({ fila, motivo: 'sin nombre' });
    if (!c.telefonoPrincipal) return errors.push({ fila, motivo: 'sin teléfono' });
    if (c.email && !c.email.includes('@')) return errors.push({ fila, motivo: 'correo no válido' });
    const etiquetas = (c.etiquetas || '').split(/[|,;]/).map((t) => t.trim()).filter(Boolean)
      .map((t) => tagKeyFor(t)).filter(Boolean);
    contacts.push({
      fila,
      data: {
        nombre: c.nombre,
        empresa: c.empresa || '',
        telefono_principal: c.telefonoPrincipal,
        telefono_movil: c.telefonoMovil || '',
        telefono_trabajo: c.telefonoTrabajo || '',
        email: c.email || '',
        direccion: c.direccion || '',
        notas: c.notas || '',
        etiquetas,
      },
    });
  });
  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    errors.push({ fila: MAX_IMPORT_ROWS + 2, motivo: `solo se importan ${MAX_IMPORT_ROWS} filas por archivo` });
  }
  return { contacts, errors, unknownHeaders };
}

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Descarga los contactos como CSV. `tagLabel(key)` traduce claves de etiqueta. */
export function downloadContactsCsv(contactos, tagLabel) {
  const header = ['Nombre', 'Empresa', 'Teléfono', 'Móvil', 'Trabajo', 'Correo', 'Dirección', 'Etiquetas', 'Notas'];
  const lines = contactos.map((c) => [
    c.nombre, c.empresa, c.telefonoPrincipal, c.telefonoMovil, c.telefonoTrabajo,
    c.email, c.direccion, (c.etiquetas || []).map(tagLabel).join('|'), c.notas,
  ].map(esc).join(','));
  const csv = '\uFEFF' + [header.map(esc).join(','), ...lines].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `contactos-${new Date().toLocaleDateString('sv-SE')}.csv`, // AAAA-MM-DD local
  });
  a.click();
  URL.revokeObjectURL(url);
}

/** Plantilla de ejemplo para importar. */
export function downloadTemplateCsv() {
  const csv = '\uFEFF' + [
    ['Nombre', 'Empresa', 'Teléfono', 'Móvil', 'Correo', 'Etiquetas', 'Notas'].map(esc).join(','),
    ['Ana López', 'Comercial ABC', '+502 5555-1234', '', 'ana@ejemplo.com', 'cliente', 'Prefiere llamadas por la mañana'].map(esc).join(','),
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'plantilla-contactos.csv' });
  a.click();
  URL.revokeObjectURL(url);
}
