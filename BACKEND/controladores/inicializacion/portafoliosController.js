/**
 * Controlador de Portafolios para Inicialización
 * Maneja la creación automática de portafolios durante la inicialización del sistema
 */

const { sequelize } = require('../../config/database');
const { Op } = require('sequelize');
const { 
  DocenteAsignatura, 
  Portafolio, 
  Usuario, 
  Asignatura, 
  CicloAcademico,
  Semestre
} = require('../../modelos');
const { info, error: logError } = require('../../config/logger');

/**
 * Crear portafolios automáticamente para todas las asignaciones docente-asignatura
 * Esta función se ejecuta durante la inicialización del sistema
 */
const crearPortafoliosAutomaticos = async (cicloId = null) => {
  const transaction = await sequelize.transaction();
  
  try {
    info('Iniciando creación automática de portafolios');

    // Obtener ciclo académico activo si no se especifica
    let cicloActivo;
    if (cicloId) {
      cicloActivo = await CicloAcademico.findByPk(cicloId, { 
        attributes: ['id', 'nombre'],
        transaction 
      });
    } else {
      cicloActivo = await CicloAcademico.findOne({
        where: { estado: 'activo' },
        attributes: ['id', 'nombre'],
        transaction
      });
    }

    if (!cicloActivo) {
      throw new Error('No hay ciclo académico activo disponible');
    }

    info(`Usando ciclo académico: ${cicloActivo.nombre}`);

    // Obtener todas las asignaciones docente-asignatura del ciclo
    const asignaciones = await DocenteAsignatura.findAll({
      where: { 
        ciclo_id: cicloActivo.id,
        activo: true 
      },
      include: [
        {
          model: Usuario,
          as: 'docente',
          attributes: ['id', 'nombres', 'apellidos']
        },
        {
          model: Asignatura,
          as: 'asignatura',
          attributes: ['id', 'codigo', 'nombre', 'semestre']
        }
      ],
      transaction
    });

    info(`Encontradas ${asignaciones.length} asignaciones docente-asignatura`);

    let portafoliosCreados = 0;
    let portafoliosExistentes = 0;

    for (const asignacion of asignaciones) {
      try {
        // Verificar si ya existe un portafolio para esta asignación
        const portafolioExistente = await Portafolio.findOne({
          where: {
            docente_id: asignacion.docente_id,
            asignatura_id: asignacion.asignatura_id,
            ciclo_id: cicloActivo.id,
            grupo: asignacion.grupo || 'A',
            activo: true
          },
          transaction
        });

        if (portafolioExistente) {
          portafoliosExistentes++;
          continue;
        }

        // Buscar semestre basado en el semestre de la asignatura
        const semestre = await Semestre.findOne({
          where: {
            nombre: asignacion.asignatura.semestre
          },
          transaction
        });

        if (!semestre) {
          logError(`No se encontró semestre para: ${asignacion.asignatura.semestre}`, {
            asignatura: asignacion.asignatura.codigo
          });
          continue;
        }

        // Crear el portafolio
        const nuevoPortafolio = await Portafolio.create({
          nombre: `Portafolio ${asignacion.asignatura.codigo} - ${asignacion.asignatura.nombre} (Grupo ${asignacion.grupo || 'A'})`,
          docente_id: asignacion.docente_id,
          asignatura_id: asignacion.asignatura_id,
          grupo: asignacion.grupo || 'A',
          asignacion_id: asignacion.id,
          semestre_id: semestre.id,
          ciclo_id: cicloActivo.id,
          estado: 'activo',
          activo: true,
          nivel: 0,
          progreso_completado: 0.00,
          creado_por: 1 // Usuario administrador del sistema
        }, { transaction });

        portafoliosCreados++;
        
        info(`Portafolio creado: ${nuevoPortafolio.nombre}`, {
          docente: `${asignacion.docente.nombres} ${asignacion.docente.apellidos}`,
          asignatura: asignacion.asignatura.codigo,
          grupo: asignacion.grupo || 'A'
        });
        
      } catch (error) {
        logError(`Error creando portafolio para asignación ${asignacion.id}`, {
          error: error.message,
          asignacion: asignacion.id,
          docente: asignacion.docente_id,
          asignatura: asignacion.asignatura_id
        });
        // Continuar con la siguiente asignación en lugar de fallar completamente
      }
    }

    await transaction.commit();
    
    const resultado = {
      ciclo: cicloActivo.nombre,
      asignacionesEncontradas: asignaciones.length,
      portafoliosCreados,
      portafoliosExistentes,
      total: portafoliosCreados + portafoliosExistentes
    };

    info('Creación automática de portafolios completada', {
      portafoliosCreados,
      portafoliosExistentes,
      total: resultado.total,
      ciclo: cicloActivo.nombre
    });

    return resultado;
    
  } catch (error) {
    await transaction.rollback();
    logError('Error en crearPortafoliosAutomaticos', {
      error: error.message,
      cicloId
    });
    throw error;
  }
};

/**
 * Función auxiliar para crear portafolios individuales
 */
const crearPortafolios = async (asignaciones, cicloId) => {
  const transaction = await sequelize.transaction();
  
  try {
    let creados = 0;
    
    for (const asignacion of asignaciones) {
      // Verificar si ya existe
      const existente = await Portafolio.findOne({
        where: {
          docente_id: asignacion.docente_id,
          asignatura_id: asignacion.asignatura_id,
          ciclo_id: cicloId,
          grupo: asignacion.grupo || 'A',
          activo: true
        },
        transaction
      });
      
      if (existente) continue;
      
      // Buscar semestre
      const semestre = await Semestre.findOne({
        where: { nombre: asignacion.asignatura.semestre },
        transaction
      });
      
      if (!semestre) continue;
      
      // Crear portafolio
      await Portafolio.create({
        nombre: `Portafolio ${asignacion.asignatura.codigo} - ${asignacion.asignatura.nombre} (Grupo ${asignacion.grupo || 'A'})`,
        docente_id: asignacion.docente_id,
        asignatura_id: asignacion.asignatura_id,
        grupo: asignacion.grupo || 'A',
        asignacion_id: asignacion.id,
        semestre_id: semestre.id,
        ciclo_id: cicloId,
        estado: 'activo',
        activo: true,
        nivel: 0,
        progreso_completado: 0.00,
        creado_por: 1
      }, { transaction });
      
      creados++;
    }
    
    await transaction.commit();
    info(`Portafolios creados: ${creados}`, { cicloId });
    return creados;
    
  } catch (error) {
    await transaction.rollback();
    logError('Error en crearPortafolios', {
      error: error.message,
      cicloId
    });
    throw error;
  }
};

module.exports = {
  crearPortafoliosAutomaticos,
  crearPortafolios
};