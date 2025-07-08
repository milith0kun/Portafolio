const { Usuario, UsuarioRol, VerificadorDocente, CicloAcademico } = require('../modelos');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// Obtener todos los usuarios (solo administradores)
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

    res.status(200).json({
      success: true,
      data: rows,
      meta: {
        total: count,
        totalPaginas: Math.ceil(count / limite),
        paginaActual: parseInt(pagina),
        limite: parseInt(limite)
      },
      message: 'Usuarios obtenidos correctamente'
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de usuarios',
      error: error.message
    });
  }
};

// Obtener un usuario por ID
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
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      data: usuario,
      message: 'Usuario obtenido correctamente'
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener el usuario',
      error: error.message
    });
  }
};

// Crear un nuevo usuario (solo administradores)
exports.crearUsuario = async (req, res) => {
  try {
    const { nombres, apellidos, correo, contrasena, rol, activo = true } = req.body;

    // Validar que el correo no esté en uso
    const existeUsuario = await Usuario.findOne({ where: { correo } });
    if (existeUsuario) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está en uso'
      });
    }

    // Verificar que el rol sea válido
    const rolesValidos = ['docente', 'verificador', 'administrador'];
    if (rol && !rolesValidos.includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'El rol especificado no es válido'
      });
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

    res.status(201).json({
      success: true,
      data: usuarioCreado,
      message: 'Usuario creado exitosamente'
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al crear el usuario',
      error: error.message
    });
  }
};

// Actualizar un usuario existente
exports.actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, apellidos, correo, contrasena, rol, activo } = req.body;

    // Buscar el usuario
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
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
        return res.status(400).json({
          success: false,
          message: 'El correo electrónico ya está en uso por otro usuario'
        });
      }
    }

    // Verificar si el rol es válido
    if (rol) {
      const rolesValidos = ['docente', 'verificador', 'administrador'];
      if (!rolesValidos.includes(rol)) {
        return res.status(400).json({
          success: false,
          message: 'El rol especificado no es válido'
        });
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

    res.status(200).json({
      success: true,
      data: usuarioActualizado,
      message: 'Usuario actualizado exitosamente'
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al actualizar el usuario',
      error: error.message
    });
  }
};

// Obtener roles disponibles para el usuario actual
exports.obtenerRolesUsuario = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    // Buscar todos los roles asignados al usuario
    const rolesUsuario = await UsuarioRol.findAll({
      where: { usuario_id: usuarioId },
      include: [
        {
          model: UsuarioRol,
          as: 'rolesAsignados',
          attributes: ['id', 'rol']
        }
      ]
    });

    // Extraer solo la información de los roles
    const roles = rolesUsuario.map(ur => ur.rolesAsignados);

    res.status(200).json({
      success: true,
      data: roles,
      message: 'Roles obtenidos correctamente'
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener los roles del usuario',
      error: error.message
    });
  }
};

// Eliminar un usuario (solo administradores)
exports.eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir eliminar al propio usuario
    if (parseInt(id) === req.usuario.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await usuario.destroy();

    res.status(200).json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al eliminar el usuario',
      error: error.message
    });
  }
};

// Actualizar perfil del usuario actual
exports.actualizarPerfil = async (req, res) => {
  try {
    const { nombres, apellidos, correo, contrasena, nuevaPassword } = req.body;
    const usuarioId = req.usuario.id;

    // Buscar el usuario
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return res.status(404).json({
        mensaje: 'Usuario no encontrado',
        error: true
      });
    }

    // Verificar contraseña actual si se está cambiando la contraseña
    if (nuevaPassword) {
      const esValida = await usuario.validarPassword(contrasena);
      if (!esValida) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña actual es incorrecta'
        });
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
        return res.status(400).json({
          success: false,
          message: 'El correo electrónico ya está en uso por otro usuario'
        });
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

    res.status(200).json({
      success: true,
      data: usuarioActualizado,
      message: 'Perfil actualizado exitosamente'
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al actualizar el perfil',
      error: error.message
    });
  }
};

