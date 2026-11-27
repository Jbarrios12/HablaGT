// Apariencia del portal. Los colores viven en styles/tokens.css; aquí
// solo se elige qué bloque aplicar poniendo data-theme y data-accent en
// <html>. Para un tema o color nuevo: agrégalo en tokens.css y en estas
// listas.

export const THEME_MODES = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
];

export const ACCENTS = [
  { value: 'oceano', label: 'Océano', color: '#0284c7' },
  { value: 'indigo', label: 'Índigo', color: '#4f46e5' },
  { value: 'esmeralda', label: 'Esmeralda', color: '#059669' },
  { value: 'naranja', label: 'Naranja', color: '#ea580c' },
  { value: 'violeta', label: 'Violeta', color: '#9333ea' },
];
