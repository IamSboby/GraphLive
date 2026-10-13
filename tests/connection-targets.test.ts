import { it, expect } from "vitest";
import {
  emptySnapshot,
  createPerson,
  upsertConnection,
} from "../packages/domain/model";
import { addMissingConnections } from "../packages/ui/connection-targets";
it("batch connections preserve existing relationships in either direction and avoid duplicates", () => {
  const data = emptySnapshot();
  const mike = createPerson(data, { nickname: "Mike" }),
    juan = createPerson(data, { nickname: "Juan" }),
    ana = createPerson(data, { nickname: "Ana" });
  const input = {
    sourceId: juan.id,
    targetId: mike.id,
    relationshipType: "bestFriend" as const,
    sourcePerspective: "bestFriend" as const,
    targetPerspective: "bestFriend" as const,
    intensity: 5,
    frequency: 2,
    importance: 3,
    status: "confirmed" as const,
    startedAt: null,
    endedAt: null,
    notes: "Keep this",
  };
  upsertConnection(data, input);
  const original = structuredClone(data.connections[0]);
  const group = {
    ...input,
    sourceId: mike.id,
    relationshipType: "closeFriends" as const,
    sourcePerspective: "closeFriends" as const,
    targetPerspective: "closeFriends" as const,
  };
  addMissingConnections(data, [
    { ...group, targetId: juan.id },
    { ...group, targetId: ana.id },
    { ...group, targetId: ana.id },
  ]);
  expect(data.connections).toHaveLength(2);
  expect(data.connections[0]).toEqual(original);
  expect(data.connections[1].relationshipType).toBe("closeFriends");
});
