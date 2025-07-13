const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/authJwt');
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
 * @route GET /api/dashboard/estadisticas-admin
 * @description Obtiene estadísticas específicas para administradores
 * @access Privado - Solo administradores
 */
router.get('/estadisticas-admin', 
  verificarToken, 
  verificarRol(['administrador']), 
  dashboardController.obtenerEstadisticasAdmin
);

/**
 * @route GET /api/dashboard/estadisticas-docente
 * @description Obtiene estadísticas específicas para docentes
 * @access Privado - Solo docentes
 */
router.get('/estadisticas-docente', 
  verificarToken, 
  verificarRol(['docente']), 
  dashboardController.obtenerEstadisticasDocente
);

/**
 * @route GET /api/dashboard/estadisticas-verificador
 * @description Obtiene estadísticas específicas para verificadores
 * @access Privado - Solo verificadores
 */
router.get('/estadisticas-verificador', 
  verificarToken, 
  verificarRol(['verificador']), 
  dashboardController.obtenerEstadisticasVerificador
);

/**
 * @route GET /api/dashboard/estado-sistema
 * @description Obtiene el estado general del sistema
 * @access Privado - Solo administradores
 */
router.get('/estado-sistema', 
  verificarToken, 
  verificarRol(['administrador']), 
  dashboardController.obtenerEstadoSistema
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