// Obtener usuarios por rol
exports.obtenerUsuariosPorRol = async (req, res) => {
  try {
    const { rol } = req.params;
    
    // Verificar que el rol sea válido
    const rolesValidos = ['docente', 'verificador', 'administrador'];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({
        success: false,
        message: 'El rol especificado no es válido'
      });
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

    res.status(200).json({
      success: true,
      data: usuarios,
      message: `Usuarios con rol ${rol} obtenidos correctamente`
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener los usuarios',
      error: error.message
    });
  }
};

// Asignar verificador a docente
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
      return res.status(404).json({
        success: false,
        message: 'Docente no encontrado o no tiene rol de docente activo'
      });
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
      return res.status(404).json({
        success: false,
        message: 'Verificador no encontrado o no tiene rol de verificador activo'
      });
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
      return res.status(400).json({
        success: false,
        message: 'No hay un ciclo académico activo para realizar la asignación'
      });
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
      return res.status(400).json({
        success: false,
        message: 'El verificador ya está asignado a este docente en el ciclo actual'
      });
    }

    // Crear la relación docente-verificador
    const nuevaAsignacion = await VerificadorDocente.create({
      docente_id: docenteId,
      verificador_id: verificadorId,
      ciclo_id: cicloActivo.id,
      asignado_por: req.usuario.id,
      activo: true
    });

    // Asignación creada exitosamente

    res.status(200).json({
      success: true,
      message: `Verificador ${verificador.nombres} ${verificador.apellidos} asignado correctamente al docente ${docente.nombres} ${docente.apellidos}`,
      data: {
        docente: {
          id: docente.id,
          nombres: docente.nombres,
          apellidos: docente.apellidos
        },
        verificador: {
          id: verificador.id,
          nombres: verificador.nombres,
          apellidos: verificador.apellidos
        }
      }
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al asignar el verificador',
      error: error.message
    });
  }
};

// Obtener asignaciones de verificadores
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

    res.status(200).json({
      success: true,
      data: asignaciones,
      message: 'Asignaciones de verificadores obtenidas correctamente'
    });

  } catch (error) {
        res.status(500).json({
      success: false,
      message: 'Error al obtener las asignaciones de verificadores',
      error: error.message
    });
  }
};

// Obtener estadísticas de usuarios
exports.obtenerEstadisticasUsuarios = async (req, res) => {
  try {
    const cicloId = req.query.ciclo || req.query.cicloId;
    
    // 1. Total de usuarios activos
    const totalUsuarios = await Usuario.count({
      where: { activo: true }
    });

    // 2. Usuarios activos (mismo que total por ahora)
    const usuariosActivos = totalUsuarios;

    // 3. Contar usuarios por rol usando consultas más simples
    let verificadores = 0;
    let administradores = 0;
    let docentes = 0;

    try {
      verificadores = await UsuarioRol.count({
      where: { 
        rol: 'verificador',
        activo: true 
        }
      });
    } catch (error) {
      verificadores = 0;
    }

    try {
      administradores = await UsuarioRol.count({
      where: { 
        rol: 'administrador',
        activo: true 
        }
      });
    } catch (error) {
      administradores = 0;
    }

    try {
      docentes = await UsuarioRol.count({
      where: { 
        rol: 'docente',
        activo: true 
        }
      });
    } catch (error) {
      docentes = 0;
    }

    // 4. Calcular porcentaje de usuarios activos
    const porcentajeActivos = totalUsuarios > 0 ? Math.round((usuariosActivos / totalUsuarios) * 100) : 0;

    const estadisticas = {
        totalUsuarios,
        usuariosActivos,
        verificadores,
        administradores,
        docentes,
      porcentajeActivos
    };

    res.status(200).json({
      success: true,
      data: estadisticas,
      message: 'Estadísticas de usuarios obtenidas correctamente'
    });

  } catch (error) {
    
    
    // Retornar datos por defecto en caso de error
    const estadisticasPorDefecto = {
        totalUsuarios: 0,
        usuariosActivos: 0,
        verificadores: 0,
        administradores: 0,
        docentes: 0,
        porcentajeActivos: 0
    };
    
    res.status(200).json({
      success: true,
      data: estadisticasPorDefecto,
      message: 'Estadísticas de usuarios obtenidas'
    });
  }
};
