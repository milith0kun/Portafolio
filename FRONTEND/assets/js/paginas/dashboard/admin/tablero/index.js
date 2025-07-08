/**
 * TABLERO ADMIN - COORDINADOR PRINCIPAL
 * Punto de entrada que coordina todos los módulos
 */

// ================================================
// INFORMACIÓN DEL SISTEMA MODULAR
// ================================================

// Sistema Tablero Admin v2.0.0

// ================================================
// ESTADO DE INICIALIZACIÓN
// ================================================

const sistemaTablero = {
    modulos: {
        core: false,
        data: false,
        ui: false,
        eventos: false
    },
    inicializado: false,
    inicializando: false,
    errores: []
};

// ================================================
// INICIALIZACIÓN PRINCIPAL
// ================================================

/**
 * Función principal de inicialización del sistema
 */
async function inicializarSistemaTablero() {
    if (sistemaTablero.inicializando || sistemaTablero.inicializado) {
        return; // Sistema ya inicializado
    }
    
    sistemaTablero.inicializando = true;
    // Iniciando sistema modular del tablero
    
    try {
        // 1. Verificar disponibilidad de módulos
        await verificarModulosDisponibles();
        
        // 2. Inicializar módulos en orden de dependencia
        await inicializarModulos();
        
        // 3. Verificar inicialización completa
        verificarInicializacionCompleta();
        
        // 4. Configurar sincronización de ciclos
        configurarSincronizacionCiclos();
        
        // 5. Configurar manejo de errores global
        configurarManejoErrores();
        
        sistemaTablero.inicializado = true;
        // Sistema tablero inicializado
        
        // 6. Emitir evento de sistema listo
        emitirEventoSistemaListo();
        
    } catch (error) {
        sistemaTablero.errores.push(error);
        mostrarErrorFatal(error);
    } finally {
        sistemaTablero.inicializando = false;
    }
}

// ================================================
// VERIFICACIÓN DE MÓDULOS
// ================================================

async function verificarModulosDisponibles() {
    const modulos = [
        { nombre: 'TableroCore', archivo: 'core.js' },
        { nombre: 'DataTablero', archivo: 'data.js' },
        { nombre: 'UITablero', archivo: 'ui.js' },
        { nombre: 'EventosTablero', archivo: 'eventos.js' }
    ];
    
    const modulosFaltantes = [];
    
    modulos.forEach(modulo => {
        if (!window[modulo.nombre]) {
            modulosFaltantes.push(modulo);
        }
    });
    
    if (modulosFaltantes.length > 0) {
        throw new Error(`Módulos faltantes: ${modulosFaltantes.map(m => m.nombre).join(', ')}`);
    }
}

// ================================================
// INICIALIZACIÓN DE MÓDULOS
// ================================================

async function inicializarModulos() {
    // Orden de inicialización basado en dependencias
    const ordenInicializacion = [
        { nombre: 'core', modulo: window.TableroCore, descripcion: 'Core del sistema' },
        { nombre: 'data', modulo: window.DataTablero, descripcion: 'Manejo de datos' },
        { nombre: 'ui', modulo: window.UITablero, descripcion: 'Interfaz de usuario' },
        { nombre: 'eventos', modulo: window.EventosTablero, descripcion: 'Eventos del sistema' }
    ];
    
    for (const { nombre, modulo, descripcion } of ordenInicializacion) {
        try {
            if (modulo && typeof modulo.initialize === 'function') {
                await modulo.initialize();
                sistemaTablero.modulos[nombre] = true;
            } else {
                sistemaTablero.modulos[nombre] = 'sin-initialize';
            }
            
        } catch (error) {
            sistemaTablero.errores.push({ modulo: nombre, error });
            
            // Continuar con otros módulos en caso de error no crítico
            if (nombre === 'core') {
                throw error; // Core es crítico
            }
        }
    }

    // Inicializar sistemas de gestión adicionales
    await inicializarSistemasGestion();
}

