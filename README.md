# Magic Film API REST

MVP académico que almacena películas consultadas en TMDB, conserva análisis cinematográficos generados mediante OpenRouter y recomienda obras según la carrera y los géneros del perfil del usuario.

## Tecnologías

- Node.js 20 o superior y Express 5.
- MongoDB Atlas o una instalación local configurada como replica set. La réplica es necesaria para la transacción de eliminación y auditoría.
- Thunder Client o Postman para la demostración.

## Puesta en marcha

1. Instalar dependencias:

   ```powershell
   npm.cmd install
   ```

2. Copiar `.env.example` como `.env` y configurar la conexión. En el equipo de demostración, el servicio tradicional de MongoDB ya está configurado como `rs0` y utiliza:

   ```text
   MONGODB_URI=mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true
   MONGODB_DB=magic_film
   ```

   Para utilizar MongoDB Atlas, reemplazar `MONGODB_URI` con su cadena de conexión:

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

3. Crear colecciones, validadores, índices y datos de demostración cuando MongoDB esté disponible:

   ```powershell
   npm.cmd run seed
   ```

   El comando es idempotente para los datos base. También restablece `U011`, `60308`, `AI011` y `V011`, que son los registros creados durante la demostración.

4. Iniciar la API:

   ```powershell
   npm.cmd run dev
   ```

5. Verificar `GET http://localhost:3000/api/salud` e importar `postman/Magic-Film.postman_collection.json`.

   Para revisar la base en MongoDB Compass, conectarse con:

   ```text
   mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true
   ```

6. La verificación automatizada opcional ejecuta las diez rutas y confirma la transacción directamente en MongoDB. Como modifica los datos de demostración, se debe volver a ejecutar `npm.cmd run seed` al terminar:

   ```powershell
   npm.cmd run smoke
   npm.cmd run seed
   ```

## Diez funcionalidades evaluables

| N.º | Historia de usuario | Método y endpoint | Resultado esperado |
|---:|---|---|---|
| 1 | Como usuario quiero registrarme con mi carrera y géneros para recibir contenido personalizado. | `POST /api/usuarios` | `201`, usuario persistido. |
| 2 | Como usuario quiero agregar un género para ajustar mis preferencias sin duplicados. | `PATCH /api/usuarios/:usuarioId/generos` | `200`, arreglo actualizado. |
| 3 | Como sistema quiero guardar o refrescar una película de TMDB para reducir peticiones externas. | `PUT /api/peliculas/cache/:tmdbId` | `201` al crear o `200` al actualizar. |
| 4 | Como usuario quiero almacenar la interpretación de IA para consultar su significado académico. | `POST /api/analisis` | `201`, JSON flexible almacenado. |
| 5 | Como usuario quiero recomendaciones vinculadas con la carrera que tengo actualmente en mi perfil. | `GET /api/usuarios/:usuarioId/recomendaciones` | `200`, películas ordenadas por pertinencia. |
| 6 | Como usuario quiero explorar películas según mis géneros favoritos. | `GET /api/usuarios/:usuarioId/peliculas-por-generos` | `200`, catálogo filtrado. |
| 7 | Como usuario quiero consultar mis búsquedas recientes para retomar películas anteriores. | `GET /api/usuarios/:usuarioId/historial?limit=5` | `200`, historial descendente. |
| 8 | Como usuario quiero valorar un análisis para retroalimentar la calidad de la IA. | `POST /api/valoraciones` | `201`, valoración asociada a una versión del análisis. |
| 9 | Como administrador quiero eliminar un análisis y auditar la acción sin perder trazabilidad. | `DELETE /api/analisis/:analisisId` | `200`, eliminación y auditoría en una transacción. |
| 10 | Como administrador quiero comparar calidad y tokens por modelo para evaluar costo y desempeño. | `GET /api/reportes/modelos` | `200`, promedios agrupados por modelo. |

## Correcciones solicitadas por el profesor

### Funcionalidad 5: recomendaciones por carrera

La carrera no se recibe desde un parámetro manipulable: la agregación inicia en `usuarios`, toma la carrera actual del perfil y la pasa a `$lookup` mediante `let`. Solo considera análisis con `estado: "Completado"`. Dentro de cada análisis usa `$filter` sobre `resultado.carreras_sugeridas`, por lo cual conserva **todos** los elementos coincidentes. Esto evita la limitación de la proyección posicional `$`, que solo retorna la primera coincidencia.

### Funcionalidad 9: eliminación auditada

`deleteOne()` y `insertOne()` se ejecutan dentro de `session.withTransaction()`, con `readConcern: snapshot` y `writeConcern: majority`. Si falla la auditoría, MongoDB revierte la eliminación; si falla la eliminación, no se crea una auditoría falsa. El registro incluye además una instantánea mínima del modelo y la versión del prompt eliminados.

## Reglas y manejo de errores

- Respuestas uniformes en JSON con la propiedad `ok`.
- `400` para cuerpos inválidos, `404` para recursos inexistentes, `409` para identificadores o correos duplicados, `503` si MongoDB no admite transacciones y `500` para fallos inesperados.
- Índices únicos sobre identificadores de negocio y correo.
- Índice multiclave para `resultado.carreras_sugeridas.carrera` y `generos.id`.
- Una valoración por usuario y análisis mediante índice compuesto único.
- Variables de entorno para evitar credenciales en GitHub.
- Esquemas moderados: validan los campos esenciales, pero `resultado` sigue siendo flexible entre versiones del prompt.

## Estructura

```text
magic-film-api/
├── postman/Magic-Film.postman_collection.json
├── scripts/seed.js
├── src/
│   ├── routes/api.js
│   ├── app.js
│   ├── config.js
│   ├── db.js
│   ├── errors.js
│   ├── middleware.js
│   └── server.js
├── .env.example
└── package.json
```

## Publicación

Antes de enviar el enlace al profesor, comprobar que `.env` no aparezca en GitHub y que el repositorio sea público. La cadena real de MongoDB nunca debe subirse; solamente se publica `.env.example`.
