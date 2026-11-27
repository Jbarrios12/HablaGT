// Texto de un archivo para la base de conocimiento, extraído en el navegador.
// El backend recibe solo el texto (lo divide en fragmentos y lo indexa).
// pdf.js, mammoth y jszip se cargan solo cuando se elige un archivo de ese tipo.

export const KB_MAX_FILE_BYTES = 15 * 1024 * 1024;
export const KB_ACCEPT = '.txt,.md,.csv,.pdf,.docx,.xlsx,.pptx,text/plain,text/markdown,text/csv,application/pdf,'
  + 'application/vnd.openxmlformats-officedocument.wordprocessingml.document,'
  + 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,'
  + 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

// Máximo de filas que se leen de un Excel (entre todas las hojas).
const MAX_SHEET_ROWS = 20000;

export class ExtractError extends Error {}

const ext = (name) => (name.match(/\.([^.]+)$/)?.[1] || '').toLowerCase();

/** Tipo de archivo que sabemos leer: 'text' | 'pdf' | 'docx' | 'xlsx' | 'pptx' | null. */
export function kbFileKind(file) {
  const e = ext(file.name);
  if (['txt', 'md', 'csv'].includes(e) || (file.type || '').startsWith('text/')) return 'text';
  if (e === 'pdf' || file.type === 'application/pdf') return 'pdf';
  if (e === 'docx') return 'docx';
  if (e === 'xlsx') return 'xlsx';
  if (e === 'pptx') return 'pptx';
  return null;
}

async function pdfText(file, onProgress) {
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let doc;
  try {
    doc = await task.promise;
  } catch (e) {
    task.destroy();
    if (e?.name === 'PasswordException') throw new ExtractError('El PDF tiene contraseña. Quítala y vuelve a subirlo.');
    throw new ExtractError('No se pudo leer el PDF. Puede estar dañado.');
  }
  const pages = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      let line = '';
      const lines = [];
      for (const item of content.items) {
        line += item.str ?? '';
        if (item.hasEOL) { lines.push(line); line = ''; }
      }
      if (line) lines.push(line);
      pages.push(lines.join('\n'));
      onProgress?.(i, doc.numPages);
    }
  } finally {
    task.destroy();
  }
  return pages.join('\n\n');
}

async function docxText(file) {
  const { default: mammoth } = await import('mammoth');
  try {
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return value;
  } catch {
    throw new ExtractError('No se pudo leer el documento de Word. Si es .doc (antiguo), guárdalo como .docx.');
  }
}

// ---- Excel y PowerPoint: son ZIP con XML adentro (Office Open XML).

async function openZip(file, what) {
  const { default: JSZip } = await import('jszip');
  try {
    return await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new ExtractError(`No se pudo leer el archivo de ${what}. Puede estar dañado o protegido con contraseña.`);
  }
}

const parseXml = (xml) => new DOMParser().parseFromString(xml, 'application/xml');
const byTag = (node, tag) => Array.from(node.getElementsByTagName(tag));
const numberIn = (path) => Number(path.match(/(\d+)\.xml$/)?.[1] || 0);

