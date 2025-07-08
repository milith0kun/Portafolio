/**
 * Gestor de Archivos para Carga Masiva
 * Maneja la carga, validación y procesamiento de archivos
 */

class ArchivosManager {
    constructor() {
        this.archivosConfig = {
            usuarios: {
                required: true,
                uploaded: false,
                file: null,
                data: null,
                errors: [],
                processed: false
            },
            carreras: {
                required: true,
                uploaded: false,
                file: null,
                data: null,
                errors: [],
                processed: false
            },
            asignaturas: {
                required: true,
                uploaded: false,
                file: null,
                data: null,
                errors: [],
                processed: false
            },
            carga_academica: {
                required: true,
                uploaded: false,
                file: null,
                data: null,
                errors: [],
                processed: false
            },
            verificaciones: {
                required: false,
                uploaded: false,
                file: null,
                data: null,
                errors: [],
                processed: false
            },
            codigos_institucionales: {
                required: false,
                uploaded: false,
                file: null,
                data: null,
                errors: [],
                processed: false
            }
        };
        
        this.tiposArchivo = {
            'usuarios': ['usuarios', 'user', 'estudiantes', 'docentes'],
            'carreras': ['carreras', 'carrera', 'programas'],
            'asignaturas': ['asignaturas', 'asignatura', 'materias', 'materia'],
            'carga_academica': ['carga_academica', 'carga-academica', 'asignaciones'],
            'verificaciones': ['verificaciones', 'verificacion'],
            'codigos_institucionales': ['codigos_institucionales', 'codigos-institucionales', 'codigos']
        };
        
        this.callbacks = {
            onFileLoad: [],
            onFileProcess: [],
            onError: [],
            onProgress: [],
            onComplete: []
        };
        
        this.validacionesManager = null;
        this.logsManager = null;
    }

    /**
     * Inicializar el gestor de archivos
     */
    inicializar(validacionesManager, logsManager) {
        this.validacionesManager = validacionesManager;
        this.logsManager = logsManager;
        
        // Configurar eventos de drag & drop
        this.configurarDragAndDrop();
        
        // Configurar inputs de archivo
        this.configurarInputsArchivo();
        
        return true;
    }

    /**
     * Configurar drag and drop
     */
    configurarDragAndDrop() {
        const uploadAreas = document.querySelectorAll('.upload-area');
        
        uploadAreas.forEach(area => {
            // Prevenir comportamiento por defecto
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, this.preventDefaults, false);
            });
            
