/**
 * Generación de Portafolios - Panel Administrador
 * Maneja la generación y gestión de portafolios desde el dashboard del administrador
 */

class GeneracionPortafoliosAdmin {
    constructor() {
        this.portafolios = [];
        this.filtros = {
            ciclo: null,
            estado: null,
            docente: null
        };
        this.inicializado = false;
    }

    /**
     * Inicializar el módulo
     */
    async inicializar() {
        if (this.inicializado) return;

        console.log('🔧 Inicializando generación de portafolios - Admin');

        try {
            this.configurarEventos();
            await this.cargarPortafolios();
            this.actualizarInterfaz();
            
            this.inicializado = true;
            console.log('✅ Generación de portafolios Admin inicializado');

        } catch (error) {
            console.error('❌ Error inicializando generación de portafolios:', error);
        }
    }

    /**
     * Configurar eventos
     */
    configurarEventos() {
        // Botón generar portafolios
        const btnGenerar = document.getElementById('btnGenerarPortafolios');
        if (btnGenerar) {
            btnGenerar.addEventListener('click', () => this.generarPortafolios());
        }

        // Botón inicializar portafolios
        const btnInicializar = document.getElementById('btnInicializarPortafolios');
        if (btnInicializar) {
            btnInicializar.addEventListener('click', () => this.inicializarSistemaPortafolios());
        }

        // Selector de ciclo
        const selectCiclo = document.getElementById('selectCiclo');
        if (selectCiclo) {
            selectCiclo.addEventListener('change', (e) => {
                this.filtros.ciclo = e.target.value;
                this.cargarPortafolios();
            });
        }

        // Escuchar eventos del sistema
        document.addEventListener('ciclo-cambiado', (e) => {
            // Solo mostrar en modo debug
            if (window.CONFIG?.DEBUG) {
                console.log('📅 Generación Portafolios Admin - Ciclo cambiado:', e.detail.cicloId);
            }
            this.filtros.ciclo = e.detail.cicloId;
            this.cargarPortafolios();
        });

        // Escuchar eventos coordinados de ciclo
        document.addEventListener('cicloCoordinado', (e) => {
            // Solo mostrar en modo debug
            if (window.CONFIG?.DEBUG) {
                console.log('📅 Generación Portafolios Admin - Evento coordinado:', e.detail.cicloId);
            }
            this.filtros.ciclo = e.detail.cicloId;
            this.cargarPortafolios();
        });

        // Escuchar cambios de ciclo activo
        document.addEventListener('cicloActivoCambiado', (e) => {
            // Solo mostrar en modo debug
            if (window.CONFIG?.DEBUG) {
                console.log('📅 Generación Portafolios Admin - Ciclo activo cambiado:', e.detail);
            }
            if (e.detail && e.detail.id) {
                this.filtros.ciclo = e.detail.id;
                this.cargarPortafolios();
            }
        });
    }

