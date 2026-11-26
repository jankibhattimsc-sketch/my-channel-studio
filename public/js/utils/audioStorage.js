/**
 * Persistent Audio Storage using IndexedDB with localStorage fallback
 * Gyan Yatra AI Studio — Professional Slide-by-Slide Voice & Video Studio
 * 
 * Guarantees that slide-wise voice recordings are never lost due to localStorage quota limits.
 * Links every recording to projectId, slideId, scriptSectionId, and recordingId.
 */

const DB_NAME = 'GyanYatraStudioAudioDB';
const DB_VERSION = 2;
const STORE_NAME = 'project_recordings';
const SLIDE_STORE_NAME = 'slide_recordings';

function openAudioDB() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    const timer = setTimeout(() => {
      console.warn('openAudioDB timeout, proceeding with memory/fallback');
      resolve(null);
    }, 2500);

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onblocked = () => {
        clearTimeout(timer);
        console.warn('IndexedDB open blocked by another tab');
        resolve(null);
      };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'projectId' });
        }
        if (!db.objectStoreNames.contains(SLIDE_STORE_NAME)) {
          const slideStore = db.createObjectStore(SLIDE_STORE_NAME, { keyPath: 'id' });
          slideStore.createIndex('projectId', 'projectId', { unique: false });
          slideStore.createIndex('slideId', 'slideId', { unique: false });
        }
      };
      request.onsuccess = () => {
        clearTimeout(timer);
        resolve(request.result);
      };
      request.onerror = () => {
        clearTimeout(timer);
        console.warn('IndexedDB open error:', request.error);
        resolve(null);
      };
    } catch (err) {
      clearTimeout(timer);
      console.warn('IndexedDB open exception:', err);
      resolve(null);
    }
  });
}

/**
 * Upload audio blob or dataUrl to server storage (/api/voice/upload-audio)
 * Returns permanent URL like "/audio/uploaded_17305...wav"
 */
export async function uploadAudioToServer(blobOrDataUrl, filename = 'slide_voice.wav', projectId = '') {
  try {
    let base64 = '';
    if (typeof blobOrDataUrl === 'string' && blobOrDataUrl.startsWith('data:')) {
      base64 = blobOrDataUrl;
    } else if (blobOrDataUrl instanceof Blob) {
      base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blobOrDataUrl);
      });
    }

    if (!base64 || typeof base64 !== 'string' || base64.length < 50) return null;

    const res = await fetch('/api/voice/upload-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64: base64, filename, projectId })
    });

    if (res.ok) {
      const json = await res.json();
      if (json && json.audioUrl) {
        return json.audioUrl;
      }
    }
  } catch (err) {
    console.warn('[Audio Upload to Server]: Offline or unreachable, using local storage:', err.message);
  }
  return null;
}

/**
 * Save slide-specific audio recording
 */
