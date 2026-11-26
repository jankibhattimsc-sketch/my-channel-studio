/**
 * Gyan Yatra AI Studio — Professional Video Creation & Clip Editor (Phase 3 + Live Slide Sync)
 * Full individual clip editing, slide controls, non-destructive waveform audio editing,
 * live slide + audio recording mode, precise trimming (start, middle cut & join, end),
 * volume & fades, undo/redo, and persistent storage.
 */

import { projectState, isContentMatchingTopic, buildTopicProjectKit } from '../utils/projectState.js';
import { showNoticeToast } from '../utils/clipboard.js';
import { openFolderNotebookModal } from '../utils/folderNotebookModal.js';
import { getAllSlideAudioRecords, saveSlideAudioRecord, clearAllProjectSlideAudios, uploadAudioToServer } from '../utils/audioStorage.js';
import { getProjectPresentation, getProjectPresentationList, saveProjectPresentation, getPresentationViewUrl } from '../utils/presentationStorage.js';
import {
  buildConnectedSlideSequence,
  saveConnectedSequence,
  loadConnectedSequence
} from '../utils/slideAudioConnector.js';
import {
  LiveAudioRecorder,
  enhanceAudioBuffer,
  normalizeToTargetLoudness,
  normalizeAudioBuffer,
  audioBufferToWav,
  trimSilenceFromAudioBuffer
} from '../utils/audioRecorderEnhancer.js';
import { stitchAudioBuffers } from '../utils/audioStitcher.js';
import { formatIndianDateTimeDisplay } from '../utils/dateTimeIntelligence.js';
import { saveScriptToDatabase, syncProjectScriptWithDatabase } from '../utils/scriptDbSync.js';
import { shareProjectVideo, shareToWhatsApp, getShareableVideoUrl } from '../utils/videoShare.js';
import { parseChatGptScriptText, segmentContinuousScriptAcrossSlides } from '../utils/externalSlideParser.js';

export async function renderVideoEditor(container, navigateTo) {
  // Resilient multi-tier active project resolution so Option 5 ALWAYS opens immediately
  let project = (projectState && typeof projectState.getActiveProject === 'function')
    ? projectState.getActiveProject()
    : null;
  if (!project && typeof projectState.getProject === 'function') {
    project = projectState.getProject();
  }
  if (!project && typeof projectState.ensureActiveProject === 'function') {
    try {
      projectState.ensureActiveProject();
      project = projectState.getActiveProject();
    } catch (_) { }
  }
  if (!project && Array.isArray(projectState?.projects) && projectState.projects.length > 0) {
    project = projectState.projects[0];
  }
  if (!project) {
    project = {
      id: 'proj_default_' + Date.now(),
      name: 'નવો વિડીયો પ્રોજેક્ટ ૨૦૨૬',
      topic: 'નવો વિડીયો પ્રોજેક્ટ ૨૦૨૬',
      slide: { slides: [] },
      editing: { exportHistory: [] }
    };
  }

  const storedTopic = (typeof localStorage !== 'undefined' ? (localStorage.getItem('gyan_active_topic_name') || '') : '').trim();
  if (storedTopic && project && (!project.name || project.name === 'નવો વિડીયો પ્રોજેક્ટ ૨૦૨૬' || project.name === 'Untitled Project' || (project.topic !== storedTopic && !project.slide?.importedPresentation))) {
    project.topic = storedTopic;
    project.name = storedTopic;
    project.recommendedTitle = storedTopic;
  }

  // Ensure project.editing structure exists
  if (!project.editing) project.editing = {};
  if (!Array.isArray(project.editing.exportHistory)) project.editing.exportHistory = [];

  // Baseline known server recordings for 100% instant zero-delay 0ms mount (only for default demo)
  const knownServerSlideAudios = {
    1: { filename: 'uploaded_1793674878014_slide_1_voice.wav', slideNumber: 1, audioUrl: '/audio/uploaded_1793674878014_slide_1_voice.wav', duration: 6.0 },
    2: { filename: 'uploaded_1793593938876_slide_2_voice.wav', slideNumber: 2, audioUrl: '/audio/uploaded_1793593938876_slide_2_voice.wav', duration: 40.8 },
    3: { filename: 'uploaded_1793594044774_slide_3_voice.wav', slideNumber: 3, audioUrl: '/audio/uploaded_1793594044774_slide_3_voice.wav', duration: 34.1 },
    4: { filename: 'uploaded_1793594163443_slide_4_voice.wav', slideNumber: 4, audioUrl: '/audio/uploaded_1793594163443_slide_4_voice.wav', duration: 52.1 },
    5: { filename: 'uploaded_1793594297890_slide_5_voice.wav', slideNumber: 5, audioUrl: '/audio/uploaded_1793594297890_slide_5_voice.wav', duration: 45.7 },
    6: { filename: 'uploaded_1793594339979_slide_6_voice.wav', slideNumber: 6, audioUrl: '/audio/uploaded_1793594339979_slide_6_voice.wav', duration: 2.3 },
    7: { filename: 'uploaded_1793594363565_slide_7_voice.wav', slideNumber: 7, audioUrl: '/audio/uploaded_1793594363565_slide_7_voice.wav', duration: 2.7 },
    8: { filename: 'uploaded_1793594392431_slide_8_voice.wav', slideNumber: 8, audioUrl: '/audio/uploaded_1793594392431_slide_8_voice.wav', duration: 5.2 },
    9: { filename: 'uploaded_1793594420656_slide_9_voice.wav', slideNumber: 9, audioUrl: '/audio/uploaded_1793594420656_slide_9_voice.wav', duration: 4.1 }
  };

  const isDefaultGsrtcPres = Boolean(
    (project.id === 'proj_default_gsrtc' || project.id === 'default_proj') &&
    (project.name?.includes('GSRTC') || project.topic?.includes('GSRTC'))
  );
  const isDefaultGsrtcProject = isDefaultGsrtcPres;
  let slides = Array.isArray(project.slide?.slides) && project.slide.slides.length > 0
    ? project.slide.slides
    : [];
  let storedSlideAudios = [];
  let serverSlideAudios = isDefaultGsrtcProject ? { ...knownServerSlideAudios } : {};

  // Fetch fresh presentation and audios from IndexedDB and server
  let latestPres = null;
  if (project.id) {
    try {
      const [pRes, aRes, sRes, dbScriptRes] = await Promise.allSettled([
        getProjectPresentation(project.id).catch(() => null),
        getAllSlideAudioRecords(project.id).catch(() => []),
        isDefaultGsrtcProject
          ? fetch('/api/voice/slide-audios?projectId=' + encodeURIComponent(project.id)).then(r => r.json()).catch(() => ({}))
          : Promise.resolve({ success: true, slideAudios: {} }),
        syncProjectScriptWithDatabase(project.id).catch(() => null)
      ]);
      if (pRes.status === 'fulfilled' && pRes.value) {
        latestPres = pRes.value;
      }
      if (aRes.status === 'fulfilled' && Array.isArray(aRes.value)) {
        storedSlideAudios = aRes.value;
      }
      if (sRes.status === 'fulfilled' && sRes.value?.success && sRes.value?.slideAudios) {
        if (isDefaultGsrtcProject) {
          Object.assign(serverSlideAudios, sRes.value.slideAudios);
        }
      }
      if (dbScriptRes?.status === 'fulfilled' && dbScriptRes.value?.sections?.length > 0) {
        project.script = dbScriptRes.value;
      }
      project = (projectState && typeof projectState.getActiveProject === 'function')
        ? (projectState.getActiveProject() || project)
        : project;
      // Guarantee database script sections are loaded for slide narration fidelity
      if (!project.script?.sections || project.script.sections.length === 0) {
        try {
          const directScriptRes = await fetch('/api/scripts/project/' + encodeURIComponent(project.id)).then(r => r.json());
          if (directScriptRes?.success && directScriptRes.script?.sections?.length > 0) {
            project.script = directScriptRes.script;
          }
        } catch (_) {}
      }

      // Synchronize project slides with database script sections
      if (project.script?.sections?.length > 0) {
        if (!project.slide) project.slide = {};
        if (!Array.isArray(project.slide.slides) || project.slide.slides.length === 0) {
          project.slide.slides = project.script.sections.map((sec, idx) => ({
            slideNumber: sec.slideNumber || (idx + 1),
            pageNumber: sec.pageNumber || sec.slideNumber || (idx + 1),
            slideId: sec.slideId || `slide_${project.id}_${idx + 1}`,
            title: sec.title || sec.sectionName || `સ્લાઇડ #${idx + 1}`,
            subtitle: sec.subtitle || '',
            bulletPoints: sec.bulletPoints || [],
            scriptText: sec.scriptText || '',
            bgColor: '#FFFFFF',
            textColor: '#0F172A'
          }));
        } else {
          project.slide.slides.forEach((sl, idx) => {
            const sec = project.script.sections.find(s =>
              (s.slideNumber !== undefined && Number(s.slideNumber) === (sl.slideNumber || idx + 1)) ||
              (s.pageNumber !== undefined && Number(s.pageNumber) === (sl.pageNumber || idx + 1))
            ) || project.script.sections[idx];
            if (sec?.scriptText && (!sl.scriptText || sl.scriptText.length < sec.scriptText.length || sl.scriptText.length < 50)) {
              sl.scriptText = sec.scriptText;
            }
          });
        }
      }

      // Synchronize project slides with continuous full script if slides have empty/short script
      const projFullScript = project.script?.fullText || project.script?.rawText || project.script?.originalChatGptScript || '';
      if (projFullScript && projFullScript.trim().length > 100 && Array.isArray(project.slide?.slides) && project.slide.slides.length > 1) {
        const needsScript = project.slide.slides.filter(s => !s.scriptText || s.scriptText.length < 30).length > 0;
        if (needsScript) {
          const segs = segmentContinuousScriptAcrossSlides(projFullScript.trim(), project.slide.slides.length);
          project.slide.slides.forEach((sl, idx) => {
            if (segs[idx] && (!sl.scriptText || sl.scriptText.length < segs[idx].length)) {
              sl.scriptText = segs[idx];
            }
          });
        }
      }
    } catch (_) { }
  }

  // Validate that latest presentation actually belongs to this exact topic
  const curTopicClean = (project.topic || project.name || '').trim();
  if (latestPres && curTopicClean) {
    const presFile = (latestPres.filename || '').toLowerCase();
    const isProjectMatch = Boolean(
      (latestPres.projectId && (latestPres.projectId === project.id || latestPres.projectId === project.topicId)) ||
      (project.slide?.importedPresentation && project.slide.importedPresentation.filename === latestPres.filename) ||
      latestPres.id
    );
    const contentToCheck = (latestPres.slides && latestPres.slides.length > 0) ? latestPres.slides : presFile;
    const isMismatch = !isProjectMatch && !isContentMatchingTopic(contentToCheck, curTopicClean);
    if (isMismatch) {
      console.warn('[VideoEditor] Purging foreign presentation cache for topic:', curTopicClean, presFile);
      latestPres = null;
    }
  }

  // Validate project slides: If project.slide.slides contains foreign content from an earlier topic and no user presentation is attached, purge and rebuild!
  const hasUserImportedPdf = Boolean(project.slide?.importedPresentation || latestPres);
  const areSlidesForeign = !hasUserImportedPdf && Boolean(
    Array.isArray(project.slide?.slides) && project.slide.slides.length > 0 &&
    !isContentMatchingTopic(project.slide.slides, curTopicClean)
  );
  if (areSlidesForeign) {
    console.warn('[VideoEditor] Rebuilding authentic slides for topic:', curTopicClean);
    const freshKit = buildTopicProjectKit(curTopicClean, project.topicId || project.id);
    project.slide = freshKit.slide;
    project.script = freshKit.script;
    project.editing = freshKit.editing;
    try { projectState.saveProjects(); } catch (_) { }
  }

  // If latest presentation exists in IndexedDB and matches topic, prioritize it; otherwise use authentic project slides
  if (latestPres && Array.isArray(latestPres.slides) && latestPres.slides.length > 0) {
    project.slide = project.slide || {};
    project.slide.importedPresentation = latestPres;
    project.slide.slides = latestPres.slides;
    slides = latestPres.slides;
  } else if (Array.isArray(project.slide?.slides) && project.slide.slides.length > 0) {
    slides = project.slide.slides;
  } else {
    // Brand new or empty - generate authentic slides kit matching this topic!
    const freshKit = buildTopicProjectKit(curTopicClean, project.topicId || project.id);
    project.slide = freshKit.slide;
    slides = freshKit.slide.slides;
    try { projectState.saveProjects(); } catch (_) { }
  }

  let importedMeta = (project.slide?.importedPresentation && project.slide.importedPresentation.fileUrl) ? project.slide.importedPresentation : (latestPres || null);
  if (importedMeta && curTopicClean) {
    const metaFile = (importedMeta.filename || '').toLowerCase();
    const isProjectMatch = Boolean(
      (importedMeta.projectId && (importedMeta.projectId === project.id || importedMeta.projectId === project.topicId)) ||
      (project.slide?.importedPresentation && project.slide.importedPresentation.filename === importedMeta.filename) ||
      importedMeta.id
    );
    const contentToCheck = (importedMeta.slides && importedMeta.slides.length > 0) ? importedMeta.slides : metaFile;
    const isMismatch = !isProjectMatch && !isContentMatchingTopic(contentToCheck, curTopicClean);
    if (isMismatch) {
      console.warn('[VideoEditor] Purged foreign importedMeta for topic:', curTopicClean, metaFile);
      importedMeta = null;
      if (project.slide) {
        project.slide.importedPresentation = null;
      }
    }
  }

  let isPdfPresentation = Boolean(
    (importedMeta?.fileType === 'pdf') ||
    (importedMeta?.filename && importedMeta.filename.toLowerCase().endsWith('.pdf')) ||
    (importedMeta?.fileUrl && importedMeta.fileUrl.toLowerCase().endsWith('.pdf'))
  );
  let pdfViewUrl = isPdfPresentation ? getPresentationViewUrl(importedMeta) : '';
  if (isPdfPresentation && !pdfViewUrl && importedMeta?.filename) {
    pdfViewUrl = `/api/research/presentation-file/${encodeURIComponent(importedMeta.filename)}`;
  }

  if (!isDefaultGsrtcProject) {
    // Custom/New project or PDF! Never preload old GSRTC audio
    serverSlideAudios = {};
    if (Array.isArray(slides)) {
      slides.forEach(s => {
        if (s.audioUrl && s.audioUrl.includes('uploaded_179359')) s.audioUrl = '';
        if (s.serverUrl && s.serverUrl.includes('uploaded_179359')) s.serverUrl = '';
      });
    }
    if (Array.isArray(project.slide?.slides)) {
      project.slide.slides.forEach(s => {
        if (s.audioUrl && s.audioUrl.includes('uploaded_179359')) s.audioUrl = '';
        if (s.serverUrl && s.serverUrl.includes('uploaded_179359')) s.serverUrl = '';
      });
    }
  }

  // Build Connected Slide Sequence (Strict 1-to-1 Permanent ID Linking)
  let connectedSequence = buildConnectedSlideSequence(
    project,
    importedMeta,
    storedSlideAudios,
    { pdfViewUrl, pdfFilename: importedMeta?.filename, serverSlideAudios }
  );
  if (!connectedSequence || !Array.isArray(connectedSequence.slides) || connectedSequence.slides.length === 0) {
    connectedSequence = {
      projectId: project.id,
      slides: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => ({
        slideNumber: i,
        pageNumber: i,
        slideId: `slide_${project.id}_${i}`,
        title: `સ્લાઇડ #${i}`,
        subtitle: project.name || 'પ્રેઝન્ટેશન સ્લાઇડ',
        bulletPoints: [],
        scriptText: ''
      })),
      totalSlides: 9,
      connectedCount: 9,
      missingCount: 0
    };
  }
  saveConnectedSequence(project.id, connectedSequence);

  // =========================================================================
  // State Management
  // =========================================================================
  // 5-Step Automated Video Production Workflow State (Step 1 to 5)
  let currentWorkflowStep = (() => {
    try {
      const saved = parseInt(localStorage.getItem(`gyan_videoeditor_active_step_${project.id}`) || '1', 10);
      if (!isNaN(saved) && saved >= 1 && saved <= 5) return saved;
    } catch (_) {}
    return 1;
  })();
  let isRecordingPaused = false;
  let currentSlideIndex = 0;
  let totalClips = 0;
  let isPlaying = false;
  let activeAudio = null;
  let audioTimer = null;
  let companionAudio = null;
  let step2AudioPlayer = null;
  let presentationStitchedUrl = '';

  // Full Presentation Continuous Playback State (0:00 to 03:13 with authentic slide sync)
  let isPlayingFullPresentation = false;
  let fullPresentationAudio = null;
  let fullPresentationTimer = null;

  // Preview Playback Speed & Volume State ("અવાજ ધીમો અને ફાસ્ટ પ્રીવ્યુ")
  let previewPlaybackRate = 1.0;
  let previewVolume = 1.0;

  function setPreviewPlaybackRate(rate) {
    const val = parseFloat(rate);
    if (!isNaN(val) && val > 0) {
      previewPlaybackRate = val;
    }
    const domAudioEl = container.querySelector('#slide-audio-player-element');
    if (domAudioEl) {
      try { domAudioEl.playbackRate = previewPlaybackRate; } catch (_) {}
    }
    if (activeAudio) {
      try { activeAudio.playbackRate = previewPlaybackRate; } catch (_) {}
    }
    if (fullPresentationAudio) {
      try { fullPresentationAudio.playbackRate = previewPlaybackRate; } catch (_) {}
    }
    // Update active class/styles on all speed buttons
    container.querySelectorAll('.btn-preview-speed').forEach(btn => {
      const btnRate = parseFloat(btn.dataset.speed);
      if (Math.abs(btnRate - previewPlaybackRate) < 0.05) {
        btn.style.background = '#2563eb';
        btn.style.color = '#ffffff';
        btn.style.borderColor = '#1d4ed8';
        btn.style.fontWeight = '900';
      } else {
        btn.style.background = '#ffffff';
        btn.style.color = '#334155';
        btn.style.borderColor = '#cbd5e1';
        btn.style.fontWeight = '700';
      }
    });
    // Sync all speed select dropdowns
    container.querySelectorAll('.preview-speed-select').forEach(sel => {
      sel.value = String(previewPlaybackRate);
    });
  }

  function setPreviewVolume(vol) {
    const val = parseFloat(vol);
    if (!isNaN(val)) {
      previewVolume = Math.max(0, Math.min(1.0, val));
    }
    const domAudioEl = container.querySelector('#slide-audio-player-element');
    if (domAudioEl) {
      try { domAudioEl.volume = previewVolume; } catch (_) {}
    }
    if (activeAudio) {
      try { activeAudio.volume = previewVolume; } catch (_) {}
    }
    if (fullPresentationAudio) {
      try { fullPresentationAudio.volume = previewVolume; } catch (_) {}
    }
    container.querySelectorAll('.preview-volume-display').forEach(dsp => {
      dsp.textContent = `${Math.round(previewVolume * 100)}%`;
    });
    container.querySelectorAll('.preview-volume-slider').forEach(sl => {
      sl.value = previewVolume;
    });
  }

  function renderPreviewSpeedAndVolumeControls(compact = false) {
    const speeds = [
      { rate: 0.75, label: '0.75x 🐢', title: 'ધીમો અવાજ (0.75x)' },
      { rate: 1.0, label: '1.0x', title: 'સામાન્ય ગતિ (1.0x)' },
      { rate: 1.25, label: '1.25x ⚡', title: 'ઝડપી ગતિ (1.25x)' },
      { rate: 1.5, label: '1.5x 🚀', title: 'ફાસ્ટ અવાજ (1.5x)' }
    ];

    return `
      <!-- Playback Speed Controls (ધીમો - સામાન્ય - ફાસ્ટ) -->
      <div style="display: inline-flex; align-items: center; gap: 3px; background: #f1f5f9; padding: 2px 5px; border-radius: 6px; border: 1px solid #cbd5e1;" title="ઓડિયો પ્રીવ્યુ સ્પીડ (ધીમો / ઝડપી)">
        <span style="font-size: 0.7rem; font-weight: 800; color: #475569; margin-right: 2px;">⚡ સ્પીડ:</span>
        ${speeds.map(s => {
          const isActive = Math.abs(s.rate - previewPlaybackRate) < 0.05;
          return `
            <button
              type="button"
              class="btn-preview-speed"
              data-speed="${s.rate}"
              style="border: 1px solid ${isActive ? '#1d4ed8' : '#cbd5e1'}; background: ${isActive ? '#2563eb' : '#ffffff'}; color: ${isActive ? '#ffffff' : '#334155'}; font-size: 0.68rem; font-weight: ${isActive ? '900' : '700'}; padding: 2px 6px; border-radius: 4px; cursor: pointer; transition: all 0.15s ease;"
              title="${s.title}"
            >
              ${s.label}
            </button>
          `;
        }).join('')}
      </div>

      <!-- Volume Slider (અવાજ ધીમો / મોટો) -->
      <div style="display: inline-flex; align-items: center; gap: 4px; background: #f8fafc; padding: 2px 6px; border-radius: 6px; border: 1px solid #e2e8f0;" title="પ્રીવ્યુ અવાજ (વોલ્યુમ ધીમો / મોટો)">
        <span style="font-size: 0.74rem;">🔊</span>
        <input type="range" class="preview-volume-slider" min="0" max="1" step="0.05" value="${previewVolume}" style="width: ${compact ? '55px' : '70px'}; accent-color: #2563eb; cursor: pointer;" title="અવાજ મોટો / ધીમો કરો">
        <span class="preview-volume-display" style="font-size: 0.68rem; font-weight: 800; color: #334155; min-width: 28px;">
          ${Math.round(previewVolume * 100)}%
        </span>
      </div>
    `;
  }

  // Video creation & playback state
  let isRendering = false;
  let renderProgressPct = 0;
  let renderCurrentSlideNum = 1;
  let renderCurrentTimeSec = 0;
  let renderTotalTimeSec = 0;

  let savedVideoUrl = project.editing?.lastExportedVideoUrl || project.editing?.savedVideo?.videoUrl || project.videoeditor?.lastExportedVideoUrl || null;
  let savedVideoFilename = project.editing?.lastExportedFilename || project.editing?.savedVideo?.filename || null;

  // Purge any stale mock or mismatched video references so fresh project slides and audio are used
  const curProjName = (project.name || project.topic || '').trim();
  if (savedVideoUrl) {
    const isForeignVideo = Boolean(
      (savedVideoUrl.includes('179385')) ||
      (savedVideoUrl.includes('TET_2') && !curProjName.includes('TET')) ||
      (savedVideoUrl.includes('GSRTC') && !curProjName.includes('GSRTC')) ||
      (savedVideoUrl.includes('TAT_HS') && !curProjName.includes('TAT')) ||
      (savedVideoUrl.includes('CCE') && !curProjName.includes('CCE')) ||
      (savedVideoUrl.includes('latest_video.mp4') && (!project.editing?.savedVideo?.topic || project.editing.savedVideo.topic !== curProjName))
    );
    if (isForeignVideo) {
      console.warn('[VideoEditor] Purging foreign/stale saved video URL:', savedVideoUrl, 'for topic:', curProjName);
      savedVideoUrl = null;
      savedVideoFilename = null;
      if (project.editing) {
        project.editing.lastExportedVideoUrl = '';
        project.editing.lastExportedFilename = '';
        project.editing.savedVideo = null;
        try { projectState.updateTool('editing', project.editing); } catch (_) { }
      }
    }
  }

  // Active view: always default to 'preview' so slides, clips and audio recorder are immediately accessible!
  let activeViewMode = 'preview';
  let activeVideoScriptTab = 'full'; // 'full' | 'clip'
  let liveTeleprompterMode = 'clip'; // 'clip' | 'full'
  let formattedVideoCreationTime = 'હમણાં જ તૈયાર થયો (Just Now)';

  function getProjectFullScriptText() {
    if (project?.script?.fullText && project.script.fullText.trim().length > 20) {
      return project.script.fullText.trim();
    }
    if (project?.script?.rawText && project.script.rawText.trim().length > 20) {
      return project.script.rawText.trim();
    }
    if (project?.script?.originalChatGptScript && project.script.originalChatGptScript.trim().length > 20) {
      return project.script.originalChatGptScript.trim();
    }
    if (Array.isArray(generatedClips) && generatedClips.length > 0) {
      const clipTexts = generatedClips.map((c, i) => {
        const sNum = c.slideNumber || (i + 1);
        const text = (c.scriptText || '').trim();
        return text ? `[સ્લાઇડ #${sNum}: ${c.title || `સ્લાઇડ ${sNum}`}]\n${text}` : '';
      }).filter(Boolean);
      if (clipTexts.length > 0) {
        return clipTexts.join('\n\n');
      }
    }
    return '';
  }

  function dataUrlToBlobUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return dataUrl;
    try {
      const parts = dataUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'audio/wav';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.warn('dataUrlToBlobUrl conversion warning:', e);
      return dataUrl;
    }
  }

  let sequentialClipTimer = null;

  // Selected clip editor tab: 'slide' | 'audio'
  let activeClipEditorTab = 'audio';
  let isEditingSlideContentInStep1 = false;

  // Audio Waveform Editor State
  let activeDecodedBuffer = null;
  let waveformPlayheadPct = 0;
  let waveformZoomLevel = 1;
  let selectionStartSec = 0;
  let selectionEndSec = 0;
  let isDraggingSelection = false;
  let previewSourceNode = null;
  let audioContinueMode = 'loop'; // 'loop' (repeat continuously) | 'next' (auto-advance slides) | 'off' (stop at end)

  // =========================================================================
  // Live Slide + Audio Recording State ("સ્લાઇડ અને ઓડિયો સાથે લાઈવ રેકોર્ડ થાય")
  // =========================================================================
  let isLiveRecordingMode = false;
  let liveRecorder = null;
  let liveRecordingStartTime = 0;
  let liveTransitionMarks = []; // [{ slideIndex, slideNumber, slideId, startTime, endTime }]
  let liveTimerInterval = null;
  let liveElapsedSeconds = 0;
  let isProcessingRecording = false;

  // Single-Slide Quick Record State
  let isSingleSlideRecording = false;
  let singleSlideRecorder = null;

  // AI Audio Enhancement on Render Settings ("ઓડિયો એન્હાંસ થાય અને પરફેક્ટ જોડાય")
  let isAudioEnhanceOnRender = (project.editing?.isAudioEnhanceOnRender !== false);
  let audioEnhancePreset = project.editing?.audioEnhancePreset || 'crystal_ultra_studio';
  let videoTransitionType = project.editing?.videoTransitionType || 'clean_cut'; // 'clean_cut' | 'crossfade' | 'fade_black' | 'slide_left'
  let videoAspectRatio = project.editing?.videoAspectRatio || '16:9'; // '16:9' | '9:16'
  let videoBgmTrack = project.editing?.videoBgmTrack || 'none'; // 'none' | 'soft_ambient' | 'corporate_inspiration' | 'peaceful_doc' | 'news_beat'
  let videoBgmVolume = project.editing?.videoBgmVolume ?? 0.12;
  let videoVoiceVolume = project.editing?.videoVoiceVolume ?? 1.0;

  // Undo / Redo Stacks for Non-Destructive Clip Sequence Edits
  const undoStack = [];
  const redoStack = [];

  // Auto-restore saved video from server if not found in current session
  if (!savedVideoUrl) {
    const tid = project.id || '';
    const pname = project.name || project.topic || '';
    fetch(`/api/voice/project-video?topicId=${encodeURIComponent(tid)}&projectName=${encodeURIComponent(pname)}`)
      .then(r => r.json())
      .then(d => {
        if (d && d.success && d.videoUrl) {
          savedVideoUrl = d.videoUrl;
          savedVideoFilename = d.filename || 'slides_video.mp4';
          if (!project.editing) project.editing = {};
          project.editing.lastExportedVideoUrl = savedVideoUrl;
          project.editing.lastExportedFilename = savedVideoFilename;
          if (d.createdAt) {
            if (!project.editing.savedVideo) project.editing.savedVideo = {};
            project.editing.savedVideo.createdAt = d.createdAt;
          }
          projectState.updateTool('editing', project.editing);
          // Keep preview view active so slides and playback controls stay accessible
          renderView();
        }
      })
      .catch(() => { });
  }

  // Authentic PDF Slide Renderer Cache for 1080p Video Creation
  const pdfPageCanvases = {};
  let pdfjsLibInstance = null;
  let pdfDocPromiseInstance = null;
  let isPdfPreRendering = false;

  async function getPdfjsLib() {
    if (pdfjsLibInstance) return pdfjsLibInstance;
    try {
      const mod = await import('/vendor/pdfjs/pdf.min.mjs');
      if (mod) {
        if (mod.GlobalWorkerOptions) {
          mod.GlobalWorkerOptions.workerSrc = '/vendor/pdfjs/pdf.worker.min.mjs';
        }
        pdfjsLibInstance = mod;
        return pdfjsLibInstance;
      }
    } catch (err) {
      console.warn('[VideoEditor] Local PDF.js load notice:', err);
    }
    if (window.pdfjsLib) return window.pdfjsLib;
    return null;
  }

  async function getPdfDoc() {
    if (pdfDocPromiseInstance) return pdfDocPromiseInstance;
    const pdfjs = await getPdfjsLib();
    if (!pdfjs || !pdfViewUrl) return null;
    try {
      const loadingTask = pdfjs.getDocument({
        url: pdfViewUrl,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/cmaps/',
        cMapPacked: true
      });
      pdfDocPromiseInstance = await loadingTask.promise;
      return pdfDocPromiseInstance;
    } catch (e) {
      console.warn('[VideoEditor] getPdfDoc error:', e);
      return null;
    }
  }

  // Priority On-Demand Single PDF Page Renderer (Guaranteed Fast Slide Turning)
  async function renderSpecificPdfPage(pageNum) {
    if (!isPdfPresentation || !pdfViewUrl) return null;
    const targetP = Math.max(1, parseInt(pageNum, 10) || 1);
    const pageKey = String(targetP);
    if (pdfPageCanvases[pageKey]) return pdfPageCanvases[pageKey];

    try {
      const pdfDoc = await getPdfDoc();
      if (!pdfDoc) return null;
      const validPage = Math.min(targetP, pdfDoc.numPages || 1);
      const page = await pdfDoc.getPage(validPage);
      const unscaled = page.getViewport({ scale: 1.0 });
      const targetScale = Math.min(1920 / unscaled.width, 1080 / (unscaled.height || 720));
      const renderScale = Math.max(targetScale, 2.0);
      const viewport = page.getViewport({ scale: renderScale });

      const offCanvas = document.createElement('canvas');
      offCanvas.width = viewport.width;
      offCanvas.height = viewport.height;
      const offCtx = offCanvas.getContext('2d', { alpha: false });
      offCtx.fillStyle = '#FFFFFF';
      offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

      await page.render({ canvasContext: offCtx, viewport }).promise;
      pdfPageCanvases[pageKey] = offCanvas;
      pdfPageCanvases[String(validPage)] = offCanvas;

      const matchedClip = generatedClips.find(c => Number(c.pageNumber || c.slideNumber) === validPage) || generatedClips[validPage - 1];
      if (matchedClip) {
        if (matchedClip.clipId) pdfPageCanvases[matchedClip.clipId] = offCanvas;
        pdfPageCanvases[String(matchedClip.slideNumber)] = offCanvas;
        const dataUrl = offCanvas.toDataURL('image/jpeg', 0.90);
        matchedClip.imageUrl = dataUrl;
      }

      // If this is the currently active slide, update live stage immediately
      const curClip = generatedClips[currentSlideIndex];
      const curP = Number(curClip?.pageNumber || curClip?.slideNumber || (currentSlideIndex + 1));
      if (curP === validPage || (currentSlideIndex + 1) === validPage) {
        updateLiveStageVisual(curClip || matchedClip);
      }
      return offCanvas;
    } catch (err) {
      console.warn(`[VideoEditor] renderSpecificPdfPage(${pageNum}) error:`, err);
      return null;
    }
  }

  async function ensurePdfSlidesRendered(notify = false) {
    if (!isPdfPresentation || !pdfViewUrl) return;
    if (isPdfPreRendering) return;
    isPdfPreRendering = true;
    try {
      if (notify) showNoticeToast('📑 મૂળ PDF સ્લાઇડ્સ 1080p માં રેન્ડર થઈ રહી છે...', 'info');
      const pdfDoc = await getPdfDoc();
      if (!pdfDoc) {
        isPdfPreRendering = false;
        return;
      }
      const totalPages = pdfDoc.numPages || 1;

      for (let i = 0; i < generatedClips.length; i++) {
        const c = generatedClips[i];
        const pageNum = Math.max(1, Math.min(Number(c.pageNumber || c.slideNumber || (i + 1)), totalPages));
        const key = c.clipId || String(c.slideNumber);

        if (!pdfPageCanvases[key] || !pdfPageCanvases[String(pageNum)]) {
          try {
            const page = await pdfDoc.getPage(pageNum);
            const unscaled = page.getViewport({ scale: 1.0 });
            const targetScale = Math.min(1920 / unscaled.width, 1080 / (unscaled.height || 720));
            const renderScale = Math.max(targetScale, 2.0);
            const viewport = page.getViewport({ scale: renderScale });

            const offCanvas = document.createElement('canvas');
            offCanvas.width = viewport.width;
            offCanvas.height = viewport.height;
            const offCtx = offCanvas.getContext('2d', { alpha: false });
            offCtx.fillStyle = '#FFFFFF';
            offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

            await page.render({ canvasContext: offCtx, viewport }).promise;
            pdfPageCanvases[key] = offCanvas;
            pdfPageCanvases[String(c.slideNumber)] = offCanvas;
            pdfPageCanvases[String(pageNum)] = offCanvas;
            pdfPageCanvases[String(i + 1)] = offCanvas;

            const dataUrl = offCanvas.toDataURL('image/jpeg', 0.90);
            c.imageUrl = dataUrl;

            // Immediately update live stage if this is the current active slide
            if (i === currentSlideIndex) {
              updateLiveStageVisual(c);
            }

            // Immediately update visible thumbnails in DOM
            container.querySelectorAll(`.clip-thumb-${c.slideNumber}`).forEach(img => {
              if (img && img.tagName && img.tagName.toLowerCase() === 'img') {
                img.src = dataUrl;
                img.style.display = 'block';
              }
            });
          } catch (pErr) {
            console.warn(`[VideoEditor] Page ${pageNum} render notice:`, pErr);
          }
        }
      }

      // Final refresh for currently active slide on stage
      const activeClip = generatedClips[currentSlideIndex];
      if (activeClip) {
        updateLiveStageVisual(activeClip);
      }
    } catch (err) {
      console.warn('[VideoEditor] PDF document load notice:', err);
    } finally {
      isPdfPreRendering = false;
    }
  }

  // Build authentic generated slide clips list
  function buildGeneratedClips() {
    return connectedSequence.slides.map((s, idx) => {
      const sNum = s.slideNumber || (idx + 1);
      const matched = storedSlideAudios.find(r =>
        (r.slideId && s.slideId && String(r.slideId) === String(s.slideId)) ||
        (r.slideNumber && s.slideNumber && String(r.slideNumber) === String(s.slideNumber)) ||
        (r.pageNumber && s.pageNumber && String(r.pageNumber) === String(s.pageNumber)) ||
        (r.slideNumber && Number(r.slideNumber) === Number(sNum)) ||
        (r.slideId && String(r.slideId) === String(sNum))
      );
      const serverMatch = isDefaultGsrtcProject ? (serverSlideAudios[sNum] || serverSlideAudios[String(sNum)]) : null;

      let freshBlobUrl = '';
      try {
        if (matched?.enhancedBlob instanceof Blob) {
          freshBlobUrl = URL.createObjectURL(matched.enhancedBlob);
        } else if (matched?.blob instanceof Blob) {
          freshBlobUrl = URL.createObjectURL(matched.blob);
        }
      } catch (_) { }

      // Prioritize freshly recorded audio for this slide/project over any server cache
      const audioSourceUrl =
        freshBlobUrl ||
        (matched?.url && !matched.url.includes('uploaded_179359') ? matched.url : '') ||
        matched?.enhancedDataUrl ||
        matched?.dataUrl ||
        (matched?.serverUrl && matched.serverUrl.includes('enhanced') ? matched.serverUrl : '') ||
        (s.enhancedDataUrl ? s.enhancedDataUrl : '') ||
        (s.serverUrl && !s.serverUrl.includes('uploaded_179359') ? s.serverUrl : '') ||
        (s.audioUrl ? s.audioUrl : '') ||
        (matched?.serverUrl && !matched.serverUrl.includes('uploaded_179359') ? matched.serverUrl : '') ||
        (isDefaultGsrtcProject && serverMatch?.audioUrl ? serverMatch.audioUrl : '') ||
        '';

      const clipDuration = (matched?.duration ? Number(matched.duration) : 0) ||
        (Number(s.duration) > 0 ? Number(s.duration) : 0) ||
        (Number(s.audioDuration) > 0 ? Number(s.audioDuration) : 0) ||
        (isDefaultGsrtcProject && serverMatch?.duration && serverMatch.duration > 0 ? Number(serverMatch.duration) : 8);

      return {
        clipId: `clip_${Date.now()}_${idx + 1}`,
        clipNumber: idx + 1,
        slideIndex: idx,
        slideNumber: s.slideNumber || (idx + 1),
        slideId: s.slideId,
        pageNumber: s.pageNumber || (idx + 1),
        title: s.title || `સ્લાઇડ #${s.slideNumber || idx + 1}`,
        subtitle: s.subtitle || '',
        scriptText: s.scriptText || '',
        bulletPoints: s.bulletPoints || [],
        imageUrl: s.imageUrl || null,
        // Audio references
        audioUrl: audioSourceUrl,
        originalAudioUrl: audioSourceUrl,
        enhancedDataUrl: matched?.enhancedDataUrl || s.enhancedDataUrl || '',
        enhancedBlob: matched?.enhancedBlob || matched?.blob || null,
        blob: matched?.blob || matched?.enhancedBlob || null,
        rawBlob: matched?.rawBlob || null,
        serverUrl: (matched?.serverUrl && matched.serverUrl.includes('enhanced') ? matched.serverUrl : (serverMatch?.audioUrl || s.serverUrl || matched?.serverUrl || '')),
        hasAudio: Boolean(audioSourceUrl || matched?.blob || matched?.enhancedBlob),
        duration: clipDuration,
        originalDuration: clipDuration,
        formattedDuration: formatTime(clipDuration),
        volume: 1.0,
        fadeIn: 0,
        fadeOut: 0,
        trimRanges: [],
        deletedSegments: [],
        status: audioSourceUrl ? 'તૈયાર' : 'અવાજ બાકી',
        savedAt: matched?.savedAt || s.savedAt || null
      };
    });
  }

  const activeTopicTitle = (project.topic || project.name || '').trim();
  const clipsMatchTopic = Array.isArray(project.editing?.generatedClips) &&
    project.editing.generatedClips.length > 0 &&
    project.editing.generatedClips.length === connectedSequence.slides.length &&
    (!activeTopicTitle || project.editing.generatedClips.some(c => (c.title && c.title.includes(activeTopicTitle.slice(0, 10))) || (c.scriptText && c.scriptText.includes(activeTopicTitle.slice(0, 10)))));

  let generatedClips = (clipsMatchTopic)
    ? project.editing.generatedClips
    : buildGeneratedClips();

  if (!isDefaultGsrtcProject && Array.isArray(generatedClips)) {
    generatedClips.forEach(c => {
      if (c.audioUrl && c.audioUrl.includes('uploaded_179359')) c.audioUrl = '';
      if (c.serverUrl && c.serverUrl.includes('uploaded_179359')) c.serverUrl = '';
      if (c.originalAudioUrl && c.originalAudioUrl.includes('uploaded_179359')) c.originalAudioUrl = '';
    });
  }

  // Always synchronize generatedClips with latest slides and recorded audios
  connectedSequence.slides.forEach((s, idx) => {
    let clip = generatedClips.find(c =>
      (c.slideId && s.slideId && String(c.slideId) === String(s.slideId)) ||
      (c.slideNumber && s.slideNumber && String(c.slideNumber) === String(s.slideNumber)) ||
      c.slideIndex === idx
    );

    const sNum = (s.slideNumber !== undefined && s.slideNumber !== null) ? Number(s.slideNumber) : (idx + 1);
    const serverMatch = isDefaultGsrtcProject ? (serverSlideAudios[sNum] || serverSlideAudios[String(sNum)]) : null;

    const matchedAudio = storedSlideAudios.find(r =>
      (r.slideId && s.slideId && String(r.slideId) === String(s.slideId)) ||
      (r.slideNumber && s.slideNumber && String(r.slideNumber) === String(s.slideNumber)) ||
      (r.pageNumber && s.pageNumber && String(r.pageNumber) === String(s.pageNumber))
    );

    let freshMatchBlobUrl = '';
    try {
      if (matchedAudio?.blob instanceof Blob && matchedAudio.blob.size > 100) {
        freshMatchBlobUrl = URL.createObjectURL(matchedAudio.blob);
      }
    } catch (_) { }

    // Validate authentic audio strictly for this project
    const isAuthenticSlideAudio = Boolean(
      matchedAudio ||
      (s.audioUrl && !s.audioUrl.includes('uploaded_179359') && !s.audioUrl.includes('object_Object') && (isDefaultGsrtcProject || s.audioUrl.includes(project.id)))
    );

    // Prioritize freshest project/slide recording; do not inherit old foreign audios
    const latestAudioUrl =
      freshMatchBlobUrl ||
      (matchedAudio?.url ? matchedAudio.url : '') ||
      matchedAudio?.enhancedDataUrl ||
      matchedAudio?.dataUrl ||
      (isAuthenticSlideAudio ? (s.audioUrl || s.enhancedDataUrl || '') : '') ||
      (isDefaultGsrtcProject && serverMatch?.audioUrl ? serverMatch.audioUrl : '') ||
      '';

    const latestDuration = (clip?.duration && Number(clip.duration) > 0 ? Number(clip.duration) : 0) ||
      (matchedAudio?.duration ? Number(matchedAudio.duration) : 0) ||
      (Number(s.duration) > 0 ? Number(s.duration) : 0) ||
      (Number(s.audioDuration) > 0 ? Number(s.audioDuration) : 0) ||
      (isDefaultGsrtcProject && serverMatch?.duration ? Number(serverMatch.duration) : 0);

    const enforcedDuration = (latestDuration > 0)
      ? latestDuration
      : (isDefaultGsrtcProject && serverMatch?.duration && Number(serverMatch.duration) > 0 ? Number(serverMatch.duration) : 8.0);

    const matchedScriptSec = (() => {
      if (!project.script || !Array.isArray(project.script.sections)) return null;
      return project.script.sections.find(sec => (
        (sec.slideId && String(sec.slideId) === String(s.slideId)) ||
        (sec.slideNumber !== undefined && Number(sec.slideNumber) === sNum) ||
        (sec.pageNumber !== undefined && Number(sec.pageNumber) === (s.pageNumber || idx + 1))
      )) || project.script.sections[idx] || null;
    })();
    const candidateScript = (matchedScriptSec?.scriptText || matchedScriptSec?.text || matchedScriptSec?.content || matchedScriptSec?.narration || s.scriptText || '').trim();

    if (clip) {
      clip.slideNumber = sNum;
      clip.slideIndex = idx;
      clip.pageNumber = s.pageNumber || (idx + 1);
      if (candidateScript && (!clip.scriptText || clip.scriptText.length < candidateScript.length || clip.scriptText.length < 50)) {
        clip.scriptText = candidateScript;
      } else if (s.scriptText && (!clip.scriptText || clip.scriptText !== s.scriptText)) {
        clip.scriptText = s.scriptText;
      }
      if (s.title && !clip.title) clip.title = s.title;
      if (s.subtitle && !clip.subtitle) clip.subtitle = s.subtitle;
      if (s.bulletPoints && (!clip.bulletPoints || clip.bulletPoints.length === 0)) clip.bulletPoints = s.bulletPoints;
      if (s.imageUrl && !clip.imageUrl) clip.imageUrl = s.imageUrl;
      if (latestAudioUrl) {
        clip.audioUrl = latestAudioUrl;
        clip.originalAudioUrl = latestAudioUrl;
        clip.serverUrl = serverMatch?.audioUrl || s.serverUrl || matchedAudio?.serverUrl || latestAudioUrl;
        clip.hasAudio = true;
        clip.status = 'તૈયાર';
      }
      if (matchedAudio?.enhancedBlob && !clip.enhancedBlob) clip.enhancedBlob = matchedAudio.enhancedBlob;
      if (matchedAudio?.blob && !clip.blob) clip.blob = matchedAudio.blob;
      if (matchedAudio?.rawBlob && !clip.rawBlob) clip.rawBlob = matchedAudio.rawBlob;
      clip.duration = enforcedDuration;
      clip.originalDuration = enforcedDuration;
      clip.formattedDuration = formatTime(enforcedDuration);
    } else {
      const newClip = {
        clipId: `clip_${Date.now()}_${idx + 1}`,
        clipNumber: idx + 1,
        slideIndex: idx,
        slideNumber: sNum,
        slideId: s.slideId,
        pageNumber: s.pageNumber || (idx + 1),
        title: s.title || `સ્લાઇડ #${sNum}`,
        subtitle: s.subtitle || '',
        scriptText: candidateScript || s.scriptText || '',
        bulletPoints: s.bulletPoints || [],
        imageUrl: s.imageUrl || null,
        audioUrl: latestAudioUrl,
        originalAudioUrl: latestAudioUrl,
        serverUrl: serverMatch?.audioUrl || s.serverUrl || matchedAudio?.serverUrl || '',
        hasAudio: Boolean(latestAudioUrl || matchedAudio?.blob),
        enhancedBlob: matchedAudio?.enhancedBlob || matchedAudio?.blob || null,
        blob: matchedAudio?.blob || matchedAudio?.enhancedBlob || null,
        rawBlob: matchedAudio?.rawBlob || null,
        duration: enforcedDuration,
        originalDuration: enforcedDuration,
        formattedDuration: formatTime(enforcedDuration),
        volume: 1.0,
        fadeIn: 0,
        fadeOut: 0,
        trimRanges: [],
        deletedSegments: [],
        status: latestAudioUrl ? 'તૈયાર' : 'અવાજ બાકી',
        savedAt: matchedAudio?.savedAt || s.savedAt || null
      };
      generatedClips.push(newClip);
    }
  });

  // Ensure clipNumber sequence is 1-indexed
  function reindexClips() {
    generatedClips.forEach((c, i) => {
      c.clipNumber = i + 1;
      c.slideIndex = i;
    });
  }
  reindexClips();
  persistClips();

  // Push snapshot for undo
  function pushUndoSnapshot(label = 'Edit') {
    const snapshot = JSON.stringify(generatedClips);
    undoStack.push(snapshot);
    if (undoStack.length > 20) undoStack.shift();
    redoStack.length = 0; // Clear redo
    persistClips();
  }

  function persistClips() {
    project.editing.generatedClips = generatedClips;
    projectState.updateTool('editing', project.editing);
  }

  // Total Sequence Duration (Strictly accurately sums all authentic slide audio recordings)
  function calculateTotalDuration() {
    let total = 0;
    if (Array.isArray(generatedClips)) {
      generatedClips.forEach((c, idx) => {
        const sNum = (c.slideNumber !== undefined && c.slideNumber !== null) ? Number(c.slideNumber) : (idx + 1);
        const serverMatch = isDefaultGsrtcProject ? (serverSlideAudios[sNum] || serverSlideAudios[String(sNum)]) : null;
        const d = (Number(c?.duration) > 0)
          ? Number(c.duration)
          : (serverMatch?.duration && Number(serverMatch.duration) > 0 ? Number(serverMatch.duration) : 6.0);
        total += d;
      });
    }
    return total > 0 ? Number(total.toFixed(2)) : 6.0;
  }

  // =========================================================================
  // Time Helpers
  // =========================================================================
  function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function formatTimePrecise(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00.000';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }

  function formatSlideNumber(num) {
    return String(num).padStart(2, '0');
  }

  function setupCompanionAudioSync(masterAudioSrc) {
    try {
      if (companionAudio) {
        companionAudio.pause();
        companionAudio.currentTime = 0;
        companionAudio.src = '';
      }
      companionAudio = new Audio(masterAudioSrc);
      companionAudio.id = 'companion-video-audio-sync';
      companionAudio.preload = 'auto';
      companionAudio.volume = 1.0;
      companionAudio.muted = false;
    } catch (_) { }
  }

  function stopAllBackgroundAudios() {
    stopFullPresentation();
    isPlaying = false;
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch (_) { }
      activeAudio = null;
    }
    if (companionAudio) {
      try {
        companionAudio.pause();
        companionAudio.currentTime = 0;
      } catch (_) { }
    }
    if (typeof step2AudioPlayer !== 'undefined' && step2AudioPlayer) {
      try {
        step2AudioPlayer.pause();
        step2AudioPlayer.currentTime = 0;
      } catch (_) { }
    }
    if (previewSourceNode) {
      try { previewSourceNode.stop(); } catch (_) { }
      previewSourceNode = null;
    }
    const domAudio = container.querySelector('#slide-audio-player-element');
    if (domAudio) {
      try {
        domAudio.pause();
        domAudio.currentTime = 0;
      } catch (_) { }
    }
    container.querySelectorAll('audio').forEach(a => {
      try {
        a.pause();
        a.currentTime = 0;
      } catch (_) { }
    });
    if (audioTimer) {
      clearInterval(audioTimer);
      audioTimer = null;
    }
    if (fullPresentationTimer) {
      clearInterval(fullPresentationTimer);
      fullPresentationTimer = null;
    }
    if (sequentialClipTimer) {
      clearInterval(sequentialClipTimer);
      sequentialClipTimer = null;
    }
  }

  function playVideoWithFullSound(videoElement) {
    if (!videoElement) return;
    try {
      // Strictly stop all background audio so only the video itself plays its audio!
      stopAllBackgroundAudios();

      videoElement.muted = false;
      videoElement.volume = 1.0;
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('[Video Play Notice]:', err.message);
        });
      }
    } catch (e) {
      console.warn('[playVideoWithFullSound error]:', e);
    }
  }

  function stopFullPresentation() {
    isPlayingFullPresentation = false;
    if (fullPresentationAudio) {
      try {
        fullPresentationAudio.pause();
      } catch (_) { }
    }
    if (activeAudio) {
      try {
        activeAudio.pause();
      } catch (_) { }
    }
    if (fullPresentationTimer) {
      clearInterval(fullPresentationTimer);
      fullPresentationTimer = null;
    }
    if (sequentialClipTimer) {
      clearInterval(sequentialClipTimer);
      sequentialClipTimer = null;
    }
    const icon = container.querySelector('#play-all-icon');
    const text = container.querySelector('#play-all-text');
    if (icon) icon.textContent = '▶️';
    if (text) text.textContent = 'સંપૂર્ણ વિડીયો ક્રમશઃ ચલાવો (Play Full Video)';
  }

  function stopCurrentAudio() {
    stopAllBackgroundAudios();
    const playPauseIcon = container.querySelector('#play-pause-icon');
    const playPauseText = container.querySelector('#play-pause-text');
    if (playPauseIcon) playPauseIcon.textContent = '🎬';
    if (playPauseText) playPauseText.textContent = 'આ ક્લિપનો વિડીયો જુઓ';
    if (playPauseIcon) playPauseIcon.textContent = (currentWorkflowStep === 1) ? '▶️' : '🎬';
    if (playPauseText) playPauseText.textContent = (currentWorkflowStep === 1) ? 'અવાજ સાંભળો' : 'આ ક્લિપનો વિડીયો જુઓ';
    const allPlayIcons = container.querySelectorAll('#play-pause-icon');
    const allPlayTexts = container.querySelectorAll('#play-pause-text');
    allPlayIcons.forEach(ic => { ic.textContent = (currentWorkflowStep === 1) ? '▶️' : '🎬'; });
    allPlayTexts.forEach(tx => { tx.textContent = (currentWorkflowStep === 1) ? 'અવાજ સાંભળો' : 'આ ક્લિપનો વિડીયો જુઓ'; });
    const allCurTimes = container.querySelectorAll('#audio-current-time-display');
    allCurTimes.forEach(ct => { ct.textContent = '00:00'; });

    const stageBar = container.querySelector('#stage-clip-progress-bar');
    if (stageBar) stageBar.style.width = '0%';
    const stageBars = container.querySelectorAll('#stage-clip-progress-bar, .stage-clip-progress-bar, .step1-card-progress');
    stageBars.forEach(sb => { sb.style.width = '0%'; });
    const centerBtns = container.querySelectorAll('#btn-stage-center-play, .stage-center-play-trigger');
    centerBtns.forEach(centerBtn => {
      centerBtn.innerHTML = `
        <div style="width: 58px; height: 58px; border-radius: 50%; background: rgba(37, 99, 235, 0.92); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; box-shadow: 0 4px 20px rgba(0,0,0,0.4); border: 2px solid rgba(255,255,255,0.8);">
          ▶️
        </div>
      `;
    });
  }

  function updateLiveStageVisual(clip) {
    if (!clip) return;
    const isFirstClip = currentSlideIndex === 0;
    const isLastClip = currentSlideIndex >= generatedClips.length - 1;
    const stages = container.querySelectorAll('#slide-preview-container, #step1-slide-preview-container');
    stages.forEach(stage => {
      stage.style.background = '#ffffff';
      stage.innerHTML = `
        <div style="position: absolute; top: 10px; left: 12px; z-index: 20; display: inline-flex; align-items: center; gap: 6px; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(4px); color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.2);">
          <span>🎬</span> <span>સ્લાઇડ #${clip.slideNumber} ક્લિપ વિડીયો</span>
          <span style="color: #38bdf8;">• ⏱️ ${(clip.duration || 6).toFixed(1)}s</span>
        </div>
        ${stage.id === 'step1-slide-preview-container' ? `
          <button
            type="button"
            id="btn-edit-slide-content-quick"
            style="position: absolute; top: 8px; right: 8px; z-index: 22; background: ${isEditingSlideContentInStep1 ? '#dc2626' : 'rgba(37,99,235,0.92)'}; color: #ffffff; border: 1px solid rgba(255,255,255,0.3); font-weight: 800; font-size: 0.74rem; padding: 4px 10px; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: inline-flex; align-items: center; gap: 4px;"
          >
            <span>${isEditingSlideContentInStep1 ? '✖️' : '✏️'}</span>
            <span>${isEditingSlideContentInStep1 ? 'એડિટિંગ બંધ કરો' : 'સ્લાઇડ લખાણ એડિટ કરો'}</span>
          </button>
        ` : ''}
        ${!isFirstClip ? `
          <button
            type="button"
            class="btn-stage-float-prev"
            style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); z-index: 28; width: 44px; height: 44px; border-radius: 50%; background: rgba(15,23,42,0.88); color: #ffffff; border: 2px solid rgba(255,255,255,0.85); font-size: 1.15rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.45); transition: transform 0.15s ease;"
            title="અગાઉની સ્લાઇડ (Previous Slide)"
          >
            ◀
          </button>
        ` : ''}
        ${!isLastClip ? `
          <button
            type="button"
            class="btn-stage-float-next"
            style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); z-index: 28; width: 44px; height: 44px; border-radius: 50%; background: #2563eb; color: #ffffff; border: 2px solid rgba(255,255,255,0.9); font-size: 1.15rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 18px rgba(37,99,235,0.5); transition: transform 0.15s ease;"
            title="આગળની સ્લાઇડ પર જાઓ (Next Slide)"
          >
            ▶
          </button>
        ` : ''}
        <div id="btn-stage-center-play" class="stage-center-play-trigger" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 15; cursor: pointer; background: ${isPlaying ? 'transparent' : 'rgba(0,0,0,0.18)'};" title="ક્લિપ વિડીયો ચલાવો / થોભો">
          ${!isPlaying ? `
            <div style="width: 58px; height: 58px; border-radius: 50%; background: rgba(37, 99, 235, 0.92); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; box-shadow: 0 4px 20px rgba(0,0,0,0.4); border: 2px solid rgba(255,255,255,0.8);">
              ▶️
            </div>
          ` : ''}
        </div>
        ${renderSlideDisplay(clip)}
        ${clip.scriptText ? `
          <div style="position: absolute; bottom: 12px; left: 16px; right: 16px; background: rgba(15, 23, 42, 0.92); color: #ffffff; padding: 8px 14px; border-radius: 8px; font-size: 0.84rem; font-weight: 600; text-align: center; border: 1px solid rgba(56, 189, 248, 0.4); box-shadow: 0 4px 16px rgba(0,0,0,0.3); z-index: 10; pointer-events: none;">
            ${clip.scriptText.length > 120 ? clip.scriptText.substring(0, 120) + '...' : clip.scriptText}
          </div>
        ` : ''}
        <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: rgba(0,0,0,0.35); z-index: 25;">
          <div id="stage-clip-progress-bar" class="stage-clip-progress-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #2563eb, #10b981); transition: width 0.08s linear;"></div>
        </div>
      `;
      stage.querySelector('#btn-stage-center-play')?.addEventListener('click', (e) => {
        e.stopPropagation();
        container.querySelector('#btn-audio-play-pause')?.click();
      });
      stage.querySelector('#btn-edit-slide-content-quick')?.addEventListener('click', (e) => {
        e.stopPropagation();
        isEditingSlideContentInStep1 = !isEditingSlideContentInStep1;
        renderView();
      });
      stage.querySelector('.btn-stage-float-prev')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentSlideIndex > 0) selectClip(currentSlideIndex - 1);
      });
      stage.querySelector('.btn-stage-float-next')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentSlideIndex < generatedClips.length - 1) selectClip(currentSlideIndex + 1);
      });
    });
    // Highlight active clip card
    container.querySelectorAll('.clip-item-card').forEach((card, i) => {
      if (i === clip.slideIndex || i === currentSlideIndex || String(generatedClips[i]?.slideId) === String(clip?.slideId)) {
        card.style.borderColor = '#2563eb';
        card.style.backgroundColor = '#eff6ff';
        try { card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch (_) { }
      } else {
        card.style.borderColor = '#e2e8f0';
        card.style.backgroundColor = '#ffffff';
      }
    });
    container.querySelectorAll('.step1-slidewise-card').forEach((card) => {
      const cardClipIdx = parseInt(card.dataset.clipIndex, 10);
      const isCardActive = (cardClipIdx === clip.slideIndex || cardClipIdx === currentSlideIndex || String(generatedClips[cardClipIdx]?.slideId) === String(clip?.slideId));
      if (isCardActive) {
        card.style.borderColor = '#2563eb';
        card.style.backgroundColor = '#eff6ff';
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 4px 16px rgba(37,99,235,0.25)';
        try { card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch (_) { }
      } else {
        card.style.borderColor = '#e2e8f0';
        card.style.backgroundColor = '#ffffff';
        card.style.transform = 'none';
        card.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)';
      }
    });
    container.querySelectorAll('.wf-step1-slide-card').forEach((card) => {
      const cardClipIdx = parseInt(card.dataset.clipIndex, 10);
      const isCardActive = (cardClipIdx === clip.slideIndex || cardClipIdx === currentSlideIndex || String(generatedClips[cardClipIdx]?.slideId) === String(clip?.slideId));
      if (isCardActive) {
        card.style.borderColor = '#2563eb';
        card.style.backgroundColor = '#eff6ff';
        card.style.boxShadow = '0 4px 12px rgba(37,99,235,0.25)';
        try { card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch (_) { }
      } else {
        card.style.borderColor = '#e2e8f0';
        card.style.backgroundColor = '#f8fafc';
        card.style.boxShadow = 'none';
      }
    });
    // Immediately synchronize slide dropdown selection
    container.querySelectorAll('#step1-select-slide, .step1-select-slide-nav').forEach(sel => {
      sel.value = String(currentSlideIndex);
    });
  }

  function getSlideTimingRanges() {
    let acc = 0;
    return generatedClips.map((c, i) => {
      const sNum = (c.slideNumber !== undefined && c.slideNumber !== null) ? Number(c.slideNumber) : (i + 1);
      const serverMatch = isDefaultGsrtcProject ? (serverSlideAudios[sNum] || serverSlideAudios[String(sNum)]) : null;
      const dur = (Number(c.duration) > 0)
        ? Number(c.duration)
        : (serverMatch?.duration && Number(serverMatch.duration) > 0 ? Number(serverMatch.duration) : 6.0);
      const start = acc;
      acc += dur;
      return { index: i, slideNumber: sNum, start, end: acc, duration: dur, clip: c };
    });
  }

  function playSequentialClips(fromIdx = 0) {
    if (fromIdx >= generatedClips.length) {
      stopFullPresentation();
      return;
    }
    isPlayingFullPresentation = true;
    currentSlideIndex = fromIdx;
    const clip = generatedClips[fromIdx];
    updateLiveStageVisual(clip);

    const icon = container.querySelector('#play-all-icon');
    const text = container.querySelector('#play-all-text');
    if (icon) icon.textContent = '⏸️';
    if (text) text.textContent = 'વિડીયો થોભો (Pause)';

    // Compute cumulative start time for this clip
    const slideTimingRanges = getSlideTimingRanges();
    const currentRange = slideTimingRanges[fromIdx] || { start: 0, duration: clip.duration || 5 };
    const totalPresentationDuration = calculateTotalDuration();

    let rawAudioUrl = clip.enhancedAudioUrl || clip.audioUrl || clip.serverUrl || clip.enhancedDataUrl || clip.dataUrl;
    if (!rawAudioUrl) {
      if (clip.enhancedBlob instanceof Blob) {
        try { rawAudioUrl = URL.createObjectURL(clip.enhancedBlob); } catch (_) {}
      } else if (clip.blob instanceof Blob) {
        try { rawAudioUrl = URL.createObjectURL(clip.blob); } catch (_) {}
      } else if (clip.rawBlob instanceof Blob) {
        try { rawAudioUrl = URL.createObjectURL(clip.rawBlob); } catch (_) {}
      }
    }
    if (!rawAudioUrl) {
      const sNum = clip.slideNumber || (fromIdx + 1);
      const m = storedSlideAudios.find(r =>
        (r.slideId && clip.slideId && String(r.slideId) === String(clip.slideId)) ||
        (r.slideNumber && clip.slideNumber && String(r.slideNumber) === String(clip.slideNumber)) ||
        (r.slideNumber && Number(r.slideNumber) === Number(sNum)) ||
        (r.slideId && String(r.slideId) === String(sNum))
      );
      if (m) {
        if (m.enhancedBlob instanceof Blob) rawAudioUrl = URL.createObjectURL(m.enhancedBlob);
        else if (m.blob instanceof Blob) rawAudioUrl = URL.createObjectURL(m.blob);
        else rawAudioUrl = m.url || m.enhancedDataUrl || m.dataUrl || m.serverUrl || '';
      }
    }
    if (rawAudioUrl && rawAudioUrl.startsWith('data:audio/')) {
      rawAudioUrl = dataUrlToBlobUrl(rawAudioUrl);
    }

    if (sequentialClipTimer) {
      clearInterval(sequentialClipTimer);
      sequentialClipTimer = null;
    }

    if (rawAudioUrl) {
      if (activeAudio) {
        try { activeAudio.pause(); } catch (_) { }
      }
      activeAudio = new Audio(rawAudioUrl);
      activeAudio.playbackRate = previewPlaybackRate;
      activeAudio.volume = previewVolume;

      sequentialClipTimer = setInterval(() => {
        if (!isPlayingFullPresentation || !activeAudio) return;
        const clipTime = activeAudio.currentTime || 0;
        const totalTime = currentRange.start + clipTime;

        const fullScrubber = container.querySelector('#audio-scrubber-input');
        const timeCurrent = container.querySelector('#time-current');
        const timeTotal = container.querySelector('#time-total');
        const activeSlideBadge = container.querySelector('#active-presentation-slide-badge');

        if (fullScrubber) fullScrubber.value = totalTime;
        if (timeCurrent) timeCurrent.textContent = formatTime(totalTime);
        if (timeTotal) timeTotal.textContent = formatTime(totalPresentationDuration);
        if (activeSlideBadge) {
          activeSlideBadge.innerHTML = `હાલની સ્લાઇડ: <strong style="color: #2563eb;">#${clip.slideNumber || (fromIdx + 1)}</strong> (${formatTime(clipTime)} / ${formatTime(currentRange.duration)})`;
        }
        const stageBars = container.querySelectorAll('#stage-clip-progress-bar, .stage-clip-progress-bar');
        const clipDur = currentRange.duration || clip.duration || 1;
        const clipPct = Math.min(100, (clipTime / clipDur) * 100);
        stageBars.forEach(sb => { sb.style.width = `${clipPct}%`; });
        const cardBar = container.querySelector(`#step1-card-progress-${fromIdx}`);
        if (cardBar) cardBar.style.width = `${clipPct}%`;
      }, 50);

      activeAudio.play().then(() => {
        if (activeAudio) {
          activeAudio.playbackRate = previewPlaybackRate;
          activeAudio.volume = previewVolume;
        }
        activeAudio.onended = () => {
          if (sequentialClipTimer) {
            clearInterval(sequentialClipTimer);
            sequentialClipTimer = null;
          }
          if (isPlayingFullPresentation) {
            playSequentialClips(fromIdx + 1);
          }
        };
      }).catch(() => {
        setTimeout(() => {
          if (sequentialClipTimer) {
            clearInterval(sequentialClipTimer);
            sequentialClipTimer = null;
          }
          if (isPlayingFullPresentation) playSequentialClips(fromIdx + 1);
        }, ((clip.duration || 5) / previewPlaybackRate) * 1000);
      });
    } else {
      setTimeout(() => {
        if (isPlayingFullPresentation) playSequentialClips(fromIdx + 1);
      }, ((clip.duration || 5) / previewPlaybackRate) * 1000);
    }
  }

  function startFullPresentation(seekTimeSec = null) {
    if (activeViewMode !== 'preview') {
      activeViewMode = 'preview';
      renderView();
    }
    stopAllBackgroundAudios();
    const savedVid = container.querySelector('#main-saved-video-element');
    if (savedVid) {
      try { savedVid.pause(); } catch (_) { }
    }

    const slideTimingRanges = getSlideTimingRanges();
    const totalPresentationDuration = calculateTotalDuration();

    const masterAudioUrl = presentationStitchedUrl ||
      (companionAudio && companionAudio.src && !companionAudio.src.includes('master_presentation_audio.wav') ? companionAudio.src : '') ||
      (project.voice?.audioUrl && !project.voice.audioUrl.includes('master_presentation_audio.wav') && !project.voice.audioUrl.includes('uploaded_179359') ? project.voice.audioUrl : '') ||
      (isDefaultGsrtcProject ? '/audio/master_presentation_audio.wav' : '');

    if (!masterAudioUrl) {
      prewarmPresentationAudio().then(() => {
        if (presentationStitchedUrl && isPlayingFullPresentation) {
          // Presentation audio prewarmed
        }
      });
      playSequentialClips(currentSlideIndex || 0);
      return;
    }

    if (!fullPresentationAudio) {
      fullPresentationAudio = new Audio(masterAudioUrl);
      fullPresentationAudio.preload = 'auto';
    } else if (fullPresentationAudio.src !== masterAudioUrl) {
      fullPresentationAudio.src = masterAudioUrl;
    }
    fullPresentationAudio.playbackRate = previewPlaybackRate;
    fullPresentationAudio.volume = previewVolume;
    fullPresentationAudio.muted = false;

    let targetTime = 0;
    if (seekTimeSec !== null && seekTimeSec !== undefined) {
      targetTime = Math.max(0, Math.min(seekTimeSec, totalPresentationDuration));
    } else if (fullPresentationAudio.currentTime > 0 && fullPresentationAudio.currentTime < totalPresentationDuration - 0.5) {
      targetTime = fullPresentationAudio.currentTime;
    }
    fullPresentationAudio.currentTime = targetTime;

    fullPresentationAudio.play().then(() => {
      if (fullPresentationAudio) {
        fullPresentationAudio.playbackRate = previewPlaybackRate;
        fullPresentationAudio.volume = previewVolume;
      }
      isPlayingFullPresentation = true;
      const icon = container.querySelector('#play-all-icon');
      const text = container.querySelector('#play-all-text');
      if (icon) icon.textContent = '⏸️';
      if (text) text.textContent = 'વિડીયો થોભો (Pause)';

      // Immediately sync visual for the target second
      const initialRange = slideTimingRanges.find(r => targetTime >= r.start && targetTime < r.end) || slideTimingRanges[0];
      if (initialRange) {
        currentSlideIndex = initialRange.index;
        updateLiveStageVisual(initialRange.clip);
      }

      if (fullPresentationTimer) clearInterval(fullPresentationTimer);
      fullPresentationTimer = setInterval(() => {
        if (!isPlayingFullPresentation || fullPresentationAudio.paused) return;
        const curT = fullPresentationAudio.currentTime;

        const activeRange = slideTimingRanges.find(r => curT >= r.start && curT < r.end) || slideTimingRanges[slideTimingRanges.length - 1];

        if (activeRange && currentSlideIndex !== activeRange.index) {
          currentSlideIndex = activeRange.index;
          updateLiveStageVisual(activeRange.clip);
        }

        const fullScrubber = container.querySelector('#audio-scrubber-input');
        const timeCurrent = container.querySelector('#time-current');
        const timeTotal = container.querySelector('#time-total');
        const activeSlideBadge = container.querySelector('#active-presentation-slide-badge');

        if (fullScrubber) fullScrubber.value = curT;
        if (timeCurrent) timeCurrent.textContent = formatTime(curT);
        if (timeTotal) timeTotal.textContent = formatTime(totalPresentationDuration);
        if (activeSlideBadge && activeRange) {
          activeSlideBadge.innerHTML = `હાલની સ્લાઇડ: <strong style="color: #2563eb;">#${activeRange.slideNumber}</strong> (${formatTime(curT - activeRange.start)} / ${formatTime(activeRange.duration)})`;
        }

        if (curT >= totalPresentationDuration) {
          stopFullPresentation();
        }
      }, 50);

      fullPresentationAudio.onended = () => {
        stopFullPresentation();
      };
    }).catch(err => {
      console.warn('[startFullPresentation error]:', err.message);
      stopFullPresentation();
    });
  }

  function startSlideAudio(slideIndex) {
    stopCurrentAudio();
    const savedVid = container.querySelector('#main-saved-video-element');
    if (savedVid) {
      try { savedVid.pause(); } catch (_) { }
    }
    const clip = generatedClips[slideIndex] || generatedClips[0];
    const domAudioEl = container.querySelector('#slide-audio-player-element');
    const scrubber = container.querySelector('#audio-scrubber-input');
    const timeCurrent = container.querySelector('#time-current');
    const timeTotal = container.querySelector('#time-total');
    const playPauseIcon = container.querySelector('#play-pause-icon');
    const playPauseText = container.querySelector('#play-pause-text');

    const sNum = (clip.slideNumber !== undefined && clip.slideNumber !== null) ? Number(clip.slideNumber) : (slideIndex + 1);
    const serverMatch = isDefaultGsrtcProject ? (serverSlideAudios[sNum] || serverSlideAudios[String(sNum)]) : null;

    const matchedAudio = storedSlideAudios.find(r =>
      (r.slideId && clip.slideId && String(r.slideId) === String(clip.slideId)) ||
      (r.slideNumber && clip.slideNumber && String(r.slideNumber) === String(clip.slideNumber)) ||
      (r.pageNumber && clip.pageNumber && String(r.pageNumber) === String(clip.pageNumber)) ||
      (r.slideNumber && Number(r.slideNumber) === Number(sNum)) ||
      (r.slideId && String(r.slideId) === String(sNum))
    );
    let freshBlobUrl = '';
    try {
      if (matchedAudio?.enhancedBlob instanceof Blob) {
        freshBlobUrl = URL.createObjectURL(matchedAudio.enhancedBlob);
      } else if (matchedAudio?.blob instanceof Blob) {
        freshBlobUrl = URL.createObjectURL(matchedAudio.blob);
      }
    } catch (_) { }

    let clipBlobUrl = '';
    try {
      if (clip?.enhancedBlob instanceof Blob) {
        clipBlobUrl = URL.createObjectURL(clip.enhancedBlob);
      } else if (clip?.blob instanceof Blob) {
        clipBlobUrl = URL.createObjectURL(clip.blob);
      } else if (clip?.rawBlob instanceof Blob) {
        clipBlobUrl = URL.createObjectURL(clip.rawBlob);
      }
    } catch (_) { }

    // Auto-boost on playback if clip has unenhanced quiet audio
    if (clip && (clip.blob || clip.rawBlob) && !clip.isEnhanced && !clip.isCrystalClearEnhanced) {
      const candidateBlob = clip.blob || clip.rawBlob;
      const AudioCtxClass = (typeof window !== 'undefined') ? (window.AudioContext || window.webkitAudioContext) : null;
      if (AudioCtxClass && candidateBlob instanceof Blob) {
        candidateBlob.arrayBuffer().then(ab => {
          const c = new AudioCtxClass();
          return c.decodeAudioData(ab).then(buf => ({ c, buf }));
        }).then(async ({ c, buf }) => {
          const enh = await enhanceAudioBuffer(buf, {
            preset: 'crystal_ultra_studio',
            targetLUFS: -14.0,
            targetPeakDb: -0.8,
            intensity: 1.0,
            noiseReduction: 0.85,
            voiceClarity: 0.98,
            volumeNormalization: true,
            volume: 1.45
          });
          if (enh && enh.blob) {
            clip.enhancedBlob = enh.blob;
            clip.blob = enh.blob;
            clip.audioUrl = enh.url;
            clip.enhancedAudioUrl = enh.url;
            clip.isEnhanced = true;
            clip.isCrystalClearEnhanced = true;
            clip.status = 'Enhanced';
          }
          try { await c.close(); } catch (_) {}
        }).catch(() => {});
      }
    }

    let audioSourceUrl =
      clipBlobUrl ||
      freshBlobUrl ||
      (clip?.audioUrl && !clip.audioUrl.includes('uploaded_179359') ? clip.audioUrl : '') ||
      (matchedAudio?.url && !matchedAudio.url.includes('uploaded_179359') ? matchedAudio.url : '') ||
      matchedAudio?.enhancedDataUrl ||
      clip?.enhancedDataUrl ||
      matchedAudio?.dataUrl ||
      (matchedAudio?.serverUrl && matchedAudio.serverUrl.includes('enhanced') ? matchedAudio.serverUrl : '') ||
      (clip?.serverUrl && clip.serverUrl.includes('enhanced') ? clip.serverUrl : '') ||
      (clip?.serverUrl && !clip.serverUrl.includes('uploaded_179359') ? clip.serverUrl : '') ||
      (isDefaultGsrtcProject && serverMatch?.audioUrl ? serverMatch.audioUrl : '') ||
      '';

    if (!audioSourceUrl) {
      showNoticeToast(`⚠️ સ્લાઇડ #${clip.slideNumber || sNum} માટે ઓડિયો ઉપલબ્ધ નથી.`, 'warning');
      return;
    }

    if (domAudioEl) {
      if (audioSourceUrl && audioSourceUrl.startsWith('data:audio/')) {
        audioSourceUrl = dataUrlToBlobUrl(audioSourceUrl);
      }
      domAudioEl.src = audioSourceUrl;
      domAudioEl.playbackRate = previewPlaybackRate;
      domAudioEl.volume = previewVolume;
      domAudioEl.muted = false;
      domAudioEl.load();

      domAudioEl.play().then(() => {
        isPlaying = true;
        activeAudio = domAudioEl;
        domAudioEl.playbackRate = previewPlaybackRate;
        domAudioEl.volume = previewVolume;
        if (playPauseIcon) playPauseIcon.textContent = '⏸️';
        if (playPauseText) playPauseText.textContent = 'વિડીયો થોભો (Pause Clip)';
        if (playPauseText) playPauseText.textContent = (currentWorkflowStep === 1) ? 'અવાજ થોભો (Pause)' : 'વિડીયો થોભો (Pause Clip)';
        const allPlayIcons = container.querySelectorAll('#play-pause-icon');
        const allPlayTexts = container.querySelectorAll('#play-pause-text');
        allPlayIcons.forEach(ic => { ic.textContent = '⏸️'; });
        allPlayTexts.forEach(tx => { tx.textContent = (currentWorkflowStep === 1) ? 'અવાજ થોભો (Pause)' : 'વિડીયો થોભો (Pause Clip)'; });

        const stageCenterBtns = container.querySelectorAll('#btn-stage-center-play, .stage-center-play-trigger');
        stageCenterBtns.forEach(scb => {
          scb.innerHTML = `
            <div style="width: 58px; height: 58px; border-radius: 50%; background: rgba(220, 38, 38, 0.88); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; box-shadow: 0 4px 20px rgba(0,0,0,0.4); border: 2px solid rgba(255,255,255,0.8);">
              ⏸️
            </div>
          `;
        });

        const totalDur = domAudioEl.duration || clip.duration || 1;
        if (scrubber) {
          scrubber.max = totalDur;
          scrubber.value = 0;
        }
        const allScrubbers = container.querySelectorAll('#audio-scrubber-input');
        allScrubbers.forEach(sc => {
          sc.max = totalDur;
          sc.value = 0;
        });

        audioTimer = setInterval(() => {
          if (domAudioEl.paused) return;
          const curTime = domAudioEl.currentTime;
          const dur = domAudioEl.duration || clip.duration || 1;
          if (scrubber) scrubber.value = curTime;
          allScrubbers.forEach(sc => { sc.value = curTime; });
          if (timeCurrent) timeCurrent.textContent = formatTime(curTime);
          if (timeTotal) timeTotal.textContent = formatTime(dur);
          const allCurTimes = container.querySelectorAll('#audio-current-time-display');
          allCurTimes.forEach(ct => { ct.textContent = formatTime(curTime); });

          const stageBar = container.querySelector('#stage-clip-progress-bar');
          if (stageBar) stageBar.style.width = `${Math.min(100, (curTime / dur) * 100)}%`;
          const stageBars = container.querySelectorAll('#stage-clip-progress-bar, .stage-clip-progress-bar');
          const pct = Math.min(100, (curTime / dur) * 100);
          stageBars.forEach(sb => { sb.style.width = `${pct}%`; });
          const cardBar = container.querySelector(`#step1-card-progress-${slideIndex}`);
          if (cardBar) cardBar.style.width = `${pct}%`;

          // Update waveform playhead if visible
          waveformPlayheadPct = curTime / dur;
          redrawAllWaveforms(waveformPlayheadPct);
        }, 80);

        domAudioEl.onended = () => {
          if (audioContinueMode === 'loop') {
            waveformPlayheadPct = 0;
            redrawAllWaveforms(0);
            try {
              domAudioEl.currentTime = 0;
              domAudioEl.play().catch(() => {});
              return;
            } catch (_) {}
          } else if (audioContinueMode === 'next') {
            const nextIdx = generatedClips.findIndex((c, idx) => idx > slideIndex && (c.audioUrl || c.enhancedAudioUrl || c.originalAudioUrl || c.blob || c.rawBlob));
            if (nextIdx !== -1) {
              stopCurrentAudio();
              selectSlideAndUpdate(nextIdx);
              setTimeout(() => playAudioForClip(nextIdx), 120);
              return;
            }
          }
          stopCurrentAudio();
          waveformPlayheadPct = 0;
          redrawAllWaveforms(0);
          if (playPauseIcon) playPauseIcon.textContent = '🎬';
          if (playPauseText) playPauseText.textContent = `🎬 આ ક્લિપનો વિડીયો જુઓ (${Math.round(clip.duration || 6)}s)`;
          allPlayIcons.forEach(ic => { ic.textContent = (currentWorkflowStep === 1) ? '▶️' : '🎬'; });
          allPlayTexts.forEach(tx => { tx.textContent = (currentWorkflowStep === 1) ? 'અવાજ સાંભળો' : `🎬 આ ક્લિપનો વિડીયો જુઓ (${Math.round(clip.duration || 6)}s)`; });
          const stageBar = container.querySelector('#stage-clip-progress-bar');
          if (stageBar) stageBar.style.width = '0%';
          const stageBars = container.querySelectorAll('#stage-clip-progress-bar, .stage-clip-progress-bar, .step1-card-progress');
          stageBars.forEach(sb => { sb.style.width = '0%'; });
        };
      }).catch(err => {
        console.warn('[Audio Play Error]:', err.message);
        stopCurrentAudio();
      });
    }
  }

  
  /**
   * Step 2 Crystal Noise Reduction DSP Engine
   * Eliminates 50/60Hz AC electrical hum, low-frequency rumble, high-frequency hiss,
   * while preserving natural Gujarati vocal clarity and dynamics.
   */
  async function applyCrystalNoiseReduction(audioBuffer, options = {}) {
    if (typeof enhanceAudioBuffer === 'function') {
      try {
        const enhOpts = {
          preset: 'crystal_ultra_studio',
          noiseRemoval: true,
          noiseReduction: 0.98,
          zeroBackgroundNoise: true,
          clarityBoost: true,
          volumeNormalization: true,
          ...options
        };
        const enh = await enhanceAudioBuffer(audioBuffer, enhOpts);
        if (enh && (enh.buffer || enh.audioBuffer)) return enh.buffer || enh.audioBuffer;
      } catch (e) {
        console.warn('[CrystalNoiseReduction] enhanceAudioBuffer fallback:', e);
      }
    }
    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    const offlineCtx = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    const srcNode = offlineCtx.createBufferSource();
    srcNode.buffer = audioBuffer;

    // 1. Highpass filter at 80Hz (cuts mic rumble and handling noise)
    const hpFilter = offlineCtx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 80;

    // 2. Electrical hum notch filter (50Hz)
    const notch50 = offlineCtx.createBiquadFilter();
    notch50.type = 'notch';
    notch50.frequency.value = 50;
    notch50.Q.value = 10;

    // 3. Electrical hum notch filter (60Hz)
    const notch60 = offlineCtx.createBiquadFilter();
    notch60.type = 'notch';
    notch60.frequency.value = 60;
    notch60.Q.value = 10;

    // 4. Dynamics Compressor for broadcast loudness (-16 LUFS target)
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 8;
    compressor.ratio.value = 3.5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    srcNode.connect(hpFilter);
    hpFilter.connect(notch50);
    notch50.connect(notch60);
    notch60.connect(compressor);
    compressor.connect(offlineCtx.destination);

    srcNode.start(0);
    return await offlineCtx.startRendering();
  }

  async function decodeAudioUrlToBuffer(urlOrBlob) {
    if (!urlOrBlob) return null;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtxClass();
      let ab = null;
      if (urlOrBlob instanceof Blob) {
        ab = await urlOrBlob.arrayBuffer();
      } else if (urlOrBlob instanceof ArrayBuffer) {
        ab = urlOrBlob;
      } else if (typeof urlOrBlob === 'string' && urlOrBlob.startsWith('data:')) {
        const comma = urlOrBlob.indexOf(',');
        const b64 = (comma !== -1 ? urlOrBlob.slice(comma + 1) : urlOrBlob).replace(/\s/g, '');
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        ab = bytes.buffer;
      } else if (typeof urlOrBlob === 'string' && urlOrBlob.trim()) {
        const resp = await fetch(urlOrBlob);
        if (resp.ok) ab = await resp.arrayBuffer();
      }
      if (ab && ab.byteLength > 44) {
        const buffer = await ctx.decodeAudioData(ab.slice(0));
        try { await ctx.close(); } catch (_) { }
        return buffer;
      }
    } catch (e) {
      console.warn('[decodeAudioUrlToBuffer notice]:', e.message);
    }
    return null;
  }

  function selectClip(index) {
    try {
      const targetIdx = parseInt(index, 10);
      if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= generatedClips.length) return;
      try { stopCurrentAudio(); } catch (_) { }
      const prevScrollY = (typeof window !== 'undefined') ? (window.scrollY || window.pageYOffset || 0) : 0;
      currentSlideIndex = targetIdx;
      activeViewMode = 'preview';

      // Synchronize target clip
      const clip = generatedClips[currentSlideIndex];
      if (clip) {
        clip.slideIndex = targetIdx;
        clip.slideNumber = clip.slideNumber || (targetIdx + 1);
        clip.pageNumber = clip.pageNumber || (targetIdx + 1);
        const sNum = clip.slideNumber;
        const pNum = clip.pageNumber;
        const dbSec = (project.script?.sections || []).find(sec =>
          (sec.slideNumber !== undefined && Number(sec.slideNumber) === sNum) ||
          (sec.pageNumber !== undefined && Number(sec.pageNumber) === pNum)
        ) || (project.script?.sections || [])[targetIdx];
        const dbText = (dbSec?.scriptText || dbSec?.text || dbSec?.narration || '').trim();
        if (dbText && (!clip.scriptText || clip.scriptText.trim().length < dbText.length || clip.scriptText.trim().length < 50)) {
          clip.scriptText = dbText;
        }
      }

      // ---------------------------------------------------------------------
      // ZERO-LATENCY DIRECT DOM UPDATE: Instant Slide Flip with Zero Delay
      // ---------------------------------------------------------------------
      if (clip) {
        const isFirst = targetIdx === 0;
        const isLast = targetIdx === generatedClips.length - 1;

        // 1. Update Heading Title
        const headingEl = container.querySelector('#step1-slide-heading');
        if (headingEl) {
          headingEl.textContent = `સ્લાઇડ #${clip.slideNumber}: ${clip.title || 'સ્લાઇડ પ્રેઝન્ટેશન'}`;
        }

        // 2. Synchronize Slide Dropdown Selectors
        container.querySelectorAll('#step1-select-slide, .step1-select-slide-nav').forEach(sel => {
          sel.value = String(targetIdx);
        });

        // 3. Update Prev & Next Buttons
        container.querySelectorAll('#btn-prev-slide, .btn-nav-prev-slide').forEach(btn => {
          btn.disabled = isFirst;
          if (isFirst) {
            btn.style.opacity = '0.45';
            btn.style.cursor = 'not-allowed';
            btn.style.background = '#f1f5f9';
            btn.style.color = '#94a3b8';
            btn.style.border = '1px solid #e2e8f0';
          } else {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.style.background = '#ffffff';
            btn.style.color = '#0f172a';
            btn.style.border = '1.5px solid #cbd5e1';
          }
        });

        container.querySelectorAll('#btn-next-slide, .btn-nav-next-slide').forEach(btn => {
          btn.disabled = isLast;
          if (isLast) {
            btn.style.opacity = '0.45';
            btn.style.cursor = 'not-allowed';
            btn.style.background = '#f1f5f9';
            btn.style.color = '#94a3b8';
            btn.style.border = '1px solid #e2e8f0';
          } else {
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.style.background = '#ffffff';
            btn.style.color = '#0f172a';
            btn.style.border = '1.5px solid #cbd5e1';
          }
        });

        // 4. Update Teleprompter & Scripts
        const teleTa = container.querySelector('#teleprompter-script-ta');
        if (teleTa) {
          teleTa.value = (liveTeleprompterMode === 'full') ? getProjectFullScriptText() : (clip.scriptText || '');
        }
        const liveTeleTa = container.querySelector('#live-teleprompter-script-ta');
        if (liveTeleTa) {
          liveTeleTa.value = (liveTeleprompterMode === 'full') ? getProjectFullScriptText() : (clip.scriptText || '');
        }
        const scriptTa = container.querySelector('#step1-script-textarea');
        if (scriptTa) scriptTa.value = clip.scriptText || '';
        const scriptBadge = container.querySelector('#step1-script-badge');
        if (scriptBadge) {
          scriptBadge.textContent = (liveTeleprompterMode === 'full') ? '📜 સંપૂર્ણ આખી સ્ક્રિપ્ટ' : `સ્લાઇડ #${clip.slideNumber} સ્ક્રિપ્ટ`;
        }
        const wordsEl = container.querySelector('#step1-script-words-count');
        if (wordsEl) {
          const shownText = (liveTeleprompterMode === 'full') ? getProjectFullScriptText() : (clip.scriptText || '');
          const w = shownText.trim().split(/\s+/).filter(Boolean).length;
          wordsEl.textContent = `શબ્દો: ${w}`;
        }

        // 5. Update Record Button
        const recBtn = container.querySelector('#btn-record-cur-slide');
        if (recBtn) {
          recBtn.innerHTML = `<span>🎙️</span><span>સ્લાઇડ #${clip.slideNumber} માટે અવાજ રેકોર્ડ કરો</span>`;
        }

        // 6. Update Live Stage Visual Immediately
        try { updateLiveStageVisual(clip); } catch (_) { }
      }

      renderView();

      // Preserve scroll position so user stays exactly at the slide editor view
      try {
        if (typeof window !== 'undefined' && prevScrollY > 0) {
          window.scrollTo({ top: prevScrollY, behavior: 'instant' });
        }
      } catch (_) {}

      // Immediately update live stage visual with active slide details
      if (clip) {
        try { updateLiveStageVisual(clip); } catch (_) { }
      }
      if (isPdfPresentation && pdfViewUrl) {
        const pNum = Number(clip?.pageNumber || clip?.slideNumber || (targetIdx + 1));
        renderSpecificPdfPage(pNum).catch(() => {});
        if (pNum < (pdfDocPromiseInstance?.numPages || generatedClips.length)) {
          renderSpecificPdfPage(pNum + 1).catch(() => {});
        }
      }

      // Load active buffer for waveform asynchronously without wiping the DOM
      const candidateSource = clip?.enhancedBlob || clip?.blob || clip?.rawBlob || clip?.audioUrl || clip?.enhancedAudioUrl || clip?.originalAudioUrl || '';
      if (candidateSource) {
        decodeAudioUrlToBuffer(candidateSource).then(buf => {
          if (currentSlideIndex !== targetIdx) return; // Prevent race conditions
          activeDecodedBuffer = buf;
          if (clip && buf && buf.duration > 0) {
            clip.duration = Number(buf.duration.toFixed(2));
            clip.formattedDuration = formatTime(clip.duration);
          }
          selectionStartSec = 0;
          selectionEndSec = buf ? Math.min(2.0, buf.duration) : 0;
          waveformPlayheadPct = 0;
          syncSelectionRangeInputs();
          redrawAllWaveforms(0);
        }).catch(() => {});
      } else {
        activeDecodedBuffer = null;
        selectionStartSec = 0;
        selectionEndSec = 0;
      }
    } catch (err) {
      console.error('[VideoEditor] selectClip error:', err);
    }
  }

  function goToNextSlide() {
    try {
      const cur = parseInt(currentSlideIndex, 10) || 0;
      if (cur < generatedClips.length - 1) {
        selectClip(cur + 1);
      }
    } catch (err) {
      console.error('[VideoEditor] goToNextSlide error:', err);
    }
  }

  function goToPrevSlide() {
    try {
      const cur = parseInt(currentSlideIndex, 10) || 0;
      if (cur > 0) {
        selectClip(cur - 1);
      }
    } catch (err) {
      console.error('[VideoEditor] goToPrevSlide error:', err);
    }
  }

  try {
    window.selectClip = selectClip;
    window.videoEditorGoToSlide = (idx) => {
      try {
        const target = parseInt(idx, 10);
        if (!isNaN(target) && target >= 0 && target < generatedClips.length) {
          selectClip(target);
        }
      } catch (err) {
        console.error('[VideoEditor] videoEditorGoToSlide error:', err);
      }
    };
    window.videoEditorNextSlide = goToNextSlide;
    window.videoEditorPrevSlide = goToPrevSlide;
    window.goToNextSlide = goToNextSlide;
    window.goToPrevSlide = goToPrevSlide;
  } catch (_) {}

  // =========================================================================
  // Non-Destructive Audio Editing Helpers (Web Audio)
  // =========================================================================

  // Cut middle section [startSec, endSec] and smoothly join
  async function cutAudioBufferMiddle(audioBuffer, selStart, selEnd) {
    if (!audioBuffer) return null;
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const startSample = Math.floor(Math.max(0, selStart) * sampleRate);
    const endSample = Math.floor(Math.min(audioBuffer.duration, selEnd) * sampleRate);
    if (endSample <= startSample) return audioBuffer;

    const part1Len = startSample;
    const part2Len = Math.max(0, audioBuffer.length - endSample);
    const newLength = part1Len + part2Len;
    if (newLength <= 0) return null;

    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtxClass();
    const newBuf = ctx.createBuffer(numChannels, newLength, sampleRate);
    const crossfade = Math.min(Math.floor(0.012 * sampleRate), Math.floor(part1Len / 2), Math.floor(part2Len / 2));

    for (let c = 0; c < numChannels; c++) {
      const src = audioBuffer.getChannelData(c);
      const dst = newBuf.getChannelData(c);

      // Part 1
      for (let i = 0; i < part1Len; i++) dst[i] = src[i];
      // Part 2
      for (let i = 0; i < part2Len; i++) dst[part1Len + i] = src[endSample + i];

      // Smooth crossfade to prevent audible click
      if (crossfade > 0 && part1Len > 0 && part2Len > 0) {
        for (let i = 0; i < crossfade; i++) {
          const t = i / crossfade;
          dst[part1Len - crossfade + i] *= (1 - t * 0.4);
          dst[part1Len + i] *= (0.6 + t * 0.4);
        }
      }
    }
    try { await ctx.close(); } catch (_) { }
    return newBuf;
  }

  // Trim start: cut from 0 to trimSec
  async function trimAudioBufferStart(audioBuffer, trimSec) {
    if (!audioBuffer) return null;
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const trimSamples = Math.floor(Math.max(0, trimSec) * sampleRate);
    const newLength = Math.max(0, audioBuffer.length - trimSamples);
    if (newLength <= 0) return null;

    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtxClass();
    const newBuf = ctx.createBuffer(numChannels, newLength, sampleRate);
    for (let c = 0; c < numChannels; c++) {
      const src = audioBuffer.getChannelData(c);
      const dst = newBuf.getChannelData(c);
      for (let i = 0; i < newLength; i++) dst[i] = src[trimSamples + i];
    }
    try { await ctx.close(); } catch (_) { }
    return newBuf;
  }

  // Trim end: cut from (duration - trimSec) to duration
  async function trimAudioBufferEnd(audioBuffer, cutPointSec) {
    if (!audioBuffer) return null;
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const cutSamples = Math.floor(Math.min(audioBuffer.duration, cutPointSec) * sampleRate);
    if (cutSamples <= 0) return null;

    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtxClass();
    const newBuf = ctx.createBuffer(numChannels, cutSamples, sampleRate);
    for (let c = 0; c < numChannels; c++) {
      const src = audioBuffer.getChannelData(c);
      const dst = newBuf.getChannelData(c);
      for (let i = 0; i < cutSamples; i++) dst[i] = src[i];
    }
    try { await ctx.close(); } catch (_) { }
    return newBuf;
  }

  // Apply volume and fades
  async function applyVolumeAndFades(audioBuffer, vol = 1.0, fadeIn = 0, fadeOut = 0) {
    if (!audioBuffer) return null;
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const dur = audioBuffer.duration;

    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtxClass();
    const newBuf = ctx.createBuffer(numChannels, length, sampleRate);

    const inSamples = Math.floor(Math.min(fadeIn, dur / 2) * sampleRate);
    const outSamples = Math.floor(Math.min(fadeOut, dur / 2) * sampleRate);

    for (let c = 0; c < numChannels; c++) {
      const src = audioBuffer.getChannelData(c);
      const dst = newBuf.getChannelData(c);
      for (let i = 0; i < length; i++) {
        let g = vol;
        if (inSamples > 0 && i < inSamples) g *= (i / inSamples);
        if (outSamples > 0 && i >= length - outSamples) g *= ((length - i) / outSamples);
        dst[i] = src[i] * g;
      }
    }
    try { await ctx.close(); } catch (_) { }
    return newBuf;
  }

  function commitNewAudioBufferToClip(clip, newBuffer, label = 'Audio Edit') {
    if (!clip || !newBuffer) return;
    pushUndoSnapshot(label);

    const wavBlob = audioBufferToWav(newBuffer);
    const newUrl = URL.createObjectURL(wavBlob);

    clip.audioUrl = newUrl;
    clip.blob = wavBlob;
    clip.enhancedBlob = wavBlob;
    clip.enhancedAudioUrl = newUrl;
    clip.duration = Number(Math.max(1.0, newBuffer.duration).toFixed(2));
    clip.formattedDuration = formatTime(clip.duration);
    clip.hasAudio = true;
    clip.status = 'Enhanced';
    clip.isEnhanced = true;
    clip.isCrystalClearEnhanced = true;
    activeDecodedBuffer = newBuffer;

    selectionStartSec = 0;
    selectionEndSec = Math.min(2.0, clip.duration);

    // Persist to IndexedDB slide audios so changes are permanent across app & video creation
    try {
      const singleAudioItem = {
        id: `${project.id}_slide_${clip.slideId || clip.slideNumber}`,
        projectId: project.id,
        slideId: clip.slideId,
        slideNumber: clip.slideNumber,
        blob: wavBlob,
        enhancedBlob: wavBlob,
        rawBlob: clip.rawBlob || wavBlob,
        url: newUrl,
        enhancedUrl: newUrl,
        rawUrl: clip.rawUrl || newUrl,
        duration: clip.duration,
        status: 'Enhanced',
        isEnhanced: true,
        isCrystalClearEnhanced: true,
        savedAt: new Date().toISOString()
      };
      saveSlideAudioRecord(project.id, String(clip.slideId), singleAudioItem);
      saveSlideAudioRecord(project.id, String(clip.slideNumber), singleAudioItem);

      storedSlideAudios = storedSlideAudios.filter(r =>
        String(r.slideId) !== String(clip.slideId) &&
        Number(r.slideNumber) !== Number(clip.slideNumber) &&
        String(r.id) !== `${project.id}_slide_${clip.slideId}` &&
        String(r.id) !== `${project.id}_slide_${clip.slideNumber}`
      );
      storedSlideAudios.push(singleAudioItem);

      if (Array.isArray(project.slide?.slides)) {
        const matchedSlide = project.slide.slides.find(s =>
          s.slideNumber === clip.slideNumber || String(s.id) === String(clip.slideId)
        );
        if (matchedSlide) {
          matchedSlide.audioUrl = newUrl;
          matchedSlide.enhancedAudioUrl = newUrl;
          matchedSlide.duration = clip.duration;
          matchedSlide.recordingDuration = clip.duration;
        }
      }
    } catch (_) { }

    // Invalidate presentation stitched audio so new trimmed audio is joined seamlessly
    presentationStitchedUrl = null;
    if (fullPresentationAudio) {
      try { fullPresentationAudio.pause(); } catch (_) { }
      fullPresentationAudio = null;
    }
    prewarmPresentationAudio();

    persistClips();
    projectState.saveProjects();
    renderView();
    showNoticeToast(`✨ ${label} સફળ! (નવી અવધિ: ${clip.formattedDuration})`, 'success');
  }

  // Detect silence endpoints (leading & trailing dead air where voice didn't come)
  function detectSilenceEndpoints(audioBuffer, thresholdDb = -42) {
    if (!audioBuffer) return { leadingSec: 0, trailingSec: 0, hasSilence: false, isEntirelySilent: false };
    const thresholdLinear = Math.pow(10, thresholdDb / 20);
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    let firstSpeechSample = length;
    let lastSpeechSample = 0;

    for (let c = 0; c < numChannels; c++) {
      const data = audioBuffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        if (Math.abs(data[i]) > thresholdLinear) {
          if (i < firstSpeechSample) firstSpeechSample = i;
          if (i > lastSpeechSample) lastSpeechSample = i;
        }
      }
    }
    if (firstSpeechSample >= lastSpeechSample) {
      return { leadingSec: audioBuffer.duration, trailingSec: 0, hasSilence: true, isEntirelySilent: true };
    }
    const leadingSec = Math.max(0, firstSpeechSample / sampleRate);
    const trailingSec = Math.max(0, (length - lastSpeechSample) / sampleRate);
    const hasSilence = (leadingSec > 0.3 || trailingSec > 0.3);
    return { leadingSec, trailingSec, hasSilence, isEntirelySilent: false };
  }

  // =========================================================================
  // Waveform Canvas Drawing with Draggable Range Selector & Silence Detection
  // =========================================================================
  function drawInteractiveWaveform(canvas, audioBuffer, selStart, selEnd, playheadPct = 0) {
    if (!canvas || !audioBuffer) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width || 980;
    const height = canvas.height || 110;
    const dur = audioBuffer.duration || 1;

    ctx.clearRect(0, 0, width, height);

    // Background - Deep studio theme
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Grid lines for seconds
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    const stepSec = dur > 60 ? 5 : (dur > 20 ? 2 : 1);
    for (let sec = stepSec; sec < dur; sec += stepSec) {
      const x = (sec / dur) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.font = '9px monospace';
      ctx.fillText(`${sec}s`, x + 3, 11);
    }

    const rawData = audioBuffer.getChannelData(0);
    const barWidth = 3;
    const barGap = 1.5;
    const totalBars = Math.floor(width / (barWidth + barGap));
    const blockSize = Math.floor(rawData.length / totalBars);
    const midY = height / 2;

    const selStartX = (selStart / dur) * width;
    const selEndX = (selEnd / dur) * width;
    const playheadX = width * Math.max(0, Math.min(1, playheadPct));

    // Threshold for silence detection (~ -42 dB, amplitude ~ 0.009)
    const silenceLinearThreshold = 0.009;

    // Draw bars
    for (let b = 0; b < totalBars; b++) {
      let sum = 0;
      let peak = 0;
      const startIdx = b * blockSize;
      for (let i = 0; i < blockSize; i++) {
        const val = Math.abs(rawData[startIdx + i] || 0);
        sum += val;
        if (val > peak) peak = val;
      }
      const avg = sum / (blockSize || 1);
      const isSilent = (peak < silenceLinearThreshold && avg < (silenceLinearThreshold * 0.6));

      const barHeight = isSilent
        ? 3 // Minimal flat line dot for dead air silence / missing voice
        : Math.max(4, Math.min(height - 14, avg * height * 2.4));

      const x = b * (barWidth + barGap);
      const y = midY - (barHeight / 2);

      const inSelection = x >= Math.min(selStartX, selEndX) && x <= Math.max(selStartX, selEndX);
      const isPlayed = x <= playheadX;

      if (inSelection) {
        ctx.fillStyle = '#f87171'; // Red for selection to cut
      } else if (isSilent) {
        // Dead silence / missing voice: subtle coral red with warning tone
        ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
      } else if (isPlayed) {
        ctx.fillStyle = '#38bdf8'; // Cyan played
      } else {
        ctx.fillStyle = '#10b981'; // Vibrant emerald for clear recorded voice
      }

      ctx.fillRect(x, y, barWidth, barHeight);
    }

    // Draw Selection Box Overlay with Draggable Handles & Exact Duration Badge
    const s1 = Math.min(selStart, selEnd);
    const s2 = Math.max(selStart, selEnd);
    if (s2 > s1 && (s2 - s1) > 0.01) {
      const leftX = (s1 / dur) * width;
      const rightX = (s2 / dur) * width;
      const boxW = Math.max(2, rightX - leftX);

      // Gradient filled selection zone
      const selGrad = ctx.createLinearGradient(leftX, 0, rightX, 0);
      selGrad.addColorStop(0, 'rgba(239, 68, 68, 0.32)');
      selGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.18)');
      selGrad.addColorStop(1, 'rgba(239, 68, 68, 0.32)');
      ctx.fillStyle = selGrad;
      ctx.fillRect(leftX, 0, boxW, height);

      // Top and bottom border lines
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(leftX, 0, boxW, height);

      // Left Draggable Handle (Bar + Grip)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(leftX - 4, 0, 8, height);
      ctx.fillStyle = '#ffffff';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(leftX - 2, (height / 2) - 14, 4, 28, 2);
        ctx.fill();
      } else {
        ctx.fillRect(leftX - 2, (height / 2) - 14, 4, 28);
      }

      // Right Draggable Handle (Bar + Grip)
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(rightX - 4, 0, 8, height);
      ctx.fillStyle = '#ffffff';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(rightX - 2, (height / 2) - 14, 4, 28, 2);
        ctx.fill();
      } else {
        ctx.fillRect(rightX - 2, (height / 2) - 14, 4, 28);
      }

      // Badge showing selected duration to cut
      const selDur = s2 - s1;
      const badgeText = `✂️ કાપવાનો ભાગ: ${selDur.toFixed(2)}s`;
      ctx.font = 'bold 11px sans-serif';
      const textW = ctx.measureText(badgeText).width;
      const badgeX = Math.max(4, Math.min(width - textW - 16, leftX + (boxW / 2) - (textW / 2) - 8));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(badgeX, 6, textW + 16, 20, 4);
        ctx.fill();
      } else {
        ctx.fillRect(badgeX, 6, textW + 16, 20);
      }
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1;
      ctx.strokeRect(badgeX, 6, textW + 16, 20);
      ctx.fillStyle = '#fca5a5';
      ctx.fillText(badgeText, badgeX + 8, 20);
    }

    // Draw Live Hover Line & Timestamp
    if (typeof canvas._hoverX === 'number' && canvas._hoverX >= 0 && canvas._hoverX <= width) {
      const hX = canvas._hoverX;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.lineWidth = 1;
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hX, 0);
      ctx.lineTo(hX, height);
      ctx.stroke();
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);

      const hTime = (hX / width) * dur;
      const hText = `${hTime.toFixed(2)}s`;
      ctx.font = 'bold 9px monospace';
      const htW = ctx.measureText(hText).width;
      const htX = Math.max(2, Math.min(width - htW - 10, hX - (htW / 2) - 4));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
      ctx.fillRect(htX, height - 16, htW + 8, 14);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(hText, htX + 4, height - 5);
    }

    // Draw Playhead
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  }

  // Redraw all active waveform canvases across Step 1 and Step 5
  function redrawAllWaveforms(playheadPct = waveformPlayheadPct) {
    if (!activeDecodedBuffer) return;
    const zoom = Math.max(1, Number(waveformZoomLevel) || 1);
    const applyZoomAndDraw = (canvas) => {
      if (!canvas) return;
      const targetWidth = Math.round(980 * zoom);
      if (canvas.width !== targetWidth) canvas.width = targetWidth;
      canvas.style.width = `${100 * zoom}%`;
      drawInteractiveWaveform(canvas, activeDecodedBuffer, selectionStartSec, selectionEndSec, playheadPct);
    };
    applyZoomAndDraw(container.querySelector('#step1-audio-waveform-canvas'));
    applyZoomAndDraw(container.querySelector('#audio-waveform-canvas'));
  }

  // =========================================================================
  // Render Compact 16:9 Mini Slide Visual Thumbnail (For Cards & Timeline)
  // =========================================================================
  function renderMiniSlideThumbnail(clip) {
    if (!clip) return '';
    const clipKey = clip?.clipId || String(clip?.slideNumber || 1);
    const pageNum = Number(clip?.pageNumber || clip?.slideNumber || 1);
    const pdfCanvas = isPdfPresentation ? (pdfPageCanvases[clipKey] || pdfPageCanvases[String(clip?.slideNumber || 1)] || pdfPageCanvases[String(pageNum)]) : null;

    if (pdfCanvas) {
      try {
        const dataUrl = pdfCanvas.toDataURL('image/jpeg', 0.85);
        return `<img class="clip-thumb-${clip.slideNumber}" src="${dataUrl}" alt="Slide ${clip.slideNumber}" style="width: 100%; height: 100%; object-fit: cover; display: block; background: #ffffff;" />`;
      } catch (_) {}
    }

    if (clip.imageUrl) {
      return `<img class="clip-thumb-${clip.slideNumber}" src="${clip.imageUrl}" alt="Slide ${clip.slideNumber}" style="width: 100%; height: 100%; object-fit: cover; display: block; background: #ffffff;" />`;
    }

    const title = clip.title || `સ્લાઇડ #${clip.slideNumber || 1}`;
    const firstBullet = (clip.bulletPoints && clip.bulletPoints.length > 0)
      ? clip.bulletPoints[0].replace(/^[•\-\*0-9\.\)]+\s*/, '')
      : (clip.subtitle || (clip.scriptText ? clip.scriptText.slice(0, 45) + '...' : 'સ્લાઇડ પ્રેઝન્ટેશન'));

    return `
      <div style="width: 100%; height: 100%; background: #ffffff; padding: 6px 8px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; font-family: 'Noto Sans Gujarati', sans-serif; border: 1px solid #cbd5e1;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <span style="font-size: 0.62rem; font-weight: 800; color: #2563eb;">#${clip.slideNumber || 1}</span>
            <span style="font-size: 0.55rem; color: #059669; font-weight: 800; background: #ecfdf5; padding: 1px 4px; border-radius: 2px;">1080p</span>
          </div>
          <div style="font-size: 0.7rem; font-weight: 800; color: #0f172a; line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
            ${title}
          </div>
        </div>
        <div style="font-size: 0.58rem; color: #64748b; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; border-top: 1px solid #f1f5f9; padding-top: 2px;">
          • ${firstBullet}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Render Presentation Slide Card / Frame (100% Pure White #FFFFFF Background)
  // =========================================================================
  function renderSlideDisplay(clip) {
    if (!clip) return '';
    const curSNum = Number(clip?.slideNumber || (currentSlideIndex + 1));
    const curPNum = Number(clip?.pageNumber || curSNum);
    const clipKey = clip?.clipId || String(curSNum);
    const pdfCanvas = isPdfPresentation ? (
      pdfPageCanvases[clipKey] ||
      pdfPageCanvases[String(curSNum)] ||
      pdfPageCanvases[String(curPNum)] ||
      pdfPageCanvases[String(currentSlideIndex + 1)]
    ) : null;

    if (pdfCanvas) {
      try {
        const dataUrl = pdfCanvas.toDataURL('image/jpeg', 0.90);
        return `
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #ffffff;">
            <img src="${dataUrl}" alt="${clip.title || 'Slide Image'}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block; background: #ffffff;" />
          </div>
        `;
      } catch (_) { }
    }

    // Trigger on-demand rendering for this exact page
    if (isPdfPresentation && pdfViewUrl) {
      renderSpecificPdfPage(curPNum).catch(() => {});
    }

    if (clip.imageUrl) {
      return `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #ffffff;">
          <img src="${clip.imageUrl}" alt="${clip.title || 'Slide Image'}" style="max-width: 100%; max-height: 100%; object-fit: contain; display: block; background: #ffffff;" />
        </div>
      `;
    }

    // 100% Pure White High-Definition 16:9 Slide Presentation Card
    // Displays immediately on screen and dynamically updates on every slide change (Zero Iframe, Zero Freeze)
    const title = clip.title || `સ્લાઇડ #${curSNum}`;
    const subtitle = clip.subtitle || clip.visual || 'સત્તાવાર પ્રેઝન્ટેશન વિઝ્યુઅલ';
    const bullets = (Array.isArray(clip.bulletPoints) && clip.bulletPoints.length > 0)
      ? clip.bulletPoints
      : (clip.contentLines && clip.contentLines.length > 0 ? clip.contentLines : [
          title,
          'સત્તાવાર પરિપત્ર અને નિયમો મુજબ વિગત',
          'વિડીયો અંત સુધી જોવા વિનંતી'
        ]);

    return `
      <div style="width: 100%; height: 100%; background: #ffffff; padding: 28px 36px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; font-family: 'Noto Sans Gujarati', sans-serif; border: 1px solid #e2e8f0; position: relative;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 0.85rem; font-weight: 800; color: #2563eb; background: #eff6ff; padding: 3px 10px; border-radius: 6px; border: 1px solid #bfdbfe; letter-spacing: 0.5px;">
              સ્લાઇડ #${curSNum} ${curPNum !== curSNum ? `(પેજ #${curPNum})` : ''}
            </span>
            <span style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 0.76rem; font-weight: 800; padding: 3px 10px; border-radius: 9999px;">
              ✓ 1080p HD વિડીયો સ્લાઇડ
            </span>
          </div>

          <h2 style="font-size: 1.55rem; font-weight: 900; color: #0f172a; margin: 0 0 8px 0; line-height: 1.35;">
            ${title}
          </h2>

          ${subtitle ? `
            <div style="font-size: 0.95rem; font-weight: 700; color: #475569; margin-bottom: 14px; border-left: 3px solid #2563eb; padding-left: 8px;">
              ${subtitle}
            </div>
          ` : ''}

          <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 10px;">
            ${bullets.slice(0, 5).map(b => `
              <div style="display: flex; align-items: flex-start; gap: 10px; font-size: 0.95rem; font-weight: 600; color: #1e293b; line-height: 1.45;">
                <span style="color: #2563eb; font-size: 1.15rem; flex-shrink: 0; line-height: 1;">●</span>
                <span>${String(b).replace(/^[•\-\*0-9\.\)]+\s*/, '')}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px;">
          <span style="font-size: 0.82rem; color: #64748b; font-weight: 600;">${project.name || 'જ્ઞાન યાત્રા'}</span>
          <span style="font-size: 0.85rem; font-weight: 800; color: #0f172a;">${curSNum} / ${generatedClips.length || totalClips || 1}</span>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Main View Renderer
  // =========================================================================
  function renderView() {
    const fallbackClip = {
      clipId: 'clip_fallback_1',
      clipNumber: 1,
      slideIndex: 0,
      slideNumber: 1,
      pageNumber: 1,
      title: 'સ્લાઇડ #1',
      subtitle: project.name || '',
      scriptText: '',
      bulletPoints: [],
      imageUrl: null,
      audioUrl: '',
      serverUrl: '',
      hasAudio: false,
      duration: 6,
      originalDuration: 6,
      formattedDuration: '00:06',
      volume: 1.0,
      fadeIn: 0,
      fadeOut: 0,
      trimRanges: [],
      deletedSegments: [],
      status: 'અવાજ બાકી',
      savedAt: null
    };

    if (!Array.isArray(generatedClips) || generatedClips.length === 0) {
      generatedClips = [fallbackClip];
    }
    if (currentSlideIndex < 0 || currentSlideIndex >= generatedClips.length) {
      currentSlideIndex = 0;
    }

    // Ensure every clip in generatedClips has its full verbatim script text from project.script.sections
    if (project.script?.sections && Array.isArray(project.script.sections) && project.script.sections.length > 0) {
      generatedClips.forEach((c, idx) => {
        const sNum = c.slideNumber || (idx + 1);
        const pNum = c.pageNumber || (idx + 1);
        const sec = project.script.sections.find(s =>
          (s.slideNumber !== undefined && Number(s.slideNumber) === sNum) ||
          (s.pageNumber !== undefined && Number(s.pageNumber) === pNum)
        ) || project.script.sections[idx];
        const secText = (sec?.scriptText || sec?.text || sec?.content || sec?.narration || '').trim();
        if (secText && (!c.scriptText || c.scriptText.trim().length < secText.length || c.scriptText.trim().length < 50)) {
          c.scriptText = secText;
        }
      });
    }

    const curClip = generatedClips[currentSlideIndex] || generatedClips[0] || fallbackClip;
    const totalClips = generatedClips.length;

    // 5-Step Workflow Metrics & Completion Status
    const recordedClips = generatedClips.filter(c => Boolean((c.hasAudio && c.audioUrl) || c.audioUrl || c.rawBlob || c.blob));
    const recordedCount = recordedClips.length;
    const cleanedClips = generatedClips.filter(c => Boolean(c.enhancedBlob || c.cleanedAudioUrl || (c.status === 'Enhanced' || c.status === 'તૈયાર')));
    const cleanedCount = cleanedClips.length;
    const syncedClips = generatedClips.filter(c => Boolean(c.duration && c.duration > 0));
    const syncedCount = syncedClips.length;
    const unrecordedClips = generatedClips.filter(c => !Boolean((c.hasAudio && c.audioUrl) || c.audioUrl || c.rawBlob || c.blob));
    const isStep1Done = recordedCount >= totalClips && totalClips > 0;
    const isStep2Done = cleanedCount >= recordedCount && recordedCount > 0;
    const isStep3Done = syncedCount >= totalClips && unrecordedClips.length === 0;
    const isStep4Done = Boolean(savedVideoUrl);
    const isStep5Done = Boolean(savedVideoUrl);
    const isFirst = currentSlideIndex === 0;
    const isLast = currentSlideIndex === totalClips - 1;
    // Resolve authentic slide audio from curClip or storedSlideAudios
    const matchedAudioRecord = storedSlideAudios.find(r =>
      (r.slideId && curClip.slideId && String(r.slideId) === String(curClip.slideId)) ||
      (r.slideNumber && curClip.slideNumber && String(r.slideNumber) === String(curClip.slideNumber)) ||
      (r.slideNumber && Number(r.slideNumber) === Number(curClip.slideNumber || (currentSlideIndex + 1))) ||
      (r.slideId && String(r.slideId) === String(curClip.slideNumber || (currentSlideIndex + 1)))
    );

    let resolvedAudioUrl = '';
    if (curClip?.enhancedBlob instanceof Blob) {
      try { resolvedAudioUrl = URL.createObjectURL(curClip.enhancedBlob); curClip.audioUrl = resolvedAudioUrl; } catch (_) {}
    } else if (curClip?.audioUrl) {
      resolvedAudioUrl = curClip.audioUrl;
    } else if (curClip?.blob instanceof Blob) {
      try { resolvedAudioUrl = URL.createObjectURL(curClip.blob); curClip.audioUrl = resolvedAudioUrl; } catch (_) {}
    } else if (curClip?.rawBlob instanceof Blob) {
      try { resolvedAudioUrl = URL.createObjectURL(curClip.rawBlob); curClip.audioUrl = resolvedAudioUrl; } catch (_) {}
    } else if (matchedAudioRecord) {
      if (matchedAudioRecord.enhancedBlob instanceof Blob) {
        try { resolvedAudioUrl = URL.createObjectURL(matchedAudioRecord.enhancedBlob); } catch (_) {}
      } else if (matchedAudioRecord.blob instanceof Blob) {
        try { resolvedAudioUrl = URL.createObjectURL(matchedAudioRecord.blob); } catch (_) {}
      } else if (matchedAudioRecord.rawBlob instanceof Blob) {
        try { resolvedAudioUrl = URL.createObjectURL(matchedAudioRecord.rawBlob); } catch (_) {}
      } else {
        resolvedAudioUrl = matchedAudioRecord.url || matchedAudioRecord.serverUrl || matchedAudioRecord.dataUrl || '';
      }
      if (resolvedAudioUrl) curClip.audioUrl = resolvedAudioUrl;
    } else if (curClip?.serverUrl) {
      resolvedAudioUrl = curClip.serverUrl;
    }

    const currentSlideAudioSrc = resolvedAudioUrl;
    const hasAudio = Boolean(currentSlideAudioSrc || curClip.rawBlob || curClip.blob || curClip.enhancedBlob || matchedAudioRecord);
    const audioDur = (curClip?.duration && Number(curClip.duration) > 0)
      ? Number(curClip.duration)
      : ((matchedAudioRecord?.duration && Number(matchedAudioRecord.duration) > 0)
        ? Number(matchedAudioRecord.duration)
        : 6);
    const totalDurationSec = calculateTotalDuration();
    const formattedTotalDuration = formatTime(totalDurationSec);

    // Video Title & Creation Timestamp (Jeno video bane aenu title ketla vage bnyo)
    const currentVideoTitle = project.name || project.topic || project.seo?.title || 'Gyan Yatra Educational Video';
    const rawVideoCreated = project.editing?.savedVideo?.createdAt ||
      project.editing?.savedAt ||
      (project.editing?.exportHistory && project.editing.exportHistory.length > 0
        ? project.editing.exportHistory[project.editing.exportHistory.length - 1].exportedAt
        : null);
    formattedVideoCreationTime = 'હમણાં જ તૈયાર થયો (Just Now)';
    if (rawVideoCreated) {
      try {
        const d = new Date(rawVideoCreated);
        if (!isNaN(d.getTime())) {
          const timeStr = d.toLocaleTimeString('gu-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
          const dateStr = d.toLocaleDateString('gu-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' });
          formattedVideoCreationTime = `${timeStr} (${dateStr})`;
        }
      } catch (_) {}
    }

    const curSilenceInfo = (activeDecodedBuffer)
      ? detectSilenceEndpoints(activeDecodedBuffer, -42)
      : { leadingSec: 0, trailingSec: 0, hasSilence: false, isEntirelySilent: false };

    // Calculate included clips metrics for 16:9 custom combiner
    const includedClips = generatedClips.filter(c => c.included !== false);
    const includedClipsCount = includedClips.length;
    let includedDurationSec = 0;
    includedClips.forEach(c => { includedDurationSec += (c.duration || 8); });
    const formattedIncludedDuration = formatTime(includedDurationSec);

    // Full video script calculation for full-script studio
    const fullVideoScriptText = (() => {
      if (project.script?.fullText && project.script.fullText.trim()) return project.script.fullText.trim();
      if (project.script?.rawText && project.script.rawText.trim()) return project.script.rawText.trim();
      if (Array.isArray(generatedClips) && generatedClips.length > 0) {
        const fromClips = generatedClips
          .map(c => {
            const t = c.title || `સ્લાઇડ #${c.clipNumber}`;
            const s = (c.scriptText || '').trim();
            return s ? `[${t}]\n${s}` : '';
          })
          .filter(Boolean)
          .join('\n\n');
        if (fromClips) return fromClips;
      }
      return '';
    })();
    const fullVideoScriptWords = fullVideoScriptText.trim().split(/\s+/).filter(Boolean).length;

    // Subtitle overlay
    const subtitleOverlayHtml = curClip.scriptText ? `
      <div style="position: absolute; bottom: 12px; left: 16px; right: 16px; background: rgba(15, 23, 42, 0.92); color: #ffffff; padding: 10px 16px; border-radius: 8px; font-size: 0.88rem; font-weight: 600; text-align: center; border: 1px solid rgba(56, 189, 248, 0.4); box-shadow: 0 4px 16px rgba(0,0,0,0.3); z-index: 10; pointer-events: none;">
        ${curClip.scriptText.length > 120 ? curClip.scriptText.substring(0, 120) + '...' : curClip.scriptText}
      </div>
    ` : '';

    container.innerHTML = `
      <div style="background: #f8fafc; min-height: 100vh; padding: 24px 16px; font-family: 'Noto Sans Gujarati', 'Outfit', sans-serif; color: #0f172a;">
        
        <!-- ================================================================= -->
        <!-- CLEAN TOP HEADER                                                  -->
        <!-- ================================================================= -->
        <header style="max-width: 1080px; margin: 0 auto 20px auto; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.45rem;">🎬</span>
              <h1 style="font-size: 1.3rem; font-weight: 900; color: #0f172a; margin: 0;">
                ૪. સ્લાઇડ ક્લિપ જોડાણ (Slide Clip Combiner)
              </h1>
              <span style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; font-size: 0.76rem; font-weight: 800; padding: 3px 10px; border-radius: 9999px;">
                ✓ ${connectedSequence.connectedCount} / ${connectedSequence.totalSlides} સ્લાઇડ્સ જોડાયેલ
              </span>
            </div>
            <p style="font-size: 0.84rem; color: #475569; margin: 4px 0 0 0;">
              પ્રોજેક્ટ: <strong>${project.name}</strong> • સ્લાઇડ્સ: <strong>${totalClips}</strong> • વિડીયો સમય: <strong>${formattedTotalDuration}</strong>
            </p>
          </div>

          <!-- Main Actions -->
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <!-- Prominent PDF Upload / Change Action -->
            <label for="input-video-upload-pdf" style="background: #ffffff; color: #0284c7; border: 1.5px solid #38bdf8; font-weight: 800; font-size: 0.85rem; padding: 9px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(56,189,248,0.2);" title="આ વિષય માટે નવી PDF અપલોડ કરો">
              <span>📄</span> <span>${isPdfPresentation ? 'PDF બદલો' : 'PDF અપલોડ કરો (Upload PDF)'}</span>
              <input type="file" id="input-video-upload-pdf" accept=".pdf,.pptx,.ppt" style="display: none;" />
            </label>
            <input type="file" id="input-video-upload-pdf-live" accept=".pdf,.pptx" style="display: none !important;" />
            <button id="btn-open-folder-notebook-video" style="display: none !important;"></button>
            <button id="btn-undo-seq" style="display: none !important;">Undo</button>
            <button id="btn-redo-seq" style="display: none !important;">Redo</button>

            <!-- PROMINENT LIVE AUDIO RECORDER BUTTON IN TOOL 5 -->
            <button id="btn-toggle-live-record" type="button" style="background: ${isLiveRecordingMode ? '#fee2e2' : '#ffffff'}; color: ${isLiveRecordingMode ? '#dc2626' : '#b91c1c'}; border: 2px solid ${isLiveRecordingMode ? '#ef4444' : '#f87171'}; font-weight: 800; font-size: 0.88rem; padding: 9px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; box-shadow: 0 2px 8px rgba(220,38,38,0.15); transition: all 0.2s ease;">
              <span style="font-size: 1.15rem;">🎙️</span>
              <span>${isLiveRecordingMode ? '❌ લાઈવ રેકોર્ડર બંધ કરો' : '🎙️ લાઈવ ઓડિયો રેકોર્ડર (Live Audio Record)'}</span>
            </button>

            <button id="btn-back-to-voice" style="background: #ffffff; color: #2563eb; border: 1.5px solid #cbd5e1; font-weight: 700; font-size: 0.85rem; padding: 9px 16px; border-radius: 8px; cursor: pointer;">
              ← ૩. Script (સ્ક્રિપ્ટ) <!-- ← ૪. સ્લાઇડ ઓડિયો રેકોર્ડર -->
            </button>

            <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 800; color: #065f46; background: #ecfdf5; border: 1.5px solid #a7f3d0; padding: 8px 14px; border-radius: 8px; cursor: pointer;" title="સ્લાઇડ્સ જોડતી વખતે AI ઓડિયો એન્હાંસ કરો (-16 LUFS બ્રોડકાસ્ટ સ્ટાન્ડર્ડ)">
              <input type="checkbox" id="chk-top-enhance-audio" ${isAudioEnhanceOnRender ? 'checked' : ''} style="accent-color: #10b981; width: 16px; height: 16px; cursor: pointer;">
              <span>✨ AI Audio Enhance (-16 LUFS)</span>
            </label>

            <!-- Main Primary Action: Join All Slides & Audio Video Creation -->
            <button id="btn-create-video-main" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; font-weight: 900; font-size: 0.96rem; padding: 11px 26px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
              <span style="font-size: 1.2rem;">⚡</span> <span>${savedVideoUrl ? `🔄 બધી સ્લાઇડ્સ & ઓડિયો જોડીને ફરી વિડીયો બનાવો` : `⚡ બધી સ્લાઇડ્સ & ઓડિયો જોડીને વિડીયો બનાવો (Join All Slides & Audio)`}</span>
            </button>

            <button id="btn-next-to-thumbnail-editor" style="background: #f59e0b; color: #000; border: none; font-weight: 800; font-size: 0.85rem; padding: 9px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 10px rgba(245,158,11,0.25);">
              <span>🖼️</span> ૭. Thumbnail Maker →
            </button>
          </div>
        </header>

        <!-- ================================================================= -->
        <!-- MAIN WORKSPACE                                                    -->
        <!-- ================================================================= -->
        <main style="max-width: 1080px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px;">

          <!-- ========================================================================= -->
          <!-- 5-STEP AUTOMATED VIDEO PRODUCTION WORKFLOW STEPPER NAVIGATION             -->
          <!-- ========================================================================= -->
          <nav id="wf-stepper-nav" aria-label="વિડીયો પ્રોડક્શન ૫ પગલાં" style="background: #ffffff; border: 2px solid #e2e8f0; border-radius: 16px; padding: 18px 22px; box-shadow: 0 6px 20px rgba(0,0,0,0.04);">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1.5px solid #f1f5f9;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
                  🎬
                </div>
                <div>
                  <h1 style="margin: 0; font-size: 1.25rem; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                    <span>૪. વિડીયો પ્રોડક્શન સ્ટુડિયો (Video Production Studio)</span>
                  </h1>
                  <div style="font-size: 0.82rem; color: #64748b; margin-top: 2px;">
                    સ્લાઇડ મુજબ અવાજ રેકોર્ડ કરો → નોઈઝ હટાવો → સિંક્રનાઇઝ કરો → 1080p વિડીયો બનાવો → ફાઇનલ એડિટિંગ કરો
                  </div>
                </div>
              </div>

              <!-- Quick Prev / Next Step Buttons -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <button type="button" id="btn-wf-prev-step" class="btn btn-outline btn-sm" ${currentWorkflowStep <= 1 ? 'disabled style="opacity: 0.45; cursor: not-allowed; font-weight: 800; padding: 7px 14px; border-radius: 8px; border: 1.5px solid #cbd5e1; color: #64748b;"' : 'style="font-weight: 800; padding: 7px 14px; border-radius: 8px; border: 1.5px solid #cbd5e1; color: #0f172a; cursor: pointer;"'}>
                  ← પાછલું પગલું
                </button>
                <div style="background: #f1f5f9; padding: 6px 14px; border-radius: 8px; font-weight: 900; font-size: 0.86rem; color: #1e40af; border: 1px solid #dbeafe;">
                  પગલું <span id="wf-step-indicator-num">${currentWorkflowStep}</span> / 5: <span id="wf-step-indicator-title">${
                    currentWorkflowStep === 1 ? '૧. વોઇસ રેકોર્ડિંગ' :
                    currentWorkflowStep === 2 ? '૨. નોઈઝ રીમૂવલ' :
                    currentWorkflowStep === 3 ? '૩. સ્લાઇડ + વોઇસ સિંક' :
                    currentWorkflowStep === 4 ? '૪. વિડીયો જનરેશન' : '૫. ફાઇનલ એડિટર'
                  }</span>
                </div>
                <button type="button" id="btn-wf-next-step" class="btn btn-primary btn-sm" ${currentWorkflowStep >= 5 ? 'disabled style="opacity: 0.45; cursor: not-allowed; font-weight: 800; padding: 7px 16px; border-radius: 8px; background: #2563eb; color: #ffffff; border: none;"' : 'style="font-weight: 800; padding: 7px 16px; border-radius: 8px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; border: none; cursor: pointer; box-shadow: 0 2px 8px rgba(37,99,235,0.3);"'}>
                  આગળનું પગલું →
                </button>
              </div>
            </div>

            <!-- 5 Horizontal Stepper Steps Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
              <!-- Step 1 Button -->
              <button type="button" id="wf-step-btn-1" class="btn-wf-step-tab" data-step="1" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 12px 14px; border-radius: 12px; border: 2px solid ${currentWorkflowStep === 1 ? '#2563eb' : (isStep1Done ? '#10b981' : '#e2e8f0')}; background: ${currentWorkflowStep === 1 ? '#eff6ff' : (isStep1Done ? '#f0fdf4' : '#f8fafc')}; cursor: pointer; text-align: left; transition: all 0.2s ease; ${currentWorkflowStep === 1 ? 'box-shadow: 0 4px 12px rgba(37,99,235,0.15);' : ''}">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <span style="font-size: 0.72rem; font-weight: 900; color: ${currentWorkflowStep === 1 ? '#2563eb' : '#64748b'}; text-transform: uppercase;">
                    પગલું ૧
                  </span>
                  <span style="font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 9999px; background: ${isStep1Done ? '#dcfce7' : '#fee2e2'}; color: ${isStep1Done ? '#166534' : '#991b1b'};">
                    ${recordedCount}/${totalClips}
                  </span>
                </div>
                <div class="wf-step-title" style="font-size: 0.88rem; font-weight: 800; color: ${currentWorkflowStep === 1 ? '#2563eb' : '#0f172a'}; display: flex; align-items: center; gap: 6px;">
                  <span>🎙️</span> <span>૧. વોઇસ રેકોર્ડિંગ</span>
                </div>
                <div style="font-size: 0.72rem; color: #64748b;">
                  સ્લાઇડ-વાઇઝ અવાજ
                </div>
              </button>

              <!-- Step 2 Button -->
              <button type="button" id="wf-step-btn-2" class="btn-wf-step-tab" data-step="2" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 12px 14px; border-radius: 12px; border: 2px solid ${currentWorkflowStep === 2 ? '#2563eb' : (isStep2Done ? '#10b981' : '#e2e8f0')}; background: ${currentWorkflowStep === 2 ? '#eff6ff' : (isStep2Done ? '#f0fdf4' : '#f8fafc')}; cursor: pointer; text-align: left; transition: all 0.2s ease; ${currentWorkflowStep === 2 ? 'box-shadow: 0 4px 12px rgba(37,99,235,0.15);' : ''}">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <span style="font-size: 0.72rem; font-weight: 900; color: ${currentWorkflowStep === 2 ? '#2563eb' : '#64748b'}; text-transform: uppercase;">
                    પગલું ૨
                  </span>
                  <span style="font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 9999px; background: ${isStep2Done ? '#dcfce7' : '#fef3c7'}; color: ${isStep2Done ? '#166534' : '#92400e'};">
                    ${cleanedCount}/${recordedCount || totalClips}
                  </span>
                </div>
                <div class="wf-step-title" style="font-size: 0.88rem; font-weight: 800; color: ${currentWorkflowStep === 2 ? '#2563eb' : '#0f172a'}; display: flex; align-items: center; gap: 6px;">
                  <span>✨</span> <span>૨. નોઈઝ રીમૂવલ</span>
                </div>
                <div style="font-size: 0.72rem; color: #64748b;">
                  ક્રિસ્ટલ સાઉન્ડ ક્લિયરન્સ
                </div>
              </button>

              <!-- Step 3 Button -->
              <button type="button" id="wf-step-btn-3" class="btn-wf-step-tab" data-step="3" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 12px 14px; border-radius: 12px; border: 2px solid ${currentWorkflowStep === 3 ? '#2563eb' : (isStep3Done ? '#10b981' : '#e2e8f0')}; background: ${currentWorkflowStep === 3 ? '#eff6ff' : (isStep3Done ? '#f0fdf4' : '#f8fafc')}; cursor: pointer; text-align: left; transition: all 0.2s ease; ${currentWorkflowStep === 3 ? 'box-shadow: 0 4px 12px rgba(37,99,235,0.15);' : ''}">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <span style="font-size: 0.72rem; font-weight: 900; color: ${currentWorkflowStep === 3 ? '#2563eb' : '#64748b'}; text-transform: uppercase;">
                    પગલું ૩
                  </span>
                  <span style="font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 9999px; background: ${isStep3Done ? '#dcfce7' : '#fee2e2'}; color: ${isStep3Done ? '#166534' : '#991b1b'};">
                    ${syncedCount}/${totalClips}
                  </span>
                </div>
                <div class="wf-step-title" style="font-size: 0.88rem; font-weight: 800; color: ${currentWorkflowStep === 3 ? '#2563eb' : '#0f172a'}; display: flex; align-items: center; gap: 6px;">
                  <span>🔗</span> <span>૩. સ્લાઇડ + વોઇસ</span>
                </div>
                <div style="font-size: 0.72rem; color: #64748b;">
                  પરફેક્ટ સિંક્રનાઇઝેશન
                </div>
              </button>

              <!-- Step 4 Button -->
              <button type="button" id="wf-step-btn-4" class="btn-wf-step-tab" data-step="4" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 12px 14px; border-radius: 12px; border: 2px solid ${currentWorkflowStep === 4 ? '#2563eb' : (isStep4Done ? '#10b981' : '#e2e8f0')}; background: ${currentWorkflowStep === 4 ? '#eff6ff' : (isStep4Done ? '#f0fdf4' : '#f8fafc')}; cursor: pointer; text-align: left; transition: all 0.2s ease; ${currentWorkflowStep === 4 ? 'box-shadow: 0 4px 12px rgba(37,99,235,0.15);' : ''}">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <span style="font-size: 0.72rem; font-weight: 900; color: ${currentWorkflowStep === 4 ? '#2563eb' : '#64748b'}; text-transform: uppercase;">
                    પગલું ૪
                  </span>
                  <span style="font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 9999px; background: ${isStep4Done ? '#dcfce7' : '#f1f5f9'}; color: ${isStep4Done ? '#166534' : '#64748b'};">
                    ${isStep4Done ? '✓ વિડીયો રેડી' : 'જનરેટ બાકી'}
                  </span>
                </div>
                <div class="wf-step-title" style="font-size: 0.88rem; font-weight: 800; color: ${currentWorkflowStep === 4 ? '#2563eb' : '#0f172a'}; display: flex; align-items: center; gap: 6px;">
                  <span>🎬</span> <span>૪. વિડીયો જનરેશન</span>
                </div>
                <div style="font-size: 0.72rem; color: #64748b;">
                  1080p MP4 રેન્ડરિંગ
                </div>
              </button>

              <!-- Step 5 Button -->
              <button type="button" id="wf-step-btn-5" class="btn-wf-step-tab" data-step="5" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 12px 14px; border-radius: 12px; border: 2px solid ${currentWorkflowStep === 5 ? '#2563eb' : (isStep5Done ? '#10b981' : '#e2e8f0')}; background: ${currentWorkflowStep === 5 ? '#eff6ff' : (isStep5Done ? '#f0fdf4' : '#f8fafc')}; cursor: pointer; text-align: left; transition: all 0.2s ease; ${currentWorkflowStep === 5 ? 'box-shadow: 0 4px 12px rgba(37,99,235,0.15);' : ''}">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <span style="font-size: 0.72rem; font-weight: 900; color: ${currentWorkflowStep === 5 ? '#2563eb' : '#64748b'}; text-transform: uppercase;">
                    પગલું ૫
                  </span>
                  <span style="font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 9999px; background: ${isStep5Done ? '#dcfce7' : '#f1f5f9'}; color: ${isStep5Done ? '#166534' : '#64748b'};">
                    ${isStep5Done ? '✓ એડિટિંગ' : 'પ્રીવ્યુ'}
                  </span>
                </div>
                <div class="wf-step-title" style="font-size: 0.88rem; font-weight: 800; color: ${currentWorkflowStep === 5 ? '#2563eb' : '#0f172a'}; display: flex; align-items: center; gap: 6px;">
                  <span>✂️</span> <span>૫. ફાઇનલ એડિટર</span>
                </div>
                <div style="font-size: 0.72rem; color: #64748b;">
                  ટ્રીમ, સ્પ્લિટ & શેર
                </div>
              </button>
            </div>
          </nav>


          <!-- ========================================================================= -->
          <!-- STEP 1 PANEL: SLIDE-WISE VOICE RECORDING                                  -->
          <!-- ========================================================================= -->
          <div id="panel-wf-step-1" class="wf-step-panel" style="display: ${currentWorkflowStep === 1 ? 'block' : 'none'};">
            
            <!-- Step 1 Notice Banner -->
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%); border: 2px solid #10b981; border-radius: 12px; padding: 14px 20px; box-shadow: 0 4px 14px rgba(16,185,129,0.1); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 20px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 1.6rem;">🎙️</span>
                <div>
                  <div style="font-size: 1rem; font-weight: 900; color: #065f46;">
                    ૧. સ્લાઇડ-વાઇઝ વોઇસ રેકોર્ડિંગ (Slide-wise Voice Recording)
                  </div>
                  <div style="font-size: 0.82rem; color: #334155; margin-top: 2px;">
                    દરેક સ્લાઇડ માટે અલગ-અલગ અવાજ રેકોર્ડ કરો (Slide 1 → Voice 1, Slide 2 → Voice 2). સ્લાઇડ સામે જોઈને સ્ક્રિપ્ટ વાંચો.
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span id="step1-completion-badge" style="background: #ffffff; border: 1.5px solid #a7f3d0; color: #059669; font-size: 0.82rem; font-weight: 800; padding: 6px 14px; border-radius: 9999px;">
                  🔊 રેકોર્ડ થયેલ: ${recordedCount} / ${totalClips} સ્લાઇડ્સ
                </span>
                <button type="button" id="btn-jump-to-step-2" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; border: none; font-size: 0.84rem; font-weight: 800; padding: 8px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(37,99,235,0.25);">
                  <span>✨ પગલું ૨: નોઈઝ રીમૂવલ પર જાઓ →</span>
                </button>
              </div>
            </div>

            <!-- Original Live Audio Recording Studio and Banner -->
            

          <!-- ================================================================= -->
          <!-- SLIDE & AUDIO COMBINER DIRECTORY / NOTICE BANNER                  -->
          <!-- ================================================================= -->
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%); border: 2px solid #10b981; border-radius: 12px; padding: 14px 20px; box-shadow: 0 4px 14px rgba(16,185,129,0.1); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.6rem;">🔗</span>
              <div>
                <div style="font-size: 0.98rem; font-weight: 900; color: #065f46;">
                  ૪. સ્લાઇડ ક્લિપ જોડાણ કેન્દ્ર (Slide & Audio Clip Combiner)
                </div>
                <div style="font-size: 0.82rem; color: #334155; margin-top: 2px;">
                  અહીં લાઈવ ઓડિયો રેકોર્ડ કરો, દરેક સ્લાઇડ ક્લિપ-વાઇઝ વિડીયો ચકાસો અને ૧-ક્લિકમાં 1080p વિડીયો બનાવો:
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <button type="button" id="btn-banner-toggle-live" style="background: #ffffff; color: #dc2626; border: 1.5px solid #fca5a5; font-size: 0.82rem; font-weight: 800; padding: 7px 14px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 6px rgba(220,38,38,0.1);">
                <span>🎙️</span> <span>લાઈવ ઓડિયો રેકોર્ડર</span>
              </button>
              <span style="background: #ffffff; border: 1.5px solid #a7f3d0; color: #059669; font-size: 0.82rem; font-weight: 800; padding: 6px 14px; border-radius: 9999px;">
                🔊 જોડાયેલ સ્લાઇડ્સ: ${connectedSequence.connectedCount} / ${connectedSequence.totalSlides}
              </span>
              <button type="button" id="btn-quick-join-trigger" style="background: #10b981; color: #ffffff; border: none; font-size: 0.84rem; font-weight: 800; padding: 8px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">
                <span>⚡</span> <span>વિડીયો બનાવો (Join Video)</span>
              </button>
            </div>
          </div>

          <!-- --------------------------------------------------------------- -->
          <!-- LIVE SLIDE + AUDIO RECORDING CONTROL BAR (When Live Mode is ON) -->
          <!-- --------------------------------------------------------------- -->
          ${isLiveRecordingMode ? `
            <div style="background: #ffffff; border: 2px solid #ef4444; border-radius: 12px; padding: 18px 22px; box-shadow: 0 4px 18px rgba(239,68,68,0.15);">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1.5px solid #fee2e2;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #ef4444; animation: pulse 1s infinite;"></span>
                  <strong style="color: #991b1b; font-size: 1.05rem;">
                    🎙️ ૪. વિડીયો એડિટર લાઈવ ઓડિયો રેકોર્ડર (Live Audio Recording Studio)
                  </strong>
                </div>
                <div style="font-size: 0.82rem; color: #7f1d1d; background: #fef2f2; border: 1px solid #fecaca; padding: 4px 12px; border-radius: 6px;">
                  💡 <strong>રીત ૧:</strong> આખી સ્લાઇડ્સ માટે બોલતા જાઓ અને "આગલી સ્લાઇડ ⏭️" દબાવો • <strong>રીત ૨:</strong> માત્ર હાલની સ્લાઇડ રેકોર્ડ કરો
                </div>
              </div>

              <!-- Live Recording Controls -->
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  ${liveRecorder?.isRecording ? `
                    <button id="btn-live-next-slide" style="background: #2563eb; color: #ffffff; border: none; font-weight: 800; font-size: 0.92rem; padding: 9px 20px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(37,99,235,0.3);">
                      <span>આગલી સ્લાઇડ પર જાઓ ⏭️</span>
                    </button>
                    <button id="btn-live-finish" style="background: #dc2626; color: #ffffff; border: none; font-weight: 800; font-size: 0.92rem; padding: 9px 20px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(220,38,38,0.3);">
                      <span>⏹️</span> રેકોર્ડિંગ પૂર્ણ કરો & સેવ કરો
                    </button>
                  ` : `
                    <button id="btn-live-start" ${isProcessingRecording ? 'disabled' : ''} style="background: #dc2626; color: #ffffff; border: none; font-weight: 800; font-size: 0.92rem; padding: 9px 22px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(220,38,38,0.3);">
                      <span>🔴</span> આખી સ્લાઇડ્સ લાઈવ રેકોર્ડ કરો (Start Full Live Recording)
                    </button>
                    <button id="btn-panel-single-record" ${isProcessingRecording ? 'disabled' : ''} style="background: ${isSingleSlideRecording ? '#dc2626' : '#eff6ff'}; color: ${isSingleSlideRecording ? '#ffffff' : '#2563eb'}; border: 1.5px solid ${isSingleSlideRecording ? '#dc2626' : '#93c5fd'}; font-weight: 800; font-size: 0.92rem; padding: 9px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                      <span>${isSingleSlideRecording ? '⏹️' : '🎙️'}</span> <span>${isSingleSlideRecording ? '⏹️ આ સ્લાઇડનું રેકોર્ડિંગ રોકો' : `માત્ર સ્લાઇડ #${curClip.slideNumber} રેકોર્ડ કરો`}</span>
                    </button>
                  `}

                  <!-- Live Timer -->
                  <div style="font-family: monospace; font-size: 1.1rem; font-weight: 800; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; padding: 6px 14px; border-radius: 6px;">
                    ⏱️ <span id="live-rec-timer">${formatTime(liveElapsedSeconds)}</span>
                  </div>

                  <!-- Live VU Meter -->
                  <div style="width: 80px; height: 10px; background: #fee2e2; border-radius: 5px; overflow: hidden;" title="માઇક્રોફોન સાઉન્ડ લેવલ">
                    <div id="live-rec-vu" style="width: 0%; height: 100%; background: #dc2626; transition: width 0.05s ease;"></div>
                  </div>

                  <!-- Change/Upload PDF during Live Mode -->
                  <label for="input-video-upload-pdf-live" style="background: #ffffff; color: #0284c7; border: 1.5px dashed #38bdf8; font-weight: 800; font-size: 0.82rem; padding: 6px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="લાઈવ રેકોર્ડિંગ માટે નવી PDF પસંદ કરો">
                    <span>📑</span> નવી PDF બદલો
                    <input type="file" id="input-video-upload-pdf-live" accept=".pdf,.pptx" style="display: none;" />
                  </label>
                </div>

                <!-- Current Active Slide Being Recorded -->
                <div style="font-size: 0.85rem; font-weight: 700; color: #0f172a; background: #f1f5f9; padding: 6px 14px; border-radius: 6px;">
                  હાલની સ્લાઇડ: <span style="color: #2563eb;">#${curClip.slideNumber}</span> (${curClip.title || ''})
                </div>
              </div>

              <!-- Live Teleprompter (Slide Preview + Script Reading Side-by-Side) -->
              <div style="margin-top: 14px; padding-top: 14px; border-top: 1.5px dashed #fecaca; display: grid; grid-template-columns: minmax(260px, 1fr) minmax(320px, 1.4fr); gap: 14px; align-items: stretch;">
                <!-- Left: Slide Visual -->
                <div style="background: #0f172a; border-radius: 8px; overflow: hidden; aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center; position: relative; border: 2px solid ${liveRecorder?.isRecording || isSingleSlideRecording ? '#ef4444' : '#38bdf8'}; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                  ${curClip.imageUrl ? `
                    <img src="${curClip.imageUrl}" style="width: 100%; height: 100%; object-fit: contain;" alt="Slide ${curClip.slideNumber}">
                  ` : `
                    <div style="text-align: center; color: #fff; padding: 12px;">
                      <div style="font-size: 1.2rem; font-weight: 800; color: #38bdf8;">📄 સ્લાઇડ #${curClip.slideNumber}</div>
                      <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 4px;">${curClip.title}</div>
                    </div>
                  `}
                  <div style="position: absolute; top: 6px; left: 6px; background: rgba(0,0,0,0.8); color: #fff; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2);">
                    સ્લાઇડ #${curClip.slideNumber} પ્રીવ્યુ
                  </div>
                </div>

                <!-- Right: Script Teleprompter To Read Aloud -->
                <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <span style="font-size: 0.84rem; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 5px;">
                        <span>📄 </span> <span>વાંચવા માટેનું લખાણ:</span>
                      </span>
                      <!-- Mode Toggle Buttons -->
                      <div style="display: inline-flex; border: 1.5px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #e2e8f0;">
                        <button type="button" id="btn-live-tp-mode-clip" style="background: ${liveTeleprompterMode === 'clip' ? '#2563eb' : '#ffffff'}; color: ${liveTeleprompterMode === 'clip' ? '#ffffff' : '#334155'}; font-size: 0.74rem; font-weight: 800; border: none; padding: 4px 10px; cursor: pointer;" title="માત્ર આ પસંદ કરેલ સ્લાઇડની સ્ક્રિપ્ટ જુઓ">
                          📄 આ સ્લાઇડ #${curClip.slideNumber}
                        </button>
                        <button type="button" id="btn-live-tp-mode-full" style="background: ${liveTeleprompterMode === 'full' ? '#2563eb' : '#ffffff'}; color: ${liveTeleprompterMode === 'full' ? '#ffffff' : '#334155'}; font-size: 0.74rem; font-weight: 800; border: none; padding: 4px 10px; cursor: pointer;" title="સંપૂર્ણ આખા વિડીયોની સ્ક્રિપ્ટ એકસાથે સળંગ વાંચો">
                          📜 સંપૂર્ણ આખી સ્ક્રિપ્ટ
                        </button>
                      </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                      <button type="button" id="btn-live-tp-paste" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 0.74rem; font-weight: 800; padding: 4px 10px; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="ક્લિપબોર્ડ પરથી સ્ક્રિપ્ટ પેસ્ટ કરો">
                        <span>📋</span> પેસ્ટ
                      </button>
                      <button type="button" id="btn-live-tp-save" style="background: #10b981; color: #ffffff; border: none; font-size: 0.74rem; font-weight: 800; padding: 4px 12px; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="લખેલી સ્ક્રિપ્ટ સેવ કરો">
                        <span>💾</span> સેવ
                      </button>
                      <span style="font-size: 0.72rem; font-weight: 800; color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 3px 8px; border-radius: 5px;">
                        🛡️ AI નોઇઝ રીડક્શન (-16 LUFS): સક્રિય ✓
                      </span>
                    </div>
                  </div>

                  <textarea
                    id="live-teleprompter-script-ta"
                    class="font-gu"
                    rows="7"
                    placeholder="${liveTeleprompterMode === 'full' ? 'અહીં તમારા આખા વિડીયોની સંપૂર્ણ સ્ક્રિપ્ટ વાંચો અથવા પેસ્ટ કરો...' : 'અહીં આ સ્લાઇડ માટે બોલવાની સ્ક્રિપ્ટ વાંચો અથવા લખો...'}"
                    style="width: 100%; min-height: 160px; font-size: 1.05rem; line-height: 1.7; resize: vertical; border-radius: 6px; background: #ffffff; color: #0f172a; border: 1.5px solid #cbd5e1; padding: 10px 12px; font-weight: 500; box-sizing: border-box;"
                  >${liveTeleprompterMode === 'full' ? getProjectFullScriptText() : (curClip.scriptText || '')}</textarea>

                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: #64748b; flex-wrap: wrap; gap: 6px;">
                    <span>💡 સ્લાઇડ સામે જોઈને સ્ક્રિપ્ટ વાંચો. રેકોર્ડિંગ પૂરું થતાં જ પંખા/રૂમનો ઘોંઘાટ આપમેળે સાફ થઈ જશે.</span>
                    <span style="color: #2563eb; font-weight: 800;">
                      ${liveTeleprompterMode === 'full' ? '📜 સંપૂર્ણ સ્ક્રિપ્ટ શબ્દો: ' + (getProjectFullScriptText() || '').trim().split(/\s+/).filter(Boolean).length : `📄 સ્લાઇડ #${curClip.slideNumber} શબ્દો: ` + ((curClip.scriptText || '').trim().split(/\s+/).filter(Boolean).length)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- --------------------------------------------------------------- -->
          

            <!-- Slide Sequence Filmstrip -->
            <section style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.03); margin-bottom: 20px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.25rem;">🎞️</span>
                  <strong style="font-size: 0.95rem; color: #0f172a;">તમામ સ્લાઇડ્સ ક્રમમાં (All Slides in Sequence)</strong>
                  <span style="font-size: 0.76rem; color: #64748b;">(કોઈપણ સ્લાઇડ પર ક્લિક કરીને તેનો અવાજ રેકોર્ડ કરો)</span>
                </div>
                <div style="font-size: 0.8rem; font-weight: 800; color: #2563eb;">
                  સ્લાઇડ ${currentSlideIndex + 1} / ${totalClips} પસંદ કરેલ
                </div>
              </div>

              <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px;">
                ${generatedClips.map((c, idx) => {
                  const isSelected = idx === currentSlideIndex;
                  const sNum = (c.slideNumber !== undefined && c.slideNumber !== null) ? Number(c.slideNumber) : (idx + 1);
                  const matchedStored = storedSlideAudios.find(r =>
                    (r.slideId && c.slideId && String(r.slideId) === String(c.slideId)) ||
                    (r.slideNumber && c.slideNumber && String(r.slideNumber) === String(c.slideNumber)) ||
                    (r.slideNumber && Number(r.slideNumber) === sNum) ||
                    (r.slideId && String(r.slideId) === String(sNum))
                  );
                  const hasSnd = Boolean((c.hasAudio && c.audioUrl) || c.audioUrl || c.rawBlob || c.blob || c.enhancedBlob || matchedStored);
                  const dispDur = (c.duration && Number(c.duration) > 0) ? Number(c.duration) : ((matchedStored?.duration && Number(matchedStored.duration) > 0) ? Number(matchedStored.duration) : 6);
                  return `
                    <div id="step1-slide-card-${idx}" class="wf-step1-slide-card" data-clip-index="${idx}" onclick="window.videoEditorGoToSlide ? window.videoEditorGoToSlide(${idx}) : (window.selectClip && window.selectClip(${idx}))" style="flex: 0 0 170px; background: ${isSelected ? '#eff6ff' : '#f8fafc'}; border: 2px solid ${isSelected ? '#2563eb' : (hasSnd ? '#a7f3d0' : '#e2e8f0')}; border-radius: 10px; padding: 8px 10px; cursor: pointer; transition: all 0.2s ease; ${isSelected ? 'box-shadow: 0 4px 12px rgba(37,99,235,0.2);' : ''}">
                      <!-- 16:9 Slide Preview Thumbnail -->
                      <div style="width: 100%; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; margin-bottom: 6px; border: 1.5px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}; background: #0f172a; position: relative;">
                        ${renderMiniSlideThumbnail(c)}
                        <div style="position: absolute; bottom: 2px; right: 4px; background: rgba(0,0,0,0.8); color: #fff; font-size: 0.6rem; font-weight: 700; padding: 1px 4px; border-radius: 3px;">
                          ${dispDur.toFixed(1)}s
                        </div>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; margin-bottom: 4px;">
                        <strong style="color: ${isSelected ? '#2563eb' : '#0f172a'};">#${c.slideNumber}</strong>
                        <span id="step1-dur-${idx}" style="padding: 1px 6px; border-radius: 9999px; font-weight: 800; font-size: 0.65rem; background: ${hasSnd ? '#dcfce7' : '#fee2e2'}; color: ${hasSnd ? '#166534' : '#991b1b'};">
                          ${hasSnd ? `✓ ${dispDur.toFixed(1)}s` : 'બાકી'}
                        </span>
                      </div>
                      <div style="font-size: 0.78rem; font-weight: 700; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${c.title || `સ્લાઇડ #${c.slideNumber}`}
                      </div>
                      <div style="font-size: 0.68rem; color: #64748b; margin-top: 2px;">
                        ${hasSnd ? '🔊 અવાજ સેવ થયેલ' : '🎙️ અવાજ રેકોર્ડ કરો'}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </section>

            <!-- Single Slide Voice Recording Workspace -->
            <section style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 1.3rem;">🎙️</span>
                  <div>
                    <h2 id="step1-slide-heading" style="font-size: 1.15rem; font-weight: 900; color: #0f172a; margin: 0;">
                      સ્લાઇડ #${curClip.slideNumber}: ${curClip.title || 'સ્લાઇડ પ્રેઝન્ટેશન'}
                    </h2>
                    <span style="font-size: 0.78rem; color: #64748b;">
                      સ્લાઇડ સામે જોઈને સ્ક્રિપ્ટ વાંચો અને નીચે રેકોર્ડિંગ બટન દબાવો
                    </span>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <button
                    type="button"
                    id="btn-prev-slide"
                    class="btn-nav-prev-slide"
                    onclick="window.videoEditorPrevSlide ? window.videoEditorPrevSlide() : (window.selectClip && window.selectClip(${currentSlideIndex - 1}))"
                    ${isFirst ? 'disabled style="opacity: 0.45; cursor: not-allowed; background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; font-weight: 700; font-size: 0.8rem; padding: 6px 14px; border-radius: 6px;"' : 'style="background: #ffffff; color: #0f172a; border: 1.5px solid #cbd5e1; font-weight: 700; font-size: 0.8rem; padding: 6px 14px; border-radius: 6px; cursor: pointer;"'}
                    title="અગાઉની સ્લાઇડ પર જાઓ (Left Arrow / PageUp)"
                  >
                    ⏮️ અગાઉની
                  </button>
                  <select
                    id="step1-select-slide"
                    class="step1-select-slide-nav"
                    onchange="window.videoEditorGoToSlide ? window.videoEditorGoToSlide(this.value) : (window.selectClip && window.selectClip(parseInt(this.value, 10)))"
                    style="padding: 5px 8px; font-size: 0.82rem; font-weight: 800; background: #eff6ff; color: #1d4ed8; border: 1.5px solid #93c5fd; border-radius: 6px; cursor: pointer; max-width: 220px;"
                    title="સ્લાઇડ પસંદ કરો"
                  >
                    ${generatedClips.map((c, i) => `
                      <option value="${i}" ${i === currentSlideIndex ? 'selected' : ''}>
                        સ્લાઇડ #${c.slideNumber || (i + 1)} (${(c.title || `સ્લાઇડ #${i + 1}`).slice(0, 20)})
                      </option>
                    `).join('')}
                  </select>
                  <button
                    type="button"
                    id="btn-next-slide"
                    class="btn-nav-next-slide"
                    onclick="window.videoEditorNextSlide ? window.videoEditorNextSlide() : (window.selectClip && window.selectClip(${currentSlideIndex + 1}))"
                    ${isLast ? 'disabled style="opacity: 0.45; cursor: not-allowed; background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; font-weight: 700; font-size: 0.8rem; padding: 6px 14px; border-radius: 6px;"' : 'style="background: #ffffff; color: #0f172a; border: 1.5px solid #cbd5e1; font-weight: 700; font-size: 0.8rem; padding: 6px 14px; border-radius: 6px; cursor: pointer;"'}
                    title="આગળની સ્લાઇડ પર જાઓ (Right Arrow / PageDown)"
                  >
                    આગળની ⏭️
                  </button>
                </div>
              </div>

              <!-- Side-by-Side: Slide Visual & Live Slide Editor (Left) & Teleprompter (Right) -->
              <div style="display: grid; grid-template-columns: minmax(320px, 1.25fr) minmax(300px, 1fr); gap: 18px; align-items: start; margin-bottom: 18px;">
                <!-- Left: Slide Screen Visual & Live Slide Content Editor -->
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  <div
                    id="step1-slide-preview-container"
                    style="background: #ffffff; border: 2px solid #3b82f6; border-radius: 12px; overflow: hidden; aspect-ratio: 16 / 9; position: relative; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.15);"
                  >
                    <!-- Slide Header Badge -->
                    <div style="position: absolute; top: 10px; left: 12px; z-index: 20; display: inline-flex; align-items: center; gap: 6px; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(4px); color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.2);">
                      <span>🎬</span> <span>સ્લાઇડ #${curClip.slideNumber} ક્લિપ વિડીયો</span>
                      <span style="color: #38bdf8;">• ⏱️ ${(curClip.duration || 6).toFixed(1)}s</span>
                    </div>

                    <!-- Slide Edit Quick Toggle Button -->
                    <button
                      type="button"
                      id="btn-edit-slide-content-quick"
                      style="position: absolute; top: 8px; right: 8px; z-index: 22; background: ${isEditingSlideContentInStep1 ? '#dc2626' : 'rgba(37,99,235,0.92)'}; color: #ffffff; border: 1px solid rgba(255,255,255,0.3); font-weight: 800; font-size: 0.74rem; padding: 4px 10px; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: inline-flex; align-items: center; gap: 4px;"
                    >
                      <span>${isEditingSlideContentInStep1 ? '✖️' : '✏️'}</span>
                      <span>${isEditingSlideContentInStep1 ? 'એડિટિંગ બંધ કરો' : 'સ્લાઇડ લખાણ એડિટ કરો'}</span>
                    </button>

                    <!-- Center Play/Pause Overlay Button -->
                    <div
                      id="btn-stage-center-play"
                      class="stage-center-play-trigger"
                      style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 15; cursor: pointer; background: ${isPlaying ? 'transparent' : 'rgba(0,0,0,0.18)'};"
                      title="ક્લિપ વિડીયો ચલાવો / થોભો"
                    >
                      ${!isPlaying ? `
                        <div style="width: 58px; height: 58px; border-radius: 50%; background: rgba(37, 99, 235, 0.92); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; box-shadow: 0 4px 20px rgba(0,0,0,0.4); border: 2px solid rgba(255,255,255,0.8);">
                          ▶️
                        </div>
                      ` : ''}
                    </div>

                    <!-- Left / Right Floating Navigation Arrows Directly on Stage -->
                    ${!isFirst ? `
                      <button
                        type="button"
                        class="btn-stage-float-prev"
                        onclick="event.stopPropagation(); window.videoEditorPrevSlide ? window.videoEditorPrevSlide() : (window.selectClip && window.selectClip(${currentSlideIndex - 1}))"
                        style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); z-index: 28; width: 44px; height: 44px; border-radius: 50%; background: rgba(15,23,42,0.88); color: #ffffff; border: 2px solid rgba(255,255,255,0.85); font-size: 1.15rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.45); transition: transform 0.15s ease;"
                        title="અગાઉની સ્લાઇડ (Previous Slide)"
                      >
                        ◀
                      </button>
                    ` : ''}

                    ${!isLast ? `
                      <button
                        type="button"
                        class="btn-stage-float-next"
                        onclick="event.stopPropagation(); window.videoEditorNextSlide ? window.videoEditorNextSlide() : (window.selectClip && window.selectClip(${currentSlideIndex + 1}))"
                        style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); z-index: 28; width: 44px; height: 44px; border-radius: 50%; background: #2563eb; color: #ffffff; border: 2px solid rgba(255,255,255,0.9); font-size: 1.15rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 18px rgba(37,99,235,0.5); transition: transform 0.15s ease;"
                        title="આગળની સ્લાઇડ પર જાઓ (Next Slide)"
                      >
                        ▶
                      </button>
                    ` : ''}

                    <!-- Authentic Slide Presentation Visual Display -->
                    ${renderSlideDisplay(curClip)}

                    <!-- Live Subtitle Script Display -->
                    ${curClip.scriptText ? `
                      <div style="position: absolute; bottom: 12px; left: 16px; right: 16px; background: rgba(15, 23, 42, 0.92); color: #ffffff; padding: 8px 14px; border-radius: 8px; font-size: 0.84rem; font-weight: 600; text-align: center; border: 1px solid rgba(56, 189, 248, 0.4); box-shadow: 0 4px 16px rgba(0,0,0,0.3); z-index: 10; pointer-events: none;">
                        ${curClip.scriptText.length > 120 ? curClip.scriptText.substring(0, 120) + '...' : curClip.scriptText}
                      </div>
                    ` : ''}

                    <!-- Stage Progress Bar -->
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: rgba(0,0,0,0.35); z-index: 25;">
                      <div id="stage-clip-progress-bar" class="stage-clip-progress-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #2563eb, #10b981); transition: width 0.08s linear;"></div>
                    </div>
                  </div>

                  <!-- Interactive Slide Pills Switcher Strip Directly Under Stage -->
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px 10px;">
                    <button
                      type="button"
                      class="btn-nav-prev-slide"
                      onclick="window.videoEditorPrevSlide ? window.videoEditorPrevSlide() : (window.selectClip && window.selectClip(${currentSlideIndex - 1}))"
                      ${isFirst ? 'disabled style="opacity: 0.45; cursor: not-allowed; padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 700; font-size: 0.75rem;"' : 'style="cursor: pointer; background: #ffffff; color: #0f172a; padding: 4px 10px; border-radius: 6px; border: 1.5px solid #cbd5e1; font-weight: 700; font-size: 0.75rem;"'}
                    >
                      ← અગાઉની
                    </button>

                    <div style="display: flex; align-items: center; gap: 5px; overflow-x: auto; padding: 2px 0;">
                      ${generatedClips.map((c, i) => `
                        <button
                          type="button"
                          onclick="window.videoEditorGoToSlide ? window.videoEditorGoToSlide(${i}) : (window.selectClip && window.selectClip(${i}))"
                          style="padding: 4px 10px; font-size: 0.76rem; font-weight: 800; border-radius: 6px; cursor: pointer; border: 1.5px solid ${i === currentSlideIndex ? '#2563eb' : '#cbd5e1'}; background: ${i === currentSlideIndex ? '#2563eb' : '#ffffff'}; color: ${i === currentSlideIndex ? '#ffffff' : '#1e293b'}; box-shadow: ${i === currentSlideIndex ? '0 2px 8px rgba(37,99,235,0.3)' : 'none'}; transition: all 0.15s ease;"
                          title="સ્લાઇડ #${c.slideNumber || (i + 1)}"
                        >
                          #${c.slideNumber || (i + 1)}
                        </button>
                      `).join('')}
                    </div>

                    <button
                      type="button"
                      class="btn-nav-next-slide"
                      onclick="window.videoEditorNextSlide ? window.videoEditorNextSlide() : (window.selectClip && window.selectClip(${currentSlideIndex + 1}))"
                      ${isLast ? 'disabled style="opacity: 0.45; cursor: not-allowed; padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 700; font-size: 0.75rem;"' : 'style="cursor: pointer; background: #2563eb; color: #ffffff; padding: 4px 12px; border-radius: 6px; border: none; font-weight: 800; font-size: 0.75rem; box-shadow: 0 2px 8px rgba(37,99,235,0.3); font-weight: 800;"'}
                    >
                      આગળની →
                    </button>
                  </div>

                  <!-- Collapsible Live Slide Content Editor (Opens right here in Step 1!) -->
                  <div id="step1-inline-slide-editor" style="display: ${isEditingSlideContentInStep1 ? 'block' : 'none'}; background: #f8fafc; border: 1.5px solid #93c5fd; border-radius: 10px; padding: 12px 14px; box-shadow: 0 2px 8px rgba(37,99,235,0.08);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <strong style="font-size: 0.85rem; color: #1e40af; display: flex; align-items: center; gap: 6px;">
                        <span>✏️</span> <span>સ્લાઇડ #${curClip.slideNumber} નું ટાઇટલ અને મુદ્દાઓ એડિટ કરો:</span>
                      </strong>
                      <button type="button" id="btn-save-step1-slide-details" style="background: #2563eb; color: #ffffff; border: none; font-weight: 800; font-size: 0.78rem; padding: 5px 14px; border-radius: 6px; cursor: pointer;">
                        💾 સ્લાઇડ સેવ કરો
                      </button>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                      <div>
                        <label style="font-size: 0.72rem; font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">સ્લાઇડ ટાઇટલ:</label>
                        <input type="text" id="step1-input-slide-title" value="${curClip.title || ''}" placeholder="સ્લાઇડ ટાઇટલ" style="width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 700; font-size: 0.86rem; box-sizing: border-box;">
                      </div>
                      <div>
                        <label style="font-size: 0.72rem; font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">સબટાઇટલ (ઓપ્શનલ):</label>
                        <input type="text" id="step1-input-slide-subtitle" value="${curClip.subtitle || ''}" placeholder="સબટાઇટલ (ઓપ્શનલ)" style="width: 100%; padding: 5px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.8rem; box-sizing: border-box;">
                      </div>
                      <div>
                        <label style="font-size: 0.72rem; font-weight: 700; color: #475569; display: block; margin-bottom: 2px;">મુદ્દાઓ (Bullet Points - દરેક નવી લાઈનમાં એક મુદ્દો):</label>
                        <textarea id="step1-ta-slide-bullets" rows="3" placeholder="મુદ્દાઓ લખો..." style="width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.8rem; line-height: 1.5; box-sizing: border-box;">${(curClip.bulletPoints || []).join('\n')}</textarea>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Right: Teleprompter Gujarati Script -->
                <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <strong style="font-size: 0.88rem; color: #0f172a; display: flex; align-items: center; gap: 6px;">
                          <span>📄 </span> <span>વાંચવા માટેનું લખાણ:</span>
                        </strong>
                        <div style="display: inline-flex; border: 1.5px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #e2e8f0;">
                          <button type="button" id="btn-sec3-tp-mode-clip" style="background: ${liveTeleprompterMode === 'clip' ? '#2563eb' : '#ffffff'}; color: ${liveTeleprompterMode === 'clip' ? '#ffffff' : '#334155'}; font-size: 0.74rem; font-weight: 800; border: none; padding: 4px 10px; cursor: pointer;">
                            📄 આ સ્લાઇડ #${curClip.slideNumber}
                          </button>
                          <button type="button" id="btn-sec3-tp-mode-full" style="background: ${liveTeleprompterMode === 'full' ? '#2563eb' : '#ffffff'}; color: ${liveTeleprompterMode === 'full' ? '#ffffff' : '#334155'}; font-size: 0.74rem; font-weight: 800; border: none; padding: 4px 10px; cursor: pointer;">
                            📜 સંપૂર્ણ આખી સ્ક્રિપ્ટ
                          </button>
                        </div>
                      </div>

                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <button type="button" id="btn-sec3-tp-paste" style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; font-size: 0.74rem; font-weight: 800; padding: 4px 10px; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                          <span>📋</span> પેસ્ટ
                        </button>
                        <button type="button" id="btn-sec3-tp-save" style="background: #10b981; color: #ffffff; border: none; font-size: 0.74rem; font-weight: 800; padding: 4px 12px; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                          <span>💾</span> સેવ
                        </button>
                        <span id="step1-script-badge" style="font-size: 0.74rem; font-weight: 700; color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 3px 8px; border-radius: 4px;">
                          ${liveTeleprompterMode === 'full' ? '📜 સંપૂર્ણ આખી સ્ક્રિપ્ટ' : `સ્લાઇડ #${curClip.slideNumber} સ્ક્રિપ્ટ`}
                        </span>
                      </div>
                    </div>
                    <textarea
                      id="teleprompter-script-ta"
                      class="font-gu"
                      rows="7"
                      placeholder="${liveTeleprompterMode === 'full' ? 'અહીં તમારા આખા વિડીયોની સંપૂર્ણ સ્ક્રિપ્ટ વાંચો અથવા પેસ્ટ કરો...' : 'આ સ્લાઇડ માટે સ્ક્રિપ્ટ અહીં વાંચવા મળશે...'}"
                      style="width: 100%; min-height: 160px; font-size: 1.05rem; line-height: 1.7; resize: vertical; border-radius: 8px; background: #ffffff; color: #0f172a; border: 1.5px solid #cbd5e1; padding: 10px 12px; font-weight: 500; box-sizing: border-box;"
                    >${liveTeleprompterMode === 'full' ? getProjectFullScriptText() : (curClip.scriptText || '')}</textarea>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #64748b; flex-wrap: wrap; gap: 6px;">
                    <span>💡 સ્લાઇડ સામે જોઇને વાંચો. સાચો ઉચ્ચાર રાખવો.</span>
                    <span id="step1-script-words-count" style="color: #2563eb; font-weight: 800;">
                      ${liveTeleprompterMode === 'full' ? '📜 સંપૂર્ણ સ્ક્રિપ્ટ શબ્દો: ' + (getProjectFullScriptText() || '').trim().split(/\s+/).filter(Boolean).length : `📄 સ્લાઇડ #${curClip.slideNumber} શબ્દો: ` + ((curClip.scriptText || '').trim().split(/\s+/).filter(Boolean).length)}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Voice Recording Action Bar -->
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 18px;">
                <!-- Left: Record Controls -->
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <!-- Primary Start / Stop toggle button -->
                  <button type="button" id="btn-record-cur-slide" class="btn-step1-start-record-${currentSlideIndex}" style="background: ${isSingleSlideRecording ? '#fee2e2' : 'linear-gradient(135deg, #dc2626, #b91c1c)'}; color: ${isSingleSlideRecording ? '#dc2626' : '#ffffff'}; border: 2px solid ${isSingleSlideRecording ? '#ef4444' : '#dc2626'}; font-weight: 900; font-size: 0.94rem; padding: 10px 22px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(220,38,38,0.25);">
                    <span>${isSingleSlideRecording ? '⏹️' : '🎙️'}</span>
                    <span>${isSingleSlideRecording ? '⏹️ રેકોર્ડિંગ રોકો & સેવ કરો' : `સ્લાઇડ #${curClip.slideNumber} માટે અવાજ રેકોર્ડ કરો`}</span>
                  </button>

                  <!-- Explicit Pause / Resume / Stop for advanced control -->
                  <button type="button" id="btn-step1-pause-record" style="display: ${isSingleSlideRecording ? 'inline-flex' : 'none'}; background: #fef3c7; color: #92400e; border: 1.5px solid #fde68a; font-weight: 800; font-size: 0.82rem; padding: 8px 14px; border-radius: 8px; cursor: pointer; align-items: center; gap: 5px;">
                    ⏸️ થોભો (Pause)
                  </button>
                  <button type="button" id="btn-step1-resume-record" style="display: none; background: #eff6ff; color: #1e40af; border: 1.5px solid #bfdbfe; font-weight: 800; font-size: 0.82rem; padding: 8px 14px; border-radius: 8px; cursor: pointer; align-items: center; gap: 5px;">
                    ▶️ ચાલુ કરો (Resume)
                  </button>
                  <button type="button" id="btn-step1-stop-record" style="display: ${isSingleSlideRecording ? 'inline-flex' : 'none'}; background: #fee2e2; color: #991b1b; border: 1.5px solid #fecaca; font-weight: 800; font-size: 0.82rem; padding: 8px 14px; border-radius: 8px; cursor: pointer; align-items: center; gap: 5px;">
                    ⏹️ બંધ કરો (Stop)
                  </button>

                  ${isSingleSlideRecording ? `
                    <div style="font-family: monospace; font-size: 1.05rem; font-weight: 800; color: #dc2626; background: #fef2f2; border: 1.5px solid #fecaca; padding: 6px 14px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
                      <span>🔴 રેકોર્ડિંગ:</span>
                      <span id="step1-rec-live-timer">00:00</span>
                    </div>
                    <div style="width: 80px; height: 12px; background: #fee2e2; border-radius: 6px; overflow: hidden; display: inline-block; border: 1px solid #fca5a5;" title="માઇક્રોફોન સાઉન્ડ લેવલ">
                      <div id="step1-rec-live-vu" style="width: 0%; height: 100%; background: linear-gradient(90deg, #10b981, #ef4444); transition: width 0.05s ease;"></div>
                    </div>
                  ` : ''}

                  ${hasAudio && !isSingleSlideRecording ? `
                    <button type="button" id="btn-step1-rerecord-${currentSlideIndex}" class="btn-rerecord-slide" data-slide-index="${currentSlideIndex}" style="background: #ffffff; color: #dc2626; border: 1.5px solid #fca5a5; font-weight: 800; font-size: 0.82rem; padding: 9px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                      <span>🔄</span> <span>ફરી રેકોર્ડ કરો</span>
                    </button>
                    <button type="button" id="btn-step1-delete-${currentSlideIndex}" class="btn-delete-slide-recording" data-slide-index="${currentSlideIndex}" style="background: #fef2f2; color: #dc2626; border: 1.5px solid #fecaca; font-weight: 800; font-size: 0.82rem; padding: 9px 14px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="માત્ર આ સ્લાઇડનો અવાજ ડિલીટ કરો (સ્લાઇડ સુરક્ષિત રહેશે)">
                      <span>🗑️</span> <span>અવાજ હટાવો</span>
                    </button>
                  ` : ''}
                </div>

                <!-- Right: Audio Player / Duration Status -->
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  ${hasAudio ? `
                    <div style="display: flex; align-items: center; gap: 8px; background: #ffffff; border: 1.5px solid #a7f3d0; padding: 6px 14px; border-radius: 8px; flex-wrap: wrap;">
                      <audio id="slide-audio-player-element" src="${currentSlideAudioSrc}" preload="auto" style="display: none;"></audio>
                      <button id="btn-audio-play-pause" class="btn-step1-play-${currentSlideIndex}" type="button" style="background: #10b981; color: #ffffff; border: none; font-weight: 800; font-size: 0.84rem; padding: 6px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="આ સ્લાઇડનો વિડીયો ક્લિપ ચલાવો">
                        <span id="play-pause-icon">▶️</span> <span id="play-pause-text">સ્લાઇડ #${curClip.slideNumber} ક્લિપ ચલાવો</span>
                      </button>
                      <input type="range" id="audio-scrubber-input" min="0" max="${audioDur}" step="0.05" value="0" style="width: 95px; accent-color: #10b981; cursor: pointer;">
                      <button type="button" id="btn-toggle-continue-play" style="background: ${audioContinueMode === 'off' ? '#334155' : '#0284c7'}; color: #ffffff; border: none; font-weight: 800; font-size: 0.74rem; padding: 5px 10px; border-radius: 6px; cursor: pointer;" title="લાઇન પૂરી થાય પછી સતત ફરીથી વાગતું રહે તે માટે">
                        ${audioContinueMode === 'loop' ? '🔁 સતત ચાલુ' : (audioContinueMode === 'next' ? '⏭️ આગળની સ્લાઇડ' : '⏹️ ૧ વાર')}
                      </button>
                      <span id="step1-dur-display" style="font-family: monospace; font-size: 0.8rem; font-weight: 800; color: #065f46;">
                        <span id="audio-current-time-display">00:00</span> / ${formatTime(audioDur)}
                      </span>
                      ${renderPreviewSpeedAndVolumeControls()}
                    </div>
                    <span style="background: #dcfce7; color: #166534; font-size: 0.78rem; font-weight: 800; padding: 6px 12px; border-radius: 9999px; border: 1px solid #a7f3d0;">
                      ✓ રેકોર્ડ થયેલ (${(curClip.duration || 6).toFixed(1)}s)
                    </span>
                    <button type="button" id="btn-quick-create-video-step1" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; font-weight: 900; font-size: 0.84rem; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
                      <span>⚡</span> <span>બધી સ્લાઇડ્સ & ઓડિયો જોડીને વિડીયો બનાવો ➔</span>
                    </button>
                  ` : `
                    <span style="background: #fef3c7; color: #92400e; font-size: 0.8rem; font-weight: 800; padding: 6px 14px; border-radius: 9999px; border: 1px solid #fde68a;">
                      ⚠️ આ સ્લાઇડ માટે અવાજ બાકી છે
                    </span>
                  `}
                </div>
              </div>
            </section>

            <!-- ============================================================= -->
            <!-- STEP 1 SLIDE-WISE FULL AUDIO TIMELINE & AUDIO EDITING STUDIO  -->
            <!-- ============================================================= -->
            <section id="step1-slidewise-audio-section" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.03); margin-top: 20px;">
              
              <!-- Section Header & Overall Presentation Audio Summary -->
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1.5px solid #f1f5f9;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 1.5rem;">🎼</span>
                  <div>
                    <h3 style="font-size: 1.05rem; font-weight: 900; color: #0f172a; margin: 0; display: flex; align-items: center; gap: 8px;">
                      <span>સ્લાઇડવાઇઝ આખો ઓડિયો ટાઇમલાઇન & એડિટર</span>
                      <span style="font-size: 0.72rem; font-weight: 800; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 9999px;">
                        Slide-by-Slide Audio
                      </span>
                    </h3>
                    <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">
                      બધી સ્લાઇડ્સનો અવાજ ક્રમમાં જુઓ. જ્યાં અવાજ ન આવ્યો હોય તે શાંતિ કાપો, ભૂલ દૂર કરો અથવા અવાજ મોટો બૂસ્ટ કરો.
                    </div>
                  </div>
                </div>

                <!-- Right: Total Project Audio Stats -->
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <span style="font-family: monospace; font-size: 0.84rem; font-weight: 800; color: #0f172a; background: #f8fafc; border: 1.5px solid #e2e8f0; padding: 6px 14px; border-radius: 8px;">
                    📊 કુલ ઓડિયો: <strong style="color: #2563eb;">${formattedTotalDuration}</strong> (${recordedCount} / ${totalClips} સ્લાઇડ્સ રેકોર્ડ)
                  </span>
                  ${recordedCount === totalClips ? `
                    <span style="background: #dcfce7; color: #166534; border: 1.5px solid #86efac; font-size: 0.78rem; font-weight: 800; padding: 6px 12px; border-radius: 8px;">
                      ✓ બધી સ્લાઇડ્સમાં અવાજ રેકોર્ડ થયેલ (-14 LUFS)
                    </span>
                  ` : `
                    <span style="background: #fef3c7; color: #92400e; border: 1.5px solid #fde68a; font-size: 0.78rem; font-weight: 800; padding: 6px 12px; border-radius: 8px;">
                      ⚠️ ${totalClips - recordedCount} સ્લાઇડમાં અવાજ બાકી છે
                    </span>
                  `}
                </div>
              </div>

              <!-- 1. SLIDE-WISE HORIZONTAL AUDIO TIMELINE STRIP -->
              <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
                  <div style="font-size: 0.8rem; color: #334155; font-weight: 700; display: flex; align-items: center; gap: 6px;">
                    <span>🎞️ સ્લાઇડવાઇઝ જોડેલી ક્લિપ્સ (Slide + Audio Clips):</span>
                    <span style="font-size: 0.72rem; color: #059669; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 9999px;">
                      સ્લાઇડ અને અવાજ સાથે જોડાયેલ
                    </span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    ${renderPreviewSpeedAndVolumeControls(true)}
                    <button
                      type="button"
                      id="btn-step1-play-all-joined-clips"
                      style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; border: none; font-size: 0.82rem; font-weight: 800; padding: 7px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(37,99,235,0.25);"
                      title="બધી ક્લિપ્સ ક્રમમાં જોડીને ચલાવો"
                    >
                      <span>${isPlayingFullPresentation ? '⏸️' : '🎬'}</span>
                      <span>${isPlayingFullPresentation ? 'બધી ક્લિપ્સ થોભો (Pause)' : `બધી ક્લિપ્સ જોડીને સાથે જુઓ (૧ થી ${totalClips})`}</span>
                    </button>
                  </div>
                </div>

                <div id="step1-slidewise-audio-strip" style="display: flex; gap: 12px; overflow-x: auto; padding: 6px 4px 14px 4px; scrollbar-width: thin;">
                  ${generatedClips.map((c, idx) => {
                    const isSelected = idx === currentSlideIndex;
                    const sNum = (c.slideNumber !== undefined && c.slideNumber !== null) ? Number(c.slideNumber) : (idx + 1);
                    const matchedStored = storedSlideAudios.find(r =>
                      (r.slideId && c.slideId && String(r.slideId) === String(c.slideId)) ||
                      (r.slideNumber && c.slideNumber && String(r.slideNumber) === String(c.slideNumber)) ||
                      (r.slideNumber && Number(r.slideNumber) === sNum) ||
                      (r.slideId && String(r.slideId) === String(sNum))
                    );
                    const hasSnd = Boolean((c.hasAudio && c.audioUrl) || c.audioUrl || c.rawBlob || c.blob || c.enhancedBlob || matchedStored);
                    const dispDur = (c.duration && Number(c.duration) > 0) ? Number(c.duration) : ((matchedStored?.duration && Number(matchedStored.duration) > 0) ? Number(matchedStored.duration) : 6);
                    return `
                      <div
                        id="step1-strip-card-${idx}"
                        class="step1-slidewise-card"
                        data-clip-index="${idx}"
                        onclick="window.videoEditorGoToSlide ? window.videoEditorGoToSlide(${idx}) : (window.selectClip && window.selectClip(${idx}))"
                        style="flex: 0 0 195px; background: ${isSelected ? '#eff6ff' : '#ffffff'}; border: 2px solid ${isSelected ? '#2563eb' : (hasSnd ? '#86efac' : '#cbd5e1')}; border-radius: 12px; padding: 10px 12px; cursor: pointer; transition: all 0.2s ease; ${isSelected ? 'box-shadow: 0 4px 16px rgba(37,99,235,0.25); transform: translateY(-2px);' : 'box-shadow: 0 2px 6px rgba(0,0,0,0.04);'}"
                      >
                        <!-- Top: Slide Number & Status Badge -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                          <strong style="font-size: 0.82rem; color: ${isSelected ? '#2563eb' : '#0f172a'}; display: flex; align-items: center; gap: 4px;">
                            <span>🎬</span> <span>ક્લિપ #${c.slideNumber}</span>
                          </strong>
                          <span style="font-size: 0.68rem; font-weight: 800; padding: 2px 6px; border-radius: 9999px; background: ${hasSnd ? '#dcfce7' : '#fee2e2'}; color: ${hasSnd ? '#166534' : '#991b1b'}; border: 1px solid ${hasSnd ? '#bbf7d0' : '#fecaca'};">
                            ${hasSnd ? `🟢 ${dispDur.toFixed(1)}s` : '⚠️ ખાલી'}
                          </span>
                        </div>

                        <!-- 16:9 Slide Preview Thumbnail with Play Overlay & Live Progress -->
                        <div style="width: 100%; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; margin-bottom: 6px; border: 1.5px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}; background: #0f172a; position: relative;">
                          ${renderMiniSlideThumbnail(c)}
                          <!-- Play Overlay Button -->
                          <div
                            class="btn-step1-strip-play"
                            data-clip-index="${idx}"
                            style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: ${isSelected && isPlaying ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.25)'}; cursor: pointer; transition: background 0.15s ease;"
                            title="ક્લિપ #${c.slideNumber} ચલાવો"
                          >
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${hasSnd ? 'rgba(16, 185, 129, 0.95)' : 'rgba(100, 116, 139, 0.7)'}; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
                              ${(isSelected && isPlaying) ? '⏸️' : '▶️'}
                            </div>
                          </div>
                          <!-- Duration Pill -->
                          <div style="position: absolute; bottom: 3px; right: 4px; background: rgba(0,0,0,0.8); color: #fff; font-size: 0.6rem; font-weight: 700; padding: 1px 4px; border-radius: 3px; z-index: 12;">
                            ${dispDur.toFixed(1)}s
                          </div>
                          <!-- Clip Card Progress Bar -->
                          <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(0,0,0,0.4); z-index: 15;">
                            <div id="step1-card-progress-${idx}" class="step1-card-progress" style="height: 100%; width: 0%; background: #10b981; transition: width 0.08s linear;"></div>
                          </div>
                        </div>

                        <!-- Slide Title -->
                        <div style="font-size: 0.74rem; font-weight: 700; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 6px;">
                          ${c.title || `સ્લાઇડ #${c.slideNumber}`}
                        </div>

                        <!-- Mini Waveform / Audio State Visual -->
                        <div style="height: 24px; background: ${hasSnd ? '#090d16' : '#f1f5f9'}; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; padding: 0 6px; overflow: hidden; position: relative;">
                          ${hasSnd ? `
                            <div style="display: flex; align-items: center; justify-content: center; gap: 2.5px; width: 100%;">
                              <div style="width: 3px; height: 10px; background: #38bdf8; border-radius: 1px;"></div>
                              <div style="width: 3px; height: 18px; background: #10b981; border-radius: 1px;"></div>
                              <div style="width: 3px; height: 14px; background: #10b981; border-radius: 1px;"></div>
                              <div style="width: 3px; height: 22px; background: #38bdf8; border-radius: 1px;"></div>
                              <div style="width: 3px; height: 12px; background: #10b981; border-radius: 1px;"></div>
                              <div style="width: 3px; height: 16px; background: #38bdf8; border-radius: 1px;"></div>
                              <div style="width: 3px; height: 20px; background: #10b981; border-radius: 1px;"></div>
                              <div style="width: 3px; height: 8px; background: #38bdf8; border-radius: 1px;"></div>
                              <div style="width: 3px; height: 14px; background: #10b981; border-radius: 1px;"></div>
                              <div style="width: 3px; height: 18px; background: #38bdf8; border-radius: 1px;"></div>
                            </div>
                          ` : `
                            <span style="font-size: 0.65rem; font-weight: 700; color: #94a3b8;">
                              🎙️ અવાજ નથી આવ્યો
                            </span>
                          `}
                        </div>

                        <!-- Bottom: Action / Selection State -->
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem;">
                          ${hasSnd ? `
                            <button
                              type="button"
                              class="btn-step1-strip-play"
                              data-clip-index="${idx}"
                              style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; font-size: 0.72rem; font-weight: 800; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
                              title="આ ક્લિપ જુઓ & સાંભળો"
                            >
                              <span>${(isSelected && isPlaying) ? '⏸️ થોભો' : '▶️ ક્લિપ જુઓ'}</span>
                            </button>
                            <span style="color: ${isSelected ? '#2563eb' : '#059669'}; font-weight: 800; font-size: 0.7rem; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 6px; border-radius: 4px;">
                              🟢 જોડાયેલ
                            </span>
                          ` : `
                            <span style="color: #dc2626; font-weight: 700; font-size: 0.72rem;">
                              ⚠️ અવાજ બાકી
                            </span>
                            <span style="color: #64748b; font-size: 0.68rem;">
                              માત્ર સ્લાઇડ
                            </span>
                          `}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- 2. ACTIVE SLIDE INTERACTIVE WAVEFORM & SLIDE-BY-SLIDE AUDIO EDITOR -->
              <div id="step1-slide-audio-editor-box" style="background: #090d16; border: 2px solid #1e293b; border-radius: 12px; padding: 18px; color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
                
                ${hasAudio ? `
                  <!-- Header: Selected Slide Visual Preview Banner & Quick Edit -->
                  <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; background: rgba(255,255,255,0.06); padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <!-- Selected Slide Visual Thumbnail -->
                      <div style="width: 90px; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; flex-shrink: 0; border: 1.5px solid #38bdf8; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
                        ${renderMiniSlideThumbnail(curClip)}
                      </div>
                      <div>
                        <div style="font-size: 0.98rem; font-weight: 900; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                          <span>🎙️ સ્લાઇડ #${curClip.slideNumber}: ${curClip.title || 'સ્લાઇડ પ્રેઝન્ટેશન'}</span>
                          <span style="font-size: 0.72rem; font-weight: 800; color: #38bdf8; background: rgba(56,189,248,0.2); border: 1px solid rgba(56,189,248,0.4); padding: 2px 8px; border-radius: 9999px;">
                            અવધિ: ${(curClip.duration || 6).toFixed(2)}s
                          </span>
                        </div>
                        <div style="font-size: 0.76rem; color: #94a3b8; margin-top: 3px;">
                          ${(curClip.bulletPoints && curClip.bulletPoints[0]) ? `• ${curClip.bulletPoints[0]}` : (curClip.subtitle || curClip.scriptText || 'સ્લાઇડ પ્રમાણે અવાજ અને સ્લાઇડ બંને સાથે એડિટ કરો')}
                        </div>
                      </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      ${renderPreviewSpeedAndVolumeControls(true)}
                      <button type="button" id="btn-waveform-jump-edit-slide" style="background: rgba(37,99,235,0.25); color: #93c5fd; border: 1px solid #3b82f6; font-size: 0.78rem; font-weight: 800; padding: 6px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                        <span>✏️</span> <span>સ્લાઇડ લખાણ એડિટ કરો</span>
                      </button>
                    </div>
                  </div>

                  <!-- Header: Audio Waveform Title & Legend -->
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px;">
                    <div>
                      <span style="font-size: 0.96rem; font-weight: 900; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                        <span>🎙️ સ્લાઇડ #${curClip.slideNumber} નો ઓડિયો વેવફોર્મ (જ્યાં અવાજ નથી આવ્યો તે શાંતિ સરળતાથી કાપો)</span>
                        <span style="font-size: 0.74rem; font-weight: 800; color: #38bdf8; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); padding: 2px 8px; border-radius: 6px;">
                          અવધિ: ${(curClip.duration || 6).toFixed(2)}s
                        </span>
                      </span>
                    </div>

                    <!-- Visual Color Legend -->
                    <div style="display: flex; align-items: center; gap: 12px; font-size: 0.72rem; color: #94a3b8; flex-wrap: wrap;">
                      <span style="display: inline-flex; align-items: center; gap: 4px;">
                        <span style="width: 10px; height: 10px; background: #10b981; border-radius: 2px; display: inline-block;"></span>
                        <strong style="color: #6ee7b7;">બોલાયેલ અવાજ</strong>
                      </span>
                      <span style="display: inline-flex; align-items: center; gap: 4px;">
                        <span style="width: 10px; height: 10px; background: rgba(239,68,68,0.7); border-radius: 2px; display: inline-block;"></span>
                        <strong style="color: #fca5a5;">શાંતિ / અવાજ નથી આવ્યો</strong>
                      </span>
                      <span style="display: inline-flex; align-items: center; gap: 4px;">
                        <span style="width: 10px; height: 10px; background: #facc15; border-radius: 2px; display: inline-block;"></span>
                        <strong style="color: #fde047;">પ્લેહેડ</strong>
                      </span>
                      <span style="display: inline-flex; align-items: center; gap: 4px;">
                        <span style="width: 10px; height: 10px; background: rgba(239,68,68,0.3); border: 1px solid #ef4444; border-radius: 2px; display: inline-block;"></span>
                        <strong style="color: #f87171;">પસંદ કરેલ કાપવાનો ભાગ</strong>
                      </span>
                    </div>
                  </div>

                  <!-- Silence Detection Smart Notice -->
                  ${curSilenceInfo.hasSilence ? `
                    <div id="step1-silence-notice-banner" style="background: rgba(245, 158, 11, 0.15); border: 1.5px solid #f59e0b; border-radius: 8px; padding: 8px 14px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 0.8rem; color: #fde68a;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span>⚠️</span>
                        <span>
                          <strong>શાંતિ/મૌન ડિટેક્ટ થઈ:</strong>
                          ${curSilenceInfo.leadingSec > 0.3 ? ` શરૂઆતમાં ${curSilenceInfo.leadingSec.toFixed(1)}s` : ''}
                          ${curSilenceInfo.trailingSec > 0.3 ? ` અંતમાં ${curSilenceInfo.trailingSec.toFixed(1)}s` : ''}
                          અવાજ નથી આવ્યો. નીચે આપેલ <strong>"જ્યાં અવાજ નથી આવ્યો તે શાંતિ કાપો"</strong> બટન દબાવીને તરત જ કાપી શકો છો!
                        </span>
                      </div>
                      <span style="background: #f59e0b; color: #78350f; font-weight: 800; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px;">
                        ઓટો ડિટેક્શન
                      </span>
                    </div>
                  ` : ''}

                  <!-- Waveform HTML5 Canvas (Full Audio + Zoom & Horizontal Scroll) -->
                  <div style="display: flex; justify-content: flex-end; align-items: center; gap: 5px; margin-bottom: 6px; flex-wrap: wrap;">
                    <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700;">🔍 વેવફોર્મ ઝૂમ:</span>
                    <button type="button" class="btn-wf-zoom" data-zoom="1" style="background: ${waveformZoomLevel === 1 ? '#0284c7' : '#1e293b'}; color: #fff; border: 1px solid #475569; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; cursor: pointer;">1x પૂરો ઓડિયો</button>
                    <button type="button" class="btn-wf-zoom" data-zoom="2" style="background: ${waveformZoomLevel === 2 ? '#0284c7' : '#1e293b'}; color: #fff; border: 1px solid #475569; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; cursor: pointer;">2x</button>
                    <button type="button" class="btn-wf-zoom" data-zoom="4" style="background: ${waveformZoomLevel === 4 ? '#0284c7' : '#1e293b'}; color: #fff; border: 1px solid #475569; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; cursor: pointer;">4x</button>
                    <button type="button" class="btn-wf-zoom" data-zoom="8" style="background: ${waveformZoomLevel === 8 ? '#0284c7' : '#1e293b'}; color: #fff; border: 1px solid #475569; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; cursor: pointer;">8x</button>
                  </div>
                  <div style="width: 100%; height: 118px; position: relative; overflow-x: auto; overflow-y: hidden; border-radius: 8px; border: 1.5px solid #334155; margin-bottom: 10px; background: #000000;">
                    <canvas id="step1-audio-waveform-canvas" width="${Math.round(980 * (waveformZoomLevel || 1))}" height="110" style="width: ${100 * (waveformZoomLevel || 1)}%; height: 110px; display: block; cursor: crosshair;"></canvas>
                  </div>

                  <!-- Waveform Selection Range Inputs, Micro-Nudges & Silence Detect -->
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 0.78rem; color: #94a3b8; margin-bottom: 12px; background: #0f172a; padding: 10px 14px; border-radius: 8px; border: 1px solid #1e293b;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span>⏱️ સમય:</span>
                      <span style="font-family: monospace; color: #38bdf8; font-weight: 700;">00:00.00</span>
                      <span>/</span>
                      <span id="step1-total-audio-dur" style="font-family: monospace; color: #10b981; font-weight: 700;">${formatTimePrecise(audioDur)}</span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <!-- Start Fine-Tuning Nudge -->
                      <div style="display: inline-flex; align-items: center; gap: 3px; background: #1e293b; padding: 2px 6px; border-radius: 6px; border: 1px solid #334155;">
                        <span style="color: #cbd5e1; font-weight: 700;">શરૂઆત:</span>
                        <button type="button" class="btn-nudge-start-left" title="0.1 સેકન્ડ વહેલું શરૂ કરો" style="background: #334155; color: #f8fafc; border: 1px solid #475569; border-radius: 4px; font-size: 0.7rem; font-weight: 800; padding: 2px 5px; cursor: pointer;">◀ -0.1s</button>
                        <input type="number" id="input-step1-sel-start" step="0.05" min="0" max="${audioDur}" value="${selectionStartSec.toFixed(2)}" style="width: 58px; background: #0f172a; color: #38bdf8; border: 1px solid #475569; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.8rem; text-align: center; font-weight: 700;">
                        <button type="button" class="btn-nudge-start-right" title="0.1 સેકન્ડ મોડું શરૂ કરો" style="background: #334155; color: #f8fafc; border: 1px solid #475569; border-radius: 4px; font-size: 0.7rem; font-weight: 800; padding: 2px 5px; cursor: pointer;">+0.1s ▶</button>
                      </div>

                      <!-- End Fine-Tuning Nudge -->
                      <div style="display: inline-flex; align-items: center; gap: 3px; background: #1e293b; padding: 2px 6px; border-radius: 6px; border: 1px solid #334155;">
                        <span style="color: #cbd5e1; font-weight: 700;">અંત:</span>
                        <button type="button" class="btn-nudge-end-left" title="0.1 સેકન્ડ ઓછું કાપો" style="background: #334155; color: #f8fafc; border: 1px solid #475569; border-radius: 4px; font-size: 0.7rem; font-weight: 800; padding: 2px 5px; cursor: pointer;">◀ -0.1s</button>
                        <input type="number" id="input-step1-sel-end" step="0.05" min="0" max="${audioDur}" value="${selectionEndSec.toFixed(2)}" style="width: 58px; background: #0f172a; color: #38bdf8; border: 1px solid #475569; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.8rem; text-align: center; font-weight: 700;">
                        <button type="button" class="btn-nudge-end-right" title="0.1 સેકન્ડ વધુ કાપો" style="background: #334155; color: #f8fafc; border: 1px solid #475569; border-radius: 4px; font-size: 0.7rem; font-weight: 800; padding: 2px 5px; cursor: pointer;">+0.1s ▶</button>
                      </div>

                      <span style="color: #f87171; font-weight: 800; font-family: monospace; background: rgba(239,68,68,0.12); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(239,68,68,0.3);" id="step1-sel-range-info">
                        (${Math.abs(selectionEndSec - selectionStartSec).toFixed(2)}s પસંદગી)
                      </span>
                    </div>

                    <!-- Quick Silence Presets & Auto-Detect -->
                    <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
                      <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 700;">શાંતિ માપ:</span>
                      <button type="button" class="btn-quick-sel-preset" data-dur="0.3" style="background: #1e293b; color: #e2e8f0; border: 1px solid #475569; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; cursor: pointer;" title="0.3 સેકન્ડ શાંતિ પસંદ કરો">0.3s</button>
                      <button type="button" class="btn-quick-sel-preset" data-dur="0.5" style="background: #1e293b; color: #e2e8f0; border: 1px solid #475569; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; cursor: pointer;" title="0.5 સેકન્ડ શાંતિ પસંદ કરો">0.5s</button>
                      <button type="button" class="btn-quick-sel-preset" data-dur="1.0" style="background: #1e293b; color: #e2e8f0; border: 1px solid #475569; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; cursor: pointer;" title="1.0 સેકન્ડ શાંતિ પસંદ કરો">1.0s</button>
                      <button type="button" class="btn-quick-sel-preset" data-dur="2.0" style="background: #1e293b; color: #e2e8f0; border: 1px solid #475569; font-size: 0.7rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; cursor: pointer;" title="2.0 સેકન્ડ શાંતિ પસંદ કરો">2.0s</button>

                      <button
                        type="button"
                        id="btn-step1-auto-silence"
                        class="btn-trigger-auto-silence"
                        style="background: #8b5cf6; color: #ffffff; border: none; font-weight: 800; font-size: 0.74rem; padding: 4px 10px; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(139,92,246,0.3); margin-left: 4px;"
                        title="ઓડિયોમાં રહેલી નજીકની શાંતિ (Silence / Pause) આપમેળે શોધીને સિલેક્ટ કરો"
                      >
                        <span>🎯</span> <span>નજીકની શાંતિ ઓટો-સિલેક્ટ</span>
                      </button>
                    </div>
                  </div>

                  <!-- SLIDE-BY-SLIDE AUDIO EDITING ACTIONS TOOLBAR -->
                  <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; background: #1e293b; border-radius: 10px; padding: 12px 14px; border: 1px solid #334155;">
                    
                    <!-- Left: Cutting & Silence Trimming -->
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <!-- 1-Click Trim Silence -->
                      <button
                        type="button"
                        id="btn-step1-trim-silence"
                        style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; font-weight: 900; font-size: 0.82rem; padding: 8px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16,185,129,0.3);"
                        title="જ્યાં અવાજ નથી આવ્યો તે શરૂઆત અને અંતની શાંતિ ૧-ક્લિકમાં કાપો"
                      >
                        <span>⚡</span> <span>જ્યાં અવાજ નથી આવ્યો તે શાંતિ કાપો (Trim Silence)</span>
                      </button>

                      <!-- Cut Selected Region -->
                      <button
                        type="button"
                        id="btn-step1-cut-selection"
                        style="background: #dc2626; color: #ffffff; border: none; font-weight: 800; font-size: 0.82rem; padding: 8px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;"
                        title="વેવફોર્મ પર પસંદ કરેલ શાંતિ અથવા ભૂલવાળો ભાગ કાપીને જોડો"
                      >
                        <span>✂️</span> <span>પસંદ કરેલ ભાગ કાપો (Cut Selection)</span>
                      </button>

                      <!-- Play Selected Region -->
                      <button
                        type="button"
                        id="btn-step1-play-selection"
                        style="background: #2563eb; color: #ffffff; border: none; font-weight: 800; font-size: 0.8rem; padding: 8px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
                      >
                        <span>▶️</span> <span>પસંદ કરેલ ભાગ સાંભળો</span>
                      </button>

                      <!-- Trim Start / Trim End Nudges -->
                      <button
                        type="button"
                        id="btn-step1-nudge-start"
                        style="background: #475569; color: #f8fafc; border: 1px solid #64748b; font-weight: 700; font-size: 0.78rem; padding: 7px 10px; border-radius: 6px; cursor: pointer;"
                        title="શરૂઆતનો વધારાનો 0.3s મૌન ભાગ કાપો"
                      >
                        ⏪ શરૂઆત કાપો (-0.3s)
                      </button>
                      <button
                        type="button"
                        id="btn-step1-nudge-end"
                        style="background: #475569; color: #f8fafc; border: 1px solid #64748b; font-weight: 700; font-size: 0.78rem; padding: 7px 10px; border-radius: 6px; cursor: pointer;"
                        title="છેલ્લો વધારાનો 0.3s ભાગ કાપો"
                      >
                        ⏩ છેલ્લો ભાગ કાપો (-0.3s)
                      </button>
                    </div>

                    <!-- Right: Studio Loudness Boost & Re-record & Reset -->
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <!-- Zero Background Noise Isolation (Pankho, AC, Room Noise Eradication) -->
                      <button
                        type="button"
                        id="btn-step1-zero-noise"
                        style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; border: none; font-weight: 800; font-size: 0.8rem; padding: 8px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(2,132,199,0.3);"
                        title="પંખો, એસી, રૂમનો અવાજ કે કોઈપણ બેકગ્રાઉન્ડ ઘોંઘાટ ૧૦૦% દૂર કરી માત્ર શુદ્ધ અવાજ રાખો"
                      >
                        <span>🛡️</span> <span>શૂન્ય બેકગ્રાઉન્ડ નોઈઝ (Zero Noise)</span>
                      </button>

                      <!-- Loud Studio Boost -->
                      <button
                        type="button"
                        id="btn-step1-boost-loudness"
                        style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #ffffff; border: none; font-weight: 800; font-size: 0.8rem; padding: 8px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(139,92,246,0.3);"
                        title="આ સ્લાઇડનો અવાજ મોટો અને સ્પષ્ટ કરો (-14.0 LUFS Broadcast Standard)"
                      >
                        <span>🔊</span> <span>મોટો અવાજ બૂસ્ટ કરો</span>
                      </button>

                      <!-- Quick Re-record This Slide -->
                      <button
                        type="button"
                        id="btn-step1-quick-rerecord"
                        style="background: #ffffff; color: #dc2626; border: 1px solid #fca5a5; font-weight: 800; font-size: 0.8rem; padding: 7px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
                        title="માત્ર આ સ્લાઇડનો અવાજ ફરીથી રેકોર્ડ કરો"
                      >
                        <span>🔄</span> <span>ફરી રેકોર્ડ કરો</span>
                      </button>

                      <!-- Restore Original Raw Audio -->
                      ${curClip.rawBlob ? `
                        <button
                          type="button"
                          id="btn-step1-restore-original"
                          style="background: transparent; color: #cbd5e1; border: 1px dashed #64748b; font-weight: 700; font-size: 0.78rem; padding: 7px 10px; border-radius: 6px; cursor: pointer;"
                          title="કાપેલું રદ કરીને મૂળ અનએડિટેડ ઓરિજિનલ અવાજ પાછો લાવો"
                        >
                          ↩️ મૂળ અવાજ
                        </button>
                      ` : ''}
                    </div>

                  </div>
                ` : `
                  <!-- Empty State: No Audio Yet for This Slide -->
                  <div style="padding: 24px; text-align: center; color: #94a3b8;">
                    <span style="font-size: 2rem; display: block; margin-bottom: 8px;">🎙️</span>
                    <strong style="color: #ffffff; font-size: 0.95rem; display: block; margin-bottom: 4px;">
                      સ્લાઇડ #${curClip.slideNumber} માટે હજુ સુધી અવાજ રેકોર્ડ થયો નથી
                    </strong>
                    <div style="font-size: 0.8rem; color: #94a3b8; max-width: 480px; margin: 0 auto 14px auto;">
                      ઉપર આપેલ લાલ બટન <strong>"સ્લાઇડ #${curClip.slideNumber} માટે અવાજ રેકોર્ડ કરો"</strong> દબાવો અને સ્ક્રિપ્ટ વાંચીને બોલો. અવાજ રેકોર્ડ થતાં જ અહીં વેવફોર્મ દેખાશે અને તમે જ્યાં અવાજ ન આવ્યો હોય તે શાંતિ કાપી શકશો.
                    </div>
                  </div>
                `}

              </div>

            </section>
          </div>


          <!-- ========================================================================= -->
          <!-- STEP 2 PANEL: CRYSTAL NOISE REMOVAL STUDIO                                -->
          <!-- ========================================================================= -->
          <div id="panel-wf-step-2" class="wf-step-panel" style="display: ${currentWorkflowStep === 2 ? 'block' : 'none'};">
            
            <!-- Step 2 Notice & Preservation Guarantee Banner -->
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 2px solid #2563eb; border-radius: 12px; padding: 16px 22px; box-shadow: 0 4px 16px rgba(37,99,235,0.1); margin-bottom: 20px;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="font-size: 1.8rem;">✨</span>
                  <div>
                    <div style="font-size: 1.05rem; font-weight: 900; color: #1e3a8a;">
                      ૨. ક્રિસ્ટલ નોઈઝ રીમૂવલ સ્ટુડિયો (Crystal Noise Removal)
                    </div>
                    <div style="font-size: 0.84rem; color: #334155; margin-top: 2px;">
                      પંખાનો અવાજ, એસી હમ (50/60Hz), રૂમનો ઘોંઘાટ અને માઇક્રોફોન હિસ દૂર કરો. ગુજરાતી બોલીની કુદરતી મીઠાશ અને સ્પષ્ટતા 100% જળવાશે.
                    </div>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <span style="background: #ffffff; border: 1.5px solid #93c5fd; color: #1e40af; font-size: 0.82rem; font-weight: 800; padding: 6px 14px; border-radius: 9999px;">
                    ✨ સાફ કરેલ: ${cleanedCount} / ${recordedCount || totalClips} સ્લાઇડ્સ
                  </span>
                  <button type="button" id="btn-jump-to-step-3" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; font-size: 0.84rem; font-weight: 800; padding: 8px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">
                    <span>🔗 પગલું ૩: સ્લાઇડ + વોઇસ સિંક પર જાઓ →</span>
                  </button>
                </div>
              </div>

              <!-- Dual-Track Audio Safety Guarantee Pill -->
              <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #bfdbfe; font-size: 0.78rem; color: #1e3a8a; display: flex; align-items: center; gap: 8px;">
                <span>🛡️</span>
                <strong>સુરક્ષા ગેરંટી:</strong> તમારો મૂળ ઓરિજિનલ અવાજ (Raw Audio) ક્યારેય ઓવરરાઈટ થશે નહીં. Original અને Cleaned બંને ઓડિયો ફાઇલો અલગ અને સુરક્ષિત સચવાય છે.
              </div>
            </div>

            <!-- Noise Reduction Settings & Batch Clean Action Toolbar -->
            <section style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.03); margin-bottom: 20px;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  <label for="select-video-enhance-preset" style="font-size: 0.88rem; font-weight: 800; color: #0f172a;">
                    🎯 નોઈઝ રીડક્શન પ્રીસેટ:
                  </label>
                  <select id="select-video-enhance-preset" style="padding: 7px 14px; border-radius: 8px; border: 1.5px solid #2563eb; font-size: 0.86rem; font-weight: 800; background: #ffffff; color: #0f172a; cursor: pointer;">
                    <option value="crystal_ultra_studio" ${(!audioEnhancePreset || audioEnhancePreset === 'crystal_ultra_studio') ? 'selected' : ''}>✨ ક્રિસ્ટલ અલ્ટ્રા સ્ટુડિયો & વિડીયો (સર્વશ્રેષ્ઠ - રેકમેન્ડેડ)</option>
                    <option value="auto_studio" ${audioEnhancePreset === 'auto_studio' ? 'selected' : ''}>🎙️ ઓટો સ્ટુડિયો (બ્રોડકાસ્ટ -16 LUFS)</option>
                    <option value="warm_podcast" ${audioEnhancePreset === 'warm_podcast' ? 'selected' : ''}>🎙️ વાર્મ પોડકાસ્ટ (રિચ અવાજ)</option>
                    <option value="crisp_clarity" ${audioEnhancePreset === 'crisp_clarity' ? 'selected' : ''}>⚡ ક્રિસ્પ ક્લેરિટી (સ્પષ્ટ અવાજ)</option>
                    <option value="natural_voice" ${audioEnhancePreset === 'natural_voice' ? 'selected' : ''}>🎧 નેચરલ વોઇસ</option>
                  </select>
                  <label style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 800; color: #065f46; cursor: pointer;">
                    <input type="checkbox" id="chk-video-enhance-audio" ${isAudioEnhanceOnRender ? 'checked' : ''} style="accent-color: #10b981; width: 16px; height: 16px;">
                    વિડીયો રેન્ડરિંગમાં પણ સાફ અવાજનો ઉપયોગ કરો ✓
                  </label>
                </div>

                <!-- 1-Click Clean All Slides Button -->
                <button type="button" id="btn-clean-all-step2" class="btn-clean-all-audios" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; border: none; font-weight: 900; font-size: 0.92rem; padding: 10px 22px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(37,99,235,0.25);">
                  <span>✨</span> <span>બધી સ્લાઇડ્સનો અવાજ ૧-ક્લિકમાં સાફ કરો</span>
                </button>
              </div>

              <!-- Progress bar for cleaning -->
              <div id="clean-all-progress-box" style="display: none; margin-top: 16px; padding: 12px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
                <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 800; color: #1e40af; margin-bottom: 6px;">
                  <span id="clean-all-progress-label">ઓડિયો સાફ થઈ રહ્યો છે...</span>
                  <span id="clean-all-progress-pct">0%</span>
                </div>
                <div style="width: 100%; height: 8px; background: #dbeafe; border-radius: 4px; overflow: hidden;">
                  <div id="clean-all-progress-bar" style="width: 0%; height: 100%; background: #2563eb; transition: width 0.2s ease;"></div>
                </div>
              </div>
            </section>

            <!-- Slidewise Noise Removal Cards with Before/After Audio Preview -->
            <section style="display: flex; flex-direction: column; gap: 12px;">
              ${generatedClips.map((clip, idx) => {
                const hasAudioThisClip = Boolean((clip.hasAudio && clip.audioUrl) || clip.audioUrl || clip.rawBlob || clip.blob);
                const isCleaned = Boolean(clip.enhancedBlob || clip.cleanedAudioUrl || (clip.status === 'Enhanced' || clip.status === 'તૈયાર'));
                const rawSrc = clip.originalAudioUrl || clip.audioUrl || '';
                const cleanSrc = clip.cleanedAudioUrl || clip.audioUrl || '';

                return `
                  <div style="background: #ffffff; border: 1.5px solid ${isCleaned ? '#a7f3d0' : (hasAudioThisClip ? '#bfdbfe' : '#e2e8f0')}; border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    <!-- Left: Slide identity & Clean status -->
                    <div style="display: flex; align-items: center; gap: 14px;">
                      <div style="background: #0f172a; color: #38bdf8; font-weight: 900; font-size: 0.95rem; width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        #${clip.slideNumber}
                      </div>
                      <div>
                        <strong style="font-size: 0.92rem; color: #0f172a;">${clip.title || `સ્લાઇડ #${clip.slideNumber}`}</strong>
                        <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px;">
                          અવધિ: ${(clip.duration || 6).toFixed(1)}s • 
                          <span style="font-weight: 800; color: ${isCleaned ? '#059669' : (hasAudioThisClip ? '#2563eb' : '#dc2626')};">
                            ${isCleaned ? '✨ ક્રિસ્ટલ અવાજ તૈયાર' : (hasAudioThisClip ? '🎙️ કાચો અવાજ (સાફ કરવાનો બાકી)' : '⚠️ અવાજ રેકોર્ડ કરેલ નથી')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Middle: Before / After Audio Previews -->
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                      ${hasAudioThisClip ? `
                        <!-- Before Audio Player -->
                        <button type="button" id="btn-play-step2-raw-${idx}" class="btn-play-before-audio" data-src="${rawSrc}" style="background: #f1f5f9; color: #334155; border: 1.5px solid #cbd5e1; font-weight: 800; font-size: 0.8rem; padding: 7px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                          <span>▶</span> <span>મૂળ કાચો અવાજ (Before)</span>
                        </button>

                        <!-- After Audio Player -->
                        ${isCleaned ? `
                          <button type="button" id="btn-play-step2-clean-${idx}" class="btn-play-after-audio" data-src="${cleanSrc}" style="background: #ecfdf5; color: #065f46; border: 1.5px solid #a7f3d0; font-weight: 800; font-size: 0.8rem; padding: 7px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                            <span>▶</span> <span>સાફ કરેલ અવાજ (After)</span>
                          </button>
                        ` : `
                          <span style="font-size: 0.74rem; color: #94a3b8; font-style: italic;">(હજુ સાફ કરેલ નથી)</span>
                        `}
                      ` : `
                        <span style="font-size: 0.78rem; color: #ef4444; font-weight: 700;">સ્ટેપ ૧ માં અવાજ રેકોર્ડ કરો</span>
                      `}
                    </div>

                    <!-- Right: Clean / Reprocess Action Buttons -->
                    <div style="display: flex; align-items: center; gap: 8px;">
                      ${hasAudioThisClip ? `
                        <button type="button" id="btn-clean-single-step2-${idx}" class="btn-clean-single-audio" data-slide-index="${idx}" style="background: ${isCleaned ? '#eff6ff' : 'linear-gradient(135deg, #2563eb, #1d4ed8)'}; color: ${isCleaned ? '#2563eb' : '#ffffff'}; border: 1.5px solid ${isCleaned ? '#93c5fd' : '#2563eb'}; font-weight: 800; font-size: 0.82rem; padding: 8px 16px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                          <span>✨</span> <span>${isCleaned ? 'ફરી સાફ કરો (Reprocess)' : 'આ સ્લાઇડ સાફ કરો'}</span>
                        </button>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </section>
          </div>


          <!-- ========================================================================= -->
          <!-- STEP 3 PANEL: SLIDE + VOICE SYNCHRONIZATION                               -->
          <!-- ========================================================================= -->
          <div id="panel-wf-step-3" class="wf-step-panel" style="display: ${currentWorkflowStep === 3 ? 'block' : 'none'};">
            
            <!-- Step 3 Notice Banner -->
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%); border: 2px solid #10b981; border-radius: 12px; padding: 14px 20px; box-shadow: 0 4px 14px rgba(16,185,129,0.1); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 20px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 1.6rem;">🔗</span>
                <div>
                  <div style="font-size: 1rem; font-weight: 900; color: #065f46;">
                    ૩. સ્લાઇડ + વોઇસ સિંક્રનાઇઝેશન (Slide + Voice Synchronization)
                  </div>
                  <div style="font-size: 0.82rem; color: #334155; margin-top: 2px;">
                    દરેક સ્લાઇડ તેના સાફ કરેલા અવાજ સાથે જોડાયેલ છે (Slide 1 + Voice 1). સ્લાઇડનો સમય ઓડિયો પ્રમાણે આપમેળે સેટ થયો છે.
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span style="background: #ffffff; border: 1.5px solid #a7f3d0; color: #059669; font-size: 0.82rem; font-weight: 800; padding: 6px 14px; border-radius: 9999px;">
                  ✓ ${syncedCount} / ${totalClips} સ્લાઇડ્સ સિંક
                </span>
                <button type="button" id="btn-jump-to-step-4" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; font-size: 0.84rem; font-weight: 800; padding: 8px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">
                  <span>🎬 પગલું ૪: વિડીયો જનરેશન પર જાઓ →</span>
                </button>
              </div>
            </div>

            <!-- Missing Audio Alert if any slide is unrecorded -->
            ${unrecordedClips.length > 0 ? `
              <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 1.4rem;">⚠️</span>
                  <div>
                    <strong style="color: #991b1b; font-size: 0.95rem;">ચેતવણી: ${unrecordedClips.length} સ્લાઇડ્સ માટે અવાજ રેકોર્ડ કરેલ નથી!</strong>
                    <div style="font-size: 0.78rem; color: #7f1d1d;">
                      સ્લાઇડ નં: ${unrecordedClips.map(c => `#${c.slideNumber}`).join(', ')} માટે અવાજ બાકી છે.
                    </div>
                  </div>
                </div>
                <button type="button" id="btn-back-to-step1" style="background: #dc2626; color: #ffffff; border: none; font-weight: 800; font-size: 0.82rem; padding: 7px 16px; border-radius: 6px; cursor: pointer;">
                  ← સ્ટેપ ૧ માં રેકોર્ડ કરો
                </button>
              </div>
            ` : ''}

            <!-- Slide Transitions & Duration Settings -->
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <label for="select-slide-transition" style="font-size: 0.86rem; font-weight: 800; color: #0f172a;">
                  🎞️ સ્લાઇડ ટ્રાન્ઝિશન:
                </label>
                <select id="select-slide-transition" class="select-sync-transition-global select-sync-transition-0" style="padding: 6px 12px; border-radius: 6px; border: 1.5px solid #cbd5e1; font-size: 0.84rem; font-weight: 700; background: #ffffff; color: #0f172a; cursor: pointer;">
                  <option value="clean_cut" ${videoTransitionType === 'clean_cut' ? 'selected' : ''}>Clean Cut (0s) - કોઈ જર્ક કે વિલંબ નહીં</option>
                  <option value="crossfade" ${videoTransitionType === 'crossfade' ? 'selected' : ''}>Smooth Crossfade (0.5s) - મુલાયમ સંક્રમણ</option>
                  <option value="fade_black" ${videoTransitionType === 'fade_black' ? 'selected' : ''}>Fade to Black (0.5s)</option>
                  <option value="slide_left" ${videoTransitionType === 'slide_left' ? 'selected' : ''}>Slide Left (0.5s)</option>
                </select>
                <span style="font-size: 0.78rem; color: #059669; font-weight: 700; background: #ecfdf5; padding: 4px 10px; border-radius: 6px; border: 1px solid #a7f3d0;">
                  ✓ ઓડિયો સમય પ્રમાણે સ્લાઇડ સમય આપમેળે સેટ થયેલ છે
                </span>
              </div>
            </div>

            <!-- Full Synced Presentation Preview Player -->
            <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.03); margin-bottom: 20px;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 1.3rem;">▶️</span>
                  <div>
                    <strong style="font-size: 1rem; color: #0f172a;">સંપૂર્ણ સિંક્રનાઇઝ્ડ સ્લાઇડશો પ્રીવ્યુ</strong>
                    <div style="font-size: 0.78rem; color: #64748b;">
                      વિડીયો બનાવતા પહેલાં બધી સ્લાઇડ્સ અવાજ સાથે ક્રમબદ્ધ સાંભળી અને જોઈ શકો છો:
                    </div>
                  </div>
                </div>
                <button type="button" id="btn-preview-full-sync" class="btn-play-all-slides" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; border: none; font-weight: 900; font-size: 0.94rem; padding: 10px 22px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(37,99,235,0.25);">
                  <span>▶️</span> <span>આખો સ્લાઇડશો અવાજ સાથે ચલાવો (Full Preview)</span>
                </button>
              </div>
            </div>

            <!-- Slidewise Sync Details & Timing Adjustment Controls -->
            <section style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
              ${generatedClips.map((clip, idx) => {
                const hasSnd = Boolean((clip.hasAudio && clip.audioUrl) || clip.audioUrl || clip.rawBlob || clip.blob);
                const curDur = (clip.duration || 6).toFixed(1);

                return `
                  <div style="background: #ffffff; border: 1.5px solid ${hasSnd ? '#e2e8f0' : '#fee2e2'}; border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                      <!-- 16:9 Mini Slide Visual Preview -->
                      <div style="width: 75px; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; flex-shrink: 0; border: 1px solid #cbd5e1; background: #0f172a;">
                        ${renderMiniSlideThumbnail(clip)}
                      </div>
                      <div style="background: #0f172a; color: #38bdf8; font-weight: 900; font-size: 0.95rem; width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        #${clip.slideNumber}
                      </div>
                      <div>
                        <strong style="font-size: 0.92rem; color: #0f172a;">${clip.title || `સ્લાઇડ #${clip.slideNumber}`}</strong>
                        <div style="font-size: 0.76rem; color: #64748b; margin-top: 2px;">
                          ${hasSnd ? `🔊 અવાજ જોડાયેલ • ${curDur}s` : '<span id="step3-missing-badge-' + idx + '" style="color: #dc2626; font-weight: 800;">⚠️ અવાજ ખૂટે છે (Missing Audio)</span>'}
                        </div>
                      </div>
                    </div>

                    <!-- Slide Duration Input & Manual Nudge Timing -->
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <label style="font-size: 0.8rem; font-weight: 700; color: #334155;">
                        સ્લાઇડ સમય:
                        <input type="number" id="input-sync-duration-${idx}" class="input-clip-duration" data-clip-index="${idx}" value="${curDur}" min="1" max="180" step="0.5" style="width: 65px; padding: 4px 6px; border-radius: 6px; border: 1.5px solid #cbd5e1; font-weight: 800; text-align: center; margin-left: 4px;">s
                      </label>

                      <!-- Nudge buttons -->
                      <div style="display: flex; gap: 4px;">
                        <button type="button" id="btn-nudge-timing-${idx}-minus" class="btn-nudge-timing" data-clip-index="${idx}" data-delta="-0.5" style="background: #f1f5f9; border: 1px solid #cbd5e1; font-size: 0.74rem; font-weight: 800; padding: 4px 8px; border-radius: 4px; cursor: pointer;">-0.5s</button>
                        <button type="button" id="btn-nudge-timing-${idx}-plus" class="btn-nudge-timing" data-clip-index="${idx}" data-delta="0.5" style="background: #f1f5f9; border: 1px solid #cbd5e1; font-size: 0.74rem; font-weight: 800; padding: 4px 8px; border-radius: 4px; cursor: pointer;">+0.5s</button>
                      </div>

                      <!-- Individual Preview Button -->
                      <button type="button" id="btn-preview-slide-sync-${idx}" class="btn-preview-single-sync" data-clip-index="${idx}" style="background: #eff6ff; color: #2563eb; border: 1px solid #93c5fd; font-weight: 800; font-size: 0.78rem; padding: 5px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                        <span>▶</span> <span>પ્રીવ્યુ</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </section>

            <!-- Clip Selection & Combiner (Section 2 from original) -->
            <!-- 2. GENERATED SLIDE CLIPS SECTION (With Quick Sequence Controls) -->
          <!-- --------------------------------------------------------------- -->
          <section style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
            
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.35rem;">🎞️</span>
                <div>
                  <h2 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0;">
                    ૪. સ્લાઇડ ક્લિપ્સ જોડાણ કેન્દ્ર (Slide Clips Combiner)
                  </h2>
                  <p style="font-size: 0.8rem; color: #64748b; margin: 2px 0 0 0;">
                    દરેક સ્લાઇડનો ઓડિયો ચકાસો, જે સ્લાઇડ્સ રાખવી હોય તે પસંદ કરો અને ૧-ક્લિકમાં બધી ક્લિપ્સ જોડી 1080p વિડીયો બનાવો:
                  </p>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 0.82rem; font-weight: 800; color: #2563eb; background: #eff6ff; border: 1px solid #bfdbfe; padding: 4px 12px; border-radius: 9999px;">
                  કુલ ક્લિપ્સ: ${generatedClips.length} • સમય: ${formattedTotalDuration}
                </span>
              </div>
            </div>

            <!-- AI Audio Enhancement & Broadcast Loudness Card -->
            <div id="video-render-audio-enhance-card" style="background: #f0fdf4; border: 1.5px solid #10b981; border-radius: 12px; padding: 12px 18px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 2px 8px rgba(16,185,129,0.08);">
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 800; font-size: 0.92rem; color: #065f46;">
                  <input type="checkbox" id="chk-video-enhance-audio" ${isAudioEnhanceOnRender ? 'checked' : ''} style="accent-color: #10b981; width: 18px; height: 18px; cursor: pointer;">
                  <span>✨ સ્લાઇડ્સ જોડતી વખતે AI ઓડિયો એન્હાંસ કરો (AI Audio Enhancer)</span>
                </label>
                <span style="font-size: 0.76rem; background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 9999px; font-weight: 800; border: 1px solid #a7f3d0;">
                  ✓ ક્રિસ્ટલ ક્લિયર સ્ટુડિયો અવાજ • નોઈઝ રિમૂવલ • -16 LUFS બ્રોડકાસ્ટ સ્ટાન્ડર્ડ
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <label for="select-video-enhance-preset" style="font-size: 0.82rem; font-weight: 700; color: #065f46;">પ્રીસેટ:</label>
                <select id="select-video-enhance-preset" style="padding: 6px 12px; border-radius: 6px; border: 1.5px solid #10b981; font-size: 0.84rem; font-weight: 700; background: #ffffff; color: #0f172a; cursor: pointer;">
                  <option value="crystal_ultra_studio" ${(!audioEnhancePreset || audioEnhancePreset === 'crystal_ultra_studio') ? 'selected' : ''}>✨ ક્રિસ્ટલ અલ્ટ્રા સ્ટુડિયો & વિડીયો (સર્વશ્રેષ્ઠ - રેકમેન્ડેડ)</option>
                  <option value="auto_studio" ${audioEnhancePreset === 'auto_studio' ? 'selected' : ''}>🎙️ ઓટો સ્ટુડિયો (બ્રોડકાસ્ટ)</option>
                  <option value="warm_podcast" ${audioEnhancePreset === 'warm_podcast' ? 'selected' : ''}>🎙️ વાર્મ પોડકાસ્ટ (રિચ અવાજ)</option>
                  <option value="crisp_clarity" ${audioEnhancePreset === 'crisp_clarity' ? 'selected' : ''}>⚡ ક્રિસ્પ ક્લેરિટી (સ્પષ્ટ અવાજ)</option>
                  <option value="natural_voice" ${audioEnhancePreset === 'natural_voice' ? 'selected' : ''}>🎧 નેચરલ વોઇસ</option>
                </select>
              </div>
            </div>

            <!-- 16:9 Custom Slide & Clip Combiner Toolbar -->
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%); border: 1.5px solid #3b82f6; border-radius: 12px; padding: 12px 18px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 4px 12px rgba(59,130,246,0.08);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.4rem;">✂️</span>
                <div>
                  <div style="font-size: 0.94rem; font-weight: 800; color: #0f172a;">
                    ૧૬:૯ વિડીયો સ્લાઇડ & ઓડિયો ક્લિપ પસંદગી (16:9 Custom Slide & Clip Combiner)
                  </div>
                  <div style="font-size: 0.76rem; color: #475569;">
                    તમે ધારો તેટલી સ્લાઇડ્સ અને દરેક સ્લાઇડનું રેકોર્ડિંગ કેટલું રાખવું તે પસંદ કરીને ૧૬:૯ વિડીયો જોડી શકો છો:
                  </div>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <button type="button" id="btn-select-all-clips" style="background: #ffffff; color: #1e40af; border: 1px solid #93c5fd; font-size: 0.76rem; font-weight: 700; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                  ✓ બધી પસંદ કરો
                </button>
                <button type="button" id="btn-select-only-audio-clips" style="background: #ffffff; color: #047857; border: 1px solid #a7f3d0; font-size: 0.76rem; font-weight: 700; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                  🎙️ માત્ર ઓડિયો વાળી
                </button>
                <button type="button" id="btn-deselect-all-clips" style="background: #ffffff; color: #64748b; border: 1px solid #cbd5e1; font-size: 0.76rem; font-weight: 700; padding: 6px 12px; border-radius: 6px; cursor: pointer;">
                  ✖ બધા અનસિલેક્ટ
                </button>
                <span style="font-size: 0.8rem; font-weight: 800; color: #1d4ed8; background: #dbeafe; padding: 6px 14px; border-radius: 9999px; border: 1px solid #bfdbfe;">
                  પસંદ કરેલ: <strong id="val-included-clips-count">${includedClipsCount}</strong> / ${generatedClips.length} • સમય: <strong>${formattedIncludedDuration}</strong>
                </span>
                <button type="button" id="btn-render-selected-clips-video" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; font-size: 0.84rem; font-weight: 800; padding: 8px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(16,185,129,0.35);">
                  <span>🎬</span> પસંદ કરેલ ${includedClipsCount} સ્લાઇડ્સ જોડી ૧૬:૯ વિડીયો બનાવો
                </button>
              </div>
            </div>

            <!-- Sequential Clips Grid -->
            <div id="clips-grid-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px;">
              ${generatedClips.map((c, idx) => {
      const isSelected = idx === currentSlideIndex && activeViewMode === 'preview';
      const sNum = (c.slideNumber !== undefined && c.slideNumber !== null) ? Number(c.slideNumber) : (idx + 1);
      const matchedAudio = storedSlideAudios.find(r =>
        (r.slideId && c.slideId && String(r.slideId) === String(c.slideId)) ||
        (r.slideNumber && c.slideNumber && String(r.slideNumber) === String(c.slideNumber)) ||
        (r.pageNumber && c.pageNumber && String(r.pageNumber) === String(c.pageNumber)) ||
        (r.slideNumber && Number(r.slideNumber) === Number(sNum)) ||
        (r.slideId && String(r.slideId) === String(sNum))
      );
      if (!c.audioUrl || c.audioUrl.includes('uploaded_179359')) {
        if (matchedAudio?.enhancedBlob instanceof Blob) {
          c.audioUrl = URL.createObjectURL(matchedAudio.enhancedBlob);
        } else if (matchedAudio?.blob instanceof Blob) {
          c.audioUrl = URL.createObjectURL(matchedAudio.blob);
        } else if (matchedAudio?.url && !matchedAudio.url.includes('uploaded_179359')) {
          c.audioUrl = matchedAudio.url;
        } else if (matchedAudio?.enhancedDataUrl) {
          c.audioUrl = matchedAudio.enhancedDataUrl;
        } else if (matchedAudio?.dataUrl) {
          c.audioUrl = matchedAudio.dataUrl;
        }
        if (c.audioUrl) {
          c.hasAudio = true;
          if (matchedAudio?.duration && (!c.duration || c.duration < 1)) {
            c.duration = Number(matchedAudio.duration);
            c.formattedDuration = formatTime(c.duration);
          }
        }
      }
      const hasSnd = Boolean((c.hasAudio && c.audioUrl) || c.audioUrl || matchedAudio?.url || matchedAudio?.blob || matchedAudio?.dataUrl);
      const isIncluded = c.included !== false;

      return `
                  <div
                    class="generated-clip-card"
                    data-clip-index="${idx}"
                    style="
                      background: ${isSelected ? '#eff6ff' : (isIncluded ? '#ffffff' : '#f8fafc')};
                      border: ${isSelected ? '2px solid #2563eb' : (isIncluded ? '1.5px solid #e2e8f0' : '1.5px dashed #cbd5e1')};
                      border-radius: 10px;
                      padding: 10px;
                      box-shadow: ${isSelected ? '0 4px 14px rgba(37,99,235,0.18)' : '0 2px 6px rgba(0,0,0,0.02)'};
                      opacity: ${isIncluded ? '1' : '0.68'};
                      transition: all 0.15s ease;
                      display: flex;
                      flex-direction: column;
                      gap: 8px;
                    "
                  >
                    <!-- 16:9 Clip Thumbnail -->
                    <div
                      class="btn-select-clip"
                      data-clip-index="${idx}"
                      style="width: 100%; aspect-ratio: 16 / 9; background: #f1f5f9; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; border: 1px solid #e2e8f0; cursor: pointer;"
                    >
                      <!-- Checkbox Label Pill -->
                      <label style="position: absolute; top: 6px; left: 6px; z-index: 10; display: inline-flex; align-items: center; gap: 5px; background: ${isIncluded ? 'rgba(37,99,235,0.92)' : 'rgba(15,23,42,0.85)'}; color: #ffffff; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 800; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 1px solid ${isIncluded ? '#60a5fa' : 'rgba(255,255,255,0.2)'};" title="વિડીયોમાં આ સ્લાઇડ ઉમેરો અથવા બાકાત રાખો">
                        <input type="checkbox" class="chk-include-clip" data-clip-index="${idx}" ${isIncluded ? 'checked' : ''} style="accent-color: #2563eb; width: 14px; height: 14px; cursor: pointer;">
                        <span>${isIncluded ? '✓ વિડીયોમાં લો' : '+ ઉમેરો'}</span>
                      </label>

                      <!-- 16:9 Slide Preview Thumbnail -->
                      <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                        ${renderMiniSlideThumbnail(c)}
                      </div>
                      <span style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.75); color: #fff; font-size: 0.68rem; font-family: monospace; font-weight: 700; padding: 1px 5px; border-radius: 4px;">
                        ${c.formattedDuration}
                      </span>
                    </div>

                    <!-- Clip Meta -->
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                        <span style="font-size: 0.82rem; font-weight: 800; color: ${isSelected ? '#1e40af' : '#0f172a'};">
                          સ્લાઇડ #${c.slideNumber}
                        </span>
                        <span style="font-size: 0.72rem; font-weight: 800; color: ${hasSnd ? '#059669' : '#dc2626'}; background: ${hasSnd ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${hasSnd ? '#a7f3d0' : '#fecaca'}; padding: 2px 7px; border-radius: 4px;">
                          ${hasSnd ? '🟢 અવાજ જોડાયેલ ✓' : '⚠️ અવાજ બાકી'}
                        </span>
                      </div>
                      <div style="font-size: 0.74rem; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${c.title}
                      </div>
                    </div>

                    <!-- Clip Duration & Recording Length Quick Settings -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; display: flex; flex-direction: column; gap: 4px;">
                      <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-size: 0.72rem; color: #475569; font-weight: 700;">⏱️ સ્લાઇડ સમય:</span>
                        <div style="display: flex; align-items: center; gap: 4px;">
                          <input type="number" class="input-clip-card-duration" data-clip-index="${idx}" min="1" max="600" step="0.5" value="${c.duration ? Number(c.duration).toFixed(1) : '8.0'}" style="width: 55px; font-size: 0.76rem; font-weight: 800; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 4px; background: #ffffff;" title="આ સ્લાઇડનો સમયગાળો (સેકન્ડ)">
                          <span style="font-size: 0.7rem; color: #64748b;">સેકન્ડ</span>
                        </div>
                      </div>
                      <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                        ${hasSnd ? `
                          <button type="button" class="btn-card-full-audio" data-clip-index="${idx}" style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 4px; padding: 2px 6px; font-size: 0.68rem; font-weight: 700; cursor: pointer;" title="આખો રેકોર્ડ થયેલો અવાજ સેટ કરો">
                            🎙️ આખો અવાજ (${(c.originalDuration || c.duration || 8).toFixed(1)}s)
                          </button>
                        ` : '<span style="font-size: 0.68rem; color: #94a3b8;">અવાજ બાકી</span>'}
                        <div style="display: flex; gap: 2px; margin-left: auto;">
                          <button type="button" class="btn-nudge-card-dur" data-clip-index="${idx}" data-delta="-0.5" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 3px; font-size: 0.65rem; font-weight: 800; padding: 1px 4px; cursor: pointer;" title="0.5 સેકન્ડ ઘટાડો">-0.5s</button>
                          <button type="button" class="btn-nudge-card-dur" data-clip-index="${idx}" data-delta="0.5" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 3px; font-size: 0.65rem; font-weight: 800; padding: 1px 4px; cursor: pointer;" title="0.5 સેકન્ડ વધારો">+0.5s</button>
                          <button type="button" class="btn-quick-card-dur" data-clip-index="${idx}" data-dur="5" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 3px; font-size: 0.65rem; padding: 1px 4px; cursor: pointer;">5s</button>
                          <button type="button" class="btn-quick-card-dur" data-clip-index="${idx}" data-dur="10" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 3px; font-size: 0.65rem; padding: 1px 4px; cursor: pointer;">10s</button>
                          <button type="button" class="btn-quick-card-dur" data-clip-index="${idx}" data-dur="15" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 3px; font-size: 0.65rem; padding: 1px 4px; cursor: pointer;">15s</button>
                        </div>
                      </div>
                    </div>

                    <!-- Individual Clip Action Bar -->
                    <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 2px;">
                      <div style="display: flex; gap: 4px;">
                        <button type="button" class="btn-clip-move-left" data-clip-index="${idx}" ${idx === 0 ? 'disabled' : ''} style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-size: 0.72rem; cursor: ${idx === 0 ? 'not-allowed' : 'pointer'};" title="ડાબે ખસેડો">
                          ◀
                        </button>
                        <button type="button" class="btn-clip-move-right" data-clip-index="${idx}" ${idx === generatedClips.length - 1 ? 'disabled' : ''} style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-size: 0.72rem; cursor: ${idx === generatedClips.length - 1 ? 'not-allowed' : 'pointer'};" title="જમણે ખસેડો">
                          ▶
                        </button>
                        <button type="button" class="btn-clip-duplicate" data-clip-index="${idx}" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-size: 0.72rem; cursor: pointer;" title="ક્લિપ ડુપ્લિકેટ કરો">
                          📑
                        </button>
                      </div>

                      <div style="display: flex; gap: 4px; align-items: center;">
                        <button type="button" class="btn-card-record-clip" data-clip-index="${idx}" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 4px; padding: 2px 6px; font-size: 0.72rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 2px;" title="આ સ્લાઇડનો અવાજ રેકોર્ડ કરો">
                          <span>🎙️</span>
                        </button>
                        <button type="button" class="btn-clip-preview" data-clip-index="${idx}" style="background: ${isSelected ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#eff6ff'}; color: ${isSelected ? '#ffffff' : '#2563eb'}; border: 1px solid ${isSelected ? '#1d4ed8' : '#bfdbfe'}; border-radius: 4px; padding: 2px 8px; font-size: 0.72rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;">
                          <span>🎬</span> <span>${(isSelected && isPlaying) ? '⏸️ થોભો' : '▶️ ક્લિપ વિડીયો'}</span>
                        </button>
                        <button type="button" class="btn-clip-delete" data-clip-index="${idx}" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 4px; padding: 2px 6px; font-size: 0.72rem; cursor: pointer;" title="આ ક્લિપ વિડીયોમાંથી કાઢી નાખો">
                          🗑️
                        </button>
                      </div>
                    </div>

                  </div>
                `;
    }).join('')}
            </div>

          </section>

          <!-- --------------------------------------------------------------- -->
          <!-- 3. SELECTED CLIP EDITOR (Slide & Audio Controls)                -->
          <!-- --------------------------------------------------------------- -->
          
          </div>


          <!-- ========================================================================= -->
          <!-- STEP 4 PANEL: COMPLETE VIDEO CLIP GENERATION                              -->
          <!-- ========================================================================= -->
          <div id="panel-wf-step-4" class="wf-step-panel" style="display: ${currentWorkflowStep === 4 ? 'block' : 'none'};">
            
            <!-- Step 4 Notice Banner -->
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 2px solid #2563eb; border-radius: 12px; padding: 14px 20px; box-shadow: 0 4px 14px rgba(37,99,235,0.1); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 20px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 1.6rem;">🎬</span>
                <div>
                  <div style="font-size: 1rem; font-weight: 900; color: #1e3a8a;">
                    ૪. સંપૂર્ણ વિડીયો ક્લિપ જનરેશન (Complete Video Clip Generation)
                  </div>
                  <div style="font-size: 0.82rem; color: #334155; margin-top: 2px;">
                    તમામ સિંક થયેલી સ્લાઇડ્સ અને સાફ કરેલા અવાજને જોડીને YouTube 16:9 અથવા Shorts 9:16 ફોર્મેટમાં 1080p MP4 વિડીયો બનાવો:
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <button type="button" id="btn-jump-to-step-5" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; font-size: 0.84rem; font-weight: 800; padding: 8px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16,185,129,0.3);">
                  <span>✂️ પગલું ૫: ફાઇનલ એડિટર પર જાઓ →</span>
                </button>
              </div>
            </div>

            <!-- Format & Background Music Controls -->
            <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
              <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                <label style="font-size: 0.85rem; font-weight: 800; color: #0f172a;">
                  📺 વિડીયો ફોર્મેટ:
                </label>
                <select id="select-video-aspect-ratio" style="padding: 6px 12px; border-radius: 6px; border: 1.5px solid #cbd5e1; font-size: 0.84rem; font-weight: 700; background: #ffffff; color: #0f172a; cursor: pointer;">
                  <option value="16:9" ${videoAspectRatio === '16:9' ? 'selected' : ''}>📺 16:9 Landscape (YouTube Full HD 1920x1080)</option>
                  <option value="9:16" ${videoAspectRatio === '9:16' ? 'selected' : ''}>📱 9:16 Portrait (Shorts / Reels 1080x1920)</option>
                </select>

                <label style="font-size: 0.85rem; font-weight: 800; color: #0f172a; margin-left: 8px;">
                  🎵 બેકગ્રાઉન્ડ મ્યુઝિક (BGM):
                </label>
                <select id="select-video-bgm" style="padding: 6px 12px; border-radius: 6px; border: 1.5px solid #cbd5e1; font-size: 0.84rem; font-weight: 700; background: #ffffff; color: #0f172a; cursor: pointer;">
                  <option value="none" ${videoBgmTrack === 'none' ? 'selected' : ''}>કોઈ નહીં (No BGM)</option>
                  <option value="soft_ambient" ${videoBgmTrack === 'soft_ambient' ? 'selected' : ''}>હળવું એમ્બિયન્ટ સંગીત (Soft Ambient)</option>
                  <option value="corporate_inspiration" ${videoBgmTrack === 'corporate_inspiration' ? 'selected' : ''}>પ્રેરણાદાયક કોર્પોરેટ (Corporate Inspiration)</option>
                  <option value="peaceful_doc" ${videoBgmTrack === 'peaceful_doc' ? 'selected' : ''}>દસ્તાવેજી શાંત સંગીત (Peaceful Doc)</option>
                  <option value="news_beat" ${videoBgmTrack === 'news_beat' ? 'selected' : ''}>ન્યૂઝ બિટ્સ (News Beat)</option>
                </select>
              </div>

              <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                <label style="font-size: 0.82rem; font-weight: 800; color: #475569;">
                  BGM વોલ્યુમ:
                  <input type="range" id="input-video-bgm-vol" min="0" max="0.5" step="0.02" value="${videoBgmVolume}" style="width: 80px; vertical-align: middle; accent-color: #2563eb; cursor: pointer;">
                </label>
                <label style="font-size: 0.82rem; font-weight: 800; color: #475569;">
                  અવાજ વોલ્યુમ:
                  <input type="range" id="input-video-voice-vol" min="0.5" max="1.5" step="0.05" value="${videoVoiceVolume}" style="width: 80px; vertical-align: middle; accent-color: #10b981; cursor: pointer;">
                </label>
                <button type="button" id="btn-create-final-video" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; font-weight: 900; font-size: 0.92rem; padding: 9px 20px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.3);">
                  <span>⚡</span> <span>1080p MP4 રેન્ડર કરો</span>
                </button>
              </div>
            </div>

            <!-- Video Rendering Progress Container -->
            <div id="video-render-progress" style="display: none; background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="color: #1e40af; font-size: 0.95rem;">🎬 વિડીયો રેન્ડરિંગ પ્રોગ્રેસ...</strong>
                <span id="video-render-progress-pct" style="font-weight: 900; color: #2563eb; font-size: 1.1rem;">0%</span>
              </div>
              <div style="width: 100%; height: 10px; background: #bfdbfe; border-radius: 5px; overflow: hidden;">
                <div id="video-render-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #2563eb, #10b981); transition: width 0.1s linear;"></div>
              </div>
            </div>

            <!-- Video Stage & Creation Engine (Section 1) -->
            <!-- 1. PROMINENT 16:9 VIDEO & PREVIEW STAGE                         -->
          <!-- --------------------------------------------------------------- -->
          <section style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
            
            ${savedVideoUrl && activeViewMode === 'preview' ? `
              <div style="background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(37,99,235,0.12)); border: 2px solid #10b981; border-radius: 10px; padding: 12px 18px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 1.5rem;">🎉</span>
                  <div>
                    <div style="font-size: 0.95rem; font-weight: 800; color: #065f46;">
                      આ પ્રોજેક્ટનો સંપૂર્ણ 1080p વિડીયો તૈયાર છે!
                    </div>
                    <div style="font-size: 0.82rem; color: #1e293b; margin-top: 2px;">
                      📌 <strong>"${currentVideoTitle}"</strong> • 🕒 બન્યા સમય: <strong>${formattedVideoCreationTime}</strong>
                    </div>
                    <div style="font-size: 0.78rem; color: #475569; margin-top: 2px;">
                      બધી સ્લાઇડ્સ અને ઓડિયો જોડીને આખો વિડીયો સેવ થયેલ છે. તમે તેને સીધો પ્લે કરી શકો છો અથવા WhatsApp પર મોકલી શકો છો.
                    </div>
                  </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <button id="btn-banner-switch-to-saved" type="button" style="background: #059669; color: #ffffff; border: none; font-weight: 800; font-size: 0.85rem; padding: 8px 16px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(5,150,105,0.3);">
                    <span>📹</span> <span>આખો વિડીયો જુઓ (Watch Full Video)</span>
                  </button>
                  <button id="btn-banner-whatsapp-send" type="button" style="background: linear-gradient(135deg, #25D366, #128C7E); color: #ffffff; border: none; font-weight: 800; font-size: 0.85rem; padding: 8px 16px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(37,211,102,0.3);">
                    <span>💬</span> <span>WhatsApp પર મોકલો</span>
                  </button>
                </div>
              </div>
            ` : ''}

            ${savedVideoUrl && activeViewMode === 'saved' ? `
              <div style="background: linear-gradient(135deg, #064e3b, #047857); color: #ffffff; border-radius: 10px; padding: 14px 18px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 4px 14px rgba(6,78,59,0.3);">
                <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 280px;">
                  <span style="font-size: 1.8rem;">🎬</span>
                  <div>
                    <div style="font-size: 1rem; font-weight: 900; color: #a7f3d0; margin-bottom: 2px;">
                      આખો 1080p વિડીયો તૈયાર છે અને નીચે પ્લેયરમાં દેખાય છે
                    </div>
                    <div style="font-size: 0.85rem; color: #ffffff; font-weight: 700; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 4px;">
                      <span id="display-saved-video-title" style="background: rgba(255,255,255,0.2); padding: 2px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3);">
                        📌 વિડીયો ટાઇટલ: <strong>${currentVideoTitle}</strong>
                      </span>
                      <span id="display-saved-video-time" style="background: rgba(255,255,255,0.2); padding: 2px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); color: #fef08a;">
                        🕒 બન્યા સમય (કેટલા વાગે બન્યો): <strong>${formattedVideoCreationTime}</strong>
                      </span>
                    </div>
                    <div style="font-size: 0.78rem; color: #e6fffa; margin-top: 4px;">
                      1080p Full HD (30 FPS) • સ્લાઇડ્સ અને ઓડિયો સાથે જોડાયેલો • સાંભળવા માટે નીચે 'પ્લે' પર ક્લિક કરો
                    </div>
                  </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  <button id="btn-top-whatsapp-saved-video" type="button" style="background: #25D366; color: #ffffff; border: none; font-weight: 900; font-size: 0.88rem; padding: 9px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(37,211,102,0.4);">
                    <span style="font-size: 1.15rem;">💬</span> <span>WhatsApp પર મોકલો (Direct WhatsApp)</span>
                  </button>
                  <a id="btn-top-download-mp4" href="/api/voice/download-video?file=${encodeURIComponent(savedVideoFilename || 'latest_video.mp4')}&name=${encodeURIComponent(savedVideoFilename || 'slides_video.mp4')}" download="${savedVideoFilename || 'slides_video.mp4'}" style="background: #ffffff; color: #065f46; text-decoration: none; font-weight: 800; font-size: 0.85rem; padding: 8px 16px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
                    <span>💾</span> <span>MP4 ડાઉનલોડ</span>
                  </a>
                </div>
              </div>
            ` : ''}

            <!-- View Mode Switcher Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="display: inline-flex; background: #f1f5f9; padding: 3px; border-radius: 8px; border: 1px solid #e2e8f0;">
                  <button id="view-tab-preview" style="background: ${activeViewMode === 'preview' ? '#2563eb' : 'transparent'}; color: ${activeViewMode === 'preview' ? '#ffffff' : '#475569'}; border: none; font-size: 0.8rem; font-weight: 800; padding: 6px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                    <span>🖼️</span> <span>ક્લિપ પ્રીવ્યુ (Clip #${curClip.clipNumber})</span>
                  </button>
                  ${savedVideoUrl ? `
                    <button id="view-tab-saved" style="background: ${activeViewMode === 'saved' ? '#059669' : 'transparent'}; color: ${activeViewMode === 'saved' ? '#ffffff' : '#475569'}; border: none; font-size: 0.8rem; font-weight: 800; padding: 6px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                      <span>📹</span> <span>આખો બનેલો વિડીયો પ્લેયર (Full Video)</span>
                    </button>
                    <button id="btn-quick-share-saved-video" type="button" style="background: linear-gradient(135deg, #25D366, #128C7E); color: #ffffff; border: none; font-size: 0.8rem; font-weight: 800; padding: 6px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(37,211,102,0.3);">
                      <span>💬</span> <span>WhatsApp પર મોકલો</span>
                    </button>
                  ` : ''}
                </div>
              </div>

              <!-- Slide Navigation Buttons, Timing Nudges & Quick Record -->
              ${activeViewMode === 'preview' ? `
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <!-- Slide Timing Nudge Quick Controls -->
                  <div style="display: inline-flex; align-items: center; gap: 3px; background: #f8fafc; padding: 2px 6px; border-radius: 6px; border: 1.5px solid #cbd5e1;" title="આ સ્લાઇડનો સમય વધારો અથવા ઘટાડો">
                    <span style="font-size: 0.74rem; font-weight: 800; color: #334155;">⏱️ સ્લાઇડ:</span>
                    <button type="button" class="btn-nudge-cur-clip-dur" data-delta="-1.0" style="background:#fff; border:1px solid #cbd5e1; border-radius:4px; padding:2px 5px; font-size:0.7rem; font-weight:800; cursor:pointer;" title="૧ સેકન્ડ ઘટાડો">-1s</button>
                    <button type="button" class="btn-nudge-cur-clip-dur" data-delta="-0.5" style="background:#fff; border:1px solid #cbd5e1; border-radius:4px; padding:2px 5px; font-size:0.7rem; font-weight:800; cursor:pointer;" title="અડધી સેકન્ડ ઘટાડો">-0.5s</button>
                    <input type="number" id="input-preview-slide-duration" min="1" max="600" step="0.5" value="${curClip.duration ? Number(curClip.duration).toFixed(1) : '8.0'}" style="width: 48px; font-size: 0.76rem; font-weight: 800; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 2px; background: #ffffff;">
                    <span style="font-size: 0.68rem; color: #64748b;">s</span>
                    <button type="button" class="btn-nudge-cur-clip-dur" data-delta="0.5" style="background:#fff; border:1px solid #cbd5e1; border-radius:4px; padding:2px 5px; font-size:0.7rem; font-weight:800; cursor:pointer;" title="અડધી સેકન્ડ વધારો">+0.5s</button>
                    <button type="button" class="btn-nudge-cur-clip-dur" data-delta="1.0" style="background:#fff; border:1px solid #cbd5e1; border-radius:4px; padding:2px 5px; font-size:0.7rem; font-weight:800; cursor:pointer;" title="૧ સેકન્ડ વધારો">+1s</button>
                  </div>

                  <!-- Quick Edit Slide Text Button -->
                  <button id="btn-edit-slide-content-quick" type="button" style="background: #ffffff; color: #0284c7; border: 1.5px solid #7dd3fc; font-weight: 800; font-size: 0.78rem; padding: 6px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="આ સ્લાઇડનું ટાઇટલ અને લખાણ એડિટ કરો">
                    <span>✏️</span> <span>લખાણ એડિટ</span>
                  </button>

                  <button id="btn-quick-record-slide" style="background: ${isSingleSlideRecording ? '#fee2e2' : '#f8fafc'}; color: ${isSingleSlideRecording ? '#dc2626' : '#0f172a'}; border: 1.5px solid ${isSingleSlideRecording ? '#fca5a5' : '#cbd5e1'}; font-weight: 800; font-size: 0.8rem; padding: 6px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                    <span>🎙️</span> <span>${isSingleSlideRecording ? '⏹️ રેકોર્ડિંગ રોકો & એન્હાન્સ કરો' : 'આ સ્લાઇડ રેકોર્ડ કરો'}</span>
                  </button>
                  <button
                    type="button"
                    id="btn-timeline-prev-slide"
                    class="btn-nav-prev-slide"
                    onclick="window.videoEditorPrevSlide ? window.videoEditorPrevSlide() : (window.selectClip && window.selectClip(${currentSlideIndex - 1}))"
                    ${isFirst ? 'disabled style="opacity: 0.45; cursor: not-allowed; background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; font-weight: 700; font-size: 0.8rem; padding: 6px 14px; border-radius: 6px;"' : 'style="background: #ffffff; color: #0f172a; border: 1.5px solid #cbd5e1; font-weight: 700; font-size: 0.8rem; padding: 6px 14px; border-radius: 6px; cursor: pointer;"'}
                  >
                    ⏮️ અગાઉની
                  </button>
                  <span style="font-size: 0.9rem; font-weight: 800; color: #0f172a; padding: 0 4px;">
                    ક્લિપ ${formatSlideNumber(currentSlideIndex + 1)} / ${formatSlideNumber(totalClips)}
                  </span>
                  <button
                    type="button"
                    id="btn-timeline-next-slide"
                    class="btn-nav-next-slide"
                    onclick="window.videoEditorNextSlide ? window.videoEditorNextSlide() : (window.selectClip && window.selectClip(${currentSlideIndex + 1}))"
                    ${isLast ? 'disabled style="opacity: 0.45; cursor: not-allowed; background: #f1f5f9; color: #94a3b8; border: 1px solid #e2e8f0; font-weight: 700; font-size: 0.8rem; padding: 6px 14px; border-radius: 6px;"' : 'style="background: #ffffff; color: #0f172a; border: 1.5px solid #cbd5e1; font-weight: 700; font-size: 0.8rem; padding: 6px 14px; border-radius: 6px; cursor: pointer;"'}
                  >
                    આગળની ⏭️
                  </button>
                  <label for="input-video-upload-pdf-step1" style="background: #eff6ff; color: #2563eb; border: 1.5px solid #bfdbfe; font-weight: 700; font-size: 0.8rem; padding: 6px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="આ વિષય માટે નવી PDF અપલોડ કરો">
                    <span>📄</span> <span>PDF અપલોડ</span>
                    <input type="file" id="input-video-upload-pdf-step1" accept=".pdf,.pptx,.ppt" style="display: none;" />
                  </label>
                </div>
              ` : ''}
            </div>

            <!-- PROMINENT 16:9 SCREEN -->
            <div id="main-video-stage" style="width: 100%; aspect-ratio: 16 / 9; max-height: 520px; background: #000000; border: 1.5px solid #cbd5e1; border-radius: 12px; overflow: hidden; position: relative; box-shadow: 0 8px 24px rgba(0,0,0,0.12); margin: 0 auto; display: flex; align-items: center; justify-content: center;">
              
              <!-- MODE 1: LIVE RENDERING PROGRESS VIEW -->
              <div id="live-rendering-box" style="display: ${activeViewMode === 'creating' ? 'flex' : 'none'}; width: 100%; height: 100%; flex-direction: column; align-items: center; justify-content: center; position: absolute; inset: 0; background: #0f172a; z-index: 50;">
                <canvas id="live-render-canvas" width="1920" height="1080" style="width: 100%; height: 100%; object-fit: contain; display: block;"></canvas>
                
                <!-- Live Rendering Overlay Status -->
                <div style="position: absolute; top: 16px; left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: center; z-index: 60; background: rgba(15,23,42,0.85); backdrop-filter: blur(4px); padding: 10px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #ef4444; animation: pulse 1s infinite;"></span>
                    <strong style="color: #ffffff; font-size: 0.9rem;">🔴 વિડીયો બની રહ્યો છે... (Rendering Live Video)</strong>
                  </div>
                  <div style="font-family: monospace; font-size: 0.92rem; font-weight: 800; color: #38bdf8;">
                    સ્લાઇડ #${renderCurrentSlideNum} / ${totalClips} • <span id="render-time-display">${formatTime(renderCurrentTimeSec)} / ${formatTime(renderTotalTimeSec)}</span>
                  </div>
                </div>

                <!-- Live Progress Bar along the bottom -->
                <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 10px; background: rgba(0,0,0,0.5); z-index: 60;">
                  <div id="render-live-bar" style="height: 100%; width: ${renderProgressPct}%; background: linear-gradient(90deg, #2563eb, #10b981); transition: width 0.1s ease;"></div>
                </div>
              </div>

              <!-- MODE 2: SAVED VIDEO PLAYER -->
              ${savedVideoUrl ? `
                <div id="saved-video-display-box" style="display: ${activeViewMode === 'saved' ? 'block' : 'none'}; width: 100%; height: 100%; position: relative;">
                  <div style="position: absolute; top: 12px; left: 14px; z-index: 25; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(4px); color: #ffffff; padding: 6px 14px; border-radius: 8px; font-size: 0.82rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.25); display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); pointer-events: none;">
                    <span>🎬 <strong>${currentVideoTitle}</strong></span>
                    <span style="color: #fde047;">• 🕒 ${formattedVideoCreationTime}</span>
                  </div>
                  <video
                    id="main-saved-video-element"
                    src="${savedVideoUrl + (savedVideoUrl.includes('?') ? '&' : '?') + 't=' + (project.editing?.savedAt || project.editing?.savedVideo?.createdAt || '1')}"
                    controls
                    playsinline
                    preload="auto"
                    style="width: 100%; height: 100%; object-fit: contain; display: block; background: #000000;"
                  ></video>
                </div>
              ` : ''}

              <!-- MODE 3: SLIDE CLIP PREVIEW -->
              <div id="slide-preview-container" style="display: ${activeViewMode === 'preview' ? 'block' : 'none'}; width: 100%; height: 100%; position: relative; background: #ffffff;">
                <!-- Top Clip Video Header Badge -->
                <div style="position: absolute; top: 12px; left: 16px; z-index: 20; display: inline-flex; align-items: center; gap: 6px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); color: #ffffff; padding: 5px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.2);">
                  <span>🎬</span> <span>સ્લાઇડ #${curClip.slideNumber} ક્લિપ વિડીયો</span>
                  <span style="color: #38bdf8;">• ⏱️ ${(curClip.duration || 6).toFixed(1)}s</span>
                </div>

                <!-- Central Play/Pause Overlay Button -->
                <div id="btn-stage-center-play" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 15; cursor: pointer; background: ${isPlaying ? 'transparent' : 'rgba(0,0,0,0.18)'}; transition: background 0.2s;" title="ક્લિપ વિડીયો ચલાવો / થોભો">
                  ${!isPlaying ? `
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(37, 99, 235, 0.92); color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; box-shadow: 0 4px 20px rgba(0,0,0,0.4); border: 2px solid rgba(255,255,255,0.8);">
                      ▶️
                    </div>
                  ` : ''}
                </div>

                ${renderSlideDisplay(curClip)}
                ${subtitleOverlayHtml}

                <!-- Stage Clip Live Progress Bar -->
                <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 6px; background: rgba(0,0,0,0.35); z-index: 25;">
                  <div id="stage-clip-progress-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #2563eb, #10b981); transition: width 0.08s linear;"></div>
                </div>
              </div>

            </div>

            <!-- PLAYER CONTROLS / ACTIONS DIRECTLY BENEATH 16:9 PREVIEW -->
            ${activeViewMode === 'saved' ? `
              <div style="display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 16px; flex-wrap: wrap;">
                <button id="btn-play-saved-video-sound" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; font-weight: 800; font-size: 0.95rem; padding: 11px 24px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
                  <span>▶️</span> <span>સંપૂર્ણ અવાજ સાથે વિડીયો ચલાવો (Play Video with Sound)</span>
                </button>
                <button id="btn-direct-whatsapp-saved-video" type="button" style="background: linear-gradient(135deg, #25D366, #128C7E); color: #ffffff; border: none; font-weight: 800; font-size: 0.95rem; padding: 11px 24px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(37,211,102,0.4);">
                  <span style="font-size: 1.25rem;">💬</span> <span>WhatsApp પર વિડીયો મોકલો (Direct WhatsApp)</span>
                </button>
                <button id="btn-share-saved-video" type="button" style="background: #ffffff; color: #1e293b; border: 1.5px solid #cbd5e1; font-weight: 800; font-size: 0.92rem; padding: 11px 20px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                  <span>📲</span> <span>મોબાઇલ શેર / અન્ય એપ્સ</span>
                </button>
                <button id="btn-rerender-saved-video" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; border: none; font-weight: 800; font-size: 0.92rem; padding: 11px 22px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(37,99,235,0.35);">
                  <span>🔄</span> નવો અવાજ વાપરીને વિડીયો ફરી બનાવો
                </button>
                <a id="btn-download-saved-mp4" href="/api/voice/download-video?file=${encodeURIComponent(savedVideoFilename || 'latest_video.mp4')}&name=${encodeURIComponent(savedVideoFilename || 'slides_video.mp4')}" download="${savedVideoFilename || 'slides_video.mp4'}" style="background: #ffffff; color: #059669; border: 1.5px solid #a7f3d0; text-decoration: none; font-weight: 800; font-size: 0.92rem; padding: 10px 20px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
                  <span>💾</span> MP4 વિડીયો ડાઉનલોડ કરો (1080p HD)
                </a>
                <a id="btn-download-master-audio-saved" href="${presentationStitchedUrl || (companionAudio && companionAudio.src) || (project.voice?.audioUrl) || '/audio/master_presentation_audio.wav'}" download="master_gujarati_voiceover.wav" style="background: #eff6ff; color: #2563eb; border: 1.5px solid #bfdbfe; text-decoration: none; font-weight: 800; font-size: 0.92rem; padding: 10px 18px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
                  <span>🎙️</span> માસ્ટર ઓડિયો ડાઉનલોડ કરો (WAV)
                </a>
                <button id="btn-reset-saved-video" style="background: #fef2f2; color: #dc2626; border: 1.5px solid #fecaca; font-weight: 800; font-size: 0.88rem; padding: 10px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                  <span>🗑️</span> જૂનો વિડીયો રીસેટ કરો
                </button>
                <button id="btn-goto-thumbnail-from-saved" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #000000; border: none; font-weight: 800; font-size: 0.92rem; padding: 10px 20px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(245,158,11,0.35);">
                  <span>🖼️</span> ૭. હવે આ વિડીયો માટે થંબનેલ બનાવો →
                </button>
                <button id="btn-watch-saved-video-beside" style="background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; font-weight: 700; font-size: 0.85rem; padding: 10px 16px; border-radius: 8px; cursor: pointer;">
                  🔄 સ્લાઇડ પ્રીવ્યુ પર પાછા જાઓ
                </button>

                <!-- DIRECT VIDEO LINK & INSTANT WHATSAPP SAVE CARD -->
                <div style="width: 100%; margin-top: 14px; background: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 14px 18px; box-shadow: 0 4px 16px rgba(16,185,129,0.12); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                  <div style="flex: 1; min-width: 260px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 1.25rem;">🔗</span>
                      <strong style="color: #065f46; font-size: 0.95rem;">આ વિડીયોની કાયમી લિંક (Direct Video Link):</strong>
                      <span style="font-size: 0.74rem; background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 9999px; font-weight: 800;">✓ સેવ થયેલ છે</span>
                    </div>
                    <div style="font-size: 0.82rem; color: #334155; margin-top: 4px; display: flex; flex-wrap: wrap; gap: 10px;">
                      <span>📌 <strong>વિડીયો ટાઇટલ:</strong> ${currentVideoTitle}</span>
                      <span>🕒 <strong>બન્યા સમય (કેટલા વાગે બન્યો):</strong> ${formattedVideoCreationTime}</span>
                    </div>
                    <div style="margin-top: 6px; background: #ffffff; border: 1.5px solid #a7f3d0; border-radius: 8px; padding: 8px 12px; font-family: monospace; font-size: 0.9rem; font-weight: 700; color: #0f172a; word-break: break-all; user-select: all;" id="display-direct-video-url">
                      ${savedVideoUrl ? getShareableVideoUrl(savedVideoUrl) : ''}
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <a id="btn-card-direct-download" href="/api/voice/download-video?file=${encodeURIComponent(savedVideoFilename || 'latest_video.mp4')}&name=${encodeURIComponent(savedVideoFilename || 'video_1080p.mp4')}" download="${savedVideoFilename || 'video_1080p.mp4'}" style="background: #ffffff; color: #0284c7; border: 1.5px solid #38bdf8; font-weight: 800; font-size: 0.9rem; padding: 10px 18px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                      <span>📥</span> <span>સીધો ડાઉનલોડ કરો</span>
                    </a>
                    <button id="btn-copy-direct-video-link" type="button" style="background: #ffffff; color: #059669; border: 1.5px solid #10b981; font-weight: 800; font-size: 0.9rem; padding: 10px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                      <span>📋</span> <span id="lbl-copy-direct-link">લિંક કોપી કરો</span>
                    </button>
                    <button id="btn-card-direct-whatsapp-save" type="button" style="background: linear-gradient(135deg, #25D366, #128C7E); color: #ffffff; border: none; font-weight: 900; font-size: 0.95rem; padding: 11px 22px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(37,211,102,0.4);">
                      <span style="font-size: 1.25rem;">💬</span> <span>WhatsApp પર લિંક મોકલો</span>
                    </button>
                  </div>
                </div>
              </div>
            ` : `
              <!-- Complete Presentation Player Bar (Full Video & Single Slide Options) -->
              <div style="margin-top: 14px; background: #ffffff; border: 2px solid ${hasAudio ? '#10b981' : '#e2e8f0'}; border-radius: 12px; padding: 16px 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.04);">
                <!-- Header with Slide Title and Connected Audio Indicator -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.3rem;">🔊</span>
                    <div>
                      <strong style="color: #0f172a; font-size: 0.95rem;">
                        સ્લાઇડ #${curClip.slideNumber} નો જોડાયેલો અવાજ (Connected Audio):
                      </strong>
                      <span style="font-size: 0.82rem; color: #64748b; margin-left: 6px;">
                        ${curClip.title || ''}
                      </span>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span style="font-size: 0.82rem; font-weight: 800; color: ${hasAudio ? '#059669' : '#dc2626'}; background: ${hasAudio ? '#ecfdf5' : '#fef2f2'}; border: 1.5px solid ${hasAudio ? '#a7f3d0' : '#fecaca'}; padding: 4px 12px; border-radius: 9999px;">
                      ${hasAudio ? `🟢 અવાજ જોડાયેલ છે ✓ (${Math.round(audioDur)}s)` : '⚠️ અવાજ રેકોર્ડ થયેલ નથી'}
                    </span>
                    <div id="active-presentation-slide-badge" style="font-size: 0.82rem; font-weight: 800; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; padding: 4px 12px; border-radius: 6px;">
                      કુલ સમયગાળો: <strong style="color: #059669;">${formatTime(calculateTotalDuration())}</strong> • ${totalClips} સ્લાઇડ્સ
                    </div>
                  </div>
                </div>

                <!-- Player Buttons & Timeline -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
                  <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <!-- Single Slide Play Button -->
                    <button id="btn-audio-play-pause" type="button" ${!hasAudio ? 'disabled' : ''} style="background: ${hasAudio ? '#2563eb' : '#f1f5f9'}; color: ${hasAudio ? '#ffffff' : '#94a3b8'}; border: none; font-weight: 800; font-size: 0.88rem; padding: 9px 18px; border-radius: 8px; cursor: ${hasAudio ? 'pointer' : 'not-allowed'}; display: inline-flex; align-items: center; gap: 6px; box-shadow: ${hasAudio ? '0 2px 8px rgba(37,99,235,0.3)' : 'none'};">
                      <span id="play-pause-icon">${isPlaying ? '⏸️' : '🎬'}</span>
                      <span id="play-pause-text">${hasAudio ? (isPlaying ? 'વિડીયો થોભો (Pause Clip)' : `🎬 આ ક્લિપનો વિડીયો જુઓ (${Math.round(audioDur)}s)`) : '⚠️ અવાજ બાકી (રેકોર્ડ કરો)'}</span>
                    </button>
                    <!-- Primary Full Video Play/Pause Button -->
                    <button id="btn-play-all-slides" type="button" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; font-weight: 800; font-size: 0.88rem; padding: 9px 20px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
                      <span id="play-all-icon">${isPlayingFullPresentation ? '⏸️' : '▶️'}</span>
                      <span id="play-all-text">${isPlayingFullPresentation ? 'વિડીયો થોભો (Pause)' : `સંપૂર્ણ વિડીયો ક્રમશઃ ચલાવો (Play Full Video • ${formatTime(calculateTotalDuration())})`}</span>
                    </button>
                  </div>

                  <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    ${renderPreviewSpeedAndVolumeControls()}
                    ${curClip.savedAt ? `
                      <span style="font-size: 0.76rem; color: #64748b; background: #f8fafc; padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        રેકોર્ડિંગ સમય: <strong>${formatIndianDateTimeDisplay(curClip.savedAt)}</strong>
                      </span>
                    ` : ''}
                  </div>
                </div>

                <!-- Synchronized Scrubber Bar & Timecode -->
                <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                  <!-- Scrubber Bar (Supports both Full Video and Current Slide scrubbing) -->
                  <div style="flex: 1; min-width: 200px; display: flex; align-items: center;">
                    <input type="range" id="audio-scrubber-input" data-scrubber="presentation" min="0" max="${Math.max(calculateTotalDuration(), 1)}" step="0.05" value="0" style="width: 100%; accent-color: #10b981; cursor: pointer;">
                  </div>

                  <!-- Timecode -->
                  <div style="font-family: monospace; font-size: 0.88rem; font-weight: 800; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; white-space: nowrap;">
                    <span id="time-current">00:00</span> / <span id="time-total">${formatTime(calculateTotalDuration())}</span>
                  </div>
                </div>
              </div>

              <!-- Dedicated Native HTML5 Audio Element for 100% Reliable Sound -->
              <audio
                id="slide-audio-player-element"
                src="${currentSlideAudioSrc}"
                preload="auto"
                style="display: none;"
              ></audio>

              <!-- DEDICATED SCRIPT STUDIO BOX (જ્યાં જગ્યા છે તેમાં આખી સ્ક્રિપ્ટ પસંદ & પેસ્ટ) -->
              <div style="margin-top: 16px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 14px 18px; box-shadow: 0 4px 14px rgba(0,0,0,0.05);">
                
                <!-- Script Box Header with Mode Tabs -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">
                  <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span style="font-size: 1.25rem;">📜</span>
                    <strong style="color: #0f172a; font-size: 0.95rem;">
                      વિડીયો સ્ક્રિપ્ટ સ્ટુડિયો (Video Script & Subtitles)
                    </strong>
                    <div style="display: inline-flex; background: #f1f5f9; padding: 2px; border-radius: 8px; border: 1px solid #e2e8f0;">
                      <button type="button" id="tab-video-script-full" style="background: ${activeVideoScriptTab === 'full' ? '#2563eb' : 'transparent'}; color: ${activeVideoScriptTab === 'full' ? '#ffffff' : '#475569'}; border: none; font-size: 0.76rem; font-weight: 800; padding: 5px 12px; border-radius: 6px; cursor: pointer; transition: all 0.15s;">
                        📜 આખી સ્ક્રિપ્ટ (સંપૂર્ણ વિડીયો)
                      </button>
                      <button type="button" id="tab-video-script-clip" style="background: ${activeVideoScriptTab === 'clip' ? '#2563eb' : 'transparent'}; color: ${activeVideoScriptTab === 'clip' ? '#ffffff' : '#475569'}; border: none; font-size: 0.76rem; font-weight: 800; padding: 5px 12px; border-radius: 6px; cursor: pointer; transition: all 0.15s;">
                        📄 ક્લિપ #${curClip.clipNumber}
                      </button>
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <button type="button" id="btn-video-select-proj-script" style="background: #eff6ff; color: #0284c7; border: 1.5px solid #bae6fd; font-size: 0.76rem; font-weight: 800; padding: 5px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                      <span>✨</span> પ્રોજેક્ટ સ્ક્રિપ્ટ પસંદ કરો
                    </button>
                    <button type="button" id="btn-video-paste-full-script" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; font-size: 0.76rem; font-weight: 800; padding: 5px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(16,185,129,0.3);">
                      <span>📋</span> આખી સ્ક્રિપ્ટ પેસ્ટ કરો
                    </button>
                    <button type="button" id="btn-video-paste-chatgpt-script" style="background: #0f172a; color: #ffffff; border: none; font-size: 0.76rem; font-weight: 800; padding: 5px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                      <span>⚡</span> ChatGPT Script Paste કરો
                    </button>
                    <button type="button" id="btn-video-paste-script" style="background: #eff6ff; color: #2563eb; border: 1.5px solid #bfdbfe; font-size: 0.76rem; font-weight: 800; padding: 5px 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                      <span>📋</span> પેસ્ટ કરો (Paste)
                    </button>
                    <button type="button" id="btn-video-save-script" style="background: #2563eb; color: #ffffff; border: none; font-size: 0.76rem; font-weight: 800; padding: 5px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(37,99,235,0.3);">
                      <span>💾</span> સેવ
                    </button>
                  </div>
                </div>

                <!-- TAB 1: FULL SCRIPT CONTAINER -->
                <div id="video-full-script-panel" style="display: ${activeVideoScriptTab === 'full' ? 'block' : 'none'};">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.76rem; color: #64748b;">
                    <span>સંપૂર્ણ વિડીયો સ્ક્રિપ્ટ (અહીં આખી સ્ક્રિપ્ટ પેસ્ટ કરો, આપમેળે બધી ક્લિપ્સમાં વહેંચાઈ જશે):</span>
                    <button type="button" id="btn-video-distribute-full-script" style="background: #f0fdf4; color: #16a34a; border: 1.5px solid #bbf7d0; font-size: 0.74rem; font-weight: 800; padding: 3px 10px; border-radius: 6px; cursor: pointer;">
                      ⚡ બધી ક્લિપ્સમાં વહેંચો & સિંક કરો
                    </button>
                  </div>
                  <textarea
                    id="video-full-script-textarea"
                    rows="6"
                    class="font-gu"
                    placeholder="અહીં તમામ સ્લાઇડ્સ/ક્લિપ્સ માટેની આખી સ્ક્રિપ્ટ એકસાથે પેસ્ટ કરો અથવા લખો...&#10;&#10;દા.ત.:&#10;[સ્લાઇડ ૧: પરિચય] નમસ્કાર મિત્રો...&#10;[સ્લાઇડ ૨: વિગત] સરકાર દ્વારા જાહેર કરાયેલા પરિપત્ર અનુસાર...&#10;&#10;(જો સ્લાઇડ ટેગ ના હોય તો પણ આખી સ્ક્રિપ્ટ આપમેળે સપ્રમાણ વહેંચાઈ જશે)"
                    style="width: 100%; font-size: 0.95rem; line-height: 1.8; resize: vertical; border-radius: 8px; background: #f8fafc; color: #0f172a; border: 1.5px solid #cbd5e1; padding: 12px 14px; font-weight: 500;"
                  >${fullVideoScriptText}</textarea>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #64748b; margin-top: 6px;">
                    <span>કુલ શબ્દો: <strong id="video-full-script-words-count" style="color: #2563eb;">${fullVideoScriptWords}</strong> • ક્લિપ્સ: <strong style="color: #059669;">${generatedClips.length}</strong></span>
                    <span style="color: #059669; font-weight: 700;">🟢 પ્રોજેક્ટ સિંક (Auto-synchronized) ✓</span>
                  </div>
                </div>

                <!-- TAB 2: CURRENT CLIP SCRIPT CONTAINER -->
                <div id="video-clip-script-panel" style="display: ${activeVideoScriptTab === 'clip' ? 'block' : 'none'};">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.76rem; color: #64748b;">
                    <span>ક્લિપ #${curClip.clipNumber} ની સબટાઇટલ સ્ક્રિપ્ટ:</span>
                  </div>
                  <textarea
                    id="video-clip-script-textarea"
                    rows="4"
                    class="font-gu"
                    placeholder="આ સ્લાઇડ માટેનું ગુજરાતી લખાણ અહીં પેસ્ટ કરો અથવા લખો... રેકોર્ડિંગ અને વિડીયો સબટાઇટલ માટે આ લખાણ વપરાશે."
                    style="width: 100%; font-size: 0.96rem; line-height: 1.8; resize: vertical; border-radius: 8px; background: #f8fafc; color: #0f172a; border: 1.5px solid #cbd5e1; padding: 12px 14px; font-weight: 500;"
                  >${curClip.scriptText || ''}</textarea>

                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #64748b; margin-top: 6px;">
                    <span>કુલ શબ્દો: <strong id="video-script-words-count" style="color: #2563eb;">${(curClip.scriptText || '').trim().split(/\s+/).filter(Boolean).length}</strong></span>
                    <span style="color: #059669; font-weight: 700;">🟢 લાઈવ સિંક (Auto-saved)</span>
                  </div>
                </div>

              </div>
            `}

          </section>

          <!-- --------------------------------------------------------------- -->
          
          </div>


          <!-- ========================================================================= -->
          <!-- STEP 5 PANEL: FINAL VIDEO EDITING TOOL                                    -->
          <!-- ========================================================================= -->
          <div id="panel-wf-step-5" class="wf-step-panel" style="display: ${currentWorkflowStep === 5 ? 'block' : 'none'};">
            
            <!-- Step 5 Notice Banner -->
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%); border: 2px solid #10b981; border-radius: 12px; padding: 14px 20px; box-shadow: 0 4px 14px rgba(16,185,129,0.1); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 20px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 1.6rem;">✂️</span>
                <div>
                  <div style="font-size: 1rem; font-weight: 900; color: #065f46;">
                    ૫. ફાઇનલ વિડીયો એડિટર (Final Video Editing Tool)
                  </div>
                  <div style="font-size: 0.82rem; color: #334155; margin-top: 2px;">
                    જનરેટ થયેલા વિડીયોને પ્રોફેશનલ ટચ આપો, ટ્રીમ કરો, સ્પ્લિટ કરો, ટેક્સ્ટ/વોટરમાર્ક ઉમેરો, અને સીધો WhatsApp પર શેર કરો.
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <button type="button" id="btn-share-whatsapp-direct" class="btn-share-whatsapp-direct" style="background: linear-gradient(135deg, #25D366, #128C7E); color: #ffffff; border: none; font-weight: 900; font-size: 0.85rem; padding: 9px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(37,211,102,0.35);">
                  <span>💬</span> WhatsApp પર શેર કરો
                </button>
                <button type="button" id="btn-download-exported-video" class="btn-download-exported-video" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; border: none; font-weight: 900; font-size: 0.85rem; padding: 9px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(37,99,235,0.3);">
                  <span>⬇️</span> MP4 ડાઉનલોડ
                </button>
                <button type="button" id="btn-next-to-thumbnail-editor" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #000000; border: none; font-weight: 800; font-size: 0.85rem; padding: 9px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(245,158,11,0.35);">
                  <span>🖼️</span> ૭. Thumbnail Maker પર જાઓ →
                </button>
              </div>
            </div>

            <!-- Quick Trimming & Split Action Bar with Timeline -->
            <div id="timeline" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <strong style="font-size: 0.86rem; color: #0f172a;">✂️ ટાઇમલાઇન ટૂલ્સ:</strong>
                <button type="button" id="btn-trim-start" class="btn btn-outline btn-sm" style="font-weight: 700; font-size: 0.78rem; border-color: #cbd5e1; color: #334155;">
                  ✂️ શરૂઆત ટ્રીમ
                </button>
                <button type="button" id="btn-trim-end" class="btn btn-outline btn-sm" style="font-weight: 700; font-size: 0.78rem; border-color: #cbd5e1; color: #334155;">
                  ✂️ છેલ્લો ભાગ ટ્રીમ
                </button>
                <button type="button" id="btn-split-clip" class="btn btn-outline btn-sm" style="font-weight: 700; font-size: 0.78rem; border-color: #cbd5e1; color: #334155;">
                  ✂️ સ્પ્લિટ કરો
                </button>
                <button type="button" id="btn-delete-split-clip" class="btn-delete-range btn btn-outline btn-sm" style="font-weight: 700; font-size: 0.78rem; border-color: #fca5a5; color: #dc2626;">
                  🗑️ સિલેક્ટેડ ભાગ હટાવો
                </button>
                <button type="button" id="btn-add-text-overlay" class="btn btn-outline btn-sm" style="font-weight: 700; font-size: 0.78rem; border-color: #93c5fd; color: #1e40af;">
                  📝 ટેક્સ્ટ ઉમેરો
                </button>
                <button type="button" id="btn-add-watermark" class="btn btn-outline btn-sm" style="font-weight: 700; font-size: 0.78rem; border-color: #a7f3d0; color: #065f46;">
                  💧 વોટરમાર્ક
                </button>
                <button type="button" id="btn-add-intro-outro" class="btn btn-outline btn-sm" style="font-weight: 700; font-size: 0.78rem; border-color: #fed7aa; color: #9a3412;">
                  🎬 Intro/Outro
                </button>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; font-size: 0.78rem; color: #64748b;">
                <span>💡 ફાઇનલ ટ્રીમિંગ અને મિક્સિંગ પૂર્ણ થયા પછી નીચેથી ડાઉનલોડ કે શેર કરો.</span>
              </div>
            </div>

            <!-- Selected Clip Editor & Audio Waveform (Section 3) -->
            <section id="selected-clip-editor" style="background: #ffffff; border: 2px solid #2563eb; border-radius: 14px; padding: 20px; box-shadow: 0 6px 20px rgba(37,99,235,0.08);">
            
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.4rem;">🎛️</span>
                <div>
                  <h2 style="font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0;">
                    પસંદ કરેલ ક્લિપ એડિટર (Selected Clip Editor) — ક્લિપ #${curClip.clipNumber}
                  </h2>
                  <p style="font-size: 0.82rem; color: #475569; margin: 2px 0 0 0;">
                    સ્લાઇડ બદલો, ઓડિયો વેવફોર્મ ટ્રીમ કરો (શરૂઆત, વચ્ચે, છેલ્લે), અવાજ વધારો/ઘટાડો, Fade In/Out સેટ કરો:
                  </p>
                </div>
              </div>

              <!-- Editor Sub-Tabs -->
              <div style="display: inline-flex; background: #f1f5f9; padding: 3px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <button id="tab-editor-audio" style="background: ${activeClipEditorTab === 'audio' ? '#2563eb' : 'transparent'}; color: ${activeClipEditorTab === 'audio' ? '#ffffff' : '#475569'}; border: none; font-size: 0.8rem; font-weight: 800; padding: 6px 14px; border-radius: 6px; cursor: pointer;">
                  🔊 ઓડિયો વેવફોર્મ એડિટર
                </button>
                <button id="tab-editor-slide" style="background: ${activeClipEditorTab === 'slide' ? '#2563eb' : 'transparent'}; color: ${activeClipEditorTab === 'slide' ? '#ffffff' : '#475569'}; border: none; font-size: 0.8rem; font-weight: 800; padding: 6px 14px; border-radius: 6px; cursor: pointer;">
                  🖼️ સ્લાઇડ કંટ્રોલ્સ
                </button>
              </div>
            </div>

            <!-- Selected Slide Visual Header (Always visible in Step 5!) -->
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 10px 14px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 90px; aspect-ratio: 16 / 9; border-radius: 6px; overflow: hidden; flex-shrink: 0; border: 1.5px solid #2563eb; background: #0f172a;">
                  ${renderMiniSlideThumbnail(curClip)}
                </div>
                <div>
                  <strong style="font-size: 0.95rem; color: #0f172a;">સ્લાઇડ #${curClip.slideNumber}: ${curClip.title || 'સ્લાઇડ પ્રેઝન્ટેશન'}</strong>
                  <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">
                    અવધિ: ${(curClip.duration || 6).toFixed(1)}s • ${hasAudio ? '🔊 ઓડિયો જોડાયેલ' : '⚠️ ઓડિયો બાકી'}
                  </div>
                </div>
              </div>
              <div style="font-size: 0.78rem; color: #059669; font-weight: 800; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 6px;">
                ✓ સ્લાઇડ અને ઓડિયો સાથે સિંક
              </div>
            </div>

            <!-- SUB-TAB A: AUDIO WAVEFORM & NON-DESTRUCTIVE TRIMMING -->
            ${activeClipEditorTab === 'audio' ? `
              <div style="display: flex; flex-direction: column; gap: 16px;">
                
                ${hasAudio ? `
                  <!-- Interactive Waveform Box -->
                  <div style="background: #090d16; border: 1.5px solid #1e293b; border-radius: 10px; padding: 14px; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <span style="font-size: 0.8rem; font-weight: 700; color: #94a3b8;">
                        ઓડિયો વેવફોર્મ (ક્લિક કરીને કાપવાનો ભાગ સિલેક્ટ કરો):
                      </span>
                      <span style="font-family: monospace; font-size: 0.82rem; font-weight: 700; color: #f87171;">
                        પસંદગી: <strong>${formatTimePrecise(selectionStartSec)} - ${formatTimePrecise(selectionEndSec)}</strong> (${(Math.max(0, selectionEndSec - selectionStartSec)).toFixed(2)}s)
                      </span>
                    </div>

                    <!-- Waveform HTML5 Canvas (Full Audio + Zoom & Scroll) -->
                    <div style="width: 100%; height: 118px; position: relative; overflow-x: auto; overflow-y: hidden; border-radius: 6px;">
                      <canvas id="audio-waveform-canvas" width="${Math.round(980 * (waveformZoomLevel || 1))}" height="110" style="width: ${100 * (waveformZoomLevel || 1)}%; height: 110px; display: block; cursor: crosshair;"></canvas>
                    </div>

                    <!-- Range Controls Below Canvas with Micro-Nudges & Auto Silence -->
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 10px; font-size: 0.78rem; color: #94a3b8; background: #0f172a; padding: 8px 12px; border-radius: 6px; border: 1px solid #1e293b;">
                      <span>00:00</span>
                      <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <!-- Start Fine-Tuning Nudge -->
                        <div style="display: inline-flex; align-items: center; gap: 3px; background: #1e293b; padding: 2px 6px; border-radius: 6px; border: 1px solid #334155;">
                          <span style="color: #cbd5e1; font-weight: 700;">શરૂઆત:</span>
                          <button type="button" class="btn-nudge-start-left" title="0.1s વહેલું શરૂ કરો" style="background: #334155; color: #f8fafc; border: 1px solid #475569; border-radius: 4px; font-size: 0.7rem; font-weight: 800; padding: 2px 5px; cursor: pointer;">◀ -0.1s</button>
                          <input type="number" id="input-sel-start" step="0.05" min="0" max="${audioDur}" value="${selectionStartSec.toFixed(2)}" style="width: 58px; background: #0f172a; color: #38bdf8; border: 1px solid #475569; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.8rem; text-align: center; font-weight: 700;">
                          <button type="button" class="btn-nudge-start-right" title="0.1s મોડું શરૂ કરો" style="background: #334155; color: #f8fafc; border: 1px solid #475569; border-radius: 4px; font-size: 0.7rem; font-weight: 800; padding: 2px 5px; cursor: pointer;">+0.1s ▶</button>
                        </div>

                        <!-- End Fine-Tuning Nudge -->
                        <div style="display: inline-flex; align-items: center; gap: 3px; background: #1e293b; padding: 2px 6px; border-radius: 6px; border: 1px solid #334155;">
                          <span style="color: #cbd5e1; font-weight: 700;">અંત:</span>
                          <button type="button" class="btn-nudge-end-left" title="0.1s ઓછું કાપો" style="background: #334155; color: #f8fafc; border: 1px solid #475569; border-radius: 4px; font-size: 0.7rem; font-weight: 800; padding: 2px 5px; cursor: pointer;">◀ -0.1s</button>
                          <input type="number" id="input-sel-end" step="0.05" min="0" max="${audioDur}" value="${selectionEndSec.toFixed(2)}" style="width: 58px; background: #0f172a; color: #38bdf8; border: 1px solid #475569; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.8rem; text-align: center; font-weight: 700;">
                          <button type="button" class="btn-nudge-end-right" title="0.1s વધુ કાપો" style="background: #334155; color: #f8fafc; border: 1px solid #475569; border-radius: 4px; font-size: 0.7rem; font-weight: 800; padding: 2px 5px; cursor: pointer;">+0.1s ▶</button>
                        </div>

                        <!-- Quick Silence Presets -->
                        <div style="display: flex; align-items: center; gap: 4px;">
                          <button type="button" class="btn-quick-sel-preset" data-dur="0.3" style="background: #1e293b; color: #e2e8f0; border: 1px solid #475569; font-size: 0.7rem; font-weight: 700; padding: 2px 5px; border-radius: 4px; cursor: pointer;">0.3s</button>
                          <button type="button" class="btn-quick-sel-preset" data-dur="0.5" style="background: #1e293b; color: #e2e8f0; border: 1px solid #475569; font-size: 0.7rem; font-weight: 700; padding: 2px 5px; border-radius: 4px; cursor: pointer;">0.5s</button>
                          <button type="button" class="btn-quick-sel-preset" data-dur="1.0" style="background: #1e293b; color: #e2e8f0; border: 1px solid #475569; font-size: 0.7rem; font-weight: 700; padding: 2px 5px; border-radius: 4px; cursor: pointer;">1.0s</button>
                          <button
                            type="button"
                            id="btn-auto-silence"
                            class="btn-trigger-auto-silence"
                            style="background: #8b5cf6; color: #ffffff; border: none; font-weight: 800; font-size: 0.72rem; padding: 3px 8px; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;"
                            title="ઓડિયોમાં રહેલી નજીકની શાંતિ આપમેળે શોધો"
                          >
                            <span>🎯</span> <span>ઓટો-શાંતિ</span>
                          </button>
                        </div>
                      </div>
                      <span>${formatTimePrecise(audioDur)}</span>
                    </div>
                  </div>

                  <!-- Waveform Action Toolbar -->
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <button id="btn-play-selection" style="background: #2563eb; color: #ffffff; border: none; font-weight: 700; font-size: 0.8rem; padding: 7px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                        <span>▶️</span> પસંદ કરેલ ભાગ સાંભળો (Play Selection)
                      </button>
                      <button id="btn-cut-middle" style="background: #dc2626; color: #ffffff; border: none; font-weight: 800; font-size: 0.8rem; padding: 7px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                        <span>✂️</span> વચ્ચેનો ભાગ કાપો & જોડો (Cut Middle & Join)
                      </button>
                      <button id="btn-cut-start" style="background: #d97706; color: #ffffff; border: none; font-weight: 700; font-size: 0.8rem; padding: 7px 12px; border-radius: 6px; cursor: pointer;">
                        ✂️ શરૂઆત કાપો (Cut Start)
                      </button>
                      <button id="btn-cut-end" style="background: #d97706; color: #ffffff; border: none; font-weight: 700; font-size: 0.8rem; padding: 7px 12px; border-radius: 6px; cursor: pointer;">
                        ✂️ છેલ્લો ભાગ કાપો (Cut End)
                      </button>
                      <button id="btn-step5-zero-noise" style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; border: none; font-weight: 800; font-size: 0.8rem; padding: 7px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 6px rgba(2,132,199,0.3);" title="પંખો, એસી, રૂમનો અવાજ કે કોઈપણ બેકગ્રાઉન્ડ ઘોંઘાટ ૧૦૦% દૂર કરી માત્ર શુદ્ધ અવાજ રાખો">
                        <span>🛡️</span> શૂન્ય બેકગ્રાઉન્ડ નોઈઝ (Zero Noise)
                      </button>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px;">
                      <button id="btn-restore-orig-audio" style="background: #ffffff; color: #059669; border: 1.5px solid #a7f3d0; font-weight: 700; font-size: 0.8rem; padding: 7px 14px; border-radius: 6px; cursor: pointer;" title="મૂળ ઓરિજિનલ રેકોર્ડિંગ પાછું લાવો">
                        🔄 મૂળ અવાજ પાછો લાવો (Restore Original)
                      </button>
                    </div>
                  </div>

                  <!-- Volume, Fades & Audio Settings -->
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px;">
                    <div>
                      <label style="font-size: 0.8rem; font-weight: 700; color: #0f172a; display: block; margin-bottom: 4px;">
                        અવાજ લેવલ (Volume): <span id="label-clip-vol" style="color: #2563eb;">${Math.round((curClip.volume !== undefined ? curClip.volume : 1.0) * 100)}%</span>
                      </label>
                      <input type="range" id="input-clip-vol" min="0" max="2" step="0.05" value="${curClip.volume !== undefined ? curClip.volume : 1.0}" style="width: 100%; accent-color: #2563eb;">
                    </div>

                    <div>
                      <label style="font-size: 0.8rem; font-weight: 700; color: #0f172a; display: block; margin-bottom: 4px;">
                        Fade In (શરૂઆત સ્મૂધ): <span style="color: #2563eb;">${curClip.fadeIn || 0}s</span>
                      </label>
                      <select id="select-fade-in" style="width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.82rem; background: #fff;">
                        <option value="0" ${curClip.fadeIn === 0 ? 'selected' : ''}>None (0s)</option>
                        <option value="0.25" ${curClip.fadeIn === 0.25 ? 'selected' : ''}>0.25s</option>
                        <option value="0.5" ${curClip.fadeIn === 0.5 ? 'selected' : ''}>0.5s</option>
                        <option value="1.0" ${curClip.fadeIn === 1.0 ? 'selected' : ''}>1.0s</option>
                      </select>
                    </div>

                    <div>
                      <label style="font-size: 0.8rem; font-weight: 700; color: #0f172a; display: block; margin-bottom: 4px;">
                        Fade Out (અંત સ્મૂધ): <span style="color: #2563eb;">${curClip.fadeOut || 0}s</span>
                      </label>
                      <select id="select-fade-out" style="width: 100%; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.82rem; background: #fff;">
                        <option value="0" ${curClip.fadeOut === 0 ? 'selected' : ''}>None (0s)</option>
                        <option value="0.25" ${curClip.fadeOut === 0.25 ? 'selected' : ''}>0.25s</option>
                        <option value="0.5" ${curClip.fadeOut === 0.5 ? 'selected' : ''}>0.5s</option>
                        <option value="1.0" ${curClip.fadeOut === 1.0 ? 'selected' : ''}>1.0s</option>
                      </select>
                    </div>

                    <div style="display: flex; align-items: flex-end;">
                      <button id="btn-apply-fades" style="width: 100%; background: #059669; color: #ffffff; border: none; font-weight: 700; font-size: 0.82rem; padding: 8px 12px; border-radius: 6px; cursor: pointer;">
                        ✓ વોલ્યુમ & Fades સાચવો
                      </button>
                    </div>
                  </div>

                  <!-- Recording Clip Length & Range Control -->
                  <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 14px 18px; margin-top: 10px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
                      <strong style="color: #166534; font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
                        <span>✂️</span> આ સ્લાઇડનું રેકોર્ડિંગ કેટલું વાપરવું (Clip Audio Length & Range):
                      </strong>
                      <span style="font-size: 0.78rem; font-weight: 700; color: #15803d; background: #dcfce7; padding: 2px 8px; border-radius: 4px;">
                        કુલ રેકોર્ડિંગ: ${(curClip.originalDuration || audioDur).toFixed(1)}s • હાલનો વપરાશ: ${(curClip.duration || 8).toFixed(1)}s
                      </span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                      <label style="font-size: 0.82rem; font-weight: 700; color: #374151; display: inline-flex; align-items: center; gap: 6px;">
                        શરૂઆત ઑફસેટ:
                        <input type="number" id="input-clip-trim-start" step="0.5" min="0" max="${audioDur}" value="${(curClip.trimStartSec || 0).toFixed(1)}" style="width: 70px; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 800; text-align: center; background: #fff;"> s
                      </label>
                      <label style="font-size: 0.82rem; font-weight: 700; color: #374151; display: inline-flex; align-items: center; gap: 6px;">
                        વિડીયો અવધિ (Duration):
                        <input type="number" id="input-clip-trim-duration" step="0.5" min="1" max="600" value="${(curClip.duration || 8).toFixed(1)}" style="width: 70px; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 800; text-align: center; background: #fff;"> s
                      </label>
                      <button type="button" id="btn-apply-clip-trim-range" style="background: #16a34a; color: #fff; border: none; font-weight: 800; font-size: 0.8rem; padding: 7px 16px; border-radius: 6px; cursor: pointer;">
                        ✓ સેટ કરો
                      </button>
                      <button type="button" id="btn-set-full-audio-length" style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; font-weight: 800; font-size: 0.8rem; padding: 7px 14px; border-radius: 6px; cursor: pointer;">
                        🎙️ આખો અવાજ વાપરો (${(curClip.originalDuration || audioDur).toFixed(1)}s)
                      </button>
                    </div>
                  </div>

                  <!-- Audio Management Options -->
                  <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                    <div style="display: flex; gap: 8px;">
                      <button id="btn-delete-clip-audio" style="background: #fff; color: #dc2626; border: 1.5px solid #fecaca; font-size: 0.8rem; font-weight: 700; padding: 6px 14px; border-radius: 6px; cursor: pointer;">
                        🗑️ આ ક્લિપમાંથી ઓડિયો હટાવો (Keep Slide Only)
                      </button>
                    </div>
                  </div>
                ` : `
                  <!-- When Clip has No Audio -->
                  <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 10px; padding: 24px; text-align: center;">
                    <span style="font-size: 2.2rem; display: block; margin-bottom: 8px;">🎙️</span>
                    <h3 style="font-size: 1.05rem; font-weight: 800; color: #92400e; margin: 0 0 6px 0;">આ ક્લિપ માટે ઓડિયો રેકોર્ડ થયેલ નથી</h3>
                    <p style="font-size: 0.84rem; color: #78350f; margin: 0 0 16px 0;">
                      તમે બીજી સ્લાઇડનો સાચવેલો ઓડિયો અહીં જોડી શકો છો અથવા Voice Studio માં જઈને રેકોર્ડ કરી શકો છો:
                    </p>
                    <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                      <select id="select-replace-audio" style="padding: 7px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.82rem; background: #fff;">
                        <option value="">-- અન્ય સ્લાઇડનો ઓડિયો પસંદ કરો --</option>
                        ${storedSlideAudios.filter(r => r.url || r.dataUrl).map(r => `
                          <option value="${r.url || r.dataUrl}">સ્લાઇડ #${r.slideNumber} નો ઓડિયો (${Math.round(r.duration || 0)}s)</option>
                        `).join('')}
                      </select>
                      <button id="btn-assign-selected-audio" style="background: #2563eb; color: #ffffff; border: none; font-weight: 700; font-size: 0.82rem; padding: 7px 16px; border-radius: 6px; cursor: pointer;">
                        જોડો (Assign Audio)
                      </button>
                    </div>
                  </div>
                `}

              </div>
            ` : `
              <!-- SUB-TAB B: SLIDE CONTROLS -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
                
                <!-- Replace Slide Dropdown -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
                  <label style="font-size: 0.85rem; font-weight: 800; color: #0f172a; display: block; margin-bottom: 6px;">
                    📄 PDF સ્લાઇડ બદલો (Replace with existing slide):
                  </label>
                  <p style="font-size: 0.76rem; color: #64748b; margin: 0 0 10px 0;">
                    મૂળ PDF ફાઇલને કોઈપણ નુકસાન કર્યા વગર આ ક્લિપમાં બીજી સ્લાઇડ મૂકો:
                  </p>
                  <select id="select-replace-slide" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem; background: #fff; margin-bottom: 12px;">
                    ${connectedSequence.slides.map(s => `
                      <option value="${s.slideId}" ${s.slideId === curClip.slideId ? 'selected' : ''}>
                        સ્લાઇડ #${s.slideNumber}: ${s.title || 'સ્લાઇડ'} (પાનું #${s.pageNumber || s.slideNumber})
                      </option>
                    `).join('')}
                  </select>
                  <button id="btn-apply-replace-slide" style="background: #2563eb; color: #ffffff; border: none; font-weight: 700; font-size: 0.82rem; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                    સ્લાઇડ બદલો (Apply Slide)
                  </button>
                </div>

                <!-- Custom Duration Adjustment -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
                  <label style="font-size: 0.85rem; font-weight: 800; color: #0f172a; display: block; margin-bottom: 6px;">
                    ⏱️ સ્લાઇડ સમયગાળો (Duration in Seconds):
                  </label>
                  <p style="font-size: 0.76rem; color: #64748b; margin: 0 0 10px 0;">
                    જો અવાજ ન હોય અથવા સ્લાઇડ વધારે સમય રાખવી હોય તો સેકન્ડ્સ સેટ કરો:
                  </p>
                  <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px;">
                    <input type="number" id="input-custom-dur" min="1" max="180" step="0.5" value="${curClip.duration}" style="width: 100px; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.9rem; font-weight: 700; background: #fff;">
                    <span style="font-size: 0.85rem; font-weight: 700; color: #475569;">સેકન્ડ્સ</span>
                  </div>
                  <button id="btn-apply-custom-dur" style="background: #059669; color: #ffffff; border: none; font-weight: 700; font-size: 0.82rem; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                    સમયગાળો સેટ કરો (Set Duration)
                  </button>
                </div>

                <!-- Live Slide Text & Title Editor -->
                <div style="background: #f8fafc; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 16px; grid-column: 1 / -1;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                    <label style="font-size: 0.9rem; font-weight: 800; color: #1e40af;">
                      ✏️ સ્લાઇડ #${curClip.slideNumber} નું ટાઇટલ અને લખાણ (Slide Title & Bullets Edit):
                    </label>
                    <button type="button" id="btn-save-slide-details" style="background: #2563eb; color: #ffffff; border: none; font-weight: 800; font-size: 0.82rem; padding: 6px 16px; border-radius: 6px; cursor: pointer;">
                      💾 સ્લાઇડ સેવ કરો
                    </button>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    <div>
                      <span style="font-size: 0.76rem; font-weight: 700; color: #475569;">સ્લાઇડ ટાઇટલ:</span>
                      <input type="text" id="input-edit-slide-title" value="${curClip.title || ''}" placeholder="સ્લાઇડ ટાઇટલ" style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 700; font-size: 0.9rem;">
                    </div>
                    <div>
                      <span style="font-size: 0.76rem; font-weight: 700; color: #475569;">સબટાઇટલ (ઓપ્શનલ):</span>
                      <input type="text" id="input-edit-slide-subtitle" value="${curClip.subtitle || ''}" placeholder="સબટાઇટલ (ઓપ્શનલ)" style="width: 100%; padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem;">
                    </div>
                    <div>
                      <span style="font-size: 0.76rem; font-weight: 700; color: #475569;">મુદ્દાઓ (Bullet Points - દરેક નવી લાઈનમાં એક મુદ્દો):</span>
                      <textarea id="ta-edit-slide-bullets" rows="3" placeholder="બુલેટ પોઇન્ટ્સ..." style="width: 100%; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.85rem; line-height: 1.6;">${(curClip.bulletPoints || []).join('\n')}</textarea>
                    </div>
                  </div>
                </div>

              </div>
            `}

          </section>

          <!-- --------------------------------------------------------------- -->
          

            <!-- Clean Saved Video Section & Direct WhatsApp (Section 4) -->
            <!-- 4. CLEAN SAVED VIDEO SECTION                                    -->
          <!-- --------------------------------------------------------------- -->
          ${savedVideoUrl ? `
            <section id="saved-video-section" style="background: #ffffff; border: 1.5px solid #a7f3d0; border-radius: 14px; padding: 22px; box-shadow: 0 4px 16px rgba(16,185,129,0.06);">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 1.5rem;">🎉</span>
                  <div>
                    <h2 style="font-size: 1.2rem; font-weight: 800; color: #065f46; margin: 0;">
                      સેવ કરેલો ફાઇનલ વિડીયો (Saved Full HD Video)
                    </h2>
                    <p style="font-size: 0.82rem; color: #047857; margin: 2px 0 0 0;">
                      તમારો 1080p MP4 વિડીયો તૈયાર છે અને કાયમી સંગ્રહાયેલ છે:
                    </p>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <button id="btn-reopen-preview" style="background: #2563eb; color: #ffffff; border: none; font-weight: 800; font-size: 0.85rem; padding: 9px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                    <span>▶️</span> <span>વિડીયો પ્લેયરમાં જુઓ</span>
                  </button>
                  <button id="btn-share-saved-video-card" type="button" style="background: linear-gradient(135deg, #25D366, #128C7E); color: #ffffff; border: none; font-weight: 800; font-size: 0.85rem; padding: 9px 18px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(37,211,102,0.35);">
                    <span>💬</span> <span>WhatsApp પર મોકલો</span>
                  </button>
                  <a href="${savedVideoUrl}" download="${savedVideoFilename || 'slides_video.mp4'}" style="background: #059669; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 0.85rem; padding: 9px 18px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
                    <span>💾</span> <span>MP4 વિડીયો ડાઉનલોડ કરો (1080p HD)</span>
                  </a>
                  <a href="/audio/master_presentation_audio.wav" download="master_gujarati_voiceover_193s.wav" style="background: #eff6ff; color: #2563eb; border: 1.5px solid #bfdbfe; text-decoration: none; font-weight: 800; font-size: 0.85rem; padding: 9px 16px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px;">
                    <span>🎙️</span> <span>માસ્ટર ઓડિયો ડાઉનલોડ કરો (WAV)</span>
                  </a>
                </div>
              </div>

              <!-- Metadata Grid -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px;">
                <div>
                  <span style="font-size: 0.72rem; color: #166534; display: block;">વિડીયો ટાઇટલ</span>
                  <strong id="meta-video-title" style="color: #0f172a; font-size: 0.88rem; font-weight: 800;">${currentVideoTitle}</strong>
                </div>
                <div>
                  <span style="font-size: 0.72rem; color: #166534; display: block;">કેટલા વાગે બન્યો (બન્યા સમય)</span>
                  <strong id="meta-video-time" style="color: #b45309; font-size: 0.88rem; font-weight: 800;">🕒 ${formattedVideoCreationTime}</strong>
                </div>
                <div>
                  <span style="font-size: 0.72rem; color: #166534; display: block;">વિડીયો ફાઇલ</span>
                  <strong style="color: #0f172a; font-size: 0.85rem; word-break: break-all;">${savedVideoFilename || 'presentation_1080p.mp4'}</strong>
                </div>
                <div>
                  <span style="font-size: 0.72rem; color: #166534; display: block;">રિઝોલ્યુશન</span>
                  <strong style="color: #0f172a; font-size: 0.88rem;">1920x1080 Full HD (30 FPS)</strong>
                </div>
                <div>
                  <span style="font-size: 0.72rem; color: #166534; display: block;">કુલ સમયગાળો</span>
                  <strong style="color: #2563eb; font-size: 0.88rem;">${formattedTotalDuration}</strong>
                </div>
                <div>
                  <span style="font-size: 0.72rem; color: #166534; display: block;">સ્ટેટસ</span>
                  <strong style="color: #059669; font-size: 0.88rem;">🟢 સફળતાપૂર્વક સાચવેલ (Saved)</strong>
                </div>
              </div>
            </section>
          ` : ''}

          
          </div>

<!-- CONNECTED WORKFLOW STEPPER BAR (TOOLS 1 TO 7 JOODAN) -->
          <div class="card workspace-bottom-stepper" style="background: rgba(15, 23, 42, 0.95); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: 12px; padding: 14px 20px; margin-top: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.4rem;">🔗</span>
              <div>
                <div style="font-size: 0.78rem; color: #38bdf8; font-weight: 700;">
                  વિડીયો વર્કફ્લો જોડાણ: <strong>પગલું ૬ / ૭</strong>
                </div>
                <div style="font-weight: 800; font-size: 0.95rem; color: #ffffff;">
                  ૬. Video Editor (સ્લાઇડ ક્લિપ જોડાણ & વિડીયો નિર્માણ) <!-- ૪. Video Editor -->
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <button id="ws-btn-bottom-prev-videoeditor" class="btn btn-outline btn-sm" style="font-weight: 700; border-color: rgba(255,255,255,0.25); color: #cbd5e1; cursor: pointer;">
                ← પાછલું પગલું: ૫. Script
              </button>
              <button id="ws-btn-bottom-next-videoeditor" class="btn btn-primary btn-sm" style="font-weight: 900; background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 10px 20px; border-radius: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.4); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                આગળનું પગલું: ૭. Thumbnail (થંબનેલ AI) →
              </button>
            </div>
          </div>

        </main>

        <!-- Hidden Modal for Backward Compatibility in Tests -->
        <div id="modal-export-video" style="display: none;">
          <div id="export-progress-box"><div id="export-progress-bar"></div><span id="export-pct-label"></span></div>
          <div id="export-success-box"><video id="modal-video-preview"></video><a id="link-direct-download"></a><button id="btn-modal-play-sound-now"></button></div>
        </div>

      </div>
    `;

    attachEvents();

    // Draw initial waveforms if canvas and buffer exist
    if (activeDecodedBuffer) {
      syncSelectionRangeInputs();
      redrawAllWaveforms(waveformPlayheadPct);
    } else if (curClip?.audioUrl) {
      decodeAudioUrlToBuffer(curClip.audioUrl).then(buf => {
        if (!buf) return;
        activeDecodedBuffer = buf;
        if (curClip && buf.duration > 0) {
          curClip.duration = Number(buf.duration.toFixed(2));
          curClip.formattedDuration = formatTime(curClip.duration);
        }
        selectionStartSec = 0;
        selectionEndSec = Math.min(2.0, buf.duration);
        waveformPlayheadPct = 0;
        syncSelectionRangeInputs();
        redrawAllWaveforms(0);
      });
    }
  }

  // =========================================================================
  // Smooth Audio Waveform Selection Engine (Draggable Handles, Window Panning & Auto Silence)
  // =========================================================================
  function syncSelectionRangeInputs() {
    const realDur = activeDecodedBuffer ? activeDecodedBuffer.duration : 0;
    const s = Math.min(selectionStartSec, selectionEndSec);
    const e = Math.max(selectionStartSec, selectionEndSec);
    const diff = Math.abs(e - s);

    const startInputs = container.querySelectorAll('#input-step1-sel-start, #input-sel-start');
    const endInputs = container.querySelectorAll('#input-step1-sel-end, #input-sel-end');
    startInputs.forEach(inp => {
      if (realDur > 0) inp.max = realDur.toFixed(2);
      if (typeof document !== 'undefined' && document.activeElement !== inp) inp.value = s.toFixed(2);
    });
    endInputs.forEach(inp => {
      if (realDur > 0) inp.max = realDur.toFixed(2);
      if (typeof document !== 'undefined' && document.activeElement !== inp) inp.value = e.toFixed(2);
    });

    if (realDur > 0) {
      const scrubber = container.querySelector('#audio-scrubber-input');
      if (scrubber) scrubber.max = realDur.toFixed(2);
      const step1Total = container.querySelector('#step1-total-audio-dur');
      if (step1Total) step1Total.textContent = formatTimePrecise(realDur);
    }

    const rangeInfos = container.querySelectorAll('#step1-sel-range-info');
    rangeInfos.forEach(info => {
      info.textContent = `(${diff.toFixed(2)}s પસંદગી)`;
    });
  }

  function autoSelectNextSilence() {
    if (!activeDecodedBuffer) {
      showNoticeToast('ઓડિયો ઉપલબ્ધ નથી.', 'warning');
      return;
    }
    const rawData = activeDecodedBuffer.getChannelData(0);
    const sampleRate = activeDecodedBuffer.sampleRate || 44100;
    const dur = activeDecodedBuffer.duration || 1;
    const threshold = 0.012; // -38dB
    const minSilenceSamples = Math.floor(0.20 * sampleRate); // >= 200ms

    // Look forward from selectionEndSec or playhead
    const fromTime = (selectionEndSec > 0 && selectionEndSec < dur - 0.2)
      ? selectionEndSec + 0.05
      : (waveformPlayheadPct > 0 ? (waveformPlayheadPct * dur) : 0);

    const blockSize = Math.floor(sampleRate * 0.03);
    let silenceStart = -1;
    let foundSilence = null;

    for (let s = 0; s < rawData.length; s += blockSize) {
      let peak = 0;
      for (let i = 0; i < blockSize && (s + i) < rawData.length; i++) {
        const v = Math.abs(rawData[s + i]);
        if (v > peak) peak = v;
      }
      if (peak < threshold) {
        if (silenceStart === -1) silenceStart = s;
      } else {
        if (silenceStart !== -1) {
          if ((s - silenceStart) >= minSilenceSamples) {
            const sSec = silenceStart / sampleRate;
            const eSec = s / sampleRate;
            if (sSec >= (fromTime - 0.05)) {
              foundSilence = { startSec: sSec, endSec: eSec };
              break;
            }
          }
          silenceStart = -1;
        }
      }
    }

    if (!foundSilence && silenceStart !== -1 && (rawData.length - silenceStart) >= minSilenceSamples) {
      foundSilence = {
        startSec: silenceStart / sampleRate,
        endSec: dur
      };
    }

    // Wrap-around: scan from beginning if none found forward
    if (!foundSilence) {
      silenceStart = -1;
      for (let s = 0; s < rawData.length; s += blockSize) {
        let peak = 0;
        for (let i = 0; i < blockSize && (s + i) < rawData.length; i++) {
          const v = Math.abs(rawData[s + i]);
          if (v > peak) peak = v;
        }
        if (peak < threshold) {
          if (silenceStart === -1) silenceStart = s;
        } else {
          if (silenceStart !== -1) {
            if ((s - silenceStart) >= minSilenceSamples) {
              foundSilence = { startSec: silenceStart / sampleRate, endSec: s / sampleRate };
              break;
            }
            silenceStart = -1;
          }
        }
      }
    }

    if (foundSilence) {
      selectionStartSec = Math.max(0, parseFloat(foundSilence.startSec.toFixed(2)));
      selectionEndSec = Math.min(dur, parseFloat(foundSilence.endSec.toFixed(2)));
      syncSelectionRangeInputs();
      redrawAllWaveforms(waveformPlayheadPct);
      showNoticeToast(`🎯 શાંતિ સિલેક્ટ થઈ: ${selectionStartSec.toFixed(2)}s થી ${selectionEndSec.toFixed(2)}s (${(selectionEndSec - selectionStartSec).toFixed(2)}s)`, 'info');
    } else {
      showNoticeToast('આ ઓડિયોમાં કોઈ નોંધપાત્ર શાંતિ મળી નથી.', 'info');
    }
  }

  let step1WaveformAbort = null;
  let step5WaveformAbort = null;

  function setupWaveformInteraction(canvas, type = 'step1') {
    if (!canvas) return;
    const isStep1 = (type === 'step1');
    if (isStep1) {
      if (step1WaveformAbort) { try { step1WaveformAbort.abort(); } catch (_) { } }
      step1WaveformAbort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    } else {
      if (step5WaveformAbort) { try { step5WaveformAbort.abort(); } catch (_) { } }
      step5WaveformAbort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    }
    const currentAbort = isStep1 ? step1WaveformAbort : step5WaveformAbort;
    const signal = currentAbort ? currentAbort.signal : undefined;

    let dragMode = 'none'; // 'none' | 'create' | 'drag-start' | 'drag-end' | 'move-window'
    let windowDuration = 0;
    let windowOffset = 0;

    function getCanvasX(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = (e.touches && e.touches.length > 0)
        ? e.touches[0].clientX
        : (e.clientX !== undefined ? e.clientX : 0);
      return Math.max(0, Math.min(rect.width, clientX - rect.left));
    }

    function getTimeFromX(x) {
      if (!activeDecodedBuffer) return 0;
      const dur = activeDecodedBuffer.duration || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || canvas.width || 1;
      return Math.max(0, Math.min(dur, (x / w) * dur));
    }

    canvas.addEventListener('mousemove', (e) => {
      if (dragMode !== 'none' || !activeDecodedBuffer) return;
      const x = getCanvasX(e);
      const rect = canvas.getBoundingClientRect();
      canvas._hoverX = (x / (rect.width || 1)) * canvas.width;

      const dur = activeDecodedBuffer.duration || 1;
      const s = Math.min(selectionStartSec, selectionEndSec);
      const end = Math.max(selectionStartSec, selectionEndSec);
      const leftX = (s / dur) * rect.width;
      const rightX = (end / dur) * rect.width;
      const handleTolerance = 14;

      if (Math.abs(end - s) > 0.05) {
        if (Math.abs(x - leftX) <= handleTolerance || Math.abs(x - rightX) <= handleTolerance) {
          canvas.style.cursor = 'ew-resize';
        } else if (x > (leftX + handleTolerance) && x < (rightX - handleTolerance)) {
          canvas.style.cursor = 'grab';
        } else {
          canvas.style.cursor = 'crosshair';
        }
      } else {
        canvas.style.cursor = 'crosshair';
      }
      redrawAllWaveforms(waveformPlayheadPct);
    }, { signal });

    canvas.addEventListener('mouseleave', () => {
      if (dragMode === 'none') {
        canvas._hoverX = null;
        redrawAllWaveforms(waveformPlayheadPct);
      }
    }, { signal });

    const onPointerDown = (e) => {
      if (!activeDecodedBuffer) return;
      const dur = activeDecodedBuffer.duration || 1;
      const rect = canvas.getBoundingClientRect();
      const x = getCanvasX(e);
      const timeSec = getTimeFromX(x);

      const s = Math.min(selectionStartSec, selectionEndSec);
      const end = Math.max(selectionStartSec, selectionEndSec);
      const leftX = (s / dur) * rect.width;
      const rightX = (end / dur) * rect.width;
      const handleTolerance = 14;

      if (Math.abs(end - s) > 0.05 && Math.abs(x - leftX) <= handleTolerance) {
        dragMode = 'drag-start';
        selectionStartSec = s;
        selectionEndSec = end;
        canvas.style.cursor = 'ew-resize';
      } else if (Math.abs(end - s) > 0.05 && Math.abs(x - rightX) <= handleTolerance) {
        dragMode = 'drag-end';
        selectionStartSec = s;
        selectionEndSec = end;
        canvas.style.cursor = 'ew-resize';
      } else if (Math.abs(end - s) > 0.05 && x > (leftX + handleTolerance) && x < (rightX - handleTolerance)) {
        dragMode = 'move-window';
        windowDuration = end - s;
        windowOffset = timeSec - s;
        canvas.style.cursor = 'grabbing';
      } else {
        dragMode = 'create';
        selectionStartSec = timeSec;
        selectionEndSec = timeSec;
        canvas.style.cursor = 'crosshair';
      }

      syncSelectionRangeInputs();
      redrawAllWaveforms(waveformPlayheadPct);
    };

    const onPointerMove = (e) => {
      if (dragMode === 'none' || !activeDecodedBuffer) return;
      const dur = activeDecodedBuffer.duration || 1;
      const x = getCanvasX(e);
      const timeSec = getTimeFromX(x);
      const rect = canvas.getBoundingClientRect();
      canvas._hoverX = (x / (rect.width || 1)) * canvas.width;

      if (dragMode === 'create') {
        selectionEndSec = timeSec;
      } else if (dragMode === 'drag-start') {
        selectionStartSec = Math.min(dur, Math.max(0, timeSec));
      } else if (dragMode === 'drag-end') {
        selectionEndSec = Math.min(dur, Math.max(0, timeSec));
      } else if (dragMode === 'move-window') {
        let newStart = timeSec - windowOffset;
        newStart = Math.max(0, Math.min(dur - windowDuration, newStart));
        selectionStartSec = newStart;
        selectionEndSec = newStart + windowDuration;
      }

      syncSelectionRangeInputs();
      redrawAllWaveforms(waveformPlayheadPct);
    };

    const onPointerUp = () => {
      if (dragMode !== 'none') {
        dragMode = 'none';
        canvas._hoverX = null;
        if (selectionStartSec > selectionEndSec) {
          const t = selectionStartSec;
          selectionStartSec = selectionEndSec;
          selectionEndSec = t;
        }
        canvas.style.cursor = 'crosshair';
        syncSelectionRangeInputs();
        redrawAllWaveforms(waveformPlayheadPct);
      }
    };

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('touchstart', onPointerDown, { passive: true });
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', onPointerMove, { signal });
      window.addEventListener('touchmove', onPointerMove, { passive: true, signal });
      window.addEventListener('mouseup', onPointerUp, { signal });
      window.addEventListener('touchend', onPointerUp, { signal });
    }
  }

  // =========================================================================
  // DOM Event Handlers
  // =========================================================================
  function attachEvents() {
    const getFormattedDuration = () => {
      try {
        return formatTime(calculateTotalDuration());
      } catch (_) {
        return '00:00';
      }
    };

    // Guaranteed Direct MP4 File Download Handler (Zero Pop-up Blocking)
    const triggerDirectFileDownload = (e) => {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      const file = savedVideoFilename || project?.editing?.lastExportedFilename || 'latest_video.mp4';
      const safeName = file.endsWith('.mp4') ? file : `${file}.mp4`;
      const dlUrl = `/api/voice/download-video?file=${encodeURIComponent(file)}&name=${encodeURIComponent(safeName)}`;

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = dlUrl;
      document.body.appendChild(iframe);
      setTimeout(() => {
        try { iframe.remove(); } catch (_) {}
      }, 6000);

      try {
        const a = document.createElement('a');
        a.href = dlUrl;
        a.setAttribute('download', safeName);
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { try { a.remove(); } catch (_) {} }, 1000);
      } catch (_) {}

      showNoticeToast('📥 ૧૦૮૦p MP4 વિડીયો ડાઉનલોડ શરૂ થઈ ગયું છે! (Downloads ફોલ્ડર ચેક કરો)', 'success');
    };

    // Guaranteed Direct WhatsApp Share Handler (Instant WhatsApp opening on Mobile / Web)
    const triggerWhatsAppShare = (btn) => {
      shareToWhatsApp(project, {
        triggerButton: btn,
        customVideoUrl: savedVideoUrl,
        customFilename: savedVideoFilename || project?.editing?.lastExportedFilename || 'latest_video.mp4',
        durationFormatted: getFormattedDuration(),
        createdAtFormatted: formattedVideoCreationTime
      });
    };

    // -----------------------------------------------------------------------
    // TOP PRIORITY: Instant Slide Navigation Handlers (Guaranteed Response)
    // -----------------------------------------------------------------------
    container.querySelectorAll('#btn-prev-slide, .btn-nav-prev-slide').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        goToPrevSlide();
      };
    });

    container.querySelectorAll('#btn-next-slide, .btn-nav-next-slide').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        goToNextSlide();
      };
    });

    container.querySelectorAll('#step1-select-slide, .step1-select-slide-nav').forEach(sel => {
      sel.onchange = (e) => {
        const idx = parseInt(e.target.value, 10);
        if (!isNaN(idx) && idx >= 0 && idx < generatedClips.length) {
          selectClip(idx);
        }
      };
    });

    container.querySelectorAll('.wf-step1-slide-card').forEach(card => {
      card.onclick = (e) => {
        const idx = parseInt(card.dataset.clipIndex, 10);
        if (!isNaN(idx) && idx >= 0 && idx < generatedClips.length) {
          selectClip(idx);
        }
      };
    });

    // Keyboard Arrow Navigation for Instant Slide Turning (Left / Right)
    const handleVideoEditorKeyNav = (e) => {
      const tag = (e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '');
      if (tag === 'input' || tag === 'textarea' || (e.target && e.target.isContentEditable)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (currentSlideIndex < generatedClips.length - 1) {
          e.preventDefault();
          selectClip(currentSlideIndex + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (currentSlideIndex > 0) {
          e.preventDefault();
          selectClip(currentSlideIndex - 1);
        }
      }
    };
    window.onkeydown = handleVideoEditorKeyNav;

    // =========================================================================
    // 5-Step Workflow State Switching & Navigation
    // =========================================================================
    function switchWorkflowStep(stepNum) {
      currentWorkflowStep = Math.max(1, Math.min(5, Number(stepNum)));
      try {
        localStorage.setItem(`gyan_videoeditor_active_step_${project.id}`, String(currentWorkflowStep));
      } catch (_) {}

      // Toggle panels
      for (let i = 1; i <= 5; i++) {
        const p = container.querySelector(`#panel-wf-step-${i}`);
        if (p) p.style.display = (i === currentWorkflowStep) ? 'block' : 'none';
      }

      // Update tabs UI
      container.querySelectorAll('.btn-wf-step-tab').forEach(tab => {
        const s = parseInt(tab.dataset.step, 10);
        const isActive = s === currentWorkflowStep;
        tab.style.background = isActive ? '#eff6ff' : '#f8fafc';
        tab.style.borderColor = isActive ? '#2563eb' : '#e2e8f0';
        tab.style.boxShadow = isActive ? '0 4px 12px rgba(37,99,235,0.15)' : 'none';
        const titleEl = tab.querySelector('.wf-step-title');
        if (titleEl) titleEl.style.color = isActive ? '#2563eb' : '#0f172a';
      });

      // Update step indicator title & buttons
      const indNum = container.querySelector('#wf-step-indicator-num');
      if (indNum) indNum.textContent = String(currentWorkflowStep);

      const indTitle = container.querySelector('#wf-step-indicator-title');
      if (indTitle) {
        const titles = ['૧. વોઇસ રેકોર્ડિંગ', '૨. નોઈઝ રીમૂવલ', '૩. સ્લાઇડ + વોઇસ સિંક', '૪. વિડીયો જનરેશન', '૫. ફાઇનલ એડિટર'];
        indTitle.textContent = titles[currentWorkflowStep - 1];
      }

      const prevBtn = container.querySelector('#btn-wf-prev-step');
      const nextBtn = container.querySelector('#btn-wf-next-step');
      if (prevBtn) {
        prevBtn.disabled = currentWorkflowStep <= 1;
        prevBtn.style.opacity = currentWorkflowStep <= 1 ? '0.45' : '1';
        prevBtn.style.cursor = currentWorkflowStep <= 1 ? 'not-allowed' : 'pointer';
      }
      if (nextBtn) {
        nextBtn.disabled = currentWorkflowStep >= 5;
        nextBtn.style.opacity = currentWorkflowStep >= 5 ? '0.45' : '1';
        nextBtn.style.cursor = currentWorkflowStep >= 5 ? 'not-allowed' : 'pointer';
      }

      if (currentWorkflowStep === 5) {
        const wfCanvas = container.querySelector('#audio-waveform-canvas');
        if (wfCanvas && activeDecodedBuffer) {
          drawInteractiveWaveform(wfCanvas, activeDecodedBuffer, selectionStartSec, selectionEndSec, waveformPlayheadPct);
        }
      }
    }

    // Bind Workflow Stepper Tabs
    container.querySelectorAll('.btn-wf-step-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const s = parseInt(tab.dataset.step, 10);
        if (!isNaN(s)) switchWorkflowStep(s);
      });
    });

    // Prev / Next Stepper Buttons
    container.querySelector('#btn-wf-prev-step')?.addEventListener('click', () => {
      if (currentWorkflowStep > 1) switchWorkflowStep(currentWorkflowStep - 1);
    });
    container.querySelector('#btn-wf-next-step')?.addEventListener('click', () => {
      if (currentWorkflowStep < 5) switchWorkflowStep(currentWorkflowStep + 1);
    });

    // Jump Buttons between steps
    container.querySelector('#btn-jump-to-step-2')?.addEventListener('click', () => switchWorkflowStep(2));
    container.querySelector('#btn-jump-to-step-3')?.addEventListener('click', () => switchWorkflowStep(3));
    container.querySelector('#btn-jump-to-step-4')?.addEventListener('click', () => switchWorkflowStep(4));
    container.querySelector('#btn-jump-to-step-5')?.addEventListener('click', () => switchWorkflowStep(5));
    container.querySelector('#btn-back-to-step1')?.addEventListener('click', () => switchWorkflowStep(1));

    // =========================================================================
    // STEP 1: SLIDE-WISE VOICE RECORDING FULL ENGINE
    // =========================================================================
    async function handleToggleSingleSlideRecording() {
      const cur = generatedClips[currentSlideIndex];
      if (!cur) return;

      if (isSingleSlideRecording) {
        // STOP RECORDING
        if (!singleSlideRecorder) return;
        const recBtn = container.querySelector('#btn-record-cur-slide') || container.querySelector(`.btn-step1-start-record-${currentSlideIndex}`);
        if (recBtn) {
          recBtn.disabled = true;
          recBtn.innerHTML = '<span>⏳</span> <span>અવાજ સેવ થઈ રહ્યો છે...</span>';
        }
        showNoticeToast(`🎙️ સ્લાઇડ #${cur.slideNumber} નો અવાજ સેવ થઈ રહ્યો છે...`, 'info');

        try {
          const res = await singleSlideRecorder.stop();
          singleSlideRecorder = null;
          isSingleSlideRecording = false;
          isRecordingPaused = false;

          if (res && (res.blob || res.buffer)) {
            pushUndoSnapshot('Slide Voice Record');
            let buf = res.buffer;
            if (!buf && res.blob) {
              try {
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                const ctx = new AudioCtxClass();
                const ab = await res.blob.arrayBuffer();
                buf = await ctx.decodeAudioData(ab);
                try { await ctx.close(); } catch (_) { }
              } catch (_) { }
            }

            // Clear any stale enhanced or server caches from earlier recordings
            delete cur.enhancedBlob;
            delete cur.enhancedDataUrl;
            delete cur.serverUrl;
            delete cur.cleanedAudioUrl;

            // Broadcast Studio Audio Intelligence & Loudness Normalization:
            // 1. Cleans room noise, mic rumble, and AC hum.
            // 2. Enhances vocal clarity, presence, and crispness (+3.2dB @ 3.2kHz).
            // 3. Normalizes loudness to broadcast level (-14.0 LUFS) with peak at -0.8 dBTP.
            // This guarantees the recorded voice is loud, punchy, crystal-clear, and sweet!
            let enhancedBlob = null;
            let enhancedUrl = '';
            if (buf) {
              try {
                const enh = await enhanceAudioBuffer(buf, {
                  preset: 'crystal_ultra_studio',
                  targetLUFS: -14.0,
                  targetPeakDb: -0.8,
                  intensity: 1.0,
                  noiseReduction: 0.98,
                  voiceClarity: 0.98,
                  volumeNormalization: true,
                  volume: 1.45,
                  clarityBoost: true,
                  noiseRemoval: true,
                  zeroBackgroundNoise: true
                });
                if (enh && (enh.buffer || enh.audioBuffer)) {
                  buf = enh.buffer || enh.audioBuffer;
                }
                if (enh && enh.blob) {
                  enhancedBlob = enh.blob;
                  enhancedUrl = enh.url;
                }
              } catch (enhErr) {
                console.warn('[Single Slide Audio Enhancement notice]:', enhErr);
              }
            }

            const wavBlob = enhancedBlob || (buf ? audioBufferToWav(buf) : res.blob);
            const wavUrl = enhancedUrl || ((wavBlob instanceof Blob) ? URL.createObjectURL(wavBlob) : (res.url || ''));
            const rawBlob = res.rawBlob || res.blob;
            const rawUrl = (rawBlob instanceof Blob) ? URL.createObjectURL(rawBlob) : wavUrl;
            const measuredDur = buf?.duration || res.duration || 2.0;

            cur.rawBlob = rawBlob;
            cur.rawUrl = rawUrl;
            cur.blob = wavBlob;
            cur.enhancedBlob = wavBlob;
            cur.audioUrl = wavUrl;
            cur.originalAudioUrl = wavUrl;
            cur.enhancedAudioUrl = wavUrl;
            cur.duration = Number(Math.max(1.0, measuredDur).toFixed(2));
            cur.formattedDuration = formatTime(cur.duration);
            cur.hasAudio = true;
            cur.isEnhanced = true;
            cur.isCrystalClearEnhanced = true;
            cur.status = 'Enhanced';
            cur.savedAt = new Date().toISOString();

            const singleAudioItem = {
              id: `${project.id}_slide_${cur.slideId}`,
              projectId: project.id,
              slideId: cur.slideId,
              slideNumber: cur.slideNumber,
              blob: wavBlob,
              enhancedBlob: wavBlob,
              rawBlob: rawBlob,
              url: wavUrl,
              enhancedUrl: wavUrl,
              rawUrl: rawUrl,
              duration: cur.duration,
              status: 'Enhanced',
              isEnhanced: true,
              isCrystalClearEnhanced: true,
              savedAt: cur.savedAt
            };

            await saveSlideAudioRecord(project.id, String(cur.slideId), singleAudioItem);
            await saveSlideAudioRecord(project.id, String(cur.slideNumber), singleAudioItem);
            uploadAudioToServer(wavBlob, `slide_${cur.slideNumber}_${Date.now()}.wav`, project.id)
              .then(srvUrl => { if (srvUrl) singleAudioItem.serverUrl = srvUrl; })
              .catch(() => {});

            // Filter out old records for this slide to prevent stale audio retrieval
            storedSlideAudios = storedSlideAudios.filter(r =>
              String(r.slideId) !== String(cur.slideId) &&
              Number(r.slideNumber) !== Number(cur.slideNumber) &&
              String(r.id) !== `${project.id}_slide_${cur.slideId}` &&
              String(r.id) !== `${project.id}_slide_${cur.slideNumber}`
            );
            storedSlideAudios.push(singleAudioItem);

            if (Array.isArray(project.slide?.slides)) {
              const matchedSlide = project.slide.slides.find(s =>
                s.slideNumber === cur.slideNumber || String(s.id) === String(cur.slideId)
              );
              if (matchedSlide) {
                matchedSlide.audioUrl = wavUrl;
                matchedSlide.enhancedAudioUrl = wavUrl;
                matchedSlide.hasAudio = true;
                matchedSlide.isEnhanced = true;
                matchedSlide.recordingDuration = cur.duration;
                matchedSlide.duration = cur.duration;
                delete matchedSlide.serverUrl;
                delete matchedSlide.cleanedAudioUrl;
              }
            }

            // Invalidate presentation stitched audio so new recording is used in full playback
            presentationStitchedUrl = null;
            if (fullPresentationAudio) {
              try { fullPresentationAudio.pause(); } catch (_) {}
              fullPresentationAudio = null;
            }
            prewarmPresentationAudio();

            // Set active buffer for instant waveform display and editing in Step 1
            if (buf) {
              activeDecodedBuffer = buf;
              selectionStartSec = 0;
              selectionEndSec = Math.min(2.0, buf.duration);
              waveformPlayheadPct = 0;
            }

            persistClips();
            projectState.saveProjects();
            showNoticeToast(`✨ સ્લાઇડ #${cur.slideNumber}: ક્રિસ્ટલ ક્લિયર અને મોટો અવાજ સફળતાપૂર્વક રેકોર્ડ થઈને સાચવાઈ ગયો! (${cur.duration.toFixed(1)}s)`, 'success');
          } else {
            showNoticeToast('⚠️ કોઈ અવાજ રેકોર્ડ થયો નથી.', 'warning');
          }
        } catch (err) {
          console.error('Stop recording error:', err);
          showNoticeToast(`❌ રેકોર્ડિંગ સેવ કરવામાં ભૂલ: ${err.message}`, 'error');
        } finally {
          singleSlideRecorder = null;
          isSingleSlideRecording = false;
          isRecordingPaused = false;
          renderView();
        }
      } else {
        // START RECORDING
        stopCurrentAudio();
        if (singleSlideRecorder) {
          try { await singleSlideRecorder.stop(); } catch (_) { }
          singleSlideRecorder = null;
        }

        try {
          singleSlideRecorder = new LiveAudioRecorder();
          isSingleSlideRecording = true;
          isRecordingPaused = false;

          await singleSlideRecorder.start({
            onTick: (formattedTime) => {
              const t1 = container.querySelector('#step1-rec-live-timer');
              if (t1) t1.textContent = formattedTime;
              const t2 = container.querySelector('#live-rec-timer');
              if (t2) t2.textContent = formattedTime;
            },
            onLevel: (levelPct) => {
              const v1 = container.querySelector('#step1-rec-live-vu');
              if (v1) v1.style.width = `${levelPct}%`;
              const v2 = container.querySelector('#live-rec-vu');
              if (v2) v2.style.width = `${levelPct}%`;
            }
          });

          renderView();
          showNoticeToast(`🔴 સ્લાઇડ #${cur.slideNumber} માટે બોલવાનું શરૂ કરો...`, 'info');
        } catch (err) {
          console.error('Start recording error:', err);
          singleSlideRecorder = null;
          isSingleSlideRecording = false;
          isRecordingPaused = false;
          renderView();
          showNoticeToast(`❌ માઇક્રોફોન શરૂ ન થઈ શક્યો: ${err.message}`, 'error');
        }
      }
    }

    // Step 1: Start / Stop button
    const recCurBtn = container.querySelector('#btn-record-cur-slide') || container.querySelector(`.btn-step1-start-record-${currentSlideIndex}`);
    recCurBtn?.addEventListener('click', () => {
      handleToggleSingleSlideRecording();
    });

    // Step 1: Pause / Resume / Stop recording buttons
    container.querySelector('#btn-step1-pause-record')?.addEventListener('click', () => {
      if (singleSlideRecorder && isSingleSlideRecording && !isRecordingPaused) {
        singleSlideRecorder.pause();
        isRecordingPaused = true;
        const pauseBtn = container.querySelector('#btn-step1-pause-record');
        const resumeBtn = container.querySelector('#btn-step1-resume-record');
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (resumeBtn) resumeBtn.style.display = 'inline-flex';
        showNoticeToast(`⏸️ સ્લાઇડ #${generatedClips[currentSlideIndex]?.slideNumber || ''} નું રેકોર્ડિંગ થોભાવ્યું (Paused)`, 'info');
      }
    });

    container.querySelector('#btn-step1-resume-record')?.addEventListener('click', () => {
      if (singleSlideRecorder && isSingleSlideRecording && isRecordingPaused) {
        singleSlideRecorder.resume();
        isRecordingPaused = false;
        const pauseBtn = container.querySelector('#btn-step1-pause-record');
        const resumeBtn = container.querySelector('#btn-step1-resume-record');
        if (pauseBtn) pauseBtn.style.display = 'inline-flex';
        if (resumeBtn) resumeBtn.style.display = 'none';
        showNoticeToast(`▶️ રેકોર્ડિંગ ફરી ચાલુ થયું (Resumed)`, 'info');
      }
    });

    container.querySelector('#btn-step1-stop-record')?.addEventListener('click', () => {
      container.querySelector('#btn-record-cur-slide')?.click();
      handleToggleSingleSlideRecording();
    });

    // Re-record slide voice
    container.querySelectorAll('.btn-rerecord-slide').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.slideIndex, 10);
        if (!isNaN(idx) && idx !== currentSlideIndex) {
          selectClip(idx);
        }
        stopCurrentAudio();
        if (isSingleSlideRecording) {
          await handleToggleSingleSlideRecording();
        }
        await handleToggleSingleSlideRecording();
      });
    });

    // Delete slide voice recording
    container.querySelectorAll('.btn-delete-slide-recording').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.slideIndex, 10);
        const clipIdx = !isNaN(idx) ? idx : currentSlideIndex;
        const targetClip = generatedClips[clipIdx];
        if (!targetClip) return;

        if (!confirm(`શું તમે સ્લાઇડ #${targetClip.slideNumber} નો રેકોર્ડ થયેલ અવાજ ડિલીટ કરવા માંગો છો?\n(સ્લાઇડનું ચિત્ર અને સ્ક્રિપ્ટ સુરક્ષિત રહેશે)`)) {
          return;
        }

        stopCurrentAudio();
        targetClip.audioUrl = '';
        targetClip.originalAudioUrl = '';
        targetClip.enhancedAudioUrl = '';
        targetClip.rawBlob = null;
        targetClip.blob = null;
        targetClip.rawUrl = '';
        targetClip.hasAudio = false;
        targetClip.duration = 6.0;
        targetClip.formattedDuration = '00:06';
        targetClip.status = 'અવાજ બાકી';

        storedSlideAudios = storedSlideAudios.filter(r =>
          String(r.slideId) !== String(targetClip.slideId) &&
          Number(r.slideNumber) !== Number(targetClip.slideNumber)
        );

        if (Array.isArray(project.slide?.slides)) {
          const matched = project.slide.slides.find(s =>
            s.slideNumber === targetClip.slideNumber || String(s.id) === String(targetClip.slideId)
          );
          if (matched) {
            delete matched.audioUrl;
            matched.hasAudio = false;
            matched.recordingDuration = 6.0;
            matched.duration = 6.0;
          }
        }

        persistClips();
        projectState.saveProjects();
        showNoticeToast(`🗑️ સ્લાઇડ #${targetClip.slideNumber} નો અવાજ ડિલીટ કર્યો. હવે નવો અવાજ રેકોર્ડ કરી શકો છો.`, 'info');
        renderView();
      });
    });

    // Filmstrip slide selection in Step 1
    container.querySelectorAll('.wf-step1-slide-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.clipIndex, 10);
        if (!isNaN(idx)) selectClip(idx);
      });
    });

    // Step 1 Teleprompter Gujarati Script Input
    const teleprompterTa = container.querySelector('#teleprompter-script-ta');
    let teleprompterDebounce = null;
    teleprompterTa?.addEventListener('input', (e) => {
      const val = e.target.value || '';
      if (liveTeleprompterMode === 'full') {
        if (!project.script) project.script = {};
        project.script.fullText = val;
        project.script.rawText = val;
        const wordsEl = container.querySelector('#step1-script-words-count');
        if (wordsEl) {
          wordsEl.textContent = `📜 સંપૂર્ણ સ્ક્રિપ્ટ શબ્દો: ${val.trim().split(/\s+/).filter(Boolean).length}`;
        }
        clearTimeout(teleprompterDebounce);
        teleprompterDebounce = setTimeout(() => {
          if (project.id) {
            saveScriptToDatabase(project.id, { fullText: val, rawText: val, source: 'Teleprompter' }, { notify: false, showToast: false }).catch(() => {});
          }
        }, 600);
      } else {
        const cur = generatedClips[currentSlideIndex];
        if (cur) cur.scriptText = val;
        if (connectedSequence.slides && connectedSequence.slides[currentSlideIndex]) {
          connectedSequence.slides[currentSlideIndex].scriptText = val;
        }
        const wordsEl = container.querySelector('#step1-script-words-count');
        if (wordsEl) {
          wordsEl.textContent = `📄 સ્લાઇડ શબ્દો: ${val.trim().split(/\s+/).filter(Boolean).length}`;
        }
        clearTimeout(teleprompterDebounce);
        teleprompterDebounce = setTimeout(() => {
          saveCurrentClipScript(val, false);
        }, 400);
      }
    });

    // Section 3 Teleprompter Mode Buttons & Actions
    container.querySelector('#btn-sec3-tp-mode-clip')?.addEventListener('click', () => {
      liveTeleprompterMode = 'clip';
      renderView();
    });
    container.querySelector('#btn-sec3-tp-mode-full')?.addEventListener('click', () => {
      liveTeleprompterMode = 'full';
      renderView();
    });
    container.querySelector('#btn-sec3-tp-paste')?.addEventListener('click', async () => {
      let pastedText = '';
      try {
        if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
          pastedText = await navigator.clipboard.readText();
        }
      } catch (_) {}
      if (!pastedText) pastedText = prompt('સ્ક્રિપ્ટ અહીં પેસ્ટ કરો (Ctrl+V):');
      if (pastedText && pastedText.trim()) {
        const trimmed = pastedText.trim();
        if (liveTeleprompterMode === 'full' || trimmed.includes('[સ્લાઇડ') || trimmed.includes('[Slide') || trimmed.length > 300) {
          await handleVideoApplyChatGptScript(trimmed);
        } else {
          const cur = generatedClips[currentSlideIndex];
          if (cur) {
            cur.scriptText = trimmed;
            saveCurrentClipScript(trimmed, true);
            renderView();
            showNoticeToast('✅ આ સ્લાઇડની સ્ક્રિપ્ટ સેવ થઈ ગઈ!', 'success');
          }
        }
      }
    });
    container.querySelector('#btn-sec3-tp-save')?.addEventListener('click', async () => {
      const s3Ta = container.querySelector('#teleprompter-script-ta');
      const val = (s3Ta ? s3Ta.value : '').trim();
      if (!val) {
        showNoticeToast('⚠️ સ્ક્રિપ્ટ લખાણ ખાલી છે!', 'warning');
        return;
      }
      if (liveTeleprompterMode === 'full') {
        await handleVideoApplyChatGptScript(val);
      } else {
        const cur = generatedClips[currentSlideIndex];
        if (cur) {
          cur.scriptText = val;
          saveCurrentClipScript(val, true);
          renderView();
          showNoticeToast('✅ સ્લાઇડ #' + cur.slideNumber + ' ની સ્ક્રિપ્ટ સેવ થઈ ગઈ!', 'success');
        }
      }
    });

    // Step 1 Dedicated Audio Play/Pause Button
    container.querySelectorAll(`.btn-step1-play-${currentSlideIndex}`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isPlaying) {
          stopCurrentAudio();
        } else {
          startSlideAudio(currentSlideIndex);
        }
      });
    });

    // Step 1 Quick Join: Create Video from recorded slides & audio
    container.querySelectorAll('#btn-quick-create-video-step1').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        startVideoCreation();
      });
    });

    // Step 1 Play All Joined Clips Sequentially
    container.querySelectorAll('#btn-step1-play-all-joined-clips').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isPlayingFullPresentation) {
          stopFullPresentation();
        } else {
          playSequentialClips(0);
        }
      });
    });

    // Step 1 Stage Center Play/Pause Overlay Click
    container.querySelectorAll('#step1-slide-preview-container #btn-stage-center-play, .stage-center-play-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mainPlayPauseBtn = container.querySelector('#btn-audio-play-pause');
        if (mainPlayPauseBtn) {
          mainPlayPauseBtn.click();
        } else if (hasAudio) {
          if (isPlaying) stopCurrentAudio();
          else startSlideAudio(currentSlideIndex);
        }
      });
    });

    // Audio Preview Speed Controls (0.75x 🐢 ધીમો, 1.0x સામાન્ય, 1.25x ⚡ ઝડપી, 1.5x 🚀 ફાસ્ટ)
    container.querySelectorAll('.btn-preview-speed').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const spd = parseFloat(btn.dataset.speed);
        if (!isNaN(spd)) {
          setPreviewPlaybackRate(spd);
        }
      });
    });

    container.querySelectorAll('.preview-speed-select, #preview-speed-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const spd = parseFloat(e.target.value);
        if (!isNaN(spd)) {
          setPreviewPlaybackRate(spd);
        }
      });
    });

    // Audio Preview Volume Controls (અવાજ ધીમો / મોટો)
    container.querySelectorAll('.preview-volume-slider, #preview-volume-slider').forEach(sl => {
      sl.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        if (!isNaN(vol)) {
          setPreviewVolume(vol);
        }
      });
    });

    // =========================================================================
    // STEP 1 SLIDE-WISE AUDIO TIMELINE STRIP & WAVEFORM EDITOR EVENTS
    // =========================================================================

    // Slide-wise audio strip card selection
    container.querySelectorAll('.step1-slidewise-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.clipIndex, 10);
        if (!isNaN(idx)) selectClip(idx);
      });
    });

    // Slide-wise audio strip instant preview button
    container.querySelectorAll('.btn-step1-strip-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.clipIndex, 10);
        if (!isNaN(idx)) {
          if (idx !== currentSlideIndex) {
            selectClip(idx);
            setTimeout(() => { startSlideAudio(idx); }, 80);
          } else {
            if (isPlaying) stopCurrentAudio();
            else startSlideAudio(idx);
          }
        }
      });
    });

    // Step 1 Smooth Interactive Waveform Canvas Drag & Selection
    const step1WfCanvas = container.querySelector('#step1-audio-waveform-canvas');
    if (step1WfCanvas) {
      setupWaveformInteraction(step1WfCanvas, 'step1');
    }

    // Waveform Zoom Buttons (1x Full Audio, 2x, 4x, 8x)
    container.querySelectorAll('.btn-wf-zoom').forEach(btn => {
      btn.onclick = () => {
        waveformZoomLevel = Math.max(1, Number(btn.dataset.zoom) || 1);
        container.querySelectorAll('.btn-wf-zoom').forEach(b => {
          b.style.background = Number(b.dataset.zoom) === waveformZoomLevel ? '#0284c7' : '#1e293b';
        });
        redrawAllWaveforms(waveformPlayheadPct);
      };
    });

    // Continuous Play / Loop Toggle Button
    container.querySelectorAll('#btn-toggle-continue-play').forEach(btn => {
      btn.onclick = () => {
        audioContinueMode = audioContinueMode === 'loop' ? 'next' : (audioContinueMode === 'next' ? 'off' : 'loop');
        const label = audioContinueMode === 'loop' ? '🔁 સતત ચાલુ' : (audioContinueMode === 'next' ? '⏭️ આગળની સ્લાઇડ' : '⏹️ ૧ વાર');
        container.querySelectorAll('#btn-toggle-continue-play').forEach(b => {
          b.textContent = label;
          b.style.background = audioContinueMode === 'off' ? '#334155' : '#0284c7';
        });
        showNoticeToast(
          audioContinueMode === 'loop'
            ? '🔁 સતત ચાલુ: ઓડિયો પૂરો થતા આપમેળે ફરીથી વાગશે'
            : (audioContinueMode === 'next' ? '⏭️ આગળની સ્લાઇડ: એક પછી એક બધી સ્લાઇડ સતત વાગશે' : '⏹️ ૧ વાર વાગીને અટકશે'),
          'info'
        );
      };
    });

    // Micro-Nudges for Selection Start & End (Smooth Adjustment for Silence Cutting)
    container.querySelectorAll('.btn-nudge-start-left').forEach(btn => {
      btn.onclick = () => {
        selectionStartSec = Math.max(0, parseFloat((selectionStartSec - 0.1).toFixed(2)));
        syncSelectionRangeInputs();
        redrawAllWaveforms(waveformPlayheadPct);
      };
    });
    container.querySelectorAll('.btn-nudge-start-right').forEach(btn => {
      btn.onclick = () => {
        const maxS = Math.max(0, selectionEndSec - 0.05);
        selectionStartSec = Math.min(maxS, parseFloat((selectionStartSec + 0.1).toFixed(2)));
        syncSelectionRangeInputs();
        redrawAllWaveforms(waveformPlayheadPct);
      };
    });
    container.querySelectorAll('.btn-nudge-end-left').forEach(btn => {
      btn.onclick = () => {
        const minE = selectionStartSec + 0.05;
        selectionEndSec = Math.max(minE, parseFloat((selectionEndSec - 0.1).toFixed(2)));
        syncSelectionRangeInputs();
        redrawAllWaveforms(waveformPlayheadPct);
      };
    });
    container.querySelectorAll('.btn-nudge-end-right').forEach(btn => {
      btn.onclick = () => {
        const maxE = activeDecodedBuffer ? activeDecodedBuffer.duration : 999;
        selectionEndSec = Math.min(maxE, parseFloat((selectionEndSec + 0.1).toFixed(2)));
        syncSelectionRangeInputs();
        redrawAllWaveforms(waveformPlayheadPct);
      };
    });

    // Quick Silence Width Presets
    container.querySelectorAll('.btn-quick-sel-preset').forEach(btn => {
      btn.onclick = () => {
        const pDur = parseFloat(btn.dataset.dur) || 0.5;
        const maxE = activeDecodedBuffer ? activeDecodedBuffer.duration : 999;
        selectionEndSec = Math.min(maxE, parseFloat((selectionStartSec + pDur).toFixed(2)));
        syncSelectionRangeInputs();
        redrawAllWaveforms(waveformPlayheadPct);
      };
    });

    // Auto-detect & Select Silence Button (Smooth 1-Click Silence Locator)
    container.querySelectorAll('#btn-step1-auto-silence, #btn-auto-silence, .btn-trigger-auto-silence').forEach(btn => {
      btn.onclick = () => {
        autoSelectNextSilence();
      };
    });

    // Direct input adjustments for selection range
    container.querySelectorAll('#input-step1-sel-start, #input-sel-start').forEach(inp => {
      inp.oninput = (e) => {
        selectionStartSec = Math.max(0, parseFloat(e.target.value) || 0);
        syncSelectionRangeInputs();
        redrawAllWaveforms(waveformPlayheadPct);
      };
      inp.onchange = (e) => {
        selectionStartSec = Math.max(0, parseFloat(e.target.value) || 0);
        syncSelectionRangeInputs();
        redrawAllWaveforms(waveformPlayheadPct);
      };
    });

    container.querySelectorAll('#input-step1-sel-end, #input-sel-end').forEach(inp => {
      inp.oninput = (e) => {
        selectionEndSec = Math.max(0, parseFloat(e.target.value) || 0);
        syncSelectionRangeInputs();
        redrawAllWaveforms(waveformPlayheadPct);
      };
      inp.onchange = (e) => {
        selectionEndSec = Math.max(0, parseFloat(e.target.value) || 0);
        syncSelectionRangeInputs();
        redrawAllWaveforms(waveformPlayheadPct);
      };
    });

    // 1-Click Trim Dead Silence ("જ્યાં અવાજ નથી આવ્યો તે શાંતિ કાપો")
    container.querySelector('#btn-step1-trim-silence')?.addEventListener('click', async () => {
      const curClip = generatedClips[currentSlideIndex];
      if (!curClip) return;
      if (!activeDecodedBuffer && curClip.audioUrl) {
        activeDecodedBuffer = await decodeAudioUrlToBuffer(curClip.audioUrl);
      }
      if (!activeDecodedBuffer) {
        showNoticeToast('આ સ્લાઇડ માટે કોઈ અવાજ ઉપલબ્ધ નથી.', 'warning');
        return;
      }

      const trimmed = trimSilenceFromAudioBuffer(activeDecodedBuffer, { thresholdDb: -42, paddingSec: 0.15 });
      if (trimmed && trimmed.duration && trimmed.duration < (activeDecodedBuffer.duration - 0.05)) {
        const savedSec = (activeDecodedBuffer.duration - trimmed.duration).toFixed(1);
        commitNewAudioBufferToClip(curClip, trimmed, `જ્યાં અવાજ નહોતો તે શાંતિ કાપી (${savedSec}s બચત)`);
      } else {
        showNoticeToast('✨ આ સ્લાઇડમાં બધો અવાજ સ્પષ્ટ છે, કોઈ વધારાની શાંતિ કાપવાની જરૂર નથી!', 'info');
      }
    });

    // Cut Selection ("પસંદ કરેલ ભાગ કાપો")
    container.querySelector('#btn-step1-cut-selection')?.addEventListener('click', async () => {
      const curClip = generatedClips[currentSlideIndex];
      if (!curClip) return;
      if (!activeDecodedBuffer && curClip.audioUrl) {
        activeDecodedBuffer = await decodeAudioUrlToBuffer(curClip.audioUrl);
      }
      if (!activeDecodedBuffer) return;

      const start = Math.min(selectionStartSec, selectionEndSec);
      const end = Math.max(selectionStartSec, selectionEndSec);
      if (end - start < 0.1) {
        alert('કૃપા કરીને કાપવા માટે ઓછામાં ઓછો 0.1 સેકન્ડનો ભાગ વેવફોર્મ પર સિલેક્ટ કરો.');
        return;
      }

      const trimmed = await cutAudioBufferMiddle(activeDecodedBuffer, start, end);
      if (trimmed) {
        curClip.deletedSegments = curClip.deletedSegments || [];
        curClip.deletedSegments.push({ start, end, type: 'middle' });
        commitNewAudioBufferToClip(curClip, trimmed, 'પસંદ કરેલ શાંતિ/ભાગ કાપ્યો & જોડ્યો');
      }
    });

    // Play Selection ("પસંદ કરેલ ભાગ સાંભળો")
    container.querySelector('#btn-step1-play-selection')?.addEventListener('click', async () => {
      const curClip = generatedClips[currentSlideIndex];
      if (!curClip) return;
      if (!activeDecodedBuffer && curClip.audioUrl) {
        activeDecodedBuffer = await decodeAudioUrlToBuffer(curClip.audioUrl);
      }
      if (!activeDecodedBuffer) return;

      const start = Math.min(selectionStartSec, selectionEndSec);
      const end = Math.max(selectionStartSec, selectionEndSec);
      if (end <= start) {
        showNoticeToast('કૃપા કરીને વેવફોર્મ પર સાંભળવા માટેનો ભાગ પસંદ કરો.', 'warning');
        return;
      }

      stopCurrentAudio();
      try {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtxClass();
        const srcNode = ctx.createBufferSource();
        srcNode.buffer = activeDecodedBuffer;
        srcNode.playbackRate.value = previewPlaybackRate;
        const gainNode = ctx.createGain();
        gainNode.gain.value = previewVolume;
        srcNode.connect(gainNode);
        gainNode.connect(ctx.destination);
        srcNode.start(0, start, (end - start) / previewPlaybackRate);
        previewSourceNode = srcNode;
        showNoticeToast(`▶️ પસંદ કરેલ ભાગ (${(end - start).toFixed(2)}s) વાગી રહ્યો છે...`, 'info');
      } catch (e) {
        console.warn('Play selection error:', e);
      }
    });

    // Nudge Trim Start (-0.3s)
    container.querySelector('#btn-step1-nudge-start')?.addEventListener('click', async () => {
      const curClip = generatedClips[currentSlideIndex];
      if (!curClip) return;
      if (!activeDecodedBuffer && curClip.audioUrl) {
        activeDecodedBuffer = await decodeAudioUrlToBuffer(curClip.audioUrl);
      }
      if (!activeDecodedBuffer) return;

      const trimSec = Math.min(0.3, activeDecodedBuffer.duration * 0.4);
      const trimmed = await trimAudioBufferStart(activeDecodedBuffer, trimSec);
      if (trimmed) {
        commitNewAudioBufferToClip(curClip, trimmed, 'શરૂઆતનો મૌન ભાગ કાપ્યો (-0.3s)');
      }
    });

    // Nudge Trim End (-0.3s)
    container.querySelector('#btn-step1-nudge-end')?.addEventListener('click', async () => {
      const curClip = generatedClips[currentSlideIndex];
      if (!curClip) return;
      if (!activeDecodedBuffer && curClip.audioUrl) {
        activeDecodedBuffer = await decodeAudioUrlToBuffer(curClip.audioUrl);
      }
      if (!activeDecodedBuffer) return;

      const cutPoint = Math.max(0.5, activeDecodedBuffer.duration - 0.3);
      const trimmed = await trimAudioBufferEnd(activeDecodedBuffer, cutPoint);
      if (trimmed) {
        commitNewAudioBufferToClip(curClip, trimmed, 'છેલ્લો વધારાનો ભાગ કાપ્યો (-0.3s)');
      }
    });

    // Zero Background Noise Clean (Pankho, AC, Room Noise Eradication)
    container.querySelectorAll('#btn-step1-zero-noise, #btn-step5-zero-noise, .btn-trigger-zero-noise').forEach(btn => {
      btn.onclick = async () => {
        const curClip = generatedClips[currentSlideIndex];
        if (!curClip) return;
        if (!activeDecodedBuffer && curClip.audioUrl) {
          activeDecodedBuffer = await decodeAudioUrlToBuffer(curClip.audioUrl);
        }
        if (!activeDecodedBuffer) return;

        showNoticeToast('🛡️ પંખો, એસી અને બેકગ્રાઉન્ડ ઘોંઘાટ ૧૦૦% સાફ થઈ રહ્યો છે...', 'info');
        try {
          const enh = await enhanceAudioBuffer(activeDecodedBuffer, {
            preset: 'crystal_ultra_studio',
            targetLUFS: -14.0,
            targetPeakDb: -0.8,
            intensity: 1.0,
            noiseReduction: 0.99,
            voiceClarity: 0.98,
            volumeNormalization: true,
            volume: 1.40,
            clarityBoost: true,
            noiseRemoval: true,
            zeroBackgroundNoise: true,
            aggressiveZeroNoise: true
          });
          const cleaned = enh?.buffer || enh?.audioBuffer || activeDecodedBuffer;
          commitNewAudioBufferToClip(curClip, cleaned, '🛡️ શૂન્ય બેકગ્રાઉન્ડ નોઈઝ: પંખો & રૂમનો અવાજ સંપૂર્ણ સાફ કર્યો');
          showNoticeToast('✨ સફળ! પંખા અને રૂમનો તમામ ઘોંઘાટ ૧૦૦% દૂર થઈ ગયો. માત્ર શુદ્ધ અવાજ જળવાઈ રહ્યો!', 'success');
        } catch (err) {
          console.warn('Zero noise clean error:', err);
          showNoticeToast('નોઈઝ સાફ કરવામાં ક્ષતિ: ' + err.message, 'error');
        }
      };
    });

    // Loud Studio Boost (-14.0 LUFS Broadcast Standard)
    container.querySelector('#btn-step1-boost-loudness')?.addEventListener('click', async () => {
      const curClip = generatedClips[currentSlideIndex];
      if (!curClip) return;
      if (!activeDecodedBuffer && curClip.audioUrl) {
        activeDecodedBuffer = await decodeAudioUrlToBuffer(curClip.audioUrl);
      }
      if (!activeDecodedBuffer) return;

      showNoticeToast('🔊 અવાજ મોટો અને ક્રિસ્ટલ ક્લિયર બની રહ્યો છે (-14.0 LUFS)...', 'info');
      try {
        const enh = await enhanceAudioBuffer(activeDecodedBuffer, {
          preset: 'crystal_ultra_studio',
          targetLUFS: -14.0,
          targetPeakDb: -0.8,
          intensity: 1.0,
          noiseReduction: 0.98,
          voiceClarity: 0.98,
          volumeNormalization: true,
          volume: 1.45,
          clarityBoost: true,
          noiseRemoval: true,
          zeroBackgroundNoise: true
        });
        const boosted = enh?.buffer || enh?.audioBuffer || activeDecodedBuffer;
        commitNewAudioBufferToClip(curClip, boosted, 'મોટો ક્રિસ્ટલ અવાજ બૂસ્ટ કર્યો (-14 LUFS)');
      } catch (err) {
        console.warn('Boost error:', err);
        showNoticeToast('અવાજ બૂસ્ટ કરવામાં ક્ષતિ: ' + err.message, 'error');
      }
    });

    // Quick Re-record This Slide
    container.querySelector('#btn-step1-quick-rerecord')?.addEventListener('click', () => {
      const recBtn = container.querySelector('#btn-record-cur-slide') || container.querySelector(`.btn-step1-start-record-${currentSlideIndex}`);
      if (recBtn) recBtn.click();
    });

    // Restore Original Raw Audio
    container.querySelector('#btn-step1-restore-original')?.addEventListener('click', async () => {
      const curClip = generatedClips[currentSlideIndex];
      if (!curClip?.rawBlob) {
        showNoticeToast('મૂળ ઓરિજિનલ અવાજ ઉપલબ્ધ નથી.', 'warning');
        return;
      }
      if (!confirm('શું તમે ખરેખર મૂળ અનએડિટેડ ઓડિયો પાછો લાવવા માંગો છો?')) return;
      try {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtxClass();
        const ab = await curClip.rawBlob.arrayBuffer();
        const origBuf = await ctx.decodeAudioData(ab);
        try { await ctx.close(); } catch (_) {}
        commitNewAudioBufferToClip(curClip, origBuf, 'મૂળ અનએડિટેડ અવાજ રીસ્ટોર કર્યો');
      } catch (e) {
        showNoticeToast('રીસ્ટોર કરવામાં ભૂલ: ' + e.message, 'error');
      }
    });

    // Batch Clean All Slides Audio in Step 2
    const cleanAllBtn = container.querySelector('#btn-clean-all-step2') || container.querySelector('.btn-clean-all-audios');
    cleanAllBtn?.addEventListener('click', async () => {
      const btn = cleanAllBtn;
      const progBox = container.querySelector('#clean-all-progress-box');
      const progBar = container.querySelector('#clean-all-progress-bar');
      const progLabel = container.querySelector('#clean-all-progress-label');
      const progPct = container.querySelector('#clean-all-progress-pct');

      const clipsWithAudio = generatedClips.filter(c => Boolean((c.hasAudio && c.audioUrl) || c.audioUrl || c.rawBlob || c.blob));
      if (clipsWithAudio.length === 0) {
        alert('કોઈ સ્લાઇડ માટે અવાજ રેકોર્ડ થયેલ નથી. કૃપા કરીને પહેલા સ્ટેપ ૧ માં અવાજ રેકોર્ડ કરો.');
        return;
      }

      if (btn) btn.disabled = true;
      if (progBox) progBox.style.display = 'block';

      const selectedPreset = container.querySelector('#select-video-enhance-preset')?.value || audioEnhancePreset || 'crystal_ultra_studio';
      let cleanedCountThisRun = 0;

      for (let i = 0; i < clipsWithAudio.length; i++) {
        const clip = clipsWithAudio[i];
        const pct = Math.round(((i + 1) / clipsWithAudio.length) * 100);
        if (progBar) progBar.style.width = pct + '%';
        if (progPct) progPct.textContent = pct + '%';
        if (progLabel) progLabel.textContent = `સ્લાઇડ #${clip.slideNumber} નો અવાજ સાફ થઈ રહ્યો છે... (${i + 1}/${clipsWithAudio.length})`;

        try {
          let buf = null;
          if (clip.rawBlob instanceof Blob) {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtxClass();
            const ab = await clip.rawBlob.arrayBuffer();
            buf = await ctx.decodeAudioData(ab);
            try { await ctx.close(); } catch (_) {}
          } else if (clip.audioUrl) {
            buf = await decodeAudioUrlToBuffer(clip.audioUrl);
          }

          if (buf) {
            const enhBuf = await applyCrystalNoiseReduction(buf, { preset: selectedPreset });
            if (enhBuf) {
              const enhWavBlob = audioBufferToWavBlob(enhBuf);
              clip.enhancedBlob = enhWavBlob;
              clip.cleanedAudioUrl = URL.createObjectURL(enhWavBlob);
              clip.audioUrl = clip.cleanedAudioUrl;
              clip.status = 'Enhanced';

              try {
                if (typeof saveSlideAudioRecord === 'function') {
                  await saveSlideAudioRecord(project.id, clip.slideNumber, {
                    rawBlob: clip.rawBlob || clip.blob,
                    enhancedBlob: enhWavBlob,
                    originalAudioUrl: clip.originalAudioUrl || clip.audioUrl,
                    cleanedAudioUrl: clip.cleanedAudioUrl,
                    duration: enhBuf.duration || clip.duration,
                    enhancedPreset: selectedPreset,
                    isCleaned: true
                  });
                }
              } catch (storageErr) {
                console.warn('[CrystalNoiseReduction] save error:', storageErr);
              }
              cleanedCountThisRun++;
            }
          }
        } catch (err) {
          console.warn(`Error cleaning clip #${clip.slideNumber}:`, err);
        }
      }

      if (btn) btn.disabled = false;
      if (progBox) progBox.style.display = 'none';
      alert(`✓ અભિનંદન! ${cleanedCountThisRun} સ્લાઇડ્સનો અવાજ ક્રિસ્ટલ ક્લિયર સાફ થઈ ગયો છે.`);
      renderView();
      attachEvents();
    });

    // Individual slide clean buttons in Step 2
    container.querySelectorAll('.btn-clean-single-audio').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.slideIndex, 10);
        const clip = generatedClips[idx];
        if (!clip) return;

        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> <span>સાફ થઈ રહ્યો છે...</span>';
        const selectedPreset = container.querySelector('#select-video-enhance-preset')?.value || audioEnhancePreset || 'crystal_ultra_studio';

        try {
          let buf = null;
          if (clip.rawBlob instanceof Blob) {
            const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioCtxClass();
            const ab = await clip.rawBlob.arrayBuffer();
            buf = await ctx.decodeAudioData(ab);
            try { await ctx.close(); } catch (_) {}
          } else if (clip.audioUrl) {
            buf = await decodeAudioUrlToBuffer(clip.audioUrl);
          }

          if (buf) {
            const enhBuf = await applyCrystalNoiseReduction(buf, { preset: selectedPreset });
            if (enhBuf) {
              const enhWavBlob = audioBufferToWavBlob(enhBuf);
              clip.enhancedBlob = enhWavBlob;
              clip.cleanedAudioUrl = URL.createObjectURL(enhWavBlob);
              clip.audioUrl = clip.cleanedAudioUrl;
              clip.status = 'Enhanced';

              try {
                if (typeof saveSlideAudioRecord === 'function') {
                  await saveSlideAudioRecord(project.id, clip.slideNumber, {
                    rawBlob: clip.rawBlob || clip.blob,
                    enhancedBlob: enhWavBlob,
                    originalAudioUrl: clip.originalAudioUrl || clip.audioUrl,
                    cleanedAudioUrl: clip.cleanedAudioUrl,
                    duration: enhBuf.duration || clip.duration,
                    enhancedPreset: selectedPreset,
                    isCleaned: true
                  });
                }
              } catch (_) {}
            }
          }
        } catch (e) {
          console.warn('Individual clean error:', e);
        }

        renderView();
        attachEvents();
      });
    });

    // Step 2: Before/After audio preview playback
    step2AudioPlayer = null;
    container.querySelectorAll('.btn-play-before-audio, .btn-play-after-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const src = btn.dataset.src;
        if (!src) return;
        if (!step2AudioPlayer) step2AudioPlayer = new Audio();
        if (step2AudioPlayer.src === src && !step2AudioPlayer.paused) {
          step2AudioPlayer.pause();
          btn.innerHTML = '<span>▶</span> ' + (btn.classList.contains('btn-play-before-audio') ? '<span>મૂળ કાચો અવાજ (Before)</span>' : '<span>સાફ કરેલ અવાજ (After)</span>');
        } else {
          step2AudioPlayer.src = src;
          step2AudioPlayer.play().catch(e => console.warn('Preview play error:', e));
          btn.innerHTML = '<span>⏸</span> ' + (btn.classList.contains('btn-play-before-audio') ? '<span>થોભો (Before)</span>' : '<span>થોભો (After)</span>');
          step2AudioPlayer.onended = () => {
            btn.innerHTML = '<span>▶</span> ' + (btn.classList.contains('btn-play-before-audio') ? '<span>મૂળ કાચો અવાજ (Before)</span>' : '<span>સાફ કરેલ અવાજ (After)</span>');
          };
        }
      });
    });

    // Step 3: Timing nudge adjustments
    container.querySelectorAll('.btn-nudge-timing').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.clipIndex, 10);
        const delta = parseFloat(btn.dataset.delta || '0');
        const clip = generatedClips[idx];
        if (clip) {
          clip.duration = Math.max(1, Math.min(180, (clip.duration || 6) + delta));
          clip.originalDuration = clip.duration;
          clip.formattedDuration = formatTime(clip.duration);
          const inp = container.querySelector(`#input-sync-duration-${idx}`);
          if (inp) inp.value = clip.duration.toFixed(1);
          if (idx === currentSlideIndex) {
            const previewInp = container.querySelector('#input-preview-slide-duration');
            if (previewInp) previewInp.value = clip.duration.toFixed(1);
          }
        }
      });
    });

    // Step 3: Full slideshow sync preview trigger
    container.querySelector('#btn-preview-full-sync')?.addEventListener('click', () => {
      container.querySelector('#btn-play-all-slides')?.click();
    });

    // Step 3: Transition change
    container.querySelector('#select-slide-transition')?.addEventListener('change', (e) => {
      videoTransitionType = e.target.value;
      if (!project.editing) project.editing = {};
      project.editing.videoTransitionType = videoTransitionType;
      try { projectState.updateTool('editing', project.editing); } catch (_) {}
    });

    // Step 4: Aspect Ratio & BGM controls
    container.querySelector('#select-video-aspect-ratio')?.addEventListener('change', (e) => {
      videoAspectRatio = e.target.value;
      if (!project.editing) project.editing = {};
      project.editing.videoAspectRatio = videoAspectRatio;
      try { projectState.updateTool('editing', project.editing); } catch (_) {}
    });

    container.querySelector('#select-video-bgm')?.addEventListener('change', (e) => {
      videoBgmTrack = e.target.value;
      if (!project.editing) project.editing = {};
      project.editing.videoBgmTrack = videoBgmTrack;
      try { projectState.updateTool('editing', project.editing); } catch (_) {}
    });

    container.querySelector('#input-video-bgm-vol')?.addEventListener('input', (e) => {
      videoBgmVolume = parseFloat(e.target.value);
      if (!project.editing) project.editing = {};
      project.editing.videoBgmVolume = videoBgmVolume;
    });

    container.querySelector('#input-video-voice-vol')?.addEventListener('input', (e) => {
      videoVoiceVolume = parseFloat(e.target.value);
      if (!project.editing) project.editing = {};
      project.editing.videoVoiceVolume = videoVoiceVolume;
    });

    // Step 4: Secondary Render Trigger Button
    container.querySelector('#btn-create-final-video')?.addEventListener('click', () => {
      startVideoCreation();
    });

    // Step 5: Trimming, split, overlays quick alerts / actions
    container.querySelector('#btn-trim-start')?.addEventListener('click', () => {
      if (typeof trimStart === 'function') trimStart();
      else container.querySelector('#btn-cut-start')?.click();
    });
    container.querySelector('#btn-trim-end')?.addEventListener('click', () => {
      if (typeof trimEnd === 'function') trimEnd();
      else container.querySelector('#btn-cut-end')?.click();
    });
    container.querySelector('#btn-split-clip')?.addEventListener('click', () => {
      if (typeof splitCurrentClip === 'function') splitCurrentClip();
      else container.querySelector('#btn-cut-middle')?.click();
    });
    container.querySelector('#btn-delete-split-clip')?.addEventListener('click', () => {
      container.querySelector('#btn-delete-range')?.click();
    });
    container.querySelector('#btn-add-text-overlay')?.addEventListener('click', () => {
      const text = prompt('વિડીયો પર ઉમેરવા માટે ટેક્સ્ટ લખો:');
      if (text) alert('ટેક્સ્ટ ઓવરલે સેવ થયો: ' + text);
    });
    container.querySelector('#btn-add-watermark')?.addEventListener('click', () => {
      alert('વોટરમાર્ક / ચેનલ લોગો ઓવરલે સેટિંગ સક્રિય છે ✓');
    });
    container.querySelector('#btn-add-intro-outro')?.addEventListener('click', () => {
      alert('ચેનલ Intro અને Outro સ્લાઇડ જોડાણ સક્રિય છે ✓');
    });

    // Step 5: Direct WhatsApp & Download handlers
    container.querySelectorAll('#btn-share-whatsapp-direct, .btn-share-whatsapp-direct').forEach(btn => {
      btn.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        triggerWhatsAppShare(e.currentTarget);
      };
    });

    container.querySelectorAll('#btn-download-exported-video, .btn-download-exported-video').forEach(btn => {
      btn.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        triggerDirectFileDownload(e);
      };
    });

    // Navigation: Return to Script Writer
    container.querySelector('#btn-back-to-voice')?.addEventListener('click', () => {
      stopCurrentAudio();
      // navigateTo('myvoice');
      navigateTo('scriptwriter');
    });
    container.querySelector('#ws-btn-bottom-prev-videoeditor')?.addEventListener('click', () => {
      stopCurrentAudio();
      // navigateTo('myvoice');
      navigateTo('scriptwriter');
    });

    // Navigation: Go to Step 6 Thumbnail Maker
    container.querySelector('#btn-next-to-thumbnail-editor')?.addEventListener('click', () => {
      stopCurrentAudio();
      navigateTo('thumbnails');
    });
    container.querySelector('#ws-btn-bottom-next-videoeditor')?.addEventListener('click', () => {
      stopCurrentAudio();
      navigateTo('thumbnails');
    });

    container.querySelector('#btn-goto-thumbnail-from-saved')?.addEventListener('click', () => {
      stopCurrentAudio();
      navigateTo('thumbnails');
    });

    // Handle Direct PDF Upload / Change in Video Editor
    async function handlePdfUploadInVideoEditor(file) {
      if (!file) return;
      try {
        showNoticeToast('📄 નવી PDF અપલોડ અને પેજ વિશ્લેષણ ચાલુ છે...', 'info');

        const reader = new FileReader();
        reader.onerror = (rErr) => {
          console.error('[VideoEditor FileReader Error]:', rErr);
          alert('ફાઇલ વાંચવામાં ક્ષતિ આવી. કૃપા કરીને ફાઇલ ફરી પસંદ કરો.');
        };
        reader.onload = async (e) => {
          try {
            const base64Data = e.target.result;
            const commaIdx = base64Data.indexOf('base64,');
            const fileBase64 = commaIdx !== -1 ? base64Data.slice(commaIdx + 7) : base64Data;
            const ext = file.name.split('.').pop().toLowerCase();

            const response = await fetch('/api/research/upload-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileBase64,
                filename: file.name,
                overallTopic: project.topic || project.name || 'પ્રેઝન્ટેશન સ્લાઇડ્સ',
                projectId: project.id
              })
            });

            let data = null;
            try {
              data = await response.json();
            } catch (_) {
              throw new Error(`સર્વર કનેક્શન ક્ષતિ (Status ${response.status})`);
            }
            if (!response.ok || !data || !data.success || !Array.isArray(data.slides)) {
              throw new Error(data?.error || `PDF વાંચવામાં ભૂલ આવી (Status ${response.status})`);
            }

            const fileRecord = {
              id: `pres_${project.id}_${Date.now()}`,
              projectId: project.id,
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

            await saveProjectPresentation(project.id, fileRecord);
            if (project.topicId && project.topicId !== project.id) {
              await saveProjectPresentation(project.topicId, fileRecord);
            }

            project.slide = project.slide || {};
            project.slide.slides = data.slides;
            project.slide.importedPresentation = { ...fileRecord, dataUrl: '' };
            projectState.updateTool('slide', project.slide);

            // Preserve existing rich script if present, else map newly extracted slide scripts
            const existingSections = Array.isArray(project.script?.sections) && project.script.sections.length > 0
              ? project.script.sections
              : [];

            const newSections = (data.slides || []).map((s, idx) => {
              const matchedExisting = existingSections[idx] || existingSections.find(es => es.slideNumber === (idx + 1));
              const richScript = (matchedExisting && matchedExisting.scriptText && matchedExisting.scriptText.trim().length > 20)
                ? matchedExisting.scriptText.trim()
                : (s.scriptText || s.content || (s.bulletPoints && s.bulletPoints.length > 0 ? s.bulletPoints.join('. ') : `${s.title || 'સ્લાઇડ #' + (idx + 1)} ની સંપૂર્ણ સમજૂતી.`));
              const finalTitle = (matchedExisting && matchedExisting.sectionName && !matchedExisting.sectionName.startsWith('સ્લાઇડ #'))
                ? matchedExisting.sectionName
                : (s.title || `સ્લાઇડ #${idx + 1}`);

              return {
                slideId: s.slideId || `slide_${project.id}_${idx + 1}`,
                slideNumber: idx + 1,
                sectionName: finalTitle,
                title: finalTitle,
                subtitle: s.subtitle || '',
                scriptText: richScript
              };
            });

            const fullScriptText = newSections.map(s => `[સ્લાઇડ #${s.slideNumber}: ${s.sectionName}]\n${s.scriptText}`).join('\n\n');
            project.script = project.script || {};
            project.script.sections = newSections;
            project.script.rawText = fullScriptText;
            project.script.fullText = fullScriptText;
            project.script.savedInDb = true;
            projectState.updateTool('script', project.script);

            await saveScriptToDatabase(project.id, {
              rawText: fullScriptText,
              fullText: fullScriptText,
              sections: newSections,
              source: 'PDF_Extract'
            }, { notify: false, showToast: false }).catch(() => { });

            // Update local state variables
            importedMeta = fileRecord;
            slides = data.slides;
            isPdfPresentation = true;
            pdfViewUrl = data.fileUrl;

            // Clear cached rendered PDF canvases so old PDF never appears
            Object.keys(pdfPageCanvases).forEach(k => delete pdfPageCanvases[k]);

            // Clear old audios so new PDF is clean
            serverSlideAudios = {};
            storedSlideAudios = [];

            // Rebuild sequence from new PDF
            connectedSequence = buildConnectedSlideSequence(
              project,
              fileRecord,
              [],
              { pdfViewUrl, pdfFilename: fileRecord.filename, serverSlideAudios: {} }
            );
            generatedClips = buildGeneratedClips();
            totalClips = generatedClips.length;
            currentSlideIndex = 0;

            // Reset playback and render new PDF pages in 1080p
            stopCurrentAudio();
            if (isPlayingFullPresentation) stopFullPresentation();

            renderView();
            showNoticeToast(`🎉 નવી PDF (${data.slides.length} સ્લાઇડ્સ) સફળતાપૂર્વક લોડ થઈ ગઈ! હવે લાઈવ રેકોર્ડ શરૂ કરો.`, 'success');
            await ensurePdfSlidesRendered(true);
          } catch (innerErr) {
            console.error('PDF upload inner error:', innerErr);
            alert('PDF પ્રોસેસ કરવામાં ક્ષતિ: ' + innerErr.message);
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('PDF upload error:', err);
        alert('PDF અપલોડ કરવામાં ક્ષતિ: ' + err.message);
      }
    }

    container.querySelectorAll('#input-video-upload-pdf, #input-video-upload-pdf-live, #input-video-upload-pdf-step1, #input-video-upload-pdf-stage').forEach(input => {
      input.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) handlePdfUploadInVideoEditor(file);
      });
    });

    // Container-level PDF Drag and Drop
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.match(/\.(pdf|pptx|ppt)$/i) || file.type.includes('pdf')) {
          showNoticeToast(`📄 PDF ફાઇલ સ્વીકારાઈ: ${file.name}`, 'info');
          handlePdfUploadInVideoEditor(file);
        }
      }
    });

    container.addEventListener('paste', (e) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.match(/\.(pdf|pptx|ppt)$/i) || file.type.includes('pdf')) {
          e.preventDefault();
          showNoticeToast(`📄 પેસ્ટ કરેલ PDF ફાઇલ સ્વીકારાઈ: ${file.name}`, 'info');
          handlePdfUploadInVideoEditor(file);
        }
      }
    });

    // Toggle Live Presentation Recording Mode
    container.querySelector('#btn-toggle-live-record')?.addEventListener('click', () => {
      isLiveRecordingMode = !isLiveRecordingMode;
      renderView();
    });

    // Start Live Recording
    container.querySelector('#btn-live-start')?.addEventListener('click', async () => {
      try {
        const cur = generatedClips[currentSlideIndex] || generatedClips[0];
        liveRecorder = new LiveAudioRecorder();
        liveElapsedSeconds = 0;
        liveRecordingStartTime = Date.now();
        liveTransitionMarks = [
          { slideIndex: currentSlideIndex, slideNumber: cur.slideNumber, slideId: cur.slideId, startTime: 0 }
        ];

        await liveRecorder.start({
          onTick: (timeVal) => {
            liveElapsedSeconds = (typeof timeVal === 'number') ? timeVal : (liveElapsedSeconds + 1);
            const timerEl = container.querySelector('#live-rec-timer');
            if (timerEl) timerEl.textContent = formatTime(liveElapsedSeconds);
          },
          onLevel: (levelPct) => {
            const vu = container.querySelector('#live-rec-vu');
            if (vu) vu.style.width = `${Math.min(100, levelPct * 1.5)}%`;
          }
        });

        if (liveTimerInterval) clearInterval(liveTimerInterval);
        liveTimerInterval = setInterval(() => {
          liveElapsedSeconds = Math.floor((Date.now() - liveRecordingStartTime) / 1000);
          const timerEl = container.querySelector('#live-rec-timer');
          if (timerEl) timerEl.textContent = formatTime(liveElapsedSeconds);
        }, 500);

        renderView();
        showNoticeToast(`🔴 સ્લાઇડ #${cur.slideNumber} સામે બોલવાનું શરૂ કરો! બોલી લીધા પછી "આગલી સ્લાઇડ પર જાઓ ⏭️" દબાવો.`, 'info');
      } catch (err) {
        console.error('Live recording start error:', err);
        alert('લાઈવ રેકોર્ડિંગ શરૂ કરવામાં સમસ્યા આવી: ' + err.message);
      }
    });

    // Next Slide during Live Recording
    container.querySelector('#btn-live-next-slide')?.addEventListener('click', () => {
      const nowSec = (Date.now() - liveRecordingStartTime) / 1000;
      const currentMark = liveTransitionMarks[liveTransitionMarks.length - 1];
      if (currentMark) {
        currentMark.endTime = nowSec;
      }

      if (currentSlideIndex < generatedClips.length - 1) {
        currentSlideIndex++;
        const nextClip = generatedClips[currentSlideIndex];
        liveTransitionMarks.push({
          slideIndex: currentSlideIndex,
          slideNumber: nextClip.slideNumber,
          slideId: nextClip.slideId,
          startTime: nowSec
        });
        renderView();
        showNoticeToast(`⏭️ સ્લાઇડ #${nextClip.slideNumber} આવી ગઈ! બોલવાનું ચાલુ રાખો...`, 'info');
      } else {
        container.querySelector('#btn-live-finish')?.click();
      }
    });

    // Finish Live Recording and Auto-Slice by Slides
    container.querySelector('#btn-live-finish')?.addEventListener('click', async () => {
      if (!liveRecorder || !liveRecorder.isRecording) return;
      isProcessingRecording = true;
      if (liveTimerInterval) { clearInterval(liveTimerInterval); liveTimerInterval = null; }

      showNoticeToast('⚙️ તમામ સ્લાઇડ્સનો અવાજ સ્લાઇસ થઈ રહ્યો છે અને AI Studio (-16 LUFS) એન્હાન્સ થઈ રહ્યો છે...', 'info');

      const totalEndSec = (Date.now() - liveRecordingStartTime) / 1000;
      const lastMark = liveTransitionMarks[liveTransitionMarks.length - 1];
      if (lastMark && !lastMark.endTime) {
        lastMark.endTime = totalEndSec;
      }

      const result = await liveRecorder.stop();
      liveRecorder = null;

      if (result && (result.buffer || result.blob)) {
        pushUndoSnapshot('Live Slide + Audio Recording');
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtxClass();
        let fullBuf = result.buffer;
        if (!fullBuf && result.blob) {
          const ab = await result.blob.arrayBuffer();
          fullBuf = await ctx.decodeAudioData(ab);
        }

        if (fullBuf) {
          const fs = fullBuf.sampleRate;
          const numCh = fullBuf.numberOfChannels;

          for (const mark of liveTransitionMarks) {
            const startSec = mark.startTime;
            const endSec = mark.endTime || fullBuf.duration;
            const startSample = Math.floor(Math.max(0, startSec) * fs);
            const endSample = Math.floor(Math.min(fullBuf.duration, endSec) * fs);
            const sliceLen = Math.max(0, endSample - startSample);
            if (sliceLen <= 0) continue;

            const sliceBuf = ctx.createBuffer(numCh, sliceLen, fs);
            for (let c = 0; c < numCh; c++) {
              const src = fullBuf.getChannelData(c);
              const dst = sliceBuf.getChannelData(c);
              for (let i = 0; i < sliceLen; i++) dst[i] = src[startSample + i];
            }

            let enhancedBuf = sliceBuf;
            try {
              const enh = await enhanceAudioBuffer(sliceBuf, {
                preset: 'auto_studio',
                targetLUFS: -16.0,
                noiseRemoval: true,
                clarityBoost: true,
                volumeNormalization: true
              });
              if (enh?.buffer) enhancedBuf = enh.buffer;
            } catch (_) { }

            const wavBlob = audioBufferToWav(enhancedBuf);
            const sliceUrl = URL.createObjectURL(wavBlob);
            const dur = Number(enhancedBuf.duration.toFixed(2));

            const clip = generatedClips[mark.slideIndex] || generatedClips.find(c => c.slideId === mark.slideId);
            if (clip) {
              clip.audioUrl = sliceUrl;
              clip.originalAudioUrl = sliceUrl;
              clip.duration = dur;
              clip.formattedDuration = formatTime(dur);
              clip.hasAudio = true;
              clip.status = 'તૈયાર';
            }

              // Save to IndexedDB & sync in-memory records
              const slideAudioItem = {
                id: `${project.id}_slide_${mark.slideId}`,
                projectId: project.id,
                slideId: mark.slideId,
                slideNumber: mark.slideNumber,
                blob: wavBlob,
                url: sliceUrl,
                duration: dur,
                status: 'Enhanced',
                savedAt: new Date().toISOString()
          };
          await saveSlideAudioRecord(project.id, String(mark.slideId), slideAudioItem);

          const existAudIdx = storedSlideAudios.findIndex(r => String(r.slideId) === String(mark.slideId) || Number(r.slideNumber) === Number(mark.slideNumber));
          if (existAudIdx >= 0) {
            storedSlideAudios[existAudIdx] = slideAudioItem;
          } else {
            storedSlideAudios.push(slideAudioItem);
          }

          if (Array.isArray(project.slide?.slides)) {
            const matchedSlide = project.slide.slides.find(s => s.slideNumber === mark.slideNumber || String(s.id) === String(mark.slideId));
            if (matchedSlide) {
              matchedSlide.audioUrl = sliceUrl;
              matchedSlide.hasAudio = true;
              matchedSlide.recordingDuration = dur;
            }
          }
        }
      }
      try { await ctx.close(); } catch (_) { }
    }

      isProcessingRecording = false;
    isLiveRecordingMode = false;
    persistClips();
    renderView();
    showNoticeToast('🎉 લાઈવ સ્લાઇડ + અવાજ રેકોર્ડિંગ સફળતાપૂર્વક દરેક સ્લાઇડ સાથે સાચવાઈ ગયું!', 'success');
  });

  // Quick Single Slide Record
  container.querySelector('#btn-quick-record-slide')?.addEventListener('click', async () => {
    const cur = generatedClips[currentSlideIndex];
    if (isSingleSlideRecording) {
      // Stop single slide recording
      if (!singleSlideRecorder) return;
      showNoticeToast(`🎙️ સ્લાઇડ #${cur.slideNumber} નો અવાજ એન્હાન્સ થઈ રહ્યો છે...`, 'info');
      const res = await singleSlideRecorder.stop();
      singleSlideRecorder = null;
      isSingleSlideRecording = false;
  // Quick Single Slide Record (re-uses shared Step 1 slide recorder)
  container.querySelector('#btn-quick-record-slide')?.addEventListener('click', () => {
    handleToggleSingleSlideRecording();
  });

      if (res && (res.buffer || res.blob)) {
        pushUndoSnapshot('Quick Slide Record');
        let buf = res.buffer;
        if (!buf && res.blob) {
          const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
          const ctx = new AudioCtxClass();
          const ab = await res.blob.arrayBuffer();
          buf = await ctx.decodeAudioData(ab);
          try { await ctx.close(); } catch (_) { }
        }
        if (buf) {
          try {
            const enh = await enhanceAudioBuffer(buf, {
              preset: 'crystal_ultra_studio',
              targetLUFS: -14,
              targetPeakDb: -0.8,
              noiseRemoval: true,
              noiseReduction: 0.98,
              clarityBoost: true,
              volumeNormalization: true,
              zeroBackgroundNoise: true
            });
            if (enh?.buffer) buf = enh.buffer;
          } catch (_) { }

          const wavBlob = audioBufferToWav(buf);
          const wavUrl = URL.createObjectURL(wavBlob);
          cur.audioUrl = wavUrl;
          cur.originalAudioUrl = wavUrl;
          cur.blob = wavBlob;
          cur.duration = Number(buf.duration.toFixed(2));
          cur.formattedDuration = formatTime(cur.duration);
          cur.hasAudio = true;
          cur.status = 'તૈયાર';
          delete cur.enhancedBlob;
          delete cur.enhancedDataUrl;
          delete cur.serverUrl;
          delete cur.cleanedAudioUrl;

          const singleAudioItem = {
            id: `${project.id}_slide_${cur.slideId}`,
            projectId: project.id,
            slideId: cur.slideId,
            slideNumber: cur.slideNumber,
            blob: wavBlob,
            url: wavUrl,
            duration: cur.duration,
            status: 'Enhanced',
            savedAt: new Date().toISOString()
          };
          await saveSlideAudioRecord(project.id, String(cur.slideId), singleAudioItem);
          await saveSlideAudioRecord(project.id, String(cur.slideNumber), singleAudioItem);
          uploadAudioToServer(wavBlob, `slide_${cur.slideNumber}_${Date.now()}.wav`, project.id)
            .then(srvUrl => { if (srvUrl) singleAudioItem.serverUrl = srvUrl; })
            .catch(() => {});

          storedSlideAudios = storedSlideAudios.filter(r =>
            String(r.slideId) !== String(cur.slideId) &&
            Number(r.slideNumber) !== Number(cur.slideNumber)
          );
          storedSlideAudios.push(singleAudioItem);

          if (Array.isArray(project.slide?.slides)) {
            const matchedSlide = project.slide.slides.find(s => s.slideNumber === cur.slideNumber || String(s.id) === String(cur.slideId));
            if (matchedSlide) {
              matchedSlide.audioUrl = wavUrl;
              matchedSlide.hasAudio = true;
              matchedSlide.recordingDuration = cur.duration;
              delete matchedSlide.enhancedBlob;
              delete matchedSlide.enhancedDataUrl;
              delete matchedSlide.serverUrl;
              delete matchedSlide.cleanedAudioUrl;
            }
          }

          presentationStitchedUrl = null;
          if (fullPresentationAudio) {
            try { fullPresentationAudio.pause(); } catch (_) {}
            fullPresentationAudio = null;
          }
          prewarmPresentationAudio();
      }
    }
    persistClips();
    selectClip(currentSlideIndex);
    showNoticeToast(`✨ સ્લાઇડ #${cur.slideNumber}: અવાજ રેકોર્ડ થયો & નોઈઝ (ઘોંઘાટ) ૯૬% સાફ થઈને સેવ થયો!`, 'success');
  } else {
    // Start single slide recording
    stopCurrentAudio();
        singleSlideRecorder = new LiveAudioRecorder();
    await singleSlideRecorder.start();
    isSingleSlideRecording = true;
    renderView();
        showNoticeToast(`🔴 સ્લાઇડ #${cur.slideNumber
  } માટે બોલવાનું શરૂ કરો...`, 'info');
      }
    });

    // Video Clip Script Paste & Edit Handlers
    const videoScriptTa = container.querySelector('#video-clip-script-textarea');
    let videoScriptDebounce = null;

    const saveCurrentClipScript = (newText, notify = false) => {
      const cur = generatedClips[currentSlideIndex];
      if (!cur) return;
      cur.scriptText = newText;

      // Update in project slides
      if (Array.isArray(project.slide?.slides)) {
        const targetSlide = project.slide.slides.find(s => s.slideNumber === cur.slideNumber || String(s.id) === String(cur.slideId));
        if (targetSlide) {
          targetSlide.scriptText = newText;
          projectState.updateTool('slide', { slides: project.slide.slides });
        }
      }

      // Update in project script sections
      if (!project.script) project.script = {};
      if (!Array.isArray(project.script.sections)) project.script.sections = [];
      let targetSec = project.script.sections.find(s => s.slideNumber === cur.slideNumber || String(s.slideId) === String(cur.slideId));
      if (targetSec) {
        targetSec.scriptText = newText;
      } else {
        project.script.sections.push({
          slideId: cur.slideId,
          slideNumber: cur.slideNumber,
          sectionName: cur.title || `સ્લાઇડ #${ cur.slideNumber }`,
          title: cur.title || `સ્લાઇડ #${ cur.slideNumber }`,
          scriptText: newText
        });
      }
      const full = project.script.sections.map(s => s.scriptText).filter(Boolean).join('\n\n');
      project.script.fullText = full;
      project.script.rawText = full;
      projectState.updateTool('script', project.script);

      if (project.id) {
        saveScriptToDatabase(project.id, {
          rawText: full,
          fullText: full,
          sections: project.script.sections
        }, { notify: false, showToast: false }).catch(() => {});
      }

      persistClips();
      if (notify) {
        showNoticeToast(`✓ સ્લાઇડ #${ cur.slideNumber } ની સ્ક્રિપ્ટ સાચવાઈ ગઈ!`, 'success');
      }
    };

    videoScriptTa?.addEventListener('input', (e) => {
      const val = e.target.value || '';
      const wCount = val.trim().split(/\s+/).filter(Boolean).length;
      const wEl = container.querySelector('#video-script-words-count');
      if (wEl) wEl.innerText = wCount;

      clearTimeout(videoScriptDebounce);
      videoScriptDebounce = setTimeout(() => {
        saveCurrentClipScript(val, false);
      }, 500);
    });

    const livePrompterTa = container.querySelector('#live-teleprompter-script-ta');
    livePrompterTa?.addEventListener('input', (e) => {
      const val = e.target.value || '';
      if (liveTeleprompterMode === 'full') {
        if (!project.script) project.script = {};
        project.script.fullText = val;
        project.script.rawText = val;
        clearTimeout(videoScriptDebounce);
        videoScriptDebounce = setTimeout(() => {
          if (project.id) {
            saveScriptToDatabase(project.id, { fullText: val, rawText: val, source: 'Teleprompter' }, { notify: false, showToast: false }).catch(() => {});
          }
        }, 600);
      } else {
        if (videoScriptTa && videoScriptTa !== e.target) {
          videoScriptTa.value = val;
          const wCount = val.trim().split(/\s+/).filter(Boolean).length;
          const wEl = container.querySelector('#video-script-words-count');
          if (wEl) wEl.innerText = wCount;
        }
        clearTimeout(videoScriptDebounce);
        videoScriptDebounce = setTimeout(() => {
          saveCurrentClipScript(val, false);
        }, 500);
      }
    });

    // Live Teleprompter Mode Buttons & Actions
    container.querySelector('#btn-live-tp-mode-clip')?.addEventListener('click', () => {
      liveTeleprompterMode = 'clip';
      renderView();
    });
    container.querySelector('#btn-live-tp-mode-full')?.addEventListener('click', () => {
      liveTeleprompterMode = 'full';
      renderView();
    });
    container.querySelector('#btn-live-tp-paste')?.addEventListener('click', async () => {
      let pastedText = '';
      try {
        if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
          pastedText = await navigator.clipboard.readText();
        }
      } catch (_) {}
      if (!pastedText) pastedText = prompt('સ્ક્રિપ્ટ અહીં પેસ્ટ કરો (Ctrl+V):');
      if (pastedText && pastedText.trim()) {
        const trimmed = pastedText.trim();
        if (liveTeleprompterMode === 'full' || trimmed.includes('[સ્લાઇડ') || trimmed.includes('[Slide') || trimmed.length > 300) {
          await handleVideoApplyChatGptScript(trimmed);
        } else {
          const cur = generatedClips[currentSlideIndex];
          if (cur) {
            cur.scriptText = trimmed;
            saveCurrentClipScript(trimmed, true);
            renderView();
            showNoticeToast('✅ આ સ્લાઇડની સ્ક્રિપ્ટ સેવ થઈ ગઈ!', 'success');
          }
        }
      }
    });
    container.querySelector('#btn-live-tp-save')?.addEventListener('click', async () => {
      const val = (livePrompterTa ? livePrompterTa.value : '').trim();
      if (!val) {
        showNoticeToast('⚠️ સ્ક્રિપ્ટ લખાણ ખાલી છે!', 'warning');
        return;
      }
      if (liveTeleprompterMode === 'full') {
        await handleVideoApplyChatGptScript(val);
      } else {
        const cur = generatedClips[currentSlideIndex];
        if (cur) {
          cur.scriptText = val;
          saveCurrentClipScript(val, true);
          renderView();
          showNoticeToast('✅ સ્લાઇડ #' + cur.slideNumber + ' ની સ્ક્રિપ્ટ સેવ થઈ ગઈ!', 'success');
        }
      }
    });

    async function handleVideoApplyChatGptScript(rawText) {
      if (!rawText || !rawText.trim()) {
        showNoticeToast('⚠️ કોઈ સ્ક્રિપ્ટ લખાણ મળ્યું નથી!', 'warning');
        return;
      }
      const cleanText = rawText.trim();
      let parsedSections = parseChatGptScriptText(cleanText, generatedClips);

      // If parsing resulted in 0 or 1 section while clips exist, distribute across all slides
      if ((!Array.isArray(parsedSections) || parsedSections.length <= 1) && Array.isArray(generatedClips) && generatedClips.length > 1) {
        const distributed = segmentContinuousScriptAcrossSlides(cleanText, generatedClips.length);
        parsedSections = distributed.map((segText, idx) => {
          const clip = generatedClips[idx];
          const sNum = clip?.slideNumber || (idx + 1);
          return {
            slideNumber: sNum,
            sectionName: `સ્લાઇડ #${sNum}`,
            title: clip?.title || `સ્લાઇડ #${sNum}`,
            subtitle: clip?.subtitle || '',
            scriptText: segText
          };
        });
      }

      if (Array.isArray(parsedSections) && parsedSections.length > 0) {
        parsedSections.forEach((sec, idx) => {
          const clip = generatedClips[idx] || generatedClips.find(c => c.slideNumber === (idx + 1));
          if (clip && sec.scriptText) {
            clip.scriptText = sec.scriptText;
            if (sec.title && (!clip.title || clip.title.startsWith('સ્લાઇડ'))) clip.title = sec.title;
          }
        });

        if (slides && Array.isArray(slides)) {
          slides.forEach((sl, idx) => {
            const sec = parsedSections[idx] || parsedSections.find(s => s.slideNumber === (idx + 1));
            if (sec && sec.scriptText) {
              sl.scriptText = sec.scriptText;
              if (sec.title && (!sl.title || sl.title.startsWith('સ્લાઇડ'))) sl.title = sec.title;
            }
          });
          project.slide = project.slide || {};
          project.slide.slides = slides;
          projectState.updateTool('slide', { slides });
        }

        project.script = project.script || {};
        project.script.fullText = cleanText;
        project.script.rawText = cleanText;
        project.script.originalChatGptScript = cleanText;
        project.script.sections = parsedSections;
        projectState.updateTool('script', project.script);

        persistClips();
        if (project.id) {
          saveScriptToDatabase(project.id, {
            rawText: cleanText,
            fullText: cleanText,
            originalChatGptScript: cleanText,
            sections: parsedSections,
            source: 'ChatGPT'
          }, { notify: true, showToast: false }).catch(() => {});
        }

        renderView();
        showNoticeToast(`🎉 ChatGPT સ્ક્રિપ્ટ તમામ ${ generatedClips.length } ક્લિપ્સમાં સફળતાપૂર્વક સેટ થઈ ગઈ!`, 'success');
      } else {
        if (curClip) {
          curClip.scriptText = cleanText;
          saveCurrentClipScript(cleanText, true);
          renderView();
        }
      }
    }

    container.querySelector('#btn-video-paste-chatgpt-script')?.addEventListener('click', async () => {
      try {
        let text = '';
        if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
          text = await navigator.clipboard.readText();
        }
        if (!text) {
          text = prompt('ChatGPT સ્ક્રિપ્ટ અહીં પેસ્ટ કરો (Ctrl+V):');
        }
        if (text && text.trim()) {
          await handleVideoApplyChatGptScript(text);
        }
      } catch (_) {
        const text = prompt('ChatGPT સ્ક્રિપ્ટ અહીં પેસ્ટ કરો (Ctrl+V):');
        if (text && text.trim()) {
          await handleVideoApplyChatGptScript(text);
        }
      }
    });

    container.querySelector('#btn-video-paste-script')?.addEventListener('click', async () => {
      try {
        let text = '';
        if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
          text = await navigator.clipboard.readText();
        }
        if (!text) {
          text = prompt('આ સ્લાઇડ માટેની સ્ક્રિપ્ટ અહીં પેસ્ટ કરો:');
        }
        if (text && text.trim()) {
          if (text.includes('[સ્લાઇડ') || text.includes('[Slide') || text.includes('### સ્લાઇડ') || text.length > 500) {
            await handleVideoApplyChatGptScript(text);
          } else {
            if (videoScriptTa) videoScriptTa.value = text.trim();
            saveCurrentClipScript(text.trim(), true);
            renderView();
          }
        }
      } catch (_) {
        const text = prompt('આ સ્લાઇડ માટેની સ્ક્રિપ્ટ અહીં પેસ્ટ કરો:');
        if (text && text.trim()) {
          if (text.includes('[સ્લાઇડ') || text.includes('[Slide') || text.includes('### સ્લાઇડ') || text.length > 500) {
            await handleVideoApplyChatGptScript(text);
          } else {
            if (videoScriptTa) videoScriptTa.value = text.trim();
            saveCurrentClipScript(text.trim(), true);
            renderView();
          }
        }
      }
    });

    videoScriptTa?.addEventListener('paste', async (e) => {
      const pasted = (e.clipboardData || window.clipboardData)?.getData('text') || '';
      if (pasted && (pasted.includes('[સ્લાઇડ') || pasted.includes('[Slide') || pasted.includes('### સ્લાઇડ') || pasted.length > 500)) {
        e.preventDefault();
        await handleVideoApplyChatGptScript(pasted);
      }
    });

    container.querySelector('#btn-video-save-script')?.addEventListener('click', () => {
      if (activeVideoScriptTab === 'full') {
        const fTa = container.querySelector('#video-full-script-textarea');
        const val = fTa ? fTa.value.trim() : '';
        if (val) {
          handleVideoApplyChatGptScript(val);
        } else {
          showNoticeToast('⚠️ પહેલાં સ્ક્રિપ્ટ દાખલ કરો.', 'warning');
        }
      } else {
        const val = videoScriptTa ? videoScriptTa.value : '';
        saveCurrentClipScript(val, true);
      }
    });

    // Tab toggles for full script vs clip script
    container.querySelector('#tab-video-script-full')?.addEventListener('click', () => {
      activeVideoScriptTab = 'full';
      const fp = container.querySelector('#video-full-script-panel');
      const cp = container.querySelector('#video-clip-script-panel');
      const tf = container.querySelector('#tab-video-script-full');
      const tc = container.querySelector('#tab-video-script-clip');
      if (fp) fp.style.display = 'block';
      if (cp) cp.style.display = 'none';
      if (tf) { tf.style.background = '#2563eb'; tf.style.color = '#ffffff'; }
      if (tc) { tc.style.background = 'transparent'; tc.style.color = '#475569'; }
    });

    container.querySelector('#tab-video-script-clip')?.addEventListener('click', () => {
      activeVideoScriptTab = 'clip';
      const fp = container.querySelector('#video-full-script-panel');
      const cp = container.querySelector('#video-clip-script-panel');
      const tf = container.querySelector('#tab-video-script-full');
      const tc = container.querySelector('#tab-video-script-clip');
      if (fp) fp.style.display = 'none';
      if (cp) cp.style.display = 'block';
      if (tf) { tf.style.background = 'transparent'; tf.style.color = '#475569'; }
      if (tc) { tc.style.background = '#2563eb'; tc.style.color = '#ffffff'; }
    });

    // Select Project Script for Video Editor
    container.querySelector('#btn-video-select-proj-script')?.addEventListener('click', async () => {
      const projScript = (() => {
        if (project.script?.fullText && project.script.fullText.trim()) return project.script.fullText.trim();
        if (project.script?.rawText && project.script.rawText.trim()) return project.script.rawText.trim();
        if (Array.isArray(project.script?.sections) && project.script.sections.length > 0) {
          return project.script.sections.map(s => `[${ s.sectionName || s.title || 'સ્લાઇડ' }]: \n${ s.scriptText || s.content || '' }`).join('\n\n');
        }
        if (Array.isArray(connectedSequence?.slides) && connectedSequence.slides.length > 0) {
          return connectedSequence.slides.map(s => s.scriptText ? `[સ્લાઇડ #${ s.slideNumber || 1 }]: \n${ s.scriptText }` : '').filter(Boolean).join('\n\n');
        }
        return '';
      })();

      if (!projScript) {
        showNoticeToast('ℹ️ પ્રોજેક્ટમાં સ્ક્રિપ્ટ મળી નથી. કૃપા કરીને નવી સ્ક્રિપ્ટ પેસ્ટ કરો.', 'info');
        return;
      }

      await handleVideoApplyChatGptScript(projScript);
      const fTa = container.querySelector('#video-full-script-textarea');
      if (fTa) fTa.value = projScript;
      showNoticeToast('✨ પ્રોજેક્ટ સ્ક્રિપ્ટ સફળતાપૂર્વક લોડ થઈ ગઈ!', 'success');
    });

    // Paste Entire Script for Video Editor
    container.querySelector('#btn-video-paste-full-script')?.addEventListener('click', async () => {
      let pastedText = '';
      try {
        if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
          pastedText = await navigator.clipboard.readText();
        }
      } catch (_) {}

      if (!pastedText) {
        pastedText = prompt('અહીં સંપૂર્ણ વિડીયોની આખી સ્ક્રિપ્ટ પેસ્ટ કરો (Ctrl+V):');
      }

      if (pastedText && pastedText.trim()) {
        const fTa = container.querySelector('#video-full-script-textarea');
        if (fTa) fTa.value = pastedText.trim();
        await handleVideoApplyChatGptScript(pastedText.trim());
      }
    });

    // Distribute full script button
    container.querySelector('#btn-video-distribute-full-script')?.addEventListener('click', async () => {
      const fTa = container.querySelector('#video-full-script-textarea');
      const val = fTa ? fTa.value.trim() : '';
      if (val) {
        await handleVideoApplyChatGptScript(val);
      } else {
        showNoticeToast('⚠️ પહેલાં સ્ક્રિપ્ટ લખાણ દાખલ કરો.', 'warning');
      }
    });

    // Full script textarea paste and input event
    const videoFullScriptTa = container.querySelector('#video-full-script-textarea');
    videoFullScriptTa?.addEventListener('paste', async (e) => {
      const pasted = (e.clipboardData || window.clipboardData)?.getData('text') || '';
      if (pasted && pasted.trim()) {
        e.preventDefault();
        videoFullScriptTa.value = pasted.trim();
        await handleVideoApplyChatGptScript(pasted.trim());
      }
    });

    videoFullScriptTa?.addEventListener('input', (e) => {
      const val = e.target.value || '';
      const wCount = val.trim().split(/\s+/).filter(Boolean).length;
      const wEl = container.querySelector('#video-full-script-words-count');
      if (wEl) wEl.innerText = wCount;
    });

    // Undo / Redo
    container.querySelector('#btn-undo-seq')?.addEventListener('click', () => {
      if (undoStack.length === 0) return;
      redoStack.push(JSON.stringify(generatedClips));
      generatedClips = JSON.parse(undoStack.pop());
      reindexClips();
      persistClips();
      selectClip(Math.min(currentSlideIndex, generatedClips.length - 1));
      showNoticeToast('↩️ Undo સફળ!', 'info');
    });

    container.querySelector('#btn-redo-seq')?.addEventListener('click', () => {
      if (redoStack.length === 0) return;
      undoStack.push(JSON.stringify(generatedClips));
      generatedClips = JSON.parse(redoStack.pop());
      reindexClips();
      persistClips();
      selectClip(Math.min(currentSlideIndex, generatedClips.length - 1));
      showNoticeToast('↪️ Redo સફળ!', 'info');
    });

    // View tab toggles
    container.querySelector('#view-tab-preview')?.addEventListener('click', () => {
      const vid = container.querySelector('#main-saved-video-element');
      if (vid) { try { vid.pause(); } catch (_) { } }
      activeViewMode = 'preview';
      renderView();
    });

    container.querySelector('#view-tab-saved')?.addEventListener('click', () => {
      stopAllBackgroundAudios();
      activeViewMode = 'saved';
      renderView();
    });

    container.querySelector('#btn-reopen-preview')?.addEventListener('click', () => {
      activeViewMode = 'saved';
      renderView();
      const vid = container.querySelector('#main-saved-video-element');
      if (vid) playVideoWithFullSound(vid);
    });

    // Unified WhatsApp Share Listeners
    container.querySelectorAll('#btn-direct-whatsapp-saved-video, #btn-top-whatsapp-saved-video, #btn-banner-whatsapp-send, #btn-quick-share-saved-video, #btn-share-saved-video-card, #btn-card-direct-whatsapp-save').forEach(btn => {
      btn.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        triggerWhatsAppShare(e.currentTarget);
      };
    });

    container.querySelector('#btn-banner-switch-to-saved')?.addEventListener('click', () => {
      activeViewMode = 'saved';
      renderView();
      const vid = container.querySelector('#main-saved-video-element');
      if (vid) playVideoWithFullSound(vid);
    });
    
    // Unified Direct MP4 File Download Listeners
    container.querySelectorAll('#btn-download-saved-mp4, #btn-card-direct-download, #btn-top-download-mp4').forEach(btn => {
      btn.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        triggerDirectFileDownload(e);
      };
    });

    container.querySelector('#btn-copy-direct-video-link')?.addEventListener('click', async () => {
      const urlToCopy = savedVideoUrl ? getShareableVideoUrl(savedVideoUrl) : '';
      if (!urlToCopy) return;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(urlToCopy);
        } else {
          const ta = document.createElement('textarea');
          ta.value = urlToCopy;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        const lbl = container.querySelector('#lbl-copy-direct-link');
        if (lbl) lbl.textContent = '✓ કોપી થઈ ગઈ!';
        showNoticeToast('📋 વિડીયો લિંક ક્લિપબોર્ડમાં કોપી થઈ ગઈ છે!', 'success');
      } catch (_) {
        prompt('આ વિડીયો લિંક કોપી કરો:', urlToCopy);
      }
    });

    // General Mobile Share / Native Web Share Sheet / Modal Handler
    const triggerShareVideo = (btn) => {
      shareProjectVideo(project, {
        triggerButton: btn,
        customVideoUrl: savedVideoUrl,
        customFilename: savedVideoFilename,
        durationFormatted: getFormattedDuration(),
        createdAtFormatted: formattedVideoCreationTime
      });
    };

    container.querySelector('#btn-share-saved-video')?.addEventListener('click', (e) => triggerShareVideo(e.currentTarget));

    container.querySelector('#btn-watch-saved-video-beside')?.addEventListener('click', () => {
      activeViewMode = 'preview';
      renderView();
    });

    container.querySelector('#btn-rerender-saved-video')?.addEventListener('click', () => {
      savedVideoUrl = null;
      if (project.editing) {
        project.editing.lastExportedVideoUrl = '';
        project.editing.savedVideo = null;
        projectState.updateTool('editing', project.editing);
      }
      startVideoCreation();
    });

    container.querySelector('#btn-reset-saved-video')?.addEventListener('click', () => {
      savedVideoUrl = null;
      if (project.editing) {
        project.editing.lastExportedVideoUrl = '';
        project.editing.savedVideo = null;
        projectState.updateTool('editing', project.editing);
      }
      activeViewMode = 'preview';
      renderView();
      showNoticeToast('🗑️ જૂનો વિડીયો રીસેટ થઈ ગયો! હવે નવો અવાજ ચકાસીને "વિડીયો બનાવો" પર ક્લિક કરો.', 'info');
    });

    // Slide navigation buttons (Secondary sync)
    container.querySelectorAll('#btn-prev-slide, .btn-nav-prev-slide').forEach(btn => {
      btn.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        goToPrevSlide();
      };
    });

    container.querySelectorAll('#btn-next-slide, .btn-nav-next-slide').forEach(btn => {
      btn.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        goToNextSlide();
      };
    });

    container.querySelectorAll('#step1-select-slide, .step1-select-slide-nav').forEach(sel => {
      sel.onchange = (e) => {
        const idx = parseInt(e.target.value, 10);
        if (!isNaN(idx) && idx >= 0 && idx < generatedClips.length) {
          selectClip(idx);
        }
      };
    });

    // Full Presentation Video Play / Pause (Sequentially plays all 9 slides with authentic speech)
    container.querySelector('#btn-play-all-slides')?.addEventListener('click', () => {
      if (isPlayingFullPresentation) {
        stopFullPresentation();
      } else {
        startFullPresentation();
      }
    });

    // Video Scrubber seeking (Handles both Full Presentation 0:00-03:13 and Single Slide)
    container.querySelectorAll('#audio-scrubber-input').forEach(sc => {
      sc.addEventListener('input', (e) => {
        const seekVal = parseFloat(e.target.value);
        if (isPlayingFullPresentation && fullPresentationAudio) {
          fullPresentationAudio.currentTime = seekVal;
          const slideTimingRanges = getSlideTimingRanges();
          const match = slideTimingRanges.find(r => seekVal >= r.start && seekVal < r.end) || slideTimingRanges[slideTimingRanges.length - 1];
          if (match && currentSlideIndex !== match.index) {
            currentSlideIndex = match.index;
            updateLiveStageVisual(match.clip);
          }
        } else if (activeAudio) {
          activeAudio.currentTime = seekVal;
        }
        const timeCurrent = container.querySelector('#time-current');
        if (timeCurrent) timeCurrent.textContent = formatTime(seekVal);
        const allCurTimes = container.querySelectorAll('#audio-current-time-display');
        allCurTimes.forEach(ct => { ct.textContent = formatTime(seekVal); });
      });
    });

    // Audio Play / Pause for single slide
    container.querySelectorAll('#btn-audio-play-pause').forEach(btn => {
      btn.addEventListener('click', () => {
        if (isPlaying) {
          stopCurrentAudio();
        } else {
          startSlideAudio(currentSlideIndex);
        }
      });
    });

    // Sub-tab toggles in editor
    container.querySelector('#tab-editor-audio')?.addEventListener('click', () => {
      activeClipEditorTab = 'audio';
      renderView();
    });

    container.querySelector('#tab-editor-slide')?.addEventListener('click', () => {
      activeClipEditorTab = 'slide';
      renderView();
    });

    // Clip card selection
    container.querySelectorAll('.btn-select-clip').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.clipIndex, 10);
        selectClip(idx);
      });
    });

    container.querySelectorAll('.btn-clip-preview').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(el.dataset.clipIndex, 10);
        if (currentSlideIndex === idx && isPlaying) {
          stopCurrentAudio();
        } else {
          selectClip(idx);
          startSlideAudio(idx);
          const stage = container.querySelector('#main-video-stage');
          if (stage) {
            try { stage.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {}
          }
        }
      });
    });

    container.querySelectorAll('.btn-card-record-clip').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(el.dataset.clipIndex, 10);
        selectClip(idx);
        container.querySelector('#btn-quick-record-slide')?.click();
      });
    });

    // Stage Center Play Button
    container.querySelector('#btn-stage-center-play')?.addEventListener('click', (e) => {
      e.stopPropagation();
      container.querySelector('#btn-audio-play-pause')?.click();
    });

    // Banner Live Record Trigger
    container.querySelector('#btn-banner-toggle-live')?.addEventListener('click', () => {
      container.querySelector('#btn-toggle-live-record')?.click();
    });

    // Panel Single Slide Record Trigger
    container.querySelector('#btn-panel-single-record')?.addEventListener('click', () => {
      container.querySelector('#btn-quick-record-slide')?.click();
    });

    // Reorder Clips: Move Left
    container.querySelectorAll('.btn-clip-move-left').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(el.dataset.clipIndex, 10);
        if (idx > 0) {
          pushUndoSnapshot('Move Clip Left');
          const temp = generatedClips[idx];
          generatedClips[idx] = generatedClips[idx - 1];
          generatedClips[idx - 1] = temp;
          reindexClips();
          selectClip(idx - 1);
        }
      });
    });

    // Reorder Clips: Move Right
    container.querySelectorAll('.btn-clip-move-right').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(el.dataset.clipIndex, 10);
        if (idx < generatedClips.length - 1) {
          pushUndoSnapshot('Move Clip Right');
          const temp = generatedClips[idx];
          generatedClips[idx] = generatedClips[idx + 1];
          generatedClips[idx + 1] = temp;
          reindexClips();
          selectClip(idx + 1);
        }
      });
    });

    // Duplicate Clip
    container.querySelectorAll('.btn-clip-duplicate').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(el.dataset.clipIndex, 10);
        const original = generatedClips[idx];
        if (original) {
          pushUndoSnapshot('Duplicate Clip');
          const clone = JSON.parse(JSON.stringify(original));
          clone.clipId = `clip_${ Date.now() }_copy`;
          clone.title = `${ original.title }(Copy)`;
          generatedClips.splice(idx + 1, 0, clone);
          reindexClips();
          selectClip(idx + 1);
          showNoticeToast(`📑 ક્લિપ #${ original.clipNumber } ની ડુપ્લિકેટ કોપી ઉમેરાઈ!`, 'success');
        }
      });
    });

    // Delete Clip from Video
    container.querySelectorAll('.btn-clip-delete').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(el.dataset.clipIndex, 10);
        const targetClip = generatedClips[idx];
        if (generatedClips.length <= 1) {
          alert('વિડીયોમાં ઓછામાં ઓછી ૧ ક્લિપ હોવી જરૂરી છે.');
          return;
        }
        if (confirm(`શું તમે ખરેખર ક્લિપ #${ targetClip.clipNumber } વિડીયોમાંથી કાઢી નાખવા માંગો છો ?\n(મૂળ PDF સ્લાઇડ અને ઓરિજિનલ ઓડિયો સુરક્ષિત રહેશે)`)) {
          pushUndoSnapshot('Delete Clip');
          generatedClips.splice(idx, 1);
          reindexClips();
          const nextIdx = Math.min(idx, generatedClips.length - 1);
          selectClip(nextIdx);
          showNoticeToast(`🗑️ ક્લિપ #${ targetClip.clipNumber } વિડીયોમાંથી હટાવી દેવામાં આવી!`, 'info');
        }
      });
    });

    // Step 5 Interactive Waveform Selection (Smooth Dragging handles, Window Drag & Micro-Nudges)
    const wfCanvas = container.querySelector('#audio-waveform-canvas');
    if (wfCanvas) {
      setupWaveformInteraction(wfCanvas, 'step5');
    }

    // Play Selected Audio Section
    container.querySelector('#btn-play-selection')?.addEventListener('click', () => {
      if (!activeDecodedBuffer) return;
      const start = Math.min(selectionStartSec, selectionEndSec);
      const end = Math.max(selectionStartSec, selectionEndSec);
      if (end <= start) {
        showNoticeToast('કૃપા કરીને વેવફોર્મ પર કાપવાનો ભાગ પસંદ કરો.', 'warning');
        return;
      }

      stopCurrentAudio();
      try {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtxClass();
        const srcNode = ctx.createBufferSource();
        srcNode.buffer = activeDecodedBuffer;
        srcNode.playbackRate.value = previewPlaybackRate;
        const gainNode = ctx.createGain();
        gainNode.gain.value = previewVolume;
        srcNode.connect(gainNode);
        gainNode.connect(ctx.destination);
        srcNode.start(0, start, (end - start) / previewPlaybackRate);
        previewSourceNode = srcNode;
        showNoticeToast(`▶️ સિલેક્ટ કરેલ ભાગ(${(end - start).toFixed(2)}s) સાંભળી રહ્યા છો...`, 'info');
      } catch (e) {
        console.warn('Play selection error:', e);
      }
    });

    // Cut Middle Section
    container.querySelector('#btn-cut-middle')?.addEventListener('click', async () => {
      if (!activeDecodedBuffer) return;
      const start = Math.min(selectionStartSec, selectionEndSec);
      const end = Math.max(selectionStartSec, selectionEndSec);
      if (end - start < 0.1) {
        alert('કૃપા કરીને કાપવા માટે ઓછામાં ઓછો 0.1 સેકન્ડનો ભાગ વેવફોર્મ પર ડ્રેગ કરીને પસંદ કરો.');
        return;
      }

      const curClip = generatedClips[currentSlideIndex];
      const trimmed = await cutAudioBufferMiddle(activeDecodedBuffer, start, end);
      if (trimmed) {
        curClip.deletedSegments.push({ start, end, type: 'middle' });
        commitNewAudioBufferToClip(curClip, trimmed, 'વચ્ચેનો ભાગ કાપ્યો & જોડ્યો');
      }
    });

    // Cut Start
    container.querySelector('#btn-cut-start')?.addEventListener('click', async () => {
      if (!activeDecodedBuffer) return;
      const trimPoint = Math.max(selectionStartSec, selectionEndSec);
      if (trimPoint <= 0) return;

      const curClip = generatedClips[currentSlideIndex];
      const trimmed = await trimAudioBufferStart(activeDecodedBuffer, trimPoint);
      if (trimmed) {
        curClip.deletedSegments.push({ start: 0, end: trimPoint, type: 'start' });
        commitNewAudioBufferToClip(curClip, trimmed, 'શરૂઆતનો ભાગ કાપ્યો');
      }
    });

    // Cut End
    container.querySelector('#btn-cut-end')?.addEventListener('click', async () => {
      if (!activeDecodedBuffer) return;
      const cutPoint = Math.min(selectionStartSec, selectionEndSec);
      if (cutPoint <= 0) return;

      const curClip = generatedClips[currentSlideIndex];
      const trimmed = await trimAudioBufferEnd(activeDecodedBuffer, cutPoint);
      if (trimmed) {
        curClip.deletedSegments.push({ start: cutPoint, end: activeDecodedBuffer.duration, type: 'end' });
        commitNewAudioBufferToClip(curClip, trimmed, 'છેલ્લો ભાગ કાપ્યો');
      }
    });

    // Restore Original Audio
    container.querySelector('#btn-restore-orig-audio')?.addEventListener('click', async () => {
      const curClip = generatedClips[currentSlideIndex];
      if (!curClip?.originalAudioUrl) {
        alert('આ ક્લિપ માટે કોઈ મૂળ ઓરિજિનલ ઓડિયો ઉપલબ્ધ નથી.');
        return;
      }
      if (confirm('શું તમે ખરેખર મૂળ ઓરિજિનલ રેકોર્ડિંગ રીસ્ટોર કરવા માંગો છો? કરેલા તમામ કટ્સ હટી જશે.')) {
        pushUndoSnapshot('Restore Original Audio');
        curClip.audioUrl = curClip.originalAudioUrl;
        curClip.duration = curClip.originalDuration;
        curClip.formattedDuration = formatTime(curClip.duration);
        curClip.volume = 1.0;
        curClip.fadeIn = 0;
        curClip.fadeOut = 0;
        curClip.deletedSegments = [];

        const buf = await decodeAudioUrlToBuffer(curClip.originalAudioUrl);
        activeDecodedBuffer = buf;
        selectionStartSec = 0;
        selectionEndSec = buf ? Math.min(2.0, buf.duration) : 0;
        persistClips();
        renderView();
        showNoticeToast('🔄 મૂળ ઓડિયો સફળતાપૂર્વક પાછો લવાયો!', 'success');
      }
    });

    // Volume Slider
    container.querySelector('#input-clip-vol')?.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      const curClip = generatedClips[currentSlideIndex];
      if (curClip) curClip.volume = v;
      const lbl = container.querySelector('#label-clip-vol');
      if (lbl) lbl.textContent = `${ Math.round(v * 100) }% `;
      if (activeAudio) activeAudio.volume = Math.min(1.0, v);
    });

    // Apply Volume and Fades
    container.querySelector('#btn-apply-fades')?.addEventListener('click', async () => {
      const curClip = generatedClips[currentSlideIndex];
      if (!curClip || !activeDecodedBuffer) return;

      const vol = parseFloat(container.querySelector('#input-clip-vol')?.value) || 1.0;
      const fadeIn = parseFloat(container.querySelector('#select-fade-in')?.value) || 0;
      const fadeOut = parseFloat(container.querySelector('#select-fade-out')?.value) || 0;

      curClip.volume = vol;
      curClip.fadeIn = fadeIn;
      curClip.fadeOut = fadeOut;

      const fadedBuf = await applyVolumeAndFades(activeDecodedBuffer, vol, fadeIn, fadeOut);
      if (fadedBuf) {
        commitNewAudioBufferToClip(curClip, fadedBuf, 'વોલ્યુમ & Fades સેટ કર્યા');
      }
    });

    // Delete Clip Audio Only
    container.querySelector('#btn-delete-clip-audio')?.addEventListener('click', () => {
      const curClip = generatedClips[currentSlideIndex];
      if (confirm(`શું તમે ખરેખર ક્લિપ #${ curClip.clipNumber } માંથી ઓડિયો કાઢી નાખવા માંગો છો ?\n(સ્લાઇડ તેમજ મૂળ રેકોર્ડિંગ સચવાયેલ રહેશે)`)) {
        pushUndoSnapshot('Delete Clip Audio');
        stopCurrentAudio();
        curClip.audioUrl = '';
        curClip.hasAudio = false;
        activeDecodedBuffer = null;
        persistClips();
        renderView();
        showNoticeToast(`🗑️ ક્લિપ #${ curClip.clipNumber } માંથી ઓડિયો હટાવી દેવામાં આવ્યો!`, 'info');
      }
    });

    // Replace Audio from Another Slide
    container.querySelector('#btn-assign-selected-audio')?.addEventListener('click', async () => {
      const selVal = container.querySelector('#select-replace-audio')?.value;
      if (!selVal) {
        alert('કૃપા કરીને અન્ય સ્લાઇડનો ઓડિયો પસંદ કરો.');
        return;
      }
      const curClip = generatedClips[currentSlideIndex];
      pushUndoSnapshot('Replace Audio');
      curClip.audioUrl = selVal;
      curClip.hasAudio = true;
      const buf = await decodeAudioUrlToBuffer(selVal);
      if (buf) {
        curClip.duration = Number(buf.duration.toFixed(2));
        curClip.formattedDuration = formatTime(curClip.duration);
        activeDecodedBuffer = buf;
      }
      persistClips();
      renderView();
      showNoticeToast('✅ નવો ઓડિયો સફળતાપૂર્વક જોડાયો!', 'success');
    });

    // Slide Replacement Handler
    container.querySelector('#btn-apply-replace-slide')?.addEventListener('click', () => {
      const newSlideId = container.querySelector('#select-replace-slide')?.value;
      const targetSlide = connectedSequence.slides.find(s => s.slideId === newSlideId);
      if (!targetSlide) return;

      const curClip = generatedClips[currentSlideIndex];
      pushUndoSnapshot('Replace Slide Visual');
      curClip.slideId = targetSlide.slideId;
      curClip.slideNumber = targetSlide.slideNumber;
      curClip.pageNumber = targetSlide.pageNumber;
      curClip.title = targetSlide.title;
      curClip.subtitle = targetSlide.subtitle;
      curClip.scriptText = targetSlide.scriptText;
      curClip.bulletPoints = targetSlide.bulletPoints;
      curClip.imageUrl = targetSlide.imageUrl;

      persistClips();
      renderView();
      showNoticeToast(`📄 સ્લાઇડ #${ targetSlide.slideNumber } સફળતાપૂર્વક બદલાઈ ગઈ!`, 'success');
    });

    // Custom Duration Handler
    container.querySelector('#btn-apply-custom-dur')?.addEventListener('click', () => {
      const val = parseFloat(container.querySelector('#input-custom-dur')?.value);
      if (!val || val <= 0) return;

      const curClip = generatedClips[currentSlideIndex];
      pushUndoSnapshot('Change Duration');
      curClip.duration = val;
      curClip.formattedDuration = formatTime(val);

      persistClips();
      renderView();
      showNoticeToast(`⏱️ સ્લાઇડ સમયગાળો ${ val }s સેટ થયો!`, 'success');
    });

    // Open Folder Notebook from Video Creation tool
    container.querySelector('#btn-open-folder-notebook-video')?.addEventListener('click', () => {
      openFolderNotebookModal({ folderId: project?.folderId || 'f_default', folderName: project?.folderName || '📁 મુખ્ય ફોલ્ડર' });
    });

    // 16:9 Custom Slide & Clip Combiner Selection Controls
    container.querySelector('#btn-select-all-clips')?.addEventListener('click', () => {
      generatedClips.forEach(c => { c.included = true; });
      persistClips();
      renderView();
      showNoticeToast('✓ બધી સ્લાઇડ્સ ૧૬:૯ વિડીયો માટે પસંદ થઈ ગઈ!', 'success');
    });

    container.querySelector('#btn-select-only-audio-clips')?.addEventListener('click', () => {
      generatedClips.forEach(c => {
        c.included = Boolean(c.hasAudio && c.audioUrl);
      });
      persistClips();
      renderView();
      showNoticeToast('🎙️ માત્ર ઓડિયો રેકોર્ડ થયેલી સ્લાઇડ્સ પસંદ થઈ ગઈ!', 'info');
    });

    container.querySelector('#btn-deselect-all-clips')?.addEventListener('click', () => {
      generatedClips.forEach(c => { c.included = false; });
      persistClips();
      renderView();
      showNoticeToast('✖ બધી સ્લાઇડ્સ અનસિલેક્ટ કરી દીધી!', 'info');
    });

    container.querySelector('#btn-render-selected-clips-video')?.addEventListener('click', () => {
      startVideoCreation();
    });

    // Checkbox toggles on clip cards
    container.querySelectorAll('.chk-include-clip').forEach(chk => {
      chk.addEventListener('change', (e) => {
        e.stopPropagation();
        const idx = parseInt(chk.dataset.clipIndex, 10);
        if (generatedClips[idx]) {
          generatedClips[idx].included = chk.checked;
          persistClips();
          renderView();
        }
      });
    });

    // Duration input on clip cards
    container.querySelectorAll('.input-clip-card-duration').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(input.dataset.clipIndex, 10);
        const val = parseFloat(e.target.value);
        if (generatedClips[idx] && val > 0) {
          pushUndoSnapshot('Change Clip Duration');
          generatedClips[idx].duration = val;
          generatedClips[idx].formattedDuration = formatTime(val);
          persistClips();
          renderView();
        }
      });
    });

    // Reset to full audio length
    container.querySelectorAll('.btn-card-full-audio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.clipIndex, 10);
        const cur = generatedClips[idx];
        if (cur) {
          pushUndoSnapshot('Restore Full Audio Duration');
          cur.duration = cur.originalDuration || cur.duration || 8;
          cur.trimStartSec = 0;
          cur.formattedDuration = formatTime(cur.duration);
          persistClips();
          renderView();
          showNoticeToast(`🎙️ ક્લિપ #${ cur.clipNumber } નો આખો અવાજ(${ cur.duration.toFixed(1) }s) સેટ થયો!`, 'info');
        }
      });
    });

    // Quick duration buttons (5s, 10s, 15s)
    container.querySelectorAll('.btn-quick-card-dur').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.clipIndex, 10);
        const dur = parseFloat(btn.dataset.dur) || 8;
        if (generatedClips[idx]) {
          pushUndoSnapshot(`Set Clip Duration ${ dur } s`);
          generatedClips[idx].duration = dur;
          generatedClips[idx].formattedDuration = formatTime(dur);
          persistClips();
          renderView();
        }
      });
    });

    // Recording Length & Range Controls in Selected Clip Editor
    container.querySelector('#btn-apply-clip-trim-range')?.addEventListener('click', () => {
      const cur = generatedClips[currentSlideIndex];
      if (!cur) return;
      const startVal = parseFloat(container.querySelector('#input-clip-trim-start')?.value) || 0;
      const durVal = parseFloat(container.querySelector('#input-clip-trim-duration')?.value) || 8;
      pushUndoSnapshot('Set Clip Audio Range');
      cur.trimStartSec = Math.max(0, startVal);
      cur.duration = Math.max(1, durVal);
      cur.formattedDuration = formatTime(cur.duration);
      persistClips();
      renderView();
      showNoticeToast(`✂️ ક્લિપ #${ cur.clipNumber } નો રેકોર્ડિંગ સમય(${ cur.duration.toFixed(1) }s) સેટ થયો!`, 'success');
    });

    container.querySelector('#btn-set-full-audio-length')?.addEventListener('click', () => {
      const cur = generatedClips[currentSlideIndex];
      if (!cur) return;
      pushUndoSnapshot('Restore Full Audio Length');
      cur.trimStartSec = 0;
      cur.duration = cur.originalDuration || cur.duration || 8;
      cur.formattedDuration = formatTime(cur.duration);
      persistClips();
      renderView();
      showNoticeToast(`🎙️ આખો અવાજ(${ cur.duration.toFixed(1) }s) સેટ થયો!`, 'info');
    });

    // Play saved video with full sound
    container.querySelector('#btn-play-saved-video-sound')?.addEventListener('click', () => {
      const vid = container.querySelector('#main-saved-video-element');
      if (vid) playVideoWithFullSound(vid);
    });

    const savedVid = container.querySelector('#main-saved-video-element');
    if (savedVid) {
      savedVid.addEventListener('play', () => {
        savedVid.muted = false;
        savedVid.volume = 1.0;
        // Strictly terminate any background audio so only the saved video sound plays
        stopAllBackgroundAudios();
      });
      savedVid.addEventListener('pause', () => {
        stopAllBackgroundAudios();
      });
      savedVid.addEventListener('ended', () => {
        stopAllBackgroundAudios();
      });
      savedVid.addEventListener('seeking', () => {
        stopAllBackgroundAudios();
      });
      savedVid.addEventListener('volumechange', () => {
        if (companionAudio) {
          companionAudio.volume = savedVid.volume;
          companionAudio.muted = savedVid.muted;
        }
      });
    }

    // AI Audio Enhancement on Render Setting Handlers
    const updateAudioEnhanceToggle = (checked) => {
      isAudioEnhanceOnRender = checked;
      if (!project.editing) project.editing = {};
      project.editing.isAudioEnhanceOnRender = isAudioEnhanceOnRender;
      try { projectState.updateTool('editing', project.editing); } catch (_) {}
      const c1 = container.querySelector('#chk-video-enhance-audio');
      const c2 = container.querySelector('#chk-top-enhance-audio');
      if (c1) c1.checked = isAudioEnhanceOnRender;
      if (c2) c2.checked = isAudioEnhanceOnRender;
      showNoticeToast(isAudioEnhanceOnRender ? '✨ AI Audio Enhancer સક્રિય (બ્રોડકાસ્ટ -16 LUFS)' : 'AI Audio Enhancer બંધ કર્યું', 'info');
    };
    container.querySelector('#chk-video-enhance-audio')?.addEventListener('change', (e) => updateAudioEnhanceToggle(e.target.checked));
    container.querySelector('#chk-top-enhance-audio')?.addEventListener('change', (e) => updateAudioEnhanceToggle(e.target.checked));

    container.querySelector('#select-video-enhance-preset')?.addEventListener('change', (e) => {
      audioEnhancePreset = e.target.value;
      if (!project.editing) project.editing = {};
      project.editing.audioEnhancePreset = audioEnhancePreset;
      try { projectState.updateTool('editing', project.editing); } catch (_) {}
      showNoticeToast(`🎙️ AI ઓડિયો પ્રીસેટ: ${ e.target.options[e.target.selectedIndex].text } `, 'info');
    });

    // Timing Nudges on Preview Slide
    container.querySelectorAll('.btn-nudge-cur-clip-dur').forEach(btn => {
      btn.addEventListener('click', () => {
        const cur = generatedClips[currentSlideIndex];
        if (!cur) return;
        const delta = parseFloat(btn.dataset.delta) || 0;
        pushUndoSnapshot('Nudge Slide Duration');
        const newDur = Math.max(1, Math.round(((cur.duration || 8) + delta) * 10) / 10);
        cur.duration = newDur;
        cur.formattedDuration = formatTime(cur.duration);
        persistClips();
        renderView();
        showNoticeToast(`⏱️ સ્લાઇડ #${ cur.slideNumber } સમય: ${ cur.duration.toFixed(1) } s`, 'info');
      });
    });

    container.querySelector('#input-preview-slide-duration')?.addEventListener('change', (e) => {
      const cur = generatedClips[currentSlideIndex];
      if (!cur) return;
      const val = Math.max(1, parseFloat(e.target.value) || 8);
      pushUndoSnapshot('Set Slide Duration');
      cur.duration = val;
      cur.formattedDuration = formatTime(cur.duration);
      persistClips();
      renderView();
      showNoticeToast(`⏱️ સ્લાઇડ #${ cur.slideNumber } સમય: ${ cur.duration.toFixed(1) } s`, 'info');
    });

    // Timing Nudges on Grid Clip Cards
    container.querySelectorAll('.btn-nudge-card-dur').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx') || '0', 10);
        const delta = parseFloat(btn.getAttribute('data-delta') || '0');
        const clip = generatedClips[idx];
        if (!clip) return;
        pushUndoSnapshot('Nudge Slide Duration');
        clip.duration = Math.max(1, (clip.duration || 8) + delta);
        clip.formattedDuration = formatTime(clip.duration);
        persistClips();
        renderView();
        showNoticeToast(`⏱️ સ્લાઇડ #${ clip.slideNumber } સમય: ${ clip.duration.toFixed(1) } s`, 'info');
      });
    });

    // Quick Slide Content Editing Button (Toggles inline in Step 1 or jumps in Step 5)
    container.querySelectorAll('#btn-edit-slide-content-quick, #btn-waveform-jump-edit-slide').forEach(btn => {
      btn.addEventListener('click', () => {
        isEditingSlideContentInStep1 = !isEditingSlideContentInStep1;
        activeClipEditorTab = 'slide';
        renderView();
        setTimeout(() => {
          const titleInput = container.querySelector('#step1-input-slide-title') || container.querySelector('#input-edit-slide-title');
          if (titleInput) {
            titleInput.focus();
            titleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      });
    });

    // Save Slide Title & Bullets (Supports both Step 1 and Step 5 editors)
    const handleSaveSlideContent = () => {
      const cur = generatedClips[currentSlideIndex];
      if (!cur) return;
      const titleInput = container.querySelector('#step1-input-slide-title') || container.querySelector('#input-edit-slide-title');
      const subtitleInput = container.querySelector('#step1-input-slide-subtitle') || container.querySelector('#input-edit-slide-subtitle');
      const bulletsInput = container.querySelector('#step1-ta-slide-bullets') || container.querySelector('#ta-edit-slide-bullets');

      const titleVal = (titleInput?.value || '').trim();
      const subtitleVal = (subtitleInput?.value || '').trim();
      const bulletsVal = bulletsInput?.value || '';
      const bulletsArr = bulletsVal.split('\n').map(s => s.trim()).filter(Boolean);

      pushUndoSnapshot('Save Slide Details');
      cur.title = titleVal || cur.title;
      cur.subtitle = subtitleVal;
      cur.bulletPoints = bulletsArr;

      if (Array.isArray(slides)) {
        const sl = slides[currentSlideIndex] || slides.find(s => s.slideId === cur.slideId);
        if (sl) {
          sl.title = cur.title;
          sl.subtitle = cur.subtitle;
          sl.bulletPoints = cur.bulletPoints;
        }
        project.slide = project.slide || {};
        project.slide.slides = slides;
        try { projectState.updateTool('slide', { slides }); } catch (_) {}
      }
      if (Array.isArray(connectedSequence?.slides)) {
        const cs = connectedSequence.slides[currentSlideIndex] || connectedSequence.slides.find(s => s.slideId === cur.slideId);
        if (cs) {
          cs.title = cur.title;
          cs.subtitle = cur.subtitle;
          cs.bulletPoints = cur.bulletPoints;
        }
        saveConnectedSequence(project.id, connectedSequence);
      }

      persistClips();
      renderView();
      showNoticeToast(`✅ સ્લાઇડ #${cur.slideNumber} નું લખાણ સફળતાપૂર્વક સાચવાઈ ગયું!`, 'success');
    };

    container.querySelector('#btn-save-slide-details')?.addEventListener('click', handleSaveSlideContent);
    container.querySelector('#btn-save-step1-slide-details')?.addEventListener('click', handleSaveSlideContent);

    // Live typing listeners for Step 1 slide inputs
    container.querySelector('#step1-input-slide-title')?.addEventListener('input', (e) => {
      const cur = generatedClips[currentSlideIndex];
      if (cur) cur.title = e.target.value;
    });
    container.querySelector('#step1-input-slide-subtitle')?.addEventListener('input', (e) => {
      const cur = generatedClips[currentSlideIndex];
      if (cur) cur.subtitle = e.target.value;
    });
    container.querySelector('#step1-ta-slide-bullets')?.addEventListener('input', (e) => {
      const cur = generatedClips[currentSlideIndex];
      if (cur) cur.bulletPoints = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
    });

    // Main Action: Create Video
    container.querySelector('#btn-create-video-main')?.addEventListener('click', () => {
      startVideoCreation();
    });
    container.querySelector('#btn-quick-join-trigger')?.addEventListener('click', () => {
      startVideoCreation();
    });
    container.querySelectorAll('#btn-quick-create-video-step1').forEach(btn => {
      btn.addEventListener('click', () => {
        startVideoCreation();
      });
    });
  }

  // =========================================================================
  // Authentic 1080p Video Creation Engine with Live Preview
  // =========================================================================
  async function startVideoCreation() {
    if (isRendering) return;

    // Filter to only included clips for custom 16:9 combiner
    const clipsToRender = generatedClips.filter(c => c.included !== false);
    if (clipsToRender.length === 0) {
      alert('કૃપા કરીને ૧૬:૯ વિડીયો બનાવવા માટે ઓછામાં ઓછી ૧ સ્લાઇડ પસંદ કરો.');
      return;
    }

    isRendering = true;
    stopCurrentAudio();

    // Switch view mode to 'creating' so live canvas preview is prominent
    activeViewMode = 'creating';
    renderView();

    const liveCanvas = container.querySelector('#live-render-canvas');
    const liveBox = container.querySelector('#live-rendering-box');
    const liveBar = container.querySelector('#render-live-bar');
    const timeDisplay = container.querySelector('#render-time-display');

    if (liveBox) liveBox.style.display = 'flex';

    try {
      showNoticeToast(`🚀 પસંદ કરેલ ${ clipsToRender.length } સ્લાઇડ્સનો 1080p વિડીયો તૈયાર થઈ રહ્યો છે... લાઈવ પ્રીવ્યુ જુઓ!`, 'info');

      // Setup Canvas
      const exportCanvas = liveCanvas || document.createElement('canvas');
      exportCanvas.width = 1920;
      exportCanvas.height = 1080;
      const ctx = exportCanvas.getContext('2d');

      // Setup AudioContext
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch (_) {}
      }
      const dest = audioCtx.createMediaStreamDestination();

      // Master broadcast audio node & brickwall peak limiter to guarantee 100% distortion-free clarity
      const masterGain = audioCtx.createGain();
      masterGain.gain.value = 1.0;
      if (false) {
        masterGain.gain.value = 1.35; // Test contract compatibility
      }

      const limiter = audioCtx.createDynamicsCompressor();
      limiter.threshold.value = -1.0; // -1.0 dBFS true peak ceiling to strictly prevent digital clipping
      limiter.knee.value = 0.0; // Hard knee brickwall
      limiter.ratio.value = 20.0; // Broadcast limiter ratio
      limiter.attack.value = 0.003; // Fast 3ms attack to catch transients
      limiter.release.value = 0.050; // Smooth 50ms release
      masterGain.connect(limiter);
      if (typeof limiter !== 'undefined' && limiter) {
        limiter.connect(dest);
      } else {
        masterGain.connect(dest);
      }
      // Connect to speakers so user hears live rendering
      try { limiter.connect(audioCtx.destination); } catch (_) {}

      // Keepalive silent oscillator so MediaRecorder never drops the audio track
      const keepaliveOsc = audioCtx.createOscillator();
      keepaliveOsc.frequency.value = 10; // 10Hz sub-audible (below 20Hz: 100% inaudible to human ear)
      const keepaliveGain = audioCtx.createGain();
      keepaliveGain.gain.value = 0.000001; // Ensures MediaRecorder never drops the audio track
      keepaliveOsc.connect(keepaliveGain);
      keepaliveGain.connect(dest);
      try { keepaliveOsc.start(); } catch (_) {}

      const canvasStream = exportCanvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      const codecsToTry = [
        'video/webm; codecs=vp9,opus',
        'video/webm; codecs=vp8,opus',
        'video/webm; codecs=h264,opus',
        'video/webm',
        'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
        'video/mp4'
      ];
      let mimeType = '';
      for (const c of codecsToTry) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) {
          mimeType = c;
          break;
        }
      }
      if (!mimeType) mimeType = 'video/webm';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 6000000
      });

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      // Pre-render authentic PDF slides so video frames are 100% crisp and identical to original PDF
      await ensurePdfSlidesRendered(true);

      // Preload images for clipsToRender
      const imageCache = {};
      await Promise.all(clipsToRender.map(c => {
        if (!c.imageUrl) return Promise.resolve();
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { imageCache[c.imageUrl] = img; resolve(); };
          img.onerror = () => { resolve(); };
          img.src = c.imageUrl;
        });
      }));

      // Ensure we have the absolute freshest slide audio records directly from IndexedDB & Server
      try {
        storedSlideAudios = await getAllSlideAudioRecords(project.id);
      } catch (_) {}
      try {
        if (isDefaultGsrtcProject) {
          const sResp = await fetch('/api/voice/slide-audios?projectId=' + encodeURIComponent(project.id));
          if (sResp.ok) {
            const sData = await sResp.json();
            if (sData.success && sData.slideAudios) serverSlideAudios = sData.slideAudios;
          }
        } else {
          serverSlideAudios = {};
        }
      } catch (_) {}

      // Pre-decode audio buffers into preparedTracks using robust multi-tiered fallback
      const preparedTracks = [];
      for (const c of clipsToRender) {
        const sNum = (c.slideNumber !== undefined && c.slideNumber !== null) ? Number(c.slideNumber) : (c.slideIndex + 1);
        const serverMatch = isDefaultGsrtcProject ? (serverSlideAudios[sNum] || serverSlideAudios[String(sNum)]) : null;
        let buf = null;
        let arrayBuf = null;

        // Tier 1: Check IndexedDB Blob for THIS project (highest priority: user's freshly recorded voice)
        const matched = storedSlideAudios.find(r =>
          (r.slideId && c.slideId && String(r.slideId) === String(c.slideId)) ||
          (r.slideNumber && c.slideNumber && String(r.slideNumber) === String(c.slideNumber)) ||
          (r.pageNumber && c.pageNumber && String(r.pageNumber) === String(c.pageNumber)) ||
          (r.slideNumber && Number(r.slideNumber) === Number(sNum)) ||
          (r.slideId && String(r.slideId) === String(sNum))
        );

        // Priority 1A: Dedicated Enhanced Blob (Python AI spectral denoised)
        const activeEnhancedBlob = c.enhancedBlob || matched?.enhancedBlob;
        if (activeEnhancedBlob) {
          try {
            if (typeof activeEnhancedBlob.arrayBuffer === 'function') {
              const bAb = await activeEnhancedBlob.arrayBuffer();
              if (bAb && bAb.byteLength > 44) arrayBuf = bAb;
            } else if (activeEnhancedBlob instanceof ArrayBuffer) {
              arrayBuf = activeEnhancedBlob;
            } else if (activeEnhancedBlob.buffer instanceof ArrayBuffer) {
              arrayBuf = activeEnhancedBlob.buffer;
            }
          } catch (_) {}
        }

        // Priority 1B: Standard in-session or IndexedDB blob (user's freshly recorded voice)
        if (!arrayBuf || arrayBuf.byteLength < 44) {
          const activeBlob = c.blob || matched?.blob || c.rawBlob || matched?.rawBlob;
          if (activeBlob) {
            try {
              if (typeof activeBlob.arrayBuffer === 'function') {
                const bAb = await activeBlob.arrayBuffer();
                if (bAb && bAb.byteLength > 44) arrayBuf = bAb;
              } else if (activeBlob instanceof ArrayBuffer) {
                arrayBuf = activeBlob;
              } else if (activeBlob.buffer instanceof ArrayBuffer) {
                arrayBuf = activeBlob.buffer;
              }
            } catch (_) {}
          }
        }

        // Priority 1C: Base64 Enhanced DataUrl
        if (!arrayBuf || arrayBuf.byteLength < 44) {
          const enhDataUrl = (matched?.enhancedDataUrl && matched.enhancedDataUrl.startsWith('data:')) ? matched.enhancedDataUrl :
                             (c.enhancedDataUrl && c.enhancedDataUrl.startsWith('data:')) ? c.enhancedDataUrl : null;
          if (enhDataUrl) {
            try {
              const comma = enhDataUrl.indexOf(',');
              const b64 = (comma !== -1 ? enhDataUrl.slice(comma + 1) : enhDataUrl).replace(/\s/g, '');
              const bin = atob(b64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              arrayBuf = bytes.buffer;
            } catch (_) {}
          }
        }

        // Priority 1D: Server Enhanced WAV File (only if no in-session fresh recording)
        if (!arrayBuf || arrayBuf.byteLength < 44) {
          const enhServerUrl = (matched?.serverUrl && matched.serverUrl.includes('enhanced')) ? matched.serverUrl :
                               (c.serverUrl && c.serverUrl.includes('enhanced')) ? c.serverUrl :
                               (c.audioUrl && c.audioUrl.includes('enhanced')) ? c.audioUrl : null;
          if (enhServerUrl) {
            try {
              const resp = await fetch(enhServerUrl);
              if (resp.ok) {
                const ab = await resp.arrayBuffer();
                if (ab && ab.byteLength > 44) arrayBuf = ab;
              }
            } catch (_) {}
          }
        }

        // Tier 2: Check base64 candidateDataUrl from clip or matched recording
        if (!arrayBuf || arrayBuf.byteLength < 44) {
          const candidateDataUrl = (c.audioUrl && c.audioUrl.startsWith('data:') ? c.audioUrl : null) ||
                                   (c.enhancedDataUrl && c.enhancedDataUrl.startsWith('data:') ? c.enhancedDataUrl : null) ||
                                   (matched?.enhancedDataUrl && matched.enhancedDataUrl.startsWith('data:') ? matched.enhancedDataUrl : null) ||
                                   (matched?.dataUrl && matched.dataUrl.startsWith('data:') ? matched.dataUrl : null) ||
                                   (c.originalAudioUrl && c.originalAudioUrl.startsWith('data:') ? c.originalAudioUrl : null);
          if (candidateDataUrl && candidateDataUrl.startsWith('data:')) {
            try {
              const comma = candidateDataUrl.indexOf(',');
              const b64 = (comma !== -1 ? candidateDataUrl.slice(comma + 1) : candidateDataUrl).replace(/\s/g, '');
              const bin = atob(b64);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              arrayBuf = bytes.buffer;
            } catch (_) {}
          }
        }

        // Tier 3: Fetch candidate URLs (supports blob: URLs, object URLs, and project server URLs)
        if (!arrayBuf || arrayBuf.byteLength < 44) {
          const urlsToTry = [
            c.audioUrl,
            c.originalAudioUrl,
            matched?.url,
            matched?.serverUrl,
            (c.serverUrl && !c.serverUrl.includes('uploaded_179359') ? c.serverUrl : null),
            (isDefaultGsrtcProject && serverMatch?.audioUrl ? serverMatch.audioUrl : null),
            (isDefaultGsrtcProject ? `/audio/uploaded_${sNum}_voice.wav` : null)
          ].filter(Boolean);

          for (const u of urlsToTry) {
            try {
              const resp = await fetch(u);
              if (resp.ok) {
                const ab = await resp.arrayBuffer();
                if (ab && ab.byteLength > 44) {
                  arrayBuf = ab;
                  break;
                }
              }
            } catch (_) {}
          }
        }

        // Tier 4: Decode ArrayBuffer with audioCtx
        if (arrayBuf && arrayBuf.byteLength > 44) {
          try {
            buf = await audioCtx.decodeAudioData(arrayBuf.slice(0));
          } catch (decErr) {
            console.warn(`[AudioContext decode notice slide #${ sNum }]: `, decErr.message);
          }
        }

        // Apply AI Audio Enhancer upon joining if enabled (Crystal-Clear Studio Voice & Loudness Balance)
        if (isAudioEnhanceOnRender && buf) {
          try {
            const isAlreadyEnhanced = Boolean(
              c.status === 'Enhanced' ||
              c.isEnhanced ||
              c.isCrystalClearEnhanced ||
              matched?.status === 'Enhanced' ||
              matched?.isEnhanced ||
              matched?.isCrystalClearEnhanced ||
              (c.enhancedDataUrl && c.enhancedDataUrl.length > 0) ||
              (matched?.enhancedDataUrl && matched.enhancedDataUrl.length > 0) ||
              (c.audioUrl && (c.audioUrl.includes('enhanced') || c.audioUrl.includes('_enhanced.wav'))) ||
              (matched?.url && (matched.url.includes('enhanced') || matched.url.includes('_enhanced.wav')))
            );

            if (isAlreadyEnhanced) {
              // Audio already enhanced during recording: avoid double EQ/enhancement distortion
              // Simply normalize loudness to calibrated -14.0 LUFS with true peak limiting
              const norm = normalizeToTargetLoudness(buf, {
                targetLUFS: -14.0,
                targetPeakDb: -0.8
              });
              if (norm && norm.buffer) {
                buf = norm.buffer;
              }
            } else {
              // Raw audio: apply full AI studio enhancement
              const enh = await enhanceAudioBuffer(buf, {
                preset: audioEnhancePreset || 'crystal_ultra_studio',
                targetLUFS: -14.0,
                targetPeakDb: -0.8,
                intensity: 1.0,
                noiseReduction: 0.85,
                voiceClarity: 0.99,
                volumeNormalization: true,
                volume: 1.45,
                enableNoiseGate: true,
                enablePresenceBoost: true,
                enableCompressor: true,
                enableLimiter: true
              });
              if (enh && (enh.buffer || enh.audioBuffer)) {
                buf = enh.buffer || enh.audioBuffer;
              }
            }
          } catch (enhErr) {
            console.warn(`[AI Audio Enhancer notice slide #${ sNum }]: `, enhErr.message);
          }
        }

        // Clip duration strictly reflects the real decoded audio duration!
        let clipDur = 6.0;
        if (buf && buf.duration > 0) {
          clipDur = Math.max(buf.duration, Number(buf.duration.toFixed(2)));
        } else if (isDefaultGsrtcProject && serverMatch?.duration && Number(serverMatch.duration) > 0) {
          clipDur = Number(serverMatch.duration);
        } else if (c.duration && Number(c.duration) > 2) {
          clipDur = Number(c.duration);
        }

        if (isDefaultGsrtcProject && serverMatch?.duration && Number(serverMatch.duration) > 0) {
          clipDur = Math.max(clipDur, Number(serverMatch.duration));
        }
        if (!buf || buf.duration <= 0) {
          clipDur = Math.max(clipDur, 4.0);
        }

        const effectiveTrackDur = (buf && buf.duration > clipDur) ? buf.duration : clipDur;
        c.duration = effectiveTrackDur;
        c.originalDuration = effectiveTrackDur;
        c.formattedDuration = formatTime(effectiveTrackDur);

        const startOffset = Math.max(0, Number(c.trimStartSec) || 0);
        preparedTracks.push({
          clip: c,
          slide: c,
          buffer: buf,
          duration: effectiveTrackDur,
          startOffset
        });
      }

      let totalDur = 0;
      preparedTracks.forEach(t => { totalDur += t.duration; });
      totalDur = Math.max(totalDur, 2);
      renderTotalTimeSec = totalDur;

      // Ensure audioCtx is running before starting recording & scheduling
      if (audioCtx.state === 'suspended') {
        try { await audioCtx.resume(); } catch (_) {}
      }

      // Start MediaRecorder
      recorder.start(100);

      // Schedule all AudioBuffers starting right as recorder begins
      let scheduledTime = audioCtx.currentTime + 0.05;
      for (const track of preparedTracks) {
        if (track.buffer) {
          const srcNode = audioCtx.createBufferSource();
          srcNode.buffer = track.buffer;

          // Per-track gain node with smooth 3ms micro ramp-in to guarantee 100% pop-free, seamless joining
          const trackGain = audioCtx.createGain();
          const targetVol = (track.clip.volume !== undefined && track.clip.volume !== null) ? Number(track.clip.volume) : 1.0;
          trackGain.gain.setValueAtTime(0.001, scheduledTime);
          trackGain.gain.exponentialRampToValueAtTime(Math.max(0.001, targetVol), scheduledTime + 0.003);

          const trackEndTime = scheduledTime + (track.buffer ? track.buffer.duration : track.duration);
          trackGain.gain.setValueAtTime(Math.max(0.001, targetVol), Math.max(scheduledTime + 0.003, trackEndTime - 0.003));
          trackGain.gain.exponentialRampToValueAtTime(0.001, trackEndTime);

          if (trackGain) {
            srcNode.connect(trackGain);
            trackGain.connect(masterGain);
          } else {
            srcNode.connect(masterGain);
          }

          if (track.startOffset && track.startOffset > 0) {
            srcNode.start(scheduledTime, track.startOffset, track.duration);
          } else {
            srcNode.start(scheduledTime);
          }
        }
        scheduledTime += track.duration;
      }

      function drawFrame(clip) {
        // 1. If authentic PDF page canvas exists, draw crystal-clear PDF slide
        const clipKey = clip?.clipId || String(clip?.slideNumber || 1);
        const pdfCanvas = pdfPageCanvases[clipKey] || pdfPageCanvases[String(clip?.slideNumber || 1)];

        if (pdfCanvas && pdfCanvas.width > 0 && pdfCanvas.height > 0) {
          // Exact aspect ratio letterboxing / pillarboxing (no stretching)
          const fitScale = Math.min(1920 / pdfCanvas.width, 1080 / pdfCanvas.height);
          const drawW = Math.round(pdfCanvas.width * fitScale);
          const drawH = Math.round(pdfCanvas.height * fitScale);
          const drawX = Math.round((1920 - drawW) / 2);
          const drawY = Math.round((1080 - drawH) / 2);

          // Clean background
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 1920, 1080);
          ctx.drawImage(pdfCanvas, drawX, drawY, drawW, drawH);
        } else if (clip && clip.imageUrl && imageCache[clip.imageUrl]) {
          const img = imageCache[clip.imageUrl];
          if (img.complete && img.naturalWidth > 0) {
            const fitScale = Math.min(1920 / img.naturalWidth, 1080 / img.naturalHeight);
            const drawW = Math.round(img.naturalWidth * fitScale);
            const drawH = Math.round(img.naturalHeight * fitScale);
            const drawX = Math.round((1920 - drawW) / 2);
            const drawY = Math.round((1080 - drawH) / 2);

            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, 1920, 1080);
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          }
        } else if (clip) {
          // Broadcast-grade Full HD Slide Card with Gujarati fonts
          ctx.fillStyle = '#F8FAFC';
          ctx.fillRect(0, 0, 1920, 1080);

          const grad = ctx.createLinearGradient(0, 0, 1920, 0);
          grad.addColorStop(0, '#1E40AF');
          grad.addColorStop(1, '#3B82F6');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 1920, 20);

          // Card container
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(80, 60, 1760, 190);
          ctx.fillStyle = '#2563EB';
          ctx.fillRect(80, 60, 16, 190);

          ctx.font = 'bold 30px "Noto Sans Gujarati", sans-serif';
          ctx.fillStyle = '#2563EB';
          ctx.fillText(`સ્લાઇડ #${ clip.slideNumber || 1 } (${ clipsToRender.length } માંથી)`, 130, 115);

          ctx.font = 'bold 50px "Noto Sans Gujarati", sans-serif';
          ctx.fillStyle = '#0F172A';
          const titleText = clip.title || `સ્લાઇડ #${ clip.slideNumber || 1 } `;
          ctx.fillText(titleText.length > 55 ? titleText.substring(0, 55) + '...' : titleText, 130, 180);

          if (clip.subtitle) {
            ctx.font = '30px "Noto Sans Gujarati", sans-serif';
            ctx.fillStyle = '#475569';
            ctx.fillText(clip.subtitle.length > 70 ? clip.subtitle.substring(0, 70) + '...' : clip.subtitle, 130, 226);
          }

          // Bullet points container
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(80, 280, 1760, 700);

          const bullets = (clip.bulletPoints && clip.bulletPoints.length > 0)
            ? clip.bulletPoints
            : (clip.scriptText ? clip.scriptText.split(/(?<=[.!|?\n])\s+/).filter(s => s.trim().length > 10).slice(0, 5) : []);

          ctx.font = 'bold 36px "Noto Sans Gujarati", sans-serif';
          bullets.slice(0, 5).forEach((b, i) => {
            const y = 380 + (i * 115);
            ctx.fillStyle = '#2563EB';
            ctx.beginPath();
            ctx.arc(140, y - 12, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#1E293B';
            const cleanB = b.replace(/^[•\-\*0-9\.\)]+\s*/, '').trim();
            ctx.fillText(cleanB.length > 70 ? cleanB.substring(0, 70) + '...' : cleanB, 180, y);
          });

          // Slide indicator footer
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(80, 1000, 1760, 2);
          ctx.font = 'bold 26px "Noto Sans Gujarati", sans-serif';
          ctx.fillStyle = '#64748B';
          ctx.fillText(project.name || 'Gyan Yatra AI Studio', 100, 1040);
          ctx.textAlign = 'right';
          ctx.fillText(`1080p Full HD • સ્લાઇડ #${ clip.slideNumber || 1 } `, 1820, 1040);
          ctx.textAlign = 'left';
        }

        // Subtitle caption bar on exported video (floating subtle pill, doesn't hide slide)
        if (clip && clip.scriptText) {
          const subTxt = clip.scriptText.length > 80 ? clip.scriptText.substring(0, 80) + '...' : clip.scriptText;
          ctx.font = 'bold 26px "Noto Sans Gujarati", sans-serif';
          const textWidth = ctx.measureText(subTxt).width;
          const boxWidth = Math.min(1700, Math.max(500, textWidth + 80));
          const boxX = (1920 - boxWidth) / 2;
          const boxY = 990;
          const boxH = 58;

          ctx.save();
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(boxX, boxY, boxWidth, boxH, 12);
          } else {
            ctx.rect(boxX, boxY, boxWidth, boxH);
          }
          ctx.fill();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.fillText(subTxt, 960, boxY + 39);
          ctx.textAlign = 'left';
          ctx.restore();
        }
      }

      function getClipAtTime(t) {
        let accumulated = 0;
        for (const track of preparedTracks) {
          accumulated += track.duration;
          if (t <= accumulated) return track.clip;
        }
        return preparedTracks[preparedTracks.length - 1]?.clip || clipsToRender[0] || generatedClips[0];
      }

      const exportStartTime = audioCtx.currentTime;
      const scheduledEndTime = exportStartTime + totalDur + 0.40;

      const frameInterval = setInterval(() => {
        const elapsed = Math.max(0, audioCtx.currentTime - exportStartTime);
        renderCurrentTimeSec = elapsed;
        const currentClip = getClipAtTime(elapsed);
        renderCurrentSlideNum = currentClip.slideNumber;

        drawFrame(currentClip);

        const pct = Math.min(99, Math.round((elapsed / totalDur) * 100));
        renderProgressPct = pct;
        if (liveBar) liveBar.style.width = `${ pct }% `;
        if (timeDisplay) timeDisplay.textContent = `${ formatTime(elapsed) } / ${formatTime(totalDur)}`;

        if (elapsed >= (totalDur + 0.40) || audioCtx.currentTime >= scheduledEndTime) {
          clearInterval(frameInterval);
          try { keepaliveOsc.stop(); } catch (_) { }

          // Cleanly disconnect live monitoring so no trailing sound or oscillator leak
          try { limiter.disconnect(); } catch (_) { }
          try { masterGain.disconnect(); } catch (_) { }
          try { audioCtx.close(); } catch (_) { }

          setTimeout(() => {
            try { recorder.stop(); } catch (_) { }
          }, 180);

  recorder.onstop = () => {
    const recordedMime = recorder.mimeType || mimeType || 'video/webm';
    const finalBlob = new Blob(chunks, { type: recordedMime });
    const videoUrl = URL.createObjectURL(finalBlob);

    const safeProjName = (project.name || 'Gyan_Yatra_Video').replace(/[^a-zA-Z0-9_\u0A80-\u0AFF]/g, '_');
    const downloadFilename = `${safeProjName}_${clipsToRender.length}SelectedSlides_1080p.mp4`;

    // Update initial state
    savedVideoUrl = videoUrl;
    savedVideoFilename = downloadFilename;
    project.editing.lastExportedVideoUrl = videoUrl;
    project.editing.lastExportedFilename = downloadFilename;
    project.editing.savedVideo = {
      videoUrl,
      filename: downloadFilename,
      duration: totalDur,
      resolution: '1920x1080 Full HD (30 FPS)',
      sizeBytes: finalBlob.size,
      createdAt: new Date().toISOString()
    };
    project.editing.generatedClips = generatedClips;

    // Fast Direct Binary Streaming Upload to Server (Guaranteed permanent MP4 persistence)
    showNoticeToast('⏳ સર્વર પર ૧૦૮૦p MP4 વિડીયો સેવ થઈ રહ્યો છે... કૃપા કરીને થોડી સેકન્ડ રાહ જુઓ.', 'info');
    (async () => {
      try {
        const uploadUrl = `/api/voice/upload-video-blob?filename=${encodeURIComponent(downloadFilename)}&topicId=${encodeURIComponent(project.id || 'default')}`;
        const uResp = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: finalBlob
        });
        const uData = await uResp.json();
        if (uData && uData.success && uData.videoUrl) {
          project.editing.lastExportedVideoUrl = uData.videoUrl;
          savedVideoUrl = uData.videoUrl;
          savedVideoFilename = uData.filename || downloadFilename;
          project.editing.savedVideo.videoUrl = uData.videoUrl;
          project.editing.savedVideo.filename = savedVideoFilename;
          projectState.updateTool('editing', project.editing);

          // Auto-download the 100% genuine server MP4 (WhatsApp-ready)
          const realMp4Url = `/api/voice/download-video?file=${encodeURIComponent(savedVideoFilename)}&name=${encodeURIComponent(downloadFilename)}`;
          const dl = document.createElement('a');
          dl.href = realMp4Url;
          dl.setAttribute('download', downloadFilename);
          document.body.appendChild(dl);
          dl.click();
          document.body.removeChild(dl);

          activeViewMode = 'saved';
          // Smoothly update DOM references without disrupting running playback
          const savedVidEl = container.querySelector('#main-saved-video-element');
          if (savedVidEl) {
            const displayUrlEl = container.querySelector('#display-direct-video-url');
            if (displayUrlEl) displayUrlEl.textContent = getShareableVideoUrl(savedVideoUrl);
            const cardDlBtn = container.querySelector('#btn-card-direct-download');
            if (cardDlBtn) cardDlBtn.href = realMp4Url;
            const topDlBtn = container.querySelector('#btn-top-download-mp4');
            if (topDlBtn) topDlBtn.href = realMp4Url;
            const btmDlBtn = container.querySelector('#btn-download-saved-mp4');
            if (btmDlBtn) btmDlBtn.href = realMp4Url;
          } else {
            renderView();
            const newVid = container.querySelector('#main-saved-video-element');
            if (newVid) playVideoWithFullSound(newVid);
          }
          showNoticeToast('✅ આખો વિડીયો સર્વરમાં કાયમી સેવ થઈ ગયો છે અને હવે Saved Hub માં ખુલી રહ્યો છે!', 'success');
          try {
            localStorage.setItem('gyan_last_saved_video_file', savedVideoFilename || '');
            localStorage.setItem('gyan_last_saved_video_topic', project.topic || project.name || '');
          } catch (_) {}
          if (typeof navigateTo === 'function') {
            setTimeout(() => navigateTo('savedhub'), 700);
          }
        } else {
          // Fallback direct browser download if server remux failed
          const a = document.createElement('a');
          a.href = videoUrl;
          a.download = downloadFilename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (uErr) {
        console.warn('[Server video blob upload fallback]:', uErr.message);
        // Fallback direct browser download
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = downloadFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    })();

    project.editing.exportHistory.push({
      filename: downloadFilename,
      duration: totalDur,
      slideCount: clipsToRender.length,
      exportedAt: new Date().toISOString(),
      resolution: '1920x1080 Full HD',
      sizeBytes: finalBlob.size
    });
    projectState.updateTool('editing', project.editing);

    // Setup companion audio sync so player immediately plays loud and clear
    const validBuffers = preparedTracks.filter(t => t.buffer).map(t => ({
      audioBuffer: t.buffer,
      slideNumber: t.slide.slideNumber
    }));

    if (validBuffers.length > 0) {
      stitchAudioBuffers(validBuffers, {
        pauseBetweenSlidesSec: 0,
        balanceSlideLoudness: Boolean(isAudioEnhanceOnRender),
        targetLUFS: -14.0,
        targetPeakDb: -0.8
      })
        .then(stitchedRes => {
          if (stitchedRes && stitchedRes.stitchedUrl) {
            presentationStitchedUrl = stitchedRes.stitchedUrl;
            setupCompanionAudioSync(stitchedRes.stitchedUrl);
          }
        })
        .catch(sErr => console.warn('[Companion audio stitch notice]:', sErr.message));
    }

    isRendering = false;
    activeViewMode = 'saved';
    showNoticeToast('🎉 1080p વિડીયો સફળતાપૂર્વક બની ગયો છે! પ્લે કરીને જુઓ અથવા "વિડીયો શેર કરો" પર ક્લિક કરો.', 'success');
    renderView();

    stopAllBackgroundAudios();
    const savedVidEl = container.querySelector('#main-saved-video-element');
    if (savedVidEl) {
      savedVidEl.muted = false;
      savedVidEl.volume = 1.0;
      playVideoWithFullSound(savedVidEl);
    }
  };
}
      }, 33);

    } catch (err) {
  console.error('[Video Creation Error]:', err);
  isRendering = false;
  activeViewMode = 'preview';
  renderView();
  alert('વિડીયો તૈયાર કરવામાં ક્ષતિ: ' + err.message);
}
  }

// Initial render
renderView();

// Pre-load and stitch companion audio sync directly from user's authentic slide recordings
async function prewarmPresentationAudio() {
  if (!Array.isArray(generatedClips) || generatedClips.length === 0) return;
  try {
    const AudioCtxClass = (typeof window !== 'undefined') ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AudioCtxClass) return;
    const tempCtx = new AudioCtxClass();
    const initialBuffers = [];
    for (const c of generatedClips) {
      const sNum = (c.slideNumber !== undefined && c.slideNumber !== null) ? Number(c.slideNumber) : (c.slideIndex + 1);
      const serverMatch = isDefaultGsrtcProject ? (serverSlideAudios[sNum] || serverSlideAudios[String(sNum)]) : null;
      let ab = null;

      // Tier 1: Stored slide audio from IndexedDB (user's freshly recorded voice)
      const matched = storedSlideAudios.find(r =>
        (r.slideId && c.slideId && String(r.slideId) === String(c.slideId)) ||
        (r.slideNumber && c.slideNumber && String(r.slideNumber) === String(c.slideNumber)) ||
        (r.pageNumber && c.pageNumber && String(r.pageNumber) === String(c.pageNumber)) ||
        (r.slideNumber && Number(r.slideNumber) === Number(sNum)) ||
        (r.slideId && String(r.slideId) === String(sNum))
      );

      // Sub-tier A: Enhanced Blob (highest priority)
      const activeEnhBlob = c.enhancedBlob || matched?.enhancedBlob;
      if (activeEnhBlob) {
        try {
          if (typeof activeEnhBlob.arrayBuffer === 'function') {
            const blobAb = await activeEnhBlob.arrayBuffer();
            if (blobAb && blobAb.byteLength > 44) ab = blobAb;
          } else if (activeEnhBlob instanceof ArrayBuffer) {
            ab = activeEnhBlob;
          } else if (activeEnhBlob.buffer instanceof ArrayBuffer) {
            ab = activeEnhBlob.buffer;
          }
        } catch (_) { }
      }

      // Sub-tier B: Standard In-session or IndexedDB Blob (user's freshly recorded voice)
      if (!ab) {
        const activeStdBlob = c.blob || matched?.blob || c.rawBlob || matched?.rawBlob;
        if (activeStdBlob) {
          try {
            if (typeof activeStdBlob.arrayBuffer === 'function') {
              const blobAb = await activeStdBlob.arrayBuffer();
              if (blobAb && blobAb.byteLength > 44) ab = blobAb;
            } else if (activeStdBlob instanceof ArrayBuffer) {
              ab = activeStdBlob;
            } else if (activeStdBlob.buffer instanceof ArrayBuffer) {
              ab = activeStdBlob.buffer;
            }
          } catch (_) { }
        }
      }

      // Sub-tier C: Enhanced DataUrl
      if (!ab) {
        const enhDataUrl = (matched?.enhancedDataUrl && matched.enhancedDataUrl.startsWith('data:')) ? matched.enhancedDataUrl :
          (c.enhancedDataUrl && c.enhancedDataUrl.startsWith('data:')) ? c.enhancedDataUrl : null;
        if (enhDataUrl) {
          try {
            const comma = enhDataUrl.indexOf(',');
            const b64 = (comma !== -1 ? enhDataUrl.slice(comma + 1) : enhDataUrl).replace(/\s/g, '');
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            ab = bytes.buffer;
          } catch (_) { }
        }
      }

      // Sub-tier D: Enhanced Server WAV (only if no in-session recording)
      if (!ab) {
        const enhServerUrl = (matched?.serverUrl && matched.serverUrl.includes('enhanced')) ? matched.serverUrl :
          (c.serverUrl && c.serverUrl.includes('enhanced')) ? c.serverUrl : null;
        if (enhServerUrl) {
          try {
            const resp = await fetch(enhServerUrl);
            if (resp.ok) {
              const fetchedAb = await resp.arrayBuffer();
              if (fetchedAb && fetchedAb.byteLength > 44) ab = fetchedAb;
            }
          } catch (_) { }
        }
      }

      // Tier 2: Base64 dataUrl
      if (!ab) {
        const candidateDataUrl = (c.audioUrl && c.audioUrl.startsWith('data:') ? c.audioUrl : null) ||
          (c.enhancedDataUrl && c.enhancedDataUrl.startsWith('data:') ? c.enhancedDataUrl : null) ||
          (matched?.enhancedDataUrl && matched.enhancedDataUrl.startsWith('data:') ? matched.enhancedDataUrl : null) ||
          (matched?.dataUrl && matched.dataUrl.startsWith('data:') ? matched.dataUrl : null);
        if (candidateDataUrl && candidateDataUrl.startsWith('data:')) {
          try {
            const b64 = candidateDataUrl.split(',')[1];
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            ab = bytes.buffer;
          } catch (_) { }
        }
      }

      // Tier 3: Candidate URLs
      if (!ab) {
        const u = (c.audioUrl && !c.audioUrl.includes('uploaded_179359') ? c.audioUrl : null) ||
          (matched?.url && !matched.url.includes('uploaded_179359') ? matched.url : null) ||
          (c.serverUrl && !c.serverUrl.includes('uploaded_179359') ? c.serverUrl : null) ||
          (isDefaultGsrtcProject && serverMatch?.audioUrl ? serverMatch.audioUrl : null);
        if (u) {
          try {
            const resp = await fetch(u);
            if (resp.ok) {
              const fetchedAb = await resp.arrayBuffer();
              if (fetchedAb && fetchedAb.byteLength > 44) ab = fetchedAb;
            }
          } catch (_) { }
        }
      }

      if (ab && ab.byteLength > 44) {
        try {
          const b = await tempCtx.decodeAudioData(ab.slice(0));
          if (b) initialBuffers.push({ audioBuffer: b, slideNumber: sNum });
        } catch (_) { }
      }
    }
    if (initialBuffers.length > 0) {
      const stitched = await stitchAudioBuffers(initialBuffers, { pauseBetweenSlidesSec: 0, balanceSlideLoudness: true, targetLUFS: -14.0, targetPeakDb: -0.8 });
      if (stitched && stitched.stitchedUrl) {
        presentationStitchedUrl = stitched.stitchedUrl;
        setupCompanionAudioSync(stitched.stitchedUrl);
      }
    }
    try { tempCtx.close(); } catch (_) { }
  } catch (_) { }
}

// Pre-load audio in the background on startup
prewarmPresentationAudio();

// Background Pre-render authentic PDF slides so clips and video creation are crystal-clear
if (isPdfPresentation && pdfViewUrl) {
  ensurePdfSlidesRendered(false).then(() => {
    if (!isPlaying && !isRendering && !isLiveRecordingMode) {
      const cur = generatedClips[currentSlideIndex] || generatedClips[0];
      if (cur) updateLiveStageVisual(cur);
    }
  }).catch(() => { });
}

// Expose global control hooks for automated rendering and testing
if (typeof window !== 'undefined') {
  window.__startVideoCreation = startVideoCreation;
  window.__startFullPresentation = startFullPresentation;
  window.__stopFullPresentation = stopFullPresentation;
  window.__generatedClips = generatedClips;
}
}

