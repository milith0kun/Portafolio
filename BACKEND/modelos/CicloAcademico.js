const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Modelo de Ciclo Académico según el esquema SQL
 * Tabla: ciclos_academicos
 */
const CicloAcademico = sequelize.define('CicloAcademico', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM('preparacion', 'inicializacion', 'activo', 'verificacion', 'finalizacion', 'archivado'),
    defaultValue: 'preparacion',
    comment: 'Estados del ciclo: preparacion->inicializacion->activo->verificacion->finalizacion->archivado'
  },
  fecha_inicio: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  fecha_fin: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  fecha_cierre_real: {
    type: DataTypes.DATE,
    allowNull: true
  },
  semestre_actual: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  anio_actual: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  creado_por: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  cerrado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  // Columnas temporalmente comentadas hasta resolver migración
  // fecha_inicializacion: {
  //   type: DataTypes.DATE,
  //   allowNull: true,
  //   comment: 'Fecha cuando el ciclo pasa a estado inicializacion'
  // },
  // fecha_activacion: {
  //   type: DataTypes.DATE,
  //   allowNull: true,
  //   comment: 'Fecha cuando el ciclo pasa a estado activo'
  // },
  // fecha_inicio_verificacion: {
  //   type: DataTypes.DATE,
  //   allowNull: true,
  //   comment: 'Fecha cuando el ciclo pasa a estado verificacion'
  // },
  configuracion: {
    type: DataTypes.JSON,
    allowNull: true
  },
  configuracion_estados: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      "inicializacion": {
        "descripcion": "Configuración inicial del ciclo académico",
        "modulos_requeridos": ["carga_datos"],
        "validaciones": ["estructura_portafolio", "configuracion_basica"]
      },
      "activo": {
        "descripcion": "Ciclo en funcionamiento normal",
        "modulos_requeridos": ["carga_datos", "gestion_documentos"],
        "validaciones": ["datos_completos", "estructura_validada"]
      },
      "verificacion": {
        "descripcion": "Proceso de verificación y validación",
        "modulos_requeridos": ["verificacion"],
        "validaciones": ["portafolios_completos", "documentos_validados"]
      },
      "finalizacion": {
        "descripcion": "Ciclo finalizado y cerrado",
        "modulos_requeridos": ["reportes"],
        "validaciones": ["verificacion_completa", "reportes_generados"]
      }
    },
    comment: 'Configuración específica para cada estado del ciclo'
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
  tableName: 'ciclos_academicos',
  timestamps: false,
  indexes: [
    {
      fields: ['estado'],
      name: 'idx_estado'
    },
    {
      fields: ['fecha_inicio'],
      name: 'idx_fecha_inicio'
    },
    {
      fields: ['semestre_actual', 'anio_actual'],
      name: 'idx_semestre_anio'
    }
  ]
});

/**
 * Métodos de instancia para manejar estados del ciclo
 */
CicloAcademico.prototype.puedeRecibirArchivos = function() {
  return ['preparacion', 'inicializacion'].includes(this.estado);
};

CicloAcademico.prototype.estaEnVerificacion = function() {
  return this.estado === 'verificacion';
};

CicloAcademico.prototype.puedeSerActivado = function() {
  return this.estado === 'preparacion';
};

CicloAcademico.prototype.puedeSerFinalizado = function() {
  return this.estado === 'verificacion';
};

/**
 * Métodos de clase para consultas específicas
 */
CicloAcademico.obtenerCicloActivo = async function() {
  return await this.findOne({
    where: { estado: 'activo' },
    attributes: {
      exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
    }
  });
};

CicloAcademico.obtenerCicloEnVerificacion = async function() {
  return await this.findOne({
    where: { estado: 'verificacion' },
    attributes: {
      exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
    }
  });
};

CicloAcademico.obtenerCiclosEnPreparacion = async function() {
  return await this.findAll({
    where: { estado: 'preparacion' },
    order: [['fecha_inicio', 'ASC']],
    attributes: {
      exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
    }
  });
};

