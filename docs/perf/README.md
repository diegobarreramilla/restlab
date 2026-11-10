# Rendimiento de RestLab — método de medición

Estado: 2026-11-09. Este documento describe **la máquina y el método** para medir el rendimiento de la
app. Los números medidos se añaden en la sección [Resultados](#resultados) a medida que se ejecutan los
bancos (roadmap 4.1, tareas T2, T3, T4 y T5).

La regla es sencilla: dos mediciones solo se comparan si se hicieron en la misma máquina, con el mismo
Node, el mismo build y el mismo método. Cualquier cambio en esas condiciones se anota aquí.

## 1. Máquina de medición

| Campo | Valor |
|---|---|
| CPU | Intel Core i5-12450H — 8 núcleos (4P + 4E), 12 hilos, hasta 4.4 GHz |
| RAM | 31 GiB (32 GB); swap de 31 GiB |
| GPU | Intel UHD Graphics (Alder Lake-P) + NVIDIA GeForce RTX 3050 Mobile |
| Sistema operativo | CachyOS (Arch Linux, rolling release) |
| Kernel | 7.3.1-1-cachyos, `x86_64` |
| Sesión gráfica | Wayland, KDE Plasma (`XDG_SESSION_TYPE=wayland`) |
| Gobernador de CPU | `powersave` |
| Node | v26.13.0 (el repo fija v24.22.1 en `.nvmrc`) |
| npm | 12.2.1 |
| Electron | 43.8.4 |
| Playwright | 1.62.1 |
| Versión de RestLab | 2.0.0 |

### Cómo se obtuvieron estos datos

```bash
lscpu
free -h
uname -a
cat /etc/os-release
node -v && npm -v
npx playwright --version
npx electron --version
echo "$XDG_SESSION_TYPE $XDG_CURRENT_DESKTOP"
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
```

### Notas de reproducibilidad

- **Node:** el repo pide v24.22.1 en `.nvmrc`, pero esta máquina tiene v26.13.0 activa. Antes de una
  tanda de mediciones hay que decidir una versión y no cambiarla a mitad. Si se usa `nvm`, ejecutar
  `nvm use` y anotar la versión real en la tabla de resultados. Una tanda hecha con Node 26 no se
  compara con otra hecha con Node 24.
- **Gobernador:** `powersave` puede infravalorar picos y añadir varianza. Para una comparación más
  estable se puede usar `performance` (`sudo cpupower frequency-set -g performance`) y anotarlo; si no,
  todas las tandas deben quedarse en `powersave`.
- **Wayland:** Electron puede abrir la ventana sin foco o no responder a los clics. En esa sesión,
  ejecutar los bancos con `PLAYWRIGHT_ELECTRON_ARGS="--ozone-platform=x11"`.
- **GPU:** Playwright lanza Electron con `--disable-gpu`, así que el renderizado es por software. Es
  intencionado: elimina la variabilidad entre máquinas con GPU distinta.

## 2. Qué se mide hoy

| Banco | Archivo | Qué hace | Iteraciones |
|---|---|---|---|
| Montaje de colecciones | `tests/benchmarks/mounting/collection-mount.bench.ts` | Abre colecciones de 50, 200, 500, 1000 y 3000 peticiones, en formato `bru` y `yml` | 3 por tamaño y formato |
| Memoria del runner | `tests/benchmarks/runner/runner-allocation.bench.ts` | Copia la colección `bruno-testbench`, la ejecuta y muestrea el heap del renderer y del proceso principal | 3 ejecuciones × 1 iteración |
| Arranque en frío | `tests/benchmarks/startup/cold-start.bench.ts` | Desde el lanzamiento hasta que la primera colección es visible (T3) | 1 calentamiento + 5 medidas |
| Respuesta JSON grande | `tests/benchmarks/response/large-json.bench.ts` | Pinta una respuesta JSON de 5 MB y 10 MB y mide el bloqueo del hilo principal (T4) | 1 calentamiento + 3 medidas por tamaño |

`npm run test:benchmark` ejecuta montaje, runner, arranque en frío y respuesta JSON grande.

### Qué mide cada número

- **Montaje:** tiempo de pared desde que se pulsa *Open collection* hasta que la colección termina de
  cargarse y se abre en la barra lateral. Incluye la lectura del sistema de archivos, la
  transformación y el primer render del árbol. Se guardan los tres tiempos crudos y se resumen con
  media, mediana, p90 y desviación estándar.
- **Runner:** memoria del renderer (pico de `heapUsed` y heap retenido tras la ejecución) y del proceso
  principal (pico de RSS y de memoria externa). Se expresa en bytes; la app la formatea en MiB.
- **Arranque en frío (T3):** tiempo hasta que la primera colección está visible, con la app recién
  lanzada.
- **Respuesta grande (T4):** tiempo hasta que la respuesta se pinta y duración máxima de las tareas
  largas (`longtask`) del hilo principal.

## 3. Cómo se ejecuta

### 3.1 Preparación

Desde la raíz del repo:

```bash
npm ci
```

El fixture de Playwright lanza Electron **sin empaquetar**, así que `electron-is-dev` es `true` y la
app carga `http://localhost:3000`, el servidor de desarrollo que arranca el propio config. Por eso
`npm run test:benchmark` funciona sin compilar antes.

`npm run build:electron:benchmark` sigue siendo útil para generar el build de producción con
`BRUNO_BENCHMARK=true` (define `__BRUNO_BENCHMARK__` en el renderer y copia la interfaz a
`packages/bruno-electron/web`). No es necesario para los bancos actuales, que miden con Playwright y
CDP, pero sí para probar el build empaquetado o para que el renderer emita sus eventos de benchmark.

Para activar los `checkpoint` del proceso principal en tiempo de ejecución hay que exportar
`BRUNO_BENCHMARK=true` antes de lanzar las pruebas:

```bash
BRUNO_BENCHMARK=true npm run test:benchmark
```

Ese flag no cambia lo que miden los bancos actuales; solo añade los eventos del proceso principal al
WAL. Si además se quieren los eventos del renderer, el servidor de desarrollo tiene que arrancar con el
mismo flag (`BRUNO_BENCHMARK=true npm run dev:web` antes de lanzar Playwright, para que se reutilice).

### 3.2 Todos los bancos

```bash
npm run test:benchmark
```

El comando usa `playwright.benchmark.config.ts`:

- `workers: 1` y `fullyParallel: false`: los bancos corren de uno en uno.
- Levanta automáticamente `npm run dev:web` (puerto 3000) y el servidor de pruebas
  (`npm start --workspace=packages/bruno-tests`, puerto 8081). Fuera de CI reutiliza los servidores si
  ya están corriendo.
- El propio banco lanza Electron desde `packages/bruno-electron` con Playwright (no un navegador) y
  carga la interfaz desde el servidor de desarrollo.
- `build.external` excluye de la transpilación los bundles ya construidos de `packages/*/dist`. Sin
  esa exclusión, Playwright aplica los `paths` del `tsconfig.json` de cada paquete al resolver
  imports en tiempo de ejecución y `@usebruno/common` acaba apuntando a un `.d.ts` vacío
  (`Cannot destructure property 'toBool' of 'r.utils'`). Los paquetes del workspace son symlinks a
  `packages/`, así que sus rutas reales quedan fuera de `node_modules` y Playwright los trataría como
  código propio.
- Timeout por prueba: 10 minutos. El montaje de 3000 peticiones amplía su propio timeout según el
  tamaño.

### 3.3 Un banco o un tamaño concreto

Playwright filtra por título con `-g`/`--grep`:

```bash
# Solo el banco de montaje
npm run test:benchmark -- -g "Benchmark: Collection Mount"

# Un tamaño y formato concretos
npm run test:benchmark -- -g "mount bru collection with 500 requests"

# Solo el banco del runner
npm run test:benchmark -- -g "Benchmark: Runner allocation"

# Solo el banco de respuesta JSON grande
npm run test:benchmark -- -g "Benchmark: Large JSON Response"
```

Los títulos salen de los `test.describe`/`test` de cada archivo. Para ver la lista sin ejecutar:

```bash
npm run test:benchmark -- --list
```

### 3.4 En Wayland

```bash
PLAYWRIGHT_ELECTRON_ARGS="--ozone-platform=x11" npm run test:benchmark
```

### 3.5 Salidas

| Archivo | Contenido |
|---|---|
| `tests/benchmarks/results/mounting.json` | Resumen y tiempos crudos del montaje, por formato y tamaño |
| `tests/benchmarks/results/runner-allocation.json` | Picos y heap retenido del runner |
| `tests/benchmarks/results/startup.json` | Arranque en frío: 5 tiempos crudos y su resumen |
| `tests/benchmarks/results/large-json.json` | Respuesta JSON grande: tiempos hasta pintar y tareas largas máximas de 5 MB y 10 MB |
| `benchmark-report/results.json` | Reporte JSON de Playwright con todas las pruebas y anotaciones |
| `[benchmark] WAL path: …` en la salida | Ruta del WAL con los `checkpoint` del proceso principal |

El WAL se escribe en `BRUNO_BENCHMARK_LOG_DIR` si está definida; si no, en
`<userData>/benchmark/checkpoints-<sessionId>.wal`. La ruta exacta se imprime al arrancar Electron.

### 3.6 Colecciones de prueba

El banco de montaje genera las colecciones con `tests/benchmarks/utils/collection-generator.ts`:

- `requestCount` peticiones, agrupadas de 10 en 10 en carpetas.
- Formato `bru` (`bruno.json`, `collection.bru`, `folder.bru`) o `yml` (`opencollection.yml`,
  `folder.yml`).
- Nombres y contenido deterministas (`request-<n>`, `folder-<n>`), para que dos ejecuciones midan lo
  mismo.
- Cada prueba crea un directorio temporal y lo borra al terminar.

El banco del runner copia `packages/bruno-tests/collection` (la colección `bruno-testbench`) a un
directorio temporal, sin `node_modules`, y la ejecuta con el entorno `Local`.

El banco de respuesta JSON grande usa el servidor de pruebas (`packages/bruno-tests`) y apunta a
`http://localhost:8081/api/large-payload?size=<bytes>&type=json`. El endpoint devuelve un arreglo JSON
de objetos pequeños cuyo tamaño serializado es exactamente el pedido; sin `type=json` sigue
respondiendo `text/plain`, como antes. La prueba del endpoint está en
`tests/response/large-payload-json.spec.ts`.

## 4. Higiene de la medición

Antes de una tanda:

1. Cerrar aplicaciones pesadas (navegadores con muchas pestañas, otras instancias de Electron, Docker).
2. Dejar el portátil enchufado y evitar el modo de ahorro de energía agresivo.
3. Anotar si el gobernador es `powersave` o `performance`.
4. Parar cualquier `npm run dev:web` o servidor en el puerto 8081 si se quiere un arranque limpio;
   Playwright los reutiliza si ya están corriendo.
5. No mezclar bancos. Un banco a la vez. Si el montaje de 3000 se lanza en segundo plano, sus números
   no son comparables con los de otro banco ejecutado al mismo tiempo; anotarlo.
6. No comparar tandas hechas con distinto Node, distinto build o distinta versión de Electron.
7. Mirar los tres tiempos crudos, no solo la media. La primera iteración puede incluir caché de
   archivos fría; la mediana y el p90 son más estables que la media.

## 5. Valores de referencia (no medidos aquí)

`tests/benchmarks/mounting/baseline.{ubuntu,macos,windows}.json` contiene los valores del proyecto de
origen. **No son una meta ni una medición de esta máquina**: sirven para detectar si el orden de
magnitud o la forma de la curva se parecen.

Referencia de Ubuntu (mediana, ms):

| Peticiones | `bru` | `yml` |
|---:|---:|---:|
| 50 | 700 | 560 |
| 200 | 1150 | 1200 |
| 500 | 2900 | 3400 |
| 1000 | 8000 | 10650 |
| 3000 | 170000 | 80000 |

Crecimiento de la referencia:

- `bru`: 500 → 1000 es ×2.8; 1000 → 3000 es ×21.
- `yml`: 500 → 1000 es ×3.1; 1000 → 3000 es ×7.5.

La hipótesis que hay que confirmar o descartar aquí es que el montaje deja de escalar linealmente en
algún punto entre 1000 y 3000 peticiones. T2 rellena la tabla de esta máquina y calcula las mismas
relaciones.

## 6. Resultados

> T2, T3 y T4 están medidos. T5 sigue pendiente. No borrar la tabla de referencia: sirve para comparar.

### 6.1 Montaje de colecciones (T2)

Medido el 2026-11-09 con Node v26.13.0, Electron 43.8.4, gobernador `powersave`, ventana de
1280×800, `PLAYWRIGHT_ELECTRON_ARGS="--ozone-platform=x11"` y 3 iteraciones por tamaño y formato.
Las colecciones de 50, 200, 500 y 1000 se midieron en una tanda; las de 3000, en otra tanda aparte.
La tabla usa la **mediana** de las tres iteraciones; los tiempos crudos están en
`tests/benchmarks/results/mounting.json` (ignorado por git).

| Peticiones | `bru` mediana (ms) | `yml` mediana (ms) | `bru` vs. referencia | `yml` vs. referencia |
|---:|---:|---:|---:|---:|
| 50 | 655 | 554 | ×0.94 | ×0.99 |
| 200 | 1015 | 887 | ×0.88 | ×0.74 |
| 500 | 1984 | 2260 | ×0.68 | ×0.66 |
| 1000 | 4566 | 5916 | ×0.57 | ×0.56 |
| 3000 | 98307 | 52445 | ×0.58 | ×0.66 |

Crecimiento medido:

- `bru`: 500 → 1000 es **×2.30**; 1000 → 3000 es **×21.5**.
- `yml`: 500 → 1000 es **×2.62**; 1000 → 3000 es **×8.9**.

La hipótesis de la referencia **se confirma**: entre 1000 y 3000 peticiones (×3 de trabajo) el
montaje tarda ×21.5 en `bru` y ×8.9 en `yml`. No es un problema de esta máquina ni del formato: los
dos formatos se disparan, `bru` más que `yml`. Los dos peores casos medidos son, por tanto,
**`bru` con 3000 peticiones (98,3 s de mediana, 104,3 s de media)** y **`yml` con 3000 peticiones
(52,4 s de mediana, 55,7 s de media)**. La varianza también crece: la desviación estándar es de
11,8 s en `bru-3000` y 8,6 s en `yml-3000`, frente a 81 ms y 129 ms en los casos de 1000.

Los tiempos crudos de 3000 muestran que la primera iteración es la más lenta (`bru`: 120,7 s, 98,3 s,
93,9 s; `yml`: 67,5 s, 47,2 s, 52,4 s). Aun así, incluso la mejor iteración de `bru` (93,9 s) está
muy por encima de lo que sugeriría un crecimiento lineal desde 1000 (≈13,7 s si se mantuviera ×3).
Eso descarta que el salto sea solo caché fría.

La comparación con la referencia no debe leerse como «vamos más rápido»: son máquinas distintas. Lo
que importa es la **forma de la curva**, y la forma coincide.

#### Cómo se ejecutó

```bash
# 50, 200, 500 y 1000
PLAYWRIGHT_ELECTRON_ARGS="--ozone-platform=x11" \
  npm run test:benchmark -- -g "mount (bru|yml) collection with (50|200|500|1000) requests"

# 3000, en una tanda aparte
PLAYWRIGHT_ELECTRON_ARGS="--ozone-platform=x11" \
  npm run test:benchmark -- -g "mount (bru|yml) collection with 3000 requests"
```

La tanda de 3000 tarda unos 9 minutos. Para que no falle por el bloqueo del hilo principal, el banco
fija la ventana en 1280×800 y usa un timeout de 10 minutos al abrir y cerrar la colección
(`tests/benchmarks/utils/window.ts` y `LARGE_COLLECTION_TIMEOUT` en el banco).

### 6.2 Memoria del runner (T5)

| Escenario | Renderer pico | Renderer retenido | Main RSS pico | Main externo pico |
|---|---:|---:|---:|---:|
| Colección vacía | — | — | — | — |
| `bruno-testbench` | — | — | — | — |
| `bruno-testbench` tras 5 min en reposo | — | — | — | — |

### 6.3 Arranque en frío (T3)

Medido el 2026-11-09 con Node v26.13.0, Electron 43.8.4, gobernador `powersave` y
`PLAYWRIGHT_ELECTRON_ARGS="--ozone-platform=x11"`. La colección es `cold-start`, generada con 10
peticiones en formato `bru`.

| Métrica | Valor |
|---|---:|
| Mediana de 5 arranques | **4025 ms** |
| Media | 4012 ms |
| p90 | 4143 ms |
| Desviación estándar | 124 ms |
| Tiempos crudos (ms) | 4188, 4025, 4076, 3814, 3958 |

Método:

1. Se crea un perfil de usuario temporal con `lastOpenedCollections` apuntando a la colección.
2. El primer lanzamiento es de **calentamiento**: migra `lastOpenedCollections` al workspace por
   defecto y deja la caché de disco caliente. No se mide.
3. Se hacen 5 lanzamientos medidos con el mismo perfil, cerrando la app entre cada uno.
4. El cronómetro empieza justo antes de `launchElectronApp` (spawn de Electron y conexión de
   Playwright) y termina cuando `#sidebar-collection-name` de la colección es visible.
5. Los tiempos se escriben en `tests/benchmarks/results/startup.json` (ignorado por git).

Es un arranque en frío de **proceso** con disco caliente: no se vacía la caché del sistema operativo.
No mezclar estos números con una tanda que vacíe cachés.

```bash
PLAYWRIGHT_ELECTRON_ARGS="--ozone-platform=x11" \
  npm run test:benchmark -- -g "cold start"
```

### 6.4 Respuesta JSON grande (T4)

Medido el 2026-11-09 con Node v26.13.0, Electron 43.8.4, gobernador `powersave`, ventana de 1280×800 y
`PLAYWRIGHT_ELECTRON_ARGS="--ozone-platform=x11"`. Cada tamaño usa una colección propia con una
petición al endpoint local; se hace **1 envío de calentamiento** y **3 envíos medidos**, limpiando la
respuesta entre cada uno.

| Caso | Métrica | Mediana | Media | p90 | Tiempos crudos (ms) |
|---|---|---:|---:|---:|---|
| Respuesta JSON de 5 MB | tiempo hasta pintar | **1036 ms** | 1045 ms | 1066 ms | 1027, 1074, 1036 |
| Respuesta JSON de 5 MB | tarea larga máxima | **631 ms** | 611 ms | 675 ms | 686, 631, 516 |
| Respuesta JSON de 10 MB | tiempo hasta pintar | **1984 ms** | 1935 ms | 2185 ms | 1587, 1984, 2235 |
| Respuesta JSON de 10 MB | tarea larga máxima | **1172 ms** | 1173 ms | 1243 ms | 1087, 1261, 1172 |

Método:

1. El banco crea una colección con una petición a
   `http://localhost:8081/api/large-payload?size=<bytes>&type=json`, con 5 MB y 10 MB exactos.
2. Antes de cada envío se limpia la respuesta para que el editor de respuesta se monte de nuevo.
3. El cronómetro se toma en el renderer, en el `click` real del botón *Send*, no en Playwright.
4. **Tiempo hasta pintar:** desde ese `click` hasta que el editor de la respuesta
   (`[data-testid="response-preview-container"] .CodeMirror`) es visible y pasan dos
   `requestAnimationFrame` (el segundo ya corre después del primer pintado).
5. **Tarea larga máxima:** un `PerformanceObserver` de tipo `longtask` registra las tareas del hilo
   principal desde el `click`; se guarda la duración máxima de cada envío.
6. Los tiempos se escriben en `tests/benchmarks/results/large-json.json` (ignorado por git).

El envío de 10 MB se queda justo por debajo del umbral del aviso de respuesta grande
(`responseSize > 10 * 1024 * 1024`), así que la app formatea y pinta el JSON. El coste del servidor
local al construir la respuesta está incluido en el tiempo hasta pintar.

```bash
PLAYWRIGHT_ELECTRON_ARGS="--ozone-platform=x11" \
  npm run test:benchmark -- -g "Benchmark: Large JSON Response"
```

Prueba del endpoint (tamaño exacto, JSON válido y `text/plain` por defecto):

```bash
PLAYWRIGHT_ELECTRON_ARGS="--ozone-platform=x11" \
  npx playwright test tests/response/large-payload-json.spec.ts --project=default
```
