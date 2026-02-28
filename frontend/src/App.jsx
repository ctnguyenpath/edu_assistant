import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

// --- CONFIGURATION ---
import { API_BASE_URL, MINIO_BASE_URL, BUCKET_NAME, AGENT_ID, PARLANT_URL } from './config';

// --- API (PARLANT) ---
import { chatService } from "./api"; 

// --- CONTEXT ---
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext'; 

// --- LAYOUTS ---
import MainLayout from './layouts/MainLayout';

// --- PAGES ---
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import VideoPlayer from './pages/VideoPlayer';

// --- UPDATED PAGE IMPORTS ---
import PathWay from './pages/discover/PathWay'; 
import ModuleLayout from './pages/program/module_viewer/ModuleLayout';
import ProgramDashboard from './pages/program/ProgramDashboard'; 

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
async function getDynamicAgentId() {
  try {
    const response = await fetch(`${PARLANT_URL}/agents`);
    if (!response.ok) throw new Error("Failed to connect to Parlant");
    
    const agents = await response.json();
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
  const [sending, setSending] = useState(false); 
  const [sessionId, setSessionId] = useState(null); 
  
  const isPollingActive = useRef(false);

  // --- ACTIONS ---
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

  useEffect(() => {
    if (!sessionId) {
      isPollingActive.current = false;
      return;
    }

    isPollingActive.current = true;

    async function pollForAgentMessages() {
      while (isPollingActive.current) {
        try {
          const agentEvents = await chatService.pollForEvents(); 
          if (agentEvents.length > 0) {
            setSending(false); 
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
    return () => { isPollingActive.current = false; };
  }, [sessionId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userText = input;
    setInput(''); 
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setSending(true); 

    try {
      let currentSessionId = sessionId;

      if (!currentSessionId) {
        let activeAgentId = AGENT_ID;

        if (!activeAgentId || activeAgentId === "default_agent") {
           const dynamicId = await getDynamicAgentId();
           if (dynamicId) {
             activeAgentId = dynamicId;
           } else {
             throw new Error("Could not find agent 'Otto Carmen'.");
           }
        }
        const newSessionId = await chatService.createSession(activeAgentId);
        setSessionId(newSessionId);
      }
      await chatService.sendMessage(userText);
    } catch (error) {
      console.error("Send error:", error);
      setMessages(prev => [...prev, { role: 'bot', content: "Error: " + error.message, isError: true }]);
      setSending(false);
    }
  };

  const chatProps = { messages, input, setInput, handleSend, loading: sending };

  return (
    <ThemeProvider> 
      <AuthProvider>
        <Routes>
          {/* 1. Login Page */}
          <Route path="/login" element={<LoginPage />} />

          {/* 2. Main App Layout (Has standard Sidebar) */}
          <Route element={<MainLayout />}>
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

            <Route path="/discover/pathway" element={<PathWay chatProps={chatProps} />} />

            {/* --- PROGRAM DASHBOARD --- */}
            <Route path="/program/dashboard" element={
              <ProtectedRoute>
                <ProgramDashboard />
              </ProtectedRoute>
            } />

            {/* PROTECTED PAGES */}
            <Route path="/chat" element={
              <ProtectedRoute>
                <ChatInterface {...chatProps} />
              </ProtectedRoute>
            } />
            
            <Route path="/library" element={
              <ProtectedRoute>
                <div className="p-10 text-gray-400 font-medium">Your Personal Library (Coming Soon)</div>
              </ProtectedRoute>
            } />

          </Route>

          {/* 3. Full-Screen Pages (No standard Sidebar) */}
          <Route path="/watch/:filename" element={<VideoPlayer />} />

          {/* --- MODULE VIEWER --- */}
          {/* Placed outside MainLayout so the video player and syllabus sidebar take up the full screen */}
          <Route path="/program/module/:moduleId" element={
            <ProtectedRoute>
              <ModuleLayout />
            </ProtectedRoute>
          } />

        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;