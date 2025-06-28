const express = require('express');
const router = express.Router();
const { Asignatura, CicloAcademico, Carrera } = require('../modelos');
const { verificarToken } = require('../middleware/authJwt');

/**
 * Obtener todas las asignaturas
 */
router.get('/', verificarToken, async (req, res) => {
  try {
    console.log('📖 Obteniendo lista de asignaturas...');
    
    const { ciclo_id, carrera, semestre } = req.query;
    
    // Construir condiciones de filtro
    let whereConditions = { activo: true };
    
    if (ciclo_id) {
      whereConditions.ciclo_id = ciclo_id;
    } else {
      // Si no se especifica ciclo, usar el ciclo activo
      const cicloActivo = await CicloAcademico.findOne({
        where: { estado: 'activo' }
      });
      if (cicloActivo) {
        whereConditions.ciclo_id = cicloActivo.id;
      }
    }
    
    if (carrera) {
      whereConditions.carrera = carrera;
    }
    
    if (semestre) {
      whereConditions.semestre = semestre;
    }

    const asignaturas = await Asignatura.findAll({
      where: whereConditions,
      include: [
        {
          model: CicloAcademico,
          as: 'ciclo',
          attributes: ['id', 'nombre', 'estado']
        }
      ],
      order: [['carrera', 'ASC'], ['semestre', 'ASC'], ['nombre', 'ASC']]
    });

    console.log(`✅ Se encontraron ${asignaturas.length} asignaturas`);

    res.json({
      exito: true,
      datos: asignaturas,
      total: asignaturas.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo asignaturas:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error obteniendo lista de asignaturas',
      error: error.message
    });
  }
});

/**
 * Obtener asignatura por ID
 */
router.get('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const asignatura = await Asignatura.findByPk(id, {
      include: [
        {
          model: CicloAcademico,
          as: 'ciclo',
          attributes: ['id', 'nombre', 'estado']
        }
      ]
    });

    if (!asignatura) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Asignatura no encontrada'
      });
    }

    res.json({
      exito: true,
      datos: asignatura
    });

  } catch (error) {
    console.error('❌ Error obteniendo asignatura:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error obteniendo asignatura',
      error: error.message
    });
  }
});

/**
 * Crear nueva asignatura
 */
router.post('/', verificarToken, async (req, res) => {
  try {
    const { 
      codigo, 
      nombre, 
      carrera, 
      semestre, 
      creditos, 
      horas_teoricas, 
      tipo, 
      ciclo_id,
      prerequisitos 
    } = req.body;

    // Validar campos requeridos
    if (!codigo || !nombre || !carrera || !semestre) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Campos requeridos: codigo, nombre, carrera, semestre'
      });
    }

    // Obtener ciclo académico activo si no se especifica
    let cicloTarget = ciclo_id;
    if (!cicloTarget) {
      const cicloActivo = await CicloAcademico.findOne({
        where: { estado: 'activo' }
      });
      if (!cicloActivo) {
        return res.status(400).json({
          exito: false,
          mensaje: 'No hay ciclo académico activo'
        });
      }
      cicloTarget = cicloActivo.id;
    }

    // Verificar si ya existe una asignatura con el mismo código en el ciclo
    const asignaturaExistente = await Asignatura.findOne({
      where: { 
        codigo,
        ciclo_id: cicloTarget
      }
    });

    if (asignaturaExistente) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Ya existe una asignatura con este código en el ciclo actual'
      });
    }

    const ciclo = await CicloAcademico.findByPk(cicloTarget);
    
    const nuevaAsignatura = await Asignatura.create({
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      carrera: carrera.trim(),
      semestre: semestre.trim(),
      anio: ciclo ? ciclo.anio_actual : new Date().getFullYear(),
      creditos: creditos || 3,
      horas_teoricas: horas_teoricas || 3,
      tipo: tipo || 'teoria',
      ciclo_id: cicloTarget,
      prerequisitos: prerequisitos ? JSON.stringify(prerequisitos) : null,
      activo: true
    });

    console.log(`✅ Asignatura creada: ${nuevaAsignatura.nombre}`);

    res.status(201).json({
      exito: true,
      mensaje: 'Asignatura creada exitosamente',
      datos: nuevaAsignatura
    });

  } catch (error) {
    console.error('❌ Error creando asignatura:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error creando asignatura',
      error: error.message
    });
  }
});

/**
 * Actualizar asignatura
 */
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      codigo, 
      nombre, 
      carrera, 
      semestre, 
      creditos, 
      horas_teoricas, 
      tipo, 
      prerequisitos,
      activo 
    } = req.body;

    const asignatura = await Asignatura.findByPk(id);

    if (!asignatura) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Asignatura no encontrada'
      });
    }

    await asignatura.update({
      codigo: codigo?.trim() || asignatura.codigo,
      nombre: nombre?.trim() || asignatura.nombre,
      carrera: carrera?.trim() || asignatura.carrera,
      semestre: semestre?.trim() || asignatura.semestre,
      creditos: creditos || asignatura.creditos,
      horas_teoricas: horas_teoricas || asignatura.horas_teoricas,
      tipo: tipo || asignatura.tipo,
      prerequisitos: prerequisitos ? JSON.stringify(prerequisitos) : asignatura.prerequisitos,
      activo: activo !== undefined ? activo : asignatura.activo,
      actualizado_en: new Date()
    });

    console.log(`✅ Asignatura actualizada: ${asignatura.nombre}`);

    res.json({
      exito: true,
      mensaje: 'Asignatura actualizada exitosamente',
      datos: asignatura
    });

  } catch (error) {
    console.error('❌ Error actualizando asignatura:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error actualizando asignatura',
      error: error.message
    });
  }
});

/**
 * Eliminar asignatura (cambiar estado a inactivo)
 */
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;

    const asignatura = await Asignatura.findByPk(id);

    if (!asignatura) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Asignatura no encontrada'
      });
    }

    await asignatura.update({
      activo: false,
      actualizado_en: new Date()
    });

    console.log(`✅ Asignatura desactivada: ${asignatura.nombre}`);

    res.json({
      exito: true,
      mensaje: 'Asignatura desactivada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error desactivando asignatura:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error desactivando asignatura',
      error: error.message
    });
  }
});

/**
 * Obtener asignaturas por carrera
 */
router.get('/carrera/:carrera', verificarToken, async (req, res) => {
  try {
    const { carrera } = req.params;
    const { semestre } = req.query;
    
    let whereConditions = { 
      carrera,
      activo: true 
    };
    
    if (semestre) {
      whereConditions.semestre = semestre;
    }

    // Usar ciclo académico activo
    const cicloActivo = await CicloAcademico.findOne({
      where: { estado: 'activo' }
    });
    
    if (cicloActivo) {
      whereConditions.ciclo_id = cicloActivo.id;
    }

    const asignaturas = await Asignatura.findAll({
      where: whereConditions,
      order: [['semestre', 'ASC'], ['nombre', 'ASC']]
    });

    res.json({
      exito: true,
      datos: asignaturas,
      total: asignaturas.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo asignaturas por carrera:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error obteniendo asignaturas por carrera',
      error: error.message
    });
  }
});

module.exports = router;
