/**
 * Sistema de Autenticación Unificado para Páginas de Administrador
 * Gestiona la autenticación y autorización de todas las páginas del admin
 */

const AdminAuth = {
    /**
     * Verifica la autenticación del usuario para páginas de admin
     * @returns {boolean} - true si está autenticado y autorizado, false en caso contrario
     */
    verificarAutenticacion() {
        try {
            // Verificar si el usuario está autenticado
            if (!AUTH.verificarAutenticacion()) {
                // Usuario no autenticado, redirigiendo al login
                this.redirigirALogin();
                return false;
            }

            // Obtener usuario y verificar rol
            const usuario = AUTH.obtenerUsuario();
            const rolActual = AUTH.obtenerRolActivo();
            
            if (!usuario || !rolActual) {
                // No se pudo obtener información del usuario
                this.redirigirALogin();
                return false;
            }

            // Verificar si tiene rol de administrador
            if (rolActual !== 'administrador' && !AUTH.tieneRol('administrador')) {
                // Usuario sin permisos de administrador
                
                // Verificar si tiene otros roles para redirigir apropiadamente
                if (AUTH.tieneRol('docente')) {
                    // Redirigiendo al dashboard de docente
                    window.location.href = CONFIG.getRoute('DASHBOARD_DOCENTE');
                } else if (AUTH.tieneRol('verificador')) {
                    // Redirigiendo al dashboard de verificador
                    window.location.href = CONFIG.getRoute('DASHBOARD_VERIFICADOR');
                } else {
                    // Redirigiendo al selector de roles
                    window.location.href = CONFIG.getRoute('SELECTOR_ROLES');
                }
                return false;
            }

            // Usuario autenticado y autorizado
            // Usuario administrador autenticado correctamente
            return true;

        } catch (error) {
            // Error al verificar autenticación
            this.redirigirALogin();
            return false;
        }
    },

    /**
     * Redirige al usuario al login
     */
    redirigirALogin() {
        const loginUrl = (typeof CONFIG.getRoute === 'function') ? CONFIG.getRoute('LOGIN') : CONFIG.ROUTES.LOGIN;
        window.location.href = loginUrl;
    },

    /**
     * Redirige al usuario a su dashboard correspondiente
     */
    redirigirADashboard() {
        window.location.href = AUTH.obtenerDashboardPorRol();
    },

    /**
     * Inicializa la autenticación para páginas de admin
     * Este método debe ser llamado al inicio de cada página de admin
     */
    inicializarAutenticacionAdmin() {
        // Inicializar sesión desde localStorage si es necesario
        AUTH.inicializarDesdeSesion();
        
        // Verificar autenticación
        if (!this.verificarAutenticacion()) {
            return false;
        }

        // Configurar información del usuario en la interfaz
        this.configurarInfoUsuario();

        // Configurar eventos de cerrar sesión
        this.configurarCerrarSesion();

        return true;
    },

    /**
     * Configura la información del usuario en la interfaz
     */
    configurarInfoUsuario() {
        const usuario = AUTH.obtenerUsuario();
        if (usuario) {
            // Actualizar nombre del usuario en todos los elementos que lo requieran
            const elementosNombre = document.querySelectorAll('#nombreUsuario, .user-name, .username');
            elementosNombre.forEach(elemento => {
                if (elemento) {
                    elemento.textContent = `${usuario.nombres} ${usuario.apellidos}`;
                }
            });

            // Actualizar rol del usuario
            const elementosRol = document.querySelectorAll('#rolUsuario, .user-role, .userrole');
            elementosRol.forEach(elemento => {
                if (elemento) {
                    elemento.textContent = 'Administrador';
                    elemento.className = elemento.className.replace(/badge-\w+/, 'badge-danger');
                }
            });

            // Información del usuario configurada
        }
    },

    /**
     * Configura el evento de cerrar sesión
     */
    configurarCerrarSesion() {
        // Buscar todos los elementos de cerrar sesión
        const elementosCerrarSesion = document.querySelectorAll('#cerrarSesion, .cerrar-sesion, [data-action="logout"]');
        
        elementosCerrarSesion.forEach(elemento => {
            if (elemento) {
                elemento.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.cerrarSesion();
                });
            }
        });
    },

    /**
     * Cierra la sesión del usuario
     */
    cerrarSesion() {
        try {
            // Cerrando sesión
            
            // Usar el sistema de autenticación unificado para cerrar sesión
            setTimeout(() => {
                AUTH.cerrarSesion();
            }, 1000);

        } catch (error) {
            // Error al cerrar sesión
            // Forzar cierre de sesión incluso si hay error
            AUTH.cerrarSesion();
        }
    },

    /**
     * Obtiene el token de autenticación
     * @returns {string} - Token de autenticación
     */
    obtenerToken() {
        return AUTH.obtenerToken();
    },

    /**
     * Realiza una petición autenticada a la API
     * @param {string} url - URL de la API
     * @param {object} opciones - Opciones de fetch
     * @returns {Promise} - Promesa con la respuesta
     */
    async peticionAPI(url, opciones = {}) {
        try {
            // Configurar headers de autenticación
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.obtenerToken()}`,
                ...opciones.headers
            };

            // Realizar petición
            const response = await fetch(url, {
                ...opciones,
                headers
            });

            // Verificar respuesta
            if (!response.ok) {
                if (response.status === 401) {
                    // Token expirado o inválido
                    // Sesión expirada
                    AUTH.cerrarSesion();
                    return;
                }
                throw new Error(`Error HTTP: ${response.status}`);
            }

            return response;

        } catch (error) {
            // Error en petición API
            throw error;
        }
    },

    /**
     * Maneja errores de autenticación globalmente
     * @param {Error} error - Error a manejar
     */
    manejarErrorAutenticacion(error) {
        // Error de autenticación
        
        if (error.message.includes('401') || error.message.includes('token')) {
            // Sesión expirada
            setTimeout(() => {
                AUTH.cerrarSesion();
            }, 2000);
        } else {
            // Error de autenticación
        }
    }
};

// Inicialización automática cuando se carga el script
// Sistema de Autenticación Admin cargado

// Exportar para uso global
window.AdminAuth = AdminAuth;