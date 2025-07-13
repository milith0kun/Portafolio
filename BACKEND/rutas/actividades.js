const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middleware/authJwt');
const dashboardController = require('../controladores/dashboardController');

/**
 * @swagger
 * /api/actividades/recientes:
 *   get:
 *     summary: Obtiene las actividades recientes del sistema
 *     description: Retorna las últimas 10 actividades registradas en el sistema
 *     tags:
 *       - Actividades
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de actividades recientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Actividad'
 *       401:
 *         $ref: '#/components/responses/NoAutorizado'
 *       500:
 *         $ref: '#/components/responses/ErrorServidor'
 */
router.get('/recientes', verificarToken, verificarRol(['administrador']), dashboardController.obtenerActividades);

module.exports = router;
