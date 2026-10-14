// src/components/algos/AlgoDemoModal.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  X,
  RotateCcw,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  Circle,
  Gamepad2,
  Move3d
} from 'lucide-react';
import { Cubie } from '../Cubie';
import {
  createCaseCubies,
  parseAlgoTokens,
  getMoveParams,
  applyQuarterTurn,
  invertSingleMove
} from '../../utils/algoParser';

function AnimatedDemoCube({ cubies, activeAnim, onFinishAnim }) {
  const rotatingGroupRef = useRef();
  const currentAngle = useRef(0);
  const dicoAxis = { x: 0, y: 1, z: 2 };

  useFrame((_, delta) => {
    if (activeAnim && rotatingGroupRef.current) {
      const speed = 5.5;
      currentAngle.current += speed * delta;
      const targetAngle = (Math.PI / 2) * activeAnim.quarterTurns;

      rotatingGroupRef.current.rotation[activeAnim.axis] =
        Math.min(currentAngle.current, targetAngle) * -activeAnim.direction;

      if (currentAngle.current >= targetAngle) {
        currentAngle.current = 0;
        rotatingGroupRef.current.rotation.set(0, 0, 0);
        onFinishAnim();
      }
    }
  });

  let movingCubies = [];
  let staticCubies = cubies;

  if (activeAnim) {
    movingCubies = cubies.filter(c =>
      activeAnim.value.some(v => Math.abs(c.position[dicoAxis[activeAnim.axis]] - v) < 0.1)
    );
    staticCubies = cubies.filter(
      c => !activeAnim.value.some(v => Math.abs(c.position[dicoAxis[activeAnim.axis]] - v) < 0.1)
    );
  }

  return (
    <group>
      <group>
        {staticCubies.map(data => (
          <Cubie
            key={data.id}
            position={data.position}
            initialPosition={data.initialPosition}
            rotation={data.rotation}
            faceColors={data.faceColors}
          />
        ))}
      </group>
      <group ref={rotatingGroupRef}>
        {movingCubies.map(data => (
          <Cubie
            key={data.id}
            position={data.position}
            initialPosition={data.initialPosition}
            rotation={data.rotation}
            faceColors={data.faceColors}
          />
        ))}
      </group>
    </group>
  );
}

