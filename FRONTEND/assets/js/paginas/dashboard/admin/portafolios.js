/**
 * GESTIÓN DE PORTAFOLIOS - MÓDULO ADMIN
 * Sistema para gestionar portafolios docentes
 */

// Log de inicio para depuración
console.log('🔄 Iniciando carga de portafolios.js...');

// ================================================
// ESTADO GLOBAL
// ================================================

const PortafoliosAdmin = {
    // Datos
    todosLosPortafolios: [],
    ciclosDisponibles: [],
    cargando: false,
    
    // Elementos DOM
    elementos: {
        cuerpoTablaPortafolios: null,
        filtroCiclo: null,
        filtroEstado: null,
        filtroDocente: null,
        btnRefrescar: null,
        btnGenerarPortafolios: null
    },
    
    // Estado
    inicializado: false
};

console.log('✅ Estado global PortafoliosAdmin creado:', PortafoliosAdmin);

// ================================================
// INICIALIZACIÓN
// ================================================

/**
 * Inicialización principal del módulo
 */
function inicializar() {
    console.log('🚀 Inicializando Gestión de Portafolios...');
    
            // Verificar autenticación usando el sistema unificado
    if (!verificarAutenticacionRapida()) {
        return; // La función ya maneja redirección
    }
    
    // Inicializar elementos DOM
    inicializarElementosDOM();
    
    // Configurar eventos
    configurarEventos();
            
            // Cargar datos iniciales
    setTimeout(() => {
        cargarDatosIniciales();
    }, 100);
    
    PortafoliosAdmin.inicializado = true;
    console.log('✅ Gestión de Portafolios inicializada');
    }

    /**
     * Verificar autenticación usando el sistema unificado
     */
function verificarAutenticacionRapida() {
    // Verificar disponibilidad del sistema AUTH
    if (!window.AUTH?.verificarAutenticacion?.()) {
        // Autenticación fallida, redirigiendo
        window.location.href = '../../autenticacion/login.html';
        return false;
    }

    // Verificar rol de administrador
    const rolActual = window.AUTH.obtenerRolActivo();
    if (!['administrador', 'admin'].includes(rolActual?.toLowerCase())) {
        // Sin permisos de administrador
        alert('No tienes permisos para acceder a esta sección');
        window.location.href = '../../autenticacion/selector-roles.html';
            return false;
        }

    // Autenticación verificada
    return true;
}

/**
 * Inicializar referencias a elementos DOM
 */
function inicializarElementosDOM() {
    PortafoliosAdmin.elementos = {
        cuerpoTablaPortafolios: document.getElementById('cuerpoTablaPortafolios'),
        filtroCiclo: document.getElementById('filtroCiclo'),
        filtroEstado: document.getElementById('filtroEstado'),
        filtroDocente: document.getElementById('filtroDocente'),
        btnRefrescar: document.getElementById('btnRefrescar'),
        btnGenerarPortafolios: document.getElementById('btnGenerarPortafolios')
    };
}

/**
 * Configurar todos los eventos
 */
