/**
 * Reportes del Sistema
 * Script para la generación y exportación de reportes
 */

// Variable global para la tabla de reportes
let tablaReporte;

// Asegurar que el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    if (!verificarAutenticacion(['administrador', 'verificador'])) {
        return;
    }

    // Inicializar componentes
    inicializarComponentes();
    cargarCiclos();
    cargarDocentes();

    // Configurar eventos
    configurarEventos();
    
    // Configurar eventos de sincronización de ciclos
    configurarEventosSincronizacion();
});

/**
 * Inicializa los componentes de la página
 */
function inicializarComponentes() {
    // Configurar Select2 para el selector de docentes
    $('#selectDocente').select2({
        placeholder: 'Seleccione un docente',
        allowClear: true
    });

    // Inicializar DataTable (sin datos iniciales)
    tablaReporte = $('#tablaReporte').DataTable({
        language: {
            url: '../../../assets/js/datatables-es.json'
        },
        columns: [] // Se configurará dinámicamente según el reporte
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
 * Configura los eventos de sincronización de ciclos
 */
function configurarEventosSincronizacion() {
    // Escuchar eventos de cambio de ciclo
    document.addEventListener('ciclo-cambiado', function(event) {
        const cicloId = event.detail.cicloId;
        // Ciclo cambiado en reportes
        
        // Actualizar el selector de ciclo
        const selectCiclo = document.getElementById('selectCiclo');
        if (selectCiclo && cicloId) {
            selectCiclo.value = cicloId;
            // Disparar evento change para actualizar reportes si es necesario
            selectCiclo.dispatchEvent(new Event('change'));
        }
    });
    
    // Escuchar eventos de sincronización
    document.addEventListener('sincronizar-ciclo', function(event) {
        // Sincronizando datos de reportes
        // Recargar ciclos y datos relacionados
        cargarCiclos();
        cargarDocentes();
    });
    
    // Evento legacy para compatibilidad
    document.addEventListener('cicloSeleccionado', function(event) {
        const cicloId = event.detail.cicloId;
        // Ciclo seleccionado (legacy) en reportes
        
        const selectCiclo = document.getElementById('selectCiclo');
        if (selectCiclo && cicloId) {
            selectCiclo.value = cicloId;
        }
    });
}

/**
 * Configura los eventos de la página
 */
function configurarEventos() {
    // Eventos para generar reportes
    $('#btnGenerarReporteUsuarios').on('click', function() {
        generarReporteUsuarios();
    });

    $('#btnGenerarReporteAsignaturas').on('click', function() {
        generarReporteAsignaturas();
    });

    $('#btnGenerarReporteAsignaciones').on('click', function() {
        generarReporteAsignaciones();
    });

    $('#btnGenerarReporteDocenteAsignaturas').on('click', function() {
        generarReporteDocenteAsignaturas();
    });

    // Eventos para exportar reportes
    $('#btnExportarReporteUsuarios').on('click', function() {
        exportarReporte('usuarios', $('#selectRolUsuarios').val());
    });

    $('#btnExportarReporteAsignaturas').on('click', function() {
        const cicloId = $('#selectCiclo').val();
        if (!cicloId) {
            toastr.error('Debe seleccionar un ciclo académico');
            return;
        }
        exportarReporte('asignaturas', cicloId);
    });

    $('#btnExportarReporteAsignaciones').on('click', function() {
        const cicloId = $('#selectCiclo').val();
        if (!cicloId) {
            toastr.error('Debe seleccionar un ciclo académico');
            return;
        }
        exportarReporte('asignaciones', cicloId);
    });

    $('#btnExportarReporteDocenteAsignaturas').on('click', function() {
        const cicloId = $('#selectCiclo').val();
        const docenteId = $('#selectDocente').val();
        
        if (!cicloId) {
            toastr.error('Debe seleccionar un ciclo académico');
            return;
        }
        
        if (!docenteId) {
            toastr.error('Debe seleccionar un docente');
            return;
        }
        
        exportarReporte('docente-asignaturas', `${docenteId}/${cicloId}`);
    });
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
                $('#selectCiclo').val(cicloActivo.id);
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
 * Genera un reporte de usuarios por rol
 */
function generarReporteUsuarios() {
    const rol = $('#selectRolUsuarios').val();
    const url = rol ? `${CONFIG.API.BASE_URL}/reportes/usuarios/${rol}` : `${CONFIG.API.BASE_URL}/reportes/usuarios/todos`;
    
    mostrarCargando();

    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${obtenerToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al generar el reporte de usuarios');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Configurar columnas de la tabla
            configurarTablaReporte([
                { title: 'ID', data: 'id' },
                { title: 'Nombre', data: 'nombre' },
                { title: 'Apellidos', data: 'apellidos' },
                { title: 'Email', data: 'email' },

                { title: 'Rol', data: 'rol' },
                { 
                    title: 'Fecha Registro', 
                    data: 'fecha_registro',
                    render: function(data) {
                        return moment(data).format('DD/MM/YYYY');
                    }
                }
            ]);
            
            // Cargar datos
            tablaReporte.clear().rows.add(data.data).draw();
            
            toastr.success('Reporte generado exitosamente');
        } else {
            toastr.error(data.message || 'Error al generar el reporte de usuarios');
        }
    })
    .catch(error => {
         // Error
         toastr.error('Error al generar el reporte de usuarios');
     })
    .finally(() => {
        ocultarCargando();
    });
}

/**
 * Genera un reporte de asignaturas por ciclo
 */
function generarReporteAsignaturas() {
    const cicloId = $('#selectCiclo').val();
    
    if (!cicloId) {
        toastr.error('Debe seleccionar un ciclo académico');
        return;
    }
    
    mostrarCargando();

    fetch(`${CONFIG.API.BASE_URL}/reportes/asignaturas/ciclo/${cicloId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${obtenerToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al generar el reporte de asignaturas');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Configurar columnas de la tabla
            configurarTablaReporte([
                { title: 'ID', data: 'id' },
                { title: 'Código', data: 'codigo' },
                { title: 'Nombre', data: 'nombre' },
                { title: 'Carrera', data: 'carrera' },
                { title: 'Semestre', data: 'semestre' },
                { title: 'Créditos', data: 'creditos' },
                { 
                    title: 'Tipo', 
                    data: 'tipo',
                    render: function(data) {
                        return data === 'obligatorio' ? 'Obligatorio' : 'Electivo';
                    }
                }
            ]);
            
            // Cargar datos
            tablaReporte.clear().rows.add(data.data).draw();
            
            toastr.success('Reporte generado exitosamente');
        } else {
            toastr.error(data.message || 'Error al generar el reporte de asignaturas');
        }
    })
    .catch(error => {
        // Error
        toastr.error('Error al generar el reporte de asignaturas');
    })
    .finally(() => {
        ocultarCargando();
    });
}

/**
 * Genera un reporte de asignaciones por ciclo
 */
function generarReporteAsignaciones() {
    const cicloId = $('#selectCiclo').val();
    
    if (!cicloId) {
        toastr.error('Debe seleccionar un ciclo académico');
        return;
    }
    
    mostrarCargando();

    fetch(`${CONFIG.API.BASE_URL}/reportes/asignaciones/ciclo/${cicloId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${obtenerToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al generar el reporte de asignaciones');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Configurar columnas de la tabla
            configurarTablaReporte([
                { title: 'Código Asignatura', data: 'codigo_asignatura' },
                { title: 'Nombre Asignatura', data: 'nombre_asignatura' },
                { title: 'Docente', data: 'nombre_docente' },
                { title: 'Email Docente', data: 'email_docente' },
                { title: 'Carrera', data: 'carrera' },
                { title: 'Semestre', data: 'semestre' }
            ]);
            
            // Cargar datos
            tablaReporte.clear().rows.add(data.data).draw();
            
            toastr.success('Reporte generado exitosamente');
        } else {
            toastr.error(data.message || 'Error al generar el reporte de asignaciones');
        }
    })
    .catch(error => {
        // Error
        toastr.error('Error al generar el reporte de asignaciones');
    })
    .finally(() => {
        ocultarCargando();
    });
}

/**
 * Genera un reporte de asignaturas por docente
 */
function generarReporteDocenteAsignaturas() {
    const cicloId = $('#selectCiclo').val();
    const docenteId = $('#selectDocente').val();
    
    if (!cicloId) {
        toastr.error('Debe seleccionar un ciclo académico');
        return;
    }
    
    if (!docenteId) {
        toastr.error('Debe seleccionar un docente');
        return;
    }
    
    mostrarCargando();

    fetch(`${CONFIG.API.BASE_URL}/reportes/asignaturas/docente/${docenteId}/ciclo/${cicloId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${obtenerToken()}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al generar el reporte de asignaturas por docente');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Configurar columnas de la tabla
            configurarTablaReporte([
                { title: 'Código', data: 'codigo' },
                { title: 'Nombre', data: 'nombre' },
                { title: 'Carrera', data: 'carrera' },
                { title: 'Semestre', data: 'semestre' },
                { title: 'Créditos', data: 'creditos' },
                { 
                    title: 'Tipo', 
                    data: 'tipo',
                    render: function(data) {
                        return data === 'obligatorio' ? 'Obligatorio' : 'Electivo';
                    }
                }
            ]);
            
            // Cargar datos
            tablaReporte.clear().rows.add(data.data).draw();
            
            toastr.success('Reporte generado exitosamente');
        } else {
            toastr.error(data.message || 'Error al generar el reporte de asignaturas por docente');
        }
    })
    .catch(error => {
        // Error
        toastr.error('Error al generar el reporte de asignaturas por docente');
    })
    .finally(() => {
        ocultarCargando();
    });
}

/**
 * Configura las columnas de la tabla de reportes
 * @param {Array} columnas - Definición de columnas para DataTable
 */
function configurarTablaReporte(columnas) {
    // Destruir la tabla existente
    if ($.fn.DataTable.isDataTable('#tablaReporte')) {
        tablaReporte.destroy();
    }
    
    // Recrear la tabla con las nuevas columnas
    tablaReporte = $('#tablaReporte').DataTable({
        language: {
            url: '../../../assets/js/datatables-es.json'
        },
        columns: columnas,
        dom: 'Bfrtip',
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ]
    });
}

/**
 * Exporta un reporte a Excel
 * @param {string} tipo - Tipo de reporte (usuarios, asignaturas, asignaciones, docente-asignaturas)
 * @param {string} id - ID del filtro (rol, ciclo_id, etc.)
 */
function exportarReporte(tipo, id) {
    let url = `/api/reportes/exportar/${tipo}`;
    
    if (id) {
        url += `/${id}`;
    }
    
    // Abrir en una nueva ventana para descargar
    window.open(url, '_blank');
}

/**
 * Muestra el indicador de carga
 */
function mostrarCargando() {
    // Implementar según el diseño de la aplicación
    // Por ejemplo, mostrar un spinner o deshabilitar botones
}

/**
 * Oculta el indicador de carga
 */
function ocultarCargando() {
    // Implementar según el diseño de la aplicación
    // Por ejemplo, ocultar un spinner o habilitar botones
}
