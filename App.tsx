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
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-mono bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 to-black text-white">
      <TerminalWindow title="pyspace_invaders.py">
        {/* Main Game Area */}
        <div className="flex-1 bg-[#0d0d0d] p-4 flex flex-col items-center justify-center relative">
            <div className="w-full flex justify-between mb-2 px-4 text-green-500 font-bold text-lg border-b border-gray-800 pb-2">
                <span>SCORE: {score.toString().padStart(5, '0')}</span>
                <span>STATUS: {gameStatus}</span>
            </div>
            
            <GameCanvas 
                status={gameStatus} 
                setStatus={setGameStatus} 
                score={score} 
                setScore={setScore}
                onLog={handleLog}
            />
            
            <div className="mt-4 text-xs text-gray-500">
                CONTROLS: [LEFT/RIGHT] Move • [SPACE] Fire • [ENTER] Start
            </div>
        </div>

        {/* Side Console */}
        <PythonConsole logs={logs} />
      </TerminalWindow>
    </div>
  );
};

export default App;