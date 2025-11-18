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
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300 font-mono text-xs md:text-sm p-2 border-l border-gray-700 w-full md:w-80">
      <div className="flex-1 overflow-y-auto space-y-1 mb-2 custom-scrollbar">
        <div className="text-gray-500 mb-4">
            Python 3.9.1 (default, Dec 11 2023, 12:00:00)<br/>
            [Clang 12.0.0 (clang-1200.0.32.29)] on darwin<br/>
            Type "help", "copyright", "credits" or "license" for more information.
        </div>
        
        {/* System Logs from Game */}
        {logs.map((log, idx) => (
            <div key={`log-${idx}`} className="text-yellow-600 opacity-80 font-light">
                {`>> ${log}`}
            </div>
        ))}

        {/* Chat History */}
        {history.map((msg, idx) => (
          <div key={idx} className={`${msg.role === 'user' ? 'text-white' : 'text-green-400'}`}>
            {msg.role === 'user' ? `>>> ${msg.text}` : msg.text}
          </div>
        ))}
        
        {isLoading && <div className="text-green-400 animate-pulse">...</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center border-t border-gray-700 pt-2">
        <span className="text-green-500 mr-2">{">>>"}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent outline-none text-white placeholder-gray-600"
          placeholder="Enter python command..."
          autoFocus
        />
      </form>
    </div>
  );
};

export default PythonConsole;