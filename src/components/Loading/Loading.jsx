import { motion } from 'framer-motion';
import { FiHeadphones } from 'react-icons/fi';
import './Loading.css';

const Loading = ({ mensaje = 'Cargando...' }) => {
  return (
    <div className="loading-screen">
      {/* Fondo con gradiente animado */}
      <div className="loading-bg">
        <div className="bg-gradient"></div>
        <div className="bg-pattern"></div>
      </div>

      <div className="loading-content">
        {/* Logo animado */}
        <motion.div
          className="loading-logo"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 1, bounce: 0.4 }}
        >
          <div className="logo-circle">
            <div className="logo-inner">
              <FiHeadphones />
            </div>

            {/* Anillos giratorios */}
            <motion.div
              className="logo-ring ring-1"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="logo-ring ring-2"
              animate={{ rotate: -360 }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div
              className="logo-ring ring-3"
              animate={{ rotate: 360 }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          {/* Pulsos */}
          <div className="pulse-container">
            <span className="pulse pulse-1"></span>
            <span className="pulse pulse-2"></span>
            <span className="pulse pulse-3"></span>
          </div>
        </motion.div>

        {/* Título */}
        <motion.div
          className="loading-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <h1>
            <span className="title-habla">Habla</span>
            <span className="title-gt">GT</span>
          </h1>
          <p className="loading-subtitle">Centro de Comunicaciones</p>
        </motion.div>

        {/* Indicador de carga */}
        <motion.div
          className="loading-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="loader-dots">
            <motion.span
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.span
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
            />
            <motion.span
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
            />
          </div>
          <span className="loading-text">{mensaje}</span>
        </motion.div>

        {/* Barra de progreso */}
        <motion.div
          className="loading-bar"
          initial={{ opacity: 0, width: '60%' }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <motion.div
            className="loading-bar-progress"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ delay: 1.2, duration: 2, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>

      {/* Elementos decorativos flotantes */}
      <div className="floating-elements">
        <motion.div
          className="floating-el el-1"
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="floating-el el-2"
          animate={{
            y: [0, 20, 0],
            rotate: [0, -10, 0]
          }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="floating-el el-3"
          animate={{
            y: [0, -15, 0],
            x: [0, 10, 0]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
};

export default Loading;
