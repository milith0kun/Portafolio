/**
 * MÓDULO DE GESTIÓN DE DOCUMENTOS - Dashboard Docente
 * Permite a los docentes subir, gestionar y organizar documentos en sus portafolios
 */

class GestionDocumentos {
    constructor() {
        this.portafolioSeleccionado = null;
        this.seccionActual = null;
        this.documentosCargados = {};
        this.configuracion = {
            maxTamanoArchivo: 10 * 1024 * 1024, // 10MB
            tiposPermitidos: [],
            seccionesPortafolio: {}
        };
        
        this.elementos = {
            contenedorPrincipal: null,
            selectorPortafolio: null,
            pestanasSeccion: null,
            areaSubida: null,
            listaDocumentos: null,
            progresoGeneral: null
        };
        
        this.inicializarModulo();
    }
    
    /**
     * Inicialización del módulo
     */
    async inicializarModulo() {
        try {
            console.log('🔧 Iniciando módulo de gestión de documentos...');
            
            await this.cargarConfiguracion();
            this.configurarInterfaz();
            this.configurarEventos();
            await this.cargarPortafoliosDocente();
            
            console.log('✅ Módulo de gestión de documentos iniciado');
        } catch (error) {
            console.error('❌ Error al inicializar módulo:', error);
            this.mostrarError('Error al inicializar el módulo de documentos');
        }
    }
    
    /**
     * Cargar configuración desde el servidor
     */
    async cargarConfiguracion() {
        try {
            // Verificar autenticación
            if (!sistemaAuth.verificarAutenticacion()) {
                throw new Error('Usuario no autenticado');
            }
            
            const headers = sistemaAuth.construirHeaders();
            
            // Cargar tipos de archivos permitidos
            const resTipos = await fetch(`${CONFIG.API.BASE_URL}/documentos/tipos-permitidos`, {
                headers
            });
            
            if (resTipos.ok) {
                const dataTipos = await resTipos.json();
                this.configuracion.tiposPermitidos = dataTipos.data;
            }
            
            // Cargar estructura de secciones
            const resSecciones = await fetch(`${CONFIG.API.BASE_URL}/documentos/secciones-portafolio`, {
                headers
            });
            
            if (resSecciones.ok) {
                const dataSecciones = await resSecciones.json();
                this.configuracion.seccionesPortafolio = dataSecciones.data;
            }
            
            console.log('✅ Configuración cargada:', this.configuracion);
        } catch (error) {
            console.warn('⚠️ Error al cargar configuración:', error);
            if (error.message === 'Usuario no autenticado') {
                window.location.href = '../../autenticacion/login.html';
            }
        }
    }
    
    /**
     * Configurar la interfaz del módulo
     */
    configurarInterfaz() {
        // Buscar contenedor principal
        this.elementos.contenedorPrincipal = document.getElementById('gestion-documentos') ||
                                           document.querySelector('.gestion-documentos');
        
        if (!this.elementos.contenedorPrincipal) {
            this.crearInterfazCompleta();
        }
        
        // Asignar elementos de la interfaz
        this.elementos.selectorPortafolio = document.getElementById('selector-portafolio');
        this.elementos.pestanasSeccion = document.getElementById('pestanas-seccion');
        this.elementos.areaSubida = document.getElementById('area-subida');
        this.elementos.listaDocumentos = document.getElementById('lista-documentos');
        this.elementos.progresoGeneral = document.getElementById('progreso-general');
        
        this.crearPestanasSecciones();
    }
    
