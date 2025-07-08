/**
 * Gestor de Estado del Sistema para Carga Masiva
 * Maneja el estado de archivos, conexión y datos del sistema
 */

class EstadoManager {
    constructor() {
        this.estado = {
            conectado: false,
            cicloSeleccionado: '1',
            archivosCargados: {},
            archivos: {},
            procesoActual: 'carga',
            sistemaInicializado: false,
            archivosRequeridos: ['usuarios', 'carreras', 'asignaturas'],
            archivosOpcionales: ['carga_academica', 'verificaciones', 'codigos_institucionales']
        };
        
        this.archivosConfig = {
            usuarios: {
                patron: /01_usuarios_masivos/i,
                icono: '👥',
                descripcion: 'Lista de usuarios del sistema',
                requerido: true
            },
            carreras: {
                patron: /02_carreras_completas/i,
                icono: '🎓',
                descripcion: 'Catálogo de carreras académicas',
                requerido: true
            },
            asignaturas: {
                patron: /03_asignaturas_completas/i,
                icono: '📚',
                descripcion: 'Catálogo de asignaturas',
                requerido: true
            },
            carga_academica: {
                patron: /04_carga_academica/i,
                icono: '📋',
                descripcion: 'Asignaciones docente-asignatura',
                requerido: false
            },
            verificaciones: {
                patron: /05_verificaciones/i,
                icono: '✅',
                descripcion: 'Relaciones verificador-docente',
                requerido: false
            },
            codigos_institucionales: {
                patron: /06_codigos_institucionales/i,
                icono: '🏛️',
                descripcion: 'Códigos y documentos institucionales',
                requerido: false
            }
        };
        
        this.callbacks = {
            onEstadoChange: [],
            onArchivoChange: [],
            onConexionChange: [],
            onError: []
        };
        
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    /**
     * Inicializar el gestor de estado
     */
    async inicializar() {
        try {
            console.log('🔄 Inicializando gestor de estado...');
            
            // Verificar conectividad
            await this.verificarConectividad();
            
            // Cargar estado del sistema
            await this.cargarEstadoSistema();
            
            console.log('✅ Gestor de estado inicializado correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar gestor de estado:', error);
            this.emitirError('Error al inicializar gestor de estado', error);
            return false;
        }
    }

    /**
     * Verificar conectividad con el servidor
     */
    async verificarConectividad() {
        try {
            // Intentar una petición simple para verificar conectividad
            const response = await this.realizarPeticionConReintentos('/dashboard/estadisticas', 'GET');
            if (response && (response.success || response.exito)) {
                this.estado.conectado = true;
                this.emitirCambioConexion(true);
                console.log('✅ Conectividad verificada correctamente');
            } else {
                throw new Error('Respuesta no válida del servidor');
            }
        } catch (error) {
            console.warn('⚠️ Sin conectividad con el servidor, usando modo offline:', error.message);
            this.estado.conectado = false;
            this.emitirCambioConexion(false);
        }
    }

    /**
     * Realizar petición con reintentos
     */
    async realizarPeticionConReintentos(endpoint, method = 'GET', data = null, retries = this.maxRetries) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await window.apiRequest(endpoint, method, data);
                return response;
            } catch (error) {
                console.warn(`⚠️ Intento ${i + 1}/${retries} fallido para ${endpoint}:`, error.message);
                
                if (i === retries - 1) {
                    // Último intento, lanzar error
                    throw error;
                }
                
                // Esperar antes del siguiente intento
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * (i + 1)));
            }
        }
    }

    /**
     * Cargar estado del sistema desde el servidor
     */
    async cargarEstadoSistema() {
        try {
            console.log('🔄 Cargando estado del sistema...');
            
            if (this.estado.conectado) {
                const estadoServidor = await this.cargarEstadoServidor();
                if (estadoServidor) {
                    this.estado = { ...this.estado, ...estadoServidor };
                    this.emitirCambioEstado();
                    console.log('✅ Estado del sistema cargado desde servidor');
                    return;
                }
            }
            
            // Si no hay conectividad o falló la carga, usar estado por defecto
            this.establecerEstadoPorDefecto();
            console.log('ℹ️ Usando estado por defecto del sistema');
            
        } catch (error) {
            console.error('❌ Error al cargar estado del sistema:', error);
            this.establecerEstadoPorDefecto();
            this.emitirError('Error al cargar estado del sistema', error);
        }
    }
    
    /**
     * Establecer estado por defecto
     */
    establecerEstadoPorDefecto() {
        this.estado = {
            ...this.estado,
            usuarios: 0,
            carreras: 0,
            asignaturas: 0,
            portafolios: 0,
            archivos: {},
            archivosCargados: {},
            sistemaInicializado: false,
            ultimaActualizacion: new Date().toISOString()
        };
        this.emitirCambioEstado();
    }
    
    /**
     * Cargar estado desde el servidor
     */
    async cargarEstadoServidor() {
        try {
            // Cargar estadísticas generales
            const response = await this.realizarPeticionConReintentos('/dashboard/estadisticas', 'GET');
            
            if (response && (response.success || response.exito)) {
                const data = response.data || response;
                return {
                    usuarios: data.total_usuarios || 0,
                    carreras: data.total_carreras || 0,
                    asignaturas: data.total_asignaturas || 0,
                    portafolios: data.total_portafolios || 0,
                    cicloActivo: data.ciclo_activo || null,
                    ultimaActualizacion: new Date().toISOString()
                };
            }
            
        } catch (error) {
            console.warn('⚠️ Error al cargar estadísticas generales:', error.message);
            
            // Intentar cargar datos específicos de inicialización como fallback
            try {
                const datosInicializacion = await this.realizarPeticionConReintentos('/inicializacion/estado', 'GET');
                if (datosInicializacion && (datosInicializacion.success || datosInicializacion.exito)) {
                    const data = datosInicializacion.data || datosInicializacion;
                    return {
                        usuarios: data.usuarios || 0,
                        carreras: data.carreras || 0,
                        asignaturas: data.asignaturas || 0,
                        portafolios: data.portafolios || 0,
                        sistemaInicializado: data.inicializado || false,
                        ultimaActualizacion: new Date().toISOString()
                    };
                }
            } catch (error2) {
                console.warn('⚠️ Error al cargar datos de inicialización:', error2.message);
            }
        }
        
        return null;
    }

    /**
     * Actualizar estado después de operaciones importantes
     */
    async actualizarEstadoCompleto() {
        console.log('🔄 Actualizando estado completo...');
        await this.cargarEstadoSistema();
        this.emitirCambioEstado();
    }

    /**
     * Cargar datos específicos del ciclo seleccionado
     */
    async cargarDatosPorCiclo(cicloId) {
        try {
            console.log(`🔄 Cargando datos para ciclo: ${cicloId}`);
            this.estado.cicloSeleccionado = cicloId;
            
            // Cargar archivos del ciclo
            await this.actualizarEstadoArchivosPorCiclo(cicloId);
            
            this.emitirCambioEstado();
            console.log(`✅ Datos del ciclo ${cicloId} cargados correctamente`);
            return true;
        } catch (error) {
            console.error(`❌ Error al cargar datos del ciclo ${cicloId}:`, error);
            this.emitirError('Error al cargar datos del ciclo', error);
            return false;
        }
    }
    
    /**
     * Actualizar estado interno de archivos basado en la BD
     */
    async actualizarEstadoArchivosPorCiclo(cicloId) {
        try {
            const response = await this.realizarPeticionConReintentos(`/ciclos/${cicloId}/archivos-carga`, 'GET');
            
            if (response && (response.success || response.exito) && response.data) {
                // Limpiar estado anterior
                this.estado.archivosCargados = {};
                
                // Actualizar con archivos reales de BD
                response.data.forEach(archivo => {
                    const tipoMapeado = this.mapearTipoArchivo(archivo.tipo);
                    this.estado.archivosCargados[tipoMapeado] = {
                        cargado: true,
                        registros: archivo.registros_procesados || 0,
                        ultimaActualizacion: archivo.fecha_subida,
                        archivo: archivo.nombre_original,
                        detalles: archivo.detalles_procesamiento || {}
                    };
                });
                
                this.emitirCambioArchivos();
                console.log(`✅ Estado de archivos actualizado para ciclo ${cicloId}`);
            } else {
                console.warn(`⚠️ No se encontraron archivos para el ciclo ${cicloId}`);
                // Mantener estado anterior o establecer vacío
                this.estado.archivosCargados = {};
                this.emitirCambioArchivos();
            }
        } catch (error) {
            console.warn(`⚠️ Error al actualizar estado de archivos para ciclo ${cicloId}:`, error.message);
            // En caso de error, mantener estado actual y no lanzar excepción
            this.estado.archivosCargados = {};
            this.emitirCambioArchivos();
        }
    }

    /**
     * Mapear tipos de archivo del servidor a configuración local
     */
    mapearTipoArchivo(tipoServidor) {
        const mapeo = {
            'usuarios': 'usuarios',
            'users': 'usuarios',
            'carreras': 'carreras',
            'programs': 'carreras',
            'asignaturas': 'asignaturas',
            'subjects': 'asignaturas',
            'carga_academica': 'carga_academica',
            'academic_load': 'carga_academica',
            'verificaciones': 'verificaciones',
            'verifications': 'verificaciones',
            'codigos_institucionales': 'codigos_institucionales',
            'institutional_codes': 'codigos_institucionales'
        };
        
        return mapeo[tipoServidor] || tipoServidor;
    }

    /**
     * Limpiar datos del sistema
     */
    limpiarDatos() {
        console.log('🧹 Limpiando datos del sistema...');
        this.estado.archivos = {};
        this.estado.archivosCargados = {};
        this.emitirCambioArchivos();
    }

    /**
     * Reiniciar sistema completo
     */
    reiniciarSistemaCompleto() {
        console.log('🔄 Reiniciando sistema completo...');
        this.estado.archivosCargados = {};
        this.estado.archivos = {};
        this.estado.procesoActual = 'carga';
        this.estado.sistemaInicializado = false;
        
        this.emitirCambioEstado();
    }

    /**
     * Verificar si todos los archivos requeridos están cargados
     */
    verificarArchivosRequeridos() {
        return this.estado.archivosRequeridos.every(tipo => 
            this.estado.archivosCargados[tipo]?.cargado
        );
    }

    /**
     * Obtener progreso de carga de archivos
     */
    obtenerProgresoArchivos() {
        const totalRequeridos = this.estado.archivosRequeridos.length;
        const cargados = this.estado.archivosRequeridos.filter(tipo => 
            this.estado.archivosCargados[tipo]?.cargado
        ).length;
        
        return {
            porcentaje: totalRequeridos > 0 ? Math.round((cargados / totalRequeridos) * 100) : 0,
            cargados,
            total: totalRequeridos
        };
    }

    /**
     * Obtener progreso general del sistema
     */
    obtenerProgreso() {
        const progresoArchivos = this.obtenerProgresoArchivos();
        
        return {
            archivos: progresoArchivos,
            sistema: this.estado.sistemaInicializado ? 100 : 0,
            proceso: this.estado.procesoActual === 'completado' ? 100 : 50,
            general: Math.round((progresoArchivos.porcentaje + (this.estado.sistemaInicializado ? 100 : 0)) / 2),
            porcentaje: progresoArchivos.porcentaje,
            mensaje: `${progresoArchivos.cargados}/${progresoArchivos.total} archivos cargados`
        };
    }

    /**
     * Calcular portafolios estimados
     */
    calcularPortafoliosEstimados() {
        const usuarios = this.estado.archivosCargados?.usuarios?.registros || 0;
        const asignaturas = this.estado.archivosCargados?.asignaturas?.registros || 0;
        
        // Estimación: asumiendo que 70% de usuarios son docentes y cada docente tiene 2-3 asignaturas en promedio
        const docentesEstimados = Math.round(usuarios * 0.7);
        const portafoliosEstimados = Math.min(docentesEstimados * 2, asignaturas);
        
        return portafoliosEstimados;
    }

    /**
     * Obtener estado actual
     */
    obtenerEstado() {
        return { ...this.estado };
    }

    /**
     * Obtener configuración de archivos
     */
    obtenerConfigArchivos() {
        return { ...this.archivosConfig };
    }

    /**
     * Actualizar proceso actual
     */
    actualizarProcesoActual(proceso) {
        console.log(`🔄 Actualizando proceso actual a: ${proceso}`);
        this.estado.procesoActual = proceso;
        this.emitirCambioEstado();
    }

    /**
     * Marcar archivo como cargado
     */
    marcarArchivoCargado(tipo, detalles) {
        if (!this.estado.archivosCargados) {
            this.estado.archivosCargados = {};
        }
        
        this.estado.archivosCargados[tipo] = {
            cargado: true,
            ...detalles,
            ultimaActualizacion: new Date().toISOString()
        };
        
        console.log(`📁 Archivo ${tipo} marcado como cargado`);
        this.emitirCambioArchivos();
    }

    /**
     * Registrar callbacks para eventos
     */
    onEstadoChange(callback) {
        this.callbacks.onEstadoChange.push(callback);
    }

    onArchivoChange(callback) {
        this.callbacks.onArchivoChange.push(callback);
    }

    onConexionChange(callback) {
        this.callbacks.onConexionChange.push(callback);
    }

    onError(callback) {
        this.callbacks.onError.push(callback);
    }

    /**
     * Emitir eventos
     */
    emitirCambioEstado() {
        this.callbacks.onEstadoChange.forEach(callback => {
            try {
                callback(this.estado);
            } catch (error) {
                console.error('Error en callback de cambio de estado:', error);
            }
        });
    }

    emitirCambioArchivos() {
        this.callbacks.onArchivoChange.forEach(callback => {
            try {
                callback(this.estado.archivosCargados);
            } catch (error) {
                console.error('Error en callback de cambio de archivos:', error);
            }
        });
    }

    emitirCambioConexion(conectado) {
        this.callbacks.onConexionChange.forEach(callback => {
            try {
                callback(conectado);
            } catch (error) {
                console.error('Error en callback de cambio de conexión:', error);
            }
        });
    }

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
window.EstadoManager = EstadoManager;