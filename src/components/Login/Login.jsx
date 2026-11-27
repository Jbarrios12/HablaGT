import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHeadphones, FiUser, FiLock, FiMail, FiEye, FiEyeOff, FiArrowRight,
  FiArrowLeft, FiShield, FiMoon, FiSun, FiCheck, FiPhoneIncoming, FiCpu,
  FiBarChart2, FiAlertCircle, FiCheckCircle,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/authService';
import Loading from '../Loading';
import './Login.css';

// "Recordarme" guarda solo el nombre de usuario (nunca la contraseña).
// Código del enlace de recuperación (?reset=...). Se quita de la barra de
// direcciones al leerlo para que no quede en el historial.
const readResetLinkToken = () => {
  try {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('reset') || '';
    if (token) {
      url.searchParams.delete('reset');
      url.searchParams.delete('tenant');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    return token;
  } catch {
    return '';
  }
};

const REMEMBER_KEY = 'hablagt.rememberUser';
const readRemembered = () => {
  try { return localStorage.getItem(REMEMBER_KEY) || ''; } catch { return ''; }
};

// El backend responde algunos errores en inglés; se muestran en español.
const ERROR_ES = [
  [/invalid credentials|unauthorized|wrong password/i, 'Usuario o contraseña incorrectos.'],
  [/locked|too many/i, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'],
  [/disabled|inactive|suspended/i, 'Tu usuario está desactivado. Contacta al administrador.'],
  [/invalid code|invalid otp|2fa/i, 'El código no es válido. Revisa tu app autenticadora.'],
  [/network error|timeout/i, 'No pudimos conectar con el servidor. Revisa tu conexión.'],
];
const toSpanish = (msg, fallback) => {
  if (!msg) return fallback;
  const hit = ERROR_ES.find(([re]) => re.test(msg));
  return hit ? hit[1] : msg;
};

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: 'easeOut' },
};

/* ---------- Piezas pequeñas ---------- */

const Alert = ({ type = 'error', children }) => (
  <motion.div
    className={`lg-alert lg-alert--${type}`}
    role={type === 'error' ? 'alert' : 'status'}
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
  >
    {type === 'error' ? <FiAlertCircle /> : <FiCheckCircle />}
    <span>{children}</span>
  </motion.div>
);

const Field = ({ id, label, icon: Icon, aside, children }) => (
  <div className="lg-field">
    <div className="lg-label-row">
      <label htmlFor={id}>{label}</label>
      {aside}
    </div>
    <div className="lg-input">
      <Icon className="lg-input-icon" aria-hidden="true" />
      {children}
    </div>
  </div>
);

const SubmitButton = ({ loading, disabled, children }) => (
  <button type="submit" className="lg-submit" disabled={loading || disabled}>
    {loading ? <span className="lg-spinner" aria-label="Cargando" /> : children}
  </button>
);

/* ---------- Vitrina del producto (panel derecho) ---------- */

const transcript = [
  { who: 'client', text: 'Hola, quiero agendar una cita para el viernes.' },
  { who: 'ai', text: 'Claro. Tengo espacio a las 10:00 o a las 15:30. ¿Cuál prefieres?' },
  { who: 'client', text: 'A las 10:00, por favor.' },
];

