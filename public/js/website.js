/**
 * જ્ઞાન યાત્રા (GYAN YATRA) - OFFICIAL CHANNEL WEBSITE INTERACTIVITY
 */

// Curated Video Collection for Gyan Yatra Channel
const CHANNEL_VIDEOS = [
  {
    id: "v1",
    title: "બ્રહ્માંડના છેડે શું છે? | Universe Edge & James Webb Telescope Secrets",
    category: "science",
    categoryLabel: "વિજ્ઞાન & બ્રહ્માંડ",
    views: "1.2M",
    duration: "14:28",
    published: "2 અઠવાડિયા પહેલાં",
    thumb: "/images/thumb1.jpg",
    youtubeId: "libKVRa074Q", // high-quality cosmic science doc embed
    desc: "આજના વિડીયોમાં આપણે જાણીશું કે આપણું બ્રહ્માંડ ક્યાં પૂરું થાય છે? જેમ્સ વેબ સ્પેસ ટેલિસ્કોપે શોધેલી 13 અબજ વર્ષ જૂની ગેલેક્સીઓ અને બ્લેક હોલના રોચક રહસ્યો."
  },
  {
    id: "v2",
    title: "દ્વારકા નગરીના સમુદ્રમાં રહસ્યો | Underwater Sunken Dwarka Evidence",
    category: "history",
    categoryLabel: "રહસ્યમય ઇતિહાસ",
    views: "2.4M",
    duration: "18:45",
    published: "1 મહિનો પહેલાં",
    thumb: "/images/thumb2.jpg",
    youtubeId: "dQw4w9WgXcQ", 
    desc: "ગુજરાતના દરિયામાં 9000 વર્ષ જૂની ભગવાન શ્રીકૃષ્ણની સોનાની દ્વારકા નગરીના પુરાતત્વીય પુરાવા. અંડરવોટર આર્કિયોલોજીના અદ્ભુત તથ્યો."
  },
  {
    id: "v3",
    title: "2030 માં દુનિયા કેવી હશે? | Future of AI, Humanoid Robots & Jobs",
    category: "tech",
    categoryLabel: "ટેકનોલોજી & AI",
    views: "980K",
    duration: "12:10",
    published: "3 દિવસ પહેલાં",
    thumb: "/images/thumb3.jpg",
    youtubeId: "libKVRa074Q",
    desc: "આર્ટિફિશિયલ ઇન્ટેલિજન્સ અને હ્યુમનોઇડ રોબોટ્સ માણસનું જીવન કેવી રીતે બદલશે? 2030 સુધીમાં કઈ નોકરીઓ ખતમ થશે અને કયા નવા ક્ષેત્રો ખુલશે?"
  },
  {
    id: "v4",
    title: "માનવ મગજની અકલ્પનીય શક્તિઓ | Human Brain Secrets & Memory Power",
    category: "science",
    categoryLabel: "વિજ્ઞાન & મનોવિજ્ઞાન",
    views: "1.8M",
    duration: "16:02",
    published: "1 મહિનો પહેલાં",
    thumb: "/images/thumb4.jpg",
    youtubeId: "libKVRa074Q",
    desc: "ન્યુરોસાયન્સ મુજબ આપણું મગજ કેવી રીતે કામ કરે છે? સુપર મેમરી અને સબકોન્શિયસ માઇન્ડ પાવર વધારવાની 5 વૈજ્ઞાનિક ટેકનિક્સ."
  },
  {
    id: "v5",
    title: "ભારતના 5 સૌથી રહસ્યમય મંદિરો | Mystery of Ancient Indian Architecture",
    category: "history",
    categoryLabel: "રહસ્યમય ઇતિહાસ",
    views: "1.5M",
    duration: "21:30",
    published: "2 મહિના પહેલાં",
    thumb: "/images/hero.jpg",
    youtubeId: "libKVRa074Q",
    desc: "કૈલાશ મંદિર એલોરા, લેપાક્ષી હેંગિંગ પિલર અને જગન્નાથ પુરી મંદિરના એવા રહસ્યો જેને આજના મોડર્ન સાયન્ટિસ્ટ્સ પણ ઉકેલી શક્યા નથી."
  },
  {
    id: "v6",
    title: "સમય યાત્રા (Time Travel) શક્ય છે? | Einstein Theory of Relativity in Gujarati",
    category: "science",
    categoryLabel: "વિજ્ઞાન & બ્રહ્માંડ",
    views: "850K",
    duration: "13:40",
    published: "3 અઠવાડિયા પહેલાં",
    thumb: "/images/thumb1.jpg",
    youtubeId: "libKVRa074Q",
    desc: "આઈન્સ્ટાઈનનો સાપેક્ષતાવાદ શું કહે છે? જો આપણે પ્રકાશની ગતિએ મુસાફરી કરીએ તો ભવિષ્યમાં જઈ શકીએ? સરળ ગુજરાતી ઉદાહરણો સાથે સમજો."
  }
];

document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initMobileMenu();
  renderVideoGallery('all');
  initFilterTabs();
  initVideoModal();
  initStatsCounter();
  initCommunityForm();
});

