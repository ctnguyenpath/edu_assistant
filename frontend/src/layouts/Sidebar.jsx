import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Compass, 
  Map as MapIcon, 
  MessageSquare, 
  Library, 
  LogOut,
  LogIn,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  LayoutDashboard 
} from 'lucide-react';

import ThemeToggle from '../components/ThemeToggle'; 
import { useAuth } from '../contexts/AuthContext'; 

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate(); 
  
  const { user, logout } = useAuth(); 
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isLoggedIn = !!user;

  const handleLogout = async () => {
    try {
      await logout(); 
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/'); 
      window.location.reload(); 
    }
  };

  const navItems = [
    { path: '/', label: 'Home', icon: <Home size={20} /> },
    { 
      path: '/discover', 
      label: 'Discover', 
      icon: <Compass size={20} />,
      children: [
        { path: '/discover/pathway', label: 'Pathway Map', icon: <MapIcon size={18} /> }
      ]
    },
    {
      // 1. UPDATED: Removed "path" so it is just a sector name, not a page link
      label: 'Programs',
      icon: <BookOpen size={20} />,
      children: [
        { path: '/program/dashboard', label: 'My Dashboard', icon: <LayoutDashboard size={18} /> },
      ]
    },
    { path: '/chat', label: 'AI Chat', icon: <MessageSquare size={20} /> },
    { path: '/library', label: 'Library', icon: <Library size={20} /> },
  ];

  return (
    <aside 
      className={`relative h-full flex flex-col border-r transition-all duration-300 z-50
        bg-white dark:bg-[#131314] 
        border-gray-200 dark:border-[#333]
        ${isCollapsed ? 'w-20' : 'w-64'}`}
    >
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-white dark:bg-[#1E1F20] border border-gray-200 dark:border-[#333] rounded-full p-1 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 z-50 transition-colors shadow-sm"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

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

      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2 scrollbar-thin">
        {navItems.map((item) => {
          // 2. UPDATED: Safely determine active state even if item.path is missing
          let isParentActive = false;
          if (item.path) {
            isParentActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          } else if (item.children) {
            isParentActive = item.children.some(child => location.pathname === child.path || location.pathname.startsWith(child.path));
          }
          
          const itemClasses = `flex items-center px-3 py-3 rounded-xl transition-all duration-200 group
            ${isParentActive 
              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1E1F20] hover:text-gray-900 dark:hover:text-gray-200'
            }`;

          return (
            <div key={item.path || item.label}>
              
              {/* 3. UPDATED: If there is no path, render a safe DIV instead of a LINK */}
              {item.path ? (
                <Link
                  to={item.path}
                  title={isCollapsed ? item.label : ""}
                  className={itemClasses}
                >
                  <div className={`${isCollapsed ? 'mx-auto' : 'mr-3'} transition-transform group-hover:scale-110`}>
                    {item.icon}
                  </div>
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              ) : (
                <div
                  title={isCollapsed ? item.label : ""}
                  className={`${itemClasses} cursor-default select-none`}
                >
                  <div className={`${isCollapsed ? 'mx-auto' : 'mr-3'} transition-transform group-hover:scale-110`}>
                    {item.icon}
                  </div>
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
              )}

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

      {/* Bottom Actions (Profile, Theme & Auth) */}
      <div className="p-4 border-t border-gray-200 dark:border-[#333] space-y-3 shrink-0">
        
        {!isCollapsed ? (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm ${isLoggedIn ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
              {isLoggedIn ? (user?.name ? user.name.charAt(0).toUpperCase() : 'U') : 'G'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {isLoggedIn ? (user?.name || 'Student Account') : 'Guest User'}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider truncate">
                {isLoggedIn ? 'Logged In' : 'Not Logged In'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-4" title={isLoggedIn ? (user?.name || 'Logged In') : 'Guest User'}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-sm ${isLoggedIn ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
              {isLoggedIn ? (user?.name ? user.name.charAt(0).toUpperCase() : 'U') : 'G'}
            </div>
          </div>
        )}

        <ThemeToggle isCollapsed={isCollapsed} />
        
        {isLoggedIn ? (
          <button 
            onClick={handleLogout} 
            title={isCollapsed ? "Logout" : ""}
            className={`flex items-center w-full px-3 py-3 rounded-xl transition-all duration-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10
              ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={20} className={isCollapsed ? '' : 'mr-3'} />
            {!isCollapsed && <span className="font-semibold">Logout</span>}
          </button>
        ) : (
          <button 
            onClick={() => navigate('/login')} 
            title={isCollapsed ? "Login" : ""}
            className={`flex items-center w-full px-3 py-3 rounded-xl transition-all duration-200 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10
              ${isCollapsed ? 'justify-center' : ''}`}
          >
            <LogIn size={20} className={isCollapsed ? '' : 'mr-3'} />
            {!isCollapsed && <span className="font-semibold">Login</span>}
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;