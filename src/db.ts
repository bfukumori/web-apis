import { z } from 'zod';

interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  readonly sync: SyncManager;
}

function supportsBackgroundSync(
  reg: ServiceWorkerRegistration,
): reg is ServiceWorkerRegistrationWithSync {
  return 'sync' in reg && typeof (reg as ServiceWorkerRegistrationWithSync).sync?.register === 'function';
}

export const InspectionItemSchema = z.object({
  id: z.uuid(),
  endpoint: z.url(),
  notes: z.string().min(1),
  photoBlob: z.instanceof(Blob),
  status: z.enum(['pending', 'failed']),
  createdAt: z.number(),
});

export type InspectionItem = z.infer<typeof InspectionItemSchema>;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FieldAppDB', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('sync_queue', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueItem(rawItem: unknown): Promise<void> {
  const item = InspectionItemSchema.parse(rawItem);
  const db = await openDB();
  const tx = db.transaction('sync_queue', 'readwrite');
  tx.objectStore('sync_queue').put(item);

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && supportsBackgroundSync(reg)) {
      await reg.sync.register('sync-inspections');
    }
  }
}