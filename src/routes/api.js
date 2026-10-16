const express = require('express');
const { randomUUID } = require('crypto');
const { getDb, getClient } = require('../db');
const { assert, AppError } = require('../errors');
const { asyncHandler } = require('../middleware');

const router = express.Router();

const nonEmptyText = (value) => typeof value === 'string' && value.trim().length > 0;
const makeId = (prefix) => `${prefix}-${randomUUID()}`;

function validateGenres(genres) {
  assert(Array.isArray(genres), 400, 'generos_favoritos debe ser un arreglo.');
  assert(
    genres.every((genre) => Number.isInteger(genre?.id) && nonEmptyText(genre?.nombre)),
    400,
    'Cada género requiere id entero y nombre.'
  );
}

// 1. Registrar usuario y su perfil académico.
router.post('/usuarios', asyncHandler(async (req, res) => {
  const { usuario_id, nombre, email, carrera, generos_favoritos = [] } = req.body;
  assert(nonEmptyText(nombre), 400, 'El nombre es obligatorio.');
  assert(nonEmptyText(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 400, 'El email no es válido.');
  assert(nonEmptyText(carrera), 400, 'La carrera es obligatoria.');
  validateGenres(generos_favoritos);

  const user = {
    usuario_id: nonEmptyText(usuario_id) ? usuario_id.trim() : makeId('U'),
    nombre: nombre.trim(),
    email: email.trim().toLowerCase(),
    carrera: carrera.trim(),
    generos_favoritos,
    fecha_registro: new Date()
  };

  await getDb().collection('usuarios').insertOne(user);
  res.status(201).json({ ok: true, mensaje: 'Usuario registrado.', data: user });
}));

// 2. Agregar un género sin duplicarlo por su identificador de TMDB.
router.patch('/usuarios/:usuarioId/generos', asyncHandler(async (req, res) => {
  const { usuarioId } = req.params;
  const genre = req.body;
  validateGenres([genre]);

  const users = getDb().collection('usuarios');
  const result = await users.updateOne(
    { usuario_id: usuarioId, 'generos_favoritos.id': { $ne: genre.id } },
    { $push: { generos_favoritos: { id: genre.id, nombre: genre.nombre.trim() } } }
  );

  if (!result.matchedCount) {
    const user = await users.findOne({ usuario_id: usuarioId }, { projection: { _id: 0 } });
    assert(user, 404, 'Usuario no encontrado.');
    return res.status(200).json({ ok: true, mensaje: 'El género ya estaba registrado.', data: user });
  }

  const updated = await users.findOne({ usuario_id: usuarioId }, { projection: { _id: 0 } });
  res.status(200).json({ ok: true, mensaje: 'Preferencias actualizadas.', data: updated });
}));

// 3. Crear o refrescar la película almacenada como caché de TMDB.
router.put('/peliculas/cache/:tmdbId', asyncHandler(async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  const { titulo, anio, director, generos, duracion, idioma_original, poster_path, sinopsis } = req.body;
  assert(Number.isInteger(tmdbId) && tmdbId > 0, 400, 'tmdbId debe ser un entero positivo.');
  assert(nonEmptyText(titulo), 400, 'El título es obligatorio.');
  assert(Number.isInteger(anio) && anio >= 1888, 400, 'El año debe ser un entero válido.');
  assert(Number.isInteger(duracion) && duracion > 0, 400, 'La duración debe ser un entero positivo.');
  assert(Array.isArray(generos), 400, 'Los géneros deben enviarse como arreglo.');
  validateGenres(generos);

  const movie = {
    tmdb_id: tmdbId,
    titulo: titulo.trim(),
    anio: Number(anio),
    director: nonEmptyText(director) ? director.trim() : null,
    generos,
    duracion: Number(duracion),
    idioma_original: idioma_original || null,
    poster_path: poster_path || null,
    sinopsis: sinopsis || '',
    fecha_cache: new Date()
  };

  const result = await getDb().collection('peliculas').updateOne(
    { tmdb_id: tmdbId },
    { $set: movie },
    { upsert: true }
  );

  const created = result.upsertedCount === 1;
  res.status(created ? 201 : 200).json({
    ok: true,
    mensaje: created ? 'Película agregada a la caché.' : 'Caché de película actualizada.',
    data: movie
  });
}));

