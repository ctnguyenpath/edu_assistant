import React, { useState, useEffect } from 'react';
import { 
  Menu, Home, Compass, Library, Database, BookOpen, 
  ChevronDown, ChevronRight, LogOut, User, Network
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

const Sidebar = () => {
  const { user, logout } = useAuth(); 
  const navigate = useNavigate(); 
  const location = useLocation();

  const [sidebarExtended, setSidebarExtended] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState({});
  
  // --- RESIZER STATE ---
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('main_sidebar_width');
    return saved !== null ? parseInt(saved, 10) : 256; // 256px default (matches old w-64)
  });
  const [isResizing, setIsResizing] = useState(false);

  // Save width to localStorage
  useEffect(() => {
    localStorage.setItem('main_sidebar_width', sidebarWidth.toString());
  }, [sidebarWidth]);

  // Handle Dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 160) newWidth = 160; // Minimum width
      if (newWidth > 600) newWidth = 600; // Maximum width
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const navItems = [
    { id: '/', icon: Home, label: "Home" },
    { 
      id: '/discover', 
      icon: Compass, 
      label: "Discover",
      children: [
        { id: '/discover/introduction', icon: BookOpen, label: "Introduction" },
        { id: '/discover/pathway', icon: Network, label: "Data Pathway" } 
      ]
    },
    { id: '/library', icon: Library, label: "Library" },
  ];
  
  const toggleSubMenu = (itemId) => {
    setExpandedMenus(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleNavClick = (item) => {
    if (item.children) {
      toggleSubMenu(item.id);
      if (!sidebarExtended) setSidebarExtended(true); 
    } else {
      navigate(item.id);
    }
  };

  return (
    <div 
      style={{ width: sidebarExtended ? `${sidebarWidth}px` : '80px' }}
      className={`flex flex-col h-full bg-[#1E1F20] p-3 border-r border-[#333] shrink-0 relative z-20 overflow-hidden
        ${isResizing ? '' : 'transition-[width] duration-300 ease-in-out'}`}
    >
      
      {/* --- DRAG HANDLE (Visible only when expanded) --- */}
      {sidebarExtended && (
        <div 
          onMouseDown={(e) => { setIsResizing(true); e.preventDefault(); }}
          className="absolute top-0 right-[-2px] w-3 h-full cursor-col-resize hover:bg-blue-500/30 transition-colors z-50 flex items-center justify-center group"
        >
           {/* Visual line indicator on hover */}
           <div className="w-[1px] h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Global overlay to keep cursor styling while dragging rapidly */}
      {isResizing && <div className="fixed inset-0 z-[100] cursor-col-resize" />}
      
      {/* --- Toggle Button --- */}
      <div onClick={() => setSidebarExtended(!sidebarExtended)} className="cursor-pointer p-3 hover:bg-[#282A2C] rounded-full w-fit mb-4 shrink-0">
        <Menu className="w-6 h-6 text-gray-400" />
      </div>
      
      {/* --- Navigation Items --- */}
      <div className="flex flex-col gap-1 mb-6 flex-1 overflow-y-auto scrollbar-none">
        {navItems.map((item) => {
           const isActive = location.pathname === item.id || (item.children && location.pathname.startsWith(item.id));
           const isExpanded = expandedMenus[item.id];
           return (
             <div key={item.id}>
               <div onClick={() => handleNavClick(item)} className={`flex items-center gap-4 p-3 rounded-full cursor-pointer transition-colors ${isActive ? 'bg-[#004A77]/50 text-blue-100' : 'hover:bg-[#282A2C] text-gray-400'} ${!sidebarExtended && 'justify-center'}`}>
                 <item.icon className="w-5 h-5 flex-shrink-0" />
                 {sidebarExtended && (
                   <>
                     <span className="text-sm font-medium flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                     {item.children && (isExpanded ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />)}
                   </>
                 )}
               </div>
               {sidebarExtended && item.children && isExpanded && (
                 <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-2">
                   {item.children.map(child => (
                     <div key={child.id} onClick={() => navigate(child.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${location.pathname === child.id ? 'bg-[#004A77] text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-[#282A2C]'}`}>
                       <child.icon size={16} className="shrink-0" />
                       <span className="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">{child.label}</span>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           );
        })}
      </div>
      
      {/* --- Footer: User Profile & Logout --- */}
      <div className="border-t border-[#333] pt-4 mt-2 shrink-0">
          {sidebarExtended ? (
              <div className="flex items-center justify-between px-2 overflow-hidden">
                  <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                         {user?.picture ? (
                           <img src={user.picture} alt="User" className="w-full h-full object-cover"/>
                         ) : (
                           <User size={16} />
                         )}
                      </div>
                      <div className="overflow-hidden">
                          <p className="text-sm font-medium text-white truncate w-full">
                            {user?.name || user?.username || "Guest"}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate w-full">
                            {user?.email || "Online"}
                          </p>
                      </div>
                  </div>
                  <button onClick={logout} className="p-2 text-gray-400 hover:text-red-400 hover:bg-[#282A2C] rounded-full transition-colors shrink-0" title="Logout">
                      <LogOut size={18} />
                  </button>
              </div>
          ) : (
              <div className="flex justify-center">
                  <button onClick={logout} className="p-3 text-gray-400 hover:text-red-400 hover:bg-[#282A2C] rounded-full transition-colors shrink-0" title="Logout">
                      <LogOut size={20} />
                  </button>
              </div>
          )}
      </div>
    </div>
  );
};

export default Sidebar;