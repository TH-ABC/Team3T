
import { Order, OrderStatus, DailyRevenue, Store, User, AuthResponse, DailyStat, StoreHistoryItem } from '../types';

// ============================================================================
// CẤU HÌNH KẾT NỐI GOOGLE SHEET
// ============================================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbyw4ZdfirgKUHyXMH8Ro7UZ6-VWCdf1hgqU37ilLvNt2RwzusSPG_HUc_mi8z-9tInR/exec'; 
// ============================================================================

const callAPI = async (action: string, method: 'GET' | 'POST' = 'GET', data?: any) => {
  const cleanUrl = API_URL.trim();
  if (cleanUrl.includes('HAY_DAN_URL') || !cleanUrl) {
    console.warn("Chưa cấu hình API URL Google Apps Script.");
    return [];
  }

  const nocache = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  let url = `${cleanUrl}?action=${action}&_t=${nocache}`;
  
  if (method === 'GET' && data) {
    const params = new URLSearchParams(data).toString();
    url += `&${params}`;
  }
  
  const options: RequestInit = {
    method: method,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  };

  if (method === 'POST') {
    options.body = JSON.stringify({ action: action, ...data });
  }

  try {
    const response = await fetch(url, options);
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      if (json && json.error) return { success: false, error: json.error };
      return json;
    } catch (e) {
      return { success: false, error: "Lỗi phản hồi từ Google Sheet." };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
};

const parseSheetNumber = (val: any): string => {
  if (val === null || val === undefined || val === '') return '0';
  if (typeof val === 'number') return String(val);
  const str = String(val).trim().replace(/,/g, '');
  const num = Number(str); 
  return isNaN(num) ? '0' : String(num);
};

const getClientIP = async (): Promise<string> => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip || 'Unknown';
    } catch (error) { return 'Unknown'; }
};

export const sheetService = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const userIP = await getClientIP();
    const result = await callAPI('login', 'POST', { username, password, ip: userIP });
    if (result.success && result.user) return { success: true, user: result.user };
    return { success: false, error: result.error || 'Đăng nhập thất bại' };
  },

  createUser: async (userData: any): Promise<AuthResponse> => {
    return await callAPI('createUser', 'POST', userData);
  },

  // GET ORDERS: Hỗ trợ lấy theo tháng (YYYY-MM) và trả về cả File ID
  getOrders: async (monthYear?: string): Promise<{ orders: Order[], fileId: string | null }> => {
    const targetMonth = monthYear || new Date().toISOString().slice(0, 7);
    
    // Gửi param 'month' để Backend biết lấy từ file nào
    const data = await callAPI('getOrders', 'GET', { month: targetMonth });
    
    // Xử lý dữ liệu trả về từ Backend (cấu trúc { orders: [], fileId: "..." })
    // Cần kiểm tra kỹ data trả về để tránh null pointer
    if (data) {
        // Trường hợp 1: API trả về đúng chuẩn { orders: [], fileId: ... }
        if (data.orders && Array.isArray(data.orders)) {
            const mappedOrders = data.orders.map((item: any) => ({
                date: item.date ? String(item.date) : '',        // Col A
                id: String(item.id || ''),                        // Col B
                storeId: String(item.storeId || ''),              // Col C
                type: String(item.type || ''),                    // Col D
                sku: String(item.sku || ''),                      // Col E
                quantity: item.quantity || '1',                   // Col F
                tracking: String(item.tracking || ''),            // Col G
                link: item.link || '',                            // Col H
                status: item.status || 'Pending',                 // Col I
                note: item.note || ''                             // Col J
            }));
            return { orders: mappedOrders, fileId: data.fileId || null };
        }
        
        // Trường hợp 2: API trả về mảng trực tiếp (legacy support)
        if (Array.isArray(data)) {
            // ... Logic map cũ ...
             const mappedOrders = data.map((item: any) => ({
                date: item.date ? String(item.date) : '',
                id: String(item.id || ''),
                storeId: String(item.storeId || ''),
                type: String(item.type || ''),
                sku: String(item.sku || ''),
                quantity: item.quantity || '1',
                tracking: String(item.tracking || ''),
                link: item.link || '',
                status: item.status || 'Pending',
                note: item.note || ''
            }));
            return { orders: mappedOrders, fileId: null };
        }
    }
    
    return { orders: [], fileId: null };
  },

  addOrder: async (order: Order): Promise<Order> => {
    await callAPI('addOrder', 'POST', order);
    return order;
  },

  getStores: async (): Promise<Store[]> => {
    const data = await callAPI('getStores', 'GET');
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
          id: String(item.id || ''),
          name: item.name,
          url: item.url,
          region: item.region || '', 
          status: item.status || 'LIVE',
          listing: parseSheetNumber(item.listing),
          sale: parseSheetNumber(item.sale)
      }));
    }
    return [];
  },

  addStore: async (storeData: any): Promise<Store> => {
    const newStore: Store = {
      id: `ST-${Date.now().toString().slice(-6)}`,
      name: storeData.name,
      url: storeData.url,
      region: storeData.region,
      status: 'LIVE', listing: '0', sale: '0'
    };
    await callAPI('addStore', 'POST', newStore);
    return newStore;
  },

  deleteStore: async (storeId: string): Promise<any> => {
    return await callAPI('deleteStore', 'POST', { id: storeId });
  },

  getDailyStats: async (): Promise<DailyStat[]> => {
    const data = await callAPI('getDailyStats', 'GET');
    return Array.isArray(data) ? data : [];
  },
  
  getStoreHistory: async (storeId: string): Promise<StoreHistoryItem[]> => {
    const data = await callAPI('getStoreHistory', 'POST', { storeId });
    return Array.isArray(data) ? data : [];
  },

  triggerDebugSnapshot: async (): Promise<any> => {
      return await callAPI('debugSnapshot', 'POST', {});
  },

  getDashboardStats: async () => {
    const stores = await sheetService.getStores();
    const totalSalesCount = stores.reduce((sum, s) => sum + (Number(s.sale.replace(/,/g,'')) || 0), 0);
    const revenue = totalSalesCount * 500000;
    return { revenue, netIncome: revenue * 0.3, inventoryValue: 55000000, debt: 0 };
  },

  getDailyRevenue: async (): Promise<DailyRevenue[]> => { return []; }
};
