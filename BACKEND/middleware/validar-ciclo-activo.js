/**
 * Middleware para validar que exista un ciclo activo
 * Los docentes y verificadores necesitan un ciclo activo para trabajar
 */

const { CicloAcademico } = require('../modelos');
const { logger } = require('../config/logger');

/**
 * Verifica que exista exactamente un ciclo activo para docentes
 * @param {Object} req - Request object
 * @param {Object} res - Response object  
 * @param {Function} next - Next middleware
 */
const validarCicloActivoParaDocente = async (req, res, next) => {
    try {
        // Obtener el rol del usuario desde el token
        const usuarioRol = req.usuario?.rol;
        
        // Solo aplicar esta validación a docentes
        if (usuarioRol !== 'docente') {
            return next();
        }
        
        // Verificar que existe un ciclo activo
        const cicloActivo = await CicloAcademico.findOne({
            where: { estado: 'activo' },
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        if (!cicloActivo) {
            logger.warn(`Acceso denegado a docente ${req.usuario.id}: No hay ciclo activo`);
            return res.status(403).json({
                success: false,
                message: 'No hay un ciclo académico activo',
                error: 'Los docentes necesitan un ciclo académico activo para acceder al sistema',
                codigo: 'NO_CICLO_ACTIVO'
            });
        }
        
        // Agregar el ciclo activo al request para uso posterior
        req.cicloActivo = cicloActivo;
        
        logger.info(`Docente ${req.usuario.id} accede con ciclo activo: ${cicloActivo.nombre}`);
        next();
        
    } catch (error) {
        logger.error('Error al validar ciclo activo para docente:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al verificar ciclo activo',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * Verifica que exista un ciclo en estado activo o verificación para verificadores
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
const validarCicloActivoParaVerificador = async (req, res, next) => {
    try {
        // Obtener el rol del usuario desde el token
        const usuarioRol = req.usuario?.rol;
        
        // Solo aplicar esta validación a verificadores
        if (usuarioRol !== 'verificador') {
            return next();
        }
        
        // Verificar que existe un ciclo activo o en verificación
        const cicloEnProceso = await CicloAcademico.findOne({
            where: { 
                estado: ['activo', 'verificacion'] 
            },
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        if (!cicloEnProceso) {
            logger.warn(`Acceso denegado a verificador ${req.usuario.id}: No hay ciclo en proceso`);
            return res.status(403).json({
                success: false,
                message: 'No hay un ciclo académico en proceso',
                error: 'Los verificadores necesitan un ciclo en estado activo o verificación para acceder',
                codigo: 'NO_CICLO_EN_PROCESO'
            });
        }
        
        // Agregar el ciclo en proceso al request
        req.cicloEnProceso = cicloEnProceso;
        
        logger.info(`Verificador ${req.usuario.id} accede con ciclo ${cicloEnProceso.estado}: ${cicloEnProceso.nombre}`);
        next();
        
    } catch (error) {
        logger.error('Error al validar ciclo activo para verificador:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al verificar ciclo en proceso',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * Middleware combinado que valida según el rol del usuario
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
const validarCicloSegunRol = async (req, res, next) => {
    try {
        const usuarioRol = req.usuario?.rol;
        
        switch (usuarioRol) {
            case 'docente':
                return validarCicloActivoParaDocente(req, res, next);
            case 'verificador':
                return validarCicloActivoParaVerificador(req, res, next);
            case 'administrador':
                // Los administradores pueden acceder siempre
                return next();
            default:
                logger.warn(`Rol desconocido intentando acceder: ${usuarioRol}`);
                return res.status(403).json({
                    success: false,
                    message: 'Rol no reconocido',
                    error: 'El rol del usuario no está autorizado'
                });
        }
        
    } catch (error) {
        logger.error('Error en validación de ciclo según rol:', error);
        return res.status(500).json({
            success: false,
            message: 'Error en validación de acceso',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * Verifica que solo haya un ciclo activo en el sistema
 * Middleware para endpoints administrativos críticos
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
const validarCicloActivoUnico = async (req, res, next) => {
    try {
        const ciclosActivos = await CicloAcademico.findAll({
            where: { estado: 'activo' },
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        if (ciclosActivos.length > 1) {
            logger.error(`INCONSISTENCIA: ${ciclosActivos.length} ciclos activos encontrados`);
            return res.status(500).json({
                success: false,
                message: 'Inconsistencia en el sistema',
                error: `Se encontraron ${ciclosActivos.length} ciclos activos. Solo debe haber uno.`,
                codigo: 'MULTIPLE_CICLOS_ACTIVOS',
                ciclos: ciclosActivos.map(c => ({ id: c.id, nombre: c.nombre }))
            });
        }
        
        req.ciclosActivos = ciclosActivos;
        next();
        
    } catch (error) {
        logger.error('Error al validar unicidad de ciclo activo:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al verificar consistencia del sistema',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
        });
    }
};

/**
 * Obtiene información del ciclo activo y la adjunta al request
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
const obtenerCicloActivo = async (req, res, next) => {
    try {
        const cicloActivo = await CicloAcademico.findOne({
            where: { estado: 'activo' },
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            },
            include: [{
                model: require('../modelos').EstadoSistema,
                as: 'estados_sistema'
            }]
        });
        
        req.cicloActivo = cicloActivo;
        req.hayCicloActivo = !!cicloActivo;
        
        if (cicloActivo) {
            logger.debug(`Ciclo activo obtenido: ${cicloActivo.nombre}`);
        } else {
            logger.debug('No hay ciclo activo en el sistema');
        }
        
        next();
        
    } catch (error) {
        logger.error('Error al obtener ciclo activo:', error);
        // No bloquear la ejecución, solo loggear el error
        req.cicloActivo = null;
        req.hayCicloActivo = false;
        next();
    }
};

module.exports = {
    validarCicloActivoParaDocente,
    validarCicloActivoParaVerificador,
    validarCicloSegunRol,
    validarCicloActivoUnico,
    obtenerCicloActivo
};