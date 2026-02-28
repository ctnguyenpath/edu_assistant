import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; // Import our newly extracted component

const MainLayout = () => { 
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-[#131314] text-gray-900 dark:text-white font-sans transition-colors duration-300">
      
      {/* --- Independent Collapsible Left Panel --- */}
      <Sidebar />

      {/* --- Main Content Area --- */}
      <div className="flex-1 h-full relative overflow-hidden flex flex-col min-w-0 min-h-0 bg-gray-50 dark:bg-[#0A0A0A] transition-colors duration-300">
        <Outlet /> 
      </div>
      
    </div>
  );
};

export default MainLayout;