/**
 * TABLERO ADMIN - MÓDULO DATA
 * Manejo de datos y operaciones con API
 */

// ================================================
// ESTADO GLOBAL DE DATOS
// ================================================

const dataState = {
    estadoSistema: null,
    metricas: null,
    cicloActual: null,
    actividadesRecientes: [],
    ciclosDisponibles: [],
    cargando: false,
    ultimaActualizacion: null,
    servidorOffline: false
};

// ================================================
// INICIALIZACIÓN DEL MÓDULO
// ================================================

async function initialize() {
    try {
        // Inicializar ciclo desde el selector si existe
        setTimeout(() => {
            inicializarCicloDesdeSelector();
        }, 500);
        
        await cargarDatosIniciales();
        configurarActualizacionAutomatica();
        configurarIntegracionCiclos();
        
        // Configurar carga de portafolios
        configurarCargaPortafolios();
        
    } catch (error) {
        // Solo mostrar error si no es un problema de conexión
        if (!error.message?.includes('Failed to fetch')) {
            // Error en inicialización de datos
        }
        throw error;
    }
}

/**
 * Inicializar el ciclo seleccionado desde el selector al cargar la página
 */
function inicializarCicloDesdeSelector() {
    const selector = document.querySelector('#selectCiclo');
    if (selector && selector.value && selector.value !== '') {
        // Establecer como ciclo seleccionado
        localStorage.setItem('cicloSeleccionado', selector.value);
        
        // Forzar actualización de la interfaz
        setTimeout(() => {
            if (window.UITablero?.actualizarInterfaz) {
                window.UITablero.actualizarInterfaz();
            }
        }, 200);
    } else {
        // Solo mostrar warning si no es un problema de servidor offline
        if (!dataState.servidorOffline) {
            // No se encontró selector de ciclo con valor
        }
    }
}

// ================================================
// CARGA DE DATOS PRINCIPALES
// ================================================

/**
 * Cargar todos los datos iniciales del dashboard
 */
async function cargarDatosIniciales() {
    // Evitar cargas múltiples simultáneas
    if (dataState.cargando) {
        return;
    }
    
    // Verificar autenticación antes de hacer peticiones
    if (!window.AUTH?.verificarAutenticacion()) {
        return;
    }
    
    dataState.cargando = true;
    
    try {
        const config = window.TableroCore?.obtenerConfigDashboard?.() || {};
        const endpoints = config.apiEndpoints || {};
        
        // Cargar datos en paralelo para mejor rendimiento
        const [estadoSistema, metricas, cicloActual, actividades, ciclos] = await Promise.allSettled([
            cargarEstadoSistema(endpoints.estadoSistema),
            cargarMetricas(endpoints.metricas),
            cargarCicloActual(endpoints.cicloActual),
            cargarActividadesRecientes(endpoints.actividades),
            cargarCiclosDisponibles(endpoints.ciclosDisponibles)
        ]);
        
        // Procesar resultados
        procesarResultados({
            estadoSistema,
            metricas,
            cicloActual,
            actividades,
            ciclos
        });
        
        // Cargar portafolios del ciclo después de cargar los datos principales
        await cargarPortafoliosDelCiclo();
        
        dataState.ultimaActualizacion = new Date();
        
    } catch (error) {
        // Solo mostrar error si no es un problema de conexión o autenticación
        if (!error.message?.includes('Failed to fetch') && error.status !== 401) {
            // Error cargando datos iniciales
        }
        throw error;
    } finally {
        dataState.cargando = false;
    }
}

/**
 * Procesar resultados de las promesas
 */
