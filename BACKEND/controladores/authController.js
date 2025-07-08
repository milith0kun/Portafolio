const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Usuario, UsuarioRol } = require('../modelos');
const { Op } = require('sequelize');
const config = require('../config/env');

// Añadir logs para depuración
// Módulos cargados correctamente

/**
 * Genera un token JWT con la información del usuario y su rol actual
 * @param {Object} usuario - Objeto usuario con sus datos
 * @param {String} rolActual - Rol actual seleccionado por el usuario
 * @returns {String} Token JWT
 */
const generarToken = (usuario, rolActual) => {
  return jwt.sign(
    {
      id: usuario.id,
      correo: usuario.correo,
      rol: rolActual,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
};

/**
 * Controlador para el inicio de sesión
 * Adaptado al nuevo esquema de base de datos
 */
exports.login = async (req, res) => {
  try {
    // Intento de login recibido
    
    // Extraer email y password del cuerpo de la solicitud
    // Asegurarnos de que estamos extrayendo correctamente los campos
    const email = req.body.email || req.body.correo;
    const password = req.body.password || req.body.contrasena;
    
    // Email extraído y password validado

    // Validar que se proporcionen email y contraseña
    if (!email || !password) {
      // Error: Falta email o password
      return res.status(400).json({
        mensaje: 'Por favor, proporcione email y contraseña',
        error: true
      });
    }

    // Buscar usuario por correo electrónico
    // Buscando usuario por correo
    const usuario = await Usuario.findOne({
      where: { correo: email }
    });

    // Verificar si el usuario existe
    if (!usuario) {
      // Usuario no encontrado
      return res.status(401).json({
        mensaje: 'Credenciales inválidas',
        error: true
      });
    }

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      // Usuario desactivado
      return res.status(403).json({
        mensaje: 'Cuenta desactivada. Contacte al administrador.',
        error: true
      });
    }

    // Verificar contraseña usando el método del modelo
    const esPasswordValido = await usuario.validarPassword(password);
    // Validación de contraseña
    
    if (!esPasswordValido) {
      // Contraseña inválida
      return res.status(401).json({
        mensaje: 'Credenciales inválidas',
        error: true
      });
    }

    // Verificando roles del usuario
    
    // Obtener los roles del usuario
    const rolesUsuario = await UsuarioRol.findAll({
      where: { 
        usuario_id: usuario.id,
        activo: true
      }
    });
    
    // Roles encontrados

    // Verificar si el usuario tiene al menos un rol asignado
    if (!rolesUsuario || rolesUsuario.length === 0) {
      // Usuario sin roles asignados
      return res.status(403).json({
        mensaje: 'No tiene permisos para acceder al sistema',
        error: true
      });
    }
    
    // Roles asignados verificados

    // Actualizar último acceso
    usuario.ultimo_acceso = new Date();
    await usuario.save();

    // Mapear los roles para la respuesta (simplificado para evitar errores)
    const roles = [];
    for (const ur of rolesUsuario) {
      roles.push({
        id: ur.id,
        rol: ur.rol,
        asignado_por: ur.asignado_por
      });
    }

    // Si solo hay un rol, lo seleccionamos automáticamente
    const rolActual = roles.length === 1 ? roles[0].rol : null;
    // Rol actual seleccionado
    
    // Generar token JWT con el rol actual (si solo hay uno)
    const token = generarToken(usuario, rolActual);
    
    // Preparar objeto de usuario para la respuesta
    const usuarioRespuesta = {
      id: usuario.id,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      roles: roles,
      rolActual: rolActual
    };

    // Enviar respuesta exitosa
    return res.status(200).json({
      mensaje: 'Inicio de sesión exitoso',
      error: false,
      token,
      usuario: usuarioRespuesta,
      tieneMultiplesRoles: roles.length > 1
    });
  } catch (error) {
    // Error en el controlador de login
    return res.status(500).json({
      mensaje: 'Error en el servidor al iniciar sesión',
      error: true,
      detalles: error.message
    });
  }
};

// Controlador para cerrar sesión (manejo en el frontend)
exports.logout = (req, res) => {
  // En JWT, el cierre de sesión se maneja en el cliente eliminando el token
  res.status(200).json({
    mensaje: 'Sesión cerrada correctamente',
    error: false
  });
};

// Obtener información del usuario autenticado
exports.getUsuarioActual = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
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
        mensaje: 'Usuario no encontrado',
        error: true
      });
    }

    res.status(200).json({
      success: true,
      usuario,
      error: false
    });

  } catch (error) {
    
    res.status(500).json({
      mensaje: 'Error al obtener información del usuario',
      error: error.message
    });
  }
};

