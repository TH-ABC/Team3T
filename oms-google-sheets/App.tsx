
import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import OrderList from './components/OrderList';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Nếu chưa đăng nhập, hiển thị màn hình Login
  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const handleLogout = () => {
    setUser(null);
    setCurrentTab('dashboard');
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'orders':
        return <OrderList />;
      case 'users':
        return user.role === 'admin' ? <UserManagement /> : <div className="p-6">Bạn không có quyền truy cập.</div>;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="text-lg font-medium">Chức năng đang phát triển</p>
            <p className="text-sm">Vui lòng quay lại sau.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex text-gray-800 font-sans">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen transition-all duration-300">
        
        {/* Top Navbar for Mobile */}
        <div className="bg-white h-16 shadow-sm flex items-center justify-between px-4 lg:hidden sticky top-0 z-10">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
          >
            <Menu size={24} />
          </button>
          <span className="font-bold text-gray-700">OMS Dashboard</span>
          <div className="w-8"></div> {/* Spacer for center alignment visually */}
        </div>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          {renderContent()}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-500">
          <p>© 2025 Order Management System. Powered by Google Sheets & Gemini AI.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
