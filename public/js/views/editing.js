/**
 * Slide-Wise Script Editor (Stage 5: Script Editor)
 * Gyan Yatra AI Studio — Master Connected Video Production Workflow
 * 
 * Connected Workflow:
 * 1. Receives slide-wise script sections ONLY when imported from ChatGPT (never automatically generated dummy scripts).
 * 2. Maintains strict 1-to-1 relationship between Slide # and Script Section.
 * 3. Shows Slide Reference Facts & Bullets right above the editing textarea.
 * 4. Allows editing, saving, and adjusting individual slide sections.
 * 5. Preserves version history snapshots and autosaves so content is NEVER lost.
 * 6. Passes cleanly to Stage 6 (Thumbnail), Stage 7 (SEO), and Stage 8 (Voice & Audio).
 */

import { projectState } from '../utils/projectState.js';
import { copyToClipboard, showNoticeToast } from '../utils/clipboard.js';
import { parseChatGptScriptText } from '../utils/externalSlideParser.js';
import { saveScriptToDatabase, syncProjectScriptWithDatabase, restoreScriptVersionFromDb } from '../utils/scriptDbSync.js';

export function renderEditing(container, navigateTo) {
  const project = projectState.getActiveProject();
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

  // Ensure script state structure exists
  if (!project.script) project.script = {};
  if (!Array.isArray(project.script.sections)) project.script.sections = [];

  const slides = Array.isArray(project.slide?.slides) ? project.slide.slides : [];
  const importedMeta = project.slide?.importedPresentation || null;

  let authenticCount = (slides.length > 0) ? slides.length : (importedMeta?.slidesCount || importedMeta?.slideCount || importedMeta?.pageCount || 1);

  let currentFullText = (project.script?.originalChatGptScript || project.script?.rawText || project.script?.fullText || '').trim();
  if (!project.script.originalChatGptScript && currentFullText) {
    project.script.originalChatGptScript = currentFullText;
  }

  // Forcefully cleanse residual 70-slides corruption from past bugs
  if (slides.length === 70 || (Array.isArray(project.script?.sections) && project.script.sections.length === 70)) {
    slides.length = authenticCount;
    if (!currentFullText) {
      project.script.sections = [];
      project.script.editedSections = [];
    }
  }

  if (currentFullText) {
    const shouldRepairOrDistribute = (
      slides.length === 70 ||
      (Array.isArray(project.script?.sections) && project.script.sections.length === 70) ||
      (!project.script?.sections || project.script.sections.length === 0)
    );

    if (shouldRepairOrDistribute) {
      const repaired = parseChatGptScriptText(currentFullText, slides);
      project.script.sections = repaired;
      project.script.editedSections = repaired;
      project.script.rawText = project.script.originalChatGptScript;
      project.script.fullText = currentFullText;

      slides.forEach((sl, idx) => {
        if (repaired[idx]) {
          sl.scriptText = repaired[idx].scriptText;
          sl.title = repaired[idx].title || `સ્લાઇડ #${idx + 1}`;
          repaired[idx].slideId = sl.slideId;
          repaired[idx].slideNumber = sl.slideNumber;
        }
      });

      project.slide.slides = slides;
      projectState.updateTool('slide', { slides, slideCount: `${authenticCount} સ્લાઇડ્સ` });
      projectState.updateTool('script', {
        originalChatGptScript: project.script.originalChatGptScript,
        sections: repaired,
        editedSections: repaired,
        rawText: project.script.originalChatGptScript,
        fullText: currentFullText
      });
    }
  }

  // STRICT REQUIREMENT: Never auto-populate dummy script.
  // Script sections exist only when imported by user from ChatGPT.
  const sections = project.script.sections;
  const hasSections = sections.length > 0;

  let isSaving = false;
  let showVersionHistoryModal = false;
  let hasUnsavedChanges = false;
  let autoSaveTimer = null;

  // Sync with Database (Source of Truth) on load
  syncProjectScriptWithDatabase(project.id).catch(() => {});

  function calculateTotals() {
    const fullText = sections.map(s => s.scriptText || '').join(' ');
    const words = fullText.trim().split(/\s+/).filter(Boolean).length;
    const totalMinutes = words / 130;
    const mins = Math.floor(totalMinutes);
    const secs = Math.round((totalMinutes - mins) * 60);
    return {
      words,
      minutes: Math.round(totalMinutes * 10) / 10,
      formattedTime: `${mins}:${secs < 10 ? '0' : ''}${secs}`
    };
  }

  async function saveScript(notify = true) {
    if (isSaving) return;
    isSaving = true;

    let fullText = '';
    if (sections.length > 1) {
      fullText = sections
        .map(sec => `[${sec.sectionName || `સ્લાઇડ #${sec.slideNumber}`}: ${sec.title || ''}]\n${sec.scriptText || ''}`)
        .join('\n\n');
    } else if (sections.length === 1) {
      fullText = sections[0]?.scriptText || project.script?.rawText || project.script?.fullText || '';
    } else {
      fullText = (project.script?.rawText || project.script?.fullText || '').trim();
    }

    if (fullText) {
      project.script.fullText = fullText;
      if (!project.script.originalChatGptScript) {
        project.script.originalChatGptScript = project.script.rawText || fullText;
      }
      project.script.rawText = project.script.originalChatGptScript;
    }
    project.script.sections = sections;
    project.script.editedSections = sections;
    project.script.isCompleted = Boolean(fullText) || sections.length > 0;

    // Sync back to slide.slides so Voice Studio immediately reflects all edits
    if (!project.slide) project.slide = {};
    if (!Array.isArray(project.slide.slides)) project.slide.slides = [];

    const authenticCount = importedMeta?.slidesCount || importedMeta?.slideCount || importedMeta?.pageCount || 0;
    if (authenticCount > 0 && slides.length > authenticCount) {
      slides.length = authenticCount;
    } else if (!importedMeta && sections.length <= 1 && slides.length > 1) {
      slides.length = 1;
    }

    if (slides.length === 0) {
      slides.push({
        slideNumber: 1,
        title: 'સંપૂર્ણ સ્ક્રિપ્ટ',
        subtitle: '',
        bulletPoints: [],
        scriptText: fullText,
        bgColor: '#FFFFFF',
        textColor: '#0F172A'
      });
    }

    if (sections.length <= 1) {
      slides[0].scriptText = fullText;
    } else {
      slides.forEach((sl, idx) => {
        if (sections[idx]) {
          sl.scriptText = sections[idx].scriptText;
          if (sections[idx].title && (!sl.title || sl.title.startsWith('સ્લાઇડ #'))) {
            sl.title = sections[idx].title;
          }
        }
      });
    }

    project.slide.slides = slides;
    projectState.updateTool('slide', { slides });

    projectState.updateTool('script', {
      sections,
      editedSections: sections,
      fullText,
      rawText: fullText,
      isCompleted: sections.length > 0
    });

    hasUnsavedChanges = false;

    // Save permanently to Database (Single Source of Truth)
    try {
      const saved = await saveScriptToDatabase(project.id, {
        rawText: fullText,
        fullText,
        sections,
        source: project.script.source || 'ChatGPT'
      }, { notify, showToast: notify });

      if (saved) {
        project.script.scriptId = saved.scriptId || saved.id;
        project.script.version = saved.version;
        project.script.savedInDb = true;
        project.script.savedAt = saved.updatedAt;
      }
    } catch (err) {
      console.warn('[Editing DB Save error]:', err);
    } finally {
      isSaving = false;
    }

    if (notify) {
      projectState.saveVersionSnapshot(
        project.id,
        'scripts',
        sections.length <= 1
          ? `Edited Full Script (${calculateTotals().words} words)`
          : `Edited Script (${sections.length} sections, ${calculateTotals().words} words)`
      );
    }

    render();
  }

  function handleDirectImport(pastedText) {
    if (!pastedText || !pastedText.trim()) {
      alert('કૃપા કરીને ChatGPT માંથી મળેલ સ્ક્રિપ્ટ લખાણ પેસ્ટ કરો.');
      return;
    }

    try {
      const parsedSections = parseChatGptScriptText(pastedText, slides);
      if (!parsedSections || parsedSections.length === 0) {
        alert('સ્ક્રિપ્ટનું ફોર્મેટ ઓળખી શકાયું નથી.');
        return;
      }

      const exactRawText = pastedText.trim();
      project.script.rawText = exactRawText;
      project.script.fullText = exactRawText;
      project.script.sections = parsedSections;
      project.script.editedSections = parsedSections;
      project.script.source = 'ChatGPT';
      project.script.importedAt = new Date().toISOString();
      project.script.isCompleted = true;

      if (!project.slide) project.slide = {};
      if (!Array.isArray(project.slide.slides)) project.slide.slides = [];

      const authenticCount = importedMeta?.slidesCount || importedMeta?.slideCount || importedMeta?.pageCount || 0;
      if (authenticCount > 0 && slides.length > authenticCount) {
        slides.length = authenticCount;
      } else if (!importedMeta && parsedSections.length <= 1 && slides.length > 1) {
        slides.length = 1;
      }

      if (slides.length === 0) {
        slides.push({
          slideNumber: 1,
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
            if (parsedSections[idx].title && (!sl.title || sl.title.startsWith('સ્લાઇડ #'))) {
              sl.title = parsedSections[idx].title;
            }
          }
        });
      }

      project.slide.slides = slides;
      projectState.updateTool('slide', { slides });

      projectState.updateTool('script', {
        sections: parsedSections,
        editedSections: parsedSections,
        rawText: exactRawText,
        fullText: exactRawText,
        source: 'ChatGPT',
        importedAt: project.script.importedAt,
        isCompleted: true
      });

      // Save permanently to Backend Database
      saveScriptToDatabase(project.id, {
        rawText: exactRawText,
        fullText: exactRawText,
        sections: parsedSections,
        source: 'ChatGPT'
      }, { notify: true, showToast: false }).catch(e => console.warn('[DirectImport DB Save]:', e));

      projectState.saveVersionSnapshot(
        project.id,
        'scripts',
        parsedSections.length <= 1
          ? `Imported Full Script from ChatGPT (${calculateTotals().words} words)`
          : `Imported Script from ChatGPT (${parsedSections.length} sections)`
      );

      const msg = parsedSections.length <= 1
        ? `🎉 ChatGPT માંથી સંપૂર્ણ સળંગ સ્ક્રિપ્ટ સફળતાપૂર્વક Import થઈ ગઈ!`
        : `🎉 ChatGPT માંથી ${parsedSections.length} સ્લાઇડ્સની સ્ક્રિપ્ટ સફળતાપૂર્વક Import થઈ ગઈ!`;

      showNoticeToast(msg, 'success');
      render();
    } catch (err) {
      alert('સ્ક્રિપ્ટ ઈમ્પોર્ટ કરવામાં ક્ષતિ: ' + err.message);
    }
  }

  function render() {
    const totals = calculateTotals();

    container.innerHTML = `
      <!-- TOP CONTEXT TOOLBAR -->
      <div class="card" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid #38bdf8; border-radius: var(--radius-lg); padding: 16px 22px; margin-bottom: 22px; box-shadow: 0 8px 30px rgba(56, 189, 248, 0.25);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; border: 1px solid rgba(56, 189, 248, 0.35);">
              ✍️
            </div>
            <div>
              <h2 style="font-size: 1.35rem; font-weight: 900; color: #ffffff; margin: 0 0 2px 0; display: flex; align-items: center; gap: 8px;">
                <span>૫. સ્ક્રિપ્ટ એડિટર (Slide-Wise Script Editor)</span>
                <span class="badge" style="background: ${hasSections ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${hasSections ? '#34d399' : '#fbbf24'}; border: 1px solid ${hasSections ? '#10b981' : '#f59e0b'}; font-size: 0.74rem; font-weight: 800; padding: 3px 8px;">
                  ${hasSections ? `✓ ${sections.length} સ્લાઇડ સેક્શન્સ (ChatGPT)` : '⚪ સ્ક્રિપ્ટ બાકી'}
                </span>
              </h2>
              <p style="color: #cbd5e1; font-size: 0.82rem; margin: 0;">
                📁 પ્રોજેક્ટ: <strong>${project.name}</strong> • સ્ત્રોત: <strong style="color: #38bdf8;">${importedMeta?.filename || 'Presentation'}</strong>
              </p>
            </div>
          </div>

          <!-- Top Actions -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            ${hasSections ? `
              <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 800; border: 1px solid #10b981; font-size: 0.74rem;">
                🟢 DB v${project.script?.version || 1} • Saved
              </span>
              ${hasUnsavedChanges ? `<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; font-weight: 800; border: 1px solid #f59e0b; font-size: 0.74rem;">⚠️ Unsaved Edits</span>` : ''}

              <button id="btn-open-version-history-top" class="btn btn-outline btn-sm" style="color: #38bdf8; border-color: #38bdf8; font-weight: 800; padding: 7px 14px;">
                📜 Version History (${project.script?.versions?.length || 0})
              </button>

              <button id="btn-save-script-action" class="btn btn-success btn-sm" style="font-weight: 800; background: #10b981; border: none; padding: 8px 18px; display: inline-flex; align-items: center; gap: 6px;">
                💾 ${isSaving ? 'સાચવી રહ્યું છે...' : 'Database માં સાચવો'}
              </button>
              <button id="btn-next-to-voice-action" class="btn btn-primary btn-sm" style="font-weight: 800; background: linear-gradient(135deg, #ec4899, #db2777); border: none; padding: 8px 18px; display: inline-flex; align-items: center; gap: 6px;">
                <span>🎙️</span> ૮. Voice & Audio ➔
              </button>
            ` : `
              <button id="btn-goto-script-prompt-top" class="btn btn-primary btn-sm" style="font-weight: 800; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; padding: 8px 18px;">
                ← ૪. ChatGPT Script Prompt
              </button>
            `}
          </div>

        </div>
      </div>

      ${!hasSections ? `
        <!-- No Script Available Card -->
        <div class="card" style="padding: 44px 24px; text-align: center; background: rgba(15, 23, 42, 0.85); border: 2px dashed rgba(245, 158, 11, 0.4); border-radius: 16px; margin-bottom: 24px;">
          <div style="width: 72px; height: 72px; margin: 0 auto 16px auto; border-radius: 20px; background: rgba(245, 158, 11, 0.12); display: flex; align-items: center; justify-content: center; font-size: 2.4rem; border: 1px solid rgba(245, 158, 11, 0.3);">
            📝
          </div>
          <h3 style="font-size: 1.4rem; font-weight: 900; color: #ffffff; margin: 0 0 8px 0;">
            આ પ્રોજેક્ટમાં હજુ ChatGPT માંથી સ્ક્રિપ્ટ ઈમ્પોર્ટ થયેલ નથી.
          </h3>
          <p style="color: #94a3b8; font-size: 0.92rem; max-width: 600px; margin: 0 auto 20px auto; line-height: 1.6;">
            સ્ક્રિપ્ટ એડિટ કરવા માટે પહેલાં <strong>૪. Script Prompt</strong> પરથી ChatGPT Prompt કોપી કરીને ChatGPT માંથી તૈયાર થયેલી સ્ક્રિપ્ટ અહીં લાવો.
          </p>

          <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-bottom: 24px;">
            <button id="btn-goto-script-prompt-action" class="btn btn-primary" style="font-weight: 800; font-size: 0.95rem; padding: 12px 28px; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; border-radius: 10px; box-shadow: 0 4px 18px rgba(2, 132, 199, 0.45); cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
              <span>←</span> ૪. ChatGPT Script Prompt મેળવો & કોપી કરો
            </button>
          </div>

          <!-- Quick Paste Inside Script Editor -->
          <div style="max-width: 720px; margin: 0 auto; text-align: left; background: rgba(0, 0, 0, 0.35); padding: 20px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08);">
            <label style="display: block; font-size: 0.84rem; font-weight: 800; color: #38bdf8; margin-bottom: 8px;">
              📥 અથવા ChatGPT સ્ક્રિપ્ટ અહીં સીધી પેસ્ટ કરો:
            </label>
            <textarea id="textarea-quick-paste" class="form-control font-gu" rows="5" placeholder="ChatGPT માંથી મેળવેલ સ્ક્રિપ્ટ અહીં પેસ્ટ કરો..." style="width: 100%; background: #07090e; color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 10px 14px; font-size: 0.9rem; resize: vertical; margin-bottom: 12px;"></textarea>
            <button id="btn-submit-quick-paste" class="btn btn-success" style="font-weight: 800; background: #10b981; border: none; padding: 9px 22px; border-radius: 8px;">
              💾 સ્ક્રિપ્ટ Import કરો
            </button>
          </div>
        </div>
      ` : `
        <!-- Metrics & Tools Header -->
        <div class="card" style="margin-bottom: 22px; padding: 16px 22px; background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          
          <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
            <div>
              <span style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; font-weight: 800;">કુલ સ્લાઇડ્સ</span>
              <div style="font-size: 1.25rem; font-weight: 900; color: #ffffff;">${sections.length} વિભાગો</div>
            </div>
            <div style="width: 1px; height: 30px; background: rgba(255,255,255,0.1);"></div>
            <div>
              <span style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; font-weight: 800;">કુલ શબ્દો</span>
              <div id="live-total-words" style="font-size: 1.25rem; font-weight: 900; color: #38bdf8;">${totals.words} શબ્દો</div>
            </div>
            <div style="width: 1px; height: 30px; background: rgba(255,255,255,0.1);"></div>
            <div>
              <span style="font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; font-weight: 800;">અંદાજિત બોલવાનો સમય</span>
              <div id="live-total-duration" style="font-size: 1.25rem; font-weight: 900; color: #10b981;">~${totals.minutes} મિનિટ (${totals.formattedTime})</div>
            </div>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <button id="btn-goto-exact-audio" class="btn btn-primary btn-sm" style="font-weight: 800; background: linear-gradient(135deg, #a855f7, #7c3aed); border: none; box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4); display: inline-flex; align-items: center; gap: 6px;">
              🎙️ Exact Script to Audio બનાવો ➔
            </button>
            <button id="btn-copy-all-script" class="btn btn-outline btn-sm" style="font-weight: 800; border-color: rgba(56,189,248,0.4); color: #38bdf8;">
              📋 આખી સ્ક્રિપ્ટ કોપી કરો
            </button>
            <button id="btn-next-to-thumbnail" class="btn btn-outline btn-sm" style="font-weight: 800; border-color: #f59e0b; color: #fbbf24;">
              ૬. Thumbnail ➔
            </button>
          </div>

        </div>

        <!-- Slide-by-Slide Script Sections Editor Cards -->
        <div style="display: flex; flex-direction: column; gap: 18px; margin-bottom: 28px;">
          ${sections.map((sec, idx) => {
            const slideBullets = (Array.isArray(sec.bullets) && sec.bullets.length > 0)
              ? sec.bullets
              : (slides[idx]?.bulletPoints || []);
            const secWords = (sec.scriptText || '').trim().split(/\s+/).filter(Boolean).length;

            return `
              <div class="card script-section-card" data-idx="${idx}" style="padding: 20px 24px; background: rgba(15, 23, 42, 0.8); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 14px; box-shadow: 0 4px 18px rgba(0,0,0,0.35);">
                
                <!-- Section Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.08); flex-wrap: wrap; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="badge" style="background: ${idx === 0 ? '#ef4444' : idx === sections.length - 1 ? '#10b981' : '#3b82f6'}; color: #fff; font-weight: 900; font-size: 0.78rem; padding: 4px 10px; border-radius: 6px;">
                      સ્લાઇડ #${sec.slideNumber}
                    </span>
                    <strong style="color: #ffffff; font-size: 1.05rem;">${sec.title}</strong>
                  </div>

                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="sec-word-count badge" style="background: rgba(56,189,248,0.12); color: #38bdf8; font-size: 0.74rem; font-weight: 700;">
                      ${secWords} શબ્દો
                    </span>
                    <span style="font-size: 0.76rem; color: #94a3b8; font-weight: 700;">
                      ⏱️ ${sec.timing || '0:00 - 1:00'}
                    </span>
                    <button class="btn btn-outline btn-xs btn-copy-sec" data-idx="${idx}" style="color: #38bdf8; border-color: rgba(56,189,248,0.35); font-size: 0.74rem;" title="આ સ્લાઇડનું લખાણ કોપી કરો">
                      📋 કોપી
                    </button>
                  </div>
                </div>

                <!-- Slide Reference Facts (Context Box) -->
                ${slideBullets.length > 0 ? `
                  <div style="margin-bottom: 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px 14px;">
                    <span style="font-size: 0.74rem; font-weight: 800; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">
                      📌 સ્લાઇડ સંદર્ભ અને મુખ્ય મુદ્દાઓ (Slide Key Facts):
                    </span>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      ${slideBullets.map(b => `
                        <div style="font-size: 0.8rem; color: #cbd5e1; display: flex; align-items: flex-start; gap: 6px;">
                          <span style="color: #fbbf24;">•</span>
                          <span>${b}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}

                <!-- Editable Narration Textarea -->
                <div>
                  <label style="display: block; font-size: 0.78rem; font-weight: 800; color: #38bdf8; margin-bottom: 6px;">
                    🎙️ બોલવાનું નરેશન લખાણ (Spoken Script Text):
                  </label>
                  <textarea class="form-textarea font-gu sec-script-textarea" data-idx="${idx}" rows="4" style="width: 100%; font-size: 0.94rem; line-height: 1.65; color: #ffffff; background: #07090e; border: 1.5px solid rgba(255,255,255,0.12); padding: 12px 14px; border-radius: 8px; box-sizing: border-box; resize: vertical;">${sec.scriptText || ''}</textarea>
                </div>

              </div>
            `;
          }).join('')}
        </div>

        <!-- Bottom Floating Save Bar -->
        <div class="card" style="position: sticky; bottom: 16px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(8px); border: 1.5px solid #10b981; border-radius: 12px; padding: 14px 22px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); z-index: 99;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #34d399; font-size: 1.2rem;">✓</span>
            <span style="color: #ffffff; font-size: 0.88rem; font-weight: 700;">
              બધા ફેરફારો આપોઆપ સુરક્ષિત રીતે પ્રોજેક્ટમાં સાચવાઈ રહ્યા છે.
            </span>
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button id="btn-save-bottom" class="btn btn-success" style="font-weight: 900; background: #10b981; border: none; padding: 9px 22px;">
              💾 ${isSaving ? 'સાચવી રહ્યું છે...' : 'Database માં સાચવો'}
            </button>
            <button id="btn-next-to-voice-bottom" class="btn btn-primary" style="font-weight: 900; background: linear-gradient(135deg, #ec4899, #db2777); border: none; padding: 9px 22px;">
              ૮. Voice & Audio માં જાઓ ➔
            </button>
          </div>
        </div>
      `}

      <!-- ======================================================================= -->
      <!-- SCRIPT VERSION HISTORY MODAL                                            -->
      <!-- ======================================================================= -->
      ${showVersionHistoryModal ? `
        <div id="modal-version-history" style="position: fixed; inset: 0; background: rgba(2, 6, 23, 0.94); backdrop-filter: blur(8px); z-index: 100000; display: flex; align-items: center; justify-content: center; padding: 20px;">
          <div class="card" style="width: 100%; max-width: 800px; max-height: 85vh; display: flex; flex-direction: column; background: #0f172a; border: 2px solid #38bdf8; border-radius: 14px; padding: 22px; box-shadow: 0 10px 40px rgba(0,0,0,0.85);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.5rem;">📜</span>
                <div>
                  <h3 style="margin: 0; font-size: 1.2rem; font-weight: 900; color: #fff;">Script Version History (સાચવેલા વર્ઝન)</h3>
                  <div style="font-size: 0.76rem; color: #38bdf8;">પ્રોજેક્ટ: <strong>${project.name}</strong> • Database માં સાચવેલી તમામ સ્ક્રિપ્ટ્સની સુરક્ષિત હિસ્ટ્રી</div>
                </div>
              </div>
              <button id="btn-close-version-history-x" class="btn btn-outline btn-sm" style="color: #94a3b8; border-color: rgba(255,255,255,0.2);">✕</button>
            </div>

            <!-- Current Active Version Summary -->
            <div style="background: rgba(16, 185, 129, 0.15); border: 1.5px solid #10b981; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div>
                <strong style="color: #34d399; font-size: 0.92rem;">હાલમાં સક્રિય સ્ક્રિપ્ટ (Current Active: Version ${project.script?.version || 1})</strong>
                <div style="font-size: 0.74rem; color: #cbd5e1; margin-top: 2px;">
                  ID: <code style="color: #38bdf8;">${project.script?.scriptId || 'DB-Active'}</code> • ${calculateTotals().words} શબ્દો • સાચવ્યા સમય: ${project.script?.savedAt ? new Date(project.script.savedAt).toLocaleString('gu-IN') : 'હમણાં'}
                </div>
              </div>
              <span class="badge" style="background: #10b981; color: #fff; font-weight: 800;">✓ Active</span>
            </div>

            <!-- Past Versions List -->
            <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; padding-right: 6px;">
              ${(!project.script?.versions || project.script.versions.length === 0) ? `
                <div style="text-align: center; padding: 30px; color: #94a3b8; font-size: 0.9rem;">
                  કોઈ અગાઉના વર્ઝન નથી. હાલની સ્ક્રિપ્ટ જ પ્રથમ વર્ઝન (v1) છે.
                </div>
              ` : project.script.versions.map((ver, vIdx) => `
                <div style="background: rgba(30, 41, 59, 0.65); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                  <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <strong style="color: #fff; font-size: 0.9rem;">Version ${ver.versionNumber || (project.script.versions.length - vIdx)}</strong>
                      <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-size: 0.68rem; font-weight: 800;">
                        ${ver.wordCount || 0} શબ્દો
                      </span>
                      <span style="font-size: 0.72rem; color: #94a3b8;">
                        ${ver.savedAt ? new Date(ver.savedAt).toLocaleString('gu-IN') : ''}
                      </span>
                    </div>
                    <div style="font-size: 0.76rem; color: #cbd5e1; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 500px;">
                      ${(ver.rawText || ver.fullText || '').slice(0, 100)}...
                    </div>
                  </div>
                  <button class="btn btn-outline btn-xs btn-restore-version" data-script-id="${ver.scriptId}" style="color: #10b981; border-color: #10b981; font-weight: 800; padding: 6px 14px;">
                    🔄 આ Version Restore કરો
                  </button>
                </div>
              `).join('')}
            </div>

            <!-- Modal Footer -->
            <div style="padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: flex-end;">
              <button id="btn-close-version-history" class="btn btn-secondary btn-sm" style="font-weight: 800;">બંધ કરો</button>
            </div>
          </div>
        </div>
      ` : ''}
    `;

    attachEvents();
  }

  function attachEvents() {
    // Save actions
    container.querySelector('#btn-save-script-action')?.addEventListener('click', () => saveScript(true));
    container.querySelector('#btn-save-bottom')?.addEventListener('click', () => saveScript(true));

    // Version History Modal toggles
    container.querySelector('#btn-open-version-history-top')?.addEventListener('click', () => {
      showVersionHistoryModal = true;
      render();
    });
    container.querySelector('#btn-close-version-history-x')?.addEventListener('click', () => {
      showVersionHistoryModal = false;
      render();
    });
    container.querySelector('#btn-close-version-history')?.addEventListener('click', () => {
      showVersionHistoryModal = false;
      render();
    });

    // Version Restore action
    container.querySelectorAll('.btn-restore-version').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sId = btn.getAttribute('data-script-id');
        if (sId) {
          const conf = confirm('શું તમે આ અગાઉની સ્ક્રિપ્ટ Restore કરવા માંગો છો? હાલની સ્ક્રિપ્ટ પણ Version History માં સચવાયેલી રહેશે.');
          if (conf) {
            await restoreScriptVersionFromDb(project.id, sId);
            showVersionHistoryModal = false;
            render();
          }
        }
      });
    });

    // Navigations
    container.querySelector('#btn-goto-script-prompt-top')?.addEventListener('click', () => navigateTo('script'));
    container.querySelector('#btn-goto-script-prompt-action')?.addEventListener('click', () => navigateTo('script'));
    container.querySelector('#btn-next-to-voice-action')?.addEventListener('click', () => {
      saveScript(false);
      navigateTo('voice');
    });
    container.querySelector('#btn-next-to-voice-bottom')?.addEventListener('click', () => {
      saveScript(false);
      navigateTo('voice');
    });
    container.querySelector('#btn-goto-exact-audio')?.addEventListener('click', () => {
      saveScript(false);
      localStorage.setItem('sv_initial_mode', 'cloned');
      navigateTo('voice');
    });

    container.querySelector('#btn-next-to-thumbnail')?.addEventListener('click', () => {
      saveScript(false);
      navigateTo('thumbnail');
    });

    // Quick direct paste inside Script Editor
    container.querySelector('#btn-submit-quick-paste')?.addEventListener('click', () => {
      const text = container.querySelector('#textarea-quick-paste')?.value || '';
      handleDirectImport(text);
    });

    // Copy full script
    container.querySelector('#btn-copy-all-script')?.addEventListener('click', () => {
      const fullText = sections.map(sec => `[સ્લાઇડ #${sec.slideNumber}: ${sec.title}]\n${sec.scriptText}`).join('\n\n');
      if (fullText) {
        copyToClipboard(fullText);
        showNoticeToast('✓ સંપૂર્ણ સ્ક્રિપ્ટ ક્લિપબોર્ડમાં કોપી થઈ ગઈ!', 'success');
      }
    });

    // Copy single section
    container.querySelectorAll('.btn-copy-sec').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const sec = sections[idx];
        if (sec && sec.scriptText) {
          copyToClipboard(sec.scriptText);
          showNoticeToast(`✓ સ્લાઇડ #${sec.slideNumber} નું લખાણ કોપી થઈ ગયું!`, 'success');
        }
      });
    });

    // Live textarea editing with autosave
    container.querySelectorAll('.sec-script-textarea').forEach(textarea => {
      textarea.addEventListener('input', () => {
        const idx = parseInt(textarea.getAttribute('data-idx'), 10);
        if (sections[idx]) {
          sections[idx].scriptText = textarea.value;
          
          // Update card word count badge
          const card = textarea.closest('.script-section-card');
          if (card) {
            const countBadge = card.querySelector('.sec-word-count');
            const words = textarea.value.trim().split(/\s+/).filter(Boolean).length;
            if (countBadge) countBadge.textContent = `${words} શબ્દો`;
          }

          // Update header totals
          const totals = calculateTotals();
          const wordsEl = container.querySelector('#live-total-words');
          const durEl = container.querySelector('#live-total-duration');
          if (wordsEl) wordsEl.textContent = `${totals.words} શબ્દો`;
          if (durEl) durEl.textContent = `~${totals.minutes} મિનિટ (${totals.formattedTime})`;

          // Autosave to projectState & Database without spamming toasts
          hasUnsavedChanges = true;
          if (autoSaveTimer) clearTimeout(autoSaveTimer);
          autoSaveTimer = setTimeout(() => {
            saveScript(false);
          }, 2000);
        }
      });
    });
  }

  // Initial render
  render();
}