function procesarResultados(resultados) {
    // Estado del sistema
    if (resultados.estadoSistema.status === 'fulfilled') {
        dataState.estadoSistema = resultados.estadoSistema.value;
    } else {
        // Solo mostrar error si no es un problema de conexión
        if (!resultados.estadoSistema.reason?.message?.includes('Failed to fetch')) {
            // Error cargando estado del sistema
        }
    }
    
    // Métricas
    if (resultados.metricas.status === 'fulfilled') {
        dataState.metricas = resultados.metricas.value;
    } else {
        // Solo mostrar error si no es un problema de conexión
        if (!resultados.metricas.reason?.message?.includes('Failed to fetch')) {
            // Error cargando métricas
        }
    }
    
    // Ciclo actual
    if (resultados.cicloActual.status === 'fulfilled') {
        dataState.cicloActual = resultados.cicloActual.value;
    } else {
        // Solo mostrar error si no es un problema de conexión
        if (!resultados.cicloActual.reason?.message?.includes('Failed to fetch')) {
            // Error cargando ciclo actual
        }
    }
    
    // Actividades recientes
    if (resultados.actividades.status === 'fulfilled') {
        dataState.actividadesRecientes = resultados.actividades.value || [];
    } else {
        // Solo mostrar error si no es un problema de conexión
        if (!resultados.actividades.reason?.message?.includes('Failed to fetch')) {
            // Error cargando actividades
        }
    }
    
    // Ciclos disponibles
    if (resultados.ciclos.status === 'fulfilled') {
        dataState.ciclosDisponibles = resultados.ciclos.value || [];
        
        // Establecer ciclo activo si no hay uno seleccionado
        if (!obtenerCicloSeleccionado() && dataState.ciclosDisponibles.length > 0) {
            const cicloActivo = dataState.ciclosDisponibles.find(c => c.estado === 'activo');
            if (cicloActivo) {
                // Estableciendo ciclo activo automáticamente
                localStorage.setItem('cicloSeleccionado', cicloActivo.id);
                dataState.cicloActual = cicloActivo;
            }
        }
    } else {
        // Solo mostrar error si no es un problema de conexión
        if (!resultados.ciclos.reason?.message?.includes('Failed to fetch')) {
            // Error cargando ciclos disponibles
        }
    }
}

// ================================================
// FUNCIONES DE CARGA ESPECÍFICAS
// ================================================

/**
 * Cargar estado del sistema
 */
async function cargarEstadoSistema(endpoint) {
    if (!endpoint) return { activo: true, mensaje: 'Sistema operativo' };
    
    try {
        const response = await window.apiRequest(`${CONFIG.API.ENDPOINTS.DASHBOARD}/estadisticas`, 'GET');
        return response.data || { activo: true, mensaje: 'Sistema operativo' };
    } catch (error) {
        // Solo mostrar warning si no es un error de red común
        if (!error.message?.includes('Failed to fetch') && !error.message?.includes('NetworkError')) {
            // Error obteniendo estado del sistema
        }
        return { activo: true, mensaje: 'Estado no disponible' };
    }
}

/**
 * Cargar métricas del dashboard
 * Ahora con soporte para ciclo académico
 */
async function cargarMetricas(endpoint) {
    if (!endpoint) return obtenerMetricasPorDefecto();
    
    try {
        // Obtener ciclo seleccionado
        const cicloSeleccionado = obtenerCicloSeleccionado();
        
        // Construir URL con parámetros de ciclo
        let url = `${CONFIG.API.ENDPOINTS.DASHBOARD}/estadisticas`;
        if (cicloSeleccionado) {
            url += `?ciclo=${cicloSeleccionado}`;
        }
        
        // Usar el endpoint unificado para estadísticas
        const response = await window.apiRequest(url, 'GET');
        
        // Procesar la respuesta estructurada del backend
        if (response && (response.success || response.data)) {
            const data = response.data || response;
            
            // Extraer métricas según la estructura del backend
            const metricas = {
                usuarios: data.usuarios?.total || data.usuarios?.activos || 0,
                carreras: data.carreras?.total || data.carreras?.activas || 0,
                asignaturas: data.asignaturas?.total || data.asignaturas?.activas || 0,
                asignaciones: data.asignaciones?.total || data.asignaciones?.activas || 0,
                verificaciones: data.verificaciones?.total || 0,
                portafolios: data.portafolios?.total || data.portafolios?.activos || 0,
                timestamp: data.timestamp || new Date().toISOString(),
                ciclo: data.ciclo || cicloSeleccionado,
                sistema: data.sistema || null
            };
            
            return metricas;
        }
        
        return obtenerMetricasPorDefecto();
    } catch (error) {
        // Solo mostrar warning si no es un error de red común
        if (!error.message?.includes('Failed to fetch') && !error.message?.includes('NetworkError')) {
            // Error obteniendo métricas
        }
        return obtenerMetricasPorDefecto();
    }
}

/**
 * Cargar ciclo académico actual
 */
