import React, { useMemo } from 'react';
import { X, GripHorizontal, Circle } from 'lucide-react';

const ModuleListPanel = ({ 
  syllabusData, 
  customPath, 
  handleDragStart, 
  onClose,
  onSelectModule
}) => {
  const groupedModules = useMemo(() => {
    const groups = {};
    syllabusData.forEach((mod) => {
      const groupName = mod.type || 'General';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(mod);
    });
    return groups;
  }, [syllabusData]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-[#333] flex justify-between items-center bg-white dark:bg-[#131314] transition-colors duration-300">
        <h2 className="text-gray-900 dark:text-gray-100 font-bold text-xs tracking-widest uppercase transition-colors duration-300">Curriculum Modules</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#333] transition-colors duration-300">
        {Object.entries(groupedModules).map(([groupName, modules]) => (
          <div key={groupName}>
            <h3 className="px-1 mb-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest opacity-80">{groupName}</h3>
            <div className="space-y-2">
              {modules.map((module) => {
          return (
            <div
              key={module.lesson}
              draggable
              onDragStart={(e) => handleDragStart(e, module.lesson)}
              onClick={() => onSelectModule && onSelectModule(module)}
              className="group bg-white dark:bg-[#1E1F20] hover:bg-gray-50 dark:hover:bg-[#252627] border border-gray-200 dark:border-[#333] hover:border-blue-500/50 rounded-xl p-3 cursor-pointer active:cursor-grabbing transition-all flex items-center gap-3 select-none shadow-sm"
            >
              {/* Drag Handle */}
              <div className="text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors">
                <GripHorizontal size={16} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Module {module.lesson}
                  </span>
                </div>
                <h3 className="text-gray-800 dark:text-gray-200 font-bold text-xs truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {module.topic}
                </h3>
              </div>
              
              {/* Status Icon */}
              <div className="shrink-0">
                 <Circle size={16} className="text-gray-300 dark:text-gray-700 group-hover:text-gray-400 dark:group-hover:text-gray-600" />
              </div>
            </div>
          );
        })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModuleListPanel;