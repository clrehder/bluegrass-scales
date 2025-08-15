const CACHE = 'bg-scale-cache-v4';
self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(cache=> cache.addAll([
    './','./index.html','./app.js','./manifest.webmanifest'
  ])));
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=> k!==CACHE && caches.delete(k)))));
});
self.addEventListener('fetch', (e)=>{
  e.respondWith(caches.match(e.request).then(res=> res || fetch(e.request)));
});
