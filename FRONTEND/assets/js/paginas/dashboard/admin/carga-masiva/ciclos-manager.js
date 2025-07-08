/**
 * Gestor de Ciclos Académicos para Carga Masiva
 * Maneja la sincronización, carga y gestión de ciclos académicos
 */

class CiclosManager {
    constructor() {
        this.cicloSeleccionado = null;
        this.ciclos = [];
        this.callbacks = {
            onCicloChange: [],
            onCiclosLoaded: [],
            onError: []
        };
        this.eventosConfigurados = false;
        this.sincronizandoCiclo = false;
    }

    /**
     * Inicializar el gestor de ciclos
     */
    async inicializar() {
        try {
            console.log('🔄 Inicializando gestor de ciclos...');
            
            // Integrar con sistema global de ciclos (solo una vez)
            if (!this.eventosConfigurados) {
                this.integrarSistemaCiclosGlobal();
            }
            
            // Cargar ciclos académicos
            await this.cargarCiclosAcademicos();
            
            // Sincronizar con ciclo inicial
            this.sincronizarCicloInicial();
            
            console.log('✅ Gestor de ciclos inicializado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar gestor de ciclos:', error);
            this.emitirError('Error al inicializar gestor de ciclos', error);
            return false;
        }
    }

    /**
     * Integrar con el sistema global de ciclos académicos
     */
    integrarSistemaCiclosGlobal() {
        if (this.eventosConfigurados) {
            return;
        }
        
        try {
            console.log('🔗 Integrando con sistema global de ciclos...');
            
            // Escuchar eventos de cambio de ciclo desde otras páginas
            const manejarCambioGlobal = (event) => {
                const { cicloId, cicloNombre } = event.detail;
                this.sincronizarCicloDesdeEvento(cicloId, event);
            };
            
            // Remover listener anterior si existe
            window.removeEventListener('cicloAcademicoChange', manejarCambioGlobal);
            window.addEventListener('cicloAcademicoChange', manejarCambioGlobal);
            
            this.eventosConfigurados = true;
            console.log('✅ Integración con sistema global de ciclos configurada');
            
        } catch (error) {
            console.error('❌ Error en integración con sistema global:', error);
            this.emitirError('Error en integración con sistema global', error);
        }
    }
    
    /**
     * Sincronizar ciclo inicial con el sistema global
     */
    sincronizarCicloInicial() {
        try {
            // Verificar si hay un ciclo seleccionado en el sistema global
            const cicloGlobal = window.DataTablero?.obtenerCicloSeleccionado?.();
            
            if (cicloGlobal && cicloGlobal !== this.cicloSeleccionado) {
                console.log(`🔄 Sincronizando con ciclo global: ${cicloGlobal}`);
                this.cicloSeleccionado = cicloGlobal;
                
                // Si el selector ya está disponible, actualizarlo
                setTimeout(() => {
                    const selector = document.getElementById('selectCiclo') || document.getElementById('cicloAcademico');
                    if (selector && selector.options.length > 1) {
                        selector.value = cicloGlobal;
                    }
                }, 500);
            }
        } catch (error) {
            console.warn('⚠️ Error en sincronización inicial (no crítico):', error.message);
        }
    }
    
    /**
     * Sincronizar ciclo desde evento de otra página
     */
    async sincronizarCicloDesdeEvento(cicloId, evento) {
        // Evitar bucles infinitos
        if (this.sincronizandoCiclo) {
            return;
        }
        
        try {
            // Evitar bucles infinitos - no procesar eventos que vienen de esta misma página
            if (evento?.detail?.origen === 'carga-masiva') {
                return;
            }
            
            if (!cicloId || cicloId === this.cicloSeleccionado) {
                return; // No hacer nada si es el mismo ciclo
            }
            
            this.sincronizandoCiclo = true;
            console.log(`🔄 Sincronizando ciclo desde evento: ${cicloId}`);
            
            // Actualizar estado interno
            this.cicloSeleccionado = cicloId;
            
            // Actualizar selector si existe
            const selector = document.getElementById('selectCiclo') || document.getElementById('cicloAcademico');
            if (selector) {
                selector.value = cicloId;
                
                // Emitir evento de cambio
                const cicloNombre = selector.options[selector.selectedIndex]?.text || `Ciclo ${cicloId}`;
                this.emitirCambioCiclo(cicloId, cicloNombre);
            }
            
        } catch (error) {
            console.error('❌ Error en sincronización desde evento:', error);
            this.emitirError('Error en sincronización desde evento', error);
        } finally {
            this.sincronizandoCiclo = false;
        }
    }
    
