# Pokerift — guía para Claude

Roguelike cooperativo online inspirado en **Pokémon Mundo Misterioso** (referencia principal: *Exploradores del Cielo*; secundaria: *Equipo de Rescate Azul*). TypeScript + Phaser 3 + Vite en el cliente, Node + `ws` en el servidor, Vitest para las pruebas. Interfaz y documentación **en español**. Proyecto de fans, uso personal y no comercial.

Documentación de referencia: `README.md` (ejecución, controles, estructura), `docs/MECANICAS.md` (reglas implementadas, fuentes, valores [VERIFICADO]/[INCIERTO], política del cooperativo), `ASSETS.md` (procedencia y licencia de cada recurso).

## Comandos

```bash
npm run dev            # cliente (http://localhost:5173) + servidor (ws://localhost:8787)
npm run typecheck      # TypeScript estricto
npm test               # Vitest (motor, generador, combate, servidor, integración WebSocket, simulación)
npm run validate:data  # datos del juego y catálogo de recursos
npm run build          # obligatorio antes de las pruebas en navegador
npm run smoke          # flujo completo en Chrome real: intro → menú → casa → zonas exteriores → mazmorra; cooperativo con 2 navegadores
npm run mobile-check   # móvil en horizontal (táctil, 2 tamaños): todo el flujo a toques; capturas en smoke-output/mobile/
npm run sprite-check   # sprites en mazmorra: idle en bucle, sombra/apoyo, paso, sombra amarilla/negra
npm run light-check    # iluminación de la mazmorra (sala, paso, pasillo); capturas luz-*.png
npm run gen-preview    # pisos de cada distribución del generador en smoke-output/gen/*.png (-- expedition 12: los de la mazmorra)
npm run fx-check       # efectos de movimientos (combate y visor fx-viewer.html), iconos de estado, objetos y trampas; capturas fx-*.png
npm run ui-check       # kit de interfaz (ui-gallery.html): esquinas exactas y sin desenfoque a ×1, ×2, ×3; capturas en smoke-output/ui/
npm run intro-capture  # capturas de la intro cada 0,9 s en smoke-output/intro/ (INTERVAL=ms para cambiarlo)
```

Las pruebas de navegador usan `playwright-core` con el Chrome/Edge del sistema y dejan capturas en `smoke-output/`. **Revisa las capturas** cuando cambies algo visual: los tests pueden pasar con la presentación mal.

## Arquitectura

- `src/shared/` — lógica pura, sin Phaser ni DOM; la usan cliente y servidor.
  - `engine/`: estado serializable (`state.ts`), acciones y coste de turno (`actions.ts`), resolución de turnos (`turn.ts`: `resolveTurn` turno compartido, `resolveExploreAction` acción individual), modo exploración/táctico (`mode.ts`), combate (fórmula de EoS en `combat.ts`), IA, objetos, trampas, estados, pisos.
  - `data/`: especies, movimientos, tipos, objetos, trampas, estados, mazmorras y reglas (`rules.ts`: todo lo que difiere entre EoS y RT va aquí). Datos, no condicionales.
  - `dungeon/`: mapa lógico, visibilidad y `generator.ts`, la reimplementación del generador de los juegos (pasos y constantes de pret/pmd-red y pmdsky-debug; ver docs/MECANICAS.md). Cada piso usa `FloorProperties` (los campos de `floor_properties`) y su propia semilla (`floorSeed`).
  - `town/`: zonas exteriores de Exploradores del Cielo (casa, Risco Sharpedo, Aldea Tesoro, Encrucijada, playa, gremio): `zone.ts` declara llegadas, salidas y edificios; `zones/*.generated.ts` (mapa, agua animada, colisión) sale de `tools/build-town.mjs`; `route.ts`, rutas a pie.
  - `net/protocol.ts`: mensajes cliente↔servidor (versión del protocolo: súbela si cambian).
