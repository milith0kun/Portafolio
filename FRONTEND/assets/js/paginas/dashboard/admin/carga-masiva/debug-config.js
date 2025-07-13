/**
 * Configuración de Debug para Carga Masiva
 * Maneja errores de autenticación y conexión temporalmente
 */

class DebugConfig {
    constructor() {
        this.debugMode = false;
        this.mockAuth = false; // Desactivado para forzar uso de API real
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.interceptorConfigured = false;
        this.peticionesEnProceso = new Set(); // Para evitar bucles infinitos
        this.originalApiRequest = null;
        this.originalFetch = null;
        this.setupComplete = false;
        this.errores500Detectados = new Set(); // Para rastrear endpoints con errores
        
        // Configurar inmediatamente en el constructor
        this.configurarDebug();
    }

    /**
     * Configurar modo debug
     */
    configurarDebug() {
        if (this.debugMode) {
            // Interceptar errores de autenticación inmediatamente
            this.interceptarErroresAuth();
            
            // Configurar timeouts más largos para desarrollo
            this.configurarTimeouts();
            
            console.log('🔧 Modo debug activado para carga masiva');
        }
    }

    /**
     * Interceptar errores de autenticación
     */
    interceptarErroresAuth() {
        if (this.interceptorConfigured) {
            return; // Ya está configurado
        }
        
        // Configurar interceptor inmediatamente
        this.configurarInterceptor();
        
        // También configurar cuando window.apiRequest esté disponible
        const setupInterceptor = () => {
            if (!window.apiRequest) {
                setTimeout(setupInterceptor, 10); // Reducir delay significativamente
                return;
            }
            
            // Solo configurar si no se ha hecho ya
            if (!this.setupComplete) {
                this.configurarInterceptor();
            }
        };
        
        setupInterceptor();
    }

    /**
     * Configurar el interceptor
     */
    configurarInterceptor() {
        if (this.setupComplete) {
            return;
        }
        
        // Guardar función original si existe
        if (window.apiRequest && !this.originalApiRequest) {
            this.originalApiRequest = window.apiRequest;
        }
        
        // Guardar fetch original
        if (typeof fetch !== 'undefined' && !this.originalFetch) {
            this.originalFetch = fetch;
        }
        
        // Interceptar peticiones apiRequest
        if (window.apiRequest) {
            window.apiRequest = async (endpoint, method = 'GET', data = null, auth = true) => {
                // Crear clave única para la petición
                const peticionKey = `${method}:${endpoint}:${JSON.stringify(data)}`;
                
                // Si ya está en proceso, devolver datos mock
                if (this.peticionesEnProceso.has(peticionKey)) {
                    console.warn('🔧 Petición duplicada detectada, usando datos mock:', endpoint);
                    return this.obtenerDatosMock(endpoint);
                }
                
                // Si el endpoint ya tuvo errores 500, usar mock directamente
                if (this.errores500Detectados.has(endpoint)) {
                    console.log(`🔧 Endpoint con errores 500 conocidos, usando datos mock: ${endpoint}`);
                    return this.obtenerDatosMock(endpoint);
                }
                
                // Marcar como en proceso
                this.peticionesEnProceso.add(peticionKey);
                
                try {
                    // Si no hay función original, usar datos mock
                    if (!this.originalApiRequest) {
                        console.warn('🔧 No hay función API original, usando datos mock:', endpoint);
                        return this.obtenerDatosMock(endpoint);
                    }
                    
                    // Intentar petición original
                    const resultado = await this.originalApiRequest(endpoint, method, data, auth);
                    this.peticionesEnProceso.delete(peticionKey);
                    return resultado;
                    
                } catch (error) {
                    this.peticionesEnProceso.delete(peticionKey);
                    
                    // Si es error 500, marcar endpoint y usar mock
                    if (error.status === 500 || error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
                        console.warn(`🔧 Error 500 detectado en ${endpoint}, marcando para usar datos mock`);
                        this.errores500Detectados.add(endpoint);
                        return this.obtenerDatosMock(endpoint);
                    }
                    
                    // Si es error de servidor y estamos en modo debug, usar datos mock
                    if ((error.status === 401 || error.status === 500 || 
                         error.message?.includes('TOKEN_INVALIDO') || 
                         error.message?.includes('Error obteniendo') || 
                         error.message?.includes('Error en la petición') ||
                         error.message?.includes('Internal Server Error'))) {
                        console.warn(`🔧 Error ${error.status || 'SERVER'} interceptado, usando datos mock para:`, endpoint);
                        this.errores500Detectados.add(endpoint);
                        return this.obtenerDatosMock(endpoint);
                    }
                    
                    // Para otros errores, lanzar excepción
                    throw error;
                }
            };
        }
        
        // Interceptar peticiones fetch directamente
        if (this.originalFetch) {
            window.fetch = async (url, options = {}) => {
                // Solo interceptar peticiones a nuestro backend
                if (typeof url === 'string' && url.includes('localhost:4000')) {
                    const endpoint = this.extraerEndpoint(url);
                    
                    // Si el endpoint ya tuvo errores 500, devolver respuesta mock
                    if (this.errores500Detectados.has(endpoint)) {
                        console.log(`🔧 Interceptando fetch con datos mock para endpoint con errores 500: ${endpoint}`);
                        return this.crearRespuestaMock(endpoint);
                    }
                    
                    // Crear clave única para la petición
                    const peticionKey = `${options.method || 'GET'}:${endpoint}`;
                    
                    // Si ya está en proceso, devolver datos mock
                    if (this.peticionesEnProceso.has(peticionKey)) {
                        console.warn('🔧 Fetch duplicado detectado, usando datos mock:', endpoint);
                        return this.crearRespuestaMock(endpoint);
                    }
                    
                    // Marcar como en proceso
                    this.peticionesEnProceso.add(peticionKey);
                    
                    try {
                        // Intentar petición original
                        const response = await this.originalFetch.call(window, url, options);
                        
                        // Si es error 500, marcar endpoint y usar datos mock
                        if (response.status === 500) {
                            console.warn(`🔧 Error 500 detectado en fetch para ${endpoint}, marcando para usar datos mock`);
                            this.errores500Detectados.add(endpoint);
                            this.peticionesEnProceso.delete(peticionKey);
                            return this.crearRespuestaMock(endpoint);
                        }
                        
                        this.peticionesEnProceso.delete(peticionKey);
                        return response;
                        
                    } catch (error) {
                        this.peticionesEnProceso.delete(peticionKey);
                        
                        // Para cualquier error de red, marcar endpoint y usar datos mock
                        console.warn(`🔧 Error de red interceptado en fetch para ${endpoint}, marcando para usar datos mock`);
                        this.errores500Detectados.add(endpoint);
                        return this.crearRespuestaMock(endpoint);
                    }
                }
                
                // Para otras URLs, usar fetch original
                return this.originalFetch.call(window, url, options);
            };
        }
        
        this.interceptorConfigured = true;
        this.setupComplete = true;
        console.log('🔧 Interceptor de API y fetch configurado correctamente');
    }

