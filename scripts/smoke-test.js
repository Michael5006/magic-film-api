const assert = require('node:assert/strict');
const { MongoClient } = require('mongodb');
const { config, validateConfig } = require('../src/config');

const baseUrl = `http://localhost:${config.port}/api`;

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json();
  return { status: response.status, json };
}

function expectStatus(label, actual, expected) {
  assert.equal(actual.status, expected, `${label}: se esperaba ${expected}, llegó ${actual.status}: ${JSON.stringify(actual.json)}`);
  console.log(`✓ ${label} -> ${actual.status}`);
}

async function main() {
  validateConfig();

  expectStatus('01 registrar usuario', await request('/usuarios', {
    method: 'POST',
    body: {
      usuario_id: 'U011', nombre: 'Camila Ordonez', email: 'camila@correo.com',
      carrera: 'Ingenieria de Software',
      generos_favoritos: [{ id: 878, nombre: 'Ciencia ficcion' }, { id: 18, nombre: 'Drama' }]
    }
  }), 201);

  expectStatus('02 agregar género', await request('/usuarios/U011/generos', {
    method: 'PATCH', body: { id: 53, nombre: 'Suspenso' }
  }), 200);

  expectStatus('03 guardar caché TMDB', await request('/peliculas/cache/60308', {
    method: 'PUT',
    body: {
      titulo: 'Moneyball', anio: 2011, director: 'Bennett Miller',
      generos: [{ id: 18, nombre: 'Drama' }], duracion: 133,
      idioma_original: 'en', poster_path: '/moneyball.jpg',
      sinopsis: 'Análisis estadístico aplicado a un equipo deportivo.'
    }
  }), 201);

  expectStatus('04 almacenar análisis IA', await request('/analisis', {
    method: 'POST',
    body: {
      analisis_id: 'AI011', tmdb_id: 60308, proveedor: 'OpenRouter',
      modelo: 'anthropic/claude-3.5-sonnet', prompt_version: '1.2',
      resultado: {
        resumen_interpretativo: 'La obra defiende las decisiones basadas en datos.',
        temas: ['Analisis de datos'],
        carreras_sugeridas: [
          { carrera: 'Ingenieria de Software', justificacion: 'Datos para decidir.', puntaje: 87 },
          { carrera: 'Administracion de Empresas', justificacion: 'Gestión de recursos.', puntaje: 83 }
        ]
      },
      tokens_usados: 1590, estado: 'Completado'
    }
  }), 201);

  const recommendations = await request('/usuarios/U011/recomendaciones');
  expectStatus('05 recomendar por carrera actual', recommendations, 200);
  assert.equal(recommendations.json.data.carrera_actual, 'Ingenieria de Software');
  assert.ok(recommendations.json.data.recomendaciones.length >= 1);
  assert.ok(recommendations.json.data.recomendaciones.every((item) => item.carreras_coincidentes.length >= 1));

  const genres = await request('/usuarios/U011/peliculas-por-generos');
  expectStatus('06 filtrar por géneros', genres, 200);
  assert.ok(genres.json.total >= 1);

  const history = await request('/usuarios/U001/historial?limit=5');
  expectStatus('07 historial reciente', history, 200);
  assert.ok(history.json.total >= 1 && history.json.total <= 5);

  expectStatus('08 valorar análisis', await request('/valoraciones', {
    method: 'POST',
    body: {
      valoracion_id: 'V011', usuario_id: 'U011', analisis_id: 'AI011',
      puntuacion: 5, comentario: 'Relación académica clara.', util_para_carrera: true
    }
  }), 201);

  const deletion = await request('/analisis/AI007', {
    method: 'DELETE',
    body: { admin: 'admin@magicfilm.com', detalle: 'Se regenerará con el prompt vigente.' }
  });
  expectStatus('09 eliminar y auditar', deletion, 200);

  const report = await request('/reportes/modelos');
  expectStatus('10 reporte de modelos', report, 200);
  assert.ok(report.json.total_modelos >= 2);

  expectStatus('validación 400', await request('/valoraciones', {
    method: 'POST', body: { puntuacion: 9 }
  }), 400);
  expectStatus('recurso 404', await request('/usuarios/NO-EXISTE/historial'), 404);
  expectStatus('conflicto 409', await request('/usuarios', {
    method: 'POST',
    body: {
      usuario_id: 'OTRO', nombre: 'Duplicado', email: 'camila@correo.com',
      carrera: 'Derecho', generos_favoritos: []
    }
  }), 409);

  const client = new MongoClient(config.mongodbUri);
  try {
    await client.connect();
    const db = client.db(config.mongodbDb);
    const [removed, audit] = await Promise.all([
      db.collection('analisis_ia').findOne({ analisis_id: 'AI007' }),
      db.collection('historial_admin').findOne({ entidad: 'analisis_ia', entidad_id: 'AI007', accion: 'eliminar' })
    ]);
    assert.equal(removed, null, 'AI007 debe haber sido eliminado.');
    assert.ok(audit, 'Debe existir la auditoría de AI007.');
    console.log('✓ persistencia transaccional verificada directamente en MongoDB');
  } finally {
    await client.close();
  }

  console.log('\nTodas las pruebas de humo pasaron.');
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
