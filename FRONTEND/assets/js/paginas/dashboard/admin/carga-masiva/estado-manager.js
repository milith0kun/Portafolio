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
                // Forzar auth=true explícitamente
                const response = await window.apiRequest(endpoint, method, data, true);
                return response;
            } catch (error) {
                // Si es error de autenticación, forzar logout y redirección
                if (error.status === 401 || error.status === 403) {
                    if (window.AUTH && typeof window.AUTH.cerrarSesion === 'function') {
                        window.AUTH.cerrarSesion();
                    } else {
                        window.location.href = '/paginas/autenticacion/login.html';
                    }
                    throw error;
                }
                console.warn(`⚠️ Intento ${i + 1}/${retries} fallido para ${endpoint}:`, error.message);
                if (i === retries - 1) {
                    throw error;
                }
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
            // Solo cargar información básica del estado del sistema
            // Las estadísticas detalladas se manejan en verificar-datos.js
            const response = await this.realizarPeticionConReintentos('/dashboard/ciclo-actual', 'GET');
            
            if (response && (response.success || response.exito)) {
                const data = response.data || response;
                return {
                    cicloActivo: data.ciclo_activo || data,
                    sistemaInicializado: true,
                    ultimaActualizacion: new Date().toISOString()
                };
            }
            
        } catch (error) {
            console.warn('⚠️ No se pudo cargar estado del servidor:', error.message);
        }
        
        return null;
    }

    /**
     * Actualizar estado completo del sistema
     */
    async actualizarEstadoCompleto() {
        await this.verificarConectividad();
        await this.cargarEstadoSistema();
        this.emitirCambioEstado();
    }

    /**
     * Cargar datos específicos por ciclo
     */
    async cargarDatosPorCiclo(cicloId) {
        try {
            console.log('🔄 Cargando datos para ciclo:', cicloId);
            
            if (!this.estado.conectado) {
                console.warn('⚠️ Sin conexión, no se pueden cargar datos del ciclo');
                return;
            }

            // Actualizar estado de archivos para el ciclo
            await this.actualizarEstadoArchivosPorCiclo(cicloId);
            
            console.log('✅ Datos del ciclo', cicloId, 'cargados correctamente');
            
        } catch (error) {
            console.error('❌ Error cargando datos del ciclo:', error);
            this.emitirError('Error al cargar datos del ciclo', error);
        }
    }

    /**
     * Actualizar estado de archivos por ciclo
     */
    async actualizarEstadoArchivosPorCiclo(cicloId) {
        try {
            // Inicializar el estado de archivos para este ciclo si no existe
            if (!this.estado.archivos[cicloId]) {
                this.estado.archivos[cicloId] = {};
            }

            // Verificar si hay archivos cargados para este ciclo
            // Esta información podría venir del backend o del localStorage
            const archivosGuardados = localStorage.getItem(`archivos_ciclo_${cicloId}`);
            if (archivosGuardados) {
                try {
                    const archivos = JSON.parse(archivosGuardados);
                    this.estado.archivos[cicloId] = archivos;
                    console.log('📂 Archivos recuperados del localStorage para ciclo:', cicloId);
                } catch (error) {
                    console.warn('⚠️ Error parseando archivos guardados:', error);
                }
            }

            // Actualizar estado de archivos cargados
            this.estado.archivosCargados = this.estado.archivos[cicloId] || {};
            
            console.log('✅ Estado de archivos actualizado para ciclo', cicloId);
            this.emitirCambioArchivos();
            
        } catch (error) {
            console.error('❌ Error actualizando estado de archivos:', error);
            // Inicializar con estado seguro si hay error
            if (!this.estado.archivos) {
                this.estado.archivos = {};
            }
            if (!this.estado.archivosCargados) {
                this.estado.archivosCargados = {};
            }
        }
    }

    /**
     * Guardar estado de archivos en localStorage
     */
    guardarEstadoArchivos(cicloId) {
        if (this.estado.archivos && this.estado.archivos[cicloId]) {
            localStorage.setItem(`archivos_ciclo_${cicloId}`, JSON.stringify(this.estado.archivos[cicloId]));
            console.log('💾 Estado de archivos guardado para ciclo:', cicloId);
        }
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
    marcarArchivoCargado(tipo, detalles, cicloId = null) {
        if (!this.estado.archivosCargados) {
            this.estado.archivosCargados = {};
        }
        
        const archivoInfo = {
            cargado: true,
            ...detalles,
            ultimaActualizacion: new Date().toISOString()
        };
        
        this.estado.archivosCargados[tipo] = archivoInfo;
        
        // También guardar en el ciclo específico si se proporciona
        if (cicloId) {
            if (!this.estado.archivos[cicloId]) {
                this.estado.archivos[cicloId] = {};
            }
            this.estado.archivos[cicloId][tipo] = archivoInfo;
            this.guardarEstadoArchivos(cicloId);
        }
        
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