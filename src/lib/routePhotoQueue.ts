import { supabase } from '@/integrations/supabase/client';

const DB_NAME = 'climbtracker-active-route-db';
const DB_VERSION = 1;
const STORE_NAME = 'route-photo-queue';

export interface QueuedRoutePhotoInput {
  climbId: string;
  file: Blob;
  fileName: string;
  fileType: string;
  sessionId: string;
  userId: string;
}

export interface QueuedRoutePhoto extends QueuedRoutePhotoInput {
  createdAt: string;
  id: string;
}

interface FlushRoutePhotoQueueResult {
  failed: number;
  pending: number;
  uploaded: number;
}

function isIndexedDbAvailable() {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function createQueueId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

function openQueueDatabase(): Promise<IDBDatabase | null> {
  if (!isIndexedDbAvailable()) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('sessionId', 'sessionId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => Promise<T>,
): Promise<T | null> {
  const database = await openQueueDatabase();
  if (!database) return null;

  const transaction = database.transaction(STORE_NAME, mode);
  const store = transaction.objectStore(STORE_NAME);

  try {
    const result = await handler(store);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
    });
    return result;
  } finally {
    database.close();
  }
}

function getFileExtension(fileName: string, fileType: string) {
  const byName = fileName.split('.').pop()?.trim().toLowerCase();
  if (byName) return byName;

  if (fileType === 'image/png') return 'png';
  if (fileType === 'image/webp') return 'webp';
  return 'jpg';
}

export function getQueuedRoutePhotoStoragePath(entry: QueuedRoutePhoto) {
  const extension = getFileExtension(entry.fileName, entry.fileType);
  return `${entry.userId}/${entry.sessionId}/climbs/${entry.climbId}/${entry.id}.${extension}`;
}

async function uploadQueuedPhoto(entry: QueuedRoutePhoto) {
  const storagePath = getQueuedRoutePhotoStoragePath(entry);

  const { error: uploadError } = await supabase.storage.from('climbing-media').upload(
    storagePath,
    entry.file,
    {
      cacheControl: '3600',
      contentType: entry.fileType,
      upsert: false,
    },
  );

  if (uploadError) {
    const isDuplicate = /exists|duplicate|already/i.test(uploadError.message || '');
    if (!isDuplicate) {
      throw uploadError;
    }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('climbing-media').getPublicUrl(storagePath);

  const { data: existingAttachment, error: existingError } = await supabase
    .from('attachments')
    .select('id')
    .eq('session_id', entry.sessionId)
    .eq('climb_id', entry.climbId)
    .eq('file_url', publicUrl)
    .maybeSingle();

  if (existingError) throw existingError;

  if (!existingAttachment) {
    const { error: insertError } = await supabase.from('attachments').insert({
      climb_id: entry.climbId,
      file_url: publicUrl,
      session_id: entry.sessionId,
      type: 'photo',
      user_id: entry.userId,
    });

    if (insertError) throw insertError;
  }
}

export async function queueRoutePhotoUpload(
  input: QueuedRoutePhotoInput,
): Promise<QueuedRoutePhoto> {
  const entry: QueuedRoutePhoto = {
    ...input,
    createdAt: new Date().toISOString(),
    id: createQueueId(),
  };

  const stored = await withStore('readwrite', async (store) => {
    await requestToPromise(store.put(entry));
    return true;
  });

  if (stored === null) {
    await uploadQueuedPhoto(entry);
  }

  return entry;
}

export async function listQueuedRoutePhotos(sessionId?: string): Promise<QueuedRoutePhoto[]> {
  const result = await withStore('readonly', async (store) => {
    const allEntries = (await requestToPromise(store.getAll())) as QueuedRoutePhoto[];
    return allEntries
      .filter((entry) => (sessionId ? entry.sessionId === sessionId : true))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  });

  return result || [];
}

export async function removeQueuedRoutePhoto(photoId: string) {
  await withStore('readwrite', async (store) => {
    await requestToPromise(store.delete(photoId));
    return true;
  });
}

export async function clearQueuedRoutePhotosForSession(sessionId: string) {
  const entries = await listQueuedRoutePhotos(sessionId);
  await Promise.all(entries.map((entry) => removeQueuedRoutePhoto(entry.id)));
}

export async function flushRoutePhotoQueue(sessionId?: string): Promise<FlushRoutePhotoQueueResult> {
  const entries = await listQueuedRoutePhotos(sessionId);

  let uploaded = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      await uploadQueuedPhoto(entry);
      await removeQueuedRoutePhoto(entry.id);
      uploaded += 1;
    } catch {
      failed += 1;
    }
  }

  const pending = (await listQueuedRoutePhotos(sessionId)).length;

  return {
    failed,
    pending,
    uploaded,
  };
}
