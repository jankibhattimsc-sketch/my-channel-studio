/**
 * Multi-Project State Manager (v3)
 * Supports multiple isolated video projects:
 * Idea ➔ Slide ➔ Script ➔ Voice ➔ Editing ➔ Canva ➔ SEO ➔ Thumbnail
 * Auto-saves per-project and restores work upon reopening.
 */

import { saveProjectAudioRecord, getProjectAudioRecord } from './audioStorage.js';
import { firebaseService } from './firebaseService.js';
import { parseChatGptScriptText, segmentContinuousScriptAcrossSlides } from './externalSlideParser.js';
import {
  classifyTopicDomain,
  deriveAudienceFromTopic,
  deriveSlideOutline,
  generateClientNotebookLMPrompt
} from './notebooklmPromptGenerator.js';

const STORAGE_PROJECTS_KEY = 'gyan_yatra_projects_v3';
const STORAGE_ACTIVE_ID_KEY = 'gyan_yatra_active_project_id_v3';
const LEGACY_KEY = 'gyan_yatra_active_project';
export const STORAGE_FOLDERS_KEY = 'gyan_yatra_custom_folders_v1';
export const STORAGE_ACTIVE_FOLDER_KEY = 'gyan_yatra_active_folder_id_v1';

export const DEFAULT_FOLDERS = [
  { id: 'f_all', name: '📁 બધા ફોલ્ડર્સ', color: '#38bdf8', isSystem: true },
  { id: 'f_default', name: '📁 મુખ્ય ફોલ્ડર (Main Folder)', color: '#10b981', isDefault: true },
  { id: 'f_yojana', name: '🏛️ સરકારી યોજનાઓ', color: '#f59e0b' },
  { id: 'f_bharti', name: '📋 સરકારી ભરતી & પરિપત્ર', color: '#8b5cf6' }
];

export const STEP_METADATA = {
  topics: { id: 'topics', num: 1, name: 'Idea', nameGuj: '૧. આઈડિયા & વિષય', icon: '💡' },
  slideprompts: { id: 'slideprompts', num: 2, name: 'Slides', nameGuj: '૨. સ્લાઇડ્સ & PPT', icon: '📑' },
  scriptwriter: { id: 'scriptwriter', num: 3, name: 'Script', nameGuj: '૩. સ્ક્રિપ્ટ રાઇટર', icon: '📝' },
  myvoice: { id: 'myvoice', num: 4, name: 'Voice', nameGuj: '૪. અવાજ રેકોર્ડિંગ', icon: '🎙️' },
  editing: { id: 'editing', num: 5, name: 'Editing', nameGuj: '૫. એડિટિંગ ગાઇડ', icon: '🎬' },
  canva: { id: 'canva', num: 6, name: 'Canva', nameGuj: '૬. કેન્વા ગ્રાફિક્સ', icon: '🎨' },
  seodescription: { id: 'seodescription', num: 7, name: 'SEO', nameGuj: '૭. SEO & ટાઇટલ', icon: '🚀' },
  seo: { id: 'seo', num: 8, name: 'Thumbnail', nameGuj: '૮. થંબનેલ પ્લાન', icon: '🖼️' },
  slideeditor: { id: 'slideeditor', num: 2, name: 'SlideEditor', nameGuj: 'સ્લાઇડ એડિટર', icon: '🖥️' },
  workspace: { id: 'workspace', num: 0, name: 'Workspace', nameGuj: 'પ્રોજેક્ટ વર્કસ્પેસ', icon: '🌐' }
};

