/**
 * DASHBOARD DOCENTE - Sistema Optimizado
 * Gestiona la funcionalidad del panel principal del docente
 */

class TableroDocente {
    constructor() {
        this.usuario = null;
        this.debug = window.docenteDebug || false;
        this.inicializado = false;
        this.log('TableroDocente inicializado');
    }

    /**
     * Inicializar sistema completo
     */
    async inicializar() {
        if (this.inicializado) {
            this.log('Sistema ya inicializado');
            return;
        }

        try {
            this.log('📚 Iniciando dashboard docente...');
            
            // Verificar autenticación
            if (!this.verificarAutenticacion()) {
                return false;
            }

            // Cargar información del usuario
            this.usuario = AUTH.obtenerUsuario();
            if (this.usuario) {
                this.mostrarInformacionUsuario();
            }

            // Inicializar componentes
            await this.inicializarComponentes();
            
            // Configurar eventos
            this.configurarEventos();
            
            this.inicializado = true;
            this.log('✅ Dashboard docente inicializado exitosamente');
            return true;

        } catch (error) {
            console.error('❌ Error al inicializar dashboard docente:', error);
            return false;
        }
    }

    /**
     * Verificar autenticación para docente
     */
    verificarAutenticacion() {
        if (!AUTH || !AUTH.verificarAutenticacion()) {
            this.log('❌ Usuario no autenticado, redirigiendo al login');
            window.location.href = CONFIG.getRoute('LOGIN');
            return false;
        }

        const rolActivo = AUTH.obtenerRolActivo();
        if (rolActivo !== 'docente') {
            this.log('⚠️ Usuario no es docente, redirigiendo a su dashboard');
            const dashboardCorrect = AUTH.obtenerDashboardPorRol(rolActivo);
            window.location.href = dashboardCorrect;
            return false;
        }

        return true;
    }

    /**
     * Mostrar información del usuario en la interfaz
     */
    mostrarInformacionUsuario() {
        if (!this.usuario) return;

        // Actualizar nombre en header principal
        const nombreUsuario = document.querySelector('#nombreUsuario, .user-name');
        if (nombreUsuario) {
            const nombreCompleto = this.usuario.nombres + ' ' + this.usuario.apellidos;
            nombreUsuario.textContent = nombreCompleto;
        }

        // Actualizar rol
        const rolUsuario = document.querySelector('#rolUsuario, .user-role');
        if (rolUsuario) {
            rolUsuario.textContent = 'Docente';
            rolUsuario.className = rolUsuario.className.replace(/badge-\w+/, 'badge-primary');
        }

        // Actualizar dropdown de usuario
        this.actualizarDropdownUsuario();
        
        this.log('✅ Información de usuario actualizada:', this.usuario.nombres);
    }

    /**
     * Actualizar información en el dropdown de usuario
     */
    actualizarDropdownUsuario() {
        const dropdownUserName = document.getElementById('dropdownUserName');
        if (dropdownUserName) {
            dropdownUserName.textContent = `${this.usuario.nombres} ${this.usuario.apellidos}`;
        }

        const dropdownUserEmail = document.getElementById('dropdownUserEmail');
        if (dropdownUserEmail) {
            dropdownUserEmail.textContent = this.usuario.correo || 'docente@unsaac.edu.pe';
        }

        // Actualizar iconos
        document.querySelectorAll('.user-icon i, .dropdown-user-icon i').forEach(icon => {
            icon.className = 'fas fa-graduation-cap';
        });
    }

    /**
     * Inicializar todos los componentes
     */
    async inicializarComponentes() {
        // Cargar datos en paralelo para mejor rendimiento
        const promesas = [
            this.cargarEstadisticasGenerales(),
            this.cargarPortafolios(),
            this.cargarNotificaciones(),
            this.cargarObservaciones()
        ];

        await Promise.allSettled(promesas);
        
        // Configurar navegación si está disponible
        if (window.NAVEGACION) {
            NAVEGACION.renderizarMenu();
        }

        this.log('✅ Componentes inicializados');
    }

