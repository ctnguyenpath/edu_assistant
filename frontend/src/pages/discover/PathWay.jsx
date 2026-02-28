import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Star, GripHorizontal, Network, Undo2, ListPlus, 
  ChevronUp, X, Move, Trophy, LayoutDashboard, Map as MapIcon, 
  ChevronLeft, RefreshCw, Trash2 
} from 'lucide-react';
import axios from 'axios';

import ModuleDetailsPanel from '../../layouts/panelpage/ModuleDetailsPanel';
import ModuleListPanel from '../../layouts/panelpage/ModuleListPanel';
import ModuleDetailDashboard from "../../layouts/panelpage/ModuleDetailDashboard";
import PerformancePanel from '../../layouts/panelpage/PerformancePanel';
import { useAuth } from '../../contexts/AuthContext';

// Sidebar Collapsed State
const CollapsedSidebar = ({ title, icon, onClick, isRightSide }) => (
  <div 
    onClick={onClick}
    className={`w-12 shrink-0 h-full bg-gray-50 dark:bg-[#131314] hover:bg-gray-100 dark:hover:bg-[#1E1F20] border-gray-200 dark:border-[#333] flex flex-col items-center py-6 cursor-pointer transition-colors relative z-20 ${isRightSide ? 'border-l' : 'border-r'}`}
  >
    <div className="text-blue-500 mb-8">{icon}</div>
    <div 
      className="text-gray-500 dark:text-gray-400 font-bold text-xs tracking-widest whitespace-nowrap" 
      style={{ writingMode: 'vertical-rl', transform: isRightSide ? '' : 'rotate(180deg)' }}
    >
      {title}
    </div>
  </div>
);

