import { api } from '../api.js';
import { copyToClipboard, showNoticeToast, animateCopyButton } from '../utils/clipboard.js';
import { projectState } from '../utils/projectState.js';

export async function renderSEODescription(container, navigateTo) {
  // Read active topic from project state
  const project = (projectState && typeof projectState.getProject === 'function')
    ? projectState.getProject()
    : (projectState?.project || {});

  let currentTopic = (project && project.topic && project.topic.trim().length > 0)
    ? project.topic.trim()
    : 'ગુજરાત કર્મચારી પગાર અને ૫૦% DA વધારો નિયમો ૨૦૨૬';

  // Chat state
  let chatHistory = [
    {
      role: 'assistant',
      content: `નમસ્તે! હું તમારો YouTube SEO & Algorithm સહાયક છું.\n\nડાબી બાજુ તમારા વિષય **"${currentTopic}"** માટે શ્રેષ્ઠ SEO, ટાઈટલ અને ડિસ્ક્રિપ્શન પ્રોમ્પ્ટ તૈયાર છે. તમે તેને **૧-ક્લિકમાં કોપી** કરી શકો છો અથવા **"બાજુમાં ChatGPT ને મોકલો"** બટન દબાવીને અહીં મારી સાથે લાઈવ સ્ક્રિપ્ટિંગ કરી શકો છો!`
    }
  ];
  let isSending = false;

  // Function to generate the master prompt
  function generateMasterSEOPrompt(topic) {
    const cleanTopic = topic.trim() || 'ગુજરાત સરકારી યોજના અને ભરતી પરિપત્ર';
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
      <!-- Top Hero Header -->
      <div class="card" style="margin-bottom: 22px; padding: 22px 26px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%); border: 1.5px solid #10b981; border-radius: 16px; box-shadow: 0 10px 32px rgba(16, 185, 129, 0.2);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 54px; height: 54px; border-radius: 14px; background: rgba(16, 185, 129, 0.25); display: flex; align-items: center; justify-content: center; font-size: 1.9rem; border: 1px solid rgba(16, 185, 129, 0.5); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">
              🚀
            </div>
            <div>
              <h2 style="font-size: 1.45rem; font-weight: 800; color: #ffffff; margin: 0 0 4px 0; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span>૬. SEO, ટાઈટલ & ડિસ્ક્રિપ્શન (ChatGPT Hub)</span>
                <span class="badge" style="background: rgba(16,185,129,0.25); color: #34d399; border: 1px solid #10b981; font-size: 0.75rem; font-weight: 800; padding: 4px 10px; border-radius: 6px;">VIRAL SEO READY</span>
              </h2>
              <p style="color: #cbd5e1; font-size: 0.88rem; margin: 0;">
                ડાબી બાજુ ટોપિક સંબંધિત <strong>બેસ્ટ SEO પ્રોમ્પ્ટ</strong> કોપી કરો અને જમણી બાજુ <strong>ChatGPT</strong> સાથે લાઈવ સ્ક્રિપ્ટિંગ કરો!
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
          <span style="font-size: 0.78rem; color: #94a3b8;">વિષય બદલતા જ પ્રોમ્પ્ટ આપમેળે અપડેટ થઈ જશે</span>
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

      <!-- MAIN 2-COLUMN SIDE-BY-SIDE WORKSPACE -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 20px; align-items: stretch; margin-bottom: 24px;">

        <!-- ==========================================
             LEFT SIDE (COLUMN 1): BEST SEO PROMPT
             ========================================== -->
        <div class="card" style="border: 1.5px solid rgba(56, 189, 248, 0.35); background: #0f172a; padding: 20px; border-radius: 16px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 30px rgba(0,0,0,0.4);">
          <div>
            <!-- Column 1 Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid rgba(56, 189, 248, 0.2);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.5rem; background: rgba(56,189,248,0.15); padding: 6px 10px; border-radius: 10px; border: 1px solid rgba(56,189,248,0.3);">📋</span>
                <div>
                  <h3 style="font-size: 1.15rem; font-weight: 800; color: #ffffff; margin: 0;">
                    બેસ્ટ SEO, ટાઈટલ & ડિસ્ક્રિપ્શન પ્રોમ્પ્ટ
                  </h3>
                  <span style="font-size: 0.76rem; color: #7dd3fc;">
                    ૫ ટાઈટલ્સ • સંપૂર્ણ ડિસ્ક્રિપ્શન • ચેપ્ટર્સ • ૩૫ ટેગ્સ
                  </span>
                </div>
              </div>

              <span class="badge" style="background: rgba(56,189,248,0.15); color: #38bdf8; font-size: 0.72rem; font-weight: 700; border: 1px solid rgba(56,189,248,0.3);">
                Master Prompt
              </span>
            </div>

            <!-- Action Buttons Above Textarea -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;">
              <button id="btn-copy-seo-master" class="btn btn-success btn-sm" style="flex: 1; font-weight: 800; font-size: 0.82rem; padding: 9px 14px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 3px 12px rgba(16,185,129,0.3);">
                <span>📋</span> આખો પ્રોમ્પ્ટ કોપી કરો
              </button>
              <button id="btn-send-prompt-to-chat" class="btn btn-primary btn-sm" style="flex: 1; font-weight: 800; font-size: 0.82rem; padding: 9px 14px; background: linear-gradient(135deg, #38bdf8, #2563eb); border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 3px 12px rgba(56,189,248,0.3);">
                <span>💬</span> બાજુમાં ChatGPT ને મોકલો ➔
              </button>
            </div>

            <!-- Master Prompt Textarea -->
            <div style="position: relative;">
              <textarea 
                id="seo-master-prompt-textarea" 
                class="form-input font-gu" 
                readonly 
                style="width: 100%; height: 380px; font-size: 0.82rem; line-height: 1.6; background: #07090e; color: #e2e8f0; border: 1.5px solid #334155; border-radius: 10px; padding: 14px; box-sizing: border-box; resize: vertical; font-family: monospace, var(--font-gu);"
              >${currentPrompt}</textarea>
            </div>

            <!-- Quick Snippet Copy Buttons -->
            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);">
              <span style="font-size: 0.74rem; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 8px;">
                વિભાગવાર પ્રોમ્પ્ટ કોપી કરો (Specific Snippets):
              </span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <button type="button" class="btn btn-outline btn-sm btn-quick-copy-part" data-part="titles" style="font-size: 0.72rem; padding: 5px 10px;">
                  🎯 ફક્ત ૫ ટાઈટલ પ્રોમ્પ્ટ
                </button>
                <button type="button" class="btn btn-outline btn-sm btn-quick-copy-part" data-part="description" style="font-size: 0.72rem; padding: 5px 10px;">
                  📄 ફક્ત ડિસ્ક્રિપ્શન પ્રોમ્પ્ટ
                </button>
                <button type="button" class="btn btn-outline btn-sm btn-quick-copy-part" data-part="tags" style="font-size: 0.72rem; padding: 5px 10px;">
                  🏷️ ફક્ત ૩૫ ટેગ્સ પ્રોમ્પ્ટ
                </button>
              </div>
            </div>
          </div>

          <div style="margin-top: 14px; background: rgba(56,189,248,0.06); border: 1px solid rgba(56,189,248,0.2); border-radius: 8px; padding: 10px 14px; font-size: 0.75rem; color: #7dd3fc; display: flex; align-items: center; justify-content: space-between;">
            <span>💡 આ પ્રોમ્પ્ટ કોપી કરી ૧-ક્લિકમાં ChatGPT માં પેસ્ટ કરો!</span>
            <button id="btn-footer-chatgpt-open" class="btn btn-outline btn-sm" style="font-size: 0.7rem; padding: 2px 8px; border-color: #38bdf8; color: #38bdf8;">
              chatgpt.com ↗
            </button>
          </div>
        </div>

        <!-- ==========================================
             RIGHT SIDE (COLUMN 2): LIVE CHATGPT
             ========================================== -->
        <div class="card" style="border: 1.5px solid #10b981; background: #0f172a; padding: 20px; border-radius: 16px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 8px 30px rgba(0,0,0,0.4);">
          <div>
            <!-- Column 2 Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid rgba(16, 185, 129, 0.3);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.5rem; background: rgba(16,185,129,0.15); padding: 6px 10px; border-radius: 10px; border: 1px solid rgba(16,185,129,0.3);">💬</span>
                <div>
                  <h3 style="font-size: 1.15rem; font-weight: 800; color: #ffffff; margin: 0;">
                    બાજુમાં ChatGPT (Live Assistant)
                  </h3>
                  <span style="font-size: 0.76rem; color: #6ee7b7;">
                    ઓન-સ્ક્રીન AI ચેટ • લાઈવ ગુજરાતી જવાબો
                  </span>
                </div>
              </div>

              <div style="display: flex; gap: 6px; align-items: center;">
                <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size: 0.72rem; padding: 4px 10px; border-color: #10b981; color: #6ee7b7; text-decoration: none;" title="ChatGPT નવી ટેબમાં ખોલો">
                  <span>⚡</span> નવી ટેબ ↗
                </a>
                <button id="btn-clear-chat-messages" class="btn btn-outline btn-sm" style="font-size: 0.72rem; padding: 4px 8px; border-color: rgba(255,255,255,0.2);" title="ચેટ ક્લિયર કરો">
                  🔄 રીસેટ
                </button>
              </div>
            </div>

            <!-- Quick Suggestion Chips for Chat -->
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">
              <button type="button" class="btn btn-outline btn-sm btn-quick-ask" data-ask="વિષય: '${currentTopic}' માટે ૫ સુપરહિટ હાઇ-CTR વાયરલ YouTube ટાઈટલ્સ આપો." style="font-size: 0.7rem; padding: 3px 8px; border-color: rgba(16, 185, 129, 0.4); color: #a7f3d0;">
                🎯 ૫ ટાઈટલ્સ
              </button>
              <button type="button" class="btn btn-outline btn-sm btn-quick-ask" data-ask="વિષય: '${currentTopic}' માટે આખું YouTube SEO ડિસ્ક્રિપ્શન અને ટાઈમસ્ટેમ્પ લખો." style="font-size: 0.7rem; padding: 3px 8px; border-color: rgba(16, 185, 129, 0.4); color: #a7f3d0;">
                📄 સંપૂર્ણ ડિસ્ક્રિપ્શન
              </button>
              <button type="button" class="btn btn-outline btn-sm btn-quick-ask" data-ask="વિષય: '${currentTopic}' માટે YouTube Studio માં પેસ્ટ કરવા ૩૫ સર્વોચ્ચ રેન્કિંગ ટેગ્સ આપો." style="font-size: 0.7rem; padding: 3px 8px; border-color: rgba(16, 185, 129, 0.4); color: #a7f3d0;">
                🏷️ ૩૫ ટેગ્સ
              </button>
              <button type="button" class="btn btn-outline btn-sm btn-quick-ask" data-ask="વિષય: '${currentTopic}' માટે ૧ આકર્ષક પિન કમેન્ટ અને ૫ વાયરલ હેશટેગ્સ આપો." style="font-size: 0.7rem; padding: 3px 8px; border-color: rgba(16, 185, 129, 0.4); color: #a7f3d0;">
                📌 પિન કમેન્ટ & Tags
              </button>
            </div>

            <!-- Chat Stream Area -->
            <div id="seo-chat-stream" style="background: #070a12; border: 1.5px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 14px; height: 350px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; scroll-behavior: smooth;">
              ${renderChatMessagesHTML()}
            </div>
          </div>

          <!-- Chat Input Form -->
          <div>
            <div style="display: flex; gap: 8px; align-items: flex-end;">
              <textarea 
                id="seo-chat-input" 
                class="form-input font-gu" 
                placeholder="ChatGPT ને પૂછો... (દા.ત. ટાઈટલ આપો, ડિસ્ક્રિપ્શન સુધારો)... Enter દબાવો" 
                style="flex: 1; height: 60px; font-size: 0.85rem; padding: 10px 14px; resize: none; border: 1.5px solid rgba(16, 185, 129, 0.5); border-radius: 10px; background: #07090e; color: #ffffff;"
              ></textarea>
              <button id="btn-send-seo-chat" class="btn btn-primary" style="height: 60px; padding: 0 20px; font-weight: 800; font-size: 1rem; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
                <span>🚀</span> મોકલો
              </button>
            </div>
            <div style="margin-top: 6px; font-size: 0.72rem; color: #94a3b8; display: flex; justify-content: space-between;">
              <span>Shift+Enter થી નવી લીટી પડશે | Enter થી સીધો મેસેજ જશે</span>
              <span id="chat-typing-status" style="color: #34d399; display: none;">AI વિચારી રહ્યું છે... ✍️</span>
            </div>
          </div>
        </div>

      </div>
    `;

    attachEvents();
  }

  function renderChatMessagesHTML() {
    return chatHistory.map((msg, idx) => {
      const isUser = msg.role === 'user';
      return `
        <div style="display: flex; flex-direction: column; align-items: ${isUser ? 'flex-end' : 'flex-start'};">
          <div style="font-size: 0.68rem; color: ${isUser ? '#6ee7b7' : '#94a3b8'}; margin-bottom: 3px; font-weight: 700;">
            ${isUser ? '👤 તમે' : '🤖 ChatGPT સહાયક'}
          </div>
          <div style="max-width: 92%; background: ${isUser ? '#065f46' : '#1e293b'}; border: 1px solid ${isUser ? '#10b981' : 'rgba(255, 255, 255, 0.12)'}; border-radius: 10px; padding: 10px 14px; font-size: 0.82rem; line-height: 1.6; color: #f8fafc; white-space: pre-wrap; word-break: break-word;">
            ${formatMessageContent(msg.content)}
            
            ${!isUser ? `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: flex-end;">
                <button type="button" class="btn btn-outline btn-sm btn-copy-chat-reply" data-idx="${idx}" style="font-size: 0.68rem; padding: 2px 8px; border-color: rgba(255,255,255,0.25);">
                  📋 જવાબ કોપી કરો
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  function formatMessageContent(content) {
    if (!content) return '';
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  function attachEvents() {
    const topicInput = container.querySelector('#seo-active-topic-input');
    const promptTextarea = container.querySelector('#seo-master-prompt-textarea');
    const chatStream = container.querySelector('#seo-chat-stream');
    const chatInput = container.querySelector('#seo-chat-input');
    const btnSend = container.querySelector('#btn-send-seo-chat');
    const typingStatus = container.querySelector('#chat-typing-status');

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

    // Send Prompt to Side-by-Side ChatGPT
    container.querySelector('#btn-send-prompt-to-chat')?.addEventListener('click', () => {
      const text = promptTextarea?.value || generateMasterSEOPrompt(currentTopic);
      sendMessage(text);
    });

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
        }
        copyToClipboard(snippet, `📋 ${btn.textContent.trim()} કોપી થઈ ગયો! ✓`, e.currentTarget);
      });
    });

    // Quick Suggestion Chips for Chat
    container.querySelectorAll('.btn-quick-ask').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-ask');
        if (prompt) {
          sendMessage(prompt);
        }
      });
    });

    // Copy Assistant Reply Button
    container.querySelectorAll('.btn-copy-chat-reply').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(btn.getAttribute('data-idx'));
        if (!isNaN(idx) && chatHistory[idx]) {
          copyToClipboard(chatHistory[idx].content, '📋 ChatGPT નો જવાબ કોપી થઈ ગયો! ✓', e.currentTarget);
        }
      });
    });

    // Clear Chat
    container.querySelector('#btn-clear-chat-messages')?.addEventListener('click', () => {
      chatHistory = [
        {
          role: 'assistant',
          content: `નવી ચર્ચા શરૂ થઈ! વિષય **"${currentTopic}"** માટે SEO ટાઈટલ, ડિસ્ક્રિપ્શન કે ટેગ્સ જે પણ પૂછવું હોય તે અહીં લખો.`
        }
      ];
      if (chatStream) {
        chatStream.innerHTML = renderChatMessagesHTML();
        attachChatBubbleEvents();
      }
      showNoticeToast('ચર્ચા રીસેટ થઈ ગઈ ✓', 'success');
    });

    // Send Message Handler
    async function sendMessage(text) {
      const msg = (text || chatInput.value).trim();
      if (!msg || isSending) return;

      // Add user message to chat history
      chatHistory.push({ role: 'user', content: msg });
      chatInput.value = '';
      isSending = true;

      if (chatStream) {
        chatStream.innerHTML = renderChatMessagesHTML();
        chatStream.scrollTop = chatStream.scrollHeight;
        attachChatBubbleEvents();
      }

      if (typingStatus) typingStatus.style.display = 'inline';
      if (btnSend) btnSend.disabled = true;

      try {
        const res = await api.sendChatMessage('seo-conv', msg, true);
        const reply = (res && res.message && (res.message.content || res.message.text)) || res.reply || 'માફ કરશો, જવાબ તૈયાર કરવામાં સમસ્યા આવી.';
        chatHistory.push({ role: 'assistant', content: reply });
      } catch (err) {
        console.warn('[SEO Chat Error, using smart local fallback]:', err);
        // Smart fallback
        const fallback = generateSmartFallbackReply(msg, currentTopic);
        chatHistory.push({ role: 'assistant', content: fallback });
      } finally {
        isSending = false;
        if (typingStatus) typingStatus.style.display = 'none';
        if (btnSend) btnSend.disabled = false;
        if (chatStream) {
          chatStream.innerHTML = renderChatMessagesHTML();
          chatStream.scrollTop = chatStream.scrollHeight;
          attachChatBubbleEvents();
        }
      }
    }

    // Attach click events on newly rendered chat reply buttons
    function attachChatBubbleEvents() {
      container.querySelectorAll('.btn-copy-chat-reply').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = Number(btn.getAttribute('data-idx'));
          if (!isNaN(idx) && chatHistory[idx]) {
            copyToClipboard(chatHistory[idx].content, '📋 જવાબ કોપી થઈ ગયો! ✓', e.currentTarget);
          }
        });
      });
    }

    // Send Button Click
    btnSend?.addEventListener('click', () => sendMessage());

    // Enter Key to Send (Shift+Enter for new line)
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Local fallback reply generator if backend AI is offline
  function generateSmartFallbackReply(userQuery, topic) {
    const q = userQuery.toLowerCase();
    const t = topic || 'ગુજરાત સરકારી ભરતી & પરિપત્ર ૨૦૨૬';

    if (q.includes('ટાઈટલ') || q.includes('title')) {
      return `🎯 **વિષય "${t}" માટે ૫ સુપરહિટ હાઇ-CTR વાયરલ ટાઈટલ્સ:**\n\n` +
        `૧. ${t}: સત્તાવાર પરિપત્ર જાહેર! જાણો સંપૂર્ણ વિગત\n` +
        `૨. કર્મચારીઓ અને ઉમેદવારો માટે મોટા ખુશખબર! ${t} નિયમો લાગુ\n` +
        `૩. ધ્યાનથી જુઓ! ${t} અંગે સરકારે લીધો ઐતિહાસિક નિર્ણય\n` +
        `૪. ${t} 2026: ઓનલાઇન અરજી, લાયકાત અને સંપૂર્ણ ગાઇડ\n` +
        `૫. [સત્તાવાર ઠરાવ] ${t} | Gyan Yatra Special Analysis`;
    }

    if (q.includes('ટેગ') || q.includes('tag')) {
      return `🏷️ **YouTube Studio માટે ૩૫ હાઇ-રેન્કિંગ કીવર્ડ્સ & ટેગ્સ (કોપી-પેસ્ટ માટે તૈયાર):**\n\n` +
        `${t}, gyan yatra, gujarat government update, gujarat official circular 2026, gujarat bharti 2026, sarkari yojana gujarat, gyan yatra channel, gujarati news, ojas gujarat, gujarat new rules, ${t.replace(/\s+/g, ', ')}`;
    }

    if (q.includes('ડિસ્ક્રિપ્શન') || q.includes('description')) {
      return `📄 **સંપૂર્ણ YouTube SEO ડિસ્ક્રિપ્શન:**\n\n` +
        `નમસ્તે મિત્રો, Gyan Yatra યુટ્યુબ ચેનલમાં આપ સૌનું સ્વાગત છે. આજના વિડીયોમાં આપણે વિગતવાર ચર્ચા કરીશું "${t}" વિશે.\n\n` +
        `📌 **વિડીયોની મુખ્ય હાઇલાઇટ્સ:**\n` +
        `• સત્તાવાર પરિપત્ર અને નિયમોની સાચી હકીકત\n` +
        `• પાત્રતા અને શરતોની વિગતવાર માહિતી\n` +
        `• ઓનલાઇન અરજી કરવાની સ્ટેપ બાય સ્ટેપ પદ્ધતિ\n\n` +
        `⏱️ **વિડીયો ચેપ્ટર્સ (Timestamps):**\n` +
        `00:00 - શરૂઆત & વિષય પરિચય\n` +
        `01:30 - સત્તાવાર પરિપત્ર વિશ્લેષણ\n` +
        `04:15 - મહત્વના નિયમો અને શરતો\n` +
        `07:45 - ઓનલાઇન ફોર્મ પદ્ધતિ\n` +
        `09:30 - નિષ્કર્ષ અને મહત્વની સલાહ\n\n` +
        `⚠️ **ડિસ્ક્લેમર:** આ વિડીયો ફક્ત શૈક્ષણિક અને માહિતીના હેતુ માટે છે. સત્તાવાર પોર્ટલ પરથી પુષ્ટિ કરવી.\n\n` +
        `#gyanyatra #gujaratnews #sarkariyojana #${t.replace(/\s+/g, '')}`;
    }

    return `✅ **Gyan Yatra AI સહાયક:**\n\n` +
      `વિષય **"${t}"** સંબંધિત તમારો પ્રશ્ન મળ્યો છે. ડાબી બાજુ આપેલો માસ્ટર પ્રોમ્પ્ટ કોપી કરીને **chatgpt.com** પર પેસ્ટ કરી શકો છો અથવા અહીં મને કોઈ પણ સ્પેસિફિક મુદ્દો પૂછી શકો છો!`;
  }

  // Initial render
  render();
}