    /**
     * Crear interfaz completa si no existe
     */
    crearInterfazCompleta() {
        const contenedor = document.createElement('div');
        contenedor.id = 'gestion-documentos';
        contenedor.className = 'gestion-documentos-container';
        
        contenedor.innerHTML = `
            <div class="gestion-header">
                <h2>📁 Gestión de Documentos</h2>
                <div class="selector-portafolio-wrapper">
                    <label for="selector-portafolio">Seleccionar Portafolio:</label>
                    <select id="selector-portafolio" class="form-select">
                        <option value="">Cargando portafolios...</option>
                    </select>
                </div>
            </div>
            
            <div id="progreso-general" class="progreso-general" style="display: none;">
                <div class="progreso-info">
                    <span class="progreso-texto">Progreso General: <span id="progreso-porcentaje">0%</span></span>
                    <div class="progreso-barra">
                        <div class="progreso-fill" style="width: 0%"></div>
                    </div>
                </div>
            </div>
            
            <div id="pestanas-seccion" class="pestanas-seccion" style="display: none;">
                <!-- Las pestañas se generarán dinámicamente -->
            </div>
            
            <div class="contenido-seccion" style="display: none;">
                <div id="area-subida" class="area-subida">
                    <div class="drop-zone" id="drop-zone">
                        <div class="drop-zone-content">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Arrastra archivos aquí o <button class="btn-upload">selecciona archivos</button></p>
                            <input type="file" id="file-input" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.png,.gif" style="display: none;">
                            <div class="file-types-info">
                                <small>Tipos permitidos: PDF, Word, Excel, PowerPoint, Imágenes (máx. 10MB)</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="lista-documentos" class="lista-documentos">
                    <!-- Los documentos se mostrarán aquí -->
                </div>
            </div>
            
            <div class="acciones-generales" style="display: none;">
                <button id="btn-actualizar-progreso" class="btn btn-secondary">
                    <i class="fas fa-sync"></i> Actualizar Progreso
                </button>
                <button id="btn-exportar-portafolio" class="btn btn-info">
                    <i class="fas fa-download"></i> Exportar Portafolio
                </button>
            </div>
        `;
        
        // Buscar dónde insertar la interfaz
        const contenedorTablero = document.querySelector('.dashboard-content') ||
                                 document.querySelector('.main-content') ||
                                 document.body;
        
        contenedorTablero.appendChild(contenedor);
        this.elementos.contenedorPrincipal = contenedor;
    }
    
    /**
     * Crear pestañas de secciones del portafolio según estructura UNSAAC
     */
    crearPestanasSecciones() {
        if (!this.elementos.pestanasSeccion) return;
        
        const secciones = this.configuracion.seccionesPortafolio;
        let html = '<div class="nav nav-tabs nav-justified" role="tablist">';
        
        Object.entries(secciones).forEach(([clave, seccion], index) => {
            const activa = index === 0 ? 'active' : '';
            const esGlobal = seccion.es_global ? '🌐' : '';
            const tieneSubcarpetas = seccion.subcarpetas ? '📁' : '📄';
            
            html += `
                <button class="nav-link ${activa}" 
                        id="tab-${clave}" 
                        data-seccion="${clave}"
                        role="tab"
                        title="${seccion.descripcion}">
                    ${tieneSubcarpetas} ${seccion.nombre} ${esGlobal}
                    <span class="badge badge-secondary ml-2" id="count-${clave}">0</span>
                    <div class="peso-seccion">
                        <small>${seccion.peso_evaluacion}%</small>
                    </div>
                </button>
            `;
        });
        
        html += '</div>';
        this.elementos.pestanasSeccion.innerHTML = html;
    }
    
    /**
     * Configurar eventos del módulo
     */
    configurarEventos() {
        // Cambio de portafolio
        if (this.elementos.selectorPortafolio) {
            this.elementos.selectorPortafolio.addEventListener('change', (e) => {
                this.seleccionarPortafolio(e.target.value);
            });
        }
        
        // Cambio de pestaña
        if (this.elementos.pestanasSeccion) {
            this.elementos.pestanasSeccion.addEventListener('click', (e) => {
                if (e.target.matches('[data-seccion]')) {
                    this.cambiarSeccion(e.target.dataset.seccion);
                }
            });
        }
        
        // Área de subida drag & drop
        this.configurarDragAndDrop();
        
        // Botón de selección de archivos
        const btnUpload = document.querySelector('.btn-upload');
        const fileInput = document.getElementById('file-input');
        
        if (btnUpload && fileInput) {
            btnUpload.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.manejarArchivosSeleccionados(e.target.files));
        }
        
        // Botones de acción
        const btnActualizar = document.getElementById('btn-actualizar-progreso');
        const btnExportar = document.getElementById('btn-exportar-portafolio');
        
        if (btnActualizar) {
            btnActualizar.addEventListener('click', () => this.actualizarProgreso());
        }
        
