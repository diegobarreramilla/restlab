# RestLab — Roadmap completo

Fecha: 2026-11-07 · Rama de trabajo: `restlab/v1-local-first`

Este documento ordena **todo** el trabajo, desde lo ya hecho hasta las ideas de largo plazo (extensiones, IA que diagnostica, sincronización). Cada meta se puede ejecutar leyendo solo su sección.

Documentos relacionados, para no repetir:
- Detalle de lo ejecutado cada día: `docs/sessions/` (una nota por sesión)
- Por qué existe el proyecto y qué se decidió: `docs/superpowers/specs/2026-11-07-restlab-v1-design.md`
- Qué contiene cada hito de la v1: `docs/superpowers/plans/2026-11-07-restlab-v1-plan.md`
- Versión previa y más corta de este roadmap: `docs/superpowers/plans/2026-11-07-restlab-v1-roadmap.md`
- Evidencia de usuarios: `reports/Debilidades de Bruno Postman Insomnia.md`
- Qué conserva el nombre Bruno y qué falta de la marca: `docs/branding.md`
- Qué llamadas de red existen: `docs/privacy/network-inventory.md`

---

## 1. Cómo usar este documento

**Tamaños**, sin fechas: **S** (horas), **M** (un par de días), **L** (una semana o más).

**Evidencia** que respalda cada meta, tomada del informe: **A** demanda directa y repetida · **B** demanda directa pero escasa · **C** hueco inferido, sin petición de usuarios · **P** propuesta del proyecto (tuya o mía).

**Cada meta tiene el mismo formato:** objetivo, por qué, pasos numerados, dónde se toca, cómo se comprueba y "listo cuando". Si un paso dice *Verificar primero*, hay que comprobar el punto antes de escribir código, porque puede que el fork ya lo traiga resuelto.

### Reglas que valen para todas las metas

1. **Un commit por módulo o tarea**, en la rama `restlab/*`, con mensaje que diga qué cambia. **Sin línea `Co-Authored-By`.**
2. **Promesa local-first.** Ninguna llamada de red que el usuario no haya iniciado, salvo opción apagada por defecto. Toda llamada nueva se anota en `docs/privacy/network-inventory.md` en el mismo commit.
3. **Comprobar en la app real.** Pasar las pruebas no basta para lo visual: se abre la app y se mira (`PLAYWRIGHT_ELECTRON_ARGS="--ozone-platform=x11"` en Wayland, ver `.claude/rules/testing.md`).
4. **Prueba de mutación** en cada comportamiento delicado: se rompe a propósito la línea que lo protege, se confirma que la prueba falla y se restaura.
5. **Formato en disco intacto.** Una colección guardada por Bruno debe abrirse y guardarse sin perder campos (`.claude/rules/dsl-changes.md`). Si una meta pide cambiar el formato, se detiene y se decide antes.
6. **Gemelos.** Si un cambio toca la app, revisar su par en la CLI (`.claude/rules/feature-parity.md`) o declarar por qué no.
7. **Orden de comandos útiles:** `npm run lint:fix`, `npm test --workspace=packages/<paquete> -- <archivo>`, `npx playwright test <archivo> --project=default`.
8. **Este documento se mantiene al día.** Al terminar una meta se marca con `✅ (fecha)` en su título y se anota qué se hizo; al hacer algo que no estaba aquí, se agrega como meta nueva con su estado. Se actualiza en el mismo commit o en el siguiente.
9. **No renombrar** paquetes `@usebruno/*`, `.bru`, `bruno.json` ni `bru.*` (ver `docs/branding.md`).

---

## 2. Dónde estamos

| Etapa | Estado |
|---|---|
| **0. Base y marca** (nombre RestLab, logo provisional, `appId`, esquema `restlab://`, copyright, changelog propio, enlaces ajenos fuera) | ✅ Hecho (2026-11-07) |
| **1. Local-first** (sin telemetría, anuncios opt-in, OAuth2 por dirección local, aviso sin conexión, documentación generada sin red) | Hecho en código y pruebas; falta probar con un proveedor OAuth2 real y con la red desconectada de verdad |
| **2. IA opcional** (apagada por defecto, claves propias, Ollama, redacción reversible de secretos, vista previa "What's sent", "Review before sending") | Hecho en código y pruebas; falta verla responder con un proveedor real |
| **3. Rendimiento** | Medido y corregido (4.1 y 4.2); queda opcional el límite con aviso para respuestas de 10 MB o más |
| **4. Fallos del fork y calidad de vida** | Sin empezar |
| **5. Apuestas** (rutas desde OpenAPI, archivos) | Sin empezar, sujetas a validación |
| **6. Interfaz** | Sin empezar |
| **7. Salida de la v1** | Sin empezar |
| **8 en adelante** (extensiones, IA que diagnostica, sincronización, versión de empresa) | Ideas ordenadas abajo |

Fallos conocidos y anteriores a este trabajo: 2 pruebas de `humanizeDate` que dependen de la zona horaria (`bruno-app`) y 3 pruebas de QuickJS con saltos de línea CRLF/CR (`bruno-electron/tests/utils/collection.spec.js`). Están documentados para que no se confundan con regresiones.

---

## 3. Etapa 1 — Cierre de confianza (lo que falta de la v1 local-first)

### 3.1 Verificaciones que necesitan algo externo · S · P

**Por qué:** convierte "pasa las pruebas" en "funciona". Son los únicos puntos de las etapas 1 y 2 que no he podido ver con mis propios ojos.

**Pasos**
1. **OAuth2 con un proveedor real.** Crear una aplicación OAuth2 en cualquier proveedor (GitHub sirve) con la dirección de retorno `http://127.0.0.1:47831/oauth2/callback`. Configurar una petición con Authorization Code, pulsar *Get token*, completar el inicio de sesión en el navegador del sistema. Comprobar que vuelve a la app y que el token aparece.
2. **IA con un proveedor real.** Preferencias, IA: activar, pegar una clave, abrir una petición, usar *Generate* y el chat. Comprobar con "What's sent" que lo mostrado es lo enviado.
3. **IA local.** Instalar Ollama, bajar un modelo pequeño, elegir el preajuste de Ollama (sin clave) y repetir. Confirmar con `ss -tnp` o un monitor de red que el tráfico solo va a `127.0.0.1`.
4. **Red desconectada de verdad.** Apagar el wifi (y, aparte, probar con Docker activo). Comprobar que aparece "Offline mode", que al volver sale "Back online" y que los reintentos ocurren solos.
5. **Documentación generada.** Generar la documentación de una colección, abrirla en el navegador **sin red** y comprobar que se ve completa.

**Listo cuando:** cada punto tiene resultado anotado en `docs/superpowers/plans/2026-11-07-restlab-v1-roadmap.md` (tabla A1). Lo que falle pasa a la lista de la etapa 4.

### 3.2 Pendientes de marca · S · P

Ver tabla "Pendiente" de `docs/branding.md`. Resumen:
1. Cuando exista el repositorio público: dar valor a `ISSUES_URL` y `REPOSITORY_URL` en `packages/bruno-app/src/utils/branding/index.js`. Con eso reaparecen solos el reporte de errores, el botón de código fuente y la sección Soporte.
2. Cuando exista la documentación propia: dar valor a `DOCS_URL` y devolver "Documentation" al menú Ayuda.
3. Decidir qué hacer con los anuncios (`appinfo.usebruno.com`, apagados por defecto): eliminarlos del todo es lo más coherente con la promesa; mantenerlos apuntando a un servicio propio solo si algún día hay algo que anunciar.
4. Reemplazar iconos y logo cuando existan los oficiales (tabla en `docs/branding.md`).
5. Reescribir `readme.md` y `docs/` que aún hablan de Bruno.

---

## 4. Etapa 2 — Rendimiento

### 4.1 Medir antes de corregir · M · A

**Objetivo:** números de línea base y solo dos correcciones.

> **Actualización 2026-11-09:** el repositorio ya trae un banco de pruebas (`tests/benchmarks/`: montaje de colecciones de 50 a 3000 peticiones en `bru` y `yml`, generador de colecciones, banco del runner, valores de referencia por sistema y `npm run test:benchmark`) y un servidor con respuesta grande (`bruno-tests` → `/large-payload?size=N`, solo `text/plain`). Los pasos 2 y 3 se reducen a **reutilizar y añadir** lo que falta: arranque en frío, respuesta JSON de 5 a 10 MB y memoria a los 5 minutos. Los valores de referencia del proyecto de origen muestran un salto fuerte entre 1000 y 3000 peticiones (Ubuntu: `bru` 8 s → 170 s, `yml` 10,7 s → 80 s); hay que confirmarlo midiendo aquí. Plan detallado: `docs/sessions/2026-11-09.md`.
>
> **Medición del 2026-11-09 (T1 a T7 hechos):** la línea base y el diagnóstico están en `docs/perf/README.md`. **Corrección importante:** una primera lectura con el renderer de desarrollo parecía mostrar un salto de montaje entre 1000 y 3000 peticiones (×21,5 en `bru`, ×8,9 en `yml`; 98 s y 52 s a 3000). Repetido con el renderer de **producción** (y con el perfil aislado) el crecimiento es **lineal** (×3,3) y 3000 peticiones se montan en **3,7 s** (`bru`) y **1,95 s** (`yml`): era un artefacto del build de desarrollo y no es un problema para los usuarios. En producción: arranque en frío **2,5 s**; memoria en reposo **691 MiB** sin colección y **712 MiB** con 1000 peticiones, sin crecimiento en 5 minutos; respuesta JSON de 5 MB **0,6 s** con tarea larga de **303 ms** y la de 10 MB **1,1 s** con **533 ms**. **El único problema real que sobrevive es el bloqueo al pintar respuestas grandes**: el perfil lo atribuye a decodificar la respuesta con los polyfills de Node (`Buffer`, ≈220 ms de 850), al lint de JSON sobre todo el documento (`CodeEditor`), al formateo y a CodeMirror (causas con archivo y función en `docs/perf/README.md` §6.6). La corrección (4.2) es la siguiente tarea de rendimiento; para el segundo cupo de 4.1 no hay otro caso de la misma magnitud.

**Pasos**
1. Crear `docs/perf/README.md` con la máquina usada (CPU, RAM, sistema) y el método. ✅ (2026-11-09)
2. Preparar tres escenarios y guardarlos como fixtures en `tests/perf/`:
   - Arranque en frío hasta tener la primera colección visible.
   - Colección de **más de 500 peticiones** (generar con un script, para que sea reproducible).
   - Respuesta JSON de **5 a 10 MB** servida desde un servidor local de prueba.
3. Usar el montaje existente: `playwright.benchmark.config.ts` y `npm run build:electron:benchmark`. Registrar tiempo de arranque, tiempo de abrir la colección, memoria tras 5 minutos y tiempo hasta pintar la respuesta.
4. Perfilar los dos peores en DevTools (pestaña Performance) y anotar la causa en `docs/perf/`.
5. Corregir **solo los dos mayores**. Medir otra vez con el mismo método.

**Dónde mirar primero (hipótesis, a confirmar con el perfil):** el visor de respuesta (CodeMirror con documentos grandes), el árbol de la barra lateral con muchos elementos, y la carga inicial de colecciones en `bruno-electron/src/app/collection-watcher.js`.

