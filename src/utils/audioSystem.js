// src/utils/audioSystem.js
// Système audio Web Audio API autonome pour Cube Studio.
// Aucun fichier audio externe requis : sons synthétisés avec latence nulle et fonctionnement 100% hors-ligne.
import { useSettingsStore } from '../store/useSettingsStore';

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Joue le bruit mécanique d'une tranche de cube en rotation.
 * Synthétise un claquement plastique feutré réaliste.
 */
export function playCubeTurnSound() {
  try {
    const { soundEnabled, soundVolume } = useSettingsStore.getState();
    if (!soundEnabled || soundVolume <= 0) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(soundVolume * 0.45, now);
    masterGain.connect(ctx.destination);

    // 1. Clic transitoire (impulsion aiguë)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320 + Math.random() * 60, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.045);
    oscGain.gain.setValueAtTime(1, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.048);

    // 2. Bruit de frottement plastique (bruit blanc filtré passe-bande)
    const bufferSize = Math.floor(ctx.sampleRate * 0.04);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800 + Math.random() * 300, now);
    filter.Q.setValueAtTime(1.8, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.04);
  } catch {
    // Ignore audio context errors so UI state is never blocked
  }
}

/**
 * Bip sonore WCA pour le chronomètre ou l'inspection.
 * @param {number|'start'|'stop'} typeOrFreq Fréquence en Hz ou type ('start' / 'stop')
 * @param {number} duration Durée en secondes
 */
export function playTimerBeep(typeOrFreq = 880, duration = 0.07) {
  try {
    const { soundEnabled, soundVolume } = useSettingsStore.getState();
    if (!soundEnabled || soundVolume <= 0) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const freq =
      typeOrFreq === 'start'
        ? 980
        : typeOrFreq === 'stop'
        ? 660
        : Number.isFinite(typeOrFreq)
        ? typeOrFreq
        : 880;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(soundVolume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  } catch {
    // Ignore audio context errors so timer logic is never blocked
  }
}

/**
 * Carillon mélodieux de victoire joué lorsqu'un cube est résolu.
 */
export function playSolveVictorySound() {
  try {
    const { soundEnabled, soundVolume } = useSettingsStore.getState();
    if (!soundEnabled || soundVolume <= 0) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // Do5, Mi5, Sol5, Do6
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteTime = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(soundVolume * 0.4, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.38);
    });
  } catch {
    // Ignore audio context errors
  }
}

