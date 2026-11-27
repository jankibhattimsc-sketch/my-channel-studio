const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_DIR = __dirname;
const DATA_DIR = path.join(BASE_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'store.json');

const DEFAULT_STORE = {
  settings: {
    storeName: 'LittleStars Kids PDF Store',
    tagline: 'બાળકો માટે શ્રેષ્ઠ લર્નિંગ, કલરિંગ & એક્ટિવિટી PDF બુક્સ ✨',
    currency: '₹',
    whatsappNumber: '',
    supportEmail: '',
    upiId: '',
    upiName: 'LittleStars Kids Books',
    defaultPaymentLink: '',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    deliveryMode: 'auto_utr', // 'auto_utr' | 'admin_verify'
    adminPin: '1234',
    maxDownloadsPerOrder: 5
  },
  books: [],
  orders: []
};

function ensureDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_STORE, null, 2), 'utf8');
  }
}

function readDb() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      settings: { ...DEFAULT_STORE.settings, ...(parsed.settings || {}) },
      books: Array.isArray(parsed.books) ? parsed.books : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : []
    };
  } catch (_) {
    return JSON.parse(JSON.stringify(DEFAULT_STORE));
  }
}

function writeDb(data) {
  ensureDb();
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_PATH);
}

function getSettings() {
  return readDb().settings;
}

function updateSettings(updates = {}) {
  const db = readDb();
  const allowed = [
    'storeName', 'tagline', 'currency', 'whatsappNumber', 'supportEmail',
    'upiId', 'upiName', 'defaultPaymentLink', 'razorpayKeyId', 'razorpayKeySecret',
    'deliveryMode', 'adminPin', 'maxDownloadsPerOrder'
  ];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      db.settings[key] = key === 'maxDownloadsPerOrder'
        ? Math.max(1, Math.min(50, Number(updates[key]) || 5))
        : String(updates[key] ?? '').trim();
    }
  }
  writeDb(db);
  return db.settings;
}

function getPublicSettings() {
  const s = getSettings();
  return {
    storeName: s.storeName,
    tagline: s.tagline,
    currency: s.currency || '₹',
    whatsappNumber: s.whatsappNumber,
    supportEmail: s.supportEmail,
    hasUpi: Boolean(s.upiId),
    upiId: s.upiId,
    upiName: s.upiName || s.storeName,
    defaultPaymentLink: s.defaultPaymentLink,
    hasRazorpay: Boolean(s.razorpayKeyId && s.razorpayKeySecret),
    razorpayKeyId: s.razorpayKeyId || '',
    deliveryMode: s.deliveryMode || 'auto_utr'
  };
}

function sanitizeBookPublic(book) {
  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle || '',
    ageGroup: book.ageGroup || '3-7',
    category: book.category || 'Activity',
    pages: Number(book.pages) || 20,
    mrp: Number(book.mrp) || 199,
    price: Number(book.price) || 49,
    paymentLink: book.paymentLink || '',
    description: book.description || '',
    highlights: Array.isArray(book.highlights) ? book.highlights : [],
    coverUrl: book.coverUrl || '',
    hasSample: Boolean(book.samplePdfFile || book.pdfFile),
    published: book.published !== false,
    featured: Boolean(book.featured),
    salesCount: Number(book.salesCount) || 0,
    createdAt: book.createdAt
  };
}

function getPublicBooks() {
  const db = readDb();
  return db.books.filter(b => b.published !== false).map(sanitizeBookPublic);
}

function getAllBooksAdmin() {
  return readDb().books;
}

function getBookById(id) {
  return readDb().books.find(b => b.id === id) || null;
}

function addBook(bookData) {
  const db = readDb();
  const book = {
    id: 'bk-' + Date.now() + '-' + crypto.randomBytes(2).toString('hex'),
    title: String(bookData.title || '').trim(),
    subtitle: String(bookData.subtitle || '').trim(),
    ageGroup: String(bookData.ageGroup || '3-7').trim(),
    category: String(bookData.category || 'Activity').trim(),
    pages: Math.max(1, Number(bookData.pages) || 24),
    mrp: Math.max(1, Number(bookData.mrp) || 199),
    price: Math.max(0, Number(bookData.price) || 49),
    paymentLink: String(bookData.paymentLink || '').trim(),
    description: String(bookData.description || '').trim(),
    highlights: Array.isArray(bookData.highlights) ? bookData.highlights.filter(Boolean) : [],
    coverUrl: String(bookData.coverUrl || '').trim(),
    pdfFile: String(bookData.pdfFile || '').trim(),
    samplePdfFile: String(bookData.samplePdfFile || '').trim(),
    published: bookData.published !== false,
    featured: Boolean(bookData.featured),
    salesCount: Number(bookData.salesCount) || 0,
    createdAt: new Date().toISOString()
  };
  db.books.unshift(book);
  writeDb(db);
  return book;
}

