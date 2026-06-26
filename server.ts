import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { kv } from '@vercel/kv';

// Load environment variables
dotenv.config();

// Port configuration (hardcoded 3000 as per environment guidelines)
const PORT = 3000;


// Interface Definitions
interface Company {
  id: string;
  name: string;
  taxNumber: string;
  taxOffice: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface User {
  id: string;
  companyId: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  tcNo?: string;
  passwordHash: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  address: string;
  balance: number;
  createdAt: string;
}

interface Product {
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
  vatRate: number; // e.g. 1, 10, 20
  images: string[];
  videoUrl?: string;
  variants?: string;
  isCampaign: boolean;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  vatRate: number;
  quantity: number;
  image: string;
  stockCode: string;
}

interface Order {
  id: string;
  orderNo: string;
  companyId: string;
  userId: string;
  date: string;
  amount: number; // Subtotal before VAT
  vatAmount: number; // Total VAT
  totalAmount: number; // Total price to pay (amount + vatAmount)
  status: 'pending' | 'approved' | 'preparing' | 'shipping' | 'delivered' | 'cancelled';
  address: string;
  products: OrderItem[];
  note?: string;
  statusHistory: { status: string; date: string; note?: string; updatedBy: string }[];
  createdAt: string;
}

interface BalanceMovement {
  id: string;
  userId: string;
  type: 'add' | 'spend' | 'refund';
  amount: number;
  prevBalance: number;
  newBalance: number;
  orderId?: string;
  note: string;
  date: string;
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  type: 'balance' | 'order' | 'announcement';
  date: string;
}

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  date: string;
}

interface Slider {
  id: string;
  title: string;
  desc: string;
  bg: string;
  tag: string;
  status: 'active' | 'inactive';
  image?: string;
  isRedirect?: boolean;
  redirectType?: 'category' | 'product';
  redirectTarget?: string;
}

interface Category {
  id: string;
  name: string;
  image: string;
}

