/**
 * Slide Tool Studio & Content Search — Dedicated 16:9 Pure White Slides with Realistic Photos
 * Gyan Yatra AI Studio — Production Stage 2 (Tool 4)
 * Generates authentic 16:9 pure white presentation slides with realistic photographs,
 * NotebookLM slide paste & import engine, plus unified ChatGPT & NotebookLM content search prompts.
 */

import { copyToClipboard, showNoticeToast } from '../utils/clipboard.js';
import {
  generateClientNotebookLMPrompt,
  deriveAudienceFromTopic,
  classifyTopicDomain,
  deriveSlideOutline
} from '../utils/notebooklmPromptGenerator.js';
import { projectState, isContentMatchingTopic, buildTopicProjectKit } from '../utils/projectState.js';
import { saveProjectPresentation } from '../utils/presentationStorage.js';
import { saveScriptToDatabase } from '../utils/scriptDbSync.js';
import {
  parseExternalSlidesText,
  SAMPLE_NOTEBOOKLM_FORMAT,
  SAMPLE_CHATGPT_FORMAT
} from '../utils/externalSlideParser.js';
import {
  REALISTIC_PHOTO_COLLECTION,
  getPhotoPresetDataUrl,
  getPhotoPresetSvg
} from '../utils/realisticSlidePhotos.js';

export const REALISTIC_PHOTO_PRESETS = [
  {
    id: 'circular',
    name: '🏛️ સત્તાવાર GR પરિપત્ર',
    badge: 'સત્તાવાર પરિપત્ર GR',
    desc: 'ગાંધીનગર સચિવાલય દ્વારા બહાર પડાયેલ સત્તાવાર પરિપત્ર અને સિક્કો'
  },
  {
    id: 'sachivalaya',
    name: '🏢 સચિવાલય ગાંધીનગર',
    badge: 'ગાંધીનગર સ્વર્ણિમ સંકુલ',
    desc: 'સ્વર્ણિમ સંકુલ - સચિવાલય ગાંધીનગર, ગુજરાત સરકાર'
  },
  {
    id: 'highcourt',
    name: '🏛️ ગુજરાત હાઇકોર્ટ (સોલા)',
    badge: '🏛️ ગુજરાત વડી અદાલત • સોલા',
    desc: 'ગુજરાત હાઇકોર્ટ ડિવિઝન બેંચ (LPA 363/2025) ઐતિહાસિક ચુકાદો'
  },
  {
    id: 'courtorder',
    name: '⚖️ હાઇકોર્ટ ચુકાદો ઓર્ડર શીટ',
    badge: '⚖️ LPA 363/2025 • કોર્ટ ઓર્ડર',
    desc: 'હાઇકોર્ટ સત્તાવાર ઓર્ડર શીટ - લઘુતમ વેતન અને કાયમી હકની સત્તાવાર કલમો'
  },
  {
    id: 'anganwadi_meal',
    name: '🍲 આંગણવાડી કેન્દ્ર & ભોજન',
    badge: '🍲 આંગણવાડી કેન્દ્ર • POSHAN',
    desc: 'આંગણવાડી કેન્દ્ર - બહેનો દ્વારા બાળકોને પૌષ્ટિક આહાર અને પૂર્વ પ્રાથમિક શિક્ષણ'
  },
  {
    id: 'officer_memo',
    name: '📋 આવેદનપત્ર (કચેરી રજૂઆત)',
    badge: '📋 સત્તાવાર આવેદનપત્ર • રજૂઆત',
    desc: 'કર્મચારી મંડળો દ્વારા સક્ષમ સરકારી અધિકારીને ચુકાદા અમલ અંગે આવેદનપત્ર'
  },
  {
    id: 'portal',
    name: '💻 સત્તાવાર પોર્ટલ (OJAS/iKhedut)',
    badge: 'સત્તાવાર પોર્ટલ ફોર્મ',
    desc: 'ઓનલાઇન અરજી પોર્ટલ (OJAS / iKhedut / Digital Gujarat)'
  },
  {
    id: 'beneficiary',
    name: '👨‍🌾 વાસ્તવિક લાભાર્થી (ખેડૂત/બહેનો)',
    badge: 'સત્તાવાર લાભાર્થી વર્ગ',
    desc: 'યોજના હેઠળ લાભ મેળવતા પાત્ર લાભાર્થી નાગરિકો'
  },
  {
    id: 'dates',
    name: '📅 સત્તાવાર તારીખ કૅલેન્ડર',
    badge: 'મુદત અને સમયમર્યાદા',
    desc: 'ફોર્મ ભરવાની શરૂઆત, છેલ્લી તારીખ અને મુદત કૅલેન્ડર'
  },
  {
    id: 'rules',
    name: '📜 પાત્રતા નિયમો & ચેકલિસ્ટ',
    badge: 'પાત્રતા & પુરાવા',
    desc: 'જરૂરી ડોક્યુમેન્ટ્સ, પુરાવા અને પાત્રતા નિયમો'
  },
  {
    id: 'subsidy',
    name: '💰 DBT સહાય & સબસિડી',
    badge: 'DBT બેંક સહાય',
    desc: 'સીધા બેંક ખાતામાં સહાય રકમ, સબસિડી અને હપ્તા જમા'
  },
  {
    id: 'helpline',
    name: '📞 ટોલ-ફ્રી હેલ્પલાઇન',
    badge: 'સત્તાવાર હેલ્પલાઇન',
    desc: 'સત્તાવાર ટોલ-ફ્રી હેલ્પલાઇન, પોર્ટલ સપોર્ટ અને માર્ગદર્શન'
  },
  {
    id: 'phone_app',
    name: '📱 સત્તાવાર GR / PDF ડાઉનલોડ',
    badge: '📱 સત્તાવાર PDF ડાઉનલોડ',
    desc: 'સત્તાવાર ઓર્ડર શીટ PDF ડાઉનલોડ, QR સ્કેન અને સબ્સ્ક્રાઇબ'
  }
];

export const ANGANWADI_NOTEBOOKLM_9SLIDES = [
  {
    slideNumber: 1,
    title: 'ગુજરાત હાઇકોર્ટનો ઐતિહાસિક ચુકાદો',
    subtitle: 'આંગણવાડી બહેનો માટે મોટો નિર્ણય (LPA 363/2025)',
    bulletPoints: [
      'હાઇકોર્ટની ડિવિઝન બેંચ (LPA 363/2025) દ્વારા ઐતિહાસિક આદેશ',
      'આંગણવાડી કાર્યકર અને તેડાગર બહેનોને કાયમી કર્મચારી ગણવા નિર્દેશ',
      'રાજ્ય સરકારને લઘુતમ વેતન ચૂકવવા માટે કડક સમયમર્યાદા અપાઈ'
    ],
    photoType: 'highcourt',
    photoCaption: 'ગુજરાત વડી અદાલત સોલા - ડિવિઝન બેંચ ઐતિહાસિક ચુકાદો',
    layoutType: 'split',
    imageUrl: '/presentations/extracted_slides/slide_1.png',
    scriptText: 'નમસ્કાર મિત્રો, જ્ઞાન યાત્રામાં આપનું સ્વાગત છે. ગુજરાત હાઇકોર્ટની ડિવિઝન બેંચ દ્વારા આંગણવાડી બહેનોના હિતમાં એક અત્યંત મોટો અને ઐતિહાસિક ચુકાદો જાહેર કરવામાં આવ્યો છે.'
  },
  {
    slideNumber: 2,
    title: 'કેસની પૃષ્ઠભૂમિ અને માંગણીઓ',
    subtitle: 'વર્ષોથી ચાલતી કાનૂની લડતનો સુખદ અંત',
    bulletPoints: [
      'આંગણવાડી કાર્યકરો દ્વારા લઘુતમ વેતન અને કાયમી દરજ્જાની માંગણી',
      'કેન્દ્ર અને રાજ્ય સરકારના સંયુક્ત પ્રોજેક્ટમાં કામ કરતી બહેનોની રજૂઆત',
      'સિંગલ જજના ચુકાદા સામે સરકારે કરેલી અપીલ હાઇકોર્ટે ફગાવી'
    ],
    photoType: 'anganwadi_meal',
    photoCaption: 'આંગણવાડી કેન્દ્ર - પૌષ્ટિક આહાર અને પૂર્વ પ્રાથમિક શિક્ષણ',
    layoutType: 'split',
    imageUrl: '/presentations/extracted_slides/slide_2.png',
    scriptText: 'આ કેસની પૃષ્ઠભૂમિ જોઈએ તો વર્ષોથી આંગણવાડી બહેનો માનદ વેતન પદ્ધતિ સામે કાયમી દરજ્જો અને લઘુતમ વેતનની માંગ કરી રહી હતી.'
  },
  {
    slideNumber: 3,
    title: 'હાઇકોર્ટના આદેશના મુખ્ય મુદ્દા (LPA 363/2025)',
    subtitle: 'કોર્ટે આપેલા સીધા અને કડક દિશાનિર્દેશો',
    bulletPoints: [
      'માનદ વેતન પદ્ધતિ સામે કાયમી અને લઘુતમ વેતનનો હક માન્ય રખાયો',
      'સરકારને નિર્દેશ: આંગણવાડી સ્ટાફ માટે સ્પષ્ટ નીતિ અને પગાર ધોરણ બનાવો',
      'આદેશની સત્તાવાર નકલ વિભાગ અને સચિવાલયને મોકલી દેવાઈ'
    ],
    photoType: 'courtorder',
    photoCaption: 'હાઇકોર્ટ સત્તાવાર ચુકાદો ઓર્ડર શીટ (LPA 363/2025)',
    layoutType: 'split',
    imageUrl: '/presentations/extracted_slides/slide_3.png',
    scriptText: 'હાઇકોર્ટે પોતાના ચુકાદામાં સ્પષ્ટ નોંધ્યું કે આંગણવાડી બહેનો સમાજ નિર્માણ અને બાળ કલ્યાણમાં પાયાનું કાર્ય કરે છે, તેથી તેઓ લઘુતમ વેતનના કાયદા હેઠળ હકદાર છે.'
  },
  {
    slideNumber: 4,
    title: 'પગાર ધોરણમાં તુલનાત્મક ફેરફાર',
    subtitle: 'જૂનો પગાર vs હાઇકોર્ટ આદેશ બાદ નવો પગાર',
    bulletPoints: [
      'જૂનું માનદ વેતન: ₹૧૦,૦૦૦ પ્રતિ માસ (રાજ્ય સરકારનો જૂનો દર)',
      'હાઇકોર્ટ નિર્ધારિત નવો પગાર: ₹૨૪,૮૦૦ પ્રતિ માસ (લઘુતમ વેતન ધોરણ)',
      'સીધો માસિક ₹૧૪,૮૦૦ નો જંગી વધારો મળવાપાત્ર બનશે!'
    ],
    photoType: 'subsidy',
    photoCaption: 'જૂનું માનદ વેતન ₹૧૦,૦૦૦ vs નવો પગાર ₹૨૪,૮૦૦',
    layoutType: 'comparison',
    comparison: {
      oldTitle: 'જૂનું માનદ વેતન (માસિક)',
      oldAmount: '₹૧૦,૦૦૦',
      oldDesc: 'સરકાર દ્વારા આપવામાં આવતું માસિક માનદ વેતન',
      newTitle: 'નવો પગાર (હાઇકોર્ટ આદેશ)',
      newAmount: '₹૨૪,૮૦૦',
      newDesc: 'લઘુતમ વેતન ધારા હેઠળ નિર્ધારિત પગાર દર',
      diffNote: 'માસિક ₹૧૪,૮૦૦ નો ઐતિહાસિક સીધો વધારો!'
    },
    imageUrl: '/presentations/extracted_slides/slide_4.png',
    scriptText: 'પગાર ધોરણમાં સૌથી મોટો તફાવત એ છે કે અત્યાર સુધી મળતું ₹૧૦,૦૦૦ નું માનદ વેતન હવે વધીને લઘુતમ વેતન ધારા મુજબ ₹૨૪,૮૦૦ થવા જઈ રહ્યું છે.'
  },
  {
    slideNumber: 5,
    title: 'પગાર ગણતરી અને વધારાનું માળખું',
    subtitle: 'સરકાર દ્વારા ચૂકવવાપાત્ર કુલ પગારની ફોર્મ્યુલા',
    bulletPoints: [
      'મૂળ માનદ વેતન ઘટક: ₹૧૦,૦૦૦ (હાલનું સ્તર)',
      'લઘુતમ વેતન તફાવત ઘટક: ₹૧૪,૮૦૦ (કોર્ટે નિર્દેશિત તફાવત)',
      'કુલ માસિક ચૂકવવાપાત્ર વેતન: ₹૨૪,૮૦૦'
    ],
    photoType: 'subsidy',
    photoCaption: '[મૂળ ₹૧૦,૦૦૦] + [તફાવત ₹૧૪,૮૦૦] = [કુલ ₹૨૪,૮૦૦]',
    layoutType: 'formula',
    formula: {
      block1: { title: 'મૂળ માનદ વેતન', amount: '₹૧૦,૦૦૦', desc: 'બેઝિક ઘટક' },
      operator1: '+',
      block2: { title: 'લઘુતમ વેતન તફાવત', amount: '₹૧૪,૮૦૦', desc: 'હાઇકોર્ટ નિર્દેશ' },
      operator2: '=',
      block3: { title: 'કુલ માસિક વેતન', amount: '₹૨૪,૮૦૦', desc: 'કુલ ચૂકવવાપાત્ર પગાર' }
    },
    imageUrl: '/presentations/extracted_slides/slide_5.png',
    scriptText: 'આ ગણતરી સમજવી ખૂબ જરૂરી છે: મૂળ ₹૧૦,૦૦૦ માં લઘુતમ વેતનનો તફાવત ₹૧૪,૮૦૦ ઉમેરાતાં કુલ માસિક પગાર ₹૨૪,૮૦૦ થાય છે.'
  },
  {
    slideNumber: 6,
    title: 'અમલીકરણની સમયરેખા અને એરિયર્સ',
    subtitle: 'હાઇકોર્ટે આપેલી સત્તાવાર મુદત અને સમયમર્યાદા',
    bulletPoints: [
      '૧ એપ્રિલ ૨૦૨૫: નવા પગાર ધોરણનો અમલ શરૂ કરવાની મુદત',
      '૬ મહિનાનો સમયગાળો: સરકાર દ્વારા નીતિ નિયમો ઘડવા માટે મુદત',
      'એરિયર્સ ચૂકવણી: તમામ બાકી રકમ (Arrears) ખાતામાં જમા કરવાનો નિર્દેશ'
    ],
    photoType: 'dates',
    photoCaption: '૧ એપ્રિલ ૨૦૨૫ ➔ ૬ મહિનાની મુદત ➔ એરિયર્સ ચૂકવણી',
    layoutType: 'timeline',
    timeline: [
      { step: '૧', date: '૧ એપ્રિલ ૨૦૨૫', title: 'અમલ શરૂ', desc: 'નવા પગાર ધોરણનો અમલ કરવાનો નિર્દેશ' },
      { step: '૨', date: '૬ મહિનાની મુદત', title: 'નીતિ ઘડતર', desc: 'રાજ્ય સરકાર દ્વારા સત્તાવાર નિયમો તૈયાર કરવા' },
      { step: '૩', date: 'બાકી ચૂકવણી', title: 'એરિયર્સ જમા', desc: 'પાછલી બાકી રકમ સીધી બેંક ખાતામાં જમા' }
    ],
    imageUrl: '/presentations/extracted_slides/slide_6.png',
    scriptText: 'હાઇકોર્ટે સરકારને સમયરેખા આપતાં નિર્દેશ આપ્યો છે કે ૧ એપ્રિલ ૨૦૨૫ થી આ વ્યવસ્થા અમલી થશે અને ૬ મહિનામાં તમામ નીતિ નિયમો નક્કી કરી એરિયર્સ ચૂકવી દેવાશે.'
  },
  {
    slideNumber: 7,
    title: 'રાજ્ય સરકારની પ્રતિક્રિયા અને આગામી પગલાં',
    subtitle: 'ગાંધીનગર સચિવાલય ખાતે કાનૂની અને નાણાકીય મંથન',
    bulletPoints: [
      'મહિલા અને બાળ વિકાસ વિભાગ દ્વારા લીગલ ઓપિનિયન મંગાયો',
      'નાણાં વિભાગ સાથે સંકલન કરી બજેટ જોગવાઈ પર ગંભીર વિચારણા',
      'સુપ્રીમ કોર્ટમાં સ્પેશિયલ લીવ પિટિશન કરવી કે અમલ કરવો તે અંગે ચર્ચા'
    ],
    photoType: 'sachivalaya',
    photoCaption: 'ગાંધીનગર સચિવાલય સ્વર્ણિમ સંકુલ - સત્તાવાર વહીવટી મંથન',
    layoutType: 'split',
    imageUrl: '/presentations/extracted_slides/slide_7.png',
    scriptText: 'હાઇકોર્ટના આદેશ બાદ ગાંધીનગર સચિવાલય ખાતે મહિલા બાળ વિકાસ અને નાણાં વિભાગ દ્વારા આ અંગે કાનૂની સલાહ અને બજેટ જોગવાઈની પ્રક્રિયા તેજ બની છે.'
  },
  {
    slideNumber: 8,
    title: 'આંગણવાડી કર્મચારી મંડળોનો આવકાર',
    subtitle: 'રાજ્યભરમાં આનંદ અને ઉત્સવનો માહોલ',
    bulletPoints: [
      'વર્ષોના સંઘર્ષ અને આંદોલન બાદ બહેનોના અધિકારનો વિજય',
      'યુનિયન દ્વારા ચુકાદાને તાત્કાલિક લાગુ કરવા સરકારને રજૂઆત',
      'રાજ્યની ૫૩,૦૦૦ થી વધુ આંગણવાડી કાર્યકરોમાં હર્ષોલ્લાસ'
    ],
    photoType: 'officer_memo',
    photoCaption: 'સંગઠનો દ્વારા આવેદનપત્ર અને ચુકાદાનું સ્વાગત',
    layoutType: 'split',
    imageUrl: '/presentations/extracted_slides/slide_8.png',
    scriptText: 'રાજ્યના આંગણવાડી કર્મચારી યુનિયનોએ આ ચુકાદાને આવકારીને ઐતિહાસિક વિજય ગણાવ્યો છે અને સરકારને વિનંતી કરી છે કે તેનો ઝડપી અમલ કરવામાં આવે.'
  },
  {
    slideNumber: 9,
    title: 'નિષ્કર્ષ અને સત્તાવાર ચુકાદાની નકલ',
    subtitle: 'સત્તાવાર ઓર્ડર PDF ડાઉનલોડ & જ્ઞાન યાત્રા સહાય',
    bulletPoints: [
      'હાઇકોર્ટના આદેશની સત્તાવાર PDF ઓર્ડર નકલ ઉપલબ્ધ છે',
      'અમારા વિડીયોના ડિસ્ક્રિપ્શન અને જ્ઞાન યાત્રા એપ પરથી સીધી ડાઉનલોડ કરો',
      'ચેનલને સબ્સ્ક્રાઇબ કરો અને સરકારી યોજનાઓની સાચી માહિતી મેળવતા રહો'
    ],
    photoType: 'phone_app',
    photoCaption: 'Gyan Yatra App • સત્તાવાર ઓર્ડર PDF ડાઉનલોડ',
    layoutType: 'split',
    imageUrl: '/presentations/extracted_slides/slide_9.png',
    scriptText: 'જો તમે આ ઐતિહાસિક ચુકાદાની સત્તાવાર PDF ડાઉનલોડ કરવા માંગતા હોવ તો ડિસ્ક્રિપ્શનમાં આપેલી લિંક પરથી મેળવી શકો છો. વિડીયો ગમ્યો હોય તો લાઈક અને શેર જરૂર કરશો.'
  }
];

