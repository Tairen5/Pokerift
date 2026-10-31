// ARCHIVO GENERADO por tools/import-rom-dungeons.mjs — no editar a mano.
// Fuente: BALANCE/mappa_s.bin, DUNGEON_DATA_LIST (arm9) y MESSAGE/text_e.str de una ROM propia (USA).

export interface RomExpeditionFloor {
  /** Piso de la mazmorra original del que salen los datos. */
  sourceFloor: number;
  layout: string;
  roomDensity: number;
  tileset: number;
  weather: number;
  floorConnectivity: number;
  enemyDensity: number;
  kecleonShopChance: number;
  monsterHouseChance: number;
  allowDeadEnds: boolean;
  roomImperfections: boolean;
  secondaryTerrain: boolean;
  itemDensity: number;
  trapDensity: number;
  fixedRoom: number;
  extraHallways: number;
  buriedItemDensity: number;
  waterDensity: number;
  darkness: number;
  maxCoin: number;
  /** Música del piso (music_id = SOUND/BGM/bgmNNNN.smd). */
  music: number;
  enemies: { species: string; md: number; level: number; weight: number }[];
  traps: { trap: string; weight: number }[];
  items: { item: string; romId: number; weight: number }[];
}

export interface RomExpeditionSegment {
  id: string;
  name: string;
  tileset: string;
  /** Pisos normales de la mazmorra original. */
  sourceFloors: number;
  floors: RomExpeditionFloor[];
}

