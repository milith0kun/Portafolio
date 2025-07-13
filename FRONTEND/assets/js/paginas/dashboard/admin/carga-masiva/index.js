/**
 * Sistema de Carga Masiva - Archivo Principal Modularizado
 * Integra todos los módulos del sistema de carga masiva
 */

class CargaMasiva {
    constructor() {
        // Configuración general
        this.debug = false;
        this.version = '2.0.0';
        
        // Managers
        this.ciclosManager = null;
        this.estadoManager = null;
        this.interfazManager = null;
        this.logsManager = null;
        this.archivosManager = null;
        this.validacionesManager = null;
        this.verificacionDatos = null;
        this.apiService = null;
        
        // Estado de inicialización
        this.inicializado = false;
        this.autenticado = false;
        
        // Configuración de roles permitidos
        this.rolesPermitidos = ['admin', 'administrador', 'coordinador'];
    }

    /**
     * Inicializar el sistema completo
     */
    async inicializar() {
        try {
            console.log('🚀 Iniciando Sistema de Carga Masiva v' + this.version);
            
            // Verificar autenticación
            const autenticado = await this.verificarAutenticacion();
            if (!autenticado) {
                console.warn('⚠️ Usuario no autenticado, continuando en modo limitado');
                // No lanzar error, continuar con inicialización básica
            }
            
            // Inicializar managers
            await this.inicializarManagers();
            
            // Configurar interfaz
            await this.configurarInterfaz();
            
            // Configurar eventos globales
            this.configurarEventosGlobales();
            
            // Cargar estado inicial (solo si está autenticado)
            if (autenticado) {
                await this.cargarEstadoInicial();
            }
            
            this.inicializado = true;
            console.log('✅ Sistema de Carga Masiva inicializado correctamente');
            
            return true;
            
        } catch (error) {
            console.error('❌ Error al inicializar Sistema de Carga Masiva:', error);
            // No mostrar error crítico, solo log
            if (window.DebugConfig) {
                console.log('🔧 Error manejado por DebugConfig');
            }
            return false;
        }
    }

    /**
     * Verificar autenticación y permisos
     */
    async verificarAutenticacion() {
        try {
            // Esperar a que el sistema AUTH esté disponible
            let intentos = 0;
            const maxIntentos = 10;
            
            while ((!window.AUTH || !window.gestionSesiones) && intentos < maxIntentos) {
                console.log(`🔄 Esperando sistemas de autenticación... (${intentos + 1}/${maxIntentos})`);
                await new Promise(resolve => setTimeout(resolve, 100));
                intentos++;
            }
            
            if (!window.AUTH || !window.gestionSesiones) {
                throw new Error('Sistemas de autenticación no disponibles');
            }
            
            // Obtener datos del usuario desde el sistema global
            const userData = window.gestionSesiones.obtenerDatosUsuario();
            console.log('🔍 Datos obtenidos de gestionSesiones:', userData);
            
            // También verificar con AUTH directamente
            const authUser = window.AUTH.obtenerUsuario();
            console.log('🔍 Datos obtenidos de AUTH:', authUser);
            
            const finalUserData = userData || authUser;
            
            // Verificar que tenemos datos de usuario válidos
            // userData de gestionSesiones tiene: nombre, rol, roles, email
            // authUser de AUTH tiene: id, nombres, apellidos, correo, roles
            if (!finalUserData || (!finalUserData.id && !finalUserData.nombre && !finalUserData.nombres)) {
                throw new Error('Usuario no autenticado');
            }
            
            // Verificar si el usuario tiene roles válidos
            const userRoles = finalUserData.roles || [];
            const tienePermisos = userRoles.some(rol => {
                // Manejar tanto strings como objetos de rol
                const rolString = typeof rol === 'object' ? (rol.rol || rol.nombre || rol) : rol;
                return this.rolesPermitidos.includes(rolString.toLowerCase());
            });
            
            if (!tienePermisos) {
                const rolesUsuario = userRoles.map(rol => {
                    return typeof rol === 'object' ? (rol.rol || rol.nombre || rol) : rol;
                }).join(', ');
                throw new Error(`Los roles del usuario (${rolesUsuario}) no tienen permisos para acceder a esta funcionalidad`);
            }
            
            this.autenticado = true;
            // Mostrar información del usuario según la estructura de datos disponible
            const nombreCompleto = finalUserData.nombres ? 
                `${finalUserData.nombres} ${finalUserData.apellidos || ''}` : 
                finalUserData.nombre || 'Usuario';
            console.log('✅ Usuario autenticado:', nombreCompleto);
            return true;
            
        } catch (error) {
            console.error('Error de autenticación:', error);
            // No redirigir automáticamente, ya que el sistema global maneja esto
            return false;
        }
    }