- `src/server/` — `room.ts`: sala autoritativa con fases `lobby → town → expedition → town`; valida todo (no se confía en el cliente).
- `src/client/` — `main.ts` es el controlador de la app (un único juego de Phaser persistente). Escenas: Boot, Intro, Title, MainMenu, Town, Dungeon. `render/pokemonSprite.ts` es el sprite común (sombras, anclaje por frame, animaciones). `ui/kit.ts` es el kit de componentes de interfaz: caja `win`, `titled`, `portraitFrame`, `dialog`, `menuList`, `choiceBox` y `titleText` (fuente de mazmorra). Todo menú nuevo se construye con él. `ui/hud.ts` (HUD de mazmorra), `ui/townHud.ts`, `ui/menu.ts` (paneles DOM). En Phaser, `pmdWindow` (`scenes/stage.ts`) usa las mismas cajas. `net/session.ts` (local) y `net/online.ts` comparten interfaz.
- Determinismo: toda la aleatoriedad sale del RNG con semilla guardado en el estado. Las animaciones nunca deciden resultados; la escena se resincroniza con el estado al terminar de animar.

## Recursos (Assets/ → public/)

`Assets/` contiene lo que aporta el usuario; nunca se edita a mano lo generado en `public/assets` ni los `*.generated.*`: se regenera con las herramientas.

| Herramienta | Qué genera |
|---|---|
| `tools/build-tileset.mjs` | atlas de autotiles (47 máscaras) de un tileset de mazmorra |
| `tools/fetch-spritecollab.mjs` (`npm run fetch:sprites`) | sprites/retratos de PMDCollab SpriteCollab, duraciones, sombras (`Shadow-Anim`), créditos |
| `tools/build-intro-assets.mjs` | capas/atlas de la intro, logo, fondo del título, Vulpix y Pelipper (decorado) |
| `tools/build-font.mjs` | fuente de mazmorra/títulos (BMFont) y su mapa de glifos para el DOM |
| `tools/build-ui.mjs` | fuentes web de píxeles (PMD Message/Title), cajas y marcos de retrato originales de `Assets/HUD/Text box.png` (nine-slice), cursor, glifos y barras del HUD |
| `tools/build-objects.mjs` | casillas de mazmorra recortadas de `Assets/items/items DS.png`: escaleras y las trampas reconocibles |
| `tools/build-effects.mjs` | efectos de `move_VFX` (carpeta = archivo de `effect.bin`, no ID de animación de efecto), iconos de estado (`status effects.png`) e iconos de objetos (DS; GBA si falta) + `effects.generated.ts` |
| `tools/import-rom-ui.mjs` (`npm run import:ui -- <rom>`) | cajas de texto y marco de retrato (`FONT/frame_b0`), fuente de diálogo (`FONT/kanji.dat`), las 7 ilustraciones del menú principal (`BACK/s09p04a`–`s09p10a.bgp`) y los iconos del minimapa (`dungeon.bin` 1035) de la ROM → `public/assets/ui/rom`, `public/assets/fonts/rom`, `ui-rom.generated.ts` (clase `rom-ui` en `<html>`) |
| `tools/import-rom-town.mjs` (`npm run import:town -- <rom>`) | zonas exteriores de la ROM (`MAP_BG`: dos capas, BPA/BPL animados, colisión original) → `public/assets/town/rom` y `zones/*.generated.ts` (sustituye a build-town) |
| `tools/import-rom-numbers.mjs` (`npm run import:numbers -- <rom>`) | números de daño/curación/fallo de la ROM propia (`dungeon.bin` 1007 + paleta 1024) → `public/assets/ui/dmg-numbers.png` y `damage-numbers.generated.ts` |
| `tools/import-rom-species.mjs` (`npm run import:species -- <rom>`) | especies del juego desde `monster.md`, `m_level.bin` y `waza_p.bin` → `src/shared/data/species.rom.generated.ts` |
| `tools/import-rom-dungeons.mjs` (`npm run import:dungeons -- <rom>`) | expedición de 25 pisos: `mappa_s.bin` (propiedades, Pokémon, objetos y trampas por piso) y tilesets de `dungeon.bin` (DMA/DPC/DPCI/DPL → atlas de 47 máscaras) → `src/shared/data/expedition.rom.generated.ts` y `public/assets/tilesets/eos-<t>.*` |
| `tools/import-pmd-scraper.mjs` | efectos originales por movimiento y datos reales de cada movimiento desde la salida de pmd-scraper (tablas de una ROM propia) → `move-fx.rom.generated.ts` y `src/shared/data/moves.rom.generated.ts` |
| `tools/fx-gallery.mjs` | galería de todas las carpetas de `move_VFX` para buscar candidatos |
| `tools/build-town.mjs` | mapas de las zonas exteriores (`Assets/Lobby/DS`), agua animada y colisión (`--preview carpeta` para ver la máscara) |

