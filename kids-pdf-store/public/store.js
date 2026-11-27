(function () {
  const ICONS = window.SKW_ICONS || {};
  document.getElementById('brand-logo-svg').innerHTML = ICONS.brandLogo || '';
  document.getElementById('header-search-icon').innerHTML = ICONS.search || '';

  const pageRoot = document.getElementById('main-content');
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');

  const previewModal = document.getElementById('preview-modal');
  const previewIframe = document.getElementById('preview-iframe');
  const previewTitleEl = document.getElementById('preview-modal-title');
  const previewTabLink = document.getElementById('preview-newtab-link');
  const previewDownloadBtn = document.getElementById('preview-download-btn');

  const readerModal = document.getElementById('reader-modal');
  const readerTitleEl = document.getElementById('reader-modal-title');
  const readerBodyEl = document.getElementById('reader-modal-body');

  const checkoutModal = document.getElementById('checkout-modal');
  const checkoutBody = document.getElementById('checkout-body');

  let storeSettings = {};
  let worksheets = [];
  let savedFeedback = [];
  let currentRoute = 'home';
  let detailId = '';

  const libState = {
    search: '',
    ages: [],
    needs: [],
    category: 'All',
    sort: 'latest'
  };

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

  function parseRouteFromLocation() {
    const hash = window.location.hash.replace(/^#/, '').trim();
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    const raw = hash || path || 'home';
    if (raw.startsWith('worksheet/')) {
      return { route: 'detail', id: raw.slice('worksheet/'.length) };
    }
    if (raw.startsWith('book/')) {
      return { route: 'detail', id: raw.slice('book/'.length) };
    }
    const valid = ['home', 'worksheets', 'categories', 'free', 'resources', 'about', 'contact', 'faq'];
    return { route: valid.includes(raw) ? raw : 'home', id: '' };
  }

  function navigateTo(route, id = '') {
    currentRoute = route;
    detailId = id;
    const hashTarget = route === 'detail' ? `worksheet/${id}` : route;
    if (window.location.hash.replace(/^#/, '') !== hashTarget) {
      window.location.hash = hashTarget;
    }
    updateActiveNav();
    renderCurrentPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateActiveNav() {
    const navKey = currentRoute === 'detail' || currentRoute === 'free' ? 'worksheets' : currentRoute;
    document.querySelectorAll('[data-route]').forEach(a => {
      a.classList.toggle('active', a.getAttribute('data-route') === navKey);
    });
    mobileDrawer.classList.remove('open');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  }

  hamburgerBtn.addEventListener('click', () => {
    const isOpen = mobileDrawer.classList.toggle('open');
    hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
  });

  document.getElementById('header-search-btn').addEventListener('click', () => {
    navigateTo('worksheets');
    setTimeout(() => document.getElementById('lib-search-input')?.focus(), 120);
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-route]');
    if (link) {
      e.preventDefault();
      navigateTo(link.getAttribute('data-route'));
    }
  });

  window.addEventListener('hashchange', () => {
    const parsed = parseRouteFromLocation();
    currentRoute = parsed.route;
    detailId = parsed.id;
    updateActiveNav();
    renderCurrentPage();
  });

  function renderWorksheetCardHtml(ws, showNeed = true) {
    const isFree = Number(ws.price) === 0;
    const badgeLabel = ws.learningNeed || ws.subtitle || 'Early Learning';
    return `
      <article class="ws-card">
        <div class="ws-thumb" data-open-detail="${esc(ws.id)}">
          <img src="${esc(ws.coverUrl)}" alt="${esc(ws.title)} worksheet thumbnail" loading="lazy" />
        </div>
        <h3 class="ws-title" data-open-detail="${esc(ws.id)}">${esc(ws.title)}</h3>
        <div class="ws-pills">
          <span class="pill-age">${esc(ws.ageGroup)} Years</span>
          ${showNeed ? `<span class="pill-need">${esc(badgeLabel)}</span>` : ''}
        </div>
        <div class="ws-card-actions">
          <button type="button" class="btn btn-soft-blue" data-open-detail="${esc(ws.id)}">${ICONS.eye || ''} Preview</button>
          ${isFree
            ? `<a href="/api/store/book/${esc(ws.id)}/download" class="btn btn-success" download>${ICONS.download || ''} Download</a>`
            : `<button type="button" class="btn btn-success" data-buy-id="${esc(ws.id)}">${ICONS.download || ''} ${cur()}${ws.price}</button>`}
        </div>
      </article>
    `;
  }

  function wireWorksheetCardActions(root) {
    root.querySelectorAll('[data-open-detail]').forEach(el => {
      el.addEventListener('click', () => navigateTo('detail', el.getAttribute('data-open-detail')));
    });
    root.querySelectorAll('[data-buy-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ws = worksheets.find(x => x.id === btn.getAttribute('data-buy-id'));
        if (ws) openPaidCheckout(ws);
      });
    });
  }

  // PAGE 1: HOME PAGE
  function renderHomePage() {
    const popular = worksheets.slice(0, 3);
    pageRoot.innerHTML = `
      <section class="home-hero-card" aria-labelledby="home-h1">
        <h1 id="home-h1" class="sr-only">Printable Learning Worksheets for Special Kids — Premium Worksheet Collection</h1>
        <button id="hero-banner-cta" type="button" class="home-hero-banner-btn" aria-label="Explore Printable Learning Worksheets Collection">
          <img src="/assets/hero-banner-hd.png?v=13.0" class="home-hero-banner-img" alt="KidsWorksheet Printable Learning Worksheets for Kids — Alphabets, Numbers, Math, Tracing, Coloring, GK & Festivals" />
        </button>
      </section>

      <section style="margin-top: 22px;" aria-labelledby="home-pop-h2">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
          <h2 id="home-pop-h2" style="margin:0; font-size:1.5rem; font-weight:900;">Printable Worksheets</h2>
          <a href="#worksheets" class="btn btn-outline-blue" data-route="worksheets" style="min-height:40px; padding:6px 16px;">View All Worksheets →</a>
        </div>
        <div class="ws-grid-3">
          ${popular.length
            ? popular.map(w => renderWorksheetCardHtml(w, true)).join('')
            : `<div class="card-white" style="grid-column:1/-1; text-align:center; padding:32px 20px;">
                 <h3 style="margin-bottom:8px;">No Worksheets Added Yet</h3>
                 <p style="margin:0; color:var(--text-secondary);">Printable PDF worksheets uploaded by the creator will appear right here.</p>
               </div>`}
        </div>
      </section>
    `;

    document.getElementById('hero-banner-cta').addEventListener('click', () => navigateTo('worksheets'));
    wireWorksheetCardActions(pageRoot);
  }

  // PAGE 2: WORKSHEET LIBRARY PAGE
  function renderLibraryPage() {
    let filtered = worksheets.filter(w => {
      if (libState.search) {
        const hay = `${w.title} ${w.subtitle} ${w.learningGoal} ${w.category} ${w.learningNeed} ${w.skillArea}`.toLowerCase();
        if (!hay.includes(libState.search.toLowerCase())) return false;
      }
      if (libState.ages.length) {
        const ageMatch = libState.ages.some(a => {
          if (a === '3 – 4 Years') return ['3-5', '3-6'].includes(w.ageGroup);
          if (a === '4 – 5 Years') return ['3-5', '4-6', '3-6'].includes(w.ageGroup);
          if (a === '5 – 7 Years') return ['4-8', '5-8', '4-6'].includes(w.ageGroup);
          if (a === '8 – 10+ Years') return ['4-8', '5-8', '8-12'].includes(w.ageGroup);
          return true;
        });
        if (!ageMatch) return false;
      }
      if (libState.needs.length) {
        const needMatch = libState.needs.some(n =>
          (w.learningNeed || '').toLowerCase().includes(n.split(' ')[0].toLowerCase()) ||
          (w.skillArea || '').toLowerCase().includes(n.split(' ')[0].toLowerCase())
        );
        if (!needMatch) return false;
      }
      return true;
    });

    if (libState.sort === 'pages') filtered = [...filtered].sort((a, b) => b.pages - a.pages);
    else if (libState.sort === 'alpha') filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));

    const ageOpts = ['3 – 4 Years', '4 – 5 Years', '5 – 7 Years', '8 – 10+ Years'];
    const needOpts = ['Autism Support', 'ADHD Activities', 'Learning Disability', 'General Support'];

    pageRoot.innerHTML = `
      <section class="subpage-banner">
        <span aria-hidden="true">${ICONS.bookPurple}</span>
        <div class="subpage-banner-center">
          <h1>Worksheet Library</h1>
          <p>Explore printable worksheets for your child's learning needs.</p>
        </div>
        <span aria-hidden="true">${ICONS.earlyBlocks}</span>
      </section>

      <form id="lib-search-form" class="search-pill-form" style="margin-top:0; max-width:100%;" role="search">
        <span style="color:#687789; display:flex;" aria-hidden="true">${ICONS.search}</span>
        <label for="lib-search-input" class="sr-only">Search worksheets library</label>
        <input id="lib-search-input" type="search" value="${esc(libState.search)}" placeholder="Search worksheets... (e.g. Tracing, Matching, Colours)" />
        <button type="submit" class="search-go-btn" aria-label="Search library">${ICONS.search}</button>
      </form>

      <div class="library-layout">
        <aside class="filter-sidebar" aria-label="Worksheet Filters">
          <h2>Filters</h2>
          <div class="filter-group">
            <h3>Age Group</h3>
            ${ageOpts.map(a => `
              <label class="filter-check">
                <input type="checkbox" class="lib-age-cb" value="${esc(a)}" ${libState.ages.includes(a) ? 'checked' : ''} />
                <span>${esc(a)}</span>
              </label>
            `).join('')}
          </div>
          <div class="filter-group">
            <h3>Learning Need</h3>
            ${needOpts.map(n => `
              <label class="filter-check">
                <input type="checkbox" class="lib-need-cb" value="${esc(n)}" ${libState.needs.includes(n) ? 'checked' : ''} />
                <span>${esc(n)}</span>
              </label>
            `).join('')}
          </div>
          <button id="lib-reset-btn" type="button" class="btn btn-outline-blue" style="width:100%; min-height:40px;">Reset Filters</button>
        </aside>

        <div>
          <div class="library-header-bar">
            <strong style="font-size:1.08rem;">Showing ${filtered.length} Worksheet${filtered.length === 1 ? '' : 's'}</strong>
            <select id="lib-sort-select" class="sort-select" aria-label="Sort worksheets">
              <option value="latest" ${libState.sort === 'latest' ? 'selected' : ''}>Sort by: Latest</option>
              <option value="alpha" ${libState.sort === 'alpha' ? 'selected' : ''}>Sort by: A to Z</option>
              <option value="pages" ${libState.sort === 'pages' ? 'selected' : ''}>Sort by: Most Pages</option>
            </select>
          </div>
          <div class="ws-grid-3">
            ${filtered.length
              ? filtered.map(w => renderWorksheetCardHtml(w, true)).join('')
              : `<div class="card-white" style="grid-column:1/-1; text-align:center;"><p>No worksheets matched those filters.</p></div>`}
          </div>
        </div>
      </div>
    `;

    document.getElementById('lib-search-form').addEventListener('submit', (e) => {
      e.preventDefault();
      libState.search = document.getElementById('lib-search-input').value.trim();
      renderLibraryPage();
    });
    pageRoot.querySelectorAll('.lib-age-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        libState.ages = Array.from(pageRoot.querySelectorAll('.lib-age-cb:checked')).map(x => x.value);
        renderLibraryPage();
      });
    });
    pageRoot.querySelectorAll('.lib-need-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        libState.needs = Array.from(pageRoot.querySelectorAll('.lib-need-cb:checked')).map(x => x.value);
        renderLibraryPage();
      });
    });
    document.getElementById('lib-sort-select').addEventListener('change', (e) => {
      libState.sort = e.target.value;
      renderLibraryPage();
    });
    document.getElementById('lib-reset-btn').addEventListener('click', () => {
      libState.search = ''; libState.ages = []; libState.needs = [];
      renderLibraryPage();
    });
    wireWorksheetCardActions(pageRoot);
  }

  // PAGE 3: CATEGORIES PAGE (8 PASTEL ILLUSTRATED TILES)
  function renderCategoriesPage() {
    const tiles = [
      { title: 'Autism Support', bg: '#FCE8F3', icon: ICONS.autismHeart, need: 'Autism Support' },
      { title: 'ADHD Activities', bg: '#FEF4D4', icon: ICONS.adhdBrain, need: 'ADHD Activities' },
      { title: 'Learning Disability', bg: '#E5F1FF', icon: ICONS.learningBook, need: 'Learning Disability' },
      { title: 'Emotional & Social Skills', bg: '#E6F6EC', icon: ICONS.emotionalFaces, need: 'General Support' },
      { title: 'Fine Motor Skills', bg: '#F0EAFF', icon: ICONS.fineMotorHand, need: 'General Support' },
      { title: 'Gross Motor Skills', bg: '#E3F5FB', icon: ICONS.grossMotorJump, need: 'General Support' },
      { title: 'Communication & Language', bg: '#E6F5F0', icon: ICONS.commBubbles, need: 'General Support' },
      { title: 'Early Learning', bg: '#FFF2D1', icon: ICONS.earlyBlocks, need: 'General Support' }
    ];

    pageRoot.innerHTML = `
      <section class="subpage-banner">
        <span aria-hidden="true">${ICONS.puzzle}</span>
        <div class="subpage-banner-center">
          <h1>Worksheet Categories</h1>
          <p>Browse learning worksheets by different learning needs and skills.</p>
        </div>
        <span aria-hidden="true">${ICONS.earlyBlocks}</span>
      </section>

      <section class="cat-8-grid" aria-label="Worksheet Categories">
        ${tiles.map(t => `
          <button type="button" class="cat-8-tile" style="background:${t.bg};" data-pick-cat="${esc(t.title)}">
            <span>${t.icon}</span>
            <h3>${esc(t.title)}</h3>
          </button>
        `).join('')}
      </section>

      <p style="text-align:center; margin-top:22px; color:var(--text-secondary); font-size:0.92rem;">
        Educational Note: Worksheets support calm skill practice at home and do not diagnose, treat, or cure any medical condition.
      </p>
    `;

    pageRoot.querySelectorAll('[data-pick-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const picked = btn.getAttribute('data-pick-cat');
        libState.ages = [];
        libState.needs = ['Autism Support', 'ADHD Activities', 'Learning Disability'].includes(picked) ? [picked] : [];
        libState.search = ['Autism Support', 'ADHD Activities', 'Learning Disability'].includes(picked) ? '' : picked.split(' ')[0];
        navigateTo('worksheets');
      });
    });
  }

  // PAGE 4: WORKSHEET DETAILS PAGE
  function renderDetailsPage() {
    const ws = worksheets.find(x => x.id === detailId) || worksheets[0];
    if (!ws) {
      pageRoot.innerHTML = '<p>Worksheet not found.</p>';
      return;
    }
    const isFree = Number(ws.price) === 0;
    pageRoot.innerHTML = `
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="#home" data-route="home">Home</a> &gt;
        <a href="#worksheets" data-route="worksheets">Worksheets</a> &gt;
        <span>${esc(ws.title)}</span>
      </nav>

      <section class="detail-grid">
        <div class="detail-preview-wrap">
          <div class="detail-thumbs-col" aria-label="Page thumbnails">
            ${[1, 2, 3, 4].map(n => `
              <button type="button" class="mini-page-thumb ${n === 1 ? 'active' : ''}" data-pg-thumb="${n}">
                <span>Page ${n}</span>
              </button>
            `).join('')}
          </div>
          <div class="detail-main-canvas">
            <img src="${esc(ws.coverUrl)}" alt="${esc(ws.title)} preview sheet" />
          </div>
        </div>

        <div>
          <h1 style="font-size:1.85rem; font-weight:900; margin-bottom:12px;">${esc(ws.title)}</h1>
          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
            <span class="pill-need" style="background:var(--soft-blue); color:var(--primary-blue);">${esc(ws.learningNeed || 'Autism Support')}</span>
            <span class="pill-need" style="background:var(--mint-green); color:var(--success-green);">${esc(ws.skillArea || 'Fine Motor Skill')}</span>
          </div>

          <div class="spec-list">
            <div class="spec-row"><span class="spec-lbl">📅 Age Group</span><span>: ${esc(ws.ageGroup)} Years</span></div>
            <div class="spec-row"><span class="spec-lbl">📄 Total Pages</span><span>: ${ws.pages} Pages (PDF)</span></div>
            <div class="spec-row"><span class="spec-lbl">🖨️ Format</span><span>: Printable (A4)</span></div>
            <div class="spec-row"><span class="spec-lbl">🎯 Learning Goal</span><span>: ${esc(ws.learningGoal || ws.subtitle)}</span></div>
          </div>

          <p style="color:var(--text-secondary); margin-bottom:22px;">${esc(ws.description)}</p>

          <div style="display:flex; flex-wrap:wrap; gap:12px;">
            <button id="det-preview-btn" type="button" class="btn btn-outline-blue" style="flex:1; min-width:160px;">👁️ Preview (View PDF)</button>
            ${isFree
              ? `<a href="/api/store/book/${esc(ws.id)}/download" class="btn btn-success" style="flex:1.2; min-width:190px;" download>📥 Download PDF (${ws.pages} Pages, Free)</a>`
              : `<button id="det-buy-btn" type="button" class="btn btn-success" style="flex:1.2; min-width:190px;">📥 Download PDF (${cur()}${ws.price})</button>`}
          </div>
        </div>
      </section>
    `;

    pageRoot.querySelectorAll('[data-pg-thumb]').forEach(b => {
      b.addEventListener('click', () => {
        pageRoot.querySelectorAll('[data-pg-thumb]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      });
    });
    document.getElementById('det-preview-btn').addEventListener('click', () => openPdfPreviewModal(ws));
    document.getElementById('det-buy-btn')?.addEventListener('click', () => openPaidCheckout(ws));
  }

  // PAGE 5: FREE DOWNLOADS PAGE
  function renderFreePage() {
    const freeList = worksheets.filter(w => Number(w.price) === 0);
    const tabs = ['All (Free)', 'Tracing', 'Matching', 'Colouring', 'Numbers', 'Life Skills'];
    const activeTab = libState.category || 'All (Free)';
    const shown = activeTab === 'All (Free)'
      ? freeList
      : freeList.filter(w => (w.category || '').toLowerCase().includes(activeTab.toLowerCase()) || w.title.toLowerCase().includes(activeTab.toLowerCase()));

    pageRoot.innerHTML = `
      <section class="subpage-banner">
        <span aria-hidden="true">${ICONS.giftBox}</span>
        <div class="subpage-banner-center">
          <h1>Free Worksheets Download</h1>
          <p>A collection of free printable worksheets for special kids.</p>
        </div>
        <div class="free-seal">100%<br/>Free</div>
      </section>

      <div class="filter-pills-row" role="tablist" aria-label="Free worksheet categories">
        ${tabs.map(t => `<button type="button" class="pill-tab ${activeTab === t ? 'active' : ''}" data-free-tab="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>

      <div class="ws-grid-3">
        ${shown.length
          ? shown.map(w => renderWorksheetCardHtml(w, false)).join('')
          : `<div class="card-white" style="grid-column:1/-1; text-align:center; padding:32px 20px;">
               <h3 style="margin-bottom:8px;">No Free Worksheets Here Yet</h3>
               <p style="margin:0; color:var(--text-secondary);">Uploaded free worksheets in this category will appear here automatically.</p>
             </div>`}
      </div>
    `;

    pageRoot.querySelectorAll('[data-free-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        libState.category = btn.getAttribute('data-free-tab');
        renderFreePage();
      });
    });
    wireWorksheetCardActions(pageRoot);
  }

  // PAGE 6: PARENT RESOURCES PAGE
  function renderResourcesPage() {
    const guides = [
      {
        title: 'Parenting Tips', bg: '#FFF3CD', icon: ICONS.lightbulb,
        body: '<p><strong>1. Keep Sessions Short:</strong> Start with 10 to 15 calm minutes rather than finishing an entire packet in one sitting.</p><p><strong>2. Offer Predictable Routine:</strong> Keep a small basket with thick crayons and 2 printed sheets on the same quiet table each day.</p><p><strong>3. Praise Effort:</strong> Celebrate attempting shapes or holding the crayon comfortably.</p>'
      },
      {
        title: 'Learning Guides', bg: '#E6F2FF', icon: ICONS.learningBook,
        body: '<p><strong>Visual First Instructions:</strong> Point to the first completed example row before asking your child to trace.</p><p><strong>High-Contrast Spacing:</strong> Printing on crisp matte A4 paper reduces glare and makes dashed lines clearer for visual tracking.</p>'
      },
      {
        title: 'Activity Ideas at Home', bg: '#FDE8F2', icon: ICONS.playCard,
        body: '<p><strong>Reusable Wipe-Clean Sleeves:</strong> Slip any printed sheet inside a clear plastic page protector so kids can trace with dry-erase markers over and over.</p><p><strong>Hands-On Pairing:</strong> Place real apples, blocks, or buttons beside Shape &amp; Counting sheets.</p>'
      },
      {
        title: 'Development Support', bg: '#E6F6EC', icon: ICONS.sprout,
        body: '<p><strong>Going at Their Pace:</strong> Repeat favorite fine-motor sheets until confidence grows naturally. Consistent calm encouragement makes everyday learning enjoyable.</p><p><em>Note: Worksheets are supportive home practice tools and do not replace individualized therapy or medical care.</em></p>'
      }
    ];

    pageRoot.innerHTML = `
      <section class="subpage-banner">
        <span aria-hidden="true">${ICONS.bookPurple}</span>
        <div class="subpage-banner-center">
          <h1>Parent Resources</h1>
          <p>Helpful guides, tips and activity ideas for parents.</p>
        </div>
        <span aria-hidden="true">${ICONS.autismHeart}</span>
      </section>

      <section class="resources-4-grid">
        ${guides.map((g, i) => `
          <article class="resource-card" style="background:${g.bg};">
            <span>${g.icon}</span>
            <h3>${esc(g.title)}</h3>
            <button type="button" class="btn btn-primary" data-read-guide="${i}" style="min-height:40px; padding:7px 20px;">Read →</button>
          </article>
        `).join('')}
      </section>
    `;

    pageRoot.querySelectorAll('[data-read-guide]').forEach(btn => {
      btn.addEventListener('click', () => {
        const g = guides[Number(btn.getAttribute('data-read-guide'))];
        openReaderModal(g.title, g.body);
      });
    });
  }

  // PAGE 7: ABOUT US PAGE
  function renderAboutPage() {
    pageRoot.innerHTML = `
      <section class="subpage-banner">
        <div class="subpage-banner-center">
          <h1>About Us</h1>
          <p>Thoughtful, calm printable learning tools created for special children and supportive families.</p>
        </div>
      </section>

      <section class="about-hero">
        <div>
          <h2 style="font-size:1.5rem; font-weight:900; margin-bottom:10px;">Who We Are?</h2>
          <p style="margin:0; color:var(--text-secondary); font-size:1.04rem;">
            Special Kids Worksheets is a dedicated platform that provides high-quality, printable learning materials for children with Autism, ADHD, Learning Disability and other special needs.
          </p>
        </div>
        <div style="text-align:center; background:var(--soft-blue); border-radius:18px; padding:24px;">
          ${ICONS.autismHeart} ${ICONS.puzzle} ${ICONS.emotionalFaces}
          <div style="margin-top:8px; font-weight:800; color:var(--primary-blue);">Calm &amp; Inclusive Printable Learning</div>
        </div>
      </section>

      <section class="about-3-grid">
        <article class="resource-card" style="background:#FFF3CD;">
          <span>${ICONS.target}</span>
          <h3>Our Mission</h3>
          <p style="margin:0; color:var(--text-secondary); font-weight:700;">(Support Inclusive Learning)</p>
        </article>
        <article class="resource-card" style="background:#E6F2FF;">
          <span>${ICONS.sunrise}</span>
          <h3>Our Vision</h3>
          <p style="margin:0; color:var(--text-secondary); font-weight:700;">(Every Child Can Learn)</p>
        </article>
        <article class="resource-card" style="background:#FDEFE3;">
          <span>${ICONS.teamGroup}</span>
          <h3>Our Team</h3>
          <p style="margin:0; color:var(--text-secondary); font-weight:700;">(Educators &amp; Experts)</p>
        </article>
      </section>
    `;
  }

  // PAGE 8: CONTACT & FEEDBACK PAGE
  function renderContactPage() {
    let selectedStars = 5;
    const emailDisplay = storeSettings.supportEmail || 'support@specialkidsworksheets.in';

    pageRoot.innerHTML = `
      <section class="contact-grid">
        <div class="card-white">
          <h1 style="font-size:1.65rem; font-weight:900; margin-bottom:8px;">Get in Touch &amp; Share Your Feedback</h1>
          <p style="color:var(--text-secondary); margin:0 0 20px;">Have a question, suggestion or a worksheet request? We'd love to hear from you.</p>

          <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
            <span style="width:42px; height:42px; border-radius:12px; background:var(--mint-green); display:grid; place-items:center;">✉️</span>
            <div>
              <div style="font-weight:800;">Email</div>
              <div style="color:var(--text-secondary);">${esc(emailDisplay)}</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
            <span style="width:42px; height:42px; border-radius:12px; background:var(--soft-blue); display:grid; place-items:center;">🌐</span>
            <div>
              <div style="font-weight:800;">Website</div>
              <div style="color:var(--text-secondary);">www.specialkidsworksheets.in</div>
            </div>
          </div>

          <div style="background:var(--soft-blue); border-radius:16px; padding:18px; text-align:center;">
            ${ICONS.commBubbles}
            <div style="font-size:0.9rem; font-weight:700; color:var(--primary-blue); margin-top:6px;">Parents &amp; educators are welcome to suggest new topics!</div>
          </div>
        </div>

        <div class="card-white">
          <h2 style="font-size:1.45rem; font-weight:900; margin-bottom:14px;">Send Us a Message</h2>
          <form id="contact-fb-form">
            <div class="field"><label for="cf-name">Your Name *</label><input id="cf-name" type="text" required placeholder="Enter your full name" /></div>
            <div class="field"><label for="cf-email">Email *</label><input id="cf-email" type="email" required placeholder="you@example.com" /></div>
            <div class="field"><label for="cf-msg">Your Message *</label><textarea id="cf-msg" rows="4" required placeholder="Share your feedback or worksheet request..."></textarea></div>
            <div>
              <div style="font-weight:800; font-size:0.94rem;">How useful are our worksheets?</div>
              <div class="star-rating" id="cf-stars">
                ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="star-btn lit" data-star="${n}" aria-label="${n} stars">★</button>`).join('')}
              </div>
            </div>
            <div id="cf-status" style="margin-bottom:10px; font-weight:700; display:none;"></div>
            <button type="submit" class="btn btn-success" style="width:100%;">Submit Feedback →</button>
          </form>
        </div>
      </section>

      ${savedFeedback.length ? `
        <section style="margin-top:26px;">
          <h2 style="font-size:1.3rem; font-weight:900; margin-bottom:12px;">Recent Parent Feedback</h2>
          <div class="ws-grid-3">
            ${savedFeedback.slice(0, 6).map(f => `
              <article class="card-white" style="padding:18px;">
                <div style="color:#F59E0B; margin-bottom:6px;">${'★'.repeat(f.rating || 5)}</div>
                <p style="margin:0 0 8px;">"${esc(f.message)}"</p>
                <strong style="color:var(--text-secondary); font-size:0.9rem;">${esc(f.parentName)}</strong>
              </article>
            `).join('')}
          </div>
        </section>
      ` : ''}
    `;

    pageRoot.querySelectorAll('#cf-stars [data-star]').forEach(b => {
      b.addEventListener('click', () => {
        selectedStars = Number(b.getAttribute('data-star'));
        pageRoot.querySelectorAll('#cf-stars [data-star]').forEach(s => {
          s.classList.toggle('lit', Number(s.getAttribute('data-star')) <= selectedStars);
        });
      });
    });

    document.getElementById('contact-fb-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = document.getElementById('cf-status');
      try {
        const res = await fetch('/api/store/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentName: document.getElementById('cf-name').value.trim(),
            email: document.getElementById('cf-email').value.trim(),
            message: document.getElementById('cf-msg').value.trim(),
            rating: selectedStars
          })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Could not submit feedback.');
        savedFeedback.unshift(data.entry);
        statusEl.textContent = 'Thank you! Your feedback has been submitted.';
        statusEl.style.color = '#25805B';
        statusEl.style.display = 'block';
        e.target.reset();
      } catch (err) {
        statusEl.textContent = err.message;
        statusEl.style.color = '#B91C1C';
        statusEl.style.display = 'block';
      }
    });
  }

  // PAGE 9: FAQ & POLICIES PAGE
  function renderFaqPage() {
    const faqs = [
      { q: 'Are the worksheets really free?', a: 'Yes, many worksheets are completely free to download and print for personal and educational use.' },
      { q: 'Can I print these worksheets at home?', a: 'Yes! Every PDF uses crisp standard A4 sizing and clean white backgrounds for easy home printing.' },
      { q: 'What age group are these worksheets for?', a: 'Worksheets are designed across ages 3 to 10+ years, grouped clearly by skill readiness and learning comfort.' },
      { q: 'Do I need to create an account to download?', a: 'No account is needed for free worksheets — preview and download the PDF in one click.' },
      { q: 'Can I use these worksheets in a school or therapy centre?', a: 'Yes, teachers, parents, and special educators may print sheets for non-commercial classroom and home support.' }
    ];

    const policies = [
      {
        title: 'Privacy Policy', sub: '(How we protect your data)', badgeBg: '#E4F5EA', icon: '🛡️',
        body: '<p>We respect family privacy. Free worksheet downloads require zero login or personal details. Feedback submissions only store the name and message you voluntarily share.</p>'
      },
      {
        title: 'Terms & Conditions', sub: '(Website usage rules)', badgeBg: '#EAF4FF', icon: '📄',
        body: '<p>All printable PDFs are licensed for personal home, classroom, and non-commercial learning support. Reselling or redistributing downloadable files without permission is prohibited.</p>'
      },
      {
        title: 'Disclaimer', sub: '(Important information)', badgeBg: '#F2EAFE', icon: 'ℹ️',
        body: '<p>All activities are supportive educational resources only. Special Kids Worksheets does not diagnose, treat, cure, or replace professional medical or therapeutic evaluation.</p>'
      }
    ];

    pageRoot.innerHTML = `
      <div class="faq-policies-grid">
        <section aria-labelledby="faq-title">
          <h1 id="faq-title" style="font-size:1.65rem; font-weight:900; margin-bottom:16px;">Frequently Asked Questions (FAQ)</h1>
          ${faqs.map((f, idx) => `
            <div class="faq-item">
              <button type="button" class="faq-trigger" aria-expanded="${idx === 0 ? 'true' : 'false'}" aria-controls="fp-${idx}" id="fb-${idx}">
                <span>${esc(f.q)}</span>
                <span aria-hidden="true">${idx === 0 ? '⌃' : '⌄'}</span>
              </button>
              <div id="fp-${idx}" class="faq-panel" role="region" aria-labelledby="fb-${idx}" ${idx === 0 ? '' : 'hidden'}>
                ${esc(f.a)}
              </div>
            </div>
          `).join('')}
        </section>

        <aside aria-labelledby="pol-title">
          <h2 id="pol-title" style="font-size:1.45rem; font-weight:900; margin-bottom:16px;">Our Policies</h2>
          ${policies.map((p, idx) => `
            <button type="button" class="policy-card" data-open-pol="${idx}">
              <span style="width:46px; height:46px; border-radius:12px; background:${p.badgeBg}; display:grid; place-items:center; font-size:1.35rem; flex-shrink:0;">${p.icon}</span>
              <div>
                <div style="font-weight:900; font-size:1.05rem;">${esc(p.title)}</div>
                <div style="font-size:0.88rem; color:var(--text-secondary);">${esc(p.sub)}</div>
              </div>
            </button>
          `).join('')}
        </aside>
      </div>
    `;

    pageRoot.querySelectorAll('.faq-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const exp = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!exp));
        btn.querySelector('span[aria-hidden="true"]').textContent = exp ? '⌄' : '⌃';
        const pan = document.getElementById(btn.getAttribute('aria-controls'));
        if (pan) pan.hidden = exp;
      });
    });

    pageRoot.querySelectorAll('[data-open-pol]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pol = policies[Number(btn.getAttribute('data-open-pol'))];
        openReaderModal(pol.title, pol.body);
      });
    });
  }

  function renderCurrentPage() {
    switch (currentRoute) {
      case 'worksheets': return renderLibraryPage();
      case 'categories': return renderCategoriesPage();
      case 'detail': return renderDetailsPage();
      case 'free': return renderFreePage();
      case 'resources': return renderResourcesPage();
      case 'about': return renderAboutPage();
      case 'contact': return renderContactPage();
      case 'faq': return renderFaqPage();
      case 'home':
      default: return renderHomePage();
    }
  }

  function openPdfPreviewModal(ws) {
    const sampleUrl = `/api/store/book/${encodeURIComponent(ws.id)}/sample`;
    previewTitleEl.textContent = `Preview: ${ws.title}`;
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

  function openReaderModal(title, htmlBody) {
    readerTitleEl.textContent = title;
    readerBodyEl.innerHTML = htmlBody;
    readerModal.classList.add('open');
  }
  document.getElementById('close-reader-btn').addEventListener('click', () => readerModal.classList.remove('open'));
  readerModal.addEventListener('click', (e) => { if (e.target === readerModal) readerModal.classList.remove('open'); });

  function openPaidCheckout(ws) {
    checkoutBody.innerHTML = `
      <p style="margin-top:0; color:#687789;">Enter your details for <strong>${esc(ws.title)}</strong> (${cur()}${ws.price}).</p>
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
      const p = data.payment;
      checkoutBody.innerHTML = `
        <p style="margin-top:0;">Order <strong>${esc(data.order.orderCode)}</strong> • Amount: <strong>${esc(p.currency)}${data.order.amount}</strong></p>
        ${p.paymentLink ? `<a href="${esc(p.paymentLink)}" target="_blank" rel="noopener" class="btn btn-primary" style="width:100%; margin-bottom:10px;">Open Payment Link</a>` : ''}
        ${p.upiId && p.qrDataUrl ? `<div style="text-align:center; margin:10px 0;"><img src="${p.qrDataUrl}" alt="UPI QR" style="width:190px; border:1px solid #DCE5F0; border-radius:10px;" /><div>UPI: <strong>${esc(p.upiId)}</strong></div></div>` : ''}
        <div class="field"><label for="co-utr">UTR / Transaction Reference *</label><input id="co-utr" type="text" placeholder="Enter transaction ID after paying" /></div>
        <button id="co-unlock-btn" type="button" class="btn btn-success" style="width:100%;">Verify &amp; Download PDF</button>
      `;
      document.getElementById('co-unlock-btn').addEventListener('click', async () => {
        const vr = await fetch(`/api/store/orders/${encodeURIComponent(data.order.id)}/submit-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ utrNumber: document.getElementById('co-utr').value.trim() })
        });
        const vd = await vr.json();
        if (vd.success && vd.downloadUrl) {
          checkoutBody.innerHTML = `<div style="text-align:center;"><h3>PDF Ready!</h3><a href="${esc(vd.downloadUrl)}" class="btn btn-success" style="width:100%;" download>Download Printable PDF</a></div>`;
        } else {
          alert(vd.error || 'Verification pending.');
        }
      });
    });
  }
  document.getElementById('close-checkout-btn').addEventListener('click', () => checkoutModal.classList.remove('open'));
  checkoutModal.addEventListener('click', (e) => { if (e.target === checkoutModal) checkoutModal.classList.remove('open'); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePreview();
      readerModal.classList.remove('open');
      checkoutModal.classList.remove('open');
    }
  });

  async function init() {
    try {
      const res = await fetch('/api/store/public');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Load failed');
      storeSettings = data.settings || {};
      worksheets = Array.isArray(data.books) ? data.books : [];
      savedFeedback = Array.isArray(data.feedback) ? data.feedback : [];

      const parsed = parseRouteFromLocation();
      currentRoute = parsed.route;
      detailId = parsed.id;
      updateActiveNav();
      renderCurrentPage();
    } catch (err) {
      pageRoot.innerHTML = `<p style="color:#B91C1C; text-align:center;">Error loading platform: ${esc(err.message)}</p>`;
    }
  }

  init();
})();
