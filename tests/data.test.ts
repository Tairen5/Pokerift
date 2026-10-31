import { describe, expect, it } from 'vitest';
import { validateGameData } from '../src/shared/data/validate';
import { CATALOG, validateCatalog } from '../src/client/assets/catalog';
import { SPECIES } from '../src/shared/data/species';
import { DUNGEONS } from '../src/shared/data/dungeons';
import { MOVES } from '../src/shared/data/moves';

describe('sprites de PMDCollab: sombras y animaciones', () => {
  const entries = Object.entries(CATALOG.pokemon);

  it('todas las especies del juego tienen sprites con tamaño de sombra válido', () => {
    for (const id of Object.keys(SPECIES)) {
      const p = CATALOG.pokemon[id];
      expect(p, id).toBeDefined();
      expect([0, 1, 2]).toContain(p.shadowSize);
    }
  });

  it('cada animación tiene punto de apoyo y duraciones coherentes con sus frames', () => {
    for (const [id, p] of entries) {
      for (const [action, def] of Object.entries(p.anims)) {
        const where = `${id}.${action}`;
        expect(def!.shadow, where).toHaveLength(2);
        expect(def!.durations, where).toHaveLength(def!.frames);
        expect(def!.durations!.every((d) => d > 0), where).toBe(true);
        if (def!.shadowPerFrame) {
          expect(def!.shadowPerFrame.length, where).toBe(def!.directions);
          for (const row of def!.shadowPerFrame) expect(row.length, where).toBe(def!.frames);
        }
      }
    }
  });

  it('idle, andar y dormir son bucles; ataque, disparo y daño no', () => {
    for (const [id, p] of entries) {
      for (const a of ['idle', 'walk', 'sleep'] as const) expect(p.anims[a]?.loop, `${id}.${a}`).toBe(true);
      for (const a of ['attack', 'shoot', 'hurt'] as const) expect(p.anims[a]?.loop, `${id}.${a}`).toBe(false);
    }
  });
});

describe('validación de datos', () => {
  it('los datos del juego no tienen referencias rotas ni valores inválidos', () => {
    expect(validateGameData()).toEqual([]);
  });

  it('el catálogo de recursos es coherente', () => {
    expect(validateCatalog(CATALOG, Object.keys(SPECIES), Object.values(DUNGEONS).map((d) => d.tileset))).toEqual([]);
  });

  it('detecta un movimiento inexistente en un learnset', () => {
    SPECIES.pikachu.learnset.push({ level: 9, move: 'noExiste' });
    try {
      expect(validateGameData().some((e) => e.includes('noExiste'))).toBe(true);
    } finally {
      SPECIES.pikachu.learnset.pop();
    }
  });

  it('detecta estadísticas inválidas', () => {
    const before = SPECIES.wurmple.baseStats.hp;
    SPECIES.wurmple.baseStats.hp = 0; // (una defensa de 0 es válida: Barboach en monster.md)
    try {
      expect(validateGameData().some((e) => e.includes('wurmple') && e.includes('hp'))).toBe(true);
    } finally {
      SPECIES.wurmple.baseStats.hp = before;
    }
    expect(MOVES.regularAttack.type).toBeNull();
  });
});
