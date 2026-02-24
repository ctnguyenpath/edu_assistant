import React, { useEffect, useRef } from 'react';
import { Sparkles, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ChatInterface = ({ messages, input, setInput, handleSend, loading, compact = false }) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-[#131314] relative border-t border-[#333]">
      {!compact && (
        <div className="p-4 flex justify-between items-center bg-[#131314]/80 backdrop-blur-sm sticky top-0 z-10 border-b border-[#333]">
          <div className="flex items-center gap-2 text-gray-200">
            <span className="text-xl font-medium">Gemini Chat</span>
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center opacity-50">
            <Sparkles className="w-8 h-8 text-blue-400 mb-2" />
            <p className="text-gray-400">Ask a question about the video...</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center mt-1">
                    <Sparkles size={12}/>
                  </div>
                )}
                <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm leading-6 ${
                  msg.role === 'user' ? 'bg-[#282A2C] text-white' : 'text-gray-200'
                }`}>
                   {msg.role === 'bot' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="p-3 bg-[#131314] border-t border-[#333]">
        <div className="max-w-3xl mx-auto bg-[#1E1F20] rounded-full flex items-center p-1 pl-4 gap-2">
          <input 
            className="flex-1 bg-transparent border-none outline-none text-white py-2 text-sm"
            placeholder={loading ? "Thinking..." : "Ask Gemini..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
            }}
            disabled={loading}
          />
          <button 
            onClick={handleSend} 
            disabled={loading}
            className={`p-2 rounded-full text-white transition-all ${loading ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-500'}`}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;