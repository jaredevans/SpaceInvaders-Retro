import React from 'react';

interface TerminalWindowProps {
  title: string;
  children: React.ReactNode;
}

const TerminalWindow: React.FC<TerminalWindowProps> = ({ title, children }) => {
  return (
    <div className="bg-[#1e1e1e] rounded-lg shadow-2xl overflow-hidden border border-gray-800 w-full max-w-5xl flex flex-col h-[80vh] md:h-[700px]">
      {/* Window Title Bar */}
      <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between select-none border-b border-black">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff3b30] shadow-inner"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:bg-[#ffcc00] shadow-inner"></div>
          <div className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#00d628] shadow-inner"></div>
        </div>
        <div className="text-gray-400 text-sm font-medium flex items-center gap-2">
            <span className="opacity-50">user@macbook:~/projects/games/</span>
            <span className="text-gray-200">{title}</span>
        </div>
        <div className="w-14"></div> {/* Spacer for centering */}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default TerminalWindow;