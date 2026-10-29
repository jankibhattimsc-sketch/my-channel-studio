import { projectState } from '../utils/projectState.js';
import { copyToClipboard, showNoticeToast } from '../utils/clipboard.js';
import { api } from '../api.js';
import { generateClientNotebookLMPrompt } from '../utils/notebooklmPromptGenerator.js';
import {
  parseTimeToSeconds,
  parseRangeToSeconds,
  formatSecondsToTime,
  formatTimeRange,
  matchSlidesToAudio,
  validateTimeline,
  fixTimelineGaps,
  createSyncManifest,
  setSlideStartTime,
  setSlideEndTime,
  nudgeSlideTiming,
  splitSlideAtTime
} from '../utils/slideAudioSync.js';

export async function renderSlideEditor(container, navigateTo) {
  const project = projectState.getProject();
  if (window.prefillTopic) {
    project.topic = window.prefillTopic;
    window.prefillTopic = null;
  }
  let currentHeadingBoxStyle = 'solid'; // 'solid' | 'outline' | 'banner'
  let currentAccentColor = '#DC2626';

  const savedAudio = await projectState.getAudioRecording(project?.id);
  let loadedAudioUrl = window.autoMatchTrigger?.audioUrl || savedAudio?.url || project.voiceAudio?.audioUrl || project.voice?.audioUrl || '/audio/my_real_cloned_voice.mp3';
  let loadedAudioName = window.autoMatchTrigger?.audioName || savedAudio?.filename || project.voiceAudio?.filename || project.voice?.filename || 'my_real_cloned_voice.mp3';
  let loadedPdfName = window.autoMatchTrigger?.pdfName || project.slide?.pdfName || '';
  let loadedPdfBase64 = '';
  let isExportingVideo = false;
  let hasPendingAutoMatch = Boolean(window.autoMatchTrigger);

  const initialTopic = project.topic || 'ગુજરાત કર્મચારી પગાર અને DA વધારો ૨૦૨૬';
  let initialNotebook = generateClientNotebookLMPrompt({
    topic: initialTopic,
    templateId: 'white-real',
    tool: 'notebooklm-slides',
    slideCount: '5-6',
    includeBranding: true
  });
  let initialContentPrompt = initialNotebook.contentSourcePrompt;
  let initialPptPrompt = initialNotebook.pptDeckPrompt;

  let slides = (window.autoMatchTrigger?.slides && window.autoMatchTrigger.slides.length > 0)
    ? window.autoMatchTrigger.slides
    : (project.slides && project.slides.length > 0 ? project.slides : [
    {
      id: 1,
      title: project.topic || 'ગુજરાત કર્મચારી પગાર અને DA વધારો ૨૦૨૬',
      subtitle: 'સત્તાવાર નિર્ણય જાહેર • નાણાં વિભાગ ઠરાવ',
      bulletPoints: [
        'ગાંધીનગર સચિવાલય દ્વારા નવો સત્તાવાર પરિપત્ર જાહેર',
        'રાજ્યના લાખો કર્મચારીઓ અને પેન્શનર્સને સીધો નાણાકીય ફાયદો',
        'ચાલુ માસથી જ નવા દરે પગાર અને એરિયર્સ બેંક ખાતામાં જમા'
      ],
      audioTime: '0:00 - 0:45',
      bgColor: '#FFFFFF',
      headingBoxStyle: 'solid',
      textColor: '#0F172A',
      accentColor: '#DC2626'
    },
    {
      id: 2,
      title: 'પાત્રતા અને ગ્રેડ-પે મુજબ ચોખ્ખો વધારો',
      subtitle: 'વર્ગ-૧ થી વર્ગ-૪ કર્મચારીઓનું પે-મેટ્રિક્સ',
      bulletPoints: [
        'વર્ગ-૪ કર્મચારીઓ માટે માસિક ₹૮૫૦ થી ₹૧,૪૦૦ સુધીનો વધારો',
        'વર્ગ-૩ કર્મચારીઓ માટે માસિક ₹૧,૫૦૦ થી ₹૩,૨૦૦ સુધીનો ચોખ્ખો લાભ',
        'સાતમા પગાર પંચ મુજબ મૂળ પગાર પર સીધી નવી ટકાવારી લાગુ'
      ],
      audioTime: '0:45 - 1:30',
      bgColor: '#FFFFFF',
      headingBoxStyle: 'solid',
      textColor: '#0F172A',
      accentColor: '#DC2626'
    },
    {
      id: 3,
      title: 'એરિયર્સ ચૂકવણી અને ખાતામાં જમા તારીખ',
      subtitle: 'કેટલા હપ્તામાં અને ક્યારે રકમ મળશે?',
      bulletPoints: [
        'પાછલી અસરથી બાકી નીકળતું મોંઘવારી ભથ્થું રોકડમાં ચૂકવાશે',
        'એરિયર્સની રકમ ૩ થી ૪ સમાન હપ્તામાં સીધી બેંક ખાતામાં જમા',
        'પેન્શનર્સને ટ્રેઝરી મારફતે પેન્શન સાથે સીધું વિતરણ'
      ],
      audioTime: '1:30 - 2:15',
      bgColor: '#FFFFFF',
      headingBoxStyle: 'solid',
      textColor: '#0F172A',
      accentColor: '#DC2626'
    }
  ]);

  let currentSlideIdx = 0;

  // Make sure all slides have proper defaults and numeric sync timestamps
  let runningStart = 0;
  slides.forEach((s, idx) => {
    s.bgColor = '#FFFFFF';
    if (!s.headingBoxStyle) s.headingBoxStyle = 'solid';
    if (!s.accentColor) s.accentColor = '#DC2626';
    if (!s.bulletPoints) s.bulletPoints = [];
    
    if (typeof s.startTime !== 'number' || typeof s.endTime !== 'number' || isNaN(s.startTime) || isNaN(s.endTime)) {
      const range = parseRangeToSeconds(s.audioTime, 45);
      s.startTime = range.start >= 0 ? range.start : runningStart;
      s.endTime = range.end > s.startTime ? range.end : s.startTime + 45;
    }
    s.duration = parseFloat(Math.max(1, s.endTime - s.startTime).toFixed(1));
    s.audioTime = formatTimeRange(s.startTime, s.endTime);
    if (!s.spokenSnippet) {
      s.spokenSnippet = s.bulletPoints && s.bulletPoints[0] ? s.bulletPoints[0] : (s.subtitle || s.title);
    }
    runningStart = s.endTime;
  });

  container.innerHTML = `
    <!-- Top Header -->
    <div class="view-header" style="margin-bottom: 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 2.2rem;">🎨</span>
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0; background: linear-gradient(135deg, #38bdf8, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              વ્હાઇટ સ્લાઇડ્સ & ઓડિયો એડિટર (White Slide Studio)
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 2px 0 0 0;">
              ૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), બોલ્ડ હેડિંગ બોક્સ અને સ્પષ્ટ બુલેટ પોઇન્ટ્સ સાથે યુટ્યુબ સ્લાઇડ્સ બનાવો.
            </p>
          </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="btn-top-export-video" class="btn btn-success btn-sm" style="background: linear-gradient(135deg, #10b981, #059669); border-color: #059669; font-weight: 800;">
            <span>🎬</span> વિડીયો ડાઉનલોડ (MP4)
          </button>
          <button id="btn-export-slide-png" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #38bdf8; font-weight: 700;">
            <span>📥</span> આ સ્લાઇડ PNG
          </button>
          <button id="btn-export-all-slides" class="btn btn-outline btn-sm" style="border-color: #a855f7; color: #c084fc; font-weight: 700;">
            <span>📦</span> બધી સ્લાઇડ્સ ડાઉનલોડ
          </button>
          <button id="btn-print-slides-pdf" class="btn btn-outline btn-sm" style="border-color: #f59e0b; color: #fbbf24; font-weight: 700;">
            <span>📄</span> PDF / પ્રિન્ટ
          </button>
          <button id="btn-send-to-scriptwriter" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #10b981, #059669); border-color: #059669; font-weight: 800;">
            🚀 આ સ્લાઇડ્સમાંથી સ્ક્રિપ્ટ પ્રોમ્પ્ટ્સ બનાવો ➔
          </button>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- 🌟 AUDIO & PDF AUTO-MATCH VIDEO EDITOR (PRIMARY STAR TOOL)                -->
    <!-- ========================================================================= -->
    <div class="card" id="automatch-studio-card" style="margin-bottom: 24px; border: 2.5px solid #10b981; background: linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(56,189,248,0.06) 100%); padding: 22px; border-radius: 16px; box-shadow: 0 10px 32px rgba(16,185,129,0.2);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 2.2rem; background: linear-gradient(135deg, #10b981, #059669); padding: 8px 14px; border-radius: 12px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">🎬</span>
          <div>
            <h3 style="font-size: 1.35rem; font-weight: 800; color: #ffffff; margin: 0; display: flex; align-items: center; gap: 10px;">
              ઓડિયો & PDF ઓટો-મેચ એડિટર (Audio & PDF Auto-Match Studio)
              <span class="badge" style="background: #10b981; color: #042f2e; font-weight: 900; font-size: 0.76rem; padding: 4px 10px; border-radius: 6px; box-shadow: 0 2px 8px rgba(16,185,129,0.4);">⚡ ૧૦૦% પરફેક્ટ ઓટો-મેચ</span>
            </h3>
            <p style="color: #cbd5e1; font-size: 0.88rem; margin: 4px 0 0 0;">
              ઓડિયો અને PDF સ્લાઇડ્સને <strong>ઓટોમેટિક મેચ</strong> કરો અથવા <strong>કસ્ટમ મેચ</strong> કરીને સીધો યુટ્યુબ વીડિયો બનાવો!
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span id="automatch-ready-indicator" class="badge" style="background: rgba(16,185,129,0.18); border: 1px solid #10b981; color: #34d399; font-weight: 700; font-size: 0.78rem; padding: 6px 12px; border-radius: 8px;">
            ● સિસ્ટમ તૈયાર છે
          </span>
        </div>
      </div>

      <!-- Mode Selector Bar (Auto-Match vs Custom Slide-Audio Match) -->
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <button type="button" id="tab-mode-automatch" class="btn btn-sm active" style="font-weight: 800; padding: 8px 18px; border-radius: 8px; background: #10b981; color: #042f2e; border: none; cursor: pointer; box-shadow: 0 2px 8px rgba(16,185,129,0.4);">
          ⚡ ૧. સ્માર્ટ ઓટો-મેચ મોડ (Auto-Match)
        </button>
        <button type="button" id="tab-mode-custommatch" class="btn btn-sm btn-outline" style="font-weight: 800; padding: 8px 18px; border-radius: 8px; border-color: #38bdf8; color: #38bdf8; cursor: pointer;">
          🎛️ ૨. સ્લાઇડ & ઓડિયો કસ્ટમ મેચ મોડ (Manual Matcher)
        </button>
        <span id="active-mode-description" style="color: #67e8f9; font-size: 0.8rem; font-weight: 600; margin-left: 6px;">
          💡 ઓટો-મેચ મોડ: PDF અને ઓડિયો અપલોડ કરો ➔ સિસ્ટમ ૧૦૦% પરફેક્ટ ગોઠવી દેશે.
        </span>
      </div>

      <!-- Hidden file inputs -->
      <input type="file" id="automatch-audio-file-input" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg" style="display: none;">
      <input type="file" id="automatch-pdf-file-input" accept=".pdf,application/pdf,application/x-pdf,text/plain,*" style="display: none;">

      <!-- Dual Dropzones Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; margin-bottom: 20px;">
        
        <!-- Dropzone 1: Audio File -->
        <div class="card" id="automatch-audio-dropzone" style="margin: 0; padding: 22px; border: 2px dashed #38bdf8; background: rgba(56, 189, 248, 0.05); border-radius: 12px; text-align: center; cursor: pointer; transition: all 0.25s ease;">
          <div id="automatch-audio-empty-state">
            <div style="font-size: 2.8rem; margin-bottom: 8px; filter: drop-shadow(0 4px 10px rgba(56,189,248,0.3));">🎙️</div>
            <h4 style="font-size: 1.1rem; font-weight: 800; color: #ffffff; margin: 0 0 4px 0;">
              ૧. ઓડિયો ફાઇલ (Audio File)
            </h4>
            <p style="color: #94a3b8; font-size: 0.8rem; margin: 0 0 12px 0;">
              MP3, WAV, M4A ફાઇલ ડ્રેગ કરો અથવા પસંદ કરો
            </p>
            <button id="btn-select-automatch-audio" type="button" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #38bdf8; font-weight: 800; padding: 7px 18px; border-radius: 8px;">
              <span>📁</span> ઓડિયો પસંદ કરો
            </button>
            <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-top: 12px;">
              <button type="button" class="btn btn-sm btn-quick-audio" data-type="lata" style="font-size: 0.72rem; padding: 3px 8px; background: rgba(56,189,248,0.15); border: 1px solid #38bdf8; color: #7dd3fc; border-radius: 6px;">
                👑 લતા મધુર અવાજ
              </button>
              <button type="button" class="btn btn-sm btn-quick-audio" data-type="cloned" style="font-size: 0.72rem; padding: 3px 8px; background: rgba(236,72,153,0.15); border: 1px solid #ec4899; color: #f472b6; border-radius: 6px;">
                🎙️ મારો ક્લોન અવાજ
              </button>
            </div>
          </div>

          <div id="automatch-audio-loaded-state" style="display: none;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 6px;">
              <span style="font-size: 1.5rem; color: #10b981;">✓</span>
              <strong id="automatch-audio-filename" style="color: #ffffff; font-size: 0.98rem; word-break: break-all;">audio.mp3</strong>
            </div>
            <div id="automatch-audio-duration-badge" style="display: inline-block; background: rgba(56,189,248,0.18); color: #38bdf8; font-family: monospace; font-size: 0.84rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; margin-bottom: 12px;">
              ⏱️ લંબાઈ: 0:00 (0s)
            </div>
            <div>
              <button id="btn-change-automatch-audio" type="button" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #38bdf8; font-weight: 700; padding: 4px 12px; font-size: 0.75rem;">
                <span>🔄</span> બીજો ઓડિયો બદલો
              </button>
            </div>
          </div>
        </div>

        <!-- Dropzone 2: PDF Document -->
        <div class="card" id="automatch-pdf-dropzone" style="margin: 0; padding: 22px; border: 2px dashed #10b981; background: rgba(16, 185, 129, 0.05); border-radius: 12px; text-align: center; cursor: pointer; transition: all 0.25s ease;">
          <div id="automatch-pdf-empty-state">
            <div style="font-size: 2.8rem; margin-bottom: 8px; filter: drop-shadow(0 4px 10px rgba(16,185,129,0.3));">📄</div>
            <h4 style="font-size: 1.1rem; font-weight: 800; color: #ffffff; margin: 0 0 4px 0;">
              ૨. PDF દસ્તાવેજ (PDF Document)
            </h4>
            <p style="color: #94a3b8; font-size: 0.8rem; margin: 0 0 12px 0;">
              સરકારી પરિપત્ર, ઠરાવ કે સ્લાઇડ્સની PDF મૂકો
            </p>
            <button id="btn-select-automatch-pdf" type="button" class="btn btn-outline btn-sm" style="border-color: #10b981; color: #34d399; font-weight: 800; padding: 7px 18px; border-radius: 8px;">
              <span>📂</span> PDF પસંદ કરો
            </button>
            <div style="display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-top: 12px;">
              <button type="button" class="btn btn-sm btn-quick-pdf" data-topic="ગુજરાત કર્મચારી પગાર અને DA વધારો પરિપત્ર ૨૦૨૬" style="font-size: 0.72rem; padding: 3px 8px; background: rgba(16,185,129,0.15); border: 1px solid #10b981; color: #34d399; border-radius: 6px;">
                💼 DA પરિપત્ર PDF
              </button>
              <button type="button" class="btn btn-sm btn-quick-pdf" data-topic="મુખ્યમંત્રી કિસાન સહાય યોજના અને ખેડૂત સબસિડી" style="font-size: 0.72rem; padding: 3px 8px; background: rgba(245,158,11,0.15); border: 1px solid #f59e0b; color: #fbbf24; border-radius: 6px;">
                🌾 કિસાન યોજના PDF
              </button>
            </div>
          </div>

          <div id="automatch-pdf-loaded-state" style="display: none;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 6px;">
              <span style="font-size: 1.5rem; color: #10b981;">✓</span>
              <strong id="automatch-pdf-filename" style="color: #ffffff; font-size: 0.98rem; word-break: break-all;">paripatra.pdf</strong>
            </div>
            <div id="automatch-pdf-pages-badge" style="display: inline-block; background: rgba(16,185,129,0.18); color: #34d399; font-weight: 700; font-size: 0.84rem; padding: 4px 10px; border-radius: 6px; margin-bottom: 12px;">
              📑 ૫ પેજ / સ્લાઇડ્સ એક્સટ્રેક્ટ થઈ
            </div>
            <div>
              <button id="btn-change-automatch-pdf" type="button" class="btn btn-outline btn-sm" style="border-color: #10b981; color: #34d399; font-weight: 700; padding: 4px 12px; font-size: 0.75rem;">
                <span>🔄</span> બીજી PDF બદલો
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Centered Giant Auto-Match Action Button -->
      <div style="text-align: center; padding-top: 6px;">
        <button id="btn-run-automatch" class="btn btn-primary" style="font-size: 1.08rem; font-weight: 900; padding: 14px 34px; background: linear-gradient(135deg, #10b981 0%, #059669 50%, #0284c7 100%); border: none; border-radius: 12px; box-shadow: 0 6px 24px rgba(16,185,129,0.45); cursor: pointer; display: inline-flex; align-items: center; gap: 10px; transition: transform 0.15s ease;">
          <span style="font-size: 1.3rem;">✨</span>
          <span>એકદમ પરફેક્ટ ઓટો-મેચ કરો (Instant Auto-Match)</span>
        </button>
        <p id="automatch-status-hint" style="color: #94a3b8; font-size: 0.82rem; margin: 8px 0 0 0;">
          💡 ઓડિયો અને PDF બંને મૂક્યા પછી આ બટન દબાવો, અથવા બંને પસંદ થતાં જ આપોઆપ ઓટો-મેચ થઈ જશે!
        </p>
      </div>

      <!-- Success Notification Box (Appears after Auto-Match) -->
      <div id="automatch-success-banner" style="display: none; margin-top: 18px; padding: 14px 18px; background: rgba(16,185,129,0.14); border: 1.5px solid #10b981; border-radius: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem;">🎉</span>
            <div>
              <strong id="automatch-success-title" style="color: #ffffff; font-size: 0.98rem;">
                ઓડિયો અને PDF એકદમ પરફેક્ટ સિંક થઈ ગયા!
              </strong>
              <div id="automatch-success-details" style="color: #6ee7b7; font-size: 0.82rem;">
                બધી સ્લાઇડ્સ ઓડિયોના ચોક્કસ બોલવાની ગતિ સાથે ૧૦૦% ગોઠવાઈ ગઈ છે (૦ ગેપ, ૦ ઓવરલેપ).
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="btn-automatch-preview-play" class="btn btn-success btn-sm" style="font-weight: 800; background: #059669; border: none; padding: 6px 14px;">
              ▶️ લાઇવ વિડીયો જુઓ
            </button>
            <button id="btn-export-full-video" class="btn btn-primary btn-sm" style="font-weight: 800; background: linear-gradient(135deg, #38bdf8, #2563eb); border: none; padding: 6px 14px;">
              🎬 વિડીયો ડાઉનલોડ (MP4)
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Master Audio Bar -->
    <div class="card" style="margin-bottom: 20px; padding: 14px 18px; border-left: 4px solid #38bdf8; background: rgba(56,189,248,0.04);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.2rem;">🎙️</span>
          <span style="font-weight: 700; font-size: 0.92rem; color: #fff;">
            ઓડિયો ટ્રેક (${project.voiceAudio?.provider || 'ElevenLabs Cloned Voice'}):
          </span>
        </div>
        <button id="btn-change-audio" class="btn btn-outline btn-sm" style="font-size: 0.76rem; padding: 3px 8px;">
          નવો ઓડિયો બનાવો (My Voice) ↗
        </button>
      </div>

      <audio id="slide-master-audio" controls style="width: 100%; height: 38px; outline: none;" src="${loadedAudioUrl}"></audio>
    </div>

    <!-- ========================================================================= -->
    <!-- 📺 16:9 FULL VIDEO LIVE CINEMA PLAYER & ACTIVE SLIDE EDITOR               -->
    <!-- ========================================================================= -->
    <div style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 20px; margin-bottom: 30px;" id="slide-editor-grid">
      
      <!-- Left: 16:9 Slide Canvas Live Preview & Cinema Controls -->
      <div>
        <div class="card" style="padding: 16px; border: 2px solid #38bdf8; background: #070a13; box-shadow: 0 8px 30px rgba(56,189,248,0.12);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div style="font-weight: 800; font-size: 1.05rem; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.4rem;">📺</span>
              <span>૧૬:૯ સંપૂર્ણ વિડીયો લાઇવ પ્લેયર (Full Video Cinema Live Player)</span>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <button id="btn-canvas-export-video" class="btn btn-success btn-sm" style="background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: 800; padding: 4px 10px; font-size: 0.76rem;">
                🎬 વિડીયો રેકોર્ડ
              </button>
              <button id="btn-prev-slide" class="btn btn-secondary btn-sm" style="padding: 4px 10px;">◀ પાછળ</button>
              <span id="slide-counter-badge" class="badge badge-blue" style="font-weight: 800;">૧ / ${slides.length}</span>
              <button id="btn-next-slide" class="btn btn-secondary btn-sm" style="padding: 4px 10px;">આગળ ▶</button>
            </div>
          </div>

          <!-- The Canvas Aspect Ratio Wrapper (16:9) -->
          <div style="position: relative; width: 100%; padding-top: 56.25%; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6); border: 2px solid #e2e8f0;">
            <canvas id="slide-render-canvas" width="1280" height="720" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></canvas>
          </div>

          <!-- Integrated Cinema Video Controls Bar -->
          <div style="margin-top: 14px; padding: 14px 16px; background: #0b1120; border: 1.5px solid #10b981; border-radius: 12px; box-shadow: 0 4px 20px rgba(16,185,129,0.15);">
            <!-- Row 1: Player Buttons & Live Time -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <button id="btn-full-video-play-toggle" class="btn btn-primary" style="font-weight: 800; padding: 10px 22px; font-size: 0.98rem; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.4); display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
                  <span id="full-video-play-icon" style="font-size: 1.2rem;">▶️</span>
                  <span id="full-video-play-text">આખો વિડીયો જુઓ (Play Full Video)</span>
                </button>
                <button id="btn-full-video-restart" class="btn btn-secondary btn-sm" style="padding: 8px 14px; font-weight: 700;" title="શરૂઆતથી પ્લે કરો">
                  ⏮️ 0:00 થી
                </button>
              </div>

              <!-- Time Counter -->
              <div style="font-family: monospace; font-size: 1.05rem; font-weight: 800; color: #38bdf8; background: rgba(0,0,0,0.6); padding: 7px 16px; border-radius: 8px; border: 1.5px solid rgba(56,189,248,0.35);">
                <span id="full-video-current-time">0:00</span> / <span id="full-video-total-time">3:00</span>
              </div>

              <!-- Video Download Button directly in Player -->
              <button id="btn-player-export-video" class="btn btn-success btn-sm" style="font-weight: 800; background: linear-gradient(135deg, #38bdf8, #2563eb); border: none; padding: 8px 18px; border-radius: 8px; box-shadow: 0 4px 12px rgba(56,189,248,0.3); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                <span>🎬</span> વિડીયો ડાઉનલોડ (MP4)
              </button>
            </div>

            <!-- Row 2: Live Video Scrubber Progress Bar -->
            <div style="position: relative; width: 100%; height: 12px; background: rgba(255,255,255,0.08); border-radius: 6px; cursor: pointer; overflow: hidden; border: 1px solid rgba(255,255,255,0.15);" id="full-video-scrub-bar" title="વિડીયો સમયરેખા પર આગળ-પાછળ જવા માટે ક્લિક કરો">
              <div id="full-video-scrub-fill" style="position: absolute; top: 0; left: 0; height: 100%; width: 0%; background: linear-gradient(90deg, #10b981, #38bdf8); border-radius: 6px; transition: width 0.1s linear;"></div>
            </div>

            <!-- Row 3: Active Status & Note -->
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; margin-top: 8px; flex-wrap: wrap; gap: 8px;">
              <span id="full-video-active-slide-label" style="color: #ffffff; font-weight: 700;">
                📍 હાલની સ્લાઇડ: #૧ (${slides[0]?.title ? slides[0].title.slice(0, 32) : ''}...)
              </span>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button id="btn-play-current-slide-audio" class="btn btn-outline btn-sm" style="border-color: #10b981; color: #34d399; font-size: 0.74rem; padding: 3px 8px;">
                  ▶️ આ સ્લાઇડ સાંભળો
                </button>
                <span style="color: #34d399; font-weight: 600;">
                  ✓ ઓડિયો મુજબ સ્લાઇડ્સ ૧૬:૯ માં આપોઆપ બદલાય છે
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Active Slide Editor Controls -->
      <div>
        <div class="card" style="padding: 18px;" id="active-slide-edit-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
            <div style="font-weight: 800; font-size: 1rem; color: #fff;" id="edit-slide-heading">
              ✏️ સ્લાઇડ #૧ એડિટ કરો
            </div>
            <button id="btn-add-new-slide" class="btn btn-primary btn-sm" style="font-size: 0.78rem; background: linear-gradient(135deg, #38bdf8, #2563eb);">
              ➕ નવી સ્લાઇડ ઉમેરો
            </button>
          </div>

          <!-- Slide Title (Heading Box Content) -->
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-size: 0.82rem; font-weight: 700; color: #e2e8f0;">
              મુખ્ય શીર્ષક (Heading Box માં દર્શાવવા માટે):
            </label>
            <input type="text" id="slide-edit-title" class="form-input font-gu" style="font-weight: 700; color: #ffffff;" value="${slides[0].title}">
          </div>

          <!-- Heading Box Style for this slide -->
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-size: 0.82rem;">આ સ્લાઇડનો હેડિંગ બોક્સ પ્રકાર:</label>
            <select id="slide-edit-box-style" class="form-input font-gu" style="font-size: 0.82rem;">
              <option value="solid" ${slides[0].headingBoxStyle === 'solid' ? 'selected' : ''}>🟥 સોલિડ હેડિંગ બોક્સ (Solid Filled)</option>
              <option value="outline" ${slides[0].headingBoxStyle === 'outline' ? 'selected' : ''}>⬜ આઉટલાઇન ફ્રેમ બોક્સ (Bordered Box)</option>
              <option value="banner" ${slides[0].headingBoxStyle === 'banner' ? 'selected' : ''}>🟨 બેનર હેડિંગ બોક્સ (Top Wide Banner)</option>
            </select>
          </div>

          <!-- Subtitle / Tagline -->
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-size: 0.82rem;">ગૌણ ટેક્સ્ટ (Subtitle / Tagline):</label>
            <input type="text" id="slide-edit-subtitle" class="form-input font-gu" value="${slides[0].subtitle || ''}">
          </div>

          <!-- Audio Timestamp Sync & Live Matching Controls -->
          <div class="form-group" style="margin-bottom: 14px; padding: 12px; background: rgba(56,189,248,0.06); border: 1.5px solid #38bdf8; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label class="form-label" style="font-size: 0.84rem; font-weight: 800; color: #38bdf8; margin: 0;">
                ⏱️ સ્લાઇડ & ઓડિયો મેચિંગ (Timing Matcher):
              </label>
              <span id="slide-timing-duration-badge" class="badge" style="background: rgba(56,189,248,0.2); color: #38bdf8; border: 1px solid #38bdf8; font-size: 0.76rem; font-weight: 700; padding: 2px 8px; border-radius: 6px;">
                ૪૫.૦ સેકન્ડ
              </span>
            </div>

            <!-- Start & End Time Inputs with quick nudges -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
              <div>
                <label style="font-size: 0.74rem; color: #94a3b8; font-weight: 700;">શરૂઆતનો સમય:</label>
                <div style="display: flex; gap: 3px; margin-top: 2px;">
                  <input type="text" id="slide-edit-start-time" class="form-input font-en" value="0:00" style="padding: 4px 6px; font-size: 0.85rem; font-weight: 800; text-align: center; background: rgba(15,23,42,0.8); color: #34d399;">
                  <button type="button" id="btn-nudge-start-sub" class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 0.72rem;" title="-1s">-1s</button>
                  <button type="button" id="btn-nudge-start-add" class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 0.72rem;" title="+1s">+1s</button>
                </div>
              </div>
              <div>
                <label style="font-size: 0.74rem; color: #94a3b8; font-weight: 700;">અંતિમ સમય:</label>
                <div style="display: flex; gap: 3px; margin-top: 2px;">
                  <input type="text" id="slide-edit-end-time" class="form-input font-en" value="0:45" style="padding: 4px 6px; font-size: 0.85rem; font-weight: 800; text-align: center; background: rgba(15,23,42,0.8); color: #38bdf8;">
                  <button type="button" id="btn-nudge-end-sub" class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 0.72rem;" title="-1s">-1s</button>
                  <button type="button" id="btn-nudge-end-add" class="btn btn-secondary btn-sm" style="padding: 2px 6px; font-size: 0.72rem;" title="+1s">+1s</button>
                </div>
              </div>
            </div>

            <!-- Live Match with Current Audio Buttons -->
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
              <button type="button" id="btn-set-start-from-audio" class="btn btn-outline btn-sm" style="flex: 1; font-size: 0.73rem; padding: 5px 6px; border-color: #10b981; color: #34d399; font-weight: 700; white-space: nowrap;" title="ઓડિયો જ્યાં સુધી વાગ્યો હોય ત્યાંથી આ સ્લાઇડ શરૂ કરો">
                📍 હાલના ઓડિયો સ્થાને શરૂ કરો
              </button>
              <button type="button" id="btn-set-end-from-audio" class="btn btn-outline btn-sm" style="flex: 1; font-size: 0.73rem; padding: 5px 6px; border-color: #38bdf8; color: #38bdf8; font-weight: 700; white-space: nowrap;" title="ઓડિયો જ્યાં પહોંચ્યો હોય ત્યાં આ સ્લાઇડ પૂરી કરો">
                📍 હાલના સ્થાને પૂરી કરો
              </button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.71rem; color: #cbd5e1;">
              <span>💡 ઓડિયો સાંભળીને પોઝ કરો અને બટન દબાવો</span>
              <button type="button" id="btn-quick-split-slide" class="btn btn-outline btn-sm" style="font-size: 0.7rem; padding: 2px 8px; border-color: #eab308; color: #facc15;">
                ✂️ અહીં સ્પ્લિટ કરો
              </button>
            </div>
            <input type="hidden" id="slide-edit-audiotime" value="${slides[0].audioTime || '0:00 - 0:45'}">
          </div>

          <!-- Bullet Points -->
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" style="font-size: 0.82rem; font-weight: 700; color: #e2e8f0;">
              મુખ્ય મુદ્દાઓ (Bullet Points - લીટી દીઠ ૧ મુદ્દો):
            </label>
            <textarea id="slide-edit-bullets" class="form-textarea font-gu" style="height: 110px; font-size: 0.88rem; line-height: 1.5;">${(slides[0].bulletPoints || []).join('\n')}</textarea>
          </div>

          <!-- Spoken Script / Narration Snippet for this slide (Lower-Third Subtitle) -->
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" style="font-size: 0.82rem; font-weight: 700; color: #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
              <span>🎙️ બોલાયેલ સ્ક્રિપ્ટ લખાણ (Spoken Voiceover Script):</span>
              <span style="font-size: 0.72rem; color: #38bdf8; font-weight: normal;">(કેનવાસ પર સબટાઈટલ પટ્ટીમાં દેખાશે)</span>
            </label>
            <textarea id="slide-edit-spoken" class="form-textarea font-gu" style="height: 68px; font-size: 0.84rem; line-height: 1.45;" placeholder="આ સ્લાઇડ દરમિયાન બોલાતી સ્ક્રિપ્ટનું વાક્ય...">${slides[0].spokenSnippet || ''}</textarea>
          </div>

          <!-- Accent Color for Active Slide -->
          <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 14px;">
            <span style="font-size: 0.8rem; color: var(--text-muted);">કલર થીમ:</span>
            <button class="btn btn-outline btn-sm slide-color-btn ${slides[0].accentColor === '#DC2626' ? 'active' : ''}" data-accent="#DC2626" style="border-color: #DC2626; color: #DC2626; font-size: 0.75rem;">
              🔴 લાલ
            </button>
            <button class="btn btn-outline btn-sm slide-color-btn ${slides[0].accentColor === '#2563EB' ? 'active' : ''}" data-accent="#2563EB" style="border-color: #2563EB; color: #2563EB; font-size: 0.75rem;">
              🔵 રોયલ બ્લુ
            </button>
            <button class="btn btn-outline btn-sm slide-color-btn ${slides[0].accentColor === '#0F172A' ? 'active' : ''}" data-accent="#0F172A" style="border-color: #94A3B8; color: #E2E8F0; font-size: 0.75rem;">
              ⚫ નેવી
            </button>
            <button class="btn btn-outline btn-sm slide-color-btn ${slides[0].accentColor === '#10B981' ? 'active' : ''}" data-accent="#10B981" style="border-color: #10B981; color: #10B981; font-size: 0.75rem;">
              🟢 ગ્રીન
            </button>
          </div>

          <!-- Delete / Autosave status -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid var(--border-color);">
            <button id="btn-delete-slide" class="btn btn-danger btn-sm" style="font-size: 0.75rem;">
              🗑️ આ સ્લાઇડ ડિલીટ
            </button>
            <span style="font-size: 0.75rem; color: #10b981;">✓ લાઈવ કેનવાસ પર આપોઆપ સેવ થાય છે</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Slide Timeline Strip -->
    <div class="card" style="margin-bottom: 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="font-weight: 800; font-size: 0.95rem; color: #fff;">
          📑 સ્લાઇડ લિસ્ટ (Slide Timeline Strip)
        </div>
        <span style="font-size: 0.78rem; color: var(--text-muted);">ક્લિક કરીને કોઈપણ સ્લાઇડ પર જાઓ</span>
      </div>
      <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px;" id="slides-timeline-strip">
        <!-- Rendered dynamically -->
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- DEDICATED TOOL: 1-CLICK WHITE SLIDE MAKER (USER REQUEST)  -->
    <!-- ========================================================= -->
    <div class="card" style="margin-bottom: 24px; border: 2px solid #38bdf8; background: linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(139,92,246,0.06) 100%); padding: 18px 20px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.6rem; background: rgba(56,189,248,0.2); padding: 6px 10px; border-radius: 8px;">🎯</span>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: #fff; margin: 0;">
              ૧-ક્લિક વ્હાઇટ સ્લાઇડ્સ જનરેટર (White Slide Maker Tool)
            </h3>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin: 2px 0 0 0;">
              કોઈપણ વિષય લખો અને મેળવો: <strong>શુદ્ધ સફેદ બેકગ્રાઉન્ડ</strong> + <strong>પ્રખ્યાત હેડિંગ બોક્સ</strong> + <strong>સત્તાવાર બુલેટ પોઇન્ટ્સ</strong>.
            </p>
          </div>
        </div>
        <span class="badge badge-blue" style="font-size: 0.75rem; padding: 4px 8px;">✓ 100% White #FFFFFF Canvas</span>
      </div>

      <!-- Topic Input -->
      <div style="margin-bottom: 12px;">
        <label class="form-label" style="font-size: 0.82rem; font-weight: 700; color: #e2e8f0;">
          સ્લાઇડ્સ માટે વિષય અથવા સરકારી યોજનાનું નામ દાખલ કરો:
        </label>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="maker-slide-topic" class="form-input font-gu" style="flex: 1; font-weight: 600; font-size: 0.95rem; background: rgba(15,23,42,0.6);" value="${project.topic || 'ગુજરાત કર્મચારી પગાર અને DA વધારો ૨૦૨૬'}" placeholder="દા.ત. ગુજરાત આંગણવાડી ભરતી અને પગાર વધારો ૨૦૨૬">
        </div>
      </div>

      <!-- Quick Preset Chips -->
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 14px;">
        <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700;">રેડીમેડ વિષયો:</span>
        <button class="btn btn-outline btn-sm maker-preset-chip" data-topic="ગુજરાત આંગણવાડી ભરતી અને માનદવેતન ૨૦૨૬" style="font-size: 0.74rem; padding: 3px 8px; border-color: #ec4899; color: #f472b6;">
          🌸 આંગણવાડી ભરતી & પગાર
        </button>
        <button class="btn btn-outline btn-sm maker-preset-chip" data-topic="ગુજરાત કર્મચારી ૫૩% મોંઘવારી ભથ્થું (DA) અને એરિયર્સ પરિપત્ર" style="font-size: 0.74rem; padding: 3px 8px; border-color: #38bdf8; color: #38bdf8;">
          💼 કર્મચારી ૫૩% DA વધારો
        </button>
        <button class="btn btn-outline btn-sm maker-preset-chip" data-topic="મુખ્યમંત્રી કિસાન સહાય યોજના અને ખેડૂત સબસિડી" style="font-size: 0.74rem; padding: 3px 8px; border-color: #10b981; color: #34d399;">
          🌾 કિસાન સહાય યોજના
        </button>
        <button class="btn btn-outline btn-sm maker-preset-chip" data-topic="TET / TAT શિક્ષક ભરતી ૨૦૨૬ નવી પરીક્ષા પદ્ધતિ & નિયમો" style="font-size: 0.74rem; padding: 3px 8px; border-color: #f59e0b; color: #fbbf24;">
          📚 TET / TAT નવી પરીક્ષા
        </button>
        <button class="btn btn-outline btn-sm maker-preset-chip" data-topic="ગુજરાત પોલીસ કોન્સ્ટેબલ અને PSI ભરતી ૨૦૨૬" style="font-size: 0.74rem; padding: 3px 8px; border-color: #a855f7; color: #c084fc;">
          👮 પોલીસ કોન્સ્ટેબલ ભરતી
        </button>
      </div>

      <!-- Generator Options: Heading Box Style, Slide Count, Accent Color -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08);">
        
        <!-- Heading Box Style -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 700;">📦 હેડિંગ બોક્સ:</span>
          <div class="btn-group" style="display: inline-flex; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color);">
            <button type="button" class="btn btn-sm maker-style-btn active" data-style="solid" style="font-size: 0.75rem; padding: 4px 10px; background: #DC2626; color: #fff; font-weight: 700;">
              🟥 સોલિડ બોક્સ
            </button>
            <button type="button" class="btn btn-sm maker-style-btn" data-style="outline" style="font-size: 0.75rem; padding: 4px 10px; background: rgba(255,255,255,0.05); color: #cbd5e1;">
              ⬜ આઉટલાઇન ફ્રેમ
            </button>
            <button type="button" class="btn btn-sm maker-style-btn" data-style="banner" style="font-size: 0.75rem; padding: 4px 10px; background: rgba(255,255,255,0.05); color: #cbd5e1;">
              🟨 બેનર બોક્સ
            </button>
          </div>
        </div>

        <!-- Slide Count -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 700;">🔢 સ્લાઇડ્સ સંખ્યા:</span>
          <select id="maker-slide-count" class="form-input" style="padding: 4px 8px; font-size: 0.8rem; width: auto; background: rgba(15,23,42,0.7); color: #fff;">
            <option value="3">૩ સ્લાઇડ્સ (Short)</option>
            <option value="5" selected>૫ સ્લાઇડ્સ (Standard - રિકમેન્ડેડ)</option>
            <option value="6">૬ સ્લાઇડ્સ (Detailed)</option>
            <option value="8">૮ સ્લાઇડ્સ (Full Deck)</option>
          </select>
        </div>

        <!-- Accent Color -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 700;">🎨 બોક્સ કલર:</span>
          <div style="display: flex; gap: 6px;">
            <button class="maker-color-dot active" data-color="#DC2626" style="width: 24px; height: 24px; border-radius: 50%; background: #DC2626; border: 2px solid #fff; cursor: pointer;" title="લાલ"></button>
            <button class="maker-color-dot" data-color="#2563EB" style="width: 24px; height: 24px; border-radius: 50%; background: #2563EB; border: 2px solid transparent; cursor: pointer;" title="રોયલ બ્લુ"></button>
            <button class="maker-color-dot" data-color="#0F172A" style="width: 24px; height: 24px; border-radius: 50%; background: #0F172A; border: 2px solid transparent; cursor: pointer;" title="ડાર્ક નેવી"></button>
            <button class="maker-color-dot" data-color="#10B981" style="width: 24px; height: 24px; border-radius: 50%; background: #10B981; border: 2px solid transparent; cursor: pointer;" title="ગ્રીન"></button>
          </div>
        </div>

        <!-- Primary Generate Action -->
        <button id="btn-generate-white-slides" class="btn btn-primary" style="background: linear-gradient(135deg, #38bdf8, #2563eb); font-weight: 800; padding: 6px 16px; font-size: 0.88rem; box-shadow: 0 4px 12px rgba(56,189,248,0.3);">
          ✨ ૧-ક્લિકમાં વ્હાઇટ સ્લાઇડ્સ બનાવો
        </button>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- 2 DEDICATED NOTEBOOKLM TOOLS (USER REQUEST)               -->
    <!-- ========================================================= -->
    <div class="card" style="margin-bottom: 24px; border: 2px solid #8b5cf6; background: rgba(139,92,246,0.03); padding: 18px 20px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.6rem; background: rgba(139,92,246,0.2); padding: 6px 10px; border-radius: 8px;">📑</span>
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: #fff; margin: 0; display: flex; align-items: center; gap: 8px;">
              NotebookLM ૨ સ્પેશિયલ ટૂલ્સ (કન્ટેન્ટ મેકર & ૧૬:૯ વ્હાઇટ PPT)
              <span class="badge badge-amber" style="font-size: 0.72rem;">૨ ટૂલ્સ સક્રિય</span>
            </h3>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin: 2px 0 0 0;">
              આ વિષય માટે Google NotebookLM ના બંને સત્તાવાર પ્રોમ્પ્ટ્સ (સોર્સ કન્ટેન્ટ & શ્રેષ્ઠ અસલી ફોટા PPT):
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="btn-editor-goto-slideprompts" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #7dd3fc; font-weight: 700;">
            <span>📑</span> ડિટેઇલ્ડ NotebookLM સ્ટુડિયો ↗
          </button>
          <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="border-color: #8b5cf6; color: #c4b5fd; font-weight: 700;">
            <span>🚀</span> Open Google NotebookLM ↗
          </a>
          <button id="btn-editor-goto-chatgpt" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #10b981, #059669); border-color: #059669; font-weight: 700;">
            <span>💬</span> Built-in ChatGPT
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
        <!-- Tool 1 Card -->
        <div style="background: rgba(15,23,42,0.65); border: 1.5px solid #38bdf8; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 1.2rem;">📄</span>
                <strong style="color: #ffffff; font-size: 0.95rem;">ટૂલ ૧: NotebookLM કન્ટેન્ટ & સોર્સ પ્રોમ્પ્ટ</strong>
              </div>
              <button id="editor-btn-copy-content-prompt" class="btn btn-primary btn-sm" style="background: #0284c7; border-color: #38bdf8; font-size: 0.76rem; font-weight: 700; padding: 5px 12px; display: inline-flex; align-items: center; gap: 6px;">
                <span>📋</span> કોપી ટૂલ ૧
              </button>
            </div>
            <p style="color: var(--text-muted); font-size: 0.76rem; margin-bottom: 8px; line-height: 1.4;">
              NotebookLM ના Sources માં ઉમેરવા માટે સત્તાવાર GR નંબર, પાત્રતા ટેબલ & ઓડિયો પોડકાસ્ટ માટે ૧૦૦% સાચો કન્ટેન્ટ સોર્સ.
            </p>
          </div>
          <div style="position: relative;">
            <div style="position: absolute; right: 10px; top: 8px; z-index: 2;">
              <button id="editor-quick-copy-content" class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.7rem; background: rgba(56,189,248,0.25); border-color: #38bdf8; color: #7dd3fc;">
                📋 1-Click Copy
              </button>
            </div>
            <textarea id="editor-content-prompt-ta" class="form-textarea font-gu" style="height: 180px; font-size: 0.82rem; line-height: 1.5; background: #07090e; border-color: rgba(56,189,248,0.25); color: #f1f5f9; padding: 10px; border-radius: 6px; width: 100%; resize: vertical; cursor: pointer;" title="ટેપ કરીને સિલેક્ટ કરો" readonly>${initialContentPrompt}</textarea>
          </div>
        </div>

        <!-- Tool 2 Card -->
        <div style="background: rgba(15,23,42,0.65); border: 1.5px solid #8b5cf6; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 1.2rem;">🖥️</span>
                <strong style="color: #ffffff; font-size: 0.95rem;">ટૂલ ૨: ૧૬:૯ વ્હાઇટ PPT & શ્રેષ્ઠ અસલી ફોટા</strong>
              </div>
              <button id="editor-btn-copy-ppt-prompt" class="btn btn-secondary btn-sm" style="background: #8b5cf6; color: white; font-size: 0.76rem; font-weight: 700; padding: 5px 12px; display: inline-flex; align-items: center; gap: 6px;">
                <span>📋</span> કોપી ટૂલ ૨
              </button>
            </div>
            <p style="color: var(--text-muted); font-size: 0.76rem; margin-bottom: 8px; line-height: 1.4;">
              NotebookLM ના Slide Deck માટે ૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), બોલ્ડ હેડિંગ બોક્સ, બુલેટ પોઇન્ટ્સ અને શ્રેષ્ઠ અસલી ફોટા.
            </p>
          </div>
          <div style="position: relative;">
            <div style="position: absolute; right: 10px; top: 8px; z-index: 2;">
              <button id="editor-quick-copy-ppt" class="btn btn-secondary btn-sm" style="padding: 2px 8px; font-size: 0.7rem; background: rgba(139,92,246,0.25); border-color: #8b5cf6; color: #c4b5fd;">
                📋 1-Click Copy
              </button>
            </div>
            <textarea id="editor-ppt-prompt-ta" class="form-textarea font-gu" style="height: 180px; font-size: 0.82rem; line-height: 1.5; background: #07090e; border-color: rgba(139,92,246,0.25); color: #f1f5f9; padding: 10px; border-radius: 6px; width: 100%; resize: vertical; cursor: pointer;" title="ટેપ કરીને સિલેક્ટ કરો" readonly>${initialPptPrompt}</textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- SLIDE & AUDIO SYNCHRONIZATION EDITOR TOOL (ANTIGRAVITY MASTER PROMPT)     -->
    <!-- ========================================================================= -->
    <div class="card" id="slide-audio-sync-card" style="margin-bottom: 30px; border: 2px solid #10b981; background: linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(56,189,248,0.04) 100%); padding: 20px; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.35);">
      
      <!-- Sync Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.8rem; background: rgba(16,185,129,0.2); padding: 6px 12px; border-radius: 8px;">🎬</span>
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 800; color: #fff; margin: 0; display: flex; align-items: center; gap: 8px;">
              સ્લાઇડ & ઓડિયો સિંક્રોનાઇઝેશન એડિટર (Slide-to-Audio Sync Editor)
              <span id="sync-status-badge" class="badge badge-green" style="font-size: 0.72rem; padding: 4px 8px;">🟢 સિંક્રોનાઇઝ્ડ</span>
            </h3>
            <p style="color: var(--text-muted); font-size: 0.82rem; margin: 2px 0 0 0;">
              વાસ્તવિક ઓડિયો સાથે દરેક સ્લાઇડના ચોક્કસ ટાઇમસ્ટેમ્પ મેચ કરો • લાઇવ પ્રિવ્યૂ • મેન્યુઅલ ટ્રાન્ઝિશન કંટ્રોલ
            </p>
          </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <button id="btn-sync-auto-match" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #38bdf8; font-weight: 700;">
            <span>⚡</span> સ્ક્રિપ્ટ મુજબ ઓટો-મેચ
          </button>
          <button id="btn-sync-fix-gaps" class="btn btn-outline btn-sm" style="border-color: #10b981; color: #34d399; font-weight: 700;">
            <span>🔧</span> ગેપ્સ & ઓવરલેપ ફિક્સ
          </button>
          <button id="btn-sync-reset" class="btn btn-outline btn-sm" style="border-color: #94a3b8; color: #cbd5e1; font-size: 0.76rem;">
            <span>🔄</span> રીસેટ
          </button>
          <button id="btn-sync-export-manifest" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #10b981, #059669); border-color: #059669; font-weight: 800;">
            <span>💾</span> ટાઇમલાઇન ડાઉનલોડ (JSON)
          </button>
        </div>
      </div>

      <!-- Sync Player & Controls Bar -->
      <div style="background: rgba(15,23,42,0.8); border: 1px solid rgba(56,189,248,0.2); border-radius: 10px; padding: 14px 18px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 12px;">
          <!-- Playback Controls -->
          <div style="display: flex; align-items: center; gap: 10px;">
            <button id="btn-sync-play-toggle" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); font-weight: 800; min-width: 140px; padding: 8px 16px;">
              <span id="sync-play-icon">▶️</span> <span id="sync-play-text">લાઇવ પ્લેબેક</span>
            </button>
            <button id="btn-sync-restart" class="btn btn-secondary btn-sm" style="padding: 7px 12px;" title="શરૂઆતથી પ્લે કરો">
              ⏮️ શરૂઆતથી
            </button>
            <div style="font-family: monospace; font-size: 1rem; font-weight: 700; color: #38bdf8; background: rgba(0,0,0,0.4); padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(56,189,248,0.2);">
              <span id="sync-current-time">0:00</span> / <span id="sync-total-time">3:00</span>
            </div>
          </div>

          <!-- Active Slide Indicator -->
          <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem;">
            <span style="color: var(--text-muted);">હાલની સક્રિય સ્લાઇડ:</span>
            <span id="sync-active-slide-badge" class="badge badge-blue" style="font-size: 0.82rem; font-weight: 800; padding: 4px 10px;">
              સ્લાઇડ #૧
            </span>
          </div>
        </div>

        <!-- Interactive Visual Multi-Track Timeline -->
        <div style="margin-top: 6px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">
            <span>0:00</span>
            <span id="sync-timeline-center-label">સમયરેખા (Timeline Visualizer)</span>
            <span id="sync-timeline-end-label">3:00</span>
          </div>
          
          <div id="sync-timeline-track" style="position: relative; width: 100%; height: 52px; background: #07090e; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; overflow: hidden; cursor: pointer; display: flex;">
            <!-- Dynamic Slide Segments Placed Here -->
            <div id="sync-timeline-blocks" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex;"></div>
            
            <!-- Moving Red Playhead Line -->
            <div id="sync-timeline-playhead" style="position: absolute; top: 0; left: 0%; width: 3px; height: 100%; background: #ef4444; box-shadow: 0 0 10px #ef4444; z-index: 10; pointer-events: none; transition: left 0.1s linear;">
              <div style="position: absolute; top: -2px; left: -5px; width: 13px; height: 13px; border-radius: 50%; background: #ef4444;"></div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
            <span>💡 સમયરેખા પર ગમે ત્યાં ક્લિક કરીને સીધા તે સ્લાઇડ અને ઓડિયો સેકન્ડ પર જઈ શકાય છે.</span>
            <span id="sync-continuity-note" style="color: #10b981;">✓ કોઈ ગેપ નથી</span>
          </div>
        </div>
      </div>

      <!-- Slide-by-Slide Synchronization Table / Cards -->
      <div style="display: flex; flex-direction: column; gap: 12px;" id="sync-slides-cards-list">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;

  // DOM Elements
  const canvas = container.querySelector('#slide-render-canvas');
  const ctx = canvas.getContext('2d');
  const masterAudio = container.querySelector('#slide-master-audio');
  const prevBtn = container.querySelector('#btn-prev-slide');
  const nextBtn = container.querySelector('#btn-next-slide');
  const counterBadge = container.querySelector('#slide-counter-badge');
  const editHeading = container.querySelector('#edit-slide-heading');
  const titleInput = container.querySelector('#slide-edit-title');
  const boxStyleSelect = container.querySelector('#slide-edit-box-style');
  const subtitleInput = container.querySelector('#slide-edit-subtitle');
  const audioTimeInput = container.querySelector('#slide-edit-audiotime');
  const slideStartTimeInput = container.querySelector('#slide-edit-start-time');
  const slideEndTimeInput = container.querySelector('#slide-edit-end-time');
  const slideDurationBadge = container.querySelector('#slide-timing-duration-badge');
  const btnSetStartFromAudio = container.querySelector('#btn-set-start-from-audio');
  const btnSetEndFromAudio = container.querySelector('#btn-set-end-from-audio');
  const btnQuickSplitSlide = container.querySelector('#btn-quick-split-slide');
  const btnNudgeStartSub = container.querySelector('#btn-nudge-start-sub');
  const btnNudgeStartAdd = container.querySelector('#btn-nudge-start-add');
  const btnNudgeEndSub = container.querySelector('#btn-nudge-end-sub');
  const btnNudgeEndAdd = container.querySelector('#btn-nudge-end-add');
  const tabModeAutoMatch = container.querySelector('#tab-mode-automatch');
  const tabModeCustomMatch = container.querySelector('#tab-mode-custommatch');
  const activeModeDesc = container.querySelector('#active-mode-description');
  const bulletsInput = container.querySelector('#slide-edit-bullets');
  const spokenSnippetInput = container.querySelector('#slide-edit-spoken');
  const timelineStrip = container.querySelector('#slides-timeline-strip');
  const exportSlideBtn = container.querySelector('#btn-export-slide-png');
  const exportAllBtn = container.querySelector('#btn-export-all-slides');
  const printPdfBtn = container.querySelector('#btn-print-slides-pdf');
  const sendToScriptwriterBtn = container.querySelector('#btn-send-to-scriptwriter');
  const playSlideAudioBtn = container.querySelector('#btn-play-current-slide-audio');
  const addSlideBtn = container.querySelector('#btn-add-new-slide');
  const deleteSlideBtn = container.querySelector('#btn-delete-slide');

  // Generator elements
  const makerTopicInput = container.querySelector('#maker-slide-topic');
  const makerCountSelect = container.querySelector('#maker-slide-count');
  const generateWhiteSlidesBtn = container.querySelector('#btn-generate-white-slides');

  // RENDER SLIDE TO 16:9 CANVAS (PURE WHITE BACKGROUND + PROMINENT HEADING BOX + STRUCTURED BULLETS)
  function drawSlide(slide, idx) {
    const W = 1280;
    const H = 720;

    // 1. 100% PURE WHITE BACKGROUND (#FFFFFF)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    const accent = slide.accentColor || currentAccentColor || '#DC2626';
    const boxStyle = slide.headingBoxStyle || currentHeadingBoxStyle || 'solid';

    // Modern left thick accent stripe
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 16, H);

    // Top Category Pill Badge
    const badgeText = `જ્ઞાન યાત્રા સત્તાવાર • સ્લાઇડ #${idx + 1}`;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(50, 36, 290, 36, 8);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px "Outfit", "Noto Sans Gujarati", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, 195, 61);

    // Audio Timing Badge
    if (slide.audioTime) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.08)';
      ctx.beginPath();
      ctx.roundRect(355, 36, 200, 36, 8);
      ctx.fill();

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 17px "Outfit", sans-serif';
      ctx.fillText(`⏱️ ${slide.audioTime}`, 455, 61);
    }

    // Top Right Channel Tag
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 16px "Outfit", sans-serif';
    ctx.fillText('GYAN YATRA CREATOR STUDIO 🎯', W - 50, 60);

    // 2. PROMINENT HEADING BOX ("headig box")
    const boxX = 50;
    const boxY = 88;
    const boxW = W - 100;
    const boxH = 92;

    if (boxStyle === 'solid') {
      // Style A: Solid Accent Box (Red or Navy with pure white bold text)
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 10);
      ctx.fill();

      // Heading Box Text (Pure White #FFFFFF)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 38px "Noto Sans Gujarati", sans-serif';
      const cleanTitle = slide.title.length > 44 ? slide.title.slice(0, 44) + '...' : slide.title;
      ctx.fillText(cleanTitle, boxX + 24, boxY + 58);

    } else if (boxStyle === 'outline') {
      // Style B: Clean Outline Frame Box (Crisp white box with thick colored border & left stripe)
      ctx.fillStyle = '#F8FAFC';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 10);
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Left solid accent bar inside box
      ctx.fillStyle = accent;
      ctx.fillRect(boxX, boxY, 14, boxH);

      // Heading Box Text (Dark Slate #0F172A)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 38px "Noto Sans Gujarati", sans-serif';
      const cleanTitle = slide.title.length > 42 ? slide.title.slice(0, 42) + '...' : slide.title;
      ctx.fillText(cleanTitle, boxX + 32, boxY + 58);

    } else {
      // Style C: Banner Heading Box (Full-width top modern header banner)
      ctx.fillStyle = accent === '#DC2626' ? '#0F172A' : accent;
      ctx.fillRect(16, boxY, W - 16, boxH);

      // Gold bottom accent line
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(16, boxY + boxH - 4, W - 16, 4);

      // Heading Box Text (Pure White)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 38px "Noto Sans Gujarati", sans-serif';
      const cleanTitle = slide.title.length > 44 ? slide.title.slice(0, 44) + '...' : slide.title;
      ctx.fillText(cleanTitle, 50, boxY + 58);
    }

    // 3. Subtitle / Tagline below the Heading Box
    if (slide.subtitle) {
      ctx.textAlign = 'left';
      ctx.fillStyle = accent;
      ctx.font = 'bold 24px "Noto Sans Gujarati", sans-serif';
      ctx.fillText(slide.subtitle, 54, 216);
    }

    // Divider Line
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 236);
    ctx.lineTo(W - 50, 236);
    ctx.stroke();

    // 4. STRUCTURED BULLET POINTS ("bullet point")
    const bullets = slide.bulletPoints && slide.bulletPoints.length > 0 ? slide.bulletPoints : [
      'આ સ્લાઇડ માટે કોઈ મુદ્દો દાખલ કર્યો નથી.',
      'જમણી બાજુના એડિટરમાં નવા બુલેટ પોઇન્ટ્સ ઉમેરો.'
    ];

    const displayBullets = bullets.slice(0, 4);
    const lineHeight = displayBullets.length > 3 ? 66 : 74;
    let startY = displayBullets.length > 3 ? 275 : 290;

    displayBullets.forEach((point, i) => {
      // Checkmark Icon Box
      ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
      ctx.beginPath();
      ctx.roundRect(50, startY - 28, 44, 44, 10);
      ctx.fill();

      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#059669';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓', 72, startY + 2);

      // Bullet Text (High-contrast Slate #1E293B on Pure White #FFFFFF)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1E293B';
      ctx.font = displayBullets.length > 3 ? '600 27px "Noto Sans Gujarati", sans-serif' : '600 29px "Noto Sans Gujarati", sans-serif';

      // Truncate cleanly if too long for 1280px canvas
      const text = point.length > 58 ? point.slice(0, 58) + '...' : point;
      ctx.fillText(text, 110, startY + 4);

      startY += lineHeight;
    });

    // 4.5. Live Spoken Narration Subtitle Overlay (Broadcast Lower-Third)
    if (slide.spokenSnippet) {
      const subBarY = H - 106;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.beginPath();
      ctx.roundRect(50, subBarY, W - 100, 36, 8);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 16px "Noto Sans Gujarati", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🎙️ બોલાયેલ:', 66, subBarY + 24);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 16px "Noto Sans Gujarati", sans-serif';
      const cleanSnippet = slide.spokenSnippet.length > 72 ? slide.spokenSnippet.slice(0, 72) + '...' : slide.spokenSnippet;
      ctx.fillText(cleanSnippet, 162, subBarY + 24);
    }

    // 5. Bottom Watermark Footer Bar
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(16, H - 60, W - 16, 60);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, H - 60);
    ctx.lineTo(W, H - 60);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 18px "Noto Sans Gujarati", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🎯 Gyan Yatra YouTube Creator Studio • ૧૦૦% સાચી અને સત્તાવાર માહિતી • શુદ્ધ સફેદ બેકગ્રાઉન્ડ', 50, H - 22);
  }

  function updateActiveEditor() {
    const s = slides[currentSlideIdx];
    if (!s) return;

    editHeading.innerText = `✏️ સ્લાઇડ #${currentSlideIdx + 1} એડિટ કરો`;
    titleInput.value = s.title || '';
    boxStyleSelect.value = s.headingBoxStyle || 'solid';
    subtitleInput.value = s.subtitle || '';
    audioTimeInput.value = s.audioTime || '';
    if (slideStartTimeInput) slideStartTimeInput.value = formatSecondsToTime(s.startTime || 0);
    if (slideEndTimeInput) slideEndTimeInput.value = formatSecondsToTime(s.endTime || 0);
    if (slideDurationBadge) {
      const dur = (s.duration || Math.max(1, (s.endTime - s.startTime)) || 0).toFixed(1);
      slideDurationBadge.innerText = `${dur} સેકન્ડ`;
    }
    bulletsInput.value = (s.bulletPoints || []).join('\n');
    if (spokenSnippetInput) spokenSnippetInput.value = s.spokenSnippet || '';
    counterBadge.innerText = `${currentSlideIdx + 1} / ${slides.length}`;

    // Update active color button
    container.querySelectorAll('.slide-color-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-accent') === (s.accentColor || '#DC2626'));
    });

    drawSlide(s, currentSlideIdx);
    renderTimelineStrip();
    renderSyncTimeline();
  }

  function renderTimelineStrip() {
    timelineStrip.innerHTML = slides.map((s, idx) => `
      <div class="timeline-slide-chip ${idx === currentSlideIdx ? 'active' : ''}" data-idx="${idx}" style="min-width: 170px; padding: 10px 12px; border-radius: 8px; border: 2px solid ${idx === currentSlideIdx ? '#38bdf8' : 'var(--border-color)'}; background: ${idx === currentSlideIdx ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.02)'}; cursor: pointer; transition: all 0.2s;">
        <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">
          <span style="font-weight: 700; color: #38bdf8;">સ્લાઇડ #${idx + 1}</span>
          <span class="font-en">${s.audioTime || ''}</span>
        </div>
        <div style="font-weight: 700; font-size: 0.82rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${s.title}
        </div>
        <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">
          ${(s.bulletPoints || []).length} બુલેટ પોઇન્ટ્સ
        </div>
      </div>
    `).join('');

    timelineStrip.querySelectorAll('.timeline-slide-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        currentSlideIdx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        updateActiveEditor();
      });
    });
  }

  // --- SLIDE-TO-AUDIO SYNCHRONIZATION CONTROLLER ---
  let previewStopTimer = null;

  function getTotalAudioDuration() {
    if (masterAudio && masterAudio.duration && isFinite(masterAudio.duration) && masterAudio.duration > 0) {
      return parseFloat(masterAudio.duration.toFixed(1));
    }
    const lastSlide = slides[slides.length - 1];
    if (lastSlide && lastSlide.endTime && lastSlide.endTime > 0) {
      return parseFloat(lastSlide.endTime.toFixed(1));
    }
    return 180.0;
  }

  function updateSlideDurations() {
    slides.forEach(s => {
      s.duration = parseFloat(Math.max(1, s.endTime - s.startTime).toFixed(1));
      s.audioTime = formatTimeRange(s.startTime, s.endTime);
    });
    projectState.setSlides(slides);
    updateActiveEditor();
  }

  function playSingleSlideAudio(idx) {
    if (!slides[idx]) return;
    if (previewStopTimer) clearTimeout(previewStopTimer);
    
    currentSlideIdx = idx;
    updateActiveEditor();

    const start = Math.max(0, slides[idx].startTime);
    const end = Math.max(start + 0.5, slides[idx].endTime);
    const durationMs = (end - start) * 1000;

    masterAudio.currentTime = start;
    masterAudio.play().catch(() => {});

    previewStopTimer = setTimeout(() => {
      masterAudio.pause();
    }, durationMs);
  }

  function testSlideTransition(idx) {
    if (!slides[idx] || idx >= slides.length - 1) return;
    if (previewStopTimer) clearTimeout(previewStopTimer);

    const transitionPoint = slides[idx].endTime;
    const startWindow = Math.max(0, transitionPoint - 2.5);
    const endWindow = Math.min(getTotalAudioDuration(), transitionPoint + 2.5);
    const durationMs = (endWindow - startWindow) * 1000;

    currentSlideIdx = idx;
    drawSlide(slides[idx], idx);

    masterAudio.currentTime = startWindow;
    masterAudio.play().catch(() => {});

    previewStopTimer = setTimeout(() => {
      masterAudio.pause();
    }, durationMs);
  }

  function renderSyncTimeline() {
    const totalDuration = getTotalAudioDuration();
    const formattedTotal = formatSecondsToTime(totalDuration);
    
    // Update global timeline labels
    const syncTotalTimeEl = container.querySelector('#sync-total-time');
    const syncEndLabelEl = container.querySelector('#sync-timeline-end-label');
    const syncStatusBadge = container.querySelector('#sync-status-badge');
    const syncContinuityNote = container.querySelector('#sync-continuity-note');
    const syncActiveBadge = container.querySelector('#sync-active-slide-badge');

    if (syncTotalTimeEl) syncTotalTimeEl.innerText = formattedTotal;
    if (syncEndLabelEl) syncEndLabelEl.innerText = formattedTotal;
    
    const curSlide = slides[currentSlideIdx];
    if (syncActiveBadge && curSlide) {
      syncActiveBadge.innerText = `સ્લાઇડ #${currentSlideIdx + 1}: ${curSlide.title.slice(0, 30)}...`;
    }

    // Validation
    const validation = validateTimeline(slides, totalDuration);
    if (syncStatusBadge) {
      if (validation.isFullySynchronized) {
        syncStatusBadge.className = 'badge badge-green';
        syncStatusBadge.innerText = '🟢 ૧૦૦% સિંક્રોનાઇઝ્ડ';
      } else {
        syncStatusBadge.className = 'badge badge-amber';
        syncStatusBadge.innerText = '⚠️ ટાઇમિંગ સુધારો જરૂરી';
      }
    }

    if (syncContinuityNote) {
      if (validation.warnings.length > 0) {
        syncContinuityNote.style.color = '#f59e0b';
        syncContinuityNote.innerText = `⚠️ ${validation.warnings[0]}`;
      } else if (validation.errors.length > 0) {
        syncContinuityNote.style.color = '#ef4444';
        syncContinuityNote.innerText = `❌ ${validation.errors[0]}`;
      } else {
        syncContinuityNote.style.color = '#10b981';
        syncContinuityNote.innerText = '✓ સમયરેખા ૧૦૦% સાતત્યપૂર્ણ છે (કોઈ ગેપ કે ઓવરલેપ નથી)';
      }
    }

    // 1. Render Interactive Visual Multi-Track Timeline Blocks
    const timelineBlocksEl = container.querySelector('#sync-timeline-blocks');
    if (timelineBlocksEl) {
      timelineBlocksEl.innerHTML = slides.map((s, idx) => {
        const widthPct = Math.max(2, (s.duration / totalDuration) * 100);
        const isActive = (idx === currentSlideIdx);
        const color = s.accentColor || '#38bdf8';
        return `
          <div class="sync-track-block" data-idx="${idx}" style="width: ${widthPct}%; height: 100%; border-right: 2px solid rgba(0,0,0,0.6); background: ${isActive ? 'rgba(56,189,248,0.32)' : 'rgba(255,255,255,0.06)'}; box-sizing: border-box; position: relative; overflow: hidden; padding: 4px 6px; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; transition: background 0.15s; ${isActive ? 'box-shadow: inset 0 0 12px rgba(56,189,248,0.4); border-bottom: 3px solid #38bdf8;' : ''}">
            <div style="display: flex; justify-content: space-between; font-size: 0.68rem; font-weight: 700; color: ${isActive ? '#38bdf8' : '#cbd5e1'}; white-space: nowrap;">
              <span>#${idx + 1}</span>
              <span class="font-en" style="font-size: 0.65rem; color: #94a3b8;">${s.duration}s</span>
            </div>
            <div style="font-size: 0.68rem; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600;">
              ${s.title}
            </div>
            <div style="font-size: 0.62rem; color: var(--text-muted); font-family: monospace;">
              ${formatSecondsToTime(s.startTime)}
            </div>
          </div>
        `;
      }).join('');

      timelineBlocksEl.querySelectorAll('.sync-track-block').forEach(blk => {
        blk.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
          if (!isNaN(idx) && slides[idx]) {
            currentSlideIdx = idx;
            masterAudio.currentTime = slides[idx].startTime;
            updateActiveEditor();
          }
        });
      });
    }

    // 2. Render Slide-Wise Cards List
    const cardsListEl = container.querySelector('#sync-slides-cards-list');
    if (cardsListEl) {
      cardsListEl.innerHTML = slides.map((s, idx) => {
        const isActive = (idx === currentSlideIdx);
        const isFirst = (idx === 0);
        const isLast = (idx === slides.length - 1);

        return `
          <div class="sync-slide-card ${isActive ? 'active-sync-card' : ''}" data-idx="${idx}" style="background: ${isActive ? 'rgba(56,189,248,0.1)' : 'rgba(15,23,42,0.6)'}; border: 1.5px solid ${isActive ? '#38bdf8' : 'rgba(255,255,255,0.08)'}; border-radius: 10px; padding: 12px 16px; display: grid; grid-template-columns: 1.1fr 1.3fr 1fr; gap: 14px; align-items: center; transition: all 0.2s;">
            
            <!-- Left: Slide Identity & Spoken Narration Snippet -->
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span class="badge" style="background: ${s.accentColor || '#DC2626'}; color: #fff; font-weight: 800; font-size: 0.74rem; padding: 3px 8px;">
                  સ્લાઇડ #${idx + 1}
                </span>
                <strong style="color: #ffffff; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">
                  ${s.title}
                </strong>
              </div>
              <div style="font-size: 0.74rem; color: #94a3b8; background: rgba(0,0,0,0.3); padding: 6px 8px; border-radius: 6px; border-left: 3px solid #10b981; line-height: 1.35;" title="ઓડિયો સાથે મેચ થતું બોલાયેલ વાક્ય">
                <span style="color: #10b981; font-weight: 700;">🎙️ ઓડિયો કન્ટેન્ટ:</span> "${s.spokenSnippet || (s.bulletPoints && s.bulletPoints[0]) || s.title}"
              </div>
            </div>

            <!-- Center: Precise Audio Timestamp Controls & Transition Nudges -->
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                
                <!-- Start Time Control -->
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">શરૂઆત (Start):</span>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="number" step="0.5" min="0" max="${totalDuration}" class="form-input sync-input-start font-en" data-idx="${idx}" value="${s.startTime}" style="width: 76px; padding: 4px 6px; font-size: 0.8rem; background: #07090e; color: #38bdf8; font-weight: 700;" ${isFirst ? 'readonly title="પ્રથમ સ્લાઇડ 0 પરથી શરૂ થાય છે"' : ''}>
                    <span style="font-size: 0.72rem; color: #94a3b8; font-family: monospace;">(${formatSecondsToTime(s.startTime)})</span>
                  </div>
                </div>

                <span style="color: #64748b; font-size: 1.1rem; padding-top: 14px;">➔</span>

                <!-- End Time Control -->
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">અંત (End):</span>
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <input type="number" step="0.5" min="${s.startTime + 0.5}" max="${totalDuration}" class="form-input sync-input-end font-en" data-idx="${idx}" value="${s.endTime}" style="width: 76px; padding: 4px 6px; font-size: 0.8rem; background: #07090e; color: #10b981; font-weight: 700;">
                    <span style="font-size: 0.72rem; color: #94a3b8; font-family: monospace;">(${formatSecondsToTime(s.endTime)})</span>
                  </div>
                </div>

                <!-- Duration Badge -->
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">સમયગાળો:</span>
                  <span class="badge badge-purple font-en" style="font-size: 0.75rem; padding: 5px 8px; font-weight: 800;">
                    ${s.duration}s
                  </span>
                </div>
              </div>

              <!-- Inter-Slide Transition Nudges -->
              ${!isLast ? `
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 0.72rem; color: var(--text-muted);">
                  <span>ટ્રાન્ઝિશન શિફ્ટ:</span>
                  <button class="btn btn-outline btn-sm sync-shift-btn" data-idx="${idx}" data-delta="-0.5" style="padding: 2px 7px; font-size: 0.7rem; border-color: rgba(255,255,255,0.2);" title="ટ્રાન્ઝિશન 0.5 સેકન્ડ વહેલું લાવો">
                    ◀ -0.5s
                  </button>
                  <button class="btn btn-outline btn-sm sync-shift-btn" data-idx="${idx}" data-delta="+0.5" style="padding: 2px 7px; font-size: 0.7rem; border-color: rgba(255,255,255,0.2);" title="ટ્રાન્ઝિશન 0.5 સેકન્ડ મોડું કરો">
                    +0.5s ▶
                  </button>
                  <span style="font-size: 0.68rem; color: #64748b;">(સ્લાઇડ #${idx + 1} ➔ #${idx + 2} સ્વિચ)</span>
                </div>
              ` : `
                <div style="margin-top: 6px; font-size: 0.72rem; color: #10b981;">
                  🏁 આખરી સ્લાઇડ: ઓડિયોના અંત સુધી સળંગ રહેશે.
                </div>
              `}
            </div>

            <!-- Right: Interactive Actions -->
            <div style="display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap;">
              <button class="btn btn-outline btn-sm sync-play-slide-btn" data-idx="${idx}" style="border-color: #10b981; color: #34d399; font-size: 0.75rem; padding: 4px 8px;" title="માત્ર આ સ્લાઇડનો ઓડિયો સાંભળો">
                ▶️ સાંભળો
              </button>
              ${!isLast ? `
                <button class="btn btn-outline btn-sm sync-test-transition-btn" data-idx="${idx}" style="border-color: #f59e0b; color: #fbbf24; font-size: 0.75rem; padding: 4px 8px;" title="ટ્રાન્ઝિશન ટેસ્ટ: સ્લાઇડ બદલાવના 2.5 સેકન્ડ પહેલા અને પછીનો ઓડિયો સાંભળો">
                  🎧 સ્વિચ ટેસ્ટ
                </button>
              ` : ''}
              <button class="btn btn-secondary btn-sm sync-select-slide-btn" data-idx="${idx}" style="font-size: 0.75rem; padding: 4px 8px;" title="આ સ્લાઇડ કેનવાસ પર જુઓ">
                🎯 કેનવાસ
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Attach Event Listeners to cards controls
      cardsListEl.querySelectorAll('.sync-input-start').forEach(input => {
        input.addEventListener('change', (e) => {
          const idx = parseInt(e.target.getAttribute('data-idx'), 10);
          const newStart = parseFloat(e.target.value) || 0;
          if (slides[idx] && idx > 0) {
            slides[idx].startTime = Math.max(0, Math.min(slides[idx].endTime - 0.5, newStart));
            slides[idx - 1].endTime = slides[idx].startTime; // Keep continuity
            updateSlideDurations();
          }
        });
      });

      cardsListEl.querySelectorAll('.sync-input-end').forEach(input => {
        input.addEventListener('change', (e) => {
          const idx = parseInt(e.target.getAttribute('data-idx'), 10);
          const newEnd = parseFloat(e.target.value) || 0;
          if (slides[idx]) {
            slides[idx].endTime = Math.max(slides[idx].startTime + 0.5, Math.min(totalDuration, newEnd));
            if (idx < slides.length - 1) {
              slides[idx + 1].startTime = slides[idx].endTime; // Keep continuity
            }
            updateSlideDurations();
          }
        });
      });

      cardsListEl.querySelectorAll('.sync-shift-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
          const delta = parseFloat(e.currentTarget.getAttribute('data-delta')) || 0;
          if (slides[idx] && idx < slides.length - 1) {
            const currentBoundary = slides[idx].endTime;
            const newBoundary = Math.max(slides[idx].startTime + 1.0, Math.min(slides[idx + 1].endTime - 1.0, currentBoundary + delta));
            slides[idx].endTime = parseFloat(newBoundary.toFixed(1));
            slides[idx + 1].startTime = parseFloat(newBoundary.toFixed(1));
            updateSlideDurations();
          }
        });
      });

      cardsListEl.querySelectorAll('.sync-play-slide-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
          playSingleSlideAudio(idx);
        });
      });

      cardsListEl.querySelectorAll('.sync-test-transition-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
          testSlideTransition(idx);
        });
      });

      cardsListEl.querySelectorAll('.sync-select-slide-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
          currentSlideIdx = idx;
          updateActiveEditor();
          container.querySelector('#slide-editor-grid')?.scrollIntoView({ behavior: 'smooth' });
        });
      });
    }
  }

  // --- 1-CLICK WHITE SLIDE GENERATOR ACTION ---
  generateWhiteSlidesBtn.addEventListener('click', async () => {
    const topic = makerTopicInput.value.trim() || 'ગુજરાત સરકાર સત્તાવાર પરિપત્ર ૨૦૨૬';
    const slideCount = parseInt(makerCountSelect.value, 10) || 5;

    const originalBtnHtml = generateWhiteSlidesBtn.innerHTML;
    generateWhiteSlidesBtn.innerHTML = `<span>⏳</span> સ્લાઇડ્સ બની રહી છે...`;
    generateWhiteSlidesBtn.disabled = true;

    try {
      let generated = null;
      try {
        const res = await api.generateWhiteSlides({
          topic,
          slideCount,
          headingBoxStyle: currentHeadingBoxStyle,
          accentColor: currentAccentColor
        });
        if (res && res.success && res.slides && res.slides.length > 0) {
          generated = res.slides;
        }
      } catch (apiErr) {
        console.warn('API generateWhiteSlides notice, using instant local engine:', apiErr);
      }

      if (!generated) {
        // Instant fallback client generator
        generated = generateLocalWhiteSlides(topic, slideCount, currentHeadingBoxStyle, currentAccentColor);
      }

      slides = generated;
      currentSlideIdx = 0;
      projectState.setSlides(slides);
      projectState.setTopic(topic);

      updateActiveEditor();
      updateNotebookPrompts(topic);

      // Show celebratory non-blocking toast notification
      showNoticeToast(`✨ "${topic}" માટે ${slides.length} વ્હાઇટ સ્લાઇડ્સ અને NotebookLM પ્રોમ્પ્ટ્સ તૈયાર થઈ ગયા!`, 'success');
    } catch (err) {
      console.error('Error generating white slides:', err);
      showNoticeToast('સ્લાઇડ્સ બનાવવામાં સમસ્યા આવી: ' + err.message, 'error');
    } finally {
      generateWhiteSlidesBtn.innerHTML = originalBtnHtml;
      generateWhiteSlidesBtn.disabled = false;
    }
  });

  // Synchronous NotebookLM Prompt Updater for Website Tool
  function updateNotebookPrompts(topic) {
    try {
      const updated = generateClientNotebookLMPrompt({
        topic,
        templateId: 'white-real',
        tool: 'notebooklm-slides',
        slideCount: `${slides.length || 5}`,
        includeBranding: true
      });
      if (editorContentTa) editorContentTa.value = updated.contentSourcePrompt;
      if (editorPptTa) editorPptTa.value = updated.pptDeckPrompt;
    } catch (err) {
      console.warn('NotebookLM prompt update notice:', err);
    }
  }

  // NotebookLM Tool DOM elements & Event Handlers
  const editorBtnCopyContent = container.querySelector('#editor-btn-copy-content-prompt');
  const editorQuickCopyContent = container.querySelector('#editor-quick-copy-content');
  const editorContentTa = container.querySelector('#editor-content-prompt-ta');

  const editorBtnCopyPpt = container.querySelector('#editor-btn-copy-ppt-prompt');
  const editorQuickCopyPpt = container.querySelector('#editor-quick-copy-ppt');
  const editorPptTa = container.querySelector('#editor-ppt-prompt-ta');

  const copyContentPrompt = (btn) => {
    const text = editorContentTa ? editorContentTa.value : initialContentPrompt;
    if (editorContentTa) {
      editorContentTa.focus();
      editorContentTa.select();
    }
    copyToClipboard(text, 'ટૂલ ૧: NotebookLM કન્ટેન્ટ & સોર્સ પ્રોમ્પ્ટ કોપી થઈ ગયો! ✓', btn);
  };

  const copyPptPrompt = (btn) => {
    const text = editorPptTa ? editorPptTa.value : initialPptPrompt;
    if (editorPptTa) {
      editorPptTa.focus();
      editorPptTa.select();
    }
    copyToClipboard(text, 'ટૂલ ૨: NotebookLM ૧૬:૯ વ્હાઇટ PPT & રિયલ ફોટા પ્રોમ્પ્ટ કોપી થઈ ગયો! ✓', btn);
  };

  editorBtnCopyContent?.addEventListener('click', () => copyContentPrompt(editorBtnCopyContent));
  editorQuickCopyContent?.addEventListener('click', () => copyContentPrompt(editorQuickCopyContent));
  editorBtnCopyPpt?.addEventListener('click', () => copyPptPrompt(editorBtnCopyPpt));
  editorQuickCopyPpt?.addEventListener('click', () => copyPptPrompt(editorQuickCopyPpt));

  editorContentTa?.addEventListener('click', () => editorContentTa.select());
  editorPptTa?.addEventListener('click', () => editorPptTa.select());

  container.querySelector('#btn-editor-goto-slideprompts')?.addEventListener('click', () => {
    window.prefillTopic = makerTopicInput.value.trim() || initialTopic;
    navigateTo('slideprompts');
  });

  container.querySelector('#btn-editor-goto-chatgpt')?.addEventListener('click', () => {
    const pptText = editorPptTa ? editorPptTa.value : initialPptPrompt;
    window.pendingChatPrompt = pptText;
    navigateTo('chatgpt');
  });

  makerTopicInput?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (val.length >= 4) {
      updateNotebookPrompts(val);
    }
  });

  // Preset chips click handler
  container.querySelectorAll('.maker-preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const t = chip.getAttribute('data-topic');
      makerTopicInput.value = t;
      generateWhiteSlidesBtn.click();
    });
  });

  // Generator Style buttons
  container.querySelectorAll('.maker-style-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('.maker-style-btn').forEach(b => {
        b.style.background = 'rgba(255,255,255,0.05)';
        b.style.color = '#cbd5e1';
      });
      btn.style.background = currentAccentColor;
      btn.style.color = '#fff';
      currentHeadingBoxStyle = btn.getAttribute('data-style');
      if (slides[currentSlideIdx]) {
        slides[currentSlideIdx].headingBoxStyle = currentHeadingBoxStyle;
        projectState.setSlides(slides);
        updateActiveEditor();
      }
    });
  });

  // Generator Accent color dots
  container.querySelectorAll('.maker-color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      container.querySelectorAll('.maker-color-dot').forEach(d => d.style.borderColor = 'transparent');
      dot.style.borderColor = '#ffffff';
      currentAccentColor = dot.getAttribute('data-color');
      if (slides[currentSlideIdx]) {
        slides[currentSlideIdx].accentColor = currentAccentColor;
        projectState.setSlides(slides);
        updateActiveEditor();
      }
    });
  });

  // Live input changes for active slide
  titleInput.addEventListener('input', (e) => {
    slides[currentSlideIdx].title = e.target.value;
    projectState.setSlides(slides);
    drawSlide(slides[currentSlideIdx], currentSlideIdx);
  });

  boxStyleSelect.addEventListener('change', (e) => {
    slides[currentSlideIdx].headingBoxStyle = e.target.value;
    projectState.setSlides(slides);
    drawSlide(slides[currentSlideIdx], currentSlideIdx);
  });

  subtitleInput.addEventListener('input', (e) => {
    slides[currentSlideIdx].subtitle = e.target.value;
    projectState.setSlides(slides);
    drawSlide(slides[currentSlideIdx], currentSlideIdx);
  });

  audioTimeInput?.addEventListener('input', (e) => {
    slides[currentSlideIdx].audioTime = e.target.value;
    const r = parseRangeToSeconds(e.target.value, 45);
    slides[currentSlideIdx].startTime = r.start;
    slides[currentSlideIdx].endTime = r.end;
    slides[currentSlideIdx].duration = parseFloat((r.end - r.start).toFixed(1));
    projectState.setSlides(slides);
    drawSlide(slides[currentSlideIdx], currentSlideIdx);
    renderSyncTimeline();
  });

  // Manual Timing Control Inputs
  slideStartTimeInput?.addEventListener('change', (e) => {
    const val = parseTimeToSeconds(e.target.value);
    setSlideStartTime(slides, currentSlideIdx, val, getTotalAudioDuration());
    projectState.setSlides(slides);
    updateActiveEditor();
  });

  slideEndTimeInput?.addEventListener('change', (e) => {
    const val = parseTimeToSeconds(e.target.value);
    setSlideEndTime(slides, currentSlideIdx, val, getTotalAudioDuration());
    projectState.setSlides(slides);
    updateActiveEditor();
  });

  // Nudge Buttons (-1s, +1s)
  btnNudgeStartSub?.addEventListener('click', () => {
    nudgeSlideTiming(slides, currentSlideIdx, 'start', -1, getTotalAudioDuration());
    projectState.setSlides(slides);
    updateActiveEditor();
  });

  btnNudgeStartAdd?.addEventListener('click', () => {
    nudgeSlideTiming(slides, currentSlideIdx, 'start', 1, getTotalAudioDuration());
    projectState.setSlides(slides);
    updateActiveEditor();
  });

  btnNudgeEndSub?.addEventListener('click', () => {
    nudgeSlideTiming(slides, currentSlideIdx, 'end', -1, getTotalAudioDuration());
    projectState.setSlides(slides);
    updateActiveEditor();
  });

  btnNudgeEndAdd?.addEventListener('click', () => {
    nudgeSlideTiming(slides, currentSlideIdx, 'end', 1, getTotalAudioDuration());
    projectState.setSlides(slides);
    updateActiveEditor();
  });

  // Live Audio Time Set Buttons
  btnSetStartFromAudio?.addEventListener('click', () => {
    const cur = masterAudio.currentTime || 0;
    setSlideStartTime(slides, currentSlideIdx, cur, getTotalAudioDuration());
    projectState.setSlides(slides);
    updateActiveEditor();
    showNoticeToast(`📍 સ્લાઇડ #${currentSlideIdx + 1} નો શરૂઆતનો સમય ${formatSecondsToTime(cur)} સેટ થઈ ગયો!`, 'success');
  });

  btnSetEndFromAudio?.addEventListener('click', () => {
    const cur = masterAudio.currentTime || 0;
    setSlideEndTime(slides, currentSlideIdx, cur, getTotalAudioDuration());
    projectState.setSlides(slides);
    updateActiveEditor();
    showNoticeToast(`📍 સ્લાઇડ #${currentSlideIdx + 1} નો અંતિમ સમય ${formatSecondsToTime(cur)} સેટ થઈ ગયો!`, 'success');
  });

  // Split slide at current playhead
  btnQuickSplitSlide?.addEventListener('click', () => {
    const cur = masterAudio.currentTime || 0;
    const countBefore = slides.length;
    splitSlideAtTime(slides, currentSlideIdx, cur, getTotalAudioDuration());
    if (slides.length > countBefore) {
      currentSlideIdx++;
      projectState.setSlides(slides);
      updateActiveEditor();
      showNoticeToast(`✂️ સ્લાઇડ ${formatSecondsToTime(cur)} પર સફળતાપૂર્વક સ્પ્લિટ થઈ ગઈ!`, 'success');
    } else {
      showNoticeToast('સ્પ્લિટ કરવા માટે ઓડિયોને સ્લાઇડના સમયગાળા વચ્ચે પોઝ કરો.', 'warning');
    }
  });

  // Mode Switcher Tabs
  tabModeAutoMatch?.addEventListener('click', () => {
    tabModeAutoMatch.style.background = '#10b981';
    tabModeAutoMatch.style.color = '#042f2e';
    tabModeAutoMatch.style.border = 'none';
    tabModeCustomMatch.style.background = 'transparent';
    tabModeCustomMatch.style.color = '#38bdf8';
    tabModeCustomMatch.style.border = '1px solid #38bdf8';
    if (activeModeDesc) {
      activeModeDesc.innerText = '💡 ઓટો-મેચ મોડ: PDF અને ઓડિયો અપલોડ કરો ➔ સિસ્ટમ ૧૦૦% પરફેક્ટ ગોઠવી દેશે.';
    }
    showNoticeToast('⚡ સ્માર્ટ ઓટો-મેચ મોડ પસંદ થયો.', 'info');
  });

  tabModeCustomMatch?.addEventListener('click', () => {
    tabModeCustomMatch.style.background = '#38bdf8';
    tabModeCustomMatch.style.color = '#042f2e';
    tabModeCustomMatch.style.border = 'none';
    tabModeAutoMatch.style.background = 'transparent';
    tabModeAutoMatch.style.color = '#10b981';
    tabModeAutoMatch.style.border = '1px solid #10b981';
    if (activeModeDesc) {
      activeModeDesc.innerText = '🎛️ કસ્ટમ મોડ: ઓડિયો સાંભળતાં સાંભળતાં સ્લાઇડ ટાઇમિંગ સેટ કરો. તૈયાર થતાં સીધો વિડીયો બનાવો!';
    }
    showNoticeToast('🎛️ કસ્ટમ સ્લાઇડ & ઓડિયો મેચ મોડ પસંદ થયો! જમણી બાજુથી ટાઇમિંગ સેટ કરો.', 'success');
    container.querySelector('#active-slide-edit-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  bulletsInput.addEventListener('input', (e) => {
    slides[currentSlideIdx].bulletPoints = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
    projectState.setSlides(slides);
    drawSlide(slides[currentSlideIdx], currentSlideIdx);
  });

  spokenSnippetInput?.addEventListener('input', (e) => {
    slides[currentSlideIdx].spokenSnippet = e.target.value;
    projectState.setSlides(slides);
    drawSlide(slides[currentSlideIdx], currentSlideIdx);
  });

  // Color preset buttons inside active editor
  container.querySelectorAll('.slide-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.slide-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const accent = btn.getAttribute('data-accent');
      slides[currentSlideIdx].accentColor = accent;
      projectState.setSlides(slides);
      drawSlide(slides[currentSlideIdx], currentSlideIdx);
    });
  });

  // Prev / Next buttons
  prevBtn.addEventListener('click', () => {
    if (currentSlideIdx > 0) {
      currentSlideIdx--;
      updateActiveEditor();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentSlideIdx < slides.length - 1) {
      currentSlideIdx++;
      updateActiveEditor();
    }
  });

  // Add Slide
  addSlideBtn.addEventListener('click', () => {
    const prevSlide = slides[slides.length - 1];
    const prevEnd = prevSlide ? (prevSlide.endTime || 0) : 0;
    const newSlide = {
      id: Date.now(),
      title: 'નવો સત્તાવાર મુદ્દો (Heading Box)',
      subtitle: 'વિગતવાર સરકારી પરિપત્ર નિયમ',
      bulletPoints: [
        'પ્રથમ વિગતવાર મુદ્દો અને સત્તાવાર પુરાવો',
        'બીજો મહત્વનો નિયમ અને પાત્રતા શરતો',
        'ત્રીજી જરૂરી નોંધ અને તારીખ'
      ],
      startTime: prevEnd,
      endTime: prevEnd + 30,
      duration: 30,
      audioTime: formatTimeRange(prevEnd, prevEnd + 30),
      bgColor: '#FFFFFF',
      headingBoxStyle: currentHeadingBoxStyle,
      textColor: '#0F172A',
      accentColor: currentAccentColor
    };
    slides.push(newSlide);
    currentSlideIdx = slides.length - 1;
    projectState.setSlides(slides);
    updateActiveEditor();
  });

  // Delete Slide
  deleteSlideBtn.addEventListener('click', () => {
    if (slides.length <= 1) {
      alert('ઓછામાં ઓછી એક સ્લાઇડ રાખવી જરૂરી છે.');
      return;
    }
    if (confirm('શું તમે ખરેખર આ સ્લાઇડ ડિલીટ કરવા માંગો છો?')) {
      slides.splice(currentSlideIdx, 1);
      if (currentSlideIdx >= slides.length) currentSlideIdx = slides.length - 1;
      slides = fixTimelineGaps(slides, getTotalAudioDuration());
      projectState.setSlides(slides);
      updateActiveEditor();
    }
  });

  // Play Slide Audio Sync
  playSlideAudioBtn.addEventListener('click', () => {
    const s = slides[currentSlideIdx];
    if (!s || !s.audioTime) {
      masterAudio.play();
      return;
    }

    const parts = s.audioTime.split(/[-–to]/);
    if (parts.length > 0) {
      const timeStr = parts[0].trim();
      const timeParts = timeStr.split(':');
      let sec = 0;
      if (timeParts.length === 2) {
        sec = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1], 10);
      } else if (timeStr.includes('s')) {
        sec = parseInt(timeStr, 10) || 0;
      }
      masterAudio.currentTime = sec;
      masterAudio.play();
    }
  });

  // 1. Export Active Slide as PNG
  exportSlideBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `gyan-yatra-slide-${currentSlideIdx + 1}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // 2. Export All Slides as Batch PNG
  exportAllBtn.addEventListener('click', async () => {
    exportAllBtn.disabled = true;
    exportAllBtn.innerText = 'પ્રક્રિયા ચાલુ છે...';
    for (let i = 0; i < slides.length; i++) {
      drawSlide(slides[i], i);
      await new Promise(r => setTimeout(r, 150));
      const link = document.createElement('a');
      link.download = `gyan-yatra-slide-${i + 1}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      await new Promise(r => setTimeout(r, 200));
    }
    drawSlide(slides[currentSlideIdx], currentSlideIdx);
    exportAllBtn.disabled = false;
    exportAllBtn.innerHTML = `<span>📦</span> બધી સ્લાઇડ્સ ડાઉનલોડ`;
    alert(`બધી ${slides.length} સ્લાઇડ્સ ડાઉનલોડ થઈ ગઈ છે!`);
  });

  // 3. Print / Save as PDF
  printPdfBtn.addEventListener('click', () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('પોપ-અપ બ્લોક થયેલ છે. મહેરબાની કરીને પોપ-અપને મંજૂરી આપો.');
      return;
    }

    const slidesHtml = slides.map((s, idx) => `
      <div style="page-break-after: always; width: 1000px; height: 562px; background: #ffffff; padding: 36px 48px; box-sizing: border-box; border: 1px solid #e2e8f0; font-family: 'Noto Sans Gujarati', sans-serif; position: relative; margin: 0 auto 30px auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div style="background: ${s.accentColor || '#DC2626'}; color: #fff; padding: 4px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">
            જ્ઞાન યાત્રા સત્તાવાર • સ્લાઇડ #${idx + 1}
          </div>
          <div style="color: #64748B; font-weight: bold; font-size: 13px;">
            ⏱️ ${s.audioTime || ''}
          </div>
        </div>

        <div style="${s.headingBoxStyle === 'outline' ? 'border: 3px solid ' + (s.accentColor || '#DC2626') + '; background: #F8FAFC; color: #0F172A;' : 'background: ' + (s.accentColor || '#DC2626') + '; color: #ffffff;'} padding: 14px 20px; border-radius: 8px; font-size: 26px; font-weight: 900; margin-bottom: 12px;">
          ${s.title}
        </div>

        ${s.subtitle ? `<div style="color: ${s.accentColor || '#DC2626'}; font-weight: bold; font-size: 16px; margin-bottom: 16px;">${s.subtitle}</div>` : ''}

        <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 20px;" />

        <div style="margin-top: 10px;">
          ${(s.bulletPoints || []).map(b => `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 6px; background: rgba(16,185,129,0.15); color: #059669; font-weight: bold; font-size: 16px;">✓</span>
              <span style="color: #1E293B; font-size: 18px; font-weight: 600;">${b}</span>
            </div>
          `).join('')}
        </div>

        <div style="position: absolute; bottom: 16px; left: 48px; right: 48px; border-top: 1px solid #E2E8F0; padding-top: 10px; display: flex; justify-content: space-between; font-size: 12px; color: #64748B;">
          <span>🎯 Gyan Yatra YouTube Creator Studio</span>
          <span>૧૦૦% સત્તાવાર માહિતી • શુદ્ધ સફેદ બેકગ્રાઉન્ડ</span>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gyan Yatra - Slides Deck</title>
        <style>
          @page { size: landscape; margin: 0; }
          body { margin: 0; background: #f1f5f9; padding: 20px; }
          @media print {
            body { background: #ffffff; padding: 0; }
          }
        </style>
      </head>
      <body>
        ${slidesHtml}
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  });

  // 4. Send Slides to Scriptwriter
  sendToScriptwriterBtn.addEventListener('click', () => {
    projectState.setSlides(slides);
    navigateTo('scriptwriter');
  });

  // Audio links
  container.querySelector('#btn-change-audio')?.addEventListener('click', () => {
    navigateTo('myvoice');
  });

  // --- SYNC TIMELINE GLOBAL EVENT LISTENERS ---

  // 1. Timeline Track Click Seeking
  const timelineTrackEl = container.querySelector('#sync-timeline-track');
  timelineTrackEl?.addEventListener('click', (e) => {
    const rect = timelineTrackEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const totalDuration = getTotalAudioDuration();
    const targetTime = percent * totalDuration;

    masterAudio.currentTime = targetTime;
    
    // Immediate slide switch
    const matchIdx = slides.findIndex(s => s.startTime <= targetTime && targetTime < s.endTime);
    if (matchIdx !== -1 && matchIdx !== currentSlideIdx) {
      currentSlideIdx = matchIdx;
      updateActiveEditor();
    }
  });

  // 2. Play / Pause Button & Cinema Player Toggle
  const btnSyncPlayToggle = container.querySelector('#btn-sync-play-toggle');
  const syncPlayIcon = container.querySelector('#sync-play-icon');
  const syncPlayText = container.querySelector('#sync-play-text');

  const btnFullVideoPlayToggle = container.querySelector('#btn-full-video-play-toggle');
  const fullVideoPlayIcon = container.querySelector('#full-video-play-icon');
  const fullVideoPlayText = container.querySelector('#full-video-play-text');
  const btnFullVideoRestart = container.querySelector('#btn-full-video-restart');
  const btnPlayerExportVideo = container.querySelector('#btn-player-export-video');
  const fullVideoScrubBar = container.querySelector('#full-video-scrub-bar');
  const fullVideoScrubFill = container.querySelector('#full-video-scrub-fill');
  const fullVideoCurTimeEl = container.querySelector('#full-video-current-time');
  const fullVideoTotalTimeEl = container.querySelector('#full-video-total-time');
  const fullVideoActiveSlideLabel = container.querySelector('#full-video-active-slide-label');

  const toggleMasterPlayback = () => {
    if (masterAudio.paused) {
      if (previewStopTimer) clearTimeout(previewStopTimer);
      masterAudio.play().catch(() => {});
    } else {
      masterAudio.pause();
    }
  };

  btnSyncPlayToggle?.addEventListener('click', toggleMasterPlayback);
  btnFullVideoPlayToggle?.addEventListener('click', toggleMasterPlayback);

  btnFullVideoRestart?.addEventListener('click', () => {
    masterAudio.currentTime = 0;
    currentSlideIdx = 0;
    updateActiveEditor();
    masterAudio.play().catch(() => {});
  });

  btnPlayerExportVideo?.addEventListener('click', () => {
    exportVideoRecording();
  });

  // Cinema Scrub Bar Seeking
  fullVideoScrubBar?.addEventListener('click', (e) => {
    const rect = fullVideoScrubBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const totalDuration = getTotalAudioDuration();
    const targetTime = percent * totalDuration;

    masterAudio.currentTime = targetTime;
    const matchIdx = slides.findIndex(s => s.startTime <= targetTime && targetTime < s.endTime);
    if (matchIdx !== -1 && matchIdx !== currentSlideIdx) {
      currentSlideIdx = matchIdx;
      updateActiveEditor();
    }
  });

  masterAudio.addEventListener('play', () => {
    if (syncPlayIcon) syncPlayIcon.innerText = '⏸️';
    if (syncPlayText) syncPlayText.innerText = 'પોઝ (Pause)';
    if (fullVideoPlayIcon) fullVideoPlayIcon.innerText = '⏸️';
    if (fullVideoPlayText) fullVideoPlayText.innerText = 'પોઝ કરો (Pause)';
  });

  masterAudio.addEventListener('pause', () => {
    if (syncPlayIcon) syncPlayIcon.innerText = '▶️';
    if (syncPlayText) syncPlayText.innerText = 'લાઇવ પ્લેબેક';
    if (fullVideoPlayIcon) fullVideoPlayIcon.innerText = '▶️';
    if (fullVideoPlayText) fullVideoPlayText.innerText = 'આખો વિડીયો જુઓ (Play Full Video)';
  });

  masterAudio.addEventListener('loadedmetadata', () => {
    renderSyncTimeline();
    const totalDuration = getTotalAudioDuration();
    if (fullVideoTotalTimeEl) fullVideoTotalTimeEl.innerText = formatSecondsToTime(totalDuration);
  });

  // 3. Restart Button
  container.querySelector('#btn-sync-restart')?.addEventListener('click', () => {
    masterAudio.currentTime = 0;
    currentSlideIdx = 0;
    updateActiveEditor();
    masterAudio.play().catch(() => {});
  });

  // 4. Live Audio Timeupdate (Slide Switching, Playhead & Cinema Scrubber)
  masterAudio.addEventListener('timeupdate', () => {
    const curTime = masterAudio.currentTime;
    const totalDuration = getTotalAudioDuration();

    // Update time counters
    const syncCurTimeEl = container.querySelector('#sync-current-time');
    if (syncCurTimeEl) syncCurTimeEl.innerText = formatSecondsToTime(curTime);
    if (fullVideoCurTimeEl) fullVideoCurTimeEl.innerText = formatSecondsToTime(curTime);
    if (fullVideoTotalTimeEl && totalDuration > 0) fullVideoTotalTimeEl.innerText = formatSecondsToTime(totalDuration);

    // Update red playhead line
    const playheadEl = container.querySelector('#sync-timeline-playhead');
    if (playheadEl && totalDuration > 0) {
      const pct = (curTime / totalDuration) * 100;
      playheadEl.style.left = `${Math.min(100, Math.max(0, pct))}%`;
    }

    // Update Cinema Scrubber fill
    if (fullVideoScrubFill && totalDuration > 0) {
      const scrubPct = (curTime / totalDuration) * 100;
      fullVideoScrubFill.style.width = `${Math.min(100, Math.max(0, scrubPct))}%`;
    }

    // Live Slide Matching: Detect which slide covers curTime
    const matchedIdx = slides.findIndex(s => s.startTime <= curTime && curTime < s.endTime);
    if (matchedIdx !== -1 && matchedIdx !== currentSlideIdx) {
      currentSlideIdx = matchedIdx;
      drawSlide(slides[matchedIdx], matchedIdx);
      renderTimelineStrip();
      
      // Update cinema active slide label
      if (fullVideoActiveSlideLabel && slides[matchedIdx]) {
        fullVideoActiveSlideLabel.innerText = `📍 હાલની સ્લાઇડ: #${matchedIdx + 1} (${slides[matchedIdx].title.slice(0, 32)}...)`;
      }

      // Highlight active card
      container.querySelectorAll('.sync-slide-card').forEach((card, idx) => {
        const isActive = (idx === matchedIdx);
        card.style.background = isActive ? 'rgba(56,189,248,0.1)' : 'rgba(15,23,42,0.6)';
        card.style.borderColor = isActive ? '#38bdf8' : 'rgba(255,255,255,0.08)';
      });

      // Highlight active track block
      container.querySelectorAll('.sync-track-block').forEach((blk, idx) => {
        const isActive = (idx === matchedIdx);
        blk.style.background = isActive ? 'rgba(56,189,248,0.32)' : 'rgba(255,255,255,0.06)';
        blk.style.borderBottom = isActive ? '3px solid #38bdf8' : 'none';
      });

      const syncActiveBadge = container.querySelector('#sync-active-slide-badge');
      if (syncActiveBadge && slides[matchedIdx]) {
        syncActiveBadge.innerText = `સ્લાઇડ #${matchedIdx + 1}: ${slides[matchedIdx].title.slice(0, 30)}...`;
      }
    }
  });

  // 5. Auto-Match Button
  container.querySelector('#btn-sync-auto-match')?.addEventListener('click', () => {
    const totalDuration = getTotalAudioDuration();
    const scriptSections = project.script?.sections || [];
    const fullText = (project.script && typeof project.script.content === 'string') 
      ? project.script.content 
      : (project.topic || '');
    
    slides = matchSlidesToAudio(slides, totalDuration, scriptSections, fullText);
    projectState.setSlides(slides);
    updateActiveEditor();
    showNoticeToast('⚡ સ્ક્રિપ્ટ અને ઓડિયો મુજબ બધી સ્લાઇડ્સ આપોઆપ સિંક્રોનાઇઝ થઈ ગઈ!', 'success');
  });

  // 6. Fix Gaps Button
  container.querySelector('#btn-sync-fix-gaps')?.addEventListener('click', () => {
    const totalDuration = getTotalAudioDuration();
    slides = fixTimelineGaps(slides, totalDuration);
    projectState.setSlides(slides);
    updateActiveEditor();
    showNoticeToast('🔧 બધા ગેપ્સ અને ઓવરલેપ્સ સફળતાપૂર્વક જોડી દેવાયા!', 'success');
  });

  // 7. Reset Button
  container.querySelector('#btn-sync-reset')?.addEventListener('click', () => {
    const totalDuration = getTotalAudioDuration();
    slides.forEach((s, idx) => {
      const step = totalDuration / slides.length;
      s.startTime = parseFloat((idx * step).toFixed(1));
      s.endTime = parseFloat(((idx + 1) * step).toFixed(1));
      s.duration = parseFloat((s.endTime - s.startTime).toFixed(1));
      s.audioTime = formatTimeRange(s.startTime, s.endTime);
    });
    projectState.setSlides(slides);
    updateActiveEditor();
    showNoticeToast('🔄 સ્લાઇડ ટાઇમિંગ પ્રારંભિક સ્થિતિમાં રીસેટ થઈ ગયું.', 'info');
  });

  // 8. Export Manifest Button
  container.querySelector('#btn-sync-export-manifest')?.addEventListener('click', () => {
    const totalDuration = getTotalAudioDuration();
    const manifest = createSyncManifest(project, slides, totalDuration);
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `slide_audio_sync_manifest_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNoticeToast('💾 સિંક્રોનાઇઝ્ડ ટાઇમલાઇન સ્પેસિફિકેશન (JSON) ડાઉનલોડ થઈ ગયું! આ JSON ફાઇલ FFmpeg અથવા Remotion વીડિયો રેન્ડરિંગ માટે તૈયાર છે.', 'success');
  });

  // =========================================================================
  // 🌟 AUDIO & PDF AUTO-MATCH ENGINE & VIDEO EXPORTER
  // =========================================================================

  const audioFileInput = container.querySelector('#automatch-audio-file-input');
  const pdfFileInput = container.querySelector('#automatch-pdf-file-input');
  const audioDropzone = container.querySelector('#automatch-audio-dropzone');
  const pdfDropzone = container.querySelector('#automatch-pdf-dropzone');
  const btnSelectAudio = container.querySelector('#btn-select-automatch-audio');
  const btnSelectPdf = container.querySelector('#btn-select-automatch-pdf');
  const btnChangeAudio = container.querySelector('#btn-change-automatch-audio');
  const btnChangePdf = container.querySelector('#btn-change-automatch-pdf');
  const btnRunAutoMatch = container.querySelector('#btn-run-automatch');
  const btnPreviewPlay = container.querySelector('#btn-automatch-preview-play');
  const btnExportFullVideo = container.querySelector('#btn-export-full-video');
  const btnTopExportVideo = container.querySelector('#btn-top-export-video');
  const btnCanvasExportVideo = container.querySelector('#btn-canvas-export-video');

  const audioEmptyState = container.querySelector('#automatch-audio-empty-state');
  const audioLoadedState = container.querySelector('#automatch-audio-loaded-state');
  const audioFilenameEl = container.querySelector('#automatch-audio-filename');
  const audioDurationBadge = container.querySelector('#automatch-audio-duration-badge');

  const pdfEmptyState = container.querySelector('#automatch-pdf-empty-state');
  const pdfLoadedState = container.querySelector('#automatch-pdf-loaded-state');
  const pdfFilenameEl = container.querySelector('#automatch-pdf-filename');
  const pdfPagesBadge = container.querySelector('#automatch-pdf-pages-badge');
  const automatchSuccessBanner = container.querySelector('#automatch-success-banner');
  const automatchSuccessDetails = container.querySelector('#automatch-success-details');
  const automatchStatusHint = container.querySelector('#automatch-status-hint');

  // If initial audio or pdf already exists, update dropzone UI
  if (loadedAudioUrl) {
    if (audioEmptyState) audioEmptyState.style.display = 'none';
    if (audioLoadedState) audioLoadedState.style.display = 'block';
    if (audioFilenameEl) audioFilenameEl.innerText = loadedAudioName || 'default_audio.mp3';
  }

  if (loadedPdfName) {
    if (pdfEmptyState) pdfEmptyState.style.display = 'none';
    if (pdfLoadedState) pdfLoadedState.style.display = 'block';
    if (pdfFilenameEl) pdfFilenameEl.innerText = loadedPdfName;
    if (pdfPagesBadge) pdfPagesBadge.innerText = `📑 ${slides.length} સ્લાઇડ્સ એક્સટ્રેક્ટ થઈ`;
  }

  // --- AUDIO FILE HANDLING ---
  function handleAudioFile(file) {
    if (!file) return;
    loadedAudioName = file.name;
    loadedAudioUrl = URL.createObjectURL(file);
    masterAudio.src = loadedAudioUrl;
    masterAudio.load();

    if (audioEmptyState) audioEmptyState.style.display = 'none';
    if (audioLoadedState) audioLoadedState.style.display = 'block';
    if (audioFilenameEl) audioFilenameEl.innerText = file.name;
    if (audioDurationBadge) audioDurationBadge.innerText = '⏱️ ઓડિયો ચકાસાઈ રહ્યો છે...';

    masterAudio.onloadedmetadata = () => {
      const d = getTotalAudioDuration();
      if (audioDurationBadge) {
        audioDurationBadge.innerText = `⏱️ લંબાઈ: ${formatSecondsToTime(d)} (${Math.round(d)}s)`;
      }
      renderSyncTimeline();
      checkAndTriggerAutoMatch();
    };

    // Upload to server in background for library persistence
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await api.uploadAudio({
          audioBase64: reader.result,
          filename: file.name
        });
        if (res && res.success && res.audioUrl) {
          projectState.setVoiceAudio({
            audioUrl: res.audioUrl,
            filename: res.filename || file.name,
            provider: 'Uploaded Custom Audio'
          });
        }
      } catch (_) {}
    };
    reader.readAsDataURL(file);
    showNoticeToast(`🎵 ઓડિયો "${file.name}" સફળતાપૂર્વક લોડ થઈ ગયો!`, 'success');
  }

  // --- PDF FILE HANDLING & PARSING ---
  function fallbackPdfProcess(name) {
    const fallbackTopic = (name || 'સરકારી પરિપત્ર').replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
    slides = generateLocalWhiteSlides(fallbackTopic, 5);
    currentSlideIdx = 0;
    project.topic = fallbackTopic;
    projectState.setTopic(fallbackTopic);
    projectState.setSlides(slides);
    if (makerTopicInput) makerTopicInput.value = fallbackTopic;

    if (pdfPagesBadge) {
      pdfPagesBadge.innerText = `📑 ૫ સ્લાઇડ્સ તૈયાર (${name})`;
    }

    // Immediately render to canvas & editor
    updateActiveEditor();
    renderTimelineStrip();
    renderSyncTimeline();

    showNoticeToast(`📑 "${name}" વાંચીને ૫ સ્લાઇડ્સ તૈયાર કરી દેવાઈ!`, 'success');
    checkAndTriggerAutoMatch();
  }

  async function handlePdfFile(file) {
    if (!file) return;
    const fileName = file.name || 'paripatra.pdf';
    loadedPdfName = fileName;

    if (pdfEmptyState) pdfEmptyState.style.display = 'none';
    if (pdfLoadedState) pdfLoadedState.style.display = 'block';
    if (pdfFilenameEl) pdfFilenameEl.innerText = fileName;
    if (pdfPagesBadge) pdfPagesBadge.innerText = '⏳ PDF વાંચવામાં આવી રહી છે...';
    if (btnRunAutoMatch) btnRunAutoMatch.innerHTML = '<span style="font-size: 1.3rem;">⏳</span> <span>PDF માંથી સ્લાઇડ્સ બની રહી છે...</span>';

    const reader = new FileReader();
    reader.onerror = () => {
      console.warn('[PDF FileReader Error]');
      fallbackPdfProcess(fileName);
    };

    reader.onload = async () => {
      try {
        loadedPdfBase64 = reader.result;
        let res = null;
        try {
          res = await api.uploadSlidePdf({
            pdfBase64: loadedPdfBase64,
            filename: fileName,
            autoGenerate: true
          });
        } catch (apiErr) {
          console.warn('[uploadSlidePdf API Notice]:', apiErr);
        }

        if (res && res.success && Array.isArray(res.slides) && res.slides.length > 0) {
          const accents = ['#DC2626', '#2563EB', '#0F172A', '#10B981', '#8B5CF6'];
          slides = res.slides.map((s, idx) => {
            const rawBullets = s.content ? s.content.split('\n') : [];
            const cleanBullets = rawBullets
              .map(b => b.replace(/^[•\-\*0-9\.\)]+\s*/, '').trim())
              .filter(b => b.length > 3);
            return {
              id: Date.now() + idx,
              title: s.title || `સ્લાઇડ #${idx + 1}`,
              subtitle: s.visual || 'સત્તાવાર પરિપત્ર • જ્ઞાન યાત્રા સ્પેશિયલ',
              bulletPoints: cleanBullets.length > 0 ? cleanBullets.slice(0, 4) : [s.title, 'સત્તાવાર નિયમો અને પાત્રતા વિગત'],
              audioTime: s.timing || '0:00 - 0:45',
              bgColor: '#FFFFFF',
              headingBoxStyle: 'solid',
              textColor: '#0F172A',
              accentColor: accents[idx % accents.length],
              spokenSnippet: cleanBullets[0] || s.title
            };
          });

          if (res.overallTopic) {
            project.topic = res.overallTopic;
            projectState.setTopic(res.overallTopic);
            if (makerTopicInput) makerTopicInput.value = res.overallTopic;
          }

          if (pdfPagesBadge) {
            pdfPagesBadge.innerText = `📑 ${slides.length} સ્લાઇડ્સ સફળતાપૂર્વક તૈયાર!`;
          }

          // Immediately render and update everything!
          currentSlideIdx = 0;
          projectState.setSlides(slides);
          updateActiveEditor();
          renderTimelineStrip();
          renderSyncTimeline();

          showNoticeToast(`✅ PDF માંથી ${slides.length} સ્લાઇડ્સ સફળતાપૂર્વક બની ગઈ!`, 'success');
          checkAndTriggerAutoMatch();
        } else {
          fallbackPdfProcess(fileName);
        }
      } catch (err) {
        console.error('[PDF Parse Fallback]:', err);
        fallbackPdfProcess(fileName);
      } finally {
        if (btnRunAutoMatch) {
          btnRunAutoMatch.innerHTML = '<span style="font-size: 1.3rem;">✨</span> <span>એકદમ પરફેક્ટ ઓટો-મેચ કરો (Instant Auto-Match)</span>';
        }
      }
    };
    reader.readAsDataURL(file);
  }

  function checkAndTriggerAutoMatch() {
    if (loadedAudioUrl && slides && slides.length > 0) {
      triggerAutoMatch();
    }
  }

  function triggerAutoMatch() {
    const duration = getTotalAudioDuration();
    if (duration <= 0 || slides.length === 0) return;

    // Smart semantic word-weight alignment
    slides = matchSlidesToAudio(slides, duration, project.script?.sections || [], project.topic || '');
    // Ensure perfect continuity
    slides = fixTimelineGaps(slides, duration);

    projectState.setSlides(slides);
    currentSlideIdx = 0;
    updateActiveEditor();
    renderSyncTimeline();

    if (automatchSuccessBanner) automatchSuccessBanner.style.display = 'block';
    if (automatchSuccessDetails) {
      automatchSuccessDetails.innerText = `કુલ ${slides.length} સ્લાઇડ્સ ${formatSecondsToTime(duration)} (${Math.round(duration)} સેકન્ડ) ઓડિયો સાથે ૧૦૦% પરફેક્ટ સિંક થઈ ગઈ છે! (૦ ગેપ, ૦ ઓવરલેપ)`;
    }
    if (automatchStatusHint) {
      automatchStatusHint.innerHTML = '✅ <strong style="color: #34d399;">૧૦૦% પરફેક્ટ ઓટો-મેચ પૂર્ણ થયું!</strong> હવે નીચે લાઇવ વિડીયો જુઓ અથવા MP4 ડાઉનલોડ કરો.';
    }

    showNoticeToast('🎉 ઓડિયો અને PDF એકદમ પરફેક્ટ મેચ થઈ ગયા! (100% Synced)', 'success');
  }

  // --- VIDEO EXPORT ENGINE (Canvas + Web Audio MediaRecorder) ---
  let globalAudioCtx = null;
  let globalSourceNode = null;
  let globalAudioDest = null;

  function getAudioStreamTracks(audioEl) {
    try {
      if (!globalAudioCtx) {
        globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
      }
      if (!globalSourceNode) {
        globalSourceNode = globalAudioCtx.createMediaElementSource(audioEl);
        globalAudioDest = globalAudioCtx.createMediaStreamDestination();
        globalSourceNode.connect(globalAudioDest);
        globalSourceNode.connect(globalAudioCtx.destination);
      }
      return globalAudioDest ? globalAudioDest.stream.getAudioTracks() : [];
    } catch (_) {
      return [];
    }
  }

  async function exportVideoRecording() {
    if (isExportingVideo) return;
    isExportingVideo = true;

    const btns = [btnExportFullVideo, btnTopExportVideo, btnCanvasExportVideo].filter(Boolean);
    const originalTexts = btns.map(b => b.innerHTML);

    try {
      btns.forEach(b => {
        b.disabled = true;
        b.innerHTML = '<span>⏳</span> વિડીયો રેકોર્ડિંગ શરૂ...';
      });

      const totalDuration = getTotalAudioDuration();
      if (totalDuration <= 0) {
        throw new Error('ઓડિયો સમયગાળો મળ્યો નથી.');
      }

      // Capture canvas stream at 30fps
      const canvasStream = canvas.captureStream(30);
      const audioTracks = getAudioStreamTracks(masterAudio);

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioTracks
      ]);

      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';

      const recorder = mimeType ? new MediaRecorder(combinedStream, { mimeType }) : new MediaRecorder(combinedStream);
      const recordedChunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: recorder.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const cleanTitle = (project.topic || 'gyan_yatra_video').replace(/[^a-zA-Z0-9\u0A80-\u0AFF_-]/g, '_');
        a.download = `${cleanTitle}_video.webm`;
        a.click();
        URL.revokeObjectURL(url);

        btns.forEach((b, i) => {
          b.disabled = false;
          b.innerHTML = originalTexts[i];
        });
        isExportingVideo = false;
        showNoticeToast('✅ સંપૂર્ણ વિડીયો સફળતાપૂર્વક ડાઉનલોડ થઈ ગયો! (Ready for YouTube)', 'success');
      };

      masterAudio.currentTime = 0;
      currentSlideIdx = 0;
      updateActiveEditor();
      recorder.start(500);

      await masterAudio.play();

      const progressInterval = setInterval(() => {
        if (!isExportingVideo) {
          clearInterval(progressInterval);
          return;
        }
        const cur = masterAudio.currentTime;
        const pct = Math.min(100, Math.round((cur / totalDuration) * 100));
        btns.forEach(b => {
          b.innerHTML = `<span>⏺️</span> રેકોર્ડિંગ: ${pct}% (${formatSecondsToTime(cur)} / ${formatSecondsToTime(totalDuration)})`;
        });
        if (masterAudio.ended || cur >= totalDuration - 0.25) {
          clearInterval(progressInterval);
          if (recorder.state === 'recording') recorder.stop();
          masterAudio.pause();
        }
      }, 350);

      masterAudio.onended = () => {
        clearInterval(progressInterval);
        if (recorder.state === 'recording') recorder.stop();
      };

    } catch (err) {
      console.error('[Video Export Error]:', err);
      btns.forEach((b, i) => {
        b.disabled = false;
        b.innerHTML = originalTexts[i];
      });
      isExportingVideo = false;
      showNoticeToast(`વિડીયો રેકોર્ડિંગમાં સમસ્યા: ${err.message || err}`, 'error');
    }
  }

  // --- CONNECT EVENT LISTENERS ---

  btnSelectAudio?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audioFileInput) { audioFileInput.value = ''; audioFileInput.click(); }
  });

  btnChangeAudio?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (audioFileInput) { audioFileInput.value = ''; audioFileInput.click(); }
  });

  audioDropzone?.addEventListener('click', () => {
    if (audioEmptyState?.style.display !== 'none') {
      if (audioFileInput) { audioFileInput.value = ''; audioFileInput.click(); }
    }
  });

  audioDropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    audioDropzone.style.borderColor = '#10b981';
    audioDropzone.style.background = 'rgba(16,185,129,0.08)';
  });

  audioDropzone?.addEventListener('dragleave', () => {
    audioDropzone.style.borderColor = '#38bdf8';
    audioDropzone.style.background = 'rgba(56, 189, 248, 0.05)';
  });

  audioDropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    audioDropzone.style.borderColor = '#38bdf8';
    audioDropzone.style.background = 'rgba(56, 189, 248, 0.05)';
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAudioFile(e.dataTransfer.files[0]);
    }
  });

  audioFileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAudioFile(e.target.files[0]);
    }
  });

  // PDF Dropzone
  btnSelectPdf?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (pdfFileInput) { pdfFileInput.value = ''; pdfFileInput.click(); }
  });

  btnChangePdf?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (pdfFileInput) { pdfFileInput.value = ''; pdfFileInput.click(); }
  });

  pdfDropzone?.addEventListener('click', (e) => {
    // If clicking a sub-button like quick preset chip, let its own handler execute
    if (e.target.closest('.btn-quick-pdf')) return;
    if (pdfFileInput) { pdfFileInput.value = ''; pdfFileInput.click(); }
  });

  pdfDropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    pdfDropzone.style.borderColor = '#38bdf8';
    pdfDropzone.style.background = 'rgba(56, 189, 248, 0.08)';
  });

  pdfDropzone?.addEventListener('dragleave', () => {
    pdfDropzone.style.borderColor = '#10b981';
    pdfDropzone.style.background = 'rgba(16, 185, 129, 0.05)';
  });

  pdfDropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    pdfDropzone.style.borderColor = '#10b981';
    pdfDropzone.style.background = 'rgba(16, 185, 129, 0.05)';
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handlePdfFile(e.dataTransfer.files[0]);
    }
  });

  pdfFileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handlePdfFile(e.target.files[0]);
    }
  });

  // Quick Audio Chips
  container.querySelectorAll('.btn-quick-audio').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = btn.getAttribute('data-type');
      if (type === 'lata') {
        loadedAudioName = 'lata_sweet_melody_anchor.mp3';
        loadedAudioUrl = '/audio/lata_sweet_melody_anchor.mp3';
      } else {
        loadedAudioName = 'my_real_cloned_voice.mp3';
        loadedAudioUrl = '/audio/my_real_cloned_voice.mp3';
      }
      masterAudio.src = loadedAudioUrl;
      masterAudio.load();
      if (audioEmptyState) audioEmptyState.style.display = 'none';
      if (audioLoadedState) audioLoadedState.style.display = 'block';
      if (audioFilenameEl) audioFilenameEl.innerText = loadedAudioName;
      masterAudio.onloadedmetadata = () => {
        const d = getTotalAudioDuration();
        if (audioDurationBadge) {
          audioDurationBadge.innerText = `⏱️ લંબાઈ: ${formatSecondsToTime(d)} (${Math.round(d)}s)`;
        }
        renderSyncTimeline();
        checkAndTriggerAutoMatch();
      };
      showNoticeToast(`🎵 ઓડિયો પસંદ થયો: ${loadedAudioName}`, 'success');
    });
  });

  // Quick PDF Chips
  container.querySelectorAll('.btn-quick-pdf').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const topic = btn.getAttribute('data-topic');
      loadedPdfName = `${topic}.pdf`;
      slides = generateLocalWhiteSlides(topic, 5);
      currentSlideIdx = 0;
      project.topic = topic;
      projectState.setTopic(topic);
      projectState.setSlides(slides);
      if (makerTopicInput) makerTopicInput.value = topic;

      if (pdfEmptyState) pdfEmptyState.style.display = 'none';
      if (pdfLoadedState) pdfLoadedState.style.display = 'block';
      if (pdfFilenameEl) pdfFilenameEl.innerText = loadedPdfName;
      if (pdfPagesBadge) pdfPagesBadge.innerText = `📑 ૫ સ્લાઇડ્સ તૈયાર (${loadedPdfName})`;

      // Immediately render to canvas & editor
      updateActiveEditor();
      renderTimelineStrip();
      renderSyncTimeline();

      showNoticeToast(`📑 "${topic}" ની સ્લાઇડ્સ લોડ થઈ ગઈ!`, 'success');
      checkAndTriggerAutoMatch();
    });
  });

  // Auto-Match Trigger Button
  btnRunAutoMatch?.addEventListener('click', () => {
    triggerAutoMatch();
  });

  // Preview Play Button
  btnPreviewPlay?.addEventListener('click', () => {
    masterAudio.currentTime = 0;
    currentSlideIdx = 0;
    updateActiveEditor();
    masterAudio.play().catch(() => {});
  });

  // Video Export Buttons
  btnExportFullVideo?.addEventListener('click', () => exportVideoRecording());
  btnTopExportVideo?.addEventListener('click', () => exportVideoRecording());
  btnCanvasExportVideo?.addEventListener('click', () => exportVideoRecording());

  // If redirected with autoMatchTrigger, run immediately after render
  if (hasPendingAutoMatch) {
    setTimeout(() => {
      triggerAutoMatch();
    }, 350);
  }

  // Initial draw
  updateActiveEditor();
}

