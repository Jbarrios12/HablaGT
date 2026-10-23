import { FiCheck, FiMonitor, FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';
import { ACCENTS, THEME_MODES } from '../../context/themeOptions';

const MODE_ICONS = { light: FiSun, dark: FiMoon, system: FiMonitor };

// Apariencia del portal: tema claro/oscuro y color de marca. Se guarda en
// este navegador para el usuario.
const AppearanceSettings = () => {
  const { mode, accent, setMode, setAccent } = useTheme();

  return (
    <div className="setting-card appearance-card">
      <h3>Apariencia</h3>
      <p className="help-text">Elige cómo se ve el portal. Se guarda en este navegador.</p>

      <div className="appearance-group">
        <span className="appearance-label">Tema</span>
        <div className="segmented" role="radiogroup" aria-label="Tema">
          {THEME_MODES.map((m) => {
            const Icon = MODE_ICONS[m.value];
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mode === m.value}
                className={mode === m.value ? 'active' : ''}
                onClick={() => setMode(m.value)}
              >
                <Icon /> {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="appearance-group">
        <span className="appearance-label">Color principal</span>
        <div className="accent-swatches" role="radiogroup" aria-label="Color principal">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              type="button"
              role="radio"
              aria-checked={accent === a.value}
              className={`accent-swatch ${accent === a.value ? 'active' : ''}`}
              style={{ '--swatch': a.color }}
              onClick={() => setAccent(a.value)}
              title={a.label}
            >
              <span className="accent-dot">{accent === a.value && <FiCheck />}</span>
              <span className="accent-name">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
