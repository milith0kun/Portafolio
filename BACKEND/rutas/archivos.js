/**
 * Rutas para el manejo de archivos
 */

const express = require('express');
const router = express.Router();

// Middlewares de autenticación
const { verificarToken, verificarRol } = require('../middleware/authJwt');

// Controlador de archivos
const archivosController = require('../controladores/archivosController');

/**
 * @route POST /api/archivos/:portafolioId/subir
 * @desc Subir archivos a un portafolio específico
 * @access Docente, Administrador
 */
router.post('/:portafolioId/subir',
  verificarToken,
  verificarRol(['docente', 'administrador']),
  archivosController.uploadMiddleware,
  archivosController.subirArchivos
);

/**
 * @route GET /api/archivos/:archivoId/descargar
 * @desc Descargar un archivo específico
 * @access Docente, Verificador, Administrador
 */
router.get('/:archivoId/descargar',
  verificarToken,
  verificarRol(['docente', 'verificador', 'administrador']),
  archivosController.descargarArchivo
);

/**
 * @route DELETE /api/archivos/:archivoId
 * @desc Eliminar un archivo
 * @access Docente, Administrador
 */
router.delete('/:archivoId',
  verificarToken,
  verificarRol(['docente', 'administrador']),
  archivosController.eliminarArchivo
);

module.exports = router; 