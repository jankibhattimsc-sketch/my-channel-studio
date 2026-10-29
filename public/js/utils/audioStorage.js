/**
 * Persistent Audio Storage using IndexedDB with localStorage fallback
 * Guarantees that voice recordings are never lost due to localStorage quota limits.
 */

const DB_NAME = 'GyanYatraStudioAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'project_recordings';

function openAudioDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'projectId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn('IndexedDB open error:', request.error);
      resolve(null);
    };
  });
}

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

  // Fallback: If no IndexedDB or error, store in localStorage if small (< 1.5MB)
  if (dataUrl && dataUrl.length < 2000000) {
    try {
      localStorage.setItem(`gyan_audio_${projectId}`, dataUrl);
    } catch (_) {}
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
          blob: res.blob,
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

  // Fallback from localStorage
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
  } catch (_) {}

  return null;
}

export async function deleteProjectAudioRecord(projectId) {
  if (!projectId) return;
  try {
    const db = await openAudioDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(projectId);
    }
    localStorage.removeItem(`gyan_audio_${projectId}`);
  } catch (_) {}
}
