# Pokerift

Roguelike cooperativo online inspirado en **Pokémon Mundo Misterioso: Exploradores del Cielo** y **Equipo de Rescate Azul** (Nintendo DS). Se juega en el navegador, en una cuadrícula por turnos, con mazmorras procedurales y expediciones que empiezan siempre desde cero.

> Proyecto de fans sin ánimo de lucro. Pokémon y Mundo Misterioso son marcas de Nintendo, Creatures, GAME FREAK y Spike Chunsoft. Consulta [ASSETS.md](ASSETS.md) para la procedencia y licencia de los recursos gráficos.

## Requisitos

- Node.js 20 o superior (probado con Node 25).
- Un navegador moderno (Chrome, Edge, Firefox).

## Instalación

```bash
npm install
```

## Ejecución en desarrollo

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia **cliente y servidor** a la vez (recomendado) |
| `npm run dev:client` | Solo el cliente (Vite) en http://localhost:5173 |
| `npm run dev:server` | Solo el servidor multijugador en `ws://localhost:8787` (se recarga al guardar) |

Abre http://localhost:5173. El modo **solitario** funciona sin servidor: la lógica corre en el navegador. El modo **cooperativo** necesita el servidor.

## Flujo del juego

**Intro → título → menú principal → casa (Risco Sharpedo) → Aldea Tesoro → Encrucijada → mazmorra → Encrucijada.**

- **Intro**: recrea el opening de Exploradores del Cielo con los recursos de `Assets/Intro`, en el orden del original:
  1. Treasure Town desde el cielo, con Shaymin cruzando de derecha a izquierda.
  2. Lapras en el mar con un grupo de Pelipper volando encima.
  3. Cofre y objetos sobre las ruinas.
  4. Pikachu y Vulpix por el camino de tierra.
  5. Destello y logo en la pantalla de título.

  El Engranaje del Tiempo del original no aparece porque no hay recursos para él. Se salta con cualquier tecla o clic. Para revisarla fotograma a fotograma: `npm run build && npm run intro-capture` (capturas en `smoke-output/intro/`).
- **Menú principal** (como el de Exploradores del Cielo, sobre una de sus 7 ilustraciones si se ha importado la ROM): Solitario, Crear sala, Unirse a sala, Diario y Otros (Velocidad de animación y Créditos). Mantén **L** para ver la ilustración sin ventanas.
- **Zonas exteriores** (Exploradores del Cielo): se empieza dentro de casa, en el Risco Sharpedo, y se recorren libremente (sin turnos) lo alto del acantilado, la Aldea Tesoro, la Encrucijada, la playa y lo alto de la escalera del gremio. Las salidas se pasan pisándolas, sin marcas en el mapa. Por la salida este de la Encrucijada se va a la expedición de 25 pisos: Cueva Bajamar, Risco Calado, Monte Árido, Cueva Cascada y Manzanar, 5 pisos de cada una, con sus tilesets, Pokémon y objetos del juego (`npm run import:dungeons -- <rom>`; sin ROM, Bosque Diminuto). La puerta del gremio y la Cueva de la Playa avisan con "próximamente". Al terminar una expedición se vuelve a la Encrucijada. Detalles en `docs/MECANICAS.md`.

## Cómo crear una sesión cooperativa

1. Ejecuta `npm run dev` (o el servidor de producción, más abajo).
2. En el primer navegador: menú principal → **Crear sala**, escribe tu nombre y elige un Pokémon. Aparece un código de 5 letras.
3. En el segundo navegador (otra ventana, otro equipo de la red local, etc.): **Unirse a sala**, escribe el código y elige un Pokémon distinto.
4. El anfitrión (★) pulsa **¡En marcha!** y el grupo aparece dentro de casa. Fuera de la mazmorra cada uno va por su cuenta, incluso a zonas distintas. Cualquiera que llegue a la salida este de la Encrucijada y confirme lleva a todo el grupo a la mazmorra.

Para jugar desde otro equipo de tu red local, abre `http://<IP-de-tu-PC>:5173`. El cliente se conecta automáticamente a `ws://<IP-de-tu-PC>:8787`. Puede que tengas que permitir los puertos 5173 y 8787 en el firewall.

> **Local ≠ público.** Que funcione en `localhost` o en tu LAN no significa que esté desplegado en Internet. Para jugar por Internet hay que desplegar el servidor (ver "Producción") en una máquina accesible y, preferiblemente, servirlo tras HTTPS/WSS.

## Controles

