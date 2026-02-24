import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; // Import our newly extracted component

const MainLayout = () => { 
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#131314] text-white font-sans">
      
      {/* --- Independent Collapsible Left Panel --- */}
      <Sidebar />

      {/* --- Main Content Area --- */}
      <div className="flex-1 h-full relative overflow-hidden flex flex-col min-w-0 min-h-0">
        <Outlet /> 
      </div>
      
    </div>
  );
};

export default MainLayout;