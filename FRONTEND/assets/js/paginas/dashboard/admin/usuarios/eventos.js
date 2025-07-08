/**
 * USUARIOS ADMIN - MÓDULO EVENTOS
 * Manejo de eventos e interacciones del usuario
 */

// ================================================
// INICIALIZACIÓN DEL MÓDULO
// ================================================

async function initialize() {
    try {
        configurarEventosFormulario();
        configurarEventosTabla();
        configurarEventosModales();
        configurarEventosTeclado();
        
        return true;
        
    } catch (error) {
        throw error;
    }
}

// ================================================
// EVENTOS DEL FORMULARIO
// ================================================

function configurarEventosFormulario() {
    // Submit del formulario
    const form = document.getElementById('formularioUsuario');
    if (form) {
        form.addEventListener('submit', manejarSubmitFormulario);
    }
    
    // Validación en tiempo real del email
    const emailInput = document.getElementById('correo');
    if (emailInput) {
        emailInput.addEventListener('blur', validarEmailEnTiempoReal);
    }
    
    // Botón guardar
    const btnGuardar = document.getElementById('guardarUsuario');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', procesarGuardadoUsuario);
    }
    

}

async function manejarSubmitFormulario(event) {
    event.preventDefault();
    await procesarGuardadoUsuario();
}

async function procesarGuardadoUsuario() {
    try {
        const datosUsuario = obtenerDatosFormulario();
        
        // Validar datos
        const validacion = window.DataUsuarios.validarDatosUsuario(datosUsuario);
        if (!validacion.esValido) {
            mostrarErroresValidacion(validacion.errores);
            return;
        }
        
        // Guardar usuario
        const esEdicion = window.UsuariosCore.obtenerModoEdicion();
        await window.DataUsuarios.guardarUsuario(datosUsuario, esEdicion);
        
        // Actualizar tabla
        await window.UIUsuarios.actualizarTabla();
        
        // Cerrar modal y limpiar formulario
        cerrarModal();
        window.UIUsuarios.limpiarFormulario();
        
    } catch (error) {
        window.UIUsuarios.mostrarError('Error al guardar usuario: ' + error.message);
    }
}

async function validarEmailEnTiempoReal(event) {
    const email = event.target.value.trim();
    if (!email) return;
    
    const esValido = window.DataUsuarios.validarFormatoEmail(email);
    if (!esValido) {
        marcarCampoInvalido(event.target, 'Email no válido');
        return;
    }
    
    // Validar email único (solo si no estamos editando el mismo usuario)
    const idUsuario = document.getElementById('usuario_id')?.value;
    const esUnico = await window.DataUsuarios.validarEmailUnico(email, idUsuario);
    
    if (!esUnico) {
        marcarCampoInvalido(event.target, 'Este email ya está registrado');
    } else {
        marcarCampoValido(event.target);
    }
}

// ================================================
// EVENTOS DE LA TABLA
// ================================================

function configurarEventosTabla() {
    // Delegación de eventos para botones de la tabla
    document.addEventListener('click', (event) => {
        if (event.target.closest('.btn-editar')) {
            const id = event.target.closest('.btn-editar').dataset.id;
            editarUsuario(id);
        }
        
        if (event.target.closest('.btn-eliminar')) {
            const id = event.target.closest('.btn-eliminar').dataset.id;
            confirmarEliminarUsuario(id);
        }
    });
    

}

async function editarUsuario(id) {
    try {
        window.UIUsuarios.mostrarCargando(true);
        
        const usuario = await window.DataUsuarios.cargarUsuario(id);
        window.UsuariosCore.establecerModoEdicion(true);
        
        window.UIUsuarios.llenarFormulario(usuario);
        abrirModal();
        
    } catch (error) {
        window.UIUsuarios.mostrarError('Error al cargar usuario: ' + error.message);
    } finally {
        window.UIUsuarios.mostrarCargando(false);
    }
}

