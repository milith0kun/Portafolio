/**
 * VALIDACIONES PARA CARGA MASIVA - Optimizado
 * Sistema de validación para archivos Excel del sistema de carga masiva
 */

class ValidacionesCargaMasiva {
    /**
     * Constructor
     */
    constructor() {
        /**
         * Configuraciones por defecto
         */
        this.config = {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedExtensions: ['.xlsx', '.xls', '.csv'],
        allowedMimeTypes: [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv'
        ]
        }
        
        // Auto-inicializar
        this.inicializar();
    }

    /**
     * Inicializar sistema de validaciones
     */
    inicializar() {
        // Usar configuración global si está disponible
        if (window.CONFIG && window.CONFIG.UPLOAD) {
            this.config.maxFileSize = window.CONFIG.UPLOAD.MAX_FILE_SIZE || this.config.maxFileSize;
            this.config.allowedExtensions = window.CONFIG.UPLOAD.ALLOWED_EXTENSIONS || this.config.allowedExtensions;
            this.config.allowedMimeTypes = window.CONFIG.UPLOAD.ALLOWED_MIME_TYPES || this.config.allowedMimeTypes;
        }
        
        // ValidacionesCargaMasiva inicializado
    }

    /**
     * Validar archivo completo (tipo, tamaño, extensión)
     */
    validarArchivo(file) {
        if (!file) {
            this.mostrarError('No se ha seleccionado ningún archivo');
            return false;
        }

        // Validar tamaño
        if (!this.validarTamano(file)) {
            return false;
        }

        // Validar extensión
        if (!this.validarExtension(file)) {
            return false;
        }

        // Validar tipo MIME
        if (!this.validarTipoMime(file)) {
            // Si falla MIME pero la extensión es válida, permitir con advertencia
            if (this.validarExtension(file)) {
                // Tipo MIME no reconocido pero extensión válida
                return true;
            }
            return false;
        }

        return true;
    }

    /**
     * Validar tamaño del archivo
     */
    validarTamano(file) {
        if (file.size > this.config.maxFileSize) {
            const sizeMB = (this.config.maxFileSize / (1024 * 1024)).toFixed(1);
            this.mostrarError(`Archivo demasiado grande. Tamaño máximo: ${sizeMB}MB`);
            return false;
        }
        return true;
    }

    /**
     * Validar extensión del archivo
     */
    validarExtension(file) {
        const fileName = file.name.toLowerCase();
        const extension = fileName.substring(fileName.lastIndexOf('.'));
        
        if (!this.config.allowedExtensions.includes(extension)) {
            this.mostrarError(`Extensión no permitida: ${extension}. Solo se permiten: ${this.config.allowedExtensions.join(', ')}`);
            return false;
        }
        return true;
    }

    /**
     * Validar tipo MIME del archivo
     */
    validarTipoMime(file) {
        if (!this.config.allowedMimeTypes.includes(file.type)) {
            // Tipo MIME no reconocido
            return false;
        }
        return true;
    }

    /**
     * Validar múltiples archivos
     */
    validarArchivos(files) {
        if (!files || files.length === 0) {
            this.mostrarError('No se han seleccionado archivos');
            return false;
        }

        const resultados = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const valido = this.validarArchivo(file);
            
            resultados.push({
                archivo: file,
                valido: valido,
                nombre: file.name,
                tamano: file.size,
                tipo: file.type
            });
        }

        const validos = resultados.filter(r => r.valido);
        const invalidos = resultados.filter(r => !r.valido);

        if (invalidos.length > 0) {
            // archivos inválidos
        }