| Acción | Teclado / ratón |
|---|---|
| Moverse | Flechas o WASD · diagonales: Q E Z C, teclado numérico o dos flechas a la vez |
| Solo diagonales (como el botón R) | Mantener **Mayús** |
| Girarse sin moverse (no gasta turno) | Mantener **R** + dirección. Caminar contra una pared o un enemigo también gira |
| Ataque normal | Espacio o F · clic en un enemigo adyacente |
| Usar movimiento | 1–4 o clic en el panel de movimientos |
| Mochila | I o Tab (↑↓ elegir, Intro usar, Esc cerrar) |
| Recoger objeto del suelo | G (normalmente se recoge solo al pisarlo) |
| Esperar un turno | X o 5 del teclado numérico |
| Zonas exteriores | Flechas/WASD (diagonal con dos teclas), Mayús para correr, clic mantenido para caminar hacia el puntero, Esc para pausar |
| Cooperativo | Fuera de combate, cada jugador se mueve a su ritmo. Si aparece un enemigo, se pasa a turnos compartidos (aviso "¡Combate!") y, al terminar, se vuelve a la exploración libre |
| Escaleras | Al pisarlas aparece el menú del original: ↑↓ elegir (Avanzar / Info / Cancelar), Intro confirmar, Esc cerrar |
| Minimapa | M: semitransparente → contorno → opaco → oculto |
| Táctil | En pantallas táctiles aparecen una cruceta y botones |

## Pruebas y calidad

```bash
npm test               # Vitest: motor, generador, combate, objetos, servidor e integración WebSocket
npm run typecheck      # TypeScript estricto
npm run validate:data  # Valida datos del juego y catálogo de recursos
npm run build          # Type-check + compilación de producción en dist/
npm run smoke          # Prueba de humo en un Chrome/Edge real (necesita npm run build antes)
npm run sprite-check   # Sprites en mazmorra: idle en bucle, sombra/apoyo y duración de un paso (Chrome real)
npm run light-check    # Iluminación de la mazmorra: sala, a mitad de paso y pasillo (Chrome real)
npm run gen-preview    # Pisos de cada distribución del generador en smoke-output/gen/ (-- tinyWoods 12: los de la mazmorra)
npm run fx-check       # Efectos de movimientos (en combate y en el visor), iconos de estado, objetos y trampas (Chrome real)
npm run fx-gallery     # Galería de las 258 carpetas de move_VFX animadas (smoke-output/efectos/index.html)
npm run import:fx -- <salida de pmd-scraper>   # Importa los efectos originales de cada movimiento desde una ROM propia
npm run import:numbers -- <rom.nds>             # Importa los números de daño/curación/fallo originales (solo lee la ROM)
npm run import:ui -- <rom.nds>                  # Cajas de texto, marco de retrato y fuente de diálogo originales
npm run import:species -- <rom.nds>             # Estadísticas, crecimiento por nivel, exp. y movimientos que aprende cada especie
npm run import:town -- <rom.nds>                # Zonas exteriores originales (dos capas, animaciones y colisión del juego)
npm run ui-check       # Kit de interfaz: esquinas exactas y sin desenfoque a escala ×1, ×2 y ×3 (Chrome real)
```

`npm run smoke` usa `playwright-core` con el Chrome o Edge instalados (no descarga navegadores). Recorre el flujo completo: en solitario, intro → título → menú → casa → (a pie) Risco Sharpedo → Aldea Tesoro, capturas de cada zona y salida de la Encrucijada → mazmorra; en cooperativo, dos navegadores pasan por el lobby, aparecen en casa, uno sale solo a otra zona, entran juntos en la mazmorra, exploran y combaten sin divergencias y vuelven a la Encrucijada. Comprueba también que no haya errores de consola y guarda capturas en `smoke-output/`. Si el navegador está en otra ruta, defínela con `BROWSER_PATH`.

## Producción

```bash
npm run build
npm run start:server      # sirve dist/ y el WebSocket en el mismo puerto (por defecto 8787)
```

Abre `http://localhost:8787`. En producción el cliente se conecta al WebSocket del mismo origen.

### Variables de entorno

Ver [.env.example](.env.example).

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `8787` | Puerto HTTP y WebSocket del servidor |
| `TURN_TIMEOUT_SECONDS` | `60` | Si un jugador no actúa en este tiempo (y otro ya lo hizo), espera automáticamente. `0` = sin límite |
| `VITE_SERVER_URL` | (auto) | URL del WebSocket que usará el cliente compilado, p. ej. `wss://mi-servidor.example` |

## Recursos gráficos

