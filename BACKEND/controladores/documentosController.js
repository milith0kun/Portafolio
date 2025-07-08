/**
 * Controlador de Documentos
 * Maneja la subida, gestión y verificación de documentos en portafolios
 */

const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const ResponseHandler = require('./utils/responseHandler');
const { logger } = require('../config/logger');

/**
 * Configuración de almacenamiento de archivos
 */
const configurarAlmacenamiento = () => {
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        const { cicloId, docenteId, asignaturaId, seccion } = req.body;
        
        // Crear ruta específica para el documento
        const rutaBase = path.join(
          __dirname, 
          '../uploads/portafolios',
          cicloId.toString(),
          docenteId.toString(),
          asignaturaId.toString(),
          seccion
        );
        
        // Crear directorios si no existen
        await fs.mkdir(rutaBase, { recursive: true });
        
        req.rutaArchivo = rutaBase; // Guardar para uso posterior
        cb(null, rutaBase);
      } catch (error) {
        logger.error('Error al crear directorio:', error);
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      // Generar nombre único con timestamp
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      const nombreBase = path.basename(file.originalname, extension);
      const nombreFinal = `${timestamp}_${nombreBase}${extension}`;
      
      req.nombreArchivo = nombreFinal; // Guardar para uso posterior
      cb(null, nombreFinal);
    }
  });

  // Filtros de archivos permitidos
  const fileFilter = (req, file, cb) => {
    const tiposPermitidos = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB máximo
    }
  });
};

const upload = configurarAlmacenamiento();

/**
 * Subir documento a una sección específica del portafolio
 */
const subirDocumento = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info('=== SUBIENDO DOCUMENTO ===');
    
    const {
      portafolioId,
      seccion,
      descripcion,
      tipoDocumento,
      esObligatorio = false
    } = req.body;
    
    const usuarioId = req.usuario.id;
    const archivo = req.file;
    
    if (!archivo) {
      await transaction.rollback();
      return ResponseHandler.error(res, 'No se proporcionó ningún archivo', 400);
    }
    
    const { 
      Portafolio, 
      ArchivoSubido, 
      Usuario, 
      Asignatura, 
      CicloAcademico 
    } = require('../modelos');
    
    // Verificar que el portafolio existe y pertenece al usuario
    const portafolio = await Portafolio.findOne({
      where: { 
        id: portafolioId,
        docente_id: usuarioId,
        activo: true 
      },
      include: [
        {
          model: Asignatura,
          as: 'asignatura',
          attributes: ['codigo', 'nombre']
        },
        {
          model: CicloAcademico,
          as: 'ciclo',
          attributes: ['nombre']
        }
      ],
      transaction
    });
    
    if (!portafolio) {
      await transaction.rollback();
      return ResponseHandler.error(res, 'Portafolio no encontrado o sin permisos', 404);
    }
    
    // Crear registro del archivo en base de datos
    const nuevoArchivo = await ArchivoSubido.create({
      portafolio_id: portafolioId,
      seccion_portafolio: seccion,
      nombre_original: archivo.originalname,
      nombre_archivo: req.nombreArchivo,
      ruta_archivo: path.join(req.rutaArchivo, req.nombreArchivo),
      tipo_mime: archivo.mimetype,
      tamano: archivo.size,
      descripcion: descripcion || '',
      tipo_documento: tipoDocumento || 'general',
      es_obligatorio: esObligatorio,
      estado_verificacion: 'pendiente',
      subido_por: usuarioId,
      fecha_subida: new Date()
    }, { transaction });
    
    // Actualizar progreso del portafolio
    await actualizarProgresoPortafolio(portafolioId, transaction);
    
    // Crear notificación para el verificador asignado (si existe)
    await crearNotificacionSubidaDocumento(portafolio, nuevoArchivo, transaction);
    
    await transaction.commit();
    
    logger.info(`✅ Documento subido: ${archivo.originalname} en sección ${seccion}`);
    
    return ResponseHandler.success(res, {
      archivo: nuevoArchivo,
      portafolio: {
        id: portafolio.id,
        asignatura: portafolio.asignatura?.nombre,
        ciclo: portafolio.ciclo?.nombre
      }
    }, 'Documento subido exitosamente');
    
  } catch (error) {
    await transaction.rollback();
    
    // Limpiar archivo si hubo error
    if (req.file && req.rutaArchivo && req.nombreArchivo) {
      try {
        await fs.unlink(path.join(req.rutaArchivo, req.nombreArchivo));
      } catch (unlinkError) {
        logger.error('Error al limpiar archivo tras fallo:', unlinkError);
      }
    }
    
    logger.error('❌ Error al subir documento:', error);
    return ResponseHandler.error(res, `Error al subir documento: ${error.message}`, 500);
  }
};

/**
 * Obtener documentos de un portafolio específico
 */