    /**
     * Extraer endpoint de URL
     */
    extraerEndpoint(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.pathname;
        } catch (error) {
            return url;
        }
    }

    /**
     * Crear respuesta mock para fetch
     */
    crearRespuestaMock(endpoint) {
        const mockData = this.obtenerDatosMock(endpoint);
        
        return new Response(JSON.stringify(mockData), {
            status: 200,
            statusText: 'OK',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Obtener datos mock para desarrollo
     */
    obtenerDatosMock(endpoint) {
        const mockData = {
            '/ciclos': {
                success: true,
                exito: true,
                data: [
                    { id: 1, nombre: 'Ciclo 2024-I', estado: 'activo', anio_actual: 2024 },
                    { id: 2, nombre: 'Ciclo 2024-II', estado: 'inactivo', anio_actual: 2024 }
                ],
                total: 2
            },
            '/usuarios': {
                success: true,
                exito: true,
                data: [
                    { 
                        id: 1, 
                        nombres: 'Administrador', 
                        apellidos: 'Sistema', 
                        correo: 'admin@unsaac.edu.pe', 
                        dni: '12345678',
                        roles: [{ nombre: 'administrador' }],
                        activo: true,
                        createdAt: new Date().toISOString()
                    },
                    { 
                        id: 2, 
                        nombres: 'Juan Carlos', 
                        apellidos: 'Pérez Mamani', 
                        correo: 'jperez@unsaac.edu.pe', 
                        dni: '87654321',
                        roles: [{ nombre: 'docente' }],
                        activo: true,
                        createdAt: new Date().toISOString()
                    }
                ],
                total: 2
            },
            '/carreras': {
                success: true,
                exito: true,
                data: [
                    { id: 1, codigo: 'ING-INF', nombre: 'Ingeniería Informática y de Sistemas', facultad: 'Ingeniería', duracion_semestres: 10, activo: true },
                    { id: 2, codigo: 'ING-SIS', nombre: 'Ingeniería de Sistemas', facultad: 'Ingeniería', duracion_semestres: 10, activo: true },
                    { id: 3, codigo: 'ING-CIV', nombre: 'Ingeniería Civil', facultad: 'Ingeniería', duracion_semestres: 10, activo: true }
                ],
                total: 3
            },
            '/asignaturas': {
                success: true,
                exito: true,
                data: [
                    { 
                        id: 1, 
                        codigo: 'MAT101', 
                        nombre: 'Matemáticas I', 
                        Carrera: { nombre: 'Ingeniería Informática y de Sistemas' },
                        semestre: 'I',
                        creditos: 4,
                        tipo: 'teoria'
                    },
                    { 
                        id: 2, 
                        codigo: 'PRO101', 
                        nombre: 'Programación I', 
                        Carrera: { nombre: 'Ingeniería Informática y de Sistemas' },
                        semestre: 'I',
                        creditos: 4,
                        tipo: 'practica'
                    }
                ],
                total: 2
            },
            '/dashboard/asignaciones': {
                success: true,
                exito: true,
                data: [
                    { 
                        id: 1, 
                        docente_id: 2,
                        docente: 'Dr. Juan Carlos Pérez Mamani', 
                        asignatura_id: 1,
                        asignatura: 'Matemáticas I',
                        codigo_asignatura: 'MAT101',
                        ciclo_id: 1,
                        estado: 'activo'
                    },
                    { 
                        id: 2, 
                        docente_id: 2,
                        docente: 'Dr. Juan Carlos Pérez Mamani', 
                        asignatura_id: 2,
                        asignatura: 'Programación I',
                        codigo_asignatura: 'PRO101',
                        ciclo_id: 1,
                        estado: 'activo'
                    }
                ],
                total: 2
            },
            '/dashboard/verificaciones': {
                success: true,
                exito: true,
                data: [
                    { 
                        id: 1, 
                        estado: 'pendiente', 
                        docente_id: 2,
                        docente: 'Dr. Juan Carlos Pérez Mamani',
                        asignatura: 'Matemáticas I',
                        fecha_asignacion: new Date().toISOString(),
                        observaciones: 0
                    },
                    { 
                        id: 2, 
                        estado: 'en_revision', 
                        docente_id: 2,
                        docente: 'Dr. Juan Carlos Pérez Mamani',
                        asignatura: 'Programación I',
                        fecha_asignacion: new Date().toISOString(),
                        observaciones: 2
                    }
                ],
                total: 2
            },
            '/dashboard/portafolios': {
                success: true,
                exito: true,
                data: [
                    { 
                        id: 1, 
                        nombre: 'Portafolio Matemáticas I - 2024-I', 
                        estado: 'completo',
                        docente: 'Dr. Juan Carlos Pérez Mamani',
                        asignatura: 'Matemáticas I',
                        progreso: 100,
                        fecha_actualizacion: new Date().toISOString()
                    },
                    { 
                        id: 2, 
                        nombre: 'Portafolio Programación I - 2024-I', 
                        estado: 'en_proceso',
                        docente: 'Dr. Juan Carlos Pérez Mamani',
                        asignatura: 'Programación I',
                        progreso: 75,
                        fecha_actualizacion: new Date().toISOString()
                    }
                ],
                total: 2
            },
            '/dashboard/estadisticas': {
                success: true,
                exito: true,
                data: {
                    total_usuarios: 2,
                    total_carreras: 3,
                    total_asignaturas: 2,
                    total_asignaciones: 2,
                    total_verificaciones: 2,
                    total_portafolios: 2
                }
            }
        };

        const result = mockData[endpoint] || { success: true, exito: true, data: [], total: 0 };
        return result;
    }

    /**
     * Configurar timeouts más largos para desarrollo
     */
    configurarTimeouts() {
        // NOTA: No interceptamos fetch aquí para evitar conflictos
        // El interceptor principal ya maneja los timeouts adecuadamente
        console.log('🔧 Timeouts configurados (manejados por interceptor principal)');
    }

    /**
     * Activar modo mock para desarrollo
     */
    activarMockAuth() {
        this.mockAuth = true;
        console.log('🔧 Modo mock activado - usando datos de prueba');
    }

    /**
     * Desactivar modo mock
     */
    desactivarMockAuth() {
        this.mockAuth = false;
        console.log('🔧 Modo mock desactivado');
    }

    /**
     * Limpiar cache de peticiones
     */
    limpiarCache() {
        this.peticionesEnProceso.clear();
        this.errores500Detectados.clear();
        console.log('🔧 Cache de peticiones limpiado');
    }

    /**
     * Restaurar función original
     */
    restaurarApiRequest() {
        if (this.originalApiRequest) {
            window.apiRequest = this.originalApiRequest;
            console.log('🔧 Función API original restaurada');
        }
    }
}

// Crear instancia global
window.DebugConfig = new DebugConfig();

// El modo mock está activado para manejar errores del servidor
console.log('🔧 DebugConfig cargado para carga masiva - Modo mock activado para manejar errores del servidor');