const Showcase = () => (
  <aside className="lg-showcase" aria-hidden="true">
    <div className="lg-showcase-grid" />

    <div className="lg-showcase-inner">
      <motion.div
        className="lg-call"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
      >
        <div className="lg-call-head">
          <div className="lg-call-avatar"><FiPhoneIncoming /></div>
          <div className="lg-call-who">
            <strong>+502 5512 3480</strong>
            <span>Llamada entrante · Operadora IA</span>
          </div>
          <span className="lg-live"><i />En vivo</span>
        </div>

        <div className="lg-wave">
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} style={{ animationDelay: `${(i % 7) * 0.12}s` }} />
          ))}
        </div>

        <div className="lg-transcript">
          {transcript.map((m, i) => (
            <motion.div
              key={i}
              className={`lg-bubble lg-bubble--${m.who}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.55, duration: 0.35 }}
            >
              {m.who === 'ai' && <span className="lg-bubble-tag">IA</span>}
              {m.text}
            </motion.div>
          ))}
        </div>

        <motion.div
          className="lg-call-result"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 + transcript.length * 0.55, duration: 0.35 }}
        >
          <FiCheck /> Cita agendada · viernes 10:00
        </motion.div>
      </motion.div>

      <motion.div
        className="lg-pitch"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <h2>Cada llamada, mejor atendida.</h2>
        <p>Tu central telefónica con operadora IA, campañas y reportes en tiempo real, en un solo lugar.</p>
        <ul>
          <li><FiCpu /> Operadora IA</li>
          <li><FiHeadphones /> Agentes y extensiones</li>
          <li><FiBarChart2 /> Reportería en vivo</li>
        </ul>
      </motion.div>
    </div>
  </aside>
);

/* ---------- Login ---------- */

const Login = () => {
  const remembered = readRemembered();
  const [formData, setFormData] = useState({ usuario: remembered, password: '' });
  const [remember, setRemember] = useState(Boolean(remembered));
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, pendingChallenge, verify2FA, cancel2FA } = useAuth();
  const { resolved, toggleMode } = useTheme();
  const [twoFACode, setTwoFACode] = useState('');

  // Recuperación de contraseña: 'login' (por defecto) | 'forgot' | 'reset'.
  // El enlace del correo de recuperación trae el código: /login?reset=...
  const [linkToken] = useState(readResetLinkToken);
  const [view, setView] = useState(linkToken ? 'reset' : 'login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState(linkToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [info, setInfo] = useState(linkToken ? 'Elige tu nueva contraseña.' : '');

  const goToLogin = () => {
    setView('login');
    setError('');
    setInfo('');
    setForgotEmail('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setInfo('');
    try {
      const data = await authService.forgotPassword(forgotEmail.trim());
      // En desarrollo el backend devuelve el token para continuar sin
      // servidor de correo; en producción responde 204 y llega por email.
      if (data && data.token) {
        setResetToken(data.token);
        setInfo('Generamos un código de recuperación. Ingresa tu nueva contraseña.');
        setView('reset');
      } else {
        setInfo('Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.');
      }
    } catch {
      // Nunca revelar si el correo existe.
      setInfo('Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setIsLoading(true);
    try {
      await authService.resetPassword(resetToken.trim(), newPassword);
      setView('login');
      setInfo('Tu contraseña fue actualizada. Inicia sesión con tu nueva contraseña.');
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'No se pudo restablecer la contraseña. El código puede haber expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const persistRemember = () => {
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, formData.usuario.trim());
      else localStorage.removeItem(REMEMBER_KEY);
    } catch { /* almacenamiento no disponible */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setInfo('');

    const result = await login(formData.usuario, formData.password);

    if (result.success) {
      persistRemember();
      if (result.requires2FA) {
        setIsLoading(false);
        return;
      }
      setIsAuthenticating(true);
      setTimeout(() => navigate('/dashboard'), 600);
    } else {
      setIsLoading(false);
      setError(toSpanish(result.error, 'Usuario o contraseña incorrectos.'));
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const result = await verify2FA(twoFACode);
    if (result.success) {
      setIsAuthenticating(true);
      setTimeout(() => navigate('/dashboard'), 600);
    } else {
      setIsLoading(false);
      setError(toSpanish(result.error, 'El código no es válido.'));
    }
  };

  if (isAuthenticating) {
    return <Loading mensaje="Autenticando..." />;
  }

  const screen = pendingChallenge ? '2fa' : view;

  const PasswordToggle = (
    <button
      type="button"
      className="lg-eye"
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      aria-pressed={showPassword}
    >
      {showPassword ? <FiEyeOff /> : <FiEye />}
    </button>
  );

  return (
    <div className="lg">
      <section className="lg-panel">
        <header className="lg-top">
          <div className="lg-brand">
            <span className="lg-logo"><FiHeadphones /></span>
            <span className="lg-wordmark">HablaGT</span>
          </div>
          <button
            type="button"
            className="lg-theme"
            onClick={toggleMode}
            aria-label={resolved === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {resolved === 'dark' ? <FiSun /> : <FiMoon />}
          </button>
        </header>

        <main className="lg-main">
          <AnimatePresence mode="wait">
            {screen === 'login' && (
              <motion.div key="login" className="lg-card" {...fade}>
                <div className="lg-heading">
                  <h1>Bienvenido de nuevo</h1>
                  <p>Ingresa a tu panel de agentes.</p>
                </div>

                <form className="lg-form" onSubmit={handleSubmit} noValidate={false}>
                  {info && <Alert type="success">{info}</Alert>}
                  {error && <Alert>{error}</Alert>}

                  <Field id="usuario" label="Usuario" icon={FiUser}>
                    <input
                      id="usuario"
                      name="usuario"
                      type="text"
                      placeholder="tu.usuario"
                      value={formData.usuario}
                      onChange={handleChange}
                      autoComplete="username"
                      autoFocus={!remembered}
                      required
                    />
                  </Field>

                  <Field
                    id="password"
                    label="Contraseña"
                    icon={FiLock}
                    aside={(
                      <button
                        type="button"
                        className="lg-link"
                        onClick={() => { setView('forgot'); setError(''); setInfo(''); }}
                      >
                        ¿La olvidaste?
                      </button>
                    )}
                  >
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      autoFocus={Boolean(remembered)}
                      required
                    />
                    {PasswordToggle}
                  </Field>

                  <label className="lg-check">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                    <span className="lg-check-box"><FiCheck /></span>
                    Recordar mi usuario
                  </label>

                  <SubmitButton loading={isLoading}>
                    Ingresar <FiArrowRight />
                  </SubmitButton>
                </form>
              </motion.div>
            )}

            {screen === '2fa' && (
              <motion.div key="2fa" className="lg-card" {...fade}>
                <span className="lg-badge-icon"><FiShield /></span>
                <div className="lg-heading">
                  <h1>Verificación en 2 pasos</h1>
                  <p>Escribe el código de 6 dígitos de tu app autenticadora.</p>
                </div>
                <form className="lg-form" onSubmit={handle2FASubmit}>
                  {error && <Alert>{error}</Alert>}
                  <div className="lg-field">
                    <label htmlFor="otp" className="lg-sr">Código de verificación</label>
                    <input
                      id="otp"
                      className="lg-otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      autoFocus
                      required
                    />
                  </div>
                  <SubmitButton loading={isLoading} disabled={twoFACode.length !== 6}>
                    Verificar <FiArrowRight />
                  </SubmitButton>
                  <button type="button" className="lg-back" onClick={() => { cancel2FA(); setTwoFACode(''); setError(''); }}>
                    <FiArrowLeft /> Usar otra cuenta
                  </button>
                </form>
              </motion.div>
            )}

            {screen === 'forgot' && (
              <motion.div key="forgot" className="lg-card" {...fade}>
                <span className="lg-badge-icon"><FiMail /></span>
                <div className="lg-heading">
                  <h1>Recuperar contraseña</h1>
                  <p>Te enviaremos instrucciones al correo de tu cuenta.</p>
                </div>
                <form className="lg-form" onSubmit={handleForgotSubmit}>
                  {error && <Alert>{error}</Alert>}
                  {info && <Alert type="success">{info}</Alert>}
                  <Field id="forgotEmail" label="Correo electrónico" icon={FiMail}>
                    <input
                      id="forgotEmail"
                      name="forgotEmail"
                      type="email"
                      placeholder="nombre@empresa.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
                      required
                    />
                  </Field>
                  <SubmitButton loading={isLoading} disabled={!forgotEmail}>
                    Enviar instrucciones
                  </SubmitButton>
                  <button type="button" className="lg-back" onClick={goToLogin}>
                    <FiArrowLeft /> Volver a iniciar sesión
                  </button>
                </form>
              </motion.div>
            )}

            {screen === 'reset' && (
              <motion.div key="reset" className="lg-card" {...fade}>
                <span className="lg-badge-icon"><FiLock /></span>
                <div className="lg-heading">
                  <h1>Nueva contraseña</h1>
                  <p>Usa al menos 8 caracteres.</p>
                </div>
                <form className="lg-form" onSubmit={handleResetSubmit}>
                  {error && <Alert>{error}</Alert>}
                  {info && <Alert type="success">{info}</Alert>}
                  <Field id="resetToken" label="Código de recuperación" icon={FiShield}>
                    <input
                      id="resetToken"
                      name="resetToken"
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      autoComplete="off"
                      required
                    />
                  </Field>
                  <Field id="newPassword" label="Nueva contraseña" icon={FiLock}>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    {PasswordToggle}
                  </Field>
                  <Field id="confirmPassword" label="Confirmar contraseña" icon={FiLock}>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </Field>
                  <SubmitButton loading={isLoading}>Restablecer contraseña</SubmitButton>
                  <button type="button" className="lg-back" onClick={goToLogin}>
                    <FiArrowLeft /> Volver a iniciar sesión
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="lg-foot">
          <span>¿Problemas para entrar? Contacta al administrador de tu empresa.</span>
          <span>© {new Date().getFullYear()} HablaGT</span>
        </footer>
      </section>

      <Showcase />
    </div>
  );
};

export default Login;
