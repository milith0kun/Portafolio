/**
 * CICLOS - MÓDULO UI
 * Gestión de interfaz de usuario y DataTable
 */

export class CiclosUI {
    constructor(core, data) {
        this.core = core;
        this.data = data;
        this.tablaCiclos = null;
        this.debug = window.ciclosDebug || false;
        this.log('Módulo UI inicializado');
    }

    /**
     * Inicializar DataTable de ciclos
     */
    inicializarDataTable() {
        if (typeof $ === 'undefined' || typeof $.fn.DataTable === 'undefined') {
            // jQuery o DataTables no disponible
            return false;
        }

        try {
            this.tablaCiclos = $('#tablaCiclos').DataTable({
                language: {
                    url: '../../../assets/js/datatables-es.json'
                },
                responsive: true,
                order: [[0, 'desc']],
                pageLength: 25,
                columns: [
                    { 
                        data: 'id',
                        width: '80px',
                        title: 'ID'
                    },
                    { 
                        data: 'nombre',
                        title: 'Nombre del Ciclo',
                        render: (data, type, row) => {
                            let html = `<strong>${data}</strong>`;
                            if (row.estado === 'activo') {
                                html += ' <span class="badge badge-success ml-1">ACTIVO</span>';
                            }
                            return html;
                        }
                    },
                    { 
                        data: 'descripcion',
                        title: 'Descripción',
                        render: (data) => {
                            return data || '<em class="text-muted">Sin descripción</em>';
                        }
                    },
                    { 
                        data: 'estado',
                        title: 'Estado',
                        width: '120px',
                        render: (data) => {
                            const badges = {
                                'preparacion': '<span class="badge badge-warning">Preparación</span>',
                                'inicializacion': '<span class="badge badge-info">Inicialización</span>',
                                'activo': '<span class="badge badge-success">Activo</span>',
                                'verificacion': '<span class="badge badge-primary">Verificación</span>',
                                'finalizacion': '<span class="badge badge-secondary">Finalización</span>',
                                'archivado': '<span class="badge badge-dark">Archivado</span>',
                                // Estados legacy para compatibilidad
                                'cerrado': '<span class="badge badge-secondary">Cerrado</span>'
                            };
                            return badges[data] || `<span class="badge badge-light">${data}</span>`;
                        }
                    },
                    { 
                        data: 'fecha_inicio',
                        title: 'Fecha Inicio',
                        width: '110px',
                        render: (data) => {
                            return typeof moment !== 'undefined' 
                                ? moment(data).format('DD/MM/YYYY')
                                : new Date(data).toLocaleDateString();
                        }
                    },
                    { 
                        data: 'fecha_fin',
                        title: 'Fecha Fin',
                        width: '110px',
                        render: (data) => {
                            return typeof moment !== 'undefined' 
                                ? moment(data).format('DD/MM/YYYY')
                                : new Date(data).toLocaleDateString();
                        }
                    },
                    {
                        data: null,
                        title: 'Acciones',
                        orderable: false,
                        width: '200px',
                        render: (data) => this.generarBotonesAccion(data)
                    }
                ]
            });

            this.log('DataTable inicializada exitosamente');
            return true;
        } catch (error) {
            // Error al inicializar DataTable
            return false;
        }
    }

