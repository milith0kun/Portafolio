/**
 * Script para la página de Portafolios del Verificador
 * Maneja la visualización y gestión de portafolios asignados para verificación
 */

class PortafoliosVerificador {
    constructor() {
        this.portafolios = [];
        this.tabla = null;
        this.filtros = {
            docente: '',
            asignatura: '',
            estado: '',
            progreso: ''
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('🚀 Inicializando Portafolios Verificador...');
            
            // Verificar autenticación
            await this.verificarAutenticacion();
            
            // Cargar datos iniciales
            await this.cargarDatos();
            
            // Inicializar DataTable
            this.inicializarTabla();
            
            // Configurar eventos
            this.configurarEventos();
            
            console.log('✅ Portafolios Verificador inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando Portafolios Verificador:', error);
            this.mostrarError('Error al cargar la página', error.message);
        }
    }

    async verificarAutenticacion() {
        const usuario = Auth.obtenerUsuario();
        
        if (!usuario) {
            window.location.href = '/paginas/autenticacion/login.html';
            return;
        }

        if (!usuario.rol || usuario.rol !== 'verificador') {
            this.mostrarError('Acceso Denegado', 'No tienes permisos para acceder a esta sección');
            setTimeout(() => {
                window.location.href = '/paginas/dashboard/verificador/tablero.html';
            }, 2000);
            return;
        }

        // Mostrar información del usuario
        document.getElementById('nombreUsuario').textContent = 
            `${usuario.nombre} ${usuario.apellido}`;
    }

    async cargarDatos() {
        try {
            this.mostrarCargando(true);
            
            // Cargar portafolios asignados
            await this.cargarPortafolios();
            
            // Cargar estadísticas
            await this.cargarEstadisticas();
            
            // Poblar filtros
            this.poblarFiltros();
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            throw error;
        } finally {
            this.mostrarCargando(false);
        }
    }