export function renderSlidePrompts(container, navigateTo) {
  const curProj = projectState.getActiveProject();
  const prefill = (window.prefillTopic || '').trim();
  window.prefillTopic = null;

  const storedTopic = (typeof localStorage !== 'undefined' ? (localStorage.getItem('gyan_active_topic_name') || '') : '').trim();
  const projTopic = (curProj?.topic || '').trim();
  const projName = (curProj?.name || '').trim();

  // Strict resolution of activeTopic: Prioritize prefill -> stored topic -> project topic -> project name
  let activeTopic = prefill || storedTopic || projTopic;
  if (!activeTopic || activeTopic === 'મારો નવો વિડીયો પ્રોજેક્ટ' || activeTopic === 'Untitled Project') {
    activeTopic = (projName && projName !== 'મારો નવો વિડીયો પ્રોજેક્ટ' && projName !== 'Untitled Project')
      ? projName
      : 'ગુજરાત નવી સરકારી યોજના ૨૦૨૬';
  }

  // Ensure active topic is updated across project state and storage
  if (curProj && curProj.topic !== activeTopic) {
    projectState.setTopic(activeTopic);
  }
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem('gyan_active_topic_name', activeTopic);
  } catch (_) {}

  let slideCountChoice = '8-10';
  let researchNotes = curProj?.slide?.notes || '';
  let activePromptMode = 'chatgpt-unified'; // Default: 'chatgpt-unified' (Search & Prepare Content + 16:9 White PPT Slide Deck)
  let showPasteModal = false;

  // =========================================================================
  // SLIDE DECK INITIALIZATION (NotebookLM-Grade Deep Authentic Content)
  // =========================================================================
  function initSlidesForTopic(topic) {
    // 0. Special: If topic matches Anganwadi High Court Case / Ruling, load authentic 9-slide presentation
    if (/આંગણવાડી|તેડાગર|હાઈકોર્ટ|anganwadi|363/i.test(topic)) {
      return JSON.parse(JSON.stringify(ANGANWADI_NOTEBOOKLM_9SLIDES));
    }

    // 1. If project already has authentic slides matching this active topic, load them
    const existingSlides = curProj?.slide?.slides;
    if (Array.isArray(existingSlides) && existingSlides.length >= 3 && isContentMatchingTopic(existingSlides, topic)) {
      return existingSlides.map((s, idx) => ({
        slideNumber: s.slideNumber || (idx + 1),
        title: s.title || `સ્લાઇડ #${idx + 1}`,
        subtitle: s.subtitle || '',
        bulletPoints: Array.isArray(s.bulletPoints) && s.bulletPoints.length > 0 ? s.bulletPoints : [
          `${topic} અંગે મહત્વપૂર્ણ સત્તાવાર જાહેરાત`,
          'પાત્રતા માપદંડો અને સરકારી નિયમો ૨૦૨૬',
          'ઓનલાઇન અરજી પ્રક્રિયા અને જરૂરી દસ્તાવેજો'
        ],
        photoType: s.photoType || assignDefaultPhotoType(idx, s.title, s.visual),
        photoCaption: s.photoCaption || s.visual || 'સત્તાવાર પરિપત્ર અને નિયમો મુજબ વિગત',
        layoutType: s.layoutType || 'split',
        comparison: s.comparison || null,
        formula: s.formula || null,
        timeline: s.timeline || null,
        imageUrl: s.imageUrl || null,
        scriptText: s.scriptText || ''
      }));
    }

    // 2. Generate authentic rich NotebookLM-grade slides from deriveSlideOutline
    const domain = classifyTopicDomain(topic);
    const audience = deriveAudienceFromTopic(topic, domain);
    const outline = deriveSlideOutline(topic, domain, '8-10', audience);

    if (Array.isArray(outline) && outline.length > 0) {
      return outline.map((s, idx) => {
        const sNum = idx + 1;
        const pts = (Array.isArray(s.points) && s.points.length > 0)
          ? s.points
          : [
              `${topic} અંગે સત્તાવાર પરિપત્ર જાહેર`,
              'પાત્રતા માપદંડો અને સરકારી નિયમો ૨૦૨૬',
              'ઓનલાઇન અરજી અને જરૂરી દસ્તાવેજો'
            ];
        return {
          slideNumber: sNum,
          title: s.title || `સ્લાઇડ #${sNum}`,
          subtitle: `${topic} • સ્લાઇડ #${sNum}`,
          bulletPoints: pts,
          photoType: assignDefaultPhotoType(idx, s.title, s.visual),
          photoCaption: s.visual || 'સત્તાવાર પરિપત્ર અને નિયમો મુજબ વિગત',
          layoutType: (idx === 1 || idx === 3) ? 'cards' : 'split',
          comparison: null,
          formula: null,
          timeline: null,
          imageUrl: null,
          scriptText: s.voiceover || `આ સ્લાઇડમાં ${s.title} અંગે સંપૂર્ણ સત્તાવાર માહિતી સમજાવેલ છે.`
        };
      });
    }

    // Fallback: buildTopicProjectKit
    const freshKit = buildTopicProjectKit(topic, curProj?.id || 'proj_active');
    const deck = freshKit.slideDeck || [];
    return deck.map((s, idx) => ({
      slideNumber: idx + 1,
      title: s.title || `સ્લાઇડ #${idx + 1}`,
      subtitle: s.subtitle || `${topic} • સ્લાઇડ #${idx + 1}`,
      bulletPoints: Array.isArray(s.bulletPoints) && s.bulletPoints.length > 0 ? s.bulletPoints : [
        `${topic} અંગે સત્તાવાર જાહેરાત અને પરિપત્ર`,
        'પાત્રતા, શરતો અને જરૂરી નિયમો ૨૦૨૬',
        'ઓનલાઇન પોર્ટલ પરથી અરજી પ્રક્રિયા'
      ],
      photoType: assignDefaultPhotoType(idx, s.title, s.visual),
      photoCaption: s.visual || 'સત્તાવાર પરિપત્ર અને સરકારી પુરાવા',
      layoutType: 'split',
      comparison: null,
      formula: null,
      timeline: null,
      imageUrl: s.imageUrl || null,
      scriptText: s.scriptText || ''
    }));
  }

  function assignDefaultPhotoType(idx, title = '', visual = '') {
    const combined = `${title} ${visual}`.toLowerCase();
    if (combined.includes('હાઇકોર્ટ') || combined.includes('હાઈકોર્ટ') || combined.includes('કોર્ટ') || combined.includes('ન્યાયાલય')) {
      return 'highcourt';
    }
    if (combined.includes('ચુકાદો') || combined.includes('ઓર્ડર') || combined.includes('lpa') || combined.includes('આદેશ')) {
      return 'courtorder';
    }
    if (combined.includes('આંગણવાડી') && (combined.includes('ભોજન') || combined.includes('કેન્દ્ર') || combined.includes('બાળક') || combined.includes('ખોરાક'))) {
      return 'anganwadi_meal';
    }
    if (combined.includes('આવેદનપત્ર') || combined.includes('રજૂઆત') || combined.includes('મંડળ') || combined.includes('યુનિયન')) {
      return 'officer_memo';
    }
    if (combined.includes('ડાઉનલોડ') || combined.includes('પીડીએફ') || combined.includes('pdf') || combined.includes('એપ') || combined.includes('app')) {
      return 'phone_app';
    }
    if (combined.includes('પોર્ટલ') || combined.includes('ojas') || combined.includes('ikhedut') || combined.includes('ઓનલાઇન અરજી') || combined.includes('વેબસાઇટ')) {
      return 'portal';
    }
    if (combined.includes('સબસિડી') || combined.includes('સહાય') || combined.includes('હપ્તો') || combined.includes('dbt') || combined.includes('રૂપિયા') || combined.includes('નાણાકીય') || combined.includes('વેતન')) {
      return 'subsidy';
    }
    if (combined.includes('તારીખ') || combined.includes('મુદત') || combined.includes('કૅલેન્ડર') || combined.includes('છેલ્લી તારીખ')) {
      return 'dates';
    }
    if (combined.includes('દસ્તાવેજ') || combined.includes('પુરાવા') || combined.includes('ડોક્યુમેન્ટ') || combined.includes('ચેકલિસ્ટ') || combined.includes('પાત્રતા')) {
      return 'rules';
    }
    if (combined.includes('ખેડૂત') || combined.includes('આંગણવાડી') || combined.includes('લાભાર્થી') || combined.includes('બહેનો') || combined.includes('ઉમેદવાર')) {
      return 'beneficiary';
    }
    if (combined.includes('સચિવાલય') || combined.includes('ગાંધીનગર') || combined.includes('સ્વર્ણિમ સંકુલ')) {
      return 'sachivalaya';
    }
    if (combined.includes('હેલ્પલાઇન') || combined.includes('ટોલ ફ્રી') || combined.includes('૧૯૩૦') || combined.includes('સંપર્ક')) {
      return 'helpline';
    }
    const defaultSeq = ['highcourt', 'anganwadi_meal', 'courtorder', 'subsidy', 'sachivalaya', 'officer_memo', 'phone_app', 'circular'];
    return defaultSeq[idx % defaultSeq.length];
  }

  let slidesList = initSlidesForTopic(activeTopic);
  let activeSlideIdx = 0;

  function generatePromptData(topic, count = '8-10') {
    const res = generateClientNotebookLMPrompt({
      topic,
      templateId: 'white-real',
      tool: 'notebooklm-slides',
      slideCount: count,
      audience: 'auto',
      includeBranding: true
    });
    return {
      promptText: res.pptDeckPrompt || res.promptText || '',
      uploadedSourcePrompt: res.uploadedSourcePrompt || res.pptDeckPrompt || '',
      pptDeckPrompt: res.pptDeckPrompt || '',
      chatgptUnifiedPrompt: res.chatgptUnifiedPrompt || res.pptDeckPrompt || '',
      chatgptSearchPrompt: res.chatgptSearchPrompt || '',
      audienceText: res.audienceText || deriveAudienceFromTopic(topic)
    };
  }

  // Generate fresh prompt data specifically tailored for this active topic
  const initialData = generatePromptData(activeTopic, slideCountChoice);
  let currentAudienceText = initialData.audienceText;
  let currentUploadedSourcePrompt = initialData.uploadedSourcePrompt;
  let currentSearchPrompt = initialData.pptDeckPrompt;
  let currentChatGPTUnifiedPrompt = initialData.chatgptUnifiedPrompt;
  let currentChatGPTSearchPrompt = initialData.chatgptSearchPrompt;

  // Default to ChatGPT unified content search + 16:9 slide deck prompt for the active topic
  let tool2Prompt = currentChatGPTUnifiedPrompt;
  if (activePromptMode === 'source') tool2Prompt = currentUploadedSourcePrompt;
  else if (activePromptMode === 'search') tool2Prompt = currentSearchPrompt;
  else if (activePromptMode === 'chatgpt-search') tool2Prompt = currentChatGPTSearchPrompt;
  else tool2Prompt = currentChatGPTUnifiedPrompt;

  // Persist slides in project state
  curProj.slide = curProj.slide || {};
  curProj.slide.slides = slidesList;
  curProj.slide.slideCount = `${slidesList.length} સ્લાઇડ્સ`;
  curProj.slide.tool2Prompt = tool2Prompt;
  curProj.slide.topic = activeTopic;
  curProj.slide.isCompleted = true;
  projectState.updateTool('slide', curProj.slide);

  // =========================================================================
  // REALISTIC PHOTO VISUAL RENDERER (Clean, Authentic, Zero Neon, Zero 3D Cartoon)
  // =========================================================================
  function renderRealisticPhotoVisual(slide) {
    if (slide.imageUrl) {
      return `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #ffffff; border-radius: 6px; overflow: hidden;">
          <img src="${slide.imageUrl}" alt="${slide.title || 'Slide Photo'}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
        </div>
      `;
    }

    const type = slide.photoType || 'sachivalaya';
    const photoUrl = getPhotoPresetDataUrl(type);

    return `
      <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #ffffff; border-radius: 6px; overflow: hidden;">
        <img src="${photoUrl}" alt="${slide.title || 'Slide Visual'}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
      </div>
    `;
  }

  function render() {
    const curSlide = slidesList[activeSlideIdx] || slidesList[0] || {
      slideNumber: 1,
      title: activeTopic,
      subtitle: `${activeTopic} • સત્તાવાર વિગત`,
      bulletPoints: [`${activeTopic} અંગે મહત્વપૂર્ણ વિગત`, 'સત્તાવાર પરિપત્ર અને નિયમો ૨૦૨૬'],
      photoType: 'circular',
      photoCaption: 'સત્તાવાર પરિપત્ર અને નિયમો',
      layoutType: 'split',
      imageUrl: null
    };

    const curPhotoPreset = REALISTIC_PHOTO_PRESETS.find(p => p.id === curSlide.photoType) || REALISTIC_PHOTO_PRESETS[0];
    const photoVisualHtml = renderRealisticPhotoVisual(curSlide);
    const bullets = Array.isArray(curSlide.bulletPoints) && curSlide.bulletPoints.length > 0
      ? curSlide.bulletPoints
      : [`${activeTopic} અંગે સત્તાવાર પરિપત્ર મુજબ વિગત`];

    const isCardsLayout = curSlide.layoutType === 'cards';

    container.innerHTML = `
      <!-- TOP CONTEXT BANNER -->
      <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid #10b981; border-radius: var(--radius-lg); padding: 16px 22px; margin-bottom: 20px; box-shadow: 0 8px 30px rgba(16, 185, 129, 0.2); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(16, 185, 129, 0.2); display: flex; align-items: center; justify-content: center; font-size: 1.6rem; border: 1px solid rgba(16, 185, 129, 0.4);">
            ⚡
          </div>
          <div>
            <h2 style="font-size: 1.35rem; font-weight: 900; color: #ffffff; margin: 0 0 2px 0; display: flex; align-items: center; gap: 8px;">
              <span>૪. Content Search & Slide Prompt Studio (સ્લાઇડ પ્રોમ્પ્ટ ટૂલ)</span>
              <span class="badge" style="background: rgba(16,185,129,0.25); color: #6ee7b7; border: 1px solid #10b981; font-size: 0.72rem; font-weight: 800; padding: 3px 8px;">
                ૪. Content Search (સ્લાઇડ પ્રમાણે કન્ટેન્ટ પ્રોમ્પ્ટ)
              </span>
            </h2>
            <div style="margin-top: 6px; display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.15); border: 1.5px solid #10b981; padding: 4px 12px; border-radius: 8px;">
              <span style="font-size: 0.78rem; font-weight: 800; color: #6ee7b7;">🎯 સક્રિય વિષય (ACTIVE TOPIC):</span>
              <strong id="sp-active-topic-display" style="color: #ffffff; font-size: 0.95rem;">${activeTopic}</strong>
            </div>
            <p style="color: #cbd5e1; font-size: 0.8rem; margin: 6px 0 0 0;">
              ChatGPT અને NotebookLM માટે ફક્ત સ્લાઇડ પ્રમાણે કન્ટેન્ટ સર્ચ પ્રોમ્પ્ટ — વક્તાસ્પીચ વગર ફક્ત સ્લાઇડ કન્ટેન્ટ & ૧૬:૯ વાસ્તવિક ફોટા!
            </p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <button id="btn-prev-to-topics-top" class="btn btn-outline btn-sm" style="border: 1.5px solid rgba(255,255,255,0.25); color: #cbd5e1; font-weight: 700; padding: 8px 14px; border-radius: 8px;" title="પાછલું પગલું: ૩. My Topics">
            ← ૩. My Topics
          </button>
          <button id="btn-open-paste-modal-top" class="btn btn-sm" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #ffffff; font-weight: 800; padding: 8px 16px; border-radius: 8px; border: none; box-shadow: 0 4px 14px rgba(139,92,246,0.35); cursor: pointer;" title="NotebookLM અથવા ChatGPT માંથી કોપી કરેલું લખાણ અહીં પેસ્ટ કરો">
            📥 કન્ટેન્ટ પેસ્ટ કરો
          </button>
          <button id="btn-top-save-all-slides" class="btn btn-success btn-sm" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; font-weight: 800; padding: 8px 18px; border-radius: 8px; border: none; box-shadow: 0 4px 14px rgba(16,185,129,0.35); cursor: pointer;">
            💾 સ્લાઇડ્સ સાચવો (Save)
          </button>
          <button id="btn-next-to-slides-top" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #3b82f6, #2563eb); border: none; font-weight: 800; padding: 8px 18px; border-radius: 8px;">
            ૫. Script (PDF & સ્ક્રિપ્ટ) ➔
          </button>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- MAIN HERO: CHATGPT CONTENT SEARCH & SLIDE-WISE PROMPT (SINGLE BOX STUDIO) -->
      <!-- ========================================================================= -->
      <div class="card" style="background: #0f172a; border: 1.5px solid rgba(16, 185, 129, 0.4); border-radius: 14px; padding: 22px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); margin-bottom: 24px;">
        
        <!-- PROMPT MODE TABS (Prominent at top of card) -->
        <div style="display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 14px;">
          <button type="button" id="btn-tab-chatgpt-unified" class="btn btn-sm" style="background: ${activePromptMode === 'chatgpt-unified' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.06)'}; color: #ffffff; border: 1.5px solid ${activePromptMode === 'chatgpt-unified' ? '#34d399' : 'rgba(255,255,255,0.2)'}; font-weight: 800; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <span>⚡</span> ChatGPT સ્લાઇડ કન્ટેન્ટ પ્રોમ્પ્ટ (એક જ બોક્સ - સ્લાઇડ વાઇઝ)
          </button>
          <button type="button" id="btn-tab-chatgpt-search" class="btn btn-sm" style="background: ${activePromptMode === 'chatgpt-search' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'rgba(255,255,255,0.06)'}; color: #ffffff; border: 1.5px solid ${activePromptMode === 'chatgpt-search' ? '#38bdf8' : 'rgba(255,255,255,0.2)'}; font-weight: 800; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <span>🔍</span> ChatGPT લાઇવ સર્ચ પ્રોમ્પ્ટ (કન્ટેન્ટ રિસર્ચ)
          </button>
          <button type="button" id="btn-tab-search-prompt" class="btn btn-sm" style="background: ${activePromptMode === 'search' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.06)'}; color: #ffffff; border: 1.5px solid ${activePromptMode === 'search' ? '#fbbf24' : 'rgba(255,255,255,0.2)'}; font-weight: 800; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <span>📑</span> Google NotebookLM સ્લાઇડ ડેક પ્રોમ્પ્ટ (16:9 સફેદ સ્લાઇડ્સ)
          </button>
          <button type="button" id="btn-tab-source-prompt" class="btn btn-sm" style="background: ${activePromptMode === 'source' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(255,255,255,0.06)'}; color: #ffffff; border: 1.5px solid ${activePromptMode === 'source' ? '#a78bfa' : 'rgba(255,255,255,0.2)'}; font-weight: 800; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
            <span>📁</span> ૧. અપલોડ કરેલ સોર્સ (PDF) સ્લાઇડ પ્રોમ્પ્ટ
          </button>
        </div>

        <!-- Controls: Topic input & 1-Click Action Buttons -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <div style="flex: 1; min-width: 260px;">
            <label style="display: block; font-size: 0.82rem; font-weight: 800; color: #38bdf8; margin-bottom: 6px;">
              🎯 વિડીયોનો મુખ્ય વિષય (Topic):
            </label>
            <input type="text" id="input-notebooklm-topic" class="form-input font-gu" value="${activeTopic}" placeholder="દા.ત. આંગણવાડી ભરતી ૨૦૨૬ સત્તાવાર પરિપત્ર..." style="font-weight: 800; font-size: 0.95rem; padding: 10px 14px; background: #07090e; border: 1.5px solid rgba(56,189,248,0.3); color: #fff; border-radius: 8px; width: 100%; box-sizing: border-box;">
          </div>

          <div style="min-width: 130px;">
            <label style="display: block; font-size: 0.82rem; font-weight: 800; color: #94a3b8; margin-bottom: 6px;">
              📊 સ્લાઇડ્સ સંખ્યા:
            </label>
            <select id="select-notebooklm-count" class="form-select" style="background: #07090e; border: 1.5px solid rgba(255,255,255,0.2); color: #fff; padding: 9px 12px; border-radius: 8px; font-weight: 800; width: 100%;">
              <option value="5-6" ${slideCountChoice === '5-6' ? 'selected' : ''}>૫-૬ સ્લાઇડ્સ</option>
              <option value="8-10" ${slideCountChoice === '8-10' ? 'selected' : ''}>૮-૧૦ સ્લાઇડ્સ (શ્રેષ્ઠ)</option>
              <option value="10-12" ${slideCountChoice === '10-12' ? 'selected' : ''}>૧૦-૧૨ સ્લાઇડ્સ</option>
            </select>
          </div>

          <div style="display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap;">
            <button id="btn-copy-notebooklm-prompt" class="btn" style="font-weight: 900; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; padding: 11px 22px; border-radius: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.4); display: inline-flex; align-items: center; gap: 8px; font-size: 0.95rem; cursor: pointer;">
              <span id="copy-icon">📋</span>
              <span id="copy-text">પ્રોમ્પ્ટ કોપી કરો (Copy Prompt)</span>
            </button>
            <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" id="btn-open-chatgpt-from-box" class="btn" style="font-weight: 900; background: #0284c7; color: #fff; text-decoration: none; border: none; padding: 11px 18px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(2,132,199,0.3); font-size: 0.92rem;">
              <span>⚡</span> Open ChatGPT ↗
            </a>
            <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="border-color: #fbbf24; color: #fbbf24; font-weight: 700; text-decoration: none; padding: 10px 16px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
              <span>🌐</span> Open NotebookLM ↗
            </a>
            <button id="btn-regenerate-notebooklm-prompt" class="btn btn-outline" style="border-color: #64748b; color: #cbd5e1; font-weight: 700; padding: 10px 14px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
              <span>🔄</span> નવો પ્રોમ્પ્ટ
            </button>
            <button id="btn-save-notebooklm-prompt" class="btn btn-success" style="font-weight: 800; background: #059669; border: none; padding: 10px 16px; border-radius: 8px;">
              💾 સાચવો
            </button>
          </div>
        </div>

        <!-- Live Auto-detected Audience & Info Bar -->
        <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 8px 14px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1rem;">👥</span>
            <span style="font-size: 0.8rem; font-weight: 700; color: #94a3b8;">લક્ષિત દર્શકો:</span>
            <span id="badge-detected-audience" class="badge font-gu" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid #38bdf8; font-size: 0.82rem; font-weight: 800; padding: 3px 8px;">
              ${currentAudienceText}
            </span>
          </div>
          <span style="font-size: 0.74rem; color: #34d399; font-weight: 700;">
            ✓ વિષય બદલાતા કન્ટેન્ટ સર્ચ પ્રોમ્પ્ટ આપમેળે અપડેટ થશે
          </span>
        </div>

        <!-- THE MAIN PURE CONTENT SEARCH PROMPT BOX -->
        <div style="background: rgba(0,0,0,0.5); border: 1.5px solid rgba(16, 185, 129, 0.35); border-radius: 10px; padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #34d399; font-size: 1.1rem;">⚡</span>
              <span id="prompt-box-header-title" style="font-weight: 800; font-size: 0.95rem; color: #ffffff;">
                ⚡ આ એક જ વિષય માટે ફક્ત સ્લાઇડ પ્રમાણે વ્યવસ્થિત કન્ટેન્ટ પ્રોમ્પ્ટ:
              </span>
            </div>
            <span id="prompt-box-header-sub" style="font-size: 0.76rem; color: #94a3b8;">
              એક જ બોક્સ • વક્તાસ્પીચ વગર ફક્ત સ્લાઇડ કન્ટેન્ટ • શુદ્ધ સફેદ બેકગ્રાઉન્ડ & વાસ્તવિક ફોટા
            </span>
          </div>
          <textarea id="textarea-notebooklm-prompt" class="form-textarea font-gu" style="width: 100%; min-height: 380px; font-size: 0.9rem; line-height: 1.6; background: #07090e; border: 1px solid rgba(255,255,255,0.1); color: #f1f5f9; font-family: monospace; padding: 14px; border-radius: 8px; box-sizing: border-box; resize: vertical;">${tool2Prompt}</textarea>
        </div>

        <!-- Guidance Strip -->
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 8px; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px; color: #a7f3d0; font-size: 0.85rem; line-height: 1.5;">
            <span style="font-size: 1.2rem;">💡</span>
            <span><strong>૧-ક્લિક રીત:</strong> "પ્રોમ્પ્ટ કોપી કરો" ➔ ChatGPT અથવા NotebookLM માં પેસ્ટ કરો ➔ AI વક્તાસ્પીચ વગર ફક્ત સ્લાઇડ પ્રમાણે વ્યવસ્થિત કન્ટેન્ટ અને ૧૬:૯ વાસ્તવિક ફોટાનું પ્લાનિંગ આપશે. નીચેથી સીધું લખાણ પેસ્ટ કરી શકો છો અથવા તૈયાર PDF જોડી શકો છો!</span>
          </div>
          <button id="btn-next-to-slides-bottom" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: 800; padding: 8px 18px; border-radius: 6px;">
            આગળ વધો: ૫. Script ➔
          </button>
        </div>

      </div>

      <!-- ========================================================================= -->
      <!-- SECTION 2: LIVE SEARCH, SOURCE GUIDANCE & NOTEBOOKLM PDF UPLOAD -->
      <!-- ========================================================================= -->
      <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
        
        <!-- Hidden controls needed for state: notes -->
        <div style="display: none;">
          <textarea id="textarea-research-notes">${researchNotes}</textarea>
        </div>

        <!-- DIRECT LIVE SEARCH & INSTANT SLIDE DECK MODE CALLOUT BANNER -->
        <div id="banner-search-mode" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(180, 83, 9, 0.22)); border: 1.5px solid #f59e0b; border-radius: 12px; padding: 16px 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.8rem;">⚡</span>
              <div>
                <div style="font-weight: 900; font-size: 1.02rem; color: #fbbf24; display: flex; align-items: center; gap: 8px;">
                  <span>ડાયરેક્ટ સર્ચ & ઇન્સ્ટન્ટ સ્લાઇડ ડેક મોડ</span>
                  <span class="badge" style="background: #f59e0b; color: #000; font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; font-weight: 800;">LIVE WEB RESEARCH</span>
                </div>
                <div style="font-size: 0.8rem; color: #fde68a; margin-top: 3px;">
                  PDF પરિપત્ર વગર પણ વિષય મુજબ સીધું લાઈવ સર્ચ કરાવી ૧૬:૯ શુદ્ધ સફેદ બેકગ્રાઉન્ડ સાથે સ્લાઇડ ડેક બનાવી શકો છો!
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <button id="btn-quick-copy-search-prompt" class="btn btn-sm" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; font-weight: 900; border: none; padding: 8px 16px; border-radius: 6px; box-shadow: 0 4px 12px rgba(245,158,11,0.3); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                <span>⚡</span> ડાયરેક્ટ સર્ચ પ્રોમ્પ્ટ કોપી કરો
              </button>
            </div>
          </div>
        </div>

        <!-- SOURCE UPLOAD GUIDANCE CARD & QUICK COPY -->
        <div id="banner-source-mode" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(88, 28, 135, 0.22)); border: 1.5px solid #8b5cf6; border-radius: 12px; padding: 16px 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.8rem;">📑</span>
              <div>
                <div style="font-weight: 900; font-size: 1.02rem; color: #c4b5fd; display: flex; align-items: center; gap: 8px;">
                  <span>NotebookLM માં SOURCE (PDF/પરિપત્ર) અપલોડ કર્યા પછી સ્લાઇડ્સ કેવી રીતે મેળવવી?</span>
                  <span class="badge" style="background: #8b5cf6; color: #ffffff; font-size: 0.72rem; padding: 2px 8px; border-radius: 4px; font-weight: 800;">SOURCE ACCURATE</span>
                </div>
                <div style="font-size: 0.8rem; color: #ddd6fe; margin-top: 3px;">
                  તમે NotebookLM માં પરિપત્ર/PDF અપલોડ કરી હોય તો આ પ્રોમ્પ્ટ પેસ્ટ કરતાં જ તે દસ્તાવેજના આધારે ૧૦૦% સાચી સ્લાઇડ્સ બનશે.
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <button id="btn-quick-copy-source-prompt" class="btn btn-sm" style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; font-weight: 800; border: none; padding: 8px 16px; border-radius: 6px; box-shadow: 0 4px 12px rgba(139,92,246,0.3); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                <span>⚡</span> સોર્સ (PDF) સ્લાઇડ પ્રોમ્પ્ટ કોપી કરો
              </button>
            </div>
          </div>
        </div>

        <!-- DEDICATED TOPIC PDF UPLOAD CARD -->
        <div class="card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 78, 59, 0.22)); border: 1.5px solid #10b981; border-radius: 12px; padding: 16px 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.8rem;">📥</span>
              <div>
                <div style="font-weight: 900; font-size: 1rem; color: #34d399; display: flex; align-items: center; gap: 8px;">
                  <span>આ વિષય માટે તૈયાર થયેલી PDF સ્લાઇડ્સ અપલોડ કરો</span>
                </div>
                <div style="font-size: 0.8rem; color: #a7f3d0; margin-top: 3px;">
                  NotebookLM અથવા Canva માંથી ડાઉનલોડ કરેલ પ્રેઝન્ટેશન PDF સીધી અહીં અપલોડ કરો!
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <input type="file" id="input-slideprompt-pdf" accept=".pdf,.pptx,.ppt" style="display: none;" />
              <button id="btn-trigger-slideprompt-pdf" type="button" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: 800; padding: 9px 20px; border-radius: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.4); display: inline-flex; align-items: center; gap: 8px; cursor: pointer;">
                <span>📄</span> <span>PDF અપલોડ કરો (Upload PDF)</span>
              </button>
              <button id="btn-load-anganwadi-sample-slides" class="btn btn-sm" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; font-weight: 900; border: none; padding: 9px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" title="આંગણવાડી હાઇકોર્ટ ચુકાદાની અસલ ૯ સ્લાઇડ્સ લોડ કરો">
                <span>🌟</span> <span>આંગણવાડી હાઇકોર્ટ (૯ સ્લાઇડ્સ - અસલ નમૂનો)</span>
              </button>
            </div>
          </div>

          ${(curProj?.slide?.importedPresentation && (curProj.slide.importedPresentation.filename || curProj.slide.importedPresentation.fileUrl)) ? `
            <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 10px; padding: 12px 16px; margin-top: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 10px; color: #ffffff;">
                <span style="color: #34d399; font-size: 1.3rem;">✓</span>
                <div>
                  <div style="font-weight: 800; font-size: 0.92rem; color: #ffffff;">
                    સફળતાપૂર્વક જોડાયેલ PDF: <strong style="color: #34d399;">${curProj.slide.importedPresentation.filename}</strong> (${curProj.slide.importedPresentation.slidesCount || curProj.slide?.slides?.length || 0} સ્લાઇડ્સ)
                  </div>
                  <div style="font-size: 0.76rem; color: #94a3b8; margin-top: 2px;">
                    વિષય: <strong>${activeTopic}</strong> • અપલોડ: ${new Date(curProj.slide.importedPresentation.uploadedAt || Date.now()).toLocaleTimeString('gu-IN')}
                  </div>
                </div>
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button id="btn-goto-script-from-prompt" type="button" class="btn btn-sm" style="background: #3b82f6; color: #fff; font-weight: 800; border: none; padding: 7px 16px; border-radius: 6px; cursor: pointer;">
                  📝 ૫. Script જુઓ ➔
                </button>
                <button id="btn-goto-video-from-prompt" type="button" class="btn btn-sm" style="background: #8b5cf6; color: #fff; font-weight: 800; border: none; padding: 7px 16px; border-radius: 6px; cursor: pointer;">
                  🎬 ૬. Video Editor ખોલો ➔
                </button>
              </div>
            </div>
          ` : ''}
        </div>

      </div>

      <!-- ========================================================================= -->
      <!-- PASTE / IMPORT FROM NOTEBOOKLM OR CHATGPT MODAL (COLLAPSIBLE / DRAWER) -->
      <!-- ========================================================================= -->
      <div id="paste-notebooklm-modal" style="display: ${showPasteModal ? 'block' : 'none'}; background: linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98)); border: 2px solid #8b5cf6; border-radius: 14px; padding: 20px; margin-bottom: 22px; box-shadow: 0 10px 35px rgba(139,92,246,0.3);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.4rem;">📥</span>
            <div>
              <h3 style="margin: 0; color: #ffffff; font-size: 1.1rem; font-weight: 900;">
                NotebookLM અથવા ChatGPT માંથી તૈયાર થયેલું લખાણ પેસ્ટ કરો
              </h3>
              <p style="margin: 2px 0 0 0; color: #cbd5e1; font-size: 0.8rem;">
                તમે NotebookLM કે ChatGPT માં જે સ્લાઇડ્સ બનાવી હોય તે સીધી અહીં પેસ્ટ કરો — સિસ્ટમ આપમેળે તમામ સ્લાઇડ્સ બનાવી દેશે!
              </p>
            </div>
          </div>
          <button id="btn-close-paste-modal" type="button" class="btn btn-xs btn-outline" style="border-color: rgba(255,255,255,0.3); color: #fff; padding: 4px 10px;">
            ✖ બંધ કરો
          </button>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;">
          <button type="button" id="btn-load-sample-notebooklm" class="btn btn-xs" style="background: rgba(139,92,246,0.2); border: 1px solid #8b5cf6; color: #c4b5fd; font-weight: 700; padding: 4px 10px;">
            📑 NotebookLM સેમ્પલ ફોર્મેટ જુઓ
          </button>
          <button type="button" id="btn-load-sample-chatgpt" class="btn btn-xs" style="background: rgba(16,185,129,0.2); border: 1px solid #10b981; color: #6ee7b7; font-weight: 700; padding: 4px 10px;">
            📑 ChatGPT સેમ્પલ ફોર્મેટ જુઓ
          </button>
        </div>

        <textarea id="textarea-paste-notebooklm-raw" rows="6" class="form-textarea font-gu" placeholder="NotebookLM માંથી આવેલું લખાણ (Slide 1: ... , • પોઇન્ટ્સ ...) અહીં પેસ્ટ કરો..." style="width: 100%; box-sizing: border-box; background: #07090e; border: 1.5px solid rgba(139,92,246,0.4); color: #fff; padding: 12px; border-radius: 8px; font-size: 0.88rem; line-height: 1.5; resize: vertical;"></textarea>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; flex-wrap: wrap; gap: 10px;">
          <span style="font-size: 0.76rem; color: #a78bfa; font-weight: 700;">
            ✓ સ્લાઇડ ટાઇટલ, સબટાઇટલ અને બુલેટ પોઇન્ટ્સ ઓટોમેટિક અલગ થઈ જશે
          </span>
          <button type="button" id="btn-execute-import-pasted-slides" class="btn" style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; font-weight: 900; border: none; padding: 9px 24px; border-radius: 8px; box-shadow: 0 4px 14px rgba(139,92,246,0.4); cursor: pointer;">
            🚀 આ લખાણ પરથી સ્લાઇડ્સ બનાવો (Import Slides)
          </button>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- SECTION 3: COLLAPSIBLE SLIDE PREVIEW & PNG EXPORT (OPTIONAL SLIDE VIEWER) -->
      <!-- ========================================================================= -->
      <details class="card" style="background: rgba(15, 23, 42, 0.75); border: 1.5px solid rgba(255, 255, 255, 0.12); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
        <summary style="font-weight: 800; font-size: 0.95rem; color: #38bdf8; cursor: pointer; display: flex; align-items: center; justify-content: space-between; user-select: none;">
          <span style="display: flex; align-items: center; gap: 8px;">
            <span>🖼️</span>
            <span>સ્લાઇડ પ્રીવ્યૂ & ૧૦૮૦p PNG ડાઉનલોડ (૧૬:૯ શુદ્ધ સફેદ સ્લાઇડ્સ & વાસ્તવિક ફોટા)</span>
          </span>
          <span style="font-size: 0.76rem; color: #94a3b8;">ક્લિક કરી જુઓ ▼</span>
        </summary>

        <div style="margin-top: 18px;">
          
          <!-- Header Strip above Canvas -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="badge" style="background: #2563eb; color: #ffffff; font-weight: 900; font-size: 0.78rem; padding: 4px 10px; border-radius: 6px;">
                ૧૬:૯ WIDESCREEN
              </span>
              <span class="badge" style="background: #ffffff; color: #0f172a; font-weight: 800; font-size: 0.78rem; padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1;">
                ૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ
              </span>
              <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-weight: 800; font-size: 0.78rem; padding: 4px 10px; border-radius: 6px; border: 1px solid #10b981;">
                વાસ્તવિક ફોટોગ્રાફી
              </span>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <button id="btn-toggle-layout-mode" class="btn btn-sm btn-outline" style="border-color: #38bdf8; color: #38bdf8; font-weight: 700; padding: 7px 14px; border-radius: 6px; cursor: pointer;" title="લેઆઉટ બદલો (ડ્યુઅલ ફોટો vs કી પોઇન્ટ્સ)">
                <span>🔄</span> ${isCardsLayout ? '🖼️ ફોટો લેઆઉટ કરો' : '📋 ૩ કાર્ડ્સ લેઆઉટ કરો'}
              </button>
              <button id="btn-download-slide-png" class="btn btn-sm" style="background: #0284c7; color: #ffffff; font-weight: 800; border: none; padding: 7px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" title="આ સ્લાઇડ 1080p Full HD PNG માં ડાઉનલોડ કરો">
                <span>⬇️</span> <span>સ્લાઇડ ડાઉનલોડ (PNG)</span>
              </button>
              <button id="btn-regenerate-slides-from-topic" class="btn btn-sm btn-outline" style="border-color: #64748b; color: #cbd5e1; font-weight: 700; padding: 7px 14px; border-radius: 6px; cursor: pointer;">
                <span>🔄</span> નવી સ્લાઇડ્સ આપમેળે બનાવો
              </button>
            </div>
          </div>

          <!-- THE 16:9 PURE WHITE SLIDE CANVAS PREVIEW -->
          <div id="slide-preview-169-canvas" style="width: 100%; max-width: 960px; min-height: 540px; aspect-ratio: 16/9; background: #ffffff; border: 2.5px solid #cbd5e1; border-radius: 12px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative; box-shadow: 0 16px 45px rgba(0,0,0,0.35); font-family: 'Noto Sans Gujarati', system-ui, sans-serif; overflow: hidden; margin: 0 auto 18px auto;">
            
            ${curSlide.imageUrl ? `
              <div style="width: 100%; height: 100%; position: relative; overflow: hidden; background: #ffffff; display: flex; align-items: center; justify-content: center;">
                <img src="${curSlide.imageUrl}" alt="${curSlide.title}" style="width: 100%; height: 100%; object-fit: contain; display: block; background: #ffffff;" />
                <div style="position: absolute; bottom: 8px; left: 12px; background: rgba(15,23,42,0.85); color: #93c5fd; padding: 4px 10px; border-radius: 6px; font-size: 0.72rem; font-weight: 800; backdrop-filter: blur(4px); border: 1px solid rgba(147,197,253,0.3);">
                  📑 અસલ ૧૬:૯ સ્લાઇડ #${curSlide.slideNumber || (activeSlideIdx + 1)} • ${curSlide.title}
                </div>
              </div>
            ` : `
              <!-- Slide Top: Dark Navy Heading Banner -->
              <div>
                <div style="background: #0f172a; border-left: 6px solid #2563eb; border-bottom: 3.5px solid #2563eb; padding: 14px 22px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 14px rgba(15,23,42,0.25);">
                  <h3 style="color: #ffffff; margin: 0; font-size: 1.32rem; font-weight: 900; line-height: 1.35; letter-spacing: 0.2px;">
                    ${curSlide.title}
                  </h3>
                  <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <span style="background: rgba(255,255,255,0.12); color: #93c5fd; font-size: 0.78rem; font-weight: 800; padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(147, 197, 253, 0.3);">
                      Gyan Yatra
                    </span>
                    <span style="background: #2563eb; color: #ffffff; font-weight: 900; font-size: 0.76rem; padding: 3px 10px; border-radius: 4px; letter-spacing: 0.5px;">
                      સ્લાઇડ #${curSlide.slideNumber || (activeSlideIdx + 1)}
                    </span>
                  </div>
                </div>

                ${curSlide.subtitle ? `
                  <div style="background: #f1f5f9; border-left: 6px solid #2563eb; padding: 6px 20px; font-size: 0.86rem; font-weight: 700; color: #334155; display: flex; align-items: center; justify-content: space-between;">
                    <span>${curSlide.subtitle}</span>
                    <span style="font-size: 0.72rem; color: #16a34a; font-weight: 800;">✓ સત્તાવાર વિશ્લેષણ</span>
                  </div>
                ` : ''}

                <!-- Slide Content: Rich Layout Selection -->
                ${curSlide.layoutType === 'comparison' ? `
                  <!-- Layout: Old vs New Salary Comparison Cards (Page 4 Style) -->
                  <div style="padding: 16px 24px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: stretch; margin-top: 6px;">
                      <!-- Left: Old Salary Card (Strikethrough in red) -->
                      <div style="background: #fff5f5; border: 2px solid #fca5a5; border-radius: 10px; padding: 18px 20px; box-shadow: 0 4px 14px rgba(239,68,68,0.08); display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                          <div style="display: inline-block; background: #fee2e2; color: #b91c1c; font-size: 0.78rem; font-weight: 900; padding: 3px 10px; border-radius: 4px; border: 1px solid #fca5a5; margin-bottom: 10px;">
                            ${curSlide.comparison?.oldTitle || 'જૂનું માનદ વેતન (માસિક)'}
                          </div>
                          <div style="margin: 8px 0;">
                            <del style="color: #ef4444; font-size: 2.8rem; font-weight: 900; text-decoration: line-through; text-decoration-thickness: 3.5px; font-family: 'Noto Sans Gujarati', sans-serif;">
                              ${curSlide.comparison?.oldAmount || '₹૧૦,૦૦૦'}
                            </del>
                          </div>
                          <p style="color: #64748b; font-size: 0.88rem; font-weight: 700; margin: 6px 0 0 0; line-height: 1.4;">
                            ${curSlide.comparison?.oldDesc || 'સરકાર દ્વારા આપવામાં આવતું માસિક માનદ વેતન'}
                          </p>
                        </div>
                        <div style="margin-top: 14px; font-size: 0.76rem; color: #dc2626; font-weight: 800; border-top: 1px dashed #fca5a5; padding-top: 8px;">
                          ✕ અપૂરતું અને જૂનું વેતન ધોરણ
                        </div>
                      </div>

                      <!-- Right: New Salary Card (Massive Bold Orange Text) -->
                      <div style="background: #fffbeb; border: 2.5px solid #ea580c; border-radius: 10px; padding: 18px 20px; box-shadow: 0 8px 25px rgba(234,88,12,0.18); display: flex; flex-direction: column; justify-content: space-between; transform: scale(1.02);">
                        <div>
                          <div style="display: inline-block; background: #ffedd5; color: #c2410c; font-size: 0.78rem; font-weight: 900; padding: 3px 10px; border-radius: 4px; border: 1px solid #fdba74; margin-bottom: 10px;">
                            ${curSlide.comparison?.newTitle || 'નવો પગાર (હાઇકોર્ટ આદેશ)'}
                          </div>
                          <div style="margin: 4px 0;">
                            <span style="color: #ea580c; font-size: 3.4rem; font-weight: 900; line-height: 1.1; font-family: 'Noto Sans Gujarati', sans-serif; letter-spacing: -0.5px;">
                              ${curSlide.comparison?.newAmount || '₹૨૪,૮૦૦'}
                            </span>
                          </div>
                          <p style="color: #334155; font-size: 0.92rem; font-weight: 800; margin: 6px 0 0 0; line-height: 1.4;">
                            ${curSlide.comparison?.newDesc || 'લઘુતમ વેતન ધારા હેઠળ નિર્ધારિત પગાર દર'}
                          </p>
                        </div>
                        <div style="margin-top: 14px; font-size: 0.8rem; color: #16a34a; font-weight: 900; border-top: 1px solid #fed7aa; padding-top: 8px; display: flex; align-items: center; justify-content: space-between;">
                          <span>✓ હાઇકોર્ટ LPA 363/2025 આદેશ</span>
                          <span style="background: #16a34a; color: #fff; font-size: 0.72rem; padding: 2px 8px; border-radius: 4px;">મંજૂર</span>
                        </div>
                      </div>
                    </div>

                    <!-- Bottom Highlight Banner -->
                    <div style="margin-top: 14px; background: linear-gradient(135deg, #0f172a, #1e293b); border: 2px solid #10b981; border-radius: 8px; padding: 10px 18px; display: flex; align-items: center; justify-content: space-between;">
                      <span style="color: #34d399; font-weight: 900; font-size: 1.05rem;">
                        ⚡ ${curSlide.comparison?.diffNote || 'સીધો માસિક ₹૧૪,૮૦૦ નો ઐતિહાસિક વધારો!'}
                      </span>
                      <span style="background: #10b981; color: #000; font-size: 0.74rem; font-weight: 900; padding: 3px 8px; border-radius: 4px;">
                        કાયમી કર્મચારી સમકક્ષ હક
                      </span>
                    </div>
                  </div>
                ` : (curSlide.layoutType === 'formula' ? `
                  <!-- Layout: Formula Calculation Equation (Page 5 Style) -->
                  <div style="padding: 16px 24px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: nowrap; margin: 10px 0;">
                      
                      <!-- Block 1: Navy Base Amount -->
                      <div style="flex: 1; max-width: 250px; background: #0f172a; border: 2px solid #2563eb; border-radius: 10px; padding: 16px 14px; text-align: center; color: #ffffff; box-shadow: 0 6px 18px rgba(15,23,42,0.2);">
                        <div style="font-size: 0.78rem; font-weight: 800; color: #93c5fd; margin-bottom: 6px;">
                          ${curSlide.formula?.block1?.title || 'મૂળ માનદ વેતન'}
                        </div>
                        <div style="font-size: 2.1rem; font-weight: 900; color: #ffffff; font-family: 'Noto Sans Gujarati', sans-serif;">
                          ${curSlide.formula?.block1?.amount || '₹૧૦,૦૦૦'}
                        </div>
                        <div style="font-size: 0.72rem; color: #cbd5e1; margin-top: 4px;">
                          ${curSlide.formula?.block1?.desc || 'હાલનું બેઝિક માનદ વેતન'}
                        </div>
                      </div>

                      <!-- Plus Operator -->
                      <div style="width: 44px; height: 44px; border-radius: 50%; background: #ea580c; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 900; flex-shrink: 0; box-shadow: 0 4px 12px rgba(234,88,12,0.3);">
                        +
                      </div>

                      <!-- Block 2: Orange Difference Amount -->
                      <div style="flex: 1; max-width: 250px; background: #c2410c; border: 2px solid #f97316; border-radius: 10px; padding: 16px 14px; text-align: center; color: #ffffff; box-shadow: 0 6px 18px rgba(194,65,12,0.25);">
                        <div style="font-size: 0.78rem; font-weight: 800; color: #fed7aa; margin-bottom: 6px;">
                          ${curSlide.formula?.block2?.title || 'લઘુતમ વેતન તફાવત'}
                        </div>
                        <div style="font-size: 2.1rem; font-weight: 900; color: #ffffff; font-family: 'Noto Sans Gujarati', sans-serif;">
                          ${curSlide.formula?.block2?.amount || '₹૧૪,૮૦૦'}
                        </div>
                        <div style="font-size: 0.72rem; color: #ffedd5; margin-top: 4px;">
                          ${curSlide.formula?.block2?.desc || 'હાઇકોર્ટ નિર્દેશિત તફાવત'}
                        </div>
                      </div>

                      <!-- Equals Operator -->
                      <div style="width: 44px; height: 44px; border-radius: 50%; background: #16a34a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 900; flex-shrink: 0; box-shadow: 0 4px 12px rgba(22,163,74,0.3);">
                        =
                      </div>

                      <!-- Block 3: Emerald Total Amount -->
                      <div style="flex: 1; max-width: 260px; background: #15803d; border: 2.5px solid #4ade80; border-radius: 10px; padding: 16px 14px; text-align: center; color: #ffffff; box-shadow: 0 8px 24px rgba(21,128,61,0.3); transform: scale(1.03);">
                        <div style="font-size: 0.78rem; font-weight: 800; color: #bbf7d0; margin-bottom: 6px;">
                          ${curSlide.formula?.block3?.title || 'કુલ માસિક વેતન'}
                        </div>
                        <div style="font-size: 2.3rem; font-weight: 900; color: #ffffff; font-family: 'Noto Sans Gujarati', sans-serif;">
                          ${curSlide.formula?.block3?.amount || '₹૨૪,૮૦૦'}
                        </div>
                        <div style="font-size: 0.74rem; color: #dcfce7; font-weight: 800; margin-top: 4px;">
                          ${curSlide.formula?.block3?.desc || 'ચૂકવવાપાત્ર લઘુતમ વેતન'}
                        </div>
                      </div>

                    </div>

                    <!-- Explanatory Details Box -->
                    <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-left: 6px solid #2563eb; border-radius: 8px; padding: 12px 18px; margin-top: 14px; box-shadow: 0 3px 10px rgba(0,0,0,0.04);">
                      <div style="font-size: 0.88rem; font-weight: 800; color: #0f172a; line-height: 1.5;">
                        ⚖️ હાઇકોર્ટ ડિવિઝન બેંચ ગણતરી: આંગણવાડી કાર્યકરો કાયમી વર્ગ-૩ અને વર્ગ-૪ ની સમકક્ષ કામગીરી કરતા હોવાથી તેમને લઘુતમ વેતન ધારા હેઠળ માસિક ₹૨૪,૮૦૦ મળવાપાત્ર થાય છે.
                      </div>
                    </div>
                  </div>
                ` : (curSlide.layoutType === 'timeline' ? `
                  <!-- Layout: Horizontal Timeline Milestones (Page 6 Style) -->
                  <div style="padding: 16px 24px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="display: flex; align-items: stretch; justify-content: space-between; gap: 12px; margin: 10px 0;">
                      
                      <!-- Step 1 -->
                      <div style="flex: 1; background: #ffffff; border: 1.5px solid #cbd5e1; border-top: 6px solid #2563eb; border-radius: 8px; padding: 16px 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                          <span style="background: #eff6ff; color: #1d4ed8; font-size: 0.74rem; font-weight: 900; padding: 3px 8px; border-radius: 4px; border: 1px solid #bfdbfe;">
                            પગલું ૧
                          </span>
                          <div style="font-size: 1.25rem; font-weight: 900; color: #1e3a8a; margin: 8px 0 4px 0;">
                            ૧ એપ્રિલ ૨૦૨૫
                          </div>
                          <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
                            નવા પગારનો અમલ
                          </div>
                          <div style="font-size: 0.82rem; color: #475569; line-height: 1.4;">
                            આ તારીખથી નવું લઘુતમ વેતન ધોરણ લાગુ કરવાનો હાઇકોર્ટનો સ્પષ્ટ આદેશ
                          </div>
                        </div>
                        <div style="margin-top: 10px; font-size: 0.74rem; color: #2563eb; font-weight: 800;">
                          ✓ સત્તાવાર અમલીકરણ મુદત
                        </div>
                      </div>

                      <!-- Chevron Arrow 1 -->
                      <div style="display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #ea580c; font-weight: 900;">
                        ➔
                      </div>

                      <!-- Step 2 -->
                      <div style="flex: 1; background: #ffffff; border: 1.5px solid #cbd5e1; border-top: 6px solid #ea580c; border-radius: 8px; padding: 16px 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                          <span style="background: #fff7ed; color: #c2410c; font-size: 0.74rem; font-weight: 900; padding: 3px 8px; border-radius: 4px; border: 1px solid #fed7aa;">
                            પગલું ૨
                          </span>
                          <div style="font-size: 1.25rem; font-weight: 900; color: #c2410c; margin: 8px 0 4px 0;">
                            ૬ મહિનાનો સમય
                          </div>
                          <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
                            નીતિ નિયમો ઘડતર
                          </div>
                          <div style="font-size: 0.82rem; color: #475569; line-height: 1.4;">
                            રાજ્ય સરકાર દ્વારા વહીવટી અને બજેટ જોગવાઈ પૂર્ણ કરવા માટે અપાયેલી મુદત
                          </div>
                        </div>
                        <div style="margin-top: 10px; font-size: 0.74rem; color: #ea580c; font-weight: 800;">
                          ✓ સરકાર માટે સમયગાળો
                        </div>
                      </div>

                      <!-- Chevron Arrow 2 -->
                      <div style="display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #16a34a; font-weight: 900;">
                        ➔
                      </div>

                      <!-- Step 3 -->
                      <div style="flex: 1; background: #ffffff; border: 1.5px solid #cbd5e1; border-top: 6px solid #16a34a; border-radius: 8px; padding: 16px 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                          <span style="background: #f0fdf4; color: #15803d; font-size: 0.74rem; font-weight: 900; padding: 3px 8px; border-radius: 4px; border: 1px solid #bbf7d0;">
                            પગલું ૩
                          </span>
                          <div style="font-size: 1.25rem; font-weight: 900; color: #15803d; margin: 8px 0 4px 0;">
                            એરિયર્સ ચૂકવણી
                          </div>
                          <div style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
                            તમામ બાકી રકમ જમા
                          </div>
                          <div style="font-size: 0.82rem; color: #475569; line-height: 1.4;">
                            મુદત પૂર્ણ થયે પાછલી બાકી નીકળતી એરિયર્સ રકમ સીધી બેંક ખાતામાં જમા
                          </div>
                        </div>
                        <div style="margin-top: 10px; font-size: 0.74rem; color: #16a34a; font-weight: 800;">
                          ✓ સીધા બેંક ખાતામાં ચૂકવણી
                        </div>
                      </div>

                    </div>

                    <!-- Bottom Note -->
                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 16px; display: flex; align-items: center; justify-content: space-between;">
                      <span style="color: #334155; font-size: 0.82rem; font-weight: 700;">
                        ⏱️ હાઇકોર્ટ ડિવિઝન બેંચ (LPA 363/2025) દ્વારા નિર્ધારિત સત્તાવાર સમયમર્યાદા
                      </span>
                      <span style="color: #16a34a; font-size: 0.78rem; font-weight: 900;">
                        ✓ સમયબદ્ધ અમલીકરણ
                      </span>
                    </div>
                  </div>
                ` : (isCardsLayout ? `
                  <!-- Layout B: 3 Info / Stat Cards (NotebookLM Key Takeaways Style) -->
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; padding: 18px 22px;">
                    ${bullets.slice(0, 3).map((pt, bIdx) => `
                      <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-top: 5px solid ${bIdx === 0 ? '#2563eb' : (bIdx === 1 ? '#10b981' : '#f59e0b')}; border-radius: 8px; padding: 16px 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; min-height: 180px;">
                        <div>
                          <div style="font-size: 0.76rem; font-weight: 800; color: #64748b; margin-bottom: 6px;">
                            મુદ્દો #${bIdx + 1}
                          </div>
                          <div style="font-size: 1.05rem; font-weight: 800; color: #0f172a; line-height: 1.5;">
                            ${pt.replace(/^[•\-\*0-9\.\)]+\s*/, '')}
                          </div>
                        </div>
                        <div style="margin-top: 10px; font-size: 0.74rem; color: #16a34a; font-weight: 800;">
                          ✓ સત્તાવાર નિયમ
                        </div>
                      </div>
                    `).join('')}
                  </div>
                ` : `
                  <!-- Layout A: Dual-Pane (Real Photograph on Left, 3 Bold Cards on Right) -->
                  <div style="display: grid; grid-template-columns: 46% 1fr; gap: 18px; padding: 18px 22px; align-items: stretch;">
                    
                    <!-- Left Column: Realistic Photograph Card Frame -->
                    <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 14px rgba(0,0,0,0.06); min-height: 290px;">
                      <!-- Top Badge -->
                      <div style="background: #0f172a; color: #ffffff; padding: 6px 12px; display: flex; align-items: center; justify-content: space-between; font-size: 0.76rem; font-weight: 800;">
                        <span>${curPhotoPreset.badge}</span>
                        <span style="color: #38bdf8; font-size: 0.72rem;">✓ અસલી વાસ્તવિક ફોટો</span>
                      </div>

                      <!-- Visual Body -->
                      <div style="flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #e2e8f0; position: relative; min-height: 210px;">
                        ${photoVisualHtml}
                      </div>

                      <!-- Caption -->
                      <div style="background: #0f172a; color: #f8fafc; font-size: 0.74rem; font-weight: 700; padding: 6px 12px; text-align: center; border-top: 1px solid #1e293b; line-height: 1.3;">
                        ${curSlide.photoCaption || curPhotoPreset.desc}
                      </div>
                    </div>

                    <!-- Right Column: 3 Distinct White Cards with Royal Blue Accent -->
                    <div style="display: flex; flex-direction: column; justify-content: center; gap: 12px;">
                      ${bullets.slice(0, 3).map((pt, bIdx) => `
                        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-left: 6px solid #2563eb; border-radius: 8px; padding: 13px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; align-items: flex-start; gap: 12px;">
                          <span style="background: #eff6ff; color: #1d4ed8; font-weight: 900; font-size: 0.86rem; padding: 3px 9px; border-radius: 4px; flex-shrink: 0; line-height: 1.4; border: 1px solid #bfdbfe;">
                            ${bIdx + 1}
                          </span>
                          <div style="font-size: 1.05rem; font-weight: 800; color: #0f172a; line-height: 1.52; flex: 1;">
                            ${pt.replace(/^[•\-\*0-9\.\)]+\s*/, '')}
                          </div>
                        </div>
                      `).join('')}
                    </div>

                  </div>
                `)))}
              </div>
            `}

            <!-- Slide Footer Strip -->
            <div style="background: #0f172a; color: #94a3b8; padding: 9px 22px; display: flex; align-items: center; justify-content: space-between; font-size: 0.76rem; font-weight: 700; border-top: 1px solid #1e293b;">
              <span style="color: #cbd5e1;">📢 મુખ્ય જાહેરાત & સત્તાવાર પરિપત્ર: <strong style="color: #ffffff;">${curProj?.name || activeTopic}</strong> • સત્તાવાર સરકારી માહિતી</span>
              <span style="color: #38bdf8;">✓ 1080p Full HD • શુદ્ધ સફેદ સ્લાઇડ • વાસ્તવિક ફોટો (${activeSlideIdx + 1} / ${slidesList.length})</span>
            </div>

          </div>

          <!-- Slide Thumbnails & Carousel Selector Strip -->
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
            <button id="btn-studio-prev-slide" class="btn btn-outline btn-sm" ${activeSlideIdx === 0 ? 'disabled style="opacity:0.4;"' : ''} style="color: #ffffff; border-color: rgba(255,255,255,0.3); font-weight: 800;">
              ← અગાઉની સ્લાઇડ
            </button>

            ${slidesList.map((sl, sIdx) => `
              <button class="btn btn-sm btn-studio-thumb-nav ${sIdx === activeSlideIdx ? 'btn-primary' : 'btn-outline'}" data-slide-idx="${sIdx}" style="padding: 6px 14px; font-weight: 800; border-radius: 8px; ${sIdx === activeSlideIdx ? 'background: #2563eb; color: #fff; border: 2px solid #60a5fa;' : 'border-color: rgba(255,255,255,0.25); color: #cbd5e1;'}">
                ${sIdx + 1}
              </button>
            `).join('')}

            <button id="btn-studio-next-slide" class="btn btn-outline btn-sm" ${activeSlideIdx === slidesList.length - 1 ? 'disabled style="opacity:0.4;"' : ''} style="color: #ffffff; border-color: rgba(255,255,255,0.3); font-weight: 800;">
              આગળની સ્લાઇડ →
            </button>

            <button id="btn-studio-add-slide" class="btn btn-sm" style="background: rgba(16, 185, 129, 0.2); border: 1.5px solid #10b981; color: #6ee7b7; font-weight: 800; padding: 6px 12px; border-radius: 8px;" title="નવી સ્લાઇડ ઉમેરો">
              + નવી સ્લાઇડ
            </button>

            ${slidesList.length > 3 ? `
              <button id="btn-studio-delete-slide" class="btn btn-sm" style="background: rgba(239, 68, 68, 0.2); border: 1.5px solid #ef4444; color: #fca5a5; font-weight: 800; padding: 6px 12px; border-radius: 8px;" title="આ સ્લાઇડ ડિલીટ કરો">
                🗑️ ડિલીટ
              </button>
            ` : ''}
          </div>

          <!-- ACTIVE SLIDE EDITOR & REALISTIC PHOTO SELECTOR -->
          <div style="background: #0f172a; border: 1.5px solid #1e293b; border-radius: 12px; padding: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); margin-bottom: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.4rem;">✏️</span>
                <div>
                  <h4 style="margin: 0; color: #ffffff; font-size: 1.05rem; font-weight: 900;">
                    સ્લાઇડ #${activeSlideIdx + 1} લખાણ & વાસ્તવિક ફોટો એડિટર
                  </h4>
                  <p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 0.78rem;">
                    અહીંથી સ્લાઇડનું લખાણ બદલો — ઉપર ૧૬:૯ સ્લાઇડમાં તરત જ લાઈવ બદલાશે!
                  </p>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 8px;">
                <span id="save-status-text" style="color: #34d399; font-size: 0.8rem; font-weight: 800;"></span>
                <button id="btn-save-current-slide" class="btn btn-sm btn-success" style="background: #10b981; border: none; font-weight: 800; padding: 7px 16px; border-radius: 6px;">
                  💾 સાચવો
                </button>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start;">
              <!-- Left Editor: Title & Bullets -->
              <div>
                <div style="margin-bottom: 12px;">
                  <label style="display: block; font-size: 0.8rem; font-weight: 800; color: #93c5fd; margin-bottom: 4px;">
                    📌 સ્લાઇડ મુખ્ય ટાઇટલ (Dark Navy Banner Title):
                  </label>
                  <input type="text" id="input-edit-slide-title" class="form-input font-gu" value="${curSlide.title || ''}" placeholder="સ્લાઇડ ટાઇટલ..." style="width: 100%; box-sizing: border-box; background: #07090e; border: 1.5px solid rgba(255,255,255,0.15); color: #fff; padding: 10px 12px; border-radius: 6px; font-weight: 800; font-size: 0.95rem;">
                </div>

                <div style="margin-bottom: 12px;">
                  <label style="display: block; font-size: 0.8rem; font-weight: 800; color: #cbd5e1; margin-bottom: 4px;">
                    📎 સબ-ટાઇટલ (Subtitle / Tagline):
                  </label>
                  <input type="text" id="input-edit-slide-subtitle" class="form-input font-gu" value="${curSlide.subtitle || ''}" placeholder="સબટાઇટલ..." style="width: 100%; box-sizing: border-box; background: #07090e; border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 0.88rem;">
                </div>

                <div style="margin-bottom: 12px;">
                  <label style="display: block; font-size: 0.8rem; font-weight: 800; color: #93c5fd; margin-bottom: 4px;">
                    📋 ૩ મુદ્દાઓ (૧, ૨, ૩ કાર્ડ્સ માટે - દર લીટીએ એક મુદ્દો):
                  </label>
                  <textarea id="textarea-edit-slide-bullets" rows="4" class="form-textarea font-gu" placeholder="૧. પહેલો મહત્વનો મુદ્દો...&#10;૨. બીજો મુદ્દો...&#10;૩. ત્રીજો મુદ્દો..." style="width: 100%; box-sizing: border-box; background: #07090e; border: 1.5px solid rgba(255,255,255,0.15); color: #fff; padding: 10px 12px; border-radius: 6px; font-size: 0.88rem; line-height: 1.5; resize: vertical;">${(curSlide.bulletPoints || []).join('\n')}</textarea>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.04); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
                  <span style="font-size: 0.78rem; font-weight: 700; color: #cbd5e1;">લેઆઉટ શૈલી:</span>
                  <select id="select-slide-layout-type" class="form-select" style="background: #07090e; border: 1px solid #3b82f6; color: #fff; padding: 5px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 800;">
                    <option value="split" ${curSlide.layoutType === 'split' ? 'selected' : ''}>🖼️ વાસ્તવિક ફોટો + ૩ કાર્ડ્સ</option>
                    <option value="comparison" ${curSlide.layoutType === 'comparison' ? 'selected' : ''}>📊 જૂનો vs નવો પગાર સરખામણી</option>
                    <option value="formula" ${curSlide.layoutType === 'formula' ? 'selected' : ''}>➕ પગાર ગણતરી ફોર્મ્યુલા</option>
                    <option value="timeline" ${curSlide.layoutType === 'timeline' ? 'selected' : ''}>⏱️ હોરિઝોન્ટલ ટાઇમલાઇન</option>
                    <option value="cards" ${curSlide.layoutType === 'cards' ? 'selected' : ''}>📋 કી પોઇન્ટ્સ ૩ કાર્ડ્સ</option>
                  </select>
                </div>
              </div>

              <!-- Right Editor: Realistic Photo Selector & Upload -->
              <div>
                <label style="display: block; font-size: 0.8rem; font-weight: 800; color: #38bdf8; margin-bottom: 6px;">
                  🖼️ વાસ્તવિક સરકારી ફોટો પ્રીસેટ્સ (શૂન્ય કાર્ટૂન • શૂન્ય ઇમોજી):
                </label>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; max-height: 180px; overflow-y: auto; background: #07090e; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 12px;">
                  ${REALISTIC_PHOTO_PRESETS.map(p => `
                    <button type="button" class="btn btn-xs btn-preset-photo ${p.id === curSlide.photoType ? 'btn-primary' : 'btn-outline'}" data-preset-id="${p.id}" style="padding: 6px 8px; font-size: 0.74rem; font-weight: 800; border-radius: 6px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${p.id === curSlide.photoType ? 'background: #2563eb; color: #fff; border-color: #60a5fa;' : 'border-color: rgba(255,255,255,0.18); color: #cbd5e1;'}">
                      ${p.badge}
                    </button>
                  `).join('')}
                </div>

                <!-- Custom Image Upload or URL -->
                <div style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px; padding: 10px 12px;">
                  <div style="font-size: 0.76rem; font-weight: 800; color: #cbd5e1; margin-bottom: 6px;">
                    અથવા તમારો પોતાનો અસલ ફોટો જોડો:
                  </div>
                  <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <label class="btn btn-xs" style="background: rgba(56,189,248,0.2); border: 1px solid #38bdf8; color: #7dd3fc; font-weight: 800; padding: 5px 10px; border-radius: 6px; cursor: pointer;">
                      📁 ફાઇલ પસંદ કરો
                      <input type="file" id="input-slide-custom-image-file" accept="image/*" style="display: none;" />
                    </label>
                    <input type="text" id="input-slide-custom-image-url" placeholder="અથવા Image URL પેસ્ટ કરો..." value="${curSlide.imageUrl || ''}" style="flex: 1; min-width: 150px; background: #07090e; border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 0.76rem; padding: 5px 8px; border-radius: 6px;">
                    <button type="button" id="btn-apply-custom-image-url" class="btn btn-xs btn-primary" style="padding: 5px 10px;">
                      લાગુ કરો
                    </button>
                  </div>
                  ${curSlide.imageUrl ? `
                    <div style="margin-top: 6px; font-size: 0.72rem; color: #34d399; font-weight: 700;">
                      ✓ કસ્ટમ ફોટો જોડાયેલ છે (${curSlide.imageUrl.substring(0, 40)}...)
                    </div>
                  ` : ''}
                </div>

              </div>
            </div>
          </div>

        </div>
      </details>

      <!-- CONNECTED WORKFLOW STEPPER BAR (TOOLS 1 TO 7 JOODAN) -->
      <div class="card workspace-bottom-stepper" style="background: rgba(15, 23, 42, 0.95); border: 1.5px solid rgba(16, 185, 129, 0.35); border-radius: 12px; padding: 14px 20px; margin-top: 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.4rem;">🔗</span>
          <div>
            <div style="font-size: 0.78rem; color: #6ee7b7; font-weight: 700;">
              વિડીયો વર્કફ્લો જોડાણ: <strong>પગલું ૪ / ૭</strong>
            </div>
            <div style="font-weight: 800; font-size: 0.95rem; color: #ffffff;">
              ૪. Slide Tool (૧૬:૯ સ્લાઇડ્સ & વાસ્તવિક ફોટા)
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <button id="btn-bottom-prev-to-topics" class="btn btn-outline btn-sm" style="font-weight: 700; border-color: rgba(255,255,255,0.25); color: #cbd5e1; cursor: pointer;">
            ← પાછલું પગલું: ૩. My Topics
          </button>
          <button id="btn-bottom-next-to-script" class="btn btn-primary btn-sm" style="font-weight: 900; background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 10px 20px; border-radius: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.4); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
            આગળનું પગલું: ૫. Script (PDF & સ્ક્રિપ્ટ) →
          </button>
        </div>
      </div>
    `;

    attachEvents();
  }function attachEvents() {
    // =========================================================================
    // SLIDE STUDIO NAVIGATION & CAROUSEL EVENTS
    // =========================================================================
    container.querySelectorAll('.btn-studio-thumb-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSlideIdx = Number(btn.getAttribute('data-slide-idx')) || 0;
        render();
      });
    });

    container.querySelector('#btn-studio-prev-slide')?.addEventListener('click', () => {
      if (activeSlideIdx > 0) {
        activeSlideIdx--;
        render();
      }
    });

    container.querySelector('#btn-studio-next-slide')?.addEventListener('click', () => {
      if (activeSlideIdx < slidesList.length - 1) {
        activeSlideIdx++;
        render();
      }
    });

    // Toggle Layout Mode (Split vs 3 Cards)
    container.querySelector('#btn-toggle-layout-mode')?.addEventListener('click', () => {
      if (slidesList[activeSlideIdx]) {
        slidesList[activeSlideIdx].layoutType = slidesList[activeSlideIdx].layoutType === 'cards' ? 'split' : 'cards';
        saveAllSlides({ silent: true });
        render();
      }
    });

    // Paste from NotebookLM Modal Toggles
    const pasteModal = container.querySelector('#paste-notebooklm-modal');
    container.querySelector('#btn-open-paste-modal-top')?.addEventListener('click', () => {
      showPasteModal = !showPasteModal;
      if (pasteModal) pasteModal.style.display = showPasteModal ? 'block' : 'none';
    });
    container.querySelector('#btn-close-paste-modal')?.addEventListener('click', () => {
      showPasteModal = false;
      if (pasteModal) pasteModal.style.display = 'none';
    });

    // Load Samples in Paste Modal
    container.querySelector('#btn-load-sample-notebooklm')?.addEventListener('click', () => {
      const pasteArea = container.querySelector('#textarea-paste-notebooklm-raw');
      if (pasteArea) pasteArea.value = SAMPLE_NOTEBOOKLM_FORMAT;
    });
    container.querySelector('#btn-load-sample-chatgpt')?.addEventListener('click', () => {
      const pasteArea = container.querySelector('#textarea-paste-notebooklm-raw');
      if (pasteArea) pasteArea.value = SAMPLE_CHATGPT_FORMAT;
    });

    // Execute Import from Pasted Text
    container.querySelector('#btn-execute-import-pasted-slides')?.addEventListener('click', () => {
      const rawText = container.querySelector('#textarea-paste-notebooklm-raw')?.value || '';
      if (!rawText.trim()) {
        alert('કૃપા કરીને પહેલાં NotebookLM માંથી લખાણ અહીં પેસ્ટ કરો.');
        return;
      }

      const parsed = parseExternalSlidesText(rawText);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        alert('પેસ્ટ કરેલા લખાણમાંથી સ્લાઇડ્સ ઓળખાઈ શકી નથી. કૃપા કરીને "Slide 1: ... • પોઇન્ટ્સ" ફોર્મેટ ચકાસો.');
        return;
      }

      slidesList = parsed.map((s, idx) => ({
        slideNumber: idx + 1,
        title: s.title || `સ્લાઇડ #${idx + 1}`,
        subtitle: s.subtitle || '',
        bulletPoints: Array.isArray(s.bulletPoints) && s.bulletPoints.length > 0 ? s.bulletPoints : [s.title],
        photoType: assignDefaultPhotoType(idx, s.title, ''),
        photoCaption: s.title || 'સત્તાવાર પરિપત્ર અને નિયમો મુજબ વિગત',
        layoutType: 'split',
        imageUrl: null,
        scriptText: s.scriptText || ''
      }));

      activeSlideIdx = 0;
      showPasteModal = false;
      saveAllSlides();
      render();
      showNoticeToast(`🎉 NotebookLM માંથી સફળતાપૂર્વક ${parsed.length} સ્લાઇડ્સ ઇમ્પોર્ટ થઈ ગઈ!`, 'success');
    });

    // Add New Slide
    container.querySelector('#btn-studio-add-slide')?.addEventListener('click', () => {
      const newNum = slidesList.length + 1;
      slidesList.push({
        slideNumber: newNum,
        title: `${activeTopic} - મુદ્દો #${newNum}`,
        subtitle: `${activeTopic} • સ્લાઇડ #${newNum}`,
        bulletPoints: [
          'સત્તાવાર પરિપત્ર અને સરકારી નિયમો મુજબ વિગત',
          'લાભાર્થીઓ અને અરજી માટે મહત્વપૂર્ણ મુદ્દો',
          'વિડીયો અંત સુધી જોતા રહો'
        ],
        photoType: assignDefaultPhotoType(newNum - 1, '', ''),
        photoCaption: 'સત્તાવાર પરિપત્ર અને નિયમો મુજબ વિગત',
        layoutType: 'split',
        imageUrl: null,
        scriptText: ''
      });
      activeSlideIdx = slidesList.length - 1;
      saveAllSlides({ silent: true });
      render();
      showNoticeToast(`✓ સ્લાઇડ #${newNum} ઉમેરાઈ ગઈ!`, 'success');
    });

    // Delete Current Slide
    container.querySelector('#btn-studio-delete-slide')?.addEventListener('click', () => {
      if (slidesList.length <= 3) {
        alert('ઓછામાં ઓછી ૩ સ્લાઇડ્સ રાખવી જરૂરી છે.');
        return;
      }
      if (confirm(`શું તમે સ્લાઇડ #${activeSlideIdx + 1} ડિલીટ કરવા માંગો છો?`)) {
        slidesList.splice(activeSlideIdx, 1);
        slidesList.forEach((s, idx) => { s.slideNumber = idx + 1; });
        if (activeSlideIdx >= slidesList.length) activeSlideIdx = slidesList.length - 1;
        saveAllSlides({ silent: true });
        render();
        showNoticeToast('✓ સ્લાઇડ ડિલીટ થઈ ગઈ.', 'info');
      }
    });

    // 1-Click Load 9-Slide Anganwadi NotebookLM Sample
    container.querySelector('#btn-load-anganwadi-sample-slides')?.addEventListener('click', () => {
      slidesList = JSON.parse(JSON.stringify(ANGANWADI_NOTEBOOKLM_9SLIDES));
      activeSlideIdx = 0;
      saveAllSlides();
      render();
      showNoticeToast('🎉 આંગણવાડી હાઈકોર્ટ ચુકાદાની અસલ ૯ સ્લાઇડ્સ (LPA 363/2025) સફળતાપૂર્વક લોડ થઈ ગઈ!', 'success');
    });

    // Toggle / Cycle Layout Mode
    container.querySelector('#btn-toggle-layout-mode')?.addEventListener('click', () => {
      if (!slidesList[activeSlideIdx]) return;
      const modes = ['split', 'comparison', 'formula', 'timeline', 'cards'];
      const curMode = slidesList[activeSlideIdx].layoutType || 'split';
      const nextIdx = (modes.indexOf(curMode) + 1) % modes.length;
      slidesList[activeSlideIdx].layoutType = modes[nextIdx];
      initLayoutDefaults(slidesList[activeSlideIdx]);
      saveAllSlides({ silent: true });
      render();
    });

    // Layout Dropdown Change
    container.querySelector('#select-slide-layout-type')?.addEventListener('change', (e) => {
      if (!slidesList[activeSlideIdx]) return;
      slidesList[activeSlideIdx].layoutType = e.target.value;
      initLayoutDefaults(slidesList[activeSlideIdx]);
      saveAllSlides({ silent: true });
      render();
    });

    function initLayoutDefaults(slide) {
      if (slide.layoutType === 'comparison' && !slide.comparison) {
        slide.comparison = {
          oldTitle: 'જૂનું માનદ વેતન (માસિક)',
          oldAmount: '₹૧૦,૦૦૦',
          oldDesc: 'સરકાર દ્વારા અપાતું જૂનું માનદ વેતન',
          newTitle: 'નવો પગાર (હાઇકોર્ટ આદેશ)',
          newAmount: '₹૨૪,૮૦૦',
          newDesc: 'લઘુતમ વેતન ધારા હેઠળ નિર્ધારિત દર',
          diffNote: 'માસિક ₹૧૪,૮૦૦ નો ઐતિહાસિક સીધો વધારો!'
        };
      } else if (slide.layoutType === 'formula' && !slide.formula) {
        slide.formula = {
          block1: { title: 'મૂળ માનદ વેતન', amount: '₹૧૦,૦૦૦', desc: 'બેઝિક ઘટક' },
          operator1: '+',
          block2: { title: 'લઘુતમ વેતન તફાવત', amount: '₹૧૪,૮૦૦', desc: 'હાઇકોર્ટ નિર્દેશ' },
          operator2: '=',
          block3: { title: 'કુલ માસિક વેતન', amount: '₹૨૪,૮૦૦', desc: 'કુલ ચૂકવવાપાત્ર પગાર' }
        };
      } else if (slide.layoutType === 'timeline' && !slide.timeline) {
        slide.timeline = [
          { step: '૧', date: '૧ એપ્રિલ ૨૦૨૫', title: 'અમલ શરૂ', desc: 'નવા પગાર ધોરણનો અમલ કરવાનો નિર્દેશ' },
          { step: '૨', date: '૬ મહિનાની મુદત', title: 'નીતિ ઘડતર', desc: 'રાજ્ય સરકાર દ્વારા સત્તાવાર નિયમો તૈયાર કરવા' },
          { step: '૩', date: 'બાકી ચૂકવણી', title: 'એરિયર્સ જમા', desc: 'પાછલી બાકી રકમ સીધી બેંક ખાતામાં જમા' }
        ];
      }
    }

    // Comparison inputs listener
    container.querySelector('#input-edit-comp-old')?.addEventListener('input', (e) => {
      if (slidesList[activeSlideIdx]) {
        slidesList[activeSlideIdx].comparison = slidesList[activeSlideIdx].comparison || {};
        slidesList[activeSlideIdx].comparison.oldAmount = e.target.value;
      }
    });
    container.querySelector('#input-edit-comp-new')?.addEventListener('input', (e) => {
      if (slidesList[activeSlideIdx]) {
        slidesList[activeSlideIdx].comparison = slidesList[activeSlideIdx].comparison || {};
        slidesList[activeSlideIdx].comparison.newAmount = e.target.value;
      }
    });
    container.querySelector('#input-edit-comp-diff')?.addEventListener('input', (e) => {
      if (slidesList[activeSlideIdx]) {
        slidesList[activeSlideIdx].comparison = slidesList[activeSlideIdx].comparison || {};
        slidesList[activeSlideIdx].comparison.diffNote = e.target.value;
      }
    });

    // Formula inputs listener
    container.querySelector('#input-edit-form-b1')?.addEventListener('input', (e) => {
      if (slidesList[activeSlideIdx]?.formula?.block1) {
        slidesList[activeSlideIdx].formula.block1.amount = e.target.value;
      }
    });
    container.querySelector('#input-edit-form-b2')?.addEventListener('input', (e) => {
      if (slidesList[activeSlideIdx]?.formula?.block2) {
        slidesList[activeSlideIdx].formula.block2.amount = e.target.value;
      }
    });
    container.querySelector('#input-edit-form-b3')?.addEventListener('input', (e) => {
      if (slidesList[activeSlideIdx]?.formula?.block3) {
        slidesList[activeSlideIdx].formula.block3.amount = e.target.value;
      }
    });

    // Regenerate All Slides from Topic
    container.querySelector('#btn-regenerate-slides-from-topic')?.addEventListener('click', () => {
      slidesList = initSlidesForTopic(activeTopic);
      activeSlideIdx = 0;
      saveAllSlides();
      render();
      showNoticeToast('✓ વિષય મુજબ બધી ૧૬:૯ સ્લાઇડ્સ NotebookLM ગુણવત્તા સાથે નવી તૈયાર થઈ ગઈ!', 'success');
    });

    // Live Title Edit
    const titleInput = container.querySelector('#input-edit-slide-title');
    titleInput?.addEventListener('input', (e) => {
      if (slidesList[activeSlideIdx]) {
        slidesList[activeSlideIdx].title = e.target.value;
        updateCanvasLive();
      }
    });

    // Live Subtitle Edit
    const subInput = container.querySelector('#input-edit-slide-subtitle');
    subInput?.addEventListener('input', (e) => {
      if (slidesList[activeSlideIdx]) {
        slidesList[activeSlideIdx].subtitle = e.target.value;
        updateCanvasLive();
      }
    });

    // Live Bullets Edit
    const bulletsInput = container.querySelector('#textarea-edit-slide-bullets');
    bulletsInput?.addEventListener('input', (e) => {
      if (slidesList[activeSlideIdx]) {
        slidesList[activeSlideIdx].bulletPoints = e.target.value
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);
        updateCanvasLive();
      }
    });

    // Live Caption Edit
    const captionInput = container.querySelector('#input-edit-slide-caption');
    captionInput?.addEventListener('input', (e) => {
      if (slidesList[activeSlideIdx]) {
        slidesList[activeSlideIdx].photoCaption = e.target.value;
        updateCanvasLive();
      }
    });

    // Realistic Photo Preset Selector
    container.querySelectorAll('.btn-preset-photo').forEach(btn => {
      btn.addEventListener('click', () => {
        const pId = btn.getAttribute('data-photo-id');
        if (slidesList[activeSlideIdx] && pId) {
          slidesList[activeSlideIdx].photoType = pId;
          const foundPreset = REALISTIC_PHOTO_PRESETS.find(p => p.id === pId);
          if (foundPreset && captionInput) {
            captionInput.value = foundPreset.desc;
            slidesList[activeSlideIdx].photoCaption = foundPreset.desc;
          }
          saveAllSlides({ silent: true });
          render();
        }
      });
    });

    // Custom Image File Upload
    const customImgFileInput = container.querySelector('#input-slide-custom-image-file');
    const triggerImgFileBtn = container.querySelector('#btn-trigger-custom-image-file');
    triggerImgFileBtn?.addEventListener('click', () => customImgFileInput?.click());
    customImgFileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        if (slidesList[activeSlideIdx]) {
          slidesList[activeSlideIdx].imageUrl = loadEvt.target.result;
          saveAllSlides({ silent: true });
          render();
          showNoticeToast('✓ કસ્ટમ ફોટો સ્લાઇડમાં સફળતાપૂર્વક જોડાઈ ગયો!', 'success');
        }
      };
      reader.readAsDataURL(file);
    });

    // Custom Image URL Apply
    container.querySelector('#btn-apply-custom-image-url')?.addEventListener('click', () => {
      const url = container.querySelector('#input-slide-custom-image-url')?.value.trim();
      if (url && slidesList[activeSlideIdx]) {
        slidesList[activeSlideIdx].imageUrl = url;
        saveAllSlides({ silent: true });
        render();
        showNoticeToast('✓ ફોટો URL સ્લાઇડમાં સફળતાપૂર્વક સેટ થઈ ગયો!', 'success');
      }
    });

    // Remove Custom Image
    container.querySelector('#btn-remove-custom-image')?.addEventListener('click', () => {
      if (slidesList[activeSlideIdx]) {
        slidesList[activeSlideIdx].imageUrl = null;
        saveAllSlides({ silent: true });
        render();
        showNoticeToast('✓ કસ્ટમ ફોટો દૂર થયો, મૂળ વાસ્તવિક કાર્ડ સેટ થયું.', 'info');
      }
    });

    // Download 1080p Slide PNG
    container.querySelector('#btn-download-slide-png')?.addEventListener('click', () => {
      exportSlideToPng(slidesList[activeSlideIdx], activeSlideIdx, activeTopic);
    });

    // =========================================================================
    // SLIDE SAVING & PIPELINE SYNC
    // =========================================================================
    async function saveAllSlides(options = {}) {
      const silent = options.silent === true;
      curProj.slide = curProj.slide || {};
      curProj.slide.slides = slidesList;
      curProj.slide.slideCount = `${slidesList.length} સ્લાઇડ્સ`;
      curProj.slide.isCompleted = true;
      projectState.updateTool('slide', curProj.slide);

      // Sync with script sections so Tool 5 (Script) and Tool 6 (Video) automatically receive them
      const sections = slidesList.map((s, idx) => ({
        slideId: s.slideId || `slide_${curProj.id || 'proj'}_${idx + 1}`,
        slideNumber: idx + 1,
        pageNumber: idx + 1,
        sectionName: s.title || `સ્લાઇડ #${idx + 1}`,
        title: s.title || `સ્લાઇડ #${idx + 1}`,
        subtitle: s.subtitle || '',
        scriptText: s.scriptText || (s.bulletPoints?.length > 0 ? s.bulletPoints.join('. ') : `${s.title} ની વિગતવાર સમજૂતી.`),
        bulletPoints: s.bulletPoints || [],
        imageUrl: s.imageUrl || null,
        photoType: s.photoType || null,
        layoutType: s.layoutType || null
      }));

      const fullScript = sections.map(s => `[સ્લાઇડ #${s.slideNumber}: ${s.sectionName}]\n${s.scriptText}`).join('\n\n');
      curProj.script = curProj.script || {};
      curProj.script.sections = sections;
      curProj.script.rawText = fullScript;
      curProj.script.fullText = fullScript;
      curProj.script.savedInDb = true;
      projectState.updateTool('script', curProj.script);

      if (curProj?.id) {
        await saveScriptToDatabase(curProj.id, {
          rawText: fullScript,
          fullText: fullScript,
          sections,
          source: 'SlideStudio_Auto'
        }, { notify: false, showToast: false }).catch(() => {});
      }

      if (!silent) {
        const statusSpan = container.querySelector('#save-status-text');
        if (statusSpan) {
          statusSpan.textContent = `✓ ${slidesList.length} સ્લાઇડ્સ સેવ થઈ ગઈ!`;
          setTimeout(() => { if (statusSpan) statusSpan.textContent = ''; }, 3000);
        }
        showNoticeToast(`🎉 ૧૬:૯ વાસ્તવિક સ્લાઇડ્સ (${slidesList.length} સ્લાઇડ્સ) પ્રોજેક્ટમાં સાચવાઈ ગઈ!`, 'success');
      }
    }

    container.querySelector('#btn-top-save-all-slides')?.addEventListener('click', () => saveAllSlides());
    container.querySelector('#btn-save-current-slide')?.addEventListener('click', () => saveAllSlides());

    function updateCanvasLive() {
      const canvasEl = container.querySelector('#slide-preview-169-canvas');
      if (!canvasEl) return;
      const cur = slidesList[activeSlideIdx];
      if (!cur) return;
      const preset = REALISTIC_PHOTO_PRESETS.find(p => p.id === cur.photoType) || REALISTIC_PHOTO_PRESETS[0];
      const h3 = canvasEl.querySelector('h3');
      if (h3) h3.textContent = cur.title;
      const cardsDiv = canvasEl.querySelector('div[style*="display: flex; flex-direction: column; justify-content: center; gap: 12px;"]');
      if (cardsDiv) {
        cardsDiv.innerHTML = (cur.bulletPoints || []).slice(0, 3).map((pt, bIdx) => `
          <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-left: 6px solid #2563eb; border-radius: 8px; padding: 13px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; align-items: flex-start; gap: 12px;">
            <span style="background: #eff6ff; color: #1d4ed8; font-weight: 900; font-size: 0.86rem; padding: 3px 9px; border-radius: 4px; flex-shrink: 0; line-height: 1.4; border: 1px solid #bfdbfe;">
              ${bIdx + 1}
            </span>
            <div style="font-size: 1.05rem; font-weight: 800; color: #0f172a; line-height: 1.52; flex: 1;">
              ${pt.replace(/^[•\-\*0-9\.\)]+\s*/, '')}
            </div>
          </div>
        `).join('');
      }
      const captionDiv = canvasEl.querySelector('div[style*="font-size: 0.74rem; color: #f8fafc"]');
      if (captionDiv) captionDiv.textContent = cur.photoCaption || preset.desc;
    }

    // =========================================================================
    // CHATGPT & NOTEBOOKLM PROMPT BOX LOGIC & HANDLERS
    // =========================================================================
    const topicInput = container.querySelector('#input-notebooklm-topic');
    const countSelect = container.querySelector('#select-notebooklm-count');
    const notesTextarea = container.querySelector('#textarea-research-notes');
    const promptTextarea = container.querySelector('#textarea-notebooklm-prompt');
    const btnCopy = container.querySelector('#btn-copy-notebooklm-prompt');
    const copyText = container.querySelector('#copy-text');
    const copyIcon = container.querySelector('#copy-icon');

    const btnTabChatGPTUnified = container.querySelector('#btn-tab-chatgpt-unified');
    const btnTabChatGPTSearch = container.querySelector('#btn-tab-chatgpt-search');
    const btnTabSource = container.querySelector('#btn-tab-source-prompt');
    const btnTabSearch = container.querySelector('#btn-tab-search-prompt');
    const promptHeaderTitle = container.querySelector('#prompt-box-header-title');
    const promptHeaderSub = container.querySelector('#prompt-box-header-sub');

    const updatePromptView = () => {
      // Reset all tab styles to inactive
      [btnTabChatGPTUnified, btnTabChatGPTSearch, btnTabSource, btnTabSearch].forEach(b => {
        if (b) {
          b.style.background = 'rgba(255,255,255,0.06)';
          b.style.borderColor = 'rgba(255,255,255,0.2)';
        }
      });

      if (activePromptMode === 'chatgpt-unified') {
        tool2Prompt = currentChatGPTUnifiedPrompt;
        if (promptTextarea) promptTextarea.value = currentChatGPTUnifiedPrompt;
        if (promptHeaderTitle) promptHeaderTitle.textContent = '⚡ આ એક જ વિષય માટે ફક્ત સ્લાઇડ પ્રમાણે વ્યવસ્થિત કન્ટેન્ટ પ્રોમ્પ્ટ:';
        if (promptHeaderSub) promptHeaderSub.textContent = 'એક જ બોક્સ • વક્તાસ્પીચ વગર ફક્ત સ્લાઇડ કન્ટેન્ટ • શુદ્ધ સફેદ બેકગ્રાઉન્ડ & વાસ્તવિક ફોટા';
        if (btnTabChatGPTUnified) {
          btnTabChatGPTUnified.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          btnTabChatGPTUnified.style.borderColor = '#34d399';
        }
      } else if (activePromptMode === 'chatgpt-search') {
        tool2Prompt = currentChatGPTSearchPrompt;
        if (promptTextarea) promptTextarea.value = currentChatGPTSearchPrompt;
        if (promptHeaderTitle) promptHeaderTitle.textContent = '🔍 ChatGPT Live Web Search & Content Research Prompt (સ્લાઇડ પહેલાં કન્ટેન્ટ સર્ચ):';
        if (promptHeaderSub) promptHeaderSub.textContent = 'સ્લાઇડ બનાવતાં પહેલાં ChatGPT પાસે આ વિષયનું બેસ્ટ, સત્તાવાર અને ફેક્ટ-ચેક્ડ કન્ટેન્ટ સર્ચ કરાવી લેવા માટેનો પ્રોમ્પ્ટ.';
        if (btnTabChatGPTSearch) {
          btnTabChatGPTSearch.style.background = 'linear-gradient(135deg, #0284c7, #0369a1)';
          btnTabChatGPTSearch.style.borderColor = '#38bdf8';
        }
      } else if (activePromptMode === 'source') {
        tool2Prompt = currentUploadedSourcePrompt;
        if (promptTextarea) promptTextarea.value = currentUploadedSourcePrompt;
        if (promptHeaderTitle) promptHeaderTitle.textContent = '📑 NotebookLM Uploaded Source Slide Prompt (સોર્સ સ્લાઇડ પ્રોમ્પ્ટ):';
        if (promptHeaderSub) promptHeaderSub.textContent = 'આ પ્રોમ્પ્ટ કોપી કરીને Google NotebookLM માં સોર્સ અપલોડ કર્યા પછી ચેટમાં પેસ્ટ કરો.';
        if (btnTabSource) {
          btnTabSource.style.background = 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
          btnTabSource.style.borderColor = '#a78bfa';
        }
      } else {
        tool2Prompt = currentSearchPrompt;
        if (promptTextarea) promptTextarea.value = currentSearchPrompt;
        if (promptHeaderTitle) promptHeaderTitle.textContent = '⚡ NotebookLM Direct Search Master Prompt (ડાયરેક્ટ સર્ચ પ્રોમ્પ્ટ):';
        if (promptHeaderSub) promptHeaderSub.textContent = 'આ પ્રોમ્પ્ટ કોપી કરીને Google NotebookLM ની ચેટમાં પેસ્ટ કરો.';
        if (btnTabSearch) {
          btnTabSearch.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
          btnTabSearch.style.borderColor = '#fbbf24';
        }
      }
    };

    btnTabChatGPTUnified?.addEventListener('click', () => {
      activePromptMode = 'chatgpt-unified';
      updatePromptView();
    });

    btnTabChatGPTSearch?.addEventListener('click', () => {
      activePromptMode = 'chatgpt-search';
      updatePromptView();
    });

    btnTabSource?.addEventListener('click', () => {
      activePromptMode = 'source';
      updatePromptView();
    });

    btnTabSearch?.addEventListener('click', () => {
      activePromptMode = 'search';
      updatePromptView();
    });

    // Topic Change Handler (Automatically updates audience and prompt)
    let topicDebounceTimer = null;
    topicInput?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (!val) return;
      activeTopic = val;
      const badgeTopicEl = container.querySelector('#sp-active-topic-display');
      if (badgeTopicEl) badgeTopicEl.textContent = activeTopic;
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem('gyan_active_topic_name', activeTopic);
        if (typeof window !== 'undefined') window.prefillTopic = activeTopic;
      } catch (_) {}

      clearTimeout(topicDebounceTimer);
      topicDebounceTimer = setTimeout(() => {
        projectState.setTopic(activeTopic, '', { rebuildKit: false });
        const generated = generatePromptData(activeTopic, slideCountChoice);
        currentUploadedSourcePrompt = generated.uploadedSourcePrompt;
        currentSearchPrompt = generated.pptDeckPrompt;
        currentChatGPTUnifiedPrompt = generated.chatgptUnifiedPrompt;
        currentChatGPTSearchPrompt = generated.chatgptSearchPrompt;
        currentAudienceText = generated.audienceText;

        if (activePromptMode === 'source') tool2Prompt = currentUploadedSourcePrompt;
        else if (activePromptMode === 'search') tool2Prompt = currentSearchPrompt;
        else if (activePromptMode === 'chatgpt-search') tool2Prompt = currentChatGPTSearchPrompt;
        else tool2Prompt = currentChatGPTUnifiedPrompt;

        if (promptTextarea) promptTextarea.value = tool2Prompt;
        const audienceBadge = container.querySelector('#badge-detected-audience');
        if (audienceBadge) audienceBadge.textContent = currentAudienceText;

        projectState.updateTool('slide', { tool2Prompt, slideCount: slideCountChoice, topic: activeTopic, isCompleted: true });
      }, 300);
    });

    // Slide Count Selector
    countSelect?.addEventListener('change', (e) => {
      slideCountChoice = e.target.value;
      const generated = generatePromptData(activeTopic, slideCountChoice);
      currentUploadedSourcePrompt = generated.uploadedSourcePrompt;
      currentSearchPrompt = generated.pptDeckPrompt;
      currentChatGPTUnifiedPrompt = generated.chatgptUnifiedPrompt;
      currentChatGPTSearchPrompt = generated.chatgptSearchPrompt;
      currentAudienceText = generated.audienceText;

      if (activePromptMode === 'source') tool2Prompt = currentUploadedSourcePrompt;
      else if (activePromptMode === 'search') tool2Prompt = currentSearchPrompt;
      else if (activePromptMode === 'chatgpt-search') tool2Prompt = currentChatGPTSearchPrompt;
      else tool2Prompt = currentChatGPTUnifiedPrompt;

      if (promptTextarea) promptTextarea.value = tool2Prompt;
      const audienceBadge = container.querySelector('#badge-detected-audience');
      if (audienceBadge) audienceBadge.textContent = currentAudienceText;

      projectState.updateTool('slide', { tool2Prompt, slideCount: slideCountChoice, topic: activeTopic, isCompleted: true });
    });

    // Notes Handler
    notesTextarea?.addEventListener('input', (e) => {
      researchNotes = e.target.value;
      projectState.updateTool('slide', { notes: researchNotes });
    });

    // Regenerate Prompt Button
    container.querySelector('#btn-regenerate-notebooklm-prompt')?.addEventListener('click', () => {
      const generated = generatePromptData(activeTopic, slideCountChoice);
      currentUploadedSourcePrompt = generated.uploadedSourcePrompt;
      currentSearchPrompt = generated.pptDeckPrompt;
      currentChatGPTUnifiedPrompt = generated.chatgptUnifiedPrompt;
      currentChatGPTSearchPrompt = generated.chatgptSearchPrompt;
      currentAudienceText = generated.audienceText;

      if (activePromptMode === 'source') tool2Prompt = currentUploadedSourcePrompt;
      else if (activePromptMode === 'search') tool2Prompt = currentSearchPrompt;
      else if (activePromptMode === 'chatgpt-search') tool2Prompt = currentChatGPTSearchPrompt;
      else tool2Prompt = currentChatGPTUnifiedPrompt;

      if (promptTextarea) promptTextarea.value = tool2Prompt;
      const audienceBadge = container.querySelector('#badge-detected-audience');
      if (audienceBadge) audienceBadge.textContent = currentAudienceText;

      projectState.updateTool('slide', { tool2Prompt, slideCount: slideCountChoice, topic: activeTopic, isCompleted: true });
      showNoticeToast('✓ વિષય મુજબ ૧૬:૯ PPT પ્રોમ્પ્ટ લક્ષિત દર્શકો સાથે નવો જનરેટ થઈ ગયો!', 'success');
    });

    // Manual edits to prompt textarea
    promptTextarea?.addEventListener('input', () => {
      tool2Prompt = promptTextarea.value;
      projectState.updateTool('slide', { tool2Prompt, isCompleted: true });
    });

    // Save Prompt Button
    container.querySelector('#btn-save-notebooklm-prompt')?.addEventListener('click', () => {
      tool2Prompt = promptTextarea ? promptTextarea.value : tool2Prompt;
      projectState.updateTool('slide', { tool2Prompt, notes: researchNotes, isCompleted: true });
      projectState.saveVersionSnapshot(curProj?.id, 'slidePrompts', 'Saved Slide Prompt', { promptText: tool2Prompt });
      showNoticeToast('✓ ૧૬:૯ સ્લાઇડ પ્રોમ્પ્ટ સફળતાપૂર્વક સાચવાઈ ગયો! ✓', 'success');
    });

    // Copy Prompt Button
    btnCopy?.addEventListener('click', () => {
      const textToCopy = promptTextarea ? promptTextarea.value : tool2Prompt;
      copyToClipboard(textToCopy, '⚡ સ્લાઇડ કન્ટેન્ટ પ્રોમ્પ્ટ (વક્તાસ્પીચ વગર) કોપી થઈ ગયો! ✓', btnCopy);
      if (copyText) copyText.textContent = '✓ પ્રોમ્પ્ટ કોપી થઈ ગયો!';
      if (copyIcon) copyIcon.textContent = '✓';
      setTimeout(() => {
        if (copyText) copyText.textContent = 'પ્રોમ્પ્ટ કોપી કરો (Copy Prompt)';
        if (copyIcon) copyIcon.textContent = '📋';
      }, 2500);
    });

    // Quick Copy Source Upload Prompt Button
    const btnQuickSourceCopy = container.querySelector('#btn-quick-copy-source-prompt');
    btnQuickSourceCopy?.addEventListener('click', () => {
      activePromptMode = 'source';
      updatePromptView();
      copyToClipboard(currentUploadedSourcePrompt, '⚡ આપેલ સોર્સ (PDF) પરથી ડાયરેક્ટ સ્લાઇડ બનાવવાનો પ્રોમ્પ્ટ કોપી થઈ ગયો! ✓', btnQuickSourceCopy);
      showNoticeToast('✓ આપેલ સોર્સ (PDF) પરથી ડાયરેક્ટ સ્લાઇડ બનાવવાનો પ્રોમ્પ્ટ કોપી થઈ ગયો! હવે NotebookLM માં પેસ્ટ કરો.', 'success');
    });

    // Quick Copy Direct Search Prompt Button
    const btnQuickSearchCopy = container.querySelector('#btn-quick-copy-search-prompt');
    btnQuickSearchCopy?.addEventListener('click', () => {
      activePromptMode = 'search';
      updatePromptView();
      copyToClipboard(currentSearchPrompt, '⚡ ડાયરેક્ટ સર્ચ & સ્લાઇડ ડેક પ્રોમ્પ્ટ કોપી થઈ ગયો! ✓', btnQuickSearchCopy);
      showNoticeToast('⚡ ડાયરેક્ટ સર્ચ પ્રોમ્પ્ટ કોપી થઈ ગયો! હવે NotebookLM માં પેસ્ટ કરો.', 'success');
    });

    // Open ChatGPT Links Auto-copy
    const autoCopyForChatGPT = async () => {
      const textToCopy = promptTextarea ? promptTextarea.value : tool2Prompt;
      await copyToClipboard(textToCopy).catch(() => {});
      showNoticeToast('સ્લાઇડ કન્ટેન્ટ પ્રોમ્પ્ટ (વક્તાસ્પીચ વગર) કોપી થઈ ગયો છે, ChatGPT માં પેસ્ટ કરો!', 'info');
    };
    container.querySelector('#btn-top-open-chatgpt')?.addEventListener('click', autoCopyForChatGPT);
    container.querySelector('#btn-open-chatgpt-from-box')?.addEventListener('click', autoCopyForChatGPT);

    // Direct PDF Upload Handler in SlidePrompts
    async function handlePdfUploadInSlidePrompts(file) {
      if (!file) return;
      const ext = (file.name || '').split('.').pop().toLowerCase();
      if (!['pdf', 'pptx', 'ppt'].includes(ext)) {
        alert('કૃપા કરીને માત્ર PDF અથવા PPTX ફાઇલ પસંદ કરો.');
        return;
      }

      showNoticeToast(`📄 "${file.name}" અપલોડ અને સ્લાઇડ એક્સટ્રેક્શન ચાલુ છે...`, 'info');

      const reader = new FileReader();
      reader.onerror = (rErr) => {
        console.error('[SlidePrompts FileReader Error]:', rErr);
        alert('PDF ફાઇલ વાંચવામાં ક્ષતિ આવી. કૃપા કરીને ફાઇલ ફરી પસંદ કરો.');
      };
      reader.onload = async (e) => {
        try {
          const base64Data = e.target.result;
          const commaIdx = base64Data.indexOf('base64,');
          const fileBase64 = commaIdx !== -1 ? base64Data.slice(commaIdx + 7) : base64Data;

          const response = await fetch('/api/research/upload-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileBase64,
              filename: file.name,
              overallTopic: activeTopic,
              projectId: curProj?.id
            })
          });

          const data = await response.json();
          if (!data.success || !Array.isArray(data.slides)) {
            throw new Error(data.error || 'PDF પ્રોસેસ કરવામાં ભૂલ આવી.');
          }

          const fileRecord = {
            id: `pres_${curProj?.id || 'proj'}_${Date.now()}`,
            projectId: curProj?.id,
            filename: data.filename || file.name,
            fileType: ext,
            fileUrl: data.fileUrl || '',
            size: file.size,
            sizeFormatted: `${Math.round(file.size / 1024)} KB`,
            uploadedAt: new Date().toISOString(),
            slidesCount: data.slides.length,
            slides: data.slides,
            dataUrl: base64Data
          };

          if (curProj?.id) {
            await saveProjectPresentation(curProj.id, fileRecord);
            if (curProj.topicId && curProj.topicId !== curProj.id) {
              await saveProjectPresentation(curProj.topicId, fileRecord);
            }
          }

          curProj.slide = curProj.slide || {};
          curProj.slide.slides = data.slides;
          curProj.slide.importedPresentation = { ...fileRecord, dataUrl: '' };
          projectState.updateTool('slide', curProj.slide);

          // Update script sections
          const newSections = data.slides.map((s, idx) => ({
            slideId: s.slideId || `slide_${curProj?.id || 'p'}_${idx + 1}`,
            slideNumber: idx + 1,
            sectionName: s.title || `સ્લાઇડ #${idx + 1}`,
            title: s.title || `સ્લાઇડ #${idx + 1}`,
            subtitle: s.subtitle || '',
            scriptText: s.scriptText || (s.bulletPoints && s.bulletPoints.length > 0 ? s.bulletPoints.join('. ') : `${s.title || 'સ્લાઇડ #' + (idx + 1)} ની સમજૂતી.`)
          }));
          const fullScript = newSections.map(s => `[સ્લાઇડ #${s.slideNumber}: ${s.sectionName}]\n${s.scriptText}`).join('\n\n');
          curProj.script = curProj.script || {};
          curProj.script.sections = newSections;
          curProj.script.rawText = fullScript;
          curProj.script.fullText = fullScript;
          curProj.script.savedInDb = true;
          projectState.updateTool('script', curProj.script);

          if (curProj?.id) {
            await saveScriptToDatabase(curProj.id, {
              rawText: fullScript,
              fullText: fullScript,
              sections: newSections,
              source: 'PDF_Extract'
            }, { notify: false, showToast: false }).catch(() => {});
          }

          slidesList = data.slides;
          activeSlideIdx = 0;
          showNoticeToast(`🎉 PDF સફળતાપૂર્વક અપલોડ થઈ ગઈ (${data.slides.length} સ્લાઇડ્સ)! સ્ક્રિપ્ટ તૈયાર છે.`, 'success');
          render();
        } catch (innerErr) {
          console.error('[SlidePrompts PDF Error]:', innerErr);
          alert('PDF પ્રોસેસિંગમાં ભૂલ: ' + innerErr.message);
        }
      };
      reader.readAsDataURL(file);
    }

    // Trigger PDF File Input
    const triggerPdfBtn = container.querySelector('#btn-trigger-slideprompt-pdf');
    const fileInput = container.querySelector('#input-slideprompt-pdf');
    triggerPdfBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handlePdfUploadInSlidePrompts(file);
    });

    container.querySelector('#btn-goto-script-from-prompt')?.addEventListener('click', () => navigateTo('scriptwriter'));
    container.querySelector('#btn-goto-video-from-prompt')?.addEventListener('click', () => navigateTo('videoeditor'));

    // Navigation handlers
    const handleNext = async () => {
      await saveAllSlides({ silent: true });
      navigateTo('scriptwriter');
    };

    const handlePrev = () => {
      navigateTo('mytopics');
    };

    container.querySelector('#btn-prev-to-topics-top')?.addEventListener('click', handlePrev);
    container.querySelector('#btn-bottom-prev-to-topics')?.addEventListener('click', handlePrev);
    container.querySelector('#btn-next-to-slides-top')?.addEventListener('click', handleNext);
    container.querySelector('#btn-next-to-slides-bottom')?.addEventListener('click', handleNext);
    container.querySelector('#btn-bottom-next-to-script')?.addEventListener('click', handleNext);
    container.querySelector('#btn-goto-script-from-studio')?.addEventListener('click', handleNext);
  }

  // =========================================================================
  // EXPORT 16:9 SLIDE TO 1080P FULL HD PNG IMAGE
  // =========================================================================
  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const words = String(text).split(' ');
    let line = '';
    let curY = y;
    let linesDrawn = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, curY);
        line = words[n] + ' ';
        curY += lineHeight;
        linesDrawn++;
        if (linesDrawn >= maxLines - 1) {
          const rem = words.slice(n).join(' ');
          let fitRem = rem;
          while (ctx.measureText(fitRem + '...').width > maxWidth && fitRem.length > 3) {
            fitRem = fitRem.substring(0, fitRem.length - 2);
          }
          ctx.fillText(fitRem + '...', x, curY);
          return;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, curY);
  }

  function exportSlideToPng(slide, sIdx, topicName) {
    if (!slide) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      // 1. 100% Pure White Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1920, 1080);

      // 2. Solid Deep Navy Heading Banner across the top
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(60, 40, 1800, 140);

      // Royal Blue Accent Line Under Header
      ctx.fillStyle = '#2563EB';
      ctx.fillRect(60, 174, 1800, 6);

      // Slide Title Text (Bold White)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px "Noto Sans Gujarati", sans-serif';
      const cleanTitle = (slide.title || `સ્લાઇડ #${sIdx + 1}`).trim();
      ctx.fillText(cleanTitle.length > 50 ? cleanTitle.substring(0, 50) + '...' : cleanTitle, 95, 126);

      // Gyan Yatra Badge & Slide Number Pill
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(1460, 80, 160, 52);
      ctx.fillStyle = '#93C5FD';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('Gyan Yatra', 1485, 116);

      ctx.fillStyle = '#2563EB';
      ctx.fillRect(1640, 80, 190, 52);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(`સ્લાઇડ #${sIdx + 1}`, 1665, 116);

      // Subtitle (if present)
      let contentStartY = 210;
      if (slide.subtitle) {
        ctx.fillStyle = '#F1F5F9';
        ctx.fillRect(60, 200, 1800, 48);
        ctx.fillStyle = '#2563EB';
        ctx.fillRect(60, 200, 10, 48);

        ctx.fillStyle = '#334155';
        ctx.font = 'bold 28px "Noto Sans Gujarati", sans-serif';
        ctx.fillText(slide.subtitle, 90, 235);
        contentStartY = 270;
      }

      const finalizeDraw = (loadedImg) => {
        if (slide.layoutType === 'comparison') {
          // COMPARISON LAYOUT (Old vs New Salary)
          const availH = 990 - contentStartY;
          const cardH = Math.min(availH - 90, 680);
          const topY = contentStartY + 10;
          const cardW = 870;

          // Left: Old Salary Card (Strikethrough)
          const oldX = 60;
          ctx.fillStyle = '#FFF5F5';
          ctx.fillRect(oldX, topY, cardW, cardH);
          ctx.strokeStyle = '#FCA5A5';
          ctx.lineWidth = 3;
          ctx.strokeRect(oldX, topY, cardW, cardH);

          // Old Badge
          ctx.fillStyle = '#FEE2E2';
          ctx.fillRect(oldX + 30, topY + 30, 360, 48);
          ctx.fillStyle = '#B91C1C';
          ctx.font = 'bold 24px "Noto Sans Gujarati", sans-serif';
          ctx.fillText(slide.comparison?.oldTitle || 'જૂનું માનદ વેતન (માસિક)', oldX + 45, topY + 63);

          // Strikethrough Old Amount
          ctx.fillStyle = '#EF4444';
          ctx.font = 'bold 90px "Noto Sans Gujarati", sans-serif';
          const oldAmt = slide.comparison?.oldAmount || '₹૧૦,૦૦૦';
          ctx.fillText(oldAmt, oldX + 35, topY + 200);
          const oldMetric = ctx.measureText(oldAmt);
          ctx.beginPath();
          ctx.moveTo(oldX + 30, topY + 168);
          ctx.lineTo(oldX + 40 + oldMetric.width, topY + 168);
          ctx.strokeStyle = '#DC2626';
          ctx.lineWidth = 8;
          ctx.stroke();

          // Old Description
          ctx.fillStyle = '#64748B';
          ctx.font = 'bold 30px "Noto Sans Gujarati", sans-serif';
          wrapCanvasText(ctx, slide.comparison?.oldDesc || 'સરકાર દ્વારા આપવામાં આવતું માસિક માનદ વેતન', oldX + 35, topY + 280, cardW - 70, 44, 2);

          // Old Cross Note
          ctx.fillStyle = '#DC2626';
          ctx.font = 'bold 26px "Noto Sans Gujarati", sans-serif';
          ctx.fillText('✕ અપૂરતું અને જૂનું વેતન ધોરણ', oldX + 35, topY + cardH - 35);

          // Right: New Salary Card (Massive Bold Orange Amount)
          const newX = 990;
          ctx.fillStyle = '#FFFBEB';
          ctx.fillRect(newX, topY, cardW, cardH);
          ctx.strokeStyle = '#EA580C';
          ctx.lineWidth = 5;
          ctx.strokeRect(newX, topY, cardW, cardH);

          // New Badge
          ctx.fillStyle = '#FFEDD5';
          ctx.fillRect(newX + 30, topY + 30, 400, 48);
          ctx.fillStyle = '#C2410C';
          ctx.font = 'bold 24px "Noto Sans Gujarati", sans-serif';
          ctx.fillText(slide.comparison?.newTitle || 'નવો પગાર (હાઇકોર્ટ આદેશ)', newX + 45, topY + 63);

          // Giant Bold Orange Amount
          ctx.fillStyle = '#EA580C';
          ctx.font = 'bold 115px "Noto Sans Gujarati", sans-serif';
          ctx.fillText(slide.comparison?.newAmount || '₹૨૪,૮૦૦', newX + 35, topY + 215);

          // New Description
          ctx.fillStyle = '#334155';
          ctx.font = 'bold 32px "Noto Sans Gujarati", sans-serif';
          wrapCanvasText(ctx, slide.comparison?.newDesc || 'લઘુતમ વેતન ધારા હેઠળ નિર્ધારિત પગાર દર', newX + 35, topY + 295, cardW - 70, 44, 2);

          // Approved Status Pill
          ctx.fillStyle = '#16A34A';
          ctx.font = 'bold 28px "Noto Sans Gujarati", sans-serif';
          ctx.fillText('✓ હાઇકોર્ટ LPA 363/2025 આદેશ મંજૂર', newX + 35, topY + cardH - 35);

          // Bottom Highlight Strip
          const bannerY = topY + cardH + 16;
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(60, bannerY, 1800, 68);
          ctx.fillStyle = '#10B981';
          ctx.fillRect(60, bannerY, 14, 68);
          ctx.fillStyle = '#34D399';
          ctx.font = 'bold 32px "Noto Sans Gujarati", sans-serif';
          ctx.fillText(`⚡ ${slide.comparison?.diffNote || 'સીધો માસિક ₹૧૪,૮૦૦ નો ઐતિહાસિક વધારો!'}`, 95, bannerY + 45);

        } else if (slide.layoutType === 'formula') {
          // FORMULA LAYOUT (Equation Breakdown: [Navy] + [Orange] = [Green])
          const topY = contentStartY + 30;
          const boxH = 340;
          const boxW = 480;

          // Box 1: Navy
          const b1X = 60;
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(b1X, topY, boxW, boxH);
          ctx.strokeStyle = '#2563EB';
          ctx.lineWidth = 4;
          ctx.strokeRect(b1X, topY, boxW, boxH);
          ctx.fillStyle = '#93C5FD';
          ctx.font = 'bold 26px "Noto Sans Gujarati", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(slide.formula?.block1?.title || 'મૂળ માનદ વેતન', b1X + (boxW / 2), topY + 60);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 72px "Noto Sans Gujarati", sans-serif';
          ctx.fillText(slide.formula?.block1?.amount || '₹૧૦,૦૦૦', b1X + (boxW / 2), topY + 180);
          ctx.fillStyle = '#CBD5E1';
          ctx.font = 'bold 24px "Noto Sans Gujarati", sans-serif';
          ctx.fillText(slide.formula?.block1?.desc || 'હાલનું બેઝિક માનદ વેતન', b1X + (boxW / 2), topY + 260);

          // Operator 1: Plus
          ctx.fillStyle = '#EA580C';
          ctx.beginPath();
          ctx.arc(600, topY + (boxH / 2), 44, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 54px sans-serif';
          ctx.fillText('+', 600, topY + (boxH / 2) + 18);

          // Box 2: Orange
          const b2X = 660;
          ctx.fillStyle = '#C2410C';
          ctx.fillRect(b2X, topY, boxW, boxH);
          ctx.strokeStyle = '#F97316';
          ctx.lineWidth = 4;
          ctx.strokeRect(b2X, topY, boxW, boxH);
          ctx.fillStyle = '#FED7AA';
          ctx.font = 'bold 26px "Noto Sans Gujarati", sans-serif';
          ctx.fillText(slide.formula?.block2?.title || 'લઘુતમ વેતન તફાવત', b2X + (boxW / 2), topY + 60);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 72px "Noto Sans Gujarati", sans-serif';
          ctx.fillText(slide.formula?.block2?.amount || '₹૧૪,૮૦૦', b2X + (boxW / 2), topY + 180);
          ctx.fillStyle = '#FFEDD5';
          ctx.font = 'bold 24px "Noto Sans Gujarati", sans-serif';
          ctx.fillText(slide.formula?.block2?.desc || 'હાઇકોર્ટ નિર્દેશિત તફાવત', b2X + (boxW / 2), topY + 260);

          // Operator 2: Equals
          ctx.fillStyle = '#16A34A';
          ctx.beginPath();
          ctx.arc(1200, topY + (boxH / 2), 44, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 54px sans-serif';
          ctx.fillText('=', 1200, topY + (boxH / 2) + 18);

          // Box 3: Emerald
          const b3X = 1260;
          const b3W = 600;
          ctx.fillStyle = '#15803D';
          ctx.fillRect(b3X, topY - 15, b3W, boxH + 30);
          ctx.strokeStyle = '#4ADE80';
          ctx.lineWidth = 5;
          ctx.strokeRect(b3X, topY - 15, b3W, boxH + 30);
          ctx.fillStyle = '#BBF7D0';
          ctx.font = 'bold 28px "Noto Sans Gujarati", sans-serif';
          ctx.fillText(slide.formula?.block3?.title || 'કુલ માસિક વેતન', b3X + (b3W / 2), topY + 60);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 84px "Noto Sans Gujarati", sans-serif';
          ctx.fillText(slide.formula?.block3?.amount || '₹૨૪,૮૦૦', b3X + (b3W / 2), topY + 190);
          ctx.fillStyle = '#DCFCE7';
          ctx.font = 'bold 26px "Noto Sans Gujarati", sans-serif';
          ctx.fillText(slide.formula?.block3?.desc || 'કુલ ચૂકવવાપાત્ર લઘુતમ વેતન', b3X + (b3W / 2), topY + 275);
          ctx.textAlign = 'left';

          // Bottom Detail Box
          const noteY = topY + boxH + 50;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(60, noteY, 1800, 160);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(60, noteY, 1800, 160);
          ctx.fillStyle = '#2563EB';
          ctx.fillRect(60, noteY, 12, 160);
          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 30px "Noto Sans Gujarati", sans-serif';
          wrapCanvasText(ctx, '⚖️ હાઇકોર્ટ ડિવિઝન બેંચ ગણતરી: આંગણવાડી કાર્યકરો કાયમી વર્ગ-૩ અને વર્ગ-૪ ની સમકક્ષ કામગીરી કરતા હોવાથી તેમને લઘુતમ વેતન ધારા હેઠળ માસિક ₹૨૪,૮૦૦ મળવાપાત્ર થાય છે.', 95, noteY + 55, 1720, 48, 2);

        } else if (slide.layoutType === 'timeline') {
          // TIMELINE LAYOUT (Horizontal Milestone Arrows)
          const topY = contentStartY + 30;
          const cardW = 520;
          const cardH = 580;

          // Step 1
          const s1X = 60;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(s1X, topY, cardW, cardH);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 3;
          ctx.strokeRect(s1X, topY, cardW, cardH);
          ctx.fillStyle = '#2563EB';
          ctx.fillRect(s1X, topY, cardW, 14);

          ctx.fillStyle = '#EFF6FF';
          ctx.fillRect(s1X + 24, topY + 30, 120, 40);
          ctx.fillStyle = '#1D4ED8';
          ctx.font = 'bold 22px "Noto Sans Gujarati", sans-serif';
          ctx.fillText('પગલું ૧', s1X + 45, topY + 58);

          ctx.fillStyle = '#1E3A8A';
          ctx.font = 'bold 44px "Noto Sans Gujarati", sans-serif';
          ctx.fillText('૧ એપ્રિલ ૨૦૨૫', s1X + 24, topY + 130);

          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 34px "Noto Sans Gujarati", sans-serif';
          ctx.fillText('નવા પગારનો અમલ', s1X + 24, topY + 185);

          ctx.fillStyle = '#475569';
          ctx.font = 'bold 28px "Noto Sans Gujarati", sans-serif';
          wrapCanvasText(ctx, 'આ તારીખથી નવું લઘુતમ વેતન ધોરણ લાગુ કરવાનો હાઇકોર્ટનો સ્પષ્ટ આદેશ', s1X + 24, topY + 260, cardW - 48, 42, 4);

          ctx.fillStyle = '#2563EB';
          ctx.font = 'bold 24px "Noto Sans Gujarati", sans-serif';
          ctx.fillText('✓ સત્તાવાર અમલીકરણ મુદત', s1X + 24, topY + cardH - 30);

          // Arrow 1
          ctx.fillStyle = '#EA580C';
          ctx.font = 'bold 64px sans-serif';
          ctx.fillText('➔', 620, topY + 280);

          // Step 2
          const s2X = 690;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(s2X, topY, cardW, cardH);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 3;
          ctx.strokeRect(s2X, topY, cardW, cardH);
          ctx.fillStyle = '#EA580C';
          ctx.fillRect(s2X, topY, cardW, 14);

          ctx.fillStyle = '#FFF7ED';
          ctx.fillRect(s2X + 24, topY + 30, 120, 40);
          ctx.fillStyle = '#C2410C';
          ctx.font = 'bold 22px "Noto Sans Gujarati", sans-serif';
          ctx.fillText('પગલું ૨', s2X + 45, topY + 58);

          ctx.fillStyle = '#C2410C';
          ctx.font = 'bold 44px "Noto Sans Gujarati", sans-serif';
          ctx.fillText('૬ મહિનાનો સમય', s2X + 24, topY + 130);

          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 34px "Noto Sans Gujarati", sans-serif';
          ctx.fillText('નીતિ નિયમો ઘડતર', s2X + 24, topY + 185);

          ctx.fillStyle = '#475569';
          ctx.font = 'bold 28px "Noto Sans Gujarati", sans-serif';
          wrapCanvasText(ctx, 'રાજ્ય સરકાર દ્વારા વહીવટી અને બજેટ જોગવાઈ પૂર્ણ કરવા માટે અપાયેલી મુદત', s2X + 24, topY + 260, cardW - 48, 42, 4);

          ctx.fillStyle = '#EA580C';
          ctx.font = 'bold 24px "Noto Sans Gujarati", sans-serif';
          ctx.fillText('✓ સરકાર માટે સમયગાળો', s2X + 24, topY + cardH - 30);

          // Arrow 2
          ctx.fillStyle = '#16A34A';
          ctx.font = 'bold 64px sans-serif';
          ctx.fillText('➔', 1250, topY + 280);

          // Step 3
          const s3X = 1320;
          const s3W = 540;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(s3X, topY, s3W, cardH);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 3;
          ctx.strokeRect(s3X, topY, s3W, cardH);
          ctx.fillStyle = '#16A34A';
          ctx.fillRect(s3X, topY, s3W, 14);

          ctx.fillStyle = '#F0FDF4';
          ctx.fillRect(s3X + 24, topY + 30, 120, 40);
          ctx.fillStyle = '#15803D';
          ctx.font = 'bold 22px "Noto Sans Gujarati", sans-serif';
          ctx.fillText('પગલું ૩', s3X + 45, topY + 58);

          ctx.fillStyle = '#15803D';
          ctx.font = 'bold 44px "Noto Sans Gujarati", sans-serif';
          ctx.fillText('એરિયર્સ ચૂકવણી', s3X + 24, topY + 130);

          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 34px "Noto Sans Gujarati", sans-serif';
          ctx.fillText('તમામ બાકી રકમ જમા', s3X + 24, topY + 185);

          ctx.fillStyle = '#475569';
          ctx.font = 'bold 28px "Noto Sans Gujarati", sans-serif';
          wrapCanvasText(ctx, 'મુદત પૂર્ણ થયે પાછલી બાકી નીકળતી એરિયર્સ રકમ સીધી બેંક ખાતામાં જમા', s3X + 24, topY + 260, s3W - 48, 42, 4);

          ctx.fillStyle = '#16A34A';
          ctx.font = 'bold 24px "Noto Sans Gujarati", sans-serif';
          ctx.fillText('✓ સીધા બેંક ખાતામાં ચૂકવણી', s3X + 24, topY + cardH - 30);

        } else if (slide.layoutType === 'cards') {
          // 3 VERTICAL CARDS LAYOUT
          const cardX = 60;
          const totalW = 1800;
          const bullets = Array.isArray(slide.bulletPoints) ? slide.bulletPoints : [];
          const cardCount = Math.min(3, Math.max(1, bullets.length));
          const cardGap = 24;
          const cardW = Math.floor((totalW - ((cardCount - 1) * cardGap)) / cardCount);
          const topY = contentStartY + 30;
          const cardH = 680;

          bullets.slice(0, 3).forEach((pt, bIdx) => {
            const cx = cardX + (bIdx * (cardW + cardGap));
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(cx, topY, cardW, cardH);
            ctx.strokeStyle = '#CBD5E1';
            ctx.lineWidth = 3;
            ctx.strokeRect(cx, topY, cardW, cardH);

            const topColor = bIdx === 0 ? '#2563EB' : (bIdx === 1 ? '#10B981' : '#F59E0B');
            ctx.fillStyle = topColor;
            ctx.fillRect(cx, topY, cardW, 14);

            ctx.fillStyle = '#64748B';
            ctx.font = 'bold 24px "Noto Sans Gujarati", sans-serif';
            ctx.fillText(`મુદ્દો #${bIdx + 1}`, cx + 24, topY + 54);

            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 36px "Noto Sans Gujarati", sans-serif';
            const cleanPt = String(pt).replace(/^[•\-\*0-9\.\)]+\s*/, '').trim();
            wrapCanvasText(ctx, cleanPt, cx + 24, topY + 120, cardW - 48, 48, 6);

            ctx.fillStyle = '#16A34A';
            ctx.font = 'bold 24px "Noto Sans Gujarati", sans-serif';
            ctx.fillText('✓ સત્તાવાર નિયમ', cx + 24, topY + cardH - 30);
          });

        } else {
          // DEFAULT: DUAL-PANE (PHOTO LEFT, 3 CARDS RIGHT)
          const photoX = 60;
          const photoY = contentStartY;
          const photoW = 780;
          const photoH = 990 - contentStartY;

          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(photoX, photoY, photoW, photoH);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 3;
          ctx.strokeRect(photoX, photoY, photoW, photoH);

          // Photo Top Badge
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(photoX, photoY, photoW, 52);
          const preset = REALISTIC_PHOTO_PRESETS.find(p => p.id === slide.photoType) || REALISTIC_PHOTO_PRESETS[0];
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 24px "Noto Sans Gujarati", sans-serif';
          ctx.fillText(preset.badge, photoX + 20, photoY + 36);

          ctx.fillStyle = '#38BDF8';
          ctx.font = 'bold 20px "Noto Sans Gujarati", sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText('✓ વાસ્તવિક ફોટો', photoX + photoW - 20, photoY + 36);
          ctx.textAlign = 'left';

          // Photo Caption Bar at Bottom of Photo
          const captionH = 52;
          const captionY = photoY + photoH - captionH;
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(photoX, captionY, photoW, captionH);
          ctx.fillStyle = '#F8FAFC';
          ctx.font = 'bold 22px "Noto Sans Gujarati", sans-serif';
          ctx.textAlign = 'center';
          const caption = slide.photoCaption || preset.desc;
          ctx.fillText(caption.length > 45 ? caption.substring(0, 45) + '...' : caption, photoX + (photoW / 2), captionY + 33);
          ctx.textAlign = 'left';

          // Photo Visual Image
          const imgInnerY = photoY + 52;
          const imgInnerH = photoH - 52 - captionH;
          if (loadedImg && loadedImg.width > 0) {
            ctx.drawImage(loadedImg, photoX + 2, imgInnerY, photoW - 4, imgInnerH);
          } else {
            ctx.fillStyle = '#E2E8F0';
            ctx.fillRect(photoX + 2, imgInnerY, photoW - 4, imgInnerH);
          }

          // 4. RIGHT COLUMN: 3 DISTINCT WHITE CARDS WITH ROYAL BLUE ACCENT
          const cardX = 870;
          const cardW = 990;
          const bullets = Array.isArray(slide.bulletPoints) ? slide.bulletPoints : [];
          const cardCount = Math.min(3, Math.max(1, bullets.length));
          const availH = 990 - contentStartY;
          const cardGap = 16;
          const cardH = Math.floor((availH - ((cardCount - 1) * cardGap)) / cardCount);

          bullets.slice(0, 3).forEach((pt, bIdx) => {
            const cy = contentStartY + (bIdx * (cardH + cardGap));

            // Card pure white body
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(cardX, cy, cardW, cardH);
            ctx.strokeStyle = '#E2E8F0';
            ctx.lineWidth = 3;
            ctx.strokeRect(cardX, cy, cardW, cardH);

            // Royal Blue Left Accent Bar
            ctx.fillStyle = '#2563EB';
            ctx.fillRect(cardX, cy, 14, cardH);

            // Number Badge Pill
            ctx.fillStyle = '#EFF6FF';
            ctx.fillRect(cardX + 28, cy + 24, 46, 46);
            ctx.strokeStyle = '#BFDBFE';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(cardX + 28, cy + 24, 46, 46);

            ctx.fillStyle = '#1D4ED8';
            ctx.font = 'bold 28px sans-serif';
            ctx.fillText(`${bIdx + 1}`, cardX + 43, cy + 57);

            // Card Main Gujarati Bold Text
            ctx.fillStyle = '#0F172A';
            ctx.font = 'bold 34px "Noto Sans Gujarati", sans-serif';
            const cleanPt = String(pt).replace(/^[•\-\*0-9\.\)]+\s*/, '').trim();
            wrapCanvasText(ctx, cleanPt, cardX + 95, cy + 58, cardW - 120, 48, 3);
          });
        }

        // 5. SLIDE BOTTOM FOOTER STRIP
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 1010, 1920, 70);

        ctx.fillStyle = '#CBD5E1';
        ctx.font = 'bold 24px "Noto Sans Gujarati", sans-serif';
        ctx.fillText(`📢 મુખ્ય જાહેરાત & સત્તાવાર પરિપત્ર: ${topicName} • સત્તાવાર સરકારી વિશ્લેષણ`, 60, 1052);

        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`1080p Full HD • શુદ્ધ સફેદ સ્લાઇડ • વાસ્તવિક ફોટો (${sIdx + 1} / ${slidesList.length})`, 1860, 1052);
        ctx.textAlign = 'left';

        // Trigger instant browser download
        const safeTitle = (topicName || 'Slide').replace(/[^a-zA-Z0-9\u0A80-\u0AFF]/g, '_').substring(0, 30);
        const link = document.createElement('a');
        link.download = `Slide_${sIdx + 1}_${safeTitle}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showNoticeToast(`✓ સ્લાઇડ #${sIdx + 1} (1080p HD PNG) ડાઉનલોડ થઈ ગઈ!`, 'success');
      };

      const imgSrc = slide.imageUrl || getPhotoPresetDataUrl(slide.photoType || 'sachivalaya');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => finalizeDraw(img);
      img.onerror = () => finalizeDraw(null);
      img.src = imgSrc;
    } catch (err) {
      console.error('[SlidePrompts Export PNG Error]:', err);
      showNoticeToast('સ્લાઇડ ડાઉનલોડ કરવામાં ક્ષતિ આવી.', 'error');
    }
  }

  // Initial render
  render();
}
