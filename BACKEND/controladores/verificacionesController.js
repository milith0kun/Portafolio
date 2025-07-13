/**
 * Controlador de Verificaciones
 * Maneja las operaciones relacionadas con la verificación de portafolios docentes
 */

const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const ResponseHandler = require('./utils/responseHandler');
const { logger } = require('../config/logger');
const { Portafolio, Usuario, Asignatura, Carrera, CicloAcademico, ArchivoSubido, VerificadorDocente } = require('../modelos');

/**
 * Obtener portafolios asignados al verificador
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerPortafoliosAsignados = async (req, res) => {
  try {
    const verificadorId = req.usuario.id;
    logger.info(`Obteniendo portafolios asignados para verificador ID: ${verificadorId}`);

    // Obtener portafolios asignados al verificador
    const portafoliosAsignados = await VerificadorDocente.findAll({
      where: {
        verificador_id: verificadorId,
        activo: true
      },
      include: [
        {
          model: Usuario,
          as: 'docente',
          attributes: ['id', 'nombres', 'apellidos', 'correo']
        },
        {
          model: Portafolio,
          as: 'portafolio',
          include: [
            {
              model: Asignatura,
              as: 'asignatura',
              attributes: ['id', 'nombre', 'codigo', 'creditos'],
              include: [
                {
                  model: Carrera,
                  as: 'carrera',
                  attributes: ['id', 'nombre']
                }
              ]
            },
            {
              model: CicloAcademico,
              as: 'ciclo',
              attributes: ['id', 'nombre', 'estado']
            }
          ]
        }
      ]
    });

    // Obtener estadísticas de cada portafolio
    const portafoliosConEstadisticas = await Promise.all(
      portafoliosAsignados.map(async (asignacion) => {
        const portafolio = asignacion.portafolio;
        
        // Contar archivos por estado
        const estadisticasArchivos = await ArchivoSubido.findAll({
          where: { portafolio_id: portafolio.id },
          attributes: [
            'estado',
            [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
          ],
          group: ['estado'],
          raw: true
        });

        const stats = {
          total: 0,
          pendientes: 0,
          aprobados: 0,
          rechazados: 0,
          observaciones: 0
        };

        estadisticasArchivos.forEach(stat => {
          stats.total += parseInt(stat.cantidad);
          switch (stat.estado) {
            case 'pendiente':
              stats.pendientes = parseInt(stat.cantidad);
              break;
            case 'aprobado':
              stats.aprobados = parseInt(stat.cantidad);
              break;
            case 'rechazado':
              stats.rechazados = parseInt(stat.cantidad);
              break;
            case 'observacion':
              stats.observaciones = parseInt(stat.cantidad);
              break;
          }
        });

        return {
          id: portafolio.id,
          progreso_completado: portafolio.progreso_completado,
          estado: portafolio.estado,
          creado_en: portafolio.creado_en,
          actualizado_en: portafolio.actualizado_en,
          docente: asignacion.docente,
          asignatura: portafolio.asignatura,
          ciclo: portafolio.ciclo,
          estadisticas: stats,
          fecha_asignacion: asignacion.creado_en
        };
      })
    );

    logger.info(`Encontrados ${portafoliosConEstadisticas.length} portafolios asignados`);
    
    return ResponseHandler.success(res, portafoliosConEstadisticas, 'Portafolios asignados obtenidos exitosamente');
    
  } catch (error) {
    logger.error('Error obteniendo portafolios asignados:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Obtener documentos de un portafolio específico para verificación
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerDocumentosPortafolio = async (req, res) => {
  try {
    const { portafolioId } = req.params;
    const verificadorId = req.usuario.id;

    // Verificar que el verificador tenga acceso a este portafolio
    const asignacion = await VerificadorDocente.findOne({
      where: {
        verificador_id: verificadorId,
        docente_id: { [Op.in]: sequelize.literal(`(SELECT docente_id FROM portafolios WHERE id = ${portafolioId})`) },
        activo: true
      }
    });

    if (!asignacion) {
      return ResponseHandler.error(res, 'No tienes acceso a este portafolio', 403);
    }

    // Obtener información del portafolio
    const portafolio = await Portafolio.findByPk(portafolioId, {
      include: [
        {
          model: Usuario,
          as: 'docente',
          attributes: ['id', 'nombres', 'apellidos', 'correo']
        },
        {
          model: Asignatura,
          as: 'asignatura',
          attributes: ['id', 'nombre', 'codigo', 'creditos']
        }
      ]
    });

    if (!portafolio) {
      return ResponseHandler.error(res, 'Portafolio no encontrado', 404);
    }

    // Obtener archivos del portafolio organizados por carpeta
    const archivos = await ArchivoSubido.findAll({
      where: { portafolio_id: portafolioId },
      order: [['subido_en', 'ASC']]
    });

    // Organizar archivos por carpeta
    const carpetas = {};
    archivos.forEach(archivo => {
      const carpeta = archivo.ruta || 'Sin clasificar';
      if (!carpetas[carpeta]) {
        carpetas[carpeta] = [];
      }
      carpetas[carpeta].push({
        id: archivo.id,
        nombre: archivo.nombre_original,
        tamaño: archivo.tamanio,
        tipo: archivo.tipo_mime,
        fechaSubida: archivo.subido_en,
        estadoVerificacion: archivo.estado,
        observaciones: archivo.comentarios,
        fechaVerificacion: archivo.fecha_verificacion,
        verificadoPor: archivo.verificado_por
      });
    });

    const resultado = {
      portafolio: {
        id: portafolio.id,
        progreso_completado: portafolio.progreso_completado,
        estado: portafolio.estado,
        docente: portafolio.docente,
        asignatura: portafolio.asignatura
      },
      carpetas,
      estadisticasGenerales: {
        totalArchivos: archivos.length,
        pendientes: archivos.filter(a => a.estado === 'pendiente').length,
        aprobados: archivos.filter(a => a.estado === 'aprobado').length,
        rechazados: archivos.filter(a => a.estado === 'rechazado').length,
        observaciones: archivos.filter(a => a.estado === 'observacion').length
      }
    };

    return ResponseHandler.success(res, resultado, 'Documentos del portafolio obtenidos exitosamente');
    
  } catch (error) {
    logger.error('Error obteniendo documentos del portafolio:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Verificar un documento (aprobar/rechazar/observar)
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const verificarDocumento = async (req, res) => {
  try {
    const { documentoId } = req.params;
    const { estado, observaciones } = req.body;
    const verificadorId = req.usuario.id;

    // Validar estado
    const estadosValidos = ['aprobado', 'rechazado', 'observacion'];
    if (!estadosValidos.includes(estado)) {
      return ResponseHandler.error(res, 'Estado de verificación no válido', 400);
    }

    // Obtener el archivo
    const archivo = await ArchivoSubido.findByPk(documentoId);
    if (!archivo) {
      return ResponseHandler.error(res, 'Documento no encontrado', 404);
    }

    // Verificar que el verificador tenga acceso al portafolio de este archivo
    const asignacion = await VerificadorDocente.findOne({
      where: {
        verificador_id: verificadorId,
        docente_id: { [Op.in]: sequelize.literal(`(SELECT docente_id FROM portafolios WHERE id = ${archivo.portafolio_id})`) },
        activo: true
      }
    });

    if (!asignacion) {
      return ResponseHandler.error(res, 'No tienes acceso para verificar este documento', 403);
    }

    // Actualizar el archivo
    await archivo.update({
      estado: estado,
      comentarios: observaciones || null,
      fecha_verificacion: new Date(),
      verificado_por: verificadorId
    });

    // Recalcular progreso del portafolio
    await recalcularProgresoPortafolio(archivo.portafolio_id);

    logger.info(`Documento ${documentoId} verificado como ${estado} por verificador ${verificadorId}`);
    
    return ResponseHandler.success(res, {
      id: archivo.id,
      estado: estado,
      observaciones: observaciones,
      fechaVerificacion: archivo.fecha_verificacion
    }, 'Documento verificado exitosamente');
    
  } catch (error) {
    logger.error('Error verificando documento:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Verificar múltiples documentos a la vez
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const verificarMultiplesDocumentos = async (req, res) => {
  try {
    const { documentos } = req.body; // Array de {id, estado, observaciones}
    const verificadorId = req.usuario.id;

    if (!Array.isArray(documentos) || documentos.length === 0) {
      return ResponseHandler.error(res, 'Se requiere un array de documentos', 400);
    }

    const resultados = [];
    const portafoliosAfectados = new Set();

    for (const doc of documentos) {
      try {
        const { id, estado, observaciones } = doc;
        
        // Validar estado
        const estadosValidos = ['aprobado', 'rechazado', 'observacion'];
        if (!estadosValidos.includes(estado)) {
          resultados.push({ id, error: 'Estado no válido' });
          continue;
        }

        // Obtener el archivo
        const archivo = await ArchivoSubido.findByPk(id);
        if (!archivo) {
          resultados.push({ id, error: 'Documento no encontrado' });
          continue;
        }

        // Verificar acceso
        const asignacion = await VerificadorDocente.findOne({
          where: {
            verificador_id: verificadorId,
            docente_id: { [Op.in]: sequelize.literal(`(SELECT docente_id FROM portafolios WHERE id = ${archivo.portafolio_id})`) },
            activo: true
          }
        });

        if (!asignacion) {
          resultados.push({ id, error: 'Sin acceso' });
          continue;
        }

        // Actualizar archivo
        await archivo.update({
          estado: estado,
          comentarios: observaciones || null,
          fecha_verificacion: new Date(),
          verificado_por: verificadorId
        });

        portafoliosAfectados.add(archivo.portafolio_id);
        resultados.push({ id, estado, exito: true });

      } catch (error) {
        resultados.push({ id: doc.id, error: error.message });
      }
    }

    // Recalcular progreso de portafolios afectados
    for (const portafolioId of portafoliosAfectados) {
      await recalcularProgresoPortafolio(portafolioId);
    }

    const exitosos = resultados.filter(r => r.exito).length;
    logger.info(`Verificación masiva completada: ${exitosos}/${documentos.length} exitosos`);
    
    return ResponseHandler.success(res, resultados, `Verificación masiva completada: ${exitosos}/${documentos.length} exitosos`);
    
  } catch (error) {
    logger.error('Error en verificación masiva:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Obtener estadísticas de verificación del verificador
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerEstadisticasVerificador = async (req, res) => {
  try {
    const verificadorId = req.usuario.id;

    // Obtener portafolios asignados
    const portafoliosAsignados = await VerificadorDocente.count({
      where: {
        verificador_id: verificadorId,
        activo: true
      }
    });

    // Obtener estadísticas de archivos verificados
    const archivosVerificados = await ArchivoSubido.findAll({
      where: {
        verificado_por: verificadorId
      },
      attributes: [
        'estado',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['estado'],
      raw: true
    });

    const estadisticas = {
      portafoliosAsignados,
      totalVerificados: 0,
      aprobados: 0,
      rechazados: 0,
      observaciones: 0
    };

    archivosVerificados.forEach(stat => {
      const cantidad = parseInt(stat.cantidad);
      estadisticas.totalVerificados += cantidad;
      
      switch (stat.estado) {
        case 'aprobado':
          estadisticas.aprobados = cantidad;
          break;
        case 'rechazado':
          estadisticas.rechazados = cantidad;
          break;
        case 'observacion':
          estadisticas.observaciones = cantidad;
          break;
      }
    });

    // Obtener archivos pendientes de verificación
    const archivosPendientes = await ArchivoSubido.count({
      include: [
        {
          model: Portafolio,
          as: 'portafolio',
          include: [
            {
              model: VerificadorDocente,
              as: 'verificadores',
              where: {
                verificador_id: verificadorId,
                activo: true
              }
            }
          ]
        }
      ],
      where: {
        estado: 'pendiente'
      }
    });

    estadisticas.pendientes = archivosPendientes;

    return ResponseHandler.success(res, estadisticas, 'Estadísticas de verificación obtenidas exitosamente');
    
  } catch (error) {
    logger.error('Error obteniendo estadísticas de verificador:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Función auxiliar para recalcular el progreso de un portafolio
 * @param {number} portafolioId - ID del portafolio
 */
const recalcularProgresoPortafolio = async (portafolioId) => {
  try {
    const archivos = await ArchivoSubido.findAll({
      where: { portafolio_id: portafolioId }
    });

    if (archivos.length === 0) {
      await Portafolio.update({ progreso_completado: 0 }, { where: { id: portafolioId } });
      return;
    }

    const aprobados = archivos.filter(a => a.estado === 'aprobado').length;
    const progreso = Math.round((aprobados / archivos.length) * 100);

    await Portafolio.update({ progreso_completado: progreso }, { where: { id: portafolioId } });
    
  } catch (error) {
    logger.error('Error recalculando progreso del portafolio:', error);
  }
};

module.exports = {
  obtenerPortafoliosAsignados,
  obtenerDocumentosPortafolio,
  verificarDocumento,
  verificarMultiplesDocumentos,
  obtenerEstadisticasVerificador
}; 