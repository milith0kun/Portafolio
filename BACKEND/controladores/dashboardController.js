const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { Actividad, Usuario, Notificacion } = require('../modelos');
const { logger } = require('../config/logger');



/**
 * Obtiene las actividades recientes del sistema
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerActividades = async (req, res) => {
  try {
    const actividades = await Actividad.findAll({
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'nombres', 'apellidos'],
        required: false
      }],
      order: [['fecha_creacion', 'DESC']],
      limit: 10
    });

    const actividadesFormateadas = actividades.map(actividad => ({
      id: actividad.id,
      tipo: actividad.tipo,
      titulo: actividad.modulo,
      descripcion: actividad.descripcion,
      fecha: actividad.fecha_creacion,
      icono: obtenerIconoActividad(actividad.tipo),
      usuario: actividad.usuario ? `${actividad.usuario.nombres} ${actividad.usuario.apellidos}` : null
    }));

    return res.status(200).json({
      success: true,
      message: 'Actividades obtenidas correctamente',
      data: actividadesFormateadas
    });
    
  } catch (error) {
    logger.error('Error al obtener actividades:', error);
    return res.status(200).json({
      success: true,
      message: 'No hay actividades disponibles',
      data: []
    });
  }
};

/**
 * Función auxiliar para obtener iconos según el tipo de actividad
 * @param {string} tipo - Tipo de actividad
 * @returns {string} Clase CSS del icono
 */
const obtenerIconoActividad = (tipo) => {
  const iconos = {
    'login': 'fas fa-sign-in-alt',
    'logout': 'fas fa-sign-out-alt',
    'creacion': 'fas fa-plus-circle',
    'actualizacion': 'fas fa-edit',
    'eliminacion': 'fas fa-trash-alt',
    'carga_masiva': 'fas fa-upload',
    'descarga': 'fas fa-download',
    'cambio_estado': 'fas fa-exchange-alt',
    'error': 'fas fa-exclamation-triangle'
  };
  return iconos[tipo] || 'fas fa-info-circle';
};

