/**
 * Sistema de Inicialización de Ciclos
 * Asegura que todas las páginas tengan el sistema de ciclos configurado correctamente
 */
class InicializacionCiclos {
    constructor() {
        this.estado = {
            inicializado: false,
            cicloActual: null,
            sistemas: new Map(),
            listeners: new Map(),
            ultimaVerificacion: null,
            sincronizacionReciente: false,
            verificacionesDeshabilitadas: false, // Nuevo: para evitar verificaciones excesivas
            datosCiclo: null, // Nuevo estado para almacenar datos del ciclo
            estadisticas: null, // Nuevo estado para almacenar estadísticas
            estadoSistema: null // Nuevo estado para almacenar estado del sistema
        };
        
        this.configuracion = {
            debug: true,
            intervaloVerificacion: 15000, // 15 segundos (menos frecuente)
            timeoutInicializacion: 10000 // 10 segundos
        };
    }

    /**
     * Inicializar el sistema de ciclos
     */
    async inicializar() {
        if (this.estado.inicializado) {
            console.log('⚠️ Sistema de ciclos ya inicializado');
            return;
        }

        console.log('🔄 Inicializando sistema de ciclos...');

        try {
            // Verificar dependencias
            await this.verificarDependencias();

            // Configurar eventos globales
            this.configurarEventosGlobales();

            // Obtener ciclo actual
            await this.obtenerCicloActual();

            // Esperar un momento para asegurar que el ciclo esté establecido
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Cargar datos adicionales del sistema
            await this.cargarDatosAdicionales();

            // Registrar sistemas disponibles
            this.registrarSistemas();

            // Configurar verificación periódica
            this.configurarVerificacionPeriodica();

            this.estado.inicializado = true;
            console.log('✅ Sistema de ciclos inicializado correctamente');

            // Emitir evento de inicialización
            this.emitirEvento('sistema-ciclos-iniciado', {
                cicloActual: this.estado.cicloActual,
                datosCiclo: this.estado.datosCiclo,
                estadisticas: this.estado.estadisticas,
                estadoSistema: this.estado.estadoSistema,
                sistemas: Array.from(this.estado.sistemas.keys())
            });

        } catch (error) {
            console.error('❌ Error inicializando sistema de ciclos:', error);
            throw error;
        }
    }

    /**
     * Verificar que las dependencias estén disponibles
     */
    async verificarDependencias() {
        const dependencias = [
            'window.AUTH',
            'window.CONFIG',
            'window.CoordinadorEventosCiclos'
        ];

        const faltantes = [];
        
        for (const dep of dependencias) {
            if (!this.evaluarDependencia(dep)) {
                faltantes.push(dep);
            }
        }

        if (faltantes.length > 0) {
            console.warn('⚠️ Dependencias faltantes:', faltantes);
            
            // Intentar esperar por las dependencias
            await this.esperarDependencias(faltantes);
        }

        console.log('✅ Todas las dependencias están disponibles');
    }