interface Database {
  companies: Company[];
  users: User[];
  products: Product[];
  orders: Order[];
  balanceMovements: BalanceMovement[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  sliders: Slider[];
  categories?: Category[];
}

// Global DB Instance in-memory, synchronized to disk
let db: Database = {
  companies: [],
  users: [],
  products: [],
  orders: [],
  balanceMovements: [],
  notifications: [],
  auditLogs: [],
  sliders: [],
  categories: []
};

// Cryptography utility
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Read/Write database helper functions
async function loadDB() {
  try {
    const data = await kv.get<Database>('b2b_database');
    if (data) {
      db = data;
    } else {
      seedDB();
      await kv.set('b2b_database', db);
    }
  } catch (err) {
    console.warn('Vercel KV is not configured or accessible. Operating in-memory:', err);
    if (!db.companies || db.companies.length === 0) {
      seedDB();
    }
  }

  if (!db.categories) {
    db.categories = [
      { id: 'cat_bakliyat', name: 'Bakliyat & Unlu Mamuller', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80' },
      { id: 'cat_sarkuteri', name: 'Süt ve Şarküteri', image: 'https://images.unsplash.com/photo-1486299267070-8382e214434b?w=400&auto=format&fit=crop&q=80' },
      { id: 'cat_yaglar', name: 'Sıvı Yağlar & Soslar', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80' },
      { id: 'cat_konserve', name: 'Konserve & Temel Gıda', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80' }
    ];
    await saveDB();
  } else {
    let modified = false;
    db.categories = db.categories.map(c => {
      if (!c.image) {
        modified = true;
        let defaultImg = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80';
        if (c.name.toLowerCase().includes('bakliyat') || c.name.toLowerCase().includes('unlu')) {
          defaultImg = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80';
        } else if (c.name.toLowerCase().includes('süt') || c.name.toLowerCase().includes('şarküteri') || c.name.toLowerCase().includes('et')) {
          defaultImg = 'https://images.unsplash.com/photo-1486299267070-8382e214434b?w=400&auto=format&fit=crop&q=80';
        } else if (c.name.toLowerCase().includes('yağ') || c.name.toLowerCase().includes('sos')) {
          defaultImg = 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80';
        }
        return { ...c, image: defaultImg };
      }
      return c;
    });
    if (modified) {
      await saveDB();
    }
  }
}

async function saveDB(changedCollection?: keyof Database, changedId?: string, isDelete: boolean = false) {
  try {
    await kv.set('b2b_database', db);
  } catch (err) {
    console.warn('Could not save to Vercel KV (using in-memory):', err);
  }
}

// Database Seeding
function seedDB() {
  console.log('Seeding Database with premium food B2B mock data...');

  const companies: Company[] = [
    {
      id: 'comp_hanibaba',
      name: 'Hanibaba Gıda ve Pazarlama Ltd. Şti.',
      taxNumber: '4567891234',
      taxOffice: 'Esenler Vergi Dairesi',
      phone: '0212 655 44 33',
      address: 'Oruçreis Mahallesi, Tekstilkent Caddesi No:12, Esenler, İstanbul',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'comp_gelisim',
      name: 'Anlazuk Toptan Gıda Dağıtım',
      taxNumber: '1234567890',
      taxOffice: 'Fatih Vergi Dairesi',
      phone: '0212 555 11 22',
      address: 'Hırka-i Şerif Mahallesi, Akşemsettin Caddesi No:84, Fatih, İstanbul',
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'comp_yildiz',
      name: 'Yıldız Gurme Marketler Zinciri',
      taxNumber: '9876543210',
      taxOffice: 'Kadıköy Vergi Dairesi',
      phone: '0216 444 55 66',
      address: 'Moda Caddesi No:120, Kadıköy, İstanbul',
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ];

  const adminUser: User = {
    id: 'user_admin',
    companyId: 'comp_hanibaba',
    name: 'Hanibaba',
    surname: 'Yönetici',
    email: 'admin',
    phone: '0500 000 00 00',
    tcNo: '11111111111',
    passwordHash: hashPassword('admin1234'),
    role: 'admin',
    status: 'active',
    address: 'Hanibaba Merkez Genel Ofis',
    balance: 0,
    createdAt: new Date().toISOString()
  };

  const regularUsers: User[] = [
    {
      id: 'user_semih',
      companyId: 'comp_gelisim',
      name: 'Semih',
      surname: 'Anlazuk',
      email: 'semih@gelisim.com',
      phone: '0555 444 33 22',
      tcNo: '12345678901',
      passwordHash: hashPassword('123456'),
      role: 'user',
      status: 'active',
      address: 'Hırka-i Şerif Mahallesi, Akşemsettin Caddesi No:84, Fatih, İstanbul',
      balance: 185400,
      createdAt: new Date().toISOString()
    },
    {
      id: 'user_diyar',
      companyId: 'comp_yildiz',
      name: 'Diyar',
      surname: 'Balcı',
      email: 'diyar.balci',
      phone: '0545 715 32 77',
      tcNo: '53748818455',
      passwordHash: hashPassword('123456'),
      role: 'user',
      status: 'active',
      address: 'Dilovası Mimar Sinan Mahallesi 547. Sokak No:31, Kocaeli',
      balance: 98250,
      createdAt: new Date().toISOString()
    }
  ];

  const products: Product[] = [
    {
      id: 'prod_pirinc',
      category: 'Bakliyat & Unlu Mamuller',
      subcategory: 'Pirinç',
      brand: 'Hanibaba',
      name: 'Hanibaba Pilavlık Osmancık Pirinç (25 Kg Çuval)',
      shortDesc: 'Yerli Osmancık pirinç, firesiz ve yüksek randımanlı lüks B2B pilavlık çuval pirinç.',
      longDesc: 'Hanibaba güvencesiyle Trakya yöresi Osmancık pirinci. Enfes tane tane dökülen pilavlar için restoran, lokanta ve catering firmalarına özel bulk çuval ambalajında sunulmaktadır. Toz ve yabancı maddelerden tamamen arındırılmıştır.',
      stock: 140,
      stockCode: 'HB-PIR-25KG',
      barcode: '8691234500012',
      unit: 'Çuval',
      price: 1120,
      vatRate: 1,
      images: [
        'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
        'https://images.unsplash.com/photo-1536304997881-db377c17d4d9?auto=format&fit=crop&q=80&w=800'
      ],
      isCampaign: true,
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod_peynir',
      category: 'Süt ve Şarküteri',
      subcategory: 'Peynir',
      brand: 'Sütaş',
      name: 'Sütaş Klasik Sert Beyaz Peynir (5 Kg Teneke)',
      shortDesc: 'Tam yağlı, olgunlaştırılmış geleneksel lezzetli ezine tipi beyaz peynir.',
      longDesc: 'En az 6 ay olgunlaştırılmış tam yağlı Sütaş klasik beyaz peynir. Kahvaltılar ve böreklik kullanımlar için eşsiz kıvam ve aromaya sahip, toptan alımlara özel tenekesinde.',
      stock: 65,
      stockCode: 'ST-KBP-5KG',
      barcode: '8690924012351',
      unit: 'Teneke',
      price: 1450,
      vatRate: 1,
      images: [
        'https://images.unsplash.com/photo-1552763440-47e2ebde8f1f?auto=format&fit=crop&q=80&w=800'
      ],
      isCampaign: false,
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod_sucuk',
      category: 'Süt ve Şarküteri',
      subcategory: 'Kırmızı Et',
      brand: 'Hanibaba',
      name: 'Hanibaba Kasap Dana Sucuk (1 Kg Paket)',
      shortDesc: '%100 dana etinden, özel baharat formülü ile fermente edilmiş enfes kasap sucuk.',
      longDesc: '%100 yerli besi dana etlerinden, geleneksel kurutma yöntemleriyle imal edilmiş efsanevi Hanibaba baharatlı kasap sucuğu. Gluten ve hiçbir yabancı katkı maddesi içermez. Vakumlu ambalajda sevk edilir.',
      stock: 210,
      stockCode: 'HB-KDS-1KG',
      barcode: '8691234500050',
      unit: 'Paket',
      price: 480,
      vatRate: 1,
      images: [
        'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800'
      ],
      isCampaign: true,
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod_zeytinyagi',
      category: 'Sıvı Yağlar & Soslar',
      subcategory: 'Zeytinyağı',
      brand: 'Kristal',
      name: 'Kristal Naturel Sızma Zeytinyağı (5 L Teneke)',
      shortDesc: 'Soğuk sıkım, dolgun meyve aromalı üstün lezzetli naturel sızma zeytinyağı.',
      longDesc: 'Kuzey Ege zeytinlerinden süzülen, maksimum 0.8 asit oranına sahip şifa deposu sızma zeytinyağı. Yemekler, mezeler ve salatalarda profesyonel şeflerin vazgeçilmez tercihi.',
      stock: 95,
      stockCode: 'KR-NZY-5L',
      barcode: '8690562010151',
      unit: 'Teneke',
      price: 1380,
      vatRate: 1,
      images: [
        'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=800'
      ],
      isCampaign: false,
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod_salca',
      category: 'Konserve & Temel Gıda',
      subcategory: 'Salça',
      brand: 'Tat',
      name: 'Tat Domates Salçası (4.5 Kg Teneke)',
      shortDesc: 'Güneşte olgunlaşmış kıpkırmızı Anadolu domateslerinden üretilen çift kat yoğunlaştırılmış salça.',
      longDesc: 'Sıfır katkı maddesiyle, mevsiminde toplanan sulu Bursa domateslerinden elde edilmiştir. Endüstriyel mutfakların kalbi, yüksek kıvam verici güçte.',
      stock: 180,
      stockCode: 'TT-DOM-4.5KG',
      barcode: '8690510102032',
      unit: 'Teneke',
      price: 340,
      vatRate: 1,
      images: [
        'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&q=80&w=800'
      ],
      isCampaign: false,
      status: 'active',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod_un',
      category: 'Bakliyat & Unlu Mamuller',
      subcategory: 'Un',
      brand: 'Hanibaba',
      name: 'Hanibaba Lüks Tip 1 Böreklik & Unlu Mamul Unu (50 Kg)',
      shortDesc: 'Yüksek glüten ve kül kalitesine sahip, elastikiyeti yüksek endüstriyel fırın unu.',
      longDesc: 'Simit, boyoz, baklava, börek ve lüks ekmek çeşitleri için özel olarak öğütülmüş yüksek proteinli fırıncı buğday unu. Mükemmel su kaldırma ve hacim alma performansı sağlar.',
      stock: 80,
      stockCode: 'HB-UNN-50KG',
      barcode: '8691234500099',
      unit: 'Çuval',
      price: 1250,
      vatRate: 1,
      images: [
        'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800'
      ],
      isCampaign: true,
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ];

  const orders: Order[] = [
    {
      id: 'ord_2001',
      orderNo: 'HBT-2026-00001',
      companyId: 'comp_gelisim',
      userId: 'user_semih',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 4480,
      vatAmount: 44.8,
      totalAmount: 4524.8,
      status: 'delivered',
      address: 'Hırka-i Şerif Mahallesi, Akşemsettin Caddesi No:84, Fatih, İstanbul',
      products: [
        {
          productId: 'prod_pirinc',
          name: 'Hanibaba Pilavlık Osmancık Pirinç (25 Kg Çuval)',
          price: 1120,
          vatRate: 1,
          quantity: 4,
          image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
          stockCode: 'HB-PIR-25KG'
        }
      ],
      note: 'Hızlı sevkiyat rica olunur.',
      statusHistory: [
        { status: 'pending', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), note: 'Sipariş geçildi.', updatedBy: 'Semih Anlazuk' },
        { status: 'approved', date: new Date(Date.now() - 0.9 * 24 * 60 * 60 * 1000).toISOString(), note: 'Bakiye onaylandı.', updatedBy: 'Admin' },
        { status: 'delivered', date: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(), note: 'Teslim edildi.', updatedBy: 'Admin' }
      ],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const balanceMovements: BalanceMovement[] = [
    {
      id: 'mov_1',
      userId: 'user_semih',
      type: 'add',
      amount: 190000,
      prevBalance: 0,
      newBalance: 190000,
      note: 'HanibabaTicket Cari Bakiye Limit Tanımlaması',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'mov_2',
      userId: 'user_semih',
      type: 'spend',
      amount: 4524.8,
      prevBalance: 190000,
      newBalance: 185475.2,
      orderId: 'ord_2001',
      note: 'HBT-2026-00001 nolu sipariş tahsilatı.',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const notifications: Notification[] = [
    {
      id: 'not_1',
      userId: 'user_semih',
      title: 'Bayi Portalı Hoş Geldiniz',
      message: 'HanibabaTicket B2B Toptan Gıda Sipariş Portalımız aktif edilmiştir. Cari limitiniz tanımlanmıştır.',
      isRead: false,
      type: 'announcement',
      date: new Date().toISOString()
    }
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'log_1',
      userId: 'user_admin',
      userName: 'Hanibaba Yönetici',
      action: 'PORTAL_YENILEME',
      details: 'HanibabaTicket gıda toptancı portalı kuruldu.',
      date: new Date().toISOString()
    }
  ];

  const sliders: Slider[] = [
    {
      id: 'slide_1',
      title: 'Hanibaba Gıda Toptan Bayi Portalı',
      desc: 'Hanibaba kalitesiyle bakliyat, un, süt ürünleri ve şarküteride doğrudan fabrikadan işletmenize güvenli sevkiyat.',
      bg: 'bg-gradient-to-r from-emerald-800 to-teal-950',
      tag: 'DOĞRUDAN SEVKİYAT',
      status: 'active'
    },
    {
      id: 'slide_2',
      title: 'Toplu Alımlarda Cari Limit ve Ek İskonto',
      desc: 'Fırıncılar, restoran zincirleri ve toptan gıdacılara özel 50 ton üzeri siparişlerde KDV muafiyet bakiye iadeleri.',
      bg: 'bg-gradient-to-r from-teal-800 to-emerald-950',
      tag: 'BAYİ FIRSATI',
      status: 'active'
    }
  ];

  const categories: Category[] = [
    { id: 'cat_bakliyat', name: 'Bakliyat & Unlu Mamuller', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80' },
    { id: 'cat_sarkuteri', name: 'Süt ve Şarküteri', image: 'https://images.unsplash.com/photo-1486299267070-8382e214434b?w=400&auto=format&fit=crop&q=80' },
    { id: 'cat_yaglar', name: 'Sıvı Yağlar & Soslar', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80' },
    { id: 'cat_konserve', name: 'Konserve & Temel Gıda', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80' }
  ];

  db = {
    companies,
    users: [adminUser, ...regularUsers],
    products,
    orders,
    balanceMovements,
    notifications,
    auditLogs,
    sliders,
    categories
  };
}

// Initialize and load database
loadDB();

// Express API Router and App setup
const app = express();
app.use(express.json({ limit: '10mb' }));

async function loadDbMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    await loadDB();
    next();
  } catch (err) {
    console.error("Database load error:", err);
    res.status(500).json({ error: "Veritabanı yüklenemedi." });
  }
}

app.use('/api', loadDbMiddleware);

// Custom simple Session Store (replaces full JWT for robust multi-restart persistence in sandbox)
const sessions = new Map<string, { userId: string; role: 'admin' | 'user'; email: string; expires: number }>();

async function getSession(token: string) {
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      return await kv.get<{ userId: string; role: 'admin' | 'user'; email: string; expires: number }>(token);
    }
  } catch (err) {
    console.error('Error getting session from Vercel KV:', err);
  }
  return sessions.get(token);
}

async function setSession(token: string, sessionData: { userId: string; role: 'admin' | 'user'; email: string; expires: number }) {
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      await kv.set(token, sessionData, { ex: 24 * 60 * 60 }); // expires in 24 hours
      return;
    }
  } catch (err) {
    console.error('Error setting session in Vercel KV:', err);
  }
  sessions.set(token, sessionData);
}

async function deleteSession(token: string) {
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      await kv.del(token);
      return;
    }
  } catch (err) {
    console.error('Error deleting session from Vercel KV:', err);
  }
  sessions.delete(token);
}

// Helper to generate a token
async function generateSession(user: User) {
  const token = `b2b_session_${crypto.randomBytes(24).toString('hex')}`;
  const sessionData = {
    userId: user.id,
    role: user.role,
    email: user.email,
    expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
  await setSession(token, sessionData);
  return token;
}

// Auth Middleware
async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkilendirme başlığı bulunamadı veya geçersiz.' });
  }

  const token = authHeader.split(' ')[1];
  const session = await getSession(token);

  if (!session || session.expires < Date.now()) {
    if (session) {
      await deleteSession(token);
    }
    return res.status(401).json({ error: 'Oturum süresi doldu veya geçersiz token.' });
  }

  // Extend session duration on active request
  session.expires = Date.now() + 24 * 60 * 60 * 1000;
  await setSession(token, session);
  
  // Attach user identity to request object
  (req as any).user = session;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Bu işlem için yönetici yetkisi gereklidir.' });
  }
  next();
}

// Log utility
async function logActivity(userId: string, userName: string, action: string, details: string) {
  const newLog: AuditLog = {
    id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId,
    userName,
    action,
    details,
    date: new Date().toISOString()
  };
  db.auditLogs.unshift(newLog);
  // Keep logs capped at 1000
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
  await saveDB('auditLogs', newLog.id);
}

// Create custom notification helper
async function createNotification(userId: string, title: string, message: string, type: 'balance' | 'order' | 'announcement') {
  const notif: Notification = {
    id: `not_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    userId,
    title,
    message,
    isRead: false,
    type,
    date: new Date().toISOString()
  };
  db.notifications.unshift(notif);
  await saveDB('notifications', notif.id);
}

// API ENDPOINTS

// 1. Auth Endpoint
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Lütfen kullanıcı adı/e-posta ve şifrenizi giriniz.' });
  }

  // Support logging in with 'admin' as email directly as requested
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Hesabınız şu anda pasif durumdadır. Lütfen yöneticiyle iletişime geçin.' });
  }

  const inputHash = hashPassword(password);
  if (user.passwordHash !== inputHash) {
    return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
  }

  const token = await generateSession(user);
  await logActivity(user.id, `${user.name} ${user.surname}`, 'GİRİŞ', 'Sisteme başarıyla giriş yapıldı.');

  // Don't return password hash
  const { passwordHash, ...userResponse } = user;
  const company = db.companies.find(c => c.id === user.companyId);

  res.json({
    token,
    user: {
      ...userResponse,
      companyName: company ? company.name : 'Sistem'
    }
  });
});

app.get('/api/auth/me', authenticate, async (req: Request, res: Response) => {
  const session = (req as any).user;
  const user = db.users.find(u => u.id === session.userId);

  if (!user) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  }

  const { passwordHash, ...userResponse } = user;
  const company = db.companies.find(c => c.id === user.companyId);

  res.json({
    ...userResponse,
    companyName: company ? company.name : 'Sistem'
  });
});

// 2. Dashboard Analytics (Admin Only)
app.get('/api/admin/dashboard', authenticate, requireAdmin, async (req: Request, res: Response) => {
  // Counters
  const totalUsers = db.users.filter(u => u.role !== 'admin').length;
  const totalCompanies = db.companies.length;
  const totalProducts = db.products.length;
  
  // Total Balance (accumulated active users balances)
  const totalBalance = db.users.filter(u => u.role !== 'admin').reduce((sum, u) => sum + u.balance, 0);

  // Orders summary
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = db.orders.filter(o => o.date.slice(0, 10) === today);
  const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingOrdersCount = db.orders.filter(o => o.status === 'pending').length;
  const approvedOrdersCount = db.orders.filter(o => o.status === 'approved').length;
  const preparingOrdersCount = db.orders.filter(o => o.status === 'preparing').length;
  const shippingOrdersCount = db.orders.filter(o => o.status === 'shipping').length;
  const deliveredOrdersCount = db.orders.filter(o => o.status === 'delivered').length;
  const cancelledOrdersCount = db.orders.filter(o => o.status === 'cancelled').length;

  const totalCiro = db.orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.totalAmount, 0);

  // Best selling products count
  const productSalesMap = new Map<string, { name: string; brand: string; quantity: number; revenue: number }>();
  db.orders.filter(o => o.status !== 'cancelled').forEach(o => {
    o.products.forEach(p => {
      const existing = productSalesMap.get(p.productId) || { name: p.name, brand: '', quantity: 0, revenue: 0 };
      existing.quantity += p.quantity;
      existing.revenue += p.price * p.quantity * (1 + p.vatRate / 100);
      productSalesMap.set(p.productId, existing);
    });
  });

  const bestSellers = Array.from(productSalesMap.entries())
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Top spending companies
  const companySalesMap = new Map<string, { name: string; revenue: number; orderCount: number }>();
  db.orders.filter(o => o.status !== 'cancelled').forEach(o => {
    const comp = db.companies.find(c => c.id === o.companyId);
    const compName = comp ? comp.name : 'Silinmiş Firma';
    const existing = companySalesMap.get(o.companyId) || { name: compName, revenue: 0, orderCount: 0 };
    existing.revenue += o.totalAmount;
    existing.orderCount += 1;
    companySalesMap.set(o.companyId, existing);
  });

  const topCompanies = Array.from(companySalesMap.entries())
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Critical stocks (stock <= 10)
  const criticalStocks = db.products.filter(p => p.stock <= 10 && p.status === 'active')
    .map(p => ({ id: p.id, name: p.name, stock: p.stock, stockCode: p.stockCode }));

  // Last 5 orders
  const lastOrders = db.orders.slice(0, 5).map(o => {
    const user = db.users.find(u => u.id === o.userId);
    const company = db.companies.find(c => c.id === o.companyId);
    return {
      id: o.id,
      orderNo: o.orderNo,
      companyName: company ? company.name : 'Sistem',
      userName: user ? `${user.name} ${user.surname}` : 'Silinmiş Kullanıcı',
      date: o.date,
      totalAmount: o.totalAmount,
      status: o.status
    };
  });

  // Sales trend by date (last 7 days)
  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const dOrders = db.orders.filter(o => o.date.slice(0, 10) === dayStr && o.status !== 'cancelled');
    const revenue = dOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    trendData.push({
      date: dayStr.slice(5), // MM-DD
      ciro: revenue,
      siparis: dOrders.length
    });
  }

  res.json({
    metrics: {
      totalUsers,
      totalCompanies,
      totalProducts,
      totalBalance,
      totalCiro,
      todayRevenue,
      todayOrdersCount: todayOrders.length,
      orders: {
        pending: pendingOrdersCount,
        approved: approvedOrdersCount,
        preparing: preparingOrdersCount,
        shipping: shippingOrdersCount,
        delivered: deliveredOrdersCount,
        cancelled: cancelledOrdersCount
      }
    },
    criticalStocks,
    bestSellers,
    topCompanies,
    lastOrders,
    trendData
  });
});

// 3. Company Management
app.get('/api/admin/companies', authenticate, requireAdmin, async (req: Request, res: Response) => {
  res.json(db.companies);
});

app.post('/api/admin/companies', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { name, taxNumber, taxOffice, phone, address, status } = req.body;

  if (!name || !taxNumber) {
    return res.status(400).json({ error: 'Firma adı ve vergi numarası zorunludur.' });
  }

  const newCompany: Company = {
    id: `comp_${Date.now()}`,
    name,
    taxNumber,
    taxOffice: taxOffice || '',
    phone: phone || '',
    address: address || '',
    status: status || 'active',
    createdAt: new Date().toISOString()
  };

  db.companies.push(newCompany);
  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'FİRMA_EKLEME', `"${name}" isimli yeni firma sisteme eklendi.`);

  res.status(201).json(newCompany);
});

app.put('/api/admin/companies/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db.companies.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Firma bulunamadı.' });
  }

  const { name, taxNumber, taxOffice, phone, address, status } = req.body;

  db.companies[index] = {
    ...db.companies[index],
    name: name !== undefined ? name : db.companies[index].name,
    taxNumber: taxNumber !== undefined ? taxNumber : db.companies[index].taxNumber,
    taxOffice: taxOffice !== undefined ? taxOffice : db.companies[index].taxOffice,
    phone: phone !== undefined ? phone : db.companies[index].phone,
    address: address !== undefined ? address : db.companies[index].address,
    status: status !== undefined ? status : db.companies[index].status
  };

  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'FİRMA_GÜNCELLEME', `"${db.companies[index].name}" firması güncellendi.`);

  res.json(db.companies[index]);
});

app.delete('/api/admin/companies/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db.companies.findIndex(c => c.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Firma bulunamadı.' });
  }

  const companyName = db.companies[index].name;
  
  // Check if there are users under this company
  const hasUsers = db.users.some(u => u.companyId === id);
  if (hasUsers) {
    return res.status(400).json({ error: 'Bu firmaya bağlı kullanıcılar bulunmaktadır. Firma silinemez, durumunu pasif yapabilirsiniz.' });
  }

  db.companies.splice(index, 1);
  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'FİRMA_SİLME', `"${companyName}" firması silindi.`);

  res.json({ success: true, message: 'Firma başarıyla silindi.' });
});

// 4. User Management
app.get('/api/admin/users', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const usersWithCompanies = db.users.map(u => {
    const comp = db.companies.find(c => c.id === u.companyId);
    const { passwordHash, ...safeUser } = u;
    return {
      ...safeUser,
      companyName: comp ? comp.name : 'Sistem / Bağımsız'
    };
  });
  res.json(usersWithCompanies);
});

app.post('/api/admin/users', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { companyId, name, surname, email, phone, tcNo, password, role, status, address, initialBalance } = req.body;

  if (!name || !surname || !email || !password || !companyId) {
    return res.status(400).json({ error: 'İsim, soyisim, e-posta, şifre ve firma seçimi zorunludur.' });
  }

  const emailExists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
  if (emailExists) {
    return res.status(400).json({ error: 'Bu e-posta / kullanıcı adı ile kayıtlı başka bir kullanıcı bulunmaktadır.' });
  }

  const balanceVal = Number(initialBalance) || 0;

  const newUser: User = {
    id: `user_${Date.now()}`,
    companyId,
    name,
    surname,
    email: email.toLowerCase(),
    phone: phone || '',
    tcNo: tcNo || '',
    passwordHash: hashPassword(password),
    role: role || 'user',
    status: status || 'active',
    address: address || '',
    balance: balanceVal,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);

  // If initial balance is added, log balance movement
  if (balanceVal > 0) {
    db.balanceMovements.push({
      id: `mov_${Date.now()}`,
      userId: newUser.id,
      type: 'add',
      amount: balanceVal,
      prevBalance: 0,
      newBalance: balanceVal,
      note: 'Yeni kullanıcı oluşturulurken bakiye tanımlaması yapıldı.',
      date: new Date().toISOString()
    });
    
    await createNotification(newUser.id, 'Hoşgeldiniz & Bakiye Tanımlandı', `Hesabınız başarıyla oluşturuldu ve ${balanceVal.toLocaleString('tr-TR')} TL başlangıç bakiyesi yüklendi!`, 'balance');
  }

  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'KULLANICI_EKLEME', `"${name} ${surname}" (${email}) isimli kullanıcı oluşturuldu.`);

  const { passwordHash, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

app.put('/api/admin/users/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db.users.findIndex(u => u.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  }

  const { companyId, name, surname, email, phone, tcNo, role, status, address } = req.body;

  if (email && email.toLowerCase() !== db.users[index].email.toLowerCase()) {
    const emailExists = db.users.some(u => u.id !== id && u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return res.status(400).json({ error: 'Bu e-posta / kullanıcı adı kullanılmaktadır.' });
    }
  }

  db.users[index] = {
    ...db.users[index],
    companyId: companyId !== undefined ? companyId : db.users[index].companyId,
    name: name !== undefined ? name : db.users[index].name,
    surname: surname !== undefined ? surname : db.users[index].surname,
    email: email !== undefined ? email.toLowerCase() : db.users[index].email,
    phone: phone !== undefined ? phone : db.users[index].phone,
    tcNo: tcNo !== undefined ? tcNo : db.users[index].tcNo,
    role: role !== undefined ? role : db.users[index].role,
    status: status !== undefined ? status : db.users[index].status,
    address: address !== undefined ? address : db.users[index].address
  };

  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'KULLANICI_GÜNCELLEME', `"${db.users[index].name} ${db.users[index].surname}" kullanıcısı güncellendi.`);

  const { passwordHash, ...safeUser } = db.users[index];
  res.json(safeUser);
});

// Admin change user password
app.put('/api/admin/users/:id/password', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Şifre en az 4 karakterden oluşmalıdır.' });
  }

  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  }

  db.users[index].passwordHash = hashPassword(newPassword);
  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'KULLANICI_SIFRE_DEGİSİMİ', `"${db.users[index].name} ${db.users[index].surname}" kullanıcısının şifresi yönetici tarafından değiştirildi.`);

  res.json({ success: true, message: 'Şifre başarıyla güncellendi.' });
});

// User updates their own password
app.put('/api/profile/password', authenticate, async (req: Request, res: Response) => {
  const session = (req as any).user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Lütfen mevcut ve yeni şifrenizi giriniz.' });
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  }

  if (user.passwordHash !== hashPassword(currentPassword)) {
    return res.status(400).json({ error: 'Mevcut şifreniz hatalı.' });
  }

  user.passwordHash = hashPassword(newPassword);
  await saveDB();

  await logActivity(user.id, `${user.name} ${user.surname}`, 'ŞİFRE_DEGİSİMİ', 'Kullanıcı şifresini kendisi güncelledi.');

  res.json({ success: true, message: 'Şifreniz başarıyla değiştirildi.' });
});

app.delete('/api/admin/users/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (id === 'user_admin') {
    return res.status(400).json({ error: 'Ana yönetici hesabı silinemez.' });
  }

  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  }

  const fullName = `${db.users[index].name} ${db.users[index].surname}`;
  
  db.users.splice(index, 1);
  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'KULLANICI_SİLME', `"${fullName}" isimli kullanıcı silindi.`);

  res.json({ success: true, message: 'Kullanıcı başarıyla silindi.' });
});

// 5. Balance Operations (CRITICAL FOR USER REQ: Add balance to USER directly)
app.post('/api/admin/users/:id/balance', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, note } = req.body;

  const bAmount = Number(amount);
  if (isNaN(bAmount) || bAmount <= 0) {
    return res.status(400).json({ error: 'Lütfen geçerli bir bakiye tutarı giriniz (0\'dan büyük olmalıdır).' });
  }

  const userIndex = db.users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  }

  const user = db.users[userIndex];
  const prevBal = user.balance;
  const newBal = prevBal + bAmount;

  // Apply Balance change
  db.users[userIndex].balance = newBal;

  const movementNote = note || 'Yönetici tarafından bakiye yüklemesi yapıldı.';

  // Add Balance Movement Record
  const newMovement: BalanceMovement = {
    id: `mov_${Date.now()}`,
    userId: user.id,
    type: 'add',
    amount: bAmount,
    prevBalance: prevBal,
    newBalance: newBal,
    note: movementNote,
    date: new Date().toISOString()
  };

  db.balanceMovements.unshift(newMovement);

  // Send Notification to User
  await createNotification(
    user.id,
    'Hesabınıza Bakiye Yüklendi',
    `Hesabınıza +${bAmount.toLocaleString('tr-TR')} TL bakiye eklendi. Güncel bakiyeniz: ${newBal.toLocaleString('tr-TR')} TL`,
    'balance'
  );

  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'BAKİYE_YÜKLEME', `"${user.name} ${user.surname}" kullanıcısına ${bAmount.toLocaleString('tr-TR')} TL yüklendi.`);

  res.json({
    success: true,
    balance: newBal,
    movement: newMovement
  });
});

app.get('/api/admin/balance-movements', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const movementsWithUsers = db.balanceMovements.map(m => {
    const user = db.users.find(u => u.id === m.userId);
    return {
      ...m,
      userName: user ? `${user.name} ${user.surname}` : 'Silinmiş Kullanıcı',
      email: user ? user.email : '',
      companyName: user ? (db.companies.find(c => c.id === user.companyId)?.name || 'Sistem') : 'Bilinmeyen'
    };
  });
  res.json(movementsWithUsers);
});

// Secure endpoint for standard users to fetch their own balance movements
app.get('/api/balance-movements/my', authenticate, async (req: Request, res: Response) => {
  const session = (req as any).user;
  const myMovements = db.balanceMovements.filter(m => m.userId === session.userId);
  res.json(myMovements);
});

// 6. Product Endpoints
app.get('/api/products', async (req: Request, res: Response) => {
  const activeProducts = db.products.filter(p => p.status === 'active');
  res.json(activeProducts);
});

app.get('/api/admin/products', authenticate, requireAdmin, async (req: Request, res: Response) => {
  res.json(db.products);
});

app.post('/api/admin/products', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { category, subcategory, brand, name, shortDesc, longDesc, stock, stockCode, barcode, unit, price, vatRate, images, videoUrl, variants, isCampaign, status } = req.body;

  if (!category || !brand || !name || !stockCode || !price) {
    return res.status(400).json({ error: 'Kategori, marka, ürün adı, stok kodu ve fiyat zorunludur.' });
  }

  const codeExists = db.products.some(p => p.stockCode.toLowerCase() === stockCode.toLowerCase());
  if (codeExists) {
    return res.status(400).json({ error: 'Bu stok kodu zaten başka bir üründe tanımlı.' });
  }

  const newProduct: Product = {
    id: `prod_${Date.now()}`,
    category,
    subcategory: subcategory || '',
    brand,
    name,
    shortDesc: shortDesc || '',
    longDesc: longDesc || '',
    stock: Number(stock) || 0,
    stockCode,
    barcode: barcode || `BC-${Date.now().toString().slice(6)}`,
    unit: unit || 'Adet',
    price: Number(price),
    vatRate: Number(vatRate) || 20,
    images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=800'],
    videoUrl: videoUrl || '',
    variants: variants || '',
    isCampaign: Boolean(isCampaign),
    status: status || 'active',
    createdAt: new Date().toISOString()
  };

  db.products.push(newProduct);
  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'ÜRÜN_EKLEME', `"${name}" (${stockCode}) isimli yeni ürün eklendi.`);

  res.status(201).json(newProduct);
});

app.put('/api/admin/products/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db.products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Ürün bulunamadı.' });
  }

  const { category, subcategory, brand, name, shortDesc, longDesc, stock, stockCode, barcode, unit, price, vatRate, images, videoUrl, variants, isCampaign, status } = req.body;

  if (stockCode && stockCode.toLowerCase() !== db.products[index].stockCode.toLowerCase()) {
    const codeExists = db.products.some(p => p.id !== id && p.stockCode.toLowerCase() === stockCode.toLowerCase());
    if (codeExists) {
      return res.status(400).json({ error: 'Bu stok kodu başka bir üründe kullanılmaktadır.' });
    }
  }

  db.products[index] = {
    ...db.products[index],
    category: category !== undefined ? category : db.products[index].category,
    subcategory: subcategory !== undefined ? subcategory : db.products[index].subcategory,
    brand: brand !== undefined ? brand : db.products[index].brand,
    name: name !== undefined ? name : db.products[index].name,
    shortDesc: shortDesc !== undefined ? shortDesc : db.products[index].shortDesc,
    longDesc: longDesc !== undefined ? longDesc : db.products[index].longDesc,
    stock: stock !== undefined ? Number(stock) : db.products[index].stock,
    stockCode: stockCode !== undefined ? stockCode : db.products[index].stockCode,
    barcode: barcode !== undefined ? barcode : db.products[index].barcode,
    unit: unit !== undefined ? unit : db.products[index].unit,
    price: price !== undefined ? Number(price) : db.products[index].price,
    vatRate: vatRate !== undefined ? Number(vatRate) : db.products[index].vatRate,
    images: images !== undefined ? images : db.products[index].images,
    videoUrl: videoUrl !== undefined ? videoUrl : db.products[index].videoUrl,
    variants: variants !== undefined ? variants : db.products[index].variants,
    isCampaign: isCampaign !== undefined ? Boolean(isCampaign) : db.products[index].isCampaign,
    status: status !== undefined ? status : db.products[index].status
  };

  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'ÜRÜN_GÜNCELLEME', `"${db.products[index].name}" ürünü güncellendi.`);

  res.json(db.products[index]);
});

app.delete('/api/admin/products/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const index = db.products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Ürün bulunamadı.' });
  }

  const productName = db.products[index].name;
  db.products.splice(index, 1);
  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'ÜRÜN_SİLME', `"${productName}" ürünü silindi.`);

  res.json({ success: true, message: 'Ürün başarıyla silindi.' });
});

// Bulk excel/csv import simulator
app.post('/api/admin/products/bulk-import', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { products: csvProducts } = req.body;

  if (!Array.isArray(csvProducts) || csvProducts.length === 0) {
    return res.status(400).json({ error: 'İçe aktarmak için geçerli ürün verisi bulunamadı.' });
  }

  let importedCount = 0;
  let skippedCount = 0;

  csvProducts.forEach(item => {
    // Validate required values
    if (!item.name || !item.stockCode || !item.price) {
      skippedCount++;
      return;
    }

    const codeExists = db.products.some(p => p.stockCode.toLowerCase() === item.stockCode.toLowerCase());
    if (codeExists) {
      skippedCount++;
      return;
    }

    const newProd: Product = {
      id: `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      category: item.category || 'Diğer',
      subcategory: item.subcategory || '',
      brand: item.brand || 'Genel',
      name: item.name,
      shortDesc: item.shortDesc || '',
      longDesc: item.longDesc || '',
      stock: Number(item.stock) || 0,
      stockCode: item.stockCode,
      barcode: item.barcode || `BC-${Date.now().toString().slice(6)}_${importedCount}`,
      unit: item.unit || 'Adet',
      price: Number(item.price),
      vatRate: Number(item.vatRate) || 20,
      images: item.image ? [item.image] : ['https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=800'],
      isCampaign: Boolean(item.isCampaign),
      status: 'active',
      createdAt: new Date().toISOString()
    };

    db.products.push(newProd);
    importedCount++;
  });

  if (importedCount > 0) {
    await saveDB();
    const session = (req as any).user;
    await logActivity(session.userId, session.email, 'TOPLU_ÜRÜN_YÜKLEME', `${importedCount} adet ürün toplu içe aktarma ile yüklendi.`);
  }

  res.json({
    success: true,
    message: `${importedCount} ürün başarıyla eklendi, ${skippedCount} ürün atlandı (stok kodu çakışması veya eksik veri).`
  });
});

