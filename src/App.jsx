import React, { useState } from 'react';
import { Cube3x3 } from './components/Cube3x3';
import { Cube2x2 } from './components/Cube2x2';
import { MiniCube } from './components/MiniCube';

import { MethodeSimple2x2 } from './components/algos/MethodeSimple2x2';
import { MethodeOrtega2x2 } from './components/algos/MethodeOrtega2x2';
import { MethodeSimple3x3 } from './components/algos/MethodeSimple3x3';
import { MethodeCFOP3x3 } from './components/algos/MethodeCFOP3x3';

import './App.css';

function App() {
  const [mode, setMode] = useState(null);

  if (mode === '3x3') return <Cube3x3 onBack={() => setMode(null)} />;
  if (mode === '2x2') return <Cube2x2 onBack={() => setMode(null)} />;
  
  if (mode === 'methode_simple_2x2') return <MethodeSimple2x2 onBack={() => setMode('algo_2x2')} />;
  if (mode === 'methode_ortega_2x2') return <MethodeOrtega2x2 onBack={() => setMode('algo_2x2')} />;
  if (mode === 'methode_simple_3x3') return <MethodeSimple3x3 onBack={() => setMode('algo_3x3')} />;
  if (mode === 'methode_cfop_3x3') return <MethodeCFOP3x3 onBack={() => setMode('algo_3x3')} />;

  if (mode === 'algo') {
    return (
      <div className="main-menu-container">
        <h1 className="main-menu-title">Algorithmes</h1>
        <div className="main-menu-buttons">
          <button className="menu-btn" onClick={() => setMode('algo_2x2')}>
            <MiniCube size={2} />
            <span> 2x2 </span>
          </button>
          <button className="menu-btn" onClick={() => setMode('algo_3x3')}>
            <MiniCube size={3} />
            <span> 3x3 </span>
          </button>
        </div>
        <button className="menu-btn" style={{ marginTop: '2rem' }} onClick={() => setMode(null)}>
          Retour
        </button>
      </div>
    );
  }

  if (mode === 'algo_2x2') {
    return (
      <div className="main-menu-container">
        <h1 className="main-menu-title">Méthodes 2x2</h1>
        <div className="main-menu-buttons">
          <button className="menu-btn" onClick={() => setMode('methode_simple_2x2')}>
            <span> Méthode Simple </span>
          </button>
          <button className="menu-btn" onClick={() => setMode('methode_ortega_2x2')}>
            <span> Méthode Ortega </span>
          </button>
        </div>
        <button className="menu-btn" style={{ marginTop: '2rem' }} onClick={() => setMode('algo')}>
          Retour
        </button>
      </div>
    );
  }

  if (mode === 'algo_3x3') {
    return (
      <div className="main-menu-container">
        <h1 className="main-menu-title">Méthodes 3x3</h1>
        <div className="main-menu-buttons">
          <button className="menu-btn" onClick={() => setMode('methode_simple_3x3')}>
            <span> Méthode Simple </span>
          </button>
          <button className="menu-btn" onClick={() => setMode('methode_cfop_3x3')}>
            <span> Méthode CFOP </span>
          </button>
        </div>
        <button className="menu-btn" style={{ marginTop: '2rem' }} onClick={() => setMode('algo')}>
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="main-menu-container">
      <h1 className="main-menu-title">Rubik's Cube</h1>
      <div className="main-menu-buttons">
        <button className="menu-btn" onClick={() => setMode('2x2')}>
          <MiniCube size={2} />
          <span> 2x2 </span>
        </button>
        <button className="menu-btn" onClick={() => setMode('3x3')}>
          <MiniCube size={3} />
          <span> 3x3 </span>
        </button>
        <button className="menu-btn" onClick={() => setMode('algo')}>
          <div className="mini-cube-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>
            <img src="public\rubik.png" alt="Rubik's Cube" style={{ width: '6rem', height: '6rem', marginRight: '0.5rem' }} />
          </div>
          <span> Algorithmes </span>
        </button>
      </div>
    </div>
  );
}

export default App;
