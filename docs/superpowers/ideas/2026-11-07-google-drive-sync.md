# Idea futura: sincronización con Google Drive

Fecha: 2026-11-07 · Estado: **idea guardada, no se implementa todavía**

## Qué es

Una extensión de fábrica opcional que use la cuenta de Google Drive del usuario como nube para colecciones, entornos y peticiones, sin que RestLab opere ni cobre servidores propios.

## Por qué importa

El autor la considera importante para una versión comercial dirigida a empresas y grupos de trabajo grandes, junto con la colaboración en general.

## Cómo funcionaría

1. El usuario inicia sesión con Google mediante OAuth2 con PKCE y autoriza a RestLab.
2. Las colecciones (archivos `.bru` o `.yml`) se guardan en una carpeta de su Drive.
3. Quienes tengan acceso a esa carpeta comparten los mismos archivos.

Permiso recomendado: `drive.file`, que solo da acceso a los archivos creados por RestLab.

## Dificultades conocidas

- Drive no fusiona cambios: dos personas que editan la misma petición generan conflictos que RestLab tendría que resolver (por ejemplo, creando una copia).
- No hay sincronización en vivo; habría que consultar cada cierto tiempo.
- Para que cualquier usuario inicie sesión, Google exige verificar la aplicación; en modo de prueba solo funcionan unos 100 usuarios autorizados.
- Las variables de entorno con secretos no deberían subirse sin cifrar.
- Dependencia de las reglas y cuotas de Google.

## Alternativas más baratas para empezar

- Documentar el uso de una carpeta sincronizada (Drive de escritorio, Dropbox, Syncthing) como ubicación de la colección.
- Colaboración por git, que el fork ya trae.
- Un conector genérico (WebDAV, S3) para no depender de un solo proveedor.

## Condición para retomarla

Después de la v1 y de que exista el sistema de extensiones. Decidir antes si el objetivo principal es compartir con un equipo o respaldar entre equipos propios del mismo usuario.
