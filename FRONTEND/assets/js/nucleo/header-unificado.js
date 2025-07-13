/**
 * Sistema de Header Unificado
 * Gestiona la navegación, autenticación y datos del usuario de forma consistente
 * en todas las páginas del sistema
 */

class HeaderUnificado {
    constructor() {
        this.usuario = null;
        this.rolActual = null;
        this.rolesDisponibles = [];
        this.initialized = false;
        this.menuConfig = this.getMenuConfig();
    }

    /**
     * Inicializar el header unificado
     */
    async inicializar() {
        if (this.initialized) return;

        try {
            // Verificar si estamos en una página protegida
            if (!this.esPaginaProtegida()) {
                console.log('🏠 Página pública - no inicializando header');
                return;
            }

            // Verificar autenticación
            if (!window.AUTH || !window.AUTH.verificarAutenticacion()) {
                console.log('❌ Usuario no autenticado - redirigiendo');
                this.redirigirALogin();
                return;
            }

            // Obtener datos del usuario
            this.usuario = window.AUTH.obtenerUsuario();
            this.rolActual = window.AUTH.obtenerRolActivo();
            this.rolesDisponibles = window.AUTH.obtenerRolesDisponibles();

            if (!this.usuario || !this.rolActual) {
                console.log('❌ No se pudo obtener información del usuario');
                this.redirigirALogin();
                return;
            }

            // Inicializar componentes del header
            this.inicializarInfoUsuario();
            this.inicializarNavegacion();
            this.inicializarSelectorRoles();
            this.configurarEventos();

            this.initialized = true;
            console.log('✅ Header unificado inicializado para rol:', this.rolActual);

        } catch (error) {
            console.error('❌ Error al inicializar header:', error);
            this.redirigirALogin();
        }
    }

    /**
     * Verificar si es una página protegida
     */
    esPaginaProtegida() {
        const rutaActual = window.location.pathname.toLowerCase();
        const paginasPublicas = [
            '/',
            '/index.html',
            'login.html',
            'selector-roles.html',
            '/autenticacion/',
            'index.html'
        ];

        return !paginasPublicas.some(pagina => 
            rutaActual.includes(pagina) || 
            rutaActual === pagina ||
            rutaActual.endsWith('/')
        );
    }

    /**
     * Inicializar información del usuario
     */
    inicializarInfoUsuario() {
        // Actualizar nombre del usuario
        const nombreUsuario = document.getElementById('nombreUsuario');
        if (nombreUsuario) {
            nombreUsuario.textContent = `${this.usuario.nombres} ${this.usuario.apellidos}`;
        }

        // Actualizar rol del usuario
        const rolUsuario = document.getElementById('rolUsuario');
        if (rolUsuario) {
            rolUsuario.textContent = this.formatearRol(this.rolActual);
        }

        // Actualizar dropdown del usuario
        const dropdownUserName = document.getElementById('dropdownUserName');
        if (dropdownUserName) {
            dropdownUserName.textContent = `${this.usuario.nombres} ${this.usuario.apellidos}`;
        }

        const dropdownUserEmail = document.getElementById('dropdownUserEmail');
        if (dropdownUserEmail) {
            dropdownUserEmail.textContent = this.usuario.correo;
        }
    }

    /**
     * Inicializar navegación dinámica
     */
    inicializarNavegacion() {
        const navMenu = document.getElementById('sidebarMenu');
        if (!navMenu) return;

        // Generar menú según el rol
        const menuItems = this.generarMenuPorRol(this.rolActual);
        navMenu.innerHTML = menuItems;

        // Marcar página actual como activa
        this.marcarPaginaActiva();
    }

    /**
     * Generar menú HTML según el rol
     */
    generarMenuPorRol(rol) {
        const menu = this.menuConfig[rol];
        if (!menu) return '';

        let html = '';
        menu.forEach(item => {
            const isActive = this.esPaginaActiva(item.pagina);
            html += `
                <li class="nav-item">
                    <a href="${item.url}" class="nav-link${isActive ? ' active' : ''}" data-pagina="${item.pagina}">
                        <i class="${item.icono}"></i>
                        <span>${item.titulo}</span>
                    </a>
                </li>
            `;
        });

        return html;
    }

    /**
     * Configuración de menús por rol
     */
    getMenuConfig() {
        return {
            administrador: [
                { pagina: 'tablero', titulo: 'Tablero', icono: 'fas fa-tachometer-alt', url: 'tablero.html' },
                { pagina: 'usuarios', titulo: 'Usuarios', icono: 'fas fa-users', url: 'usuarios.html' },
                { pagina: 'ciclos', titulo: 'Ciclos Académicos', icono: 'fas fa-calendar-alt', url: 'ciclos.html' },
                { pagina: 'asignaturas', titulo: 'Asignaturas', icono: 'fas fa-book', url: 'asignaturas.html' },
                { pagina: 'portafolios', titulo: 'Portafolios', icono: 'fas fa-folder-open', url: 'portafolios.html' },
                { pagina: 'carga-masiva', titulo: 'Carga Masiva', icono: 'fas fa-upload', url: 'carga-masiva.html' },
                { pagina: 'verificar-datos', titulo: 'Verificar Datos', icono: 'fas fa-check-circle', url: 'verificar-datos.html' },
                { pagina: 'reportes', titulo: 'Reportes', icono: 'fas fa-chart-bar', url: 'reportes.html' }
            ],
            docente: [
                { pagina: 'tablero', titulo: 'Tablero', icono: 'fas fa-tachometer-alt', url: 'tablero.html' },
                { pagina: 'portafolios', titulo: 'Mis Portafolios', icono: 'fas fa-folder', url: 'portafolios.html' },
                { pagina: 'gestion-documentos', titulo: 'Gestión de Documentos', icono: 'fas fa-file-alt', url: 'gestion-documentos.html' }
            ],
            verificador: [
                { pagina: 'tablero', titulo: 'Tablero', icono: 'fas fa-tachometer-alt', url: 'tablero.html' },
                { pagina: 'pendientes', titulo: 'Portafolios Pendientes', icono: 'fas fa-clock', url: 'pendientes.html' },
                { pagina: 'portafolios', titulo: 'Portafolios Asignados', icono: 'fas fa-folder-open', url: 'portafolios.html' }
            ]
        };
    }

