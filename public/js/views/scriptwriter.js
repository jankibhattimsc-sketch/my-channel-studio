import { api } from '../api.js';
import { copyToClipboard, showNoticeToast, animateCopyButton } from '../utils/clipboard.js';
import { projectState } from '../utils/projectState.js';
import { generateFullPdfMasterPrompt, renderFormattedScript, extractSpokenScript } from '../utils/slideVoiceoverGenerator.js';

export async function renderScriptWriter(container, navigateTo) {
  const currentProject = projectState.getProject();
  let activeTopic = (currentProject && currentProject.topic && currentProject.topic.trim().length > 0)
    ? currentProject.topic.trim()
    : 'ગુજરાત કર્મચારી પગાર અને ૫૦% DA વધારો નિયમો ૨૦૨૬';

  let currentFilename = '';
  let fullPdfText = '';
  let lastPdfResult = null;
  let currentAudioUrl = (currentProject && currentProject.voiceAudio && currentProject.voiceAudio.audioUrl) ? currentProject.voiceAudio.audioUrl : '';
  let currentNarrationText = '';

  // Initial generated prompt
  let currentMasterPrompt = generateFullPdfMasterPrompt({
    topic: activeTopic,
    filename: currentFilename,
    fullPdfText: fullPdfText,
    slides: []
  });

  container.innerHTML = `
    <!-- Project Context Header -->
    <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: var(--radius-lg); padding: 14px 20px; margin-bottom: 18px; box-shadow: 0 8px 25px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <button id="btn-back-to-projects-script" class="btn btn-outline btn-sm" style="font-weight: 700;">← બધા પ્રોજેક્ટ્સ</button>
        <button id="btn-prev-slide-script" class="btn btn-secondary btn-sm" style="font-weight: 700;">← ૨. Slide</button>
        <span style="font-size: 0.85rem; color: #38bdf8; font-weight: 800;">📁 પ્રોજેક્ટ: ${activeTopic}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="badge badge-green" style="font-size: 0.72rem; font-weight: 800;">✓ Auto-Saved</span>
        <button id="btn-next-to-voice-script" class="btn btn-primary btn-sm" style="font-weight: 800; background: #ec4899; border: none; padding: 6px 14px;">
          ૪. Voice (અવાજ) →
        </button>
      </div>
    </div>

    <!-- 1. Header Hero Card -->
    <div class="card" style="margin-bottom: 20px; padding: 20px 24px; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); border: 1.5px solid #8b5cf6; border-radius: 14px; box-shadow: 0 8px 30px rgba(139, 92, 246, 0.2);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 52px; height: 52px; border-radius: 12px; background: rgba(139, 92, 246, 0.25); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; border: 1px solid rgba(139, 92, 246, 0.4);">
            📝
          </div>
          <div>
            <h2 style="font-size: 1.45rem; font-weight: 800; color: #ffffff; margin: 0 0 4px 0; display: flex; align-items: center; gap: 10px;">
              <span>૩. સ્ક્રિપ્ટ રાઇટર (Script Writer)</span>
              <span class="badge" style="background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid #10b981; font-size: 0.72rem; font-weight: 800; padding: 4px 10px; border-radius: 6px;">PDF MASTER</span>
            </h2>
            <p style="color: #c4b5fd; font-size: 0.88rem; margin: 0;">
              ૧. વિષય નક્કી કરો ➔ ૨. PDF અપલોડ કરો ➔ ૩. AI આખી PDF વાંચીને શ્રેષ્ઠ સ્ક્રિપ્ટ પ્રોમ્પ્ટ બનાવશે ⭐
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" id="btn-header-goto-chatgpt" class="btn btn-outline btn-sm" style="border: 1.5px solid #10b981; color: #6ee7b7; font-weight: 700; padding: 8px 14px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.12);" title="ChatGPT (chatgpt.com) સીધું નવી ટેબમાં ખોલો">
            <span>⚡</span> ChatGPT ખોલો ↗
          </a>
          <button id="btn-header-goto-editor" type="button" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #ec4899, #db2777); border: none; font-weight: 800; padding: 8px 16px; border-radius: 8px;">
            <span>🎙️</span> ૪. મારો અવાજ ➔
          </button>
        </div>
      </div>
    </div>

    <!-- Hidden file input for PDF -->
    <input type="file" id="pdf-file-input" accept="application/pdf,.pdf" style="display: none;">

    <!-- 2. STEP 1: Topic Input & Popular Presets -->
    <div class="card" style="margin-bottom: 20px; padding: 20px; border: 1px solid #1e293b; background: #0b1120; border-radius: 12px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.25rem;">📌</span>
          <h3 style="font-size: 1.1rem; font-weight: 800; color: #ffffff; margin: 0;">
            પગલું ૧: વિષય / ટોપિક (Topic)
          </h3>
        </div>
        <span class="badge" style="background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 6px;">
          STEP 1
        </span>
      </div>

      <div class="form-group" style="margin-bottom: 12px;">
        <div style="display: flex; gap: 8px;">
          <input type="text" id="script-topic-input" class="form-input font-gu" style="font-size: 1rem; font-weight: 700; color: #ffffff; background: #07090e; border: 1.5px solid #334155; padding: 12px 14px; border-radius: 8px; flex: 1;" placeholder="જે વિષય પર વિડીયો બનાવવો હોય તે અહીં લખો..." value="${activeTopic}">
          <button id="btn-clear-topic" type="button" class="btn btn-secondary" style="padding: 0 16px; font-weight: 700; border-radius: 8px;" title="લખાણ સાફ કરો">
            ✕
          </button>
        </div>
      </div>

      <!-- Quick preset topic chips -->
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 600;">ઝડપી વિષય:</span>
        <button type="button" class="btn-preset-topic" data-topic="ગુજરાત કર્મચારી પગાર અને ૫૦% DA વધારો નિયમો ૨૦૨૬" style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); color: #7dd3fc; font-size: 0.78rem; font-weight: 700; padding: 5px 12px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">
          🏛️ DA & પગાર વધારો
        </button>
        <button type="button" class="btn-preset-topic" data-topic="ગુજરાત આંગણવાડી કાર્યકર તેડાગર માનદવેતન વધારો અને ભરતી ૨૦૨૬" style="background: rgba(236,72,153,0.1); border: 1px solid rgba(236,72,153,0.3); color: #f472b6; font-size: 0.78rem; font-weight: 700; padding: 5px 12px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">
          👩‍🏫 આંગણવાડી માનદવેતન
        </button>
        <button type="button" class="btn-preset-topic" data-topic="ગુજરાત પોલીસ કોન્સ્ટેબલ અને PSI સત્તાવાર ભરતી નોટિફિકેશન ૨૦૨૬" style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #34d399; font-size: 0.78rem; font-weight: 700; padding: 5px 12px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">
          👮‍♂️ પોલીસ & LRD ભરતી
        </button>
        <button type="button" class="btn-preset-topic" data-topic="ગુજરાત કિસાન સહાય યોજના અને ખાતામાં સહાય જમા પરિપત્ર" style="background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); color: #fbbf24; font-size: 0.78rem; font-weight: 700; padding: 5px 12px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">
          🌾 કિસાન સહાય યોજના
        </button>
        <button type="button" class="btn-preset-topic" data-topic="ગુજરાત પ્રાથમિક અને માધ્યમિક શિક્ષક ભરતી કટઓફ અને જાહેરાત" style="background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.3); color: #c084fc; font-size: 0.78rem; font-weight: 700; padding: 5px 12px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">
          🎓 TET / TAT શિક્ષક ભરતી
        </button>
      </div>
    </div>

    <!-- 3. STEP 2: Read PDF (Upload Official Circular / PPT PDF) -->
    <div class="card" id="pdf-dropzone" style="margin-bottom: 20px; padding: 26px 20px; border: 2px dashed #38bdf8; background: rgba(56, 189, 248, 0.04); border-radius: 14px; text-align: center; cursor: pointer; transition: all 0.25s ease;">
      <!-- Empty State -->
      <div id="pdf-upload-empty-state">
        <div style="font-size: 2.8rem; margin-bottom: 8px; filter: drop-shadow(0 4px 10px rgba(56,189,248,0.3));">📄</div>
        <h3 style="font-size: 1.15rem; font-weight: 800; color: #ffffff; margin: 0 0 6px 0;">
          પગલું ૨: સત્તાવાર PDF વાંચો (Read PDF)
        </h3>
        <p style="color: #94a3b8; font-size: 0.85rem; max-width: 520px; margin: 0 auto 16px auto;">
          સરકારી પરિપત્ર, જીઆર (GR) કે સ્લાઇડ્સની PDF અપલોડ કરો. AI આખી PDF વાંચીને જ સૌથી સચોટ સ્ક્રિપ્ટ પ્રોમ્પ્ટ બનાવશે.
        </p>
        <button id="btn-select-pdf" type="button" class="btn btn-primary" style="font-weight: 800; font-size: 0.95rem; padding: 10px 26px; background: linear-gradient(135deg, #38bdf8, #2563eb); border: none; border-radius: 10px; box-shadow: 0 4px 16px rgba(56,189,248,0.35); cursor: pointer;">
          <span>📂</span> PDF ફાઇલ પસંદ કરો (File Picker)
        </button>
      </div>

      <!-- Loading State -->
      <div id="pdf-upload-loading-state" style="display: none; padding: 16px 0;">
        <div style="font-size: 2.8rem; margin-bottom: 10px; animation: pulse 1.5s infinite;">⏳</div>
        <h4 style="font-size: 1.12rem; font-weight: 800; color: #38bdf8; margin: 0 0 6px 0;">
          PDF સંપૂર્ણ વાંચીને શ્રેષ્ઠ સ્ક્રિપ્ટ અને ઓડિયો તૈયાર થઈ રહ્યો છે...
        </h4>
        <p style="color: #94a3b8; font-size: 0.84rem; margin: 0;">
          કૃપા કરીને થોડી સેકન્ડ રાહ જુઓ (સત્તાવાર નિયમો, ઠરાવ ક્રમાંક અને સ્ક્રિપ્ટ પ્રોમ્પ્ટ જનરેટ થઈ રહ્યા છે)
        </p>
      </div>

      <!-- Success State -->
      <div id="pdf-upload-success-state" style="display: none; padding: 8px 0;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 6px;">
          <span style="font-size: 1.8rem; color: #10b981;">✓</span>
          <strong id="pdf-uploaded-filename" style="color: #ffffff; font-size: 1.1rem;">document.pdf</strong>
        </div>
        <p style="color: #34d399; font-size: 0.86rem; margin: 0 0 14px 0;">
          ✓ આખી PDF સફળતાપૂર્વક વાંચી લેવામાં આવી છે! નીચે સ્ક્રિપ્ટ પ્રોમ્પ્ટ અને ઓડિયો તૈયાર છે.
        </p>
        <button id="btn-change-pdf" type="button" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #38bdf8; font-weight: 700; border-radius: 6px; padding: 6px 16px;">
          <span>🔄</span> બીજી નવી PDF પસંદ કરો
        </button>
      </div>
    </div>

    <!-- 4. STEP 3: Supreme 7-Section Master Script Prompt Card -->
    <div class="card" style="margin-bottom: 20px; padding: 22px; background: linear-gradient(135deg, #064e3b 0%, #0f172a 100%); border: 2px solid #10b981; border-radius: 14px; box-shadow: 0 8px 30px rgba(16,185,129,0.2);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.5rem;">⭐</span>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: #6ee7b7; margin: 0;">
              આખી PDF વાંચીને શ્રેષ્ઠ સ્ક્રિપ્ટ પ્રોમ્પ્ટ (Supreme Script Prompt)
            </h3>
            <span style="font-size: 0.8rem; color: #a7f3d0;">
              ૭ પ્રકરણોમાં શુદ્ધ ગુજરાતી માસ્ટર સ્ક્રિપ્ટ • શબ્દશઃ બોલચાલ ભાષા (Word-for-Word)
            </span>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button id="btn-copy-master-prompt" type="button" class="btn btn-success" style="background: #10b981; border: none; font-weight: 800; font-size: 0.88rem; padding: 9px 18px; border-radius: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.35); cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <span>📋</span> ૧-ક્લિક કોપી પ્રોમ્પ્ટ
          </button>
          <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" id="btn-open-chatgpt-with-prompt" class="btn btn-outline" style="border: 1.5px solid #38bdf8; color: #38bdf8; font-weight: 700; font-size: 0.88rem; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; background: rgba(56,189,248,0.1);" title="પ્રોમ્પ્ટ કોપી કરી સીધું ChatGPT ખોલો">
            <span>⚡</span> ChatGPT ખોલો ↗
          </a>
          <button id="btn-refresh-prompt" type="button" class="btn btn-secondary" style="font-weight: 700; font-size: 0.85rem; padding: 8px 12px; border-radius: 8px;" title="પ્રોમ્પ્ટ ફરી રિફ્રેશ કરો">
            <span>🔄</span> રિફ્રેશ
          </button>
        </div>
      </div>

      <p style="color: #cbd5e1; font-size: 0.84rem; line-height: 1.4; margin: 0 0 12px 0;">
        આ પ્રોમ્પ્ટ ChatGPT કે NotebookLM ને આદેશ આપે છે કે સૌથી પહેલા અપલોડ કરેલી આખી PDF સંપૂર્ણ વાંચો અને પછી ૭ પ્રકરણોમાં શુદ્ધ ગુજરાતી સ્ક્રિપ્ટ લખો:
      </p>

      <!-- Monospace Prompt Display Textarea -->
      <textarea id="master-prompt-display" class="form-textarea font-gu" style="width: 100%; height: 260px; font-family: monospace, 'Noto Sans Gujarati'; font-size: 0.82rem; line-height: 1.5; background: #07090e; border: 1.5px solid #1e293b; color: #e2e8f0; padding: 12px; border-radius: 8px; resize: vertical; box-sizing: border-box;" readonly>${currentMasterPrompt}</textarea>
    </div>

    <!-- 5. STEP 4: Full Script Editor & 1-Click Audio Generator -->
    <div class="card" style="margin-bottom: 20px; padding: 20px; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.25rem;">📝</span>
          <div>
            <h3 style="font-size: 1.08rem; font-weight: 800; color: #ffffff; margin: 0;">
              સંપૂર્ણ ગુજરાતી સ્ક્રિપ્ટ લખાણ (Spoken Script Text)
            </h3>
            <span style="font-size: 0.78rem; color: #94a3b8;">
              ChatGPT પાસેથી તૈયાર થયેલી ગુજરાતી સ્ક્રિપ્ટ અહીં પેસ્ટ કરો અથવા અહીંથી સીધો ઓડિયો બનાવો
            </span>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="btn-paste-script" type="button" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #38bdf8; font-weight: 700; padding: 6px 14px; border-radius: 6px;">
            <span>📋</span> ક્લિપબોર્ડમાંથી પેસ્ટ કરો
          </button>
          <button id="btn-goto-voicestudio" type="button" class="btn btn-outline btn-sm" style="border-color: #ec4899; color: #f472b6; font-weight: 700; padding: 6px 14px; border-radius: 6px;">
            <span>🎙️</span> Voice Studio માં જાઓ ➔
          </button>
        </div>
      </div>

      <textarea id="narration-script-textarea" class="form-textarea font-gu" style="width: 100%; height: 160px; font-size: 0.9rem; line-height: 1.6; background: #07090e; border: 1.5px solid #334155; color: #f1f5f9; padding: 12px; border-radius: 8px; resize: vertical; box-sizing: border-box;" placeholder="ChatGPT માંથી તૈયાર થયેલી અથવા PDF માંથી મળેલી શબ્દશઃ સ્ક્રિપ્ટ અહીં પેસ્ટ કરો..."></textarea>

      <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
        <button id="btn-generate-audio-from-script" type="button" class="btn btn-primary" style="font-weight: 800; font-size: 0.95rem; padding: 10px 24px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.3); cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
          <span>🔊</span> આ સ્ક્રિપ્ટમાંથી ઓડિયો બનાવો (Generate Audio)
        </button>
      </div>
    </div>

    <!-- 6. Full Audio Player Card -->
    <div class="card" id="audio-player-card" style="${currentAudioUrl ? 'display: block;' : 'display: none;'} margin-bottom: 20px; padding: 22px; background: #0f172a; border: 1.5px solid #10b981; border-radius: 14px; box-shadow: 0 8px 30px rgba(16,185,129,0.15);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.8rem;">🎧</span>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: #ffffff; margin: 0;">
              સંપૂર્ણ ઓડિયો પ્લેયર (Full Audio Player)
            </h3>
            <span id="audio-meta-badge" style="font-size: 0.78rem; color: #94a3b8;">
              લતા મંગેશકર મધુર અવાજ (Dhwani Neural) • ૧૦૦% શુદ્ધ ગુજરાતી
            </span>
          </div>
        </div>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <a id="btn-download-audio" href="${currentAudioUrl || '#'}" download="gyan_yatra_audio.mp3" class="btn btn-success" style="font-weight: 800; font-size: 0.9rem; padding: 10px 18px; background: #059669; border: none; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
            <span>📥</span> ઓડિયો ડાઉનલોડ (MP3)
          </a>
          <button id="btn-open-in-automatch-editor" type="button" class="btn btn-primary" style="font-weight: 800; font-size: 0.9rem; padding: 10px 18px; background: linear-gradient(135deg, #ec4899, #db2777); border: none; border-radius: 8px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(236,72,153,0.35); cursor: pointer;">
            <span>🎙️</span> આગળ વધો: ૪. મારો અવાજ ➔
          </button>
        </div>
      </div>

      <!-- Main HTML5 Audio Element -->
      <audio id="generated-audio-player" src="${currentAudioUrl || ''}" controls style="width: 100%; border-radius: 8px; outline: none; background: #1e293b; height: 54px; margin-bottom: 6px;">
        તમારું બ્રાઉઝર ઓડિયો એલિમેન્ટ સપોર્ટ કરતું નથી.
      </audio>
    </div>
  `;

  // DOM Elements
  const topicInput = container.querySelector('#script-topic-input');
  const btnClearTopic = container.querySelector('#btn-clear-topic');
  const masterPromptDisplay = container.querySelector('#master-prompt-display');
  const btnCopyMasterPrompt = container.querySelector('#btn-copy-master-prompt');
  const btnOpenChatgptWithPrompt = container.querySelector('#btn-open-chatgpt-with-prompt');
  const btnHeaderGotoChatgpt = container.querySelector('#btn-header-goto-chatgpt');
  const btnHeaderGotoEditor = container.querySelector('#btn-header-goto-editor');
  const btnRefreshPrompt = container.querySelector('#btn-refresh-prompt');
  const pdfFileInput = container.querySelector('#pdf-file-input');
  const pdfDropzone = container.querySelector('#pdf-dropzone');
  const btnSelectPdf = container.querySelector('#btn-select-pdf');
  const btnChangePdf = container.querySelector('#btn-change-pdf');
  const pdfEmptyState = container.querySelector('#pdf-upload-empty-state');
  const pdfSuccessState = container.querySelector('#pdf-upload-success-state');
  const pdfLoadingState = container.querySelector('#pdf-upload-loading-state');
  const pdfUploadedFilename = container.querySelector('#pdf-uploaded-filename');
  const narrationScriptTextarea = container.querySelector('#narration-script-textarea');
  const btnPasteScript = container.querySelector('#btn-paste-script');
  const btnGotoVoiceStudio = container.querySelector('#btn-goto-voicestudio');
  const btnGenerateAudio = container.querySelector('#btn-generate-audio-from-script');
  const audioPlayerCard = container.querySelector('#audio-player-card');
  const audioPlayer = container.querySelector('#generated-audio-player');
  const btnDownloadAudio = container.querySelector('#btn-download-audio');
  const audioMetaBadge = container.querySelector('#audio-meta-badge');
  const btnOpenInAutomatch = container.querySelector('#btn-open-in-automatch-editor');

  // Recalculate and update master prompt
  function refreshMasterPrompt() {
    activeTopic = topicInput.value.trim() || 'ગુજરાત કર્મચારી પગાર અને ૫૦% DA વધારો';
    currentMasterPrompt = generateFullPdfMasterPrompt({
      topic: activeTopic,
      filename: currentFilename,
      fullPdfText: fullPdfText,
      slides: (lastPdfResult && lastPdfResult.slides) || []
    });
    if (masterPromptDisplay) {
      masterPromptDisplay.value = currentMasterPrompt;
    }
  }

  // Topic input live change
  topicInput?.addEventListener('input', () => {
    refreshMasterPrompt();
    projectState.updateProject({ topic: topicInput.value.trim() });
  });

  btnClearTopic?.addEventListener('click', () => {
    topicInput.value = '';
    topicInput.focus();
    refreshMasterPrompt();
  });

  // Preset chips click
  container.querySelectorAll('.btn-preset-topic').forEach(chip => {
    chip.addEventListener('click', () => {
      const t = chip.getAttribute('data-topic');
      if (t) {
        topicInput.value = t;
        projectState.updateProject({ topic: t });
        refreshMasterPrompt();
        showNoticeToast(`ટોપિક સેટ થયો: ${chip.textContent.trim()}`, 'success');
      }
    });
  });

  // Copy Prompt handler
  btnCopyMasterPrompt?.addEventListener('click', () => {
    const text = masterPromptDisplay?.value || currentMasterPrompt;
    copyToClipboard(text, 'આખી PDF વાંચીને શ્રેષ્ઠ સ્ક્રિપ્ટ પ્રોમ્પ્ટ કોપી થઈ ગયો! ChatGPT માં પેસ્ટ કરો 📋', btnCopyMasterPrompt);
    animateCopyButton(btnCopyMasterPrompt, 'પ્રોમ્પ્ટ કોપી થયો! ✓');
  });

  btnRefreshPrompt?.addEventListener('click', () => {
    refreshMasterPrompt();
    showNoticeToast('સ્ક્રિપ્ટ પ્રોમ્પ્ટ અપડેટ થઈ ગયો! ✓', 'success');
  });

  // Open in ChatGPT directly (chatgpt.com)
  const openDirectChatgpt = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const text = masterPromptDisplay?.value || currentMasterPrompt;
    copyToClipboard(text, 'સ્ક્રિપ્ટ પ્રોમ્પ્ટ કોપી થઈ ગયો! ChatGPT માં Ctrl+V કરો 📋', e?.currentTarget);
    window.open('https://chatgpt.com', '_blank');
  };

  btnOpenChatgptWithPrompt?.addEventListener('click', openDirectChatgpt);
  btnHeaderGotoChatgpt?.addEventListener('click', openDirectChatgpt);
  btnHeaderGotoEditor?.addEventListener('click', () => navigateTo('myvoice'));

  // Paste Script from Clipboard
  btnPasteScript?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        narrationScriptTextarea.value = text.trim();
        showNoticeToast('ક્લિપબોર્ડમાંથી સ્ક્રિપ્ટ પેસ્ટ થઈ ગઈ! ✓', 'success');
      } else {
        showNoticeToast('ક્લિપબોર્ડમાં કોઈ લખાણ મળ્યું નથી.', 'warning');
      }
    } catch (_) {
      showNoticeToast('કૃપા કરીને Ctrl+V વડે સ્ક્રિપ્ટ પેસ્ટ કરો.', 'info');
      narrationScriptTextarea.focus();
    }
  });

  // Goto Voice Studio
  btnGotoVoiceStudio?.addEventListener('click', () => {
    const script = narrationScriptTextarea.value.trim();
    if (script) {
      projectState.updateProject({ script });
    }
    navigateTo('myvoice');
  });

  // Open file picker
  function openFilePicker() {
    if (pdfFileInput) {
      pdfFileInput.value = '';
      pdfFileInput.click();
    }
  }

  btnSelectPdf?.addEventListener('click', (e) => {
    e.stopPropagation();
    openFilePicker();
  });

  btnChangePdf?.addEventListener('click', (e) => {
    e.stopPropagation();
    openFilePicker();
  });

  pdfDropzone?.addEventListener('click', () => {
    if (pdfEmptyState?.style.display !== 'none') {
      openFilePicker();
    }
  });

  pdfDropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    pdfDropzone.style.borderColor = '#10b981';
    pdfDropzone.style.background = 'rgba(16,185,129,0.08)';
  });

  pdfDropzone?.addEventListener('dragleave', () => {
    pdfDropzone.style.borderColor = '#38bdf8';
    pdfDropzone.style.background = 'rgba(56, 189, 248, 0.04)';
  });

  pdfDropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    pdfDropzone.style.borderColor = '#38bdf8';
    pdfDropzone.style.background = 'rgba(56, 189, 248, 0.04)';
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handlePdfUpload(e.dataTransfer.files[0]);
    }
  });

  pdfFileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handlePdfUpload(e.target.files[0]);
    }
  });

  // PDF Upload Processing
  async function handlePdfUpload(file) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      showNoticeToast('મહેરબાની કરીને માન્ય PDF ફાઇલ પસંદ કરો.', 'warning');
      return;
    }

    currentFilename = file.name;
    if (pdfEmptyState) pdfEmptyState.style.display = 'none';
    if (pdfSuccessState) pdfSuccessState.style.display = 'none';
    if (pdfLoadingState) pdfLoadingState.style.display = 'block';

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const pdfBase64 = reader.result;

          // 1. Upload & Parse PDF structure and generate Supreme Prompt
          const uploadRes = await api.uploadSlidePdf({
            pdfBase64,
            filename: file.name,
            overallTopic: topicInput.value.trim() || activeTopic
          }).catch(err => {
            console.warn('[Upload PDF Fallback Notice]:', err);
            return null;
          });

          if (uploadRes && uploadRes.success) {
            lastPdfResult = uploadRes;
            fullPdfText = uploadRes.fullPdfText || '';
            if (uploadRes.slides && uploadRes.slides.length > 0) {
              // Pre-fill spoken script if available
              const formattedScript = renderFormattedScript(uploadRes.slides, activeTopic, fullPdfText);
              const spoken = extractSpokenScript(formattedScript);
              if (spoken && !narrationScriptTextarea.value.trim()) {
                narrationScriptTextarea.value = spoken;
              }
            }
          }

          // 2. Also generate/fetch direct audio for the player
          const audioRes = await api.pdfToAudio({
            pdfBase64,
            filename: file.name,
            profileId: 'anchor-dhwani-female',
            speed: 1.08,
            emotion: 'enthusiastic'
          }).catch(err => {
            console.warn('[PDF-to-Audio Notice]:', err);
            return null;
          });

          if (audioRes && audioRes.success && audioRes.audioUrl) {
            currentAudioUrl = audioRes.audioUrl;
            if (audioRes.narrationText && !narrationScriptTextarea.value.trim()) {
              narrationScriptTextarea.value = audioRes.narrationText;
            }
            if (!lastPdfResult) {
              lastPdfResult = audioRes;
            }

            // Audio Player update
            const cacheBusterUrl = audioRes.audioUrl + (audioRes.audioUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
            audioPlayer.src = cacheBusterUrl;
            audioPlayer.load();

            if (btnDownloadAudio) {
              btnDownloadAudio.href = audioRes.audioUrl;
              btnDownloadAudio.download = `${file.name.replace(/\.pdf$/i, '')}_audio.mp3`;
            }

            if (audioMetaBadge) {
              const sizeKb = Math.round((audioRes.fileSize || 0) / 1024);
              audioMetaBadge.textContent = `${audioRes.provider || 'AI Voice Engine'} • સાઇઝ: ~${sizeKb} KB`;
            }

            if (audioPlayerCard) {
              audioPlayerCard.style.display = 'block';
            }
          }

          // Update UI
          if (pdfUploadedFilename) {
            const pageCount = (lastPdfResult && (lastPdfResult.totalPages || (lastPdfResult.slides && lastPdfResult.slides.length))) || 1;
            pdfUploadedFilename.textContent = `${file.name} (${pageCount} પેજ)`;
          }

          // Recalculate prompt with the real PDF text
          refreshMasterPrompt();

          if (pdfLoadingState) pdfLoadingState.style.display = 'none';
          if (pdfSuccessState) pdfSuccessState.style.display = 'block';

          showNoticeToast('✅ આખી PDF વાંચીને શ્રેષ્ઠ સ્ક્રિપ્ટ પ્રોમ્પ્ટ તૈયાર છે! ⭐', 'success');
        } catch (innerErr) {
          console.error('[PDF Handle Error]:', innerErr);
          if (pdfLoadingState) pdfLoadingState.style.display = 'none';
          if (pdfEmptyState) pdfEmptyState.style.display = 'block';
          showNoticeToast(`PDF વાંચવામાં સમસ્યા: ${innerErr.message || innerErr}`, 'error');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      if (pdfLoadingState) pdfLoadingState.style.display = 'none';
      if (pdfEmptyState) pdfEmptyState.style.display = 'block';
      showNoticeToast(`PDF લોડિંગ ભૂલ: ${err.message || err}`, 'error');
    }
  }

  // Generate Audio from Script Textarea
  btnGenerateAudio?.addEventListener('click', async () => {
    const text = narrationScriptTextarea?.value?.trim();
    if (!text) {
      showNoticeToast('મહેરબાની કરીને સ્ક્રિપ્ટ લખાણ આપો.', 'warning');
      narrationScriptTextarea.focus();
      return;
    }

    try {
      btnGenerateAudio.disabled = true;
      btnGenerateAudio.innerHTML = '<span>⏳</span> ઓડિયો બની રહ્યો છે...';

      const res = await api.generateVoice({
        text: text,
        profileId: 'anchor-dhwani-female',
        speed: 1.08,
        emotion: 'enthusiastic',
        actorMode: true
      });

      if (res && res.audioUrl) {
        currentAudioUrl = res.audioUrl;
        const cacheBusterUrl = res.audioUrl + (res.audioUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        audioPlayer.src = cacheBusterUrl;
        audioPlayer.load();

        if (btnDownloadAudio) {
          btnDownloadAudio.href = res.audioUrl;
        }

        if (audioPlayerCard) {
          audioPlayerCard.style.display = 'block';
          audioPlayerCard.scrollIntoView({ behavior: 'smooth' });
        }

        audioPlayer.play().catch(() => {});
        showNoticeToast('✅ સ્ક્રિપ્ટમાંથી ઓડિયો સફળતાપૂર્વક બની ગયો! 🎧', 'success');
      } else {
        throw new Error((res && res.error) || 'ઓડિયો બનાવવામાં નિષ્ફળતા.');
      }
    } catch (err) {
      console.error('[Generate Voice Error]:', err);
      showNoticeToast(`ઓડિયો જનરેશન ભૂલ: ${err.message || err}`, 'error');
    } finally {
      btnGenerateAudio.disabled = false;
      btnGenerateAudio.innerHTML = '<span>🔊</span> આ સ્ક્રિપ્ટમાંથી ઓડિયો બનાવો (Generate Audio)';
    }
  });

  // Open in Auto-Match Editor Button
  btnOpenInAutomatch?.addEventListener('click', () => {
    if (!currentAudioUrl) {
      showNoticeToast('પહેલા ઓડિયો બનવા દો.', 'warning');
      return;
    }

    const cleanTopic = (lastPdfResult && lastPdfResult.topic) || topicInput.value.trim() || 'ગુજરાત સરકારી પરિપત્ર';
    const extractedSlides = (lastPdfResult && Array.isArray(lastPdfResult.slides) && lastPdfResult.slides.length > 0)
      ? lastPdfResult.slides.map((s, idx) => ({
          id: Date.now() + idx,
          title: s.title || `સ્લાઇડ #${idx + 1}`,
          subtitle: s.visual || 'સત્તાવાર પરિપત્ર',
          bulletPoints: s.content
            ? s.content.split('\n').map(b => b.replace(/^[•\-\*0-9\.\)]+\s*/, '').trim()).filter(Boolean)
            : (Array.isArray(s.points) ? s.points : [s.title]),
          audioTime: s.timing || '0:00 - 0:45',
          spokenSnippet: s.spokenSnippet || (narrationScriptTextarea.value.slice(0, 100)) || '',
          bgColor: '#FFFFFF',
          headingBoxStyle: 'solid',
          textColor: '#0F172A',
          accentColor: idx === 0 ? '#DC2626' : (idx === 1 ? '#2563EB' : '#10B981')
        }))
      : [];

    projectState.updateProject({
      topic: cleanTopic,
      voiceAudio: {
        audioUrl: currentAudioUrl,
        filename: `${currentFilename.replace(/\.pdf$/i, '') || 'audio'}_audio.mp3`,
        provider: 'PDF Voice Engine'
      },
      slides: extractedSlides.length > 0 ? extractedSlides : projectState.getProject().slides
    });

    window.autoMatchTrigger = {
      audioUrl: currentAudioUrl,
      audioName: `${currentFilename.replace(/\.pdf$/i, '') || 'audio'}_audio.mp3`,
      pdfName: currentFilename || 'document.pdf',
      slides: extractedSlides
    };

    navigateTo('myvoice');
  });

  // Top Project Banner buttons
  container.querySelector('#btn-back-to-projects-script')?.addEventListener('click', () => navigateTo('projects'));
  container.querySelector('#btn-prev-slide-script')?.addEventListener('click', () => navigateTo('slideprompts'));
  container.querySelector('#btn-next-to-voice-script')?.addEventListener('click', () => navigateTo('myvoice'));
}
