import {
  emptySnapshot,
  createPerson,
  upsertConnection,
  relationshipTypes,
} from "./model";
export function demoNetwork() {
  const s = emptySnapshot();
  const names = [
    "Alex",
    "Lucía",
    "Mateo",
    "Sofía",
    "Hugo",
    "Valentina",
    "Leo",
    "Martina",
    "Nico",
    "Emma",
    "Bruno",
    "Clara",
    "Diego",
    "Julia",
    "Pablo",
    "Olivia",
    "Marco",
    "Elena",
    "Daniel",
    "Sara",
    "Lucas",
    "Alba",
    "Tomás",
    "Vera",
    "Noah",
    "Inés",
    "Luca",
    "Mía",
  ];
  for (let i = 0; i < names.length; i++)
    createPerson(s, {
      firstName: names[i],
      birthYear: 1988 + (i % 15),
      nationalities: [["ES", "IT", "FR", "AR", "GB", "PT", "DE"][i % 7]],
      interests: [["Música", "Diseño", "Deporte", "Viajes"][Math.floor(i / 7)]],
      classification: "U",
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
