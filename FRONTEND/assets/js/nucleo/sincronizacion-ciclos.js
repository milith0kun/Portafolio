/**
 * Sistema de Sincronización de Ciclos Académicos
 * Maneja la sincronización global del ciclo seleccionado en todas las páginas
 */

const SincronizacionCiclos = {
    // Estado global del ciclo
    estado: {
        cicloSeleccionado: null,
        informacionCiclo: null,
        ultimaActualizacion: null,
        suscriptores: new Set(),
        servidorOffline: false,
        estableciendoCiclo: false
    },

    // Configuración
    config: {
        intervaloActualizacion: 30000, // 30 segundos
        tiempoCache: 5 * 60 * 1000, // 5 minutos
        endpoints: {
            ciclos: '/ciclos',
            cicloActivo: '/ciclos/activo',
            estadisticas: '/dashboard/estadisticas'
        }
    },

    /**
     * Inicializar el sistema de sincronización
     */
    inicializar() {
        // Solo mostrar en modo debug para evitar spam
        if (window.CONFIG?.DEBUG) {
            console.log('🔄 Inicializando sistema de sincronización de ciclos...');
        }
        
        // Cargar ciclo inicial
        this.cargarCicloInicial();
        
        // Configurar eventos globales
        this.configurarEventosGlobales();
        
        // Configurar actualización automática
        this.configurarActualizacionAutomatica();
        
        // Emitir evento de inicialización
        this.emitirEvento('sincronizacion-inicializada', {
            ciclo: this.estado.cicloSeleccionado,
            timestamp: new Date()
        });
        
        console.log('✅ Sistema de sincronización de ciclos inicializado');
    },

    /**
     * Cargar el ciclo inicial desde múltiples fuentes
     */
    async cargarCicloInicial() {
        try {
            // 1. Intentar obtener desde localStorage/sessionStorage
            let cicloId = localStorage.getItem('cicloSeleccionado') || 
                         sessionStorage.getItem('cicloSeleccionado');
            
            // 2. Si no hay ciclo guardado, intentar obtener el activo del servidor
            if (!cicloId) {
                console.log('🔄 No hay ciclo guardado, obteniendo ciclo activo...');
                try {
                    const cicloActivo = await this.obtenerCicloActivo();
                    if (cicloActivo) {
                        cicloId = cicloActivo.id.toString();
                        console.log(`✅ Ciclo activo encontrado: ${cicloActivo.nombre}`);
                    }
                } catch (error) {
                    console.warn('⚠️ No se pudo obtener ciclo activo del servidor:', error.message);
                }
            }
            
            // 3. Si aún no hay ciclo, usar valor por defecto
            if (!cicloId) {
                cicloId = '1'; // Ciclo por defecto
                console.log('🔄 Usando ciclo por defecto: 1');
            }
            
            // 4. Establecer el ciclo
            await this.establecerCiclo(cicloId);
            
        } catch (error) {
            console.error('❌ Error cargando ciclo inicial:', error);
            // Usar ciclo por defecto en caso de error
            await this.establecerCiclo('1');
        }
    },

    /**
     * Obtener ciclo activo del servidor
     */
    async obtenerCicloActivo() {
        try {
            const response = await window.apiRequest(this.config.endpoints.cicloActivo, 'GET');
            return response.data;
        } catch (error) {
            // Solo mostrar warning si no es un error de conexión
            if (!error.message?.includes('Failed to fetch')) {
                console.warn('⚠️ Error obteniendo ciclo activo:', error.message);
            }
            return null;
        }
    },

    /**
     * Establecer ciclo seleccionado con debounce para evitar conflictos
     */
    async establecerCiclo(cicloId) {
        // Evitar cambios duplicados o muy rápidos
        if (this.estado.estableciendoCiclo || cicloId === this.estado.cicloSeleccionado) {
            return;
        }
        
        // Cancelar cualquier cambio pendiente
        if (this.timeoutEstablecerCiclo) {
            clearTimeout(this.timeoutEstablecerCiclo);
        }
        
        // Marcar como en proceso
        this.estado.estableciendoCiclo = true;
        
        console.log(`🔄 Estableciendo ciclo: ${cicloId}`);
        
        try {
            // Guardar en almacenamiento
            localStorage.setItem('cicloSeleccionado', cicloId);
            sessionStorage.setItem('cicloSeleccionado', cicloId);
            
            // Actualizar estado interno
            this.estado.cicloSeleccionado = cicloId;
            this.estado.ultimaActualizacion = new Date();
            
            // Obtener información completa del ciclo
            await this.obtenerInformacionCiclo(cicloId);
            
            // Actualizar selectores en todas las páginas
            this.actualizarSelectoresCiclo(cicloId);
            
            // Usar debounce para emitir eventos (evitar spam)
            this.timeoutEstablecerCiclo = setTimeout(() => {
                // Emitir eventos de cambio de ciclo (ambos para compatibilidad)
                this.emitirEvento('ciclo-cambiado', {
                    cicloId: cicloId,
                    informacion: this.estado.informacionCiclo,
                    timestamp: new Date()
                });
                
                // Emitir evento nuevo para sincronización moderna
                this.emitirEvento('cicloActivoCambiado', {
                    cicloId: cicloId,
                    cicloActivo: this.estado.informacionCiclo,
                    timestamp: new Date()
                });
                
                // Notificar a suscriptores
                this.notificarSuscriptores();
                
                console.log(`✅ Ciclo establecido: ${cicloId}`);
            }, 100); // Debounce de 100ms
            
        } finally {
            // Liberar el lock después de un breve delay
            setTimeout(() => {
                this.estado.estableciendoCiclo = false;
            }, 200);
        }
    },

    /**
     * Obtener información completa del ciclo
     */
    async obtenerInformacionCiclo(cicloId) {
        try {
            // Intentar obtener desde el servidor
            const response = await window.apiRequest(`${this.config.endpoints.ciclos}/${cicloId}`, 'GET');
            this.estado.informacionCiclo = response.data;
        } catch (error) {
            // Solo mostrar warning si no es un error de conexión
            if (!error.message?.includes('Failed to fetch')) {
                console.warn('⚠️ Error obteniendo información del ciclo, usando datos básicos:', error.message);
            }
            // Usar información básica
            this.estado.informacionCiclo = {
                id: cicloId,
                nombre: `Ciclo ${cicloId}`,
                estado: 'activo'
            };
        }
    },

    /**
     * Actualizar selectores de ciclo en todas las páginas
     */
    actualizarSelectoresCiclo(cicloId) {
        const selectores = [
            '#selectCiclo',
            '#selectorCiclo select',
            'select[name="ciclo"]',
            '#cicloAcademico'
        ];
        
        selectores.forEach(selector => {
            const elemento = document.querySelector(selector);
            if (elemento) {
                // Buscar la opción correspondiente
                const opcion = Array.from(elemento.options).find(opt => opt.value === cicloId);
                if (opcion) {
                    elemento.value = cicloId;
                    console.log(`✅ Selector ${selector} actualizado a ciclo ${cicloId}`);
                }
            }
        });
    },

    /**
     * Configurar eventos globales
     */
    configurarEventosGlobales() {
        // Escuchar cambios en selectores de ciclo
        document.addEventListener('change', (event) => {
            const selectoresCiclo = ['#selectCiclo', '#selectorCiclo select', 'select[name="ciclo"]', '#cicloAcademico'];
            
            if (selectoresCiclo.some(selector => event.target.matches(selector))) {
                const nuevoCiclo = event.target.value;
                if (nuevoCiclo && nuevoCiclo !== this.estado.cicloSeleccionado) {
                    console.log(`🔄 Cambio de ciclo detectado en selector: ${nuevoCiclo}`);
                    this.establecerCiclo(nuevoCiclo);
                }
            }
        });
        
        // Escuchar eventos personalizados de cambio de ciclo
        document.addEventListener('cicloSeleccionado', (event) => {
            const { cicloId } = event.detail;
            if (cicloId && cicloId !== this.estado.cicloSeleccionado) {
                console.log(`🔄 Evento de cambio de ciclo recibido: ${cicloId}`);
                this.establecerCiclo(cicloId);
            }
        });
        
        // Escuchar eventos de sincronización
        document.addEventListener('sincronizar-ciclo', (event) => {
            const { cicloId } = event.detail;
            if (cicloId) {
                this.establecerCiclo(cicloId);
            }
        });
    },

    /**
     * Configurar actualización automática
     */
    configurarActualizacionAutomatica() {
        // Reducir frecuencia y agregar detección de servidor offline
        this.intervaloId = setInterval(() => {
            this.verificarActualizaciones();
        }, 60000); // Cambiar de 30s a 60s
    },

    /**
     * Verificar actualizaciones del servidor
     */
    async verificarActualizaciones() {
        // Solo verificar si el servidor está disponible
        if (this.estado.servidorOffline) {
            console.log('⚠️ Servidor offline, omitiendo verificación automática');
            return;
        }

        try {
            const cicloActivo = await this.obtenerCicloActivo();
            if (cicloActivo && cicloActivo.id.toString() !== this.estado.cicloSeleccionado) {
                console.log(`🔄 Ciclo activo cambiado en servidor: ${cicloActivo.id}`);
                await this.establecerCiclo(cicloActivo.id.toString());
            }
            // Marcar servidor como online si la petición fue exitosa
            this.estado.servidorOffline = false;
        } catch (error) {
            // Marcar servidor como offline tras error
            this.estado.servidorOffline = true;
            // Solo mostrar mensaje si no es un error de conexión común
            if (!error.message?.includes('Failed to fetch')) {
                console.log('📡 Servidor no disponible, activando modo offline');
            }
        }
    },

    /**
     * Suscribirse a cambios de ciclo
     */
    suscribirse(callback) {
        this.estado.suscriptores.add(callback);
        console.log('✅ Suscriptor agregado al sistema de sincronización');
        
        // Devolver función para desuscribirse
        return () => {
            this.estado.suscriptores.delete(callback);
            console.log('✅ Suscriptor removido del sistema de sincronización');
        };
    },

    /**
     * Notificar a todos los suscriptores
     */
    notificarSuscriptores() {
        const datos = {
            cicloId: this.estado.cicloSeleccionado,
            informacion: this.estado.informacionCiclo,
            timestamp: this.estado.ultimaActualizacion
        };
        
        this.estado.suscriptores.forEach(callback => {
            try {
                callback(datos);
            } catch (error) {
                console.error('❌ Error en suscriptor:', error);
            }
        });
    },

    /**
     * Emitir evento personalizado
     */
    emitirEvento(tipo, datos) {
        const evento = new CustomEvent(tipo, {
            detail: datos,
            bubbles: true
        });
        document.dispatchEvent(evento);
    },

    /**
     * Obtener ciclo actual
     */
    obtenerCicloActual() {
        return {
            id: this.estado.cicloSeleccionado,
            informacion: this.estado.informacionCiclo,
            ultimaActualizacion: this.estado.ultimaActualizacion
        };
    },

    /**
     * Obtener estadísticas del ciclo actual
     */
    async obtenerEstadisticasCiclo() {
        if (!this.estado.cicloSeleccionado) {
            return null;
        }
        
        try {
            const response = await window.apiRequest(
                `${this.config.endpoints.estadisticas}?ciclo=${this.estado.cicloSeleccionado}`, 
                'GET'
            );
            return response.data;
        } catch (error) {
            console.warn('⚠️ Error obteniendo estadísticas del ciclo:', error.message);
            return null;
        }
    },

    /**
     * Forzar sincronización manual
     */
    async sincronizarManual() {
        console.log('🔄 Sincronización manual iniciada...');
        await this.cargarCicloInicial();
        console.log('✅ Sincronización manual completada');
    },

    /**
     * Detectar si el servidor está disponible
     */
    async detectarServidor() {
        try {
            const response = await window.apiRequest(this.config.endpoints.cicloActivo, 'GET');
            this.estado.servidorOffline = false;
            console.log('✅ Servidor detectado como disponible');
            return true;
        } catch (error) {
            this.estado.servidorOffline = true;
            console.log('📡 Servidor no disponible');
            return false;
        }
    },

    /**
     * Pausar actualizaciones automáticas
     */
    pausarActualizaciones() {
        if (this.intervaloId) {
            clearInterval(this.intervaloId);
            this.intervaloId = null;
            console.log('⏸️ Actualizaciones automáticas pausadas');
        }
    },

    /**
     * Reanudar actualizaciones automáticas
     */
    reanudarActualizaciones() {
        if (!this.intervaloId) {
            this.configurarActualizacionAutomatica();
            console.log('▶️ Actualizaciones automáticas reanudadas');
        }
    },

    /**
     * Obtener estado del servidor
     */
    obtenerEstadoServidor() {
        return {
            offline: this.estado.servidorOffline,
            ultimaVerificacion: this.estado.ultimaActualizacion
        };
    }
};

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        SincronizacionCiclos.inicializar();
    });
} else {
    SincronizacionCiclos.inicializar();
}

// Exportar al scope global
window.SincronizacionCiclos = SincronizacionCiclos;

console.log('✅ Sistema de sincronización de ciclos cargado');