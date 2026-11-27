// Vesper : service worker. Objectif : ouvrir l'app même sans réseau, sans jamais bloquer une mise à jour.
// - la page (index.html) : on essaie toujours le réseau d'abord, la copie locale ne sert qu'en secours ;
// - les icônes et le manifeste : copie locale d'abord, rafraîchie en arrière-plan ;
// - tout le reste (API GitHub, Google, polices) passe tel quel : rien d'autre n'est mis en cache.
var CACHE = "vesper-shell-v1";
var SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  var isPage = req.mode === "navigate" || /\/(index\.html)?$/.test(url.pathname);
  if (isPage){
    e.respondWith(
      fetch(req, { cache: "no-cache" }).then(function(r){
        if (r && r.ok){ var copy = r.clone(); caches.open(CACHE).then(function(c){ c.put("index.html", copy); }); }
        return r;
      }).catch(function(){
        return caches.match("index.html").then(function(m){ return m || caches.match("./"); });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function(hit){
      var net = fetch(req).then(function(r){
        if (r && r.ok){ var copy = r.clone(); caches.open(CACHE).then(function(c){ c.put(req, copy); }); }
        return r;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});