    /**
     * Inicializar todos los managers
     */
    async inicializarManagers() {
        try {
            // Inicializar Logs Manager (primero para tener logging)
            this.logsManager = new LogsManager();
            this.logsManager.inicializar(this.debug);
            
            // Inicializar Validaciones Manager
            if (typeof ValidacionesCargaMasiva !== 'undefined') {
                this.validacionesManager = new ValidacionesCargaMasiva();
                this.validacionesManager.inicializar();
            }
            
            // Inicializar API Service
            if (typeof ApiServiceCargaMasiva !== 'undefined') {
                this.apiService = new ApiServiceCargaMasiva();
                await this.apiService.inicializar();
            }
            
            // Inicializar Estado Manager
            this.estadoManager = new EstadoManager();
            await this.estadoManager.inicializar();
            
            // Inicializar Ciclos Manager
            this.ciclosManager = new CiclosManager();
            await this.ciclosManager.inicializar();
            
            // Inicializar Interfaz Manager
            this.interfazManager = new InterfazManager();
            this.interfazManager.inicializar();
            
            // Inicializar Archivos Manager
            this.archivosManager = new ArchivosManager();
            this.archivosManager.inicializar(this.validacionesManager, this.logsManager);
            
            // Inicializar VerificacionDatos solo si no existe y es necesario
            await this.inicializarVerificacionDatos();
            
            this.logsManager.mostrarExito('Todos los managers inicializados correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando managers:', error);
            this.logsManager.mostrarError('Error al inicializar managers del sistema');
            throw error;
        }
    }

    /**
     * Inicializar VerificacionDatos de manera inteligente
     */
    async inicializarVerificacionDatos() {
        try {
            // Verificar si ya existe una instancia global
            if (window.verificacionDatos && window.verificacionDatos.inicializado) {
                console.log('✅ Usando instancia existente de VerificacionDatos');
                this.verificacionDatos = window.verificacionDatos;
                return;
            }
            
            // Solo crear si el constructor está disponible y el usuario está autenticado
            if (typeof VerificacionDatos === 'undefined') {
                console.warn('⚠️ VerificacionDatos no está disponible, omitiendo...');
                return;
            }
            
            if (!this.autenticado) {
                console.warn('⚠️ Usuario no autenticado, omitiendo VerificacionDatos...');
                return;
            }
            
            console.log('🔄 Creando nueva instancia de VerificacionDatos...');
            this.verificacionDatos = new VerificacionDatos();
            
            // Intentar inicializarla
            const inicializada = await this.verificacionDatos.inicializar();
            if (inicializada) {
                // Guardar en scope global para evitar duplicaciones
                window.verificacionDatos = this.verificacionDatos;
                console.log('✅ VerificacionDatos inicializada y guardada globalmente');
            } else {
                console.warn('⚠️ VerificacionDatos no pudo inicializarse, continuando sin ella');
                this.verificacionDatos = null;
            }
            
        } catch (error) {
            console.warn('⚠️ Error al inicializar VerificacionDatos:', error.message);
            this.verificacionDatos = null;
        }
    }

