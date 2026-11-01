// src/components/SettingsPage.jsx
import React, { useState, useRef, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  ArrowLeft,
  ArrowLeftBox,
  Gears,
  Palette,
  Sparkles,
  Grid,
  Globe,
  Play
} from '@getpapillon/papicons';
import { Cubie } from './Cubie';
import { generateInitialCubies } from '../store/useCubeStore';
import { useSettingsStore, COLOR_PRESETS } from '../store/useSettingsStore';
import { applyQuarterTurn } from '../utils/algoParser';

const DICO_AXIS = { x: 0, y: 1, z: 2 };
const DEMO_MOVES = [
  { axis: 'y', value: [1], direction: 1 },
  { axis: 'x', value: [1], direction: 1 },
  { axis: 'y', value: [1], direction: -1 },
  { axis: 'x', value: [1], direction: -1 }
];

function PreviewCube3D({ cubies, activeTurn, onTurnComplete }) {
  const pivotRefs = useRef({});
  const currentAngle = useRef(0);
  const finishedRef = useRef(false);
  const cubeScale = useSettingsStore(state => state.cubeScale);
  const turnSpeed = useSettingsStore(state => state.turnSpeed);

  useLayoutEffect(() => {
    currentAngle.current = 0;
    finishedRef.current = false;
    Object.values(pivotRefs.current).forEach(grp => {
      if (grp) grp.rotation.set(0, 0, 0);
    });
  }, [cubies, activeTurn]);

  useFrame((_, delta) => {
    if (!activeTurn || finishedRef.current) return;

    currentAngle.current += turnSpeed * delta;
    const targetAngle = Math.PI / 2;
    const clampedAngle = Math.min(currentAngle.current, targetAngle);
    const rotValue = clampedAngle * -activeTurn.direction;

    for (const c of cubies) {
      const grp = pivotRefs.current[c.id];
      if (!grp) continue;
      const isMoving = activeTurn.value.some(
        v => Math.abs(c.position[DICO_AXIS[activeTurn.axis]] - v) < 0.1
      );
      if (isMoving) {
        grp.rotation[activeTurn.axis] = rotValue;
      } else {
        grp.rotation.set(0, 0, 0);
      }
    }

    if (currentAngle.current >= targetAngle) {
      finishedRef.current = true;
      onTurnComplete();
    }
  });

  return (
    <group scale={cubeScale}>
      {cubies.map(data => (
        <group
          key={data.id}
          ref={el => {
            pivotRefs.current[data.id] = el;
          }}
        >
          <Cubie
            position={data.position}
            initialPosition={data.initialPosition}
            rotation={data.rotation}
          />
        </group>
      ))}
    </group>
  );
}

const FACE_ITEMS = [
  { key: 'up', labelKey: 'settings.face.up', defaultLabel: 'Haut (U)' },
  { key: 'down', labelKey: 'settings.face.down', defaultLabel: 'Bas (D)' },
  { key: 'front', labelKey: 'settings.face.front', defaultLabel: 'Avant (F)' },
  { key: 'back', labelKey: 'settings.face.back', defaultLabel: 'Arrière (B)' },
  { key: 'right', labelKey: 'settings.face.right', defaultLabel: 'Droite (R)' },
  { key: 'left', labelKey: 'settings.face.left', defaultLabel: 'Gauche (L)' }
];

