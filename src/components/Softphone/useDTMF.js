// Hook para generar tonos DTMF realistas
// Simula el sonido de un teléfono real con envelope natural

const DTMF_FREQUENCIES = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
};

let audioContext = null;

const getAudioContext = () => {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Reanudar si está suspendido (requerido por políticas de autoplay)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

export const playDTMF = (key, duration = 180) => {
  const frequencies = DTMF_FREQUENCIES[key];
  if (!frequencies) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Crear osciladores para las dos frecuencias DTMF
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();

    // Crear nodos de ganancia individuales
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();

    // Nodo de ganancia master
    const masterGain = ctx.createGain();

    // Filtro para suavizar el sonido (como un teléfono real)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 8000;
    filter.Q.value = 0.5;

    // Configurar frecuencias
    osc1.frequency.value = frequencies[0];
    osc2.frequency.value = frequencies[1];

    // Ondas sinusoidales puras (como DTMF real)
    osc1.type = 'sine';
    osc2.type = 'sine';

    // Conectar: osciladores -> ganancias individuales -> master -> filtro -> salida
    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(masterGain);
    gain2.connect(masterGain);
    masterGain.connect(filter);
    filter.connect(ctx.destination);

    // Volumen base para cada tono (balance típico de DTMF)
    const volume = 0.25;

    // Envelope realista: attack rápido, sustain, decay suave
    const attackTime = 0.008;  // 8ms attack
    const decayTime = 0.025;   // 25ms decay inicial
    const sustainLevel = 0.8;  // 80% del volumen durante sustain
    const releaseTime = 0.08;  // 80ms release

    // Aplicar envelope a ganancias individuales
    [gain1, gain2].forEach(gain => {
      gain.gain.setValueAtTime(0, now);
      // Attack
      gain.gain.linearRampToValueAtTime(volume, now + attackTime);
      // Decay to sustain
      gain.gain.linearRampToValueAtTime(volume * sustainLevel, now + attackTime + decayTime);
      // Sustain (mantener hasta antes del release)
      gain.gain.setValueAtTime(volume * sustainLevel, now + (duration / 1000) - releaseTime);
      // Release
      gain.gain.exponentialRampToValueAtTime(0.001, now + (duration / 1000));
    });

    // Master gain para control general
    masterGain.gain.value = 1;

    // Iniciar osciladores
    osc1.start(now);
    osc2.start(now);

    // Detener después de la duración + un poco extra para el release
    const stopTime = now + (duration / 1000) + 0.01;
    osc1.stop(stopTime);
    osc2.stop(stopTime);

  } catch (error) {
    console.warn('Error playing DTMF tone:', error);
  }
};

// Tono de llamada saliente (ringback tone)
export const playRingback = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = 440; // Frecuencia típica de ringback
    osc.type = 'sine';

    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.setValueAtTime(0.15, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.start(now);
    osc.stop(now + 0.5);

  } catch (error) {
    console.warn('Error playing ringback:', error);
  }
};

// Tono de ocupado
export const playBusyTone = () => {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = 480;
    osc.type = 'sine';

    osc.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.setValueAtTime(0, now + 0.25);
    gain.gain.setValueAtTime(0.2, now + 0.5);
    gain.gain.setValueAtTime(0, now + 0.75);

    osc.start(now);
    osc.stop(now + 0.75);

  } catch (error) {
    console.warn('Error playing busy tone:', error);
  }
};

export default playDTMF;
