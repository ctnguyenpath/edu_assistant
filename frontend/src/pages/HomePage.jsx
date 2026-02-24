import React from 'react';
import { Play } from 'lucide-react';
import { BUCKET_NAME } from '../config';

const HomePage = ({ onPlayVideo, videos }) => {
  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="mb-10">
        <h1 className="text-4xl font-medium text-gray-100 mb-2">Welcome back</h1>
        <p className="text-gray-400">Pick up where you left off.</p>
      </div>
      <h2 className="text-xl text-gray-200 mb-6 font-medium">Available in {BUCKET_NAME}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((clip) => (
          <div key={clip.filename} onClick={() => onPlayVideo(clip)} className="group bg-[#1E1F20] rounded-2xl overflow-hidden hover:ring-1 hover:ring-gray-600 transition-all cursor-pointer">
            <div className="h-40 bg-gray-800 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <Play className="w-12 h-12 text-white opacity-80 group-hover:scale-110 transition-transform" />
            </div>
            <div className="p-4">
              <h3 className="text-gray-200 font-medium truncate">{clip.title}</h3>
              <p className="text-xs text-gray-500 mt-2">{clip.size}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;