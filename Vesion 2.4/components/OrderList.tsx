
import React, { useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, Copy, ArrowUp, ArrowDown, Save, ExternalLink, Calendar, FileSpreadsheet, ChevronLeft, ChevronRight, UserCircle } from 'lucide-react';
import { sheetService } from '../services/sheetService';
import { Order, Store, User } from '../types';

// Helper: Lấy tháng hiện tại theo giờ địa phương (YYYY-MM)
const getCurrentLocalMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

interface OrderListProps {
    user?: User; // Nhận thêm prop user
}

const OrderList: React.FC<OrderListProps> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [units, setUnits] = useState<string[]>([]); // Danh sách Đơn vị
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Order; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });
  
  // State quản lý tháng đang xem
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentLocalMonth());
  // State lưu ID file Google Sheet của tháng hiện tại
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State cho việc thêm Unit mới
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  
  // Tạo danh sách Năm để chọn (Ví dụ: Từ 2020 đến 2030)
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const monthsList = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  
  // State form tạo mới
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    id: '', 
    date: new Date().toISOString().split('T')[0], 
    storeId: '', 
    sku: '', 
    type: '', 
    quantity: '1',
    note: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderResult, storeData, unitList] = await Promise.all([
          sheetService.getOrders(selectedMonth), 
          sheetService.getStores(),
          sheetService.getUnits()
      ]);
      setOrders(orderResult.orders);
      setCurrentFileId(orderResult.fileId); 
      setStores(storeData);
      setUnits(unitList);
    } catch (e) {
      console.error(e);
      setOrders([]);
      setCurrentFileId(null);
    } finally {
      setLoading(false);
    }
  };

  // Reload khi thay đổi tháng
  useEffect(() => { loadData(); }, [selectedMonth]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.id || !newOrder.storeId) return alert("Thiếu thông tin bắt buộc");

    setIsSubmitting(true);
    try {
        const selectedStore = stores.find(s => s.id === newOrder.storeId);
        
        const orderToSave = {
            ...newOrder,
            storeId: selectedStore ? selectedStore.name : newOrder.storeId,
            status: 'Pending',
            tracking: '',
            link: '',
            note: newOrder.note || '',
            handler: user?.username || 'Unknown' // Tự động lấy user đang đăng nhập
        };

        await sheetService.addOrder(orderToSave as Order);
        
        // Nếu tháng của đơn mới trùng với tháng đang xem -> reload
        const orderMonth = (newOrder.date || '').slice(0, 7);
        if (orderMonth === selectedMonth) {
           await loadData();
        } else {
           alert(`Đơn hàng đã được lưu vào file tháng ${orderMonth}. Vui lòng chuyển sang tháng đó để xem.`);
        }

        setIsModalOpen(false);
        setNewOrder({ 
            id: '', 
            date: new Date().toISOString().split('T')[0], 
            storeId: '', 
            sku: '', 
            type: '', 
            quantity: '1',
            note: ''
        });
        
    } catch (error) { 
        alert("Lỗi lưu đơn hàng"); 
    } finally { 
        setIsSubmitting(false); 
    }
  };

  // Xử lý thêm Unit mới
  const handleAddUnit = async () => {
    if (!newUnitName.trim()) return;
    try {
      await sheetService.addUnit(newUnitName.trim());
      const updatedUnits = await sheetService.getUnits();
      setUnits(updatedUnits);
      setNewOrder({ ...newOrder, type: newUnitName.trim() }); // Tự chọn unit mới
      setIsAddingUnit(false);
      setNewUnitName('');
    } catch (error) {
      alert("Lỗi khi thêm Đơn vị");
    }
  };

  const getStoreName = (id: string) => {
      const store = stores.find(s => String(s.id) === String(id) || s.name === id);
      return store ? store.name : id;
  };

  const getStatusColorClass = (status: string) => {
    const s = String(status).toLowerCase();
    if (s === 'fulfilled' || s === 'completed') return 'text-green-700 bg-green-50 border-green-200';
    if (s === 'pending' || s === 'processing') return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    if (s === 'cancelled') return 'text-red-700 bg-red-50 border-red-200';
    if (s === 'refund') return 'text-purple-700 bg-purple-50 border-purple-200';
    if (s === 'resend') return 'text-blue-700 bg-blue-50 border-blue-200';
    return 'text-gray-700 bg-gray-50 border-gray-200';
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const [y, m, d] = dateStr.split('-');
        if (y && m && d) return `${d}/${m}/${y}`;
        return dateStr;
    } catch (e) { return dateStr; }
  };

  // Logic điều hướng tháng
  const handleMonthChange = (step: number) => {
    try {
        const [year, month] = selectedMonth.split('-').map(Number);
        const date = new Date(year, month - 1 + step, 1);
        const newYear = date.getFullYear();
        const newMonth = String(date.getMonth() + 1).padStart(2, '0');
        setSelectedMonth(`${newYear}-${newMonth}`);
    } catch (e) {
        console.error("Invalid date", e);
    }
  };

  const handleOrderChange = (index: number, field: keyof Order, value: any) => {
    const updatedOrders = [...orders];
    updatedOrders[index] = { ...updatedOrders[index], [field]: value };
    setOrders(updatedOrders);
  };

  const filteredOrders = orders.filter(o => 
    (o.id ? String(o.id).toLowerCase() : '').includes(searchTerm.toLowerCase()) || 
    (o.sku ? String(o.sku).toLowerCase() : '').includes(searchTerm.toLowerCase()) ||
    (o.tracking ? String(o.tracking).toLowerCase() : '').includes(searchTerm.toLowerCase()) ||
    (o.storeId ? getStoreName(o.storeId).toLowerCase() : '').includes(searchTerm.toLowerCase()) ||
    (o.handler ? String(o.handler).toLowerCase() : '').includes(searchTerm.toLowerCase())
  );

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortConfig.key === 'date') {
        const dateA = new Date(a.date || '').getTime();
        const dateB = new Date(b.date || '').getTime();
        if (isNaN(dateA)) return 1; if (isNaN(dateB)) return -1;
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  // Tách Year và Month từ state hiện tại để bind vào select
  const [currentYearStr, currentMonthStr] = selectedMonth.split('-');

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <div className="bg-white shadow-sm overflow-hidden rounded-lg">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex flex-col xl:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
            <h2 className="text-xl font-bold text-gray-800 whitespace-nowrap flex items-center gap-2">
                DANH SÁCH ĐƠN HÀNG
                <button onClick={loadData} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors" title="Làm mới">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </h2>
            
            {/* Bộ chọn tháng và Link File */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-center">
                <div className="flex items-center bg-white rounded-lg border border-gray-300 shadow-sm p-1">
                    <button 
                        onClick={() => handleMonthChange(-1)}
                        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"
                        title="Tháng trước"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    
                    <div className="flex items-center px-2 border-l border-r border-gray-100 gap-1 min-w-[160px] justify-center">
                        <Calendar size={14} className="text-orange-500 mr-1" />
                        
                        {/* Chọn Tháng */}
                        <select 
                            value={currentMonthStr} 
                            onChange={(e) => setSelectedMonth(`${currentYearStr}-${e.target.value}`)}
                            className="font-bold text-gray-700 bg-transparent cursor-pointer outline-none appearance-none hover:bg-gray-50 rounded px-1 py-1 text-center text-sm"
                        >
                            {monthsList.map(m => (
                                <option key={m} value={m}>Tháng {parseInt(m)}</option>
                            ))}
                        </select>
                        
                        <span className="text-gray-400">/</span>

                        {/* Chọn Năm */}
                        <select 
                            value={currentYearStr} 
                            onChange={(e) => setSelectedMonth(`${e.target.value}-${currentMonthStr}`)}
                            className="font-bold text-gray-700 bg-transparent cursor-pointer outline-none appearance-none hover:bg-gray-50 rounded px-1 py-1 text-sm"
                        >
                            {yearsList.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={() => handleMonthChange(1)}
                        className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors"
                        title="Tháng sau"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
                
                {/* HIỂN THỊ LINK SHEET */}
                {currentFileId ? (
                    <a 
                        href={`https://docs.google.com/spreadsheets/d/${currentFileId}/edit`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors shadow-sm text-sm font-medium h-[42px]"
                        title={`Mở file Google Sheet tháng ${selectedMonth}`}
                    >
                        <FileSpreadsheet size={18} />
                        <span className="hidden sm:inline">Mở Sheet</span>
                    </a>
                ) : (
                    <div className="h-[42px] px-3 flex items-center justify-center bg-gray-50 text-gray-400 border border-gray-200 rounded-lg text-xs italic">
                        No File
                    </div>
                )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
             <div className="relative flex-1 sm:flex-none sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Tìm ID, SKU, Tracking, User..." 
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full focus:ring-2 focus:ring-[#1a4019] focus:border-transparent outline-none shadow-sm" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
             </div>
             <button 
                onClick={() => setIsModalOpen(true)} 
                className="flex items-center justify-center gap-2 bg-[#1a4019] hover:bg-[#143013] text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow-md whitespace-nowrap"
             >
                <Plus size={18} /> 
                <span>Thêm Đơn</span>
             </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#1a4019] text-white font-bold text-center uppercase text-xs tracking-wider">
                <th className="px-3 py-3 border-r border-gray-600 cursor-pointer hover:bg-[#235221] transition-colors" onClick={() => {
                     setSortConfig({ key: 'date', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' });
                }}>
                    <div className="flex items-center justify-center gap-1">Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>)}</div>
                </th>
                <th className="px-3 py-3 border-r border-gray-600">ID Order Etsy</th>
                <th className="px-3 py-3 border-r border-gray-600">STORE</th>
                <th className="px-3 py-3 border-r border-gray-600 w-24">Đơn vị</th>
                <th className="px-3 py-3 border-r border-gray-600">SKU</th>
                <th className="px-3 py-3 border-r border-gray-600 w-16">Qty</th>
                <th className="px-3 py-3 border-r border-gray-600 w-32">Tracking</th>
                <th className="px-3 py-3 border-r border-gray-600 w-32">Link Tracking</th>
                <th className="px-3 py-3 border-r border-gray-600 w-32">Trạng Thái</th>
                <th className="px-3 py-3 bg-yellow-400 text-black border-l border-gray-600 min-w-[150px]">Note</th>
                <th className="px-3 py-3 border-l border-gray-600 w-32">Người xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? 
                <tr><td colSpan={11} className="text-center py-12 text-gray-500">Đang tải dữ liệu tháng {selectedMonth}...</td></tr> : 
                (sortedOrders.length === 0 ? 
                    <tr><td colSpan={11} className="text-center py-12 text-gray-500">Tháng {selectedMonth} chưa có đơn hàng nào.</td></tr> :
                    sortedOrders.map((order, idx) => (
                        <tr key={order.id || idx} className="hover:bg-gray-50 border-b border-gray-200 text-gray-800 transition-colors">
                            {/* DATE & ID & STORE */}
                            <td className="px-2 py-3 border-r text-center whitespace-nowrap text-gray-600">{formatDateDisplay(order.date)}</td>
                            <td className="px-3 py-3 border-r font-semibold text-gray-900 whitespace-nowrap">
                                <div className="flex justify-between items-center group gap-2">
                                    <span>{order.id}</span>
                                    <button className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigator.clipboard.writeText(order.id)} title="Copy ID">
                                        <Copy size={12} />
                                    </button>
                                </div>
                            </td>
                            <td className="px-3 py-3 border-r text-gray-700">{getStoreName(order.storeId)}</td>
                            
                            {/* EDITABLE FIELDS */}
                            <td className="px-1 py-1 border-r">
                                <input 
                                    type="text"
                                    className="w-full h-full bg-transparent text-center focus:bg-white focus:ring-1 focus:ring-blue-500 border border-transparent focus:border-blue-300 rounded px-1 text-gray-700"
                                    value={order.type}
                                    onChange={(e) => handleOrderChange(idx, 'type', e.target.value)}
                                />
                            </td>
                            <td className="px-1 py-1 border-r">
                                <input 
                                    type="text"
                                    className="w-full h-full bg-transparent focus:bg-white focus:ring-1 focus:ring-blue-500 border border-transparent focus:border-blue-300 rounded px-1 font-mono text-xs text-gray-600"
                                    value={order.sku}
                                    onChange={(e) => handleOrderChange(idx, 'sku', e.target.value)}
                                />
                            </td>
                            <td className="px-1 py-1 border-r">
                                <input 
                                    type="number"
                                    className="w-full h-full bg-transparent text-center font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 border border-transparent focus:border-blue-300 rounded px-1 text-gray-800"
                                    value={order.quantity}
                                    onChange={(e) => handleOrderChange(idx, 'quantity', e.target.value)}
                                />
                            </td>
                            <td className="px-1 py-1 border-r">
                                <input 
                                    type="text"
                                    className="w-full h-full bg-transparent text-center font-mono text-xs focus:bg-white focus:ring-1 focus:ring-blue-500 border border-transparent focus:border-blue-300 rounded px-1 text-gray-600"
                                    placeholder="..."
                                    value={order.tracking}
                                    onChange={(e) => handleOrderChange(idx, 'tracking', e.target.value)}
                                />
                            </td>
                            <td className="px-1 py-1 border-r text-center relative group">
                                <input 
                                    type="text"
                                    className="w-full h-full bg-transparent text-left text-xs text-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 border border-transparent focus:border-blue-300 rounded px-1 pr-6 truncate"
                                    placeholder="URL..."
                                    value={order.link}
                                    onChange={(e) => handleOrderChange(idx, 'link', e.target.value)}
                                />
                                {order.link && (
                                    <a href={order.link} target="_blank" className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 p-1">
                                        <ExternalLink size={12} />
                                    </a>
                                )}
                            </td>
                            <td className="px-1 py-1 border-r text-center">
                                <select 
                                    className={`w-full h-full text-xs font-bold border rounded px-1 py-1 cursor-pointer focus:ring-1 focus:ring-blue-500 outline-none appearance-none text-center ${getStatusColorClass(order.status as string)}`}
                                    value={order.status as string}
                                    onChange={(e) => handleOrderChange(idx, 'status', e.target.value)}
                                >
                                    <option value="Pending" className="bg-white text-gray-700">Pending</option>
                                    <option value="Fulfilled" className="bg-white text-gray-700">Fulfilled</option>
                                    <option value="Cancelled" className="bg-white text-gray-700">Cancelled</option>
                                    <option value="Resend" className="bg-white text-gray-700">Resend</option>
                                    <option value="Refund" className="bg-white text-gray-700">Refund</option>
                                </select>
                            </td>
                            <td className="px-0 py-0 bg-yellow-50 border-l relative h-full">
                                <textarea 
                                    className="w-full h-full min-h-[50px] bg-transparent resize-none border-none focus:ring-0 text-xs p-2 text-gray-800 leading-tight"
                                    value={order.note}
                                    placeholder="..."
                                    onChange={(e) => handleOrderChange(idx, 'note', e.target.value)}
                                />
                            </td>
                            {/* Cột Người Xử Lý */}
                            <td className="px-2 py-3 border-l text-center text-xs text-gray-600 font-medium whitespace-nowrap bg-gray-50/50">
                                <div className="flex items-center justify-center gap-1.5">
                                    <UserCircle size={14} className="text-gray-400"/>
                                    {order.handler || user?.username}
                                </div>
                            </td>
                        </tr>
                    ))
                )
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL TẠO ĐƠN HÀNG MỚI --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl transform transition-all scale-100">
                
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <Plus className="bg-[#1a4019] text-white rounded-full p-1" size={24} />
                        TẠO ĐƠN HÀNG
                    </h3>
                    <button 
                        onClick={() => setIsModalOpen(false)} 
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded-full"
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleCreateOrder} className="p-6">
                    <div className="space-y-4">
                        {/* Hàng 1: Date & ID */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-1">Ngày Đặt <span className="text-red-500">*</span></label>
                                <input 
                                    type="date" 
                                    required 
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4019]"
                                    value={newOrder.date} 
                                    onChange={(e) => setNewOrder({...newOrder, date: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-1">Mã Đơn (ID) <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    required 
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4019]"
                                    placeholder="ORD-..." 
                                    value={newOrder.id} 
                                    onChange={(e) => setNewOrder({...newOrder, id: e.target.value})} 
                                />
                            </div>
                        </div>

                        {/* Hàng 2: Store */}
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-1">Cửa Hàng (Store) <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <select 
                                    required 
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4019] appearance-none"
                                    value={newOrder.storeId} 
                                    onChange={(e) => setNewOrder({...newOrder, storeId: e.target.value})}
                                >
                                    <option value="" className="text-gray-400">-- Chọn Store --</option>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <ArrowDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Hàng 3: Loại & Số lượng */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-1 flex justify-between">
                                    Đơn vị (Type)
                                    {user?.role === 'admin' && (
                                        <button 
                                            type="button"
                                            onClick={() => setIsAddingUnit(true)}
                                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                                        >
                                            <Plus size={10} className="mr-0.5" /> Thêm
                                        </button>
                                    )}
                                </label>
                                {isAddingUnit ? (
                                    <div className="flex gap-2 animate-fade-in">
                                        <input 
                                            type="text"
                                            className="flex-1 border border-blue-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                                            placeholder="Tên đơn vị..."
                                            value={newUnitName}
                                            onChange={(e) => setNewUnitName(e.target.value)}
                                            autoFocus
                                        />
                                        <button type="button" onClick={handleAddUnit} className="bg-blue-600 text-white px-3 rounded-md text-xs font-bold hover:bg-blue-700">OK</button>
                                        <button type="button" onClick={() => setIsAddingUnit(false)} className="bg-gray-200 text-gray-600 px-2 rounded-md text-xs hover:bg-gray-300">✕</button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <select
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4019] appearance-none"
                                            value={newOrder.type}
                                            onChange={(e) => setNewOrder({...newOrder, type: e.target.value})}
                                        >
                                            <option value="">-- Chọn Loại --</option>
                                            {units.map((u, i) => <option key={i} value={u}>{u}</option>)}
                                            <option value="Khác">Khác</option>
                                        </select>
                                        <ArrowDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-1">Số lượng</label>
                                <input 
                                    type="number" 
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4019] text-center font-bold" 
                                    value={newOrder.quantity} 
                                    onChange={(e) => setNewOrder({...newOrder, quantity: e.target.value})} 
                                />
                            </div>
                        </div>

                        {/* Hàng 4: SKU */}
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-1">SKU Sản Phẩm</label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4019] font-mono text-sm" 
                                placeholder="SKU-CODE..." 
                                value={newOrder.sku} 
                                onChange={(e) => setNewOrder({...newOrder, sku: e.target.value})} 
                            />
                        </div>

                        {/* Hàng 5: Note */}
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-1">Ghi chú (Note)</label>
                            <textarea 
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4019] text-sm resize-none" 
                                rows={2}
                                placeholder="Ghi chú..." 
                                value={newOrder.note} 
                                onChange={(e) => setNewOrder({...newOrder, note: e.target.value})} 
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)} 
                            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="px-6 py-2.5 bg-[#1a4019] hover:bg-[#143013] text-white rounded-md font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                        >
                            {isSubmitting ? <RefreshCw className="animate-spin" size={20}/> : <Save size={20} />}
                            {isSubmitting ? 'Đang lưu...' : 'Lưu Đơn'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;
