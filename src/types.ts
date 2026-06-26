export interface Company {
  id: string;
  name: string;
  taxNumber: string;
  taxOffice: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface User {
  id: string;
  companyId: string;
  companyName?: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  tcNo?: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  address: string;
  balance: number;
  createdAt: string;
}

export interface Product {
  id: string;
  category: string;
  subcategory: string;
  brand: string;
  name: string;
  shortDesc: string;
  longDesc: string;
  stock: number;
  stockCode: string;
  barcode: string;
  unit: string;
  price: number;
  vatRate: number;
  images: string[];
  videoUrl?: string;
  variants?: string;
  isCampaign: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  vatRate: number;
  quantity: number;
  image: string;
  stockCode: string;
}

export interface Order {
  id: string;
  orderNo: string;
  companyId: string;
  companyName?: string;
  userId: string;
  userName?: string;
  date: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  status: 'pending' | 'approved' | 'preparing' | 'shipping' | 'delivered' | 'cancelled';
  address: string;
  products: OrderItem[];
  note?: string;
  statusHistory: { status: string; date: string; note?: string; updatedBy: string }[];
  createdAt: string;
}

export interface BalanceMovement {
  id: string;
  userId: string;
  userName?: string;
  email?: string;
  companyName?: string;
  type: 'add' | 'spend' | 'refund';
  amount: number;
  prevBalance: number;
  newBalance: number;
  orderId?: string;
  note: string;
  date: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  type: 'balance' | 'order' | 'announcement';
  date: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  date: string;
}

export interface Category {
  id: string;
  name: string;
  image: string;
}
