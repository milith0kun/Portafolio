/**
 * CICLOS - COORDINADOR PRINCIPAL
 * Inicialización y coordinación de todos los módulos
 */

import { CiclosCore } from './core.js';
import { CiclosData } from './data.js';
import { CiclosUI } from './ui.js';
import { CiclosEventos } from './eventos.js';

class CiclosManager {
    constructor() {
        this.debug = window.ciclosDebug || false;
        this.inicializado = false;
        this.modulos = {};
        
        // CiclosManager creado
    }

    /**
     * Inicializar sistema completo de ciclos
     */
    async inicializar() {
        if (this.inicializado) {
            // Sistema ya inicializado
            return;
        }

        try {
            // Iniciando inicialización del sistema de ciclos
            
            // Fase 1: Crear módulos
            await this.crearModulos();
            
            // Fase 2: Verificar dependencias
            await this.verificarDependencias();
            
            // Fase 3: Configurar componentes
            await this.configurarComponentes();
            
            // Fase 4: Cargar datos iniciales
            await this.cargarDatosIniciales();
            
            // Fase 5: Configurar eventos
            this.configurarEventos();
            
            // Fase 6: Configurar verificación periódica
            this.configurarVerificacionPeriodica();
            
            this.inicializado = true;
            // Sistema de ciclos inicializado exitosamente
            
            // Emitir evento de inicialización completa
            this.emitirEventoInicializacion();
            
        } catch (error) {
            // Error crítico al inicializar sistema de ciclos
            this.manejarErrorInicializacion(error);
        }
    }

    /**
     * Crear instancias de todos los módulos
     */
    async crearModulos() {
        // Creando módulos
        
        // Orden de creación importante para dependencias
        this.modulos.core = new CiclosCore();
        this.modulos.data = new CiclosData(this.modulos.core);
        this.modulos.ui = new CiclosUI(this.modulos.core, this.modulos.data);
        this.modulos.eventos = new CiclosEventos(this.modulos.core, this.modulos.data, this.modulos.ui);
        
        // Módulos creados
    }

    /**
     * Verificar dependencias necesarias
     */
    async verificarDependencias() {
        // Verificando dependencias
        
        const dependencias = {
            jquery: typeof $ !== 'undefined',
            datatables: typeof $.fn.DataTable !== 'undefined',
            bootstrap: typeof $.fn.modal !== 'undefined',
            moment: typeof moment !== 'undefined',
            toastr: typeof toastr !== 'undefined',
            swal: typeof Swal !== 'undefined',
            config: typeof CONFIG !== 'undefined' && CONFIG.API?.BASE_URL
        };

        const faltantes = Object.entries(dependencias)
            .filter(([_, disponible]) => !disponible)
            .map(([nombre]) => nombre);

        if (faltantes.length > 0) {
            // Dependencias faltantes
            
            // Solo toastr y swal son opcionales
            const criticas = faltantes.filter(dep => !['toastr', 'swal'].includes(dep));
            if (criticas.length > 0) {
                throw new Error(`Dependencias críticas faltantes: ${criticas.join(', ')}`);
            }
        }

        // Verificación de dependencias completada
    }

    /**
     * Configurar componentes de UI
     */
    async configurarComponentes() {
        // Configurando componentes
        
        // Configurar toastr
        this.modulos.core.configurarToastr();
        
        // Inicializar DataTable
        const dataTableInicializada = this.modulos.ui.inicializarDataTable();
        if (!dataTableInicializada) {
            throw new Error('No se pudo inicializar la tabla de ciclos');
        }
        
        // Configurar modal
        this.modulos.ui.configurarModalCiclo();
        
        // Componentes configurados
    }

    /**
     * Cargar datos iniciales
     */
    async cargarDatosIniciales() {
        // Cargando datos iniciales
        
        const datosIniciales = await this.modulos.data.obtenerDatosIniciales();
        
        if (datosIniciales.errores.length > 0) {
            // Algunos datos no se pudieron cargar
        }
        
        // Actualizar UI con datos cargados
        if (datosIniciales.ciclos.length > 0) {
            this.modulos.ui.tablaCiclos.clear();
            this.modulos.ui.tablaCiclos.rows.add(datosIniciales.ciclos);
            this.modulos.ui.tablaCiclos.draw();
            
            this.modulos.ui.actualizarEstadisticas(datosIniciales.ciclos);
        }
        
        // Actualizar interfaz de ciclo activo
        this.modulos.ui.actualizarInterfazCicloActivo();
        
        // Datos iniciales cargados
    }

    /**
     * Configurar eventos
     */
    configurarEventos() {
        // Configurando eventos
        this.modulos.eventos.configurarEventos();
        
        // Configurar eventos de sincronización
        this.configurarEventosSincronizacion();
        
        // Eventos configurados
    }