// 7. Order Endpoints (User and Admin)

// User place order
app.post('/api/orders', authenticate, async (req: Request, res: Response) => {
  const session = (req as any).user;
  const { products: cartItems, note, address } = req.body;

  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: 'Sepetiniz boş.' });
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Hesabınız pasif durumdadır.' });
  }

  // Calculate prices and validate stocks
  let subtotal = 0;
  let totalVat = 0;
  const orderItems: OrderItem[] = [];

  for (const cartItem of cartItems) {
    const product = db.products.find(p => p.id === cartItem.id);
    if (!product) {
      return res.status(404).json({ error: `"${cartItem.name}" isimli ürün katalogda bulunamadı.` });
    }

    if (product.status !== 'active') {
      return res.status(400).json({ error: `"${product.name}" ürünü satışa kapalıdır.` });
    }

    if (product.stock < cartItem.quantity) {
      return res.status(400).json({ error: `"${product.name}" için yeterli stok bulunamadı. Mevcut stok: ${product.stock}` });
    }

    const itemPrice = product.price;
    const itemVat = itemPrice * (product.vatRate / 100);
    const qty = Number(cartItem.quantity);

    subtotal += itemPrice * qty;
    totalVat += itemVat * qty;

    orderItems.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      vatRate: product.vatRate,
      quantity: qty,
      image: product.images[0] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=800',
      stockCode: product.stockCode
    });
  }

  const totalAmount = subtotal + totalVat;

  // 1. MINIMUM CART CONTROL (1000 TL as per guidelines!)
  if (totalAmount < 1000) {
    return res.status(400).json({ error: `Minimum sipariş limiti 1.000 TL'dir. Mevcut sipariş tutarınız: ${totalAmount.toLocaleString('tr-TR')} TL` });
  }

  // 2. USER BALANCE CONTROL
  if (user.balance < totalAmount) {
    return res.status(400).json({ error: `Yetersiz Bakiye! Sipariş tutarı: ${totalAmount.toLocaleString('tr-TR')} TL, Bakiyeniz: ${user.balance.toLocaleString('tr-TR')} TL` });
  }

  // Generate Unique Order Numbers
  const orderNo = `B2B-2026-${Date.now().toString().slice(6, 11)}`;

  // Deduct User Balance
  const prevBal = user.balance;
  user.balance = prevBal - totalAmount;

  // Update stocks
  orderItems.forEach(item => {
    const p = db.products.find(prod => prod.id === item.productId);
    if (p) p.stock -= item.quantity;
  });

  // Create Order Object
  const newOrder: Order = {
    id: `ord_${Date.now()}`,
    orderNo,
    companyId: user.companyId,
    userId: user.id,
    date: new Date().toISOString(),
    amount: subtotal,
    vatAmount: totalVat,
    totalAmount,
    status: 'pending',
    address: address || user.address || 'Kayıtlı Adres',
    products: orderItems,
    note,
    statusHistory: [
      { status: 'pending', date: new Date().toISOString(), note: 'Sipariş başarıyla oluşturuldu ve bakiye tahsil edildi.', updatedBy: `${user.name} ${user.surname}` }
    ],
    createdAt: new Date().toISOString()
  };

  // Log Balance Movement
  const balanceMove: BalanceMovement = {
    id: `mov_${Date.now()}`,
    userId: user.id,
    type: 'spend',
    amount: totalAmount,
    prevBalance: prevBal,
    newBalance: user.balance,
    orderId: newOrder.id,
    note: `${orderNo} nolu sipariş ödemesi`,
    date: new Date().toISOString()
  };

  db.orders.unshift(newOrder);
  db.balanceMovements.unshift(balanceMove);
  
  // Notification to User
  await createNotification(
    user.id,
    'Siparişiniz Alındı',
    `${orderNo} nolu siparişiniz ${totalAmount.toLocaleString('tr-TR')} TL bakiye ile oluşturulmuştur. Onay bekliyor.`,
    'order'
  );

  await saveDB();
  await logActivity(user.id, `${user.name} ${user.surname}`, 'SİPARİŞ_OLUSTURMA', `${orderNo} nolu yeni sipariş oluşturuldu.`);

  res.status(201).json(newOrder);
});

