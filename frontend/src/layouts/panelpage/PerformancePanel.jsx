import React from 'react';
import { Trophy, ChevronDown, ChevronUp, AlertCircle, TrendingUp } from 'lucide-react';

const PerformancePanel = ({ isOpen, onToggle, activeLesson, currentPerf, getScoreColor }) => {
  return (
    <div className="border-t border-gray-200 dark:border-[#333] bg-white dark:bg-[#131314] flex flex-col shrink-0 transition-colors duration-300">
      <div 
        onClick={onToggle}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1E1F20] transition-colors select-none"
      >
         <h2 className="text-gray-900 dark:text-gray-100 font-bold text-xs tracking-widest uppercase flex items-center gap-2 transition-colors duration-300">
            <Trophy size={16} className="text-yellow-500"/> Performance
         </h2>
         {isOpen ? <ChevronDown size={16} className="text-gray-500"/> : <ChevronUp size={16} className="text-gray-500"/>}
      </div>

      {isOpen && (
        <div className="p-4 pt-0 space-y-6 overflow-y-auto max-h-[40vh] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#333] transition-colors duration-300">
           {/* Selected Module Summary */}
           <div className="bg-gray-50 dark:bg-[#1E1F20] p-4 rounded-xl border border-gray-200 dark:border-[#333] shadow-inner transition-colors duration-300">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Current Focus</p>
              <h3 className="text-gray-900 dark:text-white font-bold text-sm mb-3 truncate transition-colors duration-300">{activeLesson?.topic || 'No Module Selected'}</h3>
              <div className="flex items-baseline gap-2">
                 <span className="text-4xl font-black text-gray-900 dark:text-white transition-colors duration-300">{currentPerf?.score_value ?? '--'}</span>
                 <span className="text-gray-400 dark:text-gray-600 font-bold text-sm">/ 10</span>
              </div>
              <div className={`mt-3 text-[10px] font-bold px-2 py-1 rounded-lg border inline-block uppercase tracking-wider ${getScoreColor(currentPerf?.grade_label)}`}>
                 {currentPerf?.grade_label || 'NOT STARTED'}
              </div>
           </div>

           {/* Failing Alert */}
           {currentPerf?.score_value !== null && currentPerf?.score_value < 5 && (
             <div className="bg-red-900/10 border border-red-500/20 p-3 rounded-xl flex gap-3 animate-pulse">
                <AlertCircle className="text-red-500 shrink-0" size={16}/>
                <p className="text-[10px] text-red-600 dark:text-red-200 leading-tight font-medium">Below proficiency threshold. Re-take quizzes.</p>
             </div>
           )}

           {/* Global Progress */}
           <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Path Completion</h4>
                <TrendingUp size={14} className="text-blue-500"/>
              </div>
              <div className="w-full bg-gray-200 dark:bg-[#1E1F20] h-2 rounded-full overflow-hidden border border-gray-300 dark:border-[#333] transition-colors duration-300">
                <div className="bg-blue-600 h-full w-[70%] shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-1000"></div>
              </div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">14 of 20 Modules Mastered</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default PerformancePanel;