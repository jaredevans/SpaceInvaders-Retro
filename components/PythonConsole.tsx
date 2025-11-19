import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { generateConsoleResponse } from '../services/geminiService';

interface PythonConsoleProps {
  logs: string[];
}

const PythonConsole: React.FC<PythonConsoleProps> = ({ logs }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Check for hardcoded local commands first
    if (input.trim().toLowerCase() === 'help') {
      setTimeout(() => {
        setHistory(prev => [...prev, { role: 'model', text: "Available commands: help, status, exit. Or ask me about the game code." }]);
        setIsLoading(false);
      }, 500);
      return;
    }

    const responseText = await generateConsoleResponse(history, input);
    
    setHistory(prev => [...prev, { role: 'model', text: responseText }]);
    setIsLoading(false);
  };

  return (
    <div 
      className="flex flex-col h-full bg-[#051105] text-lime-400 font-mono text-xs md:text-sm p-2 border-l border-lime-900/50 w-full md:w-80"
    >
      <div className="flex-1 overflow-y-auto space-y-1 mb-2 custom-scrollbar text-glow">
        <div className="text-lime-600 mb-4 opacity-80">
            Python 3.9.1 (Legacy_Green) <br/>
            [Matrix_OS 1.0.4] on tty1<br/>
            Type "help" to access mainframe.
        </div>
        
        {/* System Logs from Game */}
        {logs.map((log, idx) => {
            const isDanger = log.includes("MOTHERSHIP DOWN");
            return (
                <div key={`log-${idx}`} className={`${isDanger ? 'text-red-500 font-bold text-glow-strong' : 'text-green-600'} opacity-90 font-light`}>
                    {`>> ${log}`}
                </div>
            );
        })}

        {/* Chat History */}
        {history.map((msg, idx) => (
          <div key={idx} className={`${msg.role === 'user' ? 'text-white' : 'text-lime-300'}`}>
            {msg.role === 'user' ? `>>> ${msg.text}` : msg.text}
          </div>
        ))}
        
        {isLoading && <div className="text-lime-500 animate-pulse">...</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center border-t border-lime-800 pt-2">
        <span className="text-lime-500 mr-2 text-glow-strong">{">>>"}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent outline-none text-lime-100 placeholder-lime-800 text-glow caret-lime-500"
          placeholder=""
          autoFocus
        />
      </form>
    </div>
  );
};

export default PythonConsole;