CicloAcademico.obtenerCiclosFinalizados = async function() {
  return await this.findAll({
    where: { estado: 'finalizacion' },
    order: [['fecha_fin', 'DESC']],
    attributes: {
      exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
    }
  });
};

/**
 * Transiciones de estado con manejo automático de fechas
 */
CicloAcademico.prototype.iniciarInicializacion = async function() {
  if (this.estado !== 'preparacion') {
    throw new Error('Solo se puede inicializar un ciclo en preparación');
  }
  this.estado = 'inicializacion';
  // this.fecha_inicializacion = new Date(); // Comentado temporalmente
  return await this.save();
};

CicloAcademico.prototype.activar = async function() {
  if (this.estado !== 'inicializacion') {
    throw new Error('Solo se puede activar un ciclo después de la inicialización');
  }
  
  // Verificar que no haya otro ciclo activo
  const cicloActivo = await CicloAcademico.obtenerCicloActivo();
  if (cicloActivo && cicloActivo.id !== this.id) {
    throw new Error('Solo puede haber un ciclo activo a la vez');
  }
  
  this.estado = 'activo';
  // this.fecha_activacion = new Date(); // Comentado temporalmente
  return await this.save();
};

CicloAcademico.prototype.iniciarVerificacion = async function() {
  if (this.estado !== 'activo') {
    throw new Error('Solo se puede iniciar verificación de un ciclo activo');
  }
  
  // Verificar que no haya otro ciclo en verificación
  const cicloEnVerificacion = await CicloAcademico.obtenerCicloEnVerificacion();
  if (cicloEnVerificacion && cicloEnVerificacion.id !== this.id) {
    throw new Error('Solo puede haber un ciclo en verificación a la vez');
  }
  
  this.estado = 'verificacion';
  // this.fecha_inicio_verificacion = new Date(); // Comentado temporalmente
  return await this.save();
};

CicloAcademico.prototype.finalizar = async function() {
  if (this.estado !== 'verificacion') {
    throw new Error('Solo se puede finalizar un ciclo en verificación');
  }
  this.estado = 'finalizacion';
  this.fecha_cierre_real = new Date();
  return await this.save();
};

/**
 * Cambiar estado del ciclo con validaciones y fechas automáticas
 */
CicloAcademico.prototype.cambiarEstado = async function(nuevoEstado, usuarioId = null) {
  const estadoActual = this.estado;
  
  // Validar transiciones permitidas
  const transicionesValidas = {
    'preparacion': ['inicializacion'],
    'inicializacion': ['activo', 'preparacion'],
    'activo': ['verificacion', 'preparacion'],
    'verificacion': ['finalizacion', 'activo'],
    'finalizacion': ['archivado'],
    'archivado': ['preparacion']
  };
  
  if (!transicionesValidas[estadoActual]?.includes(nuevoEstado)) {
    throw new Error(`Transición no válida de '${estadoActual}' a '${nuevoEstado}'`);
  }
  
  // Validaciones específicas por estado
  switch (nuevoEstado) {
    case 'activo':
      const cicloActivo = await CicloAcademico.obtenerCicloActivo();
      if (cicloActivo && cicloActivo.id !== this.id) {
        throw new Error('Solo puede haber un ciclo activo a la vez');
      }
      // this.fecha_activacion = new Date(); // Comentado temporalmente
      break;
      
    case 'inicializacion':
      // this.fecha_inicializacion = new Date(); // Comentado temporalmente
      break;
      
    case 'verificacion':
      const cicloEnVerificacion = await CicloAcademico.obtenerCicloEnVerificacion();
      if (cicloEnVerificacion && cicloEnVerificacion.id !== this.id) {
        throw new Error('Solo puede haber un ciclo en verificación a la vez');
      }
      // this.fecha_inicio_verificacion = new Date(); // Comentado temporalmente
      break;
      
    case 'finalizacion':
      this.fecha_cierre_real = new Date();
      if (usuarioId) {
        this.cerrado_por = usuarioId;
      }
      break;
  }
  
  this.estado = nuevoEstado;
  return await this.save();
};

module.exports = CicloAcademico;