export const ROM_EXPEDITION: RomExpeditionSegment[] | null = [
 {
  "id": "beachCave",
  "name": "Cueva Bajamar",
  "tileset": "eos-1",
  "sourceFloors": 4,
  "floors": [
   {
    "sourceFloor": 1,
    "layout": "small",
    "roomDensity": 5,
    "tileset": 1,
    "weather": 0,
    "floorConnectivity": 15,
    "enemyDensity": 4,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": false,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 1,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 5,
    "buriedItemDensity": 0,
    "waterDensity": 0,
    "darkness": 2,
    "maxCoin": 50,
    "music": 21,
    "enemies": [
     {
      "species": "shellder",
      "md": 90,
      "level": 1,
      "weight": 2500
     },
     {
      "species": "kabuto",
      "md": 140,
      "level": 1,
      "weight": 2500
     },
     {
      "species": "corsola",
      "md": 249,
      "level": 2,
      "weight": 2500
     },
     {
      "species": "shellos",
      "md": 462,
      "level": 2,
      "weight": 2500
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 10000
     }
    ]
   },
   {
    "sourceFloor": 2,
    "layout": "small",
    "roomDensity": 5,
    "tileset": 1,
    "weather": 0,
    "floorConnectivity": 15,
    "enemyDensity": 4,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": false,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 1,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 5,
    "buriedItemDensity": 0,
    "waterDensity": 0,
    "darkness": 2,
    "maxCoin": 50,
    "music": 21,
    "enemies": [
     {
      "species": "shellder",
      "md": 90,
      "level": 1,
      "weight": 2500
     },
     {
      "species": "kabuto",
      "md": 140,
      "level": 1,
      "weight": 2500
     },
     {
      "species": "corsola",
      "md": 249,
      "level": 2,
      "weight": 2500
     },
     {
      "species": "shellos",
      "md": 462,
      "level": 2,
      "weight": 2500
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 10000
     }
    ]
   },
   {
    "sourceFloor": 3,
    "layout": "small",
    "roomDensity": 6,
    "tileset": 1,
    "weather": 0,
    "floorConnectivity": 15,
    "enemyDensity": 4,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": false,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 1,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 5,
    "buriedItemDensity": 0,
    "waterDensity": 0,
    "darkness": 2,
    "maxCoin": 50,
    "music": 21,
    "enemies": [
     {
      "species": "shellder",
      "md": 90,
      "level": 1,
      "weight": 2500
     },
     {
      "species": "kabuto",
      "md": 140,
      "level": 1,
      "weight": 2500
     },
     {
      "species": "corsola",
      "md": 249,
      "level": 2,
      "weight": 2500
     },
     {
      "species": "shellos",
      "md": 462,
      "level": 2,
      "weight": 2500
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 5000
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 5000
     }
    ]
   },
   {
    "sourceFloor": 3,
    "layout": "small",
    "roomDensity": 6,
    "tileset": 1,
    "weather": 0,
    "floorConnectivity": 15,
    "enemyDensity": 4,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": false,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 1,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 5,
    "buriedItemDensity": 0,
    "waterDensity": 0,
    "darkness": 2,
    "maxCoin": 50,
    "music": 21,
    "enemies": [
     {
      "species": "shellder",
      "md": 90,
      "level": 1,
      "weight": 2500
     },
     {
      "species": "kabuto",
      "md": 140,
      "level": 1,
      "weight": 2500
     },
     {
      "species": "corsola",
      "md": 249,
      "level": 2,
      "weight": 2500
     },
     {
      "species": "shellos",
      "md": 462,
      "level": 2,
      "weight": 2500
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 5000
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 5000
     }
    ]
   },
   {
    "sourceFloor": 4,
    "layout": "small",
    "roomDensity": 6,
    "tileset": 1,
    "weather": 0,
    "floorConnectivity": 15,
    "enemyDensity": 4,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": false,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 2,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 5,
    "buriedItemDensity": 0,
    "waterDensity": 0,
    "darkness": 2,
    "maxCoin": 50,
    "music": 21,
    "enemies": [
     {
      "species": "shellder",
      "md": 90,
      "level": 1,
      "weight": 2500
     },
     {
      "species": "kabuto",
      "md": 140,
      "level": 1,
      "weight": 2500
     },
     {
      "species": "corsola",
      "md": 249,
      "level": 2,
      "weight": 2500
     },
     {
      "species": "shellos",
      "md": 462,
      "level": 2,
      "weight": 2500
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 5000
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 5000
     }
    ]
   }
  ]
 },
 {
  "id": "drenchedBluff",
  "name": "Risco Calado",
  "tileset": "eos-2",
  "sourceFloors": 6,
  "floors": [
   {
    "sourceFloor": 1,
    "layout": "small",
    "roomDensity": 9,
    "tileset": 2,
    "weather": 0,
    "floorConnectivity": 12,
    "enemyDensity": 5,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": false,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 3,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 0,
    "buriedItemDensity": 0,
    "waterDensity": 8,
    "darkness": 0,
    "maxCoin": 75,
    "music": 22,
    "enemies": [
     {
      "species": "lileep",
      "md": 373,
      "level": 3,
      "weight": 3333
     },
     {
      "species": "anorith",
      "md": 375,
      "level": 3,
      "weight": 3334
     },
     {
      "species": "shellos",
      "md": 463,
      "level": 4,
      "weight": 3333
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 3271
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1402
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 1079
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 719
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 539
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 449
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 360
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 360
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 359
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 359
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 252
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 180
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 112
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 112
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 112
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 112
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 112
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 112
     }
    ]
   },
   {
    "sourceFloor": 2,
    "layout": "small",
    "roomDensity": 9,
    "tileset": 2,
    "weather": 0,
    "floorConnectivity": 12,
    "enemyDensity": 5,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": true,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 3,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 0,
    "buriedItemDensity": 0,
    "waterDensity": 8,
    "darkness": 0,
    "maxCoin": 75,
    "music": 22,
    "enemies": [
     {
      "species": "lileep",
      "md": 373,
      "level": 3,
      "weight": 3333
     },
     {
      "species": "anorith",
      "md": 375,
      "level": 3,
      "weight": 3334
     },
     {
      "species": "shellos",
      "md": 463,
      "level": 4,
      "weight": 3333
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 3271
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1402
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 1079
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 719
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 539
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 449
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 360
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 360
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 359
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 359
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 252
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 180
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 112
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 112
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 112
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 112
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 112
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 112
     }
    ]
   },
   {
    "sourceFloor": 4,
    "layout": "medium",
    "roomDensity": 8,
    "tileset": 2,
    "weather": 0,
    "floorConnectivity": 12,
    "enemyDensity": 6,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": true,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 4,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 0,
    "buriedItemDensity": 0,
    "waterDensity": 8,
    "darkness": 0,
    "maxCoin": 75,
    "music": 22,
    "enemies": [
     {
      "species": "lileep",
      "md": 373,
      "level": 3,
      "weight": 2857
     },
     {
      "species": "anorith",
      "md": 375,
      "level": 3,
      "weight": 2857
     },
     {
      "species": "shellos",
      "md": 463,
      "level": 4,
      "weight": 2857
     },
     {
      "species": "chingling",
      "md": 475,
      "level": 4,
      "weight": 1429
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 3271
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1402
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 1237
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 825
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 449
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 413
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 412
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 412
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 412
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 288
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 206
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 112
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 112
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 112
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 112
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 112
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 112
     }
    ]
   },
   {
    "sourceFloor": 5,
    "layout": "medium",
    "roomDensity": 7,
    "tileset": 2,
    "weather": 0,
    "floorConnectivity": 12,
    "enemyDensity": 6,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": false,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 4,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 0,
    "buriedItemDensity": 0,
    "waterDensity": 8,
    "darkness": 0,
    "maxCoin": 75,
    "music": 22,
    "enemies": [
     {
      "species": "lileep",
      "md": 373,
      "level": 3,
      "weight": 2857
     },
     {
      "species": "anorith",
      "md": 375,
      "level": 3,
      "weight": 2857
     },
     {
      "species": "shellos",
      "md": 463,
      "level": 4,
      "weight": 2857
     },
     {
      "species": "chingling",
      "md": 475,
      "level": 4,
      "weight": 1429
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 3271
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1402
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 1126
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 751
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 563
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 449
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 376
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 376
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 376
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 376
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 263
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 112
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 112
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 112
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 112
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 112
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 112
     }
    ]
   },
   {
    "sourceFloor": 6,
    "layout": "large0x8",
    "roomDensity": 7,
    "tileset": 2,
    "weather": 0,
    "floorConnectivity": 12,
    "enemyDensity": 7,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": true,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 4,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 0,
    "buriedItemDensity": 0,
    "waterDensity": 8,
    "darkness": 0,
    "maxCoin": 75,
    "music": 22,
    "enemies": [
     {
      "species": "lileep",
      "md": 373,
      "level": 4,
      "weight": 2857
     },
     {
      "species": "anorith",
      "md": 375,
      "level": 4,
      "weight": 2857
     },
     {
      "species": "shellos",
      "md": 463,
      "level": 5,
      "weight": 2857
     },
     {
      "species": "chingling",
      "md": 475,
      "level": 5,
      "weight": 1429
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 3271
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1402
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 1097
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 731
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 548
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 449
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 366
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 366
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 366
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 365
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 256
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 112
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 112
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 112
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 112
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 112
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 112
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 37
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 37
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 37
     }
    ]
   }
  ]
 },
 {
  "id": "mtBristle",
  "name": "Monte Árido",
  "tileset": "eos-3",
  "sourceFloors": 9,
  "floors": [
   {
    "sourceFloor": 1,
    "layout": "small",
    "roomDensity": 7,
    "tileset": 3,
    "weather": 0,
    "floorConnectivity": 20,
    "enemyDensity": 5,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": false,
    "roomImperfections": false,
    "secondaryTerrain": false,
    "itemDensity": 3,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 6,
    "buriedItemDensity": 0,
    "waterDensity": 0,
    "darkness": 0,
    "maxCoin": 75,
    "music": 23,
    "enemies": [
     {
      "species": "machop",
      "md": 66,
      "level": 6,
      "weight": 1818
     },
     {
      "species": "geodude",
      "md": 74,
      "level": 6,
      "weight": 1818
     },
     {
      "species": "doduo",
      "md": 84,
      "level": 7,
      "weight": 1819
     },
     {
      "species": "spinarak",
      "md": 167,
      "level": 7,
      "weight": 1818
     },
     {
      "species": "starly",
      "md": 431,
      "level": 8,
      "weight": 2727
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 2069
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1379
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 841
     },
     {
      "item": "stick",
      "romId": 1,
      "weight": 690
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 690
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 280
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 280
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 280
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 280
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 280
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 252
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 224
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 196
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 173
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 173
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 173
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 173
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 168
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 168
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 129
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 129
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 97
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 65
     },
     {
      "item": "transferOrb",
      "romId": 315,
      "weight": 65
     },
     {
      "item": "luminousOrb",
      "romId": 318,
      "weight": 65
     },
     {
      "item": "decoyOrb",
      "romId": 325,
      "weight": 65
     },
     {
      "item": "slumberOrb",
      "romId": 326,
      "weight": 65
     },
     {
      "item": "totterOrb",
      "romId": 327,
      "weight": 65
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 65
     },
     {
      "item": "hurlOrb",
      "romId": 347,
      "weight": 65
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 65
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 32
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 32
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 32
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 28
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 28
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 28
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 28
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 28
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 28
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 28
     }
    ]
   },
   {
    "sourceFloor": 3,
    "layout": "medium",
    "roomDensity": 7,
    "tileset": 3,
    "weather": 0,
    "floorConnectivity": 20,
    "enemyDensity": 5,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": false,
    "roomImperfections": false,
    "secondaryTerrain": false,
    "itemDensity": 4,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 8,
    "buriedItemDensity": 0,
    "waterDensity": 0,
    "darkness": 0,
    "maxCoin": 75,
    "music": 23,
    "enemies": [
     {
      "species": "machop",
      "md": 66,
      "level": 6,
      "weight": 1818
     },
     {
      "species": "geodude",
      "md": 74,
      "level": 6,
      "weight": 1818
     },
     {
      "species": "doduo",
      "md": 84,
      "level": 7,
      "weight": 1819
     },
     {
      "species": "spinarak",
      "md": 167,
      "level": 7,
      "weight": 1818
     },
     {
      "species": "starly",
      "md": 431,
      "level": 8,
      "weight": 2727
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 2069
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1379
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 841
     },
     {
      "item": "stick",
      "romId": 1,
      "weight": 690
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 690
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 280
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 280
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 280
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 280
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 280
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 252
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 224
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 196
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 173
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 173
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 173
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 173
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 168
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 168
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 129
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 129
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 97
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 65
     },
     {
      "item": "transferOrb",
      "romId": 315,
      "weight": 65
     },
     {
      "item": "luminousOrb",
      "romId": 318,
      "weight": 65
     },
     {
      "item": "decoyOrb",
      "romId": 325,
      "weight": 65
     },
     {
      "item": "slumberOrb",
      "romId": 326,
      "weight": 65
     },
     {
      "item": "totterOrb",
      "romId": 327,
      "weight": 65
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 65
     },
     {
      "item": "hurlOrb",
      "romId": 347,
      "weight": 65
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 65
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 32
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 32
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 32
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 28
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 28
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 28
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 28
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 28
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 28
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 28
     }
    ]
   },
   {
    "sourceFloor": 5,
    "layout": "medium",
    "roomDensity": 8,
    "tileset": 3,
    "weather": 0,
    "floorConnectivity": 25,
    "enemyDensity": 6,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": true,
    "roomImperfections": false,
    "secondaryTerrain": false,
    "itemDensity": 4,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 10,
    "buriedItemDensity": 0,
    "waterDensity": 0,
    "darkness": 0,
    "maxCoin": 75,
    "music": 23,
    "enemies": [
     {
      "species": "nidorina",
      "md": 30,
      "level": 5,
      "weight": 1333
     },
     {
      "species": "nidorino",
      "md": 33,
      "level": 5,
      "weight": 1334
     },
     {
      "species": "machop",
      "md": 66,
      "level": 6,
      "weight": 1333
     },
     {
      "species": "geodude",
      "md": 74,
      "level": 6,
      "weight": 1333
     },
     {
      "species": "doduo",
      "md": 84,
      "level": 7,
      "weight": 1334
     },
     {
      "species": "spinarak",
      "md": 167,
      "level": 7,
      "weight": 1333
     },
     {
      "species": "starly",
      "md": 431,
      "level": 8,
      "weight": 2000
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 2069
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1379
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 750
     },
     {
      "item": "stick",
      "romId": 1,
      "weight": 690
     },
     {
      "item": "rawstBerry",
      "romId": 78,
      "weight": 375
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 345
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 345
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 345
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 345
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 250
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 250
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 250
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 250
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 250
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 225
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 200
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 188
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 188
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 175
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 150
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 150
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 141
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 94
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 94
     },
     {
      "item": "hurlOrb",
      "romId": 347,
      "weight": 94
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 94
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 47
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 47
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 47
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 25
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 25
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 25
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 25
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 25
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 25
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 25
     }
    ]
   },
   {
    "sourceFloor": 7,
    "layout": "medium",
    "roomDensity": 10,
    "tileset": 3,
    "weather": 0,
    "floorConnectivity": 20,
    "enemyDensity": 6,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": true,
    "roomImperfections": false,
    "secondaryTerrain": false,
    "itemDensity": 4,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 15,
    "buriedItemDensity": 0,
    "waterDensity": 0,
    "darkness": 0,
    "maxCoin": 75,
    "music": 23,
    "enemies": [
     {
      "species": "nidorina",
      "md": 30,
      "level": 6,
      "weight": 1333
     },
     {
      "species": "nidorino",
      "md": 33,
      "level": 6,
      "weight": 1334
     },
     {
      "species": "machop",
      "md": 66,
      "level": 7,
      "weight": 1333
     },
     {
      "species": "geodude",
      "md": 74,
      "level": 7,
      "weight": 1333
     },
     {
      "species": "doduo",
      "md": 84,
      "level": 8,
      "weight": 1334
     },
     {
      "species": "spinarak",
      "md": 167,
      "level": 8,
      "weight": 1333
     },
     {
      "species": "starly",
      "md": 431,
      "level": 9,
      "weight": 2000
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 2069
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1379
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 750
     },
     {
      "item": "stick",
      "romId": 1,
      "weight": 690
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 690
     },
     {
      "item": "rawstBerry",
      "romId": 78,
      "weight": 375
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 250
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 250
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 250
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 250
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 250
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 225
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 200
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 188
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 188
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 175
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 173
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 173
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 173
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 173
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 150
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 150
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 141
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 94
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 94
     },
     {
      "item": "hurlOrb",
      "romId": 347,
      "weight": 94
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 94
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 47
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 47
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 47
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 25
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 25
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 25
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 25
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 25
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 25
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 25
     }
    ]
   },
   {
    "sourceFloor": 9,
    "layout": "medium",
    "roomDensity": 12,
    "tileset": 3,
    "weather": 0,
    "floorConnectivity": 20,
    "enemyDensity": 6,
    "kecleonShopChance": 0,
    "monsterHouseChance": 0,
    "allowDeadEnds": true,
    "roomImperfections": false,
    "secondaryTerrain": false,
    "itemDensity": 4,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 15,
    "buriedItemDensity": 0,
    "waterDensity": 0,
    "darkness": 0,
    "maxCoin": 75,
    "music": 23,
    "enemies": [
     {
      "species": "nidorina",
      "md": 30,
      "level": 6,
      "weight": 1333
     },
     {
      "species": "nidorino",
      "md": 33,
      "level": 6,
      "weight": 1334
     },
     {
      "species": "machop",
      "md": 66,
      "level": 7,
      "weight": 1333
     },
     {
      "species": "geodude",
      "md": 74,
      "level": 7,
      "weight": 1333
     },
     {
      "species": "doduo",
      "md": 84,
      "level": 8,
      "weight": 1334
     },
     {
      "species": "spinarak",
      "md": 167,
      "level": 8,
      "weight": 1333
     },
     {
      "species": "starly",
      "md": 431,
      "level": 9,
      "weight": 2000
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 2069
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1379
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 750
     },
     {
      "item": "stick",
      "romId": 1,
      "weight": 690
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 690
     },
     {
      "item": "rawstBerry",
      "romId": 78,
      "weight": 375
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 250
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 250
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 250
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 250
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 250
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 225
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 200
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 188
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 188
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 175
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 173
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 173
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 173
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 173
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 150
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 150
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 141
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 94
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 94
     },
     {
      "item": "hurlOrb",
      "romId": 347,
      "weight": 94
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 94
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 47
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 47
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 47
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 25
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 25
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 25
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 25
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 25
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 25
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 25
     }
    ]
   }
  ]
 },
 {
  "id": "waterfallCave",
  "name": "Cueva Cascada",
  "tileset": "eos-4",
  "sourceFloors": 8,
  "floors": [
   {
    "sourceFloor": 1,
    "layout": "large",
    "roomDensity": 10,
    "tileset": 4,
    "weather": 0,
    "floorConnectivity": 25,
    "enemyDensity": 4,
    "kecleonShopChance": 8,
    "monsterHouseChance": 0,
    "allowDeadEnds": false,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 3,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 15,
    "buriedItemDensity": 0,
    "waterDensity": 25,
    "darkness": 2,
    "maxCoin": 75,
    "music": 24,
    "enemies": [
     {
      "species": "psyduck",
      "md": 54,
      "level": 9,
      "weight": 952
     },
     {
      "species": "poliwag",
      "md": 60,
      "level": 9,
      "weight": 1270
     },
     {
      "species": "grimer",
      "md": 88,
      "level": 9,
      "weight": 953
     },
     {
      "species": "tangela",
      "md": 114,
      "level": 10,
      "weight": 1269
     },
     {
      "species": "wooper",
      "md": 194,
      "level": 10,
      "weight": 1905
     },
     {
      "species": "lotad",
      "md": 298,
      "level": 10,
      "weight": 1111
     },
     {
      "species": "surskit",
      "md": 311,
      "level": 11,
      "weight": 1270
     },
     {
      "species": "barboach",
      "md": 367,
      "level": 11,
      "weight": 1270
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 3497
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1748
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 466
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 450
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 187
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 187
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 187
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 187
     },
     {
      "item": "twistBand",
      "romId": 18,
      "weight": 186
     },
     {
      "item": "powerBand",
      "romId": 26,
      "weight": 186
     },
     {
      "item": "specialBand",
      "romId": 40,
      "weight": 186
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 169
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 150
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 131
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 117
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 117
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 117
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 117
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 117
     },
     {
      "item": "clearGummi",
      "romId": 124,
      "weight": 117
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 117
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 117
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 112
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 112
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 105
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 94
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 70
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 35
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 35
     },
     {
      "item": "transferOrb",
      "romId": 315,
      "weight": 35
     },
     {
      "item": "luminousOrb",
      "romId": 318,
      "weight": 35
     },
     {
      "item": "decoyOrb",
      "romId": 325,
      "weight": 35
     },
     {
      "item": "slumberOrb",
      "romId": 326,
      "weight": 35
     },
     {
      "item": "totterOrb",
      "romId": 327,
      "weight": 35
     },
     {
      "item": "scannerOrb",
      "romId": 331,
      "weight": 35
     },
     {
      "item": "radarOrb",
      "romId": 332,
      "weight": 35
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 35
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 35
     },
     {
      "item": "oneShotOrb",
      "romId": 337,
      "weight": 35
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 35
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 35
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 35
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 19
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 19
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 19
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 19
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 19
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 19
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 19
     }
    ]
   },
   {
    "sourceFloor": 3,
    "layout": "large",
    "roomDensity": 9,
    "tileset": 4,
    "weather": 0,
    "floorConnectivity": 25,
    "enemyDensity": 4,
    "kecleonShopChance": 9,
    "monsterHouseChance": 0,
    "allowDeadEnds": true,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 4,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 15,
    "buriedItemDensity": 0,
    "waterDensity": 25,
    "darkness": 2,
    "maxCoin": 75,
    "music": 24,
    "enemies": [
     {
      "species": "psyduck",
      "md": 54,
      "level": 9,
      "weight": 952
     },
     {
      "species": "poliwag",
      "md": 60,
      "level": 9,
      "weight": 1270
     },
     {
      "species": "grimer",
      "md": 88,
      "level": 9,
      "weight": 953
     },
     {
      "species": "tangela",
      "md": 114,
      "level": 10,
      "weight": 1269
     },
     {
      "species": "wooper",
      "md": 194,
      "level": 10,
      "weight": 1905
     },
     {
      "species": "lotad",
      "md": 298,
      "level": 10,
      "weight": 1111
     },
     {
      "species": "surskit",
      "md": 311,
      "level": 11,
      "weight": 1270
     },
     {
      "species": "barboach",
      "md": 367,
      "level": 11,
      "weight": 1270
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 3497
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1748
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 466
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 450
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 187
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 187
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 187
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 187
     },
     {
      "item": "twistBand",
      "romId": 18,
      "weight": 186
     },
     {
      "item": "powerBand",
      "romId": 26,
      "weight": 186
     },
     {
      "item": "specialBand",
      "romId": 40,
      "weight": 186
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 169
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 150
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 131
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 117
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 117
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 117
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 117
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 117
     },
     {
      "item": "clearGummi",
      "romId": 124,
      "weight": 117
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 117
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 117
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 112
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 112
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 105
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 94
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 70
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 35
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 35
     },
     {
      "item": "transferOrb",
      "romId": 315,
      "weight": 35
     },
     {
      "item": "luminousOrb",
      "romId": 318,
      "weight": 35
     },
     {
      "item": "decoyOrb",
      "romId": 325,
      "weight": 35
     },
     {
      "item": "slumberOrb",
      "romId": 326,
      "weight": 35
     },
     {
      "item": "totterOrb",
      "romId": 327,
      "weight": 35
     },
     {
      "item": "scannerOrb",
      "romId": 331,
      "weight": 35
     },
     {
      "item": "radarOrb",
      "romId": 332,
      "weight": 35
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 35
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 35
     },
     {
      "item": "oneShotOrb",
      "romId": 337,
      "weight": 35
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 35
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 35
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 35
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 19
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 19
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 19
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 19
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 19
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 19
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 19
     }
    ]
   },
   {
    "sourceFloor": 5,
    "layout": "large",
    "roomDensity": 8,
    "tileset": 4,
    "weather": 0,
    "floorConnectivity": 25,
    "enemyDensity": 4,
    "kecleonShopChance": 9,
    "monsterHouseChance": 0,
    "allowDeadEnds": true,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 5,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 15,
    "buriedItemDensity": 0,
    "waterDensity": 25,
    "darkness": 2,
    "maxCoin": 75,
    "music": 24,
    "enemies": [
     {
      "species": "psyduck",
      "md": 54,
      "level": 9,
      "weight": 909
     },
     {
      "species": "poliwag",
      "md": 60,
      "level": 9,
      "weight": 1212
     },
     {
      "species": "grimer",
      "md": 88,
      "level": 9,
      "weight": 909
     },
     {
      "species": "tangela",
      "md": 114,
      "level": 10,
      "weight": 1212
     },
     {
      "species": "wooper",
      "md": 194,
      "level": 10,
      "weight": 1819
     },
     {
      "species": "lotad",
      "md": 298,
      "level": 10,
      "weight": 1060
     },
     {
      "species": "surskit",
      "md": 311,
      "level": 11,
      "weight": 1212
     },
     {
      "species": "barboach",
      "md": 367,
      "level": 11,
      "weight": 1212
     },
     {
      "species": "whiscash",
      "md": 368,
      "level": 11,
      "weight": 455
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 3497
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1748
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 466
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 450
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 187
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 187
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 187
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 187
     },
     {
      "item": "twistBand",
      "romId": 18,
      "weight": 186
     },
     {
      "item": "powerBand",
      "romId": 26,
      "weight": 186
     },
     {
      "item": "specialBand",
      "romId": 40,
      "weight": 186
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 169
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 150
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 131
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 117
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 117
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 117
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 117
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 117
     },
     {
      "item": "clearGummi",
      "romId": 124,
      "weight": 117
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 117
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 117
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 112
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 112
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 105
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 94
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 70
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 35
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 35
     },
     {
      "item": "transferOrb",
      "romId": 315,
      "weight": 35
     },
     {
      "item": "luminousOrb",
      "romId": 318,
      "weight": 35
     },
     {
      "item": "decoyOrb",
      "romId": 325,
      "weight": 35
     },
     {
      "item": "slumberOrb",
      "romId": 326,
      "weight": 35
     },
     {
      "item": "totterOrb",
      "romId": 327,
      "weight": 35
     },
     {
      "item": "scannerOrb",
      "romId": 331,
      "weight": 35
     },
     {
      "item": "radarOrb",
      "romId": 332,
      "weight": 35
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 35
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 35
     },
     {
      "item": "oneShotOrb",
      "romId": 337,
      "weight": 35
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 35
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 35
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 35
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 19
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 19
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 19
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 19
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 19
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 19
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 19
     }
    ]
   },
   {
    "sourceFloor": 6,
    "layout": "large",
    "roomDensity": 7,
    "tileset": 4,
    "weather": 0,
    "floorConnectivity": 25,
    "enemyDensity": 5,
    "kecleonShopChance": 9,
    "monsterHouseChance": 0,
    "allowDeadEnds": false,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 5,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 15,
    "buriedItemDensity": 0,
    "waterDensity": 25,
    "darkness": 2,
    "maxCoin": 75,
    "music": 24,
    "enemies": [
     {
      "species": "psyduck",
      "md": 54,
      "level": 10,
      "weight": 909
     },
     {
      "species": "poliwag",
      "md": 60,
      "level": 10,
      "weight": 1212
     },
     {
      "species": "grimer",
      "md": 88,
      "level": 10,
      "weight": 909
     },
     {
      "species": "tangela",
      "md": 114,
      "level": 11,
      "weight": 1212
     },
     {
      "species": "wooper",
      "md": 194,
      "level": 11,
      "weight": 1819
     },
     {
      "species": "lotad",
      "md": 298,
      "level": 11,
      "weight": 1060
     },
     {
      "species": "surskit",
      "md": 311,
      "level": 12,
      "weight": 1212
     },
     {
      "species": "barboach",
      "md": 367,
      "level": 12,
      "weight": 1212
     },
     {
      "species": "whiscash",
      "md": 368,
      "level": 12,
      "weight": 455
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 3497
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1748
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 466
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 450
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 187
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 187
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 187
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 187
     },
     {
      "item": "twistBand",
      "romId": 18,
      "weight": 186
     },
     {
      "item": "powerBand",
      "romId": 26,
      "weight": 186
     },
     {
      "item": "specialBand",
      "romId": 40,
      "weight": 186
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 169
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 150
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 131
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 117
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 117
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 117
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 117
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 117
     },
     {
      "item": "clearGummi",
      "romId": 124,
      "weight": 117
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 117
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 117
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 112
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 112
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 105
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 94
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 70
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 35
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 35
     },
     {
      "item": "transferOrb",
      "romId": 315,
      "weight": 35
     },
     {
      "item": "luminousOrb",
      "romId": 318,
      "weight": 35
     },
     {
      "item": "decoyOrb",
      "romId": 325,
      "weight": 35
     },
     {
      "item": "slumberOrb",
      "romId": 326,
      "weight": 35
     },
     {
      "item": "totterOrb",
      "romId": 327,
      "weight": 35
     },
     {
      "item": "scannerOrb",
      "romId": 331,
      "weight": 35
     },
     {
      "item": "radarOrb",
      "romId": 332,
      "weight": 35
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 35
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 35
     },
     {
      "item": "oneShotOrb",
      "romId": 337,
      "weight": 35
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 35
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 35
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 35
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 19
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 19
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 19
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 19
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 19
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 19
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 19
     }
    ]
   },
   {
    "sourceFloor": 8,
    "layout": "large",
    "roomDensity": 9,
    "tileset": 4,
    "weather": 0,
    "floorConnectivity": 25,
    "enemyDensity": 5,
    "kecleonShopChance": 10,
    "monsterHouseChance": 0,
    "allowDeadEnds": false,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 4,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 15,
    "buriedItemDensity": 0,
    "waterDensity": 25,
    "darkness": 2,
    "maxCoin": 75,
    "music": 24,
    "enemies": [
     {
      "species": "psyduck",
      "md": 54,
      "level": 10,
      "weight": 909
     },
     {
      "species": "poliwag",
      "md": 60,
      "level": 10,
      "weight": 1212
     },
     {
      "species": "grimer",
      "md": 88,
      "level": 10,
      "weight": 909
     },
     {
      "species": "tangela",
      "md": 114,
      "level": 11,
      "weight": 1212
     },
     {
      "species": "wooper",
      "md": 194,
      "level": 11,
      "weight": 1819
     },
     {
      "species": "lotad",
      "md": 298,
      "level": 11,
      "weight": 1060
     },
     {
      "species": "surskit",
      "md": 311,
      "level": 12,
      "weight": 1212
     },
     {
      "species": "barboach",
      "md": 367,
      "level": 12,
      "weight": 1212
     },
     {
      "species": "whiscash",
      "md": 368,
      "level": 12,
      "weight": 455
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 3497
     },
     {
      "item": "geoPebble",
      "romId": 8,
      "weight": 1748
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 466
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 450
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 187
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 187
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 187
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 187
     },
     {
      "item": "twistBand",
      "romId": 18,
      "weight": 186
     },
     {
      "item": "powerBand",
      "romId": 26,
      "weight": 186
     },
     {
      "item": "specialBand",
      "romId": 40,
      "weight": 186
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 169
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 150
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 131
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 117
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 117
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 117
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 117
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 117
     },
     {
      "item": "clearGummi",
      "romId": 124,
      "weight": 117
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 117
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 117
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 112
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 112
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 105
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 94
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 70
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 35
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 35
     },
     {
      "item": "transferOrb",
      "romId": 315,
      "weight": 35
     },
     {
      "item": "luminousOrb",
      "romId": 318,
      "weight": 35
     },
     {
      "item": "decoyOrb",
      "romId": 325,
      "weight": 35
     },
     {
      "item": "slumberOrb",
      "romId": 326,
      "weight": 35
     },
     {
      "item": "totterOrb",
      "romId": 327,
      "weight": 35
     },
     {
      "item": "scannerOrb",
      "romId": 331,
      "weight": 35
     },
     {
      "item": "radarOrb",
      "romId": 332,
      "weight": 35
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 35
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 35
     },
     {
      "item": "oneShotOrb",
      "romId": 337,
      "weight": 35
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 35
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 35
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 35
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 19
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 19
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 19
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 19
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 19
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 19
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 19
     }
    ]
   }
  ]
 },
 {
  "id": "appleWoods",
  "name": "Manzanar",
  "tileset": "eos-5",
  "sourceFloors": 12,
  "floors": [
   {
    "sourceFloor": 1,
    "layout": "medium",
    "roomDensity": 11,
    "tileset": 5,
    "weather": 0,
    "floorConnectivity": 25,
    "enemyDensity": 4,
    "kecleonShopChance": 8,
    "monsterHouseChance": 0,
    "allowDeadEnds": true,
    "roomImperfections": false,
    "secondaryTerrain": false,
    "itemDensity": 3,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 10,
    "buriedItemDensity": 0,
    "waterDensity": 5,
    "darkness": 0,
    "maxCoin": 80,
    "music": 25,
    "enemies": [
     {
      "species": "caterpie",
      "md": 10,
      "level": 10,
      "weight": 1429
     },
     {
      "species": "butterfree",
      "md": 12,
      "level": 14,
      "weight": 1428
     },
     {
      "species": "oddish",
      "md": 43,
      "level": 11,
      "weight": 1429
     },
     {
      "species": "paras",
      "md": 46,
      "level": 11,
      "weight": 1428
     },
     {
      "species": "hoppip",
      "md": 187,
      "level": 11,
      "weight": 1429
     },
     {
      "species": "budew",
      "md": 441,
      "level": 11,
      "weight": 1428
     },
     {
      "species": "burmy",
      "md": 447,
      "level": 11,
      "weight": 1429
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 2981
     },
     {
      "item": "stick",
      "romId": 1,
      "weight": 993
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 618
     },
     {
      "item": "bigApple",
      "romId": 110,
      "weight": 464
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 368
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 184
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 184
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 184
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 184
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 166
     },
     {
      "item": "twistBand",
      "romId": 18,
      "weight": 155
     },
     {
      "item": "powerBand",
      "romId": 26,
      "weight": 155
     },
     {
      "item": "specialBand",
      "romId": 40,
      "weight": 155
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 155
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 155
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 155
     },
     {
      "item": "clearGummi",
      "romId": 124,
      "weight": 155
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 155
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 154
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 154
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 154
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 147
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 135
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 129
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 110
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 110
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 92
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 68
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 68
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 45
     },
     {
      "item": "transferOrb",
      "romId": 315,
      "weight": 45
     },
     {
      "item": "luminousOrb",
      "romId": 318,
      "weight": 45
     },
     {
      "item": "petrifyOrb",
      "romId": 319,
      "weight": 45
     },
     {
      "item": "decoyOrb",
      "romId": 325,
      "weight": 45
     },
     {
      "item": "slumberOrb",
      "romId": 326,
      "weight": 45
     },
     {
      "item": "totterOrb",
      "romId": 327,
      "weight": 45
     },
     {
      "item": "scannerOrb",
      "romId": 331,
      "weight": 45
     },
     {
      "item": "radarOrb",
      "romId": 332,
      "weight": 45
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 45
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 45
     },
     {
      "item": "hurlOrb",
      "romId": 347,
      "weight": 45
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 45
     },
     {
      "item": "foeFearOrb",
      "romId": 357,
      "weight": 45
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 45
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 45
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 18
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 18
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 18
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 18
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 18
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 18
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 18
     },
     {
      "item": "focusPunch",
      "romId": 188,
      "weight": 10
     },
     {
      "item": "waterPulse",
      "romId": 190,
      "weight": 10
     },
     {
      "item": "lightScreen",
      "romId": 203,
      "weight": 10
     },
     {
      "item": "brickBreak",
      "romId": 218,
      "weight": 10
     },
     {
      "item": "reflect",
      "romId": 220,
      "weight": 10
     },
     {
      "item": "rest",
      "romId": 231,
      "weight": 10
     },
     {
      "item": "energyBall",
      "romId": 240,
      "weight": 10
     },
     {
      "item": "embargo",
      "romId": 250,
      "weight": 10
     },
     {
      "item": "recycle",
      "romId": 254,
      "weight": 10
     },
     {
      "item": "dive",
      "romId": 261,
      "weight": 10
     },
     {
      "item": "thunderWave",
      "romId": 265,
      "weight": 10
     },
     {
      "item": "swordsDance",
      "romId": 267,
      "weight": 10
     },
     {
      "item": "vacuumCut",
      "romId": 260,
      "weight": 7
     },
     {
      "item": "flash",
      "romId": 262,
      "weight": 7
     },
     {
      "item": "shockWave",
      "romId": 221,
      "weight": 6
     },
     {
      "item": "dragonClaw",
      "romId": 189,
      "weight": 5
     },
     {
      "item": "calmMind",
      "romId": 191,
      "weight": 5
     },
     {
      "item": "roar",
      "romId": 192,
      "weight": 5
     },
     {
      "item": "hiddenPower",
      "romId": 197,
      "weight": 5
     },
     {
      "item": "protect",
      "romId": 204,
      "weight": 5
     },
     {
      "item": "gigaDrain",
      "romId": 206,
      "weight": 5
     },
     {
      "item": "safeguard",
      "romId": 207,
      "weight": 5
     },
     {
      "item": "aerialAce",
      "romId": 227,
      "weight": 5
     },
     {
      "item": "torment",
      "romId": 228,
      "weight": 5
     },
     {
      "item": "attract",
      "romId": 232,
      "weight": 5
     },
     {
      "item": "roost",
      "romId": 238,
      "weight": 5
     },
     {
      "item": "focusBlast",
      "romId": 239,
      "weight": 5
     },
     {
      "item": "falseSwipe",
      "romId": 241,
      "weight": 5
     },
     {
      "item": "brine",
      "romId": 242,
      "weight": 5
     },
     {
      "item": "explosion",
      "romId": 251,
      "weight": 5
     },
     {
      "item": "payback",
      "romId": 253,
      "weight": 5
     },
     {
      "item": "wideSlash",
      "romId": 257,
      "weight": 5
     },
     {
      "item": "stealthRock",
      "romId": 268,
      "weight": 5
     },
     {
      "item": "rockSlide",
      "romId": 272,
      "weight": 5
     },
     {
      "item": "naturalGift",
      "romId": 275,
      "weight": 5
     },
     {
      "item": "poisonJab",
      "romId": 276,
      "weight": 5
     },
     {
      "item": "hyperBeam",
      "romId": 202,
      "weight": 4
     },
     {
      "item": "steelWing",
      "romId": 234,
      "weight": 4
     },
     {
      "item": "solarBeam",
      "romId": 209,
      "weight": 2
     },
     {
      "item": "thunderbolt",
      "romId": 211,
      "weight": 2
     },
     {
      "item": "dig",
      "romId": 215,
      "weight": 2
     },
     {
      "item": "bulletSeed",
      "romId": 196,
      "weight": 1
     },
     {
      "item": "taunt",
      "romId": 199,
      "weight": 1
     },
     {
      "item": "ironTail",
      "romId": 210,
      "weight": 1
     },
     {
      "item": "shadowClaw",
      "romId": 252,
      "weight": 1
     },
     {
      "item": "gigaImpact",
      "romId": 255,
      "weight": 1
     }
    ]
   },
   {
    "sourceFloor": 4,
    "layout": "large",
    "roomDensity": 8,
    "tileset": 5,
    "weather": 0,
    "floorConnectivity": 30,
    "enemyDensity": 4,
    "kecleonShopChance": 9,
    "monsterHouseChance": 0,
    "allowDeadEnds": true,
    "roomImperfections": false,
    "secondaryTerrain": false,
    "itemDensity": 4,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 10,
    "buriedItemDensity": 0,
    "waterDensity": 5,
    "darkness": 0,
    "maxCoin": 80,
    "music": 25,
    "enemies": [
     {
      "species": "caterpie",
      "md": 10,
      "level": 10,
      "weight": 1176
     },
     {
      "species": "butterfree",
      "md": 12,
      "level": 14,
      "weight": 1177
     },
     {
      "species": "weedle",
      "md": 13,
      "level": 11,
      "weight": 588
     },
     {
      "species": "oddish",
      "md": 43,
      "level": 11,
      "weight": 1177
     },
     {
      "species": "paras",
      "md": 46,
      "level": 11,
      "weight": 1176
     },
     {
      "species": "exeggutor",
      "md": 103,
      "level": 11,
      "weight": 1177
     },
     {
      "species": "hoppip",
      "md": 187,
      "level": 11,
      "weight": 1176
     },
     {
      "species": "budew",
      "md": 441,
      "level": 11,
      "weight": 1177
     },
     {
      "species": "burmy",
      "md": 447,
      "level": 11,
      "weight": 1176
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 2981
     },
     {
      "item": "stick",
      "romId": 1,
      "weight": 993
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 618
     },
     {
      "item": "bigApple",
      "romId": 110,
      "weight": 464
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 368
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 184
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 184
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 184
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 184
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 166
     },
     {
      "item": "twistBand",
      "romId": 18,
      "weight": 155
     },
     {
      "item": "powerBand",
      "romId": 26,
      "weight": 155
     },
     {
      "item": "specialBand",
      "romId": 40,
      "weight": 155
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 155
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 155
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 155
     },
     {
      "item": "clearGummi",
      "romId": 124,
      "weight": 155
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 155
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 154
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 154
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 154
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 147
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 135
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 129
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 110
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 110
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 92
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 68
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 68
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 45
     },
     {
      "item": "transferOrb",
      "romId": 315,
      "weight": 45
     },
     {
      "item": "luminousOrb",
      "romId": 318,
      "weight": 45
     },
     {
      "item": "petrifyOrb",
      "romId": 319,
      "weight": 45
     },
     {
      "item": "decoyOrb",
      "romId": 325,
      "weight": 45
     },
     {
      "item": "slumberOrb",
      "romId": 326,
      "weight": 45
     },
     {
      "item": "totterOrb",
      "romId": 327,
      "weight": 45
     },
     {
      "item": "scannerOrb",
      "romId": 331,
      "weight": 45
     },
     {
      "item": "radarOrb",
      "romId": 332,
      "weight": 45
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 45
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 45
     },
     {
      "item": "hurlOrb",
      "romId": 347,
      "weight": 45
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 45
     },
     {
      "item": "foeFearOrb",
      "romId": 357,
      "weight": 45
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 45
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 45
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 18
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 18
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 18
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 18
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 18
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 18
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 18
     },
     {
      "item": "focusPunch",
      "romId": 188,
      "weight": 10
     },
     {
      "item": "waterPulse",
      "romId": 190,
      "weight": 10
     },
     {
      "item": "lightScreen",
      "romId": 203,
      "weight": 10
     },
     {
      "item": "brickBreak",
      "romId": 218,
      "weight": 10
     },
     {
      "item": "reflect",
      "romId": 220,
      "weight": 10
     },
     {
      "item": "rest",
      "romId": 231,
      "weight": 10
     },
     {
      "item": "energyBall",
      "romId": 240,
      "weight": 10
     },
     {
      "item": "embargo",
      "romId": 250,
      "weight": 10
     },
     {
      "item": "recycle",
      "romId": 254,
      "weight": 10
     },
     {
      "item": "dive",
      "romId": 261,
      "weight": 10
     },
     {
      "item": "thunderWave",
      "romId": 265,
      "weight": 10
     },
     {
      "item": "swordsDance",
      "romId": 267,
      "weight": 10
     },
     {
      "item": "vacuumCut",
      "romId": 260,
      "weight": 7
     },
     {
      "item": "flash",
      "romId": 262,
      "weight": 7
     },
     {
      "item": "shockWave",
      "romId": 221,
      "weight": 6
     },
     {
      "item": "dragonClaw",
      "romId": 189,
      "weight": 5
     },
     {
      "item": "calmMind",
      "romId": 191,
      "weight": 5
     },
     {
      "item": "roar",
      "romId": 192,
      "weight": 5
     },
     {
      "item": "hiddenPower",
      "romId": 197,
      "weight": 5
     },
     {
      "item": "protect",
      "romId": 204,
      "weight": 5
     },
     {
      "item": "gigaDrain",
      "romId": 206,
      "weight": 5
     },
     {
      "item": "safeguard",
      "romId": 207,
      "weight": 5
     },
     {
      "item": "aerialAce",
      "romId": 227,
      "weight": 5
     },
     {
      "item": "torment",
      "romId": 228,
      "weight": 5
     },
     {
      "item": "attract",
      "romId": 232,
      "weight": 5
     },
     {
      "item": "roost",
      "romId": 238,
      "weight": 5
     },
     {
      "item": "focusBlast",
      "romId": 239,
      "weight": 5
     },
     {
      "item": "falseSwipe",
      "romId": 241,
      "weight": 5
     },
     {
      "item": "brine",
      "romId": 242,
      "weight": 5
     },
     {
      "item": "explosion",
      "romId": 251,
      "weight": 5
     },
     {
      "item": "payback",
      "romId": 253,
      "weight": 5
     },
     {
      "item": "wideSlash",
      "romId": 257,
      "weight": 5
     },
     {
      "item": "stealthRock",
      "romId": 268,
      "weight": 5
     },
     {
      "item": "rockSlide",
      "romId": 272,
      "weight": 5
     },
     {
      "item": "naturalGift",
      "romId": 275,
      "weight": 5
     },
     {
      "item": "poisonJab",
      "romId": 276,
      "weight": 5
     },
     {
      "item": "hyperBeam",
      "romId": 202,
      "weight": 4
     },
     {
      "item": "steelWing",
      "romId": 234,
      "weight": 4
     },
     {
      "item": "solarBeam",
      "romId": 209,
      "weight": 2
     },
     {
      "item": "thunderbolt",
      "romId": 211,
      "weight": 2
     },
     {
      "item": "dig",
      "romId": 215,
      "weight": 2
     },
     {
      "item": "bulletSeed",
      "romId": 196,
      "weight": 1
     },
     {
      "item": "taunt",
      "romId": 199,
      "weight": 1
     },
     {
      "item": "ironTail",
      "romId": 210,
      "weight": 1
     },
     {
      "item": "shadowClaw",
      "romId": 252,
      "weight": 1
     },
     {
      "item": "gigaImpact",
      "romId": 255,
      "weight": 1
     }
    ]
   },
   {
    "sourceFloor": 7,
    "layout": "outerRing",
    "roomDensity": 5,
    "tileset": 5,
    "weather": 0,
    "floorConnectivity": 20,
    "enemyDensity": 5,
    "kecleonShopChance": 10,
    "monsterHouseChance": 0,
    "allowDeadEnds": true,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 5,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 15,
    "buriedItemDensity": 0,
    "waterDensity": 5,
    "darkness": 0,
    "maxCoin": 80,
    "music": 25,
    "enemies": [
     {
      "species": "butterfree",
      "md": 12,
      "level": 15,
      "weight": 1818
     },
     {
      "species": "weedle",
      "md": 13,
      "level": 12,
      "weight": 909
     },
     {
      "species": "gloom",
      "md": 44,
      "level": 12,
      "weight": 1818
     },
     {
      "species": "paras",
      "md": 46,
      "level": 12,
      "weight": 1819
     },
     {
      "species": "exeggutor",
      "md": 103,
      "level": 12,
      "weight": 1818
     },
     {
      "species": "combee",
      "md": 454,
      "level": 12,
      "weight": 1818
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 2981
     },
     {
      "item": "stick",
      "romId": 1,
      "weight": 993
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 618
     },
     {
      "item": "bigApple",
      "romId": 110,
      "weight": 464
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 368
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 184
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 184
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 184
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 184
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 166
     },
     {
      "item": "twistBand",
      "romId": 18,
      "weight": 155
     },
     {
      "item": "powerBand",
      "romId": 26,
      "weight": 155
     },
     {
      "item": "specialBand",
      "romId": 40,
      "weight": 155
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 155
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 155
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 155
     },
     {
      "item": "clearGummi",
      "romId": 124,
      "weight": 155
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 155
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 154
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 154
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 154
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 147
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 135
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 129
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 110
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 110
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 92
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 68
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 68
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 45
     },
     {
      "item": "transferOrb",
      "romId": 315,
      "weight": 45
     },
     {
      "item": "luminousOrb",
      "romId": 318,
      "weight": 45
     },
     {
      "item": "petrifyOrb",
      "romId": 319,
      "weight": 45
     },
     {
      "item": "decoyOrb",
      "romId": 325,
      "weight": 45
     },
     {
      "item": "slumberOrb",
      "romId": 326,
      "weight": 45
     },
     {
      "item": "totterOrb",
      "romId": 327,
      "weight": 45
     },
     {
      "item": "scannerOrb",
      "romId": 331,
      "weight": 45
     },
     {
      "item": "radarOrb",
      "romId": 332,
      "weight": 45
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 45
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 45
     },
     {
      "item": "hurlOrb",
      "romId": 347,
      "weight": 45
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 45
     },
     {
      "item": "foeFearOrb",
      "romId": 357,
      "weight": 45
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 45
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 45
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 18
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 18
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 18
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 18
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 18
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 18
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 18
     },
     {
      "item": "focusPunch",
      "romId": 188,
      "weight": 10
     },
     {
      "item": "waterPulse",
      "romId": 190,
      "weight": 10
     },
     {
      "item": "lightScreen",
      "romId": 203,
      "weight": 10
     },
     {
      "item": "brickBreak",
      "romId": 218,
      "weight": 10
     },
     {
      "item": "reflect",
      "romId": 220,
      "weight": 10
     },
     {
      "item": "rest",
      "romId": 231,
      "weight": 10
     },
     {
      "item": "energyBall",
      "romId": 240,
      "weight": 10
     },
     {
      "item": "embargo",
      "romId": 250,
      "weight": 10
     },
     {
      "item": "recycle",
      "romId": 254,
      "weight": 10
     },
     {
      "item": "dive",
      "romId": 261,
      "weight": 10
     },
     {
      "item": "thunderWave",
      "romId": 265,
      "weight": 10
     },
     {
      "item": "swordsDance",
      "romId": 267,
      "weight": 10
     },
     {
      "item": "vacuumCut",
      "romId": 260,
      "weight": 7
     },
     {
      "item": "flash",
      "romId": 262,
      "weight": 7
     },
     {
      "item": "shockWave",
      "romId": 221,
      "weight": 6
     },
     {
      "item": "dragonClaw",
      "romId": 189,
      "weight": 5
     },
     {
      "item": "calmMind",
      "romId": 191,
      "weight": 5
     },
     {
      "item": "roar",
      "romId": 192,
      "weight": 5
     },
     {
      "item": "hiddenPower",
      "romId": 197,
      "weight": 5
     },
     {
      "item": "protect",
      "romId": 204,
      "weight": 5
     },
     {
      "item": "gigaDrain",
      "romId": 206,
      "weight": 5
     },
     {
      "item": "safeguard",
      "romId": 207,
      "weight": 5
     },
     {
      "item": "aerialAce",
      "romId": 227,
      "weight": 5
     },
     {
      "item": "torment",
      "romId": 228,
      "weight": 5
     },
     {
      "item": "attract",
      "romId": 232,
      "weight": 5
     },
     {
      "item": "roost",
      "romId": 238,
      "weight": 5
     },
     {
      "item": "focusBlast",
      "romId": 239,
      "weight": 5
     },
     {
      "item": "falseSwipe",
      "romId": 241,
      "weight": 5
     },
     {
      "item": "brine",
      "romId": 242,
      "weight": 5
     },
     {
      "item": "explosion",
      "romId": 251,
      "weight": 5
     },
     {
      "item": "payback",
      "romId": 253,
      "weight": 5
     },
     {
      "item": "wideSlash",
      "romId": 257,
      "weight": 5
     },
     {
      "item": "stealthRock",
      "romId": 268,
      "weight": 5
     },
     {
      "item": "rockSlide",
      "romId": 272,
      "weight": 5
     },
     {
      "item": "naturalGift",
      "romId": 275,
      "weight": 5
     },
     {
      "item": "poisonJab",
      "romId": 276,
      "weight": 5
     },
     {
      "item": "hyperBeam",
      "romId": 202,
      "weight": 4
     },
     {
      "item": "steelWing",
      "romId": 234,
      "weight": 4
     },
     {
      "item": "solarBeam",
      "romId": 209,
      "weight": 2
     },
     {
      "item": "thunderbolt",
      "romId": 211,
      "weight": 2
     },
     {
      "item": "dig",
      "romId": 215,
      "weight": 2
     },
     {
      "item": "bulletSeed",
      "romId": 196,
      "weight": 1
     },
     {
      "item": "taunt",
      "romId": 199,
      "weight": 1
     },
     {
      "item": "ironTail",
      "romId": 210,
      "weight": 1
     },
     {
      "item": "shadowClaw",
      "romId": 252,
      "weight": 1
     },
     {
      "item": "gigaImpact",
      "romId": 255,
      "weight": 1
     }
    ]
   },
   {
    "sourceFloor": 9,
    "layout": "medium",
    "roomDensity": 10,
    "tileset": 5,
    "weather": 0,
    "floorConnectivity": 25,
    "enemyDensity": 5,
    "kecleonShopChance": 10,
    "monsterHouseChance": 0,
    "allowDeadEnds": true,
    "roomImperfections": false,
    "secondaryTerrain": true,
    "itemDensity": 5,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 15,
    "buriedItemDensity": 0,
    "waterDensity": 5,
    "darkness": 0,
    "maxCoin": 80,
    "music": 25,
    "enemies": [
     {
      "species": "weedle",
      "md": 13,
      "level": 12,
      "weight": 769
     },
     {
      "species": "kakuna",
      "md": 14,
      "level": 12,
      "weight": 1539
     },
     {
      "species": "beedrill",
      "md": 15,
      "level": 12,
      "weight": 1538
     },
     {
      "species": "gloom",
      "md": 44,
      "level": 12,
      "weight": 1539
     },
     {
      "species": "paras",
      "md": 46,
      "level": 12,
      "weight": 1538
     },
     {
      "species": "exeggutor",
      "md": 103,
      "level": 12,
      "weight": 1539
     },
     {
      "species": "combee",
      "md": 454,
      "level": 12,
      "weight": 1538
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 2981
     },
     {
      "item": "stick",
      "romId": 1,
      "weight": 993
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 618
     },
     {
      "item": "bigApple",
      "romId": 110,
      "weight": 464
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 368
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 184
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 184
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 184
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 184
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 166
     },
     {
      "item": "twistBand",
      "romId": 18,
      "weight": 155
     },
     {
      "item": "powerBand",
      "romId": 26,
      "weight": 155
     },
     {
      "item": "specialBand",
      "romId": 40,
      "weight": 155
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 155
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 155
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 155
     },
     {
      "item": "clearGummi",
      "romId": 124,
      "weight": 155
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 155
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 154
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 154
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 154
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 147
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 135
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 129
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 110
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 110
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 92
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 68
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 68
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 45
     },
     {
      "item": "transferOrb",
      "romId": 315,
      "weight": 45
     },
     {
      "item": "luminousOrb",
      "romId": 318,
      "weight": 45
     },
     {
      "item": "petrifyOrb",
      "romId": 319,
      "weight": 45
     },
     {
      "item": "decoyOrb",
      "romId": 325,
      "weight": 45
     },
     {
      "item": "slumberOrb",
      "romId": 326,
      "weight": 45
     },
     {
      "item": "totterOrb",
      "romId": 327,
      "weight": 45
     },
     {
      "item": "scannerOrb",
      "romId": 331,
      "weight": 45
     },
     {
      "item": "radarOrb",
      "romId": 332,
      "weight": 45
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 45
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 45
     },
     {
      "item": "hurlOrb",
      "romId": 347,
      "weight": 45
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 45
     },
     {
      "item": "foeFearOrb",
      "romId": 357,
      "weight": 45
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 45
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 45
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 18
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 18
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 18
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 18
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 18
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 18
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 18
     },
     {
      "item": "focusPunch",
      "romId": 188,
      "weight": 10
     },
     {
      "item": "waterPulse",
      "romId": 190,
      "weight": 10
     },
     {
      "item": "lightScreen",
      "romId": 203,
      "weight": 10
     },
     {
      "item": "brickBreak",
      "romId": 218,
      "weight": 10
     },
     {
      "item": "reflect",
      "romId": 220,
      "weight": 10
     },
     {
      "item": "rest",
      "romId": 231,
      "weight": 10
     },
     {
      "item": "energyBall",
      "romId": 240,
      "weight": 10
     },
     {
      "item": "embargo",
      "romId": 250,
      "weight": 10
     },
     {
      "item": "recycle",
      "romId": 254,
      "weight": 10
     },
     {
      "item": "dive",
      "romId": 261,
      "weight": 10
     },
     {
      "item": "thunderWave",
      "romId": 265,
      "weight": 10
     },
     {
      "item": "swordsDance",
      "romId": 267,
      "weight": 10
     },
     {
      "item": "vacuumCut",
      "romId": 260,
      "weight": 7
     },
     {
      "item": "flash",
      "romId": 262,
      "weight": 7
     },
     {
      "item": "shockWave",
      "romId": 221,
      "weight": 6
     },
     {
      "item": "dragonClaw",
      "romId": 189,
      "weight": 5
     },
     {
      "item": "calmMind",
      "romId": 191,
      "weight": 5
     },
     {
      "item": "roar",
      "romId": 192,
      "weight": 5
     },
     {
      "item": "hiddenPower",
      "romId": 197,
      "weight": 5
     },
     {
      "item": "protect",
      "romId": 204,
      "weight": 5
     },
     {
      "item": "gigaDrain",
      "romId": 206,
      "weight": 5
     },
     {
      "item": "safeguard",
      "romId": 207,
      "weight": 5
     },
     {
      "item": "aerialAce",
      "romId": 227,
      "weight": 5
     },
     {
      "item": "torment",
      "romId": 228,
      "weight": 5
     },
     {
      "item": "attract",
      "romId": 232,
      "weight": 5
     },
     {
      "item": "roost",
      "romId": 238,
      "weight": 5
     },
     {
      "item": "focusBlast",
      "romId": 239,
      "weight": 5
     },
     {
      "item": "falseSwipe",
      "romId": 241,
      "weight": 5
     },
     {
      "item": "brine",
      "romId": 242,
      "weight": 5
     },
     {
      "item": "explosion",
      "romId": 251,
      "weight": 5
     },
     {
      "item": "payback",
      "romId": 253,
      "weight": 5
     },
     {
      "item": "wideSlash",
      "romId": 257,
      "weight": 5
     },
     {
      "item": "stealthRock",
      "romId": 268,
      "weight": 5
     },
     {
      "item": "rockSlide",
      "romId": 272,
      "weight": 5
     },
     {
      "item": "naturalGift",
      "romId": 275,
      "weight": 5
     },
     {
      "item": "poisonJab",
      "romId": 276,
      "weight": 5
     },
     {
      "item": "hyperBeam",
      "romId": 202,
      "weight": 4
     },
     {
      "item": "steelWing",
      "romId": 234,
      "weight": 4
     },
     {
      "item": "solarBeam",
      "romId": 209,
      "weight": 2
     },
     {
      "item": "thunderbolt",
      "romId": 211,
      "weight": 2
     },
     {
      "item": "dig",
      "romId": 215,
      "weight": 2
     },
     {
      "item": "bulletSeed",
      "romId": 196,
      "weight": 1
     },
     {
      "item": "taunt",
      "romId": 199,
      "weight": 1
     },
     {
      "item": "ironTail",
      "romId": 210,
      "weight": 1
     },
     {
      "item": "shadowClaw",
      "romId": 252,
      "weight": 1
     },
     {
      "item": "gigaImpact",
      "romId": 255,
      "weight": 1
     }
    ]
   },
   {
    "sourceFloor": 12,
    "layout": "large",
    "roomDensity": 10,
    "tileset": 5,
    "weather": 0,
    "floorConnectivity": 25,
    "enemyDensity": 5,
    "kecleonShopChance": 10,
    "monsterHouseChance": 0,
    "allowDeadEnds": true,
    "roomImperfections": false,
    "secondaryTerrain": false,
    "itemDensity": 5,
    "trapDensity": 3,
    "fixedRoom": 0,
    "extraHallways": 15,
    "buriedItemDensity": 0,
    "waterDensity": 5,
    "darkness": 0,
    "maxCoin": 80,
    "music": 25,
    "enemies": [
     {
      "species": "kakuna",
      "md": 14,
      "level": 13,
      "weight": 1667
     },
     {
      "species": "beedrill",
      "md": 15,
      "level": 13,
      "weight": 1666
     },
     {
      "species": "gloom",
      "md": 44,
      "level": 13,
      "weight": 1667
     },
     {
      "species": "paras",
      "md": 46,
      "level": 13,
      "weight": 1667
     },
     {
      "species": "exeggutor",
      "md": 103,
      "level": 13,
      "weight": 1666
     },
     {
      "species": "combee",
      "md": 454,
      "level": 13,
      "weight": 1667
     }
    ],
    "traps": [
     {
      "trap": "wonderTile",
      "weight": 10000
     }
    ],
    "items": [
     {
      "item": "poke",
      "romId": 183,
      "weight": 2981
     },
     {
      "item": "stick",
      "romId": 1,
      "weight": 993
     },
     {
      "item": "apple",
      "romId": 109,
      "weight": 618
     },
     {
      "item": "bigApple",
      "romId": 110,
      "weight": 464
     },
     {
      "item": "oranBerry",
      "romId": 70,
      "weight": 368
     },
     {
      "item": "pechaBerry",
      "romId": 81,
      "weight": 184
     },
     {
      "item": "sleepSeed",
      "romId": 84,
      "weight": 184
     },
     {
      "item": "blastSeed",
      "romId": 87,
      "weight": 184
     },
     {
      "item": "stunSeed",
      "romId": 91,
      "weight": 184
     },
     {
      "item": "maxElixir",
      "romId": 99,
      "weight": 166
     },
     {
      "item": "twistBand",
      "romId": 18,
      "weight": 155
     },
     {
      "item": "powerBand",
      "romId": 26,
      "weight": 155
     },
     {
      "item": "specialBand",
      "romId": 40,
      "weight": 155
     },
     {
      "item": "redGummi",
      "romId": 120,
      "weight": 155
     },
     {
      "item": "blueGummi",
      "romId": 121,
      "weight": 155
     },
     {
      "item": "yellowGummi",
      "romId": 123,
      "weight": 155
     },
     {
      "item": "clearGummi",
      "romId": 124,
      "weight": 155
     },
     {
      "item": "pinkGummi",
      "romId": 126,
      "weight": 155
     },
     {
      "item": "whiteGummi",
      "romId": 119,
      "weight": 154
     },
     {
      "item": "grassGummi",
      "romId": 122,
      "weight": 154
     },
     {
      "item": "orangeGummi",
      "romId": 125,
      "weight": 154
     },
     {
      "item": "healSeed",
      "romId": 69,
      "weight": 147
     },
     {
      "item": "escapeOrb",
      "romId": 330,
      "weight": 135
     },
     {
      "item": "warpSeed",
      "romId": 86,
      "weight": 129
     },
     {
      "item": "reviverSeed",
      "romId": 73,
      "weight": 110
     },
     {
      "item": "xEyeSeed",
      "romId": 76,
      "weight": 110
     },
     {
      "item": "cheriBerry",
      "romId": 82,
      "weight": 92
     },
     {
      "item": "switcherOrb",
      "romId": 312,
      "weight": 68
     },
     {
      "item": "warpOrb",
      "romId": 314,
      "weight": 68
     },
     {
      "item": "blowbackOrb",
      "romId": 313,
      "weight": 45
     },
     {
      "item": "transferOrb",
      "romId": 315,
      "weight": 45
     },
     {
      "item": "luminousOrb",
      "romId": 318,
      "weight": 45
     },
     {
      "item": "petrifyOrb",
      "romId": 319,
      "weight": 45
     },
     {
      "item": "decoyOrb",
      "romId": 325,
      "weight": 45
     },
     {
      "item": "slumberOrb",
      "romId": 326,
      "weight": 45
     },
     {
      "item": "totterOrb",
      "romId": 327,
      "weight": 45
     },
     {
      "item": "scannerOrb",
      "romId": 331,
      "weight": 45
     },
     {
      "item": "radarOrb",
      "romId": 332,
      "weight": 45
     },
     {
      "item": "droughtOrb",
      "romId": 333,
      "weight": 45
     },
     {
      "item": "rollcallOrb",
      "romId": 335,
      "weight": 45
     },
     {
      "item": "hurlOrb",
      "romId": 347,
      "weight": 45
     },
     {
      "item": "spurnOrb",
      "romId": 354,
      "weight": 45
     },
     {
      "item": "foeFearOrb",
      "romId": 357,
      "weight": 45
     },
     {
      "item": "allHitOrb",
      "romId": 358,
      "weight": 45
     },
     {
      "item": "foeSealOrb",
      "romId": 359,
      "weight": 45
     },
     {
      "item": "dropeyeSeed",
      "romId": 104,
      "weight": 18
     },
     {
      "item": "reviserSeed",
      "romId": 105,
      "weight": 18
     },
     {
      "item": "slipSeed",
      "romId": 106,
      "weight": 18
     },
     {
      "item": "viaSeed",
      "romId": 107,
      "weight": 18
     },
     {
      "item": "mixElixir",
      "romId": 116,
      "weight": 18
     },
     {
      "item": "orenBerry",
      "romId": 117,
      "weight": 18
     },
     {
      "item": "doughSeed",
      "romId": 118,
      "weight": 18
     },
     {
      "item": "focusPunch",
      "romId": 188,
      "weight": 10
     },
     {
      "item": "waterPulse",
      "romId": 190,
      "weight": 10
     },
     {
      "item": "lightScreen",
      "romId": 203,
      "weight": 10
     },
     {
      "item": "brickBreak",
      "romId": 218,
      "weight": 10
     },
     {
      "item": "reflect",
      "romId": 220,
      "weight": 10
     },
     {
      "item": "rest",
      "romId": 231,
      "weight": 10
     },
     {
      "item": "energyBall",
      "romId": 240,
      "weight": 10
     },
     {
      "item": "embargo",
      "romId": 250,
      "weight": 10
     },
     {
      "item": "recycle",
      "romId": 254,
      "weight": 10
     },
     {
      "item": "dive",
      "romId": 261,
      "weight": 10
     },
     {
      "item": "thunderWave",
      "romId": 265,
      "weight": 10
     },
     {
      "item": "swordsDance",
      "romId": 267,
      "weight": 10
     },
     {
      "item": "vacuumCut",
      "romId": 260,
      "weight": 7
     },
     {
      "item": "flash",
      "romId": 262,
      "weight": 7
     },
     {
      "item": "shockWave",
      "romId": 221,
      "weight": 6
     },
     {
      "item": "dragonClaw",
      "romId": 189,
      "weight": 5
     },
     {
      "item": "calmMind",
      "romId": 191,
      "weight": 5
     },
     {
      "item": "roar",
      "romId": 192,
      "weight": 5
     },
     {
      "item": "hiddenPower",
      "romId": 197,
      "weight": 5
     },
     {
      "item": "protect",
      "romId": 204,
      "weight": 5
     },
     {
      "item": "gigaDrain",
      "romId": 206,
      "weight": 5
     },
     {
      "item": "safeguard",
      "romId": 207,
      "weight": 5
     },
     {
      "item": "aerialAce",
      "romId": 227,
      "weight": 5
     },
     {
      "item": "torment",
      "romId": 228,
      "weight": 5
     },
     {
      "item": "attract",
      "romId": 232,
      "weight": 5
     },
     {
      "item": "roost",
      "romId": 238,
      "weight": 5
     },
     {
      "item": "focusBlast",
      "romId": 239,
      "weight": 5
     },
     {
      "item": "falseSwipe",
      "romId": 241,
      "weight": 5
     },
     {
      "item": "brine",
      "romId": 242,
      "weight": 5
     },
     {
      "item": "explosion",
      "romId": 251,
      "weight": 5
     },
     {
      "item": "payback",
      "romId": 253,
      "weight": 5
     },
     {
      "item": "wideSlash",
      "romId": 257,
      "weight": 5
     },
     {
      "item": "stealthRock",
      "romId": 268,
      "weight": 5
     },
     {
      "item": "rockSlide",
      "romId": 272,
      "weight": 5
     },
     {
      "item": "naturalGift",
      "romId": 275,
      "weight": 5
     },
     {
      "item": "poisonJab",
      "romId": 276,
      "weight": 5
     },
     {
      "item": "hyperBeam",
      "romId": 202,
      "weight": 4
     },
     {
      "item": "steelWing",
      "romId": 234,
      "weight": 4
     },
     {
      "item": "solarBeam",
      "romId": 209,
      "weight": 2
     },
     {
      "item": "thunderbolt",
      "romId": 211,
      "weight": 2
     },
     {
      "item": "dig",
      "romId": 215,
      "weight": 2
     },
     {
      "item": "bulletSeed",
      "romId": 196,
      "weight": 1
     },
     {
      "item": "taunt",
      "romId": 199,
      "weight": 1
     },
     {
      "item": "ironTail",
      "romId": 210,
      "weight": 1
     },
     {
      "item": "shadowClaw",
      "romId": 252,
      "weight": 1
     },
     {
      "item": "gigaImpact",
      "romId": 255,
      "weight": 1
     }
    ]
   }
  ]
 }
];
