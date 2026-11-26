/**
 * Script Database Sync Engine
 * Gyan Yatra AI Studio — Permanent Script Storage & Multi-Version History
 * 
 * Rules:
 * 1. Database is the Single Source of Truth.
 * 2. Every saved script has a unique scriptId and version number.
 * 3. Never overwrite existing scripts silently: previous versions are archived.
 * 4. 100% Verbatim preservation: text from ChatGPT is stored without alterations.
 * 5. Audio generation binds directly to scriptId.
 */

import { api } from '../api.js';
import { projectState, isContentMatchingTopic } from './projectState.js';
import { showNoticeToast } from './clipboard.js';

let isSavingToDb = false;

/**
 * Canonical Final Script Extractor
 * Guarantees a single unified source of truth across all tools.
 * Prioritizes latest saved text, preserves 100% Gujarati words verbatim.
 */
export function getCanonicalScript(project) {
  if (!project) return { text: '', rawText: '', fullText: '', sections: [], version: 1, savedInDb: false, wordCount: 0 };
  const s = project.script || {};
  const canonicalText = (s.fullText || s.rawText || s.originalChatGptScript || '').trim();
  const sections = Array.isArray(s.sections) && s.sections.length > 0 ? s.sections : [];
  const wordCount = canonicalText ? canonicalText.split(/\s+/).filter(Boolean).length : 0;
  return {
    text: canonicalText,
    rawText: canonicalText,
    fullText: canonicalText,
    sections,
    editedSections: s.editedSections || sections,
    version: s.version || 1,
    savedInDb: Boolean(s.savedInDb),
    updatedAt: s.savedAt || s.updatedAt || null,
    source: s.source || 'ChatGPT',
    wordCount
  };
}

/**
 * Permanently save a script to the backend database with versioning & project linkage
 */
export async function saveScriptToDatabase(projectId, scriptPayload, options = {}) {

  const {
    changeSummary = 'Saved from Gyan Yatra Studio',
    notify = true,
    showToast = true
  } = options;

  if (!projectId) {
    console.warn('[ScriptDbSync] No projectId provided for saveScriptToDatabase');
    return null;
  }

  const rawText = (scriptPayload.rawText || scriptPayload.fullText || scriptPayload.scriptText || '').trim();
  if (!rawText && (!scriptPayload.sections || scriptPayload.sections.length === 0)) {
    if (notify) alert('સ્ક્રિપ્ટનું લખાણ ખાલી છે, તેથી Database માં સેવ થઈ શકે નહીં.');
    return null;
  }

  isSavingToDb = true;

  try {
    const activeProject = projectState.getActiveProject();
    const importedMeta = activeProject?.slide?.importedPresentation || null;
    const authenticSlideCount = importedMeta?.slidesCount || importedMeta?.slideCount || importedMeta?.pageCount || (activeProject?.slide?.slides?.length || 9);

    const payload = {
      projectId,
      projectName: activeProject?.name || activeProject?.topic || 'ગુજરાત સત્તાવાર નિર્ણય',
      presentationId: importedMeta?.id || null,
      pdfFilename: importedMeta?.filename || 'presentation.pdf',
      slideCount: authenticSlideCount > 20 ? 9 : authenticSlideCount,
      originalChatGptScript: scriptPayload.originalChatGptScript || rawText,
      rawText: rawText,
      fullText: scriptPayload.fullText || rawText,
      sections: Array.isArray(scriptPayload.sections) ? scriptPayload.sections : [],
      editedSections: Array.isArray(scriptPayload.editedSections) ? scriptPayload.editedSections : (scriptPayload.sections || []),
      source: scriptPayload.source || 'ChatGPT',
      changeSummary
    };

    const response = await api.saveScript(payload);
    if (!response || !response.success || !response.script) {
      throw new Error(response?.error || 'Database save failed');
    }

    const saved = response.script;

    // Update active project state with persistent database metadata
    if (activeProject && activeProject.id === projectId) {
      if (!activeProject.script) activeProject.script = {};
      activeProject.script.scriptId = saved.scriptId || saved.id;
      activeProject.script.id = saved.scriptId || saved.id;
      activeProject.script.version = saved.version || 1;
      activeProject.script.versions = saved.versions || [];
      activeProject.script.savedInDb = true;
      activeProject.script.savedAt = saved.updatedAt || new Date().toISOString();
      activeProject.script.originalChatGptScript = saved.originalChatGptScript || saved.rawText || rawText;
      activeProject.script.rawText = saved.rawText;
      activeProject.script.fullText = saved.fullText;
      activeProject.script.sections = saved.sections;
      activeProject.script.editedSections = saved.editedSections || saved.sections;
      activeProject.script.wordCount = saved.wordCount;
      activeProject.script.source = saved.source;
      activeProject.script.isCompleted = true;

      // Update slide scriptTexts
      if (activeProject.slide && Array.isArray(activeProject.slide.slides)) {
        activeProject.slide.slides.forEach((sl, idx) => {
          if (saved.sections && saved.sections[idx]) {
            sl.scriptText = saved.sections[idx].scriptText;
          }
        });
      }

      projectState.updateTool('script', activeProject.script);
      if (activeProject.slide?.slides) {
        projectState.updateTool('slide', { slides: activeProject.slide.slides });
      }

      projectState.saveVersionSnapshot(
        projectId,
        'scripts',
        `DB Save (v${saved.version}): ${saved.wordCount} words`
      );
    }

    if (showToast) {
      showNoticeToast(
        `💾 Script Database માં કાયમી સેવ થઈ ગઈ! (ID: ${saved.scriptId.slice(0, 16)}... • v${saved.version})`,
        'success'
      );
    }

    // Dispatch global event so all open views (Voice Studio, Editor) immediately sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('scriptDatabaseSaved', { detail: saved }));
    }

    return saved;
  } catch (err) {
    console.error('[ScriptDbSync Save Error]:', err);
    if (notify) {
      alert('સ્ક્રિપ્ટ Database માં સાચવવામાં સમસ્યા આવી: ' + (err.message || 'અજ્ઞાત ક્ષતિ'));
    }
    return null;
  } finally {
    isSavingToDb = false;
  }
}

