const { MongoClient } = require('mongodb');
const { config, validateConfig } = require('../src/config');

const schemas = {
  usuarios: {
    bsonType: 'object',
    required: ['usuario_id', 'nombre', 'email', 'carrera', 'generos_favoritos', 'fecha_registro'],
    properties: {
      usuario_id: { bsonType: 'string' },
      nombre: { bsonType: 'string' },
      email: { bsonType: 'string' },
      carrera: { bsonType: 'string' },
      generos_favoritos: { bsonType: 'array' },
      fecha_registro: { bsonType: 'date' }
    }
  },
  peliculas: {
    bsonType: 'object',
    required: ['tmdb_id', 'titulo', 'generos', 'fecha_cache'],
    properties: {
      tmdb_id: { bsonType: 'int' },
      titulo: { bsonType: 'string' },
      generos: { bsonType: 'array' },
      fecha_cache: { bsonType: 'date' }
    }
  },
  analisis_ia: {
    bsonType: 'object',
    required: ['analisis_id', 'tmdb_id', 'modelo', 'prompt_version', 'resultado', 'estado', 'fecha'],
    properties: {
      analisis_id: { bsonType: 'string' },
      tmdb_id: { bsonType: 'int' },
      modelo: { bsonType: 'string' },
      prompt_version: { bsonType: 'string' },
      resultado: { bsonType: 'object' },
      estado: { enum: ['Pendiente', 'Completado', 'Fallido'] },
      fecha: { bsonType: 'date' }
    }
  },
  historial_busquedas: {
    bsonType: 'object',
    required: ['busqueda_id', 'usuario_id', 'termino', 'tmdb_id', 'fecha'],
    properties: { fecha: { bsonType: 'date' } }
  },
  valoraciones: {
    bsonType: 'object',
    required: ['valoracion_id', 'usuario_id', 'analisis_id', 'puntuacion', 'util_para_carrera', 'fecha'],
    properties: {
      puntuacion: { bsonType: 'int', minimum: 1, maximum: 5 },
      util_para_carrera: { bsonType: 'bool' },
      fecha: { bsonType: 'date' }
    }
  },
  historial_admin: {
    bsonType: 'object',
    required: ['registro_id', 'admin', 'accion', 'entidad', 'entidad_id', 'fecha'],
    properties: { fecha: { bsonType: 'date' } }
  }
};

const indexes = {
  usuarios: [
    [{ usuario_id: 1 }, { unique: true }],
    [{ email: 1 }, { unique: true }]
  ],
  peliculas: [
    [{ tmdb_id: 1 }, { unique: true }],
    [{ 'generos.id': 1 }, {}]
  ],
  analisis_ia: [
    [{ analisis_id: 1 }, { unique: true }],
    [{ tmdb_id: 1, estado: 1 }, {}],
    [{ 'resultado.carreras_sugeridas.carrera': 1, estado: 1 }, {}]
  ],
  historial_busquedas: [
    [{ busqueda_id: 1 }, { unique: true }],
    [{ usuario_id: 1, fecha: -1 }, {}]
  ],
  valoraciones: [
    [{ valoracion_id: 1 }, { unique: true }],
    [{ usuario_id: 1, analisis_id: 1 }, { unique: true }],
    [{ analisis_id: 1 }, {}]
  ],
  historial_admin: [
    [{ registro_id: 1 }, { unique: true }],
    [{ entidad: 1, entidad_id: 1, fecha: -1 }, {}]
  ]
};

const d = (date) => new Date(`${date}T12:00:00.000Z`);

