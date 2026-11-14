self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('sync', (event) => {
  console.log('[SW] Evento sync recebido:', event.tag);
  if (event.tag === 'sync-inspections') {
    event.waitUntil(flushQueue());
  }
});

async function flushQueue() {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open('FieldAppDB', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const items = await new Promise(
    (resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const req = tx.objectStore('sync_queue').getAll();
      req.onsuccess = () => resolve(req.result.filter((i) => i.status === 'pending'));
      req.onerror = () => reject(req.error);
    }
  );

  console.log(`[SW] Processando ${items.length} item(ns) da fila...`);

  for (const item of items) {
    try {
      const body = new FormData();
      body.append('notes', item.notes);
      body.append('photo', item.photoBlob);

      const res = await fetch(item.endpoint, {
        method: 'POST',
        body,
      });

      console.log(`[SW] Resposta HTTP para ${item.id}:`, res.status);

      if (res.ok) {
        await new Promise((resolve, reject) => {
          const delTx = db.transaction('sync_queue', 'readwrite');
          delTx.objectStore('sync_queue').delete(item.id);
          delTx.oncomplete = () => resolve();
          delTx.onerror = () => reject(delTx.error);
        });
        console.log(`[SW] Item ${item.id} enviado e removido do IndexedDB!`);
      }
    } catch (err) {
      console.error(`[SW] Erro de rede ao enviar ${item.id}:`, err);
    }
  }
}