
export enum OrderStatus {
  PENDING = 'Chờ xử lý',
  PROCESSING = 'Đang giao',
  COMPLETED = 'Hoàn thành',
  CANCELLED = 'Đã hủy'
}

export interface Order {
  id: string;
  customerName: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  status: OrderStatus;
  date: string; // YYYY-MM-DD
}

export interface Store {
  id: string;
  name: string;
  url: string;
  region: string; 
  status: string; 
  listing: string;
  sale: string;
}

export interface DashboardMetrics {
  revenue: number;
  netIncome: number;
  inventoryValue: number;
  debt: number;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface DailyRevenue {
  date: string;
  amount: number;
}

// --- AUTH TYPES ---
export interface User {
  username: string;
  fullName: string;
  role: 'admin' | 'leader' | 'support' | 'designer' | 'idea' | string;
  email?: string;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}