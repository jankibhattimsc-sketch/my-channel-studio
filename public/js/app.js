import { api } from './api.js?v=101.0';
import { copyToClipboard } from './utils/clipboard.js?v=90.0';
import { projectState } from './utils/projectState.js?v=90.0';
import { renderProjects } from './views/projects.js?v=90.0';
import { renderHome } from './views/home.js?v=100.2';
import { renderPasteTopics } from './views/pastetopics.js?v=99.9';
import { renderMyTopics } from './views/mytopics.js?v=99.9';
import { renderAnalytics } from './views/analytics.js?v=90.0';
import { renderTopics } from './views/topics.js?v=90.0';
import { renderTopicProductionPlanner } from './views/planner.js?v=90.0';
import { renderSEO } from './views/seo.js?v=90.0';
import { renderThumbnails } from './views/thumbnails.js?v=90.0';
import { renderScriptWriter } from './views/scriptwriter.js?v=90.0';
import { renderChatGPT } from './views/chatgpt.js?v=90.0';
import { renderSlidePrompts } from './views/slideprompts.js?v=90.0';
import { renderResearch } from './views/research.js?v=90.0';
import { renderSettings } from './views/settings.js?v=101.0';
import { renderMyVoice } from './views/myvoice.js?v=99.0';
import { renderSlideEditor } from './views/slideeditor.js?v=99.0';
import { renderWorkspace } from './views/workspace.js?v=99.9';
import { renderSEODescription } from './views/seodescription.js?v=99.0';
import { renderEditing } from './views/editing.js?v=99.0';
import { renderCanva } from './views/canva.js?v=99.0';
import { renderVideoEditor } from './views/videoeditor.js?v=101.2';
import { renderVideoEditDemo } from './views/videoEditDemo.js?v=99.0';
import { renderSavedHub } from './views/savedhub.js?v=1.0';
import { renderSavedAudios } from './views/savedaudios.js?v=1.0';
import { renderSmartAsk } from './views/smartask.js?v=101.1';
import { initMobileLinkAndOfflineSystem } from './utils/mobileLinkModal.js?v=99.0';

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
    this.setupProjectStateListeners();
    this.checkOAuthCallback();
    try { initMobileLinkAndOfflineSystem(); } catch (_) { }

    // Route immediately so tools open INSTANTLY on first load
    const hash = window.location.hash.replace('#', '') || 'home';
    this.navigateTo(hash);

    // Refresh channel status non-blocking in background
    this.refreshChannelStatus().catch(err => {
      console.warn('Channel status refresh notice:', err);
    });
  }

  setupProjectStateListeners() {
    const updateChip = () => {
      const active = projectState.getActiveProject();
      const chipEl = document.getElementById('top-project-name');
      if (chipEl && active) {
        chipEl.innerText = active.name && active.name.length > 22
          ? active.name.substring(0, 20) + '...'
          : (active.name || 'પ્રોજેક્ટ્સ મેનેજર');
        chipEl.title = active.name || 'પ્રોજેક્ટ્સ મેનેજર';
      }
    };

    const topicSelect = document.getElementById('top-universal-topic-select');

    const updateTopicDropdown = () => {
      const active = projectState.getActiveProject();
      if (!topicSelect) return;

      const projects = projectState.getProjects();
      let items = [];

      if (Array.isArray(projects) && projects.length > 0) {
        items = projects.map(p => ({
          id: p.id,
          topicId: p.topicId || p.id,
          name: p.topic || p.name || 'બિનશીર્ષક પ્રોજેક્ટ'
        }));
      } else if (active) {
        items = [{
          id: active.id,
          topicId: active.topicId || active.id,
          name: active.topic || active.name || 'બિનશીર્ષક પ્રોજેક્ટ'
        }];
      }

      if (items.length === 0) {
        topicSelect.innerHTML = `<option value="" style="background: #0f172a; color: #ffffff;">કોઈ પ્રોજેક્ટ નથી</option>`;
        return;
      }

      const activeId = active?.id || active?.topicId;

      topicSelect.innerHTML = items.map(t => {
        const isSelected = (t.id === activeId || t.topicId === activeId);
        return `<option value="${t.id}" data-name="${t.name}" ${isSelected ? 'selected' : ''} style="background: #0f172a; color: #ffffff;">${t.name}</option>`;
      }).join('');
    };

    topicSelect?.addEventListener('change', async (e) => {
      const selectedId = e.target.value;
      const selectedOption = e.target.options[e.target.selectedIndex];
      const selectedName = selectedOption?.getAttribute('data-name') || selectedOption?.text || '';
      if (selectedId) {
        projectState.setActiveProject(selectedId);
        await projectState.activateTopicContext(selectedId, selectedName);
        this.navigateTo(this.currentView);
      }
    });

    window.addEventListener('topicContextChanged', () => {
      updateChip();
      updateTopicDropdown();
    });
    window.addEventListener('projectStateUpdated', () => {
      updateChip();
      updateTopicDropdown();
    });
    window.addEventListener('projectsListUpdated', () => {
      updateChip();
      updateTopicDropdown();
    });
    updateChip();
    updateTopicDropdown();

    document.getElementById('top-project-badge-btn')?.addEventListener('click', () => {
      this.navigateTo('projects');
    });
  }

  setupNavigation() {
    // Consolidated click handler for all data-view navigation items
    document.addEventListener('click', (e) => {
      const targetEl = e.target.closest('[data-view]');
      if (targetEl) {
        const target = targetEl.getAttribute('data-view');
        if (target) {
          e.preventDefault();
          this.navigateTo(target);
        }
      }
    });

    // Top Save & Share Quick Button
    document.getElementById('top-quick-share-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigateTo('projects');
    });

    // Top Channel chip click
    document.getElementById('top-channel-chip')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigateTo('settings');
    });

    // Hash change listener (browser back/forward navigation or URL change)
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '').trim();
      const validViews = [
        'home', 'dashboard', 'projects', 'pastetopics', 'customtopics', 'mytopics', 'savedtopics',
        'ideas', 'topics', 'planner', 'productionplanner',
        'slideprompt', 'slideprompts', 'slides', 'slideeditor',
        'script', 'scriptwriter', 'scripteditor', 'voice', 'myvoice', 'videoeditor', 'editing',
        'videoeditdemo', 'workspace', 'thumbnails', 'thumbnail', 'seodescription', 'seo',
        'savedhub', 'saved', 'savedaudios', 'audios', 'smartask', 'promptgpt', 'askgpt',
        'publish', 'publishing', 'chatgpt', 'analytics', 'research', 'settings'
      ];
      if (hash && validViews.includes(hash) && hash !== this.currentView) {
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
    const closeBtn = document.getElementById('btn-close-sidebar-mobile');
    const backdrop = document.getElementById('sidebar-backdrop');
    const sidebar = document.getElementById('sidebar');

    const openMenu = () => {
      sidebar?.classList.add('open');
      if (backdrop) backdrop.style.display = 'block';
    };

    const closeMenu = () => {
      sidebar?.classList.remove('open');
      if (backdrop) backdrop.style.display = 'none';
    };

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (sidebar.classList.contains('open')) {
          closeMenu();
        } else {
          openMenu();
        }
      });
    }

    closeBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      closeMenu();
    });

    backdrop?.addEventListener('click', () => {
      closeMenu();
    });

    document.addEventListener('click', (e) => {
      if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggleBtn?.contains(e.target)) {
        closeMenu();
      }
    });
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

  async navigateTo(viewName) {
    if (!viewName) return;
    this.currentView = viewName;
    if (window.location.hash.replace('#', '') !== viewName) {
      window.location.hash = viewName;
    }

    // Update active nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    // Close mobile sidebar and backdrop if open
    document.getElementById('sidebar')?.classList.remove('open');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (backdrop) backdrop.style.display = 'none';

    // Update page title
    const titles = {
      projects: '📁 વિડીયો ફોલ્ડર્સ મેનેજર (My Video Folders)',
      topics: '💡 Idea (આઇડિયા બ્રેઇનસ્ટોર્મિંગ)',
      ideas: '💡 Idea (આઇડિયા બ્રેઇનસ્ટોર્મિંગ)',
      slideprompts: '📑 ૪. Slide Prompts (સ્લાઇડ પ્રોમ્પ્ટ & ૧૬:૯ White PPT)',
      slideprompt: '📑 ૪. Slide Prompts (સ્લાઇડ પ્રોમ્પ્ટ & ૧૬:૯ White PPT)',
      planner: '📋 Topic Production Planner',
      productionplanner: '📋 Topic Production Planner',
      research: '🔬 નેટ રિસર્ચ (Net Research & Auto Slides)',
      scriptwriter: '📝 ૫. Script (PDF અપલોડ & સ્ક્રિપ્ટ)',
      script: '📝 ૫. Script (PDF અપલોડ & સ્ક્રિપ્ટ)',
      myvoice: '🎙️ સ્લાઇડ ઓડિયો રેકોર્ડર (Live Audio Recorder)',
      voice: '🎙️ સ્લાઇડ ઓડિયો રેકોર્ડર (Live Audio Recorder)',
      videoeditor: '🎥 ૬. Video Editor (વિડીયો નિર્માણ & ઓડિયો)',
      editing: '🎥 ૬. Video Editor (વિડીયો નિર્માણ & ઓડિયો)',
      videoeditdemo: '🎥 વિડીયો એડિટિંગ ડેમોસ્ટ્રેશન (Interactive Demo Prototype)',
      slideeditor: '🎬 ઓડિયો & PDF ઓટો-મેચ એડિટર',
      workspace: '🎬 ૧૦-ઇન-૧ વર્કસ્પેસ (10 In 1 Studio)',
      thumbnails: '🖼️ ૭. Thumbnail Maker (AI પ્રોમ્પ્ટ & ૧૬:૯ કેનવાસ)',
      thumbnail: '🖼️ ૭. Thumbnail Maker (AI પ્રોમ્પ્ટ & ૧૬:૯ કેનવાસ)',
      seodescription: '🏷️ SEO & Publishing (ટાઇટલ, ડિસ્ક્રિપ્શન & Tags)',
      seo: '🏷️ SEO & Publishing (ટાઇટલ, ડિસ્ક્રિપ્શન & Tags)',
      chatgpt: '✨ ChatGPT Assistant',
      smartask: '✨ ૧૨. મારો પ્રશ્ન & ફોટો AI (Prompt → ChatGPT)',
      promptgpt: '✨ ૧૨. મારો પ્રશ્ન & ફોટો AI (Prompt → ChatGPT)',
      askgpt: '✨ ૧૨. મારો પ્રશ્ન & ફોટો AI (Prompt → ChatGPT)',
      home: '📊 ૧. 48h YouTube AI Studio',
      dashboard: '📊 ૧. 48h YouTube AI Studio',
      pastetopics: '📝 ૨. Paste Topics (મારા વિષયો પેસ્ટ કરો)',
      customtopics: '📝 ૨. Paste Topics (મારા વિષયો પેસ્ટ કરો)',
      mytopics: '📋 ૩. My Topics (મારા સેવ કરેલા વિષયો)',
      savedtopics: '📋 ૩. My Topics (મારા સેવ કરેલા વિષયો)',
      settings: '⚙️ સેટિંગ્સ & API કી'
    };

    if (this.topPageTitle) {
      this.topPageTitle.innerText = titles[viewName] || 'Gyan Yatra Studio';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Auto-record last visited tool for the active project so creator can resume seamlessly
    const projectTools = ['pastetopics', 'customtopics', 'mytopics', 'savedtopics', 'topics', 'ideas', 'research', 'slideprompts', 'slideeditor', 'scriptwriter', 'myvoice', 'videoeditor', 'canva', 'seodescription', 'seo', 'workspace'];
    if (projectTools.includes(viewName)) {
      projectState.setLastStep(viewName);
    }

    // Render corresponding view
    const navCallback = (target) => this.navigateTo(target);

    try {
      switch (viewName) {
        case 'home':
        case 'dashboard':
          await renderHome(this.container, navCallback);
          break;
        case 'pastetopics':
        case 'customtopics':
          await renderPasteTopics(this.container, navCallback);
          break;
        case 'mytopics':
        case 'savedtopics':
          await renderMyTopics(this.container, navCallback);
          break;
        case 'projects':
          await renderProjects(this.container, navCallback);
          break;
        case 'ideas':
        case 'topics':
          await renderTopics(this.container, navCallback);
          break;
        case 'planner':
        case 'productionplanner':
          await renderTopicProductionPlanner(this.container, navCallback);
          break;
        case 'slideprompt':
        case 'slideprompts':
          await renderSlidePrompts(this.container, navCallback);
          break;
        case 'slides':
        case 'slideeditor':
          await renderSlideEditor(this.container, navCallback);
          break;
        case 'script':
        case 'scriptwriter':
          await renderScriptWriter(this.container, navCallback);
          break;
        case 'scripteditor':
          await this.navigateTo('videoeditor');
          break;
        case 'voice':
        case 'myvoice':
        case 'slidestudio':
        case 'slidevoicestudio':
        case 'slidevoice':
        case 'slidescript':
          await renderMyVoice(this.container, navCallback);
          break;
        case 'canva':
          await this.navigateTo('thumbnails');
          break;
        case 'editing':
        case 'videoeditor':
          await renderVideoEditor(this.container, navCallback);
          break;
        case 'videoeditdemo':
          await renderVideoEditDemo(this.container, navCallback);
          break;
        case 'workspace':
          await renderWorkspace(this.container, navCallback);
          break;
        case 'thumbnail':
        case 'thumbnails':
          await renderThumbnails(this.container, navCallback);
          break;
        case 'seo':
        case 'seodescription':
          await renderSEODescription(this.container, navCallback);
          break;
        case 'savedhub':
        case 'saved':
          await renderSavedHub(this.container, navCallback);
          break;
        case 'savedaudios':
        case 'audios':
          await renderSavedAudios(this.container, navCallback);
          break;
        case 'chatgpt':
          await renderChatGPT(this.container, navCallback);
          break;
        case 'smartask':
        case 'promptgpt':
        case 'askgpt':
          await renderSmartAsk(this.container, navCallback);
          break;
        case 'analytics':
          await renderAnalytics(this.container, navCallback);
          break;
        case 'research':
          await renderResearch(this.container, navCallback);
          break;
        case 'settings':
          await renderSettings(this.container, navCallback);
          break;
        default:
          if (!this.container || !this.container.innerHTML || this.container.innerHTML.trim() === '') {
            await renderProjects(this.container, navCallback);
          } else {
            console.warn(`[App Navigation] Unrecognized route '${viewName}', preserving active screen.`);
          }
          break;
      }
    } catch (viewErr) {
      console.error(`[View Render Error in '${viewName}']:`, viewErr);
      if (this.container) {
        this.container.innerHTML = `
          <div class="card" style="padding: 30px; text-align: center; margin: 20px;">
            <span style="font-size: 2.5rem;">⚠️</span>
            <h3 style="color: #ef4444; margin: 10px 0;">ટૂલ લોડ કરવામાં ક્ષતિ આવી (${viewName})</h3>
            <p style="color: var(--text-muted); font-family: monospace; font-size: 0.82rem; max-width: 600px; margin: 0 auto 16px auto;">
              ${viewErr.message || viewErr}
            </p>
            <div style="display: flex; gap: 10px; justify-content: center;">
              <button class="btn btn-primary" id="btn-err-fallback-projects" style="font-weight: 800;">
                📁 પ્રોજેક્ટ્સ લિસ્ટ પર જાઓ
              </button>
              <button class="btn btn-outline" id="btn-err-reload" style="font-weight: 700;">
                🔄 ફરી પ્રયાસ કરો
              </button>
            </div>
          </div>
        `;
        this.container.querySelector('#btn-err-fallback-projects')?.addEventListener('click', () => this.navigateTo('projects'));
        this.container.querySelector('#btn-err-reload')?.addEventListener('click', () => this.navigateTo(viewName));
      }
    }
  }
}

// Resilient App Initialization
function bootstrapApp() {
  if (!window.creatorApp) {
    try {
      window.creatorApp = new App();
    } catch (err) {
      console.error('[Gyan Yatra App Bootstrap Error]:', err);
    }
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
  } else {
    // DOM is already parsed / interactive / complete
    bootstrapApp();
  }
}
