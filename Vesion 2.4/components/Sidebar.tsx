
import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Settings, 
  FileText, 
  Wallet,
  X,
  LogOut,
  UserCog
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  currentTab: string;
  setCurrentTab: (t: string) => void;
  user: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, currentTab, setCurrentTab, user, onLogout }) => {
  const menuGroups = [
    {
      title: 'NGHIỆP VỤ',
      items: [
        { id: 'dashboard', label: 'Trang chủ', icon: <LayoutDashboard size={20} /> },
        { id: 'orders', label: 'Quản lý Đơn hàng', icon: <ShoppingCart size={20} /> },
        { id: 'inventory', label: 'Quản lý Kho', icon: <Package size={20} /> },
        { id: 'customers', label: 'Khách hàng', icon: <Users size={20} /> },
      ]
    },
    {
      title: 'TÀI CHÍNH',
      items: [
        { id: 'finance', label: 'Sổ Quỹ (Thu - Chi)', icon: <Wallet size={20} /> },
        { id: 'reports', label: 'Báo Cáo Lãi Lỗ', icon: <FileText size={20} /> },
      ]
    },
    {
      title: 'HỆ THỐNG',
      items: [
        ...(user.role === 'admin' ? [
          { id: 'users', label: 'Quản lý Tài khoản', icon: <UserCog size={20} /> }
        ] : []),
        { id: 'settings', label: 'Cấu hình Google Sheet', icon: <Settings size={20} /> },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-[#1e293b] text-white z-30 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col
      `}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 bg-[#0f172a] border-b border-gray-700">
          <div className="font-bold text-lg leading-tight">
            QUẢN LÝ <br/> <span className="text-orange-500">ORDER ONLINE</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="mb-6">
              <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {group.title}
              </h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setCurrentTab(item.id);
                        if (window.innerWidth < 1024) setIsOpen(false);
                      }}
                      className={`
                        w-full flex items-center px-4 py-3 text-sm font-medium transition-colors border-l-4
                        ${currentTab === item.id 
                          ? 'bg-slate-700 border-orange-500 text-white' 
                          : 'border-transparent text-gray-400 hover:bg-slate-800 hover:text-white'}
                      `}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* User Profile / Footer */}
        <div className="p-4 bg-[#0f172a] border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold uppercase">
                {user.username.charAt(0)}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium max-w-[100px] truncate">{user.fullName}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
