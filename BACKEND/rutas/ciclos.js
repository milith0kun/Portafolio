const express = require('express');
const router = express.Router();
const ciclosController = require('../controladores/ciclosController');
const { verificarToken, verificarRol } = require('../middleware/verificar-jwt');

/**
 * @route   GET /api/ciclos
 * @desc    Obtener todos los ciclos académicos
 * @access  Privado (Admin)
 */
router.get('/', verificarToken, verificarRol(['administrador']), ciclosController.obtenerCiclos);

/**
 * @route   GET /api/ciclos/activo
 * @desc    Obtener el ciclo académico activo
 * @access  Privado (Todos los roles)
 */
router.get('/activo', verificarToken, ciclosController.obtenerCicloActivo);

/**
 * @route   GET /api/ciclos/verificacion
 * @desc    Obtener el ciclo académico en verificación
 * @access  Privado (Todos los roles)
 */
router.get('/verificacion', verificarToken, ciclosController.obtenerCicloEnVerificacion);

/**
 * @route   GET /api/ciclos/:id/estadisticas
 * @desc    Obtener estadísticas específicas de un ciclo académico
 * @access  Privado (Admin)
 */
router.get('/:id/estadisticas', verificarToken, verificarRol(['administrador']), ciclosController.obtenerEstadisticasCiclo);

/**
 * @route   GET /api/ciclos/:id/archivos-carga
 * @desc    Obtener archivos de carga masiva asociados a un ciclo académico
 * @access  Privado (Admin)
 */
router.get('/:id/archivos-carga', verificarToken, verificarRol(['administrador']), ciclosController.obtenerArchivosCargaPorCiclo);

/**
 * @route   GET /api/ciclos/:id
 * @desc    Obtener un ciclo académico por su ID
 * @access  Privado (Admin)
 */
router.get('/:id', verificarToken, verificarRol(['administrador']), ciclosController.obtenerCicloPorId);

/**
 * @route   POST /api/ciclos
 * @desc    Crear un nuevo ciclo académico
 * @access  Privado (Admin)
 */
router.post('/', verificarToken, verificarRol(['administrador']), ciclosController.crearCiclo);

/**
 * @route   PUT /api/ciclos/:id
 * @desc    Actualizar un ciclo académico existente
 * @access  Privado (Admin)
 */
router.put('/:id', verificarToken, verificarRol(['administrador']), ciclosController.actualizarCiclo);

/**
 * @route   GET /api/ciclos/:ciclo_id/estados
 * @desc    Obtener los estados de los módulos para un ciclo específico
 * @access  Privado (Admin)
 */
router.get('/:ciclo_id/estados', verificarToken, verificarRol(['administrador']), ciclosController.obtenerEstadosModulos);

/**
 * @route   PUT /api/ciclos/:ciclo_id/modulos/:modulo
 * @desc    Actualizar el estado de un módulo del sistema para un ciclo específico
 * @access  Privado (Admin)
 */
router.put('/:ciclo_id/modulos/:modulo', verificarToken, verificarRol(['administrador']), ciclosController.actualizarEstadoModulo);

/**
 * @route   PUT /api/ciclos/:id/estado
 * @desc    Cambiar el estado de un ciclo académico
 * @access  Privado (Admin)
 */
router.put('/:id/estado', verificarToken, verificarRol(['administrador']), ciclosController.cambiarEstadoCiclo);

/**
 * @route   DELETE /api/ciclos/:id
 * @desc    Eliminar un ciclo académico (solo si está en estado de preparación)
 * @access  Privado (Admin)
 */
router.delete('/:id', verificarToken, verificarRol(['administrador']), ciclosController.eliminarCiclo);

module.exports = router;