Al añadir recursos: comprobar licencia, añadir fila en `ASSETS.md` y créditos en el menú si la hoja los pide. No descargar ROMs ni recursos de procedencia dudosa.

## Decisiones y preferencias del usuario (respetarlas)

- **Fidelidad a los juegos de DS** por encima de inventar. Investigar antes de implementar; si un dato no se puede verificar, marcarlo **[INCIERTO]** en código y en `docs/MECANICAS.md` y decirlo. No afirmar que algo es "como el original" sin fuente.
- **Contenido limitado** (no ampliar sin que lo pida): 11 iniciales jugables (Pikachu, Charmander, Squirtle, Bulbasaur, Cyndaquil, Totodile, Chikorita, Treecko, Torchic, Mudkip, Meowth). Una sola mazmorra, la **expedición de 25 pisos** (id `expedition`): las 5 primeras mazmorras de EoS (Cueva Bajamar, Risco Calado, Monte Árido, Cueva Cascada, Manzanar), 5 pisos de cada una, con su tileset, Pokémon (36 especies), objetos y trampas reales de la ROM (`npm run import:dungeons`). Bosque Diminuto (RT) queda solo como reserva sin ROM. Vulpix y Pelipper son solo decorado de la intro.
- **Cooperativo**: exploración libre fuera de combate; turnos compartidos cuando hay enemigos implicados (global para todo el grupo). No cambiar las reglas de turnos para efectos visuales.
- **Sprites en mazmorra**: sombras originales del juego (dungeon.bin 995/997, importadas con `npm run import:fx`): negra casi opaca para enemigos/IA y amarilla para Pokémon de jugadores, en 3 tallas según el ShadowSize de PMDCollab; sin ROM, se generan de la plantilla de PMDCollab. Anclaje por frame al punto de apoyo de `Shadow-Anim`; animaciones a **ritmo oficial** (1 tick = 1/60 s, como PMDO); paso de 240 ms (diagonal ×√2, velocidad constante). El ritmo del paso es [INCIERTO]. Números de daño/curación/fallo: glifos originales de `dungeon.bin` 1007 con «MISS» (paleta 1024), importados con `npm run import:numbers -- <rom>`; dorado (daño) y verde (curación) [INCIERTO el verde]; sin ROM, fuente de mensajes teñida.
- **Interfaz**: estilo DS con los gráficos originales, nunca cajas genéricas redibujadas. Cajas, marco de retrato y fuente de diálogo de la ROM (`FONT/frame_b0`, `FONT/kanji.dat`, `npm run import:ui`); sin ROM, los de `Text box.png` y la fuente de Equipo de Rescate. Nine-slice con bordes repetidos (no estirados). Fuente de diálogo original, y tipografía y barra de HP originales del HUD. Fuente de mazmorra para la información de la franja inferior en las expediciones (nombre y planta "P1"). HUD de la mazmorra con los glifos de la ROM (`dungeon.bin` 1020: «P», «Nv.», «PS» en español). Escala entera de píxeles (`--s`: 1, 2 o 3 según la ventana). Distribución horizontal inspirada en *Rescue Team DX*. En la mazmorra, el escenario es lo principal: el mínimo de cajas (ubicación y equipo sin caja, con contorno y línea blanca fina; los movimientos y los mensajes, en caja de diálogo) y la cámara cerca, como en la DS.
- **Mazmorra (presentación)**: al entrar o cambiar de piso, pantalla negra con el nombre y la planta [INCIERTO duración]. Minimapa a tamaño DS (4 px por casilla) con los iconos originales y la lógica de `DrawMinimapTile` (overlay29): líder parpadeando (8), compañero (10), enemigo (2), objeto (3), trampa (4), escalera (6), suelo con bordes por vecinos (16+); M cambia el estilo. Menú de la escalera: Avanzar / Info / Cancelar (text_e.str).
- **Menú principal**: como el «Top Menu» de EoS. Fondo: una de las 7 ilustraciones originales al azar (las de la overlay 0). Lista de opciones arriba a la izquierda y descripción de dos líneas abajo. Ajustes y créditos en «Otros». Mantener L oculta la interfaz. [INCIERTO] posición exacta de las ventanas.
- **Intro**: recrea el opening de Exploradores del Cielo con `Assets/Intro` (Treasure Town + Shaymin de derecha a izquierda → Lapras + Pelipper → tesoros → Pikachu y Vulpix → logo). Falta el Engranaje del Tiempo (sin recursos).
- **Forma de trabajar**: trabajar sobre el código existente (no reconstruir), cambios pequeños y verificados, ejecutar `typecheck`, `test`, `build` y `smoke` (y `sprite-check`/`light-check`/`intro-capture` si toca sprites, la iluminación o la intro) antes de dar algo por terminado, y revisar capturas. Responder en español, resumiendo qué se cambió, qué archivos y qué queda pendiente.
- No se pueden ver vídeos de YouTube: si el usuario pasa uno, pedir capturas o marcas de tiempo, o buscar descripciones escritas.

