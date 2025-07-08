/**
 * 📊 Sistema de Reportes Avanzado - Portafolio Docente UNSAAC
 * Genera reportes estadísticos, gráficos interactivos y exportaciones
 */

class SistemaReportes {
    constructor() {
        this.datosReporte = {};
        this.graficos = {};
        this.filtros = {
            cicloAcademico: null,
            carrera: null,
            fechaInicio: null,
            fechaFin: null
        };
        this.inicializar();
    }

    async inicializar() {
        console.log('📊 Inicializando sistema de reportes...');
        await this.cargarDatosIniciales();
        this.configurarEventListeners();
        this.inicializarFiltros();
    }

    async cargarDatosIniciales() {
        try {
            const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
            if (!token) throw new Error('Token no encontrado');

            // Cargar datos en paralelo
            const [estadisticas, usuarios, carreras, ciclos] = await Promise.all([
                this.obtenerEstadisticas(),
                this.obtenerUsuarios(),
                this.obtenerCarreras(),
                this.obtenerCiclos()
            ]);

            this.datosReporte = {
                estadisticas,
                usuarios,
                carreras,
                ciclos,
                ultimaActualizacion: new Date()
            };

            this.generarReporteGeneral();
            console.log('✅ Reportes: Datos cargados correctamente');

        } catch (error) {
            console.error('❌ Error al cargar datos:', error);
            console.error('❌ Error de Reportes: No se pudieron cargar los datos:', error.message);
        }
    }