// ================================================
// INICIALIZACIÓN DE SISTEMAS DE GESTIÓN
// ================================================

async function inicializarSistemasGestion() {
    try {
        // Inicializar sistema de sincronización de ciclos
        if (window.SincronizacionCiclos && typeof window.SincronizacionCiclos.inicializar === 'function') {
            await window.SincronizacionCiclos.inicializar();
            sistemaTablero.modulos.sincronizacionCiclos = true;
        } else {
            sistemaTablero.modulos.sincronizacionCiclos = false;
        }
        
        // Inicializar sistema de generación de portafolios
        if (window.GeneracionPortafolios && typeof window.GeneracionPortafolios.inicializar === 'function') {
            await window.GeneracionPortafolios.inicializar();
            sistemaTablero.modulos.generacionPortafolios = true;
        } else {
            sistemaTablero.modulos.generacionPortafolios = false;
        }
        
    } catch (error) {
        sistemaTablero.errores.push({ modulo: 'sistemas-gestion', error });
    }
}

// ================================================
// VERIFICACIONES POST-INICIALIZACIÓN
// ================================================

function verificarInicializacionCompleta() {
    const estadoModulos = Object.entries(sistemaTablero.modulos)
        .map(([nombre, estado]) => ({ nombre, estado }));
    
    const modulosExitosos = estadoModulos.filter(m => m.estado === true).length;
    const totalModulos = estadoModulos.length;
    
    if (modulosExitosos === 0) {
        throw new Error('Ningún módulo se inicializó correctamente');
    }
}

// ================================================
// MANEJO DE ERRORES GLOBAL
// ================================================

function configurarManejoErrores() {
    // Manejar errores no capturados del sistema
    window.addEventListener('error', (event) => {
        if (event.filename?.includes('tablero/')) {
            // Error en módulo del tablero
            
            sistemaTablero.errores.push({
                tipo: 'runtime',
                evento: event,
                timestamp: Date.now()
            });
        }
    });
    
    // Manejar promesas rechazadas
    window.addEventListener('unhandledrejection', (event) => {
        // Promesa rechazada en sistema tablero
        
        sistemaTablero.errores.push({
            tipo: 'promise',
            razon: event.reason,
            timestamp: Date.now()
        });
    });
    
    // Manejo de errores global configurado
}

// ================================================
// EVENTOS DEL SISTEMA
// ================================================

function emitirEventoSistemaListo() {
    const evento = new CustomEvent('tablero:sistema-listo', {
        detail: {
            modulos: sistemaTablero.modulos,
            errores: sistemaTablero.errores,
            timestamp: Date.now()
        },
        bubbles: true
    });
    
    document.dispatchEvent(evento);
    // Evento sistema-listo emitido
}

// ================================================
// FUNCIONES DE UTILIDAD PÚBLICA
// ================================================

/**
 * Obtener estado actual del sistema
 */
function obtenerEstadoSistema() {
    return {
        ...sistemaTablero,
        version: '1.0.0',
        timestamp: Date.now()
    };
}

/**
 * Reinicializar sistema (para debugging)
 */
async function reinicializarSistema() {
    // Reinicializando sistema
    
    // Resetear estado
    Object.keys(sistemaTablero.modulos).forEach(key => {
        sistemaTablero.modulos[key] = false;
    });
    sistemaTablero.inicializado = false;
    sistemaTablero.errores = [];
    
    // Reinicializar
    await inicializarSistemaTablero();
}

/**
 * Verificar salud del sistema
 */
