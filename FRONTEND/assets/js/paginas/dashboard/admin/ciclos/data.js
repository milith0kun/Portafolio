/**
 * CICLOS - MÓDULO DATA
 * Operaciones de datos y comunicación con API
 */

export class CiclosData {
    constructor(core) {
        this.core = core;
        this.debug = window.ciclosDebug || false;
        this.verificandoCicloActivo = false;
        this.timeoutEventoCiclo = null;
        this.log('Módulo Data inicializado');
    }

    /**
     * Cargar ciclo activo
     */
    async cargarCicloActivo() {
        // Evitar verificaciones múltiples simultáneas
        if (this.core.verificandoCicloActivo) {
            return;
        }
        
        // Limitar verificaciones frecuentes (máximo cada 5 segundos)
        const ahora = Date.now();
        if (ahora - this.core.ultimaVerificacionCiclo < 5000) {
            return;
        }
        
        this.core.verificandoCicloActivo = true;
        this.core.ultimaVerificacionCiclo = ahora;
        
        try {
            const response = await this.core.realizarPeticionSegura(`${this.core.CONFIG.API.BASE_URL}/ciclos/activo`);
            
            if (response.success && response.data) {
                this.core.cicloActivo = response.data;
                this.core.mostrarAlertaSistema(
                    'Ciclo Activo',
                    `${response.data.nombre} (${response.data.semestre_actual} - ${response.data.anio_actual})`,
                    'success'
                );
                
                // Cargar estados de módulos si hay ciclo activo
                await this.cargarEstadosCiclo(response.data.id);
                
                this.log('Ciclo activo cargado:', response.data);
            } else {
                this.core.cicloActivo = null;
                this.core.mostrarAlertaSistema(
                    'Sin Ciclo Activo',
                    'No hay ningún ciclo académico activo en el sistema',
                    'warning'
                );
                this.log('No hay ciclo activo');
            }
        } catch (error) {
            // Solo mostrar error si no es un 404 esperado
            if (!error.message?.includes('404') && !error.message?.includes('No hay ciclo')) {
                // Error inesperado al cargar ciclo activo
                this.core.mostrarAlertaSistema(
                    'Error',
                    'Error al verificar el ciclo activo',
                    'error'
                );
            }
        } finally {
            this.core.verificandoCicloActivo = false;
        }
    }

    /**
     * Cargar lista de todos los ciclos
     */
    async cargarCiclos() {
        try {
            const response = await this.core.realizarPeticionSegura(`${this.core.CONFIG.API.BASE_URL}/ciclos`);
            
            if (response.success) {
                this.log('Ciclos cargados:', response.data.length);
                return response.data;
            } else {
                throw new Error(response.message || 'Error al cargar ciclos');
            }
        } catch (error) {
            // Error al cargar ciclos
            if (typeof toastr !== 'undefined') {
                toastr.error('Error al cargar la lista de ciclos');
            }
            return [];
        }
    }

