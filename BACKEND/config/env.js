// Configuración de variables de entorno con valores por defecto
module.exports = {
  // Base de datos
  DB_NAME: process.env.DB_NAME || 'portafolio_docente_carga_academica',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '19972281qA',
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: process.env.DB_PORT || 3306,
  
  // Servidor
  PORT: process.env.PORT || 4001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'clave_secreta_portafolio_docente_unsaac_2024',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  
  // Archivos
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 10485760, // 10MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  
  // Frontend URL (para CORS)
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:4001'
}; 