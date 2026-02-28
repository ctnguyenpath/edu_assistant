import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
import axios from 'axios';
import { 
  BookOpen, PlayCircle, Trophy, Compass, 
  CheckCircle2, Clock, MapIcon, ChevronRight 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ProgramDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Hook to detect navigation/route changes
  const { user } = useAuth();

  const [syllabusData, setSyllabusData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 1. Move enrolled IDs to State so we can trigger updates manually
  const [enrolledModuleIds, setEnrolledModuleIds] = useState([]);

  // Helper function to sync with LocalStorage
  const syncPathway = () => {
    const saved = localStorage.getItem('dataways_customNodes_v2');
    if (saved) {
      try {
        const nodes = JSON.parse(saved);
        setEnrolledModuleIds(nodes.map(n => n.id));
      } catch (e) {
        console.error("Error parsing pathway:", e);
        setEnrolledModuleIds([]);
      }
    } else {
      setEnrolledModuleIds([]);
    }
  };

  // 2. Sync Pathway whenever the user visits this page (detecting location change)
  useEffect(() => {
    syncPathway();
  }, [location.pathname]); 

  // 3. Fetch Curriculum and User Performance
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch static curriculum
        const curRes = await fetch('/data_ways_curriculum.json');
        const curData = await curRes.json();
        setSyllabusData(curData);

        // Fetch user performance from backend
        const studentId = user?.id || 1; 
        const perfRes = await axios.get(`http://localhost:8801/api/student/${studentId}/performance`);
        setPerformanceData(perfRes.data);

      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // 4. Process and Group the Enrolled Modules
  const groupedModules = useMemo(() => {
    if (!syllabusData.length) return {};

    // Filter to only show modules the user selected in the Pathway
    const enrolled = syllabusData.filter(mod => enrolledModuleIds.includes(mod.lesson));

    // Group them by their Program Name
    return enrolled.reduce((acc, item) => {
      const parts = item.topic.split(':');
      const programName = parts.length > 1 ? parts[0].trim() : (item.type || 'General Program');
      const moduleName = parts.length > 1 ? parts[1].trim() : item.topic;

      if (!acc[programName]) acc[programName] = [];
      
      const perf = performanceData.find(p => p.module_id === item.lesson);
      
      acc[programName].push({
        id: item.lesson,
        title: moduleName,
        track: item.type || 'General',
        score: perf?.score_value ?? null,
        grade: perf?.grade_label ?? null
      });

      return acc;
    }, {});
  }, [syllabusData, performanceData, enrolledModuleIds]);

  // UI Helpers
  const getStatusConfig = (score) => {
    if (score === null) return { color: 'text-gray-500 bg-gray-100 dark:bg-[#1E1F20]', icon: <Clock size={14} />, text: 'Not Started' };
    if (score >= 90) return { color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400', icon: <CheckCircle2 size={14} />, text: 'Completed' };
    return { color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400', icon: <PlayCircle size={14} />, text: 'In Progress' };
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-[#0A0A0A] p-8 md:p-12 transition-colors duration-300">
      
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
          My Learning Dashboard
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
          Welcome back, {user?.name || 'Student'}. Here is your active curriculum.
        </p>
      </div>

      {/* Empty State */}
      {enrolledModuleIds.length === 0 ? (
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#131314] rounded-3xl border border-gray-200 dark:border-[#333] p-12 text-center shadow-sm">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Compass className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Your pathway is empty</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
            You haven't confirmed any modules for your learning journey yet. Head over to the Pathway Map to design your custom curriculum.
          </p>
          <button 
            onClick={() => navigate('/discover/pathway')}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/30"
          >
            <MapIcon size={18} /> Go to Pathway Map
          </button>
        </div>
      ) : (
        /* Enrolled Modules Grid */
        <div className="max-w-6xl mx-auto space-y-12 pb-20">
          {Object.entries(groupedModules).map(([programName, modules]) => (
            <div key={programName} className="animate-fade-in-up">
              
              <div className="flex items-center gap-3 mb-6 border-b border-gray-200 dark:border-[#333] pb-4">
                <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-500/20">
                  <BookOpen size={20} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  {programName}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((mod) => {
                  const status = getStatusConfig(mod.score);
                  return (
                    <div 
                      key={mod.id}
                      onClick={() => navigate(`/program/module/${mod.id}`)}
                      className="group bg-white dark:bg-[#131314] rounded-2xl border border-gray-200 dark:border-[#333] hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
                    >
                      <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1.5 ${status.color}`}>
                            {status.icon} {status.text}
                          </span>
                          {mod.score !== null && (
                            <span className="flex items-center gap-1 text-xs font-black text-gray-900 dark:text-white bg-gray-100 dark:bg-[#1E1F20] px-2 py-1 rounded-md">
                              <Trophy size={12} className="text-amber-500"/> {mod.score}
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug mb-2 group-hover:text-blue-500 transition-colors">
                          {mod.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                          Module {mod.id} • {mod.track}
                        </p>
                      </div>

                      <div className="px-6 py-4 bg-gray-50 dark:bg-[#1c1c1e] border-t border-gray-100 dark:border-[#222] flex items-center justify-between mt-auto">
                        <div className="flex-1 mr-4">
                          <div className="h-1.5 w-full bg-gray-200 dark:bg-[#333] rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${mod.score >= 90 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                              style={{ width: `${mod.score || 0}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-blue-600 dark:text-blue-400 text-sm font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Enter <ChevronRight size={16} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgramDashboard;