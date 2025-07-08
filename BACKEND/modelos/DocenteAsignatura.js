const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocenteAsignatura = sequelize.define('DocenteAsignatura', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    docente_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    asignatura_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'asignaturas',
            key: 'id'
        }
    },
    ciclo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'ciclos_academicos',
            key: 'id'
        }
    },
    grupo: {
        type: DataTypes.STRING(10),
        defaultValue: 'A',
        validate: {
            len: [1, 10]
        }
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    asignado_por: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    }
}, {
    tableName: 'docentes_asignaturas',
    timestamps: true,
    paranoid: false,
    createdAt: 'fecha_asignacion',
    updatedAt: false,
    indexes: [
        {
            name: 'idx_docente_ciclo',
            fields: ['docente_id', 'ciclo_id']
        },
        {
            name: 'idx_asignatura_ciclo',
            fields: ['asignatura_id', 'ciclo_id']
        },
        {
            name: 'unique_docente_asignatura_ciclo_grupo',
            unique: true,
            fields: ['docente_id', 'asignatura_id', 'ciclo_id', 'grupo']
        }
    ]
});

module.exports = DocenteAsignatura; 