    /**
     * Configurar interfaz inicial
     */
    async configurarInterfaz() {
        // Configurar interfaz inicial
        this.interfazManager.configurarInterfazInicial();
        
        // Configurar eventos de interfaz
        this.configurarEventosInterfaz();
        
        // Actualizar estado de conexión
        const conectado = await this.estadoManager.verificarConectividad();
        this.interfazManager.actualizarEstadoConexion(conectado);
    }

    /**
     * Configurar eventos de interfaz
     */
    configurarEventosInterfaz() {
        // Eventos de cambio de pestaña
        this.interfazManager.onTabChange((targetId, proceso) => {
            this.manejarCambioTab(targetId, proceso);
        });
        
        // Eventos de archivos
        this.archivosManager.onFileLoad((tipo, file, contenido) => {
            this.manejarCargaArchivo(tipo, file, contenido);
        });
        
        // Eventos de estado
        this.estadoManager.onEstadoChange((nuevoEstado) => {
            this.manejarCambioEstado(nuevoEstado);
        });
        
        // Eventos de ciclos
        this.ciclosManager.onCicloChange((cicloId) => {
            this.manejarCambioCiclo(cicloId);
        });
    }

    /**
     * Configurar eventos globales
     */
    configurarEventosGlobales() {
        // Evento de cierre de ventana
        window.addEventListener('beforeunload', (e) => {
            if (this.hayProcesosEnCurso()) {
                e.preventDefault();
                e.returnValue = '¿Estás seguro de que quieres salir? Hay procesos en curso.';
            }
        });
        
        // Evento de error global
        window.addEventListener('error', (e) => {
            this.logsManager?.mostrarError(`Error global: ${e.message}`);
        });
        
        // Evento de promesa rechazada
        window.addEventListener('unhandledrejection', (e) => {
            this.logsManager?.mostrarError(`Promesa rechazada: ${e.reason}`);
        });
    }

    /**
     * Cargar estado inicial del sistema
     */
    async cargarEstadoInicial() {
        try {
            // Cargar ciclos académicos
            await this.ciclosManager.cargarCiclosAcademicos();
            
            // Cargar estado del sistema
            await this.estadoManager.cargarEstadoSistema();
            
            // Sincronizar con sistema global de ciclos
            await this.ciclosManager.integrarSistemaCiclosGlobal();
            
            this.logsManager.mostrarExito('Estado inicial cargado correctamente');
            
        } catch (error) {
            this.logsManager?.mostrarError('Error al cargar estado inicial: ' + error.message);
        }
    }

    /**
     * Manejar cambio de pestaña
     */
    manejarCambioTab(targetId, proceso) {
        this.logsManager?.mostrarInfo(`Cambiando a pestaña: ${proceso}`);
        
        // Actualizar estado del proceso actual
        this.estadoManager.actualizarProcesoActual(proceso);
        
        // Lógica específica según la pestaña
        switch (proceso) {
            case 'verificacion':
                this.activarModoVerificacion();
                break;
            case 'inicializacion':
                this.activarModoInicializacion();
                break;
            default:
                this.activarModoCarga();
        }
    }

    /**
     * Manejar carga de archivo
     */
    manejarCargaArchivo(tipo, file, contenido) {
        this.logsManager?.mostrarInfo(`Archivo ${tipo} cargado: ${file.name}`);
        
        // Actualizar estado
        this.estadoManager.marcarArchivoCargado(tipo, { cargado: true });
        
        // Verificar si todos los archivos requeridos están cargados
        const verificacion = this.archivosManager.verificarArchivosRequeridos();
        if (verificacion.completo) {
            this.logsManager?.mostrarExito('Todos los archivos requeridos han sido cargados');
            this.habilitarSiguienteFase();
        }
    }

    /**
     * Manejar cambio de estado
     */
    manejarCambioEstado(nuevoEstado) {
        // Actualizar interfaz según el nuevo estado
        this.actualizarInterfazSegunEstado(nuevoEstado);
    }

