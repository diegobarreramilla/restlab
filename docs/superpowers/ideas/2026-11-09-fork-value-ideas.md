# Ideas para sumar valor al fork

Fecha: 2026-11-09 · Estado: **propuestas, ninguna se implementa todavía**

Las ideas 1 a 12 son **mías**, y la 13 la propuso el autor del proyecto. Todas son nivel **P** (propuesta) o **C** (hueco inferido) en la escala del roadmap, así que ninguna tiene demanda comprobada en el informe de investigación; donde hay una señal indirecta se dice. Se eligieron porque (1) refuerzan la promesa local-first, (2) hacen útil la app sin IA y (3) reutilizan cosas que ya existen en el código. Antes de construir cualquiera hay que hacer su paso **Verificar primero**: puede que el fork ya la traiga.

Lo ya planeado no se repite aquí: modo vim, paleta de comandos, servidor MCP, autocompletado de rutas, archivos con menos pasos, extensiones, IA que diagnostica, sincronización con Drive, internacionalización.

## Resumen y prioridad sugerida

| # | Idea | Valor principal | Esfuerzo | Reutiliza | Cuándo |
|---|---|---|---|---|---|
| 1 | Explicar el fallo sin IA | Útil sin IA; menos tiempo perdido en errores comunes | M | Resultado de la petición, ajustes de TLS y proxy | Tras la v1-base |
| 2 | Modo estricto de red | Convierte la promesa en algo comprobable | M | Inventario de red, CSP, `session` de Electron | Antes de publicar |
| 3 | Detector de secretos antes de commit o exportación | Evita subir claves por error | M | Patrones de `ipc/ai/context.js` | Tras 5.3 |
| 4 | Doctor de colección | Encuentra variables sin definir, duplicados y carpetas vacías | M | Interpolación, árbol de colección | Tras 5.2 |
| 5 | Comprobador de integridad de formato (`verify`) | Confianza al migrar o abrir colecciones de Bruno | S–M | Revisión final 8.3 punto 4, CLI | Con 8.3 |
| 6 | Documentación incluida en la app | Cierra el hueco de «Documentation» sin depender de una web | M | Visor de documentación incrustado | Con 8.4 |
| 7 | Modo portátil | Usarla desde una carpeta o USB, sin instalar ni tocar el perfil | S | `app.setPath('userData')`, `ELECTRON_USER_DATA_PATH` | Con 8.2 |
| 8 | Copiar información de diagnóstico | Reportes de errores útiles sin telemetría | S | Versiones, preferencias, SO | Con el repositorio público |
| 9 | Comparar dos respuestas | Ver qué cambió entre dos envíos | M | Visor de respuesta, estructura de respuesta de la IA | Después de 4.x |
| 10 | Desglose de tiempos (DNS, conexión, TLS, primer byte) | Diagnosticar lentitud sin otra herramienta | M | Cliente HTTP de `bruno-requests` | Después de 4.x |
| 11 | Primer arranque «vengo de Postman/Insomnia» | Convierte el informe de importación en puerta de entrada | S | Importadores y el informe de 5.3.6 | Con 7.1 |
| 12 | Descargas verificables (sumas y SBOM) | Confianza en lo que se instala | S | Pipeline de 8.2 | Con 8.2 |
| 13 | **Control de versiones gráfico (estilo GitLens)** | Cambios, ramas e historial de colecciones sin terminal, con diff por petición | L (4 fases de M) | **Motor de Git ya escrito** en `utils/git.js` y `VisualDiffViewer` | Hito propio tras el rendimiento (4.x) |

Orden recomendado si solo se elige una parte: **2, 3, 5 y 1**. La 13 es la más grande y la que más se notaría; va como hito aparte (ver su sección). Las tres primeras refuerzan la confianza, que es lo que decide la elección según el informe; la 1 es la que más se nota al usar la app.

---

## 1. Explicar el fallo sin IA · M

