// src/components/algos/MethodeOrtega2x2.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Play, Gamepad2 } from 'lucide-react';
import { ORTEGA_SECTIONS, ORTEGA_DATA } from '../../data/ortegaData';
import { CubeDiagram2D } from './CubeDiagram2D';
import { AlgoDemoModal } from './AlgoDemoModal';
import { localizeCases, localizeGroups } from '../../i18n/localizeData';

const LEARNED_STORAGE_KEY = 'rubiks_learned_algos';

export function MethodeOrtega2x2({ onBack, onTestAlgo }) {
  const { t } = useTranslation();
  const sections = ORTEGA_SECTIONS.map(section => ({
    ...section,
    label: t(`data.section.ortega.${section.id}`)
  }));
  const groups = localizeGroups('ortega', ORTEGA_DATA, t);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedCase, setSelectedCase] = useState(null);
  const [learnedIds, setLearnedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LEARNED_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(LEARNED_STORAGE_KEY, JSON.stringify(learnedIds));
  }, [learnedIds]);

  const toggleLearned = (id, e) => {
    if (e) e.stopPropagation();
    setLearnedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const visibleGroups =
    activeFilter === 'ALL'
      ? groups
      : groups.filter(g => g.section === activeFilter);

  return (
    <div className="trainer-page">
      <header className="trainer-topbar">
        <button className="trainer-icon-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>{t('common.back')}</span>
        </button>
        <div className="trainer-topbar-center">
          <h1 className="trainer-topbar-title">{t('method.ortega2x2.title')}</h1>
        </div>
        <div style={{ width: '90px' }} />
      </header>

      <div className="trainer-tabs-bar">
        <div className="trainer-tabs-scroll">
          {sections.map(sec => (
            <button
              key={sec.id}
              className={`trainer-tab-btn ${activeFilter === sec.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(sec.id)}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>

      <main className="trainer-content">
        {visibleGroups.map(group => (
          <section key={group.group} className="trainer-group-section">
            <h2 className="trainer-group-header">{group.group}</h2>
            {group.description && (
              <p className="trainer-group-desc">{group.description}</p>
            )}
            <div className="trainer-cards-grid">
              {localizeCases(group.cases, t).map(item => {
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
                        size={2}
                        alg={item.alg}
                        setup={item.setup}
                        yellowTop={item.yellowTop}
                        maskMode={item.maskMode}
                        view={item.view}
                        arrows={item.arrows}
                      />
                    </div>

                    <div className="trainer-card-formula">{item.alg}</div>
                    <div className="trainer-card-name">
                      {t('common.nameLabel')} <span>{item.name}</span>
                    </div>
                    {item.description && (
                      <p className="trainer-card-subdesc">{item.description}</p>
                    )}

                    <div className="trainer-card-actions" onClick={e => e.stopPropagation()}>
                      <button
                        className="card-mini-btn"
                        onClick={() => setSelectedCase(item)}
                      >
                        <Play size={14} />
                        <span>{t('common.demo3d')}</span>
                      </button>
                      <button
                        className="card-mini-btn test"
                        onClick={() =>
                          onTestAlgo &&
                          onTestAlgo({
                            ...item,
                            size: 2
                          })
                        }
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
        ))}
      </main>

      {selectedCase && (
        <AlgoDemoModal
          algoCase={selectedCase}
          size={2}
          isLearned={learnedIds.includes(selectedCase.id)}
          onToggleLearned={id => toggleLearned(id)}
          onTestAlgo={caseObj =>
            onTestAlgo &&
            onTestAlgo({
              ...caseObj,
              size: 2
            })
          }
          onClose={() => setSelectedCase(null)}
        />
      )}
    </div>
  );
}