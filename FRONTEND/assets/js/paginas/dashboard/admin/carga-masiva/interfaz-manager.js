/**
 * Gestor de Interfaz para Carga Masiva
 * Maneja la navegación, pestañas y elementos visuales de la interfaz
 */

class InterfazManager {
    constructor() {
        this.fasesConfig = {
            carga: {
                name: 'Carga de Datos',
                tab: 'carga-tab',
                content: 'carga-datos',
                completed: false
            },
            verificacion: {
                name: 'Verificación',
                tab: 'verificacion-tab', 
                content: 'verificacion-datos',
                completed: false
            },
            inicializacion: {
                name: 'Inicialización',
                tab: 'init-tab',
                content: 'inicializacion',
                completed: false
            }
        };
        
        this.procesoActual = 'carga';
        this.callbacks = {
            onTabChange: [],
            onError: []
        };
    }

    /**
     * Inicializar el gestor de interfaz
     */
    inicializar() {
        try {
            // Configurar navegación entre pestañas
            this.configurarNavegacion();
            
            // Configurar estado inicial de pestañas
            this.configurarPestanas();
            
            // Inicializar con la primera pestaña activa
            this.mostrarCargaIndividual();
            
            return true;
        } catch (error) {
            this.emitirError('Error al inicializar gestor de interfaz', error);
            return false;
        }
    }

