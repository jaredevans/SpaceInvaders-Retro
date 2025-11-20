
import React, { useState, useCallback, useEffect, useRef } from 'react';
import TerminalWindow from './components/TerminalWindow';
import GameCanvas from './components/GameCanvas';
import PythonConsole from './components/PythonConsole';
import Joystick from './components/Joystick';
import { GameStatus } from './types';

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [score, setScore] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [mothershipTrigger, setMothershipTrigger] = useState(0);
  
  // Shared ref for joystick input to avoid re-rendering the whole app on every move
  const mobileInputRef = useRef({ x: 0 });

  useEffect(() => {
      const checkMobile = () => {
          const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
          const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
          const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
          // Check width as well to handle desktop resizing or tablets
          setIsMobile((mobileRegex.test(userAgent) || isTouchDevice) && window.innerWidth < 1024);
      };
      
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLog = useCallback((msg: string) => {
    setLogs(prev => {
        const newLogs = [...prev, msg];
        if (newLogs.length > 20) return newLogs.slice(newLogs.length - 20);
        return newLogs;
    });
  }, []);

  const handleJoystickMove = (x: number) => {
      mobileInputRef.current.x = x;
  };

  const handleConsoleFocus = () => {
      if (gameStatus === GameStatus.PLAYING) {
          setGameStatus(GameStatus.PAUSED);
      }
  };

  const handleMothershipAttack = () => {
      setMothershipTrigger(Date.now());
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-0 md:p-4 font-mono relative overflow-hidden">
      {/* Background Effects - Outrun Style */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2b005c] via-[#0d0221] to-black z-0 fixed"></div>
      <div className="absolute inset-0 opacity-30 z-0 pointer-events-none fixed" style={{
          backgroundImage: `linear-gradient(rgba(255, 0, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.2) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          boxShadow: 'inset 0 0 150px rgba(0,0,0,0.9)'
      }}></div>

      <div className="z-10 w-full h-full flex flex-col items-center justify-center">
        {isMobile ? (
            /* Mobile Layout */
            <div className="w-full h-full flex flex-col">
                {/* Game Area - Maximize space */}
                <div className="flex-1 flex flex-col items-center justify-center p-2 relative">
                    <div className="w-full max-w-[600px] flex justify-between mb-2 px-4 text-pink-500 font-bold text-sm border-b border-pink-900/50 pb-1 drop-shadow-[0_0_15px_rgba(255,0,255,1)] text-glow-strong z-10 bg-black/50 backdrop-blur-sm rounded-t">
                        <span>SCORE: {score.toString().padStart(5, '0')}</span>
                        <span>{gameStatus.replace('_', ' ')}</span>
                    </div>
                    <GameCanvas 
                        status={gameStatus} 
                        setStatus={setGameStatus} 
                        score={score} 
                        setScore={setScore}
                        onLog={handleLog}
                        isMobile={true}
                        mobileInputRef={mobileInputRef}
                        attackTrigger={mothershipTrigger}
                    />
                </div>
                
                {/* Controls Area */}
                <div className="w-full pb-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                     <Joystick onMove={handleJoystickMove} />
                     <div className="text-center text-xs text-gray-500 pb-2">AUTO-FIRE ENABLED</div>
                </div>
            </div>
        ) : (
            /* Desktop Layout */
            <TerminalWindow title="pyspace_invaders.py">
                {/* Main Game Area */}
                <div className="flex-1 bg-[#0d0d0d] p-2 md:p-4 flex flex-col items-center justify-center relative overflow-y-auto md:overflow-hidden scrollbar-hide">
                    <div className="w-full max-w-[600px] flex justify-between mb-2 px-2 md:px-4 text-pink-500 font-bold text-lg border-b border-pink-900/50 pb-2 drop-shadow-[0_0_15px_rgba(255,0,255,1)] text-glow-strong">
                        <span>SCORE: {score.toString().padStart(5, '0')}</span>
                        <span>STATUS: {gameStatus.replace('_', ' ')}</span>
                    </div>
                    
                    <GameCanvas 
                        status={gameStatus} 
                        setStatus={setGameStatus} 
                        score={score} 
                        setScore={setScore}
                        onLog={handleLog}
                        attackTrigger={mothershipTrigger}
                    />
                    
                    <div className="mt-4 text-xs text-cyan-400 text-glow text-center" style={{ textShadow: '0 0 5px rgba(0,243,255,0.3)' }}>
                        <div>CONTROLS: [LEFT/RIGHT] Move • [SPACE] Fire • [ENTER] Start</div>
                        <div className="text-pink-400 mt-1 font-semibold">Tip: You can "chat" with the Mothership in the console... at your own risk.</div>
                    </div>
                </div>

                {/* Side Console */}
                <PythonConsole 
                    logs={logs} 
                    onFocus={handleConsoleFocus}
                    onTriggerAttack={handleMothershipAttack}
                />
            </TerminalWindow>
        )}
      </div>
    </div>
  );
};

export default App;
