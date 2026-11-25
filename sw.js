// Service worker del Club Triskel: siempre intenta traer la versión más nueva de la app;
// si no hay internet, muestra la última que guardó. Los datos (puntos) los maneja Firebase.
const CACHE = "club-triskel-v1";

self.addEventListener("install", () => { self.skipWaiting(); });

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const pedido = event.request;
  if (pedido.method !== "GET") return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(pedido)
      .then((resp) => {
        if (resp && resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(pedido, copia));
        }
        return resp;
      })
      .catch(() => caches.match(pedido).then((g) => g || caches.match("./index.html")))
  );
});