    /**
     * Emitir evento de cambio de ciclo al sistema global
     */
    emitirCambioCicloGlobal(cicloId, cicloNombre) {
        if (this.sincronizandoCiclo) {
            return; // Evitar bucles
        }
        
        try {
            // Actualizar sistema global si existe
            if (window.DataTablero?.establecerCicloSeleccionado) {
                window.DataTablero.establecerCicloSeleccionado(cicloId);
            }
            
            // Emitir evento personalizado
            const evento = new CustomEvent('cicloAcademicoChange', {
                detail: { 
                    cicloId, 
                    cicloNombre,
                    origen: 'carga-masiva'
                }
            });
            
            window.dispatchEvent(evento);
            console.log(`📢 Evento de cambio de ciclo emitido: ${cicloId}`);
        } catch (error) {
            console.error('❌ Error al emitir cambio de ciclo:', error);
            this.emitirError('Error al emitir cambio de ciclo', error);
        }
    }

    /**
     * Cargar ciclos académicos desde el servidor
     */
    async cargarCiclosAcademicos() {
        try {
            console.log('🔄 Cargando ciclos académicos...');
            
            // Intentar cargar desde el servidor primero
            const response = await window.apiRequest('/ciclos', 'GET');
            
            if (response && (response.success || response.exito) && response.data && response.data.length > 0) {
                this.ciclos = response.data;
                this.llenarSelectorCiclos(response.data);
                this.emitirCiclosCargados(response.data);
                console.log(`✅ ${response.data.length} ciclos académicos cargados`);
                return response.data;
            } else {
                console.warn('⚠️ No se recibieron datos válidos del servidor, usando datos por defecto');
                return this.usarCiclosPorDefecto();
            }
        } catch (error) {
            console.warn('⚠️ Error al cargar ciclos académicos, usando datos por defecto:', error.message);
            return this.usarCiclosPorDefecto();
        }
    }
    
    /**
     * Usar ciclos por defecto cuando el servidor no está disponible
     */
    usarCiclosPorDefecto() {
        const ciclosPorDefecto = [
            { id: 1, nombre: 'Ciclo 2024-I', estado: 'activo', anio_actual: 2024 },
            { id: 2, nombre: 'Ciclo 2024-II', estado: 'inactivo', anio_actual: 2024 }
        ];
        
        this.ciclos = ciclosPorDefecto;
        this.llenarSelectorCiclos(ciclosPorDefecto);
        this.emitirCiclosCargados(ciclosPorDefecto);
        console.log(`ℹ️ Usando ${ciclosPorDefecto.length} ciclos por defecto`);
        return ciclosPorDefecto;
    }

    /**
     * Llenar selector de ciclos en la interfaz
     */
    llenarSelectorCiclos(ciclos) {
        const selector = document.getElementById('selectCiclo') || document.getElementById('cicloAcademico');
        if (!selector) {
            console.warn('⚠️ No se encontró el selector de ciclos');
            return;
        }
        
        console.log('🔄 Llenando selector de ciclos...');
        
        // Limpiar selector
        selector.innerHTML = '<option value="">Seleccione un ciclo académico</option>';
        
        let cicloActivoSeleccionado = false;
        
        ciclos.forEach((ciclo) => {
            const option = document.createElement('option');
            option.value = ciclo.id;
            
            // Crear texto de la opción
            let textoOpcion = ciclo.nombre || `Ciclo ${ciclo.id}`;
            
            // Verificar si el ciclo está activo
            const esActivo = ciclo.estado === 'activo';
            
            if (esActivo) {
                textoOpcion += ' (Activo)';
            }
            
            option.textContent = textoOpcion;
            
            // Seleccionar el ciclo activo automáticamente si no hay uno seleccionado
            if (esActivo && !cicloActivoSeleccionado && !this.cicloSeleccionado) {
                option.selected = true;
                this.cicloSeleccionado = ciclo.id;
                cicloActivoSeleccionado = true;
            }
            
            // Si ya hay un ciclo seleccionado, mantenerlo
            if (this.cicloSeleccionado && ciclo.id.toString() === this.cicloSeleccionado.toString()) {
                option.selected = true;
            }
            
            selector.appendChild(option);
        });
        
        // Configurar event listener (solo una vez)
        if (!selector.dataset.listenerConfigured) {
            this.configurarEventListenerSelector(selector);
            selector.dataset.listenerConfigured = 'true';
        }
        
        // Si se seleccionó un ciclo automáticamente, emitir evento
        if (cicloActivoSeleccionado) {
            const textoSeleccionado = selector.options[selector.selectedIndex].text;
            setTimeout(() => {
                this.emitirCambioCiclo(this.cicloSeleccionado, textoSeleccionado);
            }, 100);
        }
        
        console.log(`✅ Selector de ciclos configurado con ${ciclos.length} opciones`);
    }

