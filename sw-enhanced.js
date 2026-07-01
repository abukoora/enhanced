// ================================================================
// Service Worker محسّن - حصون الإيمان
// تحسينات: معالجة أفضل للأخطاء، إدارة أذكى للـ Cache، أمان محسّن
// ================================================================

const CACHE_VERSION = 'v2'; // تحديث الإصدار عند التغييرات الكبيرة
const CACHE_NAME = `husun-aliman-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const API_CACHE = `${CACHE_NAME}-api`;

// ================================================================
// الملفات الأساسية المطلوب تخزينها
// ================================================================
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './app-enhanced.js',
    './styles.css'
];

// ملفات خارجية (قد تفشل)
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// ================================================================
// 1. حدث التثبيت (Installation)
// ================================================================
self.addEventListener('install', (event) => {
    console.log('[SW] تثبيت Service Worker...');
    
    event.waitUntil(
        Promise.all([
            // تخزين الملفات الثابتة (الأساسية)
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('[SW] تخزين الملفات الثابتة...');
                return cache.addAll(STATIC_ASSETS).catch((error) => {
                    console.error('[SW] خطأ في تخزين الملفات الثابتة:', error);
                });
            }),
            
            // محاولة تخزين الملفات الخارجية
            caches.open(DYNAMIC_CACHE).then((cache) => {
                console.log('[SW] تخزين الملفات الخارجية...');
                return Promise.allSettled(
                    EXTERNAL_ASSETS.map((url) =>
                        fetch(url, { mode: 'no-cors' })
                            .then((res) => cache.put(url, res))
                            .catch(() => console.warn(`[SW] لم يتمكن من تخزين: ${url}`))
                    )
                );
            })
        ]).then(() => {
            console.log('[SW] تم التثبيت بنجاح');
            return self.skipWaiting(); // تفعيل فوري
        })
    );
});

// ================================================================
// 2. حدث التفعيل (Activation)
// ================================================================
self.addEventListener('activate', (event) => {
    console.log('[SW] تفعيل Service Worker...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // حذف النسخ القديمة من الـ Cache
                    if (
                        cacheName !== STATIC_CACHE &&
                        cacheName !== DYNAMIC_CACHE &&
                        cacheName !== API_CACHE &&
                        !cacheName.startsWith(CACHE_VERSION)
                    ) {
                        console.log('[SW] حذف الـ Cache القديم:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] تفعيل الـ clients...');
            return self.clients.claim(); // السيطرة على جميع الـ pages
        })
    );
});

// ================================================================
// 3. استراتيجيات الـ Caching
// ================================================================

/**
 * استراتيجية Network First (الشبكة أولاً)
 * مناسبة للـ API والبيانات الديناميكية
 */
function networkFirstStrategy(request) {
    return fetch(request.clone())
        .then((response) => {
            // تخزين الاستجابة الناجحة
            if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE).then((cache) => {
                    cache.put(request, responseClone);
                });
            }
            return response;
        })
        .catch(() => {
            // إذا فشلت الشبكة، البحث في الـ Cache
            return caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    console.log('[SW] استخدام cached response:', request.url);
                    return cachedResponse;
                }
                // إذا لم نجد في الـ Cache، إرجاع رسالة خطأ
                return createOfflineResponse();
            });
        });
}

/**
 * استراتيجية Cache First (الـ Cache أولاً)
 * مناسبة للملفات الثابتة
 */
function cacheFirstStrategy(request) {
    return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
            console.log('[SW] cached response:', request.url);
            return cachedResponse;
        }
        
        // إذا لم نجد في الـ Cache، جلب من الشبكة
        return fetch(request.clone())
            .then((response) => {
                // تخزين الاستجابة الناجحة
                if (response.status === 200 && response.type !== 'error') {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => createOfflineResponse());
    });
}

/**
 * استراتيجية Stale While Revalidate
 * استخدام الـ Cache لكن تحديثه من الشبكة في الخلفية
 */
function staleWhileRevalidateStrategy(request) {
    return caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request.clone())
            .then((response) => {
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => cachedResponse || createOfflineResponse());
        
        return cachedResponse || fetchPromise;
    });
}

/**
 * إنشاء استجابة offline جميلة
 */
function createOfflineResponse() {
    return new Response(
        `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>بلا اتصال</title>
            <style>
                body {
                    font-family: 'Cairo', sans-serif;
                    background: linear-gradient(135deg, #1B3A4B 0%, #2a5a6f 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    padding: 20px;
                }
                .offline-container {
                    text-align: center;
                    background: rgba(0,0,0,0.3);
                    padding: 40px;
                    border-radius: 20px;
                    max-width: 400px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                }
                .offline-icon {
                    font-size: 60px;
                    margin-bottom: 20px;
                }
                h1 {
                    margin: 0 0 10px 0;
                    color: #D4AF37;
                }
                p {
                    opacity: 0.8;
                    margin: 10px 0;
                    line-height: 1.6;
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="offline-icon">📡</div>
                <h1>لا يوجد اتصال بالإنترنت</h1>
                <p>يرجى التحقق من اتصالك بشبكة الإنترنت وحاول مرة أخرى.</p>
                <p style="font-size: 0.9em; margin-top: 20px;">
                    إذا كنت قد قمت بتثبيت التطبيق من قبل، 
                    <br>يمكنك استخدام البيانات المحفوظة.
                </p>
            </div>
        </body>
        </html>
        `,
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache'
            }
        }
    );
}

// ================================================================
// 4. حدث اعتراض الطلبات (Fetch Event)
// ================================================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // تجاهل الطلبات غير GET
    if (request.method !== 'GET') {
        return;
    }
    
    // تجاهل طلبات chrome-extension وما شابهها
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // تحديد الاستراتيجية المناسبة بناءً على نوع الطلب
    if (request.destination === 'document') {
        // صفحات HTML - استخدام Network First
        event.respondWith(networkFirstStrategy(request));
    } else if (
        url.origin === self.location.origin &&
        (request.destination === 'script' || request.destination === 'style')
    ) {
        // الملفات الثابتة المحلية - استخدام Cache First
        event.respondWith(cacheFirstStrategy(request));
    } else if (url.origin !== self.location.origin) {
        // الموارد الخارجية - استخدام Stale While Revalidate
        event.respondWith(staleWhileRevalidateStrategy(request));
    } else {
        // الملفات الأخرى - استخدام Network First
        event.respondWith(networkFirstStrategy(request));
    }
});

// ================================================================
// 5. استقبال الرسائل من التطبيق (Message Event)
// ================================================================
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            console.log('[SW] تحديث فوري...');
            self.skipWaiting();
            break;
            
        case 'CACHE_CLEAR':
            console.log('[SW] مسح الـ Cache...');
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            });
            break;
            
        case 'GET_CACHE_SIZE':
            calculateCacheSize().then((size) => {
                event.ports[0].postMessage({ 
                    success: true,
                    size: (size / 1024 / 1024).toFixed(2) + ' MB'
                });
            });
            break;
            
        default:
            console.log('[SW] رسالة غير معروفة:', type);
    }
});

// ================================================================
// 6. دوال مساعدة
// ================================================================

/**
 * حساب حجم الـ Cache
 */
async function calculateCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        for (const request of keys) {
            const response = await cache.match(request);
            const blob = await response.blob();
            totalSize += blob.size;
        }
    }
    
    return totalSize;
}

// ================================================================
// 7. السجل
// ================================================================
console.log('[SW] Service Worker enhanced محمّل بنجاح');
console.log('[SW] Cache Version:', CACHE_VERSION);
console.log('[SW] Static Cache:', STATIC_CACHE);
console.log('[SW] Dynamic Cache:', DYNAMIC_CACHE);