// Admin list all orders
app.get('/api/admin/orders', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const ordersWithDetails = db.orders.map(o => {
    const user = db.users.find(u => u.id === o.userId);
    const comp = db.companies.find(c => c.id === o.companyId);
    return {
      ...o,
      userName: user ? `${user.name} ${user.surname}` : 'Silinmiş Kullanıcı',
      companyName: comp ? comp.name : 'Sistem'
    };
  });
  res.json(ordersWithDetails);
});

// User list their own orders
app.get('/api/orders/my', authenticate, async (req: Request, res: Response) => {
  const session = (req as any).user;
  const myOrders = db.orders.filter(o => o.userId === session.userId);
  res.json(myOrders);
});

// Update order status (Admin)
app.put('/api/admin/orders/:id/status', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const validStatuses = ['pending', 'approved', 'preparing', 'shipping', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Geçersiz sipariş durumu.' });
  }

  const orderIndex = db.orders.findIndex(o => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Sipariş bulunamadı.' });
  }

  const order = db.orders[orderIndex];
  const oldStatus = order.status;

  if (oldStatus === status) {
    return res.status(400).json({ error: 'Sipariş zaten bu durumda.' });
  }

  // Update Status
  db.orders[orderIndex].status = status;
  db.orders[orderIndex].statusHistory.push({
    status,
    date: new Date().toISOString(),
    note: note || `Sipariş durumu "${status}" olarak güncellendi.`,
    updatedBy: 'Admin'
  });

  // Handle cancellation refund!
  if (status === 'cancelled') {
    const user = db.users.find(u => u.id === order.userId);
    if (user) {
      const prevBal = user.balance;
      const refundAmt = order.totalAmount;
      user.balance = prevBal + refundAmt;

      // Log Balance Movement (Refund)
      const refundMovement: BalanceMovement = {
        id: `mov_${Date.now()}`,
        userId: user.id,
        type: 'refund',
        amount: refundAmt,
        prevBalance: prevBal,
        newBalance: user.balance,
        orderId: order.id,
        note: `${order.orderNo} nolu iptal sipariş iadesi`,
        date: new Date().toISOString()
      };

      db.balanceMovements.unshift(refundMovement);

      // Restore Stocks
      order.products.forEach(item => {
        const p = db.products.find(prod => prod.id === item.productId);
        if (p) p.stock += item.quantity;
      });

      // Send Refund Notification
      await createNotification(
        user.id,
        'Sipariş İptali & İade',
        `${order.orderNo} nolu siparişiniz iptal edildi ve ${refundAmt.toLocaleString('tr-TR')} TL tutarı hesabınıza iade edildi.`,
        'balance'
      );
    }
  } else {
    // Other states notifications
    const statusTitles: Record<string, string> = {
      approved: 'Siparişiniz Onaylandı',
      preparing: 'Siparişiniz Hazırlanıyor',
      shipping: 'Siparişiniz Sevk Edildi',
      delivered: 'Siparişiniz Teslim Edildi'
    };

    const statusMessages: Record<string, string> = {
      approved: `${order.orderNo} nolu siparişiniz yönetici tarafından onaylanmıştır.`,
      preparing: `${order.orderNo} nolu siparişiniz hazırlık departmanına sevk edilmiştir.`,
      shipping: `${order.orderNo} nolu siparişiniz kargoya verilmiştir. ${note || ''}`,
      delivered: `${order.orderNo} nolu siparişiniz başarıyla teslim edilmiştir. Bizi tercih ettiğiniz için teşekkür ederiz!`
    };

    await createNotification(
      order.userId,
      statusTitles[status] || 'Sipariş Güncellemesi',
      statusMessages[status] || `${order.orderNo} nolu siparişiniz yeni aşamaya geçti: ${status}`,
      'order'
    );
  }

  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'SİPARİŞ_DURUM_GÜNCELLEME', `${order.orderNo} nolu sipariş ${status} olarak güncellendi.`);

  res.json(db.orders[orderIndex]);
});

