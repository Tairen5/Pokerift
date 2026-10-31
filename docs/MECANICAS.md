# Mecánicas implementadas

Referencia principal: **Exploradores del Cielo** (EoS). En el código, cada valor numérico lleva una marca:

- **[VERIFICADO]**: contrastado con una fuente técnica.
- **[INCIERTO]**: aproximación razonable pendiente de verificar. Basta con cambiar el dato correspondiente; no hay que tocar el motor.

## Fuentes consultadas

- [pmdsky-debug](https://github.com/UsernameFodder/pmdsky-debug), símbolos de `overlay10`: multiplicadores de efectividad, quemadura, Super Suerte, Lente Zoom y Raíz/Acua Aro.
- Guías de mecánicas de daño de Time/Darkness/Sky ([Neoseeker](https://www.neoseeker.com/pokemon-mystery-dungeon-explorers-of-darkness/faqs/2818085-pokemon-mystery-dungeon-dt-damaget.html), [GameFAQs](https://gamefaqs.gamespot.com/ds/955859-pokemon-mystery-dungeon-explorers-of-sky/faqs/75112/damage-mechanics-guide)) y el [hilo de Pokémon Speedruns](http://wiki.pokemonspeedruns.com/index.php/Talk:Pok%C3%A9mon_Mystery_Dungeon:_Explorers_of_Sky).
- [Formato de m_level.bin](https://projectpokemon.org/home/docs/mystery-dungeon-nds/m_levelbin-file-format-r55/) (Project Pokémon): estructura de las tablas de nivel de EoS.

Bulbapedia bloqueó el acceso automático (HTTP 403) durante el desarrollo, así que algunos datos no se pudieron contrastar ahí.

## Combate

**Daño [VERIFICADO]** (`engine/combat.ts`):

```
base = (A + P)·39168/65536 − D/2 + 50·ln(clamp(10·((A − D)/8 + L + 50), 1, 4095)) − 311
si el atacante no es del equipo: base /= 340/256
daño = base · efectividad · STAB · habilidad · quemadura · crítico · (R + 57344)/65536,  R ∈ [0, 16383]
```

Al final el daño se acota a [1, 999]. Las potencias de los movimientos siguen la escala de PMD (valores de un dígito que se suman al Ataque), no la de los juegos principales.

**Datos de los movimientos [VERIFICADO]**: con la ROM importada (`npm run import:fx -- <salida de pmd-scraper>`) salen de la tabla del juego (`BALANCE/waza_p.bin`, `DATA/move_data.json` de pmd-scraper) y se generan en `src/shared/data/moves.rom.generated.ts`:
- potencia, tipo, categoría, PP, las dos precisiones, número de golpes y probabilidad de crítico de cada movimiento;
- objetivo y alcance según las enumeraciones `move_target`/`move_range` de pmdsky-debug. Ejemplos: Pistola Agua y Ascuas, la casilla de enfrente cortando esquinas; Hoja Afilada y Disparo Demora, en línea hasta 10 casillas y a cualquier Pokémon (también aliados); Ataque Rápido, 2 casillas;
- excepciones: el ataque normal conserva PP ilimitados (la tabla le da 17); con 0 golpes (número variable, Presa) se mantiene el nuestro **[INCIERTO]**;
- los efectos secundarios (estados, cambios de fase y sus probabilidades) están en el código del juego, no en la tabla: siguen siendo los nuestros **[INCIERTO]**.

Sin ROM se usan los valores aproximados de `moves.ts`.

**Especies [VERIFICADO]** (`npm run import:species -- <rom>`, `tools/import-rom-species.mjs` → `species.rom.generated.ts`):
- `BALANCE/monster.md` (ficha del primer género de cada especie): tipos, habilidades, experiencia base y estadísticas a nivel 1. P. ej. Charmander PS 22, Ataque 3, At. Esp. 4, Defensa 3, Def. Esp. 2.
- `BALANCE/m_level.bin` (entrada = ficha − 1, como SkyTemple; SIR0 + PKDPX): experiencia TOTAL y subida de cada estadística en cada uno de los 100 niveles. Las líneas evolutivas comparten tabla.
- `BALANCE/waza_p.bin`: movimientos por nivel (cuarta generación). Solo se guardan los que existen en Pokerift (p. ej. Charmander: Gruñido y Arañazo a nivel 1, Ascuas a nivel 7, Pantalla de Humo a nivel 10); el resto queda fuera hasta que se amplíe el catálogo.
- **Equipo inicial [VERIFICADO]**: nivel 5. Tras el test de personalidad el juego llama a `ApplyLevelUpBoostsToGroundMonster(protagonista/compañero, 5, …)` (`InitMainTeamAfterQuiz`, arm9 0x20487C4 en la ROM USA, comprobado desensamblando), que aplica las estadísticas de nivel 5 y los movimientos hasta ese nivel. Ningún inicial pierde movimientos: los que conocen a nivel 5 existen todos en Pokerift (2 o 3 cada uno). Además, `AddStarterEggMove` da a algunos un movimiento de huevo (`STARTER_MOVES_ARRAY`, leído de la ROM): a Meowth, Hipnosis.
- **[INCIERTO]** La fórmula de la experiencia ganada (se usa la nuestra con la experiencia base real).

**Efectos secundarios [VERIFICADO]**: el efecto de cada movimiento sale de su descripción en el propio juego (`MESSAGE/text_e.str`, cadena 10145 + move_id) y las probabilidades y duraciones, de las constantes de `overlay10` (pmdsky-debug), leídas de la ROM:
- Ascuas quema 10 % (FLAMETHROWER_BURN_CHANCE), Impactrueno paraliza 10 %, Confusión confunde 10 % (PSYBEAM_CONFUSE_CHANCE), Picotazo Veneno envenena 18 %, Mordisco amedrenta 20 % (pierde su acción 1 turno).
- Pantalla de Humo pone **Despiste** (sus movimientos fallan, 1–3 turnos; **[INCIERTO]** el juego dice «casi todos», aquí todos). Disparo Demora baja la **velocidad de movimiento** 6–7 turnos: media velocidad, actúa uno de cada dos turnos (en EoS `speed_stage` 1 = normal, 0 = media, 2–4 = doble a cuádruple; pmdsky-debug). **[INCIERTO]** No se acumulan varias bajadas y la parálisis no baja la velocidad (en EoS `CalcSpeedStage` la tiene en cuenta; aquí sigue el 25 % de perder el turno). Tornado hace el doble a Volador. Presa golpea de 2 a 5 veces (**[INCIERTO]** reparto uniforme). Bofetón Lodo y Ataque Arena bajan la precisión; Látigo y Malicioso, la Defensa; Gruñido, el Ataque de los enemigos de la sala; Fortaleza sube la Defensa; Desarrollo, el At. Esp.; Canto e Hipnosis duermen.
- Duraciones (rango [a, b) del juego): sueño 3–6, confusión 6–11, amedrentado 1, Despiste 1–3, velocidad reducida 6–7.
- **[INCIERTO]** Cuánto cura Absorber (50 % del daño, como en los juegos principales). La ROM da para veneno y quemadura un daño de 2 y 6 con esperas de 20 y 50 (5 el tóxico, 2 las drenadoras), pero no está claro en qué unidad cuentan; no se aplican. Amedrentado y velocidad reducida no tienen icono (no se sabe cuál usa el juego); Despiste usa el suyo de la ROM.

**Objetos [VERIFICADO]** (Mystery Dungeon Wiki, Serebii, pmdsky-debug): Manzana +50 de Barriga (+5 a la máxima si está llena), Manzana Grande +100 (+10), Baya Aranja 100 PS, Máx. Elixir todos los PP (999), hambre 0,1 por turno (BELLY_LOST_PER_TURN). La Baya Aranja y la Semilla Explosiva llenan además 5 de Barriga; el resto de bayas y la Semilla Cura, «un poco» (**[INCIERTO]** se usa 5). La Semilla Explosiva alcanza a cualquier Pokémon de enfrente, aliado o enemigo; **[INCIERTO]** su daño (25).

**Efectividad [VERIFICADO]**: superefectivo ×1,4 · poco eficaz ×181/256 (≈1/√2) · "inmune" ×0,5. En EoS no hay inmunidades reales.

**Doble tipo**: EoS combina las dos efectividades en una sola categoría (`TYPE_MATCHUP_COMBINATOR_TABLE`). Se usa la reconstrucción más aceptada: inmune domina, SE+SE = SE, SE+NVE = neutral, NVE+NVE = NVE. **[INCIERTO]**: falta verificar la tabla exacta.

**[INCIERTO]**:
- STAB ×1,5 y crítico ×1,5. Sin ROM, probabilidad base de crítico del 12 % (con ROM, la de cada movimiento: 8 % la mayoría, 0 el ataque normal).
- Sin ROM, ataque normal: sin tipo, potencia 1, precisión 88 (con ROM: potencia 1, precisiones 125/93).
- Multiplicadores de etapas de estadística (EoS usa tablas propias de 21 etapas).
- Tratamiento exacto de los daños base muy bajos.

**Precisión**: cada movimiento tiene dos precisiones y, como `MoveHitCheck` de EoS (pmdsky-debug: se llama dos veces por objetivo, primero con `accuracy1` y luego con `accuracy2`), se tiran las dos y solo acierta si pasan ambas. Cada tirada acierta si `rand·100 < precisión · etapa(precisión atacante) / etapa(evasión defensor)`; con precisión > 100, esa tirada no falla. La interfaz enseña el producto (p. ej. Canto 87 × 84 → 73 %). **[INCIERTO]** Que las fases se apliquen igual en las dos tiradas y que > 100 sea acierto seguro.

**Habilidades implementadas**:
- Espesura, Mar Llamas, Torrente y Enjambre: ×1,5 con HP ≤ 1/4.
- Elec. Estática: 30 % de parálisis por contacto. **[INCIERTO]**
- Polvo Escudo: bloquea los efectos secundarios.
- Vista Lince: la precisión no baja.
- El resto existen como dato, sin efecto todavía.

## Movimiento y turnos

- 8 direcciones. Una diagonal no puede rodear una esquina de pared, ni al moverse ni al atacar.
- Caminar contra una pared o un enemigo solo gira al Pokémon y **no gasta turno**. Caminar hacia un compañero intercambia las posiciones.
- La tabla `TURN_COST` de `engine/actions.ts` decide qué acciones gastan turno: mover, atacar, usar movimiento, usar objeto, recoger, esperar y escaleras sí; girarse no. Una acción inválida se rechaza sin avanzar el turno.
- Orden dentro de un turno: jugadores (en orden de equipo), compañeros controlados por la IA, enemigos y, por último, el fin de turno (estados, barriga, regeneración, apariciones, viento).
- **[INCIERTO / pendiente]**: todos actúan una vez por turno; las diferencias de velocidad (Agilidad, Paralizado ≈ lento) no están implementadas.

## Expedición (roguelike)

- Se empieza en nivel 1, con la mochila vacía y 0 Poké. Nada se transfiere de partidas anteriores.
- Mochila y dinero son compartidos por el equipo, como en PMD. Capacidad: 48 en EoS **[INCIERTO]**.
- Barriga: −0,1 por turno; con la barriga a 0 se pierde 1 HP por turno. **[INCIERTO]**
- Regeneración natural: unos 200 turnos para recuperar todo el HP; el veneno y la quemadura la bloquean. **[INCIERTO]**
- Experiencia: todo el equipo vivo recibe la experiencia completa (EoS). La curva de exp, la exp que da cada enemigo y el crecimiento de estadísticas son **PROVISIONALES**. El formato de datos (`Growth.kind = 'table'`) replica `m_level.bin`, así que se pueden importar las tablas reales sin tocar el motor.
- Viento: a los 1000 turnos en un piso el equipo es expulsado (expedición fallida), con avisos previos.
- Al cambiar de piso se reinician las etapas de estadísticas y los estados alterados **[INCIERTO]**.
- **Derrota**: en solitario, si cae el líder (regla de EoS). En cooperativo, cuando caen todos los jugadores. La Semilla Revivir de la mochila se consume sola.

## Expedición de 25 pisos (contenido actual)

Las 5 primeras mazmorras de la historia de Exploradores del Cielo, 5 pisos de cada una, con sus datos reales, importados con `npm run import:dungeons -- <rom>` (`tools/import-rom-dungeons.mjs` → `expedition.rom.generated.ts` y `public/assets/tilesets/eos-1…5`).

| Pisos | Mazmorra (nombre de [WikiDex](https://www.wikidex.net/wiki/Territorios_de_Pok%C3%A9mon_Mundo_misterioso:_Exploradores_del_cielo)) | Pisos originales usados | Enemigos |
|---|---|---|---|
| 1–5 | Cueva Bajamar | 1, 2, 3, 3, 4 de 4 | Shellder, Kabuto, Corsola, Shellos |
| 6–10 | Risco Calado | 1, 2, 4, 5, 6 de 6 | Lileep, Anorith, Shellos, Chingling |
| 11–15 | Monte Árido | 1, 3, 5, 7, 9 de 9 | Machop, Geodude, Doduo, Spinarak, Starly, Nidorina, Nidorino |
| 16–20 | Cueva Cascada | 1, 3, 5, 6, 8 de 8 | Psyduck, Poliwag, Grimer, Tangela, Wooper, Lotad, Surskit, Barboach, Whiscash |
| 21–25 | Manzanar | 1, 4, 7, 9, 12 de 12 | Caterpie, Butterfree, Oddish, Paras, Hoppip, Budew, Burmy, Weedle, Exeggutor, Gloom, Combee, Kakuna, Beedrill |

- **[VERIFICADO] Datos por piso** (`mappa_s.bin` y `DUNGEON_DATA_LIST` del arm9, NA 0x209E3A0, que da la lista de cada mazmorra):
  - propiedades del piso: distribución, salas, conectividad, densidades, callejones, paredes irregulares y pasillos extra;
  - Pokémon con su nivel y peso (Kecleon y el señuelo tienen peso 0 y no aparecen);
  - objetos (peso de categoría × peso del objeto);
  - trampas: en estas 5 mazmorras solo hay Casillas Maravilla.
  - Los 5 pisos se reparten por igual entre el primero y el último normal de cada mazmorra (sin las salas fijas de jefe). Las distribuciones 12–15 (sin uso) caen en la rama por defecto del juego: normal.
- **Tilesets [VERIFICADO]**: los del juego (`dungeon.bin`: DMA, DPC, DPCI y DPL, formatos de SkyTemple). El DMA da el bloque de 24×24 según los 8 vecinos iguales y se convierte a nuestro atlas de 47 máscaras. **[INCIERTO]** Cómo elige el juego entre las 3 variantes de cada bloque. Sin paletas animadas.
- **Especies**: las 36 con datos de la ROM (`import:species`) y sprites de PMDCollab. Sus movimientos: los que aprenden hasta su nivel; 30 movimientos nuevos (efectos según su descripción en el juego; probabilidades de overlay10 donde se han localizado). Sin mecánica todavía, y la IA no los usa: Chapoteo Lodo, Hidrochorro, Foco Energía, Adaptación, Neblina, Salpicadura y Protección. Simplificados **[INCIERTO]**: Constricción (el objetivo pierde un turno), Arraigo (cura un 25 %), Síntesis (cura la mitad), Patada Baja (potencia fija).
- **Casilla Maravilla [VERIFICADO]**: «Step on it to heal any stat changes» y se ve en el suelo (`text_e.str` 16335). Devuelve las estadísticas a la normalidad.
- **Objetos**: solo los que existen en Pokerift (manzanas, bayas, Semilla Cura, Revivir y Explosiva, Máx. Elixir y Poké); los demás de la lista (gominolas, orbes, MT, piedras…) se descartan.
- **Sin implementar**: agua (Risco Calado y Cueva Cascada la tienen), oscuridad, tiendas Kecleon y escaleras de subida (Monte Árido sube en el juego; aquí todo baja). **[INCIERTO]** Ritmo de aparición de enemigos nuevos (36 turnos) y máximo por piso (8).
- Sin la expedición importada, se juega Bosque Diminuto (abajo) como reserva.

## Bosque Diminuto (reserva sin ROM)

- **[VERIFICADO]** Según [Mystery Dungeon Wiki](https://mobile.mysterydungeonwiki.com/wiki/Rescue_Team:Tiny_Woods) y [WikiDex](https://www.wikidex.net/wiki/Arboleda_Chica), en Equipo de Rescate Rojo/Azul (GBA/DS) tiene 3 pisos jugables:
  - Pisos 1–3: Pidgey, Sunkern y Wurmple, a nivel 1.
  - Piso 3: también Exeggcute.
  - Caterpie aparece al final como Pokémon a rescatar, no como enemigo.
- **Pisos [VERIFICADO]** (pret/pmd-red, `data/dungeon/TinyWoods/main_data.inc` y `pokemon_found.json`):
  - Distribución pequeña.
  - Salas: densidad 5 en B1F y 6 en B2F–B3F.
  - Conectividad 15, sin callejones en las anclas y sin paredes irregulares.
  - Enemigos: densidad 4. Pesos de aparición 3333/3334/3333; en B3F, 2857 para Pidgey, Sunkern y Wurmple y 1429 para Exeggcute.
  - Objetos: densidad 2. **Trampas: 0.** 5 pasillos extra.
  - Sin tienda, Casa de Monstruos ni laberinto.
- **Objetos según las mismas fuentes**: Poké en todos los pisos; Baya Aranja, Baya Meloc y Baya Zreza en el piso 3.
- **Movimientos de los enemigos**: los que aprenden a nivel bajo en la 3.ª generación (Pidgey: Placaje; Sunkern: Absorber y Desarrollo; Wurmple: Placaje y Disparo Demora; Exeggcute: Presa e Hipnosis). **[INCIERTO]** Falta confirmar los movimientos exactos de los enemigos en Equipo de Rescate, el número de golpes de Presa, qué objetos salen en cada piso (las tablas de pmd-red no están importadas) y el ritmo de aparición de enemigos nuevos.

## Objetos, trampas y estados

- **Objetos**: Manzana y Manzana Grande, Baya Aranja (100 HP), bayas Meloc, Zreza y Safre, Semilla Cura, Semilla Revivir, Semilla Explosiva, Máx. Elixir y Poké. Se recogen al pisarlos.
- **Trampas**: ocultas hasta que alguien las pisa; los enemigos no las activan. Hay de Teletransporte, Sueño, Veneno, Giro, Castaña, Barro, Invocación y Hoyo. El Hoyo lleva a todo el equipo al piso siguiente.
- **Estados**: Envenenado, Quemado, Paralizado (25 % de perder el turno **[INCIERTO]**), Dormido (no actúa durante 3–6 turnos) y Confuso (dirección aleatoria). Solo puede haber un estado "principal" a la vez.

## IA y percepción

- Un Pokémon percibe a otro si están en la misma habitación, o a distancia ≤ 2 en un pasillo. Los enemigos no conocen la posición global de los jugadores.
- Enemigos:
  1. Si ven un objetivo, lo atacan o usan un movimiento que lo alcance (probabilidad por especie).
  2. Si no, van al último punto donde lo vieron.
  3. Si tampoco, patrullan entre habitaciones.
- Rutas: BFS en 8 direcciones con la regla de esquinas.
- Compañeros controlados por la IA (jugadores desconectados): atacan a los enemigos adyacentes y siguen al jugador más cercano.

## Generación procedural

`dungeon/generator.ts` es una reimplementación propia del algoritmo de los juegos: mismos pasos, mismas condiciones y mismas constantes, sin código copiado.

**Fuentes**:
- Equipo de Rescate: [pret/pmd-red](https://github.com/pret/pmd-red), `src/dungeon_generation.c`, decompilación que reproduce la ROM de GBA byte a byte **[VERIFICADO]**.
- Exploradores del Cielo: descripción de las funciones de overlay29 en [pmdsky-debug](https://github.com/UsernameFodder/pmdsky-debug).
- [dungeon-mystery](https://github.com/EpicYoshiMaster/dungeon-mystery) (GPL-3.0, solo consultado): reimplementación de las rutinas de la ROM NA, para lo que cambia en EoS.

**Pasos**:
1. **Propiedades del piso** (`FloorProperties` en `data/dungeons.ts`, los campos de `floor_properties`): distribución, densidad de salas, conectividad, densidades de enemigos, objetos y trampas, callejones permitidos, paredes irregulares y pasillos extra.
2. **Mapa** de 56×32. Rejilla aleatoria de 2–6 × 2–4 celdas; si en 32 intentos no sale, 4×4.
3. **Distribuciones** del juego:
   - normal (`large`, `large0x8`);
   - pequeña: rejilla 4×2–3 con solo la mitad izquierda;
   - mediana: tres cuartos de la rejilla;
   - anillo exterior, cruces, línea, cruz, escarabajo y salas exteriores;
   - una sala y dos salas con Casa de Monstruos.
4. **Salas** (`AssignRooms`): n a n+2 celdas al azar son salas (exactamente |n| si la densidad es negativa); las demás son anclas de pasillo de una casilla.
5. **Tamaño de sala**: 5×4 como mínimo, con margen dentro de la celda, dimensiones impares si caben y proporción entre 2/3 y 3/2.
6. **Conexiones** (`AssignGridCellConnections`): un paseo aleatorio de *conectividad* pasos sobre la rejilla, con un 50 % de seguir recto y giro a la izquierda en los bordes.
7. **Sin callejones**: si el piso no los permite, cada ancla con una sola conexión recibe otra. Se reproduce el fallo original: comprueba la validez de la celda de la derecha.
8. **Pasillos** (`CreateHallway`): en «Z», con el codo en el límite entre celdas. Se detienen al chocar con otro pasillo. Un 5 % de las salas conectadas se fusiona con una vecina.
9. **Conexión garantizada** (`EnsureConnectedGrid`): toda celda aislada se une a una vecina conectada o se borra.
10. **Pasillos extra**: paseos que salen de una sala y giran cada 3–5 pasos sin abrir cuadrados de 2×2. Dan los callejones y los bucles. **Paredes irregulares**: un 40 % de las salas marcadas pierde esquinas, sin tocar las entradas.
11. **Validación**: al menos 2 salas y 20 casillas de sala en EoS (30 en RT); 10 intentos.
12. **Entidades**:
    - Escalera, objetos, trampas, jugador y enemigos van en casillas de sala que no sean la entrada de un pasillo (`FinalizeJunctions`).
    - Objetos: densidad ±2, mínimo 1. Trampas: entre la mitad de la densidad y la densidad menos 1. Enemigos: igual que las trampas.
    - EoS suma 1 objeto y 1 enemigo (`rules.floorGen`).
13. **Escalera alcanzable** (`StairsAlwaysReachable`): desde la escalera se llega a todas las casillas abiertas. Si no, se repite; tras 10 fallos, una sola sala grande, como en el juego.

**Determinismo**:
- La semilla de cada piso es `hash(semilla de la expedición, mazmorra, piso)` (`floorSeed`), con un RNG propio del piso.
- El piso N de una semilla es siempre el mismo, independientemente de lo que hagan los jugadores antes. El RNG de la partida no se toca.

**[PROPIO]** Para que encaje con el motor:
- Ni los objetos ni el jugador empiezan sobre la escalera.
- Ningún enemigo empieza a 2 casillas o menos del punto de aparición del equipo. El original solo excluye la casilla del jugador.

**Sin implementar** (no hay mecánica todavía):
- Tiendas Kecleon, salas laberinto y estructuras secundarias.
- Agua y lava (ríos y lagos), objetos enterrados, salas fijas y escaleras ocultas.
- La Casa de Monstruos se marca en el mapa, pero no hace nada.
- Las salas laberinto no existen en RT: una comprobación del código lo impide siempre.

`npm run gen-preview` dibuja pisos de cada distribución (y `npm run gen-preview -- tinyWoods 12`, los de la mazmorra) en `smoke-output/gen/`.

## Presentación de la mazmorra

- **Cambio de piso**: al entrar y al bajar, fundido a negro y pantalla negra con el nombre de la mazmorra y la planta («P2»), con la fuente de mazmorra. **[INCIERTO]** Duración (1,3 s) y disposición exactas.
- **Minimapa [VERIFICADO]**:
  - Iconos originales de `dungeon.bin` 1035 (`minimap.zmappat` en SkyTemple). Son 3 estilos —semitransparente (tramado), solo contorno y opaco— y se cambian con M, que también oculta el minimapa.
  - Se dibuja a 4 px por casilla, como en la DS.
  - El icono de cada casilla sigue la lógica de `DrawMinimapTile` (overlay29 NA 0x23391EC, desensamblada). Primero el Pokémon: líder 8, que parpadea; compañero 10; enemigo 2; forajido 12. Si no hay, la trampa (4; Casilla Maravilla 7, por tabla de `trap_id`) o el objeto (3). Si tampoco, la escalera (6; 5 en pisos especiales) y, si no, el suelo.
  - El suelo es 16 + lados con pared (1 abajo, 2 derecha, 4 arriba, 8 izquierda) si se ha visitado, y 32 + lados si se conoce sin visitar.
  - **[INCIERTO]** Ritmo del parpadeo (400 ms) y estilo por defecto (semitransparente).
- **Escalera**: menú con las opciones del original (`text_e.str`: «Proceed», «Info», «Cancel»). «Info» muestra la descripción del juego (cadena 2246, traducida). **[INCIERTO]** Posición exacta de las cajas.

## Política del cooperativo: exploración libre y combate por turnos

El modo se recalcula tras cada acción (`engine/mode.ts`):

- **Exploración libre** (ningún enemigo implicado): cada jugador actúa a su ritmo y su acción se resuelve al instante, sin esperar al compañero. El tiempo del mundo avanza **1/N de turno por acción** (N = jugadores activos), de modo que enemigos, apariciones, viento y barriga van al mismo ritmo que en solitario. Cada jugador paga su propio fin de turno (estados, barriga, regeneración) cuando actúa.
- **Combate por turnos compartidos** (algún enemigo implicado): se aplica el turno compartido completo. Todos los jugadores eligen acción, el turno se resuelve en orden de equipo y después actúan los enemigos. Es la misma resolución que antes, con las reglas de combate de siempre.
- Un enemigo está **implicado** si percibe a alguien del equipo o alguien del equipo lo percibe: misma habitación, o distancia ≤ 2 en un pasillo (la misma regla de percepción que usa la IA). En cuanto no queda ninguno (derrotados, o fuera de la vista), se vuelve a la exploración libre.
- El combate es **global**: si un jugador se encuentra con un enemigo, el otro también pasa a turnos compartidos aunque esté lejos. Así el tiempo del mundo es único y no se desincroniza.
- **[INTERPRETACIÓN]** En los juegos originales todo es por turnos y los compañeros actúan junto al líder. La exploración libre es una adaptación para que el cooperativo sea fluido, sin cambiar las reglas de combate.

| Situación | Comportamiento |
|---|---|
| Ambos envían a la vez | Exploración: se resuelven una tras otra, en orden de llegada. Combate: cada jugador bloquea **una** acción por turno; cuando todos los jugadores vivos y conectados han elegido, el servidor resuelve el turno completo en orden de equipo (J1, J2…) |
| Casilla ocupada | Se valida al enviar. Si al resolver ya no es válida (otro jugador la ocupó), la acción se convierte en "esperar". Moverse hacia un compañero intercambia las posiciones |
| Un jugador no envía nada | Exploración: no bloquea a nadie. Combate: cuando otro ya ha actuado empieza la cuenta atrás (`TURN_TIMEOUT_SECONDS`); al agotarse, el rezagado espera ese turno |
| Acción duplicada o reenviada | Cada acción lleva una secuencia creciente por cliente, y el servidor descarta las repetidas. En combate además debe coincidir el número de turno. El cliente no envía otra acción hasta recibir la confirmación (`ack`) de la anterior |
| Desconexión | Su Pokémon pasa a manejarlo la IA de compañero y el turno no se bloquea. Al reconectar (token de sesión; también tras recargar la página) recupera el control desde el turno siguiente |
| Jugador debilitado | Queda fuera de la expedición (como un compañero debilitado en EoS) y la sigue como espectador. No se le espera en los turnos |
| Todo el equipo debilitado | La expedición termina para todos con el mismo resultado sincronizado |
| Escaleras en momentos distintos | Como en PMD, el equipo viaja junto. Cualquier jugador que esté en la escalera puede avanzar, y todo el equipo pasa al siguiente piso. Aparece un aviso de confirmación al pisarla |
| Información oculta | El servidor no envía a los clientes las trampas sin descubrir |

## Presentación de los sprites en la mazmorra

Solo afecta a cómo se ve un turno ya resuelto; las reglas de turnos y del cooperativo no cambian.

- **Apoyo en el suelo**: sombras **originales del juego** **[VERIFICADO]**: `dungeon.bin` archivo 995 (imagen) con la paleta 997, extraídas de la ROM por pmd-scraper e importadas a `public/assets/shadows` con `npm run import:fx`. Tallas según el `<ShadowSize>` de PMDCollab:
  - **negras** (enemigos y compañeros IA): pequeña 8×8, mediana 16×8 y grande 32×8; se dibujan casi opacas;
  - **amarillas** (Pokémon de los jugadores): las mismas tallas, la grande de 32×16, con borde `rgb(255,247,0)`, un tono intermedio `rgb(223,183,0)` en las curvas y centro `rgb(167,111,0)`;
  - se colocan con el centro de su dibujo en el punto de apoyo;
  - sin ROM importada, se generan a partir de la plantilla `Shadow-Anim` de PMDCollab (aproximación).

  La amarilla es solo de la mazmorra: en las zonas exteriores todos llevan la sombra negra. El cuerpo se coloca, frame a frame, para que el punto de apoyo marcado en `Shadow-Anim.png` caiga sobre la sombra.
- **Números sobre el Pokémon**: como `DisplayAnimatedNumbers` del juego (pmdsky-debug: cantidad con signo opcional y un color, `NUMBER_COLOR_*`; 9999 = fallo). **Glifos originales [VERIFICADO]**: `dungeon.bin` 1007–1011 son texturas WTE de 128×16 (4 bpp, sin paleta propia) con «0»–«9», «+», «-» en celdas de 8×8 y la palabra de fallo de cada idioma (1007 MISS, 1008 Ratê, 1009 FEHL, 1010 NULLO, 1011 FALLO; usamos **1007 MISS**: el usuario recuerda «MISS» también en la versión española [INCIERTO]). La paleta está en `dungeon.bin` 1024 (WTE solo de paleta, 16 filas); los glifos usan el índice 1 (contorno) y 8/10/15 (degradado). Se importan de la ROM con `npm run import:numbers -- <rom.nds>` (`tools/import-rom-numbers.mjs`):
  - daño: `-N` con la fila 3 (167,111,0 → 255,247,0 → blanco), el dorado de las capturas del juego;
  - curación: `+N` con la fila 10 (verde);
  - fallo: «MISS», en dorado.

  El número sube y se desvanece al final. **[INCIERTO]**:
  - qué fila de paleta elige el juego para cada `NUMBER_COLOR_*` (el dorado coincide con las capturas; el verde de la curación y el color del fallo no están comprobados);
  - el espaciado (cada glifo comparte una columna de contorno con el siguiente, sacado de una captura);
  - el movimiento (subida y desvanecido).

  Sin ROM importada se escriben con la fuente de mensajes de Equipo de Rescate teñida (aproximación).
- **Animaciones**: se usan las duraciones originales de cada frame (`AnimData.xml`). El idle, el andar y el dormir van en bucle sin reiniciarse. Ataque, disparo y daño vuelven solos al reposo. Al encadenar pasos, el ciclo de andar continúa en lugar de volver al idle en cada casilla.
- **Ritmo**: un paso ortogonal dura 240 ms (antes 140 ms), unos 4 pasos por segundo **[INCIERTO]**. Un paso diagonal dura √2 veces más, para que la velocidad sobre el suelo sea la misma en todas direcciones; medido en Chrome: ~88 px/s ortogonal y ~91 px/s diagonal. Al soltar la dirección, el Pokémon vuelve al idle. Con la opción de velocidad (x1, x1,5, x2) se acelera toda la presentación, incluidas las animaciones de los sprites.
- **Ataques**: se usa la animación original de ataque o disparo, que ya incluye la embestida, y el daño se muestra en su `HitFrame`.

## Interfaz (cajas, retratos y HUD)

Solo es presentación; no afecta a las reglas.

- **Con la ROM importada** (`npm run import:ui -- <rom>`, `tools/import-rom-ui.mjs`) **[VERIFICADO]**:
  - **Cajas**: las del juego, `FONT/frame_b0.chr` (18 teselas de 8×8 a 8 bpp: 0 vacía, 1 relleno, 2–9 esquinas y bordes de la caja) con `frame_b0.pal`, cuyas filas 0, 1 y 2 son el azul, el rosa y el verde. `frame_b1`–`b4` son los otros estilos de marco (sin usar).
  - **Marco de retrato**: las teselas 10–17 del mismo archivo, un marco fino con la misma disposición. **[INCIERTO]** Que el juego lo use para el retrato.
  - **Fuente de diálogo**: `FONT/kanji.dat` (glifos de 12×12 con su avance; Latin-1 completo, con ñ, tildes, ¿ y ¡). `unknown.dat` son las runas Unown y las huellas.
  - **[INCIERTO]** La sombra negra de 1 px del texto (el glifo del juego es de un solo color).
  - Las texturas `FONT/frame*.wte` (marcos redondeados en 3D) se parecen a los de la hoja del test de personalidad; no se usan.
- Sin ROM:
- **Cajas y marcos**: los píxeles salen de la hoja del test de personalidad de Exploradores del Cielo (`Assets/HUD/Text box.png`). Hay dos estilos de caja:
  - con trama de 4 px en el borde: la de diálogo, cuyas esquinas comparten 128 cajas de la hoja;
  - lisa: el panel "Controls" y otras 15 cajas.

  Las dos tienen 7 px de borde a los lados, 4 px arriba y abajo, y relleno opaco #202020. Los marcos de retrato tienen 4 px de borde (5 abajo) y un hueco de 40×40, el tamaño de los retratos.
- **Colores**: el azul es el de la hoja. El verde sale de las cajas verdes reales de la hoja, por correspondencia de píxeles. El rosa se deriva de la muestra "Border palette" de la hoja (mismo índice que el verde equivalente), porque en la hoja no hay ninguna caja rosa: **[INCIERTO]** los tonos intermedios de la trama.
- **[INCIERTO]** Qué estilo y color usa el original para cada ventana de las mazmorras (mensajes, menús, mochila), y si el relleno es translúcido en algún caso. Por ahora todo es azul y opaco: los diálogos y el HUD usan la caja con trama, y la ayuda de controles la lisa.
- **HUD de mazmorra**: se inspira en las capturas de *Rescue Team DX* y deja el escenario lo más despejado posible.
  - **Ubicación** (abajo a la izquierda, sin caja): nombre y planta ("P1") con la fuente de mazmorra (`Assets/Font/dungeon title font.png`), contorno oscuro de 1 px y una línea blanca fina bajo el nombre. Los nombres largos pasan a otra línea por palabras. Rótulo "P" a petición del usuario. La fuente no tiene «¡» ni «¿», así que se omiten.
  - **Equipo** (arriba a la derecha, sin caja): una fila por Pokémon con retrato enmarcado, Lv, PS y barra de PS sobre una franja translúcida rematada con una línea blanca. La primera fila es la del jugador local, con el retrato a tamaño real (40 px) y la barriga y el dinero; las demás van a la mitad exacta (20 px).
  - **Movimientos** (abajo a la derecha): caja de diálogo con cursor en el último movimiento elegido. Se ensancha según el nombre más largo.
  - **Mensajes**: caja de diálogo centrada abajo, que se desvanece sin mensajes nuevos.
- **Seguimiento**: la cámara va fija al líder, sin suavizado, y el paso avanza en píxeles enteros del mundo, igual que la cámara. Así el Pokémon queda quieto en pantalla mientras se desplaza el escenario, sin retroceso ni temblor (`npm run sprite-check` lo mide fotograma a fotograma).
- **Cámara**: zoom entero que muestra unas 15×10 casillas (con un mínimo de 8 por el lado corto de la ventana) y no sale de los límites del mapa. La pantalla de DS muestra unas 11×8 casillas de 24 px; en panorámico se enseña algo más de ancho. Resultado: ×3 a 1280×760 y ×5 a 1920×1080. La interfaz usa escala ×3 en ventanas de al menos 1800×1000.
- **Iluminación** (`render/dungeonLight.ts`), según capturas de Exploradores del Cielo:
  - Fuera de la luz, el terreno se oscurece de forma uniforme (`DARKNESS` = 50 %, **[INCIERTO]**, a ojo). La niebla de guerra (explorado o no) solo se ve en el minimapa, como en la DS.
  - Cada Pokémon del equipo ilumina su sala entera con el contorno (rectángulo de esquinas redondeadas y borde difuminado) o, en un pasillo, un círculo de ~2 casillas que se apaga hasta ~3. La luz sigue al sprite durante el paso.
  - En cooperativo se ve la unión de las luces de todo el equipo, igual que la visibilidad de la partida.
  - Es solo presentación: qué se ve (enemigos, objetos) lo decide `shared/dungeon/visibility.ts`.
  - Se pinta en un lienzo a la resolución del mundo, porque en modo pixelArt Phaser no filtra las texturas: el degradado va en escalones de un píxel del juego. Solo se redibuja cuando cambia la posición de una luz o la sala. `npm run light-check` lo comprueba en Chrome (sala, a mitad de paso y pasillo).
- **Escaleras**: la caja Sí/No va encima, a la derecha, de la caja de diálogo, como en la hoja. Se elige con ↑↓ e Intro.

## Efectos de movimientos, estados y objetos (presentación)

- **Animación del atacante [VERIFICADO]**: la de la tabla de animaciones del juego (`pokemon_anim_id`) o, si su especie tiene excepción, la suya (`special_animations`, por nº de Pokédex). El índice es el de la animación en el WAN de EoS, que PMDCollab guarda como `<Index>` en `AnimData.xml` (p. ej. Impactrueno: 11 «Charge» en general y 4 «Shock» para Pikachu). `fetch-spritecollab.mjs` descarga todas las animaciones de cada especie (`a<índice>` en el catálogo); al arrancar solo se cargan las que usan nuestros movimientos (el visor las carga todas). Si la especie no tiene esa animación en PMDCollab (o el índice es especial, p. ej. 99 en Bofetón Lodo), se usa la de atacar o disparar como antes.
- **Objetos y casillas del suelo [VERIFICADO]** (`npm run import:fx`): iconos originales de los objetos (atlas de pmd-scraper: fila = dibujo, columna = paleta; cada objeto indica los suyos; p. ej. todas las semillas comparten dibujo, como en el juego) y las 35 casillas de `dungeon.bin` 1033 en sus 2 paletas. El dibujo n es la trampa n de `enum trap_id` (pmdsky-debug): lo confirman los dibujos (10 Slowpoke = Lenta, 13 Voltorb = Autodestrucción, 14 Electrode = Explosión, 16 castaña, 32 hoyo roto = `TRAP_BROKEN_PITFALL_TRAP`…). 27 y 28 son las escaleras de bajada y subida (idénticas a las de la hoja de DS). **Corrección**: lo que se había recortado a ojo de la hoja como «Trampa Teletransporte» es la trampa de Sueño (9); la de Teletransporte es la 6. **[INCIERTO]** Cuándo usa el juego la segunda paleta (rosa); se usa la primera.
- **Todos los movimientos del juego** (`npm run import:fx`): se importan las animaciones de los **536 movimientos** que tienen animación en la ROM (479 efectos) a `public/assets/effects/eos/`, con `moves.json`: para cada uno de los 563 registros, los datos de la tabla, las capas de efectos, la animación del atacante (`pokemon_anim_id`), la velocidad del proyectil, los sonidos y las excepciones por especie (`special_animations`). Todo queda copiado en el proyecto: el juego no necesita la ROM para verlos. Al arrancar solo se cargan los efectos de los movimientos de la partida; el resto, bajo demanda (visor `fx-viewer.html`, sección «Todos los movimientos del juego», o `?eos=<move_id>`).
- **Hojas**: los fotogramas se colocan en rejilla, en orden, con un ancho máximo de 4096 px (algunas tiras medían más de 17 000 px). Si una dirección trae menos fotogramas que la primera (efecto 498), se repite su último fotograma.
- **Efectos de pantalla** (tipo Screen, p. ej. Psíquico): 256×160, cubren la vista de la cámara con la opacidad de cada fotograma de la tabla (alpha/65536), una vez por uso del movimiento. **[INCIERTO]** La mezcla exacta (la DS la hace por hardware) y el sentido de `row_height`.

### Cómo funcionan los efectos de ataque en Exploradores del Cielo

Hay **tres numeraciones distintas** que no deben confundirse:

1. **`move_id`**: identificador interno del movimiento. Fuente: [pmdsky-debug](https://github.com/UsernameFodder/pmdsky-debug), `headers/types/common/enums.h`. Ejemplos: `MOVE_THUNDERSHOCK = 188`, `MOVE_THUNDERBOLT = 129`, `MOVE_THUNDER = 64`.
2. **ID de animación de efecto**: el número que usa el juego (y `SetEffect` en los guiones). Hay 700. La [lista de la wiki de SkyTemple](https://wiki.skytemple.org/index.php/List_of_Effect_Animations) describe algunos. Por ejemplo:

   | ID | Tipo de archivo | Descripción |
   |---|---|---|
   | 113 | WAN | Thunder |
   | 114 | WAN | Spark o ThunderPunch |
   | 236 | WAN | Thunderbolt |
   | 137 | WAN | proyectil de Ember |
   | 317 | WAN | impacto de Ember |
   | 333 | WAN | proyectil de Water Gun |
   | 334 | WAN File 0 | impacto de Water Gun |
   | 217 | WAN | proyectil de Poison Sting |
   | 138 | WAN | Scratch |

   **Thunder Shock no aparece con nombre en esa lista.**
3. **Archivo de `EFFECT/effect.bin`**: según el README de `effect_wan` en [skytemple-files](https://github.com/SkyTemple/skytemple-files):
   - 293 entradas;
   - **0000–0001**, efectos genéricos compartidos (WAN File 0/1);
   - **0002–0259**, VFX de ataques;
   - 0268–0289, efectos de pantalla;
   - 0292, imagen y paleta comunes.

   Las carpetas de `Assets/effects/.../move_VFX` (0002–0259) son esos archivos. Indicio: según [pmd-eos-battle-visuals](https://github.com/vinzmyko/pmd-eos-battle-visuals), Shadow Sneak usa el archivo 184, con 16 secuencias, y la carpeta 0184 tiene 16 animaciones. **No son ID de animación de efecto.**

Lo que une las tres numeraciones son dos tablas del binario del juego. Su estructura está en [skytemple-files](https://github.com/SkyTemple/skytemple-files) (`data/anim`, que SkyTemple extrae a `BALANCE/anim.bin`) y en pmd-eos-battle-visuals:

- **tabla de animaciones de movimientos**: para cada `move_id`, hasta 4 ID de animación de efecto (capas carga, secundario, principal, proyectil), dirección, velocidad del proyectil y punto de anclaje;
- **`EFFECT_ANIMATION_INFO`**: para cada ID de animación de efecto, su tipo (WAN, WAN File 0/1, pantalla…), el `file_index` de `effect.bin` y la secuencia (`animation_index`; si el archivo tiene un múltiplo de 8 secuencias, + dirección), el sonido, el punto de anclaje y si se repite.

**No hay volcado público de esas tablas**: hay que leerlas de una ROM. [pmd-scraper](https://github.com/vinzmyko/pmd-scraper) (Rust, sin licencia publicada) lo hace. Genera:
- `asset_index.json`: movimientos → efectos por capa, y para cada efecto su hoja, tamaño de fotograma, duración de cada fotograma, direcciones y bucle;
- las hojas en `EFFECT/`.

Limitación: no guarda dónde queda el origen del efecto dentro de su lienzo, y el propio autor anota que `thunder_shock` le sale descolocado. Por eso el anclaje de los efectos verticales hay que revisarlo en el visor.

### Impactrueno (Thunder Shock) **[VERIFICADO con la ROM]**

Datos extraídos con pmd-scraper de la ROM de Exploradores del Cielo (USA), en `DATA/animation_data/move_animation_info.json` y `effect_animation_info.json`:

- `move_id` = **188**, también en pmdsky-debug: `MOVE_THUNDERSHOCK = 188`.
- Capas:

  | Capa | Efecto | Qué es | Detalle |
  |---|---|---|---|
  | carga | 22 | brillo sobre quien ataca | WAN File 0, animación 1, 7 fotogramas de 1–2 ticks |
  | principal | **236** | el rayo | `effect.bin` archivo **119**, animación **2**; 17 fotogramas de 2 ticks (el 13.º de 1 y el último de 4); anclaje 3 (centro); sonido 1541 |

  No tiene capas secundaria ni proyectil.
- **Impactrueno y Rayo (129) usan la misma animación (236).** Trueno (64) usa la 113, que es el mismo archivo **119** pero la animación **0**: 12 fotogramas, un rayo más fino sin descarga final. Coincide con la wiki de SkyTemple, que llama «Thunderbolt» al 236 y «Thunder» al 113.
- Comprobación con tus recursos: `move_VFX/0119` tiene 3 animaciones, `000` con 12 fotogramas (Trueno) y `002` con 17 (Impactrueno y Rayo). La asignación a ojo usaba la `000`: **era la de Trueno**.
- Animación del rayo: cae desde arriba en zigzag sobre el objetivo y termina en una descarga eléctrica. El centro del lienzo (72×272) es el objetivo.
- Después, como en todo golpe con daño, el juego reproduce la reacción al golpe según la eficacia (efectos 8–11).
- La tabla también trae animaciones del atacante propias de cada especie (`special_animations`; Pikachu usa la animación 4). **Sin implementar.**

### Correspondencia de nuestros movimientos (de la ROM)

Columnas: carga / secundaria / principal / proyectil. Cada efecto aparece como su ID de animación de efecto → `archivo de effect.bin/animación` (las carpetas de `move_VFX`). Los «WAN File 0» y «pantalla» no están en `move_VFX`; los de WAN File 0 se importan desde la extracción.

| Movimiento | move_id (nombre en la ROM) | Carga | Secundaria | Principal | Proyectil |
|---|---|---|---|---|---|
| regularAttack | 355 (regular attack) | — | — | — | — |
| tackle | 154 (Tackle) | — | — | — | — |
| pound | 250 (Pound) | — | — | — | — |
| quickAttack | 190 (Quick Attack) | 22 (WAN File 0) | — | — | — |
| scratch | 260 (Scratch) | — | — | 138 → 0054/000 | — |
| furyCutter | 346 (Fury Cutter) | 22 (WAN File 0) | — | 32 → 0099/000 | — |
| bite | 63 (Bite) | 22 (WAN File 0) | 96 → 0122/008 | — | — |
| ember | 262 (Ember) | — | 144 (WAN File 0) | 317 → 0053/003 | 137 → 0053/000 |
| waterGun | 308 (Water Gun) | — | 21 (WAN File 0) | 334 (WAN File 0) | 333 → 0013/048 |
| vineWhip | 182 (Vine Whip) | — | 194 → 0131/000 | 675 → 0131/001 | — |
| razorLeaf | 251 (Razor Leaf) | 296 → 0108/009 | — | — | 288 → 0108/004 |
| thunderShock | 188 (ThunderShock) | 22 (WAN File 0) | — | 236 → 0119/002 | — |
| poisonSting | 200 (Poison Sting) | — | 21 (WAN File 0) | — | 217 → 0136/016 |
| peck | 174 (Peck) | — | — | — | — |
| gust | 57 (Gust) | 22 (WAN File 0) | — | 83 → 0258/000 | — |
| absorb | 135 (Absorb) | 22 (WAN File 0) | 128 → 0023/000 | — | — |
| growl | 217 (Growl) | 22 (WAN File 0) | 274 → 0121/000 | — | — |
| tailWhip | 122 (Tail Whip) | — | — | — | — |
| leer | 224 (Leer) | — | 287 → 0113/001 | — | — |
| sandAttack | 142 (Sand-Attack) | — | — | — | 215 → 0114/000 |
| mudSlap | 213 (Mud-Slap) | — | 21 (WAN File 0) | — | 182 → 0022/002 |
| stringShot | 23 (String Shot) | — | 44 → 0134/000 | 46 → 0134/002 | 45 → 0134/001 |
| harden | 58 (Harden) | — | 84 → 0020/002 | — | — |
| sing | 34 (Sing) | — | 60 → 0007/001 | — | 61 → 0007/002 |
| confusion | 234 (Confusion) | 222 (pantalla) | 22 (WAN File 0) | — | — |
| smokescreen | 37 (SmokeScreen) | 22 (WAN File 0) | — | — | 65 → 0056/000 |
| barrage | 168 (Barrage) | — | — | — | 189 → 0117/000 |
| hypnosis | 111 (Hypnosis) | 222 (pantalla) | 21 (WAN File 0) | — | 225 → 0081/000 |
| growth | 148 (Growth) | — | 47 (WAN File 0) | — | — |

- Sin capas (ataque normal, Placaje, Destructor, Picotazo y Látigo): en el juego solo se ve la reacción al golpe.
- Reacciones al golpe, todas WAN File 0:
  - 8 (0,5×): animación 3;
  - 9 (poco eficaz): animación 15;
  - 10 (neutro): animación 16;
  - 11 (muy eficaz): animación 4.
- **Pendiente:** los efectos de pantalla (222, de Confusión e Hipnosis) no se importan.

### Reproducción (`render/fxPlayer.ts`)

La mazmorra y el visor usan el mismo reproductor:
- **Carga:** sobre el usuario, antes de atacar.
- **Proyectil:** vuela en la dirección del ataque, 1 casilla en los de contacto y 4 en los de línea.
- **Secundaria y principal:** sobre cada objetivo alcanzado, una vez, al llegar su daño, estado o cambio de característica. Según pmd-eos-battle-visuals (`attachment_point_pipeline.md`), las dos capas van sobre el objetivo.
- **Reacción al golpe:** en cada golpe con daño, según la eficacia (efectos 8–11, ver `damage_visual_pipeline.md`).
- **Retorno:** la partícula vuelve del objetivo al usuario.

Detalles:
- Los efectos de 8 variantes van en la dirección del ataque. El orden S, SE, E, NE, N, NW, W, SW se ha comprobado con el picotazo y la gota.
- Los marcados `anchor: 'bottom'` caen desde arriba.
- Con datos de la ROM, cada fotograma dura lo que dice el juego (`durations`); los de `move_VFX` van a 30 fotogramas/s **[INCIERTO]**.
- El daño por estado o por hambre no lleva efecto. La Semilla Explosiva usa la explosión (0253) y las trampas, el golpe.

### Procedimiento con la ROM (reproducible)

1. Volcar el juego de un cartucho propio. Pokerift no incluye ni descarga ROMs.
2. Compilar pmd-scraper y ejecutarlo sobre la ROM (`cargo run --release -- juego.nds -o salida`). No tiene licencia publicada: se usa aparte, sin copiar su código al proyecto.
3. `node tools/import-pmd-scraper.mjs salida`. Importa solo los efectos de los movimientos del registro, por su `move_id`, y genera `public/assets/effects/eos/<ID>.png` (una fila por dirección) y `src/client/assets/move-fx.rom.generated.ts`. Informa de qué efectos usa cada movimiento y por capa.
4. Revisar en el visor (`fx-viewer.html`), sobre todo el anclaje de los efectos verticales, y ejecutar `npm run fx-check`.

Lo que viene de la ROM es material del juego: solo para uso personal, como el resto de `Assets`.

### Comprobar los efectos

- `fx-viewer.html` (en desarrollo: http://localhost:5173/fx-viewer.html, o `?move=thunderShock&dir=2`) reproduce cada movimiento entre un atacante y un objetivo, en la dirección elegida, con su origen y su nota. También reproduce cualquier efecto suelto del catálogo.
- `node tools/fx-gallery.mjs` genera `smoke-output/efectos/index.html`, con las 258 carpetas de `move_VFX` animadas y numeradas, para buscar candidatos.
- `npm run fx-check` lo comprueba en Chrome: efectos en combate, cada movimiento del registro en el visor, iconos de estado, objetos y trampas.

### Iconos de estado

Según la tabla de iconos del juego documentada en pmd-eos-battle-visuals (`status_icon_system.md`) **[VERIFICADO]**:
- sueño: «Z»; quemadura: llama roja; veneno: calavera blanca; confusión: pajaritos amarillos;
- **característica bajada**: flechas hacia abajo;
- **la parálisis no tiene icono**.

Los recortes salen de `status effects.png`. Si hay varios, se van alternando cada 1,2 s, como en el original, que va recorriendo los iconos activos. El ritmo exacto y la prioridad son **[INCIERTO]**. Funciona igual en jugadores, enemigos y cooperativo.

### Objetos y trampas

- **Objetos**: iconos originales de `items DS.png` en el suelo y en la mochila.
  - La Manzana Grande usa el de la Manzana.
  - La Semilla Cura y la Semilla Explosiva vienen de `items gba.png`, porque la hoja de DS solo trae semillas doradas. **[INCIERTO]** Su color y la baya de Safre.
- **Trampas**: Teletransporte, Castaña, Giro y Hoyo usan su casilla original. Sueño, Veneno, Barro e Invocación siguen con placeholder.

## Zonas exteriores (Exploradores del Cielo) y flujo del cooperativo

- **Recorrido**: se empieza dentro de casa (la cueva del Risco Sharpedo) y se sale por la escalera a lo alto del acantilado. Desde allí, el camino del este lleva a la Aldea Tesoro y, por su extremo este, a la Encrucijada. De la Encrucijada salen el gremio (norte), la playa (sur) y las mazmorras (este). Al volver de una expedición se aparece en la Encrucijada.
  - **[VERIFICADO]** Según [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Treasure_Town): el Risco Sharpedo queda al oeste de la Aldea Tesoro, la Encrucijada al este, y sus carteles señalan el gremio al norte, la playa al sur y las mazmorras al este.
  - Nombres en español según [WikiDex](https://www.wikidex.net/wiki/Aldea_Tesoro): **Aldea Tesoro** y **Risco Sharpedo**. «Encrucijada», «Gremio de Wigglytuff», «Playa» y «Cueva de la Playa» son **[INCIERTO]**.
  - **[INCIERTO]** Por qué lado de la playa se entra desde la Encrucijada.
- **Mapas**: con la ROM importada (`npm run import:town -- <rom>`, `tools/import-rom-town.mjs`) son los **mapas originales del juego** **[VERIFICADO]**, sacados de `MAP_BG` con los formatos documentados por SkyTemple (BMA, BPC, BPL, BPA y `bg_list.dat`):
  - casa `h02p99a` (528×384), Risco Sharpedo `h01p99a` (504×384), Encrucijada `p01p01a` (432×456), playa `d01p11a` (792×384), gremio `t00p04a` (480×408). Identificados comparando píxel a píxel con los ripeos (88–99 % de coincidencia).
  - **Aldea Tesoro**: en el juego son **dos mapas** unidos por el borde, `t01p02a` (oeste) y `t01p01a` (este). Aquí se juntan en uno de 1152×504 (el este empieza en x = 480; se solapan 72 px), como hacía el ripeo.
  - Las dos capas del mapa se dibujan por separado, y los Pokémon siempre por delante de ambas: la segunda capa también contiene suelo transitable (en la casa, casi todo).
  - Animaciones originales: teselas animadas (BPA: agua, oleaje…) y animación de paleta (BPL: brillo del mar), separadas por regiones de 8×8 según qué animación las mueve. **[INCIERTO]** Que las duraciones de BPA/BPL vayan en fotogramas de 60 Hz.
  - Las llegadas y salidas siguen escritas sobre el ripeo y se trasladan con `origin` (dónde cae la esquina del ripeo en el mapa original).
  - **Objetos y NPC [VERIFICADO]**: los de la escena de entrada de cada mapa (`SCRIPT/<MAPA>/enter.sse`, formato SSA/SSE de SkyTemple; posiciones en casillas de 8 px). Capa 0: objetos siempre presentes (los tótems de la Aldea Tesoro, `GROUND/t01p01a2–4.wan`; en casa, `h02p99a1`). Capa 99: los NPC del día a día: oeste Xatu, Kangaskhan y los hermanos Kecleon (verde y morado); este Duskull, Electivire y Chansey. Los NPC usan los sprites de PMDCollab (decorado, sin diálogo aún). Objetos y NPC bloquean el paso; **[INCIERTO]** el tamaño exacto de sus cajas de choque (objetos: su ancho×alto en casillas, centrado; NPC: 2×1 casillas, como el valor por defecto de SkyTemple).
  - **Pendiente**: las capas que dependen de la historia (otros NPC, eventos) y hablar con los NPC.
  - Sin ROM se usan los ripeos de `Assets/Lobby/DS` (`tools/build-town.mjs`): agua animada de las hojas a 100–133 ms por fotograma [INCIERTO], gremio con las esquinas inferiores rellenadas a mano.
- **Cámara**: zoom entero que muestra unas 15×10 casillas (con un mínimo de 8 por el lado corto de la ventana) y no sale de los límites del mapa. La pantalla de DS muestra unas 11×8 casillas de 24 px; en panorámico se enseña algo más de ancho. Resultado: ×3 a 1280×760 y ×5 a 1920×1080. La interfaz usa escala ×3 en ventanas de al menos 1800×1000.
- **Iluminación** (`render/dungeonLight.ts`), según capturas de Exploradores del Cielo:
  - Fuera de la luz, el terreno se oscurece de forma uniforme (`DARKNESS` = 50 %, **[INCIERTO]**, a ojo). La niebla de guerra (explorado o no) solo se ve en el minimapa, como en la DS.
  - Cada Pokémon del equipo ilumina su sala entera con el contorno (rectángulo de esquinas redondeadas y borde difuminado) o, en un pasillo, un círculo de ~2 casillas que se apaga hasta ~3. La luz sigue al sprite durante el paso.
  - En cooperativo se ve la unión de las luces de todo el equipo, igual que la visibilidad de la partida.
  - Es solo presentación: qué se ve (enemigos, objetos) lo decide `shared/dungeon/visibility.ts`.
  - Se pinta en un lienzo a la resolución del mundo, porque en modo pixelArt Phaser no filtra las texturas: el degradado va en escalones de un píxel del juego. Solo se redibuja cuando cambia la posición de una luz o la sala. `npm run light-check` lo comprueba en Chrome (sala, a mitad de paso y pasillo).
- **Escaleras**: la caja Sí/No va encima, a la derecha, de la caja de diálogo, como en la hoja. Se elige con ↑↓ e Intro.

## Efectos de movimientos, estados y objetos (presentación)

### Cómo funcionan los efectos de ataque en Exploradores del Cielo

Hay **tres numeraciones distintas** que no deben confundirse:

1. **`move_id`**: identificador interno del movimiento. Fuente: [pmdsky-debug](https://github.com/UsernameFodder/pmdsky-debug), `headers/types/common/enums.h`. Ejemplos: `MOVE_THUNDERSHOCK = 188`, `MOVE_THUNDERBOLT = 129`, `MOVE_THUNDER = 64`.
2. **ID de animación de efecto**: el número que usa el juego (y `SetEffect` en los guiones). Hay 700. La [lista de la wiki de SkyTemple](https://wiki.skytemple.org/index.php/List_of_Effect_Animations) describe algunos. Por ejemplo:

   | ID | Tipo de archivo | Descripción |
   |---|---|---|
   | 113 | WAN | Thunder |
   | 114 | WAN | Spark o ThunderPunch |
   | 236 | WAN | Thunderbolt |
   | 137 | WAN | proyectil de Ember |
   | 317 | WAN | impacto de Ember |
   | 333 | WAN | proyectil de Water Gun |
   | 334 | WAN File 0 | impacto de Water Gun |
   | 217 | WAN | proyectil de Poison Sting |
   | 138 | WAN | Scratch |

   **Thunder Shock no aparece con nombre en esa lista.**
3. **Archivo de `EFFECT/effect.bin`**: según el README de `effect_wan` en [skytemple-files](https://github.com/SkyTemple/skytemple-files):
   - 293 entradas;
   - **0000–0001**, efectos genéricos compartidos (WAN File 0/1);
   - **0002–0259**, VFX de ataques;
   - 0268–0289, efectos de pantalla;
   - 0292, imagen y paleta comunes.

   Las carpetas de `Assets/effects/.../move_VFX` (0002–0259) son esos archivos. Indicio: según [pmd-eos-battle-visuals](https://github.com/vinzmyko/pmd-eos-battle-visuals), Shadow Sneak usa el archivo 184, con 16 secuencias, y la carpeta 0184 tiene 16 animaciones. **No son ID de animación de efecto.**

Lo que une las tres numeraciones son dos tablas del binario del juego. Su estructura está en [skytemple-files](https://github.com/SkyTemple/skytemple-files) (`data/anim`, que SkyTemple extrae a `BALANCE/anim.bin`) y en pmd-eos-battle-visuals:

- **tabla de animaciones de movimientos**: para cada `move_id`, hasta 4 ID de animación de efecto (capas carga, secundario, principal, proyectil), dirección, velocidad del proyectil y punto de anclaje;
- **`EFFECT_ANIMATION_INFO`**: para cada ID de animación de efecto, su tipo (WAN, WAN File 0/1, pantalla…), el `file_index` de `effect.bin` y la secuencia (`animation_index`; si el archivo tiene un múltiplo de 8 secuencias, + dirección), el sonido, el punto de anclaje y si se repite.

**No hay volcado público de esas tablas**: hay que leerlas de una ROM. [pmd-scraper](https://github.com/vinzmyko/pmd-scraper) (Rust, sin licencia publicada) lo hace. Genera:
- `asset_index.json`: movimientos → efectos por capa, y para cada efecto su hoja, tamaño de fotograma, duración de cada fotograma, direcciones y bucle;
- las hojas en `EFFECT/`.

Limitación: no guarda dónde queda el origen del efecto dentro de su lienzo, y el propio autor anota que `thunder_shock` le sale descolocado. Por eso el anclaje de los efectos verticales hay que revisarlo en el visor.

### Impactrueno (Thunder Shock) **[VERIFICADO con la ROM]**

Datos extraídos con pmd-scraper de la ROM de Exploradores del Cielo (USA), en `DATA/animation_data/move_animation_info.json` y `effect_animation_info.json`:

- `move_id` = **188**, también en pmdsky-debug: `MOVE_THUNDERSHOCK = 188`.
- Capas:

  | Capa | Efecto | Qué es | Detalle |
  |---|---|---|---|
  | carga | 22 | brillo sobre quien ataca | WAN File 0, animación 1, 7 fotogramas de 1–2 ticks |
  | principal | **236** | el rayo | `effect.bin` archivo **119**, animación **2**; 17 fotogramas de 2 ticks (el 13.º de 1 y el último de 4); anclaje 3 (centro); sonido 1541 |

  No tiene capas secundaria ni proyectil.
- **Impactrueno y Rayo (129) usan la misma animación (236).** Trueno (64) usa la 113, que es el mismo archivo **119** pero la animación **0**: 12 fotogramas, un rayo más fino sin descarga final. Coincide con la wiki de SkyTemple, que llama «Thunderbolt» al 236 y «Thunder» al 113.
- Comprobación con tus recursos: `move_VFX/0119` tiene 3 animaciones, `000` con 12 fotogramas (Trueno) y `002` con 17 (Impactrueno y Rayo). La asignación a ojo usaba la `000`: **era la de Trueno**.
- Animación del rayo: cae desde arriba en zigzag sobre el objetivo y termina en una descarga eléctrica. El centro del lienzo (72×272) es el objetivo.
- Después, como en todo golpe con daño, el juego reproduce la reacción al golpe según la eficacia (efectos 8–11).
- La tabla también trae animaciones del atacante propias de cada especie (`special_animations`; Pikachu usa la animación 4). **Sin implementar.**

### Correspondencia de nuestros movimientos (de la ROM)

Columnas: carga / secundaria / principal / proyectil. Cada efecto aparece como su ID de animación de efecto → `archivo de effect.bin/animación` (las carpetas de `move_VFX`). Los «WAN File 0» y «pantalla» no están en `move_VFX`; los de WAN File 0 se importan desde la extracción.

| Movimiento | move_id (nombre en la ROM) | Carga | Secundaria | Principal | Proyectil |
|---|---|---|---|---|---|
| regularAttack | 355 (regular attack) | — | — | — | — |
| tackle | 154 (Tackle) | — | — | — | — |
| pound | 250 (Pound) | — | — | — | — |
| quickAttack | 190 (Quick Attack) | 22 (WAN File 0) | — | — | — |
| scratch | 260 (Scratch) | — | — | 138 → 0054/000 | — |
| furyCutter | 346 (Fury Cutter) | 22 (WAN File 0) | — | 32 → 0099/000 | — |
| bite | 63 (Bite) | 22 (WAN File 0) | 96 → 0122/008 | — | — |
| ember | 262 (Ember) | — | 144 (WAN File 0) | 317 → 0053/003 | 137 → 0053/000 |
| waterGun | 308 (Water Gun) | — | 21 (WAN File 0) | 334 (WAN File 0) | 333 → 0013/048 |
| vineWhip | 182 (Vine Whip) | — | 194 → 0131/000 | 675 → 0131/001 | — |
| razorLeaf | 251 (Razor Leaf) | 296 → 0108/009 | — | — | 288 → 0108/004 |
| thunderShock | 188 (ThunderShock) | 22 (WAN File 0) | — | 236 → 0119/002 | — |
| poisonSting | 200 (Poison Sting) | — | 21 (WAN File 0) | — | 217 → 0136/016 |
| peck | 174 (Peck) | — | — | — | — |
| gust | 57 (Gust) | 22 (WAN File 0) | — | 83 → 0258/000 | — |
| absorb | 135 (Absorb) | 22 (WAN File 0) | 128 → 0023/000 | — | — |
| growl | 217 (Growl) | 22 (WAN File 0) | 274 → 0121/000 | — | — |
| tailWhip | 122 (Tail Whip) | — | — | — | — |
| leer | 224 (Leer) | — | 287 → 0113/001 | — | — |
| sandAttack | 142 (Sand-Attack) | — | — | — | 215 → 0114/000 |
| mudSlap | 213 (Mud-Slap) | — | 21 (WAN File 0) | — | 182 → 0022/002 |
| stringShot | 23 (String Shot) | — | 44 → 0134/000 | 46 → 0134/002 | 45 → 0134/001 |
| harden | 58 (Harden) | — | 84 → 0020/002 | — | — |
| sing | 34 (Sing) | — | 60 → 0007/001 | — | 61 → 0007/002 |
| confusion | 234 (Confusion) | 222 (pantalla) | 22 (WAN File 0) | — | — |
| smokescreen | 37 (SmokeScreen) | 22 (WAN File 0) | — | — | 65 → 0056/000 |
| barrage | 168 (Barrage) | — | — | — | 189 → 0117/000 |
| hypnosis | 111 (Hypnosis) | 222 (pantalla) | 21 (WAN File 0) | — | 225 → 0081/000 |
| growth | 148 (Growth) | — | 47 (WAN File 0) | — | — |

- Sin capas (ataque normal, Placaje, Destructor, Picotazo y Látigo): en el juego solo se ve la reacción al golpe.
- Reacciones al golpe, todas WAN File 0:
  - 8 (0,5×): animación 3;
  - 9 (poco eficaz): animación 15;
  - 10 (neutro): animación 16;
  - 11 (muy eficaz): animación 4.
- **Pendiente:** los efectos de pantalla (222, de Confusión e Hipnosis) no se importan.

### Reproducción (`render/fxPlayer.ts`)

La mazmorra y el visor usan el mismo reproductor:
- **Carga:** sobre el usuario, antes de atacar.
- **Proyectil:** vuela en la dirección del ataque, 1 casilla en los de contacto y 4 en los de línea.
- **Secundaria y principal:** sobre cada objetivo alcanzado, una vez, al llegar su daño, estado o cambio de característica. Según pmd-eos-battle-visuals (`attachment_point_pipeline.md`), las dos capas van sobre el objetivo.
- **Reacción al golpe:** en cada golpe con daño, según la eficacia (efectos 8–11, ver `damage_visual_pipeline.md`).
- **Retorno:** la partícula vuelve del objetivo al usuario.

Detalles:
- Los efectos de 8 variantes van en la dirección del ataque. El orden S, SE, E, NE, N, NW, W, SW se ha comprobado con el picotazo y la gota.
- Los marcados `anchor: 'bottom'` caen desde arriba.
- Con datos de la ROM, cada fotograma dura lo que dice el juego (`durations`); los de `move_VFX` van a 30 fotogramas/s **[INCIERTO]**.
- El daño por estado o por hambre no lleva efecto. La Semilla Explosiva usa la explosión (0253) y las trampas, el golpe.

### Procedimiento con la ROM (reproducible)

1. Volcar el juego de un cartucho propio. Pokerift no incluye ni descarga ROMs.
2. Compilar pmd-scraper y ejecutarlo sobre la ROM (`cargo run --release -- juego.nds -o salida`). No tiene licencia publicada: se usa aparte, sin copiar su código al proyecto.
3. `node tools/import-pmd-scraper.mjs salida`. Importa solo los efectos de los movimientos del registro, por su `move_id`, y genera `public/assets/effects/eos/<ID>.png` (una fila por dirección) y `src/client/assets/move-fx.rom.generated.ts`. Informa de qué efectos usa cada movimiento y por capa.
4. Revisar en el visor (`fx-viewer.html`), sobre todo el anclaje de los efectos verticales, y ejecutar `npm run fx-check`.

Lo que viene de la ROM es material del juego: solo para uso personal, como el resto de `Assets`.

### Comprobar los efectos

- `fx-viewer.html` (en desarrollo: http://localhost:5173/fx-viewer.html, o `?move=thunderShock&dir=2`) reproduce cada movimiento entre un atacante y un objetivo, en la dirección elegida, con su origen y su nota. También reproduce cualquier efecto suelto del catálogo.
- `node tools/fx-gallery.mjs` genera `smoke-output/efectos/index.html`, con las 258 carpetas de `move_VFX` animadas y numeradas, para buscar candidatos.
- `npm run fx-check` lo comprueba en Chrome: efectos en combate, cada movimiento del registro en el visor, iconos de estado, objetos y trampas.

### Iconos de estado

Según la tabla de iconos del juego documentada en pmd-eos-battle-visuals (`status_icon_system.md`) **[VERIFICADO]**:
- sueño: «Z»; quemadura: llama roja; veneno: calavera blanca; confusión: pajaritos amarillos;
- **característica bajada**: flechas hacia abajo;
- **la parálisis no tiene icono**.

Los recortes salen de `status effects.png`. Si hay varios, se van alternando cada 1,2 s, como en el original, que va recorriendo los iconos activos. El ritmo exacto y la prioridad son **[INCIERTO]**. Funciona igual en jugadores, enemigos y cooperativo.

### Objetos y trampas

- **Objetos**: iconos originales de `items DS.png` en el suelo y en la mochila.
  - La Manzana Grande usa el de la Manzana.
  - La Semilla Cura y la Semilla Explosiva vienen de `items gba.png`, porque la hoja de DS solo trae semillas doradas. **[INCIERTO]** Su color y la baya de Safre.
- **Trampas**: Teletransporte, Castaña, Giro y Hoyo usan su casilla original. Sueño, Veneno, Barro e Invocación siguen con placeholder.

## Zonas exteriores (Exploradores del Cielo) y flujo del cooperativo

- **Recorrido**: se empieza dentro de casa (la cueva del Risco Sharpedo) y se sale por la escalera a lo alto del acantilado. Desde allí, el camino del este lleva a la Aldea Tesoro y, por su extremo este, a la Encrucijada. De la Encrucijada salen el gremio (norte), la playa (sur) y las mazmorras (este). Al volver de una expedición se aparece en la Encrucijada.
  - **[VERIFICADO]** Según [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Treasure_Town): el Risco Sharpedo queda al oeste de la Aldea Tesoro, la Encrucijada al este, y sus carteles señalan el gremio al norte, la playa al sur y las mazmorras al este.
  - Nombres en español según [WikiDex](https://www.wikidex.net/wiki/Aldea_Tesoro): **Aldea Tesoro** y **Risco Sharpedo**. «Encrucijada», «Gremio de Wigglytuff», «Playa» y «Cueva de la Playa» son **[INCIERTO]**.
  - **[INCIERTO]** Por qué lado de la playa se entra desde la Encrucijada.
- **Mapas**: son los originales ripeados (`Assets/Lobby/DS`), a su tamaño real, compuestos por `tools/build-town.mjs`:
  - El agua va animada con los fotogramas de las hojas: el mar del Risco Sharpedo (fuera y dentro de casa), el manantial de casa, el río de la aldea y el mar y la orilla de la playa. Cada fotograma se ha colocado ajustándolo píxel a píxel a los huecos del mapa. **[INCIERTO]** El ritmo: 100–133 ms por fotograma, elegido a ojo.
  - Falta animar el molino de la Encrucijada: la hoja trae sus 4 fotogramas, pero el mapa ya lo tiene pintado sin el suelo de debajo y saldrían aspas dobles.
  - Las esquinas inferiores del gremio estaban vacías en la hoja. Se han rellenado reflejando la pared del acantilado contigua: no es gráfico original.
- **Cámara**: zoom entero para ver unos 192 px de alto de mapa, como la pantalla de la DS (256×192), y nunca más vista que mapa. Va fija al jugador. Si así se vieran las esquinas sin mapa del ripeo, se desplaza lo mínimo para esquivarlas, manteniendo al jugador a ≥ 40 px del borde. La DS, con su vista de 4:3, no llega a enseñarlas.
- **Colisión**: rejilla de 8 px. Con la ROM importada es la **colisión original** de cada mapa (la capa de colisión de la BMA) **[VERIFICADO]**. Sin ROM, se deduce de la paleta del suelo de cada mapa (hierba, camino, arena), que deja fuera edificios, rocas, árboles y vallas, con correcciones a mano: puente, alfombras de las tiendas, escaleras, el agujero de entrada a casa, etc. Las franjas del borde norte y sur de la aldea y la parte baja de las escaleras quedan cerradas para que la cámara no tenga que enseñar las esquinas vacías. Ver con `node tools/build-town.mjs --preview carpeta`.
- **Salidas**: no se marcan en el mapa, como en el original. Al pisar una salida a otra zona se pasa a ella con un fundido. Las salidas aún sin destino (puerta del gremio, Cueva de la Playa) avisan con "próximamente".
- **Cooperativo**: la sala online pasa por tres fases: **lobby** (elegir Pokémon; aún se puede unir gente), **zonas exteriores** y **expedición**.
  - Al salir del lobby, el grupo aparece junto dentro de casa.
  - En las zonas exteriores cada jugador va por su cuenta y **puede estar en una zona distinta**. Solo se dibujan los compañeros de la misma zona, y el panel del grupo dice dónde está cada uno.
  - Cada cliente mueve a su Pokémon sin turnos (predicción local) y envía su posición. El servidor la valida con la rejilla de colisión de la zona de ese jugador: el trayecto desde la última posición no puede atravesar obstáculos ni superar 40 px por mensaje. Después la difunde, y si no es válida devuelve una corrección.
  - Para cambiar de zona hay que estar en la salida (`changeZone`); lo valida el servidor.
  - Entrar en una mazmorra exige estar en una salida activa. Cualquier jugador puede hacerlo y va todo el grupo, esté donde esté, igual que con las escaleras.

## Limitaciones conocidas

- Sprites y retratos de SpriteCollab para las 15 especies del juego. Efectos de movimientos, estados, objetos y 4 trampas con recursos originales (ver "Efectos de movimientos, estados y objetos"); las trampas de Sueño, Veneno, Barro e Invocación siguen con placeholder.
- Faltan por implementar: velocidad, tirar objetos, objetos equipables, tiendas Kecleon, salas de monstruos, agua y lava, clima y la mayoría de habilidades.
- Los mapas exteriores son una sola imagen: los Pokémon siempre se dibujan por delante de árboles y tejados. Para que pasen por detrás hay que separar capas; la hoja `Assets/Lobby/DS/Treasure town tiles.png` trae los edificios de la aldea sueltos y puede servir.
- Interiores (gremio, dojo de Marowak) sin hacer: hay mapas en `Assets/Lobby/DS/Guild` y `Marowak's dojo.png`.
- La intro y el menú no tienen música ni efectos de sonido (no hay recursos de audio).
- Hay pocos movimientos (29, contando el ataque normal) y especies (15). El catálogo crece añadiendo datos.
- No hay cuentas ni emparejamiento público. Las salas viven en memoria: si el servidor se reinicia, se pierden.
- El servidor envía el estado completo en cada turno (unos 10–20 KB). Es suficiente para 2–4 jugadores.
