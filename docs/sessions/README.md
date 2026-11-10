# Bitácora de sesiones

Una nota por día de trabajo, con lo que se hizo, por qué, cómo se comprobó y qué quedó pendiente. El plan vive en `docs/ROADMAP.md`; aquí está el detalle de lo ejecutado.

| Fecha | Resumen | Commits |
|---|---|---|
| [2026-11-07](2026-11-07.md) | Base del proyecto: marca RestLab, local-first (sin telemetría, OAuth2 local, modo sin conexión), IA opcional con vista previa y redacción de secretos, documentación incrustada, lista de entornos | 48 |
| [2026-11-08](2026-11-08.md) | Metas 5.3: «Todo está en tu disco», copia de seguridad de la migración (con borrado y caducidad), petición rápida, valores por defecto vigilados por prueba, informe de importación | 17 |
| [2026-11-09](2026-11-09.md) | Rendimiento (4.1): línea base en esta máquina, el «salto» de montaje resulta ser del build de desarrollo, diagnóstico de la respuesta grande; incidente con el perfil real; 13 ideas nuevas para el fork | 18+ |

**Cómo mantenerla:** al terminar cada sesión se crea `AAAA-MM-DD.md` con las secciones *Qué se hizo*, *Cómo se comprobó*, *Decisiones*, *Problemas encontrados* y *Pendiente*, y se añade una fila a esta tabla. Se redacta a partir de `git log` y de lo que se ejecutó de verdad, sin inventar resultados.