export function AlgoDemoModal({
  algoCase,
  size = 3,
  isLearned = false,
  onToggleLearned,
  onTestAlgo,
  onClose
}) {
  const allTokens = useMemo(() => parseAlgoTokens(algoCase.alg), [algoCase.alg]);
  const tokens = useMemo(
    () => allTokens.filter(t => !t.isOptional),
    [allTokens]
  );

  const initialCubies = useMemo(
    () =>
      createCaseCubies({
        size,
        alg: algoCase.alg,
        setup: algoCase.setup ?? null,
        yellowTop: algoCase.yellowTop ?? true,
        maskMode: algoCase.maskMode || 'full',
        applySetup: true
      }),
    [algoCase, size]
  );

  const [cubies, setCubies] = useState(initialCubies);
  const [stepIndex, setStepIndex] = useState(0);
  const [activeMoveHighlight, setActiveMoveHighlight] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeAnim, setActiveAnim] = useState(null);

  useEffect(() => {
    setCubies(initialCubies);
    setStepIndex(0);
    setActiveMoveHighlight(-1);
    setIsPlaying(false);
    setActiveAnim(null);
  }, [initialCubies]);

  const triggerStepForward = useCallback(() => {
    if (activeAnim || stepIndex >= tokens.length) {
      if (stepIndex >= tokens.length) setIsPlaying(false);
      return;
    }
    const moveStr = tokens[stepIndex].move;
    const params = getMoveParams(moveStr, size);
    if (!params) return;

    setActiveMoveHighlight(stepIndex);
    setActiveAnim({ ...params, nextStepIndex: stepIndex + 1 });
  }, [activeAnim, stepIndex, tokens, size]);

  const triggerStepBackward = () => {
    if (activeAnim || stepIndex <= 0) return;
    setIsPlaying(false);
    const prevIdx = stepIndex - 1;
    const invMoveStr = invertSingleMove(tokens[prevIdx].move);
    const params = getMoveParams(invMoveStr, size);
    if (!params) return;

    setActiveMoveHighlight(prevIdx);
    setActiveAnim({ ...params, nextStepIndex: prevIdx });
  };

  const handleFinishAnim = useCallback(() => {
    if (!activeAnim) return;
    setCubies(prev => {
      let next = prev;
      for (let i = 0; i < activeAnim.quarterTurns; i++) {
        next = applyQuarterTurn(next, activeAnim.axis, activeAnim.value, activeAnim.direction);
      }
      return next;
    });
    const nextIdx = activeAnim.nextStepIndex;
    setStepIndex(nextIdx);
    setActiveAnim(null);
    if (nextIdx >= tokens.length) {
      setIsPlaying(false);
    }
  }, [activeAnim, tokens.length]);

  useEffect(() => {
    if (isPlaying && !activeAnim) {
      if (stepIndex < tokens.length) {
        const timer = setTimeout(() => {
          triggerStepForward();
        }, 120);
        return () => clearTimeout(timer);
      } else {
        setIsPlaying(false);
      }
    }
  }, [isPlaying, activeAnim, stepIndex, tokens.length, triggerStepForward]);

  const handleReset = () => {
    setIsPlaying(false);
    setActiveAnim(null);
    setCubies(initialCubies);
    setStepIndex(0);
    setActiveMoveHighlight(-1);
  };

  const handlePlayPause = () => {
    if (stepIndex >= tokens.length && !activeAnim) {
      setCubies(initialCubies);
      setStepIndex(0);
      setActiveMoveHighlight(-1);
      setIsPlaying(true);
      return;
    }
    setIsPlaying(prev => !prev);
  };

  const camPos = size === 2 ? [3.4, 3.0, 3.6] : [4.3, 3.8, 4.6];
  const progressPercent = tokens.length > 0 ? Math.round((stepIndex / tokens.length) * 100) : 0;

  return (
    <div className="algo-modal-backdrop" onClick={onClose}>
      <div className="algo-modal-card" onClick={e => e.stopPropagation()}>
        {/* En-tête de la modale */}
        <div className="algo-modal-header">
          <div className="algo-modal-header-titles">
            <span className="algo-modal-badge">{algoCase.category || `Cube ${size}x${size}`}</span>
            <h2 className="algo-modal-title">{algoCase.name}</h2>
          </div>
          <button className="algo-modal-close" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        {algoCase.description && (
          <p className="algo-modal-desc">{algoCase.description}</p>
        )}

        {/* Scène 3D interactive */}
        <div className="algo-modal-canvas-wrapper">
          <div className="algo-modal-canvas-topbar">
            <span className="canvas-Interactive-pill">
              <Move3d size={14} />
              <span>Glisser pour orienter</span>
            </span>
            <span className="canvas-step-pill">
              Étape {stepIndex} / {tokens.length}
            </span>
          </div>

          <Canvas camera={{ position: camPos, fov: 48 }}>
            <ambientLight intensity={1.15} />
            <directionalLight position={[10, 14, 10]} intensity={1.1} />
            <directionalLight position={[-8, -8, -8]} intensity={0.35} />
            <AnimatedDemoCube
              cubies={cubies}
              activeAnim={activeAnim}
              onFinishAnim={handleFinishAnim}
            />
            <OrbitControls enablePan={false} enableZoom={false} />
          </Canvas>

          {/* Barre de progression fine en bas du canvas */}
          <div className="algo-modal-progress-track">
            <div
              className="algo-modal-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Formule séquencée en badges */}
        <div className="algo-formula-tokens">
          {allTokens.map((tok, i) => {
            const isCurrent = i === activeMoveHighlight;
            const isDone = i < stepIndex && !tok.isOptional;
            return (
              <span
                key={i}
                className={`algo-token ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''} ${
                  tok.isOptional ? 'optional' : ''
                }`}
              >
                {tok.display}
              </span>
            );
          })}
        </div>

        {/* Contrôles du lecteur pas-à-pas */}
        <div className="algo-player-controls">
          <button
            className="player-btn"
            onClick={handleReset}
            title="Retour au début"
          >
            <RotateCcw size={16} />
            <span>Début</span>
          </button>
          <button
            className="player-btn"
            onClick={triggerStepBackward}
            disabled={stepIndex <= 0 || !!activeAnim}
            title="Mouvement précédent"
          >
            <SkipBack size={16} />
            <span>Préc.</span>
          </button>
          <button
            className="player-btn primary"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <>
                <Pause size={16} />
                <span>Pause</span>
              </>
            ) : stepIndex >= tokens.length ? (
              <>
                <RotateCcw size={16} />
                <span>Rejouer</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Lecture</span>
              </>
            )}
          </button>
          <button
            className="player-btn"
            onClick={() => {
              setIsPlaying(false);
              triggerStepForward();
            }}
            disabled={stepIndex >= tokens.length || !!activeAnim}
            title="Mouvement suivant"
          >
            <span>Suiv.</span>
            <SkipForward size={16} />
          </button>
        </div>

        {/* Pied de modale : Marquer appris & Tester */}
        <div className="algo-modal-footer">
          {onToggleLearned && (
            <button
              className={`learned-toggle-btn ${isLearned ? 'learned' : ''}`}
              onClick={() => onToggleLearned(algoCase.id)}
            >
              {isLearned ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              <span>{isLearned ? 'Appris' : 'Marquer comme appris'}</span>
            </button>
          )}
          {onTestAlgo && (
            <button
              className="test-algo-btn"
              onClick={() => onTestAlgo({ ...algoCase, size })}
            >
              <Gamepad2 size={18} />
              <span>Tester sur le Cube</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}