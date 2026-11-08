# RestLab v1 — Roadmap

> El roadmap completo (v1 y después) está en `docs/ROADMAP.md`. La meta A2 de abajo ya se hizo: ver `docs/branding.md`, sección "Decisiones tomadas".

Fecha: 2026-11-07 · Complementa `2026-11-07-restlab-v1-plan.md` (qué contiene cada hito) y `specs/2026-11-07-restlab-v1-design.md` (por qué).

Sin fechas: el tamaño de cada meta va en **S / M / L** (pequeña, mediana, grande). El orden sale de la evidencia del informe `reports/Debilidades de Bruno Postman Insomnia.md`.

## Cuándo se puede llamar "v1"

La v1 está lista cuando se cumplen **todas** estas condiciones:

1. **Local-first comprobado.** Con la red bloqueada la app arranca, funciona y no muestra avisos. El inventario de red (`docs/privacy/network-inventory.md`) está al día y no contiene llamadas propias sin interruptor.
2. **IA opcional y verificable.** Apagada por defecto, sin nada visible, y el usuario puede ver exactamente lo que se envía.
3. **Sin restos de otra marca que engañen.** Nada que envíe datos del usuario o lo dirija a servicios de Bruno sin decirlo (reporte de errores, documentación, changelog, CDN).
4. **Rápida.** Las mediciones de arranque, colección grande y respuesta grande están registradas y mejoran frente a la línea base.
5. **Instalable.** Hay instaladores de Linux, macOS y Windows que arrancan en una máquina limpia.
6. **Suites en verde.** Salvo fallos ya conocidos y documentados.

Las apuestas sin demanda comprobada (rutas desde OpenAPI y archivos) **no son condición de la v1**: entran si se validan.

## Dónde estamos

| Hito | Estado | Qué falta |
|---|---|---|
| **M0** Base | Casi | Identidad de la app (`appId`, esquema `bruno://`), aviso de copyright propio, las dos pruebas de fecha que dependen de la zona horaria |
| **M1** Local-first | Hecho en código y pruebas | Probar OAuth2 con un proveedor real; resto de referencias a Bruno (ver meta A2) |
| **M-P** Rendimiento | Sin empezar | Medir y corregir |
| **M2** IA opcional | Hecho en código y pruebas | Verla funcionar en la app con un proveedor real y con Ollama |
| **M3** Rutas desde OpenAPI | Sin empezar | Todo; es una apuesta a validar |
| **M4** Archivos | Sin empezar | Todo; es una apuesta pequeña |
| **M5** UI | Sin empezar | Mockups y aplicación |
| **M6** Salida | Sin empezar | Ver fase E |

Qué significa "hecho en código y pruebas": las suites automáticas pasan (Electron 1,659 pruebas; interfaz 3,464, con 2 fallos de zona horaria anteriores a este trabajo), pero **yo no he abierto la app para verlo**. La parte visual (etiqueta "Offline mode", panel "What's sent", nombre RestLab) la valida quien la use.

## Fase A — Cerrar la confianza

### A1. Verificar en la app real · S
Es lo único que convierte "pasa las pruebas" en "funciona". Lista concreta:

- Etiqueta "Offline mode" y "Back online" en los temas claro y oscuro, con y sin Docker activo.
- OAuth2 con navegador del sistema contra un proveedor real, usando `http://127.0.0.1:47831/oauth2/callback`.
- IA con un proveedor real y con Ollama local: chat, generar, vista previa "What's sent" y "Review before sending".
- Que con la IA apagada no aparezca ningún botón ni panel de IA, en ninguna pestaña.

**Listo cuando:** cada punto tiene un resultado anotado, y lo que falle pasa a la lista de correcciones.

**Resultado (2026-11-07), con la app real y Playwright:**

