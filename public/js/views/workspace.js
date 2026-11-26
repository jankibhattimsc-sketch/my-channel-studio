/**
 * Project-Centric Complete Video Production Workspace (v5)
 * Gyan Yatra AI Studio — All Video Production Stages Connected via Topic ID:
 * Overview ➔ Research (Tool 3) ➔ Slides (Tool 4) ➔ Script (Tool 5) ➔ Voice (Tool 6) ➔
 * Video Editing (Tool 7) ➔ Thumbnail (Tool 8) ➔ SEO (Tool 9) ➔ Final Publish
 */

import { api } from '../api.js';
import { projectState } from '../utils/projectState.js';
import { copyToClipboard, showNoticeToast } from '../utils/clipboard.js';
import { firebaseService } from '../utils/firebaseService.js';
import { formatIndianDateTimeDisplay } from '../utils/dateTimeIntelligence.js';
import { shareProjectVideo, shareToWhatsApp } from '../utils/videoShare.js';

// Real Tool Views
import { renderTopics } from './topics.js';
import { renderResearch } from './research.js';
import { renderSlidePrompts } from './slideprompts.js';
import { renderSlideEditor } from './slideeditor.js';
import { renderScriptWriter } from './scriptwriter.js';
import { renderCanva } from './canva.js';
import { renderThumbnails } from './thumbnails.js';
import { renderSEO } from './seo.js';
import { renderSEODescription } from './seodescription.js';
import { renderMyVoice } from './myvoice.js';
import { renderEditing } from './editing.js';
import { renderVideoEditor } from './videoeditor.js?v=99.9';
import { renderProjectPackage } from './projectpackage.js';

export const PRODUCTION_SECTIONS = [
  { id: 'overview', num: 0, title: 'ઓવરવ્યૂ', titleEn: 'Overview', icon: '📊', desc: 'પ્રોજેક્ટ સારાંશ & પ્રગતિ' },
  { id: 'ideas', num: 1, title: '૧. Idea', titleEn: 'Idea', icon: '💡', desc: 'Tool 1: વિડીયો આઈડિયા & નોટબુક' },
  { id: 'research', altId: 'slideprompt', num: 2, title: '૨. Research', titleEn: 'AI Web Research & Slide Studio', icon: '🔬', desc: 'Tool 2: નેટ રિસર્ચ & ઓટો સ્લાઇડ્સ' },
  { id: 'slideprompt', num: 2, title: '૨. Slide Prompt', titleEn: 'Slide Prompt', icon: '📑', desc: 'Tool 2: NotebookLM ૧૬:૯ સ્લાઇડ્સ', hidden: true },
  { id: 'script', num: 3, title: '૩. Script', titleEn: 'Script Studio', icon: '📝', desc: 'Tool 3: PDF & ગુજરાતી સ્ક્રિપ્ટ' },
  { id: 'voice', num: 4, title: '૪. Live Audio (અવાજ અને વિડીયો / Voice & Video Studio)', titleEn: 'Live Slide Audio Recorder', icon: '🎙️', desc: 'Tool 4: સ્લાઇડ સામે લાઇવ ઓડિયો રેકોર્ડિંગ', hidden: true },
  { id: 'videoeditor', num: 4, title: '૪. Video Editor', titleEn: 'Slide Clip Combiner', icon: '🎬', desc: 'Tool 4: બધી સ્લાઇડ ક્લિપ્સ જોડીને 1080p વિડીયો બનાવો' /* id: 'videoeditor', num: 5 */ },
  { id: 'thumbnails', num: 6, title: '૬. Thumbnail', titleEn: 'Thumbnail Studio', icon: '🖼️', desc: 'Tool 6: CTR બૂસ્ટ ૧૬:૯ થંબનેલ' },
  { id: 'seo', num: 7, title: '૭. SEO', titleEn: 'SEO Studio', icon: '🏷️', desc: 'Tool 7: વાયરલ ટાઇટલ & ૩૫ ટેગ્સ' },
  { id: 'publish', num: 8, title: '૮. અંતિમ પબ્લિશ', titleEn: 'Final Publish', icon: '🚀', desc: '૮-સ્ટેજ ચેકલિસ્ટ & પ્રકાશન' }
];