        return {
            validos: validos,
            invalidos: invalidos,
            todosValidos: invalidos.length === 0
        };
    }

    /**
     * Validar nombre de archivo para detección de tipo
     */
    detectarTipoArchivo(nombreArchivo) {
        const patrones = {
            usuarios: /01_usuarios|usuarios_masivos/i,
            carreras: /02_carreras|carreras_completas/i,
            asignaturas: /03_asignaturas|asignaturas_completas/i,
            carga_academica: /04_carga|carga_academica/i,
            verificaciones: /05_verificaciones/i,
            codigos_institucionales: /06_codigos|codigos_institucionales/i
        };

        for (const [tipo, patron] of Object.entries(patrones)) {
            if (patron.test(nombreArchivo)) {
                return tipo;
            }
        }

        return null;
    }

    /**
     * Validar estructura de datos (para cuando se implemente lectura de archivos)
     */
    validarEstructuraDatos(datos, tipoArchivo) {
        if (!datos || !Array.isArray(datos) || datos.length === 0) {
            this.mostrarError('El archivo no contiene datos válidos');
            return false;
        }

        // Validaciones básicas por tipo de archivo
        const validaciones = {
            usuarios: ['nombres', 'apellidos', 'correo'],
            carreras: ['codigo', 'nombre'],
            asignaturas: ['codigo', 'nombre', 'carrera'],
            carga_academica: ['docente_id', 'asignatura_codigo'],
            verificaciones: ['verificador_id', 'docente_id'],
            codigos_institucionales: ['codigo', 'descripcion']
        };

        const camposRequeridos = validaciones[tipoArchivo];
        if (!camposRequeridos) {
            // Tipo de archivo no reconocido para validación estructural
            return true; // Permitir si no hay validación específica
        }

        // Validar que el primer registro tenga los campos requeridos
        const primerRegistro = datos[0];
        const camposFaltantes = camposRequeridos.filter(campo => 
            !Object.prototype.hasOwnProperty.call(primerRegistro, campo)
        );

        if (camposFaltantes.length > 0) {
            this.mostrarError(`Campos faltantes en ${tipoArchivo}: ${camposFaltantes.join(', ')}`);
            return false;
        }

        return true;
    }

    /**
     * Manejar respuesta del servidor
     */
    async manejarRespuesta(response) {
        if (!response.ok) {
            const error = new Error(`Error ${response.status}: ${response.statusText}`);
            error.status = response.status;
            
            try {
                const errorData = await response.json();
                error.data = errorData;
                error.message = errorData.message || errorData.mensaje || error.message;
            } catch (e) {
                try {
                    const text = await response.text();
                    error.responseText = text;
                } catch (e2) {
                    // No se pudo leer la respuesta de error
                }
            }
            
            throw error;
        }

        try {
            return await response.json();
        } catch (error) {
            // Error al parsear respuesta JSON
            throw new Error('Respuesta del servidor no válida');
        }
    }

    /**
     * Mostrar mensajes de error
     */
    mostrarError(mensaje) {
        // Usar toastr si está disponible
        if (typeof toastr !== 'undefined') {
            toastr.error(mensaje);
        }
        // Usar APP global si está disponible
        else if (window.APP && typeof window.APP.mostrarNotificacion === 'function') {
            window.APP.mostrarNotificacion(mensaje, 'error');
        }
        // Fallback a console y alert
        else {
            // Validación error
            alert('Error: ' + mensaje);
        }
    }

    /**
     * Mostrar mensajes de éxito
     */
    mostrarExito(mensaje) {
        if (typeof toastr !== 'undefined') {
            toastr.success(mensaje);
        } else if (window.APP && typeof window.APP.mostrarNotificacion === 'function') {
            window.APP.mostrarNotificacion(mensaje, 'success');
        } else {
            // Validación éxito
        }
    }

    /**
     * Mostrar mensajes de advertencia
     */
    mostrarAdvertencia(mensaje) {
        if (typeof toastr !== 'undefined') {
            toastr.warning(mensaje);
        } else if (window.APP && typeof window.APP.mostrarNotificacion === 'function') {
            window.APP.mostrarNotificacion(mensaje, 'warning');
        } else {
            // Validación advertencia
        }
    }
}

// Exponer globalmente para compatibilidad
window.ValidacionesCargaMasiva = ValidacionesCargaMasiva;
