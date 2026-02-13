import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPhone,
  FiPhoneOff,
  FiMic,
  FiMicOff,
  FiPause,
  FiPlay,
  FiX,
  FiUser,
  FiClock,
  FiDelete,
  FiVolume2,
  FiPhoneIncoming,
  FiPhoneOutgoing,
  FiPhoneMissed
} from 'react-icons/fi';
import { playDTMF } from './useDTMF';
import './Softphone.css';

const Softphone = ({ isOpen, onToggle }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callState, setCallState] = useState('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [activeTab, setActiveTab] = useState('keypad');

  const keypadButtons = [
    { value: '1', letters: '' },
    { value: '2', letters: 'ABC' },
    { value: '3', letters: 'DEF' },
    { value: '4', letters: 'GHI' },
    { value: '5', letters: 'JKL' },
    { value: '6', letters: 'MNO' },
    { value: '7', letters: 'PQRS' },
    { value: '8', letters: 'TUV' },
    { value: '9', letters: 'WXYZ' },
    { value: '*', letters: '' },
    { value: '0', letters: '+' },
    { value: '#', letters: '' },
  ];

  const recentCalls = [
    { number: '+502 5555-1234', name: 'Carlos García', type: 'incoming', time: 'Hace 5 min' },
    { number: '+502 4444-5678', name: 'María López', type: 'outgoing', time: 'Hace 15 min' },
    { number: '+502 3333-9012', name: 'Desconocido', type: 'missed', time: 'Hace 1 hora' },
    { number: '+502 2222-3456', name: 'Pedro Martínez', type: 'incoming', time: 'Hace 2 horas' },
  ];

  useEffect(() => {
    let interval;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleKeyPress = (value) => {
    // Reproducir tono DTMF
    playDTMF(value);

    if (phoneNumber.length < 15) {
      setPhoneNumber(prev => prev + value);
    }
  };

  const handleDelete = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleCall = () => {
    if (phoneNumber.length > 0) {
      setCallState('calling');
      setTimeout(() => setCallState('connected'), 2000);
    }
  };

  const handleHangup = () => {
    setCallState('idle');
    setIsMuted(false);
    setIsOnHold(false);
    setPhoneNumber('');
  };

  const handleQuickCall = (number) => {
    setPhoneNumber(number.replace(/\s/g, ''));
    setActiveTab('keypad');
  };

  return (
    <>
      {/* Botón flotante para abrir/cerrar */}
      <motion.button
        className={`phone-trigger ${isOpen ? 'active' : ''} ${callState !== 'idle' ? 'in-call' : ''}`}
        onClick={onToggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <FiX /> : <FiPhone />}
        {callState !== 'idle' && !isOpen && (
          <span className="call-indicator">
            <span className="pulse"></span>
          </span>
        )}
      </motion.button>

      {/* Panel del Softphone - integrado en el layout */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="softphone-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="sp-inner">
              {/* Header */}
              <div className="sp-header">
                <div className="sp-header-info">
                  <div className="sp-logo">
                    <FiPhone />
                  </div>
                  <div>
                    <h3>Hablaphone</h3>
                    <span className="sp-status online">
                      <span className="status-dot"></span>
                      Conectado
                    </span>
                  </div>
                </div>
                <button className="sp-close" onClick={onToggle}>
                  <FiX />
                </button>
              </div>

              {/* Contenido principal */}
              <div className="sp-body">
                {/* Vista de llamada activa */}
                {callState !== 'idle' ? (
                  <div className="sp-call-view">
                    <div className="call-avatar">
                      <FiUser />
                      {callState === 'calling' && (
                        <div className="avatar-rings">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      )}
                    </div>

                    <div className="call-info">
                      <span className="call-number">{phoneNumber}</span>
                      <span className="call-state">
                        {callState === 'calling' && 'Llamando...'}
                        {callState === 'connected' && (
                          <span className="call-timer">
                            <FiClock /> {formatDuration(callDuration)}
                          </span>
                        )}
                      </span>
                    </div>

                    {callState === 'connected' && (
                      <div className="call-actions">
                        <button
                          className={`action-btn ${isMuted ? 'active' : ''}`}
                          onClick={() => setIsMuted(!isMuted)}
                        >
                          {isMuted ? <FiMicOff /> : <FiMic />}
                          <span>Mute</span>
                        </button>
                        <button
                          className={`action-btn ${isOnHold ? 'active' : ''}`}
                          onClick={() => setIsOnHold(!isOnHold)}
                        >
                          {isOnHold ? <FiPlay /> : <FiPause />}
                          <span>Espera</span>
                        </button>
                        <button
                          className={`action-btn ${isSpeaker ? 'active' : ''}`}
                          onClick={() => setIsSpeaker(!isSpeaker)}
                        >
                          <FiVolume2 />
                          <span>Speaker</span>
                        </button>
                      </div>
                    )}

                    <button className="end-call-btn" onClick={handleHangup}>
                      <FiPhoneOff />
                      <span>Finalizar</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Display de número */}
                    <div className="sp-display">
                      <input
                        type="text"
                        value={phoneNumber}
                        placeholder="Ingresa número"
                        readOnly
                      />
                      {phoneNumber && (
                        <button className="display-delete" onClick={handleDelete}>
                          <FiDelete />
                        </button>
                      )}
                    </div>

                    {/* Tabs */}
                    <div className="sp-tabs">
                      <button
                        className={`sp-tab ${activeTab === 'keypad' ? 'active' : ''}`}
                        onClick={() => setActiveTab('keypad')}
                      >
                        Teclado
                      </button>
                      <button
                        className={`sp-tab ${activeTab === 'recent' ? 'active' : ''}`}
                        onClick={() => setActiveTab('recent')}
                      >
                        Recientes
                      </button>
                    </div>

                    {/* Keypad */}
                    {activeTab === 'keypad' && (
                      <div className="sp-keypad">
                        {keypadButtons.map((btn) => (
                          <button
                            key={btn.value}
                            className="keypad-btn"
                            onClick={() => handleKeyPress(btn.value)}
                          >
                            <span className="btn-number">{btn.value}</span>
                            {btn.letters && <span className="btn-letters">{btn.letters}</span>}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Recientes */}
                    {activeTab === 'recent' && (
                      <div className="sp-recent">
                        {recentCalls.map((call, idx) => (
                          <div
                            key={idx}
                            className="recent-item"
                            onClick={() => handleQuickCall(call.number)}
                          >
                            <div className={`recent-icon ${call.type}`}>
                              {call.type === 'incoming' && <FiPhoneIncoming />}
                              {call.type === 'outgoing' && <FiPhoneOutgoing />}
                              {call.type === 'missed' && <FiPhoneMissed />}
                            </div>
                            <div className="recent-info">
                              <span className="recent-name">{call.name}</span>
                              <span className="recent-number">{call.number}</span>
                            </div>
                            <span className="recent-time">{call.time}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Botón llamar */}
                    <button
                      className={`sp-call-btn ${phoneNumber ? 'active' : ''}`}
                      onClick={handleCall}
                      disabled={!phoneNumber}
                    >
                      <FiPhone />
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Softphone;