| Punto | Resultado |
|---|---|
| Etiqueta "Offline mode" y "Back online" | Comprobado en los temas claro y oscuro: aparece sin ícono, cambia a "Back online" y desaparece sola |
| IA apagada | Comprobado: sin botón, panel ni composer en ninguna pestaña |
| Vista previa "What's sent" en Generar y en el chat | Comprobado: oculta la credencial de la URL y marca el valor oculto |
| "Review before sending" en Generar | Comprobado: retiene la petición, Cancel vuelve al texto escrito |
| Interruptor "Review before sending" en Preferencias | Comprobado |
| Nombre RestLab en la barra y el modal de bienvenida | Comprobado (5 pruebas del modal) |
| OAuth2 con un proveedor real | **Pendiente**: necesita una cuenta de un proveedor |
| IA con un proveedor real u Ollama respondiendo | **Pendiente**: la vista previa no llama al modelo, y esa llamada sigue sin verse en vivo |
| Red desconectada de verdad (wifi) | **Pendiente**: las pruebas simulan los eventos del navegador; la detección de ruta se probó solo con el sistema real conectado |

**Defecto encontrado al hacerlo:** el contador de valores ocultos incluía la mención de `<redacted>` en las instrucciones fijas. Corregido y cubierto con pruebas.

**Para ejecutar las pruebas end-to-end en un escritorio Wayland:** `PLAYWRIGHT_ELECTRON_ARGS="--ozone-platform=x11" npx playwright test ...` (ver `.claude/rules/testing.md`).

### A2. Cerrar lo que sigue apuntando a Bruno · S–M
Evidencia: confianza (A) y condición 3 de la v1. Detalle en `docs/branding.md`.

- Reporte de errores: el panel envía el error al repositorio de Bruno. Hace falta el repositorio de RestLab, o quitar el botón.
- Documentación exportada que carga archivos de un CDN de Bruno: incrustarlos o alojarlos.
- Changelog que dice "What's New in Bruno v4.4.0": escribir el de RestLab.
- Buscador global y ayuda que abren la documentación de Bruno.
- `appId`, esquema de enlaces y copyright propio.

**Listo cuando:** una búsqueda de "usebruno" en lo que ve el usuario solo encuentra enlaces que el texto presenta como de Bruno.

## Fase B — Rápido y sin fricción

### B1. Rendimiento (M-P) · M · evidencia A
Quejas repetidas en las tres herramientas: arranque, proyectos grandes, respuestas grandes.

- **Medir primero** (el repositorio ya tiene `playwright.benchmark.config.ts`): arranque en frío, colección de más de 500 peticiones, respuesta de 5 a 10 MB. Guardar en `docs/perf/`.
- Corregir los **dos** cuellos de botella mayores que salgan. No más.

**Listo cuando:** hay números antes y después, y mejoran.

### B2. Los fallos más votados del fork · M por cada uno · evidencia A/B
Del informe, ordenados por reacciones y por impacto diario:

| Qué | Referencia en Bruno | Reacciones |
|---|---|---|
| Entornos anidados | #292 | 49 |
| Flujos OAuth2 con navegador del sistema | #6710, #4762 | — |
| Reinicio del token OAuth2 | #4392 | 28 |
| Certificados autofirmados | #4949 | — |
| Barra de pestañas desactivable | #1739 (Bruno), #8488 (Insomnia) | 17 / ~40 |
| Apertura lenta de proyectos y respuestas grandes | #2416, #5944 | — |

No son todos para la v1. **Se eligen los tres con más evidencia después de medir (B1)**, porque dos de ellos pueden resolverse con las mismas correcciones de rendimiento. Antes de tocar cada uno hay que comprobar si el fork ya lo trae corregido.

### B3. Importación fiel de OpenAPI · M · evidencia B
Prerrequisito de la meta C1: sin buena importación, el autocompletado no sirve.

- Variables de servidor, host y esquemas grandes (quejas concretas en el informe).
- Pruebas con 3 especificaciones reales: pequeña, grande y con variables de servidor.

## Fase C — Las apuestas, con validación

Ninguna tiene demanda comprobada. Se construyen **pequeñas** y se validan antes de pulirlas.

