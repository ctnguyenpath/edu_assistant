import React, { useMemo } from 'react';
import { X, GripVertical, CheckCircle2, Circle } from 'lucide-react';

const ModuleListPanel = ({ syllabusData, customPath = [], handleDragStart, onClose, onSelectModule }) => {
  
  // --- 1. GET SELECTED MODULES ---
  const selectedModuleIds = useMemo(() => {
    try {
      const saved = localStorage.getItem('pending_pathway');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.modules || [];
      }
    } catch (e) {
      console.error("Failed to parse pending pathway", e);
    }
    return [];
  }, []);

  // --- 2. GROUP BY PROGRAM ---
  const groupedPrograms = useMemo(() => {
    // Filter to only show modules the user selected (fallback to all if none selected)
    const dataToGroup = selectedModuleIds.length > 0 
      ? syllabusData.filter(m => selectedModuleIds.includes(m.lesson))
      : syllabusData;

    const groups = {};
    
    dataToGroup.forEach(item => {
      // Split "Core Foundation: Python Programming" into Program and Module
      const parts = item.topic.split(':');
      const programName = parts.length > 1 ? parts[0].trim() : item.type || 'General Program';
      const moduleName = parts.length > 1 ? parts[1].trim() : item.topic;

      if (!groups[programName]) {
        groups[programName] = {
          programName,
          modules: []
        };
      }

      groups[programName].modules.push({
        ...item,
        displayName: moduleName
      });
    });

    return Object.values(groups);
  }, [syllabusData, selectedModuleIds]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0c0d] transition-colors duration-300">
      
      {/* --- HEADER --- */}
      <div className="p-4 border-b border-gray-200 dark:border-[#333] flex justify-between items-center bg-gray-50 dark:bg-[#131314] shrink-0">
        <div>
          <h2 className="font-bold text-gray-800 dark:text-gray-200 leading-tight">Your Curriculum</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">Drag modules to the map</p>
        </div>
        <button 
          onClick={onClose} 
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      
      {/* --- MODULE LIST --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8 course-map-scroll">
        {groupedPrograms.map(group => (
          <div key={group.programName} className="space-y-3">
            
            {/* Program Group Header */}
            <h3 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">
              {group.programName}
            </h3>
            
            {/* Draggable Sub-Modules */}
            <div className="space-y-2.5">
              {group.modules.map(mod => {
                const isAdded = customPath.includes(mod.lesson);
                
                return (
                  <div 
                    key={mod.lesson}
                    draggable={!isAdded}
                    onDragStart={(e) => handleDragStart(e, mod.lesson)}
                    onClick={() => onSelectModule(mod)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group
                      ${isAdded 
                        ? 'border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/10 opacity-60 shadow-inner' 
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1E1F20] hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                      }
                    `}
                  >
                    {/* Drag Handle */}
                    <div className={`cursor-grab active:cursor-grabbing p-1 rounded transition-colors ${isAdded ? 'text-green-400' : 'text-gray-300 dark:text-gray-600 group-hover:text-blue-500'}`}>
                      <GripVertical size={16} />
                    </div>
                    
                    {/* Module Title */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate transition-colors ${isAdded ? 'text-green-700 dark:text-green-500' : 'text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                        {mod.displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">
                        Module {mod.lesson}
                      </p>
                    </div>

                    {/* Status Icon */}
                    <div className="shrink-0">
                      {isAdded ? (
                        <CheckCircle2 size={18} className="text-green-500" />
                      ) : (
                        <Circle size={18} className="text-gray-200 dark:text-gray-700 group-hover:text-blue-400 transition-colors" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {groupedPrograms.length === 0 && (
          <div className="text-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
              No programs selected. Head back to the Home page to choose your path!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ModuleListPanel;