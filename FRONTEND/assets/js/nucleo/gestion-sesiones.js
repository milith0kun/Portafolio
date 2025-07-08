/**
 * Sistema de Gestión de Sesiones
 * Maneja cerrar sesión, cambio de roles y eventos de navegación
 */

const GESTION_SESIONES = {
    inicializado: false, // Control para evitar inicializaciones múltiples
    
    /**
     * Inicializa el sistema de gestión de sesiones
     */
    inicializar() {
        if (this.inicializado) {
            console.log('⚠️ Sistema de gestión de sesiones ya inicializado, omitiendo...');
            return;
        }
        
        console.log('🔐 Inicializando sistema de gestión de sesiones...');
        
        // Configurar eventos del navegador
        this.configurarEventosNavegador();
        
        // Inicializar botones de usuario
        this.inicializarBotonesUsuario();
        
        // Cargar información del usuario
        this.cargarInformacionUsuario();
        
        this.inicializado = true;
        console.log('✅ Sistema de gestión de sesiones inicializado');
    },

    /**
     * Configura eventos de navegación del navegador
     */
    configurarEventosNavegador() {
        // Manejar beforeunload (cerrar pestaña/ventana)
        window.addEventListener('beforeunload', (evento) => {
            console.log('🚪 Usuario cerrando pestaña/ventana');
            
            // Verificar si hay trabajo sin guardar
            if (this.hayTrabajoSinGuardar()) {
                evento.preventDefault();
                evento.returnValue = '¿Estás seguro de que quieres salir? Hay cambios sin guardar.';
                return evento.returnValue;
            }
        });

        // Manejar unload (página se descarga)
        window.addEventListener('unload', () => {
            console.log('🔄 Página descargándose...');
            // Aquí podrías hacer limpieza si es necesario
        });

        // Manejar navegación hacia atrás/adelante
        window.addEventListener('popstate', (evento) => {
            console.log('🔙 Usuario navegando hacia atrás/adelante');
            this.manejarNavegacionHistorial(evento);
        });
    },

    /**
     * Inicializa los botones de usuario en el header
     */
    inicializarBotonesUsuario() {
        const userMenu = document.querySelector('.user-menu');
        
        if (userMenu) {
            // Agregar botones de sesión si no existen
            this.agregarBotonesSesion(userMenu);
        }
    },

    /**
     * Agrega botones de cerrar sesión y cambiar rol
     */
    agregarBotonesSesion(userMenu) {
        // Verificar si ya existen los botones
        if (userMenu.querySelector('.session-buttons')) {
            return;
        }

        const sessionButtons = document.createElement('div');
        sessionButtons.className = 'session-buttons';
        sessionButtons.innerHTML = `
            <button class="btn-cerrar-sesion" title="Cerrar Sesión">
                <i class="fas fa-sign-out-alt"></i>
                <span>Cerrar Sesión</span>
            </button>
        `;

        userMenu.appendChild(sessionButtons);

        // Agregar eventos
        sessionButtons.querySelector('.btn-cerrar-sesion').addEventListener('click', () => {
            this.cerrarSesion();
        });
    },

    /**
     * Carga la información del usuario actual
     */
    async cargarInformacionUsuario() {
        try {
            // Intentar obtener datos del usuario de múltiples fuentes
            let usuarioData = null;
            
            // Primero intentar desde AUTH
            if (window.AUTH && typeof window.AUTH.obtenerDatosUsuario === 'function') {
                usuarioData = window.AUTH.obtenerDatosUsuario();
            }
            
            // Si no hay datos, intentar desde AUTH.obtenerUsuario
            if (!usuarioData && window.AUTH && typeof window.AUTH.obtenerUsuario === 'function') {
                usuarioData = window.AUTH.obtenerUsuario();
            }
            
            // Si aún no hay datos, intentar desde localStorage directamente
            if (!usuarioData) {
                const usuarioToken = localStorage.getItem('portafolio_docente_user') || 
                                   localStorage.getItem('usuario') ||
                                   sessionStorage.getItem('portafolio_docente_user');
                if (usuarioToken) {
                    try {
                        usuarioData = JSON.parse(usuarioToken);
                    } catch (e) {
                        console.warn('Error parsing user data from storage:', e);
                    }
                }
            }
            
            if (usuarioData) {
                console.log('✅ Datos de usuario cargados:', usuarioData);
                this.actualizarInterfazUsuario(usuarioData);
            } else {
                console.log('⚠️ No hay datos de usuario disponibles');
                // Intentar cargar desde el backend como fallback
                await this.cargarDatosUsuarioDesdeBackend();
            }
        } catch (error) {
            console.error('❌ Error cargando información del usuario:', error);
        }
    },

    /**
     * Cargar datos del usuario desde el backend como fallback
     */
    async cargarDatosUsuarioDesdeBackend() {
        try {
            const token = localStorage.getItem('portafolio_docente_token') || 
                         localStorage.getItem('token') ||
                         sessionStorage.getItem('portafolio_docente_token');
            
            if (!token) {
                console.log('⚠️ No hay token disponible');
                return;
            }

            const response = await fetch('/api/auth/usuario-actual', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.usuario) {
                    console.log('✅ Datos de usuario obtenidos del backend:', data.usuario);
                    this.actualizarInterfazUsuario(data.usuario);
                    // Guardar en localStorage para futuras consultas
                    localStorage.setItem('portafolio_docente_user', JSON.stringify(data.usuario));
                }
            }
        } catch (error) {
            console.error('❌ Error obteniendo datos del usuario desde backend:', error);
        }
    },

    /**
     * Actualiza la interfaz con los datos del usuario
     */
    actualizarInterfazUsuario(usuarioData) {
        console.log('🔄 Actualizando interfaz con datos del usuario:', usuarioData);
        
        // Procesar nombre completo del usuario
        let nombreCompleto = '';
        if (usuarioData.nombres && usuarioData.apellidos) {
            nombreCompleto = `${usuarioData.nombres} ${usuarioData.apellidos}`.trim();
        } else if (usuarioData.nombre) {
            nombreCompleto = usuarioData.nombre;
        } else if (usuarioData.correo) {
            nombreCompleto = usuarioData.correo.split('@')[0];
        } else {
            nombreCompleto = 'Usuario';
        }

        // Procesar rol del usuario
        let rolUsuario = usuarioData.rolActual || usuarioData.rol || 'Usuario';
        if (rolUsuario) {
            rolUsuario = rolUsuario.charAt(0).toUpperCase() + rolUsuario.slice(1).toLowerCase();
        }

        // Actualizar nombre de usuario en múltiples elementos posibles
        const elementosNombre = [
            document.getElementById('nombreUsuario'),
            document.querySelector('.user-name'),
            document.querySelector('.username'),
            document.querySelector('#userFullName')
        ].filter(el => el !== null);

        elementosNombre.forEach(elemento => {
            elemento.textContent = nombreCompleto;
            elemento.title = `${nombreCompleto} - ${rolUsuario}`;
        });

        // Actualizar rol de usuario en múltiples elementos posibles
        const elementosRol = [
            document.getElementById('rolUsuario'),
            document.querySelector('.user-role'),
            document.querySelector('.userrole'),
            document.querySelector('#userRole')
        ].filter(el => el !== null);

        elementosRol.forEach(elemento => {
            elemento.textContent = rolUsuario;
            elemento.className = `user-role role-${(usuarioData.rolActual || usuarioData.rol || '').toLowerCase()}`;
        });

        // Actualizar email si hay elemento
        const elementoEmail = document.getElementById('emailUsuario') || 
                             document.querySelector('.user-email');
        if (elementoEmail && (usuarioData.correo || usuarioData.email)) {
            elementoEmail.textContent = usuarioData.correo || usuarioData.email;
        }

        // Actualizar avatar/iniciales
        const elementoAvatar = document.querySelector('.user-icon i');
        if (elementoAvatar) {
            // Cambiar icono según el rol
            const iconos = {
                'administrador': 'fas fa-user-shield',
                'admin': 'fas fa-user-shield',
                'docente': 'fas fa-graduation-cap',
                'verificador': 'fas fa-user-check'
            };
            const rolLower = (usuarioData.rolActual || usuarioData.rol || '').toLowerCase();
            const iconoClase = iconos[rolLower] || 'fas fa-user';
            elementoAvatar.className = iconoClase;
        }

        // El cambio de rol ahora se maneja desde tablero.js con el selector de roles

        // Actualizar información adicional del usuario si existe
        this.actualizarInformacionAdicional(usuarioData);
        
        console.log('✅ Interfaz de usuario actualizada correctamente');
    },

    /**
     * Actualiza información adicional del usuario
     */
    actualizarInformacionAdicional(usuarioData) {
        // Actualizar información en elementos específicos de cada página
        const elementos = {
    
            telefono: document.getElementById('userPhone'),
            facultad: document.getElementById('userFaculty'),
            departamento: document.getElementById('userDepartment')
        };


        if (elementos.telefono && usuarioData.telefono) {
            elementos.telefono.textContent = usuarioData.telefono;
        }
        if (elementos.facultad && usuarioData.facultad) {
            elementos.facultad.textContent = usuarioData.facultad;
        }
        if (elementos.departamento && usuarioData.departamento) {
            elementos.departamento.textContent = usuarioData.departamento;
        }
    },

    /**
     * Cierra la sesión del usuario
     */
    async cerrarSesion() {
        try {
            // Mostrar confirmación
            const confirmar = confirm('¿Estás seguro de que quieres cerrar sesión?');
            
            if (!confirmar) {
                return;
            }

            console.log('🔐 Cerrando sesión...');

            // Llamar al sistema AUTH para cerrar sesión
            if (AUTH && typeof AUTH.cerrarSesion === 'function') {
                await AUTH.cerrarSesion();
            } else {
                // Fallback manual si AUTH no está disponible
                this.limpiarDatosLocales();
            }

            // Redirigir al login inmediatamente
            this.redirigirAlLogin();

        } catch (error) {
            console.error('❌ Error cerrando sesión:', error);
            // Forzar limpieza y redirección incluso si hay error
            this.limpiarDatosLocales();
            this.redirigirAlLogin();
        }
    },

    /**
     * Permite cambiar entre roles del usuario
     */
    async cambiarRol() {
        try {
            const usuarioData = AUTH.obtenerDatosUsuario();
            
            if (!usuarioData || !usuarioData.roles || usuarioData.roles.length <= 1) {
                // Si no tiene múltiples roles, enviar al selector de roles
                console.log('🎭 Redirigiendo al selector de roles...');
                const selectorUrl = (typeof CONFIG.getRoute === 'function') ? 
                    CONFIG.getRoute('SELECTOR_ROLES') : 
                    CONFIG.ROUTES.SELECTOR_ROLES;
                window.location.href = selectorUrl;
                return;
            }

            // Mostrar selector de roles
            const nuevoRol = await this.mostrarSelectorRoles(usuarioData.roles);
            
            if (nuevoRol && nuevoRol !== usuarioData.rolActual) {
                console.log(`🔄 Cambiando rol de ${usuarioData.rolActual} a ${nuevoRol}`);
                
                // Guardar nuevo rol
                const resultado = await AUTH.cambiarRol(nuevoRol);
                
                if (resultado.exito) {
                    console.log('✅ Rol cambiado exitosamente');
                    // Redirigir al tablero correspondiente
                    window.location.href = resultado.redirigirA;
                } else {
                    console.error('❌ Error al cambiar rol:', resultado.mensaje);
                    alert('Error al cambiar rol: ' + resultado.mensaje);
                }
            }

        } catch (error) {
            console.error('❌ Error cambiando rol:', error);
            alert('Error al cambiar rol. Por favor, inténtalo de nuevo.');
        }
    },

    /**
     * Muestra un selector de roles
     */
    async mostrarSelectorRoles(roles) {
        return new Promise((resolve) => {
            // Procesar roles para obtener solo el nombre del rol
            const rolesLimpios = roles.map(rol => {
                if (typeof rol === 'object' && rol.rol) {
                    return rol.rol;
                }
                return rol;
            });
            
            const rolesTexto = rolesLimpios.map((rol, index) => 
                `${index + 1}. ${rol.charAt(0).toUpperCase() + rol.slice(1)}`
            ).join('\n');
            
            const seleccion = prompt(`Selecciona tu rol:\n\n${rolesTexto}\n\nIngresa el número (1-${rolesLimpios.length}):`);
            
            if (seleccion !== null && seleccion.trim() !== '') {
                const indice = parseInt(seleccion.trim()) - 1;
                if (indice >= 0 && indice < rolesLimpios.length) {
                    resolve(rolesLimpios[indice]);
                } else {
                    alert('Selección inválida. Por favor, ingresa un número válido.');
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
    },

    /**
     * Redirige según el rol seleccionado
     */
    redirigirSegunRol(rol) {
        const currentPath = window.location.pathname;
        let baseUrl = '';
        
        if (currentPath.includes('/dashboard/')) {
            baseUrl = '../';
        } else {
            baseUrl = './paginas/dashboard/';
        }
        
        const rutas = {
            'admin': baseUrl + 'admin/tablero.html',
            'administrador': baseUrl + 'admin/tablero.html',
            'docente': baseUrl + 'docente/tablero.html',
            'verificador': baseUrl + 'verificador/tablero.html'
        };

        const ruta = rutas[rol.toLowerCase()];
        
        if (ruta) {
            window.location.href = ruta;
        } else {
            console.error('❌ Rol no reconocido:', rol);
            alert('Error: Rol no reconocido');
        }
    },

    /**
     * Limpia los datos locales del usuario
     */
    limpiarDatosLocales() {
        console.log('🧹 Limpiando datos locales...');
        
        // Limpiar localStorage usando las constantes de configuración
        if (CONFIG && CONFIG.STORAGE) {
            localStorage.removeItem(CONFIG.STORAGE.TOKEN);
            localStorage.removeItem(CONFIG.STORAGE.USER);
            localStorage.removeItem(CONFIG.STORAGE.PREFERENCES);
            localStorage.removeItem(CONFIG.STORAGE.SESSION_KEY);
        }
        
        // Limpiar elementos adicionales conocidos
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('rolActual');
        localStorage.removeItem('ultimaActividad');
        localStorage.removeItem('temp_token');
        localStorage.removeItem('temp_user');
        
        // Limpiar sessionStorage
        sessionStorage.clear();
        
        console.log('✅ Datos locales limpiados');
    },

    /**
     * Redirige al login
     */
    redirigirAlLogin() {
        console.log('🔄 Redirigiendo al login...');
        
        // Usar ruta relativa para mayor compatibilidad
        const currentPath = window.location.pathname;
        let loginPath;
        
        if (currentPath.includes('/dashboard/')) {
            loginPath = '../../autenticacion/login.html';
        } else {
            loginPath = CONFIG.getRoute?.('LOGIN') || CONFIG.ROUTES?.LOGIN || './paginas/autenticacion/login.html';
        }
        
        window.location.href = loginPath;
    },

    /**
     * Verifica si hay trabajo sin guardar
     */
    hayTrabajoSinGuardar() {
        // Verificar formularios con cambios
        const formularios = document.querySelectorAll('form');
        
        for (let form of formularios) {
            if (form.dataset.modificado === 'true') {
                return true;
            }
        }
        
        // Verificar textareas o inputs con contenido
        const campos = document.querySelectorAll('textarea[data-changed], input[data-changed]');
        
        return campos.length > 0;
    },

    /**
     * Maneja la navegación del historial del navegador
     */
    manejarNavegacionHistorial(evento) {
        // Verificar si el usuario está autenticado
        const token = AUTH.obtenerToken();
        
        if (!token) {
            console.log('🔐 Usuario no autenticado, redirigiendo al login...');
            this.redirigirAlLogin();
            return;
        }

        // Verificar si la página actual requiere autenticación
        const paginaActual = window.location.pathname;
        const esRutaProtegida = paginaActual.includes('/dashboard/');
        
        if (esRutaProtegida && !AUTH.verificarSesionActiva()) {
            console.log('⚠️ Sesión expirada, redirigiendo al login...');
            this.redirigirAlLogin();
        }
    },

    /**
     * Actualiza la actividad del usuario
     */
    actualizarActividad() {
        const ahora = new Date().getTime();
        localStorage.setItem('ultimaActividad', ahora.toString());
    },

    /**
     * Verifica si la sesión ha expirado por inactividad
     */
    verificarTiempoInactividad() {
        const ultimaActividad = localStorage.getItem('ultimaActividad');
        
        if (!ultimaActividad) {
            return false;
        }

        const ahora = new Date().getTime();
        const tiempoInactivo = ahora - parseInt(ultimaActividad);
        const limiteInactividad = 30 * 60 * 1000; // 30 minutos

        return tiempoInactivo > limiteInactividad;
    },

    /**
     * Obtiene los datos del usuario actual
     * @returns {Object|null} Datos del usuario o null si no está autenticado
     */
    obtenerDatosUsuario() {
        try {
            // Intentar obtener datos del usuario de múltiples fuentes
            let usuarioData = null;
            
            // Primero intentar desde AUTH
            if (window.AUTH && typeof window.AUTH.obtenerDatosUsuario === 'function') {
                usuarioData = window.AUTH.obtenerDatosUsuario();
            }
            
            // Si no hay datos, intentar desde AUTH.obtenerUsuario
            if (!usuarioData && window.AUTH && typeof window.AUTH.obtenerUsuario === 'function') {
                usuarioData = window.AUTH.obtenerUsuario();
            }
            
            // Si aún no hay datos, intentar desde localStorage directamente
            if (!usuarioData) {
                const usuarioToken = localStorage.getItem('portafolio_docente_user') || 
                                   localStorage.getItem('usuario') ||
                                   sessionStorage.getItem('portafolio_docente_user');
                if (usuarioToken && usuarioToken !== 'undefined' && usuarioToken !== 'null') {
                    try {
                        usuarioData = JSON.parse(usuarioToken);
                    } catch (e) {
                        console.warn('Error parsing user data from storage:', e);
                    }
                }
            }
            
            return usuarioData;
        } catch (error) {
            console.error('❌ Error obteniendo datos del usuario:', error);
            return null;
        }
    }
};

// =============================================
// FUNCIONES GLOBALES PARA TODAS LAS PÁGINAS
// =============================================

/**
 * Función global para cerrar sesión desde cualquier página
 */
window.cerrarSesion = function() {
    console.log('🚪 Función global de cerrar sesión llamada');
    
    if (GESTION_SESIONES && typeof GESTION_SESIONES.cerrarSesion === 'function') {
        GESTION_SESIONES.cerrarSesion();
    } else if (AUTH && typeof AUTH.cerrarSesion === 'function') {
        AUTH.cerrarSesion();
    } else {
        // Fallback manual
        console.log('🚨 Fallback manual de cerrar sesión');
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = CONFIG.getRoute?.('LOGIN') || CONFIG.ROUTES?.LOGIN || '/paginas/autenticacion/login.html';
    }
};

/**
 * Función global para cambiar rol desde cualquier página
 */
window.cambiarRol = function() {
    console.log('🎭 Función global de cambiar rol llamada');
    
    if (GESTION_SESIONES && typeof GESTION_SESIONES.cambiarRol === 'function') {
        GESTION_SESIONES.cambiarRol();
    } else {
        // Redirigir al selector de roles
        const selectorUrl = (typeof CONFIG.getRoute === 'function') ? 
            CONFIG.getRoute('SELECTOR_ROLES') : 
            CONFIG.ROUTES.SELECTOR_ROLES;
        window.location.href = selectorUrl;
    }
};

/**
 * Inicializar gestión de sesiones automáticamente
 */
document.addEventListener('DOMContentLoaded', function() {
    // Solo inicializar si estamos en una página del dashboard
    const rutaActual = window.location.pathname;
    const esPaginaDashboard = rutaActual.includes('/dashboard/');
    
    if (esPaginaDashboard && GESTION_SESIONES) {
        console.log('🔐 Inicializando gestión de sesiones para página de dashboard');
        GESTION_SESIONES.inicializar();
        
        // Configurar botones de sesión si existen
        const botonesCerrarSesion = document.querySelectorAll(
            '#cerrarSesion, .cerrar-sesion, #btnCerrarSesion, .btn-cerrar-sesion, [data-action="logout"]'
        );
        
        botonesCerrarSesion.forEach(boton => {
            boton.addEventListener('click', function(e) {
                e.preventDefault();
                window.cerrarSesion();
            });
        });
        
        const botonesCambiarRol = document.querySelectorAll(
            '#cambiarRol, .cambiar-rol, [data-action="change-role"]'
        );
        
        botonesCambiarRol.forEach(boton => {
            boton.addEventListener('click', function(e) {
                e.preventDefault();
                window.cambiarRol();
            });
        });
    }
});

console.log('✅ Sistema de gestión de sesiones cargado y funciones globales registradas');

// Exponer GESTION_SESIONES globalmente
window.gestionSesiones = GESTION_SESIONES;

// Actualizar actividad en eventos de usuario
document.addEventListener('click', () => GESTION_SESIONES.actualizarActividad());
document.addEventListener('keypress', () => GESTION_SESIONES.actualizarActividad());
document.addEventListener('scroll', () => GESTION_SESIONES.actualizarActividad());