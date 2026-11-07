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
| Sincronización con OpenAPI | `bruno-app/src/providers/App/useOpenAPISyncPolling.js` | Si una colección tiene `sourceUrl` y `autoCheck` no es `false`, consulta esa URL a los 10 s del arranque y cada 5 min. También reintenta una vez cuando vuelve la conexión. El destino es la URL que el usuario configuró, nunca un servidor del proyecto |

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
| Retorno OAuth2 por la página de Bruno (`https://oauth.usebruno.com/callback`) | `feat(oauth2): use a local callback server...` |

## 5. Comportamiento actual de OAuth2

La dirección de retorno por defecto es `http://127.0.0.1:47831/oauth2/callback` (`DEFAULT_OAUTH2_CALLBACK_URL` en `bruno-electron/src/utils/oauth2-loopback-server.js`). El usuario la registra una vez en su proveedor.

- **Ventana integrada:** la app intercepta la redirección. Si la interceptación fallara, la petición iría a esa dirección local, no a un servidor externo.
- **Navegador del sistema:** la app abre un servidor temporal que escucha solo en `127.0.0.1`, recibe la respuesta, valida el `state` y se cierra al terminar, al cancelar o a los 5 minutos. Si el puerto está ocupado, el error indica cómo usar otra dirección.
- **Dirección personalizada que no es local:** se comporta como antes (la página del usuario redirige a `bruno://app/oauth2/callback`).
- **Límite conocido:** el servidor temporal solo atiende direcciones `http://127.0.0.1:<puerto>`; `localhost` no se trata como local.

## Comprobado y sin hallazgos

- No hay actualizador automático (`autoUpdater`, `electron-updater`).
- La interfaz no carga fuentes, scripts ni imágenes externas por sí sola. Los enlaces solo se abren al hacer clic.
- La pestaña de changelog (`useChangelogOnUpdate`) es local y no usa la red.

- `bruno-requests` (paquete compartido) solo contiene ayudantes de autenticación (digest, NTLM, EdgeGrid, OAuth2), el cliente HTTP y WebSocket, y el envío de peticiones desde scripts. Vault (`node-vault.ts`) y el archivo PAC de proxy (`pac-resolver.ts`) contactan solo la dirección que el usuario configura. Los hosts `*.usebruno.com` que aparecen ahí son datos de prueba.
- El servidor mock escucha solo en `127.0.0.1` (`mock-server.js`).
- El aviso "Offline mode" no hace ninguna petición. En Linux lee `/proc/net/route` y `/proc/net/ipv6_route` cada 3 segundos para saber si existe una ruta por defecto (`ipc/network-status.js`), porque `navigator.onLine` sigue en verdadero con interfaces de Docker activas.

## Pendiente de verificar

- Arrancar la app con la red bloqueada y confirmar que no hay errores ni avisos.
