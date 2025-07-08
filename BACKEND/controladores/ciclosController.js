const { CicloAcademico, EstadoSistema, Semestre, Usuario, Carrera, Asignatura, DocenteAsignatura, Portafolio } = require('../modelos');
const { sequelize } = require('../config/database');
const { Op, ValidationError } = require('sequelize');
const { logger } = require('../config/logger');

/**
 * Obtiene todos los ciclos académicos
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerCiclos = async (req, res) => {
    try {
        const ciclos = await CicloAcademico.findAll({
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            },
            include: [
                {
                    model: Usuario,
                    as: 'creador',
                    attributes: ['nombres', 'apellidos']
                },
                {
                    model: EstadoSistema,
                    as: 'estados_sistema'
                }
            ],
            order: [['creado_en', 'DESC']]
        });
        
        return res.status(200).json({
            success: true,
            data: ciclos
        });
    } catch (error) {
        logger.error('Error al obtener ciclos académicos:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Error al obtener ciclos académicos',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
        });
    }
};

/**
 * Obtiene un ciclo académico por su ID
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerCicloPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        const ciclo = await CicloAcademico.findByPk(id, {
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            },
            include: [
                { 
                    model: EstadoSistema, 
                    as: 'estados_sistema' 
                },
                { 
                    model: Semestre, 
                    as: 'semestres' 
                },
                {
                    model: Usuario,
                    as: 'creador',
                    attributes: ['nombres', 'apellidos']
                }
            ]
        });
        
        if (!ciclo) {
            return res.status(404).json({
                success: false,
                message: 'Ciclo académico no encontrado'
            });
        }
        
        return res.status(200).json({
            success: true,
            data: ciclo
        });
    } catch (error) {
        logger.error('Error al obtener ciclo académico:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener ciclo académico'
        });
    }
};

/**
 * Crea un nuevo ciclo académico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.crearCiclo = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { 
            nombre, 
            descripcion, 
            fecha_inicio, 
            fecha_fin, 
            semestre_actual, 
            anio_actual,
            configuracion 
        } = req.body;
        
        // Validaciones
        if (!nombre || !fecha_inicio || !fecha_fin || !semestre_actual || !anio_actual) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos obligatorios deben ser proporcionados'
            });
        }

        // Validar fechas
        const fechaInicio = new Date(fecha_inicio);
        const fechaFin = new Date(fecha_fin);
        
        if (fechaFin <= fechaInicio) {
            return res.status(400).json({
                success: false,
                message: 'La fecha de fin debe ser posterior a la fecha de inicio'
            });
        }
        
        // Validar que no exista un ciclo con el mismo nombre
        const cicloExistente = await CicloAcademico.findOne({
            where: { nombre }
        });
        
        if (cicloExistente) {
            return res.status(400).json({
                success: false,
                message: `Ya existe un ciclo académico con el nombre "${nombre}"`
            });
        }
        
        // Crear el ciclo académico
        const nuevoCiclo = await CicloAcademico.create({
            nombre,
            descripcion,
            estado: 'preparacion',
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            semestre_actual,
            anio_actual,
            creado_por: req.usuario.id,
            configuracion: configuracion || {}
        }, { transaction });
        
        // Crear los estados del sistema para este ciclo (todos deshabilitados inicialmente)
        const modulos = [
            { modulo: 'carga_datos', habilitado: false },
            { modulo: 'gestion_documentos', habilitado: false },
            { modulo: 'verificacion', habilitado: false },
            { modulo: 'reportes', habilitado: false }
        ];
        
        for (const { modulo, habilitado } of modulos) {
            await EstadoSistema.create({
                ciclo_id: nuevoCiclo.id,
                modulo,
                habilitado,
                observaciones: `Estado inicial del módulo ${modulo}`,
                actualizado_por: req.usuario.id
            }, { transaction });
        }
        
        // Crear el semestre asociado al ciclo
        await Semestre.create({
            nombre: semestre_actual,
            ciclo_id: nuevoCiclo.id,
            activo: false // Se activará cuando se active el ciclo
        }, { transaction });
        
        await transaction.commit();
        
        return res.status(201).json({
            success: true,
            message: 'Ciclo académico creado exitosamente',
            data: nuevoCiclo
        });
        
    } catch (error) {
        await transaction.rollback();
        logger.error('Error al crear ciclo académico:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Error al crear ciclo académico',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
        });
    }
};

/**
 * Actualiza un ciclo académico existente
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.actualizarCiclo = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { 
            nombre, 
            descripcion, 
            estado, 
            fecha_inicio, 
            fecha_fin,
            semestre_actual,
            anio_actual,
            configuracion 
        } = req.body;
        
        // Log para debugging
        logger.info('Actualizando ciclo:', { id, datos: req.body, usuario: req.usuario.id });
        
        // Verificar que el ciclo exista
        const ciclo = await CicloAcademico.findByPk(id, {
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        if (!ciclo) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Ciclo académico no encontrado'
            });
        }
        
        // Validar cambio de estado
        if (estado && estado !== ciclo.estado) {
            const validacionEstado = await validarCambioEstado(ciclo.estado, estado, id);
            if (!validacionEstado.valido) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: validacionEstado.mensaje
                });
            }
        }
        
        // Verificar que no exista otro ciclo con el mismo nombre (excepto el actual)
        if (nombre && nombre !== ciclo.nombre) {
            const cicloExistente = await CicloAcademico.findOne({
                where: {
                    nombre,
                    id: { [Op.ne]: id }
                },
                attributes: {
                    exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
                }
            });
            
            if (cicloExistente) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Ya existe otro ciclo académico con el nombre "${nombre}"`
                });
            }
        }
        
        // Validar fechas si se proporcionan
        if (fecha_inicio && fecha_fin) {
            const inicio = new Date(fecha_inicio);
            const fin = new Date(fecha_fin);
            
            if (fin <= inicio) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'La fecha de fin debe ser posterior a la fecha de inicio'
                });
            }
        }
        
        // Actualizar el ciclo
        const datosActualizacion = {
            ...(nombre && { nombre }),
            ...(descripcion !== undefined && { descripcion }),
            ...(fecha_inicio && { fecha_inicio }),
            ...(fecha_fin && { fecha_fin }),
            ...(semestre_actual && { semestre_actual }),
            ...(anio_actual && { anio_actual }),
            ...(configuracion && { configuracion })
        };
        
        // Manejar cambio de estado especial
        if (estado && estado !== ciclo.estado) {
            datosActualizacion.estado = estado;
            
            // Si se activa el ciclo, desactivar otros ciclos activos
            if (estado === 'activo') {
                await CicloAcademico.update(
                    { estado: 'cerrado' },
                    { 
                        where: { 
                            estado: 'activo',
                            id: { [Op.ne]: id }
                        },
                        transaction
                    }
                );
                
                // Activar el semestre del ciclo (o crear si no existe)
                await Semestre.update(
                    { activo: true },
                    { 
                        where: { ciclo_id: id },
                        transaction
                    }
                );
                
                // Si no hay semestre, crear uno
                const semestreExistente = await Semestre.findOne({
                    where: { ciclo_id: id },
                    transaction
                });
                
                if (!semestreExistente) {
                    await Semestre.create({
                        nombre: ciclo.semestre_actual || `${ciclo.anio_actual}-I`,
                        ciclo_id: id,
                        activo: true
                    }, { transaction });
                }
                
                // Habilitar módulo de carga de datos
                await EstadoSistema.update(
                    { 
                        habilitado: true,
                        fecha_habilitacion: new Date(),
                        actualizado_por: req.usuario.id
                    },
                    { 
                        where: { 
                            ciclo_id: id,
                            modulo: 'carga_datos'
                        },
                        transaction
                    }
                );
            }
            
            // Si se pone en preparación, resetear algunas configuraciones
            if (estado === 'preparacion') {
                // Desactivar semestres asociados
                await Semestre.update(
                    { activo: false },
                    { 
                        where: { ciclo_id: id },
                        transaction
                    }
                );
                
                // Deshabilitar todos los módulos excepto configuración básica
                await EstadoSistema.update(
                    { 
                        habilitado: false,
                        fecha_deshabilitacion: new Date(),
                        actualizado_por: req.usuario.id
                    },
                    { 
                        where: { 
                            ciclo_id: id,
                            modulo: { [Op.ne]: 'configuracion' }
                        },
                        transaction
                    }
                );
            }
            
            // Si se cierra el ciclo
            if (estado === 'cerrado') {
                datosActualizacion.fecha_cierre_real = new Date();
                datosActualizacion.cerrado_por = req.usuario.id;
                
                // Desactivar todos los módulos
                await EstadoSistema.update(
                    { 
                        habilitado: false,
                        fecha_deshabilitacion: new Date(),
                        actualizado_por: req.usuario.id
                    },
                    { 
                        where: { ciclo_id: id },
                        transaction
                    }
                );
            }
        }
        
        await ciclo.update(datosActualizacion, { transaction });
        
        await transaction.commit();
        
        return res.status(200).json({
            success: true,
            message: 'Ciclo académico actualizado exitosamente',
            data: ciclo
        });
        
    } catch (error) {
        await transaction.rollback();
        logger.error('Error al actualizar ciclo académico:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar ciclo académico',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
        });
    }
};

/**
 * Actualiza el estado de un módulo del sistema
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.actualizarEstadoModulo = async (req, res) => {
    try {
        const { ciclo_id, modulo } = req.params;
        const { habilitado, observaciones } = req.body;
        
        // Verificar que el ciclo existe
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
        
        // Verificar que el ciclo esté activo
        if (ciclo.estado !== 'activo') {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden modificar módulos de ciclos activos'
            });
        }
        
        // Validar secuencia de módulos
        const validacionSecuencia = await validarSecuenciaModulos(ciclo_id, modulo, habilitado);
        if (!validacionSecuencia.valido) {
            return res.status(400).json({
                success: false,
                message: validacionSecuencia.mensaje
            });
        }
        
        // Actualizar el estado del módulo
        const [numFilasActualizadas] = await EstadoSistema.update(
            {
                habilitado,
                [habilitado ? 'fecha_habilitacion' : 'fecha_deshabilitacion']: new Date(),
                observaciones,
                actualizado_por: req.usuario.id
            },
            {
                where: {
                    ciclo_id,
                    modulo
                }
            }
        );
        
        if (numFilasActualizadas === 0) {
            return res.status(404).json({
                success: false,
                message: 'Estado del módulo no encontrado'
            });
        }
        
        return res.status(200).json({
            success: true,
            message: `Módulo ${modulo} ${habilitado ? 'habilitado' : 'deshabilitado'} exitosamente`
        });
        
    } catch (error) {
        logger.error('Error al actualizar estado del módulo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar estado del módulo'
        });
    }
};

/**
 * Elimina un ciclo académico (solo si está en preparación)
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.eliminarCiclo = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        
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
        
        // Solo permitir eliminar ciclos en preparación
        if (ciclo.estado !== 'preparacion') {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden eliminar ciclos en estado de preparación'
            });
        }
        
        // Eliminar estados del sistema asociados
        await EstadoSistema.destroy({
            where: { ciclo_id: id },
            transaction
        });
        
        // Eliminar semestres asociados
        await Semestre.destroy({
            where: { ciclo_id: id },
            transaction
        });
        
        // Eliminar el ciclo
        await ciclo.destroy({ transaction });
        
        await transaction.commit();
        
        return res.status(200).json({
            success: true,
            message: 'Ciclo académico eliminado exitosamente'
        });
        
    } catch (error) {
        await transaction.rollback();
        logger.error('Error al eliminar ciclo académico:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar ciclo académico'
        });
    }
};

/**
 * Obtiene el estado de los módulos del sistema para un ciclo
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerEstadosModulos = async (req, res) => {
    try {
        const { ciclo_id } = req.params;
        
        const estados = await EstadoSistema.findAll({
            where: { ciclo_id },
            order: [['modulo', 'ASC']]
        });
        
        return res.status(200).json({
            success: true,
            data: estados
        });
        
    } catch (error) {
        logger.error('Error al obtener estados de módulos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener estados de módulos'
        });
    }
};

/**
 * Obtiene el ciclo académico activo actual
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerCicloActivo = async (req, res) => {
    try {
        const cicloActivo = await CicloAcademico.findOne({
            where: { estado: 'activo' },
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        if (!cicloActivo) {
            return res.status(404).json({
                success: false,
                message: 'No hay ningún ciclo académico activo',
                data: null
            });
        }
        
        return res.status(200).json({
            success: true,
            data: cicloActivo,
            message: 'Ciclo académico activo obtenido exitosamente'
        });
    } catch (error) {
        logger.error('Error al obtener ciclo activo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener ciclo activo'
        });
    }
};

/**
 * Obtiene el ciclo académico en verificación
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerCicloEnVerificacion = async (req, res) => {
    try {
        const cicloEnVerificacion = await CicloAcademico.findOne({
            where: { estado: 'verificacion' },
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        if (!cicloEnVerificacion) {
            return res.status(404).json({
                success: false,
                message: 'No hay ningún ciclo académico en verificación',
                data: null
            });
        }
        
        return res.status(200).json({
            success: true,
            data: cicloEnVerificacion,
            message: 'Ciclo académico en verificación obtenido exitosamente'
        });
    } catch (error) {
        logger.error('Error al obtener ciclo en verificación:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener ciclo en verificación'
        });
    }
};

/**
 * Obtiene estadísticas específicas de un ciclo académico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerEstadisticasCiclo = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el ciclo existe
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
        
        // Obtener estadísticas específicas del ciclo usando consultas robustas
        let usuariosStats = [{ total: 0 }];
        let carrerasStats = [{ total: 0 }];
        let asignaturasStats = [{ total: 0 }];
        let portafoliosStats = 0;
        let asignacionesStats = 0;
        
        try {
            // Portafolios del ciclo (consulta más segura)
            portafoliosStats = await Portafolio.count({
                where: { ciclo_id: id }
            });
        } catch (portafolioError) {
            logger.warn('Error consultando portafolios:', portafolioError.message);
        }
        
        try {
            // Asignaciones docente-asignatura del ciclo
            asignacionesStats = await DocenteAsignatura.count({
                where: { ciclo_id: id }
            });
        } catch (asignacionError) {
            logger.warn('Error consultando asignaciones:', asignacionError.message);
        }
        
        try {
            // Usuarios asociados al ciclo (a través de portafolios)
            usuariosStats = await sequelize.query(`
                SELECT COUNT(DISTINCT u.id) as total 
                FROM usuarios u 
                INNER JOIN portafolios p ON u.id = p.usuario_id 
                WHERE p.ciclo_id = :cicloId
            `, {
                replacements: { cicloId: id },
                type: sequelize.QueryTypes.SELECT
            });
        } catch (usuarioError) {
            logger.warn('Error consultando usuarios por ciclo:', usuarioError.message);
        }
        
        try {
            // Carreras activas en el ciclo
            carrerasStats = await sequelize.query(`
                SELECT COUNT(DISTINCT c.id) as total 
                FROM carreras c 
                INNER JOIN asignaturas a ON c.id = a.carrera_id
                INNER JOIN docente_asignaturas da ON a.id = da.asignatura_id
                WHERE da.ciclo_id = :cicloId
            `, {
                replacements: { cicloId: id },
                type: sequelize.QueryTypes.SELECT
            });
        } catch (carreraError) {
            logger.warn('Error consultando carreras por ciclo:', carreraError.message);
        }
        
        try {
            // Asignaturas del ciclo
            asignaturasStats = await sequelize.query(`
                SELECT COUNT(DISTINCT a.id) as total 
                FROM asignaturas a 
                INNER JOIN docente_asignaturas da ON a.id = da.asignatura_id
                WHERE da.ciclo_id = :cicloId
            `, {
                replacements: { cicloId: id },
                type: sequelize.QueryTypes.SELECT
            });
        } catch (asignaturaError) {
            logger.warn('Error consultando asignaturas por ciclo:', asignaturaError.message);
        }
        
        // Estadísticas de verificadores (usuarios con rol verificador en este ciclo)
        let verificadoresCount = [{ total: 0 }];
        try {
            verificadoresCount = await sequelize.query(`
                SELECT COUNT(DISTINCT u.id) as total 
                FROM usuarios u 
                INNER JOIN usuario_roles ur ON u.id = ur.usuario_id
                WHERE ur.rol = 'verificador'
            `, {
                type: sequelize.QueryTypes.SELECT
            });
        } catch (verificadorError) {
            logger.warn('Error consultando verificadores, usando valor por defecto:', verificadorError.message);
        }
        
        // Obtener estado del ciclo
        const estadosModulos = await EstadoSistema.findAll({
            where: { ciclo_id: id },
            order: [['modulo', 'ASC']]
        });
        
        // Construir respuesta con estadísticas
        const estadisticas = {
            ciclo_id: id,
            nombre: ciclo.nombre,
            estado: ciclo.estado,
            activo: ciclo.estado === 'activo',
            
            // Conteos principales
            usuarios: usuariosStats[0]?.total || 0,
            carreras: carrerasStats[0]?.total || 0,
            asignaturas: asignaturasStats[0]?.total || 0,
            portafolios: portafoliosStats || 0,
            asignaciones: asignacionesStats || 0,
            verificaciones: verificadoresCount[0]?.total || 0,
            codigos: 0, // Se puede implementar si hay tabla de códigos institucionales
            
            // Estados de módulos
            modulos: estadosModulos.reduce((acc, estado) => {
                acc[estado.modulo] = {
                    habilitado: estado.habilitado,
                    actualizado_en: estado.actualizado_en
                };
                return acc;
            }, {}),
            
            // Fechas
            fecha_inicio: ciclo.fecha_inicio,
            fecha_fin: ciclo.fecha_fin,
            creado_en: ciclo.creado_en,
            actualizado_en: ciclo.actualizado_en,
            
            // Metas estimadas (se pueden configurar por ciclo)
            usuariosEsperados: ciclo.configuracion?.metas?.usuarios || 100,
            carrerasEsperadas: ciclo.configuracion?.metas?.carreras || 20,
            asignaturasEsperadas: ciclo.configuracion?.metas?.asignaturas || 200,
            portafoliosEsperados: ciclo.configuracion?.metas?.portafolios || 300
        };
        
        return res.status(200).json({
            success: true,
            data: estadisticas,
            message: 'Estadísticas del ciclo obtenidas exitosamente'
        });
        
    } catch (error) {
        logger.error('Error al obtener estadísticas del ciclo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas del ciclo',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
        });
    }
};

/**
 * Obtener archivos de carga masiva asociados a un ciclo académico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerArchivosCargaPorCiclo = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el ciclo existe
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
        
        // Obtener archivos de carga masiva del ciclo con información del usuario
        const ArchivoCargaMasiva = require('../modelos/ArchivoCargaMasiva');
        const Usuario = require('../modelos/Usuario');
        
        const archivos = await ArchivoCargaMasiva.findAll({
            where: {
                ciclo_id: id,
                estado: ['activo', 'procesado']
            },
            include: [
                {
                    model: Usuario,
                    as: 'subidoPor',
                    attributes: ['id', 'nombres', 'apellidos', 'correo']
                }
            ],
            order: [['fecha_subida', 'DESC']]
        });
        
        // Formatear respuesta para el frontend
        const archivosFormateados = archivos.map(archivo => ({
            id: archivo.id,
            tipo: archivo.tipo_archivo,
            nombre_original: archivo.nombre_original,
            tamanio_bytes: archivo.tamanio_bytes,
            tamanio_formateado: archivo.formatearTamano(),
            registros_procesados: archivo.registros_procesados,
            registros_errores: archivo.registros_errores,
            estado: archivo.estado,
            fecha_subida: archivo.fecha_subida,
            fecha_procesamiento: archivo.fecha_procesamiento,
            resumen: archivo.obtenerResumenProcesamiento(),
            subido_por: archivo.subidoPor ? {
                id: archivo.subidoPor.id,
                nombre: `${archivo.subidoPor.nombres} ${archivo.subidoPor.apellidos}`,
                correo: archivo.subidoPor.correo
            } : null,
            detalles_procesamiento: archivo.detalles_procesamiento
        }));
        
        logger.info(`Archivos encontrados para ciclo ${id}: ${archivos.length}`);
        
        return res.status(200).json({
            success: true,
            data: archivosFormateados,
            ciclo: {
                id: ciclo.id,
                nombre: ciclo.nombre,
                estado: ciclo.estado,
                puedeRecibirArchivos: ['preparacion', 'inicializacion'].includes(ciclo.estado),
                estaEnVerificacion: ciclo.estado === 'verificacion',
                puedeSerActivado: ciclo.estado === 'preparacion',
                puedeSerFinalizado: ciclo.estado === 'verificacion'
            },
            total: archivos.length,
            message: archivos.length > 0 ? 
                `Se encontraron ${archivos.length} archivos de carga` : 
                'No hay archivos de carga para este ciclo'
        });
        
    } catch (error) {
        logger.error('Error al obtener archivos de carga por ciclo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener archivos de carga',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
        });
    }
};

// ===============================
// FUNCIONES DE VALIDACIÓN
// ===============================

/**
 * Valida el cambio de estado de un ciclo
 */
