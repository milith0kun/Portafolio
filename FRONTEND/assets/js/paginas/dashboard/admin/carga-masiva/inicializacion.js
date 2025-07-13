/**
 * Inicialización de la página de Carga Masiva
 * Verifica autenticación y permisos antes de cargar la página
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Restaurar sesión antes de cualquier verificación
    if (window.AUTH && typeof window.AUTH.inicializarDesdeSesion === 'function') {
        window.AUTH.inicializarDesdeSesion();
    }
    console.log('🚀 Iniciando página de carga masiva...');
    
    // Verificar que el sistema AUTH esté disponible
    if (typeof window.AUTH === 'undefined') {
        console.error('❌ Sistema AUTH no disponible');
        alert('Error: Sistema de autenticación no cargado');
        return;
    }

    // Verificar autenticación
    if (!await window.AUTH.verificarAutenticacion()) {
        console.log('❌ No autenticado, redirigiendo...');
        window.location.href = '../../autenticacion/login.html';
        return;
    }

    // Verificar rol de administrador
    const rolActual = window.AUTH.obtenerRolActivo();
    if (rolActual !== 'administrador') {
        console.log('❌ No tiene permisos de administrador');
        alert('No tiene permisos para acceder a esta página');
        window.location.href = '../tablero.html';
        return;
    }
    
    console.log('✅ Página de carga masiva inicializada correctamente');
});

console.log('✅ Script de inicialización de carga masiva cargado'); 