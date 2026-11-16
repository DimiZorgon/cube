// src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Play, Bookmark, Gears } from '@getpapillon/papicons';
import { MiniCube } from '../components/MiniCube';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { paths } from '../routes/routeConfig';
import { useSeo } from '../routes/useSeo';

export function HomePage() {
  const { t } = useTranslation();
  useSeo('home');

  return (
    <div className="main-menu-container">
      <LanguageSwitcher className="menu-language-switcher" />
      <div className="menu-header-block">
        <span className="menu-eyebrow">{t('app.home.eyebrow')}</span>
        <h1 className="main-menu-title">{t('app.home.title')}</h1>
        <p className="main-menu-subtitle">{t('app.home.description')}</p>
      </div>

      <nav className="main-menu-buttons">
        <Link className="menu-btn primary-pole-card" to={paths.play()}>
          <div className="pole-preview-wrapper">
            <MiniCube size={3} />
          </div>
          <div className="pole-card-footer">
            <div className="pole-icon-badge">
              <Play size={24} />
            </div>
            <div className="menu-card-Meta">
              <span className="menu-card-title">{t('app.home.play.title')}</span>
              <span className="menu-card-sub">{t('app.home.play.description')}</span>
            </div>
          </div>
        </Link>

        <Link className="menu-btn primary-pole-card" to={paths.algos()}>
          <div className="pole-preview-wrapper algo-hub-graphic">
            <Bookmark size={68} />
          </div>
          <div className="pole-card-footer">
            <div className="pole-icon-badge accent">
              <Bookmark size={24} />
            </div>
            <div className="menu-card-Meta">
              <span className="menu-card-title">{t('app.home.learn.title')}</span>
              <span className="menu-card-sub">{t('app.home.learn.description')}</span>
            </div>
          </div>
        </Link>

        <Link className="menu-btn primary-pole-card" to={paths.settings()}>
          <div className="pole-preview-wrapper algo-hub-graphic">
            <Gears size={68} />
          </div>
          <div className="pole-card-footer">
            <div className="pole-icon-badge accent">
              <Gears size={24} />
            </div>
            <div className="menu-card-Meta">
              <span className="menu-card-title">
                {t('app.home.settings.title', { defaultValue: 'Paramètres' })}
              </span>
              <span className="menu-card-sub">
                {t('app.home.settings.description', {
                  defaultValue: 'Style creux, couleurs, taille & vitesse'
                })}
              </span>
            </div>
          </div>
        </Link>
      </nav>
    </div>
  );
}