function verificarSaludSistema() {
    const modulosActivos = Object.values(sistemaTablero.modulos)
        .filter(estado => estado === true).length;
    
    const totalModulos = Object.keys(sistemaTablero.modulos).length;
    const porcentajeSalud = (modulosActivos / totalModulos) * 100;
    
    const salud = {
        porcentaje: porcentajeSalud,
        estado: porcentajeSalud === 100 ? 'excelente' : 
                porcentajeSalud >= 75 ? 'bueno' : 
                porcentajeSalud >= 50 ? 'regular' : 'crítico',
        modulos: sistemaTablero.modulos,
        errores: sistemaTablero.errores.length,
        inicializado: sistemaTablero.inicializado
    };
    
    // Estado de salud del sistema
    return salud;
}

// ================================================
// MANEJO DE ERRORES FATALES
// ================================================

function mostrarErrorFatal(error) {
    // ERROR FATAL DEL SISTEMA
    
    // Intentar mostrar error en la interfaz si está disponible
    if (window.UITablero?.mostrarErrorEnInterfaz) {
        window.UITablero.mostrarErrorEnInterfaz('Error fatal del sistema. Recarga la página.');
    } else {
        // Fallback: mostrar alerta
        setTimeout(() => {
            alert(`Error fatal del sistema: ${error.message}\n\nPor favor, recarga la página.`);
        }, 100);
    }
}

// ================================================
// CONFIGURACIÓN DE SINCRONIZACIÓN DE CICLOS
// ================================================

function configurarSincronizacionCiclos() {
    // Configurando sincronización de ciclos para tablero
    
    // Escuchar cambios de ciclo activo
    document.addEventListener('cicloActivoCambiado', (event) => {
        // Ciclo activo cambiado en tablero
        
        // Actualizar datos del tablero según el nuevo ciclo
        if (window.DataTablero && typeof window.DataTablero.actualizarDatosPorCiclo === 'function') {
            window.DataTablero.actualizarDatosPorCiclo(event.detail.cicloId);
        }
        
        // Actualizar interfaz del tablero
        if (window.UITablero && typeof window.UITablero.actualizarInterfazPorCiclo === 'function') {
            window.UITablero.actualizarInterfazPorCiclo(event.detail.cicloId);
        }
    });
    
    // Mantener compatibilidad con eventos legacy
    document.addEventListener('sincronizar-ciclo', (event) => {
        // Evento legacy sincronizar-ciclo recibido en tablero
        
        // Recargar datos del tablero
        if (window.DataTablero && typeof window.DataTablero.recargarDatos === 'function') {
            window.DataTablero.recargarDatos();
        }
    });
    
    document.addEventListener('ciclo-cambiado', (event) => {
        // Evento legacy ciclo-cambiado recibido en tablero
        
        // Actualizar tablero con el nuevo ciclo
        if (window.DataTablero && typeof window.DataTablero.actualizarDatosPorCiclo === 'function') {
            window.DataTablero.actualizarDatosPorCiclo(event.detail?.cicloId);
        }
    });
    
    // Sincronización de ciclos configurada para tablero
}

// ================================================
// FUNCIONES DE DEBUGGING
// ================================================

function habilitarModoDebug() {
    window.TABLERO_DEBUG = true;
    // Modo debug habilitado
    
    // Exponer funciones de debugging
    window.tableroDebug = {
        estado: obtenerEstadoSistema,
        reinicializar: reinicializarSistema,
        salud: verificarSaludSistema,
        errores: () => sistemaTablero.errores
    };
}

// ================================================
// INICIALIZACIÓN AUTOMÁTICA
// ================================================

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarSistemaTablero);
} else {
    // DOM ya está listo
    inicializarSistemaTablero();
}

// ================================================
// EXPORTACIÓN GLOBAL
// ================================================

window.SistemaTablero = {
    // Estado
    obtenerEstado: obtenerEstadoSistema,
    verificarSalud: verificarSaludSistema,
    
    // Control
    reinicializar: reinicializarSistema,
    habilitarDebug: habilitarModoDebug,
    
    // Información
    version: '1.0.0',
    autor: 'Sistema Portafolio Docente'
};

// Coordinador principal del tablero cargado