// Cambiar de rol (para usuarios con múltiples roles)
exports.cambiarRol = async (req, res) => {
  try {
    const { rolId, rolNombre } = req.body;
    const usuarioId = req.usuario.id;

    // Procesando cambio de rol

    // Aceptar tanto rolId como rolNombre para compatibilidad
    let rolUsuario;
    
    if (rolId) {
      // Buscar por ID
      rolUsuario = await UsuarioRol.findOne({
        where: {
          id: rolId,
          usuario_id: usuarioId,
          activo: true
        }
      });
    } else if (rolNombre) {
      // Buscar por nombre
      rolUsuario = await UsuarioRol.findOne({
        where: {
          usuario_id: usuarioId,
          rol: rolNombre,
          activo: true
        }
      });
    } else {
      return res.status(400).json({
        mensaje: 'Se requiere especificar el rolId o rolNombre',
        error: true
      });
    }

    if (!rolUsuario) {
      return res.status(404).json({
        mensaje: 'No tiene asignado el rol solicitado o no está activo',
        error: true
      });
    }

    // Rol encontrado

    // Obtener el usuario con sus roles asignados
    const usuario = await Usuario.findByPk(usuarioId, {
      attributes: { exclude: ['contrasena'] }
    });

    // Obtener todos los roles del usuario para la respuesta
    const rolesUsuario = await UsuarioRol.findAll({
      where: {
        usuario_id: usuarioId,
        activo: true
      }
    });

    // Generar nuevo token con el rol seleccionado
    const token = generarToken(usuario, rolUsuario.rol);

    // Mapear los roles para la respuesta
    const roles = rolesUsuario.map(ur => ({
      id: ur.id,
      rol: ur.rol,
      asignado_por: ur.asignado_por
    }));

    // Preparar objeto de usuario para la respuesta
    const usuarioRespuesta = {
      id: usuario.id,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      correo: usuario.correo,
      roles: roles,
      rolActual: rolUsuario.rol
    };

    // Token generado exitosamente

    res.status(200).json({
      mensaje: 'Rol cambiado exitosamente',
      token,
      usuario: usuarioRespuesta,
      error: false
    });

  } catch (error) {

    res.status(500).json({
      mensaje: 'Error al cambiar de rol',
      error: true,
      detalles: error.message
    });
  }
};

// Verificar el token y estado de sesión
exports.verificarToken = async (req, res) => {
  try {
    // El middleware ya verificó el token y agregó req.usuario
    if (!req.usuario) {
      return res.status(401).json({
        mensaje: 'Token inválido',
        error: true
      });
    }

    // Verificar que el usuario existe y está activo
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: { exclude: ['contrasena'] }
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        mensaje: 'Usuario no encontrado o inactivo',
        error: true
      });
    }

    // Obtener roles actuales
    const rolesUsuario = await UsuarioRol.findAll({
      where: {
        usuario_id: usuario.id,
        activo: true
      }
    });

    const roles = rolesUsuario.map(ur => ({
      id: ur.id,
      rol: ur.rol,
      asignado_por: ur.asignado_por
    }));

    res.status(200).json({
      mensaje: 'Token válido',
      error: false,
      usuario: {
        id: usuario.id,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        roles: roles,
        rolActual: req.usuario.rol
      }
    });

  } catch (error) {

    res.status(500).json({
      mensaje: 'Error al verificar token',
      error: true,
      detalles: error.message
    });
  }
};

// Renovar token
exports.renovarToken = async (req, res) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({
        mensaje: 'Token inválido',
        error: true
      });
    }

    // Obtener usuario completo
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: { exclude: ['contrasena'] }
    });

    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        mensaje: 'Usuario no encontrado o inactivo',
        error: true
      });
    }

    // Generar nuevo token con el mismo rol
    const nuevoToken = generarToken(usuario, req.usuario.rol);

    res.status(200).json({
      mensaje: 'Token renovado exitosamente',
      error: false,
      token: nuevoToken
    });

  } catch (error) {

    res.status(500).json({
      mensaje: 'Error al renovar token',
      error: true,
      detalles: error.message
    });
  }
};