function confirmarEliminarUsuario(id) {
    window.UIUsuarios.mostrarConfirmacion(
        'Esta acción eliminará permanentemente al usuario. ¿Desea continuar?',
        () => eliminarUsuario(id)
    );
}

async function eliminarUsuario(id) {
    try {
        window.UIUsuarios.mostrarCargando(true);
        
        await window.DataUsuarios.eliminarUsuario(id);
        await window.UIUsuarios.actualizarTabla();
        
    } catch (error) {
        window.UIUsuarios.mostrarError('Error al eliminar usuario: ' + error.message);
    } finally {
        window.UIUsuarios.mostrarCargando(false);
    }
}

// ================================================
// EVENTOS DE MODALES
// ================================================

function configurarEventosModales() {
    // Botón nuevo usuario
    const btnNuevo = document.getElementById('btnNuevoUsuario');
    if (btnNuevo) {
        btnNuevo.addEventListener('click', abrirModalNuevo);
    }
    
    // Cerrar modal
    const botonesCerrar = document.querySelectorAll('[data-bs-dismiss="modal"]');
    botonesCerrar.forEach(btn => {
        btn.addEventListener('click', limpiarAlCerrarModal);
    });
    

}

function abrirModalNuevo() {
    window.UIUsuarios.limpiarFormulario();
    window.UsuariosCore.establecerModoEdicion(false);
    abrirModal();
}

function abrirModal() {
    const modal = document.getElementById('modalUsuario');
    if (modal && typeof bootstrap !== 'undefined') {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

function cerrarModal() {
    const modal = document.getElementById('modalUsuario');
    if (modal && typeof bootstrap !== 'undefined') {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
            bsModal.hide();
        }
    }
}

function limpiarAlCerrarModal() {
    setTimeout(() => {
        window.UIUsuarios.limpiarFormulario();
        window.UsuariosCore.establecerModoEdicion(false);
    }, 300);
}

// ================================================
// EVENTOS DE TECLADO
// ================================================

function configurarEventosTeclado() {
    document.addEventListener('keydown', (event) => {
        // Ctrl+N para nuevo usuario
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            abrirModalNuevo();
        }
        
        // Ctrl+R para actualizar tabla
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            window.UIUsuarios.actualizarTabla();
        }
        
        // Escape para cerrar modal
        if (event.key === 'Escape') {
            cerrarModal();
        }
    });
    

}

// ================================================
// FUNCIONES DE UTILIDAD
// ================================================

function obtenerDatosFormulario() {
    const form = document.getElementById('formularioUsuario');
    if (!form) return {};
    
    const formData = new FormData(form);
    const datos = {};
    
    for (let [key, value] of formData.entries()) {
        datos[key] = value;
    }
    
    // Convertir checkbox a boolean
    datos.activo = form.querySelector('#activo')?.checked || false;
    
    return datos;
}

function mostrarErroresValidacion(errores) {
    window.UIUsuarios.mostrarError('Errores de validación:\n' + errores.join('\n'));
}

function marcarCampoInvalido(campo, mensaje) {
    campo.classList.add('is-invalid');
    campo.classList.remove('is-valid');
    
    let feedback = campo.parentNode.querySelector('.invalid-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        campo.parentNode.appendChild(feedback);
    }
    feedback.textContent = mensaje;
}

function marcarCampoValido(campo) {
    campo.classList.remove('is-invalid');
    campo.classList.add('is-valid');
    
    const feedback = campo.parentNode.querySelector('.invalid-feedback');
    if (feedback) {
        feedback.remove();
    }
}

// ================================================
// EXPORTACIÓN DEL MÓDULO
// ================================================

window.EventosUsuarios = {
    // Inicialización
    initialize,
    
    // Modales
    abrirModalNuevo,
    abrirModal,
    cerrarModal,
    
    // Acciones de tabla
    editarUsuario,
    eliminarUsuario,
    
    // Formulario
    procesarGuardadoUsuario,
    obtenerDatosFormulario,
    
    // Validación
    marcarCampoInvalido,
    marcarCampoValido
};