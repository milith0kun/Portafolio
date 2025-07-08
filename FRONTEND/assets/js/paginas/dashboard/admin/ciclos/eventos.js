/**
 * CICLOS - MÓDULO EVENTOS
 * Manejo de eventos e interacciones del usuario
 */

export class CiclosEventos {
    constructor(core, data, ui) {
        this.core = core;
        this.data = data;
        this.ui = ui;
        this.debug = window.ciclosDebug || false;
        this.log('Módulo Eventos inicializado');
    }

    /**
     * Configurar todos los eventos
     */
    configurarEventos() {
        this.configurarEventosFormulario();
        this.configurarEventosTabla();
        this.configurarEventosModales();
        this.configurarEventosPersonalizados();
        this.log('Eventos configurados');
    }

    /**
     * Configurar eventos del formulario
     */
    configurarEventosFormulario() {
        // Botón guardar ciclo
        $(document).on('click', '#btnGuardarCiclo', async () => {
            await this.manejarGuardarCiclo();
        });

        // Botón nuevo ciclo
        $(document).on('click', '#btnNuevoCiclo', () => {
            this.ui.mostrarModalNuevoCiclo();
        });

        // Validación de fechas en tiempo real
        $(document).on('change', '#fechaInicio, #fechaFin', () => {
            this.core.validarFechas();
        });

        // Validación de campos requeridos
        $(document).on('blur', '.form-control[required]', (e) => {
            this.validarCampo(e.target);
        });

        // Botón guardar estados
        $(document).on('click', '#btnGuardarEstados', async () => {
            await this.manejarGuardarEstados();
        });

        this.log('Eventos de formulario configurados');
    }

    /**
     * Configurar eventos de la tabla
     */
    configurarEventosTabla() {
        // Botón editar
        $(document).on('click', '.btn-editar', async (e) => {
            const cicloId = $(e.currentTarget).data('id');
            await this.ui.mostrarModalEditarCiclo(cicloId);
        });

        // Botón inicializar
        $(document).on('click', '.btn-inicializar', (e) => {
            const cicloId = $(e.currentTarget).data('id');
            this.confirmarCambiarEstado(cicloId, 'inicializacion', 'Inicializar Ciclo');
        });

        // Botón activar
        $(document).on('click', '.btn-activar', (e) => {
            const cicloId = $(e.currentTarget).data('id');
            this.confirmarCambiarEstado(cicloId, 'activo', 'Activar Ciclo');
        });

        // Botón iniciar verificación
        $(document).on('click', '.btn-iniciar-verificacion', (e) => {
            const cicloId = $(e.currentTarget).data('id');
            this.confirmarCambiarEstado(cicloId, 'verificacion', 'Iniciar Verificación');
        });

        // Botón finalizar
        $(document).on('click', '.btn-finalizar', (e) => {
            const cicloId = $(e.currentTarget).data('id');
            this.confirmarCambiarEstado(cicloId, 'finalizacion', 'Finalizar Ciclo');
        });

        // Botón archivar
        $(document).on('click', '.btn-archivar', (e) => {
            const cicloId = $(e.currentTarget).data('id');
            this.confirmarCambiarEstado(cicloId, 'archivado', 'Archivar Ciclo');
        });

        // Botón volver a preparación
        $(document).on('click', '.btn-volver-preparacion', (e) => {
            const cicloId = $(e.currentTarget).data('id');
            this.confirmarCambiarEstado(cicloId, 'preparacion', 'Volver a Preparación');
        });

        // Botón volver a activo
        $(document).on('click', '.btn-volver-activo', (e) => {
            const cicloId = $(e.currentTarget).data('id');
            this.confirmarCambiarEstado(cicloId, 'activo', 'Volver a Estado Activo');
        });

        // Botón reactivar
        $(document).on('click', '.btn-reactivar', (e) => {
            const cicloId = $(e.currentTarget).data('id');
            this.confirmarCambiarEstado(cicloId, 'preparacion', 'Reactivar Ciclo');
        });

        // Botón cerrar (legacy)
        $(document).on('click', '.btn-cerrar', (e) => {
            const cicloId = $(e.currentTarget).data('id');
            this.confirmarCambiarEstado(cicloId, 'finalizacion', 'Cerrar Ciclo');
        });

        // Botón eliminar
        $(document).on('click', '.btn-eliminar', (e) => {
            const cicloId = $(e.currentTarget).data('id');
            this.confirmarEliminarCiclo(cicloId);
        });

        // Botón gestionar estados
        $(document).on('click', '.btn-estados', async (e) => {
            const cicloId = $(e.currentTarget).data('id');
            await this.ui.mostrarModalEstados(cicloId);
        });

        // Botón ver detalles
        $(document).on('click', '.btn-ver-detalles', async (e) => {
            const cicloId = $(e.currentTarget).data('id');
            await this.ui.mostrarModalDetallesCiclo(cicloId);
        });

        this.log('Eventos de tabla configurados');
    }

