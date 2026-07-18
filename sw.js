const CACHE_NAME='print-minas-frota-v3';
const APP_SHELL=['./','index.html','style.css','manifest.webmanifest','logo-printminas.png','js/config.js','js/db.js','js/app.js'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  // Dados remotos, como os do Supabase, nunca entram no cache: cada aparelho
  // precisa consultar a versão atual da rota registrada pela equipe.
  if(url.origin!==self.location.origin){event.respondWith(fetch(event.request));return;}
  // Arquivos do aplicativo são buscados primeiro na rede e só usam o cache
  // como reserva offline. Assim uma nova publicação chega sem dados antigos.
  event.respondWith(fetch(event.request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request)));
});