export async function renderWorkspace(container, navigateTo) {
  // Ensure we have an active project
  let project = projectState.getActiveProject();
  if (!project && typeof projectState.ensureActiveProject === 'function') {
    try {
      projectState.ensureActiveProject();
      project = projectState.getActiveProject();
    } catch (_) { }
  }

  // Auto-recovery: If no active project in memory, fetch active/first topic from central repository
  if (!project) {
    try {
      const activeTopicId = localStorage.getItem('gyan_active_topic_id');
      const res = await api.getCentralTopics();
      if (res && res.topics && res.topics.length > 0) {
        const target = (activeTopicId && res.topics.find(t => t.topicId === activeTopicId)) || res.topics[0];
        project = await projectState.activateTopicContext(target.topicId, target.topicName, target);
      }
    } catch (_) {}
  }

  if (!project) {
    container.innerHTML = `
      <div class="card" style="padding: 40px; text-align: center; max-width: 600px; margin: 40px auto; background: #FFFFFF; border: 2px solid #E5E7EB; border-radius: 12px;">
        <span style="font-size: 3rem;">🎬</span>
        <h2 style="color: #102A56; margin: 12px 0 8px 0; font-weight: 800;">કોઈ સક્રિય ટોપિક પસંદ થયેલ નથી</h2>
        <p style="color: #64748B; margin-bottom: 24px; font-size: 0.95rem;">કૃપા કરીને ૧. 48h YouTube AI Studio માંથી વિડીયો ટોપિક પસંદ કરો.</p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button id="btn-goto-planner-ws" class="btn btn-primary" style="background: #102A56; font-weight: 800; border: none; padding: 10px 20px;">
            📊 ૧. 48h YouTube AI Studio પર જાઓ
          </button>
        </div>
      </div>
    `;
    container.querySelector('#btn-goto-planner-ws')?.addEventListener('click', () => navigateTo('home'));
    return;
  }

  // Ensure project data is migrated and project-scoped version is anchored
  projectState.migrateEmbeddedDataToProjectScoped(project.id);

  // Restore Stop-and-Resume State
  let wsState = projectState.getWorkspaceState(project.id) || {};
  let currentSection = wsState.activeSection || project.lastStep || 'overview';

  // Normalize legacy step names to workspace sections
  const legacyToWorkspaceMap = {
    topics: 'ideas',
    research: 'research',
    slideprompts: 'research',
    slideprompt: 'research',
    slideeditor: 'research',
    slides: 'research',
    scriptwriter: 'script',
    scripteditor: 'script',
    editing: 'videoeditor',
    publishing: 'publish',
    videoeditor: 'videoeditor',
    myvoice: 'voice',
    thumbnail: 'thumbnails',
    thumbnails: 'thumbnails',
    canva: 'thumbnails',
    seo: 'seo',
    seodescription: 'seo',
    workspace: 'overview',
    publish: 'publish'
  };
  if (legacyToWorkspaceMap[currentSection]) {
    currentSection = legacyToWorkspaceMap[currentSection];
  }

  // Cloud sync status state
  let syncStatus = navigator.onLine ? 'saved' : 'offline';
  let syncStatusText = navigator.onLine ? '✓ Cloud માં સચવાયેલ' : '📶 Offline Mode';

  // Calculate project completion percentage
  function calculateProgress() {
    let score = 0;
    if (project.ideas && project.ideas.length > 0) score += 10;
    if (project.slide?.tool2Prompt) score += 10;
    if (project.slide?.slides && project.slide.slides.length > 0) score += 20;
    if (project.script?.fullText || (project.script?.sections && project.script.sections.length > 0)) score += 20;
    if (project.thumbnail?.dalleShortPrompt || project.thumbnail?.gujaratiWords) score += 10;
    if (project.seo?.title && project.seo?.description) score += 15;
    if (project.voice?.hasSavedAudio || project.voice?.audioUrl) score += 15;
    return Math.min(100, score);
  }

  // Internal Navigator that keeps the user inside this exact topic workspace
  function internalNavigate(target) {
    if (target === 'projects') {
      navigateTo('projects');
      return;
    }
    if (target === 'planner') {
      navigateTo('planner');
      return;
    }
    const mapped = legacyToWorkspaceMap[target] || target;
    if (PRODUCTION_SECTIONS.some(s => s.id === mapped)) {
      switchSection(mapped);
    } else {
      navigateTo(target);
    }
  }

  function switchSection(sectionId) {
    currentSection = sectionId;
    projectState.setWorkspaceState(project.id, {
      activeSection: sectionId,
      scrollOffset: window.scrollY || 0
    });
    renderMainWorkspace();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderMainWorkspace() {
    project = projectState.getActiveProject();
    const progressPct = calculateProgress();
    const lastSavedIso = project.workspaceState?.lastSavedAt || project.updatedAt || project.createdAt;
    const formattedLastSaved = formatIndianDateTimeDisplay(lastSavedIso);
    const activeTopicId = project.topicId || project.id;

    const visibleSections = PRODUCTION_SECTIONS.filter(s => !s.hidden);
    const currentSecIdx = visibleSections.findIndex(s => s.id === currentSection);
    const prevSec = currentSecIdx > 0 ? visibleSections[currentSecIdx - 1] : null;
    const nextSec = currentSecIdx < visibleSections.length - 1 ? visibleSections[currentSecIdx + 1] : null;

    container.innerHTML = `
      <!-- TOP STICKY PROJECT WORKSPACE HEADER -->
      <div class="card workspace-sticky-header" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95)); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: var(--radius-lg); padding: 18px 24px; margin-bottom: 18px; box-shadow: 0 10px 35px rgba(0, 0, 0, 0.5);">
        
        <!-- Top Row: Back, Topic ID, Title, Action Controls -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 14px;">
          
          <!-- Left: Back to Home & Topic Identity -->
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <button id="ws-btn-back-planner" class="btn btn-outline btn-sm" style="font-weight: 800; border-color: #38bdf8; color: #38bdf8; display: inline-flex; align-items: center; gap: 6px; background: rgba(56,189,248,0.1);" title="૧. 48h YouTube AI Studio પર પાછા જાઓ">
              <span>📊</span> 48h Studio
            </button>

            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.8rem; background: rgba(56, 189, 248, 0.15); padding: 4px 10px; border-radius: 10px; border: 1px solid rgba(56, 189, 248, 0.3);">🎬</span>
              <div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <!-- Permanent Topic ID Badge -->
                  <span class="badge" style="background: #102A56; color: #38bdf8; border: 1.5px solid #38bdf8; font-family: monospace; font-weight: 800; font-size: 0.85rem; padding: 3px 8px; border-radius: 6px;">
                    📌 ID: ${activeTopicId}
                  </span>
                  
                  <h1 id="ws-project-title-display" style="font-size: 1.25rem; font-weight: 900; color: #ffffff; margin: 0; letter-spacing: -0.3px;">
                    ${project.name}
                  </h1>
                  
                  <button id="ws-btn-rename-project" title="પ્રોજેક્ટનું નામ બદલો" style="background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: #94a3b8; font-size: 0.72rem; padding: 2px 6px; cursor: pointer;">
                    ✏️ Rename
                  </button>
                </div>

                <div style="display: flex; align-items: center; gap: 10px; margin-top: 3px; font-size: 0.78rem; flex-wrap: wrap;">
                  <span style="color: #38bdf8; font-weight: 700; background: rgba(56,189,248,0.1); padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(56,189,248,0.25);">
                    🎬 10 In 1 Studio
                  </span>
                  <span style="color: var(--text-muted);">
                    🕒 છેલ્લો સેવ: <strong style="color: #e2e8f0;">${formattedLastSaved}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Prev / Next Navigation, Sync Status Badge, Version History -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            
            <!-- Previous Step Button -->
            <button id="ws-btn-header-prev" class="btn btn-outline btn-sm" ${!prevSec ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : 'style="font-weight: 800; border-color: rgba(255,255,255,0.3); color: #ffffff;"'} title="${prevSec ? `પાછલું પગલું: ${prevSec.title}` : 'આ પ્રથમ પગલું છે'}">
              <span>←</span> પાછલું પગલું
            </button>

            <!-- Next Step Button -->
            <button id="ws-btn-header-next" class="btn btn-primary btn-sm" ${!nextSec ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : 'style="font-weight: 800; background: linear-gradient(135deg, #0284c7, #0369a1); border: none;"'} title="${nextSec ? `આગળનું પગલું: ${nextSec.title}` : 'આ અંતિમ પગલું છે'}">
              આગળનું પગલું <span>→</span>
            </button>

            <!-- Cloud Sync Status Pill -->
            <div id="ws-sync-status-badge" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.12); border: 1px solid #10b981; color: #34d399; padding: 5px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800;">
              <span class="status-dot ${syncStatus === 'saving' ? 'warning' : (syncStatus === 'offline' ? 'offline' : '')}"></span>
              <span id="ws-sync-status-text">${syncStatusText}</span>
            </div>

            <!-- Version History Button -->
            <button id="ws-btn-open-version-history" class="btn btn-outline btn-sm" style="font-weight: 700; border-color: #8b5cf6; color: #c4b5fd; display: inline-flex; align-items: center; gap: 4px; background: rgba(139, 92, 246, 0.1); font-size: 0.75rem;" title="આ પ્રોજેક્ટની વર્ઝન હિસ્ટ્રી">
              <span>🕒</span> વર્ઝન હિસ્ટ્રી
            </button>
          </div>
        </div>

        <!-- Progress Bar Strip -->
        <div style="display: flex; align-items: center; gap: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08);">
          <div style="flex: 1; background: rgba(0,0,0,0.4); height: 8px; border-radius: 4px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06);">
            <div style="width: ${progressPct}%; height: 100%; background: linear-gradient(90deg, #38bdf8, #10b981); transition: width 0.3s ease;"></div>
          </div>
          <span style="font-size: 0.78rem; font-weight: 800; color: #34d399; white-space: nowrap;">
            વિડીયો નિર્માણ પ્રગતિ: ${progressPct}%
          </span>
        </div>

        <!-- 9 PRODUCTION STAGE NAVIGATION TABS (Connected Sequence) -->
        <div class="workspace-tabs-bar" style="display: flex; gap: 6px; overflow-x: auto; padding: 10px 2px 2px 2px; margin-top: 8px; -webkit-overflow-scrolling: touch;">
          ${PRODUCTION_SECTIONS.filter(sec => !sec.hidden).map(sec => {
      const isActive = currentSection === sec.id;
      return `
              <button class="ws-tab-btn ${isActive ? 'active' : ''}" data-section="${sec.id}" style="
                flex-shrink: 0;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 7px 14px;
                border-radius: 8px;
                font-size: 0.82rem;
                font-weight: ${isActive ? '800' : '600'};
                background: ${isActive ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'rgba(255, 255, 255, 0.04)'};
                color: ${isActive ? '#ffffff' : '#cbd5e1'};
                border: 1px solid ${isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'};
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: ${isActive ? '0 2px 10px rgba(2, 132, 199, 0.4)' : 'none'};
              ">
                <span style="font-size: 0.95rem;">${sec.icon}</span>
                <span>${sec.title}</span>
              </button>
            `;
    }).join('')}
        </div>
      </div>

      <!-- WORKSPACE STAGE CONTENT CONTAINER (Mounts actual tools dynamically) -->
      <div id="workspace-stage-content" style="min-height: 500px;"></div>

      <!-- STICKY BOTTOM STEPPER BAR -->
      <div class="card workspace-bottom-stepper" style="background: rgba(15, 23, 42, 0.95); border: 1.5px solid rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 14px 20px; margin-top: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.2rem;">🧭</span>
          <div>
            <div style="font-size: 0.78rem; color: #94a3b8;">
              વર્કફ્લો પ્રક્રિયા: <strong>પગલું ${currentSecIdx} / ${PRODUCTION_SECTIONS.length - 1}</strong>
            </div>
            <div style="font-weight: 800; font-size: 0.92rem; color: #ffffff;">
              ${PRODUCTION_SECTIONS[currentSecIdx].title} (${PRODUCTION_SECTIONS[currentSecIdx].titleEn})
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <button id="ws-btn-bottom-prev" class="btn btn-outline btn-sm" ${!prevSec ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : 'style="font-weight: 800; border-color: rgba(255,255,255,0.25); color: #cbd5e1;"'}>
            ← પાછલું પગલું ${prevSec ? `(${prevSec.title})` : ''}
          </button>
          <button id="ws-btn-bottom-next" class="btn btn-primary btn-sm" ${!nextSec ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : 'style="font-weight: 900; background: linear-gradient(135deg, #10b981, #059669); border: none; box-shadow: 0 4px 12px rgba(16,185,129,0.35);"'}>
            ${nextSec ? `આગળનું પગલું (${nextSec.title}) →` : 'સંપૂર્ણ પૂર્ણ ✓'}
          </button>
        </div>
      </div>

      <!-- VERSION HISTORY MODAL -->
      <div id="ws-modal-version-history" class="custom-modal-backdrop" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 99999; align-items: center; justify-content: center; padding: 20px;">
        <div class="card" style="width: 100%; max-width: 650px; max-height: 85vh; display: flex; flex-direction: column; background: #0f172a; border: 1.5px solid #8b5cf6; box-shadow: 0 20px 50px rgba(0,0,0,0.8); border-radius: 14px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 1.3rem; font-weight: 900; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>🕒</span> વર્ઝન હિસ્ટ્રી & રીસ્ટોર (Version History)
            </h3>
            <button id="ws-btn-close-version-modal" class="btn btn-outline btn-sm" style="border: none; font-size: 1.2rem; padding: 2px 8px; color: var(--text-muted);">✕</button>
          </div>

          <div style="font-size: 0.85rem; color: #c4b5fd; margin-bottom: 14px; background: rgba(139, 92, 246, 0.1); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(139, 92, 246, 0.25);">
            💡 પસંદ કરેલા સ્ટેજ (<strong>${PRODUCTION_SECTIONS.find(s => s.id === currentSection)?.title || currentSection}</strong>) માટે સાચવેલા તમામ વર્ઝન નીચે ઉપલબ્ધ છે.
          </div>

          <div id="ws-version-history-list" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; padding-right: 4px;">
            <!-- Rendered dynamically -->
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px;">
            <button id="ws-btn-save-new-version-modal" class="btn btn-primary" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); border: none; font-weight: 800;">
              ➕ નવું વર્ઝન સેવ કરો
            </button>
            <button id="ws-btn-close-version-modal-bottom" class="btn btn-secondary">બંધ કરો</button>
          </div>
        </div>
      </div>
    `;

    // Attach Event Listeners to Header & Controls
    container.querySelector('#ws-btn-back-planner')?.addEventListener('click', () => navigateTo('home'));
    container.querySelector('#ws-btn-back-projects')?.addEventListener('click', () => navigateTo('projects'));

    // Rename Project Handler
    container.querySelector('#ws-btn-rename-project')?.addEventListener('click', () => {
      const newName = prompt('પ્રોજેક્ટનું નવું નામ આપો:', project.name);
      if (newName && newName.trim()) {
        projectState.renameProject(project.id, newName.trim());
        showNoticeToast(`✓ પ્રોજેક્ટનું નામ બદલીને "${newName.trim()}" થયું!`, 'success');
        renderMainWorkspace();
      }
    });

    // Prev / Next Navigation Handlers
    const handlePrev = () => {
      if (prevSec) switchSection(prevSec.id);
    };
    const handleNext = () => {
      if (nextSec) switchSection(nextSec.id);
    };

    container.querySelector('#ws-btn-header-prev')?.addEventListener('click', handlePrev);
    container.querySelector('#ws-btn-header-next')?.addEventListener('click', handleNext);
    container.querySelector('#ws-btn-bottom-prev')?.addEventListener('click', handlePrev);
    container.querySelector('#ws-btn-bottom-next')?.addEventListener('click', handleNext);

    // Version History Modal Handlers
    const versionModal = container.querySelector('#ws-modal-version-history');
    const openVersionModal = () => {
      if (versionModal) {
        versionModal.style.display = 'flex';
        renderVersionHistoryList();
      }
    };
    const closeVersionModal = () => {
      if (versionModal) versionModal.style.display = 'none';
    };

    container.querySelector('#ws-btn-open-version-history')?.addEventListener('click', openVersionModal);
    container.querySelector('#ws-btn-close-version-modal')?.addEventListener('click', closeVersionModal);
    container.querySelector('#ws-btn-close-version-modal-bottom')?.addEventListener('click', closeVersionModal);

    // Tab Navigation Click Handlers
    container.querySelectorAll('.ws-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetSec = btn.getAttribute('data-section');
        if (targetSec && targetSec !== currentSection) {
          switchSection(targetSec);
        }
      });
    });

    // Mount the active stage tool
    mountActiveStage();
  }

  function renderVersionHistoryList() {
    const listEl = container.querySelector('#ws-version-history-list');
    if (!listEl) return;

    const type = currentSection === 'slides' ? 'slides'
      : (currentSection === 'script' || currentSection === 'scripteditor') ? 'scripts'
        : (currentSection === 'research' || currentSection === 'slideprompt') ? 'slidePrompts'
          : currentSection === 'thumbnail' ? 'thumbnails'
            : currentSection === 'seo' ? 'seo'
              : 'scripts';

    const history = projectState.getVersionHistory(project.id, type) || [];

    if (history.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
          <span>⚪</span> આ સ્ટેજ માટે હજુ કોઈ વર્ઝન હિસ્ટ્રી સેવ થઈ નથી.<br>
          "નવું વર્ઝન સેવ કરો" બટન દબાવીને પ્રથમ વર્ઝન સાચવો.
        </div>
      `;
      return;
    }

    listEl.innerHTML = history.map((ver, idx) => {
      const isCurrent = idx === 0;
      const formattedTime = formatIndianDateTimeDisplay(ver.timestamp);
      return `
        <div style="background: rgba(0,0,0,0.35); border: 1.5px solid ${isCurrent ? '#8b5cf6' : 'rgba(255,255,255,0.08)'}; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 800; font-size: 0.95rem; color: #fff;">${ver.label || `Version #${ver.versionNumber || idx + 1}`}</span>
              ${isCurrent ? `<span class="badge" style="background: rgba(139,92,246,0.25); color: #c4b5fd; border: 1px solid #8b5cf6; font-size: 0.7rem;">સક્રિય (Current)</span>` : ''}
            </div>
            <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 3px;">
              🕒 ${formattedTime} • ID: <code style="color: #94a3b8;">${ver.versionId.substring(0, 14)}</code>
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="btn btn-outline btn-xs ws-btn-preview-version" data-id="${ver.versionId}" style="border-color: rgba(255,255,255,0.2); font-weight: 700;">
              👁️ પ્રિવ્યૂ
            </button>
            <button class="btn btn-primary btn-xs ws-btn-restore-version" data-id="${ver.versionId}" style="background: #0284c7; border: none; font-weight: 800;">
              🔄 રીસ્ટોર
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach restore listeners
    listEl.querySelectorAll('.ws-btn-restore-version').forEach(btn => {
      btn.addEventListener('click', () => {
        const vId = btn.getAttribute('data-id');
        if (confirm('શું તમે ખરેખર આ વર્ઝન રીસ્ટોર કરવા માંગો છો?\nવર્તમાન લખાણનું ઓટો-સેફ્ટી સ્નેપશોટ લેવાશે.')) {
          const res = projectState.restoreVersionSnapshot(project.id, type, vId);
          if (res.success) {
            showNoticeToast('✓ જૂનું વર્ઝન સફળતાપૂર્વક રીસ્ટોર થઈ ગયું!', 'success');
            container.querySelector('#ws-modal-version-history').style.display = 'none';
            renderMainWorkspace();
          } else {
            alert('રીસ્ટોર કરવામાં ભૂલ: ' + (res.reason || 'અજ્ઞાત ભૂલ'));
          }
        }
      });
    });
  }

  function mountActiveStage() {
    const stageContainer = container.querySelector('#workspace-stage-content');
    if (!stageContainer) return;
    stageContainer.innerHTML = '';

    // Route to actual working tool
    switch (currentSection) {
      case 'overview':
        renderOverviewDashboard(stageContainer);
        break;

      case 'ideas':
        renderTopics(stageContainer, internalNavigate);
        break;

      case 'research':
      case 'slideprompt':
        renderResearch(stageContainer, internalNavigate);
        break;

      case 'slides':
        renderSlideEditor(stageContainer, internalNavigate);
        break;

      case 'script':
      case 'scripteditor':
        renderScriptWriter(stageContainer, internalNavigate);
        break;

      case 'voice':
        renderMyVoice(stageContainer, internalNavigate);
        break;

      case 'videoeditor':
        renderVideoEditor(stageContainer, internalNavigate);
        break;

      case 'thumbnail':
      case 'thumbnails':
        renderThumbnails(stageContainer, internalNavigate);
        break;

      case 'seo':
      case 'seodescription':
        renderSEODescription(stageContainer, internalNavigate);
        break;

      case 'publish':
      case 'publishing':
        renderPublishView(stageContainer);
        break;

      default:
        renderOverviewDashboard(stageContainer);
        break;
    }
  }

  function renderOverviewDashboard(dashContainer) {
    const p = projectState.getActiveProject();
    const slidesCount = Array.isArray(p.slide?.slides) ? p.slide.slides.length : 0;
    const scriptSecCount = Array.isArray(p.script?.sections) ? p.script.sections.length : 0;
    const hasVoice = Boolean(p.voice?.hasSavedAudio || p.voice?.audioUrl || p.voice?.filename);
    const hasThumb = Boolean(p.thumbnail?.dalleShortPrompt || p.thumbnail?.gujaratiWords);
    const hasSEO = Boolean(p.seo?.title && p.seo?.description);
    const ideasCount = Array.isArray(p.ideas) ? p.ideas.length : 0;
    const topicId = p.topicId || p.id;

    dashContainer.innerHTML = `
      <!-- Hero Welcome Strip -->
      <div class="card" style="margin-bottom: 22px; padding: 22px 26px; background: linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.95)); border: 1.5px solid #8b5cf6; border-radius: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span class="badge" style="background: rgba(139,92,246,0.25); color: #c4b5fd; border: 1px solid #8b5cf6; font-size: 0.75rem; font-weight: 800; padding: 4px 10px;">
                CONNECTED WORKFLOW STUDIO
              </span>
              <span class="badge" style="background: #102A56; color: #38bdf8; border: 1px solid #38bdf8; font-family: monospace; font-weight: 800; font-size: 0.75rem;">
                Topic ID: ${topicId}
              </span>
            </div>
            <h2 style="font-size: 1.5rem; font-weight: 900; color: #ffffff; margin: 4px 0 6px 0;">
              વિડીયો પ્રોડક્શન હબ: ${p.name}
            </h2>
            <p style="color: #cbd5e1; font-size: 0.88rem; margin: 0; max-width: 650px;">
              આ એક જ સંગઠિત વર્કસ્પેસમાં Topic ID <strong>${topicId}</strong> સાથે બધા ૭ ટૂલ્સ સીધા જોડાયેલા છે.
            </p>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="btn-start-production-hero" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: 900; padding: 12px 24px; box-shadow: 0 4px 18px rgba(16,185,129,0.45); display: flex; align-items: center; gap: 8px;">
              <span>🚀</span> નિર્માણ શરૂ કરો (Start Step 1)
            </button>
            <button id="btn-goto-planner-from-hero" class="btn btn-outline" style="border-color: #38bdf8; color: #38bdf8; font-weight: 800; padding: 12px 18px;">
              📊 ૧. 48h Studio
            </button>
          </div>
        </div>
      </div>

      <!-- 8 Production Stages Interactive Cards Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-bottom: 24px;">
        ${PRODUCTION_SECTIONS.filter(s => s.id !== 'overview' && !s.hidden).map(sec => {
      let statusText = '⚪ શરૂ કરવાનું બાકી';
      let statusColor = '#94a3b8';
      let isComplete = false;

      if (sec.id === 'ideas') {
        isComplete = ideasCount > 0;
        statusText = isComplete ? `✓ ${ideasCount} રિસર્ચ આઈડિયા તૈયાર` : '⚪ રિસર્ચ ખાલી છે';
        statusColor = isComplete ? '#10b981' : '#94a3b8';
      } else if (sec.id === 'research' || sec.id === 'slideprompt') {
        isComplete = Boolean(p.slide?.tool2Prompt || slidesCount > 0);
        statusText = isComplete ? (slidesCount > 0 ? `✓ ${slidesCount} સ્લાઇડ્સ તૈયાર` : '✓ રિસર્ચ તૈયાર') : '⚪ રિસર્ચ & સ્લાઇડ્સ બાકી';
        statusColor = isComplete ? '#10b981' : '#94a3b8';
      } else if (sec.id === 'script') {
        isComplete = scriptSecCount > 0 || Boolean((p.script?.fullText || p.script?.rawText || '').trim());
        statusText = isComplete ? `✓ સ્ક્રિપ્ટ તૈયાર (${scriptSecCount > 0 ? scriptSecCount + ' સ્લાઇડ્સ' : 'સંપૂર્ણ'})` : '⚪ સ્ક્રિપ્ટ બાકી';
        statusColor = isComplete ? '#10b981' : '#94a3b8';
      } else if (sec.id === 'voice') {
        isComplete = hasVoice;
        statusText = isComplete ? '✓ ઓડિયો ઉપલબ્ધ' : '⚪ અવાજ રેકોર્ડ બાકી';
        statusColor = isComplete ? '#10b981' : '#94a3b8';
      } else if (sec.id === 'videoeditor') {
        isComplete = slidesCount > 0 && hasVoice;
        statusText = isComplete ? '✓ વિડીયો એડિટર રેડી' : '⚪ ઓડિયો/સ્લાઇડ બાકી';
        statusColor = isComplete ? '#10b981' : '#94a3b8';
      } else if (sec.id === 'thumbnails') {
        isComplete = hasThumb;
        statusText = isComplete ? '✓ થંબનેલ પ્લાન રેડી' : '⚪ થંબનેલ બાકી';
        statusColor = isComplete ? '#10b981' : '#94a3b8';
      } else if (sec.id === 'seo') {
        isComplete = hasSEO;
        statusText = isComplete ? '✓ ટાઈટલ & ડિસ્ક્રિપ્શન રેડી' : '⚪ SEO બાકી';
        statusColor = isComplete ? '#10b981' : '#94a3b8';
      } else if (sec.id === 'publish') {
        isComplete = Boolean(p.isPublished);
        statusText = isComplete ? '✓ પ્રકાશિત થયેલ (Published)' : '🚀 પ્રકાશન માટે તૈયાર';
        statusColor = isComplete ? '#10b981' : '#38bdf8';
      }

      return `
            <div class="card ws-quick-jump-card" data-target="${sec.id}" style="padding: 16px; border: 1.5px solid rgba(255,255,255,0.08); background: rgba(15, 23, 42, 0.6); border-radius: 12px; cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <span style="font-size: 1.4rem; background: rgba(255,255,255,0.06); padding: 4px 8px; border-radius: 8px;">${sec.icon}</span>
                  <span style="font-size: 0.76rem; font-weight: 800; color: ${statusColor};">${statusText}</span>
                </div>
                <h3 style="font-size: 1.05rem; font-weight: 800; color: #ffffff; margin: 0 0 4px 0;">${sec.title}</h3>
                <p style="font-size: 0.78rem; color: var(--text-muted); margin: 0;">${sec.desc}</p>
              </div>
              <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: flex-end;">
                <span style="font-size: 0.78rem; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 4px;">
                  ઓપન ટૂલ ➔
                </span>
              </div>
            </div>
          `;
    }).join('')}
      </div>

      <!-- Core Asset Files Quick Download Strip -->
      <div class="card" style="padding: 18px 22px; border: 1.5px solid rgba(56, 189, 248, 0.25); background: rgba(0,0,0,0.3); border-radius: 12px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <span style="font-size: 0.9rem; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 6px;">
            <span>📦</span> આ પ્રોજેક્ટની મુખ્ય ફાઇલો (Direct Asset Files):
          </span>
          <button id="ws-btn-download-all-bundle" class="btn btn-outline btn-xs" style="font-weight: 800; border-color: #38bdf8; color: #38bdf8;">
            📦 આખો પ્રોજેક્ટ ડાઉનલોડ કરો
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px;">
          <div style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); padding: 10px; border-radius: 8px; font-size: 0.8rem;">
            <div style="color: #34d399; font-weight: 800;">📝 સ્ક્રિપ્ટ:</div>
            <div style="color: #e2e8f0; font-family: monospace; font-size: 0.75rem; margin-top: 2px;">${p.script?.customName || 'script.txt'}</div>
          </div>
          <div style="background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.25); padding: 10px; border-radius: 8px; font-size: 0.8rem;">
            <div style="color: #c4b5fd; font-weight: 800;">📑 સ્લાઇડ્સ PPT:</div>
            <div style="color: #e2e8f0; font-family: monospace; font-size: 0.75rem; margin-top: 2px;">${p.slide?.importedPresentation?.filename || 'કોઈ ફાઇલ અપલોડ નથી'}</div>
          </div>
          <div style="background: rgba(236,72,153,0.08); border: 1px solid rgba(236,72,153,0.25); padding: 10px; border-radius: 8px; font-size: 0.8rem;">
            <div style="color: #f472b6; font-weight: 800;">🎙️ અવાજ ઓડિયો:</div>
            <div style="color: #e2e8f0; font-family: monospace; font-size: 0.75rem; margin-top: 2px;">${p.voice?.customName || 'voice.wav'}</div>
          </div>
          <div style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); padding: 10px; border-radius: 8px; font-size: 0.8rem;">
            <div style="color: #fbbf24; font-weight: 800;">🖼️ થંબનેલ પ્લાન:</div>
            <div style="color: #e2e8f0; font-family: monospace; font-size: 0.75rem; margin-top: 2px;">${p.thumbnail?.customName || 'thumbnail.png'}</div>
          </div>
          <div style="background: rgba(37,99,235,0.08); border: 1px solid rgba(37,99,235,0.25); padding: 10px; border-radius: 8px; font-size: 0.8rem;">
            <div style="color: #60a5fa; font-weight: 800; display: flex; justify-content: space-between; align-items: center;">
              <span>🎬 1080p વિડીયો:</span>
              ${p.editing?.lastExportedVideoUrl ? `<button id="ws-btn-quick-share-video" type="button" class="btn btn-xs" style="background: linear-gradient(135deg, #25D366, #128C7E); color: #fff; border: none; padding: 2px 8px; font-size: 0.7rem; border-radius: 4px; cursor: pointer;">📲 શેર</button>` : ''}
            </div>
            <div style="color: #e2e8f0; font-family: monospace; font-size: 0.75rem; margin-top: 2px;">${p.editing?.lastExportedFilename || (p.editing?.lastExportedVideoUrl ? 'presentation_1080p.mp4' : 'હજુ વિડીયો બનાવવાનો બાકી')}</div>
          </div>
        </div>
      </div>
    `;

    dashContainer.querySelector('#ws-btn-quick-share-video')?.addEventListener('click', (e) => {
      shareToWhatsApp(p, { triggerButton: e.currentTarget });
    });

    dashContainer.querySelector('#btn-start-production-hero')?.addEventListener('click', () => {
      switchSection('ideas');
    });

    dashContainer.querySelector('#btn-goto-planner-from-hero')?.addEventListener('click', () => {
      navigateTo('home');
    });

    dashContainer.querySelectorAll('.ws-quick-jump-card').forEach(card => {
      card.addEventListener('click', () => {
        const target = card.getAttribute('data-target');
        if (target) switchSection(target);
      });
    });

    dashContainer.querySelector('#ws-btn-download-all-bundle')?.addEventListener('click', () => {
      projectState.downloadFullProjectFolder(p.id);
      showNoticeToast('📦 આખો પ્રોજેક્ટ પેકેજ ડાઉનલોડ થઈ ગયો! ✓', 'success');
    });
  }

  // --- STAGE 8: FINAL PUBLISH & 7-STAGE CHECKLIST VIEW ---
  async function renderPublishView(publishContainer) {
    const p = projectState.getActiveProject();
    const topicId = p.topicId || p.id;

    // Fetch live stage status from central database
    let serverTopic = null;
    try {
      const res = await api.getCentralTopicById(topicId);
      if (res && res.topic) serverTopic = res.topic;
    } catch (err) {
      console.warn('[PublishView Central Load]:', err);
    }

    const stages = serverTopic?.stages || {
      verification: Boolean(p.ideas && p.ideas.length > 0),
      slides: Boolean(p.slide?.slides?.length > 0 || p.slide?.tool2Prompt),
      script: Boolean(p.script?.fullText || p.script?.sections?.length > 0),
      voice: Boolean(p.voice?.hasSavedAudio || p.voice?.audioUrl),
      videoEditing: Boolean(p.videoeditor?.isCompleted || (p.slide?.slides?.length > 0 && p.voice?.audioUrl)),
      thumbnail: Boolean(p.thumbnail?.dalleShortPrompt || p.thumbnail?.gujaratiWords),
      seo: Boolean(p.seo?.title && p.seo?.description)
    };

    const isPublished = Boolean(serverTopic?.isPublished || p.isPublished);

    const STAGE_CONFIGS = [
      { key: 'verification', name: '૧. રિસર્ચ & વેરિફિકેશન', toolSec: 'ideas', icon: '💡' },
      { key: 'slides', name: '૨. સ્લાઇડ્સ સ્ટુડિયો (૧૬:૯)', toolSec: 'slideprompt', icon: '📑' },
      { key: 'script', name: '૩. સ્ક્રિપ્ટ સ્ટુડિયો', toolSec: 'script', icon: '📝' },
      { key: 'voice', name: '૪. વોઇસ સ્ટુડિયો', toolSec: 'voice', icon: '🎙️' },
      { key: 'videoEditing', name: '૫. વિડીયો એડિટર (૧૦૮૦p)', toolSec: 'videoeditor', icon: '🎥' },
      { key: 'thumbnail', name: '૬. થંબનેલ સ્ટુડિયો', toolSec: 'thumbnails', icon: '🖼️' },
      { key: 'seo', name: '૭. SEO & ટાઇટલ્સ', toolSec: 'seo', icon: '🏷️' }
    ];

    const completedStagesCount = STAGE_CONFIGS.filter(s => stages[s.key]).length;
    const allStagesCompleted = completedStagesCount === 7;

    let overallStatusBadge = '';
    if (isPublished) {
      overallStatusBadge = `<span class="badge" style="background: #10B981; color: white; font-weight: 800; font-size: 0.85rem; padding: 6px 14px; border-radius: 6px;">✓ PUBLISHED (પ્રકાશિત થયેલ)</span>`;
    } else if (allStagesCompleted) {
      overallStatusBadge = `<span class="badge" style="background: #0284C7; color: white; font-weight: 800; font-size: 0.85rem; padding: 6px 14px; border-radius: 6px;">🚀 READY FOR PUBLISH (પ્રકાશન માટે તૈયાર)</span>`;
    } else if (completedStagesCount > 0) {
      overallStatusBadge = `<span class="badge" style="background: #F59E0B; color: white; font-weight: 800; font-size: 0.85rem; padding: 6px 14px; border-radius: 6px;">⏳ IN PROGRESS (${completedStagesCount}/7 પૂરા)</span>`;
    } else {
      overallStatusBadge = `<span class="badge" style="background: #64748B; color: white; font-weight: 800; font-size: 0.85rem; padding: 6px 14px; border-radius: 6px;">⚪ NOT STARTED</span>`;
    }

    publishContainer.innerHTML = `
      <div style="background: #FFFFFF; border: 2px solid #E5E7EB; border-radius: 12px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); max-width: 900px; margin: 0 auto;">
        
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; border-bottom: 2px solid #F1F5F9; padding-bottom: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span class="badge" style="background: #102A56; color: white; font-family: monospace; font-weight: 800; font-size: 0.82rem; padding: 3px 8px; border-radius: 4px;">
                Topic ID: ${topicId}
              </span>
              ${overallStatusBadge}
            </div>
            <h2 style="color: #102A56; font-size: 1.4rem; font-weight: 900; margin: 4px 0;">
              ${p.name}
            </h2>
            <p style="color: #64748B; font-size: 0.86rem; margin: 0;">
              આ વિષયના તમામ ૭ પ્રોડક્શન સ્ટેજ ચકાસો અને અંતિમ પ્રકાશન પૂર્ણ કરો.
            </p>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="btn-pub-back-to-planner" class="btn btn-outline" style="border-color: #102A56; color: #102A56; font-weight: 800; font-size: 0.82rem; padding: 8px 16px;">
              📊 ૧. 48h Studio
            </button>
          </div>
        </div>

        <!-- 7 Stages Checklist -->
        <h4 style="color: #102A56; font-size: 1rem; font-weight: 800; margin: 0 0 14px 0;">
          ✅ ૭ પ્રોડક્શન સ્ટેજ ચેકલિસ્ટ (Production Stages Checklist):
        </h4>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
          ${STAGE_CONFIGS.map(st => {
      const isDone = Boolean(stages[st.key]);
      return `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: ${isDone ? 'rgba(16, 185, 129, 0.05)' : '#F8FAFC'}; border: 1.5px solid ${isDone ? '#10B981' : '#E2E8F0'}; border-radius: 8px; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="font-size: 1.3rem;">${st.icon}</span>
                  <div>
                    <div style="font-weight: 800; font-size: 0.92rem; color: #1E293B;">
                      ${st.name}
                    </div>
                    <div style="font-size: 0.74rem; color: #64748B;">
                      સ્ટેટસ: <strong style="color: ${isDone ? '#10B981' : '#EF4444'};">${isDone ? '✓ પૂર્ણ (Completed)' : '⚪ બાકી (Pending)'}</strong>
                    </div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                  <button class="btn btn-xs ws-btn-toggle-stage" data-stage="${st.key}" data-status="${isDone ? 'true' : 'false'}" style="font-weight: 800; font-size: 0.74rem; padding: 4px 10px; border-radius: 6px; background: ${isDone ? '#10B981' : '#E2E8F0'}; color: ${isDone ? '#FFFFFF' : '#475569'}; border: none; cursor: pointer;">
                    ${isDone ? '✓ પૂર્ણ (YES)' : '❌ બાકી (NO)'}
                  </button>
                  <button class="btn btn-outline btn-xs ws-btn-jump-tool" data-target="${st.toolSec}" style="border-color: #102A56; color: #102A56; font-weight: 700; font-size: 0.74rem; padding: 4px 8px;">
                    ટૂલ ખોલો ➔
                  </button>
                </div>
              </div>
            `;
    }).join('')}
        </div>

        <!-- Publishing Actions -->
        <div style="background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 10px; padding: 20px; text-align: center;">
          <h3 style="color: #102A56; font-size: 1.15rem; font-weight: 800; margin: 0 0 8px 0;">
            🚀 વિડીયો પબ્લિશ કન્ફર્મેશન
          </h3>
          <p style="color: #64748B; font-size: 0.86rem; margin: 0 auto 16px auto; max-width: 500px;">
            જ્યારે તમે આ વિડીયો YouTube પર સફળતાપૂર્વક અપલોડ અને પબ્લિશ કરી દો, ત્યારે નીચેનું બટન દબાવો જેથી પ્લાનરમાં સ્ટેટસ <strong>PUBLISHED</strong> અપડેટ થઈ જશે.
          </p>

          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button id="ws-btn-confirm-published" class="btn btn-primary" style="background: #10B981; border: none; font-weight: 900; font-size: 0.95rem; padding: 12px 28px; box-shadow: 0 4px 16px rgba(16,185,129,0.35);">
              ${isPublished ? '✓ પ્રકાશિત થયેલ છે (Marked as Published)' : '✓ Mark as Published (પ્રકાશિત થયું)'}
            </button>
            <button id="ws-btn-pub-share-video" class="btn" style="background: linear-gradient(135deg, #25D366, #128C7E); color: #ffffff; border: none; font-weight: 800; font-size: 0.9rem; padding: 12px 20px; box-shadow: 0 4px 14px rgba(37,211,102,0.35); cursor: pointer;">
              📲 વિડીયો શેર કરો (WhatsApp)
            </button>
            <button id="ws-btn-pub-download-bundle" class="btn btn-outline" style="border-color: #102A56; color: #102A56; font-weight: 800; font-size: 0.9rem; padding: 12px 20px;">
              📦 આખો પ્રોજેક્ટ ડાઉનલોડ કરો
            </button>
          </div>
        </div>

      </div>
    `;

    // Attach listeners
    publishContainer.querySelector('#btn-pub-back-to-planner')?.addEventListener('click', () => {
      navigateTo('home');
    });

    publishContainer.querySelectorAll('.ws-btn-jump-tool').forEach(btn => {
      btn.addEventListener('click', () => {
        const sec = btn.getAttribute('data-target');
        if (sec) switchSection(sec);
      });
    });

    publishContainer.querySelectorAll('.ws-btn-toggle-stage').forEach(btn => {
      btn.addEventListener('click', async () => {
        const stKey = btn.getAttribute('data-stage');
        const currentDone = btn.getAttribute('data-status') === 'true';
        const newStatus = !currentDone;

        try {
          btn.disabled = true;
          await api.updateCentralTopicStage(topicId, stKey, newStatus);
          showNoticeToast(`✓ સ્ટેજ "${stKey}" અપડેટ થઈ ગયું!`, 'success');
          renderPublishView(publishContainer);
        } catch (err) {
          alert('સ્ટેજ અપડેટ કરવામાં ભૂલ: ' + err.message);
        } finally {
          btn.disabled = false;
        }
      });
    });

    publishContainer.querySelector('#ws-btn-confirm-published')?.addEventListener('click', async () => {
      try {
        const btn = publishContainer.querySelector('#ws-btn-confirm-published');
        btn.disabled = true;
        btn.innerText = 'અપડેટ થઈ રહ્યું છે...';
        await api.updateCentralTopicStage(topicId, 'published', true);
        p.isPublished = true;
        projectState.saveProjects();
        showNoticeToast('🎉 અભિનંદન! વિડીયો સફળતાપૂર્વક "PUBLISHED" જાહેર થયો!', 'success');
        renderPublishView(publishContainer);
      } catch (err) {
        alert('પબ્લિશ સ્ટેટસ અપડેટ કરવામાં ભૂલ: ' + err.message);
      }
    });

    publishContainer.querySelector('#ws-btn-pub-share-video')?.addEventListener('click', (e) => {
      shareToWhatsApp(p, { triggerButton: e.currentTarget });
    });

    publishContainer.querySelector('#ws-btn-pub-download-bundle')?.addEventListener('click', () => {
      projectState.downloadFullProjectFolder(p.id);
      showNoticeToast('📦 આખો પ્રોજેક્ટ પેકેજ ડાઉનલોડ થઈ ગયો! ✓', 'success');
    });
  }

  // Initial Render
  renderMainWorkspace();
}
