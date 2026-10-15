import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';

export const MoveButton = ({ label, onMove }) => {
  const { t } = useTranslation();
  const timerRef = useRef(null);

  const handlePointerDown = () => {
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onMove(label.toLowerCase());
    }, 500);
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onMove(label);
    }
  };

  return (
    <button
      className="move-btn"
      aria-label={t('move.ariaLabel', { label })}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {label}
    </button>
  );
};
