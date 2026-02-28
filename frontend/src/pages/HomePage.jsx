import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Sparkles, BookOpen, GraduationCap, Database, Activity, Compass } from 'lucide-react';
import { BUCKET_NAME } from '../config';

const HomePage = ({ onPlayVideo, videos = [] }) => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [programGroups, setProgramGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPrograms, setSelectedPrograms] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH & AGGREGATE DYNAMIC DATA ---
  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const res = await fetch('/data_ways_curriculum.json');
        const data = await res.json();
        
        const groupsMap = {};
        
        data.forEach(item => {
          // 1. Get the Top-Level Group (e.g., "Adult Group")
          const groupName = item.type || 'General';
          const groupId = groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          
          if (!groupsMap[groupId]) {
            groupsMap[groupId] = {
              groupId: groupId,
              title: groupName,
              icon: <Compass className="w-6 h-6 text-blue-500" />,
              programsMap: {} 
            };
          }
          
          // 2. Extract the Program Name from the topic
          const parts = item.topic.split(':');
          const programName = parts.length > 1 ? parts[0].trim() : "General Program";
          const subTopic = parts.length > 1 ? parts[1].trim() : item.topic;
          
          if (!groupsMap[groupId].programsMap[programName]) {
            let IconComponent = <GraduationCap className="w-5 h-5 text-indigo-500" />;
            if (programName.includes('Engineering')) IconComponent = <Database className="w-5 h-5 text-orange-500" />;
            else if (programName.includes('Analytics')) IconComponent = <Activity className="w-5 h-5 text-emerald-500" />;

            groupsMap[groupId].programsMap[programName] = {
              id: programName,
              title: programName,
              icon: IconComponent,
              moduleIds: [], 
              subTopics: [], 
            };
          }
          
          // 3. Add the module to its parent program
          groupsMap[groupId].programsMap[programName].moduleIds.push(item.lesson);
          groupsMap[groupId].programsMap[programName].subTopics.push(subTopic);
        });
        
        // Convert the nested maps back into flat arrays
        const formattedGroups = Object.values(groupsMap).map(g => ({
          ...g,
          programs: Object.values(g.programsMap)
        }));
        
        setProgramGroups(formattedGroups);
      } catch (err) {
        console.error("Failed to load curriculum data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurriculum();
  }, []);

  // --- RESTORE SELECTIONS FROM LOCAL STORAGE ---
  useEffect(() => {
    // Only try to restore after the program groups have successfully loaded
    if (programGroups.length > 0) {
      const savedSelections = localStorage.getItem('homepage_selections');
      if (savedSelections) {
        try {
          const { groupId, programIds } = JSON.parse(savedSelections);
          setSelectedGroup(groupId);
          
          // Match the saved IDs back to the actual program objects
          const restoredPrograms = [];
          programGroups.forEach(group => {
            if (group.groupId === groupId) {
              group.programs.forEach(prog => {
                if (programIds.includes(prog.id)) {
                  restoredPrograms.push(prog);
                }
              });
            }
          });
          
          setSelectedPrograms(restoredPrograms);
        } catch (e) {
          console.error("Failed to restore homepage selections", e);
        }
      }
    }
  }, [programGroups]);

  // --- SAVE SELECTIONS TO LOCAL STORAGE ---
  useEffect(() => {
    // Don't save during the initial loading phase so we don't accidentally overwrite with empty data
    if (!isLoading) {
      localStorage.setItem('homepage_selections', JSON.stringify({
        groupId: selectedGroup,
        programIds: selectedPrograms.map(p => p.id)
      }));
    }
  }, [selectedGroup, selectedPrograms, isLoading]);

  // --- SELECTION LOGIC ---
  const handleToggleProgram = (program, groupId) => {
    // 1. Enforce the "Same Group" rule
    if (selectedGroup && selectedGroup !== groupId) {
      alert("Please select programs from the same learning group.");
      return;
    }

    // 2. Toggle selection
    const isAlreadySelected = selectedPrograms.some(p => p.id === program.id);
    
    if (isAlreadySelected) {
      const newSelection = selectedPrograms.filter(p => p.id !== program.id);
      setSelectedPrograms(newSelection);
      // Reset group lock if they uncheck everything
      if (newSelection.length === 0) setSelectedGroup(null);
    } else {
      setSelectedGroup(groupId);
      setSelectedPrograms([...selectedPrograms, program]);
    }
  };

  // --- NAVIGATION LOGIC ---
  const handleGeneratePath = () => {
    if (selectedPrograms.length === 0) return;
    
    // Flatten all the module IDs from the selected programs into a single array
    const allSelectedModuleIds = selectedPrograms.flatMap(p => p.moduleIds);
    
    // Save to local storage for the Pathway map to read
    localStorage.setItem('pending_pathway', JSON.stringify({
      groupId: selectedGroup,
      modules: allSelectedModuleIds 
    }));
    
    // Directs to the discover/ folder as per new skeleton
    navigate('/discover/pathway');
  };

  return (
    <div className="relative p-8 overflow-y-auto h-full bg-gray-50 dark:bg-[#0A0A0A] transition-colors duration-300 pb-32">
      
      {/* --- HERO / ONBOARDING HEADER --- */}
      <div className="mb-12 bg-white dark:bg-[#1E1F20] rounded-2xl p-8 border border-gray-200 dark:border-[#333] shadow-sm">
        <h1 className="text-4xl font-medium text-gray-900 dark:text-gray-100 mb-4 transition-colors duration-300">
          Design your learning journey
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
          Explore our available programs below. Select the tracks you are interested in, or ask the <strong>Chatbot</strong> in the corner for personalized advice!
        </p>
        <div className="mt-6">
          <button 
            // Fixed the 404 error by pointing this to the dashboard instead of the deleted introduction page
            onClick={() => navigate('/program/dashboard')}
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" /> View My Dashboard
          </button>
        </div>
      </div>
      
      {/* --- PROGRAM SELECTION LIST --- */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="mb-16 space-y-10">
          {programGroups.map((group) => (
            <div key={group.groupId}>
              <div className="flex items-center gap-3 mb-6">
                {group.icon}
                <h2 className="text-2xl font-medium text-gray-800 dark:text-gray-200 transition-colors duration-300">
                  {group.title}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.programs.map((prog) => {
                  const isSelected = selectedPrograms.some(p => p.id === prog.id);
                  const isDisabled = selectedGroup && selectedGroup !== group.groupId;

                  return (
                    <div 
                      key={prog.id}
                      onClick={() => !isDisabled && handleToggleProgram(prog, group.groupId)}
                      className={`
                        p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col h-full
                        ${isSelected 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md transform -translate-y-1' 
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#161718] hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-1'}
                        ${isDisabled ? 'opacity-50 cursor-not-allowed grayscale-[50%] hover:transform-none hover:border-gray-200 dark:hover:border-[#333]' : ''}
                      `}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100 dark:bg-blue-800/50' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            {prog.icon}
                          </div>
                          <h3 className={`text-lg font-bold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-gray-200'}`}>
                            {prog.title}
                          </h3>
                        </div>
                        {isSelected && <Sparkles className="w-6 h-6 text-blue-500" />}
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                          Included Modules ({prog.moduleIds.length})
                        </p>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {prog.subTopics.map((topic, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>{topic}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- FLOATING ACTION BAR --- */}
      {selectedPrograms.length > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white dark:bg-[#1E1F20] border border-gray-200 dark:border-gray-700 shadow-2xl rounded-full px-6 py-4 flex items-center gap-6 z-50 animate-fade-in-up">
          <span className="text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
            {selectedPrograms.length} program{selectedPrograms.length > 1 ? 's' : ''} selected
          </span>
          <button 
            onClick={handleGeneratePath}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-medium transition-colors whitespace-nowrap shadow-lg shadow-blue-500/30"
          >
            Generate learning path
          </button>
        </div>
      )}

      {/* --- EXISTING VIDEO SECTION --- */}
      {videos && videos.length > 0 && (
        <div className="pt-8 border-t border-gray-200 dark:border-[#333] mt-8">
          <h2 className="text-xl text-gray-800 dark:text-gray-200 mb-6 font-medium transition-colors duration-300">
            Available in {BUCKET_NAME}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((clip) => (
              <div 
                key={clip.filename} 
                onClick={() => onPlayVideo(clip)} 
                className="group bg-white dark:bg-[#1E1F20] border border-gray-200 dark:border-[#333] rounded-2xl overflow-hidden hover:ring-2 hover:ring-blue-500/30 dark:hover:ring-gray-600 transition-all cursor-pointer shadow-sm dark:shadow-none"
              >
                <div className="h-40 bg-gray-200 dark:bg-gray-800 relative flex items-center justify-center transition-colors duration-300">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 dark:from-black/60 to-transparent"></div>
                  <Play className="w-12 h-12 text-white opacity-90 group-hover:scale-110 transition-transform relative z-10" />
                </div>
                
                <div className="p-4">
                  <h3 className="text-gray-900 dark:text-gray-200 font-medium truncate transition-colors duration-300">
                    {clip.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-colors duration-300">
                    {clip.size}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
    </div>
  );
};

export default HomePage;