// 8. Notifications Endpoints
app.get('/api/notifications', authenticate, async (req: Request, res: Response) => {
  const session = (req as any).user;
  const myNotifs = db.notifications.filter(n => n.userId === session.userId);
  res.json(myNotifs);
});

app.post('/api/notifications/read-all', authenticate, async (req: Request, res: Response) => {
  const session = (req as any).user;
  db.notifications.forEach(n => {
    if (n.userId === session.userId) {
      n.isRead = true;
    }
  });
  await saveDB();
  res.json({ success: true });
});

// 9. Admin Audit Logs
app.get('/api/admin/audit-logs', authenticate, requireAdmin, async (req: Request, res: Response) => {
  res.json(db.auditLogs);
});

// 10. Slider Endpoints
// Public endpoint to get active sliders
app.get('/api/sliders', async (req: Request, res: Response) => {
  const activeSliders = (db.sliders || []).filter(s => s.status === 'active');
  res.json(activeSliders);
});

// Admin endpoint to manage sliders
app.get('/api/admin/sliders', authenticate, requireAdmin, async (req: Request, res: Response) => {
  res.json(db.sliders || []);
});

app.post('/api/admin/sliders', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { title, desc, bg, tag, status, image, isRedirect, redirectType, redirectTarget } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Slider başlığı zorunludur.' });
  }

  const newSlider: Slider = {
    id: `slide_${Date.now()}`,
    title,
    desc: desc || '',
    bg: bg || 'bg-gradient-to-r from-emerald-800 to-teal-950',
    tag: tag || 'DUYURU',
    status: status || 'active',
    image: image || '',
    isRedirect: isRedirect || false,
    redirectType: redirectType || undefined,
    redirectTarget: redirectTarget || ''
  };

  if (!db.sliders) db.sliders = [];
  db.sliders.push(newSlider);
  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'SLIDER_EKLEME', `"${title}" isimli slider eklendi.`);

  res.status(201).json(newSlider);
});

