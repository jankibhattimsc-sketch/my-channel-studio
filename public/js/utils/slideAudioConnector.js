/**
 * Slide-and-Audio Connection & Synchronized Sequence Layer (Phase 2)
 * Gyan Yatra AI Studio — Professional Slide-Wise Video Production Workflow
 * 
 * Rules:
 * 1. Strict Permanent ID Connection: Matches by permanent projectId, slideId, pageNumber.
 *    Never relies solely on array index or slide title.
 * 2. Zero Cross-Wiring: Slide 1 only connects to Slide 1 audio, Slide 2 only to Slide 2 audio.
 *    If audio is missing, marks as missing with explicit warning — never plays another slide's audio.
 * 3. Uses Original PDF: Preserves original PDF page order, visuals, and page numbers.
 * 4. Preserves Existing Audio: Uses existing enhanced broadcast audio without re-encoding or duplication.
 * 5. Sequence Ready for Video Editing: Computes exact timing boundaries, durations, and transitions (Cut 0s).
 */

/**
 * Matches an individual slide with its already-saved audio record strictly by permanent identifiers
 */
export function matchSlideWithAudio(slide, allAudios = {}, projectId = '') {
  if (!slide) return { matched: false, audioRecord: null, audioUrl: '', duration: 0, warning: 'અમાન્ય સ્લાઇડ' };

  const sId = String(slide.slideId || '');
  const sNum = slide.slideNumber !== undefined && slide.slideNumber !== null ? Number(slide.slideNumber) : null;
  const pNum = slide.pageNumber !== undefined && slide.pageNumber !== null ? Number(slide.pageNumber) : sNum;

  let matchedRecord = null;

  // 1. Array search (highest priority when allAudios is an array of records)
  if (Array.isArray(allAudios)) {
    for (const rec of allAudios) {
      if (!rec) continue;
      if (sId && (String(rec.slideId) === sId || (rec.id && rec.id.endsWith(`_slide_${sId}`)))) {
        matchedRecord = rec;
        break;
      }
      if (sNum !== null && (Number(rec.slideNumber) === sNum || (rec.id && rec.id.endsWith(`_slide_${sNum}`)))) {
        matchedRecord = rec;
        break;
      }
      if (pNum !== null && rec.pageNumber !== undefined && rec.pageNumber !== null && Number(rec.pageNumber) === pNum) {
        matchedRecord = rec;
        break;
      }
    }
  } else if (allAudios && typeof allAudios === 'object') {
    // Dictionary object
    if (sId && allAudios[sId]) {
      matchedRecord = allAudios[sId];
    } else if (projectId && sId && allAudios[`${projectId}_slide_${sId}`]) {
      matchedRecord = allAudios[`${projectId}_slide_${sId}`];
    } else if (pNum !== null && allAudios[String(pNum)]) {
      const candidate = allAudios[String(pNum)];
      if (candidate.pageNumber === pNum || candidate.slideNumber === sNum || candidate.slideId === sId || String(candidate.slideNumber) === String(pNum)) {
        matchedRecord = candidate;
      }
    }
    if (!matchedRecord) {
      for (const rec of Object.values(allAudios)) {
        if (!rec) continue;
        if (sId && String(rec.slideId) === sId) {
          matchedRecord = rec;
          break;
        }
        if (sNum !== null && rec.slideNumber !== undefined && rec.slideNumber !== null && Number(rec.slideNumber) === sNum) {
          matchedRecord = rec;
          break;
        }
        if (pNum !== null && rec.pageNumber !== undefined && rec.pageNumber !== null && Number(rec.pageNumber) === pNum) {
          matchedRecord = rec;
          break;
        }
      }
    }
  }

  // 5. Fallback: Check if slide object itself carries audioUrl or recording
  if (!matchedRecord && slide && (slide.audioUrl || slide.recordingUrl || slide.enhancedDataUrl)) {
    matchedRecord = {
      slideId: sId,
      slideNumber: sNum,
      pageNumber: pNum,
      enhancedDataUrl: slide.enhancedDataUrl || slide.audioUrl,
      dataUrl: slide.audioUrl,
      originalDataUrl: slide.rawAudioUrl || slide.audioUrl,
      url: slide.audioUrl || slide.recordingUrl,
      duration: Number(slide.recordingDuration) || Number(slide.duration) || 5,
      isEnhanced: Boolean(slide.isEnhanced || slide.recordingStatus === 'Enhanced'),
      savedAt: slide.savedAt || new Date().toISOString()
    };
  }

  if (matchedRecord) {
    let playableBlobUrl = '';
    if (matchedRecord.enhancedBlob && typeof Blob !== 'undefined' && (matchedRecord.enhancedBlob instanceof Blob)) {
      try { playableBlobUrl = URL.createObjectURL(matchedRecord.enhancedBlob); } catch (_) { }
    } else if (matchedRecord.enhancedBlob && (matchedRecord.enhancedBlob instanceof ArrayBuffer || matchedRecord.enhancedBlob.buffer)) {
      try { playableBlobUrl = URL.createObjectURL(new Blob([matchedRecord.enhancedBlob], { type: 'audio/wav' })); } catch (_) { }
    } else if (matchedRecord.blob && typeof Blob !== 'undefined' && (matchedRecord.blob instanceof Blob)) {
      try { playableBlobUrl = URL.createObjectURL(matchedRecord.blob); } catch (_) { }
    } else if (matchedRecord.blob && (matchedRecord.blob instanceof ArrayBuffer || matchedRecord.blob.buffer)) {
      try { playableBlobUrl = URL.createObjectURL(new Blob([matchedRecord.blob], { type: 'audio/wav' })); } catch (_) { }
    }
    const cleanUrl = (matchedRecord.url && !matchedRecord.url.includes('uploaded_179359')) ? matchedRecord.url : '';
    const enhancedDataUrl = playableBlobUrl || matchedRecord.enhancedDataUrl || matchedRecord.dataUrl || cleanUrl || '';
    const rawAudioUrl = playableBlobUrl || matchedRecord.originalDataUrl || matchedRecord.dataUrl || cleanUrl || enhancedDataUrl || '';
    const audioUrl = enhancedDataUrl || rawAudioUrl;
    const hasAudio = Boolean(audioUrl && audioUrl.length > 0);
    const duration = (Number(matchedRecord.duration) > 0) ? Number(matchedRecord.duration) : (Number(slide.recordingDuration) > 0 ? Number(slide.recordingDuration) : 5.0);

    return {
      matched: hasAudio,
      audioRecord: matchedRecord,
      audioUrl: hasAudio ? audioUrl : '',
      rawAudioUrl: hasAudio ? rawAudioUrl : '',
      enhancedDataUrl: hasAudio ? enhancedDataUrl : '',
      duration: hasAudio ? Number(duration.toFixed(2)) : 0,
      isEnhanced: Boolean(matchedRecord.enhancedDataUrl || matchedRecord.status === 'Enhanced' || matchedRecord.isEnhanced),
      savedAt: matchedRecord.savedAt || matchedRecord.createdAt || null,
      status: matchedRecord.status || 'Recorded',
      warning: hasAudio ? null : `સ્લાઇડ #${sNum || pNum}: ઓડિયો ફાઇલ ખાલી છે.`
    };
  }

  return {
    matched: false,
    audioRecord: null,
    audioUrl: '',
    rawAudioUrl: '',
    duration: 0,
    isEnhanced: false,
    savedAt: null,
    status: 'Missing',
    warning: `સ્લાઇડ #${sNum || pNum || 1} (પેજ #${pNum || sNum || 1}): અવાજ રેકોર્ડ થયેલ નથી.`
  };
}