const seed = {
  usuarios: [
    { usuario_id: 'U001', nombre: 'Michael Marin', email: 'michael@correo.com', carrera: 'Ingenieria de Software', generos_favoritos: [{ id: 18, nombre: 'Drama' }, { id: 878, nombre: 'Ciencia ficcion' }], fecha_registro: d('2026-08-01') },
    { usuario_id: 'U002', nombre: 'Laura Mendez', email: 'laura@correo.com', carrera: 'Medicina', generos_favoritos: [{ id: 18, nombre: 'Drama' }, { id: 99, nombre: 'Documental' }], fecha_registro: d('2026-08-02') },
    { usuario_id: 'U003', nombre: 'Andres Munoz', email: 'andres@correo.com', carrera: 'Derecho', generos_favoritos: [{ id: 80, nombre: 'Crimen' }, { id: 18, nombre: 'Drama' }], fecha_registro: d('2026-08-03') },
    { usuario_id: 'U004', nombre: 'Valentina Ruiz', email: 'valentina@correo.com', carrera: 'Administracion de Empresas', generos_favoritos: [{ id: 35, nombre: 'Comedia' }, { id: 18, nombre: 'Drama' }], fecha_registro: d('2026-08-04') },
    { usuario_id: 'U006', nombre: 'Daniela Zuniga', email: 'daniela@correo.com', carrera: 'Ingenieria de Software', generos_favoritos: [{ id: 878, nombre: 'Ciencia ficcion' }, { id: 53, nombre: 'Suspenso' }], fecha_registro: d('2026-08-06') },
    { usuario_id: 'U009', nombre: 'Camilo Vargas', email: 'camilo@correo.com', carrera: 'Ingenieria Industrial', generos_favoritos: [{ id: 36, nombre: 'Historia' }], fecha_registro: d('2026-08-09') },
    { usuario_id: 'U010', nombre: 'Paula Ceron', email: 'paula@correo.com', carrera: 'Licenciatura en Educacion', generos_favoritos: [{ id: 18, nombre: 'Drama' }, { id: 35, nombre: 'Comedia' }], fecha_registro: d('2026-08-10') }
  ],
  peliculas: [
    { tmdb_id: 37799, titulo: 'The Social Network', anio: 2010, director: 'David Fincher', generos: [{ id: 18, nombre: 'Drama' }], duracion: 120, idioma_original: 'en', poster_path: '/n0ybibhJtQ5icDqTp8eRytcIHJx.jpg', sinopsis: 'Creación de una red social universitaria y conflictos legales derivados de su expansión.', fecha_cache: d('2026-08-15') },
    { tmdb_id: 205596, titulo: 'The Imitation Game', anio: 2014, director: 'Morten Tyldum', generos: [{ id: 18, nombre: 'Drama' }, { id: 36, nombre: 'Historia' }], duracion: 114, idioma_original: 'en', poster_path: '/noUp0XOqIcmgefRXRvmKrRYvnSc.jpg', sinopsis: 'Historia del descifrado de una máquina durante la Segunda Guerra Mundial.', fecha_cache: d('2026-08-15') },
    { tmdb_id: 381284, titulo: 'Hidden Figures', anio: 2016, director: 'Theodore Melfi', generos: [{ id: 18, nombre: 'Drama' }, { id: 36, nombre: 'Historia' }], duracion: 127, idioma_original: 'en', poster_path: '/9lfC2UQ2kaFEKChcQhAOFcrtm2M.jpg', sinopsis: 'Matemáticas cuyo trabajo fue decisivo para una misión espacial.', fecha_cache: d('2026-08-16') },
    { tmdb_id: 462, titulo: 'Erin Brockovich', anio: 2000, director: 'Steven Soderbergh', generos: [{ id: 18, nombre: 'Drama' }], duracion: 131, idioma_original: 'en', poster_path: null, sinopsis: 'Investigación de una demanda colectiva por contaminación ambiental.', fecha_cache: d('2026-08-16') },
    { tmdb_id: 1013, titulo: 'Patch Adams', anio: 1998, director: 'Tom Shadyac', generos: [{ id: 18, nombre: 'Drama' }, { id: 35, nombre: 'Comedia' }], duracion: 115, idioma_original: 'en', poster_path: null, sinopsis: 'Un estudiante propone un modelo de atención centrado en el trato humano.', fecha_cache: d('2026-08-17') },
    { tmdb_id: 318846, titulo: 'The Big Short', anio: 2015, director: 'Adam McKay', generos: [{ id: 18, nombre: 'Drama' }, { id: 35, nombre: 'Comedia' }], duracion: 130, idioma_original: 'en', poster_path: null, sinopsis: 'Decisiones financieras que condujeron a una crisis económica global.', fecha_cache: d('2026-08-17') },
    { tmdb_id: 9502, titulo: 'Les Choristes', anio: 2004, director: 'Christophe Barratier', generos: [{ id: 18, nombre: 'Drama' }], duracion: 97, idioma_original: 'fr', poster_path: null, sinopsis: 'La música como herramienta pedagógica en un internado.', fecha_cache: d('2026-08-18') },
    { tmdb_id: 264660, titulo: 'Ex Machina', anio: 2015, director: 'Alex Garland', generos: [{ id: 878, nombre: 'Ciencia ficcion' }, { id: 53, nombre: 'Suspenso' }], duracion: 108, idioma_original: 'en', poster_path: '/aWDeRUupmB7cPSK0duWZHTx4o2u.jpg', sinopsis: 'Un programador evalúa la conciencia de un sistema de IA.', fecha_cache: d('2026-08-18') }
  ],
  analisis_ia: [
    { analisis_id: 'AI001', tmdb_id: 37799, proveedor: 'OpenRouter', modelo: 'meta-llama/llama-3.3-70b-instruct', prompt_version: '1.1', resultado: { resumen_interpretativo: 'Expone consecuencias legales y humanas de construir software sin acuerdos claros.', temas: ['Propiedad intelectual', 'Etica profesional'], valores_formativos: ['Responsabilidad'], carreras_sugeridas: [{ carrera: 'Ingenieria de Software', justificacion: 'Relaciona producto digital, ética y propiedad intelectual.', puntaje: 95 }, { carrera: 'Derecho', justificacion: 'Presenta litigios por participación societaria.', puntaje: 72 }] }, tokens_usados: 1480, estado: 'Completado', fecha: d('2026-08-15') },
    { analisis_id: 'AI002', tmdb_id: 205596, proveedor: 'OpenRouter', modelo: 'meta-llama/llama-3.3-70b-instruct', prompt_version: '1.1', resultado: { resumen_interpretativo: 'Ilustra el impacto del pensamiento algorítmico y la discriminación institucional.', temas: ['Criptografia', 'Algoritmos'], valores_formativos: ['Perseverancia'], carreras_sugeridas: [{ carrera: 'Ingenieria de Software', justificacion: 'Aporta contexto sobre criptografía y algoritmos.', puntaje: 92 }] }, tokens_usados: 1395, estado: 'Completado', fecha: d('2026-08-15') },
    { analisis_id: 'AI003', tmdb_id: 381284, proveedor: 'OpenRouter', modelo: 'meta-llama/llama-3.3-70b-instruct', prompt_version: '1.1', resultado: { resumen_interpretativo: 'Muestra el rigor matemático frente a barreras estructurales.', temas: ['Calculo aplicado', 'Equidad'], valores_formativos: ['Rigor'], carreras_sugeridas: [{ carrera: 'Ingenieria Industrial', justificacion: 'Ilustra organización del trabajo técnico.', puntaje: 78 }, { carrera: 'Ingenieria de Software', justificacion: 'Expone el cálculo como base computacional.', puntaje: 74 }] }, tokens_usados: 1502, estado: 'Completado', fecha: d('2026-08-16') },
    { analisis_id: 'AI004', tmdb_id: 462, proveedor: 'OpenRouter', modelo: 'google/gemini-flash-1.5', prompt_version: '1.0-fallback', resultado: { resumen_interpretativo: 'Presenta la recolección de evidencia para defender derechos colectivos.', carreras_sugeridas: [{ carrera: 'Derecho', justificacion: 'Desarrolla prueba y litigio colectivo.', puntaje: 93 }] }, tokens_usados: 640, estado: 'Completado', fecha: d('2026-08-16') },
    { analisis_id: 'AI005', tmdb_id: 1013, proveedor: 'OpenRouter', modelo: 'meta-llama/llama-3.3-70b-instruct', prompt_version: '1.1', resultado: { resumen_interpretativo: 'Propone la empatía como componente terapéutico.', temas: ['Humanizacion de la salud', 'Bioetica'], carreras_sugeridas: [{ carrera: 'Medicina', justificacion: 'Reflexiona sobre la atención en salud.', puntaje: 94 }] }, tokens_usados: 1610, estado: 'Completado', fecha: d('2026-08-17') },
    { analisis_id: 'AI006', tmdb_id: 318846, proveedor: 'OpenRouter', modelo: 'meta-llama/llama-3.3-70b-instruct', prompt_version: '1.1', resultado: { resumen_interpretativo: 'Traduce conceptos financieros y evidencia fallas de control.', temas: ['Riesgo financiero'], carreras_sugeridas: [{ carrera: 'Administracion de Empresas', justificacion: 'Analiza riesgo y decisiones financieras.', puntaje: 89 }] }, tokens_usados: 1725, estado: 'Completado', fecha: d('2026-08-17') },
    { analisis_id: 'AI007', tmdb_id: 9502, proveedor: 'OpenRouter', modelo: 'google/gemini-flash-1.5', prompt_version: '1.0-fallback', resultado: { resumen_interpretativo: 'El vínculo afectivo y el arte mejoran el aprendizaje.', carreras_sugeridas: [{ carrera: 'Licenciatura en Educacion', justificacion: 'Desarrolla estrategias pedagógicas.', puntaje: 88 }] }, tokens_usados: 580, estado: 'Completado', fecha: d('2026-08-18') },
    { analisis_id: 'AI008', tmdb_id: 264660, proveedor: 'OpenRouter', modelo: 'meta-llama/llama-3.3-70b-instruct', prompt_version: '1.1', resultado: { resumen_interpretativo: 'Plantea límites de la conciencia artificial y responsabilidad del desarrollador.', temas: ['Inteligencia artificial', 'Etica tecnologica'], carreras_sugeridas: [{ carrera: 'Ingenieria de Software', justificacion: 'Permite discutir ética de IA.', puntaje: 90 }] }, tokens_usados: 1688, estado: 'Completado', fecha: d('2026-08-18') }
  ],
  historial_busquedas: [
    { busqueda_id: 'B001', usuario_id: 'U001', termino: 'The Social Network', tmdb_id: 37799, fecha: d('2026-08-20') },
    { busqueda_id: 'B006', usuario_id: 'U001', termino: 'Ex Machina', tmdb_id: 264660, fecha: d('2026-08-23') },
    { busqueda_id: 'B008', usuario_id: 'U001', termino: 'The Imitation Game', tmdb_id: 205596, fecha: d('2026-08-25') }
  ],
  valoraciones: [
    { valoracion_id: 'V001', usuario_id: 'U001', analisis_id: 'AI001', tmdb_id: 37799, puntuacion: 5, comentario: 'Explica bien el conflicto de propiedad intelectual.', util_para_carrera: true, fecha: d('2026-08-20') },
    { valoracion_id: 'V002', usuario_id: 'U002', analisis_id: 'AI005', tmdb_id: 1013, puntuacion: 5, comentario: 'Se conecta con bioética.', util_para_carrera: true, fecha: d('2026-08-20') },
    { valoracion_id: 'V003', usuario_id: 'U003', analisis_id: 'AI004', tmdb_id: 462, puntuacion: 4, comentario: 'Buen enfoque jurídico.', util_para_carrera: true, fecha: d('2026-08-21') },
    { valoracion_id: 'V004', usuario_id: 'U004', analisis_id: 'AI006', tmdb_id: 318846, puntuacion: 4, comentario: 'Útil para entender riesgo.', util_para_carrera: true, fecha: d('2026-08-21') },
    { valoracion_id: 'V008', usuario_id: 'U006', analisis_id: 'AI002', tmdb_id: 205596, puntuacion: 5, comentario: 'Buena relación con computación.', util_para_carrera: true, fecha: d('2026-08-25') }
  ],
  historial_admin: [
    { registro_id: 'HA001', admin: 'admin@magicfilm.com', accion: 'modificar', entidad: 'peliculas', entidad_id: '37799', detalle: 'Actualización de caché desde TMDB.', fecha: d('2026-08-19') }
  ]
};