    /**
     * Configurar eventos de modales
     */
    configurarEventosModales() {
        // Limpiar formulario al cerrar modal
        $('#modalCiclo').on('hidden.bs.modal', () => {
            this.core.limpiarFormularioCiclo();
        });

        // Actualizar tabla al cerrar modal de estados
        $('#modalEstados').on('hidden.bs.modal', async () => {
            await this.ui.actualizarTabla();
        });

        this.log('Eventos de modales configurados');
    }

    /**
     * Configurar eventos personalizados
     */
    configurarEventosPersonalizados() {
        // Escuchar cambios en el ciclo activo
        document.addEventListener('cicloActivoCambiado', (e) => {
            this.log('Ciclo activo cambió:', e.detail.ciclo);
            this.ui.actualizarInterfazCicloActivo();
        });

        // Escuchar pérdida de ciclo activo
        document.addEventListener('cicloActivoPerdido', () => {
            this.log('Ciclo activo perdido');
            this.ui.actualizarInterfazCicloActivo();
        });

        // Escuchar cambios en estados
        document.addEventListener('ciclosEstadosCargados', (e) => {
            this.log('Estados cargados:', e.detail);
        });

        document.addEventListener('ciclosEstadosGuardados', (e) => {
            this.log('Estados guardados:', e.detail);
            if (typeof toastr !== 'undefined') {
                toastr.success('Estados del ciclo actualizados correctamente');
            }
        });

        this.log('Eventos personalizados configurados');
    }

    /**
     * Manejar guardado de ciclo
     */
    async manejarGuardarCiclo() {
        if (!this.core.validarFormularioCiclo()) {
            if (typeof toastr !== 'undefined') {
                toastr.warning('Por favor, corrija los errores en el formulario');
            }
            return;
        }

        const cicloId = document.getElementById('cicloId').value;
        const datos = {
            nombre: document.getElementById('nombre').value.trim(),
            descripcion: document.getElementById('descripcion').value.trim(),
            fecha_inicio: document.getElementById('fechaInicio').value,
            fecha_fin: document.getElementById('fechaFin').value,
            semestre_actual: document.getElementById('semestreActual').value.trim(),
            anio_actual: parseInt(document.getElementById('anioActual').value)
        };

        // Si es edición, agregar estado si se cambió
        if (cicloId) {
            const estadoSeleccionado = document.getElementById('estado').value;
            if (estadoSeleccionado) {
                datos.estado = estadoSeleccionado;
            }
        }

        try {
            this.core.mostrarCargando();
            const response = await this.data.guardarCiclo(datos, cicloId || null);

            if (typeof toastr !== 'undefined') {
                toastr.success(response.message || 'Ciclo académico guardado exitosamente');
            }

            $('#modalCiclo').modal('hide');
            await this.ui.actualizarTabla();
            await this.data.cargarCicloActivo(); // Recargar ciclo activo por si cambió

        } catch (error) {
            // Error al guardar ciclo
            if (typeof toastr !== 'undefined') {
                toastr.error(error.message || 'Error al guardar el ciclo académico');
            }
        } finally {
            this.core.ocultarCargando();
        }
    }

    /**
     * Manejar guardado de estados
     */
    async manejarGuardarEstados() {
        const cicloId = document.getElementById('estadosCicloId').value;
        const modulos = ['carga_docentes', 'carga_asignaturas', 'carga_verificadores', 'generacion_portafolios'];
        
        const estados = {};
        modulos.forEach(modulo => {
            const checkbox = document.getElementById(modulo);
            if (checkbox) {
                estados[modulo] = checkbox.checked;
            }
        });

        try {
            this.core.mostrarCargando();
            await this.data.guardarEstadosCiclo(cicloId, estados);
            $('#modalEstados').modal('hide');

        } catch (error) {
            // Error al guardar estados
            if (typeof toastr !== 'undefined') {
                toastr.error(error.message || 'Error al guardar los estados del ciclo');
            }
        } finally {
            this.core.ocultarCargando();
        }
    }

