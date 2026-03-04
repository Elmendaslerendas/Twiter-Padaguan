const CACHE_NAME = 'padaguan-v7';
const ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/config.js',
    '/icon.png',
    '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

// 🔔 Manejo de Notificaciones Push
self.addEventListener('push', (event) => {
    let data = { title: 'Nuevo mensaje', body: 'Alguien ha publicado en Padaguan' };
    try {
        if (event.data) data = event.data.json();
    } catch (e) { }

    const options = {
        body: data.body,
        icon: '/icon.png',
        badge: '/icon.png',
        data: { url: '/' }
    };

    // Actualizar el número del icono si es posible
    if ('setAppBadge' in navigator) {
        navigator.setAppBadge(1).catch(() => { });
    }

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});

self.addEventListener('fetch', (event) => {
    // Solo interceptar peticiones GET del mismo origen
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});
