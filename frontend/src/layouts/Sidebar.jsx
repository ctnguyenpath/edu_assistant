import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Compass, 
  Map as MapIcon, 
  MessageSquare, 
  Library, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  BookOpen
} from 'lucide-react';

import ThemeToggle from '../components/ThemeToggle'; // Adjust path if needed
import { useAuth } from '../contexts/AuthContext'; 

const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth(); 
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Define the navigation routes based on App.jsx
  const navItems = [
    { path: '/', label: 'Home', icon: <Home size={20} /> },
    { 
      path: '/discover', 
      label: 'Discover', 
      icon: <Compass size={20} />,
      children: [
        { path: '/discover/introduction', label: 'Introduction', icon: <BookOpen size={18} /> },
        { path: '/discover/pathway', label: 'Pathway Map', icon: <MapIcon size={18} /> }
      ]
    },
    { path: '/chat', label: 'AI Chat', icon: <MessageSquare size={20} /> },
    { path: '/library', label: 'Library', icon: <Library size={20} /> },
  ];

  return (
    <div 
      className={`relative h-full flex flex-col border-r transition-all duration-300 z-50
        bg-white dark:bg-[#131314] 
        border-gray-200 dark:border-[#333]
        ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Toggle Collapse Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-white dark:bg-[#1E1F20] border border-gray-200 dark:border-[#333] rounded-full p-1 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 z-50 transition-colors shadow-sm"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Logo Area */}
      <div className="p-6 flex items-center justify-center border-b border-gray-200 dark:border-[#333] h-20 shrink-0">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shrink-0 shadow-lg shadow-blue-500/30">
          E
        </div>
        {!isCollapsed && (
          <span className="ml-3 font-black text-xl text-gray-900 dark:text-white tracking-widest uppercase transition-opacity">
            Edu App
          </span>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2">
        {navItems.map((item) => {
          // Check if current path matches the item's path exactly, or if it's a sub-route
          const isParentActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <div key={item.path}>
              <Link
                to={item.path}
                title={isCollapsed ? item.label : ""}
                className={`flex items-center px-3 py-3 rounded-xl transition-all duration-200 group
                  ${isParentActive 
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1E1F20] hover:text-gray-900 dark:hover:text-gray-200'
                  }
                `}
              >
                <div className={`${isCollapsed ? 'mx-auto' : 'mr-3'} transition-transform group-hover:scale-110`}>
                  {item.icon}
                </div>
                {!isCollapsed && <span>{item.label}</span>}
              </Link>

              {/* Render Children if they exist and sidebar is not collapsed */}
              {item.children && !isCollapsed && (
                <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-100 dark:border-[#333] pl-2">
                  {item.children.map((child) => {
                    const isChildActive = location.pathname === child.path;
                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 text-sm
                          ${isChildActive 
                            ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/50 dark:bg-blue-500/5' 
                            : 'text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1E1F20]'
                          }
                        `}
                      >
                        <div className="mr-2 opacity-80">{child.icon}</div>
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Actions (Theme Toggle & Logout) */}
      <div className="p-4 border-t border-gray-200 dark:border-[#333] space-y-3 shrink-0">
        
        {/* The Theme Toggle component handles its own light/dark logic internally */}
        <ThemeToggle isCollapsed={isCollapsed} />
        
        <button 
          onClick={logout}
          title={isCollapsed ? "Logout" : ""}
          className={`flex items-center w-full px-3 py-3 rounded-xl transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10
            ${isCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={20} className={isCollapsed ? '' : 'mr-3'} />
          {!isCollapsed && <span className="font-semibold">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;