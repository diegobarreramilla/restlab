# RestLab v1 — Plan de implementación

Fecha: 2026-11-07 · Estado: **en ejecución**. El orden, el avance y las metas siguientes están en `2026-11-07-restlab-v1-roadmap.md`.

Basado en: el diseño de la v1, el informe `reports/Debilidades de Bruno Postman Insomnia.md` y una revisión del código actual.

## Qué cambió tras revisar el código

| Hallazgo | Consecuencia |
|---|---|
| Multipart ya deduce el Content-Type (`utils/common/multipartContentType`, usado en `RequestPane/MultipartFormParams`) | El objetivo "sin configurar la key" se reduce a **pre-llenar el nombre de la clave**, no a detectar el tipo |
| `QueryUrl` no tiene autocompletado; sí existen `slices/apiSpec.js`, `slices/openapi-sync.js` y `components/OpenAPISpecTab` | El autocompletado de rutas se apoya en una spec **ya vinculada**; no se parte de cero |
| El fork trae `AiChatSidebar` (~1,000 líneas), `AIAssist` y `SettingsAiAssist` | Antes de añadir nada de IA, hay que **auditar su comportamiento por defecto** |
| El informe: confianza (sin cuenta, sin sorpresas) es la queja nº1; rendimiento nº3 | Se añaden dos hitos que el diseño no tenía: auditoría local-first y rendimiento |

## Orden y dependencias

```
M0 Base ──► M1 Local-first ──► M2 IA opt-in ──► M3 Rutas ──► M4 Archivos ──► M5 UI ──► M6 Pulido
                    └──────────► M-P Rendimiento (en paralelo desde M1)
```

Cada hito termina con: pruebas verdes, `npm run lint:fix` limpio y revisión contra `CODING_STANDARDS.md`.

## M0 — Base y línea de referencia (tamaño S)

- Confirmar que el fork compila y corre: `nvm use && npm i --legacy-peer-deps && npm run setup`, luego `npm run dev`.
- Correr la línea base de pruebas (`npm test --workspaces`) y anotar fallos que **ya existen** para no atribuírnoslos.
- Decidir identidad: nombre definitivo, ID de app, ícono; mantener aviso de licencia MIT de Bruno.
- Crear el fichero `docs/decisions/` para registrar decisiones (ADR cortas).

**Listo cuando:** la app abre, las pruebas dan un resultado conocido, el nombre está decidido.

## M1 — Promesa local-first (tamaño M)

Es la prioridad 1 del informe (evidencia A).

- Auditar y listar toda llamada de red que no inicie el usuario: telemetría, analíticas, chequeo de actualizaciones, notificaciones, anuncios (`components/Notifications`, `ChangelogTab`, `BrunoSupport`).
- Cada una: eliminar, o dejarla **apagada por defecto** con interruptor en Preferencias.
- Verificar que nada requiera cuenta ni login para ningún flujo.
- Documentar la promesa en `readme.md` y en una pantalla de primer arranque de una línea.

**Listo cuando:** con la red bloqueada, la app arranca y envía peticiones a localhost sin errores ni avisos; la lista de llamadas está documentada.

## M-P — Rendimiento (tamaño M, en paralelo)

