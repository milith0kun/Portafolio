/**
 * Sistema de Generación de Portafolios
 * Maneja la creación, actualización y visualización de portafolios docentes
 */

const GeneracionPortafolios = {
    // Estado del sistema
    estado: {
        portafoliosGenerados: [],
        portafolioActual: null,
        cargando: false,
        ultimaGeneracion: null,
        servidorOffline: false
    },

    // Configuración
    config: {
        endpoints: {
            portafolios: '/portafolios',
            generar: '/portafolios/generar',
            ver: '/portafolios',
            actualizar: '/portafolios'
        },
        intervalos: {
            actualizacion: 10000, // 10 segundos
            verificacion: 30000   // 30 segundos
        }
    },

    /**
     * Inicializar el sistema de generación de portafolios
     */
    inicializar() {
        console.log('📚 Inicializando sistema de generación de portafolios...');
        
        // Configurar eventos
        this.configurarEventos();
        
        // Cargar portafolios existentes
        this.cargarPortafoliosExistentes();
        
        // Configurar actualización automática
        this.configurarActualizacionAutomatica();
        
        console.log('✅ Sistema de generación de portafolios inicializado');
    },

    /**
     * Configurar eventos del sistema
     */
    configurarEventos() {
        // Escuchar eventos de cambio de ciclo
        document.addEventListener('ciclo-cambiado', (event) => {
            const { cicloId } = event.detail;
            console.log(`🔄 Ciclo cambiado, actualizando portafolios para ciclo: ${cicloId}`);
            this.actualizarPortafoliosPorCiclo(cicloId);
        });

        // Escuchar eventos de generación manual
        document.addEventListener('generar-portafolios', (event) => {
            const { cicloId, docenteId } = event.detail;
            this.generarPortafolios(cicloId, docenteId);
        });

        // Escuchar eventos de visualización
        document.addEventListener('ver-portafolio', (event) => {
            const { portafolioId } = event.detail;
            this.verPortafolio(portafolioId);
        });
    },

    /**
     * Cargar portafolios existentes
     */
    async cargarPortafoliosExistentes() {
        try {
            this.estado.cargando = true;
            
            const cicloActual = window.SincronizacionCiclos?.obtenerCicloActual()?.id || '1';
            const response = await window.apiRequest(`${this.config.endpoints.portafolios}?ciclo=${cicloActual}`, 'GET');
            
            this.estado.portafoliosGenerados = Array.isArray(response.data) ? response.data : [];
            console.log(`✅ Portafolios cargados: ${this.estado.portafoliosGenerados.length}`);
            
            // Actualizar interfaz
            this.actualizarInterfazPortafolios();
            
        } catch (error) {
            // Marcar servidor como offline
            this.estado.servidorOffline = true;
            this.estado.portafoliosGenerados = [];
            
            // Solo mostrar error si no es un problema de conexión
            if (!error.message?.includes('Failed to fetch')) {
                console.error('❌ Error cargando portafolios existentes:', error);
            } else {
                console.log('📡 Servidor no disponible, no se pueden cargar portafolios');
            }
            
            // No crear datos de ejemplo, mantener array vacío
            this.estado.portafoliosGenerados = [];
        } finally {
            this.estado.cargando = false;
        }
    },

    /**
     * Generar portafolios para un ciclo específico
     */
    async generarPortafolios(cicloId, docenteId = null) {
        try {
            console.log(`🔄 Generando portafolios para ciclo: ${cicloId}${docenteId ? `, docente: ${docenteId}` : ''}`);
            
            this.estado.cargando = true;
            this.mostrarIndicadorGeneracion(true);
            
            const datos = {
                cicloId: cicloId,
                docenteId: docenteId,
                fechaGeneracion: new Date().toISOString()
            };
            
            const response = await window.apiRequest(this.config.endpoints.generar, 'POST', datos);
            
            if (response.success) {
                console.log('✅ Portafolios generados correctamente');
                this.mostrarNotificacion('Portafolios generados correctamente', 'success');
                
                // Recargar portafolios
                await this.cargarPortafoliosExistentes();
                
                // Emitir evento de generación completada
                this.emitirEvento('portafolios-generados', {
                    cicloId: cicloId,
                    cantidad: response.data?.cantidad || 0,
                    timestamp: new Date()
                });
            } else {
                throw new Error(response.message || 'Error generando portafolios');
            }
            
        } catch (error) {
            console.error('❌ Error generando portafolios:', error);
            this.mostrarNotificacion(`Error generando portafolios: ${error.message}`, 'error');
        } finally {
            this.estado.cargando = false;
            this.mostrarIndicadorGeneracion(false);
        }
    },

    /**
     * Ver un portafolio específico
     */
    async verPortafolio(portafolioId) {
        try {
            console.log(`👁️ Visualizando portafolio: ${portafolioId}`);
            
            const response = await window.apiRequest(`${this.config.endpoints.ver}/${portafolioId}`, 'GET');
            
            if (response.success) {
                this.estado.portafolioActual = response.data;
                this.mostrarPortafolio(response.data);
            } else {
                throw new Error(response.message || 'Error obteniendo portafolio');
            }
            
        } catch (error) {
            console.error('❌ Error visualizando portafolio:', error);
            this.mostrarNotificacion(`Error visualizando portafolio: ${error.message}`, 'error');
        }
    },

    /**
     * Actualizar portafolios por ciclo
     */
    async actualizarPortafoliosPorCiclo(cicloId) {
        try {
            console.log(`🔄 Actualizando portafolios para ciclo: ${cicloId}`);
            
            // Simplemente recargar los portafolios existentes
            await this.cargarPortafoliosExistentes();
            
        } catch (error) {
            console.error('❌ Error actualizando portafolios:', error);
        }
    },

    /**
     * Mostrar portafolio en interfaz
     */
    mostrarPortafolio(portafolio) {
        // Crear modal para mostrar el portafolio
        const modalHTML = `
            <div class="modal fade" id="modalPortafolio" tabindex="-1" aria-labelledby="modalPortafolioLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="modalPortafolioLabel">
                                Portafolio: ${portafolio.docente?.nombres || 'Docente'} ${portafolio.docente?.apellidos || ''}
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="portafolio-content">
                                <div class="portafolio-header">
                                    <h4>Información General</h4>
                                    <div class="portafolio-info">
                                        <p><strong>Ciclo:</strong> ${portafolio.ciclo?.nombre || 'N/A'}</p>
                                        <p><strong>Asignatura:</strong> ${portafolio.asignatura?.nombre || 'N/A'}</p>
                                        <p><strong>Estado:</strong> 
                                            <span class="badge bg-${this.obtenerColorEstado(portafolio.estado)}">${portafolio.estado || 'Pendiente'}</span>
                                        </p>
                                    </div>
                                </div>
                                
                                <div class="portafolio-sections">
                                    ${this.generarSeccionesPortafolio(portafolio)}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                            <button type="button" class="btn btn-primary" onclick="GeneracionPortafolios.descargarPortafolio(${portafolio.id})">
                                <i class="fas fa-download"></i> Descargar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Agregar modal al DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalPortafolio'));
        modal.show();
        
        // Limpiar modal después de cerrar
        document.getElementById('modalPortafolio').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    },

    /**
     * Generar secciones del portafolio
     */
    generarSeccionesPortafolio(portafolio) {
        const secciones = [
            {
                titulo: 'Documentos Subidos',
                contenido: this.generarListaDocumentos(portafolio.documentos || [])
            },
            {
                titulo: 'Observaciones',
                contenido: this.generarListaObservaciones(portafolio.observaciones || [])
            },
            {
                titulo: 'Verificaciones',
                contenido: this.generarListaVerificaciones(portafolio.verificaciones || [])
            }
        ];
        
        return secciones.map(seccion => `
            <div class="portafolio-section">
                <h5>${seccion.titulo}</h5>
                <div class="section-content">
                    ${seccion.contenido}
                </div>
            </div>
        `).join('');
    },

    /**
     * Generar lista de documentos
     */
    generarListaDocumentos(documentos) {
        if (documentos.length === 0) {
            return '<p class="text-muted">No hay documentos subidos</p>';
        }
        
        return `
            <div class="documentos-list">
                ${documentos.map(doc => `
                    <div class="documento-item">
                        <i class="fas fa-file-alt"></i>
                        <span class="documento-nombre">${doc.nombre}</span>
                        <span class="badge bg-${this.obtenerColorEstado(doc.estado)}">${doc.estado}</span>
                        <small class="text-muted">${new Date(doc.fechaSubida).toLocaleDateString()}</small>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Generar lista de observaciones
     */
    generarListaObservaciones(observaciones) {
        if (observaciones.length === 0) {
            return '<p class="text-muted">No hay observaciones</p>';
        }
        
        return `
            <div class="observaciones-list">
                ${observaciones.map(obs => `
                    <div class="observacion-item">
                        <div class="observacion-header">
                            <strong>${obs.verificador?.nombres || 'Verificador'}</strong>
                            <small class="text-muted">${new Date(obs.fecha).toLocaleDateString()}</small>
                        </div>
                        <p class="observacion-texto">${obs.observacion}</p>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Generar lista de verificaciones
     */
    generarListaVerificaciones(verificaciones) {
        if (verificaciones.length === 0) {
            return '<p class="text-muted">No hay verificaciones</p>';
        }
        
        return `
            <div class="verificaciones-list">
                ${verificaciones.map(ver => `
                    <div class="verificacion-item">
                        <div class="verificacion-header">
                            <strong>${ver.verificador?.nombres || 'Verificador'}</strong>
                            <span class="badge bg-${this.obtenerColorEstado(ver.estado)}">${ver.estado}</span>
                        </div>
                        <p class="verificacion-comentario">${ver.comentario || 'Sin comentarios'}</p>
                        <small class="text-muted">${new Date(ver.fecha).toLocaleDateString()}</small>
                    </div>
                `).join('')}
            </div>
        `;
    },

    /**
     * Obtener color para estado
     */
    obtenerColorEstado(estado) {
        const colores = {
            'aprobado': 'success',
            'observado': 'warning',
            'rechazado': 'danger',
            'pendiente': 'secondary',
            'en_revision': 'info'
        };
        return colores[estado?.toLowerCase()] || 'secondary';
    },

    /**
     * Actualizar interfaz de portafolios
     */
    actualizarInterfazPortafolios() {
        // Verificar que portafoliosGenerados sea un array
        if (!Array.isArray(this.estado.portafoliosGenerados)) {
            console.warn('⚠️ portafoliosGenerados no es un array, inicializando...');
            this.estado.portafoliosGenerados = [];
        }
        
        // Actualizar contadores en el dashboard
        const elementos = {
            totalPortafolios: this.estado.portafoliosGenerados.length,
            portafoliosCompletados: this.estado.portafoliosGenerados.filter(p => p.estado === 'aprobado').length,
            portafoliosPendientes: this.estado.portafoliosGenerados.filter(p => p.estado === 'pendiente').length,
            portafoliosObservados: this.estado.portafoliosGenerados.filter(p => p.estado === 'observado').length,
            portafoliosEnRevision: this.estado.portafoliosGenerados.filter(p => p.estado === 'en_revision').length,
            portafoliosRechazados: this.estado.portafoliosGenerados.filter(p => p.estado === 'rechazado').length
        };
        
        Object.entries(elementos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = valor;
            }
        });
        
        // Actualizar lista de portafolios si existe
        this.actualizarListaPortafolios();
        
        // Actualizar estadísticas en el dashboard
        this.actualizarEstadisticasPortafolios();
    },

    /**
     * Actualizar lista de portafolios
     */
    actualizarListaPortafolios() {
        const contenedor = document.getElementById('listaPortafolios');
        if (!contenedor) return;
        
        const html = this.estado.portafoliosGenerados.map(portafolio => `
            <div class="portafolio-card" data-id="${portafolio.id}">
                <div class="portafolio-header">
                    <h6>${portafolio.docente?.nombres || 'Docente'} ${portafolio.docente?.apellidos || ''}</h6>
                    <span class="badge bg-${this.obtenerColorEstado(portafolio.estado)}">${portafolio.estado || 'Pendiente'}</span>
                </div>
                <div class="portafolio-body">
                    <p><strong>Asignatura:</strong> ${portafolio.asignatura?.nombre || 'N/A'}</p>
                    <p><strong>Ciclo:</strong> ${portafolio.ciclo?.nombre || 'N/A'}</p>
                    <p><strong>Documentos:</strong> ${portafolio.documentos?.length || 0}</p>
                </div>
                <div class="portafolio-actions">
                    <button class="btn btn-sm btn-primary" onclick="GeneracionPortafolios.verPortafolio(${portafolio.id})">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="btn btn-sm btn-success" onclick="GeneracionPortafolios.descargarPortafolio(${portafolio.id})">
                        <i class="fas fa-download"></i> Descargar
                    </button>
                </div>
            </div>
        `).join('');
        
        contenedor.innerHTML = html;
    },

    /**
     * Actualizar estadísticas de portafolios en el dashboard
     */
    actualizarEstadisticasPortafolios() {
        const estadisticas = this.obtenerEstadisticas();
        
        // Actualizar elementos del dashboard si existen
        const actualizarElemento = (id, valor) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.textContent = valor;
            }
        };
        
        // Actualizar contadores de portafolios
        actualizarElemento('totalPortafolios', estadisticas.total);
        actualizarElemento('activePortafolios', estadisticas.aprobados);
        actualizarElemento('completedPortafolios', estadisticas.aprobados);
        actualizarElemento('pendingPortafolios', estadisticas.pendientes);
        actualizarElemento('observedPortafolios', estadisticas.observados);
        actualizarElemento('rejectedPortafolios', estadisticas.rechazados);
        actualizarElemento('inVerificationPortafolios', estadisticas.enRevision);
        
        // Calcular progreso promedio
        const progresoPromedio = this.estado.portafoliosGenerados.length > 0 
            ? Math.round(this.estado.portafoliosGenerados.reduce((sum, p) => sum + (p.progreso || 0), 0) / this.estado.portafoliosGenerados.length)
            : 0;
        
        actualizarElemento('averageProgress', `${progresoPromedio}%`);
        
        console.log('📊 Estadísticas de portafolios actualizadas:', estadisticas);
    },

    /**
     * Descargar portafolio
     */
    async descargarPortafolio(portafolioId) {
        try {
            console.log(`📥 Descargando portafolio: ${portafolioId}`);
            
            const response = await window.apiRequest(`${this.config.endpoints.portafolios}/${portafolioId}/descargar`, 'GET');
            
            if (response.success) {
                // Crear enlace de descarga
                const link = document.createElement('a');
                link.href = response.data.url;
                link.download = `portafolio_${portafolioId}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.mostrarNotificacion('Portafolio descargado correctamente', 'success');
            } else {
                throw new Error(response.message || 'Error descargando portafolio');
            }
            
        } catch (error) {
            console.error('❌ Error descargando portafolio:', error);
            this.mostrarNotificacion(`Error descargando portafolio: ${error.message}`, 'error');
        }
    },

    /**
     * Configurar actualización automática
     */
    configurarActualizacionAutomatica() {
        // Reducir frecuencia y agregar detección de servidor offline
        this.intervaloId = setInterval(() => {
            if (!this.estado.cargando && !this.estado.servidorOffline) {
                this.cargarPortafoliosExistentes();
            }
        }, 120000); // Cambiar de 30s a 2 minutos
    },

    /**
     * Mostrar indicador de generación
     */
    mostrarIndicadorGeneracion(mostrar) {
        const indicador = document.getElementById('indicadorGeneracion');
        if (indicador) {
            indicador.style.display = mostrar ? 'block' : 'none';
        }
    },

    /**
     * Mostrar notificación
     */
    mostrarNotificacion(mensaje, tipo = 'info') {
        if (window.UITablero?.mostrarNotificacion) {
            window.UITablero.mostrarNotificacion(mensaje, tipo);
        } else {
            // Fallback básico
            alert(`${tipo.toUpperCase()}: ${mensaje}`);
        }
    },

    /**
     * Emitir evento personalizado
     */
    emitirEvento(tipo, datos) {
        const evento = new CustomEvent(tipo, {
            detail: datos,
            bubbles: true
        });
        document.dispatchEvent(evento);
    },



    /**
     * Obtener estadísticas de portafolios
     */
    obtenerEstadisticas() {
        if (!Array.isArray(this.estado.portafoliosGenerados)) {
            return {
                total: 0,
                aprobados: 0,
                pendientes: 0,
                observados: 0,
                rechazados: 0,
                enRevision: 0
            };
        }
        
        const portafolios = this.estado.portafoliosGenerados;
        
        return {
            total: portafolios.length,
            aprobados: portafolios.filter(p => p.estado === 'aprobado').length,
            pendientes: portafolios.filter(p => p.estado === 'pendiente').length,
            observados: portafolios.filter(p => p.estado === 'observado').length,
            rechazados: portafolios.filter(p => p.estado === 'rechazado').length,
            enRevision: portafolios.filter(p => p.estado === 'en_revision').length
        };
    }
};

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        GeneracionPortafolios.inicializar();
    });
} else {
    GeneracionPortafolios.inicializar();
}

// Exportar al scope global
window.GeneracionPortafolios = GeneracionPortafolios;

console.log('✅ Sistema de generación de portafolios cargado'); 