    /**
     * Generar botones de acción para cada ciclo
     */
    generarBotonesAccion(ciclo) {
        let botones = `<div class="btn-group btn-group-sm" role="group">`;
        
        // Botón editar (disponible solo en preparación)
        if (ciclo.estado === 'preparacion') {
            botones += `
                <button type="button" class="btn btn-info btn-editar" data-id="${ciclo.id}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
            `;
        }
        
        // Botones específicos según estado
        switch (ciclo.estado) {
            case 'preparacion':
                // Botón inicializar ciclo
                botones += `
                    <button type="button" class="btn btn-success btn-inicializar" data-id="${ciclo.id}" title="Inicializar Ciclo">
                        <i class="fas fa-rocket"></i>
                    </button>
                `;
                
                // Botón eliminar (solo para ciclos en preparación)
                botones += `
                    <button type="button" class="btn btn-danger btn-eliminar" data-id="${ciclo.id}" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                break;
                
            case 'inicializacion':
                // Botón activar
                botones += `
                    <button type="button" class="btn btn-success btn-activar" data-id="${ciclo.id}" title="Activar Ciclo">
                        <i class="fas fa-play"></i>
                    </button>
                `;
                
                // Botón volver a preparación
                botones += `
                    <button type="button" class="btn btn-warning btn-volver-preparacion" data-id="${ciclo.id}" title="Volver a Preparación">
                        <i class="fas fa-undo"></i>
                    </button>
                `;
                break;
                
            case 'activo':
                // Botón gestionar estados
                botones += `
                    <button type="button" class="btn btn-primary btn-estados" data-id="${ciclo.id}" title="Gestionar Estados">
                        <i class="fas fa-cogs"></i>
                    </button>
                `;
                
                // Botón iniciar verificación
                botones += `
                    <button type="button" class="btn btn-info btn-iniciar-verificacion" data-id="${ciclo.id}" title="Iniciar Verificación">
                        <i class="fas fa-search"></i>
                    </button>
                `;
                
                // Botón volver a preparación
                botones += `
                    <button type="button" class="btn btn-warning btn-volver-preparacion" data-id="${ciclo.id}" title="Volver a Preparación">
                        <i class="fas fa-undo"></i>
                    </button>
                `;
                break;
                
            case 'verificacion':
                // Botón finalizar
                botones += `
                    <button type="button" class="btn btn-success btn-finalizar" data-id="${ciclo.id}" title="Finalizar Ciclo">
                        <i class="fas fa-flag-checkered"></i>
                    </button>
                `;
                
                // Botón volver a activo
                botones += `
                    <button type="button" class="btn btn-primary btn-volver-activo" data-id="${ciclo.id}" title="Volver a Activo">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                `;
                break;
                
            case 'finalizacion':
            case 'cerrado': // Compatibilidad con estado legacy
                // Botón archivar
                botones += `
                    <button type="button" class="btn btn-secondary btn-archivar" data-id="${ciclo.id}" title="Archivar Ciclo">
                        <i class="fas fa-archive"></i>
                    </button>
                `;
                break;
                
            case 'archivado':
                // Botón reactivar (volver a preparación)
                botones += `
                    <button type="button" class="btn btn-outline-success btn-reactivar" data-id="${ciclo.id}" title="Reactivar Ciclo">
                        <i class="fas fa-play"></i>
                    </button>
                `;
                break;
        }
        
        // Botón ver detalles (siempre disponible)
        botones += `
            <button type="button" class="btn btn-outline-info btn-ver-detalles" data-id="${ciclo.id}" title="Ver Detalles">
                <i class="fas fa-eye"></i>
            </button>
        `;
        
        botones += `</div>`;
        return botones;
    }

    /**
     * Actualizar tabla con nuevos datos
     */
    async actualizarTabla() {
        if (!this.tablaCiclos) {
            this.log('DataTable no inicializada');
            return false;
        }

        try {
            this.core.mostrarCargando();
            const ciclos = await this.data.cargarCiclos();
            
            this.tablaCiclos.clear();
            this.tablaCiclos.rows.add(ciclos);
            this.tablaCiclos.draw();
            
            this.log('Tabla actualizada con', ciclos.length, 'ciclos');
            return true;
        } catch (error) {
            // Error al actualizar tabla
            return false;
        } finally {
            this.core.ocultarCargando();
        }
    }

    /**
     * Configurar modal de ciclo para crear/editar
     */
    configurarModalCiclo() {
        const modal = document.getElementById('modalCiclo');
        if (!modal) {
            // Modal de ciclo no encontrado
            return;
        }

        // Configurar eventos del modal
        $(modal).on('hidden.bs.modal', () => {
            this.core.limpiarFormularioCiclo();
        });

        this.log('Modal de ciclo configurado');
    }

    /**
     * Mostrar modal para nuevo ciclo
     */
    mostrarModalNuevoCiclo() {
        this.core.limpiarFormularioCiclo();
        document.getElementById('modalCicloLabel').textContent = 'Nuevo Ciclo Académico';
        
        // Ocultar campo de estado para nuevo ciclo
        const estadoGroup = document.getElementById('estadoGroup');
        if (estadoGroup) {
            estadoGroup.style.display = 'none';
        }
        
        $('#modalCiclo').modal('show');
        this.log('Modal nuevo ciclo mostrado');
    }

    /**
     * Mostrar modal para editar ciclo
     */
    async mostrarModalEditarCiclo(cicloId) {
        try {
            this.core.mostrarCargando();
            const ciclo = await this.data.cargarDatosCiclo(cicloId);
            
            document.getElementById('cicloId').value = ciclo.id;
            document.getElementById('nombre').value = ciclo.nombre;
            document.getElementById('descripcion').value = ciclo.descripcion || '';
            document.getElementById('estado').value = ciclo.estado;
            
            if (typeof moment !== 'undefined') {
                document.getElementById('fechaInicio').value = moment(ciclo.fecha_inicio).format('YYYY-MM-DD');
                document.getElementById('fechaFin').value = moment(ciclo.fecha_fin).format('YYYY-MM-DD');
            } else {
                document.getElementById('fechaInicio').value = ciclo.fecha_inicio.split('T')[0];
                document.getElementById('fechaFin').value = ciclo.fecha_fin.split('T')[0];
            }
            
            document.getElementById('semestreActual').value = ciclo.semestre_actual;
            document.getElementById('anioActual').value = ciclo.anio_actual;
            
            // Mostrar campo de estado para edición
            const estadoGroup = document.getElementById('estadoGroup');
            if (estadoGroup) {
                estadoGroup.style.display = 'block';
            }
            
            document.getElementById('modalCicloLabel').textContent = 'Editar Ciclo Académico';
            $('#modalCiclo').modal('show');
            
            this.log('Modal editar ciclo mostrado:', cicloId);
        } catch (error) {
            // Error al mostrar modal de edición
            if (typeof toastr !== 'undefined') {
                toastr.error('Error al cargar los datos del ciclo');
            }
        } finally {
            this.core.ocultarCargando();
        }
    }

    /**
     * Mostrar modal de gestión de estados
     */
    async mostrarModalEstados(cicloId) {
        try {
            this.core.mostrarCargando();
            
            // Cargar información del ciclo y sus estados
            const [ciclo, estados] = await Promise.all([
                this.data.cargarDatosCiclo(cicloId),
                this.data.cargarEstadosCiclo(cicloId)
            ]);
            
            // Crear el modal dinámicamente con la información real
            const modalHtml = this.generarModalEstados(ciclo, estados);
            
            // Insertar modal en el DOM
            let modalContainer = document.getElementById('modalEstadosContainer');
            if (!modalContainer) {
                modalContainer = document.createElement('div');
                modalContainer.id = 'modalEstadosContainer';
                document.body.appendChild(modalContainer);
            }
            modalContainer.innerHTML = modalHtml;
            
            // Configurar eventos del modal
            this.configurarEventosModalEstados(cicloId);
            
            // Mostrar modal
            $('#modalEstadosCiclo').modal('show');
            
            this.log('Modal estados mostrado para ciclo:', cicloId);
        } catch (error) {
            // Error al mostrar modal de estados
            if (typeof toastr !== 'undefined') {
                toastr.error('Error al cargar los estados del ciclo');
            }
        } finally {
            this.core.ocultarCargando();
        }
    }

    /**
     * Generar HTML del modal de estados
     */
    generarModalEstados(ciclo, estados) {
        const modulosInfo = {
            'carga_datos': {
                nombre: 'Carga de Datos',
                descripcion: 'Permite la carga masiva de usuarios, carreras, asignaturas',
                icono: 'fas fa-upload'
            },
            'gestion_documentos': {
                nombre: 'Gestión de Documentos',
                descripcion: 'Habilita la gestión de portafolios y documentos',
                icono: 'fas fa-folder-open'
            },
            'verificacion': {
                nombre: 'Verificación',
                descripcion: 'Proceso de verificación de portafolios',
                icono: 'fas fa-check-circle'
            },
            'reportes': {
                nombre: 'Reportes',
                descripcion: 'Generación de reportes y estadísticas',
                icono: 'fas fa-chart-bar'
            }
        };

        let estadosHtml = '';
        
        Object.entries(modulosInfo).forEach(([modulo, info]) => {
            const estado = estados.find(e => e.modulo === modulo);
            const habilitado = estado ? estado.habilitado : false;
            const fechaUpdate = estado ? new Date(estado.actualizado_en).toLocaleString() : 'N/A';
            
            estadosHtml += `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <h6 class="card-title mb-1">
                                    <i class="${info.icono} me-2"></i>${info.nombre}
                                </h6>
                                <p class="card-text text-muted mb-1">${info.descripcion}</p>
                                <small class="text-muted">Última actualización: ${fechaUpdate}</small>
                            </div>
                            <div class="col-md-4 text-end">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" 
                                           id="modulo_${modulo}" 
                                           data-modulo="${modulo}"
                                           ${habilitado ? 'checked' : ''}
                                           ${ciclo.estado !== 'activo' ? 'disabled' : ''}>
                                    <label class="form-check-label" for="modulo_${modulo}">
                                        <span class="badge ${habilitado ? 'bg-success' : 'bg-secondary'}">
                                            ${habilitado ? 'Habilitado' : 'Deshabilitado'}
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        return `
            <div class="modal fade" id="modalEstadosCiclo" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-cogs me-2"></i>Gestión de Estados - ${ciclo.nombre}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                <strong>Estado del ciclo:</strong> 
                                <span class="badge ${ciclo.estado === 'activo' ? 'bg-success' : 'bg-warning'}">${ciclo.estado.toUpperCase()}</span>
                                <br>
                                <small>Los módulos solo pueden modificarse en ciclos activos.</small>
                            </div>
                            
                            <h6 class="mb-3">Estados de los Módulos:</h6>
                            ${estadosHtml}
                            
                            <div class="mt-3 p-3 bg-light rounded">
                                <h6><i class="fas fa-exclamation-triangle text-warning me-2"></i>Importante:</h6>
                                <ul class="mb-0 small">
                                    <li>Los módulos deben habilitarse en secuencia</li>
                                    <li>No se puede deshabilitar un módulo si hay módulos posteriores habilitados</li>
                                    <li>La carga de datos debe completarse antes de pasar a verificación</li>
                                </ul>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times me-2"></i>Cerrar
                            </button>
                            ${ciclo.estado === 'activo' ? `
                                <button type="button" class="btn btn-primary" id="btnGuardarEstados">
                                    <i class="fas fa-save me-2"></i>Guardar Cambios
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Configurar eventos del modal de estados
     */
    configurarEventosModalEstados(cicloId) {
        // Evento para cambios en switches
        document.querySelectorAll('#modalEstadosCiclo [data-modulo]').forEach(switch_ => {
            switch_.addEventListener('change', async (e) => {
                const modulo = e.target.dataset.modulo;
                const habilitado = e.target.checked;
                
                try {
                    await this.data.cambiarEstadoModulo(cicloId, modulo, habilitado);
                    
                    // Actualizar visual del badge
                    const label = document.querySelector(`label[for="${e.target.id}"] .badge`);
                    if (label) {
                        label.textContent = habilitado ? 'Habilitado' : 'Deshabilitado';
                        label.className = `badge ${habilitado ? 'bg-success' : 'bg-secondary'}`;
                    }
                    
                    if (typeof toastr !== 'undefined') {
                        toastr.success(`Módulo ${modulo} ${habilitado ? 'habilitado' : 'deshabilitado'} exitosamente`);
                    }
                } catch (error) {
                    // Revertir el switch
                    e.target.checked = !habilitado;
                    
                    if (typeof toastr !== 'undefined') {
                        toastr.error(error.message || 'Error al cambiar estado del módulo');
                    }
                }
            });
        });
        
        // Evento del botón guardar (por si acaso)
        const btnGuardar = document.getElementById('btnGuardarEstados');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => {
                if (typeof toastr !== 'undefined') {
                    toastr.info('Los cambios se guardan automáticamente');
                }
                $('#modalEstadosCiclo').modal('hide');
            });
        }
    }

