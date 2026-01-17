/* 营业日记 PWA Service Worker (GitHub Pages /trista/) */

const CACHE_VERSION = "v10
  ";
const CACHE_NAME = `yingye-riji-${CACHE_VERSION}`;

// 站点部署在 GitHub Pages 的子目录
const BASE_PATH = "/trista";

// 核心资源：保证离线能打开
const CORE_ASSETS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/sw.js`,

  // icons
  `${BASE_PATH}/icons/icon-192.png`,
  `${BASE_PATH}/icons/icon-512.png`,
  `${BASE_PATH}/icons/maskable-512.png`,
  `${BASE_PATH}/icons/apple-touch-icon.png`
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((k) => (k === CACHE_NAME ? Promise.resolve() : caches.delete(k)))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 只处理 GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 只接管本站请求
  if (url.origin !== self.location.origin) return;

  // 只接管 /trista/ 目录下的内容，避免影响同域其它路径
  if (!url.pathname.startsWith(`${BASE_PATH}/`)) return;

  // 对导航请求（打开页面）做离线兜底：优先网络，失败回退到缓存的 index.html
  const isNavigation =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isNavigation) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          // 在线成功：顺便把最新页面写进缓存
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match(`${BASE_PATH}/index.html`))
        )
    );
    return;
  }

  // 其它静态资源：缓存优先，网络兜底，并写入缓存
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((resp) => {
          // 只缓存成功响应
          if (!resp || resp.status !== 200) return resp;

          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        })
        .catch(() => cached);
    })
  );
});
