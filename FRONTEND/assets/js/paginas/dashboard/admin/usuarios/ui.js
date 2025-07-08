/**
 * USUARIOS ADMIN - MÓDULO UI
 * Manejo de DataTable e interfaz de usuario
 */

// ================================================
// INICIALIZACIÓN DEL MÓDULO UI
// ================================================

async function initialize() {
    try {
        verificarDependencias();
        await inicializarDataTable();
        configurarElementosUI();
        
        return true;
        
    } catch (error) {
        throw error;
    }
}

// ================================================
// VERIFICACIÓN DE DEPENDENCIAS
// ================================================

function verificarDependencias() {
    if (typeof $ === 'undefined') {
        throw new Error('jQuery no está disponible');
    }
    
    if (typeof $.fn.DataTable === 'undefined') {
        throw new Error('DataTables no está disponible');
    }
}

// ================================================
// DATATABLE
// ================================================

async function inicializarDataTable() {
    try {
        const tabla = $('#tablaUsuarios').DataTable({
            language: {
                url: '../../../assets/js/datatables-es.json'
            },
            columns: [
                { title: 'ID', data: 'id', width: '5%' },
                { title: 'Nombre', data: 'nombres', width: '25%' },
                { title: 'Correo', data: 'correo', width: '25%' },
                { title: 'Rol', data: 'rol', width: '15%' },
                { title: 'Estado', data: 'estado', width: '10%' },
                { title: 'Fecha', data: 'fechaCreacion', width: '10%' },
                { title: 'Acciones', data: 'acciones', width: '10%', orderable: false }
            ],
            order: [[0, 'desc']],
            pageLength: 25,
            responsive: true,
            processing: true,
            deferRender: true,
            dom: 'Bfrtip',
            buttons: [
                {
                    text: '<i class="fas fa-plus"></i> Nuevo Usuario',
                    className: 'btn btn-primary btn-sm',
                    action: function() {
                        if (window.EventosUsuarios?.abrirModalNuevo) {
                            window.EventosUsuarios.abrirModalNuevo();
                        }
                    }
                },
                {
                    extend: 'excel',
                    text: '<i class="fas fa-file-excel"></i> Excel',
                    className: 'btn btn-success btn-sm'
                },
                {
                    text: '<i class="fas fa-sync"></i> Actualizar',
                    className: 'btn btn-secondary btn-sm',
                    action: function() {
                        actualizarTabla();
                    }
                }
            ]
        });
        
        window.UsuariosCore.establecerTablaUsuarios(tabla);
        
    } catch (error) {
        throw error;
    }
}

// ================================================
// ACTUALIZACIÓN DE TABLA
// ================================================

async function actualizarTabla() {
    // Actualizando tabla de usuarios
    
    try {
        mostrarCargando(true);
        
        const usuarios = await window.DataUsuarios.cargarUsuarios();
        const datosFormateados = usuarios.map(usuario => 
            window.DataUsuarios.formatearUsuarioParaTabla(usuario)
        );
        
        const tabla = window.UsuariosCore.obtenerTablaUsuarios();
        if (tabla) {
            tabla.clear();
            tabla.rows.add(datosFormateados);
            tabla.draw();
            
            // Tabla actualizada con usuarios
        }
        
    } catch (error) {
        // Error actualizando tabla
        mostrarError('Error al cargar usuarios: ' + error.message);
    } finally {
        mostrarCargando(false);
    }
}

// ================================================
// MANEJO DE FORMULARIOS
// ================================================

function llenarFormulario(datosUsuario) {
    // Llenando formulario con datos del usuario
    
    const campos = {
        'usuario_id': datosUsuario.id || '',
        'nombres': datosUsuario.nombres || '',
        'correo': datosUsuario.correo || '',
        'rol_id': datosUsuario.rol_id || '',
        'activo': datosUsuario.activo || false
    };
    
    Object.entries(campos).forEach(([campo, valor]) => {
        const elemento = document.getElementById(campo);
        if (elemento) {
            if (elemento.type === 'checkbox') {
                elemento.checked = valor;
            } else {
                elemento.value = valor;
            }
        }
    });
}

function limpiarFormulario() {
    // Limpiando formulario
    
    const form = document.getElementById('formularioUsuario');
    if (form) {
        form.reset();
        
        // Limpiar clases de validación
        const campos = form.querySelectorAll('.is-valid, .is-invalid');
        campos.forEach(campo => {
            campo.classList.remove('is-valid', 'is-invalid');
        });
        
        // Limpiar mensajes de error
        const errores = form.querySelectorAll('.invalid-feedback');
        errores.forEach(error => error.remove());
    }
    
    window.UsuariosCore.establecerModoEdicion(false);
}

// ================================================
// FUNCIONES DE CARGA
// ================================================

function mostrarCargando(mostrar = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = mostrar ? 'flex' : 'none';
    }
    
    // Desactivar/activar botones durante la carga
    const botones = document.querySelectorAll('button:not(.loading-ignore)');
    botones.forEach(btn => {
        btn.disabled = mostrar;
    });
}

// ================================================
// MENSAJES Y NOTIFICACIONES
// ================================================

function mostrarError(mensaje) {
    // Error UI
    
    // Intentar usar diferentes sistemas de notificación
    if (window.mostrarNotificacion) {
        window.mostrarNotificacion(mensaje, 'error');
    } else if (typeof Swal !== 'undefined') {
        Swal.fire('Error', mensaje, 'error');
    } else {
        alert('Error: ' + mensaje);
    }
}

function mostrarExito(mensaje) {
    // Éxito UI
    
    if (window.mostrarNotificacion) {
        window.mostrarNotificacion(mensaje, 'success');
    } else if (typeof Swal !== 'undefined') {
        Swal.fire('Éxito', mensaje, 'success');
    } else {
        alert('Éxito: ' + mensaje);
    }
}

function mostrarConfirmacion(mensaje, callback) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: '¿Está seguro?',
            text: mensaje,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed && callback) {
                callback();
            }
        });
    } else {
        if (confirm(mensaje) && callback) {
            callback();
        }
    }
}

// ================================================
// CONFIGURACIÓN DE ELEMENTOS UI
// ================================================

function configurarElementosUI() {
    // Configurar tooltips
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(el => {
        new bootstrap.Tooltip(el);
    });
    
    // Configurar select2 si está disponible
    if (typeof $.fn.select2 !== 'undefined') {
        $('.select2').select2({
            theme: 'bootstrap-5',
            width: '100%'
        });
    }
}

// ================================================
// UTILIDADES UI
// ================================================

function actualizarContadores() {
    const tabla = window.UsuariosCore.obtenerTablaUsuarios();
    if (tabla) {
        const info = tabla.page.info();
        const contador = document.getElementById('contadorUsuarios');
        if (contador) {
            contador.textContent = `${info.recordsTotal} usuarios registrados`;
        }
    }
}

function resizeTabla() {
    const tabla = window.UsuariosCore.obtenerTablaUsuarios();
    if (tabla) {
        tabla.columns.adjust().responsive.recalc();
    }
}

// ================================================
// EXPORTACIÓN DEL MÓDULO
// ================================================

window.UIUsuarios = {
    // Inicialización
    initialize,
    
    // DataTable
    inicializarDataTable,
    actualizarTabla,
    resizeTabla,
    
    // Formularios
    llenarFormulario,
    limpiarFormulario,
    
    // Estados de carga
    mostrarCargando,
    
    // Mensajes
    mostrarError,
    mostrarExito,
    mostrarConfirmacion,
    
    // Utilidades
    actualizarContadores
};

// Módulo UI de Usuarios cargado