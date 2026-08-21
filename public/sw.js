/*
 * 캐시하지 않는다. 이 워커의 유일한 목적은 Chrome의 설치(WebAPK) 조건을
 * 만족시켜 '홈 화면에 추가'가 주소창 없는 standalone 창을 만들게 하는 것이다.
 * 캐시를 두면 배포한 것과 다른 화면이 태블릿에 남아 실측이 어긋난다.
 */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)))
