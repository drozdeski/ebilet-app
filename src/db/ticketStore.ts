import {StorageStats, TrainTicket} from '../types/ticket';

const DB_NAME = 'BiletyETravelDB';
const DB_VERSION = 2;
const STORE_TICKETS = 'tickets';
const STORE_SETTINGS = 'settings';
const MIRROR_STORAGE_KEY = 'bilety_etravel_tickets_mirror_v2';
const DELETED_IDS_KEY = 'bilety_etravel_deleted_ids_v2';
const LEGACY_SAMPLE_PURGED_KEY = 'bilety_etravel_purged_samples_v2';

// Legacy sample IDs from earlier versions
const LEGACY_SAMPLE_IDS = ['etravel-wl-95054990', 'etravel-wl-95054982'];

function getDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function markIdDeleted(id: string): void {
  try {
    const set = getDeletedIds();
    set.add(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore storage errors
  }
}

function unmarkIdDeleted(id: string): void {
  try {
    const set = getDeletedIds();
    if (set.has(id)) {
      set.delete(id);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {
    // ignore
  }
}

function saveMirror(tickets: TrainTicket[]): void {
  try {
    // Save lightweight mirror without huge PDF base64 if quota is tight, or full if it fits
    localStorage.setItem(MIRROR_STORAGE_KEY, JSON.stringify(tickets));
  } catch {
    try {
      const lightweight = tickets.map((t) => ({
        ...t,
        attachmentDataUrl: undefined,
      }));
      localStorage.setItem(MIRROR_STORAGE_KEY, JSON.stringify(lightweight));
    } catch {
      // ignore quota errors
    }
  }
}

function loadMirror(): TrainTicket[] | null {
  try {
    const raw = localStorage.getItem(MIRROR_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this device.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_TICKETS)) {
        db.createObjectStore(STORE_TICKETS, {keyPath: 'id'});
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, {keyPath: 'key'});
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Optional sample tickets only loaded when explicitly requested by user in Settings
export const SAMPLE_TICKETS: TrainTicket[] = [
  {
    id: 'sample-eip-1604',
    title: 'Warszawa Centr. → Wrocław Gł.',
    carrier: 'PKP Intercity',
    trainNumber: 'EIP 1604',
    trainName: 'Pendolino',
    departureStation: 'Warszawa Centralna',
    departureTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2)
      .toISOString()
      .slice(0, 16),
    departurePlatform: 'Peron 3',
    arrivalStation: 'Wrocław Główny',
    arrivalTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 212)
      .toISOString()
      .slice(0, 16),
    arrivalPlatform: 'Peron 2',
    carNumber: '02',
    seatNumber: '24',
    travelClass: '2',
    seatType: 'Okno',
    passengerName: 'Tomasz Drozdowicz',
    ticketNumber: 'WL 95054990',
    bookingReference: '514558504565',
    emergencyCode: '6079',
    price: '109.85 PLN',
    barcodeData: 'WL95054990#EIP1604#WAW-WRO#W02#M24#DROZDOWICZ',
    hasAttachment: false,
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

function sortTickets(tickets: TrainTicket[]): TrainTicket[] {
  return [...tickets].sort(
    (a, b) =>
      new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
  );
}

export async function getAllTickets(): Promise<TrainTicket[]> {
  try {
    const db = await openDB();

    // One-time cleanup of old September hardcoded sample tickets so they don't haunt the user
    const alreadyPurged = localStorage.getItem(LEGACY_SAMPLE_PURGED_KEY) === 'true';
    if (!alreadyPurged) {
      await new Promise<void>((resolve) => {
        const cleanupTx = db.transaction(STORE_TICKETS, 'readwrite');
        const store = cleanupTx.objectStore(STORE_TICKETS);
        for (const legacyId of LEGACY_SAMPLE_IDS) {
          store.delete(legacyId);
          markIdDeleted(legacyId);
        }
        cleanupTx.oncomplete = () => {
          try {
            localStorage.setItem(LEGACY_SAMPLE_PURGED_KEY, 'true');
          } catch {
            // ignore
          }
          resolve();
        };
        cleanupTx.onerror = () => resolve();
      });
    }

    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TICKETS, 'readonly');
      const store = tx.objectStore(STORE_TICKETS);
      const request = store.getAll();

      request.onsuccess = () => {
        const deletedIds = getDeletedIds();
        const rawTickets = (request.result as TrainTicket[]) || [];
        // Filter out any ticket that was explicitly deleted
        const validTickets = rawTickets.filter((t) => t && t.id && !deletedIds.has(t.id));
        const sorted = sortTickets(validTickets);
        saveMirror(sorted);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Fallback do lustra localStorage:', err);
    const mirror = loadMirror();
    if (mirror) {
      const deletedIds = getDeletedIds();
      return sortTickets(mirror.filter((t) => !deletedIds.has(t.id)));
    }
    return [];
  }
}

export async function saveTicket(ticket: TrainTicket): Promise<void> {
  unmarkIdDeleted(ticket.id);
  const updatedTicket: TrainTicket = {
    ...ticket,
    updatedAt: Date.now(),
  };

  // Update mirror immediately for instant persistence
  const currentMirror = loadMirror() || [];
  const nextMirror = [
    ...currentMirror.filter((t) => t.id !== updatedTicket.id),
    updatedTicket,
  ];
  saveMirror(sortTickets(nextMirror));

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TICKETS, 'readwrite');
    const store = tx.objectStore(STORE_TICKETS);
    store.put(updatedTicket);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteTicket(id: string): Promise<void> {
  markIdDeleted(id);

  // Update mirror immediately
  const currentMirror = loadMirror();
  if (currentMirror) {
    saveMirror(currentMirror.filter((t) => t.id !== id));
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TICKETS, 'readwrite');
    const store = tx.objectStore(STORE_TICKETS);
    store.delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllTickets(): Promise<void> {
  const currentMirror = loadMirror() || [];
  for (const t of currentMirror) {
    markIdDeleted(t.id);
  }
  saveMirror([]);

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TICKETS, 'readwrite');
    const store = tx.objectStore(STORE_TICKETS);
    const getAllReq = store.getAllKeys();
    getAllReq.onsuccess = () => {
      const keys = (getAllReq.result as string[]) || [];
      for (const k of keys) {
        markIdDeleted(String(k));
      }
    };
    store.clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function seedSampleData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TICKETS, 'readwrite');
    const store = tx.objectStore(STORE_TICKETS);
    for (const ticket of SAMPLE_TICKETS) {
      unmarkIdDeleted(ticket.id);
      store.put({
        ...ticket,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Backup & Restore
export async function exportDatabaseJSON(): Promise<string> {
  const tickets = await getAllTickets();
  const backupObject = {
    app: 'Bilety eTravel',
    version: '2.0.0',
    exportDate: new Date().toISOString(),
    ticketCount: tickets.length,
    tickets,
  };
  return JSON.stringify(backupObject, null, 2);
}

export async function importDatabaseJSON(jsonStr: string): Promise<number> {
  const data = JSON.parse(jsonStr);
  if (!data || !Array.isArray(data.tickets)) {
    throw new Error('Nieprawidłowy format kopii zapasowej (brak listy biletów).');
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TICKETS, 'readwrite');
    const store = tx.objectStore(STORE_TICKETS);
    let imported = 0;

    for (const ticket of data.tickets) {
      if (ticket.id && ticket.departureStation && ticket.arrivalStation) {
        unmarkIdDeleted(ticket.id);
        store.put(ticket);
        imported++;
      }
    }

    tx.oncomplete = () => resolve(imported);
    tx.onerror = () => reject(tx.error);
  });
}

// Storage persistence & stats for iOS Safari
export async function checkStoragePersistence(): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    navigator.storage.persisted
  ) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}

export async function requestStoragePersistence(): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    navigator.storage.persist
  ) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

export async function getStorageStats(): Promise<StorageStats> {
  let isPersisted = false;
  let usage = 0;
  let quota = 0;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    if (navigator.storage.persisted) {
      try {
        isPersisted = await navigator.storage.persisted();
      } catch {
        // ignore
      }
    }
    if (navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        usage = est.usage || 0;
        quota = est.quota || 0;
      } catch {
        // ignore
      }
    }
  }

  let count = 0;
  try {
    const tickets = await getAllTickets();
    count = tickets.length;
  } catch {
    // ignore
  }

  return {
    persisted: isPersisted,
    usageBytes: usage,
    quotaBytes: quota,
    ticketCount: count,
  };
}