async function validarCambioEstado(estadoActual, nuevoEstado, cicloId) {
    const transicionesValidas = {
        'preparacion': ['activo', 'cerrado', 'archivado'],
        'activo': ['cerrado', 'archivado', 'preparacion'],
        'cerrado': ['archivado', 'preparacion', 'activo'],
        'archivado': ['preparacion'] // Permitir reactivar desde archivado
    };
    
    if (!transicionesValidas[estadoActual].includes(nuevoEstado)) {
        return {
            valido: false,
            mensaje: `No se puede cambiar de estado "${estadoActual}" a "${nuevoEstado}"`
        };
    }
    
    // Si se quiere activar, verificar que no haya otro ciclo activo
    if (nuevoEstado === 'activo') {
        const cicloActivo = await CicloAcademico.findOne({
            where: { 
                estado: 'activo',
                id: { [Op.ne]: cicloId }
            },
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        if (cicloActivo) {
            return {
                valido: false,
                mensaje: `Ya existe un ciclo activo: "${cicloActivo.nombre}". Solo puede haber un ciclo activo a la vez.`
            };
        }
    }
    
    return { valido: true };
}

/**
 * Cambiar estado de un ciclo académico
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.cambiarEstadoCiclo = async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevoEstado, usuario_id } = req.body;
        
        logger.info(`Cambiando estado del ciclo ${id} a: ${nuevoEstado}`);
        
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
        
        // Validar estados válidos
        const estadosValidos = ['preparacion', 'inicializacion', 'activo', 'verificacion', 'finalizacion', 'archivado'];
        if (!estadosValidos.includes(nuevoEstado)) {
            return res.status(400).json({
                success: false,
                message: `Estado no válido: ${nuevoEstado}`
            });
        }
        
        // Usar el método del modelo para cambiar estado con validaciones
        await ciclo.cambiarEstado(nuevoEstado, usuario_id || req.usuario?.id);
        
        logger.info(`Estado del ciclo ${id} cambiado exitosamente a: ${nuevoEstado}`);
        
        return res.json({
            success: true,
            message: `Ciclo actualizado a estado: ${nuevoEstado}`,
            data: {
                id: ciclo.id,
                nombre: ciclo.nombre,
                estado: ciclo.estado,
                fecha_inicializacion: ciclo.fecha_inicializacion,
                fecha_activacion: ciclo.fecha_activacion,
                fecha_inicio_verificacion: ciclo.fecha_inicio_verificacion,
                fecha_cierre_real: ciclo.fecha_cierre_real,
                puedeRecibirArchivos: ['preparacion', 'inicializacion'].includes(ciclo.estado),
                estaEnVerificacion: ciclo.estado === 'verificacion',
                puedeSerActivado: ciclo.estado === 'preparacion',
                puedeSerFinalizado: ciclo.estado === 'verificacion',
                configuracion_estados: ciclo.configuracion_estados
            }
        });
        
    } catch (error) {
        logger.error('Error al cambiar estado del ciclo:', error);
        
        // Manejar errores específicos de validación
        if (error.message.includes('Transición no válida') || 
            error.message.includes('Solo puede haber') ||
            error.message.includes('Solo se puede')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Error al cambiar estado del ciclo',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor'
        });
    }
};

/**
 * Valida la secuencia de habilitación de módulos
 */
async function validarSecuenciaModulos(cicloId, modulo, habilitado) {
    const secuenciaModulos = ['carga_datos', 'gestion_documentos', 'verificacion', 'reportes'];
    const indiceModulo = secuenciaModulos.indexOf(modulo);
    
    if (indiceModulo === -1) {
        return {
            valido: false,
            mensaje: 'Módulo no válido'
        };
    }
    
    if (habilitado) {
        // Para habilitar un módulo, los anteriores deben estar habilitados
        for (let i = 0; i < indiceModulo; i++) {
            const moduloAnterior = secuenciaModulos[i];
            const estadoAnterior = await EstadoSistema.findOne({
                where: {
                    ciclo_id: cicloId,
                    modulo: moduloAnterior
                }
            });
            
            if (!estadoAnterior || !estadoAnterior.habilitado) {
                return {
                    valido: false,
                    mensaje: `Debe habilitar primero el módulo: ${moduloAnterior}`
                };
            }
        }
    } else {
        // Para deshabilitar un módulo, los posteriores deben estar deshabilitados
        for (let i = indiceModulo + 1; i < secuenciaModulos.length; i++) {
            const moduloPosterior = secuenciaModulos[i];
            const estadoPosterior = await EstadoSistema.findOne({
                where: {
                    ciclo_id: cicloId,
                    modulo: moduloPosterior
                }
            });
            
            if (estadoPosterior && estadoPosterior.habilitado) {
                return {
                    valido: false,
                    mensaje: `Debe deshabilitar primero el módulo: ${moduloPosterior}`
                };
            }
        }
    }
    
    return { valido: true };
}
