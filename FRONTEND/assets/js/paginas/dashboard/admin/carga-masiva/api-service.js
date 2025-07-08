/**
 * Servicios de API para la carga masiva
 * Maneja la comunicación con el backend para la inicialización del sistema
 * Usa configuraciones globales de window.CONFIG y funciones de APP
 */

// Estado global para el progreso de la inicialización
let estadoInicializacion = {
    enProgreso: false,
    progreso: 0,
    archivosProcesados: 0,
    totalArchivos: 6, // usuarios, carreras, asignaturas, carga_academica, verificaciones, codigos_institucionales
    errores: []
};

// Tipos de archivo soportados
const TIPOS_ARCHIVO = {
    USUARIOS: 'usuarios',
    CARRERAS: 'carreras',
    ASIGNATURAS: 'asignaturas',
    CARGA_ACADEMICA: 'carga_academica',
    VERIFICACIONES: 'verificaciones',
    CODIGOS_INSTITUCIONALES: 'codigos_institucionales'
};

// Mapeo de tipos de archivo a funciones de validación
const validadoresPorTipo = {
    [TIPOS_ARCHIVO.USUARIOS]: validarArchivoUsuarios,
    [TIPOS_ARCHIVO.CARRERAS]: validarArchivoCarreras,
    [TIPOS_ARCHIVO.ASIGNATURAS]: validarArchivoAsignaturas,
    [TIPOS_ARCHIVO.CARGA_ACADEMICA]: validarArchivoCargaAcademica,
    [TIPOS_ARCHIVO.VERIFICACIONES]: validarArchivoVerificaciones,
    [TIPOS_ARCHIVO.CODIGOS_INSTITUCIONALES]: validarArchivoCodigosInstitucionales
};

/**
 * Valida la estructura básica de un archivo usando configuración global
 * @param {File} file - Archivo a validar
 * @returns {Object} Resultado de la validación
 */
function validarArchivoBasico(file) {
    if (!file) {
        return { valido: false, error: 'No se ha seleccionado ningún archivo' };
    }
    
    // Validar extensión usando configuración global
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!window.CONFIG.UPLOAD.ALLOWED_EXTENSIONS.includes(extension)) {
        return { 
            valido: false, 
            error: `Extensión no permitida: ${extension}. Use ${window.CONFIG.UPLOAD.ALLOWED_EXTENSIONS.join(', ')}`
        };
    }
    
    // Validar tamaño usando configuración global
    if (file.size > window.CONFIG.UPLOAD.MAX_FILE_SIZE) {
        return { 
            valido: false, 
            error: `El archivo es demasiado grande (${(file.size / (1024 * 1024)).toFixed(2)}MB). Tamaño máximo: ${window.CONFIG.UPLOAD.MAX_FILE_SIZE / (1024 * 1024)}MB`
        };
    }
    
    return { valido: true };
}

/**
 * Valida archivo de usuarios
 * @param {File} file - Archivo a validar
 * @returns {Object} Resultado de la validación
 */
async function validarArchivoUsuarios(file) {
    const validacionBasica = validarArchivoBasico(file);
    if (!validacionBasica.valido) {
        return validacionBasica;
    }
    
    // Validaciones específicas para usuarios
    if (!file.name.toLowerCase().includes('usuario')) {
        return { valido: false, error: 'El archivo debe contener "usuario" en el nombre' };
    }
    
    return { valido: true };
}

/**
 * Valida archivo de carreras
 * @param {File} file - Archivo a validar
 * @returns {Object} Resultado de la validación
 */
async function validarArchivoCarreras(file) {
    const validacionBasica = validarArchivoBasico(file);
    if (!validacionBasica.valido) {
        return validacionBasica;
    }
    
    if (!file.name.toLowerCase().includes('carrera')) {
        return { valido: false, error: 'El archivo debe contener "carrera" en el nombre' };
    }
    
    return { valido: true };
}

/**
 * Valida archivo de asignaturas
 * @param {File} file - Archivo a validar
 * @returns {Object} Resultado de la validación
 */
async function validarArchivoAsignaturas(file) {
    const validacionBasica = validarArchivoBasico(file);
    if (!validacionBasica.valido) {
        return validacionBasica;
    }
    
    if (!file.name.toLowerCase().includes('asignatura')) {
        return { valido: false, error: 'El archivo debe contener "asignatura" en el nombre' };
    }
    
    return { valido: true };
}