const keys = {
  usuarios: 'usuario_id',
  peliculas: 'tmdb_id',
  analisis_ia: 'analisis_id',
  historial_busquedas: 'busqueda_id',
  valoraciones: 'valoracion_id',
  historial_admin: 'registro_id'
};

async function configureCollection(db, name) {
  const exists = await db.listCollections({ name }, { nameOnly: true }).hasNext();
  const validator = { $jsonSchema: schemas[name] };
  if (!exists) {
    await db.createCollection(name, { validator, validationLevel: 'moderate' });
  } else {
    await db.command({ collMod: name, validator, validationLevel: 'moderate' });
  }
  for (const [specification, options] of indexes[name]) {
    await db.collection(name).createIndex(specification, options);
  }
}

async function upsertSeed(db, name) {
  const key = keys[name];
  const operations = seed[name].map((document) => ({
    replaceOne: {
      filter: { [key]: document[key] },
      replacement: document,
      upsert: true
    }
  }));
  if (operations.length) await db.collection(name).bulkWrite(operations);
}

async function main() {
  validateConfig();
  const client = new MongoClient(config.mongodbUri);
  try {
    await client.connect();
    const db = client.db(config.mongodbDb);

    for (const name of Object.keys(schemas)) await configureCollection(db, name);

    // Restablece únicamente los identificadores usados en la demostración de Postman.
    await Promise.all([
      db.collection('usuarios').deleteOne({ usuario_id: 'U011' }),
      db.collection('peliculas').deleteOne({ tmdb_id: 60308 }),
      db.collection('analisis_ia').deleteOne({ analisis_id: 'AI011' }),
      db.collection('valoraciones').deleteOne({ valoracion_id: 'V011' })
    ]);

    for (const name of Object.keys(seed)) await upsertSeed(db, name);
    console.log(`Base '${config.mongodbDb}' preparada con validadores, índices y datos de demostración.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(`No fue posible preparar la base de datos: ${error.message}`);
  process.exit(1);
});