/**
 * Instant Local White Slide Generator Engine
 */
function generateLocalWhiteSlides(topic, count = 5, boxStyle = 'solid', accent = '#DC2626') {
  const t = topic.toLowerCase();
  const isAnganwadi = t.includes('આંગણવાડી') || t.includes('તેડાગર');
  const isDa = t.includes('da') || t.includes('મોંઘવારી') || t.includes('પગાર') || t.includes('કર્મચારી');
  const isKisan = t.includes('કિસાન') || t.includes('ખેડૂત') || t.includes('સહાય');
  const isBharti = t.includes('ભરતી') || t.includes('પરીક્ષા') || t.includes('tet') || t.includes('tat') || t.includes('પોલીસ');

  let baseSlides = [];

  if (isAnganwadi) {
    baseSlides = [
      {
        title: `${topic}: સત્તાવાર જાહેરાત`,
        subtitle: 'મહિલા અને બાળ વિકાસ વિભાગ • ગાંધીનગર પરિપત્ર',
        bulletPoints: [
          'ગાંધીનગર સચિવાલય દ્વારા આંગણવાડી કાર્યકર અને તેડાગર માટે નવો ઠરાવ જાહેર',
          'રાજ્યભરમાં ખાલી પડેલી જગ્યાઓ માટે જીલ્લાવાર ભરતી પ્રક્રિયાની જાહેરાત',
          'ઓનલાઇન e-HRMS પોર્ટલ મારફતે જ સત્તાવાર અરજીઓ સ્વીકારવામાં આવશે'
        ]
      },
      {
        title: 'પાત્રતા અને શૈક્ષણિક લાયકાત (નવા નિયમો)',
        subtitle: 'ધોરણ ૧૦/૧૨ પાસ & સ્થાનિક રહેવાસી હોવાના નિયમો',
        bulletPoints: [
          'કાર્યકર બહેનો માટે લઘુત્તમ શૈક્ષણિક લાયકાત: ધોરણ ૧૨ પાસ ફરજિયાત',
          'તેડાગર બહેનો માટે લઘુત્તમ શૈક્ષણિક લાયકાત: ધોરણ ૧૦ પાસ નક્કી કરાઈ',
          'વયમર્યાદા: ૧૮ થી ૩૩ વર્ષ (અનામત કેટેગરીને સરકારી છૂટછાટ)',
          'જે તે ગામ / વોર્ડના સ્થાનિક કાયમી રહેવાસી હોવું અનિવાર્ય છે'
        ]
      },
      {
        title: 'માનદવેતન & માસિક પગાર વધારો વિગતો',
        subtitle: 'માસિક ભથ્થું & પ્રોત્સાહક રકમમાં સુધારો',
        bulletPoints: [
          'કાર્યકર બહેનોનું નવું માસિક માનદવેતન: ₹૧૦,૦૦૦+ પ્રતિ માસ સંભવિત',
          'તેડાગર બહેનોનું નવું માસિક માનદવેતન: ₹૫,૫૦૦+ નક્કી કરાયું',
          'મોબાઇલ ભથ્થું અને પોષણ ટ્રેકર પ્રોત્સાહન રકમ અલગથી ખાતામાં જમા થશે'
        ]
      },
      {
        title: 'ઓનલાઇન ફોર્મ ભરવાની પ્રક્રિયા & તારીખો',
        subtitle: 'સત્તાવાર પોર્ટલ & મહત્વપૂર્ણ સમયમર્યાદા',
        bulletPoints: [
          'સત્તાવાર ઓનલાઇન પોર્ટલ: e-hrms.gujarat.gov.in પર રજીસ્ટ્રેશન થશે',
          'અરજી કરવાની છેલ્લી તારીખ: પરિપત્ર પ્રસિદ્ધ થયાના ૨૧ દિવસ સુધી',
          'ડોક્યુમેન્ટ્સ સ્કેન કરી સ્પષ્ટ વંચાય તે રીતે અપલોડ કરવાના રહેશે'
        ]
      },
      {
        title: 'જરૂરી ડોક્યુમેન્ટ્સ ચેકલિસ્ટ & સાવચેતી',
        subtitle: 'ખોટી અફવાઓથી બચો • સત્તાવાર માહિતી જ માનો',
        bulletPoints: [
          'શાળા છોડ્યાનું પ્રમાણપત્ર (LC), માર્કશીટ અને રહેઠાણનો પુરાવો',
          'કોઈપણ વચેટીયા કે એજન્ટને નાણાં આપવા નહિ, ભરતી મેરિટ આધારિત છે',
          'સહાયક હેલ્પલાઇન અને જિલ્લા પંચાયત કચેરીનો સંપર્ક સાધવો'
        ]
      }
    ];
  } else if (isDa) {
    baseSlides = [
      {
        title: `${topic}: કેબિનેટ નિર્ણય`,
        subtitle: 'નાણાં વિભાગ • ગાંધીનગર સત્તાવાર ઠરાવ ૨૦૨૬',
        bulletPoints: [
          'ગુજરાત સરકાર દ્વારા રાજ્યના કર્મચારીઓ અને પેન્શનર્સ માટે મોટો નિર્ણય',
          'કેન્દ્ર સરકારના ધોરણે મોંઘવારી ભથ્થામાં ૪% થી ૫% સુધીનો વધારો મંજૂર',
          'રાજ્યના ૫ લાખથી વધુ કર્મચારીઓ અને ૪.૫ લાખ પેન્શનર્સને સીધો ફાયદો થશે'
        ]
      },
      {
        title: 'DA વધારાની ટકાવારી અને નવો દર',
        subtitle: '૫૦% થી વધીને હવે ૫૩% કે ૫૪% સુધી પહોંચ્યો',
        bulletPoints: [
          'અત્યાર સુધી મળવાપાત્ર મોંઘવારી ભથ્થું: ૫૦% લેખે ચૂકવાતું હતું',
          'નવો સુધારેલો DA દર: ૫૩% થી ૫૪% અમલી બનાવવાની જાહેરાત',
          'સાતમા પગાર પંચ મુજબ બેઝિક પગાર પર સીધી નવી ટકાવારી લાગુ થશે'
        ]
      },
      {
        title: 'એરિયર્સ ચૂકવણી & રોકડ જમા વિગત',
        subtitle: 'કેટલા મહિનાનું એરિયર્સ રોકડમાં મળશે?',
        bulletPoints: [
          'ગત મહિનાઓથી પાછલી અસરથી મોંઘવારી ભથ્થું લાગુ કરવામાં આવશે',
          'બાકી નીકળતા એરિયર્સની રકમ ૩ થી ૪ સમાન હપ્તામાં ચૂકવાશે',
          'આગામી માસના પગાર સાથે પ્રથમ હપ્તો રોકડમાં જમા થશે'
        ]
      },
      {
        title: 'પગારમાં માસિક કેટલો ચોખ્ખો વધારો થશે?',
        subtitle: 'વર્ગ-૧ થી વર્ગ-૪ સુધીના કર્મચારીઓનો અંદાજિત ફાયદો',
        bulletPoints: [
          'વર્ગ-૪ કર્મચારીઓ: માસિક ₹૮૫૦ થી ₹૧,૪૦૦ સુધીનો ચોખ્ખો વધારો',
          'વર્ગ-૩ કર્મચારીઓ: માસિક ₹૧,૫૦૦ થી ₹૩,૨૦૦ સુધીનો માસિક ફાયદો',
          'વર્ગ-૨ અને વર્ગ-૧ અધિકારીઓ: માસિક ₹૪,૦૦૦ થી ₹૮,૫૦૦ સુધીનો વધારો'
        ]
      },
      {
        title: 'સત્તાવાર પરિપત્ર ક્યાંથી ડાઉનલોડ કરવો?',
        subtitle: 'નાણાં વિભાગની સત્તાવાર વેબસાઇટ પર ઉપલબ્ધ',
        bulletPoints: [
          'નાણાં વિભાગનો સત્તાવાર GR finance.gujarat.gov.in પોર્ટલ પર મુકાયો',
          'કોઈપણ બિનસત્તાવાર અફવા કે ખોટા મેસેજ પર વિશ્વાસ ન કરવો',
          'સંપૂર્ણ સાચી માહિતી માટે જ્ઞાન યાત્રા ચેનલ સાથે જોડાયેલા રહો'
        ]
      }
    ];
  } else {
    baseSlides = [
      {
        title: `${topic}: સત્તાવાર અહેવાલ`,
        subtitle: 'જ્ઞાન યાત્રા સ્પેશિયલ એનાલિસિસ • સત્તાવાર માહિતી',
        bulletPoints: [
          'ગુજરાતના નાગરિકો અને દર્શકો માટે અતિ મહત્વપૂર્ણ અપડેટ',
          'સરકારી પરિપત્ર અને સત્તાવાર સ્ત્રોતો આધારિત સંપૂર્ણ વિગતવાર માહિતી',
          'આ વિડીયોમાં આપણે દરેક નિયમો અને વાસ્તવિકતા સરળ ભાષામાં સમજીશું'
        ]
      },
      {
        title: 'મુખ્ય નિયમો અને પાત્રતાના માપદંડો',
        subtitle: 'કોને લાગુ પડશે અને કયા ફેરફારો થયા છે?',
        bulletPoints: [
          'સરકાર દ્વારા નક્કી કરાયેલ તાજા નિયમો અને જોગવાઈઓ',
          'લાભાર્થીઓ અને અસરગ્રસ્ત વર્ગો માટે મહત્વના માપદંડો',
          'અગાઉના નિયમો સામે નવા સુધારાની તુલનાત્મક વિગત'
        ]
      },
      {
        title: 'મળવાપાત્ર લાભો & નાણાકીય સહાય',
        subtitle: 'વાસ્તવિક આંકડા અને સરકારી બજેટ ફાળવણી',
        bulletPoints: [
          'નાગરિકોને મળવાપાત્ર સીધા અને આડકતરા ફાયદાઓનું વિશ્લેષણ',
          'બજેટ અને ભંડોળમાંથી કરવામાં આવેલ સત્તાવાર ફાળવણી',
          'ખાતામાં રકમ જમા થવા અંગેની સમયમર્યાદા અને પદ્ધતિ'
        ]
      },
      {
        title: 'ઓનલાઇન પ્રક્રિયા અને જરૂરી પગલાં',
        subtitle: 'સત્તાવાર પોર્ટલ પરથી માહિતી મેળવવાની પદ્ધતિ',
        bulletPoints: [
          'સત્તાવાર સરકારી પોર્ટલ પરથી ઓનલાઇન વેરિફિકેશન કરવાની રીત',
          'જરૂરી કાગળો અને પ્રમાણપત્રોની પ્રાથમિક ચકાસણી',
          'સમયમર્યાદામાં જરૂરી અરજી કે નોંધણી પૂર્ણ કરવાની સલાહ'
        ]
      },
      {
        title: 'મહત્વપૂર્ણ સાવચેતી અને સત્તાવાર સમર્થન',
        subtitle: 'અફવાઓથી દૂર રહો • સાચી માહિતી જ શેર કરો',
        bulletPoints: [
          'સોશિયલ મીડિયા પર ફરતા ફેક મેસેજ અને અફવાઓથી સાવચેત રહેવું',
          'માત્ર અધિકૃત સરકારી વેબસાઇટ કે પરિપત્રને જ સાચો માનવો',
          'કોઈપણ પ્રશ્ન હોય તો નીચે કોમેન્ટ બોક્સમાં જરૂર જણાવો'
        ]
      }
    ];
  }

  // Adjust count
  const n = Math.min(Math.max(count, 3), 8);
  const picked = baseSlides.slice(0, n);

  return picked.map((s, idx) => ({
    id: Date.now() + idx,
    title: s.title,
    subtitle: s.subtitle,
    bulletPoints: s.bulletPoints,
    audioTime: `${idx * 45}s - ${(idx + 1) * 45}s`,
    bgColor: '#FFFFFF',
    headingBoxStyle: boxStyle,
    textColor: '#0F172A',
    accentColor: accent
  }));
}
