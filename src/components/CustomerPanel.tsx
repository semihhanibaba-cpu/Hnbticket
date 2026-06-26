import React, { useState, useEffect } from 'react';
import { 
  Search, ShoppingBag, User as UserIcon, CreditCard, Bell, LogOut, 
  Plus, Minus, Trash2, X, ChevronRight, ChevronLeft, Filter, Sliders,
  ArrowUpRight, ArrowDownRight, AlertCircle, Heart, Star, ShoppingCart, 
  FileText, CheckCircle, Clock, Truck, RefreshCw, Key, Shield
} from 'lucide-react';
import { Product, Order, BalanceMovement, Notification } from '../types';
import Logo from './Logo';

interface CustomerPanelProps {
  token: string;
  user: any;
  onLogout: () => void;
  onRefreshUser: () => void;
}

export default function CustomerPanel({ token, user, onLogout, onRefreshUser }: CustomerPanelProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'shop' | 'profile' | 'notifications'>('shop');
  const [profileSection, setProfileSection] = useState<'info' | 'addresses' | 'orders' | 'balance' | 'password'>('info');

  // Products & Shopping
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`favorites_${user?.id || 'guest'}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>(() => {
    try {
      const saved = localStorage.getItem(`cart_${user?.id || 'guest'}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [orderNote, setOrderNote] = useState('');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 200000 });
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // User History States
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [myMovements, setMyMovements] = useState<BalanceMovement[]>([]);

  // Password Update
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });

  // Carousel Slider Banner Index
  const [sliderIndex, setSliderIndex] = useState(0);

  // Status banners
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);

  // Image zoom state in details
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  // Order Confirmation Dialog and Dynamic Banners
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [banners, setBanners] = useState<any[]>([
    {
      title: 'Hanibaba Gıda Toptan Bayi Portalı',
      desc: 'Hanibaba kalitesiyle bakliyat, un, süt ürünleri ve şarküteride doğrudan fabrikadan işletmenize güvenli sevkiyat.',
      bg: 'bg-gradient-to-r from-emerald-800 to-teal-950',
      tag: 'DOĞRUDAN SEVKİYAT'
    },
    {
      title: 'Toplu Alımlarda Cari Limit ve Ek İskonto',
      desc: 'Fırıncılar, restoran zincirleri ve toptan gıdacılara özel 50 ton üzeri siparişlerde KDV muafiyet bakiye iadeleri.',
      bg: 'bg-gradient-to-r from-teal-800 to-emerald-950',
      tag: 'BAYİ FIRSATI'
    }
  ]);

  useEffect(() => {
    fetchProducts();
    fetchBanners();
    fetchCategories();
    if (token) {
      fetchMyOrders();
      fetchNotifications();
      fetchMovements();
    }
  }, [token, activeTab]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart));
    }
  }, [cart, user?.id]);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`favorites_${user.id}`, JSON.stringify(favorites));
    }
  }, [favorites, user?.id]);

  useEffect(() => {
    if (banners && banners.length > 0) {
      const interval = setInterval(() => {
        setSliderIndex(prev => (prev >= banners.length - 1 ? 0 : prev + 1));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners]);

  const showNotification = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 1500);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 1500);
    }
  };

  const fetchBanners = async () => {
    try {
      const res = await fetch('/api/sliders');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setBanners(data);
        }
      }
    } catch (e) {
      console.error('Sliders fetch failed:', e);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      console.error('Categories fetch failed:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) { console.error(e); }
  };

  const fetchMyOrders = async () => {
    try {
      const res = await fetch('/api/orders/my', { headers: { Authorization: `Bearer ${token}` } });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setMyOrders(data);
      }
    } catch (e) { console.error(e); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) { console.error(e); }
  };

  const fetchMovements = async () => {
    try {
      const res = await fetch('/api/balance-movements/my', { headers: { Authorization: `Bearer ${token}` } });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setMyMovements(data);
      }
    } catch (e) { console.error(e); }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (e) { console.error(e); }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(passwordForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Şifre güncellenemedi.');

      showNotification('Giriş şifreniz başarıyla güncellendi.', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  const handleSliderClick = (banner: any) => {
    if (!banner || !banner.isRedirect || !banner.redirectTarget) return;

    if (banner.redirectType === 'category') {
      setSelectedCategory(banner.redirectTarget);
      setSelectedProduct(null);
      setActiveTab('shop');
      showNotification(`"${banner.redirectTarget}" kategorisine yönlendirildiniz.`, 'success');
    } else if (banner.redirectType === 'product') {
      const targetProd = products.find(p => p.id === banner.redirectTarget);
      if (targetProd) {
        setSelectedProduct(targetProd);
        setActiveTab('shop');
        showNotification(`"${targetProd.name}" ürününe yönlendirildiniz.`, 'success');
      } else {
        showNotification("Yönlendirilen ürün şu an mevcut değil.", "error");
      }
    }
  };

  // CART WORKFLOW
  const handleAddToCart = (product: Product, qty: number = 1) => {
    if (product.stock <= 0) {
      showNotification('Bu ürünün stoğu kalmamıştır.', 'error');
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + qty;
        if (newQty > product.stock) {
          showNotification(`Maksimum stok sınırını aştınız. Mevcut Stok: ${product.stock}`, 'error');
          return prev;
        }
        showNotification(`${product.name} sepetinizde güncellendi.`, 'success');
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item);
      }
      showNotification(`${product.name} sepete eklendi.`, 'success');
      return [...prev, { product, quantity: qty }];
    });
  };

  const handleUpdateCartQty = (productId: string, increment: boolean) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const targetQty = increment ? item.quantity + 1 : item.quantity - 1;
          if (targetQty <= 0) return null;
          if (targetQty > item.product.stock) {
            showNotification(`Maksimum stok sınırını aştınız. Mevcut Stok: ${item.product.stock}`, 'error');
            return item;
          }
          return { ...item, quantity: targetQty };
        }
        return item;
      }).filter(Boolean) as any;
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    showNotification('Ürün sepetten çıkarıldı.', 'success');
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // CART PRICE CALCULATIONS
  const cartSubtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartVat = cart.reduce((sum, item) => sum + item.product.price * (item.product.vatRate / 100) * item.quantity, 0);
  const cartTotal = cartSubtotal + cartVat;

  // CHECKOUT ORDER (1000 TL minimum & sufficient balance control)
  const handleCheckoutSubmit = async () => {
    // Check minimum order amount limit
    if (cartTotal < 1000) {
      showNotification(`Sipariş verebilmek için sepet tutarınız minimum 1.000 TL olmalıdır. Eksik tutar: ${(1000 - cartTotal).toLocaleString('tr-TR')} TL`, 'error');
      return;
    }

    // Check user balance
    if (user.balance < cartTotal) {
      showNotification(`Yetersiz bakiye! Bu siparişi tamamlamak için ${cartTotal.toLocaleString('tr-TR')} TL gerekiyor. Bakiyeniz: ${user.balance.toLocaleString('tr-TR')} TL`, 'error');
      return;
    }

    try {
      const orderProductsPayload = cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          products: orderProductsPayload,
          note: orderNote,
          address: user.address
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sipariş oluşturulamadı.');

      showNotification(`Siparişiniz ${data.orderNo} koduyla başarıyla oluşturuldu ve bakiye düşürüldü!`, 'success');
      setCart([]);
      setOrderNote('');
      setShowCartDrawer(false);
      setShowConfirmation(false);
      onRefreshUser(); // Refresh user state (balance update)
      fetchMyOrders();
      fetchMovements();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // EXPORT UTILS FOR CURRENT USER
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

  // SEARCH AND FILTER COMPUTATIONS
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    const matchesBrand = !selectedBrand || p.brand === selectedBrand;
    const matchesPrice = p.price >= priceRange.min && p.price <= priceRange.max;
    const matchesStock = !onlyInStock || p.stock > 0;
    const matchesFavorites = !showOnlyFavorites || favorites.includes(p.id);

    return matchesSearch && matchesCategory && matchesBrand && matchesPrice && matchesStock && matchesFavorites;
  });

  const uniqueBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));

  const getOrderStatusLabel = (status: string) => {
    const sMap: Record<string, { label: string; cls: string }> = {
      pending: { label: 'Onay Bekliyor', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
      approved: { label: 'Sipariş Onaylandı', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      preparing: { label: 'Hazırlanıyor', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
      shipping: { label: 'Kargoya Verildi', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
      delivered: { label: 'Teslim Edildi', cls: 'bg-teal-100 text-teal-700 border-teal-200' },
      cancelled: { label: 'İptal Edildi', cls: 'bg-rose-100 text-rose-700 border-rose-200' }
    };
    return sMap[status] || { label: status, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-16 md:pb-0">
      {/* Marketplace Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => { setActiveTab('shop'); setSelectedProduct(null); }}>
              <Logo size="md" />
            </div>

            {/* Instant Search Bar */}
            {activeTab === 'shop' && (
              <div className="flex-1 max-w-xl flex gap-2 items-center hidden md:flex">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Search className="w-4.5 h-4.5" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Toptan gıda ürünü, un, unlu mamüller, yağ veya bakliyat ara..."
                    className="w-full bg-slate-100 border border-transparent focus:border-orange-500 focus:bg-white rounded-xl py-2 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 focus:ring-1 focus:ring-orange-500 outline-none transition"
                  />
                </div>
                <button
                  onClick={() => setShowFilterDrawer(true)}
                  className={`p-2 border rounded-xl flex items-center justify-center transition shrink-0 ${
                    selectedBrand || priceRange.min > 0 || priceRange.max < 200000 || onlyInStock
                      ? 'bg-orange-50 border-orange-500 text-orange-500'
                      : 'bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200'
                  }`}
                  title="Filtrele"
                >
                  <Sliders className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* User Details and Controls */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {/* Dynamic Balance Indicator badge */}
              <div 
                onClick={() => { setActiveTab('profile'); setProfileSection('balance'); }}
                className="bg-orange-50 hover:bg-orange-100 border border-orange-100 rounded-xl px-3.5 py-1.5 flex items-center gap-2 cursor-pointer transition select-none"
              >
                <CreditCard className="w-4 h-4 text-orange-500" />
                <div className="text-left">
                  <p className="text-3xs text-orange-700 font-bold uppercase tracking-wider">LİMİTİM</p>
                  <p className="text-xs sm:text-sm font-black text-orange-600">{(user.balance || 0).toLocaleString('tr-TR')} TL</p>
                </div>
              </div>

              {/* Favorites trigger */}
              <button 
                onClick={() => { setActiveTab('shop'); setSelectedCategory(''); setSearchQuery(''); setSelectedProduct(null); setShowOnlyFavorites(!showOnlyFavorites); }}
                className={`p-2.5 hover:bg-slate-100 rounded-xl relative transition hidden md:inline-flex ${showOnlyFavorites ? 'text-rose-500 bg-rose-50' : 'text-slate-600'}`}
                title="Favorilerim"
              >
                <Heart className="w-5 h-5" />
                {favorites.length > 0 && (
                  <span className="absolute top-1 right-1 bg-rose-500 text-white font-bold text-3xs px-1.5 py-0.5 rounded-full">
                    {favorites.length}
                  </span>
                )}
              </button>

              {/* Notification badge */}
              <button 
                onClick={() => { setActiveTab('notifications'); handleMarkNotificationsRead(); }}
                className="p-2.5 hover:bg-slate-100 text-slate-600 rounded-xl relative transition animate-pulse hidden md:inline-flex"
                title="Bildirimler"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute top-1 right-1 bg-orange-500 text-white font-bold text-3xs px-1.5 py-0.5 rounded-full">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>

              {/* Cart Toggle */}
              <button 
                onClick={() => setShowCartDrawer(true)}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl relative transition flex items-center gap-1.5 px-4 font-bold text-xs hidden md:flex"
              >
                <ShoppingCart className="w-4.5 h-4.5" />
                <span className="hidden sm:inline">Sepetim</span>
                {cart.length > 0 && (
                  <span className="bg-orange-500 text-white font-bold text-3xs px-1.5 py-0.5 rounded-full">
                    {cart.length}
                  </span>
                )}
              </button>

              {/* Profile dropdown / Avatar */}
              <div 
                onClick={() => { setActiveTab('profile'); setProfileSection('info'); }}
                className="items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer group hidden md:flex"
              >
                <div className="w-8.5 h-8.5 bg-orange-500/10 border border-orange-500/20 text-orange-600 font-bold rounded-full flex items-center justify-center text-sm group-hover:bg-orange-500 group-hover:text-white transition">
                  {user.name ? user.name[0].toUpperCase() : 'B'}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{user.name} {user.surname}</p>
                  <p className="text-3xs text-slate-500 truncate max-w-28 uppercase font-semibold">{user.companyName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Bottom-Center Toast Notification */}
      {(successMsg || errorMsg) && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3.5 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-800 animate-fadeIn text-xs font-semibold max-w-sm text-center">
          {successMsg ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </>
          )}
        </div>
      )}

      {/* Main Body Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: SHOP CATALOG */}
        {activeTab === 'shop' && !selectedProduct && (
          <div className="space-y-6">
            {/* Promo Slider Banner (Carousel style) */}
            {!showOnlyFavorites && banners && banners[sliderIndex] && (
              <div 
                onClick={() => handleSliderClick(banners[sliderIndex])}
                className={`relative rounded-2xl overflow-hidden h-40 sm:h-52 md:h-60 shadow-md ${banners[sliderIndex].isRedirect ? 'cursor-pointer group select-none hover:shadow-lg transition-all duration-300' : ''}`}
              >
                <div 
                  className={`w-full h-full p-6 sm:p-10 flex flex-col justify-center text-white transition-all duration-500 relative ${banners[sliderIndex].image ? '' : (banners[sliderIndex].bg || 'bg-gradient-to-r from-emerald-800 to-teal-950')}`}
                  style={banners[sliderIndex].image ? { backgroundImage: `url(${banners[sliderIndex].image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                >
                  {/* Dark overlay for custom images to keep text beautifully legible - only if text exists */}
                  {banners[sliderIndex].image && (banners[sliderIndex].title || banners[sliderIndex].desc) && (
                    <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[0.2px] z-0 transition-opacity group-hover:opacity-40" />
                  )}
                  
                  <div className="relative z-10">
                    {banners[sliderIndex].tag && (banners[sliderIndex].title || banners[sliderIndex].desc) && (
                      <span className="bg-white/20 text-white backdrop-blur px-2.5 py-0.5 rounded text-3xs font-extrabold uppercase tracking-widest w-max mb-3 inline-block">
                        {banners[sliderIndex].tag}
                      </span>
                    )}
                    {banners[sliderIndex].title && (
                      <h1 className="text-lg sm:text-2xl md:text-3xl font-black max-w-xl leading-tight text-white transition-transform group-hover:scale-[1.01] origin-left duration-300">
                        {banners[sliderIndex].title}
                      </h1>
                    )}
                    {banners[sliderIndex].desc && (
                      <p className="text-white/80 text-3xs sm:text-xs mt-2 max-w-lg">
                        {banners[sliderIndex].desc}
                      </p>
                    )}
                    {banners[sliderIndex].isRedirect && (
                      <span className="inline-flex items-center gap-1 mt-3.5 text-orange-400 font-extrabold text-[10px] tracking-widest uppercase bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20 group-hover:bg-orange-500/25 transition">
                        <span>DETAYLARI İNCELE</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); setSliderIndex(prev => prev === 0 ? banners.length - 1 : prev - 1); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur transition z-20"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSliderIndex(prev => prev === banners.length - 1 ? 0 : prev + 1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur transition z-20"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile Instant Search & Filter Bar */}
            <div className="flex gap-2 items-center md:hidden block">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Search className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Toptan gıda ürünü, un, yağ ara..."
                  className="w-full bg-white border border-slate-200 focus:border-orange-500 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 focus:ring-1 focus:ring-orange-500 outline-none transition shadow-xs"
                />
              </div>
              <button
                onClick={() => setShowFilterDrawer(true)}
                className={`p-2.5 border rounded-xl flex items-center justify-center transition shrink-0 shadow-xs ${
                  selectedBrand || priceRange.min > 0 || priceRange.max < 200000 || onlyInStock
                    ? 'bg-orange-50 border-orange-500 text-orange-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Filtrele"
              >
                <Sliders className="w-5 h-5" />
              </button>
            </div>

            {/* Custom Premium Boxed & Imaged Categories Grid */}
            {!showOnlyFavorites && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-slate-800 text-xs sm:text-sm tracking-tight uppercase">Kategoriler</h3>
                  {selectedCategory && (
                    <button 
                      onClick={() => setSelectedCategory('')}
                      className="text-3xs font-extrabold text-orange-600 hover:text-orange-700 uppercase"
                    >
                      Tümünü Göster
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 select-none">
                  {/* Dynamic "Tüm Ürünler" Card */}
                  <div
                    onClick={() => setSelectedCategory('')}
                    className={`relative h-24 sm:h-28 rounded-2xl overflow-hidden cursor-pointer group border-2 transition-all duration-300 ${
                      !selectedCategory 
                        ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-md shadow-orange-500/10' 
                        : 'border-slate-200/80 hover:border-orange-300 bg-white shadow-xs'
                    }`}
                  >
                    <img 
                      src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80" 
                      alt="Tüm Ürünler" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent" />
                    <div className="absolute inset-0 p-3 flex flex-col justify-end text-left">
                      <p className="text-white font-black text-xs sm:text-sm tracking-tight leading-tight">
                        Tüm Ürünler
                      </p>
                    </div>
                  </div>

                  {/* Categories Iteration */}
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.name;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedCategory(isSelected ? '' : cat.name)}
                        className={`relative h-24 sm:h-28 rounded-2xl overflow-hidden cursor-pointer group border-2 transition-all duration-300 ${
                          isSelected 
                            ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-md shadow-orange-500/10' 
                            : 'border-slate-200/80 hover:border-orange-300 bg-white shadow-xs'
                        }`}
                      >
                        <img 
                          src={cat.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80'} 
                          alt={cat.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80'; }}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-transparent" />
                        <div className="absolute inset-0 p-3 flex flex-col justify-end text-left">
                          <p className="text-white font-black text-xs sm:text-sm tracking-tight leading-tight line-clamp-2">
                            {cat.name}
                          </p>
                          {isSelected && (
                            <span className="text-[8px] font-bold text-orange-400 mt-1 uppercase tracking-wider">Aktif Filtre</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product catalog List */}
            <div className="w-full space-y-4">
              <div className="flex justify-between items-center text-xs text-slate-500 bg-white border border-slate-200 px-4 py-3.5 rounded-2xl shadow-xs flex-wrap gap-2">
                <div>
                  Toplam <span className="font-extrabold text-slate-900">{filteredProducts.length}</span> ürün listeleniyor 
                  {selectedCategory && (
                    <span> / Kategori: <strong className="text-orange-600">{selectedCategory}</strong></span>
                  )}
                  {selectedBrand && (
                    <span> / Marka: <strong className="text-orange-600">{selectedBrand}</strong></span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(selectedBrand || selectedCategory || priceRange.min > 0 || priceRange.max < 200000 || onlyInStock) && (
                    <button 
                      onClick={() => { setSelectedBrand(''); setSelectedCategory(''); setPriceRange({ min: 0, max: 200000 }); setOnlyInStock(false); }}
                      className="text-3xs font-extrabold text-rose-600 hover:text-rose-700 uppercase px-2 py-1 hover:bg-rose-50 rounded-lg transition"
                    >
                      Filtreleri Temizle
                    </button>
                  )}
                  <span className="font-extrabold text-[10px] text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-lg uppercase tracking-wide">
                    MİNİMUM SİPARİŞ LİMİTİ: 1.000 TL
                  </span>
                </div>
              </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                  {filteredProducts.map(p => (
                    <div 
                      key={p.id} 
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden group hover:border-orange-500/50 hover:shadow-md transition-all duration-300 flex flex-col relative"
                    >
                      {/* Favorite Button */}
                      <button 
                        onClick={() => toggleFavorite(p.id)}
                        className="absolute top-2 right-2 z-10 p-1 sm:p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-400 hover:text-rose-500 shadow-sm backdrop-blur-xs transition"
                      >
                        <Heart className={`w-3.5 h-3.5 sm:w-4 h-4 ${favorites.includes(p.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>

                      {/* Campaign tag */}
                      {p.isCampaign && (
                        <span className="absolute top-2 left-2 z-10 bg-orange-500 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded shadow-sm uppercase tracking-wide">
                          FIRSAT
                        </span>
                      )}

                      {/* Product image container */}
                      <div className="aspect-square bg-slate-50 overflow-hidden cursor-pointer relative" onClick={() => { setSelectedProduct(p); setActiveImgIdx(0); }}>
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-102 transition duration-500" />
                      </div>

                      {/* Product details */}
                      <div className="p-2 sm:p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[9px] font-extrabold text-orange-600 uppercase tracking-wider">{p.brand}</span>
                            <span className={`text-[9px] font-semibold ${p.stock <= 5 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                              {p.stock <= 0 ? 'Tükendi' : p.stock <= 5 ? `Son ${p.stock}` : `Stok: ${p.stock}`}
                            </span>
                          </div>
                          
                          <h3 
                            className="font-bold text-slate-800 text-xs sm:text-sm mt-0.5 cursor-pointer hover:text-orange-500 line-clamp-1 leading-snug"
                            onClick={() => { setSelectedProduct(p); setActiveImgIdx(0); }}
                          >
                            {p.name}
                          </h3>
                          <p className="text-slate-500 text-[10px] mt-1 line-clamp-1 leading-relaxed hidden sm:block">{p.shortDesc}</p>
                        </div>

                        {/* Pricing & Add to cart button */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                          <div>
                            <p className="text-[8px] text-slate-400 font-medium">BİRİM FİYATI</p>
                            <p className="text-xs sm:text-sm font-black text-slate-900">{p.price.toLocaleString('tr-TR')} TL</p>
                          </div>

                          <button 
                            disabled={p.stock <= 0}
                            onClick={() => handleAddToCart(p, 1)}
                            className="p-1.5 sm:p-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg transition shadow-md shadow-orange-500/10 active:scale-[0.96]"
                            title="Sepete Ekle"
                          >
                            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredProducts.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-400 text-sm bg-white border border-slate-200 rounded-2xl">
                      Aradığınız kriterlere uygun ürün bulunamadı.
                    </div>
                  )}
                </div>
              </div>
          </div>
        )}

        {/* TAB 1 DETAIL VIEW: PRODUCT DETAIL MODULE */}
        {activeTab === 'shop' && selectedProduct && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-8">
            {/* Back button */}
            <button 
              onClick={() => setSelectedProduct(null)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 font-bold uppercase transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>KATALOGA GERİ DÖN</span>
            </button>

            {/* Main grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Left Gallery */}
              <div className="space-y-4">
                <div 
                  className="aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 relative cursor-zoom-in"
                  onMouseEnter={() => setIsZoomed(true)}
                  onMouseLeave={() => setIsZoomed(false)}
                >
                  <img 
                    src={selectedProduct.images[activeImgIdx]} 
                    alt={selectedProduct.name} 
                    className={`w-full h-full object-cover transition-transform duration-300 ${isZoomed ? 'scale-150' : 'scale-100'}`} 
                  />
                </div>
                {/* Thumbnails list */}
                {selectedProduct.images.length > 1 && (
                  <div className="flex gap-2">
                    {selectedProduct.images.map((img, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setActiveImgIdx(idx)}
                        className={`w-16 h-16 rounded-xl overflow-hidden border bg-slate-50 transition ${activeImgIdx === idx ? 'border-orange-500' : 'border-slate-200'}`}
                      >
                        <img src={img} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Details Column */}
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-black text-orange-600 tracking-widest uppercase">{selectedProduct.brand}</span>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{selectedProduct.name}</h1>
                  <p className="text-slate-500 text-xs mt-2 font-medium">Stok Kodu: <span className="font-mono text-slate-800 font-bold">{selectedProduct.stockCode}</span></p>
                </div>

                {/* Rating mockup */}
                <div className="flex items-center gap-1">
                  <div className="flex text-amber-400">
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                    <Star className="w-4 h-4 fill-amber-400" />
                  </div>
                  <span className="text-slate-400 text-xs ml-1 font-bold">5.0 (48 Yorum)</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                  <p className="text-3xs text-slate-400 font-bold uppercase tracking-wider">KURUMSAL BAYİ BİRİM FİYATI</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">{selectedProduct.price.toLocaleString('tr-TR')} TL</span>
                    <span className="text-xs text-slate-500 font-bold">+%{selectedProduct.vatRate} KDV</span>
                  </div>
                  <p className="text-3xs text-slate-500 leading-relaxed">
                    KDV Dahil Toplam: <span className="font-bold">{(selectedProduct.price * (1 + selectedProduct.vatRate / 100)).toLocaleString('tr-TR')} TL</span>
                  </p>
                </div>

                {/* Stock condition panel */}
                <div className="text-xs space-y-1.5">
                  <p className="font-bold text-slate-800">Stok Durumu:</p>
                  {selectedProduct.stock > 0 ? (
                    <p className="text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>Aktif Stokta (Dilediğiniz kadar sipariş geçebilirsiniz - Mevcut: {selectedProduct.stock} {selectedProduct.unit})</span>
                    </p>
                  ) : (
                    <p className="text-rose-500 font-bold">Stok Kalmamıştır</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    disabled={selectedProduct.stock <= 0}
                    onClick={() => handleAddToCart(selectedProduct, 1)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 text-sm active:scale-[0.98]"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>SEPETE EKLE</span>
                  </button>

                  <button 
                    onClick={() => toggleFavorite(selectedProduct.id)}
                    className="p-3.5 border border-slate-200 hover:bg-slate-50 rounded-xl transition text-slate-400 hover:text-rose-500"
                  >
                    <Heart className={`w-5 h-5 ${favorites.includes(selectedProduct.id) ? 'fill-rose-500 text-rose-500 border-rose-500' : ''}`} />
                  </button>
                </div>

                {/* Technical specifications tab view */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h3 className="font-bold text-sm text-slate-900">Ürün Detayı & Teknik Bilgiler</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{selectedProduct.shortDesc}</p>
                  {selectedProduct.longDesc && (
                    <div className="bg-slate-50 p-4 rounded-xl text-3xs text-slate-600 font-mono leading-relaxed whitespace-pre-wrap border border-slate-150">
                      {selectedProduct.longDesc}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Similar Products Recommendation */}
            <div className="border-t border-slate-100 pt-8 space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Benzer Ürünler (Önerilenler)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {products
                  .filter(p => p.id !== selectedProduct.id && p.category === selectedProduct.category)
                  .slice(0, 4)
                  .map(p => (
                    <div 
                      key={p.id}
                      onClick={() => { setSelectedProduct(p); setActiveImgIdx(0); }}
                      className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center cursor-pointer hover:border-orange-500 hover:bg-white transition"
                    >
                      <img src={p.images[0]} className="w-full aspect-square object-cover rounded-lg mb-2" />
                      <p className="text-3xs font-bold text-slate-500 uppercase tracking-wider">{p.brand}</p>
                      <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs font-black text-orange-600 mt-1">{p.price.toLocaleString('tr-TR')} TL</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER PROFILE SCREEN */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* Left sidebar Profile controls */}
            <aside className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
              {/* Profile Card Header */}
              <div className="p-4 text-center border-b border-slate-100 mb-3 space-y-2">
                <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 text-orange-600 font-bold rounded-full flex items-center justify-center text-lg mx-auto">
                  {user.name ? user.name[0].toUpperCase() : 'B'}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">{user.name} {user.surname}</h3>
                  <p className="text-3xs text-slate-500 uppercase tracking-widest">{user.companyName}</p>
                </div>
              </div>

              <button
                onClick={() => setProfileSection('info')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${profileSection === 'info' ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <UserIcon className="w-4 h-4" />
                <span>Profil Bilgilerim</span>
              </button>

              <button
                onClick={() => setProfileSection('addresses')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${profileSection === 'addresses' ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Truck className="w-4 h-4" />
                <span>Adres Bilgilerim</span>
              </button>

              <button
                onClick={() => setProfileSection('orders')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${profileSection === 'orders' ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Siparişlerim</span>
                {myOrders.length > 0 && (
                  <span className="ml-auto bg-slate-100 text-slate-700 text-3xs font-extrabold px-1.5 py-0.5 rounded-full">
                    {myOrders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setProfileSection('balance')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 ${profileSection === 'balance' ? 'bg-orange-50 text-orange-600' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Bakiye Ekstrem</span>
              </button>

               <a
                 href="https://wa.me/905010160527"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/40"
               >
                 <svg className="w-4 h-4 fill-emerald-600 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                   <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.528 1.975 14.069 1.5 12.009 1.5c-5.442 0-9.866 4.372-9.87 9.802 0 1.83.504 3.615 1.46 5.181l-.997 3.637 3.755-.968h-.001zm11.457-6.732c-.31-.155-1.838-.91-2.126-1.01-.287-.105-.497-.155-.706.155-.21.31-.812 1.01-.994 1.218-.182.208-.364.23-.674.075-1.127-.565-1.921-1.002-2.686-2.31-.2-.345.2-.32.571-1.062.062-.125.031-.235-.015-.312-.047-.078-.415-1.002-.57-1.373-.15-.36-.316-.31-.415-.316-.1-.005-.214-.006-.32-.006-.107 0-.282.04-.43.2-.148.16-.564.55-.564 1.34 0 .79.576 1.55.656 1.66.08.11 1.134 1.732 2.748 2.428.384.166.684.265.918.339.386.123.738.106 1.016.064.31-.046 1.838-.75 2.1-1.44.26-.69.26-1.28.18-1.4-.08-.12-.29-.2-.6-.355z"/>
                 </svg>
                 <span>Müşteri Temsilcisi</span>
               </a>

              <div className="pt-4 border-t border-slate-100 mt-4">
                <button
                  onClick={onLogout}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Güvenli Çıkış</span>
                </button>
              </div>
            </aside>

            {/* Right main Profile detail sections */}
            <main className="md:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
              {/* Profile sub-section 1: Info card details */}
              {profileSection === 'info' && (
                <div className="space-y-6">
                  <h2 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">Profil Bilgilerim</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-600">
                    <div className="space-y-1">
                      <p className="text-slate-400 font-medium">Adı Soyadı</p>
                      <p className="font-bold text-slate-800 text-sm">{user.name} {user.surname}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 font-medium">Bağlı Firma</p>
                      <p className="font-bold text-slate-800 text-sm">{user.companyName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 font-medium">E-Posta / Giriş Kimliği</p>
                      <p className="font-bold text-slate-800 text-sm">{user.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 font-medium">İletişim Numarası</p>
                      <p className="font-bold text-slate-800 text-sm">{user.phone || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 font-medium">T.C. Kimlik No</p>
                      <p className="font-bold text-slate-800 text-sm">{user.tcNo || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 font-medium">Sistem Rolü</p>
                      <p className="font-bold text-slate-800 text-sm uppercase">{user.role}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile sub-section 2: Address card list */}
              {profileSection === 'addresses' && (
                <div className="space-y-6">
                  <h2 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">Adres Bilgilerim</h2>
                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex items-start gap-3.5">
                    <div className="p-2.5 bg-orange-500/10 text-orange-600 rounded-lg">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">Varsayılan Şirket Sevkiyat Adresi</p>
                      <p className="text-slate-600 mt-1.5 leading-relaxed">{user.address || 'Tanımlı bir teslimat adresi bulunmuyor.'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile sub-section 3: My Orders list and tracking */}
              {profileSection === 'orders' && (
                <div className="space-y-6">
                  <h2 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">Sipariş Geçmişim</h2>
                  {myOrders.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-10">Henüz sipariş vermediniz.</p>
                  ) : (
                    <div className="space-y-4">
                      {myOrders.map(o => {
                        const statusObj = getOrderStatusLabel(o.status);
                        return (
                          <div key={o.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                            <div>
                              <p className="font-mono font-bold text-orange-600">{o.orderNo}</p>
                              <p className="text-slate-500 text-3xs mt-1">Sipariş Tarihi: {new Date(o.date).toLocaleString('tr-TR')}</p>
                              <p className="text-slate-700 font-bold mt-1.5">{o.totalAmount.toLocaleString('tr-TR')} TL</p>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusObj.cls}`}>{statusObj.label}</span>
                              <button
                                onClick={() => setSelectedOrderDetails(o)}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-bold transition shrink-0"
                              >
                                İncele
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Profile sub-section 4: Balance Statement with export logs */}
              {profileSection === 'balance' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="font-extrabold text-slate-900 text-base">Bakiye Ekstrem & Hesap Hareketleri</h2>
                      <p className="text-3xs text-slate-500 mt-1">Bakiye yükleme ve sipariş harcama geçmişiniz listelenir.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => window.print()}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                      >
                        Yazdır / PDF Al
                      </button>
                      <button
                        onClick={() => exportToCSV(myMovements, 'bakiye-ekstrem')}
                        className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-md shadow-orange-500/10"
                      >
                        CSV İndir
                      </button>
                    </div>
                  </div>

                  {myMovements.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-10">Bakiye hareketiniz bulunmuyor.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                              <th className="p-3">İşlem Türü</th>
                              <th className="p-3">İşlem Tutarı</th>
                              <th className="p-3">Önceki / Sonraki Bakiye</th>
                              <th className="p-3">İşlem Detay Notu / Tarih</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {myMovements.map(m => (
                              <tr key={m.id} className="hover:bg-slate-50/50 transition">
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-3xs font-semibold ${m.type === 'add' ? 'bg-emerald-100 text-emerald-700' : m.type === 'spend' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {m.type === 'add' ? 'Bakiye Yükleme' : m.type === 'spend' ? 'Harcama' : 'İade'}
                                  </span>
                                </td>
                                <td className="p-3 font-bold">
                                  <span className={m.type === 'add' || m.type === 'refund' ? 'text-emerald-600' : 'text-rose-600'}>
                                    {m.type === 'add' || m.type === 'refund' ? '+' : '-'}{m.amount.toLocaleString('tr-TR')} TL
                                  </span>
                                </td>
                                <td className="p-3 text-slate-500">
                                  <p className="text-slate-400 text-3xs line-through">{m.prevBalance.toLocaleString('tr-TR')} TL</p>
                                  <p className="font-bold text-slate-600">{m.newBalance.toLocaleString('tr-TR')} TL</p>
                                </td>
                                <td className="p-3">
                                  <p className="font-medium text-slate-700">{m.note}</p>
                                  <p className="text-slate-400 text-3xs mt-0.5">{new Date(m.date).toLocaleString('tr-TR')}</p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}


            </main>
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS HUB */}
        {activeTab === 'notifications' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <h2 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Bildirim Merkezi</span>
              <span className="text-xs font-bold text-slate-400 uppercase">TÜM BİLDİRİMLER</span>
            </h2>

            {notifications.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">Okunmamış bir bildirim bulunmuyor.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map(n => (
                  <div key={n.id} className={`py-4 flex gap-4 text-xs items-start ${n.isRead ? 'opacity-70' : ''}`}>
                    <div className={`p-2 rounded-lg shrink-0 ${n.type === 'balance' ? 'bg-emerald-50 text-emerald-600' : n.type === 'order' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs sm:text-sm">{n.title}</span>
                        <span className="text-slate-400 text-3xs shrink-0">{new Date(n.date).toLocaleString('tr-TR')}</span>
                      </div>
                      <p className="text-slate-600 text-xs mt-1 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FLOATING FILTER SIDEBAR SLIDE-OVER DRAWER */}
      {showFilterDrawer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-sm h-full flex flex-col justify-between p-6 relative animate-slideLeft">
            {/* Close button */}
            <button 
              onClick={() => setShowFilterDrawer(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition"
              id="close-filter-drawer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-orange-500" />
                <span>Detaylı Filtreleme</span>
              </h2>
              <p className="text-3xs text-slate-400 mt-1">Gıda ve ürün kriterlerini belirleyerek aramanızı daraltın.</p>
            </div>

            {/* Filter controls */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6 text-xs">
              {/* Category selector in drawer */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Kategori</h4>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-orange-500 text-xs text-slate-800 font-medium"
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic Brand Select */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Marka</h4>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-orange-500 text-xs text-slate-800 font-medium"
                >
                  <option value="">Tüm Markalar</option>
                  {uniqueBrands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              {/* Price Filter Ranges */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Birim Fiyat Aralığı (TL)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block">En Az</span>
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min || ''}
                      onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 text-xs text-center font-bold text-slate-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block">En Çok</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max === 200000 ? '' : priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) || 200000 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 text-xs text-center font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Stock Checkbox */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="stockCheckDrawer"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="w-4.5 h-4.5 accent-orange-500 rounded-lg cursor-pointer"
                />
                <label htmlFor="stockCheckDrawer" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Yalnızca Stoktaki Ürünler
                </label>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="border-t border-slate-100 pt-4 space-y-2.5">
              <button
                onClick={() => setShowFilterDrawer(false)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold py-3 rounded-xl transition text-xs shadow-md shadow-orange-500/10 uppercase tracking-wider"
              >
                Filtreleri Uygula ({filteredProducts.length} Ürün)
              </button>
              {(selectedCategory || selectedBrand || priceRange.min > 0 || priceRange.max < 200000 || onlyInStock) && (
                <button 
                  onClick={() => { 
                    setSelectedCategory(''); 
                    setSelectedBrand(''); 
                    setPriceRange({ min: 0, max: 200000 }); 
                    setOnlyInStock(false); 
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition text-2xs uppercase tracking-wider"
                >
                  Filtreleri Sıfırla
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING CART SIDEBAR SLIDE-OVER DRAWER */}
      {showCartDrawer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full flex flex-col justify-between p-6 relative animate-slideLeft">
            {/* Close button */}
            <button onClick={() => setShowCartDrawer(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition">
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-500" />
                <span>Sepetim</span>
              </h2>
              <p className="text-3xs text-slate-400 mt-1">Eksiksiz B2B siparişi için sepetinizi onaylayın.</p>
            </div>

            {/* Cart products list */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs space-y-2">
                  <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto" />
                  <p>Sepetiniz şu anda boş.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="flex gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs relative">
                    <img src={item.product.images[0]} className="w-12 h-12 object-cover rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{item.product.name}</p>
                      <p className="text-slate-500 text-3xs mt-0.5">Stok Kodu: {item.product.stockCode}</p>
                      <p className="font-bold text-slate-900 mt-1.5">{item.product.price.toLocaleString('tr-TR')} TL</p>
                      
                      {/* Qty modify controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button 
                          onClick={() => handleUpdateCartQty(item.product.id, false)}
                          className="p-1 border border-slate-200 hover:bg-slate-100 rounded-md text-slate-500"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-xs">{item.quantity}</span>
                        <button 
                          onClick={() => handleUpdateCartQty(item.product.id, true)}
                          className="p-1 border border-slate-200 hover:bg-slate-100 rounded-md text-slate-500"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleRemoveFromCart(item.product.id)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Bottom summary and checkouts */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              {cart.length > 0 && (
                <div className="space-y-2.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-3xs font-bold text-slate-500 uppercase tracking-wider">Sipariş Notu</label>
                    <input
                      type="text"
                      value={orderNote}
                      onChange={(e) => setOrderNote(e.target.value)}
                      placeholder="Örn: Hızlı sevk, faturayı maile atın..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-orange-500 text-xs"
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2 text-slate-600">
                    <div className="flex justify-between">
                      <span>Ara Toplam (KDV Hariç)</span>
                      <span>{cartSubtotal.toLocaleString('tr-TR')} TL</span>
                    </div>
                    <div className="flex justify-between">
                      <span>KDV Tutarı</span>
                      <span>{cartVat.toLocaleString('tr-TR')} TL</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 text-sm">
                      <span>KDV Dahil Toplam</span>
                      <span className="text-orange-600">{cartTotal.toLocaleString('tr-TR')} TL</span>
                    </div>
                  </div>

                  {/* Limit Warnings conditions */}
                  {cartTotal < 1000 && (
                    <div className="p-3 bg-amber-50 border border-amber-100 text-amber-700 text-3xs rounded-lg flex items-start gap-2 leading-relaxed">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                      <span>Sipariş oluşturmak için minimum limit olan 1.000 TL\'ye ulaşmalısınız. Eksik: {(1000 - cartTotal).toLocaleString('tr-TR')} TL</span>
                    </div>
                  )}

                  {user.balance < cartTotal && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-3xs rounded-lg flex items-start gap-2 leading-relaxed">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                      <span>Bakiyeniz yetersiz! Sipariş tutarı: {cartTotal.toLocaleString('tr-TR')} TL, Bakiyeniz: {user.balance.toLocaleString('tr-TR')} TL</span>
                    </div>
                  )}

                  <button
                    disabled={cartTotal < 1000 || user.balance < cartTotal || cart.length === 0}
                    onClick={() => { setShowConfirmation(true); setShowCartDrawer(false); }}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-orange-500/10 text-sm"
                  >
                    Sipariş Onay Sayfasına İlerle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: MY ORDER DETAILED LOG */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 relative w-full max-w-lg animate-fadeIn shadow-2xl max-h-120 flex flex-col justify-between">
            <button onClick={() => setSelectedOrderDetails(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition">
              <X className="w-5 h-5" />
            </button>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Sipariş Takibi</h3>
                <p className="text-3xs text-orange-600 font-bold uppercase mt-1">Sipariş No: {selectedOrderDetails.orderNo}</p>
              </div>

              {/* Status Tracker step bar */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                <p className="font-bold text-slate-800 mb-2">Aşama Durumu</p>
                <div className="space-y-3 relative before:absolute before:inset-y-1 before:left-2 before:w-0.5 before:bg-slate-200">
                  {selectedOrderDetails.statusHistory.map((h: any, idx: number) => (
                    <div key={idx} className="flex gap-4 relative z-10 pl-1 text-3xs">
                      <div className="w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-white shrink-0"></div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800 uppercase">{h.status}</span>
                          <span className="text-slate-400">{new Date(h.date).toLocaleString('tr-TR')}</span>
                        </div>
                        {h.note && <p className="text-slate-500 mt-0.5">{h.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order items lists */}
              <div className="space-y-2">
                <p className="font-bold text-slate-800">Alınan Ürünler</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedOrderDetails.products.map((p: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={p.image} className="w-8 h-8 object-cover rounded" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate max-w-xs">{p.name}</p>
                          <p className="text-slate-400 text-3xs">Kod: {p.stockCode}</p>
                        </div>
                      </div>
                      <span className="text-slate-500 font-bold text-3xs shrink-0">{p.quantity} x {p.price.toLocaleString('tr-TR')} TL</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total pricing */}
              <div className="border-t border-slate-150 pt-3 flex justify-between font-extrabold text-sm text-slate-900">
                <span>KDV Dahil Toplam Sipariş Tutarı:</span>
                <span className="text-orange-600">{selectedOrderDetails.totalAmount.toLocaleString('tr-TR')} TL</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHECKOUT ORDER CONFIRMATION PAGE (Onay Sayfası) */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-7 relative w-full max-w-lg animate-fadeIn shadow-2xl my-8 flex flex-col">
            <button
              onClick={() => setShowConfirmation(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-5 text-xs">
              <div className="text-center pb-2 border-b border-slate-100">
                <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="font-extrabold text-slate-900 text-lg">Sipariş Onay Sayfası</h3>
                <p className="text-slate-400 text-3xs mt-1">Siparişinizi tamamlamadan önce lütfen aşağıdaki bilgileri gözden geçiriniz.</p>
              </div>

              {/* Company Info */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 space-y-1">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-4xs">Bayi ve Teslimat Bilgileri</p>
                <p className="font-extrabold text-slate-800 text-xs">{user.companyName || 'Kurumsal Bayi'}</p>
                <p className="text-slate-500 font-medium">Yetkili Alıcı: {user.name} {user.surname}</p>
                <p className="text-slate-500 leading-relaxed font-normal mt-1 text-4xs">
                  <span className="font-bold text-slate-600">Sevk Adresi:</span> {user.address || 'Kayıtlı adres bulunamadı.'}
                </p>
              </div>

              {/* Items Summary */}
              <div className="space-y-2">
                <p className="font-bold text-slate-800 flex justify-between">
                  <span>Sipariş Özetindeki Ürünler</span>
                  <span className="text-slate-400 text-3xs font-normal">{cart.length} çeşit ürün</span>
                </p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-150 text-3xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <img src={item.product.images[0]} className="w-8 h-8 object-cover rounded-lg border border-slate-200" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate max-w-[200px]">{item.product.name}</p>
                          <p className="text-slate-400 text-4xs">Birim Fiyat: {item.product.price.toLocaleString('tr-TR')} TL (+%{item.product.vatRate} KDV)</p>
                        </div>
                      </div>
                      <span className="text-slate-700 font-extrabold shrink-0">
                        {item.quantity} {item.product.unit || 'Adet'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance Calculations */}
              <div className="bg-orange-50/50 p-3.5 rounded-2xl border border-orange-100/60 space-y-2">
                <p className="font-bold text-orange-800 uppercase tracking-wider text-4xs">Mali ve Cari Durum Analizi</p>
                <div className="grid grid-cols-2 gap-y-1.5 text-slate-600 font-medium text-3xs">
                  <span>Mevcut Cari Bakiyeniz:</span>
                  <span className="text-right font-extrabold text-slate-800">{user.balance.toLocaleString('tr-TR')} TL</span>
                  
                  <span>Toplam Sipariş Bedeli:</span>
                  <span className="text-right font-extrabold text-orange-600">-{cartTotal.toLocaleString('tr-TR')} TL</span>
                  
                  <div className="col-span-2 border-t border-orange-100/80 my-1"></div>
                  
                  <span className="text-xs font-extrabold text-slate-900">Kalan Cari Bakiyeniz:</span>
                  <span className="text-right text-xs font-extrabold text-emerald-600">
                    {(user.balance - cartTotal).toLocaleString('tr-TR')} TL
                  </span>
                </div>
              </div>

              {/* Order Note if any */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Sipariş Sevk Notu</label>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Siparişe özel teslimat veya paketleme talimatları ekleyebilirsiniz..."
                  className="w-full border border-slate-200 bg-slate-50 hover:bg-white rounded-xl p-2.5 outline-none focus:border-orange-500 h-14 resize-none transition"
                />
              </div>

              {/* Warnings / Terms of Agreement */}
              <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl text-[10px] text-slate-500 leading-normal flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Siparişi onayladığınızda, sipariş bedeli olan <strong>{cartTotal.toLocaleString('tr-TR')} TL</strong> cari bakiyenizden tahsil edilecek ve siparişiniz onaylanmak üzere depo departmanına aktarılacaktır.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition text-sm text-center"
                >
                  Vazgeç / Düzenle
                </button>
                <button
                  type="button"
                  onClick={handleCheckoutSubmit}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-orange-500/20 text-sm text-center"
                >
                  Güvenle Sipariş Ver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trendyol Style Mobile Sticky Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] px-2 pb-safe">
        <div className="flex justify-around items-center h-16">
          {/* Alışveriş / Katalog Tab */}
          <button
            onClick={() => {
              setActiveTab('shop');
              setShowOnlyFavorites(false);
              setSelectedProduct(null);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition ${
              activeTab === 'shop' && !showOnlyFavorites
                ? 'text-orange-500'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShoppingBag className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold mt-1">Katalog</span>
          </button>

          {/* Favorilerim Tab */}
          <button
            onClick={() => {
              setActiveTab('shop');
              setShowOnlyFavorites(true);
              setSelectedProduct(null);
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition relative ${
              activeTab === 'shop' && showOnlyFavorites
                ? 'text-orange-500'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Heart className={`w-5.5 h-5.5 ${favorites.length > 0 && showOnlyFavorites ? 'fill-orange-500 text-orange-500' : ''}`} />
            {favorites.length > 0 && (
              <span className="absolute top-0.5 right-4 bg-rose-500 text-white font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center leading-none border border-white">
                {favorites.length}
              </span>
            )}
            <span className="text-[10px] font-bold mt-1">Favorilerim</span>
          </button>

          {/* Sepetim Tab */}
          <button
            onClick={() => setShowCartDrawer(true)}
            className="flex flex-col items-center justify-center flex-1 py-1.5 transition relative text-slate-500 hover:text-slate-700"
          >
            <div className="bg-slate-900 text-white p-2.5 rounded-full -mt-6 border-4 border-slate-50 shadow-md shadow-slate-900/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            {cart.length > 0 && (
              <span className="absolute top-0.5 right-4 bg-orange-500 text-white font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center leading-none border border-white">
                {cart.length}
              </span>
            )}
            <span className="text-[10px] font-bold mt-1">Sepetim</span>
          </button>

          {/* Bildirimler Tab */}
          <button
            onClick={() => {
              setActiveTab('notifications');
              handleMarkNotificationsRead();
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition relative ${
              activeTab === 'notifications'
                ? 'text-orange-500'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Bell className="w-5.5 h-5.5" />
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="absolute top-0.5 right-4 bg-orange-500 text-white font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center leading-none border border-white">
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
            <span className="text-[10px] font-bold mt-1">Bildirimler</span>
          </button>

          {/* Hesabım Tab */}
          <button
            onClick={() => {
              setActiveTab('profile');
              setProfileSection('info');
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition ${
              activeTab === 'profile'
                ? 'text-orange-500'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserIcon className="w-5.5 h-5.5" />
            <span className="text-[10px] font-bold mt-1">Hesabım</span>
          </button>
        </div>
      </div>
    </div>
  );
}
