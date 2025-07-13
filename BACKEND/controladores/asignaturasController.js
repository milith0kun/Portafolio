const { Asignatura, CicloAcademico, Usuario, UsuarioRol } = require('../modelos');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * Obtiene todas las asignaturas de un ciclo académico específico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerAsignaturas = async (req, res) => {
    try {
        const { ciclo_id } = req.params;
        
        // Verificar que el ciclo exista
        const ciclo = await CicloAcademico.findByPk(ciclo_id, {
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        if (!ciclo) {
            return res.status(404).json({
                success: false,
                message: 'Ciclo académico no encontrado'
            });
        }
        
        const asignaturas = await Asignatura.findAll({
            where: {
                ciclo_id,
                activo: 1
            },
            order: [
                ['carrera', 'ASC'],
                ['codigo', 'ASC']
            ]
        });
        
        return res.status(200).json({
            success: true,
            data: asignaturas
        });
    } catch (error) {

        return res.status(500).json({
            success: false,
            message: 'Error al obtener asignaturas',
            error: error.message
        });
    }
};

/**
 * Obtiene una asignatura por su ID
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerAsignaturaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        const asignatura = await Asignatura.findByPk(id);
        
        if (!asignatura) {
            return res.status(404).json({
                success: false,
                message: 'Asignatura no encontrada'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: asignatura
        });
    } catch (error) {

        return res.status(500).json({
            success: false,
            message: 'Error al obtener asignatura',
            error: error.message
        });
    }
};

/**
 * Crea una nueva asignatura
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.crearAsignatura = async (req, res) => {
    try {
        const {
            nombre,
            codigo,
            carrera,
            semestre,
            anio,
            creditos,
            tipo,
            ciclo_id,
            prerequisitos
        } = req.body;
        
        // Verificar que el ciclo exista
        const ciclo = await CicloAcademico.findByPk(ciclo_id, {
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        if (!ciclo) {
            return res.status(404).json({
                success: false,
                message: 'Ciclo académico no encontrado'
            });
        }
        
        // Verificar que no exista una asignatura con el mismo código en el mismo ciclo
        const asignaturaExistente = await Asignatura.findOne({
            where: {
                codigo,
                ciclo_id
            }
        });
        
        if (asignaturaExistente) {
            return res.status(400).json({
                success: false,
                message: `Ya existe una asignatura con el código ${codigo} en este ciclo académico`
            });
        }
        
        // Crear la asignatura
        const nuevaAsignatura = await Asignatura.create({
            nombre,
            codigo,
            carrera,
            semestre,
            anio,
            creditos,
            tipo,
            ciclo_id,
            prerequisitos
        });
        
        return res.status(201).json({
            success: true,
            message: 'Asignatura creada exitosamente',
            data: nuevaAsignatura
        });
    } catch (error) {

        return res.status(500).json({
            success: false,
            message: 'Error al crear asignatura',
            error: error.message
        });
    }
};

/**
 * Actualiza una asignatura existente
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.actualizarAsignatura = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            codigo,
            carrera,
            semestre,
            anio,
            creditos,
            tipo,
            activo,
            prerequisitos
        } = req.body;
        
        // Verificar que la asignatura exista
        const asignatura = await Asignatura.findByPk(id);
        
        if (!asignatura) {
            return res.status(404).json({
                success: false,
                message: 'Asignatura no encontrada'
            });
        }
        
        // Verificar que no exista otra asignatura con el mismo código en el mismo ciclo (excepto la actual)
        if (codigo && codigo !== asignatura.codigo) {
            const asignaturaExistente = await Asignatura.findOne({
                where: {
                    codigo,
                    ciclo_id: asignatura.ciclo_id,
                    id: { [Op.ne]: id }
                }
            });
            
            if (asignaturaExistente) {
                return res.status(400).json({
                    success: false,
                    message: `Ya existe una asignatura con el código ${codigo} en este ciclo académico`
                });
            }
        }
        
        // Actualizar la asignatura
        await asignatura.update({
            nombre: nombre || asignatura.nombre,
            codigo: codigo || asignatura.codigo,
            carrera: carrera || asignatura.carrera,
            semestre: semestre || asignatura.semestre,
            anio: anio || asignatura.anio,
            creditos: creditos || asignatura.creditos,
            tipo: tipo || asignatura.tipo,
            activo: activo !== undefined ? activo : asignatura.activo,
            prerequisitos: prerequisitos || asignatura.prerequisitos
        });
        
        return res.status(200).json({
            success: true,
            message: 'Asignatura actualizada exitosamente',
            data: asignatura
        });
    } catch (error) {

        return res.status(500).json({
            success: false,
            message: 'Error al actualizar asignatura',
            error: error.message
        });
    }
};

/**
 * Elimina una asignatura (desactivación lógica)
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.eliminarAsignatura = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que la asignatura exista
        const asignatura = await Asignatura.findByPk(id);
        
        if (!asignatura) {
            return res.status(404).json({
                success: false,
                message: 'Asignatura no encontrada'
            });
        }
        
        // Desactivar la asignatura (eliminación lógica)
        await asignatura.update({
            activo: 0
        });
        
        return res.status(200).json({
            success: true,
            message: 'Asignatura eliminada exitosamente'
        });
    } catch (error) {

        return res.status(500).json({
            success: false,
            message: 'Error al eliminar asignatura',
            error: error.message
        });
    }
};

/**
 * Asigna una asignatura a un docente
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.asignarDocenteAsignatura = async (req, res) => {
    try {
        const { asignatura_id } = req.params;
        const { docente_id, ciclo_id } = req.body;
        
        // Verificar que la asignatura exista
        const asignatura = await Asignatura.findByPk(asignatura_id);
        
        if (!asignatura) {
            return res.status(404).json({
                success: false,
                message: 'Asignatura no encontrada'
            });
        }
        
        // Verificar que el docente exista
        const docente = await Usuario.findByPk(docente_id);
        
        if (!docente) {
            return res.status(404).json({
                success: false,
                message: 'Docente no encontrado'
            });
        }
        
        // Verificar que el ciclo exista
        const ciclo = await CicloAcademico.findByPk(ciclo_id, {
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        if (!ciclo) {
            return res.status(404).json({
                success: false,
                message: 'Ciclo académico no encontrado'
            });
        }
        
        // Verificar que el docente tenga el rol de docente
        const rolDocente = await UsuarioRol.findOne({
            where: {
                usuario_id: docente_id,
                rol: 'docente',
                activo: true
            }
        });
        
        if (!rolDocente) {
            return res.status(400).json({
                success: false,
                message: 'El usuario no tiene el rol de docente activo'
            });
        }
        
        // Crear la asignación docente-asignatura
        await sequelize.query(
            `INSERT INTO docentes_asignaturas (docente_id, asignatura_id, ciclo_id, asignado_por) 
             VALUES (?, ?, ?, ?)`,
            {
                replacements: [docente_id, asignatura_id, ciclo_id, req.usuario.id]
            }
        );
        
        return res.status(201).json({
            success: true,
            message: 'Asignatura asignada al docente exitosamente'
        });
    } catch (error) {

        return res.status(500).json({
            success: false,
            message: 'Error al asignar asignatura a docente',
            error: error.message
        });
    }
};

/**
 * Obtiene todas las asignaturas asignadas a un docente en un ciclo específico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerAsignaturasDocente = async (req, res) => {
    try {
        const { docente_id, ciclo_id } = req.params;
        
        // Verificar que el docente exista
        const docente = await Usuario.findByPk(docente_id);
        
        if (!docente) {
            return res.status(404).json({
                success: false,
                message: 'Docente no encontrado'
            });
        }
        
        // Verificar que el ciclo exista
        const ciclo = await CicloAcademico.findByPk(ciclo_id, {
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        if (!ciclo) {
            return res.status(404).json({
                success: false,
                message: 'Ciclo académico no encontrado'
            });
        }
        
        // Obtener las asignaturas del docente
        const asignaturas = await sequelize.query(
            `SELECT a.* FROM asignaturas a
             INNER JOIN docentes_asignaturas da ON a.id = da.asignatura_id
             WHERE da.docente_id = ? AND da.ciclo_id = ? AND da.activo = 1 AND a.activo = 1
             ORDER BY a.carrera ASC, a.codigo ASC`,
            {
                replacements: [docente_id, ciclo_id],
                type: sequelize.QueryTypes.SELECT
            }
        );
        
        return res.status(200).json({
            success: true,
            data: asignaturas
        });
    } catch (error) {

        return res.status(500).json({
            success: false,
            message: 'Error al obtener asignaturas del docente',
            error: error.message
        });
    }
};
