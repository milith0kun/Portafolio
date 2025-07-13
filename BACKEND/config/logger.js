const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Crear directorio de logs si no existe
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Formato simple y limpio
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
);

// Crear logger simple
const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        // Archivo de errores
        new winston.transports.File({ 
            filename: path.join(logDir, 'error.log'), 
            level: 'error'
        }),
        // Archivo de todos los logs
        new winston.transports.File({ 
            filename: path.join(logDir, 'combined.log')
        })
    ]
});

// Consola con colores solo en desarrollo
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            logFormat
        )
    }));
}

// Métodos simples y útiles
const info = (message) => logger.info(message);
const error = (message) => logger.error(message);
const warn = (message) => logger.warn(message);
const debug = (message) => {
    if (process.env.NODE_ENV !== 'production') {
        logger.debug(message);
    }
};

module.exports = {
    logger,
    info,
    error,
    warn,
    debug
};