    async cargarPortafolios() {
        try {
            const response = await fetch('/api/verificaciones/portafolios', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${Auth.obtenerToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            this.portafolios = data.data || [];
            
            console.log(`📁 ${this.portafolios.length} portafolios cargados`);
            
        } catch (error) {
            console.error('❌ Error cargando portafolios:', error);
            throw error;
        }
    }

    async cargarEstadisticas() {
        try {
            const response = await fetch('/api/verificaciones/estadisticas', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${Auth.obtenerToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const stats = data.data;
            
            // Actualizar contadores
            document.getElementById('totalPortafolios').textContent = stats.portafoliosAsignados || 0;
            document.getElementById('documentosPendientes').textContent = stats.pendientes || 0;
            document.getElementById('documentosAprobados').textContent = stats.aprobados || 0;
            document.getElementById('documentosObservados').textContent = 
                (stats.rechazados || 0) + (stats.observaciones || 0);
            
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
            // No lanzar error, estadísticas son opcionales
        }
    }

    poblarFiltros() {
        try {
            // Obtener valores únicos
            const docentes = [...new Set(this.portafolios.map(p => 
                `${p.docente.nombre} ${p.docente.apellido}`
            ))].sort();
            
            const asignaturas = [...new Set(this.portafolios.map(p => 
                `${p.asignatura.codigo} - ${p.asignatura.nombre}`
            ))].sort();

            // Poblar select de docentes
            const selectDocente = document.getElementById('filtroDocente');
            selectDocente.innerHTML = '<option value="">Todos los docentes</option>';
            docentes.forEach(docente => {
                const option = document.createElement('option');
                option.value = docente;
                option.textContent = docente;
                selectDocente.appendChild(option);
            });

            // Poblar select de asignaturas
            const selectAsignatura = document.getElementById('filtroAsignatura');
            selectAsignatura.innerHTML = '<option value="">Todas las asignaturas</option>';
            asignaturas.forEach(asignatura => {
                const option = document.createElement('option');
                option.value = asignatura;
                option.textContent = asignatura;
                selectAsignatura.appendChild(option);
            });

        } catch (error) {
            console.error('❌ Error poblando filtros:', error);
        }
    }

    inicializarTabla() {
        try {
            // Preparar datos para la tabla
            const datosTabla = this.portafolios.map(portafolio => [
                `${portafolio.docente.nombre} ${portafolio.docente.apellido}`,
                `${portafolio.asignatura.codigo} - ${portafolio.asignatura.nombre}`,
                portafolio.asignatura.carrera_info?.nombre || 'No especificada',
                this.generarBarraProgreso(portafolio.progreso || 0),
                this.generarBadgeEstado(portafolio.estado),
                this.generarEstadisticasDocumentos(portafolio.estadisticas),
                this.formatearFecha(portafolio.fechaActualizacion),
                this.generarBotonesAccion(portafolio.id)
            ]);

            // Configurar DataTable
            this.tabla = $('#tablaPortafolios').DataTable({
                data: datosTabla,
                language: {
                    url: '../../../assets/js/datatables-es.json'
                },
                responsive: true,
                pageLength: 10,
                lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
                order: [[6, 'desc']], // Ordenar por fecha de actualización
                columnDefs: [
                    {
                        targets: [3, 4, 5, 7], // Progreso, Estado, Documentos, Acciones
                        orderable: false
                    },
                    {
                        targets: [7], // Columna de acciones
                        className: 'text-center'
                    }
                ],
                drawCallback: () => {
                    this.configurarEventosTabla();
                }
            });

            console.log('📊 Tabla inicializada con DataTables');

        } catch (error) {
            console.error('❌ Error inicializando tabla:', error);
        }
    }

    generarBarraProgreso(progreso) {
        const porcentaje = Math.round(progreso);
        let clase = 'bg-danger';
        
        if (porcentaje >= 75) clase = 'bg-success';
        else if (porcentaje >= 50) clase = 'bg-warning';
        else if (porcentaje >= 25) clase = 'bg-info';

        return `
            <div class="progress" style="height: 20px;">
                <div class="progress-bar ${clase}" role="progressbar" 
                     style="width: ${porcentaje}%" 
                     aria-valuenow="${porcentaje}" 
                     aria-valuemin="0" 
                     aria-valuemax="100">
                    ${porcentaje}%
                </div>
            </div>
        `;
    }

    generarBadgeEstado(estado) {
        const estados = {
            'pendiente': { clase: 'bg-warning text-dark', texto: 'Pendiente' },
            'en_revision': { clase: 'bg-info', texto: 'En Revisión' },
            'completado': { clase: 'bg-success', texto: 'Completado' },
            'observado': { clase: 'bg-danger', texto: 'Con Observaciones' }
        };

        const config = estados[estado] || { clase: 'bg-secondary', texto: 'Sin Estado' };
        
        return `<span class="badge ${config.clase}">${config.texto}</span>`;
    }

    generarEstadisticasDocumentos(stats) {
        if (!stats) return '<span class="text-muted">Sin datos</span>';

        return `
            <div class="doc-stats">
                <small class="d-block">
                    <i class="fas fa-file text-primary"></i> Total: ${stats.total}
                </small>
                <small class="d-block">
                    <i class="fas fa-clock text-warning"></i> Pendientes: ${stats.pendientes}
                </small>
                <small class="d-block">
                    <i class="fas fa-check text-success"></i> Aprobados: ${stats.aprobados}
                </small>
                ${stats.rechazados + stats.observaciones > 0 ? 
                    `<small class="d-block">
                        <i class="fas fa-exclamation text-danger"></i> Observados: ${stats.rechazados + stats.observaciones}
                    </small>` : ''
                }
            </div>
        `;
    }

    formatearFecha(fecha) {
        if (!fecha) return 'No disponible';
        
        return new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    generarBotonesAccion(portafolioId) {
        return `
            <div class="btn-group btn-group-sm" role="group">
                <button type="button" 
                        class="btn btn-primary btn-ver-detalle" 
                        data-portafolio-id="${portafolioId}"
                        title="Ver detalles">
                    <i class="fas fa-eye"></i>
                </button>
                <button type="button" 
                        class="btn btn-success btn-verificar" 
                        data-portafolio-id="${portafolioId}"
                        title="Verificar documentos">
                    <i class="fas fa-clipboard-check"></i>
                </button>
            </div>
        `;
    }

    configurarEventos() {
        // Botón actualizar datos
        window.actualizarDatos = () => {
            this.cargarDatos();
        };

        // Función para aplicar filtros
        window.aplicarFiltros = () => {
            this.aplicarFiltros();
        };

        // Función para limpiar filtros
        window.limpiarFiltros = () => {
            this.limpiarFiltros();
        };

        // Función para exportar datos
        window.exportarDatos = () => {
            this.exportarDatos();
        };

        // Función para cerrar sesión
        window.cerrarSesion = () => {
            Auth.cerrarSesion();
        };

        // Función para abrir verificación
        window.abrirVerificacion = () => {
            const portafolioId = this.portafolioSeleccionado;
            if (portafolioId) {
                window.location.href = `pendientes.html?portafolio=${portafolioId}`;
            }
        };
    }

    configurarEventosTabla() {
        // Botones ver detalle
        document.querySelectorAll('.btn-ver-detalle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const portafolioId = e.currentTarget.dataset.portafolioId;
                this.mostrarDetallePortafolio(portafolioId);
            });
        });

        // Botones verificar
        document.querySelectorAll('.btn-verificar').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const portafolioId = e.currentTarget.dataset.portafolioId;
                this.irAVerificacion(portafolioId);
            });
        });
    }

    async mostrarDetallePortafolio(portafolioId) {
        try {
            const portafolio = this.portafolios.find(p => p.id == portafolioId);
            if (!portafolio) {
                throw new Error('Portafolio no encontrado');
            }

            // Cargar documentos del portafolio
            const documentos = await this.cargarDocumentosPortafolio(portafolioId);
            
            // Llenar modal con información
            this.llenarModalDetalle(portafolio, documentos);
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('modalDetallePortafolio'));
            modal.show();
            
            this.portafolioSeleccionado = portafolioId;

        } catch (error) {
            console.error('❌ Error mostrando detalle:', error);
            this.mostrarError('Error', 'No se pudo cargar el detalle del portafolio');
        }
    }

    async cargarDocumentosPortafolio(portafolioId) {
        try {
            const response = await fetch(`/api/verificaciones/portafolios/${portafolioId}/documentos`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${Auth.obtenerToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data;

        } catch (error) {
            console.error('❌ Error cargando documentos:', error);
            throw error;
        }
    }

    llenarModalDetalle(portafolio, documentos) {
        // Información básica
        document.getElementById('modalTituloPortafolio').textContent = 
            `${portafolio.docente.nombre} ${portafolio.docente.apellido}`;
        
        document.getElementById('modalDocenteNombre').textContent = 
            `${portafolio.docente.nombre} ${portafolio.docente.apellido}`;
        document.getElementById('modalDocenteEmail').textContent = portafolio.docente.email;
        
        document.getElementById('modalAsignaturaCodigo').textContent = portafolio.asignatura.codigo;
        document.getElementById('modalAsignaturaNombre').textContent = portafolio.asignatura.nombre;
        document.getElementById('modalAsignaturaCreditos').textContent = portafolio.asignatura.creditos;

        // Estadísticas
        const stats = documentos.estadisticasGenerales;
        document.getElementById('modalTotalArchivos').textContent = stats.totalArchivos;
        document.getElementById('modalPendientes').textContent = stats.pendientes;
        document.getElementById('modalAprobados').textContent = stats.aprobados;
        document.getElementById('modalObservados').textContent = 
            stats.rechazados + stats.observaciones;

        // Carpetas
        this.mostrarCarpetasEnModal(documentos.carpetas);
    }

    mostrarCarpetasEnModal(carpetas) {
        const container = document.getElementById('modalCarpetasContainer');
        
        if (!carpetas || Object.keys(carpetas).length === 0) {
            container.innerHTML = '<p class="text-muted">No hay documentos disponibles</p>';
            return;
        }

        let html = '';
        Object.entries(carpetas).forEach(([nombreCarpeta, archivos]) => {
            const pendientes = archivos.filter(a => a.estadoVerificacion === 'pendiente').length;
            const aprobados = archivos.filter(a => a.estadoVerificacion === 'aprobado').length;
            const observados = archivos.filter(a => 
                ['rechazado', 'observacion'].includes(a.estadoVerificacion)
            ).length;

            html += `
                <div class="carpeta-item mb-3">
                    <div class="carpeta-header">
                        <h6><i class="fas fa-folder"></i> ${nombreCarpeta}</h6>
                        <small class="text-muted">${archivos.length} archivo(s)</small>
                    </div>
                    <div class="carpeta-stats">
                        <span class="badge bg-warning">${pendientes} pendientes</span>
                        <span class="badge bg-success">${aprobados} aprobados</span>
                        ${observados > 0 ? `<span class="badge bg-danger">${observados} observados</span>` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    irAVerificacion(portafolioId) {
        window.location.href = `pendientes.html?portafolio=${portafolioId}`;
    }

    aplicarFiltros() {
        // Obtener valores de filtros
        this.filtros.docente = document.getElementById('filtroDocente').value;
        this.filtros.asignatura = document.getElementById('filtroAsignatura').value;
        this.filtros.estado = document.getElementById('filtroEstado').value;
        this.filtros.progreso = document.getElementById('filtroProgreso').value;

        // Aplicar filtros a la tabla
        if (this.tabla) {
            this.tabla.search('').draw(); // Limpiar búsqueda general
            
            // Aplicar filtros personalizados
            $.fn.dataTable.ext.search.push((settings, data, dataIndex) => {
                return this.evaluarFiltros(data);
            });
            
            this.tabla.draw();
            
            // Limpiar función de filtro personalizada
            $.fn.dataTable.ext.search.pop();
        }

        this.mostrarToast('Filtros aplicados correctamente', 'success');
    }

    evaluarFiltros(data) {
        // data[0] = Docente, data[1] = Asignatura, data[2] = Carrera, etc.
        
        if (this.filtros.docente && !data[0].includes(this.filtros.docente)) {
            return false;
        }
        
        if (this.filtros.asignatura && !data[1].includes(this.filtros.asignatura)) {
            return false;
        }
        
        if (this.filtros.estado) {
            const estadoTexto = $(data[4]).text().toLowerCase();
            const filtroEstado = this.filtros.estado.toLowerCase();
            if (!estadoTexto.includes(filtroEstado)) {
                return false;
            }
        }
        
        if (this.filtros.progreso) {
            const progreso = this.extraerProgreso(data[3]);
            if (!this.evaluarRangoProgreso(progreso, this.filtros.progreso)) {
                return false;
            }
        }
        
        return true;
    }

    extraerProgreso(htmlProgreso) {
        const match = htmlProgreso.match(/(\d+)%/);
        return match ? parseInt(match[1]) : 0;
    }

    evaluarRangoProgreso(progreso, rango) {
        switch (rango) {
            case '0-25': return progreso >= 0 && progreso <= 25;
            case '26-50': return progreso >= 26 && progreso <= 50;
            case '51-75': return progreso >= 51 && progreso <= 75;
            case '76-100': return progreso >= 76 && progreso <= 100;
            default: return true;
        }
    }

    limpiarFiltros() {
        document.getElementById('filtroDocente').value = '';
        document.getElementById('filtroAsignatura').value = '';
        document.getElementById('filtroEstado').value = '';
        document.getElementById('filtroProgreso').value = '';
        
        this.filtros = { docente: '', asignatura: '', estado: '', progreso: '' };
        
        if (this.tabla) {
            this.tabla.search('').draw();
        }

        this.mostrarToast('Filtros limpiados', 'info');
    }

    exportarDatos() {
        try {
            // Preparar datos para exportar
            const datosExport = this.portafolios.map(p => ({
                'Docente': `${p.docente.nombre} ${p.docente.apellido}`,
                'Email': p.docente.email,
                'Asignatura': `${p.asignatura.codigo} - ${p.asignatura.nombre}`,
                'Carrera': p.asignatura.carrera_info?.nombre || 'No especificada',
                'Progreso': `${p.progreso || 0}%`,
                'Estado': p.estado,
                'Total Documentos': p.estadisticas?.total || 0,
                'Pendientes': p.estadisticas?.pendientes || 0,
                'Aprobados': p.estadisticas?.aprobados || 0,
                'Observados': (p.estadisticas?.rechazados || 0) + (p.estadisticas?.observaciones || 0),
                'Última Actualización': this.formatearFecha(p.fechaActualizacion)
            }));

            // Convertir a CSV
            const csv = this.convertirACSV(datosExport);
            
            // Descargar archivo
            this.descargarCSV(csv, `portafolios_verificador_${new Date().toISOString().split('T')[0]}.csv`);
            
            this.mostrarToast('Datos exportados correctamente', 'success');

        } catch (error) {
            console.error('❌ Error exportando datos:', error);
            this.mostrarError('Error', 'No se pudieron exportar los datos');
        }
    }

    convertirACSV(datos) {
        if (datos.length === 0) return '';
        
        const headers = Object.keys(datos[0]);
        const csvContent = [
            headers.join(','),
            ...datos.map(row => headers.map(header => 
                `"${row[header]?.toString().replace(/"/g, '""') || ''}"`
            ).join(','))
        ].join('\n');
        
        return csvContent;
    }

    descargarCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    mostrarCargando(mostrar) {
        const overlay = document.querySelector('.loading-overlay');
        if (mostrar && !overlay) {
            const loadingHTML = `
                <div class="loading-overlay">
                    <div class="loading-content">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando...</span>
                        </div>
                        <p class="mt-2">Cargando datos...</p>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', loadingHTML);
        } else if (!mostrar && overlay) {
            overlay.remove();
        }
    }

    mostrarToast(mensaje, tipo = 'info') {
        // Implementar sistema de toast notifications
        console.log(`${tipo.toUpperCase()}: ${mensaje}`);
    }

    mostrarError(titulo, mensaje) {
        console.error(`${titulo}: ${mensaje}`);
        alert(`${titulo}\n${mensaje}`);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new PortafoliosVerificador();
}); 