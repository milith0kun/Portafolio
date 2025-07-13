/**
 * Sistema de Verificación de Datos
 * Página para verificar y mostrar los datos cargados en el sistema
 */

class VerificacionDatos {
    constructor() {
        // Evitar múltiples inicializaciones
        if (window.verificacionDatos && window.verificacionDatos.inicializado) {
            console.warn('⚠️ VerificacionDatos ya está inicializado, retornando instancia existente');
            return window.verificacionDatos;
        }
        
        this.inicializado = false;
        this.datosCache = {
            usuarios: [],
            carreras: [],
            asignaturas: [],
            asignaciones: [],
            verificaciones: [],
            portafolios: []
        };
        
        this.estadisticas = {
            usuarios: 0,
            carreras: 0,
            asignaturas: 0,
            asignaciones: 0,
            verificaciones: 0,
            portafolios: 0
        };
        
        this.tablas = {};
        this.graficos = {};
        this.eventosConfigurados = false;
        this.cargandoDatos = false;
        this.timeoutIds = new Set();
        
        // Solo inicializar si no está ya inicializado
        if (!this.inicializado) {
            this.inicializar();
        }
    }
    
    async inicializar() {
        // Evitar múltiples inicializaciones
        if (this.inicializado) {
            console.warn('⚠️ VerificacionDatos ya está inicializado');
            return true;
        }
        
        console.log('🔄 Inicializando sistema de verificación de datos...');
        
        try {
            // Verificar autenticación
            if (!this.verificarAutenticacion()) {
                console.warn('❌ Usuario no autenticado, omitiendo inicialización de verificación');
                return false;
            }
            
            // Esperar a que el sistema de autenticación esté completamente listo
            let intentos = 0;
            const maxIntentos = 20;
            
            while ((!window.AUTH?.verificarAutenticacion() || !window.AUTH?.obtenerToken()) && intentos < maxIntentos) {
                console.log(`🔄 Esperando autenticación completa... (${intentos + 1}/${maxIntentos})`);
                await new Promise(resolve => setTimeout(resolve, 200));
                intentos++;
            }
            
            if (!window.AUTH?.verificarAutenticacion()) {
                console.warn('⚠️ Autenticación no disponible, omitiendo carga de datos');
                return false;
            }
            
            // Configurar eventos (solo una vez)
            if (!this.eventosConfigurados) {
                this.configurarEventos();
                this.configurarEventosSincronizacion();
                this.eventosConfigurados = true;
            }
            
            // Cargar datos iniciales solo si la autenticación está lista
            await this.cargarDatosCompletos();
                
            // Inicializar tablas
            this.inicializarTablas();
            
            // Inicializar gráficos
            this.inicializarGraficos();
            
            this.inicializado = true;
            console.log('✅ Sistema de verificación inicializado correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error inicializando verificación:', error);
            this.mostrarError('Error al inicializar el sistema de verificación');
            return false;
        }
    }
    
