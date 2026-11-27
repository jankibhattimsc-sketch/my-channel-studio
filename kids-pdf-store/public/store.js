(function () {
  let storeSettings = {};
  let allBooks = [];
  let selectedAge = 'all';
  let selectedCat = 'all';
  let sortMode = 'featured';
  let searchTerm = '';
  let onlyFavs = false;
  let favIds = JSON.parse(localStorage.getItem('littlestars_favs') || '[]');

  const booksGrid = document.getElementById('books-grid');
  const heroShowcase = document.getElementById('hero-showcase');
  const ageFiltersEl = document.getElementById('age-filters');
  const catFiltersEl = document.getElementById('cat-filters');
  const sortSelectEl = document.getElementById('sort-select');
  const searchInputEl = document.getElementById('search-input');
  const booksCountLabel = document.getElementById('books-count-label');
  const btnFilterFavs = document.getElementById('btn-filter-favs');
  const favCountEl = document.getElementById('fav-count');
  const toastEl = document.getElementById('toast-box');

  const checkoutModal = document.getElementById('checkout-modal');
  const checkoutContent = document.getElementById('checkout-content');
  const sampleModal = document.getElementById('sample-modal');
  const sampleIframe = document.getElementById('sample-iframe');
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

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.style.display = 'block';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => { toastEl.style.display = 'none'; }, 2400);
  }

  function cur() {
    return storeSettings.currency || '₹';
  }

  function updateFavCount() {
    if (favCountEl) favCountEl.textContent = String(favIds.length);
  }

  async function loadStore() {
    updateFavCount();
    try {
      const res = await fetch('/api/store/public');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to load store');

      storeSettings = data.settings || {};
      allBooks = Array.isArray(data.books) ? data.books : [];

      document.title = `${storeSettings.storeName || 'LittleStars Kids PDF Store'} — Printable Kids E-Books`;
      document.getElementById('store-brand-name').textContent = storeSettings.storeName || 'LittleStars Kids PDF Store';
      document.getElementById('store-brand-tagline').textContent = storeSettings.tagline || '';
      document.getElementById('footer-text').textContent = `© ${new Date().getFullYear()} ${storeSettings.storeName || 'LittleStars Kids PDF Store'} • Instant Digital PDF Delivery • Printable A4 Editions`;

      const waEl = document.getElementById('top-wa-support');
      if (storeSettings.whatsappNumber) {
        const cleanWa = storeSettings.whatsappNumber.replace(/\D/g, '');
        waEl.href = `https://wa.me/${cleanWa}?text=${encodeURIComponent('Hi! I would like to know more about your Kids PDF Books.')}`;
        waEl.style.display = 'inline-flex';
      } else {
        waEl.style.display = 'none';
      }

      renderHeroShowcase();
      renderCategories();
      renderBooks();
      checkDeepLinkBook();
    } catch (err) {
      booksGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:#EF4444;">⚠️ Failed to load store: ${esc(err.message)}</div>`;
    }
  }

  function renderHeroShowcase() {
    if (!heroShowcase || !allBooks.length) return;
    const picks = allBooks.slice(0, 3);
    const positions = ['left', 'center', 'right'];
    const ordered = picks.length === 3 ? [picks[1], picks[0], picks[2]] : picks;
    heroShowcase.innerHTML = ordered.map((bk, idx) => `
      <div class="stack-card ${positions[idx] || 'center'}" data-hero-book="${esc(bk.id)}" title="${esc(bk.title)}">
        ${bk.coverUrl ? `<img src="${esc(bk.coverUrl)}" alt="${esc(bk.title)}" />` : `<div style="height:225px;display:grid;place-items:center;font-size:3rem;">📚</div>`}
      </div>
    `).join('');

    heroShowcase.querySelectorAll('[data-hero-book]').forEach(el => {
      el.addEventListener('click', () => {
        const bk = allBooks.find(x => x.id === el.getAttribute('data-hero-book'));
        if (bk) openBookModal(bk);
      });
    });

    const heroSampleBtn = document.getElementById('btn-hero-sample');
    if (heroSampleBtn && allBooks[0]) {
      heroSampleBtn.onclick = () => openSampleModal(allBooks[0]);
    }
  }

  function renderCategories() {
    const cats = ['all', ...new Set(allBooks.map(b => b.category).filter(Boolean))];
    catFiltersEl.innerHTML = cats.map(c => `
      <button class="chip ${c === selectedCat ? 'active' : ''}" data-cat="${esc(c)}">${c === 'all' ? '🌟 All Books' : esc(c)}</button>
    `).join('');

    catFiltersEl.querySelectorAll('.chip').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedCat = btn.getAttribute('data-cat');
        renderCategories();
        renderBooks();
      });
    });
  }

  ageFiltersEl.querySelectorAll('.age-card').forEach(btn => {
    btn.addEventListener('click', () => {
      ageFiltersEl.querySelectorAll('.age-card').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAge = btn.getAttribute('data-age');
      renderBooks();
    });
  });

  btnFilterFavs.addEventListener('click', () => {
    onlyFavs = !onlyFavs;
    btnFilterFavs.classList.toggle('active', onlyFavs);
    renderBooks();
  });

  sortSelectEl.addEventListener('change', () => {
    sortMode = sortSelectEl.value;
    renderBooks();
  });

  searchInputEl.addEventListener('input', () => {
    searchTerm = searchInputEl.value.trim().toLowerCase();
    renderBooks();
  });

  function renderBooks() {
    let filtered = allBooks.filter(b => {
      if (onlyFavs && !favIds.includes(b.id)) return false;
      if (selectedAge !== 'all' && b.ageGroup !== selectedAge) return false;
      if (selectedCat !== 'all' && b.category !== selectedCat) return false;
      if (searchTerm) {
        const hay = `${b.title} ${b.subtitle} ${b.category} ${b.description}`.toLowerCase();
        if (!hay.includes(searchTerm)) return false;
      }
      return true;
    });

    if (sortMode === 'price_asc') filtered.sort((a, b) => a.price - b.price);
    else if (sortMode === 'price_desc') filtered.sort((a, b) => b.price - a.price);
    else if (sortMode === 'newest') filtered.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    else filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    if (booksCountLabel) {
      booksCountLabel.textContent = `${filtered.length} book${filtered.length === 1 ? '' : 's'} available`;
    }

    if (!filtered.length) {
      booksGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px; background:#fff; border-radius:20px; border:1.5px solid #E2E8F0;">
        <div style="font-size:2.6rem;">📭</div>
        <h3 style="margin:8px 0;">No books match this filter</h3>
        <p style="color:#64748B;">Select "All Ages" or clear your search filter to view all workbooks.</p>
      </div>`;
      return;
    }

    booksGrid.innerHTML = filtered.map(b => {
      const off = b.mrp > b.price ? Math.round(((b.mrp - b.price) / b.mrp) * 100) : 0;
      const saveAmt = b.mrp > b.price ? (b.mrp - b.price) : 0;
      const bullets = (Array.isArray(b.highlights) ? b.highlights : []).slice(0, 2);
      const isFav = favIds.includes(b.id);

      return `
        <article class="book-card">
          <div class="book-cover-wrap" data-open-book="${esc(b.id)}">
            ${b.coverUrl ? `<img src="${esc(b.coverUrl)}" alt="${esc(b.title)}" />` : `<div style="display:grid;place-items:center;height:100%;font-size:4rem;">📘</div>`}
            ${off > 0 ? `<span class="badge-off">-${off}% OFF</span>` : ''}
            <button type="button" class="fav-btn" data-fav-id="${esc(b.id)}" title="Save to Favorites">${isFav ? '❤️' : '🤍'}</button>
            <span class="badge-age">👶 Ages ${esc(b.ageGroup)}</span>
          </div>
          <div class="book-body">
            <div class="book-meta-top">
              <span class="book-cat">${esc(b.category)}</span>
              <span class="book-stars">★★★★★ <span style="color:#64748B; font-weight:600;">4.9</span></span>
            </div>
            <h3 class="book-title">${esc(b.title)}</h3>
            <p class="book-sub">${esc(b.subtitle || b.description.slice(0, 75))}</p>
            ${bullets.length ? `
              <ul class="book-bullets">
                ${bullets.map(pt => `<li>✅ ${esc(pt)}</li>`).join('')}
              </ul>
            ` : '<div style="flex:1;"></div>'}
            <div class="price-row">
              <span class="price-now">${cur()}${b.price}</span>
              ${b.mrp > b.price ? `<span class="price-mrp">${cur()}${b.mrp}</span>` : ''}
              ${saveAmt > 0 ? `<span class="save-pill">Save ${cur()}${saveAmt}</span>` : ''}
              <span class="pages-tag">📄 ${b.pages} pgs</span>
            </div>
            <div class="card-actions">
              <button type="button" class="btn btn-outline" data-sample-book="${esc(b.id)}">👁️ Sample</button>
              <button type="button" class="btn btn-buy" data-buy-book="${esc(b.id)}">⚡ Buy ${cur()}${b.price}</button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    booksGrid.querySelectorAll('[data-fav-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-fav-id');
        if (favIds.includes(id)) {
          favIds = favIds.filter(x => x !== id);
          showToast('Removed from Saved Books');
        } else {
          favIds.push(id);
          showToast('Saved to Favorites ❤️');
        }
        localStorage.setItem('littlestars_favs', JSON.stringify(favIds));
        updateFavCount();
        renderBooks();
      });
    });

    booksGrid.querySelectorAll('[data-open-book]').forEach(el => {
      el.addEventListener('click', () => {
        const bk = allBooks.find(x => x.id === el.getAttribute('data-open-book'));
        if (bk) openBookModal(bk);
      });
    });
    booksGrid.querySelectorAll('[data-sample-book]').forEach(el => {
      el.addEventListener('click', () => {
        const bk = allBooks.find(x => x.id === el.getAttribute('data-sample-book'));
        if (bk) openSampleModal(bk);
      });
    });
    booksGrid.querySelectorAll('[data-buy-book]').forEach(el => {
      el.addEventListener('click', () => {
        const bk = allBooks.find(x => x.id === el.getAttribute('data-buy-book'));
        if (bk) openBookModal(bk, true);
      });
    });
  }

  function openSampleModal(book) {
    const sampleUrl = `/api/store/book/${encodeURIComponent(book.id)}/sample`;
    document.getElementById('sample-modal-title').textContent = `👀 Free Sample Preview: ${book.title}`;
    sampleIframe.src = sampleUrl;
    document.getElementById('sample-open-tab').href = sampleUrl;
    document.getElementById('sample-buy-now').onclick = () => {
      sampleModal.classList.remove('open');
      openBookModal(book, true);
    };
    sampleModal.classList.add('open');
  }

  function checkDeepLinkBook() {
    const m = window.location.pathname.match(/\/book\/([^/]+)/);
    const id = m ? m[1] : new URLSearchParams(window.location.search).get('book');
    if (id) {
      const bk = allBooks.find(x => x.id === id);
      if (bk) openBookModal(bk);
    }
  }

  function stepperHtml(step) {
    return `
      <div class="stepper">
        <div class="step-pill ${step === 1 ? 'active' : 'done'}">1. Your Details</div>
        <div class="step-pill ${step === 2 ? 'active' : (step > 2 ? 'done' : '')}">2. Payment (UPI / Link)</div>
        <div class="step-pill ${step === 3 ? 'active done' : ''}">3. PDF Download</div>
      </div>
    `;
  }

  function openBookModal(book, focusBuy = false) {
    const highlights = Array.isArray(book.highlights) && book.highlights.length
      ? `<ul style="margin:8px 0 14px; padding-left:18px; font-size:0.88rem; color:#334155; line-height:1.6;">
          ${book.highlights.map(h => `<li>${esc(h)}</li>`).join('')}
        </ul>`
      : '';

    checkoutContent.innerHTML = `
      ${stepperHtml(1)}
      <div style="display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap; margin-bottom:14px;">
        <img src="${esc(book.coverUrl)}" alt="" style="width:92px; height:118px; object-fit:cover; border-radius:12px; border:1px solid #E2E8F0; box-shadow:0 6px 14px rgba(0,0,0,0.08);" />
        <div style="flex:1; min-width:200px;">
          <div style="font-size:0.78rem; font-weight:800; color:#0284C7;">${esc(book.category)} • 👶 Ages ${esc(book.ageGroup)} • 📄 ${book.pages} Pages</div>
          <h2 style="margin:4px 0 6px; font-size:1.22rem;">${esc(book.title)}</h2>
          <div style="display:flex; align-items:baseline; gap:8px;">
            <span style="font-size:1.5rem; font-weight:900; color:#059669;">${cur()}${book.price}</span>
            ${book.mrp > book.price ? `<span style="color:#94A3B8; text-decoration:line-through; font-weight:700;">${cur()}${book.mrp}</span>` : ''}
          </div>
        </div>
      </div>

      ${!focusBuy ? `
        <p style="font-size:0.9rem; color:#475569; line-height:1.55; margin:0 0 8px;">${esc(book.description)}</p>
        ${highlights}
        <div style="margin-bottom:14px;">
          <button id="co-btn-preview-sample" type="button" class="btn btn-outline" style="width:100%;">👁️ Preview Free Sample PDF</button>
        </div>
      ` : ''}

      <div style="background:#F8FAFC; padding:16px; border-radius:16px; border:1.5px solid #E2E8F0;">
        <h3 style="margin:0 0 10px; font-size:1.02rem; color:#0F172A;">🛒 Parent Details (for Instant PDF Access)</h3>
        <div class="field">
          <label>Full Name *</label>
          <input id="co-name" type="text" placeholder="e.g. Priya Sharma" />
        </div>
        <div class="field">
          <label>WhatsApp / Mobile Number *</label>
          <input id="co-phone" type="tel" placeholder="e.g. 9876543210" />
        </div>
        <div class="field">
          <label>Email Address (Optional)</label>
          <input id="co-email" type="email" placeholder="example@gmail.com" />
        </div>
        <div id="co-err" style="color:#DC2626; font-size:0.84rem; font-weight:700; margin-bottom:8px; display:none;"></div>
        <button id="co-btn-proceed" class="btn btn-buy" style="width:100%; padding:13px; font-size:1rem;">
          💳 Continue to Payment (${cur()}${book.price})
        </button>
      </div>
    `;

    checkoutModal.classList.add('open');

    const prevBtn = document.getElementById('co-btn-preview-sample');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        checkoutModal.classList.remove('open');
        openSampleModal(book);
      });
    }

    document.getElementById('co-btn-proceed').addEventListener('click', async () => {
      const customerName = document.getElementById('co-name').value.trim();
      const customerPhone = document.getElementById('co-phone').value.trim();
      const customerEmail = document.getElementById('co-email').value.trim();
      const errEl = document.getElementById('co-err');
      if (!customerName || customerPhone.length < 8) {
        errEl.textContent = 'Please enter your full name and a valid mobile number.';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';
      const btn = document.getElementById('co-btn-proceed');
      btn.disabled = true;
      btn.textContent = '⏳ Preparing secure payment options...';

      try {
        const res = await fetch('/api/store/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId: book.id, customerName, customerPhone, customerEmail })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Could not create order.');
        renderPaymentStep(book, data.order, data.payment);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = `💳 Continue to Payment (${cur()}${book.price})`;
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
    const waText = encodeURIComponent(`Hi! I have ordered Kids PDF Book "${book.title}" (${payment.currency}${order.amount}).\nOrder Code: ${order.orderCode}\nName: ${order.customerName}`);

    checkoutContent.innerHTML = `
      ${stepperHtml(2)}
      <div style="text-align:center; margin-bottom:12px;">
        <div style="display:inline-block; background:#DCFCE7; color:#166534; font-weight:800; font-size:0.78rem; padding:4px 12px; border-radius:999px;">
          Order Code: ${esc(order.orderCode)}
        </div>
        <h2 style="margin:8px 0 4px; font-size:1.25rem;">Pay Amount: ${esc(payment.currency)}${order.amount}</h2>
        <div style="font-size:0.86rem; color:#475569;">${esc(book.title)}</div>
      </div>

      ${hasRzp ? `
        <button id="btn-rzp-pay" class="btn btn-primary" style="width:100%; padding:13px; margin-bottom:10px; font-size:0.98rem;">
          ⚡ Pay Instantly via Razorpay (Card / UPI / Netbanking)
        </button>
      ` : ''}

      ${hasLink ? `
        <a href="${esc(payment.paymentLink)}" target="_blank" rel="noopener" class="btn btn-pink" style="width:100%; padding:13px; margin-bottom:10px; font-size:0.98rem;">
          💳 Open Payment Link &amp; Pay Online ↗
        </a>
      ` : ''}

      ${hasUpi ? `
        <div class="qr-box">
          <div style="font-weight:900; color:#0284C7; margin-bottom:8px;">📱 Scan &amp; Pay with GPay / PhonePe / Paytm</div>
          <img src="${payment.qrDataUrl}" alt="UPI QR Code" />
          <div style="margin-top:8px; font-size:0.84rem; color:#334155;">
            UPI ID: <strong>${esc(payment.upiId)}</strong>
          </div>
          <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-top:10px;">
            <a href="${esc(payment.upiUri)}" class="btn btn-buy" style="font-size:0.86rem;">📲 Open UPI App (${esc(payment.currency)}${order.amount})</a>
            <button id="btn-copy-upi" type="button" class="btn btn-outline" style="font-size:0.84rem;">📋 Copy UPI ID</button>
          </div>
        </div>
      ` : ''}

      ${!hasUpi && !hasLink && !hasRzp ? `
        <div style="padding:14px; border-radius:12px; background:#FEF3C7; border:1.5px solid #F59E0B; color:#92400E; font-size:0.86rem; margin:10px 0;">
          ⚠️ Seller hasn't set a UPI ID or Payment Link in the Admin Settings yet. Note your Order Code below or contact store support.
        </div>
      ` : ''}

      <div style="background:#F8FAFC; padding:14px; border-radius:14px; border:1.5px solid #CBD5E1; margin-top:12px;">
        <div style="font-weight:900; font-size:0.92rem; margin-bottom:6px;">🔐 After Paying, Enter Your UTR / Transaction ID:</div>
        <div class="field" style="margin-bottom:8px;">
          <input id="co-utr" type="text" placeholder="Enter 12-digit UTR / UPI Reference No. (e.g. 433219876543)" />
        </div>
        <div id="co-pay-err" style="color:#DC2626; font-size:0.82rem; font-weight:700; margin-bottom:8px; display:none;"></div>
        <button id="co-btn-confirm-utr" class="btn btn-buy" style="width:100%; padding:12px; font-size:0.96rem;">
          ✅ Verify Payment &amp; Unlock PDF Now
        </button>
        ${sellerWa ? `
          <a href="https://wa.me/${sellerWa}?text=${waText}" target="_blank" class="btn btn-outline" style="width:100%; margin-top:8px; font-size:0.84rem; color:#15803D; border-color:#86EFAC;">
            💬 Send Payment Screenshot on WhatsApp
          </a>
        ` : ''}
      </div>
    `;

    const copyBtn = document.getElementById('btn-copy-upi');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(payment.upiId);
        copyBtn.textContent = '✓ Copied!';
        showToast('UPI ID copied to clipboard ✓');
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
        errEl.textContent = 'Please enter a valid UTR / Transaction Reference ID (at least 4 digits).';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';
      const btn = document.getElementById('co-btn-confirm-utr');
      btn.disabled = true;
      btn.textContent = '⏳ Unlocking your PDF...';

      try {
        const res = await fetch(`/api/store/orders/${encodeURIComponent(order.id)}/submit-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ utrNumber })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Submission failed');

        if (data.order.status === 'paid' && data.downloadUrl) {
          renderDownloadUnlocked(book, data.order, data.downloadUrl);
        } else {
          renderPendingVerification(book, data.order, payment.sellerWhatsapp);
        }
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = '✅ Verify Payment & Unlock PDF Now';
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
        name: storeSettings.storeName || 'LittleStars Kids PDF Store',
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
            showToast(vd.error || 'Payment verification failed');
          }
        }
      });
      rzp.open();
    } catch (err) {
      showToast('Razorpay error: ' + err.message);
    }
  }

  function renderDownloadUnlocked(book, order, downloadUrl) {
    checkoutContent.innerHTML = `
      ${stepperHtml(3)}
      <div style="text-align:center; padding:12px 6px;">
        <div style="font-size:3.5rem;">🎉</div>
        <h2 style="margin:6px 0; color:#059669;">Success! Your PDF Book Is Ready!</h2>
        <p style="font-size:0.9rem; color:#475569; margin:0 0 16px;">
          Order Code: <strong>${esc(order.orderCode)}</strong> • ${esc(book.title)}
        </p>
        <a href="${esc(downloadUrl)}" class="btn btn-buy" style="width:100%; padding:15px; font-size:1.06rem; margin-bottom:10px;">
          📥 Download PDF Book Now
        </a>
        <div style="font-size:0.8rem; color:#64748B;">
          Save your Order Code <b>${esc(order.orderCode)}</b> — you can re-download anytime via <b>"My Orders / Re-Download"</b>.
        </div>
      </div>
    `;
  }

  function renderPendingVerification(book, order, sellerWa) {
    const cleanWa = String(sellerWa || '').replace(/\D/g, '');
    const waText = encodeURIComponent(`Hi! I have completed payment for "${book.title}".\nOrder Code: ${order.orderCode}\nUTR: ${order.utrNumber}\nPlease approve my PDF download.`);
    checkoutContent.innerHTML = `
      ${stepperHtml(3)}
      <div style="text-align:center; padding:12px 6px;">
        <div style="font-size:3rem;">⏳</div>
        <h2 style="margin:8px 0; color:#0284C7;">Payment Details Submitted!</h2>
        <p style="font-size:0.9rem; color:#475569; line-height:1.55;">
          Order Code: <strong>${esc(order.orderCode)}</strong><br/>
          UTR Reference: <strong>${esc(order.utrNumber)}</strong><br/>
          Once verified by the seller, your download button unlocks inside <b>"My Orders / Re-Download"</b>!
        </p>
        ${cleanWa ? `
          <a href="https://wa.me/${cleanWa}?text=${waText}" target="_blank" class="btn btn-buy" style="width:100%; margin-top:10px;">
            💬 Notify Seller on WhatsApp for Instant Approval
          </a>
        ` : ''}
      </div>
    `;
  }

  document.querySelectorAll('#faq-list .faq-q').forEach(btn => {
    btn.addEventListener('click', () => btn.parentElement.classList.toggle('open'));
  });

  document.getElementById('btn-close-checkout').addEventListener('click', () => checkoutModal.classList.remove('open'));
  checkoutModal.addEventListener('click', (e) => { if (e.target === checkoutModal) checkoutModal.classList.remove('open'); });

  document.getElementById('btn-close-sample').addEventListener('click', () => {
    sampleModal.classList.remove('open');
    sampleIframe.src = 'about:blank';
  });
  sampleModal.addEventListener('click', (e) => {
    if (e.target === sampleModal) {
      sampleModal.classList.remove('open');
      sampleIframe.src = 'about:blank';
    }
  });

  document.getElementById('btn-open-orders').addEventListener('click', () => ordersModal.classList.add('open'));
  document.getElementById('btn-close-orders').addEventListener('click', () => ordersModal.classList.remove('open'));
  ordersModal.addEventListener('click', (e) => { if (e.target === ordersModal) ordersModal.classList.remove('open'); });

  document.getElementById('btn-do-lookup').addEventListener('click', async () => {
    const q = lookupInput.value.trim();
    if (!q) return;
    lookupResults.innerHTML = '<div style="color:#64748B;">Searching orders...</div>';
    try {
      const res = await fetch(`/api/store/orders/lookup?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const list = data.orders || [];
      if (!list.length) {
        lookupResults.innerHTML = '<div style="color:#EF4444; font-weight:700;">No orders found for this mobile number or Order Code.</div>';
        return;
      }
      lookupResults.innerHTML = list.map(o => `
        <div style="padding:12px; border-radius:12px; border:1.5px solid #E2E8F0; background:#F8FAFC;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <strong>${esc(o.orderCode)} — ${esc(o.bookTitle)}</strong>
            <span style="font-size:0.78rem; font-weight:800; padding:3px 9px; border-radius:999px; background:${o.status === 'paid' ? '#DCFCE7' : '#FEF3C7'}; color:${o.status === 'paid' ? '#166534' : '#92400E'};">
              ${o.status === 'paid' ? '✅ Paid' : '⏳ Pending'}
            </span>
          </div>
          <div style="font-size:0.82rem; color:#475569; margin:4px 0 8px;">Amount: ${cur()}${o.amount} ${o.utrNumber ? `• UTR: ${esc(o.utrNumber)}` : ''}</div>
          ${o.downloadUrl ? `<a href="${esc(o.downloadUrl)}" class="btn btn-buy" style="width:100%; padding:9px;">📥 Download PDF Book</a>` : ''}
        </div>
      `).join('');
    } catch (err) {
      lookupResults.innerHTML = `<div style="color:#EF4444;">Error: ${esc(err.message)}</div>`;
    }
  });

  loadStore();
})();
