import { motion } from 'framer-motion';
import {
  FiPhone,
  FiPhoneIncoming,
  FiPhoneOutgoing,
  FiPhoneMissed,
  FiClock,
  FiUsers,
  FiTrendingUp,
  FiActivity,
  FiCpu,
  FiCheckCircle
} from 'react-icons/fi';
import './Dashboard.css';

const statsCards = [
  {
    title: 'Llamadas Hoy',
    value: '156',
    change: '+12%',
    changeType: 'positive',
    icon: FiPhone,
    color: 'blue'
  },
  {
    title: 'Entrantes',
    value: '89',
    change: '+8%',
    changeType: 'positive',
    icon: FiPhoneIncoming,
    color: 'green'
  },
  {
    title: 'Salientes',
    value: '52',
    change: '+15%',
    changeType: 'positive',
    icon: FiPhoneOutgoing,
    color: 'purple'
  },
  {
    title: 'Perdidas',
    value: '15',
    change: '-5%',
    changeType: 'negative',
    icon: FiPhoneMissed,
    color: 'red'
  }
];

const recentCalls = [
  { number: '+502 5555-1234', name: 'Carlos García', type: 'incoming', duration: '5:23', time: 'Hace 5 min', status: 'completed' },
  { number: '+502 4444-5678', name: 'María López', type: 'outgoing', duration: '2:15', time: 'Hace 12 min', status: 'completed' },
  { number: '+502 3333-9012', name: 'Desconocido', type: 'missed', duration: '-', time: 'Hace 18 min', status: 'missed' },
  { number: '+502 2222-3456', name: 'Pedro Martínez', type: 'incoming', duration: '8:47', time: 'Hace 25 min', status: 'completed' },
  { number: '+502 1111-7890', name: 'Ana Rodríguez', type: 'outgoing', duration: '3:02', time: 'Hace 32 min', status: 'completed' },
];

const aiStats = {
  callsHandled: 45,
  avgDuration: '2:34',
  satisfaction: 94,
  active: true
};

const Dashboard = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="dashboard"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Stats Cards */}
      <div className="stats-grid">
        {statsCards.map((stat, index) => (
          <motion.div
            key={index}
            className={`stat-card ${stat.color}`}
            variants={itemVariants}
          >
            <div className="stat-icon">
              <stat.icon />
            </div>
            <div className="stat-content">
              <span className="stat-title">{stat.title}</span>
              <div className="stat-value-row">
                <span className="stat-value">{stat.value}</span>
                <span className={`stat-change ${stat.changeType}`}>
                  {stat.change}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Llamadas Recientes */}
        <motion.div className="dashboard-card calls-card" variants={itemVariants}>
          <div className="card-header">
            <h2>Llamadas Recientes</h2>
            <a href="#" className="view-all">Ver todas</a>
          </div>
          <div className="calls-list">
            {recentCalls.map((call, index) => (
              <div key={index} className="call-item">
                <div className={`call-type-icon ${call.type}`}>
                  {call.type === 'incoming' && <FiPhoneIncoming />}
                  {call.type === 'outgoing' && <FiPhoneOutgoing />}
                  {call.type === 'missed' && <FiPhoneMissed />}
                </div>
                <div className="call-info">
                  <span className="call-name">{call.name}</span>
                  <span className="call-number">{call.number}</span>
                </div>
                <div className="call-meta">
                  <span className="call-duration">
                    <FiClock /> {call.duration}
                  </span>
                  <span className="call-time">{call.time}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Operadora IA Status */}
        <motion.div className="dashboard-card ai-card" variants={itemVariants}>
          <div className="card-header">
            <h2>Operadora IA</h2>
            <span className={`ai-status ${aiStats.active ? 'active' : ''}`}>
              <span className="status-dot"></span>
              {aiStats.active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <div className="ai-content">
            <div className="ai-visual">
              <div className="ai-circle">
                <FiCpu className="ai-icon" />
                <div className="ai-ring ring-1"></div>
                <div className="ai-ring ring-2"></div>
              </div>
            </div>
            <div className="ai-stats-grid">
              <div className="ai-stat">
                <FiPhone className="ai-stat-icon" />
                <div className="ai-stat-info">
                  <span className="ai-stat-value">{aiStats.callsHandled}</span>
                  <span className="ai-stat-label">Llamadas atendidas</span>
                </div>
              </div>
              <div className="ai-stat">
                <FiClock className="ai-stat-icon" />
                <div className="ai-stat-info">
                  <span className="ai-stat-value">{aiStats.avgDuration}</span>
                  <span className="ai-stat-label">Duración promedio</span>
                </div>
              </div>
              <div className="ai-stat">
                <FiCheckCircle className="ai-stat-icon" />
                <div className="ai-stat-info">
                  <span className="ai-stat-value">{aiStats.satisfaction}%</span>
                  <span className="ai-stat-label">Satisfacción</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Actividad del Día */}
        <motion.div className="dashboard-card activity-card" variants={itemVariants}>
          <div className="card-header">
            <h2>Actividad del Día</h2>
          </div>
          <div className="activity-chart">
            <div className="chart-bars">
              {[65, 45, 78, 52, 90, 68, 85, 40, 72, 58, 82, 48].map((height, i) => (
                <div key={i} className="chart-bar-wrapper">
                  <motion.div
                    className="chart-bar"
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                  />
                  <span className="chart-label">{8 + i}h</span>
                </div>
              ))}
            </div>
          </div>
          <div className="activity-summary">
            <div className="summary-item">
              <FiTrendingUp className="summary-icon positive" />
              <span>Hora pico: 14:00 - 15:00</span>
            </div>
            <div className="summary-item">
              <FiActivity className="summary-icon" />
              <span>Promedio: 13 llamadas/hora</span>
            </div>
          </div>
        </motion.div>

        {/* Agentes Online */}
        <motion.div className="dashboard-card agents-card" variants={itemVariants}>
          <div className="card-header">
            <h2>Agentes Online</h2>
            <span className="agents-count">4 / 6</span>
          </div>
          <div className="agents-list">
            {[
              { name: 'Juan Pérez', status: 'available', calls: 23 },
              { name: 'María García', status: 'on-call', calls: 18 },
              { name: 'Carlos López', status: 'available', calls: 21 },
              { name: 'Ana Martínez', status: 'break', calls: 15 },
            ].map((agent, index) => (
              <div key={index} className="agent-item">
                <div className="agent-avatar">
                  {agent.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="agent-info">
                  <span className="agent-name">{agent.name}</span>
                  <span className="agent-calls">{agent.calls} llamadas hoy</span>
                </div>
                <span className={`agent-status ${agent.status}`}>
                  {agent.status === 'available' && 'Disponible'}
                  {agent.status === 'on-call' && 'En llamada'}
                  {agent.status === 'break' && 'Descanso'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