app.put('/api/admin/sliders/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, desc, bg, tag, status, image, isRedirect, redirectType, redirectTarget } = req.body;

  if (!db.sliders) db.sliders = [];
  const slideIndex = db.sliders.findIndex(s => s.id === id);
  if (slideIndex === -1) {
    return res.status(404).json({ error: 'Slider bulunamadı.' });
  }

  const existing = db.sliders[slideIndex];
  db.sliders[slideIndex] = {
    ...existing,
    title: title !== undefined ? title : existing.title,
    desc: desc !== undefined ? desc : existing.desc,
    bg: bg !== undefined ? bg : existing.bg,
    tag: tag !== undefined ? tag : existing.tag,
    status: status !== undefined ? status : existing.status,
    image: image !== undefined ? image : existing.image,
    isRedirect: isRedirect !== undefined ? isRedirect : existing.isRedirect,
    redirectType: redirectType !== undefined ? redirectType : existing.redirectType,
    redirectTarget: redirectTarget !== undefined ? redirectTarget : existing.redirectTarget
  };

  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'SLIDER_GÜNCELLEME', `"${db.sliders[slideIndex].title}" isimli slider güncellendi.`);

  res.json(db.sliders[slideIndex]);
});

app.delete('/api/admin/sliders/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!db.sliders) db.sliders = [];
  const slideIndex = db.sliders.findIndex(s => s.id === id);
  if (slideIndex === -1) {
    return res.status(404).json({ error: 'Slider bulunamadı.' });
  }

  const title = db.sliders[slideIndex].title;
  db.sliders.splice(slideIndex, 1);
  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'SLIDER_SİLME', `"${title}" isimli slider silindi.`);

  res.json({ success: true, message: 'Slider başarıyla silindi.' });
});