Evidencia A del informe (#2416 apertura lenta, #5944 respuestas grandes).

- Medir primero: arranque en frío, apertura de una colección de 500+ peticiones, respuesta de 5–10 MB. Guardar números en `docs/perf/`. `slices/performance.js` y `playwright.benchmark.config.ts` ya existen y sirven de punto de partida.
- Corregir los dos cuellos de botella mayores que salgan de la medición (no más).

**Listo cuando:** hay números antes/después y cada uno de los dos casos mejora de forma medible.

## M2 — IA estrictamente opcional (tamaño M)

Evidencia A para las condiciones (rechazo a la IA impuesta).

- **Auditar primero:** ¿`AiChatSidebar` está visible por defecto? ¿abre solo? ¿qué datos manda y adónde? Registrar la respuesta.
- Dejarla **apagada por defecto**, sin panel, sin botón en la barra, sin avisos. Se activa solo en Preferencias.
- Mantener: clave propia, modelo local, redacción de secretos antes de enviar (verificar que existe; si no, implementarla).
- Llamarla solo por orden explícita del usuario; sin análisis en segundo plano.

**Listo cuando:** instalación limpia no muestra nada de IA; activarla requiere un acto consciente; con ella apagada no sale ninguna petición hacia un proveedor.

## M3 — Autocompletado de rutas (tamaño L, **hipótesis a validar**)

Evidencia C: nadie lo pide con esas palabras. Se construye pequeño y se prueba con usuarios.

1. **Índice de rutas.** Función pura que, dada una spec OpenAPI 3.x, devuelve `[{ método, ruta, parámetros }]`. Tests unitarios con 2–3 specs reales (pequeña, grande, con variables de servidor).
2. **Fuente de la spec**, en este orden: (a) la spec ya vinculada a la colección (`apiSpec` / `openapi-sync`); (b) archivo local elegido por el usuario; (c) buscar `/openapi.json`, `/swagger.json`, `/v3/api-docs` en el servidor **solo cuando el usuario escribe una URL base**.
3. **UI en `RequestPane/QueryUrl`:** lista desplegable debajo de la barra, con método y ruta; mezcla las guardadas (marcadas distinto). Atajo de teclado para aceptar.
4. **Estado del servidor:** indicador discreto (responde / no responde). Ninguna petición se envía sin acción del usuario salvo el chequeo de la spec del punto 2c, y ese chequeo se puede apagar.
5. Sin spec: no se muestra nada inventado.

**Listo cuando:** con una spec válida las rutas aparecen al escribir; sin spec, la barra se comporta como hoy; tests de unidad del índice y un test e2e (Playwright, `--project=default`).

**Validación:** antes de pulirlo, dárselo a 3–5 desarrolladores que usen OpenAPI y anotar si lo usan. Si no, no se pule más.

## M4 — Adjuntar archivos con menos pasos (tamaño S, **hipótesis a validar**)

Evidencia C. Alcance reducido porque el tipo ya se deduce.

- Al elegir o soltar un archivo en `MultipartFormParams`, pre-llenar el **nombre de la clave**: desde la spec (M3) si hay un campo de tipo archivo; si no, desde el último nombre usado en esa colección; si no, el nombre del archivo.
- Siempre editable; nunca bloquear.
- Arrastrar y soltar un archivo sobre el body crea la fila ya configurada.

**Listo cuando:** soltar un archivo deja una fila válida sin escribir nada; pruebas de unidad de la lógica de nombres.

## M5 — UI minimalista (tamaño M)

- **Antes de código:** mockups contigo (se propone abrir el visual companion).
- Candidatos con evidencia B: barra de pestañas desactivable por usuario (Bruno #1739, Insomnia #8488); menos controles visibles a la vez; agrupar acciones por intención.
- Revisar flujo de primer uso: qué ve alguien que abre la app por primera vez y cómo encuentra "nueva petición".
- Reglas del proyecto: componentes en `<Nombre>/index.js`, Tailwind para layout, `theme` para colores, `data-testid` para Playwright.

**Listo cuando:** los mockups están aprobados y la implementación coincide; una persona nueva completa "crear y enviar una petición" sin ayuda.

## M6 — Pulido y salida (tamaño S)

- Ganchos internos mínimos para extensiones (solo documentados como ADR, **sin API pública**).
- Revisión con `/code-review` y `/security-review`.
- Pruebas e2e de los flujos de M3 y M4; corrida completa de la suite.
- Compatibilidad del formato en disco (`.bru`/`.yml`): ningún cambio rompe colecciones existentes (ver `.claude/rules/dsl-changes.md`).

## Fuera de la v1

Sistema de extensiones público, marketplace, agente de IA completo, descubrimiento por código fuente (camino B), servidor mock nuevo, colaboración en la nube, pruebas de carga y de contrato.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| M3 y M4 no tienen demanda comprobada | Se mantienen pequeños y se validan con usuarios antes de pulirlos |
| El fork hereda IA y funciones de pago de Bruno v4 | M1 y M2 auditan y apagan por defecto lo que no queramos |
| Cambios al formato en disco rompen colecciones | Regla `dsl-changes.md`; pruebas de compatibilidad |
| Dependencia de la versión de Bruno desde la que se bifurcó | Decidir en M0 si se sincroniza con upstream o se separa |

## Pendiente de decidir contigo

1. ¿Nombre definitivo del producto?
2. ¿Se sigue sincronizando con Bruno (traer sus mejoras) o se separa del todo?
3. ¿Orden: M1 y M2 primero (confianza) o M3 primero (tu idea más original)?
