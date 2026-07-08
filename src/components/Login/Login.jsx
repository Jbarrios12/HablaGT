import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineArrowRight,
} from 'react-icons/hi';
import { FiHeadphones, FiUser } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import Loading from '../Loading';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    usuario: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);
  const navigate = useNavigate();
  const { login, pendingChallenge, verify2FA, cancel2FA } = useAuth();
  const [twoFACode, setTwoFACode] = useState('');

  // Password recovery flow: 'login' (default) | 'forgot' | 'reset'.
  const [view, setView] = useState('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [info, setInfo] = useState('');

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
      // In dev the backend returns the plaintext token so the SPA can
      // continue without an email server; in production it returns 204
      // and the token is delivered by email.
      if (data && data.token) {
        setResetToken(data.token);
        setInfo('Generamos un enlace de recuperación. Ingresa tu nueva contraseña.');
        setView('reset');
      } else {
        setInfo('Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.');
      }
    } catch {
      // Never reveal whether the email exists.
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
      setError(err?.response?.data?.error?.message || 'No se pudo restablecer la contraseña. El enlace puede haber expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await login(formData.usuario, formData.password);

    if (result.success) {
      if (result.requires2FA) {
        setIsLoading(false);
        return;
      }
      setIsAuthenticating(true);
      setTimeout(() => navigate('/dashboard'), 600);
    } else {
      setIsLoading(false);
      setError(result.error || 'Usuario o contraseña incorrectos');
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
      setError(result.error || 'Código inválido');
    }
  };

  // Mostrar loading de autenticación
  if (isAuthenticating) {
    return <Loading mensaje="Autenticando..." />;
  }

  if (pendingChallenge) {
    return (
      <div className="login-wrapper">
        <motion.div
          className="login-form-panel"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ width: '100%' }}
        >
          <div className="form-container">
            <motion.div
              className="form-header"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <h1>Verificación en 2 pasos</h1>
              <p>Ingresa el código de 6 dígitos de tu app autenticadora</p>
            </motion.div>
            <motion.form
              className="login-form"
              onSubmit={handle2FASubmit}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              autoComplete="off"
            >
              {error && (
                <motion.div className="error-message" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {error}
                </motion.div>
              )}
              <div className={`form-group ${twoFACode ? 'has-value' : ''}`}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5rem' }}
                  required
                  autoFocus
                />
              </div>
              <motion.button
                type="submit"
                className={`submit-btn ${isLoading ? 'loading' : ''}`}
                disabled={isLoading || twoFACode.length !== 6}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {isLoading ? <div className="loader-spinner"></div> : <span>Verificar</span>}
              </motion.button>
              <button
                type="button"
                onClick={() => { cancel2FA(); setTwoFACode(''); }}
                style={{ background: 'transparent', border: 'none', color: '#888', marginTop: '1rem', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </motion.form>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'forgot' || view === 'reset') {
    return (
      <div className="login-wrapper">
        <motion.div
          className="login-form-panel"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ width: '100%' }}
        >
          <div className="form-container">
            <motion.div className="form-header" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <h1>{view === 'forgot' ? 'Recuperar contraseña' : 'Nueva contraseña'}</h1>
              <p>
                {view === 'forgot'
                  ? 'Ingresa tu correo y te enviaremos instrucciones'
                  : 'Ingresa el código y tu nueva contraseña'}
              </p>
            </motion.div>

            {view === 'forgot' ? (
              <motion.form className="login-form" onSubmit={handleForgotSubmit} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} autoComplete="off">
                {error && <div className="error-message">{error}</div>}
                {info && <div className="error-message" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', borderColor: 'rgba(16,185,129,0.3)' }}>{info}</div>}
                <div className={`form-group ${forgotEmail ? 'has-value' : ''}`}>
                  <div className="input-wrapper">
                    <HiOutlineMail className="input-icon" />
                    <input
                      type="email"
                      name="forgotEmail"
                      placeholder="Correo electrónico"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <motion.button type="submit" className={`submit-btn ${isLoading ? 'loading' : ''}`} disabled={isLoading || !forgotEmail} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  {isLoading ? <div className="loader-spinner"></div> : <span>Enviar instrucciones</span>}
                </motion.button>
                <button type="button" onClick={goToLogin} style={{ background: 'transparent', border: 'none', color: '#888', marginTop: '1rem', cursor: 'pointer' }}>
                  Volver al inicio de sesión
                </button>
              </motion.form>
            ) : (
              <motion.form className="login-form" onSubmit={handleResetSubmit} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} autoComplete="off">
                {error && <div className="error-message">{error}</div>}
                {info && <div className="error-message" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', borderColor: 'rgba(16,185,129,0.3)' }}>{info}</div>}
                <div className={`form-group ${resetToken ? 'has-value' : ''}`}>
                  <div className="input-wrapper">
                    <HiOutlineLockClosed className="input-icon" />
                    <input
                      type="text"
                      name="resetToken"
                      placeholder="Código de recuperación"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className={`form-group ${newPassword ? 'has-value' : ''}`}>
                  <div className="input-wrapper">
                    <HiOutlineLockClosed className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="newPassword"
                      placeholder="Nueva contraseña"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                      {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                    </button>
                  </div>
                </div>
                <div className={`form-group ${confirmPassword ? 'has-value' : ''}`}>
                  <div className="input-wrapper">
                    <HiOutlineLockClosed className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder="Confirmar contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <motion.button type="submit" className={`submit-btn ${isLoading ? 'loading' : ''}`} disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  {isLoading ? <div className="loader-spinner"></div> : <span>Restablecer contraseña</span>}
                </motion.button>
                <button type="button" onClick={goToLogin} style={{ background: 'transparent', border: 'none', color: '#888', marginTop: '1rem', cursor: 'pointer' }}>
                  Volver al inicio de sesión
                </button>
              </motion.form>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      {/* Panel Izquierdo - IA Animado */}
      <motion.div
        className="login-image-panel"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {/* Fondo con partículas */}
        <div className="particles-bg">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                '--x': `${Math.random() * 100}%`,
                '--y': `${Math.random() * 100}%`,
                '--duration': `${3 + Math.random() * 4}s`,
                '--delay': `${Math.random() * 2}s`,
                '--size': `${2 + Math.random() * 3}px`,
              }}
            />
          ))}
        </div>

        {/* Líneas conectoras animadas */}
        <div className="neural-lines">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="neural-line"
              style={{
                '--rotation': `${i * 45}deg`,
                '--delay': `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        {/* Contenido central */}
        <div className="image-content">
          <motion.div
            className="brand-badge"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {/* Círculos pulsantes de IA */}
            <div className="ai-rings">
              <div className="ai-ring ring-1"></div>
              <div className="ai-ring ring-2"></div>
              <div className="ai-ring ring-3"></div>
            </div>

            {/* Icono central */}
            <div className="badge-icon">
              <FiHeadphones />
              <div className="icon-glow"></div>
            </div>

            {/* Barras de audio animadas */}
            <div className="audio-bars">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="audio-bar"
                  style={{ '--delay': `${i * 0.1}s` }}
                />
              ))}
            </div>

            <span className="badge-title">HablaGT</span>
            <p className="badge-tagline">La central inteligente para equipos que atienden en grande</p>
          </motion.div>

          <motion.div
            className="feature-chips"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            <span className="feature-chip">IA en vivo</span>
            <span className="feature-chip">Multi-sede</span>
            <span className="feature-chip">Reportes en tiempo real</span>
          </motion.div>
        </div>

        {/* Orbe brillante flotante */}
        <div className="floating-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>
      </motion.div>

      {/* Panel Derecho - Formulario */}
      <motion.div
        className="login-form-panel"
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="form-container">
          {/* Logo móvil (solo visible en pantallas pequeñas) */}
          <div className="mobile-logo">
            <div className="logo-icon-mobile">
              <FiHeadphones />
            </div>
            <span>HablaGT</span>
          </div>

          {/* Header del formulario */}
          <motion.div
            className="form-header"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="form-eyebrow">Panel de agentes</span>
            <h1>Iniciar Sesión</h1>
            <p>Ingresa tus credenciales para acceder</p>
          </motion.div>

          {/* Formulario */}
          <motion.form
            className="login-form"
            onSubmit={handleSubmit}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            autoComplete="off"
          >
            {/* Success / info message (e.g. after a password reset) */}
            {info && (
              <motion.div
                className="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', borderColor: 'rgba(16,185,129,0.3)' }}
              >
                {info}
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                className="error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.div>
            )}

            {/* Usuario Input */}
            <div className={`form-group ${focusedInput === 'usuario' ? 'focused' : ''} ${formData.usuario ? 'has-value' : ''}`}>
              <div className="input-wrapper">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  id="usuario"
                  name="usuario"
                  placeholder="Usuario"
                  value={formData.usuario}
                  onChange={handleChange}
                  onFocus={() => setFocusedInput('usuario')}
                  onBlur={() => setFocusedInput(null)}
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className={`form-group ${focusedInput === 'password' ? 'focused' : ''} ${formData.password ? 'has-value' : ''}`}>
              <div className="input-wrapper">
                <HiOutlineLockClosed className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="Contraseña"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                </button>
              </div>
            </div>

            {/* Opciones */}
            <div className="form-options">
              <label className="checkbox-container">
                <input type="checkbox" />
                <span className="checkmark"></span>
                <span className="checkbox-label">Recordarme</span>
              </label>
              <button
                type="button"
                className="forgot-link"
                onClick={() => { setView('forgot'); setError(''); setInfo(''); }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              className={`submit-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loader"
                    className="btn-loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="loader-spinner"></div>
                  </motion.div>
                ) : (
                  <motion.span
                    key="text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="btn-content"
                  >
                    Ingresar
                    <HiOutlineArrowRight className="btn-arrow" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.form>

          {/* Footer */}
          <motion.div
            className="form-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p>¿Necesitas ayuda? <a href="#">Contacta al administrador</a></p>
          </motion.div>
        </div>

        {/* Indicador de conexión */}
        <div className="connection-status">
          <span className="status-dot"></span>
          <span>Sistema en línea</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
