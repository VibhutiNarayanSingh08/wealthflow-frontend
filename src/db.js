import Dexie from 'dexie'

// IndexedDB via Dexie for structured, large-scale offline storage
export const db = new Dexie('WealthFlowDB')

// Schema version 1
db.version(1).stores({
  expenses: 'id, user_id, date, category, synced',
  investments: 'id, user_id, date, type, synced',
  budgets: 'id, user_id, category, synced',
  recurring: 'id, user_id, category, active, synced',
  syncQueue: '++id, method, endpoint, payload, timestamp'
})

// Helper: get all unsynced items
export async function getUnsynced(table) {
  return await db[table].where({ synced: 0 }).toArray()
}

// Helper: mark as synced
export async function markSynced(table, id) {
  await db[table].update(id, { synced: 1 })
}

// Helper: add to sync queue for background sync
export async function queueSync(method, endpoint, payload) {
  await db.syncQueue.add({ method, endpoint, payload, timestamp: Date.now() })
  // Trigger background sync if available
  if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker.registration) {
    navigator.serviceWorker.registration.sync.register('sync-expenses')
  }
}

// Process sync queue — called when back online
export async function processSyncQueue() {
  const items = await db.syncQueue.orderBy('timestamp').toArray()
  const token = localStorage.getItem('token')
  if (!token) return

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }

  for (const item of items) {
    try {
      const res = await fetch(import.meta.env.VITE_API_BASE + item.endpoint, {
        method: item.method,
        headers,
        body: item.payload ? JSON.stringify(item.payload) : undefined
      })
      if (res.ok) {
        await db.syncQueue.delete(item.id)
        console.log('[SyncQueue] Synced:', item.method, item.endpoint)
      } else {
        console.warn('[SyncQueue] Failed:', item.method, item.endpoint, res.status)
        break // Stop processing, retry later
      }
    } catch (err) {
      console.warn('[SyncQueue] Network error:', err)
      break
    }
  }
}

// Sync all local data to backend
export async function syncAllToBackend() {
  await processSyncQueue()
  // Additional sync logic can be added here
}

// Migrate from localStorage to IndexedDB (one-time)
export async function migrateFromLocalStorage() {
  const keys = ['expenses', 'investments', 'budgets', 'recurring']
  for (const key of keys) {
    const data = localStorage.getItem(`wealthflow-${key}`)
    if (data) {
      try {
        const items = JSON.parse(data)
        if (Array.isArray(items) && items.length > 0) {
          // Check if already migrated
          const count = await db[key].count()
          if (count === 0) {
            await db[key].bulkAdd(items.map(i => ({ ...i, synced: 1 })))
            console.log(`[Migrate] Migrated ${items.length} ${key} from localStorage`)
          }
        }
      } catch (e) {
        console.error(`[Migrate] Failed to migrate ${key}:`, e)
      }
    }
  }
}
