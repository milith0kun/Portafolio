const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const ResponseHandler = require('./utils/responseHandler');
const { Actividad, Usuario, Notificacion } = require('../modelos');

/**
 * Obtiene las métricas del dashboard con datos reales de la base de datos
 * Ahora con soporte para filtrado por ciclo académico
 */
const obtenerMetricas = async (req, res) => {
  try {
    // Obtener ciclo desde parámetros de consulta
    const cicloId = req.query.ciclo || req.query.cicloId;
    
    // Verificar conexión a la base de datos
    await sequelize.authenticate();
    
    // Obtener modelos después de verificar la conexión
    const { Usuario, UsuarioRol, Portafolio, DocenteAsignatura, CicloAcademico, Carrera, Asignatura } = require('../modelos');
    
    // Obtener información del ciclo académico
    let cicloInfo = null;
    if (cicloId) {
      try {
        cicloInfo = await CicloAcademico.findByPk(cicloId, {
          attributes: {
            exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
          }
        });
      } catch (error) {
        // Error silencioso al obtener información del ciclo
      }
    }
    
    // Obtener total de usuarios
    const totalUsuarios = await Usuario.count();
    
    // Obtener usuarios activos
    const usuariosActivos = await Usuario.count({
      where: { activo: true }
    });
    
    // Obtener distribución de roles
    let distribucionRoles = { docentes: 0, verificadores: 0, administradores: 0 };
    
    try {
      const roles = await UsuarioRol.findAll({
        attributes: [
          'rol',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total']
        ],
        where: { activo: true },
        group: ['rol'],
        raw: true
      });
      
      // Convertir el array de roles a un objeto con los totales por rol
      distribucionRoles = roles.reduce((acc, { rol, total }) => {
        const clave = rol.endsWith('s') ? rol : `${rol}s`; // Asegurar plural
        return { ...acc, [clave]: parseInt(total) };
      }, { ...distribucionRoles });
    } catch (error) {
      // Error silencioso al obtener distribución de roles
    }
    
    // Obtener métricas de carreras
    let carrerasMetricas = { total: 0, activas: 0 };
    try {
      const totalCarreras = await Carrera.count({
        where: { activo: true }
      });
      
      carrerasMetricas = {
        total: totalCarreras,
        activas: totalCarreras
      };
      

    } catch (error) {
      // Error silencioso al obtener métricas de carreras
    }
    
    // Obtener métricas de asignaturas (filtradas por ciclo si se especifica)
    let asignaturasMetricas = { total: 0, activas: 0 };
    if (cicloId) {
      try {
        // Contar asignaturas que tienen asignaciones en el ciclo específico
        const asignaturasEnCiclo = await Asignatura.count({
          include: [{
            model: DocenteAsignatura,
            as: 'asignaciones_docente',
            where: { 
              ciclo_id: cicloId,
              activo: true 
            },
            required: true
          }],
          where: { activo: true }
        });
        
        asignaturasMetricas = {
          total: asignaturasEnCiclo,
          activas: asignaturasEnCiclo
        };
        

      } catch (error) {
        // Error silencioso al obtener métricas de asignaturas
        // Fallback: contar todas las asignaturas activas
        try {
          const totalAsignaturas = await Asignatura.count({ where: { activo: true } });
          asignaturasMetricas = { total: totalAsignaturas, activas: totalAsignaturas };
        } catch (fallbackError) {
          // Error silencioso en fallback de asignaturas
        }
      }
    } else {
      // Si no hay ciclo específico, contar todas las asignaturas
      try {
        const totalAsignaturas = await Asignatura.count({ where: { activo: true } });
        asignaturasMetricas = { total: totalAsignaturas, activas: totalAsignaturas };
      } catch (error) {
        // Error silencioso al obtener total de asignaturas
      }
    }
    
    // Obtener métricas de portafolios (filtradas por ciclo si se especifica)
    let portafoliosMetricas = { total: 0, activos: 0, completados: 0, progresoPromedio: 0 };
    if (cicloId) {
      try {
        const totalPortafoliosCiclo = await Portafolio.count({
          where: { 
            ciclo_id: cicloId,
            activo: true 
          }
        });
        
        const portafoliosActivos = await Portafolio.count({
          where: { 
            ciclo_id: cicloId,
            activo: true,
            estado: 'activo'
          }
        });
        
        const portafoliosCompletados = await Portafolio.count({
          where: { 
            ciclo_id: cicloId,
            activo: true,
            estado: 'completado'
          }
        });
        
        // Calcular progreso promedio
        const portafoliosConProgreso = await Portafolio.findAll({
          where: { 
            ciclo_id: cicloId,
            activo: true 
          },
          attributes: ['progreso'],
          raw: true
        });
        
        const progresoPromedio = portafoliosConProgreso.length > 0 
          ? Math.round(portafoliosConProgreso.reduce((sum, p) => sum + (p.progreso || 0), 0) / portafoliosConProgreso.length)
          : 0;
        
        portafoliosMetricas = {
          total: totalPortafoliosCiclo,
          activos: portafoliosActivos,
          completados: portafoliosCompletados,
          progresoPromedio
        };
        

      } catch (error) {
        // Error silencioso al obtener métricas de portafolios
      }
    }
    
    // Obtener métricas de asignaciones (filtradas por ciclo si se especifica)
    let asignacionesMetricas = { total: 0, activas: 0 };
    if (cicloId) {
      try {
        const totalAsignaciones = await DocenteAsignatura.count({
          where: { 
            ciclo_id: cicloId,
            activo: true 
          }
        });
        
        asignacionesMetricas = {
          total: totalAsignaciones,
          activas: totalAsignaciones
        };
        

      } catch (error) {
        // Error silencioso al obtener métricas de asignaciones
      }
    }
    
    // Estructura de respuesta
    const metricas = {
      sistema: {
        estado: 'activo',
        version: '1.0.0',
        modo: 'produccion',
        mensaje: cicloId ? `Datos del ciclo: ${cicloInfo?.nombre || 'Desconocido'}` : 'Datos generales del sistema'
      },
      ciclo: cicloInfo ? {
        id: cicloInfo.id,
        nombre: cicloInfo.nombre,
        estado: cicloInfo.estado,
        fechaInicio: cicloInfo.fecha_inicio,
        fechaFin: cicloInfo.fecha_fin
      } : null,
      usuarios: {
        total: totalUsuarios,
        activos: usuariosActivos,
        pendientes: totalUsuarios - usuariosActivos
      },
      roles: distribucionRoles,
      carreras: carrerasMetricas,
      asignaturas: asignaturasMetricas,
      portafolios: portafoliosMetricas,
      asignaciones: asignacionesMetricas,
      documentos: {
        // Estos valores se actualizarán cuando se implemente el módulo de documentos
        total: 0,
        aprobados: 0,
        pendientes: 0,
        observados: 0
      },
      timestamp: new Date().toISOString()
    };
    

    
    // Devolver respuesta exitosa
    return res.status(200).json({
      success: true,
      message: 'Métricas obtenidas correctamente',
      data: metricas
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener métricas del dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene las actividades recientes del sistema
 */
const obtenerActividades = async (req, res) => {
  try {
    
    // Obtener actividades con información de usuario usando las asociaciones
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
      titulo: actividad.modulo, // Usar módulo como título
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
    // Retornar array vacío en lugar de error 500
    return res.status(200).json({
      success: true,
      message: 'No hay actividades disponibles',
      data: []
    });
  }
};

// Función auxiliar para obtener iconos según el tipo de actividad
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
 */
const obtenerNotificaciones = async (req, res) => {
  try {
    // Obtener notificaciones reales de la base de datos
    const { Notificacion } = require('../modelos');
    
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
    return res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene el ciclo académico actual
 */
const obtenerCicloActual = async (req, res) => {
  try {
    // Obtener el ciclo activo real de la base de datos
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

    // Obtener estados del sistema por separado
    let estadosModulos = [];
    let progreso = 0;
    
    if (cicloActivo) {
      try {
        estadosModulos = await EstadoSistema.findAll({
          where: { ciclo_id: cicloActivo.id }
        });
        const modulosHabilitados = estadosModulos.filter(e => e.habilitado).length;
        const totalModulos = estadosModulos.length;
        progreso = totalModulos > 0 ? Math.round((modulosHabilitados / totalModulos) * 100) : 0;
      } catch (error) {
        console.log('Error al obtener estados del sistema:', error.message);
      }
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
    return res.status(500).json({
      success: false,
      message: 'Error al obtener ciclo académico actual',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene estadísticas generales del sistema
 */
const obtenerEstadisticas = async (req, res) => {
  try {
    // Obtener ciclo desde parámetros de consulta
    const cicloId = req.query.ciclo || req.query.cicloId;
    
    // Verificar conexión a la base de datos
    await sequelize.authenticate();
    
    // Obtener modelos
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
    
    // Obtener ciclo académico (específico o activo)
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

    // Filtros por ciclo
    const filtrosCiclo = cicloActivo ? { ciclo_id: cicloActivo.id } : {};
    
    // Obtener estadísticas de usuarios y roles
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
      sequelize.query('SELECT COUNT(*) as count FROM verificadores_docentes WHERE activo = true', { type: sequelize.QueryTypes.SELECT }).then(result => result[0].count),
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

    // Estructura de respuesta completa
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
      usuarios: totalUsuarios,
      usuariosActivos,
      roles,
      carreras: totalCarreras,
      asignaturas: totalAsignaturas,
      asignaciones: totalAsignaciones,
      verificaciones: totalVerificaciones,
      portafolios: totalPortafolios,
      portafoliosActivos,
      portafoliosCompletados,
      portafoliosEnVerificacion,
      documentos: {
        total: totalDocumentos,
        aprobados: documentosAprobados,
        pendientes: documentosPendientes,
        observados: documentosObservados
      },
      timestamp: new Date().toISOString()
    };


    return res.status(200).json(estadisticas);
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas del sistema',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtiene asignaciones docente-asignatura
 */
const obtenerAsignaciones = async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    await sequelize.authenticate();
    
    // Obtener modelos
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
 */
const obtenerVerificaciones = async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    await sequelize.authenticate();
    
    // Usar SQL directo para evitar problemas con asociaciones
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

    // Formatear respuesta
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
 */
const obtenerPortafolios = async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    await sequelize.authenticate();
    
    // Obtener modelos
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
    return res.status(500).json({
      success: false,
      message: 'Error al obtener portafolios',
      data: [],
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  obtenerMetricas,
  obtenerActividades,
  obtenerNotificaciones,
  obtenerCicloActual,
  obtenerEstadisticas,
  obtenerAsignaciones,
  obtenerVerificaciones,
  obtenerPortafolios
};
