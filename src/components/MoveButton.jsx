import React, { useRef } from 'react';

export const MoveButton = ({ label, onMove }) => {
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
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {label}
    </button>
  );
};