/**
 * Fetch saved script from Database for a project and sync local state if needed
 */
export async function syncProjectScriptWithDatabase(projectId) {
  if (!projectId) return null;

  try {
    const res = await api.getProjectScript(projectId);
    if (!res || !res.success || !res.script) {
      return null;
    }

    const dbScript = res.script;
    const activeProject = projectState.getActiveProject();

    if (activeProject && activeProject.id === projectId) {
      const activeTopicName = (activeProject.topic || activeProject.name || '').trim();
      const dbText = (dbScript.fullText || dbScript.rawText || '').trim();
      const dbTopicOrName = (dbScript.projectName || dbScript.topic || '').trim();

      // Guard: strictly ensure remote DB script belongs to THIS project topic!
      if (activeTopicName && !isContentMatchingTopic(dbText || dbTopicOrName, activeTopicName)) {
        console.warn('[ScriptDbSync] Rejecting mismatched remote script:', dbTopicOrName, 'for topic:', activeTopicName);
        return null;
      }

      const localText = (activeProject.script?.fullText || activeProject.script?.rawText || '').trim();

      // Database is Single Source of Truth: update if local is empty OR db has more content / higher version
      const localVersion = activeProject.script?.version || 0;
      const dbVersion = dbScript.version || 1;

      const shouldSync = Boolean(
        dbText && (
          !localText ||
          dbText.length > localText.length ||
          !activeProject.script?.sections ||
          activeProject.script.sections.length === 0 ||
          (Array.isArray(dbScript.sections) && dbScript.sections.length > (activeProject.script?.sections?.length || 0)) ||
          dbVersion >= localVersion ||
          !activeProject.script?.savedInDb
        )
      );

      if (shouldSync) {
        if (!activeProject.script) activeProject.script = {};
        activeProject.script.scriptId = dbScript.scriptId || dbScript.id;
        activeProject.script.id = dbScript.scriptId || dbScript.id;
        activeProject.script.version = Math.max(dbScript.version || 1, localVersion);
        activeProject.script.versions = dbScript.versions || [];
        activeProject.script.savedInDb = true;
        activeProject.script.savedAt = dbScript.updatedAt || new Date().toISOString();
        activeProject.script.rawText = dbScript.rawText || dbScript.fullText;
        activeProject.script.fullText = dbScript.fullText || dbScript.rawText;
        activeProject.script.originalChatGptScript = dbScript.originalChatGptScript || dbScript.rawText || dbScript.fullText;
        activeProject.script.sections = dbScript.sections || [];
        activeProject.script.editedSections = dbScript.editedSections || dbScript.sections || [];
        activeProject.script.wordCount = dbScript.wordCount || (activeProject.script.fullText.split(/\s+/).filter(Boolean).length);
        activeProject.script.source = dbScript.source || 'ChatGPT';
        activeProject.script.isCompleted = true;

        if (!activeProject.slide || !Array.isArray(activeProject.slide.slides) || activeProject.slide.slides.length === 0) {
          activeProject.slide = activeProject.slide || {};
          activeProject.slide.slides = (dbScript.sections || []).map((sec, idx) => ({
            slideNumber: sec.slideNumber || (idx + 1),
            pageNumber: sec.pageNumber || sec.slideNumber || (idx + 1),
            slideId: sec.slideId || `slide_${projectId}_${idx + 1}`,
            title: sec.title || sec.sectionName || `સ્લાઇડ #${idx + 1}`,
            subtitle: sec.subtitle || '',
            bulletPoints: sec.bulletPoints || [],
            scriptText: sec.scriptText || '',
            bgColor: '#FFFFFF',
            textColor: '#0F172A'
          }));
          projectState.updateTool('slide', { slides: activeProject.slide.slides });
        } else if (Array.isArray(activeProject.slide.slides) && dbScript.sections && dbScript.sections.length > 0) {
          activeProject.slide.slides.forEach((sl, idx) => {
            const sec = dbScript.sections[idx] || dbScript.sections.find(s => s.slideNumber === (idx + 1));
            if (sec) {
              if (sec.scriptText) sl.scriptText = sec.scriptText;
              if ((sec.title || sec.sectionName) && (!sl.title || sl.title.startsWith('સ્લાઇડ'))) {
                sl.title = sec.title || sec.sectionName;
              }
            }
          });
          projectState.updateTool('slide', { slides: activeProject.slide.slides });
        }

        projectState.updateTool('script', activeProject.script);
      }
    }

    return dbScript;
  } catch (err) {
    console.warn('[ScriptDbSync Fetch Notice]:', err.message);
    return null;
  }
}

