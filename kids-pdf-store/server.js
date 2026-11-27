const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const QRCode = require('qrcode');

const storeDb = require('./storeDb');

const app = express();
const PORT = Number(process.env.KIDS_STORE_PORT) || 5050;
const BASE_DIR = __dirname;
const BOOKS_DIR = path.join(BASE_DIR, 'uploads', 'books');
const COVERS_DIR = path.join(BASE_DIR, 'uploads', 'covers');

fs.mkdirSync(BOOKS_DIR, { recursive: true });
fs.mkdirSync(COVERS_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

app.use('/uploads/covers', express.static(COVERS_DIR));
app.use(express.static(path.join(BASE_DIR, 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
}));

function saveBase64File(dataUrl, destDir, prefix, defaultExt) {
  const str = String(dataUrl || '');
  const commaIdx = str.indexOf(',');
  if (!str.startsWith('data:') || commaIdx === -1) {
    throw new Error('Invalid file upload format.');
  }
  const header = str.slice(5, commaIdx).toLowerCase();
  const body = str.slice(commaIdx + 1).trim();
  let ext = defaultExt;
  if (header.includes('pdf')) ext = '.pdf';
  else if (header.includes('png')) ext = '.png';
  else if (header.includes('webp')) ext = '.webp';
  else if (header.includes('svg')) ext = '.svg';
  else if (header.includes('jpeg') || header.includes('jpg')) ext = '.jpg';

  const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(2).toString('hex')}${ext}`;
  const fullPath = path.join(destDir, filename);
  fs.writeFileSync(fullPath, Buffer.from(body, 'base64'));
  return filename;
}

function escapeXml(str) {
  return String(str || '').replace(/[<>&'"]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[ch]));
}

function saveAutoCoverSvg({ title, category, ageGroup, pages }) {
  const safeTitle = escapeXml(String(title || 'Printable Worksheet').slice(0, 38));
  const safeCat = escapeXml(String(category || 'Learning PDF').slice(0, 22));
  const safeAge = escapeXml(String(ageGroup || '4-6') + ' Years');
  const safePages = `${Math.max(1, Number(pages) || 10)} Pages`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="320" viewBox="0 0 460 320">
  <rect width="460" height="320" fill="#F8FAFC"/>
  <rect x="24" y="14" width="412" height="292" rx="16" fill="#FFFFFF" stroke="#DCE5F0" stroke-width="2"/>
  <rect x="24" y="14" width="412" height="72" rx="16" fill="#EAF4FF"/>
  <rect x="24" y="66" width="412" height="20" fill="#EAF4FF"/>
  <circle cx="72" cy="50" r="18" fill="#397BB5"/>
  <rect x="64" y="42" width="16" height="16" rx="3" fill="#FFFFFF"/>
  <text x="106" y="48" font-family="Nunito Sans, sans-serif" font-size="14" font-weight="800" fill="#397BB5">${safeCat}</text>
  <text x="106" y="68" font-family="Nunito Sans, sans-serif" font-size="12" font-weight="700" fill="#687789">${safeAge}  •  ${safePages} (A4 PDF)</text>
  <text x="48" y="132" font-family="Nunito Sans, sans-serif" font-size="20" font-weight="900" fill="#26384A">${safeTitle}</text>
  <line x1="48" y1="166" x2="404" y2="166" stroke="#CBD5E1" stroke-width="3" stroke-dasharray="8 8" stroke-linecap="round"/>
  <line x1="48" y1="204" x2="364" y2="204" stroke="#93C5FD" stroke-width="3" stroke-dasharray="8 8" stroke-linecap="round"/>
  <rect x="48" y="232" width="110" height="44" rx="10" fill="#FFF2C9" stroke="#F59E0B" stroke-width="1.8"/>
  <rect x="174" y="232" width="110" height="44" rx="10" fill="#E4F5EA" stroke="#25805B" stroke-width="1.8"/>
  <rect x="300" y="232" width="110" height="44" rx="10" fill="#F2EAFE" stroke="#7E22CE" stroke-width="1.8"/>
</svg>`;
  const filename = `cover_auto_${Date.now()}_${crypto.randomBytes(2).toString('hex')}.svg`;
  fs.writeFileSync(path.join(COVERS_DIR, filename), svg, 'utf8');
  return `/uploads/covers/${filename}`;
}

function removeUploadedFileIfLocal(urlOrName, dir) {
  if (!urlOrName) return;
  const base = path.basename(String(urlOrName));
  if (!base) return;
  const full = path.join(dir, base);
  if (fs.existsSync(full)) {
    try { fs.unlinkSync(full); } catch (_) {}
  }
}

