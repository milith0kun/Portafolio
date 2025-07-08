const { Actividad, Usuario } = require('../modelos');
const { Op } = require('sequelize');
const { logger } = require('../config/logger');

/**
 * Obtiene las actividades recientes
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
exports.obtenerActividadesRecientes = async (req, res) => {
    try {
        // Verificar que los modelos estén disponibles
        if (!Actividad || !Usuario) {
            throw new Error('Modelos no disponibles');
        }

        // Obtener las últimas 10 actividades ordenadas por fecha de creación descendente
        const actividades = await Actividad.findAll({
            limit: 10,
            order: [['fecha_creacion', 'DESC']],
            include: [{
                model: Usuario,
                as: 'usuario',
                attributes: ['id', 'nombres', 'apellidos', 'correo'],
                required: true // Cambiar a true ya que usuario_id es requerido
            }],
            attributes: [
                'id',
                'tipo',
                'modulo',
                'descripcion',
                'fecha_creacion',
                'ip_origen'
            ]
        });

        // Formatear la respuesta
        const actividadesFormateadas = actividades.map(actividad => ({
            id: actividad.id,
            tipo: actividad.tipo,
            modulo: actividad.modulo,
            descripcion: actividad.descripcion,
            fecha: actividad.fecha_creacion,
            ip: actividad.ip_origen,
            usuario: actividad.usuario ? {
                id: actividad.usuario.id,
                nombre: `${actividad.usuario.nombres} ${actividad.usuario.apellidos}`.trim(),
                correo: actividad.usuario.correo
            } : { id: null, nombre: 'Sistema', correo: 'sistema@unsaac.edu.pe' }
        }));

        return res.status(200).json({
            success: true,
            data: actividadesFormateadas
        });
    } catch (error) {
        // Log detallado del error
        logger.error('Error al obtener actividades recientes:', {
            error: error.message,
            stack: error.stack,
            name: error.name,
            request: {
                method: req.method,
                url: req.originalUrl,
                params: req.params,
                query: req.query,
                body: req.body
            },
            timestamp: new Date().toISOString()
        });
        
        // Respuesta detallada en desarrollo, genérica en producción
        return res.status(500).json({
            success: false,
            message: 'Error al obtener actividades recientes',
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                name: error.name,
                ...(error.errors && { errors: error.errors })
            } : 'Error interno del servidor',
            requestId: req.id || 'no-request-id',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Registra una nueva actividad en el sistema
 * @param {Object} datos - Datos de la actividad a registrar
 * @param {number} [usuarioId=null] - ID del usuario que realiza la acción
 * @param {Object} [req=null] - Objeto de solicitud Express (opcional, para obtener IP y User-Agent)
 */
exports.registrarActividad = async (datos, usuarioId = null, req = null) => {
    try {
        const actividadData = {
            tipo: datos.tipo || 'sistema',
            modulo: datos.modulo || 'sistema',
            descripcion: datos.descripcion || 'Actividad sin descripción',
            datos_adicionales: datos.datos_adicionales || null,
            usuario_id: usuarioId,
            ip_origen: null,
            user_agent: null
        };

        // Obtener información de la solicitud si está disponible
        if (req) {
            // Obtener IP del cliente (teniendo en cuenta proxies)
            const ip = req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     (req.connection.socket ? req.connection.socket.remoteAddress : null);
            
            actividadData.ip_origen = ip;
            actividadData.user_agent = req.headers['user-agent'] || null;
        }

        // Crear la actividad
        await Actividad.create(actividadData);
        
        return true;
    } catch (error) {
  
        
        return false;
    }
};