        if (btnExportar) {
            btnExportar.addEventListener('click', () => this.exportarPortafolio());
        }
    }
    
    /**
     * Configurar drag and drop
     */
    configurarDragAndDrop() {
        const dropZone = document.getElementById('drop-zone');
        if (!dropZone) return;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.prevenirDefault, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
        });
        
        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.manejarArchivosSeleccionados(files);
        });
    }
    
    /**
     * Prevenir comportamiento por defecto
     */
    prevenirDefault(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    /**
     * Cargar portafolios del docente
     */
    async cargarPortafoliosDocente() {
        try {
            if (!sistemaAuth.verificarAutenticacion()) {
                throw new Error('Usuario no autenticado');
            }
            
            const response = await fetch(`${CONFIG.API.BASE_URL}/portafolios/mis-portafolios`, {
                headers: sistemaAuth.construirHeaders()
            });
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    sistemaAuth.limpiarSesion();
                    window.location.href = '../../autenticacion/login.html';
                    return;
                }
                throw new Error('Error al cargar portafolios');
            }
            
            const data = await response.json();
            this.llenarSelectorPortafolios(data.data);
            
        } catch (error) {
            console.error('❌ Error al cargar portafolios:', error);
            this.mostrarError('Error al cargar sus portafolios');
        }
    }
    
    /**
     * Llenar selector de portafolios
     */
    llenarSelectorPortafolios(portafolios) {
        if (!this.elementos.selectorPortafolio) return;
        
        let html = '<option value="">Seleccione un portafolio</option>';
        
        portafolios.forEach(portafolio => {
            html += `
                <option value="${portafolio.id}">
                    ${portafolio.asignatura?.nombre || 'Sin asignatura'} 
                    - Grupo ${portafolio.grupo || 'N/A'}
                    (${Math.round(portafolio.progreso_completado || 0)}% completado)
                </option>
            `;
        });
        
        this.elementos.selectorPortafolio.innerHTML = html;
    }
    
    /**
     * Seleccionar portafolio
     */
    async seleccionarPortafolio(portafolioId) {
        if (!portafolioId) {
            this.ocultarSeccionesPortafolio();
            return;
        }
        
        this.portafolioSeleccionado = portafolioId;
        this.mostrarSeccionesPortafolio();
        
        await this.cargarDocumentosPortafolio();
        await this.actualizarProgreso();
        
        // Seleccionar primera sección por defecto
        const primeraSeccion = Object.keys(this.configuracion.seccionesPortafolio)[0];
        if (primeraSeccion) {
            this.cambiarSeccion(primeraSeccion);
        }
    }
    
    /**
     * Mostrar secciones del portafolio
     */
    mostrarSeccionesPortafolio() {
        const elementos = [
            this.elementos.pestanasSeccion,
            document.querySelector('.contenido-seccion'),
            document.querySelector('.acciones-generales'),
            this.elementos.progresoGeneral
        ];
        
        elementos.forEach(elemento => {
            if (elemento) elemento.style.display = 'block';
        });
    }
    
    /**
     * Ocultar secciones del portafolio
     */
    ocultarSeccionesPortafolio() {
        const elementos = [
            this.elementos.pestanasSeccion,
            document.querySelector('.contenido-seccion'),
            document.querySelector('.acciones-generales'),
            this.elementos.progresoGeneral
        ];
        
        elementos.forEach(elemento => {
            if (elemento) elemento.style.display = 'none';
        });
    }
    
    /**
     * Cambiar sección activa
     */
    cambiarSeccion(seccion) {
        this.seccionActual = seccion;
        
        // Actualizar pestañas activas
        document.querySelectorAll('.nav-link').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const tabActual = document.getElementById(`tab-${seccion}`);
        if (tabActual) {
            tabActual.classList.add('active');
        }
        
        // Mostrar documentos de la sección
        this.mostrarDocumentosSeccion(seccion);
        
        // Actualizar información de la sección
        this.mostrarInfoSeccion(seccion);
    }
    
    /**
     * Cargar documentos del portafolio
     */
    async cargarDocumentosPortafolio() {
        if (!this.portafolioSeleccionado) return;
        
        try {
            const response = await fetch(`/api/documentos/portafolio/${this.portafolioSeleccionado}`, {
                headers: { 'Authorization': `Bearer ${this.obtenerToken()}` }
            });
            
            if (!response.ok) throw new Error('Error al cargar documentos');
            
            const data = await response.json();
            this.documentosCargados = data.data;
            
            this.actualizarContadoresSecciones();
            
        } catch (error) {
            console.error('❌ Error al cargar documentos:', error);
            this.mostrarError('Error al cargar documentos del portafolio');
        }
    }
    
    /**
     * Actualizar contadores de documentos por sección
     */
    actualizarContadoresSecciones() {
        Object.keys(this.configuracion.seccionesPortafolio).forEach(seccion => {
            const contador = document.getElementById(`count-${seccion}`);
            const documentosSeccion = this.documentosCargados[seccion] || [];
            
            if (contador) {
                contador.textContent = documentosSeccion.length;
                contador.className = `badge ${documentosSeccion.length > 0 ? 'badge-success' : 'badge-secondary'} ml-2`;
            }
        });
    }
    
    /**
     * Mostrar documentos de una sección específica
     */
    mostrarDocumentosSeccion(seccion) {
        if (!this.elementos.listaDocumentos) return;
        
        const documentos = this.documentosCargados[seccion] || [];
        let html = '';
        
        if (documentos.length === 0) {
            html = `
                <div class="no-documentos">
                    <i class="fas fa-folder-open"></i>
                    <p>No hay documentos en esta sección</p>
                    <small>Sube documentos utilizando el área de subida superior</small>
                </div>
            `;
        } else {
            html = '<div class="documentos-grid">';
            
            documentos.forEach(doc => {
                html += this.generarTarjetaDocumento(doc);
            });
            
            html += '</div>';
        }
        
        this.elementos.listaDocumentos.innerHTML = html;
        this.configurarEventosDocumentos();
    }
    
    /**
     * Generar tarjeta de documento
     */
    generarTarjetaDocumento(documento) {
        const estadoClase = this.obtenerClaseEstado(documento.estado_verificacion);
        const iconoTipo = this.obtenerIconoTipo(documento.tipo_mime);
        const tamanoMB = (documento.tamano / (1024 * 1024)).toFixed(2);
        
        return `
            <div class="documento-card" data-documento-id="${documento.id}">
                <div class="documento-header">
                    <div class="documento-icon">
                        <i class="${iconoTipo}"></i>
                    </div>
                    <div class="documento-info">
                        <h6 class="documento-nombre" title="${documento.nombre_original}">
                            ${this.truncarTexto(documento.nombre_original, 25)}
                        </h6>
                        <small class="documento-meta">
                            ${tamanoMB} MB • ${new Date(documento.fecha_subida).toLocaleDateString()}
                        </small>
                    </div>
                    <div class="documento-estado">
                        <span class="badge badge-${estadoClase}">${documento.estado_verificacion}</span>
                    </div>
                </div>
                
                ${documento.descripcion ? `
                    <div class="documento-descripcion">
                        <small>${documento.descripcion}</small>
                    </div>
                ` : ''}
                
                <div class="documento-acciones">
                    <button class="btn btn-sm btn-outline-primary" onclick="gestionDocumentos.descargarDocumento(${documento.id})">
                        <i class="fas fa-download"></i> Descargar
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="gestionDocumentos.eliminarDocumento(${documento.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Mostrar información de la sección actual con estructura jerárquica
     */
    mostrarInfoSeccion(seccion) {
        const infoSeccion = this.configuracion.seccionesPortafolio[seccion];
        if (!infoSeccion) return;
        
        const contenedorInfo = document.querySelector('.info-seccion') || this.crearContenedorInfoSeccion();
        
        let htmlSubcarpetas = '';
        if (infoSeccion.subcarpetas) {
            htmlSubcarpetas = `
                <div class="estructura-jerarquica">
                    <h6>📁 Estructura de Carpetas:</h6>
                    <div class="carpetas-tree">
                        ${this.generarArbolCarpetas(infoSeccion.subcarpetas)}
                    </div>
                </div>
            `;
        }
        
        let htmlRequeridos = '';
        if (infoSeccion.documentos_requeridos) {
            htmlRequeridos = `
                <div class="documentos-requeridos">
                    <h6>📋 Documentos Requeridos:</h6>
                    <ul>
                        ${infoSeccion.documentos_requeridos.map(doc => `<li>${doc}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        contenedorInfo.innerHTML = `
            <div class="seccion-detalle">
                <h5>${infoSeccion.nombre}</h5>
                <p>${infoSeccion.descripcion}</p>
                
                ${infoSeccion.es_global ? `
                    <div class="alert alert-info">
                        <i class="fas fa-globe"></i> 
                        <strong>Sección Global:</strong> Esta sección es común para todos sus cursos del semestre.
                    </div>
                ` : ''}
                
                ${htmlSubcarpetas}
                ${htmlRequeridos}
                
                <div class="peso-evaluacion">
                    <small>⚖️ Peso en evaluación: <strong>${infoSeccion.peso_evaluacion}%</strong></small>
                </div>
            </div>
        `;
    }
    
    /**
     * Generar árbol visual de carpetas
     */
    generarArbolCarpetas(subcarpetas) {
        let html = '<ul class="tree-view">';
        
        Object.entries(subcarpetas).forEach(([clave, carpeta]) => {
            const tieneHijos = carpeta.subcarpetas && Object.keys(carpeta.subcarpetas).length > 0;
            const iconoCarpeta = tieneHijos ? '📁' : '📄';
            const esCondicional = carpeta.condicional ? ' <span class="badge badge-warning">4-5 créditos</span>' : '';
            
            html += `
                <li class="tree-item">
                    ${iconoCarpeta} ${carpeta.nombre}${esCondicional}
                    ${carpeta.descripcion ? `<small class="text-muted"> - ${carpeta.descripcion}</small>` : ''}
            `;
            
            if (tieneHijos) {
                html += this.generarArbolCarpetas(carpeta.subcarpetas);
            }
            
            html += '</li>';
        });
        
        html += '</ul>';
        return html;
    }
    
    /**
     * Crear contenedor de información de sección
     */
    crearContenedorInfoSeccion() {
        const contenedor = document.createElement('div');
        contenedor.className = 'info-seccion';
        
        const contenidoSeccion = document.querySelector('.contenido-seccion');
        if (contenidoSeccion) {
            contenidoSeccion.insertBefore(contenedor, contenidoSeccion.firstChild);
        }
        
        return contenedor;
    }
    
    /**
     * Manejar archivos seleccionados
     */
    async manejarArchivosSeleccionados(files) {
        if (!this.portafolioSeleccionado || !this.seccionActual) {
            this.mostrarError('Debe seleccionar un portafolio y una sección');
            return;
        }
        
        const archivosValidos = Array.from(files).filter(file => this.validarArchivo(file));
        
        if (archivosValidos.length === 0) {
            this.mostrarError('No se encontraron archivos válidos para subir');
            return;
        }
        
        // Subir archivos uno por uno
        for (const archivo of archivosValidos) {
            await this.subirArchivo(archivo);
        }
        
        // Recargar documentos y progreso
        await this.cargarDocumentosPortafolio();
        await this.actualizarProgreso();
    }
    
    /**
     * Validar archivo antes de subir
     */
    validarArchivo(file) {
        // Validar tamaño
        if (file.size > this.configuracion.maxTamanoArchivo) {
            this.mostrarError(`El archivo ${file.name} es demasiado grande (máx. 10MB)`);
            return false;
        }
        
        // Validar tipo (esta validación es básica, el servidor hace una más completa)
        const tiposValidos = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.png', '.gif'];
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!tiposValidos.includes(extension)) {
            this.mostrarError(`Tipo de archivo no permitido: ${file.name}`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Subir archivo individual
     */
    async subirArchivo(archivo) {
        const formData = new FormData();
        formData.append('archivo', archivo);
        formData.append('portafolioId', this.portafolioSeleccionado);
        formData.append('seccion', this.seccionActual);
        formData.append('descripcion', ''); // TODO: Permitir agregar descripción
        formData.append('tipoDocumento', 'general');
        
        try {
            this.mostrarProgreso(`Subiendo ${archivo.name}...`);
            
            const response = await fetch('/api/documentos/subir', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.obtenerToken()}`
                },
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error al subir archivo');
            }
            
            const data = await response.json();
            this.mostrarExito(`✅ ${archivo.name} subido exitosamente`);
            
        } catch (error) {
            console.error('❌ Error al subir archivo:', error);
            this.mostrarError(`Error al subir ${archivo.name}: ${error.message}`);
        } finally {
            this.ocultarProgreso();
        }
    }
    
    /**
     * Descargar documento
     */
    async descargarDocumento(documentoId) {
        try {
            const response = await fetch(`/api/documentos/descargar/${documentoId}`, {
                headers: { 'Authorization': `Bearer ${this.obtenerToken()}` }
            });
            
            if (!response.ok) throw new Error('Error al descargar documento');
            
            // Crear enlace de descarga
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            // Obtener nombre del archivo desde el header
            const contentDisposition = response.headers.get('content-disposition');
            const filename = contentDisposition ? 
                contentDisposition.split('filename=')[1].replace(/"/g, '') : 
                'documento';
            
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        } catch (error) {
            console.error('❌ Error al descargar:', error);
            this.mostrarError('Error al descargar el documento');
        }
    }
    
    /**
     * Eliminar documento
     */
    async eliminarDocumento(documentoId) {
        if (!confirm('¿Está seguro de que desea eliminar este documento?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/documentos/${documentoId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.obtenerToken()}` }
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error al eliminar documento');
            }
            
            this.mostrarExito('Documento eliminado exitosamente');
            
            // Recargar documentos y progreso
            await this.cargarDocumentosPortafolio();
            await this.actualizarProgreso();
            
        } catch (error) {
            console.error('❌ Error al eliminar:', error);
            this.mostrarError('Error al eliminar el documento');
        }
    }
    
    /**
     * Actualizar progreso del portafolio
     */
    async actualizarProgreso() {
        if (!this.portafolioSeleccionado) return;
        
        try {
            const response = await fetch(`/api/documentos/progreso/${this.portafolioSeleccionado}`, {
                headers: { 'Authorization': `Bearer ${this.obtenerToken()}` }
            });
            
            if (!response.ok) throw new Error('Error al obtener progreso');
            
            const data = await response.json();
            this.mostrarProgreso(data.data);
            
        } catch (error) {
            console.error('❌ Error al actualizar progreso:', error);
        }
    }
    
    /**
     * Mostrar progreso visual
     */
    mostrarProgresoVisual(datosProgreso) {
        const porcentajeElement = document.getElementById('progreso-porcentaje');
        const barraElement = document.querySelector('.progreso-fill');
        
        if (porcentajeElement) {
            porcentajeElement.textContent = `${datosProgreso.porcentajeTotal}%`;
        }
        
        if (barraElement) {
            barraElement.style.width = `${datosProgreso.porcentajeTotal}%`;
            
            // Cambiar color según progreso
            barraElement.className = 'progreso-fill';
            if (datosProgreso.porcentajeTotal >= 80) {
                barraElement.classList.add('progreso-alto');
            } else if (datosProgreso.porcentajeTotal >= 50) {
                barraElement.classList.add('progreso-medio');
            } else {
                barraElement.classList.add('progreso-bajo');
            }
        }
    }
    
    /**
     * Configurar eventos de documentos
     */
    configurarEventosDocumentos() {
        // Los eventos se manejan con onclick en el HTML generado
        // para evitar conflictos con elementos dinámicos
    }
    
    // ===== MÉTODOS AUXILIARES =====
    
    obtenerToken() {
        return sistemaAuth.obtenerToken();
    }
    
    obtenerClaseEstado(estado) {
        const clases = {
            'pendiente': 'warning',
            'en_revision': 'info',
            'aprobado': 'success',
            'observado': 'danger',
            'rechazado': 'danger'
        };
        return clases[estado] || 'secondary';
    }
    
    obtenerIconoTipo(tipoMime) {
        const iconos = {
            'application/pdf': 'fas fa-file-pdf text-danger',
            'application/msword': 'fas fa-file-word text-primary',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fas fa-file-word text-primary',
            'application/vnd.ms-excel': 'fas fa-file-excel text-success',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fas fa-file-excel text-success',
            'application/vnd.ms-powerpoint': 'fas fa-file-powerpoint text-warning',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'fas fa-file-powerpoint text-warning',
            'image/jpeg': 'fas fa-file-image text-info',
            'image/png': 'fas fa-file-image text-info',
            'image/gif': 'fas fa-file-image text-info'
        };
        return iconos[tipoMime] || 'fas fa-file text-secondary';
    }
    
    truncarTexto(texto, longitud) {
        return texto.length > longitud ? texto.substring(0, longitud) + '...' : texto;
    }
    
    mostrarProgreso(mensaje) {
        // Implementar barra de progreso modal o toast
        console.log('⏳', mensaje);
    }
    
    ocultarProgreso() {
        // Ocultar barra de progreso
        console.log('✅ Progreso oculto');
    }
    
    mostrarExito(mensaje) {
        // Implementar notificación de éxito
        console.log('✅', mensaje);
        // TODO: Integrar con sistema de notificaciones
    }
    
    mostrarError(mensaje) {
        // Implementar notificación de error
        console.error('❌', mensaje);
        // TODO: Integrar con sistema de notificaciones
        alert(mensaje); // Temporal
    }
}

// Inicializar módulo cuando se carga la página
let gestionDocumentos;

document.addEventListener('DOMContentLoaded', () => {
    gestionDocumentos = new GestionDocumentos();
});

// Exportar para uso global
window.GestionDocumentos = GestionDocumentos; 