    /**
     * Guardar ciclo (crear o actualizar)
     */
    async guardarCiclo(datos, cicloId = null) {
        try {
            const url = cicloId 
                ? `${this.core.CONFIG.API.BASE_URL}/ciclos/${cicloId}`
                : `${this.core.CONFIG.API.BASE_URL}/ciclos`;
            
            const method = cicloId ? 'PUT' : 'POST';
            
            const response = await this.core.realizarPeticionSegura(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            });

            if (response.success) {
                this.log(`Ciclo ${cicloId ? 'actualizado' : 'creado'} exitosamente`);
                return response;
            } else {
                throw new Error(response.message || 'Error al guardar el ciclo');
            }
        } catch (error) {
            // Error al guardar ciclo
            throw error;
        }
    }

    /**
     * Cargar datos de un ciclo específico
     */
    async cargarDatosCiclo(cicloId) {
        try {
            const response = await this.core.realizarPeticionSegura(`${this.core.CONFIG.API.BASE_URL}/ciclos/${cicloId}`);
            
            if (response.success) {
                this.log('Datos del ciclo cargados:', cicloId);
                return response.data;
            } else {
                throw new Error(response.message || 'Error al cargar los datos del ciclo');
            }
        } catch (error) {
            // Error al cargar datos del ciclo
            throw error;
        }
    }

    /**
     * Activar un ciclo académico
     */
    async activarCiclo(cicloId) {
        try {
            const response = await this.core.realizarPeticionSegura(`${this.core.CONFIG.API.BASE_URL}/ciclos/${cicloId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: 'activo' })
            });

            if (response.success) {
                this.log('Ciclo activado exitosamente:', cicloId);
                return response;
            } else {
                throw new Error(response.message || 'Error al activar el ciclo');
            }
        } catch (error) {
            // Error al activar ciclo
            throw error;
        }
    }

    /**
     * Cerrar ciclo académico (cambiar a finalizacion)
     */
    async cerrarCiclo(cicloId) {
        try {
            const response = await this.cambiarEstadoCiclo(cicloId, 'finalizacion');
            
            if (response.success) {
                this.log('Ciclo cerrado exitosamente:', cicloId);
                
                // Actualizar ciclo activo si es necesario
                if (this.core.cicloActivo && this.core.cicloActivo.id === cicloId) {
                    this.core.cicloActivo = null;
                }
                
                return response;
            } else {
                throw new Error(response.message || 'Error al cerrar el ciclo');
            }
        } catch (error) {
            // Error al cerrar ciclo
            throw error;
        }
    }

    /**
     * Cambiar estado de un ciclo académico
     */
    async cambiarEstadoCiclo(cicloId, nuevoEstado) {
        try {
            const response = await this.core.realizarPeticionSegura(`${this.core.CONFIG.API.BASE_URL}/ciclos/${cicloId}/estado`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (response.success) {
                this.log(`Estado del ciclo ${cicloId} cambiado a: ${nuevoEstado}`);
                
                // Actualizar ciclo activo si es necesario
                if (this.core.cicloActivo && this.core.cicloActivo.id === cicloId) {
                    this.core.cicloActivo = response.data;
                }
                
                return response;
            } else {
                throw new Error(response.message || `Error al cambiar estado del ciclo a ${nuevoEstado}`);
            }
        } catch (error) {
            // Error al cambiar estado del ciclo
            throw error;
        }
    }

    /**
     * Inicializar ciclo (cambiar a inicializacion)
     */
    async inicializarCicloEstado(cicloId) {
        try {
            return await this.cambiarEstadoCiclo(cicloId, 'inicializacion');
        } catch (error) {
            // Error al inicializar ciclo
            throw error;
        }
    }

    /**
     * Iniciar verificación del ciclo
     */
    async iniciarVerificacionCiclo(cicloId) {
        try {
            return await this.cambiarEstadoCiclo(cicloId, 'verificacion');
        } catch (error) {
            // Error al iniciar verificación
            throw error;
        }
    }

    /**
     * Archivar ciclo
     */
    async archivarCiclo(cicloId) {
        try {
            return await this.cambiarEstadoCiclo(cicloId, 'archivado');
        } catch (error) {
            // Error al archivar ciclo
            throw error;
        }
    }

    /**
     * Obtener ciclo en verificación
     */
    async cargarCicloEnVerificacion() {
        try {
            const response = await this.core.realizarPeticionSegura(`${this.core.CONFIG.API.BASE_URL}/ciclos/verificacion`);
            
            if (response.success && response.data) {
                this.log('Ciclo en verificación cargado:', response.data.nombre);
                return response.data;
            } else {
                this.log('No hay ciclo en verificación actualmente');
                return null;
            }
        } catch (error) {
            // Error al cargar ciclo en verificación
            return null;
        }
    }

    /**
     * Cambiar estado de un módulo específico
     */
    async cambiarEstadoModulo(cicloId, modulo, habilitado, observaciones = '') {
        try {
            const response = await this.core.realizarPeticionSegura(`${this.core.CONFIG.API.BASE_URL}/ciclos/${cicloId}/estados/${modulo}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    habilitado, 
                    observaciones 
                })
            });

            if (response.success) {
                this.log(`Módulo ${modulo} ${habilitado ? 'habilitado' : 'deshabilitado'} exitosamente`);
                
                // Actualizar estados locales
                await this.cargarEstadosCiclo(cicloId);
                
                return response;
            } else {
                throw new Error(response.message || `Error al cambiar estado del módulo ${modulo}`);
            }
        } catch (error) {
            // Error al cambiar estado del módulo
            throw error;
        }
    }

    /**
     * Inicializar ciclo (habilitar carga de datos)
     */
    async inicializarCiclo(cicloId) {
        try {
            // Primero activar el ciclo si no está activo
            const response = await this.activarCiclo(cicloId);
            
            if (response.success) {
                // Luego habilitar el módulo de carga de datos
                await this.cambiarEstadoModulo(cicloId, 'carga_datos', true, 'Ciclo inicializado - Carga de datos habilitada');
                
                this.log('Ciclo inicializado exitosamente:', cicloId);
                return { success: true, message: 'Ciclo inicializado y listo para carga de datos' };
            } else {
                throw new Error('Error al activar el ciclo');
            }
        } catch (error) {
            // Error al inicializar ciclo
            throw error;
        }
    }

    /**
     * Finalizar carga de datos y pasar a verificación
     */
    async finalizarCargaDatos(cicloId) {
        try {
            // Deshabilitar carga de datos y habilitar verificación
            await this.cambiarEstadoModulo(cicloId, 'carga_datos', false, 'Carga de datos finalizada');
            await this.cambiarEstadoModulo(cicloId, 'verificacion', true, 'Proceso de verificación iniciado');
            
            this.log('Carga de datos finalizada, verificación habilitada:', cicloId);
            return { success: true, message: 'Carga finalizada. Proceso de verificación iniciado.' };
        } catch (error) {
            // Error al finalizar carga de datos
            throw error;
        }
    }

    /**
     * Eliminar un ciclo académico
     */
    async eliminarCiclo(cicloId) {
        try {
            const response = await this.core.realizarPeticionSegura(`${this.core.CONFIG.API.BASE_URL}/ciclos/${cicloId}`, {
                method: 'DELETE'
            });

            if (response.success) {
                this.log('Ciclo eliminado exitosamente:', cicloId);
                return response;
            } else {
                throw new Error(response.message || 'Error al eliminar el ciclo');
            }
        } catch (error) {
            // Error al eliminar ciclo
            throw error;
        }
    }

    /**
     * Cargar estados de módulos de un ciclo
     */
    async cargarEstadosCiclo(cicloId) {
        try {
            const response = await this.core.realizarPeticionSegura(`${this.core.CONFIG.API.BASE_URL}/ciclos/${cicloId}/estados`);
            
            if (response.success) {
                this.core.estadosModulos = response.data || {};
                this.log('Estados de módulos cargados:', this.core.estadosModulos);
                
                // Emitir evento personalizado
                document.dispatchEvent(new CustomEvent('ciclosEstadosCargados', {
                    detail: { cicloId, estados: this.core.estadosModulos }
                }));
                
                return this.core.estadosModulos;
            } else {
                this.core.estadosModulos = {};
                this.log('No se pudieron cargar los estados de módulos');
                return {};
            }
        } catch (error) {
            // Error al cargar estados del ciclo
            this.core.estadosModulos = {};
            return {};
        }
    }

    /**
     * Guardar estados de módulos
     */
    async guardarEstadosCiclo(cicloId, estados) {
        try {
            const response = await this.core.realizarPeticionSegura(`${this.core.CONFIG.API.BASE_URL}/ciclos/${cicloId}/estados`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estados })
            });

            if (response.success) {
                this.core.estadosModulos = estados;
                this.log('Estados de módulos guardados exitosamente');
                
                // Emitir evento personalizado
                document.dispatchEvent(new CustomEvent('ciclosEstadosGuardados', {
                    detail: { cicloId, estados }
                }));
                
                return response;
            } else {
                throw new Error(response.message || 'Error al guardar los estados');
            }
        } catch (error) {
            // Error al guardar estados
            throw error;
        }
    }

    /**
     * Verificar ciclo activo silenciosamente (para uso en background)
     */
    async verificarCicloActivoSilencioso() {
        // Evitar verificaciones múltiples simultáneas
        if (this.verificandoCicloActivo) {
            return this.core.cicloActivo;
        }
        
        this.verificandoCicloActivo = true;
        
        try {
            const response = await this.core.realizarPeticionSegura(`${this.core.CONFIG.API.BASE_URL}/ciclos/activo`);
            
            if (response.success && response.data) {
                // Solo actualizar si hay cambios
                if (!this.core.cicloActivo || this.core.cicloActivo.id !== response.data.id) {
                    this.core.cicloActivo = response.data;
                    
                    // Usar debounce para evitar spam de eventos
                    if (this.timeoutEventoCiclo) {
                        clearTimeout(this.timeoutEventoCiclo);
                    }
                    
                    this.timeoutEventoCiclo = setTimeout(() => {
                        // Emitir evento de cambio de ciclo con estructura estandarizada
                        document.dispatchEvent(new CustomEvent('cicloActivoCambiado', {
                            detail: { 
                                cicloId: response.data.id,
                                cicloActivo: response.data,
                                timestamp: new Date()
                            }
                        }));
                        
                        // También emitir evento legacy para compatibilidad
                        document.dispatchEvent(new CustomEvent('ciclo-cambiado', {
                            detail: {
                                cicloId: response.data.id,
                                informacion: response.data,
                                timestamp: new Date()
                            }
                        }));
                    }, 150); // Debounce de 150ms
                    
                    this.log('Ciclo activo actualizado silenciosamente:', response.data.nombre);
                }
                return response.data;
            } else {
                if (this.core.cicloActivo) {
                    this.core.cicloActivo = null;
                    
                    // Emitir evento de pérdida de ciclo activo
                    document.dispatchEvent(new CustomEvent('cicloActivoPerdido'));
                    
                    this.log('Ciclo activo perdido');
                }
                return null;
            }
        } catch (error) {
            // Verificación silenciosa - no mostrar errores al usuario
            this.log('Error en verificación silenciosa:', error.message);
            return null;
        } finally {
            // Liberar el lock
            setTimeout(() => {
                this.verificandoCicloActivo = false;
            }, 100);
        }
    }

    /**
     * Obtener estadísticas del ciclo
     */
    async obtenerEstadisticasCiclo(cicloId) {
        try {
            const response = await this.core.realizarPeticionSegura(`${this.core.CONFIG.API.BASE_URL}/ciclos/${cicloId}/estadisticas`);
            
            if (response.success) {
                this.log('Estadísticas del ciclo obtenidas:', cicloId);
                return response.data;
            } else {
                throw new Error(response.message || 'Error al obtener estadísticas');
            }
        } catch (error) {
            // Error al obtener estadísticas
            return null;
        }
    }

    /**
     * Logging para desarrollo
     */
    log(...args) {
        if (this.debug) {
            // [CiclosData]
        }
    }

    /**
     * Obtener todos los datos necesarios para inicialización
     */
    async obtenerDatosIniciales() {
        try {
            const [cicloActivo, ciclos] = await Promise.allSettled([
                this.cargarCicloActivo(),
                this.cargarCiclos()
            ]);

            const resultado = {
                cicloActivo: cicloActivo.status === 'fulfilled' ? this.core.cicloActivo : null,
                ciclos: ciclos.status === 'fulfilled' ? ciclos.value : [],
                errores: []
            };

            if (cicloActivo.status === 'rejected') {
                resultado.errores.push({ tipo: 'cicloActivo', error: cicloActivo.reason });
            }

            if (ciclos.status === 'rejected') {
                resultado.errores.push({ tipo: 'ciclos', error: ciclos.reason });
            }

            this.log('Datos iniciales obtenidos:', resultado);
            return resultado;
        } catch (error) {
            // Error al obtener datos iniciales
            return {
                cicloActivo: null,
                ciclos: [],
                errores: [{ tipo: 'general', error }]
            };
        }
    }
}