import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Star, GripHorizontal, Network, RefreshCw, Undo2, ListPlus, 
  ChevronUp, X, Move, Trophy, LayoutDashboard, Map as MapIcon, 
  ChevronLeft 
} from 'lucide-react';
import axios from 'axios';

import ModuleDetailsPanel from '../../layouts/panelpage/ModuleDetailsPanel';
import ModuleListPanel from '../../layouts/panelpage/ModuleListPanel';
import ModuleDetailDashboard from "../../layouts/panelpage/ModuleDetailDashboard";
import PerformancePanel from '../../layouts/panelpage/PerformancePanel';

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
  const pathWayRef = useRef(null);
  const mapContainerRef = useRef(null);
  const tempLineRef = useRef(null);

  // --- 1. STATE ---
  const [syllabusData, setSyllabusData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [viewMode, setViewMode] = useState('canvas'); 
  const [activeLesson, setActiveLesson] = useState(null);
  const [openPanels, setOpenPanels] = useState({ list: true, details: true, performance: true });
  
  const [customNodes, setCustomNodes] = useState(() => {
    const saved = localStorage.getItem('dataways_customNodes_v2');
    return saved !== null ? JSON.parse(saved) : [];
  });
  
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
  const isCustomizing = customNodes.length > 0;

  // Save custom nodes whenever they change
  useEffect(() => {
    localStorage.setItem('dataways_customNodes_v2', JSON.stringify(customNodes));
  }, [customNodes]);

  // --- 2. FETCH DATA ---
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const curRes = await fetch('/data_ways_curriculum.json');
      const curData = await curRes.json();
      setSyllabusData(curData);

      const perfRes = await axios.get('http://localhost:8801/api/student/1/performance');
      setPerformanceData(perfRes.data);

      const savedId = localStorage.getItem('dataways_activeLesson');
      const initial = savedId !== null ? curData.find(l => l.lesson === parseInt(savedId)) || curData[0] : curData[0];
      setActiveLesson(initial);
    } catch (err) {
      console.error("Failed to load initial data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (activeLesson) localStorage.setItem('dataways_activeLesson', activeLesson.lesson.toString()); }, [activeLesson]);

  const getScoreColor = (label) => {
    if (label === 'Excellence') return 'border-emerald-500 text-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
    if (label === 'Good') return 'border-blue-500 text-blue-500 bg-blue-500/10';
    if (label === 'Average') return 'border-amber-500 text-amber-500 bg-amber-500/10';
    if (label === 'Fail') return 'border-red-500 text-red-500 bg-red-500/10';
    return 'border-gray-300 dark:border-[#333] text-gray-500 bg-white dark:bg-[#1E1F20]';
  };

  const currentPerf = performanceData.find(p => p.module_id === activeLesson?.lesson);

  // --- MERGE DATA FOR DASHBOARD ---
  // Combines static syllabus (always exists) with dynamic performance (might be empty)
  const dashboardData = useMemo(() => {
    if (!syllabusData.length) return [];
    return syllabusData.map(mod => {
      const perf = performanceData.find(p => p.module_id === mod.lesson);
      return {
        module_id: mod.lesson,
        topic_name: mod.topic,
        track: mod.type || 'General',
        score_value: perf?.score_value ?? null,
        grade_label: perf?.grade_label ?? null
      };
    });
  }, [syllabusData, performanceData]);

  // --- 4. HTML5 DRAG & DROP LOGIC ---
  const handleDragStart = (e, lessonId) => {
    e.dataTransfer.setData('lessonId', lessonId.toString());
    e.dataTransfer.effectAllowed = 'copyMove';
    const dragIcon = document.createElement('div');
    dragIcon.className = "bg-blue-600 text-white p-2 rounded-full text-xs font-bold";
    dragIcon.innerText = lessonId;
    document.body.appendChild(dragIcon);
    e.dataTransfer.setDragImage(dragIcon, 25, 25);
    setTimeout(() => document.body.removeChild(dragIcon), 0);
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
    
    setCustomNodes(prev => {
      const existingNode = prev.find(n => n.id === draggedLessonId);
      if (existingNode) return prev.map(n => n.id === draggedLessonId ? { ...n, x: dropX, y: dropY } : n);
      
      let closestId = 'START';
      let minDistance = Math.hypot(dropX - 150, dropY - 250);
      prev.forEach(n => {
        const dist = Math.hypot(dropX - n.x, dropY - n.y);
        if (dist < minDistance) { minDistance = dist; closestId = n.id; }
      });
      
      return [...prev, { id: draggedLessonId, x: dropX, y: dropY, parentIds: [closestId] }];
    });
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
  };

  const clearCustomPath = () => { if (window.confirm("Are you sure you want to clear your custom path?")) setCustomNodes([]); };

  // --- 5. LINE DRAWING & MULTI-CONNECTION LOGIC ---
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
              if (!currentParents.includes(sourceId)) return { ...n, parentIds: [...currentParents, sourceId] };
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
  };

  // --- 6. RESIZER LOGIC ---
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

  // --- 7. MAP LOGIC ---
  const getDefaultMapCoordinates = (col = 0, row = 0) => ({ x: 150 + (col * 280), y: 250 + (row * 160) });
  const mapBounds = useMemo(() => {
    if (isCustomizing) {
      const maxX = Math.max(...customNodes.map(n => n.x), 1000);
      const maxY = Math.max(...customNodes.map(n => n.y), 500);
      return { width: maxX + 400, height: maxY + 400 };
    }
    const maxDefaultCol = syllabusData.length > 0 ? Math.max(...syllabusData.map(l => l.col || 0)) : 0;
    return { width: (maxDefaultCol * 280) + 600, height: '100%' };
  }, [isCustomizing, customNodes, syllabusData]);

  const paths = useMemo(() => {
    if (!syllabusData.length) return [];
    let generatedPaths = [];
    
    if (isCustomizing) {
      customNodes.forEach(node => {
        const parents = node.parentIds || [];
        parents.forEach(pId => {
          let start = pId === 'START' ? { x: 150, y: 250 } : customNodes.find(n => n.id === pId);
          if (start) {
            const cp1x = start.x + (node.x - start.x) / 2;
            generatedPaths.push({ 
              childId: node.id, 
              parentId: pId, 
              pathData: `M ${start.x} ${start.y} C ${cp1x} ${start.y}, ${cp1x} ${node.y}, ${node.x} ${node.y}`, 
              isCustom: true 
            });
          }
        });
      });
    } else {
      syllabusData.forEach(lesson => {
        lesson.connectsTo?.forEach(targetId => {
          const target = syllabusData.find(l => l.lesson === targetId);
          if (target) {
            const current = getDefaultMapCoordinates(lesson.col, lesson.row);
            const targetCoord = getDefaultMapCoordinates(target.col, target.row);
            const cp1x = current.x + (targetCoord.x - current.x) / 2;
            generatedPaths.push({ childId: targetId, parentId: lesson.lesson, pathData: `M ${current.x} ${current.y} C ${cp1x} ${current.y}, ${cp1x} ${targetCoord.y}, ${targetCoord.x} ${targetCoord.y}`, isCustom: false });
          }
        });
      });
    }
    return generatedPaths;
  }, [isCustomizing, customNodes, syllabusData]);

  const nodesToRender = isCustomizing 
    ? customNodes.map(n => {
        const lessonData = syllabusData.find(l => l.lesson === n.id);
        return lessonData ? { ...lessonData, customX: n.x, customY: n.y } : null;
      }).filter(Boolean)
    : syllabusData;

  // --- 8. RENDER ---
  if (loadingData || !activeLesson) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-white dark:bg-[#0A0A0A] text-blue-500 transition-colors duration-300">
        <RefreshCw className="w-10 h-10 animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-widest text-gray-500 dark:text-gray-300 uppercase">Synchronizing Systems...</h2>
      </div>
    );
  }

  return (
    <div ref={pathWayRef} className="flex flex-row h-full w-full overflow-hidden select-none font-sans bg-gray-50 dark:bg-[#0A0A0A] relative text-gray-800 dark:text-gray-200 transition-colors duration-300">
      
      <style>{`
        .course-map-scroll::-webkit-scrollbar { height: 12px; width: 12px; }
        
        /* Dark Mode Scrollbars & Backgrounds */
        .dark .course-map-scroll::-webkit-scrollbar-track { background: #131314; }
        .dark .course-map-scroll::-webkit-scrollbar-thumb { background-color: #333; border-radius: 20px; border: 3px solid #131314; }
        .dark .bg-grid-pattern { background-size: 50px 50px; background-image: radial-gradient(circle, #222 1px, transparent 1px); }
        
        /* Light Mode Scrollbars & Backgrounds */
        .course-map-scroll::-webkit-scrollbar-track { background: #f9fafb; }
        .course-map-scroll::-webkit-scrollbar-thumb { background-color: #d1d5db; border-radius: 20px; border: 3px solid #f9fafb; }
        .bg-grid-pattern { background-size: 50px 50px; background-image: radial-gradient(circle, #e5e7eb 1px, transparent 1px); }
      `}</style>

      {/* --- LEFT SIDEBAR --- */}
      {openPanels.list ? (
        <div style={{ width: `${listPanelWidth}px` }} className={`shrink-0 h-full border-r border-gray-200 dark:border-[#333] flex flex-col bg-white dark:bg-[#0c0c0d] relative z-20 transition-colors duration-300 ${isResizingList ? '' : 'transition-[width] duration-300'}`}>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <ModuleListPanel 
              syllabusData={syllabusData} 
              customPath={customPathIds} 
              handleDragStart={handleDragStart} 
              onClose={() => setOpenPanels(p => ({...p, list: false}))} 
              onSelectModule={setActiveLesson}
            />
          </div>
          <PerformancePanel 
            isOpen={openPanels.performance} 
            onToggle={() => setOpenPanels(p => ({...p, performance: !p.performance}))}
            activeLesson={activeLesson}
            currentPerf={currentPerf}
            getScoreColor={getScoreColor}
          />
          <div onMouseDown={(e) => { setIsResizingList(true); e.preventDefault(); }} className="absolute top-0 right-[-4px] w-2 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors z-50" />
        </div>
      ) : (
        <CollapsedSidebar title="Curriculum Modules" icon={<ListPlus size={20}/>} onClick={() => setOpenPanels(p => ({...p, list: true}))} />
      )}
      
      <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-[#131314] relative z-10 min-w-0 transition-colors duration-300">
        
        {/* TOP NAV OVERLAY */}
        <div className="absolute top-6 right-6 z-50 flex gap-3">
          {isCustomizing && (
            <button 
              onClick={clearCustomPath}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Undo2 size={14} /> Reset Map
            </button>
          )}
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#1E1F20] hover:bg-gray-100 dark:hover:bg-[#333] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-[#333] rounded-xl text-xs font-bold transition-all shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loadingData ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={() => setViewMode(viewMode === 'canvas' ? 'dashboard' : 'canvas')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            {viewMode === 'canvas' ? (
              <><LayoutDashboard size={14} /> View Module Details</>
            ) : (
              <><MapIcon size={14} /> Back to Pathway Map</>
            )}
          </button>
        </div>

        {viewMode === 'dashboard' ? (
          <div className="h-full w-full animate-fade-in bg-white dark:bg-[#0c0c0d] transition-colors duration-300">
             <ModuleDetailDashboard data={dashboardData} />
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* 1. MAP VIEW */}
            <div style={{ height: openPanels.details ? `${topHeight}%` : '100%' }} className="relative flex-shrink-0 z-10 flex flex-col min-h-[200px] transition-all duration-300">
              <div className="absolute top-0 left-0 p-6 flex items-center gap-4 z-30 pointer-events-none">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 backdrop-blur-md transition-all shadow-sm 
                  ${isCustomizing ? 'bg-green-100 dark:bg-green-600/20 border-green-300 dark:border-green-500/40' : 'bg-blue-100 dark:bg-blue-600/20 border-blue-300 dark:border-blue-500/40'}`}>
                  <Network className={`w-6 h-6 ${isCustomizing ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}/>
                </div>
                <div>
                  <h2 className="text-gray-900 dark:text-white font-black text-lg tracking-tight leading-none mb-1 transition-colors">{isCustomizing ? "Sandbox Mode" : "Standard Pathway"}</h2>
                  <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">{isCustomizing ? "Click lines to cut" : "Recommended Learning Order"}</p>
                </div>
              </div>

              <div 
                ref={mapContainerRef} 
                className={`flex-1 overflow-auto relative course-map-scroll ${isCustomizing ? 'bg-grid-pattern' : ''} ${drawingConnection ? 'cursor-crosshair' : ''}`}
                onDragOver={handleMapDragOver} onDragLeave={handleMapDragLeave} onDrop={handleMapDrop} onMouseMove={handleMapMouseMove}
              >
                <div className="relative z-10" style={{ width: `${mapBounds.width}px`, height: `${mapBounds.height}px`, minHeight: '100%' }}>
                  
                  {/* PATHS SVG CONTAINER */}
                  <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible z-0">
                    {paths.map((p, i) => (
                      <g 
                        key={i} 
                        className={p.isCustom ? "pointer-events-auto cursor-pointer" : ""} 
                        onClick={() => p.isCustom && removeConnection(p.childId, p.parentId)}
                      >
                        {p.isCustom && (
                          <path d={p.pathData} fill="none" stroke="transparent" strokeWidth="15" />
                        )}
                        <path 
                          d={p.pathData} 
                          fill="none" 
                          stroke={isCustomizing ? "#10b981" : "#3b82f6"} 
                          strokeWidth="3" 
                          className={`stroke-opacity-50 dark:stroke-opacity-30 ${p.isCustom ? "hover:stroke-red-500 hover:stroke-opacity-80 transition-all duration-200" : ""}`}
                          strokeDasharray={p.isCustom ? "10 5" : "none"} 
                        />
                      </g>
                    ))}
                    {drawingConnection && <path ref={tempLineRef} d="" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="8 4" />}
                  </svg>

                  {/* Module Nodes */}
                  {nodesToRender.map((lesson) => {
                    const isActive = activeLesson?.lesson === lesson.lesson;
                    const perf = performanceData.find(p => p.module_id === lesson.lesson);
                    const { x, y } = isCustomizing ? { x: lesson.customX, y: lesson.customY } : getDefaultMapCoordinates(lesson.col, lesson.row);
                    
                    return (
                      <div key={lesson.lesson} className="absolute z-20" style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}
                        onClick={() => setActiveLesson(lesson)} onMouseUp={(e) => handleNodeMouseUp(e, lesson.lesson)} 
                      >
                        <div className={`relative w-16 h-16 cursor-pointer group transition-all duration-300 border-2 rounded-2xl flex items-center justify-center font-black text-xl shadow-md ${isActive ? 'scale-110 shadow-lg' : 'hover:scale-105'} ${getScoreColor(perf?.grade_label)}`}>
                          {lesson.lesson}
                          {isCustomizing && (
                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-green-500 rounded-full cursor-crosshair shadow-sm hover:scale-125 transition-transform" onMouseDown={(e) => handleConnectorMouseDown(e, lesson.lesson, x, y)} />
                          )}
                        </div>
                        <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-32 text-center pointer-events-none">
                           <p className={`text-[10px] font-bold uppercase ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>{lesson.topic}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. RESIZER */}
            {openPanels.details && (
              <div onMouseDown={handleHeightMouseDown} className="h-1.5 flex-shrink-0 bg-gray-200 dark:bg-[#1E1F20] hover:bg-blue-500 dark:hover:bg-blue-600 cursor-row-resize flex items-center justify-center z-40 border-y border-gray-300 dark:border-[#333] group transition-colors duration-300">
                <GripHorizontal className="text-gray-400 dark:text-gray-700 group-hover:text-white w-4 h-4 transition-colors" />
              </div>
            )}

            {/* 3. DETAILS PANEL */}
            {openPanels.details && (
              <div className="flex-1 w-full bg-white dark:bg-[#0c0c0d] overflow-hidden relative transition-colors duration-300">
                <ModuleDetailsPanel activeLesson={activeLesson} isCustomizing={isCustomizing} customPath={customPathIds} removeCustomPathItem={removeCustomPathItem} onClose={() => setOpenPanels(p => ({...p, details: false}))} />
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default PathWay;