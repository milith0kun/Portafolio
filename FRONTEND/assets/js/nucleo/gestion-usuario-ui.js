/**
 * Gestión Unificada de UI de Usuario
 * Maneja la información del usuario y ciclo académico en todas las páginas
 */

class GestionUsuarioUI {
    constructor() {
        this.usuario = null;
        this.cicloActivo = null;
        this.estadoSistema = null;
        this.elementosUI = {};
        
        this.inicializar();
    }
    
    /**
     * Inicializar el sistema de gestión de UI
     */
    inicializar() {
        // Verificar autenticación
        if (!window.AUTH || !window.AUTH.verificarAutenticacion()) {
            console.log('⚠️ Usuario no autenticado, no inicializando UI');
            return;
        }
        
        // Obtener datos del usuario de múltiples fuentes
        this.usuario = this.obtenerDatosUsuario();
        this.cicloActivo = this.obtenerCicloActivo();
        this.estadoSistema = this.obtenerEstadoSistema();
        
        // Buscar elementos de la UI
        this.identificarElementos();
        
        // Actualizar información
        this.actualizarInfoUsuario();
        this.actualizarInfoCiclo();
        this.actualizarEstadoSistema();
        
        // Configurar eventos
        this.configurarEventos();
        
        console.log('✅ Gestión de UI de usuario inicializada');
    }
    
    /**
     * Identificar elementos de la UI en la página actual
     */
    identificarElementos() {
        this.elementosUI = {
            // Información del usuario
            nombreUsuario: document.querySelector('#nombreUsuario, .user-name, .username'),
            rolUsuario: document.querySelector('#rolUsuario, .user-role, .userrole'),
            avatarUsuario: document.querySelector('#avatarUsuario, .user-avatar'),
            emailUsuario: document.querySelector('#emailUsuario, .user-email'),
            
            // Información del ciclo
            nombreCiclo: document.querySelector('#currentCycle, .cycle-name, .ciclo-actual'),
            estadoCiclo: document.querySelector('#cycleStatus, .cycle-status'),
            fechaInicioCiclo: document.querySelector('#cycleStartDate, .cycle-start'),
            fechaFinCiclo: document.querySelector('#cycleEndDate, .cycle-end'),
            
            // Estado del sistema
            estadoSistema: document.querySelector('#systemStatusBadge, .system-status'),
            mensajeEstado: document.querySelector('#systemStatusMessage, .status-message'),
            
            // El cambio de rol ahora se maneja desde tablero.js con el selector
            
            // Selector de ciclo (para administradores)
            selectorCiclo: document.querySelector('#selectorCiclo, .cycle-selector')
        };
        
        // Filtrar elementos que existen
        Object.keys(this.elementosUI).forEach(key => {
            if (!this.elementosUI[key]) {
                delete this.elementosUI[key];
            }
        });
        
        console.log('🔍 Elementos UI identificados:', Object.keys(this.elementosUI));
    }
    
    /**
     * Actualizar información del usuario en la UI
     */
    actualizarInfoUsuario() {
        if (!this.usuario) return;
        
        const nombreCompleto = `${this.usuario.nombres || ''} ${this.usuario.apellidos || ''}`.trim();
        const rolFormateado = this.formatearRol(this.usuario.rolActual || this.usuario.rol);
        
        // Actualizar nombre
        if (this.elementosUI.nombreUsuario) {
            this.elementosUI.nombreUsuario.textContent = nombreCompleto || 'Usuario';
        }
        
        // Actualizar rol
        if (this.elementosUI.rolUsuario) {
            this.elementosUI.rolUsuario.textContent = rolFormateado;
            this.elementosUI.rolUsuario.className = `user-role role-${this.usuario.rolActual || this.usuario.rol}`;
        }
        
        // Actualizar email
        if (this.elementosUI.emailUsuario) {
            this.elementosUI.emailUsuario.textContent = this.usuario.email || this.usuario.correo || '';
        }
        
        // Actualizar avatar
        if (this.elementosUI.avatarUsuario) {
            if (this.usuario.avatar) {
                this.elementosUI.avatarUsuario.src = this.usuario.avatar;
            } else {
                // Generar iniciales
                const iniciales = this.generarIniciales(this.usuario.nombres, this.usuario.apellidos);
                this.elementosUI.avatarUsuario.alt = iniciales;
                this.elementosUI.avatarUsuario.title = nombreCompleto;
            }
        }
        
        console.log('👤 Información de usuario actualizada');
    }
    
