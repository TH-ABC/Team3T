
import React, { useEffect, useState } from 'react';
import { ShoppingCart, DollarSign, Store as StoreIcon, Users, Plus, X, Link as LinkIcon, ExternalLink, Trash2, AlertTriangle, CheckCircle, AlertCircle, RefreshCw, MapPin } from 'lucide-react';
import StatCard from './StatCard';
import { sheetService } from '../services/sheetService';
import { DashboardMetrics, Store, User } from '../types';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // Trạng thái refresh thủ công
  
  // State cho Modal thêm Store
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Chỉ giữ lại name, url, region cho modal thêm mới
  const [newStoreData, setNewStoreData] = useState({ name: '', url: '', region: '' });

  // State xử lý loading khi xóa
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // State cho Popup xác nhận và thông báo
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, storeId: string | null, storeName: string }>({
    isOpen: false, storeId: null, storeName: ''
  });
  const [resultModal, setResultModal] = useState<{ isOpen: boolean, type: 'success' | 'error', message: string }>({
    isOpen: false, type: 'success', message: ''
  });

  const loadData = async (showMainLoading = true) => {
    if (showMainLoading) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const stats = await sheetService.getDashboardStats();
      const storeData = await sheetService.getStores();
      setMetrics(stats);
      setStores(storeData);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Load lần đầu
    loadData(true);

    // Thiết lập tự động refresh mỗi 2 phút (120,000 ms)
    const intervalId = setInterval(() => {
      console.log("Auto-refreshing data...");
      loadData(false);
    }, 120000);

    // Cleanup khi unmount
    return () => clearInterval(intervalId);
  }, []);

  // Hàm xử lý khi bấm nút refresh thủ công
  const handleManualRefresh = () => {
    loadData(false);
  };

  const handleAddStore = async () => {
    if (!newStoreData.name) return;
    await sheetService.addStore(newStoreData);
    setIsModalOpen(false);
    setNewStoreData({ name: '', url: '', region: '' });
    loadData(false); 
  };

  // 1. Hàm được gọi khi bấm nút thùng rác -> Mở popup xác nhận
  const onRequestDelete = (e: React.MouseEvent, store: Store) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      storeId: store.id,
      storeName: store.name
    });
  };

  // 2. Hàm được gọi khi bấm nút "Xóa" trong popup xác nhận
  const handleConfirmDelete = async () => {
    if (!confirmModal.storeId) return;

    const idToDelete = confirmModal.storeId;
    
    // Đóng popup xác nhận và hiện loading ở dòng tương ứng
    setConfirmModal({ ...confirmModal, isOpen: false });
    setDeletingId(idToDelete);

    try {
      const result = await sheetService.deleteStore(idToDelete);
      
      if (result && result.success) {
        // Xóa thành công: Cập nhật UI ngay lập tức
        const updatedStores = stores.filter(store => store.id !== idToDelete);
        setStores(updatedStores);
        
        // Hiện popup thông báo thành công
        setResultModal({
          isOpen: true,
          type: 'success',
          message: 'Đã xóa Store thành công!'
        });
      } else {
        // Xóa thất bại
        setResultModal({
          isOpen: true,
          type: 'error',
          message: result.error || "Có lỗi xảy ra khi xóa."
        });
        loadData(false); // Load lại để đồng bộ dữ liệu
      }
    } catch (error) {
      console.error("Lỗi khi xóa store:", error);
      setResultModal({
        isOpen: true,
        type: 'error',
        message: "Lỗi kết nối mạng hoặc lỗi hệ thống."
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Helper format số
  const formatNumber = (val: string | number) => {
    if (!val) return '0';
    const num = Number(val);
    if (isNaN(num)) return val; // Nếu không phải số (ví dụ text), trả về nguyên gốc
    return num.toLocaleString('vi-VN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        <p className="text-gray-500 text-sm">Đang tải dữ liệu từ Google Sheets...</p>
      </div>
    );
  }

  if (!metrics) {
      return (
          <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 flex flex-col items-center text-center">
                  <AlertTriangle className="text-yellow-500 mb-4" size={48} />
                  <h3 className="text-lg font-bold text-gray-800">Chưa kết nối Google Sheet</h3>
                  <p className="text-gray-600 mt-2 max-w-md">
                      Vui lòng Deploy Google Apps Script và dán URL Web App vào file <code>services/sheetService.ts</code> để bắt đầu sử dụng.
                  </p>
              </div>
          </div>
      )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Doanh số tổng" 
          value={`${metrics.revenue.toLocaleString('vi-VN')} đ`}
          subValue="Tháng này"
          bgColor="bg-blue-600"
          icon={<ShoppingCart size={40} />}
        />
        <StatCard 
          title="Lợi nhuận" 
          value={`${metrics.netIncome.toLocaleString('vi-VN')} đ`}
          bgColor="bg-emerald-500"
          icon={<DollarSign size={40} />}
        />
        <StatCard 
          title="Số lượng Store" 
          value={`${stores.length}`}
          subValue="Đang hoạt động"
          bgColor="bg-indigo-600"
          icon={<StoreIcon size={40} />}
        />
        <StatCard 
          title="Nhân sự" 
          value="12"
          subValue="Listing & Sale Team"
          bgColor="bg-orange-500"
          icon={<Users size={40} />}
        />
      </div>

      {/* Main Content: Store Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <StoreIcon className="text-orange-500" size={20} />
                Quản Lý Store
                </h2>
                <button 
                    onClick={handleManualRefresh}
                    className={`p-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-all ${isRefreshing ? 'animate-spin text-orange-500 bg-orange-50' : ''}`}
                    title="Làm mới dữ liệu ngay lập tức"
                >
                    <RefreshCw size={16} />
                </button>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500">
                    {isRefreshing ? 'Đang cập nhật...' : 'Danh sách cửa hàng từ Google Sheet. Tự động cập nhật mỗi 2 phút.'}
                </p>
            </div>
          </div>
          
          {/* PHÂN QUYỀN: Chỉ Admin mới thấy nút Thêm Store */}
          {user.role === 'admin' && (
            <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
            >
                <Plus size={18} />
                <span>Thêm Store Mới</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <th className="px-6 py-4 w-1/12">ID</th>
                <th className="px-6 py-4 w-3/12">Tên Store / Link</th>
                <th className="px-6 py-4 w-2/12">Region</th>
                <th className="px-6 py-4 w-2/12 text-center">Trạng Thái</th>
                <th className="px-6 py-4 w-1/12 bg-blue-50/50 text-blue-800">
                   Listing
                </th>
                <th className="px-6 py-4 w-1/12 bg-green-50/50 text-green-800">
                   Sale
                </th>
                <th className="px-6 py-4 w-1/12 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {stores.map((store) => {
                  const statusText = store.status ? store.status.toUpperCase() : '';
                  const isLive = statusText === 'LIVE' || statusText === 'ACTIVE';
                  
                  return (
                    <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-400">{store.id}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800">{store.name}</div>
                        {store.url && (
                          <a href={store.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                            <LinkIcon size={10} /> {store.url.replace(/^https?:\/\//, '')} <ExternalLink size={10} />
                          </a>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {store.region ? (
                            <div className="flex items-center gap-1">
                                <MapPin size={14} className="text-gray-400"/>
                                <span className="font-medium">{store.region}</span>
                            </div>
                        ) : (
                             <span className="text-gray-300 text-xs italic">---</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            isLive 
                                ? 'bg-green-100 text-green-700 border border-green-200' 
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {store.status || 'N/A'}
                        </span>
                      </td>

                      {/* Listing Column (Formatted Number) */}
                      <td className="px-6 py-4 bg-blue-50/30 font-medium text-gray-700">
                        {formatNumber(store.listing)}
                      </td>

                      {/* Sale Column (Formatted Number) */}
                      <td className="px-6 py-4 bg-green-50/30 font-medium text-gray-700">
                        {formatNumber(store.sale)}
                      </td>

                      {/* PHÂN QUYỀN: Chỉ Admin mới thấy nút Xóa */}
                      <td className="px-6 py-4 text-center">
                        {user.role === 'admin' && (
                            <button 
                            onClick={(e) => onRequestDelete(e, store)}
                            disabled={deletingId === store.id}
                            className={`relative z-10 p-2 rounded-full transition-all ${
                                deletingId === store.id 
                                ? 'text-red-300 cursor-not-allowed bg-red-50'
                                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                            }`}
                            title="Xóa Store"
                            >
                            {deletingId === store.id ? (
                                <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full"></div>
                            ) : (
                                <Trash2 size={16} />
                            )}
                            </button>
                        )}
                      </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
          {stores.length === 0 && (
             <div className="p-8 text-center text-gray-500">Chưa có Store nào hoặc chưa tải được dữ liệu.</div>
          )}
        </div>
      </div>

      {/* --- MODAL 1: CONFIRM DELETE --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm mx-4 overflow-hidden transform transition-all scale-100">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Xác nhận xóa</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Bạn có chắc chắn muốn xóa store <span className="font-bold text-gray-800">"{confirmModal.storeName}"</span> không?
                  <br/>Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={handleConfirmDelete}
              >
                Xóa ngay
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: RESULT NOTIFICATION --- */}
      {resultModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end">
          <div className="max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden animate-slide-in">
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {resultModal.type === 'success' ? (
                    <CheckCircle className="h-6 w-6 text-green-400" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  )}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">
                    {resultModal.type === 'success' ? 'Thành công' : 'Thất bại'}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {resultModal.message}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={() => setResultModal({ ...resultModal, isOpen: false })}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Store Mới */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Thêm Store Mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Store</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ví dụ: Giày Store HCM"
                  value={newStoreData.name}
                  onChange={(e) => setNewStoreData({...newStoreData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link (URL)</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="https://..."
                  value={newStoreData.url}
                  onChange={(e) => setNewStoreData({...newStoreData, url: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region (Khu vực)</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ví dụ: US, UK, VN..."
                  value={newStoreData.region}
                  onChange={(e) => setNewStoreData({...newStoreData, region: e.target.value})}
                />
              </div>
              <p className="text-xs text-gray-500 italic">
                * Trạng thái mặc định là "LIVE". Các thông tin Listing/Sale sẽ được cập nhật từ Google Sheet.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={handleAddStore}
                className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors font-medium"
              >
                Lưu Store
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
