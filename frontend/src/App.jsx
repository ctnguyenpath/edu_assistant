import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// --- CONFIGURATION ---
import { API_BASE_URL, MINIO_BASE_URL, BUCKET_NAME, AGENT_ID, PARLANT_URL } from './config';

// --- API (PARLANT) ---
import { chatService } from "./api"; 

// --- CONTEXT ---
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext'; // <-- NEW: Import the Theme Provider

// --- LAYOUTS ---
import MainLayout from './layouts/MainLayout';

// --- PAGES ---
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import VideoPlayer from './pages/VideoPlayer';

// --- COURSE PAGES ---
import IntroductionPage from './pages/datacourse/IntroductionPage';
import PathWay from './pages/datacourse/PathWay'; // Now serving "Ways of Working with Data"

// --- COMPONENTS ---
import ChatInterface from './components/ChatInterface';

// --- PROTECTED ROUTE WRAPPER ---
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// --- HELPER: Find Agent ID Dynamically ---
// This prevents errors when Docker restarts and generates a new Agent ID
async function getDynamicAgentId() {
  try {
    const response = await fetch(`${PARLANT_URL}/agents`);
    if (!response.ok) throw new Error("Failed to connect to Parlant");
    
    const agents = await response.json();
    // Look for the agent named "Otto Carmen" (defined in your Python script)
    const targetAgent = agents.find(a => a.name === "Otto Carmen");
    
    return targetAgent ? targetAgent.id : null;
  } catch (error) {
    console.error("Error fetching dynamic agent ID:", error);
    return null;
  }
}

const App = () => {
  const navigate = useNavigate();

  // --- GLOBAL STATE ---
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  
  // --- CHAT STATE (PARLANT INTEGRATION) ---
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false); // Typing indicator
  const [sessionId, setSessionId] = useState(null); // Dynamic Session ID
  
  // Ref to control the polling loop safely
  const isPollingActive = useRef(false);

  // --- SHARED ACTIONS ---

  // 1. Fetch Videos 
  const fetchVideos = async () => {
    setLoadingVideos(true);
    try {
      const response = await fetch(`${MINIO_BASE_URL}/${BUCKET_NAME}`);
      if (!response.ok) throw new Error("Failed to access bucket");

      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "text/xml");
      const contents = xml.getElementsByTagName("Contents");
      const parsedVideos = [];

      for (let i = 0; i < contents.length; i++) {
        const key = contents[i].getElementsByTagName("Key")[0]?.textContent;
        const sizeBytes = contents[i].getElementsByTagName("Size")[0]?.textContent;
        if (key && (key.endsWith('.mp4') || key.endsWith('.webm') || key.endsWith('.mov'))) {
           const sizeMB = (parseInt(sizeBytes) / (1024 * 1024)).toFixed(1) + " MB";
           parsedVideos.push({ title: key, filename: key, size: sizeMB });
        }
      }
      setVideos(parsedVideos);
    } catch (err) {
      console.error("Error fetching videos:", err);
    } finally {
      setLoadingVideos(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // 2. Poll for Agent Messages (Parlant Logic)
  useEffect(() => {
    if (!sessionId) {
      isPollingActive.current = false;
      return;
    }

    isPollingActive.current = true;

    async function pollForAgentMessages() {
      console.log("Polling started for session:", sessionId);
      
      while (isPollingActive.current) {
        try {
          // Long-poll: waits up to 30s for new events
          const agentEvents = await chatService.pollForEvents(); 
          
          if (agentEvents.length > 0) {
            setSending(false); // Stop typing indicator
            
            const newAgentMessages = agentEvents.map(e => ({
              role: "bot", 
              content: e.data.message
            }));
            
            setMessages(prev => [...prev, ...newAgentMessages]);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }
    }

    pollForAgentMessages();

    return () => {
      isPollingActive.current = false;
    };
  }, [sessionId]);

  // 3. Handle Chat Sending 
  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userText = input;
    setInput(''); // Clear input immediately
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setSending(true); // Start typing indicator

    try {
      let currentSessionId = sessionId;

      // Initialize session if it doesn't exist
      if (!currentSessionId) {
        
        // 1. Try to use the ID from config file
        let activeAgentId = AGENT_ID;

        // 2. If config ID is missing or default, try to find it dynamically
        if (!activeAgentId || activeAgentId === "default_agent") {
           console.log("Fetching Agent ID dynamically for 'Otto Carmen'...");
           const dynamicId = await getDynamicAgentId();
           
           if (dynamicId) {
             activeAgentId = dynamicId;
             console.log("Found Dynamic Agent ID:", activeAgentId);
           } else {
             throw new Error("Could not find agent 'Otto Carmen'. Is the backend running?");
           }
        }

        // Create session via Parlant API
        const newSessionId = await chatService.createSession(activeAgentId);
        setSessionId(newSessionId);
      }

      // Send message (fire-and-forget, polling handles the reply)
      await chatService.sendMessage(userText);

    } catch (error) {
      console.error("Send error:", error);
      setMessages(prev => [...prev, { role: 'bot', content: "Error: " + error.message, isError: true }]);
      setSending(false);
    }
  };

  // Bundle chat props
  const chatProps = { 
    messages, 
    input, 
    setInput, 
    handleSend, 
    loading: sending 
  };

  // --- RENDER ---
  return (
    <ThemeProvider> {/* <-- NEW: Global Theme Wrapper */}
      <AuthProvider>
        <Routes>
          {/* 1. Login Page */}
          <Route path="/login" element={<LoginPage />} />

          {/* 2. Main App Layout */}
          <Route element={<MainLayout />}>
            
            {/* PUBLIC PAGES */}
            <Route path="/" element={
              <HomePage 
                videos={videos} 
                onPlayVideo={(clip) => navigate(`/watch/${clip.filename}`)} 
              />
            } />
            
            <Route path="/discover" element={
              <DiscoverPage 
                chatProps={chatProps} 
                videos={videos} 
                refreshVideos={fetchVideos} 
                loadingVideos={loadingVideos} 
              />
            } />

            {/* COURSE PAGES */}
            <Route path="/discover/introduction" element={<IntroductionPage chatProps={chatProps} />} />
            
            {/* UPDATED THIS ROUTE: Changed path from /discover/sql to /discover/pathway */}
            <Route path="/discover/pathway" element={<PathWay chatProps={chatProps} />} />

            {/* PROTECTED PAGES */}
            <Route path="/chat" element={
              <ProtectedRoute>
                <ChatInterface {...chatProps} />
              </ProtectedRoute>
            } />
            
            <Route path="/library" element={
              <ProtectedRoute>
                <div className="p-10 text-gray-400">Your Personal Library (Coming Soon)</div>
              </ProtectedRoute>
            } />

          </Route>

          {/* 3. Video Player */}
          <Route path="/watch/:filename" element={<VideoPlayer />} />

        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;