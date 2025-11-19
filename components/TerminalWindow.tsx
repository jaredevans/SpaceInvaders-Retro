import React from 'react';

interface TerminalWindowProps {
  title: string;
  children: React.ReactNode;
}

const TerminalWindow: React.FC<TerminalWindowProps> = ({ title, children }) => {
  return (
    <div className="relative bg-[#1e1e1e] rounded-lg shadow-[0_0_60px_rgba(0,243,255,0.3)] overflow-hidden border border-purple-500/50 w-full max-w-5xl flex flex-col h-[80vh] md:h-[700px]">
      
      {/* CRT Effect Overlay - Covers everything in the window */}
      <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden rounded-lg">
          <div className="scanlines absolute inset-0 opacity-20"></div>
          <div className="vignette absolute inset-0"></div>
          <div className="crt-flicker absolute inset-0"></div>
      </div>

      {/* Window Title Bar */}
      <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between select-none border-b border-black z-10 relative">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff3b30] shadow-[0_0_10px_rgba(255,95,86,0.8)]"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffcc00] shadow-[0_0_10px_rgba(255,189,46,0.8)]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#00d628] shadow-[0_0_10px_rgba(39,201,63,0.8)]"></div>
        </div>
        <div className="text-gray-400 text-sm font-medium flex items-center gap-2 text-glow">
            <span className="opacity-50">user@macbook:~/projects/games/</span>
            <span className="text-gray-200">{title}</span>
        </div>
        <div className="w-14"></div> {/* Spacer for centering */}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-0">
        {children}
      </div>
    </div>
  );
};

export default TerminalWindow;