**Listo cuando:** `docs/perf/` tiene la tabla antes/después y los dos casos mejoran. Un commit por corrección.

### 4.2 Respuestas enormes que no congelan la app · M · A ✅ parcial (2026-11-12)

> **Hecho (2026-11-12):** decodificación nativa y sin lint en el visor de solo lectura (`9e6016b3b`). Tarea larga máxima en producción: 5 MB 303 → 150 ms (objetivo cumplido), 10 MB 533 → 248 ms (objetivo no cumplido). Detalle en `docs/perf/README.md` §6.8. **Pendiente:** límite configurable y aviso con tres acciones para respuestas de varios MB; solo si se decide que hace falta, porque 10 MB ya pinta en 0,8 s.

Cae dentro de 4.1 y **el perfil lo señala** (2026-11-09, ver `docs/perf/README.md` §6.6). Antes de añadir límites y avisos hay mejoras que quitan el bloqueo sin cambiar lo que ve el usuario, y conviene hacerlas primero y volver a medir:
- **Decodificar la respuesta sin los polyfills de Node** (`atob` + `TextDecoder`, o recibir ya texto): `packages/bruno-app/src/utils/common/index.js:249` (`formatResponse`). ≈220 ms de 850 en una respuesta de 10 MB.
- **No pasar el lint de JSON por el visor de respuesta**, que es de solo lectura: `components/CodeEditor/index.js:264-274`.
- Medir antes y después con `large-json.bench.ts` y `profile-large-json.bench.ts` **en producción** (`docs/perf/README.md` §3.7). Objetivo: tarea larga máxima por debajo de 200 ms con 5 MB (hoy 303 ms) y con 10 MB (hoy 533 ms).

Después, si aún hace falta:
1. Fijar un límite configurable (por ejemplo 5 MB) a partir del cual la respuesta no se resalta ni se formatea en pantalla.
2. Mostrar un aviso con tres acciones: *ver como texto sin formato*, *guardar en archivo*, *formatear de todos modos*.
3. Prueba con la respuesta de 10 MB: la ventana debe seguir respondiendo (medir bloqueo del hilo principal).

**Por qué:** "Postman congelándose con JSON de más de 1 MB" es una queja textual del informe.

---

## 5. Etapa 3 — Fallos del fork y calidad de vida

Todas las metas de esta etapa son pequeñas o medianas. **Antes de cada una, verificar si este fork ya la trae** (la base es una versión reciente de Bruno).

### 5.1 Fallos con más evidencia (del informe)

| Meta | Referencia | Verificar primero | Tamaño |
|---|---|---|---|
| Entornos anidados ✅ (2026-11-12) | Bruno #292 (49 reacciones) | El esquema ya admite `extends` entre entornos (`packages/bruno-schema/src/collections/index.js`). Probarlo en la app antes de tocar nada; puede que solo falte descubribilidad en la interfaz | S |
| OAuth2: reinicio del token ✅ (2026-11-12) | #4392 | Reproducir en la app: ¿se pierde el token al reiniciar? | M |
| Certificados autofirmados ✅ parcial (2026-11-12) | #4949 | Reproducir con un servidor HTTPS de prueba con certificado propio | M |
| Pestañas desactivables | Bruno #1739, Insomnia #8488 | `components/Tabs` y `RequestTabs`; ver si hay ajuste ya | S–M |

**Entornos anidados (2026-11-12) — resultado de «Verificar primero».** El fork **ya trae la función completa** y con pruebas: elegir el padre en la cabecera del entorno (`InheritsFrom`), variables heredadas en solo lectura, aviso si el padre falta, cadenas de varios niveles, secretos, en colección y en espacio de trabajo, y lectura en la CLI (`bruno-cli/src/utils/environment.js`). Cuatro especificaciones e2e en `tests/environments/environment-inheritance/`. Lo que faltaba era **descubribilidad**, no función. Se añadió sin anuncios y con la misma estética de la lista:
- **Marcador discreto en la lista** de entornos (colección y espacio de trabajo): un icono pequeño y atenuado junto al nombre; el tooltip dice «Inherits variables from X». Solo aparece en los que heredan.
- **Opción al copiar un entorno**: casilla «Inherit variables from X instead of copying them», **desmarcada por defecto** (la copia normal no cambia). Si se marca, la copia nace vacía y con `extends: X`. Es el momento natural en que alguien piensa «quiero uno parecido a este».
- Código: `Environments/Common/InheritanceHint` e `InheritOption`; `copyEnvironment(..., { inherit })` y `copyGlobalEnvironment({ inherit })`. Sin cambios de formato en disco (`extends` ya existía) ni de CLI.
- Pruebas: 6 de componentes, 4 de las acciones, e2e `collection-env-inherit-on-copy.spec.ts` (pasa dos veces seguidas). Revisado a ojo en la app real (tema claro).
- Pendiente: ver el tema oscuro; e2e del espacio de trabajo (cubierto solo por pruebas unitarias); textos en `react-i18next` (5.3 de internacionalización).

**Certificados autofirmados (2026-11-12) — resultado de «Verificar primero».** El fork ya permite lo esencial: apagar «SSL/TLS Certificate Verification» y cargar un CA propio («Use Custom CA Certificate») en Preferencias, con suite `tests/ssl/` (autofirmado rechazado, aceptado con la verificación apagada, CA propio, certificados de cliente). **Fallo reproducido:** el aviso que guiaba al usuario nunca salía, porque buscaba el texto `self signed certificate` y Node/OpenSSL actuales escriben `self-signed certificate; if the root CA is installed locally, try running Node.js with --use-system-ca` (verificado con Node v26). Sin aviso, el usuario no sabía qué hacer, y el texto original solo ofrecía lo menos seguro (apagar todo).
- **Corrección:** `utils/certificate-errors` reconoce las variantes (autofirmado, sin emisor local, primer certificado, caducado o aún no válido, nombre de host que no coincide) y `QueryResult/CertificateErrorHint` explica la causa, ofrece primero el CA propio, avisa de que apagar la verificación afecta a todas las peticiones y abre Preferencias con un botón (antes: «haz clic en el engranaje abajo a la izquierda»).
- **Pruebas:** 17 del reconocedor (mutación: volver a la expresión antigua hace fallar 3), 3 del componente, e2e `tests/ssl/self-signed-hint/` con servidor HTTPS local y certificado generado con `openssl` (sin red; proyecto `ssl`; pasa dos veces seguidas).
- **No hecho (decisión de producto):** «confiar en este certificado» por servidor, con huella guardada, sin apagar la verificación global. Es lo que más pedirían las empresas con servidores internos, pero introduce una lista de confianza en disco y es una decisión de seguridad; ver sección de decisiones. Tampoco se probó la CLI (`bru run` con `--insecure`/`--cacert` ya existen).

**OAuth2: reinicio del token (2026-11-12) — resultado de «Verificar primero».** El token **sí se guarda en disco y se reutiliza** tras reiniciar (`<userData>/oauth2.json`, cifrado, clave por ruta de colección): un e2e con dos arranques sobre el mismo perfil lo confirma para `client_credentials` (la segunda petición no pide un token nuevo). **Lo que se perdía era lo visible:** el panel de Auth lee el token del estado de la interfaz, que solo se llenaba cuando una petición lo pedía; tras reiniciar mostraba «No token found» y «Get Access Token» aunque el token estuviera guardado y fuera a usarse. El usuario lo vive como «se perdió el token».
- **Corrección:** `Oauth2TokenViewer` pide el token guardado una vez por clave (colección, URL, id) cuando el estado no lo tiene (`loadStoredOauth2Credentials` → canal nuevo `renderer:get-stored-oauth2-credentials`). No añade entradas al historial de la línea de tiempo. Sin red y sin cambios de formato en disco.
- **Pruebas:** e2e `tests/auth/oauth2-persistence/` (proyecto `auth`; fallaba antes de la corrección con «No token found», pasa dos veces seguidas después), 3 de la acción. Suites de `RequestPane` y `slices/collections`: 286 en verde.
- **No comprobado:** `authorization_code` con proveedor real (necesita el navegador y un proveedor; es la verificación 3.1), un token ya caducado con renovación automática tras el reinicio, y equipos Linux donde el llavero (`safeStorage`) no esté disponible al arrancar: en ese caso el token cifrado con el llavero no se puede leer y habría que pedir uno nuevo. Anotado como riesgo, no reproducido.

**Cómo ejecutar cada una:** (1) reproducir y escribir una prueba que falle, (2) corregir, (3) la prueba pasa, (4) abrir la app y verlo, (5) registrar el commit de Bruno si el arreglo viene de allí (regla de sincronización selectiva), (6) revisar el gemelo en la CLI.

**Listo cuando:** se eligen **tres** con la evidencia de la etapa 2 y cada una tiene prueba y comprobación visual.

### 5.2 Importación OpenAPI fiel · M · B

**Por qué:** es la base de la etapa 5; sin buena importación el autocompletado no sirve. Las quejas del informe: variables de servidor que dejan cada endpoint por corregir, host y esquemas grandes.

1. Reunir tres especificaciones reales en `tests/import/openapi/fixtures/`: una pequeña, una grande (más de 200 operaciones) y una con variables de servidor.
2. Importar cada una con el código actual (`packages/bruno-converters/src/openapi/`) y anotar qué se pierde o queda mal.
3. Corregir con pruebas de entrada y salida junto al convertidor.
4. Comprobar la ruta de la CLI (`bru import`), que comparte el convertidor.

**Listo cuando:** las tres importan sin pérdidas silenciosas y lo que no se pueda representar queda avisado (como ya hace el aviso de importación de Postman).

### 5.3 Mejoras pequeñas sacadas de la investigación

Cada una está pensada para que quien la use la note sin que la pida. Se ordenan por relación entre valor y esfuerzo.

| Mejora | Motivo en la investigación | Esfuerzo | Notas |
|---|---|---|---|
| **Modo vim en el editor** | Bruno #2373 (57 reacciones) | M | CodeMirror admite el mapa de teclas vim; hace falta el ajuste, la carga diferida del módulo y probar con los atajos de la app |
| **Pestañas de varias colecciones a la vez** | Bruno #5807 (33) | M | Comprobar primero qué ofrece el espacio de trabajo actual |
| **Atajos de teclado y paleta de comandos** | Usuarios que "quieren que no estorbe" | M | Ya existe el buscador global; ampliarlo a acciones (nueva petición, cambiar entorno, abrir ajustes). También sienta la base de las extensiones (etapa 9) |
| **Enviar y recibir desde la línea de comandos con la misma colección** | El agente externo del usuario ya cubre la IA ("vibecode Postman"); lo defendible es el contexto propio | M | `bru run` ya existe. Documentar el uso para agentes y, más adelante, un servidor MCP (etapa 10) |
| **Importar desde Postman e Insomnia con informe de lo perdido** ✅ | Es el camino de entrada de quienes se van | S | Hecho en 5.3.6 |
| **Valores por defecto sin sorpresas** | "Bait and switch" es la queja de fondo | S | Revisar que ninguna opción nueva de la base venga activa y que no existan avisos de pago ni anuncios; añadir una prueba que lo vigile (`tests/` recorriendo Preferencias) |
| **Internacionalización** | Bruno #322 (58 reacciones) | M | La app ya usa `react-i18next`. Completar el español y dejar la guía para añadir idiomas; comprobar que lo nuevo (offline, "What's sent") usa claves y no texto fijo |

