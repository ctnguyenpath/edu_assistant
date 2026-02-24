import React, { useState } from 'react';
import { Grip, X, ChevronDown, ChevronRight, ListPlus, Folder } from 'lucide-react';

const ModuleListPanel = ({ syllabusData, customPath, handleDragStart, onClose }) => {
  // 1. Group data by Type
  const groupedData = syllabusData.reduce((acc, lesson) => {
    const group = lesson.type || "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(lesson);
    return acc;
  }, {});

  // 2. Sort groups logically
  const groupOrder = ["Overview", "Core Foundation", "Track 1: Analytics", "Track 2: Engineering"];
  const groups = Object.keys(groupedData).sort((a, b) => {
    const idxA = groupOrder.indexOf(a);
    const idxB = groupOrder.indexOf(b);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  // 3. Accordion state (All open by default)
  const [expanded, setExpanded] = useState(
    groups.reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );

  const toggleGroup = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="flex flex-col h-full relative bg-[#0c0c0d]">
      
      {/* Header */}
      <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#131314] shrink-0">
        <h3 className="font-bold text-gray-100 flex items-center gap-2 text-sm tracking-wider uppercase">
          <ListPlus className="w-4 h-4 text-blue-500" />
          All Topics
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-[#282A2C] rounded-md text-gray-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Accordion List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent pb-24 space-y-6">
        {groups.map((groupName) => (
          <div key={groupName} className="bg-[#131314] p-2 rounded-xl border border-[#222]">
            
            {/* Group Header */}
            <div 
              onClick={() => toggleGroup(groupName)}
              className="flex items-center gap-3 cursor-pointer p-2 text-gray-300 hover:text-white transition-colors"
            >
              {expanded[groupName] ? <ChevronDown size={18} className="text-gray-500"/> : <ChevronRight size={18} className="text-gray-500"/>}
              <Folder size={16} className="text-blue-500" />
              <h4 className="font-bold text-xs tracking-widest uppercase">{groupName}</h4>
            </div>
            
            {/* Group Items */}
            {expanded[groupName] && (
              <div className="pl-8 pr-2 pb-2 pt-2 space-y-3">
                {groupedData[groupName].map(lesson => {
                  const isAdded = customPath.includes(lesson.lesson);
                  
                  return (
                    <div 
                      key={lesson.lesson}
                      draggable={!isAdded}
                      onDragStart={(e) => handleDragStart(e, lesson.lesson)}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-all shadow-sm group
                        ${isAdded 
                          ? 'border-[#333] bg-[#1E1F20]/50 opacity-40 cursor-not-allowed grayscale' 
                          : 'border-[#444] bg-[#1E1F20] cursor-grab active:cursor-grabbing hover:border-blue-500 hover:shadow-blue-900/20'
                        }`}
                    >
                      <div className={`flex-shrink-0 transition-colors ${isAdded ? 'text-gray-600' : 'text-gray-400 group-hover:text-blue-400'}`}>
                        <Grip size={16} />
                      </div>
                      <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs border transition-colors ${
                        isAdded ? 'bg-[#131314] text-gray-600 border-[#333]' : 'bg-[#282A2C] text-gray-200 border-[#555] group-hover:bg-blue-600/20 group-hover:border-blue-500 group-hover:text-blue-400'
                      }`}>
                        {lesson.lesson}
                      </div>
                      <h4 className={`text-xs font-bold truncate flex-1 ${isAdded ? 'text-gray-500' : 'text-gray-200 group-hover:text-white'}`}>
                        {lesson.topic}
                      </h4>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  );
};

export default ModuleListPanel;