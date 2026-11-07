# Inventario de llamadas de red de RestLab

Fecha: 2026-11-07 · Parte del hito M1 (local-first) del plan de la v1.

**Regla:** RestLab no envía nada por la red que el usuario no haya iniciado o activado. Toda llamada nueva debe caer en una de las categorías 1 a 3 de abajo.

Método: se buscó en `bruno-electron/src` y `bruno-app/src` (sin pruebas) todo uso de `fetch`, `axios`, `node-fetch`, `http(s).request`, `WebSocket`, `XMLHttpRequest` y `sendBeacon`, y se revisó el origen de cada hallazgo. No se probó la app en ejecución con la red bloqueada (pendiente).

## 1. Iniciadas por el usuario

| Qué | Dónde | Destino |
|---|---|---|
| Enviar peticiones HTTP, GraphQL, gRPC y WebSocket | `bruno-electron/src/ipc/network/` | El servidor que el usuario escribe |
| Pedir tokens OAuth2 | `bruno-electron/src/utils/oauth2.js` | Los endpoints que el usuario configura |
| Operaciones git (clone, fetch, push) | `bruno-electron/src/utils/git.js` | Los remotos del propio repositorio |
| Vista previa de una especificación en Swagger | `bruno-app/src/components/ApiSpecPanel/Renderers/Swagger/` | La especificación que el usuario abre |

## 2. Configuradas por el usuario y repetidas en segundo plano

| Qué | Dónde | Comportamiento |
|---|---|---|
| Sincronización con OpenAPI | `bruno-app/src/providers/App/useOpenAPISyncPolling.js` | Si una colección tiene `sourceUrl` y `autoCheck` no es `false`, consulta esa URL a los 10 s del arranque y cada 5 min. El destino es la URL que el usuario configuró, nunca un servidor del proyecto |

## 3. Opcionales, apagadas por defecto

| Qué | Dónde | Cómo se activa |
|---|---|---|
| Anuncios de Bruno (`appinfo.usebruno.com`) | `bruno-electron/src/ipc/notifications.js` | Preferencias > General > Privacy. Con la opción apagada no sale ninguna petición (cubierto por `notifications.spec.js`) |
| Proveedores de IA (OpenAI, Anthropic, endpoints compatibles) | `bruno-electron/src/ipc/ai/providers.js` | Requiere `ai.enabled` y una clave propia. Las pruebas de claves y los chats ocurren solo por acción del usuario |

## 4. Eliminadas

| Qué | Commit |
|---|---|
| Contador anónimo de visitas con PostHog (`useTelemetry`) y permiso `*.posthog.com` en la CSP | `feat(privacy): remove PostHog telemetry...` |
| Componente `GoldenEdition` (anuncio de pago que enviaba eventos a PostHog) | mismo commit |

## 5. Pendiente de decisión

| Qué | Dónde | Situación |
|---|---|---|
| Retorno OAuth2 `https://oauth.usebruno.com/callback` | `bruno-electron/src/utils/oauth2.js` (3 usos) y los placeholders de `OAuth2/AuthorizationCode` e `Implicit` | Es la dirección de retorno por defecto cuando el usuario no pone una. Con la ventana integrada la app intercepta la redirección. Con el navegador del sistema, el código de autorización pasa por una página alojada por Bruno antes de volver a la app por `bruno://` |

## Comprobado y sin hallazgos

- No hay actualizador automático (`autoUpdater`, `electron-updater`).
- La interfaz no carga fuentes, scripts ni imágenes externas por sí sola. Los enlaces solo se abren al hacer clic.
- La pestaña de changelog (`useChangelogOnUpdate`) es local y no usa la red.

## Pendiente de verificar

- Arrancar la app con la red bloqueada y confirmar que no hay errores ni avisos.
- Revisar `bruno-requests`, el paquete compartido que puede hacer llamadas propias, y el servidor mock (solo escucha en local, falta confirmar que no sale nada).
