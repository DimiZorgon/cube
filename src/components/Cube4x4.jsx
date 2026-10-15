// src/components/Cube4x4.jsx
import React from 'react';
import { CubeGame } from './CubeGame';
import { MoveButton } from './MoveButton';

export function Cube4x4({ onBack, trainingCase = null }) {
    const keyboardMapping = {
        'r': 'R', 'l': 'L', 'u': 'U', 'd': 'D', 'f': 'F', 'b': 'B',
        'R': "R'", 'L': "L'", 'U': "U'", 'D': "D'", 'F': "F'", 'B': "B'",
        'x': 'x', 'X': "x'", 'y': 'y', 'Y': "y'", 'z': 'z', 'Z': "z'"
    };

    const shuffleMoves = [
        "R", "L", "U", "D", "F", "B",
        "R'", "L'", "U'", "D'", "F'", "B'",
        "Rw", "Lw", "Uw", "Fw",
        "Rw'", "Lw'", "Uw'", "Fw'"
    ];

    const renderControls = (handleMove) => (
        <>
            <div className="pos-top">
                <div className="btn-group">
                    <MoveButton label="B" onMove={(m) => handleMove(m, true)} />
                    <MoveButton label="B'" onMove={(m) => handleMove(m, true)} />
                </div>
                <div className="btn-group">
                    <MoveButton label="U" onMove={(m) => handleMove(m, true)} />
                    <MoveButton label="U'" onMove={(m) => handleMove(m, true)} />
                </div>
                <div className="btn-group">
                    <MoveButton label="Uw" onMove={(m) => handleMove(m, true)} />
                    <MoveButton label="Uw'" onMove={(m) => handleMove(m, true)} />
                </div>
            </div>
            <div className="pos-left" style={{ display: 'flex', gap: '0.6rem' }}>
                <div className="btn-group">
                    <MoveButton label="L" onMove={(m) => handleMove(m, true)} />
                    <MoveButton label="L'" onMove={(m) => handleMove(m, true)} />
                </div>
                <div className="btn-group">
                    <MoveButton label="Lw" onMove={(m) => handleMove(m, true)} />
                    <MoveButton label="Lw'" onMove={(m) => handleMove(m, true)} />
                </div>
            </div>
            <div className="pos-right" style={{ display: 'flex', gap: '0.6rem' }}>
                <div className="btn-group">
                    <MoveButton label="Rw" onMove={(m) => handleMove(m, true)} />
                    <MoveButton label="Rw'" onMove={(m) => handleMove(m, true)} />
                </div>
                <div className="btn-group">
                    <MoveButton label="R" onMove={(m) => handleMove(m, true)} />
                    <MoveButton label="R'" onMove={(m) => handleMove(m, true)} />
                </div>
            </div>
            <div className="pos-bottom">
                <div className="btn-group">
                    <MoveButton label="F" onMove={(m) => handleMove(m, true)} />
                    <MoveButton label="F'" onMove={(m) => handleMove(m, true)} />
                </div>
                <div className="btn-group">
                    <MoveButton label="Fw" onMove={(m) => handleMove(m, true)} />
                    <MoveButton label="Fw'" onMove={(m) => handleMove(m, true)} />
                </div>
                <div className="btn-group">
                    <MoveButton label="D" onMove={(m) => handleMove(m, true)} />
                    <MoveButton label="D'" onMove={(m) => handleMove(m, true)} />
                </div>
                <div className="btn-group">
                    <MoveButton label="Dw" onMove={(m) => handleMove(m, true)} />
                    <MoveButton label="Dw'" onMove={(m) => handleMove(m, true)} />
                </div>
            </div>
        </>
    );

    return (
        <CubeGame
            size={4}
            onBack={onBack}
            keyboardMapping={keyboardMapping}
            shuffleMoves={shuffleMoves}
            controlsRenderer={renderControls}
            trainingCase={trainingCase}
        />
    );
}