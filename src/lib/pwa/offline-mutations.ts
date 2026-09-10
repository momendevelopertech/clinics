const DB_NAME = "crm-offline-mutations";
const DB_VERSION = 1;
const STORE_NAME = "pending-operations";

export type OfflineOperation = {
  id: string;
  endpoint: string;
  method: string;
  body: string;
  timestamp: number;
  orgId: string;
  entityType: string;
  entityId?: string;
  baseVersion?: string;
  status: "pending" | "syncing" | "synced" | "conflict";
  conflictDetails?: string;
  retryCount: number;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("orgId", "orgId", { unique: false });
        store.createIndex("entityType", "entityType", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addPendingOperation(
  op: Omit<OfflineOperation, "id" | "status" | "retryCount">
): Promise<OfflineOperation> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const operation: OfflineOperation = {
      ...op,
      id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      status: "pending",
      retryCount: 0,
    };

    const request = store.add(operation);
    request.onsuccess = () => {
      db.close();
      resolve(operation);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function getPendingOperations(): Promise<OfflineOperation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      db.close();
      resolve(request.result as OfflineOperation[]);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("status");
    const request = index.count("pending");
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function updateOperationStatus(
  id: string,
  status: OfflineOperation["status"],
  conflictDetails?: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const op = getReq.result as OfflineOperation | undefined;
      if (op) {
        op.status = status;
        if (conflictDetails) op.conflictDetails = conflictDetails;
        op.retryCount += 1;
        store.put(op);
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function removeOperation(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function clearAllOperations(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => {
      db.close();
      resolve();
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

const OFFLINE_MUTATION_ENDPOINTS: Record<string, { method: string; entityType: string }> = {
  "POST /api/patients": { method: "POST", entityType: "patient" },
  "POST /api/appointments": { method: "POST", entityType: "appointment" },
  "PATCH /api/appointments": { method: "PATCH", entityType: "appointment" },
  "POST /api/encounters": { method: "POST", entityType: "encounter" },
  "PATCH /api/encounters": { method: "PATCH", entityType: "encounter" },
  "POST /api/prescriptions": { method: "POST", entityType: "prescription" },
  "PATCH /api/prescriptions": { method: "PATCH", entityType: "prescription" },
  "POST /api/tasks": { method: "POST", entityType: "task" },
  "PATCH /api/tasks": { method: "PATCH", entityType: "task" },
  "POST /api/documents": { method: "POST", entityType: "document" },
};

const READONLY_ENTITIES = new Set(["prescription", "lab-result", "billing", "insurance"]);

const ADDITIVE_ONLY_METHODS = new Set(["POST"]);

export function isEligibleForOfflineQueue(
  endpoint: string,
  method: string,
  entityType?: string
): boolean {
  const key = `${method} ${endpoint}`;
  const config = OFFLINE_MUTATION_ENDPOINTS[key];
  if (!config) return false;

  if (entityType && READONLY_ENTITIES.has(entityType) && method === "PATCH") {
    return true;
  }

  if (entityType && READONLY_ENTITIES.has(entityType) && !ADDITIVE_ONLY_METHODS.has(method)) {
    return false;
  }

  return true;
}

export function getEntityType(endpoint: string, method: string): string {
  const key = `${method} ${endpoint}`;
  return OFFLINE_MUTATION_ENDPOINTS[key]?.entityType ?? "unknown";
}

export function requiresConflictUI(entityType: string, method: string): boolean {
  if (method !== "PATCH" && method !== "PUT") return false;
  return READONLY_ENTITIES.has(entityType);
}