function configurarEventos() {
    const { elementos } = PortafoliosAdmin;
    
    // Eventos de botones
    elementos.btnRefrescar?.addEventListener('click', cargarPortafolios);
    elementos.btnGenerarPortafolios?.addEventListener('click', generarPortafolios);
    
    // Eventos de filtros
    elementos.filtroCiclo?.addEventListener('change', aplicarFiltros);
    elementos.filtroEstado?.addEventListener('change', aplicarFiltros);
    elementos.filtroDocente?.addEventListener('input', debounce(aplicarFiltros, 500));
    
    // Event delegation para botones de acciones en la tabla
    const tabla = document.getElementById('tablaPortafolios');
    if (tabla) {
        tabla.addEventListener('click', (event) => {
            const boton = event.target.closest('button[data-action]');
            if (!boton) return;
            
            const accion = boton.dataset.action;
            const portafolioId = parseInt(boton.dataset.portafolioId);
            
            if (accion === 'ver') {
                verPortafolio(portafolioId);
            } else if (accion === 'editar') {
                editarPortafolio(portafolioId);
            }
        });
    }
    
    // Escuchar cambios de ciclo desde el sistema global
    document.addEventListener('ciclo-cambiado', (event) => {
        // Ciclo cambiado en portafolios
        // Recargar portafolios automáticamente
        setTimeout(() => {
            cargarPortafolios();
        }, 100);
    });
    
    // También escuchar el evento legacy por compatibilidad
    document.addEventListener('cicloSeleccionado', (event) => {
        // Ciclo seleccionado cambió en portafolios (legacy)
        setTimeout(() => {
            cargarPortafolios();
        }, 100);
    });
    
    // Escuchar eventos de sincronización
    document.addEventListener('sincronizar-ciclo', (event) => {
        // Sincronizando ciclo en portafolios
        setTimeout(() => {
            cargarPortafolios();
        }, 100);
    });
    
    // Escuchar evento de cambio de ciclo activo
    document.addEventListener('cicloActivoCambiado', (event) => {
        // Ciclo activo cambiado en portafolios
        // Actualizar selector de ciclo si es necesario
        if (elementos.filtroCiclo && event.detail.cicloActivo) {
            elementos.filtroCiclo.value = event.detail.cicloActivo.id || '';
        }
        // Recargar portafolios
        setTimeout(() => {
            cargarPortafolios();
        }, 100);
    });
}

/**
 * Cargar datos iniciales
 */
async function cargarDatosIniciales() {
    try {
        PortafoliosAdmin.cargando = true;
        
        // Cargar datos en paralelo
        await Promise.all([
            cargarCiclosAcademicos(),
            cargarPortafolios()
        ]);
        
        } catch (error) {
        // Error cargando datos iniciales
        mostrarNotificacion('error', 'Error al cargar los datos iniciales');
        } finally {
        PortafoliosAdmin.cargando = false;
    }
}

// ================================================
// GESTIÓN DE DATOS
// ================================================

/**
 * Cargar ciclos académicos desde el API
 */
async function cargarCiclosAcademicos() {
    // Cargando ciclos académicos
    
    try {
        const data = await window.apiRequest('/ciclos', 'GET');
        // Ciclos cargados

        if ((data.exito && data.datos) || (data.success && data.data)) {
            PortafoliosAdmin.ciclosDisponibles = data.datos || data.data;
            renderizarSelectorCiclos();
        }
        
    } catch (error) {
        // Error al cargar ciclos
        }
    }

    /**
 * Cargar portafolios desde el API
 * Ahora con soporte para filtrado por ciclo académico
 */
async function cargarPortafolios() {
    // Cargando portafolios
    const tbody = PortafoliosAdmin.elementos.cuerpoTablaPortafolios;
    
    if (!tbody) return;
    
    try {
        // Mostrar loading
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="loading-message">
                        <i class="fas fa-spinner fa-spin"></i> Cargando portafolios...
                    </div>
                </td>
            </tr>
        `;
        
        // Obtener ciclo seleccionado
        const cicloSeleccionado = obtenerCicloSeleccionado();
        // Ciclo seleccionado para portafolios
        
        // Construir URL con parámetros
        let url = '/portafolios';
        const params = new URLSearchParams();
        
        if (cicloSeleccionado) {
            params.append('ciclo', cicloSeleccionado);
        }
        
        // Agregar otros filtros activos
        const filtroEstado = PortafoliosAdmin.elementos.filtroEstado?.value;
        const filtroDocente = PortafoliosAdmin.elementos.filtroDocente?.value;
        
        if (filtroEstado) {
            params.append('estado', filtroEstado);
        }
        
        if (filtroDocente) {
            params.append('docente', filtroDocente);
        }
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        // URL de petición
        
        // Usar el sistema unificado de peticiones
        const data = await window.apiRequest(url, 'GET');
        // Respuesta de portafolios

        // Manejar ambos formatos de respuesta
        const exito = data.exito || data.success;
        const responseData = data.datos || data.data;
        
        // Extraer portafolios de la respuesta (puede estar en responseData.portafolios o directamente en responseData)
        const portafolios = responseData?.portafolios || responseData || [];

        if (!exito || !portafolios || portafolios.length === 0) {
            PortafoliosAdmin.todosLosPortafolios = [];
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        <i class="fas fa-folder-open"></i> No hay portafolios disponibles para el ciclo seleccionado
                    </td>
                </tr>
            `;
            return;
        }

        // Almacenar datos en variable global
        PortafoliosAdmin.todosLosPortafolios = portafolios;
        
        // Aplicar filtros (que llamará a renderizarPortafolios)
        aplicarFiltros();
        
    } catch (error) {
        // Error al cargar portafolios
        PortafoliosAdmin.todosLosPortafolios = [];
        
        if (error.status === 401) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-warning">
                        <i class="fas fa-exclamation-triangle"></i> 
                        Sesión expirada. Será redirigido al login en 3 segundos...
                    </td>
                </tr>
            `;
            
            // Redirigir al login después de 3 segundos
            setTimeout(() => {
                window.AUTH?.cerrarSesion();
            }, 3000);
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle"></i> 
                        Error al cargar portafolios: ${error.message}
                    </td>
                </tr>
            `;
            }
        }
    }

    /**
 * Generar portafolios automáticamente
 */
