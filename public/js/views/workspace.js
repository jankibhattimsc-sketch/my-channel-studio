import { api } from '../api.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { projectState } from '../utils/projectState.js';
import { generateClientNotebookLMPrompt } from '../utils/notebooklmPromptGenerator.js';

export async function renderWorkspace(container, navigateTo) {
  let viewMode = '3-column'; // '3-column' (default side-by-side), 'notebooklm', 'chatgpt', 'canva'
  let creatorEmail = '';
  let currentTopic = projectState.getTopic() || 'આંગણવાડી સુપરવાઈઝર ભરતી 2026: નવી જાહેરાત';
  
  // Chat state
  let chatHistory = [
    {
      role: 'assistant',
      content: `નમસ્તે! હું તમારો YouTube Creator AI સહાયક છું.\n\nવિષય **"${currentTopic}"** માટે ડાબી બાજુથી NotebookLM રિસર્ચ લાવો, અહીં હું તમને સ્ક્રિપ્ટ અને હૂક તૈયાર કરી આપીશ અને જમણી બાજુ ૧-ક્લિકથી Canva માં ૧૬:૯ થંબનેલ બની જશે!`
    }
  ];
  let isSendingChat = false;

  // Canvas Graphic Studio state
  let canvasState = {
    headline: currentTopic,
    subtitle: 'સત્તાવાર જાહેરાત & સંપૂર્ણ વિગત | જ્ઞાન યાત્રા',
    badgeText: '🔥 નવી જાહેરાત',
    theme: 'navy-yellow', // 'navy-yellow', 'red-gold', 'emerald', 'purple', 'dark-neon'
    bgImage: null
  };

  // NotebookLM generated slides state
  let generatedSlides = null;
  let isGeneratingSlides = false;

  // Load current settings to fetch creatorEmail
  try {
    const res = await api.getSettings();
    creatorEmail = res.settings?.creatorEmail || '';
  } catch (err) {
    console.warn('Could not load creatorEmail in workspace:', err);
  }

  function render() {
    const notebookPrompt = generateClientNotebookLMPrompt({
      topic: currentTopic,
      templateId: 'white-real',
      tool: 'notebooklm-slides',
      slideCount: '8-10',
      includeBranding: true
    });

    const notebookUrl = creatorEmail 
      ? `https://notebooklm.google.com/?authuser=${encodeURIComponent(creatorEmail)}` 
      : 'https://notebooklm.google.com';

    container.innerHTML = `
      <!-- Top Control Bar -->
      <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: var(--radius-lg); padding: 18px 22px; margin-bottom: 18px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 1.8rem; background: rgba(56, 189, 248, 0.15); padding: 6px 12px; border-radius: 10px; border: 1px solid rgba(56, 189, 248, 0.3);">⚡</span>
            <div>
              <h2 style="font-size: 1.3rem; font-weight: 800; color: #ffffff; margin: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                ઓલ-ઇન-વન ૩-ઇન-૧ યુનિફાઇડ સ્ટુડિયો (3-in-1 Side-by-Side Studio)
                <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 0.72rem;">૩ ઊભા ખાનામાં લાઇવ</span>
              </h2>
              <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 2px 0 0 0;">
                NotebookLM રિસર્ચ + ChatGPT સ્ક્રિપ્ટ + Canva લાઈવ થંબનેલ — ત્રણેય એક જ સ્ક્રીન પર એક સાથે!
              </p>
            </div>
          </div>

          <!-- Current Topic Chip -->
          <div style="background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 6px 12px; font-size: 0.8rem; display: flex; align-items: center; gap: 8px;">
            <span style="color: #f59e0b; font-weight: 700;">📌 વિષય:</span>
            <strong style="color: #ffffff; max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${currentTopic}</strong>
            <button id="btn-change-topic-quick" class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 0.7rem;">બદલો</button>
          </div>
        </div>

        <!-- Google Email Configuration & View Modes -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);">
          <!-- Left: Email Connection -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">📧 ગૂગલ એકાઉન્ટ:</span>
            <input type="email" id="input-creator-email" class="form-input" placeholder="તમારું Gmail..." value="${creatorEmail}" style="font-size: 0.82rem; padding: 6px 10px; width: 230px;">
            <button id="btn-save-creator-email" class="btn btn-primary btn-sm" style="font-size: 0.78rem; padding: 6px 12px; background: #0284c7; border: none; font-weight: 700;">
              💾 સાચવો
            </button>
            <span style="font-size: 0.76rem; color: #a7f3d0;">
              ${creatorEmail ? `✓ (${creatorEmail}) લિંક્ડ છે` : ''}
            </span>
          </div>

          <!-- Right: View Layout Toggle -->
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn ${viewMode === '3-column' ? 'btn-success' : 'btn-outline'} btn-sm btn-mode-tab" data-mode="3-column" style="font-weight: 700;">
              <span>⚡</span> ૩ ખાના સ્પ્લિટ (3-Column View)
            </button>
            <button class="btn ${viewMode === 'notebooklm' ? 'btn-primary' : 'btn-outline'} btn-sm btn-mode-tab" data-mode="notebooklm">
              <span>📓</span> ૧. NotebookLM Focus
            </button>
            <button class="btn ${viewMode === 'chatgpt' ? 'btn-primary' : 'btn-outline'} btn-sm btn-mode-tab" data-mode="chatgpt">
              <span>💬</span> ૨. ChatGPT Focus
            </button>
            <button class="btn ${viewMode === 'canva' ? 'btn-primary' : 'btn-outline'} btn-sm btn-mode-tab" data-mode="canva">
              <span>🎨</span> ૩. Canva Focus
            </button>
          </div>
        </div>
      </div>

      <!-- Main Workspace Panels Container -->
      <div id="workspace-grid-container">
        ${renderWorkspaceLayout(notebookPrompt, notebookUrl)}
      </div>

      <!-- Quick Seamless Workflow Guide Strip -->
      <div style="margin-top: 20px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-lg); padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; font-size: 0.78rem;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #f59e0b; font-weight: 800;">🚀 ૧-સ્ક્રીન ફ્લો:</span>
          <span style="color: #cbd5e1;">ડાબી બાજુ <strong>NotebookLM</strong> માંથી રિસર્ચ લો ➔ વચ્ચે <strong>ChatGPT</strong> માં સ્ક્રિપ્ટ બનાવો ➔ જમણી બાજુ <strong>Canva</strong> માંથી HD થંબનેલ ડાઉનલોડ કરો!</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="btn-footer-goto-script" class="btn btn-outline btn-sm" style="font-size: 0.72rem;">📝 સ્ક્રિપ્ટ રાઇટર ➔</button>
          <button id="btn-footer-goto-voice" class="btn btn-outline btn-sm" style="font-size: 0.72rem;">🎙️ મારો અવાજ ➔</button>
        </div>
      </div>
    `;

    attachEvents(notebookPrompt, notebookUrl);
  }

  function renderWorkspaceLayout(notebookPrompt, notebookUrl) {
    if (viewMode === 'notebooklm') {
      return `<div style="max-width: 900px; margin: 0 auto;">${renderNotebookLMColumn(notebookPrompt, notebookUrl, true)}</div>`;
    }
    if (viewMode === 'chatgpt') {
      return `<div style="max-width: 900px; margin: 0 auto;">${renderChatGPTColumn(true)}</div>`;
    }
    if (viewMode === 'canva') {
      return `<div style="max-width: 900px; margin: 0 auto;">${renderCanvaColumn(true)}</div>`;
    }

    // Default: 3-Column Side-by-Side Layout
    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; align-items: stretch;">
        <!-- COLUMN 1: NotebookLM Research -->
        <div style="display: flex; flex-direction: column;">
          ${renderNotebookLMColumn(notebookPrompt, notebookUrl, false)}
        </div>

        <!-- COLUMN 2: ChatGPT Creator AI -->
        <div style="display: flex; flex-direction: column;">
          ${renderChatGPTColumn(false)}
        </div>

        <!-- COLUMN 3: Canva Graphic Studio -->
        <div style="display: flex; flex-direction: column;">
          ${renderCanvaColumn(false)}
        </div>
      </div>
    `;
  }

  // --- COLUMN 1: NotebookLM Research Component ---
  function renderNotebookLMColumn(notebookPrompt, notebookUrl, isFull) {
    return `
      <div class="card" style="border: 1.5px solid #8b5cf6; background: #0f172a; padding: 18px; border-radius: var(--radius-lg); flex: 1; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
        <div>
          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(139, 92, 246, 0.3);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.4rem;">📓</span>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; color: #ffffff; margin: 0;">
                  ૧. Google NotebookLM
                </h3>
                <span style="font-size: 0.72rem; color: #c4b5fd;">
                  સત્તાવાર AI રિસર્ચ & સ્લાઇડ્સ
                </span>
              </div>
            </div>

            <!-- Launch Button -->
            <button id="btn-col-dock-notebook" class="btn btn-primary btn-sm" style="font-size: 0.72rem; padding: 4px 10px; background: #7c3aed; border: none; font-weight: 700;" title="ગૂગલ એકાઉન્ટ સાથે વિન્ડો ખોલો">
              ખોલો ↗
            </button>
          </div>

          <!-- Prompt Box -->
          <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #c4b5fd;">📋 માસ્ટર સ્લાઇડ પ્રોમ્પ્ટ:</span>
              <button id="btn-col-generate-slides" class="btn btn-outline btn-sm" style="font-size: 0.68rem; padding: 1px 6px; border-color: #8b5cf6; color: #c4b5fd;">
                ${isGeneratingSlides ? '⏳ બનશે...' : '✨ ૮ સ્લાઇડ્સ'}
              </button>
            </div>
            <textarea id="notebooklm-prompt-text" class="form-input font-gu" style="width: 100%; height: ${isFull ? '240px' : '150px'}; font-size: 0.76rem; line-height: 1.4; background: #070a12; color: #f1f5f9; border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 8px; resize: none;" readonly>${notebookPrompt}</textarea>
          </div>

          <!-- Copy Button Strip -->
          <div style="display: flex; gap: 6px; margin-bottom: 12px;">
            <button id="btn-col-copy-prompt" class="btn btn-success btn-sm" style="flex: 1; font-size: 0.74rem; font-weight: 700; padding: 6px 10px;">
              📋 પ્રોમ્પ્ટ કોપી કરો
            </button>
            <button id="btn-col-send-to-chat" class="btn btn-outline btn-sm" style="font-size: 0.74rem; font-weight: 700; border-color: #10b981; color: #6ee7b7; padding: 6px 10px;" title="આ રિસર્ચ સીધું ChatGPT માં મોકલો">
              💬 ચેટમાં મોકલો ➔
            </button>
          </div>

          <!-- Slide Outlines Preview -->
          <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px;">
            <div style="font-size: 0.74rem; font-weight: 800; color: #c4b5fd; margin-bottom: 6px; display: flex; justify-content: space-between;">
              <span>📑 સ્લાઇડ પોઇન્ટ્સ (Slides):</span>
              <span class="badge" style="background: rgba(139, 92, 246, 0.2); color: #c4b5fd; font-size: 0.65rem;">8 Ready</span>
            </div>
            <div style="max-height: ${isFull ? '260px' : '170px'}; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px;">
              ${(generatedSlides || getDefaultSlides(currentTopic)).slice(0, 5).map((sl, idx) => `
                <div style="background: #0f172a; border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 6px; padding: 6px 8px; font-size: 0.72rem;">
                  <strong style="color: #f1f5f9; display: block;">${idx + 1}. ${sl.title}</strong>
                  <span style="color: #94a3b8; font-size: 0.68rem;">${sl.bullets.join(' • ')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div style="margin-top: 10px; font-size: 0.7rem; color: #a78bfa; text-align: center;">
          💡 સ્લાઇડ પ્રોમ્પ્ટ કોપી કરી ૧-ક્લિકમાં NotebookLM માં પેસ્ટ કરો.
        </div>
      </div>
    `;
  }

  // --- COLUMN 2: ChatGPT Creator AI Component ---
  function renderChatGPTColumn(isFull) {
    return `
      <div class="card" style="border: 1.5px solid #10b981; background: #0f172a; padding: 18px; border-radius: var(--radius-lg); flex: 1; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
        <div>
          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(16, 185, 129, 0.3);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.4rem;">💬</span>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; color: #ffffff; margin: 0;">
                  ૨. ChatGPT Creator AI
                </h3>
                <span style="font-size: 0.72rem; color: #6ee7b7;">
                  લાઈવ ગુજરાતી સ્ક્રિપ્ટ & હૂક
                </span>
              </div>
            </div>

            <button id="btn-col-clear-chat" class="btn btn-outline btn-sm" style="font-size: 0.68rem; padding: 2px 6px; border-color: rgba(255,255,255,0.2);" title="નવી ચર્ચા શરૂ કરો">
              🔄 નવું
            </button>
          </div>

          <!-- Chat Stream -->
          <div id="col-chat-messages" style="background: #070a12; border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 12px; height: ${isFull ? '340px' : '220px'}; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px;">
            ${chatHistory.map((msg, idx) => `
              <div style="display: flex; gap: 6px; align-items: flex-start; ${msg.role === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}">
                <div style="max-width: 88%; background: ${msg.role === 'user' ? '#065f46' : 'rgba(15, 23, 42, 0.95)'}; border: 1px solid ${msg.role === 'user' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 8px; padding: 8px 12px; font-size: 0.78rem; line-height: 1.5; color: #f8fafc; white-space: pre-wrap;">
                  ${formatChatMessage(msg.content)}

                  ${msg.role === 'assistant' && idx > 0 ? `
                    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; gap: 6px; flex-wrap: wrap;">
                      <button class="btn btn-outline btn-sm btn-copy-bubble" data-text="${encodeURIComponent(msg.content)}" style="font-size: 0.66rem; padding: 1px 6px;">
                        📋 કોપી
                      </button>
                      <button class="btn btn-outline btn-sm btn-use-as-canva" data-text="${encodeURIComponent(msg.content.slice(0, 90))}" style="font-size: 0.66rem; padding: 1px 6px; border-color: #38bdf8; color: #38bdf8;">
                        🎨 Canva માં લગાવો ➔
                      </button>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Fast Action Chips -->
          <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
            <button class="btn btn-outline btn-sm btn-col-quick-chip" data-prompt="વિષય: '${currentTopic}' માટે 45 સેકન્ડનો હાઇ-રીટેન્શન વિડીયો હૂક અને 3 ધમાકેદાર ટાઇટલ આપો." style="font-size: 0.68rem; padding: 2px 6px; border-color: rgba(16, 185, 129, 0.35);">
              🔥 ૪૫ સેકન્ડ હૂક
            </button>
            <button class="btn btn-outline btn-sm btn-col-quick-chip" data-prompt="વિષય: '${currentTopic}' માટે 10 મિનિટના વિડીયોની મુદ્દાસર ગુજરાતી સ્ક્રિપ્ટ લખો." style="font-size: 0.68rem; padding: 2px 6px; border-color: rgba(16, 185, 129, 0.35);">
              📝 ૧૦ મિનિટ સ્ક્રિપ્ટ
            </button>
            <button class="btn btn-outline btn-sm btn-col-quick-chip" data-prompt="વિષય: '${currentTopic}' માટે થંબનેલ પર લખવા જેવા 3 બોલ્ડ શબ્દો આપો." style="font-size: 0.68rem; padding: 2px 6px; border-color: rgba(16, 185, 129, 0.35);">
              🎨 થંબનેલ લખાણ
            </button>
          </div>
        </div>

        <!-- Chat Input Form -->
        <div style="display: flex; gap: 6px; align-items: flex-end;">
          <textarea id="col-chat-input" class="form-input font-gu" placeholder="ChatGPT ને પૂછો... (Enter દબાવો)..." style="flex: 1; height: 50px; font-size: 0.8rem; resize: none; border: 1px solid rgba(16, 185, 129, 0.5);"></textarea>
          <button id="btn-col-send-chat" class="btn btn-primary btn-sm" style="height: 50px; padding: 0 14px; font-weight: 800; background: #059669; border: none;">
            🚀
          </button>
        </div>
      </div>
    `;
  }

  // --- COLUMN 3: Canva Graphic Studio Component ---
  function renderCanvaColumn(isFull) {
    return `
      <div class="card" style="border: 1.5px solid #38bdf8; background: #0f172a; padding: 18px; border-radius: var(--radius-lg); flex: 1; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
        <div>
          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(56, 189, 248, 0.3);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.4rem;">🎨</span>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; color: #ffffff; margin: 0;">
                  ૩. Canva Graphic Studio
                </h3>
                <span style="font-size: 0.72rem; color: #38bdf8;">
                  લાઈવ ૧૬:૯ HD થંબનેલ
                </span>
              </div>
            </div>

            <!-- Download Button -->
            <button id="btn-col-download-png" class="btn btn-success btn-sm" style="font-size: 0.72rem; font-weight: 800; padding: 4px 10px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);">
              📥 ડાઉનલોડ (PNG)
            </button>
          </div>

          <!-- Live 16:9 Canvas Screen -->
          <div style="width: 100%; aspect-ratio: 16 / 9; background: #000; border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 8px; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.6); position: relative; margin-bottom: 10px;">
            <canvas id="live-thumbnail-canvas" width="1280" height="720" style="width: 100%; height: 100%; display: block; object-fit: contain;"></canvas>
          </div>

          <!-- Controls -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div>
              <span style="font-size: 0.72rem; font-weight: 700; color: #38bdf8; display: block; margin-bottom: 2px;">
                મુખ્ય ટાઇટલ (Headline):
              </span>
              <input type="text" id="col-input-headline" class="form-input font-gu" value="${canvasState.headline}" style="font-size: 0.78rem; padding: 6px 8px;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div>
                <span style="font-size: 0.72rem; font-weight: 700; color: #38bdf8; display: block; margin-bottom: 2px;">
                  બેજ (Badge):
                </span>
                <input type="text" id="col-input-badge" class="form-input font-gu" value="${canvasState.badgeText}" style="font-size: 0.74rem; padding: 5px 8px;">
              </div>
              <div>
                <span style="font-size: 0.72rem; font-weight: 700; color: #38bdf8; display: block; margin-bottom: 2px;">
                  પંચલાઈન:
                </span>
                <input type="text" id="col-input-subtitle" class="form-input font-gu" value="${canvasState.subtitle}" style="font-size: 0.74rem; padding: 5px 8px;">
              </div>
            </div>

            <!-- Color Presets -->
            <div>
              <span style="font-size: 0.72rem; font-weight: 700; color: #38bdf8; display: block; margin-bottom: 4px;">
                કલર થીમ:
              </span>
              <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                <button class="btn btn-outline btn-sm btn-col-theme ${canvasState.theme === 'navy-yellow' ? 'active' : ''}" data-theme="navy-yellow" style="font-size: 0.68rem; padding: 2px 6px; border-color: #38bdf8;">
                  ⚡ નેવી
                </button>
                <button class="btn btn-outline btn-sm btn-col-theme ${canvasState.theme === 'red-gold' ? 'active' : ''}" data-theme="red-gold" style="font-size: 0.68rem; padding: 2px 6px; border-color: #ef4444;">
                  🔴 રેડ
                </button>
                <button class="btn btn-outline btn-sm btn-col-theme ${canvasState.theme === 'emerald' ? 'active' : ''}" data-theme="emerald" style="font-size: 0.68rem; padding: 2px 6px; border-color: #10b981;">
                  🟢 ગ્રીન
                </button>
                <button class="btn btn-outline btn-sm btn-col-theme ${canvasState.theme === 'purple' ? 'active' : ''}" data-theme="purple" style="font-size: 0.68rem; padding: 2px 6px; border-color: #8b5cf6;">
                  🟣 પર્પલ
                </button>
                <button class="btn btn-outline btn-sm btn-col-theme ${canvasState.theme === 'dark-neon' ? 'active' : ''}" data-theme="dark-neon" style="font-size: 0.68rem; padding: 2px 6px; border-color: #facc15;">
                  🖤 ડાર્ક
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Canva External Link Footer -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08);">
          <span style="font-size: 0.68rem; color: var(--text-muted);">1280×720 HD ફોર્મેટ</span>
          <a href="https://www.canva.com/create/youtube-thumbnails/" target="_blank" rel="noopener noreferrer" style="font-size: 0.72rem; color: #38bdf8; text-decoration: none; font-weight: 700;">
            Canva.com ખોલો ↗
          </a>
        </div>
      </div>
    `;
  }

  // Event Listeners
  function attachEvents(notebookPrompt, notebookUrl) {
    // 1. Layout Mode Switcher Tabs
    container.querySelectorAll('.btn-mode-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        viewMode = e.currentTarget.getAttribute('data-mode');
        render();
        setTimeout(() => redrawCanvas(), 40);
      });
    });

    // 2. Save Creator Email
    container.querySelector('#btn-save-creator-email')?.addEventListener('click', async (e) => {
      const input = container.querySelector('#input-creator-email');
      const val = input ? input.value.trim() : '';
      if (!val) {
        alert('કૃપા કરીને માન્ય Gmail દાખલ કરો.');
        return;
      }
      try {
        await api.saveSettings({ creatorEmail: val });
        creatorEmail = val;
        copyToClipboard(val, '✓ Email સાચવી લીધો છે!', e.currentTarget);
        setTimeout(() => render(), 700);
      } catch (err) {
        alert('ક્ષતિ: ' + err.message);
      }
    });

    // 3. Quick Change Topic
    container.querySelector('#btn-change-topic-quick')?.addEventListener('click', () => {
      const newT = prompt('વિડીયોનો નવો વિષય દાખલ કરો:', currentTopic);
      if (newT && newT.trim()) {
        currentTopic = newT.trim();
        projectState.setTopic(currentTopic);
        canvasState.headline = currentTopic;
        render();
        setTimeout(() => redrawCanvas(), 40);
      }
    });

    // 4. NotebookLM Dock Launch
    const openNotebookDock = () => {
      window.open(notebookUrl, 'notebooklm_dock', 'width=950,height=850,menubar=no,toolbar=no,location=yes,status=no');
    };
    container.querySelector('#btn-col-dock-notebook')?.addEventListener('click', openNotebookDock);

    // Copy Prompt
    container.querySelector('#btn-col-copy-prompt')?.addEventListener('click', (e) => {
      copyToClipboard(notebookPrompt, '📋 NotebookLM પ્રોમ્પ્ટ કોપી થયો! ✓', e.currentTarget);
    });

    // Send Research to Chat
    container.querySelector('#btn-col-send-to-chat')?.addEventListener('click', () => {
      const msg = `વિષય: '${currentTopic}'. આ વિષય પર વિડીયો માટે 45 સેકન્ડનો વાયરલ હૂક અને 10 મિનિટની સ્ક્રિપ્ટ આપો.`;
      const chatIn = container.querySelector('#col-chat-input');
      if (chatIn) {
        chatIn.value = msg;
        handleSendChat(msg);
      }
    });

    // Generate Slides
    container.querySelector('#btn-col-generate-slides')?.addEventListener('click', async () => {
      if (isGeneratingSlides) return;
      isGeneratingSlides = true;
      render();

      try {
        const res = await api.generateWhiteSlides({ topic: currentTopic, count: 8 });
        if (res.slides && res.slides.length > 0) {
          generatedSlides = res.slides.map(s => ({
            title: s.title || 'મુખ્ય વિગત',
            bullets: s.bulletPoints || ['મહત્વપૂર્ણ મુદ્દો ૧', 'મહત્વપૂર્ણ મુદ્દો ૨']
          }));
        }
      } catch (err) {
        generatedSlides = getDefaultSlides(currentTopic);
      } finally {
        isGeneratingSlides = false;
        render();
        setTimeout(() => redrawCanvas(), 40);
      }
    });

    // 5. ChatGPT Events
    const chatInput = container.querySelector('#col-chat-input');
    const sendChatBtn = container.querySelector('#btn-col-send-chat');

    async function handleSendChat(text) {
      if (!text || !text.trim() || isSendingChat) return;
      const query = text.trim();
      isSendingChat = true;

      chatHistory.push({ role: 'user', content: query });
      renderChatMessages();

      if (chatInput) chatInput.value = '';

      try {
        const res = await api.sendChatMessage({
          conversationId: 'default-conv',
          message: query,
          includeChannelContext: true
        });

        let reply = '';
        if (typeof res.reply === 'string') {
          reply = res.reply;
        } else if (res.message && typeof res.message.content === 'string') {
          reply = res.message.content;
        } else if (typeof res.message === 'string') {
          reply = res.message;
        } else {
          reply = 'જવાબ તૈયાર છે!';
        }

        chatHistory.push({ role: 'assistant', content: reply });
      } catch (err) {
        chatHistory.push({
          role: 'assistant',
          content: `⚠️ ક્ષતિ: ${err.message || 'સંપર્ક થઈ શક્યો નથી.'}`
        });
      } finally {
        isSendingChat = false;
        renderChatMessages();
      }
    }

    sendChatBtn?.addEventListener('click', () => {
      if (chatInput) handleSendChat(chatInput.value);
    });

    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendChat(chatInput.value);
      }
    });

    container.querySelector('#btn-col-clear-chat')?.addEventListener('click', () => {
      chatHistory = [
        {
          role: 'assistant',
          content: `નવી ચર્ચા શરૂ થઈ છે. વિષય: "${currentTopic}".`
        }
      ];
      renderChatMessages();
    });

    // Quick chips
    container.querySelectorAll('.btn-col-quick-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const pr = e.currentTarget.getAttribute('data-prompt');
        if (pr) handleSendChat(pr);
      });
    });

    function renderChatMessages() {
      const msgBox = container.querySelector('#col-chat-messages');
      if (!msgBox) return;

      msgBox.innerHTML = chatHistory.map((msg, idx) => `
        <div style="display: flex; gap: 6px; align-items: flex-start; ${msg.role === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}">
          <div style="max-width: 88%; background: ${msg.role === 'user' ? '#065f46' : 'rgba(15, 23, 42, 0.95)'}; border: 1px solid ${msg.role === 'user' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}; border-radius: 8px; padding: 8px 12px; font-size: 0.78rem; line-height: 1.5; color: #f8fafc; white-space: pre-wrap;">
            ${formatChatMessage(msg.content)}

            ${msg.role === 'assistant' && idx > 0 ? `
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; gap: 6px; flex-wrap: wrap;">
                <button class="btn btn-outline btn-sm btn-copy-bubble" data-text="${encodeURIComponent(msg.content)}" style="font-size: 0.66rem; padding: 1px 6px;">
                  📋 કોપી
                </button>
                <button class="btn btn-outline btn-sm btn-use-as-canva" data-text="${encodeURIComponent(msg.content.slice(0, 90))}" style="font-size: 0.66rem; padding: 1px 6px; border-color: #38bdf8; color: #38bdf8;">
                  🎨 Canva માં લગાવો ➔
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('');

      if (isSendingChat) {
        msgBox.innerHTML += `
          <div style="display: flex; gap: 6px; align-items: center; color: #6ee7b7; font-size: 0.72rem; padding: 4px;">
            <div class="pulse-indicator" style="width: 12px; height: 12px;"></div>
            <span>ChatGPT જવાબ તૈયાર કરે છે...</span>
          </div>
        `;
      }

      msgBox.scrollTop = msgBox.scrollHeight;
      attachChatBubbleEvents();
    }

    function attachChatBubbleEvents() {
      container.querySelectorAll('.btn-copy-bubble').forEach(b => {
        b.addEventListener('click', (e) => {
          const t = decodeURIComponent(e.currentTarget.getAttribute('data-text'));
          copyToClipboard(t, 'જવાબ કોપી થયો! ✓', e.currentTarget);
        });
      });

      container.querySelectorAll('.btn-use-as-canva').forEach(b => {
        b.addEventListener('click', (e) => {
          const t = decodeURIComponent(e.currentTarget.getAttribute('data-text'));
          canvasState.headline = t.replace(/[*#]/g, '').trim().slice(0, 75);
          const headlineInput = container.querySelector('#col-input-headline');
          if (headlineInput) headlineInput.value = canvasState.headline;
          redrawCanvas();
        });
      });
    }

    attachChatBubbleEvents();

    // 6. Canva Visual Controls
    const headlineIn = container.querySelector('#col-input-headline');
    const badgeIn = container.querySelector('#col-input-badge');
    const subtitleIn = container.querySelector('#col-input-subtitle');

    headlineIn?.addEventListener('input', (e) => {
      canvasState.headline = e.target.value;
      redrawCanvas();
    });

    badgeIn?.addEventListener('input', (e) => {
      canvasState.badgeText = e.target.value;
      redrawCanvas();
    });

    subtitleIn?.addEventListener('input', (e) => {
      canvasState.subtitle = e.target.value;
      redrawCanvas();
    });

    container.querySelectorAll('.btn-col-theme').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const th = e.currentTarget.getAttribute('data-theme');
        canvasState.theme = th;
        container.querySelectorAll('.btn-col-theme').forEach(x => x.classList.remove('active'));
        e.currentTarget.classList.add('active');
        redrawCanvas();
      });
    });

    container.querySelector('#btn-col-download-png')?.addEventListener('click', () => {
      const canvas = container.querySelector('#live-thumbnail-canvas');
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `gyan_yatra_thumbnail_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });

    // 7. Footer Navigation
    container.querySelector('#btn-footer-goto-script')?.addEventListener('click', () => navigateTo('scriptwriter'));
    container.querySelector('#btn-footer-goto-voice')?.addEventListener('click', () => navigateTo('myvoice'));

    // Trigger Canvas Drawing
    setTimeout(() => redrawCanvas(), 50);
  }

  // Safe drawRoundRect helper (cross-browser compatible)
  function drawRoundRect(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }

  // Live Canvas 16:9 Drawing Engine (1280x720)
  function redrawCanvas() {
    const canvas = container.querySelector('#live-thumbnail-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 1280;
    const height = 720;

    // 1. Background
    if (canvasState.bgImage) {
      ctx.drawImage(canvasState.bgImage, 0, 0, width, height);
      const overlay = ctx.createLinearGradient(0, 0, width, height);
      overlay.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
      overlay.addColorStop(0.6, 'rgba(15, 23, 42, 0.7)');
      overlay.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, width, height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      if (canvasState.theme === 'red-gold') {
        grad.addColorStop(0, '#7f1d1d');
        grad.addColorStop(0.5, '#450a0a');
        grad.addColorStop(1, '#180404');
      } else if (canvasState.theme === 'emerald') {
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(0.5, '#022c22');
        grad.addColorStop(1, '#021812');
      } else if (canvasState.theme === 'purple') {
        grad.addColorStop(0, '#581c87');
        grad.addColorStop(0.5, '#3b0764');
        grad.addColorStop(1, '#1e0338');
      } else if (canvasState.theme === 'dark-neon') {
        grad.addColorStop(0, '#18181b');
        grad.addColorStop(0.5, '#09090b');
        grad.addColorStop(1, '#000000');
      } else {
        // navy-yellow
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.4, '#1e293b');
        grad.addColorStop(1, '#020617');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Ambient glows
      ctx.save();
      ctx.filter = 'blur(60px)';
      ctx.fillStyle = canvasState.theme === 'red-gold' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.arc(200, 180, 260, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = canvasState.theme === 'red-gold' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(250, 204, 21, 0.3)';
      ctx.beginPath();
      ctx.arc(width - 250, height - 180, 300, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Channel Branding Ribbon
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    drawRoundRect(ctx, width - 240, 36, 195, 48, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Noto Sans Gujarati", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('જ્ઞાન યાત્રા 🎓', width - 240 + 97, 60);
    ctx.restore();

    // 3. Attention Badge
    if (canvasState.badgeText) {
      ctx.save();
      const badgeText = canvasState.badgeText;
      ctx.font = 'bold 26px "Noto Sans Gujarati", sans-serif';
      const textWidth = ctx.measureText(badgeText).width;
      const bPadding = 24;
      const bWidth = textWidth + bPadding * 2;
      const bHeight = 52;
      const bX = 50;
      const bY = 40;

      const bGrad = ctx.createLinearGradient(bX, bY, bX + bWidth, bY + bHeight);
      bGrad.addColorStop(0, '#dc2626');
      bGrad.addColorStop(1, '#ef4444');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      drawRoundRect(ctx, bX, bY, bWidth, bHeight, 10);
      ctx.fill();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, bX + bPadding, bY + bHeight / 2);
      ctx.restore();
    }

    // 4. Headline Gujarati Text
    ctx.save();
    const headline = canvasState.headline || 'નવો વિડીયો વિષય';
    ctx.font = 'bold 56px "Noto Sans Gujarati", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const maxLineWidth = 1120;
    const words = headline.split(' ');
    let lines = [];
    let curLine = '';

    for (let w of words) {
      let testLine = curLine ? (curLine + ' ' + w) : w;
      if (ctx.measureText(testLine).width > maxLineWidth && curLine) {
        lines.push(curLine);
        curLine = w;
      } else {
        curLine = testLine;
      }
    }
    if (curLine) lines.push(curLine);
    if (lines.length > 3) lines = lines.slice(0, 3);

    const startY = 160;
    const lineHeight = 80;

    lines.forEach((line, i) => {
      const y = startY + i * lineHeight;

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 14;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(line, 55, y);

      ctx.fillStyle = (i === 0) ? '#fde047' : '#ffffff';
      ctx.fillText(line, 55, y);
    });
    ctx.restore();

    // 5. Subtitle Banner
    if (canvasState.subtitle) {
      ctx.save();
      const subText = canvasState.subtitle;
      ctx.font = 'bold 30px "Noto Sans Gujarati", sans-serif';
      const subWidth = ctx.measureText(subText).width;
      const sPadding = 30;
      const sBoxWidth = Math.min(subWidth + sPadding * 2, 1160);
      const sBoxHeight = 64;
      const sX = 55;
      const sY = height - 120;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.beginPath();
      drawRoundRect(ctx, sX, sY, sBoxWidth, sBoxHeight, 14);
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(subText, sX + sPadding, sY + sBoxHeight / 2);
      ctx.restore();
    }

    // 6. Watermark
    ctx.save();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    drawRoundRect(ctx, width - 140, height - 110, 80, 52, 14);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(width - 105, height - 97);
    ctx.lineTo(width - 85, height - 84);
    ctx.lineTo(width - 105, height - 71);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function formatChatMessage(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code style="background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; color: #6ee7b7;">$1</code>');
  }

  function getDefaultSlides(topic) {
    return [
      { title: 'હૂક & તાજી વિગત', bullets: ['સત્તાવાર પરિપત્ર જાહેર', 'ગાંધીનગરથી મોટો આદેશ'] },
      { title: 'કોને કોને લાભ મળશે?', bullets: ['લાયકાત અને પાત્રતાના નિયમો', 'ઉંમર અને જરૂરી પુરાવા'] },
      { title: 'મહત્વની તારીખો', bullets: ['ફોર્મ ભરવાની છેલ્લી તારીખ', 'પરીક્ષા / ઓર્ડરનું સમયપત્રક'] },
      { title: 'પગાર ધોરણ & ભથ્થા', bullets: ['માસિક પગાર વિગત', 'નવા ભથ્થા અને DA નો વધારો'] },
      { title: 'ઓનલાઇન અરજી પ્રક્રિયા', bullets: ['OJAS / અધિકૃત પોર્ટલ પર લોગીન', 'ડોક્યુમેન્ટ અપલોડ કરવાના સ્ટેપ્સ'] }
    ];
  }

  render();
}
