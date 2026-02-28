import React, { useEffect, useRef, useState } from "react";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
// --- CHANGE 1: Import the chatService object, not a single function ---
import { chatService } from "./api"; 

export default function App() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi — I'm Otto Carmen. Ask me about products, promotions, or prices." }
  ]);
  const [sending, setSending] =useState(false); // Will now mean "waiting for a response"
  const [error, setError] = useState(null);
  
  // --- CHANGE 2: Session state and polling control ---
  const [sessionId, setSessionId] = useState(null);
  // We use a ref to safely control the polling loop from inside useEffect
  const isPollingActive = useRef(false);
  
  const scrollRef = useRef(null);

  // Effect for scrolling
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- CHANGE 3: New effect to handle event polling ---
  useEffect(() => {
    // This effect starts/stops the polling loop based on the session
    if (!sessionId) {
      isPollingActive.current = false; // Stop polling if session is null
      return;
    }

    isPollingActive.current = true; // Signal loop to start

    // This is the main polling loop that listens for agent messages
    async function pollForAgentMessages() {
      console.log("Polling started for session:", sessionId);
      
      while (isPollingActive.current) {
        try {
          // This call waits up to 30 seconds for new events
          const agentEvents = await chatService.pollForEvents(); // This is the long-poll
          
          if (agentEvents.length > 0) {
            // We got one or more messages from the agent
            setSending(false); // Stop the "typing..." indicator
            
            const newAgentMessages = agentEvents.map(e => ({
              role: "assistant",
              content: e.data.message
            }));
            
            // Add all new messages to the chat
            setMessages(prev => [...prev, ...newAgentMessages]);
          }
          // If no events, the loop just runs again and polls
          
        } catch (err) {
          console.error("Polling error:", err);
          setError("Connection error. Please refresh.");
          isPollingActive.current = false; // Stop loop on error
        }
      }
      console.log("Polling stopped.");
    }

    pollForAgentMessages(); // Start the loop

    // Cleanup function:
    // This runs when the component unmounts or sessionId changes
    return () => {
      isPollingActive.current = false;
    };
  }, [sessionId]); // Dependency: This entire effect re-runs if `sessionId` changes

  function scrollToBottom() {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }

  // --- CHANGE 4: handleSend is now much simpler ---
  async function handleSend(text) {
    setError(null);
    setSending(true); // Show "typing..." indicator

    // 1. Add user message to the UI immediately
    setMessages((m) => [...m, { role: "user", content: text }]);

    try {
      let currentSessionId = sessionId;

      // 2. If this is the first message, create the session
      if (!currentSessionId) {
        // --- !!! IMPORTANT !!! ---
        // You MUST replace "your-agent-id" with your actual agent ID
        // New dynamic code
        const agentId = import.meta.env.VITE_AGENT_ID;

        if (!agentId) {
          setError("Configuration error: VITE_AGENT_ID is not set.");
          setSending(false);
          return; // Stop if the ID is missing
        }

        const newSessionId = await chatService.createSession(agentId);
        setSessionId(newSessionId); // This triggers the polling useEffect to start
      }

      // 3. Send the message (fire-and-forget)
      // We don't wait for a response here.
      // The polling loop will get the response.
      await chatService.sendMessage(text);

    } catch (err) {
      setError(err.message);
      // Add a final error message to the UI
      setMessages((m) => [...m, { role: "assistant", content: `⚠️  Error: ${err.message}` }]);
      setSending(false); // Stop the "typing" indicator
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-[#131314] transition-colors duration-300">
      <header className="bg-blue-600 dark:bg-[#1E1F20] text-white dark:text-gray-100 px-6 py-4 flex items-center justify-between shadow border-b border-transparent dark:border-[#333] transition-colors duration-300">
        {/* ... (your header is fine) ... */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 dark:bg-[#333] flex items-center justify-center font-bold">OC</div>
          <div>
            <div className="text-lg font-semibold">Otto Carmen</div>
            <div className="text-sm opacity-80 dark:text-gray-400">Purchase assistant — powered by Parlant</div>
          </div>
        </div>
      </header>

      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-[#0c0c0d] transition-colors duration-300">
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role}>
            {m.content}
          </ChatMessage>
        ))}

        {/* --- CHANGE 5: Show a "typing" indicator --- */}
        {/* This replaces your old "..." placeholder logic */}
        {sending && (
          <ChatMessage role="assistant">
            ...
          </ChatMessage>
        )}

        {error && (
          <div className="text-center text-sm text-red-600 dark:text-red-400 px-4 py-2">
            {error}
          </div>
        )}
      </main>

      {/* This component is fine as-is */}
      <div className="dark:bg-[#1E1F20] dark:border-t dark:border-[#333] transition-colors duration-300">
        <ChatInput onSend={handleSend} sending={sending} />
      </div>
    </div>
  );
}