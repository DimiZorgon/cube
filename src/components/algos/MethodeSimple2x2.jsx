// src/components/algos/MethodeSimple2x2.jsx
import React, { useState } from 'react';
import { ArrowLeft, ChevronUp, ChevronDown, Play, Gamepad2 } from 'lucide-react';
import { SIMPLE_2X2_STEPS } from '../../data/simple2x2Data';
import { CubeDiagram2D } from './CubeDiagram2D';
import { AlgoDemoModal } from './AlgoDemoModal';

export function MethodeSimple2x2({ onBack, onTestAlgo }) {
  const [openStepId, setOpenStepId] = useState(SIMPLE_2X2_STEPS[0].id);
  const [selectedCase, setSelectedCase] = useState(null);

  const toggleStep = id => {
    setOpenStepId(prev => (prev === id ? null : id));
  };

  return (
    <div className="trainer-page">
      <header className="trainer-topbar">
        <button className="trainer-icon-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Retour</span>
        </button>
        <div className="trainer-topbar-center">
          <h1 className="trainer-topbar-title">Méthode Simple 2x2 (Débutant)</h1>
        </div>
        <div style={{ width: '90px' }} />
      </header>

      <main className="trainer-content accordion-container">
        {SIMPLE_2X2_STEPS.map((step, index) => {
          const isOpen = openStepId === step.id;
          return (
            <div key={step.id} className={`step-accordion ${isOpen ? 'open' : ''}`}>
              <button
                className="step-accordion-header"
                onClick={() => toggleStep(step.id)}
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
                  <div className="step-explanations">
                    {step.explanation.map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>

                  <div className="trainer-cards-grid">
                    {step.cases.map(item => (
                      <div
                        key={item.id}
                        className="trainer-algo-card"
                        onClick={() => setSelectedCase(item)}
                      >
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
                          Cas : <span>{item.name}</span>
                        </div>
                        {item.description && (
                          <p className="trainer-card-subdesc">{item.description}</p>
                        )}
                        <div
                          className="trainer-card-actions"
                          onClick={e => e.stopPropagation()}
                        >
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
                                size: 2
                              })
                            }
                          >
                            <Gamepad2 size={15} />
                            <span>Tester</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </main>

      {selectedCase && (
        <AlgoDemoModal
          algoCase={selectedCase}
          size={2}
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