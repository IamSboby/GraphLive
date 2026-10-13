import { it, expect } from "vitest";
import {
  emptySnapshot,
  createPerson,
  upsertConnection,
  followsRelationship,
  snapshotSchema,
} from "../packages/domain/model";
it("infers legacy automatic perspectives and persists explicit choices even when matching the general relationship", () => {
  const data = emptySnapshot(),
    a = createPerson(data, { nickname: "A" }),
    b = createPerson(data, { nickname: "B" });
  upsertConnection(data, {
    sourceId: a.id,
    targetId: b.id,
    relationshipType: "friend",
  });
  const edge = data.connections[0];
  expect(followsRelationship(edge, "source")).toBe(true);
  edge.sourcePerspective = "bestFriend";
  expect(followsRelationship(edge, "source")).toBe(false);
  edge.sourcePerspective = "friend";
  edge.sourcePerspectiveAutomatic = false;
  edge.targetPerspectiveAutomatic = true;
  const loaded = snapshotSchema.parse(JSON.parse(JSON.stringify(data)))
    .connections[0];
  expect(followsRelationship(loaded, "source")).toBe(false);
  expect(followsRelationship(loaded, "target")).toBe(true);
});
