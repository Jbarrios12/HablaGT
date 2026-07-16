import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeAudio } from '../../hooks/useRealtimeAudio';
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
  FiPhoneMissed,
  FiCpu
} from 'react-icons/fi';
import { playDTMF } from './useDTMF';
import { softphoneService, cdrService } from '../../services';
import { useLoading } from '../../context/LoadingContext';
import { useToast } from '../../context/ToastContext';
import './Softphone.css';

const Softphone = ({ isOpen, onToggle }) => {
  const { showLoading, hideLoading } = useLoading();
  const toast = useToast();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callState, setCallState] = useState('idle');
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [activeTab, setActiveTab] = useState('keypad');
  const [recentCalls, setRecentCalls] = useState([]);
  const [lastCDR, setLastCDR] = useState(null);
  const [showAI, setShowAI] = useState(false);
  const realtime = useRealtimeAudio(callState !== 'idle' ? activeChannelId : null);
  const [wrapUpNotes, setWrapUpNotes] = useState('');
  const [disposition, setDisposition] = useState('');
  const pollRef = useRef(null);

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

  useEffect(() => {
    let interval;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  useEffect(() => {
    if (callState === 'connected' || callState === 'calling') {
      pollRef.current = setInterval(async () => {
        try {
          const res = await softphoneService.active();
          const channels = res?.channels || [];
          const stillActive = channels.find((c) => c.id === activeChannelId || c.channel_id === activeChannelId);
          if (!stillActive && callState === 'connected' && channels.length === 0) {
            realtime.stop();
            setCallState('wrapup');
            stopPolling();
          }
        } catch (err) {
          // swallow polling errors
        }
      }, 3000);
    }
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, activeChannelId]);

  useEffect(() => {
    const onCallReq = (e) => {
      const numero = e.detail?.numero;
      if (numero) {
        setPhoneNumber(numero);
        setActiveTab('keypad');
        if (!isOpen) onToggle?.();
        setTimeout(() => doCall(numero), 100);
      }
    };
    window.addEventListener('hablagt:softphone:call', onCallReq);
    return () => window.removeEventListener('hablagt:softphone:call', onCallReq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const loadRecentCalls = async () => {
    try {
      const res = await cdrService.list({ page_size: 10, page: 1 });
      const items = res?.items || res || [];
      setRecentCalls(
        items.map((c) => ({
          id: c.id,
          number: c.origen || c.destino || '',
          name: c.contacto_nombre || c.agente_nombre || 'Desconocido',
          type: c.tipo || 'incoming',
          time: c.occurred_at,
          duracion: c.duracion_seg || 0,
        }))
      );
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    if (activeTab === 'recent' && isOpen) {
      loadRecentCalls();
    }
  }, [activeTab, isOpen]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleKeyPress = (value) => {
    playDTMF(value);
    if (phoneNumber.length < 15) {
      setPhoneNumber((prev) => prev + value);
    }
  };

  const handleDelete = () => setPhoneNumber((prev) => prev.slice(0, -1));

  const doCall = async (numero) => {
    showLoading('Iniciando llamada...');
    try {
      const res = await softphoneService.originate(numero);
      setActiveChannelId(res?.id || res?.channel_id || null);
      setLastCDR(res);
      setCallState('calling');
      setTimeout(() => setCallState('connected'), 1500);
    } catch (err) {
      toast.error('Error al iniciar llamada: ' + (err?.response?.data?.error?.message || err.message));
      setCallState('idle');
    } finally {
      hideLoading();
    }
  };

  const handleCall = () => {
    if (phoneNumber.length > 0) doCall(phoneNumber);
  };

  const handleHangup = async () => {
    if (!activeChannelId) {
      setCallState('idle');
      return;
    }
    if (realtime.status !== 'idle') {
      try { await realtime.stop(); } catch {}
      setShowAI(false);
    }
    showLoading('Finalizando...');
    try {
      await softphoneService.hangup(activeChannelId);
      setCallState('wrapup');
    } catch (err) {
      console.error('hangup error', err);
      setCallState('idle');
    } finally {
      hideLoading();
    }
  };

  const handleMute = async () => {
    if (!activeChannelId) return;
    const next = !isMuted;
    setIsMuted(next);
    try {
      await softphoneService.mute(activeChannelId, next);
    } catch (err) {
      console.error('mute error', err);
      setIsMuted(!next);
    }
  };

  const handleHold = async () => {
    if (!activeChannelId) return;
    const next = !isOnHold;
    setIsOnHold(next);
    try {
      await softphoneService.hold(activeChannelId, next);
    } catch (err) {
      console.error('hold error', err);
      setIsOnHold(!next);
    }
  };

  const handleTransfer = async () => {
    if (!activeChannelId) return;
    const destino = window.prompt('Número de extensión o destino:');
    if (!destino) return;
    showLoading('Transfiriendo...');
    try {
      await softphoneService.transfer(activeChannelId, destino);
      setCallState('idle');
      setActiveChannelId(null);
    } catch (err) {
      toast.error('Error en transferencia: ' + (err?.response?.data?.error?.message || err.message));
    } finally {
      hideLoading();
    }
  };

  const handleSaveWrapUp = async () => {
    if (lastCDR?.id) {
      showLoading('Guardando wrap-up...');
      try {
        await cdrService.wrapUp(lastCDR.id, {
          disposition,
          observaciones: wrapUpNotes,
        });
      } catch (err) {
        console.error('wrap-up error', err);
      } finally {
        hideLoading();
      }
    }
    setCallState('idle');
    setPhoneNumber('');
    setIsMuted(false);
    setIsOnHold(false);
    setActiveChannelId(null);
    setLastCDR(null);
    setWrapUpNotes('');
    setDisposition('');
  };

  const handleQuickCall = (number) => {
    setPhoneNumber(String(number).replace(/\s/g, ''));
    setActiveTab('keypad');
  };

  return (
    <>
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="softphone-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="sp-inner">
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

              <div className="sp-body">
                {callState === 'wrapup' ? (
                  <div className="sp-wrapup">
                    <h4>Wrap-up de la llamada</h4>
                    <p className="sp-wrapup-hint">¿Cómo terminó la llamada?</p>
                    <select
                      value={disposition}
                      onChange={(e) => setDisposition(e.target.value)}
                      className="sp-wrapup-select"
                    >
                      <option value="">— Seleccionar —</option>
                      <option value="sale">Venta</option>
                      <option value="follow_up">Seguimiento</option>
                      <option value="not_interested">No interesado</option>
                      <option value="voicemail">Buzón de voz</option>
                      <option value="wrong_number">Número equivocado</option>
                      <option value="do_not_call">No llamar</option>
                      <option value="other">Otro</option>
                    </select>
                    <textarea
                      placeholder="Notas de la llamada..."
                      value={wrapUpNotes}
                      onChange={(e) => setWrapUpNotes(e.target.value)}
                      rows={4}
                      className="sp-wrapup-textarea"
                    />
                    <button className="sp-wrapup-save" onClick={handleSaveWrapUp}>
                      Guardar y cerrar
                    </button>
                    <button
                      className="sp-wrapup-skip"
                      onClick={() => {
                        setCallState('idle');
                        setPhoneNumber('');
                        setActiveChannelId(null);
                        setLastCDR(null);
                        setWrapUpNotes('');
                        setDisposition('');
                      }}
                    >
                      Omitir
                    </button>
                  </div>
                ) : callState !== 'idle' ? (
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
                          onClick={handleMute}
                        >
                          {isMuted ? <FiMicOff /> : <FiMic />}
                          <span>Mute</span>
                        </button>
                        <button
                          className={`action-btn ${isOnHold ? 'active' : ''}`}
                          onClick={handleHold}
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
                        <button className="action-btn" onClick={handleTransfer}>
                          <FiPhoneOutgoing />
                          <span>Transfer</span>
                        </button>
                        <button
                          className={`action-btn ${showAI ? 'active' : ''}`}
                          onClick={() => setShowAI((s) => !s)}
                          title="Operadora IA"
                        >
                          <FiCpu />
                          <span>IA</span>
                        </button>
                      </div>
                    )}

                    {showAI && (
                      <div className="sp-ai-panel">
                        <div className="sp-ai-header">
                          <strong>Operadora IA</strong>
                          <span className={`sp-ai-status ${realtime.status}`}>
                            {realtime.status === 'idle' && 'Inactiva'}
                            {realtime.status === 'connecting' && 'Conectando...'}
                            {realtime.status === 'open' && 'En línea'}
                            {realtime.status === 'closed' && 'Cerrada'}
                            {realtime.status === 'error' && 'Error'}
                          </span>
                        </div>
                        {realtime.status === 'idle' && (
                          <button
                            className="sp-ai-btn primary"
                            onClick={realtime.start}
                          >
                            Activar IA
                          </button>
                        )}
                        {realtime.status !== 'idle' && (
                          <button
                            className="sp-ai-btn"
                            onClick={realtime.stop}
                          >
                            Desactivar IA
                          </button>
                        )}
                        {realtime.error && (
                          <div className="sp-ai-error">{realtime.error}</div>
                        )}
                        {realtime.transcript.length > 0 && (
                          <div className="sp-ai-transcript">
                            {realtime.transcript.slice(-6).map((t, i) => (
                              <div key={i} className={`sp-ai-line ${t.speaker}`}>
                                <span className="sp-ai-speaker">{t.speaker}</span>
                                <span>{t.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <button className="end-call-btn" onClick={handleHangup}>
                      <FiPhoneOff />
                      <span>Finalizar</span>
                    </button>
                  </div>
                ) : (
                  <>
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

                    {activeTab === 'recent' && (
                      <div className="sp-recent">
                        {recentCalls.length === 0 && (
                          <div className="recent-empty">Sin llamadas recientes</div>
                        )}
                        {recentCalls.map((call) => (
                          <div
                            key={call.id}
                            className="recent-item"
                            onClick={() => handleQuickCall(call.number)}
                          >
                            <div className={`recent-icon ${call.type}`}>
                              {call.type === 'incoming' && <FiPhoneIncoming />}
                              {call.type === 'outbound' && <FiPhoneOutgoing />}
                              {(call.type === 'missed' || call.type === 'internal') && <FiPhoneMissed />}
                            </div>
                            <div className="recent-info">
                              <span className="recent-name">{call.name || call.number}</span>
                              <span className="recent-number">{call.number}</span>
                            </div>
                            <span className="recent-time">
                              {call.duracion ? formatDuration(call.duracion) : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

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