    /**
     * Manejar cambio de ciclo
     */
    manejarCambioCiclo(cicloId) {
        this.logsManager?.mostrarInfo(`Ciclo cambiado a: ${cicloId}`);
        
        // Cargar datos específicos del ciclo
        this.estadoManager.cargarDatosPorCiclo(cicloId);
    }

    /**
     * Activar modo de carga
     */
    activarModoCarga() {
        this.interfazManager.habilitarCargaArchivos();
        this.logsManager?.mostrarInfo('Modo de carga activado');
    }

    /**
     * Activar modo de verificación
     */
    activarModoVerificacion() {
        if (this.verificacionDatos && typeof this.verificacionDatos.activar === 'function') {
            this.verificacionDatos.activar();
        }
        this.logsManager?.mostrarInfo('Modo de verificación activado');
    }

    /**
     * Activar modo de inicialización
     */
    activarModoInicializacion() {
        this.interfazManager.mostrarFaseInicializacion();
        this.logsManager?.mostrarInfo('Modo de inicialización activado');
    }

    /**
     * Habilitar siguiente fase
     */
    habilitarSiguienteFase() {
        const procesoActual = this.estadoManager.obtenerEstado().procesoActual;
        
        switch (procesoActual) {
            case 'carga':
                // Habilitar verificación
                const tabVerificacion = document.getElementById('verificacion-tab');
                this.interfazManager.habilitarTab(tabVerificacion);
                break;
            case 'verificacion':
                // Habilitar inicialización
                const tabInicializacion = document.getElementById('init-tab');
                this.interfazManager.habilitarTab(tabInicializacion);
                break;
        }
    }

    /**
     * Actualizar interfaz según estado
     */
    actualizarInterfazSegunEstado(estado) {
        // Actualizar progreso
        const progreso = this.estadoManager.obtenerProgreso();
        this.interfazManager.mostrarProgreso(progreso.porcentaje, progreso.mensaje);
        
        // Actualizar contadores
        this.archivosManager.actualizarContadorArchivos();
    }

    /**
     * Verificar si hay procesos en curso
     */
    hayProcesosEnCurso() {
        const estado = this.estadoManager.obtenerEstado();
        return estado.procesoEnCurso || false;
    }

    /**
     * Procesar carga masiva
     */
    async procesarCargaMasiva() {
        try {
            this.logsManager?.mostrarInfo('Iniciando procesamiento de carga masiva...');
            
            // Verificar archivos requeridos
            const verificacion = this.archivosManager.verificarArchivosRequeridos();
            if (!verificacion.completo) {
                throw new Error('Faltan archivos requeridos: ' + verificacion.faltantes.map(f => f.tipo).join(', '));
            }
            
            // Procesar archivos con API Service
            if (this.apiService) {
                const resultado = await this.apiService.procesarCargaMasiva(
                    this.archivosManager.obtenerConfiguracion(),
                    this.ciclosManager.obtenerCicloSeleccionado()
                );
                
                if (resultado.exito) {
                    this.logsManager?.mostrarExito('Carga masiva procesada correctamente');
                    this.interfazManager.activarPestana('#verificacion-datos');
                } else {
                    throw new Error(resultado.mensaje || 'Error en el procesamiento');
                }
            }
            
        } catch (error) {
            this.logsManager?.mostrarError('Error en carga masiva: ' + error.message);
        }
    }

    /**
     * Reiniciar sistema completo
     */
    async reiniciarSistema() {
        try {
            this.logsManager?.mostrarInfo('Reiniciando sistema...');
            
            // Limpiar archivos
            this.archivosManager.limpiarArchivos();
            
            // Reiniciar estado
            this.estadoManager.reiniciarSistemaCompleto();
            
            // Limpiar logs
            this.logsManager?.limpiarTodosLosLogs();
            
            // Volver a la primera pestaña
            this.interfazManager.activarPestana('#carga-datos');
            
            this.logsManager?.mostrarExito('Sistema reiniciado correctamente');
            
        } catch (error) {
            this.logsManager?.mostrarError('Error al reiniciar sistema: ' + error.message);
        }
    }

