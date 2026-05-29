import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'physics-learning-db';
const STORE_NAME = 'physics-store';
const MAX_DB_SIZE = 200 * 1024 * 1024;

interface PhysicsDBSchema extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: unknown;
  };
}

let dbPromise: Promise<IDBPDatabase<PhysicsDBSchema>> | null = null;

async function getDB(): Promise<IDBPDatabase<PhysicsDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<PhysicsDBSchema>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

function checkDBSize(): void {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    navigator.storage.estimate().then((estimate) => {
      if (estimate.usage && estimate.usage > MAX_DB_SIZE) {
        console.warn('IndexedDB storage limit approaching. Please clean up old data.');
      }
    });
  }
}

export const storage = {
  getLocal<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  setLocal<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.error('Failed to save to localStorage');
    }
  },

  removeLocal(key: string): void {
    localStorage.removeItem(key);
  },

  async getDB<T>(key: string): Promise<T | null> {
    try {
      const db = await getDB();
      const value = await db.get(STORE_NAME, key);
      return (value as T) || null;
    } catch {
      return null;
    }
  },

  async setDB<T>(key: string, value: T): Promise<void> {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, value, key);
      checkDBSize();
    } catch {
      console.error('Failed to save to IndexedDB');
    }
  },

  async removeDB(key: string): Promise<void> {
    try {
      const db = await getDB();
      await db.delete(STORE_NAME, key);
    } catch {
      console.error('Failed to remove from IndexedDB');
    }
  },

  async clearDB(): Promise<void> {
    try {
      const db = await getDB();
      await db.clear(STORE_NAME);
    } catch {
      console.error('Failed to clear IndexedDB');
    }
  },
};
