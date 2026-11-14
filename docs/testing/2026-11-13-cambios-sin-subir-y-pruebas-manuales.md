# Cambios sin subir y pruebas manuales — 2026-11-13

Rama `restlab/v1-local-first`. Este documento cubre los **25 commits** que están en tu equipo y todavía no en `origin/restlab/v1-local-first` (`git log origin/restlab/v1-local-first..HEAD`): 101 archivos, unas 7200 líneas añadidas.

Tiene dos partes: **qué se añadió** y **qué deberías probar tú a mano**. Las pruebas automáticas ya pasan; lo que sigue es lo que una máquina no juzga bien (cómo se ve, cómo se siente, tus datos reales, un remoto de verdad).

- Detalle técnico de cada cambio: `docs/ROADMAP.md` (secciones 4.2, 5.1 y 15).
- Bitácoras: `docs/sessions/2026-11-12.md` y `docs/sessions/2026-11-13.md`.

---

## 1. Qué se añadió

### 1.1 Rendimiento

| Commit | Qué hace |
|---|---|
| `4c75b5193` | Cambiar de tema en desarrollo tarda 0,2 s en vez de 3,7 s (solo afecta a `npm run dev`). |
| `c4740ff64` | Las respuestas grandes se decodifican con las funciones nativas del navegador y el visor de solo lectura ya no pasa el analizador de JSON. Bloqueo de la interfaz: 5 MB de 303 a 150 ms; 10 MB de 533 a 248 ms. |

### 1.2 Guardar petición (modal)

| Commit | Qué hace |
|---|---|
| `1bad660a5` | El modal ya no le quita el foco al campo del nombre. |
| `253d0058b` | Al crear una colección desde el modal, queda seleccionada. |
| `31c19d2d5` | La colección de destino aparece resaltada. |

### 1.3 Fallos heredados de Bruno (roadmap 5.1)

| Commit | Qué hace |
|---|---|
| `b3b5e8b4e` | **Entornos anidados**: la función ya existía; ahora se descubre. Un icono discreto marca en la lista los entornos que heredan de otro, y al copiar un entorno hay una casilla para que la copia herede en lugar de duplicar las variables. |
| `21b53b6e6` | **Certificados**: el aviso que explica un error de certificado no salía nunca (Node cambió el texto del error). Ahora reconoce los distintos casos, ofrece primero el CA propio y abre Preferencias con un botón. |
| `02df483e2` | **Token OAuth2**: el token sí se guardaba, pero tras reiniciar el panel decía «No token found». Ahora lo muestra. |

### 1.4 Detector de secretos

| Commit | Qué hace |
|---|---|
| `274d7d25c` | Motor que encuentra credenciales en texto plano: valores con forma de token, contraseñas en URL, campos de autenticación y cabeceras escritos a mano, variables de entorno sensibles sin marcar como secretas. Nunca devuelve el valor. |
| `103be29ce` | Línea discreta en la pestaña **Overview** de la colección (solo si hay algo) y aviso en el diálogo de compartir. |
| `92f46373a` | **Mark as secret** (una o todas) para variables de entorno, y el nombre del lugar es un enlace que lo abre. |
| `f5e2b9cc0`, `40659c8d7` | **Move to secret variable** para cabeceras, parámetros y autenticación de una petición: guarda el valor como variable secreta del entorno activo y deja `{{variable}}`. |
| `b8c33e81c` | Arreglo de un error de tipos que impedía compilar `bruno-common`. |

### 1.5 Control de versiones (pestaña Git de la colección)

Todo se limita a la carpeta de la colección, aunque el repositorio contenga más cosas.

| Commit | Qué hace |
|---|---|
| `cbe5b4213` | Motor: estado, preparar, descartar, commit, ramas, historial, diff, blame por campo, remoto, apartar cambios. Probado contra repositorios reales. |
| `2a4809da8` | Pestaña **Git**: cambios por nombre de petición, commit, ramas, historial, diff como petición, «By request» (quién cambió cada parte), Pull/Push/Fetch, «Put aside». |
| `8917427a6`, `06efe8933` | Historial como **grafo** con tarjeta al pasar el puntero; **resumen de lo que entra en el commit**; **proyecto remoto conectado** junto a la rama. |
| `1ce5a9beb`, `15c39cc40` | **Conflictos**: comparar «Yours» / «Theirs», *Keep mine* / *Take theirs*, *Finish merge*. **Remoto**: conectar, cambiar o desconectar desde el panel. |
| `0277f2d44`, `ae5677140` | **Mezclar un conflicto parte por parte**: la URL de un lado y las cabeceras del otro. |

### 1.7 Explicar por qué falló una petición
Commit `feat(app): explain why a request failed`. Cuando una petición falla, la app dice la causa probable y, si hay un ajuste que lo arregla, lo abre con un botón. Son reglas locales: no usa IA ni red. Si no reconoce una causa concreta, no dice nada. Sustituye al aviso anterior, que solo cubría certificados.

### 1.6 Documentación

`92bff2b96`, `61085ed75`, `5769a241f`: roadmap, bitácoras y decisiones aplazadas.

