// src/components/algos/MethodeSimple3x3.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronUp, ChevronDown, Play, Gamepad2 } from 'lucide-react';
import { SIMPLE_3X3_STEPS } from '../../data/simple3x3Data';
import { CubeDiagram2D } from './CubeDiagram2D';
import { AlgoDemoModal } from './AlgoDemoModal';
import { localizeSteps } from '../../i18n/localizeData';

export function MethodeSimple3x3({ onBack, onTestAlgo }) {
  const { t } = useTranslation();
  const steps = localizeSteps(SIMPLE_3X3_STEPS, t);
  const [openStepId, setOpenStepId] = useState(SIMPLE_3X3_STEPS[0].id);
  const [selectedCase, setSelectedCase] = useState(null);

  const toggleStep = id => {
    setOpenStepId(prev => (prev === id ? null : id));
  };

  return (
    <div className="trainer-page">
      <header className="trainer-topbar">
        <button className="trainer-icon-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>{t('common.back')}</span>
        </button>
        <div className="trainer-topbar-center">
          <h1 className="trainer-topbar-title">{t('method.simple3x3.title')}</h1>
        </div>
        <div style={{ width: '90px' }} />
      </header>

      <main className="trainer-content accordion-container">
        {steps.map((step, index) => {
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
                            size={3}
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
                            {t('common.case')} : <span>{item.name}</span>
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
                            <span>{t('common.demo3d')}</span>
                          </button>
                          <button
                            className="card-mini-btn test"
                            onClick={() =>
                              onTestAlgo &&
                              onTestAlgo({
                                ...item,
                                size: 3
                              })
                            }
                          >
                            <Gamepad2 size={15} />
                            <span>{t('common.test')}</span>
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
          size={3}
          onTestAlgo={caseObj =>
            onTestAlgo &&
            onTestAlgo({
              ...caseObj,
              size: 3
            })
          }
          onClose={() => setSelectedCase(null)}
        />
      )}
    </div>
  );
}