function buildUpiUri({ upiId, upiName, amount, orderCode, bookTitle }) {
  if (!upiId) return '';
  const params = new URLSearchParams({
    pa: upiId,
    pn: upiName || 'LittleStars Kids Books',
    am: Number(amount).toFixed(2),
    cu: 'INR',
    tn: `${orderCode} - ${(bookTitle || 'Kids PDF Book').slice(0, 35)}`
  });
  return `upi://pay?${params.toString()}`;
}

function verifyAdmin(req, res, next) {
  const settings = storeDb.getSettings();
  const pin = req.headers['x-admin-pin'] || req.query.pin || req.body?.adminPin || '';
  if (String(pin) !== String(settings.adminPin || '1234')) {
    return res.status(401).json({ success: false, error: 'Incorrect Admin PIN. Please sign in again.' });
  }
  next();
}

// --- Public Store Routes ---
app.get('/api/health', (req, res) => {
  res.json({ success: true, app: 'Kids PDF Book Store', port: PORT });
});

app.get('/api/store/public', (req, res) => {
  try {
    res.json({
      success: true,
      settings: storeDb.getPublicSettings(),
      books: storeDb.getPublicBooks(),
      feedback: storeDb.getFeedbackList()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/store/book/:id/download', (req, res) => {
  const book = storeDb.getBookById(req.params.id);
  if (!book || book.published === false) return res.status(404).send('Worksheet not found');
  if (Number(book.price) > 0) {
    return res.status(403).send('This workbook requires purchase before downloading.');
  }
  const fullPath = path.join(BOOKS_DIR, path.basename(book.pdfFile || ''));
  if (!book.pdfFile || !fs.existsSync(fullPath)) {
    return res.status(404).send('Worksheet PDF file not found.');
  }
  storeDb.incrementBookDownload(book.id);
  const cleanName = (book.title || 'worksheet').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) + '.pdf';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${cleanName}"`);
  res.sendFile(fullPath);
});

app.post('/api/store/feedback', (req, res) => {
  try {
    const { parentName = '', relation = 'Parent', email = '', rating = 5, message = '' } = req.body || {};
    if (!String(parentName).trim() || !String(message).trim()) {
      return res.status(400).json({ success: false, error: 'Please provide your name and feedback message.' });
    }
    const entry = storeDb.addFeedback({ parentName, relation, email, rating, message });
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/store/book/:id/sample', (req, res) => {
  const book = storeDb.getBookById(req.params.id);
  if (!book) return res.status(404).send('Book not found');
  const file = book.samplePdfFile || book.pdfFile;
  if (!file) return res.status(404).send('Sample file not available');
  const fullPath = path.join(BOOKS_DIR, path.basename(file));
  if (!fs.existsSync(fullPath)) return res.status(404).send('Sample PDF missing');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="sample_${path.basename(file)}"`);
  res.sendFile(fullPath);
});

app.post('/api/store/upi-qr-preview', async (req, res) => {
  try {
    const { upiId, upiName, amount = 49, note = 'Test Payment' } = req.body || {};
    if (!upiId) return res.status(400).json({ success: false, error: 'Please enter a valid UPI ID.' });
    const uri = buildUpiUri({ upiId, upiName, amount, orderCode: 'TEST', bookTitle: note });
    const qrDataUrl = await QRCode.toDataURL(uri, { width: 260, margin: 1 });
    res.json({ success: true, upiUri: uri, qrDataUrl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/store/orders', async (req, res) => {
  try {
    const { bookId, customerName, customerPhone, customerEmail = '', paymentMethod = 'upi' } = req.body || {};
    const book = storeDb.getBookById(bookId);
    if (!book || book.published === false) {
      return res.status(404).json({ success: false, error: 'Selected PDF book was not found.' });
    }
    if (!String(customerName || '').trim() || !String(customerPhone || '').trim()) {
      return res.status(400).json({ success: false, error: 'Full name and WhatsApp / mobile number are required.' });
    }

    const order = storeDb.createOrder({
      book,
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod
    });

    const settings = storeDb.getSettings();
    const upiUri = buildUpiUri({
      upiId: settings.upiId,
      upiName: settings.upiName || settings.storeName,
      amount: order.amount,
      orderCode: order.orderCode,
      bookTitle: book.title
    });
    const qrDataUrl = upiUri ? await QRCode.toDataURL(upiUri, { width: 280, margin: 1 }) : '';
    const paymentLink = book.paymentLink || settings.defaultPaymentLink || '';

    res.json({
      success: true,
      order,
      payment: {
        amount: order.amount,
        currency: settings.currency || '₹',
        upiId: settings.upiId,
        upiName: settings.upiName || settings.storeName,
        upiUri,
        qrDataUrl,
        paymentLink,
        hasRazorpay: Boolean(settings.razorpayKeyId && settings.razorpayKeySecret),
        razorpayKeyId: settings.razorpayKeyId || '',
        sellerWhatsapp: settings.whatsappNumber || '',
        deliveryMode: settings.deliveryMode || 'auto_utr'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/store/orders/:orderId/submit-payment', (req, res) => {
  try {
    const order = storeDb.getOrderById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });

    const utr = String(req.body?.utrNumber || '').trim();
    if (order.amount > 0 && utr.length < 4) {
      return res.status(400).json({ success: false, error: 'Please enter a valid UTR / Transaction Reference ID (min 4 characters).' });
    }

    const settings = storeDb.getSettings();
    const autoUnlock = settings.deliveryMode !== 'admin_verify' || order.amount === 0;
    const token = order.downloadToken || crypto.randomBytes(18).toString('hex');

    const updated = storeDb.updateOrder(order.id, () => ({
      utrNumber: utr,
      status: autoUnlock ? 'paid' : 'awaiting_verify',
      downloadToken: autoUnlock ? token : '',
      paidAt: autoUnlock ? new Date().toISOString() : null
    }));

    res.json({
      success: true,
      order: updated,
      downloadUrl: updated.status === 'paid' ? `/api/store/download/${updated.downloadToken}` : ''
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/store/razorpay/create-order', async (req, res) => {
  try {
    const order = storeDb.getOrderById(req.body?.orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
    const settings = storeDb.getSettings();
    if (!settings.razorpayKeyId || !settings.razorpayKeySecret) {
      return res.status(400).json({ success: false, error: 'Razorpay API keys are not configured.' });
    }
    const auth = Buffer.from(`${settings.razorpayKeyId}:${settings.razorpayKeySecret}`).toString('base64');
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(Number(order.amount) * 100),
        currency: 'INR',
        receipt: order.orderCode,
        notes: { bookId: order.bookId, customerPhone: order.customerPhone }
      })
    });
    const rzpOrder = await r.json();
    if (!r.ok) {
      throw new Error(rzpOrder?.error?.description || 'Razorpay order creation failed');
    }
    storeDb.updateOrder(order.id, () => ({ razorpayOrderId: rzpOrder.id }));
    res.json({ success: true, razorpayOrder: rzpOrder, keyId: settings.razorpayKeyId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/store/razorpay/verify', (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    const order = storeDb.getOrderById(orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
    const settings = storeDb.getSettings();
    const expected = crypto
      .createHmac('sha256', settings.razorpayKeySecret || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Razorpay signature verification failed.' });
    }

    const token = order.downloadToken || crypto.randomBytes(18).toString('hex');
    const updated = storeDb.updateOrder(order.id, () => ({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paymentMethod: 'razorpay',
      status: 'paid',
      downloadToken: token,
      paidAt: new Date().toISOString()
    }));

    res.json({
      success: true,
      order: updated,
      downloadUrl: `/api/store/download/${updated.downloadToken}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/store/orders/lookup', (req, res) => {
  const list = storeDb.lookupOrders(req.query.q).map(o => ({
    id: o.id,
    orderCode: o.orderCode,
    bookTitle: o.bookTitle,
    amount: o.amount,
    status: o.status,
    utrNumber: o.utrNumber,
    createdAt: o.createdAt,
    downloadUrl: o.status === 'paid' && o.downloadToken ? `/api/store/download/${o.downloadToken}` : ''
  }));
  res.json({ success: true, orders: list });
});

app.get('/api/store/download/:token', (req, res) => {
  const order = storeDb.getOrderByDownloadToken(req.params.token);
  if (!order || order.status !== 'paid') {
    return res.status(403).send('Payment not confirmed yet or invalid download link.');
  }
  const settings = storeDb.getSettings();
  const maxDl = Number(settings.maxDownloadsPerOrder) || 5;
  if ((Number(order.downloadCount) || 0) >= maxDl) {
    return res.status(403).send(`Maximum ${maxDl} downloads reached for this order. Contact store support.`);
  }
  const book = storeDb.getBookById(order.bookId);
  if (!book || !book.pdfFile) {
    return res.status(404).send('Book PDF file not found.');
  }
  const fullPath = path.join(BOOKS_DIR, path.basename(book.pdfFile));
  if (!fs.existsSync(fullPath)) {
    return res.status(404).send('PDF file missing on server.');
  }

  storeDb.updateOrder(order.id, cur => ({ downloadCount: (Number(cur.downloadCount) || 0) + 1 }));
  const cleanName = (book.title || 'kids_book').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45) + '.pdf';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${cleanName}"`);
  res.sendFile(fullPath);
});

// --- Seller Admin Routes ---
app.post('/api/admin/login', (req, res) => {
  const settings = storeDb.getSettings();
  const pin = String(req.body?.pin || '').trim();
  if (pin !== String(settings.adminPin || '1234')) {
    return res.status(401).json({ success: false, error: 'Invalid Admin PIN.' });
  }
  res.json({ success: true });
});

app.get('/api/admin/dashboard', verifyAdmin, (req, res) => {
  const db = storeDb.readDb();
  res.json({
    success: true,
    stats: storeDb.getAdminStats(),
    settings: db.settings,
    books: db.books,
    orders: db.orders.slice(0, 100)
  });
});

app.put('/api/admin/settings', verifyAdmin, (req, res) => {
  try {
    const updated = storeDb.updateSettings(req.body || {});
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/books', verifyAdmin, (req, res) => {
  try {
    const b = req.body || {};
    if (!String(b.title || '').trim()) {
      return res.status(400).json({ success: false, error: 'Book title is required.' });
    }
    let pdfFile = '';
    if (b.pdfBase64) {
      pdfFile = saveBase64File(b.pdfBase64, BOOKS_DIR, 'book', '.pdf');
    } else {
      return res.status(400).json({ success: false, error: 'Please upload a PDF file for this book.' });
    }

    let samplePdfFile = '';
    if (b.samplePdfBase64) {
      samplePdfFile = saveBase64File(b.samplePdfBase64, BOOKS_DIR, 'sample', '.pdf');
    }

    let coverUrl = '';
    if (b.coverBase64) {
      const coverFile = saveBase64File(b.coverBase64, COVERS_DIR, 'cover', '.jpg');
      coverUrl = `/uploads/covers/${coverFile}`;
    } else {
      coverUrl = saveAutoCoverSvg({ title: b.title, category: b.category, ageGroup: b.ageGroup, pages: b.pages });
    }

    const created = storeDb.addBook({
      title: b.title,
      subtitle: b.subtitle,
      learningGoal: b.learningGoal || b.subtitle,
      ageGroup: b.ageGroup,
      category: b.category,
      learningNeed: b.learningNeed || 'Autism Support',
      skillArea: b.skillArea || 'Fine Motor',
      pages: b.pages,
      mrp: b.mrp,
      price: b.price,
      paymentLink: b.paymentLink,
      description: b.description,
      highlights: b.highlights,
      coverUrl,
      pdfFile,
      samplePdfFile,
      published: b.published !== false,
      featured: Boolean(b.featured)
    });

    res.json({ success: true, book: created });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/books/:id', verifyAdmin, (req, res) => {
  try {
    const b = req.body || {};
    const updates = { ...b };
    if (b.pdfBase64) updates.pdfFile = saveBase64File(b.pdfBase64, BOOKS_DIR, 'book', '.pdf');
    if (b.samplePdfBase64) updates.samplePdfFile = saveBase64File(b.samplePdfBase64, BOOKS_DIR, 'sample', '.pdf');
    if (b.coverBase64) {
      const coverFile = saveBase64File(b.coverBase64, COVERS_DIR, 'cover', '.jpg');
      updates.coverUrl = `/uploads/covers/${coverFile}`;
    }
    const updated = storeDb.updateBook(req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: 'Book not found.' });
    res.json({ success: true, book: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/books/:id', verifyAdmin, (req, res) => {
  const removed = storeDb.deleteBook(req.params.id);
  if (!removed) return res.status(404).json({ success: false, error: 'Book not found.' });
  removeUploadedFileIfLocal(removed.pdfFile, BOOKS_DIR);
  removeUploadedFileIfLocal(removed.samplePdfFile, BOOKS_DIR);
  removeUploadedFileIfLocal(removed.coverUrl, COVERS_DIR);
  res.json({ success: true });
});

app.post('/api/admin/orders/:id/approve', verifyAdmin, (req, res) => {
  const order = storeDb.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
  const token = order.downloadToken || crypto.randomBytes(18).toString('hex');
  const updated = storeDb.updateOrder(order.id, () => ({
    status: 'paid',
    downloadToken: token,
    paidAt: order.paidAt || new Date().toISOString()
  }));
  res.json({
    success: true,
    order: updated,
    downloadUrl: `/api/store/download/${updated.downloadToken}`
  });
});

app.post('/api/admin/orders/:id/reject', verifyAdmin, (req, res) => {
  const order = storeDb.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
  const updated = storeDb.updateOrder(order.id, () => ({
    status: 'rejected',
    downloadToken: ''
  }));
  res.json({ success: true, order: updated });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(BASE_DIR, 'public', 'admin.html'));
});

app.get(['/worksheets', '/categories', '/free', '/resources', '/about', '/contact', '/faq', '/worksheet/:id', '/book/:id'], (req, res) => {
  res.sendFile(path.join(BASE_DIR, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n📚 Kids PDF Book Store running on http://localhost:${PORT}`);
  console.log(`🛒 Public Buyer Storefront: http://localhost:${PORT}/`);
  console.log(`🔐 Seller Admin & Payment Panel: http://localhost:${PORT}/admin\n`);
});