## Pendiente conocido

Datos de los movimientos: reales de la ROM (`waza_p.bin` vía pmd-scraper, `npm run import:fx`, `moves.rom.generated.ts`), salvo los efectos secundarios y sus probabilidades. Especies reales de la ROM (`npm run import:species`, `species.rom.generated.ts`): tipos, habilidades, estadísticas a nivel 1 (`monster.md`), crecimiento y exp. de los 100 niveles (`m_level.bin`) y movimientos por nivel (`waza_p.bin`, solo los que existen en Pokerift). Efectos secundarios: probabilidades y duraciones leídas de `overlay10` (pmdsky-debug) y efectos según la descripción de cada movimiento en el texto del juego (`MESSAGE/text_e.str`, cadena 10145 + move_id). [INCIERTO] fórmula de la exp. ganada, nivel inicial (1; quizá 5 en EoS), daño de la Semilla Explosiva, daño y ritmo de veneno/quemadura, icono de amedrentado. Velocidad: solo la media velocidad (Disparo Demora, estado `slowed`: actúa uno de cada dos turnos); las subidas sin implementar. Equipo inicial a nivel 5 con movimiento de huevo (como EoS). Efectos de movimientos: el registro `src/client/assets/moveFx.ts` es el único sitio que decide el efecto de cada ataque. Importados de la ROM del usuario (USA) con pmd-scraper + `npm run import:fx` (`move-fx.rom.generated.ts`, efectos en `public/assets/effects/eos`); la asignación a ojo (`FALLBACK`) solo se usa sin ROM. Se importan TODOS los movimientos del juego (536 con animación, `moves.json` con su información); al arrancar solo se cargan los de la partida (`bootEffects`) y el resto bajo demanda (`render/fxAnims.ts`, visor). Efectos de pantalla (tipo Screen) a pantalla completa con su opacidad [INCIERTO la mezcla]. Animación del atacante: la de la tabla del juego (`pokemon_anim_id`) o la excepción de su especie (`special_animations`), como `a<índice>` (= `<Index>` de AnimData.xml de PMDCollab; `fetch-spritecollab.mjs` descarga todas las animaciones de cada especie); al arrancar solo se cargan las que usan nuestros movimientos; no inventar correspondencias ni confundir move_id, ID de animación de efecto y archivo de effect.bin (ver docs/MECANICAS.md). Objetos y casillas del suelo de la ROM (`npm run import:fx`): iconos de los 1311 objetos (`public/assets/items/eos/items.json` + atlas) y las 35 casillas (`public/assets/dungeon/eos/tiles.json`: dibujo n = trampa n de `enum trap_id`; 27/28 = escaleras de bajada/subida); las 8 trampas del juego tienen ya su casilla original. [INCIERTO] cuándo usa el juego la segunda paleta de las casillas. Zonas exteriores: mapas originales de la ROM (`npm run import:town`); objetos y NPC de la escena de entrada del juego (`SCRIPT/<mapa>/enter.sse`: capa 0 objetos de `GROUND/*.wan`, capa 99 NPC con sprites de PMDCollab marcados `npc`); faltan las capas que dependen de la historia y la interacción con los NPC; la Aldea Tesoro son dos mapas en el juego y aquí uno. Generador de pisos: tiendas Kecleon, laberintos, agua/lava, objetos enterrados y la mecánica de la Casa de Monstruos sin hacer. Interiores del gremio y del dojo sin hacer. Opening: está en scripts (`DEMO_01`–`06` de `unionall.ssb`), sin decodificar. Sin audio. Números verdes/etiquetas amarillas de `Assets/HUD` sin uso (no se sabe cuándo los usa el original).
