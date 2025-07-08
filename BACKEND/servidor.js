require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, testConnection } = require('./config/database');
const http = require('http');
const net = require('net');
const config = require('./config/env');
const path = require('path');
const fs = require('fs');

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

console.log('🚀 Iniciando servidor del Portafolio Docente UNSAAC...');

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

// Logging simplificado
app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.url}`);
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
    res.json({ 
        mensaje: 'API del Portafolio Docente UNSAAC',
        version: '1.0.0',
        estado: 'activo'
    });
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

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
    res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.path
    });
});

// Manejador global de errores
app.use((err, req, res, next) => {
    console.error('❌ Error del servidor:', err.message);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
    });
});

// Función para verificar puerto
const isPortAvailable = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`⚠️ Puerto ${port} en uso`);
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
        console.log('⏳ Verificando conexión a la base de datos...');
        const dbConnected = await testConnection();
        if (!dbConnected) {
            throw new Error('No se pudo conectar a la base de datos');
        }

        console.log('⏳ Sincronizando modelos...');
        await sequelize.sync({ force: false });
        console.log('✅ Modelos sincronizados');

        const portAvailable = await isPortAvailable(config.PORT);
        if (!portAvailable) {
            throw new Error(`Puerto ${config.PORT} no disponible`);
        }

        const server = http.createServer(app);
        
        server.listen(config.PORT, () => {
            console.log(`
🎉 ¡Servidor iniciado exitosamente!
📡 URL: http://localhost:${config.PORT}
🔒 Modo: ${process.env.NODE_ENV || 'development'}
📅 ${new Date().toLocaleString()}
            `);
        });

        // Manejo de cierre gracioso
        const shutdown = () => {
            console.log('\n👋 Cerrando servidor...');
            server.close(() => {
                sequelize.close();
                console.log('✅ Servidor cerrado correctamente');
                process.exit(0);
            });
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);

    } catch (error) {
        console.error('❌ Error al iniciar:', error.message);
        process.exit(1);
    }
};

// Iniciar servidor
startServer();

module.exports = app;