    /**
     * Confirmar cambio de estado de ciclo (método unificado)
     */
    confirmarCambiarEstado(cicloId, nuevoEstado, accion) {
        const configuraciones = {
            'inicializacion': {
                titulo: '¿Inicializar Ciclo Académico?',
                mensaje: `
                    <p>Al inicializar este ciclo:</p>
                    <ul class="text-left">
                        <li>Se preparará el ciclo para su activación</li>
                        <li>Se configurarán los módulos del sistema</li>
                        <li>Se establecerán las fechas de inicialización</li>
                    </ul>
                    <p><strong>¿Está seguro de continuar?</strong></p>
                `,
                tipo: 'info'
            },
            'activo': {
                titulo: '¿Activar Ciclo Académico?',
                mensaje: `
                    <p>Al activar este ciclo:</p>
                    <ul class="text-left">
                        <li>Se desactivará cualquier ciclo activo actual</li>
                        <li>Se habilitará el módulo de carga de datos</li>
                        <li>Los usuarios podrán comenzar a cargar información</li>
                    </ul>
                    <p><strong>¿Está seguro de continuar?</strong></p>
                `,
                tipo: 'question'
            },
            'verificacion': {
                titulo: '¿Iniciar Verificación?',
                mensaje: `
                    <p>Al iniciar la verificación:</p>
                    <ul class="text-left">
                        <li>Se bloqueará la carga de nuevos datos</li>
                        <li>Se habilitará el proceso de verificación</li>
                        <li>Los verificadores podrán revisar portafolios</li>
                    </ul>
                    <p><strong>¿Está seguro de continuar?</strong></p>
                `,
                tipo: 'info'
            },
            'finalizacion': {
                titulo: '¿Finalizar Ciclo Académico?',
                mensaje: `
                    <p>Al finalizar este ciclo:</p>
                    <ul class="text-left">
                        <li>Se cerrará definitivamente el ciclo</li>
                        <li>Se bloqueará cualquier modificación</li>
                        <li>Se registrará la fecha de cierre</li>
                    </ul>
                    <p><strong>¿Está seguro de continuar?</strong></p>
                `,
                tipo: 'warning'
            },
            'archivado': {
                titulo: '¿Archivar Ciclo Académico?',
                mensaje: `
                    <p>Al archivar este ciclo:</p>
                    <ul class="text-left">
                        <li>Se moverá a estado archivado</li>
                        <li>Se mantendrán todos los datos</li>
                        <li>Solo será visible en el historial</li>
                    </ul>
                    <p><strong>¿Está seguro de continuar?</strong></p>
                `,
                tipo: 'info'
            },
            'preparacion': {
                titulo: '¿Volver a Preparación?',
                mensaje: `
                    <p>Al volver a preparación:</p>
                    <ul class="text-left">
                        <li>Se permitirá editar la configuración</li>
                        <li>Se deshabilitarán los módulos activos</li>
                        <li>Se podrá modificar el ciclo nuevamente</li>
                    </ul>
                    <p><strong>¿Está seguro de continuar?</strong></p>
                `,
                tipo: 'warning'
            }
        };

        const config = configuraciones[nuevoEstado] || {
            titulo: `¿${accion}?`,
            mensaje: `<p>¿Está seguro de que desea ${accion.toLowerCase()}?</p>`,
            tipo: 'question'
        };

        this.ui.mostrarConfirmacion(
            config.titulo,
            config.mensaje,
            () => this.cambiarEstadoCiclo(cicloId, nuevoEstado),
            config.tipo
        );
    }

    /**
     * Confirmar activación de ciclo (método legacy)
     */
    confirmarActivarCiclo(cicloId) {
        this.confirmarCambiarEstado(cicloId, 'activo', 'Activar Ciclo');
    }

    /**
     * Confirmar cierre de ciclo (método legacy)
     */
    confirmarCerrarCiclo(cicloId) {
        this.confirmarCambiarEstado(cicloId, 'finalizacion', 'Finalizar Ciclo');
    }

    /**
     * Confirmar eliminación de ciclo
     */
    confirmarEliminarCiclo(cicloId) {
        const mensaje = `
            <p><strong>¡ATENCIÓN!</strong> Esta acción eliminará permanentemente:</p>
            <ul class="text-left">
                <li>Todos los datos del ciclo académico</li>
                <li>Información de portafolios asociados</li>
                <li>Registros de carga de datos</li>
            </ul>
            <p><strong>Esta acción NO se puede deshacer.</strong></p>
        `;

        this.ui.mostrarConfirmacion(
            '¿Eliminar Ciclo Académico?',
            mensaje,
            () => this.eliminarCiclo(cicloId),
            'error'
        );
    }

