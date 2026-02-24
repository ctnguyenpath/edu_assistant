import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { MINIO_BASE_URL, BUCKET_NAME } from '../config';

const VideoPlayer = () => {
  const { filename } = useParams();
  const navigate = useNavigate();
  const videoSrc = `${MINIO_BASE_URL}/${BUCKET_NAME}/${filename}`;

  return (
    <div className="flex flex-col h-full bg-[#000000] overflow-y-auto">
      <div className="p-4 flex items-center gap-2 sticky top-0 bg-black/80 backdrop-blur z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-[#333] rounded-full text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="text-gray-200 font-medium">Back</span>
      </div>
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
        <div className="aspect-video bg-[#1E1F20] rounded-xl overflow-hidden ring-1 ring-[#333]">
           <video controls autoPlay className="w-full h-full object-contain" src={videoSrc} />
        </div>
        <div className="mt-6">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">{filename}</h1>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;