function updateBook(id, updates = {}) {
  const db = readDb();
  const idx = db.books.findIndex(b => b.id === id);
  if (idx === -1) return null;
  const cur = db.books[idx];
  db.books[idx] = {
    ...cur,
    title: updates.title !== undefined ? String(updates.title).trim() : cur.title,
    subtitle: updates.subtitle !== undefined ? String(updates.subtitle).trim() : cur.subtitle,
    ageGroup: updates.ageGroup !== undefined ? String(updates.ageGroup).trim() : cur.ageGroup,
    category: updates.category !== undefined ? String(updates.category).trim() : cur.category,
    pages: updates.pages !== undefined ? Math.max(1, Number(updates.pages) || cur.pages) : cur.pages,
    mrp: updates.mrp !== undefined ? Math.max(1, Number(updates.mrp) || cur.mrp) : cur.mrp,
    price: updates.price !== undefined ? Math.max(0, Number(updates.price)) : cur.price,
    paymentLink: updates.paymentLink !== undefined ? String(updates.paymentLink).trim() : cur.paymentLink,
    description: updates.description !== undefined ? String(updates.description).trim() : cur.description,
    highlights: Array.isArray(updates.highlights) ? updates.highlights.filter(Boolean) : cur.highlights,
    coverUrl: updates.coverUrl !== undefined && updates.coverUrl ? String(updates.coverUrl) : cur.coverUrl,
    pdfFile: updates.pdfFile !== undefined && updates.pdfFile ? String(updates.pdfFile) : cur.pdfFile,
    samplePdfFile: updates.samplePdfFile !== undefined && updates.samplePdfFile ? String(updates.samplePdfFile) : cur.samplePdfFile,
    published: updates.published !== undefined ? Boolean(updates.published) : cur.published,
    featured: updates.featured !== undefined ? Boolean(updates.featured) : cur.featured,
    updatedAt: new Date().toISOString()
  };
  writeDb(db);
  return db.books[idx];
}

function deleteBook(id) {
  const db = readDb();
  const idx = db.books.findIndex(b => b.id === id);
  if (idx === -1) return null;
  const [removed] = db.books.splice(idx, 1);
  writeDb(db);
  return removed;
}

function createOrder({ book, customerName, customerPhone, customerEmail, paymentMethod }) {
  const db = readDb();
  const orderCode = 'KB' + String(Date.now()).slice(-6) + crypto.randomBytes(1).toString('hex').toUpperCase();
  const order = {
    id: 'ord-' + Date.now() + '-' + crypto.randomBytes(2).toString('hex'),
    orderCode,
    bookId: book.id,
    bookTitle: book.title,
    amount: Number(book.price) || 0,
    customerName: String(customerName || '').trim(),
    customerPhone: String(customerPhone || '').trim(),
    customerEmail: String(customerEmail || '').trim(),
    paymentMethod: String(paymentMethod || 'upi').trim(),
    utrNumber: '',
    razorpayOrderId: '',
    razorpayPaymentId: '',
    status: Number(book.price) === 0 ? 'paid' : 'pending',
    downloadToken: Number(book.price) === 0 ? crypto.randomBytes(18).toString('hex') : '',
    downloadCount: 0,
    createdAt: new Date().toISOString(),
    paidAt: Number(book.price) === 0 ? new Date().toISOString() : null
  };
  db.orders.unshift(order);
  writeDb(db);
  return order;
}

function getOrderById(id) {
  return readDb().orders.find(o => o.id === id || o.orderCode === id) || null;
}

function updateOrder(id, updater) {
  const db = readDb();
  const idx = db.orders.findIndex(o => o.id === id || o.orderCode === id);
  if (idx === -1) return null;
  const prevStatus = db.orders[idx].status;
  db.orders[idx] = { ...db.orders[idx], ...updater(db.orders[idx]) };
  if (prevStatus !== 'paid' && db.orders[idx].status === 'paid') {
    const bIdx = db.books.findIndex(b => b.id === db.orders[idx].bookId);
    if (bIdx !== -1) {
      db.books[bIdx].salesCount = (Number(db.books[bIdx].salesCount) || 0) + 1;
    }
  }
  writeDb(db);
  return db.orders[idx];
}

function getOrderByDownloadToken(token) {
  if (!token) return null;
  return readDb().orders.find(o => o.downloadToken === token) || null;
}

function lookupOrders(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const cleanPhone = q.replace(/\D/g, '');
  return readDb().orders
    .filter(o => {
      if (o.orderCode.toLowerCase() === q || o.id.toLowerCase() === q) return true;
      if (cleanPhone.length >= 6 && o.customerPhone.replace(/\D/g, '').includes(cleanPhone)) return true;
      return false;
    })
    .slice(0, 15);
}

function getAdminStats() {
  const db = readDb();
  const paidOrders = db.orders.filter(o => o.status === 'paid');
  const pendingOrders = db.orders.filter(o => o.status === 'awaiting_verify' || o.status === 'pending');
  const totalRevenue = paidOrders.reduce((acc, o) => acc + (Number(o.amount) || 0), 0);
  const totalDownloads = db.orders.reduce((acc, o) => acc + (Number(o.downloadCount) || 0), 0);
  return {
    totalBooks: db.books.length,
    publishedBooks: db.books.filter(b => b.published !== false).length,
    paidCount: paidOrders.length,
    pendingCount: pendingOrders.length,
    totalRevenue,
    totalDownloads
  };
}

module.exports = {
  readDb,
  writeDb,
  getSettings,
  getPublicSettings,
  updateSettings,
  getPublicBooks,
  getAllBooksAdmin,
  getBookById,
  addBook,
  updateBook,
  deleteBook,
  createOrder,
  getOrderById,
  updateOrder,
  getOrderByDownloadToken,
  lookupOrders,
  getAdminStats
};
