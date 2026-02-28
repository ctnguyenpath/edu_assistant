import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlayCircle, FileText, MessageSquare, ChevronLeft, Send, Paperclip } from 'lucide-react';

const ModuleLayout = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [moduleData, setModuleData] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState('');

  useEffect(() => {
    const fetchModuleContent = async () => {
      setLoading(true);
      try {
        // Mock Data for UI Testing
        const mockData = {
          title: `Module ${moduleId}: Python Programming`,
          lessons: [
            { id: 1, title: "1. Variables & Data Types", type: "video", url: "intro.mp4" },
            { id: 2, title: "2. Loops & Conditions", type: "video", url: "loops.mp4" },
            { id: 3, title: "3. Quick Quiz", type: "quiz", url: null },
          ],
          attachments: [
            { id: 1, name: "Python Cheat Sheet.pdf", url: "cheat_sheet.pdf" }
          ]
        };
        
        setModuleData(mockData);
        setActiveLesson(mockData.lessons[0]);
      } catch (err) {
        console.error("Failed to load module content", err);
      } finally {
        setLoading(false);
      }
    };

    fetchModuleContent();
  }, [moduleId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-[#0c0c0d] text-gray-900 dark:text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white dark:bg-[#0c0c0d] text-gray-900 dark:text-gray-200 overflow-hidden font-sans transition-colors duration-300">
      
      {/* ========================================== */}
      {/* LEFT PANE: SYLLABUS SIDEBAR                */}
      {/* ========================================== */}
      <div className="w-80 shrink-0 border-r border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#131314] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-[#333]">
          <button 
            onClick={() => navigate('/program/dashboard')}
            className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white transition-colors mb-4 uppercase tracking-widest"
          >
            <ChevronLeft size={14} /> Back to Dashboard
          </button>
          <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
            {moduleData?.title}
          </h2>
        </div>

        {/* Lesson List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest px-2 mb-3">Course Content</h3>
          
          {moduleData?.lessons.map((lesson) => (
            <div 
              key={lesson.id}
              onClick={() => setActiveLesson(lesson)}
              className={`p-4 rounded-xl cursor-pointer flex items-center gap-3 transition-all border ${
                activeLesson?.id === lesson.id 
                  ? 'bg-blue-600/10 border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'bg-white dark:bg-[#1E1F20] border-transparent dark:border-transparent hover:border-gray-300 dark:hover:border-[#333] text-gray-700 dark:text-gray-300'
              }`}
            >
              {lesson.type === 'video' ? <PlayCircle size={18} /> : <FileText size={18} />}
              <span className="text-sm font-semibold">{lesson.title}</span>
            </div>
          ))}

          <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2 mt-8 mb-3">Attachments</h3>
          {moduleData?.attachments.map((file) => (
            <div key={file.id} className="p-3 rounded-xl bg-white dark:bg-[#1E1F20] border border-gray-200 dark:border-[#333] flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white cursor-pointer transition-colors">
              <Paperclip size={14} />
              <span className="truncate font-medium">{file.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================== */}
      {/* RIGHT PANE: SPLIT VIDEO (TOP) & CHAT (BOT) */}
      {/* ========================================== */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-white dark:bg-black">
        
        {/* TOP: Video / Content Viewer (70% height) */}
        <div className="flex-[7] bg-gray-100 dark:bg-black relative flex flex-col items-center justify-center p-8 border-b border-gray-200 dark:border-[#333]">
          
          {/* Video Player Container */}
          <div className="w-full max-w-4xl aspect-video bg-white dark:bg-[#131314] rounded-2xl border border-gray-200 dark:border-[#222] shadow-xl flex flex-col items-center justify-center overflow-hidden">
             <div className="flex flex-col items-center justify-center p-12 text-center">
                <PlayCircle size={64} className="text-gray-300 dark:text-[#333] mb-4" />
                <p className="text-gray-400 dark:text-gray-500 font-bold tracking-widest uppercase">
                  Video Player Simulator
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-600 mt-2 font-mono">
                  src: {activeLesson?.url || 'No video source'}
                </p>
             </div>
          </div>

          <div className="w-full max-w-4xl mt-6">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">{activeLesson?.title}</h1>
          </div>
        </div>

        {/* BOTTOM: AI Chat Interface (30% height) */}
        <div className="flex-[3] bg-white dark:bg-[#131314] flex flex-col">
          {/* Chat Header */}
          <div className="px-6 py-3 border-b border-gray-200 dark:border-[#333] flex items-center gap-2 bg-gray-50 dark:bg-[#1c1c1e] shrink-0">
            <MessageSquare size={16} className="text-blue-600 dark:text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300">AI Tutor Assistant</span>
          </div>
          
          {/* Chat History Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shrink-0 shadow-lg shadow-blue-500/20">AI</div>
              <div className="bg-gray-100 dark:bg-[#1E1F20] border border-gray-200 dark:border-[#333] rounded-2xl rounded-tl-none p-4 text-sm text-gray-800 dark:text-gray-300 shadow-sm">
                Hello! I am your AI Tutor for <strong>{moduleData?.title}</strong>. Need help understanding the video above?
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200 dark:border-[#333] bg-white dark:bg-[#131314] shrink-0">
            <div className="max-w-4xl mx-auto relative">
              <input 
                type="text" 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder={`Ask a question about ${activeLesson?.title}...`}
                className="w-full bg-gray-100 dark:bg-[#1E1F20] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white text-sm rounded-full py-4 pl-6 pr-14 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-all shadow-md active:scale-95">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ModuleLayout;