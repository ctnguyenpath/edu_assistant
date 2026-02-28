import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ isCollapsed = false }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`flex items-center transition-all ${
        isCollapsed 
          ? 'justify-center w-10 h-10 rounded-xl' 
          : 'justify-start gap-3 w-full p-3 rounded-xl font-semibold'
      } ${
        isDark 
          ? 'bg-[#1E1F20] hover:bg-[#333] text-gray-300' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
      }`}
    >
      {/* Icon Area */}
      {isDark ? (
        <Sun size={isCollapsed ? 18 : 20} className="text-yellow-400 shrink-0" />
      ) : (
        <Moon size={isCollapsed ? 18 : 20} className="text-blue-500 shrink-0" />
      )}

      {/* Text Area (Hidden if sidebar is collapsed) */}
      {!isCollapsed && (
        <span className="truncate">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;