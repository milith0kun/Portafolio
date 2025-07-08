/**
 * Sistema de Autenticación Unificado - Versión Mejorada
 * Gestiona autenticación para todos los tipos de usuario (Admin, Docente, Verificador)
 * Integrado con base de datos real y encriptación
 */

class SistemaAutenticacionUnificado {
    constructor() {
        this.token = null;
        this.usuario = null;
        this.rolActivo = null;
        this.rolesDisponibles = [];
        this.sesionActiva = false;
        this.timerRenovacion = null;
        this.limpiezaDeshabilitada = false;
        
        // Configuración de renovación automática (45 minutos)
        this.intervalorenovacion = 45 * 60 * 1000;
        
        // NO inicializar automáticamente desde sesión guardada
        // Esto causaba bucles de redirección en páginas de login
        // La inicialización se hace manualmente cuando es necesario
        
        console.log('🔐 Sistema de Autenticación Unificado inicializado (sin verificación automática)');
    }

    /**
     * Inicializar desde sesión guardada en localStorage
     * Solo se ejecuta en páginas protegidas, no en páginas públicas
     */
    inicializarDesdeSesion() {
        try {
            // Verificar si estamos en una página pública
            const rutaActual = window.location.pathname.toLowerCase();
            
            // Páginas públicas que NO deben restaurar sesión automáticamente
            const esPaginaPublica = (
                rutaActual === '/' ||
                rutaActual === '/index.html' ||
                rutaActual.includes('/login.html') ||
                rutaActual.includes('/autenticacion/') ||
                rutaActual.includes('index.html') ||
                rutaActual.endsWith('/') ||
                rutaActual.includes('login') ||
                rutaActual.includes('selector-roles') ||
                rutaActual === '' ||
                document.title.toLowerCase().includes('login') ||
                document.title.toLowerCase().includes('iniciar sesión')
            );
            
            if (esPaginaPublica) {
                console.log('🏠 Página pública detectada:', rutaActual, '- NO restaurando sesión');
                // Limpiar cualquier sesión temporal que pueda estar causando problemas
                this.limpiarSesion(false); // Solo limpiar sessionStorage, no localStorage
                return;
            }
            
            // Verificar si hay una sesión activa en sessionStorage (temporal)
            const tokenTemporal = sessionStorage.getItem(CONFIG.STORAGE.TOKEN);
            const usuarioTemporal = sessionStorage.getItem(CONFIG.STORAGE.USER);
            
            // Verificar si hay una sesión permanente en localStorage (recordar sesión)
            const tokenPermanente = localStorage.getItem(CONFIG.STORAGE.TOKEN);
            const usuarioPermanente = localStorage.getItem(CONFIG.STORAGE.USER);
            const recordarSesion = localStorage.getItem(CONFIG.STORAGE.SESSION_KEY + '_remember');
            
            let token = null;
            let usuario = null;
            
            // Priorizar sesión temporal (actual)
            if (tokenTemporal && usuarioTemporal) {
                token = tokenTemporal;
                usuario = JSON.parse(usuarioTemporal);
                console.log('🔄 Usando sesión temporal de sessionStorage');
            } else if (tokenPermanente && usuarioPermanente && recordarSesion === 'true') {
                // Solo usar sesión permanente si el usuario marcó "recordar sesión"
                token = tokenPermanente;
                usuario = JSON.parse(usuarioPermanente);
                
                // Mover a sessionStorage para esta sesión
                sessionStorage.setItem(CONFIG.STORAGE.TOKEN, token);
                sessionStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(usuario));
                
                console.log('🔄 Usando sesión permanente recordada');
            }
            
            if (token && usuario) {
                this.token = token;
                this.usuario = usuario;
                this.rolActivo = this.usuario.rolActual;
                this.rolesDisponibles = this.usuario.roles || [];
                this.sesionActiva = true;
                
                // Configurar renovación automática
                this.configurarRenovacionAutomatica();
                
                console.log('✅ Sesión restaurada correctamente');
            } else {
                console.log('ℹ️ No se encontró sesión válida');
                this.limpiarSesion();
            }
        } catch (error) {
            console.error('❌ Error al restaurar sesión:', error);
            this.limpiarSesion();
        }
    }

    /**
     * Iniciar sesión con correo y contraseña
     * @param {string} correo - Correo del usuario
     * @param {string} contrasena - Contraseña del usuario
     * @returns {Object} Resultado del login
     */
    async iniciarSesion(correo, contrasena) {
        try {
            console.log('🔐 Iniciando sesión...', { correo });
            
            // Deshabilitar limpieza automática temporalmente durante el login
            this.deshabilitarLimpiezaTemporal(15000); // 15 segundos
            
            // Hacer petición al servidor
            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.AUTH}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: correo,
                    correo: correo, // Enviar ambos para compatibilidad
                    password: contrasena,
                    contrasena: contrasena // Enviar ambos para compatibilidad
                })
            });

            const datos = await response.json();
            console.log('📥 Respuesta del servidor:', datos);

            if (!response.ok || datos.error) {
                throw new Error(datos.mensaje || 'Error de autenticación');
            }

            // Guardar token y datos de usuario
            this.token = datos.token;
            this.usuario = datos.usuario;
            this.rolesDisponibles = datos.usuario.roles || [];
            
            console.log('✅ Token guardado:', this.token ? 'Sí' : 'No');
            console.log('👤 Usuario:', this.usuario);
            console.log('🎭 Roles disponibles:', this.rolesDisponibles);

            // Verificar si tiene múltiples roles
            console.log('🔍 Verificando roles:', {
                tieneMultiplesRoles: datos.tieneMultiplesRoles,
                rolesDisponibles: this.rolesDisponibles,
                cantidadRoles: this.rolesDisponibles.length
            });
            
            if (datos.tieneMultiplesRoles || this.rolesDisponibles.length > 1) {
                console.log('🎭 Usuario tiene múltiples roles, requiere selección');
                
                // Guardar datos temporales para el selector de roles
                this.guardarDatosTemporales();
                
                return {
                    exito: true,
                    requiereSeleccionRol: true,
                    roles: this.rolesDisponibles,
                    usuario: this.usuario,
                    mensaje: 'Seleccione su rol para continuar'
                };
            } else {
                // Solo tiene un rol, login directo
                this.rolActivo = this.rolesDisponibles[0]?.rol || datos.usuario.rolActual;
                this.usuario.rolActual = this.rolActivo; // Asegurar que el rol esté en el objeto usuario
                this.sesionActiva = true;
                
                console.log('✅ Login directo exitoso, rol:', this.rolActivo);
                console.log('🎯 Dashboard destino:', this.obtenerDashboardPorRol(this.rolActivo));
                
                // Guardar sesión completa (se guardará con el parámetro recordar desde login.js)
                // this.guardarSesion(); // No llamar aquí, se llama desde login.js
                this.configurarRenovacionAutomatica();
                
                return {
                    exito: true,
                    requiereSeleccionRol: false,
                    rol: this.rolActivo,
                    usuario: this.usuario,
                    redirigirA: this.obtenerDashboardPorRol(this.rolActivo),
                    mensaje: `Bienvenido, ${this.usuario.nombres}`
                };
            }

        } catch (error) {
            console.error('❌ Error en login:', error);
            this.limpiarSesion();
            
            return {
                exito: false,
                mensaje: error.message || 'Error de conexión con el servidor'
            };
        }
    }

    /**
     * Seleccionar rol activo (para usuarios con múltiples roles)
     * @param {string} rol - Rol seleccionado
     * @returns {Promise<Object>} Resultado de la selección
     */
    async seleccionarRol(rol) {
        try {
            console.log('🎭 Seleccionando rol:', rol);
            
            // Deshabilitar limpieza automática temporalmente durante la selección
            this.deshabilitarLimpiezaTemporal(10000); // 10 segundos
            
            if (!this.token || !this.usuario) {
                throw new Error('No hay sesión activa');
            }

            // Verificar que el rol esté disponible
            const rolValido = this.rolesDisponibles.find(r => r.rol === rol);
            if (!rolValido) {
                throw new Error('Rol no válido para este usuario');
            }

            // Actualizar rol activo
            this.rolActivo = rol;
            this.usuario.rolActual = rol;
            this.sesionActiva = true;
            
            // Guardar sesión completa (siempre guardar al seleccionar rol)
            this.guardarSesion(true); // Guardar con recordar = true al seleccionar rol
            this.configurarRenovacionAutomatica();

            return {
                exito: true,
                rol: this.rolActivo,
                usuario: this.usuario,
                redirigirA: this.obtenerDashboardPorRol(rol)
            };

        } catch (error) {
            console.error('❌ Error en seleccionarRol:', error);
            return {
                exito: false,
                mensaje: error.message
            };
        }
    }

    /**
     * Cambiar rol activo (para usuarios con múltiples roles)
     * @param {string} nuevoRol - Nuevo rol a activar
     * @returns {Promise<Object>} Resultado del cambio
     */
    async cambiarRol(nuevoRol) {
        try {
            if (!this.sesionActiva) {
                throw new Error('No hay sesión activa');
            }

            const rolValido = this.rolesDisponibles.find(r => r.rol === nuevoRol);
            if (!rolValido) {
                throw new Error('Rol no válido para este usuario');
            }

            // Solicitar cambio de rol al servidor
            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.AUTH}/cambiar-rol`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ rolNombre: nuevoRol })
            });

            const datos = await response.json();

            if (!response.ok || datos.error) {
                throw new Error(datos.mensaje || 'Error al cambiar rol');
            }

            // Actualizar rol activo
            this.rolActivo = nuevoRol;
            this.usuario.rolActual = nuevoRol;
            this.guardarSesion();

            return {
                exito: true,
                rol: this.rolActivo,
                redirigirA: this.obtenerDashboardPorRol(nuevoRol)
            };

        } catch (error) {
            console.error('❌ Error al cambiar rol:', error);
            return {
                exito: false,
                mensaje: error.message
            };
        }
    }

    /**
     * Cerrar sesión
     * @param {boolean} limpiarRecordatorio - Si true, olvida la sesión completamente
     */
    async cerrarSesion(limpiarRecordatorio = false) {
        try {
            console.log('🚪 Cerrando sesión...');
            
            // Notificar al servidor
            if (this.token) {
                await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.AUTH}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });
            }
            
        } catch (error) {
            console.warn('⚠️ Error al notificar logout al servidor:', error);
        } finally {
            this.limpiarSesion(limpiarRecordatorio);
            // Usar ruta dinámica si está disponible
            const loginUrl = (typeof CONFIG.getRoute === 'function') ? CONFIG.getRoute('LOGIN') : CONFIG.ROUTES.LOGIN;
            window.location.href = loginUrl;
        }
    }

    /**
     * Verificar si el usuario está autenticado
     * @returns {boolean} Estado de autenticación
     */
    verificarAutenticacion() {
        // Verificar sesión activa normal
        if (this.token && this.usuario && this.sesionActiva) {
            return true;
        }
        
        // Verificar sesión temporal (para selector de roles)
        const tempToken = localStorage.getItem('temp_token');
        const tempUsuario = localStorage.getItem('temp_usuario');
        
        if (tempToken && tempUsuario) {
            // Restaurar datos temporales
            this.token = tempToken;
            this.usuario = JSON.parse(tempUsuario);
            this.rolesDisponibles = this.usuario.roles || [];
            return true;
        }
        
        // Verificar sesión en sessionStorage (prioridad)
        const tokenSession = sessionStorage.getItem(CONFIG.STORAGE.TOKEN);
        const usuarioSession = sessionStorage.getItem(CONFIG.STORAGE.USER);
        
        if (tokenSession && usuarioSession) {
            this.token = tokenSession;
            this.usuario = JSON.parse(usuarioSession);
            this.rolActivo = this.usuario.rolActual;
            this.rolesDisponibles = this.usuario.roles || [];
            this.sesionActiva = true;
            return true;
        }
        
        // Verificar sesión persistente en localStorage (solo si está marcado recordar)
        const recordarSesion = localStorage.getItem(CONFIG.STORAGE.SESSION_KEY + '_remember');
        if (recordarSesion === 'true') {
            const tokenGuardado = localStorage.getItem(CONFIG.STORAGE.TOKEN);
            const usuarioGuardado = localStorage.getItem(CONFIG.STORAGE.USER);
            
            if (tokenGuardado && usuarioGuardado) {
                this.token = tokenGuardado;
                this.usuario = JSON.parse(usuarioGuardado);
                this.rolActivo = this.usuario.rolActual;
                this.rolesDisponibles = this.usuario.roles || [];
                this.sesionActiva = true;
                
                // Mover a sessionStorage para esta sesión
                sessionStorage.setItem(CONFIG.STORAGE.TOKEN, this.token);
                sessionStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(this.usuario));
                
                return true;
            }
        }
        
        return false;
    }

    /**
     * Renovar token automáticamente
     */
    async renovarToken() {
        try {
            if (!this.token) return false;

            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.AUTH}/renovar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const datos = await response.json();
                this.token = datos.token;
                this.guardarSesion();
                console.log('✅ Token renovado automáticamente');
                return true;
            }
        } catch (error) {
            console.error('❌ Error al renovar token:', error);
        }
        
        return false;
    }

    /**
     * Verificar sesión con el servidor
     */
    async verificarSesion() {
        try {
            if (!this.token) return false;

            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.AUTH}/verificar`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('❌ Error al verificar sesión:', error);
            return false;
        }
    }

    /**
     * Obtener información del usuario actual
     */
    async obtenerUsuarioActual() {
        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.AUTH}/usuario-actual`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const datos = await response.json();
                this.usuario = datos.usuario;
                this.guardarSesion();
                return datos.usuario;
            }
        } catch (error) {
            console.error('❌ Error al obtener usuario actual:', error);
        }
        
        return null;
    }

    /**
     * Configurar renovación automática del token
     */
    configurarRenovacionAutomatica() {
        if (this.timerRenovacion) {
            clearInterval(this.timerRenovacion);
        }
        
        this.timerRenovacion = setInterval(async () => {
            const renovado = await this.renovarToken();
            if (!renovado) {
                console.warn('⚠️ No se pudo renovar el token, cerrando sesión');
                this.cerrarSesion();
            }
        }, this.intervalorenovacion);
    }

    /**
     * Guardar datos temporales (antes de seleccionar rol)
     */
    guardarDatosTemporales() {
        try {
            localStorage.setItem('temp_token', this.token);
            localStorage.setItem('temp_usuario', JSON.stringify(this.usuario));
        } catch (error) {
            console.error('❌ Error al guardar datos temporales:', error);
        }
    }

    /**
     * Guardar sesión en storage (temporal y permanente si se solicita)
     * @param {boolean} recordar - Si true, guarda en localStorage para recordar
     */
    guardarSesion(recordar = false) {
        try {
            if (this.token && this.usuario) {
                // Siempre guardar en sessionStorage para la sesión actual
                sessionStorage.setItem(CONFIG.STORAGE.TOKEN, this.token);
                sessionStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(this.usuario));
                sessionStorage.setItem(CONFIG.STORAGE.SESSION_KEY, 'true');
                
                // Solo guardar en localStorage si el usuario quiere recordar la sesión
                if (recordar) {
                    localStorage.setItem(CONFIG.STORAGE.TOKEN, this.token);
                    localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(this.usuario));
                    localStorage.setItem(CONFIG.STORAGE.SESSION_KEY + '_remember', 'true');
                    console.log('💾 Sesión guardada permanentemente (recordar sesión)');
                } else {
                    // Limpiar datos permanentes si no se quiere recordar
                    localStorage.removeItem(CONFIG.STORAGE.TOKEN);
                    localStorage.removeItem(CONFIG.STORAGE.USER);
                    localStorage.removeItem(CONFIG.STORAGE.SESSION_KEY + '_remember');
                    console.log('💾 Sesión guardada temporalmente (solo esta sesión)');
                }
                
                this.sesionActiva = true;
                
                // Limpiar datos temporales si existen
                localStorage.removeItem('temp_token');
                localStorage.removeItem('temp_usuario');
            }
        } catch (error) {
            console.error('❌ Error al guardar sesión:', error);
        }
    }

    /**
     * Limpiar datos de sesión
     * @param {boolean} limpiarRecordatorio - Si true, también limpia localStorage
     */
    limpiarSesion(limpiarRecordatorio = false) {
        this.token = null;
        this.usuario = null;
        this.rolActivo = null;
        this.rolesDisponibles = [];
        this.sesionActiva = false;
        
        if (this.timerRenovacion) {
            clearInterval(this.timerRenovacion);
            this.timerRenovacion = null;
        }
        
        // Limpiar sessionStorage (siempre)
        sessionStorage.removeItem(CONFIG.STORAGE.TOKEN);
        sessionStorage.removeItem(CONFIG.STORAGE.USER);
        sessionStorage.removeItem(CONFIG.STORAGE.SESSION_KEY);
        
        // Limpiar datos temporales
        localStorage.removeItem('temp_token');
        localStorage.removeItem('temp_usuario');
        
        // Solo limpiar localStorage si se solicita explícitamente
        if (limpiarRecordatorio) {
            localStorage.removeItem(CONFIG.STORAGE.TOKEN);
            localStorage.removeItem(CONFIG.STORAGE.USER);
            localStorage.removeItem(CONFIG.STORAGE.SESSION_KEY + '_remember');
            console.log('🧹 Sesión limpiada completamente (incluye recordatorio)');
        } else {
            console.log('🧹 Sesión temporal limpiada (recordatorio conservado)');
        }
    }

    /**
     * Obtener dashboard según el rol
     * @param {string} rol - Rol del usuario
     * @returns {string} URL del dashboard
     */
    obtenerDashboardPorRol(rol) {
        // Usar rutas dinámicas si CONFIG.getRoute está disponible
        if (typeof CONFIG.getRoute === 'function') {
            const dashboards = {
                'administrador': CONFIG.getRoute('DASHBOARD_ADMIN'),
                'docente': CONFIG.getRoute('DASHBOARD_DOCENTE'),
                'verificador': CONFIG.getRoute('DASHBOARD_VERIFICADOR')
            };
            return dashboards[rol] || CONFIG.getRoute('LOGIN');
        }
        
        // Fallback a rutas estáticas
        const dashboards = {
            'administrador': CONFIG.ROUTES.DASHBOARD_ADMIN,
            'docente': CONFIG.ROUTES.DASHBOARD_DOCENTE,
            'verificador': CONFIG.ROUTES.DASHBOARD_VERIFICADOR
        };
        
        return dashboards[rol] || CONFIG.ROUTES.LOGIN;
    }

    // =============================================
    // MÉTODOS DE ACCESO RÁPIDO PARA EL FRONTEND
    // =============================================

    /**
     * Obtener token actual
     * @returns {string|null} Token JWT
     */
    obtenerToken() {
        return this.token;
    }

    /**
     * Obtener usuario actual
     * @returns {Object|null} Datos del usuario
     */
    obtenerUsuario() {
        return this.usuario;
    }

    /**
     * Obtener datos del usuario para la interfaz
     * @returns {Object} Datos del usuario formateados
     */
    obtenerDatosUsuario() {
        if (!this.usuario) {
            return null;
        }

        return {
            nombre: this.usuario.nombres || this.usuario.nombre || 'Usuario',
            rol: this.rolActivo || 'Usuario',
            roles: this.rolesDisponibles || [],
            rolActual: this.rolActivo,
            email: this.usuario.email || this.usuario.correo
        };
    }

    /**
     * Verificar si la sesión está activa
     * @returns {boolean} Estado de la sesión
     */
    verificarSesionActiva() {
        const token = this.obtenerToken();
        const usuario = this.obtenerUsuario();
        
        return !!(token && usuario && this.sesionActiva);
    }

    /**
     * Obtener rol activo
     * @returns {string|null} Rol activo
     */
    obtenerRolActivo() {
        return this.rolActivo;
    }

    /**
     * Obtener roles disponibles
     * @returns {Array} Lista de roles
     */
    obtenerRolesDisponibles() {
        return this.rolesDisponibles;
    }

    /**
     * Verificar si el usuario tiene un rol específico
     * @param {string} rol - Rol a verificar
     * @returns {boolean} Si el usuario tiene el rol
     */
    tieneRol(rol) {
        return this.rolesDisponibles.some(r => r.rol === rol);
    }

    /**
     * Verificar si el rol activo es específico
     * @param {string} rol - Rol a verificar
     * @returns {boolean} Si el rol activo coincide
     */
    esRolActivo(rol) {
        return this.rolActivo === rol;
    }

    /**
     * Establecer rol activo de forma directa (sin verificación del servidor)
     * @param {string} nuevoRol - Nuevo rol a establecer
     */
    establecerRolActivo(nuevoRol) {
        try {
            console.log('🎭 Estableciendo rol activo:', nuevoRol);
            
            // Actualizar rol activo
            this.rolActivo = nuevoRol;
            
            // Actualizar en el objeto usuario
            if (this.usuario) {
                this.usuario.rolActual = nuevoRol;
            }
            
            // Guardar en localStorage
            localStorage.setItem('portafolio_docente_rol_activo', nuevoRol);
            
            // Actualizar datos del usuario en storage
            if (this.usuario) {
                const usuarioActualizado = { ...this.usuario, rolActual: nuevoRol };
                localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(usuarioActualizado));
                sessionStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(usuarioActualizado));
            }
            
            console.log('✅ Rol activo establecido:', nuevoRol);
        } catch (error) {
            console.error('❌ Error al establecer rol activo:', error);
        }
    }

    /**
     * Construir headers para peticiones autenticadas
     * @returns {Object} Headers con autorización
     */
    construirHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    /**
     * Verificar si existe una sesión guardada (sin restaurarla automáticamente)
     * @returns {boolean} Si existe una sesión válida guardada
     */
    existeSesionGuardada() {
        try {
            const tokenGuardado = localStorage.getItem(CONFIG.STORAGE.TOKEN);
            const usuarioGuardado = localStorage.getItem(CONFIG.STORAGE.USER);
            return !!(tokenGuardado && usuarioGuardado);
        } catch (error) {
            return false;
        }
    }

    /**
     * Restaurar sesión manualmente (para usar desde páginas públicas)
     * @returns {boolean} Si se pudo restaurar la sesión
     */
    restaurarSesionManual() {
        try {
            const tokenGuardado = localStorage.getItem(CONFIG.STORAGE.TOKEN);
            const usuarioGuardado = localStorage.getItem(CONFIG.STORAGE.USER);
            
            if (tokenGuardado && usuarioGuardado) {
                this.token = tokenGuardado;
                this.usuario = JSON.parse(usuarioGuardado);
                this.rolActivo = this.usuario.rolActual;
                this.rolesDisponibles = this.usuario.roles || [];
                this.sesionActiva = true;
                
                // Configurar renovación automática
                this.configurarRenovacionAutomatica();
                
                console.log('✅ Sesión restaurada manualmente');
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Error al restaurar sesión manualmente:', error);
            this.limpiarSesion();
            return false;
        }
    }

    /**
     * Configurar la limpieza automática de sesión
     */
    configurarLimpiezaAutomatica() {
        // Verificar si estamos en una página de login o pública
        const rutaActual = window.location.pathname;
        const paginasExcluidas = [
            '/', '/index.html', 
                        CONFIG.getRoute?.('LOGIN') || CONFIG.ROUTES?.LOGIN || '/paginas/autenticacion/login.html',
            CONFIG.getRoute?.('SELECTOR_ROLES') || CONFIG.ROUTES?.SELECTOR_ROLES || '/paginas/autenticacion/selector-roles.html',
            'login.html', 'selector-roles.html', 'index.html'
        ];
        
        const esPaginaExcluida = paginasExcluidas.some(pagina => 
            rutaActual === pagina || 
            rutaActual.includes(pagina) || 
            rutaActual.endsWith(pagina) ||
            rutaActual === '/' ||
            rutaActual.endsWith('/index.html')
        );
        
        if (esPaginaExcluida) {
            console.log('🏠 Página excluida de limpieza automática:', rutaActual);
            return;
        }

        // Manejar cierre de pestaña/navegador de forma más inteligente
        window.addEventListener('beforeunload', (event) => {
            console.log('🚪 Usuario cerrando pestaña/navegador...');
            
            // Solo cerrar sesión si realmente está cerrando, no navegando
            // Detectar si es navegación o cierre real
            const performance = window.performance;
            if (performance && performance.navigation && performance.navigation.type === 2) {
                // Es navegación hacia atrás/adelante, no cerrar sesión
                console.log('🔄 Navegación detectada, manteniendo sesión');
                return;
            }
            
            // Marcar que el usuario cerró la pestaña intencionalmente
            sessionStorage.setItem('intentional_close', 'true');
        });

        // Manejar navegación del historial (atrás/adelante)
        window.addEventListener('popstate', (event) => {
            console.log('🔙 Navegación del historial detectada');
            
            // Verificar si tenemos una sesión válida
            if (!this.verificarAutenticacion()) {
                console.log('❌ Sesión inválida durante navegación, redirigiendo a login');
                this.redirigirALogin();
            }
        });

        // Agregar método para redirigir al login
        this.redirigirALogin = () => {
            console.log('🔄 Redirigiendo al login...');
            const currentPath = window.location.pathname;
            let loginPath;
            
            if (currentPath.includes('/dashboard/')) {
                loginPath = '../../autenticacion/login.html';
            } else {
                loginPath = CONFIG.getRoute?.('LOGIN') || CONFIG.ROUTES?.LOGIN || '/paginas/autenticacion/login.html';
            }
            
            window.location.href = loginPath;
        };
        
        // NO verificar sesión automáticamente en el evento load
        // Esto causaba bucles de redirección al login
        // Cada página maneja su propia verificación de autenticación

        console.log('🧹 Limpieza automática de sesión configurada (modo seguro)');
    }

    /**
     * Limpiar sesión completa
     */
    limpiarSesionCompleta() {
        if (this.limpiezaDeshabilitada) {
            console.log('🚫 Limpieza de sesión deshabilitada temporalmente');
            return;
        }
        
        console.log('🗑️ Limpiando sesión completa...');
        this.limpiarSesion();
        localStorage.clear();
        sessionStorage.clear();
        console.log('✅ Sesión limpiada completamente');
    }

    /**
     * Deshabilitar temporalmente la limpieza automática
     */
    deshabilitarLimpiezaTemporal(duracion = 10000) {
        console.log('⏸️ Deshabilitando limpieza temporal por', duracion, 'ms');
        this.limpiezaDeshabilitada = true;
        setTimeout(() => {
            this.limpiezaDeshabilitada = false;
            console.log('▶️ Limpieza automática rehabilitada');
        }, duracion);
    }

    inicializar() {
        // Configurar limpieza automática de sesión
        this.configurarLimpiezaAutomatica();
        
        // Marcar sesión como activa
        sessionStorage.setItem(CONFIG.STORAGE.SESSION_KEY || 'session_active', 'true');
        
        console.log('🔐 Sistema de autenticación inicializado');
    }
}

// =============================================
// FUNCIONES GLOBALES PARA COMPATIBILIDAD
// =============================================

/**
 * Función global para obtener token (compatibilidad)
 * @returns {string|null} Token actual
 */
window.obtenerToken = function() {
    return window.AUTH ? window.AUTH.obtenerToken() : null;
};

/**
 * Función global para obtener usuario (compatibilidad)
 * @returns {Object|null} Usuario actual
 */
window.obtenerUsuario = function() {
    return window.AUTH ? window.AUTH.obtenerUsuario() : null;
};

/**
 * Función global para construir headers (compatibilidad)
 * @returns {Object} Headers con autorización
 */
window.construirCabecerasAuth = function() {
    return window.AUTH ? window.AUTH.construirHeaders() : {'Content-Type': 'application/json'};
};

/**
 * Función global para limpiar sesión completa (para debugging)
 */
window.limpiarSesionCompleta = function() {
    console.log('🗑️ Limpiando sesión completa...');
    if (window.AUTH) {
        window.AUTH.limpiarSesionCompleta();
    }
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ Sesión limpiada completamente');
};

// =============================================
// INICIALIZACIÓN Y VERIFICACIONES AUTOMÁTICAS
// =============================================

// Instancia global del sistema de autenticación
window.AUTH = new SistemaAutenticacionUnificado();

// Inicializar el sistema automáticamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.AUTH && typeof window.AUTH.inicializar === 'function') {
            window.AUTH.inicializar();
        }
    });
} else {
    if (window.AUTH && typeof window.AUTH.inicializar === 'function') {
        window.AUTH.inicializar();
    }
}

// NOTA: La verificación automática de autenticación ha sido removida de aquí
// para evitar bucles con la verificación específica de cada página.
// Cada página ahora maneja su propia verificación de autenticación.

console.log('✅ Sistema de Autenticación Unificado cargado y configurado');

// =============================================
// FUNCIONES DE UTILIDAD GLOBALES
// =============================================

/**
 * Realiza una petición HTTP a la API usando el sistema AUTH
 * @param {string} endpoint - Endpoint de la API (sin la URL base)
 * @param {string} method - Método HTTP (GET, POST, PUT, DELETE)
 * @param {Object} [data] - Datos a enviar en el cuerpo de la petición
 * @param {boolean} [auth=true] - Indica si se debe incluir el token de autenticación
 * @returns {Promise<Object>} Respuesta de la API
 */
window.apiRequest = async (endpoint, method = 'GET', data = null, auth = true) => {
    const url = `${window.CONFIG.API.BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json'
    };

    // Añadir token de autenticación usando el sistema AUTH
    if (auth && window.AUTH?.verificarAutenticacion()) {
        const token = window.AUTH.obtenerToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    } else if (auth) {
        window.AUTH?.cerrarSesion();
        throw new Error('No se encontró el token de autenticación');
    }

    const config = {
        method,
        headers,
        credentials: 'same-origin'
    };

    // Añadir cuerpo de la petición si es necesario
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // Manejar errores 401 específicamente
            if (response.status === 401) {
                console.warn('🔐 Sesión expirada o no autorizada');
                if (auth && window.AUTH) {
                    window.AUTH.cerrarSesion();
                }
                const error = new Error('La sesión ha expirado. Por favor, inicie sesión nuevamente.');
                error.status = 401;
                error.data = errorData;
                throw error;
            }
            
            const error = new Error(errorData.mensaje || 'Error en la petición');
            error.status = response.status;
            error.data = errorData;
            throw error;
        }

        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        // Manejar errores de autenticación sin spam de logs
        if (error.status === 401) {
            // Solo log una vez por minuto para errores 401
            const now = Date.now();
            if (!window._lastAuthErrorLog || (now - window._lastAuthErrorLog) > 60000) {
                console.warn('🔐 Error de autenticación:', error.message);
                window._lastAuthErrorLog = now;
            }
        } else if (!error.message?.includes('Failed to fetch') && !error.message?.includes('NetworkError')) {
            console.error('Error en la petición:', error);
        } else {
            console.log('📡 Error de conexión al servidor');
        }
        throw error;
    }
};

