import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { generateConsoleResponse } from '../services/geminiService';

interface PythonConsoleProps {
  logs: string[];
  onFocus?: () => void;
  onTriggerAttack?: () => void;
}

const PythonConsole: React.FC<PythonConsoleProps> = ({ logs, onFocus, onTriggerAttack }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, history, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = input.trim();
    if (!cleanInput || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: cleanInput };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        // Local Commands
        const lowerInput = cleanInput.toLowerCase();
        if (lowerInput === 'help') {
            setTimeout(() => {
                setHistory(prev => [...prev, { role: 'model', text: "Commands: help, status, clear. Or ask about game mechanics." }]);
                setIsLoading(false);
            }, 300);
            return;
        }
        if (lowerInput === 'status') {
             setTimeout(() => {
                setHistory(prev => [...prev, { role: 'model', text: "System: ONLINE. PySpace_Invaders.exe running. CPU: 12%." }]);
                setIsLoading(false);
            }, 300);
            return;
        }
        if (lowerInput === 'clear') {
            setHistory([]);
            setIsLoading(false);
            return;
        }

        // AI Response
        const { text, action } = await generateConsoleResponse(history, cleanInput);
        setHistory(prev => [...prev, { role: 'model', text: text }]);
        
        if (action === 'ATTACK' && onTriggerAttack) {
            onTriggerAttack();
        }

    } catch (err) {
        console.error(err);
        setHistory(prev => [...prev, { role: 'model', text: "Error: Terminal Input Failure." }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-[#051105] text-lime-400 font-mono text-xs md:text-sm p-2 border-l border-lime-900/50 w-full md:w-80"
      onClick={onFocus}
    >
      <div className="flex-1 overflow-y-auto space-y-1 mb-2 custom-scrollbar text-glow">
        <div className="text-lime-600 mb-4 opacity-80">
            Python 3.9.1 (Legacy_Green) <br/>
            [Matrix_OS 1.0.4] on tty1<br/>
            Type "help" to access mainframe.
        </div>
        
        {/* System Logs from Game */}
        {logs.map((log, idx) => {
            const isDanger = log.includes("MOTHERSHIP") || log.includes("WARNING");
            return (
                <div key={`log-${idx}`} className={`${isDanger ? 'text-red-500 font-bold text-glow-strong' : 'text-green-600'} opacity-90 font-light`}>
                    {`>> ${log}`}
                </div>
            );
        })}

        {/* Chat History */}
        {history.map((msg, idx) => (
          <div key={`chat-${idx}`} className={`${msg.role === 'user' ? 'text-white mt-2' : 'text-lime-300'} break-words`}>
            {msg.role === 'user' ? `>>> ${msg.text}` : msg.text}
          </div>
        ))}
        
        {isLoading && <div className="text-lime-500 animate-pulse mt-1">Processing...</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center border-t border-lime-800 pt-2">
        <span className="text-lime-500 mr-2 text-glow-strong">{">>>"}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={onFocus}
          className="flex-1 bg-transparent outline-none text-lime-100 placeholder-lime-700/50 focus:placeholder-transparent text-glow caret-lime-500"
          placeholder="ask anything about game"
          disabled={isLoading}
        />
      </form>
    </div>
  );
};

export default PythonConsole;
