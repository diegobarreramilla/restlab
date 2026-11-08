# Marca de RestLab

Estado a 2026-11-07: el nombre visible es **RestLab**. El logo es **provisional**: no existe un logo oficial todavía.

## Dónde vive el nombre

| Dónde | Archivo |
|---|---|
| Interfaz (renderer) | `packages/bruno-app/src/utils/branding/index.js` (`APP_NAME`) |
| Proceso principal (Electron) | `packages/bruno-electron/src/branding.js` (`APP_NAME`) |

Los dos valores deben coincidir. Todo texto de la interfaz que nombra al producto usa `APP_NAME`, así que renombrar el producto es cambiar esas dos líneas, además de `title` en `packages/bruno-app/rsbuild.config.mjs` y el nombre en `tests/onboarding/welcome-modal.spec.ts`.

El nombre de instalación (`productName` en `packages/bruno-electron/electron-builder-config.js`) lo toma de `APP_NAME`. Cambiarlo cambia la carpeta de datos del usuario en las versiones empaquetadas.

## Cómo poner el logo oficial

El logo provisional es un cuadrado redondeado con una R. Está dibujado con `currentColor`, así que sigue el color del texto del tema.

1. **Interfaz:** reemplazar el dibujo SVG de `packages/bruno-app/src/components/BrandLogo/index.js`. Mantener la propiedad `width` y usar `currentColor` (o colores del tema) para que respete el tema claro y oscuro. Lo usan la barra superior, el diálogo de bienvenida y la página de error.
2. **Ventana "Acerca de":** reemplazar el mismo dibujo en `logoMarkSvg` de `packages/bruno-electron/src/branding.js`.
3. **Iconos de la aplicación** (hoy son arte de Bruno y hay que sustituirlos por los oficiales):

| Archivo | Uso |
|---|---|
| `packages/bruno-electron/resources/icons/mac/icon.icns` | Icono en macOS |
| `packages/bruno-electron/resources/icons/win/icon.ico` | Icono en Windows y del instalador |
| `packages/bruno-electron/resources/icons/png/256x256.png` | Icono en Linux (electron-builder espera varios tamaños en esa carpeta) |
| `packages/bruno-electron/src/about/256x256.png` | Icono de la ventana (`icon:` en `src/index.js`) |
| `packages/bruno-app/public/favicon.ico` | Icono de la versión web |
| `assets/images/logo.png`, `assets/images/logo-transparent.png` | Logo del `readme.md` |

4. Revisar `packages/bruno-electron/resources/installer.nsh` si el instalador de Windows muestra imágenes o textos propios (hoy no menciona a Bruno).

## Lo que sigue llamándose Bruno, a propósito

Son nombres de formatos, interfaces o compatibilidad. Cambiarlos rompería colecciones o scripts existentes.

- El formato de archivo `.bru`, `bruno.json` y la API de scripts (`bru.*`).
- Los nombres de paquetes (`@usebruno/*`, `bruno-app`, `bruno-electron`) y los identificadores internos.
- Los textos que hablan de **importar o exportar** el formato ("Bruno Collection", "Bruno Format", "Supports Bruno, OpenCollection, Postman…").
- Las claves internas de `localStorage` que empiezan por `bruno.`, para no perder ajustes guardados.
- Los textos de la IA que describen la API de scripts como "Bruno API". La API se llama así.

## Decisiones tomadas (fase A2)

| Tema | Resolución |
|---|---|
| Identificador de la aplicación | `com.restlab.app` (`electron-builder-config.js`). Debe quedar fijo desde la primera versión publicada |
| Esquema de enlaces | `restlab://` (registro en `src/index.js`, `utils/deeplink.js`, instaladores). Ya no compite con Bruno si ambos están instalados |
| Reporte de errores | Oculto mientras no exista repositorio. La dirección vive en `utils/branding` (`ISSUES_URL`, `null`); al darle valor reaparecen el botón del panel de errores, el de la importación de Postman, el enlace del error fatal y la sección de Soporte |
| Documentación | Se quitaron todos los enlaces a la de Bruno (menú Ayuda, buscador global, Soporte, avisos). `DOCS_URL` queda en `null` |
| Registro de cambios | Propio: `components/ChangelogTab/CHANGELOG.md` |
| Documentación generada | Incrusta el visor (`packages/bruno-app/public/api-docs`, 8,6 MB, copiado tal cual del CDN de Bruno) y abre sin red. La CLI lo lee de ahí |
| Metadatos de exportación | `exportedUsing: RestLab/<versión>` (la CLI usa `restlab-cli/<versión>`). El importador solo borra el campo, nada lo lee |
| Copyright de RestLab | Línea propia "Copyright (c) 2026 RestLab" sobre el aviso original en `license.md` |
| Enlaces de `package.json` de Electron | `homepage` y `repository` quitados |

## Pendiente

| Tema | Situación |
|---|---|
| **Repositorio público de RestLab** | Al crearlo: dar valor a `ISSUES_URL` y `REPOSITORY_URL` en `utils/branding` |
| **Documentación propia de RestLab** | Al publicarla: dar valor a `DOCS_URL` y devolver el elemento "Documentation" al menú Ayuda |
| **Visor de la documentación generada** | Es un archivo compilado ajeno. Falta su fuente (proyecto OpenCollection) para poder actualizarlo con autoridad |
| `readme.md`, traducciones y `docs/` | Siguen apuntando a Bruno |
| Anuncios de Bruno (`appinfo.usebruno.com`) | Apagado por defecto. Decidir si se elimina o se apunta a un servicio propio |
| Iconos y logo oficiales | Ver la tabla de arriba |

## Atribución y licencia

Bruno se distribuye bajo licencia MIT, que exige conservar su aviso de copyright. `license.md` no debe modificarse sin revisarlo, y la ventana "Acerca de" ya indica "RestLab is based on Bruno" junto con ese aviso. La licencia cubre el código; el nombre y el logo de Bruno son su marca, por eso no se reutilizan.