async function cargarCicloActual(endpoint) {
    if (!endpoint) return null;
    
    try {
        const response = await window.apiRequest(`${CONFIG.API.ENDPOINTS.CICLOS}/activo`, 'GET');
        return response.data || null;
    } catch (error) {
        // Solo mostrar warning si no es un error de red común
        if (!error.message?.includes('Failed to fetch') && !error.message?.includes('NetworkError')) {
            // Error obteniendo ciclo actual
        }
        return null;
    }
}

/**
 * Cargar actividades recientes
 */
async function cargarActividadesRecientes(endpoint) {
    if (!endpoint) return [];
    
    try {
        const response = await window.apiRequest(`${CONFIG.API.ENDPOINTS.DASHBOARD}/actividades`, 'GET');
        return response.data || [];
    } catch (error) {
        // Solo mostrar warning si no es un error de red común
        if (!error.message?.includes('Failed to fetch') && !error.message?.includes('NetworkError')) {
            // Error obteniendo actividades recientes
        }
        return [];
    }
}

/**
 * Cargar ciclos disponibles
 */
async function cargarCiclosDisponibles(endpoint) {
    if (!endpoint) return [];
    
    try {
        const response = await window.apiRequest(`${CONFIG.API.ENDPOINTS.CICLOS}`, 'GET');
        return response.data || [];
    } catch (error) {
        // Solo mostrar warning si no es un error de red común
        if (!error.message?.includes('Failed to fetch') && !error.message?.includes('NetworkError')) {
            // Error obteniendo ciclos disponibles
        }
        return [];
    }
}

// ================================================
// VALORES POR DEFECTO
// ================================================

function obtenerMetricasPorDefecto() {
    return {
        usuarios: 0,
        carreras: 0,
        asignaturas: 0,
        asignaciones: 0,
        verificaciones: 0,
        portafolios: 0,
        timestamp: new Date().toISOString()
    };
}

// ================================================
// ACTUALIZACIÓN AUTOMÁTICA
// ================================================

let intervaloActualizacion = null;

/**
 * Configurar actualización automática de datos
 */
function configurarActualizacionAutomatica() {
    // Actualizar cada 5 minutos
    const INTERVALO_ACTUALIZACION = 5 * 60 * 1000;
    
    if (intervaloActualizacion) {
        clearInterval(intervaloActualizacion);
    }
    
    intervaloActualizacion = setInterval(async () => {
        // Solo actualizar si no hay errores de conexión previos
        if (!dataState.servidorOffline) {
            try {
                await cargarDatosIniciales();
                if (window.UITablero?.actualizarInterfaz) {
                    window.UITablero.actualizarInterfaz();
                }
                // Marcar servidor como online si la actualización fue exitosa
                dataState.servidorOffline = false;
                    } catch (error) {
            // Marcar servidor como offline tras error
            dataState.servidorOffline = true;
            // Solo mostrar mensaje si no es un error de conexión común
            if (!error.message?.includes('Failed to fetch')) {
                // Servidor no disponible, pausando actualizaciones automáticas
            }
        }
        }
    }, INTERVALO_ACTUALIZACION * 2); // Duplicar intervalo a 60s
}

/**
 * Detener actualización automática
 */
function detenerActualizacionAutomatica() {
    if (intervaloActualizacion) {
        clearInterval(intervaloActualizacion);
        intervaloActualizacion = null;
    }
}

// ================================================
// GETTERS PÚBLICOS
// ================================================

function obtenerEstadoSistema() {
    return dataState.estadoSistema;
}

function obtenerMetricas() {
    return dataState.metricas;
}

function obtenerCicloActual() {
    return dataState.cicloActual;
}

function obtenerActividadesRecientes() {
    return dataState.actividadesRecientes;
}

function obtenerCiclosDisponibles() {
    return dataState.ciclosDisponibles;
}

function estaCargando() {
    return dataState.cargando;
}

function obtenerUltimaActualizacion() {
    return dataState.ultimaActualizacion;
}

// ================================================
// FUNCIONES DE ACTUALIZACIÓN MANUAL
// ================================================

/**
 * Actualizar datos manualmente
 */
async function actualizarDatos() {
    await cargarDatosIniciales();
    
    // Notificar a la UI
    if (window.UITablero?.actualizarInterfaz) {
        window.UITablero.actualizarInterfaz();
    }
}

/**
 * Limpiar caché de datos
 */
