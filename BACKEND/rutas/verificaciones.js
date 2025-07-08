/**
 * Rutas de Verificaciones
 * Endpoints para el sistema de verificación de portafolios
 */

const express = require('express');
const router = express.Router();
const verificacionesController = require('../controladores/verificacionesController');
const { verificarToken } = require('../middleware/verificar-jwt');
const verificarRol = require('../middleware/verificar-rol');

// Middleware para verificar que el usuario es verificador
const esVerificador = verificarRol(['verificador']);

/**
 * @route GET /api/verificaciones/portafolios
 * @desc Obtener portafolios asignados al verificador
 * @access Verificador
 */
router.get('/portafolios', 
  verificarToken, 
  esVerificador, 
  verificacionesController.obtenerPortafoliosAsignados
);

/**
 * @route GET /api/verificaciones/portafolios/:portafolioId/documentos
 * @desc Obtener documentos de un portafolio específico para verificación
 * @access Verificador
 */
router.get('/portafolios/:portafolioId/documentos', 
  verificarToken, 
  esVerificador, 
  verificacionesController.obtenerDocumentosPortafolio
);

/**
 * @route PUT /api/verificaciones/documentos/:documentoId
 * @desc Verificar un documento (aprobar/rechazar/observar)
 * @access Verificador
 */
router.put('/documentos/:documentoId', 
  verificarToken, 
  esVerificador, 
  verificacionesController.verificarDocumento
);

/**
 * @route POST /api/verificaciones/documentos/masiva
 * @desc Verificar múltiples documentos a la vez
 * @access Verificador
 */
router.post('/documentos/masiva', 
  verificarToken, 
  esVerificador, 
  verificacionesController.verificarMultiplesDocumentos
);

/**
 * @route GET /api/verificaciones/estadisticas
 * @desc Obtener estadísticas de verificación del verificador
 * @access Verificador
 */
router.get('/estadisticas', 
  verificarToken, 
  esVerificador, 
  verificacionesController.obtenerEstadisticasVerificador
);

module.exports = router; 