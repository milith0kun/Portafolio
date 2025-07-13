/**
 * Sistema de Sincronización de Estado
 * Mantiene sincronizado el estado del sistema entre frontend y backend
 * para todos los roles de usuario
 */

class SincronizacionEstado {
    constructor() {
        this.estadoActual = {
            cicloActivo: null,
            estadoSistema: 'configuracion',
            notificaciones: [],
            estadisticas: {},
            ultimaActualizacion: null
        };
        this.intervalos = {
            estado: null,
            notificaciones: null
        };
        this.configuracion = {
            intervalosActualizacion: {
                estado: 30000, // 30 segundos
                notificaciones: 60000 // 1 minuto
            }
        };
        this.inicializado = false;
    }

    /**
     * Inicializar sincronización
     */
    async inicializar() {
        if (this.inicializado) return;

        try {
            console.log('🔄 Inicializando sincronización de estado...');

            // Verificar autenticación
            if (!window.AUTH || !window.AUTH.verificarAutenticacion()) {
                console.log('❌ Usuario no autenticado - no iniciando sincronización');
                return;
            }

            // Cargar estado inicial
            await this.cargarEstadoInicial();

            // Configurar actualizaciones automáticas
            this.configurarActualizacionesAutomaticas();

            // Configurar eventos
            this.configurarEventos();

            this.inicializado = true;
            console.log('✅ Sincronización de estado inicializada');

        } catch (error) {
            console.error('❌ Error inicializando sincronización:', error);
        }
    }

    /**
     * Cargar estado inicial del sistema
     */
    async cargarEstadoInicial() {
        try {
            // Cargar estado del sistema
            await this.actualizarEstadoSistema();

            // Cargar ciclo activo
            await this.actualizarCicloActivo();

            // Cargar estadísticas según el rol
            await this.actualizarEstadisticas();

            // Cargar notificaciones
            await this.actualizarNotificaciones();

        } catch (error) {
            console.error('❌ Error cargando estado inicial:', error);
        }
    }

