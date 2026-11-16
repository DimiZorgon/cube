// src/pages/NotFoundPage.jsx
import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from '@getpapillon/papicons';
import { paths } from '../routes/routeConfig';
import { useSeo } from '../routes/useSeo';

export function NotFoundPage() {
  const { t } = useTranslation();
  useSeo('notFound');

  return (
    <div className="main-menu-container">
      <div className="menu-header-block">
        <span className="menu-eyebrow">{t('notFound.eyebrow')}</span>
        <h1 className="main-menu-title">{t('notFound.title')}</h1>
        <p className="main-menu-subtitle">{t('notFound.description')}</p>
      </div>
      <Link className="menu-back-btn" to={paths.home()}>
        <ArrowLeft size={18} />
        <span>{t('notFound.home')}</span>
      </Link>
    </div>
  );
}