export function createBlankProject(name = '', topic = '', category = 'સરકારી યોજના', folderId = 'f_default', folderName = '📁 મુખ્ય ફોલ્ડર') {
  const pId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const pTopic = topic || name || 'નવો વિડીયો વિષય ' + new Date().toLocaleDateString('gu-IN');
  const pName = name || pTopic;
  const safeName = pName.replace(/[\s/\\?%*:|"<>]+/g, '_').substring(0, 40);

  return {
    id: pId,
    name: pName,
    topic: pTopic,
    category: category,
    folderId: folderId || 'f_default',
    folderName: folderName || '📁 મુખ્ય ફોલ્ડર',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastStep: 'topics', // Track exact tool where user stopped
    uploads: [], // Canva-style uploaded assets for THIS specific project (PPT, Script, Audio, Images)
    ideas: [], // Rich multiple ideas collection for this specific project
    
    // Project-Centric Workspace Stop-and-Resume State
    workspaceState: {
      activeSection: 'overview', // 'overview' | 'ideas' | 'slideprompt' | 'slides' | 'script' | 'scripteditor' | 'thumbnail' | 'seo' | 'voice' | 'finaloutput' | 'publishing'
      lastSlideIndex: 0,
      lastScriptSectionIdx: 0,
      lastSelectedThumbId: null,
      lastSEODraftId: null,
      scrollOffset: 0,
      completionStatus: {
        ideas: false,
        slidePrompt: false,
        slides: false,
        script: false,
        scriptEditor: false,
        thumbnail: false,
        seo: false,
        voice: false,
        finalOutput: false,
        publishing: false
      },
      lastSavedAt: new Date().toISOString()
    },

    // Dedicated Version History (never lose old work)
    versionHistory: {
      slides: [],
      scripts: [],
      slidePrompts: [],
      thumbnails: [],
      seo: []
    },

    // 8 Core Tools State
    idea: {
      topic: pTopic,
      masterPrompt: '',
      notes: '',
      isCompleted: false
    },
    slide: {
      customName: '',
      tool2Prompt: '',
      slideCount: '8-10',
      template: 'white-real',
      notes: '',
      pdfName: '',
      pdfText: '',
      importedPresentation: null,
      slides: [],
      isCompleted: false
    },
    script: {
      customName: `${safeName}_script.txt`,
      title: pName + ': સત્તાવાર માહિતી',
      durationMinutes: 10,
      fullText: '',
      teleprompterText: '',
      pdfName: '',
      pdfText: '',
      sections: [],
      isCompleted: false
    },
    voice: {
      customName: `${safeName}_voice.wav`,
      audioUrl: '',
      filename: `${safeName}_voice.wav`,
      duration: 0,
      hasSavedAudio: false,
      provider: '🎙️ My Studio Voice (Recorded Live)',
      slideRecordings: [],
      notes: '',
      isCompleted: false
    },
    editing: {
      aspectRatio: '16:9',
      fps: '30fps',
      resolution: '1080p Full HD',
      musicStyle: 'સોફ્ટ ઇન્સ્પિરેશનલ ન્યૂઝ ટોન (Soft News Tone)',
      customNotes: '• Intro 0:50 સુધી હૂક રાખવો\n• વચ્ચે સ્લાઇડ ચેન્જ વખતે ડીંગ સાઉન્ડ\n• સરકારી પરિપત્ર પર હાઇલાઇટ યલો બોક્સ કરવું',
      timeline: null,
      exportHistory: [],
      checklist: {
        introHook: false,
        cutDeadSpace: false,
        addSlides: false,
        soundFx: false,
        colorCorrection: false,
        outroSubscribe: false
      },
      isCompleted: false
    },
    canva: {
      headline: pName,
      subtitle: 'સત્તાવાર પરિપત્ર & સંપૂર્ણ વિગત | જ્ઞાન યાત્રા',
      badgeText: '🔥 નવી જાહેરાત',
      designUrl: 'https://www.canva.com/create/youtube-thumbnails/',
      notes: '',
      isCompleted: false
    },
    seo: {
      title: `${pName} 2026: સત્તાવાર પરિપત્ર જાહેર!`,
      description: `સત્તાવાર નિર્ણય અને નવી વિગત આ વિડીયોમાં વિગતવાર સમજો.\n\n📌 મુખ્ય ટાઇમસ્ટેમ્પ:\n00:00 - પરિચય\n00:50 - સત્તાવાર વિગત\n03:30 - લાભાર્થી વિગત\n07:00 - સમાપન\n\n#GyanYatra #GujaratGovt #GujaratNews`,
      tags: `${pName.toLowerCase()}, gujarat news, gyan yatra, gujarat update 2026, official circular`,
      pinnedComment: `📌 સત્તાવાર પરિપત્ર અને ફોર્મ લિંક માટે કોમેન્ટ કરો અથવા ટેલિગ્રામ ગ્રૂપ જોઈન કરો! આપણી ચેનલ જ્ઞાન યાત્રાને સબ્સ્ક્રાઇબ કરો.`,
      isCompleted: false
    },
    thumbnail: {
      customName: `${safeName}_thumbnail.png`,
      gujaratiWords: pName.length > 25 ? pName.substring(0, 25) : pName,
      photoSubject: 'સત્તાવાર જાહેરાત સંદર્ભ ફોટો',
      dalleShortPrompt: `A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: One authentic real photograph related to ${pName}. On the right: Exactly 4 large bold text words in deep navy blue. High contrast, clean, photorealistic, zero clutter.`,
      notes: '',
      isCompleted: false
    }
  };
}

export function isContentMatchingTopic(contentOrObject, targetTopic) {
  if (!contentOrObject) return false;
  if (!targetTopic) return true;
  const target = String(targetTopic).toLowerCase().trim();

  // If passed an object representing a user-uploaded presentation
  if (typeof contentOrObject === 'object' && contentOrObject !== null) {
    if (contentOrObject.isUserUploaded || (contentOrObject.projectId && (contentOrObject.slidesCount > 0 || Array.isArray(contentOrObject.slides)))) {
      return true;
    }
  }

  // If the content is a string and matches generic presentation / export filenames,
  // it is valid for ANY topic (e.g. NotebookLM.pdf, Presentation.pdf, slides.pdf, Untitled presentation.pdf)
  if (typeof contentOrObject === 'string') {
    const rawStr = contentOrObject.trim();
    if (/\.(?:pdf|pptx?)$/i.test(rawStr)) {
      const base = rawStr.replace(/\.(?:pdf|pptx?)$/i, '').toLowerCase();
      if (/(?:notebooklm|presentation|slides?|document|export|untitled|deck|file|source|pdf|powerpoint)/i.test(base)) {
        return true;
      }
    }
  }

  // If passed an object with slides array, prioritize slides content for domain matching
  let content = '';
  if (typeof contentOrObject === 'object' && contentOrObject !== null) {
    if (Array.isArray(contentOrObject.slides) && contentOrObject.slides.length > 0) {
      content = JSON.stringify(contentOrObject.slides).toLowerCase();
    } else {
      content = JSON.stringify(contentOrObject).toLowerCase();
    }
  } else {
    content = String(contentOrObject).toLowerCase();
  }

  const isAnganwadi = target.includes('આંગણવાડી') || target.includes('anganwadi') || target.includes('તેડાગર');
  const isDa = target.includes('મોંઘવારી') || target.includes('da') || target.includes('પગાર');
  const isKisan = target.includes('કિસાન') || target.includes('kisan') || target.includes('મોદી') || target.includes('હપ્તો');
  const isGsrtc = target.includes('gsrtc') || target.includes('એસટી') || target.includes('કંડક્ટર') || target.includes('ડ્રાઈવર');
  const isPolice = target.includes('પોલીસ') || target.includes('police') || target.includes('કોન્સ્ટેબલ') || target.includes('psi');
  const isTet = target.includes('tet') || target.includes('ટેટ') || target.includes('વિદ્યાસહાયક') || target.includes('શિક્ષક');
  const isRation = target.includes('રેશનકાર્ડ') || target.includes('અનાજ');
  const isVidhva = target.includes('વિધવા') || target.includes('ગંગા સ્વરૂપા');
  const isMameru = target.includes('મામેરું') || target.includes('કુંવરબાઈ');
  const isCyber = target.includes('સાયબર') || target.includes('૧૯૩૦');

  // Exclusion check: if content explicitly belongs to a known topic that does NOT match target
  const contentHasAnganwadi = content.includes('આંગણવાડી') || content.includes('anganwadi') || content.includes('તેડાગર');
  const contentHasDa = content.includes('મોંઘવારી') || content.includes('da_hike') || content.includes('da hike');
  const contentHasKisan = content.includes('કિસાન') || content.includes('kisan');
  const contentHasGsrtc = content.includes('gsrtc') || content.includes('એસટી નિગમ') || content.includes('કંડક્ટર');
  const contentHasPolice = content.includes('કોન્સ્ટેબલ') || (content.includes('police') && !content.includes('verification')) || (content.includes('પોલીસ') && !content.includes('ચકાસણી'));
  const contentHasTet = content.includes('ટેટ') || content.includes('tet') || content.includes('વિદ્યાસહાયક');
  const contentHasRation = content.includes('રેશનકાર્ડ');
  const contentHasVidhva = content.includes('વિધવા') || content.includes('ગંગા સ્વરૂપા');
  const contentHasMameru = content.includes('મામેરું') || content.includes('કુંવરબાઈ');
  const contentHasCyber = content.includes('સાયબર') || content.includes('૧૯૩૦');

  if (contentHasAnganwadi && !isAnganwadi) return false;
  if (contentHasDa && !isDa) return false;
  if (contentHasKisan && !isKisan) return false;
  if (contentHasGsrtc && !isGsrtc) return false;
  if (contentHasPolice && !isPolice) return false;
  if (contentHasTet && !isTet) return false;
  if (contentHasRation && !isRation) return false;
  if (contentHasVidhva && !isVidhva) return false;
  if (contentHasMameru && !isMameru) return false;
  if (contentHasCyber && !isCyber) return false;

  // Affirmative match: check if key domain phrases appear
  if (isAnganwadi) return content.includes('આંગણવાડી') || content.includes('તેડાગર') || content.includes('માનદવેતન') || content.includes('સુપરવાઈઝર') || content.includes('અરજી');
  if (isDa) return content.includes('મોંઘવારી') || content.includes('da') || content.includes('પગાર') || content.includes('એરિયર્સ');
  if (isKisan) return content.includes('કિસાન') || content.includes('kisan') || content.includes('હપ્તો') || content.includes('મોદી') || content.includes('e-kyc');
  if (isGsrtc) return content.includes('gsrtc') || content.includes('એસટી') || content.includes('કંડક્ટર') || content.includes('ડ્રાઈવર');
  if (isPolice) return content.includes('પોલીસ') || content.includes('કોન્સ્ટેબલ') || content.includes('psi') || content.includes('pet/pst');
  if (isTet) return content.includes('tet') || content.includes('ટેટ') || content.includes('વિદ્યાસહાયક') || content.includes('શિક્ષક');
  if (isRation) return content.includes('રેશનકાર્ડ') || content.includes('અનાજ');
  if (isVidhva) return content.includes('વિધવા') || content.includes('ગંગા સ્વરૂપા');
  if (isMameru) return content.includes('મામેરું') || content.includes('કુંવરબાઈ');
  if (isCyber) return content.includes('સાયબર') || content.includes('૧૯૩૦');

  // Universal presentation keywords: If content contains universal government announcement terminology, consider it valid
  const hasUniversalPresText = content.includes('પરિપત્ર') || content.includes('સત્તાવાર') || content.includes('જાહેરાત') || content.includes('નિયમો') || content.includes('લાભાર્થી') || content.includes('અરજી') || content.includes('યોજના') || content.includes('માહિતી') || content.includes('સરકાર') || content.includes('ગુજરાત') || content.includes('સ્લાઇડ') || content.includes('પરીક્ષા') || content.includes('ભરતી') || content.includes('નિર્ણય');
  if (hasUniversalPresText) return true;

  // Fallback keyword matching
  const words = target.split(/[\s,–—\-_:()]+/).filter(w => w.length >= 2);
  if (words.some(w => content.includes(w))) return true;

  // If content contains actual structured slides, accept them
  if (typeof contentOrObject === 'object' && contentOrObject !== null && Array.isArray(contentOrObject.slides) && contentOrObject.slides.length > 0) {
    return true;
  }

  return false;
}

/**
 * Builds a complete 100% synchronized project kit for ANY given topic:
 * - Slides outline matching topic domain (Scheme, Bharti, Anganwadi, Kisan, etc.)
 * - Rich slide-wise spoken script in authentic Gujarati
 * - Slide prompts for NotebookLM / Gamma
 * - SEO package (Title, Description, Tags) matching topic
 * - Thumbnail package matching topic
 * - Cleanses foreign video/audio cache so no old topic ever leaks in!
 */
export function buildTopicProjectKit(topicName = '', topicId = '', existingProject = null) {
  const cleanTitle = (topicName || '').trim() || 'ગુજરાત નવી સરકારી યોજના ૨૦૨૬';
  let cleanTid = topicId;
  if (typeof cleanTid === 'object' && cleanTid !== null) {
    cleanTid = cleanTid.topicId || cleanTid.id || '';
  }
  const tid = String(cleanTid || existingProject?.topicId || existingProject?.id || `topic_${Date.now()}`);
  const domain = classifyTopicDomain(cleanTitle);
  const audience = deriveAudienceFromTopic(cleanTitle, domain);
  const slideOutline = deriveSlideOutline(cleanTitle, domain, '8-10', audience);

  const slideDeck = slideOutline.map((s, idx) => {
    const sNum = s.num || (idx + 1);
    const sId = `slide_${tid}_${sNum}`;
    const defaultPoints = (Array.isArray(s.points) && s.points.length > 0)
      ? s.points
      : [
          `${cleanTitle} અંગે મહત્વપૂર્ણ વિગત`,
          `સત્તાવાર પરિપત્ર અને નિયમો ૨૦૨૬`,
          `પાત્રતા અને જરૂરી ડોક્યુમેન્ટ્સ`,
          `લાભાર્થીઓ માટે સ્ટેપ-બાય-સ્ટેપ માહિતી`
        ];
    const defaultVoiceover = s.voiceover || `સ્લાઇડ #${sNum}: ${s.title} વિશે સત્તાવાર પરિપત્ર મુજબ સંપૂર્ણ વિગતવાર માહિતી.`;

    return {
      slideNumber: sNum,
      pageNumber: sNum,
      slideId: sId,
      id: sId,
      title: s.title || `સ્લાઇડ #${sNum}`,
      subtitle: `${cleanTitle} • સ્લાઇડ #${sNum}`,
      bulletPoints: defaultPoints,
      scriptText: defaultVoiceover,
      visual: s.visual || '',
      bgColor: '#FFFFFF',
      textColor: '#0F172A',
      notes: `સ્લાઇડ #${sNum}: ${s.title}`,
      imageUrl: null
    };
  });

  const scriptSections = slideDeck.map((sl, idx) => {
    const startMin = Math.floor((idx * 45) / 60);
    const startSec = (idx * 45) % 60;
    const endMin = Math.floor(((idx + 1) * 45) / 60);
    const endSec = ((idx + 1) * 45) % 60;
    const pad = n => (n < 10 ? '0' : '') + n;
    return {
      slideId: sl.slideId,
      slideNumber: sl.slideNumber,
      sectionName: sl.title,
      title: sl.title,
      subtitle: sl.subtitle,
      timeRange: `${startMin}:${pad(startSec)} - ${endMin}:${pad(endSec)}`,
      content: sl.scriptText,
      scriptText: sl.scriptText,
      bulletPoints: sl.bulletPoints,
      directorNotes: `કેમેરા સામે કુદરતી અવાજે રજૂઆત. સ્લાઇડ #${sl.slideNumber} દર્શાવવી.`
    };
  });

  const fullScriptText = scriptSections.map(s => `[સ્લાઇડ #${s.slideNumber}: ${s.sectionName}]\n${s.scriptText}`).join('\n\n');

  // Slide prompt for NotebookLM / Gamma
  const tool2Prompt = generateClientNotebookLMPrompt({
    topic: cleanTitle,
    slideCount: `${slideDeck.length} સ્લાઇડ્સ`,
    audience
  });

  // SEO Package
  const seo = {
    title: `${cleanTitle} | સત્તાવાર પરિપત્ર અને નિયમો ૨૦૨૬`,
    description: `આ વિડીયોમાં "${cleanTitle}" વિશે સત્તાવાર પરિપત્ર, પાત્રતા, નિયમો, અરજી પદ્ધતિ અને લાભાર્થીઓની વિગતો સરળ ગુજરાતીમાં સમજાવેલ છે. સંપૂર્ણ વિશ્લેષણ જુઓ.`,
    tags: [
      cleanTitle,
      'ગુજરાત સરકાર',
      'નવી જાહેરાત',
      'સત્તાવાર પરિપત્ર',
      'નવા નિયમો',
      'Gujarat Government Scheme',
      '2026 Update',
      'Gyan Yatra'
    ],
    hashtags: ['#GujaratGovt', '#SarkariYojana', '#GyanYatra', '#OfficialGR', '#Gujarat2026'],
    pinnedComment: `📌 "${cleanTitle}" અંગે તમારો કોઈ પણ પ્રશ્ન હોય તો નીચે કોમેન્ટમાં જરૂર જણાવો. નિયમિત સત્તાવાર અપડેટ્સ માટે જ્ઞાન યાત્રાને સબ્સ્ક્રાઇબ કરો!`,
    isCompleted: true
  };

  // Thumbnail metadata
  const thumbnail = {
    title: cleanTitle,
    dalleShortPrompt: `16:9 Clean White Professional Presentation slide thumbnail about ${cleanTitle}`,
    gujaratiWords: cleanTitle.split(/\s+/).slice(0, 4).join(' '),
    template: 'clean-white',
    isCompleted: true
  };

  const baseProj = existingProject || createBlankProject(cleanTitle, cleanTitle, 'સરકારી યોજના');
  baseProj.id = tid;
  baseProj.topicId = tid;
  baseProj.name = cleanTitle;
  baseProj.topic = cleanTitle;
  baseProj.recommendedTitle = cleanTitle;
  baseProj.domain = domain;
  baseProj.audience = audience;

  if (!Array.isArray(baseProj.ideas) || baseProj.ideas.length === 0) {
    baseProj.ideas = [
      {
        id: `idea_${tid}_1`,
        title: cleanTitle,
        category: 'સરકારી યોજના',
        summary: `${cleanTitle} અંગે મહત્વપૂર્ણ વિશ્લેષણ અને વાયરલ પોઈન્ટ્સ.`,
        hook: `શું તમે ${cleanTitle} વિશે સાચી માહિતી જાણો છો? જુઓ સત્તાવાર વિગત!`,
        targetAudience: audience,
        views48h: 'નવી જાહેરાત',
        isSaved: true,
        createdAt: new Date().toISOString()
      }
    ];
  }
  baseProj.idea = {
    topic: cleanTitle,
    masterPrompt: `આ વિષય પર વિગતવાર સંશોધન અને વાયરલ યુટ્યુબ વિડીયો પ્લાન: ${cleanTitle}`,
    notes: `${cleanTitle} અંગે સત્તાવાર પરિપત્ર અને નિયમો ૨૦૨૬`,
    isCompleted: true
  };

  const hasMatchingExistingScript = Boolean(
    existingProject?.script &&
    (existingProject.script.savedInDb || (Array.isArray(existingProject.script.sections) && existingProject.script.sections.length > 0)) &&
    isContentMatchingTopic(existingProject.script.sections || existingProject.script.rawText || existingProject.script.title, cleanTitle)
  );

  const hasMatchingPresentation = Boolean(
    existingProject?.slide?.importedPresentation &&
    isContentMatchingTopic(
      (existingProject.slide.importedPresentation.slides && existingProject.slide.importedPresentation.slides.length > 0)
        ? existingProject.slide.importedPresentation.slides
        : (existingProject.slide.importedPresentation.filename || ''),
      cleanTitle
    )
  );

  const hasMatchingExistingSlides = Boolean(
    existingProject?.slide &&
    Array.isArray(existingProject.slide.slides) && existingProject.slide.slides.length > 0 &&
    (hasMatchingPresentation || isContentMatchingTopic(existingProject.slide.slides, cleanTitle))
  );

  baseProj.slide = {
    ...(baseProj.slide || {}),
    customName: `${cleanTitle}_slides`,
    slideCount: hasMatchingExistingSlides ? `${existingProject.slide.slides.length} સ્લાઇડ્સ` : `${slideDeck.length} સ્લાઇડ્સ`,
    template: 'white-real',
    tool2Prompt,
    slides: hasMatchingExistingSlides ? existingProject.slide.slides : slideDeck,
    importedPresentation: hasMatchingPresentation ? existingProject.slide.importedPresentation : null,
    isCompleted: true
  };

  baseProj.editing = {
    exportHistory: [],
    generatedClips: [],
    lastExportedVideoUrl: '',
    lastExportedFilename: '',
    savedVideo: null
  };

  baseProj.voice = {
    slideRecordings: [],
    hasSavedAudio: false,
    audioUrl: '',
    filename: `${cleanTitle}_voice.wav`
  };

  baseProj.script = {
    ...(baseProj.script || {}),
    title: `${cleanTitle}: સત્તાવાર માહિતી અને વિશ્લેષણ`,
    rawText: hasMatchingExistingScript ? (existingProject.script.rawText || '') : fullScriptText,
    fullText: hasMatchingExistingScript ? (existingProject.script.fullText || '') : fullScriptText,
    originalChatGptScript: hasMatchingExistingScript ? (existingProject.script.originalChatGptScript || existingProject.script.rawText || '') : fullScriptText,
    sections: hasMatchingExistingScript ? existingProject.script.sections : scriptSections,
    editedSections: hasMatchingExistingScript ? (existingProject.script.editedSections || existingProject.script.sections) : scriptSections,
    source: hasMatchingExistingScript ? existingProject.script.source : 'Gyan Yatra Studio',
    savedInDb: Boolean(hasMatchingExistingScript && existingProject?.script?.savedInDb),
    isCompleted: true
  };

  baseProj.seo = seo;
  baseProj.thumbnail = thumbnail;

  // Cleanse obsolete foreign voice and video cache
  baseProj.voice = {
    audioUrl: '',
    filename: '',
    hasSavedAudio: false,
    slideRecordings: []
  };
  baseProj.editing = {
    generatedClips: [],
    lastExportedVideoUrl: '',
    lastExportedFilename: '',
    savedVideo: null,
    exportHistory: []
  };

  return baseProj;
}

class ProjectStateManager {
  constructor() {
    this.folders = this.loadFolders();
    this.activeFolderId = this.loadActiveFolderId();
    this.projects = this.loadProjects();
    this.activeProjectId = this.loadActiveId();
    this.cloudSyncTimer = null;
    this.isMigrating = false;
    this.ensureActiveProject();
    this.initCloudSync();
  }

  loadFolders() {
    try {
      const stored = localStorage.getItem(STORAGE_FOLDERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load folders:', e);
    }
    const defaults = JSON.parse(JSON.stringify(DEFAULT_FOLDERS));
    try {
      localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(defaults));
    } catch (_) {}
    return defaults;
  }

  loadActiveFolderId() {
    try {
      const id = localStorage.getItem(STORAGE_ACTIVE_FOLDER_KEY);
      if (id) return id;
    } catch (_) {}
    return 'f_all';
  }

  saveFolders() {
    try {
      localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(this.folders));
      localStorage.setItem(STORAGE_ACTIVE_FOLDER_KEY, this.activeFolderId);
      window.dispatchEvent(new CustomEvent('foldersListUpdated', { detail: this.folders }));
    } catch (e) {
      console.warn('Could not save folders to localStorage:', e);
    }
  }

  getFolders() {
    if (!this.folders || this.folders.length === 0) {
      this.folders = this.loadFolders();
    }
    return this.folders;
  }

  getActiveFolderId() {
    return this.activeFolderId || 'f_all';
  }

  setActiveFolderId(folderId) {
    this.activeFolderId = folderId || 'f_all';
    this.saveFolders();
    window.dispatchEvent(new CustomEvent('activeFolderChanged', { detail: this.activeFolderId }));
    return this.activeFolderId;
  }

  createFolder(name, color = '#38bdf8') {
    const cleanName = (name || '').trim();
    if (!cleanName) return null;
    const fId = 'f_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newFolder = {
      id: fId,
      name: cleanName,
      color: color || '#38bdf8',
      createdAt: new Date().toISOString()
    };
    this.folders.push(newFolder);
    this.activeFolderId = fId;
    this.saveFolders();
    return newFolder;
  }

  renameFolder(folderId, newName) {
    const cleanName = (newName || '').trim();
    if (!cleanName) return false;
    const folder = this.folders.find(f => f.id === folderId);
    if (!folder) return false;
    folder.name = cleanName;
    folder.updatedAt = new Date().toISOString();

    // Also sync all projects assigned to this folder
    this.projects.forEach(p => {
      if (p.folderId === folderId) {
        p.folderName = cleanName;
        p.updatedAt = new Date().toISOString();
      }
    });

    this.saveFolders();
    this.saveProjects();
    return true;
  }

  deleteFolder(folderId) {
    if (folderId === 'f_all' || folderId === 'f_default') {
      alert('મુખ્ય ફોલ્ડર ડિલીટ કરી શકાય નહીં. (Default folder cannot be deleted)');
      return false;
    }
    const idx = this.folders.findIndex(f => f.id === folderId);
    if (idx === -1) return false;

    // Move projects to fallback default folder
    const fallback = this.folders.find(f => f.id === 'f_default') || this.folders[1] || { id: 'f_default', name: '📁 મુખ્ય ફોલ્ડર' };
    this.projects.forEach(p => {
      if (p.folderId === folderId) {
        p.folderId = fallback.id;
        p.folderName = fallback.name;
      }
    });

    this.folders.splice(idx, 1);
    if (this.activeFolderId === folderId) {
      this.activeFolderId = fallback.id;
    }
    this.saveFolders();
    this.saveProjects();
    return true;
  }

  loadProjects() {
    try {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (stored) {
        let parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out old seed/demo projects so only user's active topic is present
          parsed = parsed.filter(p => {
            const t = (p.topic || p.name || '').toLowerCase();
            const isSeed = t.includes('ગુજરાત આંગણવાડી બહેનોનો પગાર વધારો') ||
              t.includes('આંગણવાડી supervisor ભરતી 2026') ||
              t.includes('આંગણવાડી કાર્યકર અને તેડાગર નવી ભરતી ૨૦૨૬') ||
              t.includes('ગુજરાત કર્મચારી ૫૦% મોંઘવારી ભથ્થું') ||
              p.id === 'proj_default_gsrtc' ||
              p.id === 'default_proj';
            return !isSeed;
          });

          // Ensure folder and custom file names exist on all loaded projects
          parsed.forEach(p => {
            if (!p.folderId) p.folderId = 'f_default';
            if (!p.folderName) p.folderName = '📁 મુખ્ય ફોલ્ડર';
            const safeName = (p.name || 'project').replace(/[\s/\\?%*:|"<>]+/g, '_').substring(0, 40);
            if (!p.script) p.script = {};
            if (!p.script.customName) p.script.customName = `${safeName}_script.txt`;
            if (!p.slide) p.slide = {};
            p.slide.customName = p.slide.importedPresentation?.filename || '';

            // Clean up legacy empty slides if needed
            if (!p.slide.importedPresentation && (!Array.isArray(p.slide.slides) || p.slide.slides.length === 0)) {
              p.slide.slides = [];
              p.slide.isCompleted = false;
              p.slide.customName = '';
            }

            // Phase 1: Permanent Slide Identity Guarantee
            if (p.slide && Array.isArray(p.slide.slides)) {
              p.slide.slides.forEach((sl, idx) => {
                if (!sl.slideId) {
                  sl.slideId = sl.id ? String(sl.id) : `slide_${p.id}_${idx + 1}_${Date.now()}`;
                }
                sl.id = sl.slideId;
                if (sl.pageNumber === undefined || sl.pageNumber === null) {
                  sl.pageNumber = sl.originalPageNumber || (idx + 1);
                }
                if (!sl.recordingStatus) {
                  sl.recordingStatus = sl.audioUrl ? 'Recorded' : 'Not Recorded';
                }
              });
            }

            if (p.script && Array.isArray(p.script.sections)) {
              p.script.sections.forEach((sec, idx) => {
                if (!sec.slideId && p.slide?.slides?.[idx]) {
                  sec.slideId = p.slide.slides[idx].slideId;
                }
                if (!sec.sectionId) {
                  sec.sectionId = `sec_${sec.slideId || (idx + 1)}`;
                }
              });
            }
            if (!p.voice) p.voice = {};
            if (!p.voice.customName) p.voice.customName = p.voice.filename || `${safeName}_voice.wav`;
            if (!Array.isArray(p.voice.slideRecordings)) p.voice.slideRecordings = [];
            if (!p.editing) p.editing = {};
            if (!Array.isArray(p.editing.exportHistory)) p.editing.exportHistory = [];
            if (!p.thumbnail) p.thumbnail = {};
            if (!p.thumbnail.customName) p.thumbnail.customName = `${safeName}_thumbnail.png`;
            if (!Array.isArray(p.uploads)) p.uploads = [];

            // Ensure workspaceState exists
            if (!p.workspaceState || typeof p.workspaceState !== 'object') {
              p.workspaceState = {
                activeSection: p.lastStep || 'overview',
                lastSlideIndex: 0,
                lastScriptSectionIdx: 0,
                lastSelectedThumbId: null,
                lastSEODraftId: null,
                scrollOffset: 0,
                completionStatus: {},
                lastSavedAt: p.updatedAt || new Date().toISOString()
              };
            }

            // Ensure versionHistory exists
            if (!p.versionHistory || typeof p.versionHistory !== 'object') {
              p.versionHistory = {
                slides: [],
                scripts: [],
                slidePrompts: [],
                thumbnails: [],
                seo: []
              };
            }

            // Auto-heal 70 dummy slides / sections bug & ensure single source of truth for script
            let raw = (p.script?.rawText || p.script?.fullText || '').trim();
            if (!raw && Array.isArray(p.script?.sections) && p.script.sections.length > 0) {
              raw = p.script.sections.map(s => s.scriptText || s.content || '').filter(Boolean).join('\n\n').trim();
              if (raw) {
                p.script.rawText = raw;
                p.script.fullText = raw;
              }
            } else if (raw) {
              p.script.rawText = raw;
              p.script.fullText = raw;
            }

            const hasExplicitMarkers = Boolean(raw && raw.match(/(?:^|\n)\s*(?:\*{0,2}\[?|###?\s*)(?:Slide|સ્લાઇડ)\s*[#0-9૦-૯]+[^\n\]\*]*\]?\*{0,2}/gi));
            const importedMeta = p.slide?.importedPresentation || null;
            let authenticSlideCount = importedMeta?.slidesCount || importedMeta?.slideCount || importedMeta?.pageCount || (Array.isArray(importedMeta?.slides) ? importedMeta.slides.length : 0);
            if (authenticSlideCount === 0 || (!importedMeta && authenticSlideCount > 20)) {
              authenticSlideCount = 9; // Authentic default slides count
            }

            if (p.slide?.slides?.length === 70 || p.script?.sections?.length === 70 || (!importedMeta && p.slide?.slides?.length > 15 && !hasExplicitMarkers)) {
              if (!p.slide) p.slide = {};
              p.slide.slides = Array.from({ length: authenticSlideCount }, (_, i) => ({
                slideNumber: i + 1,
                title: `સ્લાઇડ #${i + 1}`,
                subtitle: '',
                bulletPoints: [],
                scriptText: '',
                bgColor: '#FFFFFF',
                textColor: '#0F172A'
              }));
              if (raw) {
                const repairedSections = parseChatGptScriptText(raw, p.slide.slides);
                p.script.sections = repairedSections;
                p.script.editedSections = repairedSections;
                p.script.rawText = raw;
                p.script.fullText = raw;
                p.slide.slides.forEach((sl, idx) => {
                  if (repairedSections[idx]) {
                    sl.scriptText = repairedSections[idx].scriptText;
                    sl.title = repairedSections[idx].title || `સ્લાઇડ #${idx + 1}`;
                  }
                });
              } else {
                p.script.sections = [];
                p.script.editedSections = [];
              }
              p.slide.slideCount = `${authenticSlideCount} સ્લાઇડ્સ`;
            }
          });
          return parsed;
        }
      }

      // Check legacy single project
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        try {
          const legObj = JSON.parse(legacy);
          const migrated = createBlankProject(legObj.topic || 'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026', legObj.topic);
          if (legObj.script) migrated.script = { ...migrated.script, ...legObj.script };
          if (legObj.slides) migrated.slide.slides = legObj.slides;
          if (legObj.seo) migrated.seo = { ...migrated.seo, ...legObj.seo };
          if (legObj.thumbnail) migrated.thumbnail = { ...migrated.thumbnail, ...legObj.thumbnail };
          if (legObj.voiceAudio) migrated.voice = { ...migrated.voice, ...legObj.voiceAudio };
          return [migrated];
        } catch (e) {
          console.warn('Legacy migration failed:', e);
        }
      }
    } catch (e) {
      console.warn('Could not load projects list:', e);
    }

    // Attempt to initialize from Central Topics Cache if available
    try {
      const cached = localStorage.getItem('gyan_central_topics_cache');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list) && list.length > 0) {
          const first = list[0];
          const kit = buildTopicProjectKit(first.topicName || first.title || 'નવો વિડીયો વિષય', first.topicId || 'GY-2026-001');
          return [kit];
        }
      }
    } catch (_) {}

    return [];
  }

  loadActiveId() {
    try {
      const id = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
      if (id && this.projects.some(p => p.id === id)) {
        return id;
      }
    } catch (e) {}
    return this.projects[0]?.id || '';
  }

  ensureActiveProject() {
    if (!this.projects || this.projects.length === 0) {
      this.projects = [];
      this.activeProjectId = '';
    } else if (!this.activeProjectId || !this.projects.some(p => p.id === this.activeProjectId)) {
      this.activeProjectId = this.projects[0].id;
      this.saveProjects();
    }
  }

  saveProjects() {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(this.projects));
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, this.activeProjectId);
      
      // Keep legacy active project synced for older components
      const active = this.getActiveProject();
      if (active) {
        const legacyFormat = {
          id: active.id,
          topic: active.topic || active.name,
          masterPrompt: active.idea?.masterPrompt || '',
          script: active.script,
          voiceAudio: active.voice,
          slides: active.slide?.slides || [],
          seo: active.seo,
          thumbnail: active.thumbnail,
          updatedAt: active.updatedAt
        };
        localStorage.setItem(LEGACY_KEY, JSON.stringify(legacyFormat));
      }

      window.dispatchEvent(new CustomEvent('projectsListUpdated', { detail: this.projects }));
      window.dispatchEvent(new CustomEvent('projectStateUpdated', { detail: active }));

      // Debounced background sync to Cloud Firestore
      this.debouncedCloudSync();
    } catch (e) {
      console.warn('Could not save projects to localStorage:', e);
    }
  }

  getProjects() {
    return this.projects;
  }

  getActiveProjectId() {
    return this.activeProjectId;
  }

  getActiveProject() {
    let activeTopicId = null;
    let activeTopicName = null;
    try {
      if (typeof localStorage !== 'undefined') {
        activeTopicId = localStorage.getItem('gyan_active_topic_id');
        activeTopicName = (localStorage.getItem('gyan_active_topic_name') || '').trim();
      }
    } catch (_) {}

    // 1. Try to find by this.activeProjectId
    let p = this.projects.find(item => item && (item.id === this.activeProjectId || item.topicId === this.activeProjectId));

    // 2. If current active project doesn't match active topic from storage, prioritize matching project
    if (activeTopicId || activeTopicName) {
      const match = this.projects.find(item => item && (
        (activeTopicId && (item.id === activeTopicId || item.topicId === activeTopicId || (Array.isArray(item.ideas) && item.ideas.some(i => i.id === activeTopicId)))) ||
        (activeTopicName && (item.topic === activeTopicName || item.name === activeTopicName || item.recommendedTitle === activeTopicName))
      ));
      if (match) {
        p = match;
        this.activeProjectId = p.id;
      }
    }

    // 3. Fallback to first project
    if (!p && this.projects.length > 0) {
      this.activeProjectId = this.projects[0].id;
      p = this.projects[0];
    }
    if (!p) {
      try {
        const cached = localStorage.getItem('gyan_central_topics_cache');
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list) && list.length > 0) {
            const match = (activeTopicId && list.find(t => t.topicId === activeTopicId || t.id === activeTopicId)) || list[0];
            if (match) {
              const kit = buildTopicProjectKit(match.topicName || match.title, match.topicId || activeTopicId);
              this.projects.unshift(kit);
              this.activeProjectId = kit.id;
              this.saveProjects();
              return kit;
            }
          }
        }
      } catch (_) {}
    }

    // 4. Ensure active project topic matches stored active topic name if present
    if (p && activeTopicName) {
      if (!p.topic || p.topic === 'મારો નવો વિડીયો પ્રોજેક્ટ' || p.topic === 'Untitled Project') {
        p.topic = activeTopicName;
        p.name = activeTopicName;
        p.recommendedTitle = activeTopicName;
      }
    }

    // 5. Fallback auto-creation if no project exists yet so tools NEVER fail to open on new devices
    if (!p) {
      const topicToUse = activeTopicName || 'આંગણવાડી પગાર વધારો હાઇકોર્ટ ઐતિહાસિક ચુકાદો';
      const defaultKit = buildTopicProjectKit(topicToUse, 'GY-2026-001');
      this.projects = [defaultKit];
      this.activeProjectId = defaultKit.id;
      try { this.saveProjects(); } catch (_) {}
      p = defaultKit;
    }

    return p;
  }

  // Alias for backwards compatibility
  getProject() {
    const active = this.getActiveProject();
    if (!active) return createBlankProject();
    return {
      ...active,
      topic: active.topic || active.name,
      slides: active.slide?.slides || [],
      voiceAudio: active.voice || {}
    };
  }

  getTopic() {
    const active = this.getActiveProject();
    return active ? (active.topic || active.name) : '';
  }

  getActiveTopicId() {
    const active = this.getActiveProject();
    return active ? (active.topicId || active.id) : (localStorage.getItem('gyan_active_topic_id') || '');
  }

  /**
   * Activate Topic Context throughout all 9 Studio Tools
   * Guarantees that opening any tool or workspace loads THIS EXACT topic:
   * Title, Slides, Script, Prompts, SEO, and Thumbnail are 100% synchronized!
   */
  async activateTopicContext(topicId, topicName = '', extraData = {}) {
    if (!topicId) return null;
    if (typeof topicId === 'object' && topicId !== null) {
      extraData = { ...topicId, ...(extraData || {}) };
      topicName = topicName || topicId.topicName || topicId.title || topicId.name || '';
      topicId = topicId.topicId || topicId.id || `topic_${Date.now()}`;
    }

    // Argument sniffing: if topicId contains Gujarati/spaces and topicName looks like an ID, swap them safely
    if (typeof topicId === 'string' && typeof topicName === 'string') {
      const topicIdLooksLikeTitle = topicId.includes(' ') || /[^\x00-\x7F]/.test(topicId);
      const topicNameLooksLikeId = /^(pasted_|topic_|idea_|proj_|\d+)/.test(topicName);
      if (topicIdLooksLikeTitle && (topicNameLooksLikeId || !topicName)) {
        const tempId = topicName || `topic_${Date.now()}`;
        topicName = topicId;
        topicId = tempId;
      }
    }

    topicId = String(topicId || `topic_${Date.now()}`);
    let cleanTopicName = (topicName || extraData.topicName || extraData.title || '').trim();

    if (!cleanTopicName) {
      try {
        const cached = localStorage.getItem('gyan_central_topics_cache');
        if (cached) {
          const list = JSON.parse(cached);
          const match = Array.isArray(list) ? list.find(t => t.topicId === topicId || t.id === topicId) : null;
          if (match && (match.topicName || match.title)) {
            cleanTopicName = match.topicName || match.title;
          }
        }
      } catch (_) {}
    }

    // 0. Check if active project already holds this topic/idea - stay on current project and preserve ideas!
    let activeProj = this.getActiveProject();
    if (activeProj && (
      activeProj.id === topicId || 
      activeProj.topicId === topicId || 
      (Array.isArray(activeProj.ideas) && activeProj.ideas.some(i => i.id === topicId))
    )) {
      activeProj.topicId = topicId;
      if (cleanTopicName) {
        const topicChanged = Boolean(activeProj.topic && activeProj.topic !== cleanTopicName);
        activeProj.topic = cleanTopicName;
        activeProj.name = cleanTopicName;
        activeProj.recommendedTitle = cleanTopicName;

        if (topicChanged) {
          if (!activeProj.editing) activeProj.editing = {};
          activeProj.editing.lastExportedVideoUrl = '';
          activeProj.editing.lastExportedFilename = '';
          activeProj.editing.savedVideo = null;
          activeProj.editing.generatedClips = [];
          if (!activeProj.voice) activeProj.voice = {};
          activeProj.voice.audioUrl = '';
          activeProj.voice.filename = '';
          activeProj.voice.hasSavedAudio = false;
          activeProj.voice.slideRecordings = [];

          // Rebuild authentic slides and script for the new topic if no user PDF is imported
          const hasImportedPdf = Boolean(activeProj.slide?.importedPresentation);
          if (!hasImportedPdf) {
            const freshKit = buildTopicProjectKit(cleanTopicName, topicId, activeProj);
            activeProj.slide = freshKit.slide;
            activeProj.script = freshKit.script;
            activeProj.seo = freshKit.seo;
            activeProj.thumbnail = freshKit.thumbnail;
          }
        }

        // Ensure tool2Prompt strictly matches this active cleanTopicName!
        const existingPrompt = (typeof activeProj.slide?.tool2Prompt === 'object' && activeProj.slide?.tool2Prompt !== null)
          ? (activeProj.slide.tool2Prompt.promptText || activeProj.slide.tool2Prompt.pptDeckPrompt || '')
          : (typeof activeProj.slide?.tool2Prompt === 'string' ? activeProj.slide.tool2Prompt : '');

        if (topicChanged || !existingPrompt || !isContentMatchingTopic(existingPrompt, cleanTopicName) || (activeProj.slide?.topic && activeProj.slide.topic !== cleanTopicName)) {
          const freshPromptRes = generateClientNotebookLMPrompt({
            topic: cleanTopicName,
            templateId: 'white-real',
            tool: 'notebooklm-slides',
            slideCount: '8-10',
            audience: 'auto',
            includeBranding: true
          });
          if (!activeProj.slide) activeProj.slide = {};
          activeProj.slide.tool2Prompt = freshPromptRes;
          activeProj.slide.topic = cleanTopicName;
        }
      }
      this.activeProjectId = activeProj.id;
      this.saveProjects();
      try {
        localStorage.setItem('gyan_active_topic_id', topicId);
        if (cleanTopicName) {
          localStorage.setItem('gyan_active_topic_name', cleanTopicName);
          if (typeof window !== 'undefined') window.prefillTopic = cleanTopicName;
        }
        localStorage.setItem(STORAGE_ACTIVE_ID_KEY, activeProj.id);
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('topicContextChanged', { detail: { topicId, project: activeProj } }));
      window.dispatchEvent(new CustomEvent('projectStateUpdated', { detail: activeProj }));
      return activeProj;
    }

    // 1. Check if project already exists in local memory by topicId or id
    let project = this.projects.find(p => p.topicId === topicId || p.id === topicId || (Array.isArray(p.ideas) && p.ideas.some(i => i.id === topicId)));

    // 2. If not found in local memory, check server central repository
    if (!project) {
      try {
        const response = await fetch(`/api/planner/topics/${encodeURIComponent(topicId)}`);
        if (response.ok) {
          const res = await response.json();
          if (res && res.topic) {
            const t = res.topic;
            const tName = cleanTopicName || t.topicName || t.recommendedTitle;
            project = buildTopicProjectKit(tName, t.topicId);
            project.recommendedTitle = t.recommendedTitle || tName;
            project.analyticsDate = t.analyticsDate;
            project.dayName = t.dayName;
            project.priority = t.priority;

            // Preload connected modules from central repository if available
            if (res.slides && res.slides.slides && res.slides.slides.length > 0) {
              project.slide = { ...project.slide, ...res.slides };
            }
            if (res.scripts && res.scripts.sections && res.scripts.sections.length > 0) {
              project.script = { ...project.script, ...res.scripts };
            }
            if (res.voices && res.voices.audioUrl) {
              project.voice = { ...project.voice, ...res.voices };
            }
            if (res.thumbnails && res.thumbnails.imageUrl) {
              project.thumbnail = { ...project.thumbnail, ...res.thumbnails };
            }
            if (res.seo && res.seo.title) {
              project.seo = { ...project.seo, ...res.seo };
            }
          }
        }
      } catch (err) {
        console.warn('[activateTopicContext Remote Load Notice]:', err);
      }
    }

    // 3. Fallback: if still not present, create brand-new project kit keyed to this topicId
    if (!project) {
      const finalTitle = cleanTopicName || `વિડીયો ${topicId}`;
      project = buildTopicProjectKit(finalTitle, topicId);
      if (extraData.priority) project.priority = extraData.priority;
    } else {
      // 4. Project exists — verify it matches the active topicName and contains authentic content!
      const currentTopicName = cleanTopicName || project.topic || project.name;
      const hasImportedPres = Boolean(project.slide?.importedPresentation);
      const isForeignContent = Boolean(
        !hasImportedPres && cleanTopicName && (
          (project.topic && project.topic !== cleanTopicName && !project.topic.includes(cleanTopicName.slice(0, 15))) ||
          (project.name && project.name !== cleanTopicName && !project.name.includes(cleanTopicName.slice(0, 15))) ||
          (Array.isArray(project.slide?.slides) && project.slide.slides.length > 0 && !isContentMatchingTopic(project.slide.slides, cleanTopicName)) ||
          (Array.isArray(project.script?.sections) && project.script.sections.length > 0 && !isContentMatchingTopic(project.script.sections, cleanTopicName))
        )
      );

      if (isForeignContent || !Array.isArray(project.slide?.slides) || project.slide.slides.length === 0) {
        // Rebuild kit with the new topic so ALL slides, script, prompt, SEO adapt to this topic!
        project = buildTopicProjectKit(currentTopicName, topicId, project);
      } else {
        project.topicId = topicId;
        project.id = topicId;
        if (cleanTopicName) {
          project.name = cleanTopicName;
          project.topic = cleanTopicName;
          project.recommendedTitle = cleanTopicName;
        }
      }
      project.topicId = topicId;
      project.id = topicId;
      if (!project.editing) project.editing = {};
      project.editing.lastExportedVideoUrl = '';
      project.editing.lastExportedFilename = '';
      project.editing.savedVideo = null;
      project.editing.generatedClips = [];
      if (!project.voice || isForeignContent) {
        project.voice = { audioUrl: '', filename: '', hasSavedAudio: false, slideRecordings: [] };
      }
    }

    // Ensure the project in this.projects is properly registered and updated
    const existingIdx = this.projects.findIndex(p => p.id === project.id || p.topicId === topicId || p.id === topicId);
    if (existingIdx !== -1) {
      this.projects[existingIdx] = project;
    } else {
      this.projects.unshift(project);
    }

    // 5. Set active project and store active topic id
    this.activeProjectId = project.id;
    try {
      localStorage.setItem('gyan_active_topic_id', topicId);
      if (cleanTopicName) {
        localStorage.setItem('gyan_active_topic_name', cleanTopicName);
        if (typeof window !== 'undefined') window.prefillTopic = cleanTopicName;
      }
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, project.id);
    } catch (e) {}

    this.saveProjects();

    // 6. Broadcast topic context change event across all tools
    window.dispatchEvent(new CustomEvent('topicContextChanged', { detail: { topicId, project } }));
    window.dispatchEvent(new CustomEvent('projectStateUpdated', { detail: project }));

    return project;
  }

  setActiveProject(projectId) {
    let proj = this.projects.find(p => p.id === projectId || p.topicId === projectId);
    if (proj) {
      const cleanTitle = (proj.topic || proj.name || '').trim();
      if (cleanTitle && (!Array.isArray(proj.slide?.slides) || proj.slide.slides.length === 0 || !proj.script?.sections || proj.script.sections.length === 0)) {
        const fullKit = buildTopicProjectKit(cleanTitle, proj.topicId || proj.id, proj);
        Object.assign(proj, fullKit);
      }
      this.activeProjectId = proj.id;
      const tId = proj.topicId || proj.id;
      try {
        localStorage.setItem('gyan_active_topic_id', tId);
        localStorage.setItem(STORAGE_ACTIVE_ID_KEY, proj.id);
      } catch (_) {}
      this.saveProjects();
      window.dispatchEvent(new CustomEvent('topicContextChanged', { detail: { topicId: tId, project: proj } }));
      window.dispatchEvent(new CustomEvent('projectStateUpdated', { detail: proj }));
      return this.getActiveProject();
    }
    return null;
  }

  createProject(name, topic = '', category = 'સરકારી યોજના', folderId = '') {
    const targetFolderId = folderId || (this.activeFolderId && this.activeFolderId !== 'f_all' ? this.activeFolderId : 'f_default');
    const folder = this.folders.find(f => f.id === targetFolderId) || this.folders.find(f => f.id === 'f_default') || { id: 'f_default', name: '📁 મુખ્ય ફોલ્ડર' };

    const cleanTitle = (topic || name || '').trim() || 'નવો વિડીયો વિષય ' + new Date().toLocaleDateString('gu-IN');
    const year = new Date().getFullYear();
    let maxNum = 0;
    this.projects.forEach(p => {
      const match = (p.id || p.topicId || '').match(/GY-\d{4}-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const tid = `GY-${year}-${String(Math.max(maxNum, this.projects.length) + 1).padStart(3, '0')}`;

    // Immediately build full synchronized topic kit for ALL workflow stages!
    const newProj = buildTopicProjectKit(cleanTitle, tid);
    newProj.folderId = folder.id;
    newProj.folderName = folder.name;
    newProj.category = category;

    this.projects.unshift(newProj);
    this.activeProjectId = newProj.id;
    try {
      localStorage.setItem('gyan_active_topic_id', tid);
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, newProj.id);
    } catch (_) {}
    this.saveProjects();

    // Background sync to Central Planner so both systems share this topic
    try {
      api.addCentralTopic({
        topicId: tid,
        topicName: cleanTitle,
        recommendedTitle: cleanTitle,
        priority: 'High'
      }).catch(() => {});
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('topicContextChanged', { detail: { topicId: tid, project: newProj } }));
    window.dispatchEvent(new CustomEvent('projectStateUpdated', { detail: newProj }));
    window.dispatchEvent(new CustomEvent('projectsListUpdated', { detail: this.projects }));

    return newProj;
  }

  renameProject(projectId, newName) {
    const p = this.projects.find(item => item.id === projectId);
    if (p) {
      const cleanName = newName.trim();
      p.name = cleanName;
      p.topic = cleanName;
      p.recommendedTitle = cleanName;
      p.updatedAt = new Date().toISOString();
      if (p.idea) p.idea.topic = cleanName;
      const refreshed = buildTopicProjectKit(cleanName, p.topicId || p.id, p);
      Object.assign(p, refreshed);
      this.saveProjects();
      window.dispatchEvent(new CustomEvent('topicContextChanged', { detail: { topicId: p.topicId || p.id, project: p } }));
      window.dispatchEvent(new CustomEvent('projectStateUpdated', { detail: p }));
      window.dispatchEvent(new CustomEvent('projectsListUpdated', { detail: this.projects }));
      return true;
    }
    return false;
  }

  renameFile(projectId, fileType, newFileName) {
    const p = this.projects.find(item => item.id === projectId) || this.getActiveProject();
    if (!p) return false;
    let cleanName = (newFileName || '').trim();
    if (!cleanName) return false;

    if (fileType === 'script') {
      if (!p.script) p.script = {};
      if (!cleanName.endsWith('.txt')) cleanName += '.txt';
      p.script.customName = cleanName;
    } else if (fileType === 'slide' || fileType === 'ppt') {
      if (!p.slide) p.slide = {};
      if (!cleanName.endsWith('.pptx') && !cleanName.endsWith('.txt')) cleanName += '.pptx';
      p.slide.customName = cleanName;
    } else if (fileType === 'voice') {
      if (!p.voice) p.voice = {};
      if (!cleanName.endsWith('.wav') && !cleanName.endsWith('.mp3')) cleanName += '.wav';
      p.voice.customName = cleanName;
      p.voice.filename = cleanName;
    } else if (fileType === 'thumbnail') {
      if (!p.thumbnail) p.thumbnail = {};
      if (!cleanName.endsWith('.png') && !cleanName.endsWith('.jpg')) cleanName += '.png';
      p.thumbnail.customName = cleanName;
    }

    p.updatedAt = new Date().toISOString();
    this.saveProjects();
    return true;
  }

  /**
   * Get workspace stop-and-resume state for a project
   */
  getWorkspaceState(projectId = null) {
    const p = projectId ? this.projects.find(item => item.id === projectId) : this.getActiveProject();
    if (!p) return null;
    if (!p.workspaceState) {
      p.workspaceState = {
        activeSection: p.lastStep || 'overview',
        lastSlideIndex: 0,
        lastScriptSectionIdx: 0,
        lastSelectedThumbId: null,
        lastSEODraftId: null,
        scrollOffset: 0,
        completionStatus: {},
        lastSavedAt: p.updatedAt || new Date().toISOString()
      };
    }
    return p.workspaceState;
  }

  /**
   * Update workspace stop-and-resume state
   */
  setWorkspaceState(projectId = null, partial = {}) {
    const p = projectId ? this.projects.find(item => item.id === projectId) : this.getActiveProject();
    if (!p) return false;
    if (!p.workspaceState) p.workspaceState = {};

    p.workspaceState = {
      ...p.workspaceState,
      ...partial,
      lastSavedAt: new Date().toISOString()
    };
    if (partial.activeSection) {
      p.lastStep = partial.activeSection;
    }
    p.updatedAt = new Date().toISOString();
    this.saveProjects();

    // Trigger cloud sync
    if (firebaseService?.currentUser?.uid) {
      firebaseService.saveProjectWorkspaceState(firebaseService.currentUser.uid, p.id, p.workspaceState);
    }
    return p.workspaceState;
  }

  /**
   * Version History: Save a snapshot of a working stage
   * Avoids duplicate records if data has not changed since last version (unless force === true)
   */
  saveVersionSnapshot(projectId = null, type, label = '', data = null, force = false) {
    const p = projectId ? this.projects.find(item => item.id === projectId) : this.getActiveProject();
    if (!p || !type) return null;
    if (!p.versionHistory) {
      p.versionHistory = { slides: [], scripts: [], slidePrompts: [], thumbnails: [], seo: [] };
    }
    if (!Array.isArray(p.versionHistory[type])) {
      p.versionHistory[type] = [];
    }

    // Determine payload to snapshot
    let snapshotData = data;
    if (!snapshotData) {
      if (type === 'slides') snapshotData = p.slide?.slides || [];
      else if (type === 'scripts') snapshotData = { fullText: p.script?.fullText || '', sections: p.script?.sections || [] };
      else if (type === 'slidePrompts') snapshotData = { promptText: p.slide?.tool2Prompt || '' };
      else if (type === 'thumbnails') snapshotData = { ...p.thumbnail };
      else if (type === 'seo') snapshotData = { ...p.seo };
    }

    const jsonStr = JSON.stringify(snapshotData);
    const historyList = p.versionHistory[type];

    // Check if identical to last snapshot (deduplicate unless force is true)
    if (!force && historyList.length > 0) {
      const last = historyList[0];
      if (JSON.stringify(last.data) === jsonStr) {
        return last.versionId; // Skip duplicate snapshot
      }
    }

    const versionId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const versionObj = {
      versionId,
      versionNumber: historyList.length + 1,
      timestamp: new Date().toISOString(),
      label: label || `Version ${historyList.length + 1}`,
      data: JSON.parse(jsonStr)
    };

    historyList.unshift(versionObj);
    p.updatedAt = new Date().toISOString();
    this.saveProjects();

    // Sync version to cloud
    if (firebaseService?.currentUser?.uid) {
      firebaseService.saveProjectVersionDoc(firebaseService.currentUser.uid, p.id, type, versionObj);
    }
    return versionId;
  }

  /**
   * Get version history list for a stage
   */
  getVersionHistory(projectId = null, type) {
    const p = projectId ? this.projects.find(item => item.id === projectId) : this.getActiveProject();
    if (!p || !type || !p.versionHistory) return [];
    return p.versionHistory[type] || [];
  }

  /**
   * Reversible version rollback:
   * 1. Preserves current working state in a safety snapshot
   * 2. Replaces working data with chosen version snapshot
   */
  restoreVersionSnapshot(projectId = null, type, versionId) {
    const p = projectId ? this.projects.find(item => item.id === projectId) : this.getActiveProject();
    if (!p || !type || !versionId || !p.versionHistory) return { success: false, reason: 'Invalid parameters' };

    const historyList = p.versionHistory[type] || [];
    const targetVersion = historyList.find(v => v.versionId === versionId);
    if (!targetVersion) return { success: false, reason: 'Version not found' };

    // 1. Mandatory Safety Snapshot of current state before rollback (force: true)
    this.saveVersionSnapshot(p.id, type, `Safety snapshot before restoring ${targetVersion.label || versionId}`, null, true);

    // 2. Restore content safely
    const restoredData = JSON.parse(JSON.stringify(targetVersion.data));
    if (type === 'slides') {
      if (!p.slide) p.slide = {};
      p.slide.slides = Array.isArray(restoredData) ? restoredData : (restoredData.slides || []);
    } else if (type === 'scripts') {
      if (!p.script) p.script = {};
      if (typeof restoredData === 'string') {
        p.script.fullText = restoredData;
      } else {
        p.script.fullText = restoredData.fullText || p.script.fullText || '';
        p.script.sections = restoredData.sections || p.script.sections || [];
      }
    } else if (type === 'slidePrompts') {
      if (!p.slide) p.slide = {};
      p.slide.tool2Prompt = restoredData.promptText || restoredData || '';
    } else if (type === 'thumbnails') {
      p.thumbnail = { ...p.thumbnail, ...restoredData };
    } else if (type === 'seo') {
      p.seo = { ...p.seo, ...restoredData };
    }

    p.updatedAt = new Date().toISOString();
    this.saveProjects();
    return { success: true, restored: targetVersion };
  }

  /**
   * Safe migration & verification of embedded project data:
   * - project.slide
   * - project.script
   * - project.voice
   * - project.editing
   * - project.canva
   * - project.seo
   * - project.thumbnail
   * - project.uploads
   * Never deletes original data.
   */
  migrateEmbeddedDataToProjectScoped(projectId = null) {
    const p = projectId ? this.projects.find(item => item.id === projectId) : this.getActiveProject();
    if (!p) return { success: false, reason: 'Project not found' };

    // Capture BEFORE counts & state
    const before = {
      id: p.id,
      name: p.name,
      slidesCount: Array.isArray(p.slide?.slides) ? p.slide.slides.length : 0,
      scriptSectionsCount: Array.isArray(p.script?.sections) ? p.script.sections.length : 0,
      hasVoice: Boolean(p.voice?.filename || p.voice?.audioUrl),
      hasEditing: Boolean(p.editing?.aspectRatio),
      hasCanva: Boolean(p.canva?.headline),
      hasSEO: Boolean(p.seo?.title),
      hasThumbnail: Boolean(p.thumbnail?.dalleShortPrompt || p.thumbnail?.gujaratiWords),
      uploadsCount: Array.isArray(p.uploads) ? p.uploads.length : 0,
      ideasCount: Array.isArray(p.ideas) ? p.ideas.length : 0
    };

    // Initialize version history with v1 if empty
    if (!p.versionHistory) {
      p.versionHistory = { slides: [], scripts: [], slidePrompts: [], thumbnails: [], seo: [] };
    }

    if (p.slide?.slides && p.versionHistory.slides.length === 0) {
      this.saveVersionSnapshot(p.id, 'slides', 'Original Slide Deck (v1)', p.slide.slides);
    }
    if (p.script && p.versionHistory.scripts.length === 0) {
      this.saveVersionSnapshot(p.id, 'scripts', 'Original Script (v1)', { fullText: p.script.fullText || '', sections: p.script.sections || [] });
    }
    if (p.slide?.tool2Prompt && p.versionHistory.slidePrompts.length === 0) {
      this.saveVersionSnapshot(p.id, 'slidePrompts', 'Original Slide Prompt (v1)', { promptText: p.slide.tool2Prompt });
    }
    if (p.thumbnail && p.versionHistory.thumbnails.length === 0) {
      this.saveVersionSnapshot(p.id, 'thumbnails', 'Original Thumbnail Concept (v1)', p.thumbnail);
    }
    if (p.seo && p.versionHistory.seo.length === 0) {
      this.saveVersionSnapshot(p.id, 'seo', 'Original SEO Draft (v1)', p.seo);
    }

    // Capture AFTER counts & state
    const after = {
      id: p.id,
      name: p.name,
      slidesCount: Array.isArray(p.slide?.slides) ? p.slide.slides.length : 0,
      scriptSectionsCount: Array.isArray(p.script?.sections) ? p.script.sections.length : 0,
      hasVoice: Boolean(p.voice?.filename || p.voice?.audioUrl),
      hasEditing: Boolean(p.editing?.aspectRatio),
      hasCanva: Boolean(p.canva?.headline),
      hasSEO: Boolean(p.seo?.title),
      hasThumbnail: Boolean(p.thumbnail?.dalleShortPrompt || p.thumbnail?.gujaratiWords),
      uploadsCount: Array.isArray(p.uploads) ? p.uploads.length : 0,
      ideasCount: Array.isArray(p.ideas) ? p.ideas.length : 0,
      versionHistoryCounts: {
        slides: p.versionHistory.slides.length,
        scripts: p.versionHistory.scripts.length,
        slidePrompts: p.versionHistory.slidePrompts.length,
        thumbnails: p.versionHistory.thumbnails.length,
        seo: p.versionHistory.seo.length
      }
    };

    // Verify 100% preservation
    const isVerified = (
      before.slidesCount === after.slidesCount &&
      before.scriptSectionsCount === after.scriptSectionsCount &&
      before.uploadsCount === after.uploadsCount &&
      before.ideasCount === after.ideasCount
    );

    p.updatedAt = new Date().toISOString();
    this.saveProjects();

    return {
      success: true,
      isVerified,
      projectId: p.id,
      before,
      after
    };
  }

  moveProjectToFolder(projectId, folderId) {
    const p = this.projects.find(item => item.id === projectId);
    if (!p) return false;
    const folder = this.folders.find(f => f.id === folderId);
    if (!folder) return false;

    p.folderId = folder.id;
    p.folderName = folder.name;
    p.updatedAt = new Date().toISOString();
    this.saveProjects();
    return true;
  }

  downloadScriptFile(projectId) {
    const p = this.projects.find(item => item.id === projectId) || this.getActiveProject();
    if (!p) return;
    const filename = p.script?.customName || `${(p.name || 'project').replace(/[\s/\\?%*:|"<>]+/g, '_')}_script.txt`;
    const text = p.script?.fullText || (p.script?.sections || []).map(s => `[${s.sectionName || 'વિભાગ'} (${s.timeRange || ''})]\n${s.content}\n`).join('\n') || `વિષય: ${p.name}\n(કોઈ સ્ક્રિપ્ટ લખાણ નથી)`;
    this._triggerDownload(filename, text);
  }

  downloadPPTFile(projectId) {
    const p = this.projects.find(item => item.id === projectId) || this.getActiveProject();
    if (!p) return;
    const filename = p.slide?.customName || `${(p.name || 'project').replace(/[\s/\\?%*:|"<>]+/g, '_')}_slides.txt`;
    const slides = p.slide?.slides || [];
    let content = `========================================================\n📑 ${p.name} - સ્લાઇડ્સ & પ્રેઝન્ટેશન ડેક\n========================================================\n\n`;
    slides.forEach((s, idx) => {
      content += `[સ્લાઇડ #${idx + 1}] ${s.title}\n`;
      if (s.subtitle) content += `સબટાઇટલ: ${s.subtitle}\n`;
      if (s.audioTime) content += `સમય: ${s.audioTime}\n`;
      if (s.bulletPoints && s.bulletPoints.length > 0) {
        content += `મુખ્ય મુદ્દાઓ:\n${s.bulletPoints.map(b => `  • ${b}`).join('\n')}\n`;
      }
      if (s.scriptText) content += `સ્ક્રિપ્ટ / વર્ણન:\n${s.scriptText}\n`;
      content += `\n--------------------------------------------------------\n\n`;
    });
    this._triggerDownload(filename, content);
  }

  async downloadVoiceFile(projectId) {
    const p = this.projects.find(item => item.id === projectId) || this.getActiveProject();
    if (!p) return false;
    const filename = p.voice?.customName || p.voice?.filename || `${(p.name || 'project').replace(/[\s/\\?%*:|"<>]+/g, '_')}_voice.wav`;
    const audioRec = await this.getAudioRecording(p.id);
    if (audioRec && audioRec.blob) {
      this._triggerDownload(filename, audioRec.blob, 'audio/wav');
      return true;
    }
    if (p.voice?.audioUrl) {
      const a = document.createElement('a');
      a.href = p.voice.audioUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }
    alert('આ પ્રોજેક્ટમાં હજી ઓડિયો રેકોર્ડ કરેલ નથી. ૪. મારો અવાજ ટૂલમાં જઈને રેકોર્ડ કરો.');
    return false;
  }

  downloadThumbnailFile(projectId) {
    const p = this.projects.find(item => item.id === projectId) || this.getActiveProject();
    if (!p) return;
    const filename = p.thumbnail?.customName ? (p.thumbnail.customName.replace(/\.png$/i, '_plan.txt')) : `${(p.name || 'project').replace(/[\s/\\?%*:|"<>]+/g, '_')}_thumbnail_plan.txt`;
    const content = `========================================================\n🖼️ ${p.name} - થંબનેલ ડિઝાઇન પ્લાન (16:9 HD)\n========================================================\n\nગુજરાતી શબ્દો (4 Words):\n${p.thumbnail?.gujaratiWords || p.name}\n\nફોટો સંદર્ભ:\n${p.thumbnail?.photoSubject || 'સત્તાવાર પરિપત્ર સંદર્ભ'}\n\nDALL-E 3 / AI ઇમેજ પ્રોમ્પ્ટ:\n${p.thumbnail?.dalleShortPrompt || 'A minimalist 16:9 YouTube thumbnail with white background.'}\n\nકેન્વા હેડલાઇન:\n${p.canva?.headline || p.name}\n${p.canva?.subtitle || ''}\n`;
    this._triggerDownload(filename, content);
  }

  downloadCompleteFolderBundle(projectId) {
    const p = this.projects.find(item => item.id === projectId) || this.getActiveProject();
    if (!p) return;
    const folderBundleText = this.generateCompleteExportText();
    const filename = `${(p.folderName || 'Folder').replace(/[\s/\\?%*:|"<>]+/g, '_')}_${(p.name || 'project').replace(/[\s/\\?%*:|"<>]+/g, '_')}_સંપૂર્ણ_પેકેજ.txt`;
    this._triggerDownload(filename, folderBundleText);
  }

  _triggerDownload(filename, content, mimeType = 'text/plain;charset=utf-8') {
    try {
      const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.warn('Download error:', e);
    }
  }

  duplicateProject(projectId) {
    const orig = this.projects.find(item => item.id === projectId);
    if (!orig) return null;

    const copy = JSON.parse(JSON.stringify(orig));
    copy.id = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    copy.name = orig.name + ' (કોપી)';
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = new Date().toISOString();

    const origIdx = this.projects.findIndex(item => item.id === projectId);
    this.projects.splice(origIdx + 1, 0, copy);
    this.activeProjectId = copy.id;
    this.saveProjects();
    return copy;
  }

  deleteProject(projectId) {
    const idx = this.projects.findIndex(item => item.id === projectId || item.topicId === projectId);
    if (idx !== -1) {
      const deleted = this.projects.splice(idx, 1)[0];
      if (this.activeProjectId === projectId || this.activeProjectId === deleted.id || this.activeProjectId === deleted.topicId) {
        this.activeProjectId = this.projects[0]?.id || '';
      }
      this.saveProjects();
      window.dispatchEvent(new CustomEvent('projectsListUpdated', { detail: this.projects }));
      return true;
    }
    return false;
  }

  updateActiveProject(updates) {
    const active = this.getActiveProject();
    if (!active) return null;

    Object.assign(active, updates);
    active.updatedAt = new Date().toISOString();
    this.saveProjects();
    return active;
  }

  // Update specific tool in active project
  updateTool(toolName, data) {
    const active = this.getActiveProject();
    if (!active) return;

    if (!active[toolName]) {
      active[toolName] = {};
    }
    active[toolName] = { ...active[toolName], ...data };
    active.updatedAt = new Date().toISOString();

    // Canonical synchronization for Script tool
    if (toolName === 'script') {
      const canonicalText = (data.fullText || data.rawText || active.script.fullText || active.script.rawText || '').trim();
      if (canonicalText) {
        active.script.fullText = canonicalText;
        active.script.rawText = canonicalText;
        if (!active.script.teleprompterText) {
          active.script.teleprompterText = canonicalText;
        }
      }
      if (!active.script.scriptId) {
        active.script.scriptId = `script_${active.id}_${Date.now()}`;
      }
      active.script.updatedAt = new Date().toISOString();

      // If sections are updated, propagate to slides
      if (Array.isArray(data.sections) && active.slide && Array.isArray(active.slide.slides)) {
        data.sections.forEach((sec, idx) => {
          if (active.slide.slides[idx] && sec.scriptText) {
            active.slide.slides[idx].scriptText = sec.scriptText;
            if (sec.title && (!active.slide.slides[idx].title || active.slide.slides[idx].title.startsWith('સ્લાઇડ #'))) {
              active.slide.slides[idx].title = sec.title;
            }
          }
        });
      }
    }

    // Sync legacy properties
    if (toolName === 'idea' && data.topic) {
      active.topic = data.topic;
      active.name = data.topic;
    }
    if (toolName === 'slide' && data.slides) {
      active.slides = data.slides;
    }
    if (toolName === 'voice') {
      active.voiceAudio = active.voice;
    }

    this.saveProjects();
  }

  setLastStep(stepKey) {
    const active = this.getActiveProject();
    if (active && stepKey) {
      active.lastStep = stepKey;
      active.updatedAt = new Date().toISOString();
      this.saveProjects();
    }
  }

  getLastStep(proj) {
    const p = proj || this.getActiveProject();
    return (p && p.lastStep) || 'topics';
  }

  /**
   * Get canonical complete final script for a project
   * Guaranteed to return one continuous unbroken document
   */
  getCanonicalFinalScript(projectId = null) {
    const active = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!active || !active.script) return '';
    return (active.script.fullText || active.script.rawText || active.script.originalChatGptScript || '').trim();
  }

  /**
   * Set canonical complete final script for a project
   * Preserves text verbatim without automatic splitting or rewriting
   */
  setCanonicalFinalScript(text = '', projectId = null, options = {}) {
    const active = projectId ? this.projects.find(p => p.id === projectId) : this.getActiveProject();
    if (!active) return '';
    if (!active.script) active.script = {};

    const clean = typeof text === 'string' ? text : '';
    active.script.fullText = clean;
    active.script.rawText = clean;
    if (!active.script.originalChatGptScript) {
      active.script.originalChatGptScript = clean;
    }
    active.script.characterCount = clean.length;
    active.script.wordCount = clean.trim() ? clean.trim().split(/\s+/).length : 0;
    active.script.updatedAt = new Date().toISOString();
    active.script.lastSavedAt = new Date().toISOString();
    active.script.isCompleted = Boolean(clean.trim());

    if (options.markScriptChanged) {
      active.script.isScriptChangedSinceRecording = true;
    }

    active.updatedAt = new Date().toISOString();
    this.saveProjects();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gyan_yatra_script_saved', {
        detail: { projectId: active.id, text: clean, wordCount: active.script.wordCount }
      }));
    }
    return clean;
  }

  async saveAudioRecording(audioData) {
    const active = this.getActiveProject();
    if (!active) return null;

    const { blob, dataUrl, duration, filename } = audioData || {};
    const pFilename = filename || `${(active.name || 'project').replace(/[\s/\\?%*:|"<>]+/g, '_')}_Audio.wav`;

    await saveProjectAudioRecord(active.id, {
      blob,
      dataUrl,
      duration: duration || 0,
      filename: pFilename
    });

    if (!active.voice) active.voice = {};
    active.voice.audioUrl = dataUrl && dataUrl.length < 2000000 ? dataUrl : (active.voice.audioUrl || '');
    active.voice.filename = pFilename;
    active.voice.duration = duration || active.voice.duration || 0;
    active.voice.hasSavedAudio = true;
    active.voice.provider = '🎙️ My Studio Voice (Recorded Live)';
    active.voice.isCompleted = true;
    active.updatedAt = new Date().toISOString();

    this.saveProjects();
    return active.voice;
  }

  async getAudioRecording(projectId) {
    const pId = projectId || this.activeProjectId;
    if (!pId) return null;
    return await getProjectAudioRecord(pId);
  }

  // --- Canva-Style Project-Specific Uploads & Asset Shelf ---
  getProjectUploads(projectId = null) {
    const p = projectId ? this.projects.find(i => i.id === projectId) : this.getActiveProject();
    if (!p) return [];
    if (!Array.isArray(p.uploads)) p.uploads = [];
    return p.uploads;
  }

  addProjectUpload(uploadItem, projectId = null) {
    const p = projectId ? this.projects.find(i => i.id === projectId) : this.getActiveProject();
    if (!p) return null;
    if (!Array.isArray(p.uploads)) p.uploads = [];

    const id = uploadItem.id || 'upl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const item = {
      id,
      type: uploadItem.type || 'file', // 'slide' | 'script' | 'audio' | 'image' | 'file'
      name: uploadItem.name || 'અપલોડ ફાઇલ',
      size: uploadItem.size || 0,
      sizeFormatted: uploadItem.sizeFormatted || (uploadItem.size ? `${uploadItem.size} KB` : ''),
      uploadedAt: uploadItem.uploadedAt || new Date().toISOString(),
      url: uploadItem.url || '',
      dataUrl: uploadItem.dataUrl || '',
      duration: uploadItem.duration || 0,
      slideCount: uploadItem.slideCount || 0,
      slides: uploadItem.slides || null,
      text: uploadItem.text || '',
      previewText: uploadItem.previewText || (uploadItem.text ? uploadItem.text.slice(0, 120) : '')
    };

    // Prepend so latest appears at top
    p.uploads.unshift(item);
    p.updatedAt = new Date().toISOString();
    this.saveProjects();
    window.dispatchEvent(new CustomEvent('projectUploadsChanged', { detail: { projectId: p.id, uploads: p.uploads } }));
    return item;
  }

  deleteProjectUpload(uploadId, projectId = null) {
    const p = projectId ? this.projects.find(i => i.id === projectId) : this.getActiveProject();
    if (!p || !Array.isArray(p.uploads)) return false;

    const idx = p.uploads.findIndex(u => u.id === uploadId);
    if (idx !== -1) {
      const removed = p.uploads.splice(idx, 1)[0];
      p.updatedAt = new Date().toISOString();
      this.saveProjects();
      window.dispatchEvent(new CustomEvent('projectUploadsChanged', { detail: { projectId: p.id, uploads: p.uploads } }));
      return removed;
    }
    return false;
  }

  applyProjectUpload(uploadId, projectId = null, slideIndex = null) {
    const p = projectId ? this.projects.find(i => i.id === projectId) : this.getActiveProject();
    if (!p || !Array.isArray(p.uploads)) return null;

    const item = p.uploads.find(u => u.id === uploadId);
    if (!item) return null;

    if (!p.slide) p.slide = {};
    if (!p.script) p.script = {};
    if (!p.voice) p.voice = {};

    // 1. Slides / PPT
    if ((item.type === 'slide' || item.slides) && item.slides && item.slides.length > 0) {
      p.slide.slides = JSON.parse(JSON.stringify(item.slides));
      p.slide.slideCount = `${p.slide.slides.length} સ્લાઇડ્સ`;
      p.slide.isCompleted = true;
    } 
    // 2. Script
    else if ((item.type === 'script' || item.text) && item.text) {
      if (slideIndex !== null && Array.isArray(p.slide.slides) && p.slide.slides[slideIndex]) {
        p.slide.slides[slideIndex].scriptText = item.text;
      } else {
        p.script.fullText = item.text;
        p.script.teleprompterText = item.text;
        p.script.isCompleted = true;
      }
    } 
    // 3. Audio
    else if (item.type === 'audio' && (item.url || item.dataUrl)) {
      const audioSrc = item.url || item.dataUrl;
      if (slideIndex !== null && Array.isArray(p.slide.slides) && p.slide.slides[slideIndex]) {
        p.slide.slides[slideIndex].audioUrl = audioSrc;
        p.slide.slides[slideIndex].audioDuration = item.duration || 0;
      }
      p.voice.audioUrl = audioSrc;
      p.voice.filename = item.name;
      p.voice.duration = item.duration || p.voice.duration || 0;
      p.voice.hasSavedAudio = true;
      p.voice.isCompleted = true;
    }
    // 4. Image / Circular
    else if (item.type === 'image' && (item.dataUrl || item.url)) {
      const imgSrc = item.dataUrl || item.url;
      if (!Array.isArray(p.slide.slides)) p.slide.slides = [];
      const targetIdx = (slideIndex !== null && p.slide.slides[slideIndex]) ? slideIndex : 0;
      if (p.slide.slides[targetIdx]) {
        p.slide.slides[targetIdx].imageUrl = imgSrc;
        p.slide.slides[targetIdx].imageName = item.name;
      }
    }

    p.updatedAt = new Date().toISOString();
    this.saveProjects();
    window.dispatchEvent(new CustomEvent('projectStateUpdated', { detail: p }));
    return item;
  }

  // --- CLOUD FIRESTORE SYNCHRONIZATION & MIGRATION ---

  initCloudSync() {
    try {
      firebaseService.onAuthChange(async (user) => {
        if (user && user.uid) {
          console.log('[ProjectState] Authenticated user active:', user.uid);
          await this.migrateAndSyncCloud(user.uid);
        } else {
          console.log('[ProjectState] User signed out or offline, operating on LocalStorage cache.');
          firebaseService.clearAllSubscriptions();
        }
      });
    } catch (e) {
      console.warn('[ProjectState initCloudSync notice]:', e.message);
    }
  }

  async migrateAndSyncCloud(uid) {
    if (this.isMigrating) return;
    this.isMigrating = true;

    try {
      const cloudProjects = await firebaseService.getCloudProjects(uid);

      if (cloudProjects && cloudProjects.length > 0) {
        // Cloud has projects -> Cloud is authoritative! Merge safely without overwriting
        console.log(`[ProjectState] Loaded ${cloudProjects.length} cloud projects from Firestore.`);
        
        const localMap = new Map(this.projects.map(p => [p.id, p]));
        cloudProjects.forEach(cp => {
          const localP = localMap.get(cp.id);
          if (localP) {
            localMap.set(cp.id, { ...localP, ...cp, uploads: localP.uploads || [] });
          } else {
            localMap.set(cp.id, { ...createBlankProject(cp.name, cp.topic), ...cp });
          }
        });

        this.projects = Array.from(localMap.values());
        if (!this.projects.some(p => p.id === this.activeProjectId) && this.projects[0]) {
          this.activeProjectId = this.projects[0].id;
        }
        localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(this.projects));
        window.dispatchEvent(new CustomEvent('projectsListUpdated', { detail: this.projects }));
        window.dispatchEvent(new CustomEvent('projectStateUpdated', { detail: this.getActiveProject() }));
      } else if (this.projects && this.projects.length > 0) {
        // Cloud is empty, but local has projects -> Safe One-Time Migration!
        console.log(`[ProjectState] Cloud empty. Migrating ${this.projects.length} local projects to Firestore...`);
        for (const proj of this.projects) {
          await firebaseService.saveProjectDoc(uid, proj);
          const ideas = this.getProjectIdeas(proj.id);
          for (const idea of ideas) {
            await firebaseService.saveIdeaDoc(uid, proj.id, idea);
          }
        }
        localStorage.setItem(`gyan_migrated_${uid}`, 'true');
        console.log('[ProjectState] Migration to Cloud Firestore completed successfully.');
      }

      // Real-time synchronization subscription
      firebaseService.subscribeProjects(uid, (updatedProjects) => {
        if (!updatedProjects || updatedProjects.length === 0) return;
        
        let hasChanges = false;
        const currentMap = new Map(this.projects.map(p => [p.id, p]));

        updatedProjects.forEach(up => {
          const curr = currentMap.get(up.id);
          if (!curr || (up.clientUpdatedAt && curr.updatedAt && up.clientUpdatedAt > curr.updatedAt)) {
            // Script preservation guard: never let older cloud state overwrite a newer or non-empty local script
            const currScriptText = (curr?.script?.fullText || curr?.script?.rawText || '').trim();
            const upScriptText = (up.script?.fullText || up.script?.rawText || '').trim();
            let mergedScript = up.script;
            if (currScriptText && (!upScriptText || (curr.script?.updatedAt && up.script?.updatedAt && curr.script.updatedAt > up.script.updatedAt))) {
              mergedScript = curr.script;
            }
            currentMap.set(up.id, { ...(curr || createBlankProject(up.name, up.topic)), ...up, script: mergedScript || up.script || curr?.script });
            hasChanges = true;
          }
        });

        if (hasChanges) {
          this.projects = Array.from(currentMap.values());
          localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(this.projects));
          window.dispatchEvent(new CustomEvent('projectsListUpdated', { detail: this.projects }));
          window.dispatchEvent(new CustomEvent('projectStateUpdated', { detail: this.getActiveProject() }));
        }
      });
    } catch (err) {
      console.warn('[ProjectState Migration/Sync Error]:', err.message);
    } finally {
      this.isMigrating = false;
    }
  }

  debouncedCloudSync(projectId = null) {
    if (this.cloudSyncTimer) clearTimeout(this.cloudSyncTimer);

    this.cloudSyncTimer = setTimeout(async () => {
      const uid = firebaseService.getAuthUID();
      if (!uid) return;

      const p = projectId ? this.projects.find(i => i.id === projectId) : this.getActiveProject();
      if (p) {
        await firebaseService.saveProjectDoc(uid, p);
      }
    }, 1200);
  }

  // --- MULTI-IDEA MANAGEMENT (PRIORITY 1) ---

  getProjectIdeas(projectId = null) {
    const p = projectId ? this.projects.find(i => i.id === projectId) : this.getActiveProject();
    if (!p) return [];

    if (!Array.isArray(p.ideas)) {
      p.ideas = [];
      if (p.idea && p.idea.topic) {
        p.ideas.push({
          id: 'idea_' + Date.now(),
          projectId: p.id,
          title: p.idea.topic,
          views48h: null,
          views60m: null,
          previousViews48h: null,
          velocityPerHour: null,
          growthPct: null,
          classification: 'Insufficient Data',
          analysisReason: 'પ્રારંભિક આઈડિયા (Baseline idea created without OCR)',
          isConfidenceVerified: true,
          notes: p.idea.notes || '',
          referenceLinks: [],
          isSelected: true,
          order: 0,
          capturedAt: null,
          sourcePublishedAt: null,
          analyzedAt: null,
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
    return p.ideas;
  }

  async saveProjectIdea(ideaData, projectId = null) {
    let p = projectId ? this.projects.find(i => i.id === projectId) : this.getActiveProject();
    if (!p) {
      if (typeof this.ensureActiveProject === 'function') {
        p = this.ensureActiveProject();
      }
      if (!p) {
        p = buildTopicProjectKit('Gyan Yatra Project', 'default_proj');
        this.projects.push(p);
        this.activeProjectId = p.id;
      }
    }
    if (!p) return null;

    if (!Array.isArray(p.ideas)) p.ideas = [];

    const ideaId = ideaData.id || ('idea_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const cleanTitle = (ideaData.title || '').trim();

    const existingIdx = p.ideas.findIndex(i => i.id === ideaId);
    const existingByTitle = p.ideas.findIndex((i, idx) => idx !== existingIdx && i.title.toLowerCase() === cleanTitle.toLowerCase());

    if (existingByTitle !== -1 && !ideaData.allowDuplicate) {
      if (ideaData.description !== undefined) p.ideas[existingByTitle].description = ideaData.description;
      if (ideaData.notes !== undefined) p.ideas[existingByTitle].notes = ideaData.notes;
      if (ideaData.originalText !== undefined) p.ideas[existingByTitle].originalText = ideaData.originalText;
      p.ideas[existingByTitle].updatedAt = new Date().toISOString();
      this.saveProjects();
      return p.ideas[existingByTitle];
    }

    const previousRecord = existingIdx >= 0 ? p.ideas[existingIdx] : null;

    const record = {
      id: ideaId,
      projectId: p.id,
      title: cleanTitle || p.topic || 'નવો આઈડિયા',
      description: ideaData.description !== undefined ? ideaData.description : (previousRecord?.description || ''),
      originalText: ideaData.originalText !== undefined ? ideaData.originalText : (previousRecord?.originalText || ''),
      inputType: ideaData.inputType || previousRecord?.inputType || 'manual',
      category: ideaData.category || previousRecord?.category || p.category || 'સરકારી યોજના',
      tags: Array.isArray(ideaData.tags) ? ideaData.tags : (previousRecord?.tags || []),
      source: ideaData.source || previousRecord?.source || '',
      sourceUrl: ideaData.sourceUrl || previousRecord?.sourceUrl || '',
      timezone: 'Asia/Kolkata',
      isArchived: ideaData.isArchived !== undefined ? Boolean(ideaData.isArchived) : Boolean(previousRecord?.isArchived),
      cropSnippet: ideaData.cropSnippet || previousRecord?.cropSnippet || '',
      bbox: ideaData.bbox || previousRecord?.bbox || null,
      views48h: (typeof ideaData.views48h === 'number' && !isNaN(ideaData.views48h)) ? ideaData.views48h : (ideaData.views48h ? Number(ideaData.views48h) : null),
      views60m: (typeof ideaData.views60m === 'number' && !isNaN(ideaData.views60m)) ? ideaData.views60m : (ideaData.views60m ? Number(ideaData.views60m) : null),
      previousViews48h: (typeof ideaData.previousViews48h === 'number') ? ideaData.previousViews48h : (previousRecord?.views48h || null),
      velocityPerHour: (typeof ideaData.velocityPerHour === 'number') ? ideaData.velocityPerHour : (previousRecord?.velocityPerHour || null),
      growthPct: (typeof ideaData.growthPct === 'number') ? ideaData.growthPct : (previousRecord?.growthPct || null),
      classification: ideaData.classification || previousRecord?.classification || 'Insufficient Data',
      analysisReason: ideaData.analysisReason || previousRecord?.analysisReason || '',
      isConfidenceVerified: ideaData.isConfidenceVerified !== undefined ? Boolean(ideaData.isConfidenceVerified) : (previousRecord?.isConfidenceVerified !== undefined ? previousRecord.isConfidenceVerified : true),
      confidenceScore: typeof ideaData.confidenceScore === 'number' ? ideaData.confidenceScore : (previousRecord?.confidenceScore || null),
      uncertainFields: Array.isArray(ideaData.uncertainFields) ? ideaData.uncertainFields : (previousRecord?.uncertainFields || []),
      notes: ideaData.notes !== undefined ? ideaData.notes : (previousRecord?.notes || ''),
      referenceLinks: Array.isArray(ideaData.referenceLinks) ? ideaData.referenceLinks : (previousRecord?.referenceLinks || []),
      isSelected: ideaData.isSelected !== undefined ? Boolean(ideaData.isSelected) : (existingIdx === -1 ? true : previousRecord.isSelected),
      order: ideaData.order !== undefined ? Number(ideaData.order) : (existingIdx !== -1 ? previousRecord.order : p.ideas.length),
      capturedAt: ideaData.capturedAt || previousRecord?.capturedAt || null,
      sourcePublishedAt: ideaData.sourcePublishedAt || previousRecord?.sourcePublishedAt || null,
      analyzedAt: ideaData.analyzedAt || previousRecord?.analyzedAt || null,
      clientUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: existingIdx >= 0 ? (previousRecord.createdAt || new Date().toISOString()) : (ideaData.createdAt || new Date().toISOString())
    };

    if (existingIdx >= 0) {
      p.ideas[existingIdx] = record;
    } else {
      p.ideas.push(record);
    }

    if (record.isSelected || p.ideas.length === 1) {
      p.topic = record.title;
      p.name = record.title;
      if (!p.idea) p.idea = {};
      p.idea.topic = record.title;
      if (ideaData.masterPrompt) p.idea.masterPrompt = ideaData.masterPrompt;
      if (record.notes) p.idea.notes = record.notes;
    }

    // Auto-sync into central pasted topics so Tool 3 (My Topics) instantly contains this idea
    try {
      if (typeof localStorage !== 'undefined' && record.title) {
        const rawPasted = localStorage.getItem('gyan_48h_pasted_topics');
        let pastedList = rawPasted ? JSON.parse(rawPasted) : [];
        if (!Array.isArray(pastedList)) pastedList = [];
        const normTitle = record.title.trim().toLowerCase();
        const existingPastedIdx = pastedList.findIndex(t => t && (t.id === record.id || (t.title && t.title.trim().toLowerCase() === normTitle)));
        if (existingPastedIdx === -1) {
          pastedList.unshift({
            id: record.id,
            title: record.title,
            timestamp: record.createdAt || new Date().toISOString(),
            addedToPlanner: false,
            addedToIdea: true
          });
          localStorage.setItem('gyan_48h_pasted_topics', JSON.stringify(pastedList));
        }
      }
    } catch (_) {}

    p.updatedAt = new Date().toISOString();
    this.saveProjects();

    const uid = firebaseService.getAuthUID();
    if (uid) {
      firebaseService.saveIdeaDoc(uid, p.id, record);

      // Save a history snapshot ONLY on meaningful trigger or real view change
      const hasMeaningfulChange = ideaData.saveHistorySnapshot || 
        (previousRecord && previousRecord.views48h !== record.views48h && record.views48h !== null);

      if (hasMeaningfulChange) {
        firebaseService.saveIdeaHistoryDoc(uid, p.id, record.id, {
          views48h: record.views48h,
          views60m: record.views60m,
          velocityPerHour: record.velocityPerHour,
          growthPct: record.growthPct,
          classification: record.classification,
          analysisReason: record.analysisReason,
          trigger: ideaData.historyTrigger || 'metric_update',
          timestamp: new Date().toISOString(),
          capturedAt: record.capturedAt,
          sourcePublishedAt: record.sourcePublishedAt,
          analyzedAt: record.analyzedAt
        });
      }
    }

    window.dispatchEvent(new CustomEvent('projectIdeasChanged', { detail: { projectId: p.id, ideas: p.ideas } }));
    return record;
  }

  async deleteProjectIdea(ideaId, projectId = null) {
    const p = projectId ? this.projects.find(i => i.id === projectId) : this.getActiveProject();
    if (!p || !Array.isArray(p.ideas)) return false;

    const idx = p.ideas.findIndex(i => i.id === ideaId);
    if (idx === -1) return false;

    const removed = p.ideas.splice(idx, 1)[0];
    p.ideas.forEach((item, i) => { item.order = i; });

    if (p.ideas.length > 0 && (!p.ideas.some(i => i.isSelected))) {
      p.ideas[0].isSelected = true;
      p.topic = p.ideas[0].title;
      p.name = p.ideas[0].title;
      if (p.idea) p.idea.topic = p.ideas[0].title;
    }

    p.updatedAt = new Date().toISOString();
    this.saveProjects();

    const uid = firebaseService.getAuthUID();
    if (uid) {
      firebaseService.deleteIdeaDoc(uid, p.id, ideaId);
    }

    window.dispatchEvent(new CustomEvent('projectIdeasChanged', { detail: { projectId: p.id, ideas: p.ideas } }));
    return removed;
  }

  selectProjectIdea(ideaId, projectId = null) {
    const p = projectId ? this.projects.find(i => i.id === projectId) : this.getActiveProject();
    if (!p || !Array.isArray(p.ideas)) return false;

    const target = p.ideas.find(i => i.id === ideaId);
    if (!target) return false;

    p.ideas.forEach(i => { i.isSelected = (i.id === ideaId); });
    p.topic = target.title;
    p.name = target.title;
    if (!p.idea) p.idea = {};
    p.idea.topic = target.title;
    if (target.notes) p.idea.notes = target.notes;

    p.updatedAt = new Date().toISOString();
    this.saveProjects();

    window.dispatchEvent(new CustomEvent('projectIdeasChanged', { detail: { projectId: p.id, ideas: p.ideas } }));
    window.dispatchEvent(new CustomEvent('projectStateUpdated', { detail: p }));
    return true;
  }

  async duplicateProjectIdea(ideaId, projectId = null) {
    const p = projectId ? this.projects.find(i => i.id === projectId) : this.getActiveProject();
    if (!p || !Array.isArray(p.ideas)) return null;

    const original = p.ideas.find(i => i.id === ideaId);
    if (!original) return null;

    const copyData = {
      ...original,
      id: 'idea_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: `${original.title} (નકલ)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      allowDuplicate: true
    };

    return this.saveProjectIdea(copyData, p.id);
  }

  async archiveProjectIdea(ideaId, isArchived = true, projectId = null) {
    const p = projectId ? this.projects.find(i => i.id === projectId) : this.getActiveProject();
    if (!p || !Array.isArray(p.ideas)) return false;

    const target = p.ideas.find(i => i.id === ideaId);
    if (!target) return false;

    target.isArchived = Boolean(isArchived);
    target.updatedAt = new Date().toISOString();
    this.saveProjects();

    const uid = firebaseService.getAuthUID();
    if (uid) {
      firebaseService.saveIdeaDoc(uid, p.id, target);
    }

    window.dispatchEvent(new CustomEvent('projectIdeasChanged', { detail: { projectId: p.id, ideas: p.ideas } }));
    return true;
  }

  // Backwards compatibility methods
  setTopic(topic, masterPrompt = '', options = {}) {
    const cleanTopic = (topic || '').trim();
    if (!cleanTopic) return;

    // Resolve current active project WITHOUT letting stale gyan_active_topic_name snap it back
    let active = this.projects.find(item => item && (item.id === this.activeProjectId || item.topicId === this.activeProjectId));
    if (!active) active = this.getActiveProject();

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gyan_active_topic_name', cleanTopic);
        if (active?.id) localStorage.setItem('gyan_active_topic_id', active.id);
      }
      if (typeof window !== 'undefined') window.prefillTopic = cleanTopic;
    } catch (_) {}

    if (active) {
      const prevTopic = (active.topic || active.name || '').trim();
      active.topic = cleanTopic;
      active.name = cleanTopic;
      active.recommendedTitle = cleanTopic;
      active.idea = { ...(active.idea || {}), topic: cleanTopic, masterPrompt: masterPrompt || active.idea?.masterPrompt || '' };
      active.updatedAt = new Date().toISOString();

      // Only rebuild project kit when explicitly requested (never discard slides/PDF mid-typing)
      if (options.rebuildKit && prevTopic && prevTopic !== cleanTopic && !active.slide?.importedPresentation) {
        const refreshed = buildTopicProjectKit(cleanTopic, active.id, active);
        if (refreshed) {
          active.slide = refreshed.slide;
          active.script = refreshed.script;
          active.seo = refreshed.seo;
          active.thumbnail = refreshed.thumbnail;
        }
      }
      this.saveProjects();
      window.dispatchEvent(new CustomEvent('topicContextChanged', { detail: { topicId: active.id, project: active } }));
      window.dispatchEvent(new CustomEvent('projectStateUpdated', { detail: active }));
    }
  }

  setScript(scriptData) {
    this.updateTool('script', scriptData);
    const active = this.getActiveProject();
    // NEVER overwrite authentic imported presentation slides with synthetic slides
    const hasImportedSlides = Boolean(active?.slide?.importedPresentation || (Array.isArray(active?.slide?.slides) && active.slide.slides.length > 0));
    if (active && !hasImportedSlides && scriptData.sections && scriptData.sections.length > 0) {
      const slides = scriptData.sections.map((sec, idx) => ({
        id: idx + 1,
        title: sec.sectionName,
        subtitle: sec.timeRange || `ભાગ ${idx + 1}`,
        bulletPoints: sec.content
          .split(/[.।!]/)
          .map(s => s.trim())
          .filter(s => s.length > 10)
          .slice(0, 3),
        scriptText: sec.content || '',
        audioTime: sec.timeRange || '',
        bgColor: '#FFFFFF',
        textColor: '#0F172A',
        accentColor: idx === 0 ? '#DC2626' : idx === 1 ? '#2563EB' : '#10B981'
      }));
      this.updateTool('slide', { slides });
    }
  }

  setVoiceAudio(audioData) {
    this.updateTool('voice', audioData);
  }

  setSlides(slides) {
    this.updateTool('slide', { slides });
  }

  // Phase 1: Reorder slides with permanent slideId, script and audio preservation
  reorderProjectSlides(projectId, fromIndex, toIndex) {
    const p = this.projects.find(item => item.id === projectId);
    if (!p || !p.slide || !Array.isArray(p.slide.slides)) return false;
    const slides = p.slide.slides;
    if (fromIndex < 0 || fromIndex >= slides.length || toIndex < 0 || toIndex >= slides.length || fromIndex === toIndex) {
      return false;
    }

    // Move the slide
    const [movedSlide] = slides.splice(fromIndex, 1);
    slides.splice(toIndex, 0, movedSlide);

    // Update slideNumber sequence for visual display, keeping permanent slideId and original pageNumber!
    slides.forEach((sl, idx) => {
      sl.slideNumber = idx + 1;
      if (!sl.slideId) {
        sl.slideId = sl.id ? String(sl.id) : `slide_${p.id}_${idx + 1}_${Date.now()}`;
      }
      sl.id = sl.slideId;
    });

    // Also update project.script.sections in the exact same reordered sequence
    if (Array.isArray(p.script?.sections) && p.script.sections.length > 0) {
      const sections = p.script.sections;
      const movedSecIndex = sections.findIndex(sec => (sec.slideId && sec.slideId === movedSlide.slideId) || sec.slideNumber === (fromIndex + 1));
      if (movedSecIndex !== -1) {
        const [movedSec] = sections.splice(movedSecIndex, 1);
        sections.splice(toIndex, 0, movedSec);
      } else if (fromIndex < sections.length) {
        const [movedSec] = sections.splice(fromIndex, 1);
        sections.splice(toIndex, 0, movedSec);
      }
      sections.forEach((sec, idx) => {
        sec.slideNumber = idx + 1;
        sec.sectionName = `સ્લાઇડ #${idx + 1}`;
        if (slides[idx]) {
          sec.slideId = slides[idx].slideId;
          slides[idx].scriptText = sec.scriptText || slides[idx].scriptText || '';
        }
      });
      p.script.sections = sections;
      p.script.editedSections = sections;
    }

    p.updatedAt = new Date().toISOString();
    this.saveProjects();
    window.dispatchEvent(new CustomEvent('projectSlidesReordered', { detail: { projectId, slides } }));
    return true;
  }

  deleteProjectSlide(projectId, slideIndex) {
    const p = this.projects.find(item => item.id === projectId);
    if (!p || !p.slide || !Array.isArray(p.slide.slides) || p.slide.slides.length <= 1) return false;
    if (slideIndex < 0 || slideIndex >= p.slide.slides.length) return false;

    p.slide.slides.splice(slideIndex, 1);
    p.slide.slides.forEach((sl, idx) => {
      sl.slideNumber = idx + 1;
      if (!sl.slideId) sl.slideId = sl.id ? String(sl.id) : `slide_${p.id}_${idx + 1}_${Date.now()}`;
      sl.id = sl.slideId;
    });

    if (Array.isArray(p.script?.sections) && slideIndex < p.script.sections.length) {
      p.script.sections.splice(slideIndex, 1);
      p.script.sections.forEach((sec, idx) => {
        sec.slideNumber = idx + 1;
        sec.sectionName = `સ્લાઇડ #${idx + 1}`;
      });
      p.script.editedSections = p.script.sections;
    }
    p.slide.slideCount = `${p.slide.slides.length} સ્લાઇડ્સ`;
    p.updatedAt = new Date().toISOString();
    this.saveProjects();
    return true;
  }

  addProjectSlide(projectId, afterIndex) {
    const p = this.projects.find(item => item.id === projectId);
    if (!p || !p.slide || !Array.isArray(p.slide.slides)) return null;
    const slides = p.slide.slides;
    const insertIdx = (afterIndex !== undefined && afterIndex >= 0 && afterIndex < slides.length) ? afterIndex + 1 : slides.length;
    const newSlideId = `slide_${p.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    const newSlide = {
      slideId: newSlideId,
      id: newSlideId,
      slideNumber: insertIdx + 1,
      pageNumber: insertIdx + 1,
      title: `નવી સ્લાઇડ #${insertIdx + 1}`,
      subtitle: '',
      bulletPoints: ['મુખ્ય વિગત લખો...'],
      scriptText: '',
      recordingStatus: 'Not Recorded',
      bgColor: '#FFFFFF',
      textColor: '#0F172A'
    };

    slides.splice(insertIdx, 0, newSlide);
    slides.forEach((sl, idx) => {
      sl.slideNumber = idx + 1;
    });

    if (Array.isArray(p.script?.sections)) {
      const newSection = {
        slideId: newSlideId,
        sectionId: `sec_${newSlideId}`,
        slideNumber: insertIdx + 1,
        sectionName: `સ્લાઇડ #${insertIdx + 1}`,
        title: newSlide.title,
        scriptText: '',
        timing: ''
      };
      p.script.sections.splice(insertIdx, 0, newSection);
      p.script.sections.forEach((sec, idx) => {
        sec.slideNumber = idx + 1;
        sec.sectionName = `સ્લાઇડ #${idx + 1}`;
      });
      p.script.editedSections = p.script.sections;
    }

    p.slide.slideCount = `${slides.length} સ્લાઇડ્સ`;
    p.updatedAt = new Date().toISOString();
    this.saveProjects();
    return newSlide;
  }

  setSEO(seoData) {
    this.updateTool('seo', seoData);
  }

  setThumbnail(thumbData) {
    this.updateTool('thumbnail', thumbData);
  }

  updateProject(updates) {
    return this.updateActiveProject(updates);
  }

  // Calculate project completion percentage (0 - 100%)
  getProjectProgress(proj) {
    if (!proj) return 0;
    let score = 0;
    const total = 8;

    if (proj.idea?.topic && proj.idea?.topic !== 'નવો વિડીયો વિષય') score++;
    if (proj.slide?.slides?.length > 1) score++;
    if (proj.script?.sections?.length > 1) score++;
    if (proj.voice?.audioUrl || proj.voice?.notes) score++;
    if (proj.editing?.customNotes || Object.values(proj.editing?.checklist || {}).some(v => v)) score++;
    if (proj.canva?.notes || proj.canva?.headline) score++;
    if (proj.seo?.title && proj.seo?.description) score++;
    if (proj.thumbnail?.gujaratiWords || proj.thumbnail?.dalleShortPrompt) score++;

    return Math.round((score / total) * 100);
  }

  // Export all projects as JSON for backup
  exportAllProjectsJSON() {
    return JSON.stringify({
      version: '3.0',
      exportedAt: new Date().toISOString(),
      activeProjectId: this.activeProjectId,
      projects: this.projects
    }, null, 2);
  }

  // Import projects from JSON
  importProjectsJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.projects) && data.projects.length > 0) {
        this.projects = data.projects;
        this.activeProjectId = data.activeProjectId || this.projects[0].id;
        this.saveProjects();
        return { success: true, count: this.projects.length };
      }
      return { success: false, error: 'અમાન્ય ફાઇલ ફોર્મેટ (Invalid JSON)' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Generates single clean export bundle text for active project
  generateCompleteExportText() {
    const p = this.getActiveProject();
    if (!p) return '';

    return `=======================================================
🎯 GYAN YATRA CREATOR STUDIO - વિડીયો પ્રોજેક્ટ પેકેજ
=======================================================
📁 પ્રોજેક્ટ નામ: ${p.name}
📌 વિષય (Topic): ${p.topic || p.name}
🕒 છેલ્લે સેવ કરેલ સમય: ${new Date(p.updatedAt).toLocaleString('gu-IN')}
📊 પ્રગતિ (Progress): ${this.getProjectProgress(p)}%

-------------------------------------------------------
💡 ૧. આઈડિયા (Idea & Topic):
-------------------------------------------------------
વિષય: ${p.idea?.topic || p.name}
નોંધ: ${p.idea?.notes || 'N/A'}

-------------------------------------------------------
📑 ૨. સ્લાઇડ્સ (Slides Outline):
-------------------------------------------------------
${(p.slide?.slides || []).map((s, i) => `[સ્લાઇડ #${i + 1}] ${s.title} (${s.audioTime || ''})
  - ${s.subtitle}
  - મુદ્દા: ${(s.bulletPoints || []).join(' | ')}
`).join('\n')}

-------------------------------------------------------
📝 ૩. સ્ક્રિપ્ટ (Video Script):
-------------------------------------------------------
શીર્ષક: ${p.script?.title || p.name}
સમય: ${p.script?.durationMinutes || 10} મિનિટ

${(p.script?.sections || []).map((sec, i) => `[${i + 1}. ${sec.sectionName} (${sec.timeRange || ''})]
${sec.content}
`).join('\n')}

-------------------------------------------------------
🎙️ ૪. મારો અવાજ (Voice Audio):
-------------------------------------------------------
ઓડિયો URL: ${p.voice?.audioUrl || 'N/A'}
ફાઇલ: ${p.voice?.filename || 'N/A'}
પ્રોવાઇડર: ${p.voice?.provider || 'ElevenLabs STS v2'}

-------------------------------------------------------
🎬 ૫. એડિટિંગ ગાઇડ (Editing Notes & Checklist):
-------------------------------------------------------
રેશિયો: ${p.editing?.aspectRatio || '16:9'} | ${p.editing?.fps || '60fps'} | ${p.editing?.resolution || '1080p'}
સંગીત: ${p.editing?.musicStyle || 'Soft News Tone'}
નોંધ:
${p.editing?.customNotes || 'N/A'}

-------------------------------------------------------
🎨 ૬. કેન્વા (Canva Graphics):
-------------------------------------------------------
હેડલાઇન: ${p.canva?.headline || p.name}
સબટાઇટલ: ${p.canva?.subtitle || ''}
બેજ: ${p.canva?.badgeText || ''}

-------------------------------------------------------
🚀 ૭. YOUTUBE SEO (Title, Description & Tags):
-------------------------------------------------------
[Title]:
${p.seo?.title || ''}

[Description]:
${p.seo?.description || ''}

[Tags]:
${p.seo?.tags || ''}

[Pinned Comment]:
${p.seo?.pinnedComment || ''}

-------------------------------------------------------
🖼️ ૮. થંબનેલ (Thumbnail Plan):
-------------------------------------------------------
શબ્દો: "${p.thumbnail?.gujaratiWords || ''}"
અસલી ફોટો: ${p.thumbnail?.photoSubject || ''}
DALL-E 3 શોર્ટ પ્રોમ્પ્ટ:
${p.thumbnail?.dalleShortPrompt || ''}

=======================================================
જ્ઞાન યાત્રા - Gujarati YouTube Creator Studio
=======================================================`;
  }
}

export const projectState = new ProjectStateManager();
