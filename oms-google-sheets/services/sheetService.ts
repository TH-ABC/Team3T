
import { Order, OrderStatus, DailyRevenue, Store, User, AuthResponse } from '../types';

// ============================================================================
// CẤU HÌNH KẾT NỐI GOOGLE SHEET
// ============================================================================
// LƯU Ý: Nếu bạn tạo file Script mới, HÃY CẬP NHẬT URL MỚI VÀO DÒNG DƯỚI ĐÂY:
const API_URL = 'https://script.google.com/macros/s/AKfycbyw4ZdfirgKUHyXMH8Ro7UZ6-VWCdf1hgqU37ilLvNt2RwzusSPG_HUc_mi8z-9tInR/exec'; 

// ============================================================================

const callAPI = async (action: string, method: 'GET' | 'POST' = 'GET', data?: any) => {
  const cleanUrl = API_URL.trim();
  if (cleanUrl.includes('HAY_DAN_URL') || !cleanUrl) {
    console.warn("Chưa cấu hình API URL Google Apps Script.");
    if (action === 'getStores') return [];
    if (action === 'getOrders') return [];
    return { success: false, error: "Missing API URL" };
  }

  // Thêm timestamp (_t) để ngăn chặn cache
  const nocache = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  let url = `${cleanUrl}?action=${action}&_t=${nocache}`;
  
  const options: RequestInit = {
    method: method,
    headers: {
      'Content-Type': 'text/plain;charset=utf-8', 
    },
  };

  if (method === 'POST') {
    const payload = {
      action: action,
      ...data
    };
    options.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(url, options);
    const text = await response.text();
    
    try {
      const json = JSON.parse(text);
      
      // KIỂM TRA LỖI GOOGLE SCRIPT TRẢ VỀ RỖNG (Do chưa update version)
      if (action === 'login' && Object.keys(json).length === 0) {
        return { 
            success: false, 
            error: "LỖI DEPLOY: Google Script chưa cập nhật 'New Version'. Vui lòng Deploy lại." 
        };
      }

      if (json && json.error) {
        console.error(`Google Script Error [${action}]:`, json.error);
        return { success: false, error: json.error };
      }
      return json;
    } catch (e) {
      console.error("API response is not JSON:", text);
      return { success: false, error: "Lỗi phản hồi từ Google Sheet (HTML thay vì JSON)." };
    }
  } catch (error) {
    console.error(`API Error [${action}]:`, error);
    return { success: false, error: String(error) };
  }
};

// Hàm hỗ trợ làm sạch dữ liệu số từ Sheet
const parseSheetNumber = (val: any): string => {
  if (val === null || val === undefined || val === '') return '0';
  if (typeof val === 'number') return String(val);
  const str = String(val).trim();
  if (!str) return '0';
  const cleanStr = str.replace(/,/g, '');
  const num = Number(cleanStr); 
  return isNaN(num) ? '0' : String(num);
};

// Hàm lấy Public IP của Client
const getClientIP = async (): Promise<string> => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip || 'Unknown';
    } catch (error) {
        console.warn("Không thể lấy IP:", error);
        return 'Unknown';
    }
};

