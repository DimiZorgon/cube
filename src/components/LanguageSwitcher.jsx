import React from 'react';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher({ className = '' }) {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage === 'en' ? 'en' : 'fr';
  const targetLanguage = currentLanguage === 'en' ? 'fr' : 'en';
  const label = targetLanguage === 'en'
    ? t('language.switchToEnglish')
    : t('language.switchToFrench');

  return (
    <a
      className={`language-switcher ${className}`}
      href={targetLanguage === 'en' ? '/en/' : '/'}
      lang={targetLanguage}
      aria-label={label}
      title={label}
    >
      {targetLanguage.toUpperCase()}
    </a>
  );
}