/**
 * Muestra un mensaje de error en un elemento del DOM
 * @param {string} mensaje - Mensaje de error a mostrar
 * @param {HTMLElement} elemento - Elemento donde se mostrará el mensaje
 */
window.mostrarError = (mensaje, elemento) => {
    if (!elemento) return;
    
    elemento.textContent = mensaje;
    elemento.classList.add('show');
    
    setTimeout(() => {
        elemento.classList.remove('show');
    }, 5000);
};

/**
 * Formatea una fecha en formato legible
 * @param {string|Date} fecha - Fecha a formatear
 * @returns {string} Fecha formateada
 */
window.formatearFecha = (fecha) => {
    if (!fecha) return '';
    
    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) return '';
    
    const opciones = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return fechaObj.toLocaleDateString('es-ES', opciones);
};

/**
 * Muestra una notificación simple
 * @param {string} mensaje - Mensaje de la notificación
 * @param {string} tipo - Tipo de notificación ('info', 'exito', 'error', 'advertencia')
 * @param {number} duracion - Duración en millisegundos
 */
window.mostrarNotificacion = (mensaje, tipo = 'info', duracion = 5000) => {
    console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
    
    if (tipo === 'error' || tipo === 'danger') {
        alert(`Error: ${mensaje}`);
    }
};