    /**
     * Configurar eventos de sincronización de ciclos
     */
    configurarEventosSincronizacion() {
        // Escuchar evento de cambio de ciclo activo
        document.addEventListener('cicloActivoCambiado', async (event) => {
            // Evento cicloActivoCambiado recibido
            
            try {
                // Actualizar datos del ciclo activo en el core
                if (this.modulos.core) {
                    this.modulos.core.cicloActivo = event.detail.cicloActivo;
                }
                
                // Recargar datos de ciclos
                await this.recargarDatos();
                
                // Actualizar interfaz
                this.modulos.ui.actualizarInterfazCicloActivo();
                
                // Sincronización de ciclo activo completada
            } catch (error) {
                // Error al sincronizar ciclo activo
            }
        });
        
        // Eventos de sincronización configurados
    }

    /**
     * Recargar datos de ciclos
     */
    async recargarDatos() {
        try {
            // Recargando datos de ciclos
            
            const datosActualizados = await this.modulos.data.obtenerDatosIniciales();
            
            if (datosActualizados.ciclos.length > 0) {
                this.modulos.ui.tablaCiclos.clear();
                this.modulos.ui.tablaCiclos.rows.add(datosActualizados.ciclos);
                this.modulos.ui.tablaCiclos.draw();
                
                this.modulos.ui.actualizarEstadisticas(datosActualizados.ciclos);
            }
            
            // Datos de ciclos recargados
        } catch (error) {
            // Error al recargar datos de ciclos
            throw error;
        }
    }

    /**
     * Configurar verificación periódica del ciclo activo
     */
    configurarVerificacionPeriodica() {
        // Verificar ciclo activo cada 5 minutos
        setInterval(async () => {
            try {
                await this.modulos.data.verificarCicloActivoSilencioso();
            } catch (error) {
                // Error en verificación periódica
            }
        }, 5 * 60 * 1000);
        
        // Verificación periódica configurada
    }

    /**
     * Emitir evento de inicialización completa
     */
    emitirEventoInicializacion() {
        const evento = new CustomEvent('ciclosSistemaInicializado', {
            detail: {
                timestamp: Date.now(),
                modulos: Object.keys(this.modulos),
                cicloActivo: this.modulos.core.cicloActivo
            }
        });
        
        document.dispatchEvent(evento);
        // Evento de inicialización emitido
    }

    /**
     * Manejar error de inicialización
     */
    manejarErrorInicializacion(error) {
        // Mostrar error en interfaz si es posible
        if (typeof toastr !== 'undefined') {
            toastr.error('Error al inicializar el sistema de ciclos académicos');
        }
        
        // Mostrar mensaje de error en la página
        const container = document.getElementById('ciclosContainer');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading">Error de Inicialización</h4>
                    <p>No se pudo inicializar correctamente el sistema de ciclos académicos.</p>
                    <hr>
                    <p class="mb-0">
                        <strong>Error:</strong> ${error.message}<br>
                        <small>Recargue la página o contacte al administrador del sistema.</small>
                    </p>
                </div>
            `;
        }
        
        // Error de inicialización manejado
    }

    /**
     * Reinicializar sistema (para desarrollo)
     */
    async reinicializar() {
        // Reinicializando sistema
        
        // Destruir módulos existentes
        this.destruir();
        
        // Reinicializar
        await this.inicializar();
        
        // Sistema reinicializado
    }

    /**
     * Destruir sistema y limpiar recursos
     */
    destruir() {
        // Destruyendo sistema
        
        try {
            // Destruir módulos en orden inverso
            if (this.modulos.eventos) {
                this.modulos.eventos.destruir();
            }
            
            if (this.modulos.ui) {
                this.modulos.ui.destruir();
            }
            
            // Limpiar referencias
            this.modulos = {};
            this.inicializado = false;
            
            // Sistema destruido
        } catch (error) {
            // Error al destruir sistema
        }
    }

    /**
     * Obtener información de estado del sistema
     */
    obtenerEstado() {
        return {
            inicializado: this.inicializado,
            modulos: Object.keys(this.modulos),
            cicloActivo: this.modulos.core?.cicloActivo,
            estadosModulos: this.modulos.core?.estadosModulos,
            saludModulos: {
                core: this.modulos.core?.verificarSalud(),
                ui: this.modulos.ui?.verificarEstado()
            }
        };
    }

    /**
     * Logging para desarrollo
     */
    log(...args) {
        if (this.debug) {
            // [CiclosManager]
        }
    }
}

// Crear instancia global
const ciclosManager = new CiclosManager();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticación antes de inicializar
    if (typeof verificarAutenticacion === 'function') {
        if (!verificarAutenticacion(['administrador'])) {
            // Usuario no autorizado para acceder a ciclos académicos
            return;
        }
    }
    
    // Inicializar sistema
    await ciclosManager.inicializar();
});

// Exponer funciones para debugging en desarrollo
if (typeof window !== 'undefined') {
    window.ciclosDebug = window.ciclosDebug || false;
    
    if (window.ciclosDebug) {
        window.CiclosManager = ciclosManager;
        // Modo debug activado para Ciclos
        // Acceso: window.CiclosManager
    }
}

// Exportar para uso en otros módulos si es necesario
export default ciclosManager;