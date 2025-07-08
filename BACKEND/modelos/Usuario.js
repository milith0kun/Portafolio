const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

/**
 * Modelo de Usuario adaptado al esquema SQL definitivo
 * Tabla: usuarios
 */
const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombres: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  apellidos: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  correo: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  contrasena: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  ultimo_acceso: {
    type: DataTypes.DATE,
    allowNull: true
  },
  token_recuperacion: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  expiracion_token: {
    type: DataTypes.DATE,
    allowNull: true
  },
  creado_en: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  actualizado_en: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'usuarios',
  timestamps: false, // Usamos nuestros propios campos de timestamp
  hooks: {
    beforeCreate: async (usuario) => {
      if (usuario.contrasena) {
        const salt = await bcrypt.genSalt(10);
        usuario.contrasena = await bcrypt.hash(usuario.contrasena, salt);
      }
    },
    beforeUpdate: async (usuario) => {
      if (usuario.changed('contrasena')) {
        const salt = await bcrypt.genSalt(10);
        usuario.contrasena = await bcrypt.hash(usuario.contrasena, salt);
      }
    }
  }
});

// Método para comparar contraseñas
Usuario.prototype.validarPassword = async function(password) {
  try {
    // Convertir hash de PHP ($2y$) a formato bcrypt ($2b$) si es necesario
    let hashToCompare = this.contrasena;
    if (hashToCompare.startsWith('$2y$')) {
      hashToCompare = hashToCompare.replace('$2y$', '$2b$');
    }
    
    return await bcrypt.compare(password, hashToCompare);
  } catch (error) {
    console.error('Error al validar contraseña:', error);
    return false;
  }
};

// Las relaciones se definirán en el archivo asociaciones.js

module.exports = Usuario;
