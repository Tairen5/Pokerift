/**
 * Descarga sprites, animaciones y retratos de PMDCollab/SpriteCollab
 * (https://github.com/PMDCollab/SpriteCollab, licencia CC BY-NC 4.0) para las
 * especies del juego, y genera:
 *   - public/assets/pokemon/<especie>/*.png
 *   - src/client/assets/spritecollab.generated.ts  (entradas del catálogo)
 *   - public/assets/pokemon/CREDITS.md             (atribución por especie)
 *
 * Además de cada animación se lee su "Shadow-Anim.png": el píxel blanco de
 * cada frame marca dónde va la sombra (el punto de apoyo en el suelo) respecto
 * al centro del frame. El juego coloca el sprite para que ese punto coincida
 * con el suelo de la casilla. El tamaño de sombra sale de <ShadowSize>.
 *
 * Además de las acciones del juego (idle, walk, attack…), se descargan TODAS las
 * animaciones de la especie y se catalogan por su índice del juego
 * (<Index> de AnimData.xml = número de animación del WAN de EoS) como
 * "a<índice>": los movimientos piden la animación del atacante por ese número
 * (pokemon_anim_id de la tabla de animaciones; ver tools/import-pmd-scraper.mjs).
 *
 * Uso: node tools/fetch-spritecollab.mjs [--force]
 * Las especies y su número de Pokédex se declaran en DEX más abajo.
 */
import fs from 'node:fs';
import { PNG } from 'pngjs';
import path from 'node:path';

const RAW = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master';
const OUT_DIR = 'public/assets/pokemon';
const GEN_FILE = 'src/client/assets/spritecollab.generated.ts';
const FORCE = process.argv.includes('--force');

/** especie del juego → número de Pokédex nacional (4 dígitos en SpriteCollab). */
const DEX = {
  bulbasaur: 1, charmander: 4, squirtle: 7, pikachu: 25, meowth: 52,
  chikorita: 152, cyndaquil: 155, totodile: 158,
  treecko: 252, torchic: 255, mudkip: 258,
  pidgey: 16, sunkern: 191, wurmple: 265, exeggcute: 102,
  // Enemigos de la expedición (Cueva Bajamar, Risco Calado, Monte Árido, Cueva Cascada, Manzanar).
  shellder: 90, kabuto: 140, corsola: 222, shellos: 422, lileep: 345, anorith: 347, chingling: 433,
  machop: 66, geodude: 74, doduo: 84, spinarak: 167, starly: 396, nidorina: 30, nidorino: 33,
  psyduck: 54, poliwag: 60, grimer: 88, tangela: 114, wooper: 194, lotad: 270, surskit: 283, barboach: 339, whiscash: 340,
  caterpie: 10, butterfree: 12, oddish: 43, paras: 46, hoppip: 187, budew: 406, burmy: 412, weedle: 13,
  exeggutor: 103, gloom: 44, combee: 415, kakuna: 14, beedrill: 15,
};

/**
 * NPC de las zonas exteriores (decorado, no jugables): los que coloca la escena de
 * entrada de la Aldea Tesoro (SCRIPT/T01P01A y T01P02A, enter.sse; ver
 * tools/import-rom-town.mjs). Solo se descargan sus acciones básicas. Una forma de
 * SpriteCollab se indica como "número/forma" (el Kecleon morado es 0352/0001).
 */
const NPCS = {
  xatu: 178, kangaskhan: 115, kecleon: 352, kecleonPurple: '0352/0001', duskull: 355, electivire: 466, chansey: 113,
};

/** Animación del juego → animación de SpriteCollab (en orden de preferencia). */
const ANIMS = {
  idle: ['Idle', 'Walk'],
  walk: ['Walk'],
  attack: ['Attack', 'Strike', 'Walk'],
  shoot: ['Shoot', 'Charge', 'Attack'],
  hurt: ['Hurt', 'Idle'],
  sleep: ['Sleep', 'EventSleep', 'Idle'],
};
const LOOPING = new Set(['idle', 'walk', 'sleep']);
const PORTRAITS = ['Normal', 'Pain', 'Happy'];

const pad = (n) => String(n).padStart(4, '0');

async function get(url, binary = false) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return binary ? Buffer.from(await res.arrayBuffer()) : res.text();
}