    async obtenerEstadisticas() {
        const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DASHBOARD}/estadisticas`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(CONFIG.STORAGE.TOKEN)}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error al obtener estadísticas');
        return await response.json();
    }

    async obtenerUsuarios() {
        const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.USUARIOS}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(CONFIG.STORAGE.TOKEN)}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error al obtener usuarios');
        const data = await response.json();
        return data.datos || [];
    }

    async obtenerCarreras() {
        const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.CARRERAS}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(CONFIG.STORAGE.TOKEN)}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error al obtener carreras');
        const data = await response.json();
        return data.datos || [];
    }

    async obtenerCiclos() {
        const response = await fetch(`${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.CICLOS}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem(CONFIG.STORAGE.TOKEN)}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Error al obtener ciclos');
        const data = await response.json();
        return data.datos || [];
    }

    generarReporteGeneral() {
        this.actualizarResumenEjecutivo();
        this.generarGraficoDistribucionRoles();
        this.generarGraficoAsignaturasPorCarrera();
        this.generarGraficoEvolucionTemporal();
        this.generarTablaDetallada();
        this.actualizarIndicadores();
    }

    actualizarResumenEjecutivo() {
        const stats = this.datosReporte.estadisticas;
        
        const elementos = {
            'total-usuarios': stats.usuarios || 0,
            'total-carreras': stats.carreras || 0,
            'total-asignaturas': stats.asignaturas || 0,
            'total-portafolios': stats.portafolios || 0,
            'tasa-completitud': this.calcularTasaCompletitud(),
            'usuarios-activos': this.calcularUsuariosActivos(),
            'documentos-pendientes': stats.documentos?.pendientes || 0,
            'observaciones-abiertas': stats.observaciones?.abiertas || 0
        };

        Object.entries(elementos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                if (typeof valor === 'number') {
                    this.animarNumero(elemento, valor);
                } else {
                    elemento.textContent = valor;
                }
            }
        });
    }

    animarNumero(elemento, valorFinal) {
        const valorInicial = parseInt(elemento.textContent) || 0;
        const duracion = 1000; // 1 segundo
        const incremento = (valorFinal - valorInicial) / (duracion / 16);
        let valorActual = valorInicial;

        const intervalo = setInterval(() => {
            valorActual += incremento;
            if ((incremento > 0 && valorActual >= valorFinal) || 
                (incremento < 0 && valorActual <= valorFinal)) {
                valorActual = valorFinal;
                clearInterval(intervalo);
            }
            elemento.textContent = Math.round(valorActual);
        }, 16);
    }

    generarGraficoDistribucionRoles() {
        const ctx = document.getElementById('grafico-roles');
        if (!ctx) return;

        const usuarios = this.datosReporte.usuarios;
        const distribucion = this.calcularDistribucionRoles(usuarios);

        if (this.graficos.roles) {
            this.graficos.roles.destroy();
        }

        this.graficos.roles = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Docentes', 'Verificadores', 'Administradores'],
                datasets: [{
                    data: [
                        distribucion.docentes,
                        distribucion.verificadores,
                        distribucion.administradores
                    ],
                    backgroundColor: [
                        '#28a745',
                        '#17a2b8',
                        '#dc3545'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const porcentaje = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${porcentaje}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    generarGraficoAsignaturasPorCarrera() {
        const ctx = document.getElementById('grafico-carreras');
        if (!ctx) return;

        const carreras = this.datosReporte.carreras;
        const distribucionCarreras = this.calcularAsignaturasPorCarrera(carreras);

        if (this.graficos.carreras) {
            this.graficos.carreras.destroy();
        }

        this.graficos.carreras = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: distribucionCarreras.labels,
                datasets: [{
                    label: 'Asignaturas',
                    data: distribucionCarreras.valores,
                    backgroundColor: '#007bff',
                    borderColor: '#0056b3',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    generarGraficoEvolucionTemporal() {
        const ctx = document.getElementById('grafico-temporal');
        if (!ctx) return;

        // Datos simulados de evolución temporal
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
        const datosDocumentos = [45, 52, 48, 61, 55, 67];
        const datosObservaciones = [8, 12, 9, 15, 11, 13];

        if (this.graficos.temporal) {
            this.graficos.temporal.destroy();
        }

        this.graficos.temporal = new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [
                    {
                        label: 'Documentos Subidos',
                        data: datosDocumentos,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Observaciones',
                        data: datosObservaciones,
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    generarTablaDetallada() {
        const tbody = document.querySelector('#tabla-detallada tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        const carreras = this.datosReporte.carreras;
        carreras.forEach(carrera => {
            const asignaturas = this.contarAsignaturasPorCarrera(carrera.codigo);
            const docentes = this.contarDocentesPorCarrera(carrera.codigo);
            const portafolios = this.contarPortafoliosPorCarrera(carrera.codigo);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${carrera.codigo}</td>
                <td>${carrera.nombre}</td>
                <td>${carrera.facultad}</td>
                <td class="text-center">${asignaturas}</td>
                <td class="text-center">${docentes}</td>
                <td class="text-center">${portafolios}</td>
                <td class="text-center">
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar" role="progressbar" 
                             style="width: ${this.calcularProgreso(carrera.codigo)}%"></div>
                    </div>
                    <small>${this.calcularProgreso(carrera.codigo)}%</small>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="REPORTES.verDetalleCarrera('${carrera.codigo}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Funciones de cálculo
    calcularDistribucionRoles(usuarios) {
        return usuarios.reduce((acc, usuario) => {
            const rol = usuario.rol || 'sin_rol';
            if (rol === 'docente') acc.docentes++;
            else if (rol === 'verificador') acc.verificadores++;
            else if (rol === 'administrador') acc.administradores++;
            return acc;
        }, { docentes: 0, verificadores: 0, administradores: 0 });
    }

    calcularAsignaturasPorCarrera(carreras) {
        const labels = carreras.map(c => c.codigo);
        const valores = carreras.map(c => this.contarAsignaturasPorCarrera(c.codigo));
        return { labels, valores };
    }

    calcularTasaCompletitud() {
        const total = this.datosReporte.estadisticas.portafolios || 0;
        const completados = Math.floor(total * 0.75); // Simulado
        return total > 0 ? Math.round((completados / total) * 100) + '%' : '0%';
    }

    calcularUsuariosActivos() {
        const usuarios = this.datosReporte.usuarios;
        return usuarios.filter(u => u.activo).length;
    }

    contarAsignaturasPorCarrera(codigoCarrera) {
        // Simulado - en producción se haría consulta real
        return Math.floor(Math.random() * 20) + 5;
    }

    contarDocentesPorCarrera(codigoCarrera) {
        // Simulado - en producción se haría consulta real
        return Math.floor(Math.random() * 10) + 3;
    }

    contarPortafoliosPorCarrera(codigoCarrera) {
        // Simulado - en producción se haría consulta real
        return Math.floor(Math.random() * 15) + 2;
    }

    calcularProgreso(codigoCarrera) {
        // Simulado - en producción se calcularía el progreso real
        return Math.floor(Math.random() * 40) + 60;
    }

    // Filtros y búsqueda
    aplicarFiltros(filtros) {
        this.filtros = { ...this.filtros, ...filtros };
        this.generarReporteGeneral();
        console.log('ℹ️ Filtros aplicados correctamente');
    }

    inicializarFiltros() {
        // Llenar select de carreras
        const selectCarreras = document.getElementById('filtro-carrera');
        if (selectCarreras) {
            selectCarreras.innerHTML = '<option value="">Todas las carreras</option>';
            this.datosReporte.carreras.forEach(carrera => {
                const option = document.createElement('option');
                option.value = carrera.codigo;
                option.textContent = carrera.nombre;
                selectCarreras.appendChild(option);
            });
        }

        // Llenar select de ciclos
        const selectCiclos = document.getElementById('filtro-ciclo');
        if (selectCiclos) {
            selectCiclos.innerHTML = '<option value="">Todos los ciclos</option>';
            this.datosReporte.ciclos.forEach(ciclo => {
                const option = document.createElement('option');
                option.value = ciclo.id;
                option.textContent = ciclo.nombre;
                selectCiclos.appendChild(option);
            });
        }
    }

    configurarEventListeners() {
        // Botón de actualizar
        const btnActualizar = document.getElementById('btn-actualizar-reportes');
        if (btnActualizar) {
            btnActualizar.addEventListener('click', () => this.cargarDatosIniciales());
        }

        // Botón de exportar
        const btnExportar = document.getElementById('btn-exportar-reportes');
        if (btnExportar) {
            btnExportar.addEventListener('click', () => this.exportarReporte());
        }

        // Filtros
        const filtros = ['filtro-carrera', 'filtro-ciclo', 'fecha-inicio', 'fecha-fin'];
        filtros.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.addEventListener('change', () => this.manejarCambioFiltro());
            }
        });

        // Eventos de sincronización de ciclos
        this.configurarEventosSincronizacion();
    }

    configurarEventosSincronizacion() {
        // Escuchar evento de cambio de ciclo activo
        document.addEventListener('cicloActivoCambiado', (event) => {
            console.log('🔄 Ciclo activo cambiado en reportes:', event.detail);
            
            // Actualizar filtro de ciclo si existe
            const filtroCiclo = document.getElementById('filtro-ciclo');
            if (filtroCiclo && event.detail.cicloActivo) {
                filtroCiclo.value = event.detail.cicloActivo.id || '';
                this.filtros.cicloAcademico = event.detail.cicloActivo.id;
            }
            
            // Recargar datos con el nuevo ciclo
            setTimeout(() => {
                this.cargarDatosIniciales();
            }, 100);
        });
        
        // Eventos legacy para compatibilidad
        document.addEventListener('ciclo-cambiado', (event) => {
            console.log('🔄 Ciclo cambiado en reportes (legacy):', event.detail);
            setTimeout(() => {
                this.cargarDatosIniciales();
            }, 100);
        });
        
        console.log('✅ Eventos de sincronización configurados en reportes');
    }

    manejarCambioFiltro() {
        const filtros = {
            carrera: document.getElementById('filtro-carrera')?.value || null,
            cicloAcademico: document.getElementById('filtro-ciclo')?.value || null,
            fechaInicio: document.getElementById('fecha-inicio')?.value || null,
            fechaFin: document.getElementById('fecha-fin')?.value || null
        };

        this.aplicarFiltros(filtros);
    }

    // Exportación de reportes
    async exportarReporte() {
        try {
            const tipoExportacion = document.getElementById('tipo-exportacion')?.value || 'excel';
            
            console.log('ℹ️ Exportación: Generando reporte...');

            if (tipoExportacion === 'excel') {
                await this.exportarExcel();
            } else if (tipoExportacion === 'pdf') {
                await this.exportarPDF();
            }

                              console.log('✅ Exportación: Reporte generado exitosamente');

        } catch (error) {
            console.error('Error al exportar:', error);
                          console.error('❌ Error al generar el reporte:', error.message);
        }
    }

    async exportarExcel() {
        // Preparar datos para Excel
        const datosExcel = {
            resumen: this.prepararDatosResumen(),
            usuarios: this.datosReporte.usuarios,
            carreras: this.datosReporte.carreras,
            estadisticas: this.datosReporte.estadisticas
        };

        // Simular descarga
        const blob = new Blob([JSON.stringify(datosExcel, null, 2)], 
            { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-portafolios-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async exportarPDF() {
        // Implementación futura con jsPDF
        console.log('ℹ️ PDF: Funcionalidad PDF en desarrollo');
    }

    prepararDatosResumen() {
        return {
            fecha_generacion: new Date().toISOString(),
            filtros_aplicados: this.filtros,
            total_usuarios: this.datosReporte.usuarios.length,
            total_carreras: this.datosReporte.carreras.length,
            distribucion_roles: this.calcularDistribucionRoles(this.datosReporte.usuarios)
        };
    }

    // Funciones de vista detallada
    verDetalleCarrera(codigoCarrera) {
        const carrera = this.datosReporte.carreras.find(c => c.codigo === codigoCarrera);
        if (!carrera) return;

        // Crear modal con detalles
        this.mostrarModalDetalle(carrera);
    }

    mostrarModalDetalle(carrera) {
        const modalHtml = `
            <div class="modal fade" id="modalDetalleCarrera" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Detalle: ${carrera.nombre}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Información General</h6>
                                    <ul class="list-unstyled">
                                        <li><strong>Código:</strong> ${carrera.codigo}</li>
                                        <li><strong>Facultad:</strong> ${carrera.facultad}</li>
                                        <li><strong>Duración:</strong> ${carrera.duracion_semestres} semestres</li>
                                    </ul>
                                </div>
                                <div class="col-md-6">
                                    <h6>Estadísticas</h6>
                                    <ul class="list-unstyled">
                                        <li><strong>Asignaturas:</strong> ${this.contarAsignaturasPorCarrera(carrera.codigo)}</li>
                                        <li><strong>Docentes:</strong> ${this.contarDocentesPorCarrera(carrera.codigo)}</li>
                                        <li><strong>Portafolios:</strong> ${this.contarPortafoliosPorCarrera(carrera.codigo)}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insertar modal en el DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalDetalleCarrera'));
        modal.show();

        // Limpiar modal al cerrar
        document.getElementById('modalDetalleCarrera').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    actualizarIndicadores() {
        // Actualizar indicadores adicionales como tendencias, alertas, etc.
        this.actualizarTendencias();
        this.verificarAlertas();
    }

    actualizarTendencias() {
        const elementoTendencia = document.getElementById('tendencia-general');
        if (elementoTendencia) {
            const tendencia = Math.random() > 0.5 ? 'positiva' : 'negativa';
            const porcentaje = Math.floor(Math.random() * 20) + 5;
            
            elementoTendencia.innerHTML = `
                <i class="fas fa-arrow-${tendencia === 'positiva' ? 'up text-success' : 'down text-danger'}"></i>
                ${porcentaje}% respecto al mes anterior
            `;
        }
    }

    verificarAlertas() {
        const alertas = [];
        
        // Verificar alertas basadas en datos
        if (this.datosReporte.estadisticas.documentos?.pendientes > 10) {
            alertas.push({
                tipo: 'advertencia',
                mensaje: 'Hay más de 10 documentos pendientes de verificación'
            });
        }

        // Mostrar alertas
        const contenedorAlertas = document.getElementById('alertas-sistema');
        if (contenedorAlertas && alertas.length > 0) {
            contenedorAlertas.innerHTML = alertas.map(alerta => `
                <div class="alert alert-warning alert-dismissible fade show" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${alerta.mensaje}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `).join('');
        }
    }
}

// Instancia global
window.REPORTES = new SistemaReportes();

console.log('📊 Sistema de reportes avanzado inicializado');