(function () {
  let storeSettings = {};
  let worksheets = [];
  let savedFeedback = [];
  let activeFilter = { type: 'all', value: '' };

  const gridEl = document.getElementById('worksheets-grid');
  const activeBarEl = document.getElementById('active-filter-bar');
  const activeTextEl = document.getElementById('active-filter-text');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');
  const subDrawerEl = document.getElementById('subfilter-drawer');
  const searchForm = document.getElementById('ws-search-form');
  const searchInput = document.getElementById('ws-search-input');

  const previewModal = document.getElementById('preview-modal');
  const previewIframe = document.getElementById('preview-iframe');
  const previewTitleEl = document.getElementById('preview-modal-title');
  const previewTabLink = document.getElementById('preview-newtab-link');
  const previewDownloadBtn = document.getElementById('preview-download-btn');

  const checkoutModal = document.getElementById('checkout-modal');
  const checkoutBody = document.getElementById('checkout-body');

  const feedbackModal = document.getElementById('feedback-modal');
  const feedbackForm = document.getElementById('feedback-form');
  const feedbackGrid = document.getElementById('feedback-grid');

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

  async function init() {
    try {
      const res = await fetch('/api/store/public');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not load worksheets');
      storeSettings = data.settings || {};
      worksheets = Array.isArray(data.books) ? data.books : [];
      savedFeedback = Array.isArray(data.feedback) ? data.feedback : [];

      renderWorksheets();
      renderFeedback();
      checkDeepLink();
    } catch (err) {
      gridEl.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#B91C1C;">Failed to load worksheets: ${esc(err.message)}</p>`;
    }
  }

  function applyFilter(type, value) {
    activeFilter = { type, value };
    renderWorksheets();
    document.getElementById('worksheets')?.scrollIntoView({ behavior: 'smooth' });
  }

  function renderWorksheets() {
    let list = worksheets;
    if (activeFilter.type === 'search' && activeFilter.value) {
      const q = activeFilter.value.toLowerCase();
      list = worksheets.filter(w =>
        `${w.title} ${w.subtitle} ${w.learningGoal} ${w.category} ${w.learningNeed} ${w.skillArea}`.toLowerCase().includes(q)
      );
      activeTextEl.textContent = `Search results for "${activeFilter.value}" (${list.length})`;
      activeBarEl.classList.add('open');
    } else if (activeFilter.type === 'age') {
      list = worksheets.filter(w => w.ageGroup === activeFilter.value || (activeFilter.value === '3-6' && ['3-5', '4-6', '3-6'].includes(w.ageGroup)));
      activeTextEl.textContent = `Filtered by Age: ${activeFilter.value} Years (${list.length})`;
      activeBarEl.classList.add('open');
    } else if (activeFilter.type === 'need') {
      list = worksheets.filter(w => (w.learningNeed || '').toLowerCase() === activeFilter.value.toLowerCase());
      activeTextEl.textContent = `Filtered by Learning Need: ${activeFilter.value} (${list.length})`;
      activeBarEl.classList.add('open');
    } else if (activeFilter.type === 'skill') {
      list = worksheets.filter(w => (w.skillArea || '').toLowerCase() === activeFilter.value.toLowerCase());
      activeTextEl.textContent = `Filtered by Skill: ${activeFilter.value} (${list.length})`;
      activeBarEl.classList.add('open');
    } else if (activeFilter.type === 'activity') {
      list = worksheets.filter(w => (w.category || '').toLowerCase().includes(activeFilter.value.toLowerCase()));
      activeTextEl.textContent = `Filtered by Activity: ${activeFilter.value} (${list.length})`;
      activeBarEl.classList.add('open');
    } else {
      activeBarEl.classList.remove('open');
    }

    if (!list.length) {
      gridEl.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:36px; background:#FFFFFF; border-radius:18px; border:1px solid #E2E8F0;">
          <h3 style="margin-bottom:8px;">No matching worksheets found</h3>
          <p style="color:#687789; margin:0 0 16px;">Try another keyword or reset to see all popular printable worksheets.</p>
          <button type="button" id="empty-reset-btn" class="btn btn-primary">Show All Worksheets</button>
        </div>
      `;
      document.getElementById('empty-reset-btn')?.addEventListener('click', clearAllFilters);
      return;
    }

    gridEl.innerHTML = list.map(ws => {
      const isFree = Number(ws.price) === 0;
      const badgeHtml = isFree
        ? `<span class="badge-free"><span aria-hidden="true">✓</span> Free</span>`
        : `<span class="badge-free" style="background:#FFF2C9; color:#26384A;">${cur()}${ws.price} PDF</span>`;

      return `
        <article class="ws-card">
          <div class="ws-thumb-wrap">
            <img src="${esc(ws.coverUrl)}" alt="${esc(ws.title)} printable worksheet thumbnail" loading="lazy" />
          </div>
          <div class="ws-body">
            <div class="ws-badge-row">
              ${badgeHtml}
              <span class="badge-pages">📄 ${ws.pages} PDF Pages</span>
            </div>
            <h3 class="ws-title">${esc(ws.title)}</h3>
            <div class="ws-meta">
              <div><strong>Suggested Age:</strong> ${esc(ws.ageGroup)} Years</div>
              <div><strong>Learning Goal:</strong> ${esc(ws.learningGoal || ws.subtitle)}</div>
            </div>
            <div class="ws-actions">
              <button type="button" class="btn btn-outline" data-preview-id="${esc(ws.id)}" aria-label="Preview ${esc(ws.title)} PDF">Preview</button>
              ${isFree
                ? `<a href="/api/store/book/${esc(ws.id)}/download" class="btn btn-success" download aria-label="Download ${esc(ws.title)} PDF">Download</a>`
                : `<button type="button" class="btn btn-success" data-buy-id="${esc(ws.id)}">Download (${cur()}${ws.price})</button>`}
            </div>
          </div>
        </article>
      `;
    }).join('');

    gridEl.querySelectorAll('[data-preview-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ws = worksheets.find(x => x.id === btn.getAttribute('data-preview-id'));
        if (ws) openPreview(ws);
      });
    });
    gridEl.querySelectorAll('[data-buy-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ws = worksheets.find(x => x.id === btn.getAttribute('data-buy-id'));
        if (ws) openPaidCheckout(ws);
      });
    });
  }

  function clearAllFilters() {
    activeFilter = { type: 'all', value: '' };
    searchInput.value = '';
    subDrawerEl.classList.remove('open');
    document.querySelectorAll('.search-suggestions .chip-btn').forEach(c => c.classList.remove('active'));
    renderWorksheets();
  }
  clearFiltersBtn.addEventListener('click', clearAllFilters);

  // Header nav active indicator + mobile drawer
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  hamburgerBtn.addEventListener('click', () => {
    const isOpen = mobileDrawer.classList.toggle('open');
    hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
  });

  document.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', () => {
      const target = link.getAttribute('data-nav');
      document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.getAttribute('data-nav') === target));
      mobileDrawer.classList.remove('open');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
    });
  });

  document.getElementById('header-search-btn').addEventListener('click', () => {
    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => searchInput.focus(), 250);
  });

  // Search form & suggestions
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) {
      clearAllFilters();
      return;
    }
    applyFilter('search', q);
  });

  document.querySelectorAll('[data-suggest]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-suggest]').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const term = btn.getAttribute('data-suggest');
      searchInput.value = term;
      applyFilter('search', term);
    });
  });

  // Section 4: Explore by Category 4 cards -> subfilter drawer
  const SUB_OPTIONS = {
    age: { label: 'Choose Age Group:', items: ['3-5', '4-6', '3-6', '4-8', '5-8'], suffix: ' Years' },
    need: { label: 'Choose Learning Need:', items: ['Autism Support', 'ADHD Activities', 'Learning Disability', 'Communication & Language', 'Fine Motor Skills', 'Social & Emotional Learning'], suffix: '' },
    skill: { label: 'Choose Skill Focus:', items: ['Motor', 'Focus', 'Communication'], suffix: '' },
    activity: { label: 'Choose Activity Type:', items: ['Tracing', 'Matching', 'Coloring'], suffix: '' }
  };

  document.querySelectorAll('[data-cat-group]').forEach(card => {
    card.addEventListener('click', () => {
      const grp = card.getAttribute('data-cat-group');
      const cfg = SUB_OPTIONS[grp];
      if (!cfg) return;
      subDrawerEl.innerHTML = `<span class="suggest-label">${esc(cfg.label)}</span>` +
        cfg.items.map(val => `<button type="button" class="chip-btn" data-sub-val="${esc(val)}">${esc(val)}${esc(cfg.suffix)}</button>`).join('') +
        `<button type="button" class="chip-btn" id="sub-reset-btn">Show All</button>`;
      subDrawerEl.classList.add('open');

      subDrawerEl.querySelectorAll('[data-sub-val]').forEach(btn => {
        btn.addEventListener('click', () => {
          subDrawerEl.querySelectorAll('[data-sub-val]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          applyFilter(grp, btn.getAttribute('data-sub-val'));
        });
      });
      subDrawerEl.querySelector('#sub-reset-btn')?.addEventListener('click', clearAllFilters);
    });
  });

  // Section 5: Learning Needs 6 cards
  document.querySelectorAll('[data-need-filter]').forEach(card => {
    card.addEventListener('click', () => {
      applyFilter('need', card.getAttribute('data-need-filter'));
    });
  });

  // Preview modal
  function openPreview(ws) {
    const sampleUrl = `/api/store/book/${encodeURIComponent(ws.id)}/sample`;
    previewTitleEl.textContent = `Preview: ${ws.title} (${ws.pages} PDF Pages)`;
    previewIframe.src = sampleUrl;
    previewTabLink.href = sampleUrl;
    if (Number(ws.price) === 0) {
      previewDownloadBtn.href = `/api/store/book/${encodeURIComponent(ws.id)}/download`;
      previewDownloadBtn.textContent = 'Download Free PDF';
      previewDownloadBtn.setAttribute('download', '');
      previewDownloadBtn.onclick = null;
    } else {
      previewDownloadBtn.href = '#';
      previewDownloadBtn.textContent = `Download (${cur()}${ws.price})`;
      previewDownloadBtn.removeAttribute('download');
      previewDownloadBtn.onclick = (e) => {
        e.preventDefault();
        closePreview();
        openPaidCheckout(ws);
      };
    }
    previewModal.classList.add('open');
  }

  function closePreview() {
    previewModal.classList.remove('open');
    previewIframe.src = 'about:blank';
  }
  document.getElementById('close-preview-btn').addEventListener('click', closePreview);
  previewModal.addEventListener('click', (e) => { if (e.target === previewModal) closePreview(); });

  // Paid Checkout Modal (for optional priced bundles configured in /admin)
  function openPaidCheckout(ws) {
    checkoutBody.innerHTML = `
      <p style="margin-top:0; color:#687789;">Complete your details for <strong>${esc(ws.title)}</strong> (${cur()}${ws.price}).</p>
      <div class="field"><label for="co-name">Full Name *</label><input id="co-name" type="text" placeholder="e.g. Sarah Patel" /></div>
      <div class="field"><label for="co-phone">Mobile / WhatsApp Number *</label><input id="co-phone" type="tel" placeholder="e.g. 9876543210" /></div>
      <div id="co-err" style="color:#B91C1C; font-weight:700; margin-bottom:10px; display:none;"></div>
      <button id="co-next-btn" type="button" class="btn btn-primary" style="width:100%;">Continue to Payment (${cur()}${ws.price})</button>
    `;
    checkoutModal.classList.add('open');
    document.getElementById('co-next-btn').addEventListener('click', async () => {
      const name = document.getElementById('co-name').value.trim();
      const phone = document.getElementById('co-phone').value.trim();
      const errEl = document.getElementById('co-err');
      if (!name || phone.length < 8) {
        errEl.textContent = 'Please enter your name and valid mobile number.';
        errEl.style.display = 'block';
        return;
      }
      const res = await fetch('/api/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: ws.id, customerName: name, customerPhone: phone })
      });
      const data = await res.json();
      if (!data.success) {
        errEl.textContent = data.error || 'Could not start order.';
        errEl.style.display = 'block';
        return;
      }
      renderPaidStep(ws, data.order, data.payment);
    });
  }

  function renderPaidStep(ws, order, payment) {
    checkoutBody.innerHTML = `
      <p style="margin-top:0;">Order <strong>${esc(order.orderCode)}</strong> • Amount: <strong>${esc(payment.currency)}${order.amount}</strong></p>
      ${payment.paymentLink ? `<a href="${esc(payment.paymentLink)}" target="_blank" rel="noopener" class="btn btn-primary" style="width:100%; margin-bottom:10px;">Open Payment Link</a>` : ''}
      ${payment.upiId && payment.qrDataUrl ? `
        <div class="qr-box">
          <p style="margin:0 0 8px; font-weight:700;">Scan &amp; Pay with UPI</p>
          <img src="${payment.qrDataUrl}" alt="UPI QR Code for ${esc(ws.title)}" />
          <p style="margin:8px 0 0;">UPI ID: <strong>${esc(payment.upiId)}</strong></p>
        </div>
      ` : ''}
      <div class="field"><label for="co-utr">Transaction / UTR Reference *</label><input id="co-utr" type="text" placeholder="Enter transaction ID after payment" /></div>
      <div id="co-utr-err" style="color:#B91C1C; font-weight:700; margin-bottom:10px; display:none;"></div>
      <button id="co-unlock-btn" type="button" class="btn btn-success" style="width:100%;">Verify &amp; Download PDF</button>
    `;
    document.getElementById('co-unlock-btn').addEventListener('click', async () => {
      const utr = document.getElementById('co-utr').value.trim();
      const errEl = document.getElementById('co-utr-err');
      const res = await fetch(`/api/store/orders/${encodeURIComponent(order.id)}/submit-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utrNumber: utr })
      });
      const data = await res.json();
      if (!data.success) {
        errEl.textContent = data.error || 'Verification failed.';
        errEl.style.display = 'block';
        return;
      }
      if (data.downloadUrl) {
        checkoutBody.innerHTML = `
          <div style="text-align:center; padding:12px 0;">
            <h3>Your PDF Is Ready</h3>
            <p>Order Code: <strong>${esc(order.orderCode)}</strong></p>
            <a href="${esc(data.downloadUrl)}" class="btn btn-success" style="width:100%;" download>Download Printable PDF</a>
          </div>
        `;
      } else {
        checkoutBody.innerHTML = `<p>Payment submitted for review (Order ${esc(order.orderCode)}). Thank you!</p>`;
      }
    });
  }

  document.getElementById('close-checkout-btn').addEventListener('click', () => checkoutModal.classList.remove('open'));
  checkoutModal.addEventListener('click', (e) => { if (e.target === checkoutModal) checkoutModal.classList.remove('open'); });

  // Feedback display & modal
  function renderFeedback() {
    if (!savedFeedback.length) return;
    const realCards = savedFeedback.slice(0, 3).map(f => `
      <article class="feedback-card">
        <span class="placeholder-tag" style="background: var(--mint-green); color: var(--success-green);">Submitted Parent Feedback</span>
        <p style="margin:0;">"${esc(f.message)}"</p>
        <strong style="color: var(--text-main);">${esc(f.parentName)} — ${esc(f.relation || 'Parent')}</strong>
      </article>
    `).join('');
    feedbackGrid.innerHTML = realCards;
  }

  document.getElementById('open-feedback-btn').addEventListener('click', () => feedbackModal.classList.add('open'));
  document.getElementById('close-fb-btn').addEventListener('click', () => feedbackModal.classList.remove('open'));
  feedbackModal.addEventListener('click', (e) => { if (e.target === feedbackModal) feedbackModal.classList.remove('open'); });

  feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusEl = document.getElementById('fb-status');
    const parentName = document.getElementById('fb-name').value.trim();
    const relation = document.getElementById('fb-relation').value.trim() || 'Parent';
    const message = document.getElementById('fb-message').value.trim();
    try {
      const res = await fetch('/api/store/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentName, relation, message })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not save feedback');
      savedFeedback.unshift(data.entry);
      renderFeedback();
      statusEl.textContent = 'Thank you! Your feedback has been saved.';
      statusEl.style.color = '#25805B';
      statusEl.style.display = 'block';
      feedbackForm.reset();
      setTimeout(() => {
        feedbackModal.classList.remove('open');
        statusEl.style.display = 'none';
      }, 1200);
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.style.color = '#B91C1C';
      statusEl.style.display = 'block';
    }
  });

  // Accessible FAQ Accordion
  document.querySelectorAll('.faq-trigger').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const panelId = btn.getAttribute('aria-controls');
      const panel = document.getElementById(panelId);
      btn.setAttribute('aria-expanded', String(!expanded));
      btn.querySelector('span[aria-hidden="true"]').textContent = expanded ? '+' : '−';
      if (panel) panel.hidden = expanded;
    });
  });

  function checkDeepLink() {
    const m = window.location.pathname.match(/\/book\/([^/]+)/);
    const id = m ? m[1] : new URLSearchParams(window.location.search).get('book');
    if (id) {
      const ws = worksheets.find(x => x.id === id);
      if (ws) openPreview(ws);
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePreview();
      checkoutModal.classList.remove('open');
      feedbackModal.classList.remove('open');
    }
  });

  init();
})();
