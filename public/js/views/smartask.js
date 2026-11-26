import { api } from '../api.js?v=90.0';
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

  container.innerHTML = `
    <div style="max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; padding-bottom: 40px;">
      <!-- Header -->
      <div class="card" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.16), rgba(16, 185, 129, 0.12)); border: 1.5px solid rgba(139, 92, 246, 0.45); padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="margin: 0 0 6px 0; font-size: 1.35rem; color: #f8fafc;">
              ✨ મારો પ્રશ્ન & ફોટો AI (Prompt → ChatGPT જવાબ)
            </h2>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.92rem; line-height: 1.5;">
              તમારા મનનો કોઈ પણ પ્રશ્ન તમારી પોતાની ભાષામાં લખો અથવા ફોટો ઉમેરો — ટૂલ જાતે સમજીને સ્માર્ટ <b>Prompt</b> બનાવશે અને <b>ChatGPT</b> તેનો સ્પષ્ટ જવાબ આપશે.
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

      <!-- Step 1 & 2: User Input + Photo Upload -->
      <div class="card" style="padding: 20px; border: 1.5px solid rgba(56, 189, 248, 0.35);">
        <div style="font-weight: 800; color: #38bdf8; margin-bottom: 8px; font-size: 1rem;">
          ૧. તમારા મનનો પ્રશ્ન લખો (ગુજરાતી, ઇંગ્લિશ કે Roman Gujarati માં ગમે તે રીતે):
        </div>
        <textarea id="sa-user-input" class="input" rows="4"
          placeholder="ઉદાહરણ: 'આ ફોટામાં જે લખ્યું છે એ સરળ ગુજરાતીમાં સમજાવો' અથવા 'મારે આ વિષય પર 5 મિનિટનો વિડિયો બનાવવો છે, સારા મુદ્દા આપો' અથવા મનનો કોઈ પણ પ્રશ્ન..."
          style="width: 100%; resize: vertical; font-size: 0.98rem; line-height: 1.55; padding: 12px; border-radius: 12px;"></textarea>

        <!-- Photo Upload Area -->
        <div style="margin-top: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
            <span style="font-weight: 800; color: #a78bfa; font-size: 0.96rem;">
              ૨. ફોટો ઉમેરો (વૈકલ્પિક — 1 થી 4 ફોટા, ટૂલ ફોટાને આધારે પ્રોમ્પ્ટ લખશે):
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
              ફોનની ગેલેરી, કેમેરા અથવા સ્ક્રીનશોટ — ટૂલ ફોટો વાંચીને પ્રોમ્પ્ટ બનાવશે
            </div>
          </div>

          <div id="sa-photo-preview-grid" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px;"></div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px;">
          <button id="sa-btn-ask-all" class="btn btn-primary" style="flex: 2; min-width: 220px; padding: 12px 18px; font-weight: 800; font-size: 0.98rem; background: linear-gradient(135deg, #8b5cf6, #10b981); border: none;">
            🚀 Prompt બનાવો & ChatGPT જવાબ આપો
          </button>
          <button id="sa-btn-build-prompt" class="btn btn-outline" style="flex: 1; min-width: 190px; padding: 12px 16px; font-weight: 800; border-color: #38bdf8; color: #38bdf8;">
            🪄 પહેલા ફક્ત Prompt બનાવો
          </button>
          <button id="sa-btn-clear" class="btn btn-outline" style="padding: 12px 14px; font-weight: 700;">
            🧹 સાફ કરો
          </button>
        </div>

        <div id="sa-status-msg" style="margin-top: 10px; font-size: 0.88rem; color: #34d399; display: none;"></div>
      </div>

      <!-- Step 3: Generated Prompt Card -->
      <div id="sa-prompt-card" class="card" style="padding: 20px; border: 1.5px solid rgba(251, 191, 36, 0.45); display: none;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
          <div>
            <span style="font-weight: 800; color: #fbbf24; font-size: 1rem;">🪄 ટૂલે બનાવેલો સ્માર્ટ Prompt</span>
            <span id="sa-intent-badge" style="margin-left: 8px; font-size: 0.78rem; background: rgba(251, 191, 36, 0.16); color: #fde68a; padding: 3px 10px; border-radius: 999px;"></span>
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
        <textarea id="sa-generated-prompt" class="input" rows="5" style="width: 100%; font-size: 0.94rem; line-height: 1.55; padding: 12px; border-radius: 12px; background: rgba(15, 23, 42, 0.7);"></textarea>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 6px;">
          ટીપ: તમે અહીં Prompt માં ફેરફાર કરીને ફરી "ChatGPT જવાબ આપો" પર ક્લિક કરી શકો છો.
        </div>
      </div>

      <!-- Step 4: ChatGPT Answer Card -->
      <div id="sa-answer-card" class="card" style="padding: 20px; border: 1.5px solid rgba(16, 185, 129, 0.5); background: rgba(16, 185, 129, 0.06); display: none;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
          <span style="font-weight: 800; color: #34d399; font-size: 1.05rem;">🤖 ChatGPT નો જવાબ</span>
          <button id="sa-btn-copy-answer" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.82rem; font-weight: 700; border-color: #34d399; color: #34d399;">
            📋 જવાબ કોપી કરો
          </button>
        </div>
        <div id="sa-answer-body" style="white-space: pre-wrap; line-height: 1.7; font-size: 0.98rem; color: #f8fafc; background: rgba(15, 23, 42, 0.65); padding: 16px; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.2);"></div>
      </div>

      <!-- Saved History -->
      <div class="card" style="padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <h3 style="margin: 0; font-size: 1.02rem; color: #e2e8f0;">📚 અગાઉ પૂછેલા પ્રશ્નો & જવાબો</h3>
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
  const promptCardEl = container.querySelector('#sa-prompt-card');
  const intentBadgeEl = container.querySelector('#sa-intent-badge');
  const generatedPromptEl = container.querySelector('#sa-generated-prompt');
  const answerCardEl = container.querySelector('#sa-answer-card');
  const answerBodyEl = container.querySelector('#sa-answer-body');
  const historyListEl = container.querySelector('#sa-history-list');

  function setStatus(msg, isError = false) {
    if (!msg) {
      statusEl.style.display = 'none';
      return;
    }
    statusEl.style.display = 'block';
    statusEl.style.color = isError ? '#f87171' : '#34d399';
    statusEl.textContent = msg;
  }

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
        userInputEl.value = found.userInput || '';
        generatedPromptEl.value = found.generatedPrompt || '';
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

  const btnAskAll = container.querySelector('#sa-btn-ask-all');
  const btnBuildPrompt = container.querySelector('#sa-btn-build-prompt');
  const btnSendPrompt = container.querySelector('#sa-btn-send-prompt');

  function setBusy(busy) {
    [btnAskAll, btnBuildPrompt, btnSendPrompt].forEach(b => {
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

  btnBuildPrompt.addEventListener('click', async () => {
    const userInput = userInputEl.value.trim();
    if (!userInput && attachedImages.length === 0) {
      setStatus('કૃપા કરીને તમારો પ્રશ્ન લખો અથવા ફોટો ઉમેરો.', true);
      return;
    }
    setBusy(true);
    generatedPromptEl.value = '';
    setStatus('🪄 તમારી ભાષા અને ફોટો સમજીને શુદ્ધ ગુજરાતી Prompt બની રહ્યો છે...');
    try {
      const res = await api.buildSmartPrompt({
        userInput,
        images: attachedImages,
        answerLanguage: langSelectEl.value
      });
      generatedPromptEl.value = res.generatedPrompt || '';
      intentBadgeEl.textContent = `${res.detectedIntent || 'Prompt તૈયાર છે'} • ${sourceLabel(res.source, res.model)}`;
      promptCardEl.style.display = 'block';
      setStatus(`✅ Master Prompt તૈયાર છે (${sourceLabel(res.source, res.model)})!`);
    } catch (err) {
      setStatus(`ભૂલ: ${err.message}`, true);
    } finally {
      setBusy(false);
    }
  });

  btnSendPrompt.addEventListener('click', async () => {
    const prompt = generatedPromptEl.value.trim();
    const userInput = userInputEl.value.trim();
    if (!prompt && !userInput && attachedImages.length === 0) {
      setStatus('પહેલા Prompt બનાવો અથવા પ્રશ્ન લખો.', true);
      return;
    }
    setBusy(true);
    answerBodyEl.textContent = '';
    setStatus('🤖 AI તમારા Prompt અને ફોટા પરથી જવાબ તૈયાર કરી રહ્યું છે...');
    try {
      const res = await api.answerSmartPrompt({
        prompt,
        userInput,
        images: attachedImages,
        answerLanguage: langSelectEl.value
      });
      answerBodyEl.textContent = res.answer || '';
      answerCardEl.style.display = 'block';
      setStatus(`✅ જવાબ તૈયાર છે (${sourceLabel(res.source)})!`);
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
    generatedPromptEl.value = '';
    answerBodyEl.textContent = '';
    setStatus('🚀 ટૂલ તમારી ભાષા & ફોટો સમજીને સચોટ Prompt અને AI જવાબ તૈયાર કરી રહ્યું છે...');
    try {
      const res = await api.smartAskAll({
        userInput,
        images: attachedImages,
        answerLanguage: langSelectEl.value
      });
      generatedPromptEl.value = res.generatedPrompt || '';
      intentBadgeEl.textContent = `${res.detectedIntent || 'Prompt તૈયાર છે'} • ${sourceLabel(res.source, res.model)}`;
      promptCardEl.style.display = 'block';
      answerBodyEl.textContent = res.answer || '';
      answerCardEl.style.display = 'block';
      setStatus(`✅ Prompt અને જવાબ બંને તૈયાર છે (${sourceLabel(res.source, res.model)})!`);
      loadHistory();
    } catch (err) {
      setStatus(`ભૂલ: ${err.message}`, true);
    } finally {
      setBusy(false);
    }
  });

  container.querySelector('#sa-btn-clear').addEventListener('click', () => {
    userInputEl.value = '';
    attachedImages = [];
    renderPhotoPreviews();
    generatedPromptEl.value = '';
    promptCardEl.style.display = 'none';
    answerBodyEl.textContent = '';
    answerCardEl.style.display = 'none';
    setStatus('');
  });

  container.querySelector('#sa-btn-copy-prompt').addEventListener('click', () => {
    copyToClipboard(generatedPromptEl.value, 'Prompt કોપી થયો! ✓');
  });

  container.querySelector('#sa-btn-copy-answer').addEventListener('click', () => {
    copyToClipboard(answerBodyEl.textContent, 'જવાબ કોપી થયો! ✓');
  });

  container.querySelector('#sa-btn-refresh-history').addEventListener('click', loadHistory);

  container.querySelectorAll('.sa-open-chatgpt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = (generatedPromptEl.value || userInputEl.value || '').trim();
      if (text) {
        try { copyToClipboard(text, 'Prompt કોપી થયો — ChatGPT ખૂલી રહ્યું છે ✓'); } catch (_) {}
      }
      const url = text
        ? `https://chatgpt.com/?q=${encodeURIComponent(text.slice(0, 1500))}`
        : 'https://chatgpt.com/';
      window.open(url, '_blank', 'noopener');
    });
  });

  container.querySelectorAll('.sa-open-gemini-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = (generatedPromptEl.value || userInputEl.value || '').trim();
      if (text) {
        try { copyToClipboard(text, 'Prompt કોપી થયો — Gemini માં Paste કરો ✓'); } catch (_) {}
      }
      window.open('https://gemini.google.com/app', '_blank', 'noopener');
    });
  });

  loadHistory();
}
