// src/components/SmartCube/MacAddressModal.jsx
import { useState, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Cross, Info, Check } from '@getpapillon/papicons';
import { isValidMacAddress, formatMacAddress } from '../../utils/smartCube/macAddressUtils.js';

export function MacAddressModal({ isOpen, initialMac = '', onClose, onSaveAndConnect }) {
  const { t } = useTranslation();
  const inputId = useId();
  const [macInput, setMacInput] = useState(initialMac);
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState(false);

  if (!isOpen) return null;

  const isValid = isValidMacAddress(macInput);
  const showError = touched && macInput.trim().length > 0 && !isValid;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) {
      setTouched(true);
      return;
    }
    const formatted = formatMacAddress(macInput);
    onSaveAndConnect(formatted, remember);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mac-modal-title"
    >
      <div className="relative w-full max-w-md p-5 sm:p-6 rounded-xl bg-[#202629] border border-[#394144] text-[#f0f1ed] flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#252b2e] border border-[#385a49] text-[#9eb5aa]">
              <Info size={20} />
            </div>
            <div>
              <h2 id="mac-modal-title" className="text-base sm:text-lg font-bold text-white leading-tight">
                {t('smartCube.macModal.title', 'Adresse MAC du GAN 16 ui')}
              </h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                {t('smartCube.macModal.subtitle', 'Nécessaire pour déchiffrer les données Bluetooth')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#94a3b8] hover:text-white hover:bg-[#2b3336] transition-colors cursor-pointer"
            aria-label={t('common.close', 'Fermer')}
          >
            <Cross size={18} />
          </button>
        </div>

        {/* Instructions */}
        <div className="p-3 rounded-lg bg-[#252b2e] border border-[#41494c] text-xs text-[#cbd5e1] leading-relaxed flex flex-col gap-1.5">
          <p className="font-semibold text-white">
            {t('smartCube.macModal.howToFind', 'Comment obtenir l’adresse MAC :')}
          </p>
          <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] sm:text-xs text-[#94a3b8]">
            <li>
              {t('smartCube.macModal.step1', 'Ouvrez un nouvel onglet : ')}
              <code className="px-1.5 py-0.5 rounded bg-black/40 text-emerald-300 font-mono select-all">
                chrome://bluetooth-internals/#devices
              </code>
            </li>
            <li>{t('smartCube.macModal.step2', 'Repérez votre cube (ex. GAN-16ui-MAX-...)')}</li>
            <li>{t('smartCube.macModal.step3', 'Copiez la valeur de la colonne "Address"')}</li>
          </ol>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-xs font-semibold text-[#cbd5e1]">
              {t('smartCube.macModal.inputLabel', 'Adresse MAC (12 caractères hexadécimaux)')}
            </label>
            <div className="relative">
              <input
                id={inputId}
                type="text"
                value={macInput}
                onChange={(e) => {
                  setMacInput(e.target.value.toUpperCase());
                  if (!touched) setTouched(true);
                }}
                placeholder="DC:BE:4A:16:14:01"
                className={`w-full px-3.5 py-2.5 rounded-lg bg-[#1b2023] border font-mono text-sm tracking-wider text-white placeholder-slate-500 focus:outline-none transition-colors ${
                  showError
                    ? 'border-rose-500 focus:border-rose-400'
                    : isValid
                    ? 'border-emerald-500 focus:border-emerald-400'
                    : 'border-[#41494c] focus:border-[#9eb5aa]'
                }`}
                autoFocus
                autoComplete="off"
                spellCheck="false"
              />
              {isValid && (
                <div className="absolute right-3 top-3 text-emerald-400 pointer-events-none">
                  <Check size={16} />
                </div>
              )}
            </div>
            {showError && (
              <span className="text-[11px] text-rose-400">
                {t('smartCube.macModal.errorInvalid', 'Format attendu : XX:XX:XX:XX:XX:XX ou 12 caractères hexadécimaux')}
              </span>
            )}
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-[#cbd5e1]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded bg-[#1b2023] border-[#41494c] text-emerald-500 focus:ring-0 cursor-pointer"
            />
            <span>{t('smartCube.macModal.remember', 'Mémoriser cette adresse sur cet appareil')}</span>
          </label>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#394144]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#252b2e] border border-[#41494c] text-[#cbd5e1] hover:bg-[#2b3336] transition-colors cursor-pointer"
            >
              {t('common.cancel', 'Annuler')}
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className={`px-4 py-2 text-xs font-bold rounded-lg primary-action transition-all cursor-pointer ${
                !isValid ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {t('smartCube.macModal.saveAndConnect', 'Enregistrer & Connecter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MacAddressModal;
