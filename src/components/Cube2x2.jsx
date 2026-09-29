import React from 'react';
import { CubeGame } from './CubeGame';
import { MoveButton } from './MoveButton';

export function Cube2x2({ onBack }) {
    const keyboardMapping = {
        'r': 'R', 'l': 'L', 'u': 'U', 'd': 'D', 'f': 'F', 'b': 'B',
        'R': "R'", 'L': "L'", 'U': "U'", 'D': "D'", 'F': "F'", 'B': "B'"
    };

    const shuffleMoves = ["R", "L", "U", "D", "F", "B", "R'", "L'", "U'", "D'", "F'", "B'"];

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
            </div>
            <div className="pos-left">
                <div className="btn-group">
                    <MoveButton label="L" onMove={(m) => handleMove(m, true)} />
                    <MoveButton label="L'" onMove={(m) => handleMove(m, true)} />
                </div>
            </div>
            <div className="pos-right">
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
                {/* No M button in 2x2 */}
                <div className="btn-group">
                    <MoveButton label="D" onMove={(m) => handleMove(m, true)} />
                    <MoveButton label="D'" onMove={(m) => handleMove(m, true)} />
                </div>
            </div>
        </>
    );

    return (
        <CubeGame
            size={2}
            onBack={onBack}
            keyboardMapping={keyboardMapping}
            shuffleMoves={shuffleMoves}
            controlsRenderer={renderControls}
        />
    );
}
