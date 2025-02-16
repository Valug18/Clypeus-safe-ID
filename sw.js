const CACHE_NAME = 'safe-id-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-clypeus.png',
  '/dni-before.webp',
  '/dni-after.webp',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    })
  );
});

// Lazy loading para imágenes
const lazyLoadImages = () => {
  const images = document.querySelectorAll('img[data-src]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  });
  images.forEach(img => observer.observe(img));
};

document.addEventListener('DOMContentLoaded', lazyLoadImages);

// Barra de progreso al cargar imágenes
const fileInput = document.getElementById('imageInput');
const progressBar = document.createElement('progress');
progressBar.style.width = '100%';
progressBar.style.display = 'none';
document.body.appendChild(progressBar);

fileInput.addEventListener('change', () => {
  progressBar.style.display = 'block';
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadstart = () => (progressBar.value = 0);
    reader.onprogress = event => {
      if (event.lengthComputable) {
        progressBar.value = (event.loaded / event.total) * 100;
      }
    };
    reader.onloadend = () => (progressBar.style.display = 'none');
    reader.readAsDataURL(file);
  }
});

// Cifrado AES-256 de imágenes antes del procesamiento
async function encryptImage(data) {
  const encoder = new TextEncoder();
  const key = await window.crypto.subtle.generateKey({
    name: 'AES-GCM',
    length: 256
  }, true, ['encrypt', 'decrypt']);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await window.crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv
  }, key, encoder.encode(data));
  return { encryptedData, iv, key };
}

// Validación de integridad con SHA-256
async function generateImageHash(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (file) {
    const hash = await generateImageHash(file);
    console.log('Imagen hash:', hash);
  }
});
