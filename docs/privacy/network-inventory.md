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

**Decisión sobre `autoCheck` (2026-11-08):** se deja como está. El sondeo no existe sin una `sourceUrl` que el usuario haya pegado y guardado en la configuración de la colección, y el destino es exactamente esa URL; es la función que el usuario pidió al configurar la sincronización, no una conexión de la app consigo misma. El interruptor `autoCheck` permite apagarlo por colección. Convertirlo en opt-in (apagado hasta que el usuario active un interruptor aparte) sería un cambio de producto separado, no un requisito de privacidad: no hay destino oculto ni dato que el usuario no haya aportado. Si en el futuro se añade una fuente por defecto o un servidor del proyecto, esta decisión deja de aplicar y el sondeo tendría que pasar a la categoría 3.

## 3. Opcionales, apagadas por defecto

| Qué | Dónde | Cómo se activa |
|---|---|---|
| Anuncios de Bruno (`appinfo.usebruno.com`) | `bruno-electron/src/ipc/notifications.js` | Preferencias > General > Privacy. Con la opción apagada no sale ninguna petición (cubierto por `notifications.spec.js`) |
| Proveedores de IA (OpenAI, Anthropic, endpoints compatibles) | `bruno-electron/src/ipc/ai/providers.js` | Requiere `ai.enabled` y una clave propia. Las pruebas de claves y los chats ocurren solo por acción del usuario. El autocompletado de scripts, que envía el código mientras se escribe, es una activación aparte (`ai.autocomplete.enabled`) y también está apagado por defecto |

## 4. Eliminadas

| Qué | Commit |
|---|---|
| Contador anónimo de visitas con PostHog (`useTelemetry`) y permiso `*.posthog.com` en la CSP | `feat(privacy): remove PostHog telemetry...` |
| Componente `GoldenEdition` (anuncio de pago que enviaba eventos a PostHog) | mismo commit |
| Visor de la documentación generada cargado desde `cdn.usebruno.com`: ahora va incrustado en el archivo | `Embed the API docs viewer...` |
| Retorno OAuth2 por la página de Bruno (`https://oauth.usebruno.com/callback`) | `feat(oauth2): use a local callback server...` |

## 5. Comportamiento actual de OAuth2

La dirección de retorno por defecto es `http://127.0.0.1:47831/oauth2/callback` (`DEFAULT_OAUTH2_CALLBACK_URL` en `bruno-electron/src/utils/oauth2-loopback-server.js`). El usuario la registra una vez en su proveedor.

- **Ventana integrada:** la app intercepta la redirección. Si la interceptación fallara, la petición iría a esa dirección local, no a un servidor externo.
- **Navegador del sistema:** la app abre un servidor temporal que escucha solo en `127.0.0.1`, recibe la respuesta, valida el `state` y se cierra al terminar, al cancelar o a los 5 minutos. Si el puerto está ocupado, el error indica cómo usar otra dirección.
- **Dirección personalizada que no es local:** se comporta como antes (la página del usuario redirige a `bruno://app/oauth2/callback`).
- **Límite conocido:** el servidor temporal solo atiende direcciones `http://127.0.0.1:<puerto>`; `localhost` no se trata como local.

## 6. Modo estricto de red (2026-11-13)

Interruptor en Preferencias > General > Privacy (`general.strictNetwork`, apagado por defecto). Con él activo:

- **Las ventanas de la app no pueden cargar nada de otra máquina.** Un filtro en el proceso principal (`bruno-electron/src/app/strict-network.js`, `webRequest.onBeforeRequest`) cancela toda petición `http`, `https`, `ws`, `wss` o `ftp` de la sesión principal y de la sesión de las apps incrustadas cuyo destino no sea esta máquina (`localhost`, `*.localhost`, `127.x.x.x`, `::1`). Cubre, por ejemplo, una imagen remota en la documentación, los recursos de una respuesta HTML vista como página o una llamada desde una app incrustada.
- **Se pausan las comprobaciones en segundo plano:** el sondeo de OpenAPI sync (categoría 2) y los anuncios (categoría 3), aunque sus propios interruptores estén activos. «Check now» sigue funcionando porque lo pulsa el usuario.
- **Cada intento bloqueado se cuenta** y Privacy muestra cuántos y a qué direcciones desde que arrancó la app. Lo normal es cero.