/**
 * Muestra una confirmación usando SweetAlert2 si está disponible
 * @param {string} titulo - Título de la confirmación
 * @param {string} mensaje - Mensaje de la confirmación
 * @param {string} tipo - Tipo de confirmación
 * @param {string} textoConfirmar - Texto del botón de confirmación
 * @param {string} textoCancelar - Texto del botón de cancelación
 * @returns {Promise<boolean>} true si se confirma, false si se cancela
 */
window.mostrarConfirmacion = (titulo, mensaje, tipo = 'question', textoConfirmar = 'Aceptar', textoCancelar = 'Cancelar') => {
    return new Promise((resolve) => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: titulo,
                text: mensaje,
                icon: tipo,
                showCancelButton: true,
                confirmButtonText: textoConfirmar,
                cancelButtonText: textoCancelar,
                reverseButtons: true
            }).then((result) => {
                resolve(result.isConfirmed);
            });
        } else {
            const resultado = confirm(`${titulo}\n\n${mensaje}`);
            resolve(resultado);
        }
    });
};

// =============================================
// OBJETO APP DE COMPATIBILIDAD
// =============================================

/**
 * Objeto APP para compatibilidad con código existente
 */
window.APP = {
    // Funciones de autenticación
    estaAutenticado: () => window.AUTH?.verificarAutenticacion() || false,
    obtenerUsuario: () => window.AUTH?.obtenerUsuario() || null,
    obtenerToken: () => window.AUTH?.obtenerToken() || null,
    tieneRol: (rol) => window.AUTH?.tieneRol(rol) || false,
    cerrarSesion: () => window.AUTH?.cerrarSesion() || (window.location.href = window.CONFIG.ROUTES.LOGIN),
    
    // Funciones de navegación
    redirigirALogin: () => window.location.href = window.CONFIG.ROUTES.LOGIN,
    redirigirASelector: () => window.location.href = window.CONFIG.ROUTES.SELECTOR_ROLES,
    
    // Funciones de utilidad
    apiRequest: window.apiRequest,
    mostrarNotificacion: window.mostrarNotificacion,
    mostrarError: window.mostrarError,
    formatearFecha: window.formatearFecha,
    mostrarConfirmacion: window.mostrarConfirmacion
}; 