### 5.3.1 "Todo está en tu disco" en un solo lugar · S · A ✅ (2026-11-08)

**Origen:** la promesa de confianza es el principal motivo de elegir esta herramienta (informe de investigación, fila 5.3).

Hecho:
- Preferencias → General → Privacy ahora contiene, junto al interruptor de anuncios, dos bloques de solo lectura:
  - **Where your data lives:** la carpeta de datos de la app (`userData`, el IPC de lectura `renderer:get-user-data-path` en `ipc/preferences.js`, callback exportada y testeada), y la carpeta de cada colección abierta (deduplicadas, del estado existente de redux). Cada ruta tiene botón **Copy** y **Reveal in Finder/Explorer/File Manager** (helper existente `renderer:show-in-folder` con etiqueta por plataforma `getRevealInFolderLabel`).
  - **What can connect:** las tres conexiones posibles (peticiones que envías, OAuth2 con retorno local, IA solo si está activada) y mención al inventario completo. Como `REPOSITORY_URL` y `DOCS_URL` siguen en null (`docs/branding.md`: no mandar a páginas del proyecto de origen), el inventario se cita en texto (`docs/privacy/network-inventory.md`); el enlace activo aparecerá solo cuando exista la URL propia.
- Estilo integrado al de Preferencias: `SettingsGroup`/`CheckboxSetting` y botones de texto tipo `default-location-browse`, mismo tamaño y colores del tema.

Pruebas:
- `packages/bruno-electron/src/ipc/preferences.spec.js`: el IPC registra el canal y el callback devuelve `app.getPath('userData')`.
- `packages/bruno-app/src/components/Preferences/General/index.spec.js`: 10 casos — rutas visibles, copiado, revelado, colecciones deduplicadas, estado de la IA, y que no hay `fetch`/XHR ni ningún IPC de salida distinto al de lectura.
- Prueba de mutación: una llamada a red inyectada en el componente hace fallar el spec de salida de red; un `userData` equivocado hace fallar el spec del IPC.
- Comprobado en la app real con Playwright (captura del bloque Privacy).

Listo cuando: abres Preferencias, ves las rutas correctas y puedes copiarlas. ✅



### 5.3.2 Copia de seguridad visible antes de migrar de formato · S · A ✅ (2026-11-08)

