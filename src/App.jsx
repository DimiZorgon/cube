// src/App.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Gamepad2,
  BookOpen,
  ArrowLeft,
  Compass,
  Zap,
  Layers,
  Flame,
  Grid,
  Cpu,
  EyeOff,
  ChevronRight,
  Timer
} from 'lucide-react';
import './App.css';
import { Cube2x2 } from './components/Cube2x2';
import { Cube3x3 } from './components/Cube3x3';
import { Cube4x4 } from './components/Cube4x4';
import { MiniCube } from './components/MiniCube';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { MethodeSimple2x2 } from './components/algos/MethodeSimple2x2';
import { MethodeOrtega2x2 } from './components/algos/MethodeOrtega2x2';
import { MethodeSimple3x3 } from './components/algos/MethodeSimple3x3';
import { MethodeCFOP3x3 } from './components/algos/MethodeCFOP3x3';
import { MethodeBlind3x3 } from './components/algos/MethodeBlind3x3';
import { MethodeSimple4x4 } from './components/algos/MethodeSimple4x4';
import { MethodeYau4x4 } from './components/algos/MethodeYau4x4';
import { SpeedTimer } from './components/SpeedTimer';
import { ENGLISH_TRANSLATION_READY } from './i18n';

export default function App() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState('menu');
  const [trainingCase, setTrainingCase] = useState(null);
  const [returnMode, setReturnMode] = useState('play_menu');

  if (i18n.resolvedLanguage === 'en' && !ENGLISH_TRANSLATION_READY) {
    return (
      <main className="main-menu-container">
        <div className="menu-header-block">
          <h1 className="main-menu-title">{t('english.title')}</h1>
          <p className="main-menu-subtitle">{t('english.description')}</p>
          <a className="menu-back-btn" href="/">{t('english.back')}</a>
        </div>
      </main>
    );
  }

  const handleTestAlgo = (caseData, currentAlgoPage) => {
    setTrainingCase(caseData);
    setReturnMode(currentAlgoPage);
    if (caseData.size === 2) setMode('2x2');
    else if (caseData.size === 4) setMode('4x4');
    else setMode('3x3');
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

  if (mode === '4x4') {
    return <Cube4x4 onBack={handleBackFromGame} trainingCase={trainingCase} />;
  }

  if (mode === 'timer') {
    return <SpeedTimer onBack={() => setMode('play_menu')} />;
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

  if (mode === 'blind3x3') {
    return (
      <MethodeBlind3x3
        onBack={() => setMode('algos')}
        onTestAlgo={c => handleTestAlgo(c, 'blind3x3')}
      />
    );
  }

  if (mode === 'simple4x4') {
    return (
      <MethodeSimple4x4
        onBack={() => setMode('algos')}
        onTestAlgo={c => handleTestAlgo(c, 'simple4x4')}
      />
    );
  }

  if (mode === 'yau4x4') {
    return (
      <MethodeYau4x4
        onBack={() => setMode('algos')}
        onTestAlgo={c => handleTestAlgo(c, 'yau4x4')}
      />
    );
  }

  // Sous-menu JOUER (2x2, 3x3, 4x4)
  if (mode === 'play_menu') {
    return (
      <div className="main-menu-container">
        <div className="menu-header-block">
          <span className="menu-eyebrow">{t('app.play.eyebrow')}</span>
          <h1 className="main-menu-title">{t('app.play.title')}</h1>
          <p className="main-menu-subtitle">
            {t('app.play.description')}
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
              <span className="menu-card-title">{t('app.play.2x2.title')}</span>
              <span className="menu-card-sub">{t('app.play.2x2.description')}</span>
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
              <span className="menu-card-title">{t('app.play.3x3.title')}</span>
              <span className="menu-card-sub">{t('app.play.3x3.description')}</span>
            </div>
          </button>

          <button
            className="menu-btn cube-select-card"
            onClick={() => {
              setTrainingCase(null);
              setMode('4x4');
            }}
          >
            <MiniCube size={4} />
            <div className="menu-card-Meta">
              <span className="menu-card-title">{t('app.play.4x4.title')}</span>
              <span className="menu-card-sub">{t('app.play.4x4.description')}</span>
            </div>
          </button>
        </div>

        <button
            className="menu-btn cube-select-card"
            onClick={() => setMode('timer')}
          >
            <div className="mini-cube-container timer-menu-preview">
              <Timer size={76} strokeWidth={1.5} />
            </div>
            <div className="menu-card-Meta">
              <span className="menu-card-title">{t('app.play.timer.title')}</span>
              <span className="menu-card-sub">{t('app.play.timer.description')}</span>
            </div>
          </button>

        <button className="menu-back-btn" onClick={() => setMode('menu')}>
          <ArrowLeft size={18} />
          <span>{t('common.backHome')}</span>
        </button>
      </div>
    );
  }

  // Sous-menu ALGORITHMES (2x2, 3x3, 4x4)
  if (mode === 'algos') {
    return (
      <div className="main-menu-container">
        <div className="menu-header-block">
          <span className="menu-eyebrow">{t('app.algos.eyebrow')}</span>
          <h1 className="main-menu-title">{t('app.algos.title')}</h1>
          <p className="main-menu-subtitle">
            {t('app.algos.description')}
          </p>
        </div>

        <div className="algo-methods-grid">
          <button className="method-select-card" onClick={() => setMode('simple2x2')}>
            <div className="method-card-icon cyan">
              <Compass size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">{t('app.algos.simple2x2.tag')}</div>
              <h3 className="method-card-title">{t('app.algos.simple2x2.title')}</h3>
              <p className="method-card-desc">{t('app.algos.simple2x2.description')}</p>
            </div>
            <ChevronRight size={20} className="method-card-arrow" />
          </button>

          <button className="method-select-card" onClick={() => setMode('ortega2x2')}>
            <div className="method-card-icon amber">
              <Zap size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">{t('app.algos.ortega2x2.tag')}</div>
              <h3 className="method-card-title">{t('app.algos.ortega2x2.title')}</h3>
              <p className="method-card-desc">{t('app.algos.ortega2x2.description')}</p>
            </div>
            <ChevronRight size={20} className="method-card-arrow" />
          </button>

          <button className="method-select-card" onClick={() => setMode('simple3x3')}>
            <div className="method-card-icon emerald">
              <Layers size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">{t('app.algos.simple3x3.tag')}</div>
              <h3 className="method-card-title">{t('app.algos.simple3x3.title')}</h3>
              <p className="method-card-desc">{t('app.algos.simple3x3.description')}</p>
            </div>
            <ChevronRight size={20} className="method-card-arrow" />
          </button>

          <button className="method-select-card" onClick={() => setMode('cfop3x3')}>
            <div className="method-card-icon rose">
              <Flame size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">{t('app.algos.cfop3x3.tag')}</div>
              <h3 className="method-card-title">{t('app.algos.cfop3x3.title')}</h3>
              <p className="method-card-desc">{t('app.algos.cfop3x3.description')}</p>
            </div>
            <ChevronRight size={20} className="method-card-arrow" />
          </button>

          <button className="method-select-card" onClick={() => setMode('blind3x3')}>
            <div className="method-card-icon purple">
              <EyeOff size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">{t('app.algos.blind3x3.tag')}</div>
              <h3 className="method-card-title">{t('app.algos.blind3x3.title')}</h3>
              <p className="method-card-desc">{t('app.algos.blind3x3.description')}</p>
            </div>
            <ChevronRight size={20} className="method-card-arrow" />
          </button>

          <button className="method-select-card" onClick={() => setMode('simple4x4')}>
            <div className="method-card-icon cyan">
              <Grid size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">{t('app.algos.simple4x4.tag')}</div>
              <h3 className="method-card-title">{t('app.algos.simple4x4.title')}</h3>
              <p className="method-card-desc">{t('app.algos.simple4x4.description')}</p>
            </div>
            <ChevronRight size={20} className="method-card-arrow" />
          </button>

          <button className="method-select-card" onClick={() => setMode('yau4x4')}>
            <div className="method-card-icon amber">
              <Cpu size={26} />
            </div>
            <div className="method-card-body">
              <div className="method-card-tag">{t('app.algos.yau4x4.tag')}</div>
              <h3 className="method-card-title">{t('app.algos.yau4x4.title')}</h3>
              <p className="method-card-desc">{t('app.algos.yau4x4.description')}</p>
            </div>
            <ChevronRight size={20} className="method-card-arrow" />
          </button>
        </div>

        <button className="menu-back-btn" onClick={() => setMode('menu')}>
          <ArrowLeft size={18} />
          <span>{t('common.backHome')}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="main-menu-container">
      <LanguageSwitcher className="menu-language-switcher" />
      <div className="menu-header-block">
        <span className="menu-eyebrow">{t('app.home.eyebrow')}</span>
        <h1 className="main-menu-title">{t('app.home.title')}</h1>
        <p className="main-menu-subtitle">
          {t('app.home.description')}
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
              <span className="menu-card-title">{t('app.home.play.title')}</span>
              <span className="menu-card-sub">{t('app.home.play.description')}</span>
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
              <span className="menu-card-title">{t('app.home.learn.title')}</span>
              <span className="menu-card-sub">{t('app.home.learn.description')}</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}