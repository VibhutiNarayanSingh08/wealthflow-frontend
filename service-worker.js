const CACHE_NAME = 'wealthflow-v3'
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/db.js',
  '/app.js',
  '/styles.css',
  '/tailwind-config.js',
  '/manifest.json'
]

// Install: cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Background Sync: retry failed mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-expenses') {
    event.waitUntil(syncMutations())
  }
})

async function syncMutations() {
  const clients = await self.clients.matchAll({ type: 'window' })
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_REQUESTED' })
  })
}

// Fetch: smart caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET API calls — let them go to network, fallback to queue
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    if (request.method !== 'GET') {
      event.respondWith(handleMutation(request))
      return
    }

    // API GET: network first, cache fallback
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Static assets: cache first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  )
})

async function handleMutation(request) {
  try {
    const response = await fetch(request)
    return response
  } catch (err) {
    // Network failed — queue for background sync
    const clone = request.clone()
    const body = await clone.text()
    const queue = await getQueue()
    queue.push({
      url: clone.url,
      method: clone.method,
      headers: Array.from(clone.headers.entries()),
      body,
      timestamp: Date.now()
    })
    await saveQueue(queue)

    // Try to register background sync
    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-expenses')
    }

    // Return a fake success response so the app can show optimistic UI
    return new Response(JSON.stringify({ status: 'queued', queued: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// IndexedDB helpers for mutation queue
const DB_NAME = 'sw-queue'
const STORE_NAME = 'mutations'

async function getQueue() {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
    }
    req.onsuccess = (e) => {
      const db = e.target.result
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const getAll = store.getAll()
      getAll.onsuccess = () => resolve(getAll.result)
      getAll.onerror = () => resolve([])
    }
    req.onerror = () => resolve([])
  })
}

async function saveQueue(queue) {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onsuccess = (e) => {
      const db = e.target.result
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.clear()
      queue.forEach(item => store.add(item))
      tx.oncomplete = resolve
    }
    req.onerror = resolve
  })
}
