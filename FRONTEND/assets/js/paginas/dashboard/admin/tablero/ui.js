/**
 * TABLERO ADMIN - MÓDULO UI
 * Manejo de interfaz de usuario y renderizado
 */

// ================================================
// CONFIGURACIÓN DE ELEMENTOS UI
// ================================================

const uiConfig = {
    elementos: {
        // Estado del sistema
        estadoSistema: 'estadoSistema',
        systemStatusBadge: 'systemStatusBadge',
        systemStatusMessage: 'systemStatusMessage',
        
        // Métricas
        totalUsuarios: 'totalUsuarios',
        usuariosActivos: 'usuariosActivos',
        portafoliosCompletos: 'portafoliosCompletos',
        portafoliosPendientes: 'portafoliosPendientes',
        asignaturasRegistradas: 'asignaturasRegistradas',
        verificacionesPendientes: 'verificacionesPendientes',
        
        // Información de ciclo
        cicloActualNombre: 'cicloActualNombre',
        cicloActualPeriodo: 'cicloActualPeriodo',
        cicloActualFechas: 'cicloActualFechas',
        
        // Actividades recientes
        actividadesRecientes: 'actividadesRecientes',
        
        // Navegación
        selectorCiclo: 'selectCiclo',
        btnActualizarDatos: 'btnActualizarDatos',
        
        // Indicadores de carga
        indicadorCarga: 'indicadorCarga',
        ultimaActualizacion: 'ultimaActualizacion'
    },
    
    clases: {
        activo: 'active',
        cargando: 'loading',
        error: 'error',
        exito: 'success',
        warning: 'warning',
        oculto: 'hidden',
        visible: 'visible'
    }
};

// ================================================
// INICIALIZACIÓN DEL MÓDULO UI
// ================================================

async function initialize() {
    try {
        configurarEventosUI();
        configurarTooltipsYPopovers();
        configurarAnimaciones();
        
        // Renderizado inicial
        await renderizarInterfazCompleta();
        
    } catch (error) {
        throw error;
    }
}

// ================================================
// CONFIGURACIÓN DE EVENTOS UI
// ================================================

function configurarEventosUI() {
    // Botón de actualización manual
    const btnActualizar = document.getElementById(uiConfig.elementos.btnActualizarDatos);
    if (btnActualizar) {
        btnActualizar.addEventListener('click', manejarActualizacionManual);
    }
    
    // Selector de ciclo - intentar múltiples métodos
    let selectorCiclo = document.getElementById(uiConfig.elementos.selectorCiclo);
    if (!selectorCiclo) {
        // Fallback directo
        selectorCiclo = document.getElementById('selectCiclo');
    }
    
    if (selectorCiclo) {
        selectorCiclo.addEventListener('change', manejarCambioCiclo);
    } else {
        // Configurar evento delegado como fallback
        document.addEventListener('change', function(event) {
            if (event.target.id === 'selectCiclo' || event.target.matches('#selectCiclo')) {
                manejarCambioCiclo(event);
            }
        });
    }
    
    // Eventos de teclado para accesibilidad
    document.addEventListener('keydown', manejarEventosTeclado);
}

function configurarTooltipsYPopovers() {
    // Configurar tooltips con opciones personalizadas
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(el => {
        new bootstrap.Tooltip(el, {
            delay: { show: 500, hide: 100 },
            placement: 'auto'
        });
    });
    
    // Configurar popovers
    const popovers = document.querySelectorAll('[data-bs-toggle="popover"]');
    popovers.forEach(el => {
        new bootstrap.Popover(el, {
            trigger: 'hover focus',
            placement: 'auto'
        });
    });
}

