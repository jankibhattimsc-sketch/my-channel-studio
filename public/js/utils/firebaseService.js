/**
 * Firebase Modular SDK v10+ Service Engine for Gyan Yatra AI Studio
 * Handles Firebase Auth (Google Sign-In), Firestore Real-Time Sync,
 * Offline Persistence, and Granular Project & Ideas Management.
 * 
 * Resilient Dynamic Loading: Zero top-level static CDN dependencies,
 * guaranteeing 100% offline and instant booting of Gyan Yatra AI Studio.
 */

let fbAppMod = null;
let fbAuthMod = null;
let fbFirestoreMod = null;

async function loadFirebaseModules() {
  if (fbAppMod && fbAuthMod && fbFirestoreMod) return true;
  try {
    const [app, auth, firestore] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore')
    ]);
    fbAppMod = app;
    fbAuthMod = auth;
    fbFirestoreMod = firestore;
    return true;
  } catch (err) {
    console.warn('[Firebase] Firebase SDK dynamic import notice (running in 100% offline local mode):', err?.message || err);
    return false;
  }
}

class FirebaseService {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.isInitialized = false;
    this.initPromise = null;
    this.currentUser = null;
    this.activeSubscriptions = new Map(); // key -> unsubscribe function
  }

  /**
   * Initialize Firebase using configuration from /api/firebase-config or environment
   */
  async initFirebase() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        let config = null;
        try {
          const res = await fetch('/api/firebase-config');
          if (res.ok) {
            config = await res.json();
          }
        } catch (fetchErr) {
          console.warn('[Firebase] Could not fetch /api/firebase-config, checking window:', fetchErr.message);
        }

        if (!config || !config.projectId) {
          config = window.__FIREBASE_CONFIG__ || {
            projectId: 'gyan-yatra-ai-studio',
            authDomain: 'gyan-yatra-ai-studio.firebaseapp.com',
            storageBucket: 'gyan-yatra-ai-studio.appspot.com'
          };
        }

        if (!config.apiKey) {
          console.warn('[Firebase] Notice: apiKey is currently empty in .env. Firebase will operate in offline/local mode until apiKey is configured.');
          return false;
        }

        const loaded = await loadFirebaseModules();
        if (!loaded) return false;

        // Initialize Firebase App
        if (!fbAppMod.getApps().length) {
          this.app = fbAppMod.initializeApp(config);
        } else {
          this.app = fbAppMod.getApp();
        }

        // Initialize Auth
        this.auth = fbAuthMod.getAuth(this.app);

        // Initialize Firestore with robust multi-tab offline caching
        try {
          this.db = fbFirestoreMod.initializeFirestore(this.app, {
            localCache: fbFirestoreMod.persistentLocalCache({
              tabManager: fbFirestoreMod.persistentMultipleTabManager()
            })
          });
        } catch (cacheErr) {
          // If already initialized or unsupported, fallback to standard getFirestore
          console.warn('[Firebase Firestore] Multi-tab cache notice (using standard instance):', cacheErr.message);
          this.db = fbFirestoreMod.getFirestore(this.app);
        }

        this.isInitialized = true;
        console.log('[Firebase] Initialized successfully with project:', config.projectId);
        return true;
      } catch (err) {
        console.error('[Firebase Init Error]:', err);
        this.isInitialized = false;
        return false;
      }
    })();

    return this.initPromise;
  }

  // --- AUTHENTICATION ---

  getAuthUID() {
    return this.currentUser?.uid || this.auth?.currentUser?.uid || null;
  }

  getCurrentUser() {
    return this.currentUser || this.auth?.currentUser || null;
  }

  onAuthChange(callback) {
    if (!this.auth) {
      // If auth not ready yet, wait for init
      this.initFirebase().then(() => {
        if (this.auth && fbAuthMod) {
          fbAuthMod.onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            callback(user);
          });
        } else {
          callback(null);
        }
      });
      return () => {};
    }

    if (!fbAuthMod) return () => {};
    return fbAuthMod.onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      callback(user);
    });
  }

  async signInWithGoogle() {
    await this.initFirebase();
    if (!this.auth || !fbAuthMod) {
      throw new Error('Firebase Auth not available. Please verify Firebase API Key in settings or .env.');
    }

    const provider = new fbAuthMod.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    try {
      const result = await fbAuthMod.signInWithPopup(this.auth, provider);
      this.currentUser = result.user;
      await this.recordUserProfile(result.user);
      return result.user;
    } catch (popupErr) {
      if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user') {
        console.warn('[Firebase Auth] Popup blocked/closed, attempting redirect...');
        return fbAuthMod.signInWithRedirect(this.auth, provider);
      }
      throw popupErr;
    }
  }

  async signOutUser() {
    if (!this.auth || !fbAuthMod) return;
    this.clearAllSubscriptions();
    await fbAuthMod.signOut(this.auth);
    this.currentUser = null;
  }

  async recordUserProfile(user) {
    if (!this.db || !fbFirestoreMod || !user?.uid) return;
    try {
      const userRef = fbFirestoreMod.doc(this.db, 'users', user.uid);
      await fbFirestoreMod.setDoc(userRef, {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        schemaVersion: 1,
        updatedAt: fbFirestoreMod.serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('[Firebase] Could not update user profile metadata:', err.message);
    }
  }

  // --- REAL-TIME SUBSCRIPTIONS & LISTENERS ---

  subscribeProjects(uid, onUpdate, onError) {
    if (!this.db || !fbFirestoreMod || !uid) return () => {};

    const subKey = `projects_${uid}`;
    if (this.activeSubscriptions.has(subKey)) {
      this.activeSubscriptions.get(subKey)();
    }

    const projectsColl = fbFirestoreMod.collection(this.db, 'users', uid, 'projects');
    const unsub = fbFirestoreMod.onSnapshot(projectsColl, (snapshot) => {
      const projects = [];
      snapshot.forEach(docSnap => {
        projects.push({ ...docSnap.data(), id: docSnap.id });
      });
      onUpdate(projects);
    }, (err) => {
      console.warn('[Firebase Projects Subscription Error]:', err.message);
      if (typeof onError === 'function') onError(err);
    });

    this.activeSubscriptions.set(subKey, unsub);
    return unsub;
  }

  subscribeIdeas(uid, projectId, onUpdate, onError) {
    if (!this.db || !fbFirestoreMod || !uid || !projectId) return () => {};

    const subKey = `ideas_${uid}_${projectId}`;
    if (this.activeSubscriptions.has(subKey)) {
      this.activeSubscriptions.get(subKey)();
    }

    const ideasColl = fbFirestoreMod.collection(this.db, 'users', uid, 'projects', projectId, 'ideas');
    const q = fbFirestoreMod.query(ideasColl, fbFirestoreMod.orderBy('order', 'asc'));

    const unsub = fbFirestoreMod.onSnapshot(q, (snapshot) => {
      const ideas = [];
      snapshot.forEach(docSnap => {
        ideas.push({ ...docSnap.data(), id: docSnap.id });
      });
      onUpdate(ideas);
    }, (err) => {
      // If index or order fails, fallback to simple collection snapshot
      console.warn('[Firebase Ideas Sub Order fallback]:', err.message);
      const simpleUnsub = fbFirestoreMod.onSnapshot(ideasColl, (simpleSnap) => {
        const fallbackIdeas = [];
        simpleSnap.forEach(d => fallbackIdeas.push({ ...d.data(), id: d.id }));
        onUpdate(fallbackIdeas);
      }, onError);
      this.activeSubscriptions.set(subKey, simpleUnsub);
    });

    this.activeSubscriptions.set(subKey, unsub);
    return unsub;
  }

  clearAllSubscriptions() {
    this.activeSubscriptions.forEach(unsub => {
      try { unsub(); } catch (_) {}
    });
    this.activeSubscriptions.clear();
  }

  // --- FIRESTORE CRUD OPERATIONS ---

  async saveProjectDoc(uid, project) {
    if (!this.db || !fbFirestoreMod || !uid || !project?.id) return false;

    try {
      const projRef = fbFirestoreMod.doc(this.db, 'users', uid, 'projects', project.id);
      const payload = {
        id: project.id,
        name: project.name || 'નવો પ્રોજેક્ટ',
        topic: project.topic || project.name || '',
        folderId: project.folderId || 'f_default',
        folderName: project.folderName || '📁 મુખ્ય ફોલ્ડર',
        category: project.category || 'સરકારી યોજના',
        lastStep: project.lastStep || 'topics',
        isArchived: Boolean(project.isArchived),
        clientUpdatedAt: project.updatedAt || new Date().toISOString(),
        updatedAt: fbFirestoreMod.serverTimestamp()
      };

      if (project.workspaceState) {
        payload.workspaceState = {
          activeSection: project.workspaceState.activeSection || 'overview',
          lastSlideIndex: Number(project.workspaceState.lastSlideIndex) || 0,
          lastScriptSectionIdx: Number(project.workspaceState.lastScriptSectionIdx) || 0,
          lastSelectedThumbId: project.workspaceState.lastSelectedThumbId || null,
          lastSEODraftId: project.workspaceState.lastSEODraftId || null,
          scrollOffset: Number(project.workspaceState.scrollOffset) || 0,
          completionStatus: project.workspaceState.completionStatus || {},
          lastSavedAt: project.workspaceState.lastSavedAt || new Date().toISOString()
        };
      }

      if (project.idea) {
        payload.ideaSummary = {
          topic: project.idea.topic || project.topic || '',
          masterPrompt: (project.idea.masterPrompt || '').substring(0, 300),
          notes: (project.idea.notes || '').substring(0, 300),
          isCompleted: Boolean(project.idea.isCompleted)
        };
      }

      await fbFirestoreMod.setDoc(projRef, payload, { merge: true });
      return true;
    } catch (err) {
      console.error('[Firebase saveProjectDoc Error]:', err);
      return false;
    }
  }

  async saveIdeaDoc(uid, projectId, idea) {
    if (!this.db || !fbFirestoreMod || !uid || !projectId || !idea?.id) return false;

    try {
      const ideaRef = fbFirestoreMod.doc(this.db, 'users', uid, 'projects', projectId, 'ideas', idea.id);
      const payload = {
        id: idea.id,
        projectId,
        title: (idea.title || '').trim(),
        description: idea.description || '',
        originalText: idea.originalText || '',
        inputType: idea.inputType || 'manual',
        category: idea.category || '',
        tags: Array.isArray(idea.tags) ? idea.tags : [],
        source: idea.source || '',
        sourceUrl: idea.sourceUrl || '',
        timezone: 'Asia/Kolkata',
        isArchived: Boolean(idea.isArchived),
        cropSnippet: idea.cropSnippet || '',
        views48h: (typeof idea.views48h === 'number' && !isNaN(idea.views48h)) ? idea.views48h : (idea.views48h ? Number(idea.views48h) : null),
        views60m: (typeof idea.views60m === 'number' && !isNaN(idea.views60m)) ? idea.views60m : (idea.views60m ? Number(idea.views60m) : null),
        previousViews48h: (typeof idea.previousViews48h === 'number') ? idea.previousViews48h : null,
        velocityPerHour: (typeof idea.velocityPerHour === 'number') ? idea.velocityPerHour : null,
        growthPct: (typeof idea.growthPct === 'number') ? idea.growthPct : null,
        classification: idea.classification || 'Insufficient Data',
        analysisReason: idea.analysisReason || '',
        isConfidenceVerified: idea.isConfidenceVerified !== undefined ? Boolean(idea.isConfidenceVerified) : true,
        confidenceScore: typeof idea.confidenceScore === 'number' ? idea.confidenceScore : null,
        uncertainFields: Array.isArray(idea.uncertainFields) ? idea.uncertainFields : [],
        notes: idea.notes || '',
        referenceLinks: Array.isArray(idea.referenceLinks) ? idea.referenceLinks : [],
        isSelected: Boolean(idea.isSelected),
        order: Number(idea.order) || 0,
        capturedAt: idea.capturedAt || null,
        sourcePublishedAt: idea.sourcePublishedAt || null,
        analyzedAt: idea.analyzedAt || null,
        createdAt: idea.createdAt || new Date().toISOString(),
        clientUpdatedAt: new Date().toISOString(),
        updatedAt: fbFirestoreMod.serverTimestamp()
      };

      await fbFirestoreMod.setDoc(ideaRef, payload, { merge: true });
      return true;
    } catch (err) {
      console.error('[Firebase saveIdeaDoc Error]:', err);
      return false;
    }
  }

  /**
   * Saves a distinct history snapshot to subcollection:
   * users/{uid}/projects/{projectId}/ideas/{ideaId}/history/{historyId}
   */
  async saveIdeaHistoryDoc(uid, projectId, ideaId, snapshot = {}) {
    if (!this.db || !fbFirestoreMod || !uid || !projectId || !ideaId) return false;

    try {
      const historyId = snapshot.historyId || `hist_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const histRef = fbFirestoreMod.doc(this.db, 'users', uid, 'projects', projectId, 'ideas', ideaId, 'history', historyId);
      
      const payload = {
        historyId,
        ideaId,
        projectId,
        views48h: (typeof snapshot.views48h === 'number') ? snapshot.views48h : null,
        views60m: (typeof snapshot.views60m === 'number') ? snapshot.views60m : null,
        velocityPerHour: (typeof snapshot.velocityPerHour === 'number') ? snapshot.velocityPerHour : null,
        growthPct: (typeof snapshot.growthPct === 'number') ? snapshot.growthPct : null,
        classification: snapshot.classification || 'Insufficient Data',
        analysisReason: snapshot.analysisReason || '',
        trigger: snapshot.trigger || 'manual_update',
        timestamp: snapshot.timestamp || new Date().toISOString(),
        capturedAt: snapshot.capturedAt || null,
        sourcePublishedAt: snapshot.sourcePublishedAt || null,
        analyzedAt: snapshot.analyzedAt || new Date().toISOString(),
        createdAt: fbFirestoreMod.serverTimestamp()
      };

      await fbFirestoreMod.setDoc(histRef, payload);
      return historyId;
    } catch (err) {
      console.warn('[Firebase saveIdeaHistoryDoc Notice]:', err.message);
      return null;
    }
  }

  /**
   * Retrieves historical observation snapshots for an idea
   */
  async getIdeaHistory(uid, projectId, ideaId) {
    if (!this.db || !fbFirestoreMod || !uid || !projectId || !ideaId) return [];

    try {
      const histColl = fbFirestoreMod.collection(this.db, 'users', uid, 'projects', projectId, 'ideas', ideaId, 'history');
      const snap = await fbFirestoreMod.getDocs(histColl);
      const list = [];
      snap.forEach(d => list.push({ ...d.data(), id: d.id }));
      return list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    } catch (err) {
      console.warn('[Firebase getIdeaHistory Notice]:', err.message);
      return [];
    }
  }

  /**
   * Reversible Migration: Migrates existing project.ideas array to the subcollection
   * users/{uid}/projects/{projectId}/ideas/{ideaId} without deleting original data.
   */
  async migrateProjectIdeasSubcollection(uid, projectId, localProject) {
    if (!this.db || !fbFirestoreMod || !uid || !projectId || !localProject) {
      return { success: false, reason: 'Missing required parameters' };
    }

    try {
      // 1. Fetch existing ideas in cloud subcollection
      const existingCloudIdeas = await this.getCloudIdeas(uid, projectId);
      const existingCloudMap = new Map(existingCloudIdeas.map(item => [item.id, item]));
      const beforeCount = existingCloudIdeas.length;

      // 2. Identify candidate local ideas (from project.ideas or legacyIdeasBackup)
      const localIdeas = Array.isArray(localProject.ideas) 
        ? localProject.ideas 
        : (Array.isArray(localProject.legacyIdeasBackup) ? localProject.legacyIdeasBackup : []);

      let migratedCount = 0;
      for (const idea of localIdeas) {
        if (!idea || !idea.id) continue;
        
        // Never overwrite existing cloud record if it already exists
        if (!existingCloudMap.has(idea.id)) {
          await this.saveIdeaDoc(uid, projectId, idea);
          migratedCount++;
        }
      }

      // 3. Keep old array preserved as legacyIdeasBackup in project document for safety
      const projRef = fbFirestoreMod.doc(this.db, 'users', uid, 'projects', projectId);
      await fbFirestoreMod.setDoc(projRef, {
        legacyIdeasBackup: localIdeas,
        hasMigratedIdeasSubcollection: true,
        ideasSubcollectionMigratedAt: new Date().toISOString()
      }, { merge: true });

      const afterIdeas = await this.getCloudIdeas(uid, projectId);
      const afterCount = afterIdeas.length;

      console.log(`[Firebase Migration] Project ${projectId}: before=${beforeCount}, migrated=${migratedCount}, after=${afterCount}`);
      return {
        success: true,
        beforeCount,
        migratedCount,
        afterCount,
        isVerified: afterCount >= beforeCount
      };
    } catch (err) {
      console.error('[Firebase Subcollection Migration Error]:', err);
      return { success: false, error: err.message };
    }
  }

  async deleteIdeaDoc(uid, projectId, ideaId) {
    if (!this.db || !fbFirestoreMod || !uid || !projectId || !ideaId) return false;

    try {
      const ideaRef = fbFirestoreMod.doc(this.db, 'users', uid, 'projects', projectId, 'ideas', ideaId);
      await fbFirestoreMod.deleteDoc(ideaRef);
      return true;
    } catch (err) {
      console.error('[Firebase deleteIdeaDoc Error]:', err);
      return false;
    }
  }

  async deleteProjectDoc(uid, projectId) {
    if (!this.db || !fbFirestoreMod || !uid || !projectId) return false;

    try {
      const projRef = fbFirestoreMod.doc(this.db, 'users', uid, 'projects', projectId);
      await fbFirestoreMod.deleteDoc(projRef);
      return true;
    } catch (err) {
      console.error('[Firebase deleteProjectDoc Error]:', err);
      return false;
    }
  }

  async getCloudProjects(uid) {
    if (!this.db || !fbFirestoreMod || !uid) return [];

    try {
      const collRef = fbFirestoreMod.collection(this.db, 'users', uid, 'projects');
      const snap = await fbFirestoreMod.getDocs(collRef);
      const projects = [];
      snap.forEach(d => projects.push({ ...d.data(), id: d.id }));
      return projects;
    } catch (err) {
      console.warn('[Firebase getCloudProjects Error]:', err.message);
      return [];
    }
  }

  async getCloudIdeas(uid, projectId) {
    if (!this.db || !fbFirestoreMod || !uid || !projectId) return [];

    try {
      const collRef = fbFirestoreMod.collection(this.db, 'users', uid, 'projects', projectId, 'ideas');
      const snap = await fbFirestoreMod.getDocs(collRef);
      const ideas = [];
      snap.forEach(d => ideas.push({ ...d.data(), id: d.id }));
      return ideas.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (err) {
      console.warn('[Firebase getCloudIdeas Error]:', err.message);
      return [];
    }
  }

  async saveProjectWorkspaceState(uid, projectId, workspaceState) {
    if (!this.db || !fbFirestoreMod || !uid || !projectId || !workspaceState) return false;
    try {
      const projRef = fbFirestoreMod.doc(this.db, 'users', uid, 'projects', projectId);
      await fbFirestoreMod.setDoc(projRef, {
        workspaceState: {
          activeSection: workspaceState.activeSection || 'overview',
          lastSlideIndex: Number(workspaceState.lastSlideIndex) || 0,
          lastScriptSectionIdx: Number(workspaceState.lastScriptSectionIdx) || 0,
          lastSelectedThumbId: workspaceState.lastSelectedThumbId || null,
          lastSEODraftId: workspaceState.lastSEODraftId || null,
          scrollOffset: Number(workspaceState.scrollOffset) || 0,
          completionStatus: workspaceState.completionStatus || {},
          lastSavedAt: workspaceState.lastSavedAt || new Date().toISOString()
        },
        clientUpdatedAt: new Date().toISOString(),
        updatedAt: fbFirestoreMod.serverTimestamp()
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn('[Firebase saveProjectWorkspaceState Error]:', err.message);
      return false;
    }
  }

  async saveProjectVersionDoc(uid, projectId, type, versionData) {
    if (!this.db || !fbFirestoreMod || !uid || !projectId || !type || !versionData?.versionId) return false;
    try {
      const collName = `versions_${type}`;
      const vRef = fbFirestoreMod.doc(this.db, 'users', uid, 'projects', projectId, collName, versionData.versionId);
      await fbFirestoreMod.setDoc(vRef, {
        ...versionData,
        createdAt: fbFirestoreMod.serverTimestamp()
      });
      return true;
    } catch (err) {
      console.warn('[Firebase saveProjectVersionDoc Error]:', err.message);
      return false;
    }
  }

  async getProjectVersions(uid, projectId, type) {
    if (!this.db || !fbFirestoreMod || !uid || !projectId || !type) return [];
    try {
      const collName = `versions_${type}`;
      const collRef = fbFirestoreMod.collection(this.db, 'users', uid, 'projects', projectId, collName);
      const snap = await fbFirestoreMod.getDocs(collRef);
      const list = [];
      snap.forEach(d => list.push({ ...d.data(), id: d.id }));
      return list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    } catch (err) {
      console.warn('[Firebase getProjectVersions Error]:', err.message);
      return [];
    }
  }
}

export const firebaseService = new FirebaseService();
