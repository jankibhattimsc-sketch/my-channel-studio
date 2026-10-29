import { copyToClipboard } from '../utils/clipboard.js';
import { api } from '../api.js';
import { generateClientNotebookLMPrompt } from '../utils/notebooklmPromptGenerator.js';
import { projectState } from '../utils/projectState.js';

export function renderSlidePrompts(container, navigateTo) {
  const initialTopic = window.prefillTopic || projectState?.getProject()?.topic || 'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026';
  window.prefillTopic = null;
  let activeTopic = initialTopic;
  let activeTab = 'slides'; // 'slides' | 'notebooklm'
  let selectedSlideIdx = 0;

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

  // Initialize slides from project state or create authentic starter slides
  let slides = (curProj && curProj.slide && Array.isArray(curProj.slide.slides) && curProj.slide.slides.length > 0)
    ? curProj.slide.slides
    : [
      {
        id: 1,
        title: activeTopic,
        subtitle: 'સત્તાવાર નિર્ણય જાહેર • નાણાં વિભાગ ઠરાવ',
        bulletPoints: [
          'ગાંધીનગર સચિવાલય દ્વારા નવો સત્તાવાર પરિપત્ર જાહેર',
          'રાજ્યના લાખો કર્મચારીઓ અને પેન્શનર્સને સીધો નાણાકીય ફાયદો',
          'ચાલુ માસથી જ નવા દરે પગાર અને એરિયર્સ બેંક ખાતામાં જમા'
        ],
        audioTime: '0:00 - 0:50',
        scriptText: `નમસ્તે મિત્રો! આજના વિડીયોમાં આપણે વાત કરીશું "${activeTopic}" વિશે. સત્તાવાર પરિપત્ર અને નિયમો જાહેર થઈ ગયા છે. તમામ પાત્ર ઉમેદવારો અને લાભાર્થીઓ માટે આ મહત્વપૂર્ણ માહિતી છે.`,
        bgColor: '#FFFFFF',
        textColor: '#0F172A',
        accentColor: '#DC2626'
      },
      {
        id: 2,
        title: 'પાત્રતા અને લાભાર્થી નિયમો ૨૦૨૬',
        subtitle: 'કોને કોને લાભ મળશે? સંપૂર્ણ શરતો',
        bulletPoints: [
          'તમામ પાત્ર લાભાર્થીઓ માટે સત્તાવાર પોર્ટલ પર લિસ્ટ જાહેર',
          'આધાર લિંક્ડ બેંક ખાતામાં સીધી સહાય જમા કરવામાં આવશે',
          'કોઈપણ વચેટીયાની વાતમાં આવવું નહીં, ઓફિશિયલ વિગત જ સાચી'
        ],
        audioTime: '0:50 - 2:00',
        scriptText: 'મુખ્ય સત્તાવાર નિર્ણય મુજબ નિયમો જાહેર કરવામાં આવ્યા છે. કોને લાભ મળશે અને શું પ્રક્રિયા છે તે વિગતવાર સમજીએ.',
        bgColor: '#FFFFFF',
        textColor: '#0F172A',
        accentColor: '#2563EB'
      },
      {
        id: 3,
        title: 'અરજી પ્રક્રિયા અને જરૂરી આધાર-પુરાવા',
        subtitle: 'ઓનલાઇન ફોર્મ અને ડોક્યુમેન્ટ લિસ્ટ',
        bulletPoints: [
          'જરૂરી તમામ પુરાવા ઓનલાઇન અપલોડ કરવાના રહેશે',
          'અરજી કરવાની છેલ્લી તારીખ પહેલાં પ્રોસેસ પૂર્ણ કરવી',
          'સહાય મંજૂર થયાની SMS દ્વારા સીધી જાણ થશે'
        ],
        audioTime: '2:00 - 3:30',
        scriptText: 'આગળની પ્રોસેસ માટે જરૂરી તમામ પુરાવા અને ઓનલાઇન ફોર્મ સમયસર ભરી લેવા જેથી લાભ અટકે નહીં.',
        bgColor: '#FFFFFF',
        textColor: '#0F172A',
        accentColor: '#10B981'
      }
    ];

  // Save initial slides to project if needed
  if (!curProj?.slide?.slides || curProj.slide.slides.length === 0) {
    projectState.updateTool('slide', { slides, tool2Prompt, isCompleted: true });
  }

  function saveCurrentSlides() {
    projectState.updateTool('slide', {
      slides: slides,
      slideCount: `${slides.length} સ્લાઇડ્સ`,
      isCompleted: slides.length > 0
    });

    // Also auto-sync combined narration script into project script
    const scriptParts = slides
      .map((s, idx) => {
        const text = s.scriptText ? s.scriptText.trim() : (s.bulletPoints || []).join(' ');
        return `[સ્લાઇડ ${idx + 1}: ${s.title}]\n${text}`;
      })
      .filter(Boolean);

    if (scriptParts.length > 0) {
      const combined = scriptParts.join('\n\n');
      const cur = projectState.getActiveProject();
      if (!cur?.script?.fullText || cur.script.fullText.length < 50) {
        projectState.updateTool('script', {
          fullText: combined,
          teleprompterText: combined
        });
      }
    }
  }

  function render() {
    if (selectedSlideIdx >= slides.length) selectedSlideIdx = Math.max(0, slides.length - 1);
    const curSlide = slides[selectedSlideIdx] || slides[0] || {};

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
          <button id="btn-next-to-script" class="btn btn-primary btn-sm" style="font-weight: 800; background: #10b981; border: none; padding: 7px 16px;">
            ૩. Script રાઇટર →
          </button>
        </div>
      </div>

      <!-- Main Navigation Tabs: My Slides & Script vs NotebookLM Prompt -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; background: #0b1120; padding: 8px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="tab-btn-slides" class="btn btn-sm ${activeTab === 'slides' ? 'btn-primary' : 'btn-outline'}" style="font-weight: 800; padding: 8px 18px; border-radius: 8px; font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
            <span>📑</span> ૧. મારી સ્લાઇડ્સ & સ્ક્રિપ્ટ (${slides.length})
          </button>
          <button id="tab-btn-notebooklm" class="btn btn-sm ${activeTab === 'notebooklm' ? 'btn-primary' : 'btn-outline'}" style="font-weight: 800; padding: 8px 18px; border-radius: 8px; font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
            <span>🖥️</span> ૨. Google NotebookLM PPT પ્રોમ્પ્ટ
          </button>
        </div>

        <button id="btn-open-full-slideeditor" class="btn btn-outline btn-sm" style="border-color: #8b5cf6; color: #c084fc; font-weight: 700; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
          <span>🎬</span> એડવાન્સ્ડ સ્લાઇડ એડિટર & વિડિયો મેકર ↗
        </button>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 1: MY SLIDES & SCRIPT MANAGER (DIRECT INPUT & AUTO-SAVE)             -->
      <!-- ========================================================================= -->
      ${activeTab === 'slides' ? `
        <!-- Actions Toolbar -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; background: rgba(30, 41, 59, 0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 16px;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: #ffffff; margin: 0 0 2px 0; display: flex; align-items: center; gap: 8px;">
              <span>📑</span> સ્લાઇડ્સ અને સ્ક્રિપ્ટ એડિટર
            </h3>
            <p style="font-size: 0.8rem; color: #94a3b8; margin: 0;">
              અહીં તમે તમારી સ્લાઇડ્સ અને તે સ્લાઇડ વખતે શું બોલવું છે તે સ્ક્રિપ્ટ મૂકી શકો છો. બધું જ આપોઆપ સેવ થશે.
            </p>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <button id="btn-bulk-paste-slides" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #7dd3fc; font-weight: 700;">
              <span>📋</span> બલ્ક લખાણ પેસ્ટ કરો
            </button>
            <button id="btn-import-from-script" class="btn btn-outline btn-sm" style="border-color: #a855f7; color: #c084fc; font-weight: 700;" title="સ્ક્રિપ્ટમાંથી સ્લાઇડ્સ બનાવો">
              <span>📥</span> સ્ક્રિપ્ટમાંથી લાવો
            </button>
            <button id="btn-add-new-slide" class="btn btn-success btn-sm" style="font-weight: 800; background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 7px 16px;">
              <span>➕</span> નવી સ્લાઇડ ઉમેરો
            </button>
          </div>
        </div>

        <!-- Main 2-Column: Slide Cards List (Left) + 16:9 Live PPT Preview (Right) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; align-items: start; margin-bottom: 24px;">

          <!-- LEFT: SLIDE CARDS LIST & INPUTS -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${slides.map((s, idx) => {
              const isSelected = idx === selectedSlideIdx;
              const bulletsText = Array.isArray(s.bulletPoints) ? s.bulletPoints.join('\n') : (s.bulletPoints || '');
              return `
                <div class="card slide-card" data-idx="${idx}" style="border: 2px solid ${isSelected ? '#38bdf8' : 'rgba(255,255,255,0.1)'}; background: ${isSelected ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.65)'}; border-radius: 12px; padding: 16px; box-shadow: ${isSelected ? '0 8px 24px rgba(56,189,248,0.2)' : 'none'}; transition: all 0.2s;">
                  
                  <!-- Card Header -->
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="badge" style="background: ${idx === 0 ? '#ef4444' : idx === 1 ? '#3b82f6' : '#10b981'}; color: #fff; font-weight: 800; font-size: 0.75rem;">
                        સ્લાઇડ #${idx + 1}
                      </span>
                      <span style="font-size: 0.78rem; color: #94a3b8; font-weight: 600;">
                        ⏱️ સમય: ${s.audioTime || `ભાગ ${idx + 1}`}
                      </span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 6px;">
                      <button class="btn btn-outline btn-sm btn-preview-slide" data-idx="${idx}" style="padding: 3px 8px; font-size: 0.75rem; color: #38bdf8; border-color: rgba(56,189,248,0.4);" title="પ્રિવ્યૂ જુઓ">
                        👁️ પ્રિવ્યૂ
                      </button>
                      ${slides.length > 1 ? `
                        <button class="btn btn-outline btn-sm btn-delete-slide" data-idx="${idx}" style="padding: 3px 8px; font-size: 0.75rem; color: #f87171; border-color: rgba(248,113,113,0.3);" title="સ્લાઇડ કાઢી નાખો">
                          🗑️
                        </button>
                      ` : ''}
                    </div>
                  </div>

                  <!-- 1. Slide Title Input -->
                  <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 0.76rem; font-weight: 700; color: #38bdf8; margin-bottom: 4px; text-transform: uppercase;">
                      📌 સ્લાઇડનું મુખ્ય ટાઇટલ (Slide Title):
                    </label>
                    <input type="text" class="form-input slide-input-title" data-idx="${idx}" value="${s.title || ''}" placeholder="દા.ત. સત્તાવાર પરિપત્ર અને નિયમો..." style="font-weight: 700; font-size: 0.95rem; padding: 8px 12px; background: #0a0d14; border: 1px solid rgba(255,255,255,0.12); color: #fff; border-radius: 6px; width: 100%; box-sizing: border-box;">
                  </div>

                  <!-- 2. Slide Subtitle Input -->
                  <div style="margin-bottom: 10px;">
                    <label style="display: block; font-size: 0.74rem; font-weight: 600; color: #94a3b8; margin-bottom: 4px;">
                      સબટાઇટલ (Subtitle / પરિપત્ર સંદર્ભ):
                    </label>
                    <input type="text" class="form-input slide-input-subtitle" data-idx="${idx}" value="${s.subtitle || ''}" placeholder="દા.ત. નાણાં વિભાગ ઠરાવ ૨૦૨૬..." style="font-size: 0.85rem; padding: 7px 12px; background: #0a0d14; border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; border-radius: 6px; width: 100%; box-sizing: border-box;">
                  </div>

                  <!-- 3. Bullet Points Textarea -->
                  <div style="margin-bottom: 12px;">
                    <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #fbbf24; margin-bottom: 4px;">
                      મુખ્ય મુદ્દાઓ (Bullet Points - ૧ લીટી = ૧ મુદ્દો):
                    </label>
                    <textarea class="form-textarea slide-input-bullets" data-idx="${idx}" rows="3" placeholder="• મુદ્દો ૧\n• મુદ્દો ૨\n• મુદ્દો ૩" style="font-size: 0.84rem; line-height: 1.5; padding: 8px 12px; background: #0a0d14; border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 6px; width: 100%; box-sizing: border-box; resize: vertical;">${bulletsText}</textarea>
                  </div>

                  <!-- 4. Slide Narration Script Textarea (CRITICAL FEATURE) -->
                  <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 10px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                      <label style="font-size: 0.76rem; font-weight: 800; color: #34d399; display: flex; align-items: center; gap: 4px;">
                        <span>🎙️</span> આ સ્લાઇડ વખતે બોલવાની સ્ક્રિપ્ટ (Slide Script / Voiceover):
                      </label>
                      <span style="font-size: 0.7rem; color: #6ee7b7;">સ્ટેપ ૩ સ્ક્રિપ્ટ સાથે લિંક્ડ ✓</span>
                    </div>
                    <textarea class="form-textarea slide-input-script" data-idx="${idx}" rows="2" placeholder="આ સ્લાઇડ સ્ક્રીન પર હોય ત્યારે જે બોલવું હોય તે અહીં લખો..." style="font-size: 0.85rem; line-height: 1.5; padding: 8px 10px; background: #07090e; border: 1px solid rgba(16, 185, 129, 0.25); color: #e2e8f0; border-radius: 6px; width: 100%; box-sizing: border-box; resize: vertical;">${s.scriptText || ''}</textarea>
                  </div>

                </div>
              `;
            }).join('')}

            <!-- Bottom Add Slide Button -->
            <button id="btn-add-slide-bottom" class="btn btn-outline" style="border: 2px dashed #10b981; color: #34d399; font-weight: 800; padding: 14px; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>➕</span> નવી સ્લાઇડ ઉમેરો (+ Add Slide #${slides.length + 1})
            </button>
          </div>

          <!-- RIGHT: LIVE 16:9 WHITE PPT PREVIEW CARD -->
          <div style="position: sticky; top: 20px; display: flex; flex-direction: column; gap: 14px;">
            
            <div class="card" style="background: #0f172a; border: 1.5px solid #38bdf8; border-radius: 14px; padding: 18px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
              
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.2rem;">📺</span>
                  <strong style="font-size: 0.95rem; color: #fff;">લાઈવ ૧૬:૯ સ્લાઇડ પ્રિવ્યૂ</strong>
                </div>
                
                <!-- Quick Slide Selector Dropdown -->
                <select id="select-preview-slide" class="form-select" style="width: auto; padding: 4px 10px; font-size: 0.78rem; background: #0a0d14; color: #38bdf8; border-color: rgba(56,189,248,0.4);">
                  ${slides.map((s, idx) => `
                    <option value="${idx}" ${idx === selectedSlideIdx ? 'selected' : ''}>સ્લાઇડ #${idx + 1}: ${s.title ? s.title.slice(0, 18) + '...' : ''}</option>
                  `).join('')}
                </select>
              </div>

              <!-- 16:9 Pure White Authentic PPT Canvas -->
              <div id="live-16x9-slide-canvas" style="aspect-ratio: 16/9; width: 100%; background: #FFFFFF; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); padding: 18px 22px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; color: #0f172a; font-family: 'Noto Sans Gujarati', system-ui, sans-serif; overflow: hidden; position: relative;">
                
                <!-- Top Brand & Timing Bar -->
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px;">
                  <span style="font-size: 0.75rem; font-weight: 800; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">
                    🎯 GYAN YATRA • સરકારી યોજના & નિર્ણય
                  </span>
                  <span style="font-size: 0.72rem; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">
                    ${curSlide.audioTime || '16:9 HD'}
                  </span>
                </div>

                <!-- Slide Title with Bold Box -->
                <div style="margin-bottom: 8px;">
                  <div style="display: inline-block; background: #0f172a; color: #ffffff; padding: 6px 14px; border-radius: 6px; font-size: 1.05rem; font-weight: 900; line-height: 1.35; margin-bottom: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                    ${curSlide.title || 'સ્લાઇડ શીર્ષક'}
                  </div>
                  <div style="font-size: 0.8rem; font-weight: 700; color: #475569; margin-left: 2px;">
                    ${curSlide.subtitle || ''}
                  </div>
                </div>

                <!-- Bullets List -->
                <div style="flex: 1; display: flex; flex-direction: column; gap: 8px; justify-content: center; margin-bottom: 8px;">
                  ${((Array.isArray(curSlide.bulletPoints) ? curSlide.bulletPoints : String(curSlide.bulletPoints || '').split('\n')).filter(Boolean)).map(b => `
                    <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.82rem; font-weight: 700; color: #1e293b; line-height: 1.4;">
                      <span style="color: #dc2626; font-size: 1rem; line-height: 1;">●</span>
                      <span>${b.replace(/^[•\-\*0-9\.\)]+\s*/, '')}</span>
                    </div>
                  `).join('')}
                </div>

                <!-- Footer Bar -->
                <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1.5px solid #f1f5f9; padding-top: 6px; font-size: 0.68rem; color: #94a3b8; font-weight: 600;">
                  <span>સત્તાવાર નિર્ણય • ૧૦૦% સાચી વિગત</span>
                  <span style="font-weight: 800; color: #0f172a;">સ્લાઇડ #${selectedSlideIdx + 1} / ${slides.length}</span>
                </div>

              </div>

              <!-- Narration Snippet for this slide -->
              <div style="margin-top: 14px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 12px;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #34d399; margin-bottom: 4px;">
                  🎙️ આ સ્લાઇડનું સ્ક્રિપ્ટ લખાણ:
                </div>
                <p style="font-size: 0.82rem; color: #cbd5e1; margin: 0; line-height: 1.45;">
                  ${curSlide.scriptText || 'સ્ક્રિપ્ટ લખવા માટે ડાબી બાજુએ સ્લાઇડમાં ટાઇપ કરો.'}
                </p>
              </div>

              <!-- Next Button -->
              <button id="btn-next-to-scriptwriter-preview" class="btn btn-primary" style="width: 100%; margin-top: 14px; padding: 11px; font-weight: 800; background: linear-gradient(135deg, #10b981, #059669); border: none; font-size: 0.92rem;">
                આગળ વધો: ૩. સ્ક્રિપ્ટ રાઇટર ➔
              </button>

            </div>

          </div>

        </div>
      ` : `
        <!-- ========================================================================= -->
        <!-- TAB 2: NOTEBOOKLM TOOL 2 PROMPT GENERATOR                                 -->
        <!-- ========================================================================= -->
        <div class="card" style="margin-bottom: 14px; background: #131722; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1rem;">🎯</span>
              <span style="font-size: 0.78rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">
                પસંદ કરેલ વિષય (Selected Topic)
              </span>
            </div>
          </div>
          <input type="text" id="slide-topic-input" class="form-input font-gu" value="${activeTopic}" style="width: 100%; background: #0a0d14; border: 1px solid #1e293b; color: #ffffff; font-size: 1.02rem; font-weight: 800; border-radius: 8px; padding: 10px 14px; box-sizing: border-box;" placeholder="પસંદ કરેલ વિષય...">
        </div>

        <div class="card" style="background: #131722; border: 1.5px solid #8b5cf6; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.25rem;">🖥️</span>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; color: #ffffff; margin: 0;">
                  NotebookLM Tool 2 પ્રોમ્પ્ટ
                </h3>
                <p style="color: #94a3b8; font-size: 0.78rem; margin: 2px 0 0 0;">
                  NotebookLM ના "Slide Deck" માટે ૧૬:૯ વ્હાઇટ PPT પ્રોમ્પ્ટ:
                </p>
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <button id="btn-copy-ppt-prompt" class="btn btn-secondary btn-sm" style="font-weight: 700; background: #8b5cf6; color: white; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; border: none; cursor: pointer;">
                <span id="copy-btn-icon">📋</span>
                <span id="copy-btn-text">કોપી ટૂલ ૨</span>
              </button>
              <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="font-weight: 700; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem; border: none; cursor: pointer; text-decoration: none;">
                <span>🚀</span> NotebookLM ખોલો ↗
              </a>
            </div>
          </div>

          <div style="position: relative; margin-top: 10px;">
            <textarea id="ppt-prompt-textarea" class="form-textarea font-gu" style="width: 100%; min-height: 380px; font-size: 0.84rem; line-height: 1.6; background: #0a0d14; border: 1px solid #1e293b; color: #e2e8f0; font-family: monospace; padding: 14px; border-radius: 8px; resize: vertical; box-sizing: border-box;">${tool2Prompt}</textarea>
          </div>
        </div>
      `}

      <!-- Bulk Paste Slides Modal -->
      <div id="modal-bulk-slides" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(6px); z-index: 9999; align-items: center; justify-content: center; padding: 20px;">
        <div class="card" style="width: 100%; max-width: 620px; background: #0f172a; border: 1.5px solid #38bdf8; border-radius: 14px; padding: 22px; box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>📋</span> સ્લાઇડ્સનું લખાણ પેસ્ટ કરો (Bulk Import)
            </h3>
            <button id="btn-close-bulk-modal" class="btn btn-outline btn-sm" style="border: none; font-size: 1.2rem; color: #94a3b8;">✕</button>
          </div>

          <p style="color: #94a3b8; font-size: 0.82rem; margin-bottom: 12px;">
            Word, PDF કે નોટપેડમાંથી તમારું લખાણ અહીં પેસ્ટ કરો. ખાલી લાઇન અથવા "સ્લાઇડ ૧, ૨..." પરથી સિસ્ટમ આપમેળે સ્લાઇડ્સ બનાવી દેશે.
          </p>

          <textarea id="bulk-slides-textarea" class="form-textarea" rows="10" placeholder="સ્લાઇડ ૧: શીર્ષક&#10;• મુદ્દો ૧&#10;• મુદ્દો ૨&#10;&#10;સ્લાઇડ ૨: શીર્ષક&#10;• મુદ્દો ૧" style="width: 100%; font-size: 0.88rem; line-height: 1.5; padding: 12px; background: #07090e; border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 8px; box-sizing: border-box; margin-bottom: 16px;"></textarea>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="btn-cancel-bulk" class="btn btn-secondary">રદ કરો</button>
            <button id="btn-submit-bulk" class="btn btn-success" style="font-weight: 800; padding: 9px 20px;">
              ✨ સ્લાઇડ્સ ઉમેરો
            </button>
          </div>
        </div>
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    // Navigation Tabs
    container.querySelector('#tab-btn-slides')?.addEventListener('click', () => {
      activeTab = 'slides';
      render();
    });
    container.querySelector('#tab-btn-notebooklm')?.addEventListener('click', () => {
      activeTab = 'notebooklm';
      render();
    });

    container.querySelector('#btn-open-full-slideeditor')?.addEventListener('click', () => {
      navigateTo('slideeditor');
    });

    // Top buttons
    container.querySelector('#btn-back-to-projects-slide')?.addEventListener('click', () => navigateTo('projects'));
    container.querySelector('#btn-prev-idea')?.addEventListener('click', () => navigateTo('topics'));
    container.querySelector('#btn-next-to-script')?.addEventListener('click', () => navigateTo('scriptwriter'));
    container.querySelector('#btn-next-to-scriptwriter-preview')?.addEventListener('click', () => navigateTo('scriptwriter'));

    if (activeTab === 'slides') {
      // Preview Selector Dropdown
      const selPreview = container.querySelector('#select-preview-slide');
      if (selPreview) {
        selPreview.addEventListener('change', (e) => {
          selectedSlideIdx = parseInt(e.target.value, 10);
          render();
        });
      }

      // Add New Slide Button
      const handleAddSlide = () => {
        const newId = Date.now();
        const colors = ['#DC2626', '#2563EB', '#10B981', '#7C3AED', '#EA580C'];
        const chosenColor = colors[slides.length % colors.length];
        slides.push({
          id: newId,
          title: `સ્લાઇડ #${slides.length + 1}: નવી વિગત`,
          subtitle: 'સત્તાવાર નિર્ણય સંદર્ભ',
          bulletPoints: ['મુખ્ય મુદ્દો ૧', 'મુખ્ય મુદ્દો ૨', 'મુદ્દો ૩'],
          audioTime: '',
          scriptText: 'આ સ્લાઇડ વખતે બોલવાની સ્ક્રિપ્ટ અહીં લખો.',
          bgColor: '#FFFFFF',
          textColor: '#0F172A',
          accentColor: chosenColor
        });
        selectedSlideIdx = slides.length - 1;
        saveCurrentSlides();
        render();
      };

      container.querySelector('#btn-add-new-slide')?.addEventListener('click', handleAddSlide);
      container.querySelector('#btn-add-slide-bottom')?.addEventListener('click', handleAddSlide);

      // Delete Slide
      container.querySelectorAll('.btn-delete-slide').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          if (confirm(`શું તમે ખરેખર સ્લાઇડ #${idx + 1} કાઢી નાખવા માંગો છો?`)) {
            slides.splice(idx, 1);
            if (selectedSlideIdx >= slides.length) selectedSlideIdx = Math.max(0, slides.length - 1);
            saveCurrentSlides();
            render();
          }
        });
      });

      // Preview button on slide card
      container.querySelectorAll('.btn-preview-slide').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedSlideIdx = parseInt(btn.getAttribute('data-idx'), 10);
          render();
          container.querySelector('#live-16x9-slide-canvas')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      });

      // Live Title inputs
      container.querySelectorAll('.slide-input-title').forEach(inp => {
        inp.addEventListener('input', () => {
          const idx = parseInt(inp.getAttribute('data-idx'), 10);
          if (slides[idx]) {
            slides[idx].title = inp.value;
            saveCurrentSlides();
            if (idx === selectedSlideIdx) updateLiveCanvas();
          }
        });
      });

      // Live Subtitle inputs
      container.querySelectorAll('.slide-input-subtitle').forEach(inp => {
        inp.addEventListener('input', () => {
          const idx = parseInt(inp.getAttribute('data-idx'), 10);
          if (slides[idx]) {
            slides[idx].subtitle = inp.value;
            saveCurrentSlides();
            if (idx === selectedSlideIdx) updateLiveCanvas();
          }
        });
      });

      // Live Bullets inputs
      container.querySelectorAll('.slide-input-bullets').forEach(tx => {
        tx.addEventListener('input', () => {
          const idx = parseInt(tx.getAttribute('data-idx'), 10);
          if (slides[idx]) {
            slides[idx].bulletPoints = tx.value.split('\n').map(s => s.trim()).filter(Boolean);
            saveCurrentSlides();
            if (idx === selectedSlideIdx) updateLiveCanvas();
          }
        });
      });

      // Live Narration Script inputs
      container.querySelectorAll('.slide-input-script').forEach(tx => {
        tx.addEventListener('input', () => {
          const idx = parseInt(tx.getAttribute('data-idx'), 10);
          if (slides[idx]) {
            slides[idx].scriptText = tx.value;
            saveCurrentSlides();
          }
        });
      });

      // Import from Script Button
      container.querySelector('#btn-import-from-script')?.addEventListener('click', () => {
        const cur = projectState.getActiveProject();
        if (cur?.script?.sections && cur.script.sections.length > 0) {
          slides = cur.script.sections.map((sec, i) => ({
            id: Date.now() + i,
            title: sec.sectionName || `સ્લાઇડ #${i + 1}`,
            subtitle: sec.timeRange || 'સત્તાવાર નિર્ણય સંદર્ભ',
            bulletPoints: sec.content ? sec.content.split(/[.।!\n]/).map(s => s.trim()).filter(s => s.length > 5).slice(0, 3) : ['મુખ્ય માહિતી'],
            audioTime: sec.timeRange || '',
            scriptText: sec.content || '',
            bgColor: '#FFFFFF',
            textColor: '#0F172A',
            accentColor: i === 0 ? '#DC2626' : (i === 1 ? '#2563EB' : '#10B981')
          }));
          selectedSlideIdx = 0;
          saveCurrentSlides();
          render();
          alert(`સ્ક્રિપ્ટમાંથી ${slides.length} સ્લાઇડ્સ સફળતાપૂર્વક બની ગઈ છે! ✓`);
        } else if (cur?.script?.fullText && cur.script.fullText.trim().length > 0) {
          const raw = cur.script.fullText.trim();
          const chunks = raw.split(/\n\s*\n/).filter(c => c.trim().length > 0);
          slides = chunks.map((chunk, i) => {
            const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
            const title = lines[0] ? lines[0].replace(/^\[?(સ્લાઇડ|Slide|ભાગ)\s*[0-9#:\-]+\]?\s*/i, '').replace(/\]$/, '') : `સ્લાઇડ #${i + 1}`;
            const bullets = lines.slice(1, 4).map(l => l.replace(/^[•\-\*0-9\.\)]+\s*/, ''));
            return {
              id: Date.now() + i,
              title: title || `સ્લાઇડ #${i + 1}`,
              subtitle: 'સત્તાવાર નિર્ણય સંદર્ભ',
              bulletPoints: bullets.length > 0 ? bullets : [lines[0] || 'મુખ્ય વિગત'],
              scriptText: chunk,
              audioTime: '',
              bgColor: '#FFFFFF',
              textColor: '#0F172A',
              accentColor: i === 0 ? '#DC2626' : (i === 1 ? '#2563EB' : '#10B981')
            };
          });
          selectedSlideIdx = 0;
          saveCurrentSlides();
          render();
          alert(`સ્ક્રિપ્ટમાંથી ${slides.length} સ્લાઇડ્સ સફળતાપૂર્વક બની ગઈ છે! ✓`);
        } else {
          alert('પ્રોજેક્ટમાં હજી સ્ક્રિપ્ટ લખેલી નથી. તમે અહીં સીધી સ્લાઇડ્સ લખી શકો છો અથવા સ્ટેપ ૩ માં સ્ક્રિપ્ટ લખી શકો છો.');
        }
      });

      // Bulk Paste Modal
      const modal = container.querySelector('#modal-bulk-slides');
      container.querySelector('#btn-bulk-paste-slides')?.addEventListener('click', () => {
        if (modal) modal.style.display = 'flex';
      });
      container.querySelector('#btn-close-bulk-modal')?.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
      });
      container.querySelector('#btn-cancel-bulk')?.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
      });

      container.querySelector('#btn-submit-bulk')?.addEventListener('click', () => {
        const raw = container.querySelector('#bulk-slides-textarea')?.value?.trim();
        if (!raw) {
          if (modal) modal.style.display = 'none';
          return;
        }

        // Split by double newline or "Slide" keywords
        const chunks = raw.split(/\n\s*\n/).filter(c => c.trim().length > 0);
        if (chunks.length > 0) {
          slides = chunks.map((chunk, i) => {
            const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
            const title = lines[0] ? lines[0].replace(/^(સ્લાઇડ|Slide|ભાગ)\s*[0-9#:\-]+\s*/i, '') : `સ્લાઇડ #${i + 1}`;
            const bullets = lines.slice(1, 4).map(l => l.replace(/^[•\-\*0-9\.\)]+\s*/, ''));
            return {
              id: Date.now() + i,
              title: title || `સ્લાઇડ #${i + 1}`,
              subtitle: 'સત્તાવાર નિર્ણય',
              bulletPoints: bullets.length > 0 ? bullets : ['મહત્વપૂર્ણ નિર્ણય', 'લાભાર્થી પાત્રતા'],
              scriptText: lines.join('. '),
              audioTime: '',
              bgColor: '#FFFFFF',
              textColor: '#0F172A',
              accentColor: i === 0 ? '#DC2626' : '#2563EB'
            };
          });
          selectedSlideIdx = 0;
          saveCurrentSlides();
          if (modal) modal.style.display = 'none';
          render();
          alert(`🎉 સફળતાપૂર્વક ${slides.length} સ્લાઇડ્સ ઉમેરાઈ ગઈ છે અને પ્રોજેક્ટમાં સેવ થઈ ગઈ છે!`);
        }
      });
    }

    if (activeTab === 'notebooklm') {
      const topicInput = container.querySelector('#slide-topic-input');
      const pptTextarea = container.querySelector('#ppt-prompt-textarea');
      const btnCopyPpt = container.querySelector('#btn-copy-ppt-prompt');
      const copyBtnLabel = container.querySelector('#copy-btn-text');
      const copyBtnIcon = container.querySelector('#copy-btn-icon');

      btnCopyPpt?.addEventListener('click', () => {
        const textToCopy = pptTextarea ? pptTextarea.value : tool2Prompt;
        copyToClipboard(textToCopy, 'NotebookLM ૧૬:૯ વ્હાઇટ PPT પ્રોમ્પ્ટ કોપી થઈ ગયો! ✓', btnCopyPpt);
        if (copyBtnLabel) copyBtnLabel.textContent = '✓ કોપી થઈ ગયું!';
        if (copyBtnIcon) copyBtnIcon.textContent = '✓';
        setTimeout(() => {
          if (copyBtnLabel) copyBtnLabel.textContent = 'કોપી ટૂલ ૨';
          if (copyBtnIcon) copyBtnIcon.textContent = '📋';
        }, 2000);
      });

      pptTextarea?.addEventListener('input', () => {
        tool2Prompt = pptTextarea.value;
        projectState.updateTool('slide', { tool2Prompt, isCompleted: true });
      });

      topicInput?.addEventListener('input', (e) => {
        activeTopic = e.target.value.trim() || activeTopic;
        projectState?.setTopic(activeTopic);
        tool2Prompt = getTool2PromptText(activeTopic);
        if (pptTextarea) pptTextarea.value = tool2Prompt;
        projectState.updateTool('slide', { tool2Prompt, isCompleted: true });
      });
    }
  }

  function updateLiveCanvas() {
    const curSlide = slides[selectedSlideIdx] || slides[0] || {};
    const canvas = container.querySelector('#live-16x9-slide-canvas');
    if (!canvas) return;

    canvas.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px;">
        <span style="font-size: 0.75rem; font-weight: 800; color: #dc2626; text-transform: uppercase; letter-spacing: 0.5px;">
          🎯 GYAN YATRA • સરકારી યોજના & નિર્ણય
        </span>
        <span style="font-size: 0.72rem; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">
          ${curSlide.audioTime || '16:9 HD'}
        </span>
      </div>

      <div style="margin-bottom: 8px;">
        <div style="display: inline-block; background: #0f172a; color: #ffffff; padding: 6px 14px; border-radius: 6px; font-size: 1.05rem; font-weight: 900; line-height: 1.35; margin-bottom: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
          ${curSlide.title || 'સ્લાઇડ શીર્ષક'}
        </div>
        <div style="font-size: 0.8rem; font-weight: 700; color: #475569; margin-left: 2px;">
          ${curSlide.subtitle || ''}
        </div>
      </div>

      <div style="flex: 1; display: flex; flex-direction: column; gap: 8px; justify-content: center; margin-bottom: 8px;">
        ${((Array.isArray(curSlide.bulletPoints) ? curSlide.bulletPoints : String(curSlide.bulletPoints || '').split('\n')).filter(Boolean)).map(b => `
          <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.82rem; font-weight: 700; color: #1e293b; line-height: 1.4;">
            <span style="color: #dc2626; font-size: 1rem; line-height: 1;">●</span>
            <span>${b.replace(/^[•\-\*0-9\.\)]+\s*/, '')}</span>
          </div>
        `).join('')}
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1.5px solid #f1f5f9; padding-top: 6px; font-size: 0.68rem; color: #94a3b8; font-weight: 600;">
        <span>સત્તાવાર નિર્ણય • ૧૦૦% સાચી વિગત</span>
        <span style="font-weight: 800; color: #0f172a;">સ્લાઇડ #${selectedSlideIdx + 1} / ${slides.length}</span>
      </div>
    `;
  }

  // Initial render
  render();
}
