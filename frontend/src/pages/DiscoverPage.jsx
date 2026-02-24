import React, { useState, useEffect } from 'react';
import { List, RefreshCw, ChevronLeft, PanelLeft, Play } from 'lucide-react';
import ChatInterface from '../components/ChatInterface';
import { MINIO_BASE_URL, BUCKET_NAME } from '../config';

const DiscoverPage = ({ chatProps, videos, refreshVideos, loadingVideos }) => {
  const [activeVideo, setActiveVideo] = useState(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (videos.length > 0 && !activeVideo) {
      setActiveVideo(videos[0]);
    }
  }, [videos]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-3/5 bg-black border-b border-[#333] flex relative">
        <div className={`${isSidebarOpen ? 'w-72 border-r' : 'w-0 border-r-0'} bg-[#1E1F20] border-[#333] flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}>
           <div className="p-3 border-b border-[#333] flex justify-between items-center bg-[#1E1F20] min-w-[18rem]">
             <span className="text-gray-400 text-xs font-bold uppercase flex items-center gap-2">
               <List className="w-3 h-3"/> Library ({videos.length})
             </span>
             <div className="flex gap-2">
               <button onClick={refreshVideos} disabled={loadingVideos} className={`text-gray-500 hover:text-white transition-colors ${loadingVideos ? 'animate-spin' : ''}`} title="Refresh List">
                 <RefreshCw className="w-3 h-3" />
               </button>
               <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-white transition-colors md:hidden">
                 <ChevronLeft className="w-4 h-4" />
               </button>
             </div>
           </div>
           
           <div className="flex-1 overflow-y-auto min-w-[18rem]">
             {videos.length === 0 && !loadingVideos ? (
                <div className="p-4 text-gray-500 text-xs text-center">No videos found</div>
             ) : (
               videos.map(clip => (
                 <div 
                   key={clip.filename} 
                   onClick={() => setActiveVideo(clip)}
                   className={`p-3 cursor-pointer hover:bg-[#282A2C] transition-colors flex gap-3 border-b border-white/5 ${
                     activeVideo?.filename === clip.filename ? 'bg-[#282A2C] border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
                   }`}
                 >
                    <div className="w-20 h-12 bg-gray-800 rounded overflow-hidden flex-shrink-0 relative group">
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        <Play size={16} className="text-white opacity-50 group-hover:scale-110 transition-transform"/>
                      </div>
                    </div>
                    <div className="overflow-hidden flex flex-col justify-center">
                      <p className="text-gray-200 text-xs font-medium truncate leading-tight mb-1" title={clip.title}>{clip.title}</p>
                      <p className="text-gray-500 text-[10px]">{clip.size}</p>
                    </div>
                 </div>
               ))
             )}
           </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-black relative">
           <button 
             onClick={() => setIsSidebarOpen(!isSidebarOpen)}
             className="absolute top-4 left-4 z-20 p-2 bg-black/50 hover:bg-black/80 text-white rounded-lg transition-colors backdrop-blur-sm border border-white/10 group"
             title={isSidebarOpen ? "Hide Playlist" : "Show Playlist"}
           >
             {isSidebarOpen ? <ChevronLeft size={20} /> : <PanelLeft size={20} />}
           </button>

           {activeVideo ? (
             <>
               <video 
                 key={activeVideo.filename} 
                 controls 
                 className="w-full h-full max-h-full object-contain"
                 src={`${MINIO_BASE_URL}/${BUCKET_NAME}/${activeVideo.filename}`} 
               >
                 Your browser does not support video.
               </video>
               <div className={`absolute top-4 ${isSidebarOpen ? 'left-16' : 'left-16'} bg-black/60 backdrop-blur px-3 py-1 rounded text-white text-sm font-medium z-10 pointer-events-none transition-all`}>
                  Now Playing: {activeVideo.title}
               </div>
             </>
           ) : (
             <div className="text-gray-500 flex flex-col items-center">
               <List className="w-12 h-12 mb-2 opacity-20"/>
               <p>Select a video to play</p>
             </div>
           )}
        </div>
      </div>

      <div className="h-2/5 bg-[#131314]">
        <ChatInterface {...chatProps} compact={true} />
      </div>
    </div>
  );
};

export default DiscoverPage;