function parseAnimData(xml) {
  const anims = {};
  for (const m of xml.matchAll(/<Anim>([\s\S]*?)<\/Anim>/g)) {
    const body = m[1];
    const tag = (t) => body.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1];
    const name = tag('Name');
    anims[name] = {
      name,
      copyOf: tag('CopyOf'),
      frameWidth: Number(tag('FrameWidth')),
      frameHeight: Number(tag('FrameHeight')),
      hitFrame: tag('HitFrame') !== undefined ? Number(tag('HitFrame')) : undefined,
      index: tag('Index') !== undefined ? Number(tag('Index')) : undefined,
      durations: [...body.matchAll(/<Duration>(\d+)<\/Duration>/g)].map((d) => Number(d[1])),
    };
  }
  // Resuelve CopyOf (la animación reutiliza la imagen de otra).
  for (const a of Object.values(anims)) {
    let src = a;
    for (let i = 0; src.copyOf && i < 5; i++) src = anims[src.copyOf];
    a.file = src.name;
    if (a.copyOf) Object.assign(a, { frameWidth: src.frameWidth, frameHeight: src.frameHeight, durations: src.durations, hitFrame: src.hitFrame });
  }
  return anims;
}

/** Tamaño de sombra de la especie: 0 pequeña, 1 mediana, 2 grande. */
function parseShadowSize(xml) {
  return Number(xml.match(/<ShadowSize>(\d+)<\/ShadowSize>/)?.[1] ?? 1);
}

/**
 * Desplazamiento (x, y) del centro de la sombra respecto al centro de cada
 * frame, por dirección (fila) y frame (columna). null si el frame no lo marca.
 */
function shadowOffsets(buf, fw, fh) {
  const p = PNG.sync.read(buf);
  const cols = Math.round(p.width / fw), rows = Math.round(p.height / fh);
  const out = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      let found = null;
      for (let y = 0; y < fh && !found; y++)
        for (let x = 0; x < fw; x++) {
          const i = ((r * fh + y) * p.width + c * fw + x) * 4;
          if (p.data[i + 3] && p.data[i] === 255 && p.data[i + 1] === 255 && p.data[i + 2] === 255) {
            found = [x - fw / 2, y - fh / 2];
            break;
          }
        }
      row.push(found);
    }
    out.push(row);
  }
  return out;
}

function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function creditName(id, names) {
  return names.get(id) ?? id;
}