/**
 * Builds the complete synchronized sequence connecting each original PDF slide with its recorded audio
 */
export function buildConnectedSlideSequence(project, presentationRecord = null, storedAudios = [], options = {}) {
  const proj = project || {};
  const projectId = proj.id || 'default_proj';
  const defaultDuration = Number(options.defaultDuration) || 8.0;

  // Retrieve slides from presentation record, project slides, or script sections
  let rawSlides = [];
  if (presentationRecord && Array.isArray(presentationRecord.slides) && presentationRecord.slides.length > 0) {
    rawSlides = presentationRecord.slides;
  } else if (Array.isArray(proj.slide?.slides) && proj.slide.slides.length > 0) {
    rawSlides = proj.slide.slides;
  } else if (Array.isArray(proj.script?.sections) && proj.script.sections.length > 0) {
    rawSlides = proj.script.sections.map((sec, i) => ({
      slideNumber: i + 1,
      pageNumber: i + 1,
      slideId: sec.slideId || `slide_${projectId}_${i + 1}`,
      title: sec.title || sec.sectionName || `સ્લાઇડ #${i + 1}`,
      subtitle: proj.topic || proj.name || 'પ્રેઝન્ટેશન સ્લાઇડ',
      scriptText: sec.scriptText || sec.content || sec.narration || '',
      bulletPoints: []
    }));
  }

  // Graceful dynamic fallback structured presentation slides matching THIS topic so studio is never empty
  if (rawSlides.length === 0) {
    const topicTitle = (proj.topic || proj.name || 'નવી સત્તાવાર યોજના ૨૦૨૬').trim();
    rawSlides = [
      {
        slideNumber: 1,
        pageNumber: 1,
        slideId: `slide_${projectId}_1`,
        title: topicTitle,
        subtitle: 'સત્તાવાર માહિતી અને પરિપત્ર વિશ્લેષણ',
        bulletPoints: [
          `${topicTitle} અંગે તાજી જાહેરાત`,
          'સત્તાવાર પરિપત્ર અને નિયમો ૨૦૨૬',
          'તમામ પાત્રતા અને નિયમોની સંપૂર્ણ વિગત'
        ],
        scriptText: `નમસ્તે મિત્રો! આજના વિડીયોમાં આપણે "${topicTitle}" અંગે સત્તાવાર વિગતો જોઈશું.`
      },
      {
        slideNumber: 2,
        pageNumber: 2,
        slideId: `slide_${projectId}_2`,
        title: `${topicTitle} - પાત્રતા અને નિયમો`,
        subtitle: 'કોને કોને લાભ મળશે?',
        bulletPoints: [
          'અરજી માટેની પાત્રતા અને શરતો',
          'જરૂરી તમામ પુરાવા અને ડોક્યુમેન્ટ્સ',
          'ઓનલાઇન પોર્ટલ પરથી સત્તાવાર માહિતી'
        ],
        scriptText: 'આ વિષય અંગે સરકારશ્રીના નિયમો મુજબ કોને પાત્રતા મળશે તે વિગતવાર સમજીએ.'
      },
      {
        slideNumber: 3,
        pageNumber: 3,
        slideId: `slide_${projectId}_3`,
        title: `${topicTitle} - અરજી પ્રક્રિયા`,
        subtitle: 'સ્ટેપ-બાય-સ્ટેપ સંપૂર્ણ માર્ગદર્શન',
        bulletPoints: [
          'ઓનલાઇન ફોર્મ ભરવાની પદ્ધતિ',
          'સત્તાવાર વેબસાઇટ લિંક અને વિગત',
          'છેલ્લી તારીખ પહેલાં અરજી કરવી'
        ],
        scriptText: 'અરજી પ્રક્રિયા અને ફોર્મ ભરવાની સંપૂર્ણ માહિતી અહીં સ્ટેપ બાય સ્ટેપ આપેલ છે.'
      },
      {
        slideNumber: 4,
        pageNumber: 4,
        slideId: `slide_${projectId}_4`,
        title: 'મહત્વની તારીખો અને સત્તાવાર પોર્ટલ',
        subtitle: 'સત્તાવાર પોર્ટલ સંદર્ભ',
        bulletPoints: [
          'સત્તાવાર વેબસાઇટ પરથી જ માહિતી મેળવવી',
          'કોઈપણ વચેટીયાની અફવાઓમાં ન આવવું',
          'નિયમિત અપડેટ્સ માટે સત્તાવાર પોર્ટલ જોવું'
        ],
        scriptText: 'સત્તાવાર પરિપત્ર અને ફોર્મ સરકારના અધિકૃત પોર્ટલ પરથી જ મેળવવું.'
      },
      {
        slideNumber: 5,
        pageNumber: 5,
        slideId: `slide_${projectId}_5`,
        title: 'વિડીયો શેર કરો અને સબ્સ્ક્રાઇબ કરો',
        subtitle: 'જ્ઞાન યાત્રા YouTube ચેનલ',
        bulletPoints: [
          'વિડીયોને લાઈક અને શેર કરો',
          'તમારા તમામ વોટ્સએપ ગ્રૂપમાં શેર કરો',
          'રોજિંદી સાચી સરકારી અપડેટ્સ માટે સબ્સ્ક્રાઇબ કરો'
        ],
        scriptText: 'આ માહિતી ઉપયોગી લાગી હોય તો વિડીયોને લાઈક કરો અને જ્ઞાન યાત્રા ચેનલને સબ્સ્ક્રાઇબ કરજો. આભાર!'
      }
    ];
  }

  // Build audio map for fast lookup
  const audioMap = {};
  if (Array.isArray(storedAudios)) {
    storedAudios.forEach(rec => {
      if (!rec) return;
      if (rec.id) audioMap[String(rec.id)] = rec;
      if (rec.slideId) audioMap[String(rec.slideId)] = rec;
      if (rec.slideNumber !== undefined && rec.slideNumber !== null) {
        audioMap[String(rec.slideNumber)] = rec;
      }
      if (rec.pageNumber !== undefined && rec.pageNumber !== null) {
        audioMap[`page_${rec.pageNumber}`] = rec;
      }
    });
  } else if (typeof storedAudios === 'object' && storedAudios !== null) {
    Object.assign(audioMap, storedAudios);
  }

  // Integrate authentic disk-saved server audio recordings
  if (options.serverSlideAudios && typeof options.serverSlideAudios === 'object') {
    Object.entries(options.serverSlideAudios).forEach(([key, rec]) => {
      if (!rec) return;
      const sNum = rec.slideNumber || parseInt(key, 10);
      if (sNum) {
        const adapted = {
          id: `${projectId}_slide_${sNum}`,
          slideId: `slide_${sNum}`,
          slideNumber: sNum,
          pageNumber: sNum,
          url: rec.audioUrl,
          serverUrl: rec.audioUrl,
          enhancedDataUrl: rec.audioUrl,
          dataUrl: rec.audioUrl,
          duration: Number(rec.duration) || 0,
          savedAt: new Date(rec.mtime || Date.now()).toISOString(),
          status: 'Recorded',
          isEnhanced: true
        };
        // If not already in audioMap or existing had 0 duration / dead blob
        const existing = audioMap[String(sNum)];
        if (!existing || !existing.duration || existing.duration <= 0 || (existing.url && existing.url.startsWith('blob:'))) {
          audioMap[String(sNum)] = adapted;
          audioMap[`slide_${sNum}`] = adapted;
          audioMap[`${projectId}_slide_${sNum}`] = adapted;
        }
      }
    });

    // Expand rawSlides if serverSlideAudios contains additional recorded slides (e.g. Slide 6 to 9)
    const sNums = Object.keys(options.serverSlideAudios)
      .map(k => parseInt(k, 10))
      .filter(n => !isNaN(n) && n > 0);
    const maxServerSlide = sNums.length > 0 ? Math.max(...sNums) : 0;
    for (let num = rawSlides.length + 1; num <= maxServerSlide; num++) {
      rawSlides.push({
        slideNumber: num,
        pageNumber: num,
        slideId: `slide_${projectId}_${num}`,
        title: `સ્લાઇડ #${num}`,
        subtitle: proj.topic || proj.name || 'પ્રેઝન્ટેશન સ્લાઇડ',
        bulletPoints: [],
        scriptText: ''
      });
    }
  }

  // PDF Presentation View URL
  const pdfViewUrl = options.pdfViewUrl || presentationRecord?.fileUrl || proj.slide?.importedPresentation?.fileUrl || '';
  const pdfFilename = options.pdfFilename || presentationRecord?.filename || proj.slide?.importedPresentation?.filename || 'imported.pdf';

  let currentOffset = 0;
  let connectedCount = 0;
  let missingCount = 0;
  const missingSlides = [];
  const sequenceSlides = [];

  rawSlides.forEach((s, idx) => {
    const sNum = (s.slideNumber !== undefined && s.slideNumber !== null) ? Number(s.slideNumber) : (idx + 1);
    const pNum = (s.pageNumber !== undefined && s.pageNumber !== null) ? Number(s.pageNumber) : sNum;
    const sId = s.slideId || `slide_${projectId}_${sNum}`;

    const match = matchSlideWithAudio(s, audioMap, projectId);

    const hasAudio = match.matched;
    const clipDuration = hasAudio ? match.duration : defaultDuration;
    const startTime = Number(currentOffset.toFixed(2));
    const endTime = Number((currentOffset + clipDuration).toFixed(2));

    if (hasAudio) {
      connectedCount++;
    } else {
      missingCount++;
      missingSlides.push(sNum);
    }

    const matchedScriptSec = (() => {
      if (!proj.script || !Array.isArray(proj.script.sections)) return null;
      return proj.script.sections.find(sec => (
        (sec.slideId && String(sec.slideId) === String(sId)) ||
        (sec.slideNumber !== undefined && Number(sec.slideNumber) === sNum) ||
        (sec.pageNumber !== undefined && Number(sec.pageNumber) === pNum)
      )) || proj.script.sections[idx] || null;
    })();

    const resolvedTitle = (matchedScriptSec && (matchedScriptSec.title || matchedScriptSec.sectionName) && (!s.title || s.title.startsWith('સ્લાઇડ')))
      ? (matchedScriptSec.title || matchedScriptSec.sectionName)
      : (s.title || `સ્લાઇડ #${sNum}`);

    const candidateScript = matchedScriptSec?.scriptText || matchedScriptSec?.text || matchedScriptSec?.content || matchedScriptSec?.narration || '';
    const resolvedScriptText = (candidateScript && candidateScript.trim().length > (s.scriptText || '').trim().length)
      ? candidateScript.trim()
      : ((s.scriptText && s.scriptText.trim()) ? s.scriptText.trim() : (candidateScript ? candidateScript.trim() : ''));

    sequenceSlides.push({
      sequenceIndex: idx,
      slideId: sId,
      slideNumber: sNum,
      pageNumber: pNum,
      title: resolvedTitle,
      subtitle: s.subtitle || '',
      bulletPoints: Array.isArray(s.bulletPoints) ? s.bulletPoints : (matchedScriptSec?.bulletPoints || []),
      imageUrl: s.imageUrl || null,
      pdfPageUrl: pdfViewUrl ? `${pdfViewUrl}#page=${pNum}&view=FitH` : '',
      scriptText: resolvedScriptText,
      hasAudio,
      audioId: match.audioRecord?.id || null,
      audioUrl: match.audioUrl,
      rawAudioUrl: match.rawAudioUrl,
      enhancedDataUrl: match.enhancedDataUrl || match.audioUrl,
      audioDuration: match.duration,
      duration: clipDuration,
      isEnhanced: match.isEnhanced,
      savedAt: match.savedAt || s.savedAt || null,
      startTime,
      endTime,
      transition: {
        type: 'cut', // Clean cut (0s), preserving original slide without artificial animations
        duration: 0
      },
      warning: match.warning
    });

    currentOffset += clipDuration;
  });

  const totalDuration = Number(currentOffset.toFixed(2));
  const mins = Math.floor(totalDuration / 60);
  const secs = Math.round(totalDuration % 60);
  const formattedDuration = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const sequence = {
    sequenceId: `seq_${projectId}_${Date.now()}`,
    projectId,
    projectName: proj.name || 'Untitled Project',
    pdfFilename,
    pdfViewUrl,
    totalSlides: sequenceSlides.length,
    connectedCount,
    missingCount,
    missingSlides,
    isFullyConnected: sequenceSlides.length > 0 && missingCount === 0,
    totalDuration,
    formattedDuration,
    slides: sequenceSlides,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return sequence;
}

/**
 * Saves the connected sequence into persistent storage
 */
export function saveConnectedSequence(projectId, sequence) {
  if (!projectId || !sequence) return null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`gyan_slide_sequence_${projectId}`, JSON.stringify(sequence));
    }
  } catch (_) { }
  return sequence;
}