    /**
     * Cargar estadísticas generales del docente
     */
    async cargarEstadisticasGenerales() {
        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}/dashboard/docente/estadisticas`, {
                method: 'GET',
                headers: AUTH.construirHeaders()
            });

            if (response.ok) {
                const stats = await response.json();
                this.actualizarEstadisticas(stats);
            } else {
                this.log('Error al cargar estadísticas del servidor');
                this.actualizarEstadisticas({ documentosSubidos: 0, totalDocumentos: 0, documentosAprobados: 0, documentosPendientes: 0, documentosObservados: 0, porcentajeCompletitud: 0 });
            }
        } catch (error) {
            this.log('Error al cargar estadísticas:', error);
            this.actualizarEstadisticas({ documentosSubidos: 0, totalDocumentos: 0, documentosAprobados: 0, documentosPendientes: 0, documentosObservados: 0, porcentajeCompletitud: 0 });
        }
    }

    /**
     * Actualizar estadísticas en el dashboard
     */
    actualizarEstadisticas(stats) {
        const elementos = {
            'uploadedDocs': `${stats.documentosSubidos || 0}/${stats.totalDocumentos || 0}`,
            'approvedDocs': stats.documentosAprobados || 0,
            'pendingDocs': stats.documentosPendientes || 0,
            'rejectedDocs': stats.documentosObservados || 0
        };

        Object.entries(elementos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = valor;
            }
        });

        // Actualizar progreso circular
        const progressCircle = document.querySelector('.circle-progress');
        if (progressCircle && stats.porcentajeCompletitud !== undefined) {
            progressCircle.dataset.percentage = stats.porcentajeCompletitud;
            const percentageElement = progressCircle.querySelector('.percentage');
            if (percentageElement) {
                percentageElement.textContent = `${stats.porcentajeCompletitud}%`;
            }
        }
    }



    /**
     * Cargar portafolios del docente
     */
    async cargarPortafolios() {
        try {
            this.log('📁 Cargando portafolios del docente...');
            
            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.PORTAFOLIOS}/mis-portafolios`, {
                method: 'GET',
                headers: AUTH.construirHeaders()
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.portafolios = data.data || [];
                this.mostrarPortafolios(this.portafolios);
                this.log(`✅ ${this.portafolios.length} portafolios cargados`);
            } else {
                throw new Error(data.message || 'Error al obtener portafolios');
            }
            
        } catch (error) {
            this.log('❌ Error al cargar portafolios:', error);
            this.mostrarErrorPortafolios();
        }
    }

    /**
     * Mostrar portafolios en el dashboard
     */
    mostrarPortafolios(portafolios) {
        const subjectsList = document.getElementById('subjectsList');
        if (!subjectsList) return;

        if (!portafolios || portafolios.length === 0) {
            subjectsList.innerHTML = `
                <div class="no-subjects">
                    <div class="no-subjects-icon">
                        <i class="fas fa-book-open"></i>
                    </div>
                    <h4>No hay asignaturas asignadas</h4>
                    <p>Contacte con el administrador para la asignación de materias</p>
                    <button class="btn btn-primary btn-sm" onclick="window.location.reload()">
                        <i class="fas fa-refresh"></i> Actualizar
                    </button>
                </div>
            `;
            return;
        }

        // Agrupar portafolios por asignatura
        const portafoliosPorAsignatura = this.agruparPortafoliosPorAsignatura(portafolios);
        
        const html = Object.values(portafoliosPorAsignatura).map(grupo => {
            const asignatura = grupo.asignatura;
            const portafolio = grupo.portafolios[0]; // Tomar el primer portafolio como principal
            
            return `
                <div class="subject-item" data-asignatura-id="${asignatura.id}">
                    <div class="subject-header">
                        <div class="subject-icon">
                            <i class="fas fa-book"></i>
                        </div>
                        <div class="subject-info">
                            <h4 class="subject-name">${asignatura.nombre}</h4>
                            <p class="subject-code">Código: ${asignatura.codigo}</p>
                            <p class="subject-career">${asignatura.carrera?.nombre || 'Carrera no especificada'}</p>
                        </div>
                    </div>
                    
                    <div class="subject-progress">
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${portafolio.progreso_completado || 0}%;"></div>
                            </div>
                            <span class="progress-text">${portafolio.progreso_completado || 0}% completado</span>
                        </div>
                    </div>
                    
                    <div class="subject-actions">
                        <button class="btn btn-sm btn-primary" onclick="window.TableroDocente.verPortafolio(${portafolio.id})">
                            <i class="fas fa-folder-open"></i> Ver Portafolio
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="window.TableroDocente.subirDocumento(${portafolio.id})">
                            <i class="fas fa-upload"></i> Subir
                        </button>
                    </div>
                    
                    <div class="subject-stats">
                        <div class="stat-item">
                            <span class="stat-label">Documentos:</span>
                            <span class="stat-value">${grupo.totalDocumentos || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Pendientes:</span>
                            <span class="stat-value">${grupo.documentosPendientes || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        subjectsList.innerHTML = html;
    }

    /**
     * Agrupar portafolios por asignatura
     */
    agruparPortafoliosPorAsignatura(portafolios) {
        const grupos = {};
        
        portafolios.forEach(portafolio => {
            if (!portafolio.asignatura) return;
            
            const asignaturaId = portafolio.asignatura.id;
            
            if (!grupos[asignaturaId]) {
                grupos[asignaturaId] = {
                    asignatura: portafolio.asignatura,
                    portafolios: [],
                    totalDocumentos: 0,
                    documentosPendientes: 0
                };
            }
            
            grupos[asignaturaId].portafolios.push(portafolio);
            // Aquí se pueden agregar más estadísticas
        });
        
        return grupos;
    }

    /**
     * Mostrar error al cargar portafolios
     */
    mostrarErrorPortafolios() {
        const subjectsList = document.getElementById('subjectsList');
        if (!subjectsList) return;

        subjectsList.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h4>Error al cargar portafolios</h4>
                <p>No se pudieron cargar sus asignaturas. Verifique su conexión.</p>
                <button class="btn btn-primary btn-sm" onclick="window.TableroDocente.cargarPortafolios()">
                    <i class="fas fa-retry"></i> Reintentar
                </button>
            </div>
        `;
    }

    /**
     * Ver portafolio específico
     */
    verPortafolio(portafolioId) {
        this.log(`📂 Abriendo portafolio ${portafolioId}`);
        // Implementar navegación al portafolio específico
        window.location.href = `explorador.html?portafolio=${portafolioId}`;
    }

    /**
     * Subir documento a portafolio
     */
    subirDocumento(portafolioId) {
        this.log(`📤 Subir documento al portafolio ${portafolioId}`);
        // Implementar navegación a subida de documentos
        window.location.href = `subir.html?portafolio=${portafolioId}`;
    }

    /**
     * Cargar notificaciones recientes
     */
    async cargarNotificaciones() {
        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.NOTIFICACIONES}/recientes`, {
                method: 'GET',
                headers: AUTH.construirHeaders()
            });

            if (response.ok) {
                const notificaciones = await response.json();
                this.mostrarNotificaciones(notificaciones);
            }
        } catch (error) {
            this.log('Error al cargar notificaciones:', error);
        }
    }

    /**
     * Mostrar notificaciones en el dashboard
     */
    mostrarNotificaciones(notificaciones) {
        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;

        if (!notificaciones || notificaciones.length === 0) {
            notificationsList.innerHTML = '<p class="text-muted">No hay notificaciones recientes</p>';
            return;
        }

        const html = notificaciones.map(notificacion => `
            <div class="notification-item">
                <div class="notification-icon">
                    <i class="${this.obtenerIconoNotificacion(notificacion.tipo)}"></i>
                </div>
                <div class="notification-content">
                    <p>${notificacion.mensaje}</p>
                    <span class="notification-date">${this.formatearFecha(notificacion.fecha)}</span>
                </div>
            </div>
        `).join('');

        notificationsList.innerHTML = html;
    }

    /**
     * Cargar observaciones recientes
     */
    async cargarObservaciones() {
        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}/observaciones/recientes`, {
                method: 'GET',
                headers: AUTH.construirHeaders()
            });

            if (response.ok) {
                const observaciones = await response.json();
                this.mostrarObservaciones(observaciones);
            }
        } catch (error) {
            this.log('Error al cargar observaciones:', error);
        }
    }

    /**
     * Mostrar observaciones en el dashboard
     */
    mostrarObservaciones(observaciones) {
        const observationsList = document.getElementById('observationsList');
        if (!observationsList) return;

        if (!observaciones || observaciones.length === 0) {
            observationsList.innerHTML = '<p class="text-muted">No hay observaciones recientes</p>';
            return;
        }

        const html = observaciones.map(observacion => `
            <div class="observation-item">
                <div class="observation-content">
                    <p><strong>${observacion.titulo}</strong></p>
                    <p>${observacion.descripcion}</p>
                    <span class="observation-date">${this.formatearFecha(observacion.fecha)}</span>
                </div>
            </div>
        `).join('');

        observationsList.innerHTML = html;
    }

    /**
     * Configurar eventos del dashboard
     */
    configurarEventos() {
        // Configurar dropdown de usuario
        this.configurarDropdownUsuario();
        
        // Configurar acciones rápidas
        this.configurarAccionesRapidas();
        
        // Configurar cierre de sesión
        this.configurarCerrarSesion();

        this.log('✅ Eventos configurados');
    }

    /**
     * Configurar dropdown de usuario
     */
    configurarDropdownUsuario() {
        const userDropdownToggle = document.getElementById('userDropdownToggle');
        const userDropdown = document.getElementById('userDropdown');
        const userMenu = document.getElementById('userMenu');

        if (!userDropdownToggle || !userDropdown || !userMenu) return;

        // Toggle del dropdown
        userDropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isOpen = userDropdown.classList.contains('show');
            
            if (isOpen) {
                this.cerrarDropdown(userDropdown, userDropdownToggle);
            } else {
                this.abrirDropdown(userDropdown, userDropdownToggle);
            }
        });

        // Cerrar dropdown al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!userMenu.contains(e.target)) {
                this.cerrarDropdown(userDropdown, userDropdownToggle);
            }
        });

        // Configurar opciones del dropdown
        this.configurarOpcionesDropdown();
    }

    /**
     * Abrir dropdown
     */
    abrirDropdown(dropdown, toggle) {
        dropdown.style.display = 'block';
        setTimeout(() => {
            dropdown.classList.add('show');
            toggle.classList.add('active');
        }, 10);
    }

    /**
     * Cerrar dropdown
     */
    cerrarDropdown(dropdown, toggle) {
        dropdown.classList.remove('show');
        toggle.classList.remove('active');
        setTimeout(() => {
            if (!dropdown.classList.contains('show')) {
                dropdown.style.display = 'none';
            }
        }, 300);
    }

    /**
     * Configurar opciones del dropdown
     */
    configurarOpcionesDropdown() {
        const opciones = {
            'logoutOption': () => this.cerrarSesion(),
            'profileOption': () => this.log('Navegar a perfil'),
            'settingsOption': () => this.log('Navegar a configuración'),
            'helpOption': () => window.open('../compartidas/ayuda.html', '_blank')
        };

        Object.entries(opciones).forEach(([id, callback]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.addEventListener('click', (e) => {
                    e.preventDefault();
                    callback();
                });
            }
        });
    }

    /**
     * Configurar acciones rápidas
     */
    configurarAccionesRapidas() {
        const acciones = document.querySelectorAll('.quick-action');
        acciones.forEach(accion => {
            accion.addEventListener('click', (e) => {
                const pagina = e.currentTarget.dataset.page;
                if (pagina) {
                    this.navegarAPagina(pagina);
                }
            });
        });
    }

    /**
     * Navegar a una página específica
     */
    navegarAPagina(pagina) {
        const rutas = {
            'portafolios': 'portafolios.html',
            'documentos': 'documentos.html', 
            'observaciones': 'observaciones.html',
            'perfil': 'perfil.html'
        };

        if (rutas[pagina]) {
            window.location.href = rutas[pagina];
        }
    }

    /**
     * Configurar eventos de cierre de sesión
     */
    configurarCerrarSesion() {
        // Buscar todos los elementos de cerrar sesión
        const elementosCerrarSesion = document.querySelectorAll('#cerrarSesion, .cerrar-sesion, [data-action="logout"]');
        
        elementosCerrarSesion.forEach(elemento => {
            elemento.addEventListener('click', (e) => {
                e.preventDefault();
                this.cerrarSesion();
            });
        });
    }

    /**
     * Cerrar sesión del usuario
     */
    cerrarSesion() {
        try {
            this.log('👋 Cerrando sesión...');
            
            setTimeout(() => {
                AUTH.cerrarSesion();
            }, 1000);

        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            AUTH.cerrarSesion();
        }
    }

    /**
     * Utilidades
     */
    obtenerIconoNotificacion(tipo) {
        const iconos = {
            'info': 'fas fa-info-circle text-primary',
            'warning': 'fas fa-exclamation-triangle text-warning',
            'success': 'fas fa-check-circle text-success',
            'error': 'fas fa-times-circle text-danger'
        };
        return iconos[tipo] || 'fas fa-bell text-secondary';
    }

    formatearFecha(fecha) {
        return new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Logging para desarrollo
     */
    log(...args) {
        if (this.debug) {
            console.log('[TableroDocente]', ...args);
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    const tablero = new TableroDocente();
    await tablero.inicializar();
    
    // Exponer para debugging
    if (window.docenteDebug) {
        window.TableroDocente = tablero;
    }
});