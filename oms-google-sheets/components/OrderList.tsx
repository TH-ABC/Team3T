import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Download, ExternalLink } from 'lucide-react';
import { sheetService } from '../services/sheetService';
import { Order, OrderStatus } from '../types';

const OrderList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    const data = await sheetService.getOrders();
    // Sort by newest
    setOrders(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAddOrder = async () => {
    const newOrder = {
        customerName: "Khách mới " + Math.floor(Math.random()*100),
        productName: "Sản phẩm demo",
        quantity: 1,
        totalAmount: 500000,
        status: OrderStatus.PENDING,
        date: new Date().toISOString().split('T')[0]
    };
    await sheetService.addOrder(newOrder);
    await fetchOrders();
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.COMPLETED: return 'bg-green-100 text-green-700 border-green-200';
      case OrderStatus.PROCESSING: return 'bg-blue-100 text-blue-700 border-blue-200';
      case OrderStatus.CANCELLED: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const filteredOrders = orders.filter(o => 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header Actions */}
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800">Danh Sách Đơn Hàng</h2>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{orders.length}</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
             <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Tìm mã đơn, tên khách..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <button className="p-2 text-gray-600 hover:bg-gray-50 border border-gray-200 rounded-md">
                <Filter size={18} />
             </button>
             <button 
                onClick={handleAddOrder}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
             >
                <Plus size={18} />
                <span>Tạo Đơn</span>
             </button>
          </div>
        </div>

        {/* Simulated Sheet Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <th className="px-6 py-4">Mã Đơn</th>
                <th className="px-6 py-4">Ngày Tạo</th>
                <th className="px-6 py-4">Khách Hàng</th>
                <th className="px-6 py-4">Sản Phẩm</th>
                <th className="px-6 py-4 text-right">Tổng Tiền</th>
                <th className="px-6 py-4 text-center">Trạng Thái</th>
                <th className="px-6 py-4 text-center">Sheet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                 <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">Đang tải dữ liệu từ Google Sheet...</td>
                 </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">Không tìm thấy đơn hàng nào.</td>
                 </tr>
              ) : (
                filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-blue-50/50 transition-colors group cursor-pointer">
                    <td className="px-6 py-4 font-medium text-blue-600">{order.id}</td>
                    <td className="px-6 py-4 text-gray-600">{order.date}</td>
                    <td className="px-6 py-4 font-medium text-gray-800">{order.customerName}</td>
                    <td className="px-6 py-4 text-gray-600">
                        {order.productName} 
                        <span className="text-gray-400 text-xs ml-1">(x{order.quantity})</span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{order.totalAmount.toLocaleString('vi-VN')} đ</td>
                    <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {order.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <button className="text-gray-400 hover:text-green-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink size={16} />
                        </button>
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer / Pagination Mock */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
            <span>Hiển thị {filteredOrders.length} kết quả</span>
            <div className="flex gap-2">
                <button className="px-3 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50" disabled>Trước</button>
                <button className="px-3 py-1 border rounded bg-white hover:bg-gray-100">Sau</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default OrderList;
