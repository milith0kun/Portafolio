/**
 * TABLERO ADMIN - MÓDULO CORE
 * Inicialización y verificación de autenticación
 */

// ================================================
// INICIALIZACIÓN PRINCIPAL
// ================================================

/**
 * Función principal de inicialización del módulo Core
 * Llamada desde el coordinador principal (index.js)
 */
async function inicializarDashboard() {
    try {
        // 1. Verificar autenticación
        if (!verificarAutenticacionRapida()) {
            return; // La función ya maneja redirección
        }
        
        // 2. Configurar componentes básicos
        configurarComponentesBasicos();
        
    } catch (error) {
        mostrarErrorGeneral('Error al cargar el dashboard');
    }
}

// ================================================
// VERIFICACIÓN DE AUTENTICACIÓN OPTIMIZADA
// ================================================

/**
 * Verificación rápida de autenticación
 */
function verificarAutenticacionRapida() {
    // Verificar disponibilidad del sistema AUTH
    if (!window.AUTH?.verificarAutenticacion?.()) {
        window.location.href = '../../autenticacion/login.html';
        return false;
    }
    
    // Verificar rol de administrador
    const rolActual = AUTH.obtenerRolActivo();
    if (!['administrador', 'admin'].includes(rolActual?.toLowerCase())) {
        alert('No tienes permisos para acceder a esta sección');
        window.location.href = '../../autenticacion/selector-roles.html';
        return false;
    }
    
    return true;
}

// ================================================
// CONFIGURACIÓN DE COMPONENTES BÁSICOS
// ================================================

/**
 * Configurar componentes básicos del dashboard
 */
function configurarComponentesBasicos() {
    // Inicializar tooltips de Bootstrap
    initializeTooltips();
    
    // Inicializar popovers de Bootstrap
    initializePopovers();
    
    // Configurar información del usuario en header
    actualizarInfoUsuario();
}

function initializeTooltips() {
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(el => new bootstrap.Tooltip(el));
}

function initializePopovers() {
    const popovers = document.querySelectorAll('[data-bs-toggle="popover"]');
    popovers.forEach(el => new bootstrap.Popover(el));
}

function actualizarInfoUsuario() {
    const usuario = AUTH.obtenerUsuario();
    if (!usuario) return;
    
    // Actualizar nombre en header
    const nombreElemento = document.getElementById('nombreUsuario');
    if (nombreElemento) {
        nombreElemento.textContent = usuario.nombres || 'Administrador';
    }
    
    // Actualizar email en dropdown si existe
    const emailElemento = document.getElementById('dropdownUserEmail');
    if (emailElemento) {
        emailElemento.textContent = usuario.correo || usuario.email || '';
    }
}

// ================================================
// FUNCIONES DE UTILIDAD DEL MÓDULO CORE
// ================================================

// ================================================
// FUNCIONES DE UTILIDAD GLOBAL
// ================================================

/**
 * Mostrar error general del dashboard
 */
function mostrarErrorGeneral(mensaje) {
    if (window.mostrarNotificacion) {
        window.mostrarNotificacion(mensaje, 'error');
    } else {
        alert(`Error: ${mensaje}`);
    }
}

/**
 * Obtener configuración del dashboard
 */
function obtenerConfigDashboard() {
    return {
        apiEndpoints: {
            estadoSistema: '/dashboard/estado-sistema',
            metricas: '/dashboard/metricas',
            cicloActual: '/ciclos/actual',
            actividades: '/dashboard/actividades-recientes',
            ciclosDisponibles: '/ciclos'
        },
        elementos: {
            nombreUsuario: 'nombreUsuario',
            emailUsuario: 'dropdownUserEmail',
            estadoSistema: 'estadoSistema',
            systemStatusBadge: 'systemStatusBadge',
            systemStatusMessage: 'systemStatusMessage'
        }
    };
}

// Exponer funciones globales
window.TableroCore = {
    initialize: inicializarDashboard,
    verificarAutenticacionRapida,
    configurarComponentesBasicos,
    mostrarErrorGeneral,
    obtenerConfigDashboard
};