**Qué:** cuando una petición falla, mostrar sobre la respuesta una explicación corta y una acción, calculadas con reglas locales. Ejemplos: `ECONNREFUSED` («nada escucha en ese puerto: ¿el servidor está arrancado?»), `ENOTFOUND` («el nombre no se resuelve: revisa la URL o la variable de entorno»), certificado autofirmado («el servidor usa un certificado que no conoces: abre Ajustes de certificados»), `401` con `WWW-Authenticate` («el servidor pide autenticación tipo X»), tiempo agotado, variable `{{x}}` sin definir.
**Por qué:** es la versión «sin IA» del paso 10.1 del roadmap y cumple «la app debe valer sin IA». También prepara el contexto que luego usaría la IA.
**Verificar primero:** qué errores explica hoy la interfaz y con qué texto; probablemente solo muestra el mensaje crudo.
**Pasos:** (1) tabla de reglas en una función pura con pruebas (entrada: error o estado; salida: causa, sugerencia, acción); (2) banda sobre la respuesta, discreta, que se puede ocultar; (3) botón de acción que abre el ajuste correspondiente.
**Local-first:** sin red; solo lee el resultado ya recibido.
**Listo cuando:** diez fallos comunes reproducibles muestran una explicación correcta y ninguno muestra una equivocada (se prefiere no explicar a explicar mal).

## 2. Modo estricto de red · M

**Qué:** un interruptor en Preferencias, Privacy, que bloquea **toda** salida de la aplicación que no sea una petición que el usuario envía. Se aplica en la sesión de Electron (`session.webRequest.onBeforeRequest`) para la interfaz y se verifica que nada intenta salir.
**Por qué:** hoy la promesa es una frase y un inventario escrito; esto la convierte en algo que se puede **comprobar**. Es lo que pediría un equipo de seguridad.
**Verificar primero:** el pendiente de 8.3 («arrancar con la red bloqueada») ya exige comprobar que la app no intenta salir; esta idea lo vuelve una prueba automática y una opción visible.
**Pasos:** (1) filtro en el proceso principal que cancela solicitudes de la interfaz a cualquier host que no sea local; (2) prueba e2e que activa el modo, recorre la app y comprueba que no hay solicitudes bloqueadas inesperadas; (3) línea en Privacy que diga cuántas solicitudes bloqueó en la sesión (normalmente cero).
**Riesgo:** puede romper funciones legítimas (vista previa de Swagger, OAuth2 en ventana integrada). La lista de excepciones debe salir del inventario y estar probada.
**Listo cuando:** con el modo activo, el e2e pasa y el contador marca cero.

## 3. Detector de secretos antes de commit o exportación · M

**Qué:** al exportar una colección o al detectar que está dentro de un repositorio git con cambios, avisar si hay valores con forma de credencial en texto plano (JWT, claves `sk-`, `Bearer`, contraseñas en URL, variables de entorno que no están marcadas como secretas).
**Por qué:** el mayor riesgo de «todo en archivos de texto» es subir una clave a un repositorio. Es un problema real de los equipos que usan git con colecciones.
**Verificar primero:** qué hace hoy el fork al exportar y si ya marca los entornos como secretos; y si el repositorio guarda los valores de los secretos en archivos aparte.
**Pasos:** (1) extraer los patrones de `packages/bruno-electron/src/ipc/ai/context.js` a una función compartida sin dependencias de IA (respetando `.claude/rules/architecture.md`); (2) usarla en la exportación y en un indicador de la colección; (3) lista de hallazgos con la ruta y el nombre del campo, **sin repetir el valor**.
**Local-first:** análisis local; no envía nada.
**Listo cuando:** una colección con una clave plantada la señala en la exportación y una colección limpia no genera avisos falsos (se prueba con colecciones reales).

## 4. Doctor de colección · M