// Category Management API Endpoints
app.get('/api/categories', async (req: Request, res: Response) => {
  res.json(db.categories || []);
});

app.post('/api/admin/categories', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { name, image } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Kategori adı zorunludur.' });
  }

  if (!db.categories) db.categories = [];

  const exists = db.categories.some(c => c.name.toLowerCase() === name.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Bu kategori zaten mevcut.' });
  }

  let categoryImage = image ? image.trim() : '';
  if (!categoryImage) {
    categoryImage = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80';
    const lower = name.toLowerCase();
    if (lower.includes('bakliyat') || lower.includes('unlu')) {
      categoryImage = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80';
    } else if (lower.includes('süt') || lower.includes('şarküteri') || lower.includes('et') || lower.includes('peynir')) {
      categoryImage = 'https://images.unsplash.com/photo-1486299267070-8382e214434b?w=400&auto=format&fit=crop&q=80';
    } else if (lower.includes('yağ') || lower.includes('sos')) {
      categoryImage = 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80';
    } else if (lower.includes('meyve') || lower.includes('sebze')) {
      categoryImage = 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400&auto=format&fit=crop&q=80';
    } else if (lower.includes('tatlı') || lower.includes('çikolata')) {
      categoryImage = 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=400&auto=format&fit=crop&q=80';
    } else if (lower.includes('içecek') || lower.includes('su') || lower.includes('kahve')) {
      categoryImage = 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80';
    }
  }

  const newCategory: Category = {
    id: `cat_${Date.now()}`,
    name: name.trim(),
    image: categoryImage
  };

  db.categories.push(newCategory);
  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'KATEGORİ_EKLEME', `"${name}" isimli yeni kategori eklendi.`);

  res.status(201).json(newCategory);
});

