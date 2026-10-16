# Guion de sustentación — máximo 5 minutos

Antes de comenzar:

1. Abrir la carpeta `magic-film-api` en Visual Studio Code.
2. Desde la terminal integrada, ejecutar `npm.cmd run seed` para restablecer la demostración.
3. En la misma terminal, ejecutar `npm.cmd start` y dejarla visible.
4. Abrir MongoDB Compass manualmente y conectarse con `mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true`.
5. Abrir Thunder Client en Visual Studio Code e importar `postman/Magic-Film.postman_collection.json` como colección de Postman.
6. Ejecutar las solicitudes en el orden numerado. Evitar explicar el código línea por línea.

## Apertura — 0:00 a 0:20

> Magic Film interpreta películas con inteligencia artificial y las relaciona con la carrera y los gustos del usuario. El MVP es una API REST en Node.js con persistencia real en MongoDB. Presentaré diez historias de usuario mediante Thunder Client.

## Funcionalidades 1 a 4 — 0:20 a 1:35

1. **Registro — `POST /api/usuarios`**
   > Como usuario quiero registrar mi carrera y géneros para personalizar las recomendaciones.
   Ejecutar y señalar el código `201`.

2. **Preferencias — `PATCH /api/usuarios/U011/generos`**
   > Como usuario quiero agregar un género sin registrarme otra vez.
   Ejecutar y mostrar que Suspenso aparece una sola vez.

3. **Caché TMDB — `PUT /api/peliculas/cache/60308`**
   > Como sistema quiero guardar localmente una película para reducir llamadas a TMDB.
   Ejecutar y mencionar que `upsert` evita duplicados.

4. **Análisis IA — `POST /api/analisis`**
   > Como usuario quiero guardar la interpretación de IA y su relación académica.
   Ejecutar y señalar modelo, versión del prompt y `resultado` flexible.

## Funcionalidades 5 a 8 — 1:35 a 3:20

5. **Recomendaciones — `GET /api/usuarios/U011/recomendaciones`**
   > Como usuario quiero películas relacionadas con la carrera actual de mi perfil.
   Mostrar `carrera_actual`, `estado Completado` implícito y `carreras_coincidentes`.
   > Corregimos la observación del primer parcial: la carrera sale del perfil y `$filter` devuelve todas las coincidencias, no solo la primera.

6. **Catálogo por géneros — `GET /api/usuarios/U011/peliculas-por-generos`**
   > Como usuario quiero películas que coincidan con mis géneros favoritos.
   Mostrar el arreglo filtrado.

7. **Historial — `GET /api/usuarios/U001/historial?limit=5`**
   > Como usuario quiero recuperar mis cinco búsquedas más recientes.
   Señalar orden descendente y límite.

8. **Valoración — `POST /api/valoraciones`**
   > Como usuario quiero calificar una versión del análisis para evaluar la IA.
   Ejecutar y señalar el código `201`.

## Funcionalidades 9 y 10 — 3:20 a 4:40

9. **Eliminación y auditoría — `DELETE /api/analisis/AI007`**
   > Como administrador quiero eliminar un análisis deficiente sin perder trazabilidad.
   Mostrar antes `AI007` en MongoDB Compass, ejecutar y refrescar `analisis_ia` e `historial_admin`.
   > La eliminación y la auditoría pertenecen a una misma transacción: ambas ocurren o ninguna ocurre.

10. **Reporte — `GET /api/reportes/modelos`**
    > Como administrador quiero comparar valoración y tokens por modelo.
    Ejecutar y mostrar `calificacion_promedio`, `tokens_promedio` y cantidad de análisis.

## Cierre — 4:40 a 5:00

> La API usa rutas REST, códigos HTTP coherentes, validación, manejo centralizado de errores, índices y persistencia en MongoDB. Las credenciales permanecen en variables de entorno y el repositorio contiene las historias y una colección importable en Thunder Client o Postman.

## Respuestas rápidas a posibles preguntas

- **¿Por qué MongoDB?** El JSON del modelo cambia entre versiones del prompt; MongoDB permite conservarlo sin columnas nulas ni migraciones constantes.
- **¿Por qué `analisis_ia` está separado de `peliculas`?** Una película puede tener varias versiones del análisis y cada versión puede recibir valoraciones propias.
- **¿Por qué se necesita Atlas o un replica set?** MongoDB solo garantiza transacciones multidocumento en réplicas o clústeres fragmentados.
- **¿Cómo se evita duplicar películas?** `tmdb_id` tiene un índice único y la caché usa `upsert`.
- **¿Qué ocurre si falla la auditoría?** La transacción revierte automáticamente la eliminación.