    /**
     * Actualizar información del ciclo académico
     */
    actualizarInfoCiclo() {
        if (this.cicloActivo) {
            // Actualizar nombre del ciclo
            if (this.elementosUI.nombreCiclo) {
                this.elementosUI.nombreCiclo.textContent = this.cicloActivo.nombre || 'Sin ciclo';
            }
            
            // Actualizar fechas si están disponibles
            if (this.elementosUI.fechaInicioCiclo && this.cicloActivo.fecha_inicio) {
                this.elementosUI.fechaInicioCiclo.textContent = this.formatearFecha(this.cicloActivo.fecha_inicio);
            }
            
            if (this.elementosUI.fechaFinCiclo && this.cicloActivo.fecha_fin) {
                this.elementosUI.fechaFinCiclo.textContent = this.formatearFecha(this.cicloActivo.fecha_fin);
            }
            
            console.log('📅 Información de ciclo actualizada:', this.cicloActivo.nombre);
        } else {
            // No hay ciclo activo - SOLO actualizar si no hay datos cargados por tablero.js
            if (this.elementosUI.nombreCiclo) {
                const currentText = this.elementosUI.nombreCiclo.textContent;
                // Solo actualizar si no hay información del ciclo cargada
                if (!currentText || currentText === 'Sin ciclo configurado' || currentText.trim() === '') {
                    this.elementosUI.nombreCiclo.textContent = 'Sin ciclo configurado';
                    console.log('⚠️ No hay ciclo activo configurado');
                } else {
                    console.log('🔄 Respetando información de ciclo ya cargada por tablero.js:', currentText);
                }
            }
        }
    }
    
    /**
     * Actualizar estado del sistema
     */
    actualizarEstadoSistema() {
        const mensajes = {
            'configuracion': 'Sistema en configuración inicial',
            'carga_datos': 'Cargando datos académicos',
            'subida_activa': 'Período de subida de documentos activo',
            'verificacion': 'Proceso de verificación en curso',
            'finalizado': 'Ciclo académico finalizado'
        };
        
        const colores = {
            'configuracion': 'warning',
            'carga_datos': 'info',
            'subida_activa': 'success',
            'verificacion': 'primary',
            'finalizado': 'secondary'
        };
        
        const mensaje = mensajes[this.estadoSistema] || 'Estado desconocido';
        const color = colores[this.estadoSistema] || 'secondary';
        
        // Actualizar estado
        if (this.elementosUI.estadoSistema) {
            this.elementosUI.estadoSistema.textContent = this.formatearEstado(this.estadoSistema);
            this.elementosUI.estadoSistema.className = `system-status status-${color}`;
        }
        
        // Actualizar mensaje
        if (this.elementosUI.mensajeEstado) {
            const cicloNombre = this.cicloActivo ? this.cicloActivo.nombre : 'Sin ciclo';
            this.elementosUI.mensajeEstado.textContent = `${mensaje} - Ciclo: ${cicloNombre}`;
        }
        
        console.log('🔄 Estado del sistema actualizado:', this.estadoSistema);
    }
    
