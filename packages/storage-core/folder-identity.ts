export async function folderIdentity(handle: FileSystemDirectoryHandle) {
  return navigator.locks.request("graphlive-folder-identities", async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("graphlive-folder-identities", 1);
      r.onupgradeneeded = () =>
        r.result.createObjectStore("folders", { keyPath: "id" });
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(new Error("localSaveFailed"));
    });
    try {
      const folders = await new Promise<
        { id: string; handle: FileSystemDirectoryHandle }[]
      >((resolve, reject) => {
        const tx = db.transaction("folders");
        const r = tx.objectStore("folders").getAll();
        tx.oncomplete = () => resolve(r.result);
        tx.onabort = tx.onerror = () => reject(new Error("localSaveFailed"));
      });
      for (const folder of folders)
        if (await handle.isSameEntry(folder.handle)) return folder.id;
      const id = crypto.randomUUID();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("folders", "readwrite");
        tx.objectStore("folders").put({ id, handle });
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => reject(new Error("localSaveFailed"));
      });
      return id;
    } finally {
      db.close();
    }
  });
}
