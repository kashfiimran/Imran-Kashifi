/**
 * IndexedDBStorage provides persistent storage for controller layouts,
 * settings, runtime manifests, and diagnostic logs.
 */

const DB_NAME = 'gtav_web_player_db';
const DB_VERSION = 1;

export interface PlayerSettings {
  renderer: 'auto' | 'webgpu' | 'webgl2';
  resolutionScale: number; // 0.5 to 1.5
  textureQuality: 'low' | 'medium' | 'high';
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  effectsQuality: 'low' | 'medium' | 'high';
  performanceMode: 'auto' | 'low' | 'medium' | 'high';
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  controllerOpacity: number;
  controllerScale: number;
  swapThumbsticks: boolean;
  vehicleMode: boolean;
}

export const DEFAULT_SETTINGS: PlayerSettings = {
  renderer: 'auto',
  resolutionScale: 1.0,
  textureQuality: 'medium',
  shadowQuality: 'medium',
  effectsQuality: 'medium',
  performanceMode: 'auto',
  masterVolume: 80,
  musicVolume: 70,
  sfxVolume: 85,
  controllerOpacity: 75,
  controllerScale: 1.0,
  swapThumbsticks: false,
  vehicleMode: false,
};

export class IndexedDBStorage {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('manifests')) {
          db.createObjectStore('manifests', { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains('logs')) {
          db.createObjectStore('logs', { autoIncrement: true });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  public static async getSettings(): Promise<PlayerSettings> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const req = store.get('player_settings');
        req.onsuccess = () => resolve({ ...DEFAULT_SETTINGS, ...(req.result || {}) });
        req.onerror = () => resolve(DEFAULT_SETTINGS);
      });
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public static async saveSettings(settings: Partial<PlayerSettings>): Promise<void> {
    try {
      const db = await this.getDB();
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      return new Promise((resolve, reject) => {
        const tx = db.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        const req = store.put(updated, 'player_settings');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to save settings to IndexedDB:', e);
    }
  }

  public static async appendLog(message: string, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('logs', 'readwrite');
      const store = tx.objectStore('logs');
      store.add({ timestamp: Date.now(), level, message });
    } catch {
      // Ignore if DB fails
    }
  }

  public static async getLogs(limit = 100): Promise<Array<{ timestamp: number; level: string; message: string }>> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('logs', 'readonly');
        const store = tx.objectStore('logs');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          resolve(list.slice(-limit));
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public static async clearAll(): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['settings', 'manifests', 'logs'], 'readwrite');
      tx.objectStore('settings').clear();
      tx.objectStore('manifests').clear();
      tx.objectStore('logs').clear();
    } catch (e) {
      console.warn('Failed to clear IndexedDB:', e);
    }
  }
}
