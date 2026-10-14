// src/App.jsx
import React, { useState } from 'react';
import {
  Gamepad2,
  BookOpen,
  ArrowLeft,
  Compass,
  Zap,
  Layers,
  Flame,
  ChevronRight
} from 'lucide-react';
import './App.css';
import { Cube2x2 } from './components/Cube2x2';
import { Cube3x3 } from './components/Cube3x3';
import { MiniCube } from './components/MiniCube';
import { MethodeSimple2x2 } from './components/algos/MethodeSimple2x2';
import { MethodeOrtega2x2 } from './components/algos/MethodeOrtega2x2';
import { MethodeSimple3x3 } from './components/algos/MethodeSimple3x3';
import { MethodeCFOP3x3 } from './components/algos/MethodeCFOP3x3';

export default function App() {
  // 'menu' | 'play_menu' | 'algos' | '2x2' | '3x3' | 'simple2x2' | 'ortega2x2' | 'simple3x3' | 'cfop3x3'
  const [mode, setMode] = useState('menu');
  const [trainingCase, setTrainingCase] = useState(null);
  const [returnMode, setReturnMode] = useState('play_menu');

  const handleTestAlgo = (caseData, currentAlgoPage) => {
    setTrainingCase(caseData);
    setReturnMode(currentAlgoPage);
    setMode(caseData.size === 2 ? '2x2' : '3x3');
  };

  const handleBackFromGame = () => {
    if (trainingCase) {
      const target = returnMode || 'algos';
      setTrainingCase(null);
      setMode(target);
    } else {
      setMode('play_menu');
    }
  };

  if (mode === '2x2') {
    return <Cube2x2 onBack={handleBackFromGame} trainingCase={trainingCase} />;
  }

  if (mode === '3x3') {
    return <Cube3x3 onBack={handleBackFromGame} trainingCase={trainingCase} />;
  }

  if (mode === 'simple2x2') {
    return (
      <MethodeSimple2x2
        onBack={() => setMode('algos')}
        onTestAlgo={c => handleTestAlgo(c, 'simple2x2')}
      />
    );
  }

  if (mode === 'ortega2x2') {
    return (
      <MethodeOrtega2x2
        onBack={() => setMode('algos')}
        onTestAlgo={c => handleTestAlgo(c, 'ortega2x2')}
      />
    );
  }

  if (mode === 'simple3x3') {
    return (
      <MethodeSimple3x3
        onBack={() => setMode('algos')}
        onTestAlgo={c => handleTestAlgo(c, 'simple3x3')}
      />
    );
  }

  if (mode === 'cfop3x3') {
    return (
      <MethodeCFOP3x3
        onBack={() => setMode('algos')}
        onTestAlgo={c => handleTestAlgo(c, 'cfop3x3')}
      />
    );
  }

  // Sous-menu JOUER (2x2, 3x3 et futurs cubes)
  if (mode === 'play_menu') {
    return (
      <div className="main-menu-container">
        <div className="menu-header-block">
          <span className="menu-eyebrow">Simulateur 3D</span>
          <h1 className="main-menu-title">Choisissez votre Cube</h1>
          <p className="main-menu-subtitle">
            Sélectionnez un format pour lancer une session chronométrée ou libre.
          </p>
        </div>

        <div className="main-menu-buttons">
          <button
            className="menu-btn cube-select-card"
            onClick={() => {
              setTrainingCase(null);
              setMode('2x2');
            }}
          >
            <MiniCube size={2} />
            <div className="menu-card-Meta">
              <span className="menu-card-title">Pocket Cube 2x2</span>
              <span className="menu-card-sub">Rapide & nerveux</span>
            </div>
          </button>

          <button
            className="menu-btn cube-select-card"
            onClick={() => {
              setTrainingCase(null);
              setMode('3x3');
            }}
          >
            <MiniCube size={3} />
            <div className="menu-card-Meta">
              <span className="menu-card-title">Rubik&apos;s Cube 3x3</span>
              <span className="menu-card-sub">Format classique WCA</span>
            </div>
          </button>
        </div>

        <button className="menu-back-btn" onClick={() => setMode('menu')}>
          <ArrowLeft size={18} />
          <span>Retour à l&apos;accueil</span>
        </button>
      </div>
    );
  }

  // Sous-menu ALGORITHMES
  if (mode === 'algos') {
    return (
      <div className="main-menu-container">
        <div className="menu-header-block">
          <span className="menu-eyebrow">Apprentissage & Entraînement</span>
          <h1 className="main-menu-title">Guides & Algorithmes</h1>
          <p className="main-menu-subtitle">
            Explorez les méthodes pas à pas ou entraînez-vous sur les cas officiels.
          </p>
        </div>

        <div className="algo-methods-grid">
          <button className="method-select-card" onClick={() => setMode('simple2x2')}>
            <div className="method-card-icon cyan">
              <Compass size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">2x2 • Débutant</div>
              <h3 className="method-card-title">Méthode Simple 2x2</h3>
              <p className="method-card-desc">
                Résolvez le 2x2 pas à pas avec 3 étapes visuelles ultra simples.
              </p>
            </div>
            <ChevronRight size={20} className="method-card-arrow" />
          </button>

          <button className="method-select-card" onClick={() => setMode('ortega2x2')}>
            <div className="method-card-icon amber">
              <Zap size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">2x2 • Intermédiaire / Speed</div>
              <h3 className="method-card-title">Méthode Ortega 2x2</h3>
              <p className="method-card-desc">
                1ère face, 7 OLL et 5 PBL pour descendre sous les 5 secondes.
              </p>
            </div>
            <ChevronRight size={20} className="method-card-arrow" />
          </button>

          <button className="method-select-card" onClick={() => setMode('simple3x3')}>
            <div className="method-card-icon emerald">
              <Layers size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">3x3 • Débutant</div>
              <h3 className="method-card-title">Méthode Simple 3x3</h3>
              <p className="method-card-desc">
                Le guide complet en 7 étapes illustrées (Marguerite, Belge, Chaise).
              </p>
            </div>
            <ChevronRight size={20} className="method-card-arrow" />
          </button>

          <button className="method-select-card" onClick={() => setMode('cfop3x3')}>
            <div className="method-card-icon rose">
              <Flame size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">3x3 • Avancé (Fridrich)</div>
              <h3 className="method-card-title">Méthode CFOP 3x3</h3>
              <p className="method-card-desc">
                Répertoire complet F2L, 2-Look & Full OLL (57) et PLL (21).
              </p>
            </div>
            <ChevronRight size={20} className="method-card-arrow" />
          </button>
        </div>

        <button className="menu-back-btn" onClick={() => setMode('menu')}>
          <ArrowLeft size={18} />
          <span>Retour à l&apos;accueil</span>
        </button>
      </div>
    );
  }

  // MENU PRINCIPAL (2 Pôles : Jouer & Algorithmes)
  return (
    <div className="main-menu-container">
      <div className="menu-header-block">
        <span className="menu-eyebrow">Application Interactive 3D</span>
        <h1 className="main-menu-title">Cube Studio</h1>
        <p className="main-menu-subtitle">
          Entraînez-vous au Speedcubing, visualisez les algorithmes en 3D et maîtrisez chaque méthode.
        </p>
      </div>

      <div className="main-menu-buttons">
        <button className="menu-btn primary-pole-card" onClick={() => setMode('play_menu')}>
          <div className="pole-preview-wrapper">
            <MiniCube size={3} />
          </div>
          <div className="pole-card-footer">
            <div className="pole-icon-badge">
              <Gamepad2 size={24} />
            </div>
            <div className="menu-card-Meta">
              <span className="menu-card-title">Jouer</span>
              <span className="menu-card-sub">Simulateur 2x2 & 3x3 chronométré</span>
            </div>
          </div>
        </button>

        <button className="menu-btn primary-pole-card" onClick={() => setMode('algos')}>
          <div className="pole-preview-wrapper algo-hub-graphic">
            <BookOpen size={68} strokeWidth={1.4} />
          </div>
          <div className="pole-card-footer">
            <div className="pole-icon-badge accent">
              <BookOpen size={24} />
            </div>
            <div className="menu-card-Meta">
              <span className="menu-card-title">Algorithmes</span>
              <span className="menu-card-sub">Guides Débutant, Ortega & CFOP</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}