export async function saveSlideAudioRecord(projectId, slideIdOrData, maybeData) {
  if (!projectId || !slideIdOrData) return false;
  const cleanProjectId = typeof projectId === 'object' && projectId !== null
    ? String(projectId.id || projectId.topicId || 'default_proj')
    : String(projectId || 'default_proj');
  let slideId = slideIdOrData;
  let data = maybeData;
  if (typeof slideIdOrData === 'object' && slideIdOrData !== null && !maybeData) {
    data = slideIdOrData;
    slideId = data.slideId !== undefined ? data.slideId : (data.slideNumber !== undefined ? data.slideNumber : 1);
  }
  const slideKey = String(slideId);
  const id = `${cleanProjectId}_slide_${slideKey}`;

  const {
    blob = null,
    enhancedBlob = null,
    rawBlob = null,
    url = '',
    serverUrl = '',
    dataUrl = '',
    originalDataUrl = '',
    enhancedDataUrl = '',
    duration = 0,
    filename = `slide_${slideKey}_voice.wav`,
    scriptSectionId = `sec_${slideKey}`,
    slideNumber = null,
    pageNumber = null,
    recordingId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    status = 'Recorded',
    approvalStatus = 'approved',
    enhancementSettings = null,
    transcript = '',
    mistakes = [],
    createdAt = new Date().toISOString()
  } = data || {};

  try {
    const db = await openAudioDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(SLIDE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(SLIDE_STORE_NAME);
        const record = {
          id,
          projectId: cleanProjectId,
          slideId: slideKey,
          slideNumber: slideNumber || null,
          pageNumber: pageNumber || null,
          scriptSectionId,
          recordingId,
          blob,
          enhancedBlob,
          rawBlob,
          url: url || '',
          serverUrl: serverUrl || '',
          dataUrl: dataUrl || '',
          originalDataUrl: originalDataUrl || dataUrl || url || '',
          enhancedDataUrl: enhancedDataUrl || dataUrl || url || '',
          duration: Number(duration) || 0,
          filename,
          status,
          approvalStatus,
          enhancementSettings,
          transcript,
          mistakes,
          createdAt,
          updatedAt: new Date().toISOString()
        };
        const req = store.put(record);
        req.onsuccess = () => resolve(true);
        req.onerror = () => {
          console.warn('IndexedDB slide put error:', req.error);
          resolve(false);
        };
      });
    }
  } catch (err) {
    console.warn('IndexedDB saveSlideAudio error:', err);
  }

  // Fallback: localStorage (skip giant dataUrl if exceeding quota)
  try {
    const safeDataUrl = (dataUrl && dataUrl.length < 500000) ? dataUrl : '';
    const recordMeta = JSON.stringify({
      id,
      projectId: cleanProjectId,
      slideId: slideKey,
      slideNumber: slideNumber || null,
      scriptSectionId,
      recordingId,
      url: url || '',
      dataUrl: safeDataUrl,
      originalDataUrl: (originalDataUrl && originalDataUrl.length < 500000) ? originalDataUrl : (url || ''),
      enhancedDataUrl: (enhancedDataUrl && enhancedDataUrl.length < 500000) ? enhancedDataUrl : (url || ''),
      duration: Number(duration) || 0,
      filename,
      status,
      approvalStatus,
      enhancementSettings,
      transcript,
      mistakes,
      createdAt
    });
    localStorage.setItem(`gyan_slide_audio_${id}`, recordMeta);
  } catch (_) { }

  return true;
}

/**
 * Get slide-specific audio recording
 */
