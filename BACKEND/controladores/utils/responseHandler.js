/**
 * Manejador estandarizado de respuestas HTTP
 */
class ResponseHandler {
    /**
     * Respuesta exitosa estándar
     * @param {Object} res - Objeto de respuesta Express
     * @param {*} data - Datos a devolver
     * @param {string} [message='Operación exitosa'] - Mensaje descriptivo
     * @param {number} [status=200] - Código de estado HTTP
     */
    static success(res, data, message = 'Operación exitosa', status = 200) {
        res.status(status).json({
            success: true,
            message,
            data
        });
    }

    /**
     * Respuesta de error
     * @param {Object} res - Objeto de respuesta Express
     * @param {string} message - Mensaje de error
     * @param {number} [status=500] - Código de estado HTTP
     * @param {Error} [error] - Objeto de error opcional
     */
    static error(res, message, status = 500, error = null) {
        const response = {
            success: false,
            message,
            error: process.env.NODE_ENV === 'development' && error ? error.message : undefined
        };

        if (process.env.NODE_ENV === 'development' && error) {
            console.error('Error:', error);
        }

        res.status(status).json(response);
    }

    /**
     * Respuesta de validación fallida
     * @param {Object} res - Objeto de respuesta Express
     * @param {Array} errors - Array de errores de validación
     */
    static validationError(res, errors) {
        res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors
        });
    }

    /**
     * Respuesta de recurso no encontrado
     * @param {Object} res - Objeto de respuesta Express
     * @param {string} [resource='Recurso'] - Nombre del recurso no encontrado
     */
    static notFound(res, resource = 'Recurso') {
        res.status(404).json({
            success: false,
            message: `${resource} no encontrado`
        });
    }

    /**
     * Respuesta de acceso denegado
     * @param {Object} res - Objeto de respuesta Express
     * @param {string} [message='No autorizado'] - Mensaje de error
     */
    static unauthorized(res, message = 'No autorizado') {
        res.status(401).json({
            success: false,
            message
        });
    }

    /**
     * Respuesta de acceso prohibido
     * @param {Object} res - Objeto de respuesta Express
     * @param {string} [message='Acceso prohibido'] - Mensaje de error
     */
    static forbidden(res, message = 'Acceso prohibido') {
        res.status(403).json({
            success: false,
            message
        });
    }

    /**
     * Respuesta de solicitud incorrecta
     * @param {Object} res - Objeto de respuesta Express
     * @param {string} [message='Solicitud incorrecta'] - Mensaje de error
     */
    static badRequest(res, message = 'Solicitud incorrecta') {
        res.status(400).json({
            success: false,
            message
        });
    }

    /**
     * Respuesta de error de servidor
     * @param {Object} res - Objeto de respuesta Express
     * @param {Error} error - Objeto de error
     * @param {string} [context=''] - Contexto del error
     */
    static serverError(res, error, context = '') {
        const errorMessage = context ? `${context}: ${error.message}` : error.message;
        console.error('Error del servidor:', errorMessage, '\nStack:', error.stack);
        
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
}

module.exports = ResponseHandler;
