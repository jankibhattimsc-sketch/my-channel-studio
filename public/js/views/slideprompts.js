import { copyToClipboard } from '../utils/clipboard.js';
import { api } from '../api.js';
import { generateClientNotebookLMPrompt } from '../utils/notebooklmPromptGenerator.js';
import { projectState } from '../utils/projectState.js';

export function renderSlidePrompts(container, navigateTo) {
  // Read active topic from window.prefillTopic, projectState, or standard fallback
  const initialTopic = window.prefillTopic || projectState?.getProject()?.topic || 'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026';
  window.prefillTopic = null; // Clear after consumption
  let activeTopic = initialTopic;

  // Generate Tool 2 Prompt using existing authentic generator
  function getTool2PromptText(topic) {
    const res = generateClientNotebookLMPrompt({
      topic,
      templateId: 'white-real',
      tool: 'notebooklm-slides',
      slideCount: '8-10',
      audience: 'job-seekers',
      includeBranding: true
    });
    return res.pptDeckPrompt || res.promptText || '';
  }

  const curProj = projectState?.getActiveProject();
  let tool2Prompt = (curProj && curProj.slide && curProj.slide.tool2Prompt) 
    ? curProj.slide.tool2Prompt 
    : getTool2PromptText(activeTopic);

  // If first time, persist generated prompt
  if (curProj && (!curProj.slide || !curProj.slide.tool2Prompt)) {
    projectState.updateTool('slide', { tool2Prompt, isCompleted: true });
  }

  // Render Page 2 - Simple Mobile App Design with ONLY Element 1 (Topic) and Element 2 (Tool 2 Prompt)
  container.innerHTML = `
    <!-- Project Context Header -->
    <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: var(--radius-lg); padding: 14px 20px; margin-bottom: 18px; box-shadow: 0 8px 25px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <button id="btn-back-to-projects-slide" class="btn btn-outline btn-sm" style="font-weight: 700;">← બધા પ્રોજેક્ટ્સ</button>
        <button id="btn-prev-idea" class="btn btn-secondary btn-sm" style="font-weight: 700;">← ૧. Idea</button>
        <span style="font-size: 0.85rem; color: #38bdf8; font-weight: 800;">📁 પ્રોજેક્ટ: ${activeTopic}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="badge badge-green" style="font-size: 0.72rem; font-weight: 800;">✓ Auto-Saved</span>
        <button id="btn-next-to-script" class="btn btn-primary btn-sm" style="font-weight: 800; background: #10b981; border: none; padding: 6px 14px;">
          ૩. Script રાઇટર →
        </button>
      </div>
    </div>

    <!-- A. Page Header (Approved compact mobile design) -->
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
      <div>
        <h2 style="font-size: 1.3rem; font-weight: 800; display: flex; align-items: center; gap: 8px; margin: 0; color: #ffffff;">
          <span>📑</span> ૨. Slide (સ્લાઇડ્સ Tool 2)
        </h2>
        <p style="color: var(--text-secondary); font-size: 0.8rem; margin: 3px 0 0 0;">
          Google NotebookLM ૧૬:૯ વ્હાઇટ PPT & શ્રેષ્ઠ અસલી ફોટા પ્રોમ્પ્ટ
        </p>
      </div>
      <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="border: 1.5px solid #8b5cf6; color: #c4b5fd; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; padding: 7px 14px; border-radius: 8px; font-size: 0.82rem; background: rgba(139,92,246,0.12);" title="Google NotebookLM નવી ટેબમાં ખોલો">
        <span>🚀</span> Google NotebookLM ↗
      </a>
    </div>

    <!-- B. Topic Name (Element 1) -->
    <div class="card" style="margin-bottom: 14px; background: #131722; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1rem;">🎯</span>
          <span style="font-size: 0.78rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
            પસંદ કરેલ વિષય (Selected Topic)
          </span>
        </div>
        <span class="badge" style="background: #1e293b; color: #38bdf8; font-size: 0.72rem; font-weight: 700; border: 1px solid rgba(56,189,248,0.2); padding: 3px 8px; border-radius: 4px;">
          GYAN YATRA 🎯
        </span>
      </div>
      <input type="text" id="slide-topic-input" class="form-input font-gu" value="${activeTopic}" style="width: 100%; background: #0a0d14; border: 1px solid #1e293b; color: #ffffff; font-size: 1.02rem; font-weight: 800; border-radius: 8px; padding: 10px 14px; box-sizing: border-box;" placeholder="પસંદ કરેલ વિષય...">
    </div>

    <!-- C. NotebookLM Prompt Tool 2 (Element 2) -->
    <div class="card" style="background: #131722; border: 1.5px solid #8b5cf6; border-radius: 12px; padding: 16px; box-shadow: 0 4px 20px rgba(139,92,246,0.15);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.25rem;">🖥️</span>
          <div>
            <h3 style="font-size: 1.05rem; font-weight: 800; color: #ffffff; margin: 0;">
              NotebookLM Tool 2 પ્રોમ્પ્ટ
            </h3>
            <p style="color: #94a3b8; font-size: 0.78rem; margin: 2px 0 0 0;">
              NotebookLM ના "Slide Deck" માટે ૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), બોલ્ડ હેડિંગ બોક્સ, બુલેટ પોઇન્ટ્સ અને શ્રેષ્ઠ અસલી ફોટા પ્રોમ્પ્ટ:
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button id="btn-copy-ppt-prompt" class="btn btn-secondary btn-sm" style="font-weight: 700; background: #8b5cf6; color: white; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 10px rgba(139,92,246,0.35); padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; border: none; cursor: pointer;">
            <span id="copy-btn-icon">📋</span>
            <span id="copy-btn-text">કોપી ટૂલ ૨</span>
          </button>
          <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" id="btn-open-notebooklm" class="btn btn-primary btn-sm" style="font-weight: 700; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 10px rgba(37,99,235,0.4); padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; border: none; cursor: pointer; text-decoration: none;" title="Google NotebookLM સીધું ખોલો">
            <span>🚀</span>
            <span>NotebookLM ખોલો ↗</span>
          </a>
        </div>
      </div>

      <!-- Scrollable Monospace Prompt Box -->
      <div style="position: relative; margin-top: 10px;">
        <textarea id="ppt-prompt-textarea" class="form-textarea font-gu" style="width: 100%; min-height: 380px; max-height: 520px; font-size: 0.84rem; line-height: 1.6; background: #0a0d14; border: 1px solid #1e293b; color: #e2e8f0; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; padding: 14px; border-radius: 8px; resize: vertical; cursor: pointer; box-sizing: border-box;" title="પ્રોમ્પ્ટ પસંદ કરવા માટે ટેપ કરો" readonly>${tool2Prompt}</textarea>
      </div>

      <!-- Mobile-Friendly Quick Copy Action Bar -->
      <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <span style="font-size: 0.76rem; color: #64748b;">
          💡 ટીપ: આ પ્રોમ્પ્ટ કોપી કરી Google NotebookLM ના <strong>Slide Deck</strong> માં પેસ્ટ કરો.
        </span>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <button id="btn-quick-copy-ppt" class="btn btn-secondary btn-sm" style="padding: 6px 14px; font-size: 0.78rem; background: rgba(139,92,246,0.15); border: 1px solid #8b5cf6; color: #c4b5fd; border-radius: 6px; cursor: pointer; font-weight: 600;">
            📋 ૧-ક્લિક કોપી (1-Click Copy)
          </button>
          <button id="btn-copy-and-open-notebooklm" class="btn btn-primary btn-sm" style="padding: 6px 14px; font-size: 0.78rem; background: linear-gradient(135deg, #8b5cf6, #6366f1); border: none; color: white; border-radius: 6px; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(139,92,246,0.3);" title="પ્રોમ્પ્ટ કોપી કરી સીધું NotebookLM ખોલો">
            <span>⚡</span> કોપી & NotebookLM ખોલો ↗
          </button>
          <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="padding: 6px 14px; font-size: 0.78rem; border: 1px solid #38bdf8; color: #7dd3fc; border-radius: 6px; cursor: pointer; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
            <span>🌐</span> NotebookLM ↗
          </a>
          <button id="btn-goto-step3-script" class="btn btn-primary btn-sm" style="padding: 6px 14px; font-size: 0.78rem; font-weight: 700; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border: none; border-radius: 6px; cursor: pointer;">
            આગળ વધો: ૩. સ્ક્રિપ્ટ રાઇટર ➔
          </button>
        </div>
      </div>
    </div>
  `;

  // Elements
  const topicInput = container.querySelector('#slide-topic-input');
  const pptTextarea = container.querySelector('#ppt-prompt-textarea');
  const btnCopyPpt = container.querySelector('#btn-copy-ppt-prompt');
  const btnQuickCopy = container.querySelector('#btn-quick-copy-ppt');
  const copyBtnLabel = container.querySelector('#copy-btn-text');
  const copyBtnIcon = container.querySelector('#copy-btn-icon');

  // Copy handler with visual feedback
  const handleCopy = (btn) => {
    const textToCopy = pptTextarea ? pptTextarea.value : tool2Prompt;
    if (pptTextarea) {
      pptTextarea.focus();
      pptTextarea.select();
    }
    copyToClipboard(textToCopy, 'ટૂલ ૨: NotebookLM ૧૬:૯ વ્હાઇટ PPT પ્રોમ્પ્ટ સફળતાપૂર્વક કોપી થઈ ગયો! ✓', btn);
    if (copyBtnLabel) copyBtnLabel.textContent = '✓ કોપી થઈ ગયું!';
    if (copyBtnIcon) copyBtnIcon.textContent = '✓';
    setTimeout(() => {
      if (copyBtnLabel) copyBtnLabel.textContent = 'કોપી ટૂલ ૨';
      if (copyBtnIcon) copyBtnIcon.textContent = '📋';
    }, 2000);
  };

  btnCopyPpt?.addEventListener('click', () => handleCopy(btnCopyPpt));
  btnQuickCopy?.addEventListener('click', () => handleCopy(btnQuickCopy));
  container.querySelector('#btn-copy-and-open-notebooklm')?.addEventListener('click', (e) => {
    handleCopy(e.currentTarget);
    window.open('https://notebooklm.google.com', '_blank');
  });
  container.querySelector('#btn-goto-step3-script')?.addEventListener('click', () => {
    if (typeof navigateTo === 'function') {
      navigateTo('scriptwriter');
    }
  });

  // Auto-select text on textarea tap/click
  pptTextarea?.addEventListener('click', () => {
    pptTextarea.select();
  });

  // User manual edits to Tool 2 prompt auto-save into project
  pptTextarea?.addEventListener('input', () => {
    tool2Prompt = pptTextarea.value;
    projectState.updateTool('slide', {
      tool2Prompt: pptTextarea.value,
      isCompleted: true
    });
  });

  // Re-generate Tool 2 prompt when topic updates
  const updateTopic = (newTopic) => {
    activeTopic = newTopic.trim() || 'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026';
    projectState?.setTopic(activeTopic);
    tool2Prompt = getTool2PromptText(activeTopic);
    if (pptTextarea) pptTextarea.value = tool2Prompt;
    projectState.updateTool('slide', {
      tool2Prompt,
      isCompleted: true
    });
  };

  topicInput?.addEventListener('input', (e) => {
    updateTopic(e.target.value);
  });

  // Background API refresh for parity
  async function refreshFromBackend(topic) {
    try {
      const res = await api.generateNotebookLMPrompt(topic, {
        templateId: 'white-real',
        tool: 'notebooklm-slides',
        slideCount: '8-10',
        audience: 'job-seekers',
        includeBranding: true
      });
      if (res && (res.pptDeckPrompt || res.promptText)) {
        tool2Prompt = res.pptDeckPrompt || res.promptText;
        if (pptTextarea) pptTextarea.value = tool2Prompt;
        projectState.updateTool('slide', {
          tool2Prompt,
          isCompleted: true
        });
      }
    } catch (_) {
      // Client-side fallback is already 100% complete and accurate
    }
  }

  topicInput?.addEventListener('change', (e) => {
    refreshFromBackend(e.target.value.trim() || activeTopic);
  });

  // Navigation Banner Buttons
  container.querySelector('#btn-back-to-projects-slide')?.addEventListener('click', () => navigateTo('projects'));
  container.querySelector('#btn-prev-idea')?.addEventListener('click', () => navigateTo('topics'));
  container.querySelector('#btn-next-to-script')?.addEventListener('click', () => navigateTo('scriptwriter'));

  // Initial backend parity refresh
  refreshFromBackend(activeTopic);
}
