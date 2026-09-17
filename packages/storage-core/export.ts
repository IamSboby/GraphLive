import { strToU8, zipSync, unzipSync, strFromU8 } from "fflate";
import { fileTree } from "./index";
import { snapshotSchema, type Snapshot } from "../domain/model";
export function download(
  data: BlobPart,
  name: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportJson(s: Snapshot) {
  download(JSON.stringify(s, null, 2), "GraphLive.json");
}
export function exportZip(s: Snapshot) {
  const files = Object.fromEntries(
    Object.entries(fileTree(s)).map(([p, v]) => [
      "GraphLiveFiles/" + p,
      strToU8(v),
    ]),
  );
  download(
    new Uint8Array(zipSync(files)),
    "GraphLiveFiles.zip",
    "application/zip",
  );
}
export async function importFile(file: File) {
  if (file.size > 10485760) throw new Error("tooLarge");
  if (file.name.toLowerCase().endsWith(".zip")) {
    let total = 0;
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: (info) => {
        total += info.originalSize;
        if (total > 10485760) throw new Error("tooLarge");
        return info.name === "GraphLiveFiles/sync/snapshot.json";
      },
    });
    const snapshot = entries["GraphLiveFiles/sync/snapshot.json"];
    if (!snapshot) throw new Error("invalidData");
    return snapshotSchema.parse(JSON.parse(strFromU8(snapshot)));
  }
  return snapshotSchema.parse(JSON.parse(await file.text()));
}