// "B12" -> 1 (columna B, contando desde 0)
function columnIndex(ref) {
  let n = 0;
  for (const ch of (ref || '').replace(/\d+$/, '').toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return Math.max(0, n - 1);
}

/**
 * Cada hoja como texto. Si la primera fila parece encabezado, cada fila se
 * escribe con sus nombres ("Producto: Café · Precio: Q25"): así cada
 * fragmento se entiende solo cuando el backend divide el texto.
 */
async function xlsxText(file) {
  const zip = await openZip(file, 'Excel');
  const read = async (path) => (zip.file(path) ? zip.file(path).async('string') : null);
  const shared = [];
  const sst = await read('xl/sharedStrings.xml');
  if (sst) byTag(parseXml(sst), 'si').forEach((si) => shared.push(byTag(si, 't').map((t) => t.textContent).join('')));

  // Nombres de las hojas, en el orden del libro.
  const wb = await read('xl/workbook.xml');
  const rels = await read('xl/_rels/workbook.xml.rels');
  const targets = {};
  if (rels) byTag(parseXml(rels), 'Relationship').forEach((r) => { targets[r.getAttribute('Id')] = r.getAttribute('Target'); });
  let sheets = [];
  if (wb) {
    sheets = byTag(parseXml(wb), 'sheet').map((sh) => {
      const rid = sh.getAttribute('r:id') || sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      const target = (targets[rid] || '').replace(/^\/?(xl\/)?/, '');
      return { name: sh.getAttribute('name'), path: target ? `xl/${target}` : '' };
    }).filter((sh) => sh.path);
  }
  if (!sheets.length) {
    sheets = Object.keys(zip.files).filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p))
      .sort((a, b) => numberIn(a) - numberIn(b)).map((path, i) => ({ name: `Hoja ${i + 1}`, path }));
  }

  let total = 0;
  const out = [];
  for (const sheet of sheets) {
    const xml = await read(sheet.path);
    if (!xml) continue;
    const rows = [];
    for (const row of byTag(parseXml(xml), 'row')) {
      if (total >= MAX_SHEET_ROWS) break;
      const cells = [];
      for (const c of byTag(row, 'c')) {
        const type = c.getAttribute('t');
        let val = '';
        if (type === 's') val = shared[Number(byTag(c, 'v')[0]?.textContent)] ?? '';
        else if (type === 'inlineStr') val = byTag(c, 't').map((t) => t.textContent).join('');
        else if (type === 'b') val = byTag(c, 'v')[0]?.textContent === '1' ? 'Sí' : 'No';
        else val = byTag(c, 'v')[0]?.textContent ?? '';
        cells[columnIndex(c.getAttribute('r'))] = String(val).trim();
      }
      if (cells.some(Boolean)) { rows.push(cells); total++; }
    }
    if (!rows.length) continue;
    const [first, ...rest] = rows;
    const header = first.length > 1 && first.every((v) => !v || Number.isNaN(Number(v))) && rest.length > 0;
    const lines = header
      ? rest.map((r) => first.map((h, i) => (r[i] ? `${h || `Columna ${i + 1}`}: ${r[i]}` : '')).filter(Boolean).join(' · ') + '.')
      : rows.map((r) => r.filter(Boolean).join(' · '));
    out.push(`Hoja: ${sheet.name}\n\n${lines.filter((l) => l && l !== '.').join('\n\n')}`);
  }
  if (total >= MAX_SHEET_ROWS) out.push(`(Se leyeron las primeras ${MAX_SHEET_ROWS.toLocaleString('es-GT')} filas.)`);
  return out.join('\n\n');
}

/** Texto de cada diapositiva (y sus notas), en orden. */
async function pptxText(file) {
  const zip = await openZip(file, 'PowerPoint');
  const paragraphs = async (path) => {
    const f = zip.file(path);
    if (!f) return [];
    return byTag(parseXml(await f.async('string')), 'a:p')
      .map((p) => byTag(p, 'a:t').map((t) => t.textContent).join('').trim())
      .filter(Boolean);
  };
  const slides = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => numberIn(a) - numberIn(b));
  const out = [];
  for (const [i, path] of slides.entries()) {
    const body = await paragraphs(path);
    const notes = (await paragraphs(`ppt/notesSlides/notesSlide${numberIn(path)}.xml`))
      .filter((t) => !/^\d+$/.test(t)); // el número de diapositiva
    if (!body.length && !notes.length) continue;
    out.push([`Diapositiva ${i + 1}`, ...body, ...(notes.length ? [`Notas: ${notes.join(' ')}`] : [])].join('\n'));
  }
  return out.join('\n\n');
}

/**
 * Lee el texto de un archivo .txt/.md/.csv, .pdf, .docx, .xlsx o .pptx.
 * onProgress(página, total) se llama en los PDF.
 */
export async function extractText(file, onProgress) {
  if (file.size > KB_MAX_FILE_BYTES) throw new ExtractError('El archivo supera 15 MB.');
  const kind = kbFileKind(file);
  if (!kind) {
    const old = { doc: 'Word', xls: 'Excel', ppt: 'PowerPoint' }[ext(file.name)];
    throw new ExtractError(old
      ? `Los .${ext(file.name)} antiguos no se pueden leer. En ${old}, usa "Guardar como" → .${ext(file.name)}x.`
      : 'Tipo de archivo no admitido. Usa PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx) o texto (.txt, .md, .csv).');
  }
  let text;
  if (kind === 'pdf') text = await pdfText(file, onProgress);
  else if (kind === 'docx') text = await docxText(file);
  else if (kind === 'xlsx') text = await xlsxText(file);
  else if (kind === 'pptx') text = await pptxText(file);
  else text = await file.text();
  text = text.split('\u0000').join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) {
    throw new ExtractError(kind === 'pdf'
      ? 'El PDF no tiene texto que se pueda leer (parece escaneado como imagen). Usa un PDF con texto o copia el contenido en "Escribir texto".'
      : 'El archivo no tiene texto.');
  }
  return { text, kind };
}
