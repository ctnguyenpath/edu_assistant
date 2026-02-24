import React, { useState, useEffect, useRef } from 'react';

// --- Icon Components (Inline SVGs) ---
// Using inline SVGs to keep this a single, dependency-free file.

/**
 * Sparkle icon for AI messages
 */
const SparkleIcon = ({ className = "w-6 h-6" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
    <path d="M5 2L6 5L9 6L6 7L5 10L4 7L1 6L4 5L5 2Z" />
    <path d="M19 14L18 17L15 18L18 19L19 22L20 19L23 18L20 17L19 14Z" />
  </svg>
);

/**
 * Send icon for the input
 */
const SendIcon = ({ className = "w-6 h-6" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

/**
 * Menu icon for the sidebar toggle
 */
const MenuIcon = ({ className = "w-6 h-6" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

/**
 * Plus icon for "New Chat"
 */
const PlusIcon = ({ className = "w-6 h-6" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/**
 * User icon for user messages
 */
const UserIcon = ({ className = "w-6 h-6" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);


// --- REMOVED Mock API Service ---


// --- Child Components ---

/**
 * Renders a single chat message
 * @param {{role: 'user' | 'assistant', children: React.ReactNode}} props
 */
const ChatMessage = ({ role, children }) => {
  const isUser = role === 'user';
  
  return (
    <div className={`flex items-start gap-4 p-4 max-w-4xl mx-auto ${isUser ? '' : 'bg-gray-50 rounded-lg'}`}>
      <div className={`flex-shrink-0 p-2 rounded-full ${isUser ? 'bg-gray-300' : 'bg-blue-100 text-blue-600'}`}>
        {isUser ? <UserIcon className="w-5 h-5" /> : <SparkleIcon className="w-5 h-5" />}
      </div>
      <div className="prose prose-lg max-w-none w-full pt-1.5">
        {/* We'll use a simple text render, but you could add markdown parsing here */}
        <p>{children}</p>
      </div>
    </div>
  );
};

/**
 * Renders the chat input bar
 * @param {{onSend: (text: string) => void, sending: boolean}} props
 */
const ChatInput = ({ onSend, sending }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedText = text.trim();
    if (trimmedText) {
      onSend(trimmedText);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-200">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center bg-gray-100 rounded-full shadow-sm p-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            rows="1"
            placeholder="Message..."
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-2 text-lg text-gray-800 placeholder-gray-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="p-3 rounded-full bg-blue-600 text-white disabled:bg-gray-300 disabled:opacity-50 transition-colors duration-200"
          >
            {/* Show a spinner if sending AND no text (i.e., waiting for response) */}
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <SendIcon className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-center text-gray-500 mt-2 px-4">
          Gemini may display inaccurate info, including about people, so double-check its responses.
        </p>
      </div>
    </form>
  );
};

/**
 * Renders the sidebar
 * @param {{
 * onNewChat: () => void,
 * chatHistory: Record<string, { title: string, messages: any[] }>,
 * onSelectChat: (id: string) => void,
 * currentChatId: string | null
 * }} props
 */
const Sidebar = ({ onNewChat, chatHistory, onSelectChat, currentChatId }) => {
  // Get an array of chats, sorted by the timestamp in their ID (most recent first)
  const sortedChats = Object.entries(chatHistory)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));

  return (
    <div className="w-64 bg-gray-100 p-4 flex-col hidden md:flex">
      <button
        onClick={onNewChat}
        className="flex items-center justify-center gap-2 bg-white text-gray-800 font-medium py-3 px-4 rounded-full shadow-sm hover:bg-gray-50 transition-all"
      >
        <PlusIcon className="w-5 h-5" />
        New Chat
      </button>
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-600 uppercase px-2">Recent</h2>
        {/* Render the list of chats from history */}
        <div className="mt-2">
          {sortedChats.length === 0 && (
            <p className="p-2 text-sm text-gray-500">No recent chats</p>
          )}
          {sortedChats.map(chat => (
            <a
              key={chat.id}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSelectChat(chat.id);
              }}
              className={`block p-2 rounded-lg text-gray-700 hover:bg-gray-200 truncate ${
                chat.id === currentChatId ? 'bg-gray-300' : ''
              }`}
            >
              {chat.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Main App Component (with your logic) ---

// Helper: Get item from localStorage
function getFromStorage(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.warn(`Error reading ${key} from localStorage`, error);
    return null;
  }
}

// Helper: Set item in localStorage
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error saving ${key} to localStorage`, error);
  }
}

const DEFAULT_GREETING = { role: "assistant", content: "Hi — I'm Otto Carmen. Ask me about products, promotions, or prices." };

export default function App() {
  const [messages, setMessages] = useState([DEFAULT_GREETING]);
  const [sending, setSending] = useState(false); // "waiting for a response"
  const [error, setError] = useState(null);
  
  // --- NEW State for session history ---
  const [chatId, setChatId] = useState(null); // The ID of the currently active chat
  const [chatHistory, setChatHistory] = useState({}); // Stores all chats: { id: { title, messages } }
  
  const messagesEndRef = useRef(null); // Ref for scrolling

  // --- NEW: Effect to load session(s) from localStorage on mount ---
  useEffect(() => {
    const savedHistory = getFromStorage('chatHistory');
    const savedCurrentId = getFromStorage('currentChatId');

    if (savedHistory) {
      setChatHistory(savedHistory);
    }

    if (savedCurrentId && savedHistory && savedHistory[savedCurrentId]) {
      // We have a saved ID and that chat exists, load it
      setChatId(savedCurrentId);
      setMessages(savedHistory[savedCurrentId].messages);
    } else {
      // No valid session, start a new one
      startNewChat();
    }
  }, []); // Empty array means this runs only once on mount

  // --- NEW: Effect to save session to localStorage on change ---
  useEffect(() => {
    if (!chatId || messages.length === 0) {
      // Don't save if there's no chat ID or messages
      return;
    }

    // Don't save the default greeting by itself
    if (messages.length === 1 && messages[0].content === DEFAULT_GREETING.content) {
      return;
    }

    // Get the title (defaults to first user message)
    const currentTitle = chatHistory[chatId]?.title || "New Chat";
    
    const updatedHistory = {
      ...chatHistory,
      [chatId]: {
        title: currentTitle,
        messages: messages
      }
    };

    setChatHistory(updatedHistory);
    saveToStorage('chatHistory', updatedHistory);
    saveToStorage('currentChatId', chatId);

  }, [messages, chatId]); // This runs every time messages or chatId changes


  // Effect for scrolling
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- REMOVED Polling useEffect ---

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }
  
  // --- UPDATED: startNewChat now creates a new session ID ---
  const startNewChat = () => {
    const newChatId = Date.now().toString(); // Simple unique ID
    setChatId(newChatId);
    setMessages([DEFAULT_GREETING]);
    setError(null);
    setSending(false);
    
    // Add the new chat to history immediately with a placeholder title
    setChatHistory(prev => ({
      ...prev,
      [newChatId]: { title: "New Chat", messages: [DEFAULT_GREETING] }
    }));
  };

  // --- NEW: Function to load a previous chat ---
  const selectChat = (id) => {
    if (chatHistory[id]) {
      setChatId(id);
      setMessages(chatHistory[id].messages);
      setError(null);
      setSending(false);
      saveToStorage('currentChatId', id); // Make this the new active chat
    }
  };


  // --- NEW: Function to call Gemini API ---
  const callGeminiAPI = async (chatHistory) => {
    const apiKey = "AIzaSyDdhm1_Ur2DN5kHS9D1N-f-XmWt9Mco9mA"; // Leave empty, will be handled by the environment
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

    // Format messages for the API
    // The "model" role is for assistant messages, "user" is for user messages
    const formattedMessages = chatHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    
    const payload = {
      contents: formattedMessages
      // You can add system instructions here if needed
      // systemInstruction: {
      //   parts: [{ text: "You are Otto Carmen, a purchase assistant." }]
      // },
    };

    let retries = 3;
    let delay = 1000;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          if (response.status === 429 || response.status >= 500) {
            // Throttling or server error, wait and retry
            throw new Error(`API Error: ${response.status}`);
          }
          const errorBody = await response.json();
          throw new Error(`API Error: ${errorBody?.error?.message || response.statusText}`);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
          return candidate.content.parts[0].text;
        } else {
          // Handle cases where the response structure is unexpected or content is missing
          if (candidate?.finishReason) {
             throw new Error(`Generation stopped: ${candidate.finishReason}`);
          }
          throw new Error("Invalid response structure from API.");
        }
      } catch (err) {
        if (i === retries - 1) {
          // Last retry failed
          throw err;
        }
        // Wait before retrying
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Exponential backoff
      }
    }
  };

  // --- Updated handleSend function ---
  async function handleSend(text) {
    setError(null);

    // 1. Add user message to state immediately
    const updatedMessages = [...messages, { role: "user", content: text }];
    setMessages(updatedMessages);
    setSending(true); // Show "typing..." indicator

    // --- NEW: Logic to set chat title from first message ---
    if (messages.length === 1) { // This is the first user message (after greeting)
      const newTitle = text.length > 40 ? text.substring(0, 40) + "..." : text;
      
      // Update the history with the new title
      const updatedHistory = {
        ...chatHistory,
        [chatId]: {
          title: newTitle,
          messages: updatedMessages // Save with the user message included
        }
      };
      setChatHistory(updatedHistory);
      saveToStorage('chatHistory', updatedHistory);
    }
    // --- End of new logic ---

    try {
      // 2. Call the real API
      const aiResponse = await callGeminiAPI(updatedMessages);
      
      // 3. Add the API response to state
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiResponse }
      ]);

    } catch (err) {
      console.error("API Call Error:", err);
      setError(err.message);
      // Add a final error message to the UI
      setMessages((prev) => [
          ...prev, 
          { role: "assistant", content: `⚠️  Error: ${err.message}` }
      ]);
    } finally {
      setSending(false); // Stop "typing..."
    }
  }
  // --- End of updated logic ---

  return (
    <div className="h-screen w-screen flex bg-white font-sans">
      {/* Sidebar: Pass new props for history and selection */}
      <Sidebar
        onNewChat={startNewChat}
        chatHistory={chatHistory}
        onSelectChat={selectChat}
        currentChatId={chatId}
      />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
             <button className="p-2 rounded-full hover:bg-gray-100 md:hidden">
                <MenuIcon className="w-6 h-6 text-gray-600" />
             </button>
             <h1 className="text-xl font-semibold text-gray-800">Gemini</h1>
          </div>
          <div className="p-2 rounded-full bg-gray-300">
            <UserIcon className="w-6 h-6 text-gray-600" />
          </div>
        </header>

        {/* Message List */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <ChatMessage key={i} role={m.role}>
              {m.content}
            </ChatMessage>
          ))}

          {/* This is the "typing" indicator */}
          {sending && (
            <div className="flex items-start gap-4 p-4 max-w-4xl mx-auto">
              <div className="flex-shrink-0 p-2 rounded-full bg-blue-100 text-blue-600">
                <SparkleIcon className="w-5 h-5" />
              </div>
              <div className="pt-3 flex space-x-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
          )}

          {/* Display any errors */}
          {error && (
            <div className="text-center text-sm text-red-600 px-4 py-2">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>
        
        {/* Input Area */}
        {/* Pass `sending` to disable the input while waiting for a response */}
        <ChatInput onSend={handleSend} sending={sending} />
      </div>
    </div>
  );
}