    /**
     * Cargar portafolios desde el backend
     */
    async cargarPortafolios() {
        try {
            // Solo mostrar en modo debug
        if (window.CONFIG?.DEBUG) {
            console.log('📥 Cargando portafolios...');
        }

            const params = new URLSearchParams();
            if (this.filtros.ciclo) params.append('ciclo', this.filtros.ciclo);
            if (this.filtros.estado) params.append('estado', this.filtros.estado);
            if (this.filtros.docente) params.append('docente', this.filtros.docente);

            const url = `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DASHBOARD}/portafolios${params.toString() ? '?' + params.toString() : ''}`;
            
            const response = await fetch(url, {
                headers: window.AUTH.construirHeaders()
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.portafolios = data.data.portafolios || [];
                this.actualizarInterfaz();
                this.actualizarEstadisticas(data.data);
                // Solo mostrar si hay portafolios o en modo debug
        if (this.portafolios.length > 0 || window.CONFIG?.DEBUG) {
            console.log(`✅ ${this.portafolios.length} portafolios cargados`);
        }
            } else {
                throw new Error(data.message || 'Error al cargar portafolios');
            }

        } catch (error) {
            console.error('❌ Error cargando portafolios:', error);
            this.mostrarError('Error al cargar portafolios: ' + error.message);
        }
    }

    /**
     * Generar portafolios automáticamente
     */
    async generarPortafolios() {
        if (!this.filtros.ciclo) {
            this.mostrarError('Debe seleccionar un ciclo académico');
            return;
        }

        const confirmacion = confirm('¿Está seguro de generar portafolios para todas las asignaciones del ciclo seleccionado?');
        if (!confirmacion) return;

        try {
            console.log('🔄 Generando portafolios...');
            
            const btnGenerar = document.getElementById('btnGenerarPortafolios');
            if (btnGenerar) {
                btnGenerar.disabled = true;
                btnGenerar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
            }

            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.PORTAFOLIOS}/generar`, {
                method: 'POST',
                headers: {
                    ...window.AUTH.construirHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cicloId: this.filtros.ciclo
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.mostrarExito(`Portafolios generados exitosamente. Se crearon ${data.data.portafoliosCreados || 0} portafolios.`);
                await this.cargarPortafolios(); // Recargar para mostrar los nuevos
            } else {
                throw new Error(data.message || 'Error al generar portafolios');
            }

        } catch (error) {
            console.error('❌ Error generando portafolios:', error);
            this.mostrarError('Error al generar portafolios: ' + error.message);
        } finally {
            const btnGenerar = document.getElementById('btnGenerarPortafolios');
            if (btnGenerar) {
                btnGenerar.disabled = false;
                btnGenerar.innerHTML = '<i class="fas fa-magic"></i> Generar Portafolios';
            }
        }
    }

    /**
     * Inicializar sistema de portafolios
     */
    async inicializarSistemaPortafolios() {
        if (!this.filtros.ciclo) {
            this.mostrarError('Debe seleccionar un ciclo académico');
            return;
        }

        const confirmacion = confirm('¿Está seguro de inicializar el sistema de portafolios? Esto creará las estructuras base necesarias.');
        if (!confirmacion) return;

        try {
            console.log('⚙️ Inicializando sistema de portafolios...');
            
            const btnInicializar = document.getElementById('btnInicializarPortafolios');
            if (btnInicializar) {
                btnInicializar.disabled = true;
                btnInicializar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inicializando...';
            }

            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.PORTAFOLIOS}/inicializar`, {
                method: 'POST',
                headers: {
                    ...window.AUTH.construirHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cicloId: this.filtros.ciclo
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.mostrarExito('Sistema de portafolios inicializado correctamente');
                await this.cargarPortafolios(); // Recargar datos
            } else {
                throw new Error(data.message || 'Error al inicializar sistema');
            }

        } catch (error) {
            console.error('❌ Error inicializando sistema:', error);
            this.mostrarError('Error al inicializar sistema: ' + error.message);
        } finally {
            const btnInicializar = document.getElementById('btnInicializarPortafolios');
            if (btnInicializar) {
                btnInicializar.disabled = false;
                btnInicializar.innerHTML = '<i class="fas fa-folder-plus"></i> Inicializar Portafolios';
            }
        }
    }

    /**
     * Actualizar interfaz
     */
    actualizarInterfaz() {
        this.actualizarTablaPortafolios();
        this.actualizarContadores();
    }

    /**
     * Actualizar tabla de portafolios
     */
    actualizarTablaPortafolios() {
        const tabla = document.querySelector('#tablaPortafolios tbody, .tabla-portafolios tbody, .lista-portafolios');
        if (!tabla) return;

        if (this.portafolios.length === 0) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="100%" class="text-center">
                        <div class="no-data">
                            <i class="fas fa-folder-open"></i>
                            <p>No hay portafolios generados para el ciclo seleccionado</p>
                            <button class="btn btn-primary" onclick="window.GeneracionPortafoliosAdmin.generarPortafolios()">
                                <i class="fas fa-magic"></i> Generar Portafolios
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        this.portafolios.forEach(portafolio => {
            html += this.generarFilaPortafolio(portafolio);
        });

        tabla.innerHTML = html;
    }

    /**
     * Generar fila de portafolio
     */
    generarFilaPortafolio(portafolio) {
        const docente = portafolio.docente || {};
        const asignatura = portafolio.asignatura || {};
        const ciclo = portafolio.ciclo || {};
        
        return `
            <tr data-portafolio-id="${portafolio.id}">
                <td>
                    <div class="docente-info">
                        <strong>${docente.nombres || ''} ${docente.apellidos || ''}</strong>
                        <small class="text-muted d-block">${docente.correo || ''}</small>
                    </div>
                </td>
                <td>
                    <div class="asignatura-info">
                        <strong>${asignatura.nombre || 'Sin asignatura'}</strong>
                        <small class="text-muted d-block">Código: ${asignatura.codigo || 'N/A'}</small>
                    </div>
                </td>
                <td>
                    <span class="badge badge-${this.obtenerColorEstado(portafolio.estado)}">
                        ${this.formatearEstado(portafolio.estado)}
                    </span>
                </td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar" role="progressbar" 
                             style="width: ${portafolio.progreso_completado || 0}%"
                             aria-valuenow="${portafolio.progreso_completado || 0}" 
                             aria-valuemin="0" aria-valuemax="100">
                            ${portafolio.progreso_completado || 0}%
                        </div>
                    </div>
                </td>
                <td>
                    <span class="text-muted">
                        ${ciclo.nombre || 'Sin ciclo'}
                    </span>
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="window.GeneracionPortafoliosAdmin.verPortafolio(${portafolio.id})" title="Ver portafolio">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="window.GeneracionPortafoliosAdmin.editarPortafolio(${portafolio.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.GeneracionPortafoliosAdmin.eliminarPortafolio(${portafolio.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    /**
     * Actualizar estadísticas
     */
    actualizarEstadisticas(data) {
        if (!data.resumen) return;

        // Actualizar resumen por estado
        Object.entries(data.resumen.porEstado || {}).forEach(([estado, cantidad]) => {
            const elemento = document.getElementById(`stat-${estado}`);
            if (elemento) {
                elemento.textContent = cantidad;
            }
        });

        // Actualizar total
        const totalElement = document.getElementById('stat-total-portafolios');
        if (totalElement) {
            totalElement.textContent = data.filtros?.totalEncontrados || 0;
        }
    }

    /**
     * Actualizar contadores
     */
    actualizarContadores() {
        const contadores = {
            total: this.portafolios.length,
            activos: this.portafolios.filter(p => p.estado === 'activo').length,
            pendientes: this.portafolios.filter(p => p.estado === 'pendiente').length,
            completados: this.portafolios.filter(p => p.estado === 'completado').length
        };

        Object.entries(contadores).forEach(([key, value]) => {
            const elemento = document.getElementById(`contador-${key}`);
            if (elemento) {
                elemento.textContent = value;
            }
        });
    }

    /**
     * Ver portafolio específico
     */
    verPortafolio(portafolioId) {
        console.log(`👁️ Viendo portafolio ${portafolioId}`);
        // Implementar vista detallada del portafolio
        window.open(`portafolio-detalle.html?id=${portafolioId}`, '_blank');
    }

    /**
     * Editar portafolio
     */
    editarPortafolio(portafolioId) {
        console.log(`✏️ Editando portafolio ${portafolioId}`);
        // Implementar edición de portafolio
    }

    /**
     * Eliminar portafolio
     */
    async eliminarPortafolio(portafolioId) {
        const confirmacion = confirm('¿Está seguro de eliminar este portafolio? Esta acción no se puede deshacer.');
        if (!confirmacion) return;

        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.PORTAFOLIOS}/${portafolioId}`, {
                method: 'DELETE',
                headers: window.AUTH.construirHeaders()
            });

            if (response.ok) {
                this.mostrarExito('Portafolio eliminado correctamente');
                await this.cargarPortafolios();
            } else {
                throw new Error('Error al eliminar portafolio');
            }

        } catch (error) {
            console.error('❌ Error eliminando portafolio:', error);
            this.mostrarError('Error al eliminar portafolio');
        }
    }

    /**
     * Obtener color de estado
     */
    obtenerColorEstado(estado) {
        const colores = {
            'activo': 'success',
            'pendiente': 'warning',
            'completado': 'primary',
            'archivado': 'secondary',
            'inactivo': 'danger'
        };
        return colores[estado] || 'secondary';
    }

    /**
     * Formatear estado
     */
    formatearEstado(estado) {
        const estados = {
            'activo': 'Activo',
            'pendiente': 'Pendiente',
            'completado': 'Completado',
            'archivado': 'Archivado',
            'inactivo': 'Inactivo'
        };
        return estados[estado] || estado;
    }

    /**
     * Mostrar mensaje de éxito
     */
    mostrarExito(mensaje) {
        if (window.mostrarNotificacion) {
            window.mostrarNotificacion(mensaje, 'success');
        } else {
            alert('✅ ' + mensaje);
        }
    }

    /**
     * Mostrar mensaje de error
     */
    mostrarError(mensaje) {
        if (window.mostrarNotificacion) {
            window.mostrarNotificacion(mensaje, 'error');
        } else {
            alert('❌ ' + mensaje);
        }
    }
}

// Instancia global
window.GeneracionPortafoliosAdmin = new GeneracionPortafoliosAdmin();

// Auto-inicializar cuando se carga el DOM
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin')) {
        window.GeneracionPortafoliosAdmin.inicializar();
    }
}); 