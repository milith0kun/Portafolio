const express = require('express');
const router = express.Router();
const reportesController = require('../controladores/reportesController');
const { verificarToken, verificarRol } = require('../middleware/authJwt');

/**
 * @route   GET /api/reportes/usuarios/:rol
 * @desc    Genera un reporte de usuarios por rol
 * @access  Privado (Admin)
 */
router.get('/usuarios/:rol', 
    verificarToken, 
    verificarRol(['administrador']), 
    reportesController.reporteUsuariosPorRol
);

/**
 * @route   GET /api/reportes/asignaturas/ciclo/:ciclo_id
 * @desc    Genera un reporte de asignaturas por ciclo académico
 * @access  Privado (Admin, Verificador)
 */
router.get('/asignaturas/ciclo/:ciclo_id', 
    verificarToken, 
    verificarRol(['administrador', 'verificador']), 
    reportesController.reporteAsignaturasPorCiclo
);

/**
 * @route   GET /api/reportes/asignaciones/ciclo/:ciclo_id
 * @desc    Genera un reporte de asignaciones docente-asignatura por ciclo académico
 * @access  Privado (Admin, Verificador)
 */
router.get('/asignaciones/ciclo/:ciclo_id', 
    verificarToken, 
    verificarRol(['administrador', 'verificador']), 
    reportesController.reporteAsignacionesPorCiclo
);

/**
 * @route   GET /api/reportes/asignaturas/docente/:docente_id/ciclo/:ciclo_id
 * @desc    Genera un reporte de asignaturas por docente y ciclo académico
 * @access  Privado (Admin, Verificador, Docente)
 */
router.get('/asignaturas/docente/:docente_id/ciclo/:ciclo_id', 
    verificarToken, 
    reportesController.reporteAsignaturasPorDocente
);

/**
 * @route   GET /api/reportes/exportar/:tipo/:id
 * @desc    Exporta un reporte a Excel
 * @access  Privado (Admin, Verificador)
 */
router.get('/exportar/:tipo/:id', 
    verificarToken, 
    verificarRol(['administrador', 'verificador']), 
    reportesController.exportarReporteExcel
);

module.exports = router;
