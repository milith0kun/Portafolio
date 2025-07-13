/**
 * Controlador de Portafolios
 * Maneja todas las operaciones relacionadas con portafolios docentes
 */

const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const ResponseHandler = require('./utils/responseHandler');
const { logger } = require('../config/logger');

/**
 * Obtener todos los portafolios (administrador)
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerPortafolios = async (req, res) => {
  try {
    const cicloId = req.query.ciclo || req.query.cicloId;
    const estado = req.query.estado;
    const docenteId = req.query.docente || req.query.docenteId;
    
    const { Portafolio, Usuario, Asignatura, CicloAcademico } = require('../modelos');
    
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

    // Calcular resumen por estado y ciclo
    const resumen = {
      porEstado: {},
      porCiclo: {}
    };

    portafolios.forEach(p => {
      const estadoPortafolio = p.estado || 'sin_estado';
      resumen.porEstado[estadoPortafolio] = (resumen.porEstado[estadoPortafolio] || 0) + 1;
      
      const cicloNombre = p.ciclo?.nombre || 'Sin ciclo';
      resumen.porCiclo[cicloNombre] = (resumen.porCiclo[cicloNombre] || 0) + 1;
    });

    const responseData = {
      portafolios,
      filtros: {
        cicloId,
        estado,
        docenteId,
        totalEncontrados: portafolios.length
      },
      resumen
    };

    return ResponseHandler.success(res, responseData, `${portafolios.length} portafolios obtenidos correctamente`);
    
  } catch (error) {
    logger.error('Error al obtener portafolios:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Obtener portafolios de un docente específico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerMisPortafolios = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    
    const { Portafolio, Usuario, Asignatura, CicloAcademico, Semestre } = require('../modelos');
    
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

    return ResponseHandler.success(res, portafolios, 'Portafolios del docente obtenidos correctamente');
    
  } catch (error) {
    logger.error('Error al obtener mis portafolios:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Generar portafolios automáticamente para asignaciones docente-asignatura
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const generarPortafoliosAutomaticos = async (req, res) => {
  try {
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
      // Generar portafolios para cada asignación
      for (const asignacion of sinPortafolio) {
        try {
          const resultado = await crearPortafolioParaAsignacion(
            asignacion,
            asignacion.asignatura,
            cicloActivo.id,
            req.usuario ? req.usuario.id : 1,
            transaction
          );

          if (resultado.creado) {
            portafoliosCreados++;
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
    logger.error('Error en generación automática de portafolios:', error);
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
 * @param {number} portafolioId - ID del portafolio raíz
 * @param {number} cicloId - ID del ciclo académico
 * @param {number} semestreId - ID del semestre
 * @param {Object} transaction - Transacción de base de datos
 * @returns {Object} Resultado de la creación de estructura
 */
async function crearEstructuraPortafolio(portafolioId, cicloId, semestreId, transaction = null) {
  try {
    const { Portafolio } = require('../modelos');
    
    // Estructura básica UNSAAC
    const estructuraUNSAAC = {
      presentacion: {
        nombre: '0. PRESENTACIÓN DEL PORTAFOLIO',
        nivel: 1,
        icono: 'fas fa-presentation'
      },
      silabos: {
        nombre: '1. SILABOS',
        nivel: 1,
        icono: 'fas fa-file-alt'
      },
      avance_academico: {
        nombre: '2. AVANCE ACADÉMICO POR SESIONES',
        nivel: 1,
        icono: 'fas fa-chart-line'
      },
      material_ensenanza: {
        nombre: '3. MATERIAL DE ENSEÑANZA',
        nivel: 1,
        icono: 'fas fa-book-open'
      },
      asignaciones: {
        nombre: '4. ASIGNACIONES',
        nivel: 1,
        icono: 'fas fa-tasks'
      },
      examenes: {
        nombre: '5. ENUNCIADO DE EXÁMENES Y SOLUCIÓN',
        nivel: 1,
        icono: 'fas fa-file-prescription'
      },
      trabajos_estudiantiles: {
        nombre: '6. TRABAJOS ESTUDIANTILES',
        nivel: 1,
        icono: 'fas fa-graduation-cap'
      },
      archivos_portafolio: {
        nombre: '7. ARCHIVOS PORTAFOLIO DOCENTE',
        nivel: 1,
        icono: 'fas fa-archive'
      }
    };
    
    // Obtener información del portafolio raíz
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
    
    const carpetasCreadas = new Map();
    
    // Crear las carpetas principales
    for (const [clave, seccion] of Object.entries(estructuraUNSAAC)) {
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
        ruta: seccion.nombre,
        estado: 'activo',
        creado_por: portafolioRaiz.creado_por
      }, { transaction });
      
      carpetasCreadas.set(clave, carpetaPrincipal.id);
    }
    
    return {
      portafolioId,
      carpetasCreadas: carpetasCreadas.size
    };
    
  } catch (error) {
    logger.error('Error al crear estructura de portafolio:', error);
    throw error;
  }
}



/**
 * Obtener estructura de un portafolio específico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerEstructuraPortafolio = async (req, res) => {
  try {
    const { id } = req.params;
    
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
    logger.error('Error al obtener estructura de portafolio:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Inicializar sistema de portafolios
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const inicializarSistemaPortafolios = async (req, res) => {
  try {
    // Crear estructura base
    await crearEstructuraBase();
    
    // Generar portafolios automáticamente
    await generarPortafoliosAutomaticos(req, res);
    
  } catch (error) {
    logger.error('Error al inicializar sistema de portafolios:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Obtener estructura de portafolio para visualización según rol
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerEstructuraParaRol = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const rolActual = req.usuario.rol_actual;
    const { portafolioId, docenteId } = req.params;
    
    const { Portafolio, Usuario, Asignatura, CicloAcademico } = require('../modelos');
    
    // Verificar permisos según rol
    let whereCondition = {};
    
    if (rolActual === 'docente') {
      whereCondition = { docente_id: usuarioId };
    } else if (rolActual === 'verificador') {
      const { VerificadorDocente } = require('../modelos');
      const asignaciones = await VerificadorDocente.findAll({
        where: { verificador_id: usuarioId, activo: true },
        attributes: ['docente_id']
      });
      
      const docentesAsignados = asignaciones.map(a => a.docente_id);
      whereCondition = { docente_id: docentesAsignados };
    } else if (rolActual === 'administrador') {
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
    logger.error('Error al obtener estructura para rol:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Obtener estructura jerárquica de un portafolio
 * @param {number} portafolioRaizId - ID del portafolio raíz
 * @returns {Object} Estructura jerárquica del portafolio
 */
async function obtenerEstructuraJerarquica(portafolioRaizId) {
  const { Portafolio, ArchivoSubido } = require('../modelos');
  
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
 * @param {number} portafolioRaizId - ID del portafolio raíz
 * @returns {Object} Estadísticas del portafolio
 */
async function obtenerEstadisticasPortafolio(portafolioRaizId) {
  const { Portafolio, ArchivoSubido } = require('../modelos');
  
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
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerArchivosDePortafolio = async (req, res) => {
  try {
    const { portafolioId } = req.params;
    const usuarioId = req.usuario.id;
    const rolActual = req.usuario.rol_actual;
    
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
    logger.error('Error al obtener archivos de portafolio:', error);
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
  obtenerArchivosDePortafolio,
  crearEstructuraPortafolio
};