    /**
     * Configurar event listener del selector
     */
    configurarEventListenerSelector(selector) {
        // Crear función bound para poder removerla después
        const manejarCambioCiclo = async (e) => {
            // Evitar bucles infinitos
            if (this.sincronizandoCiclo) {
                return;
            }
            
            const cicloId = e.target.value;
            
            if (cicloId && cicloId !== this.cicloSeleccionado) {
                this.sincronizandoCiclo = true;
                
                try {
                    console.log(`🔄 Usuario seleccionó ciclo: ${cicloId}`);
                    this.cicloSeleccionado = cicloId;
                    
                    const textoSeleccionado = e.target.options[e.target.selectedIndex].text;
                    
                    // Emitir evento de cambio de ciclo al sistema global
                    this.emitirCambioCicloGlobal(cicloId, textoSeleccionado);
                    
                    // Emitir evento local
                    this.emitirCambioCiclo(cicloId, textoSeleccionado);
                } finally {
                    this.sincronizandoCiclo = false;
                }
            } else if (!cicloId) {
                this.cicloSeleccionado = null;
                this.emitirCambioCiclo(null, null);
            }
        };
        
        // Agregar event listener
        selector.addEventListener('change', manejarCambioCiclo);
        console.log('✅ Event listener del selector configurado');
    }

    /**
     * Cambiar estado de un ciclo académico
     */
    async cambiarEstadoCiclo(cicloId, nuevoEstado) {
        try {
            console.log(`🔄 Cambiando estado del ciclo ${cicloId} a ${nuevoEstado}...`);
            
            const response = await window.apiRequest(`/ciclos/${cicloId}/estado`, 'PUT', {
                nuevoEstado: nuevoEstado,
                usuario_id: window.AUTH?.obtenerDatosUsuario()?.id
            });
            
            if (response && (response.success || response.exito)) {
                // Actualizar ciclo en la lista local
                const ciclo = this.ciclos.find(c => c.id === cicloId);
                if (ciclo) {
                    ciclo.estado = nuevoEstado;
                }
                
                this.emitirEstadoCambiado(cicloId, nuevoEstado);
                console.log(`✅ Estado del ciclo ${cicloId} cambiado a ${nuevoEstado}`);
                return response;
            } else {
                throw new Error(response?.message || 'Error al cambiar estado');
            }
        } catch (error) {
            console.error(`❌ Error al cambiar estado del ciclo ${cicloId}:`, error);
            this.emitirError('Error al cambiar estado del ciclo', error);
            throw error;
        }
    }

    /**
     * Obtener ciclo seleccionado
     */
    obtenerCicloSeleccionado() {
        return this.cicloSeleccionado;
    }

    /**
     * Obtener información del ciclo seleccionado
     */
    obtenerInfoCicloSeleccionado() {
        if (!this.cicloSeleccionado) return null;
        return this.ciclos.find(c => c.id.toString() === this.cicloSeleccionado.toString());
    }
    
    /**
     * Obtener todos los ciclos
     */
    obtenerCiclos() {
        return [...this.ciclos];
    }

    /**
     * Registrar callback para eventos
     */
    onCicloChange(callback) {
        this.callbacks.onCicloChange.push(callback);
    }

    onCiclosCargados(callback) {
        this.callbacks.onCiclosLoaded.push(callback);
    }

    onError(callback) {
        this.callbacks.onError.push(callback);
    }

    /**
     * Emitir evento de cambio de ciclo
     */
    emitirCambioCiclo(cicloId, cicloNombre) {
        this.callbacks.onCicloChange.forEach(callback => {
            try {
                callback(cicloId, cicloNombre);
            } catch (error) {
                console.error('Error en callback de cambio de ciclo:', error);
            }
        });
    }

    /**
     * Emitir evento de ciclos cargados
     */
    emitirCiclosCargados(ciclos) {
        this.callbacks.onCiclosLoaded.forEach(callback => {
            try {
                callback(ciclos);
            } catch (error) {
                console.error('Error en callback de ciclos cargados:', error);
            }
        });
    }

    /**
     * Emitir evento de estado cambiado
     */
    emitirEstadoCambiado(cicloId, nuevoEstado) {
        const evento = new CustomEvent('cicloEstadoCambiado', {
            detail: { cicloId, nuevoEstado }
        });
        window.dispatchEvent(evento);
    }

    /**
     * Emitir error
     */
    emitirError(mensaje, error = null) {
        console.error('❌ CiclosManager Error:', mensaje, error);
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
window.CiclosManager = CiclosManager;