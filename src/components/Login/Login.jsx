import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
} from 'react-icons/hi';
import { FiHeadphones, FiUser } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
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
  const { login } = useAuth();

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

    // Simular validación
    setTimeout(() => {
      const result = login(formData.usuario, formData.password);

      if (result.success) {
        setIsLoading(false);
        setIsAuthenticating(true);

        // Mostrar loading y navegar
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setIsLoading(false);
        setError('Usuario o contraseña incorrectos');
      }
    }, 1000);
  };

  // Mostrar loading de autenticación
  if (isAuthenticating) {
    return <Loading mensaje="Autenticando..." />;
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
              <a href="#" className="forgot-link">¿Olvidaste tu contraseña?</a>
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
