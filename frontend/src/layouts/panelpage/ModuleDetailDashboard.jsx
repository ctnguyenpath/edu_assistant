import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, BookOpen, ChevronLeft, ChevronRight, 
  AlertCircle, TrendingUp, CheckCircle2, Star 
} from 'lucide-react';

const ModuleDetailDashboard = ({ data }) => {
  // --- 1. GROUPING LOGIC ---
  const groupedData = useMemo(() => {
    if (!data || data.length === 0) return {};
    return data.reduce((acc, item) => {
      const programName = item.program_name || 'General Program';
      if (!acc[programName]) acc[programName] = [];
      acc[programName].push(item);
      return acc;
    }, {});
  }, [data]);

  // --- 2. SELECTION STATE ---
  const [selectedId, setSelectedId] = useState(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);

  // Sync selectedId with the first available module if current selection is lost
  useEffect(() => {
    if (data && data.length > 0 && (!selectedId || !data.find(m => m.module_id === selectedId))) {
      setSelectedId(data[0].module_id);
    }
  }, [data, selectedId]);

  const selectedModule = data ? (data.find(m => m.module_id === selectedId) || data[0]) : null;

  const getScoreColor = (label) => {
    switch (label) {
      case 'Excellence': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Good': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Average': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Fail': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0c0c0d] text-gray-500">
        <div className="text-center">
          <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold uppercase tracking-widest">Map is empty</p>
          <p className="text-sm">Drag modules to your map to view detailed analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0c0c0d] font-sans overflow-hidden text-gray-900 dark:text-gray-200">
      
      {/* 1. CENTER LIST: Grouped Curriculum */}
      <div className="w-80 border-r border-gray-200 dark:border-[#222] overflow-y-auto bg-white dark:bg-[#131314] shrink-0 scrollbar-thin">
        <div className="p-6 border-b border-gray-200 dark:border-[#222] bg-white dark:bg-[#131314] sticky top-0 z-10">
          <h2 className="text-[10px] font-black flex items-center gap-2 uppercase tracking-widest text-gray-400">
            <BookOpen size={14} className="text-blue-500"/> YOUR MAP PATHWAY
          </h2>
        </div>

        {Object.entries(groupedData).map(([program, modules]) => (
          <div key={program} className="mb-2">
            {/* Program Name Header */}
            <div className="px-5 py-2.5 bg-gray-50 dark:bg-[#1c1c1e] border-y border-gray-100 dark:border-[#222]">
              <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                {program}
              </span>
            </div>
            
            {/* Modules within that program */}
            {modules.map((mod) => (
              <div 
                key={mod.module_id}
                onClick={() => setSelectedId(mod.module_id)}
                className={`p-5 cursor-pointer border-b border-gray-100 dark:border-[#222] transition-all relative ${
                  selectedId === mod.module_id 
                    ? 'bg-blue-50 dark:bg-[#1E1F20] border-l-4 border-l-blue-600' 
                    : 'hover:bg-gray-50 dark:hover:bg-[#181819]'
                }`}
              >
                <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100 leading-snug">
                  {mod.topic_name}
                </h3>
                
                {mod.score_value !== null && (
                  <div className={`mt-3 text-[10px] px-2 py-1 rounded-md border font-bold inline-flex items-center gap-1.5 ${getScoreColor(mod.grade_label)}`}>
                    <Trophy size={10} /> {mod.score_value}/100
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* 2. MAIN VIEW: Module Details */}
      {selectedModule && (
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-[#0c0c0d] p-12">
          <div className="max-w-3xl mx-auto animate-fade-in-up">
            
            <div className="flex items-center gap-6 mb-10">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex shrink-0 items-center justify-center font-black text-2xl text-white shadow-xl">
                {selectedModule.module_id}
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">
                  {selectedModule.program_name}
                </div>
                <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-tight">
                  {selectedModule.topic_name}
                </h1>
              </div>
            </div>

            <div className="mb-10 p-6 bg-white dark:bg-[#131314] rounded-2xl border border-gray-200 dark:border-[#333] shadow-sm italic">
              <h4 className="text-[10px] font-bold text-blue-400 uppercase mb-3 flex items-center gap-2">
                <Star size={14}/> Learning Objective
              </h4>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                "Master the core functionalities of {selectedModule.topic_name} to optimize data workflows in the {selectedModule.program_name} track."
              </p>
            </div>

            <div className="bg-white dark:bg-[#131314] p-8 rounded-2xl border border-gray-200 dark:border-[#222] shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                Module Overview
              </h4>
              <div className="space-y-4">
                <div className="p-5 bg-gray-50 dark:bg-[#1c1c1e] rounded-xl border border-gray-200 dark:border-[#333] border-l-4 border-l-green-500">
                  <h5 className="font-bold text-xs mb-1 uppercase tracking-widest text-green-400">Junior Mastery</h5>
                  <p className="text-gray-500 text-sm">Fundamental concepts and basic syntax usage.</p>
                </div>
                <div className="p-5 bg-gray-50 dark:bg-[#1c1c1e] rounded-xl border border-gray-200 dark:border-[#333] border-l-4 border-l-amber-500">
                  <h5 className="font-bold text-xs mb-1 uppercase tracking-widest text-amber-400">Senior Mastery</h5>
                  <p className="text-gray-500 text-sm">Complex implementations and performance tuning.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. RIGHT SIDEBAR: Performance */}
      <div className={`relative border-l border-gray-200 dark:border-[#222] bg-white dark:bg-[#131314] transition-all duration-300 ${isSummaryOpen ? 'w-80' : 'w-12'}`}>
        <button onClick={() => setIsSummaryOpen(!isSummaryOpen)} className="absolute -left-3 top-10 bg-white dark:bg-[#1E1F20] border dark:border-[#333] rounded-full p-1 shadow-xl z-20">
          {isSummaryOpen ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
        </button>

        {isSummaryOpen && (
          <div className="w-full p-8 overflow-y-auto">
            <h2 className="text-xs font-bold flex items-center gap-2 mb-10 uppercase tracking-widest text-gray-500">
              <Trophy size={18} className="text-blue-500"/> Performance
            </h2>
            
            <div className="space-y-8">
              <div className="bg-gray-50 dark:bg-[#1E1F20] p-6 rounded-2xl border border-gray-200 dark:border-[#333]">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Module Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-gray-900 dark:text-white">
                    {selectedModule?.score_value ?? '--'}
                  </span>
                  <span className="text-gray-400 font-bold text-xl">/ 100</span>
                </div>
                <div className={`mt-5 text-[10px] font-bold px-3 py-1.5 rounded-lg border inline-block uppercase tracking-wider ${getScoreColor(selectedModule?.grade_label)}`}>
                  {selectedModule?.grade_label || 'Not Started'}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-[#1E1F20] p-6 rounded-2xl border border-gray-200 dark:border-[#333]">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-400 text-xs uppercase tracking-widest">Global Path Progress</h4>
                  <TrendingUp size={16} className="text-blue-500"/>
                </div>
                <div className="w-full bg-gray-200 dark:bg-[#0c0c0d] h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full w-[45%]"></div>
                </div>
                <p className="text-[10px] text-gray-500 mt-3 font-bold uppercase">
                   {data.length} modules on map
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleDetailDashboard;