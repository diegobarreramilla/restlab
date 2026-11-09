# Ideas para sumar valor al fork

Fecha: 2026-11-09 · Estado: **propuestas, ninguna se implementa todavía**

Son ideas **mías**, no pedidas por usuarios: todas son nivel **P** (propuesta) o **C** (hueco inferido) en la escala del roadmap, así que ninguna tiene demanda comprobada. Se eligieron porque (1) refuerzan la promesa local-first, (2) hacen útil la app sin IA y (3) reutilizan cosas que ya existen en el código. Antes de construir cualquiera hay que hacer su paso **Verificar primero**: puede que el fork ya la traiga.

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

Orden recomendado si solo se elige una parte: **2, 3, 5 y 1**. Las tres primeras refuerzan la confianza, que es lo que decide la elección según el informe; la 1 es la que más se nota al usar la app.

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

---

## Cosas que se descartaron (y por qué)
- **Historial de peticiones en la nube:** contradice la promesa. Si algún día se hace, solo local y con tope de tamaño.
- **Telemetría «anónima y opcional»:** rompe la regla de que no hay nada que anunciar ni medir sobre el usuario; lo cubre la idea 8 sin recolectar.
- **Comparador de versiones de colección con servidor propio:** es la nube forzada que el informe señala como queja principal.

## Cómo se priorizan
Se pasan al roadmap solo si cumplen las tres condiciones: refuerzan la promesa o hacen útil la app sin IA, reutilizan algo existente, y tienen un «listo cuando» comprobable. Si una idea necesita validación con usuarios (la 9 y la 10 son las más dudosas), pasa primero por una sesión como 6.3.
