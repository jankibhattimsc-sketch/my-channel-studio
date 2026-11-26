/**
 * Gyan Yatra AI Studio — Professional YouTube Intelligence Dashboard
 * YouTube Studio Integration + 48-Hour AI Topic Research Master Prompt
 * 
 * Target:
 * - Minimalist, Pure White #FFFFFF interface
 * - Open YouTube Studio
 * - Open ChatGPT
 * - One-Click Copy Master Prompt
 * - Permanent AI Topic Research Master Prompt (48-Hour Screenshot Analysis -> Exactly 10 Topics, No Scripts)
 * - Zero analytics cards
 * - Zero Generate Top 5 Topics section
 * - Custom Pasted Topics Box with Time & Date management, edit, and delete
 */

import { api } from '../api.js';
import { copyToClipboard, showNoticeToast } from '../utils/clipboard.js';
import { projectState } from '../utils/projectState.js';

export async function renderHome(container, navigateTo) {
  // Loading skeleton screen
  container.innerHTML = `
    <div style="background: #FFFFFF; min-height: 80vh; padding: 40px 20px; font-family: 'Noto Sans Gujarati', 'Outfit', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <div style="width: 44px; height: 44px; border: 4px solid #E5E7EB; border-top-color: #102A56; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <h3 style="color: #102A56; margin-top: 16px; font-weight: 800; font-size: 1.1rem;">AI Topic Research ડેશબોર્ડ લોડ થઈ રહ્યું છે...</h3>
      <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    </div>
  `;

  let authRes = null;
  let customUserNotes = '';
  let editingTopicId = null;
  let activePromptMode = 'earning5'; // Default: 'earning5' (સૌથી વધુ Views ➔ ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો)

  
  const SUBTOPICS_CACHE_KEY = 'gyan_subtopics_search_cache_v1';
  let subtopicMainTopic = (typeof localStorage !== 'undefined' ? (localStorage.getItem('gyan_active_topic_name') || '') : '').trim() || 'આંગણવાડી પગાર વધારો હાઈકોર્ટ ચુકાદો';
  let subtopicCount = 5;
  let subtopicResults = [];
  let subtopicPromptText = '';
  try {
    const rawSub = localStorage.getItem(SUBTOPICS_CACHE_KEY);
    if (rawSub) {
      const parsedSub = JSON.parse(rawSub);
      if (parsedSub?.topic) subtopicMainTopic = parsedSub.topic;
      if (parsedSub?.count) subtopicCount = Number(parsedSub.count) || 5;
      if (Array.isArray(parsedSub?.subtopics)) subtopicResults = parsedSub.subtopics;
    }
  } catch (_) {}

  function generateSmartSubTopics(topic = '', count = 5) {
    const cleanTopic = (topic || '').trim() || 'આંગણવાડી પગાર વધારો હાઈકોર્ટ ચુકાદો';
    const cNum = Number(count) === 4 ? 4 : 5;
    const lower = cleanTopic.toLowerCase();

    if (/આંગણવાડી|તેડાગર|અંગનવાડી|anganwadi/i.test(lower)) {
      const list = [
        'આંગણવાડી બહેનોના પગાર વધારા અંગે હાઈકોર્ટનો ઐતિહાસિક આદેશ (LPA 363/2025 ચુકાદો)',
        'આંગણવાડી કાર્યકર અને તેડાગર: જૂનું માનદ વેતન vs નવો સન્માનજનક પગાર સંપૂર્ણ સરખામણી',
        'નવા વેતન માળખાની ગણતરી: લઘુતમ વેતન ધારા હેઠળ માસિક ₹૨૪,૮૦૦ પગાર કેવી રીતે મળશે?',
        'અમલીકરણની તારીખ અને એરિયર્સ (Arrears) ની જોગવાઈ: ક્યારથી મળશે બાકી રકમ?',
        'ગાંધીનગર સચિવાલય GR પરિપત્ર અને નાણાં વિભાગ પ્રક્રિયા: સત્તાવાર ઓર્ડર PDF ડાઉનલોડ'
      ];
      return list.slice(0, cNum);
    }

    if (/ભરતી|રિક્રુટમેન્ટ|recruitment|bharti|ojas|તલાટી|પોલીસ|કોન્સ્ટેબલ|gsrtc|ડ્રાઈવર|કંડક્ટર/i.test(lower)) {
      const list = [
        `${cleanTopic}: સત્તાવાર નોટિફિકેશન, કુલ જગ્યાઓ અને કેટેગરી વાઇઝ વિગત`,
        `${cleanTopic}: શૈક્ષણિક લાયકાત, વયમર્યાદા અને જરૂરી ડોક્યુમેન્ટ્સ ચેકલિસ્ટ`,
        `${cleanTopic}: માસિક પગાર ધોરણ અને ફિક્સ પે નિયમો ૨૦૨૬`,
        `${cleanTopic}: પરીક્ષા પદ્ધતિ, સિલેબસ અને મેરિટ ગણતરી વિશ્લેષણ`,
        `${cleanTopic}: OJAS પોર્ટલ પર ઓનલાઇન ફોર્મ ભરવાની સ્ટેપ-બાય-સ્ટેપ પદ્ધતિ અને છેલ્લી તારીખ`
      ];
      return list.slice(0, cNum);
    }

    if (/યોજના|સહાય|સબસિડી|ખેડૂત|કિસાન|ikhedut|yojana|આવાસ|પેન્શન/i.test(lower)) {
      const list = [
        `${cleanTopic}: સત્તાવાર સરકારી પરિપત્ર અને નવા નિયમો જાહેર`,
        `${cleanTopic}: કોને મળશે લાભ? પાત્રતા માપદંડો અને આવક મર્યાદા શરતો`,
        `${cleanTopic}: સહાયની રકમ: સીધા બેંક ખાતામાં DBT દ્વારા કેટલા રૂપિયા જમા થશે?`,
        `${cleanTopic}: જરૂરી પુરાવા અને ડોક્યુમેન્ટ્સની સંપૂર્ણ યાદી`,
        `${cleanTopic}: ઓનલાઇન પોર્ટલ પરથી અરજી કરવાની સરળ પદ્ધતિ અને છેલ્લી તારીખ`
      ];
      return list.slice(0, cNum);
    }

    const list = [
      `${cleanTopic}: સત્તાવાર પરિપત્ર અને તાજી નવીનતમ માહિતી`,
      `${cleanTopic}: જૂના નિયમો vs નવા નિયમો તુલનાત્મક ફેરફાર`,
      `${cleanTopic}: પાત્રતા, શરતો અને કોને કેટલો લાભ મળશે?`,
      `${cleanTopic}: જરૂરી દસ્તાવેજો અને ઓનલાઇન પોર્ટલ અરજી પદ્ધતિ`,
      `${cleanTopic}: સમયમર્યાદા, છેલ્લી તારીખ અને વારંવાર પૂછાતા પ્રશ્નો (FAQs)`
    ];
    return list.slice(0, cNum);
  }

  if (subtopicResults.length === 0) {
    subtopicResults = generateSmartSubTopics(subtopicMainTopic, subtopicCount);
  }

  function buildSubTopicsSearchPrompt(topic = subtopicMainTopic, count = subtopicCount) {
    const cleanTopic = (topic || '').trim() || 'આંગણવાડી પગાર વધારો હાઈકોર્ટ ચુકાદો';
    const cNum = Number(count) === 4 ? 4 : 5;
    return `🚨 તાત્કાલિક લાઈવ વેબ સર્ચ અને વિષય સંશોધન આદેશ (LIVE WEB SEARCH & ${cNum} VIRAL SUB-TOPICS COMMAND):

તમે એક એક્સપર્ટ ગુજરાતી યુટ્યુબ કન્ટેન્ટ સ્ટ્રેટેજિસ્ટ અને સરકારી યોજના/ભરતી વિશ્લેષક છો.
નીચે દર્શાવેલા એક જ વિષય (TOPIC) પરથી ઈન્ટરનેટ અને યુટ્યુબ પર લાઈવ સર્ચ કરો અને આ જ વિષયના સૌથી વધુ દર્શકો જોતા હોય તેવા ${cNum} શ્રેષ્ઠ વિડીયો વિષયો (${cNum} Viral Sub-Topics) આપો:

🎯 મુખ્ય વિષય: "${cleanTopic}"
👥 લક્ષિત દર્શકો: ગુજરાતના લોકો, લાભાર્થીઓ, સરકારી કર્મચારીઓ અને ઉમેદવારો

📌 કડક નિયમો (STRICT RULES):
૧. ફક્ત દર્શાવેલા મુખ્ય વિષય "${cleanTopic}" ના અંદરથી જ ${cNum} મહત્વના અલગ અલગ એંગલ / વિષયો આપો (દા.ત. ૧. સત્તાવાર પરિપત્ર અને નિયમો, ૨. જૂનો vs નવો લાભ/પગાર તુલના, ૩. પાત્રતા અને શરતો, ૪. ઓનલાઇન અરજી પદ્ધતિ, ૫. મુખ્ય પ્રશ્નો અને સ્પષ્ટતા).
૨. કોઈપણ પ્રકારની સ્ક્રિપ્ટ, ડાયલોગ, વક્તાસ્પીચ, ભૂમિકા કે વધારાનો નિબંધ લખશો નહીં (NO SCRIPTS, NO INTRO, NO EXPLANATIONS).
૩. ફક્ત નીચે મુજબ નંબરો આપીને બરાબર ${cNum} ટૂંકા, આકર્ષક અને ક્લિકેબલ ગુજરાતી વિડીયો ટાઇટલ જ આપો:
૧. [ગુજરાતી વિડીયો વિષય ૧]
૨. [ગુજરાતી વિડીયો વિષય ૨]
૩. [ગુજરાતી વિડીયો વિષય ૩]
૪. [ગુજરાતી વિડીયો વિષય ૪]${cNum === 5 ? '\n૫. [ગુજરાતી વિડીયો વિષય ૫]' : ''}`;
  }

  const PASTED_STORAGE_KEY = 'gyan_48h_pasted_topics';
  let pastedTopics = [];
  try {
    const raw = localStorage.getItem(PASTED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) pastedTopics = parsed;
    }
  } catch (_) {}

  // Initial seed if completely empty
  if (pastedTopics.length === 0) {
    pastedTopics = [
      {
        id: 'topic_seed_1',
        title: 'GSSSB CCE 2.0 નવી ભરતી ૨૦૨૬ - ૧૨૩૭ જગ્યાઓ',
        timestamp: new Date().toISOString(),
        addedToPlanner: false
      },
      {
        id: 'topic_seed_2',
        title: 'ગુજરાત કર્મચારી પગાર અને DA ૫૦% વધારો સત્તાવાર ઠરાવ',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        addedToPlanner: false
      }
    ];
  }

  function persistPastedTopics() {
    try {
      localStorage.setItem(PASTED_STORAGE_KEY, JSON.stringify(pastedTopics));
    } catch (_) {}
  }

  function getLocalDateTimeLocalValue(d = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    const Y = d.getFullYear();
    const M = pad(d.getMonth() + 1);
    const D = pad(d.getDate());
    const h = pad(d.getHours());
    const m = pad(d.getMinutes());
    return `${Y}-${M}-${D}T${h}:${m}`;
  }

  function formatTopicDisplayDateTime(isoStr) {
    if (!isoStr) return 'સમય ઉપલબ્ધ નથી';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;

    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' });
    const dayStr = dayFormatter.format(d);
    const dayMap = {
      Sun: 'રવિવાર', Mon: 'સોમવાર', Tue: 'મંગળવાર', Wed: 'બુધવાર',
      Thu: 'ગુરુવાર', Fri: 'શુક્રવાર', Sat: 'શનિવાર'
    };
    const gujaratiDay = dayMap[dayStr] || '';

    const dateFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeFormatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return `📅 ${dateFormatter.format(d)} • 🕒 ${timeFormatter.format(d)}${gujaratiDay ? ' (' + gujaratiDay + ')' : ''}`;
  }

  function parsePastedTopicsText(text) {
    if (!text || typeof text !== 'string') return [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const results = [];
    for (const line of lines) {
      let clean = line
        .replace(/^[\d૦-૯]+[\.\)\-\:\s]+/g, '')
        .replace(/^[\*\-\•]\s*/g, '')
        .replace(/^\[(.*?)\]\s*/g, '')
        .trim();
      if (clean.length >= 3) {
        results.push(clean);
      }
    }
    return results;
  }

  try {
    authRes = await api.getAuthStatus().catch(() => ({ isConnected: false, isDemo: true }));
  } catch (err) {
    console.warn('[Dashboard Load Notice]:', err);
  }

  function buildMasterPrompt(mode = activePromptMode) {
    const channelName = authRes?.channel?.title || 'Gyan Yatra';
    const channelHandle = authRes?.channel?.handle || '@gyan.yatra1';
    const customNotesText = customUserNotes.trim()
      ? `\n\nADDITIONAL CREATOR NOTES:\n${customUserNotes.trim()}`
      : '';

    if (mode === 'viral10') {
      return `MASTER PROMPT: GYAN YATRA – AI VIRAL TOPIC FINDER

ROLE:
You are an Elite YouTube Growth Strategist, YouTube
Analytics Expert and Gujarati Content Research Specialist.

CHANNEL:
Name: ${channelName}
Handle: ${channelHandle}
Niche:
Gujarati Government News, Recruitment, Education,
Government Schemes, Employees, Women, Farmers
and Public Information.

YOUR MISSION:

Find EXACTLY 10 best potential YouTube video topics
for this channel using the attached YouTube Studio
Analytics screenshot of the LAST 48 HOURS (૪૮ કલાક).

Strict requirements:
- Analyze real metrics shown in the screenshot.
- Focus on topics that generated strong real views,
  high CTR and audience demand in the last 48 hours.
- Each topic must be in clean, natural Gujarati.
- High click-through potential, clear, authentic,
  educational, informative and free of clickbait.
- Return EXACTLY 10 topics. No more, no less.
- Output ONLY topic names, numbered 1 to 10.
- No scripts. NO SCRIPTS. કોઈપણ પ્રકારની સ્ક્રિપ્ટ નહીં.
- NO section breakdowns. NO intros.
- NO explanations. NO hashtags. NO descriptions.
- Output ONLY the 10 topic titles.

OUTPUT FORMAT:

1. [Gujarati Video Topic]
2. [Gujarati Video Topic]
3. [Gujarati Video Topic]
4. [Gujarati Video Topic]
5. [Gujarati Video Topic]
6. [Gujarati Video Topic]
7. [Gujarati Video Topic]
8. [Gujarati Video Topic]
9. [Gujarati Video Topic]
10. [Gujarati Video Topic]

CRITICAL DATA RULES:

- Always prioritize REAL channel analytics.
- Never invent views or realtime trends.
- Never fabricate government notifications.
- Verify government information from official sources.
- Never recommend outdated news as breaking news.
- If analytics are unavailable, clearly do not
  pretend that analysis was completed.
- Never use generic viral topics disconnected
  from the Gyan Yatra channel data.${customNotesText}`;
    }

    // Default Mode: 'earning5' (સૌથી વધુ Views વાળા વિડીયો પરથી ૫ શ્રેષ્ઠ કમાણી / High RPM વાળા વિષયો)
    return `MASTER PROMPT: GYAN YATRA – AI VIRAL TOPIC FINDER
(૪૮ કલાક સ્ક્રીનશોટ ➔ સૌથી વધુ Views પરથી ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો / HIGH RPM)

ROLE:
You are an Elite YouTube Growth Strategist, YouTube Monetization & High-RPM Consultant, and Gujarati Content Research Specialist.

CHANNEL:
Name: ${channelName}
Handle: ${channelHandle}
Niche:
Gujarati Government News, Recruitment, Education, Government Schemes, 7th Pay Commission, DA Hikes, Financial Aid, Women, Farmers and Public Information.

YOUR MISSION (૪૮ કલાક સ્ક્રીનશોટ એનાલિસિસ ➔ ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો):

Analyze the attached YouTube Studio Analytics screenshot of the LAST 48 HOURS (૪૮ કલાક) to accomplish two sequential tasks:

પગલું ૧: સૌથી વધુ Views ધરાવતા વિડીયો શોધો (STEP 1: IDENTIFY HIGHEST VIEWS)
- સામે જોડેલા YouTube Studio ના 48-Hour Realtime Analytics screenshot માં જુઓ કે કયા વિડીયોમાં સૌથી વધારે Views (Highest Views / Peak Realtime Traffic) આવ્યા છે.
- તે ટોચના વિડીયોના મુખ્ય મુદ્દા, વિષય અને દર્શકોના રસ (Audience Interest) ને ચોક્કસ રીતે ઓળખો.

પગલું ૨: ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો તૈયાર કરો (STEP 2: GENERATE 5 BEST HIGH-EARNING TOPICS)
- સૌથી વધુ Views મેળવનાર તે વિડીયોના આધારે, ચેનલ માટે સૌથી વધુ આવક / શ્રેષ્ઠ કમાણી (Best Earning / Maximum Revenue / High Ad RPM) કરાવે તેવા બરાબર ૫ નવા વિષયો બનાવો.
- આવા વિષયોમાં જાહેરાતકર્તાઓ (Advertisers) સૌથી ઊંચો RPM અને CPC આપે છે:
  * સરકારી ભરતી, પરિપત્રો, નિયમો, ઓનલાઇન અરજી ફોર્મ અને પગાર ધોરણ
  * ૭મું પગારપંચ, DA વધારો, કર્મચારી લાભ, નિવૃત્તિ પેન્શન અને એરિયર્સ
  * સરકારી સહાય યોજના, સબસિડી, કિસાન સન્માન નિધિ, મહિલા સહાય, આવાસ યોજના
  * સીધા બેંક ખાતામાં જમા થતી સહાય અને નાણાકીય લાભો

STRICT REQUIREMENTS:
- Analyze real metrics shown in the screenshot.
- Focus strictly on the videos with the HIGHEST VIEWS from the 48-Hour screenshot.
- Turn that high viewer demand into EXACTLY 5 topics tailored for BEST EARNING / MAXIMUM REVENUE.
- Each topic must be in clean, authentic, compelling Gujarati.
- High click-through potential, clear, authentic, educational, informative and free of clickbait.
- Return EXACTLY 5 topics (Supported: Return EXACTLY 10 topics format).
- No scripts. NO SCRIPTS. કોઈપણ પ્રકારની સ્ક્રિપ્ટ નહીં.
- NO section breakdowns. NO intros. NO explanations. NO hashtags. NO descriptions.
- Output ONLY topic names, numbered 1 to 5.

OUTPUT FORMAT:

1. [Gujarati Video Topic] (શ્રેષ્ઠ કમાણી • Highest Views ➔ High RPM)
2. [Gujarati Video Topic] (શ્રેષ્ઠ કમાણી • Highest Views ➔ High RPM)
3. [Gujarati Video Topic] (શ્રેષ્ઠ કમાણી • Highest Views ➔ High RPM)
4. [Gujarati Video Topic] (શ્રેષ્ઠ કમાણી • Highest Views ➔ High RPM)
5. [Gujarati Video Topic] (શ્રેષ્ઠ કમાણી • Highest Views ➔ High RPM)

CRITICAL DATA RULES:
- Always prioritize REAL channel analytics from the screenshot.
- Never invent views or realtime trends.
- Focus strictly on topics with proven audience interest from highest views and maximum earning potential.
- Never fabricate government notifications.
- Verify government information from official sources.${customNotesText}`;
  }

  function render() {
    const channel = authRes?.channel || {};
    const masterPromptText = buildMasterPrompt();
    subtopicPromptText = buildSubTopicsSearchPrompt(subtopicMainTopic, subtopicCount);
    const defaultLocalDatetime = getLocalDateTimeLocalValue();
    const activeStoredName = (typeof localStorage !== 'undefined' ? (localStorage.getItem('gyan_active_topic_name') || '') : '').trim();

    container.innerHTML = `
      <div id="gyan-dashboard-container" style="background: #FFFFFF; min-height: 100vh; padding: 24px 20px; font-family: 'Noto Sans Gujarati', 'Outfit', sans-serif; color: #222222;">
        
        <!-- =================================================================== -->
        <!-- HEADER BAR WITH BRANDING & 3 KEY ACTIONS                            -->
        <!-- =================================================================== -->
        <header style="border-bottom: 1.5px solid #E5E7EB; padding-bottom: 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <!-- Channel Identity -->
          <div style="display: flex; align-items: center; gap: 14px;">
            <img src="${channel.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80'}"
                 alt="Logo"
                 style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #102A56; object-fit: cover;" />
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h1 style="font-size: 1.25rem; font-weight: 900; color: #102A56; margin: 0;">
                  ${channel.title || 'Gyan Yatra (જ્ઞાન યાત્રા)'}
                </h1>
                <span style="background: #EFF6FF; color: #1E40AF; border: 1px solid #BFDBFE; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 9999px;">
                  AI Studio
                </span>
              </div>
              <p style="font-size: 0.8rem; color: #64748B; margin: 2px 0 0 0;">
                YouTube Studio 48-Hour Screenshot Analysis & Topic Research
              </p>
            </div>
          </div>

          <!-- The 3 Action Buttons -->
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <a id="btn-dash-open-studio" href="https://studio.youtube.com" target="_blank" rel="noopener noreferrer" style="background: #102A56; color: #FFFFFF; border: none; font-weight: 800; font-size: 0.85rem; padding: 9px 18px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16,42,86,0.18);">
              <span>↗</span> Open YouTube Studio
            </a>

            <a id="btn-dash-open-chatgpt" href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" style="background: #FFFFFF; color: #102A56; border: 1.5px solid #102A56; font-weight: 800; font-size: 0.85rem; padding: 8px 18px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              <span>⚡</span> Open ChatGPT
            </a>

            <button id="btn-dash-copy-master-prompt" type="button" style="background: #D71920; color: #FFFFFF; border: none; font-weight: 800; font-size: 0.85rem; padding: 9px 20px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 10px rgba(215,25,32,0.25);">
              <span>📋</span> One-Click Copy Master Prompt
            </button>
          </div>
        </header>

        <!-- Quick Studio Jump Banner -->
        <div style="background: linear-gradient(135deg, rgba(124,58,237,0.12), rgba(99,102,241,0.12)); border: 2px solid #8b5cf6; border-radius: 12px; padding: 14px 20px; margin-bottom: 22px; max-width: 1050px; margin-left: auto; margin-right: auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 4px 16px rgba(139,92,246,0.15);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 1.8rem;">🎙️</span>
            <div>
              <span style="font-size: 0.74rem; font-weight: 800; color: #a855f7; text-transform: uppercase;">મુખ્ય ટૂલ (MASTER TOOL):</span>
              <h3 style="font-size: 1.1rem; font-weight: 900; color: #7c3aed; margin: 2px 0 0 0;">
                ૫. Slide & Script Voice Studio (સ્લાઇડ્સ + સ્ક્રિપ્ટ ટેલિપ્રોમ્પટર + ઓડિયો)
              </h3>
              ${activeStoredName ? `<div style="font-size: 0.8rem; color: #475569; margin-top: 3px;">🎯 સક્રિય વિષય: <strong>${activeStoredName}</strong></div>` : ''}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <a href="#myvoice" class="btn" style="background: linear-gradient(135deg, #7c3aed, #6366f1); color: white; font-weight: 900; font-size: 0.88rem; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(124,58,237,0.35);">
              <span>🎙️</span> સ્લાઇડ & સ્ક્રિપ્ટ સ્ટુડિયો ખોલો ➔
            </a>
            <a href="#slideprompts" class="btn" style="background: #2563EB; color: white; font-weight: 800; font-size: 0.82rem; padding: 8px 16px; border-radius: 6px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              <span>📊</span> Slide Prompts →
            </a>
          </div>
        </div>

        <!-- =================================================================== -->
        <!-- PERMANENT AI TOPIC RESEARCH MASTER PROMPT WORKSPACE                 -->
        <!-- =================================================================== -->
        <main>
          <section class="dash-card" style="border: 2px solid #102A56; border-radius: 14px; background: #FFFFFF; padding: 26px 28px; box-shadow: 0 4px 18px rgba(16,42,86,0.06); max-width: 1050px; margin: 0 auto;">
            
            <!-- Card Header -->
            <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 18px; border-bottom: 1.5px solid #F1F5F9; padding-bottom: 16px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span style="background: #102A56; color: #FFFFFF; font-size: 0.72rem; font-weight: 900; padding: 3px 8px; border-radius: 4px;">
                    કાયમી માસ્ટર પ્રોમ્પ્ટ
                  </span>
                  <span id="badge-master-prompt-mode" style="background: #FEF2F2; color: #DC2626; font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 4px; border: 1px solid #FECACA;">
                    💰 સૌથી વધુ Views ➔ ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો (High RPM) • No Scripts
                  </span>
                </div>
                <h2 style="font-size: 1.3rem; font-weight: 900; color: #102A56; margin: 0; line-height: 1.3;">
                  YouTube Studio 48-Hour Screenshot Analysis – AI Topic Research Master Prompt
                </h2>
                <p style="font-size: 0.85rem; color: #64748B; margin: 6px 0 0 0; line-height: 1.5;">
                  આ પ્રોમ્પ્ટ કોપી કરીને ChatGPT માં પેસ્ટ કરો અને તમારા YouTube Studio ના છેલ્લા ૪૮ કલાકના એનાલિટિક્સનો સ્ક્રીનશોટ જોડો. AI સ્ક્રીનશોટમાંથી <strong>સૌથી વધારે views</strong> આવ્યા હોય તે વિડીયો શોધીને તેના આધારે <strong>૫ શ્રેષ્ઠ કમાણી (Best High-Earning / High RPM)</strong> વાળા ગુજરાતી વિડીયો વિષયો આપશે.
                </p>
              </div>

              <!-- Top Copy Shortcut -->
              <button id="btn-dash-copy-master-prompt-shortcut" type="button" style="background: #102A56; color: #FFFFFF; border: none; font-weight: 800; font-size: 0.84rem; padding: 9px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16,42,86,0.18);">
                <span>📋</span> Copy Master Prompt
              </button>
            </div>

            <!-- Optional Custom Notes -->
            <div style="margin-bottom: 14px;">
              <label for="dash-custom-prompt-notes" style="font-size: 0.82rem; font-weight: 800; color: #102A56; display: block; margin-bottom: 6px;">
                વધારાની નોંધ અથવા ધ્યાન આપવા જેવી બાબતો (Optional Notes to Inject into Master Prompt):
              </label>
              <input type="text" id="dash-custom-prompt-notes" value="${customUserNotes}" placeholder="દા.ત. આવતીકાલે નાણા વિભાગના DA પરિપત્ર અને નવી ભરતી પર વિશેષ ભાર મૂકવો..." style="width: 100%; padding: 10px 14px; border: 1.5px solid #CBD5E1; border-radius: 8px; font-size: 0.85rem; font-family: inherit; outline: none; background: #FAFAFA; transition: border-color 0.2s;" onfocus="this.style.borderColor='#102A56'; this.style.background='#FFFFFF';" onblur="this.style.borderColor='#CBD5E1'; this.style.background='#FAFAFA';" />
            </div>

            <!-- Prompt Mode Selector -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 0.82rem; font-weight: 800; color: #102A56;">પ્રોમ્પ્ટ મોડ (Prompt Mode):</span>
                <button id="btn-mode-earning5" type="button" style="background: #102A56; color: #FFFFFF; font-size: 0.82rem; font-weight: 800; padding: 7px 15px; border-radius: 6px; border: 1.5px solid #102A56; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(16,42,86,0.15);">
                  <span>💰</span> સૌથી વધુ Views ➔ ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો (Default)
                </button>
                <button id="btn-mode-viral10" type="button" style="background: #FFFFFF; color: #64748B; font-size: 0.82rem; font-weight: 700; padding: 7px 15px; border-radius: 6px; border: 1.5px solid #CBD5E1; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                  <span>⚡</span> ૧૦ વાયરલ વિષયો (10 Viral Topics)
                </button>
              </div>
              <div id="mode-explanation-badge" style="font-size: 0.78rem; color: #047857; font-weight: 700; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 4px 10px; border-radius: 6px;">
                ✓ ૪૮ કલાકના સ્ક્રીનશોટમાં જે વિડીયોમાં સૌથી વધુ views આવ્યા છે તેના પરથી ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો તૈયાર કરશે
              </div>
            </div>

            <!-- Master Prompt Textarea -->
            <div style="position: relative; margin-bottom: 24px;">
              <textarea id="dash-master-prompt-textarea" readonly rows="14" style="width: 100%; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 16px 18px; font-family: 'Noto Sans Gujarati', monospace; font-size: 0.86rem; line-height: 1.65; color: #1E293B; resize: vertical; box-sizing: border-box; outline: none;">${masterPromptText}</textarea>
            </div>

            <!-- =================================================================== -->
            <!-- NEXT STEP CALLOUT: TOOL 2 - PASTE TOPICS                            -->
            <!-- =================================================================== -->
            <div style="background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); border: 2px solid #86EFAC; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; box-shadow: 0 4px 14px rgba(16,185,129,0.08);">
              <div style="display: flex; align-items: center; gap: 14px;">
                <div style="background: #FFFFFF; border: 1.5px solid #86EFAC; border-radius: 12px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                  📝
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: #10B981; color: white; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">
                      Tool 2
                    </span>
                    <h3 style="font-size: 1.15rem; font-weight: 900; color: #166534; margin: 0;">
                      આગળનું પગલું: ૨. Paste Topics (મારા વિષયો પેસ્ટ કરો)
                    </h3>
                  </div>
                  <p style="font-size: 0.84rem; color: #15803D; margin: 4px 0 0 0; font-weight: 600;">
                    ChatGPT માંથી તૈયાર થયેલા વિષયો પેસ્ટ કરવા અને તારીખ/સમય સાથે સાચવવા માટે Tool 2 વાપરો
                  </p>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <a href="#pastetopics" class="btn" style="background: #10B981; color: #FFFFFF; font-size: 0.92rem; font-weight: 900; padding: 11px 22px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
                  <span>📝</span> ૨. Paste Topics ખોલો →
                </a>
              </div>
            </div>

            <!-- Direct 10 Topics Output Box (When Generated Directly by AI) -->
            <div id="dash-direct-topics-panel" style="display: none; margin-bottom: 20px; background: #FFFFFF; border: 2px solid #102A56; border-radius: 10px; padding: 18px 20px;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; border-bottom: 1px solid #E5E7EB; padding-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="background: #102A56; color: white; font-size: 0.75rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">AI VIRAL TOPICS</span>
                  <h4 style="margin: 0; font-size: 1rem; font-weight: 800; color: #102A56;">છેલ્લા ૪૮ કલાકના ડેટા આધારિત ૧૦ શ્રેષ્ઠ વિષયો</h4>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <button id="btn-transfer-dash-to-idea" type="button" style="background: linear-gradient(135deg, #10B981, #059669); color: white; border: none; font-size: 0.8rem; font-weight: 800; padding: 6px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(16,185,129,0.25);" title="બધા વિષયો સીધા 'Idea' ટૂલમાં મોકલો">
                    <span>💡</span> Idea માં મોકલો →
                  </button>
                  <button id="btn-transfer-dash-to-planner" type="button" style="background: #102A56; color: white; border: none; font-size: 0.8rem; font-weight: 800; padding: 6px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                    📋 Production Planner માં મોકલો →
                  </button>
                  <button id="btn-copy-direct-10-topics" type="button" style="background: #D71920; color: white; border: none; font-size: 0.8rem; font-weight: 800; padding: 6px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                    📋 બધા કોપી કરો
                  </button>
                </div>
              </div>
              <ol id="dash-direct-topics-list" style="margin: 0; padding-left: 20px; line-height: 1.8; font-size: 0.92rem; font-weight: 700; color: #1F2937;"></ol>
            </div>

            <!-- Bottom Action Footer -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 18px;">
              <div style="font-size: 0.8rem; color: #64748B;">
                💡 <strong>ઉપયોગ કરવાના ૨ સરળ રસ્તા:</strong><br>
                ૧. <strong>ChatGPT:</strong> 'Copy Master Prompt' કરીને ChatGPT માં પેસ્ટ કરો + ૪૮h સ્ક્રીનશોટ જોડો.<br>
                ૨. <strong>Direct AI:</strong> નીચેનું બટન દબાવીને સીધા વિષયો મેળવો.
              </div>

              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <button id="btn-dash-run-direct-ai" type="button" style="background: #102A56; color: #FFFFFF; border: none; font-weight: 800; font-size: 0.85rem; padding: 9px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16,42,86,0.18);">
                  <span id="btn-dash-run-direct-ai-label">💰 સીધા ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો શોધો</span>
                </button>
                <button id="btn-dash-copy-master-prompt-bottom" type="button" style="background: #D71920; color: #FFFFFF; border: none; font-weight: 800; font-size: 0.85rem; padding: 9px 20px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(215,25,32,0.25);">
                  <span>📋</span> Copy Master Prompt
                </button>
                <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" style="background: #FFFFFF; color: #102A56; border: 1.5px solid #102A56; font-weight: 800; font-size: 0.85rem; padding: 8px 18px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                  <span>↗</span> Open ChatGPT
                </a>
              </div>
            </div>

          </section>

        <!-- =================================================================== -->
        <!-- TOPIC-BASED 4-5 SUB-TOPICS SEARCH TOOL (BELOW 48H SECTION)          -->
        <!-- =================================================================== -->
        <section class="dash-card" id="section-topic-subtopics-search" style="margin-top: 26px; border: 2px solid #0284C7; border-radius: 14px; background: #FFFFFF; padding: 26px 28px; box-shadow: 0 4px 18px rgba(2,132,199,0.08); max-width: 1050px; margin-left: auto; margin-right: auto;">
          
          <!-- Card Header -->
          <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 18px; border-bottom: 1.5px solid #F1F5F9; padding-bottom: 16px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="background: #0284C7; color: #FFFFFF; font-size: 0.72rem; font-weight: 900; padding: 3px 8px; border-radius: 4px;">
                  🎯 વિષય આધારિત સબ-ટોપિક રિસર્ચ
                </span>
                <span style="background: #F0F9FF; color: #0369A1; font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 4px; border: 1px solid #BAE6FD;">
                  ⚡ ૪ કે ૫ શ્રેષ્ઠ વિષયો (No Scripts)
                </span>
              </div>
              <h2 style="font-size: 1.3rem; font-weight: 900; color: #0F172A; margin: 0; line-height: 1.3;">
                વિષય પરથી ૪ કે ૫ શ્રેષ્ઠ વિષયો સર્ચ ટૂલ (ChatGPT Topic Explorer)
              </h2>
              <p style="font-size: 0.85rem; color: #64748B; margin: 6px 0 0 0; line-height: 1.5;">
                તમે જે પણ વિષય લખશો (દા.ત. <strong>આંગણવાડી પગાર વધારો</strong>, <strong>GSRTC ભરતી</strong>, <strong>કિસાન સહાય</strong>), ChatGPT તે જ વિષય પરથી લાઈવ સર્ચ કરી એ જ વિષયના <strong>૪ થી ૫ સૌથી વધુ ડિમાન્ડ વાળા પેટા-વિષયો (Sub-Topics)</strong> શોધી આપશે.
              </p>
            </div>

            <!-- Top Copy Shortcut -->
            <button id="btn-copy-subtopic-prompt-top" type="button" style="background: #0284C7; color: #FFFFFF; border: none; font-weight: 800; font-size: 0.84rem; padding: 9px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(2,132,199,0.25);">
              <span>📋</span> Copy Search Prompt
            </button>
          </div>

          <!-- Input Row: Main Topic & Count Selector -->
          <div style="display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; margin-bottom: 16px; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 14px 18px;">
            <div style="flex: 1; min-width: 280px;">
              <label for="input-subtopic-main-topic" style="font-size: 0.82rem; font-weight: 800; color: #0F172A; display: block; margin-bottom: 6px;">
                ✍️ તમારો મુખ્ય વિષય લખો (Enter Main Topic):
              </label>
              <input type="text" id="input-subtopic-main-topic" value="${subtopicMainTopic}" placeholder="દા.ત. આંગણવાડી પગાર વધારો હાઈકોર્ટ ચુકાદો..." style="width: 100%; padding: 10px 14px; border: 1.5px solid #CBD5E1; border-radius: 8px; font-size: 0.92rem; font-weight: 700; font-family: inherit; outline: none; background: #FFFFFF; box-sizing: border-box;" />
            </div>

            <div style="min-width: 160px;">
              <label for="select-subtopic-count" style="font-size: 0.82rem; font-weight: 800; color: #0F172A; display: block; margin-bottom: 6px;">
                📊 કેટલા વિષયો જોઈએ?:
              </label>
              <select id="select-subtopic-count" style="width: 100%; padding: 10px 12px; border: 1.5px solid #CBD5E1; border-radius: 8px; font-size: 0.85rem; font-weight: 800; font-family: inherit; background: #FFFFFF; outline: none; cursor: pointer;">
                <option value="4" ${subtopicCount === 4 ? 'selected' : ''}>૪ વિષયો (4 Topics)</option>
                <option value="5" ${subtopicCount === 5 ? 'selected' : ''}>૫ વિષયો (5 Topics - ભલામણ)</option>
              </select>
            </div>

            <button id="btn-run-subtopic-search" type="button" style="background: linear-gradient(135deg, #0284C7, #0369A1); color: #FFFFFF; border: none; font-weight: 900; font-size: 0.88rem; padding: 11px 22px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(2,132,199,0.35);">
              <span id="label-subtopic-search-btn">🔍 સીધા ૪-૫ વિષયો શોધો</span>
            </button>
          </div>

          <!-- Prompt Box for ChatGPT -->
          <div style="margin-bottom: 18px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
              <span style="font-size: 0.82rem; font-weight: 800; color: #0F172A;">
                ⚡ ChatGPT Live Web Search Master Prompt (સ્ક્રિપ્ટ વગર ફક્ત ૪-૫ વિષયો):
              </span>
              <span style="font-size: 0.74rem; color: #10B981; font-weight: 700;">
                ✓ વિષય બદલાતા જ પ્રોમ્પ્ટ આપમેળે અપડેટ થાય છે
              </span>
            </div>
            <textarea id="textarea-subtopic-search-prompt" readonly rows="8" style="width: 100%; background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; font-family: 'Noto Sans Gujarati', monospace; font-size: 0.86rem; line-height: 1.6; color: #1E293B; resize: vertical; box-sizing: border-box; outline: none;">${subtopicPromptText || buildSubTopicsSearchPrompt(subtopicMainTopic, subtopicCount)}</textarea>
          </div>

          <!-- Prompt Actions Bar -->
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 16px;">
            <div style="font-size: 0.8rem; color: #64748B;">
              💡 <strong>૧-ક્લિક રીત:</strong> 'Copy Prompt' કરીને ChatGPT માં પેસ્ટ કરો ➔ અથવા 'સીધા ૪-૫ વિષયો શોધો' દબાવો.
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <button id="btn-copy-subtopic-prompt" type="button" style="background: #10B981; color: #FFFFFF; border: none; font-weight: 800; font-size: 0.85rem; padding: 9px 20px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">
                <span id="copy-subtopic-icon">📋</span>
                <span id="copy-subtopic-text">પ્રોમ્પ્ટ કોપી કરો (Copy Prompt)</span>
              </button>
              <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" id="btn-open-chatgpt-subtopic" style="background: #FFFFFF; color: #0284C7; border: 1.5px solid #0284C7; font-weight: 800; font-size: 0.85rem; padding: 8px 18px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                <span>⚡</span> Open ChatGPT ↗
              </a>
            </div>
          </div>

          <!-- Results Section: 4-5 Generated Subtopics -->
          <div id="subtopic-results-container" style="background: #FFFFFF; border: 2px solid #0284C7; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; border-bottom: 1.5px solid #E2E8F0; padding-bottom: 10px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="background: #0284C7; color: #FFFFFF; font-size: 0.74rem; font-weight: 900; padding: 3px 8px; border-radius: 4px;">
                  મળેલા પેટા-વિષયો
                </span>
                <h3 style="margin: 0; font-size: 1.05rem; font-weight: 900; color: #0F172A;">
                  "${subtopicMainTopic}" ના આધારે ૪ થી ૫ શ્રેષ્ઠ વિષયો
                </h3>
              </div>
              <span style="font-size: 0.76rem; color: #64748B; font-weight: 700;">
                કોઈપણ વિષય પસંદ કરીને સીધું સ્લાઇડ ટૂલ શરૂ કરો
              </span>
            </div>

            <!-- List of Subtopics Cards -->
            <div id="subtopic-results-list" style="display: flex; flex-direction: column; gap: 10px;">
              ${subtopicResults.map((subT, idx) => `
                <div class="subtopic-item-card" style="background: #F8FAFC; border: 1.5px solid #E2E8F0; border-left: 5px solid #0284C7; border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; transition: all 0.2s;">
                  <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 260px;">
                    <span style="background: #0284C7; color: #FFFFFF; font-weight: 900; font-size: 0.85rem; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      ${idx + 1}
                    </span>
                    <div>
                      <div style="font-weight: 800; font-size: 0.98rem; color: #0F172A; line-height: 1.4;">
                        ${subT}
                      </div>
                      <div style="font-size: 0.74rem; color: #64748B; margin-top: 2px;">
                        વિષય #${idx + 1} • ઉચ્ચ દર્શક રસ (High Engagement)
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <button type="button" class="btn-copy-single-subtopic" data-topic="${subT.replace(/"/g, '&quot;')}" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #475569; font-weight: 700; font-size: 0.78rem; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                      📋 કોપી
                    </button>
                    <button type="button" class="btn-select-subtopic-project" data-topic="${subT.replace(/"/g, '&quot;')}" style="background: linear-gradient(135deg, #10B981, #059669); color: #FFFFFF; border: none; font-weight: 900; font-size: 0.82rem; padding: 7px 16px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(16,185,129,0.3);">
                      <span>🎯</span> આ વિષય પસંદ કરો →
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Optional Paste Area for ChatGPT Answer -->
            <details style="margin-top: 16px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 8px; padding: 10px 14px;">
              <summary style="font-size: 0.8rem; font-weight: 800; color: #475569; cursor: pointer;">
                📥 ChatGPT માંથી આવેલું લખાણ અહીં પેસ્ટ કરી વિષયો બદલો ▼
              </summary>
              <div style="margin-top: 10px;">
                <textarea id="textarea-paste-subtopics" rows="3" placeholder="ChatGPT એ આપેલા ૪ કે ૫ વિષયો અહીં પેસ્ટ કરો..." style="width: 100%; box-sizing: border-box; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px 12px; font-size: 0.85rem; font-family: inherit; line-height: 1.5; resize: vertical;"></textarea>
                <div style="margin-top: 8px; display: flex; justify-content: flex-end;">
                  <button type="button" id="btn-parse-pasted-subtopics" style="background: #0284C7; color: #FFFFFF; border: none; font-weight: 800; font-size: 0.8rem; padding: 6px 16px; border-radius: 6px; cursor: pointer;">
                    📥 વિષયો લોડ કરો
                  </button>
                </div>
              </div>
            </details>

          </div>

        </section>
        </main>

      </div>
    `;

    attachEventHandlers();
  }

  function attachEventHandlers() {
    // Prompt Mode Selector
    const btnModeEarning5 = container.querySelector('#btn-mode-earning5');
    const btnModeViral10 = container.querySelector('#btn-mode-viral10');
    const modeBadge = container.querySelector('#mode-explanation-badge');
    const badgePromptHeader = container.querySelector('#badge-master-prompt-mode');
    const directAiBtnLabel = container.querySelector('#btn-dash-run-direct-ai-label');
    const promptTa = container.querySelector('#dash-master-prompt-textarea');

    function setPromptMode(mode) {
      activePromptMode = mode;
      if (promptTa) promptTa.value = buildMasterPrompt(mode);

      if (mode === 'earning5') {
        if (btnModeEarning5) {
          btnModeEarning5.style.background = '#102A56';
          btnModeEarning5.style.color = '#FFFFFF';
          btnModeEarning5.style.borderColor = '#102A56';
          btnModeEarning5.style.fontWeight = '800';
          btnModeEarning5.style.boxShadow = '0 2px 6px rgba(16,42,86,0.15)';
        }
        if (btnModeViral10) {
          btnModeViral10.style.background = '#FFFFFF';
          btnModeViral10.style.color = '#64748B';
          btnModeViral10.style.borderColor = '#CBD5E1';
          btnModeViral10.style.fontWeight = '700';
          btnModeViral10.style.boxShadow = 'none';
        }
        if (modeBadge) {
          modeBadge.style.color = '#047857';
          modeBadge.style.background = '#ECFDF5';
          modeBadge.style.borderColor = '#A7F3D0';
          modeBadge.innerText = '✓ ૪૮ કલાકના સ્ક્રીનશોટમાં જે વિડીયોમાં સૌથી વધુ views આવ્યા છે તેના પરથી ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો તૈયાર કરશે';
        }
        if (badgePromptHeader) {
          badgePromptHeader.innerText = '💰 સૌથી વધુ Views ➔ ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો (High RPM) • No Scripts';
        }
        if (directAiBtnLabel) {
          directAiBtnLabel.innerText = '💰 સીધા ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો શોધો';
        }
      } else {
        if (btnModeEarning5) {
          btnModeEarning5.style.background = '#FFFFFF';
          btnModeEarning5.style.color = '#64748B';
          btnModeEarning5.style.borderColor = '#CBD5E1';
          btnModeEarning5.style.fontWeight = '700';
          btnModeEarning5.style.boxShadow = 'none';
        }
        if (btnModeViral10) {
          btnModeViral10.style.background = '#102A56';
          btnModeViral10.style.color = '#FFFFFF';
          btnModeViral10.style.borderColor = '#102A56';
          btnModeViral10.style.fontWeight = '800';
          btnModeViral10.style.boxShadow = '0 2px 6px rgba(16,42,86,0.15)';
        }
        if (modeBadge) {
          modeBadge.style.color = '#1E40AF';
          modeBadge.style.background = '#EFF6FF';
          modeBadge.style.borderColor = '#BFDBFE';
          modeBadge.innerText = '✓ ૪૮ કલાકના સ્ક્રીનશોટ એનાલિસિસ આધારિત ૧૦ વાયરલ ગુજરાતી વિષયો આપશે';
        }
        if (badgePromptHeader) {
          badgePromptHeader.innerText = 'Exactly 10 Topics • No Scripts';
        }
        if (directAiBtnLabel) {
          directAiBtnLabel.innerText = '⚡ સીધા ૧૦ વિષયો શોધો (48h Live AI)';
        }
      }
    }

    btnModeEarning5?.addEventListener('click', () => setPromptMode('earning5'));
    btnModeViral10?.addEventListener('click', () => setPromptMode('viral10'));

    // Custom Notes input
    const notesInput = container.querySelector('#dash-custom-prompt-notes');
    if (notesInput) {
      notesInput.addEventListener('input', (e) => {
        customUserNotes = e.target.value;
        const ta = container.querySelector('#dash-master-prompt-textarea');
        if (ta) ta.value = buildMasterPrompt(activePromptMode);
      });
    }

    // Copy Master Prompt Handler
    const handleCopy = async () => {
      const promptText = buildMasterPrompt(activePromptMode);
      const ok = await copyToClipboard(promptText);
      if (ok) {
        const modeLabel = activePromptMode === 'earning5' ? '૫ શ્રેષ્ઠ કમાણી વાળા વિષયો' : '૧૦ વાયરલ વિષયો';
        showNoticeToast(`📋 ${modeLabel} માટેનો માસ્ટર પ્રોમ્પ્ટ સફળતાપૂર્વક કોપી થઈ ગયો! હવે ChatGPT માં પેસ્ટ કરો.`, 'success');
      } else {
        alert('ક્લિપબોર્ડ પરવાનગી ન મળી. કૃપા કરીને ટેક્સ્ટબોક્સમાંથી મેન્યુઅલી કોપી કરો.');
      }
    };

    container.querySelector('#btn-dash-copy-master-prompt')?.addEventListener('click', handleCopy);
    container.querySelector('#btn-dash-copy-master-prompt-shortcut')?.addEventListener('click', handleCopy);
    container.querySelector('#btn-dash-copy-master-prompt-bottom')?.addEventListener('click', handleCopy);

    let lastGeneratedTopics = [];
    let addedToPlannerTitles = new Set();
    const directBtn = container.querySelector('#btn-dash-run-direct-ai');
    const topicsPanel = container.querySelector('#dash-direct-topics-panel');
    const topicsList = container.querySelector('#dash-direct-topics-list');
    const copyTopicsBtn = container.querySelector('#btn-copy-direct-10-topics');

    // Render AI Generated Topics List (preserving backward compatibility)
    function renderGeneratedTopicsList() {
      if (!topicsList) return;
      topicsList.innerHTML = lastGeneratedTopics.map((t, idx) => {
        const cleanName = t.replace(/^\d+[\.\-\)]\s*/, '').trim();
        const isAdded = addedToPlannerTitles.has(t.trim().toLowerCase()) || addedToPlannerTitles.has(cleanName.toLowerCase());
        return `
          <li style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <span style="flex: 1; min-width: 280px;">${t}</span>
            <div>
              ${isAdded ? `
                <span class="badge" style="background: #10B981; color: white; font-size: 0.72rem; font-weight: 800; padding: 3px 8px; border-radius: 4px;">
                  ✓ Added to Planner
                </span>
              ` : `
                <button type="button" class="btn btn-outline btn-xs btn-dash-add-single" data-idx="${idx}" style="font-size: 0.72rem; padding: 3px 8px; border-color: #102A56; color: #102A56; font-weight: 800; cursor: pointer;">
                  ➕ Add to Planner
                </button>
              `}
            </div>
          </li>
        `;
      }).join('');

      topicsList.querySelectorAll('.btn-dash-add-single').forEach(b => {
        b.addEventListener('click', async (e) => {
          const i = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
          const topicText = lastGeneratedTopics[i];
          if (!topicText) return;
          try {
            b.disabled = true;
            b.innerText = 'ઉમેરાય છે...';
            const clean = topicText.replace(/^\d+[\.\-\)]\s*/, '').trim();
            await api.addCentralTopic({
              topicName: clean,
              sourcePeriod: 'Last 48 Hours',
              priority: 'HIGH'
            });
            if (projectState && typeof projectState.activateTopicContext === 'function') {
              await projectState.activateTopicContext(clean);
            }
            localStorage.setItem('gyan_active_topic_name', clean);
            window.prefillTopic = clean;
            addedToPlannerTitles.add(topicText.trim().toLowerCase());
            addedToPlannerTitles.add(clean.toLowerCase());
            showNoticeToast(`✓ વિષય "${clean.slice(0, 30)}..." Planner માં ઉમેરાયો!`, 'success');
            renderGeneratedTopicsList();
          } catch (err) {
            alert('પ્લાનરમાં ઉમેરવામાં ભૂલ: ' + err.message);
            b.disabled = false;
          }
        });
      });
    }

    // Direct AI Topics Execution
    if (directBtn) {
      directBtn.addEventListener('click', async () => {
        try {
          directBtn.disabled = true;
          directBtn.innerHTML = '<span>⏳</span> વિશ્લેષણ ચાલુ છે...';

          const res = await api.getViralTopics({
            customNotes: customUserNotes,
            mode: activePromptMode,
            count: activePromptMode === 'earning5' ? 5 : 10
          });
          if (res && Array.isArray(res.topics) && res.topics.length > 0) {
            lastGeneratedTopics = res.topics;

            // Also automatically add them into pastedTopics storage and sync to Idea!
            const nowIso = new Date().toISOString();
            const activeProj = (projectState && typeof projectState.getActiveProject === 'function') ? projectState.getActiveProject() : null;
            let currentPasted = [];
            try {
              const raw = localStorage.getItem('gyan_48h_pasted_topics');
              if (raw) currentPasted = JSON.parse(raw);
            } catch (_) {}

            res.topics.forEach(t => {
              const clean = t.replace(/^\d+[\.\-\)]\s*/, '').trim();
              const newAiTopic = {
                id: 'topic_ai_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                title: clean,
                timestamp: nowIso,
                addedToPlanner: false
              };
              currentPasted.unshift(newAiTopic);

              if (activeProj && typeof projectState.saveProjectIdea === 'function') {
                try {
                  projectState.saveProjectIdea({
                    id: newAiTopic.id,
                    title: clean,
                    category: 'સરકારી યોજના',
                    inputType: 'paste',
                    source: '48h YouTube Studio',
                    createdAt: nowIso,
                    updatedAt: nowIso
                  }, activeProj.id);
                } catch (_) {}
              }
            });

            try {
              localStorage.setItem('gyan_48h_pasted_topics', JSON.stringify(currentPasted));
            } catch (_) {}

            renderGeneratedTopicsList();
            if (topicsPanel) {
              topicsPanel.style.display = 'block';
              topicsPanel.scrollIntoView({ behavior: 'smooth' });
            }
            const countMsg = lastGeneratedTopics.length;
            showNoticeToast(`✨ છેલ્લા ૪૮ કલાકના ડેટા પરથી ${countMsg} શ્રેષ્ઠ ગુજરાતી વિષયો તૈયાર છે અને Tool 2 માં પણ સેવ થયા!`, 'success');
          } else {
            throw new Error('વિષયો મળી શક્યા નથી.');
          }
        } catch (err) {
          console.error('[Direct Topics AI Error]:', err);
          showNoticeToast('વિષયો શોધવામાં સમસ્યા આવી: ' + err.message, 'error');
        } finally {
          directBtn.disabled = false;
          directBtn.innerHTML = activePromptMode === 'earning5'
            ? '<span id="btn-dash-run-direct-ai-label">💰 સીધા ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો શોધો</span>'
            : '<span id="btn-dash-run-direct-ai-label">⚡ સીધા ૧૦ વિષયો શોધો (48h Live AI)</span>';
        }
      });
    }

    // Batch Transfer directly to Tool 1 (Idea)
    const transferIdeaBtn = container.querySelector('#btn-transfer-dash-to-idea');
    if (transferIdeaBtn) {
      transferIdeaBtn.addEventListener('click', async () => {
        if (!lastGeneratedTopics.length) {
          showNoticeToast('⚠️ પહેલાં "⚡ સીધા ૧૦ વિષયો શોધો" બટન દબાવો.', 'warning');
          return;
        }

        try {
          transferIdeaBtn.disabled = true;
          transferIdeaBtn.innerHTML = '<span>⏳</span> Idea માં મોકલી રહ્યું છે...';

          let activeProj = projectState.getActiveProject();
          if (!activeProj && Array.isArray(projectState.projects) && projectState.projects.length > 0) {
            activeProj = projectState.projects[0];
          }

          for (let i = 0; i < lastGeneratedTopics.length; i++) {
            const rawTitle = lastGeneratedTopics[i];
            const clean = rawTitle.replace(/^\d+[\.\-\)]\s*/, '').trim();
            if (!clean) continue;
            const newIdeaRecord = {
              id: 'idea_ai_' + Date.now() + '_' + i,
              title: clean,
              category: 'સરકારી યોજના',
              inputType: 'ai',
              source: '48h YouTube Studio',
              description: `૪૮ કલાક સ્ટુડિયો પરથી AI શોધેલો વિષય: ${clean}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            if (activeProj && typeof projectState.saveProjectIdea === 'function') {
              await projectState.saveProjectIdea(newIdeaRecord, activeProj.id);
            }
          }

          if (lastGeneratedTopics[0] && typeof projectState.activateTopicContext === 'function') {
            await projectState.activateTopicContext(lastGeneratedTopics[0].replace(/^\d+[\.\-\)]\s*/, '').trim());
          }

          showNoticeToast(`🎉 ${lastGeneratedTopics.length} વિષયો સફળતાપૂર્વક 'Idea' ટૂલમાં મોકલાઈ ગયા!`, 'success');

          if (typeof navigateTo === 'function') {
            navigateTo('topics');
          } else {
            window.location.hash = '#topics';
          }
        } catch (err) {
          console.error('[Transfer to Idea Error]:', err);
          alert('Idea માં મોકલવામાં ભૂલ: ' + err.message);
        } finally {
          transferIdeaBtn.disabled = false;
          transferIdeaBtn.innerHTML = '<span>💡</span> Idea માં મોકલો →';
        }
      });
    }

    // Batch Transfer to Planner
    const transferPlannerBtn = container.querySelector('#btn-transfer-dash-to-planner');
    if (transferPlannerBtn) {
      transferPlannerBtn.addEventListener('click', async () => {
        if (!lastGeneratedTopics.length) {
          showNoticeToast('⚠️ પહેલાં "⚡ સીધા ૧૦ વિષયો શોધો" બટન દબાવો.', 'warning');
          return;
        }

        try {
          transferPlannerBtn.disabled = true;
          transferPlannerBtn.innerHTML = '<span>⏳</span> મોકલી રહ્યું છે...';
          const topicsToSend = lastGeneratedTopics.map(t => t.replace(/^\d+[\.\-\)]\s*/, '').trim());
          await api.batchAddCentralTopics(topicsToSend);
          topicsToSend.forEach(t => addedToPlannerTitles.add(t.toLowerCase()));
          renderGeneratedTopicsList();
          showNoticeToast(`🎉 ${topicsToSend.length} વિષયો સફળતાપૂર્વક Production Planner માં મોકલાઈ ગયા!`, 'success');
          if (typeof navigateTo === 'function') {
            navigateTo('planner');
          } else {
            window.location.hash = '#planner';
          }
        } catch (err) {
          alert('પ્લાનરમાં મોકલવામાં ભૂલ: ' + err.message);
        } finally {
          transferPlannerBtn.disabled = false;
          transferPlannerBtn.innerHTML = '📋 Production Planner માં મોકલો →';
        }
      });
    }

    // Copy All Topics
    if (copyTopicsBtn) {
      copyTopicsBtn.addEventListener('click', async () => {
        if (!lastGeneratedTopics.length) {
          showNoticeToast('⚠️ કોપી કરવા માટે કોઈ વિષય નથી.', 'warning');
          return;
        }
        const topicsToCopy = lastGeneratedTopics.map((t, i) => `${i + 1}. ${t}`);
        const formatted = topicsToCopy.join('\n');
        const ok = await copyToClipboard(formatted);
        if (ok) {
          showNoticeToast(`📋 ${topicsToCopy.length} વિષયો સફળતાપૂર્વક કોપી થઈ ગયા!`, 'success');
        }
      });
    }

    // Open ChatGPT Helper
    container.querySelectorAll('a[href="https://chatgpt.com"]').forEach(link => {
      link.addEventListener('click', async () => {
        const promptText = buildMasterPrompt(activePromptMode);
        await copyToClipboard(promptText).catch(() => {});
        showNoticeToast('પ્રોમ્પ્ટ કોપી થઈ ગયો છે, ChatGPT માં પેસ્ટ કરો!', 'info');
      });
    });

    // Sub-topic Search Tool Handlers
    const inputSubtopicTopic = container.querySelector('#input-subtopic-main-topic');
    const selectSubtopicCount = container.querySelector('#select-subtopic-count');
    const textareaSubtopicPrompt = container.querySelector('#textarea-subtopic-search-prompt');
    const btnRunSubtopicSearch = container.querySelector('#btn-run-subtopic-search');
    const subtopicResultsList = container.querySelector('#subtopic-results-list');

    function updateSubtopicPromptLive() {
      if (inputSubtopicTopic) subtopicMainTopic = inputSubtopicTopic.value.trim() || 'આંગણવાડી પગાર વધારો હાઈકોર્ટ ચુકાદો';
      if (selectSubtopicCount) subtopicCount = Number(selectSubtopicCount.value) || 5;
      if (textareaSubtopicPrompt) {
        textareaSubtopicPrompt.value = buildSubTopicsSearchPrompt(subtopicMainTopic, subtopicCount);
      }
    }

    inputSubtopicTopic?.addEventListener('input', updateSubtopicPromptLive);
    selectSubtopicCount?.addEventListener('change', updateSubtopicPromptLive);

    const handleCopySubtopicPrompt = async () => {
      updateSubtopicPromptLive();
      const txt = textareaSubtopicPrompt ? textareaSubtopicPrompt.value : buildSubTopicsSearchPrompt(subtopicMainTopic, subtopicCount);
      const ok = await copyToClipboard(txt);
      if (ok) {
        const copyTxtEl = container.querySelector('#copy-subtopic-text');
        if (copyTxtEl) {
          copyTxtEl.textContent = '✓ પ્રોમ્પ્ટ કોપી થઈ ગયો!';
          setTimeout(() => { if (copyTxtEl) copyTxtEl.textContent = 'પ્રોમ્પ્ટ કોપી કરો (Copy Prompt)'; }, 2500);
        }
        showNoticeToast('⚡ વિષય સંશોધન પ્રોમ્પ્ટ સફળતાપૂર્વક કોપી થઈ ગયો!', 'success');
      }
    };

    container.querySelector('#btn-copy-subtopic-prompt')?.addEventListener('click', handleCopySubtopicPrompt);
    container.querySelector('#btn-copy-subtopic-prompt-top')?.addEventListener('click', handleCopySubtopicPrompt);

    function renderSubtopicsListLive() {
      if (!subtopicResultsList) return;
      subtopicResultsList.innerHTML = subtopicResults.map((subT, idx) => `
        <div class="subtopic-item-card" style="background: #F8FAFC; border: 1.5px solid #E2E8F0; border-left: 5px solid #0284C7; border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; transition: all 0.2s;">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 260px;">
            <span style="background: #0284C7; color: #FFFFFF; font-weight: 900; font-size: 0.85rem; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              ${idx + 1}
            </span>
            <div>
              <div style="font-weight: 800; font-size: 0.98rem; color: #0F172A; line-height: 1.4;">
                ${subT}
              </div>
              <div style="font-size: 0.74rem; color: #64748B; margin-top: 2px;">
                વિષય #${idx + 1} • ઉચ્ચ દર્શક રસ (High Engagement)
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            <button type="button" class="btn-copy-single-subtopic" data-topic="${subT.replace(/"/g, '&quot;')}" style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #475569; font-weight: 700; font-size: 0.78rem; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
              📋 કોપી
            </button>
            <button type="button" class="btn-select-subtopic-project" data-topic="${subT.replace(/"/g, '&quot;')}" style="background: linear-gradient(135deg, #10B981, #059669); color: #FFFFFF; border: none; font-weight: 900; font-size: 0.82rem; padding: 7px 16px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(16,185,129,0.3);">
              <span>🎯</span> આ વિષય પસંદ કરો →
            </button>
          </div>
        </div>
      `).join('');

      // Wire items click
      attachSubtopicItemEvents();
    }

    function attachSubtopicItemEvents() {
      container.querySelectorAll('.btn-select-subtopic-project').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const chosen = btn.getAttribute('data-topic');
          if (!chosen) return;
          try {
            localStorage.setItem('gyan_active_topic_name', chosen);
            let curProj = projectState.getActiveProject();
            if (!curProj) {
              curProj = projectState.createProject(chosen, chosen);
            } else {
              curProj.name = chosen;
              curProj.topic = chosen;
              projectState.setTopic(chosen);
            }
            projectState.saveProjects();
          } catch (_) {}
          showNoticeToast(`🎉 વિષય પસંદ થયો: ${chosen}`, 'success');
          if (typeof navigateTo === 'function') {
            navigateTo('slideprompts');
          } else {
            window.location.hash = '#slideprompts';
          }
        });
      });

      container.querySelectorAll('.btn-copy-single-subtopic').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const chosen = btn.getAttribute('data-topic');
          if (!chosen) return;
          await copyToClipboard(chosen);
          showNoticeToast('✓ વિષય કોપી થઈ ગયો!', 'info');
        });
      });
    }

    attachSubtopicItemEvents();

    btnRunSubtopicSearch?.addEventListener('click', async () => {
      updateSubtopicPromptLive();
      const labelEl = container.querySelector('#label-subtopic-search-btn');
      if (labelEl) labelEl.textContent = '⏳ શોધાઈ રહ્યું છે...';
      try {
        let generated = null;
        if (typeof api !== 'undefined' && api.searchSubTopics) {
          try {
            const resp = await api.searchSubTopics(subtopicMainTopic, subtopicCount);
            if (resp && resp.success && Array.isArray(resp.subtopics) && resp.subtopics.length > 0) {
              generated = resp.subtopics;
            }
          } catch (_) {}
        }
        if (!generated || generated.length === 0) {
          generated = generateSmartSubTopics(subtopicMainTopic, subtopicCount);
        }

        subtopicResults = generated;
        try {
          localStorage.setItem(SUBTOPICS_CACHE_KEY, JSON.stringify({
            topic: subtopicMainTopic,
            count: subtopicCount,
            subtopics: subtopicResults
          }));
        } catch (_) {}

        renderSubtopicsListLive();
        showNoticeToast(`✓ "${subtopicMainTopic}" ના ${subtopicResults.length} વિષયો તૈયાર છે!`, 'success');
      } catch (err) {
        showNoticeToast('વિષયો શોધવામાં સમસ્યા આવી, કૃપા કરીને ફરી પ્રયાસ કરો.', 'error');
      } finally {
        if (labelEl) labelEl.textContent = '🔍 સીધા ૪-૫ વિષયો શોધો';
      }
    });

    container.querySelector('#btn-parse-pasted-subtopics')?.addEventListener('click', () => {
      const txt = container.querySelector('#textarea-paste-subtopics')?.value || '';
      if (!txt.trim()) {
        alert('કૃપા કરીને પહેલાં ChatGPT માંથી લખાણ પેસ્ટ કરો.');
        return;
      }
      const lines = txt.split('\n')
        .map(l => l.replace(/^[0-9]+[.)\-\s]+/, '').trim())
        .filter(l => l.length > 5 && !l.includes('સ્ક્રિપ્ટ') && !l.includes('નિયમ') && !l.includes('મુખ્ય વિષય:'));
      if (lines.length === 0) {
        alert('પેસ્ટ કરેલા લખાણમાંથી વિષયો ઓળખાઈ શક્યા નહીં.');
        return;
      }
      subtopicResults = lines.slice(0, subtopicCount || 5);
      try {
        localStorage.setItem(SUBTOPICS_CACHE_KEY, JSON.stringify({
          topic: subtopicMainTopic,
          count: subtopicCount,
          subtopics: subtopicResults
        }));
      } catch (_) {}
      renderSubtopicsListLive();
      showNoticeToast(`✓ પેસ્ટ કરેલા લખાણમાંથી ${subtopicResults.length} વિષયો લોડ થઈ ગયા!`, 'success');
    });
  }

  // Initial render
  render();
}
