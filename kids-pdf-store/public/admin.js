(function () {
  let adminPin = sessionStorage.getItem('kids_store_admin_pin') || '';
  let dashboardData = null;

  const loginView = document.getElementById('login-view');
  const dashboardView = document.getElementById('dashboard-view');
  const btnLogout = document.getElementById('btn-logout');

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('ફાઇલ વાંચવામાં ભૂલ'));
      r.readAsDataURL(file);
    });
  }

  async function apiAdmin(url, method = 'GET', body = null) {
    const opts = {
      method,
      headers: {
        'x-admin-pin': adminPin,
        'Content-Type': 'application/json'
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function tryLogin(pin) {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'ખોટો PIN');
    adminPin = pin;
    sessionStorage.setItem('kids_store_admin_pin', pin);
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';
    btnLogout.style.display = 'inline-flex';
    await loadDashboard();
  }

  document.getElementById('btn-login').addEventListener('click', async () => {
    const pin = document.getElementById('admin-pin-input').value.trim();
    const errEl = document.getElementById('login-err');
    errEl.style.display = 'none';
    try {
      await tryLogin(pin);
    } catch (err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  });

  btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('kids_store_admin_pin');
    adminPin = '';
    dashboardView.style.display = 'none';
    loginView.style.display = 'block';
    btnLogout.style.display = 'none';
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const t = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-pane').forEach(p => {
        p.style.display = p.id === `tab-${t}` ? 'block' : 'none';
      });
    });
  });

  async function loadDashboard() {
    dashboardData = await apiAdmin('/api/admin/dashboard');
    renderStats(dashboardData.stats || {});
    renderBooks(dashboardData.books || []);
    renderOrders(dashboardData.orders || []);
    populateSettings(dashboardData.settings || {});
  }

  function renderStats(s) {
    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card"><div class="stat-val" style="color:#059669;">₹${s.totalRevenue || 0}</div><div class="stat-lbl">કુલ કમાણી (Revenue)</div></div>
      <div class="stat-card"><div class="stat-val" style="color:#0284c7;">${s.paidCount || 0}</div><div class="stat-lbl">સફળ વેચાણ (Paid Orders)</div></div>
      <div class="stat-card"><div class="stat-val" style="color:#f59e0b;">${s.pendingCount || 0}</div><div class="stat-lbl">બાકી મંજૂરી (Pending)</div></div>
      <div class="stat-card"><div class="stat-val">${s.totalBooks || 0}</div><div class="stat-lbl">કુલ બુક્સ (PDF Books)</div></div>
      <div class="stat-card"><div class="stat-val">${s.totalDownloads || 0}</div><div class="stat-lbl">કુલ PDF ડાઉનલોડ્સ</div></div>
    `;
  }

  function renderBooks(books) {
    const el = document.getElementById('admin-books-list');
    if (!books.length) {
      el.innerHTML = '<div style="color:#64748b;">હજી કોઈ બુક ઉમેરેલી નથી.</div>';
      return;
    }
    el.innerHTML = books.map(b => `
      <div class="book-row">
        <img src="${esc(b.coverUrl)}" alt="" style="width:54px; height:70px; object-fit:cover; border-radius:8px; border:1px solid #cbd5e1;" />
        <div style="flex:1; min-width:200px;">
          <div style="font-weight:900; font-size:0.98rem;">${esc(b.title)} ${b.published === false ? '<span style="color:#dc2626;">(Hidden)</span>' : ''}</div>
          <div style="font-size:0.82rem; color:#475569;">${esc(b.category)} • ઉંમર ${esc(b.ageGroup)} • <strong>₹${b.price}</strong> (MRP ₹${b.mrp}) • વેચાણ: ${b.salesCount || 0}</div>
          ${b.paymentLink ? `<div style="font-size:0.76rem; color:#0284c7;">💳 Link: ${esc(b.paymentLink)}</div>` : ''}
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn btn-outline" style="padding:6px 10px; font-size:0.78rem;" data-copy-book="${esc(b.id)}">🔗 ડાયરેક્ટ લિંક</button>
          <button class="btn btn-outline" style="padding:6px 10px; font-size:0.78rem;" data-edit-book="${esc(b.id)}">✏️ એડિટ</button>
          <button class="btn btn-outline" style="padding:6px 10px; font-size:0.78rem; color:#dc2626;" data-del-book="${esc(b.id)}">🗑️</button>
        </div>
      </div>
    `).join('');

    el.querySelectorAll('[data-copy-book]').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = `${window.location.origin}/book/${btn.getAttribute('data-copy-book')}`;
        navigator.clipboard?.writeText(url);
        btn.textContent = '✓ લિંક કોપી!';
        setTimeout(() => { btn.textContent = '🔗 ડાયરેક્ટ લિંક'; }, 1800);
      });
    });

    el.querySelectorAll('[data-edit-book]').forEach(btn => {
      btn.addEventListener('click', () => {
        const bk = books.find(x => x.id === btn.getAttribute('data-edit-book'));
        if (!bk) return;
        document.getElementById('bk-edit-id').value = bk.id;
        document.getElementById('book-form-heading').textContent = `✏️ બુક એડિટ કરો: ${bk.title}`;
        document.getElementById('bk-title').value = bk.title || '';
        document.getElementById('bk-subtitle').value = bk.subtitle || '';
        document.getElementById('bk-age').value = bk.ageGroup || '4-6';
        document.getElementById('bk-cat').value = bk.category || '';
        document.getElementById('bk-pages').value = bk.pages || 30;
        document.getElementById('bk-mrp').value = bk.mrp || 199;
        document.getElementById('bk-price').value = bk.price || 49;
        document.getElementById('bk-paylink').value = bk.paymentLink || '';
        document.getElementById('bk-desc').value = bk.description || '';
        document.getElementById('bk-highlights').value = (bk.highlights || []).join('\n');
        document.getElementById('bk-featured').checked = Boolean(bk.featured);
        document.getElementById('bk-published').checked = bk.published !== false;
        document.getElementById('btn-cancel-edit').style.display = 'inline-flex';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    el.querySelectorAll('[data-del-book]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('શું ખરેખર આ બુક કાઢી નાખવી છે?')) return;
        await apiAdmin(`/api/admin/books/${encodeURIComponent(btn.getAttribute('data-del-book'))}`, 'DELETE');
        await loadDashboard();
      });
    });
  }

  function resetBookForm() {
    document.getElementById('bk-edit-id').value = '';
    document.getElementById('book-form-heading').textContent = '➕ નવી Kids PDF બુક ઉમેરો';
    ['bk-title', 'bk-subtitle', 'bk-paylink', 'bk-desc', 'bk-highlights', 'bk-pdf-file', 'bk-cover-file', 'bk-sample-file'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('btn-cancel-edit').style.display = 'none';
  }
  document.getElementById('btn-cancel-edit').addEventListener('click', resetBookForm);

  document.getElementById('btn-save-book').addEventListener('click', async () => {
    const editId = document.getElementById('bk-edit-id').value;
    const msgEl = document.getElementById('bk-form-msg');
    msgEl.style.display = 'block';
    msgEl.style.color = '#0284c7';
    msgEl.textContent = '⏳ બુક અપલોડ & સેવ થઈ રહી છે...';

    try {
      const payload = {
        title: document.getElementById('bk-title').value.trim(),
        subtitle: document.getElementById('bk-subtitle').value.trim(),
        ageGroup: document.getElementById('bk-age').value,
        category: document.getElementById('bk-cat').value.trim(),
        pages: Number(document.getElementById('bk-pages').value) || 24,
        mrp: Number(document.getElementById('bk-mrp').value) || 199,
        price: Number(document.getElementById('bk-price').value) || 0,
        paymentLink: document.getElementById('bk-paylink').value.trim(),
        description: document.getElementById('bk-desc').value.trim(),
        highlights: document.getElementById('bk-highlights').value.split('\n').map(s => s.trim()).filter(Boolean),
        featured: document.getElementById('bk-featured').checked,
        published: document.getElementById('bk-published').checked
      };

      const pdfFile = document.getElementById('bk-pdf-file').files?.[0];
      const coverFile = document.getElementById('bk-cover-file').files?.[0];
      const sampleFile = document.getElementById('bk-sample-file').files?.[0];

      if (pdfFile) payload.pdfBase64 = await fileToDataUrl(pdfFile);
      if (coverFile) payload.coverBase64 = await fileToDataUrl(coverFile);
      if (sampleFile) payload.samplePdfBase64 = await fileToDataUrl(sampleFile);

      if (editId) {
        await apiAdmin(`/api/admin/books/${encodeURIComponent(editId)}`, 'PUT', payload);
      } else {
        await apiAdmin('/api/admin/books', 'POST', payload);
      }
      msgEl.style.color = '#059669';
      msgEl.textContent = '✅ બુક સફળતાપૂર્વક સેવ થઈ ગઈ!';
      resetBookForm();
      await loadDashboard();
    } catch (err) {
      msgEl.style.color = '#dc2626';
      msgEl.textContent = '⚠️ ' + err.message;
    }
  });

  function renderOrders(orders) {
    const el = document.getElementById('admin-orders-list');
    if (!orders.length) {
      el.innerHTML = '<div style="color:#64748b;">હજી સુધી કોઈ ઓર્ડર આવ્યો નથી.</div>';
      return;
    }
    el.innerHTML = orders.map(o => {
      const dlUrl = o.downloadToken ? `${window.location.origin}/api/store/download/${o.downloadToken}` : '';
      const cleanPhone = String(o.customerPhone || '').replace(/\D/g, '');
      const waTarget = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
      const waMsg = encodeURIComponent(`નમસ્તે ${o.customerName}! તમારી Kids PDF Book "${o.bookTitle}" (Order ${o.orderCode}) તૈયાર છે.\n\nઅહીંથી ડાઉનલોડ કરો:\n${dlUrl}`);

      return `
        <div class="order-row">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <strong>${esc(o.orderCode)} — ${esc(o.bookTitle)} (₹${o.amount})</strong>
            <span style="padding:3px 10px; border-radius:999px; font-size:0.78rem; font-weight:800; background:${o.status === 'paid' ? '#dcfce7' : (o.status === 'rejected' ? '#fee2e2' : '#fef3c7')}; color:${o.status === 'paid' ? '#166534' : (o.status === 'rejected' ? '#991b1b' : '#92400e')};">
              ${o.status.toUpperCase()}
            </span>
          </div>
          <div style="font-size:0.84rem; color:#334155; margin:6px 0;">
            👤 ${esc(o.customerName)} • 📱 ${esc(o.customerPhone)} ${o.utrNumber ? `• 🔐 UTR: <strong>${esc(o.utrNumber)}</strong>` : ''} • 📥 Downloads: ${o.downloadCount || 0}
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${o.status !== 'paid' ? `<button class="btn btn-buy" style="padding:6px 12px; font-size:0.8rem;" data-approve-ord="${esc(o.id)}">✅ Approve &amp; Unlock PDF</button>` : ''}
            ${o.status !== 'rejected' && o.status !== 'paid' ? `<button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem; color:#dc2626;" data-reject-ord="${esc(o.id)}">❌ Reject</button>` : ''}
            ${dlUrl && waTarget ? `<a href="https://wa.me/${waTarget}?text=${waMsg}" target="_blank" class="btn btn-primary" style="padding:6px 12px; font-size:0.8rem;">📲 WhatsApp માં PDF લિંક મોકલો</a>` : ''}
            ${dlUrl ? `<button class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem;" data-copy-dl="${esc(dlUrl)}">📋 PDF લિંક કોપી</button>` : ''}
          </div>
        </div>
      `;
    }).join('');

    el.querySelectorAll('[data-approve-ord]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await apiAdmin(`/api/admin/orders/${encodeURIComponent(btn.getAttribute('data-approve-ord'))}/approve`, 'POST');
        await loadDashboard();
      });
    });
    el.querySelectorAll('[data-reject-ord]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await apiAdmin(`/api/admin/orders/${encodeURIComponent(btn.getAttribute('data-reject-ord'))}/reject`, 'POST');
        await loadDashboard();
      });
    });
    el.querySelectorAll('[data-copy-dl]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard?.writeText(btn.getAttribute('data-copy-dl'));
        btn.textContent = '✓ કોપી!';
      });
    });
  }

  function populateSettings(s) {
    document.getElementById('set-store-name').value = s.storeName || '';
    document.getElementById('set-tagline').value = s.tagline || '';
    document.getElementById('set-wa').value = s.whatsappNumber || '';
    document.getElementById('set-email').value = s.supportEmail || '';
    document.getElementById('set-upi-id').value = s.upiId || '';
    document.getElementById('set-upi-name').value = s.upiName || '';
    document.getElementById('set-default-link').value = s.defaultPaymentLink || '';
    document.getElementById('set-rzp-id').value = s.razorpayKeyId || '';
    document.getElementById('set-rzp-secret').value = s.razorpayKeySecret || '';
    document.getElementById('set-delivery-mode').value = s.deliveryMode || 'auto_utr';
    document.getElementById('set-pin').value = s.adminPin || '1234';
  }

  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const msgEl = document.getElementById('set-msg');
    try {
      const newPin = document.getElementById('set-pin').value.trim() || adminPin;
      await apiAdmin('/api/admin/settings', 'PUT', {
        storeName: document.getElementById('set-store-name').value.trim(),
        tagline: document.getElementById('set-tagline').value.trim(),
        whatsappNumber: document.getElementById('set-wa').value.trim(),
        supportEmail: document.getElementById('set-email').value.trim(),
        upiId: document.getElementById('set-upi-id').value.trim(),
        upiName: document.getElementById('set-upi-name').value.trim(),
        defaultPaymentLink: document.getElementById('set-default-link').value.trim(),
        razorpayKeyId: document.getElementById('set-rzp-id').value.trim(),
        razorpayKeySecret: document.getElementById('set-rzp-secret').value.trim(),
        deliveryMode: document.getElementById('set-delivery-mode').value,
        adminPin: newPin
      });
      adminPin = newPin;
      sessionStorage.setItem('kids_store_admin_pin', newPin);
      msgEl.style.display = 'block';
      msgEl.style.color = '#059669';
      msgEl.textContent = '✅ બધા સ્ટોર & પેમેન્ટ સેટિંગ્સ સેવ થઈ ગયા છે!';
    } catch (err) {
      msgEl.style.display = 'block';
      msgEl.style.color = '#dc2626';
      msgEl.textContent = '⚠️ ' + err.message;
    }
  });

  document.getElementById('btn-test-qr').addEventListener('click', async () => {
    const upiId = document.getElementById('set-upi-id').value.trim();
    const upiName = document.getElementById('set-upi-name').value.trim();
    const box = document.getElementById('test-qr-box');
    if (!upiId) {
      alert('પહેલા ઉપર તમારું UPI ID લખો.');
      return;
    }
    const res = await fetch('/api/store/upi-qr-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upiId, upiName, amount: 49, note: 'Test Kids PDF Book' })
    });
    const data = await res.json();
    if (data.success) {
      box.style.display = 'block';
      box.innerHTML = `<div style="font-weight:800; color:#0284c7; margin-bottom:8px;">✅ આ ₹49 નો લાઇવ ટેસ્ટ QR છે — GPay/PhonePe થી સ્કેન કરીને ચકાસો</div>
        <img src="${data.qrDataUrl}" alt="Test UPI QR" />
        <div style="font-size:0.8rem; color:#475569; margin-top:6px;">${esc(upiId)}</div>`;
    }
  });

  document.getElementById('btn-refresh-admin').addEventListener('click', loadDashboard);

  if (adminPin) {
    tryLogin(adminPin).catch(() => {
      sessionStorage.removeItem('kids_store_admin_pin');
    });
  }
})();
