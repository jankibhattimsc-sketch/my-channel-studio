/**
 * ChatGPT Script Prompt Generator (Stage 4: Script)
 * Gyan Yatra AI Studio — Master Connected Video Production Workflow
 * 
 * Connected Workflow:
 * 1. Automatically connects to the presentation imported in Stage 3 (Slides).
 * 2. Extracts and displays presentation info, slide count, and content summary.
 * 3. Generates a detailed, ready-to-use Gujarati ChatGPT Script Writing Prompt containing
 *    all slide titles, bullet points, numbers, and dates.
 * 4. User copies prompt with 1-click and opens ChatGPT.
 * 5. User pastes ChatGPT-generated script into the Import box.
 * 6. System parses the script into slide-wise sections and saves persistently inside active project.
 * 7. Passes cleanly to Stage 5: Script Editor.
 */

import { api } from '../api.js';
import { projectState, isContentMatchingTopic, buildTopicProjectKit } from '../utils/projectState.js';
import { copyToClipboard, showNoticeToast } from '../utils/clipboard.js';
import { formatIndianDateTimeDisplay } from '../utils/dateTimeIntelligence.js';
import { parseChatGptScriptText, validateScriptFidelity, validateSlideWiseScriptFidelity } from '../utils/externalSlideParser.js';
import { saveScriptToDatabase, syncProjectScriptWithDatabase, restoreScriptVersionFromDb } from '../utils/scriptDbSync.js';
import { saveProjectPresentation, getProjectPresentation } from '../utils/presentationStorage.js';
import { openFolderNotebookModal } from '../utils/folderNotebookModal.js';

