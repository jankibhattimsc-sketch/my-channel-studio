const path = require('path');

const FIRESTORE_CHUNK_SIZE = 250000; // 250k UTF-16 chars <= 750KB UTF-8 even for 3-byte Gujarati text

/**
 * Lightweight Cloud Sync Service for Gyan Yatra Studio.
 * Supports:
 * 1) CLOUD_DB_URL (e.g. Firebase Realtime DB https://<project>-default-rtdb.firebaseio.com/studio_db.json)
 * 2) Firebase Firestore REST API (FIREBASE_PROJECT_ID + FIREBASE_API_KEY) with automatic chunking
 * Non-blocking: local database.json always remains primary so offline/local mode never breaks.
 */
class CloudSyncService {
  constructor() {
    this.lastSyncAt = null;
    this.lastError = null;
    this.lastMode = 'local-only';
    this.debounceTimer = null;
  }

  getConfig() {
    const cloudDbUrl = (process.env.CLOUD_DB_URL || '').trim();
    const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
    const apiKey = (process.env.FIREBASE_API_KEY || '').trim();
    return { cloudDbUrl, projectId, apiKey };
  }

  isConfigured() {
    const { cloudDbUrl, projectId, apiKey } = this.getConfig();
    return Boolean(cloudDbUrl || (projectId && apiKey));
  }

  getStatus() {
    const { cloudDbUrl, projectId, apiKey } = this.getConfig();
    return {
      configured: this.isConfigured(),
      mode: cloudDbUrl ? 'cloud_db_url' : (projectId && apiKey ? 'firestore_rest' : 'local_only'),
      projectId: projectId || null,
      hasCloudDbUrl: Boolean(cloudDbUrl),
      dataDir: process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data'),
      lastSyncAt: this.lastSyncAt,
      lastMode: this.lastMode,
      lastError: this.lastError
    };
  }

  firestoreDocUrl(projectId, apiKey, docId) {
    return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/studio/${encodeURIComponent(docId)}?key=${encodeURIComponent(apiKey)}`;
  }

  async pullDatabase() {
    const { cloudDbUrl, projectId, apiKey } = this.getConfig();
    if (!this.isConfigured()) return null;

    try {
      if (cloudDbUrl) {
        const res = await fetch(cloudDbUrl, { method: 'GET' });
        if (!res.ok) throw new Error(`CLOUD_DB_URL GET ${res.status}`);
        const json = await res.json();
        if (json && typeof json === 'object' && (json.centralTopics || json.topics || json.settings)) {
          this.lastSyncAt = new Date().toISOString();
          this.lastMode = 'cloud_db_url_pull';
          this.lastError = null;
          return json;
        }
        return null;
      }

      // Check chunked manifest first
      const manifestRes = await fetch(this.firestoreDocUrl(projectId, apiKey, 'manifest'), { method: 'GET' });
      if (manifestRes.ok) {
        const manifestDoc = await manifestRes.json();
        const chunkCount = Number(manifestDoc?.fields?.chunkCount?.integerValue || 0);
        if (chunkCount > 0) {
          let assembled = '';
          for (let i = 0; i < chunkCount; i++) {
            const cRes = await fetch(this.firestoreDocUrl(projectId, apiKey, `chunk_${i}`), { method: 'GET' });
            if (!cRes.ok) throw new Error(`Firestore chunk_${i} GET ${cRes.status}`);
            const cDoc = await cRes.json();
            assembled += (cDoc?.fields?.data?.stringValue || '');
          }
          const parsed = JSON.parse(assembled);
          this.lastSyncAt = new Date().toISOString();
          this.lastMode = 'firestore_pull';
          this.lastError = null;
          return parsed;
        }
      }

      // Fallback to single legacy doc
      const res = await fetch(this.firestoreDocUrl(projectId, apiKey, 'main'), { method: 'GET' });
      if (res.status === 404) return null;
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Firestore GET ${res.status}: ${txt.slice(0, 160)}`);
      }
      const doc = await res.json();
      const rawPayload = doc?.fields?.payload?.stringValue;
      if (!rawPayload) return null;
      const parsed = JSON.parse(rawPayload);
      this.lastSyncAt = new Date().toISOString();
      this.lastMode = 'firestore_pull';
      this.lastError = null;
      return parsed;
    } catch (err) {
      this.lastError = err.message;
      console.warn('[CloudSync] Pull skipped/failed:', err.message);
      return null;
    }
  }

  async pushDatabase(data) {
    const { cloudDbUrl, projectId, apiKey } = this.getConfig();
    if (!this.isConfigured() || !data) return false;

    try {
      const safeClone = {
        ...data,
        updatedAt: new Date().toISOString()
      };

      if (cloudDbUrl) {
        const res = await fetch(cloudDbUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(safeClone)
        });
        if (!res.ok) throw new Error(`CLOUD_DB_URL PUT ${res.status}`);
        this.lastSyncAt = new Date().toISOString();
        this.lastMode = 'cloud_db_url_push';
        this.lastError = null;
        return true;
      }

      const raw = JSON.stringify(safeClone);
      const chunks = [];
      for (let i = 0; i < raw.length; i += FIRESTORE_CHUNK_SIZE) {
        chunks.push(raw.slice(i, i + FIRESTORE_CHUNK_SIZE));
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunkRes = await fetch(this.firestoreDocUrl(projectId, apiKey, `chunk_${i}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              index: { integerValue: String(i) },
              data: { stringValue: chunks[i] }
            }
          })
        });
        if (!chunkRes.ok) {
          const txt = await chunkRes.text().catch(() => '');
          throw new Error(`Firestore chunk_${i} PATCH ${chunkRes.status}: ${txt.slice(0, 160)}`);
        }
      }

      const manifestRes = await fetch(this.firestoreDocUrl(projectId, apiKey, 'manifest'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            updatedAt: { stringValue: safeClone.updatedAt },
            chunkCount: { integerValue: String(chunks.length) },
            totalBytes: { integerValue: String(raw.length) }
          }
        })
      });
      if (!manifestRes.ok) {
        const txt = await manifestRes.text().catch(() => '');
        throw new Error(`Firestore manifest PATCH ${manifestRes.status}: ${txt.slice(0, 160)}`);
      }

      this.lastSyncAt = new Date().toISOString();
      this.lastMode = `firestore_push_${chunks.length}_chunks`;
      this.lastError = null;
      return true;
    } catch (err) {
      this.lastError = err.message;
      console.warn('[CloudSync] Push skipped/failed:', err.message);
      return false;
    }
  }

  schedulePush(data) {
    if (!this.isConfigured()) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.pushDatabase(data).catch(() => {});
    }, 1200);
    if (this.debounceTimer.unref) this.debounceTimer.unref();
  }
}

module.exports = new CloudSyncService();
