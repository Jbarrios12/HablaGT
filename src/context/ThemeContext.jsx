import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ACCENTS, THEME_MODES } from './themeOptions';

// Mismas claves que lee el script de index.html para pintar el tema
// correcto antes de que cargue React (sin destello blanco).
const MODE_KEY = 'hablagt.theme';
const ACCENT_KEY = 'hablagt.accent';

const read = (key, allowed, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return allowed.some((o) => o.value === v) ? v : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento (modo privado): el tema vale solo esta sesión.
  }
};

const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => read(MODE_KEY, THEME_MODES, 'light'));
  const [accent, setAccentState] = useState(() => read(ACCENT_KEY, ACCENTS, 'oceano'));
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Sigue al sistema operativo cuando el modo es "Sistema".
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    const root = document.documentElement;
    // Cambia todos los colores a la vez, sin transiciones a medias.
    root.classList.add('theme-switching');
    root.dataset.theme = resolved;
    root.dataset.accent = accent;
    const id = requestAnimationFrame(() => root.classList.remove('theme-switching'));
    return () => cancelAnimationFrame(id);
  }, [resolved, accent]);

  const setMode = useCallback((value) => {
    setModeState(value);
    write(MODE_KEY, value);
  }, []);

  const setAccent = useCallback((value) => {
    setAccentState(value);
    write(ACCENT_KEY, value);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setMode]);

  const value = useMemo(
    () => ({ mode, resolved, accent, setMode, setAccent, toggleMode }),
    [mode, resolved, accent, setMode, setAccent, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