export async function renderScriptWriter(container, navigateTo) {
  let project = projectState.getActiveProject();
  const storedTopic = (typeof localStorage !== 'undefined' ? (localStorage.getItem('gyan_active_topic_name') || '') : '').trim();
  if (project && storedTopic && (!project.topic || project.topic === 'મારો નવો વિડીયો પ્રોજેક્ટ' || project.topic === 'Untitled Project' || (project.topic !== storedTopic && !project.slide?.importedPresentation))) {
    project.topic = storedTopic;
    project.name = storedTopic;
    project.recommendedTitle = storedTopic;
  }
  if (!project) {
    container.innerHTML = `
      <div class="card" style="padding: 40px; text-align: center;">
        <span style="font-size: 3rem;">📁</span>
        <h2>કોઈ સક્રિય પ્રોજેક્ટ પસંદ કરેલ નથી</h2>
        <button id="btn-goto-projects" class="btn btn-primary" style="margin-top: 16px; font-weight: 800;">← પ્રોજેક્ટ્સ પર જાઓ</button>
      </div>
    `;
    container.querySelector('#btn-goto-projects')?.addEventListener('click', () => navigateTo('projects'));
    return;
  }

  // Ensure presentation is loaded from persistent storage if missing in current memory
  if (!project.slide?.importedPresentation || !Array.isArray(project.slide?.slides) || project.slide.slides.length === 0) {
    try {
      const pres = await getProjectPresentation(project.id);
      if (pres) {
        const curTopicClean = (project.topic || project.name || '').trim();
        const presFile = (pres.filename || '').toLowerCase();
        const isProjectMatch = Boolean(
          (pres.projectId && (pres.projectId === project.id || pres.projectId === project.topicId)) ||
          pres.id
        );
        const contentToCheck = (pres.slides && pres.slides.length > 0) ? pres.slides : presFile;
        const isMismatch = !isProjectMatch && !isContentMatchingTopic(contentToCheck, curTopicClean);
        if (!isMismatch) {
          project.slide = project.slide || {};
          project.slide.importedPresentation = { ...pres, projectId: project.id };
          if (Array.isArray(pres.slides) && pres.slides.length > 0) {
            project.slide.slides = pres.slides;
          }
          projectState.updateTool('slide', project.slide);
        }
      }
    } catch (_) {}
  }

  // Ensure script state structure exists
  if (!project.script) project.script = {};
  if (!Array.isArray(project.script.sections)) project.script.sections = [];

  // Sync with Database (Single Source of Truth)
  try {
    await syncProjectScriptWithDatabase(project.id);
    project = projectState.getActiveProject() || project;
  } catch (_) {}

  let importedMeta = project.slide?.importedPresentation || null;
  const currentTopicClean = (project.topic || project.name || '').trim();
  if (importedMeta && currentTopicClean) {
    const metaFile = (importedMeta.filename || '').toLowerCase();
    const isProjectMatch = Boolean(
      (importedMeta.projectId && (importedMeta.projectId === project.id || importedMeta.projectId === project.topicId)) ||
      (project.slide?.importedPresentation && project.slide.importedPresentation.filename === importedMeta.filename) ||
      importedMeta.id
    );
    const contentToCheck = (importedMeta.slides && importedMeta.slides.length > 0) ? importedMeta.slides : metaFile;
    const isMismatch = !isProjectMatch && !isContentMatchingTopic(contentToCheck, currentTopicClean);
    if (isMismatch) {
      console.warn('[ScriptWriter] Discarding foreign presentation for topic:', currentTopicClean, metaFile);
      importedMeta = null;
      if (project.slide) {
        project.slide.importedPresentation = null;
        project.slide.slides = [];
      }
    }
  }

  // Ensure slides belong to currentTopicClean (only purge if no user presentation attached)
  const hasUserAttachedPdf = Boolean(importedMeta || project.slide?.importedPresentation);
  if (!hasUserAttachedPdf && Array.isArray(project.slide?.slides) && project.slide.slides.length > 0 && !isContentMatchingTopic(project.slide.slides, currentTopicClean)) {
    console.warn('[ScriptWriter] Purging foreign slides for topic:', currentTopicClean);
    const freshKit = buildTopicProjectKit(currentTopicClean, project.topicId || project.id);
    project.slide = freshKit.slide;
    project.script = freshKit.script;
    try { projectState.saveProjects(); } catch (_) {}
  }

  let slides = Array.isArray(project.slide?.slides) ? project.slide.slides : [];

  let authenticCount = importedMeta?.slidesCount || importedMeta?.slideCount || importedMeta?.pageCount || (slides.length > 0 ? slides.length : (Array.isArray(project.script?.sections) ? project.script.sections.length : 0)) || 9;

  // Auto-Repair on view load:
  // Recover rawText/fullText if empty but sections exist
  let currentFullText = (project.script?.rawText || project.script?.fullText || project.script?.originalChatGptScript || '').trim();
  if (!currentFullText && Array.isArray(project.script?.sections) && project.script.sections.length > 0) {
    currentFullText = project.script.sections.map(s => s.scriptText || s.content || '').filter(Boolean).join('\n\n').trim();
  }
  if (currentFullText) {
    project.script.rawText = currentFullText;
    project.script.fullText = currentFullText;
    project.script.originalChatGptScript = currentFullText;
    if (!Array.isArray(project.script.sections) || project.script.sections.length === 0) {
      const parsed = parseChatGptScriptText(currentFullText, slides);
      if (Array.isArray(parsed) && parsed.length > 0) {
        project.script.sections = parsed;
        project.script.editedSections = parsed;
      }
    }
  }

  // Cleanse residual 70-slides corruption from past bugs
  if (slides.length === 70 || (Array.isArray(project.script?.sections) && project.script.sections.length === 70)) {
    slides.length = authenticCount;
    if (!currentFullText) {
      project.script.sections = [];
      project.script.editedSections = [];
    }
  }

  // Match slides with loaded script sections so slide titles and scripts are always populated
  if (Array.isArray(project.script?.sections) && project.script.sections.length > 0) {
    if (slides.length === 0) {
      slides = project.script.sections.map((sec, idx) => ({
        slideNumber: idx + 1,
        title: sec.title || sec.sectionName || `સ્લાઇડ #${idx + 1}`,
        subtitle: sec.subtitle || '',
        bulletPoints: sec.bulletPoints || [],
        scriptText: sec.scriptText || '',
        bgColor: '#FFFFFF',
        textColor: '#0F172A'
      }));
      project.slide = project.slide || {};
      project.slide.slides = slides;
      projectState.updateTool('slide', project.slide);
    } else {
      slides.forEach((sl, idx) => {
        const sec = project.script.sections[idx] || project.script.sections.find(s => s.slideNumber === (idx + 1));
        if (sec) {
          if (sec.scriptText && !sl.scriptText) sl.scriptText = sec.scriptText;
          if (sec.title && (!sl.title || sl.title.startsWith('સ્લાઇડ'))) sl.title = sec.title;
        }
      });
      project.slide = project.slide || {};
      project.slide.slides = slides;
      projectState.updateTool('slide', project.slide);
    }
  }

  if (!importedMeta && slides.length > 0) {
    importedMeta = {
      filename: project.name || 'પ્રેઝન્ટેશન સ્લાઇડ્સ',
      slidesCount: slides.length,
      fileType: 'pdf',
      uploadedAt: new Date().toISOString()
    };
    project.slide = project.slide || {};
    project.slide.importedPresentation = importedMeta;
    projectState.updateTool('slide', project.slide);
  }

  if (currentFullText) {
    const hasExplicitMarkers = Boolean(currentFullText.match(/(?:^|\n)\s*(?:\*{0,2}\[?|###?\s*)(?:Slide|સ્લાઇડ)\s*[#0-9૦-૯]+[^\n\]\*]*\]?\*{0,2}/gi));

    const shouldRepairOrDistribute = (
      slides.length === 70 ||
      (Array.isArray(project.script?.sections) && project.script.sections.length === 70)
    );

    if (shouldRepairOrDistribute) {
      if (slides.length !== authenticCount) {
        slides = Array.from({ length: authenticCount }, (_, i) => {
          const existing = slides[i] || {};
          return {
            slideNumber: i + 1,
            title: existing.title || `સ્લાઇડ #${i + 1}`,
            subtitle: existing.subtitle || '',
            bulletPoints: existing.bulletPoints || [],
            scriptText: '',
            bgColor: '#FFFFFF',
            textColor: '#0F172A'
          };
        });
      }

      const repaired = parseChatGptScriptText(currentFullText, slides);
      project.script.sections = repaired;
      project.script.editedSections = repaired;
      project.script.rawText = currentFullText;
      project.script.fullText = currentFullText;

      slides.forEach((sl, idx) => {
        if (repaired[idx]) {
          sl.scriptText = repaired[idx].scriptText;
          sl.title = repaired[idx].title || `સ્લાઇડ #${idx + 1}`;
        }
      });

      project.slide.slides = slides;
      projectState.updateTool('slide', { slides, slideCount: `${authenticCount} સ્લાઇડ્સ` });
      projectState.updateTool('script', {
        sections: repaired,
        editedSections: repaired,
        rawText: currentFullText,
        fullText: currentFullText
      });
    }
  }

  const checkHasPresentation = () => Boolean(
    importedMeta &&
    (importedMeta.filename || importedMeta.fileUrl || importedMeta.blob) &&
    Array.isArray(slides) &&
    slides.length > 0
  );
  const checkHasImportedScript = () => Boolean(
    project.script?.savedInDb ||
    (Array.isArray(project.script?.sections) && project.script.sections.some(s => (s.scriptText || s.content || '').trim().length > 15)) ||
    Boolean((project.script?.fullText || project.script?.rawText || project.script?.originalChatGptScript || '').trim().length > 25)
  );

  // Default prompt settings
  let targetDuration = project.script.targetDuration || '8-10'; // minutes
  let toneStyle = project.script.toneStyle || 'news_conversational';
  let showContentSummary = false;
  let showImportBox = true;

  // Calculate word count & duration (Gujarati pace: ~130 words/minute)
  function calculateScriptMetrics(text) {
    if (!text) return { words: 0, minutes: 0, formattedTime: '0:00' };
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const totalMinutes = words / 130;
    const mins = Math.floor(totalMinutes);
    const secs = Math.round((totalMinutes - mins) * 60);
    return {
      words,
      minutes: Math.round(totalMinutes * 10) / 10,
      formattedTime: `${mins}:${secs < 10 ? '0' : ''}${secs}`
    };
  }

  /**
   * Builds the Master Gujarati ChatGPT Prompt strictly adhering to the 7-Point Slide-Wise Script Specification
   */
  function buildChatGptScriptPrompt() {
    if (!checkHasPresentation()) return '';

    const topicName = project.topic || project.name || 'ગુજરાત સત્તાવાર સરકારી નિર્ણય ૨૦૨૬';
    const totalSlides = slides.length;

    let durationLabel = '૮ થી ૧૦ મિનિટ (અંદાજે ૧,૦૦૦ થી ૧,૩૦૦ શબ્દો)';
    if (targetDuration === '5-7') {
      durationLabel = '૫ થી ૭ મિનિટ (અંદાજે ૭૦૦ થી ૯૦૦ શબ્દો)';
    } else if (targetDuration === '10-12') {
      durationLabel = '૧૦ થી ૧૨ મિનિટ (અંદાજે ૧,૩૦૦ થી ૧,૬૦૦ શબ્દો)';
    }

    let toneDesc = 'સત્તાવાર ન્યૂઝ એન્કર અને સરળ બોલચાલ ભાષા (વિશ્વસનીય, સ્પષ્ટ, સરળ અને રસપ્રદ)';
    if (toneStyle === 'conversational') {
      toneDesc = 'મૈત્રીપૂર્ણ, અત્યંત સરળ, સમજાવટભર્યો અને દર્શકો સાથે સીધો સંવાદ સાધતો લય';
    } else if (toneStyle === 'formal') {
      toneDesc = 'ગંભીર, અધિકૃત, કાનૂની/પરિપત્ર નિયમોને પ્રાધાન્ય આપતો ગૌરવપૂર્ણ લય';
    }

    // Format all slides content into structured prompt blocks strictly using original PPT content
    const slidesBlock = slides.map((s, idx) => {
      const slideNum = s.slideNumber || (idx + 1);
      const title = s.title || `સ્લાઇડ #${slideNum}`;
      const subtitle = s.subtitle ? `\n   સબટાઇટલ: ${s.subtitle}` : '';
      const rawBullets = Array.isArray(s.bulletPoints) ? s.bulletPoints : String(s.bulletPoints || s.content || '').split('\n');
      const bullets = rawBullets
        .map(b => b.trim())
        .filter(Boolean)
        .map(b => `   • ${b}`)
        .join('\n');

      return `[સ્લાઇડ #${slideNum}: ${title}]${subtitle}${bullets ? '\n   મુખ્ય મુદ્દાઓ:\n' + bullets : ''}`;
    }).join('\n\n');

    return `# 🎯 MASTER PROMPT: BEST HIGH-RETENTION GUJARATI YOUTUBE SCRIPT FROM PDF SLIDES

તમે એક ટોચના ગુજરાતી YouTube વિડીયો સ્ક્રિપ્ટ રાઇટર, ન્યૂઝ પ્રેઝન્ટર અને ઓડિયન્સ રીટેન્શન એક્સપર્ટ છો.
અમારી લોકપ્રિય ગુજરાતી ચેનલ "જ્ઞાન યાત્રા" (Gyan Yatra) માટે નીચે આપેલી PDF/PPT ની તમામ ${totalSlides} સ્લાઇડ્સ પરથી **સૌથી આકર્ષક, માહિતીપ્રદ અને વાયરલ બને તેવી સ્લાઇડ-વાઇઝ ગુજરાતી સ્ક્રિપ્ટ** તૈયાર કરો.

==================================================
📌 વિડીયો વિષય: ${topicName}
📊 કુલ સ્લાઇડ્સ સંખ્યા: ${totalSlides} સ્લાઇડ્સ (સ્લાઇડ ૧ થી ${totalSlides})
⏱️ ટાર્ગેટ વિડીયો સમયગાળો: ${durationLabel}
🎙️ અવાજનો લય / ટોન: ${toneDesc}
==================================================

## 🚀 1. HIGH-RETENTION SCRIPT FORMULA (યુટ્યુબ વાયરલ ફોર્મ્યુલા)

### ક) [સ્લાઇડ #1] — પાવરફુલ ૩-સેકન્ડ હૂક (3-Second Hook & Curiosity):
- બોરિંગ શરૂઆત (જેમ કે "આજે હું તમને જણાવીશ...") ક્યારેય ન કરવી.
- પ્રથમ ૩ સેકન્ડમાં જ દર્શકનું ધ્યાન ખેંચવું: "નમસ્કાર મિત્રો, જ્ઞાન યાત્રામાં આપનું સ્વાગત છે. જો તમે પણ ${topicName} ની તૈયારી કરી રહ્યા છો અથવા આ માહિતી શોધી રહ્યા છો, તો આ વિડીયો તમારા માટે અત્યંત મહત્વનો છે, કારણ કે આજના આ વિડીયોમાં આપણે જાણીશું..."

### ખ) [વચ્ચેની સ્લાઇડ્સ ૨ થી ${totalSlides - 1}] — રસપ્રદ સમજૂતી (Value + Explanation):
- સ્લાઇડ પર લખેલા મુદ્દા માત્ર વાંચી નથી જવાના! દરેક મુદ્દાને સરળ બોલચાલની ગુજરાતીમાં ઉદાહરણ સાથે સમજાવો.
- દરેક સ્લાઇડના અંતે આગળની સ્લાઇડ માટે જિજ્ઞાસા (Bridge Transition) ઊભી કરો: "હવે સૌથી મહત્વની બાબત એ આવે છે કે..." અથવા "ઘણા ઉમેદવારો આ જ બાબતમાં ભૂલ કરે છે, તો ચાલો જોઈએ આગળની સ્લાઇડમાં..."
- સરકારી તારીખો, નિયમો, પાત્રતા, વયમર્યાદા કે ફી ના આંકડા એકદમ સ્પષ્ટ અને સચોટ રીતે જણાવો.

### ગ) [છેલ્લી સ્લાઇડ #${totalSlides}] — પાવરફુલ કન્ક્લુઝન & Call-To-Action (CTA):
- સમગ્ર વિડીયોનો મુખ્ય સારાંશ ૧-૨ વાક્યમાં આપો.
- દર્શકોને એક્શન લેવા કહો: "જો આ માહિતી તમને ઉપયોગી લાગી હોય તો વિડીયોને લાઈક જરૂર કરજો, તમારા મિત્રો સાથે શેર કરજો અને આવી જ તમામ સાચી સરકારી અપડેટ્સ સૌથી પહેલા મેળવવા 'જ્ઞાન યાત્રા' ચેનલને હમણાં જ સબ્સ્ક્રાઇબ કરી બેલ આઇકન દબાવી દો. ધન્યવાદ!"

---

## 📋 2. કડક ફોર્મેટિંગ નિયમ (STRICT FORMAT FOR GYAN YATRA STUDIO)
Gyan Yatra Studio ના સોફ્ટવેરમાં સીધું ૧:૧ મેપિંગ થાય તે માટે તમારો જવાબ નીચે મુજબના ચોક્કસ ફોર્મેટમાં જ હોવો જોઈએ:

[સ્લાઇડ #1: શીર્ષક]
(અહીં સ્લાઇડ ૧ માટેનું સંપૂર્ણ બોલવાનું ગુજરાતી લખાણ)

[સ્લાઇડ #2: શીર્ષક]
(અહીં સ્લાઇડ ૨ માટેનું સંપૂર્ણ બોલવાનું ગુજરાતી લખાણ)

[સ્લાઇડ #3: શીર્ષક]
(આ જ રીતે છેલ્લી સ્લાઇડ #${totalSlides} સુધી ચાલુ રાખો)

---

## ⚠️ 3. મહત્વના નિયમો (ACCURACY & RETENTION):
૧. શુદ્ધ, કુદરતી અને પ્રવાહિત બોલચાલની ગુજરાતી ભાષા વાપરો (પુસ્તકીય કે ગુગલ ટ્રાન્સલેટ જેવી અઘરી ભાષા નહીં).
૨. સ્લાઇડની બહારની કોઈ ખોટી કે મનઘડંત સરકારી માહિતી ઉમેરવી નહીં.
૩. સ્લાઇડ ૧ થી ${totalSlides} નો ક્રમ જળવાઈ રહેવો જોઈએ.
૪. દરેક સ્લાઇડનું લખાણ ઓછામાં ઓછું ૭૦ થી ૧૨૦ શબ્દોનું હોવું જોઈએ જેથી વિડીયો પૂરો થતાં દર્શકને સંતોષ થાય.

==================================================
📑 સત્તાવાર સ્લાઇડ્સ ડેટા (Official Slide Deck Content):
==================================================

${slidesBlock}

હવે ઉપરોક્ત તમામ નિયમો મુજબ [સ્લાઇડ #1: શીર્ષક] થી શરૂ કરીને છેલ્લી સ્લાઇડ #${totalSlides} સુધીની સંપૂર્ણ સ્ક્રિપ્ટ આપો.`;
  }

  // Initialize or fetch current prompt
  if (!project.script.chatGptPrompt && checkHasPresentation()) {
    project.script.chatGptPrompt = buildChatGptScriptPrompt();
    projectState.updateTool('script', { chatGptPrompt: project.script.chatGptPrompt });
  }

  function handleGeneratePrompt() {
    project.script.targetDuration = targetDuration;
    project.script.toneStyle = toneStyle;
    project.script.chatGptPrompt = buildChatGptScriptPrompt();
    projectState.updateTool('script', {
      targetDuration,
      toneStyle,
      chatGptPrompt: project.script.chatGptPrompt
    });
    render();
    showNoticeToast('✓ ChatGPT Script Prompt સફળતાપૂર્વક જનરેટ થઈ ગયો!', 'success');
  }

  async function handleOneClickSlideWiseScriptGeneration() {
    if (!slides || slides.length === 0) {
      alert('સ્લાઇડ્સ ડેટા મળ્યો નથી. કૃપા કરીને પહેલાં PPT અથવા PDF અપલોડ કરો.');
      return;
    }

    const btn = container.querySelector('#btn-oneclick-generate-slidewise');
    const originalBtnHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳</span> સ્લાઇડ્સ વિશ્લેષણ & સ્ક્રિપ્ટ નિર્માણ ચાલુ છે...`;
    }

    try {
      const res = await api.generateSlideWiseScript({
        projectId: project.id,
        slides,
        topic: project.topic || project.name || 'ગુજરાત સત્તાવાર જાહેરાત',
        durationMinutes: targetDuration === '5-7' ? 6 : (targetDuration === '10-12' ? 11 : 8),
        speakingTone: toneStyle,
        autoSave: true
      });

      if (!res.success || !res.script) {
        throw new Error(res.error || 'સ્ક્રિપ્ટ જનરેટ થઈ શકી નથી.');
      }

      const scriptData = res.script;
      const exactRawText = scriptData.rawText || scriptData.fullText || '';
      const parsedSections = scriptData.sections || [];

      project.script.originalChatGptScript = exactRawText;
      project.script.rawText = exactRawText;
      project.script.fullText = exactRawText;
      project.script.sections = parsedSections;
      project.script.editedSections = parsedSections;
      project.script.fidelity = validateScriptFidelity(exactRawText, parsedSections);
      project.script.validation = scriptData.validation || validateSlideWiseScriptFidelity(slides, parsedSections, exactRawText);
      project.script.source = scriptData.source || 'ChatGPT';
      project.script.importedAt = new Date().toISOString();
      project.script.isCompleted = true;

      // Update slide.slides
      slides.forEach((sl, idx) => {
        if (parsedSections[idx]) {
          sl.scriptText = parsedSections[idx].scriptText;
          parsedSections[idx].slideId = sl.slideId;
          parsedSections[idx].slideNumber = sl.slideNumber;
          if (parsedSections[idx].title && (!sl.title || sl.title.startsWith('સ્લાઇડ #'))) {
            sl.title = parsedSections[idx].title;
          }
        }
      });

      project.slide.slides = slides;
      projectState.updateTool('slide', { slides });
      projectState.updateTool('script', {
        originalChatGptScript: exactRawText,
        sections: parsedSections,
        editedSections: parsedSections,
        rawText: exactRawText,
        fullText: exactRawText,
        fidelity: project.script.fidelity,
        validation: project.script.validation,
        source: project.script.source,
        importedAt: project.script.importedAt,
        isCompleted: true
      });

      projectState.saveVersionSnapshot(
        project.id,
        'scripts',
        `Generated Exact Slide-Wise Script (${parsedSections.length} slides)`
      );

      showNoticeToast(`🎉 ${parsedSections.length} સ્લાઇડ્સની ચોક્કસ સ્ક્રિપ્ટ તૈયાર થઈ ગઈ અને Database માં Save થઈ ગઈ!`, 'success');
      render();
    } catch (err) {
      console.error('[SlideWise Script Gen Error]:', err);
      alert('સ્ક્રિપ્ટ જનરેટ કરવામાં સમસ્યા આવી: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
      }
    }
  }

  async function handleImportScriptFromChatGpt(pastedText, shouldRedirect = true) {
    if (!pastedText || !pastedText.trim()) {
      alert('કૃપા કરીને ChatGPT માંથી મળેલ સ્ક્રિપ્ટ લખાણ પેસ્ટ કરો.');
      return;
    }

    try {
      const exactRawText = pastedText.trim();
      const parsedSections = parseChatGptScriptText(exactRawText, slides);
      if (!parsedSections || parsedSections.length === 0) {
        alert('સ્ક્રિપ્ટનું ફોર્મેટ ઓળખી શકાયું નથી. કૃપા કરીને ખાતરી કરો કે સ્ક્રિપ્ટમાં લખાણ રહેલું છે.');
        return;
      }

      // 100% Verbatim Guarantee: Never alter or rewrite the user's pasted ChatGPT script
      project.script.originalChatGptScript = exactRawText;
      project.script.rawText = exactRawText;
      project.script.fullText = exactRawText;
      project.script.sections = parsedSections;
      project.script.editedSections = parsedSections;
      project.script.fidelity = validateScriptFidelity(exactRawText, parsedSections);
      project.script.validation = validateSlideWiseScriptFidelity(slides, parsedSections, exactRawText);
      project.script.source = 'ChatGPT';
      project.script.importedAt = new Date().toISOString();
      project.script.isCompleted = true;

      // Sync back to slide.slides without creating artificial dummy slides
      if (!project.slide) project.slide = {};
      if (!Array.isArray(project.slide.slides)) project.slide.slides = [];

      let authenticCount = (slides.length > 0) ? slides.length : (importedMeta?.slidesCount || importedMeta?.slideCount || importedMeta?.pageCount || 1);

      const hasExplicitMarkers = Boolean(exactRawText.match(/(?:^|\n)\s*(?:\*{0,2}\[?|###?\s*)(?:Slide|સ્લાઇડ)\s*[#0-9૦-૯]+[^\n\]\*]*\]?\*{0,2}/gi));

      if (slides.length === 0) {
        slides.push({
          slideId: `slide_${project.id}_1_${Date.now()}`,
          id: `slide_${project.id}_1_${Date.now()}`,
          slideNumber: 1,
          pageNumber: 1,
          title: 'સંપૂર્ણ સ્ક્રિપ્ટ',
          subtitle: '',
          bulletPoints: [],
          scriptText: exactRawText,
          bgColor: '#FFFFFF',
          textColor: '#0F172A'
        });
      }

      if (parsedSections.length <= 1) {
        slides[0].scriptText = exactRawText;
      } else {
        slides.forEach((sl, idx) => {
          if (parsedSections[idx]) {
            sl.scriptText = parsedSections[idx].scriptText;
            parsedSections[idx].slideId = sl.slideId;
            parsedSections[idx].slideNumber = sl.slideNumber;
            if (parsedSections[idx].title && (!sl.title || sl.title.startsWith('સ્લાઇડ #'))) {
              sl.title = parsedSections[idx].title;
            }
          }
        });
      }

      project.slide.slides = slides;
      projectState.updateTool('slide', { slides });

      projectState.updateTool('script', {
        originalChatGptScript: exactRawText,
        sections: parsedSections,
        editedSections: parsedSections,
        rawText: exactRawText,
        fullText: exactRawText,
        fidelity: project.script.fidelity,
        validation: project.script.validation,
        source: 'ChatGPT',
        importedAt: project.script.importedAt,
        isCompleted: true
      });

      // Permanently save to Backend Database (Source of Truth)
      await saveScriptToDatabase(project.id, {
        originalChatGptScript: exactRawText,
        rawText: exactRawText,
        fullText: exactRawText,
        sections: parsedSections,
        validation: project.script.validation,
        source: 'ChatGPT'
      }, { notify: true, showToast: false });

      // Save safety version snapshot
      projectState.saveVersionSnapshot(
        project.id,
        'scripts',
        parsedSections.length <= 1
          ? `Imported Full Script from ChatGPT (${calculateScriptMetrics(exactRawText).words} words)`
          : `Imported Script from ChatGPT (${parsedSections.length} sections)`
      );

      const successMsg = parsedSections.length <= 1
        ? `🎉 ChatGPT માંથી સંપૂર્ણ સળંગ સ્ક્રિપ્ટ (${calculateScriptMetrics(exactRawText).words} શબ્દો) સફળતાપૂર્વક Save થઈ ગઈ!`
        : `🎉 ChatGPT માંથી ${parsedSections.length} સ્લાઇડ્સની સ્ક્રિપ્ટ સફળતાપૂર્વક Import થઈ ગઈ!`;

      showNoticeToast(successMsg, 'success');

      // Re-render immediately to reflect imported text and cards
      render();

      // Redirect directly to Stage 5: Script Editor if requested
      if (shouldRedirect) {
        setTimeout(() => {
          navigateTo('scripteditor');
        }, 500);
      }

    } catch (err) {
      console.error('[Script Import Error]:', err);
      alert('સ્ક્રિપ્ટ ઈમ્પોર્ટ કરવામાં ભૂલ આવી: ' + err.message);
    }
  }

  function render() {
    project = projectState.getActiveProject() || project;
    slides = Array.isArray(project.slide?.slides) ? project.slide.slides : slides;
    importedMeta = project.slide?.importedPresentation || importedMeta;
    const hasPresentation = checkHasPresentation();
    const hasImportedScript = checkHasImportedScript();
    const promptText = project.script?.chatGptPrompt || '';
    const sections = project.script?.sections || [];
    const fullText = (project.script?.fullText || project.script?.rawText || project.script?.originalChatGptScript || '').trim();
    const metrics = calculateScriptMetrics(fullText);

    container.innerHTML = `
      <!-- TOP PROJECT CONTEXT BAR -->
      <div class="card" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid #38bdf8; border-radius: var(--radius-lg); padding: 16px 22px; margin-bottom: 22px; box-shadow: 0 8px 30px rgba(56, 189, 248, 0.25);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; border: 1px solid rgba(56, 189, 248, 0.35);">
              📝
            </div>
            <div>
              <h2 style="font-size: 1.35rem; font-weight: 900; color: #ffffff; margin: 0 0 2px 0; display: flex; align-items: center; gap: 8px;">
                <span>૪. સ્ક્રિપ્ટ પ્રોમ્પ્ટ (ChatGPT Script Prompt Generator)</span>
                <span class="badge" style="background: ${hasImportedScript ? 'rgba(16, 185, 129, 0.2)' : promptText ? 'rgba(56, 189, 248, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${hasImportedScript ? '#34d399' : promptText ? '#38bdf8' : '#fbbf24'}; border: 1px solid ${hasImportedScript ? '#10b981' : promptText ? '#38bdf8' : '#f59e0b'}; font-size: 0.74rem; font-weight: 800; padding: 3px 8px;">
                  ${hasImportedScript ? (sections.length <= 1 ? `✓ સંપૂર્ણ સ્ક્રિપ્ટ સક્રિય (${metrics.words} શબ્દો)` : `✓ સ્ક્રિપ્ટ ઈમ્પોર્ટ થયેલ (${sections.length} સ્લાઇડ્સ)`) : promptText ? '✓ Prompt તૈયાર' : '⚪ Prompt બાકી'}
                </span>
              </h2>
              <div style="margin-top: 6px; display: inline-flex; align-items: center; gap: 8px; background: rgba(56, 189, 248, 0.15); border: 1.5px solid #38bdf8; padding: 4px 12px; border-radius: 8px;">
                <span style="font-size: 0.78rem; font-weight: 800; color: #38bdf8;">🎯 સક્રિય વિષય (ACTIVE TOPIC):</span>
                <strong style="color: #ffffff; font-size: 0.95rem;">${project.topic || project.name}</strong>
              </div>
              <p style="color: #cbd5e1; font-size: 0.8rem; margin: 4px 0 0 0;">
                ઈમ્પોર્ટ થયેલ PPT/PDF પરથી ChatGPT માટે સંપૂર્ણ સ્ક્રિપ્ટ પ્રોમ્પ્ટ જનરેટર.
              </p>
            </div>
          </div>

          <!-- Top Actions -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <label for="input-script-pdf-top" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #38bdf8; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <span>📄</span> PDF અપલોડ કરો
              <input type="file" id="input-script-pdf-top" accept=".pdf,.pptx,.ppt" style="display: none;" />
            </label>
            <button id="btn-open-folder-notebook-script" class="btn btn-outline btn-sm" style="border-color: #8b5cf6; color: #c4b5fd; font-weight: 800; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
              <span>📝</span> નોટબુક
            </button>
            <button id="btn-goto-slides-step" class="btn btn-outline btn-sm" style="font-weight: 800; border-color: rgba(255,255,255,0.25); color: #cbd5e1;">
              ← ૨. Slide Prompt
            </button>
            <button id="btn-goto-voice-top" class="btn btn-primary btn-sm" style="font-weight: 800; background: linear-gradient(135deg, #7c3aed, #6366f1); border: none; padding: 8px 18px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(124,58,237,0.35);">
              <span>🎙️</span> ૫. સ્લાઇડ & સ્ક્રિપ્ટ સ્ટુડિયો (Slide Voice Studio) ➔
            </button>
          </div>

        </div>
      </div>

      ${(!hasPresentation || !importedMeta) ? `
        <!-- ========================================================================= -->
        <!-- NO PRESENTATION LOADED / DIRECT PDF UPLOAD DROPZONE                       -->
        <!-- ========================================================================= -->
        <div class="card" style="padding: 40px 24px; text-align: center; background: rgba(15, 23, 42, 0.9); border: 2px dashed #38bdf8; border-radius: 16px; margin-bottom: 24px;">
          <div style="width: 76px; height: 76px; margin: 0 auto 16px auto; border-radius: 20px; background: rgba(56, 189, 248, 0.12); display: flex; align-items: center; justify-content: center; font-size: 2.6rem; border: 1.5px solid rgba(56, 189, 248, 0.35);">
            📄
          </div>
          <h3 style="font-size: 1.4rem; font-weight: 900; color: #ffffff; margin: 0 0 8px 0;">
            અહીં તમારી NotebookLM PDF અથવા PPTX ફાઇલ અપલોડ કરો
          </h3>
          <p style="color: #94a3b8; font-size: 0.92rem; max-width: 620px; margin: 0 auto 20px auto; line-height: 1.6;">
            તમારી PDF ફાઇલ પસંદ કરો અથવા ડ્રેગ કરો. PDF અપલોડ થતાં જ તમામ સ્લાઇડ્સ, ટાઇટલ અને મુદ્દાઓ આપમેળે વાંચીને સ્લાઇડ-વાઇઝ સ્ક્રિપ્ટ તૈયાર થઈ જશે!
          </p>
          <div style="display: flex; justify-content: center; align-items: center; gap: 14px; flex-wrap: wrap;">
            <label for="input-script-pdf-main" class="btn btn-primary" style="font-weight: 800; font-size: 1rem; padding: 13px 30px; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; border-radius: 10px; box-shadow: 0 4px 20px rgba(2, 132, 199, 0.45); cursor: pointer; display: inline-flex; align-items: center; gap: 10px;">
              <span>📤</span> PDF પસંદ કરો (Upload PDF)
              <input type="file" id="input-script-pdf-main" accept=".pdf,.pptx,.ppt" style="display: none;" />
            </label>
            <button id="btn-goto-slides-action" class="btn btn-outline" style="border-color: rgba(255,255,255,0.25); color: #cbd5e1; font-weight: 700; padding: 13px 22px;">
              <span>📑</span> ૨. Slide Prompt જુઓ
            </button>
          </div>
        </div>
      ` : `
        <!-- ========================================================================= -->
        <!-- 1. PRESENTATION INFORMATION CARD                                          -->
        <!-- ========================================================================= -->
        <div class="card" style="margin-bottom: 22px; padding: 18px 22px; background: rgba(16, 185, 129, 0.08); border: 1.5px solid #10b981; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <span style="font-size: 2.2rem;">${importedMeta?.fileType === 'pdf' ? '📄' : '📊'}</span>
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <strong style="color: #ffffff; font-size: 1.1rem;">${importedMeta?.filename || 'Presentation File'}</strong>
                <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-weight: 800; font-size: 0.72rem;">
                  ${importedMeta?.sizeFormatted || 'PDF'}
                </span>
                <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 800; font-size: 0.72rem;">
                  ${slides.length} સ્લાઇડ્સ ઉપલબ્ધ
                </span>
              </div>
              <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 3px;">
                🕒 ઈમ્પોર્ટ તારીખ: <strong style="color: #cbd5e1;">${formatIndianDateTimeDisplay(importedMeta?.uploadedAt)}</strong>
                <span style="color: #10b981; margin-left: 8px; font-weight: 700;">✓ તમામ સ્લાઇડ્સનું કન્ટેન્ટ પ્રોમ્પ્ટ માટે ઉપલબ્ધ છે</span>
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <label for="input-script-pdf-change" class="btn btn-outline btn-sm" style="border-color: rgba(56,189,248,0.4); color: #38bdf8; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <span>🔄</span> નવી PDF અપલોડ કરો
              <input type="file" id="input-script-pdf-change" accept=".pdf,.pptx,.ppt" style="display: none;" />
            </label>
            <button id="btn-toggle-content-summary" class="btn btn-outline btn-sm" style="border-color: rgba(56,189,248,0.4); color: #38bdf8; font-weight: 700;">
              ${showContentSummary ? '▲ સારાંશ છુપાવો' : '▼ કન્ટેન્ટ સારાંશ જુઓ (' + slides.length + ' સ્લાઇડ્સ)'}
            </button>
          </div>
        </div>

        ${showContentSummary ? `
          <!-- Collapsible Content Summary Accordion -->
          <div class="card" style="margin-bottom: 22px; padding: 20px; background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;">
            <h4 style="margin: 0 0 14px 0; color: #ffffff; font-size: 0.98rem; display: flex; align-items: center; gap: 8px;">
              <span>📋</span> પ્રેઝન્ટેશન કન્ટેન્ટ સારાંશ (આ تمام વિગતો ChatGPT પ્રોમ્પ્ટમાં આપોઆપ જોડાશે)
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; max-height: 350px; overflow-y: auto; padding-right: 6px;">
              ${slides.map((s, idx) => `
                <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                    <span class="badge" style="background: #3b82f6; color: #fff; font-size: 0.7rem; font-weight: 800;">#${s.slideNumber || (idx + 1)}</span>
                    <strong style="color: #f8fafc; font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.title || `સ્લાઇડ #${idx + 1}`}</strong>
                  </div>
                  <ul style="margin: 0; padding-left: 18px; font-size: 0.78rem; color: #94a3b8; line-height: 1.45;">
                    ${(Array.isArray(s.bulletPoints) ? s.bulletPoints : [s.content || '']).filter(Boolean).slice(0, 3).map(b => `<li>${b.length > 50 ? b.slice(0, 50) + '...' : b}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- ========================================================================= -->
        <!-- 2. PROMPT CUSTOMIZATION & GENERATION BAR                                  -->
        <!-- ========================================================================= -->
        <div class="card" style="margin-bottom: 22px; padding: 20px 24px; background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 900; color: #ffffff; margin: 0 0 4px 0; display: flex; align-items: center; gap: 8px;">
                <span>⚙️</span> ChatGPT Script Prompt કસ્ટમાઇઝેશન
              </h3>
              <p style="color: #94a3b8; font-size: 0.82rem; margin: 0;">
                વિડીયોનો અંદાજિત સમયગાળો અને બોલવાનો લય પસંદ કરો. પ્રોમ્પ્ટ આપોઆપ અપડેટ થશે.
              </p>
            </div>

            <!-- Action Buttons: Generate Prompt & 1-Click AI Slide-Wise Script -->
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <button id="btn-generate-prompt" class="btn btn-outline" style="font-weight: 900; font-size: 0.95rem; padding: 12px 20px; border-radius: 10px; border-color: #38bdf8; color: #38bdf8; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                <span>🚀</span> ${promptText ? '🔄 નવો Prompt બનાવો' : '🚀 ChatGPT Script Prompt'}
              </button>
              <button id="btn-oneclick-generate-slidewise" class="btn btn-primary" style="font-weight: 900; font-size: 0.95rem; padding: 12px 22px; border-radius: 10px; background: linear-gradient(135deg, #10b981, #059669); border: none; box-shadow: 0 4px 18px rgba(16, 185, 129, 0.45); cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                <span>⚡</span> ૧-ક્લિક સ્લાઇડ પ્રમાણે AI સ્ક્રિપ્ટ બનાવો
              </button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 800; color: #cbd5e1; margin-bottom: 6px;">
                ⏱️ ટાર્ગેટ વિડીયો સમયગાળો (Target Duration):
              </label>
              <select id="select-target-duration" class="form-control" style="background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 9px 12px; font-size: 0.88rem; width: 100%;">
                <option value="5-7" ${targetDuration === '5-7' ? 'selected' : ''}>૫ થી ૭ મિનિટ (ઝડપી અપડેટ - ૭૦૦-૯૦૦ શબ્દો)</option>
                <option value="8-10" ${targetDuration === '8-10' ? 'selected' : ''}>૮ થી ૧૦ મિનિટ (સંપૂર્ણ વિગતવાર - Recommended)</option>
                <option value="10-12" ${targetDuration === '10-12' ? 'selected' : ''}>૧૦ થી ૧૨ મિનિટ (વિસ્તૃત વિશ્લેષણ - ૧૩૦૦+ શબ્દો)</option>
              </select>
            </div>

            <div>
              <label style="display: block; font-size: 0.8rem; font-weight: 800; color: #cbd5e1; margin-bottom: 6px;">
                🎙️ નરેશન ટોન / લય (Voice Style):
              </label>
              <select id="select-tone-style" class="form-control" style="background: #0f172a; color: #f8fafc; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 9px 12px; font-size: 0.88rem; width: 100%;">
                <option value="news_conversational" ${toneStyle === 'news_conversational' ? 'selected' : ''}>સત્તાવાર ન્યૂઝ પ્રેઝન્ટર + સરળ બોલચાલ (સૌથી શ્રેષ્ઠ)</option>
                <option value="conversational" ${toneStyle === 'conversational' ? 'selected' : ''}>મૈત્રીપૂર્ણ & અત્યંત સરળ સંવાદ (YouTube Style)</option>
                <option value="formal" ${toneStyle === 'formal' ? 'selected' : ''}>ગંભીર, સત્તાવાર પરિપત્ર સંદર્ભ (Educational)</option>
              </select>
            </div>
          </div>
        </div>

        ${promptText ? `
          <!-- ========================================================================= -->
          <!-- 3. EDITABLE SCRIPT PROMPT PREVIEW & 1-CLICK COPY                           -->
          <!-- ========================================================================= -->
          <div class="card" style="margin-bottom: 24px; padding: 22px; background: rgba(15, 23, 42, 0.95); border: 1.5px solid #38bdf8; border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.45);">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.3rem;">📋</span>
                <strong style="color: #ffffff; font-size: 1.05rem;">ChatGPT Script Prompt (સંપૂર્ણ વિગતો સાથે તૈયાર)</strong>
              </div>

              <!-- Action buttons: Copy & Open ChatGPT -->
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <button id="btn-copy-prompt" class="btn btn-primary" style="font-weight: 900; background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 9px 20px; border-radius: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); display: inline-flex; align-items: center; gap: 6px;">
                  <span>📋</span> ૧-ક્લિક કોપી પ્રોમ્પ્ટ
                </button>
                <a id="link-open-chatgpt" href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="font-weight: 800; border-color: #38bdf8; color: #38bdf8; padding: 8px 16px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                  <span>⚡</span> ChatGPT ખોલો ↗
                </a>
              </div>
            </div>

            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 12px; background: rgba(56, 189, 248, 0.08); padding: 8px 14px; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.2);">
              💡 <strong>કેવી રીતે ઉપયોગ કરવો:</strong> ઉપરના બટનથી પ્રોમ્પ્ટ કોપી કરો ➔ ChatGPT માં પેસ્ટ કરો ➔ ChatGPT સ્ક્રિપ્ટ બનાવી આપે એટલે તે કોપી કરીને નીચેના ઈમ્પોર્ટ બોક્સમાં મૂકો.
            </div>

            <textarea id="textarea-prompt-preview" class="form-control font-gu" style="width: 100%; min-height: 280px; max-height: 480px; background: #07090e; color: #f1f5f9; border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 14px 16px; font-size: 0.9rem; line-height: 1.6; font-family: monospace; resize: vertical;">${promptText}</textarea>
          </div>
        ` : ''}

        <!-- ========================================================================= -->
        <!-- 4. IMPORT SCRIPT FROM CHATGPT (DEDICATED SECTION)                         -->
        <!-- ========================================================================= -->
        <div class="card" style="margin-bottom: 28px; padding: 24px; background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.85)); border: 2px solid ${hasImportedScript ? '#10b981' : '#f59e0b'}; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: ${hasImportedScript ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; border: 1px solid ${hasImportedScript ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'};">
                📥
              </div>
              <div>
                <h3 style="font-size: 1.25rem; font-weight: 900; color: #ffffff; margin: 0 0 2px 0;">
                  ChatGPT માંથી તૈયાર થયેલી Script અહીં Import કરો
                </h3>
                <p style="color: #cbd5e1; font-size: 0.82rem; margin: 0;">
                  ChatGPT દ્વારા લખાયેલ સંપૂર્ણ સ્ક્રિપ્ટ અહીં પેસ્ટ કરો. અમારું સિસ્ટમ તેને આપોઆપ સ્લાઇડ-વાઇઝ ગોઠવી આપશે.
                </p>
              </div>
            </div>

            ${hasImportedScript ? `
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 800; font-size: 0.8rem; padding: 6px 12px; border: 1px solid #10b981;">
                  ${sections.length <= 1 ? `✓ સંપૂર્ણ સ્ક્રિપ્ટ સક્રિય (${metrics.words} શબ્દો)` : `✓ સ્ક્રિપ્ટ સક્રિય (${sections.length} સ્લાઇડ્સ • ${metrics.words} શબ્દો)`}
                </span>
                <button id="btn-goto-voice-mid" class="btn btn-primary btn-sm" style="font-weight: 900; background: linear-gradient(135deg, #7c3aed, #6366f1); border: none; padding: 8px 16px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(124,58,237,0.35);">
                  🎙️ ૫. સ્લાઇડ સામે સ્ક્રિપ્ટ બોલો (Slide & Voice Studio) ➔
                </button>
              </div>
            ` : ''}
          </div>

          <div style="margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label style="display: block; font-size: 0.82rem; font-weight: 800; color: #cbd5e1; margin: 0;">
                ChatGPT આઉટપુટ લખાણ (Paste / Saved Script Text):
              </label>
              ${hasImportedScript ? `
                <span style="font-size: 0.74rem; color: #34d399; font-weight: 700;">
                  ✓ તમારી સેવ કરેલી સ્ક્રિપ્ટ નીચે મોજૂદ છે (${metrics.words} શબ્દો)
                </span>
              ` : ''}
            </div>
            <textarea id="textarea-import-script" class="form-control font-gu" placeholder="ChatGPT માંથી તૈયાર થયેલી સ્ક્રિપ્ટ અહીં પેસ્ટ કરો...&#10;&#10;ઉદાહરણ ફોર્મેટ:&#10;[સ્લાઇડ #1: શીર્ષક]&#10;નમસ્તે મિત્રો! જ્ઞાન યાત્રા ચેનલમાં આપનું સ્વાગત છે...&#10;&#10;[સ્લાઇડ #2: શીર્ષક]&#10;હવે વિગતવાર સમજીએ..." style="width: 100%; min-height: 220px; max-height: 420px; background: #07090e; color: #f8fafc; border: 1.5px solid ${hasImportedScript ? '#10b981' : 'rgba(255,255,255,0.15)'}; border-radius: 10px; padding: 14px 16px; font-size: 0.92rem; line-height: 1.6; resize: vertical;">${fullText || ''}</textarea>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div style="font-size: 0.78rem; color: #94a3b8;">
              ⚡ સ્ક્રિપ્ટ ઈમ્પોર્ટ થતાં જ તે પ્રોજેક્ટમાં સુરક્ષિત રીતે સચવાશે અને <strong>Voice Studio / Script Editor</strong> માં ઉપલબ્ધ રહેશે.
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button id="btn-submit-import-script" class="btn btn-primary" style="font-weight: 900; font-size: 0.95rem; padding: 10px 24px; border-radius: 10px; background: linear-gradient(135deg, #10b981, #059669); border: none; box-shadow: 0 4px 18px rgba(16, 185, 129, 0.45); cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                <span>💾</span> ${hasImportedScript ? '🔄 સ્ક્રિપ્ટ અપડેટ કરો & સેવ કરો' : '💾 Script Import કરો & સેવ કરો'}
              </button>
            </div>
          </div>
        </div>

        ${(hasImportedScript && (project.script?.validation || sections.length > 0)) ? `
          <!-- 7-POINT FINAL SCRIPT VALIDATION CHECKLIST CARD -->
          ${(() => {
            const valData = project.script?.validation || validateSlideWiseScriptFidelity(slides, sections, fullText);
            return `
              <div class="card" style="margin-bottom: 24px; padding: 22px; background: rgba(15, 23, 42, 0.95); border: 2px solid ${valData?.isValid ? '#10b981' : '#f59e0b'}; border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.4);">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.5rem;">📋</span>
                    <div>
                      <h4 style="margin: 0; font-size: 1.15rem; font-weight: 900; color: #ffffff;">
                        ૭-મુદ્દા સ્લાઇડ કન્ટેન્ટ ચકાસણી રિપોર્ટ (7-Point Final Script Validation)
                      </h4>
                      <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #94a3b8;">
                        મૂળ PPT/PDF સ્લાઇડ્સ સાથે સ્ક્રિપ્ટના કન્ટેન્ટનું કડક ૧:૧ મેચિંગ
                      </p>
                    </div>
                  </div>
                  <span class="badge" style="background: ${valData?.isValid ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${valData?.isValid ? '#34d399' : '#fbbf24'}; font-weight: 900; font-size: 0.82rem; padding: 6px 14px; border: 1px solid ${valData?.isValid ? '#10b981' : '#f59e0b'};">
                    ${valData?.isValid ? '✓ પ્રમાણિત સ્ક્રિપ્ટ (Verified Pass)' : '⚠️ ચકાસણી ધ્યાનાકર્ષક'}
                  </span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
                  ${(valData?.checklist || []).map(item => `
                    <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid ${item.passed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}; border-radius: 8px; padding: 12px 14px;">
                      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                        <strong style="font-size: 0.85rem; color: #f8fafc;">${item.name}</strong>
                        <span style="font-size: 0.82rem; font-weight: 800; color: ${item.passed ? '#34d399' : '#fbbf24'};">${item.passed ? '✓ પાસ' : '⚠️ ચકાસો'}</span>
                      </div>
                      <div style="font-size: 0.78rem; color: #94a3b8; line-height: 1.4;">${item.message}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          })()}
        ` : ''}

        ${hasImportedScript ? `
          <!-- Script Overview Card If Already Imported -->
          <div class="card" style="margin-bottom: 22px; padding: 18px 22px; background: rgba(15, 23, 42, 0.75); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
              <div>
                <span style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; font-weight: 800;">${sections.length <= 1 ? 'સ્ક્રિપ્ટ ફોર્મેટ' : 'ઈમ્પોર્ટ થયેલ સ્લાઇડ્સ'}</span>
                <div style="font-size: 1.25rem; font-weight: 900; color: #ffffff;">${sections.length <= 1 ? '૧ સંપૂર્ણ સળંગ સ્ક્રિપ્ટ' : `${sections.length} સ્લાઇડ્સ`}</div>
              </div>
              <div style="width: 1px; height: 32px; background: rgba(255,255,255,0.1);"></div>
              <div>
                <span style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; font-weight: 800;">કુલ શબ્દો</span>
                <div style="font-size: 1.25rem; font-weight: 900; color: #38bdf8;">${metrics.words} શબ્દો</div>
              </div>
              <div style="width: 1px; height: 32px; background: rgba(255,255,255,0.1);"></div>
              <div>
                <span style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; font-weight: 800;">અંદાજિત સમય</span>
                <div style="font-size: 1.25rem; font-weight: 900; color: #10b981;">~${metrics.minutes} મિનિટ (${metrics.formattedTime})</div>
              </div>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button id="btn-goto-voice-bottom" class="btn btn-primary btn-sm" style="font-weight: 900; background: linear-gradient(135deg, #7c3aed, #6366f1); border: none; padding: 8px 18px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(124,58,237,0.35);">
                🎙️ ૫. સ્લાઇડ સામે સ્ક્રિપ્ટ બોલીને ઓડિયો રેકોર્ડ કરો (Slide Voice Studio) ➔
              </button>
            </div>
          </div>

          <!-- Slide-Wise Script Cards Directly in ScriptWriter -->
          <div class="card" style="margin-bottom: 24px; padding: 22px; background: rgba(15, 23, 42, 0.95); border: 1.5px solid #10b981; border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.45);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
              <h4 style="margin: 0; font-size: 1.1rem; font-weight: 900; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                <span>📋</span> ${sections.length <= 1 ? 'સેવ થયેલી સંપૂર્ણ સળંગ સ્ક્રિપ્ટ (સંપૂર્ણ નરેશન)' : `સેવ થયેલી સ્ક્રિપ્ટનું સ્લાઇડ-વાઇઝ પ્રિવ્યૂ (${sections.length} સ્લાઇડ્સ)`}
              </h4>
              <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 800;">✓ સક્રિય પ્રોજેક્ટમાં સુરક્ષિત</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px; max-height: 480px; overflow-y: auto; padding-right: 6px; font-family: 'Noto Sans Gujarati', sans-serif;">
              ${sections.map((sec, idx) => `
                <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px 18px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;">
                    <strong style="color: #38bdf8; font-size: 0.92rem;">${sec.sectionName || `સ્લાઇડ #${sec.slideNumber}`}: ${sec.title || ''}</strong>
                    <span style="font-size: 0.74rem; color: #cbd5e1; font-weight: 700;">📝 ${(sec.scriptText || '').trim().split(/\s+/).filter(Boolean).length} શબ્દો</span>
                  </div>
                  <div style="font-size: 0.9rem; color: #f8fafc; line-height: 1.7; white-space: pre-wrap;">${sec.scriptText || ''}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      `}

      <!-- CONNECTED WORKFLOW STEPPER BAR (TOOLS 1 TO 7 JOODAN) -->
      <div class="card workspace-bottom-stepper" style="background: rgba(15, 23, 42, 0.95); border: 1.5px solid rgba(16, 185, 129, 0.35); border-radius: 12px; padding: 14px 20px; margin-top: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.4rem;">🔗</span>
          <div>
            <div style="font-size: 0.78rem; color: #34d399; font-weight: 700;">
              વિડીયો વર્કફ્લો જોડાણ: <strong>પગલું ૫ / ૭</strong>
            </div>
            <div style="font-weight: 800; font-size: 0.95rem; color: #ffffff;">
              ૫. Script (PDF સ્લાઇડ્સ & ગુજરાતી સ્ક્રિપ્ટ)
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <button id="ws-btn-bottom-prev-script" class="btn btn-outline btn-sm" style="font-weight: 700; border-color: rgba(255,255,255,0.25); color: #cbd5e1; cursor: pointer;">
            ← પાછલું પગલું: ૪. Slide Prompts
          </button>
          <button id="ws-btn-bottom-next-script" class="btn btn-primary btn-sm" style="font-weight: 900; background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 10px 20px; border-radius: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.4); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
            આગળનું પગલું: ૬. Video Editor (વિડીયો નિર્માણ & ઓડિયો) → <!-- ૪. Video Editor -->
          </button>
        </div>
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    // Generate / Regenerate Prompt
    container.querySelector('#btn-generate-prompt')?.addEventListener('click', handleGeneratePrompt);

    // 1-Click AI Slide-Wise Script Generation
    container.querySelector('#btn-oneclick-generate-slidewise')?.addEventListener('click', handleOneClickSlideWiseScriptGeneration);

    // Duration and Tone changes
    container.querySelector('#select-target-duration')?.addEventListener('change', (e) => {
      targetDuration = e.target.value;
    });
    container.querySelector('#select-tone-style')?.addEventListener('change', (e) => {
      toneStyle = e.target.value;
    });

    // Content summary toggle
    container.querySelector('#btn-toggle-content-summary')?.addEventListener('click', () => {
      showContentSummary = !showContentSummary;
      render();
    });

    // Editable prompt textarea live save
    container.querySelector('#textarea-prompt-preview')?.addEventListener('input', (e) => {
      project.script.chatGptPrompt = e.target.value;
      projectState.updateTool('script', { chatGptPrompt: e.target.value });
    });

    // Copy Prompt Button
    container.querySelector('#btn-copy-prompt')?.addEventListener('click', () => {
      const pText = container.querySelector('#textarea-prompt-preview')?.value || project.script.chatGptPrompt || '';
      if (pText) {
        copyToClipboard(pText);
        showNoticeToast('✓ ChatGPT Script Prompt ક્લિપબોર્ડમાં કોપી થઈ ગયો!', 'success');
      }
    });

    // Submit Script Import from ChatGPT
    container.querySelector('#btn-submit-import-script')?.addEventListener('click', () => {
      const pasted = container.querySelector('#textarea-import-script')?.value || '';
      handleImportScriptFromChatGpt(pasted, true);
    });

    const scriptTextarea = container.querySelector('#textarea-import-script');
    let autoSaveDbTimer = null;

    function handleLiveScriptChange(text) {
      const val = text || '';
      project.script.fullText = val;
      project.script.rawText = val;
      project.script.originalChatGptScript = val;
      projectState.updateTool('script', {
        fullText: val,
        rawText: val,
        originalChatGptScript: val
      });

      if (autoSaveDbTimer) clearTimeout(autoSaveDbTimer);
      if (val.trim()) {
        autoSaveDbTimer = setTimeout(() => {
          saveScriptToDatabase(project.id, {
            rawText: val.trim(),
            fullText: val.trim(),
            sections: project.script.sections || [],
            source: 'ChatGPT'
          }, { notify: false, showToast: false }).catch(() => {});
        }, 1500);
      }
    }

    // Auto-sync textarea paste
    scriptTextarea?.addEventListener('paste', (e) => {
      const pasted = (e.clipboardData || window.clipboardData)?.getData('text') || '';
      if (pasted) {
        setTimeout(() => {
          const currentVal = scriptTextarea.value || pasted;
          handleLiveScriptChange(currentVal);
        }, 50);
      }
    });

    // Auto-sync textarea edits
    scriptTextarea?.addEventListener('input', (e) => {
      handleLiveScriptChange(e.target.value);
    });

    // Safe transition handler that ensures any entered script is saved before moving away
    async function safeNavigate(targetStage) {
      const currentVal = (scriptTextarea?.value || '').trim();
      if (currentVal && (!project.script?.sections || project.script.sections.length === 0 || currentVal !== (project.script.fullText || '').trim())) {
        try {
          await handleImportScriptFromChatGpt(currentVal, false);
        } catch (_) {}
      }
      navigateTo(targetStage);
    }

    // Direct PDF Upload Handler in Scriptwriter
    async function handlePdfUploadInScript(file) {
      if (!file) return;
      const ext = (file.name || '').split('.').pop().toLowerCase();
      if (!['pdf', 'pptx', 'ppt'].includes(ext)) {
        alert('કૃપા કરીને માત્ર PDF અથવા PPTX ફાઇલ પસંદ કરો.');
        return;
      }

      showNoticeToast(`📄 "${file.name}" અપલોડ અને સ્લાઇડ એક્સટ્રેક્શન ચાલુ છે...`, 'info');

      const reader = new FileReader();
      reader.onerror = (rErr) => {
        console.error('[ScriptWriter FileReader Error]:', rErr);
        alert('PDF ફાઇલ વાંચવામાં ભૂલ આવી. કૃપા કરીને ફાઇલ ફરી પસંદ કરો.');
      };
      reader.onload = async (e) => {
        try {
          const base64Data = e.target.result;
          const res = await api.post('/api/research/upload-file', {
            fileBase64: base64Data,
            filename: file.name,
            overallTopic: project.topic || project.name || '',
            projectId: project.id
          });

          if (res && res.success && Array.isArray(res.slides) && res.slides.length > 0) {
            const sizeFormatted = `${Math.round(file.size / 1024)} KB`;
            const fileRecord = {
              id: `pres_${project.id}_${Date.now()}`,
              projectId: project.id,
              filename: file.name,
              fileType: ext,
              fileUrl: res?.fileUrl || '',
              size: file.size,
              sizeFormatted,
              uploadedAt: new Date().toISOString(),
              slidesCount: res.slides.length,
              slides: res.slides,
              dataUrl: base64Data
            };

            await saveProjectPresentation(project.id, fileRecord);
            if (project.topicId && project.topicId !== project.id) {
              await saveProjectPresentation(project.topicId, fileRecord);
            }

            project.slide = project.slide || {};
            project.slide.slides = res.slides;
            project.slide.importedPresentation = { ...fileRecord, dataUrl: '' };
            projectState.updateTool('slide', project.slide);

            slides = res.slides;
            importedMeta = fileRecord;

            // Preserve existing rich script if present in project or DB, else use extracted slide script
            const existingSections = Array.isArray(project.script?.sections) && project.script.sections.length > 0
              ? project.script.sections
              : [];

            const newSections = res.slides.map((s, idx) => {
              const matchedExisting = existingSections[idx] || existingSections.find(es => es.slideNumber === (idx + 1));
              const richScript = (matchedExisting && matchedExisting.scriptText && matchedExisting.scriptText.trim().length > 20)
                ? matchedExisting.scriptText.trim()
                : (s.scriptText || s.content || (s.bulletPoints && s.bulletPoints.length > 0 ? s.bulletPoints.join('. ') : `${s.title || 'સ્લાઇડ #' + (idx + 1)} વિશેની સંપૂર્ણ માહિતી અને સમજૂતી.`));
              const finalTitle = (matchedExisting && matchedExisting.sectionName && !matchedExisting.sectionName.startsWith('સ્લાઇડ #'))
                ? matchedExisting.sectionName
                : (s.title || `સ્લાઇડ #${idx + 1}`);

              return {
                slideNumber: idx + 1,
                sectionName: finalTitle,
                title: finalTitle,
                subtitle: s.subtitle || '',
                scriptText: richScript
              };
            });
            const scriptText = newSections.map(sec => `[સ્લાઇડ #${sec.slideNumber}: ${sec.sectionName}]\n${sec.scriptText}`).join('\n\n');

            project.script = project.script || {};
            project.script.sections = newSections;
            project.script.rawText = scriptText;
            project.script.fullText = scriptText;
            project.script.originalChatGptScript = scriptText;
            project.script.savedInDb = true;
            projectState.updateTool('script', project.script);

            await saveScriptToDatabase(project.id, {
              rawText: scriptText,
              fullText: scriptText,
              sections: newSections,
              source: 'PDF_Extract'
            }, { notify: false, showToast: false }).catch(() => {});

            showNoticeToast(`🎉 PDF સફળતાપૂર્વક અપલોડ થઈ ગઈ (${res.slides.length} સ્લાઇડ્સ)! સ્ક્રિપ્ટ તૈયાર છે.`, 'success');
            render();
          } else {
            throw new Error(res?.error || 'સ્લાઇડ્સ વાંચી શકાઈ નથી.');
          }
        } catch (err) {
          console.error('[Script PDF Upload Error]:', err);
          alert('PDF અપલોડ કરવામાં ભૂલ: ' + err.message);
        }
      };
      reader.readAsDataURL(file);
    }

    // Bind File Input Listeners
    ['#input-script-pdf-main', '#input-script-pdf-top', '#input-script-pdf-change'].forEach(sel => {
      container.querySelector(sel)?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) handlePdfUploadInScript(file);
      });
    });

    // Open Folder Notebook from Scriptwriter
    container.querySelector('#btn-open-folder-notebook-script')?.addEventListener('click', () => {
      openFolderNotebookModal({ folderId: project?.folderId || 'f_default', folderName: project?.folderName || '📁 મુખ્ય ફોલ્ડર' });
    });

    // Navigation triggers (Connected Workflow 1 to 7)
    container.querySelector('#btn-goto-slides-step')?.addEventListener('click', () => safeNavigate('slideprompts'));
    container.querySelector('#ws-btn-bottom-prev-script')?.addEventListener('click', () => safeNavigate('slideprompts'));
    container.querySelector('#ws-btn-bottom-next-script')?.addEventListener('click', () => {
      // safeNavigate('myvoice');
      safeNavigate('videoeditor');
    });
    container.querySelector('#btn-goto-slides-action')?.addEventListener('click', () => safeNavigate('slideprompts'));
    container.querySelector('#btn-goto-script-editor-top')?.addEventListener('click', () => safeNavigate('scripteditor'));
    container.querySelector('#btn-goto-script-editor-mid')?.addEventListener('click', () => safeNavigate('scripteditor'));
    container.querySelector('#btn-goto-script-editor-bottom')?.addEventListener('click', () => safeNavigate('scripteditor'));
    container.querySelector('#btn-goto-voice-top')?.addEventListener('click', () => {
      safeNavigate('myvoice');
    });
    container.querySelector('#btn-goto-voice-mid')?.addEventListener('click', () => {
      safeNavigate('myvoice');
    });
    container.querySelector('#btn-goto-voice-bottom')?.addEventListener('click', () => {
      safeNavigate('myvoice');
    });
  }

  // Initial render
  render();
}