async function main() {
  console.log('Descargando tracker.json y credit_names.txt…');
  const tracker = JSON.parse(await get(`${RAW}/tracker.json`));
  const names = new Map(
    (await get(`${RAW}/credit_names.txt`))
      .split('\n')
      .slice(1)
      .map((l) => l.split('\t'))
      .filter((p) => p.length >= 2)
      .map(([name, id]) => [id.trim(), name.trim()]),
  );

  const catalog = {};
  const credits = [];
  const missing = [];
  for (const [species, dex] of [...Object.entries(DEX), ...Object.entries(NPCS)]) {
    const npc = species in NPCS;
    const id = typeof dex === 'string' ? dex : pad(dex);
    const [base, form] = id.split('/');
    const info = form ? { ...tracker[base], ...tracker[base]?.subgroups?.[form], name: `${tracker[base]?.name} (${tracker[base]?.subgroups?.[form]?.name})` } : tracker[id];
    const dir = path.join(OUT_DIR, species);
    fs.mkdirSync(dir, { recursive: true });
    let animData, shadowSize;
    try {
      const xml = await get(`${RAW}/sprite/${id}/AnimData.xml`);
      animData = parseAnimData(xml);
      shadowSize = parseShadowSize(xml);
    } catch {
      missing.push(`${species}: sin sprites en SpriteCollab (se usará placeholder)`);
      continue;
    }
    const entry = { anims: {}, shadowSize, source: `SpriteCollab ${id}`, ...(npc ? { npc: true } : {}) };
    const jobs = Object.entries(ANIMS).map(([action, candidates]) => [action, candidates.map((c) => animData[c]).find(Boolean)]);
    if (!npc) for (const a of Object.values(animData)) if (a.index !== undefined) jobs.push([`a${a.index}`, a]);
    for (const [action, a] of jobs) {
      if (!a) continue;
      const file = `${a.file}-Anim.png`;
      const local = path.join(dir, file);
      if (FORCE || !fs.existsSync(local)) fs.writeFileSync(local, await get(`${RAW}/sprite/${id}/${file}`, true));
      const { width, height } = pngSize(fs.readFileSync(local));
      const rows = Math.round(height / a.frameHeight);
      // Punto de apoyo por dirección y frame (Shadow-Anim). Si es constante se guarda uno solo.
      let shadow = [0, 4];
      let shadowPerFrame;
      try {
        const offs = shadowOffsets(await get(`${RAW}/sprite/${id}/${a.file}-Shadow.png`, true), a.frameWidth, a.frameHeight);
        const flat = offs.flat().filter(Boolean);
        if (flat.length) {
          const counts = new Map();
          for (const o of flat) counts.set(o.join(','), (counts.get(o.join(',')) ?? 0) + 1);
          shadow = [...counts.entries()].sort((x, y) => y[1] - x[1])[0][0].split(',').map(Number);
          if (counts.size > 1) shadowPerFrame = offs.map((row) => row.map((o) => o ?? shadow));
        }
      } catch {
        /* sin hoja de sombras: se usa el valor por defecto */
      }
      entry.anims[action] = {
        url: `assets/pokemon/${species}/${file}`,
        frameWidth: a.frameWidth,
        frameHeight: a.frameHeight,
        frames: Math.round(width / a.frameWidth),
        frameRate: 60 / (a.durations.reduce((x, y) => x + y, 0) / a.durations.length || 8),
        durations: a.durations,
        directions: rows >= 8 ? 8 : 1,
        loop: LOOPING.has(action),
        ...(action.startsWith('a') && /^a\d+$/.test(action) ? { name: a.name } : {}),
        ...(a.hitFrame !== undefined ? { hitFrame: a.hitFrame } : {}),
        shadow,
        ...(shadowPerFrame ? { shadowPerFrame } : {}),
      };
    }
    for (const p of PORTRAITS) {
      const local = path.join(dir, `portrait-${p}.png`);
      try {
        if (FORCE || !fs.existsSync(local)) fs.writeFileSync(local, await get(`${RAW}/portrait/${id}/${p}.png`, true));
        entry.portraits ??= {};
        entry.portraits[p.toLowerCase()] = `assets/pokemon/${species}/portrait-${p}.png`;
      } catch {
        /* retrato opcional */
      }
    }
    entry.portrait = entry.portraits?.normal;
    catalog[species] = entry;
    const sc = info?.sprite_credit ?? {};
    const pc = info?.portrait_credit ?? {};
    credits.push({
      species,
      dex: id,
      name: info?.name ?? species,
      sprite: [sc.primary, ...(sc.secondary ?? [])].filter(Boolean).map((c) => creditName(c, names)),
      portrait: [pc.primary, ...(pc.secondary ?? [])].filter(Boolean).map((c) => creditName(c, names)),
    });
    const extra = Object.keys(entry.anims).filter((k) => /^a\d+$/.test(k));
    console.log(`✔ ${species} (${id}): ${Object.keys(entry.anims).filter((k) => !extra.includes(k)).join(', ')} + ${extra.length} animaciones por índice${entry.portrait ? ' + retratos' : ''}`);
  }

  fs.writeFileSync(
    GEN_FILE,
    `// ARCHIVO GENERADO por tools/fetch-spritecollab.mjs — no editar a mano.\n` +
      `// Fuente: https://github.com/PMDCollab/SpriteCollab (CC BY-NC 4.0). Créditos en public/assets/pokemon/CREDITS.md\n` +
      `import type { PokemonAssets } from './catalog';\n\n` +
      `export const SPRITECOLLAB: Record<string, PokemonAssets> = ${JSON.stringify(catalog, null, 2)};\n`,
  );
  const md = [
    '# Créditos de sprites y retratos',
    '',
    'Fuente: [PMDCollab/SpriteCollab](https://github.com/PMDCollab/SpriteCollab), licencia [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).',
    'Uso no comercial con atribución. Los nombres provienen de `tracker.json` y `credit_names.txt` del repositorio.',
    '',
    '| Pokémon | Nº | Sprites | Retratos |',
    '|---|---|---|---|',
    ...credits.map((c) => `| ${c.name} | ${c.dex} | ${c.sprite.join(', ') || '—'} | ${c.portrait.join(', ') || '—'} |`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'CREDITS.md'), md);
  for (const m of missing) console.warn('⚠ ' + m);
  console.log(`\nGenerado ${GEN_FILE} y ${OUT_DIR}/CREDITS.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
