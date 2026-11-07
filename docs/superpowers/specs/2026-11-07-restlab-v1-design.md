# RestLab v1 — Diseño

Fecha: 2026-11-07 · Estado: **borrador pendiente de aprobación**

## Intención y porqué

RestLab es un cliente de API (base: fork de Bruno, MIT) que busca ser más rápido, inteligente y personalizable que Postman y Bruno. El usuario debe preferirlo **incluso sin IA**.

Frustraciones que motivan el proyecto (dichas por el autor):
- Flujos lentos con pasos manuales (p. ej. indicar la "key" del body para adjuntar un archivo de cierto tipo).
- Chat de IA invasivo.
- Difícil encontrar lo que buscas la primera vez.

Visión completa, en tres piezas que se diseñan por separado y en este orden:
1. **v1 (este documento):** la base, mejor producto de uso diario.
2. **Sistema de extensiones** estilo VS Code (extension host, manifiesto, puntos de contribución; extensiones de fábrica opcionales y de terceros).
3. **Agente de IA** opcional, como extensión de fábrica, que ve proyecto, peticiones y respuestas, localiza el código que causa fallos y propone arreglos.

## Objetivos de la v1

1. **Autocompletado de rutas al escribir la URL.** Sugiere las rutas que el servidor realmente expone, no solo las guardadas.
2. **Adjuntar archivos sin configurar a mano.** La herramienta deduce el tipo y el campo; el usuario no escribe la "key".
3. **UI expresiva pero minimalista.** Siempre se sabe dónde hacer cada cosa, sin abrumar.
4. **Automatizar pasos repetitivos** que la herramienta pueda deducir.

## No objetivos de la v1

- Sistema de extensiones completo (solo se dejan ganchos internos limpios, sin API pública).
- Agente de IA.
- Análisis del código fuente para descubrir rutas (camino B) y descubrimiento por sondeo del servidor.

## Anti-objetivos

- IA que interrumpe, vigila en segundo plano o aparece sin que se la llame.
- Que la v1 requiera cuenta, nube o IA para ser útil.
- Una UI recargada: más funciones no deben significar más ruido.

## Restricciones

- Base: monorepo de Bruno (Electron + React; paquetes `bruno-app`, `bruno-electron`, `bruno-js`, `bruno-cli`, etc.). Se respeta la licencia MIT y su aviso.
- Las colecciones siguen siendo archivos de texto en disco, compatibles con control de versiones.
- Los secretos (tokens, cookies, variables de entorno) nunca salen de la máquina sin acción explícita del usuario. Esto condiciona el diseño de la IA futura.

## Enfoques considerados para el descubrimiento de rutas

| | Cómo | Ventaja | Costo |
|---|---|---|---|
| **A. Especificación (elegido)** | Busca `/openapi.json`, `/swagger` y similares en el servidor, o lee un archivo local | Exacto, rápido, da métodos y tipos | Solo sirve si el proyecto tiene spec |
| B. Código fuente | Detecta rutas según el framework | Funciona sin spec, da dominios de datos | Un detector por framework, mantenimiento alto |
| C. Sondeo | `OPTIONS`, páginas de docs, aprender del historial | Funciona con cualquier servidor | Aproximado; manda tráfico inesperado |

**Decisión del autor:** empezar por A. C se usa solo para comprobar si el servidor está en ejecución. B queda para una etapa posterior, probablemente como extensión de fábrica.

## Diseño de la v1 (a nivel de comportamiento)

**Rutas.** Al escribir una URL base, la app intenta localizar una especificación OpenAPI/Swagger (servidor o archivo local vinculado a la colección). Si la encuentra, ofrece rutas con método y parámetros, mezcladas con las guardadas y distinguidas visualmente. Indica si el servidor responde. Si no hay spec, no muestra nada falso: solo las rutas guardadas.

**Archivos.** Al adjuntar un archivo, la app deduce el tipo de contenido y propone el campo según la spec (si existe) o el último uso; el usuario puede cambiarlo, pero no tiene que escribirlo por defecto.

**UI.** Principios: pocos elementos visibles por pantalla, acciones agrupadas por intención, nombres claros, espacio y jerarquía visual sobre decoración. Los mockups se definen con el autor antes de implementar.

## Decisiones mías (a confirmar)

- Mantener Electron/React sobre el código de Bruno en lugar de reescribir.
- Si la spec es OpenAPI 3.x se soporta primero; Swagger 2.0 después.
- Detectar la spec solo cuando el usuario escribe una URL (nunca barridos automáticos).
- El nombre "RestLab" se toma de la carpeta del proyecto; no es definitivo.

## Pendiente para quien construya

- Cómo hace Bruno hoy la deducción del tipo de archivo (el autor dice que ya lo evita parcialmente): partir de ahí.
- Dónde guardar el vínculo colección → spec.
- Plan de pruebas (Playwright ya existe en el repo).
- Diseño visual (se hará con mockups).