app.put('/api/admin/categories/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, image } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Kategori adı zorunludur.' });
  }

  if (!db.categories) db.categories = [];
  const index = db.categories.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Kategori bulunamadı.' });
  }

  const oldName = db.categories[index].name;
  const newName = name.trim();

  // Check if rename conflicts with another category
  const exists = db.categories.some(c => c.id !== id && c.name.toLowerCase() === newName.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Bu isimde başka bir kategori bulunuyor.' });
  }

  let categoryImage = image ? image.trim() : '';
  if (!categoryImage) {
    categoryImage = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80';
    const lower = newName.toLowerCase();
    if (lower.includes('bakliyat') || lower.includes('unlu')) {
      categoryImage = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80';
    } else if (lower.includes('süt') || lower.includes('şarküteri') || lower.includes('et') || lower.includes('peynir')) {
      categoryImage = 'https://images.unsplash.com/photo-1486299267070-8382e214434b?w=400&auto=format&fit=crop&q=80';
    } else if (lower.includes('yağ') || lower.includes('sos')) {
      categoryImage = 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80';
    } else if (lower.includes('meyve') || lower.includes('sebze')) {
      categoryImage = 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400&auto=format&fit=crop&q=80';
    } else if (lower.includes('tatlı') || lower.includes('çikolata')) {
      categoryImage = 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=400&auto=format&fit=crop&q=80';
    } else if (lower.includes('içecek') || lower.includes('su') || lower.includes('kahve')) {
      categoryImage = 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80';
    }
  }

  // Update category
  db.categories[index].name = newName;
  db.categories[index].image = categoryImage;

  // Also update category names on products that belong to this category so they don't lose association!
  if (db.products) {
    db.products.forEach(p => {
      if (p.category === oldName) {
        p.category = newName;
      }
    });
  }

  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'KATEGORİ_GÜNCELLEME', `"${oldName}" kategorisi "${newName}" olarak güncellendi.`);

  res.json(db.categories[index]);
});

app.delete('/api/admin/categories/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!db.categories) db.categories = [];
  const index = db.categories.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Kategori bulunamadı.' });
  }

  const categoryName = db.categories[index].name;

  // Check if there are active products belonging to this category
  const hasProducts = db.products && db.products.some(p => p.category === categoryName);
  if (hasProducts) {
    return res.status(400).json({ error: 'Bu kategoriye ait ürünler bulunmaktadır. Önce ürünlerin kategorisini değiştirin veya silin.' });
  }

  db.categories.splice(index, 1);
  await saveDB();

  const session = (req as any).user;
  await logActivity(session.userId, session.email, 'KATEGORİ_SİLME', `"${categoryName}" isimli kategori silindi.`);

  res.json({ success: true, message: 'Kategori başarıyla silindi.' });
});

// Port checking and Server boot
async function startServer() {
  // Load local database (bypassing Postgres fully to revert to previous state)
  await loadDB();

  // In production mode, we serve Vite's static build
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('dist')));
    app.get('*', async (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    // In development mode, mount Vite as middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`B2B Portal Express Server online on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
