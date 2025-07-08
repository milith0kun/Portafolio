/**
 * USUARIOS ADMIN - COORDINADOR PRINCIPAL
 * Punto de entrada que coordina todos los módulos de usuarios
 */

// ================================================
// INFORMACIÓN DEL SISTEMA MODULAR
// ================================================

// Sistema gestión de usuarios modular

// ================================================
// ESTADO DE INICIALIZACIÓN
// ================================================

const sistemaUsuarios = {
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
async function inicializarSistemaUsuarios() {
    if (sistemaUsuarios.inicializando || sistemaUsuarios.inicializado) {
        // Sistema usuarios ya está inicializando o inicializado
        return;
    }
    
    sistemaUsuarios.inicializando = true;
    // Iniciando sistema modular de usuarios
    
    try {
        // 1. Verificar disponibilidad de módulos
        await verificarModulosDisponibles();
        
        // 2. Inicializar módulos en orden de dependencia
        await inicializarModulos();
        
        // 3. Cargar datos iniciales
        await cargarDatosIniciales();
        
        // 4. Configurar sincronización de ciclos
        configurarSincronizacionCiclos();
        
        // 5. Configurar manejo de errores global
        configurarManejoErrores();
        
        sistemaUsuarios.inicializado = true;
        // Sistema usuarios inicializado completamente
        
        // 6. Emitir evento de sistema listo
        emitirEventoSistemaListo();
        
    } catch (error) {
        // Error fatal en inicialización del sistema usuarios
        sistemaUsuarios.errores.push(error);
        mostrarErrorFatal(error);
    } finally {
        sistemaUsuarios.inicializando = false;
    }
}

// ================================================
// VERIFICACIÓN DE MÓDULOS
// ================================================

async function verificarModulosDisponibles() {
    const modulos = [
        { nombre: 'UsuariosCore', archivo: 'core.js' },
        { nombre: 'DataUsuarios', archivo: 'data.js' },
        { nombre: 'UIUsuarios', archivo: 'ui.js' },
        { nombre: 'EventosUsuarios', archivo: 'eventos.js' }
    ];
    
    const modulosFaltantes = [];
    
    modulos.forEach(modulo => {
        if (!window[modulo.nombre]) {
            modulosFaltantes.push(modulo);
        }
    });
    
    if (modulosFaltantes.length > 0) {
        throw new Error(`Módulos usuarios faltantes: ${modulosFaltantes.map(m => m.nombre).join(', ')}`);
    }
}

// ================================================
// INICIALIZACIÓN DE MÓDULOS
// ================================================

async function inicializarModulos() {
    // Orden de inicialización basado en dependencias
    const ordenInicializacion = [
        { nombre: 'core', modulo: window.UsuariosCore, descripcion: 'Core del sistema usuarios' },
        { nombre: 'data', modulo: window.DataUsuarios, descripcion: 'Manejo de datos usuarios' },
        { nombre: 'ui', modulo: window.UIUsuarios, descripcion: 'Interfaz de usuario' },
        { nombre: 'eventos', modulo: window.EventosUsuarios, descripcion: 'Eventos del sistema' }
    ];
    
    for (const { nombre, modulo, descripcion } of ordenInicializacion) {
        try {
            if (modulo && typeof modulo.initialize === 'function') {
                await modulo.initialize();
                sistemaUsuarios.modulos[nombre] = true;
            } else {
                sistemaUsuarios.modulos[nombre] = 'sin-initialize';
            }
            
        } catch (error) {
            sistemaUsuarios.errores.push({ modulo: nombre, error });
            
            // Core es crítico, otros módulos pueden fallar
            if (nombre === 'core') {
                throw error;
            }
        }
    }
}

// ================================================
// CARGA DE DATOS INICIALES
// ================================================

async function cargarDatosIniciales() {
    // Cargando datos iniciales de usuarios
    
    try {
        // Verificar que el módulo UI esté inicializado
        if (sistemaUsuarios.modulos.ui && window.UIUsuarios) {
            await window.UIUsuarios.actualizarTabla();
            // Tabla de usuarios cargada
        }
        
        // Cargar estadísticas si es necesario
        if (sistemaUsuarios.modulos.data && window.DataUsuarios) {
            const estadisticas = await window.DataUsuarios.obtenerEstadisticasUsuarios();
            // Estadísticas usuarios
        }
        
    } catch (error) {
        // Error cargando datos iniciales
        // No es crítico, continuar
    }
}

// ================================================
// SINCRONIZACIÓN DE CICLOS
// ================================================

function configurarSincronizacionCiclos() {
    // Configurando sincronización de ciclos para usuarios
    
    // Escuchar evento de cambio de ciclo activo
    document.addEventListener('cicloActivoCambiado', (event) => {
        // Ciclo activo cambiado en usuarios
        
        // Recargar datos de usuarios si es necesario
        if (sistemaUsuarios.modulos.ui && window.UIUsuarios) {
            window.UIUsuarios.actualizarTabla();
        }
    });
    
    // Mantener compatibilidad con eventos legacy
    document.addEventListener('sincronizar-ciclo', (event) => {
        // Sincronización de ciclo solicitada en usuarios
        
        if (sistemaUsuarios.modulos.ui && window.UIUsuarios) {
            window.UIUsuarios.actualizarTabla();
        }
    });
    
    document.addEventListener('ciclo-cambiado', (event) => {
        // Ciclo cambiado (legacy) en usuarios
        
        if (sistemaUsuarios.modulos.ui && window.UIUsuarios) {
            window.UIUsuarios.actualizarTabla();
        }
    });
    
    // Sincronización de ciclos configurada para usuarios
}

// ================================================
// MANEJO DE ERRORES GLOBAL
// ================================================

function configurarManejoErrores() {
    // Manejar errores no capturados del sistema usuarios
    window.addEventListener('error', (event) => {
        if (event.filename?.includes('usuarios/')) {
            // Error en módulo usuarios
            
            sistemaUsuarios.errores.push({
                tipo: 'runtime',
                evento: event,
                timestamp: Date.now()
            });
        }
    });
    
    // Manejo de errores usuarios configurado
}

// ================================================
// EVENTOS DEL SISTEMA
// ================================================

function emitirEventoSistemaListo() {
    const evento = new CustomEvent('usuarios:sistema-listo', {
        detail: {
            modulos: sistemaUsuarios.modulos,
            errores: sistemaUsuarios.errores,
            timestamp: Date.now()
        },
        bubbles: true
    });
    
    document.dispatchEvent(evento);
    // Evento usuarios:sistema-listo emitido
}

// ================================================
// FUNCIONES DE UTILIDAD PÚBLICA
// ================================================

/**
 * Obtener estado actual del sistema usuarios
 */
function obtenerEstadoSistema() {
    return {
        ...sistemaUsuarios,
        version: '1.0.0',
        timestamp: Date.now()
    };
}

/**
 * Reinicializar sistema usuarios (para debugging)
 */
async function reinicializarSistema() {
    // Reinicializando sistema usuarios
    
    // Resetear estado
    Object.keys(sistemaUsuarios.modulos).forEach(key => {
        sistemaUsuarios.modulos[key] = false;
    });
    sistemaUsuarios.inicializado = false;
    sistemaUsuarios.errores = [];
    
    // Reinicializar
    await inicializarSistemaUsuarios();
}

/**
 * Verificar salud del sistema usuarios
 */
function verificarSaludSistema() {
    const modulosActivos = Object.values(sistemaUsuarios.modulos)
        .filter(estado => estado === true).length;
    
    const totalModulos = Object.keys(sistemaUsuarios.modulos).length;
    const porcentajeSalud = (modulosActivos / totalModulos) * 100;
    
    const salud = {
        porcentaje: porcentajeSalud,
        estado: porcentajeSalud === 100 ? 'excelente' : 
                porcentajeSalud >= 75 ? 'bueno' : 
                porcentajeSalud >= 50 ? 'regular' : 'crítico',
        modulos: sistemaUsuarios.modulos,
        errores: sistemaUsuarios.errores.length,
        inicializado: sistemaUsuarios.inicializado
    };
    
    // Estado de salud sistema usuarios
    return salud;
}

// ================================================
// MANEJO DE ERRORES FATALES
// ================================================

function mostrarErrorFatal(error) {
    // ERROR FATAL SISTEMA USUARIOS
    
    // Intentar mostrar error en la interfaz si está disponible
    if (window.UIUsuarios?.mostrarError) {
        window.UIUsuarios.mostrarError('Error fatal del sistema de usuarios. Recarga la página.');
    } else {
        setTimeout(() => {
            alert(`Error fatal del sistema de usuarios: ${error.message}\n\nPor favor, recarga la página.`);
        }, 100);
    }
}

// ================================================
// FUNCIONES DE DEBUGGING
// ================================================

function habilitarModoDebug() {
    window.USUARIOS_DEBUG = true;
    // Modo debug usuarios habilitado
    
    // Exponer funciones de debugging
    window.usuariosDebug = {
        estado: obtenerEstadoSistema,
        reinicializar: reinicializarSistema,
        salud: verificarSaludSistema,
        errores: () => sistemaUsuarios.errores,
        recargarTabla: () => window.UIUsuarios?.actualizarTabla(),
        abrirNuevo: () => window.EventosUsuarios?.abrirModalNuevo()
    };
}

// ================================================
// INICIALIZACIÓN AUTOMÁTICA
// ================================================

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(inicializarSistemaUsuarios, 500); // Delay para asegurar carga completa
    });
} else {
    // DOM ya está listo
    setTimeout(inicializarSistemaUsuarios, 500);
}

// ================================================
// EXPORTACIÓN GLOBAL
// ================================================

window.SistemaUsuarios = {
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

// Coordinador principal de usuarios cargado