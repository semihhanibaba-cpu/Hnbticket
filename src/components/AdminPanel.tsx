import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Building, Users, Package, ShoppingBag, CreditCard, 
  FileText, Play, Plus, Edit2, Trash2, CheckCircle, Clock, Truck, 
  X, AlertCircle, Search, Download, ShieldAlert, Key, Upload, FileSpreadsheet, Eye, Sliders, Tag
} from 'lucide-react';
import { Company, User, Product, Order, BalanceMovement, AuditLog, Category } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import Logo from './Logo';

interface AdminPanelProps {
  token: string;
  onLogout: () => void;
}

export default function AdminPanel({ token, onLogout }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'companies' | 'users' | 'products' | 'orders' | 'balances' | 'reports' | 'logs' | 'sliders' | 'categories'>('dashboard');
  
  // Data States
  const [metrics, setMetrics] = useState<any>(null);
  const [criticalStocks, setCriticalStocks] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [topCompanies, setTopCompanies] = useState<any[]>([]);
  const [lastOrders, setLastOrders] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [sliders, setSliders] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Modals & Forms
  const [showSliderModal, setShowSliderModal] = useState(false);
  const [editingSlider, setEditingSlider] = useState<any | null>(null);
  const [sliderForm, setSliderForm] = useState({
    title: '',
    desc: '',
    bg: 'bg-gradient-to-r from-emerald-800 to-teal-950',
    tag: 'KAMPANYA',
    status: 'active' as 'active' | 'inactive',
    image: '',
    isRedirect: false,
    redirectType: 'category' as 'category' | 'product',
    redirectTarget: ''
  });
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({ name: '', taxNumber: '', taxOffice: '', phone: '', address: '', status: 'active' as 'active' | 'inactive' });

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ companyId: '', name: '', surname: '', email: '', phone: '', tcNo: '', password: '', role: 'user' as 'admin' | 'user', status: 'active' as 'active' | 'inactive', address: '', initialBalance: '0' });

  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedUserForBalance, setSelectedUserForBalance] = useState<User | null>(null);
  const [balanceForm, setBalanceForm] = useState({ amount: '', note: '' });

  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({ category: '', subcategory: '', brand: '', name: '', shortDesc: '', longDesc: '', stock: '0', stockCode: '', barcode: '', unit: 'Adet', price: '0', vatRate: '20', isCampaign: false, status: 'active' as 'active' | 'inactive', imageInput: '' });

  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [orderStatusForm, setOrderStatusForm] = useState({ status: 'pending', note: '' });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  // Category State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', image: '' });

  // Custom Delete Confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'company' | 'user' | 'product' | 'slider' | 'category';
    id: string;
    title: string;
  } | null>(null);

  // Searches & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Report dates
  const [reportFilter, setReportFilter] = useState({ startDate: '', endDate: '', companyId: '', category: '' });

  // Dynamic filtered orders and metrics for Reports Tab
  const filteredOrdersForReport = React.useMemo(() => {
    return orders.filter(o => {
      // 1. Start date filter
      if (reportFilter.startDate) {
        const oDate = o.date || (o.createdAt ? o.createdAt.substring(0, 10) : '');
        if (oDate < reportFilter.startDate) return false;
      }
      // 2. End date filter
      if (reportFilter.endDate) {
        const oDate = o.date || (o.createdAt ? o.createdAt.substring(0, 10) : '');
        if (oDate > reportFilter.endDate) return false;
      }
      // 3. Company filter
      if (reportFilter.companyId && o.companyId !== reportFilter.companyId) return false;
      
      // 4. Category filter
      if (reportFilter.category) {
        const hasMatchingCategory = o.products?.some((item: any) => {
          const matchedProduct = products.find(p => p.id === item.productId || p.stockCode === item.stockCode);
          return matchedProduct && matchedProduct.category === reportFilter.category;
        });
        if (!hasMatchingCategory) return false;
      }
      
      return true;
    });
  }, [orders, reportFilter, products]);

  const reportMetrics = React.useMemo(() => {
    const totalVolume = filteredOrdersForReport.reduce((sum, o) => sum + (o.totalAmount || o.amount || 0), 0);
    const orderCount = filteredOrdersForReport.length;
    const avgBasket = orderCount > 0 ? totalVolume / orderCount : 0;
    
    // Group sales by Category for a cool BarChart!
    const categorySalesMap: { [key: string]: number } = {};
    filteredOrdersForReport.forEach(o => {
      o.products?.forEach((item: any) => {
        const matchedProduct = products.find(p => p.id === item.productId || p.stockCode === item.stockCode);
        const cat = matchedProduct?.category || 'Diğer';
        const itemTotal = (item.price || 0) * (item.quantity || 1) * (1 + (item.vatRate || 0) / 100);
        categorySalesMap[cat] = (categorySalesMap[cat] || 0) + itemTotal;
      });
    });
    
    const categoryChartData = Object.entries(categorySalesMap).map(([name, value]) => ({
      name,
      Tutar: Math.round(value)
    }));
    
    // Group sales by Company for top performance breakdown
    const companySalesMap: { [key: string]: number } = {};
    filteredOrdersForReport.forEach(o => {
      const cName = o.companyName || 'Bilinmeyen Firma';
      companySalesMap[cName] = (companySalesMap[cName] || 0) + (o.totalAmount || o.amount || 0);
    });
    
    const topCompaniesData = Object.entries(companySalesMap)
      .map(([name, total]) => ({ name, total: Math.round(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      totalVolume,
      orderCount,
      avgBasket,
      categoryChartData,
      topCompaniesData
    };
  }, [filteredOrdersForReport, products]);

  useEffect(() => {
    fetchDashboard();
    fetchCompanies();
    fetchUsers();
    fetchProducts();
    fetchOrders();
    fetchMovements();
    fetchLogs();
    fetchSliders();
    fetchCategories();
  }, [activeTab]);

  const showNotification = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // FETCHING UTILS
  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setMetrics(data.metrics);
        setCriticalStocks(data.criticalStocks || []);
        setBestSellers(data.bestSellers || []);
        setTopCompanies(data.topCompanies || []);
        setLastOrders(data.lastOrders || []);
        setTrendData(data.trendData || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/admin/companies', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setCompanies(data);
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch (e) { console.error(e); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setProducts(data);
    } catch (e) { console.error(e); }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setOrders(data);
    } catch (e) { console.error(e); }
  };

  const fetchMovements = async () => {
    try {
      const res = await fetch('/api/admin/balance-movements', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setMovements(data);
    } catch (e) { console.error(e); }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setLogs(data);
    } catch (e) { console.error(e); }
  };

  const fetchSliders = async () => {
    try {
      const res = await fetch('/api/admin/sliders', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setSliders(data);
    } catch (e) { console.error(e); }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setCategories(data);
    } catch (e) { console.error(e); }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(categoryForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kategori işlemi başarısız.');

      showNotification(editingCategory ? 'Kategori başarıyla güncellendi.' : 'Yeni kategori başarıyla eklendi.', 'success');
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '' });
      fetchCategories();
      fetchProducts();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    setDeleteConfirm({
      type: 'category',
      id,
      title: `"${name}" kategorisini sistemden tamamen silmek istediğinize emin misiniz?`
    });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    setDeleteConfirm(null);

    try {
      let url = '';
      if (type === 'slider') url = `/api/admin/sliders/${id}`;
      else if (type === 'company') url = `/api/admin/companies/${id}`;
      else if (type === 'user') url = `/api/admin/users/${id}`;
      else if (type === 'product') url = `/api/admin/products/${id}`;
      else if (type === 'category') url = `/api/admin/categories/${id}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Silme işlemi başarısız oldu.');

      showNotification(data.message || 'Silme işlemi başarıyla tamamlandı.', 'success');

      if (type === 'slider') fetchSliders();
      else if (type === 'company') fetchCompanies();
      else if (type === 'user') fetchUsers();
      else if (type === 'product') fetchProducts();
      else if (type === 'category') { fetchCategories(); fetchProducts(); }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleSliderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingSlider ? `/api/admin/sliders/${editingSlider.id}` : '/api/admin/sliders';
      const method = editingSlider ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(sliderForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Slider işlemi başarısız.');

      showNotification(editingSlider ? 'Slider güncellendi.' : 'Yeni slider başarıyla eklendi.', 'success');
      setShowSliderModal(false);
      setEditingSlider(null);
      setSliderForm({
        title: '',
        desc: '',
        bg: 'bg-gradient-to-r from-emerald-800 to-teal-950',
        tag: 'KAMPANYA',
        status: 'active' as 'active' | 'inactive',
        image: '',
        isRedirect: false,
        redirectType: 'category' as 'category' | 'product',
        redirectTarget: ''
      });
      fetchSliders();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteSlider = (id: string) => {
    setDeleteConfirm({
      type: 'slider',
      id,
      title: 'Bu tanıtım afişini kaldırmak istediğinize emin misiniz?'
    });
  };

  // CRUD COMPANY
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCompany ? `/api/admin/companies/${editingCompany.id}` : '/api/admin/companies';
      const method = editingCompany ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(companyForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız.');
      
      showNotification(editingCompany ? 'Firma başarıyla güncellendi.' : 'Firma başarıyla eklendi.', 'success');
      setShowCompanyModal(false);
      setEditingCompany(null);
      setCompanyForm({ name: '', taxNumber: '', taxOffice: '', phone: '', address: '', status: 'active' });
      fetchCompanies();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteCompany = (id: string) => {
    setDeleteConfirm({
      type: 'company',
      id,
      title: 'Bu kurumsal müşteriyi/firmayı silmek istediğinize emin misiniz? (Firmaya kayıtlı çalışan varsa silme engellenecektir)'
    });
  };

  // CRUD USER
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      // If editing, exclude password and initialBalance from payload
      const payload = editingUser 
        ? { ...userForm }
        : { ...userForm };
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız.');

      showNotification(editingUser ? 'Kullanıcı başarıyla güncellendi.' : 'Kullanıcı başarıyla oluşturuldu ve bakiye tanımlandı.', 'success');
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ companyId: '', name: '', surname: '', email: '', phone: '', tcNo: '', password: '', role: 'user', status: 'active', address: '', initialBalance: '0' });
      fetchUsers();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteUser = (id: string) => {
    setDeleteConfirm({
      type: 'user',
      id,
      title: 'Bu kullanıcı/çalışan hesabını tamamen silmek istediğinize emin misiniz?'
    });
  };

  const handleAdminChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser || !newPasswordVal) return;
    try {
      const res = await fetch(`/api/admin/users/${passwordTargetUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword: newPasswordVal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showNotification('Şifre başarıyla güncellendi.', 'success');
      setShowPasswordModal(false);
      setNewPasswordVal('');
      setPasswordTargetUser(null);
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // DIRECT BALANCE UPDATE (CRITICAL REQUIREMENT - Admin directly loads balance to specific user)
  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForBalance) return;
    try {
      const res = await fetch(`/api/admin/users/${selectedUserForBalance.id}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: balanceForm.amount, note: balanceForm.note })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bakiye yüklenemedi.');

      showNotification(`Bakiye başarıyla eklendi! Yeni Bakiye: ${data.balance.toLocaleString('tr-TR')} TL`, 'success');
      setShowBalanceModal(false);
      setSelectedUserForBalance(null);
      setBalanceForm({ amount: '', note: '' });
      fetchUsers();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // CRUD PRODUCT
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const images = productForm.imageInput ? productForm.imageInput.split(',').map(s => s.trim()) : [];

      const payload = {
        ...productForm,
        images: images.length > 0 ? images : undefined
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ürün işlemi başarısız.');

      showNotification(editingProduct ? 'Ürün güncellendi.' : 'Yeni ürün başarıyla eklendi.', 'success');
      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({ category: '', subcategory: '', brand: '', name: '', shortDesc: '', longDesc: '', stock: '0', stockCode: '', barcode: '', unit: 'Adet', price: '0', vatRate: '20', isCampaign: false, status: 'active', imageInput: '' });
      fetchProducts();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleDeleteProduct = (id: string) => {
    setDeleteConfirm({
      type: 'product',
      id,
      title: 'Bu ürünü gıda kataloğundan silmek istediğinize emin misiniz?'
    });
  };

  // BULK IMPORT
  const handleBulkImport = async () => {
    if (!bulkText) return;
    try {
      const lines = bulkText.split('\n');
      const productsToImport: any[] = [];

      lines.forEach((line, i) => {
        if (i === 0 && line.toLowerCase().includes('kategori')) return; // Header skip
        const cols = line.split(',');
        if (cols.length >= 5) {
          productsToImport.push({
            category: cols[0]?.trim(),
            brand: cols[1]?.trim(),
            name: cols[2]?.trim(),
            stock: cols[3]?.trim(),
            stockCode: cols[4]?.trim(),
            price: cols[5]?.trim(),
            vatRate: cols[6]?.trim() || '20',
            barcode: cols[7]?.trim() || '',
            unit: cols[8]?.trim() || 'Adet',
            isCampaign: cols[9]?.trim()?.toLowerCase() === 'evet'
          });
        }
      });

      if (productsToImport.length === 0) {
        throw new Error('Geçerli veri formatı bulunamadı. Lütfen virgülle ayrılmış alanları kontrol edin.');
      }

      const res = await fetch('/api/admin/products/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ products: productsToImport })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showNotification(data.message, 'success');
      setShowBulkImportModal(false);
      setBulkText('');
      fetchProducts();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // ORDER LIFECYCLE MANAGEMENT
  const handleOrderStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderDetails) return;
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrderDetails.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(orderStatusForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sipariş güncellenemedi.');

      showNotification('Sipariş başarıyla güncellendi.', 'success');
      setSelectedOrderDetails(null);
      setOrderStatusForm({ status: 'pending', note: '' });
      fetchOrders();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // CSV / EXCEL EXPORT WITH UTF-8 BOM
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => {
      return Object.values(item).map(val => {
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',');
    });
    const csvContent = "\uFEFF" + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // FILTERED LIST COMPUTATIONS
  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.taxNumber.includes(searchQuery)
  );

  const filteredUsers = users.filter(u => 
    `${u.name} ${u.surname}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.phone && u.phone.includes(searchQuery))
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.stockCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(o => 
    o.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.userName && o.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (o.companyName && o.companyName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredMovements = movements.filter(m => 
    (m.userName && m.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (m.companyName && m.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (m.note && m.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    const sMap: Record<string, { label: string; cls: string }> = {
      pending: { label: 'Bekliyor', cls: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
      approved: { label: 'Onaylandı', cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
      preparing: { label: 'Hazırlanıyor', cls: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
      shipping: { label: 'Kargoda', cls: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
      delivered: { label: 'Teslim Edildi', cls: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
      cancelled: { label: 'İptal Edildi', cls: 'bg-rose-500/10 text-rose-500 border-rose-500/20' }
    };
    const current = sMap[status] || { label: status, cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${current.cls}`}>{current.label}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Admin Header Title */}
          <div className="p-4 border-b border-slate-800 flex flex-col gap-2 items-center text-center">
            <Logo size="md" />
            <div className="mt-1">
              <h2 className="font-extrabold text-xs text-white tracking-widest uppercase">B2B YÖNETİCİ</h2>
              <p className="text-slate-500 text-[10px]">Sistem Kontrol Paneli</p>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            <button
              onClick={() => { setActiveTab('dashboard'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Yönetim Paneli</span>
            </button>

            <button
              onClick={() => { setActiveTab('companies'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'companies' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
              <Building className="w-5 h-5" />
              <span>Firmalar</span>
            </button>

            <button
              onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
              <Users className="w-5 h-5" />
              <span>Kullanıcılar & Bakiye</span>
            </button>

            <button
              onClick={() => { setActiveTab('products'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'products' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
              <Package className="w-5 h-5" />
              <span>Ürün Katalogu</span>
            </button>

            <button
              onClick={() => { setActiveTab('orders'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'orders' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Sipariş Yönetimi</span>
              {orders.filter(o => o.status === 'pending').length > 0 && (
                <span className="ml-auto bg-amber-500 text-slate-950 font-bold px-1.5 py-0.5 text-3xs rounded-full">
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('balances'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'balances' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
              <CreditCard className="w-5 h-5" />
              <span>Bakiye Geçmişi</span>
            </button>

            <button
              onClick={() => { setActiveTab('reports'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'reports' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
              <FileText className="w-5 h-5" />
              <span>Detaylı Raporlar</span>
            </button>

            <button
              onClick={() => { setActiveTab('logs'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
              <Play className="w-5 h-5 font-bold" />
              <span>Güvenlik Günlükleri</span>
            </button>

            <button
              onClick={() => { setActiveTab('categories'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'categories' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
              <Tag className="w-5 h-5 font-bold" />
              <span>Kategori Yönetimi</span>
            </button>

            <button
              onClick={() => { setActiveTab('sliders'); setSearchQuery(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${activeTab === 'sliders' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
              <Sliders className="w-5 h-5 font-bold" />
              <span>Slider Yönetimi</span>
            </button>
          </nav>
        </div>

        {/* Footer Logged In User & Signout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition py-2.5 rounded-xl font-medium text-sm"
          >
            <X className="w-4 h-4" />
            <span>Oturumu Kapat</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
        {/* Top Header */}
        <header className="p-4 md:p-6 border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {activeTab === 'dashboard' && 'Yönetim Paneli'}
              {activeTab === 'companies' && 'Firma Yönetimi'}
              {activeTab === 'users' && 'Kullanıcı & Bakiye Yönetimi'}
              {activeTab === 'products' && 'Katalog Ürün Yönetimi'}
              {activeTab === 'orders' && 'B2B Sipariş Takip'}
              {activeTab === 'balances' && 'Bakiye Yükleme & Harcama Geçmişi'}
              {activeTab === 'reports' && 'Kurumsal Performans Raporları'}
              {activeTab === 'logs' && 'Audit Log (Sistem Günlükleri)'}
              {activeTab === 'sliders' && 'Slider & Tanıtım Yönetimi'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {activeTab === 'dashboard' && 'Şirketinizin anlık ciro, sipariş ve finansal durumunu inceleyin.'}
              {activeTab === 'companies' && 'Sisteme kayıtlı kurumsal bayi firmalarını oluşturun ve düzenleyin.'}
              {activeTab === 'users' && 'Bayi personellerini ekleyin, düzenleyin ve hesaplarına doğrudan bakiye tanımlayın.'}
              {activeTab === 'products' && 'Ürün kategorilerini, fiyatlarını, stok durumlarını yönetin veya toplu içe aktarın.'}
              {activeTab === 'orders' && 'Tüm firmalardan gelen sipariş durumlarını güncelleyin ve süreci yönetin.'}
              {activeTab === 'balances' && 'Tüm bakiye hareketlerinin loglarını inceleyin ve rapor çıktısı alın.'}
              {activeTab === 'reports' && 'Excel ve PDF formatlarında filtreye dayalı verileri dışa aktarın.'}
              {activeTab === 'logs' && 'Sistem üzerinde gerçekleştirilen tüm kritik işlemlerin güvenlik logu.'}
              {activeTab === 'sliders' && 'Bayi anasayfasında gösterilecek kampanya afişlerini ve duyuru sliderlarını yönetin.'}
            </p>
          </div>

          {/* Search bar inside header for active lists */}
          {['companies', 'users', 'products', 'orders', 'balances'].includes(activeTab) && (
            <div className="relative w-full sm:w-64 shrink-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Arama yapın..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 outline-none transition"
              />
            </div>
          )}
        </header>

        {/* Content Body */}
        <div className="p-4 md:p-6 space-y-6">
          {/* Notifications */}
          {successMsg && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-sm flex items-center gap-3 animate-fadeIn">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-sm flex items-center gap-3 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && metrics && (
            <div className="space-y-6">
              {/* Counter Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Toplam Ciro</span>
                  <p className="text-xl md:text-2xl font-bold text-white mt-1">{(metrics.totalCiro || 0).toLocaleString('tr-TR')} TL</p>
                  <p className="text-xs text-emerald-400 flex items-center mt-2 font-medium">Bakiye ile sipariş verilmiştir.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Bugünkü Sipariş Hacmi</span>
                  <p className="text-xl md:text-2xl font-bold text-white mt-1">{(metrics.todayRevenue || 0).toLocaleString('tr-TR')} TL</p>
                  <p className="text-xs text-slate-400 flex items-center mt-2">{metrics.todayOrdersCount} yeni sipariş alındı.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Aktif Bayi Bakiyesi</span>
                  <p className="text-xl md:text-2xl font-bold text-amber-500 mt-1">{(metrics.totalBalance || 0).toLocaleString('tr-TR')} TL</p>
                  <p className="text-xs text-slate-400 mt-2">Kullanıcıların toplam harcanabilir bakiyeleri.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Bayi / Ürün Sayısı</span>
                  <p className="text-xl md:text-2xl font-bold text-white mt-1">{metrics.totalCompanies} Firma / {metrics.totalProducts} Ürün</p>
                  <p className="text-xs text-indigo-400 mt-2">{metrics.totalUsers} adet aktif kullanıcı personeli.</p>
                </div>
              </div>

              {/* Sipariş Durum Kutuları */}
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
                  <span className="text-slate-400 text-xs font-medium">Bekleyen</span>
                  <p className="text-lg font-bold text-amber-500 mt-1">{metrics.orders?.pending || 0}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
                  <span className="text-slate-400 text-xs font-medium">Onaylanan</span>
                  <p className="text-lg font-bold text-emerald-500 mt-1">{metrics.orders?.approved || 0}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
                  <span className="text-slate-400 text-xs font-medium">Hazırlanan</span>
                  <p className="text-lg font-bold text-indigo-500 mt-1">{metrics.orders?.preparing || 0}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
                  <span className="text-slate-400 text-xs font-medium">Kargoda</span>
                  <p className="text-lg font-bold text-blue-500 mt-1">{metrics.orders?.shipping || 0}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
                  <span className="text-slate-400 text-xs font-medium">Teslim Edilen</span>
                  <p className="text-lg font-bold text-teal-500 mt-1">{metrics.orders?.delivered || 0}</p>
                </div>
                <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-center">
                  <span className="text-slate-400 text-xs font-medium">İptal Edilen</span>
                  <p className="text-lg font-bold text-rose-500 mt-1">{metrics.orders?.cancelled || 0}</p>
                </div>
              </div>

              {/* Graphic charts & Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <h3 className="font-bold text-sm text-slate-300">Haftalık Satış Grafiği (TL Ciro)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                        <YAxis stroke="#94a3b8" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                        <Line type="monotone" dataKey="ciro" name="Satış Hacmi" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-300 mb-4">Kritik Stok Uyarıları (≤10)</h3>
                    {criticalStocks.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-8">Kritik seviyede ürün bulunmuyor.</p>
                    ) : (
                      <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                        {criticalStocks.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800/40 text-xs">
                            <div className="min-w-0 pr-2">
                              <p className="text-slate-300 font-semibold truncate">{p.name}</p>
                              <p className="text-slate-500 text-3xs mt-0.5">Kod: {p.stockCode}</p>
                            </div>
                            <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded font-bold shrink-0">{p.stock} Adet</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setActiveTab('products')} className="mt-4 w-full text-center text-xs text-indigo-400 hover:text-indigo-300 font-semibold py-2 bg-slate-950/60 rounded-lg border border-slate-800 transition">
                    Tüm Katalog Stoklarını Yönet
                  </button>
                </div>
              </div>

              {/* Son siparişler ve En çok satanlar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <h3 className="font-bold text-sm text-slate-300 mb-4">Son Alınan Siparişler</h3>
                  {lastOrders.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-10">Sipariş bulunmuyor.</p>
                  ) : (
                    <div className="divide-y divide-slate-800">
                      {lastOrders.map((o, idx) => (
                        <div key={idx} className="py-3 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-indigo-400">{o.orderNo}</p>
                            <p className="text-slate-400 mt-0.5">{o.companyName} ({o.userName})</p>
                            <p className="text-slate-500 text-3xs">{new Date(o.date).toLocaleString('tr-TR')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-white">{o.totalAmount.toLocaleString('tr-TR')} TL</p>
                            <div className="mt-1">{getStatusBadge(o.status)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <h3 className="font-bold text-sm text-slate-300 mb-4">En Çok Sipariş Veren Bayiler</h3>
                  {topCompanies.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-10">Veri bulunmuyor.</p>
                  ) : (
                    <div className="space-y-3">
                      {topCompanies.map((c, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800/40 text-xs">
                          <div>
                            <span className="font-bold text-white">{idx+1}. {c.name}</span>
                            <p className="text-slate-500 text-3xs mt-0.5">{c.orderCount} adet sipariş</p>
                          </div>
                          <span className="text-indigo-400 font-bold">{c.revenue.toLocaleString('tr-TR')} TL</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPANIES */}
          {activeTab === 'companies' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => { setEditingCompany(null); setCompanyForm({ name: '', taxNumber: '', taxOffice: '', phone: '', address: '', status: 'active' }); setShowCompanyModal(true); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Firma Ekle</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="p-4">Firma Adı</th>
                        <th className="p-4">Vergi No / Dairesi</th>
                        <th className="p-4">İletişim Telefonu</th>
                        <th className="p-4">Adres</th>
                        <th className="p-4">Durum</th>
                        <th className="p-4 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredCompanies.map(c => (
                        <tr key={c.id} className="hover:bg-slate-800/20 transition">
                          <td className="p-4 font-bold text-white">{c.name}</td>
                          <td className="p-4">
                            <p>{c.taxNumber}</p>
                            <p className="text-slate-500 text-3xs mt-0.5">{c.taxOffice}</p>
                          </td>
                          <td className="p-4">{c.phone || '-'}</td>
                          <td className="p-4 max-w-xs truncate">{c.address || '-'}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full border text-3xs font-semibold ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                              {c.status === 'active' ? 'Aktif' : 'Pasif'}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => { setEditingCompany(c); setCompanyForm({ name: c.name, taxNumber: c.taxNumber, taxOffice: c.taxOffice, phone: c.phone, address: c.address, status: c.status }); setShowCompanyModal(true); }}
                              className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 rounded transition text-indigo-400"
                              title="Düzenle"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCompany(c.id)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded transition text-rose-400"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredCompanies.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">Aradığınız kriterlere uygun firma bulunamadı.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USERS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => { setEditingUser(null); setUserForm({ companyId: companies[0]?.id || '', name: '', surname: '', email: '', phone: '', tcNo: '', password: '', role: 'user', status: 'active', address: '', initialBalance: '0' }); setShowUserModal(true); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Kullanıcı Ekle</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="p-4">Kullanıcı Adı Soyadı</th>
                        <th className="p-4">E-posta / Telefon</th>
                        <th className="p-4">Bağlı Firma</th>
                        <th className="p-4">Hesap Bakiyesi</th>
                        <th className="p-4">TC / Yetki</th>
                        <th className="p-4">Durum</th>
                        <th className="p-4 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-800/20 transition">
                          <td className="p-4 font-bold text-white">{u.name} {u.surname}</td>
                          <td className="p-4">
                            <p>{u.email}</p>
                            <p className="text-slate-500 text-3xs mt-0.5">{u.phone}</p>
                          </td>
                          <td className="p-4 text-slate-300 font-medium">{u.companyName}</td>
                          <td className="p-4">
                            <span className="text-amber-500 font-bold">{u.balance.toLocaleString('tr-TR')} TL</span>
                          </td>
                          <td className="p-4">
                            <p>{u.tcNo || '-'}</p>
                            <p className="text-slate-500 text-3xs mt-0.5 uppercase">{u.role}</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full border text-3xs font-semibold ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                              {u.status === 'active' ? 'Aktif' : 'Pasif'}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => { setSelectedUserForBalance(u); setBalanceForm({ amount: '', note: '' }); setShowBalanceModal(true); }}
                              className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/20 rounded transition text-amber-400 font-semibold"
                              title="Bakiye Tanımla"
                            >
                              + Bakiye Ekle
                            </button>
                            <button
                              onClick={() => { setEditingUser(u); setUserForm({ companyId: u.companyId, name: u.name, surname: u.surname, email: u.email, phone: u.phone, tcNo: u.tcNo || '', password: '', role: u.role, status: u.status, address: u.address, initialBalance: '0' }); setShowUserModal(true); }}
                              className="p-1 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 rounded transition text-indigo-400"
                              title="Düzenle"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => { setPasswordTargetUser(u); setNewPasswordVal(''); setShowPasswordModal(true); }}
                              className="p-1 bg-slate-500/10 hover:bg-slate-500 hover:text-white border border-slate-500/20 rounded transition text-slate-400"
                              title="Şifre Değiştir"
                            >
                              <Key className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded transition text-rose-400"
                              title="Sil"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">Aradığınız kriterlere uygun kullanıcı personeli bulunamadı.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => { setShowBulkImportModal(true); }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>Toplu Ürün Yükleme</span>
                </button>
                <button
                  onClick={() => { setEditingProduct(null); setProductForm({ category: 'Elektronik', subcategory: '', brand: '', name: '', shortDesc: '', longDesc: '', stock: '0', stockCode: '', barcode: '', unit: 'Adet', price: '0', vatRate: '20', isCampaign: false, status: 'active', imageInput: '' }); setShowProductModal(true); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Ürün Tanımla</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="p-4">Görsel / Ürün</th>
                        <th className="p-4">Kategori / Marka</th>
                        <th className="p-4">Stok Kodu / Barkod</th>
                        <th className="p-4">Stok Miktarı</th>
                        <th className="p-4">Birim Fiyat</th>
                        <th className="p-4">Durum</th>
                        <th className="p-4 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredProducts.map(p => (
                        <tr key={p.id} className="hover:bg-slate-800/20 transition">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img src={p.images[0]} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-slate-800" />
                              <div className="min-w-0">
                                <p className="font-bold text-white truncate max-w-xs">{p.name}</p>
                                <p className="text-slate-500 text-3xs mt-0.5 truncate max-w-xs">{p.shortDesc}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <p>{p.category}</p>
                            <p className="text-slate-500 text-3xs mt-0.5">{p.brand}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-mono text-indigo-400 font-semibold">{p.stockCode}</p>
                            <p className="text-slate-500 text-3xs mt-0.5">{p.barcode}</p>
                          </td>
                          <td className="p-4">
                            <span className={`font-bold ${p.stock <= 10 ? 'text-rose-500' : 'text-slate-300'}`}>{p.stock} {p.unit}</span>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-white">{p.price.toLocaleString('tr-TR')} TL</p>
                            <p className="text-slate-500 text-3xs mt-0.5">KDV: +%{p.vatRate}</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full border text-3xs font-semibold ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                              {p.status === 'active' ? 'Satışta' : 'Pasif'}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => { setEditingProduct(p); setProductForm({ category: p.category, subcategory: p.subcategory || '', brand: p.brand, name: p.name, shortDesc: p.shortDesc || '', longDesc: p.longDesc || '', stock: String(p.stock), stockCode: p.stockCode, barcode: p.barcode, unit: p.unit, price: String(p.price), vatRate: String(p.vatRate), isCampaign: p.isCampaign, status: p.status, imageInput: p.images.join(', ') }); setShowProductModal(true); }}
                              className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border border-indigo-500/20 rounded transition text-indigo-400"
                              title="Düzenle"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded transition text-rose-400"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">Aradığınız kriterlere uygun ürün bulunamadı.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="p-4">Sipariş No</th>
                        <th className="p-4">Firma / Kullanıcı</th>
                        <th className="p-4">Sipariş Tarihi</th>
                        <th className="p-4">Toplam Tutar</th>
                        <th className="p-4">Sipariş Durumu</th>
                        <th className="p-4 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredOrders.map(o => (
                        <tr key={o.id} className="hover:bg-slate-800/20 transition">
                          <td className="p-4 font-mono font-bold text-indigo-400">{o.orderNo}</td>
                          <td className="p-4">
                            <p className="font-semibold text-white">{o.companyName || 'Bilinmeyen Firma'}</p>
                            <p className="text-slate-500 text-3xs mt-0.5">{o.userName || 'Bilinmeyen Kullanıcı'}</p>
                          </td>
                          <td className="p-4">{new Date(o.date).toLocaleString('tr-TR')}</td>
                          <td className="p-4 font-bold text-white">{(o.totalAmount || 0).toLocaleString('tr-TR')} TL</td>
                          <td className="p-4">{getStatusBadge(o.status)}</td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => { setSelectedOrderDetails(o); setOrderStatusForm({ status: o.status, note: '' }); }}
                              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-600/30 hover:border-indigo-600 rounded-lg text-xs font-semibold text-indigo-400 hover:text-white transition flex items-center gap-1.5 ml-auto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detay / Yönet</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">Aradığınız kriterlere uygun sipariş bulunamadı.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BALANCES */}
          {activeTab === 'balances' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{filteredMovements.length} bakiye hareketi listeleniyor.</span>
                <button
                  onClick={() => exportToCSV(movements, 'bakiye-gecmisi')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Excel / CSV Dışa Aktar</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400 uppercase tracking-wider font-semibold">
                        <th className="p-4">Firma / Kullanıcı</th>
                        <th className="p-4">Eşleşen Sipariş</th>
                        <th className="p-4">İşlem Türü</th>
                        <th className="p-4">İşlem Tutarı</th>
                        <th className="p-4">Eski / Yeni Bakiye</th>
                        <th className="p-4">İşlem Notu / Tarih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredMovements.map(m => (
                        <tr key={m.id} className="hover:bg-slate-800/20 transition">
                          <td className="p-4">
                            <p className="font-bold text-white">{m.userName}</p>
                            <p className="text-slate-500 text-3xs mt-0.5">{m.companyName}</p>
                          </td>
                          <td className="p-4 font-mono text-slate-400">{m.orderId ? `Sipariş: ${m.orderId.slice(0, 10)}` : '-'}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-3xs font-semibold ${m.type === 'add' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10' : m.type === 'spend' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/10' : 'bg-blue-500/10 text-blue-500 border border-blue-500/10'}`}>
                              {m.type === 'add' ? 'Bakiye Girişi' : m.type === 'spend' ? 'Bakiye Çıkışı' : 'Bakiye İade'}
                            </span>
                          </td>
                          <td className="p-4 font-bold">
                            <span className={m.type === 'add' || m.type === 'refund' ? 'text-emerald-400' : 'text-rose-400'}>
                              {m.type === 'add' || m.type === 'refund' ? '+' : '-'}{m.amount.toLocaleString('tr-TR')} TL
                            </span>
                          </td>
                          <td className="p-4 text-slate-400">
                            <p className="text-slate-500 line-through">{m.prevBalance.toLocaleString('tr-TR')} TL</p>
                            <p className="font-semibold text-slate-300">{m.newBalance.toLocaleString('tr-TR')} TL</p>
                          </td>
                          <td className="p-4">
                            <p className="text-slate-300 font-medium">{m.note}</p>
                            <p className="text-slate-500 text-3xs mt-0.5">{new Date(m.date).toLocaleString('tr-TR')}</p>
                          </td>
                        </tr>
                      ))}
                      {filteredMovements.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">Aradığınız kriterlere uygun bakiye hareketi bulunamadı.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Reports Filter Options */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <h3 className="font-bold text-sm text-slate-300 mb-4">Gelişmiş Rapor Filtreleme</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-slate-400">Başlangıç Tarihi</label>
                    <input
                      type="date"
                      value={reportFilter.startDate}
                      onChange={(e) => setReportFilter({ ...reportFilter, startDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400">Bitiş Tarihi</label>
                    <input
                      type="date"
                      value={reportFilter.endDate}
                      onChange={(e) => setReportFilter({ ...reportFilter, endDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400">Firma Filtresi</label>
                    <select
                      value={reportFilter.companyId}
                      onChange={(e) => setReportFilter({ ...reportFilter, companyId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      <option value="">Tüm Firmalar</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400">Ürün Kategorisi</label>
                    <select
                      value={reportFilter.category}
                      onChange={(e) => setReportFilter({ ...reportFilter, category: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      <option value="">Tüm Kategoriler</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* General Performance KPI */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="font-bold text-sm text-slate-300">Seçili Raporlama Verileri</h3>
                    <p className="text-xs text-slate-500 mt-1">Sipariş verilerine dayalı filtreli çıktı.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.print()}
                      className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition"
                    >
                      <FileText className="w-4 h-4" />
                      <span>PDF Olarak Yazdır</span>
                    </button>
                    <button
                      onClick={() => exportToCSV(filteredOrdersForReport, 'b2b-siparis-raporu')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition shadow-lg shadow-emerald-600/10"
                    >
                      <Download className="w-4 h-4" />
                      <span>Excel (CSV) Olarak Al</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl">
                    <span className="text-slate-500 text-xs font-medium uppercase">Filtreli Toplam Hacim</span>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{reportMetrics.totalVolume.toLocaleString('tr-TR')} TL</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl">
                    <span className="text-slate-500 text-xs font-medium uppercase">Ortalama Sepet Tutarı</span>
                    <p className="text-2xl font-bold text-white mt-1">{reportMetrics.avgBasket.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</p>
                  </div>
                  <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl">
                    <span className="text-slate-500 text-xs font-medium uppercase">Toplam İşlem Adedi</span>
                    <p className="text-2xl font-bold text-teal-400 mt-1">{reportMetrics.orderCount} Sipariş</p>
                  </div>
                </div>
              </div>

              {/* Data Visualization Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category-wise Sales Distribution */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <h3 className="font-bold text-sm text-slate-300 mb-5">Kategorilere Göre Satış Dağılımı</h3>
                  {reportMetrics.categoryChartData.length === 0 ? (
                    <div className="h-60 flex flex-col items-center justify-center text-slate-500 text-xs">
                      <span>Bu filtreler altında kategori bazlı satış bulunamadı.</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reportMetrics.categoryChartData.map((item, idx) => {
                        const percent = reportMetrics.totalVolume > 0 ? (item.Tutar / reportMetrics.totalVolume) * 100 : 0;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-300 font-medium">{item.name}</span>
                              <span className="text-emerald-400 font-bold">{item.Tutar.toLocaleString('tr-TR')} TL ({percent.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Top Performing Companies */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <h3 className="font-bold text-sm text-slate-300 mb-5">En Çok Sipariş Geçen Firmalar</h3>
                  {reportMetrics.topCompaniesData.length === 0 ? (
                    <div className="h-60 flex flex-col items-center justify-center text-slate-500 text-xs">
                      <span>Bu filtreler altında firma siparişi bulunamadı.</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reportMetrics.topCompaniesData.map((item, idx) => {
                        const percent = reportMetrics.totalVolume > 0 ? (item.total / reportMetrics.totalVolume) * 100 : 0;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-300 font-medium">{item.name}</span>
                              <span className="text-teal-400 font-bold">{item.total.toLocaleString('tr-TR')} TL ({percent.toFixed(1)}%)</span>
                            </div>
                            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-teal-600 to-emerald-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Filtered Order History Table for audit */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                  <h4 className="font-bold text-sm text-slate-300">Rapor Kapsamındaki Siparişler</h4>
                  <span className="text-xs bg-slate-950 border border-slate-850 px-3 py-1 rounded-lg text-emerald-400 font-semibold">{filteredOrdersForReport.length} İşlem</span>
                </div>
                {filteredOrdersForReport.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Filtre kriterlerine uyan sipariş bulunmamaktadır.
                  </div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950 text-slate-400">
                          <th className="p-4 font-semibold">Sipariş Kodu</th>
                          <th className="p-4 font-semibold">Firma Adı</th>
                          <th className="p-4 font-semibold">Tarih</th>
                          <th className="p-4 font-semibold">Tutar</th>
                          <th className="p-4 font-semibold">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {filteredOrdersForReport.map((o) => (
                          <tr key={o.id} className="hover:bg-slate-850/40 transition">
                            <td className="p-4 font-bold text-white">{o.orderNo}</td>
                            <td className="p-4">{o.companyName}</td>
                            <td className="p-4">{o.date || (o.createdAt ? o.createdAt.substring(0, 10) : '')}</td>
                            <td className="p-4 font-extrabold text-emerald-400">{(o.totalAmount || o.amount || 0).toLocaleString('tr-TR')} TL</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                o.status === 'onaylandi' ? 'bg-emerald-500/10 text-emerald-400' :
                                o.status === 'reddedildi' ? 'bg-rose-500/10 text-rose-400' :
                                'bg-amber-500/10 text-amber-400'
                              }`}>
                                {o.status === 'onaylandi' ? 'Onaylandı' : o.status === 'reddedildi' ? 'İptal Edildi' : 'Beklemede'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 8: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                <span className="text-xs text-slate-400">Sistem üzerinde gerçekleştirilen tüm kritik işlemler gerçek zamanlı olarak loglanır.</span>
                <button
                  onClick={() => exportToCSV(logs, 'audit-security-logs')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  Logları Dışa Aktar
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="max-h-120 overflow-y-auto pr-1">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400 uppercase tracking-wider font-semibold sticky top-0">
                        <th className="p-4">Kullanıcı</th>
                        <th className="p-4">İşlem Tipi</th>
                        <th className="p-4">Açıklama Detayları</th>
                        <th className="p-4">Tarih / Saat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {logs.map((l, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/20 transition">
                          <td className="p-4 font-bold text-white">{l.userName}</td>
                          <td className="p-4">
                            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-3xs font-semibold">{l.action}</span>
                          </td>
                          <td className="p-4 text-slate-300">{l.details}</td>
                          <td className="p-4 text-slate-500">{new Date(l.date).toLocaleString('tr-TR')}</td>
                        </tr>
                      ))}
                      {logs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-500 text-xs">Sistemde henüz işlem kaydı bulunmuyor.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: SLIDER MANAGEMENT */}
          {activeTab === 'sliders' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center flex-wrap gap-4">
                <div className="text-xs text-slate-400">
                  Bayi portalı anasayfa afişlerini buradan düzenleyebilir, yeni duyuru başlıkları ekleyebilirsiniz.
                </div>
                <button
                  onClick={() => {
                    setEditingSlider(null);
                    setSliderForm({
                      title: '',
                      desc: '',
                      bg: 'bg-gradient-to-r from-emerald-800 to-teal-950',
                      tag: 'KAMPANYA',
                      status: 'active',
                      image: '',
                      isRedirect: false,
                      redirectType: 'category',
                      redirectTarget: ''
                    });
                    setShowSliderModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Slider Afişi Ekle</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="p-4">Etiket</th>
                      <th className="p-4">Slider Kampanya Başlığı</th>
                      <th className="p-4">Alt Açıklama Metni</th>
                      <th className="p-4">Arka Plan Stili</th>
                      <th className="p-4">Durum</th>
                      <th className="p-4 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sliders.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/20 transition">
                        <td className="p-4">
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-3xs font-semibold uppercase">
                            {s.tag}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-white text-sm">{s.title}</td>
                        <td className="p-4 text-slate-300 max-w-xs truncate">{s.desc}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full ${s.bg}`} />
                            <span className="text-slate-400 font-mono text-3xs">{s.bg}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {s.status === 'active' ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-3xs font-bold">
                              AKTİF
                            </span>
                          ) : (
                            <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-3xs font-bold">
                              PASİF
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingSlider(s);
                                setSliderForm({
                                  title: s.title,
                                  desc: s.desc || '',
                                  bg: s.bg || 'bg-gradient-to-r from-emerald-800 to-teal-950',
                                  tag: s.tag || 'KAMPANYA',
                                  status: s.status || 'active',
                                  image: s.image || '',
                                  isRedirect: s.isRedirect || false,
                                  redirectType: s.redirectType || 'category',
                                  redirectTarget: s.redirectTarget || ''
                                });
                                setShowSliderModal(true);
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-400 rounded-lg transition"
                              title="Düzenle"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSlider(s.id)}
                              className="p-1.5 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400 rounded-lg transition"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {sliders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                          Kayıtlı herhangi bir slider bulunamadı. Lütfen üstteki butondan yeni bir tane ekleyin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: CATEGORY MANAGEMENT */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center flex-wrap gap-4">
                <div className="text-xs text-slate-400">
                  HanibabaTicket yemek kartı portalı gıda kataloğunda listelenecek kategorileri buradan ekleyebilir, güncelleyebilir veya silebilirsiniz.
                </div>
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({ name: '', image: '' });
                    setShowCategoryModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Kategori Ekle</span>
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-850/60 text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="p-4 w-16">Görsel</th>
                      <th className="p-4">Kategori Adı</th>
                      <th className="p-4">Kayıtlı Ürün Sayısı</th>
                      <th className="p-4 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {categories.map((c) => {
                      const productCount = products.filter(p => p.category === c.name).length;
                      return (
                        <tr key={c.id} className="hover:bg-slate-800/20 transition">
                          <td className="p-4">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                              <img 
                                src={c.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=80&auto=format&fit=crop&q=80'} 
                                alt={c.name} 
                                className="w-full h-full object-cover" 
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=80&auto=format&fit=crop&q=80'; }}
                                referrerPolicy="no-referrer" 
                              />
                            </div>
                          </td>
                          <td className="p-4 font-bold text-white text-sm">{c.name}</td>
                          <td className="p-4 text-slate-300 font-mono">{productCount} Ürün</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingCategory(c);
                                  setCategoryForm({ name: c.name, image: c.image || '' });
                                  setShowCategoryModal(true);
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-400 rounded-lg transition"
                                title="Düzenle"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(c.id, c.name)}
                                className="p-1.5 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400 rounded-lg transition"
                                title="Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {categories.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500 text-xs">
                          Kayıtlı herhangi bir kategori bulunamadı. Lütfen üstteki butondan yeni bir kategori ekleyin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: COMPANY CREATE/UPDATE */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative animate-fadeIn shadow-2xl">
            <button onClick={() => setShowCompanyModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-white mb-4">{editingCompany ? 'Firmayı Düzenle' : 'Yeni Firma Ekle'}</h2>
            
            <form onSubmit={handleCompanySubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Firma Unvanı (Adı)</label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  placeholder="Örn: Gelişim Teknoloji A.Ş."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Vergi Kimlik Numarası (VKN)</label>
                  <input
                    type="text"
                    value={companyForm.taxNumber}
                    onChange={(e) => setCompanyForm({ ...companyForm, taxNumber: e.target.value })}
                    placeholder="10 Haneli Vergi No"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Vergi Dairesi</label>
                  <input
                    type="text"
                    value={companyForm.taxOffice}
                    onChange={(e) => setCompanyForm({ ...companyForm, taxOffice: e.target.value })}
                    placeholder="Örn: Maslak V.D."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Telefon</label>
                  <input
                    type="text"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    placeholder="0212 XXX XX XX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Durum</label>
                  <select
                    value={companyForm.status}
                    onChange={(e) => setCompanyForm({ ...companyForm, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif / Askıda</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Merkez Adresi</label>
                <textarea
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  placeholder="Sipariş sevkleri için varsayılan kurumsal merkez adresi..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500 h-20 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition"
              >
                {editingCompany ? 'Bilgileri Güncelle' : 'Firma Oluştur'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: USER CREATE/UPDATE */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative animate-fadeIn shadow-2xl">
            <button onClick={() => setShowUserModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-white mb-4">{editingUser ? 'Kullanıcı Personelini Düzenle' : 'Yeni Kullanıcı Personeli Ekle'}</h2>

            <form onSubmit={handleUserSubmit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Firma Seçimi</label>
                <select
                  value={userForm.companyId}
                  onChange={(e) => setUserForm({ ...userForm, companyId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">Firma Seçiniz</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Ad</label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    placeholder="Kullanıcı Adı"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Soyad</label>
                  <input
                    type="text"
                    value={userForm.surname}
                    onChange={(e) => setUserForm({ ...userForm, surname: e.target.value })}
                    placeholder="Soyadı"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">E-Posta / Kullanıcı Adı</label>
                  <input
                    type="text"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="giris@eposta.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Telefon</label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="05XX XXX XX XX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {!editingUser && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-medium">Giriş Şifresi</label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="Şifre Belirleyin"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-medium">Başlangıç Bakiyesi (TL)</label>
                    <input
                      type="number"
                      value={userForm.initialBalance}
                      onChange={(e) => setUserForm({ ...userForm, initialBalance: e.target.value })}
                      placeholder="Başlangıç limit"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-amber-500 font-bold outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-1">
                  <label className="text-slate-400 font-medium">TC Kimlik No</label>
                  <input
                    type="text"
                    value={userForm.tcNo}
                    onChange={(e) => setUserForm({ ...userForm, tcNo: e.target.value })}
                    placeholder="11 Haneli TC"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-slate-400 font-medium">Yetki Grubu</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as 'admin' | 'user' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="user">Bayi Personeli</option>
                    <option value="admin">Admin Yönetici</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-1">
                  <label className="text-slate-400 font-medium">Durum</label>
                  <select
                    value={userForm.status}
                    onChange={(e) => setUserForm({ ...userForm, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif / Kilitli</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Sevkiyat Adresi</label>
                <textarea
                  value={userForm.address}
                  onChange={(e) => setUserForm({ ...userForm, address: e.target.value })}
                  placeholder="Kullanıcının teslimat alacağı varsayılan adresi..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500 h-16 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition mt-2"
              >
                {editingUser ? 'Personel Bilgilerini Güncelle' : 'Personel Oluştur & Bakiye Yükle'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DIRECT USER BALANCE UPDATE (Admin loads balance directly to user) */}
      {showBalanceModal && selectedUserForBalance && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative animate-fadeIn shadow-2xl">
            <button onClick={() => setShowBalanceModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-white mb-2">Bakiye Tanımla</h2>
            <p className="text-xs text-slate-400 mb-4">
              Kullanıcı: <span className="text-white font-semibold">{selectedUserForBalance.name} {selectedUserForBalance.surname}</span><br />
              Mevcut Bakiye: <span className="text-amber-500 font-bold">{selectedUserForBalance.balance.toLocaleString('tr-TR')} TL</span>
            </p>

            <form onSubmit={handleBalanceSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Yüklenecek Tutar (TL)</label>
                <input
                  type="number"
                  value={balanceForm.amount}
                  onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })}
                  placeholder="Örn: 15000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-amber-500 font-bold outline-none focus:border-indigo-500 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">İşlem Notu (Açıklama)</label>
                <input
                  type="text"
                  value={balanceForm.note}
                  onChange={(e) => setBalanceForm({ ...balanceForm, note: e.target.value })}
                  placeholder="Bakiye yükleme gerekçesi..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-xl transition"
              >
                Bakiyeyi Tanımla ve Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN PASSWORD RESET */}
      {showPasswordModal && passwordTargetUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 relative animate-fadeIn shadow-2xl">
            <button onClick={() => setShowPasswordModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-white mb-2">Şifre Değiştir</h2>
            <p className="text-xs text-slate-400 mb-4">
              Kullanıcı: <span className="text-white font-semibold">{passwordTargetUser.name} {passwordTargetUser.surname}</span>
            </p>

            <form onSubmit={handleAdminChangePassword} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Yeni Güvenli Şifre</label>
                <input
                  type="password"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder="Şifreyi giriniz"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500 text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition"
              >
                Yeni Şifreyi Güncelle
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRODUCT CREATE/UPDATE */}
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 relative animate-fadeIn shadow-2xl">
            <button onClick={() => setShowProductModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-white mb-4">{editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün Tanımla'}</h2>

            <form onSubmit={handleProductSubmit} className="space-y-3 text-xs max-h-120 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Kategori</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="">Kategori Seçin</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Marka</label>
                  <input
                    type="text"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    placeholder="Örn: Apple, Nike"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Ürün Adı</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Model detaylarıyla tam başlık girin"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Stok Kodu (SKU)</label>
                  <input
                    type="text"
                    value={productForm.stockCode}
                    onChange={(e) => setProductForm({ ...productForm, stockCode: e.target.value })}
                    placeholder="Örn: AP-IP15-128"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500 font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Barkod</label>
                  <input
                    type="text"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                    placeholder="EAN-13 Barkod"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Birim</label>
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="Adet">Adet</option>
                    <option value="Koli">Koli</option>
                    <option value="Paket">Paket</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Birim Fiyat (TL)</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="KDV Hariç Fiyat"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">KDV Oranı (%)</label>
                  <select
                    value={productForm.vatRate}
                    onChange={(e) => setProductForm({ ...productForm, vatRate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="1">1</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Stok Miktarı</label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    placeholder="Mevcut Stok"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Görsel URL Adresleri (Virgülle Ayrılmış)</label>
                <input
                  type="text"
                  value={productForm.imageInput}
                  onChange={(e) => setProductForm({ ...productForm, imageInput: e.target.value })}
                  placeholder="https://images.unsplash.com/... , https://images.unsplash.com/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500 text-3xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Kısa Açıklama (Spot)</label>
                <input
                  type="text"
                  value={productForm.shortDesc}
                  onChange={(e) => setProductForm({ ...productForm, shortDesc: e.target.value })}
                  placeholder="Katalog aramalarında listelenecek spot metin..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Detaylı Teknik Bilgiler</label>
                <textarea
                  value={productForm.longDesc}
                  onChange={(e) => setProductForm({ ...productForm, longDesc: e.target.value })}
                  placeholder="Ürün sayfasında detaylarda gösterilecek özellikler..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500 h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={productForm.isCampaign}
                    onChange={(e) => setProductForm({ ...productForm, isCampaign: e.target.checked })}
                    id="isCampaign"
                    className="accent-indigo-600 rounded"
                  />
                  <label htmlFor="isCampaign" className="text-slate-300 cursor-pointer">Ana Sayfada Kampanyalı Göster</label>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={productForm.status}
                    onChange={(e) => setProductForm({ ...productForm, status: e.target.value as 'active' | 'inactive' })}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white"
                  >
                    <option value="active">Aktif (Satışta)</option>
                    <option value="inactive">Pasif (Gizli)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition mt-4"
              >
                {editingProduct ? 'Ürün Detaylarını Güncelle' : 'Ürünü Kataloga Ekle'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BULK CSV PRODUCTS IMPORT */}
      {showBulkImportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 relative animate-fadeIn shadow-2xl">
            <button onClick={() => setShowBulkImportModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Excel / CSV Toplu İçe Aktar</h2>
                <p className="text-3xs text-slate-400">Ürün veritabanına tek seferde yüzlerce ürünü ekleyin.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 text-3xs text-slate-400 mb-4 font-mono leading-relaxed space-y-1">
              <p className="font-bold text-slate-300 uppercase">Veri Format Düzeni (Virgüllü):</p>
              <p className="text-indigo-400">Kategori,Marka,Ürün Adı,Stok Miktarı,Stok Kodu,Birim Fiyat,KDV Oranı,Barkod,Birim,Kampanya(Evet/Hayır)</p>
              <p className="text-slate-500 mt-2">Örnek Satır:</p>
              <p className="text-slate-300 select-all">Giyim,Adidas,Adidas Stan Smith Sneaker,120,AD-SS-BLW,4200,10,400192019321,Adet,Evet</p>
            </div>

            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="Buraya kopyalanan CSV satırlarını yapıştırın..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-indigo-500 h-48 resize-none font-mono"
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowBulkImportModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl text-xs font-semibold transition"
              >
                Vazgeç
              </button>
              <button
                onClick={handleBulkImport}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-semibold transition"
              >
                İçe Aktarmayı Başlat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ORDER STATUS UPDATE & HISTORY LOG (Admin Only) */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 relative animate-fadeIn shadow-2xl flex flex-col max-h-120">
            <button onClick={() => setSelectedOrderDetails(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-base font-bold text-white mb-2">Sipariş Yönetimi</h2>
            <p className="text-xs text-indigo-400 font-semibold mb-4">Sipariş No: {selectedOrderDetails.orderNo}</p>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Product Grid inside order detail */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                <p className="font-bold text-slate-300 mb-2">Alınan Ürünler</p>
                <div className="space-y-2.5">
                  {selectedOrderDetails.products.map((p: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-900 p-2 rounded-lg text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={p.image} className="w-8 h-8 object-cover rounded" />
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-xs">{p.name}</p>
                          <p className="text-slate-500 text-3xs mt-0.5">Kod: {p.stockCode}</p>
                        </div>
                      </div>
                      <span className="text-slate-400 font-semibold text-3xs">{p.quantity} x {p.price.toLocaleString('tr-TR')} TL</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-900 mt-3 pt-3 flex justify-between items-center text-sm font-bold text-white">
                  <span>Toplam Ödenen Tutarı:</span>
                  <span className="text-amber-500">{selectedOrderDetails.totalAmount.toLocaleString('tr-TR')} TL</span>
                </div>
              </div>

              {/* Status History and logs */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                <p className="font-bold text-slate-300 mb-2.5">Aşama Geçmişi</p>
                <div className="space-y-3.5 relative before:absolute before:inset-y-1 before:left-2.5 before:w-0.5 before:bg-slate-800">
                  {selectedOrderDetails.statusHistory.map((h: any, idx: number) => (
                    <div key={idx} className="flex gap-4 relative z-10 pl-1">
                      <div className="w-5 h-5 bg-indigo-600 rounded-full border-4 border-slate-950 flex items-center justify-center text-white text-3xs shrink-0"></div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white">{h.status.toUpperCase()}</span>
                          <span className="text-slate-500 text-3xs">{new Date(h.date).toLocaleString('tr-TR')}</span>
                        </div>
                        {h.note && <p className="text-slate-400 mt-1">{h.note}</p>}
                        <p className="text-slate-500 text-3xs mt-0.5">İşlem: {h.updatedBy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status change action form */}
              <form onSubmit={handleOrderStatusUpdate} className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                <p className="font-bold text-slate-300">Durum Değişikliği Uygula</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-medium">Yeni Aşama</label>
                    <select
                      value={orderStatusForm.status}
                      onChange={(e) => setOrderStatusForm({ ...orderStatusForm, status: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500"
                    >
                      <option value="pending">Bekliyor (Onay Bekliyor)</option>
                      <option value="approved">Onaylandı (Ödeme/Limit Alındı)</option>
                      <option value="preparing">Hazırlanıyor (Depo Çıkış)</option>
                      <option value="shipping">Kargoda / Sevk Edildi</option>
                      <option value="delivered">Teslim Edildi</option>
                      <option value="cancelled">İptal Edildi (Bakiye İadeli!)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-medium">Aşama Notu</label>
                    <input
                      type="text"
                      value={orderStatusForm.note}
                      onChange={(e) => setOrderStatusForm({ ...orderStatusForm, note: e.target.value })}
                      placeholder="Kargo takip kodu veya iptal gerekçesi..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {orderStatusForm.status === 'cancelled' && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg text-rose-400 text-3xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>ÖNEMLİ: Sipariş İptal Edildi olarak işaretlenirse, sipariş bedeli olan {selectedOrderDetails.totalAmount.toLocaleString('tr-TR')} TL kullanıcının hesabına otomatik olarak anında iade edilir!</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition"
                >
                  Durumu Güncelle & Bildirim Gönder
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SLIDER CREATE/UPDATE */}
      {showSliderModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative animate-fadeIn shadow-2xl">
            <button
              onClick={() => setShowSliderModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-white mb-4">
              {editingSlider ? 'Slider Afişini Düzenle' : 'Yeni Slider Afişi Ekle'}
            </h2>

            <form onSubmit={handleSliderSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Yazı Etiketi (Küçük Tag)</label>
                <input
                  type="text"
                  value={sliderForm.tag}
                  onChange={(e) => setSliderForm({ ...sliderForm, tag: e.target.value })}
                  placeholder="Örn: KAMPANYA, DUYURU, FIRSAT"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Kampanya Başlığı</label>
                <input
                  type="text"
                  value={sliderForm.title}
                  onChange={(e) => setSliderForm({ ...sliderForm, title: e.target.value })}
                  placeholder="Afiş üzerinde görünecek ana başlık..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Alt Detay Açıklama Metni</label>
                <textarea
                  value={sliderForm.desc}
                  onChange={(e) => setSliderForm({ ...sliderForm, desc: e.target.value })}
                  placeholder="Afiş altındaki detaylı tanıtım veya kampanya açıklaması..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500 h-20 resize-none"
                />
              </div>

              <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-bold block">Slider Görseli (URL veya Dosya Yolu)</label>
                  <span className="text-[10px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono font-bold">Öneri: 1200x400 (3:1)</span>
                </div>
                <input
                  type="text"
                  value={sliderForm.image}
                  onChange={(e) => setSliderForm({ ...sliderForm, image: e.target.value })}
                  placeholder="Örn: https://images.unsplash.com/... (Boş bırakılırsa arka plan rengi kullanılır)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-400 leading-normal mt-1">
                  💡 <strong>Hap Bilgi / Ölçü Notu:</strong> Kendi cihazınızdan tasarım yüklerken görsellerinizin en boy oranının <strong>1200 x 400 piksel (veya 3:1 yatay oranı)</strong> olmasına özen gösterin. Bu oran, masaüstü ve mobil ekranlarda slider'ın en pürüzsüz şekilde oturmasını sağlar.
                </p>
              </div>

              <div className="space-y-2.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRedirect"
                    checked={sliderForm.isRedirect}
                    onChange={(e) => setSliderForm({ ...sliderForm, isRedirect: e.target.checked })}
                    className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                  />
                  <label htmlFor="isRedirect" className="text-slate-300 font-bold cursor-pointer select-none">
                    Slider'ı Yönlendirmeli Yap (Tıklanabilir)
                  </label>
                </div>

                {sliderForm.isRedirect && (
                  <div className="space-y-3 pt-1 border-t border-slate-800/60 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-medium block">Yönlendirme Türü</label>
                      <select
                        value={sliderForm.redirectType}
                        onChange={(e) => setSliderForm({ ...sliderForm, redirectType: e.target.value as 'category' | 'product', redirectTarget: '' })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 font-sans"
                      >
                        <option value="category">Kategoriye Yönlendir</option>
                        <option value="product">Ürüne Yönlendir</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-400 font-medium block">Yönlendirilecek Hedef</label>
                      {sliderForm.redirectType === 'category' ? (
                        <select
                          value={sliderForm.redirectTarget}
                          onChange={(e) => setSliderForm({ ...sliderForm, redirectTarget: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 font-sans"
                          required={sliderForm.isRedirect}
                        >
                          <option value="">Kategori Seçin...</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={sliderForm.redirectTarget}
                          onChange={(e) => setSliderForm({ ...sliderForm, redirectTarget: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 font-sans"
                          required={sliderForm.isRedirect}
                        >
                          <option value="">Ürün Seçin...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.brand}] {p.name} - {p.price} TL
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Arka Plan Sınıfı (Tailwind)</label>
                  <select
                    value={sliderForm.bg}
                    onChange={(e) => setSliderForm({ ...sliderForm, bg: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 font-mono"
                  >
                    <option value="bg-gradient-to-r from-emerald-800 to-teal-950">Zümrüt Yeşil (Varsayılan)</option>
                    <option value="bg-gradient-to-r from-amber-600 to-yellow-950">Altın Bal Sarısı</option>
                    <option value="bg-gradient-to-r from-rose-800 to-red-950">Baharat Kırmızı</option>
                    <option value="bg-gradient-to-r from-indigo-800 to-slate-950">Lapis Mavi</option>
                    <option value="bg-gradient-to-r from-stone-800 to-stone-950">Koyu Antrasit</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium">Yayın Durumu</label>
                  <select
                    value={sliderForm.status}
                    onChange={(e) => setSliderForm({ ...sliderForm, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="active">Yayında (Aktif)</option>
                    <option value="inactive">Gizli (Pasif)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition mt-2"
              >
                {editingSlider ? 'Afiş Bilgilerini Güncelle' : 'Slider Afişi Oluştur'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CATEGORY CREATE/UPDATE */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 relative animate-fadeIn shadow-2xl">
            <button
              onClick={() => setShowCategoryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-white mb-4">
              {editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori Tanımla'}
            </h2>

            <form onSubmit={handleCategorySubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Kategori Adı</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Örn: Unlu Mamuller & Tatlılar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Kategori Görseli (URL veya Boş Bırakın)</label>
                <input
                  type="text"
                  value={categoryForm.image}
                  onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })}
                  placeholder="Örn: https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                  Görsel girmezseniz kategori ismine en uygun gıda görseli otomatik atanacaktır.
                </p>
              </div>

              {categoryForm.image && (
                <div className="mt-2 p-2 border border-slate-800 rounded-xl bg-slate-950/40">
                  <span className="text-[10px] text-slate-500 block mb-1">Önizleme:</span>
                  <div className="w-full h-24 rounded-lg overflow-hidden">
                    <img 
                      src={categoryForm.image} 
                      alt="Önizleme" 
                      className="w-full h-full object-cover" 
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=160&auto=format&fit=crop&q=80'; }}
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition mt-2 text-xs"
              >
                {editingCategory ? 'Değişiklikleri Kaydet' : 'Kategori Oluştur'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOM REACT DELETE CONFIRMATION */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-start gap-3 text-amber-500 mb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-white">Silme İşlemini Onayla</h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  {deleteConfirm.title}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Vazgeç
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/10 transition"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
