/**
 * Controlador de Portafolios
 * Maneja todas las operaciones relacionadas con portafolios docentes
 */

const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const ResponseHandler = require('./utils/responseHandler');

/**
 * Obtener todos los portafolios (administrador)
 * Ahora con soporte para filtrado por ciclo académico
 */
const obtenerPortafolios = async (req, res) => {
  try {
    // Obteniendo todos los portafolios
    
    // Obtener parámetros de filtrado
    const cicloId = req.query.ciclo || req.query.cicloId;
    const estado = req.query.estado;
    const docenteId = req.query.docente || req.query.docenteId;
    
    // Filtros aplicados
    
    await sequelize.authenticate();
    
    const { Portafolio, Usuario, Asignatura, CicloAcademico, DocenteAsignatura } = require('../modelos');
    
    // Construir condiciones WHERE dinámicamente
    const whereConditions = { activo: true };
    
    if (cicloId) {
      whereConditions.ciclo_id = cicloId;
    }
    
    if (estado) {
      whereConditions.estado = estado;
    }
    
    if (docenteId) {
      whereConditions.docente_id = docenteId;
    }
    
    const portafolios = await Portafolio.findAll({
      include: [
        {
          model: Usuario,
          as: 'docente',
          attributes: ['id', 'nombres', 'apellidos', 'correo']
        },
        {
          model: Asignatura,
          as: 'asignatura',
          attributes: ['id', 'codigo', 'nombre', 'carrera']
        },
        {
          model: CicloAcademico,
          as: 'ciclo',
          attributes: {
            include: ['id', 'nombre', 'estado', 'fecha_inicio', 'fecha_fin'],
            exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
          }
        }
      ],
      where: whereConditions,
      order: [['actualizado_en', 'DESC']]
    });

    // Portafolios encontrados con filtros aplicados

    // Agregar información adicional en la respuesta
    const responseData = {
      portafolios,
      filtros: {
        cicloId,
        estado,
        docenteId,
        totalEncontrados: portafolios.length
      },
      resumen: {
        porEstado: {},
        porCiclo: {}
      }
    };

    // Calcular resumen por estado
    portafolios.forEach(p => {
      const estadoPortafolio = p.estado || 'sin_estado';
      responseData.resumen.porEstado[estadoPortafolio] = (responseData.resumen.porEstado[estadoPortafolio] || 0) + 1;
    });

    // Calcular resumen por ciclo
    portafolios.forEach(p => {
      const cicloNombre = p.ciclo?.nombre || 'Sin ciclo';
      responseData.resumen.porCiclo[cicloNombre] = (responseData.resumen.porCiclo[cicloNombre] || 0) + 1;
    });

    return ResponseHandler.success(res, responseData, `${portafolios.length} portafolios obtenidos correctamente`);
    
  } catch (error) {
    
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Obtener portafolios de un docente específico
 */
const obtenerMisPortafolios = async (req, res) => {
  try {
    // Obteniendo portafolios del docente
    
    const usuarioId = req.usuario.id;
    
    await sequelize.authenticate();
    
    const { Portafolio, Usuario, Asignatura, CicloAcademico, DocenteAsignatura, Semestre } = require('../modelos');
    
    const portafolios = await Portafolio.findAll({
      include: [
        {
          model: Usuario,
          as: 'docente',
          attributes: ['id', 'nombres', 'apellidos', 'correo']
        },
        {
          model: Asignatura,
          as: 'asignatura',
          attributes: ['id', 'codigo', 'nombre', 'carrera']
        },
        {
          model: CicloAcademico,
          as: 'ciclo',
          attributes: {
            include: ['id', 'nombre', 'estado'],
            exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
          }
        },
        {
          model: Semestre,
          as: 'semestre',
          attributes: ['id', 'nombre']
        }
      ],
      where: { 
        docente_id: usuarioId,
        activo: true 
      },
      order: [['actualizado_en', 'DESC']]
    });

    // Portafolios encontrados para el docente

    return ResponseHandler.success(res, portafolios, 'Portafolios del docente obtenidos correctamente');
    
  } catch (error) {
    
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Generar portafolios automáticamente para asignaciones docente-asignatura
 * Esta función se ejecuta desde el panel de administrador y utiliza
 * la lógica del controlador de carga académica
 */
const generarPortafoliosAutomaticos = async (req, res) => {
  try {
    // Generando portafolios automáticamente
    
    await sequelize.authenticate();
    
    const { 
      DocenteAsignatura, 
      Portafolio, 
      Usuario, 
      Asignatura, 
      CicloAcademico,
      EstadoSistema
    } = require('../modelos');

    // Obtener ciclo académico activo
    const cicloActivo = await CicloAcademico.findOne({
      where: { estado: 'activo' },
      attributes: {
        exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
      }
    });

    if (!cicloActivo) {
      return ResponseHandler.error(res, 'No hay ciclo académico activo', 400);
    }

    // Ciclo académico activo encontrado

    // Obtener asignaciones que no tienen portafolio
    const asignacionesSinPortafolio = await DocenteAsignatura.findAll({
      where: { 
        ciclo_id: cicloActivo.id,
        activo: true 
      },
      include: [
        {
          model: Usuario,
          as: 'docente',
          attributes: ['id', 'nombres', 'apellidos']
        },
        {
          model: Asignatura,
          as: 'asignatura',
          attributes: ['id', 'codigo', 'nombre']
        },
        {
          model: Portafolio,
          as: 'portafolios',
          required: false,
          where: { nivel: 0 }
        }
      ]
    });

    // Filtrar solo las que realmente no tienen portafolio
    const sinPortafolio = asignacionesSinPortafolio.filter(asignacion => 
      !asignacion.portafolios || asignacion.portafolios.length === 0
    );

    // Asignaciones sin portafolio encontradas

    if (sinPortafolio.length === 0) {
      return ResponseHandler.success(res, {
        portafoliosCreados: 0,
        errores: 0,
        mensaje: 'Todos los portafolios ya han sido generados'
      }, 'No hay nuevos portafolios para generar');
    }

    // Inicializar contadores
    let portafoliosCreados = 0;
    let errores = 0;
    const detallesErrores = [];

    // Crear estructura base si no existe
    await crearEstructuraBase();

    // Usar transacción para todas las operaciones
    const transaction = await sequelize.transaction();

    try {
      // Usar la lógica local para crear portafolios
      const generarPortafolioFunc = async (asignacion, asignatura, cicloId, userId, transaction) => {
        const resultado = await crearPortafolioParaAsignacion(asignacion, asignatura, cicloId, userId, transaction);
        return { creado: resultado.creado };
      };

      // Generar portafolios para cada asignación
      for (const asignacion of sinPortafolio) {
        try {
          const resultado = await generarPortafolioFunc(
            asignacion,
            asignacion.asignatura,
            cicloActivo.id,
            req.usuario ? req.usuario.id : 1,
            transaction
          );

          if (resultado.creado) {
            portafoliosCreados++;
            // Portafolio generado exitosamente
          }
        } catch (error) {
          errores++;
          detallesErrores.push({
            asignacion: asignacion.id,
            docente: `${asignacion.docente.nombres} ${asignacion.docente.apellidos}`,
            asignatura: asignacion.asignatura.nombre,
            error: error.message
          });
  
        }
      }

      // Si se crearon portafolios, actualizar estado del sistema
      if (portafoliosCreados > 0) {
        await actualizarEstadoSistemaTrasGeneracion(cicloActivo.id, req.usuario ? req.usuario.id : 1, transaction);
      }

      await transaction.commit();

      // Generación completada

      return ResponseHandler.success(res, {
        portafoliosCreados,
        errores,
        totalAsignaciones: sinPortafolio.length,
        detallesErrores: detallesErrores.length > 0 ? detallesErrores : undefined
      }, 'Portafolios generados correctamente');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    // Error en generación automática de portafolios
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Actualiza el estado del sistema tras la generación de portafolios
 */
async function actualizarEstadoSistemaTrasGeneracion(cicloId, userId, transaction) {
  const { EstadoSistema } = require('../modelos');
  
  try {
    // Habilitar módulo de gestión de documentos si no está habilitado
    await EstadoSistema.upsert({
      ciclo_id: cicloId,
      modulo: 'gestion_documentos',
      habilitado: true,
      fecha_habilitacion: new Date(),
      observaciones: 'Módulo habilitado tras generación manual de portafolios.',
      actualizado_por: userId,
      actualizado_en: new Date()
    }, { transaction });

    // Habilitar módulo de verificación si no está habilitado
    await EstadoSistema.upsert({
      ciclo_id: cicloId,
      modulo: 'verificacion',
      habilitado: true,
      fecha_habilitacion: new Date(),
      observaciones: 'Módulo habilitado para verificación de portafolios.',
      actualizado_por: userId,
      actualizado_en: new Date()
    }, { transaction });

    // Estado del sistema actualizado
  } catch (error) {
    
    throw error;
  }
}

/**
 * Crea un portafolio para una asignación específica usando la lógica local
 */
async function crearPortafolioParaAsignacion(asignacion, asignatura, cicloId, userId, transaction) {
  const { Portafolio, Semestre } = require('../modelos');
  
  try {
    // Procesando asignación
    
    // Validar datos necesarios
    if (!asignacion || !asignatura) {
      throw new Error('Datos de asignación o asignatura incompletos');
    }

    // Obtener o crear semestre por defecto
    let semestre = await Semestre.findOne({
      where: { nombre: 'I' },
      transaction
    });

    if (!semestre) {
      semestre = await Semestre.create({
        nombre: 'I',
        descripcion: 'Primer Semestre',
        activo: true
      }, { transaction });
      // Semestre creado
    }

    // Verificar si ya existe
    const existente = await Portafolio.findOne({
      where: {
        docente_id: asignacion.docente_id,
        asignatura_id: asignatura.id,
        ciclo_id: cicloId,
        nivel: 0
      },
      transaction
    });

    if (existente) {
      // Portafolio ya existe
      return { creado: false, portafolio: existente };
    }

    // Preparar datos del portafolio
    const grupo = asignacion.grupo || 'A';
    const nombrePortafolio = `${asignatura.nombre} - Grupo ${grupo}`;
    
    // Creando portafolio

    const portafolioRaiz = await Portafolio.create({
      nombre: nombrePortafolio,
      docente_id: asignacion.docente_id,
      asignatura_id: asignatura.id,
      grupo: grupo,
      asignacion_id: asignacion.id,
      semestre_id: semestre.id,
      ciclo_id: cicloId,
      estructura_id: null,
      carpeta_padre_id: null,
      nivel: 0,
      ruta: `/${asignacion.docente_id}/${asignatura.codigo}`,
      estado: 'activo',
      activo: true,
      progreso_completado: 0.00,
      creado_por: userId,
      actualizado_por: userId
    }, { transaction });

    // Portafolio creado exitosamente

    // Crear estructura de carpetas (temporalmente deshabilitada para debug)
    await crearEstructuraPortafolio(portafolioRaiz.id, cicloId, semestre.id, transaction);
    

    return { creado: true, portafolio: portafolioRaiz };
  } catch (error) {
    // Error detallado al crear portafolio
    throw error;
  }
}

/**
 * Crear estructura base de portafolio si no existe
 */
async function crearEstructuraBase() {
  const { Estructura } = require('../modelos');
  
  const estructuraBase = [
    {
      nombre: 'I. DATOS GENERALES',
      descripcion: 'Información general del docente y la asignatura',
      nivel: 1,
      orden: 1,
      requiere_credito: 0,
      pertenece_presentacion: true,
      icono: 'fas fa-info-circle',
      color: '#007bff'
    },
    {
      nombre: 'II. PLANIFICACIÓN ACADÉMICA',
      descripcion: 'Documentos de planificación curricular',
      nivel: 1,
      orden: 2,
      requiere_credito: 1,
      pertenece_presentacion: false,
      icono: 'fas fa-calendar-alt',
      color: '#28a745'
    },
    {
      nombre: 'III. DESARROLLO DE SESIONES',
      descripcion: 'Materiales y evidencias de clases',
      nivel: 1,
      orden: 3,
      requiere_credito: 2,
      pertenece_presentacion: false,
      icono: 'fas fa-chalkboard-teacher',
      color: '#ffc107'
    },
    {
      nombre: 'IV. EVALUACIÓN',
      descripcion: 'Instrumentos y evidencias de evaluación',
      nivel: 1,
      orden: 4,
      requiere_credito: 2,
      pertenece_presentacion: false,
      icono: 'fas fa-clipboard-check',
      color: '#dc3545'
    },
    {
      nombre: 'V. INVESTIGACIÓN E INNOVACIÓN',
      descripcion: 'Proyectos y actividades de investigación',
      nivel: 1,
      orden: 5,
      requiere_credito: 1,
      pertenece_presentacion: false,
      icono: 'fas fa-search',
      color: '#6f42c1'
    }
  ];

  for (const estructura of estructuraBase) {
    const existente = await Estructura.findOne({
      where: { nombre: estructura.nombre, nivel: estructura.nivel }
    });

    if (!existente) {
      await Estructura.create(estructura);
      // Estructura creada
    }
  }
}

/**
 * Crear estructura jerárquica de portafolio según especificación UNSAAC
 */
async function crearEstructuraPortafolio(portafolioId, cicloId, semestreId, transaction = null) {
  try {
    // Creando estructura jerárquica para portafolio
    
    const { Portafolio } = require('../modelos');
    
    // Estructura específica UNSAAC según Portafolio Base.md
    const estructuraUNSAAC = {
      // Nivel 0: Presentación del Portafolio (Global para todos los cursos)
      presentacion: {
        nombre: '0. PRESENTACIÓN DEL PORTAFOLIO',
        nivel: 1,
        pertenece_presentacion: true,
        icono: 'fas fa-presentation',
        subcarpetas: {
          '0.1': { nombre: '0.1 CARÁTULA', nivel: 2, icono: 'fas fa-id-card' },
          '0.2': { nombre: '0.2 CARGA ACADÉMICA', nivel: 2, icono: 'fas fa-calendar-check' },
          '0.3': { nombre: '0.3 FILOSOFÍA DOCENTE', nivel: 2, icono: 'fas fa-lightbulb' },
          '0.4': { nombre: '0.4 CURRÍCULUM VITAE', nivel: 2, icono: 'fas fa-user-graduate' }
        }
      },
      
      // Nivel 1: Secciones principales del curso
      silabos: {
        nombre: '1. SILABOS',
        nivel: 1,
        icono: 'fas fa-file-alt',
        subcarpetas: {
          '1.1': { nombre: '1.1 SILABO UNSAAC', nivel: 2, icono: 'fas fa-university' },
          '1.2': { nombre: '1.2 SILABO ICACIT', nivel: 2, icono: 'fas fa-certificate' },
          '1.3': { nombre: '1.3 REGISTRO DE ENTREGA DE SILABO', nivel: 2, icono: 'fas fa-clipboard-check' }
        }
      },
      
      avance_academico: {
        nombre: '2. AVANCE ACADÉMICO POR SESIONES',
        nivel: 1,
        icono: 'fas fa-chart-line'
      },
      
      material_ensenanza: {
        nombre: '3. MATERIAL DE ENSEÑANZA',
        nivel: 1,
        icono: 'fas fa-book-open',
        subcarpetas: {
          '3.1': { nombre: '3.1 PRIMERA UNIDAD', nivel: 2, icono: 'fas fa-play' },
          '3.2': { nombre: '3.2 SEGUNDA UNIDAD', nivel: 2, icono: 'fas fa-forward' },
          '3.3': { nombre: '3.3 TERCERA UNIDAD', nivel: 2, condicional: true, icono: 'fas fa-fast-forward' } // Solo para 4-5 créditos
        }
      },
      
      asignaciones: {
        nombre: '4. ASIGNACIONES',
        nivel: 1,
        icono: 'fas fa-tasks'
      },
      
      examenes: {
        nombre: '5. ENUNCIADO DE EXÁMENES Y SOLUCIÓN',
        nivel: 1,
        icono: 'fas fa-file-prescription',
        subcarpetas: {
          '5.1': {
            nombre: '5.1 EXAMEN DE ENTRADA',
            nivel: 2,
            icono: 'fas fa-sign-in-alt',
            subcarpetas: {
              '5.1.1': { nombre: '5.1.1 ENUNCIADO DE EXAMEN Y RESOLUCIÓN', nivel: 3, icono: 'fas fa-question-circle' },
              '5.1.2': { nombre: '5.1.2 ASISTENCIA AL EXAMEN', nivel: 3, icono: 'fas fa-users' },
              '5.1.3': { nombre: '5.1.3 INFORME DE RESULTADOS', nivel: 3, icono: 'fas fa-chart-bar' }
            }
          },
          '5.2': {
            nombre: '5.2 PRIMER EXAMEN',
            nivel: 2,
            icono: 'fas fa-file-medical',
            subcarpetas: {
              '5.2.1': { nombre: '5.2.1 ENUNCIADO Y RESOLUCIÓN DE EXAMEN', nivel: 3, icono: 'fas fa-question-circle' },
              '5.2.2': { nombre: '5.2.2 ASISTENCIA AL EXAMEN', nivel: 3, icono: 'fas fa-users' },
              '5.2.3': { nombre: '5.2.3 INFORME DE RESULTADOS', nivel: 3, icono: 'fas fa-chart-bar' }
            }
          },
          '5.3': {
            nombre: '5.3 SEGUNDO EXAMEN',
            nivel: 2,
            icono: 'fas fa-file-medical',
            subcarpetas: {
              '5.3.1': { nombre: '5.3.1 ENUNCIADO Y RESOLUCIÓN DE EXAMEN', nivel: 3, icono: 'fas fa-question-circle' },
              '5.3.2': { nombre: '5.3.2 ASISTENCIA AL EXAMEN', nivel: 3, icono: 'fas fa-users' },
              '5.3.3': { nombre: '5.3.3 INFORME DE RESULTADOS', nivel: 3, icono: 'fas fa-chart-bar' }
            }
          },
          '5.4': {
            nombre: '5.4 TERCER EXAMEN',
            nivel: 2,
            condicional: true, // Solo para 4-5 créditos
            icono: 'fas fa-file-medical',
            subcarpetas: {
              '5.4.1': { nombre: '5.4.1 ENUNCIADO Y RESOLUCIÓN DE EXAMEN', nivel: 3, icono: 'fas fa-question-circle' },
              '5.4.2': { nombre: '5.4.2 ASISTENCIA AL EXAMEN', nivel: 3, icono: 'fas fa-users' },
              '5.4.3': { nombre: '5.4.3 INFORME DE RESULTADOS', nivel: 3, icono: 'fas fa-chart-bar' }
            }
          }
        }
      },
      
      trabajos_estudiantiles: {
        nombre: '6. TRABAJOS ESTUDIANTILES',
        nivel: 1,
        icono: 'fas fa-graduation-cap',
        subcarpetas: {
          '6.1': { nombre: '6.1 EXCELENTE (19–20)', nivel: 2, icono: 'fas fa-star', color: '#28a745' },
          '6.2': { nombre: '6.2 BUENO (16–18)', nivel: 2, icono: 'fas fa-thumbs-up', color: '#17a2b8' },
          '6.3': { nombre: '6.3 REGULAR (14–15)', nivel: 2, icono: 'fas fa-meh', color: '#ffc107' },
          '6.4': { nombre: '6.4 MALO (10–13)', nivel: 2, icono: 'fas fa-thumbs-down', color: '#fd7e14' },
          '6.5': { nombre: '6.5 POBRE (0–07)', nivel: 2, icono: 'fas fa-times-circle', color: '#dc3545' }
        }
      },
      
      archivos_portafolio: {
        nombre: '7. ARCHIVOS PORTAFOLIO DOCENTE',
        nivel: 1,
        icono: 'fas fa-archive',
        subcarpetas: {
          '7.1': { nombre: '7.1 ASISTENCIA DE ALUMNOS', nivel: 2, icono: 'fas fa-user-check' },
          '7.2': { nombre: '7.2 REGISTRO DE NOTAS DEL CENTRO DE CÓMPUTO', nivel: 2, icono: 'fas fa-desktop' },
          '7.3': { nombre: '7.3 CIERRE DE PORTAFOLIO', nivel: 2, icono: 'fas fa-lock' }
        }
      }
    };
    
    // Obtener información del portafolio raíz para determinar créditos
    const portafolioRaiz = await Portafolio.findByPk(portafolioId, {
      include: [
        {
          model: require('../modelos').Asignatura,
          as: 'asignatura',
          attributes: ['creditos', 'codigo', 'nombre']
        }
      ],
      transaction
    });
    
    if (!portafolioRaiz) {
      throw new Error(`Portafolio ${portafolioId} no encontrado`);
    }
    
    const creditosCurso = portafolioRaiz.asignatura?.creditos || 3;
    // Información de créditos del curso
    
    const carpetasCreadas = new Map();
    const mapaCarpetas = new Map();
    
    // Crear las carpetas principales y subcarpetas
    for (const [clave, seccion] of Object.entries(estructuraUNSAAC)) {
      // Creando sección
      
      // Crear carpeta principal
      const rutaSeccion = seccion.nombre;
      
      const carpetaPrincipal = await Portafolio.create({
        nombre: seccion.nombre,
        docente_id: portafolioRaiz.docente_id,
        asignatura_id: portafolioRaiz.asignatura_id,
        grupo: portafolioRaiz.grupo,
        asignacion_id: portafolioRaiz.asignacion_id,
        semestre_id: semestreId,
        ciclo_id: cicloId,
        carpeta_padre_id: portafolioId,
        nivel: seccion.nivel,
        ruta: rutaSeccion,
        estado: 'activo',
        creado_por: portafolioRaiz.creado_por
      }, { transaction });
      
      carpetasCreadas.set(clave, carpetaPrincipal.id);
      mapaCarpetas.set(carpetaPrincipal.id, {
        nombre: seccion.nombre,
        ruta: rutaSeccion,
        icono: seccion.icono || 'fas fa-folder',
        nivel: seccion.nivel
      });
      
      // Crear subcarpetas si existen
      if (seccion.subcarpetas) {
        await crearSubcarpetasRecursivamente(
          seccion.subcarpetas, 
          carpetaPrincipal.id, 
          portafolioRaiz, 
          rutaSeccion, 
          creditosCurso, 
          transaction, 
          carpetasCreadas, 
          mapaCarpetas
        );
      }
    }
    
    // Estructura creada exitosamente
    
    return {
      portafolioId,
      carpetasCreadas: carpetasCreadas.size,
      estructura: mapaCarpetas
    };
    
  } catch (error) {
    
    throw error;
  }
}

/**
 * Crear subcarpetas recursivamente
 */
async function crearSubcarpetasRecursivamente(subcarpetas, padreId, portafolioRaiz, rutaBase, creditosCurso, transaction, carpetasCreadas, mapaCarpetas) {
  for (const [subClave, subcarpeta] of Object.entries(subcarpetas)) {
    // Verificar condiciones para subcarpetas
    if (subcarpeta.condicional && creditosCurso < 4) {
      // Omitiendo subcarpeta condicional
      continue;
    }
    
    const nuevaSubcarpeta = await Portafolio.create({
      nombre: subcarpeta.nombre,
      docente_id: portafolioRaiz.docente_id,
      asignatura_id: portafolioRaiz.asignatura_id,
      grupo: portafolioRaiz.grupo,
      asignacion_id: portafolioRaiz.asignacion_id,
      semestre_id: portafolioRaiz.semestre_id,
      ciclo_id: portafolioRaiz.ciclo_id,
      estructura_id: null,
      carpeta_padre_id: padreId,
      nivel: subcarpeta.nivel,
      ruta: `${rutaBase}/${subClave}`,
      estado: 'activo',
      activo: true,
      progreso_completado: 0.00,
      metadatos: {
        subcarpeta_de: subClave,
        es_condicional: subcarpeta.condicional || false,
        descripcion: subcarpeta.descripcion || ''
      },
      creado_por: portafolioRaiz.creado_por,
      actualizado_por: portafolioRaiz.actualizado_por
    }, { transaction });
    
    carpetasCreadas.push(nuevaSubcarpeta);
    mapaCarpetas.set(nuevaSubcarpeta.id, {
      nombre: nuevaSubcarpeta.nombre,
      ruta: nuevaSubcarpeta.ruta,
      icono: subcarpeta.icono || 'fas fa-folder',
      nivel: nuevaSubcarpeta.nivel
    });
    
    // Crear subcarpetas de nivel 3 si existen
    if (subcarpeta.subcarpetas) {
      await crearSubcarpetasRecursivamente(
        subcarpeta.subcarpetas,
        nuevaSubcarpeta.id,
        portafolioRaiz,
        `${rutaBase}/${subClave}`,
        creditosCurso,
        transaction,
        carpetasCreadas,
        mapaCarpetas
      );
    }
  }
}

/**
 * Obtener estructura de un portafolio específico
 */
const obtenerEstructuraPortafolio = async (req, res) => {
  try {
    const { id } = req.params;
    
    await sequelize.authenticate();
    
    const { Portafolio } = require('../modelos');
    
    const estructura = await Portafolio.findAll({
      where: { 
        carpeta_padre_id: id,
        activo: true 
      },
      order: [['nivel', 'ASC'], ['nombre', 'ASC']]
    });

    return ResponseHandler.success(res, estructura, 'Estructura del portafolio obtenida correctamente');
    
  } catch (error) {
    
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Inicializar sistema de portafolios
 */
const inicializarSistemaPortafolios = async (req, res) => {
  try {
    // Inicializando sistema de portafolios
    
    // Crear estructura base
    await crearEstructuraBase();
    
    // Generar portafolios automáticamente
    await generarPortafoliosAutomaticos(req, res);
    
  } catch (error) {
    
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Obtener estructura de portafolio para visualización según rol
 */
const obtenerEstructuraParaRol = async (req, res) => {
  try {
    // Obteniendo estructura para rol
    
    const usuarioId = req.usuario.id;
    const rolActual = req.usuario.rol_actual;
    const { portafolioId, docenteId } = req.params;
    
    await sequelize.authenticate();
    
    const { Portafolio, Usuario, Asignatura, CicloAcademico, ArchivoSubido } = require('../modelos');
    
    // Verificar permisos según rol
    let whereCondition = {};
    
    if (rolActual === 'docente') {
      // Docente solo ve sus propios portafolios
      whereCondition = { docente_id: usuarioId };
    } else if (rolActual === 'verificador') {
      // Verificador ve portafolios asignados
      const { VerificadorDocente } = require('../modelos');
      const asignaciones = await VerificadorDocente.findAll({
        where: { verificador_id: usuarioId, activo: true },
        attributes: ['docente_id']
      });
      
      const docentesAsignados = asignaciones.map(a => a.docente_id);
      whereCondition = { docente_id: docentesAsignados };
    } else if (rolActual === 'administrador') {
      // Administrador ve todos
      whereCondition = {};
    }
    
    // Si se especifica un docente y un portafolio específico
    if (docenteId && portafolioId) {
      whereCondition.docente_id = docenteId;
      whereCondition.id = portafolioId;
    } else if (portafolioId) {
      whereCondition.id = portafolioId;
    }
    
    // Obtener portafolio raíz y su estructura
    const portafolios = await Portafolio.findAll({
      where: {
        ...whereCondition,
        activo: true,
        carpeta_padre_id: null // Solo portafolios raíz
      },
      include: [
        {
          model: Usuario,
          as: 'docente',
          attributes: ['id', 'nombres', 'apellidos', 'correo']
        },
        {
          model: Asignatura,
          as: 'asignatura',
          attributes: ['id', 'codigo', 'nombre', 'creditos', 'carrera']
        },
        {
          model: CicloAcademico,
          as: 'ciclo',
          attributes: ['id', 'nombre', 'estado']
        }
      ],
      order: [['creado_en', 'DESC']]
    });
    
    if (portafolios.length === 0) {
      return ResponseHandler.error(res, 'No se encontraron portafolios para este usuario', 404);
    }
    
    // Para cada portafolio, obtener su estructura completa
    const resultado = [];
    
    for (const portafolio of portafolios) {
      const estructura = await obtenerEstructuraJerarquica(portafolio.id);
      const estadisticas = await obtenerEstadisticasPortafolio(portafolio.id);
      
      resultado.push({
        portafolio: {
          id: portafolio.id,
          nombre: portafolio.nombre,
          docente: portafolio.docente,
          asignatura: portafolio.asignatura,
          ciclo: portafolio.ciclo,
          progreso_completado: portafolio.progreso_completado,
          estado: portafolio.estado
        },
        estructura,
        estadisticas
      });
    }
    
    return ResponseHandler.success(res, resultado, 'Estructura de portafolios obtenida correctamente');
    
  } catch (error) {
    
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Obtener estructura jerárquica de un portafolio
 */
async function obtenerEstructuraJerarquica(portafolioRaizId) {
  const { Portafolio, ArchivoSubido } = require('../modelos');
  
  // Obtener todas las carpetas del portafolio ordenadas por nivel y ruta
  const carpetas = await Portafolio.findAll({
    where: {
      [Op.or]: [
        { id: portafolioRaizId },
        { carpeta_padre_id: { [Op.not]: null } }
      ],
      activo: true
    },
    include: [
      {
        model: ArchivoSubido,
        as: 'archivos',
        where: { activo: true },
        required: false,
        attributes: ['id', 'nombre_original', 'tipo_mime', 'formato', 'tamanio', 'estado', 'subido_en', 'verificado_por', 'fecha_verificacion']
      }
    ],
    order: [['nivel', 'ASC'], ['ruta', 'ASC'], ['creado_en', 'ASC']]
  });
  
  // Construir árbol jerárquico
  const mapaElementos = new Map();
  const raiz = { id: portafolioRaizId, hijos: [] };
  
  carpetas.forEach(carpeta => {
    const elemento = {
      id: carpeta.id,
      nombre: carpeta.nombre,
      nivel: carpeta.nivel,
      ruta: carpeta.ruta,
      carpeta_padre_id: carpeta.carpeta_padre_id,
      archivos: carpeta.archivos || [],
      hijos: [],
      estadisticas: {
        total_archivos: carpeta.archivos?.length || 0,
        archivos_aprobados: carpeta.archivos?.filter(a => a.estado === 'aprobado').length || 0,
        archivos_pendientes: carpeta.archivos?.filter(a => a.estado === 'pendiente').length || 0,
        archivos_rechazados: carpeta.archivos?.filter(a => a.estado === 'rechazado').length || 0
      }
    };
    
    mapaElementos.set(carpeta.id, elemento);
    
    if (carpeta.id === portafolioRaizId) {
      Object.assign(raiz, elemento);
    } else if (carpeta.carpeta_padre_id) {
      const padre = mapaElementos.get(carpeta.carpeta_padre_id);
      if (padre) {
        padre.hijos.push(elemento);
      }
    }
  });
  
  return raiz;
}

/**
 * Obtener estadísticas generales de un portafolio
 */
async function obtenerEstadisticasPortafolio(portafolioRaizId) {
  const { Portafolio, ArchivoSubido } = require('../modelos');
  
  // Obtener todas las carpetas del portafolio
  const carpetas = await Portafolio.findAll({
    where: {
      [Op.or]: [
        { id: portafolioRaizId },
        { carpeta_padre_id: { [Op.not]: null } }
      ],
      activo: true
    },
    attributes: ['id']
  });
  
  const carpetaIds = carpetas.map(c => c.id);
  
  // Obtener estadísticas de archivos
  const archivos = await ArchivoSubido.findAll({
    where: {
      portafolio_id: carpetaIds,
      activo: true
    },
    attributes: ['estado', 'tamanio']
  });
  
  const estadisticas = {
    total_carpetas: carpetas.length,
    total_archivos: archivos.length,
    archivos_por_estado: {
      pendientes: archivos.filter(a => a.estado === 'pendiente').length,
      aprobados: archivos.filter(a => a.estado === 'aprobado').length,
      rechazados: archivos.filter(a => a.estado === 'rechazado').length,
      en_revision: archivos.filter(a => a.estado === 'revisado').length
    },
    tamanio_total: archivos.reduce((sum, a) => sum + (a.tamanio || 0), 0),
    progreso_porcentaje: archivos.length > 0 ? 
      Math.round((archivos.filter(a => a.estado === 'aprobado').length / archivos.length) * 100) : 0
  };
  
  return estadisticas;
}

/**
 * Obtener archivos de una carpeta específica
 */
const obtenerArchivosDePortafolio = async (req, res) => {
  try {
    // Obteniendo archivos de portafolio
    
    const { portafolioId } = req.params;
    const usuarioId = req.usuario.id;
    const rolActual = req.usuario.rol_actual;
    
    await sequelize.authenticate();
    
    const { Portafolio, ArchivoSubido, Usuario } = require('../modelos');
    
    // Verificar que el usuario tenga acceso a este portafolio
    const portafolio = await Portafolio.findByPk(portafolioId, {
      include: [
        {
          model: Usuario,
          as: 'docente',
          attributes: ['id', 'nombres', 'apellidos']
        }
      ]
    });
    
    if (!portafolio) {
      return ResponseHandler.error(res, 'Portafolio no encontrado', 404);
    }
    
    // Verificar permisos
    if (rolActual === 'docente' && portafolio.docente_id !== usuarioId) {
      return ResponseHandler.error(res, 'No tienes permisos para ver este portafolio', 403);
    }
    
    if (rolActual === 'verificador') {
      const { VerificadorDocente } = require('../modelos');
      const asignacion = await VerificadorDocente.findOne({
        where: { 
          verificador_id: usuarioId, 
          docente_id: portafolio.docente_id,
          activo: true 
        }
      });
      
      if (!asignacion) {
        return ResponseHandler.error(res, 'No tienes asignado este docente para verificación', 403);
      }
    }
    
    // Obtener archivos del portafolio
    const archivos = await ArchivoSubido.findAll({
      where: {
        portafolio_id: portafolioId,
        activo: true
      },
      include: [
        {
          model: Usuario,
          as: 'subidoPor',
          attributes: ['id', 'nombres', 'apellidos']
        },
        {
          model: Usuario,
          as: 'verificadoPor',
          attributes: ['id', 'nombres', 'apellidos'],
          required: false
        }
      ],
      order: [['subido_en', 'DESC']]
    });
    
    const resultado = {
      portafolio: {
        id: portafolio.id,
        nombre: portafolio.nombre,
        ruta: portafolio.ruta,
        docente: portafolio.docente
      },
      archivos: archivos.map(archivo => ({
        id: archivo.id,
        nombre_original: archivo.nombre_original,
        nombre_sistema: archivo.nombre_sistema,
        tipo_mime: archivo.tipo_mime,
        formato: archivo.formato,
        tamanio: archivo.tamanio,
        estado: archivo.estado,
        comentarios: archivo.comentarios,
        version: archivo.version,
        subido_en: archivo.subido_en,
        subido_por: archivo.subidoPor,
        verificado_por: archivo.verificadoPor,
        fecha_verificacion: archivo.fecha_verificacion
      }))
    };
    
    return ResponseHandler.success(res, resultado, 'Archivos obtenidos correctamente');
    
  } catch (error) {
    
    return ResponseHandler.error(res, error.message, 500);
  }
};

module.exports = {
  obtenerPortafolios,
  obtenerMisPortafolios,
  generarPortafoliosAutomaticos,
  obtenerEstructuraPortafolio,
  inicializarSistemaPortafolios,
  obtenerEstructuraParaRol,
  obtenerArchivosDePortafolio
};