// 4. Guardar el JSON flexible producido por el modelo de IA.
router.post('/analisis', asyncHandler(async (req, res) => {
  const {
    analisis_id,
    tmdb_id,
    proveedor = 'OpenRouter',
    modelo,
    prompt_version,
    resultado,
    tokens_usados,
    estado = 'Completado'
  } = req.body;

  assert(Number.isInteger(tmdb_id), 400, 'tmdb_id debe ser entero.');
  assert(nonEmptyText(modelo), 400, 'El modelo es obligatorio.');
  assert(nonEmptyText(prompt_version), 400, 'La versión del prompt es obligatoria.');
  assert(resultado && typeof resultado === 'object' && !Array.isArray(resultado), 400, 'resultado debe ser un objeto JSON.');
  assert(Number.isInteger(tokens_usados) && tokens_usados >= 0, 400, 'tokens_usados debe ser un entero no negativo.');
  assert(['Pendiente', 'Completado', 'Fallido'].includes(estado), 400, 'Estado de análisis no permitido.');

  const db = getDb();
  const movieExists = await db.collection('peliculas').findOne({ tmdb_id }, { projection: { _id: 1 } });
  assert(movieExists, 404, 'La película no existe en la caché local.');

  const analysis = {
    analisis_id: nonEmptyText(analisis_id) ? analisis_id.trim() : makeId('AI'),
    tmdb_id,
    proveedor,
    modelo: modelo.trim(),
    prompt_version: prompt_version.trim(),
    resultado,
    tokens_usados: Number(tokens_usados || 0),
    estado,
    fecha: new Date()
  };

  await db.collection('analisis_ia').insertOne(analysis);
  res.status(201).json({ ok: true, mensaje: 'Análisis almacenado.', data: analysis });
}));

// 5. Recomendaciones calculadas con la carrera ACTUAL del perfil.
// $filter conserva todos los elementos coincidentes, a diferencia de la proyección posicional "$".
router.get('/usuarios/:usuarioId/recomendaciones', asyncHandler(async (req, res) => {
  const [profile] = await getDb().collection('usuarios').aggregate([
    { $match: { usuario_id: req.params.usuarioId } },
    {
      $lookup: {
        from: 'analisis_ia',
        let: { carreraUsuario: '$carrera' },
        pipeline: [
          { $match: { estado: 'Completado' } },
          {
            $set: {
              carreras_coincidentes: {
                $filter: {
                  input: { $ifNull: ['$resultado.carreras_sugeridas', []] },
                  as: 'sugerencia',
                  cond: {
                    $eq: [
                      { $toLower: '$$sugerencia.carrera' },
                      { $toLower: '$$carreraUsuario' }
                    ]
                  }
                }
              }
            }
          },
          { $match: { $expr: { $gt: [{ $size: '$carreras_coincidentes' }, 0] } } },
          {
            $lookup: {
              from: 'peliculas',
              localField: 'tmdb_id',
              foreignField: 'tmdb_id',
              as: 'pelicula'
            }
          },
          { $unwind: '$pelicula' },
          { $set: { puntaje_maximo: { $max: '$carreras_coincidentes.puntaje' } } },
          { $sort: { puntaje_maximo: -1, fecha: -1 } },
          {
            $project: {
              _id: 0,
              analisis_id: 1,
              tmdb_id: 1,
              titulo: '$pelicula.titulo',
              poster_path: '$pelicula.poster_path',
              resumen_interpretativo: '$resultado.resumen_interpretativo',
              temas: { $ifNull: ['$resultado.temas', []] },
              carreras_coincidentes: 1,
              puntaje_maximo: 1
            }
          }
        ],
        as: 'recomendaciones'
      }
    },
    {
      $project: {
        _id: 0,
        usuario_id: 1,
        nombre: 1,
        carrera_actual: '$carrera',
        total: { $size: '$recomendaciones' },
        recomendaciones: 1
      }
    }
  ]).toArray();

  assert(profile, 404, 'Usuario no encontrado.');
  res.status(200).json({ ok: true, data: profile });
}));

// 6. Explorar películas que coinciden con los géneros actuales del perfil.
router.get('/usuarios/:usuarioId/peliculas-por-generos', asyncHandler(async (req, res) => {
  const db = getDb();
  const user = await db.collection('usuarios').findOne(
    { usuario_id: req.params.usuarioId },
    { projection: { _id: 0, usuario_id: 1, generos_favoritos: 1 } }
  );
  assert(user, 404, 'Usuario no encontrado.');

  const genreIds = user.generos_favoritos.map((genre) => genre.id);
  const movies = await db.collection('peliculas')
    .find({ 'generos.id': { $in: genreIds } }, { projection: { _id: 0 } })
    .sort({ titulo: 1 })
    .toArray();

  res.status(200).json({ ok: true, total: movies.length, data: movies });
}));

// 7. Consultar las búsquedas recientes de un usuario.
router.get('/usuarios/:usuarioId/historial', asyncHandler(async (req, res) => {
  const requestedLimit = Number(req.query.limit || 5);
  assert(Number.isInteger(requestedLimit) && requestedLimit >= 1, 400, 'limit debe ser un entero positivo.');
  const limit = Math.min(requestedLimit, 20);
  const db = getDb();
  const userExists = await db.collection('usuarios').findOne(
    { usuario_id: req.params.usuarioId },
    { projection: { _id: 1 } }
  );
  assert(userExists, 404, 'Usuario no encontrado.');

  const history = await db.collection('historial_busquedas')
    .find({ usuario_id: req.params.usuarioId }, { projection: { _id: 0 } })
    .sort({ fecha: -1 })
    .limit(limit)
    .toArray();

  res.status(200).json({ ok: true, total: history.length, data: history });
}));

