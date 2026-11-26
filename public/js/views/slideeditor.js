/**
 * Project-Centric Presentation Manager & In-App Viewer (Stage 3: Slides)
 * Gyan Yatra AI Studio — NotebookLM 2 Imported PPT/PDF Only
 * 
 * Strict Clean UI Rules:
 * 1. Zero old editable slide cards, zero title/subtitle/bullet inputs, zero old live preview panel.
 * 2. Clean Import Interface: Import PPT / PPTX / PDF.
 * 3. Project File Storage: Displays files imported into the currently active project (filename, type, size, upload date, open, download, delete).
 * 4. In-App Presentation Viewer: Opens the original presentation inside the current workspace without new tabs.
 * 5. Persistent Storage: Associated with project ID, preserved across browser refreshes and project switches.
 * 6. Empty State: Displays only "હજુ કોઈ PPT અથવા PDF અપલોડ કરવામાં આવી નથી." and import buttons.
 */

import { projectState, isContentMatchingTopic } from '../utils/projectState.js';
import { showNoticeToast } from '../utils/clipboard.js';
import { api } from '../api.js';
import { formatIndianDateTimeDisplay } from '../utils/dateTimeIntelligence.js';
import { saveScriptToDatabase } from '../utils/scriptDbSync.js';
import {
  saveProjectPresentation,
  getProjectPresentationList,
  deleteProjectPresentation,
  dataUrlToBlob,
  getPresentationViewUrl
} from '../utils/presentationStorage.js';