    /**
     * Configurar eventos del sistema
     */
    configurarEventos() {
        // Evento de cambio de ciclo
        window.addEventListener('cicloChanged', (event) => {
            this.cicloActivo = event.detail;
            this.actualizarInfoCiclo();
        });
        
        // Evento de cambio de estado del sistema
        window.addEventListener('estadoSistemaChanged', (event) => {
            this.estadoSistema = event.detail;
            this.actualizarEstadoSistema();
        });
        
        // El cambio de rol ahora se maneja desde tablero.js
        
        // Configurar selector de ciclo para administradores SOLO si no está ya configurado
        if (this.elementosUI.selectorCiclo && this.esAdministrador()) {
            // Verificar si el selector ya está configurado por otro componente (tablero.js)
            const selectElement = this.elementosUI.selectorCiclo.querySelector('#selectCiclo');
            const yaConfigurado = selectElement && 
                                  selectElement.hasAttribute('data-evento-configurado') && 
                                  selectElement.options.length > 0;
            
            if (!yaConfigurado) {
                console.log('🔧 Configurando selector de ciclo desde gestion-usuario-ui.js');
                this.configurarSelectorCiclo();
            } else {
                console.log('✅ Selector de ciclo ya configurado por tablero.js, omitiendo configuración');
            }
        }
    }
    
    // Las funciones de cambio de rol se han movido a tablero.js
    
    /**
     * Configurar selector de ciclo para administradores
     */
    async configurarSelectorCiclo() {
        try {
            const ciclos = await this.obtenerCiclosDisponibles();
            this.crearSelectorCiclo(ciclos);
        } catch (error) {
            console.error('Error al configurar selector de ciclo:', error);
        }
    }
    
    /**
     * Crear selector de ciclo
     */
    crearSelectorCiclo(ciclos) {
        const selector = this.elementosUI.selectorCiclo;
        selector.innerHTML = `
            <label for="selectCiclo">Ciclo Académico:</label>
            <select id="selectCiclo" class="form-control">
                ${ciclos.map(ciclo => `
                    <option value="${ciclo.id}" ${ciclo.id === this.cicloActivo?.id ? 'selected' : ''}>
                        ${ciclo.nombre} (${ciclo.estado})
                    </option>
                `).join('')}
            </select>
        `;
        
        selector.querySelector('#selectCiclo').addEventListener('change', (e) => {
            const cicloSeleccionado = ciclos.find(c => c.id == e.target.value);
            this.cambiarCicloActivo(cicloSeleccionado);
        });
    }
    
    /**
     * Cambiar ciclo activo
     */
    async cambiarCicloActivo(nuevoCiclo) {
        try {
            // Limpiar datos del ciclo anterior
            window.CONFIG.CICLOS.limpiarDatosCicloAnterior();
            
            // Establecer nuevo ciclo
            window.CONFIG.CICLOS.establecerCicloActivo(nuevoCiclo);
            
            // Actualizar UI
            this.cicloActivo = nuevoCiclo;
            this.actualizarInfoCiclo();
            
            // Recargar datos de la página
            if (typeof window.cargarDatosPagina === 'function') {
                window.cargarDatosPagina();
            }
            
            console.log('✅ Ciclo activo cambiado a:', nuevoCiclo.nombre);
        } catch (error) {
            console.error('Error al cambiar ciclo activo:', error);
        }
    }
    
    // =============================================
    // MÉTODOS AUXILIARES
    // =============================================
    
    /**
     * Obtener datos del usuario de múltiples fuentes
     */
    obtenerDatosUsuario() {
        // Intentar desde AUTH
        if (window.AUTH && typeof window.AUTH.obtenerUsuario === 'function') {
            const usuario = window.AUTH.obtenerUsuario();
            if (usuario) return usuario;
        }
        
        // Intentar desde AUTH.obtenerDatosUsuario
        if (window.AUTH && typeof window.AUTH.obtenerDatosUsuario === 'function') {
            const usuario = window.AUTH.obtenerDatosUsuario();
            if (usuario) return usuario;
        }
        
        // Intentar desde localStorage
        try {
            const usuarioData = localStorage.getItem('portafolio_docente_user') || 
                               localStorage.getItem('usuario') ||
                               sessionStorage.getItem('portafolio_docente_user');
            if (usuarioData && usuarioData !== 'undefined' && usuarioData !== 'null') {
                return JSON.parse(usuarioData);
            }
        } catch (error) {
            console.warn('Error parsing user data from storage:', error);
        }
        
        return null;
    }