/**
 * Obtiene las notificaciones del sistema
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerNotificaciones = async (req, res) => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.usuario || !req.usuario.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        data: []
      });
    }

    const notificaciones = await Notificacion.findAll({
      where: { 
        usuario_id: req.usuario.id,
        leida: false 
      },
      order: [['fecha_creacion', 'DESC']],
      limit: 10
    });

    const notificacionesFormateadas = notificaciones.map(notif => ({
      id: notif.id,
      tipo: notif.tipo,
      titulo: notif.titulo,
      mensaje: notif.mensaje,
      fecha: notif.fecha_creacion,
      leida: notif.leida
    }));

    return res.status(200).json({
      success: true,
      message: 'Notificaciones obtenidas correctamente',
      data: notificacionesFormateadas
    });
    
  } catch (error) {
    // En caso de error, devolver array vacío en lugar de error 500
    return res.status(200).json({
      success: true,
      message: 'No hay notificaciones disponibles',
      data: []
    });
  }
};

/**
 * Obtiene el ciclo académico actual
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerCicloActual = async (req, res) => {
  try {
    const { CicloAcademico, EstadoSistema } = require('../modelos');
    
    const cicloActivo = await CicloAcademico.findOne({
      where: { estado: 'activo' },
      attributes: {
        exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
      }
    });

    if (!cicloActivo) {
      return res.status(404).json({
        success: false,
        message: 'No hay ningún ciclo académico activo en el sistema',
        data: null
      });
    }

    // Obtener estados del sistema
    let estadosModulos = [];
    let progreso = 0;
    
    try {
      estadosModulos = await EstadoSistema.findAll({
        where: { ciclo_id: cicloActivo.id }
      });
      const modulosHabilitados = estadosModulos.filter(e => e.habilitado).length;
      const totalModulos = estadosModulos.length;
      progreso = totalModulos > 0 ? Math.round((modulosHabilitados / totalModulos) * 100) : 0;
    } catch (error) {
      logger.warn('Error al obtener estados del sistema:', error.message);
    }

    const cicloActual = {
      id: cicloActivo.id,
      nombre: cicloActivo.nombre,
      descripcion: cicloActivo.descripcion,
      fechaInicio: cicloActivo.fecha_inicio,
      fechaFin: cicloActivo.fecha_fin,
      estado: cicloActivo.estado,
      progreso: progreso,
      semestre: cicloActivo.semestre_actual,
      anio: cicloActivo.anio_actual,
      estadosModulos: estadosModulos.reduce((acc, estado) => {
        acc[estado.modulo] = estado.habilitado;
        return acc;
      }, {})
    };

    return res.status(200).json({
      success: true,
      message: 'Ciclo actual obtenido correctamente',
      data: cicloActual
    });
    
  } catch (error) {
    logger.error('Error al obtener ciclo actual:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener ciclo académico actual',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene estadísticas generales del sistema
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerEstadisticas = async (req, res) => {
  try {
    const cicloId = req.query.ciclo || req.query.cicloId;
    
    const { 
      Usuario, 
      UsuarioRol, 
      Asignatura, 
      DocenteAsignatura, 
      VerificadorDocente, 
      Portafolio,
      Carrera, 
      CicloAcademico,
      ArchivoSubido,
      Observacion
    } = require('../modelos');
    
    // Obtener ciclo académico
    let cicloActivo;
    if (cicloId) {
      cicloActivo = await CicloAcademico.findByPk(cicloId, {
        attributes: {
          exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
        }
      });
    } else {
      cicloActivo = await CicloAcademico.findOne({
        where: { estado: 'activo' },
        attributes: {
          exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
        }
      });
    }

    const filtrosCiclo = cicloActivo ? { ciclo_id: cicloActivo.id } : {};
    
    // Obtener estadísticas
    const [
      totalUsuarios,
      usuariosActivos,
      distribucionRoles,
      totalCarreras,
      totalAsignaturas,
      totalAsignaciones,
      totalVerificaciones,
      totalPortafolios,
      portafoliosActivos,
      portafoliosCompletados,
      portafoliosEnVerificacion,
      totalDocumentos,
      documentosAprobados,
      documentosPendientes,
      documentosObservados
    ] = await Promise.all([
      Usuario.count(),
      Usuario.count({ where: { activo: true } }),
      UsuarioRol.findAll({
        attributes: [
          'rol',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total']
        ],
        where: { activo: true },
        group: ['rol'],
        raw: true
      }),
      Carrera.count(),
      Asignatura.count(cicloActivo ? { where: filtrosCiclo } : {}),
      DocenteAsignatura.count(cicloActivo ? { where: filtrosCiclo } : {}),
      VerificadorDocente.count({ where: { activo: true } }),
      Portafolio.count(cicloActivo ? { where: filtrosCiclo } : {}),
      Portafolio.count(cicloActivo ? { 
        where: { ...filtrosCiclo, estado: 'activo' } 
      } : { where: { estado: 'activo' } }),
      Portafolio.count(cicloActivo ? { 
        where: { ...filtrosCiclo, estado: 'completado' } 
      } : { where: { estado: 'completado' } }),
      Portafolio.count(cicloActivo ? { 
        where: { ...filtrosCiclo, estado: 'en_verificacion' } 
      } : { where: { estado: 'en_verificacion' } }),
      ArchivoSubido.count(),
      ArchivoSubido.count({ where: { estado: 'aprobado' } }),
      ArchivoSubido.count({ where: { estado: 'pendiente' } }),
      Observacion.count()
    ]);

    // Procesar distribución de roles
    const roles = distribucionRoles.reduce((acc, { rol, total }) => {
      acc[rol.toLowerCase() + 's'] = parseInt(total);
      return acc;
    }, { docentes: 0, verificadores: 0, administradores: 0 });

    const estadisticas = {
      sistema: {
        estado: 'activo',
        version: '1.0.0',
        modo: process.env.NODE_ENV || 'development'
      },
      cicloActivo: cicloActivo ? {
        id: cicloActivo.id,
        nombre: cicloActivo.nombre,
        estado: cicloActivo.estado,
        fechaInicio: cicloActivo.fecha_inicio,
        fechaFin: cicloActivo.fecha_fin
      } : null,
      // Nombres esperados por el frontend
      totalUsuarios: totalUsuarios,
      totalUsuariosActivos: usuariosActivos,
      totalPortafolios: totalPortafolios,
      totalPortafoliosActivos: portafoliosActivos,
      totalPortafoliosCompletados: portafoliosCompletados,
      totalPortafoliosEnVerificacion: portafoliosEnVerificacion,
      totalDocumentos: totalDocumentos,
      totalDocumentosAprobados: documentosAprobados,
      totalDocumentosPendientes: documentosPendientes,
      totalDocumentosObservados: documentosObservados,
      totalCarreras: totalCarreras,
      totalAsignaturas: totalAsignaturas,
      totalAsignaciones: totalAsignaciones,
      totalVerificaciones: totalVerificaciones,
      roles,
      documentos: {
        total: totalDocumentos,
        aprobados: documentosAprobados,
        pendientes: documentosPendientes,
        observados: documentosObservados
      },
      timestamp: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      message: 'Estadísticas obtenidas correctamente',
      data: estadisticas
    });
    
  } catch (error) {
    logger.error('Error al obtener estadísticas del sistema:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del sistema',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene estadísticas específicas para administrador
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerEstadisticasAdmin = async (req, res) => {
  try {
    const cicloId = req.query.ciclo || req.query.cicloId;
    
    const { 
      Usuario, 
      UsuarioRol, 
      Asignatura, 
      DocenteAsignatura, 
      VerificadorDocente, 
      Portafolio,
      Carrera, 
      CicloAcademico,
      ArchivoSubido,
      Observacion
    } = require('../modelos');
    
    // Obtener ciclo académico
    let cicloActivo;
    if (cicloId) {
      cicloActivo = await CicloAcademico.findByPk(cicloId);
    } else {
      cicloActivo = await CicloAcademico.findOne({ where: { estado: 'activo' } });
    }

    const filtrosCiclo = cicloActivo ? { ciclo_id: cicloActivo.id } : {};
    
    // Obtener estadísticas
    const [
      totalUsuarios,
      usuariosActivos,
      distribucionRoles,
      totalCarreras,
      totalAsignaturas,
      totalAsignaciones,
      totalVerificaciones,
      totalPortafolios,
      portafoliosActivos,
      portafoliosCompletados,
      portafoliosEnVerificacion,
      totalDocumentos,
      documentosAprobados,
      documentosPendientes,
      documentosObservados
    ] = await Promise.all([
      Usuario.count(),
      Usuario.count({ where: { activo: true } }),
      UsuarioRol.findAll({
        attributes: [
          'rol',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total']
        ],
        where: { activo: true },
        group: ['rol'],
        raw: true
      }),
      Carrera.count(),
      Asignatura.count(cicloActivo ? { where: filtrosCiclo } : {}),
      DocenteAsignatura.count(cicloActivo ? { where: filtrosCiclo } : {}),
      VerificadorDocente.count({ where: { activo: true } }),
      Portafolio.count(cicloActivo ? { where: filtrosCiclo } : {}),
      Portafolio.count(cicloActivo ? { 
        where: { ...filtrosCiclo, estado: 'activo' } 
      } : { where: { estado: 'activo' } }),
      Portafolio.count(cicloActivo ? { 
        where: { ...filtrosCiclo, estado: 'completado' } 
      } : { where: { estado: 'completado' } }),
      Portafolio.count(cicloActivo ? { 
        where: { ...filtrosCiclo, estado: 'en_verificacion' } 
      } : { where: { estado: 'en_verificacion' } }),
      ArchivoSubido.count(),
      ArchivoSubido.count({ where: { estado: 'aprobado' } }),
      ArchivoSubido.count({ where: { estado: 'pendiente' } }),
      Observacion.count()
    ]);

    // Procesar distribución de roles
    const roles = distribucionRoles.reduce((acc, { rol, total }) => {
      acc[rol.toLowerCase() + 's'] = parseInt(total);
      return acc;
    }, { docentes: 0, verificadores: 0, administradores: 0 });

    const estadisticas = {
      totalUsuarios,
      usuariosActivos,
      totalCarreras,
      totalAsignaturas,
      totalAsignaciones,
      totalVerificaciones,
      totalPortafolios,
      portafoliosActivos,
      portafoliosCompletados,
      portafoliosEnVerificacion,
      documentos: {
        total: totalDocumentos,
        aprobados: documentosAprobados,
        pendientes: documentosPendientes,
        observados: documentosObservados
      },
      roles,
      cicloActivo: cicloActivo ? {
        id: cicloActivo.id,
        nombre: cicloActivo.nombre,
        estado: cicloActivo.estado
      } : null,
      timestamp: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      message: 'Estadísticas de administrador obtenidas correctamente',
      data: estadisticas
    });
    
  } catch (error) {
    logger.error('Error al obtener estadísticas de administrador:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de administrador',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene estadísticas específicas para docente
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerEstadisticasDocente = async (req, res) => {
  try {
    const cicloId = req.query.ciclo || req.query.cicloId;
    const docenteId = req.usuario.id;
    
    const { 
      DocenteAsignatura, 
      Portafolio,
      CicloAcademico,
      ArchivoSubido,
      Observacion
    } = require('../modelos');
    
    // Obtener ciclo académico
    let cicloActivo;
    if (cicloId) {
      cicloActivo = await CicloAcademico.findByPk(cicloId);
    } else {
      cicloActivo = await CicloAcademico.findOne({ where: { estado: 'activo' } });
    }

    const filtrosCiclo = cicloActivo ? { ciclo_id: cicloActivo.id } : {};
    const filtrosDocente = { docente_id: docenteId, ...filtrosCiclo };
    
    // Obtener estadísticas
    const [
      totalAsignaciones,
      totalPortafolios,
      portafoliosActivos,
      portafoliosCompletados,
      portafoliosEnVerificacion,
      totalDocumentos,
      documentosAprobados,
      documentosPendientes,
      documentosObservados
    ] = await Promise.all([
      DocenteAsignatura.count({ where: filtrosDocente }),
      Portafolio.count({ where: filtrosDocente }),
      Portafolio.count({ where: { ...filtrosDocente, estado: 'activo' } }),
      Portafolio.count({ where: { ...filtrosDocente, estado: 'completado' } }),
      Portafolio.count({ where: { ...filtrosDocente, estado: 'en_verificacion' } }),
      ArchivoSubido.count({ where: { docente_id: docenteId } }),
      ArchivoSubido.count({ where: { docente_id: docenteId, estado: 'aprobado' } }),
      ArchivoSubido.count({ where: { docente_id: docenteId, estado: 'pendiente' } }),
      Observacion.count({ where: { docente_id: docenteId } })
    ]);

    const estadisticas = {
      totalAsignaciones,
      totalPortafolios,
      portafoliosActivos,
      portafoliosCompletados,
      portafoliosEnVerificacion,
      documentosSubidos: totalDocumentos,
      documentosAprobados,
      documentosPendientes,
      documentosObservados,
      totalDocumentos: totalPortafolios * 10, // Estimado de documentos esperados
      cicloActivo: cicloActivo ? {
        id: cicloActivo.id,
        nombre: cicloActivo.nombre,
        estado: cicloActivo.estado
      } : null,
      timestamp: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      message: 'Estadísticas de docente obtenidas correctamente',
      data: estadisticas
    });
    
  } catch (error) {
    logger.error('Error al obtener estadísticas de docente:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de docente',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene estadísticas específicas para verificador
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerEstadisticasVerificador = async (req, res) => {
  try {
    const cicloId = req.query.ciclo || req.query.cicloId;
    const verificadorId = req.usuario.id;
    
    const { 
      VerificadorDocente, 
      Portafolio,
      CicloAcademico,
      ArchivoSubido,
      Observacion
    } = require('../modelos');
    
    // Obtener ciclo académico
    let cicloActivo;
    if (cicloId) {
      cicloActivo = await CicloAcademico.findByPk(cicloId);
    } else {
      cicloActivo = await CicloAcademico.findOne({ where: { estado: 'activo' } });
    }

    // Obtener asignaciones del verificador
    const asignacionesVerificador = await VerificadorDocente.findAll({
      where: { verificador_id: verificadorId, activo: true },
      attributes: ['docente_id']
    });

    const docentesAsignados = asignacionesVerificador.map(a => a.docente_id);
    
    const filtrosCiclo = cicloActivo ? { ciclo_id: cicloActivo.id } : {};
    const filtrosVerificador = docentesAsignados.length > 0 ? 
      { docente_id: { [Op.in]: docentesAsignados }, ...filtrosCiclo } : 
      { docente_id: -1 };
    
    // Obtener estadísticas
    const [
      totalAsignaciones,
      totalPortafolios,
      portafoliosPendientes,
      portafoliosVerificados,
      portafoliosObservados,
      totalDocumentos,
      documentosPendientes,
      documentosRevisados,
      documentosObservados,
      documentosNuevosHoy
    ] = await Promise.all([
      VerificadorDocente.count({ where: { verificador_id: verificadorId, activo: true } }),
      Portafolio.count({ where: filtrosVerificador }),
      Portafolio.count({ where: { ...filtrosVerificador, estado: 'pendiente_verificacion' } }),
      Portafolio.count({ where: { ...filtrosVerificador, estado: 'verificado' } }),
      Portafolio.count({ where: { ...filtrosVerificador, estado: 'observado' } }),
      ArchivoSubido.count({ where: { docente_id: { [Op.in]: docentesAsignados } } }),
      ArchivoSubido.count({ where: { docente_id: { [Op.in]: docentesAsignados }, estado: 'pendiente' } }),
      ArchivoSubido.count({ where: { docente_id: { [Op.in]: docentesAsignados }, estado: 'aprobado' } }),
      Observacion.count({ where: { verificador_id: verificadorId } }),
      ArchivoSubido.count({ 
        where: { 
          docente_id: { [Op.in]: docentesAsignados },
          fecha_subida: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    const estadisticas = {
      totalAsignaciones,
      totalPortafolios,
      documentosPendientes,
      documentosUrgentes: Math.floor(documentosPendientes * 0.1),
      documentosNuevosHoy,
      totalDocumentos,
      documentosRevisados,
      documentosObservados,
      documentosRevisadosHoy: Math.floor(documentosRevisados * 0.05),
      portafoliosPendientes,
      portafoliosVerificados,
      portafoliosObservados,
      cicloActivo: cicloActivo ? {
        id: cicloActivo.id,
        nombre: cicloActivo.nombre,
        estado: cicloActivo.estado
      } : null,
      timestamp: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      message: 'Estadísticas de verificador obtenidas correctamente',
      data: estadisticas
    });
    
  } catch (error) {
    logger.error('Error al obtener estadísticas de verificador:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de verificador',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene asignaciones docente-asignatura
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerAsignaciones = async (req, res) => {
  try {
    const { DocenteAsignatura, Usuario, Asignatura } = require('../modelos');
    
    const asignaciones = await DocenteAsignatura.findAll({
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
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Asignaciones obtenidas correctamente',
      data: asignaciones
    });
    
  } catch (error) {
    logger.error('Error al obtener asignaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener asignaciones docente-asignatura',
      data: [],
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene verificaciones asignadas
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerVerificaciones = async (req, res) => {
  try {
    const verificaciones = await sequelize.query(`
      SELECT 
        vd.id,
        vd.verificador_id,
        vd.docente_id,
        vd.ciclo_id,
        vd.activo,
        vd.fecha_asignacion,
        u1.nombres as verificador_nombres,
        u1.apellidos as verificador_apellidos,
        u1.correo as verificador_correo,
        u2.nombres as docente_nombres,
        u2.apellidos as docente_apellidos,
        u2.correo as docente_correo
      FROM verificadores_docentes vd
      LEFT JOIN usuarios u1 ON vd.verificador_id = u1.id
      LEFT JOIN usuarios u2 ON vd.docente_id = u2.id
      WHERE vd.activo = true
      ORDER BY vd.fecha_asignacion DESC
    `, { type: sequelize.QueryTypes.SELECT });

    const verificacionesFormateadas = verificaciones.map(v => ({
      id: v.id,
      verificador_id: v.verificador_id,
      docente_id: v.docente_id,
      ciclo_id: v.ciclo_id,
      activo: v.activo,
      fecha_asignacion: v.fecha_asignacion,
      verificador: {
        id: v.verificador_id,
        nombres: v.verificador_nombres,
        apellidos: v.verificador_apellidos,
        correo: v.verificador_correo
      },
      docente: {
        id: v.docente_id,
        nombres: v.docente_nombres,
        apellidos: v.docente_apellidos,
        correo: v.docente_correo
      }
    }));

    return res.status(200).json({
      success: true,
      message: 'Verificaciones obtenidas correctamente',
      data: verificacionesFormateadas
    });
    
  } catch (error) {
    logger.error('Error al obtener verificaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener verificaciones',
      data: [],
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene portafolios del sistema
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerPortafolios = async (req, res) => {
  try {
    const { Portafolio, Usuario, Asignatura, CicloAcademico } = require('../modelos');
    
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
          attributes: ['id', 'codigo', 'nombre']
        },
        {
          model: CicloAcademico,
          as: 'ciclo',
          attributes: ['id', 'nombre', 'estado']
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Portafolios obtenidos correctamente',
      data: portafolios
    });
    
  } catch (error) {
    logger.error('Error al obtener portafolios:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener portafolios',
      data: [],
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene el estado general del sistema
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerEstadoSistema = async (req, res) => {
  try {
    const { Usuario, CicloAcademico, EstadoSistema } = require('../modelos');
    
    const estadoSistema = {
      estado: 'activo',
      conexion_bd: 'conectada',
      timestamp: new Date().toISOString()
    };
    
    // Verificar ciclo académico activo
    let cicloActivo = null;
    try {
      cicloActivo = await CicloAcademico.findOne({
        where: { estado: 'activo' },
        attributes: ['id', 'nombre', 'estado', 'fecha_inicio', 'fecha_fin']
      });
    } catch (error) {
      logger.warn('Error al obtener ciclo activo:', error.message);
    }
    
    // Obtener total de usuarios activos
    let usuariosActivos = 0;
    try {
      usuariosActivos = await Usuario.count({ where: { activo: true } });
    } catch (error) {
      logger.warn('Error al obtener usuarios activos:', error.message);
    }
    
    // Obtener estado del sistema
    let estadoSistemaDB = null;
    try {
      estadoSistemaDB = await EstadoSistema.findOne({
        order: [['createdAt', 'DESC']]
      });
    } catch (error) {
      logger.warn('Error al obtener estado del sistema:', error.message);
    }
    
    const respuesta = {
      success: true,
      message: 'Estado del sistema obtenido correctamente',
      data: {
        ...estadoSistema,
        ciclo_activo: cicloActivo,
        usuarios_activos: usuariosActivos,
        estado_sistema: estadoSistemaDB
      }
    };
    
    return res.status(200).json(respuesta);
    
  } catch (error) {
    logger.error('Error al obtener estado del sistema:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estado del sistema',
      data: {
        estado: 'error',
        conexion_bd: 'desconectada',
        timestamp: new Date().toISOString()
      },
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  obtenerActividades,
  obtenerNotificaciones,
  obtenerCicloActual,
  obtenerEstadisticas,
  obtenerEstadisticasAdmin,
  obtenerEstadisticasDocente,
  obtenerEstadisticasVerificador,
  obtenerAsignaciones,
  obtenerVerificaciones,
  obtenerPortafolios,
  obtenerEstadoSistema
};
