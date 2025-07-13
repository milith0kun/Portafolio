require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, testConnection } = require('./config/database');
const http = require('http');
const net = require('net');
const config = require('./config/env');
const path = require('path');
const { logger, info, error: logError } = require('./config/logger');
const ResponseHandler = require('./controladores/utils/responseHandler');

// Importar modelos y asociaciones
require('./modelos/asociaciones');

// Importar rutas
const authRoutes = require('./rutas/auth');
const usuarioRoutes = require('./rutas/usuarios');
const ciclosRoutes = require('./rutas/ciclos');
const carrerasRoutes = require('./rutas/carreras');
const asignaturasRoutes = require('./rutas/asignaturas');
const inicializacionRoutes = require('./rutas/inicializacion');
const reportesRoutes = require('./rutas/reportes');
const dashboardRoutes = require('./rutas/dashboard');
const actividadesRoutes = require('./rutas/actividades');
const portafoliosRoutes = require('./rutas/portafolios');
const documentosRoutes = require('./rutas/documentos');
const verificacionesRoutes = require('./rutas/verificaciones');
const archivosRoutes = require('./rutas/archivos');
const notificacionesRoutes = require('./rutas/notificaciones');

info('🚀 Iniciando servidor Portafolio Docente UNSAAC...');
info(`Puerto configurado: ${config.PORT}`);

// Inicializar la aplicación Express
const app = express();

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? config.FRONTEND_URL : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Logging de requests
app.use((req, res, next) => {
    info(`📝 ${req.method} ${req.url}`);
    next();
});

// Configuración de rutas estáticas
const frontendPath = path.join(__dirname, '..', 'FRONTEND');
app.use(express.static(frontendPath));
app.use('/assets', express.static(path.join(frontendPath, 'assets')));

// Rutas de páginas
app.get('/', (req, res) => res.redirect('/inicio'));
app.get('/inicio', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(frontendPath, 'paginas', 'autenticacion', 'login.html')));

// Ruta de prueba de API
app.get('/api', (req, res) => {
    ResponseHandler.success(res, {
        mensaje: 'API del Portafolio Docente UNSAAC',
        version: '1.0.0',
        estado: 'activo',
        timestamp: new Date().toISOString()
    }, 'API funcionando correctamente');
});

// Configuración de rutas API
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/ciclos', ciclosRoutes);
app.use('/api/carreras', carrerasRoutes);
app.use('/api/asignaturas', asignaturasRoutes);
app.use('/api/inicializacion', inicializacionRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/actividades', actividadesRoutes);
app.use('/api/portafolios', portafoliosRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/verificaciones', verificacionesRoutes);
app.use('/api/archivos', archivosRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
    logError(`Ruta no encontrada: ${req.method} ${req.path}`);
    ResponseHandler.notFound(res, 'Ruta');
});

// Manejador global de errores
app.use((err, req, res, next) => {
    logError(`Error del servidor: ${err.message}`);
    
    ResponseHandler.serverError(res, err, 'Error interno del servidor');
});

// Función para verificar puerto
const isPortAvailable = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                info(`⚠️ Puerto ${port} en uso`);
                resolve(false);
            } else {
                resolve(false);
            }
        });
        
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        
        server.listen(port);
    });
};

// Función principal de inicio
const startServer = async () => {
    try {
        info('⏳ Verificando conexión a la base de datos...');
        const dbConnected = await testConnection();
        if (!dbConnected) {
            throw new Error('No se pudo conectar a la base de datos');
        }

        info('⏳ Sincronizando modelos...');
        await sequelize.sync({ force: false });
        info('✅ Modelos sincronizados');

        const portAvailable = await isPortAvailable(config.PORT);
        if (!portAvailable) {
            throw new Error(`Puerto ${config.PORT} no disponible`);
        }

        const server = http.createServer(app);
        
        server.listen(config.PORT, () => {
            info('🎉 Servidor iniciado exitosamente');
            info(`🌐 Acceso web:     http://localhost:${config.PORT}`);
            info(`🔑 Login:         http://localhost:${config.PORT}/login`);
            info(`🛠️  API:           http://localhost:${config.PORT}/api`);
        });

        // Manejo de cierre gracioso
        const shutdown = () => {
            info('👋 Cerrando servidor...');
            server.close(async () => {
                try {
                    await sequelize.close();
                    info('✅ Servidor cerrado correctamente');
                    process.exit(0);
                } catch (err) {
                    logError('Error al cerrar conexión de BD', err);
                    process.exit(1);
                }
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        logError('Error al iniciar servidor', error);
        process.exit(1);
    }
};

// Iniciar servidor
startServer();

module.exports = app;
