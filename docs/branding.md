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

## Decisiones pendientes

| Tema | Situación |
|---|---|
| **Identificador de la aplicación** | `appId: 'com.usebruno.app'` en `electron-builder-config.js`. Debería pasar a uno propio antes de publicar. |
| **Esquema de enlaces** | `bruno://` está registrado en el sistema y lo usan las páginas de retorno de OAuth2. Cambiarlo afecta a esas páginas. |
| **Reporte de errores** | El panel de errores (`Devtools/Console/ErrorDetailsPanel`) envía el reporte al repositorio de Bruno en GitHub y dice "Help us improve Bruno". Necesita el repositorio de RestLab. |
| **Documentación** | El buscador global y el botón de ayuda abren la documentación de Bruno. |
| **Registro de cambios** | `components/ChangelogTab/CHANGELOG.md` es el de Bruno ("What's New in Bruno v4.4.0"). RestLab necesita el suyo. |
| **Documentación generada** | La documentación exportada carga archivos JS y CSS desde un CDN de Bruno (`GenerateDocumentation`). Conviene alojarlos o incrustarlos. |
| **Metadatos de exportación** | Los archivos exportados dicen `exportedUsing: Bruno/<versión>`. Debe decidirse si pasan a decir RestLab. |
| **Enlaces de proyecto** | `homepage` y URLs de `package.json`, `readme.md` y traducciones apuntan a Bruno. |
| **Copyright de RestLab** | `license.md` conserva el aviso original. Falta decidir el aviso propio para el código nuevo. |

## Atribución y licencia

Bruno se distribuye bajo licencia MIT, que exige conservar su aviso de copyright. `license.md` no debe modificarse sin revisarlo, y la ventana "Acerca de" ya indica "RestLab is based on Bruno" junto con ese aviso. La licencia cubre el código; el nombre y el logo de Bruno son su marca, por eso no se reutilizan.