function limpiarCache() {
    dataState.estadoSistema = null;
    dataState.metricas = null;
    dataState.cicloActual = null;
    dataState.actividadesRecientes = [];
    dataState.ciclosDisponibles = [];
    dataState.ultimaActualizacion = null;
}

/**
 * Limpiar caché completo del sistema (localStorage, sessionStorage y estado)
 */
function limpiarCacheCompleto() {
    // Limpiar estado interno
    limpiarCache();
    
    // Limpiar almacenamiento local
    try {
        localStorage.removeItem('cicloSeleccionado');
        localStorage.removeItem('portafolio_docente_token');
        localStorage.removeItem('temp_token');
        localStorage.removeItem('temp_usuario');
        
        sessionStorage.removeItem('cicloSeleccionado');
        sessionStorage.removeItem('portafolio_docente_token');
        
    } catch (error) {
        // Error limpiando almacenamiento
    }
    
    // Limpiar caché de window.DataTablero si existe
    if (window.DataTablero) {
        window.DataTablero = {
            ...window.DataTablero,
            estadoSistema: null,
            metricas: null,
            cicloActual: null,
            actividadesRecientes: [],
            ciclosDisponibles: []
        };
    }
}

/**
 * Forzar sincronización completa de datos
 */
async function forzarSincronizacion() {
    try {
        // Limpiar caché completo
        limpiarCacheCompleto();
        
        // Esperar un momento para asegurar limpieza
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Recargar datos desde cero
        await cargarDatosIniciales();
        
        // Actualizar interfaz
        if (window.UITablero?.actualizarInterfaz) {
            window.UITablero.actualizarInterfaz();
        }
        
        // Emitir evento de sincronización completa
        const evento = new CustomEvent('sincronizacion-completa', {
            detail: { timestamp: new Date().toISOString() }
        });
        document.dispatchEvent(evento);
        
        // Mostrar notificación al usuario
        if (window.mostrarNotificacion) {
            window.mostrarNotificacion('Datos sincronizados correctamente', 'success');
        }
        
    } catch (error) {
        if (window.mostrarNotificacion) {
            window.mostrarNotificacion('Error al sincronizar datos', 'error');
        }
        
        throw error;
    }
}

// ================================================
// GESTIÓN DE CICLO SELECCIONADO
// ================================================

/**
 * Obtener ciclo seleccionado desde el selector en la página
 */
function obtenerCicloSeleccionado() {
    // Intentar obtener desde diferentes selectores posibles
    const selectores = [
        '#selectCiclo',
        '#selectorCiclo select',
        'select[name="ciclo"]',
        '#cicloAcademico'
    ];
    
    for (const selector of selectores) {
        const elemento = document.querySelector(selector);
        if (elemento) {
            if (elemento.value && elemento.value !== '') {
                // Guardar en almacenamiento para consistencia
                localStorage.setItem('cicloSeleccionado', elemento.value);
                return elemento.value;
            }
        }
    }
    
    // Fallback: obtener desde almacenamiento local o sesión
    const cicloAlmacenado = localStorage.getItem('cicloSeleccionado') || sessionStorage.getItem('cicloSeleccionado');
    if (cicloAlmacenado) {
        return cicloAlmacenado;
    }
    
    // Último fallback: obtener el ciclo activo desde el estado
    const cicloActivo = dataState.cicloActual;
    if (cicloActivo && cicloActivo.id) {
        return cicloActivo.id;
    }
    return null;
}

/**
 * Establecer ciclo seleccionado y actualizar datos
 */
async function establecerCicloSeleccionado(cicloId) {
    
    // Guardar en almacenamiento
    if (cicloId) {
        localStorage.setItem('cicloSeleccionado', cicloId);
        sessionStorage.setItem('cicloSeleccionado', cicloId);
    } else {
        localStorage.removeItem('cicloSeleccionado');
        sessionStorage.removeItem('cicloSeleccionado');
    }
    
    // Actualizar estado interno
    dataState.cicloActual = dataState.ciclosDisponibles.find(c => c.id == cicloId) || null;
    
    // Recargar datos con el nuevo ciclo
    await actualizarDatos();
    
    // Emitir evento personalizado para que otros módulos puedan reaccionar
    const evento = new CustomEvent('cicloSeleccionado', {
        detail: { cicloId, ciclo: dataState.cicloActual }
    });
    document.dispatchEvent(evento);
}

// ================================================
// INTEGRACIÓN CON SISTEMAS EXTERNOS
// ================================================

