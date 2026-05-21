import { CardDef } from "./types";

// Zemmour: dark navy, MLP: dark blue, JLM: red-orange, Macron: yellow-gold, Bardella: light blue, Piaf: rose-pink, Bardot: forest green, Sarkozy: purple

export const CARDS: Record<string, CardDef> = {
  zemmour: {
    id: 'zemmour',
    name: "Reconquête",
    cost: 3,
    color: "#1e293b",
    label: "ZEM",
    spawnCount: 1,
    baseHp: 400,
    baseDamage: 30,
    speed: 40,
    range: 30,
    attackSpeed: 1,
    radius: 12,
    special: "conversion" // 40% chance to convert
  },
  marine: {
    id: 'marine',
    name: "La Présidente",
    cost: 5,
    color: "#1d4ed8",
    label: "MLP",
    spawnCount: 1,
    baseHp: 1500,
    baseDamage: 120,
    speed: 25,
    range: 40,
    attackSpeed: 1.5,
    radius: 18,
    special: "building_target"
  },
  melenchon: {
    id: 'melenchon',
    name: "L'Insoumis",
    cost: 4,
    color: "#ea580c",
    label: "JLM",
    spawnCount: 4, // Himself + 3 followers
    baseHp: 300,
    baseDamage: 40,
    speed: 45,
    range: 30,
    attackSpeed: 1.2,
    radius: 12,
    special: "aoe"
  },
  macron: {
    id: 'macron',
    name: "En Marche",
    cost: 6,
    color: "#eab308",
    label: "MAC",
    spawnCount: 1,
    baseHp: 800,
    baseDamage: 150,
    speed: 70, // Fast moving
    range: 30,
    attackSpeed: 0.8,
    radius: 14,
    special: "en_marche"
  },
  bardella: {
    id: 'bardella',
    name: "Le Jeune",
    cost: 2,
    color: "#38bdf8",
    label: "BAR",
    spawnCount: 1,
    baseHp: 200,
    baseDamage: 20,
    speed: 80,
    range: 20,
    attackSpeed: 0.5,
    radius: 10
  },
  piaf: {
    id: 'piaf',
    name: "La Môme",
    cost: 4,
    color: "#fb7185",
    label: "PIAF",
    spawnCount: 1,
    baseHp: 350,
    baseDamage: 10,
    speed: 35,
    range: 60,
    attackSpeed: 1,
    radius: 12,
    special: "heal_boost" // Heals and boosts damage
  },
  bardot: {
    id: 'bardot',
    name: "La Bête",
    cost: 3,
    color: "#166534",
    label: "BBK",
    spawnCount: 3, // Her + 2 pets
    baseHp: 250,
    baseDamage: 25,
    speed: 55,
    range: 25,
    attackSpeed: 0.8,
    radius: 11,
    special: "splash_pets"
  },
  sarkozy: {
    id: 'sarkozy',
    name: "Le Président",
    cost: 5,
    color: "#7e22ce",
    label: "SAR",
    spawnCount: 2, // Him + bodyguard
    baseHp: 600,
    baseDamage: 90,
    speed: 40,
    range: 30,
    attackSpeed: 1.1,
    radius: 14,
    special: "bodyguard"
  }
};

export const DECK = Object.values(CARDS);