    verificarAutenticacion() {
        try {
            // Usar AdminAuth para verificación consistente
            if (typeof AdminAuth !== 'undefined' && AdminAuth.inicializarAutenticacionAdmin) {
                return AdminAuth.inicializarAutenticacionAdmin();
            }
            
            // Fallback a verificación manual
            const usuario = window.AUTH?.obtenerUsuario();
            if (!usuario) {
                // Usuario no autenticado
                const loginUrl = (typeof CONFIG !== 'undefined' && CONFIG.getRoute) 
                    ? CONFIG.getRoute('LOGIN') 
                    : CONFIG?.ROUTES?.LOGIN || '/FRONTEND/paginas/autenticacion/login.html';
                window.location.href = loginUrl;
                return false;
            }
            
            // Verificar rol de administrador usando AUTH.tieneRol
            if (!window.AUTH?.tieneRol('administrador')) {
                // Usuario sin permisos de administrador
                this.mostrarError('No tienes permisos para acceder a esta página');
                setTimeout(() => {
                    const dashboardUrl = (typeof CONFIG !== 'undefined' && CONFIG.getRoute) 
                        ? CONFIG.getRoute('DASHBOARD_ADMIN') 
                        : '/FRONTEND/paginas/dashboard/admin/tablero.html';
                    window.location.href = dashboardUrl;
                }, 2000);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error en verificación de autenticación:', error);
            return false;
        }
    }
    
    configurarEventos() {
        // Botón actualizar datos
        const btnActualizar = document.getElementById('actualizarDatos');
        if (btnActualizar) {
            btnActualizar.addEventListener('click', () => this.actualizarDatos());
        }
        
        // Botón exportar datos
        const btnExportar = document.getElementById('exportarDatos');
        if (btnExportar) {
            btnExportar.addEventListener('click', () => this.exportarDatos());
        }
        
        // Botones de exportación específicos
        const btnExportarExcel = document.getElementById('btnExportarExcel');
        if (btnExportarExcel) {
            btnExportarExcel.addEventListener('click', () => this.exportarExcel());
        }
        
        const btnExportarPDF = document.getElementById('btnExportarPDF');
        if (btnExportarPDF) {
            btnExportarPDF.addEventListener('click', () => this.exportarPDF());
        }
        
        const btnActualizarTablas = document.getElementById('btnActualizarTablas');
        if (btnActualizarTablas) {
            btnActualizarTablas.addEventListener('click', () => this.actualizarTablas());
        }
        
        // Filtros
        const btnAplicarFiltros = document.getElementById('aplicarFiltros');
        if (btnAplicarFiltros) {
            btnAplicarFiltros.addEventListener('click', () => this.aplicarFiltros());
        }
    }
    
    configurarEventosSincronizacion() {
        // Variables para controlar bucles infinitos
        let ultimoCiclo = null;
        let timeoutId = null;
        
        // Función para manejar cambios de ciclo con debounce
        const manejarCambioCiclo = (cicloId) => {
            // Cancelar timeout anterior si existe
            if (timeoutId) {
                clearTimeout(timeoutId);
                this.timeoutIds.delete(timeoutId);
            }
            
            // Evitar bucles infinitos
            if (cicloId === ultimoCiclo || this.cargandoDatos) {
                return;
            }
            
            // Debounce para evitar múltiples llamadas
            timeoutId = setTimeout(() => {
                ultimoCiclo = cicloId;
                this.cargandoDatos = true;
                
                console.log(`🔄 Actualizando datos para ciclo: ${cicloId}`);
                
                // Recargar solo datos críticos
                Promise.all([
                    this.cargarAsignaturas(),
                    this.cargarAsignaciones()
                ]).finally(() => {
                    this.cargandoDatos = false;
                    console.log(`✅ Datos actualizados para ciclo: ${cicloId}`);
                });
                
                this.timeoutIds.delete(timeoutId);
            }, 500); // Esperar 500ms antes de ejecutar
            
            this.timeoutIds.add(timeoutId);
        };
        
        // Escuchar evento de cambio de ciclo activo (solo una vez)
        const eventoCicloActivoCambiado = (event) => {
            const cicloId = event.detail?.cicloId;
            if (cicloId) {
                manejarCambioCiclo(cicloId);
            }
        };
        
        // Remover listener anterior si existe
        document.removeEventListener('cicloActivoCambiado', eventoCicloActivoCambiado);
        document.addEventListener('cicloActivoCambiado', eventoCicloActivoCambiado);
        
        // Eventos legacy para compatibilidad (con protección)
        const eventoSincronizarCiclo = () => {
            if (!this.cargandoDatos) {
                console.log('🔄 Sincronización legacy solicitada');
                this.cargandoDatos = true;
                this.cargarDatosCompletos().finally(() => {
                    this.cargandoDatos = false;
                });
            }
        };
        
        const eventoCicloLegacy = (event) => {
            const cicloId = event.detail?.cicloId;
            if (cicloId) {
                manejarCambioCiclo(cicloId);
            }
        };
        
        // Evento coordinado de ciclo
        const eventoCoordinado = (event) => {
            const cicloId = event.detail?.cicloId;
            if (cicloId) {
                console.log('📊 Verificar Datos - Evento coordinado recibido:', cicloId);
                manejarCambioCiclo(cicloId);
            }
        };
        
        // Remover listeners anteriores
        document.removeEventListener('sincronizar-ciclo', eventoSincronizarCiclo);
        document.removeEventListener('ciclo-cambiado', eventoCicloLegacy);
        document.removeEventListener('cicloCoordinado', eventoCoordinado);
        
        // Agregar listeners
        document.addEventListener('sincronizar-ciclo', eventoSincronizarCiclo);
        document.addEventListener('ciclo-cambiado', eventoCicloLegacy);
        document.addEventListener('cicloCoordinado', eventoCoordinado);
        
        console.log('✅ Eventos de sincronización configurados con protección anti-bucles');
    }
    
    async cargarDatosCompletos() {
        // Evitar múltiples cargas simultáneas
        if (this.cargandoDatos) {
            console.log('🔄 Carga de datos ya en progreso, omitiendo...');
            return;
        }
        
        this.cargandoDatos = true;
        console.log('🔄 Cargando datos completos del sistema...');
        
        try {
            // Mostrar indicadores de carga
            this.mostrarCargandoEstadisticas();
            
            // Cargar datos en paralelo
            const promesas = [
                this.cargarUsuarios(),
                this.cargarCarreras(),
                this.cargarAsignaturas(),
                this.cargarAsignaciones(),
                this.cargarVerificaciones(),
                this.cargarPortafolios()
            ];
            
            await Promise.all(promesas);
            
            // Actualizar estadísticas
            this.actualizarEstadisticas();
            
            // Llenar filtros
            this.llenarFiltros();
            
            console.log('✅ Datos cargados completamente');
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.mostrarError('Error al cargar los datos del sistema');
        } finally {
            this.cargandoDatos = false;
        }
    }
    
    async cargarUsuarios() {
        try {
            const respuesta = await window.apiRequest('/usuarios', 'GET');
            
            if (respuesta.success || respuesta.exito) {
                this.datosCache.usuarios = respuesta.data || [];
                console.log(`✅ Usuarios cargados: ${this.datosCache.usuarios.length}`);
            } else {
                console.warn('⚠️ Respuesta no exitosa al cargar usuarios');
                this.datosCache.usuarios = [];
            }
        } catch (error) {
            console.warn('⚠️ Error cargando usuarios:', error.message);
            this.datosCache.usuarios = [];
        }
    }
    
    async cargarCarreras() {
        try {
            const respuesta = await window.apiRequest('/carreras', 'GET');
            
            if (respuesta.success || respuesta.exito) {
                this.datosCache.carreras = respuesta.data || [];
                console.log(`✅ Carreras cargadas: ${this.datosCache.carreras.length}`);
            } else {
                console.warn('⚠️ Respuesta no exitosa al cargar carreras');
                this.datosCache.carreras = [];
            }
        } catch (error) {
            console.warn('⚠️ Error cargando carreras:', error.message);
            this.datosCache.carreras = [];
        }
    }
    
    async cargarAsignaturas() {
        try {
            const respuesta = await window.apiRequest('/asignaturas', 'GET');
            
            if (respuesta.success || respuesta.exito) {
                this.datosCache.asignaturas = respuesta.data || [];
                console.log(`✅ Asignaturas cargadas: ${this.datosCache.asignaturas.length}`);
            } else {
                console.warn('⚠️ Respuesta no exitosa al cargar asignaturas');
                this.datosCache.asignaturas = [];
            }
        } catch (error) {
            console.warn('⚠️ Error cargando asignaturas:', error.message);
            this.datosCache.asignaturas = [];
        }
    }
    
    async cargarAsignaciones() {
        try {
            // Cargar asignaciones docente-asignatura
            const respuesta = await window.apiRequest('/dashboard/asignaciones', 'GET');
            
            if (respuesta.success || respuesta.exito) {
                this.datosCache.asignaciones = respuesta.data || [];
                console.log(`✅ Asignaciones cargadas: ${this.datosCache.asignaciones.length}`);
            } else {
                console.warn('⚠️ Respuesta no exitosa al cargar asignaciones');
                this.datosCache.asignaciones = [];
            }
        } catch (error) {
            console.warn('⚠️ Error cargando asignaciones:', error.message);
            this.datosCache.asignaciones = [];
        }
    }
    
    async cargarVerificaciones() {
        try {
            const respuesta = await window.apiRequest('/dashboard/verificaciones', 'GET');
            
            if (respuesta.success || respuesta.exito) {
                this.datosCache.verificaciones = respuesta.data || [];
                console.log(`✅ Verificaciones cargadas: ${this.datosCache.verificaciones.length}`);
            } else {
                console.warn('⚠️ Respuesta no exitosa al cargar verificaciones');
                this.datosCache.verificaciones = [];
            }
        } catch (error) {
            console.warn('⚠️ Error cargando verificaciones:', error.message);
            this.datosCache.verificaciones = [];
        }
    }
    
    async cargarPortafolios() {
        try {
            const respuesta = await window.apiRequest('/dashboard/portafolios', 'GET');
            
            if (respuesta.success || respuesta.exito) {
                this.datosCache.portafolios = respuesta.data || [];
                console.log(`✅ Portafolios cargados: ${this.datosCache.portafolios.length}`);
            } else {
                console.warn('⚠️ Respuesta no exitosa al cargar portafolios');
                this.datosCache.portafolios = [];
            }
        } catch (error) {
            console.warn('⚠️ Error cargando portafolios:', error.message);
            this.datosCache.portafolios = [];
        }
    }
    
    mostrarCargandoEstadisticas() {
        const elementos = [
            'totalUsuarios',
            'totalCarreras', 
            'totalAsignaturas',
            'totalAsignaciones',
            'totalVerificaciones',
            'totalPortafolios'
        ];
        
        elementos.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.innerHTML = '<div class="loading-spinner"></div>';
            }
        });
    }
    
    actualizarEstadisticas() {
        // Calcular estadísticas
        this.estadisticas = {
            usuarios: this.datosCache.usuarios.length,
            carreras: this.datosCache.carreras.length,
            asignaturas: this.datosCache.asignaturas.length,
            asignaciones: this.datosCache.asignaciones.length,
            verificaciones: this.datosCache.verificaciones.length,
            portafolios: this.datosCache.portafolios.length
        };
        
        console.log('📊 Estadísticas actualizadas:', this.estadisticas);
        
        // Actualizar elementos en el DOM solo si existen
        this.actualizarElementoEstadistica('totalUsuarios', this.estadisticas.usuarios);
        this.actualizarElementoEstadistica('totalCarreras', this.estadisticas.carreras);
        this.actualizarElementoEstadistica('totalAsignaturas', this.estadisticas.asignaturas);
        this.actualizarElementoEstadistica('totalAsignaciones', this.estadisticas.asignaciones);
        this.actualizarElementoEstadistica('totalVerificaciones', this.estadisticas.verificaciones);
        this.actualizarElementoEstadistica('totalPortafolios', this.estadisticas.portafolios);
        
        // Mostrar estadísticas en página de carga masiva si aplica
        this.actualizarEstadisticasCargaMasiva();
    }
    
    actualizarElementoEstadistica(elementId, valor) {
        const elemento = document.getElementById(elementId);
        if (elemento) {
            elemento.innerHTML = `<span class="counter">${valor.toLocaleString()}</span>`;
        }
    }
    
    /**
     * Actualizar estadísticas específicamente para la página de carga masiva
     */
    actualizarEstadisticasCargaMasiva() {
        const estadoArchivos = document.getElementById('estadoArchivos');
        
        // Solo actualizar si estamos en la página de carga masiva
        if (estadoArchivos && this.estadisticas) {
            const html = `
                <div class="row">
                    <div class="col-12">
                        <div class="alert alert-info">
                            <h6><i class="fas fa-info-circle me-2"></i>📊 Estadísticas del Ciclo 1</h6>
                            <div class="row mt-3">
                                <div class="col-md-2">
                                    <div class="stat-item text-center">
                                        <div class="stat-value text-primary">${this.estadisticas.usuarios}</div>
                                        <div class="stat-label">Usuarios</div>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="stat-item text-center">
                                        <div class="stat-value text-success">${this.estadisticas.carreras}</div>
                                        <div class="stat-label">Carreras</div>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="stat-item text-center">
                                        <div class="stat-value text-info">${this.estadisticas.asignaturas}</div>
                                        <div class="stat-label">Asignaturas</div>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="stat-item text-center">
                                        <div class="stat-value text-warning">${this.estadisticas.asignaciones}</div>
                                        <div class="stat-label">Asignaciones</div>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="stat-item text-center">
                                        <div class="stat-value text-secondary">${this.estadisticas.verificaciones}</div>
                                        <div class="stat-label">Verificaciones</div>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="stat-item text-center">
                                        <div class="stat-value text-dark">${this.estadisticas.portafolios}</div>
                                        <div class="stat-label">Portafolios</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-12">
                        <div class="alert alert-success">
                            <h6><i class="fas fa-check-circle me-2"></i>Estado de la Base de Datos</h6>
                            <p class="mb-0">Datos cargados y verificados correctamente para el ciclo académico activo.</p>
                        </div>
                    </div>
                </div>
            `;
            
            estadoArchivos.innerHTML = html;
        }
        
        // Actualizar estado de conexión si existe
        const estadoConexion = document.getElementById('estadoConexion');
        if (estadoConexion) {
            estadoConexion.innerHTML = `
                <span class="badge bg-success">
                    <i class="fas fa-check-circle me-1"></i>
                    ACTIVO
                </span>
            `;
        }
    }
    
    llenarFiltros() {
        // Llenar filtro de carreras
        const filtroCarrera = document.getElementById('filtroCarrera');
        if (filtroCarrera) {
            filtroCarrera.innerHTML = '<option value="">Todas las carreras</option>';
            this.datosCache.carreras.forEach(carrera => {
                const option = document.createElement('option');
                option.value = carrera.id;
                option.textContent = carrera.nombre;
                filtroCarrera.appendChild(option);
            });
        }
    }
    
    inicializarTablas() {
        // Inicializar tabla de usuarios
        this.inicializarTablaUsuarios();
        
        // Inicializar tabla de carreras
        this.inicializarTablaCarreras();
        
        // Inicializar tabla de asignaturas
        this.inicializarTablaAsignaturas();
    }
    
    inicializarTablaUsuarios() {
        const tabla = $('#tablaUsuarios');
        if (tabla.length) {
            // Destruir tabla existente si existe
            if ($.fn.DataTable.isDataTable(tabla)) {
                tabla.DataTable().destroy();
            }
            
            // Crear nueva tabla
            this.tablas.usuarios = tabla.DataTable({
                data: this.datosCache.usuarios,
                columns: [
                    { data: 'id' },
                    { data: 'nombres' },
                    { data: 'apellidos' },
                    { data: 'correo' },
                    { data: 'dni' },
                    { 
                        data: 'roles',
                        render: function(data) {
                            if (Array.isArray(data) && data.length > 0) {
                                return data.map(rol => rol.nombre).join(', ');
                            }
                            return 'Sin rol';
                        }
                    },
                    { 
                        data: 'activo',
                        render: function(data) {
                            return data ? 
                                '<span class="badge bg-success">Activo</span>' : 
                                '<span class="badge bg-danger">Inactivo</span>';
                        }
                    },
                    { 
                        data: 'createdAt',
                        render: function(data) {
                            return data ? new Date(data).toLocaleDateString() : 'N/A';
                        }
                    }
                ],
                language: {
                    url: '/assets/js/datatables-es.json'
                },
                responsive: true,
                pageLength: 10,
                order: [[0, 'asc']]
            });
        }
    }
    
    inicializarTablaCarreras() {
        const tabla = $('#tablaCarreras');
        if (tabla.length) {
            if ($.fn.DataTable.isDataTable(tabla)) {
                tabla.DataTable().destroy();
            }
            
            this.tablas.carreras = tabla.DataTable({
                data: this.datosCache.carreras,
                columns: [
                    { data: 'id' },
                    { data: 'codigo' },
                    { data: 'nombre' },
                    { data: 'facultad' },
                    { data: 'duracion_semestres' },
                    { 
                        data: 'activo',
                        render: function(data) {
                            return data ? 
                                '<span class="badge bg-success">Activa</span>' : 
                                '<span class="badge bg-danger">Inactiva</span>';
                        }
                    }
                ],
                language: {
                    url: '/assets/js/datatables-es.json'
                },
                responsive: true,
                pageLength: 10,
                order: [[0, 'asc']]
            });
        }
    }
    
    inicializarTablaAsignaturas() {
        const tabla = $('#tablaAsignaturas');
        if (tabla.length) {
            if ($.fn.DataTable.isDataTable(tabla)) {
                tabla.DataTable().destroy();
            }
            
            this.tablas.asignaturas = tabla.DataTable({
                data: this.datosCache.asignaturas,
                columns: [
                    { data: 'id' },
                    { data: 'codigo' },
                    { data: 'nombre' },
                    { 
                        data: 'Carrera',
                        render: function(data) {
                            return data ? data.nombre : 'Sin carrera';
                        }
                    },
                    { data: 'semestre' },
                    { data: 'creditos' },
                    { data: 'tipo' }
                ],
                language: {
                    url: '/assets/js/datatables-es.json'
                },
                responsive: true,
                pageLength: 10,
                order: [[0, 'asc']]
            });
        }
    }
    
    inicializarGraficos() {
        this.inicializarGraficoRoles();
        this.inicializarGraficoCarreras();
    }
    
    inicializarGraficoRoles() {
        const ctx = document.getElementById('chartRoles');
        if (!ctx) return;
        
        // Contar roles
        const conteoRoles = {};
        this.datosCache.usuarios.forEach(usuario => {
            if (usuario.roles && Array.isArray(usuario.roles)) {
                usuario.roles.forEach(rol => {
                    const nombreRol = rol.nombre || 'Sin rol';
                    conteoRoles[nombreRol] = (conteoRoles[nombreRol] || 0) + 1;
                });
            }
        });
        
        const labels = Object.keys(conteoRoles);
        const data = Object.values(conteoRoles);
        
        this.graficos.roles = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#28a745', // Verde para docentes
                        '#17a2b8', // Azul para verificadores  
                        '#dc3545', // Rojo para administradores
                        '#ffc107', // Amarillo para otros
                        '#6f42c1'  // Púrpura para adicionales
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    inicializarGraficoCarreras() {
        const ctx = document.getElementById('chartCarreras');
        if (!ctx) return;
        
        // Contar asignaturas por carrera
        const conteoCarreras = {};
        this.datosCache.asignaturas.forEach(asignatura => {
            const nombreCarrera = asignatura.Carrera?.nombre || 'Sin carrera';
            conteoCarreras[nombreCarrera] = (conteoCarreras[nombreCarrera] || 0) + 1;
        });
        
        const labels = Object.keys(conteoCarreras).slice(0, 10); // Top 10
        const data = labels.map(label => conteoCarreras[label]);
        
        this.graficos.carreras = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Asignaturas',
                    data: data,
                    backgroundColor: '#007bff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Métodos de acción
    async actualizarDatos() {
        console.log('🔄 Actualizando datos...');
        await this.cargarDatosCompletos();
        this.actualizarTablas();
        this.mostrarExito('Datos actualizados correctamente');
    }
    
    actualizarTablas() {
        console.log('🔄 Actualizando tablas...');
        
        // Actualizar tabla de usuarios
        if (this.tablas.usuarios) {
            this.tablas.usuarios.clear();
            this.tablas.usuarios.rows.add(this.datosCache.usuarios);
            this.tablas.usuarios.draw();
        }
        
        // Actualizar tabla de carreras
        if (this.tablas.carreras) {
            this.tablas.carreras.clear();
            this.tablas.carreras.rows.add(this.datosCache.carreras);
            this.tablas.carreras.draw();
        }
        
        // Actualizar tabla de asignaturas
        if (this.tablas.asignaturas) {
            this.tablas.asignaturas.clear();
            this.tablas.asignaturas.rows.add(this.datosCache.asignaturas);
            this.tablas.asignaturas.draw();
        }
        
        // Actualizar gráficos
        this.actualizarGraficos();
    }
    
    actualizarGraficos() {
        // Destruir gráficos existentes
        if (this.graficos.roles) {
            this.graficos.roles.destroy();
        }
        if (this.graficos.carreras) {
            this.graficos.carreras.destroy();
        }
        
        // Recrear gráficos
        this.inicializarGraficos();
    }
    
    aplicarFiltros() {
        console.log('🔄 Aplicando filtros...');
        
        const filtroCarrera = document.getElementById('filtroCarrera').value;
        const filtroRol = document.getElementById('filtroRol').value;
        const filtroEstado = document.getElementById('filtroEstado').value;
        
        // Aplicar filtros a las tablas
        if (this.tablas.usuarios) {
            this.tablas.usuarios.search('').draw(); // Limpiar búsqueda anterior
            
            // Aplicar filtros personalizados
            // Aquí puedes implementar lógica de filtrado más compleja
        }
        
        this.mostrarInfo('Filtros aplicados correctamente');
    }
    
    exportarDatos() {
        console.log('📤 Exportando datos...');
        // Implementar exportación general
        this.mostrarInfo('Función de exportación en desarrollo');
    }
    
    exportarExcel() {
        console.log('📊 Exportando a Excel...');
        // Implementar exportación a Excel
        this.mostrarInfo('Exportación a Excel en desarrollo');
    }
    
    exportarPDF() {
        console.log('📄 Exportando a PDF...');
        // Implementar exportación a PDF
        this.mostrarInfo('Exportación a PDF en desarrollo');
    }
    
    // Métodos de notificación
    mostrarError(mensaje) {
        console.error('❌ Error:', mensaje);
        if (typeof toastr !== 'undefined') {
            toastr.error(mensaje);
        } else {
            alert('Error: ' + mensaje);
        }
    }
    
    mostrarExito(mensaje) {
        console.log('✅ Éxito:', mensaje);
        if (typeof toastr !== 'undefined') {
            toastr.success(mensaje);
        }
    }
    
    mostrarInfo(mensaje) {
        console.log('ℹ️ Info:', mensaje);
        if (typeof toastr !== 'undefined') {
            toastr.info(mensaje);
        }
    }
    
    // Método para limpiar recursos
    destruir() {
        // Limpiar timeouts
        this.timeoutIds.forEach(id => {
            clearTimeout(id);
        });
        this.timeoutIds.clear();
        
        // Destruir tablas
        Object.values(this.tablas).forEach(tabla => {
            if (tabla) {
                tabla.destroy();
            }
        });
        
        // Destruir gráficos
        Object.values(this.graficos).forEach(grafico => {
            if (grafico) {
                grafico.destroy();
            }
        });
        
        this.inicializado = false;
        console.log('🧹 VerificacionDatos destruido correctamente');
    }
}

// Inicializar cuando el DOM esté listo (solo una vez)
document.addEventListener('DOMContentLoaded', function() {
    // Evitar múltiples inicializaciones
    if (window.verificacionDatos) {
        console.warn('⚠️ VerificacionDatos ya está inicializado');
        return;
    }
    
    // Esperar a que se carguen las dependencias necesarias
    if (typeof window.AUTH !== 'undefined' && typeof window.apiRequest !== 'undefined') {
        window.verificacionDatos = new VerificacionDatos();
    } else {
        // Esperar un poco más si las dependencias no están listas
        setTimeout(() => {
            if (typeof window.AUTH !== 'undefined' && typeof window.apiRequest !== 'undefined') {
                window.verificacionDatos = new VerificacionDatos();
            } else {
                console.warn('⚠️ Dependencias no disponibles para VerificacionDatos');
            }
        }, 1000);
    }
});

console.log('📋 Script de verificación de datos cargado correctamente');