export function SettingsPage({ onBack }) {
  const { t } = useTranslation();

  const hollowCube = useSettingsStore(state => state.hollowCube);
  const colors = useSettingsStore(state => state.colors);
  const cubeScale = useSettingsStore(state => state.cubeScale);
  const turnSpeed = useSettingsStore(state => state.turnSpeed);

  const setHollowCube = useSettingsStore(state => state.setHollowCube);
  const setFaceColor = useSettingsStore(state => state.setFaceColor);
  const applyColorPreset = useSettingsStore(state => state.applyColorPreset);
  const setCubeScale = useSettingsStore(state => state.setCubeScale);
  const setTurnSpeed = useSettingsStore(state => state.setTurnSpeed);
  const resetSettings = useSettingsStore(state => state.resetSettings);

  const [previewCubies, setPreviewCubies] = useState(() => generateInitialCubies(3));
  const [turnQueue, setTurnQueue] = useState([]);

  const activeTurn = turnQueue.length > 0 ? turnQueue[0] : null;

  const handleTestRotation = () => {
    if (turnQueue.length > 0) return;
    setTurnQueue([...DEMO_MOVES]);
  };

  const handleTurnComplete = () => {
    if (!activeTurn) return;
    setPreviewCubies(prev =>
      applyQuarterTurn(prev, activeTurn.axis, activeTurn.value, activeTurn.direction)
    );
    setTurnQueue(prev => prev.slice(1));
  };

  const isPresetActive = (presetKey) => {
    const preset = COLOR_PRESETS[presetKey];
    if (!preset) return false;
    return Object.keys(preset).every(
      k => (colors[k] || '').toLowerCase() === preset[k].toLowerCase()
    );
  };

  return (
    <div className="trainer-page settings-page">
      <header className="trainer-topbar">
        <button className="trainer-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>{t('common.backHome')}</span>
        </button>

        <div className="trainer-topbar-center">
          <Gears size={20} style={{ color: '#9eb5aa' }} />
          <h1 className="trainer-topbar-title">
            {t('settings.title', { defaultValue: 'Paramètres du Cube' })}
          </h1>
        </div>

        <div className="trainer-topbar-actions">
          <button className="trainer-icon-btn settings-reset-btn" onClick={resetSettings}>
            <ArrowLeftBox size={16} />
            <span>{t('settings.reset', { defaultValue: 'Par défaut' })}</span>
          </button>
        </div>
      </header>

      <main className="settings-content">
        {/* Colonne Gauche : Aperçu 3D interactif */}
        <section className="settings-preview-card">
          <div className="settings-preview-topbar">
            <span className="canvas-Interactive-pill">
              <Globe size={14} />
              <span>{t('algo.dragToRotate', { defaultValue: 'Glissez pour orienter' })}</span>
            </span>
            <button
              type="button"
              className="settings-test-turn-btn"
              onClick={handleTestRotation}
              disabled={turnQueue.length > 0}
            >
              <Play size={14} />
              <span>{t('settings.testTurn', { defaultValue: 'Tester la vitesse' })}</span>
            </button>
          </div>

          <div className="settings-canvas-box">
            <Canvas camera={{ position: [4.2, 3.6, 4.6], fov: 48 }}>
              <ambientLight intensity={1.15} />
              <directionalLight position={[10, 14, 10]} intensity={1.1} />
              <directionalLight position={[-8, -8, -8]} intensity={0.35} />
              <PreviewCube3D
                cubies={previewCubies}
                activeTurn={activeTurn}
                onTurnComplete={handleTurnComplete}
              />
              <OrbitControls enablePan={false} enableZoom={false} />
            </Canvas>
          </div>

          <p className="settings-preview-caption">
            {t('settings.previewCaption', {
              defaultValue: 'Ces réglages s’appliquent aux modes Jouer, Entraînement et Démo 3D.'
            })}
          </p>
        </section>

        {/* Colonne Droite : Contrôles */}
        <section className="settings-controls-card">
          {/* 1. Style Visuel (Plein vs Creux / Stickers seuls) */}
          <div className="settings-group">
            <div className="settings-group-header">
              <Grid size={18} className="settings-group-icon" />
              <div>
                <h2 className="settings-group-title">
                  {t('settings.visual.title', { defaultValue: 'Visuel du Cube' })}
                </h2>
                <p className="settings-group-desc">
                  {t('settings.visual.desc', {
                    defaultValue: 'Affichez le cœur noir classique ou uniquement les stickers pour voir les faces opposées.'
                  })}
                </p>
              </div>
            </div>

            <div className="settings-segmented-control">
              <button
                type="button"
                className={`settings-segment-btn ${!hollowCube ? 'active' : ''}`}
                onClick={() => setHollowCube(false)}
              >
                <Grid size={16} />
                <span>{t('settings.visual.solid', { defaultValue: 'Classique (Plein)' })}</span>
              </button>
              <button
                type="button"
                className={`settings-segment-btn ${hollowCube ? 'active' : ''}`}
                onClick={() => setHollowCube(true)}
              >
                <Sparkles size={16} />
                <span>{t('settings.visual.hollow', { defaultValue: 'Creux (Stickers seuls)' })}</span>
              </button>
            </div>
          </div>

          {/* 2. Taille & Vitesse */}
          <div className="settings-group">
            <div className="settings-slider-row">
              <div className="settings-slider-label-row">
                <span className="settings-slider-label">
                  {t('settings.scale.label', { defaultValue: 'Taille du cube' })}
                </span>
                <span className="settings-slider-value">{Math.round(cubeScale * 100)}%</span>
              </div>
              <input
                type="range"
                className="settings-range-input"
                min="0.7"
                max="1.3"
                step="0.05"
                value={cubeScale}
                onChange={e => setCubeScale( parseFloat(e.target.value) )}
              />
              <div className="settings-slider-ticks">
                <span>70%</span>
                <span>100%</span>
                <span>130%</span>
              </div>
            </div>

            <div className="settings-slider-row">
              <div className="settings-slider-label-row">
                <span className="settings-slider-label">
                  {t('settings.speed.label', { defaultValue: 'Vitesse de rotation' })}
                </span>
                <span className="settings-slider-value">{turnSpeed.toFixed(1)}</span>
              </div>
              <input
                type="range"
                className="settings-range-input"
                min="2"
                max="12"
                step="0.5"
                value={turnSpeed}
                onChange={e => setTurnSpeed( parseFloat(e.target.value) )}
              />
              <div className="settings-slider-ticks">
                <span>{t('settings.speed.slow', { defaultValue: 'Lent' })}</span>
                <span>{t('settings.speed.normal', { defaultValue: 'Standard (5.5)' })}</span>
                <span>{t('settings.speed.fast', { defaultValue: 'Rapide' })}</span>
              </div>
            </div>
          </div>

          {/* 3. Couleurs du Cube */}
          <div className="settings-group">
            <div className="settings-group-header">
              <Palette size={18} className="settings-group-icon" />
              <div>
                <h2 className="settings-group-title">
                  {t('settings.colors.title', { defaultValue: 'Couleurs du Cube' })}
                </h2>
                <p className="settings-group-desc">
                  {t('settings.colors.desc', {
                    defaultValue: 'Choisissez une palette rapide ou personnalisez chaque face.'
                  })}
                </p>
              </div>
            </div>

            <div className="settings-presets-row">
              <button
                type="button"
                className={`settings-preset-pill ${isPresetActive('wca') ? 'active' : ''}`}
                onClick={() => applyColorPreset('wca')}
              >
                {t('settings.preset.wca', { defaultValue: 'WCA Standard' })}
              </button>
              <button
                type="button"
                className={`settings-preset-pill ${isPresetActive('pastel') ? 'active' : ''}`}
                onClick={() => applyColorPreset('pastel')}
              >
                {t('settings.preset.pastel', { defaultValue: 'Pastel' })}
              </button>
              <button
                type="button"
                className={`settings-preset-pill ${isPresetActive('neon') ? 'active' : ''}`}
                onClick={() => applyColorPreset('neon')}
              >
                {t('settings.preset.neon', { defaultValue: 'Néon' })}
              </button>
            </div>

            <div className="settings-colors-grid">
              {FACE_ITEMS.map(item => (
                <label key={item.key} className="settings-color-item">
                  <span className="settings-color-face-name">
                    {t(item.labelKey, { defaultValue: item.defaultLabel })}
                  </span>
                  <div className="settings-color-picker-wrap">
                    <input
                      type="color"
                      className="settings-color-input"
                      value={colors[item.key]}
                      onChange={e => setFaceColor(item.key, e.target.value)}
                    />
                    <span className="settings-color-hex">{colors[item.key].toUpperCase()}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