---

## 2. Pruebas manuales

**Antes de empezar**

1. `npm run dev` desde la raíz. Si tocaste algo de `bruno-common`, antes `npm run build:bruno-common`.
2. Usa una **copia** de una colección tuya, no la original: varias pruebas escriben en disco y hacen commits.
3. Ten `git` instalado y un nombre y correo configurados (`git config --global user.name` / `user.email`); sin eso el commit falla.
4. Repite las pruebas visuales en **tema claro y oscuro**: el oscuro no lo he visto en ninguna de estas pantallas.

Marca cada punto con ✅ o anota qué viste.

### 2.1 Respuesta grande

- [ ] Envía una petición que devuelva un JSON de varios MB. **Esperado:** la ventana no se queda congelada de forma perceptible y la respuesta se ve formateada como antes.
- [ ] Respuesta con acentos, emojis y caracteres chinos. **Esperado:** se ven bien, sin símbolos raros.
- [ ] Un cuerpo JSON con un error de sintaxis **en el editor de la petición** (no en la respuesta). **Esperado:** sigue marcando el error en rojo.

### 2.2 Entornos anidados

- [ ] Abre los entornos de una colección con al menos dos. En uno, elige otro en el icono de herencia de la cabecera. **Esperado:** aparece un icono pequeño y tenue junto a su nombre en la lista; al pasar el ratón dice de quién hereda.
- [ ] Copia un entorno sin marcar la casilla. **Esperado:** copia normal, con las variables duplicadas.
- [ ] Copia un entorno marcando «Inherit variables from … instead of copying them». **Esperado:** el nuevo nace vacío y muestra las variables del original como heredadas.
- [ ] Lo mismo en los entornos del espacio de trabajo (solo tiene pruebas unitarias).
- [ ] ¿El icono se nota sin molestar? Esa era la intención.

### 2.3 Certificados

- [ ] Envía una petición a un servidor HTTPS con certificado propio o autofirmado. **Esperado:** bajo el error, un texto tenue explica la causa y hay un botón «Open Preferences» que abre Preferencias.
- [ ] Carga el CA en «Use Custom CA Certificate» y reenvía. **Esperado:** funciona.

### 2.4 Token OAuth2

- [ ] Con una petición o colección con OAuth2, obtén un token. Cierra la app del todo y ábrela. Abre la pestaña Auth. **Esperado:** el token sigue ahí, no «No token found».
- [ ] **Pendiente importante:** probarlo con `authorization_code` y un proveedor real (GitHub sirve). Yo solo lo probé con `client_credentials`.

### 2.5 Detector de secretos

- [ ] En una colección limpia, abre Overview. **Esperado:** no aparece nada nuevo.
- [ ] Pega un token en una cabecera (por ejemplo `ghp_` seguido de 36 letras y números) y guarda. **Esperado:** en Overview aparece «1 value looks like a secret stored in plain text»; al abrirlo, dice en qué petición y campo, **sin mostrar el valor**.
- [ ] Haz clic en el nombre del lugar. **Esperado:** abre esa petición.
- [ ] Crea en un entorno una variable `password` con un valor y sin marcar como secreta. Pulsa «Mark as secret». **Esperado:** la fila desaparece y el archivo del entorno ya no contiene el valor.
- [ ] Con un entorno seleccionado, pulsa «Move to secret variable» en la fila de la cabecera. **Esperado:** en la petición queda `{{variable}}`, la petición sigue funcionando y el archivo ya no contiene el token.
- [ ] Sin ningún entorno seleccionado. **Esperado:** el botón sale deshabilitado y explica por qué.
- [ ] Abre «Share» en una colección con secretos. **Esperado:** aviso con el recuento.
- [ ] **Falsos positivos:** ábrelo en tus colecciones reales. Si marca algo que no es un secreto, anótalo: es lo que más me sirve.

### 2.6 Git: lo básico

- [ ] En una colección sin repositorio, pestaña **Git** → «Start tracking changes». **Esperado:** aparece la rama `main` y la lista de archivos por nombre de petición.
- [ ] «Stage all», escribe un mensaje y haz commit. **Esperado:** encima de la caja dice qué archivos guardará; después, «No changes».
- [ ] Edita y guarda una petición en la app; vuelve a la pestaña Git. **Esperado:** aparece en «Changes» con una M; al hacer clic se ve el cambio **como petición** (URL, cabeceras...), con opción de verlo como texto.
- [ ] «Discard». **Esperado:** pide confirmar una segunda vez antes de deshacer.
- [ ] Crea una rama desde el menú de la rama y cambia entre dos. **Esperado:** las peticiones de la barra lateral cambian con la rama.
- [ ] Abre una colección que esté **dentro de un repositorio más grande**. **Esperado:** solo se listan sus archivos; si hay cosas preparadas fuera, lo avisa antes del commit.

### 2.7 Git: historial, grafo y «By request»

