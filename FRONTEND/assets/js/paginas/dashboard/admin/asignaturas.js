/**
 * Gestión de Asignaturas
 * Script para la administración de asignaturas del sistema
 */

// Asegurar que el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    if (!verificarAutenticacion(['administrador'])) {
        return;
    }

    // Inicializar componentes
    inicializarComponentes();
    cargarCiclos();

    // Configurar eventos
    configurarEventos();
});

/**
 * Inicializa los componentes de la página
 */
function inicializarComponentes() {
    // Configurar DataTable
    $('#tablaAsignaturas').DataTable({
        language: {
            url: '../../../assets/js/datatables-es.json'
        },
        columns: [
            { data: 'id' },
            { data: 'codigo' },
            { data: 'nombre' },
            { data: 'carrera' },
            { data: 'semestre' },
            { data: 'creditos' },
            { 
                data: 'tipo',
                render: function(data) {
                    return data === 'obligatorio' ? 'Obligatorio' : 'Electivo';
                }
            },
            {
                data: null,
                render: function(data) {
                    return `
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-info btn-editar" data-id="${data.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button type="button" class="btn btn-primary btn-asignar" data-id="${data.id}" title="Asignar Docente">
                                <i class="fas fa-user-plus"></i>
                            </button>
                            <button type="button" class="btn btn-danger btn-eliminar" data-id="${data.id}" title="Eliminar">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                }
            }
        ]
    });

    // Inicializar Select2
    $('#selectDocente').select2({
        placeholder: 'Seleccione un docente',
        allowClear: true
    });

    // Configurar toastr
    toastr.options = {
        closeButton: true,
        progressBar: true,
        positionClass: "toast-top-right",
        timeOut: 5000
    };
}

/**
 * Configura los eventos de la página
 */
function configurarEventos() {
    // Evento para cambio de ciclo
    $('#selectCiclo').on('change', function() {
        const cicloId = $(this).val();
        if (cicloId) {
            cargarAsignaturas(cicloId);
            $('#btnNuevaAsignatura').prop('disabled', false);
        } else {
            // Limpiar tabla si no hay ciclo seleccionado
            const tabla = $('#tablaAsignaturas').DataTable();
            tabla.clear().draw();
            $('#btnNuevaAsignatura').prop('disabled', true);
        }
    });

    // Evento para abrir modal de nueva asignatura
    $('#btnNuevaAsignatura').on('click', function() {
        limpiarFormularioAsignatura();
        $('#cicloIdForm').val($('#selectCiclo').val());
        $('#modalAsignaturaLabel').text('Nueva Asignatura');
        $('#modalAsignatura').modal('show');
    });

    // Evento para guardar asignatura
    $('#btnGuardarAsignatura').on('click', function() {
        guardarAsignatura();
    });

    // Evento para editar asignatura
    $('#tablaAsignaturas').on('click', '.btn-editar', function() {
        const asignaturaId = $(this).data('id');
        cargarDatosAsignatura(asignaturaId);
    });

    // Evento para asignar docente
    $('#tablaAsignaturas').on('click', '.btn-asignar', function() {
        const asignaturaId = $(this).data('id');
        prepararAsignacionDocente(asignaturaId);
    });

    // Evento para eliminar asignatura
    $('#tablaAsignaturas').on('click', '.btn-eliminar', function() {
        const asignaturaId = $(this).data('id');
        confirmarEliminarAsignatura(asignaturaId);
    });

    // Evento para guardar asignación de docente
    $('#btnGuardarAsignacion').on('click', function() {
        asignarDocente();
    });
    
    // Configurar eventos de sincronización
    configurarEventosSincronizacion();
}

/**
 * Configurar eventos de sincronización de ciclos
 */
function configurarEventosSincronizacion() {
    // Escuchar evento de cambio de ciclo activo
    document.addEventListener('cicloActivoCambiado', (event) => {
        // Ciclo activo cambiado en asignaturas
        
        // Actualizar selector de ciclo
        const selectCiclo = document.getElementById('selectCiclo');
        if (selectCiclo && event.detail.cicloActivo) {
            selectCiclo.value = event.detail.cicloActivo.id || '';
            // Disparar evento change para cargar asignaturas
            $(selectCiclo).trigger('change');
        }
    });
    
    // Eventos legacy para compatibilidad
    document.addEventListener('ciclo-cambiado', (event) => {
        // Ciclo cambiado en asignaturas (legacy)
        // Recargar ciclos para obtener el más actualizado
        setTimeout(() => {
            cargarCiclos();
        }, 100);
    });
    
    // Eventos de sincronización configurados en asignaturas
}

/**
 * Carga la lista de ciclos académicos
 */
function cargarCiclos() {
    mostrarCargando();

    fetch(`${CONFIG.API.BASE_URL}/ciclos`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${obtenerToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar los ciclos académicos');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Limpiar select
            $('#selectCiclo').empty();
            $('#selectCiclo').append('<option value="">Seleccione un ciclo...</option>');
            
            // Agregar opciones
            data.data.forEach(ciclo => {
                $('#selectCiclo').append(`<option value="${ciclo.id}">${ciclo.nombre}</option>`);
            });
            
            // Si hay un ciclo activo, seleccionarlo automáticamente
            const cicloActivo = data.data.find(c => c.estado === 'activo');
            if (cicloActivo) {
                $('#selectCiclo').val(cicloActivo.id).trigger('change');
            }
        } else {
            toastr.error(data.message || 'Error al cargar los ciclos académicos');
        }
    })
    .catch(error => {
        // Error
        toastr.error('Error al cargar los ciclos académicos');
    })
    .finally(() => {
        ocultarCargando();
    });
}

/**
 * Carga la lista de asignaturas por ciclo académico
 * @param {number} cicloId - ID del ciclo académico
 */
function cargarAsignaturas(cicloId) {
    mostrarCargando();

    fetch(`${CONFIG.API.BASE_URL}/asignaturas/ciclo/${cicloId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${obtenerToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar las asignaturas');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Limpiar y recargar la tabla
            const tabla = $('#tablaAsignaturas').DataTable();
            tabla.clear().rows.add(data.data).draw();
        } else {
            toastr.error(data.message || 'Error al cargar las asignaturas');
        }
    })
    .catch(error => {
        // Error
        toastr.error('Error al cargar las asignaturas');
    })
    .finally(() => {
        ocultarCargando();
    });
}

/**
 * Limpia el formulario de asignatura
 */
function limpiarFormularioAsignatura() {
    $('#asignaturaId').val('');
    $('#codigo').val('');
    $('#nombre').val('');
    $('#carrera').val('');
    $('#semestre').val('');
    $('#creditos').val('');
    $('#tipo').val('');
    $('#prerequisitos').val('');
}

/**
 * Guarda una asignatura (nueva o existente)
 */
function guardarAsignatura() {
    // Validar formulario
    if (!validarFormularioAsignatura()) {
        return;
    }

    // Obtener datos del formulario
    const asignaturaId = $('#asignaturaId').val();
    const cicloId = $('#cicloIdForm').val();
    const asignatura = {
        codigo: $('#codigo').val(),
        nombre: $('#nombre').val(),
        carrera: $('#carrera').val(),
        semestre: $('#semestre').val(),
        creditos: $('#creditos').val(),
        tipo: $('#tipo').val(),
        prerequisitos: $('#prerequisitos').val()
    };

    // Determinar si es creación o actualización
    const esNuevo = !asignaturaId;
    const url = esNuevo ? `${CONFIG.API.BASE_URL}/asignaturas/ciclo/${cicloId}` : `${CONFIG.API.BASE_URL}/asignaturas/${asignaturaId}`;
    const metodo = esNuevo ? 'POST' : 'PUT';

    mostrarCargando();

    fetch(url, {
        method: metodo,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${obtenerToken()}`
        },
        body: JSON.stringify(asignatura)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al guardar la asignatura');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            $('#modalAsignatura').modal('hide');
            toastr.success(data.message || 'Asignatura guardada exitosamente');
            cargarAsignaturas(cicloId);
        } else {
            toastr.error(data.message || 'Error al guardar la asignatura');
        }
    })
    .catch(error => {
        // Error
        toastr.error('Error al guardar la asignatura');
    })
    .finally(() => {
        ocultarCargando();
    });
}

/**
 * Valida el formulario de asignatura
 * @returns {boolean} - Indica si el formulario es válido
 */
function validarFormularioAsignatura() {
    // Validar campos requeridos
    if (!$('#codigo').val()) {
        toastr.error('El código de la asignatura es requerido');
        return false;
    }

    if (!$('#nombre').val()) {
        toastr.error('El nombre de la asignatura es requerido');
        return false;
    }

    if (!$('#carrera').val()) {
        toastr.error('La carrera es requerida');
        return false;
    }

    if (!$('#semestre').val()) {
        toastr.error('El semestre es requerido');
        return false;
    }

    if (!$('#creditos').val()) {
        toastr.error('Los créditos son requeridos');
        return false;
    }

    if (!$('#tipo').val()) {
        toastr.error('El tipo de asignatura es requerido');
        return false;
    }

    return true;
}

/**
 * Carga los datos de una asignatura para edición
 * @param {number} asignaturaId - ID de la asignatura
 */
function cargarDatosAsignatura(asignaturaId) {
    mostrarCargando();

    fetch(`${CONFIG.API.BASE_URL}/asignaturas/${asignaturaId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${obtenerToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar los datos de la asignatura');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            const asignatura = data.data;
            
            // Llenar formulario
            $('#asignaturaId').val(asignatura.id);
            $('#cicloIdForm').val(asignatura.ciclo_id);
            $('#codigo').val(asignatura.codigo);
            $('#nombre').val(asignatura.nombre);
            $('#carrera').val(asignatura.carrera);
            $('#semestre').val(asignatura.semestre);
            $('#creditos').val(asignatura.creditos);
            $('#tipo').val(asignatura.tipo);
            $('#prerequisitos').val(asignatura.prerequisitos || '');

            // Mostrar modal
            $('#modalAsignaturaLabel').text('Editar Asignatura');
            $('#modalAsignatura').modal('show');
        } else {
            toastr.error(data.message || 'Error al cargar los datos de la asignatura');
        }
    })
    .catch(error => {
        // Error
        toastr.error('Error al cargar los datos de la asignatura');
    })
    .finally(() => {
        ocultarCargando();
    });
}

/**
 * Confirma la eliminación de una asignatura
 * @param {number} asignaturaId - ID de la asignatura
 */
function confirmarEliminarAsignatura(asignaturaId) {
    Swal.fire({
        title: '¿Está seguro?',
        text: 'Esta acción eliminará la asignatura y no podrá ser revertida',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            eliminarAsignatura(asignaturaId);
        }
    });
}

/**
 * Elimina una asignatura
 * @param {number} asignaturaId - ID de la asignatura
 */
function eliminarAsignatura(asignaturaId) {
    mostrarCargando();

    fetch(`${CONFIG.API.BASE_URL}/asignaturas/${asignaturaId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${obtenerToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al eliminar la asignatura');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            toastr.success(data.message || 'Asignatura eliminada exitosamente');
            cargarAsignaturas($('#selectCiclo').val());
        } else {
            toastr.error(data.message || 'Error al eliminar la asignatura');
        }
    })
    .catch(error => {
        // Error
        toastr.error('Error al eliminar la asignatura');
    })
    .finally(() => {
        ocultarCargando();
    });
}

/**
 * Prepara la asignación de docente a una asignatura
 * @param {number} asignaturaId - ID de la asignatura
 */
function prepararAsignacionDocente(asignaturaId) {
    // Guardar ID de la asignatura
    $('#asignaturaIdAsignar').val(asignaturaId);
    
    // Cargar lista de docentes
    cargarDocentes();
    
    // Mostrar modal
    $('#modalAsignarDocente').modal('show');
}

/**
 * Carga la lista de docentes
 */
function cargarDocentes() {
    mostrarCargando();

    fetch(`${CONFIG.API.BASE_URL}/usuarios/rol/docente`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${obtenerToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar los docentes');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Limpiar select
            $('#selectDocente').empty();
            $('#selectDocente').append('<option value="">Seleccione un docente...</option>');
            
            // Agregar opciones
            data.data.forEach(docente => {
                $('#selectDocente').append(`<option value="${docente.id}">${docente.nombre} ${docente.apellidos}</option>`);
            });
            
            // Refrescar Select2
            $('#selectDocente').trigger('change');
        } else {
            toastr.error(data.message || 'Error al cargar los docentes');
        }
    })
    .catch(error => {
        // Error
        toastr.error('Error al cargar los docentes');
    })
    .finally(() => {
        ocultarCargando();
    });
}

/**
 * Asigna un docente a una asignatura
 */
function asignarDocente() {
    const asignaturaId = $('#asignaturaIdAsignar').val();
    const docenteId = $('#selectDocente').val();
    const cicloId = $('#selectCiclo').val();
    
    if (!docenteId) {
        toastr.error('Debe seleccionar un docente');
        return;
    }
    
    mostrarCargando();
    
    fetch(`${CONFIG.API.BASE_URL}/asignaturas/${asignaturaId}/asignar-docente`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${obtenerToken()}`
        },
        body: JSON.stringify({
            docente_id: docenteId,
            ciclo_id: cicloId
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al asignar el docente');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            $('#modalAsignarDocente').modal('hide');
            toastr.success(data.message || 'Docente asignado exitosamente');
        } else {
            toastr.error(data.message || 'Error al asignar el docente');
        }
    })
    .catch(error => {
        // Error
        toastr.error('Error al asignar el docente');
    })
    .finally(() => {
        ocultarCargando();
    });
}