async function generarPortafolios() {
    // Generando portafolios automáticamente
    
    try {
        const btnGenerar = PortafoliosAdmin.elementos.btnGenerarPortafolios;
        if (!btnGenerar) return;
        
        btnGenerar.disabled = true;
        btnGenerar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        
        // Usar el sistema unificado de peticiones
        const data = await window.apiRequest('/portafolios/generar', 'POST');
        // Portafolios generados
        
        // Manejar ambos formatos de respuesta
        const exito = data.exito || data.success;
        const datos = data.datos || data.data;
        const mensaje = data.mensaje || data.message;
        
        if (exito) {
            // Mostrar mensaje de éxito
            const portafoliosCreados = datos?.portafoliosCreados || 0;
            mostrarNotificacion('success', `${portafoliosCreados} portafolios generados exitosamente`);
            
            // Recargar la tabla
            setTimeout(() => {
                cargarPortafolios();
            }, 1000);
            } else {
            throw new Error(mensaje || 'Error al generar portafolios');
            }
        
        } catch (error) {
        // Error al generar portafolios
        
        if (error.status === 401) {
            mostrarNotificacion('warning', 'Sesión expirada. Será redirigido al login...');
            setTimeout(() => {
                window.AUTH?.cerrarSesion();
            }, 3000);
        } else {
            mostrarNotificacion('error', `Error al generar portafolios: ${error.message}`);
        }
        } finally {
        const btnGenerar = PortafoliosAdmin.elementos.btnGenerarPortafolios;
        if (btnGenerar) {
            btnGenerar.disabled = false;
            btnGenerar.innerHTML = '<i class="fas fa-plus"></i> Generar Portafolios';
        }
    }
}

// ================================================
// RENDERIZADO Y FILTROS
// ================================================

/**
 * Renderizar selector de ciclos
 */
function renderizarSelectorCiclos() {
    const select = PortafoliosAdmin.elementos.filtroCiclo;
    if (!select) return;
    
    // Limpiar opciones existentes excepto la primera
    select.innerHTML = '<option value="">Todos los ciclos</option>';
    
    // Agregar ciclos
    PortafoliosAdmin.ciclosDisponibles.forEach(ciclo => {
        const option = document.createElement('option');
        option.value = ciclo.id;
        option.textContent = `${ciclo.nombre} (${ciclo.estado})`;
        
        // Marcar como seleccionado si es el ciclo activo
        if (ciclo.estado === 'activo') {
            option.selected = true;
        }
        
        select.appendChild(option);
    });
}

/**
 * Aplicar filtros a los portafolios
 */
