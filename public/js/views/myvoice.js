import { api } from '../api.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { projectState } from '../utils/projectState.js';
import { cleanGujaratiPhoneticsClient } from '../utils/voiceActorHelper.js';
import { LiveAudioRecorder, enhanceAudioBuffer } from '../utils/audioRecorderEnhancer.js';

export const AUDIO_TONE_PROMPT = "Read the following Gujarati government job news in a warm, natural, conversational voice, like an experienced news presenter, not a fake TV-anchor voice. Start with an enthusiastic, clear voice to grab attention. For recruitment news: be optimistic, energetic and encouraging, with slight emphasis on number of vacancies, eligibility and last date. For salary hike/DA/allowance news: be happy, excited and reassuring, and say amounts, percentages and effective dates clearly and slightly slower. When mentioning last dates, warnings or important notices: become a little serious and urgent. End with a warm, friendly closing. Keep a medium pace with natural pauses at commas and full stops. Pronounce English words like DA, GPSC, OJAS clearly. Read only the script text below exactly as written, do not add or remove any words, and do not read these instructions aloud.";

export async function renderMyVoice(container, navigateTo) {
  // Load saved voice settings if any
  let savedSettings = {};
  try {
    const raw = localStorage.getItem('gyan_yatra_voice_settings');
    if (raw) savedSettings = JSON.parse(raw);
  } catch (_) {}

  let selectedProfile = savedSettings.profileId;
  if (!selectedProfile || selectedProfile === 'anchor-swara-female' || selectedProfile === 'google-wavenet-female' || selectedProfile === 'edge-dhwani') {
    selectedProfile = 'anchor-dhwani-female';
  }
  let selectedEmotion = savedSettings.emotion || 'enthusiastic';
  let selectedSpeed = savedSettings.speed || 1.08;
  let googleApiKey = savedSettings.apiKey || '';
  let customVoiceId = savedSettings.customVoiceId || '';
  let currentAudioPlayer = null;

  // Retrieve project state & active selected thumbnail
  const project = (projectState && typeof projectState.getProject === 'function') 
    ? projectState.getProject() 
    : (projectState?.project || {});

  // Pre-configured high-impact Gujarati thumbnail concepts if none in state
  const presetConcepts = [
    {
      id: 1,
      title: 'પગાર અને DA ૫૦% વધારો મંજૂર ૨૦૨૬',
      gujaratiWords: '૫૦% DA મંજૂર! ખાતામાં આવશે ₹15,000 થી ₹45,000',
      photoSubject: 'ગુજરાતના મુખ્યમંત્રીશ્રી ભૂપેન્દ્ર પટેલનો વાસ્તવિક સત્તાવાર પ્રેસ ફોટો',
      prompt: 'A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of the Chief Minister of Gujarat, Bhupendra Patel, in traditional clean white kurta at an official press briefing looking at camera with a confident expression. On the right: Exactly 4 large ultra-bold clean text words in deep navy blue: "GUJARAT SALARY DA 50% HIKE". Ultra clean, high contrast, zero clutter, strictly photorealistic, absolutely NO 3D cartoon, NO neon.'
    },
    {
      id: 2,
      title: 'આંગણવાડી સુપરવાઈઝર નવી ભરતી ૨૦૨૬',
      gujaratiWords: 'સુપરવાઈઝર નવી ભરતી જાહેર! લાયકાત અને ફોર્મ તારીખ',
      photoSubject: 'આંગણવાડી સુપરવાઈઝર / મહિલા શિક્ષિકાનો સત્તાવાર પરિધાનમાં વાસ્તવિક ફોટો',
      prompt: 'A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of an Indian female education officer / Anganwadi supervisor holding an official file with a warm confident expression. On the right: Exactly 4 large ultra-bold clean text words in deep navy blue and crimson: "ANGANWADI RECRUITMENT 2026". Ultra clean, high contrast, zero clutter, photorealistic.'
    },
    {
      id: 3,
      title: 'પીએમ કિસાન ૧૯મો હપ્તો ₹૨,૦૦૦ તારીખ',
      gujaratiWords: '૧૯મો હપ્તો તારીખ જાહેર! ખાતામાં ₹૨,૦૦૦ જમા',
      photoSubject: 'પીએમ નરેન્દ્ર મોદીનો સત્તાવાર સંબોધન ફોટો અથવા ખેડૂત લાભાર્થી',
      prompt: 'A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of Prime Minister Narendra Modi in official attire looking at camera. On the right: Exactly 4 large ultra-bold text words in navy blue: "PM KISAN 19TH INSTALLMENT". Ultra clean, high contrast, zero clutter, strictly photorealistic.'
    }
  ];

  // Active selected thumbnail state
  let activeThumb = (project && project.thumbnail && project.thumbnail.dalleShortPrompt) 
    ? project.thumbnail 
    : presetConcepts[0];

  // 4 Topic-Specific Script Frameworks ("જે તે સ્ક્રિપ્ટને રિલેટેડ જ ઢાંચામાં ઢળી જાય તેવી સ્ક્રિપ્ટ")
  let selectedFramework = 'breaking';
  const scriptFrameworks = {
    breaking: {
      id: 'breaking',
      name: '💥 બ્રેકિંગ ન્યૂઝ & પરિપત્ર ઢાંચો',
      shortName: '💥 ૧. બ્રેકિંગ/GR',
      emotion: 'enthusiastic',
      badge: 'હાઇ એનર્જી હૂક • સત્તાવાર ગંભીરતા',
      template: (t) => `નમસ્તે મિત્રો! એક ખૂબ જ મોટા અને મહત્ત્વના સમાચાર સામે આવી રહ્યા છે... ${t || 'ગુજરાત કર્મચારી પગાર અને DA વધારા'} બાબતે મોટો સત્તાવાર નિર્ણય જાહેર થયો છે!

શું ખરેખર નવો પરિપત્ર જાહેર કરી દેવામાં આવ્યો છે? 

ગાંધીનગર સચિવાલય અને નાણાં વિભાગ દ્વારા સત્તાવાર ઠરાવ બહાર પાડવામાં આવ્યો છે. આ નિર્ણય મુજબ તમામ પાત્ર કર્મચારીઓ અને લાભાર્થીઓના ખાતામાં સીધા ૧૫,૦૦૦ થી ૪૫,૦૦૦ રૂપિયા જમા થવાની ગણતરી સામે આવી છે. 

ધ્યાન રાખજો... કોઈપણ વચેટીયા કે અનધિકૃત અફવાઓમાં આવ્યા વગર સત્તાવાર પોર્ટલ પર જ વિગતો ચકાસવી. 

આ વિડીયો તમારા તમામ વોટ્સએપ ગ્રૂપ અને કર્મચારી મિત્રો સાથે ખાસ શેર કરજો... અને આપણી ચેનલ જ્ઞાન યાત્રાને અત્યારે જ સબ્સ્ક્રાઇબ કરી લેજો. જય હિન્દ, જય જય ગરવી ગુજરાત!`
    },
    schemes: {
      id: 'schemes',
      name: '🏛️ સરકારી યોજના & સહાય ઢાંચો',
      shortName: '🏛️ ૨. યોજના/સહાય',
      emotion: 'enthusiastic',
      badge: 'લાભાર્થી હૂક • સહાય રકમ • સરળ ભાષા',
      template: (t) => `નમસ્તે ખેડૂત અને સામાન્ય નાગરિક મિત્રો! ગુજરાત સરકાર દ્વારા એક નવી અને અત્યંત લાભદાયી યોજના જાહેર કરવામાં આવી છે... જેનું નામ છે ${t || 'સરકારી કિસાન અને કુટુંબ સહાય યોજના'}.

જો તમે પણ આ યોજનાનો લાભ લેવા માંગો છો... તો આ વિડીયો અંત સુધી ખાસ જોજો. 

આ યોજના અંતર્ગત પાત્ર પરિવારોને સીધા બેંક ખાતામાં સહાય રકમ ડીબીટી મારફતે જમા કરવામાં આવશે. અરજી કરવા માટે આધાર કાર્ડ, બેંક પાસબુક અને રેશનકાર્ડની નકલ જરૂરી રહેશે. 

અરજી કરવાની છેલ્લી તારીખ નજીક છે, એટલે સમયસર ગ્રામ પંચાયત અથવા ડિજિટલ સેવા કેન્દ્ર પરથી ફોર્મ ભરી દેવું. 

માહિતી ઉપયોગી લાગી હોય તો વિડીયોને લાઈક કરજો અને જરૂરિયાતમંદ પરિવારો સુધી શેર કરજો. ધન્યવાદ!`
    },
    recruitment: {
      id: 'recruitment',
      name: '👩‍🏫 આંગણવાડી & સત્તાવાર ભરતી ઢાંચો',
      shortName: '👩‍🏫 ૩. ભરતી/ઓજસ',
      emotion: 'official',
      badge: 'ઉમેદવાર હૂક • શૈક્ષણિક લાયકાત • વયમર્યાદા',
      template: (t) => `નમસ્તે ઉમેદવાર મિત્રો! ગુજરાતમાં સરકારી નોકરીની તૈયારી કરતા યુવાનો અને બહેનો માટે નવી ભરતીની સત્તાવાર જાહેરાત આવી ગઈ છે... ${t || 'આંગણવાડી સુપરવાઈઝર નવી ભરતી ૨૦૨૬'}.

કુલ કેટલી જગ્યાઓ છે અને કોણ ફોર્મ ભરી શકે? 

સત્તાવાર નોટિફિકેશન મુજબ, માન્ય યુનિવર્સિટીમાંથી સ્નાતક ઉમેદવારો આમાં ઓનલાઇન અરજી કરી શકશે. વયમર્યાદા ૧૮ થી ૩૫ વર્ષ નક્કી કરવામાં આવી છે, જેમાં અનામત વર્ગને નિયમ મુજબ છૂટછાટ મળશે. 

ઓજસ પોર્ટલ પર ઓનલાઇન ફોર્મ ભરવાની શરૂઆત થઈ ગઈ છે. ડોક્યુમેન્ટ અપલોડ કરતી વખતે સાચી વિગતો જ ભરવી જેથી પાછળથી ફોર્મ રદ ના થાય. 

તૈયારી કરતા તમારા તમામ મિત્રો અને સ્પર્ધાત્મક ગ્રૂપમાં આ વિડીયો શેર કરજો. ચેનલ જ્ઞાન યાત્રા સાથે જોડાયેલા રહેજો!`
    },
    educational: {
      id: 'educational',
      name: '🌸 શાંત શૈક્ષણિક & સરળ સમજૂતી ઢાંચો',
      shortName: '🌸 ૪. શૈક્ષણિક ગાઈડ',
      emotion: 'calm',
      badge: 'ધીરજવાન શૈલી • મુદ્દાસર સ્ટેપ્સ • જ્ઞાનવર્ધક',
      template: (t) => `નમસ્તે મિત્રો, જ્ઞાન યાત્રામાં આપનું સ્વાગત છે. આજના શૈક્ષણિક વિડીયોમાં આપણે વિગતવાર સમજીશું ${t || 'સરકારી નિયમો અને ઓનલાઇન પોર્ટલ સેવાઓ'} વિશે.

ઘણી વખત સાચી માહિતીના અભાવે સામાન્ય નાગરિકો સરકારી કચેરીઓના ધક્કા ખાતા હોય છે. પરંતુ આજના ડિજિટલ યુગમાં મોટાભાગની પ્રક્રિયા ઘેરબેઠા થઈ શકે છે. 

આ વિડીયોમાં આપણે ત્રણ સરળ પગલાંમાં આખી પ્રોસેસ સમજીશું: પ્રથમ પગલું પોર્ટલ પર રજીસ્ટ્રેશન, બીજું જરૂરી પુરાવા અને ત્રીજું અરજી સ્ટેટસ તપાસવાની રીત. 

વિડીયોને શાંતિથી પૂરો જોજો જેથી કોઈ મુદ્દો ચૂકી ના જવાય. જો કોઈ પ્રશ્ન હોય તો નીચે કોમેન્ટ બોક્સમાં જરૂર જણાવજો. જય હિન્દ!`
    }
  };

  container.innerHTML = `
    <!-- Project Context Header -->
    <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: var(--radius-lg); padding: 14px 20px; margin-bottom: 18px; box-shadow: 0 8px 25px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <button id="btn-back-to-projects-voice" class="btn btn-outline btn-sm" style="font-weight: 700;">← બધા પ્રોજેક્ટ્સ</button>
        <button id="btn-prev-script-voice" class="btn btn-secondary btn-sm" style="font-weight: 700;">← ૩. Script</button>
        <span style="font-size: 0.85rem; color: #38bdf8; font-weight: 800;">📁 પ્રોજેક્ટ: ${project.topic || project.name || 'મારો પ્રોજેક્ટ'}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="badge badge-green" style="font-size: 0.72rem; font-weight: 800;">✓ Auto-Saved</span>
        <button id="btn-next-to-editing-voice" class="btn btn-primary btn-sm" style="font-weight: 800; background: #f59e0b; border: none; padding: 6px 14px;">
          ૫. Editing (એડિટિંગ) →
        </button>
      </div>
    </div>

    <!-- Top Header with Safe Top Padding for Mobile -->
    <div class="view-header" style="margin-bottom: 20px; padding-top: 4px;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #7c3aed, #ec4899); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 4px 14px rgba(124,58,237,0.35);">
            🎙️
          </div>
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 800; margin: 0; color: #fff; line-height: 1.3;">
              ૪. મારો અવાજ / વૉઇસ સ્ટુડિયો & થંબનેલ સેન્ટર
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.8rem; margin: 3px 0 0 0;">
              ભાવ સાથે ગુજરાતી વાણી • બાજુમાં પસંદ કરેલ ૧૬:૯ થંબનેલ અને AI પ્રોમ્પ્ટ
            </p>
          </div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <a href="https://www.canva.com/create/youtube-thumbnails/" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="border: 1.5px solid #06b6d4; color: #67e8f9; font-weight: 700; background: rgba(6,182,212,0.15); display: inline-flex; align-items: center; gap: 6px; text-decoration: none; padding: 6px 14px; border-radius: 8px;" title="Canva માં ૧૬:૯ થંબનેલ બનાવો">
            <span>🎨</span> Canva ખોલો ↗
          </a>
          <button id="btn-import-script" class="btn btn-outline btn-sm" style="border-color: #a855f7; color: #c084fc; font-weight: 700; padding: 6px 12px; font-size: 0.78rem;">
            <span>📝</span> ૩. સ્ક્રિપ્ટ લાવો
          </button>
          <button id="btn-goto-step5-seo" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: 700; padding: 6px 12px; font-size: 0.78rem;">
            <span>🖼️</span> આગળ વધો: ૫. થંબનેલ ➔
          </button>
        </div>
      </div>
    </div>

    <!-- View Switcher for Mobile & Desktop ("અવાજ ની બાજુ માં થંબનેઇલ") -->
    <div style="display: flex; gap: 8px; margin-bottom: 16px; background: rgba(15, 23, 42, 0.7); padding: 6px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); align-items: center; justify-content: flex-start; overflow-x: auto;">
      <button id="view-mode-split" class="btn btn-sm btn-primary" style="font-weight: 700; font-size: 0.78rem; padding: 6px 14px; white-space: nowrap;">
        <span>👥</span> બાજુ-બાજુમાં (Voice & Thumbnail Split)
      </button>
      <button id="view-mode-voice" class="btn btn-sm btn-outline" style="font-weight: 700; font-size: 0.78rem; padding: 6px 14px; white-space: nowrap;">
        <span>🎙️</span> ફક્ત અવાજ (Voice Studio)
      </button>
      <button id="view-mode-thumb" class="btn btn-sm btn-outline" style="font-weight: 700; font-size: 0.78rem; padding: 6px 14px; white-space: nowrap;">
        <span>🎨</span> ફક્ત થંબનેલ & પ્રોમ્પ્ટ (Thumbnail & Prompt)
      </button>
    </div>

    <!-- Responsive Main Grid: Left (Voice Studio) & Right (Selected Thumbnail & Prompt) -->
    <div id="voice-thumb-grid" style="display: grid; grid-template-columns: 1fr 380px; gap: 20px; margin-bottom: 30px;">
      
      <!-- ========================================================================= -->
      <!-- LEFT COLUMN: VOICE PROFILES, SCRIPT & AUDIO GENERATOR                    -->
      <!-- ========================================================================= -->
      <div id="col-voice-studio" style="min-width: 0;">

        <!-- QUICK LINKED THUMBNAIL BANNER (Right Beside/With Voice on Any Screen) -->
        <div class="card" style="margin-bottom: 18px; padding: 14px 16px; border: 1.5px solid #38bdf8; background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(8, 47, 73, 0.85));">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">🎨</span>
              <div>
                <div style="font-size: 0.92rem; font-weight: 800; color: #38bdf8;">
                  પસંદ કરેલ થંબનેલ & AI પ્રોમ્પ્ટ (Selected Thumbnail)
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">
                  આ વિડીયો માટે સેવ કરેલ ૧૬:૯ થંબનેલ અને AI પ્રોમ્પ્ટ
                </div>
              </div>
            </div>
            <button id="btn-quick-copy-thumb-prompt" class="btn btn-primary btn-sm" style="background: #0284c7; border: none; font-weight: 700; font-size: 0.76rem; padding: 5px 12px;">
              <span>📋</span> ૧-ક્લિક પ્રોમ્પ્ટ કોપી
            </button>
          </div>

          <!-- Mini Thumbnail Preview & Prompt Preview -->
          <div style="display: grid; grid-template-columns: minmax(130px, 160px) 1fr; gap: 12px; align-items: center;">
            <!-- Mini 16:9 Mockup -->
            <div style="background: #ffffff; border-radius: 6px; padding: 8px; border: 1.5px solid #e2e8f0; display: flex; flex-direction: column; justify-content: space-between; height: 85px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
              <span style="background: #dc2626; color: #fff; font-size: 0.52rem; font-weight: 800; padding: 1px 4px; border-radius: 3px; align-self: flex-start;">
                સત્તાવાર
              </span>
              <div id="mini-thumb-words" style="font-size: 0.74rem; font-weight: 900; color: #0f2b5c; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                ${activeThumb.gujaratiWords || activeThumb.title || '૫૦% DA મંજૂર! ખાતામાં આવશે ₹15,000 થી ₹45,000'}
              </div>
              <span style="font-size: 0.52rem; color: #64748b; font-weight: 700;">16:9 • AAA Contrast ✓</span>
            </div>

            <!-- Short Prompt Snippet with Click to View Full -->
            <div style="min-width: 0;">
              <div style="font-size: 0.72rem; color: #cbd5e1; line-height: 1.4; background: rgba(0,0,0,0.4); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); font-family: monospace; max-height: 56px; overflow: hidden; text-overflow: ellipsis;">
                <span id="mini-prompt-text">${activeThumb.dalleShortPrompt || activeThumb.prompt || ''}</span>
              </div>
              <div style="display: flex; gap: 6px; margin-top: 6px; align-items: center;">
                <button id="btn-jump-to-thumb-card" class="btn btn-outline btn-sm" style="font-size: 0.7rem; padding: 2px 8px; color: #38bdf8; border-color: rgba(56,189,248,0.4);">
                  <span>🔍</span> સંપૂર્ણ વિઝ્યુઅલ & પ્રોમ્પ્ટ કાર્ડ જુઓ ➔
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- CARD 1: VOICE PROFILES -->
        <div class="card" style="margin-bottom: 18px; padding: 16px;">
          <div class="card-header" style="padding-bottom: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
            <div class="card-title" style="font-size: 1rem; font-weight: 700;">
              <span>🎭</span> ૧. અવાજ પસંદ કરો (Voice Profile & Clone)
            </div>
            <span class="badge" style="background: rgba(16,185,129,0.15); color: #10b981; font-size: 0.7rem; font-weight: 700;">
              ✓ 100% Free Engine
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr; gap: 10px;" id="voice-profiles-container">
            <!-- 1. Lata Mangeshkar Sweet Melody Anchor (Pure Gujarati Female) - #1 TOP RECOMMENDED -->
            <div class="voice-profile-card ${selectedProfile === 'anchor-dhwani-female' ? 'active' : ''}" data-profile="anchor-dhwani-female" data-voiceid="gu-IN-DhwaniNeural" style="padding: 12px; border-radius: 10px; border: ${selectedProfile === 'anchor-dhwani-female' ? '2px solid #ec4899' : '1px solid var(--border-color)'}; background: ${selectedProfile === 'anchor-dhwani-female' ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.02)'}; cursor: pointer; transition: all 0.2s;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 800; font-size: 0.9rem; color: #fff;">👑 લતા મંગેશકર જેવો મધુર અવાજ (કોકિલા - અતિ મીઠો & સુરીલો સ્ત્રી અવાજ)</span>
                <span class="badge" style="background: rgba(236,72,153,0.25); color: #f472b6; font-size: 0.68rem; font-weight: 700;">મધુર કોકિલકંઠ વાણી 👑</span>
              </div>
              <p style="font-size: 0.74rem; color: #cbd5e1; margin: 0 0 8px 0; line-height: 1.4;">
                લતા મંગેશકર જેવો અતિ મીઠો, સુરીલો, રેશમી અને સ્પષ્ટ સ્ત્રી અવાજ. ઝીરો ધ્રૂજારી, સ્પષ્ટ ઉચ્ચારણ અને સાંભળવો ગમે તેવો મધુર લયબદ્ધ પ્રવાહ. ભરતી, પરિપત્ર અને પગાર વધારા માટે ૧૦૦% પરફેક્ટ.
              </p>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 0.68rem; color: #f472b6;">gu-IN-Dhwani (Lata Sweet Tone • Zero Tremor)</span>
                <button class="btn btn-secondary btn-sm play-sample-btn" data-src="/audio/lata_sweet_melody_anchor.mp3" style="padding: 2px 8px; font-size: 0.72rem;">
                  ▶️ સેમ્પલ સાંભળો
                </button>
              </div>
            </div>

            <!-- 2. Senior Indic Anchor Swara (Mature Female) -->
            <div class="voice-profile-card ${selectedProfile === 'anchor-swara-female' ? 'active' : ''}" data-profile="anchor-swara-female" data-voiceid="hi-IN-SwaraNeural" style="padding: 12px; border-radius: 10px; border: ${selectedProfile === 'anchor-swara-female' ? '2px solid #f59e0b' : '1px solid var(--border-color)'}; background: ${selectedProfile === 'anchor-swara-female' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.02)'}; cursor: pointer; transition: all 0.2s;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 800; font-size: 0.9rem; color: #fff;">👑 સિનિયર હિન્દી/દેવનાગરી એન્કર (સ્વરા - પરિપક્વ સ્ત્રી)</span>
                <span class="badge" style="background: rgba(245,158,11,0.25); color: #fbbf24; font-size: 0.68rem; font-weight: 700;">પરિપક્વ ગોલ્ડન વાણી</span>
              </div>
              <p style="font-size: 0.74rem; color: #cbd5e1; margin: 0 0 8px 0; line-height: 1.4;">
                ગંભીર, શાંત અને પરિપક્વ સ્ત્રી અવાજ (દેવનાગરી & હિન્દી-ગુજરાતી મિશ્રિત શૈલી માટે).
              </p>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 0.68rem; color: #fbbf24;">hi-IN-Swara (Indic Model)</span>
                <button class="btn btn-secondary btn-sm play-sample-btn" data-src="/audio/sample_swara_mature.mp3" style="padding: 2px 8px; font-size: 0.72rem;">
                  ▶️ સેમ્પલ
                </button>
              </div>
            </div>

            <!-- 2. TV News Anchor Niranjan (Male) -->
            <div class="voice-profile-card ${selectedProfile === 'anchor-niranjan-male' ? 'active' : ''}" data-profile="anchor-niranjan-male" data-voiceid="gu-IN-NiranjanNeural" style="padding: 12px; border-radius: 10px; border: ${selectedProfile === 'anchor-niranjan-male' ? '2px solid #38bdf8' : '1px solid var(--border-color)'}; background: ${selectedProfile === 'anchor-niranjan-male' ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.02)'}; cursor: pointer; transition: all 0.2s;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 800; font-size: 0.9rem; color: #fff;">📺 ટીવી ન્યૂઝ એન્કર (નિરંજન - પુરુષ)</span>
                <span class="badge" style="background: rgba(56,189,248,0.25); color: #38bdf8; font-size: 0.68rem; font-weight: 700;">ન્યૂઝ એન્કર ⭐</span>
              </div>
              <p style="font-size: 0.74rem; color: #cbd5e1; margin: 0 0 8px 0; line-height: 1.4;">
                વાસ્તવિક ટીવી ન્યૂઝ ચેનલ જેવો ભારે, સ્પષ્ટ અને ધ્રૂજારી વગરનો કુદરતી પુરુષ અવાજ.
              </p>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 0.68rem; color: #38bdf8;">gu-IN-Niranjan (Real Anchor)</span>
                <button class="btn btn-secondary btn-sm play-sample-btn" data-src="/audio/clean_fluent_professional.mp3" style="padding: 2px 8px; font-size: 0.72rem;">
                  ▶️ સેમ્પલ
                </button>
              </div>
            </div>

            <!-- 3. Studio Anchor Madhur (Male) - ZERO TREMOR -->
            <div class="voice-profile-card ${selectedProfile === 'anchor-madhur-male' ? 'active' : ''}" data-profile="anchor-madhur-male" data-voiceid="hi-IN-MadhurNeural" style="padding: 12px; border-radius: 10px; border: ${selectedProfile === 'anchor-madhur-male' ? '2px solid #10b981' : '1px solid var(--border-color)'}; background: ${selectedProfile === 'anchor-madhur-male' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.02)'}; cursor: pointer; transition: all 0.2s;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 800; font-size: 0.9rem; color: #fff;">🎙️ સ્ટુડિયો એન્કર (મધુર - સ્ટેડી પુરુષ)</span>
                <span class="badge" style="background: rgba(16,185,129,0.25); color: #34d399; font-size: 0.68rem; font-weight: 700;">ઝીરો ધ્રૂજારી ⚡</span>
              </div>
              <p style="font-size: 0.74rem; color: #cbd5e1; margin: 0 0 8px 0; line-height: 1.4;">
                દમદાર, ભરાવદાર અને એકદમ સ્થિર અવાજ (સંપૂર્ણ કુદરતી હ્યુમન વાણી - 0% રોબોટિક ધ્રૂજારી).
              </p>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 0.68rem; color: #34d399;">hi-IN-Madhur (Zero Tremor)</span>
                <button class="btn btn-secondary btn-sm play-sample-btn" data-src="/audio/clean_fluent_professional.mp3" style="padding: 2px 8px; font-size: 0.72rem;">
                  ▶️ સેમ્પલ
                </button>
              </div>
            </div>

            <!-- 4. Custom Voice Clone (Mature Informative Tone) -->
            <div class="voice-profile-card ${selectedProfile === 'google-clone-custom' ? 'active' : ''}" data-profile="google-clone-custom" data-voiceid="custom-clone" style="padding: 12px; border-radius: 10px; border: ${selectedProfile === 'google-clone-custom' ? '2px solid #8b5cf6' : '1px solid var(--border-color)'}; background: ${selectedProfile === 'google-clone-custom' ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.02)'}; cursor: pointer; transition: all 0.2s;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 800; font-size: 0.9rem; color: #fff;">👑 મારો અવાજ ક્લોન (પરિપક્વ માહિતીપ્રદ અવાજ)</span>
                <span class="badge" style="background: rgba(139,92,246,0.25); color: #c4b5fd; font-size: 0.68rem; font-weight: 700;">પરિપક્વ ક્લોન 👑</span>
              </div>
              <p style="font-size: 0.74rem; color: #cbd5e1; margin: 0 0 8px 0; line-height: 1.4;">
                પરિપક્વ અને વ્યવસ્થિત માહિતીપ્રદ સ્ત્રી અવાજ (આંગણવાડી ભરતી, પરિપત્ર અને પગાર વધારાના વિડીયો માટે ૧૦૦% યોગ્ય).
              </p>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 0.68rem; color: #c4b5fd;">Custom Clone Model</span>
                <button class="btn btn-secondary btn-sm play-sample-btn" data-src="/audio/my_real_cloned_voice.mp3" style="padding: 2px 8px; font-size: 0.72rem;">
                  ▶️ સેમ્પલ
                </button>
              </div>
            </div>

            <!-- 5. Google Wavenet Male -->
            <div class="voice-profile-card ${selectedProfile === 'google-wavenet-male' ? 'active' : ''}" data-profile="google-wavenet-male" data-voiceid="gu-IN-Wavenet-B" style="padding: 12px; border-radius: 10px; border: ${selectedProfile === 'google-wavenet-male' ? '2px solid #a855f7' : '1px solid var(--border-color)'}; background: ${selectedProfile === 'google-wavenet-male' ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.02)'}; cursor: pointer; transition: all 0.2s;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 800; font-size: 0.9rem; color: #fff;">👨 સત્તાવાર પુરુષ અવાજ</span>
                <span class="badge" style="background: rgba(168,85,247,0.25); color: #c084fc; font-size: 0.68rem; font-weight: 700;">Wavenet</span>
              </div>
              <p style="font-size: 0.74rem; color: #cbd5e1; margin: 0 0 8px 0; line-height: 1.4;">
                ગંભીર, મજબૂત અને પ્રભાવશાળી પુરુષ અવાજ. પરિપત્રો અને બ્રેકિંગ ન્યૂઝ માટે.
              </p>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 0.68rem; color: #c084fc;">gu-IN-Wavenet-B</span>
                <button class="btn btn-secondary btn-sm play-sample-btn" data-src="/audio/clean_fluent_professional.mp3" style="padding: 2px 8px; font-size: 0.72rem;">
                  ▶️ સેમ્પલ
                </button>
              </div>
            </div>
          </div>

          <!-- Quick Anchor Speed Presets & Slider -->
          <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label style="font-size: 0.8rem; color: #cbd5e1; font-weight: 700;">
                ⚡ વાણીની ઝડપ (Anchor Speed): <span id="speed-val" style="color: #38bdf8; font-weight: 800;">${selectedSpeed.toFixed(2)}x</span>
              </label>
              <button id="btn-toggle-api-settings" class="btn btn-outline btn-sm" style="font-size: 0.72rem; padding: 2px 8px;">
                ⚙️ API સેટિંગ્સ
              </button>
            </div>

            <!-- Quick Speed Buttons -->
            <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;" id="speed-presets-container">
              <button type="button" class="btn btn-sm speed-btn ${Math.abs(selectedSpeed - 1.0) < 0.04 ? 'btn-primary' : 'btn-outline'}" data-speed="1.0" style="padding: 3px 9px; font-size: 0.72rem; font-weight: 700;">
                📻 1.0x શાંત
              </button>
              <button type="button" class="btn btn-sm speed-btn ${Math.abs(selectedSpeed - 1.08) < 0.04 ? 'btn-primary' : 'btn-outline'}" data-speed="1.08" style="padding: 3px 9px; font-size: 0.72rem; font-weight: 700;">
                🌸 1.08x સુરીલો & ભાવપૂર્ણ પ્રવાહ (Best Natural Feelings ⭐)
              </button>
              <button type="button" class="btn btn-sm speed-btn ${Math.abs(selectedSpeed - 1.15) < 0.04 ? 'btn-primary' : 'btn-outline'}" data-speed="1.15" style="padding: 3px 9px; font-size: 0.72rem; font-weight: 700;">
                ⚡ 1.15x ઝડપી યુટ્યુબ એન્કર
              </button>
            </div>

            <input type="range" id="voice-speed" min="0.8" max="1.3" step="0.02" value="${selectedSpeed}" style="width: 100%;">

            <!-- Collapsible Settings Box -->
            <div id="api-settings-box" style="display: none; margin-top: 10px; padding: 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(139,92,246,0.3); border-radius: 8px;">
              <div style="background: rgba(16,185,129,0.12); padding: 6px 10px; border-radius: 6px; font-size: 0.75rem; color: #10b981; margin-bottom: 8px;">
                💡 Google Cloud માં દર મહિને ૧૦,૦૦,૦૦૦ (૧૦ લાખ) અક્ષરો તદ્દન મફત મળે છે! કી ના હોય તો પણ 100% ફ્રી એન્જિન આપમેળે ચાલશે.
              </div>
              <div style="margin-bottom: 8px;">
                <label style="display: block; font-size: 0.75rem; color: #cbd5e1; margin-bottom: 2px;">Google Cloud API Key (ઓપ્શનલ):</label>
                <input type="password" id="input-google-api-key" class="form-control" placeholder="તમારી Google Cloud API Key અહીં દાખલ કરો..." value="${googleApiKey}" style="width: 100%; font-size: 0.78rem;">
              </div>
              <div style="margin-bottom: 10px;">
                <label style="display: block; font-size: 0.75rem; color: #cbd5e1; margin-bottom: 2px;">કસ્ટમ વોઇસ / ક્લોન ID:</label>
                <input type="text" id="input-custom-voice-id" class="form-control" placeholder="દા.ત. projects/.../voices/my-clone" value="${customVoiceId}" style="width: 100%; font-size: 0.78rem;">
              </div>
              <button id="btn-save-voice-settings" class="btn btn-secondary btn-sm" style="font-weight: 700; font-size: 0.75rem;">
                💾 સાચવો
              </button>
            </div>
          </div>
        </div>

        <!-- CARD: LIVE VOICE RECORDER, NOISE REMOVAL & PITCH TUNING SUITE -->
        <div class="card" style="margin-bottom: 18px; padding: 18px; border: 1.5px solid #ec4899; background: linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.9)); border-radius: 12px; box-shadow: 0 4px 20px rgba(236,72,153,0.15);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.4rem;">🎙️</span>
              <div>
                <h3 style="font-size: 1.05rem; font-weight: 800; color: #f472b6; margin: 0;">
                  લાઈવ ઓડિયો રેકોર્ડર & પ્રો એડિટર (Live Voice Studio)
                </h3>
                <span style="font-size: 0.74rem; color: #cbd5e1;">
                  પોતાનો અવાજ રેકોર્ડ કરો • પરફેક્ટ નોઈઝ રિમૂવલ • સ્પષ્ટ વાણી • પિચ સેટિંગ્સ
                </span>
              </div>
            </div>
            <span class="badge" style="background: rgba(236,72,153,0.25); color: #f472b6; font-size: 0.72rem; font-weight: 800; border: 1px solid rgba(236,72,153,0.4);">
              Studio DSP Engine
            </span>
          </div>

          <!-- 1. Recorder Control Bar -->
          <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <button id="btn-toggle-record" type="button" class="btn btn-primary" style="background: linear-gradient(135deg, #ef4444, #dc2626); border: none; font-weight: 800; font-size: 0.88rem; padding: 10px 20px; border-radius: 8px; box-shadow: 0 4px 14px rgba(239,68,68,0.4); cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                  <span id="record-icon" style="font-size: 1rem;">🔴</span>
                  <span id="record-btn-text">રેકોર્ડિંગ શરૂ કરો</span>
                </button>
                <div id="recording-timer" style="font-family: monospace; font-size: 1.15rem; font-weight: 800; color: #ef4444; min-width: 65px; letter-spacing: 1px;">
                  00:00
                </div>
              </div>

              <!-- Live Volume / Mic Level Meter -->
              <div style="flex: 1; min-width: 140px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 600;">માઈક લેવલ:</span>
                <div style="flex: 1; height: 10px; background: rgba(255,255,255,0.08); border-radius: 5px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
                  <div id="mic-level-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #10b981 60%, #f59e0b 85%, #ef4444 100%); transition: width 0.08s ease;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Recorded Audio Enhancer & Controls (Shows once audio is recorded) -->
          <div id="recorded-editor-box" style="display: none; background: rgba(15,23,42,0.8); border: 1.5px solid #38bdf8; border-radius: 10px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
              <div style="font-size: 0.88rem; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
                <span>✨</span> રેકોર્ડ કરેલો અવાજ & સ્ટુડિયો એડિટર
              </div>
              <span id="recorded-meta-badge" class="badge" style="background: rgba(56,189,248,0.2); color: #7dd3fc; font-size: 0.7rem;">0.0s</span>
            </div>

            <!-- Enhanced Audio Player -->
            <audio id="recorded-audio-player" controls style="width: 100%; margin-bottom: 14px; border-radius: 8px;"></audio>

            <!-- Audio DSP Tuning Sliders & Toggles -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 14px;">
              <!-- A. Noise Removal Toggle -->
              <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer;">
                <div>
                  <div style="font-size: 0.82rem; font-weight: 800; color: #34d399;">🛡️ પરફેક્ટ નોઈઝ રિમૂવલ</div>
                  <div style="font-size: 0.68rem; color: #94a3b8;">પંખો & બેકગ્રાઉન્ડ અવાજ શૂન્ય કરો</div>
                </div>
                <input type="checkbox" id="toggle-noise-removal" checked style="width: 18px; height: 18px; accent-color: #10b981; cursor: pointer;">
              </label>

              <!-- B. Clarity / Vocal Boost Toggle -->
              <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer;">
                <div>
                  <div style="font-size: 0.82rem; font-weight: 800; color: #38bdf8;">✨ સ્પષ્ટ વાણી બૂસ્ટ (Clarity)</div>
                  <div style="font-size: 0.68rem; color: #94a3b8;">શુદ્ધ શબ્દો & સ્ટુડિયો કમ્પ્રેશન</div>
                </div>
                <input type="checkbox" id="toggle-clarity-boost" checked style="width: 18px; height: 18px; accent-color: #38bdf8; cursor: pointer;">
              </label>
            </div>

            <!-- C. Pitch & Volume Controls -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 14px;">
              <!-- Pitch Tuning Slider -->
              <div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.08); padding: 10px 12px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 0.78rem; font-weight: 700; color: #f1f5f9;">🎚️ પિચ એડિટ (Pitch Tuning)</span>
                  <span id="pitch-val-display" style="font-size: 0.74rem; font-weight: 800; color: #ec4899; font-family: monospace;">0 st (સામાન્ય)</span>
                </div>
                <input type="range" id="input-pitch-slider" min="-6" max="6" step="1" value="0" style="width: 100%; accent-color: #ec4899; cursor: pointer;">
                <div style="display: flex; justify-content: space-between; font-size: 0.62rem; color: #64748b; margin-top: 2px;">
                  <span>-6 (ભારે/ઊંડો)</span>
                  <span>૦ (સામાન્ય)</span>
                  <span>+6 (તીણો/હળવો)</span>
                </div>
              </div>

              <!-- Volume Gain Booster Slider -->
              <div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.08); padding: 10px 12px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-size: 0.78rem; font-weight: 700; color: #f1f5f9;">🔊 અવાજ બૂસ્ટ (Volume)</span>
                  <span id="volume-val-display" style="font-size: 0.74rem; font-weight: 800; color: #10b981; font-family: monospace;">120%</span>
                </div>
                <input type="range" id="input-volume-slider" min="0.5" max="2.5" step="0.1" value="1.2" style="width: 100%; accent-color: #10b981; cursor: pointer;">
                <div style="display: flex; justify-content: space-between; font-size: 0.62rem; color: #64748b; margin-top: 2px;">
                  <span>50%</span>
                  <span>100%</span>
                  <span>250%</span>
                </div>
              </div>
            </div>

            <!-- Apply & Export Action Buttons -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button id="btn-apply-enhancements" type="button" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #8b5cf6, #ec4899); border: none; font-weight: 800; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <span>⚡</span> એન્હાન્સમેન્ટ લાગુ કરો (Apply Clean & Pitch)
              </button>
              <a id="btn-download-clean-audio" href="#" download="my_studio_recording.wav" class="btn btn-secondary btn-sm" style="font-weight: 700; color: #10b981; border-color: rgba(16,185,129,0.4); padding: 8px 14px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                <span>💾</span> સાફ WAV ડાઉનલોડ
              </a>
              <button id="btn-use-recorded-in-project" type="button" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #7dd3fc; font-weight: 700; padding: 8px 14px; border-radius: 8px; cursor: pointer;">
                <span>🎬</span> Slide Editor માં મોકલો ➔
              </button>
            </div>
          </div>
        </div>

        <!-- CARD 2: SCRIPT INPUT, TONE FRAMEWORK & AAROH-AVROH -->
        <div class="card" style="margin-bottom: 18px; padding: 16px;">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid var(--border-color); margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
            <div class="card-title" style="font-size: 1rem; font-weight: 700;">
              <span>📝</span> ૨. સ્ક્રિપ્ટ લખાણ & વિષય ઢાંચો (Tone Framework)
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button id="btn-mold-to-framework" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #10b981, #059669); border: none; font-size: 0.74rem; font-weight: 700; padding: 3px 10px;">
                ✨ આ ઢાંચામાં સ્ક્રિપ્ટ ઢાળો
              </button>
              <button id="btn-clean-phonetics" class="btn btn-outline btn-sm" style="font-size: 0.74rem; padding: 2px 8px;">
                ✨ શુદ્ધ ગુજરાતી
              </button>
              <button id="btn-clear-script" class="btn btn-outline btn-sm" style="font-size: 0.74rem; padding: 2px 8px; color: var(--text-muted);">
                સાફ કરો
              </button>
            </div>
          </div>

          <!-- 4 Topic Specific Script Frameworks (ઢાંચા) Selector -->
          <div style="margin-bottom: 12px; background: rgba(0,0,0,0.35); padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; flex-wrap: wrap; gap: 4px;">
              <label style="font-size: 0.76rem; color: #38bdf8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                🎯 સ્ક્રિપ્ટ ઢાંચો પસંદ કરો (Tone Framework):
              </label>
              <span id="framework-active-badge" class="badge" style="background: rgba(56,189,248,0.2); color: #38bdf8; font-size: 0.68rem; font-weight: 700;">
                હાઇ એનર્જી હૂક • સત્તાવાર ગંભીરતા
              </span>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="framework-buttons-container">
              <button type="button" class="btn btn-sm framework-btn btn-primary" data-framework="breaking" style="padding: 4px 9px; font-size: 0.74rem; font-weight: 700;">
                💥 ૧. બ્રેકિંગ/GR
              </button>
              <button type="button" class="btn btn-sm framework-btn btn-outline" data-framework="schemes" style="padding: 4px 9px; font-size: 0.74rem; font-weight: 700;">
                🏛️ ૨. યોજના/સહાય
              </button>
              <button type="button" class="btn btn-sm framework-btn btn-outline" data-framework="recruitment" style="padding: 4px 9px; font-size: 0.74rem; font-weight: 700;">
                👩‍🏫 ૩. ભરતી/ઓજસ
              </button>
              <button type="button" class="btn btn-sm framework-btn btn-outline" data-framework="educational" style="padding: 4px 9px; font-size: 0.74rem; font-weight: 700;">
                🌸 ૪. શૈક્ષણિક ગાઈડ
              </button>
            </div>
          </div>

          <!-- Emotion Selection -->
          <div style="margin-bottom: 10px;">
            <label style="display: block; font-size: 0.78rem; color: #cbd5e1; font-weight: 700; margin-bottom: 4px;">
              વાણીનો ભાવ (Vocal Delivery Emotion):
            </label>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="emotion-buttons-container">
              <button type="button" class="btn btn-sm emotion-btn ${selectedEmotion === 'enthusiastic' ? 'btn-primary' : 'btn-outline'}" data-emotion="enthusiastic" style="padding: 4px 9px; font-size: 0.75rem; font-weight: 700;">
                🌟 ઉત્સાહી & આકર્ષક
              </button>
              <button type="button" class="btn btn-sm emotion-btn ${selectedEmotion === 'official' ? 'btn-primary' : 'btn-outline'}" data-emotion="official" style="padding: 4px 9px; font-size: 0.75rem; font-weight: 700;">
                🏛️ ગંભીર & સત્તાવાર
              </button>
              <button type="button" class="btn btn-sm emotion-btn ${selectedEmotion === 'calm' ? 'btn-primary' : 'btn-outline'}" data-emotion="calm" style="padding: 4px 9px; font-size: 0.75rem; font-weight: 700;">
                🌸 શાંત & શૈક્ષણિક
              </button>
            </div>
          </div>

          <!-- Script Accuracy Notice -->
          <div style="background: rgba(56, 189, 248, 0.1); border-left: 3px solid #38bdf8; padding: 6px 10px; border-radius: 4px; margin-bottom: 8px; font-size: 0.74rem; color: #7dd3fc; display: flex; align-items: center; gap: 6px;">
            <span>📢</span>
            <span><strong>૧૦૦% તમારી સ્ક્રિપ્ટ મુજબ બોલશે:</strong> નીચે બોક્સમાં તમે જે સ્ક્રિપ્ટ કે ટેક્સ્ટ લખશો, અવાજ અક્ષરશઃ એ જ શબ્દો બોલશે.</span>
          </div>

          <!-- Script-Aware AI Voice Engine Badge & Analysis Bar -->
          <div id="script-aware-analysis-bar" style="background: linear-gradient(135deg, rgba(124,58,237,0.18), rgba(56,189,248,0.12)); border: 1.5px solid #8b5cf6; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.3rem;">🧠</span>
              <div>
                <div style="font-size: 0.82rem; font-weight: 800; color: #fff;">
                  સ્ક્રિપ્ટ એન્જિન વિશ્લેષણ: <span id="detected-category-badge" style="color: #38bdf8; font-weight: 800;">વિશ્લેષણ થઈ રહ્યું છે...</span>
                </div>
                <div id="detected-category-desc" style="font-size: 0.72rem; color: #cbd5e1; margin-top: 2px;">
                  સ્ક્રિપ્ટના વાસ્તવિક અર્થ મુજબ યોગ્ય અવાજ લય, આરોહ-અવરોહ અને વિરામ ગોઠવાશે.
                </div>
              </div>
            </div>
            <button id="btn-toggle-prosody-map" type="button" class="btn btn-outline btn-sm" style="font-size: 0.72rem; padding: 3px 9px; border-color: #8b5cf6; color: #c4b5fd;">
              વાક્યવાર લય નકશો 👁️
            </button>
          </div>

          <!-- Sentence Prosody Mapping Container (Expandable) -->
          <div id="sentence-prosody-map-box" style="display: none; background: rgba(15,23,42,0.92); border: 1px solid rgba(139,92,246,0.35); border-radius: 8px; padding: 10px; margin-bottom: 10px; max-height: 220px; overflow-y: auto;">
            <div style="font-size: 0.74rem; font-weight: 700; color: #cbd5e1; margin-bottom: 6px;">વાક્યવાર આરોહ-અવરોહ વિતરણ:</div>
            <div id="sentence-prosody-list" style="display: flex; flex-direction: column; gap: 6px;"></div>
          </div>

          <!-- Script Textarea -->
          <textarea id="voice-script-text" rows="7" class="form-control font-gu" placeholder="અહીં તમારી ગુજરાતી સ્ક્રિપ્ટ લખો અથવા પેસ્ટ કરો..." style="width: 100%; font-size: 0.92rem; line-height: 1.6; font-family: inherit; margin-bottom: 8px;"></textarea>

          <!-- Live Aaroh-Avroh Cadence Indicator -->
          <div id="aaroh-avroh-cadence-bar" style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 6px; padding: 7px 10px; margin-bottom: 8px; font-size: 0.72rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
            <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
              <span style="font-weight: 800; color: #10b981;">🎙️ આરોહ-અવરોહ ઢાંચો:</span>
              <span style="color: #cbd5e1;">↗️ હૂક</span> •
              <span style="color: #cbd5e1;">↘️ સત્તાવાર પુરાવો</span> •
              <span style="color: #cbd5e1;">⏸️ આંકડાકીય વિરામ</span> •
              <span style="color: #cbd5e1;">🤝 ઉપસંહાર</span>
            </div>
            <span class="badge badge-green" style="font-size: 0.65rem;">✓ શુદ્ધ ઉચ્ચારણ & સચોટ ટોન</span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted); flex-wrap: wrap; gap: 6px;">
            <div>શબ્દો: <span id="word-count" style="color: #fff; font-weight: 700;">0</span> • અંદાજિત સમય: <span id="est-time" style="color: #38bdf8; font-weight: 700;">0s</span></div>
            <div style="color: #10b981; font-weight: 600;">✓ ૧૦૦% માનવીય વાણી & સચોટ ટોન</div>
          </div>
        </div>

        <!-- CARD 3: GENERATE BUTTON -->
        <button id="btn-generate-voice" class="btn btn-primary" style="width: 100%; padding: 13px; font-size: 1rem; font-weight: 800; background: linear-gradient(135deg, #7c3aed, #ec4899); border: none; box-shadow: 0 4px 18px rgba(124,58,237,0.35); margin-bottom: 20px;">
          <span>🎙️</span> ઉપર લખેલ સ્ક્રિપ્ટ બોલાવો (Generate Voice For My Script)
        </button>

        <!-- CARD 4: AUDIO PLAYER (WHEN GENERATED) -->
        <div id="generated-player-card" class="card" style="display: none; margin-bottom: 20px; border: 2px solid #8b5cf6; background: linear-gradient(135deg, rgba(46,16,101,0.6), rgba(30,27,75,0.8)); padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">🎧</span>
              <span style="font-weight: 800; font-size: 0.95rem; color: #fff;" id="player-title">video_narration.mp3</span>
            </div>
            <span class="badge badge-green" style="font-size: 0.7rem;">તૈયાર ✓</span>
          </div>

          <audio id="main-audio-player" controls style="width: 100%; margin-bottom: 12px;"></audio>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <a id="btn-download-audio" href="#" download class="btn btn-secondary btn-sm" style="font-weight: 700; color: #10b981; border-color: rgba(16,185,129,0.4); font-size: 0.78rem;">
              <span>💾</span> ડાઉનલોડ MP3
            </a>
            <button id="btn-copy-audio-url" class="btn btn-outline btn-sm" style="font-size: 0.78rem;">
              <span>📋</span> લિંક કોપી
            </button>
            <button id="btn-goto-step5-after-audio" class="btn btn-primary btn-sm" style="font-weight: 800; background: linear-gradient(135deg, #10b981, #059669); border: none; font-size: 0.78rem;">
              <span>🖼️</span> આગળ વધો: ૫. થંબનેલ ➔
            </button>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- RIGHT COLUMN: BAJU MA THUMBNAIL PREVIEW & EXACT PROMPT + AUDIO LIBRARY    -->
      <!-- ========================================================================= -->
      <div id="col-thumb-studio" style="min-width: 0; display: flex; flex-direction: column; gap: 18px;">
        
        <!-- CARD: PASAND KAREL THUMBNAIL ANE AENO PROMPT -->
        <div id="selected-thumb-full-card" class="card" style="border: 2px solid #38bdf8; background: #0f172a; padding: 18px; border-radius: var(--radius-lg); box-shadow: 0 10px 25px rgba(0,0,0,0.4); scroll-margin-top: 70px;">
          
          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.25rem;">🎨</span>
              <h3 style="font-size: 1rem; font-weight: 800; color: #38bdf8; margin: 0;">
                પસંદ કરેલ થંબનેલ & પ્રોમ્પ્ટ
              </h3>
            </div>
            <span class="badge" style="background: rgba(56,189,248,0.2); color: #38bdf8; font-size: 0.68rem; font-weight: 700;">
              ૧૬:૯ High-CTR
            </span>
          </div>

          <!-- Quick Concept Switcher Buttons -->
          <div style="display: flex; gap: 4px; margin-bottom: 12px; flex-wrap: wrap;">
            <span style="font-size: 0.72rem; color: var(--text-muted); align-self: center; margin-right: 2px;">કોન્સેપ્ટ:</span>
            <button class="btn btn-sm btn-outline thumb-concept-switch active" data-concept="0" style="padding: 2px 7px; font-size: 0.7rem;">#૧ DA/પગાર</button>
            <button class="btn btn-sm btn-outline thumb-concept-switch" data-concept="1" style="padding: 2px 7px; font-size: 0.7rem;">#૨ આંગણવાડી</button>
            <button class="btn btn-sm btn-outline thumb-concept-switch" data-concept="2" style="padding: 2px 7px; font-size: 0.7rem;">#૩ પીએમ કિસાન</button>
          </div>

          <!-- Realistic 16:9 Thumbnail Visual Preview Card (Pure White #FFFFFF Background) -->
          <div id="thumb-visual-preview" style="background: #ffffff; border-radius: 10px; border: 2px solid #e2e8f0; padding: 14px; margin-bottom: 12px; color: #0a0d14; box-shadow: 0 6px 20px rgba(0,0,0,0.3); position: relative; overflow: hidden; min-height: 140px; display: flex; flex-direction: column; justify-content: space-between;">
            <!-- Top Badges -->
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.65rem;">
              <span style="background: #dc2626; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: 800;">
                🔴 સત્તાવાર નિર્ણય
              </span>
              <span style="background: #0f172a; color: #f8fafc; padding: 2px 6px; border-radius: 4px; font-weight: 700;">
                ૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ
              </span>
            </div>

            <!-- Thumbnail Visual Content Mockup -->
            <div style="display: flex; align-items: center; gap: 10px; margin: 8px 0;">
              <!-- Photo Subject Badge (Left) -->
              <div style="width: 58px; height: 58px; border-radius: 8px; background: #f1f5f9; border: 1.5px solid #cbd5e1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4px; flex-shrink: 0;">
                <span style="font-size: 1.4rem;">🏛️</span>
                <span id="preview-photo-label" style="font-size: 0.52rem; color: #334155; font-weight: 800; line-height: 1.1; margin-top: 2px;">
                  સત્તાવાર ફોટો
                </span>
              </div>

              <!-- Bold High-Contrast Text (Right) -->
              <div style="flex: 1; min-width: 0;">
                <div id="preview-bold-text" style="font-size: 0.95rem; font-weight: 900; color: #0f2b5c; line-height: 1.25; font-family: 'Noto Sans Gujarati', sans-serif;">
                  ${activeThumb.gujaratiWords || '૫૦% DA મંજૂર! ખાતામાં આવશે ₹15,000 થી ₹45,000'}
                </div>
                <div style="font-size: 0.68rem; color: #b91c1c; font-weight: 800; margin-top: 3px;">
                  ★ લાઈવ પરિપત્ર સાથે ખુલાસો
                </div>
              </div>
            </div>

            <!-- Bottom Contrast Indicator -->
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.62rem; color: #475569; border-top: 1px solid #f1f5f9; padding-top: 4px;">
              <span>ફોટો સબ્જેક્ટ: <strong id="preview-subject-text" style="color: #0f172a;">${activeThumb.photoSubject ? activeThumb.photoSubject.substring(0, 26) + '...' : 'મુખ્યમંત્રીશ્રી ભૂપેન્દ્ર પટેલ'}</strong></span>
              <span style="color: #16a34a; font-weight: 700;">AAA 14.2:1 ✓</span>
            </div>
          </div>

          <!-- THE EXACT THUMBNAIL PROMPT ("તેનો પ્રોમ્પ્ટ આવવો જોઈએ") -->
          <div style="margin-bottom: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <label style="font-size: 0.72rem; color: #38bdf8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                🤖 DALL-E 3 / AI થંબનેલ પ્રોમ્પ્ટ:
              </label>
              <span style="font-size: 0.68rem; color: #10b981; font-weight: 700;">
                Photorealistic • 16:9
              </span>
            </div>
            <textarea id="thumb-exact-prompt-box" class="form-input font-en" style="height: 110px; font-size: 0.75rem; line-height: 1.4; background: #07090e; color: #f1f5f9; border: 1.5px solid #38bdf8; border-radius: 8px; width: 100%; box-sizing: border-box;" readonly>${activeThumb.dalleShortPrompt || activeThumb.prompt || ''}</textarea>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="btn-copy-selected-thumb-prompt" class="btn btn-primary btn-sm" style="flex: 1; min-width: 140px; background: #0284c7; border-color: #38bdf8; font-weight: 700; font-size: 0.76rem; padding: 7px 10px;">
              <span>📋</span> ૧-ક્લિક થંબનેલ પ્રોમ્પ્ટ કોપી
            </button>
            <a href="https://www.canva.com/create/youtube-thumbnails/" target="_blank" rel="noopener noreferrer" id="btn-open-canva-thumb" class="btn btn-outline btn-sm" style="border: 1.5px solid #06b6d4; color: #67e8f9; font-weight: 700; font-size: 0.76rem; padding: 7px 12px; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; background: rgba(6,182,212,0.15);" title="Canva માં 16:9 થંબનેલ બનાવો">
              <span>🎨</span> Canva ↗
            </a>
            <button id="btn-goto-thumbnails-full" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #7dd3fc; font-size: 0.76rem; padding: 7px 10px;">
              <span>🎨</span> એડિટ કરો ➔
            </button>
          </div>
        </div>

        <!-- CARD: SAVED AUDIO LIBRARY -->
        <div class="card" style="padding: 16px;">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid var(--border-color); margin-bottom: 12px;">
            <div class="card-title" style="font-size: 0.92rem; font-weight: 700;">
              <span>📂</span> સાચવેલ ઓડિયો લાઇબ્રેરી
            </div>
            <button id="btn-refresh-library" class="btn btn-outline btn-sm" style="padding: 2px 7px; font-size: 0.72rem;">
              🔄 રિફ્રેશ
            </button>
          </div>

          <div id="audio-library-container" style="max-height: 280px; overflow-y: auto;">
            <div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 18px;">
              ઓડિયો લોડ થાય છે...
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Responsive Style Helper for MyVoice Screen -->
    <style>
      @media (max-width: 860px) {
        #voice-thumb-grid {
          grid-template-columns: 1fr !important;
        }
      }
    </style>
  `;

  // Prepopulate script from project state if available
  const scriptTextarea = document.getElementById('voice-script-text');
  const wordCountSpan = document.getElementById('word-count');
  const estTimeSpan = document.getElementById('est-time');

  function updateCounters() {
    const text = scriptTextarea.value.trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const estSec = Math.round((words / 130) * 60);
    wordCountSpan.textContent = words;
    estTimeSpan.textContent = `${estSec}s (~${(estSec / 60).toFixed(1)} મિનિટ)`;
  }

  let analysisDebounceTimer = null;
  async function runScriptAnalysis() {
    const text = scriptTextarea.value.trim();
    if (!text) {
      document.getElementById('detected-category-badge').textContent = 'સ્ક્રિપ્ટ લખો...';
      document.getElementById('detected-category-desc').textContent = 'સ્ક્રિપ્ટના અર્થ મુજબ લય અને આરોહ-અવરોહ આપમેળે સેટ થશે.';
      return;
    }
    try {
      const res = await api.post('/api/voice/analyze-script', { text, userSpeed: selectedSpeed, userEmotion: selectedEmotion });
      if (res && res.success && res.context) {
        document.getElementById('detected-category-badge').textContent = res.context.badgeGuj;
        document.getElementById('detected-category-desc').textContent = res.context.description;

        const prosodyList = document.getElementById('sentence-prosody-list');
        if (prosodyList && res.sentences) {
          prosodyList.innerHTML = res.sentences.map(s => `
            <div style="padding: 5px 8px; background: rgba(255,255,255,0.03); border-radius: 4px; border-left: 3px solid ${s.role === 'opening_hook' ? '#38bdf8' : (s.role === 'dense_data' ? '#10b981' : (s.role === 'official_decision' ? '#a855f7' : '#f59e0b'))}; font-size: 0.72rem; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <span style="color: #f1f5f9; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.id}. ${s.text}</span>
              <span style="color: #94a3b8; font-size: 0.68rem; white-space: nowrap;">${s.badgeGuj} (${s.pitch}, ${s.rate})</span>
            </div>
          `).join('');
        }
      }
    } catch (_) {}
  }

  // Toggle Prosody Map Visibility
  document.getElementById('btn-toggle-prosody-map')?.addEventListener('click', () => {
    const box = document.getElementById('sentence-prosody-map-box');
    if (box) {
      box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }
  });

  scriptTextarea.addEventListener('input', () => {
    updateCounters();
    clearTimeout(analysisDebounceTimer);
    analysisDebounceTimer = setTimeout(runScriptAnalysis, 450);
    try {
      localStorage.setItem('gyan_yatra_custom_user_script', scriptTextarea.value);
      if (projectState && typeof projectState.setScriptText === 'function') {
        projectState.setScriptText(scriptTextarea.value);
      }
    } catch (_) {}
  });

  // Load user's saved script or project script
  const savedUserScript = localStorage.getItem('gyan_yatra_custom_user_script');
  if (savedUserScript && savedUserScript.trim()) {
    scriptTextarea.value = savedUserScript;
    updateCounters();
  } else if (project?.script?.sections && project.script.sections.length > 0) {
    scriptTextarea.value = project.script.sections.map(s => s.content || s.text).join('\n\n');
    updateCounters();
  } else if (!scriptTextarea.value) {
    scriptTextarea.value = 'નમસ્તે મિત્રો! આજના વિડીયોમાં આપણે વાત કરીશું ગુજરાત સરકારી કર્મચારીઓ અને પેન્શનર્સના મોંઘવારી ભથ્થા એટલે કે DA અને પગાર વધારાના સત્તાવાર નિર્ણય વિશે. ગાંધીનગર સચિવાલય દ્વારા નવો પરિપત્ર જાહેર કરી દેવામાં આવ્યો છે.\n\nનાણાં વિભાગ દ્વારા લેવાયેલા નિર્ણય મુજબ કર્મચારીઓના મૂળ પગાર અને ભથ્થામાં ચોક્કસ ટકાવારીનો વધારો મંજૂર થયો છે. આ વધારો કઈ તારીખથી ખાતામાં જમા થશે અને કેટલો એરિયર્સ મળશે તેની સંપૂર્ણ સચોટ ગણતરી આગળ જોઈશું.\n\nતમામ કર્મચારી મિત્રો અને વોટ્સએપ ગ્રૂપમાં આ વિડીયો શેર કરજો. ચેનલ જ્ઞાન યાત્રાને સબ્સ્ક્રાઇબ કરી લેજો. જય હિન્દ, જય જય ગરવી ગુજરાત!';
    updateCounters();
  }
  setTimeout(runScriptAnalysis, 200);

  // Import Script Button
  document.getElementById('btn-import-script').addEventListener('click', () => {
    const p = (projectState && typeof projectState.getProject === 'function') ? projectState.getProject() : project;
    if (p?.script?.sections && p.script.sections.length > 0) {
      scriptTextarea.value = p.script.sections.map(s => s.content || s.text).join('\n\n');
      updateCounters();
      copyToClipboard('', 'સ્ક્રિપ્ટ સફળતાપૂર્વક લોડ થઈ ગઈ! ✓');
    } else {
      alert('સ્ક્રિપ્ટ રાઇટરમાંથી પહેલા નવી સ્ક્રિપ્ટ તૈયાર કરો.');
    }
  });

  // Thumbnail Studio cross navigation
  document.getElementById('btn-goto-thumb-page')?.addEventListener('click', () => {
    navigateTo('thumbnails');
  });
  document.getElementById('btn-goto-thumbnails-full')?.addEventListener('click', () => {
    navigateTo('thumbnails');
  });

  // View Mode Switcher Handlers (Split vs Voice Only vs Thumbnail Only)
  const colVoice = document.getElementById('col-voice-studio');
  const colThumb = document.getElementById('col-thumb-studio');
  const gridContainer = document.getElementById('voice-thumb-grid');
  const btnModeSplit = document.getElementById('view-mode-split');
  const btnModeVoice = document.getElementById('view-mode-voice');
  const btnModeThumb = document.getElementById('view-mode-thumb');

  function setVoiceViewMode(mode) {
    [btnModeSplit, btnModeVoice, btnModeThumb].forEach(b => {
      if (b) {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline');
      }
    });

    if (mode === 'voice') {
      btnModeVoice?.classList.remove('btn-outline');
      btnModeVoice?.classList.add('btn-primary');
      if (colVoice) colVoice.style.display = 'block';
      if (colThumb) colThumb.style.display = 'none';
      if (gridContainer) gridContainer.style.gridTemplateColumns = '1fr';
    } else if (mode === 'thumb') {
      btnModeThumb?.classList.remove('btn-outline');
      btnModeThumb?.classList.add('btn-primary');
      if (colVoice) colVoice.style.display = 'none';
      if (colThumb) colThumb.style.display = 'block';
      if (gridContainer) gridContainer.style.gridTemplateColumns = '1fr';
    } else {
      // Split / Side-by-side
      btnModeSplit?.classList.remove('btn-outline');
      btnModeSplit?.classList.add('btn-primary');
      if (colVoice) colVoice.style.display = 'block';
      if (colThumb) colThumb.style.display = 'block';
      if (gridContainer) {
        gridContainer.style.gridTemplateColumns = window.innerWidth > 860 ? '1fr 380px' : '1fr';
      }
    }
  }

  btnModeSplit?.addEventListener('click', () => setVoiceViewMode('split'));
  btnModeVoice?.addEventListener('click', () => setVoiceViewMode('voice'));
  btnModeThumb?.addEventListener('click', () => setVoiceViewMode('thumb'));

  // Quick Copy Thumbnail Prompt from Banner
  document.getElementById('btn-quick-copy-thumb-prompt')?.addEventListener('click', (e) => {
    const promptText = activeThumb.dalleShortPrompt || activeThumb.prompt || document.getElementById('thumb-exact-prompt-box')?.value || '';
    copyToClipboard(promptText, '🎨 પસંદ કરેલ થંબનેલ AI પ્રોમ્પ્ટ સફળતાપૂર્વક કોપી થઈ ગયો! ✓', e.currentTarget);
  });

  // Jump to Full Thumbnail Card from Banner
  document.getElementById('btn-jump-to-thumb-card')?.addEventListener('click', () => {
    setVoiceViewMode('split');
    document.getElementById('selected-thumb-full-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // 1-Click Copy Selected Thumbnail Prompt Button (Full Card)
  document.getElementById('btn-copy-selected-thumb-prompt')?.addEventListener('click', (e) => {
    const promptText = document.getElementById('thumb-exact-prompt-box').value;
    copyToClipboard(promptText, '🎨 પસંદ કરેલ થંબનેલ AI પ્રોમ્પ્ટ સફળતાપૂર્વક કોપી થઈ ગયો! ✓', e.currentTarget);
  });

  // Navigate to Step 5 (SEO & Thumbnail Prompt)
  const gotoStep5 = () => {
    if (typeof navigateTo === 'function') {
      navigateTo('seo');
    }
  };
  document.getElementById('btn-goto-step5-seo')?.addEventListener('click', gotoStep5);
  document.getElementById('btn-goto-step5-after-audio')?.addEventListener('click', gotoStep5);

  // Import Script from Step 3
  document.getElementById('btn-import-script')?.addEventListener('click', () => {
    const p = (projectState && typeof projectState.getProject === 'function') ? projectState.getProject() : null;
    let foundText = '';
    if (p) {
      if (p.script && p.script.sections && p.script.sections.length > 0) {
        foundText = p.script.sections.map(s => s.content).join('\n\n');
      } else if (p.masterPrompt) {
        foundText = p.masterPrompt;
      }
    }
    const scriptEl = document.getElementById('script-input-area');
    if (foundText && scriptEl) {
      scriptEl.value = foundText;
      updateScriptStats();
      copyToClipboard(foundText, 'સ્ક્રિપ્ટ સફળતાપૂર્વક લવાઈ ગઈ! ✓');
    } else {
      if (typeof navigateTo === 'function') {
        navigateTo('scriptwriter');
      }
    }
  });

  // Concept switcher buttons in Thumbnail card
  document.querySelectorAll('.thumb-concept-switch').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.thumb-concept-switch').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline');
      });
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-primary');

      const cIdx = parseInt(btn.dataset.concept, 10);
      const chosen = presetConcepts[cIdx] || presetConcepts[0];
      activeThumb = chosen;

      // Update Full Preview Card elements
      document.getElementById('preview-bold-text').textContent = chosen.gujaratiWords;
      document.getElementById('preview-subject-text').textContent = chosen.photoSubject.substring(0, 26) + '...';
      document.getElementById('thumb-exact-prompt-box').value = chosen.prompt;

      // Update Mini Linked Banner elements
      const miniWords = document.getElementById('mini-thumb-words');
      if (miniWords) miniWords.textContent = chosen.gujaratiWords;
      const miniPrompt = document.getElementById('mini-prompt-text');
      if (miniPrompt) miniPrompt.textContent = chosen.prompt;

      // Save to project state
      if (projectState && typeof projectState.setThumbnail === 'function') {
        projectState.setThumbnail({
          title: chosen.title,
          gujaratiWords: chosen.gujaratiWords,
          photoSubject: chosen.photoSubject,
          dalleShortPrompt: chosen.prompt
        });
      }
    });
  });

  // Tone Framework Selection & Auto-Mold Handlers
  const badgeEl = document.getElementById('framework-active-badge');
  document.querySelectorAll('.framework-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.framework-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline');
      });
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-primary');
      selectedFramework = btn.dataset.framework;
      const fw = scriptFrameworks[selectedFramework] || scriptFrameworks.breaking;
      if (badgeEl) badgeEl.textContent = fw.badge;

      // Automatically sync emotion
      selectedEmotion = fw.emotion;
      document.querySelectorAll('.emotion-btn').forEach(eb => {
        if (eb.dataset.emotion === selectedEmotion) {
          eb.classList.remove('btn-outline');
          eb.classList.add('btn-primary');
        } else {
          eb.classList.remove('btn-primary');
          eb.classList.add('btn-outline');
        }
      });
      saveLocalSettings();
    });
  });

  // "✨ આ ઢાંચામાં સ્ક્રિપ્ટ ઢાળો" (Auto-Mold into this Framework)
  document.getElementById('btn-mold-to-framework')?.addEventListener('click', () => {
    const curTopic = (projectState && typeof projectState.getProject === 'function')
      ? (projectState.getProject()?.topic || activeThumb?.title || 'ગુજરાત કર્મચારી પગાર અને DA વધારો')
      : (activeThumb?.title || 'ગુજરાત કર્મચારી પગાર અને DA વધારો');

    const fw = scriptFrameworks[selectedFramework] || scriptFrameworks.breaking;
    const currentText = scriptTextarea.value.trim();

    // If user has custom text that is NOT the default template, preserve and mold their own text!
    const isDefault = !currentText || currentText.includes('ગુજરાત સરકારી કર્મચારીઓ અને પેન્શનર્સના મોંઘવારી ભથ્થા') || currentText.includes('ગુજરાત કર્મચારી પગાર & DA 50% વધારો');

    if (!isDefault) {
      const hookText = fw.hook ? fw.hook(curTopic) : `નમસ્તે મિત્રો! ${fw.name} અંતર્ગત એક ખૂબ જ મહત્વના સમાચાર...`;
      const closingText = fw.closing || 'તમામ મિત્રો સાથે આ વિડીયો શેર કરજો અને ચેનલને સબ્સ્ક્રાઇબ કરી લેજો.';
      scriptTextarea.value = `${hookText}\n\n${currentText}\n\n${closingText}`;
    } else {
      scriptTextarea.value = fw.template(curTopic);
    }

    updateCounters();
    try {
      localStorage.setItem('gyan_yatra_custom_user_script', scriptTextarea.value);
    } catch (_) {}
    copyToClipboard('', `✨ સ્ક્રિપ્ટ "${fw.name}" ના વાસ્તવિક ઢાંચામાં ઢળી ગઈ છે! ✓`);
  });

  // Clean Phonetics Button
  document.getElementById('btn-clean-phonetics').addEventListener('click', () => {
    if (scriptTextarea.value.trim()) {
      scriptTextarea.value = cleanGujaratiPhoneticsClient(scriptTextarea.value);
      updateCounters();
      copyToClipboard('', 'સ્ક્રિપ્ટ શુદ્ધ ગુજરાતી ઉચ્ચારો સાથે સાફ થઈ ગઈ! ✓');
    }
  });

  // Clear Script Button
  document.getElementById('btn-clear-script').addEventListener('click', () => {
    scriptTextarea.value = '';
    updateCounters();
  });

  // Voice Profile Selection
  document.querySelectorAll('.voice-profile-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.play-sample-btn')) return;
      document.querySelectorAll('.voice-profile-card').forEach(c => {
        c.classList.remove('active');
        c.style.border = '1px solid var(--border-color)';
        c.style.background = 'rgba(255,255,255,0.02)';
      });
      card.classList.add('active');
      card.style.border = '2px solid #ec4899';
      card.style.background = 'rgba(236,72,153,0.12)';
      selectedProfile = card.dataset.profile;
      saveLocalSettings();
    });
  });

  // Play Sample Audio Buttons
  document.querySelectorAll('.play-sample-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const src = btn.dataset.src;
      if (currentAudioPlayer) {
        currentAudioPlayer.pause();
      }
      currentAudioPlayer = new Audio(src);
      currentAudioPlayer.play().catch(err => console.log('Audio playback error:', err));
    });
  });

  // Speed Slider
  const speedSlider = document.getElementById('voice-speed');
  const speedVal = document.getElementById('speed-val');
  speedSlider.addEventListener('input', () => {
    selectedSpeed = parseFloat(speedSlider.value);
    speedVal.textContent = `${selectedSpeed.toFixed(2)}x`;
    saveLocalSettings();
  });

  // Quick Speed Preset Buttons
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline');
      });
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-primary');
      selectedSpeed = parseFloat(btn.dataset.speed);
      if (speedSlider) speedSlider.value = selectedSpeed;
      if (speedVal) speedVal.textContent = `${selectedSpeed.toFixed(2)}x`;
      saveLocalSettings();
    });
  });

  // Emotion Selection
  document.querySelectorAll('.emotion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emotion-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-outline');
      });
      btn.classList.remove('btn-outline');
      btn.classList.add('btn-primary');
      selectedEmotion = btn.dataset.emotion;
      saveLocalSettings();
    });
  });

  // Toggle API Settings Box
  const apiBox = document.getElementById('api-settings-box');
  document.getElementById('btn-toggle-api-settings').addEventListener('click', () => {
    apiBox.style.display = apiBox.style.display === 'none' ? 'block' : 'none';
  });

  // Save Settings
  function saveLocalSettings() {
    const toSave = {
      profileId: selectedProfile,
      emotion: selectedEmotion,
      speed: selectedSpeed,
      apiKey: document.getElementById('input-google-api-key').value.trim(),
      customVoiceId: document.getElementById('input-custom-voice-id').value.trim()
    };
    try {
      localStorage.setItem('gyan_yatra_voice_settings', JSON.stringify(toSave));
    } catch (_) {}
  }

  document.getElementById('btn-save-voice-settings').addEventListener('click', () => {
    saveLocalSettings();
    copyToClipboard('', 'વોઇસ સેટિંગ્સ સફળતાપૂર્વક સાચવવામાં આવ્યા! 💾');
    apiBox.style.display = 'none';
  });

  // Generate Voice Audio Button (FIXED WITH /api/voice/generate)
  const generateBtn = document.getElementById('btn-generate-voice');
  const playerCard = document.getElementById('generated-player-card');
  const mainAudioPlayer = document.getElementById('main-audio-player');
  const playerTitle = document.getElementById('player-title');
  const btnDownloadAudio = document.getElementById('btn-download-audio');

  generateBtn.addEventListener('click', async () => {
    const text = scriptTextarea.value.trim();
    if (!text) {
      alert('ઓડિયો બનાવવા માટે સ્ક્રિપ્ટ લખાણ દાખલ કરો.');
      return;
    }

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>⏳</span> ઢાંચા & આરોહ-અવરોહ સાથે ઓડિયો તૈયાર થાય છે...';

    let timeoutSafe = setTimeout(() => {
      if (generateBtn.disabled) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span>🎙️</span> ઢાંચા & આરોહ-અવરોહ સાથે ઓડિયો બનાવો (Generate Neural Voice Audio)';
        alert('ઓડિયો જનરેશનમાં સમય લાગી રહ્યો છે. કૃપા કરીને થોડીવાર પછી ફરી પ્રયાસ કરો.');
      }
    }, 30000);

    try {
      const apiKeyVal = document.getElementById('input-google-api-key').value.trim();
      const customVoiceVal = document.getElementById('input-custom-voice-id').value.trim();

      const res = await api.post('/api/voice/generate', {
        text,
        profileId: selectedProfile,
        emotion: selectedEmotion,
        speed: selectedSpeed,
        actorStyle: selectedFramework,
        apiKey: apiKeyVal || null,
        customVoiceId: customVoiceVal || null,
      });

      clearTimeout(timeoutSafe);

      if (res && res.success) {
        playerCard.style.display = 'block';
        const cacheBusterUrl = res.audioUrl + (res.audioUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        mainAudioPlayer.src = cacheBusterUrl;
        mainAudioPlayer.load();
        mainAudioPlayer.play().catch(() => {});
        btnDownloadAudio.href = cacheBusterUrl;
        btnDownloadAudio.setAttribute('download', res.filename);

        copyToClipboard('', `સ્ક્રિપ્ટ-આધારિત લય સાથે શુદ્ધ ઓડિયો સફળતાપૂર્વક તૈયાર થઈ ગયો! 🎙️ (${res.categoryInfo ? res.categoryInfo.nameGuj : 'માસ્ટર્ડ'})`);
        loadAudioLibrary();
      } else {
        alert(res.error || 'ઓડિયો જનરેટ કરવામાં સમસ્યા આવી.');
      }
    } catch (err) {
      clearTimeout(timeoutSafe);
      console.error('Voice generate error:', err);
      alert('ઓડિયો જનરેટ કરવામાં સમસ્યા આવી: ' + (err.message || err));
    } finally {
      clearTimeout(timeoutSafe);
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<span>🎙️</span> ઢાંચા & આરોહ-અવરોહ સાથે ઓડિયો બનાવો (Generate Neural Voice Audio)';
    }
  });

  // Audio Library Loader (FIXED WITH /api/voice/library)
  async function loadAudioLibrary() {
    const libContainer = document.getElementById('audio-library-container');
    try {
      const res = await api.get('/api/voice/library');
      if (res && res.library && res.library.length > 0) {
        libContainer.innerHTML = res.library.map(item => `
          <div style="padding: 8px 10px; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
            <div style="flex: 1; min-width: 0; margin-right: 8px;">
              <div style="font-weight: 700; font-size: 0.8rem; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${item.filename}
              </div>
              <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 1px;">
                ${item.sizeFormatted}
              </div>
            </div>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button class="btn btn-secondary btn-sm play-lib-btn" data-url="${item.audioUrl}" style="padding: 3px 6px; font-size: 0.72rem;">
                ▶️
              </button>
              <a href="${item.audioUrl}" download="${item.filename}" class="btn btn-outline btn-sm" style="padding: 3px 6px; font-size: 0.72rem;">
                💾
              </a>
              <button class="btn btn-outline btn-sm delete-lib-btn" data-filename="${item.filename}" style="padding: 3px 6px; font-size: 0.72rem; color: #ef4444; border-color: rgba(239,68,68,0.3);">
                🗑️
              </button>
            </div>
          </div>
        `).join('');

        // Wire play buttons
        libContainer.querySelectorAll('.play-lib-btn').forEach(b => {
          b.addEventListener('click', () => {
            playerCard.style.display = 'block';
            playerTitle.textContent = b.dataset.url.split('/').pop();
            mainAudioPlayer.src = b.dataset.url;
            mainAudioPlayer.play().catch(() => {});
            btnDownloadAudio.href = b.dataset.url;
            btnDownloadAudio.setAttribute('download', b.dataset.url.split('/').pop());
          });
        });

        // Wire delete buttons
        libContainer.querySelectorAll('.delete-lib-btn').forEach(b => {
          b.addEventListener('click', async () => {
            if (confirm(`શું તમે "${b.dataset.filename}" ડિલીટ કરવા માંગો છો?`)) {
              await api.delete(`/api/voice/${b.dataset.filename}`);
              loadAudioLibrary();
            }
          });
        });
      } else {
        libContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.78rem; padding: 14px;">કોઈ ઓડિયો મળ્યા નથી. ઉપરથી નવો ઓડિયો બનાવો.</div>';
      }
    } catch (err) {
      libContainer.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.78rem; padding: 14px;">લાઇબ્રેરી લોડ થઈ શકી નથી.</div>';
    }
  }

  // --- Live Audio Recorder & DSP Studio Logic ---
  const recorder = new LiveAudioRecorder();
  let rawRecordedBuffer = null;
  let currentEnhancedBlob = null;
  let currentEnhancedUrl = null;

  const btnToggleRecord = document.getElementById('btn-toggle-record');
  const recordIcon = document.getElementById('record-icon');
  const recordBtnText = document.getElementById('record-btn-text');
  const timerDisplay = document.getElementById('recording-timer');
  const micLevelBar = document.getElementById('mic-level-bar');
  const recordedEditorBox = document.getElementById('recorded-editor-box');
  const recordedAudioPlayer = document.getElementById('recorded-audio-player');
  const recordedMetaBadge = document.getElementById('recorded-meta-badge');
  const toggleNoiseRemoval = document.getElementById('toggle-noise-removal');
  const toggleClarityBoost = document.getElementById('toggle-clarity-boost');
  const inputPitchSlider = document.getElementById('input-pitch-slider');
  const pitchValDisplay = document.getElementById('pitch-val-display');
  const inputVolumeSlider = document.getElementById('input-volume-slider');
  const volumeValDisplay = document.getElementById('volume-val-display');
  const btnApplyEnhancements = document.getElementById('btn-apply-enhancements');
  const btnDownloadCleanAudio = document.getElementById('btn-download-clean-audio');
  const btnUseRecordedInProject = document.getElementById('btn-use-recorded-in-project');

  btnToggleRecord?.addEventListener('click', async () => {
    if (!recorder.isRecording) {
      try {
        await recorder.start({
          onLevel: (lvl) => {
            if (micLevelBar) micLevelBar.style.width = `${lvl}%`;
          },
          onTick: (timeStr) => {
            if (timerDisplay) timerDisplay.textContent = timeStr;
          }
        });
        if (recordIcon) recordIcon.textContent = '⏹️';
        if (recordBtnText) recordBtnText.textContent = 'રેકોર્ડિંગ બંધ કરો (Stop)';
        if (btnToggleRecord) btnToggleRecord.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        copyToClipboard('', '🎙️ માઈક્રોફોન રેકોર્ડિંગ શરૂ થઈ ગયું! સ્પષ્ટ અવાજમાં બોલો...');
      } catch (recErr) {
        alert('માઈક્રોફોન ચાલુ કરવામાં સમસ્યા: ' + (recErr.message || recErr));
      }
    } else {
      const result = await recorder.stop();
      if (recordIcon) recordIcon.textContent = '🔴';
      if (recordBtnText) recordBtnText.textContent = 'નવું રેકોર્ડિંગ શરૂ કરો';
      if (btnToggleRecord) btnToggleRecord.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      if (micLevelBar) micLevelBar.style.width = '0%';

      if (result && result.buffer) {
        rawRecordedBuffer = result.buffer;
        currentEnhancedBlob = result.blob;
        currentEnhancedUrl = result.url;
        if (recordedEditorBox) recordedEditorBox.style.display = 'block';
        if (recordedMetaBadge) recordedMetaBadge.textContent = `${result.duration.toFixed(1)}s • લાઈવ માઈક`;
        if (recordedAudioPlayer) {
          recordedAudioPlayer.src = result.url;
          recordedAudioPlayer.load();
        }
        if (btnDownloadCleanAudio) {
          btnDownloadCleanAudio.href = result.url;
        }
        await applyAudioDSP();
      }
    }
  });

  inputPitchSlider?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    const label = val === 0 ? '0 st (સામાન્ય)' : (val > 0 ? `+${val} st (તીણો/હળવો)` : `${val} st (ભારે/ઊંડો)`);
    if (pitchValDisplay) pitchValDisplay.textContent = label;
  });

  inputVolumeSlider?.addEventListener('input', (e) => {
    const val = Math.round(parseFloat(e.target.value) * 100);
    if (volumeValDisplay) volumeValDisplay.textContent = `${val}%`;
  });

  async function applyAudioDSP() {
    if (!rawRecordedBuffer) return;
    try {
      if (btnApplyEnhancements) {
        btnApplyEnhancements.disabled = true;
        btnApplyEnhancements.innerHTML = '<span>⏳</span> અવાજ ફિલ્ટર થઈ રહ્યો છે...';
      }

      const noiseRemoval = toggleNoiseRemoval ? toggleNoiseRemoval.checked : true;
      const clarityBoost = toggleClarityBoost ? toggleClarityBoost.checked : true;
      const pitchSemitones = inputPitchSlider ? parseInt(inputPitchSlider.value, 10) : 0;
      const volume = inputVolumeSlider ? parseFloat(inputVolumeSlider.value) : 1.2;

      const enhanced = await enhanceAudioBuffer(rawRecordedBuffer, {
        noiseRemoval,
        clarityBoost,
        pitchSemitones,
        volume
      });

      currentEnhancedBlob = enhanced.blob;
      currentEnhancedUrl = enhanced.url;

      if (recordedAudioPlayer) {
        recordedAudioPlayer.src = enhanced.url;
        recordedAudioPlayer.load();
        recordedAudioPlayer.play().catch(() => {});
      }
      if (btnDownloadCleanAudio) {
        btnDownloadCleanAudio.href = enhanced.url;
      }
      if (recordedMetaBadge) {
        recordedMetaBadge.textContent = `${enhanced.duration.toFixed(1)}s • ફિલ્ટર થયેલ સ્ટુડિયો WAV ✓`;
      }
      copyToClipboard('', '✨ અવાજમાંથી નોઈઝ દૂર થઈ ગઈ અને પિચ/સ્પષ્ટતા સેટ થઈ ગઈ! ✓');
    } catch (dspErr) {
      alert('ઓડિયો પ્રોસેસિંગમાં ક્ષતિ: ' + (dspErr.message || dspErr));
    } finally {
      if (btnApplyEnhancements) {
        btnApplyEnhancements.disabled = false;
        btnApplyEnhancements.innerHTML = '<span>⚡</span> એન્હાન્સમેન્ટ લાગુ કરો (Apply Clean & Pitch)';
      }
    }
  }

  btnApplyEnhancements?.addEventListener('click', applyAudioDSP);
  toggleNoiseRemoval?.addEventListener('change', applyAudioDSP);
  toggleClarityBoost?.addEventListener('change', applyAudioDSP);

  // Send enhanced recording to Slide Editor / Project State
  btnUseRecordedInProject?.addEventListener('click', () => {
    if (!currentEnhancedUrl) {
      alert('પહેલા અવાજ રેકોર્ડ કરો.');
      return;
    }
    projectState.updateProject({
      voiceAudio: {
        audioUrl: currentEnhancedUrl,
        filename: 'my_live_recording.wav',
        provider: 'Live Studio Recorder'
      }
    });
    copyToClipboard('', '🎬 આ રેકોર્ડિંગ સફળતાપૂર્વક પ્રોજેક્ટમાં સેવ થઈ ગયું! થંબનેલ (Step ૫) માં મોકલી રહ્યું છે...');
    setTimeout(() => {
      if (typeof navigateTo === 'function') navigateTo('seo');
    }, 600);
  });

  // Canva Quick Copy & Open
  document.getElementById('btn-open-canva-thumb')?.addEventListener('click', (e) => {
    const promptText = document.getElementById('thumb-exact-prompt-box')?.value || activeThumb?.prompt || '';
    copyToClipboard(promptText, '🎨 થંબનેલ AI પ્રોમ્પ્ટ કોપી થઈ ગયો! Canva માં પેસ્ટ કરો ↗', e.currentTarget);
  });

  document.getElementById('btn-refresh-library').addEventListener('click', loadAudioLibrary);
  loadAudioLibrary();

  // Navigation Banner Buttons
  container.querySelector('#btn-back-to-projects-voice')?.addEventListener('click', () => navigateTo('projects'));
  container.querySelector('#btn-prev-script-voice')?.addEventListener('click', () => navigateTo('scriptwriter'));
  container.querySelector('#btn-next-to-editing-voice')?.addEventListener('click', () => navigateTo('editing'));
}
