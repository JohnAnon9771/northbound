// Minimal promise wrapper over IndexedDB. Stores:
//   meta     key-value (state, secrets)
//   logs     study sessions, keyPath id, index date
//   cards    flashcards, keyPath id, index due
//   reviews  one row per answer, autoIncrement id, indexes cardId and date
//   audio    speaking test recordings {id, testId, part, mime, sec, blob}, keyPath id (v2)
const NAME = "northbound", VERSION = 2;
let dbp = null;

export function open(){
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined"){ reject(new Error("no-indexeddb")); return; }
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = e => {
      const db = req.result;
      if (e.oldVersion < 1){
        db.createObjectStore("meta");
        db.createObjectStore("logs", {keyPath: "id"}).createIndex("date", "date");
        db.createObjectStore("cards", {keyPath: "id"}).createIndex("due", "due");
        const r = db.createObjectStore("reviews", {keyPath: "id", autoIncrement: true});
        r.createIndex("cardId", "cardId"); r.createIndex("date", "date");
      }
      if (e.oldVersion < 2) db.createObjectStore("audio", {keyPath: "id"});
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("blocked"));
  });
  return dbp;
}

async function run(stores, mode, fn){
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode);
    let out;
    Promise.resolve(fn(tx)).then(v => { out = v; });
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("aborted"));
  });
}
const req2p = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export const get = (store, key) => run(store, "readonly", tx => req2p(tx.objectStore(store).get(key)));
export const getAll = store => run(store, "readonly", tx => req2p(tx.objectStore(store).getAll()));
export const put = (store, value, key) => run(store, "readwrite", tx => req2p(key === undefined ? tx.objectStore(store).put(value) : tx.objectStore(store).put(value, key)));
export const del = (store, key) => run(store, "readwrite", tx => { tx.objectStore(store).delete(key); });
export const putMany = (store, values) => run(store, "readwrite", tx => { const os = tx.objectStore(store); values.forEach(v => os.put(v)); });

// Replace the whole content of several stores in one transaction (backup restore, reset).
export function replace(data){
  const stores = Object.keys(data);
  return run(stores, "readwrite", tx => {
    stores.forEach(name => {
      const os = tx.objectStore(name);
      os.clear();
      const v = data[name];
      if (Array.isArray(v)) v.forEach(x => os.put(x));
      else Object.keys(v || {}).forEach(k => os.put(v[k], k));
    });
  });
}