- **Intro, título y fuente.** Las capas y sprites de `Assets/Intro` se recortan, se les aplica la transparencia del color clave y se separan en atlas con `node tools/build-intro-assets.mjs`. La fuente de títulos de `Assets/Font` se convierte en fuente bitmap (BMFont, con á é í ó ú ñ) con `node tools/build-font.mjs`.
- **Interfaz (cajas y fuentes).** `node tools/build-ui.mjs` convierte las fuentes originales de `Assets/Font` en fuentes web hechas de píxeles cuadrados: *PMD Message* para el diálogo y *PMD Title* para los títulos, más una versión bitmap para Phaser y el cursor. Extrae de `Assets/HUD/Text box.png` las **cajas de ventana y los marcos de retrato originales** como fuentes nine-slice (azul, verde y rosa; estilo con trama o liso), y de `Assets/HUD/Hud.png` la tipografía del HUD de mazmorra (números, etiquetas Lv/HP/B/F) y las barras de HP. `node tools/build-font.mjs` genera además el mapa de glifos de la fuente de mazmorra para el DOM (`title-glyphs.generated.json`). Toda la interfaz se dibuja a escala entera (×2, o ×1 en pantallas pequeñas).
- **Kit de interfaz.** `src/client/ui/kit.ts` reúne los componentes reutilizables (ver "Kit de interfaz" más abajo). La galería `ui-gallery.html` (en desarrollo, http://localhost:5173/ui-gallery.html?s=2) los muestra todos, y `npm run ui-check` la revisa píxel a píxel en Chrome a escala ×1, ×2 y ×3.
- **Zonas exteriores.** Con la ROM, `npm run import:town -- <rom>` saca los mapas originales de `MAP_BG` (ver `docs/MECANICAS.md`). Sin ella, `node tools/build-town.mjs` compone los mapas de `Assets/Lobby/DS` (casa y exterior del Risco Sharpedo, Aldea Tesoro, Encrucijada, playa y exterior del gremio). Separa el agua animada en tiras de fotogramas y genera `src/shared/town/zones/<zona>.generated.ts` con el tamaño, las animaciones y la rejilla de colisión. La colisión sale de la paleta del suelo con correcciones a mano. Con `--preview carpeta` deja vistas previas con la colisión en rojo y una cuadrícula.

- El tileset de **Bosque Diminuto** (`public/assets/tilesets/tinywoods.png`) viene de `Assets/Maps/Tinywoods`. Su atlas de autotiles (`tinywoods.json`) se genera con:
  ```bash
  node tools/build-tileset.mjs public/assets/tilesets/<hoja>.png public/assets/tilesets/<nombre>.json
  ```
  El script entiende el formato de hojas de mazmorra de The Spriters Resource (columna "Legend" + secciones Walls/Ground/Water) y deduce, a partir de la leyenda, qué combinación de vecinos corresponde a cada tile (las 47 combinaciones del autotile).
- Los **sprites, animaciones y retratos de Pokémon** vienen de [PMDCollab/SpriteCollab](https://github.com/PMDCollab/SpriteCollab) (CC BY-NC 4.0; créditos en [public/assets/pokemon/CREDITS.md](public/assets/pokemon/CREDITS.md)). Se descargan y registran en el catálogo con:
  ```bash
  npm run fetch:sprites      # añade --force para volver a descargar
  ```
  El script lee el `AnimData.xml` de cada especie (tamaño de frame, duración de cada frame, `CopyOf`) y genera `src/client/assets/spritecollab.generated.ts`. Las especies se declaran en la tabla `DEX` del script. Si a una especie le faltan sprites, se usa el placeholder.
- **Escaleras**: originales de Exploradores (`Assets/items/items DS.png`), recortadas con `node tools/build-objects.mjs`; cada mazmorra indica si sube o baja.
- **Efectos, estados, objetos y trampas** (`node tools/build-effects.mjs`, `node tools/build-objects.mjs`): efectos de movimiento originales de Exploradores (`Assets/effects/Attack effects/.../move_VFX`), iconos de estado (`Assets/effects/status effects.png`), iconos de objetos (`Assets/items/items DS.png`, y `items gba.png` donde falta en DS) y 4 de las 8 trampas. Las 4 trampas restantes siguen con placeholder. `npm run fx-check` lo comprueba todo en Chrome. Qué efecto usa cada movimiento lo decide el registro `src/client/assets/moveFx.ts`; ahora con las tablas del juego importadas de la ROM con pmd-scraper (ver `docs/MECANICAS.md`, «Procedimiento con la ROM»). Para verlos uno a uno: `fx-viewer.html` (en desarrollo, http://localhost:5173/fx-viewer.html).
- Todo se registra en el catálogo [src/client/assets/catalog.ts](src/client/assets/catalog.ts). Cada hoja declara su propia rejilla (tamaño de frame, número de frames, filas por dirección), así que no hace falta que todas compartan formato. El archivo incluye un ejemplo para sprites con el formato de PMDCollab (8 filas = 8 direcciones).
- Para añadir un tileset nuevo: copia la hoja a `public/assets/tilesets/`, genera su atlas, añádelo a `CATALOG.tilesets` y referencia su clave en `tileset` de la mazmorra ([src/shared/data/dungeons.ts](src/shared/data/dungeons.ts)).
- `npm run validate:data` avisa de los recursos que faltan y de las especies que siguen con placeholder.

## Estructura del proyecto

```
src/
  shared/                 Lógica pura en TypeScript, sin Phaser ni DOM (cliente y servidor)
    core/                 RNG determinista con semilla, geometría de 8 direcciones
    data/                 DATOS: especies, movimientos, tipos, objetos, trampas, estados, mazmorras, reglas, validación
    dungeon/              Mapa lógico, generador procedural, visibilidad
    engine/               Motor: estado, acciones, turnos, combate, IA, objetos, trampas, estados, pisos, expedición
    net/protocol.ts       Mensajes cliente↔servidor y política de turnos
    town/                 Zonas exteriores: zone.ts (zonas, llegadas, salidas, colisión), route.ts (rutas a pie) y zones/ (generado)
  server/                 Servidor Node + ws: salas, lobby, coordinador de turnos autoritativo
  client/
    scenes/               Phaser: Boot, Intro, Title, MainMenu, Town (zonas exteriores) y Dungeon
    render/               Autotiles, placeholders y PokemonSprite (sombra, marcador, anclaje por frame)
    ui/                   HUD de mazmorra, HUD de las zonas exteriores y paneles del menú (DOM)
    net/                  Sesión local (solitario) y online (WebSocket), con la misma interfaz
    assets/catalog.ts     Catálogo de recursos gráficos
    meta/profile.ts       Progreso PERMANENTE (historial, estadísticas, opciones)
tests/                    Pruebas Vitest
tools/                    Generador de atlas, validador de datos, prueba de humo
docs/MECANICAS.md         Mecánicas implementadas, fuentes y valores pendientes de verificar
```

### Kit de interfaz

Componentes de `src/client/ui/kit.ts`. Devuelven HTML, igual que el resto de la interfaz DOM, y los tamaños se dan en píxeles del juego, que la hoja de estilos multiplica por `--s`.

| Componente | Para qué |
|---|---|
| `win(html, { color, style, id, cls })` | Caja de ventana de cualquier tamaño (desde 16×16). `color`: `blue` (por defecto), `green` o `pink`. `style`: `dialog` (con trama, por defecto) o `plain` (lisa) |
| `titled(título, html, opts)` | Caja con título centrado (paneles, mochila, información) |
| `portraitFrame(especie, { mood, size, color })` | Marco de retrato original. `size` 40 es el tamaño real; 20 es la mitad exacta |
| `dialog({ text, speaker, portrait, color })` | Diálogo con retrato encima a la izquierda y nombre de quien habla en color |
| `menuList(items, seleccionado)` | Lista con cursor: movimientos, objetos, menús. Cada opción es un `<button data-index>` con sus `data-*` |
| `choiceBox(items, seleccionado)` | Caja pequeña de elección (Sí/No…), que se coloca encima a la derecha de un diálogo |
| `titleText(texto, { color })` | Texto con la fuente de mazmorra original (ubicación, planta) |

Las cajas usan `border-image` con bordes **repetidos**: las esquinas quedan intactas y la trama de 4 px no se deforma a ningún tamaño. Las ventanas de Phaser usan los mismos recursos mediante `pmdWindow(scene, x, y, w, h, { color, style })` (`scenes/stage.ts`), que compone la textura con el mismo método (`render/nineSlice.ts`).

### Decisiones de arquitectura

- **Un único motor.** `src/shared/engine` resuelve los turnos tanto en solitario (en el navegador) como en cooperativo (en el servidor, que es la autoridad). Su salida es un estado serializable más una lista de eventos. El renderizador solo anima los eventos y después se sincroniza con el estado: una animación nunca decide un resultado.
- **Determinismo.** Toda la aleatoriedad sale de un RNG con semilla guardado en el estado. Con la misma semilla y las mismas acciones se obtiene la misma partida (hay una prueba que lo comprueba).
- **Datos, no condicionales.** Especies, movimientos, objetos, trampas, estados y mazmorras son datos. Lo que cambia entre Exploradores del Cielo y Equipo de Rescate Azul vive en `src/shared/data/rules.ts`.
- **Progreso temporal y permanente separados.** `GameState` contiene todo lo de la expedición y se descarta al terminar. `client/meta/profile.ts` solo guarda un resumen (historial y totales).

Las mecánicas, las políticas del cooperativo y las limitaciones conocidas están en [docs/MECANICAS.md](docs/MECANICAS.md).
