const { Usuario, UsuarioRol, VerificadorDocente, CicloAcademico } = require('../modelos');
const { Op } = require('sequelize');
const ResponseHandler = require('./utils/responseHandler');
const { logger } = require('../config/logger');
const bcrypt = require('bcryptjs');

/**
 * Obtener todos los usuarios (solo administradores)
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerUsuarios = async (req, res) => {
  try {
    const { pagina = 1, limite = 10, busqueda = '' } = req.query;
    const offset = (pagina - 1) * limite;

    const where = {};
    
    // Búsqueda por nombres, apellidos o correo
    if (busqueda) {
      where[Op.or] = [
        { nombres: { [Op.like]: `%${busqueda}%` } },
        { apellidos: { [Op.like]: `%${busqueda}%` } },
        { correo: { [Op.like]: `%${busqueda}%` } }
      ];
    }

    const { count, rows } = await Usuario.findAndCountAll({
      where,
      attributes: { exclude: ['contrasena'] },
      include: [
        {
          model: UsuarioRol,
          as: 'roles',
          where: { activo: true },
          required: false
        }
      ],
      limit: parseInt(limite),
      offset: parseInt(offset),
      order: [['apellidos', 'ASC']]
    });

    const responseData = {
      usuarios: rows,
      meta: {
        total: count,
        totalPaginas: Math.ceil(count / limite),
        paginaActual: parseInt(pagina),
        limite: parseInt(limite)
      }
    };

    return ResponseHandler.success(res, responseData, 'Usuarios obtenidos correctamente');

  } catch (error) {
    logger.error('Error al obtener usuarios:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Obtener un usuario por ID
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['contrasena'] },
      include: [
        {
          model: UsuarioRol,
          as: 'roles',
          where: { activo: true },
          required: false
        }
      ]
    });

    if (!usuario) {
      return ResponseHandler.error(res, 'Usuario no encontrado', 404);
    }

    return ResponseHandler.success(res, usuario, 'Usuario obtenido correctamente');

  } catch (error) {
    logger.error('Error al obtener usuario:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Crear un nuevo usuario (solo administradores)
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.crearUsuario = async (req, res) => {
  try {
    const { nombres, apellidos, correo, contrasena, rol, activo = true } = req.body;

    // Validar que el correo no esté en uso
    const existeUsuario = await Usuario.findOne({ where: { correo } });
    if (existeUsuario) {
      return ResponseHandler.error(res, 'El correo electrónico ya está en uso', 400);
    }

    // Verificar que el rol sea válido
    const rolesValidos = ['docente', 'verificador', 'administrador'];
    if (rol && !rolesValidos.includes(rol)) {
      return ResponseHandler.error(res, 'El rol especificado no es válido', 400);
    }

    // Crear el usuario
    const usuario = await Usuario.create({
      nombres,
      apellidos,
      correo,
      contrasena, // El hash se maneja en el hook beforeCreate del modelo
      activo
    });
    
    // Crear el rol del usuario
    if (rol) {
      await UsuarioRol.create({
        usuario_id: usuario.id,
        rol,
        activo: true,
        asignado_por: req.usuario.id // ID del administrador que crea el usuario
      });
    }

    // No devolver la contraseña en la respuesta
    const usuarioCreado = usuario.get({ plain: true });
    delete usuarioCreado.contrasena;

    return ResponseHandler.success(res, usuarioCreado, 'Usuario creado exitosamente', 201);

  } catch (error) {
    logger.error('Error al crear usuario:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Actualizar un usuario existente
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, apellidos, correo, contrasena, rol, activo } = req.body;

    // Buscar el usuario
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return ResponseHandler.error(res, 'Usuario no encontrado', 404);
    }

    // Verificar si el correo ya está en uso por otro usuario
    if (correo && correo !== usuario.correo) {
      const existeEmail = await Usuario.findOne({
        where: {
          correo,
          id: { [Op.ne]: id }
        }
      });

      if (existeEmail) {
        return ResponseHandler.error(res, 'El correo electrónico ya está en uso por otro usuario', 400);
      }
    }

    // Verificar si el rol es válido
    if (rol) {
      const rolesValidos = ['docente', 'verificador', 'administrador'];
      if (!rolesValidos.includes(rol)) {
        return ResponseHandler.error(res, 'El rol especificado no es válido', 400);
      }
    }

    // Actualizar los campos del usuario
    const datosActualizacion = {};
    
    if (nombres) datosActualizacion.nombres = nombres;
    if (apellidos) datosActualizacion.apellidos = apellidos;
    if (correo) datosActualizacion.correo = correo;
    if (contrasena) datosActualizacion.contrasena = contrasena; // El hash se maneja en el hook beforeUpdate
    if (activo !== undefined) datosActualizacion.activo = activo;

    await usuario.update(datosActualizacion);

    // Actualizar el rol si se ha especificado
    if (rol) {
      // Buscar si ya tiene este rol asignado y activo
      const rolExistente = await UsuarioRol.findOne({
        where: {
          usuario_id: id,
          rol,
          activo: true
        }
      });
      
      // Si no tiene este rol, crear una nueva asignación
      if (!rolExistente) {
        // Desactivar roles anteriores si es necesario
        await UsuarioRol.update(
          { activo: false },
          { where: { usuario_id: id, activo: true } }
        );
        
        // Crear el nuevo rol
        await UsuarioRol.create({
          usuario_id: id,
          rol,
          activo: true,
          asignado_por: req.usuario.id
        });
      }
    }

    // Obtener el usuario actualizado sin la contraseña
    const usuarioActualizado = await Usuario.findByPk(usuario.id, {
      attributes: { exclude: ['contrasena'] },
      include: [
        {
          model: UsuarioRol,
          as: 'rolesAsignados',
          where: { activo: true },
          required: false
        }
      ]
    });

    return ResponseHandler.success(res, usuarioActualizado, 'Usuario actualizado exitosamente');

  } catch (error) {
    logger.error('Error al actualizar usuario:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Obtener roles disponibles para el usuario actual
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerRolesUsuario = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    // Buscar todos los roles asignados al usuario
    const rolesUsuario = await UsuarioRol.findAll({
      where: { usuario_id: usuarioId, activo: true },
      attributes: ['id', 'rol', 'activo', 'asignado_en']
    });

    return ResponseHandler.success(res, rolesUsuario, 'Roles obtenidos correctamente');

  } catch (error) {
    logger.error('Error al obtener roles del usuario:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Eliminar un usuario (solo administradores)
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir eliminar al propio usuario
    if (parseInt(id) === req.usuario.id) {
      return ResponseHandler.error(res, 'No puedes eliminar tu propia cuenta', 400);
    }

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return ResponseHandler.error(res, 'Usuario no encontrado', 404);
    }

    await usuario.destroy();

    return ResponseHandler.success(res, null, 'Usuario eliminado exitosamente');

  } catch (error) {
    logger.error('Error al eliminar usuario:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Actualizar perfil del usuario actual
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.actualizarPerfil = async (req, res) => {
  try {
    const { nombres, apellidos, correo, contrasena, nuevaPassword } = req.body;
    const usuarioId = req.usuario.id;

    // Buscar el usuario
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return ResponseHandler.error(res, 'Usuario no encontrado', 404);
    }

    // Verificar contraseña actual si se está cambiando la contraseña
    if (nuevaPassword) {
      const esValida = await usuario.validarPassword(contrasena);
      if (!esValida) {
        return ResponseHandler.error(res, 'La contraseña actual es incorrecta', 400);
      }
    }

    // Verificar si el correo ya está en uso por otro usuario
    if (correo && correo !== usuario.correo) {
      const existeEmail = await Usuario.findOne({
        where: {
          correo,
          id: { [Op.ne]: usuarioId }
        }
      });

      if (existeEmail) {
        return ResponseHandler.error(res, 'El correo electrónico ya está en uso por otro usuario', 400);
      }
    }

    // Actualizar los campos
    const datosActualizacion = {};
    if (nombres) datosActualizacion.nombres = nombres;
    if (apellidos) datosActualizacion.apellidos = apellidos;
    if (correo) datosActualizacion.correo = correo;
    if (nuevaPassword) datosActualizacion.contrasena = nuevaPassword; // El hash se maneja en el hook beforeUpdate

    await usuario.update(datosActualizacion);

    // Obtener el usuario actualizado sin la contraseña
    const usuarioActualizado = await Usuario.findByPk(usuario.id, {
      attributes: { exclude: ['contrasena'] },
      include: [
        {
          model: UsuarioRol,
          as: 'rolesAsignados',
          where: { activo: true },
          required: false
        }
      ]
    });

    return ResponseHandler.success(res, usuarioActualizado, 'Perfil actualizado exitosamente');

  } catch (error) {
    logger.error('Error al actualizar perfil:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Obtener usuarios por rol
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerUsuariosPorRol = async (req, res) => {
  try {
    const { rol } = req.params;
    
    // Verificar que el rol sea válido
    const rolesValidos = ['docente', 'verificador', 'administrador'];
    if (!rolesValidos.includes(rol)) {
      return ResponseHandler.error(res, 'El rol especificado no es válido', 400);
    }

    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['contrasena'] },
      include: [
        {
          model: UsuarioRol,
          as: 'roles',
          where: { 
            rol: rol,
            activo: true 
          },
          required: true
        }
      ],
      where: { activo: true },
      order: [['apellidos', 'ASC'], ['nombres', 'ASC']]
    });

    return ResponseHandler.success(res, usuarios, `Usuarios con rol ${rol} obtenidos correctamente`);

  } catch (error) {
    logger.error('Error al obtener usuarios por rol:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Asignar verificador a docente
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.asignarVerificador = async (req, res) => {
  try {
    const { docenteId, verificadorId } = req.params;

    // Verificar que el docente existe y tiene rol de docente
    const docente = await Usuario.findByPk(docenteId, {
      include: [
        {
          model: UsuarioRol,
          as: 'roles',
          where: { 
            rol: 'docente',
            activo: true 
          },
          required: true
        }
      ]
    });

    if (!docente) {
      return ResponseHandler.error(res, 'Docente no encontrado o no tiene rol de docente activo', 404);
    }

    // Verificar que el verificador existe y tiene rol de verificador
    const verificador = await Usuario.findByPk(verificadorId, {
      include: [
        {
          model: UsuarioRol,
          as: 'roles',
          where: { 
            rol: 'verificador',
            activo: true 
          },
          required: true
        }
      ]
    });

    if (!verificador) {
      return ResponseHandler.error(res, 'Verificador no encontrado o no tiene rol de verificador activo', 404);
    }

    // Obtener el ciclo académico activo
    const cicloActivo = await CicloAcademico.findOne({
      where: { activo: true },
      order: [['creado_en', 'DESC']],
      attributes: {
        exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
      }
    });

    if (!cicloActivo) {
      return ResponseHandler.error(res, 'No hay un ciclo académico activo para realizar la asignación', 400);
    }

    // Verificar si ya existe una asignación activa para este ciclo
    const asignacionExistente = await VerificadorDocente.findOne({
      where: {
        docente_id: docenteId,
        verificador_id: verificadorId,
        ciclo_id: cicloActivo.id,
        activo: true
      }
    });

    if (asignacionExistente) {
      return ResponseHandler.error(res, 'El verificador ya está asignado a este docente en el ciclo actual', 400);
    }

    // Crear la relación docente-verificador
    const nuevaAsignacion = await VerificadorDocente.create({
      docente_id: docenteId,
      verificador_id: verificadorId,
      ciclo_id: cicloActivo.id,
      asignado_por: req.usuario.id,
      activo: true
    });

    const resultado = {
      asignacion: nuevaAsignacion,
      docente: {
        id: docente.id,
        nombres: docente.nombres,
        apellidos: docente.apellidos
      },
      verificador: {
        id: verificador.id,
        nombres: verificador.nombres,
        apellidos: verificador.apellidos
      },
      ciclo: {
        id: cicloActivo.id,
        nombre: cicloActivo.nombre
      }
    };

    return ResponseHandler.success(res, resultado, `Verificador ${verificador.nombres} ${verificador.apellidos} asignado correctamente al docente ${docente.nombres} ${docente.apellidos}`);

  } catch (error) {
    logger.error('Error al asignar verificador:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Obtener asignaciones de verificadores
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerAsignacionesVerificadores = async (req, res) => {
  try {
    const { cicloId } = req.query;
    
    const whereClause = { activo: true };
    if (cicloId) {
      whereClause.ciclo_id = cicloId;
    }

    const asignaciones = await VerificadorDocente.findAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'verificador',
          attributes: ['id', 'nombres', 'apellidos', 'correo']
        },
        {
          model: Usuario,
          as: 'docente',
          attributes: ['id', 'nombres', 'apellidos', 'correo']
        },
        {
          model: CicloAcademico,
          as: 'ciclo',
          attributes: {
            include: ['id', 'nombre', 'activo'],
            exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
          }
        },
        {
          model: Usuario,
          as: 'asignador',
          attributes: ['id', 'nombres', 'apellidos']
        }
      ],
      order: [['fecha_asignacion', 'DESC']]
    });

    return ResponseHandler.success(res, asignaciones, 'Asignaciones de verificadores obtenidas correctamente');

  } catch (error) {
    logger.error('Error al obtener asignaciones de verificadores:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Obtener estadísticas de usuarios
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerEstadisticasUsuarios = async (req, res) => {
  try {
    const cicloId = req.query.ciclo || req.query.cicloId;
    
    // Obtener estadísticas reales de la base de datos
    const [totalUsuarios, verificadores, administradores, docentes] = await Promise.all([
      Usuario.count({ where: { activo: true } }),
      UsuarioRol.count({ where: { rol: 'verificador', activo: true } }),
      UsuarioRol.count({ where: { rol: 'administrador', activo: true } }),
      UsuarioRol.count({ where: { rol: 'docente', activo: true } })
    ]);

    // Calcular porcentaje de usuarios activos
    const porcentajeActivos = totalUsuarios > 0 ? Math.round((totalUsuarios / totalUsuarios) * 100) : 0;

    const estadisticas = {
      totalUsuarios,
      usuariosActivos: totalUsuarios,
      verificadores,
      administradores,
      docentes,
      porcentajeActivos
    };

    return ResponseHandler.success(res, estadisticas, 'Estadísticas de usuarios obtenidas correctamente');

  } catch (error) {
    logger.error('Error al obtener estadísticas de usuarios:', error);
    
    // Retornar datos por defecto en caso de error
    const estadisticasPorDefecto = {
      totalUsuarios: 0,
      usuariosActivos: 0,
      verificadores: 0,
      administradores: 0,
      docentes: 0,
      porcentajeActivos: 0
    };
    
    return ResponseHandler.success(res, estadisticasPorDefecto, 'Estadísticas de usuarios obtenidas');
  }
};