    /**
     * Cambiar estado de ciclo (método unificado)
     */
    async cambiarEstadoCiclo(cicloId, nuevoEstado) {
        try {
            const acciones = {
                 'inicializacion': {
                     metodo: 'cambiarEstadoCiclo',
                     estado: 'inicializacion',
                     mensaje: 'Inicializando ciclo...',
                     exito: 'Ciclo inicializado correctamente'
                 },
                 'activo': {
                     metodo: 'inicializarCiclo',
                     mensaje: 'Activando ciclo...',
                     exito: 'Ciclo activado correctamente'
                 },
                 'verificacion': {
                     metodo: 'cambiarEstadoCiclo',
                     estado: 'verificacion',
                     mensaje: 'Iniciando verificación...',
                     exito: 'Verificación iniciada correctamente'
                 },
                 'finalizacion': {
                     metodo: 'cambiarEstadoCiclo',
                     estado: 'finalizacion',
                     mensaje: 'Finalizando ciclo...',
                     exito: 'Ciclo finalizado correctamente'
                 },
                 'archivado': {
                     metodo: 'cambiarEstadoCiclo',
                     estado: 'archivado',
                     mensaje: 'Archivando ciclo...',
                     exito: 'Ciclo archivado correctamente'
                 },
                 'preparacion': {
                     metodo: 'cambiarEstadoCiclo',
                     estado: 'preparacion',
                     mensaje: 'Volviendo a preparación...',
                     exito: 'Ciclo vuelto a preparación correctamente'
                 }
             };

            const accion = acciones[nuevoEstado];
            if (!accion) {
                throw new Error(`Estado no válido: ${nuevoEstado}`);
            }

            this.core.mostrarCargando();
             
             let response;
             if (accion.estado) {
                 response = await this.data[accion.metodo](cicloId, accion.estado);
             } else {
                 response = await this.data[accion.metodo](cicloId);
             }
            
            if (typeof toastr !== 'undefined') {
                toastr.success(response.message || accion.exito);
            }

            await this.ui.actualizarTabla();
            await this.data.cargarCicloActivo();
            
            // Emitir evento de cambio de ciclo si es activación
            if (nuevoEstado === 'activo') {
                window.dispatchEvent(new CustomEvent('cicloActivoChanged', {
                    detail: { cicloId: cicloId }
                }));
            }

        } catch (error) {
            // Error al cambiar estado
            if (typeof toastr !== 'undefined') {
                toastr.error(error.message || `Error al cambiar estado del ciclo`);
            }
        } finally {
            this.core.ocultarCargando();
        }
    }

    /**
     * Activar ciclo (método legacy)
     */
    async activarCiclo(cicloId) {
        return await this.cambiarEstadoCiclo(cicloId, 'activo');
    }

    /**
     * Cerrar ciclo (método legacy)
     */
    async cerrarCiclo(cicloId) {
        return await this.cambiarEstadoCiclo(cicloId, 'finalizacion');
    }

    /**
     * Eliminar ciclo
     */
    async eliminarCiclo(cicloId) {
        try {
            this.core.mostrarCargando();
            const response = await this.data.eliminarCiclo(cicloId);

            if (typeof toastr !== 'undefined') {
                toastr.success(response.message || 'Ciclo académico eliminado exitosamente');
            }

            await this.ui.actualizarTabla();
            await this.data.cargarCicloActivo();

        } catch (error) {
            // Error al eliminar ciclo
            if (typeof toastr !== 'undefined') {
                toastr.error(error.message || 'Error al eliminar el ciclo académico');
            }
        } finally {
            this.core.ocultarCargando();
        }
    }

    /**
     * Validar campo individual
     */
    validarCampo(campo) {
        const valor = campo.value.trim();
        const esRequerido = campo.hasAttribute('required');

        if (esRequerido && !valor) {
            campo.classList.add('is-invalid');
            campo.classList.remove('is-valid');
        } else if (valor) {
            campo.classList.add('is-valid');
            campo.classList.remove('is-invalid');
        } else {
            campo.classList.remove('is-invalid', 'is-valid');
        }
    }

    /**
     * Logging para desarrollo
     */
    log(...args) {
        if (this.debug) {
            // [CiclosEventos]
        }
    }

    /**
     * Limpiar eventos
     */
    destruir() {
        // Remover listeners de eventos personalizados
        document.removeEventListener('cicloActivoCambiado', this.manejarCambiosCiclo);
        document.removeEventListener('cicloActivoPerdido', this.manejarPerdiaCiclo);
        document.removeEventListener('ciclosEstadosCargados', this.manejarEstadosCargados);
        document.removeEventListener('ciclosEstadosGuardados', this.manejarEstadosGuardados);
        
        this.log('Eventos destruidos');
    }
}