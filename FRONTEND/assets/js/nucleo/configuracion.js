/**
 * Configuración global del sistema
 * Contiene constantes y configuraciones utilizadas en toda la aplicación
 */

// Función para calcular rutas relativas basadas en la ubicación actual
function calcularRutaBase() {
    const pathname = window.location.pathname;
    const depth = (pathname.match(/\//g) || []).length - 1;
    
    if (pathname === '/' || pathname === '/index.html' || pathname.endsWith('/')) {
        return './';
    }
    
    // Contar niveles de profundidad para calcular rutas relativas
    return '../'.repeat(depth);
}

// Definir la configuración global
window.CONFIG = {
    // Configuración de la API
    API: {
        BASE_URL: 'http://localhost:4000/api',
        TIMEOUT: 30000, // 30 segundos
        RETRY_ATTEMPTS: 3,
        ENDPOINTS: {
            AUTH: '/auth',
            USUARIOS: '/usuarios',
            ASIGNATURAS: '/asignaturas',
            CARRERAS: '/carreras',
            CICLOS: '/ciclos',
            DASHBOARD: '/dashboard',
            REPORTES: '/reportes',
            INICIALIZACION: '/inicializacion',
            ACTIVIDADES: '/actividades',
            PORTAFOLIOS: '/portafolios',
            DOCUMENTOS: '/documentos',
            VERIFICACIONES: '/verificaciones',
            NOTIFICACIONES: '/notificaciones',
            OBSERVACIONES: '/observaciones',
            ARCHIVOS: '/archivos'
        }
    },
    
    // Rutas del frontend - función para obtener rutas dinámicamente
    getRoute: function(routeName) {
        const base = calcularRutaBase();
        const routes = {
            LOGIN: 'paginas/autenticacion/login.html',
            DASHBOARD_ADMIN: 'paginas/dashboard/admin/tablero.html',
            DASHBOARD_DOCENTE: 'paginas/dashboard/docente/tablero.html',
            DASHBOARD_VERIFICADOR: 'paginas/dashboard/verificador/tablero.html',
            SELECTOR_ROLES: 'paginas/autenticacion/selector-roles.html',
            CARGA_MASIVA: 'paginas/dashboard/admin/carga-masiva.html',
            USUARIOS: 'paginas/dashboard/admin/usuarios.html',
            USUARIOS_ADMIN: 'paginas/dashboard/admin/usuarios.html',
            CICLOS: 'paginas/dashboard/admin/ciclos.html',
            REPORTES: 'paginas/dashboard/admin/reportes.html',
            REPORTES_ADMIN: 'paginas/dashboard/admin/reportes.html',
            ASIGNATURAS: 'paginas/dashboard/admin/asignaturas.html',
            ASIGNATURAS_ADMIN: 'paginas/dashboard/admin/asignaturas.html',
            PORTAFOLIOS: 'paginas/dashboard/admin/portafolios.html',
            PORTAFOLIOS_ADMIN: 'paginas/dashboard/admin/portafolios.html',
            VERIFICAR_DATOS: 'paginas/dashboard/admin/verificar-datos.html',
            INDEX: 'index.html'
        };
        return base + routes[routeName];
    },
    
    // Rutas estáticas para compatibilidad (desde la raíz)
    ROUTES: {
        LOGIN: './paginas/autenticacion/login.html',
        DASHBOARD_ADMIN: './paginas/dashboard/admin/tablero.html',
        DASHBOARD_DOCENTE: './paginas/dashboard/docente/tablero.html',
        DASHBOARD_VERIFICADOR: './paginas/dashboard/verificador/tablero.html',
        SELECTOR_ROLES: './paginas/autenticacion/selector-roles.html',
        CARGA_MASIVA: './paginas/dashboard/admin/carga-masiva.html',
        USUARIOS: './paginas/dashboard/admin/usuarios.html',
        USUARIOS_ADMIN: './paginas/dashboard/admin/usuarios.html',
        CICLOS: './paginas/dashboard/admin/ciclos.html',
        REPORTES: './paginas/dashboard/admin/reportes.html',
        REPORTES_ADMIN: './paginas/dashboard/admin/reportes.html',
        ASIGNATURAS: './paginas/dashboard/admin/asignaturas.html',
        ASIGNATURAS_ADMIN: './paginas/dashboard/admin/asignaturas.html',
        PORTAFOLIOS: './paginas/dashboard/admin/portafolios.html',
        PORTAFOLIOS_ADMIN: './paginas/dashboard/admin/portafolios.html',
        VERIFICAR_DATOS: './paginas/dashboard/admin/verificar-datos.html',
        INDEX: './index.html'
    },
    
    // Claves para almacenamiento local
    STORAGE: {
        TOKEN: 'portafolio_docente_token',
        USER: 'portafolio_docente_user',
        PREFERENCES: 'portafolio_docente_preferences',
        SESSION_KEY: 'session_active',
        CICLO_ACTIVO: 'ciclo_academico_activo',
        ESTADO_SISTEMA: 'estado_sistema_actual'
    },
    
    // Configuración de carga de archivos
    UPLOAD: {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        MAX_FILES: 6, // Máximo número de archivos simultáneos
        ALLOWED_EXTENSIONS: ['.xlsx', '.xls', '.csv'],
        ALLOWED_MIME_TYPES: [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream',
            'text/csv'
        ]
    },
    
    // Configuración de notificaciones
    NOTIFICATIONS: {
        POSITION: 'toast-top-right',
        DURATION: 5000,
        TOASTR: {
            closeButton: true,
            progressBar: true,
            positionClass: "toast-top-right",
            timeOut: 5000
        }
    },
    
    // Configuración de Dropzone para carga masiva
    DROPZONE: {
        maxFilesize: 10, // MB
        acceptedFiles: '.xlsx,.xls,.csv',
        addRemoveLinks: true,
        dictDefaultMessage: 'Arrastre archivos aquí o haga clic para seleccionar',
        dictFallbackMessage: 'Su navegador no soporta la carga de archivos por arrastre',
        dictFileTooBig: 'El archivo es demasiado grande ({{filesize}}MB). Tamaño máximo: {{maxFilesize}}MB',
        dictInvalidFileType: 'Tipo de archivo no válido. Solo se permiten archivos Excel (.xlsx, .xls) y CSV (.csv)',
        dictResponseError: 'Error {{statusCode}}: {{errorMessage}}',
        dictCancelUpload: 'Cancelar',
        dictUploadCanceled: 'Carga cancelada',
        dictRemoveFile: 'Eliminar',
        dictMaxFilesExceeded: 'No se pueden cargar más archivos',
        timeout: 30000
    },
    
    // Tipos de archivo para carga masiva
    FILE_TYPES: {
        USUARIOS: 'usuarios',
        CICLOS: 'ciclos',
        CARRERAS: 'carreras',
        ASIGNATURAS: 'asignaturas',
        CARGA_ACADEMICA: 'carga_academica',
        VERIFICACIONES: 'verificaciones',
        CODIGOS_INSTITUCIONALES: 'codigos_institucionales'
    },
    
    // Configuración específica de archivos esperados para carga masiva
    ARCHIVOS_ESPERADOS: {
        usuarios: {
            nombres: ['01_usuarios_masivos', 'usuarios_masivos', 'usuarios'],
            descripcion: 'Lista de usuarios del sistema (docentes, verificadores, administradores)',
            requerido: true,
            columnas: ['nombres', 'apellidos', 'correo', 'telefono', 'rol_principal']
        },
        carreras: {
            nombres: ['02_carreras_completas', 'carreras_completas', 'carreras'],
            descripcion: 'Catálogo de carreras y programas académicos',
            requerido: true,
            columnas: ['codigo', 'nombre', 'facultad', 'duracion_semestres', 'grado_academico']
        },
        asignaturas: {
            nombres: ['03_asignaturas_completas', 'asignaturas_completas', 'asignaturas'],
            descripcion: 'Catálogo de asignaturas por carrera',
            requerido: true,
            columnas: ['codigo', 'nombre', 'carrera', 'semestre', 'creditos', 'ciclo_academico']
        },
        carga_academica: {
            nombres: ['04_carga_academica', 'carga_academica', 'carga'],
            descripcion: 'Asignaciones docente-asignatura por ciclo',
            requerido: false,
            columnas: ['docente_id', 'asignatura_codigo', 'ciclo_academico', 'grupo', 'aula']
        },
        verificaciones: {
            nombres: ['05_verificaciones', 'verificaciones'],
            descripcion: 'Relaciones verificador-docente',
            requerido: false,
            columnas: ['verificador_id', 'docente_id', 'ciclo_academico', 'estado']
        },
        codigos_institucionales: {
            nombres: ['06_codigos_institucionales', 'codigos_institucionales', 'codigos'],
            descripcion: 'Códigos y documentos institucionales',
            requerido: false,
            columnas: ['codigo', 'descripcion', 'tipo', 'estado']
        }
    },
    
    // Configuración de roles del sistema
    ROLES: {
        ADMINISTRADOR: 'administrador',
        DOCENTE: 'docente',
        VERIFICADOR: 'verificador'
    },
    
    // Estados del sistema
    ESTADOS_SISTEMA: {
        CONFIGURACION: 'configuracion',
        CARGA_DATOS: 'carga_datos',
        SUBIDA_ACTIVA: 'subida_activa',
        VERIFICACION: 'verificacion',
        FINALIZADO: 'finalizado'
    },

    // Estados de ciclos académicos
    ESTADOS_CICLOS: {
        PREPARACION: 'preparacion',
        INICIALIZACION: 'inicializacion',
        ACTIVO: 'activo',
        VERIFICACION: 'verificacion',
        FINALIZACION: 'finalizacion',
        ARCHIVADO: 'archivado'
    },

    // Transiciones válidas entre estados de ciclos
    TRANSICIONES_CICLOS: {
        'preparacion': ['inicializacion'],
        'inicializacion': ['activo', 'preparacion'],
        'activo': ['verificacion', 'preparacion'],
        'verificacion': ['finalizacion', 'activo'],
        'finalizacion': ['archivado'],
        'archivado': ['preparacion']
    },

    // Configuración de estados de ciclos
    CONFIGURACION_ESTADOS_CICLOS: {
        preparacion: {
            descripcion: 'Configuración inicial del ciclo académico',
            color: 'warning',
            icono: 'fas fa-cog',
            acciones: ['inicializar', 'editar', 'eliminar']
        },
        inicializacion: {
            descripcion: 'Proceso de inicialización en curso',
            color: 'info',
            icono: 'fas fa-play-circle',
            acciones: ['activar', 'volver_preparacion']
        },
        activo: {
            descripcion: 'Ciclo en funcionamiento normal',
            color: 'success',
            icono: 'fas fa-check-circle',
            acciones: ['iniciar_verificacion', 'volver_preparacion']
        },
        verificacion: {
            descripcion: 'Proceso de verificación y validación',
            color: 'primary',
            icono: 'fas fa-search',
            acciones: ['finalizar', 'volver_activo']
        },
        finalizacion: {
            descripcion: 'Ciclo finalizado y cerrado',
            color: 'secondary',
            icono: 'fas fa-flag-checkered',
            acciones: ['archivar']
        },
        archivado: {
            descripcion: 'Ciclo archivado',
            color: 'dark',
            icono: 'fas fa-archive',
            acciones: ['reactivar']
        }
    },
    
    // Gestión de ciclos académicos
    CICLOS: {
        // Obtener ciclo activo desde localStorage
        obtenerCicloActivo: function() {
            try {
                const cicloGuardado = localStorage.getItem(window.CONFIG.STORAGE.CICLO_ACTIVO);
                if (!cicloGuardado || cicloGuardado === 'undefined' || cicloGuardado === 'null') {
                    return null;
                }
                return JSON.parse(cicloGuardado);
            } catch (error) {
                console.error('Error al obtener ciclo activo:', error);
                return null;
            }
        },
        
        // Establecer ciclo activo
        establecerCicloActivo: function(ciclo) {
            try {
                localStorage.setItem(window.CONFIG.STORAGE.CICLO_ACTIVO, JSON.stringify(ciclo));
                // Disparar evento de cambio de ciclo
                window.dispatchEvent(new CustomEvent('cicloChanged', { detail: ciclo }));
                console.log('✅ Ciclo activo establecido:', ciclo.nombre);
                return true;
            } catch (error) {
                console.error('Error al establecer ciclo activo:', error);
                return false;
            }
        },
        
        // Limpiar datos de ciclo anterior
        limpiarDatosCicloAnterior: function() {
            // Limpiar actividades recientes
            localStorage.removeItem('actividades_recientes');
            // Limpiar estadísticas temporales
            localStorage.removeItem('estadisticas_temporales');
            // Limpiar notificaciones del ciclo anterior
            localStorage.removeItem('notificaciones_ciclo');
            console.log('🧹 Datos del ciclo anterior limpiados');
        }
    },
    
    // Estados del sistema
    SISTEMA: {
        // Obtener estado actual del sistema
        obtenerEstadoActual: function() {
            try {
                const estadoGuardado = localStorage.getItem(window.CONFIG.STORAGE.ESTADO_SISTEMA);
                return estadoGuardado || 'configuracion';
            } catch (error) {
                console.error('Error al obtener estado del sistema:', error);
                return 'configuracion';
            }
        },
        
        // Establecer estado del sistema
        establecerEstado: function(estado) {
            try {
                localStorage.setItem(window.CONFIG.STORAGE.ESTADO_SISTEMA, estado);
                // Disparar evento de cambio de estado
                window.dispatchEvent(new CustomEvent('estadoSistemaChanged', { detail: estado }));
                console.log('✅ Estado del sistema actualizado:', estado);
                return true;
            } catch (error) {
                console.error('Error al establecer estado del sistema:', error);
                return false;
            }
        },
        
        // Verificar si se pueden mostrar datos
        puedenMostrarDatos: function() {
            const estado = this.obtenerEstadoActual();
            const ciclo = window.CONFIG.CICLOS.obtenerCicloActivo();
            
            // Solo mostrar datos si hay un ciclo activo y el estado permite visualización
            return ciclo && ['subida_activa', 'verificacion', 'finalizado'].includes(estado);
        }
    }
};

console.log('✅ Configuración global cargada correctamente');
