import React, { useState, useCallback } from 'react';
import TerminalWindow from './components/TerminalWindow';
import GameCanvas from './components/GameCanvas';
import PythonConsole from './components/PythonConsole';
import { GameStatus } from './types';

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [score, setScore] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const handleLog = useCallback((msg: string) => {
    setLogs(prev => {
        const newLogs = [...prev, msg];
        if (newLogs.length > 20) return newLogs.slice(newLogs.length - 20);
        return newLogs;
    });
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono relative overflow-hidden">
      {/* Background Effects - Outrun Style */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2b005c] via-[#0d0221] to-black z-0"></div>
      <div className="absolute inset-0 opacity-30 z-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(rgba(255, 0, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          boxShadow: 'inset 0 0 150px rgba(0,0,0,0.9)'
      }}></div>

      <div className="z-10 w-full flex justify-center">
        <TerminalWindow title="pyspace_invaders.py">
            {/* Main Game Area */}
            <div className="flex-1 bg-[#0d0d0d] p-4 flex flex-col items-center justify-center relative">
                <div className="w-full flex justify-between mb-2 px-4 text-pink-500 font-bold text-lg border-b border-pink-900/50 pb-2 drop-shadow-[0_0_15px_rgba(255,0,255,1)] text-glow-strong">
                    <span>SCORE: {score.toString().padStart(5, '0')}</span>
                    <span>STATUS: {gameStatus.replace('_', ' ')}</span>
                </div>
                
                <GameCanvas 
                    status={gameStatus} 
                    setStatus={setGameStatus} 
                    score={score} 
                    setScore={setScore}
                    onLog={handleLog}
                />
                
                <div className="mt-4 text-xs text-cyan-400 text-glow text-center" style={{ textShadow: '0 0 5px rgba(0,243,255,0.3)' }}>
                    <div>CONTROLS: [LEFT/RIGHT] Move • [SPACE] Fire • [ENTER] Start</div>
                    <div className="text-pink-400 mt-1 font-semibold">Tip: Choose wisely when you hit the mothership</div>
                </div>
            </div>

            {/* Side Console */}
            <PythonConsole logs={logs} />
        </TerminalWindow>
      </div>
    </div>
  );
};

export default App;