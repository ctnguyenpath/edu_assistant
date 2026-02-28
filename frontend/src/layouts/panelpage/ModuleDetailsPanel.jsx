import React from 'react';
import { CheckCircle2, Star, Trash2, X, BookOpen } from 'lucide-react';

const ModuleDetailsPanel = ({ activeLesson, isCustomizing, customPath, removeCustomPathItem, onClose }) => {
  if (!activeLesson) return null;

  return (
    <div className="flex flex-col h-full w-full relative bg-gray-50 dark:bg-[#0c0c0d] transition-colors duration-300">
      {/* Panel Header */}
      <div className="p-4 border-b border-gray-200 dark:border-[#333] flex items-center justify-between bg-white dark:bg-[#131314] shrink-0 transition-colors duration-300">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm tracking-wider uppercase transition-colors duration-300">
          <BookOpen className="w-4 h-4 text-blue-500" />
          Module Details
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-[#282A2C] rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#333] scrollbar-track-transparent pb-24 transition-colors duration-300">
        <div key={activeLesson.lesson} className="animate-fade-in-up">
          
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex shrink-0 items-center justify-center font-bold text-3xl text-white shadow-lg shadow-blue-900/30 border border-blue-400/30">
              {activeLesson.lesson}
            </div>
            <div className="overflow-hidden">
              <div className={`inline-block px-3 py-1 mb-2 text-[10px] font-bold uppercase tracking-wider rounded-full border ${activeLesson.typeColor}`}>
                {activeLesson.type}
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight truncate transition-colors duration-300">
                {activeLesson.topic}
              </h2>
            </div>
          </div>

          {/* Remove from custom path button */}
          {isCustomizing && customPath.includes(activeLesson.lesson) && (
             <button 
               onClick={() => removeCustomPathItem(activeLesson.lesson)}
               className="mb-8 flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-bold transition-colors w-fit"
             >
               <Trash2 size={16} />
               Remove from Custom Path
             </button>
          )}

          <div className="mb-8 p-5 bg-gradient-to-r from-white to-gray-50 dark:from-[#1E1F20] dark:to-[#131314] rounded-2xl border border-gray-200 dark:border-[#333] relative overflow-hidden shadow-lg transition-colors duration-300">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 text-blue-500/5 pointer-events-none">
              <Star size={100} />
            </div>
            <h4 className="text-xs font-bold text-blue-400 uppercase mb-2 flex items-center gap-2 relative z-10">
              💡 Why This Matters
            </h4>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm relative z-10 italic transition-colors duration-300">
              "{activeLesson.whyWeLearn}"
            </p>
          </div>

          {/* DYNAMIC RENDERING: Show Levels or Contents */}
          {activeLesson.levels ? (
            <div className="mb-8">
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-200 mb-5 border-b border-gray-200 dark:border-[#333] pb-3 flex items-center gap-3 transition-colors duration-300">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                Skill Progression
              </h4>
              <div className="space-y-4">
                {activeLesson.levels.map((lvl, idx) => {
                  const isJunior = lvl.level === "Junior";
                  const isSenior = lvl.level === "Senior";
                  const barColor = isJunior ? "bg-green-500" : isSenior ? "bg-amber-500" : "bg-red-500";
                  const textColor = isJunior ? "text-green-600 dark:text-green-400" : isSenior ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
                  return (
                    <div key={idx} className="bg-white dark:bg-[#131314] p-4 rounded-xl border border-gray-200 dark:border-[#222] shadow-md relative overflow-hidden hover:border-gray-300 dark:hover:border-[#444] transition-colors duration-300">
                       <div className={`absolute top-0 left-0 w-1.5 h-full ${barColor}`}></div>
                       <h5 className={`font-bold text-sm mb-1 uppercase tracking-wider pl-2 ${textColor}`}>{lvl.level}</h5>
                       <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed pl-2 transition-colors duration-300">{lvl.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#131314] p-5 rounded-2xl border border-gray-200 dark:border-[#222] shadow-md mb-8 transition-colors duration-300">
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-200 mb-5 border-b border-gray-200 dark:border-[#333] pb-3 flex items-center gap-3 transition-colors duration-300">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                Overview Details
              </h4>
              <ul className="space-y-4">
                {activeLesson.contents?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-4 group p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1E1F20] transition-colors border border-transparent hover:border-gray-200 dark:hover:border-[#333]">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mt-0.5 group-hover:bg-blue-500 group-hover:text-white transition-colors"><CheckCircle2 className="w-3 h-3" /></div>
                    <span className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors pt-px">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ModuleDetailsPanel;