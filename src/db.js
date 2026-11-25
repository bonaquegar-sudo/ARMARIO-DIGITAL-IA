// Local storage: IndexedDB on this device only. Images are stored as Blobs.
export const STORES = ['items', 'outfits'];
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const dbp = new Promise((resolve, reject) => {
  const r = indexedDB.open('armario', 1);
  r.onupgradeneeded = () => STORES.forEach(s => r.result.createObjectStore(s, { keyPath: 'id' }));
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});

const done = tx => new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = tx.onabort = () => rej(tx.error); });

export async function all(store) {
  const r = (await dbp).transaction(store).objectStore(store).getAll();
  return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}

export async function put(store, value) {
  const tx = (await dbp).transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  return done(tx);
}

export async function del(store, id) {
  const tx = (await dbp).transaction(store, 'readwrite');
  tx.objectStore(store).delete(id);
  return done(tx);
}

// One transaction: either everything is replaced or nothing is.
export async function replaceAll(data) {
  const tx = (await dbp).transaction(STORES, 'readwrite');
  for (const s of STORES) {
    const os = tx.objectStore(s);
    os.clear();
    data[s].forEach(v => os.put(v));
  }
  return done(tx);
}

// --- Backup file (.armario): JSON with Blobs as data URLs ---
const toDataURL = b => new Promise((res, rej) => {
  const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(b);
});

async function mapFields(obj, fn) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = await fn(v);
  return out;
}

export async function exportBackup() {
  const data = { app: 'armario-digital', version: 1, date: new Date().toISOString() };
  for (const s of STORES)
    data[s] = await Promise.all((await all(s)).map(o => mapFields(o, async v => v instanceof Blob ? { $blob: await toDataURL(v) } : v)));
  return new Blob([JSON.stringify(data)], { type: 'application/octet-stream' });
}

export async function importBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { throw new Error('El archivo no es una copia válida.'); }
  if (data?.app !== 'armario-digital' || !STORES.every(s => Array.isArray(data[s])))
    throw new Error('El archivo no es una copia de Armario Digital.');
  for (const s of STORES)
    data[s] = await Promise.all(data[s].map(o => mapFields(o, async v => v?.$blob ? (await fetch(v.$blob)).blob() : v)));
  await replaceAll(data);
  return data;
}