**Origen:** el miedo a perder datos al cambiar de formato o actualizar es de las quejas más fuertes contra Insomnia (#6585, 74 reacciones).

Hecho:
- La migración BRU→YML ahora **conserva** la copia de los `.bru` (y `bruno.json`) al terminar bien. Antes se borraba en el camino feliz, así que no había ninguna ruta real que mostrar. Ahora se queda en `<userData>/tmp/yml-migration/backup-XXXXXX`, con la misma estructura relativa de la colección. Solo se elimina cuando la migración falla y **todos** los originales se restauraron en su sitio (nada que recuperar); si algún original no se pudo restaurar, la copia se conserva y se reporta, como ya hacía.
- El IPC `renderer:migrate-collection-to-yml` devuelve `backupPath` junto al `brunoConfig`, y el nuevo canal de solo lectura `renderer:get-yml-migration-backup-root` (`getYmlMigrationBackupRoot`) informa la carpeta destino. La interfaz nunca adivina la ruta.
- En **Collection Settings → Overview → Migration**, antes de convertir se anuncia «una copia de cada archivo `.bru` se guarda en `<ruta>`» (la del IPC; si aún no llegó, un marcador `…`). Tras migrar, la misma sección muestra «Migrated to YML file format», la ruta real de la copia y los botones **Copy** y **Reveal in Finder/Explorer/File Manager** (mismo helper y etiqueta por plataforma que Preferencias).
- El modal de confirmación (paso de Backup) repite la ruta destino antes de migrar.
- Desde la revisión (5.3.4) la ruta ya no vive en Redux: se busca por colección en el índice del proceso principal, y la copia se borra a los 30 días o con el botón **Delete backup**.

Pruebas:
- `packages/bruno-electron/src/ipc/yml-migration.spec.js`: la copia sobrevive a la migración, refleja el árbol original (`.bru` + `bruno.json`, sin `.yml`) y `backupPath` apunta a un directorio existente; el canal de la carpeta destino responde desde `app.getPath('userData')`.
- `packages/bruno-app/src/components/CollectionSettings/Overview/Migration/index.spec.js`: 6 casos — aviso previo con la ruta del IPC, marcador cuando el IPC falla, apertura del modal, panel final con ruta real + copiado + revelado, y que no se muestra en colecciones yml sin migración ni se filtra la ruta de otra colección.
- `packages/bruno-app/src/providers/ReduxStore/slices/collection-migration.spec.js`: la ruta se guarda solo para la colección que migró, sobrevive a `migrationEnded` y se limpia al iniciar otra migración.
- Prueba de mutación: quitar la creación de la copia hace fallar 2 pruebas; romper la reversión hace fallar otras 2. Ambas revertidas.
- E2E `tests/collection/migrate-to-yml/migrate-to-yml.spec.ts`: tras migrar, el overview muestra la ruta real y el test comprueba en disco que existen `ping.bru` y `bruno.json`. El cuerpo del test pasa; el `afterAll` (cierre de colecciones) falla por el problema de entorno ya documentado (menú *Remove* fuera de la ventana), igual sin estos cambios.
- Comprobado en la app real con Playwright: capturas del aviso previo, del modal y del panel final con la ruta.

Listo cuando: migrar una colección de prueba muestra la ruta de la copia y esa ruta existe en disco. ✅



### 5.3.3 Petición rápida sin colección · S · A ✅ (2026-11-08)

**Origen:** Postman retiró el Scratch Pad y generó abandono; una persona nueva debe poder enviar una petición sin crear nada antes.

**Verificación (el fork ya traía la maquinaria):**
- `packages/bruno-electron/src/app/collections.js`: `scratchCollectionPaths` y `registerScratchCollectionPath()` registran los directorios temporales de las colecciones scratch.
- `packages/bruno-electron/src/ipc/collection.js`: `renderer:mount-workspace-scratch` crea un directorio temporal con `opencollection.yml` y `metadata.json`; `renderer:save-scratch-request` mueve una petición suelta a una colección real.
- `packages/bruno-app/src/providers/ReduxStore/slices/workspaces/actions.js`: `mountScratchCollection()` monta la colección Scratch del espacio de trabajo al cambiar de espacio; el uid queda en `workspace.scratchCollectionUid`.
- `components/CreateTransientRequest`: el botón «+» de la cabecera de la colección scratch crea peticiones HTTP, GraphQL, gRPC y WebSocket transitorias.
- `components/SaveTransientRequest`: al guardar una petición transitoria se puede elegir una colección existente **o crear una nueva** (nombre y ubicación), que es exactamente el «convertirla en colección» que pedía la meta.
- Lo único visible era el paso final del modal de bienvenida («Get started with a request») y el «+» pequeño de la cabecera; con la bienvenida ya vista no había ninguna entrada evidente.

**Hecho:**
- Nuevo thunk compartido `createScratchRequest()` en `slices/workspaces/actions.js`: monta la colección scratch si aún no existe, continúa la serie `Untitled N` con `generateTransientRequestName()` y crea una petición HTTP transitoria. Devuelve `{ collectionUid, requestName }` o `null` con aviso si no hay espacio de trabajo.
- La pantalla de inicio (`WorkspaceOverview`) muestra **Quick request** como primer apartado, encima de las estadísticas: una tarjeta con el texto «Send a request without creating a collection. Save it to a collection later if you want to keep it.» y el botón **New quick request**.
- El modal de bienvenida y la sección de colecciones usan el mismo thunk (se eliminó la lógica duplicada de `CollectionsSection`).
- Estilo integrado: tarjeta con `theme.background.mantle`, borde `theme.workspace.border`, icono con `theme.brand` y botón primario de la app.

**Pruebas:**
- `slices/workspaces/actions.spec.js`: 4 casos — crea la petición transitoria HTTP en la colección scratch, continúa la serie `Untitled` (1, 3 → 4), monta la colección si el espacio de trabajo aún no la tiene, y avisa sin crear nada si no hay espacio activo.
- E2E `tests/scratch-requests/quick-request.spec.ts`: arranca con un espacio sin colecciones, comprueba que **Quick request** es visible, crea la petición (`Untitled`), la envía a `http://localhost:8081/ping` y recibe 200 sin errores de página.
- La suite existente `tests/scratch-requests/scratch-requests.spec.ts` ya cubre los cuatro tipos, el envío y el guardado en una colección; no se duplicó.
- Prueba de mutación: `isTransient: false` hace fallar 1 prueba; quitar el montaje de la colección scratch hace fallar otra; quitar la tarjeta del inicio hace fallar el e2e. Todo restaurado.
- Comprobado en la app real con Playwright (capturas del inicio y de la petición abierta).

Listo cuando: una persona nueva puede enviar una petición sin crear una colección. ✅



### 5.3.4 Revisión de 5.3.1 a 5.3.3 · S · P ✅ (2026-11-08)

Revisadas por segunda vez (código, pruebas, lint y e2e). Resultado: correctas; sin errores de comportamiento.

Comprobado:
- Pruebas unitarias en verde: `bruno-app` (Preferences/General, Overview/Migration, collection-migration, workspaces/actions: 37) y `bruno-electron` (ipc/preferences, ipc/yml-migration: 39 y 32 tras el ajuste). ESLint sin errores.
- E2E `tests/scratch-requests/quick-request.spec.ts` pasa en la app real.
- E2E de migración: falla en `closeAllCollections` (menú *Remove* fuera de la ventana), el problema de entorno ya documentado en 5.4; no se pudo ver el cuerpo del test en esta máquina.
- Los commits no llevan `Co-Authored-By`, como pide la regla 1.

Corregido: `getYmlMigrationBackupRoot` se usaba antes de definirse (`no-use-before-define`); movido encima de `migrateCollectionToYml`.

Resuelto después de la revisión (2026-11-08):
- **Las copias ya no se acumulan.** Panel final de la migración con botón **Delete backup** (pide confirmación en línea antes de borrar) y borrado automático a los **30 días**. El aviso lo dice en los tres sitios: antes de migrar (Overview y modal) y en el panel final, con la fecha exacta de borrado.
- **La ruta ya no se pierde al reiniciar.** Se quitó `completedBackupPath` de Redux. La copia se registra en `<userData>/tmp/yml-migration/index.json` (colección, ruta, fecha) y la interfaz la busca por ruta de colección con el hook `useYmlMigrationBackup`.
- Código: `bruno-electron/src/utils/migration-backups.js` (registrar, buscar, borrar, purgar; solo borra carpetas `backup-*` hijas directas de la raíz, así que una ruta enviada desde la interfaz no puede borrar otra cosa). La purga corre al registrar el IPC, es decir en cada arranque; las carpetas sin entrada en el índice se envejecen por su fecha de modificación. Canales: `renderer:get-yml-migration-backup-info` (sustituye a `…-backup-root`; devuelve ruta y días de retención), `renderer:get-yml-migration-backup` y `renderer:delete-yml-migration-backup`. Sin red.
- Pruebas: 7 de `migration-backups`, 4 de canales y 1 de registro en `yml-migration`, 10 del panel. Mutación: quitar la comprobación de ruta del borrado y desactivar la purga hacen fallar una prueba cada una (restauradas).

Fallo encontrado al arrancar la app tras estos cambios (corregido): el hook `useYmlMigrationBackup` leía `backup.backupPath` dentro de un `useCallback`, y el React Compiler de la app (`rsbuild.config.mjs`) saca esa lectura al renderizado, donde `backup` es `null`; el modal de migración fallaba con «Cannot read properties of null (reading 'backupPath')». Jest no usa el compilador, así que las pruebas pasaban. Ahora la ruta se lee con `backup?.backupPath` fuera del callback. Regla práctica: un valor que puede ser `null` no se desreferencia dentro de un `useCallback`/`useMemo`; y los cambios de hooks se comprueban arrancando la app, no solo con Jest.

- **Diseño de la sección Migration** (2026-11-08): pasó de líneas de texto sueltas a una tarjeta con borde, cabecera con insignia de formato (BRU/YML), la ruta de la copia en un cuadro propio con etiqueta, una línea de caducidad con icono y una barra de acciones separada (Copy path y Reveal a la izquierda, Delete backup a la derecha, en rojo). Mismos `data-testid` y comportamiento. Pendiente de tu visto bueno en tema claro y oscuro.

Pendiente:
1. **Textos fijos en inglés** en las pantallas nuevas (Privacy, Migration, Quick request); pasarlos a claves de `react-i18next` dentro de la meta de internacionalización (5.3).
2. **Mirar las pantallas en tema claro y oscuro** con ojos humanos (Privacy, Migration con el botón de borrar, Quick request).
3. **Los 30 días están fijos en código** (`BACKUP_RETENTION_DAYS`). Si se quiere configurable, sería una preferencia nueva en Privacy.
4. **El e2e de migración no se pudo ver completo** en esta máquina por el fallo ajeno del menú *Remove*; falta añadirle los pasos de borrar la copia.

Revisión de los cambios de borrado e índice (2026-11-08): sin hallazgos. El borrado solo acepta carpetas `backup-*` hijas directas de la raíz; el índice se escribe con archivo temporal + rename; la purga ignora entradas cuyo directorio ya no existe y envejece por `mtime` las carpetas sin entrada; el hook lee `backup?.backupPath` fuera del callback. Pruebas de `migration-backups`, canales y panel en verde.

### 5.3.5 Valores por defecto sin sorpresas · S · P ✅ (2026-11-08)

**Origen:** fila 5.3 de la tabla («Bait and switch» es la queja de fondo). La promesa es que nada se active solo y que no haya avisos de pago ni anuncios; una prueba debe fallar si alguien cambia un valor por defecto.

Hecho:
- `packages/bruno-electron/src/store/preferences.js` exporta ahora `defaultPreferences` (antes era privado), para que la prueba lo lea sin pasar por `electron-store`.
- Nueva `packages/bruno-electron/src/store/preferences.spec.js`:
  - **Lista explícita** de rutas que deben ser `false`: `ai.enabled`, `ai.autocomplete.enabled`, `ai.providers.*.enabled`, `general.fetchNotifications`, `cache.sslSession.enabled` y `cache.file.enabled`. El `*` se expande sobre los proveedores reales, así que añadir uno nuevo con `enabled: true` también falla. El mensaje nombra la ruta y el valor (`general.fetchNotifications is true`). Si una ruta desaparece o se renombra, la prueba falla en vez de proteger nada.
  - **Barrido recursivo** de todo el árbol: cualquier clave `enabled`, `telemetry` o `analytics` con valor `true` falla salvo que esté en una lista blanca con motivo. Única entrada: `request.keepDefaultCaCertificates.enabled` (seguridad: confiar en el almacén de certificados del sistema es lo seguro; apagarlo rompería TLS, no protegería a nadie). Una tercera prueba comprueba que la lista blanca no se queda obsoleta.
- **`autoCheck` de OpenAPI sync:** se deja como está. Solo actúa si el usuario configuró una `sourceUrl` en la colección y el destino es esa URL; el interruptor `autoCheck` permite apagarlo. La decisión y su límite quedan escritos en `docs/privacy/network-inventory.md` (sección 2). Hacerlo opt-in sería un cambio de producto aparte.
- **Textos de pago o anuncios:** `grep -rniE "upgrade|pro plan|golden|subscribe|license key" packages/bruno-app/src --include='*.js' --include='*.jsx'`. Sin coincidencias de `pro plan`, `golden` (salvo el comentario de color «Golden ochre» del tema), `license key` ni `subscribe` como texto visible. El resto es inerte: `subscribe`/`unsubscribe` de Redux, IndexedDB, logs del mock server, WebSocket y variables; `Upgrade Required` es la frase del código HTTP 426; `case 'upgrade'` es el evento WebSocket; y los comentarios sobre «existing users who upgrade» no se muestran. No hay ningún aviso de pago visible que eliminar. `GoldenEdition` sigue eliminado.
- **Anuncios de `appinfo.usebruno.com`:** siguen apagados por defecto. `general.fetchNotifications` es `false` en `defaultPreferences` y en el fallback del renderer (`Preferences/General`), y `pushNotifications()` vuelve antes de llamar a `fetch` cuando la preferencia está apagada. Cubierto por `ipc/notifications.spec.js` («sends no network request when fetching notifications is off»). El código sigue existiendo, pero es inalcanzable sin opt-in.

Pruebas:
- `npx jest src/store/preferences.spec.js`: 8/8 en verde (6 rutas + barrido + lista blanca).
- `npx jest src/store/preferences.spec.js src/ipc/preferences.spec.js src/ipc/notifications.spec.js`: 13/13.
- **Mutación:** `general.fetchNotifications: true` hace fallar la prueba con `general.fetchNotifications is true`; restaurado y verde. ESLint sin errores.

Listo cuando: la prueba pasa, falla si se activa una opción por defecto y la revisión de texto de pago queda anotada. ✅

### 5.3.6 Informe de importación desde Postman e Insomnia · S · A ✅ (2026-11-08)

**Origen:** fila 5.3 de la tabla. Quien se va de Postman o Insomnia necesita saber qué no llegó.

Hecho:
- **Convertidores** (`bruno-converters`): `postmanToBruno` y el nuevo `insomniaToBrunoWithReport` devuelven, además de `issues`, `totalItems` (elementos de la fuente, incluidos los que se omiten), `importedItems` e `importedBreakdown` (`requests`, `folders`, `environments`). `insomniaToBruno` sigue devolviendo solo la colección, así que el resto de llamadas no cambian. Insomnia ahora avisa de las peticiones sin método o URL, antes se perdían sin decirlo.
- **Corrección de paso en Insomnia v4:** las peticiones dentro de carpetas salían **duplicadas** (la recursión ya las incluía y luego se volvían a añadir). Se quitó el duplicado y se actualizó el resultado esperado de la prueba de importación; hay una prueba nueva que lo vigila.
- **App:** si una importación omite elementos o genera avisos, la notificación abre con «N of M items imported: …» y tiene el botón **Save report**, que pide dónde guardar y escribe un `.txt` (IPC `renderer:save-import-report`, `ipc/import-report.js`, solo disco local). El informe lista lo omitido y los avisos con su ruta; **nunca** incluye el contenido de los elementos de origen, que pueden llevar claves o URLs internas. Si no se omitió nada no sale notificación, porque la colección importada ya se ve (criterio de 7.2).
- **CLI** (gemelo, `bru import postman`): la línea de resumen añade «(N of M items imported)». La CLI solo importa Postman, no Insomnia.

Pruebas:
- `bruno-converters`: 2079 pasan. Nuevas: `import-report.spec.js` (Postman), casos de informe y de duplicados (Insomnia), y se actualizó la prueba que exigía las claves exactas del resultado.
- `bruno-app`: `utils/importers/import-report.spec.js` (texto del informe, sin datos de origen), `Toast/ImportIssuesToast/index.spec.js` (título y guardado) y dos casos nuevos en `ImportCollectionLocation` (muestra el recuento al omitir y calla si no se omitió nada).
- `bruno-electron`: `ipc/import-report.spec.js` (escribe donde se elige, no escribe si se cancela, rechaza informes vacíos).
- `bruno-cli`: caso nuevo en `import-report.spec.js`.
- Mutación: contar todo como importado hace fallar la prueba del convertidor; quitar el informe de la notificación hace fallar la de `ImportCollectionLocation`. Restauradas.
- Comprobado con la CLI real (tras `npm run build:bruno-converters`): una colección con 4 elementos y uno inválido imprime «Imported 2 requests in 1 folders (3 of 4 items imported)» y lista el omitido.

Pendiente:
1. **Verla en la app con ojos humanos**: importar una colección de Postman con un elemento inválido y mirar la notificación y el archivo guardado, en tema claro y oscuro.
2. La importación **masiva** (`BulkImportCollectionLocation`) sigue mostrando la notificación sin recuento; se puede añadir si se usa.
3. Textos en inglés fijos, como el resto (ver 5.3.4, pendiente 1).
4. Tras tocar un convertidor hay que ejecutar `npm run build:bruno-converters` para que la app y la CLI lo vean.

### 5.4 Entornos: lista más cuidada · S · P ✅ (2026-11-07)

**Origen:** pedido tuyo tras usar la lista de entornos de la colección (los entornos son de Bruno, no los añadió RestLab).

Hecho:
- Los botones de flecha y cruz al crear o renombrar pasaron a texto: **Create** o **Save**, y **Esc**, con los mismos atajos de teclado (`EnvironmentList/InlineNameActions`).
- El campo de nombre tiene borde y resalta al enfocarlo, igual que el buscador de la lista.
- Se quitó el aviso flotante "Environment created!" y "Environment renamed!". La fila nueva se resalta un instante. Los avisos de error se conservan.
- Al crear un entorno se vacía el buscador y se ve la lista completa.
- **Orden por uso:** abrir, activar, renombrar o crear un entorno lo sube al principio; el recién creado queda primero. Se guarda por colección en este equipo (hook `useRecentOrder`, 6 pruebas), sin tocar los archivos de la colección.

Pendiente de esta meta:
- Mirarlo en la app con tus ojos en tema claro y oscuro (yo no lo he visto; las pruebas de componente pasan).
- Aplicar lo mismo a las listas de entornos **globales** y del **espacio de trabajo**, que tienen su propia lista.
- Revisar el resto de avisos flotantes de la app con el mismo criterio (ver 7.2).
- Las pruebas end-to-end de entornos tienen un fallo **ajeno** al cambio: el menú "Remove" queda fuera de la ventana al limpiar colecciones en esta máquina. Falla igual sin los cambios.

---

## 6. Etapa 4 — Las apuestas, con validación

Ninguna tiene demanda comprobada. Se construyen **pequeñas** y se validan antes de pulir. Se necesita 5.2 terminada.

### 6.1 Autocompletado de rutas desde OpenAPI (M3) · L · C

**Objetivo:** al escribir la URL, sugerir rutas reales del servicio.

**Pasos**
1. **Índice de rutas.** Función pura que, dada una especificación, devuelve rutas, métodos y parámetros. Va en un paquete sin dependencias de Electron (`bruno-common` si cabe en sus reglas, o `bruno-converters`). Pruebas con las tres especificaciones de 5.2.
2. **Fuente de la especificación**, por orden de prioridad:
   a. La especificación vinculada a la colección (ya existe la sincronización OpenAPI: `useOpenAPISyncPolling`).
   b. Un archivo local elegido por el usuario.
   c. Búsqueda en el servidor al escribir la URL base (`/openapi.json`, `/swagger.json`, `/v3/api-docs`). **Es una llamada de red**: apagable, apagada por defecto hasta que el usuario la active una vez, y anotada en el inventario.
3. **Lista desplegable en la barra de URL.** Reutilizar el sistema de autocompletado de CodeMirror existente (`utils/codemirror/autocomplete.js`) en vez de crear otro. Nada inventado si no hay especificación: sin especificación, no se muestra nada.
4. **Indicador de salud** del servidor (responde o no) al elegir una ruta, solo a petición del usuario.
5. **Variables de ruta.** Al elegir `/users/{id}`, crear el parámetro de ruta ya nombrado.

**Dónde se toca:** `packages/bruno-app/src/components/RequestPane/QueryUrl/`, `utils/codemirror/`, un módulo nuevo `utils/openapi-routes/`.

**Listo cuando:** funciona con las tres especificaciones, sin especificación no aparece nada, y la búsqueda automática está apagada y registrada.

**Primera versión hecha (2026-11-14).** Al escribir una ruta en la barra de URL de una petición HTTP sale la lista de rutas que encajan, con el método en su color, la ruta y su descripción.
- **De dónde salen (pasos 2a y 2b):** de descripciones que ya están en esta máquina: la que la colección tiene sincronizada (OpenAPI sync; se lee la copia guardada, no se vuelve a pedir) y las abiertas en «API Specs». No hay llamada de red nueva. El paso 2c (buscar la especificación en el servidor) **no está hecho**.
- **Qué completa al elegir una ruta:** conserva el servidor que el usuario escribió (`{{host}}`, `http://localhost:3000`) y pone la ruta, con `{id}` convertido a `:id` para que se creen los parámetros de ruta (paso 5); el método; los parámetros de consulta obligatorios; y, si la petición no tiene cuerpo, el cuerpo de ejemplo de la descripción. Nunca sustituye un cuerpo ya escrito. Si no se escribió servidor, usa el de la descripción.
- **Cómo encaja lo escrito:** por segmentos desde el principio, sin distinguir mayúsculas; un valor real vale donde la ruta tiene un parámetro (`/pets/42/` sugiere `/pets/:petId/toys`); se acepta el prefijo del servidor (`/v1`) delante; si nada empieza así, busca la palabra en medio de la ruta. Sin descripción no aparece nada.
- **Reutiliza** el conversor OpenAPI existente (`openApiToBruno`) para obtener la petición de cada operación, y la lista de sugerencias de CodeMirror. Código: `utils/openapi-routes`, `hooks/useOpenApiRoutes`, `hooks/useRouteSuggestions`. e2e `tests/autocomplete/openapi-routes/`.
- **Pendiente:** paso 2c y paso 4 (salud del servidor); cabeceras y autenticación de la descripción; GraphQL; probar con especificaciones grandes (se convierte entera la primera vez); validación con usuarios (sigue siendo nivel C).

### 6.2 Archivos con menos pasos (M4) · S · C

1. Verificar qué deduce hoy Bruno del tipo de contenido al adjuntar archivos.
2. Lo manual que queda es el **nombre de la clave**. Rellenarla desde, por orden: la especificación (si hay), el último uso en la colección, el nombre del archivo. **Siempre editable.**
3. Guardar rutas **relativas a la colección** cuando el archivo está dentro de ella, para que sea portable al compartir por Git.

**Listo cuando:** adjuntar un archivo requiere elegir el archivo y nada más en el caso común, y el cambio no altera el formato en disco (si lo alterara, parar y decidir).

### 6.3 Sesión de validación · S · P

1. Reclutar 3 a 5 desarrolladores que usen OpenAPI (decidir quiénes: ver sección 13).
2. Darles una tarea real que use 6.1 y 6.2 **sin explicar** cómo.
3. Anotar si lo usan solos, dónde dudan y qué dicen. Guardar en `docs/research/validation-1.md`.
4. Regla: si no lo usan sin que se les diga, no se pule y no bloquea la v1.

---

## 7. Etapa 5 — Interfaz y primer uso

### 7.1 UI minimalista y expresiva (M5) · M · B

**Por qué:** hay evidencia contra el desorden; "expresiva" es una apuesta de diseño tuya.

1. **Mockups antes de código**, contigo, con las skills `ui-taste` y `building-components`. Pantallas: lista de colecciones, editor de petición, respuesta, preferencias, primer arranque.
2. Principios para decidir: lo que no se usa no se ve; cada pantalla con una acción principal; sin avisos que interrumpan; densidad ajustable.
3. **Personalización más allá de temas** (idea tuya del inicio): densidad (compacta o cómoda), tamaño de fuente de la interfaz y del editor, posición del panel de respuesta (derecha o abajo, ya existe en parte), barra de pestañas activable, atajos reasignables. Cada ajuste vive en Preferencias, General o Display, con un valor por defecto sensato.
4. **Primer uso:** que alguien nuevo cree y envíe una petición sin ayuda (el modal de bienvenida ya existe). Medirlo con la sesión 6.3.
5. Aplicar el logo y los iconos oficiales (`docs/branding.md`).

### 7.2 Avisos y notificaciones coherentes · S · P
Tu observación: el aviso que baja desde arriba al crear algo no se ve bien. Criterio propuesto: lo que el usuario ve ocurrir en pantalla no necesita aviso (la fila nueva, el contador); los avisos se reservan para errores y para acciones sin resultado visible. Pasos: (1) inventariar todos los `toast.success` (`grep -rn "toast.success" packages/bruno-app/src`); (2) en los que tienen resultado visible, sustituir por un cambio en el propio elemento, como se hizo en 5.4; (3) unificar posición, duración y estilo de los que queden con el tema.

**Listo cuando:** los mockups están aprobados por ti, la implementación los sigue en claro y oscuro, y el recorrido del nuevo usuario se completó sin ayuda.

---

## 8. Etapa 6 — Salida de la v1

### 8.1 Base interna para extensiones (ADR) · S · P

Solo documento, sin API pública. Crear `docs/adr/0001-extensions-seam.md` respondiendo:
1. **Qué puede hacer una extensión** en su primera versión: añadir comandos a la paleta, paneles laterales, pestañas propias, temas, y reaccionar a eventos (antes de enviar, al recibir respuesta).
2. **Dónde corre:** proceso aparte con permisos explícitos, no dentro de la ventana principal.
3. **Qué NO puede hacer sin permiso:** leer secretos, usar la red, escribir fuera de la colección.
4. **Dónde se engancha hoy:** puntos candidatos en el código (`ipc/`, el menú, `Redux`), para no cerrar puertas con cambios de la etapa 5.
5. Qué se aprende de Bruno #1529 y de los plugins en TypeScript de Yaak.

### 8.2 Paquetes e instaladores · M · P

1. Decidir plataformas del primer instalador (sección 13).
2. Probar `npm run build:electron:linux` (y mac/win en máquinas o CI correspondientes). La configuración ya usa `APP_NAME` y `com.restlab.app`.
3. Revisar `resources/installer.nsh` (Windows) y las entradas `.desktop` y el esquema `restlab://` en Linux.
4. **Instalación limpia:** en una máquina virtual sin nada, instalar, abrir, comprobar la carpeta de datos esperada y que `restlab://` abre la app.
5. **Firmas.** macOS necesita notarización; Windows, un certificado. Son decisiones de coste (sección 13).
6. Pipeline de CI: pruebas unitarias, e2e y construcción del paquete.

### 8.3 Revisión final · S · P

1. `/code-review` sobre toda la rama contra la base de Bruno.
2. `/security-review`, con foco en: redacción de secretos, servidor de retorno OAuth2, lectura de archivos del visor, esquema `restlab://`.
3. **Inventario de red completo con la red bloqueada:** arrancar con `unshare -n` o un cortafuegos, recorrer la app y confirmar que no falla nada ni intenta salir.
4. **Compatibilidad de formato:** abrir 3 colecciones reales de Bruno (`.bru` y `.yml`), guardar sin cambios y verificar con `git diff` que no cambia nada.
5. Corregir las dos pruebas de fecha por zona horaria y decidir qué hacer con las 3 de QuickJS.

### 8.4 Documentación mínima · S · P

Qué es RestLab y la promesa local-first · cómo activar la IA y ver lo que se envía · cómo registrar la dirección de retorno de OAuth2 · dónde está cada cosa en disco · cómo reportar errores (cuando exista el repositorio).

### Condiciones para llamarla "v1"

1. Local-first comprobado con la red bloqueada. 2. IA opcional verificable. 3. Nada que dirija a servicios ajenos sin decirlo. 4. Mediciones de rendimiento registradas y mejoradas. 5. Instaladores que arrancan en una máquina limpia. 6. Suites en verde, salvo fallos conocidos documentados.

Las apuestas (6.1, 6.2) **no son condición**: entran si 6.3 las valida.

---

## 9. Etapa 7 — Extensiones (después de la v1)

Idea tuya del inicio: personalización profunda "como las extensiones de VS Code". Es un proyecto propio; se divide para poder entregar valor en cada paso.

| Paso | Qué entrega | Tamaño |
|---|---|---|
| 9.1 Anfitrión de extensiones | Proceso aparte, manifiesto (`restlab-extension.json`), carga desde una carpeta del usuario, sin tienda | L |
| 9.2 Contribuciones básicas | Comandos en la paleta, temas, paneles laterales | L |
| 9.3 Eventos | Ganchos antes de enviar y al recibir respuesta, con permisos declarados y pedidos al usuario | L |
| 9.4 Permisos y firma | Modelo de permisos visible, extensiones firmadas, desactivar todo con un interruptor | M |
| 9.5 Documentación para autores y ejemplos | Plantilla, guía y 3 ejemplos que funcionen | M |
| 9.6 Catálogo | Solo cuando haya autores. Instalación manual desde repositorio primero | L |

**Ejemplos de extensiones que tú planteaste** (sirven como casos de prueba del diseño; ninguna va dentro del núcleo):
- **Simulación de peticiones a un sitio web** (carga o tráfico de prueba): usa eventos y permisos de red explícitos.
- **Probar una URL y sus rutas permitidas**: recorre rutas conocidas (de OpenAPI o de la colección) y reporta cuáles responden.
- **Verificación de integridad**: comprueba que las respuestas cumplen un esquema.

Regla: el núcleo sigue siendo útil sin ninguna extensión, y ninguna se instala sola.

---

## 10. Etapa 8 — IA que diagnostica (después de la v1)

Idea tuya del inicio: un asistente al estilo de OpenCode que vea el proyecto, las peticiones y respuestas y ayude a encontrar y corregir el código que falla. Se construye sobre la IA opcional ya hecha (vista previa, redacción, claves propias).

| Paso | Qué entrega | Condición |
|---|---|---|
| 10.0 **Entrar con una cuenta, sin claves de pago** | Ver subsección de abajo | Verificar condiciones de cada proveedor antes de construir |
| 10.1 **Explicar este fallo** | Botón en una respuesta con error: la IA recibe petición y respuesta (redactadas, con vista previa) y explica causas probables. Nada se envía sin pulsarlo | Decidir cuánto del cuerpo de la respuesta ve la IA (sección 13) |
| 10.2 **Servidor MCP y CLI para agentes externos** | `restlab mcp` expone colecciones, entornos (sin secretos) y envío de peticiones a Claude Code, OpenCode u otro agente propio del usuario | Lo defendible según el informe: contexto propio del cliente, agente propio del usuario |
| 10.3 **Contexto del código fuente** | El usuario indica una carpeta de proyecto; el asistente ve rutas y controladores para relacionar un fallo con el código | Solo lectura, carpeta elegida explícitamente, vista previa de lo enviado |
| 10.4 **Propuestas de corrección** | Cambios mostrados como diff que el usuario aprueba; nunca escribe solo | Reutiliza el flujo "Apply" con restauración de valores |
| 10.5 **Descubrir rutas desde el código** | Alternativa a OpenAPI para proyectos sin especificación | Depende de 10.3 |

### 10.0 Usar la IA sin API key de pago (pedido tuyo)

Hoy RestLab solo se conecta con claves o con un modelo local. Opciones, de más a menos recomendable:

1. **Modelos locales (ya hecho: Ollama).** Gratis, sin cuenta y sin salida de datos. Se puede mejorar detectando Ollama al activarlo y sugiriendo un modelo.
2. **Delegar en un agente que el usuario ya tiene con sesión iniciada** (Claude Code, OpenCode, Codex u otro) hablando con él por un protocolo de agentes (por ejemplo ACP) o por el servidor MCP de 10.2. RestLab no guarda credenciales ni toca la cuenta del usuario: el agente usa su propio inicio de sesión. Es la ruta más robusta ante cambios de términos.
3. **Iniciar sesión con un proveedor desde RestLab (como hace OpenCode).** Funciona hoy con algunos proveedores (por ejemplo flujos de dispositivo o OAuth), pero **cada proveedor decide si permite que una aplicación de terceros use una suscripción de consumo** y esas condiciones han cambiado antes. **No lo he verificado**: antes de construirlo hay que leer los términos vigentes de cada proveedor y probar el flujo. Si se construye, los tokens van al llavero del sistema, con la misma vista previa y redacción de secretos que ya existen.

**Mi recomendación:** 1 ya está; hacer 2 primero (sirve a la vez como "harness" y no depende de términos ajenos); investigar 3 proveedor por proveedor y construir solo los que lo permitan por escrito. Pasos: (a) definir la interfaz de "proveedor de IA" para que acepte además de claves un proveedor "agente externo"; (b) conexión por MCP/ACP con permisos y vista previa de lo que se comparte; (c) reutilizar las herramientas de lectura y edición de 10.3 y 10.4.

Reglas permanentes de la IA: apagada por defecto, nada visible cuando está apagada, claves propias, secretos redactados con vista previa, nunca corre en segundo plano.

---

## 11. Etapa 9 — Colaboración, nube y versión de empresa (después de la v1)

Tu observación: para vender una versión a empresas o grupos grandes importan ambas cosas, Git y nube. La investigación dice que el rechazo a la nube forzada es la queja principal, así que **todo es opcional y local por defecto**.

| Paso | Qué entrega | Notas |
|---|---|---|
| 11.1 Sincronización con Google Drive | Una carpeta de Drive del usuario como respaldo y sincronización de colecciones | Idea guardada: `docs/superpowers/ideas/2026-11-07-google-drive-sync.md`. Cuidar conflictos y secretos (nunca subirlos) |
| 11.2 Flujo guiado con Git | Ver estado, commit y rama desde la interfaz, para quienes no usan terminal | **Ampliada como idea 13 de la sección 15** (control de versiones gráfico estilo GitLens): el motor ya está en `utils/git.js` sin consumidores; falta el IPC y la interfaz |
| 11.3 Entornos y secretos compartidos | Gestor de secretos externo (Bruno ya integra varios) | Sin guardar secretos en texto plano en el repositorio |
| 11.4 Auditoría y políticas para equipos | Registro local de qué se envió y a dónde; política de IA fijada por la organización | Es lo que una empresa pide y no cuesta privacidad |
| 11.5 Modelo comercial | Decidir qué es gratis siempre y qué se cobra, **antes** de escribir código de pago | Riesgo: repetir el "rug pull" que el informe señala en Bruno. Publicar el compromiso por escrito |

---

## 12. Orden resumido

```
Hecho ─ marca, local-first, IA opcional, fin de enlaces ajenos
  │
  ▼
1  Verificaciones externas (3.1) + pendientes de marca (3.2)
2  Rendimiento: medir (4.1) → corregir 2 → respuestas grandes (4.2)
3  Importación OpenAPI fiel (5.2) → 3 fallos del fork (5.1) → mejoras pequeñas (5.3)
4  Apuestas pequeñas (6.1, 6.2) → sesión de validación (6.3)
5  UI con mockups (7.1)
6  ADR de extensiones (8.1) → instaladores (8.2) → revisión (8.3) → docs (8.4)
   ═══════════════ v1 ═══════════════
7  Extensiones (9.x)     8  IA que diagnostica (10.x)     9  Nube y empresa (11.x)
```

**Por qué este orden:** las etapas 1 a 3 refuerzan la promesa, que es lo que decide la elección según el informe; las apuestas van tras tener buena importación y se frenan hasta validar; la interfaz se diseña cuando ya se sabe qué funciones quedan; las extensiones y la IA que diagnostica necesitan una base estable y usuarios.

**Si hay poco tiempo**, el mínimo que sostiene la promesa es: 3.1, 4.1, 5.3 (las tres primeras filas del orden recomendado), 8.2 y 8.3.

---

## 13. Decisiones que siguen abiertas

| # | Decisión | Cuándo hace falta | Mi recomendación |
|---|---|---|---|
| 1 | Repositorio público de RestLab (para reportes y código fuente) | Antes de publicar | Crearlo cuando haya una versión instalable; hasta entonces el botón queda oculto |
| 2 | Los tres fallos del fork a priorizar | Tras medir (4.1) | Pestañas desactivables, certificados autofirmados y OAuth2, salvo que 4.1 muestre otra cosa |
| 3 | Quiénes participan en la validación | Antes de 6.3 | Tres personas que usen OpenAPI a diario; mejor externas a ti |
| 4 | Plataformas del primer instalador | Antes de 8.2 | Linux primero (donde desarrollas); macOS y Windows cuando haya CI |
| 5 | Firmas y certificados | Antes de publicar | Postergar mientras sea solo para ti y probadores |
| 6 | Cuánto de la respuesta ve la IA en "Explicar este fallo" | Antes de 10.1 | Cabeceras y estado por defecto; el cuerpo solo si el usuario lo marca, con vista previa |
| 7 | Modelo comercial | Antes de cualquier función de pago | Definir una promesa escrita de lo que siempre será gratis |
| 8 | Qué hacer con los anuncios de Bruno | Antes de la v1 | Eliminar el código |
| 9 | Logo e iconos oficiales | Antes de publicar | Ver `docs/branding.md` |
| 10 | «Confiar en este certificado» por servidor (huella guardada por colección, sin apagar la verificación global) | Después del token OAuth2 (5.1) | Hacerlo: básico gratis (un servidor, una colección); lista aprobada por la organización como función de empresa. Pide `/security-review` |

---

## 14. Apéndice — Registro de lo decidido el 2026-11-07

| Tema | Resolución |
|---|---|
| Reporte de errores | Oculto hasta tener repositorio; la dirección vive en `utils/branding` |
| Changelog | Propio, en `components/ChangelogTab/CHANGELOG.md` |
| Documentación generada | Visor incrustado, sin red |
| Enlaces a documentación de Bruno | Eliminados; falta la documentación propia |
| `appId` y esquema | `com.restlab.app` y `restlab://` |
| Copyright | "Copyright (c) 2026 RestLab", conservando el aviso original de Bruno exigido por la licencia MIT |
| Metadatos de exportación | `RestLab/<versión>` (CLI: `restlab-cli/<versión>`) |
| Commits | Uno por módulo, sin `Co-Authored-By` |

---

## 15. Ideas propuestas para sumar valor (2026-11-09)

Trece ideas nuevas, todas de nivel **P/C** (propuestas, sin demanda comprobada en el informe), pensadas para reforzar la promesa local-first y hacer útil la app sin IA. Detalle, pasos y «listo cuando» de cada una en `docs/superpowers/ideas/2026-11-09-fork-value-ideas.md`.

| # | Idea | Esfuerzo | Cuándo |
|---|---|---|---|
| 1 | Explicar el fallo sin IA — **hecho (2026-11-13)** | M | Tras la v1-base |
| 2 | Modo estricto de red — **hecho (2026-11-13)** | M | Antes de publicar |
| 3 | Detector de secretos antes de commit o exportación ✅ parcial (2026-11-12) | M | Tras 5.3 |
| 4 | Doctor de colección (`bru check`) — **hecho en la app (2026-11-13)** | M | Tras 5.2 |
| 5 | Comprobador de integridad de formato (`verify`) | S–M | Con 8.3 |
| 6 | Documentación incluida en la app | M | Con 8.4 |
| 7 | Modo portátil | S | Con 8.2 |
| 8 | Copiar información de diagnóstico | S | Con el repositorio público |
| 9 | Comparar dos respuestas — **hecho (2026-11-13)** | M | Después de 4.x |
| 10 | Desglose de tiempos | M | Después de 4.x |
| 11 | Primer arranque «vengo de Postman/Insomnia» | S | Con 7.1 |
| 12 | Descargas verificables (sumas y SBOM) | S | Con 8.2 |
| 13 | **Control de versiones gráfico (estilo GitLens)** ✅ (2026-11-12): cambios, commit, ramas, historial, diff y blame por petición | L (4 fases) | Hito propio tras 4.x y 5.2 |

**Idea 3, detector de secretos (2026-11-12) — hecha la parte local.** Decisión de prioridad: de las opciones disponibles es la que más refuerza la promesa local-first, ayuda a cualquier usuario con colecciones en Git y es el primer paso natural hacia la versión de empresa (políticas por organización, 11.4). Se prefirió a la importación OpenAPI fiel (5.2), cuya demanda es modesta (evidencia B) y poco visible.
- **Motor:** `@usebruno/common` → `findSecretsInCollection` (`src/secrets/`), función pura y sin dependencias que respeta el DAG. Devuelve **dónde** está el valor y **qué parece**, nunca el valor. Reconoce valores con forma de credencial (JWT, claves privadas, tokens de GitHub/AWS/Slack/Google/Stripe/GitLab, contraseña en la URL), campos de autenticación y cabeceras con valor literal, y variables de entorno con nombre sensible que no están marcadas como secretas. No marca `{{variables}}`, valores vacíos ni marcadores como `<token>` o `changeme`, ni nombres como `access_token_url`.
- **Falsos positivos medidos:** se ejecutó sobre 265 peticiones y 49 entornos reales del repositorio (`bruno-tests` y `tests/environments`). La primera pasada marcó `access_token_url` y similares (nombres que mencionan un token sin serlo); se corrigió con una prueba. Los hallazgos que quedan son credenciales reales en texto plano de los servidores de prueba.
- **Interfaz, sin ruido:** en la pestaña Overview de la colección aparece una línea atenuada («2 values look like secrets stored in plain text») **solo si hay algo**; desplegada, lista ruta, campo y tipo, con el consejo de usar una variable o marcarla como secreta. El diálogo de compartir añade un aviso con el recuento. No bloquea nada.
- **Pruebas:** 22 del motor (mutación: quitar el filtro de marcadores hace fallar una), 3 del componente, e2e `tests/collection/secrets-check/` (dos pasadas seguidas), `bruno-common` completo en verde (766).
- **Correcciones de paso:** `GenerateApiDocsOptions` no declaraba `inlineAssets` y `bruno-common` no compilaba (`b8c33e81c`); se vio al reconstruirlo y no tenía relación con este cambio.
- **Arreglar desde el propio aviso (2026-11-12):** cada hallazgo tiene `location` (entorno, colección, carpeta o petición, con su uid). Con eso, el nombre del lugar es un enlace que abre el entorno, la carpeta o la petición, y las variables de entorno señaladas llevan **«Mark as secret»** (más «Mark all N environment variables as secret» cuando hay varias): el valor sale del archivo del entorno y pasa al almacén de secretos. Se niega a actuar si el entorno tiene cambios sin guardar, para no pisarlos. Comprobado en la app real: antes el archivo contenía la contraseña, después `secret: true` y ningún valor (e2e, dos pasadas). Sin cambios de formato en disco.
- **Recuperar cambios sin guardar (2026-11-14) — hecho para peticiones guardadas.** Pedido por el usuario; Bruno no lo tenía (restauraba las pestañas, no los cambios). Un segundo después de editar una petición, sus cambios se escriben en `unsaved-drafts.json` dentro de la carpeta de datos de la app (fuera de la colección, escritura atómica). Al reabrir, vuelven como cambios sin guardar sobre su petición y un aviso dice cuántas se recuperaron. Guardar o descartar una petición borra su copia al momento, así que «Don't save» al cerrar se respeta. Si el archivo cambió en disco entre medias, la copia se descarta en vez de pisarlo después. **No cubre** peticiones que nunca se guardaron en una colección (las temporales se limpian al arrancar), ni borradores de entornos, carpetas o ajustes de colección. La copia guarda el contenido tal cual, incluidos secretos escritos en la petición, igual que los archivos de la colección. e2e `tests/snapshots/unsaved-drafts/` mata el proceso y comprueba que la edición vuelve.
- **Oportunidades leídas del informe (2026-11-14):** ideas 14 a 22 en `docs/superpowers/ideas/2026-11-09-fork-value-ideas.md`.
- **Idea 9, «Comparar dos respuestas» (2026-11-13) — hecha.** Pestaña **Compare** en el panel de respuesta, que solo existe cuando la petición tiene dos respuestas en el Timeline. Compara dos envíos cualesquiera (por defecto, el último con el anterior): estado, cabeceras (añadidas, quitadas, cambiadas; `date` y `age` se ignoran porque cambian siempre) y cuerpo, con el JSON puesto a un valor por línea y los tramos iguales plegados. Cuerpos binarios o de más de 20 000 líneas solo dicen si difieren. Lógica pura en `utils/response-compare`; no reenvía nada. Límite: el Timeline vive en memoria, así que no se compara con envíos de otra sesión, y no dice en qué entorno se hizo cada envío. e2e `tests/response/response-compare/`.
- **Idea 4, «Doctor de colección» (2026-11-13) — hecha en la app.** Línea discreta en la vista general de la colección, bajo el detector de secretos, solo si hay algo: «N things to review in this collection». Encuentra: `{{variable}}` que nada define; variable usada por peticiones que **falta en algunos entornos** (dice cuáles); petición sin URL; peticiones con el mismo nombre en una carpeta. Cada fila abre la petición, la carpeta o los entornos. Motor puro en `bruno-common/src/collection-check` (`checkCollection`). Para no dar falsos avisos cuenta como definida toda variable que un script fija con `bru.set*Var("nombre")`, las variables post-respuesta, las de colección, carpeta (solo dentro de su carpeta) y petición, las heredadas entre entornos y las de entornos globales; y no llama «sin definir» a nada mientras haya peticiones sin cargar. **Pendiente:** scripts con errores de sintaxis (no hay un analizador fiable con `await` de nivel superior), y el gemelo en la CLI (`bru check`), que podría reutilizar `checkCollection` tal cual. e2e `tests/collection/collection-check/`.
- **Idea 2, «Modo estricto de red» (2026-11-13) — hecha.** Detalle en `docs/privacy/network-inventory.md` sección 6. Interruptor en Privacy; filtro en el proceso principal sobre las sesiones de las ventanas; pausa de OpenAPI sync y anuncios; contador de intentos bloqueados con sus direcciones. No toca lo que el usuario envía.
  - **Fallo anterior encontrado por el e2e y corregido:** en Preferencias > General, una opción activada y vuelta a apagar sin salir de la página no se guardaba, porque el formulario comparaba con los valores de apertura (`formik.dirty`). Ahora compara con lo último enviado a guardar. Afectaba a todas las opciones de esa página.
- **Idea 1, «Explicar el fallo sin IA» (2026-11-13) — hecha.** Reglas locales en `bruno-app/src/utils/request-failures` (función pura `explainRequestFailure`), sin red. Dos sitios: (a) una petición **sin respuesta** se explica bajo el mensaje de error: puerto sin nadie escuchando (dice puerto y host; solo en local sugiere arrancar el servidor), nombre que no se resuelve, DNS sin respuesta, tiempo agotado (abre *Settings*), servidor inalcanzable, `https://` contra un puerto HTTP, puerto que no habla HTTP, conexión cerrada sin respuesta, bucle de redirecciones, protocolo no admitido, URL no válida (culpa a las variables solo si hay alguna sin resolver) y los tres casos de certificado, que antes tenían su propio componente (`CertificateErrorHint`, eliminado); (b) una petición **con estado de fallo** muestra una tarjeta que se puede cerrar encima del cuerpo: 401 con el esquema y el *realm* que pide el servidor, o «token rechazado» con su motivo (abre *Auth*), 403, 405 con los métodos de `Allow`, 407 (abre Preferencias), 413, 415, 429 y 503 con `Retry-After`, 502, 504 y redirección no seguida con su `Location`. **Se prefiere callar a explicar mal:** 400, 404, 409, 422, 500 y cualquier error sin causa concreta no muestran nada. Solo HTTP y GraphQL; en el runner y en los ejemplos guardados no se ofrece abrir *Auth* ni *Settings* porque no hay pestaña de la petición. Sin texto traducido todavía.
  - **Fallo encontrado por el e2e:** Electron (BoringSSL) escribe `WRONG_VERSION_NUMBER` donde Node (OpenSSL) escribe `wrong version number`; la regla reconoce ambos. Los mensajes se capturaron reproduciendo cada fallo, no de memoria.
  - Pruebas: 52 de reglas, 5 del componente, 4 de la sección de avisos; e2e `tests/response/failure-explanation/` con servidores locales (puerto cerrado, esquema equivocado, servicio que no es HTTP, 401, 429, y 404 y 200 sin explicación). El e2e de certificados (`tests/ssl/self-signed-hint`) sigue pasando con el componente nuevo.
- **«Move to secret variable» para peticiones (2026-11-12):** cada hallazgo en una cabecera, parámetro o campo de autenticación de una petición lleva `source` (qué cabecera, parámetro o campo). La acción guarda el valor como **variable secreta del entorno activo** y deja `{{variable}}` en su lugar; en `Authorization: Bearer abc` solo se mueve el token y el `Bearer ` se queda. Si ese entorno ya tiene una variable secreta con el mismo valor se **reutiliza**, de modo que un token pegado en diez peticiones acaba en una sola variable. Nombres legibles (`X-Api-Key` → `xApiKey`, `bearer.token` → `bearerToken`) y únicos (`apiKey2`...). Se niega, sin escribir nada, si no hay entorno activo (el botón sale deshabilitado y dice por qué: «Select an environment first» o «Create an environment first»), si la petición o el entorno tienen cambios sin guardar, si la petición es temporal o si el valor ya no está. El entorno se guarda antes que la petición, así que un fallo a medias deja una variable sin uso, nunca una petición rota.
  - Código: `utils/secret-variables` (nombre, prefijo de esquema, lectura y escritura del campo), `moveRequestValueToSecretVariable` en `slices/collections/actions.js`, botón en `SecretsCheck`. Pruebas: 12 de utilidades, 8 de la acción (mutación: aceptar una variable no secreta como reutilizable hace fallar una), 3 nuevas del componente (10 en total) y el e2e completo (dos pasadas): el token desaparece del archivo de la petición y no aparece en el del entorno.
  - **Aviso para la CLI:** los valores de variables secretas viven en el almacén de la app, no en los archivos. Quien ejecuta `bru run` en CI tiene que pasarlos con `--env-var nombre=valor` (ya es así para cualquier variable secreta). Conviene decirlo en la documentación (8.4) y valdría un aviso en el panel cuando haya una carpeta de CI; no se hizo.
  - **Alcance:** solo peticiones. Los valores en carpetas y en los ajustes de la colección siguen señalados pero sin botón (guardan por otro camino), y la URL y el cuerpo tampoco se reescriben.
- **No hecho:** aviso al haber cambios en un repositorio Git (espera al control de versiones gráfico, idea 13), «mover a una variable secreta» para carpetas, ajustes de la colección, URL y cuerpo, «no es un secreto» para descartar un falso positivo (hay que decidir dónde guardarlo sin tocar el formato de la colección), comando de la CLI (`bru check`, idea 4) y reutilizar los patrones desde `ipc/ai/context.js` (hoy son dos listas, con la misma intención; unificarlas es una tarea aparte). Las reglas por organización serían la versión de pago.

**Idea 13, verificación del motor de Git (2026-11-12).** Se recorrió `utils/git.js` sobre un repositorio temporal real con una colección `.yml` (git 2.56), llamando a las funciones tal como las usaría la interfaz.
- **Lo que hay y funciona:** unas 45 funciones exportadas. Verificadas: raíz del repositorio, cambios (sin preparar, preparados, conflictos, límite de 5000 archivos), preparar, confirmar, rama actual y ramas, crear y cambiar de rama, historial de la colección, historial de **un archivo**, archivos de un commit, diffs (sin preparar, de commit), contenido antes y después para el diff visual (ya interpretado como petición), grafo de commits, stash y conteo de adelantados y atrasados. Pendientes de verificar: push, pull, fetch, remotos y resolución de conflictos (necesitan un remoto).
- **Lo que falta:** (1) **IPC**: solo 3 de ~45 funciones tienen canal (`clone-git-repository`, URL remota, ramas de una URL); (2) **interfaz**: no hay panel de Git; `components/Git/VisualDiffViewer` contiene piezas de presentación (las usa también la sincronización OpenAPI) pero **no** el visor que las junta; (3) **blame**: no existe en el motor, aunque `git blame` funciona sobre los `.yml` y cada línea se asigna sin ambigüedad a un campo (probado: `url`, valor de una cabecera); (4) **pruebas**: el motor solo tiene 6 (clonar y analizar ramas remotas), así que casi todo lo que se verificó a mano no está protegido.
- **Particularidades a tener en cuenta:** `getUnstagedFileDiff` exige una ruta absoluta; `checkoutGitBranch` necesita una ventana (envía progreso); sin remoto configurado `getAheadBehindCount` devuelve «adelantados = todos los commits», así que la interfaz debe comprobar antes que hay remoto; todo depende del binario `git` del sistema (hay una pieza `GitNotFoundModal`, no comprobado quién la usa).
- **Red:** fetch, pull, push y clone son llamadas iniciadas por el usuario hacia el remoto propio y ya figuran en `docs/privacy/network-inventory.md`.
- **Plan propuesto:** F0 pruebas del motor sobre repositorios temporales (S); F1 canales IPC y panel «Git» de la colección: cambios por petición con su nombre, preparar, confirmar y cambiar de rama, **con el detector de secretos delante del commit** (M); F2 historial por petición y diff visual de petición (M); F3 blame por campo, función nueva que asigna cada línea del `.yml`/`.bru` a su campo (M); F4 push, pull, stash, grafo y conflictos (M–L). Decisión de negocio abierta: qué fases son gratuitas y cuáles de pago (Bruno limita Git a repositorios públicos en su plan gratuito, según el informe).

**Idea 13, control de versiones gráfico — construido (2026-11-12), fases F0 a F4.** Pestaña **Git** en los ajustes de la colección. Todo se limita a la **carpeta de la colección** (`collection.pathname`, que ya se guarda): aunque el repositorio contenga más cosas, los cambios, el historial y las operaciones sobre archivos solo ven la colección, y cualquier ruta fuera de ella se rechaza en el proceso principal.
- **F0, pruebas del motor:** `utils/git-collection.spec.js` (27) corre contra repositorios temporales reales, con un remoto «bare» local para push, fetch y pull; `git-blame.spec.js` (10). De paso se corrigió `findGitRootPath`, que cortaba la ruta en el primer «.git» que encontraba (una carpeta `.github` o `api.git` la rompía).
- **F1, panel:** si no hay repositorio, «Start tracking changes» lo crea en la carpeta de la colección. Con repositorio: rama actual con menú para cambiar o crear rama; dos listas, *Staged* y *Changes*, donde cada archivo aparece **por el nombre de la petición** (con la ruta al lado); acciones al pasar el ratón (*Stage*, *Unstage*, *Discard* con confirmación en dos pasos, *Stage all*, *Unstage all*); caja de commit que solo se activa con mensaje. **Antes del commit avisa si el detector de secretos encontró algo** y si hay archivos preparados en otra parte del repositorio que también entrarían.
- **F2, historial y diff:** historial de la colección (mensaje, autor, cuándo, hash corto); al abrir un commit, sus archivos; al elegir uno, el diff **como petición** (reutiliza el diff visual de la sincronización OpenAPI) con cambio a vista de texto. Lo mismo para los cambios pendientes.
- **F3, blame por campo:** vista *By request*: se elige una petición y se ve quién cambió por última vez cada parte («URL», «Header Accept», «Auth»...), cuándo y con qué commit, más el historial de esa petición. Función nueva `utils/git-blame.js`: asigna cada línea de `git blame` al campo al que pertenece en `.yml` y `.bru`; una línea sin confirmar gana («You · not committed yet») y dos commits del mismo segundo se ordenan por el historial.
- **F4, remoto y apartar cambios:** *Pull*, *Push* y *Fetch* con el recuento de commits por delante y por detrás (solo si hay remoto y rama con seguimiento); *Put aside* (stash) para apartar cambios, recuperarlos o borrarlos; aviso de conflictos con *Abort merge*.
- **Código:** `bruno-electron/src/utils/git-collection.js` (lógica), `ipc/git-collection.js` (17 canales `renderer:git-*`), `bruno-app/src/components/CollectionSettings/Git/` (`Changes`, `History`, `Blame`, `Stashes`, `FileRow`, `FileDiff`), `hooks/useGitRepository`, `hooks/useGitQuery`, `utils/git-collection`.
- **Pruebas:** 37 del motor y blame, 17 de utilidades de la interfaz, 7 del panel de cambios, e2e `tests/collection/git-panel/` que recorre crear repositorio, commit, cambio externo, diff, historial, blame, rama nueva y apartar cambios (dos pasadas seguidas). Capturas revisadas en tema claro.
- **Sin cambios de formato en disco.** Red: pull, push y fetch son acciones del usuario hacia su propio remoto, ya inventariadas.
- **Añadido el 2026-11-13:**
  - **Historial como grafo.** El historial tiene dos modos, *List* (rama actual) y *Graph* (todas las ramas, remotos y etiquetas): nodos unidos por líneas, un carril y un color por rama, con el nombre de la rama junto al commit al que apunta. Al pasar el puntero por un nodo sale una tarjeta con el mensaje del commit, el autor, la fecha (exacta y relativa), el hash corto, las ramas y si es un merge. La distribución en carriles es una función pura (`layoutCommitGraph`) y cada fila dibuja su tramo (`History/CommitGraphCell`), así que no hay lienzo ni librería nueva. El motor devuelve los padres de cada commit ya reescritos por git a los commits que tocaron la colección, para que las líneas no se corten.
  - **Qué entra en el commit.** Encima de la caja de commit: «This commit will save 2 files: ping, list users. 1 other change is not staged and will stay out of it.» (con «and N more» si son muchos). Se suma a los avisos de secretos y de archivos preparados fuera de la colección.
  - **A qué proyecto está conectado.** Junto a la rama: «acme/billing-api on GitHub» (o GitLab, Bitbucket, Azure DevOps, o el nombre del servidor propio), con el icono del servicio; sin remoto dice «Only on this computer». Las credenciales que pueda llevar la dirección del remoto (`https://usuario:token@...`) se quitan en el proceso principal y nunca llegan a la interfaz.
  - **Fallo encontrado por el e2e:** el grafo incluía el commit interno del *stash*, porque `git log --all` también recorre `refs/stash`; ahora pide `--branches --remotes --tags`.
  - Pruebas: 4 más del motor (padres, ramas, remoto sin credenciales), 11 de utilidades (carriles y nombre del remoto), 5 del historial (modos, nodos, tarjeta) y 2 del resumen del commit; el e2e recorre también el grafo con dos ramas, la tarjeta y el nombre del proyecto. Captura del grafo revisada en tema claro.
- **Añadido el 2026-11-13, segunda parte:**
  - **Resolver conflictos dentro de la app.** Cuando una fusión se detiene, la vista *Changes* lista los archivos en conflicto (todos los que git no pudo fusionar: ambos lados lo cambiaron, un lado lo borró, ambos lo añadieron). Al elegir uno se ven las dos versiones **como petición**, lado a lado («Yours» / «Theirs»). Cada archivo se resuelve con *Keep mine* o *Take theirs*, que conserva ese lado entero; si el lado elegido había borrado el archivo, se borra. Cuando no queda nada en conflicto aparece *Finish merge*, que cierra la fusión con el mensaje que git preparó; mientras dura la fusión no se ofrece el commit normal. *Abort merge* sigue disponible. Si quedan conflictos en otra parte del repositorio, lo dice y no deja terminar.
  - **Conectar el remoto desde el panel.** Sin remoto, junto a «Only on this computer» hay «Connect to a remote»: se escribe la dirección (https, `git@host:ruta` o una carpeta) y queda conectado como `origin`; no se envía ni se descarga nada hasta pulsar *Push*, *Pull* o *Fetch*. Con remoto, al pulsar el nombre del proyecto se puede cambiar la dirección o desconectar. Guardar sin cambiar nada no toca el remoto (la dirección que se muestra va sin credenciales y escribirla de vuelta las borraría). La dirección se valida en el proceso principal (una que empiece por guion se rechaza) y no se escribe en el log.
  - **Fallo encontrado por las pruebas:** el historial de una colección que es el repositorio entero ocultaba las fusiones cuyo resultado era igual a uno de sus lados, porque se filtraba por ruta. Ahora solo se filtra cuando la colección está dentro de un repositorio mayor (`--full-history --simplify-merges`).
  - Pruebas: 15 más del motor con conflictos y remotos reales (46 en `git-collection`), 5 del panel durante una fusión y 6 del panel de Git; e2e `git-conflicts-and-remote.spec.ts` (dos pasadas): provoca un conflicto real, compara los dos lados, toma el de ellos, termina la fusión, conecta un remoto, hace push y desconecta. Capturas revisadas en tema claro.
- **Añadido el 2026-11-13, tercera parte — mezclar un conflicto parte por parte.** Debajo de la comparación «Yours» / «Theirs» hay «Or mix both, part by part»: una fila por cada parte de la petición que difiere (nombre, método, URL, parámetros, cabeceras, auth, cuerpo, variables, scripts, aserciones, tests, docs, ajustes, ejemplos) con *Mine* / *Theirs*. Es una fusión a tres bandas: con la versión común se sabe quién cambió cada parte, así que lo que solo cambió un lado ya viene elegido («only they changed it») y lo que cambiaron los dos espera una decisión («both changed it: choose one»). *Keep this mix* no se activa hasta que todas tienen lado, y el motor se niega a escribir si falta alguna, para no descartar en silencio el trabajo de nadie. El resultado se escribe con el mismo serializador que usa la app al guardar. No se ofrece cuando un lado borró el archivo o no es una petición. Código: `utils/git-merge-request.js`, `Git/ConflictMixer`. Pruebas: 9 de la mezcla, 5 del motor con un conflicto real, 4 del componente y el e2e `git-conflict-mix.spec.ts` (mi URL y su método en la misma petición, y terminar la fusión).
- **No hecho o no comprobado:** **dentro de una parte no se mezcla** (las cabeceras son una parte: se elige la lista entera de un lado); conflictos de un *rebase* (el panel solo hace fusiones); clonar desde este panel y gestionar más de un remoto; credenciales de un remoto privado (usa las que tenga `git` en el sistema; no probado con un remoto real de GitHub o GitLab); Windows y macOS; tema oscuro; `.bru` en la interfaz (el blame de `.bru` solo tiene pruebas unitarias). Un commit confirma todo lo preparado en el repositorio, no solo lo de la colección: por eso se avisa. Decisión de negocio abierta: qué parte es gratuita y qué de pago.

Orden sugerido si se elige solo una parte: **2, 3, 5 y 1**. La **13** es la más grande: el motor de Git ya está escrito pero sin conectar (verificado el 2026-11-09), así que el trabajo es el IPC y la interfaz. Ninguna entra en la v1 sin pasar su paso *Verificar primero*.
