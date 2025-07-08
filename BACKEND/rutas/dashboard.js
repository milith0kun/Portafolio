const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/authJwt');
const verificarRol = require('../middleware/verificar-rol');
const dashboardController = require('../controladores/dashboardController');

/**
 * @route GET /api/dashboard/estadisticas
 * @description Obtiene estadísticas completas del sistema
 * @access Privado - Solo administradores
 */
router.get('/estadisticas', 
  verificarToken, 
  verificarRol(['administrador']), 
  dashboardController.obtenerEstadisticas
);



/**
 * @route GET /api/dashboard/actividades
 * @description Obtiene actividades recientes del sistema
 * @access Privado - Solo administradores
 */
router.get('/actividades', 
  verificarToken, 
  verificarRol(['administrador']), 
  dashboardController.obtenerActividades
);

/**
 * @route GET /api/dashboard/notificaciones
 * @description Obtiene notificaciones del sistema
 * @access Privado - Solo administradores
 */
router.get('/notificaciones', 
  verificarToken, 
  verificarRol(['administrador']), 
  dashboardController.obtenerNotificaciones
);

/**
 * @route GET /api/dashboard/ciclo-actual
 * @description Obtiene información del ciclo académico activo
 * @access Privado - Solo administradores
 */
router.get('/ciclo-actual', 
  verificarToken, 
  verificarRol(['administrador']), 
  dashboardController.obtenerCicloActual
);

/**
 * @route GET /api/dashboard/asignaciones
 * @description Obtiene asignaciones docente-asignatura
 * @access Privado - Solo administradores
 */
router.get('/asignaciones', 
  verificarToken, 
  verificarRol(['administrador']), 
  dashboardController.obtenerAsignaciones
);

/**
 * @route GET /api/dashboard/verificaciones
 * @description Obtiene verificaciones pendientes
 * @access Privado - Solo administradores
 */
router.get('/verificaciones', 
  verificarToken, 
  verificarRol(['administrador']), 
  dashboardController.obtenerVerificaciones
);

/**
 * @route GET /api/dashboard/portafolios
 * @description Obtiene resumen de portafolios
 * @access Privado - Solo administradores
 */
router.get('/portafolios', 
  verificarToken, 
  verificarRol(['administrador']), 
  dashboardController.obtenerPortafolios
);

module.exports = router;