**Qué:** una acción «Revisar colección» que lista problemas: variables `{{x}}` que no existen en ningún entorno, nombres duplicados, carpetas vacías, peticiones sin URL, peticiones sin pruebas, scripts con errores de sintaxis.
**Por qué:** ahorra el descubrir los errores al enviar. Funciona sin IA y sin red.
**Verificar primero:** el editor ya resalta variables sin definir; ver si esa lógica se puede reutilizar para recorrer toda la colección.
**Pasos:** (1) función pura que recibe la colección en memoria y devuelve hallazgos con severidad; (2) panel de resultados con enlace a cada petición; (3) comando equivalente en la CLI (`bru check`), por la regla de gemelos.
**Listo cuando:** una colección con cinco defectos plantados los encuentra todos y una colección sana sale vacía.

## 5. Comprobador de integridad de formato (`verify`) · S–M

**Qué:** un comando (app y CLI) que abre una colección, la guarda en memoria con el serializador actual y compara con lo que hay en disco, e informa de cualquier campo que se perdería o cambiaría.
**Por qué:** la regla 5 del roadmap dice «una colección de Bruno debe abrirse y guardarse sin perder campos»; hoy se comprueba a mano con `git diff` (8.3 punto 4). Esto lo automatiza y da confianza al migrar.
**Verificar primero:** que el serializador sea determinista (misma entrada, misma salida) con tres colecciones reales.
**Pasos:** (1) función que parsea y vuelve a serializar sin escribir; (2) comparación archivo por archivo con un resumen; (3) integrarlo como prueba de la revisión final.
**Listo cuando:** pasa sin diferencias con tres colecciones reales y detecta una diferencia plantada.

## 6. Documentación incluida en la app · M

**Qué:** una sección de ayuda dentro de la aplicación, en archivos locales, que explique la promesa local-first, la IA, OAuth2, dónde está cada dato y los atajos.
**Por qué:** el menú Ayuda perdió «Documentation» al quitar los enlaces ajenos (`docs/branding.md`), y la documentación propia aún no existe. Incluirla evita depender de un sitio web y mantiene la promesa.
**Verificar primero:** el visor de documentación incrustado ya funciona sin red; ver si se puede reutilizar para páginas propias.
**Pasos:** (1) escribir las páginas en Markdown dentro del repositorio; (2) renderizarlas con el visor existente; (3) enlazar desde Ayuda y desde cada ajuste relevante.
**Listo cuando:** Ayuda → Documentation abre las páginas sin red y el contenido coincide con 8.4.

## 7. Modo portátil · S

**Qué:** si existe una carpeta `data/` junto al ejecutable (o una opción de arranque), la app guarda ahí preferencias, entornos y sesiones en lugar del perfil del sistema.
**Por qué:** permite llevarla en un USB, usarla en equipos ajenos sin dejar rastro y probarla en limpio. Es coherente con «todo está en tu disco».
**Verificar primero:** `ELECTRON_USER_DATA_PATH` ya existe pero solo en desarrollo (`index.js`); ver qué impide habilitarlo en producción.
**Pasos:** (1) detectar la carpeta o variable al arrancar, antes de `ready`; (2) fijar `userData` con `app.setPath`; (3) prueba e2e con una carpeta temporal.
**Listo cuando:** con la carpeta presente, nada se escribe fuera de ella.

## 8. Copiar información de diagnóstico · S

**Qué:** botón en Ayuda que copia versión de RestLab, de Electron, sistema operativo y las preferencias **sin valores sensibles**, para pegarlo en un reporte de error.
**Por qué:** sin telemetría, los reportes dependen de lo que el usuario escriba; esto los hace útiles sin recolectar nada.
**Pasos:** (1) función que arma el texto con una lista permitida de campos; (2) botón y vista previa del texto antes de copiar.
**Local-first:** el usuario ve y decide qué pega.

## 9. Comparar dos respuestas · M

**Qué:** elegir dos respuestas (del mismo endpoint en dos momentos o de dos entornos) y verlas en un diff estructural.
**Por qué:** responde «¿qué cambió tras el despliegue?» sin salir de la herramienta.
**Verificar primero:** si la app guarda respuestas anteriores; si no, el alcance es «guardar una respuesta como referencia» solo en memoria o en un archivo que el usuario elige.
**Pasos:** (1) función pura de diff sobre JSON (claves y tipos; opción de ignorar campos variables); (2) panel de comparación; (3) guardar referencia opcional.

