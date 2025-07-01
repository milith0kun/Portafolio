/**
 * Rutas para el manejo de portafolios
 */

const express = require('express');
const router = express.Router();

// Middlewares de autenticación
const { verificarToken, verificarRol } = require('../middleware/authJwt');

// Controlador de portafolios
const portafoliosController = require('../controladores/portafoliosController');

/**
 * @route GET /api/portafolios
 * @desc Obtener todos los portafolios (solo administradores)
 * @access Administrador
 */
router.get('/', 
  verificarToken, 
  verificarRol(['administrador']), 
  portafoliosController.obtenerPortafolios
);

/**
 * @route GET /api/portafolios/mis-portafolios
 * @desc Obtener portafolios del docente autenticado
 * @access Docente
 */
router.get('/mis-portafolios', 
  verificarToken, 
  verificarRol(['docente', 'administrador']), 
  portafoliosController.obtenerMisPortafolios
);

/**
 * @route POST /api/portafolios/generar
 * @desc Generar portafolios automáticamente para todas las asignaciones
 * @access Administrador
 */
router.post('/generar', 
  verificarToken, 
  verificarRol(['administrador']), 
  portafoliosController.generarPortafoliosAutomaticos
);

/**
 * @route GET /api/portafolios/:id/estructura
 * @desc Obtener estructura de un portafolio específico
 * @access Docente, Verificador, Administrador
 */
router.get('/:id/estructura', 
  verificarToken, 
  verificarRol(['docente', 'verificador', 'administrador']), 
  portafoliosController.obtenerEstructuraPortafolio
);

/**
 * @route POST /api/portafolios/inicializar
 * @desc Inicializar sistema completo de portafolios
 * @access Administrador
 */
router.post('/inicializar', 
  verificarToken, 
  verificarRol(['administrador']), 
  portafoliosController.inicializarSistemaPortafolios
);

module.exports = router; 