function configurarAnimaciones() {
    // Configurar animaciones CSS para transiciones suaves
    const style = document.createElement('style');
    style.textContent = `
        .metric-card { transition: all 0.3s ease; }
        .metric-card:hover { transform: translateY(-2px); }
        .loading-animation { 
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
}

// ================================================
// RENDERIZADO PRINCIPAL
// ================================================

async function renderizarInterfazCompleta() {
    try {
        mostrarIndicadorCarga(true);
        
        // Pequeño retraso para asegurar que el DOM esté listo
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Renderizar secciones en paralelo
        await Promise.all([
            renderizarEstadoSistema(),
            renderizarMetricas(),
            renderizarInformacionCiclo(),
            renderizarActividadesRecientes(),
            renderizarSelectorCiclo()
        ]);
        
        actualizarUltimaActualizacion();
        
        // Detectar datos disparejos después de renderizar
        setTimeout(() => {
            detectarDatosDisparejos();
        }, 300);
        
        // Forzar visibilidad de las tarjetas al final
        setTimeout(() => {
            mostrarTarjetasDashboard();
        }, 200);
        
    } catch (error) {
        // Error renderizando interfaz
        mostrarErrorEnInterfaz('Error al cargar el dashboard');
    } finally {
        mostrarIndicadorCarga(false);
    }
}

// ================================================
// RENDERIZADO DE ESTADO DEL SISTEMA
// ================================================

function renderizarEstadoSistema() {
    const estadoSistema = window.DataTablero?.obtenerEstadoSistema?.();
    if (!estadoSistema) return;
    
    const badge = document.getElementById(uiConfig.elementos.systemStatusBadge);
    const mensaje = document.getElementById(uiConfig.elementos.systemStatusMessage);
    
    if (badge) {
        badge.className = `badge ${estadoSistema.activo ? 'bg-success' : 'bg-danger'}`;
        badge.textContent = estadoSistema.activo ? 'Activo' : 'Inactivo';
    }
    
    if (mensaje) {
        mensaje.textContent = estadoSistema.mensaje || 'Estado no disponible';
    }
}

// ================================================
// RENDERIZADO DE MÉTRICAS
// ================================================

function renderizarMetricas() {
    const metricas = window.DataTablero?.obtenerMetricas?.();
    if (!metricas) {
        // Solo mostrar warning si no es un problema de servidor offline
        if (!window.DataTablero?.obtenerEstadoSistema?.()?.servidorOffline) {
        }
        
        return;
    }
    

    
    // Mapeo correcto usando datos reales del servidor
    const mapeoElementos = {
        // Usuarios
        'totalUsers': metricas.usuarios || 0,
        'activeUsers': metricas.usuariosActivos || 0,
        'pendingUsers': (metricas.usuarios || 0) - (metricas.usuariosActivos || 0),
        
        // Roles (usando datos reales)
        'teacherCount': metricas.roles?.docentes || 0,
        'verifierCount': metricas.roles?.verificadores || 0,
        'adminCount': metricas.roles?.administradores || 0,
        
        // Portafolios
        'totalPortafolios': metricas.portafolios || 0,
        'activePortafolios': metricas.portafoliosActivos || 0,
        'completedPortafolios': metricas.portafoliosCompletados || 0,
        'averageProgress': metricas.portafolios > 0 ? 
            Math.round((metricas.portafoliosCompletados || 0) / metricas.portafolios * 100) + '%' : '0%',
        'inVerificationPortafolios': metricas.portafoliosEnVerificacion || 0,
        
        // Documentos (usando datos reales)
        'totalDocuments': metricas.documentos?.total || 0,
        'approvedDocuments': metricas.documentos?.aprobados || 0,
        'pendingDocuments': metricas.documentos?.pendientes || 0,
        'observedDocuments': metricas.documentos?.observados || 0
    };
    
    // Verificar si hay un ciclo seleccionado
    const cicloSeleccionado = window.DataTablero?.obtenerCicloSeleccionado?.();
    const informacionCiclo = metricas.ciclo || metricas.cicloActivo;
    

    
    // Mostrar información del ciclo si está disponible
    if (cicloSeleccionado && informacionCiclo) {
        // Actualizar información del ciclo en la interfaz
        const cicloNombre = document.getElementById('nombreCiclo');
        if (cicloNombre) {
            cicloNombre.textContent = informacionCiclo.nombre || `Ciclo ${cicloSeleccionado}`;
        }
        
        // Crear objeto de ciclo con información completa
        const cicloInfo = {
            id: cicloSeleccionado,
            nombre: informacionCiclo.nombre || `Ciclo ${cicloSeleccionado}`,
            estado: informacionCiclo.estado || 'activo',
            ...informacionCiclo
        };
        
        // Agregar indicador visual de que las estadísticas son del ciclo seleccionado
        agregarIndicadorCiclo(cicloInfo);
    } else if (cicloSeleccionado) {
        // Hay ciclo seleccionado pero sin información detallada
        const cicloInfo = {
            id: cicloSeleccionado,
            nombre: `Ciclo ${cicloSeleccionado}`,
            estado: 'activo'
        };
        
        agregarIndicadorCiclo(cicloInfo);
    } else {
        agregarIndicadorSinCiclo();
    }
    
    // Actualizar valores con animación
    Object.entries(mapeoElementos).forEach(([htmlId, valor]) => {
        const elemento = document.getElementById(htmlId);
        if (!elemento) {
            return;
        }
        const valorActual = parseInt(elemento.textContent) || 0;
        if (typeof valor === 'string' && valor.includes('%')) {
            elemento.textContent = valor;
        } else {
            animarNumero(elemento, valorActual, parseInt(valor));
        }
    });
    

    
    // Asegurar que las tarjetas sean visibles
    mostrarTarjetasDashboard();
}

/**
 * Animar cambio de número
 */
function animarNumero(elemento, valorInicial, valorFinal, duracion = 1000) {
    const diferencia = valorFinal - valorInicial;
    const pasos = 60; // 60 FPS
    const incremento = diferencia / pasos;
    let valorActual = valorInicial;
    let contador = 0;
    
    const intervalo = setInterval(() => {
        contador++;
        valorActual += incremento;
        
        if (contador >= pasos) {
            elemento.textContent = valorFinal.toLocaleString();
            clearInterval(intervalo);
        } else {
            elemento.textContent = Math.round(valorActual).toLocaleString();
        }
    }, duracion / pasos);
}

/**
 * Agregar indicador visual del ciclo activo
 */
function agregarIndicadorCiclo(cicloActivo) {
    // Buscar la sección del dashboard
    const dashboardOverview = document.querySelector('.dashboard-overview');
    if (!dashboardOverview) return;
    
    // Remover indicador anterior si existe
    const indicadorExistente = document.querySelector('.cycle-indicator');
    if (indicadorExistente) {
        indicadorExistente.remove();
    }
    
    // Crear indicador del ciclo
    const indicador = document.createElement('div');
    indicador.className = 'cycle-indicator';
    indicador.innerHTML = `
        <div class="cycle-indicator-content">
            <i class="fas fa-calendar-check"></i>
            <span>Estadísticas del ciclo <strong>${cicloActivo.nombre}</strong></span>
            <span class="cycle-status active">Activo</span>
        </div>
    `;
    
    // Insertar antes de las tarjetas
    dashboardOverview.insertBefore(indicador, dashboardOverview.firstChild);
    
    // Agregar estilos
    agregarEstilosIndicador();
}

/**
 * Agregar indicador cuando no hay ciclo activo
 */
function agregarIndicadorSinCiclo() {
    // Buscar la sección del dashboard
    const dashboardOverview = document.querySelector('.dashboard-overview');
    if (!dashboardOverview) return;
    
    // Remover indicador anterior si existe
    const indicadorExistente = document.querySelector('.cycle-indicator');
    if (indicadorExistente) {
        indicadorExistente.remove();
    }
    
    // Crear indicador genérico
    const indicador = document.createElement('div');
    indicador.className = 'cycle-indicator warning';
    indicador.innerHTML = `
        <div class="cycle-indicator-content">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Estadísticas generales <strong>(sin ciclo académico activo)</strong></span>
            <span class="cycle-status warning">General</span>
        </div>
    `;
    
    // Insertar antes de las tarjetas
    dashboardOverview.insertBefore(indicador, dashboardOverview.firstChild);
    
    // Agregar estilos
    agregarEstilosIndicador();
}

/**
 * Agregar estilos para el indicador de ciclo
 */
function agregarEstilosIndicador() {
    const styles = `
        .cycle-indicator {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.75rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .cycle-indicator.warning {
            background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
            box-shadow: 0 4px 12px rgba(255, 193, 7, 0.2);
        }
        
        .cycle-indicator-content {
            display: flex;
            align-items: center;
            gap: 1rem;
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        .cycle-indicator-content i {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .cycle-status {
            margin-left: auto;
            padding: 0.3rem 0.8rem;
            border-radius: 1rem;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .cycle-status.active {
            background: rgba(255, 255, 255, 0.2);
            color: white;
        }
        
        .cycle-status.warning {
            background: rgba(255, 255, 255, 0.3);
            color: #212529;
        }
    `;
    
    // Verificar si los estilos ya existen
    let styleSheet = document.getElementById('cycle-indicator-styles');
    if (!styleSheet) {
        styleSheet = document.createElement('style');
        styleSheet.id = 'cycle-indicator-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
}

/**
 * Asegurar que las tarjetas del dashboard sean visibles
 */
function mostrarTarjetasDashboard() {
    const dashboardCards = document.querySelector('.dashboard-cards');
    if (dashboardCards) {
        dashboardCards.style.display = 'grid';
        dashboardCards.style.opacity = '1';
        dashboardCards.style.visibility = 'visible';
        
        // Asegurar que cada tarjeta individual sea visible
        const cards = dashboardCards.querySelectorAll('.dashboard-card');
        cards.forEach(card => {
            card.style.display = 'block';
            card.style.opacity = '1';
            card.style.visibility = 'visible';
        });
        
    }
}

// ================================================
// RENDERIZADO DE INFORMACIÓN DE CICLO
// ================================================

function renderizarInformacionCiclo() {
    const ciclo = window.DataTablero?.obtenerCicloActual?.();
    
    const elementos = {
        nombre: document.getElementById(uiConfig.elementos.cicloActualNombre),
        periodo: document.getElementById(uiConfig.elementos.cicloActualPeriodo),
        fechas: document.getElementById(uiConfig.elementos.cicloActualFechas)
    };
    
    if (ciclo) {
        if (elementos.nombre) elementos.nombre.textContent = ciclo.nombre || 'Sin nombre';
        if (elementos.periodo) elementos.periodo.textContent = ciclo.periodo || 'No definido';
        if (elementos.fechas) {
            const fechaInicio = ciclo.fechaInicio ? new Date(ciclo.fechaInicio).toLocaleDateString() : 'N/A';
            const fechaFin = ciclo.fechaFin ? new Date(ciclo.fechaFin).toLocaleDateString() : 'N/A';
            elementos.fechas.textContent = `${fechaInicio} - ${fechaFin}`;
        }
    } else {
        if (elementos.nombre) elementos.nombre.textContent = 'No definido';
        if (elementos.periodo) elementos.periodo.textContent = 'No disponible';
        if (elementos.fechas) elementos.fechas.textContent = 'Sin fechas';
    }
}

// ================================================
// RENDERIZADO DE ACTIVIDADES RECIENTES
// ================================================

function renderizarActividadesRecientes() {
    const actividades = window.DataTablero?.obtenerActividadesRecientes?.() || [];
    const contenedor = document.getElementById(uiConfig.elementos.actividadesRecientes);
    
    if (!contenedor) return;
    
    if (actividades.length === 0) {
        contenedor.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-info-circle"></i>
                <p>No hay actividades recientes</p>
            </div>
        `;
        return;
    }
    
    const actividadesHTML = actividades.map(actividad => `
        <div class="activity-item d-flex align-items-center mb-3">
            <div class="activity-icon me-3">
                <i class="fas ${obtenerIconoActividad(actividad.tipo)}"></i>
            </div>
            <div class="activity-content flex-grow-1">
                <h6 class="mb-1">${actividad.titulo || 'Actividad sin título'}</h6>
                <p class="text-muted mb-0 small">${actividad.descripcion || 'Sin descripción'}</p>
                <small class="text-muted">${formatearFecha(actividad.fecha)}</small>
            </div>
        </div>
    `).join('');
    
    contenedor.innerHTML = actividadesHTML;
}

function obtenerIconoActividad(tipo) {
    const iconos = {
        'portafolio': 'fa-folder',
        'verificacion': 'fa-check-circle',
        'usuario': 'fa-user',
        'asignatura': 'fa-book',
        'sistema': 'fa-cog',
        'default': 'fa-info-circle'
    };
    
    return iconos[tipo] || iconos.default;
}

// ================================================
// RENDERIZADO DE SELECTOR DE CICLO
// ================================================

function renderizarSelectorCiclo() {
    const ciclos = window.DataTablero?.obtenerCiclosDisponibles?.() || [];
    const selector = document.getElementById(uiConfig.elementos.selectorCiclo);
    const select = selector ? selector.querySelector('select') || selector.querySelector('#selectCiclo') || selector : null;
    if (!selector || !select) return;

    // Limpiar opciones
    select.innerHTML = '<option value="">Seleccionar ciclo...</option>';

    let cicloActivo = null;
    ciclos.forEach(ciclo => {
        const option = document.createElement('option');
        option.value = ciclo.id;
        let texto = ciclo.nombre;
        if (ciclo.estado === 'activo') {
            texto += ' (Activo)';
            option.selected = true;
            cicloActivo = ciclo;
        }
        option.textContent = texto;
        select.appendChild(option);
    });

    // Actualizar bloque de ciclo activo
    if (cicloActivo) {
        const nombreCiclo = document.getElementById('nombreCiclo');
        const fechaInicio = document.getElementById('fechaInicioCiclo');
        const fechaFin = document.getElementById('fechaFinCiclo');
        if (nombreCiclo) nombreCiclo.textContent = cicloActivo.nombre;
        if (fechaInicio) fechaInicio.textContent = cicloActivo.fecha_inicio ? cicloActivo.fecha_inicio.split('T')[0].split('-').reverse().join('/') : '--/--/----';
        if (fechaFin) fechaFin.textContent = cicloActivo.fecha_fin ? cicloActivo.fecha_fin.split('T')[0].split('-').reverse().join('/') : '--/--/----';
    }

    // Evento de cambio de ciclo
    select.onchange = (e) => {
        const cicloId = e.target.value;
        const cicloSel = ciclos.find(c => c.id == cicloId);
        if (cicloSel) {
            if (document.getElementById('nombreCiclo')) document.getElementById('nombreCiclo').textContent = cicloSel.nombre;
            if (document.getElementById('fechaInicioCiclo')) document.getElementById('fechaInicioCiclo').textContent = cicloSel.fecha_inicio ? cicloSel.fecha_inicio.split('T')[0].split('-').reverse().join('/') : '--/--/----';
            if (document.getElementById('fechaFinCiclo')) document.getElementById('fechaFinCiclo').textContent = cicloSel.fecha_fin ? cicloSel.fecha_fin.split('T')[0].split('-').reverse().join('/') : '--/--/----';
        }
    };
}

// ================================================
// MANEJADORES DE EVENTOS
// ================================================

async function manejarActualizacionManual(event) {
    event.preventDefault();
    
    const boton = event.target;
    const textoOriginal = boton.textContent;
    const esSincronizacionCompleta = boton.dataset.action === 'sync-complete';
    
    try {
        boton.disabled = true;
        
        if (esSincronizacionCompleta) {
            boton.innerHTML = '<i class="fas fa-sync fa-spin"></i> Sincronizando...';
            
            // Forzar sincronización completa
            if (window.DataTablero?.forzarSincronizacion) {
                await window.DataTablero.forzarSincronizacion();
            } else {
                // Fallback: limpiar caché y actualizar
                if (window.DataTablero?.limpiarCacheCompleto) {
                    window.DataTablero.limpiarCacheCompleto();
                }
                await window.DataTablero?.actualizarDatos();
            }
            
            await renderizarInterfazCompleta();
            mostrarNotificacion('Sincronización completa realizada', 'success');
            
        } else {
            boton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
            
            if (window.DataTablero?.actualizarDatos) {
                await window.DataTablero.actualizarDatos();
                await renderizarInterfazCompleta();
            }
            
            mostrarNotificacion('Datos actualizados correctamente', 'success');
        }
        
    } catch (error) {
        // Error en actualización
        const mensaje = esSincronizacionCompleta ? 
            'Error al sincronizar datos' : 'Error al actualizar datos';
        mostrarNotificacion(mensaje, 'error');
    } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
}

/**
 * Detectar y manejar datos disparejos
 */
function detectarDatosDisparejos() {
    const metricas = window.DataTablero?.obtenerMetricas?.();
    if (!metricas) return false;
    
    // Verificar inconsistencias comunes
    const inconsistencias = [];
    
    // Verificar si los totales son coherentes
    if (metricas.usuariosActivos > metricas.usuarios) {
        inconsistencias.push('Usuarios activos mayor que total de usuarios');
    }
    
    if (metricas.portafoliosCompletados > metricas.portafolios) {
        inconsistencias.push('Portafolios completados mayor que total de portafolios');
    }
    
    if (metricas.documentos?.aprobados > metricas.documentos?.total) {
        inconsistencias.push('Documentos aprobados mayor que total de documentos');
    }
    
    // Verificar valores negativos
    const campos = ['usuarios', 'portafolios', 'usuariosActivos', 'portafoliosActivos'];
    campos.forEach(campo => {
        if (metricas[campo] < 0) {
            inconsistencias.push(`Valor negativo en ${campo}`);
        }
    });
    
    if (inconsistencias.length > 0) {
        mostrarAlertaDatosDisparejos(inconsistencias);
        return true;
    }
    
    return false;
}

/**
 * Mostrar alerta de datos disparejos con opción de sincronización
 */
function mostrarAlertaDatosDisparejos(inconsistencias) {
    const alertaHTML = `
        <div class="alert alert-warning alert-dismissible fade show" role="alert" id="alerta-datos-disparejos">
            <i class="fas fa-exclamation-triangle"></i>
            <strong>Datos inconsistentes detectados:</strong>
            <ul class="mb-2 mt-2">
                ${inconsistencias.map(inc => `<li>${inc}</li>`).join('')}
            </ul>
            <button type="button" class="btn btn-sm btn-outline-warning me-2" onclick="window.UITablero.forzarSincronizacion()">
                <i class="fas fa-sync"></i> Sincronizar Datos
            </button>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Insertar alerta al inicio del contenido del dashboard
    const contenedor = document.querySelector('.dashboard-content') || document.querySelector('.container-fluid');
    if (contenedor) {
        // Remover alerta anterior si existe
        const alertaAnterior = document.getElementById('alerta-datos-disparejos');
        if (alertaAnterior) {
            alertaAnterior.remove();
        }
        
        contenedor.insertAdjacentHTML('afterbegin', alertaHTML);
    }
}

/**
 * Función pública para forzar sincronización desde la interfaz
 */
async function forzarSincronizacion() {
    try {
        mostrarIndicadorCarga(true);
        
        if (window.DataTablero?.forzarSincronizacion) {
            await window.DataTablero.forzarSincronizacion();
            await renderizarInterfazCompleta();
            
            // Remover alerta de datos disparejos
            const alerta = document.getElementById('alerta-datos-disparejos');
            if (alerta) {
                alerta.remove();
            }
            
            mostrarNotificacion('Datos sincronizados correctamente', 'success');
        }
        
    } catch (error) {
        // Error en sincronización forzada
        mostrarNotificacion('Error al sincronizar datos', 'error');
    } finally {
        mostrarIndicadorCarga(false);
    }
}

async function manejarCambioCiclo(event) {
    const cicloId = event.target.value;
    
    try {
        // Mostrar indicador de carga
        mostrarIndicadorCarga(true);
        
        // Usar el sistema de datos para establecer el ciclo y actualizar
        if (window.DataTablero?.establecerCicloSeleccionado) {
            await DataTablero.establecerCicloSeleccionado(cicloId);
            
            // Actualizar la interfaz con los nuevos datos
            await renderizarInterfazCompleta();
            
            // Mostrar notificación de éxito
            const nombreCiclo = document.querySelector('#selectCiclo option:checked')?.textContent || 'Desconocido';
            mostrarNotificacion(`Datos actualizados para: ${nombreCiclo}`, 'success');
        } else {
            // Fallback si no está disponible el módulo de datos
            localStorage.setItem('cicloSeleccionado', cicloId);
            mostrarNotificacion(`Ciclo seleccionado: ${cicloId}`, 'info');
            
            // Forzar actualización de la interfaz
            setTimeout(() => {
                renderizarInterfazCompleta();
            }, 100);
        }
        
    } catch (error) {

        mostrarNotificacion('Error al cambiar el ciclo académico', 'error');
    } finally {
        mostrarIndicadorCarga(false);
    }
}

function manejarEventosTeclado(event) {
    // Shortcuts de teclado
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case 'r':
                event.preventDefault();
                document.getElementById(uiConfig.elementos.btnActualizarDatos)?.click();
                break;
        }
    }
}

// ================================================
// FUNCIONES DE UTILIDAD UI
// ================================================

function mostrarIndicadorCarga(mostrar) {
    const indicador = document.getElementById(uiConfig.elementos.indicadorCarga);
    if (indicador) {
        indicador.style.display = mostrar ? 'block' : 'none';
    }
}

function actualizarUltimaActualizacion() {
    const ultimaActualizacion = window.DataTablero?.obtenerUltimaActualizacion?.();
    const elemento = document.getElementById(uiConfig.elementos.ultimaActualizacion);
    
    if (elemento && ultimaActualizacion) {
        elemento.textContent = `Última actualización: ${formatearFecha(ultimaActualizacion)}`;
    }
}

function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    
    const date = new Date(fecha);
    const ahora = new Date();
    const diferencia = ahora - date;
    
    if (diferencia < 60000) { // Menos de 1 minuto
        return 'Hace unos segundos';
    } else if (diferencia < 3600000) { // Menos de 1 hora
        const minutos = Math.floor(diferencia / 60000);
        return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
    } else if (diferencia < 86400000) { // Menos de 1 día
        const horas = Math.floor(diferencia / 3600000);
        return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    } else {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
}

function mostrarErrorEnInterfaz(mensaje) {
    const contenedor = document.querySelector('.dashboard-content');
    if (contenedor) {
        const errorHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>Error:</strong> ${mensaje}
            </div>
        `;
        contenedor.insertAdjacentHTML('afterbegin', errorHTML);
    }
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    // Implementación básica de notificaciones
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${tipo === 'error' ? 'danger' : tipo === 'success' ? 'success' : 'info'} border-0`;
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${mensaje}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    // Agregar toast al contenedor de toasts o crear uno
    let contenedorToasts = document.getElementById('toast-container');
    if (!contenedorToasts) {
        contenedorToasts = document.createElement('div');
        contenedorToasts.id = 'toast-container';
        contenedorToasts.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(contenedorToasts);
    }
    
    contenedorToasts.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remover el toast después de que se oculte
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// ================================================
// FUNCIÓN PÚBLICA DE ACTUALIZACIÓN
// ================================================

async function actualizarInterfaz() {
    await renderizarInterfazCompleta();
}

// ================================================
// EXPORTACIÓN DEL MÓDULO
// ================================================

window.UITablero = {
    // Inicialización
    initialize,
    
    // Renderizado
    renderizarInterfazCompleta,
    actualizarInterfaz,
    
    // Componentes específicos
    renderizarEstadoSistema,
    renderizarMetricas,
    renderizarInformacionCiclo,
    renderizarActividadesRecientes,
    
    // Detección y sincronización
    detectarDatosDisparejos,
    forzarSincronizacion,
    mostrarAlertaDatosDisparejos,
    
    // Utilidades
    mostrarNotificacion,
    mostrarIndicadorCarga,
    formatearFecha
};