**Lo que no bloquea, a propósito:** las peticiones que el usuario envía, las peticiones de token OAuth2 (la ventana integrada usa su propia sesión), git y los proveedores de IA si el usuario los activó. Todas salen del proceso principal por acción del usuario. Límite conocido: el modo no es un cortafuegos; no cubre lo que haga un script del usuario ni un proceso externo como `git`.

Pruebas: `strict-network.spec.js` (qué direcciones pasan y cuáles no, y el contador) y el e2e `tests/preferences/strict-network/`, que con el modo activo intenta cargar una imagen de `203.0.113.7` (rango reservado, nunca enrutado) y comprueba que se cancela y se cuenta.

## Comprobado y sin hallazgos

- No hay actualizador automático (`autoUpdater`, `electron-updater`).
- La interfaz no carga fuentes, scripts ni imágenes externas por sí sola. Los enlaces solo se abren al hacer clic.
- La pestaña de changelog (`useChangelogOnUpdate`) es local y no usa la red.

- `bruno-requests` (paquete compartido) solo contiene ayudantes de autenticación (digest, NTLM, EdgeGrid, OAuth2), el cliente HTTP y WebSocket, y el envío de peticiones desde scripts. Vault (`node-vault.ts`) y el archivo PAC de proxy (`pac-resolver.ts`) contactan solo la dirección que el usuario configura. Los hosts `*.usebruno.com` que aparecen ahí son datos de prueba.
- El servidor mock escucha solo en `127.0.0.1` (`mock-server.js`).
- El aviso "Offline mode" no hace ninguna petición. En Linux lee `/proc/net/route` y `/proc/net/ipv6_route` cada 3 segundos para saber si existe una ruta por defecto (`ipc/network-status.js`), porque `navigator.onLine` sigue en verdadero con interfaces de Docker activas.

- La vista previa de lo que se envía a la IA (`renderer:ai-chat-preview` y `renderer:ai-generate-preview`) solo arma texto en el proceso principal con el mismo código que el envío real. No contacta a ningún proveedor, y las pruebas lo verifican.
- Con la IA apagada, ningún manejador llega a un proveedor (`ipc/ai/ai-disabled.spec.js`). El autocompletado de scripts necesita además su propio interruptor.

## Qué se oculta antes de llegar a un proveedor

Todo lo que sale hacia un proveedor de IA pasa por `ipc/ai/context.js`, que oculta:

- Cabeceras y parámetros con nombre sensible, y los parámetros y la contraseña (`usuario:clave@`) de las URL.
- Valores con forma de credencial (JWT, claves `sk-`, Stripe, GitHub, AWS, Slack, Google, claves privadas, `Bearer`/`Basic`) en cualquier parte: cuerpos, scripts, tests, documentación y las URL de las demás peticiones de la colección.
- Literales entre comillas asignados a un nombre sensible en el código, y pares `clave=valor` y elementos XML sensibles en los cuerpos de texto.
- De las respuestas, solo la estructura: claves y tipos, sin valores.

En scripts, tests, documentación y apps la ocultación es **reversible**: cada valor oculto recibe un marcador numerado (`<redacted:1>`) y los valores reales se restauran en lo que el asistente escribe, para que "Aplicar" no pueda borrar un valor real.

Límite conocido: un secreto sin forma reconocible dentro de texto libre, o repetido bajo un nombre que no parece sensible, no se detecta. Para eso existe la vista previa.

## Pendiente de verificar

- Arrancar la app con la red bloqueada y confirmar que no hay errores ni avisos.