export async function renderSlideEditor(container, navigateTo) {
  // Always load the CURRENT active project
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

  // Ensure project slide state structure exists
  if (!project.slide) project.slide = {};
  if (!Array.isArray(project.slide.slides)) project.slide.slides = [];

  // Fetch all presentations stored persistently for THIS active project ID
  let projectFiles = await getProjectPresentationList(project.id);

  // If persistent store is empty but project state had an importedPresentation, sync it
  if (projectFiles.length === 0 && project.slide.importedPresentation && project.slide.importedPresentation.filename) {
    projectFiles = [{
      id: project.slide.importedPresentation.id || `pres_${project.id}_saved`,
      projectId: project.id,
      filename: project.slide.importedPresentation.filename,
      fileType: project.slide.importedPresentation.fileType || 'pptx',
      fileUrl: project.slide.importedPresentation.fileUrl || '',
      size: project.slide.importedPresentation.size || 0,
      sizeFormatted: project.slide.importedPresentation.sizeFormatted || '',
      uploadedAt: project.slide.importedPresentation.uploadedAt || new Date().toISOString(),
      slidesCount: project.slide.slides?.length || project.slide.importedPresentation.slideCount || 0,
      slides: project.slide.slides || []
    }];
  }

  // Keep presentation metadata in sync
  if (projectFiles.length > 0) {
    const primary = projectFiles[0];
    project.slide.importedPresentation = {
      id: primary.id,
      projectId: project.id,
      filename: primary.filename,
      fileType: primary.fileType,
      fileUrl: primary.fileUrl || '',
      sizeFormatted: primary.sizeFormatted,
      uploadedAt: primary.uploadedAt,
      slideCount: primary.slidesCount || primary.slides?.length || 0
    };
    project.slide.customName = primary.filename;
    if (Array.isArray(primary.slides) && primary.slides.length > 0) {
      project.slide.slides = primary.slides;
    }
    project.slide.isCompleted = (project.slide.slides && project.slide.slides.length > 0);
  }

  // State for in-app viewer
  let isUploading = false;
  let isViewerOpen = false;
  let activeViewingFile = null;
  let activeViewerSlideIdx = 0;
  let activeViewerMode = 'presentation'; // 'presentation' (16:9 slides) or 'rawpdf' (native iframe)
  let viewerZoom = 1.0;
  let isViewerFullscreen = false;

  async function refreshProjectFiles() {
    projectFiles = await getProjectPresentationList(project.id);
    if (projectFiles.length > 0) {
      const primary = projectFiles[0];
      project.slide.importedPresentation = {
        id: primary.id,
        projectId: project.id,
        filename: primary.filename,
        fileType: primary.fileType,
        fileUrl: primary.fileUrl || '',
        sizeFormatted: primary.sizeFormatted,
        uploadedAt: primary.uploadedAt,
        slideCount: primary.slidesCount || primary.slides?.length || 0
      };
      project.slide.customName = primary.filename;
      if (Array.isArray(primary.slides) && primary.slides.length > 0) {
        project.slide.slides = primary.slides;
      }
      project.slide.isCompleted = (project.slide.slides && project.slide.slides.length > 0);
    }
    projectState.updateTool('slide', {
      slides: project.slide.slides,
      importedPresentation: project.slide.importedPresentation,
      slideCount: `${project.slide?.slides?.length || 0} સ્લાઇડ્સ`,
      isCompleted: (project.slide?.slides && project.slide.slides.length > 0)
    });
  }

  async function handleFileUpload(file) {
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pptx', 'ppt', 'pdf'].includes(ext)) {
      alert('કૃપા કરીને માત્ર NotebookLM 2 ની .pptx, .ppt અથવા .pdf ફાઇલ પસંદ કરો.');
      return;
    }

    isUploading = true;
    render();

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target.result;
          
          // Call backend parser to persist file and extract all slides/pages
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

            // Save original file + extracted slides into persistent IndexedDB per project
            await saveProjectPresentation(project.id, fileRecord);

            project.slide = project.slide || {};
            project.slide.slides = res.slides;
            project.slide.importedPresentation = { ...fileRecord, dataUrl: '' };
            projectState.updateTool('slide', project.slide);

            // Automatically prepare 1:1 slide script sections if script is empty or missing
            if (!project.script?.sections || project.script.sections.length === 0 || !project.script?.rawText) {
              const newSections = res.slides.map((s, idx) => ({
                slideId: s.slideId || `slide_${project.id}_${idx + 1}`,
                slideNumber: idx + 1,
                sectionName: s.title || `સ્લાઇડ #${idx + 1}`,
                title: s.title || `સ્લાઇડ #${idx + 1}`,
                subtitle: s.subtitle || '',
                scriptText: s.scriptText || s.content || (s.bulletPoints && s.bulletPoints.length > 0 ? s.bulletPoints.join('. ') : `${s.title || 'સ્લાઇડ #' + (idx + 1)} ની સંપૂર્ણ સમજૂતી.`)
              }));
              const fullText = newSections.map(sec => `[સ્લાઇડ #${sec.slideNumber}: ${sec.sectionName}]\n${sec.scriptText}`).join('\n\n');
              project.script = project.script || {};
              project.script.sections = newSections;
              project.script.rawText = fullText;
              project.script.fullText = fullText;
              project.script.savedInDb = true;
              projectState.updateTool('script', project.script);
              await saveScriptToDatabase(project.id, {
                rawText: fullText,
                fullText: fullText,
                sections: newSections,
                source: 'PDF_Extract'
              }, { notify: false, showToast: false }).catch(() => {});
            }

            // Reset old voice recordings and old exported video for clean new presentation
            project.voice = {};
            projectState.updateTool('voice', {});
            if (project.editing) {
              project.editing.lastExportedVideoUrl = null;
              project.editing.lastExportedFilename = null;
              project.editing.savedVideo = null;
              projectState.updateTool('editing', project.editing);
            }

            // Update project-scoped state & version history
            await refreshProjectFiles();
            projectState.saveVersionSnapshot(project.id, 'slides', `Imported ${file.name} (${res.slides.length} slides)`);
            projectState.addProjectUpload({
              type: 'slide',
              name: file.name,
              size: Math.round(file.size / 1024),
              slideCount: res.slides.length,
              slides: res.slides
            });

            isUploading = false;
            render();
            showNoticeToast(`🎉 "${file.name}" (${res.slides.length} સ્લાઇડ્સ) પ્રોજેક્ટમાં સુરક્ષિત રીતે સેવ થઈ ગઈ! ✓`, 'success');
          } else {
            isUploading = false;
            render();
            alert('પ્રેઝન્ટેશન ફાઇલમાંથી સ્લાઇડ્સ વાંચી શકાઈ નથી. કૃપા કરીને માન્ય NotebookLM PPTX અથવા PDF ફાઇલ પસંદ કરો.');
          }
        } catch (parseErr) {
          console.error('[Slide Import Error]:', parseErr);
          alert('ફાઇલ ઈમ્પોર્ટ કરવામાં ક્ષતિ: ' + (parseErr.message || parseErr));
          isUploading = false;
          render();
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      alert('ફાઇલ વાંચવામાં ભૂલ: ' + err.message);
      isUploading = false;
      render();
    }
  }

  function downloadFile(fileRecord) {
    if (!fileRecord) return;
    const filename = fileRecord.filename || 'presentation.pptx';
    const isPdf = (fileRecord.fileType === 'pdf') || filename.toLowerCase().endsWith('.pdf');
    const mime = isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    if (fileRecord.fileUrl) {
      const a = document.createElement('a');
      a.href = fileRecord.fileUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showNoticeToast(`📥 "${filename}" ડાઉનલોડ થઈ રહી છે! ✓`, 'success');
      return;
    }

    if (fileRecord.dataUrl) {
      const blob = dataUrlToBlob(fileRecord.dataUrl, mime);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        showNoticeToast(`📥 "${filename}" ડાઉનલોડ થઈ રહી છે! ✓`, 'success');
        return;
      }
    }

    alert('મૂળ ફાઇલ ડેટા ઉપલબ્ધ નથી.');
  }

  function openFileInAppViewer(fileRecord) {
    activeViewingFile = fileRecord;
    activeViewerSlideIdx = 0;
    activeViewerMode = 'presentation';
    viewerZoom = 1.0;
    isViewerFullscreen = false;
    isViewerOpen = true;
    render();
  }

  function closeInAppViewer() {
    isViewerOpen = false;
    activeViewingFile = null;
    isViewerFullscreen = false;
    render();
  }

  function render() {
    const hasFiles = projectFiles.length > 0;
    const primaryFile = hasFiles ? projectFiles[0] : null;

    container.innerHTML = `
      <!-- TOP PROJECT HEADER TOOLBAR -->
      <div class="card" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid #38bdf8; border-radius: var(--radius-lg); padding: 16px 22px; margin-bottom: 22px; box-shadow: 0 8px 30px rgba(56, 189, 248, 0.25);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; border: 1px solid rgba(56, 189, 248, 0.35);">
              📊
            </div>
            <div>
              <h2 style="font-size: 1.35rem; font-weight: 900; color: #ffffff; margin: 0 0 2px 0; display: flex; align-items: center; gap: 8px;">
                <span>૩. સ્લાઇડ્સ & પ્રેઝન્ટેશન ફાઇલો (Slides)</span>
                <span class="badge" style="background: ${hasFiles ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}; color: ${hasFiles ? '#34d399' : '#fbbf24'}; border: 1px solid ${hasFiles ? '#10b981' : '#f59e0b'}; font-size: 0.74rem; font-weight: 800; padding: 3px 8px;">
                  ${hasFiles ? `✓ ${projectFiles.length} ફાઇલ ઉપલબ્ધ` : '⚪ કોઈ ફાઇલ નથી'}
                </span>
              </h2>
              <p style="color: #cbd5e1; font-size: 0.82rem; margin: 0;">
                📁 પ્રોજેક્ટ: <strong>${project.name}</strong> • NotebookLM 2 PPT / PPTX / PDF ફાઇલ મેનેજર અને ઇન-ઍપ વ્યૂઅર.
              </p>
            </div>
          </div>

          <!-- Top Actions -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            ${hasFiles ? `
              <button id="btn-top-upload-new" class="btn btn-primary btn-sm" style="font-weight: 800; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; padding: 8px 18px; display: inline-flex; align-items: center; gap: 6px;">
                <span>➕</span> નવી PPT / PDF ઉમેરો
              </button>
              <button id="btn-top-goto-script" class="btn btn-outline btn-sm" style="font-weight: 800; border-color: rgba(56, 189, 248, 0.4); color: #38bdf8; padding: 8px 16px;">
                ૪. Script રાઇટર ➔
              </button>
            ` : `
              <button id="btn-goto-slideprompt" class="btn btn-outline btn-sm" style="font-weight: 800; border-color: #8b5cf6; color: #c4b5fd;">
                ← ૨. NotebookLM પ્રોમ્પ્ટ લો
              </button>
            `}
          </div>

        </div>
      </div>

      <!-- HIDDEN FILE INPUTS FOR PPTX & PDF -->
      <input type="file" id="input-import-pptx" accept=".pptx,.ppt" style="display: none;">
      <input type="file" id="input-import-pdf" accept=".pdf,application/pdf" style="display: none;">

      ${isUploading ? `
        <!-- Uploading / Processing State -->
        <div class="card" style="padding: 60px 20px; text-align: center; background: rgba(15, 23, 42, 0.85); border: 1.5px solid #38bdf8; border-radius: 14px; margin-bottom: 24px;">
          <div style="font-size: 2.8rem; animation: pulse 1.5s infinite;">⏳</div>
          <h3 style="font-size: 1.3rem; font-weight: 800; color: #fff; margin: 14px 0 6px 0;">
            પ્રેઝન્ટેશન ફાઇલ પ્રોજેક્ટમાં સેવ થઈ રહી છે...
          </h3>
          <p style="color: #94a3b8; font-size: 0.88rem; margin: 0;">
            ફાઇલમાંથી તમામ સ્લાઇડ્સ અને દસ્તાવેજ વિગતો પ્રોજેક્ટમાં સાચવવામાં આવી રહી છે. કૃપા કરીને થોડી ક્ષણ રાહ જુઓ.
          </p>
        </div>
      ` : !hasFiles ? `
        <!-- ========================================================================= -->
        <!-- CLEAN EMPTY STATE (NO PREBUILT SLIDES, CLEAN IMPORT INTERFACE ONLY)      -->
        <!-- ========================================================================= -->
        <div class="card" style="padding: 56px 24px; text-align: center; background: rgba(15, 23, 42, 0.85); border: 2px dashed rgba(56, 189, 248, 0.4); border-radius: 16px; margin-bottom: 24px; box-shadow: 0 10px 35px rgba(0,0,0,0.4);">
          
          <div style="width: 76px; height: 76px; margin: 0 auto 16px auto; border-radius: 20px; background: rgba(56, 189, 248, 0.12); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; border: 1px solid rgba(56, 189, 248, 0.3);">
            📑
          </div>

          <h3 style="font-size: 1.5rem; font-weight: 900; color: #ffffff; margin: 0 0 10px 0;">
            હજુ કોઈ PPT અથવા PDF અપલોડ કરવામાં આવી નથી.
          </h3>
          <p style="color: #94a3b8; font-size: 0.95rem; max-width: 580px; margin: 0 auto 28px auto; line-height: 1.6;">
            તમારા કમ્પ્યુટરમાંથી Google NotebookLM 2 માં બનાવેલી <strong>અસલી PPT, PPTX અથવા PDF</strong> ફાઇલ અહીં ઈમ્પોર્ટ કરો.<br>
            ફાઇલ સીધી તમારા આ પ્રોજેક્ટના સુરક્ષિત સ્ટોરેજમાં સેવ થશે.
          </p>

          <!-- Clean Import Buttons -->
          <div style="display: flex; justify-content: center; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 28px;">
            <button id="btn-trigger-import-pptx" class="btn btn-primary" style="font-weight: 900; font-size: 1rem; padding: 14px 30px; border-radius: 10px; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; box-shadow: 0 4px 18px rgba(2, 132, 199, 0.45); display: inline-flex; align-items: center; gap: 10px; cursor: pointer;">
              <span style="font-size: 1.2rem;">📊</span> Import PPT / PPTX
            </button>
            <button id="btn-trigger-import-pdf" class="btn btn-primary" style="font-weight: 900; font-size: 1rem; padding: 14px 30px; border-radius: 10px; background: linear-gradient(135deg, #10b981, #059669); border: none; box-shadow: 0 4px 18px rgba(16, 185, 129, 0.45); display: inline-flex; align-items: center; gap: 10px; cursor: pointer;">
              <span style="font-size: 1.2rem;">📄</span> Import PDF
            </button>
          </div>

          <!-- Step-by-Step Guidance -->
          <div style="display: inline-flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 30px; padding: 8px 22px; font-size: 0.82rem; color: #cbd5e1; flex-wrap: wrap; justify-content: center;">
            <span>૧. સ્લાઇડ પ્રોમ્પ્ટ લો</span> ➔ 
            <span>૨. NotebookLM માંથી PPT/PDF ડાઉનલોડ કરો</span> ➔ 
            <span>૩. અહીં અપલોડ કરો & ઇન-ઍપ જુઓ</span>
          </div>

        </div>
      ` : `
        <!-- ========================================================================= -->
        <!-- CLEAN IMPORTED PROJECT FILES INTERFACE (NO OLD SLIDE EDITOR UI)           -->
        <!-- ========================================================================= -->
        
        <!-- Upload Strip Card -->
        <div class="card" style="margin-bottom: 24px; padding: 18px 24px; background: rgba(15, 23, 42, 0.7); border: 1.5px dashed rgba(56, 189, 248, 0.35); border-radius: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <div>
            <strong style="color: #ffffff; font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
              <span>📥</span> નવી પ્રેઝન્ટેશન ફાઇલ ઈમ્પોર્ટ કરો (Import More)
            </strong>
            <p style="color: #94a3b8; font-size: 0.8rem; margin: 3px 0 0 0;">
              આ પ્રોજેક્ટમાં અન્ય નવી NotebookLM 2 PPT, PPTX અથવા PDF ફાઇલ અપલોડ કરો.
            </p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button id="btn-quick-import-pptx" class="btn btn-primary btn-sm" style="font-weight: 800; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; padding: 8px 18px; display: inline-flex; align-items: center; gap: 6px;">
              <span>📊</span> Import PPTX
            </button>
            <button id="btn-quick-import-pdf" class="btn btn-primary btn-sm" style="font-weight: 800; background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 8px 18px; display: inline-flex; align-items: center; gap: 6px;">
              <span>📄</span> Import PDF
            </button>
          </div>
        </div>

        <!-- Section Heading: Imported Project Files -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          <h3 style="font-size: 1.15rem; font-weight: 900; color: #ffffff; margin: 0; display: flex; align-items: center; gap: 8px;">
            <span>📁</span> આ પ્રોજેક્ટમાં સાચવેલી ફાઇલો (Imported Project Files)
            <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-size: 0.75rem; font-weight: 800;">
              ${projectFiles.length} ફાઇલ
            </span>
          </h3>
        </div>

        <!-- Files List Table / Cards -->
        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px;">
          ${projectFiles.map((file, idx) => {
            const isPdf = file.fileType === 'pdf' || file.filename.toLowerCase().endsWith('.pdf');
            const fileTypeBadge = isPdf ? 'PDF' : (file.fileType || 'PPTX').toUpperCase();
            const slidesCount = file.slidesCount || file.slides?.length || 0;

            return `
              <div class="card project-file-item" style="padding: 18px 22px; background: rgba(15, 23, 42, 0.85); border: 1.5px solid ${idx === 0 ? '#10b981' : 'rgba(255,255,255,0.1)'}; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; box-shadow: 0 4px 18px rgba(0,0,0,0.3); transition: all 0.2s ease;">
                
                <!-- File Details -->
                <div style="display: flex; align-items: center; gap: 14px; min-width: 280px; flex: 1;">
                  <div style="width: 50px; height: 50px; border-radius: 12px; background: ${isPdf ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)'}; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; border: 1px solid ${isPdf ? 'rgba(239, 68, 68, 0.3)' : 'rgba(56, 189, 248, 0.3)'};">
                    ${isPdf ? '📄' : '📊'}
                  </div>

                  <div>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
                      <strong style="color: #ffffff; font-size: 1.05rem; cursor: pointer;" class="btn-open-preview" data-idx="${idx}" title="ઇન-ઍપ વ્યૂઅરમાં ખોલવા ક્લિક કરો">
                        ${file.filename}
                      </strong>
                      <span class="badge" style="background: ${isPdf ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)'}; color: ${isPdf ? '#f87171' : '#38bdf8'}; font-weight: 800; font-size: 0.72rem;">
                        ${fileTypeBadge}
                      </span>
                      <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-weight: 800; font-size: 0.72rem;">
                        ${slidesCount} સ્લાઇડ્સ / પાના
                      </span>
                      ${idx === 0 ? `
                        <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; font-size: 0.7rem; font-weight: 800;">
                          ● મુખ્ય સક્રિય ફાઇલ
                        </span>
                      ` : ''}
                    </div>

                    <div style="font-size: 0.78rem; color: #94a3b8; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                      <span>કદ: <strong style="color: #cbd5e1;">${file.sizeFormatted || `${Math.round((file.size || 0)/1024)} KB`}</strong></span>
                      <span>•</span>
                      <span>ઈમ્પોર્ટ સમય: <strong style="color: #cbd5e1;">${formatIndianDateTimeDisplay(file.uploadedAt)}</strong></span>
                      <span>•</span>
                      <span style="color: #10b981; font-weight: 700;">✓ પ્રોજેક્ટ સ્ટોરેજમાં સેવ થયેલ</span>
                    </div>
                  </div>
                </div>

                <!-- Clean Actions -->
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <button class="btn btn-primary btn-sm btn-open-preview" data-idx="${idx}" style="font-weight: 800; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; padding: 8px 18px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);" title="આ દસ્તાવેજ વર્કસ્પેસમાં ખોલો">
                    <span>👁️</span> ઓપન / પ્રિવ્યૂ
                  </button>
                  <button class="btn btn-outline btn-sm btn-download-file" data-idx="${idx}" style="font-weight: 800; border-color: #10b981; color: #34d399; padding: 8px 16px; display: inline-flex; align-items: center; gap: 6px;" title="મૂળ દસ્તાવેજ ડાઉનલોડ કરો">
                    <span>📥</span> ડાઉનલોડ
                  </button>
                  <button class="btn btn-outline btn-sm btn-delete-file" data-idx="${idx}" style="font-weight: 700; border-color: rgba(248,113,113,0.35); color: #f87171; padding: 8px 14px;" title="પ્રોજેક્ટમાંથી ફાઇલ કાઢી નાખો">
                    🗑️ કાઢી નાખો
                  </button>
                </div>

              </div>
            `;
          }).join('')}
        </div>
      `}

      <!-- ========================================================================= -->
      <!-- IN-APP WORKSPACE PRESENTATION VIEWER MODAL (INSIDE CURRENT WORKSPACE)    -->
      <!-- ========================================================================= -->
      ${isViewerOpen && activeViewingFile ? `
        <div id="modal-doc-viewer" style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.94); backdrop-filter: blur(10px); z-index: 99999; display: flex; align-items: center; justify-content: center; padding: ${isViewerFullscreen ? '0' : '14px'};">
          <div style="background: #0f172a; border: ${isViewerFullscreen ? 'none' : '2px solid #38bdf8'}; border-radius: ${isViewerFullscreen ? '0' : '16px'}; width: 100%; max-width: ${isViewerFullscreen ? '100vw' : '1400px'}; height: ${isViewerFullscreen ? '100vh' : '92vh'}; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 70px rgba(0,0,0,0.95);">
            
            <!-- Modal Header -->
            <div style="padding: 12px 20px; background: rgba(15, 23, 42, 0.98); border-bottom: 1.5px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; z-index: 10;">
              
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.8rem;">${(activeViewingFile.fileType === 'pdf' || activeViewingFile.filename.toLowerCase().endsWith('.pdf')) ? '📄' : '📊'}</span>
                <div>
                  <h3 style="margin: 0; font-size: 1.15rem; color: #fff; font-weight: 900; display: flex; align-items: center; gap: 8px;">
                    <span>${activeViewingFile.filename}</span>
                    <span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-size: 0.74rem; font-weight: 800;">
                      ${(activeViewingFile.fileType === 'pdf' || activeViewingFile.filename.toLowerCase().endsWith('.pdf')) ? 'PDF દસ્તાવેજ' : 'NotebookLM 2 PPTX'}
                    </span>
                  </h3>
                  <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 2px;">
                    ${activeViewingFile.sizeFormatted || ''} • કુલ <strong>${activeViewingFile.slides?.length || activeViewingFile.slidesCount || 0} સ્લાઇડ્સ / પાના</strong>
                    • વર્તમાન: <strong style="color: #38bdf8;">સ્લાઇડ #${activeViewerSlideIdx + 1} / ${activeViewingFile.slides?.length || 1}</strong>
                  </div>
                </div>
              </div>

              <!-- Header Action Controls -->
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                
                <!-- View Mode Switcher for PDF (16:9 Slides vs Native PDF Scan) -->
                ${(activeViewingFile.fileType === 'pdf' || activeViewingFile.filename.toLowerCase().endsWith('.pdf')) ? `
                  <div style="display: inline-flex; align-items: center; background: rgba(0,0,0,0.45); border: 1px solid rgba(56,189,248,0.3); border-radius: 8px; padding: 2px 4px; gap: 4px;">
                    <button id="modal-btn-view-slides" class="btn btn-xs ${activeViewerMode !== 'rawpdf' ? 'btn-primary' : 'btn-outline'}" style="font-weight: 800; font-size: 0.76rem; padding: 4px 10px; border: none; cursor: pointer;" title="૧૬:૯ સ્લાઇડ્સ અને પાનાં નેવિગેશન">
                      <span>📑</span> સ્લાઇડ્સ વ્યૂ (${activeViewingFile.slides?.length || 1})
                    </button>
                    <button id="modal-btn-view-rawpdf" class="btn btn-xs ${activeViewerMode === 'rawpdf' ? 'btn-primary' : 'btn-outline'}" style="font-weight: 800; font-size: 0.76rem; padding: 4px 10px; border: none; cursor: pointer;" title="મૂળ PDF ડોક્યુમેન્ટ વ્યૂ">
                      <span>📄</span> મૂળ PDF
                    </button>
                  </div>
                ` : ''}

                <!-- Zoom Controls (for 16:9 Presentation Canvas) -->
                ${activeViewerMode !== 'rawpdf' ? `
                  <div style="display: inline-flex; align-items: center; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 2px 6px;">
                    <button id="modal-btn-zoom-out" class="btn btn-outline btn-xs" style="border: none; color: #cbd5e1; font-weight: 900; font-size: 0.9rem;" title="ઝૂમ આઉટ (Zoom Out)">➖</button>
                    <span id="modal-zoom-display" style="font-size: 0.75rem; font-weight: 800; color: #38bdf8; padding: 0 6px;">${Math.round(viewerZoom * 100)}%</span>
                    <button id="modal-btn-zoom-in" class="btn btn-outline btn-xs" style="border: none; color: #cbd5e1; font-weight: 900; font-size: 0.9rem;" title="ઝૂમ ઇન (Zoom In)">➕</button>
                    <button id="modal-btn-zoom-reset" class="btn btn-outline btn-xs" style="border: none; color: #94a3b8; font-size: 0.7rem; margin-left: 2px;" title="૧૦૦% રિસેટ">100%</button>
                  </div>
                ` : ''}

                <!-- Fullscreen Presentation Mode -->
                <button id="modal-btn-fullscreen" class="btn btn-outline btn-sm" style="color: #38bdf8; border-color: rgba(56,189,248,0.4); font-weight: 800;" title="પૂર્ણ સ્ક્રીન પ્રદર્શન (Fullscreen)">
                  ${isViewerFullscreen ? '🗗 સામાન્ય' : '⛶ પૂર્ણ સ્ક્રીન'}
                </button>

                <!-- Download Original File -->
                <button id="modal-btn-download-active" class="btn btn-outline btn-sm" style="color: #34d399; border-color: #10b981; font-weight: 800;" title="મૂળ દસ્તાવેજ ડાઉનલોડ કરો">
                  📥 ડાઉનલોડ
                </button>

                <!-- Close Modal (Return to Slides Screen) -->
                <button id="modal-btn-close" class="btn btn-danger btn-sm" style="font-weight: 900; padding: 6px 16px; background: #ef4444; border: none; color: #fff;" title="વ્યૂઅર બંધ કરો અને સ્લાઇડ્સ પર પાછા જાઓ">
                  ✕ બંધ કરો
                </button>

              </div>
            </div>

            <!-- Modal Content Body -->
            <div style="flex: 1; display: flex; overflow: hidden; background: #07090e;">
              
              ${(activeViewerMode === 'rawpdf' && (activeViewingFile.fileType === 'pdf' || activeViewingFile.filename.toLowerCase().endsWith('.pdf'))) ? `
                <!-- PDF EMBEDDED VIEWER WITH MULTI-PAGE & NATIVE ZOOM -->
                <div style="flex: 1; height: 100%; display: flex; flex-direction: column; background: #1e293b;">
                  <iframe id="pdf-preview-iframe" src="${getPresentationViewUrl(activeViewingFile)}" style="width: 100%; height: 100%; border: none;"></iframe>
                </div>
              ` : `
                <!-- PPTX & PDF PRESENTATION INTERACTIVE 16:9 VIEWER (DYNAMIC SLIDE NAVIGATION) -->
                <!-- LEFT COLUMN: COMPLETE SLIDE LIST -->
                <div style="width: 280px; min-width: 250px; max-width: 320px; background: rgba(15, 23, 42, 0.95); border-right: 1.5px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; overflow: hidden;">
                  
                  <div style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between;">
                    <strong style="font-size: 0.88rem; color: #ffffff; display: flex; align-items: center; gap: 6px;">
                      <span>📑</span> સ્લાઇડ્સ યાદી (${activeViewingFile.slides?.length || 0})
                    </strong>
                    <span style="font-size: 0.72rem; color: #94a3b8;">ક્લિક ➔ સ્લાઇડ બદલો</span>
                  </div>
                  </div>

                  <div style="flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px;">
                    ${(activeViewingFile.slides || []).map((s, idx) => {
                      const isActive = idx === activeViewerSlideIdx;
                      return `
                        <div class="modal-slide-nav-item" data-idx="${idx}" style="padding: 10px 12px; border-radius: 8px; cursor: pointer; border: 1.5px solid ${isActive ? '#38bdf8' : 'rgba(255,255,255,0.08)'}; background: ${isActive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.03)'}; transition: all 0.15s ease;">
                          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                            <span class="badge" style="background: ${idx === 0 ? '#ef4444' : idx === 1 ? '#3b82f6' : '#10b981'}; color: #fff; font-size: 0.7rem; font-weight: 800; padding: 2px 6px;">
                              #${idx + 1}
                            </span>
                            <span style="font-size: 0.68rem; color: ${isActive ? '#38bdf8' : '#64748b'}; font-weight: 700;">
                              ${isActive ? '● સક્રિય' : ''}
                            </span>
                          </div>
                          <div style="font-size: 0.82rem; font-weight: 800; color: ${isActive ? '#ffffff' : '#cbd5e1'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.3;">
                            ${s.title || `સ્લાઇડ #${idx + 1}`}
                          </div>
                          <div style="font-size: 0.72rem; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;">
                            ${s.subtitle || (Array.isArray(s.bulletPoints) ? s.bulletPoints[0] : '') || 'વિગતવાર માહિતી'}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>

                </div>

                <!-- RIGHT COLUMN: 16:9 PRESENTATION CANVAS STAGE -->
                <div style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; background: radial-gradient(circle at center, #1e293b 0%, #07090e 100%);">
                  
                  <div style="width: 100%; max-width: 1020px; display: flex; flex-direction: column; gap: 14px;">
                    
                    <!-- Navigation Bar -->
                    <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 10px; padding: 10px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.4);">
                      <button id="modal-ppt-prev" class="btn btn-outline btn-sm" ${activeViewerSlideIdx === 0 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''} style="font-weight: 800; border-color: rgba(56,189,248,0.5); color: #38bdf8;">
                        ◀ પાછલી સ્લાઇડ (Previous)
                      </button>

                      <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 0.85rem; font-weight: 800; color: #fff;">
                          સ્લાઇડ #${activeViewerSlideIdx + 1} / ${activeViewingFile.slides?.length || 1}
                        </span>
                        <select id="modal-select-slide" class="form-select font-gu" style="width: auto; padding: 4px 10px; font-size: 0.8rem; background: #07090e; color: #38bdf8; border-color: rgba(56,189,248,0.4); border-radius: 6px;">
                          ${(activeViewingFile.slides || []).map((s, idx) => `
                            <option value="${idx}" ${idx === activeViewerSlideIdx ? 'selected' : ''}>
                              સ્લાઇડ #${idx + 1}: ${(s.title || 'સ્લાઇડ').slice(0, 25)}
                            </option>
                          `).join('')}
                        </select>
                      </div>

                      <button id="modal-ppt-next" class="btn btn-outline btn-sm" ${activeViewerSlideIdx >= (activeViewingFile.slides?.length || 1) - 1 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''} style="font-weight: 800; border-color: rgba(56,189,248,0.5); color: #38bdf8;">
                        આગલી સ્લાઇડ (Next) ▶
                      </button>
                    </div>

                    <!-- 16:9 Canvas (Zoom Responsive) -->
                    <div style="width: 100%; display: flex; justify-content: center; overflow: visible;">
                      <div id="modal-presentation-canvas" style="aspect-ratio: 16/9; width: 100%; max-width: 1000px; background: ${activeViewingFile.slides?.[activeViewerSlideIdx]?.bgColor || '#FFFFFF'}; border-radius: 12px; box-shadow: 0 15px 45px rgba(0,0,0,0.7); padding: 28px 36px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; color: #0f172a; font-family: 'Noto Sans Gujarati', system-ui, sans-serif; transform: scale(${viewerZoom}); transform-origin: top center; transition: transform 0.15s ease; border: 1px solid rgba(255,255,255,0.1);">
                        
                        <!-- Slide Title & Subtitle -->
                        <div style="margin-bottom: 12px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 10px;">
                          <div style="font-size: 1.35rem; font-weight: 900; color: #0f172a; line-height: 1.35; margin-bottom: 4px;">
                            ${activeViewingFile.slides?.[activeViewerSlideIdx]?.title || activeViewingFile.filename}
                          </div>
                          ${activeViewingFile.slides?.[activeViewerSlideIdx]?.subtitle ? `
                            <div style="font-size: 0.95rem; font-weight: 600; color: #475569;">
                              ${activeViewingFile.slides[activeViewerSlideIdx].subtitle}
                            </div>
                          ` : ''}
                        </div>

                        <!-- Content & Images -->
                        <div style="flex: 1; display: flex; gap: 20px; align-items: center; margin-bottom: 12px;">
                          
                          <!-- Bullets -->
                          <div style="flex: 1; display: flex; flex-direction: column; gap: 10px; justify-content: center;">
                            ${((Array.isArray(activeViewingFile.slides?.[activeViewerSlideIdx]?.bulletPoints)
                                ? activeViewingFile.slides[activeViewerSlideIdx].bulletPoints
                                : String(activeViewingFile.slides?.[activeViewerSlideIdx]?.bulletPoints || '').split('\n')
                              ).filter(Boolean)).map(b => `
                              <div style="display: flex; align-items: flex-start; gap: 10px; font-size: 0.95rem; font-weight: 600; color: #1e293b; line-height: 1.45;">
                                <span style="color: #2563eb; font-size: 1.15rem; line-height: 1;">●</span>
                                <span>${b.replace(/^[•\-\*0-9\.\)]+\s*/, '')}</span>
                              </div>
                            `).join('')}
                          </div>

                          <!-- Embedded Image -->
                          ${activeViewingFile.slides?.[activeViewerSlideIdx]?.imageUrl ? `
                            <div style="width: 45%; max-height: 320px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; padding: 6px;">
                              <img src="${activeViewingFile.slides[activeViewerSlideIdx].imageUrl}" alt="Slide Visual" style="max-width: 100%; max-height: 300px; object-fit: contain; border-radius: 6px;">
                            </div>
                          ` : ''}

                        </div>

                        <!-- Slide Bottom Bar -->
                        <div style="display: flex; align-items: center; justify-content: flex-end; border-top: 1.5px solid #f1f5f9; padding-top: 8px; font-size: 0.75rem; color: #64748b; font-weight: 700;">
                          <span>સ્લાઇડ #${activeViewerSlideIdx + 1} / ${activeViewingFile.slides?.length || 1}</span>
                        </div>

                      </div>
                    </div>

                    <!-- Keyboard Shortcut Hint -->
                    <div style="text-align: center; font-size: 0.76rem; color: #94a3b8; margin-top: 4px;">
                      💡 કીબોર્ડ શોર્ટકટ: <strong>◀ પાછલી સ્લાઇડ</strong> | <strong>આગલી સ્લાઇડ ▶</strong> | <strong>Esc: બંધ કરો</strong>
                    </div>

                  </div>

                </div>
              `}

            </div>

          </div>
        </div>
      ` : ''}
    `;

    attachEvents();
  }

  function attachEvents() {
    // Top actions
    container.querySelector('#btn-top-upload-new')?.addEventListener('click', () => {
      container.querySelector('#input-import-pptx')?.click();
    });
    container.querySelector('#btn-top-goto-script')?.addEventListener('click', () => {
      navigateTo('script');
    });
    container.querySelector('#btn-goto-slideprompt')?.addEventListener('click', () => {
      navigateTo('slideprompt');
    });

    // File input triggers
    container.querySelector('#btn-trigger-import-pptx')?.addEventListener('click', () => {
      container.querySelector('#input-import-pptx')?.click();
    });
    container.querySelector('#btn-trigger-import-pdf')?.addEventListener('click', () => {
      container.querySelector('#input-import-pdf')?.click();
    });
    container.querySelector('#btn-quick-import-pptx')?.addEventListener('click', () => {
      container.querySelector('#input-import-pptx')?.click();
    });
    container.querySelector('#btn-quick-import-pdf')?.addEventListener('click', () => {
      container.querySelector('#input-import-pdf')?.click();
    });

    // File inputs onchange
    container.querySelector('#input-import-pptx')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
    });
    container.querySelector('#input-import-pdf')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
    });

    // Open/Preview buttons on file items
    container.querySelectorAll('.btn-open-preview').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        if (projectFiles[idx]) {
          openFileInAppViewer(projectFiles[idx]);
        }
      });
    });

    // Download buttons on file items
    container.querySelectorAll('.btn-download-file').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        if (projectFiles[idx]) {
          downloadFile(projectFiles[idx]);
        }
      });
    });

    // Delete buttons on file items
    container.querySelectorAll('.btn-delete-file').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const file = projectFiles[idx];
        if (!file) return;

        if (confirm(`શું તમે ખરેખર "${file.filename}" આ પ્રોજેક્ટમાંથી કાઢી નાખવા માંગો છો?`)) {
          if (file.id) {
            await deleteProjectPresentation(file.id);
          }
          await refreshProjectFiles();
          render();
          showNoticeToast(`"${file.filename}" કાઢી નાખવામાં આવી.`, 'warning');
        }
      });
    });

    // Modal action listeners
    container.querySelector('#modal-btn-close')?.addEventListener('click', closeInAppViewer);
    container.querySelector('#modal-btn-download-active')?.addEventListener('click', () => {
      downloadFile(activeViewingFile);
    });

    // Fullscreen toggle
    container.querySelector('#modal-btn-fullscreen')?.addEventListener('click', () => {
      isViewerFullscreen = !isViewerFullscreen;
      render();
    });

    // View mode switchers (16:9 Slides vs Native PDF)
    container.querySelector('#modal-btn-view-slides')?.addEventListener('click', () => {
      activeViewerMode = 'presentation';
      render();
    });
    container.querySelector('#modal-btn-view-rawpdf')?.addEventListener('click', () => {
      activeViewerMode = 'rawpdf';
      render();
    });

    // Zoom controls
    container.querySelector('#modal-btn-zoom-in')?.addEventListener('click', () => {
      viewerZoom = Math.min(1.5, Math.round((viewerZoom + 0.1) * 10) / 10);
      render();
    });
    container.querySelector('#modal-btn-zoom-out')?.addEventListener('click', () => {
      viewerZoom = Math.max(0.7, Math.round((viewerZoom - 0.1) * 10) / 10);
      render();
    });
    container.querySelector('#modal-btn-zoom-reset')?.addEventListener('click', () => {
      viewerZoom = 1.0;
      render();
    });

    // PPT modal slide navigation
    container.querySelector('#modal-ppt-prev')?.addEventListener('click', () => {
      if (activeViewerSlideIdx > 0) {
        activeViewerSlideIdx--;
        render();
      }
    });

    container.querySelector('#modal-ppt-next')?.addEventListener('click', () => {
      const maxIdx = (activeViewingFile?.slides?.length || 1) - 1;
      if (activeViewerSlideIdx < maxIdx) {
        activeViewerSlideIdx++;
        render();
      }
    });

    // PPT modal dropdown selector
    container.querySelector('#modal-select-slide')?.addEventListener('change', (e) => {
      activeViewerSlideIdx = parseInt(e.target.value, 10);
      render();
    });

    // Modal thumbnail list click handlers
    container.querySelectorAll('.modal-slide-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        activeViewerSlideIdx = parseInt(item.getAttribute('data-idx'), 10);
        render();
      });
    });

    // Keyboard navigation when viewer is open
    const handleKeyNav = (e) => {
      if (!isViewerOpen) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (activeViewerSlideIdx > 0) {
          activeViewerSlideIdx--;
          render();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        const maxIdx = (activeViewingFile?.slides?.length || 1) - 1;
        if (activeViewerSlideIdx < maxIdx) {
          activeViewerSlideIdx++;
          render();
        }
      } else if (e.key === 'Escape') {
        closeInAppViewer();
      }
    };
    window.removeEventListener('keydown', handleKeyNav);
    if (isViewerOpen) {
      window.addEventListener('keydown', handleKeyNav, { once: true });
    }
  }

  // Initial render
  render();
}
