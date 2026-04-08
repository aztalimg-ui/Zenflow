/* ═══════════════════════════════════════════════════
   ZENFLOW — Firebase Cloud Sync
   ═══════════════════════════════════════════════════ */

const firebaseConfig = {
    apiKey: "AIzaSyD798gY9DvPN7VarTSGbGiDLlWzuHgMH2A",
    authDomain: "zenflow-e1110.firebaseapp.com",
    projectId: "zenflow-e1110",
    storageBucket: "zenflow-e1110.firebasestorage.app",
    messagingSenderId: "974657383126",
    appId: "1:974657383126:web:3f90caa6a2d10965213777",
    measurementId: "G-PQ805YHYWJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ──── CLOUD SYNC MODULE ────
const CloudSync = {
    userId: null,
    ready: false,
    syncInProgress: false,
    lastSyncTime: null,

    // Initialize anonymous auth & first sync
    async init() {
        try {
            // Sign in anonymously so each user gets their own data
            const userCredential = await firebase.auth().signInAnonymously();
            this.userId = userCredential.user.uid;
            this.ready = true;

            // Listen for auth state changes
            firebase.auth().onAuthStateChanged((user) => {
                if (user) {
                    this.userId = user.uid;
                    this.ready = true;
                    this.updateSyncBadge('connected');
                    console.log('[CloudSync] Connected as', user.uid);
                } else {
                    this.ready = false;
                    this.updateSyncBadge('disconnected');
                }
            });

            // Pull cloud data on first load
            await this.pullAll();
            this.updateSyncBadge('connected');

        } catch (err) {
            console.warn('[CloudSync] Init failed:', err.message);
            this.updateSyncBadge('error');
        }
    },

    // Get Firestore document reference for the current user
    userDoc() {
        if (!this.userId) return null;
        return db.collection('users').doc(this.userId);
    },

    // ──── SAVE to cloud ────
    async save(key, data) {
        if (!this.ready || !this.userId) return;
        try {
            await this.userDoc().collection('data').doc(key).set({
                value: JSON.stringify(data),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.lastSyncTime = new Date();
            this.updateSyncBadge('synced');
        } catch (err) {
            console.warn(`[CloudSync] Save "${key}" failed:`, err.message);
            this.updateSyncBadge('error');
        }
    },

    // ──── LOAD from cloud ────
    async load(key) {
        if (!this.ready || !this.userId) return null;
        try {
            const doc = await this.userDoc().collection('data').doc(key).get();
            if (doc.exists) {
                return JSON.parse(doc.data().value);
            }
        } catch (err) {
            console.warn(`[CloudSync] Load "${key}" failed:`, err.message);
        }
        return null;
    },

    // ──── PULL all data from cloud to localStorage ────
    async pullAll() {
        if (!this.ready) return;
        this.syncInProgress = true;
        this.updateSyncBadge('syncing');

        const keys = ['tasks', 'categories', 'pomo', 'activity', 'ai_threads'];
        let pulled = 0;

        for (const key of keys) {
            const cloudData = await this.load(key);
            if (cloudData !== null) {
                // Cloud data exists — use it (cloud is the source of truth)
                const localData = Store.get(key, null);
                if (localData === null || JSON.stringify(localData) !== JSON.stringify(cloudData)) {
                    Store.set(key, cloudData);
                    pulled++;
                }
            } else {
                // No cloud data — push local to cloud
                const localData = Store.get(key, null);
                if (localData !== null) {
                    await this.save(key, localData);
                }
            }
        }

        this.syncInProgress = false;
        this.lastSyncTime = new Date();

        if (pulled > 0) {
            // Re-render the app with cloud data
            if (typeof app !== 'undefined' && app.renderAll) {
                app.renderAll();
                if (app.currentView === 'calendar') app.renderCalendar();
            }
        }

        this.updateSyncBadge('connected');
    },

    // ──── PUSH all local data to cloud ────
    async pushAll() {
        if (!this.ready) return;
        this.updateSyncBadge('syncing');

        const keys = ['tasks', 'categories', 'pomo', 'activity', 'ai_threads'];

        for (const key of keys) {
            const localData = Store.get(key, null);
            if (localData !== null) {
                await this.save(key, localData);
            }
        }

        this.updateSyncBadge('connected');
    },

    // ──── UI badge ────
    updateSyncBadge(status) {
        const badge = document.getElementById('cloudSyncBadge');
        if (!badge) return;

        const dot = badge.querySelector('.sync-dot');
        const text = badge.querySelector('.sync-text');
        if (!dot || !text) return;

        badge.classList.remove('hidden');
        dot.className = 'sync-dot';

        switch (status) {
            case 'connected':
                dot.classList.add('connected');
                text.textContent = i18n.t('sync_connected') || '☁️ Synced';
                break;
            case 'syncing':
                dot.classList.add('syncing');
                text.textContent = i18n.t('sync_syncing') || '⏳ Syncing...';
                break;
            case 'synced':
                dot.classList.add('connected');
                text.textContent = i18n.t('sync_connected') || '☁️ Synced';
                break;
            case 'error':
                dot.classList.add('error');
                text.textContent = i18n.t('sync_error') || '⚠️ Offline';
                break;
            case 'disconnected':
                dot.classList.add('error');
                text.textContent = i18n.t('sync_disconnected') || '☁️ Disconnected';
                break;
        }
    }
};
