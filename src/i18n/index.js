import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import englishMessages from './en.js';
import frenchMessages from './fr.js';

export const ENGLISH_TRANSLATION_READY = true;

const language = typeof window !== 'undefined' && window.location.pathname.startsWith('/en/')
  ? 'en'
  : 'fr';

export const i18nReady = i18next.use(initReactI18next).init({
  resources: {
    en: { translation: englishMessages },
    fr: { translation: frenchMessages }
  },
  lng: language,
  fallbackLng: 'fr',
  supportedLngs: ['en', 'fr'],
  keySeparator: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false }
});

export default i18next;
