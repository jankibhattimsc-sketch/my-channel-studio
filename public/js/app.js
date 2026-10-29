import { api } from './api.js';
import { copyToClipboard } from './utils/clipboard.js';
import { renderHome } from './views/home.js';
import { renderAnalytics } from './views/analytics.js';
import { renderTopics } from './views/topics.js';
import { renderSEO } from './views/seo.js';
import { renderThumbnails } from './views/thumbnails.js';
import { renderScriptWriter } from './views/scriptwriter.js';
import { renderChatGPT } from './views/chatgpt.js';
import { renderSlidePrompts } from './views/slideprompts.js';
import { renderResearch } from './views/research.js';
import { renderSettings } from './views/settings.js';
import { renderMyVoice } from './views/myvoice.js';
import { renderSlideEditor } from './views/slideeditor.js';
import { renderWorkspace } from './views/workspace.js';
import { renderSEODescription } from './views/seodescription.js';

class App {
  constructor() {
    this.currentView = 'home';
    this.container = document.getElementById('view-container');
    this.topPageTitle = document.getElementById('top-page-title');
    this.init();
  }

  async init() {
    this.setupNavigation();
    this.setupThemeToggle();
    this.setupMobileMenu();
    this.checkOAuthCallback();
    await this.refreshChannelStatus();

    // Route based on URL hash or default to topics (Step 1)
    const hash = window.location.hash.replace('#', '') || 'topics';
    this.navigateTo(hash);
  }

  setupNavigation() {
    // Desktop Nav Items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.getAttribute('data-view');
        this.navigateTo(target);
      });
    });

    // Mobile Nav Items
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.getAttribute('data-view');
        this.navigateTo(target);
      });
    });

    // Top Save & Share Quick Button
    document.getElementById('top-quick-share-btn')?.addEventListener('click', () => {
      this.navigateTo('package');
    });

    // Top Channel chip click
    document.getElementById('top-channel-chip')?.addEventListener('click', () => {
      this.navigateTo('settings');
    });

    // Hash change listener
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      if (hash !== this.currentView) {
        this.navigateTo(hash);
      }
    });
  }

  setupThemeToggle() {
    const themeBtn = document.getElementById('btn-toggle-theme');
    const savedTheme = localStorage.getItem('agy_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('agy_theme', next);
        themeBtn.innerText = next === 'dark' ? '🌙' : '☀️';
      });
    }
  }

  setupMobileMenu() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });

      // Close when clicking outside
      document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target) && sidebar.classList.contains('open')) {
          sidebar.classList.remove('open');
        }
      });
    }
  }

  checkOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connected') === 'true') {
      copyToClipboard('તમારું YouTube એકાઉન્ટ સફળતાપૂર્વક જોડાઈ ગયું છે! (Channel connected successfully)', 'ચેનલ કનેક્ટ થઈ ગઈ! ✓');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('auth_error')) {
      alert('Google OAuth ભૂલ: ' + decodeURIComponent(urlParams.get('auth_error')));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  async refreshChannelStatus() {
    try {
      const res = await api.getAuthStatus();
      const channel = res.channel;

      const avatarEl = document.getElementById('top-channel-avatar');
      const nameEl = document.getElementById('top-channel-name');
      const statusBadge = document.getElementById('top-channel-badge');

      if (avatarEl && channel) {
        avatarEl.src = channel.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120';
      }
      if (nameEl && channel) {
        nameEl.innerText = channel.title || 'ગુજરાતી ચેનલ';
      }
      if (statusBadge) {
        if (res.isDemo) {
          statusBadge.innerHTML = `<span class="status-dot demo"></span> ડેમો મોડ`;
        } else {
          statusBadge.innerHTML = `<span class="status-dot"></span> કનેક્ટેડ`;
        }
      }
    } catch (err) {
      console.warn('Could not refresh channel status header:', err);
    }
  }

  navigateTo(viewName) {
    this.currentView = viewName;
    window.location.hash = viewName;

    // Update active nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    // Close mobile sidebar if open
    document.getElementById('sidebar')?.classList.remove('open');

    // Update page title
    const titles = {
      topics: '📈 ૧. 48h ડેટા & ChatGPT સમરી પ્રોમ્પ્ટ (Studio 48h to ChatGPT)',
      slideprompts: '📑 ૨. સ્લાઇડ્સ & NotebookLM ટૂલ ૨ પ્રોમ્પ્ટ (White PPT Slides)',
      scriptwriter: '📝 ૩. સ્ક્રિપ્ટ રાઇટર (Script Writer & Audio Studio)',
      myvoice: '🎙️ ૪. મારો અવાજ (Voice Studio)',
      seo: '🖼️ ૫. થંબનેલ & AI પ્રોમ્પ્ટ (Thumbnail & AI Prompt)',
      seodescription: '🚀 ૬. SEO, ટાઈટલ & ડિસ્ક્રિપ્શન (ChatGPT Master Prompt)',
      slideeditor: '🎬 ૭. ઓડિયો & PDF ઓટો-મેચ એડિટર (Audio & PDF Auto-Match Studio)',
      workspace: '🌐 ૮. ઓલ-ઇન-વન વર્કસ્પેસ (NotebookLM + ChatGPT + Canva)',
      thumbnails: '🎨 થંબનેલ સ્ટુડિયો (Thumbnail Studio)',
      chatgpt: '✨ ChatGPT Assistant',
      home: '🎯 જ્ઞાન યાત્રા હોમ ડેશબોર્ડ',
      settings: '⚙️ સેટિંગ્સ & API કી'
    };

    if (this.topPageTitle) {
      this.topPageTitle.innerText = titles[viewName] || 'Gyan Yatra Studio';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Render corresponding view
    const navCallback = (target) => this.navigateTo(target);

    switch (viewName) {
      case 'topics':
        renderTopics(this.container, navCallback);
        break;
      case 'workspace':
        renderWorkspace(this.container, navCallback);
        break;
      case 'scriptwriter':
        renderScriptWriter(this.container, navCallback);
        break;
      case 'myvoice':
        renderMyVoice(this.container, navCallback);
        break;
      case 'slideeditor':
        renderSlideEditor(this.container, navCallback);
        break;
      case 'seo':
        renderSEO(this.container, navCallback);
        break;
      case 'seodescription':
        renderSEODescription(this.container, navCallback);
        break;
      case 'package':
        renderProjectPackage(this.container, navCallback);
        break;
      case 'thumbnails':
        renderThumbnails(this.container, navCallback);
        break;
      case 'slideprompts':
        renderSlidePrompts(this.container, navCallback);
        break;
      case 'chatgpt':
        renderChatGPT(this.container, navCallback);
        break;
      case 'analytics':
        renderAnalytics(this.container, navCallback);
        break;
      case 'research':
        renderResearch(this.container, navCallback);
        break;
      case 'settings':
        renderSettings(this.container, navCallback);
        break;
      case 'home':
      default:
        renderTopics(this.container, navCallback);
        break;
    }
  }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.creatorApp = new App();
});
