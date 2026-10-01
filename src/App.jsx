import React, { useState } from 'react';
import { Cube3x3 } from './components/Cube3x3';
import { Cube2x2 } from './components/Cube2x2';

function App() {
  const [mode, setMode] = useState(null); // '2x2' or '3x3'

  if (mode === '3x3') {
    return <Cube3x3 onBack={() => setMode(null)} />;
  }

  if (mode === '2x2') {
    return <Cube2x2 onBack={() => setMode(null)} />;
  }

  // Render the initial mode selection screen
  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#2c3e50', color: 'white' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '3rem' }}>Rubik's Cube</h1>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <button 
          className="move-btn" 
          style={{ padding: '1.5rem 3rem', fontSize: '1.5rem', cursor: 'pointer' }}
          onClick={() => setMode('2x2')}
        >
          2x2
        </button>
        <button 
          className="move-btn" 
          style={{ padding: '1.5rem 3rem', fontSize: '1.5rem', cursor: 'pointer' }}
          onClick={() => setMode('3x3')}
        >
          3x3
        </button>
      </div>
    </div>
  );
}

export default App;