    /**
     * Mostrar confirmación con SweetAlert
     */
    mostrarConfirmacion(titulo, mensaje, callback, tipo = 'question') {
        if (typeof Swal !== 'undefined') {
            const colores = {
                warning: '#f39c12',
                success: '#28a745',
                error: '#dc3545',
                question: '#17a2b8'
            };

            Swal.fire({
                title: titulo,
                html: mensaje,
                icon: tipo,
                showCancelButton: true,
                confirmButtonColor: colores[tipo] || colores.question,
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sí, continuar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed && callback) {
                    callback();
                }
            });
        } else {
            // Fallback a confirm nativo
            if (confirm(`${titulo}\n\n${mensaje.replace(/<[^>]*>/g, '')}`)) {
                if (callback) callback();
            }
        }
    }

    /**
     * Actualizar interfaz de ciclo activo
     */
    actualizarInterfazCicloActivo() {
        const alertaDiv = document.getElementById('alertaSistema');
        if (!alertaDiv) return;

        if (this.core.cicloActivo) {
            const ciclo = this.core.cicloActivo;
            this.core.mostrarAlertaSistema(
                'Ciclo Activo',
                `${ciclo.nombre} (${ciclo.semestre_actual} - ${ciclo.anio_actual})`,
                'success'
            );
        } else {
            this.core.mostrarAlertaSistema(
                'Sin Ciclo Activo',
                'No hay ningún ciclo académico activo en el sistema',
                'warning'
            );
        }
    }

    /**
     * Actualizar contadores/estadísticas en la interfaz
     */
    actualizarEstadisticas(ciclos = []) {
        try {
            const stats = {
                total: ciclos.length,
                activos: ciclos.filter(c => c.estado === 'activo').length,
                preparacion: ciclos.filter(c => c.estado === 'preparacion').length,
                cerrados: ciclos.filter(c => c.estado === 'cerrado').length
            };

            // Actualizar elementos de estadísticas si existen
            const elementos = {
                'stat-total-ciclos': stats.total,
                'stat-ciclos-activos': stats.activos,
                'stat-ciclos-preparacion': stats.preparacion,
                'stat-ciclos-cerrados': stats.cerrados
            };

            Object.entries(elementos).forEach(([id, valor]) => {
                const elemento = document.getElementById(id);
                if (elemento) {
                    elemento.textContent = valor;
                }
            });

            this.log('Estadísticas actualizadas:', stats);
        } catch (error) {
            // Error al actualizar estadísticas
        }
    }

    /**
     * Logging para desarrollo
     */
    log(...args) {
        if (this.debug) {
            // Log de CiclosUI
        }
    }

    /**
     * Limpiar recursos del UI
     */
    destruir() {
        if (this.tablaCiclos) {
            try {
                this.tablaCiclos.destroy();
                this.tablaCiclos = null;
                this.log('DataTable destruida');
            } catch (error) {
                // Error al destruir DataTable
            }
        }
    }

    /**
     * Verificar estado del UI
     */
    verificarEstado() {
        return {
            dataTableInicializada: !!this.tablaCiclos,
            modalCicloDisponible: !!document.getElementById('modalCiclo'),
            modalEstadosDisponible: !!document.getElementById('modalEstados'),
            tablaCiclosDisponible: !!document.getElementById('tablaCiclos')
        };
    }
}