/**
 * Valida archivo de carga académica
 * @param {File} file - Archivo a validar
 * @returns {Object} Resultado de la validación
 */
async function validarArchivoCargaAcademica(file) {
    const validacionBasica = validarArchivoBasico(file);
    if (!validacionBasica.valido) {
        return validacionBasica;
    }
    
    if (!file.name.toLowerCase().includes('carga')) {
        return { valido: false, error: 'El archivo debe contener "carga" en el nombre' };
    }
    
    return { valido: true };
}

/**
 * Valida archivo de verificaciones
 * @param {File} file - Archivo a validar
 * @returns {Object} Resultado de la validación
 */
async function validarArchivoVerificaciones(file) {
    const validacionBasica = validarArchivoBasico(file);
    if (!validacionBasica.valido) {
        return validacionBasica;
    }
    
    if (!file.name.toLowerCase().includes('verificacion')) {
        return { valido: false, error: 'El archivo debe contener "verificacion" en el nombre' };
    }
    
    return { valido: true };
}

/**
 * Valida archivo de códigos institucionales
 * @param {File} file - Archivo a validar
 * @returns {Object} Resultado de la validación
 */
async function validarArchivoCodigosInstitucionales(file) {
    const validacionBasica = validarArchivoBasico(file);
    if (!validacionBasica.valido) {
        return validacionBasica;
    }
    
    if (!file.name.toLowerCase().includes('codigo')) {
        return { valido: false, error: 'El archivo debe contener "codigo" en el nombre' };
    }
    
    return { valido: true };
}

/**
 * Carga los ciclos académicos disponibles usando APP global
 * @returns {Promise<Array>} Lista de ciclos académicos
 */
async function cargarCiclos() {
    try {
        const data = await APP.apiRequest(`${window.CONFIG.API.ENDPOINTS.CICLOS}`, 'GET');
        return data.ciclos || [];
    } catch (error) {
        // Error al cargar ciclos
        APP.mostrarNotificacion('Error al cargar ciclos académicos', 'error');
        return [];
    }
}

/**
 * Procesa la carga de usuarios usando APP global
 * @param {FormData} formData - Datos del formulario con el archivo
 * @returns {Promise<Object>} Resultado del procesamiento
 */
async function procesarCargaUsuarios(formData) {
    try {
        const response = await fetch(`${window.CONFIG.API.BASE_URL}${window.CONFIG.API.ENDPOINTS.INICIALIZACION}/usuarios`, {
            method: 'POST',
            headers: {
                ...AUTH.construirHeaders()
            },
            body: formData
        });
        
        const resultado = await response.json();
        
        if (!response.ok) {
            throw new Error(resultado.message || 'Error al procesar usuarios');
        }
        
        return resultado;
    } catch (error) {
        // Error en procesarCargaUsuarios
        throw error;
    }
}

/**
 * Procesa la carga de asignaturas usando APP global
 * @param {FormData} formData - Datos del formulario con el archivo
 * @returns {Promise<Object>} Resultado del procesamiento
 */
async function procesarCargaAsignaturas(formData) {
    try {
        const response = await fetch(`${window.CONFIG.API.BASE_URL}${window.CONFIG.API.ENDPOINTS.INICIALIZACION}/asignaturas`, {
            method: 'POST',
            headers: {
                ...AUTH.construirHeaders()
            },
            body: formData
        });
        
        const resultado = await response.json();
        
        if (!response.ok) {
            throw new Error(resultado.message || 'Error al procesar asignaturas');
        }
        
        return resultado;
    } catch (error) {
        // Error en procesarCargaAsignaturas
        throw error;
    }
}

/**
 * Procesa la carga de asignaciones usando APP global
 * @param {FormData} formData - Datos del formulario con el archivo
 * @returns {Promise<Object>} Resultado del procesamiento
 */
async function procesarCargaAsignaciones(formData) {
    try {
        const response = await fetch(`${window.CONFIG.API.BASE_URL}${window.CONFIG.API.ENDPOINTS.INICIALIZACION}/asignaciones`, {
            method: 'POST',
            headers: {
                ...AUTH.construirHeaders()
            },
            body: formData
        });
        
        const resultado = await response.json();
        
        if (!response.ok) {
            throw new Error(resultado.message || 'Error al procesar asignaciones');
        }
        
        return resultado;
    } catch (error) {
        // Error en procesarCargaAsignaciones
        throw error;
    }
}