    /**
     * Configurar navegación entre pestañas
     */
    configurarNavegacion() {
        // Configurar eventos de navegación principal
        const navTabs = document.querySelectorAll('#sistemaNav .nav-link');
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Verificar si la pestaña está habilitada
                if (e.target.hasAttribute('disabled') || e.target.closest('.nav-link').hasAttribute('disabled')) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                
                // Actualizar estado visual
                this.actualizarNavegacionVisual(e.target);
                
                // Manejar cambio de pestaña
                this.manejarCambioTab(e);
            });
        });

        // Configurar sub-navegación de carga
        const subTabs = document.querySelectorAll('#single-tab, #bulk-tab');
        subTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetId = e.target.getAttribute('data-bs-target');
                if (targetId === '#single-upload') {
                    this.mostrarCargaIndividual();
                } else if (targetId === '#bulk-upload') {
                    this.mostrarCargaMasiva();
                }
            });
        });
    }

    /**
     * Actualizar navegación visual
     */
    actualizarNavegacionVisual(tabElement) {
        const targetId = tabElement.getAttribute('data-bs-target');
        
        // Remover clases activas
        document.querySelectorAll('#sistemaNav .nav-link').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('show', 'active'));
        
        // Activar nueva pestaña
        tabElement.classList.add('active');
        const targetPanel = document.querySelector(targetId);
        if (targetPanel) {
            targetPanel.classList.add('show', 'active');
        }
    }

    /**
     * Configurar pestañas según el estado del proceso
     */
    configurarPestanas() {
        // Obtener referencias a las pestañas
        const tabCarga = document.getElementById('carga-tab');
        const tabVerificacion = document.getElementById('verificacion-tab');
        const tabInicializacion = document.getElementById('init-tab');
        
        // Asegurar que todas las pestañas estén visibles
        [tabCarga, tabVerificacion, tabInicializacion].forEach(tab => {
            if (tab) {
                tab.style.display = 'block';
                tab.style.visibility = 'visible';
                tab.style.opacity = '1';
                tab.style.pointerEvents = 'auto';
                tab.classList.remove('disabled');
                tab.removeAttribute('disabled');
                tab.removeAttribute('aria-disabled');
                tab.removeAttribute('title');
            }
        });
        
        // Configurar estado inicial - Pestaña de carga activa
        if (tabCarga) {
            tabCarga.classList.add('active');
        }
        
        // Las otras pestañas visibles pero no activas inicialmente
        if (tabVerificacion) {
            tabVerificacion.classList.remove('active');
        }
        
        if (tabInicializacion) {
            tabInicializacion.classList.remove('active');
        }
    }

    /**
     * Habilitar una pestaña específica
     */
    habilitarTab(tab) {
        if (tab) {
            tab.classList.remove('disabled');
            tab.removeAttribute('disabled');
            tab.removeAttribute('aria-disabled');
            tab.style.pointerEvents = 'auto';
            tab.style.opacity = '1';
            tab.removeAttribute('title');
        }
    }

    /**
     * Deshabilitar una pestaña específica
     */
    deshabilitarTab(tab, mensaje = 'Complete los pasos anteriores primero') {
        if (tab) {
            tab.classList.add('disabled');
            tab.setAttribute('disabled', 'true');
            tab.setAttribute('aria-disabled', 'true');
            tab.style.pointerEvents = 'none';
            tab.style.opacity = '0.6';
            tab.setAttribute('title', mensaje);
        }
    }

    /**
     * Activar pestaña específica
     */
    activarPestana(targetId) {
        const tab = document.querySelector(`[data-bs-target="${targetId}"]`);
        if (tab) {
            // Simular click en la pestaña
            tab.click();
        }
    }

    /**
     * Mostrar carga individual
     */
    mostrarCargaIndividual() {
        // Activar pestaña de carga individual
        const singleTab = document.getElementById('single-tab');
        const bulkTab = document.getElementById('bulk-tab');
        const singleContent = document.getElementById('single-upload');
        const bulkContent = document.getElementById('bulk-upload');
        
        if (singleTab && bulkTab && singleContent && bulkContent) {
            // Actualizar pestañas
            singleTab.classList.add('active');
            bulkTab.classList.remove('active');
            
            // Actualizar contenido
            singleContent.classList.add('show', 'active');
            bulkContent.classList.remove('show', 'active');
        }
    }

    /**
     * Mostrar carga masiva
     */
    mostrarCargaMasiva() {
        // Activar pestaña de carga masiva
        const singleTab = document.getElementById('single-tab');
        const bulkTab = document.getElementById('bulk-tab');
        const singleContent = document.getElementById('single-upload');
        const bulkContent = document.getElementById('bulk-upload');
        
        if (singleTab && bulkTab && singleContent && bulkContent) {
            // Actualizar pestañas
            singleTab.classList.remove('active');
            bulkTab.classList.add('active');
            
            // Actualizar contenido
            singleContent.classList.remove('show', 'active');
            bulkContent.classList.add('show', 'active');
        }
    }

    /**
     * Mostrar fase de verificación
     */
    mostrarFaseVerificacion() {
        // Lógica específica para la fase de verificación
        this.procesoActual = 'verificacion';
        
        // Actualizar interfaz según sea necesario
        this.actualizarInterfazSegunFase('verificacion');
    }

    /**
     * Mostrar fase de inicialización
     */
    mostrarFaseInicializacion() {
        // Lógica específica para la fase de inicialización
        this.procesoActual = 'inicializacion';
        
        // Actualizar interfaz según sea necesario
        this.actualizarInterfazSegunFase('inicializacion');
    }

    /**
     * Actualizar interfaz según la fase actual
     */
    actualizarInterfazSegunFase(fase) {
        // Lógica para actualizar la interfaz según la fase
        switch (fase) {
            case 'carga':
                this.habilitarCargaArchivos();
                break;
            case 'verificacion':
                this.mostrarElementosVerificacion();
                break;
            case 'inicializacion':
                this.mostrarElementosInicializacion();
                break;
        }
    }

    /**
     * Habilitar elementos de carga de archivos
     */
    habilitarCargaArchivos() {
        // Habilitar elementos de carga
        const elementos = document.querySelectorAll('.upload-area, .file-input, .upload-btn');
        elementos.forEach(el => {
            el.disabled = false;
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
        });
    }

    /**
     * Deshabilitar elementos de carga de archivos
     */
    deshabilitarCargaArchivos() {
        // Deshabilitar elementos de carga
        const elementos = document.querySelectorAll('.upload-area, .file-input, .upload-btn');
        elementos.forEach(el => {
            el.disabled = true;
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.6';
        });
    }

    /**
     * Mostrar elementos específicos de verificación
     */
    mostrarElementosVerificacion() {
        // Lógica específica para mostrar elementos de verificación
        const verificacionContainer = document.getElementById('verificacion-datos');
        if (verificacionContainer) {
            verificacionContainer.style.display = 'block';
        }
    }

    /**
     * Mostrar elementos específicos de inicialización
     */
    mostrarElementosInicializacion() {
        // Lógica específica para mostrar elementos de inicialización
        const inicializacionContainer = document.getElementById('inicializacion');
        if (inicializacionContainer) {
            inicializacionContainer.style.display = 'block';
        }
    }

    /**
     * Actualizar estado de conexión en la interfaz
     */
    actualizarEstadoConexion(conectado) {
        const estadoConexion = document.getElementById('estadoConexion');
        if (estadoConexion) {
            if (conectado) {
                estadoConexion.innerHTML = '<span class="badge bg-success">🟢 Conectado</span>';
            } else {
                estadoConexion.innerHTML = '<span class="badge bg-warning">🟡 Modo Local</span>';
            }
        }
    }

    /**
     * Mostrar progreso en la interfaz
     */
    mostrarProgreso(porcentaje, mensaje, tipo = 'Single') {
        const progressBar = document.getElementById(`progress${tipo}`) || document.getElementById('progressBar');
        const progressText = document.getElementById(`progressText${tipo}`) || document.getElementById('progressText');
        
        if (progressBar) {
            progressBar.style.width = `${porcentaje}%`;
            progressBar.setAttribute('aria-valuenow', porcentaje);
            progressBar.textContent = `${porcentaje}%`;
        }
        
        if (progressText) {
            progressText.textContent = mensaje;
        }
        
        // Mostrar contenedor de progreso
        const progressContainer = document.getElementById(`progressContainer${tipo}`) || document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
    }

    /**
     * Ocultar progreso
     */
    ocultarProgreso(tipo = 'Single') {
        const progressContainer = document.getElementById(`progressContainer${tipo}`) || document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    /**
     * Configurar interfaz inicial
     */
    configurarInterfazInicial() {
        // Ocultar elementos de carga
        const loadingElements = document.querySelectorAll('.loading, [data-loading], .spinner');
        loadingElements.forEach(el => el.style.display = 'none');
        
        // Hacer visible el contenedor principal
        const container = document.querySelector('.container-fluid');
        if (container) {
            container.style.visibility = 'visible';
            container.style.opacity = '1';
        }
    }

    /**
     * Manejar cambio de pestaña principal
     */
    manejarCambioTab(event) {
        const tab = event.target.closest('.nav-link');
        if (!tab) return;

        // Verificar si la pestaña está deshabilitada
        if (tab.hasAttribute('disabled') || tab.classList.contains('disabled')) {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }

        const targetId = tab.getAttribute('data-bs-target');

        // Actualizar proceso actual según la pestaña
        switch (targetId) {
            case '#carga-datos':
                this.procesoActual = 'carga';
                break;
            case '#verificacion-datos':
                this.procesoActual = 'verificacion';
                this.mostrarFaseVerificacion();
                break;
            case '#inicializacion':
                this.procesoActual = 'inicializacion';
                this.mostrarFaseInicializacion();
                break;
        }
        
        // Emitir evento de cambio de pestaña
        this.emitirCambioTab(targetId, this.procesoActual);
    }

    /**
     * Obtener fase actual
     */
    obtenerFaseActual() {
        const tabActiva = document.querySelector('#cargaTabsNav .nav-link.active');
        if (!tabActiva) return 'uploadLogSingle';
        
        const targetId = tabActiva.getAttribute('data-bs-target');
        
        switch (targetId) {
            case '#carga-datos':
                return 'uploadLogSingle';
            case '#single-upload':
                return 'uploadLogSingle';
            case '#bulk-upload':
                return 'uploadLogBulk';
            case '#verificacion-datos':
                return 'verificacionLog';
            case '#inicializacion':
                return 'initLog';
            default:
                return 'uploadLogSingle';
        }
    }

    /**
     * Registrar callback para eventos
     */
    onTabChange(callback) {
        this.callbacks.onTabChange.push(callback);
    }

    onError(callback) {
        this.callbacks.onError.push(callback);
    }

    /**
     * Emitir evento de cambio de pestaña
     */
    emitirCambioTab(targetId, proceso) {
        this.callbacks.onTabChange.forEach(callback => {
            try {
                callback(targetId, proceso);
            } catch (error) {
                console.error('Error en callback de cambio de pestaña:', error);
            }
        });
    }

    /**
     * Emitir error
     */
    emitirError(mensaje, error = null) {
        this.callbacks.onError.forEach(callback => {
            try {
                callback(mensaje, error);
            } catch (err) {
                console.error('Error en callback de error:', err);
            }
        });
    }
}

// Exportar para uso en otros módulos
window.InterfazManager = InterfazManager;