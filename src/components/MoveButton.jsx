import React, { useRef } from 'react';

export const MoveButton = ({ label, onMove }) => {
  const timerRef = useRef(null);

  // Handle pointer down event to start a timer for long press detection
  const handlePointerDown = () => {
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onMove(label.toLowerCase());
    }, 500);
  };

  // Handle pointer up event to clear the timer and trigger the move if it was a short press
  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onMove(label);
    }
  };

  // Render the button with event handlers for pointer down and up
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