function aplicarFiltros() {
    // Aplicando filtros
    
    const elementos = PortafoliosAdmin.elementos;
    const filtroCiclo = elementos.filtroCiclo?.value || '';
    const filtroEstado = elementos.filtroEstado?.value || '';
    const filtroDocente = elementos.filtroDocente?.value.toLowerCase() || '';
    
    let portafoliosFiltrados = PortafoliosAdmin.todosLosPortafolios;
    
    // Filtrar por ciclo
    if (filtroCiclo) {
        portafoliosFiltrados = portafoliosFiltrados.filter(p => 
            p.ciclo && p.ciclo.id == filtroCiclo
        );
    }
    
    // Filtrar por estado
    if (filtroEstado) {
        portafoliosFiltrados = portafoliosFiltrados.filter(p => 
            p.estado === filtroEstado
        );
    }
    
    // Filtrar por docente
    if (filtroDocente) {
        portafoliosFiltrados = portafoliosFiltrados.filter(p => {
            const docente = p.docente || {};
            const nombreCompleto = `${docente.nombres || ''} ${docente.apellidos || ''}`.toLowerCase();
            return nombreCompleto.includes(filtroDocente);
        });
    }
    
    // Renderizar portafolios filtrados
    renderizarPortafolios(portafoliosFiltrados);
    
    // Mostrando portafolios filtrados
}

/**
 * Renderizar portafolios en la tabla
 */
