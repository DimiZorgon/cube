import React from 'react';

export function MethodeOrtega2x2({ onBack }) {
  return (
    <div className="main-menu-container">
      <h1 className="main-menu-title">Méthode Ortega 2x2</h1>
      <div style={{ flex: 1, padding: '2rem', textAlign: 'center' }}>
        <p>Ajoutez vos algorithmes ici...</p>
      </div>
      <button className="menu-btn" style={{ marginTop: 'auto', marginBottom: '2rem' }} onClick={onBack}>
        Retour
      </button>
    </div>
  );
}