    /**
     * Obtener ciclo activo de múltiples fuentes
     */
    obtenerCicloActivo() {
        // Intentar desde CONFIG
        if (window.CONFIG && window.CONFIG.CICLOS && typeof window.CONFIG.CICLOS.obtenerCicloActivo === 'function') {
            const ciclo = window.CONFIG.CICLOS.obtenerCicloActivo();
            if (ciclo) return ciclo;
        }
        
        // Intentar desde localStorage directamente
        try {
            const cicloData = localStorage.getItem('ciclo_academico_activo');
            if (cicloData && cicloData !== 'undefined' && cicloData !== 'null') {
                return JSON.parse(cicloData);
            }
        } catch (error) {
            console.warn('Error parsing cycle data from storage:', error);
        }
        
        return null;
    }

    /**
     * Obtener estado del sistema de múltiples fuentes
     */
    obtenerEstadoSistema() {
        // Intentar desde CONFIG
        if (window.CONFIG && window.CONFIG.SISTEMA && typeof window.CONFIG.SISTEMA.obtenerEstadoActual === 'function') {
            return window.CONFIG.SISTEMA.obtenerEstadoActual();
        }
        
        // Intentar desde localStorage directamente
        try {
            const estadoData = localStorage.getItem('estado_sistema_actual');
            if (estadoData) {
                return estadoData;
            }
        } catch (error) {
            console.warn('Error getting system state from storage:', error);
        }
        
        return 'configuracion'; // Estado por defecto
    }

    // =============================================
    // MÉTODOS DE UTILIDAD
    // =============================================
    
    formatearRol(rol) {
        const roles = {
            'administrador': 'Administrador',
            'docente': 'Docente',
            'verificador': 'Verificador'
        };
        return roles[rol] || rol;
    }
    
    formatearEstado(estado) {
        const estados = {
            'configuracion': 'Configuración',
            'carga_datos': 'Carga de Datos',
            'subida_activa': 'Subida Activa',
            'verificacion': 'Verificación',
            'finalizado': 'Finalizado'
        };
        return estados[estado] || estado;
    }
    
    obtenerIconoRol(rol) {
        const iconos = {
            'administrador': 'fa-user-shield',
            'docente': 'fa-graduation-cap',
            'verificador': 'fa-check-circle'
        };
        return iconos[rol] || 'fa-user';
    }
    
    generarIniciales(nombres, apellidos) {
        const n = nombres ? nombres.charAt(0).toUpperCase() : '';
        const a = apellidos ? apellidos.charAt(0).toUpperCase() : '';
        return n + a;
    }
    
    formatearFecha(fecha) {
        try {
            return new Date(fecha).toLocaleDateString('es-ES');
        } catch (error) {
            return fecha;
        }
    }
    
    esAdministrador() {
        return this.usuario && this.usuario.rolActual === 'administrador';
    }
    
    async obtenerCiclosDisponibles() {
        try {
            const response = await fetch(`${window.CONFIG.API.BASE_URL}${window.CONFIG.API.ENDPOINTS.CICLOS}`, {
                headers: window.AUTH.construirHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.ciclos || [];
            }
        } catch (error) {
            // Solo mostrar error si no es un problema de conexión
            if (!error.message?.includes('Failed to fetch')) {
            console.error('Error al obtener ciclos:', error);
            } else {
                console.log('📡 Servidor no disponible para obtener ciclos');
            }
        }
        return [];
    }
}

// Inicializar automáticamente cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Pequeño delay para asegurar que AUTH esté inicializado
    setTimeout(() => {
        window.USUARIO_UI = new GestionUsuarioUI();
    }, 100);
});

console.log('✅ Sistema de gestión de UI de usuario cargado'); 