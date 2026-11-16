import React from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { localizedPath } from '../routes/routeConfig';

export function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation();
  const { pathname } = useLocation();
  const currentLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'fr';
  const targetLanguage = currentLanguage === 'en' ? 'fr' : 'en';
  const label = targetLanguage === 'en'
    ? t('language.switchToEnglish')
    : t('language.switchToFrench');

  const cleanPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
  const href = localizedPath(cleanPath, targetLanguage);

  return (
    <a
      className={`language-switcher ${className}`}
      href={href}
      lang={targetLanguage}
      aria-label={label}
      title={label}
    >
      {targetLanguage.toUpperCase()}
    </a>
  );
}