const obtenerDocumentosPortafolio = async (req, res) => {
  try {
    const { portafolioId } = req.params;
    const { seccion } = req.query;
    const usuarioId = req.usuario.id;
    
    const { Portafolio, ArchivoSubido, Usuario } = require('../modelos');
    
    // Verificar acceso al portafolio
    const tieneAcceso = await verificarAccesoPortafolio(portafolioId, usuarioId);
    if (!tieneAcceso) {
      return ResponseHandler.error(res, 'No tiene permisos para acceder a este portafolio', 403);
    }
    
    // Construir condiciones de búsqueda
    const whereConditions = { 
      portafolio_id: portafolioId,
      activo: true 
    };
    
    if (seccion) {
      whereConditions.seccion_portafolio = seccion;
    }
    
    const documentos = await ArchivoSubido.findAll({
      where: whereConditions,
      include: [
        {
          model: Usuario,
          as: 'usuario_subida',
          attributes: ['nombres', 'apellidos']
        }
      ],
      order: [['fecha_subida', 'DESC']]
    });
    
    // Agrupar por sección si no se especificó una
    const resultado = seccion ? documentos : agruparDocumentosPorSeccion(documentos);
    
    return ResponseHandler.success(res, resultado, 'Documentos obtenidos exitosamente');
    
  } catch (error) {
    logger.error('Error al obtener documentos:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Descargar documento específico
 */
const descargarDocumento = async (req, res) => {
  try {
    const { archivoId } = req.params;
    const usuarioId = req.usuario.id;
    
    const { ArchivoSubido, Portafolio } = require('../modelos');
    
    const archivo = await ArchivoSubido.findByPk(archivoId, {
      include: [
        {
          model: Portafolio,
          as: 'portafolio'
        }
      ]
    });
    
    if (!archivo) {
      return ResponseHandler.error(res, 'Archivo no encontrado', 404);
    }
    
    // Verificar permisos de acceso
    const tieneAcceso = await verificarAccesoPortafolio(archivo.portafolio_id, usuarioId);
    if (!tieneAcceso) {
      return ResponseHandler.error(res, 'No tiene permisos para descargar este archivo', 403);
    }
    
    // Verificar que el archivo existe físicamente
    const rutaCompleta = path.resolve(archivo.ruta_archivo);
    
    try {
      await fs.access(rutaCompleta);
    } catch (error) {
      logger.error(`Archivo físico no encontrado: ${rutaCompleta}`);
      return ResponseHandler.error(res, 'Archivo físico no encontrado', 404);
    }
    
    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${archivo.nombre_original}"`);
    res.setHeader('Content-Type', archivo.tipo_mime);
    
    // Enviar archivo
    res.sendFile(rutaCompleta);
    
    // Registrar descarga (opcional)
    logger.info(`📥 Descarga de archivo: ${archivo.nombre_original} por usuario ${usuarioId}`);
    
  } catch (error) {
    logger.error('Error al descargar archivo:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Eliminar documento
 */
const eliminarDocumento = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { archivoId } = req.params;
    const usuarioId = req.usuario.id;
    
    const { ArchivoSubido, Portafolio } = require('../modelos');
    
    const archivo = await ArchivoSubido.findByPk(archivoId, {
      include: [
        {
          model: Portafolio,
          as: 'portafolio'
        }
      ],
      transaction
    });
    
    if (!archivo) {
      await transaction.rollback();
      return ResponseHandler.error(res, 'Archivo no encontrado', 404);
    }
    
    // Solo el dueño del portafolio puede eliminar documentos
    if (archivo.portafolio.docente_id !== usuarioId) {
      await transaction.rollback();
      return ResponseHandler.error(res, 'No tiene permisos para eliminar este archivo', 403);
    }
    
    // Eliminar archivo físico
    try {
      await fs.unlink(path.resolve(archivo.ruta_archivo));
    } catch (unlinkError) {
      logger.warn(`No se pudo eliminar archivo físico: ${archivo.ruta_archivo}`);
    }
    
    // Marcar como inactivo en base de datos (soft delete)
    await archivo.update({
      activo: false,
      fecha_eliminacion: new Date(),
      eliminado_por: usuarioId
    }, { transaction });
    
    // Actualizar progreso del portafolio
    await actualizarProgresoPortafolio(archivo.portafolio_id, transaction);
    
    await transaction.commit();
    
    logger.info(`🗑️ Documento eliminado: ${archivo.nombre_original}`);
    
    return ResponseHandler.success(res, null, 'Documento eliminado exitosamente');
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al eliminar documento:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Obtener progreso de completitud de un portafolio
 */
const obtenerProgresoPortafolio = async (req, res) => {
  try {
    const { portafolioId } = req.params;
    const usuarioId = req.usuario.id;
    
    const tieneAcceso = await verificarAccesoPortafolio(portafolioId, usuarioId);
    if (!tieneAcceso) {
      return ResponseHandler.error(res, 'No tiene permisos para acceder a este portafolio', 403);
    }
    
    const progreso = await calcularProgresoDetallado(portafolioId);
    
    return ResponseHandler.success(res, progreso, 'Progreso obtenido exitosamente');
    
  } catch (error) {
    logger.error('Error al obtener progreso:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

// ===== FUNCIONES AUXILIARES =====

/**
 * Verificar si un usuario tiene acceso a un portafolio
 */
async function verificarAccesoPortafolio(portafolioId, usuarioId) {
  const { Portafolio, UsuarioRol } = require('../modelos');
  
  // Verificar si es el dueño del portafolio
  const portafolio = await Portafolio.findOne({
    where: { 
      id: portafolioId,
      docente_id: usuarioId,
      activo: true 
    }
  });
  
  if (portafolio) return true;
  
  // Verificar si es admin o verificador
  const roles = await UsuarioRol.findAll({
    where: { usuario_id: usuarioId },
    attributes: ['rol']
  });
  
  const rolesUsuario = roles.map(r => r.rol);
  
  return rolesUsuario.includes('administrador') || rolesUsuario.includes('verificador');
}

/**
 * Actualizar progreso de completitud del portafolio
 */
async function actualizarProgresoPortafolio(portafolioId, transaction = null) {
  const progreso = await calcularProgresoDetallado(portafolioId);
  
  const { Portafolio } = require('../modelos');
  
  await Portafolio.update({
    progreso_completado: progreso.porcentajeTotal,
    actualizado_en: new Date()
  }, {
    where: { id: portafolioId },
    transaction
  });
}

/**
 * Calcular progreso detallado por secciones
 */
async function calcularProgresoDetallado(portafolioId) {
  const { ArchivoSubido } = require('../modelos');
  
  // Definir secciones y documentos mínimos requeridos según estructura UNSAAC
  const seccionesRequeridas = {
    'presentacion_portafolio': { minimos: 3, peso: 10 },
    'silabos': { minimos: 2, peso: 15 },
    'avance_academico': { minimos: 4, peso: 15 },
    'material_ensenanza': { minimos: 6, peso: 20 },
    'asignaciones': { minimos: 3, peso: 10 },
    'examenes': { minimos: 8, peso: 15 },
    'trabajos_estudiantiles': { minimos: 5, peso: 10 },
    'archivos_portafolio': { minimos: 3, peso: 5 }
  };
  
  const documentosPorSeccion = await ArchivoSubido.findAll({
    where: { 
      portafolio_id: portafolioId,
      activo: true 
    },
    attributes: [
      'seccion_portafolio',
      [sequelize.fn('COUNT', '*'), 'total_documentos']
    ],
    group: ['seccion_portafolio']
  });
  
  let progresoTotal = 0;
  const detalleProgreso = {};
  
  for (const [seccion, config] of Object.entries(seccionesRequeridas)) {
    const documentosSeccion = documentosPorSeccion.find(
      d => d.seccion_portafolio === seccion
    );
    
    const totalDocs = documentosSeccion ? parseInt(documentosSeccion.dataValues.total_documentos) : 0;
    const progresoPorcentaje = Math.min((totalDocs / config.minimos) * 100, 100);
    const contribucionTotal = (progresoPorcentaje * config.peso) / 100;
    
    detalleProgreso[seccion] = {
      documentos_actuales: totalDocs,
      documentos_minimos: config.minimos,
      progreso_porcentaje: progresoPorcentaje,
      peso_seccion: config.peso,
      contribucion_total: contribucionTotal
    };
    
    progresoTotal += contribucionTotal;
  }
  
  return {
    porcentajeTotal: Math.round(progresoTotal),
    detallePorSeccion: detalleProgreso,
    fechaCalculado: new Date()
  };
}

/**
 * Agrupar documentos por sección
 */
function agruparDocumentosPorSeccion(documentos) {
  return documentos.reduce((agrupados, doc) => {
    const seccion = doc.seccion_portafolio;
    if (!agrupados[seccion]) {
      agrupados[seccion] = [];
    }
    agrupados[seccion].push(doc);
    return agrupados;
  }, {});
}

/**
 * Crear notificación de subida de documento
 */
async function crearNotificacionSubidaDocumento(portafolio, archivo, transaction) {
  try {
    const { Notificacion, VerificadorDocente } = require('../modelos');
    
    // Buscar verificador asignado al docente
    const verificadorAsignado = await VerificadorDocente.findOne({
      where: { 
        docente_id: portafolio.docente_id,
        ciclo_id: portafolio.ciclo_id,
        activo: true 
      },
      transaction
    });
    
    if (verificadorAsignado) {
      await Notificacion.create({
        receptor_id: verificadorAsignado.verificador_id,
        tipo: 'documento_subido',
        titulo: 'Nuevo documento subido',
        mensaje: `El docente ha subido un nuevo documento en la sección ${archivo.seccion_portafolio}`,
        datos_adicionales: {
          portafolio_id: portafolio.id,
          archivo_id: archivo.id,
          seccion: archivo.seccion_portafolio,
          docente_id: portafolio.docente_id
        },
        leido: false
      }, { transaction });
    }
  } catch (error) {
    logger.warn('Error al crear notificación:', error);
    // No lanzar error para no interrumpir el flujo principal
  }
}

module.exports = {
  upload,
  subirDocumento,
  obtenerDocumentosPortafolio,
  descargarDocumento,
  eliminarDocumento,
  obtenerProgresoPortafolio
}; 