    /**
     * Evaluar si una dependencia existe
     */
    evaluarDependencia(dep) {
        try {
            const partes = dep.split('.');
            let obj = window;
            
            for (const parte of partes.slice(1)) {
                obj = obj[parte];
                if (!obj) return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Esperar por dependencias faltantes
     */
    async esperarDependencias(dependencias) {
        const timeout = Date.now() + this.configuracion.timeoutInicializacion;
        
        while (Date.now() < timeout) {
            const restantes = dependencias.filter(dep => !this.evaluarDependencia(dep));
            
            if (restantes.length === 0) {
                console.log('✅ Todas las dependencias cargadas');
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error('Timeout esperando dependencias: ' + dependencias.join(', '));
    }

    /**
     * Configurar eventos globales del sistema
     */
    configurarEventosGlobales() {
        // Escuchar eventos coordinados
        document.addEventListener('cicloCoordinado', (event) => {
            this.procesarCambioCiclo(event.detail);
        });

        // Escuchar eventos de ciclo activo
        document.addEventListener('cicloActivoCambiado', (event) => {
            this.procesarCambioCiclo(event.detail);
        });

        // Escuchar eventos de sincronización
        document.addEventListener('sincronizar-ciclo', (event) => {
            this.forzarSincronizacion();
        });

        // Escuchar visibilidad de la página
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.verificarSincronizacion();
            }
        });

        console.log('✅ Eventos globales configurados');
    }

    /**
     * Obtener el ciclo actual del sistema
     */
    async obtenerCicloActual() {
        try {
            console.log('📅 Iniciando carga del ciclo actual...');
            
            // Intentar obtener desde sistema de sincronización
            if (window.SincronizacionCiclos && typeof window.SincronizacionCiclos.obtenerCicloActual === 'function') {
                const cicloSincronizado = window.SincronizacionCiclos.obtenerCicloActual();
                console.log('📅 Ciclo desde sincronización:', cicloSincronizado);
                if (cicloSincronizado) {
                    this.estado.cicloActual = cicloSincronizado;
                }
            }

            // Si no hay ciclo o solo tenemos ID, obtener datos completos desde backend
            if (!this.estado.cicloActual || typeof this.estado.cicloActual === 'string' || typeof this.estado.cicloActual === 'number') {
                console.log('📅 Obteniendo datos completos desde backend...');
                const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DASHBOARD}/ciclo-actual`, {
                    headers: window.AUTH.construirHeaders()
                });

                console.log('📅 Respuesta ciclo actual:', response.status, response.statusText);

                if (response.ok) {
                    const data = await response.json();
                    console.log('📅 Datos ciclo actual recibidos:', data);
                    
                    if (data.success && data.data) {
                        // Guardar datos completos del ciclo
                        this.estado.cicloActual = data.data.id;
                        this.estado.datosCiclo = data.data;
                        
                        console.log('📅 Ciclo actual cargado:', {
                            id: data.data.id,
                            nombre: data.data.nombre,
                            estado: data.data.estado,
                            progreso: data.data.progreso
                        });
                        
                        // Emitir evento con datos completos
                        this.emitirEvento('ciclo-cargado', {
                            ciclo: data.data,
                            timestamp: new Date()
                        });
                        
                        return;
                    } else {
                        console.warn('⚠️ Datos de ciclo no disponibles:', data);
                    }
                } else {
                    console.warn('⚠️ Error cargando ciclo actual:', response.status, response.statusText);
                }
            }

            // Si no se pudo cargar desde backend, intentar con datos básicos
            if (!this.estado.cicloActual) {
                console.warn('⚠️ No se pudo obtener ciclo desde backend, usando datos básicos');
                this.estado.cicloActual = '1'; // Valor por defecto
            }

            console.log('📅 Ciclo actual final:', this.estado.cicloActual);
        } catch (error) {
            console.warn('⚠️ Error obteniendo ciclo actual:', error);
            // En caso de error, usar valor por defecto
            this.estado.cicloActual = '1';
        }
    }

    /**
     * Cargar datos adicionales del sistema
     */
    async cargarDatosAdicionales() {
        try {
            // Solo mostrar en modo debug
        if (window.CONFIG?.DEBUG) {
            console.log('📊 Cargando datos adicionales del sistema...');
        }
            
            // Asegurar que tenemos un ciclo actual
            if (!this.estado.cicloActual) {
                console.warn('⚠️ No hay ciclo actual, usando ciclo por defecto');
                this.estado.cicloActual = '1';
            }
            
            // Cargar estadísticas del sistema
            // Solo mostrar en modo debug
        if (window.CONFIG?.DEBUG) {
            console.log('📊 Intentando cargar estadísticas...');
        }
            try {
                const responseStats = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DASHBOARD}/estadisticas?ciclo=${this.estado.cicloActual}`, {
                    headers: window.AUTH.construirHeaders()
                });
                
                // Solo mostrar en modo debug
        if (window.CONFIG?.DEBUG) {
            console.log('📊 Respuesta estadísticas:', responseStats.status, responseStats.statusText);
        }
                
                if (responseStats.ok) {
                    const dataStats = await responseStats.json();
                    // Solo mostrar en modo debug
        if (window.CONFIG?.DEBUG) {
            console.log('📊 Datos estadísticas recibidos:', dataStats);
        }
                    
                    if (dataStats.success && dataStats.data) {
                        this.estado.estadisticas = dataStats.data;
                        // Solo mostrar en modo debug
                        if (window.CONFIG?.DEBUG) {
                            console.log('📊 Estadísticas cargadas:', {
                                usuarios: dataStats.data.totalUsuarios,
                                portafolios: dataStats.data.totalPortafolios,
                                documentos: dataStats.data.totalDocumentos
                            });
                        }
                    } else {
                        console.warn('⚠️ Estadísticas no disponibles:', dataStats);
                    }
                } else {
                    console.warn('⚠️ Error cargando estadísticas:', responseStats.status, responseStats.statusText);
                }
            } catch (error) {
                console.warn('⚠️ Error en carga de estadísticas:', error);
            }
            
            // Cargar estado del sistema
            // Solo mostrar en modo debug
            if (window.CONFIG?.DEBUG) {
                console.log('⚙️ Intentando cargar estado del sistema...');
            }
            try {
                const responseEstado = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DASHBOARD}/estado-sistema`, {
                    headers: window.AUTH.construirHeaders()
                });
                
                // Solo mostrar en modo debug
                if (window.CONFIG?.DEBUG) {
                    console.log('⚙️ Respuesta estado:', responseEstado.status, responseEstado.statusText);
                }
                
                if (responseEstado.ok) {
                    const dataEstado = await responseEstado.json();
                    // Solo mostrar en modo debug
                    if (window.CONFIG?.DEBUG) {
                        console.log('⚙️ Datos estado recibidos:', dataEstado);
                    }
                    
                    if (dataEstado.success && dataEstado.data) {
                        this.estado.estadoSistema = dataEstado.data;
                        // Solo mostrar en modo debug
                        if (window.CONFIG?.DEBUG) {
                            console.log('⚙️ Estado del sistema cargado');
                        }
                    } else {
                        console.warn('⚠️ Estado del sistema no disponible:', dataEstado);
                    }
                } else {
                    console.warn('⚠️ Error cargando estado del sistema:', responseEstado.status, responseEstado.statusText);
                }
            } catch (error) {
                console.warn('⚠️ Error en carga de estado del sistema:', error);
            }
            
            console.log('✅ Datos adicionales cargados correctamente');
            
        } catch (error) {
            console.warn('⚠️ Error cargando datos adicionales:', error);
        }
    }

    /**
     * Registrar sistemas disponibles
     */
    registrarSistemas() {
        const sistemas = [
            'window.SincronizacionEstado',
            'window.GeneracionPortafoliosAdmin',
            'window.VerificacionDatos',
            'window.CargaMasiva',
            'window.SincronizacionCiclos'
        ];

        sistemas.forEach(sistema => {
            if (this.evaluarDependencia(sistema)) {
                const nombre = sistema.split('.')[1];
                this.estado.sistemas.set(nombre, sistema);
                // Solo mostrar en modo debug
                if (window.CONFIG?.DEBUG) {
                    console.log(`✅ Sistema registrado: ${nombre}`);
                }
            }
        });

        // Solo mostrar en modo debug
        if (window.CONFIG?.DEBUG) {
            console.log(`📋 ${this.estado.sistemas.size} sistemas registrados`);
        }
    }

    /**
     * Procesar cambio de ciclo
     */
    procesarCambioCiclo(detalle) {
        const nuevoCiclo = detalle.cicloId || detalle.id;
        
        if (nuevoCiclo && nuevoCiclo !== this.estado.cicloActual) {
            // Solo mostrar en modo debug
        if (window.CONFIG?.DEBUG) {
            console.log('🔄 Procesando cambio de ciclo:', nuevoCiclo);
        }
            
            this.estado.cicloActual = nuevoCiclo;
            
            // Notificar a todos los sistemas
            this.notificarSistemas('ciclo-cambiado', {
                cicloId: nuevoCiclo,
                cicloAnterior: this.estado.cicloActual,
                timestamp: new Date()
            });

            // Forzar sincronización
            this.forzarSincronizacion();
        }
    }

    /**
     * Notificar a todos los sistemas registrados
     */
    notificarSistemas(tipo, datos) {
        this.estado.sistemas.forEach((path, nombre) => {
            try {
                const sistema = this.evaluarDependencia(path) ? eval(path) : null;
                
                if (sistema && typeof sistema.onCicloCambiado === 'function') {
                    sistema.onCicloCambiado(datos);
                }
            } catch (error) {
                console.warn(`⚠️ Error notificando sistema ${nombre}:`, error);
            }
        });
    }

    /**
     * Forzar sincronización del sistema
     */
    forzarSincronizacion() {
        // Evitar sincronizaciones excesivas
        if (this.estado.sincronizacionReciente) {
            // Solo mostrar en modo debug
            if (window.CONFIG?.DEBUG) {
                console.log('⚠️ Sincronización reciente, omitiendo...');
            }
            return;
        }

        // Solo mostrar en modo debug
        if (window.CONFIG?.DEBUG) {
            console.log('🔄 Forzando sincronización del sistema...');
        }
        
        // Marcar como sincronización reciente
        this.estado.sincronizacionReciente = true;
        
        // Emitir evento de sincronización forzada
        this.emitirEvento('forzar-sincronizacion-ciclo', {
            cicloActual: this.estado.cicloActual,
            timestamp: new Date()
        });

        // Notificar sistemas
        this.notificarSistemas('forzar-sincronizacion', {
            cicloActual: this.estado.cicloActual
        });

        // Resetear después de 30 segundos
        setTimeout(() => {
            this.estado.sincronizacionReciente = false;
        }, 30000);
    }

    /**
     * Verificar sincronización periódica
     */
    configurarVerificacionPeriodica() {
        setInterval(() => {
            this.verificarSincronizacion();
        }, this.configuracion.intervaloVerificacion);
    }

    /**
     * Verificar que la sincronización esté funcionando
     */
    verificarSincronizacion() {
        if (!this.estado.inicializado || this.estado.verificacionesDeshabilitadas) return;

        // Evitar verificaciones demasiado frecuentes
        const ahora = Date.now();
        if (this.estado.ultimaVerificacion && (ahora - this.estado.ultimaVerificacion) < 10000) {
            return; // Esperar al menos 10 segundos entre verificaciones
        }
        this.estado.ultimaVerificacion = ahora;

        // Solo verificar si hay un sistema de sincronización disponible
        if (!window.SincronizacionCiclos || typeof window.SincronizacionCiclos.obtenerCicloActual !== 'function') {
            return; // No hay sistema de sincronización disponible
        }

        const cicloSincronizado = window.SincronizacionCiclos.obtenerCicloActual();
        
        // Solo verificar si hay un ciclo sincronizado válido y es diferente
                    if (cicloSincronizado && cicloSincronizado !== this.estado.cicloActual) {
                // Solo mostrar en modo debug para evitar spam
                if (window.CONFIG?.DEBUG) {
                    console.log('⚠️ Desincronización detectada, corrigiendo...');
                }
            this.estado.cicloActual = cicloSincronizado;
            
            // Solo forzar sincronización si no se ha hecho recientemente
            if (!this.estado.sincronizacionReciente) {
                this.estado.sincronizacionReciente = true;
                this.forzarSincronizacion();
                
                // Deshabilitar verificaciones por 2 minutos si hay demasiadas
                this.estado.verificacionesDeshabilitadas = true;
                setTimeout(() => {
                    this.estado.verificacionesDeshabilitadas = false;
                }, 120000); // 2 minutos
                
                // Resetear después de 30 segundos para evitar bucles
                setTimeout(() => {
                    this.estado.sincronizacionReciente = false;
                }, 30000);
            }
        }
    }

    /**
     * Emitir evento personalizado
     */
    emitirEvento(tipo, datos) {
        const evento = new CustomEvent(tipo, {
            detail: datos,
            bubbles: true
        });
        
        document.dispatchEvent(evento);
    }

    /**
     * Obtener estado actual del sistema
     */
    obtenerEstado() {
        return {
            inicializado: this.estado.inicializado,
            cicloActual: this.estado.cicloActual,
            datosCiclo: this.estado.datosCiclo,
            estadisticas: this.estado.estadisticas,
            estadoSistema: this.estado.estadoSistema,
            sistemas: Array.from(this.estado.sistemas.keys()),
            listeners: this.estado.listeners.size,
            ultimaVerificacion: this.estado.ultimaVerificacion,
            sincronizacionReciente: this.estado.sincronizacionReciente,
            verificacionesDeshabilitadas: this.estado.verificacionesDeshabilitadas
        };
    }

    /**
     * Destruir el sistema
     */
    destruir() {
        this.estado.inicializado = false;
        this.estado.sistemas.clear();
        this.estado.listeners.clear();
        
        console.log('🧹 Sistema de ciclos destruido');
    }
}

// Crear instancia global
const inicializacionCiclos = new InicializacionCiclos();

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        inicializacionCiclos.inicializar().catch(error => {
            console.error('❌ Error en inicialización automática:', error);
        });
    });
} else {
    // DOM ya está listo
    inicializacionCiclos.inicializar().catch(error => {
        console.error('❌ Error en inicialización automática:', error);
    });
}

// Exportar al scope global
window.InicializacionCiclos = inicializacionCiclos;

console.log('✅ Sistema de Inicialización de Ciclos cargado'); 