export async function getSlideAudioRecord(projectId, slideId, fallbackSlideNum = null) {
  if (!projectId || slideId === undefined || slideId === null) return null;
  const cleanProjectId = typeof projectId === 'object' && projectId !== null
    ? String(projectId.id || projectId.topicId || 'default_proj')
    : String(projectId || 'default_proj');
  const slideKey = String(slideId);
  const id = `${cleanProjectId}_slide_${slideKey}`;

  try {
    const db = await openAudioDB();
    if (db) {
      let res = await new Promise((resolve) => {
        const tx = db.transaction(SLIDE_STORE_NAME, 'readonly');
        const store = tx.objectStore(SLIDE_STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });

      if (!res && cleanProjectId === 'default_proj') {
        const legacyId = `[object Object]_slide_${slideKey}`;
        res = await new Promise((resolve) => {
          const tx = db.transaction(SLIDE_STORE_NAME, 'readonly');
          const store = tx.objectStore(SLIDE_STORE_NAME);
          const req = store.get(legacyId);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      }

      // Backward compatibility fallback to slideNumber if not found by permanent slideId
      if (!res && fallbackSlideNum !== null && fallbackSlideNum !== undefined && String(fallbackSlideNum) !== slideKey) {
        const fallbackId = `${cleanProjectId}_slide_${fallbackSlideNum}`;
        res = await new Promise((resolve) => {
          const tx = db.transaction(SLIDE_STORE_NAME, 'readonly');
          const store = tx.objectStore(SLIDE_STORE_NAME);
          const req = store.get(fallbackId);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      }

      if (res) {
        let playableUrl = '';
        if (res.enhancedBlob && typeof Blob !== 'undefined' && (res.enhancedBlob instanceof Blob)) {
          try {
            playableUrl = URL.createObjectURL(res.enhancedBlob);
          } catch (_) { }
        } else if (res.enhancedBlob && (res.enhancedBlob instanceof ArrayBuffer || res.enhancedBlob.buffer)) {
          try {
            playableUrl = URL.createObjectURL(new Blob([res.enhancedBlob], { type: 'audio/wav' }));
          } catch (_) { }
        } else if (res.blob && typeof Blob !== 'undefined' && (res.blob instanceof Blob)) {
          try {
            playableUrl = URL.createObjectURL(res.blob);
          } catch (_) { }
        } else if (res.blob && (res.blob instanceof ArrayBuffer || res.blob.buffer)) {
          try {
            playableUrl = URL.createObjectURL(new Blob([res.blob], { type: 'audio/wav' }));
          } catch (_) { }
        }
        if (!playableUrl && res.enhancedDataUrl && res.enhancedDataUrl.startsWith('data:')) {
          playableUrl = res.enhancedDataUrl;
        } else if (!playableUrl && res.dataUrl && res.dataUrl.startsWith('data:')) {
          playableUrl = res.dataUrl;
        } else if (!playableUrl && res.serverUrl && !res.serverUrl.includes('uploaded_179359')) {
          playableUrl = res.serverUrl;
        } else if (!playableUrl && res.url && !res.url.includes('uploaded_179359')) {
          playableUrl = res.url;
        }

        return {
          id: res.id,
          projectId: res.projectId,
          slideId: res.slideId,
          slideNumber: res.slideNumber || null,
          pageNumber: res.pageNumber || null,
          scriptSectionId: res.scriptSectionId,
          recordingId: res.recordingId,
          url: playableUrl,
          serverUrl: res.serverUrl || (playableUrl.startsWith('/audio/') ? playableUrl : ''),
          blob: res.blob,
          enhancedBlob: res.enhancedBlob || null,
          rawBlob: res.rawBlob || null,
          dataUrl: res.dataUrl,
          originalDataUrl: res.originalDataUrl || res.dataUrl || res.url || '',
          enhancedDataUrl: res.enhancedDataUrl || res.dataUrl || res.url || '',
          enhancementSettings: res.enhancementSettings || null,
          approvalStatus: res.approvalStatus || 'approved',
          transcript: res.transcript || '',
          mistakes: res.mistakes || [],
          duration: Number(res.duration) || 0,
          filename: res.filename || `slide_${slideKey}_voice.wav`,
          status: res.status || 'Recorded',
          createdAt: res.createdAt,
          updatedAt: res.updatedAt
        };
      }
    }
  } catch (err) {
    console.warn('IndexedDB getSlideAudio error:', err);
  }

  // Fallback
  try {
    const local = localStorage.getItem(`gyan_slide_audio_${id}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        return {
          ...parsed,
          url: parsed.url || parsed.enhancedDataUrl || parsed.dataUrl || parsed.originalDataUrl || ''
        };
      } catch (_) {
        return {
          id,
          projectId,
          slideId: slideKey,
          url: local,
          dataUrl: local,
          duration: 0,
          filename: `slide_${slideKey}_voice.wav`,
          status: 'Recorded'
        };
      }
    }
  } catch (_) { }

  return null;
}

/**
 * Get all slide recordings for a specific project
 */
export async function getAllSlideAudioRecords(projectId) {
  if (!projectId) return [];
  const cleanProjectId = typeof projectId === 'object' && projectId !== null
    ? String(projectId.id || projectId.topicId || 'default_proj')
    : String(projectId || 'default_proj');

  let resultList = [];
  try {
    const db = await openAudioDB();
    if (db) {
      const rawList = await new Promise((resolve) => {
        try {
          const tx = db.transaction(SLIDE_STORE_NAME, 'readonly');
          const store = tx.objectStore(SLIDE_STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => {
            const all = req.result || [];
            const filtered = all.filter(r => {
              if (!r) return false;
              const rProjId = typeof r.projectId === 'object' && r.projectId !== null
                ? String(r.projectId.id || r.projectId.topicId || '')
                : String(r.projectId || '');
              const rId = String(r.id || '');

              if (cleanProjectId === 'default_proj' || cleanProjectId === 'proj_default_gsrtc') {
                return (
                  rProjId === cleanProjectId ||
                  rProjId === '[object Object]' ||
                  (rId && (rId.startsWith(`${cleanProjectId}_`) || rId.startsWith('[object Object]_')))
                );
              }
              // For all active topics/projects, strictly require matching projectId
              return (
                (rProjId && rProjId === cleanProjectId) ||
                (rId && rId.startsWith(`${cleanProjectId}_`))
              );
            });
            resolve(filtered);
          };
          req.onerror = () => resolve([]);
        } catch (_) {
          resolve([]);
        }
      });

      if (rawList && rawList.length > 0) {
        resultList = rawList.map((res) => {
          let playableUrl = '';
          if (res.enhancedBlob && typeof Blob !== 'undefined' && (res.enhancedBlob instanceof Blob)) {
            try {
              playableUrl = URL.createObjectURL(res.enhancedBlob);
            } catch (_) { }
          } else if (res.enhancedBlob && (res.enhancedBlob instanceof ArrayBuffer || res.enhancedBlob.buffer)) {
            try {
              playableUrl = URL.createObjectURL(new Blob([res.enhancedBlob], { type: 'audio/wav' }));
            } catch (_) { }
          } else if (res.blob && typeof Blob !== 'undefined' && (res.blob instanceof Blob)) {
            try {
              playableUrl = URL.createObjectURL(res.blob);
            } catch (_) { }
          } else if (res.blob && (res.blob instanceof ArrayBuffer || res.blob.buffer)) {
            try {
              playableUrl = URL.createObjectURL(new Blob([res.blob], { type: 'audio/wav' }));
            } catch (_) { }
          }
          if (!playableUrl && res.enhancedDataUrl && res.enhancedDataUrl.startsWith('data:')) {
            playableUrl = res.enhancedDataUrl;
          } else if (!playableUrl && res.dataUrl && res.dataUrl.startsWith('data:')) {
            playableUrl = res.dataUrl;
          } else if (!playableUrl && res.serverUrl && !res.serverUrl.includes('uploaded_179359')) {
            playableUrl = res.serverUrl;
          } else if (!playableUrl && res.url && !res.url.includes('uploaded_179359')) {
            playableUrl = res.url;
          }

          return {
            id: res.id,
            projectId: res.projectId,
            slideId: res.slideId,
            slideNumber: res.slideNumber || null,
            pageNumber: res.pageNumber || null,
            scriptSectionId: res.scriptSectionId,
            recordingId: res.recordingId,
            url: playableUrl,
            serverUrl: res.serverUrl || (playableUrl.startsWith('/audio/') ? playableUrl : ''),
            blob: res.blob,
            enhancedBlob: res.enhancedBlob || null,
            rawBlob: res.rawBlob || null,
            dataUrl: res.dataUrl,
            originalDataUrl: res.originalDataUrl || res.dataUrl || res.url || '',
            enhancedDataUrl: res.enhancedDataUrl || res.dataUrl || res.url || '',
            enhancementSettings: res.enhancementSettings || null,
            approvalStatus: res.approvalStatus || 'approved',
            transcript: res.transcript || '',
            mistakes: res.mistakes || [],
            duration: Number(res.duration) || 0,
            filename: res.filename || `slide_${res.slideId}_voice.wav`,
            status: res.status || 'Recorded',
            createdAt: res.createdAt,
            updatedAt: res.updatedAt
          };
        });
      }
    }
  } catch (err) {
    console.warn('IndexedDB getAllSlideAudio error:', err);
  }

  // Fallback 1: Query server-saved authentic slide audio files from disk ONLY for default demo project
  const isDefaultDemoProject = Boolean(projectId === 'proj_default_gsrtc' || projectId === 'default_proj');
  if (resultList.length === 0 && isDefaultDemoProject) {
    try {
      const sResp = await fetch('/api/voice/slide-audios?projectId=' + encodeURIComponent(projectId));
      if (sResp.ok) {
        const sData = await sResp.json();
        if (sData.success && sData.slideAudios && Object.keys(sData.slideAudios).length > 0) {
          Object.values(sData.slideAudios).forEach(sa => {
            resultList.push({
              id: `${projectId}_slide_${sa.slideNumber}`,
              projectId,
              slideId: `slide_${sa.slideNumber}`,
              slideNumber: sa.slideNumber,
              pageNumber: sa.slideNumber,
              url: sa.audioUrl,
              serverUrl: sa.audioUrl,
              dataUrl: '',
              enhancedDataUrl: '',
              duration: sa.duration || 5,
              filename: sa.filename,
              status: 'Recorded',
              createdAt: new Date(sa.mtime).toISOString()
            });
          });
        }
      }
    } catch (_) { }
  }

  // Fallback 2: localStorage scan
  if (resultList.length === 0) {
    try {
      if (typeof localStorage !== 'undefined') {
        const prefix = `gyan_slide_audio_${projectId}_slide_`;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            const val = localStorage.getItem(key);
            if (val) {
              try {
                const parsed = JSON.parse(val);
                resultList.push({
                  ...parsed,
                  url: parsed.serverUrl || parsed.enhancedDataUrl || parsed.dataUrl || parsed.originalDataUrl || '',
                  enhancedDataUrl: parsed.enhancedDataUrl || parsed.dataUrl || parsed.url || '',
                  originalDataUrl: parsed.originalDataUrl || parsed.dataUrl || parsed.url || ''
                });
              } catch (_) {
                const sNum = key.replace(prefix, '');
                resultList.push({
                  id: `${projectId}_slide_${sNum}`,
                  projectId,
                  slideId: sNum,
                  slideNumber: parseInt(sNum, 10) || null,
                  url: val,
                  dataUrl: val,
                  duration: 0,
                  filename: `slide_${sNum}_voice.wav`,
                  status: 'Recorded'
                });
              }
            }
          }
        }
      }
    } catch (_) { }
  }

  // Ensure freshest records are prioritized first so find() always gets the newest recording
  if (resultList.length > 1) {
    resultList.sort((a, b) => {
      const tA = new Date(a.updatedAt || a.savedAt || a.createdAt || 0).getTime();
      const tB = new Date(b.updatedAt || b.savedAt || b.createdAt || 0).getTime();
      return tB - tA;
    });
  }

  return resultList;
}

/**
 * Delete a slide-specific audio recording
 */
export async function deleteSlideAudioRecord(projectId, slideId) {
  if (!projectId || slideId === undefined || slideId === null) return false;
  const slideKey = String(slideId);
  const id = `${projectId}_slide_${slideKey}`;

  try {
    const db = await openAudioDB();
    if (db) {
      await new Promise((resolve) => {
        const tx = db.transaction(SLIDE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(SLIDE_STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    }
  } catch (err) {
    console.warn('IndexedDB deleteSlideAudio error:', err);
  }

  try {
    localStorage.removeItem(`gyan_slide_audio_${id}`);
  } catch (_) { }
  return true;
}

// ============================================================================
// LEGACY SINGLE PROJECT AUDIO RECORD (Preserved for 100% backward compatibility)
// ============================================================================

export async function saveProjectAudioRecord(projectId, { blob, dataUrl, duration, filename }) {
  if (!projectId) return false;

  try {
    const db = await openAudioDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const record = {
          projectId,
          blob: blob || null,
          dataUrl: dataUrl || '',
          duration: duration || 0,
          filename: filename || 'recording.wav',
          updatedAt: new Date().toISOString()
        };
        const req = store.put(record);
        req.onsuccess = () => resolve(true);
        req.onerror = () => {
          console.warn('IndexedDB put error:', req.error);
          resolve(false);
        };
      });
    }
  } catch (err) {
    console.warn('IndexedDB saveAudio error:', err);
  }

  if (dataUrl && dataUrl.length < 2000000) {
    try {
      localStorage.setItem(`gyan_audio_${projectId}`, dataUrl);
    } catch (_) { }
  }
  return true;
}

export async function getProjectAudioRecord(projectId) {
  if (!projectId) return null;

  try {
    const db = await openAudioDB();
    if (db) {
      const res = await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(projectId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });

      if (res) {
        let playableUrl = '';
        if (res.blob) {
          playableUrl = URL.createObjectURL(res.blob);
        } else if (res.dataUrl) {
          playableUrl = res.dataUrl;
        }
        return {
          url: playableUrl,
          serverUrl: res.serverUrl || (playableUrl.startsWith('/audio/') ? playableUrl : ''),
          blob: res.blob,
          enhancedBlob: res.enhancedBlob || null,
          rawBlob: res.rawBlob || null,
          dataUrl: res.dataUrl,
          duration: res.duration || 0,
          filename: res.filename || 'recording.wav',
          updatedAt: res.updatedAt
        };
      }
    }
  } catch (err) {
    console.warn('IndexedDB getAudio error:', err);
  }

  try {
    const local = localStorage.getItem(`gyan_audio_${projectId}`);
    if (local) {
      return {
        url: local,
        dataUrl: local,
        duration: 0,
        filename: 'recording.wav'
      };
    }
  } catch (_) { }

  return null;
}

export async function deleteProjectAudioRecord(projectId) {
  if (!projectId) return false;

  try {
    const db = await openAudioDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(projectId);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    }
  } catch (err) {
    console.warn('IndexedDB deleteAudio error:', err);
  }

  try {
    localStorage.removeItem(`gyan_audio_${projectId}`);
  } catch (_) { }
  return true;
}

/**
 * Completely clears all slide audio recordings and master audio for a project
 */
export async function clearAllProjectSlideAudios(projectId) {
  if (!projectId) return false;

  try {
    const db = await openAudioDB();
    if (db) {
      const records = await new Promise((resolve) => {
        try {
          const tx = db.transaction(SLIDE_STORE_NAME, 'readonly');
          const store = tx.objectStore(SLIDE_STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => {
            const all = req.result || [];
            const filtered = all.filter(r =>
              r.projectId === projectId ||
              (r.id && r.id.startsWith(`${projectId}_`))
            );
            resolve(filtered);
          };
          req.onerror = () => resolve([]);
        } catch (_) {
          resolve([]);
        }
      });

      if (records.length > 0) {
        await new Promise((resolve) => {
          const tx = db.transaction(SLIDE_STORE_NAME, 'readwrite');
          const store = tx.objectStore(SLIDE_STORE_NAME);
          records.forEach(r => store.delete(r.id));
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        });
      }
    }
  } catch (err) {
    console.warn('clearAllProjectSlideAudios IndexedDB error:', err);
  }

  // Clear localStorage slide audios for this project
  try {
    if (typeof localStorage !== 'undefined') {
      const prefix = `gyan_slide_audio_${projectId}_`;
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch (_) { }

  // Delete project master audio record
  try {
    await deleteProjectAudioRecord(projectId);
  } catch (_) { }

  return true;
}
