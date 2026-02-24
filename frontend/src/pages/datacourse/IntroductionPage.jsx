import React, { useState, useEffect, useRef } from 'react';
import { 
  List, RefreshCw, ChevronLeft, PanelLeft, Play, BookOpen, GripHorizontal, ExternalLink 
} from 'lucide-react';
import ChatInterface from '../../components/ChatInterface'; 
import { MINIO_BASE_URL, BUCKET_NAME } from '../../config'; 

const IntroductionPage = ({ chatProps }) => {
  // --- 1. PERSISTENT STATE INITIALIZATION ---
  
  // Sidebar: Check localStorage, default to true
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('intro_sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Panel Height: Check localStorage, default to 60%
  const [topHeight, setTopHeight] = useState(() => {
    const saved = localStorage.getItem('intro_panelHeight');
    return saved !== null ? parseFloat(saved) : 60;
  });

  // Active Video: Check localStorage for filename
  const [activeVideoFilename, setActiveVideoFilename] = useState(() => {
    return localStorage.getItem('intro_activeVideo') || null;
  });

  // Standard State
  const [videos, setVideos] = useState([]);
  const [activeVideo, setActiveVideo] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const videoRef = useRef(null);

  // --- 2. SAVE STATE ON CHANGE ---

  // Save Sidebar State
  useEffect(() => {
    localStorage.setItem('intro_sidebarOpen', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  // Save Panel Height
  useEffect(() => {
    localStorage.setItem('intro_panelHeight', topHeight.toString());
  }, [topHeight]);

  // Save Active Video
  useEffect(() => {
    if (activeVideo) {
      localStorage.setItem('intro_activeVideo', activeVideo.filename);
    }
  }, [activeVideo]);


  // --- HANDLERS ---
  const handlePopOut = () => {
    if (!activeVideo) return;
    if (videoRef.current) videoRef.current.pause();
    
    const width = 1280;
    const height = 720;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    window.open(
      `/watch/${activeVideo.filename}`, 
      '_blank', 
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=no,status=no`
    );
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault(); 
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const newHeight = (e.clientY / window.innerHeight) * 100;
      if (newHeight > 20 && newHeight < 80) setTopHeight(newHeight);
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);


  // --- FETCH LOGIC ---
  const fetchIntroVideos = async () => {
    setLoading(true);
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

      // --- RESTORE ACTIVE VIDEO ---
      if (parsedVideos.length > 0) {
        // Try to find the saved video in the new list
        const savedVideo = parsedVideos.find(v => v.filename === activeVideoFilename);
        if (savedVideo) {
          setActiveVideo(savedVideo);
        } else {
          // Fallback to first video if saved one not found or never saved
          setActiveVideo(parsedVideos[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching Introduction videos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntroVideos();
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      
      {/* --- TOP SECTION (Dynamic Height) --- */}
      <div style={{ height: `${topHeight}%` }} className="bg-black flex relative transition-none">
        
        {/* Sidebar */}
        <div className={`${isSidebarOpen ? 'w-72 border-r' : 'w-0 border-r-0'} bg-[#1E1F20] border-[#333] flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}>
           <div className="p-3 border-b border-[#333] flex justify-between items-center bg-[#1E1F20] min-w-[18rem]">
             <span className="text-gray-400 text-xs font-bold uppercase flex items-center gap-2">
               <BookOpen className="w-3 h-3 text-blue-400"/> Intro Module ({videos.length})
             </span>
             <div className="flex gap-2">
               <button onClick={fetchIntroVideos} className={`text-gray-500 hover:text-white ${loading ? 'animate-spin' : ''}`}>
                 <RefreshCw className="w-3 h-3" />
               </button>
               <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-white md:hidden">
                 <ChevronLeft className="w-4 h-4" />
               </button>
             </div>
           </div>
           
           <div className="flex-1 overflow-y-auto min-w-[18rem]">
             {videos.length === 0 && !loading ? (
                <div className="p-4 text-gray-500 text-xs text-center">No videos in {BUCKET_NAME}</div>
             ) : (
               videos.map(clip => (
                 <div 
                   key={clip.filename} 
                   onClick={() => setActiveVideo(clip)}
                   className={`p-3 cursor-pointer hover:bg-[#282A2C] transition-colors flex gap-3 border-b border-white/5 ${
                     activeVideo?.filename === clip.filename ? 'bg-[#282A2C] border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
                   }`}
                 >
                    <div className="w-10 h-10 bg-gray-800 rounded flex-shrink-0 flex items-center justify-center text-blue-500/50">
                        <Play size={16} fill="currentColor" />
                    </div>
                    <div className="overflow-hidden flex flex-col justify-center">
                      <p className="text-gray-200 text-xs font-medium truncate leading-tight mb-1">{clip.title}</p>
                      <p className="text-gray-500 text-[10px]">{clip.size}</p>
                    </div>
                 </div>
               ))
             )}
           </div>
        </div>

        {/* Video Player */}
        <div className="flex-1 flex items-center justify-center bg-black relative">
           <button 
             onClick={() => setIsSidebarOpen(!isSidebarOpen)}
             className="absolute top-4 left-4 z-20 p-2 bg-black/50 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm border border-white/10"
             title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
           >
             {isSidebarOpen ? <ChevronLeft size={20} /> : <PanelLeft size={20} />}
           </button>

           {activeVideo && (
             <button 
               onClick={handlePopOut}
               className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-blue-600 text-white rounded-lg backdrop-blur-sm border border-white/10 transition-colors group"
               title="Open in new window"
             >
               <ExternalLink size={20} />
             </button>
           )}

           {activeVideo ? (
             <>
               <video 
                 ref={videoRef}
                 controls 
                 className="w-full h-full max-h-full object-contain"
                 src={`${MINIO_BASE_URL}/${BUCKET_NAME}/${activeVideo.filename}`} 
               />
               <div className={`absolute top-4 ${isSidebarOpen ? 'left-16' : 'left-16'} bg-black/60 backdrop-blur px-3 py-1 rounded text-white text-sm font-medium z-10 pointer-events-none transition-all`}>
                  Now Playing: {activeVideo.title}
               </div>
             </>
           ) : (
             <div className="text-gray-500 flex flex-col items-center">
               <BookOpen className="w-12 h-12 mb-2 opacity-20"/>
               <p>Select an intro video</p>
             </div>
           )}
           {isDragging && <div className="absolute inset-0 z-50 bg-transparent" />}
        </div>
      </div>

      <div 
        onMouseDown={handleMouseDown}
        className="h-2 bg-[#1E1F20] hover:bg-blue-600 cursor-row-resize flex items-center justify-center transition-colors z-40 border-y border-[#333] group"
      >
        <GripHorizontal className="text-gray-600 group-hover:text-white w-4 h-4" />
      </div>

      <div style={{ height: `${100 - topHeight}%` }} className="bg-[#131314] relative">
        <ChatInterface {...chatProps} compact={true} />
        {isDragging && <div className="absolute inset-0 z-50 bg-transparent" />}
      </div>

    </div>
  );
};

export default IntroductionPage;