function renderizarPortafolios(portafolios) {
    const tbody = PortafoliosAdmin.elementos.cuerpoTablaPortafolios;
    if (!tbody) return;
    
    if (!portafolios || portafolios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-search"></i> No se encontraron portafolios con los filtros aplicados
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = portafolios.map(portafolio => {
        const docente = portafolio.docente || {};
        const asignatura = portafolio.asignatura || {};
        const ciclo = portafolio.ciclo || {};
        
        // Calcular progreso (simulado por ahora)
        const progreso = Math.floor(Math.random() * 100);
        const estadoBadge = getEstadoBadge(portafolio.estado || 'activo');
        
        return `
            <tr>
                <td><strong>${docente.nombres || 'N/A'} ${docente.apellidos || ''}</strong></td>
                <td>
                    <div>${asignatura.nombre || 'Sin asignatura'}</div>
                    <small class="text-muted">${asignatura.codigo || ''} - ${asignatura.carrera || ''}</small>
                </td>
                <td><span class="badge bg-info">${ciclo.nombre || 'N/A'}</span></td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar ${getProgressColor(progreso)}" style="width: ${progreso}%;">${progreso}%</div>
                    </div>
                </td>
                <td>${estadoBadge}</td>
                <td>${formatearFecha(portafolio.actualizado_en)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" title="Ver portafolio" data-action="ver" data-portafolio-id="${portafolio.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" title="Editar" data-action="editar" data-portafolio-id="${portafolio.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ================================================
// FUNCIONES DE UTILIDAD
// ================================================

/**
 * Obtener badge de estado
 */
function getEstadoBadge(estado) {
    const estados = {
        'activo': '<span class="badge bg-success">Activo</span>',
        'inactivo': '<span class="badge bg-secondary">Inactivo</span>',
        'completado': '<span class="badge bg-primary">Completado</span>',
        'en_revision': '<span class="badge bg-warning">En Revisión</span>',
        'observado': '<span class="badge bg-danger">Observado</span>'
    };
    return estados[estado] || '<span class="badge bg-secondary">Desconocido</span>';
}

/**
 * Obtener color de progreso
 */
function getProgressColor(progreso) {
    if (progreso >= 80) return 'bg-success';
    if (progreso >= 60) return 'bg-info';
    if (progreso >= 40) return 'bg-warning';
    return 'bg-danger';
}

/**
 * Formatear fecha
 */
function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES', {hour: '2-digit', minute: '2-digit'});
}

/**
 * Obtener ciclo seleccionado desde el sistema de sincronización global
 */
function obtenerCicloSeleccionado() {
    // Prioridad 1: Sistema de sincronización global
    if (window.SincronizacionCiclos && typeof window.SincronizacionCiclos.obtenerCicloActual === 'function') {
        const cicloActual = window.SincronizacionCiclos.obtenerCicloActual();
        if (cicloActual && cicloActual.id) {
            return cicloActual.id;
        }
    }
    
    // Prioridad 2: Intentar obtener desde diferentes selectores posibles
    const selectores = [
        '#selectCiclo',
        '#filtroCiclo',
        '#selectorCiclo select',
        'select[name="ciclo"]',
        '#cicloAcademico'
    ];
    
    for (const selector of selectores) {
        const elemento = document.querySelector(selector);
        if (elemento && elemento.value) {
            return elemento.value;
        }
    }
    
    // Prioridad 3: Fallback desde almacenamiento local o sesión
    return localStorage.getItem('cicloSeleccionado') || sessionStorage.getItem('cicloSeleccionado') || null;
}

/**
 * Función debounce para optimizar búsquedas
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Mostrar notificación
 */
function mostrarNotificacion(tipo, mensaje) {
    // Log de portafolios
    
    // Usar la función global si está disponible
    if (typeof window.mostrarNotificacion === 'function' && window.mostrarNotificacion !== mostrarNotificacion) {
        window.mostrarNotificacion(mensaje, tipo);
        return;
    }
    
    // Crear notificación simple como fallback
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    };
    
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass[tipo]} alert-dismissible fade show position-fixed`;
    alert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}

// ================================================
// ACCIONES DE PORTAFOLIOS
// ================================================

/**
 * Ver portafolio
 */
function verPortafolio(id) {
    console.log('👁️ Ejecutando verPortafolio con ID:', id);
    
    // Buscar portafolio real (mock: buscar en PortafoliosAdmin.todosLosPortafolios si existe)
    let portafolio = null;
    if (window.PortafoliosAdmin && Array.isArray(window.PortafoliosAdmin.todosLosPortafolios)) {
        portafolio = window.PortafoliosAdmin.todosLosPortafolios.find(p => p.id === id);
    }
    // Si no se encuentra, usar mock
    if (!portafolio) {
        portafolio = {
            docente: { nombres: 'Docente Demo', apellidos: 'Apellido' },
            asignatura: { nombre: 'Curso Demo', codigo: 'CD101', creditos: 3 },
            archivos: []
        };
    }
    const creditos = parseInt(portafolio.asignatura.creditos || 0, 10);
    const esCursoLargo = creditos >= 4;

    // Estructura base del portafolio (según Portafolio Base.md), personalizada y dinámica
    const estructura = [
        {
            nombre: '0. PRESENTACIÓN DEL PORTAFOLIO',
            subcarpetas: [
                { nombre: '0.1 CARÁTULA', archivos: [] },
                { nombre: '0.2 CARGA ACADÉMICA', archivos: [] },
                { nombre: '0.3 FILOSOFÍA DOCENTE', archivos: [] },
                { nombre: '0.4 CURRÍCULUM VITAE', archivos: [] }
            ]
        },
        {
            nombre: `Curso: ${portafolio.asignatura.nombre} – ${portafolio.asignatura.codigo} (${creditos} créditos)`,
            subcarpetas: [
                {
                    nombre: '1. SILABOS',
                    subcarpetas: [
                        { nombre: '1.1 SILABO UNSAAC', archivos: [] },
                        { nombre: '1.2 SILABO ICACIT', archivos: [] },
                        { nombre: '1.3 REGISTRO DE ENTREGA DE SILABO', archivos: [] }
                    ]
                },
                { nombre: '2. AVANCE ACADÉMICO POR SESIONES', archivos: [] },
                {
                    nombre: '3. MATERIAL DE ENSEÑANZA',
                    subcarpetas: [
                        { nombre: '3.1 PRIMERA UNIDAD', archivos: [] },
                        { nombre: '3.2 SEGUNDA UNIDAD', archivos: [] },
                        ...(esCursoLargo ? [{ nombre: '3.3 TERCERA UNIDAD', archivos: [] }] : [])
                    ]
                },
                { nombre: '4. ASIGNACIONES', archivos: [] },
                {
                    nombre: '5. ENUNCIADO DE EXÁMENES Y SOLUCIÓN',
                    subcarpetas: [
                        {
                            nombre: '5.1 EXAMEN DE ENTRADA',
                            subcarpetas: [
                                { nombre: '5.1.1 ENUNCIADO DE EXAMEN Y RESOLUCIÓN', archivos: [] },
                                { nombre: '5.1.2 ASISTENCIA AL EXAMEN', archivos: [] },
                                { nombre: '5.1.3 INFORME DE RESULTADOS', archivos: [] }
                            ]
                        },
                        {
                            nombre: '5.2 PRIMER EXAMEN',
                            subcarpetas: [
                                { nombre: '5.2.1 ENUNCIADO Y RESOLUCIÓN DE EXAMEN', archivos: [] },
                                { nombre: '5.2.2 ASISTENCIA AL EXAMEN', archivos: [] },
                                { nombre: '5.2.3 INFORME DE RESULTADOS', archivos: [] }
                            ]
                        },
                        {
                            nombre: '5.3 SEGUNDO EXAMEN',
                            subcarpetas: [
                                { nombre: '5.3.1 ENUNCIADO Y RESOLUCIÓN DE EXAMEN', archivos: [] },
                                { nombre: '5.3.2 ASISTENCIA AL EXAMEN', archivos: [] },
                                { nombre: '5.3.3 INFORME DE RESULTADOS', archivos: [] }
                            ]
                        },
                        ...(
                            esCursoLargo
                                ? [{
                                    nombre: '5.4 TERCER EXAMEN',
                                    subcarpetas: [
                                        { nombre: '5.4.1 ENUNCIADO Y RESOLUCIÓN DE EXAMEN', archivos: [] },
                                        { nombre: '5.4.2 ASISTENCIA AL EXAMEN', archivos: [] },
                                        { nombre: '5.4.3 INFORME DE RESULTADOS', archivos: [] }
                                    ]
                                }]
                                : []
                        )
                    ]
                },
                {
                    nombre: '6. TRABAJOS ESTUDIANTILES',
                    subcarpetas: [
                        { nombre: '6.1 EXCELENTE (19–20)', archivos: [] },
                        { nombre: '6.2 BUENO (16–18)', archivos: [] },
                        { nombre: '6.3 REGULAR (14–15)', archivos: [] },
                        { nombre: '6.4 MALO (10–13)', archivos: [] },
                        { nombre: '6.5 POBRE (0–07)', archivos: [] }
                    ]
                },
                {
                    nombre: '7. ARCHIVOS PORTAFOLIO DOCENTE',
                    subcarpetas: [
                        { nombre: '7.1 ASISTENCIA DE ALUMNOS', archivos: [] },
                        { nombre: '7.2 REGISTRO DE NOTAS DEL CENTRO DE CÓMPUTO', archivos: [] },
                        { nombre: '7.3 CIERRE DE PORTAFOLIO', archivos: [] }
                    ]
                }
            ]
        }
    ];

    // Renderizar estructura como árbol HTML, mostrando archivos si existen
    const html = renderArbolEstructura(estructura);
    const contenedor = document.getElementById('estructuraPortafolioContenido');
    
    if (!contenedor) {
        console.error('❌ No se encontró el contenedor del modal');
        mostrarNotificacion('error', 'Error: No se encontró el contenedor del modal');
        return;
    }
    
    contenedor.innerHTML = html;
    console.log('✅ Estructura renderizada en el modal');

    // Mostrar el modal (Bootstrap 5)
    const modalElement = document.getElementById('estructuraPortafolioModal');
    if (!modalElement) {
        console.error('❌ No se encontró el elemento del modal');
        mostrarNotificacion('error', 'Error: No se encontró el modal');
        return;
    }
    
    try {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        console.log('✅ Modal abierto correctamente');
    } catch (error) {
        console.error('❌ Error al abrir el modal:', error);
        mostrarNotificacion('error', 'Error al abrir el modal: ' + error.message);
    }
}

// Renderiza un árbol de carpetas recursivo, mostrando archivos si existen
function renderArbolEstructura(nodos, ruta = []) {
    if (!nodos || !nodos.length) return '';
    let html = '<ul class="list-group list-group-flush">';
    for (let i = 0; i < nodos.length; i++) {
        const nodo = nodos[i];
        const esHoja = !(nodo.subcarpetas && nodo.subcarpetas.length);
        const idCarpeta = [...ruta, nodo.nombre].join('>');
        html += `<li class="list-group-item">
            <i class="fas fa-folder-open text-warning me-1"></i> ${nodo.nombre}`;
        // Botón de subida solo en hojas
        if (esHoja) {
            html += ` <button class="btn btn-sm btn-outline-success ms-2" data-upload-carpeta="${encodeURIComponent(idCarpeta)}">
                <i class="fas fa-upload"></i> Seleccionar Archivo
            </button>
            <input type="file" class="d-none" data-input-carpeta="${encodeURIComponent(idCarpeta)}">`;
        }
        // Mostrar archivos si existen
        if (nodo.archivos && nodo.archivos.length) {
            html += '<ul class="list-group ms-4">';
            for (const archivo of nodo.archivos) {
                html += `<li class="list-group-item py-1">
                    <i class="fas fa-file-alt text-secondary me-1"></i> ${archivo.nombre}
                    <span class="badge bg-${getBadgeColor(archivo.estado)} ms-2">${archivo.estado}</span>
                </li>`;
            }
            html += '</ul>';
        }
        // Subcarpetas recursivas
        if (nodo.subcarpetas && nodo.subcarpetas.length) {
            html += renderArbolEstructura(nodo.subcarpetas, [...ruta, nodo.nombre]);
        }
        html += '</li>';
    }
    html += '</ul>';
    return html;
}

// Devuelve el color de badge según estado de archivo
function getBadgeColor(estado) {
    switch ((estado||'').toLowerCase()) {
        case 'aprobado': return 'success';
        case 'pendiente': return 'secondary';
        case 'en revisión': return 'warning';
        case 'rechazado': return 'danger';
        default: return 'light';
    }
}

/**
 * Editar portafolio
 */
function editarPortafolio(id) {
    // Editar portafolio
    // TODO: Implementar edición del portafolio
    mostrarNotificacion('info', 'Funcionalidad en desarrollo');
}

// ================================================
// INICIALIZACIÓN AUTOMÁTICA
// ================================================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializar);

// Exponer funciones globalmente para el HTML
window.PortafoliosAdmin = {
    inicializar,
    cargarPortafolios,
    generarPortafolios,
    aplicarFiltros,
    verPortafolio,
    editarPortafolio,
    
    // Getters para acceso a datos
    get todosLosPortafolios() { return PortafoliosAdmin.todosLosPortafolios; },
    get ciclosDisponibles() { return PortafoliosAdmin.ciclosDisponibles; },
    get cargando() { return PortafoliosAdmin.cargando; }
};

console.log('🌍 PortafoliosAdmin expuesto globalmente:', window.PortafoliosAdmin);
console.log('🔍 Función verPortafolio disponible:', typeof window.PortafoliosAdmin.verPortafolio);

// Event delegation para subida de archivos en el modal
document.addEventListener('click', function(event) {
    const btn = event.target.closest('button[data-upload-carpeta]');
    if (btn) {
        const carpetaId = btn.getAttribute('data-upload-carpeta');
        const input = document.querySelector(`input[data-input-carpeta='${carpetaId}']`);
        if (input) input.click();
    }
});
document.addEventListener('change', function(event) {
    const input = event.target;
    if (input.type === 'file' && input.hasAttribute('data-input-carpeta')) {
        const carpetaId = input.getAttribute('data-input-carpeta');
        if (input.files && input.files[0]) {
            // Simular subida: mostrar archivo en la carpeta correspondiente (mock)
            mostrarArchivoEnCarpetaMock(carpetaId, input.files[0].name);
        }
        input.value = '';
    }
});

// Simula agregar el archivo subido a la estructura visual (solo mock, no persiste)
function mostrarArchivoEnCarpetaMock(carpetaId, nombreArchivo) {
    // Buscar el contenedor de la carpeta y agregar el archivo visualmente
    // (En una implementación real, esto actualizaría la estructura de datos y re-renderizaría el árbol)
    const btn = document.querySelector(`button[data-upload-carpeta='${carpetaId}']`);
    if (!btn) return;
    const li = btn.closest('li.list-group-item');
    if (!li) return;
    // Crear elemento archivo
    const ulArchivos = li.querySelector('ul.list-group.ms-4') || (() => {
        const ul = document.createElement('ul');
        ul.className = 'list-group ms-4';
        li.appendChild(ul);
        return ul;
    })();
    const liArchivo = document.createElement('li');
    liArchivo.className = 'list-group-item py-1';
    liArchivo.innerHTML = `<i class='fas fa-file-alt text-secondary me-1'></i> ${nombreArchivo} <span class='badge bg-secondary ms-2'>pendiente</span>`;
    ulArchivos.appendChild(liArchivo);
}
