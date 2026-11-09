# Rendimiento de RestLab — método de medición

Estado: 2026-11-09. Este documento describe **la máquina y el método** para medir el rendimiento de la
app. Los números medidos se añaden en la sección [Resultados](#resultados) a medida que se ejecutan los
bancos (roadmap 4.1, tareas T2 y T5).

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
| Arranque en frío | `tests/benchmarks/startup/cold-start.bench.ts` | Desde el lanzamiento hasta que la primera colección es visible (T3) | 5 (previsto) |
| Respuesta JSON grande | `tests/benchmarks/response/large-json.bench.ts` | Pinta una respuesta JSON de 5 MB y 10 MB y mide el bloqueo del hilo principal (T4) | Por definir en T4 |

Los dos últimos bancos todavía no existen; se añaden en las tareas T3 y T4 del plan del día. Hasta
entonces, `npm run test:benchmark` ejecuta solo montaje y runner.

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
| `tests/benchmarks/results/startup.json` | Arranque en frío (cuando exista T3) |
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

> Pendiente de T2 y T5. Cuando se midan, añadir aquí la tabla «medido en esta máquina» junto a la
> referencia, la fecha, la versión de Node y el gobernador usado. No borrar la tabla de referencia:
> sirve para comparar.

### 6.1 Montaje de colecciones (T2)

| Peticiones | `bru` mediana (ms) | `yml` mediana (ms) | `bru` vs. referencia | `yml` vs. referencia |
|---:|---:|---:|---:|---:|
| 50 | — | — | — | — |
| 200 | — | — | — | — |
| 500 | — | — | — | — |
| 1000 | — | — | — | — |
| 3000 | — | — | — | — |

### 6.2 Memoria del runner (T5)

| Escenario | Renderer pico | Renderer retenido | Main RSS pico | Main externo pico |
|---|---:|---:|---:|---:|
| Colección vacía | — | — | — | — |
| `bruno-testbench` | — | — | — | — |
| `bruno-testbench` tras 5 min en reposo | — | — | — | — |

### 6.3 Arranque en frío y respuesta grande (T3/T4)

| Caso | Métrica | Valor |
|---|---|---:|
| Arranque en frío hasta la primera colección | mediana de 5 arranques | — |
| Respuesta JSON de 5 MB | tiempo hasta pintar | — |
| Respuesta JSON de 5 MB | tarea larga máxima | — |
| Respuesta JSON de 10 MB | tiempo hasta pintar | — |
| Respuesta JSON de 10 MB | tarea larga máxima | — |