    /**
     * Inicializar selector de roles
     */
    inicializarSelectorRoles() {
        const roleSelector = document.getElementById('roleSelector');
        const userRoleSelect = document.getElementById('userRoleSelect');

        if (!roleSelector || !userRoleSelect) return;

        // Mostrar selector solo si hay múltiples roles
        if (this.rolesDisponibles.length > 1) {
            roleSelector.style.display = 'block';
            
            // Llenar selector con roles disponibles
            let optionsHtml = '';
            this.rolesDisponibles.forEach(rol => {
                const selected = rol.rol === this.rolActual ? 'selected' : '';
                optionsHtml += `<option value="${rol.rol}" ${selected}>${this.formatearRol(rol.rol)}</option>`;
            });
            
            userRoleSelect.innerHTML = optionsHtml;
        } else {
            roleSelector.style.display = 'none';
        }
    }

    /**
     * Configurar eventos del header
     */
    configurarEventos() {
        // Cambio de rol
        const userRoleSelect = document.getElementById('userRoleSelect');
        if (userRoleSelect) {
            userRoleSelect.addEventListener('change', (e) => {
                this.cambiarRol(e.target.value);
            });
        }

        // Cerrar sesión
        const logoutOption = document.getElementById('logoutOption');
        if (logoutOption) {
            logoutOption.addEventListener('click', (e) => {
                e.preventDefault();
                this.cerrarSesion();
            });
        }

        // Dropdown del usuario
        const userDropdownToggle = document.getElementById('userDropdownToggle');
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdownToggle && userDropdown) {
            userDropdownToggle.addEventListener('click', () => {
                userDropdown.classList.toggle('show');
            });

            // Cerrar dropdown al hacer clic fuera
            document.addEventListener('click', (e) => {
                if (!userDropdownToggle.contains(e.target) && !userDropdown.contains(e.target)) {
                    userDropdown.classList.remove('show');
                }
            });
        }
    }

    /**
     * Verificar si una página está activa
     */
    esPaginaActiva(pagina) {
        const rutaActual = window.location.pathname;
        return rutaActual.includes(pagina + '.html');
    }

    /**
     * Marcar página activa en el menú
     */
    marcarPaginaActiva() {
        const links = document.querySelectorAll('.nav-link');
        links.forEach(link => {
            const pagina = link.getAttribute('data-pagina');
            if (pagina && this.esPaginaActiva(pagina)) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    /**
     * Cambiar rol del usuario
     */
    async cambiarRol(nuevoRol) {
        try {
            if (nuevoRol === this.rolActual) return;

            // Usar el sistema de autenticación para cambiar rol
            const resultado = await window.AUTH.cambiarRol(nuevoRol);
            
            if (resultado.exito) {
                // Recargar página para actualizar interfaz
                window.location.reload();
            } else {
                console.error('Error al cambiar rol:', resultado.mensaje);
                alert('Error al cambiar rol: ' + resultado.mensaje);
            }
        } catch (error) {
            console.error('Error al cambiar rol:', error);
            alert('Error al cambiar rol');
        }
    }

    /**
     * Cerrar sesión
     */
    async cerrarSesion() {
        if (confirm('¿Está seguro que desea cerrar sesión?')) {
            try {
                await window.AUTH.cerrarSesion();
                this.redirigirALogin();
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                // Forzar redirección incluso si hay error
                this.redirigirALogin();
            }
        }
    }

    /**
     * Formatear nombre del rol
     */
    formatearRol(rol) {
        const roles = {
            administrador: 'Administrador',
            docente: 'Docente',
            verificador: 'Verificador'
        };
        return roles[rol] || rol;
    }

    /**
     * Redirigir a login
     */
    redirigirALogin() {
        const loginPath = this.calcularRutaLogin();
        window.location.href = loginPath;
    }

    /**
     * Calcular ruta al login desde la página actual
     */
    calcularRutaLogin() {
        const rutaActual = window.location.pathname;
        const niveles = (rutaActual.match(/\//g) || []).length - 1;
        const prefijo = '../'.repeat(niveles);
        return prefijo + 'paginas/autenticacion/login.html';
    }
}

// Instancia global
window.HeaderUnificado = new HeaderUnificado();

// Auto-inicializar cuando se carga el DOM
document.addEventListener('DOMContentLoaded', () => {
    window.HeaderUnificado.inicializar();
});

// Función de compatibilidad para cerrar sesión
function cerrarSesion() {
    window.HeaderUnificado.cerrarSesion();
} 