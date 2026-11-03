// src/store/useSettingsStore.js
import { create } from 'zustand';

const STORAGE_KEY = 'rubiks_settings_v1';

export const COLOR_PRESETS = {
  wca: {
    up: '#FFFFFF',
    down: '#fbff00',
    front: '#009B48',
    back: '#0003ad',
    right: '#B71234',
    left: '#ff9900'
  },
  pastel: {
    up: '#f8fafc',
    down: '#fde047',
    front: '#4ade80',
    back: '#60a5fa',
    right: '#fb7185',
    left: '#fb923c'
  },
  neon: {
    up: '#ffffff',
    down: '#facc15',
    front: '#00ff66',
    back: '#00d4ff',
    right: '#ff0055',
    left: '#ff6600'
  }
};

export const DEFAULT_SETTINGS = {
  hollowCube: false,
  colors: { ...COLOR_PRESETS.wca },
  cubeScale: 1,
  turnSpeed: 5.5,
  cameraSpeed: 1,
  soundEnabled: true,
  soundVolume: 0.7
};

function loadInitialSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      hollowCube: Boolean(parsed.hollowCube),
      colors: {
        ...COLOR_PRESETS.wca,
        ...(parsed.colors || {})
      },
      cubeScale: typeof parsed.cubeScale === 'number' ? parsed.cubeScale : 1,
      turnSpeed: typeof parsed.turnSpeed === 'number' ? parsed.turnSpeed : 5.5,
      cameraSpeed: typeof parsed.cameraSpeed === 'number' ? parsed.cameraSpeed : 1,
      soundEnabled: parsed.soundEnabled !== undefined ? Boolean(parsed.soundEnabled) : true,
      soundVolume: typeof parsed.soundVolume === 'number' ? parsed.soundVolume : 0.7
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        hollowCube: state.hollowCube,
        colors: state.colors,
        cubeScale: state.cubeScale,
        turnSpeed: state.turnSpeed,
        cameraSpeed: state.cameraSpeed,
        soundEnabled: state.soundEnabled,
        soundVolume: state.soundVolume
      })
    );
  } catch {
    // Ignore storage error
  }
}

export const useSettingsStore = create((set) => ({
  ...loadInitialSettings(),

  setHollowCube: (hollowCube) =>
    set((state) => {
      const next = { ...state, hollowCube };
      saveSettings(next);
      return { hollowCube };
    }),

  setFaceColor: (face, color) =>
    set((state) => {
      const colors = { ...state.colors, [face]: color };
      const next = { ...state, colors };
      saveSettings(next);
      return { colors };
    }),

  applyColorPreset: (presetKey) =>
    set((state) => {
      const preset = COLOR_PRESETS[presetKey] || COLOR_PRESETS.wca;
      const colors = { ...preset };
      const next = { ...state, colors };
      saveSettings(next);
      return { colors };
    }),

  setCubeScale: (cubeScale) =>
    set((state) => {
      const next = { ...state, cubeScale };
      saveSettings(next);
      return { cubeScale };
    }),

  setTurnSpeed: (turnSpeed) =>
    set((state) => {
      const next = { ...state, turnSpeed };
      saveSettings(next);
      return { turnSpeed };
    }),

  setCameraSpeed: (cameraSpeed) =>
    set((state) => {
      const next = { ...state, cameraSpeed };
      saveSettings(next);
      return { cameraSpeed };
    }),

  setSoundEnabled: (soundEnabled) =>
    set((state) => {
      const next = { ...state, soundEnabled };
      saveSettings(next);
      return { soundEnabled };
    }),

  setSoundVolume: (soundVolume) =>
    set((state) => {
      const next = { ...state, soundVolume };
      saveSettings(next);
      return { soundVolume };
    }),

  resetSettings: () =>
    set(() => {
      const fresh = {
        hollowCube: DEFAULT_SETTINGS.hollowCube,
        colors: { ...COLOR_PRESETS.wca },
        cubeScale: DEFAULT_SETTINGS.cubeScale,
        turnSpeed: DEFAULT_SETTINGS.turnSpeed,
        cameraSpeed: DEFAULT_SETTINGS.cameraSpeed,
        soundEnabled: DEFAULT_SETTINGS.soundEnabled,
        soundVolume: DEFAULT_SETTINGS.soundVolume
      };
      saveSettings(fresh);
      return fresh;
    })
}));
