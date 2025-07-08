const { Usuario, Asignatura, CicloAcademico } = require('../modelos');
const { sequelize } = require('../config/database');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

/**
 * Genera un reporte de usuarios por rol
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.reporteUsuariosPorRol = async (req, res) => {
    try {
        const { rol } = req.params;
        
        // Validar que el rol sea válido
        if (!['administrador', 'docente', 'verificador'].includes(rol)) {
            return res.status(400).json({
                success: false,
                message: 'Rol no válido'
            });
        }
        
        // Obtener usuarios con el rol especificado
        const usuarios = await sequelize.query(
            `SELECT u.id, u.nombres, u.apellidos, u.correo, u.telefono, u.activo, u.creado_en
             FROM usuarios u
             INNER JOIN usuarios_roles ur ON u.id = ur.usuario_id
             WHERE ur.rol = ?
             ORDER BY u.apellidos, u.nombres`,
            {
                replacements: [rol],
                type: sequelize.QueryTypes.SELECT
            }
        );
        
        return res.status(200).json({
            success: true,
            data: usuarios
        });
    } catch (error) {
        console.error('Error al generar reporte de usuarios por rol:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al generar reporte de usuarios por rol',
            error: error.message
        });
    }
};

/**
 * Genera un reporte de asignaturas por ciclo académico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.reporteAsignaturasPorCiclo = async (req, res) => {
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
        
        // Obtener asignaturas del ciclo
        const asignaturas = await Asignatura.findAll({
            where: {
                ciclo_id,
                activo: 1
            },
            order: [
                ['carrera', 'ASC'],
                ['semestre', 'ASC'],
                ['codigo', 'ASC']
            ]
        });
        
        return res.status(200).json({
            success: true,
            data: asignaturas
        });
    } catch (error) {
        console.error('Error al generar reporte de asignaturas por ciclo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al generar reporte de asignaturas por ciclo',
            error: error.message
        });
    }
};

/**
 * Genera un reporte de asignaciones docente-asignatura por ciclo académico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.reporteAsignacionesPorCiclo = async (req, res) => {
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
        
        // Obtener asignaciones docente-asignatura del ciclo
        const asignaciones = await sequelize.query(
            `SELECT 
                u.id as docente_id, 
                CONCAT(u.apellidos, ', ', u.nombres) as docente_nombre,
                u.correo as docente_email,
                a.id as asignatura_id,
                a.codigo as asignatura_codigo,
                a.nombre as asignatura_nombre,
                a.carrera,
                a.semestre,
                a.creditos,
                a.tipo,
                da.creado_en as fecha_asignacion
             FROM docentes_asignaturas da
             INNER JOIN usuarios u ON da.docente_id = u.id
             INNER JOIN asignaturas a ON da.asignatura_id = a.id
             WHERE da.ciclo_id = ? AND da.activo = 1
             ORDER BY u.apellidos, u.nombres, a.carrera, a.codigo`,
            {
                replacements: [ciclo_id],
                type: sequelize.QueryTypes.SELECT
            }
        );
        
        return res.status(200).json({
            success: true,
            data: asignaciones
        });
    } catch (error) {
        console.error('Error al generar reporte de asignaciones por ciclo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al generar reporte de asignaciones por ciclo',
            error: error.message
        });
    }
};

/**
 * Genera un reporte de asignaturas por docente y ciclo académico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.reporteAsignaturasPorDocente = async (req, res) => {
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
        
        // Obtener asignaturas del docente en el ciclo
        const asignaturas = await sequelize.query(
            `SELECT 
                a.id,
                a.codigo,
                a.nombre,
                a.carrera,
                a.semestre,
                a.creditos,
                a.tipo,
                da.creado_en as fecha_asignacion
             FROM asignaturas a
             INNER JOIN docentes_asignaturas da ON a.id = da.asignatura_id
             WHERE da.docente_id = ? AND da.ciclo_id = ? AND da.activo = 1 AND a.activo = 1
             ORDER BY a.carrera, a.codigo`,
            {
                replacements: [docente_id, ciclo_id],
                type: sequelize.QueryTypes.SELECT
            }
        );
        
        return res.status(200).json({
            success: true,
            data: {
                docente: {
                    id: docente.id,
                    nombres: docente.nombres,
                    apellidos: docente.apellidos,
                    email: docente.docente_email
                },
                asignaturas
            }
        });
    } catch (error) {
        console.error('Error al generar reporte de asignaturas por docente:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al generar reporte de asignaturas por docente',
            error: error.message
        });
    }
};

/**
 * Exporta un reporte a Excel
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.exportarReporteExcel = async (req, res) => {
    try {
        const { tipo, id } = req.params;
        let datos = [];
        let nombreArchivo = '';
        
        // Obtener datos según el tipo de reporte
        switch (tipo) {
            case 'usuarios-por-rol':
                const { rol } = req.query;
                if (!rol) {
                    return res.status(400).json({
                        success: false,
                        message: 'Se requiere especificar el rol'
                    });
                }
                
                datos = await sequelize.query(
                    `SELECT u.id, u.nombres, u.apellidos, u.correo, u.telefono, 
                     CASE WHEN u.activo = 1 THEN 'Activo' ELSE 'Inactivo' END as estado,
                     DATE_FORMAT(u.creado_en, '%d/%m/%Y') as fecha_registro
                     FROM usuarios u
                     INNER JOIN usuarios_roles ur ON u.id = ur.usuario_id
                     WHERE ur.rol = ?
                     ORDER BY u.apellidos, u.nombres`,
                    {
                        replacements: [rol],
                        type: sequelize.QueryTypes.SELECT
                    }
                );
                
                nombreArchivo = `Usuarios_${rol}_${Date.now()}.xlsx`;
                break;
                
            case 'asignaturas-por-ciclo':
                const ciclo = await CicloAcademico.findByPk(id, {
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
                
                datos = await sequelize.query(
                    `SELECT a.codigo, a.nombre, a.carrera, a.semestre, a.creditos, a.tipo,
                     CASE WHEN a.activo = 1 THEN 'Activo' ELSE 'Inactivo' END as estado
                     FROM asignaturas a
                     WHERE a.ciclo_id = ?
                     ORDER BY a.carrera, a.semestre, a.codigo`,
                    {
                        replacements: [id],
                        type: sequelize.QueryTypes.SELECT
                    }
                );
                
                nombreArchivo = `Asignaturas_Ciclo_${ciclo.nombre}_${Date.now()}.xlsx`;
                break;
                
            case 'asignaciones-por-ciclo':
                const cicloPorAsignacion = await CicloAcademico.findByPk(id, {
                    attributes: {
                        exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
                    }
                });
                if (!cicloPorAsignacion) {
                    return res.status(404).json({
                        success: false,
                        message: 'Ciclo académico no encontrado'
                    });
                }
                
                datos = await sequelize.query(
                    `SELECT 
                        CONCAT(u.apellidos, ', ', u.nombres) as docente,
                        u.correo as email_docente,
                        a.codigo as codigo_asignatura,
                        a.nombre as nombre_asignatura,
                        a.carrera,
                        a.semestre,
                        a.creditos,
                        a.tipo,
                        DATE_FORMAT(da.creado_en, '%d/%m/%Y') as fecha_asignacion
                     FROM docentes_asignaturas da
                     INNER JOIN usuarios u ON da.docente_id = u.id
                     INNER JOIN asignaturas a ON da.asignatura_id = a.id
                     WHERE da.ciclo_id = ? AND da.activo = 1
                     ORDER BY u.apellidos, u.nombres, a.carrera, a.codigo`,
                    {
                        replacements: [id],
                        type: sequelize.QueryTypes.SELECT
                    }
                );
                
                nombreArchivo = `Asignaciones_Ciclo_${cicloPorAsignacion.nombre}_${Date.now()}.xlsx`;
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de reporte no válido'
                });
        }
        
        // Crear libro de Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(datos);
        
        // Añadir hoja al libro
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
        
        // Crear directorio temporal si no existe
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Guardar archivo temporalmente
        const filePath = path.join(tempDir, nombreArchivo);
        XLSX.writeFile(wb, filePath);
        
        // Enviar archivo al cliente
        res.download(filePath, nombreArchivo, (err) => {
            if (err) {
                console.error('Error al enviar archivo:', err);
            }
            
            // Eliminar archivo temporal después de enviarlo
            fs.unlinkSync(filePath);
        });
    } catch (error) {
        console.error('Error al exportar reporte a Excel:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al exportar reporte a Excel',
            error: error.message
        });
    }
};
