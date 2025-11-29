
import React, { useState } from 'react';
import { sheetService } from '../services/sheetService';
import { UserPlus, Save, CheckCircle, AlertCircle, Loader2, Mail, Phone, User as UserIcon, Lock, Shield } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'support' // Default role
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.fullName) {
      setStatus({ type: 'error', message: 'Vui lòng điền các trường bắt buộc (*).' });
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const response = await sheetService.createUser(formData);
      if (response.success) {
        setStatus({ type: 'success', message: 'Tạo tài khoản thành công!' });
        setFormData({ 
            username: '', 
            password: '', 
            fullName: '', 
            email: '',
            phone: '',
            role: 'support' 
        });
      } else {
        setStatus({ type: 'error', message: response.error || 'Có lỗi xảy ra.' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Lỗi kết nối hệ thống.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <UserPlus className="text-orange-500" size={24} />
          <h2 className="text-lg font-bold text-gray-800">Cấp Tài Khoản Mới</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {status.message && (
            <div className={`p-4 rounded-md flex items-center gap-2 ${
              status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span>{status.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cột 1: Thông tin đăng nhập */}
            <div className="space-y-4">
                <h3 className="font-semibold text-gray-600 border-b pb-2 mb-4">Thông tin đăng nhập</h3>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <UserIcon size={16} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm"
                            placeholder="user123"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock size={16} className="text-gray-400" />
                        </div>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm"
                            placeholder="••••••"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phân quyền</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Shield size={16} className="text-gray-400" />
                        </div>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm bg-white"
                        >
                            <option value="admin">Admin (Quản trị viên)</option>
                            <option value="leader">Leader (Trưởng nhóm)</option>
                            <option value="support">Support</option>
                            <option value="designer">Designer</option>
                            <option value="idea">Idea</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Cột 2: Thông tin cá nhân */}
            <div className="space-y-4">
                <h3 className="font-semibold text-gray-600 border-b pb-2 mb-4">Thông tin cá nhân</h3>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        placeholder="Nguyễn Văn A"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (Gmail)</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail size={16} className="text-gray-400" />
                        </div>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm"
                            placeholder="example@gmail.com"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone size={16} className="text-gray-400" />
                        </div>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500 text-sm"
                            placeholder="0912..."
                        />
                    </div>
                </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end border-t border-gray-100 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              <span>Lưu Thông Tin</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;
