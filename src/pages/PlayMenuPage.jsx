// src/pages/PlayMenuPage.jsx
// Sous-menu JOUER (2x2, 3x3, 4x4, chronomètre)
import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock } from '@getpapillon/papicons';
import { MiniCube } from '../components/MiniCube';
import { PUZZLES, paths } from '../routes/routeConfig';
import { useSeo } from '../routes/useSeo';

export function PlayMenuPage() {
  const { t } = useTranslation();
  useSeo('play');

  return (
    <div className="main-menu-container">
      <div className="menu-header-block">
        <span className="menu-eyebrow">{t('app.play.eyebrow')}</span>
        <h1 className="main-menu-title">{t('app.play.title')}</h1>
        <p className="main-menu-subtitle">{t('app.play.description')}</p>
      </div>

      <nav className="main-menu-buttons">
        {PUZZLES.map(size => (
          <Link key={size} className="menu-btn cube-select-card" to={paths.game(size)}>
            <MiniCube size={Number(size[0])} />
            <div className="menu-card-Meta">
              <span className="menu-card-title">{t(`app.play.${size}.title`)}</span>
              <span className="menu-card-sub">{t(`app.play.${size}.description`)}</span>
            </div>
          </Link>
        ))}

        <Link className="menu-btn cube-select-card" to={paths.timer()}>
          <div className="mini-cube-container timer-menu-preview">
            <Clock size={76} />
          </div>
          <div className="menu-card-Meta">
            <span className="menu-card-title">{t('app.play.timer.title')}</span>
            <span className="menu-card-sub">{t('app.play.timer.description')}</span>
          </div>
        </Link>
      </nav>

      <Link className="menu-back-btn" to={paths.home()}>
        <ArrowLeft size={18} />
        <span>{t('common.backHome')}</span>
      </Link>
    </div>
  );
}

