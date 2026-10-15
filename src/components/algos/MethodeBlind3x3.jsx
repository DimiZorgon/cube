// src/components/algos/MethodeBlind3x3.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Play,
  Gamepad2,
  Check,
  EyeOff,
  Layers,
  Grid
} from 'lucide-react';
import {
  BLD_TABS,
  SPEFFZ_FACES,
  BLD_CORE_CASES,
  EDGE_SETUPS,
  CORNER_SETUPS,
  BLD_GUIDE_STEPS
} from '../../data/blind3x3Data';
import { CubeDiagram2D } from './CubeDiagram2D';
import { AlgoDemoModal } from './AlgoDemoModal';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { localizeCases, localizeSteps } from '../../i18n/localizeData';

const LEARNED_STORAGE_KEY = 'rubiks_learned_algos';

// Composant SVG du Patron Speffz (cliquable pour inspecter chaque lettre A-X)
function SpeffzNetSVG({ mode, onSelectLetter, t }) {
  // Position des 4 lettres (A, B, C, D dans le sens horaire) selon qu'on regarde les Arêtes ou les Coins
  const getLetterCoords = (index, type) => {
    if (type === 'edges') {
      // 0: Haut, 1: Droite, 2: Bas, 3: Gauche
      return [
        [1, 0], // Haut
        [2, 1], // Droite
        [1, 2], // Bas
        [0, 1]  // Gauche
      ][index];
    }
    // Coins : 0: Haut-Gauche, 1: Haut-Droite, 2: Bas-Droite, 3: Bas-Gauche
    return [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2]
    ][index];
  };

  const getRoleBadge = (letter, type) => {
    if (type === 'edges') {
      if (letter === 'B' || letter === 'M') return t('bld.roleBuffer');
      if (letter === 'D') return t('bld.roleTarget');
    } else {
      if (letter === 'A' || letter === 'E' || letter === 'R') return t('bld.roleBuffer');
      if (letter === 'P') return t('bld.roleTarget');
    }
    return null;
  };

  const faceSize = 96;
  const cellSize = 32;
  const gap = 8;
  const offsetX = 16;
  const offsetY = 14;

  return (
    <svg
      viewBox="0 0 440 330"
      className="speffz-net-svg"
      style={{ width: '100%', maxWidth: '560px', height: 'auto' }}
    >
      {SPEFFZ_FACES.map(face => {
        const [row, col] = face.gridPos;
        const fx = offsetX + col * (faceSize + gap);
        const fy = offsetY + row * (faceSize + gap);

        return (
          <g key={face.id} transform={`translate(${fx}, ${fy})`}>
            {/* Grille 3x3 de la face */}
            {[0, 1, 2].map(r =>
              [0, 1, 2].map(c => (
                <rect
                  key={`${r}_${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={face.color}
                  stroke="#0f172a"
                  strokeWidth="2"
                  rx="3"
                />
              ))
            )}

            {/* Lettre centrale de la face (U, L, F, R, B, D) */}
            <text
              x={1.5 * cellSize}
              y={1.5 * cellSize + 5}
              textAnchor="middle"
              fill={face.textColor}
              fontSize="14"
              fontWeight="900"
              opacity="0.45"
            >
              {face.id}
            </text>

            {/* Les 4 lettres Speffz de la face */}
            {face.letters.map((letter, idx) => {
              const [cx, cy] = getLetterCoords(idx, mode);
              const role = getRoleBadge(letter, mode);
              const xPos = cx * cellSize;
              const yPos = cy * cellSize;

              return (
                <g
                  key={letter}
                  onClick={() => onSelectLetter(letter)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={xPos + 2}
                    y={yPos + 2}
                    width={cellSize - 4}
                    height={cellSize - 4}
                    rx="4"
                    fill={
                      role === 'BUFFER'
                        ? '#ef4444'
                        : role === 'CIBLE'
                        ? '#22c55e'
                        : 'rgba(15, 23, 42, 0.18)'
                    }
                    stroke={role ? '#ffffff' : 'transparent'}
                    strokeWidth="1.5"
                  />
                  <text
                    x={xPos + cellSize / 2}
                    y={yPos + cellSize / 2 + 5}
                    textAnchor="middle"
                    fill={role ? '#ffffff' : face.textColor}
                    fontSize="14"
                    fontWeight="800"
                  >
                    {letter}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function MethodeBlind3x3({ onBack, onTestAlgo }) {
  const { t } = useTranslation();
  const tabs = BLD_TABS.map(tab => ({
    ...tab,
    label: t(`data.section.bld.${tab.id}`)
  }));
  const guideSteps = localizeSteps(BLD_GUIDE_STEPS, t);
  const coreCases = localizeCases(BLD_CORE_CASES, t);
  const edgeSetups = localizeCases(EDGE_SETUPS, t);
  const cornerSetups = localizeCases(CORNER_SETUPS, t);
  const [activeTab, setActiveTab] = useState('GUIDE');
  const [netMode, setNetMode] = useState('edges'); // 'edges' | 'corners'
  const [openStepId, setOpenStepId] = useState(BLD_GUIDE_STEPS[0].id);
  const [faceFilter, setFaceFilter] = useState('ALL');
  const [selectedCase, setSelectedCase] = useState(null);

  const [learnedIds, setLearnedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LEARNED_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const toggleLearned = (id, e) => {
    if (e) e.stopPropagation();
    setLearnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem(LEARNED_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleSelectNetLetter = letter => {
    const list = netMode === 'edges' ? edgeSetups : cornerSetups;
    const found = list.find(item => item.letter === letter);
    if (found && found.role !== 'buffer') {
      setSelectedCase(found);
    }
  };

  const currentSetupList = activeTab === 'CORNERS_SETUP' ? cornerSetups : edgeSetups;
  const filteredSetups =
    faceFilter === 'ALL'
      ? currentSetupList
      : currentSetupList.filter(item => item.face.startsWith(faceFilter));

  return (
    <div className="trainer-page">
      <header className="trainer-topbar">
        <button className="trainer-icon-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>{t('common.back')}</span>
        </button>
        <div className="trainer-topbar-center">
          <EyeOff size={20} style={{ color: '#38bdf8' }} />
          <h1 className="trainer-topbar-title">{t('bld.title')}</h1>
        </div>
        <LanguageSwitcher className="trainer-icon-btn" />
      </header>

      {/* Barre d'onglets principale */}
      <div className="trainer-tabs-bar">
        <div className="trainer-tabs-scroll">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`trainer-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="trainer-content">
        {/* ONGLET 1 : GUIDE & PATRON SPEFFZ INTERACTIF */}
        {activeTab === 'GUIDE' && (
          <>
            <div className="bld-net-card">
              <div className="bld-net-header">
                <div>
                  <h2 className="trainer-group-header" style={{ border: 'none', margin: 0 }}>
                    {t('bld.interactivePattern')}
                  </h2>
                  <p className="trainer-group-desc" style={{ margin: '0.25rem 0 0' }}>
                    {t('bld.patternHelp')}
                  </p>
                </div>
                <div className="bld-net-toggle-group">
                  <button
                    className={`trainer-tab-btn ${netMode === 'edges' ? 'active' : ''}`}
                    onClick={() => setNetMode('edges')}
                  >
                    <Layers size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {t('bld.edges')}
                  </button>
                  <button
                    className={`trainer-tab-btn ${netMode === 'corners' ? 'active' : ''}`}
                    onClick={() => setNetMode('corners')}
                  >
                    <Grid size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    {t('bld.corners')}
                  </button>
                </div>
              </div>

              <div className="bld-net-body">
                <SpeffzNetSVG mode={netMode} onSelectLetter={handleSelectNetLetter} t={t} />
                <div className="bld-net-legend">
                  <span className="bld-legend-item">
                    <span className="bld-dot buffer" /> {t('bld.buffer')} ({netMode === 'edges' ? 'B / M' : 'A / E / R'})
                  </span>
                  <span className="bld-legend-item">
                    <span className="bld-dot target" /> {t('bld.target')} ({netMode === 'edges' ? 'D (T-Perm)' : 'P (Y-Perm mod.)'})
                  </span>
                  <span className="bld-legend-item">
                    {t('bld.orientation')}
                  </span>
                </div>
              </div>
            </div>

            <div className="accordion-container" style={{ marginTop: '1.5rem' }}>
              {guideSteps.map((step, index) => {
                const isOpen = openStepId === step.id;
                return (
                  <div key={step.id} className={`step-accordion ${isOpen ? 'open' : ''}`}>
                    <button
                      className="step-accordion-header"
                      onClick={() => setOpenStepId(prev => (prev === step.id ? null : step.id))}
                    >
                      <div className="step-badge-num">{index + 1}</div>
                      <div className="step-header-texts">
                        <div className="step-header-title">{step.title}</div>
                        <div className="step-header-sub">{step.subtitle}</div>
                      </div>
                      <div className="step-chevron">
                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="step-accordion-body">
                        <div className="step-explanations" style={{ marginBottom: 0 }}>
                          {step.content.map((para, i) => (
                            <p key={i}>{para}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ONGLET 2 : LES 3 ALGORITHMES D'EXÉCUTION */}
        {activeTab === 'CORE_ALGOS' && (
          <section className="trainer-group-section">
            <h2 className="trainer-group-header">
              {t('bld.coreAlgorithms')}
            </h2>
            <p className="trainer-group-desc">
              {t('bld.coreHelp')}
            </p>
            <div className="trainer-cards-grid">
              {coreCases.map(item => {
                const isLearned = learnedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`trainer-algo-card ${isLearned ? 'is-learned' : ''}`}
                    onClick={() => setSelectedCase(item)}
                  >
                    <button
                      className={`card-learned-badge ${isLearned ? 'learned' : ''}`}
                      onClick={e => toggleLearned(item.id, e)}
                      title={t('common.markLearned')}
                    >
                      <Check size={16} strokeWidth={2.5} />
                    </button>

                    <div className="trainer-card-diagram">
                      <CubeDiagram2D
                        size={3}
                        alg={item.alg}
                        yellowTop={item.yellowTop}
                        maskMode={item.maskMode}
                        view={item.view}
                        arrows={item.arrows}
                      />
                    </div>

                    <div className="trainer-card-formula">{item.alg}</div>
                    <div className="trainer-card-name">
                      <span>{item.name}</span>
                    </div>
                    <p className="trainer-card-subdesc">{item.description}</p>

                    <div className="trainer-card-actions" onClick={e => e.stopPropagation()}>
                      <button className="card-mini-btn" onClick={() => setSelectedCase(item)}>
                        <Play size={14} />
                        <span>{t('common.demo3d')}</span>
                      </button>
                      <button
                        className="card-mini-btn test"
                        onClick={() => onTestAlgo && onTestAlgo({ ...item, size: 3 })}
                      >
                        <Gamepad2 size={15} />
                        <span>{t('common.test')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ONGLETS 3 & 4 : TABLEAUX DES SETUP MOVES (ARÊTES & COINS) */}
        {(activeTab === 'EDGES_SETUP' || activeTab === 'CORNERS_SETUP') && (
          <section className="trainer-group-section">
            <div className="bld-setup-header-row">
              <div>
                <h2 className="trainer-group-header" style={{ border: 'none', margin: 0 }}>
                  {activeTab === 'EDGES_SETUP'
                    ? t('bld.setups.edges')
                    : t('bld.setups.corners')}
                </h2>
                <p className="trainer-group-desc" style={{ margin: '0.25rem 0 0' }}>
                  {t('bld.setups.help')}
                </p>
              </div>

              {/* Filtre rapide par face */}
              <div className="bld-face-filters">
                {['ALL', 'U', 'L', 'F', 'R', 'B', 'D'].map(f => (
                  <button
                    key={f}
                    className={`trainer-tab-btn ${faceFilter === f ? 'active' : ''}`}
                    onClick={() => setFaceFilter(f)}
                  >
                    {f === 'ALL' ? t('bld.allFaces') : t('bld.face', { face: f })}
                  </button>
                ))}
              </div>
            </div>

            <div className="bld-setup-grid">
              {filteredSetups.map(item => {
                const isLearned = learnedIds.includes(item.id);
                const isBuffer = item.role === 'buffer';
                const isTarget = item.role === 'target';

                return (
                  <div
                    key={item.id}
                    className={`bld-setup-card ${isLearned ? 'is-learned' : ''} ${
                      isBuffer ? 'is-buffer' : ''
                    }`}
                    onClick={() => !isBuffer && setSelectedCase(item)}
                  >
                    <div className="bld-setup-card-top">
                      <div className={`bld-letter-badge ${item.role}`}>{item.letter}</div>
                      <div className="bld-setup-meta">
                        <span className="bld-setup-face">{item.face}</span>
                        <span className="bld-setup-pos">{t('bld.piece', { position: item.pos })}</span>
                      </div>
                      {!isBuffer && (
                        <button
                          className={`card-learned-badge ${isLearned ? 'learned' : ''}`}
                          style={{ position: 'static' }}
                          onClick={e => toggleLearned(item.id, e)}
                          title={t('bld.learnSetup')}
                        >
                          <Check size={15} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>

                    <div className="bld-setup-moves-box">
                      <div className="bld-setup-line">
                        <span className="bld-setup-label">{t('bld.setup')}</span>
                        <code className="bld-setup-code">
                          {isBuffer ? `${t('bld.buffer')} (${t('bld.noSetup')})` : isTarget ? `${t('bld.target')} (${t('bld.noSetup')})` : item.setupMove}
                        </code>
                      </div>
                      {item.role === 'normal' && (
                        <div className="bld-setup-line">
                          <span className="bld-setup-label">{t('bld.undo')}</span>
                          <code className="bld-setup-code undo">{item.undo}</code>
                        </div>
                      )}
                    </div>

                    <p className="bld-setup-note">{item.note}</p>

                    {!isBuffer && (
                      <div className="trainer-card-actions" onClick={e => e.stopPropagation()}>
                        <button
                          className="card-mini-btn"
                          onClick={() => setSelectedCase(item)}
                        >
                          <Play size={14} />
                          <span>{t('bld.viewSetup')}</span>
                        </button>
                        <button
                          className="card-mini-btn test"
                          onClick={() => onTestAlgo && onTestAlgo({ ...item, size: 3 })}
                        >
                          <Gamepad2 size={15} />
                          <span>{t('common.test')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {selectedCase && (
        <AlgoDemoModal
          algoCase={selectedCase}
          size={3}
          isLearned={learnedIds.includes(selectedCase.id)}
          onToggleLearned={id => toggleLearned(id)}
          onTestAlgo={caseObj => onTestAlgo && onTestAlgo({ ...caseObj, size: 3 })}
          onClose={() => setSelectedCase(null)}
        />
      )}
    </div>
  );
}