
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open('xrm-cache').then(cache => cache.addAll(['/','/index.html'])))
})
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request).then(r => {
      const copy = r.clone()
      caches.open('xrm-cache').then(cache => cache.put(event.request, copy))
      return r
    }))
  )
})