- [ ] «History» en modo List y en modo Graph, con un repositorio que tenga ramas y fusiones. **Esperado:** nodos unidos por líneas, un color por rama, el nombre de la rama junto a su commit.
- [ ] Pasa el puntero por un nodo. **Esperado:** tarjeta con mensaje, autor y fecha, **al lado** del grafo.
- [ ] Haz clic en un commit y luego en un archivo. **Esperado:** se ve qué cambió ese commit.
- [ ] «By request»: elige una petición. **Esperado:** tabla con quién cambió por última vez cada parte, y debajo el historial de esa petición.
- [ ] **No probado por mí:** un repositorio con cientos de commits o muchas ramas en paralelo. Dime si el grafo se desordena o va lento.

### 2.8 Git: remoto

- [ ] En un repositorio sin remoto: «Connect to a remote», pega la dirección de un repositorio **vacío** tuyo y conecta. **Esperado:** junto a la rama aparece «usuario/proyecto on GitHub» (o el servicio que sea).
- [ ] «Push». **Esperado:** los commits llegan al remoto. **Esto no lo he podido probar con GitHub ni GitLab**, solo con una carpeta; depende de las credenciales que tenga `git` en tu sistema.
- [ ] Haz un commit desde otro sitio (la web de GitHub sirve), pulsa «Fetch» y luego «Pull». **Esperado:** «Pull 1» y, tras pulsarlo, el cambio aparece.
- [ ] Haz clic en el nombre del proyecto → «Disconnect». **Esperado:** vuelve a «Only on this computer».

### 2.9 Git: conflictos

Para provocar uno: en dos ramas, cambia la URL de la misma petición con valores distintos, haz commit en ambas y fusiona una en la otra (`git merge otra-rama` en una terminal, o un Pull que traiga un cambio sobre lo mismo).

- [ ] Abre la pestaña Git. **Esperado:** aviso rojo, la petición en «In conflict» y, al elegirla, las dos versiones lado a lado.
- [ ] «Take theirs» → «Finish merge». **Esperado:** queda la versión de ellos y el historial muestra la fusión.
- [ ] Repite y usa **«Or mix both, part by part»**: elige tu URL y sus cabeceras, «Keep this mix». **Esperado:** la petición resultante tiene las dos cosas y se abre sin errores.
- [ ] Repite y pulsa «Abort merge». **Esperado:** todo queda como antes de fusionar.
- [ ] Mientras hay conflicto, la petición sale en la barra lateral con un icono de error y por su nombre de archivo. Es esperado; dime si confunde.

### 2.10 Git: apartar cambios

- [ ] Con cambios pendientes, «Put aside» → escribe un nombre → «Put changes aside». **Esperado:** los cambios desaparecen de los archivos.
- [ ] «Bring back». **Esperado:** vuelven.

---

### 2.11 Explicar por qué falló una petición
- [ ] Envía a `http://localhost:1/`. Bajo el error debe decir que nada escucha en ese puerto y sugerir arrancar tu servidor.
- [ ] Envía a `http://no-existe.invalid/`. Debe decir que el nombre no lleva a ningún servidor.
- [ ] Envía con `https://` a un servidor local que solo habla HTTP. Debe sugerir probar `http://`.
- [ ] En *Settings* de una petición pon un tiempo de espera de 1 ms y envía. Debe decir que se agotó el tiempo, y *Open Settings* debe abrir esa pestaña.
- [ ] Envía a una API real sin credenciales que responda 401. Encima del cuerpo debe salir una tarjeta con el tipo de autenticación que pide; *Open Auth* abre la pestaña Auth; la X la cierra y no vuelve hasta el siguiente envío.
- [ ] Envía algo que responda 404 o 500. **No** debe salir ninguna tarjeta.
- [ ] Míralo en tema oscuro.

## 3. Lo que no está hecho o no pude comprobar

- **Tema oscuro, Windows y macOS:** sin probar en ninguna de las pantallas nuevas.
- **Colecciones `.bru`:** todo lo de la interfaz se probó con `.yml`. El motor y el blame sí tienen pruebas con `.bru`.
- **Remoto privado real:** sin probar.
- **Conflictos de un rebase:** el panel solo hace fusiones.
- **Mezcla parte por parte:** las cabeceras cuentan como una sola parte (se elige la lista entera de un lado, no cabecera por cabecera).
- **Un commit confirma todo lo preparado en el repositorio**, no solo lo de la colección; por eso avisa.
- **Detector de secretos:** no hay forma de marcar un hallazgo como «no es un secreto»; no mueve valores que estén en carpetas, en los ajustes de la colección, en la URL o en el cuerpo.
- **CLI:** las variables secretas no viajan en los archivos; quien use `bru run` en CI debe pasarlas con `--env-var`.
- **Textos:** todo lo nuevo está en inglés y escrito en el código, sin pasar por las traducciones.
- **Fallos conocidos anteriores:** 2 pruebas de fecha por zona horaria y 3 de QuickJS con saltos de línea.

## 4. Antes de subir

- [ ] Las pruebas de 2.5 a 2.9 al menos una vez con una colección real.
- [ ] `git log origin/restlab/v1-local-first..HEAD` para repasar los 25 commits.
- [ ] `git push` cuando estés conforme. No lo he hecho yo: subir es decisión tuya.
