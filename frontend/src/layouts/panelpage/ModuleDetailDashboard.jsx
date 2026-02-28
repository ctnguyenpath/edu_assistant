import React, { useState } from 'react';
import { 
  Trophy, BookOpen, ChevronLeft, ChevronRight, 
  AlertCircle, TrendingUp, CheckCircle2, Star 
} from 'lucide-react';

const ModuleDetailDashboard = ({ data }) => {
  const [selectedId, setSelectedId] = useState(data[0]?.module_id);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);

  const selectedModule = data.find(m => m.module_id === selectedId) || data[0];

  const getScoreColor = (label) => {
    switch (label) {
      case 'Excellence': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Good': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Average': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Fail': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0c0c0d] font-sans overflow-hidden text-gray-900 dark:text-gray-200 transition-colors duration-300">
      
      {/* 1. LEFT SIDE: Module List */}
      <div className="w-80 border-r border-gray-200 dark:border-[#222] overflow-y-auto bg-white dark:bg-[#131314] shrink-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#333] transition-colors duration-300">
        <div className="p-6 border-b border-gray-200 dark:border-[#222] bg-white dark:bg-[#131314] sticky top-0 z-10 transition-colors duration-300">
          <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-gray-500 dark:text-gray-400">
            <BookOpen size={16} className="text-blue-500"/> Curriculum
          </h2>
        </div>
        {data.map((mod) => (
          <div 
            key={mod.module_id}
            onClick={() => setSelectedId(mod.module_id)}
            className={`p-5 cursor-pointer border-b border-gray-100 dark:border-[#222] transition-all relative ${
              selectedId === mod.module_id 
                ? 'bg-blue-50 dark:bg-[#1E1F20] border-l-4 border-l-blue-600' 
                : 'hover:bg-gray-50 dark:hover:bg-[#181819]'
            }`}
          >
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">{mod.track}</p>
            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 leading-snug transition-colors duration-300">{mod.topic_name}</h3>
            
            {mod.score_value !== null && (
              <div className={`mt-3 text-[10px] px-2 py-1 rounded-md border font-bold inline-flex items-center gap-1.5 ${getScoreColor(mod.grade_label)}`}>
                <Trophy size={10} />
                Score: {mod.score_value}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 2. CENTER: Main Detail Area (Styled like ModuleDetailsPanel) */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0c0c0d] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-[#333] transition-colors duration-300">
        <div className="max-w-4xl mx-auto p-12 animate-fade-in-up">
          
          {/* Header Section */}
          <div className="flex items-center gap-6 mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex shrink-0 items-center justify-center font-black text-3xl text-white shadow-xl shadow-blue-900/20 border border-blue-400/30">
              {selectedModule.module_id}
            </div>
            <div>
              <div className="inline-block px-3 py-1 mb-2 text-[10px] font-bold uppercase tracking-widest rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
                {selectedModule.track}
              </div>
              <h1 className="text-4xl font-black text-white leading-tight">
                {selectedModule.topic_name}
              </h1>
            </div>
          </div>

          {/* Why This Matters Section */}
          <div className="mb-10 p-6 bg-gradient-to-r from-[#1E1F20] to-[#131314] rounded-2xl border border-[#333] relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 text-blue-500/5 pointer-events-none">
              <Star size={120} />
            </div>
            <h4 className="text-xs font-bold text-blue-400 uppercase mb-3 flex items-center gap-2">
              💡 Learning Objective
            </h4>
            <p className="text-gray-300 leading-relaxed text-base italic">
              "Master the fundamentals of {selectedModule.topic_name} within the {selectedModule.track} track to improve data-driven decision making."
            </p>
          </div>

          {/* Dynamic Content: Performance or Overview */}
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-[#131314] p-8 rounded-2xl border border-[#222] shadow-xl">
              <h4 className="text-lg font-bold text-gray-100 mb-6 border-b border-[#333] pb-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                Module Overview
              </h4>
              
              <div className="space-y-4">
                {/* Mocked levels logic from your reference code */}
                {[
                  { level: "Junior", desc: `Fundamental concepts of ${selectedModule.topic_name}.` },
                  { level: "Senior", desc: `Advanced implementation and optimization techniques.` }
                ].map((lvl, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-[#1c1c1e] p-5 rounded-xl border border-gray-200 dark:border-[#333] relative overflow-hidden group hover:border-blue-500/30 transition-colors duration-300">
                    <div className={`absolute top-0 left-0 w-1 h-full ${lvl.level === 'Junior' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                    <h5 className={`font-bold text-xs mb-1 uppercase tracking-widest ${lvl.level === 'Junior' ? 'text-green-400' : 'text-amber-400'}`}>{lvl.level} Mastery</h5>
                    <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-300">{lvl.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. RIGHT SIDE: Performance Summary */}
      <div className={`relative border-l border-gray-200 dark:border-[#222] transition-all duration-300 ease-in-out bg-white dark:bg-[#131314] flex ${isSummaryOpen ? 'w-80' : 'w-12'}`}>
        
        <button 
          onClick={() => setIsSummaryOpen(!isSummaryOpen)}
          className="absolute -left-3 top-10 bg-white dark:bg-[#1E1F20] border border-gray-200 dark:border-[#333] rounded-full p-1 shadow-xl hover:bg-gray-100 dark:hover:bg-[#282A2C] z-20 text-gray-500 dark:text-gray-400 transition-colors duration-300"
        >
          {isSummaryOpen ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
        </button>

        {!isSummaryOpen && (
          <div className="w-full flex flex-col items-center pt-20 gap-8 cursor-pointer" onClick={() => setIsSummaryOpen(true)}>
            <Trophy className="text-blue-500" size={20}/>
            <span className="rotate-90 whitespace-nowrap font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-[10px]">
              Performance Summary
            </span>
          </div>
        )}

        {isSummaryOpen && (
          <div className="w-full p-8 overflow-y-auto">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-10 uppercase tracking-widest text-gray-500 dark:text-gray-400">
              <Trophy size={18} className="text-blue-500"/> Performance
            </h2>
            
            <div className="space-y-8">
              <div className="bg-gray-50 dark:bg-[#1E1F20] p-6 rounded-2xl border border-gray-200 dark:border-[#333] shadow-inner transition-colors duration-300">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Selected Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-gray-900 dark:text-white transition-colors duration-300">{selectedModule.score_value ?? '--'}</span>
                  <span className="text-gray-400 dark:text-gray-600 font-bold text-xl">/ 10</span>
                </div>
                <div className={`mt-5 text-[10px] font-bold px-3 py-1.5 rounded-lg border inline-block uppercase tracking-wider ${getScoreColor(selectedModule.grade_label)}`}>
                  {selectedModule.grade_label || 'Not Started'}
                </div>
              </div>

              {selectedModule.score_value !== null && selectedModule.score_value < 5 && (
                <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-2xl">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <AlertCircle size={18}/>
                    <span className="font-bold text-xs uppercase">Action Required</span>
                  </div>
                  <p className="text-xs text-red-400/80 leading-relaxed font-medium">Your score is below the proficiency threshold. We recommend re-taking the module quizzes.</p>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-[#1E1F20] p-6 rounded-2xl border border-gray-200 dark:border-[#333] transition-colors duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-widest transition-colors duration-300">Global Progress</h4>
                  <TrendingUp size={16} className="text-blue-500"/>
                </div>
                <div className="w-full bg-gray-200 dark:bg-[#0c0c0d] h-2.5 rounded-full overflow-hidden border border-gray-300 dark:border-[#333] transition-colors duration-300">
                  <div className="bg-blue-600 h-full w-2/3 shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
                </div>
                <p className="text-[10px] text-gray-500 mt-3 font-bold uppercase tracking-tighter">14 of 20 Modules Completed</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleDetailDashboard;