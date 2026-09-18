import {
  emptySnapshot,
  createPerson,
  upsertConnection,
  relationshipTypes,
} from "./model";
export function demoNetwork() {
  const s = emptySnapshot();
  const people = [
    ["Alex", "nonBinary"],
    ["Emily", "female"],
    ["Oliver", "male"],
    ["Sophia", "female"],
    ["Liam", "male"],
    ["Aisha", "female"],
    ["Leo", "male"],
    ["Amelia", "female"],
    ["Kai", "nonBinary"],
    ["Emma", "female"],
    ["Ethan", "male"],
    ["Chloe", "female"],
    ["Gabriel", "male"],
    ["Hannah", "female"],
    ["James", "male"],
    ["Olivia", "female"],
    ["Marco", "male"],
    ["Elena", "female"],
    ["Daniel", "male"],
    ["Sara", "female"],
    ["Lucas", "male"],
    ["Zoe", "female"],
    ["Thomas", "male"],
    ["Maya", "female"],
    ["Noah", "male"],
    ["Yuki", "female"],
    ["Luca", "male"],
    ["Mia", "female"],
  ] as const;
  for (let i = 0; i < people.length; i++)
    createPerson(s, {
      firstName: people[i][0],
      gender: people[i][1],
      birthYear: 1988 + (i % 15),
      nationalities: [["ES", "IT", "FR", "AR", "GB", "PT", "DE"][i % 7]],
      interests: [["Música", "Diseño", "Deporte", "Viajes"][Math.floor(i / 7)]],
      tags: [["Universidad", "Trabajo", "Barrio", "Viajes"][Math.floor(i / 7)]],
    });
  for (let i = 1; i < s.people.length; i++) {
    upsertConnection(s, {
      sourceId: s.people[Math.floor((i - 1) / 7) * 7].id,
      targetId: s.people[i].id,
      relationshipType: relationshipTypes[i % 8],
      intensity: 1 + (i % 5),
      frequency: 1 + (i % 5),
    });
    if (i % 7 > 1)
      upsertConnection(s, {
        sourceId: s.people[i - 1].id,
        targetId: s.people[i].id,
        relationshipType: relationshipTypes[(i + 2) % 8],
        intensity: 2 + (i % 4),
      });
  }
  return s;
}