## 10. Desglose de tiempos · M

**Qué:** mostrar en la respuesta cuánto tardó cada fase: resolución de nombre, conexión, TLS, primer byte, descarga.
**Por qué:** convierte «es lento» en «es el TLS» o «es el servidor».
**Verificar primero:** qué entrega hoy el cliente HTTP de `bruno-requests` (puede que ya exponga fases del socket).
**Pasos:** (1) recoger marcas de tiempo del socket; (2) mostrarlas en una barra fina en la pestaña de tiempos; (3) incluirlas en la salida de la CLI.

## 11. Primer arranque «vengo de Postman o Insomnia» · S

**Qué:** en el primer uso, una tarjeta que ofrece importar desde Postman, Insomnia o Bruno y muestra al terminar el informe «N de M elementos importados» (5.3.6).
**Por qué:** es el camino de entrada de quienes se van; la pieza difícil (informe) ya está hecha.
**Pasos:** (1) tarjeta en la pantalla de inicio junto a «Quick request»; (2) reutilizar el modal de importación; (3) medir con la sesión de validación 6.3.

## 12. Descargas verificables · S

**Qué:** publicar con cada instalador su suma de verificación y una lista de componentes (SBOM), y documentar cómo comprobarlas.
**Por qué:** quien eligió la herramienta por confianza querrá comprobar lo que instala. Cuesta poco si se hace dentro del pipeline de 8.2.
**Pasos:** (1) generar sumas SHA-256 en CI; (2) generar el SBOM con la herramienta estándar del ecosistema npm; (3) enlazarlos desde la página de versiones.

## 13. Control de versiones gráfico (estilo GitLens) · L en cuatro fases

**Origen:** propuesta del autor. Bruno cobra esta función en sus planes de pago y la idea es ofrecerla en RestLab sin plan de pago, con una experiencia parecida a GitLens dentro de la propia aplicación.
**Evidencia:** nivel **P** con señal indirecta. El informe de investigación no recoge peticiones directas de usuarios por esta función, pero que un competidor la venda indica que hay quien la valora. La fila 11.2 del roadmap ya la anticipaba («Flujo guiado con Git»). Conviene validarla con la sesión 6.3 antes de pulirla, no antes de construir la primera fase.
**Por qué encaja:** las colecciones ya son archivos de texto pensados para git; falta que se vea y se use sin terminal. Todo es local; solo `push`, `pull` y `fetch` tocan la red y los inicia el usuario (categoría 1 del inventario, que ya incluye «operaciones git»).

### Lo que ya existe (verificado el 2026-11-09)
- `packages/bruno-electron/src/utils/git.js` trae un motor completo: `stageChanges`, `unstageChanges`, `discardChanges`, `commitChanges`, `getChangedFilesInCollectionGit`, ramas (`getCollectionGitBranches`, `getCurrentGitBranch`, `checkoutGitBranch`, `checkoutRemoteGitBranch`), `fetchChanges`, `pullGitChanges`, `pushGitChanges`, `getAheadBehindCount`, historial (`getCollectionGitLogs`, `getFileGitHistory`, `getCommitFiles`), comparación (`getCommitCompareFiles`, `getCommitFileDiff`, `getCommitCompareFileDiff`), contenido en un commit (`getFileContentAtCommit`), stash completo (`createStash`, `listStashes`, `applyStash`, `dropStash`, `getStashFiles`) y conflictos (`continueMerge`, `abortConflictResolution`).
- **Ninguna de esas funciones tiene consumidor:** no hay manejador IPC ni componente que las use (solo se llaman dentro de `git.js` y de su prueba). El único IPC de git registrado cubre clonar, leer la URL del remoto y listar ramas remotas (`ipc/git.js`). Es decir, **falta la capa visible y su conexión**, no el motor.
- Interfaz existente reutilizable: `components/Git/VisualDiffViewer` (diff por método, URL, parámetros, cabeceras, cuerpo y autenticación, hoy usado en la sincronización OpenAPI), `GitNotFoundModal` (git no instalado), `GitRemoteCollectionRow` y las acciones de conectar o quitar un remoto.
- `git.spec.js` tiene solo unas 8 pruebas: **el motor está poco probado** y habrá que cubrirlo antes de exponerlo.
- No hay `blame` (quién cambió cada línea): GitLens lo usa y aquí habría que añadirlo.