    /**
     * Mostrar error (método de compatibilidad)
     */
    mostrarError(mensaje) {
        if (this.logsManager) {
            this.logsManager.mostrarError(mensaje);
        } else {
            console.error(mensaje);
            alert('Error: ' + mensaje);
        }
    }

    /**
     * Mostrar éxito (método de compatibilidad)
     */
    mostrarExito(mensaje) {
        if (this.logsManager) {
            this.logsManager.mostrarExito(mensaje);
        } else {
            console.log(mensaje);
        }
    }

    /**
     * Mostrar advertencia (método de compatibilidad)
     */
    mostrarAdvertencia(mensaje) {
        if (this.logsManager) {
            this.logsManager.mostrarAdvertencia(mensaje);
        } else {
            console.warn(mensaje);
        }
    }

    /**
     * Log general (método de compatibilidad)
     */
    log(mensaje, tipo = 'info') {
        if (this.logsManager) {
            this.logsManager.agregarLog(mensaje, tipo);
        } else {
            console.log(mensaje);
        }
    }

    /**
     * Obtener fase actual (método de compatibilidad)
     */
    obtenerFaseActual() {
        if (this.interfazManager) {
            return this.interfazManager.obtenerFaseActual();
        }
        return 'uploadLogSingle';
    }

    /**
     * Formatear tamaño de archivo (método de compatibilidad)
     */
    formatearTamano(bytes) {
        if (this.archivosManager) {
            return this.archivosManager.formatearTamano(bytes);
        }
        return bytes + ' bytes';
    }

    /**
     * Descargar plantilla Excel (método de compatibilidad)
     */
    async descargarPlantillaExcel(tipo) {
        if (this.archivosManager) {
            await this.archivosManager.descargarPlantilla(tipo);
        }
    }

    /**
     * Obtener información del sistema
     */
    obtenerInfoSistema() {
        return {
            version: this.version,
            inicializado: this.inicializado,
            autenticado: this.autenticado,
            debug: this.debug,
            managers: {
                ciclos: !!this.ciclosManager,
                estado: !!this.estadoManager,
                interfaz: !!this.interfazManager,
                logs: !!this.logsManager,
                archivos: !!this.archivosManager,
                validaciones: !!this.validacionesManager,
                verificacion: !!this.verificacionDatos,
                api: !!this.apiService
            }
        };
    }
}

// Variables globales para compatibilidad
let cargaMasiva;
let ciclosManager;
let estadoManager;
let interfazManager;
let logsManager;
let archivosManager;
let validacionesManager;
let verificacionDatos;
let apiService;

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('🔄 Inicializando Sistema de Carga Masiva...');
        
        // Crear instancia principal
        cargaMasiva = new CargaMasiva();
        
        // Restaurar sesión ANTES de inicializar cualquier manager
        if (window.AUTH && typeof window.AUTH.inicializarDesdeSesion === 'function') {
            window.AUTH.inicializarDesdeSesion();
        }

        // Inicializar sistema
        const inicializado = await cargaMasiva.inicializar();
        
        if (inicializado) {
            // Asignar referencias globales para compatibilidad
            ciclosManager = cargaMasiva.ciclosManager;
            estadoManager = cargaMasiva.estadoManager;
            interfazManager = cargaMasiva.interfazManager;
            logsManager = cargaMasiva.logsManager;
            archivosManager = cargaMasiva.archivosManager;
            validacionesManager = cargaMasiva.validacionesManager;
            verificacionDatos = cargaMasiva.verificacionDatos || window.verificacionDatos;
            apiService = cargaMasiva.apiService;
            
            console.log('✅ Sistema de Carga Masiva listo para usar');
        } else {
            console.error('❌ Error al inicializar el sistema');
        }
        
    } catch (error) {
        console.error('❌ Error crítico al inicializar:', error);
        alert('Error crítico al inicializar el sistema: ' + error.message);
    }
});

// Exportar para uso global
window.CargaMasiva = CargaMasiva;