/**
 * Loads the saved connected sequence from persistent storage
 */
export function loadConnectedSequence(projectId) {
  if (!projectId) return null;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(`gyan_slide_sequence_${projectId}`);
      if (raw) return JSON.parse(raw);
    }
  } catch (_) { }
  return null;
}

/**
 * Verifies the integrity of the slide and audio connections
 */
export function verifySequenceFidelity(sequence, expectedSlideCount = 0) {
  const errors = [];
  const warnings = [];

  if (!sequence || !Array.isArray(sequence.slides)) {
    return { isValid: false, errors: ['અમાન્ય સિક્વન્સ ડેટા'], warnings };
  }

  if (expectedSlideCount > 0 && sequence.slides.length !== expectedSlideCount) {
    errors.push(`સ્લાઇડ સંખ્યા મેળ ખાતી નથી: અપેક્ષિત ${expectedSlideCount}, પ્રાપ્ત ${sequence.slides.length}`);
  }

  // 1. Verify 1-to-1 slide-to-audio isolation
  const usedAudioUrls = new Set();
  sequence.slides.forEach((sl, idx) => {
    // Check slide number ordering
    if (sl.slideNumber !== idx + 1) {
      warnings.push(`સ્લાઇડ #${sl.slideNumber} નો ક્રમ ઇન્ડેક્સ #${idx + 1} સાથે મેળ ખાતો નથી`);
    }

    // Check audio isolation
    if (sl.hasAudio && sl.audioUrl) {
      if (usedAudioUrls.has(sl.audioUrl)) {
        errors.push(`ડુપ્લિકેટ ઓડિયો લિંકિંગ મળી: સ્લાઇડ #${sl.slideNumber} અન્ય સ્લાઇડનો ઓડિયો શેર કરે છે.`);
      }
      usedAudioUrls.add(sl.audioUrl);
    } else {
      warnings.push(`સ્લાઇડ #${sl.slideNumber} માટે ઓડિયો ઉપલબ્ધ નથી.`);
    }

    // Check timing boundaries
    if (idx > 0) {
      const prev = sequence.slides[idx - 1];
      if (Math.abs(sl.startTime - prev.endTime) > 0.05) {
        errors.push(`સ્લાઇડ #${sl.slideNumber} અને #${prev.slideNumber} વચ્ચે સમય સીમા તૂટે છે.`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    isFullyRecorded: sequence.missingCount === 0
  };
}

// Support CommonJS testing environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    matchSlideWithAudio,
    buildConnectedSlideSequence,
    saveConnectedSequence,
    loadConnectedSequence,
    verifySequenceFidelity
  };
}