### Qué ofrecería
1. **Cambios:** lista de archivos modificados de la colección, preparar o descartar, mensaje y *commit*, todo con la rama actual y el estado (adelante o atrás del remoto) siempre visibles.
2. **Diff por petición, no por texto:** en vez de líneas de `.bru` o `.yml`, mostrar qué cambió en la petición («URL: …, cabecera nueva, cuerpo modificado»), con `VisualDiffViewer`. Es la diferencia más clara frente a un git genérico y a GitLens.
3. **Historial de una petición** («versiones»): lista de cambios de ese archivo con autor y fecha, con **restaurar esta versión** (usa `getFileContentAtCommit`).
4. **Ramas y sincronización:** crear y cambiar rama, *fetch*, *pull*, *push*, guardar cambios temporales (*stash*).
5. **Conflictos:** cuando un *merge* choca, ver las dos versiones de la petición y elegir, con abortar y continuar.
6. **Estilo GitLens:** indicador en la petición con el último cambio («Ana, hace 3 días») y comparación entre dos commits o ramas.

### Fases (cada una se puede entregar sola)
| Fase | Entrega | Tamaño | Listo cuando |
|---|---|---|---|
| 1. Cambios y commit | IPC de estado, preparar, descartar y commit; panel con diff visual; rama actual en la barra | M | Se hace un commit desde la interfaz sobre una colección en un repositorio y aparece en `git log` con el diff correcto; **el formato en disco no cambia** |
| 2. Ramas y sincronización | Crear y cambiar rama, fetch, pull, push, adelante/atrás, stash | M | Se sincroniza con un remoto de prueba local sin salir de la app |
| 3. Historial | Historial de colección y de petición, comparar commits, restaurar versión, indicador del último cambio (requiere añadir `blame` o `log -1` por archivo) | M | Se restaura una petición a una versión anterior sin perder cambios sin guardar |
| 4. Conflictos | Resolver conflictos por petición | M | Un *merge* con conflicto se resuelve desde la interfaz y la colección sigue abriendo |

### Verificar primero
1. Probar a mano las funciones de `utils/git.js` contra un repositorio de prueba y anotar cuáles fallan (la cobertura es baja).
2. Confirmar la licencia del origen de `utils/git.js` y de `VisualDiffViewer` (parte MIT del proyecto de origen). **No se copia código de la interfaz de pago de Bruno**; la interfaz se escribe desde cero con el motor que ya está en el repositorio.
3. Qué hace hoy la interfaz con repositorios git (el menú de la colección y la barra lateral) para no duplicar.
4. Si la colección vive en un repositorio más grande (monorepo), cómo se acota el estado a la carpeta de la colección (`getCollectionGitRootPath`).

### Riesgos y decisiones abiertas
- **Autenticación:** push y pull con HTTPS necesitan credenciales. Propuesta: usar la configuración de git del usuario (agente SSH, gestor de credenciales del sistema) y **no guardar tokens en RestLab**. Hay que decidirlo antes de la fase 2.
- **No perder trabajo:** descartar y cambiar de rama con cambios sin guardar deben pedir confirmación y ofrecer guardar en stash.
- **Rendimiento:** colecciones grandes y repositorios con mucho historial; el estado se calcula bajo demanda y no en segundo plano continuo.
- **Seguridad de los secretos:** antes del commit, avisar si hay valores con forma de credencial (idea 3) y **no mostrar el valor** en el diff.
- **Git no instalado:** ya existe `GitNotFoundModal`; la función debe degradarse sin romper nada.
- **Multiplataforma:** rutas de Windows y saltos de línea (`.claude/rules/cross-platform.md`).
- **Gemelo en la CLI:** no aplica (el usuario ya tiene `git`); se declara en el reporte de la fase.

