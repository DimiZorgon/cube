// src/pages/AlgosMenuPage.jsx
// Sous-menu ALGORITHMES (2x2, 3x3, 4x4)
import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  GraduationHat,
  Sparkles,
  Tasks,
  Crown,
  Ghost,
  Grid,
  Gears,
  ChevronRight
} from '@getpapillon/papicons';
import { findMethodByKey, paths } from '../routes/routeConfig';
import { useSeo } from '../routes/useSeo';

const METHOD_CARDS = [
  { key: 'simple2x2', Icon: GraduationHat, color: 'cyan' },
  { key: 'ortega2x2', Icon: Sparkles, color: 'amber' },
  { key: 'simple3x3', Icon: Tasks, color: 'emerald' },
  { key: 'cfop3x3', Icon: Crown, color: 'rose' },
  { key: 'blind3x3', Icon: Ghost, color: 'purple' },
  { key: 'simple4x4', Icon: Grid, color: 'cyan' },
  { key: 'yau4x4', Icon: Gears, color: 'amber' }
];

export function AlgosMenuPage() {
  const { t } = useTranslation();
  useSeo('algos');

  return (
    <div className="main-menu-container">
      <div className="menu-header-block">
        <span className="menu-eyebrow">{t('app.algos.eyebrow')}</span>
        <h1 className="main-menu-title">{t('app.algos.title')}</h1>
        <p className="main-menu-subtitle">{t('app.algos.description')}</p>
      </div>

      <nav className="algo-methods-grid">
        {METHOD_CARDS.map(({ key, Icon, color }) => {
          const method = findMethodByKey(key);
          return (
            <Link
              key={key}
              className="method-select-card"
              to={paths.method(method, method.defaultSection)}
            >
              <div className={`method-card-icon ${color}`}>
                <Icon size={26} />
              </div>
              <div className="method-card-body">
                <div className="method-card-tag">{t(`app.algos.${key}.tag`)}</div>
                <h3 className="method-card-title">{t(`app.algos.${key}.title`)}</h3>
                <p className="method-card-desc">{t(`app.algos.${key}.description`)}</p>
              </div>
              <ChevronRight size={20} className="method-card-arrow" />
            </Link>
          );
        })}
      </nav>

      <Link className="menu-back-btn" to={paths.home()}>
        <ArrowLeft size={18} />
        <span>{t('common.backHome')}</span>
      </Link>
    </div>
  );
}