// 1. Sticky Navbar shadow on scroll
function initNavbarScroll() {
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// 2. Mobile Menu Drawer Toggle
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const desktopNav = document.getElementById('desktop-nav');
  if (!toggleBtn || !desktopNav) return;

  toggleBtn.addEventListener('click', () => {
    const isVisible = desktopNav.style.display === 'flex';
    desktopNav.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
      desktopNav.style.position = 'absolute';
      desktopNav.style.top = '74px';
      desktopNav.style.left = '0';
      desktopNav.style.right = '0';
      desktopNav.style.background = '#0d1222';
      desktopNav.style.flexDirection = 'column';
      desktopNav.style.padding = '20px';
      desktopNav.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    }
  });
}

// 3. Render Video Gallery with filters
function renderVideoGallery(filterCategory = 'all') {
  const grid = document.getElementById('videos-grid-container');
  if (!grid) return;

  const filtered = filterCategory === 'all' 
    ? CHANNEL_VIDEOS 
    : CHANNEL_VIDEOS.filter(v => v.category === filterCategory);

  grid.innerHTML = filtered.map(v => `
    <div class="video-card" data-video-id="${v.id}" onclick="openVideoPlayer('${v.id}')">
      <div class="video-thumb-wrap">
        <img class="video-thumb-img" src="${v.thumb}" alt="${v.title}" loading="lazy">
        <span class="video-category-tag">${v.categoryLabel}</span>
        <span class="video-duration">${v.duration}</span>
        <div class="video-hover-play">
          <div class="mini-play-btn">
            <span style="color:#fff; font-size:1.2rem; margin-left: 2px;">▶</span>
          </div>
        </div>
      </div>
      <div class="video-card-body">
        <h3 class="video-card-title">${v.title}</h3>
        <div class="video-card-stats">
          <span>👁️ ${v.views} વ્યૂઝ • ${v.published}</span>
          <span class="watch-now-link">▶ જુઓ</span>
        </div>
      </div>
    </div>
  `).join('');
}

// 4. Category Filter Tabs
function initFilterTabs() {
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-category');
      renderVideoGallery(cat);
    });
  });
}

// 5. Interactive Video Modal Player
let currentOpenVideo = null;
function initVideoModal() {
  const backdrop = document.getElementById('video-modal');
  const closeBtn = document.getElementById('modal-close-btn');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeVideoPlayer);
  }

  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeVideoPlayer();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeVideoPlayer();
  });
}

window.openVideoPlayer = function(videoId) {
  const video = CHANNEL_VIDEOS.find(v => v.id === videoId) || CHANNEL_VIDEOS[0];
  currentOpenVideo = video;

  const backdrop = document.getElementById('video-modal');
  const titleEl = document.getElementById('modal-video-title');
  const frameWrap = document.getElementById('modal-iframe-wrap');
  const descEl = document.getElementById('modal-video-desc');

  if (titleEl) titleEl.textContent = video.title;
  if (descEl) descEl.textContent = video.desc;

  // Render responsive YouTube Embed or Video Player fallback
  if (frameWrap) {
    frameWrap.innerHTML = `
      <iframe 
        src="https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1" 
        title="${video.title}" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
    `;
  }

  if (backdrop) backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closeVideoPlayer = function() {
  const backdrop = document.getElementById('video-modal');
  const frameWrap = document.getElementById('modal-iframe-wrap');
  if (backdrop) backdrop.classList.remove('active');
  if (frameWrap) frameWrap.innerHTML = '';
  document.body.style.overflow = '';
};

window.shareCurrentVideo = function() {
  if (!currentOpenVideo) return;
  const shareUrl = window.location.origin + '/?v=' + currentOpenVideo.id;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareUrl);
    showWebsiteToast('📋 વિડીયો લિંક કૉપિ થઈ ગઈ છે!');
  } else {
    showWebsiteToast('🔗 લિંક: ' + shareUrl);
  }
};

// 6. Smooth Stats Counter Animation
function initStatsCounter() {
  const statNumbers = document.querySelectorAll('.stat-num');
  let animated = false;

  const onScroll = () => {
    if (animated) return;
    const statsRow = document.querySelector('.hero-stats-row');
    if (!statsRow) return;

    const rect = statsRow.getBoundingClientRect();
    if (rect.top <= window.innerHeight - 50) {
      animated = true;
      statNumbers.forEach(el => {
        const targetStr = el.getAttribute('data-target') || el.innerText;
        el.innerText = targetStr;
      });
    }
  };

  window.addEventListener('scroll', onScroll);
  onScroll();
}

// 7. Community Form
function initCommunityForm() {
  const form = document.getElementById('community-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('community-email');
    if (emailInput && emailInput.value) {
      showWebsiteToast('🎉 જ્ઞાન યાત્રા પરિવારમાં જોડાવા બદલ આભાર!');
      emailInput.value = '';
    }
  });
}

// Global Toast helper
window.showWebsiteToast = function(msg) {
  let toast = document.getElementById('site-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'site-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      background: rgba(16, 23, 42, 0.95);
      border: 1px solid rgba(255, 0, 51, 0.4);
      color: #fff;
      padding: 12px 24px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 0.9rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      z-index: 3000;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(20px);
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
  }, 3500);
};
