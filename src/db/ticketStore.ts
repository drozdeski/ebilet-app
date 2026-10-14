import {StorageStats, TrainTicket} from '../types/ticket';

const DB_NAME = 'BiletyETravelDB';
const DB_VERSION = 1;
const STORE_TICKETS = 'tickets';
const STORE_SETTINGS = 'settings';

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

// Default initial sample tickets for quick testing and demonstration
export const SAMPLE_TICKETS: TrainTicket[] = [
  {
    id: 'etravel-wl-95054990',
    title: 'Warszawa Centr. → Wrocław Gł.',
    carrier: 'eTravel',
    trainNumber: 'EIP 1604',
    trainName: 'Pendolino',
    departureStation: 'Warszawa Centralna',
    departureTime: '2026-09-24T16:44',
    departurePlatform: 'Peron 3',
    arrivalStation: 'Wrocław Główny',
    arrivalTime: '2026-09-24T20:16',
    arrivalPlatform: 'Peron 2',
    carNumber: '02',
    seatNumber: '24',
    travelClass: '2',
    seatType: 'Środek',
    passengerName: 'Tomasz Drozdowicz',
    ticketNumber: 'WL 95054990',
    bookingReference: '514558504565',
    emergencyCode: '6079',
    price: '109.85 PLN',
    barcodeData: 'WL95054990#EIP1604#20260924#WAW-WRO#W02#M24#DROZDOWICZ',
    hasAttachment: false,
    isArchived: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
  },
  {
    id: 'etravel-wl-95054982',
    title: 'Wrocław Gł. → Warszawa Centr.',
    carrier: 'eTravel',
    trainNumber: 'EIC 6100',
    trainName: 'Express InterCity',
    departureStation: 'Wrocław Główny',
    departureTime: '2026-09-22T17:01',
    departurePlatform: 'Peron 1',
    arrivalStation: 'Warszawa Centralna',
    arrivalTime: '2026-09-22T20:44',
    arrivalPlatform: 'Peron 4',
    carNumber: '13',
    seatNumber: '62',
    travelClass: '2',
    seatType: 'Korytarz',
    passengerName: 'Tomasz Drozdowicz',
    ticketNumber: 'WL 95054982',
    bookingReference: '519558504504',
    emergencyCode: '1090',
    price: '65.56 PLN',
    barcodeData: 'WL95054982#EIC6100#20260922#WRO-WAW#W13#M62#DROZDOWICZ',
    hasAttachment: false,
    isArchived: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
  },
];

export async function getAllTickets(): Promise<TrainTicket[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TICKETS, 'readonly');
    const store = tx.objectStore(STORE_TICKETS);
    const request = store.getAll();

    request.onsuccess = async () => {
      let tickets = request.result as TrainTicket[];
      if (!tickets || tickets.length === 0) {
        // Seed initial sample data so the user has an immediate working wallet
        await seedSampleData();
        const recheckTx = db.transaction(STORE_TICKETS, 'readonly');
        const recheckReq = recheckTx.objectStore(STORE_TICKETS).getAll();
        recheckReq.onsuccess = () =>
          resolve(recheckReq.result as TrainTicket[]);
        recheckReq.onerror = () => resolve(SAMPLE_TICKETS);
      } else {
        // Sort: non-archived by departureTime ascending, then archived
        tickets.sort(
          (a, b) =>
            new Date(a.departureTime).getTime() -
            new Date(b.departureTime).getTime()
        );
        resolve(tickets);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveTicket(ticket: TrainTicket): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TICKETS, 'readwrite');
    const store = tx.objectStore(STORE_TICKETS);
    const request = store.put({
      ...ticket,
      updatedAt: Date.now(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteTicket(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TICKETS, 'readwrite');
    const store = tx.objectStore(STORE_TICKETS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllTickets(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TICKETS, 'readwrite');
    const store = tx.objectStore(STORE_TICKETS);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function seedSampleData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TICKETS, 'readwrite');
    const store = tx.objectStore(STORE_TICKETS);
    for (const ticket of SAMPLE_TICKETS) {
      store.put(ticket);
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
    version: '1.0.0',
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