export const sheetService = {
  // --- AUTHENTICATION ---
  login: async (username: string, password: string): Promise<AuthResponse> => {
    // Trim khoảng trắng thừa để tránh lỗi nhập liệu
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    // Lấy IP trước khi gửi request
    const userIP = await getClientIP();

    console.log(`Đang đăng nhập: ${cleanUser} - IP: ${userIP}`);
    
    // Gửi kèm IP vào payload
    const result = await callAPI('login', 'POST', { 
        username: cleanUser, 
        password: cleanPass,
        ip: userIP 
    });
    
    // Debug log
    if (!result.success) {
        console.warn("Login failed response:", result);
    }

    if (result.success && result.user) {
      return { success: true, user: result.user };
    }
    return { success: false, error: result.error || 'Đăng nhập thất bại (Không rõ nguyên nhân)' };
  },

  createUser: async (userData: { username: string; password: string; fullName: string; role: string; email?: string; phone?: string }): Promise<AuthResponse> => {
    return await callAPI('createUser', 'POST', userData);
  },

  // --- ORDERS ---
  getOrders: async (): Promise<Order[]> => {
    const data = await callAPI('getOrders', 'GET');
    if (Array.isArray(data)) return data;
    return [];
  },

  addOrder: async (order: Omit<Order, 'id'>): Promise<Order> => {
    const newId = `ORD-${Date.now()}`;
    const newOrder: Order = { ...order, id: newId };
    await callAPI('addOrder', 'POST', newOrder);
    return newOrder;
  },

  // --- STORES ---
  getStores: async (): Promise<Store[]> => {
    const data = await callAPI('getStores', 'GET');
    
    if (Array.isArray(data)) {
      return data.map((item: any) => {
        let region = item.region || '';
        let status = item.status || '';
        let listing = item.listing;
        let sale = item.sale;

        // --- LOGIC XỬ LÝ DỮ LIỆU CŨ/MỚI (Auto-fix lệch cột) ---
        // Nếu Backend cũ trả về object roles (Version cũ chưa update)
        if (item.roles) {
             const statusStr = String(status).trim();
             // Nếu chưa có Region, thử đoán từ status nếu nó giống mã vùng (VD: US, VN)
             if (!region && statusStr.length <= 5) region = statusStr;
             
             // Mapping lại dữ liệu từ roles
             if (item.roles.idea) status = item.roles.idea;
             if (item.roles.support !== undefined) listing = item.roles.support;
             if (item.roles.designer !== undefined) sale = item.roles.designer;
        } 
        else {
            // Version mới (cấu trúc phẳng)
            // Auto-detect nếu bị lệch cột (Do Script chưa update nhưng Sheet đã thêm cột Region)
            const statusVal = String(status).trim().toUpperCase();
            const listingVal = String(listing).trim().toUpperCase();
            
            const looksLikeRegion = statusVal.length === 2 && /^[A-Z]{2}$/.test(statusVal); // VD: US, VN
            const looksLikeStatus = listingVal === 'LIVE' || listingVal === 'ACTIVE' || listingVal === 'SUSPEND';

            if ((looksLikeStatus || looksLikeRegion) && !region) {
                // Có vẻ cột bị lệch 1 nấc sang trái
                region = status;
                status = listing; 
                listing = sale;   
                sale = 0;         
            }
        }

        if (!status) status = 'LIVE';

        return {
          id: item.id,
          name: item.name,
          url: item.url,
          region: region, 
          status: status,
          listing: parseSheetNumber(listing),
          sale: parseSheetNumber(sale)
        };
      });
    }
    return [];
  },

  addStore: async (storeData: { name: string; url: string; region: string }): Promise<Store> => {
    const newId = `ST-${Date.now().toString().slice(-6)}`;
    const newStore: Store = {
      id: newId,
      name: storeData.name,
      url: storeData.url,
      region: storeData.region,
      status: 'LIVE',   
      listing: '0',      
      sale: '0'          
    };
    await callAPI('addStore', 'POST', newStore);
    return newStore;
  },

  deleteStore: async (storeId: string): Promise<{ success: boolean; error?: string }> => {
    const result = await callAPI('deleteStore', 'POST', { id: storeId });
    if (result && result.success === true) {
      return { success: true };
    }
    return { 
      success: false, 
      error: result?.error || "Không thể xóa. Vui lòng kiểm tra lại Google Sheet Script Deployment." 
    };
  },

  // --- DASHBOARD METRICS ---
  getDashboardStats: async () => {
    const orders = await sheetService.getOrders();
    const revenue = orders
      .filter(o => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    
    const expense = revenue * 0.7; 
    const netIncome = revenue - expense;
    const inventoryValue = 55000000;
    const debt = orders
      .filter(o => o.status === OrderStatus.PROCESSING)
      .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    return { revenue, netIncome, inventoryValue, debt };
  },

  getDailyRevenue: async (): Promise<DailyRevenue[]> => {
    const orders = await sheetService.getOrders();
    const map = new Map<string, number>();
    const sortedOrders = [...orders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedOrders.forEach(order => {
      if (order.status !== OrderStatus.CANCELLED) {
        const dateKey = order.date.split('T')[0];
        const current = map.get(dateKey) || 0;
        map.set(dateKey, current + (Number(order.totalAmount) || 0));
      }
    });

    return Array.from(map.entries()).slice(-15).map(([date, amount]) => ({ date, amount }));
  }
};
