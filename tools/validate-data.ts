/** Valida los datos del juego y el catálogo de recursos. Uso: npm run validate:data */
import { existsSync } from 'node:fs';
import { validateGameData } from '../src/shared/data/validate';
import { CATALOG, validateCatalog } from '../src/client/assets/catalog';
import { moveFx } from '../src/client/assets/moveFx';
import { SPECIES } from '../src/shared/data/species';
import { DUNGEONS } from '../src/shared/data/dungeons';
import { MOVES } from '../src/shared/data/moves';
import { ITEMS } from '../src/shared/data/items';
import { STATUSES } from '../src/shared/data/statuses';

const problems = [
  ...validateGameData(),
  ...validateCatalog(CATALOG, Object.keys(SPECIES), Object.values(DUNGEONS).map((d) => d.tileset)),
];
// Archivos referenciados en el catálogo que no existen en public/.
const files = [
  ...Object.values(CATALOG.tilesets).flatMap((t) => [t.image, t.atlas]),
  ...Object.values(CATALOG.pokemon).flatMap((p) => [...Object.values(p.anims).map((a) => a!.url), ...(p.portrait ? [p.portrait] : [])]),
  ...Object.values(CATALOG.effects).map((e) => e.url),
  ...Object.values(CATALOG.status).map((e) => e.url),
  ...Object.values(CATALOG.items),
  ...Object.values(CATALOG.traps),
];
// Efectos y objetos de los datos que no tienen recurso (se dibujarían con placeholder).
for (const m of Object.values(MOVES)) {
  const fx = moveFx(m.id);
  if (!fx) problems.push(`Movimiento ${m.id}: sin entrada en el registro de efectos (src/client/assets/moveFx.ts)`);
  else for (const k of [...Object.values(fx.effects), fx.returnShot]) if (k && !CATALOG.effects[k]) problems.push(`Movimiento ${m.id}: efecto "${k}" sin recurso`);
}
for (const it of Object.keys(ITEMS)) if (!CATALOG.items[it]) problems.push(`Objeto ${it}: sin icono`);
// La parálisis no tiene icono en el original (tabla de iconos del juego, ver docs/MECANICAS.md).
// Sin icono: parálisis (el juego no tiene); amedrentado y velocidad reducida [INCIERTO] (no se sabe cuál usa).
const NO_ICON = new Set(['paralysis', 'cringe', 'slowed']);
for (const st of Object.keys(STATUSES)) if (!NO_ICON.has(st) && !CATALOG.status[st]) problems.push(`Estado ${st}: sin animación`);
for (const f of files) if (!existsSync(`public/${f}`)) problems.push(`Recurso ausente: public/${f}`);
const missingSprites = Object.keys(SPECIES).filter((s) => !CATALOG.pokemon[s]);
if (problems.length) {
  console.error(problems.map((p) => '✖ ' + p).join('\n'));
  process.exit(1);
}
console.log('✔ Datos del juego y catálogo válidos.');
if (missingSprites.length) console.log(`ℹ Especies con placeholder (sin sprites): ${missingSprites.join(', ')}`);
