const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/authJwt');
const dashboardController = require('../controladores/dashboardController');

/**
 * @route GET /api/notificaciones/recientes
 * @description Obtiene notificaciones recientes del sistema
 * @access Privado - Todos los usuarios autenticados
 */
router.get('/recientes', 
  verificarToken,
  dashboardController.obtenerNotificaciones
);

module.exports = router; 