            // Resaltar área al arrastrar
            ['dragenter', 'dragover'].forEach(eventName => {
                area.addEventListener(eventName, () => this.highlight(area), false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                area.addEventListener(eventName, () => this.unhighlight(area), false);
            });
            
            // Manejar drop
            area.addEventListener('drop', (e) => this.handleDrop(e, area), false);
        });
    }

    /**
     * Configurar inputs de archivo
     */
    configurarInputsArchivo() {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        
        fileInputs.forEach(input => {
            input.addEventListener('change', (e) => this.handleFileSelect(e), false);
        });
    }

    /**
     * Prevenir comportamiento por defecto
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Resaltar área de drop
     */
    highlight(area) {
        area.classList.add('drag-over');
    }

    /**
     * Quitar resaltado del área
     */
    unhighlight(area) {
        area.classList.remove('drag-over');
    }

    /**
     * Manejar drop de archivos
     */
    handleDrop(e, area) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        this.procesarArchivos(files, area);
    }

    /**
     * Manejar selección de archivos
     */
    handleFileSelect(e) {
        const files = e.target.files;
        const area = e.target.closest('.upload-area');
        
        this.procesarArchivos(files, area);
    }

    /**
     * Procesar archivos seleccionados
     */
    async procesarArchivos(files, area = null) {
        if (!files || files.length === 0) return;
        
        for (let i = 0; i < files.length; i++) {
            await this.procesarArchivo(files[i], area);
        }
    }

    /**
     * Procesar un archivo individual
     */
    async procesarArchivo(file, area = null) {
        try {
            // Validar archivo
            const validacion = await this.validarArchivo(file);
            if (!validacion.valido) {
                this.logsManager.mostrarError(`Error en ${file.name}: ${validacion.errores.join(', ')}`);
                return false;
            }
            
            // Detectar tipo de archivo
            const tipo = this.detectarTipoArchivo(file.name);
            if (!tipo) {
                this.logsManager.mostrarError(`No se pudo detectar el tipo de archivo: ${file.name}`);
                return false;
            }
            
            // Leer contenido del archivo
            const contenido = await this.leerArchivo(file);
            
            // Guardar información del archivo
            this.archivosConfig[tipo] = {
                ...this.archivosConfig[tipo],
                uploaded: true,
                file: file,
                data: contenido,
                errors: [],
                processed: false
            };
            
            // Actualizar interfaz
            this.actualizarInterfazArchivo(tipo, file);
            
            // Log de éxito
            this.logsManager.mostrarExito(`Archivo ${file.name} cargado correctamente como ${tipo}`);
            
            // Emitir evento
            this.emitirFileLoad(tipo, file, contenido);
            
            return true;
            
        } catch (error) {
            this.logsManager.mostrarError(`Error al procesar archivo ${file.name}: ${error.message}`);
            return false;
        }
    }

    /**
     * Validar archivo
     */
    async validarArchivo(file) {
        if (!this.validacionesManager) {
            return { valido: true, errores: [] };
        }
        
        return await this.validacionesManager.validarArchivo(file);
    }

    /**
     * Detectar tipo de archivo basándose en el nombre
     */
    detectarTipoArchivo(nombreArchivo) {
        const nombreLower = nombreArchivo.toLowerCase();
        
        for (const [tipo, palabrasClave] of Object.entries(this.tiposArchivo)) {
            for (const palabra of palabrasClave) {
                if (nombreLower.includes(palabra)) {
                    return tipo;
                }
            }
        }
        
        return null;
    }

    /**
     * Leer contenido del archivo
     */
    leerArchivo(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Actualizar interfaz para mostrar archivo cargado
     */
    actualizarInterfazArchivo(tipo, file) {
        // Buscar contenedor del tipo de archivo
        const container = document.querySelector(`[data-file-type="${tipo}"]`) || 
                         document.querySelector(`#${tipo}-container`) ||
                         document.querySelector(`.${tipo}-upload`);
        
        if (container) {
            // Actualizar texto o crear indicador
            let indicator = container.querySelector('.file-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'file-indicator';
                container.appendChild(indicator);
            }
            
            indicator.innerHTML = `
                <div class="d-flex align-items-center justify-content-between">
                    <div>
                        <i class="fas fa-file-excel text-success me-2"></i>
                        <span class="fw-bold">${file.name}</span>
                        <small class="text-muted ms-2">(${this.formatearTamano(file.size)})</small>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="archivosManager.removerArchivo('${tipo}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            // Agregar clase de éxito
            container.classList.add('file-loaded');
        }
        
        // Actualizar contador de archivos
        this.actualizarContadorArchivos();
    }

    /**
     * Remover archivo
     */
    removerArchivo(tipo) {
        if (this.archivosConfig[tipo]) {
            this.archivosConfig[tipo] = {
                ...this.archivosConfig[tipo],
                uploaded: false,
                file: null,
                data: null,
                errors: [],
                processed: false
            };
            
            // Actualizar interfaz
            const container = document.querySelector(`[data-file-type="${tipo}"]`) || 
                             document.querySelector(`#${tipo}-container`) ||
                             document.querySelector(`.${tipo}-upload`);
            
            if (container) {
                const indicator = container.querySelector('.file-indicator');
                if (indicator) {
                    indicator.remove();
                }
                container.classList.remove('file-loaded');
            }
            
            // Actualizar contador
            this.actualizarContadorArchivos();
            
            // Log
            this.logsManager.mostrarInfo(`Archivo ${tipo} removido`);
        }
    }

    /**
     * Actualizar contador de archivos cargados
     */
    actualizarContadorArchivos() {
        const cargados = this.obtenerArchivosCargados().length;
        const requeridos = this.obtenerArchivosRequeridos().length;
        const total = Object.keys(this.archivosConfig).length;
        
        // Actualizar indicadores en la interfaz
        const contadores = document.querySelectorAll('.files-counter');
        contadores.forEach(contador => {
            contador.textContent = `${cargados}/${total} archivos cargados (${requeridos} requeridos)`;
        });
        
        // Actualizar progreso
        const progreso = (cargados / total) * 100;
        this.actualizarProgresoArchivos(progreso);
    }

    /**
     * Actualizar progreso de carga de archivos
     */
    actualizarProgresoArchivos(porcentaje) {
        const progressBars = document.querySelectorAll('.files-progress');
        progressBars.forEach(bar => {
            bar.style.width = `${porcentaje}%`;
            bar.setAttribute('aria-valuenow', porcentaje);
            bar.textContent = `${Math.round(porcentaje)}%`;
        });
    }

    /**
     * Formatear tamaño de archivo
     */
    formatearTamano(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Obtener archivos cargados
     */
    obtenerArchivosCargados() {
        return Object.entries(this.archivosConfig)
            .filter(([tipo, config]) => config.uploaded)
            .map(([tipo, config]) => ({ tipo, ...config }));
    }

    /**
     * Obtener archivos requeridos
     */
    obtenerArchivosRequeridos() {
        return Object.entries(this.archivosConfig)
            .filter(([tipo, config]) => config.required)
            .map(([tipo, config]) => ({ tipo, ...config }));
    }

    /**
     * Obtener archivos opcionales
     */
    obtenerArchivosOpcionales() {
        return Object.entries(this.archivosConfig)
            .filter(([tipo, config]) => !config.required)
            .map(([tipo, config]) => ({ tipo, ...config }));
    }

    /**
     * Verificar si todos los archivos requeridos están cargados
     */
    verificarArchivosRequeridos() {
        const requeridos = this.obtenerArchivosRequeridos();
        const cargados = requeridos.filter(archivo => archivo.uploaded);
        
        return {
            completo: cargados.length === requeridos.length,
            cargados: cargados.length,
            requeridos: requeridos.length,
            faltantes: requeridos.filter(archivo => !archivo.uploaded)
        };
    }

    /**
     * Obtener progreso de carga
     */
    obtenerProgreso() {
        const total = Object.keys(this.archivosConfig).length;
        const cargados = this.obtenerArchivosCargados().length;
        
        return {
            porcentaje: total > 0 ? (cargados / total) * 100 : 0,
            cargados,
            total
        };
    }

    /**
     * Limpiar todos los archivos
     */
    limpiarArchivos() {
        Object.keys(this.archivosConfig).forEach(tipo => {
            this.removerArchivo(tipo);
        });
        
        this.logsManager.mostrarInfo('Todos los archivos han sido removidos');
    }

    /**
     * Obtener configuración de archivos
     */
    obtenerConfiguracion() {
        return { ...this.archivosConfig };
    }

    /**
     * Actualizar configuración de un archivo
     */
    actualizarConfiguracion(tipo, config) {
        if (this.archivosConfig[tipo]) {
            this.archivosConfig[tipo] = {
                ...this.archivosConfig[tipo],
                ...config
            };
        }
    }

    /**
     * Marcar archivo como procesado
     */
    marcarProcesado(tipo, errores = []) {
        if (this.archivosConfig[tipo]) {
            this.archivosConfig[tipo].processed = true;
            this.archivosConfig[tipo].errors = errores;
            
            // Emitir evento
            this.emitirFileProcess(tipo, errores);
        }
    }

    /**
     * Descargar plantilla de archivo
     */
    async descargarPlantilla(tipo) {
        try {
            // Aquí se podría implementar la descarga de plantillas
            // Por ahora, mostrar mensaje informativo
            this.logsManager.mostrarInfo(`Descargando plantilla para ${tipo}...`);
            
            // Simular descarga (implementar según necesidades)
            const url = `/api/plantillas/${tipo}.xlsx`;
            const a = document.createElement('a');
            a.href = url;
            a.download = `plantilla_${tipo}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
        } catch (error) {
            this.logsManager.mostrarError(`Error al descargar plantilla de ${tipo}: ${error.message}`);
        }
    }

    /**
     * Configurar callbacks
     */
    onFileLoad(callback) {
        this.callbacks.onFileLoad.push(callback);
    }

    onFileProcess(callback) {
        this.callbacks.onFileProcess.push(callback);
    }

    onError(callback) {
        this.callbacks.onError.push(callback);
    }

    onProgress(callback) {
        this.callbacks.onProgress.push(callback);
    }

    onComplete(callback) {
        this.callbacks.onComplete.push(callback);
    }

    /**
     * Emitir eventos
     */
    emitirFileLoad(tipo, file, contenido) {
        this.callbacks.onFileLoad.forEach(callback => {
            try {
                callback(tipo, file, contenido);
            } catch (error) {
                console.error('Error en callback de file load:', error);
            }
        });
    }

    emitirFileProcess(tipo, errores) {
        this.callbacks.onFileProcess.forEach(callback => {
            try {
                callback(tipo, errores);
            } catch (error) {
                console.error('Error en callback de file process:', error);
            }
        });
    }

    emitirError(mensaje, error) {
        this.callbacks.onError.forEach(callback => {
            try {
                callback(mensaje, error);
            } catch (err) {
                console.error('Error en callback de error:', err);
            }
        });
    }

    emitirProgress(progreso) {
        this.callbacks.onProgress.forEach(callback => {
            try {
                callback(progreso);
            } catch (error) {
                console.error('Error en callback de progress:', error);
            }
        });
    }

    emitirComplete() {
        this.callbacks.onComplete.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error en callback de complete:', error);
            }
        });
    }
}

// Exportar para uso en otros módulos
window.ArchivosManager = ArchivosManager;