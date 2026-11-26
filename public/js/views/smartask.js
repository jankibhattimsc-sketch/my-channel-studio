import { api } from '../api.js?v=102.1';
import { copyToClipboard } from '../utils/clipboard.js?v=90.0';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function compressImageFile(file, maxDim = 1400, quality = 0.84) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('ફોટો વાંચવામાં ભૂલ આવી'));
    reader.readAsDataURL(file);
  });
}

export async function renderSmartAsk(container) {
  let attachedImages = [];
  let historyItems = [];
  let currentQuestions = [];

  container.innerHTML = `
    <div style="max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; padding-bottom: 40px;">
      <!-- Header -->
      <div class="card" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.16), rgba(16, 185, 129, 0.12)); border: 1.5px solid rgba(139, 92, 246, 0.45); padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="margin: 0 0 6px 0; font-size: 1.35rem; color: #f8fafc;">
              ✨ મારો પ્રશ્ન & ફોટો AI (પ્રશ્ન પૂછીને → World-Best Prompt → જવાબ)
            </h2>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.92rem; line-height: 1.5;">
              કોઈ પણ વિષય લખો અથવા ફોટો ઉમેરો — Google Gemini પહેલા બારીકાઈથી સમજવા <b>૩–૫ પ્રશ્નો</b> પૂછશે અને પછી એકદમ <b>World-Best High-Level Prompt</b> બનાવશે.
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <label for="sa-lang-select" style="font-size: 0.84rem; color: var(--text-primary, #1e293b); font-weight: 700;">જવાબની ભાષા:</label>
            <select id="sa-lang-select" class="input" style="padding: 8px 12px; border-radius: 10px; font-weight: 700; min-width: 125px;">
              <option value="gu" selected>ગુજરાતી</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="en">English</option>
            </select>
            <a href="#settings" class="btn btn-outline" style="padding: 8px 12px; border-radius: 10px; font-weight: 800; font-size: 0.82rem; border-color: #f59e0b; color: #f59e0b; text-decoration: none;">
              ⚙️ Key સેટ કરો
            </a>
            <button type="button" class="btn btn-outline sa-open-chatgpt-btn" style="padding: 8px 12px; border-radius: 10px; font-weight: 800; font-size: 0.82rem; border-color: #10b981; color: #10b981; background: rgba(16, 185, 129, 0.12);" title="ChatGPT વેબસાઇટ સીધી ખોલો">
              🤖 ChatGPT
            </button>
            <button type="button" class="btn btn-outline sa-open-gemini-btn" style="padding: 8px 12px; border-radius: 10px; font-weight: 800; font-size: 0.82rem; border-color: #38bdf8; color: #38bdf8; background: rgba(56, 189, 248, 0.12);" title="Google Gemini વેબસાઇટ સીધી ખોલો">
              ✨ Gemini
            </button>
          </div>
        </div>
      </div>

      <!-- Step 1: User Input + Photo Upload -->
      <div class="card" style="padding: 20px; border: 1.5px solid rgba(56, 189, 248, 0.35);">
        <div style="font-weight: 800; color: #38bdf8; margin-bottom: 8px; font-size: 1rem;">
          ૧. તમારો વિષય / પ્રશ્ન લખો (ગુજરાતી, ઇંગ્લિશ કે Roman Gujarati માં ગમે તે રીતે):
        </div>
        <textarea id="sa-user-input" class="input" rows="4"
          placeholder="ઉદાહરણ: 'tet 2 na 5 topic aapo', 'નવો ધંધો શરૂ કરવો છે', 'આ ફોટાનું બારીકાઈથી વિશ્લેષણ કરો', અથવા કોઈ પણ વિષય..."
          style="width: 100%; resize: vertical; font-size: 0.98rem; line-height: 1.55; padding: 12px; border-radius: 12px;"></textarea>

        <!-- Photo Upload Area -->
        <div style="margin-top: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
            <span style="font-weight: 800; color: #a78bfa; font-size: 0.96rem;">
              ૨. ફોટો ઉમેરો (વૈકલ્પિક — 1 થી 4 ફોટા, Gemini ફોટા વાંચીને પ્રશ્નો &amp; Prompt બનાવશે):
            </span>
            <span id="sa-photo-count" style="font-size: 0.82rem; color: var(--text-muted);">૦ ફોટા ઉમેરેલા</span>
          </div>

          <div id="sa-drop-zone" style="border: 2px dashed rgba(167, 139, 250, 0.55); border-radius: 14px; padding: 16px; text-align: center; background: rgba(139, 92, 246, 0.06); cursor: pointer;">
            <input type="file" id="sa-photo-input" accept="image/*" multiple style="display: none;" />
            <div style="font-size: 1.6rem; margin-bottom: 4px;">📷</div>
            <div style="font-weight: 700; color: #e2e8f0; font-size: 0.95rem;">
              અહીં ક્લિક કરીને ફોટો ઉમેરો (અથવા ફોટો અહીં Drag / Paste કરો)
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
              ફોનની ગેલેરી, કેમેરા અથવા સ્ક્રીનશોટ — Gemini ફોટો વાંચીને Prompt બનાવશે
            </div>
          </div>

          <div id="sa-photo-preview-grid" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px;"></div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px;">
          <button id="sa-btn-clarify" class="btn btn-primary" style="flex: 2; min-width: 240px; padding: 12px 18px; font-weight: 800; font-size: 0.98rem; background: linear-gradient(135deg, #8b5cf6, #10b981); border: none;">
            🧠 સ્ટેપ ૧: Gemini પ્રશ્નો પૂછે → World-Best Prompt
          </button>
          <button id="sa-btn-build-prompt" class="btn btn-outline" style="flex: 1; min-width: 190px; padding: 12px 14px; font-weight: 800; border-color: #38bdf8; color: #38bdf8;">
            ⚡ સીધો High-Level Prompt
          </button>
          <button id="sa-btn-ask-all" class="btn btn-outline" style="flex: 1; min-width: 175px; padding: 12px 14px; font-weight: 800; border-color: #34d399; color: #34d399;">
            🚀 Prompt + AI જવાબ
          </button>
          <button id="sa-btn-clear" class="btn btn-outline" style="padding: 12px 14px; font-weight: 700;">
            🧹 સાફ કરો
          </button>
        </div>

        <div id="sa-status-msg" style="margin-top: 10px; font-size: 0.88rem; color: #34d399; display: none;"></div>
      </div>

      <!-- Step 2: Gemini Clarifying Questions Card -->
      <div id="sa-clarify-card" class="card" style="padding: 20px; border: 1.5px solid rgba(56, 189, 248, 0.55); background: rgba(56, 189, 248, 0.06); display: none;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
          <div style="font-weight: 800; color: #38bdf8; font-size: 1.04rem;">
            🤔 પરફેક્ટ &amp; World-Best Prompt બનાવતા પહેલા Gemini આટલું જાણવા માંગે છે:
          </div>
          <span id="sa-clarify-source" style="font-size: 0.78rem; background: rgba(56, 189, 248, 0.16); color: #bae6fd; padding: 3px 10px; border-radius: 999px;"></span>
        </div>

        <div id="sa-clarify-summary" style="font-size: 0.9rem; color: #e2e8f0; background: rgba(15, 23, 42, 0.55); padding: 10px 14px; border-radius: 10px; border-left: 3px solid #38bdf8; margin-bottom: 14px; line-height: 1.5;"></div>

        <div id="sa-clarify-questions" style="display: flex; flex-direction: column; gap: 14px;"></div>

        <div style="margin-top: 14px;">
          <label for="sa-clarify-extra" style="display: block; font-size: 0.84rem; font-weight: 700; color: #cbd5e1; margin-bottom: 6px;">
            📌 વધારાની કોઈ ખાસ સૂચના / શરત / ઉદાહરણ ઉમેરવું હોય તો લખો (વૈકલ્પિક):
          </label>
          <input id="sa-clarify-extra" type="text" class="input"
            placeholder="દા.ત. '૨૦૨૬ ના નવા નિયમો મુજબ રાખો' અથવા '૧૦ મિનિટના વિડિયો મુજબ ઊંડું આપો'..."
            style="width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 0.9rem;" />
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px;">
          <button id="sa-btn-generate-from-answers" class="btn btn-primary" style="flex: 2; min-width: 240px; padding: 12px 18px; font-weight: 800; font-size: 0.98rem; background: linear-gradient(135deg, #0ea5e9, #10b981); border: none;">
            ✨ જવાબો પરથી World-Best High-Level Prompt બનાવો
          </button>
          <button id="sa-btn-skip-clarify" class="btn btn-outline" style="flex: 1; min-width: 185px; padding: 12px 14px; font-weight: 700; border-color: #94a3b8; color: #cbd5e1;">
            ⏭️ પ્રશ્નો છોડી સીધો Prompt બનાવો
          </button>
        </div>
      </div>

      <!-- Step 3: Generated Master Prompt Card -->
      <div id="sa-prompt-card" class="card" style="padding: 20px; border: 1.5px solid rgba(251, 191, 36, 0.45); display: none;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
            <span id="sa-prompt-card-title" style="font-weight: 800; color: #fbbf24; font-size: 1rem;">✨ Google Gemini API નો World-Best Master Prompt</span>
            <span id="sa-intent-badge" style="font-size: 0.78rem; background: rgba(251, 191, 36, 0.16); color: #fde68a; padding: 3px 10px; border-radius: 999px;"></span>
            <span id="sa-prompt-stats" style="font-size: 0.76rem; background: rgba(16, 185, 129, 0.16); color: #6ee7b7; padding: 3px 10px; border-radius: 999px;"></span>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="sa-btn-copy-prompt" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.82rem; font-weight: 700;">
              📋 Prompt કોપી કરો
            </button>
            <button id="sa-btn-send-prompt" class="btn btn-primary" style="padding: 6px 14px; font-size: 0.85rem; font-weight: 800;">
              🤖 આ Prompt પરથી AI જવાબ આપો
            </button>
            <button type="button" class="btn btn-outline sa-open-chatgpt-btn" style="padding: 6px 12px; font-size: 0.82rem; font-weight: 800; border-color: #10b981; color: #10b981;">
              🤖 ChatGPT ખોલો
            </button>
            <button type="button" class="btn btn-outline sa-open-gemini-btn" style="padding: 6px 12px; font-size: 0.82rem; font-weight: 800; border-color: #38bdf8; color: #38bdf8;">
              ✨ Gemini ખોલો
            </button>
          </div>
        </div>
        <textarea id="sa-generated-prompt" class="input" rows="12" style="width: 100%; resize: vertical; font-size: 0.94rem; line-height: 1.65; padding: 14px; border-radius: 12px; background: rgba(15, 23, 42, 0.75);"></textarea>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 6px;">
          ટીપ: આ <b>World-Best Master Prompt</b> કોપી કરીને ChatGPT / Gemini માં Paste કરી શકો છો અથવા અહીં જ "🤖 આ Prompt પરથી AI જવાબ આપો" પર ક્લિક કરો.
        </div>
      </div>

      <!-- Step 4: AI Answer Card -->
      <div id="sa-answer-card" class="card" style="padding: 20px; border: 1.5px solid rgba(16, 185, 129, 0.5); background: rgba(16, 185, 129, 0.06); display: none;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
          <span id="sa-answer-card-title" style="font-weight: 800; color: #34d399; font-size: 1.05rem;">🤖 AI નો વિગતવાર જવાબ</span>
          <button id="sa-btn-copy-answer" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.82rem; font-weight: 700; border-color: #34d399; color: #34d399;">
            📋 જવાબ કોપી કરો
          </button>
        </div>
        <div id="sa-answer-body" style="white-space: pre-wrap; line-height: 1.7; font-size: 0.98rem; color: #f8fafc; background: rgba(15, 23, 42, 0.65); padding: 16px; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.2);"></div>
      </div>

      <!-- Saved History -->
      <div class="card" style="padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 1.02rem; color: #e2e8f0;">📚 અગાઉ પૂછેલા પ્રશ્નો &amp; જવાબો</h3>
          <button id="sa-btn-refresh-history" class="btn btn-outline" style="padding: 5px 10px; font-size: 0.8rem;">🔄 રીફ્રેશ</button>
        </div>
        <div id="sa-history-list" style="display: flex; flex-direction: column; gap: 10px;">
          <div style="color: var(--text-muted); font-size: 0.88rem;">લોડ થઈ રહ્યું છે...</div>
        </div>
      </div>
    </div>
  `;

  const userInputEl = container.querySelector('#sa-user-input');
  const langSelectEl = container.querySelector('#sa-lang-select');
  const photoInputEl = container.querySelector('#sa-photo-input');
  const dropZoneEl = container.querySelector('#sa-drop-zone');
  const previewGridEl = container.querySelector('#sa-photo-preview-grid');
  const photoCountEl = container.querySelector('#sa-photo-count');
  const statusEl = container.querySelector('#sa-status-msg');

  const clarifyCardEl = container.querySelector('#sa-clarify-card');
  const clarifySourceEl = container.querySelector('#sa-clarify-source');
  const clarifySummaryEl = container.querySelector('#sa-clarify-summary');
  const clarifyQuestionsEl = container.querySelector('#sa-clarify-questions');
  const clarifyExtraEl = container.querySelector('#sa-clarify-extra');

  const promptCardEl = container.querySelector('#sa-prompt-card');
  const promptCardTitleEl = container.querySelector('#sa-prompt-card-title');
  const intentBadgeEl = container.querySelector('#sa-intent-badge');
  const promptStatsEl = container.querySelector('#sa-prompt-stats');
  const generatedPromptEl = container.querySelector('#sa-generated-prompt');

  const answerCardEl = container.querySelector('#sa-answer-card');
  const answerCardTitleEl = container.querySelector('#sa-answer-card-title');
  const answerBodyEl = container.querySelector('#sa-answer-body');
  const historyListEl = container.querySelector('#sa-history-list');

  const btnClarify = container.querySelector('#sa-btn-clarify');
  const btnBuildPrompt = container.querySelector('#sa-btn-build-prompt');
  const btnAskAll = container.querySelector('#sa-btn-ask-all');
  const btnSendPrompt = container.querySelector('#sa-btn-send-prompt');
  const btnGenerateFromAnswers = container.querySelector('#sa-btn-generate-from-answers');
  const btnSkipClarify = container.querySelector('#sa-btn-skip-clarify');

  function setStatus(msg, isError = false) {
    if (!msg) {
      statusEl.style.display = 'none';
      return;
    }
    statusEl.style.display = 'block';
    statusEl.style.color = isError ? '#f87171' : '#34d399';
    statusEl.textContent = msg;
  }

  function setBusy(busy) {
    [btnClarify, btnBuildPrompt, btnAskAll, btnSendPrompt, btnGenerateFromAnswers, btnSkipClarify].forEach(b => {
      if (b) {
        b.disabled = busy;
        b.style.opacity = busy ? '0.6' : '1';
      }
    });
  }

  function sourceLabel(src, model = '') {
    if (src === 'gemini') return `✨ Gemini API Live${model ? ' (' + model + ')' : ''}`;
    if (src === 'openai') return `🤖 ChatGPT API Live${model ? ' (' + model + ')' : ''}`;
    return '⚙️ Local Fallback';
  }

  function updatePromptTitleBySource(src, model) {
    if (!promptCardTitleEl) return;
    if (src === 'gemini') {
      promptCardTitleEl.textContent = `✨ Google Gemini API (${model || 'gemini-flash-lite-latest'}) નો World-Best Master Prompt`;
    } else if (src === 'openai') {
      promptCardTitleEl.textContent = `🤖 ChatGPT API (${model || 'gpt-4o'}) નો World-Best Master Prompt`;
    } else {
      promptCardTitleEl.textContent = `⚠️ ટેમ્પરરી ફૉલબેક Prompt (Gemini ફરી પ્રયાસ કરો)`;
    }
  }

  function updatePromptStats(text) {
    if (!promptStatsEl) return;
    const clean = String(text || '').trim();
    const words = clean ? clean.split(/\s+/).length : 0;
    promptStatsEl.textContent = `📊 ${words} શબ્દો • ${clean.length} અક્ષરો`;
  }

  generatedPromptEl.addEventListener('input', () => updatePromptStats(generatedPromptEl.value));

  function renderPhotoPreviews() {
    photoCountEl.textContent = `${attachedImages.length} ફોટા ઉમેરેલા (મહત્તમ 4)`;
    if (attachedImages.length === 0) {
      previewGridEl.innerHTML = '';
      return;
    }
    previewGridEl.innerHTML = attachedImages.map((src, idx) => `
      <div style="position: relative; width: 92px; height: 92px; border-radius: 10px; overflow: hidden; border: 1.5px solid rgba(167, 139, 250, 0.6);">
        <img src="${src}" alt="Photo ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;" />
        <button data-remove-idx="${idx}" title="ફોટો દૂર કરો" style="position: absolute; top: 4px; right: 4px; background: rgba(15, 23, 42, 0.85); color: #fff; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 12px; font-weight: 800;">✕</button>
      </div>
    `).join('');

    previewGridEl.querySelectorAll('[data-remove-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-remove-idx'));
        attachedImages.splice(idx, 1);
        renderPhotoPreviews();
      });
    });
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    setStatus('📷 ફોટો તૈયાર થઈ રહ્યો છે...');
    for (const file of files) {
      if (attachedImages.length >= 4) break;
      try {
        const compressed = await compressImageFile(file);
        attachedImages.push(compressed);
      } catch (_) {}
    }
    renderPhotoPreviews();
    setStatus('');
  }

  dropZoneEl.addEventListener('click', () => photoInputEl.click());
  photoInputEl.addEventListener('change', (e) => {
    addFiles(e.target.files);
    photoInputEl.value = '';
  });
  dropZoneEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZoneEl.style.borderColor = '#38bdf8';
  });
  dropZoneEl.addEventListener('dragleave', () => {
    dropZoneEl.style.borderColor = 'rgba(167, 139, 250, 0.55)';
  });
  dropZoneEl.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZoneEl.style.borderColor = 'rgba(167, 139, 250, 0.55)';
    addFiles(e.dataTransfer?.files);
  });
  userInputEl.addEventListener('paste', (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgFiles = items.filter(i => i.type.startsWith('image/')).map(i => i.getAsFile()).filter(Boolean);
    if (imgFiles.length) addFiles(imgFiles);
  });

  function renderClarifyQuestions(questions) {
    currentQuestions = Array.isArray(questions) ? questions : [];
    clarifyQuestionsEl.innerHTML = currentQuestions.map((q, idx) => `
      <div style="padding: 14px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.35); background: rgba(15, 23, 42, 0.55);">
        <div style="font-weight: 800; color: #f8fafc; font-size: 0.96rem; margin-bottom: 4px;">
          ${idx + 1}. ${escapeHtml(q.question)}
        </div>
        ${q.why ? `<div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 10px;">💡 ${escapeHtml(q.why)}</div>` : ''}
        ${Array.isArray(q.options) && q.options.length ? `
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
            ${q.options.map(opt => `
              <button type="button" class="btn btn-outline sa-clarify-chip"
                data-q-idx="${idx}" data-opt="${escapeHtml(opt)}"
                style="padding: 5px 11px; font-size: 0.82rem; font-weight: 700; border-radius: 999px; border-color: rgba(56, 189, 248, 0.5); color: #bae6fd; background: rgba(56, 189, 248, 0.08);">
                + ${escapeHtml(opt)}
              </button>
            `).join('')}
          </div>
        ` : ''}
        <input type="text" id="sa-clarify-ans-${idx}" class="input sa-clarify-input"
          data-q-idx="${idx}"
          placeholder="ઉપરનો વિકલ્પ ક્લિક કરો અથવા અહીં તમારો જવાબ લખો (ખાલી રાખવું હોય તો છોડી દો)..."
          style="width: 100%; padding: 9px 12px; border-radius: 10px; font-size: 0.9rem;" />
      </div>
    `).join('');

    clarifyQuestionsEl.querySelectorAll('.sa-clarify-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const idx = Number(chip.getAttribute('data-q-idx'));
        const opt = chip.getAttribute('data-opt') || '';
        const inputEl = clarifyQuestionsEl.querySelector(`#sa-clarify-ans-${idx}`);
        if (!inputEl) return;

        const existingParts = inputEl.value.split(',').map(s => s.trim()).filter(Boolean);
        const already = existingParts.includes(opt);
        if (already) {
          inputEl.value = existingParts.filter(s => s !== opt).join(', ');
          chip.style.background = 'rgba(56, 189, 248, 0.08)';
          chip.style.borderColor = 'rgba(56, 189, 248, 0.5)';
          chip.style.color = '#bae6fd';
        } else {
          existingParts.push(opt);
          inputEl.value = existingParts.join(', ');
          chip.style.background = 'rgba(16, 185, 129, 0.25)';
          chip.style.borderColor = '#10b981';
          chip.style.color = '#6ee7b7';
        }
      });
    });
  }

  function collectClarificationAnswers() {
    return currentQuestions.map((q, idx) => {
      const inputEl = clarifyQuestionsEl.querySelector(`#sa-clarify-ans-${idx}`);
      return {
        question: q.question,
        answer: (inputEl?.value || '').trim()
      };
    }).filter(item => item.answer);
  }

  async function runBuildMasterPrompt({ useClarifications = false } = {}) {
    const userInput = userInputEl.value.trim();
    if (!userInput && attachedImages.length === 0) {
      setStatus('કૃપા કરીને તમારો પ્રશ્ન લખો અથવા ફોટો ઉમેરો.', true);
      return;
    }
    const clarifications = useClarifications ? collectClarificationAnswers() : [];
    const extraNotes = useClarifications ? (clarifyExtraEl?.value || '').trim() : '';

    setBusy(true);
    generatedPromptEl.value = '';
    setStatus('✨ Google Gemini API તમારા જવાબો અને વિગતો પરથી World-Best High-Level Prompt બનાવી રહ્યું છે (આમાં 8–20 સેકન્ડ લાગી શકે છે)...');
    try {
      const res = await api.buildSmartPrompt({
        userInput,
        images: attachedImages,
        answerLanguage: langSelectEl.value,
        clarifications,
        extraNotes
      });
      generatedPromptEl.value = res.generatedPrompt || '';
      updatePromptTitleBySource(res.source, res.model);
      updatePromptStats(res.generatedPrompt || '');
      intentBadgeEl.textContent = `${res.detectedIntent || 'Prompt તૈયાર છે'} • ${sourceLabel(res.source, res.model)}`;
      promptCardEl.style.display = 'block';
      promptCardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setStatus(`✅ World-Best High-Level Prompt તૈયાર છે (${sourceLabel(res.source, res.model)})!`);
    } catch (err) {
      setStatus(`ભૂલ: ${err.message}`, true);
    } finally {
      setBusy(false);
    }
  }

  // Step 1: Gemini inspects topic + photos and asks clarifying questions first
  btnClarify.addEventListener('click', async () => {
    const userInput = userInputEl.value.trim();
    if (!userInput && attachedImages.length === 0) {
      setStatus('કૃપા કરીને તમારો વિષય લખો અથવા ફોટો ઉમેરો.', true);
      return;
    }
    setBusy(true);
    setStatus('🧠 Google Gemini તમારો વિષય & ફોટો બારીકાઈથી સમજી રહ્યું છે અને જરૂરી પ્રશ્નો તૈયાર કરી રહ્યું છે...');
    try {
      const res = await api.clarifySmartPrompt({
        userInput,
        images: attachedImages,
        answerLanguage: langSelectEl.value
      });

      if (!res.needsClarification || !Array.isArray(res.questions) || res.questions.length === 0) {
        setStatus('✅ તમારી વિગતો ૧૦૦% સ્પષ્ટ છે! સીધો World-Best Prompt બની રહ્યો છે...');
        clarifyCardEl.style.display = 'none';
        setBusy(false);
        await runBuildMasterPrompt({ useClarifications: false });
        return;
      }

      clarifySourceEl.textContent = sourceLabel(res.source, res.model);
      clarifySummaryEl.textContent = res.understoodSummary || 'તમારો વિષય સમજાયો છે.';
      renderClarifyQuestions(res.questions);
      clarifyExtraEl.value = '';
      clarifyCardEl.style.display = 'block';
      clarifyCardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setStatus(`🤔 Gemini એ ${res.questions.length} મહત્વના પ્રશ્નો પૂછ્યા છે — નીચે પસંદ કરીને "✨ World-Best Prompt બનાવો" દબાવો!`);
    } catch (err) {
      setStatus(`ભૂલ: ${err.message}`, true);
    } finally {
      setBusy(false);
    }
  });

  btnGenerateFromAnswers.addEventListener('click', () => runBuildMasterPrompt({ useClarifications: true }));
  btnSkipClarify.addEventListener('click', () => runBuildMasterPrompt({ useClarifications: false }));
  btnBuildPrompt.addEventListener('click', () => runBuildMasterPrompt({ useClarifications: false }));

  btnSendPrompt.addEventListener('click', async () => {
    const prompt = generatedPromptEl.value.trim();
    const userInput = userInputEl.value.trim();
    if (!prompt && !userInput && attachedImages.length === 0) {
      setStatus('પહેલા Prompt બનાવો અથવા પ્રશ્ન લખો.', true);
      return;
    }
    setBusy(true);
    answerBodyEl.textContent = '';
    setStatus('🤖 AI તમારા World-Best Prompt અને ફોટા પરથી ઊંડો જવાબ તૈયાર કરી રહ્યું છે...');
    try {
      const res = await api.answerSmartPrompt({
        prompt,
        userInput,
        images: attachedImages,
        answerLanguage: langSelectEl.value
      });
      answerBodyEl.textContent = res.answer || '';
      if (answerCardTitleEl) {
        answerCardTitleEl.textContent = `🤖 AI નો વિગતવાર જવાબ (${sourceLabel(res.source, res.model)})`;
      }
      answerCardEl.style.display = 'block';
      answerCardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setStatus(`✅ જવાબ તૈયાર છે (${sourceLabel(res.source, res.model)})!`);
      loadHistory();
    } catch (err) {
      setStatus(`ભૂલ: ${err.message}`, true);
    } finally {
      setBusy(false);
    }
  });

  btnAskAll.addEventListener('click', async () => {
    const userInput = userInputEl.value.trim();
    if (!userInput && attachedImages.length === 0) {
      setStatus('કૃપા કરીને તમારો પ્રશ્ન લખો અથવા ફોટો ઉમેરો.', true);
      return;
    }
    setBusy(true);
    clarifyCardEl.style.display = 'none';
    generatedPromptEl.value = '';
    answerBodyEl.textContent = '';
    setStatus('🚀 ટૂલ World-Best High-Level Prompt અને AI જવાબ બંને તૈયાર કરી રહ્યું છે...');
    try {
      const res = await api.smartAskAll({
        userInput,
        images: attachedImages,
        answerLanguage: langSelectEl.value
      });
      generatedPromptEl.value = res.generatedPrompt || '';
      updatePromptTitleBySource(res.promptSource || res.source, res.promptModel || res.model);
      updatePromptStats(res.generatedPrompt || '');
      intentBadgeEl.textContent = `${res.detectedIntent || 'Prompt તૈયાર છે'} • ${sourceLabel(res.promptSource || res.source, res.promptModel || res.model)}`;
      promptCardEl.style.display = 'block';
      answerBodyEl.textContent = res.answer || '';
      if (answerCardTitleEl) {
        answerCardTitleEl.textContent = `🤖 AI નો વિગતવાર જવાબ (${sourceLabel(res.source, res.model)})`;
      }
      answerCardEl.style.display = 'block';
      setStatus(`✅ World-Best Prompt અને જવાબ બંને તૈયાર છે (${sourceLabel(res.source, res.model)})!`);
      loadHistory();
    } catch (err) {
      setStatus(`ભૂલ: ${err.message}`, true);
    } finally {
      setBusy(false);
    }
  });

  function renderHistory() {
    if (!historyItems.length) {
      historyListEl.innerHTML = `<div style="color: var(--text-muted); font-size: 0.88rem;">હજી સુધી કોઈ પ્રશ્ન સેવ થયેલો નથી.</div>`;
      return;
    }
    historyListEl.innerHTML = historyItems.map(item => `
      <div style="padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.2); background: rgba(15, 23, 42, 0.45);">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
          <div style="font-weight: 700; color: #38bdf8; font-size: 0.9rem;">
            ${item.imageCount > 0 ? `📷 (${item.imageCount} ફોટા) ` : ''}${escapeHtml(item.userInput || 'ફોટા આધારિત પ્રશ્ન')}
          </div>
          <div style="display: flex; gap: 6px;">
            <button data-load-id="${escapeHtml(item.id)}" class="btn btn-outline" style="padding: 3px 8px; font-size: 0.75rem;">ખોલો</button>
            <button data-del-id="${escapeHtml(item.id)}" class="btn btn-outline" style="padding: 3px 8px; font-size: 0.75rem; color: #f87171; border-color: rgba(248, 113, 113, 0.4);">✕</button>
          </div>
        </div>
        <div style="font-size: 0.84rem; color: #cbd5e1; white-space: pre-wrap; max-height: 75px; overflow: hidden;">${escapeHtml(item.answer)}</div>
      </div>
    `).join('');

    historyListEl.querySelectorAll('[data-load-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const found = historyItems.find(x => x.id === btn.getAttribute('data-load-id'));
        if (!found) return;
        clarifyCardEl.style.display = 'none';
        userInputEl.value = found.userInput || '';
        generatedPromptEl.value = found.generatedPrompt || '';
        updatePromptStats(found.generatedPrompt || '');
        updatePromptTitleBySource(found.model && found.model.includes('gemini') ? 'gemini' : 'openai', found.model);
        promptCardEl.style.display = found.generatedPrompt ? 'block' : 'none';
        answerBodyEl.textContent = found.answer || '';
        answerCardEl.style.display = found.answer ? 'block' : 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    historyListEl.querySelectorAll('[data-del-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del-id');
        try {
          await api.deleteSmartAskEntry(id);
          historyItems = historyItems.filter(x => x.id !== id);
          renderHistory();
        } catch (_) {}
      });
    });
  }

  async function loadHistory() {
    try {
      const res = await api.getSmartAskHistory();
      historyItems = Array.isArray(res.history) ? res.history : [];
      renderHistory();
    } catch (_) {
      historyListEl.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">હિસ્ટ્રી લોડ ન થઈ શકી.</div>`;
    }
  }

  container.querySelector('#sa-btn-clear').addEventListener('click', () => {
    userInputEl.value = '';
    attachedImages = [];
    currentQuestions = [];
    renderPhotoPreviews();
    clarifyCardEl.style.display = 'none';
    clarifyQuestionsEl.innerHTML = '';
    if (clarifyExtraEl) clarifyExtraEl.value = '';
    generatedPromptEl.value = '';
    updatePromptStats('');
    promptCardEl.style.display = 'none';
    answerBodyEl.textContent = '';
    answerCardEl.style.display = 'none';
    setStatus('');
  });

  container.querySelector('#sa-btn-copy-prompt').addEventListener('click', () => {
    copyToClipboard(generatedPromptEl.value, 'World-Best Prompt કોપી થયો! ✓');
  });

  container.querySelector('#sa-btn-copy-answer').addEventListener('click', () => {
    copyToClipboard(answerBodyEl.textContent, 'જવાબ કોપી થયો! ✓');
  });

  container.querySelector('#sa-btn-refresh-history').addEventListener('click', loadHistory);

  container.querySelectorAll('.sa-open-chatgpt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = (generatedPromptEl.value || userInputEl.value || '').trim();
      if (text) {
        try { copyToClipboard(text, 'પૂરો Prompt કોપી થયો — ChatGPT માં Paste કરો ✓'); } catch (_) {}
      }
      const url = text && text.length <= 1500
        ? `https://chatgpt.com/?q=${encodeURIComponent(text)}`
        : 'https://chatgpt.com/';
      window.open(url, '_blank', 'noopener');
    });
  });

  container.querySelectorAll('.sa-open-gemini-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = (generatedPromptEl.value || userInputEl.value || '').trim();
      if (text) {
        try { copyToClipboard(text, 'પૂરો Prompt કોપી થયો — Gemini માં Paste કરો ✓'); } catch (_) {}
      }
      window.open('https://gemini.google.com/app', '_blank', 'noopener');
    });
  });

  loadHistory();
}
