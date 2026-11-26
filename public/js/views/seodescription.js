import { copyToClipboard, showNoticeToast, animateCopyButton } from '../utils/clipboard.js';
import { projectState } from '../utils/projectState.js';

export async function renderSEODescription(container, navigateTo) {
  // Read active topic from project state
  const activeProj = (typeof projectState !== 'undefined' && projectState.getActiveProject) ? projectState.getActiveProject() : null;
  const project = (projectState && typeof projectState.getProject === 'function')
    ? projectState.getProject()
    : (projectState?.project || {});

  const storedTopic = (typeof localStorage !== 'undefined' ? (localStorage.getItem('gyan_active_topic_name') || '') : '').trim();
  let currentTopic = (window.prefillTopic || storedTopic || (activeProj && (activeProj.topic || activeProj.name)))
    ? (window.prefillTopic || storedTopic || activeProj.topic || activeProj.name).trim()
    : ((project && project.topic && project.topic.trim().length > 0)
      ? project.topic.trim()
      : 'ગુજરાત કર્મચારી પગાર અને ૫૦% DA વધારો નિયમો ૨૦૨૬');

  // Function to generate the master prompt
  function generateMasterSEOPrompt(topic) {
    const cleanTopic = (topic || '').trim() || 'ગુજરાત સરકારી યોજના અને ભરતી પરિપત્ર';
    return `તમે એક વરિષ્ઠ YouTube SEO, Title & Algorithm Strategist છો.
મારી ચેનલનું નામ: "જ્ઞાન યાત્રા" (Gyan Yatra)
વિષય (Topic): "${cleanTopic}"
કેટેગરી: સત્તાવાર સરકારી માહિતી, ભરતી, કર્મચારી પરિપત્ર અને નિયમો (સચોટ સાબિતી સાથે).
લક્ષ્ય: YouTube Search અને Browse Features માં #1 રેન્ક મેળવવું અને હાઈ-CTR (ક્લિકબેટ મુક્ત) ટ્રાફિક લાવવો.

આ વિષય માટે નીચે મુજબની તમામ વિગતો સંપૂર્ણ શુદ્ધ ગુજરાતીમાં તૈયાર કરો:

============================================================
૧. 🎯 ૫ સુપરહિટ હાઇ-CTR ટાઇટલ્સ (HIGH-CTR CLICKABLE TITLES)
============================================================
(👉 નિયમ: ૬૦ થી ૭૦ અક્ષરો, મોબાઇલ સ્ક્રીન પર સ્પષ્ટ વંચાય તેવા, ગુજરાતી + મહત્વના અંગ્રેજી કીવર્ડ્સ સાથે)
- Option 1 (સત્તાવાર પુરાવા & પરિપત્ર શૈલી): પરિપત્ર/તારીખ સાથે
- Option 2 (સીધો ફાયદો & જિજ્ઞાસા શૈલી): દર્શકના ખિસ્સા/નોકરી પર સીધી અસર દર્શાવતું
- Option 3 (ધમાકેદાર જાહેરાત શૈલી): બોલ્ડ આંકડાઓ સાથે (દા.ત. ૫૦% DA, ₹૧૫,૦૦૦)
- Option 4 (Search Optimized શૈલી): YouTube Search માં દર્શક જે ટાઈપ કરે તેવું
- Option 5 (પંચી & શોર્ટ શૈલી): અંડર ૫૫ કેરેક્ટર

============================================================
૨. 📄 સંપૂર્ણ YouTube SEO ડિસ્ક્રિપ્શન (FULL VIRAL DESCRIPTION)
============================================================
(👉 નીચે આપેલા તમામ ૬ વિભાગો સાથે સંપૂર્ણ ડિસ્ક્રિપ્શન લખો:)

[વિભાગ A - પ્રથમ ૩ લીટીનો પાવરફુલ હૂક]:
વિડીયોની શરૂઆતનું શક્તિશાળી વર્ણન જેમાં મુખ્ય કીવર્ડ્સ કુદરતી રીતે આવી જાય.

[વિભાગ B - મુખ્ય હાઇલાઇટ્સ અને મુદ્દા (Key Highlights)]:
બુલેટ પોઇન્ટ્સ સાથે દર્શકોને વિડીયોમાં શું જાણવા મળશે તેની વિગતવાર યાદી.

[વિભાગ C - વિડીયો ચેપ્ટર્સ / ટાઇમસ્ટેમ્પ્સ (Timestamps)]:
00:00 - વિષય પરિચય & સત્તાવાર હૂક
01:15 - સત્તાવાર પરિપત્ર અને જાહેરાત
03:40 - પાત્રતા, નિયમો અને મહત્વની શરતો
06:20 - કોને કેટલો લાભ મળશે? (ગણતરી ટેબલ)
08:10 - ઓનલાઇન ફોર્મ અને જરૂરી પુરાવા ચેકલિસ્ટ
09:30 - નિષ્કર્ષ અને મહત્વની સલાહ

[વિભાગ D - સત્તાવાર પોર્ટલ અને ફોર્મ લિંક્સ]:
અધિકૃત સરકારી પોર્ટલ (OJAS, iKhedut, Digital Gujarat) અને PDF ડાઉનલોડ લિંક માટે પ્લેસહોલ્ડર્સ.

[વિભાગ E - કાયદાકીય ડિસ્ક્લેમર (Educational Disclaimer)]:
શિક્ષણ અને જાગૃતિ હેતુ માટેનું સત્તાવાર ડિસ્ક્લેમર.

[વિભાગ F - સોશિયલ મીડિયા & સબસ્ક્રાઇબ લિંક્સ]:
Gyan Yatra ચેનલ સબ્સ્ક્રિપ્શન લિંક.

============================================================
૩. 🏷️ ૩૫ સર્વોચ્ચ રેન્કિંગ કીવર્ડ્સ & ટેગ્સ (TAGS FOR STUDIO)
============================================================
(👉 YouTube Studio માં સીધા કોપી-પેસ્ટ કરવા માટે કોમા (comma-separated) સાથે સિંગલ પેરાગ્રાફમાં ૩૫ બેસ્ટ કીવર્ડ્સ આપો):

============================================================
૪. 📌 હાઇ-એન્ગેજમેન્ટ પિન કમેન્ટ (PINNED COMMENT)
============================================================
દર્શકો લાઈક અને કમેન્ટ કરે તેવો ૧ આકર્ષક સવાલ સાથેનો પિન કમેન્ટ સંદેશ.

============================================================
૫. #️⃣ ૫ વાયરલ હેશટેગ્સ (HASHTAGS)
============================================================
ટ્રેન્ડિંગ અને વિષયને અનુરૂપ ૫ બેસ્ટ હેશટેગ્સ.

કોઈપણ વધારાની ભૂમિકા બાંધ્યા વગર સીધું જ ૧ થી ૫ પોઇન્ટ્સનું સંપૂર્ણ આઉટપુટ આપો!`;
  }

  function render() {
    const currentPrompt = generateMasterSEOPrompt(currentTopic);

    container.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 40px;">
        
        <!-- Project Context Header -->
        <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: var(--radius-lg); padding: 14px 20px; margin-bottom: 18px; box-shadow: 0 8px 25px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <button id="btn-back-to-projects-seo" class="btn btn-outline btn-sm" style="font-weight: 700;">← બધા પ્રોજેક્ટ્સ</button>
            <button id="btn-prev-thumb-seo" class="btn btn-secondary btn-sm" style="font-weight: 700;">← ૬. Thumbnail Maker</button>
            <span style="font-size: 0.85rem; color: #38bdf8; font-weight: 800; background: rgba(56,189,248,0.12); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(56,189,248,0.3);">
              📁 પ્રોજેક્ટ: ${currentTopic}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge badge-green" style="font-size: 0.72rem; font-weight: 800;">✓ Auto-Saved</span>
            <button id="btn-goto-videoeditor-seo" class="btn btn-outline btn-sm" style="font-weight: 700; border-color: #38bdf8; color: #38bdf8;">
              🎥 ૫. Video Editor
            </button>
          </div>
        </div>

        <!-- Top Hero Header -->
        <div class="card" style="margin-bottom: 22px; padding: 22px 26px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%); border: 1.5px solid #10b981; border-radius: 16px; box-shadow: 0 10px 32px rgba(16, 185, 129, 0.2);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 54px; height: 54px; border-radius: 14px; background: rgba(16, 185, 129, 0.25); display: flex; align-items: center; justify-content: center; font-size: 1.9rem; border: 1px solid rgba(16, 185, 129, 0.5); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">
                🚀
              </div>
              <div>
                <h2 style="font-size: 1.45rem; font-weight: 800; color: #ffffff; margin: 0 0 4px 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <span>૭. SEO, ટાઈટલ & ડિસ્ક્રિપ્શન પ્રોમ્પ્ટ</span>
                  <span class="badge" style="background: rgba(16,185,129,0.25); color: #34d399; border: 1px solid #10b981; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 6px;">PROMPT ONLY</span>
                </h2>
                <p style="color: #cbd5e1; font-size: 0.88rem; margin: 0;">
                  ૫ હાઈ-CTR ટાઈટલ્સ, સંપૂર્ણ ડિસ્ક્રિપ્શન (ચેપ્ટર્સ સાથે), ૩૫ ટેગ્સ અને પિન કમેન્ટનો શ્રેષ્ઠ માસ્ટર પ્રોમ્પ્ટ ૧-ક્લિકમાં કોપી કરો.
                </p>
              </div>
            </div>

            <!-- Quick Action Link directly to chatgpt.com -->
            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
              <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" id="btn-top-open-chatgpt-web" class="btn btn-outline" style="border: 1.5px solid #10b981; color: #6ee7b7; font-weight: 700; padding: 10px 18px; border-radius: 10px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background: rgba(16,185,129,0.12);" title="ChatGPT (chatgpt.com) સીધું નવી ટેબમાં ખોલો">
                <span>⚡</span> chatgpt.com ખોલો ↗
              </a>
            </div>
          </div>
        </div>

        <!-- Live Topic Input & Preset Chips -->
        <div class="card" style="margin-bottom: 20px; padding: 18px 22px; border: 1px solid #1e293b; background: #0b1120; border-radius: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <label for="seo-active-topic-input" style="font-size: 0.88rem; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px;">
              <span>📌</span> વિષય / ટોપિકનું નામ (Topic Name):
            </label>
            <span style="font-size: 0.78rem; color: #94a3b8;">વિષય બદલતા જ નીચેનો પ્રોમ્પ્ટ આપમેળે તૈયાર થઈ જશે</span>
          </div>

          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <input 
              type="text" 
              id="seo-active-topic-input" 
              class="form-input font-gu" 
              value="${currentTopic}" 
              placeholder="જે વિષય માટે SEO, ટાઈટલ અને ડિસ્ક્રિપ્શન બનાવવું હોય તે અહીં લખો..." 
              style="width: 100%; font-size: 1.05rem; font-weight: 700; padding: 12px 16px; background: #07090e; border: 2px solid #10b981; border-radius: 10px; color: #ffffff; box-sizing: border-box; outline: none;"
            />
            <button id="btn-clear-active-topic" type="button" class="btn btn-secondary" style="padding: 0 16px; font-weight: 700; border-radius: 10px;" title="સાફ કરો">
              ✕
            </button>
          </div>

          <!-- Preset Concept Chips -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span style="font-size: 0.78rem; color: #94a3b8; font-weight: 700;">ઝડપી ટોપિક પસંદ કરો:</span>
            <button type="button" class="btn-preset-seo" data-topic="ગુજરાત કર્મચારી પગાર અને ૫૦% DA વધારો નિયમો ૨૦૨૬" style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); color: #7dd3fc; font-size: 0.78rem; font-weight: 700; padding: 5px 12px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">
              🏛️ DA & પગાર વધારો
            </button>
            <button type="button" class="btn-preset-seo" data-topic="ગુજરાત આંગણવાડી કાર્યકર તેડાગર માનદવેતન વધારો અને નવી ભરતી ૨૦૨૬" style="background: rgba(236,72,153,0.1); border: 1px solid rgba(236,72,153,0.3); color: #f472b6; font-size: 0.78rem; font-weight: 700; padding: 5px 12px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">
              👩‍🏫 આંગણવાડી ભરતી & માનદવેતન
            </button>
            <button type="button" class="btn-preset-seo" data-topic="ગુજરાત પોલીસ કોન્સ્ટેબલ અને PSI સત્તાવાર ભરતી પરીક્ષા તારીખ ૨૦૨૬" style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #34d399; font-size: 0.78rem; font-weight: 700; padding: 5px 12px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">
              👮‍♂️ પોલીસ & LRD ભરતી
            </button>
            <button type="button" class="btn-preset-seo" data-topic="પીએમ કિસાન ૧૯મો હપ્તો ₹૨,૦૦૦ તારીખ અને નવી કિસાન સહાય યોજના" style="background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); color: #fbbf24; font-size: 0.78rem; font-weight: 700; padding: 5px 12px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">
              🌾 કિસાન સહાય & ૧૯મો હપ્તો
            </button>
            <button type="button" class="btn-preset-seo" data-topic="ગુજરાત પ્રાથમિક અને માધ્યમિક શિક્ષક ભરતી (TET / TAT) સત્તાવાર જાહેરાત" style="background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.3); color: #c084fc; font-size: 0.78rem; font-weight: 700; padding: 5px 12px; border-radius: 20px; cursor: pointer; transition: all 0.2s;">
              🎓 TET / TAT શિક્ષક ભરતી
            </button>
          </div>
        </div>

        <!-- FULL-WIDTH MASTER SEO PROMPT CARD (PROMPT ONLY) -->
        <div class="card" style="border: 1.5px solid #10b981; background: #0f172a; padding: 24px; border-radius: 16px; box-shadow: 0 10px 35px rgba(0,0,0,0.45); margin-bottom: 24px;">
          
          <!-- Card Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid rgba(16, 185, 129, 0.25); flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.6rem; background: rgba(16,185,129,0.15); padding: 8px 12px; border-radius: 12px; border: 1px solid rgba(16,185,129,0.3);">📋</span>
              <div>
                <h3 style="font-size: 1.22rem; font-weight: 800; color: #ffffff; margin: 0 0 2px 0;">
                  બેસ્ટ YouTube SEO, ટાઈટલ & ડિસ્ક્રિપ્શન માસ્ટર પ્રોમ્પ્ટ
                </h3>
                <span style="font-size: 0.8rem; color: #7dd3fc; font-weight: 600;">
                  ૫ ક્લિકેબલ ટાઈટલ્સ • સંપૂર્ણ ડિસ્ક્રિપ્શન & ચેપ્ટર્સ • ૩૫ ટેગ્સ • પિન કમેન્ટ • ૫ હેશટેગ્સ
                </span>
              </div>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button id="btn-copy-seo-master" class="btn btn-success" style="font-weight: 800; font-size: 0.92rem; padding: 10px 20px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.4);">
                <span>📋</span> ૧-ક્લિક આખો પ્રોમ્પ્ટ કોપી કરો
              </button>
              <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="border: 1.5px solid #10b981; color: #6ee7b7; font-weight: 800; font-size: 0.88rem; padding: 10px 18px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; background: rgba(16,185,129,0.12);" title="ChatGPT ખોલો">
                <span>⚡</span> ChatGPT ખોલો ↗
              </a>
            </div>
          </div>

          <!-- Master Prompt Textarea -->
          <div style="position: relative; margin-bottom: 16px;">
            <textarea 
              id="seo-master-prompt-textarea" 
              class="form-input font-gu" 
              readonly 
              style="width: 100%; height: 440px; font-size: 0.88rem; line-height: 1.65; background: #07090e; color: #f1f5f9; border: 1.5px solid #334155; border-radius: 12px; padding: 16px; box-sizing: border-box; resize: vertical; font-family: monospace, var(--font-gu);"
            >${currentPrompt}</textarea>
          </div>

          <!-- Quick Snippet Copy Buttons -->
          <div style="padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 0.78rem; font-weight: 800; color: #94a3b8;">
                વિભાગવાર પ્રોમ્પ્ટ કોપી કરો (Specific Snippets):
              </span>
              <button type="button" class="btn btn-outline btn-sm btn-quick-copy-part" data-part="titles" style="font-size: 0.74rem; padding: 6px 12px; border-radius: 6px;">
                🎯 ફક્ત ૫ ટાઈટલ પ્રોમ્પ્ટ
              </button>
              <button type="button" class="btn btn-outline btn-sm btn-quick-copy-part" data-part="description" style="font-size: 0.74rem; padding: 6px 12px; border-radius: 6px;">
                📄 ફક્ત ડિસ્ક્રિપ્શન પ્રોમ્પ્ટ
              </button>
              <button type="button" class="btn btn-outline btn-sm btn-quick-copy-part" data-part="tags" style="font-size: 0.74rem; padding: 6px 12px; border-radius: 6px;">
                🏷️ ફક્ત ૩૫ ટેગ્સ પ્રોમ્પ્ટ
              </button>
              <button type="button" class="btn btn-outline btn-sm btn-quick-copy-part" data-part="pinned" style="font-size: 0.74rem; padding: 6px 12px; border-radius: 6px;">
                📌 ફક્ત પિન કમેન્ટ & Tags
              </button>
            </div>

            <button id="btn-footer-chatgpt-open" class="btn btn-outline btn-sm" style="font-size: 0.74rem; padding: 6px 12px; border-color: #38bdf8; color: #38bdf8; border-radius: 6px;">
              chatgpt.com ↗
            </button>
          </div>

        </div>

        <!-- CONNECTED WORKFLOW STEPPER BAR (TOOLS 1 TO 7 JOODAN) -->
        <div class="card workspace-bottom-stepper" style="background: rgba(15, 23, 42, 0.95); border: 1.5px solid rgba(16, 185, 129, 0.35); border-radius: 12px; padding: 14px 20px; margin-top: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.4rem;">🔗</span>
            <div>
              <div style="font-size: 0.78rem; color: #38bdf8; font-weight: 700;">
                વિડીયો વર્કફ્લો જોડાણ: <strong>પબ્લિશિંગ સ્ટેજ (સંપૂર્ણ પૂર્ણ)</strong>
              </div>
              <div style="font-weight: 800; font-size: 0.95rem; color: #ffffff;">
                SEO (વાયરલ ટાઈટલ, ડિસ્ક્રિપ્શન & ૩૫ ટેગ્સ)
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <button id="ws-btn-bottom-prev-seo" class="btn btn-outline btn-sm" style="font-weight: 700; border-color: rgba(255,255,255,0.25); color: #cbd5e1; cursor: pointer;">
              ← પાછલું પગલું: ૭. Thumbnail
            </button>
            <span class="badge" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; font-weight: 900; padding: 8px 16px; border-radius: 8px; font-size: 0.85rem;">
              ✓ વિડીયો નિર્માણ સંપૂર્ણ પૂર્ણ!
            </span>
          </div>
        </div>

      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    const topicInput = container.querySelector('#seo-active-topic-input');
    const promptTextarea = container.querySelector('#seo-master-prompt-textarea');

    // Live Topic Input Change
    topicInput?.addEventListener('input', () => {
      currentTopic = topicInput.value.trim() || 'ગુજરાત સરકારી પરિપત્ર નિર્ણય ૨૦૨૬';
      if (promptTextarea) {
        promptTextarea.value = generateMasterSEOPrompt(currentTopic);
      }
      projectState.updateProject({ topic: currentTopic });
    });

    // Clear Topic Button
    container.querySelector('#btn-clear-active-topic')?.addEventListener('click', () => {
      topicInput.value = '';
      topicInput.focus();
      currentTopic = '';
      if (promptTextarea) {
        promptTextarea.value = generateMasterSEOPrompt('');
      }
    });

    // Preset Topic Chips
    container.querySelectorAll('.btn-preset-seo').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.getAttribute('data-topic');
        if (t) {
          topicInput.value = t;
          currentTopic = t;
          projectState.updateProject({ topic: t });
          if (promptTextarea) {
            promptTextarea.value = generateMasterSEOPrompt(t);
          }
          showNoticeToast(`વિષય સેટ થયો: ${btn.textContent.trim()}`, 'success');
        }
      });
    });

    // Copy Master Prompt Button
    container.querySelector('#btn-copy-seo-master')?.addEventListener('click', (e) => {
      const text = promptTextarea?.value || generateMasterSEOPrompt(currentTopic);
      copyToClipboard(text, '📋 બેસ્ટ SEO & ડિસ્ક્રિપ્શન પ્રોમ્પ્ટ કોપી થઈ ગયો! ✓', e.currentTarget);
      animateCopyButton(e.currentTarget);
    });

    // Direct ChatGPT Web Open Button
    const openChatGPTWebWithPrompt = (e) => {
      const text = promptTextarea?.value || generateMasterSEOPrompt(currentTopic);
      copyToClipboard(text, 'પ્રોમ્પ્ટ કોપી થઈ ગયો! ChatGPT માં Ctrl+V કરો 📋', e?.currentTarget);
      window.open('https://chatgpt.com', '_blank');
    };

    container.querySelector('#btn-top-open-chatgpt-web')?.addEventListener('click', openChatGPTWebWithPrompt);
    container.querySelector('#btn-footer-chatgpt-open')?.addEventListener('click', openChatGPTWebWithPrompt);

    // Navigation Banner Buttons
    container.querySelector('#btn-back-to-projects-seo')?.addEventListener('click', () => navigateTo('projects'));
    container.querySelector('#btn-prev-thumb-seo')?.addEventListener('click', () => navigateTo('thumbnails'));
    container.querySelector('#ws-btn-bottom-prev-seo')?.addEventListener('click', () => navigateTo('thumbnails'));
    container.querySelector('#btn-goto-videoeditor-seo')?.addEventListener('click', () => navigateTo('videoeditor'));

    // Quick Snippet Copy Buttons
    container.querySelectorAll('.btn-quick-copy-part').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const part = btn.getAttribute('data-part');
        let snippet = '';
        if (part === 'titles') {
          snippet = `વિષય: "${currentTopic}" માટે YouTube Search અને Browse Features માં રેન્ક થાય તેવા ૫ સુપરહિટ હાઇ-CTR વાયરલ ટાઈટલ્સ ગુજરાતી + અંગ્રેજી મિક્સમાં આપો.`;
        } else if (part === 'description') {
          snippet = `વિષય: "${currentTopic}" માટે YouTube નું સંપૂર્ણ SEO ફ્રેન્ડલી ડિસ્ક્રિપ્શન લખો જેમાં શરૂઆતનો હૂક, બુલેટ પોઇન્ટ્સ, વિડીયો ટાઇમસ્ટેમ્પ્સ (00:00 થી અંત સુધી) અને ડિસ્ક્લેમર સામેલ હોય.`;
        } else if (part === 'tags') {
          snippet = `વિષય: "${currentTopic}" માટે YouTube Studio માં સીધા પેસ્ટ કરવા માટે કોમા (comma-separated) સાથે ૩૫ સર્વોચ્ચ રેન્કિંગ સર્ચ કીવર્ડ્સ અને ટેગ્સ આપો.`;
        } else if (part === 'pinned') {
          snippet = `વિષય: "${currentTopic}" માટે YouTube વિડીયો પર મૂકવા માટે ૧ આકર્ષક પિન કમેન્ટ અને ૫ વાયરલ હેશટેગ્સ આપો.`;
        }
        copyToClipboard(snippet, `📋 ${btn.textContent.trim()} કોપી થઈ ગયો! ✓`, e.currentTarget);
      });
    });
  }

  // Initial render
  render();
}
