(function () {
  let storeSettings = {};
  let allBooks = [];
  let selectedAge = 'all';
  let selectedCat = 'all';
  let searchTerm = '';

  const booksGrid = document.getElementById('books-grid');
  const ageFiltersEl = document.getElementById('age-filters');
  const catFiltersEl = document.getElementById('cat-filters');
  const searchInputEl = document.getElementById('search-input');

  const checkoutModal = document.getElementById('checkout-modal');
  const checkoutContent = document.getElementById('checkout-content');
  const ordersModal = document.getElementById('orders-modal');
  const lookupInput = document.getElementById('lookup-input');
  const lookupResults = document.getElementById('lookup-results');

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cur() {
    return storeSettings.currency || '₹';
  }

  async function loadStore() {
    try {
      const res = await fetch('/api/store/public');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load store');

      storeSettings = data.settings || {};
      allBooks = Array.isArray(data.books) ? data.books : [];

      document.title = `${storeSettings.storeName || 'Kids PDF Store'} — Online PDF Books`;
      document.getElementById('store-brand-name').textContent = storeSettings.storeName || 'LittleStars Kids PDF Store';
      document.getElementById('store-brand-tagline').textContent = storeSettings.tagline || '';
      document.getElementById('footer-text').textContent = `© ${new Date().getFullYear()} ${storeSettings.storeName || 'Kids PDF Store'} • Instant Digital PDF Delivery`;

      const waEl = document.getElementById('top-wa-support');
      if (storeSettings.whatsappNumber) {
        const cleanWa = storeSettings.whatsappNumber.replace(/\D/g, '');
        waEl.href = `https://wa.me/${cleanWa}?text=${encodeURIComponent('નમસ્તે! મને Kids PDF Book વિશે માહિતી જોઈએ છે.')}`;
        waEl.style.display = 'inline-flex';
      } else {
        waEl.style.display = 'none';
      }

      renderCategories();
      renderBooks();
      checkDeepLinkBook();
    } catch (err) {
      booksGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#ef4444;">⚠️ સ્ટોર લોડ કરવામાં ભૂલ: ${esc(err.message)}</div>`;
    }
  }

  function renderCategories() {
    const cats = ['all', ...new Set(allBooks.map(b => b.category).filter(Boolean))];
    catFiltersEl.innerHTML = `<span class="chip-label">📂 કેટેગરી:</span>` + cats.map(c => `
      <button class="chip ${c === selectedCat ? 'active' : ''}" data-cat="${esc(c)}">${c === 'all' ? 'બધી બુક્સ' : esc(c)}</button>
    `).join('');

    catFiltersEl.querySelectorAll('.chip').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedCat = btn.getAttribute('data-cat');
        renderCategories();
        renderBooks();
      });
    });
  }

  ageFiltersEl.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      ageFiltersEl.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAge = btn.getAttribute('data-age');
      renderBooks();
    });
  });

  searchInputEl.addEventListener('input', () => {
    searchTerm = searchInputEl.value.trim().toLowerCase();
    renderBooks();
  });

  function renderBooks() {
    const filtered = allBooks.filter(b => {
      if (selectedAge !== 'all' && b.ageGroup !== selectedAge) return false;
      if (selectedCat !== 'all' && b.category !== selectedCat) return false;
      if (searchTerm) {
        const hay = `${b.title} ${b.subtitle} ${b.category} ${b.description}`.toLowerCase();
        if (!hay.includes(searchTerm)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      booksGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px; background:#fff; border-radius:18px; border:1.5px solid #e2e8f0;">
        <div style="font-size:2.5rem;">📭</div>
        <h3 style="margin:8px 0;">આ ફિલ્ટર મુજબ કોઈ બુક મળી નથી</h3>
        <p style="color:#64748b;">બધી બુક્સ જોવા માટે ફિલ્ટર બદલો.</p>
      </div>`;
      return;
    }

    booksGrid.innerHTML = filtered.map(b => {
      const off = b.mrp > b.price ? Math.round(((b.mrp - b.price) / b.mrp) * 100) : 0;
      return `
        <article class="book-card">
          <div class="book-cover-wrap" data-open-book="${esc(b.id)}">
            ${b.coverUrl ? `<img src="${esc(b.coverUrl)}" alt="${esc(b.title)}" />` : `<div style="display:grid;place-items:center;height:100%;font-size:4rem;">📘</div>`}
            ${off > 0 ? `<span class="badge-off">${off}% OFF</span>` : ''}
            <span class="badge-age">👶 ${esc(b.ageGroup)} વર્ષ</span>
          </div>
          <div class="book-body">
            <div class="book-cat">${esc(b.category)} ${b.featured ? '• ⭐ લોકપ્રિય' : ''}</div>
            <h3 class="book-title">${esc(b.title)}</h3>
            <p class="book-sub">${esc(b.subtitle || b.description.slice(0, 80))}</p>
            <div class="price-row">
              <span class="price-now">${cur()}${b.price}</span>
              ${b.mrp > b.price ? `<span class="price-mrp">${cur()}${b.mrp}</span>` : ''}
              <span class="pages-tag">📄 ${b.pages} પેજ</span>
            </div>
            <div class="card-actions">
              <a href="/api/store/book/${esc(b.id)}/sample" target="_blank" class="btn btn-outline">👀 સેમ્પલ</a>
              <button class="btn btn-buy" data-buy-book="${esc(b.id)}">⚡ Buy ${cur()}${b.price}</button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    booksGrid.querySelectorAll('[data-open-book]').forEach(el => {
      el.addEventListener('click', () => {
        const bk = allBooks.find(x => x.id === el.getAttribute('data-open-book'));
        if (bk) openBookModal(bk);
      });
    });
    booksGrid.querySelectorAll('[data-buy-book]').forEach(el => {
      el.addEventListener('click', () => {
        const bk = allBooks.find(x => x.id === el.getAttribute('data-buy-book'));
        if (bk) openBookModal(bk, true);
      });
    });
  }

  function checkDeepLinkBook() {
    const m = window.location.pathname.match(/\/book\/([^/]+)/);
    const id = m ? m[1] : new URLSearchParams(window.location.search).get('book');
    if (id) {
      const bk = allBooks.find(x => x.id === id);
      if (bk) openBookModal(bk);
    }
  }

  function openBookModal(book, focusBuy = false) {
    const highlights = Array.isArray(book.highlights) && book.highlights.length
      ? `<ul style="margin:8px 0 14px; padding-left:18px; font-size:0.88rem; color:#334155; line-height:1.6;">
          ${book.highlights.map(h => `<li>${esc(h)}</li>`).join('')}
        </ul>`
      : '';

    checkoutContent.innerHTML = `
      <div style="display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap; margin-bottom:14px;">
        <img src="${esc(book.coverUrl)}" alt="" style="width:92px; height:118px; object-fit:cover; border-radius:12px; border:1px solid #e2e8f0;" />
        <div style="flex:1; min-width:200px;">
          <div style="font-size:0.78rem; font-weight:800; color:#0284c7;">${esc(book.category)} • 👶 ${esc(book.ageGroup)} વર્ષ • 📄 ${book.pages} પેજ</div>
          <h2 style="margin:4px 0 6px; font-size:1.18rem;">${esc(book.title)}</h2>
          <div style="display:flex; align-items:baseline; gap:8px;">
            <span style="font-size:1.45rem; font-weight:900; color:#059669;">${cur()}${book.price}</span>
            ${book.mrp > book.price ? `<span style="color:#94a3b8; text-decoration:line-through; font-weight:700;">${cur()}${book.mrp}</span>` : ''}
          </div>
        </div>
      </div>

      ${!focusBuy ? `
        <p style="font-size:0.9rem; color:#475569; line-height:1.55; margin:0 0 8px;">${esc(book.description)}</p>
        ${highlights}
        <div style="margin-bottom:16px;">
          <a href="/api/store/book/${esc(book.id)}/sample" target="_blank" class="btn btn-outline" style="width:100%;">👀 ફ્રી Sample PDF પેજ જુઓ</a>
        </div>
      ` : ''}

      <div style="background:#f8fafc; padding:16px; border-radius:16px; border:1.5px solid #e2e8f0;">
        <h3 style="margin:0 0 10px; font-size:1rem; color:#0f172a;">🛒 સ્ટેપ ૧: તમારી વિગત લખો (PDF મેળવવા માટે)</h3>
        <div class="field">
          <label>તમારું પૂરું નામ *</label>
          <input id="co-name" type="text" placeholder="દા.ત. રાજેશભાઈ પટેલ" />
        </div>
        <div class="field">
          <label>WhatsApp મોબાઇલ નંબર *</label>
          <input id="co-phone" type="tel" placeholder="દા.ત. 9876543210" />
        </div>
        <div class="field">
          <label>ઈમેઇલ (વૈકલ્પિક)</label>
          <input id="co-email" type="email" placeholder="example@gmail.com" />
        </div>
        <div id="co-err" style="color:#dc2626; font-size:0.84rem; font-weight:700; margin-bottom:8px; display:none;"></div>
        <button id="co-btn-proceed" class="btn btn-buy" style="width:100%; padding:13px; font-size:1rem;">
          💳 આગળ વધો → ચૂકવણી કરો (${cur()}${book.price})
        </button>
      </div>
    `;

    checkoutModal.classList.add('open');

    document.getElementById('co-btn-proceed').addEventListener('click', async () => {
      const customerName = document.getElementById('co-name').value.trim();
      const customerPhone = document.getElementById('co-phone').value.trim();
      const customerEmail = document.getElementById('co-email').value.trim();
      const errEl = document.getElementById('co-err');
      if (!customerName || customerPhone.length < 8) {
        errEl.textContent = 'કૃપા કરીને તમારું નામ અને સાચો મોબાઇલ નંબર લખો.';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';
      const btn = document.getElementById('co-btn-proceed');
      btn.disabled = true;
      btn.textContent = '⏳ પેમેન્ટ લિંક તૈયાર થઈ રહી છે...';

      try {
        const res = await fetch('/api/store/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: book.id, customerName, customerPhone, customerEmail })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'ઓર્ડર બનવામાં ભૂલ આવી.');
        renderPaymentStep(book, data.order, data.payment);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = `💳 આગળ વધો → ચૂકવણી કરો (${cur()}${book.price})`;
      }
    });
  }

  function renderPaymentStep(book, order, payment) {
    if (order.status === 'paid' && order.downloadToken) {
      renderDownloadUnlocked(book, order, `/api/store/download/${order.downloadToken}`);
      return;
    }

    const hasUpi = Boolean(payment.upiId && payment.qrDataUrl);
    const hasLink = Boolean(payment.paymentLink);
    const hasRzp = Boolean(payment.hasRazorpay && payment.razorpayKeyId);
    const sellerWa = (payment.sellerWhatsapp || '').replace(/\D/g, '');
    const waText = encodeURIComponent(`નમસ્તે! મેં Kids PDF Book "${book.title}" (${payment.currency}${order.amount}) નો ઓર્ડર કર્યો છે.\nOrder Code: ${order.orderCode}\nનામ: ${order.customerName}`);

    checkoutContent.innerHTML = `
      <div style="text-align:center; margin-bottom:12px;">
        <div style="display:inline-block; background:#dcfce7; color:#166534; font-weight:800; font-size:0.78rem; padding:4px 12px; border-radius:999px;">
          Order Code: ${esc(order.orderCode)}
        </div>
        <h2 style="margin:8px 0 4px; font-size:1.2rem;">ચૂકવણી કરો: ${esc(payment.currency)}${order.amount}</h2>
        <div style="font-size:0.86rem; color:#475569;">${esc(book.title)}</div>
      </div>

      ${hasRzp ? `
        <button id="btn-rzp-pay" class="btn btn-primary" style="width:100%; padding:13px; margin-bottom:10px; font-size:0.98rem;">
          ⚡ Razorpay (Card / UPI / Netbanking) વડે તુરંત ચૂકવો
        </button>
      ` : ''}

      ${hasLink ? `
        <a href="${esc(payment.paymentLink)}" target="_blank" rel="noopener" class="btn btn-pink" style="width:100%; padding:13px; margin-bottom:10px; font-size:0.98rem;">
          💳 Payment Link ખોલીને Online ચૂકવણી કરો ↗
        </a>
      ` : ''}

      ${hasUpi ? `
        <div class="qr-box">
          <div style="font-weight:900; color:#0284c7; margin-bottom:8px;">📱 GPay / PhonePe / Paytm થી QR સ્કેન કરો</div>
          <img src="${payment.qrDataUrl}" alt="UPI QR Code" />
          <div style="margin-top:8px; font-size:0.84rem; color:#334155;">
            UPI ID: <strong>${esc(payment.upiId)}</strong>
          </div>
          <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-top:10px;">
            <a href="${esc(payment.upiUri)}" class="btn btn-buy" style="font-size:0.86rem;">📲 UPI App સીધી ખોલો (₹${order.amount})</a>
            <button id="btn-copy-upi" type="button" class="btn btn-outline" style="font-size:0.84rem;">📋 UPI ID કોપી</button>
          </div>
        </div>
      ` : ''}

      ${!hasUpi && !hasLink && !hasRzp ? `
        <div style="padding:14px; border-radius:12px; background:#fef3c7; border:1.5px solid #f59e0b; color:#92400e; font-size:0.86rem; margin:10px 0;">
          ⚠️ Seller એ હજી UPI ID અથવા Payment Link Admin Panel માં સેટ કરેલ નથી. નીચે Order નંબર નોંધી લો અથવા Seller નો સંપર્ક કરો.
        </div>
      ` : ''}

      <div style="background:#f8fafc; padding:14px; border-radius:14px; border:1.5px solid #cbd5e1; margin-top:12px;">
        <div style="font-weight:900; font-size:0.92rem; margin-bottom:6px;">🔐 સ્ટેપ ૨: પેમેન્ટ કર્યા પછી UTR / Transaction ID નાખો:</div>
        <div class="field" style="margin-bottom:8px;">
          <input id="co-utr" type="text" placeholder="૧૨ અંકનો UTR / UPI Ref No. નાખો (દા.ત. 433219876543)" />
        </div>
        <div id="co-pay-err" style="color:#dc2626; font-size:0.82rem; font-weight:700; margin-bottom:8px; display:none;"></div>
        <button id="co-btn-confirm-utr" class="btn btn-buy" style="width:100%; padding:12px; font-size:0.96rem;">
          ✅ પેમેન્ટ કન્ફર્મ કરો &amp; PDF મેળવો
        </button>
        ${sellerWa ? `
          <a href="https://wa.me/${sellerWa}?text=${waText}" target="_blank" class="btn btn-outline" style="width:100%; margin-top:8px; font-size:0.84rem; color:#15803d; border-color:#86efac;">
            💬 WhatsApp પર પેમેન્ટ સ્ક્રીનશોટ મોકલો
          </a>
        ` : ''}
      </div>
    `;

    const copyBtn = document.getElementById('btn-copy-upi');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(payment.upiId);
        copyBtn.textContent = '✓ કોપી થયું!';
      });
    }

    const rzpBtn = document.getElementById('btn-rzp-pay');
    if (rzpBtn) {
      rzpBtn.addEventListener('click', () => launchRazorpay(book, order));
    }

    document.getElementById('co-btn-confirm-utr').addEventListener('click', async () => {
      const utrNumber = document.getElementById('co-utr').value.trim();
      const errEl = document.getElementById('co-pay-err');
      if (utrNumber.length < 4) {
        errEl.textContent = 'કૃપા કરીને ઓછામાં ઓછો ૪ અંકનો સાચો UTR / Transaction નંબર નાખો.';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';
      const btn = document.getElementById('co-btn-confirm-utr');
      btn.disabled = true;
      btn.textContent = '⏳ ચકાસી રહ્યું છે...';

      try {
        const res = await fetch(`/api/store/orders/${encodeURIComponent(order.id)}/submit-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ utrNumber })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'સબમિટ કરવામાં ભૂલ આવી');

        if (data.order.status === 'paid' && data.downloadUrl) {
          renderDownloadUnlocked(book, data.order, data.downloadUrl);
        } else {
          renderPendingVerification(book, data.order, payment.sellerWhatsapp);
        }
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = '✅ પેમેન્ટ કન્ફર્મ કરો & PDF મેળવો';
      }
    });
  }

  async function launchRazorpay(book, order) {
    try {
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
          s.onload = resolve;
          s.onerror = () => reject(new Error('Razorpay script failed to load'));
          document.head.appendChild(s);
        });
      }
      const res = await fetch('/api/store/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.razorpayOrder.amount,
        currency: 'INR',
        name: storeSettings.storeName || 'Kids PDF Store',
        description: book.title,
        order_id: data.razorpayOrder.id,
        prefill: { name: order.customerName, contact: order.customerPhone, email: order.customerEmail },
        handler: async (resp) => {
          const vr = await fetch('/api/store/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: order.id, ...resp })
          });
          const vd = await vr.json();
          if (vd.success && vd.downloadUrl) {
            renderDownloadUnlocked(book, vd.order, vd.downloadUrl);
          } else {
            alert(vd.error || 'Payment verification failed');
          }
        }
      });
      rzp.open();
    } catch (err) {
      alert('Razorpay ભૂલ: ' + err.message);
    }
  }

  function renderDownloadUnlocked(book, order, downloadUrl) {
    checkoutContent.innerHTML = `
      <div style="text-align:center; padding:12px 6px;">
        <div style="font-size:3.5rem;">🎉</div>
        <h2 style="margin:6px 0; color:#059669;">અભિનંદન! તમારી PDF બુક તૈયાર છે!</h2>
        <p style="font-size:0.9rem; color:#475569; margin:0 0 14px;">
          Order Code: <strong>${esc(order.orderCode)}</strong> • ${esc(book.title)}
        </p>
        <a href="${esc(downloadUrl)}" class="btn btn-buy" style="width:100%; padding:15px; font-size:1.06rem; margin-bottom:10px;">
          📥 અત્યારે જ PDF બુક ડાઉનલોડ કરો
        </a>
        <div style="font-size:0.8rem; color:#64748b;">
          તમે કોઈ પણ સમયે <b>"📦 મારો ઓર્ડર"</b> માં જઈને Order Code <b>${esc(order.orderCode)}</b> અથવા તમારો મોબાઇલ નંબર નાખીને ફરી ડાઉનલોડ કરી શકશો.
        </div>
      </div>
    `;
  }

  function renderPendingVerification(book, order, sellerWa) {
    const cleanWa = String(sellerWa || '').replace(/\D/g, '');
    const waText = encodeURIComponent(`નમસ્તે! મેં "${book.title}" માટે પેમેન્ટ કર્યું છે.\nOrder Code: ${order.orderCode}\nUTR: ${order.utrNumber}\nકૃપા કરીને PDF એપ્રુવ કરો.`);
    checkoutContent.innerHTML = `
      <div style="text-align:center; padding:12px 6px;">
        <div style="font-size:3rem;">⏳</div>
        <h2 style="margin:8px 0; color:#0284c7;">પેમેન્ટ વિગત મળી ગઈ છે!</h2>
        <p style="font-size:0.9rem; color:#475569; line-height:1.55;">
          Order Code: <strong>${esc(order.orderCode)}</strong><br/>
          UTR Ref: <strong>${esc(order.utrNumber)}</strong><br/>
          Seller પેમેન્ટ ચકાસીને મંજૂર કરે એટલે તરત જ <b>"📦 મારો ઓર્ડર / PDF શોધો"</b> માં તમારી PDF ડાઉનલોડ લિંક ખૂલી જશે!
        </p>
        ${cleanWa ? `
          <a href="https://wa.me/${cleanWa}?text=${waText}" target="_blank" class="btn btn-buy" style="width:100%; margin-top:10px;">
            💬 Seller ને WhatsApp પર તરત જણાવો
          </a>
        ` : ''}
      </div>
    `;
  }

  document.getElementById('btn-close-checkout').addEventListener('click', () => checkoutModal.classList.remove('open'));
  checkoutModal.addEventListener('click', (e) => { if (e.target === checkoutModal) checkoutModal.classList.remove('open'); });

  document.getElementById('btn-open-orders').addEventListener('click', () => ordersModal.classList.add('open'));
  document.getElementById('btn-close-orders').addEventListener('click', () => ordersModal.classList.remove('open'));
  ordersModal.addEventListener('click', (e) => { if (e.target === ordersModal) ordersModal.classList.remove('open'); });

  document.getElementById('btn-do-lookup').addEventListener('click', async () => {
    const q = lookupInput.value.trim();
    if (!q) return;
    lookupResults.innerHTML = '<div style="color:#64748b;">શોધી રહ્યું છે...</div>';
    try {
      const res = await fetch(`/api/store/orders/lookup?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const list = data.orders || [];
      if (!list.length) {
        lookupResults.innerHTML = '<div style="color:#ef4444; font-weight:700;">આ નંબર કે કોડ પર કોઈ ઓર્ડર મળ્યો નથી.</div>';
        return;
      }
      lookupResults.innerHTML = list.map(o => `
        <div style="padding:12px; border-radius:12px; border:1.5px solid #e2e8f0; background:#f8fafc;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <strong>${esc(o.orderCode)} — ${esc(o.bookTitle)}</strong>
            <span style="font-size:0.78rem; font-weight:800; padding:3px 9px; border-radius:999px; background:${o.status === 'paid' ? '#dcfce7' : '#fef3c7'}; color:${o.status === 'paid' ? '#166534' : '#92400e'};">
              ${o.status === 'paid' ? '✅ Paid' : '⏳ Pending'}
            </span>
          </div>
          <div style="font-size:0.82rem; color:#475569; margin:4px 0 8px;">રકમ: ${cur()}${o.amount} ${o.utrNumber ? `• UTR: ${esc(o.utrNumber)}` : ''}</div>
          ${o.downloadUrl ? `<a href="${esc(o.downloadUrl)}" class="btn btn-buy" style="width:100%; padding:9px;">📥 PDF બુક ડાઉનલોડ કરો</a>` : ''}
        </div>
      `).join('');
    } catch (err) {
      lookupResults.innerHTML = `<div style="color:#ef4444;">ભૂલ: ${esc(err.message)}</div>`;
    }
  });

  loadStore();
})();