### C1. Autocompletado de rutas (M3) · L
Plan detallado en el plan de la v1. Orden: índice de rutas desde una especificación → fuente de la especificación (vinculada, archivo local, o servidor al escribir la URL base) → lista desplegable en la barra de URL → indicador de si el servidor responde.

- No se muestra nada inventado si no hay especificación.
- La búsqueda automática de `/openapi.json` en el servidor se puede apagar, y está en el inventario de red.

### C2. Archivos con menos pasos (M4) · S
Bruno ya deduce el tipo de contenido. Lo que queda manual es el nombre de la clave: rellenarlo desde la especificación, el último uso o el nombre del archivo, siempre editable.

### C3. Sesión de validación · S
3 a 5 desarrolladores que usen OpenAPI. Se les pide una tarea real con C1 y C2 y se anota si los usan sin que se les diga. Si no los usan, no se pulen y no bloquean la v1.

## Fase D — Interfaz y primer uso

### D1. UI minimalista (M5) · M
- **Mockups antes de código**, contigo (con las skills `ui-taste` y `building-components`).
- Barra de pestañas desactivable por usuario.
- Que alguien nuevo cree y envíe una petición sin ayuda.
- Aplicar el nombre y el logo oficiales cuando existan (`docs/branding.md`).

## Fase E — Salida

### E1. Base interna para extensiones · S
Solo documentada (ADR), **sin API pública**: dónde se engancharía el sistema de extensiones para no cerrar puertas. Es la preparación de la fase 2.

### E2. Paquetes e instaladores · M
- Instaladores firmados para Linux, macOS y Windows con el nombre RestLab.
- Pipeline de compilación y pruebas.
- Comprobar que una instalación limpia arranca y que la carpeta de datos es la esperada.

### E3. Revisión final · S
- `/code-review` y `/security-review` sobre toda la rama.
- Repetir el inventario de red completo con la red bloqueada.
- Compatibilidad del formato en disco: abrir colecciones de Bruno y guardar sin pérdidas (`.claude/rules/dsl-changes.md`).

### E4. Documentación mínima · S
Qué es RestLab, la promesa local-first, cómo activar la IA y cómo ver lo que se envía, cómo registrar la dirección de retorno de OAuth2.

## Fuera de la v1

| Qué | Por qué se queda fuera |
|---|---|
| Sistema de extensiones público y marketplace | Es un proyecto aparte; la v1 deja la puerta preparada (E1) |
| "Explicar este fallo" con IA y acceso al código fuente | Necesita el sistema de extensiones y decidir cuánto detalle de las respuestas ve la IA |
| Sincronización con Google Drive y colaboración en la nube | Idea guardada en `docs/superpowers/ideas/`; después de la v1 |
| Servidor mock nuevo, monitores, pruebas de carga y de contrato | Los usuarios que se van de Postman rechazan ese peso; sin demanda medida |
| Simulación de tráfico y verificación de integridad como extensiones | Dependen del sistema de extensiones |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Lo hecho solo está probado con pruebas automáticas | Meta A1, antes de añadir más |
| Las apuestas (C1, C2) consumen tiempo sin demanda | Se construyen pequeñas y la sesión C3 decide si siguen |
| Cambios de marca que sigan filtrando datos a Bruno | Meta A2 y revisión E3 |
| Un redactor de secretos que no ve todo | La vista previa existe por eso; el límite está documentado |
| Divergencia con Bruno al traer solo algunos arreglos | Registrar en cada commit de qué arreglo upstream viene |

## Regla para decidir qué entra

- **Evidencia A o B:** entra en la v1.
- **Evidencia C (apuesta):** entra solo si C3 la valida.
- **Sin evidencia:** se queda fuera hasta tenerla.

## Pendiente de decidir contigo

1. ¿Cuál es el repositorio donde se reportarán los errores de RestLab, o prefieres quitar el botón por ahora?
2. ¿Qué tres de la lista B2 priorizamos tras medir el rendimiento?
3. ¿Quién forma parte de la sesión de validación C3?
4. ¿Qué plataformas debe cubrir el primer instalador?
