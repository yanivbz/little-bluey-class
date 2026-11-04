const V = "pt-v4", SHELL = ["./", "index.html", "style.css", "app.js", "words.js", "manifest.json", "assets/wave.webp", "assets/pencil.webp", "assets/think.webp", "assets/cheer.webp", "assets/icon-192.png", "room.js", "assets/room/bg.webp"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL))); });
self.addEventListener("message", e => e.data === "skip" && self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  if (r.mode === "navigate" || r.destination === "document")
    e.respondWith(fetch(r).then(res => { caches.open(V).then(c => c.put(r, res.clone())); return res; }).catch(() => caches.match(r).then(m => m || caches.match("index.html"))));
  else e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok) { const cl = res.clone(); caches.open(V).then(c => c.put(r, cl)); } return res; })));
});
