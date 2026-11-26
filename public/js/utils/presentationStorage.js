/**
 * Persistent Presentation Storage (IndexedDB) for Gyan Yatra AI Studio
 * Stores real PPTX and PDF files locally per project ID without Firestore quota limitations.
 */

const DB_NAME = 'GyanYatraPresentationDB_v1';
const DB_VERSION = 1;
const STORE_NAME = 'project_presentations';

function openPresentationDB() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => {
      console.warn('[PresentationDB] Open timeout, proceeding');
      resolve(null);
    }, 2000);
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onblocked = () => {
        clearTimeout(timer);
        resolve(null);
      };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        clearTimeout(timer);
        resolve(request.result);
      };
      request.onerror = (err) => {
        clearTimeout(timer);
        console.warn('[PresentationDB] Open error:', err);
        resolve(null);
      };
    } catch (_) {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

/**
 * Save an imported presentation for a specific project
 */
export async function saveProjectPresentation(projectId, presentationData) {
  if (!projectId || !presentationData) return false;

  const id = presentationData.id || `pres_${projectId}_${Date.now()}`;
  const record = {
    id,
    projectId,
    filename: presentationData.filename || 'presentation.pptx',
    fileType: presentationData.fileType || (presentationData.filename?.endsWith('.pdf') ? 'pdf' : 'pptx'),
    fileUrl: presentationData.fileUrl || '',
    size: presentationData.size || 0,
    sizeFormatted: presentationData.sizeFormatted || `${Math.round((presentationData.size || 0) / 1024)} KB`,
    uploadedAt: presentationData.uploadedAt || new Date().toISOString(),
    blob: presentationData.blob || null,
    dataUrl: presentationData.dataUrl || '',
    slidesCount: Array.isArray(presentationData.slides) ? presentationData.slides.length : 0,
    slides: presentationData.slides || [],
    notes: presentationData.notes || ''
  };

  try {
    const db = await openPresentationDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);
        req.onsuccess = () => resolve(record);
        req.onerror = () => {
          console.warn('[PresentationDB] Put error:', req.error);
          resolve(false);
        };
      });
    }
  } catch (err) {
    console.warn('[PresentationDB] saveProjectPresentation error:', err);
  }

  // Fallback: in-memory / local storage metadata
  try {
    const key = `gyan_pres_${projectId}`;
    const metaOnly = { ...record, blob: null, dataUrl: (record.dataUrl || '').slice(0, 100000) };
    localStorage.setItem(key, JSON.stringify(metaOnly));
    return record;
  } catch (_) {
    return record;
  }
}

/**
 * Get the active presentation for a specific project
 */
export async function getProjectPresentation(projectId) {
  if (!projectId) return null;

  try {
    const db = await openPresentationDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const all = req.result || [];
          const projectRecords = all
            .filter(r => r.projectId === projectId)
            .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          resolve(projectRecords[0] || null);
        };
        req.onerror = () => resolve(null);
      });
    }
  } catch (err) {
    console.warn('[PresentationDB] getProjectPresentation error:', err);
  }

  // Fallback from localStorage
  try {
    const raw = localStorage.getItem(`gyan_pres_${projectId}`);
    if (raw) return JSON.parse(raw);
  } catch (_) {}

  return null;
}

/**
 * Get all presentations history for a project
 */
export async function getProjectPresentationList(projectId) {
  if (!projectId) return [];

  try {
    const db = await openPresentationDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const all = req.result || [];
          const filtered = all
            .filter(r => r.projectId === projectId)
            .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
          resolve(filtered);
        };
        req.onerror = () => resolve([]);
      });
    }
  } catch (err) {
    console.warn('[PresentationDB] getProjectPresentationList error:', err);
  }

  return [];
}

/**
 * Delete a presentation from IndexedDB
 */
export async function deleteProjectPresentation(presentationId) {
  if (!presentationId) return false;

  try {
    const db = await openPresentationDB();
    if (db) {
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(presentationId);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    }
  } catch (err) {
    console.warn('[PresentationDB] deleteProjectPresentation error:', err);
  }

  return false;
}

/**
 * Safely convert a Base64 dataURL to a native Blob with correct MIME type
 */
export function dataUrlToBlob(dataUrl, defaultMime = 'application/octet-stream') {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = (mimeMatch && mimeMatch[1]) || defaultMime;
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.warn('[dataUrlToBlob error]:', err);
    return null;
  }
}

/**
 * Resolves an accessible preview/download URL from a stored presentation record.
 * Returns either a direct server fileUrl, an active blobUrl, or the dataUrl.
 */
export function getPresentationViewUrl(presentationRecord) {
  if (!presentationRecord) return '';
  if (presentationRecord.fileUrl) {
    return presentationRecord.fileUrl;
  }
  if (presentationRecord.dataUrl) {
    const isPdf = presentationRecord.fileType === 'pdf' || presentationRecord.filename?.toLowerCase().endsWith('.pdf');
    const mime = isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    const blob = dataUrlToBlob(presentationRecord.dataUrl, mime);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return presentationRecord.dataUrl;
  }
  return '';
}

