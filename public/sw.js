// Service worker mínimo: torna o site instalável. Só toca em navegação de páginas;
// a API e os dados nunca passam por cache, então o painel sempre mostra o que está no servidor.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{if(e.request.mode!=='navigate')return;
 e.respondWith(fetch(e.request).catch(()=>new Response('Sem conexão. Abra de novo quando estiver online.',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}})))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(l=>{for(const c of l){if('focus' in c){if(c.navigate)c.navigate('/abertos.html');return c.focus()}}return clients.openWindow('/abertos.html')}))});
