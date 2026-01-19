import type { PendingChange } from '@/types/territory';

const STORAGE_PREFIX = 'territorios_app_';
const PENDING_CHANGES_KEY = `${STORAGE_PREFIX}pending_changes`;

export function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

export function getFromLocalStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
}

export function removeFromLocalStorage(key: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

export function addPendingChange(change: Omit<PendingChange, 'id' | 'timestamp'>): void {
  const pendingChanges = getPendingChanges();
  const newChange: PendingChange = {
    ...change,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  pendingChanges.push(newChange);
  saveToLocalStorage('pending_changes', pendingChanges);
}

export function getPendingChanges(): PendingChange[] {
  return getFromLocalStorage<PendingChange[]>('pending_changes') ?? [];
}

export function removePendingChange(id: string): void {
  const pendingChanges = getPendingChanges();
  const filtered = pendingChanges.filter(change => change.id !== id);
  saveToLocalStorage('pending_changes', filtered);
}

export function clearPendingChanges(): void {
  removeFromLocalStorage('pending_changes');
}

// Check online status and sync when back online
export function setupOnlineSync(syncCallback: () => Promise<void>): () => void {
  const handleOnline = async () => {
    const pendingChanges = getPendingChanges();
    if (pendingChanges.length > 0) {
      await syncCallback();
    }
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
