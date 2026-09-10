export const CRM_CACHE_PREFIX = "crm-";

export async function clearAllCrmCaches(): Promise<void> {
  if (typeof caches === "undefined") return;

  try {
    const cacheNames = await caches.keys();
    const crmCaches = cacheNames.filter((name) =>
      name.startsWith(CRM_CACHE_PREFIX)
    );

    await Promise.all(crmCaches.map((name) => caches.delete(name)));
  } catch {
    // SW cache API not available
  }
}

export async function clearIndexedDBStore(dbName: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;

  return new Promise((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function clearAllPwaData(orgId?: string): Promise<void> {
  await clearAllCrmCaches();

  await clearIndexedDBStore("crm-offline-mutations");
  await clearIndexedDBStore("crm-offline-data");

  if (orgId) {
    await clearIndexedDBStore(`crm-offline-${orgId}`);
  }

  if (typeof localStorage !== "undefined") {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("crm-") || key.startsWith("pwa-")) {
        localStorage.removeItem(key);
      }
    }
  }
}