/**
 * Inicializa el sistema completo con múltiples archivos usando configuración global
 * @param {FileList} files - Lista de archivos a procesar
 * @param {string} descripcion - Descripción de la inicialización
 * @returns {Promise<Object>} Resultado de la inicialización
 */
async function inicializarSistema(files, descripcion = '') {
    // Verificar que las configuraciones globales estén disponibles
    if (!window.CONFIG || !window.CONFIG.API) {
        throw new Error('Configuraciones globales no disponibles');
    }

    // Verificar autenticación
    if (!AUTH.estaAutenticado()) {
        throw new Error('Usuario no autenticado');
    }

    // Reiniciar estado
    estadoInicializacion = {
        enProgreso: true,
        progreso: 0,
        archivosProcesados: 0,
        totalArchivos: files.length,
        errores: []
    };

    actualizarInterfazProgreso(0, 'Iniciando validación de archivos...');

    try {
        // Crear FormData para enviar los archivos
        const formData = new FormData();
        const archivosValidos = [];

        // Validar cada archivo
        for (const file of Array.from(files)) {
            // Determinar el tipo de archivo basado en el nombre
            let tipoArchivo = null;
            
            if (file.name.toLowerCase().includes('usuario')) tipoArchivo = TIPOS_ARCHIVO.USUARIOS;
            else if (file.name.toLowerCase().includes('carrera')) tipoArchivo = TIPOS_ARCHIVO.CARRERAS;
            else if (file.name.toLowerCase().includes('asignatura')) tipoArchivo = TIPOS_ARCHIVO.ASIGNATURAS;
            else if (file.name.toLowerCase().includes('carga')) tipoArchivo = TIPOS_ARCHIVO.CARGA_ACADEMICA;
            else if (file.name.toLowerCase().includes('verificacion')) tipoArchivo = TIPOS_ARCHIVO.VERIFICACIONES;
            else if (file.name.toLowerCase().includes('codigo')) tipoArchivo = TIPOS_ARCHIVO.CODIGOS_INSTITUCIONALES;
            
            if (!tipoArchivo) {
                throw new Error(`No se pudo determinar el tipo del archivo: ${file.name}`);
            }
            
            // Validar el archivo
            const validador = validadoresPorTipo[tipoArchivo];
            if (!validador) {
                throw new Error(`No se encontró un validador para el tipo de archivo: ${tipoArchivo}`);
            }
            
            const validacion = await validador(file);
            if (!validacion.valido) {
                throw new Error(`Error en el archivo ${file.name}: ${validacion.error}`);
            }
            
            // Agregar archivo al FormData
            formData.append('files', file);
            archivosValidos.push({
                nombre: file.name,
                tipo: tipoArchivo,
                tamano: file.size
            });
            
            // Actualizar progreso
            estadoInicializacion.archivosProcesados++;
            const progresoValidacion = (estadoInicializacion.archivosProcesados / estadoInicializacion.totalArchivos) * 30;
            actualizarInterfazProgreso(progresoValidacion, `Validando archivo: ${file.name}`);
        }
        
        // Agregar descripción si se proporciona
        if (descripcion) {
            formData.append('descripcion', descripcion);
        }
        
        actualizarInterfazProgreso(35, 'Enviando archivos al servidor...');

        // Enviar archivos al servidor usando configuración global
        const response = await fetch(`${window.CONFIG.API.BASE_URL}${window.CONFIG.API.ENDPOINTS.INICIALIZACION}/sistema-completo`, {
            method: 'POST',
            headers: {
                ...AUTH.construirHeaders()
            },
            body: formData
        });
        
        actualizarInterfazProgreso(70, 'Procesando datos en el servidor...');

        const resultado = await response.json();
        
        if (!response.ok) {
            throw new Error(resultado.message || 'Error en la inicialización del sistema');
        }
        
        actualizarInterfazProgreso(100, 'Inicialización completada exitosamente');
        
        // Marcar como completado
        estadoInicializacion.enProgreso = false;
        estadoInicializacion.progreso = 100;

        // Guardar resultados en sessionStorage para verificación posterior
        if (window.CONFIG.STORAGE) {
            sessionStorage.setItem(window.CONFIG.STORAGE.INICIALIZACION, JSON.stringify({
                timestamp: new Date().toISOString(),
                resultados: resultado,
                archivos: archivosValidos
            }));
        }
        
        return {
            success: true,
            mensaje: 'Sistema inicializado correctamente',
            resultados: resultado,
            archivosValidos
        };
        
    } catch (error) {
        // Error en inicializarSistema
        
        // Actualizar estado de error
        estadoInicializacion.enProgreso = false;
        estadoInicializacion.errores.push(error.message);
        
        actualizarInterfazProgreso(0, `Error: ${error.message}`, true);
        
        throw error;
    }
}

