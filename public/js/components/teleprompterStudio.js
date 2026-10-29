import { api } from '../api.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { projectState } from '../utils/projectState.js';
import { LiveAudioRecorder, enhanceAudioBuffer } from '../utils/audioRecorderEnhancer.js';

/**
 * Side-by-Side Teleprompter & Live Voice Recording Studio
 * Allows creators to read PDF / script text comfortably while recording microphone audio.
 */
export function mountTeleprompterStudio(targetContainer, options = {}) {
  const {
    toolContext = 'script', // 'script' or 'voice'
    onSave = null
  } = options;

  const activeProj = projectState.getActiveProject();

  // Extract initial script text from project
  let initialScriptText = '';
  if (options.initialText) {
    initialScriptText = options.initialText;
  } else if (activeProj && activeProj.script && activeProj.script.sections && activeProj.script.sections.length > 0) {
    initialScriptText = activeProj.script.sections.map(s => `${s.sectionName || ''}:\n${s.content || ''}`).join('\n\n');
  } else if (activeProj && activeProj.topic) {
    initialScriptText = `નમસ્તે મિત્રો! આજના વિડીયોમાં આપણે વાત કરીશું "${activeProj.topic}" વિશે.\n\nસત્તાવાર પરિપત્ર અને નિયમો જાહેર થઈ ગયા છે. તમામ પાત્ર ઉમેદવારો અને લાભાર્થીઓ માટે આ મહત્વપૂર્ણ માહિતી છે.\n\nવિડીયોને પૂરો જોજો, વિગત ગમે તો લાઈક અને શેર કરજો. ચેનલ જ્ઞાન યાત્રાને સબ્સ્ક્રાઇબ કરી લેજો. જય હિન્દ!`;
  }

  // Component State
  let currentScriptText = initialScriptText.trim();
  let currentFontSize = 22; // default 22px for easy teleprompter reading
  let currentScrollSpeed = 1.0; // 0.6x, 1.0x, 1.5x, 2.0x
  let isAutoScrollRunning = false;
  let scrollInterval = null;
  let isPaperTheme = false; // dark vs paper theme

  // Audio Recorder State
  const recorder = new LiveAudioRecorder();
  let isRecording = false;
  let isPaused = false;
  let recordedResult = null; // { blob, url, buffer, duration }
  let enhancedResult = null; // { blob, url, buffer, duration }
  let isEnhancing = false;
  let isEnhancedActive = true;
  let currentTimerText = '00:00';

  // Render Skeleton
  targetContainer.innerHTML = `
    <div class="teleprompter-studio-wrapper" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.92)); border: 2px solid #8b5cf6; border-radius: var(--radius-lg); padding: 22px; box-shadow: 0 12px 40px rgba(0,0,0,0.5); margin-bottom: 24px;">
      
      <!-- Studio Header Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #ec4899, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; box-shadow: 0 4px 16px rgba(236,72,153,0.35);">
            🎙️
          </div>
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #ffffff; margin: 0 0 3px 0; display: flex; align-items: center; gap: 8px;">
              <span>ટેલિપ્રોમ્પ્ટર & લાઈવ ઓડિયો રેકોર્ડિંગ સ્ટુડિયો</span>
              <span class="badge" style="background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid #10b981; font-size: 0.72rem; font-weight: 800;">LIVE MIC</span>
            </h3>
            <p style="color: #94a3b8; font-size: 0.82rem; margin: 0;">
              ડાબી બાજુએ PDF કે સ્ક્રિપ્ટ રાખી આરામથી વાંચતા જાઓ • જમણી બાજુએ તમારો સાચો અવાજ રેકોર્ડ થઈ જશે!
            </p>
          </div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button id="tp-btn-load-project-script" type="button" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #38bdf8; font-weight: 700; font-size: 0.78rem;" title="પ્રોજેક્ટની સ્ક્રિપ્ટ અહીં લાવો">
            <span>📥</span> પ્રોજેક્ટ સ્ક્રિપ્ટ લાવો
          </button>
          <label for="tp-pdf-file-input" class="btn btn-outline btn-sm" style="border-color: #a855f7; color: #c084fc; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; margin: 0;">
            <span>📄</span> PDF અપલોડ કરો
          </label>
          <input type="file" id="tp-pdf-file-input" accept="application/pdf,.pdf,.txt" style="display: none;">
          <button id="tp-btn-paste-clipboard" type="button" class="btn btn-outline btn-sm" style="border-color: #10b981; color: #34d399; font-weight: 700; font-size: 0.78rem;">
            <span>📋</span> લખાણ પેસ્ટ કરો
          </button>
        </div>
      </div>

      <!-- Main Two-Column Side-by-Side Layout -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; align-items: stretch;">

        <!-- ================================================================= -->
        <!-- LEFT PANEL: COMFORTABLE TELEPROMPTER READER                      -->
        <!-- ================================================================= -->
        <div style="display: flex; flex-direction: column; background: #07090e; border: 1.5px solid rgba(255,255,255,0.12); border-radius: var(--radius-lg); overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
          
          <!-- Teleprompter Reader Controls Toolbar -->
          <div style="background: rgba(15, 23, 42, 0.95); padding: 10px 14px; border-bottom: 1.5px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 0.95rem;">📖</span>
              <strong style="font-size: 0.88rem; color: #f1f5f9;">વાંચવા માટેનું લખાણ (Teleprompter)</strong>
            </div>

            <!-- Reading adjustments -->
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <!-- Font Size -->
              <div style="display: flex; align-items: center; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 2px 4px;">
                <button id="tp-btn-font-dec" type="button" class="btn btn-sm" style="padding: 2px 8px; font-weight: 800; color: #94a3b8; background: transparent; border: none;" title="અક્ષરો નાના કરો">A-</button>
                <span id="tp-font-size-label" style="font-size: 0.76rem; color: #38bdf8; font-weight: 700; padding: 0 4px;">22px</span>
                <button id="tp-btn-font-inc" type="button" class="btn btn-sm" style="padding: 2px 8px; font-weight: 800; color: #94a3b8; background: transparent; border: none;" title="અક્ષરો મોટા કરો">A+</button>
              </div>

              <!-- Auto-Scroll Toggle -->
              <button id="tp-btn-toggle-scroll" type="button" class="btn btn-sm" style="background: rgba(139, 92, 246, 0.15); border: 1px solid #8b5cf6; color: #c084fc; font-weight: 700; font-size: 0.76rem; padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
                <span id="tp-scroll-icon">▶️</span> <span id="tp-scroll-text">ઓટો-સ્ક્રોલ</span>
              </button>

              <!-- Scroll Speed Selector -->
              <select id="tp-select-scroll-speed" class="form-input" style="padding: 3px 6px; font-size: 0.74rem; background: #0f172a; color: #e2e8f0; border-color: rgba(255,255,255,0.15); border-radius: 6px; width: 75px;">
                <option value="0.6">0.6x ધીમું</option>
                <option value="1.0" selected>1.0x સામાન્ય</option>
                <option value="1.5">1.5x મધ્યમ</option>
                <option value="2.0">2.0x ઝડપી</option>
              </select>

              <!-- Theme Toggle -->
              <button id="tp-btn-toggle-theme" type="button" class="btn btn-sm" style="padding: 4px 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; font-size: 0.74rem; border-radius: 6px;" title="ડાર્ક / પેપર થીમ બદલો">
                🌓
              </button>
            </div>
          </div>

          <!-- Teleprompter Screen Area -->
          <div id="tp-screen-box" style="position: relative; flex: 1; min-height: 440px; max-height: 520px; overflow-y: auto; padding: 22px; background: #020617; color: #f8fafc; font-family: 'Noto Sans Gujarati', sans-serif; transition: background 0.25s, color 0.25s; scroll-behavior: smooth;">
            
            <!-- Focus Guide Line (Top reading guide) -->
            <div id="tp-reading-guide" style="position: sticky; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #38bdf8, transparent); opacity: 0.6; pointer-events: none; margin-bottom: 14px;"></div>

            <!-- Editable Text Block -->
            <div id="tp-reader-content" contenteditable="true" spellcheck="false" style="font-size: ${currentFontSize}px; line-height: 1.85; font-weight: 500; outline: none; min-height: 380px; white-space: pre-wrap; word-break: break-word;">${currentScriptText}</div>
          </div>

          <!-- Teleprompter Footer Stats -->
          <div style="background: rgba(15, 23, 42, 0.95); padding: 8px 14px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; font-size: 0.76rem; color: #94a3b8;">
            <div id="tp-word-count-badge">
              📝 <strong>૦ શબ્દો</strong> • અંદાજે ૦:૦૦ મિનિટ
            </div>
            <div style="color: #38bdf8; font-size: 0.72rem;">
              💡 લખાણ પર ક્લિક કરીને સીધું સુધારી કે એડિટ કરી શકાય છે
            </div>
          </div>

        </div>

        <!-- ================================================================= -->
        <!-- RIGHT PANEL: LIVE AUDIO RECORDER & STUDIO ENHANCER               -->
        <!-- ================================================================= -->
        <div style="display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: var(--radius-lg); padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); min-height: 480px;">
          
          <div>
            <!-- Header status strip -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="tp-mic-status-dot" style="width: 12px; height: 12px; border-radius: 50%; background: #10b981; display: inline-block; box-shadow: 0 0 10px #10b981;"></span>
                <span id="tp-mic-status-text" style="font-size: 0.86rem; font-weight: 800; color: #ffffff;">માઈક્રોફોન તૈયાર છે (Ready)</span>
              </div>
              <span id="tp-recording-badge" class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-size: 0.72rem; font-weight: 800;">
                STUDIO REC
              </span>
            </div>

            <!-- Big Live Timer Display -->
            <div style="text-align: center; margin: 16px 0 14px 0;">
              <div id="tp-live-timer" style="font-family: monospace; font-size: 3.2rem; font-weight: 900; color: #ffffff; letter-spacing: 2px; text-shadow: 0 0 20px rgba(56, 189, 248, 0.4);">
                00:00
              </div>
              <div id="tp-timer-subtext" style="font-size: 0.78rem; color: #94a3b8; font-weight: 600;">
                લાલ બટન દબાવો એટલે રેકોર્ડિંગ શરૂ થશે
              </div>
            </div>

            <!-- Sound Visualizer Level Bar -->
            <div style="background: #020617; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 12px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: #94a3b8; margin-bottom: 4px;">
                <span>MIC LEVEL</span>
                <span id="tp-level-pct">0%</span>
              </div>
              <div style="height: 10px; background: rgba(255,255,255,0.08); border-radius: 5px; overflow: hidden; position: relative;">
                <div id="tp-level-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444); border-radius: 5px; transition: width 0.08s ease;"></div>
              </div>
            </div>

            <!-- Main Record Action Controls -->
            <div style="display: flex; gap: 10px; justify-content: center; align-items: center; margin-bottom: 20px;">
              <!-- Record / Stop Button -->
              <button id="tp-btn-record-main" type="button" class="btn" style="flex: 1; max-width: 260px; padding: 14px 22px; font-size: 1.05rem; font-weight: 900; background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; border: none; border-radius: 12px; box-shadow: 0 6px 20px rgba(239, 68, 68, 0.45); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 10px; transition: transform 0.15s, box-shadow 0.15s;">
                <span id="tp-rec-icon" style="font-size: 1.25rem;">🔴</span>
                <span id="tp-rec-label">રેકોર્ડિંગ શરૂ કરો</span>
              </button>

              <!-- Pause / Resume Button -->
              <button id="tp-btn-pause-rec" type="button" class="btn btn-outline" style="display: none; padding: 14px 18px; font-weight: 800; border-color: #f59e0b; color: #fbbf24; border-radius: 12px;" title="રેકોર્ડિંગ થોભાવો">
                <span id="tp-pause-icon">⏸️</span>
              </button>
            </div>

            <!-- Post-Recording Audio Player Box -->
            <div id="tp-recorded-audio-box" style="display: none; background: rgba(0,0,0,0.4); border: 1.5px solid #10b981; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 800; color: #34d399;">
                  <span>✓</span> રેકોર્ડ થયેલો ઓડિયો તૈયાર છે!
                </div>
                <span id="tp-audio-duration-badge" style="font-size: 0.74rem; color: #cbd5e1; font-family: monospace;">
                  00:00
                </span>
              </div>

              <!-- HTML5 Audio Element -->
              <audio id="tp-playback-audio" controls style="width: 100%; height: 42px; border-radius: 6px; outline: none; margin-bottom: 10px;"></audio>

              <!-- Clean Voice Enhancement Toggle -->
              <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <div>
                  <div style="font-size: 0.8rem; font-weight: 800; color: #a7f3d0;">
                    🪄 સ્ટુડિયો વોઇસ એન્હાન્સર (Clean Audio)
                  </div>
                  <div style="font-size: 0.7rem; color: #6ee7b7;">
                    પંખાનો અવાજ ફિલ્ટર કરે છે + અવાજની સ્પષ્ટતા વધારે છે
                  </div>
                </div>
                <button id="tp-btn-toggle-enhance" type="button" class="btn btn-sm btn-success" style="font-size: 0.74rem; font-weight: 800; padding: 4px 10px;">
                  ✓ સક્રિય (ON)
                </button>
              </div>
            </div>

          </div>

          <!-- Post-Recording Action Buttons -->
          <div id="tp-action-buttons-wrap" style="display: none; flex-direction: column; gap: 8px;">
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button id="tp-btn-save-project" type="button" class="btn btn-primary" style="flex: 1; font-weight: 800; padding: 11px 16px; font-size: 0.9rem; background: linear-gradient(135deg, #10b981, #059669); border: none; box-shadow: 0 4px 14px rgba(16,185,129,0.35); display: inline-flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px;">
                <span>💾</span> પ્રોજેક્ટમાં સાચવો (Save)
              </button>
              <a id="tp-btn-download-wav" href="#" download="my_voiceover.wav" class="btn btn-outline" style="font-weight: 800; padding: 11px 16px; font-size: 0.9rem; border-color: #38bdf8; color: #38bdf8; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px;">
                <span>📥</span> WAV ડાઉનલોડ
              </a>
            </div>

            <button id="tp-btn-rerecord" type="button" class="btn btn-secondary btn-sm" style="font-weight: 700; font-size: 0.78rem; padding: 6px; color: #94a3b8;">
              <span>🔄</span> ફરીથી નવો ઓડિયો રેકોર્ડ કરવો છે (Re-record)
            </button>
          </div>

          <!-- Notification Feedback -->
          <div id="tp-save-notification" style="display: none; margin-top: 10px; background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; border-radius: 6px; padding: 8px 12px; font-size: 0.8rem; color: #34d399; text-align: center; font-weight: 700;">
            ✓ ઓડિયો સફળતાપૂર્વક પ્રોજેક્ટમાં સેવ થઈ ગયો છે!
          </div>

        </div>

      </div>

    </div>
  `;

  // DOM Handles
  const readerContent = targetContainer.querySelector('#tp-reader-content');
  const screenBox = targetContainer.querySelector('#tp-screen-box');
  const btnFontDec = targetContainer.querySelector('#tp-btn-font-dec');
  const btnFontInc = targetContainer.querySelector('#tp-btn-font-inc');
  const fontSizeLabel = targetContainer.querySelector('#tp-font-size-label');
  const btnToggleScroll = targetContainer.querySelector('#tp-btn-toggle-scroll');
  const scrollIcon = targetContainer.querySelector('#tp-scroll-icon');
  const scrollText = targetContainer.querySelector('#tp-scroll-text');
  const selectScrollSpeed = targetContainer.querySelector('#tp-select-scroll-speed');
  const btnToggleTheme = targetContainer.querySelector('#tp-btn-toggle-theme');
  const wordCountBadge = targetContainer.querySelector('#tp-word-count-badge');
  const pdfFileInput = targetContainer.querySelector('#tp-pdf-file-input');
  const btnPasteClipboard = targetContainer.querySelector('#tp-btn-paste-clipboard');
  const btnLoadProjectScript = targetContainer.querySelector('#tp-btn-load-project-script');

  const micStatusDot = targetContainer.querySelector('#tp-mic-status-dot');
  const micStatusText = targetContainer.querySelector('#tp-mic-status-text');
  const recordingBadge = targetContainer.querySelector('#tp-recording-badge');
  const liveTimer = targetContainer.querySelector('#tp-live-timer');
  const timerSubtext = targetContainer.querySelector('#tp-timer-subtext');
  const levelBar = targetContainer.querySelector('#tp-level-bar');
  const levelPct = targetContainer.querySelector('#tp-level-pct');
  const btnRecordMain = targetContainer.querySelector('#tp-btn-record-main');
  const recIcon = targetContainer.querySelector('#tp-rec-icon');
  const recLabel = targetContainer.querySelector('#tp-rec-label');
  const btnPauseRec = targetContainer.querySelector('#tp-btn-pause-rec');
  const pauseIcon = targetContainer.querySelector('#tp-pause-icon');

  const recordedAudioBox = targetContainer.querySelector('#tp-recorded-audio-box');
  const playbackAudio = targetContainer.querySelector('#tp-playback-audio');
  const audioDurationBadge = targetContainer.querySelector('#tp-audio-duration-badge');
  const btnToggleEnhance = targetContainer.querySelector('#tp-btn-toggle-enhance');
  const actionButtonsWrap = targetContainer.querySelector('#tp-action-buttons-wrap');
  const btnSaveProject = targetContainer.querySelector('#tp-btn-save-project');
  const btnDownloadWav = targetContainer.querySelector('#tp-btn-download-wav');
  const btnRerecord = targetContainer.querySelector('#tp-btn-rerecord');
  const saveNotif = targetContainer.querySelector('#tp-save-notification');

  // Helper: Update Word Count & Estimated Time
  function updateWordCount() {
    const text = (readerContent.innerText || '').trim();
    currentScriptText = text;
    if (!text) {
      wordCountBadge.innerHTML = '📝 <strong>૦ શબ્દો</strong> • અંદાજે ૦:૦૦ મિનિટ';
      return;
    }
    const words = text.split(/\s+/).filter(Boolean);
    const count = words.length;
    // Gujarati spoken pace: ~130-140 words per minute
    const totalSeconds = Math.round((count / 135) * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;
    wordCountBadge.innerHTML = `📝 <strong>${count.toLocaleString('en-IN')} શબ્દો</strong> • અંદાજે ${timeStr} મિનિટ`;
  }

  readerContent?.addEventListener('input', updateWordCount);
  updateWordCount();

  // Font Size Adjustments
  btnFontDec?.addEventListener('click', () => {
    if (currentFontSize > 16) {
      currentFontSize -= 2;
      readerContent.style.fontSize = `${currentFontSize}px`;
      fontSizeLabel.textContent = `${currentFontSize}px`;
    }
  });

  btnFontInc?.addEventListener('click', () => {
    if (currentFontSize < 36) {
      currentFontSize += 2;
      readerContent.style.fontSize = `${currentFontSize}px`;
      fontSizeLabel.textContent = `${currentFontSize}px`;
    }
  });

  // Theme Toggle (Dark vs Clean Paper)
  btnToggleTheme?.addEventListener('click', () => {
    isPaperTheme = !isPaperTheme;
    if (isPaperTheme) {
      screenBox.style.background = '#f8fafc';
      screenBox.style.color = '#0f172a';
      readerContent.style.color = '#0f172a';
    } else {
      screenBox.style.background = '#020617';
      screenBox.style.color = '#f8fafc';
      readerContent.style.color = '#f8fafc';
    }
  });

  // Auto-Scroll Logic
  function startAutoScroll() {
    if (isAutoScrollRunning) return;
    isAutoScrollRunning = true;
    scrollIcon.textContent = '⏸️';
    scrollText.textContent = 'થોભાવો';
    btnToggleScroll.style.background = 'rgba(236,72,153,0.2)';
    btnToggleScroll.style.borderColor = '#ec4899';
    btnToggleScroll.style.color = '#f472b6';

    const pixelsPerStep = 1.2 * currentScrollSpeed;
    scrollInterval = setInterval(() => {
      if (screenBox) {
        screenBox.scrollTop += pixelsPerStep;
        // Check if reached bottom
        if (screenBox.scrollTop + screenBox.clientHeight >= screenBox.scrollHeight - 5) {
          stopAutoScroll();
        }
      }
    }, 40);
  }

  function stopAutoScroll() {
    if (!isAutoScrollRunning) return;
    isAutoScrollRunning = false;
    clearInterval(scrollInterval);
    scrollIcon.textContent = '▶️';
    scrollText.textContent = 'ઓટો-સ્ક્રોલ';
    btnToggleScroll.style.background = 'rgba(139, 92, 246, 0.15)';
    btnToggleScroll.style.borderColor = '#8b5cf6';
    btnToggleScroll.style.color = '#c084fc';
  }

  btnToggleScroll?.addEventListener('click', () => {
    if (isAutoScrollRunning) {
      stopAutoScroll();
    } else {
      startAutoScroll();
    }
  });

  selectScrollSpeed?.addEventListener('change', (e) => {
    currentScrollSpeed = parseFloat(e.target.value) || 1.0;
    if (isAutoScrollRunning) {
      stopAutoScroll();
      startAutoScroll();
    }
  });

  // Paste from clipboard
  btnPasteClipboard?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        readerContent.innerText = text.trim();
        updateWordCount();
        screenBox.scrollTop = 0;
      }
    } catch (e) {
      // Fallback
      const userText = prompt('અહીં તમારી સ્ક્રિપ્ટ અથવા લખાણ પેસ્ટ કરો:');
      if (userText && userText.trim()) {
        readerContent.innerText = userText.trim();
        updateWordCount();
        screenBox.scrollTop = 0;
      }
    }
  });

  // Load active project script
  btnLoadProjectScript?.addEventListener('click', () => {
    const cur = projectState.getActiveProject();
    if (cur && cur.script && cur.script.sections && cur.script.sections.length > 0) {
      const full = cur.script.sections.map(s => `${s.sectionName || ''}:\n${s.content || ''}`).join('\n\n');
      readerContent.innerText = full;
      updateWordCount();
      screenBox.scrollTop = 0;
    } else if (cur && cur.topic) {
      readerContent.innerText = `વિષય: ${cur.topic}\n\nનમસ્તે મિત્રો! આજના વિડીયોમાં આપણે વાત કરીશું "${cur.topic}" વિશે.\n\nસત્તાવાર પરિપત્ર અને નિયમો જાહેર થઈ ગયા છે. સંપૂર્ણ વિગત આ વિડીયોમાં જોઈશું.`;
      updateWordCount();
      screenBox.scrollTop = 0;
    }
  });

  // Upload PDF & extract text for teleprompter
  pdfFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        readerContent.innerText = evt.target.result;
        updateWordCount();
        screenBox.scrollTop = 0;
      };
      reader.readAsText(file);
      pdfFileInput.value = '';
      return;
    }

    // PDF extraction via backend API
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        readerContent.innerText = `⏳ "${file.name}" માંથી તમામ લખાણ વાંચવામાં આવી રહ્યું છે...`;
        const res = await api.uploadSlidePdf({
          pdfBase64: evt.target.result,
          filename: file.name
        });

        if (res && res.fullPdfText && res.fullPdfText.trim()) {
          readerContent.innerText = res.fullPdfText.trim();
        } else if (res && res.slides && res.slides.length > 0) {
          const slideTexts = res.slides.map((s, idx) => `--- સ્લાઇડ ${idx + 1}: ${s.title || ''} ---\n${s.content || ''}`).join('\n\n');
          readerContent.innerText = slideTexts;
        } else {
          readerContent.innerText = `[PDF: ${file.name}]\n\nનમસ્તે મિત્રો! સત્તાવાર પરિપત્ર અને નિયમો મુજબ આજના વિડીયોમાં સંપૂર્ણ વિગત સમજીશું.`;
        }
        updateWordCount();
        screenBox.scrollTop = 0;
      } catch (err) {
        console.warn('PDF Read Notice:', err);
        readerContent.innerText = `[PDF: ${file.name}]\n\nનમસ્તે મિત્રો! "${file.name.replace('.pdf', '')}" બાબતે સત્તાવાર પરિપત્ર જાહેર થઈ ગયો છે.`;
        updateWordCount();
      }
      pdfFileInput.value = '';
    };
    reader.readAsDataURL(file);
  });

  // =========================================================================
  // AUDIO RECORDING CONTROLS & DSP LOGIC
  // =========================================================================

  async function startRecordingSession() {
    try {
      isRecording = true;
      isPaused = false;
      recordedResult = null;
      enhancedResult = null;

      // UI updates
      micStatusDot.style.background = '#ef4444';
      micStatusDot.style.boxShadow = '0 0 16px #ef4444';
      micStatusText.textContent = '🔴 લાઈવ રેકોર્ડિંગ ચાલુ છે... (Recording Live)';
      recordingBadge.textContent = 'REC ON';
      recordingBadge.style.background = 'rgba(239, 68, 68, 0.25)';
      recordingBadge.style.borderColor = '#ef4444';
      recordingBadge.style.color = '#fca5a5';

      recIcon.textContent = '⏹️';
      recLabel.textContent = 'રેકોર્ડિંગ પૂર્ણ કરો (Stop)';
      btnRecordMain.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      btnRecordMain.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.45)';

      btnPauseRec.style.display = 'inline-flex';
      pauseIcon.textContent = '⏸️';
      timerSubtext.textContent = 'સ્ક્રિપ્ટ વાંચતા રહો • જ્યારે પૂરું થાય ત્યારે લીલું બટન દબાવો';

      recordedAudioBox.style.display = 'none';
      actionButtonsWrap.style.display = 'none';
      saveNotif.style.display = 'none';

      // Start Teleprompter Auto-Scroll automatically
      startAutoScroll();

      // Start Hardware Live Recorder
      await recorder.start({
        onLevel: (pct) => {
          if (levelBar) levelBar.style.width = `${pct}%`;
          if (levelPct) levelPct.textContent = `${pct}%`;
        },
        onTick: (timerStr) => {
          currentTimerText = timerStr;
          if (liveTimer) liveTimer.textContent = timerStr;
        }
      });

    } catch (err) {
      console.error('Mic access error:', err);
      alert('માઈક્રોફોન ચાલુ કરવાની મંજૂરી (Microphone Permission) મળી નથી. કૃપા કરીને બ્રાઉઝર સેટિંગ્સમાં માઈક એલોવ (Allow) કરો.');
      resetIdleUI();
    }
  }

  function pauseRecordingSession() {
    if (!isRecording) return;
    if (!isPaused) {
      recorder.pause();
      isPaused = true;
      pauseIcon.textContent = '▶️';
      btnPauseRec.title = 'ફરી ચાલુ કરો (Resume)';
      micStatusText.textContent = '⏸️ રેકોર્ડિંગ થોભાવેલ છે (Paused)';
      stopAutoScroll();
    } else {
      recorder.resume();
      isPaused = false;
      pauseIcon.textContent = '⏸️';
      btnPauseRec.title = 'થોભાવો (Pause)';
      micStatusText.textContent = '🔴 લાઈવ રેકોર્ડિંગ ચાલુ છે...';
      startAutoScroll();
    }
  }

  async function stopRecordingSession() {
    if (!isRecording) return;
    isRecording = false;
    isPaused = false;

    // Stop auto-scroll
    stopAutoScroll();

    // UI to processing
    micStatusDot.style.background = '#38bdf8';
    micStatusDot.style.boxShadow = '0 0 10px #38bdf8';
    micStatusText.textContent = '⏳ ઓડિયો પ્રોસેસ અને એન્હાન્સ થઈ રહ્યો છે...';
    recIcon.textContent = '⏳';
    recLabel.textContent = 'પ્રોસેસિંગ...';

    const res = await recorder.stop();
    recordedResult = res;

    if (levelBar) levelBar.style.width = '0%';
    if (levelPct) levelPct.textContent = '0%';

    if (res && res.blob) {
      // Create enhanced broadcast version in background
      try {
        if (res.buffer) {
          enhancedResult = await enhanceAudioBuffer(res.buffer, {
            noiseRemoval: true,
            clarityBoost: true,
            volume: 1.25
          });
        }
      } catch (e) {
        console.warn('Enhancement notice:', e);
      }

      // Display Player
      const activeUrl = (isEnhancedActive && enhancedResult && enhancedResult.url) 
        ? enhancedResult.url 
        : res.url;

      playbackAudio.src = activeUrl;
      const durationSec = Math.round(res.duration || 0);
      const mins = Math.floor(durationSec / 60);
      const secs = durationSec % 60;
      audioDurationBadge.textContent = `સમય: ${mins}:${String(secs).padStart(2, '0')}`;

      // Set download link
      const downloadBlob = (isEnhancedActive && enhancedResult && enhancedResult.blob) 
        ? enhancedResult.blob 
        : res.blob;
      btnDownloadWav.href = activeUrl;
      const projName = (activeProj && activeProj.name) ? activeProj.name.replace(/[\s/\\?%*:|"<>]+/g, '_') : 'my_channel';
      btnDownloadWav.download = `${projName}_Audio.wav`;

      recordedAudioBox.style.display = 'block';
      actionButtonsWrap.style.display = 'flex';
    }

    resetIdleUI();
    micStatusText.textContent = '✓ ઓડિયો તૈયાર છે! સાંભળો અને સેવ કરો.';
  }

  function resetIdleUI() {
    isRecording = false;
    isPaused = false;
    micStatusDot.style.background = '#10b981';
    micStatusDot.style.boxShadow = '0 0 10px #10b981';
    recordingBadge.textContent = 'STUDIO REC';
    recordingBadge.style.background = 'rgba(56, 189, 248, 0.15)';
    recordingBadge.style.borderColor = 'rgba(56, 189, 248, 0.3)';
    recordingBadge.style.color = '#38bdf8';

    recIcon.textContent = '🔴';
    recLabel.textContent = 'રેકોર્ડિંગ શરૂ કરો';
    btnRecordMain.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    btnRecordMain.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.45)';
    btnPauseRec.style.display = 'none';
    timerSubtext.textContent = 'લાલ બટન દબાવો એટલે રેકોર્ડિંગ શરૂ થશે';
  }

  // Button clicks
  btnRecordMain?.addEventListener('click', () => {
    if (!isRecording) {
      startRecordingSession();
    } else {
      stopRecordingSession();
    }
  });

  btnPauseRec?.addEventListener('click', pauseRecordingSession);

  // Toggle Enhance
  btnToggleEnhance?.addEventListener('click', () => {
    isEnhancedActive = !isEnhancedActive;
    if (isEnhancedActive) {
      btnToggleEnhance.className = 'btn btn-sm btn-success';
      btnToggleEnhance.textContent = '✓ સક્રિય (ON)';
      if (enhancedResult && enhancedResult.url) {
        playbackAudio.src = enhancedResult.url;
        btnDownloadWav.href = enhancedResult.url;
      }
    } else {
      btnToggleEnhance.className = 'btn btn-sm btn-outline';
      btnToggleEnhance.textContent = '✕ બંધ (OFF)';
      if (recordedResult && recordedResult.url) {
        playbackAudio.src = recordedResult.url;
        btnDownloadWav.href = recordedResult.url;
      }
    }
  });

  // Save to Project
  btnSaveProject?.addEventListener('click', async () => {
    const activeUrl = (isEnhancedActive && enhancedResult && enhancedResult.url) 
      ? enhancedResult.url 
      : (recordedResult ? recordedResult.url : '');

    if (!activeUrl) return;

    // Convert audio to base64 for persistent localStorage save if small
    let audioDataToSave = activeUrl;
    try {
      const blobToSave = (isEnhancedActive && enhancedResult && enhancedResult.blob) 
        ? enhancedResult.blob 
        : (recordedResult ? recordedResult.blob : null);

      if (blobToSave && blobToSave.size < 4000000) { // < 4MB
        const b64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blobToSave);
        });
        audioDataToSave = b64;
      }
    } catch (e) {
      console.warn('Audio base64 save notice:', e);
    }

    // Save to Project State
    projectState.updateActiveProject({
      voice: {
        audioUrl: audioDataToSave,
        filename: `${(activeProj && activeProj.name) || 'project'}_voiceover.wav`,
        provider: '🎙️ My Studio Voice (Recorded Live)',
        isCompleted: true
      }
    });

    saveNotif.style.display = 'block';
    setTimeout(() => {
      saveNotif.style.display = 'none';
    }, 3500);

    if (typeof onSave === 'function') {
      onSave({ audioUrl: activeUrl, text: currentScriptText });
    }
  });

  // Re-record
  btnRerecord?.addEventListener('click', () => {
    if (confirm('શું તમે ખરેખર નવો ઓડિયો રેકોર્ડ કરવા માંગો છો? હાલનો રેકોર્ડ થયેલો ઓડિયો બદલાઈ જશે.')) {
      recordedResult = null;
      enhancedResult = null;
      recordedAudioBox.style.display = 'none';
      actionButtonsWrap.style.display = 'none';
      liveTimer.textContent = '00:00';
      resetIdleUI();
      screenBox.scrollTop = 0;
    }
  });

  return {
    getScriptText: () => currentScriptText,
    setScriptText: (t) => {
      currentScriptText = t;
      readerContent.innerText = t;
      updateWordCount();
    },
    stopRecording: stopRecordingSession
  };
}