const PathWay = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const pathWayRef = useRef(null);
  const mapContainerRef = useRef(null);
  const tempLineRef = useRef(null);

  // --- 1. STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token')); 

  const [syllabusData, setSyllabusData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [viewMode, setViewMode] = useState('canvas'); 
  const [activeLesson, setActiveLesson] = useState(null);
  const [openPanels, setOpenPanels] = useState({ list: true, details: true, performance: true });
  
  const [activeProgramFilter, setActiveProgramFilter] = useState('All');
  
  const [customNodes, setCustomNodes] = useState(() => {
    const saved = localStorage.getItem('dataways_customNodes_v2');
    return saved !== null ? JSON.parse(saved) : [];
  });
  
  // NEW EXPLICIT STATE: Controls if we are viewing the default map or a custom canvas
  const [isSandboxMode, setIsSandboxMode] = useState(() => {
    const saved = localStorage.getItem('dataways_customNodes_v2');
    return saved && JSON.parse(saved).length > 0;
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [drawingConnection, setDrawingConnection] = useState(null);
  const [isMapDragOver, setIsMapDragOver] = useState(false);

  const [topHeight, setTopHeight] = useState(() => {
    const saved = localStorage.getItem('dataways_panelHeight');
    return saved !== null ? parseFloat(saved) : 55;
  });
  const [isDraggingHeight, setIsDraggingHeight] = useState(false);

  const [listPanelWidth, setListPanelWidth] = useState(() => {
    const saved = localStorage.getItem('dataways_listWidth');
    return saved !== null ? parseInt(saved, 10) : 320; 
  });
  const [isResizingList, setIsResizingList] = useState(false);

  const customPathIds = useMemo(() => customNodes.map(n => n.id), [customNodes]);

  const hasSelectedPrograms = useMemo(() => {
    const saved = localStorage.getItem('pending_pathway');
    if (!saved) return false;
    try {
      const parsed = JSON.parse(saved);
      return parsed.modules && parsed.modules.length > 0;
    } catch (e) {
      return false;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dataways_customNodes_v2', JSON.stringify(customNodes));
  }, [customNodes]);

  // --- 2. INITIALIZE FROM HOMEPAGE SELECTIONS ---
  useEffect(() => {
    const pendingStr = localStorage.getItem('pending_pathway');
    if (pendingStr) {
      try {
        const pendingData = JSON.parse(pendingStr);
        if (pendingData.modules && pendingData.modules.length > 0 && customNodes.length === 0 && !isSandboxMode) {
          const suggestedNodes = pendingData.modules.map((id, index) => ({
            id,
            x: 250 + (index % 3) * 280, 
            y: 250 + Math.floor(index / 3) * 160,
            parentIds: index > 0 ? [pendingData.modules[index - 1]] : ['START'] 
          }));
          setCustomNodes(suggestedNodes);
          setIsSandboxMode(true);
          setHasUnsavedChanges(true);
        }
      } catch (e) {
        console.error("Error parsing pending pathway", e);
      }
    }
  }, []); // Run only on mount

  // --- 3. FETCH DATA ---
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const curRes = await fetch('/data_ways_curriculum.json');
      const curData = await curRes.json();
      setSyllabusData(curData);

      if (isLoggedIn) {
        const perfRes = await axios.get('http://localhost:8801/api/student/1/performance');
        setPerformanceData(perfRes.data);
      }

      const savedId = localStorage.getItem('dataways_activeLesson');
      const initial = savedId !== null ? curData.find(l => l.lesson === parseInt(savedId)) || curData[0] : curData[0];
      setActiveLesson(initial);
    } catch (err) {
      console.error("Failed to load initial data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchData(); }, [isLoggedIn]);
  useEffect(() => { if (activeLesson) localStorage.setItem('dataways_activeLesson', activeLesson.lesson.toString()); }, [activeLesson]);

  // --- 4. DATA FILTERING LOGIC ---
  const baseSelectedNodes = useMemo(() => {
    if (!syllabusData.length) return [];
    const saved = localStorage.getItem('pending_pathway');
    const selectedIds = saved ? JSON.parse(saved).modules || [] : [];
    return syllabusData.filter(mod => selectedIds.length === 0 || selectedIds.includes(mod.lesson));
  }, [syllabusData]);

  const programOptions = useMemo(() => {
    const programs = new Set(baseSelectedNodes.map(m => m.topic.split(':')[0].trim() || 'General'));
    return ['All', ...Array.from(programs)];
  }, [baseSelectedNodes]);

  const standardNodes = useMemo(() => {
    if (activeProgramFilter === 'All') return baseSelectedNodes;
    return baseSelectedNodes.filter(mod => {
      const prog = mod.topic.split(':')[0].trim() || 'General';
      return prog === activeProgramFilter;
    });
  }, [baseSelectedNodes, activeProgramFilter]);

  const dashboardData = useMemo(() => {
    if (!hasSelectedPrograms) return []; 
    return standardNodes
      .filter(mod => !isSandboxMode || customPathIds.includes(mod.lesson))
      .map(mod => {
        const perf = isLoggedIn ? performanceData.find(p => p.module_id === mod.lesson) : null;
        const parts = mod.topic.split(':');
        return {
          module_id: mod.lesson,
          program_name: parts.length > 1 ? parts[0].trim() : (mod.type || 'General'),
          topic_name: parts.length > 1 ? parts[1].trim() : mod.topic,
          track: mod.type || 'General',
          score_value: perf?.score_value ?? null,
          grade_label: perf?.grade_label ?? null
        };
      });
  }, [standardNodes, performanceData, isLoggedIn, customPathIds, isSandboxMode, hasSelectedPrograms]);

  const handleConfirmPath = async () => {
    try {
      for (const node of customNodes) {
        const parents = node.parentIds || [];
        for (const parentId of parents) {
          if (parentId !== 'START') {
            await axios.post('http://localhost:8801/api/student/1/path/connect', {
              source_module_id: parentId,
              target_module_id: node.id
            });
          }
        }
      }
      alert("Success! Your learning pathway has been saved.");
      setHasUnsavedChanges(false); 
      fetchData(); 
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message;
      alert(`Backend Error: ${errorMsg}\n\nMake sure your PostgreSQL database has all the module rows inserted!`);
    }
  };

  const getScoreColor = (label) => {
    if (label === 'Excellence') return 'border-emerald-500 text-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
    if (label === 'Good') return 'border-blue-500 text-blue-500 bg-blue-500/10';
    if (label === 'Average') return 'border-amber-500 text-amber-500 bg-amber-500/10';
    if (label === 'Fail') return 'border-red-500 text-red-500 bg-red-500/10';
    return 'border-gray-300 dark:border-[#333] text-gray-500 bg-white dark:bg-[#1E1F20]';
  };

  const currentPerf = isLoggedIn ? performanceData.find(p => p.module_id === activeLesson?.lesson) : null;

  // --- NEW: BLANK CANVAS & RESET CONTROLS ---
  const handleClearCanvas = () => {
    if (window.confirm("Clear the entire canvas and start from a blank page?")) {
      setCustomNodes([]);
      setIsSandboxMode(true); // Forces Sandbox mode so it renders blank
      setHasUnsavedChanges(true); 
    }
  };

  const handleRestoreRecommended = () => {
    if (window.confirm("Discard your custom canvas and restore the recommended path?")) {
      setCustomNodes([]);
      setIsSandboxMode(false); // Returns to default map rendering
      setHasUnsavedChanges(false); 
    }
  };

  // --- 5. HTML5 DRAG & DROP LOGIC ---
  const handleDragStart = (e, lessonId) => {
    e.dataTransfer.setData('lessonId', lessonId.toString());
    e.dataTransfer.effectAllowed = 'copyMove';
    // Removed custom ghost drag image so it keeps the node's natural shape
  };
  
  const handleMapDragOver = (e) => { e.preventDefault(); if (!isMapDragOver) setIsMapDragOver(true); };
  const handleMapDragLeave = (e) => { e.preventDefault(); setIsMapDragOver(false); };
  
  const handleMapDrop = (e) => {
    e.preventDefault();
    setIsMapDragOver(false);
    const draggedLessonId = parseInt(e.dataTransfer.getData('lessonId'), 10);
    if (isNaN(draggedLessonId)) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const dropX = e.clientX - rect.left + mapContainerRef.current.scrollLeft;
    const dropY = e.clientY - rect.top + mapContainerRef.current.scrollTop;
    
    setIsSandboxMode(true); // Force sandbox mode if they drop a node
    
    setCustomNodes(prev => {
      const existingNode = prev.find(n => n.id === draggedLessonId);
      if (existingNode) return prev.map(n => n.id === draggedLessonId ? { ...n, x: dropX, y: dropY } : n);
      
      let closestId = 'START';
      let minDistance = Math.hypot(dropX - 80, dropY - 250); 
      prev.forEach(n => {
        const dist = Math.hypot(dropX - n.x, dropY - n.y);
        if (dist < minDistance) { minDistance = dist; closestId = n.id; }
      });
      return [...prev, { id: draggedLessonId, x: dropX, y: dropY, parentIds: [closestId] }];
    });
    setHasUnsavedChanges(true); 
  };

  const removeCustomPathItem = (idToRemove) => {
    setCustomNodes(prev => {
      const nodeToRemove = prev.find(n => n.id === idToRemove);
      if(!nodeToRemove) return prev;
      return prev.filter(n => n.id !== idToRemove).map(n => {
         const parents = n.parentIds || [];
         if (parents.includes(idToRemove)) {
            const newParents = new Set([...parents.filter(id => id !== idToRemove), ...(nodeToRemove.parentIds || [])]);
            return { ...n, parentIds: Array.from(newParents) };
         }
         return n;
      });
    });
    setHasUnsavedChanges(true); 
  };

  const toggleNodeInPath = (lessonId) => {
    if (!isSandboxMode) setIsSandboxMode(true); // Enter sandbox mode if interacting with list checkboxes
    
    if (customPathIds.includes(lessonId)) {
      removeCustomPathItem(lessonId);
    } else {
      setCustomNodes(prev => [...prev, { id: lessonId, x: 500, y: 300, parentIds: ['START'] }]);
      setHasUnsavedChanges(true);
    }
  };

  // --- 6. LINE DRAWING LOGIC ---
  const handleConnectorMouseDown = (e, sourceId, x, y) => { e.stopPropagation(); setDrawingConnection({ sourceId, startX: x, startY: y }); };
  const handleMapMouseMove = (e) => {
    if (drawingConnection && mapContainerRef.current && tempLineRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left + mapContainerRef.current.scrollLeft;
      const currentY = e.clientY - rect.top + mapContainerRef.current.scrollTop;
      const startX = drawingConnection.startX;
      const startY = drawingConnection.startY;
      const cp1x = startX + (currentX - startX) / 2;
      const d = `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp1x} ${currentY}, ${currentX} ${currentY}`;
      tempLineRef.current.setAttribute('d', d);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => { if (drawingConnection) setDrawingConnection(null); };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [drawingConnection]);

  const createsCycle = (startId, targetId, nodes) => {
    if (startId === targetId) return true;
    let visited = new Set();
    let stack = [startId];
    
    while(stack.length > 0) {
       let current = stack.pop();
       if (current === targetId) return true;
       if (!visited.has(current)) {
          visited.add(current);
          const currNode = nodes.find(n => n.id === current);
          if (currNode && currNode.parentIds) stack.push(...currNode.parentIds);
       }
    }
    return false;
  };

  const handleNodeMouseUp = (e, targetId) => {
    if (drawingConnection) {
      e.stopPropagation();
      const sourceId = drawingConnection.sourceId;
      if (sourceId !== targetId) {
        if (!createsCycle(sourceId, targetId, customNodes)) {
          setCustomNodes(prev => prev.map(n => {
            if (n.id === targetId) {
              const currentParents = n.parentIds || [];
              if (!currentParents.includes(sourceId)) {
                setHasUnsavedChanges(true); 
                return { ...n, parentIds: [...currentParents, sourceId] };
              }
            }
            return n;
          }));
        } else {
          alert("Circular dependency detected! A module cannot require itself.");
        }
      }
      setDrawingConnection(null);
    }
  };

  const removeConnection = (childId, parentIdToRemove) => {
    setCustomNodes(prev => prev.map(n => {
      if (n.id === childId) return { ...n, parentIds: (n.parentIds || []).filter(pid => pid !== parentIdToRemove) };
      return n;
    }));
    setHasUnsavedChanges(true); 
  };

  // --- 7. RESIZER LOGIC ---
  const handleHeightMouseDown = (e) => { setIsDraggingHeight(true); e.preventDefault(); };
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingHeight) {
        const newHeight = (e.clientY / window.innerHeight) * 100;
        if (newHeight > 15 && newHeight < 85) setTopHeight(newHeight);
      }
      if (isResizingList && pathWayRef.current) {
        const containerLeft = pathWayRef.current.getBoundingClientRect().left;
        let newWidth = e.clientX - containerLeft;
        if (newWidth >= 200 && newWidth <= 600) setListPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => { setIsDraggingHeight(false); setIsResizingList(false); };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  }, [isDraggingHeight, isResizingList]);

  // --- 8. MAP GEOMETRY & PATHS ---
  const getDefaultMapCoordinates = (col = 0, row = 0) => ({ x: 250 + (col * 280), y: 250 + (row * 160) });
  
  const mapBounds = useMemo(() => {
    if (isSandboxMode) {
      const maxX = Math.max(...customNodes.map(n => n.x), 1000);
      const maxY = Math.max(...customNodes.map(n => n.y), 500);
      return { width: maxX + 400, height: maxY + 400 };
    }
    const maxDefaultCol = standardNodes.length > 0 ? Math.max(...standardNodes.map(l => l.col || 0)) : 0;
    return { width: (maxDefaultCol * 280) + 600, height: '100%' };
  }, [isSandboxMode, customNodes, standardNodes]);

  const paths = useMemo(() => {
    let generatedPaths = [];
    if (isSandboxMode) {
      customNodes.forEach(node => {
        const parents = node.parentIds || [];
        parents.forEach(pId => {
          let start = pId === 'START' ? { x: 80, y: 250 } : customNodes.find(n => n.id === pId);
          if (start) {
            const cp1x = start.x + (node.x - start.x) / 2;
            generatedPaths.push({ 
              childId: node.id, parentId: pId, 
              pathData: `M ${start.x} ${start.y} C ${cp1x} ${start.y}, ${cp1x} ${node.y}, ${node.x} ${node.y}`, 
              isCustom: true 
            });
          }
        });
      });
    } else {
      const rootNodes = standardNodes.filter(n => {
        return !standardNodes.some(other => other.connectsTo?.includes(n.lesson));
      });

      rootNodes.forEach(root => {
        const targetCoord = getDefaultMapCoordinates(root.col, root.row);
        const startX = 80;
        const startY = 250;
        const cp1x = startX + (targetCoord.x - startX) / 2;
        generatedPaths.push({ 
          childId: root.lesson, parentId: 'START', 
          pathData: `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp1x} ${targetCoord.y}, ${targetCoord.x} ${targetCoord.y}`, 
          isCustom: false 
        });
      });

      standardNodes.forEach(lesson => {
        lesson.connectsTo?.forEach(targetId => {
          const target = standardNodes.find(l => l.lesson === targetId);
          if (target) {
            const current = getDefaultMapCoordinates(lesson.col, lesson.row);
            const targetCoord = getDefaultMapCoordinates(target.col, target.row);
            const cp1x = current.x + (targetCoord.x - current.x) / 2;
            generatedPaths.push({ 
              childId: targetId, parentId: lesson.lesson, 
              pathData: `M ${current.x} ${current.y} C ${cp1x} ${current.y}, ${cp1x} ${targetCoord.y}, ${targetCoord.x} ${targetCoord.y}`, 
              isCustom: false 
            });
          }
        });
      });
    }
    return generatedPaths;
  }, [isSandboxMode, customNodes, standardNodes]);

  const nodesToRender = isSandboxMode 
    ? customNodes.map(n => {
        const lessonData = syllabusData.find(l => l.lesson === n.id);
        return lessonData ? { ...lessonData, customX: n.x, customY: n.y } : null;
      }).filter(Boolean)
    : standardNodes;

  // --- 9. RENDER ---
  if (loadingData || !activeLesson) return <div className="h-full flex items-center justify-center bg-white dark:bg-[#0A0A0A]"><RefreshCw className="animate-spin text-blue-500" /></div>;

  return (
    <div ref={pathWayRef} className="flex flex-row h-full w-full overflow-hidden font-sans bg-gray-50 dark:bg-[#0A0A0A] relative text-gray-800 dark:text-gray-200 transition-colors duration-300">
      
      <style>{`
        .course-map-scroll::-webkit-scrollbar { height: 12px; width: 12px; }
        .dark .course-map-scroll::-webkit-scrollbar-track { background: #131314; }
        .dark .course-map-scroll::-webkit-scrollbar-thumb { background-color: #333; border-radius: 20px; border: 3px solid #131314; }
        .dark .bg-grid-pattern { background-size: 50px 50px; background-image: radial-gradient(circle, #222 1px, transparent 1px); }
        .course-map-scroll::-webkit-scrollbar-track { background: #f9fafb; }
        .course-map-scroll::-webkit-scrollbar-thumb { background-color: #d1d5db; border-radius: 20px; border: 3px solid #f9fafb; }
        .bg-grid-pattern { background-size: 50px 50px; background-image: radial-gradient(circle, #e5e7eb 1px, transparent 1px); }
      `}</style>

      {/* --- LEFT SIDEBAR --- */}
      {openPanels.list ? (
        <div style={{ width: `${listPanelWidth}px` }} className="shrink-0 h-full border-r border-gray-200 dark:border-[#333] flex flex-col bg-white dark:bg-[#0c0c0d] relative z-20 transition-all duration-300">
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <ModuleListPanel 
              syllabusData={syllabusData} 
              customPath={customPathIds} 
              handleDragStart={handleDragStart} 
              onClose={() => setOpenPanels(p => ({...p, list: false}))} 
              onSelectModule={setActiveLesson}
              toggleNodeInPath={toggleNodeInPath}
            />
          </div>
          {isLoggedIn && (
            <PerformancePanel 
              isOpen={openPanels.performance} 
              onToggle={() => setOpenPanels(p => ({...p, performance: !p.performance}))}
              activeLesson={activeLesson}
              currentPerf={currentPerf}
              getScoreColor={getScoreColor}
            />
          )}
          <div onMouseDown={(e) => { setIsResizingList(true); e.preventDefault(); }} className="absolute top-0 right-[-4px] w-2 h-full cursor-col-resize hover:bg-blue-500/50 z-50" />
        </div>
      ) : (
        <CollapsedSidebar title="Curriculum Modules" icon={<ListPlus size={20}/>} onClick={() => setOpenPanels(p => ({...p, list: true}))} />
      )}
      
      <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-[#131314] relative z-10 min-w-0 transition-colors duration-300">
        
        {/* --- TOP NAV OVERLAY --- */}
        <div className="absolute top-6 right-6 z-50 flex gap-3 items-center">
          
          {viewMode === 'canvas' && hasSelectedPrograms && (
            <>
              <div className="relative group shadow-sm mr-2">
                <select
                  value={activeProgramFilter}
                  onChange={(e) => setActiveProgramFilter(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-white dark:bg-[#1E1F20] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-[#333] rounded-xl text-xs font-bold transition-all outline-none cursor-pointer"
                >
                  {programOptions.map(prog => (
                    <option key={prog} value={prog}>{prog === 'All' ? 'View All Programs' : prog}</option>
                  ))}
                </select>
                <ChevronUp size={12} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-180 pointer-events-none text-gray-400" />
              </div>

              {/* --- NEW BUTTON CONTROLS --- */}
              {isSandboxMode ? (
                <>
                  <button onClick={handleRestoreRecommended} className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#1E1F20] dark:hover:bg-[#333] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#333] rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm">
                    <Undo2 size={14} /> Recommended Path
                  </button>
                  <button onClick={handleClearCanvas} className="px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm">
                    <Trash2 size={14} /> Clear Canvas
                  </button>
                </>
              ) : (
                <button onClick={() => setIsSandboxMode(true)} className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm">
                  <Move size={14} /> Build Custom Path
                </button>
              )}
            </>
          )}

          <button 
            onClick={() => setViewMode(viewMode === 'canvas' ? 'dashboard' : 'canvas')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all"
          >
            {viewMode === 'canvas' ? <><LayoutDashboard size={14} /> Detail Course</> : <><MapIcon size={14} /> Back to Map</>}
          </button>
        </div>

        {viewMode === 'dashboard' ? (
          <div className="h-full w-full animate-fade-in bg-white dark:bg-[#0c0c0d]">
             <ModuleDetailDashboard data={dashboardData} />
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden relative">
            
            {isSandboxMode && hasUnsavedChanges && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-up">
                {!isLoggedIn ? (
                  <div className="bg-white dark:bg-[#1E1F20] border border-blue-200 dark:border-blue-900 shadow-2xl rounded-2xl p-4 flex items-center gap-6">
                    <div><p className="font-bold text-gray-900 dark:text-white">Unsaved Pathway</p><p className="text-gray-500 text-xs font-medium">Log in to save this journey.</p></div>
                    <button onClick={() => navigate('/login')} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg">Login to Save</button>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#1E1F20] border border-green-200 dark:border-green-900 shadow-2xl rounded-2xl p-4 flex items-center gap-6">
                    <div><p className="font-bold text-gray-900 dark:text-white">Unsaved Changes</p><p className="text-gray-500 text-xs font-medium">Verify your connections, then save.</p></div>
                    <button onClick={handleConfirmPath} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-colors">Confirm & Save Path</button>
                  </div>
                )}
              </div>
            )}

            <div style={{ height: openPanels.details && hasSelectedPrograms ? `${topHeight}%` : '100%' }} className="relative flex-shrink-0 z-10 flex flex-col min-h-[200px] transition-all duration-300">
              <div className="absolute top-0 left-0 p-6 flex items-center gap-4 z-30 pointer-events-none">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 backdrop-blur-md shadow-sm ${isSandboxMode ? 'bg-green-600/10 border-green-500/40 text-green-500' : 'bg-blue-600/10 border-blue-500/40 text-blue-500'}`}>
                  <Network className="w-6 h-6"/>
                </div>
                <div>
                  <h2 className="text-gray-900 dark:text-white font-black text-lg leading-none mb-1 uppercase tracking-tight">{isSandboxMode ? "Sandbox Mode" : "Standard Pathway"}</h2>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{isSandboxMode ? "Build from scratch" : "Recommended Learning Order"}</p>
                </div>
              </div>

              <div ref={mapContainerRef} className={`flex-1 overflow-auto relative course-map-scroll ${isSandboxMode ? 'bg-grid-pattern' : ''} ${drawingConnection ? 'cursor-crosshair' : ''}`} onDragOver={handleMapDragOver} onDrop={handleMapDrop} onMouseMove={handleMapMouseMove}>
                
                <div className={`relative z-10 transition-all duration-500 ${!hasSelectedPrograms ? 'pointer-events-none select-none' : ''}`} style={{ width: `${mapBounds.width}px`, height: `${mapBounds.height}px`, minHeight: '100%' }}>
                  <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-0">
                    {paths.map((p, i) => (
                      <g key={i} className={p.isCustom ? "pointer-events-auto cursor-pointer" : ""} onClick={() => p.isCustom && removeConnection(p.childId, p.parentId)}>
                        {p.isCustom && <path d={p.pathData} fill="none" stroke="transparent" strokeWidth="15" />}
                        <path 
                          d={p.pathData} 
                          fill="none" 
                          stroke={!hasSelectedPrograms ? "#9ca3af" : (isSandboxMode ? "#10b981" : "#3b82f6")} 
                          strokeWidth="3" 
                          className={`stroke-opacity-50 dark:stroke-opacity-30 ${p.isCustom ? "hover:stroke-red-500 hover:stroke-opacity-80 transition-all duration-200" : ""}`} 
                          strokeDasharray={!hasSelectedPrograms ? "8 8" : (p.isCustom ? "10 5" : "none")} 
                        />
                      </g>
                    ))}
                    {drawingConnection && <path ref={tempLineRef} d="" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="8 4" />}
                  </svg>

                  {/* START NODE (NODE 0) */}
                  <div className="absolute z-20" style={{ left: '80px', top: '250px', transform: 'translate(-50%, -50%)' }}>
                    <div className={`relative w-16 h-16 transition-all duration-300 border-2 rounded-2xl flex items-center justify-center font-black text-xl pointer-events-none
                      ${!hasSelectedPrograms 
                        ? 'border-dashed border-gray-400 text-gray-400 bg-transparent shadow-none' 
                        : 'border-gray-600 dark:border-gray-500 bg-gray-900 text-white shadow-md'}`}
                    >
                      0
                      {isSandboxMode && hasSelectedPrograms && (
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full cursor-crosshair pointer-events-auto shadow-sm hover:scale-125 transition-transform" onMouseDown={(e) => handleConnectorMouseDown(e, 'START', 80, 250)} />
                      )}
                    </div>
                    <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-32 text-center pointer-events-none">
                       <p className={`text-[10px] font-bold uppercase ${!hasSelectedPrograms ? 'text-gray-400' : 'text-gray-500'}`}>Path Start</p>
                    </div>
                  </div>

                  {/* COURSE MODULE NODES */}
                  {nodesToRender.map((lesson) => {
                    const isActive = activeLesson?.lesson === lesson.lesson;
                    const perf = isLoggedIn ? performanceData.find(p => p.module_id === lesson.lesson) : null;
                    const { x, y } = isSandboxMode ? { x: lesson.customX, y: lesson.customY } : getDefaultMapCoordinates(lesson.col, lesson.row);
                    
                    return (
                      <div 
                        key={lesson.lesson} 
                        className={`absolute z-20 ${isSandboxMode && hasSelectedPrograms ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`} 
                        style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }} 
                        onClick={() => hasSelectedPrograms && setActiveLesson(lesson)} 
                        onMouseUp={(e) => hasSelectedPrograms && handleNodeMouseUp(e, lesson.lesson)}
                        draggable={isSandboxMode && hasSelectedPrograms}
                        onDragStart={(e) => isSandboxMode && hasSelectedPrograms && handleDragStart(e, lesson.lesson)}
                        onDragEnd={(e) => {
                          if (isSandboxMode && hasSelectedPrograms && e.dataTransfer.dropEffect === 'none') {
                            removeCustomPathItem(lesson.lesson);
                          }
                        }}
                      >
                        <div className={`relative w-16 h-16 group transition-all duration-300 border-2 rounded-2xl flex items-center justify-center font-black text-xl pointer-events-none 
                          ${isActive && hasSelectedPrograms ? 'scale-110 shadow-lg' : 'hover:scale-105'} 
                          ${!hasSelectedPrograms 
                            ? 'border-dashed border-gray-400 text-gray-400 bg-transparent shadow-none' 
                            : getScoreColor(perf?.grade_label)}`}
                        >
                          {lesson.lesson}

                          {isSandboxMode && hasSelectedPrograms && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); 
                                removeCustomPathItem(lesson.lesson);
                              }}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md hover:scale-110 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-auto"
                            >
                              <X size={12} strokeWidth={3} />
                            </button>
                          )}

                          {isSandboxMode && hasSelectedPrograms && (
                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full cursor-crosshair pointer-events-auto shadow-sm hover:scale-125 transition-transform" onMouseDown={(e) => handleConnectorMouseDown(e, lesson.lesson, x, y)} />
                          )}
                        </div>
                        <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-32 text-center pointer-events-none">
                           <p className={`text-[10px] font-bold uppercase ${!hasSelectedPrograms ? 'text-gray-400' : (isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500')}`}>
                             {lesson.topic}
                           </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {openPanels.details && hasSelectedPrograms && (
              <div onMouseDown={handleHeightMouseDown} className="h-1.5 flex-shrink-0 bg-gray-200 dark:bg-[#1E1F20] hover:bg-blue-500 cursor-row-resize flex items-center justify-center z-40 border-y border-gray-300 dark:border-[#333] transition-colors">
                <GripHorizontal className="text-gray-400 dark:text-gray-700 w-4 h-4" />
              </div>
            )}

            {openPanels.details && hasSelectedPrograms && (
              <div className="flex-1 w-full bg-white dark:bg-[#0c0c0d] overflow-hidden relative">
                <ModuleDetailsPanel activeLesson={activeLesson} isCustomizing={isSandboxMode} customPath={customPathIds} removeCustomPathItem={removeCustomPathItem} onClose={() => setOpenPanels(p => ({...p, details: false}))} />
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default PathWay;