/**
 * Actualiza la interfaz de progreso
 * @param {number} porcentaje - Porcentaje de progreso (0-100)
 * @param {string} mensaje - Mensaje a mostrar
 * @param {boolean} esError - Indica si es un mensaje de error
 */
function actualizarInterfazProgreso(porcentaje, mensaje, esError = false) {
    // Actualizar barra de progreso si existe
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = `${porcentaje}%`;
        progressBar.setAttribute('aria-valuenow', porcentaje);
        
        if (esError) {
            progressBar.classList.add('bg-danger');
        } else {
            progressBar.classList.remove('bg-danger');
        }
    }
    
    // Actualizar texto de progreso si existe
    const progressText = document.querySelector('.progress-text');
    if (progressText) {
        progressText.textContent = mensaje;
        
    if (esError) {
            progressText.classList.add('text-danger');
    } else {
            progressText.classList.remove('text-danger');
    }
    }
    
    // [Progreso] mensaje
}

/**
 * Obtiene el estado actual de la inicialización
 * @returns {Object} Estado de la inicialización
 */
function obtenerEstadoInicializacion() {
    return { ...estadoInicializacion };
}

/**
 * Descarga una plantilla de archivo específica usando configuración global
 * @param {string} tipo - Tipo de plantilla (usuarios, carreras, asignaturas, etc.)
 * @returns {Promise<void>}
 */
async function descargarPlantilla(tipo) {
    try {
        const url = `${window.CONFIG.API.BASE_URL}${window.CONFIG.API.ENDPOINTS.INICIALIZACION}/plantilla/${tipo}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${APP.obtenerToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error al descargar plantilla: ${response.statusText}`);
        }
        
        // Obtener el blob del archivo
        const blob = await response.blob();
        
        // Crear URL temporal para descarga
        const urlTemporal = window.URL.createObjectURL(blob);
            
        // Crear elemento de descarga
        const link = document.createElement('a');
        link.href = urlTemporal;
        
        // Determinar nombre del archivo
        const contentDisposition = response.headers.get('Content-Disposition');
        let fileName = `plantilla_${tipo}.xlsx`;
        
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
            if (fileNameMatch) {
                fileName = fileNameMatch[1];
            }
        }
        
        // Función auxiliar para limpiar nombres de archivo
        const cleanFileName = (fileName) => {
            return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        };
        
        link.download = cleanFileName(fileName);
                            
        // Agregar al DOM, hacer clic y remover
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiar URL temporal
        window.URL.revokeObjectURL(urlTemporal);
        
        APP.mostrarNotificacion(`Plantilla ${tipo} descargada exitosamente`, 'exito');
        
    } catch (error) {
        // Error al descargar plantilla
        APP.mostrarNotificacion(`Error al descargar plantilla: ${error.message}`, 'error');
        throw error;
    }
}

// Clase ApiService para exponer las funciones
class ApiService {
    static cargarCiclos = cargarCiclos;
    static procesarCargaUsuarios = procesarCargaUsuarios;
    static procesarCargaAsignaturas = procesarCargaAsignaturas;
    static procesarCargaAsignaciones = procesarCargaAsignaciones;
    static inicializarSistema = inicializarSistema;
    static obtenerEstadoInicializacion = obtenerEstadoInicializacion;
    static descargarPlantilla = descargarPlantilla;
    static TIPOS_ARCHIVO = TIPOS_ARCHIVO;
    static estadoInicializacion = estadoInicializacion;
}

// Hacer disponible globalmente
window.ApiService = ApiService;
