
import React, { useEffect, useRef, useState } from 'react';

interface JoystickProps {
  onMove: (x: number) => void;
}

const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0 });
  const touchId = useRef<number | null>(null);

  const handleStart = (clientX: number) => {
    setActive(true);
    updatePosition(clientX);
  };

  const handleMove = (clientX: number) => {
    if (!active) return;
    updatePosition(clientX);
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0 });
    onMove(0);
    touchId.current = null;
  };

  const updatePosition = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const maxDist = rect.width / 2 - 40; // Radius padding

    let deltaX = clientX - centerX;
    
    // Clamp
    if (deltaX < -maxDist) deltaX = -maxDist;
    if (deltaX > maxDist) deltaX = maxDist;

    setPosition({ x: deltaX });
    onMove(deltaX / maxDist);
  };

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    // e.preventDefault(); // Allow some browser behavior if needed, but usually prevent for games
    const touch = e.changedTouches[0];
    touchId.current = touch.identifier;
    handleStart(touch.clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
      // e.preventDefault();
      if (touchId.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId.current) {
              handleMove(e.changedTouches[i].clientX);
              break;
          }
      }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
      // e.preventDefault();
       if (touchId.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId.current) {
              handleEnd();
              break;
          }
      }
  };
  
  // Mouse handlers for debugging on desktop
  const onMouseDown = (e: React.MouseEvent) => {
      handleStart(e.clientX);
  };
  
  useEffect(() => {
      const onMouseMove = (e: MouseEvent) => {
          if (active) handleMove(e.clientX);
      };
      const onMouseUp = () => {
          if (active) handleEnd();
      };
      
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      return () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
      }
  }, [active]);

  return (
    <div 
        className="w-full h-32 md:h-48 flex items-center justify-center select-none touch-none pb-8"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
    >
        <div 
            ref={containerRef}
            className="w-[80%] max-w-xs h-14 md:h-16 bg-gray-900/80 rounded-full border border-cyan-500/30 relative backdrop-blur-md shadow-[0_0_15px_rgba(0,243,255,0.1)] overflow-visible cursor-pointer"
            onMouseDown={onMouseDown}
        >
            {/* Track Line */}
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-cyan-500/20 -translate-y-1/2"></div>
            
            {/* Center Marker */}
            <div className="absolute top-1/2 left-1/2 w-0.5 h-4 bg-cyan-500/50 -translate-y-1/2 -translate-x-1/2"></div>

            {/* Knob */}
            <div 
                className={`absolute top-1/2 left-1/2 w-20 h-20 md:w-24 md:h-24 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-full shadow-[0_0_25px_rgba(0,243,255,0.5)] border-4 border-white transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out flex items-center justify-center z-10 ${active ? 'scale-110 brightness-110' : ''}`}
                style={{ transform: `translate(calc(-50% + ${position.x}px), -50%)` }}
            >
                <div className="w-12 h-12 md:w-14 md:h-14 border-2 border-black/10 rounded-full bg-white/10 backdrop-blur-sm"></div>
            </div>
            
            {/* Label */}
            <div className="absolute -bottom-10 w-full text-center text-cyan-500/80 text-xs font-mono font-bold tracking-widest">
                SLIDE TO MOVE
            </div>
        </div>
    </div>
  );
};

export default Joystick;