### Dónde encaja en el orden
Como hito propio **después del rendimiento (4.x) y de la importación OpenAPI (5.2)** y antes de las extensiones, porque es lo que más usan los equipos que ya guardan colecciones en repositorios. En el roadmap sustituye y amplía la fila 11.2.

---

## Oportunidades leídas del informe (2026-11-14)

Añadidas tras repasar `reports/Debilidades de Bruno Postman Insomnia.md`. El informe dice que la gente cambia de cliente por confianza, no por funciones; estas son las áreas con hueco, de más a menos respaldo. Estado a 2026-11-14.

| # | Área | Qué dice el informe | Idea | Estado |
|---|---|---|---|---|
| 14 | Miedo a perder datos | Insomnia ocultó o borró peticiones al actualizar (#6585, 74 reacciones) | **Recuperar cambios sin guardar** tras un cierre inesperado | **Hecho** para peticiones ya guardadas en una colección; falta para peticiones nunca guardadas |
| 15 | Miedo a perder datos | Igual | **Historial local por petición**: volver a una versión anterior de una petición aunque no se use Git | Pendiente |
| 16 | Idioma | Issue abierto más votado de Bruno (#322, 58) | **Traducción**, empezando por español (roadmap 5.3) | Pendiente; todo lo nuevo está en inglés y escrito en el código |
| 17 | Modo vim | Segundo issue más votado de Bruno (#2373, 57) | **Atajos vim en los editores** | Pendiente; tamaño sin comprobar |
| 18 | Gente que deja Postman e Insomnia | Es el flujo principal de usuarios nuevos | **Primer arranque «vengo de Postman»** con informe de lo que no se pudo traducir (idea 11) | Pendiente |
| 19 | IA | Nadie pide IA dentro del cliente; lo defendible es dar contexto a agentes externos | **Servidor MCP local, opcional**, para que un agente lea y ejecute colecciones | Pendiente; es la más grande |
| 20 | OpenAPI | Importar OpenAPI llegó a 132 reacciones (#81); las variables de servidor se importan mal | **Importación fiel** (roadmap 5.2) y **rutas sugeridas al escribir la URL** (roadmap 6.1) | Rutas sugeridas: **hecho** en su primera versión; importación fiel: pendiente |
| 21 | Pestañas | Pedido en Bruno (#1739, 17) e Insomnia (#8488, unas 40) | **Poder ocultar la barra de pestañas** | Pendiente |
| 22 | Extensiones | #1529, 49 reacciones, coste alto | Solo una API interna mínima, sin tienda | Aplazado |

Dos puntos que no son funciones pero pesan en la decisión de quien elige cliente:
- **El miedo a que el proyecto «siga el camino de Postman»** aparece en casi todos los hilos. Conviene publicar por escrito qué será siempre gratis antes de decidir qué se cobra.
- **Bruno limita en su plan gratuito lo que RestLab ya da**: Git solo con repositorios públicos y 5 sincronizaciones OpenAPI al mes.

Orden propuesto: 16, 17, 15 y 18. La 19 es la más diferenciadora y la más grande.

## Cosas que se descartaron (y por qué)
- **Historial de peticiones en la nube:** contradice la promesa. Si algún día se hace, solo local y con tope de tamaño.
- **Telemetría «anónima y opcional»:** rompe la regla de que no hay nada que anunciar ni medir sobre el usuario; lo cubre la idea 8 sin recolectar.
- **Comparador de versiones de colección con servidor propio:** es la nube forzada que el informe señala como queja principal.

## Cómo se priorizan
Se pasan al roadmap solo si cumplen las tres condiciones: refuerzan la promesa o hacen útil la app sin IA, reutilizan algo existente, y tienen un «listo cuando» comprobable. Si una idea necesita validación con usuarios (la 9 y la 10 son las más dudosas), pasa primero por una sesión como 6.3.