/**
 * Restore an earlier script version from Database
 */
export async function restoreScriptVersionFromDb(projectId, scriptId) {
  if (!projectId || !scriptId) return null;

  try {
    const res = await api.restoreProjectScriptVersion(projectId, scriptId);
    if (!res || !res.success || !res.script) {
      throw new Error(res?.error || 'Restore failed');
    }

    const restored = res.script;
    const activeProject = projectState.getActiveProject();

    if (activeProject && activeProject.id === projectId) {
      if (!activeProject.script) activeProject.script = {};
      activeProject.script.scriptId = restored.scriptId || restored.id;
      activeProject.script.version = restored.version;
      activeProject.script.versions = restored.versions || [];
      activeProject.script.savedInDb = true;
      activeProject.script.savedAt = restored.updatedAt;
      activeProject.script.rawText = restored.rawText;
      activeProject.script.fullText = restored.fullText;
      activeProject.script.sections = restored.sections || [];
      activeProject.script.editedSections = restored.editedSections || restored.sections || [];
      activeProject.script.wordCount = restored.wordCount;
      activeProject.script.source = restored.source;

      if (activeProject.slide && Array.isArray(activeProject.slide.slides) && restored.sections) {
        activeProject.slide.slides.forEach((sl, idx) => {
          if (restored.sections[idx]) {
            sl.scriptText = restored.sections[idx].scriptText;
          }
        });
        projectState.updateTool('slide', { slides: activeProject.slide.slides });
      }

      projectState.updateTool('script', activeProject.script);
      projectState.saveVersionSnapshot(
        projectId,
        'scripts',
        `Restored DB Version ${restored.version}`
      );
    }

    showNoticeToast(`✅ Version ${restored.version} સફળતાપૂર્વક Restore થઈ ગયું!`, 'success');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('scriptDatabaseSaved', { detail: restored }));
    }

    return restored;
  } catch (err) {
    console.error('[ScriptDbSync Restore Error]:', err);
    alert('જૂની સ્ક્રિપ્ટ Restore કરવામાં ભૂલ આવી: ' + (err.message || 'અજ્ઞાત ક્ષતિ'));
    return null;
  }
}

export { saveScriptToDatabase as saveProjectScriptToDb };


