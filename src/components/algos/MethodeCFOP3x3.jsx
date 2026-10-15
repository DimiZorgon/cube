// src/components/algos/MethodeCFOP3x3.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Menu,
  Check,
  Play,
  Gamepad2,
  BookOpen,
  Filter,
  X
} from 'lucide-react';
import { CFOP_SECTIONS, CFOP_DATA } from '../../data/cfopData';
import { CubeDiagram2D } from './CubeDiagram2D';
import { AlgoDemoModal } from './AlgoDemoModal';
import { localizeCFOPGroups, localizeCases } from '../../i18n/localizeData';

const LEARNED_STORAGE_KEY = 'rubiks_learned_algos';

export function MethodeCFOP3x3({ onBack, onTestAlgo }) {
  const { t } = useTranslation();
  const sections = CFOP_SECTIONS.map(section => ({
    ...section,
    label: t(`data.section.cfop.${section.id}`)
  }));
  const [activeSection, setActiveSection] = useState('PLL');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showOnlyUnlearned, setShowOnlyUnlearned] = useState(false);
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

  const groups = localizeCFOPGroups(activeSection, CFOP_DATA[activeSection] || [], t);
  const activeSectionLabel = sections.find(section => section.id === activeSection)?.label || activeSection;
  const totalCases = groups.reduce((acc, g) => acc + g.cases.length, 0);
  const learnedCount = groups.reduce(
    (acc, g) => acc + g.cases.filter(c => learnedIds.includes(c.id)).length,
    0
  );

  return (
    <div className="trainer-page">
      <header className="trainer-topbar">
        <button className="trainer-icon-btn" onClick={onBack} aria-label={t('common.back')}>
          <ArrowLeft size={16} />
          <span>{t('common.back')}</span>
        </button>
        <div className="trainer-topbar-center">
          <h1 className="trainer-topbar-title">{t('method.cfop3x3.title', { section: activeSectionLabel })}</h1>
          <span className="trainer-progress-pill">
            {t('algo.learnedCount', { count: learnedCount, total: totalCases })}
          </span>
        </div>
        <div className="trainer-topbar-actions">
          <button
            className="trainer-icon-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label={t('algo.categoryMenu')}
          >
            <Menu size={16} />
            <span>{t('algo.categories')}</span>
          </button>
        </div>
      </header>

      <div className="trainer-tabs-bar">
        <div className="trainer-tabs-scroll">
          {sections.map(sec => (
            <button
              key={sec.id}
              className={`trainer-tab-btn ${activeSection === sec.id ? 'active' : ''}`}
              onClick={() => setActiveSection(sec.id)}
            >
              {sec.label}
            </button>
          ))}
        </div>
        <button
          className={`trainer-filter-chip ${showOnlyUnlearned ? 'active' : ''}`}
          onClick={() => setShowOnlyUnlearned(v => !v)}
        >
          <Filter size={14} />
          <span>{showOnlyUnlearned ? t('algo.onlyToLearn') : t('algo.showAll')}</span>
        </button>
      </div>

      {drawerOpen && (
        <div className="trainer-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside className="trainer-drawer" onClick={e => e.stopPropagation()}>
            <div className="trainer-drawer-banner">
              <div>
                <div className="trainer-drawer-banner-title">{t('algo.training')}</div>
                <div className="trainer-drawer-banner-sub">{t('algo.selectStage')}</div>
              </div>
              <button className="algo-modal-close" onClick={() => setDrawerOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <nav className="trainer-drawer-nav">
              {sections.map(sec => (
                <button
                  key={sec.id}
                  className={`trainer-drawer-item ${activeSection === sec.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSection(sec.id);
                    setDrawerOpen(false);
                  }}
                >
                  <BookOpen size={18} />
                  <span>{sec.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <main className="trainer-content">
        {groups.map(group => {
          const filteredCases = showOnlyUnlearned
            ? group.cases.filter(c => !learnedIds.includes(c.id))
            : group.cases;

          if (filteredCases.length === 0) return null;

          return (
            <section key={group.group} className="trainer-group-section">
              <h2 className="trainer-group-header">{group.group}</h2>
              <div className="trainer-cards-grid">
                {localizeCases(filteredCases, t).map(item => {
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
                        title={isLearned ? t('algo.markedLearned') : t('algo.notMarkedLearned')}
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </button>

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
                        {t('common.nameLabel')} <span>{item.name}</span>
                      </div>

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
                              size: 3
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
          );
        })}
      </main>

      {selectedCase && (
        <AlgoDemoModal
          algoCase={selectedCase}
          size={3}
          isLearned={learnedIds.includes(selectedCase.id)}
          onToggleLearned={id => toggleLearned(id)}
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