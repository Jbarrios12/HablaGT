// Celda CSV segura. Excel ejecuta como fórmula un texto que empieza con
// =, +, -, @, tab o retorno (p. ej. "=HYPERLINK(...)" importado en un
// contacto), así que se antepone un apóstrofo. Teléfonos y números
// ("+502 5555-1234", "-15") se dejan tal cual.
const PLAIN_NUMBER = /^[+-]?[\d\s().-]+$/;

export function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s) && !PLAIN_NUMBER.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