    /**
     * Actualizar estado del sistema
     */
    async actualizarEstadoSistema() {
        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DASHBOARD}/estado-sistema`, {
                headers: window.AUTH.construirHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.estadoActual.estadoSistema = data.data.estado;
                    this.estadoActual.ultimaActualizacion = new Date();
                    this.actualizarInterfazEstado(data.data);
                }
            }
        } catch (error) {
            console.error('Error actualizando estado del sistema:', error);
        }
    }

    /**
     * Actualizar ciclo académico activo
     */
    async actualizarCicloActivo() {
        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.CICLOS}/activo`, {
                headers: window.AUTH.construirHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.estadoActual.cicloActivo = data.data;
                    this.actualizarInterfazCiclo(data.data);
                    
                    // Emitir evento de cambio de ciclo
                    this.emitirEvento('ciclo-actualizado', data.data);
                }
            }
        } catch (error) {
            console.error('Error actualizando ciclo activo:', error);
        }
    }

    /**
     * Actualizar estadísticas según el rol
     */
    async actualizarEstadisticas() {
        try {
            const rolActual = window.AUTH.obtenerRolActivo();
            let endpoint = '';

            switch (rolActual) {
                case 'administrador':
                    endpoint = `${CONFIG.API.ENDPOINTS.DASHBOARD}/estadisticas-admin`;
                    break;
                case 'docente':
                    endpoint = `${CONFIG.API.ENDPOINTS.DASHBOARD}/estadisticas-docente`;
                    break;
                case 'verificador':
                    endpoint = `${CONFIG.API.ENDPOINTS.DASHBOARD}/estadisticas-verificador`;
                    break;
                default:
                    return;
            }

            // Obtener ciclo actual para filtrar datos
            let cicloActual = null;
            if (window.SincronizacionCiclos && typeof window.SincronizacionCiclos.obtenerCicloActual === 'function') {
                cicloActual = window.SincronizacionCiclos.obtenerCicloActual();
            } else if (this.estadoActual.cicloActivo) {
                cicloActual = this.estadoActual.cicloActivo.id;
            }

            // Construir URL con parámetros de ciclo
            let url = `${CONFIG.API.BASE_URL}${endpoint}`;
            if (cicloActual) {
                url += `?ciclo=${cicloActual}`;
                // Solo mostrar en modo debug
        if (window.CONFIG?.DEBUG) {
            console.log('📊 Obteniendo estadísticas para ciclo:', cicloActual);
        }
            }

            const response = await fetch(url, {
                headers: window.AUTH.construirHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.estadoActual.estadisticas = data.data;
                    this.actualizarInterfazEstadisticas(data.data, rolActual);
                }
            }
        } catch (error) {
            console.error('Error actualizando estadísticas:', error);
        }
    }

    /**
     * Actualizar notificaciones
     */
    async actualizarNotificaciones() {
        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.NOTIFICACIONES}/recientes`, {
                headers: window.AUTH.construirHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.estadoActual.notificaciones = data.data || [];
                    this.actualizarInterfazNotificaciones(data.data);
                }
            }
        } catch (error) {
            console.error('Error actualizando notificaciones:', error);
        }
    }

    /**
     * Configurar actualizaciones automáticas
     */
    configurarActualizacionesAutomaticas() {
        // Actualizar estado del sistema cada 30 segundos
        this.intervalos.estado = setInterval(() => {
            this.actualizarEstadoSistema();
            this.actualizarCicloActivo();
            this.actualizarEstadisticas();
        }, this.configuracion.intervalosActualizacion.estado);

        // Actualizar notificaciones cada minuto
        this.intervalos.notificaciones = setInterval(() => {
            this.actualizarNotificaciones();
        }, this.configuracion.intervalosActualizacion.notificaciones);

        // Solo mostrar en modo debug
        if (window.CONFIG?.DEBUG) {
            console.log('⏰ Actualizaciones automáticas configuradas');
        }
    }

    /**
     * Configurar eventos del sistema
     */
    configurarEventos() {
        // Escuchar cambios de visibilidad de la página
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Página visible, actualizar estado inmediatamente
                this.actualizarTodo();
            }
        });

        // Escuchar eventos personalizados
        document.addEventListener('forzar-actualizacion-estado', () => {
            this.actualizarTodo();
        });

        // Suscribirse a eventos de cambio de ciclo
        document.addEventListener('cicloCoordinado', (event) => {
            console.log('🔄 Sincronización de estado detectó cambio de ciclo:', event.detail.cicloId);
            this.actualizarTodo();
        });

        // Eventos específicos de cambio de ciclo
        document.addEventListener('cicloActivoCambiado', (event) => {
            console.log('🔄 Actualizando estado por cambio de ciclo activo:', event.detail);
            this.estadoActual.cicloActivo = event.detail;
            this.actualizarTodo();
        });

        // Antes de cerrar la ventana, limpiar intervalos
        window.addEventListener('beforeunload', () => {
            this.limpiarIntervalos();
        });
    }

    /**
     * Actualizar todo el estado
     */
    async actualizarTodo() {
        await this.actualizarEstadoSistema();
        await this.actualizarCicloActivo();
        await this.actualizarEstadisticas();
        await this.actualizarNotificaciones();
    }

    /**
     * Actualizar interfaz con estado del sistema
     */
    actualizarInterfazEstado(estadoData) {
        // Actualizar mensaje de estado
        const mensaje = document.getElementById('systemStatusMessage');
        if (mensaje) {
            mensaje.textContent = estadoData.mensaje || 'Sistema funcionando correctamente';
        }

        // Actualizar badge de estado
        const badge = document.getElementById('systemStatusBadge');
        if (badge) {
            badge.textContent = this.formatearEstado(estadoData.estado);
            badge.className = `status-badge ${this.obtenerClaseEstado(estadoData.estado)}`;
        }

        // Actualizar estado del sistema en interfaz
        const estadoSistema = document.getElementById('estadoSistema');
        if (estadoSistema) {
            estadoSistema.textContent = this.formatearEstado(estadoData.estado);
        }
    }

    /**
     * Actualizar interfaz con ciclo activo
     */
    actualizarInterfazCiclo(cicloData) {
        // Actualizar nombre del ciclo
        const nombreCiclo = document.getElementById('nombreCiclo');
        if (nombreCiclo) {
            nombreCiclo.textContent = cicloData.nombre || 'Sin ciclo activo';
        }

        // Actualizar fechas
        const fechaInicio = document.getElementById('fechaInicioCiclo');
        if (fechaInicio) {
            fechaInicio.textContent = this.formatearFecha(cicloData.fecha_inicio);
        }

        const fechaFin = document.getElementById('fechaFinCiclo');
        if (fechaFin) {
            fechaFin.textContent = this.formatearFecha(cicloData.fecha_fin);
        }

        // Actualizar selector de ciclo si existe
        const selectCiclo = document.getElementById('selectCiclo');
        if (selectCiclo && window.GeneracionPortafoliosAdmin) {
            window.GeneracionPortafoliosAdmin.filtros.ciclo = cicloData.id;
        }
    }

    /**
     * Actualizar interfaz con estadísticas
     */
    actualizarInterfazEstadisticas(estadisticas, rol) {
        switch (rol) {
            case 'administrador':
                this.actualizarEstadisticasAdmin(estadisticas);
                break;
            case 'docente':
                this.actualizarEstadisticasDocente(estadisticas);
                break;
            case 'verificador':
                this.actualizarEstadisticasVerificador(estadisticas);
                break;
        }
    }

    /**
     * Actualizar estadísticas de administrador
     */
    actualizarEstadisticasAdmin(stats) {
        const actualizarElemento = (id, valor) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.textContent = valor || '0';
        };

        actualizarElemento('totalUsuarios', stats.totalUsuarios);
        actualizarElemento('totalPortafolios', stats.totalPortafolios);
        actualizarElemento('portafoliosActivos', stats.portafoliosActivos);
        actualizarElemento('totalAsignaturas', stats.totalAsignaturas);
    }

    /**
     * Actualizar estadísticas de docente
     */
    actualizarEstadisticasDocente(stats) {
        const actualizarElemento = (id, valor) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.textContent = valor || '0';
        };

        actualizarElemento('uploadedDocs', `${stats.documentosSubidos || 0}/${stats.totalDocumentos || 0}`);
        actualizarElemento('approvedDocs', stats.documentosAprobados);
        actualizarElemento('pendingDocs', stats.documentosPendientes);
        actualizarElemento('rejectedDocs', stats.documentosObservados);
    }

    /**
     * Actualizar estadísticas de verificador
     */
    actualizarEstadisticasVerificador(stats) {
        const actualizarElemento = (id, valor) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.textContent = valor || '0';
        };

        actualizarElemento('totalPending', stats.documentosPendientes);
        actualizarElemento('urgentPending', stats.documentosUrgentes);
        actualizarElemento('newToday', stats.documentosNuevosHoy);
        actualizarElemento('totalReviewed', stats.documentosRevisados);
        actualizarElemento('reviewedToday', stats.documentosRevisadosHoy);
    }

    /**
     * Actualizar interfaz con notificaciones
     */
    actualizarInterfazNotificaciones(notificaciones) {
        const lista = document.getElementById('notificationsList');
        if (!lista) return;

        if (!notificaciones || notificaciones.length === 0) {
            lista.innerHTML = '<p class="text-muted">No hay notificaciones recientes</p>';
            return;
        }

        let html = '';
        notificaciones.slice(0, 5).forEach(notif => {
            html += `
                <div class="notification-item">
                    <div class="notification-icon">
                        <i class="fas fa-${this.obtenerIconoNotificacion(notif.tipo)}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${notif.titulo}</div>
                        <div class="notification-text">${notif.mensaje}</div>
                        <div class="notification-time">${this.formatearFecha(notif.fecha)}</div>
                    </div>
                </div>
            `;
        });

        lista.innerHTML = html;
    }

    /**
     * Obtener ícono de notificación
     */
    obtenerIconoNotificacion(tipo) {
        const iconos = {
            'info': 'info-circle',
            'success': 'check-circle',
            'warning': 'exclamation-triangle',
            'error': 'times-circle',
            'portafolio': 'folder',
            'documento': 'file-alt'
        };
        return iconos[tipo] || 'bell';
    }

    /**
     * Formatear estado
     */
    formatearEstado(estado) {
        const estados = {
            'configuracion': 'Configuración',
            'carga_datos': 'Cargando Datos',
            'subida_activa': 'Subidas Activas',
            'verificacion': 'En Verificación',
            'finalizado': 'Finalizado'
        };
        return estados[estado] || estado;
    }

    /**
     * Obtener clase CSS para estado
     */
    obtenerClaseEstado(estado) {
        const clases = {
            'configuracion': 'warning',
            'carga_datos': 'info',
            'subida_activa': 'success',
            'verificacion': 'primary',
            'finalizado': 'secondary'
        };
        return clases[estado] || 'secondary';
    }

    /**
     * Formatear fecha
     */
    formatearFecha(fecha) {
        if (!fecha) return '--/--/----';
        
        try {
            const date = new Date(fecha);
            return date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return '--/--/----';
        }
    }

    /**
     * Emitir evento personalizado
     */
    emitirEvento(tipo, datos) {
        document.dispatchEvent(new CustomEvent(tipo, {
            detail: datos
        }));
    }

    /**
     * Obtener estado actual
     */
    obtenerEstadoActual() {
        return { ...this.estadoActual };
    }

    /**
     * Limpiar intervalos
     */
    limpiarIntervalos() {
        if (this.intervalos.estado) {
            clearInterval(this.intervalos.estado);
            this.intervalos.estado = null;
        }

        if (this.intervalos.notificaciones) {
            clearInterval(this.intervalos.notificaciones);
            this.intervalos.notificaciones = null;
        }
    }

    /**
     * Destruir instancia
     */
    destruir() {
        this.limpiarIntervalos();
        this.inicializado = false;
        console.log('🔄 Sincronización de estado finalizada');
    }
}

// Instancia global
window.SincronizacionEstado = new SincronizacionEstado();

// Auto-inicializar cuando se carga el DOM
document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializar en páginas protegidas
    const rutaActual = window.location.pathname.toLowerCase();
    const esPaginaProtegida = !rutaActual.includes('login') && 
                              !rutaActual.includes('selector-roles') && 
                              rutaActual.includes('dashboard');
    
    if (esPaginaProtegida) {
        // Esperar un poco para que se inicialice AUTH primero
        setTimeout(() => {
            window.SincronizacionEstado.inicializar();
        }, 1000);
    }
}); 