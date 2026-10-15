// src/components/algos/MethodeYau4x4.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Play, Gamepad2 } from 'lucide-react';
import { YAU_SECTIONS, YAU_DATA } from '../../data/yau4x4Data';
import { CubeDiagram2D } from './CubeDiagram2D';
import { AlgoDemoModal } from './AlgoDemoModal';

const LEARNED_STORAGE_KEY = 'rubiks_learned_algos';

export function MethodeYau4x4({ onBack, onTestAlgo }) {
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
      ? YAU_DATA
      : YAU_DATA.filter(g => g.section === activeFilter);

  return (
    <div className="trainer-page">
      <header className="trainer-topbar">
        <button className="trainer-icon-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Retour</span>
        </button>
        <div className="trainer-topbar-center">
          <h1 className="trainer-topbar-title">Méthode Yau 4x4 (Speedcubing / CFOP)</h1>
        </div>
        <div style={{ width: '90px' }} />
      </header>

      <div className="trainer-tabs-bar">
        <div className="trainer-tabs-scroll">
          {YAU_SECTIONS.map(sec => (
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
              {group.cases.map(item => {
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
                      title="Marquer comme appris"
                    >
                      <Check size={16} strokeWidth={2.5} />
                    </button>

                    <div className="trainer-card-diagram">
                      <CubeDiagram2D
                        size={4}
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
                      Nom : <span>{item.name}</span>
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
                        <span>Démo 3D</span>
                      </button>
                      <button
                        className="card-mini-btn test"
                        onClick={() =>
                          onTestAlgo &&
                          onTestAlgo({
                            ...item,
                            size: 4
                          })
                        }
                      >
                        <Gamepad2 size={15} />
                        <span>Tester</span>
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
          size={4}
          isLearned={learnedIds.includes(selectedCase.id)}
          onToggleLearned={id => toggleLearned(id)}
          onTestAlgo={caseObj =>
            onTestAlgo &&
            onTestAlgo({
              ...caseObj,
              size: 4
            })
          }
          onClose={() => setSelectedCase(null)}
        />
      )}
    </div>
  );
}