/**
 * Configurar integración con el sistema de sincronización de ciclos
 */
function configurarIntegracionCiclos() {
    // Escuchar cambios de ciclo del sistema de sincronización
    document.addEventListener('ciclo-cambiado', async (event) => {
        const { ciclo } = event.detail;
        
        if (ciclo && ciclo.id) {
            // Actualizar datos con el nuevo ciclo
            await actualizarDatos();
            // También actualizar portafolios
            await cargarPortafoliosDelCiclo();
        }
    });
}

/**
 * Configurar carga de portafolios
 */
function configurarCargaPortafolios() {
    // Cargar portafolios iniciales
    cargarPortafoliosDelCiclo();
    
    // Escuchar eventos de portafolios generados
    document.addEventListener('portafolios-generados', async (event) => {
        await cargarPortafoliosDelCiclo();
    });
}

/**
 * Cargar portafolios del ciclo actual
 */
async function cargarPortafoliosDelCiclo() {
    try {
        const cicloSeleccionado = obtenerCicloSeleccionado();
        if (!cicloSeleccionado) {
            return;
        }
        
        // Usar el sistema de generación de portafolios si está disponible
        if (window.GeneracionPortafolios && typeof window.GeneracionPortafolios.cargarPortafoliosExistentes === 'function') {
            await window.GeneracionPortafolios.cargarPortafoliosExistentes();
        } else {
            // Fallback: cargar directamente desde la API
            await cargarPortafoliosDirectamente(cicloSeleccionado);
        }
        
    } catch (error) {
        // Error cargando portafolios del ciclo
    }
}

/**
 * Cargar portafolios directamente desde la API
 */
async function cargarPortafoliosDirectamente(cicloId) {
    try {
        const response = await window.apiRequest(`${CONFIG.API.ENDPOINTS.PORTAFOLIOS}?ciclo=${cicloId}`, 'GET');
        
        if (response.success && response.data) {
            const portafolios = Array.isArray(response.data) ? response.data : [];
            
            // Actualizar estadísticas en la interfaz
            actualizarEstadisticasPortafolios(portafolios);
        }
        
    } catch (error) {
        // Error en carga directa de portafolios
    }
}

/**
 * Actualizar estadísticas de portafolios en la interfaz
 */
function actualizarEstadisticasPortafolios(portafolios) {
    if (!Array.isArray(portafolios)) return;
    
    const estadisticas = {
        total: portafolios.length,
        activos: portafolios.filter(p => p.estado === 'activo' || p.estado === 'aprobado').length,
        completados: portafolios.filter(p => p.estado === 'completado' || p.estado === 'aprobado').length,
        pendientes: portafolios.filter(p => p.estado === 'pendiente').length,
        enVerificacion: portafolios.filter(p => p.estado === 'en_revision' || p.estado === 'verificacion').length
    };
    
    // Calcular progreso promedio
    const progresoPromedio = portafolios.length > 0 
        ? Math.round(portafolios.reduce((sum, p) => sum + (p.progreso || 0), 0) / portafolios.length)
        : 0;
    
    // Actualizar elementos en la interfaz
    const actualizarElemento = (id, valor) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    };
    
    actualizarElemento('totalPortafolios', estadisticas.total);
    actualizarElemento('activePortafolios', estadisticas.activos);
    actualizarElemento('completedPortafolios', estadisticas.completados);
    actualizarElemento('averageProgress', `${progresoPromedio}%`);
    actualizarElemento('inVerificationPortafolios', estadisticas.enVerificacion);
}

// ================================================
// EXPORTACIÓN DEL MÓDULO
// ================================================

window.DataTablero = {
    // Inicialización
    initialize,
    
    // Getters
    obtenerEstadoSistema,
    obtenerMetricas,
    obtenerCicloActual,
    obtenerActividadesRecientes,
    obtenerCiclosDisponibles,
    estaCargando,
    obtenerUltimaActualizacion,
    
    // Gestión de ciclo
    obtenerCicloSeleccionado,
    establecerCicloSeleccionado,
    
    // Acciones
    actualizarDatos,
    limpiarCache,
    limpiarCacheCompleto,
    forzarSincronizacion,
    
    // Control de actualización
    configurarActualizacionAutomatica,
    detenerActualizacionAutomatica
};

// Módulo Data del Tablero cargado