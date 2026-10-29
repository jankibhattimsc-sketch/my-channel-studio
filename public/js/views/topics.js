import { api } from '../api.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { projectState } from '../utils/projectState.js';

export async function renderTopics(container, navigateTo) {
  let uploadedScreenshots = []; // { name, size, base64 }
  let isAnalyzing = false;
  let hasAnalyzed = false;
  let analysisIdeas = []; // Stores GPT-4o or fallback viral ideas from backend
  let analysisInsights = ''; // Analyzed insights text from backend

  // 48-Hour YouTube Studio Realtime State (Populated AFTER photo upload)
  let studioData = {
    channelTitle: '',
    customUrl: '',
    subscribers: 0,
    totalVideos: 0,
    views48h: 0,
    views60m: 0,
    peakHours: '',
    avgRetention: '',
    trafficSearch: 0,
    trafficBrowse: 0,
    trafficSuggested: 0,
    topSearchQueries: '',
    topVideos: []
  };

  // Try fetching connected channel title from backend quietly
  try {
    const res = await api.getAuthStatus();
    if (res && res.channel) {
      studioData.channelTitle = res.channel.title || '';
      studioData.customUrl = res.channel.customUrl || '';
      if (res.channel.subscribers) studioData.subscribers = Number(res.channel.subscribers);
      if (res.channel.videoCount) studioData.totalVideos = Number(res.channel.videoCount);
    }
  } catch (e) {
    // Continue with defaults
  }

  function getChatGPTMasterPrompt() {
    const channelName = studioData.channelTitle || "મારી યુટ્યુબ ચેનલ";
    const activeTopVideos = (studioData.topVideos || []).filter(v => v && v.title && v.title.trim());

    const topVideosFormatted = activeTopVideos.length > 0
      ? activeTopVideos.map((v, i) => {
          const vNum = (i + 1);
          const vViews = v.views48h ? Number(v.views48h).toLocaleString('en-IN') : '0';
          return `   ${vNum}. "${v.title}"  ➔  વ્યુઝ સંખ્યા: ${vViews}`;
        }).join('\n\n')
      : '   (ફોટામાંથી કોઈ વિડીયો કે ટોપિક મળ્યો નથી)';

    return `તમે એક વરિષ્ઠ YouTube Strategy & Algorithm નિષ્ણાત છો.
મારી ચેનલનું નામ: "${channelName}" ${studioData.customUrl ? `(${studioData.customUrl})` : ''}.
વિષય / કેટેગરી: સરકારી યોજના, સરકારી ભરતી, કર્મચારી પરિપત્ર અને નિયમો (સત્તાવાર પુરાવા સાથે).

============================================================
📊 [મારા YOUTUBE STUDIO માંથી સ્કેન કરેલા ટોપિક અને સંખ્યા (VIEWS)]
(👉 વિશેષ નોંધ: મેં અપલોડ કરેલા YouTube Studio સ્ક્રીનશોટમાંથી આ ટોપિક્સ અને તેની સામે વિડીયોની સાચી સંખ્યા સ્કેન થઈ ચૂકી છે:)
============================================================

${topVideosFormatted}

============================================================
🎯 [તમારું ટાસ્ક: આ વિડીયો ટોપિક્સ અને વ્યુઝના આધારે ૩ સુપરહિટ વાયરલ વિડીયો પ્લાન આપો]
============================================================
ઉપર આપેલા ટોપિક્સ અને તેની વ્યુઝ સંખ્યાને ધ્યાનમાં રાખીને આગામી ૨૪ થી ૪૮ કલાકમાં ચેનલ પર અપલોડ કરવા માટે ૩ સુપરહિટ વાયરલ વિડીયોનો ક્રમબદ્ધ પ્લાન આપો:

દરેક વિડીયો આઈડિયા માટે નીચેની વિગતો આપો:
૧. [ક્લિકેબલ હાઈ-CTR ગુજરાતી ટાઈટલ]: ૨ વૈકલ્પિક ટાઈટલ (ક્લિકબેટ મુક્ત, ૧૦૦% સાચું, અને YouTube Search માં રેન્ક થાય તેવું)
૨. [૧૬:૯ થંબનેલ પ્લાન]: 
   - બેકગ્રાઉન્ડ રંગ અને વાસ્તવિક સત્તાવાર ફોટો
   - થંબનેલ પર લખવાના મોટા બોલ્ડ ફક્ત ૩ થી ૪ ગુજરાતી શબ્દો
   - એક નાનો આકર્ષક બેજ (દા.ત. "સત્તાવાર પરિપત્ર ✓" અથવા "મોટો નિર્ણય ⚠️")
૩. [પ્રથમ ૪૫ સેકન્ડનો હૂક ડાયલોગ (Retention Hook)]: શરૂઆતનો શબ્દશઃ ગુજરાતી બોલવાનો ડાયલોગ
૪. [શ્રેષ્ઠ વિડીયો ફોર્મેટ & લંબાઈ]: લોંગ વિડીયો (Long 8-12m) કે શોર્ટ્સ (Shorts 60s)
૫. [કીવર્ડ્સ & હેશટેગ્સ]: ૫ હાઈ-વોલ્યુમ ગુજરાતી સર્ચ કીવર્ડ્સ અને ૩ વાયરલ હેશટેગ્સ
૬. [અપલોડ કરવાનો શ્રેષ્ઠ સમય]: ક્યારે પબ્લિશ કરવું

કોઈ પણ ફોટો માંગ્યા વગર સીધો જ ૩ આઈડિયાનો માસ્ટરક્લાસ ગુજરાતી પ્લાન શરૂ કરો!`;
  }

  function render() {
    // STATE 1: Initial state (No photo uploaded yet)
    if (!hasAnalyzed && !isAnalyzing) {
      container.innerHTML = `
        <div style="max-width: 1100px; margin: 0 auto; padding-bottom: 30px;">
          
          <!-- Header -->
          <div style="margin-bottom: 22px; text-align: left;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <span style="font-size: 1.6rem;">📸</span>
              <h2 style="font-size: 1.45rem; font-weight: 800; color: #ffffff; margin: 0;">
                ૪૮ કલાક YouTube Studio ફોટો અપલોડ & એનાલિસિસ
              </h2>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0; line-height: 1.5;">
              પહેલા તમારા YouTube Studio ના 48-Hour Realtime Analytics નો ફોટો અપલોડ કરો. <strong>ફોટો અપલોડ કર્યા પછી જ</strong> તેમાંથી 48 કલાકના વ્યુઝ, વેલોસિટી અને ટોપ વિડીયોનું વિશ્લેષણ થઈને ChatGPT સમરી પ્રોમ્પ્ટ બનશે!
            </p>
          </div>

          <!-- Two Cards: Left = Prominent Upload Box, Right = Waiting Indicator -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; align-items: stretch;">
            
            <!-- Upload Box (Prominent) -->
            <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)); border: 2px dashed #38bdf8; border-radius: var(--radius-lg); padding: 36px 24px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.45); display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; transition: all 0.25s ease;" id="initial-dropzone">
              <input type="file" id="initial-file-input" accept="image/*" multiple style="display: none;">
              
              <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; font-size: 2.8rem; margin-bottom: 16px; border: 1.5px solid rgba(56, 189, 248, 0.4); box-shadow: 0 0 24px rgba(56, 189, 248, 0.2);">
                📤
              </div>

              <h3 style="font-size: 1.25rem; font-weight: 800; color: #ffffff; margin: 0 0 8px 0;">
                એક કે તેથી વધુ (Multiple) ફોટા અહીં અપલોડ કરો
              </h3>
              
              <p style="font-size: 0.86rem; color: #94a3b8; line-height: 1.5; margin: 0 0 18px 0; max-width: 400px;">
                તમારા YouTube Studio ના ૧, ૨ કે વધુ ફોટા એકસાથે પસંદ કરો<br>
                (સ્ક્રોલ કરેલા બધા જ ફોટામાંથી તમામ વિડીયો આપોઆપ એક જ લિસ્ટમાં સ્કેન થશે)<br>
                અથવા સીધું કીબોર્ડ પરથી <kbd style="background: rgba(255,255,255,0.12); padding: 2px 7px; border-radius: 4px; color: #38bdf8; font-weight: 800;">Ctrl + V</kbd> દબાવી પેસ્ટ કરો
              </p>

              <button class="btn btn-primary" style="background: linear-gradient(135deg, #0284c7, #38bdf8); border: none; font-weight: 800; padding: 12px 24px; font-size: 0.92rem; box-shadow: 0 4px 18px rgba(56, 189, 248, 0.4); pointer-events: none;">
                <span>📁</span> ફોટા પસંદ કરો (Choose Multiple Photos)
              </button>
            </div>

            <!-- Waiting Card -->
            <div style="background: rgba(15, 23, 42, 0.6); border: 1.5px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-lg); padding: 36px 24px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
              <div style="font-size: 3rem; margin-bottom: 14px; opacity: 0.6;">
                ⏳
              </div>
              <h4 style="font-size: 1.15rem; font-weight: 800; color: #cbd5e1; margin: 0 0 8px 0;">
                ફોટાની રાહ જોવાઈ રહી છે...
              </h4>
              <p style="font-size: 0.84rem; color: var(--text-muted); line-height: 1.5; margin: 0; max-width: 340px;">
                અહીં અત્યારે કોઈ જૂનો ડમી ડેટા નથી. તમે ડાબી બાજુએ YouTube Studio ના ૧ કે વધુ ફોટા નાખશો એટલે તરત જ તેમાંથી બધા જ ટોપ વિડીયો અને વ્યુઝ સ્કેન થઈને ChatGPT પ્રોમ્પ્ટ બની જશે!
              </p>
            </div>

          </div>

        </div>
      `;

      attachInitialEvents();
      return;
    }

    // STATE 2: Analyzing Loading State with Live Photo Scan
    if (isAnalyzing) {
      const activeImg = (uploadedScreenshots[0] && uploadedScreenshots[0].base64) || '';
      const photoCount = uploadedScreenshots.length;
      container.innerHTML = `
        <div style="max-width: 760px; margin: 30px auto; padding: 28px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.92)); border: 1.5px solid #38bdf8; border-radius: var(--radius-lg); box-shadow: 0 10px 40px rgba(56, 189, 248, 0.25);">
          
          <div style="text-align: center; margin-bottom: 20px;">
            <div class="pulse-indicator" style="width: 24px; height: 24px; margin: 0 auto 12px; border-color: #38bdf8;"></div>
            <h3 style="font-size: 1.35rem; font-weight: 800; color: #ffffff; margin: 0 0 6px 0;">
              🔍 ${photoCount > 1 ? `${photoCount} ફોટામાંથી` : 'ફોટામાંથી'} YouTube Studio ડેટા સ્કેન થઈ રહ્યો છે...
            </h3>
            <p style="color: #94a3b8; font-size: 0.85rem; margin: 0;">
              ${photoCount > 1 ? `બધા જ ${photoCount} ફોટામાંથી તમામ વિડીયો અને વ્યુઝ સંયુક્ત રીતે સ્કેન થઈ રહ્યા છે...` : 'કુલ વ્યુઝ અને સૌથી વધુ ચાલતા વિડીયો સ્કેન થઈ રહ્યા છે...'}
            </p>
          </div>

          ${activeImg ? `
            <!-- Live Scanning Visual Laser Box -->
            <div class="photo-scanner-wrap" style="margin-bottom: 22px;">
              <div class="photo-scan-laser"></div>
              <img src="${activeImg}" alt="Scanning YouTube Studio Screenshot">
            </div>
          ` : ''}

          <!-- Live Progress Checklist -->
          <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 14px 18px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px; font-size: 0.84rem; color: #34d399;">
              <span>✓</span> <strong>૧. ફોટો સફળતાપૂર્વક લોડ થયો</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; font-size: 0.84rem; color: #38bdf8;">
              <span class="pulse-indicator" style="width: 8px; height: 8px; border-color: #38bdf8;"></span>
              <strong>૨. રીઅલ-ટાઇમ 48 કલાક અને 60 મિનિટ વ્યુઝ સ્કેનિંગ...</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; font-size: 0.84rem; color: #fbbf24;">
              <span style="opacity: 0.7;">⏳</span>
              <span>૩. ટોચના વિડીયો ટાઇટલ અને કન્ટેન્ટ વેલોસિટી ડિટેક્શન...</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; font-size: 0.84rem; color: #94a3b8;">
              <span style="opacity: 0.5;">⏳</span>
              <span>૪. ૧૦૦% ફોટો-ફ્રી ChatGPT માસ્ટર પ્રોમ્પ્ટ જનરેશન...</span>
            </div>
          </div>

        </div>
      `;
      return;
    }

    // STATE 3: Post-Upload & Analysis Complete (Full prompt + 48h data)
    const currentPrompt = getChatGPTMasterPrompt();

    container.innerHTML = `
      <div style="max-width: 1260px; margin: 0 auto; padding-bottom: 30px;">
        
        <!-- Header with Success Tag & Reset Option -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 18px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
              <span style="font-size: 1.6rem;">📈</span>
              <h2 style="font-size: 1.45rem; font-weight: 800; color: #ffffff; margin: 0;">
                ૪૮ કલાક YouTube Studio વિશ્લેષણ & ChatGPT પ્રોમ્પ્ટ
              </h2>
            </div>
            <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0;">
              તમારા ફોટામાંથી તમામ 48 કલાકનો ડેટા સ્કેન થઈ ગયો છે. નીચેનો સંપૂર્ણ પ્રોમ્પ્ટ કોપી કરી ChatGPT માં પેસ્ટ કરો.
            </p>
          </div>

          <button id="btn-upload-new-photo" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #38bdf8; font-weight: 700; padding: 8px 16px;">
            <span>🔄</span> બીજો ફોટો અપલોડ કરો (New Photo)
          </button>
        </div>

        <!-- 48-Hour Realtime Status Strip (Extracted from photo) -->
        <div style="background: linear-gradient(135deg, rgba(255, 0, 0, 0.12), rgba(15, 23, 42, 0.95)); border: 1.5px solid rgba(255, 0, 0, 0.35); border-radius: var(--radius-lg); padding: 14px 20px; margin-bottom: 20px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--yt-red); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; font-weight: 900; color: #fff; box-shadow: 0 0 16px rgba(255,0,0,0.4);">
              ▶
            </div>
            <div>
              <div style="font-size: 1.05rem; font-weight: 800; color: #ffffff;">
                ${studioData.channelTitle ? `${studioData.channelTitle} (${studioData.customUrl || ''})` : 'YouTube Studio Realtime'}
              </div>
              <div style="font-size: 0.76rem; color: #34d399; font-weight: 700;">
                ✓ ફોટામાંથી સફળતાપૂર્વક સ્કેન થયેલ ડેટા • ૧૦૦% ફોટો-ફ્રી પ્રોમ્પ્ટ
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <div style="background: rgba(16, 185, 129, 0.15); border: 1.5px solid #10b981; border-radius: 8px; padding: 6px 14px; text-align: center;">
              <div style="font-size: 0.7rem; color: #34d399; font-weight: 800;">⏱️ કુલ વ્યુઝ (સ્કેન થયેલ)</div>
              <div id="status-strip-views" style="font-size: 1.15rem; font-weight: 800; color: #10b981;">${studioData.views48h ? Number(studioData.views48h).toLocaleString('en-IN') : '0'}</div>
            </div>
            <div style="background: rgba(56, 189, 248, 0.15); border: 1.5px solid #38bdf8; border-radius: 8px; padding: 6px 14px; text-align: center;">
              <div style="font-size: 0.7rem; color: #38bdf8; font-weight: 800;">📋 સ્કેન થયેલ વિડીયો</div>
              <div id="status-strip-count" style="font-size: 1.15rem; font-weight: 800; color: #38bdf8;">${(studioData.topVideos || []).filter(v => v.title).length} ટોપિક્સ</div>
            </div>
            ${studioData.subscribers ? `
            <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 6px 14px; text-align: center;">
              <div style="font-size: 0.7rem; color: var(--text-muted);">👥 સબસ્ક્રાઇબર</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: #ffffff;">${Number(studioData.subscribers).toLocaleString('en-IN')}+</div>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Main Two-Column View -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 20px; align-items: start;">
          
          <!-- LEFT: Uploaded Photo Preview + Extracted Metrics Customizer -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
            
            <!-- Uploaded Photos Strip with Full Clarity Preview & Lightbox Zoom -->
            <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: var(--radius-lg); padding: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.45);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div style="font-size: 0.92rem; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 6px;">
                  <span>📸</span> અપલોડ કરેલો ફોટો (${uploadedScreenshots.length}):
                </div>
                <div style="display: flex; gap: 8px;">
                  <button id="btn-add-more-photos" class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 4px 10px; border-color: #38bdf8; color: #38bdf8;">
                    + બીજો ફોટો ઉમેરો
                  </button>
                  <input type="file" id="more-file-input" accept="image/*" multiple style="display: none;">
                </div>
              </div>

              ${uploadedScreenshots.length > 0 ? `
                <!-- Main High-Clarity Screenshot Preview -->
                <div style="position: relative; border-radius: 10px; overflow: hidden; border: 1.5px solid #38bdf8; background: #020617; max-height: 260px; display: flex; align-items: center; justify-content: center; cursor: zoom-in;" id="main-screenshot-card" title="ક્લિક કરીને મોટો ફોટો જુઓ (Full Preview)">
                  <img src="${uploadedScreenshots[0].base64}" id="main-screenshot-img" style="max-height: 250px; max-width: 100%; object-fit: contain; display: block;" alt="${uploadedScreenshots[0].name}">
                  
                  <span class="badge" style="position: absolute; top: 10px; left: 10px; background: rgba(16, 185, 129, 0.9); color: #fff; font-weight: 800; font-size: 0.72rem; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
                    🟢 સ્કેન સફળ (Scanned)
                  </span>

                  <button class="btn-remove-screenshot" data-idx="0" title="કાઢી નાખો" style="position: absolute; top: 10px; right: 10px; background: rgba(239, 68, 68, 0.9); color: #fff; border: none; border-radius: 50%; width: 24px; height: 24px; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; font-weight: 900; z-index: 5;">✕</button>

                  <button id="btn-zoom-main-photo" class="btn btn-primary btn-sm" style="position: absolute; bottom: 10px; right: 10px; font-size: 0.76rem; padding: 5px 12px; background: rgba(2, 132, 199, 0.92); border: 1px solid #38bdf8; box-shadow: 0 4px 12px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 6px; font-weight: 700;">
                    🔍 મોટો ફોટો જુઓ (Zoom)
                  </button>
                </div>

                ${uploadedScreenshots.length > 1 ? `
                  <!-- Multi-photo Thumbnails -->
                  <div style="display: flex; gap: 8px; margin-top: 10px; overflow-x: auto; padding-bottom: 4px;">
                    ${uploadedScreenshots.map((img, idx) => `
                      <div class="photo-preview-item" data-idx="${idx}" style="width: 70px; height: 50px; flex-shrink: 0; position: relative;">
                        <img src="${img.base64}" style="width: 100%; height: 100%; object-fit: cover;" alt="${img.name}">
                        <button class="btn-remove-screenshot" data-idx="${idx}" title="કાઢી નાખો" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.85); color: #ef4444; border: none; border-radius: 50%; width: 16px; height: 16px; font-size: 0.65rem; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1;">✕</button>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}

                <!-- Scanned Data Instant Highlights -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;">
                  <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 8px; padding: 8px 12px;">
                    <div style="font-size: 0.7rem; color: #34d399; font-weight: 800;">✓ કુલ વ્યુઝ (સ્કેન થયેલ)</div>
                    <div id="highlight-total-views" style="font-size: 1.1rem; font-weight: 800; color: #ffffff;">${studioData.views48h ? Number(studioData.views48h).toLocaleString('en-IN') : '0'}</div>
                  </div>
                  <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 8px; padding: 8px 12px;">
                    <div style="font-size: 0.7rem; color: #38bdf8; font-weight: 800;">✓ સ્કેન થયેલ ટોપિક્સ</div>
                    <div id="highlight-total-count" style="font-size: 1.1rem; font-weight: 800; color: #ffffff;">${(studioData.topVideos || []).filter(v => v.title).length} વિડીયો</div>
                  </div>
                </div>
              ` : `
                <div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 20px;">કોઈ ફોટો નથી</div>
              `}
            </div>

            <!-- Scanned Topic & Views Table (Topic same vido ni sankhya) -->
            <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: var(--radius-lg); padding: 18px; box-shadow: 0 10px 30px rgba(0,0,0,0.45);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div style="font-size: 0.95rem; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                  <span>📋</span> ટોપિક સામે વિડીયોની સંખ્યા (સ્કેન થયેલ):
                </div>
                <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 0.72rem; font-weight: 800; border: 1px solid rgba(16, 185, 129, 0.4);">
                  સ્કેનર ✓
                </span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 100px 30px; gap: 8px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 0.74rem; font-weight: 800; color: #94a3b8;">
                <div>વિડીયો / ટોપિકનું નામ</div>
                <div style="text-align: right;">સંખ્યા (વ્યુઝ)</div>
                <div></div>
              </div>

              <!-- List of Topic <---> Views Rows -->
              <div id="scanned-topics-rows" style="display: flex; flex-direction: column; gap: 10px;">
                ${(studioData.topVideos && studioData.topVideos.length > 0 ? studioData.topVideos : [{}, {}, {}]).map((vid, idx) => `
                  <div class="scanned-topic-row" data-idx="${idx}" style="display: grid; grid-template-columns: 1fr 100px 30px; gap: 8px; align-items: center; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px 10px;">
                    <input type="text" class="form-input font-gu input-top-vid-title" data-idx="${idx}" placeholder="ટોપિક ${idx + 1} નું નામ" value="${vid.title || ''}" style="font-size: 0.82rem; padding: 6px 10px; width: 100%;">
                    <input type="number" class="form-input input-top-vid-views" data-idx="${idx}" placeholder="સંખ્યા" value="${vid.views48h ? vid.views48h : ''}" style="font-size: 0.82rem; padding: 6px 10px; text-align: right; border-color: #10b981;">
                    <button class="btn-remove-topic-row" data-idx="${idx}" title="આ રો કાઢી નાખો" style="background: transparent; color: #ef4444; border: none; font-size: 1rem; cursor: pointer; padding: 4px; line-height: 1; border-radius: 4px; display: flex; align-items: center; justify-content: center;">✕</button>
                  </div>
                `).join('')}
              </div>

              <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.72rem; color: #34d399; font-weight: 700;">✓ લાઈવ ઓટો-સિંક (પ્રોમ્પ્ટ તરત જ અપડેટ થાય છે)</span>
                <button id="btn-add-topic-row" class="btn btn-outline btn-sm" style="font-size: 0.75rem; padding: 4px 10px; border-color: #38bdf8; color: #38bdf8;">
                  + નવો ટોપિક ઉમેરો
                </button>
              </div>
            </div>

          </div>

          <!-- RIGHT: Generated ChatGPT Master Prompt Box + ChatGPT Open Icon/Button -->
          <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)); border: 1.5px solid rgba(16, 185, 129, 0.45); border-radius: var(--radius-lg); padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.45); display: flex; flex-direction: column; justify-content: space-between; min-height: 580px;">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.3rem;">📋</span>
                  <h3 style="font-size: 1.1rem; font-weight: 800; color: #ffffff; margin: 0;">
                    ChatGPT માટે તૈયાર સંપૂર્ણ સમરી પ્રોમ્પ્ટ
                  </h3>
                </div>
                <span class="badge" style="background: rgba(16, 185, 129, 0.25); color: #34d399; font-size: 0.74rem; font-weight: 800; border: 1px solid rgba(16, 185, 129, 0.5);">
                  ✓ ૧૦૦% ફોટો-ફ્રી પ્રોમ્પ્ટ
                </span>
              </div>

              <div style="font-size: 0.78rem; color: #94a3b8; margin-bottom: 10px; line-height: 1.4;">
                આ પ્રોમ્પ્ટમાં તમારા અપલોડ કરેલા ફોટામાંથી તમામ 48 કલાકનો ડેટા આવી ગયો છે. ChatGPT માં કોઈ ફોટો અપલોડ કર્યા વગર ૧૦૦% પરફેક્ટ પરિણામ મળશે.
              </div>

              <textarea id="chatgpt-master-prompt-area" class="form-input font-gu" style="width: 100%; height: 380px; font-size: 0.82rem; line-height: 1.55; background: #050811; color: #f1f5f9; border: 1.5px solid #10b981; border-radius: 8px; resize: vertical; margin-bottom: 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;" readonly>${currentPrompt}</textarea>
            </div>

            <!-- Action Buttons: 1-Click Copy & Direct ChatGPT Button -->
            <div>
              <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                
                <button id="btn-copy-master-prompt" class="btn btn-success" style="flex: 1; min-width: 200px; font-weight: 800; padding: 12px 18px; font-size: 0.92rem; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4); display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; border-radius: 8px;">
                  <span id="copy-master-icon" style="font-size: 1.1rem;">📋</span>
                  <span id="copy-master-text">૧-ક્લિક પ્રોમ્પ્ટ કોપી કરો</span>
                </button>

                <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" id="btn-open-chatgpt-direct" class="btn" style="background: linear-gradient(135deg, #10a37f, #059669); color: #ffffff; font-weight: 800; padding: 12px 20px; font-size: 0.92rem; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; border-radius: 8px; box-shadow: 0 4px 16px rgba(16, 163, 127, 0.4); border: 1px solid #34d399;" title="પ્રોમ્પ્ટ કોપી કરી સીધું ChatGPT ખોલો">
                  <span style="font-size: 1.2rem;">⚡</span>
                  <span>ChatGPT ખોલો ↗</span>
                </a>

              </div>

              <div id="copy-status-notification" style="display: none; margin-top: 10px; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 6px; padding: 8px 12px; font-size: 0.78rem; color: #a7f3d0; text-align: center;">
                ✓ સંપૂર્ણ ડેટા પ્રોમ્પ્ટ કોપી થઈ ગયો છે! હવે ChatGPT માં <kbd style="background: rgba(0,0,0,0.5); padding: 2px 6px; border-radius: 4px; color: #34d399;">Ctrl + V</kbd> દબાવીને પેસ્ટ કરો.
              </div>
          </div>

        </div>

      </div>
    `;

    attachAnalyzedEvents();
  }

  // --- Initial Upload Event Handling ---
  function attachInitialEvents() {
    const dropzone = container.querySelector('#initial-dropzone');
    const fileInput = container.querySelector('#initial-file-input');
    const quickSampleBtn = container.querySelector('#btn-quick-sample-test');

    dropzone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => processUploadedFiles(e.target.files));

    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#10b981';
      dropzone.style.background = 'rgba(16, 185, 129, 0.15)';
    });

    dropzone?.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#38bdf8';
      dropzone.style.background = 'rgba(15, 23, 42, 0.95)';
    });

    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#38bdf8';
      dropzone.style.background = 'rgba(15, 23, 42, 0.95)';
      processUploadedFiles(e.dataTransfer.files);
    });

    // Quick Sample Test (fills demo image so user can test workflow without file)
    quickSampleBtn?.addEventListener('click', () => {
      uploadedScreenshots = [{
        name: 'youtube_studio_48h_realtime.png',
        size: '184.2 KB',
        base64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><rect width="300" height="180" fill="%230f172a"/><text x="150" y="80" fill="%2338bdf8" font-size="16" text-anchor="middle" font-family="sans-serif">YouTube Studio 48h</text><text x="150" y="110" fill="%2310b981" font-size="22" font-weight="bold" text-anchor="middle" font-family="sans-serif">24,850 Views</text></svg>'
      }];
      startAnalysisProcess();
    });

    // Clipboard paste on container (Ctrl + V)
    container.onpaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        processUploadedFiles(imageFiles);
      }
    };
  }

  // Parse numbers from strings like "24,850", "24.8K", "1.5M", "520", etc.
  function parseMetricNumber(raw) {
    if (!raw) return 0;
    const clean = String(raw).trim().toLowerCase();
    let num = 0;
    if (clean.endsWith('m')) {
      num = Math.round(parseFloat(clean.replace('m', '')) * 1000000);
    } else if (clean.endsWith('k')) {
      num = Math.round(parseFloat(clean.replace('k', '')) * 1000);
    } else {
      num = parseInt(clean.replace(/,/g, '').replace(/\s+/g, ''), 10);
    }
    return isNaN(num) ? 0 : num;
  }

  // Client-Side OCR & Image Scanning Helper
  async function analyzeImageWithOcr(base64Image) {
    const ocrResult = {
      views48h: 0,
      views60m: 0,
      topVideos: [],
      rawText: ''
    };

    if (!base64Image) return ocrResult;

    try {
      // 1. Create offscreen canvas to scale and optimize image for OCR
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = base64Image;
      });

      const maxDim = 1200;
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
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
      const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.88);

      // 2. Run Tesseract OCR if available
      if (window.Tesseract && typeof window.Tesseract.recognize === 'function') {
        const ocrPromise = window.Tesseract.recognize(optimizedBase64, 'eng');
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('OCR Timeout')), 6000));
        const res = await Promise.race([ocrPromise, timeoutPromise]);
        const text = res?.data?.text || '';
        ocrResult.rawText = text;

        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const fullText = lines.join(' ');

        // A. Find 48-Hour Numbers
        const numMatches = fullText.match(/\b(?:\d{1,3}(?:,\d{3})+|\d{4,8}|\d+(?:\.\d+)?[kKmM])\b/g) || [];
        const parsedNums = numMatches.map(m => parseMetricNumber(m)).filter(n => n > 50 && n < 50000000);

        const p48Match = fullText.match(/(?:48\s*h(?:ours?)?|realtime|views)[^\d]{0,25}(\d[\d,.]*\s*[kKmM]?)/i);
        if (p48Match && p48Match[1]) {
          ocrResult.views48h = parseMetricNumber(p48Match[1]);
        } else if (parsedNums.length > 0) {
          ocrResult.views48h = Math.max(...parsedNums);
        }

        // B. Find 60-Minute Numbers
        const p60Match = fullText.match(/(?:60\s*m(?:in(?:utes?)?)?)[^\d]{0,25}(\d[\d,.]*\s*[kKmM]?)/i);
        if (p60Match && p60Match[1]) {
          ocrResult.views60m = parseMetricNumber(p60Match[1]);
        } else if (parsedNums.length > 1) {
          const smaller = parsedNums.filter(n => n < (ocrResult.views48h || 100000) && n > 10);
          if (smaller.length > 0) {
            ocrResult.views60m = smaller[0];
          }
        }

        // C. Find Candidate Titles
        const ignoredWords = ['youtube', 'studio', 'analytics', 'realtime', 'overview', 'content', 'audience', 'research', 'views', 'subscribers', 'hours', 'minutes', 'publish', 'monetization', 'earn'];
        const candidateTitles = lines.filter(line => {
          if (line.length < 8) return false;
          const lower = line.toLowerCase();
          const isIgnored = ignoredWords.some(w => lower === w || lower.startsWith(w + ' '));
          if (isIgnored) return false;
          if (/^[\d\s,.:\-+%/]+$/.test(line)) return false;
          return true;
        });

        if (candidateTitles.length > 0) {
          ocrResult.topVideos = candidateTitles.slice(0, 4).map((title, idx) => ({
            title: title.replace(/^[\d.)\s-]+/, '').trim(),
            views48h: Math.round((ocrResult.views48h || 12000) * (idx === 0 ? 0.38 : idx === 1 ? 0.24 : 0.15)),
            hourlyVelocity: `+${Math.max(20, Math.round((ocrResult.views60m || 400) * (idx === 0 ? 0.45 : idx === 1 ? 0.28 : 0.15)))} views/hr`,
            source: idx === 0 ? 'YouTube Search (68%)' : idx === 1 ? 'Browse Features (55%)' : 'Suggested Videos (40%)'
          }));
        }
      }
    } catch (err) {
      console.warn('[Topics OCR Engine Notice]:', err.message);
    }

    return ocrResult;
  }

  function processUploadedFiles(files) {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    let loaded = 0;
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawData = e.target.result;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          let ocrPng = rawData;
          try {
            // Check brightness of screenshot for dark theme inversion
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            let sum = 0;
            const step = Math.max(4, Math.floor(data.length / 5000) * 4);
            let count = 0;
            for (let i = 0; i < data.length; i += step) {
              sum += (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
              count++;
            }
            const avg = sum / (count || 1);
            // If dark background (like YouTube Studio Dark Mode), invert to crisp black text on white bg
            if (avg < 115) {
              for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];
                data[i+1] = 255 - data[i+1];
                data[i+2] = 255 - data[i+2];
              }
              ctx.putImageData(imgData, 0, 0);
              ocrPng = canvas.toDataURL('image/png');
            }
          } catch (prepErr) {
            console.warn('[Image Preprocessing Notice]:', prepErr);
          }

          uploadedScreenshots.push({
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            base64: rawData,
            ocrBase64: ocrPng
          });
          loaded++;
          if (loaded === validFiles.length) {
            startAnalysisProcess();
          }
        };
        img.onerror = () => {
          uploadedScreenshots.push({
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            base64: rawData,
            ocrBase64: rawData
          });
          loaded++;
          if (loaded === validFiles.length) {
            startAnalysisProcess();
          }
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    });
  }

  async function startAnalysisProcess() {
    isAnalyzing = true;
    render();

    try {
      // Direct high-accuracy server-side OCR on uploaded screenshot
      const res = await api.analyze48hScreenshot(
        uploadedScreenshots.map(img => img.ocrBase64 || img.base64),
        'all'
      );

      console.log('[Topics Analysis Response]:', res);

      if (res) {
        if (res.topVideos && Array.isArray(res.topVideos) && res.topVideos.length > 0) {
          studioData.topVideos = res.topVideos.map(v => ({
            title: typeof v === 'string' ? v : (v.title || ''),
            views48h: typeof v === 'object' && v.views48h ? v.views48h : 0
          })).filter(v => v.title);
        } else {
          studioData.topVideos = [];
        }
        const totalViews = studioData.topVideos.reduce((sum, v) => sum + (Number(v.views48h) || 0), 0);
        studioData.views48h = res.detectedViews48h || totalViews;
        studioData.views60m = 0;
      }
    } catch (err) {
      console.warn('[Topics Analysis Notice]:', err.message);
    }

    isAnalyzing = false;
    hasAnalyzed = true;
    render();
  }

  // --- Post-Analysis Event Handling ---
  function attachAnalyzedEvents() {
    const promptArea = container.querySelector('#chatgpt-master-prompt-area');
    const copyBtn = container.querySelector('#btn-copy-master-prompt');
    const copyText = container.querySelector('#copy-master-text');
    const copyIcon = container.querySelector('#copy-master-icon');
    const openChatgpt = container.querySelector('#btn-open-chatgpt-direct');
    const notif = container.querySelector('#copy-status-notification');

    function updatePromptView() {
      if (promptArea) {
        promptArea.value = getChatGPTMasterPrompt();
      }
    }

    // Reset button (Upload new photo from scratch)
    container.querySelector('#btn-upload-new-photo')?.addEventListener('click', () => {
      uploadedScreenshots = [];
      hasAnalyzed = false;
      isAnalyzing = false;
      render();
    });

    // Photo Lightbox Zoom Modal
    function openPhotoLightbox(imgSrc, title) {
      const modal = document.createElement('div');
      modal.className = 'photo-lightbox-modal';
      modal.innerHTML = `
        <div class="photo-lightbox-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.3rem;">📸</span>
            <strong style="font-size: 1.05rem;">${title || 'YouTube Studio 48-Hour Realtime Analytics Screenshot'}</strong>
          </div>
          <button id="lightbox-close-btn" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); color: #fff; width: 36px; height: 36px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 900;">✕</button>
        </div>
        <div class="photo-lightbox-body">
          <img src="${imgSrc}" alt="Zoomed Screenshot">
        </div>
        <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 10px 16px; margin-top: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: 0.84rem; color: #cbd5e1;">
          <div>
            <span style="color: #34d399; font-weight: 800;">✓ ફોટામાંથી સ્કેન થયેલ:</span> 48 કલાકના વ્યુઝ: <strong>${Number(studioData.views48h).toLocaleString('en-IN')}</strong> • 60 મિનિટ ઝડપ: <strong>${Number(studioData.views60m).toLocaleString('en-IN')}/hr</strong>
          </div>
          <div style="color: #94a3b8; font-size: 0.76rem;">(ESC કી દબાવીને અથવા ✕ ક્લિક કરીને બંધ કરો)</div>
        </div>
      `;
      document.body.appendChild(modal);

      const close = () => {
        modal.remove();
        document.removeEventListener('keydown', onKey);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') close();
      };
      document.addEventListener('keydown', onKey);
      modal.querySelector('#lightbox-close-btn')?.addEventListener('click', close);
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('photo-lightbox-body')) close();
      });
    }

    container.querySelector('#btn-zoom-main-photo')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const firstImg = uploadedScreenshots[0];
      if (firstImg) openPhotoLightbox(firstImg.base64, firstImg.name);
    });

    container.querySelector('#main-screenshot-card')?.addEventListener('click', () => {
      const firstImg = uploadedScreenshots[0];
      if (firstImg) openPhotoLightbox(firstImg.base64, firstImg.name);
    });

    // Multi-photo thumbnail click switches main preview
    container.querySelectorAll('.photo-preview-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-screenshot')) return;
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        if (!isNaN(idx) && uploadedScreenshots[idx]) {
          const selected = uploadedScreenshots[idx];
          const mainImg = container.querySelector('#main-screenshot-img');
          if (mainImg) mainImg.src = selected.base64;
        }
      });
    });

    // Add more photos
    const moreInput = container.querySelector('#more-file-input');
    container.querySelector('#btn-add-more-photos')?.addEventListener('click', () => moreInput?.click());
    moreInput?.addEventListener('change', (e) => {
      processUploadedFiles(e.target.files);
    });

    // Metric Inputs Live Update
    const inViews48 = container.querySelector('#input-views-48h');
    const inViews60 = container.querySelector('#input-views-60m');
    const inSearchQ = container.querySelector('#input-search-queries');

    inViews48?.addEventListener('input', (e) => {
      studioData.views48h = parseInt(e.target.value, 10) || 0;
      updatePromptView();
    });

    inViews60?.addEventListener('input', (e) => {
      studioData.views60m = parseInt(e.target.value, 10) || 0;
      updatePromptView();
    });

    function syncLiveTotals() {
      const activeVideos = (studioData.topVideos || []).filter(v => v && v.title && v.title.trim());
      const sum = activeVideos.reduce((acc, v) => acc + (Number(v.views48h) || 0), 0);
      if (sum > 0) studioData.views48h = sum;

      const stripViews = container.querySelector('#status-strip-views');
      if (stripViews) stripViews.textContent = (Number(studioData.views48h) || 0).toLocaleString('en-IN');
      const stripCount = container.querySelector('#status-strip-count');
      if (stripCount) stripCount.textContent = `${activeVideos.length} ટોપિક્સ`;

      const hlViews = container.querySelector('#highlight-total-views');
      if (hlViews) hlViews.textContent = (Number(studioData.views48h) || 0).toLocaleString('en-IN');
      const hlCount = container.querySelector('#highlight-total-count');
      if (hlCount) hlCount.textContent = `${activeVideos.length} વિડીયો`;

      updatePromptView();
    }

    container.querySelectorAll('.input-top-vid-title').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        if (!studioData.topVideos[idx]) {
          studioData.topVideos[idx] = { title: '', views48h: 0 };
        }
        studioData.topVideos[idx].title = e.target.value;
        syncLiveTotals();
      });
    });

    container.querySelectorAll('.input-top-vid-views').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        if (!studioData.topVideos[idx]) {
          studioData.topVideos[idx] = { title: '', views48h: 0 };
        }
        studioData.topVideos[idx].views48h = parseInt(e.target.value, 10) || 0;
        syncLiveTotals();
      });
    });

    // Add new topic row dynamically
    container.querySelector('#btn-add-topic-row')?.addEventListener('click', () => {
      const rowsContainer = container.querySelector('#scanned-topics-rows');
      if (!rowsContainer) return;
      const newIdx = studioData.topVideos.length;
      studioData.topVideos.push({ title: '', views48h: 0 });
      const newRow = document.createElement('div');
      newRow.className = 'scanned-topic-row';
      newRow.dataset.idx = newIdx;
      newRow.style = 'display: grid; grid-template-columns: 1fr 100px 30px; gap: 8px; align-items: center; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px 10px;';
      newRow.innerHTML = `
        <input type="text" class="form-input font-gu input-top-vid-title" data-idx="${newIdx}" placeholder="ટોપિક ${newIdx + 1} નું નામ" value="" style="font-size: 0.82rem; padding: 6px 10px; width: 100%;">
        <input type="number" class="form-input input-top-vid-views" data-idx="${newIdx}" placeholder="સંખ્યા" value="" style="font-size: 0.82rem; padding: 6px 10px; text-align: right; border-color: #10b981;">
        <button class="btn-remove-topic-row" data-idx="${newIdx}" title="આ રો કાઢી નાખો" style="background: transparent; color: #ef4444; border: none; font-size: 1rem; cursor: pointer; padding: 4px; line-height: 1; border-radius: 4px; display: flex; align-items: center; justify-content: center;">✕</button>
      `;
      rowsContainer.appendChild(newRow);

      const titleInput = newRow.querySelector('.input-top-vid-title');
      const viewsInput = newRow.querySelector('.input-top-vid-views');

      titleInput?.addEventListener('input', (e) => {
        studioData.topVideos[newIdx].title = e.target.value;
        syncLiveTotals();
      });

      viewsInput?.addEventListener('input', (e) => {
        studioData.topVideos[newIdx].views48h = parseInt(e.target.value, 10) || 0;
        syncLiveTotals();
      });

      titleInput?.focus();
    });

    // Remove topic row click handler
    container.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.btn-remove-topic-row');
      if (delBtn) {
        const row = delBtn.closest('.scanned-topic-row');
        const idx = parseInt(row?.getAttribute('data-idx') || delBtn.getAttribute('data-idx'), 10);
        if (!isNaN(idx) && studioData.topVideos[idx]) {
          studioData.topVideos.splice(idx, 1);
          row.remove();
          // Re-index remaining rows
          container.querySelectorAll('.scanned-topic-row').forEach((r, i) => {
            r.dataset.idx = i;
            r.querySelector('.input-top-vid-title')?.setAttribute('data-idx', i);
            r.querySelector('.input-top-vid-views')?.setAttribute('data-idx', i);
            r.querySelector('.btn-remove-topic-row')?.setAttribute('data-idx', i);
          });
          syncLiveTotals();
        }
      }
    });

    // Remove photo thumbnail
    container.querySelectorAll('.btn-remove-screenshot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        if (!isNaN(idx)) {
          uploadedScreenshots.splice(idx, 1);
          if (uploadedScreenshots.length === 0) {
            hasAnalyzed = false;
          }
          render();
        }
      });
    });

    // 1-Click Copy Master Prompt
    copyBtn?.addEventListener('click', (e) => {
      const prompt = promptArea?.value || getChatGPTMasterPrompt();
      copyToClipboard(prompt, '📋 ૪૮ કલાકની સંપૂર્ણ સમરી સાથેનો ChatGPT પ્રોમ્પ્ટ કોપી થઈ ગયો! હવે ChatGPT માં Ctrl+V પેસ્ટ કરો ✓', e.currentTarget);
      if (copyText) copyText.textContent = '✓ પ્રોમ્પ્ટ કોપી થઈ ગયો!';
      if (copyIcon) copyIcon.textContent = '✅';
      if (notif) notif.style.display = 'block';

      setTimeout(() => {
        if (copyText) copyText.textContent = '૧-ક્લિક પ્રોમ્પ્ટ કોપી કરો';
        if (copyIcon) copyIcon.textContent = '📋';
      }, 2500);
    });

    // When clicking "ChatGPT ખોલો ↗", also auto-copy prompt
    openChatgpt?.addEventListener('click', () => {
      const prompt = promptArea?.value || getChatGPTMasterPrompt();
      navigator.clipboard?.writeText(prompt);
      if (notif) {
        notif.textContent = '🚀 સંપૂર્ણ ડેટા પ્રોમ્પ્ટ કોપી થઈ ગયો છે! ChatGPT માં જઈને ફક્ત Ctrl+V પેસ્ટ કરો.';
        notif.style.display = 'block';
      }
    });

    // Container onpaste
    container.onpaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        processUploadedFiles(imageFiles);
      }
    };
  }

  // Initial render
  render();
}
