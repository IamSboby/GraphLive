import type { Snapshot } from "../domain/model";
import { OfflineNetworks, replicaKey } from "../storage-core/offline";
import { replicaStorage } from "./offline-storage";
import { GoogleDriveRepository } from "./google-drive";

export const offlineNetworks = new OfflineNetworks(replicaStorage);
export class CachedDriveRepository extends GoogleDriveRepository {
  localReplica = false;
  get offlineKey() {
    return replicaKey(this.session.accountId, this.networkId);
  }
  override async load() {
    const r = await offlineNetworks.storage.get(this.offlineKey);
    this.localReplica = Boolean(r);
    if (!r) return super.load();
    this.readOnly = r.readOnly;
    return r.local;
  }
  override async save(value: Snapshot, revision: number) {
    const r = await offlineNetworks.storage.get(this.offlineKey);
    this.localReplica = Boolean(r);
    if (r) this.readOnly = r.readOnly;
    return r
      ? offlineNetworks.edit(this.offlineKey, value, revision)
      : super.save(value, revision);
  }
}
