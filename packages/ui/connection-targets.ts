import {
  edgeInputSchema,
  canonicalKey,
  upsertConnection,
  type Snapshot,
} from "../domain/model";
export function addMissingConnections(
  data: Snapshot,
  inputs: Parameters<typeof upsertConnection>[1][],
) {
  const existing = new Set(data.connections.map((e) => e.canonicalKey));
  for (const raw of inputs) {
    const input = edgeInputSchema.parse(raw);
    const key = canonicalKey(input.sourceId, input.targetId);
    if (existing.has(key)) continue;
    upsertConnection(data, input);
    existing.add(key);
  }
}
