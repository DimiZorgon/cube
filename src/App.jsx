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
          <h1 className="main-menu-title">Choisissez un cube</h1>
          <p className="main-menu-subtitle">
            Choisissez un format et lancez votre partie.
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
              <span className="menu-card-title">Cube 2 × 2</span>
              <span className="menu-card-sub">Petit format, parties rapides</span>
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
              <span className="menu-card-title">Cube 3 × 3</span>
              <span className="menu-card-sub">Le format classique</span>
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
          <span className="menu-eyebrow">Guides et entraînement</span>
          <h1 className="main-menu-title">Méthodes de résolution</h1>
          <p className="main-menu-subtitle">
            Découvrez les étapes de chaque méthode et entraînez-vous sur des cas.
          </p>
        </div>

        <div className="algo-methods-grid">
          <button className="method-select-card" onClick={() => setMode('simple2x2')}>
            <div className="method-card-icon cyan">
              <Compass size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">2 × 2 · Débutant</div>
              <h3 className="method-card-title">Méthode débutant · 2 × 2</h3>
              <p className="method-card-desc">
                Apprenez à résoudre le 2 × 2 en trois étapes illustrées.
              </p>
            </div>
            <ChevronRight size={20} className="method-card-arrow" />
          </button>

          <button className="method-select-card" onClick={() => setMode('ortega2x2')}>
            <div className="method-card-icon amber">
              <Zap size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">2 × 2 · Intermédiaire</div>
              <h3 className="method-card-title">Méthode Ortega · 2 × 2</h3>
              <p className="method-card-desc">
                Apprenez les étapes Ortega et entraînez-vous aux cas OLL et PBL.
              </p>
            </div>
            <ChevronRight size={20} className="method-card-arrow" />
          </button>

          <button className="method-select-card" onClick={() => setMode('simple3x3')}>
            <div className="method-card-icon emerald">
              <Layers size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">3 × 3 · Débutant</div>
              <h3 className="method-card-title">Méthode débutant · 3 × 3</h3>
              <p className="method-card-desc">
                Résolvez le 3 × 3 en sept étapes illustrées.
              </p>
            </div>
            <ChevronRight size={20} className="method-card-arrow" />
          </button>

          <button className="method-select-card" onClick={() => setMode('cfop3x3')}>
            <div className="method-card-icon rose">
              <Flame size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">3 × 3 · Avancé</div>
              <h3 className="method-card-title">Méthode CFOP · 3 × 3</h3>
              <p className="method-card-desc">
                Retrouvez les algorithmes F2L, OLL et PLL de la méthode CFOP.
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
        <span className="menu-eyebrow">Simulateur de cube en 3D</span>
        <h1 className="main-menu-title">Cube Studio</h1>
        <p className="main-menu-subtitle">
          Jouez au 2 × 2 et au 3 × 3, ou découvrez de nouvelles méthodes.
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
              <span className="menu-card-sub">Parties en 2 × 2 et 3 × 3</span>
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
              <span className="menu-card-title">Apprendre</span>
              <span className="menu-card-sub">Guides débutant, Ortega et CFOP</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}