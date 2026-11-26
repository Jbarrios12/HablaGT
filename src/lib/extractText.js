// Texto de un archivo para la base de conocimiento, extraído en el navegador.
// El backend recibe solo el texto (lo divide en fragmentos y lo indexa).
// pdf.js y mammoth se cargan solo cuando se elige un PDF o un Word.

export const KB_MAX_FILE_BYTES = 15 * 1024 * 1024;
export const KB_ACCEPT = '.txt,.md,.csv,.pdf,.docx,text/plain,text/markdown,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export class ExtractError extends Error {}

const ext = (name) => (name.match(/\.([^.]+)$/)?.[1] || '').toLowerCase();

/** Tipo de archivo que sabemos leer: 'text' | 'pdf' | 'docx' | null. */
export function kbFileKind(file) {
  const e = ext(file.name);
  if (['txt', 'md', 'csv'].includes(e) || (file.type || '').startsWith('text/')) return 'text';
  if (e === 'pdf' || file.type === 'application/pdf') return 'pdf';
  if (e === 'docx') return 'docx';
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

/**
 * Lee el texto de un archivo .txt/.md/.csv, .pdf o .docx.
 * onProgress(página, total) se llama en los PDF.
 */
export async function extractText(file, onProgress) {
  if (file.size > KB_MAX_FILE_BYTES) throw new ExtractError('El archivo supera 15 MB.');
  const kind = kbFileKind(file);
  if (!kind) {
    throw new ExtractError(ext(file.name) === 'doc'
      ? 'Los .doc antiguos no se pueden leer. En Word, usa "Guardar como" → .docx.'
      : 'Tipo de archivo no admitido. Usa PDF, Word (.docx) o texto (.txt, .md, .csv).');
  }
  let text;
  if (kind === 'pdf') text = await pdfText(file, onProgress);
  else if (kind === 'docx') text = await docxText(file);
  else text = await file.text();
  text = text.split('\u0000').join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) {
    throw new ExtractError(kind === 'pdf'
      ? 'El PDF no tiene texto que se pueda leer (parece escaneado como imagen). Usa un PDF con texto o copia el contenido en "Escribir texto".'
      : 'El archivo no tiene texto.');
  }
  return { text, kind };
}
