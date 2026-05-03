import { db, syncAllToBackend } from './db.js'
import '../app.js'

// Register enhanced service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.error('[SW] Registration failed:', err))
  })
}

// Sync when coming back online
window.addEventListener('online', () => {
  console.log('[App] Back online — syncing...')
  syncAllToBackend()
})

// Expose db for debugging
window._db = db