// 8. Valorar la versión concreta de un análisis.
router.post('/valoraciones', asyncHandler(async (req, res) => {
  const {
    valoracion_id,
    usuario_id,
    analisis_id,
    puntuacion,
    comentario = '',
    util_para_carrera
  } = req.body;

  assert(nonEmptyText(usuario_id), 400, 'usuario_id es obligatorio.');
  assert(nonEmptyText(analisis_id), 400, 'analisis_id es obligatorio.');
  assert(Number.isInteger(puntuacion) && puntuacion >= 1 && puntuacion <= 5, 400, 'La puntuación debe ser un entero entre 1 y 5.');
  assert(typeof comentario === 'string', 400, 'El comentario debe ser texto.');
  assert(typeof util_para_carrera === 'boolean', 400, 'util_para_carrera debe ser booleano.');

  const db = getDb();
  const [user, analysis] = await Promise.all([
    db.collection('usuarios').findOne({ usuario_id }, { projection: { _id: 1 } }),
    db.collection('analisis_ia').findOne({ analisis_id }, { projection: { _id: 1, tmdb_id: 1 } })
  ]);
  assert(user, 404, 'Usuario no encontrado.');
  assert(analysis, 404, 'Análisis no encontrado.');

  const rating = {
    valoracion_id: nonEmptyText(valoracion_id) ? valoracion_id.trim() : makeId('V'),
    usuario_id,
    analisis_id,
    tmdb_id: analysis.tmdb_id,
    puntuacion,
    comentario,
    util_para_carrera,
    fecha: new Date()
  };
  await db.collection('valoraciones').insertOne(rating);
  res.status(201).json({ ok: true, mensaje: 'Valoración registrada.', data: rating });
}));

// 9. Eliminar el análisis y escribir la auditoría en la MISMA transacción.
router.delete('/analisis/:analisisId', asyncHandler(async (req, res) => {
  const { analisisId } = req.params;
  const { admin, detalle } = req.body;
  assert(nonEmptyText(admin), 400, 'El correo del administrador es obligatorio.');
  assert(nonEmptyText(detalle), 400, 'El motivo de eliminación es obligatorio.');

  const db = getDb();
  const session = getClient().startSession();
  const auditId = makeId('HA');
  let deletedAnalysis;

  try {
    await session.withTransaction(async () => {
      deletedAnalysis = await db.collection('analisis_ia').findOne(
        { analisis_id: analisisId },
        { session }
      );
      if (!deletedAnalysis) throw new AppError(404, 'Análisis no encontrado.');

      const deletion = await db.collection('analisis_ia').deleteOne(
        { analisis_id: analisisId },
        { session }
      );
      if (deletion.deletedCount !== 1) throw new AppError(409, 'El análisis cambió durante la eliminación.');

      await db.collection('historial_admin').insertOne({
        registro_id: auditId,
        admin: admin.trim().toLowerCase(),
        accion: 'eliminar',
        entidad: 'analisis_ia',
        entidad_id: analisisId,
        detalle: detalle.trim(),
        snapshot: {
          tmdb_id: deletedAnalysis.tmdb_id,
          modelo: deletedAnalysis.modelo,
          prompt_version: deletedAnalysis.prompt_version
        },
        fecha: new Date()
      }, { session });
    }, {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' }
    });
  } finally {
    await session.endSession();
  }

  res.status(200).json({
    ok: true,
    mensaje: 'Análisis eliminado y acción auditada atómicamente.',
    data: { analisis_id: analisisId, registro_auditoria: auditId }
  });
}));

// 10. Comparar calidad y consumo sin duplicar tokens por cantidad de valoraciones.
router.get('/reportes/modelos', asyncHandler(async (req, res) => {
  const report = await getDb().collection('analisis_ia').aggregate([
    { $match: { estado: 'Completado' } },
    {
      $lookup: {
        from: 'valoraciones',
        localField: 'analisis_id',
        foreignField: 'analisis_id',
        as: 'valoraciones'
      }
    },
    {
      $project: {
        modelo: 1,
        tokens_usados: 1,
        calificacion_analisis: {
          $cond: [
            { $gt: [{ $size: '$valoraciones' }, 0] },
            { $avg: '$valoraciones.puntuacion' },
            null
          ]
        },
        cantidad_valoraciones: { $size: '$valoraciones' }
      }
    },
    {
      $group: {
        _id: '$modelo',
        analisis_generados: { $sum: 1 },
        tokens_promedio: { $avg: '$tokens_usados' },
        calificacion_promedio: { $avg: '$calificacion_analisis' },
        valoraciones_recibidas: { $sum: '$cantidad_valoraciones' }
      }
    },
    {
      $project: {
        _id: 0,
        modelo: '$_id',
        analisis_generados: 1,
        tokens_promedio: { $round: ['$tokens_promedio', 2] },
        calificacion_promedio: { $round: ['$calificacion_promedio', 2] },
        valoraciones_recibidas: 1
      }
    },
    { $sort: { calificacion_promedio: -1, tokens_promedio: 1 } }
  ]).toArray();

  res.status(200).json({ ok: true, total_modelos: report.length, data: report });
}));

module.exports = router;
