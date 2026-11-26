const fs = require('fs');
const path = require('path');

/**
 * Lightweight Cloud Sync Service for Gyan Yatra Studio.
 * Supports:
 * 1) CLOUD_DB_URL (e.g. Firebase Realtime DB https://<project>-default-rtdb.firebaseio.com/studio_db.json)
 * 2) Firebase Firestore REST API (FIREBASE_PROJECT_ID + FIREBASE_API_KEY)
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

      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/studio/main?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, { method: 'GET' });
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
      // Never sync raw API keys or OAuth tokens inside cloud JSON unless explicitly needed
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

      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/studio/main?key=${encodeURIComponent(apiKey)}`;
      const body = {
        fields: {
          updatedAt: { stringValue: safeClone.updatedAt },
          payload: { stringValue: JSON.stringify(safeClone) }
        }
      };
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Firestore PATCH ${res.status}: ${txt.slice(0, 160)}`);
      }
      this.lastSyncAt = new Date().toISOString();
      this.lastMode = 'firestore_push';
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
