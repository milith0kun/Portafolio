/**
 * JavaScript para Portafolios del Docente
 * Maneja la visualización de estructura jerárquica y subida de archivos
 */

class PortafoliosDocente {
  constructor() {
    this.portafolios = [];
    this.portafolioActual = null;
    this.estructuraActual = null;
    this.carpetaSeleccionada = null;
    this.apiService = window.ApiService;
    
    this.init();
  }
  
  async init() {
    console.log('📁 Inicializando Portafolios del Docente');
    
    this.configurarEventos();
    await this.cargarMisPortafolios();
  }
  
  configurarEventos() {
    // Botón refrescar
    const btnRefrescar = document.getElementById('btnRefrescar');
    if (btnRefrescar) {
      btnRefrescar.addEventListener('click', () => this.cargarMisPortafolios());
    }
    
    // Event listeners para subida de archivos
    document.addEventListener('change', (e) => {
      if (e.target.id === 'archivoInput') {
        this.manejarSeleccionArchivos(e);
      }
    });
    
    // Event listeners para drag and drop
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.target.closest('.zona-subida')) {
        e.target.closest('.zona-subida').classList.add('drag-over');
      }
    });
    
    document.addEventListener('dragleave', (e) => {
      if (e.target.closest('.zona-subida')) {
        e.target.closest('.zona-subida').classList.remove('drag-over');
      }
    });
    
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      const zonaSubida = e.target.closest('.zona-subida');
      if (zonaSubida) {
        zonaSubida.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        this.manejarArchivosSeleccionados(files);
      }
    });
  }
  
  async cargarMisPortafolios() {
    try {
      console.log('📚 Cargando mis portafolios...');
      
      const contenedor = document.getElementById('contenedorPortafolios');
      contenedor.innerHTML = `
        <div class="col-12 text-center">
          <div class="loading-message">
            <i class="fas fa-spinner fa-spin fa-2x"></i>
            <p class="mt-2">Cargando mis portafolios...</p>
          </div>
        </div>
      `;
      
      const response = await this.apiService.get('/api/portafolios/estructura');
      
      if (response.success) {
        this.portafolios = response.data;
        this.renderizarPortafolios();
      } else {
        throw new Error(response.message);
      }
      
    } catch (error) {
      console.error('❌ Error al cargar portafolios:', error);
      this.mostrarError('Error al cargar portafolios: ' + error.message);
    }
  }
  
  renderizarPortafolios() {
    const contenedor = document.getElementById('contenedorPortafolios');
    
    if (this.portafolios.length === 0) {
      contenedor.innerHTML = `
        <div class="col-12 text-center">
          <div class="alert alert-info">
            <i class="fas fa-info-circle"></i>
            <h5>No tienes portafolios asignados</h5>
            <p>Contacta al administrador para que te asigne asignaturas.</p>
          </div>
        </div>
      `;
      return;
    }
    
    let html = '';
    
    this.portafolios.forEach(item => {
      const { portafolio, estructura, estadisticas } = item;
      const asignatura = portafolio.asignatura;
      const progreso = estadisticas.progreso_porcentaje || 0;
      
      // Determinar color del progreso
      let colorProgreso = 'bg-danger';
      if (progreso >= 80) colorProgreso = 'bg-success';
      else if (progreso >= 50) colorProgreso = 'bg-warning';
      
      html += `
        <div class="col-md-6 col-lg-4 mb-4">
          <div class="card subject-card h-100">
            <div class="card-header bg-primary text-white">
              <h5 class="mb-0">
                <i class="fas fa-book"></i> ${asignatura.nombre}
              </h5>
              <small>${asignatura.codigo} | Grupo: ${portafolio.grupo || 'A'} | ${portafolio.ciclo.nombre}</small>
              <div class="mt-2">
                <small>Créditos: ${asignatura.creditos}</small>
              </div>
            </div>
            
            <div class="card-body">
              <div class="progress mb-3">
                <div class="progress-bar ${colorProgreso}" style="width: ${progreso}%">
                  ${progreso}%
                </div>
              </div>
              
              <div class="stats-small">
                <div class="stat">
                  <span class="label">Carpetas:</span>
                  <span class="value">${estadisticas.total_carpetas || 0}</span>
                </div>
                <div class="stat">
                  <span class="label">Archivos:</span>
                  <span class="value">${estadisticas.total_archivos || 0}</span>
                </div>
                <div class="stat">
                  <span class="label">Aprobados:</span>
                  <span class="value text-success">${estadisticas.archivos_por_estado.aprobados || 0}</span>
                </div>
                <div class="stat">
                  <span class="label">Pendientes:</span>
                  <span class="value text-warning">${estadisticas.archivos_por_estado.pendientes || 0}</span>
                </div>
                <div class="stat">
                  <span class="label">Rechazados:</span>
                  <span class="value text-danger">${estadisticas.archivos_por_estado.rechazados || 0}</span>
                </div>
              </div>
            </div>
            
            <div class="card-footer">
              <button class="btn btn-primary btn-sm" onclick="portafoliosDocente.abrirPortafolio(${portafolio.id})">
                <i class="fas fa-folder-open"></i> Ver Portafolio
              </button>
              <button class="btn btn-success btn-sm" onclick="portafoliosDocente.mostrarModalSubida(${portafolio.id})">
                <i class="fas fa-upload"></i> Subir Archivos
              </button>
            </div>
          </div>
        </div>
      `;
    });
    
    contenedor.innerHTML = html;
  }
  
  async abrirPortafolio(portafolioId) {
    try {
      console.log(`📂 Abriendo portafolio ${portafolioId}`);
      
      // Encontrar el portafolio
      const item = this.portafolios.find(p => p.portafolio.id === portafolioId);
      if (!item) {
        throw new Error('Portafolio no encontrado');
      }
      
      this.portafolioActual = item.portafolio;
      this.estructuraActual = item.estructura;
      
      // Mostrar modal del explorador
      this.mostrarExploradorPortafolio();
      
    } catch (error) {
      console.error('❌ Error al abrir portafolio:', error);
      this.mostrarError('Error al abrir portafolio: ' + error.message);
    }
  }
  
  mostrarExploradorPortafolio() {
    // Crear modal del explorador si no existe
    let modal = document.getElementById('modalExplorador');
    if (!modal) {
      modal = this.crearModalExplorador();
      document.body.appendChild(modal);
    }
    
    // Actualizar contenido del modal
    this.actualizarExploradorPortafolio();
    
    // Mostrar modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  }
  
  crearModalExplorador() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'modalExplorador';
    modal.setAttribute('tabindex', '-1');
    
    modal.innerHTML = `
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-folder-open"></i>
              <span id="tituloPortafolio">Explorador de Portafolio</span>
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          
          <div class="modal-body p-0">
            <!-- Breadcrumb -->
            <div class="explorer-breadcrumb p-3 border-bottom">
              <nav aria-label="breadcrumb">
                <ol class="breadcrumb mb-0" id="breadcrumbPortafolio">
                  <!-- Se llena dinámicamente -->
                </ol>
              </nav>
            </div>
            
            <!-- Explorador de 3 columnas -->
            <div class="explorer-container">
              <div class="row g-0 h-100">
                <!-- Panel izquierdo: Árbol de carpetas -->
                <div class="col-md-3 explorer-sidebar border-end">
                  <div class="p-3">
                    <h6><i class="fas fa-sitemap"></i> Estructura</h6>
                    <div id="arbolCarpetas" class="folder-tree">
                      <!-- Se llena dinámicamente -->
                    </div>
                  </div>
                </div>
                
                <!-- Panel central: Lista de archivos -->
                <div class="col-md-6 explorer-main">
                  <div class="p-3">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                      <h6><i class="fas fa-file"></i> Archivos</h6>
                      <div class="view-options">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-secondary active" data-view="grid">
                            <i class="fas fa-th"></i>
                          </button>
                          <button class="btn btn-outline-secondary" data-view="list">
                            <i class="fas fa-list"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div id="contenidoCarpeta" class="files-container">
                      <!-- Se llena dinámicamente -->
                    </div>
                  </div>
                </div>
                
                <!-- Panel derecho: Zona de subida -->
                <div class="col-md-3 explorer-upload border-start">
                  <div class="p-3">
                    <h6><i class="fas fa-cloud-upload-alt"></i> Subir Archivos</h6>
                    
                    <div class="zona-subida" id="zonaSubida">
                      <div class="zona-subida-content">
                        <i class="fas fa-cloud-upload-alt fa-3x mb-3"></i>
                        <p class="mb-2">Arrastra archivos aquí</p>
                        <p class="small text-muted mb-3">o haz clic para seleccionar</p>
                        <button class="btn btn-primary btn-sm" onclick="document.getElementById('archivoInput').click()">
                          <i class="fas fa-file-plus"></i> Seleccionar Archivos
                        </button>
                      </div>
                    </div>
                    
                    <input type="file" id="archivoInput" multiple accept=".pdf,.docx,.xlsx,.pptx,.txt,.jpg,.jpeg,.png" style="display: none;">
                    
                    <div class="upload-info mt-3">
                      <small class="text-muted">
                        <strong>Formatos permitidos:</strong><br>
                        PDF, DOCX, XLSX, PPTX, TXT, JPG, PNG<br>
                        <strong>Tamaño máximo:</strong> 50MB por archivo
                      </small>
                    </div>
                    
                    <div id="progresoSubida" class="mt-3" style="display: none;">
                      <!-- Progreso de subida -->
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times"></i> Cerrar
            </button>
            <button type="button" class="btn btn-primary" onclick="portafoliosDocente.refrescarExplorador()">
              <i class="fas fa-sync"></i> Actualizar
            </button>
          </div>
        </div>
      </div>
    `;
    
    return modal;
  }
  
  actualizarExploradorPortafolio() {
    if (!this.portafolioActual || !this.estructuraActual) return;
    
    // Actualizar título
    const titulo = document.getElementById('tituloPortafolio');
    if (titulo) {
      titulo.textContent = `${this.portafolioActual.asignatura.nombre} - ${this.portafolioActual.asignatura.codigo}`;
    }
    
    // Construir árbol de carpetas
    this.construirArbolCarpetas();
    
    // Mostrar contenido de la carpeta raíz
    this.mostrarContenidoCarpeta(this.estructuraActual);
    
    // Actualizar breadcrumb
    this.actualizarBreadcrumb([this.portafolioActual.nombre]);
  }
  
  construirArbolCarpetas() {
    const contenedor = document.getElementById('arbolCarpetas');
    if (!contenedor || !this.estructuraActual) return;
    
    const html = this.renderizarNodoArbol(this.estructuraActual, 0);
    contenedor.innerHTML = html;
  }
  
  renderizarNodoArbol(nodo, nivel) {
    const esRaiz = nivel === 0;
    const tieneHijos = nodo.hijos && nodo.hijos.length > 0;
    const indentacion = nivel * 20;
    
    let html = '';
    
    if (!esRaiz) {
      const iconoCarpeta = tieneHijos ? 'fas fa-folder' : 'fas fa-folder-open';
      const totalArchivos = nodo.estadisticas?.total_archivos || 0;
      const claseEstado = this.obtenerClaseEstadoCarpeta(nodo.estadisticas);
      
      html += `
        <div class="folder-item ${claseEstado}" style="margin-left: ${indentacion}px;" data-carpeta-id="${nodo.id}">
          <div class="folder-content" onclick="portafoliosDocente.seleccionarCarpeta(${nodo.id})">
            <i class="${iconoCarpeta}"></i>
            <span class="folder-name">${nodo.nombre}</span>
            ${totalArchivos > 0 ? `<span class="file-count">(${totalArchivos})</span>` : ''}
          </div>
        </div>
      `;
    }
    
    // Renderizar hijos
    if (tieneHijos) {
      nodo.hijos.forEach(hijo => {
        html += this.renderizarNodoArbol(hijo, nivel + 1);
      });
    }
    
    return html;
  }
  
  obtenerClaseEstadoCarpeta(estadisticas) {
    if (!estadisticas || estadisticas.total_archivos === 0) {
      return 'folder-empty';
    }
    
    const { total_archivos, archivos_aprobados, archivos_rechazados } = estadisticas;
    
    if (archivos_rechazados > 0) return 'folder-error';
    if (archivos_aprobados === total_archivos) return 'folder-complete';
    if (archivos_aprobados > 0) return 'folder-partial';
    
    return 'folder-pending';
  }
  
  async seleccionarCarpeta(carpetaId) {
    try {
      // Encontrar la carpeta en la estructura
      const carpeta = this.encontrarCarpetaPorId(this.estructuraActual, carpetaId);
      if (!carpeta) {
        throw new Error('Carpeta no encontrada');
      }
      
      this.carpetaSeleccionada = carpeta;
      
      // Obtener archivos de la carpeta
      await this.cargarArchivosDePortafolio(carpetaId);
      
      // Actualizar visualización
      this.resaltarCarpetaSeleccionada(carpetaId);
      this.actualizarBreadcrumbCarpeta(carpeta);
      
    } catch (error) {
      console.error('❌ Error al seleccionar carpeta:', error);
      this.mostrarError('Error al cargar carpeta: ' + error.message);
    }
  }
  
  encontrarCarpetaPorId(nodo, id) {
    if (nodo.id === id) return nodo;
    
    if (nodo.hijos) {
      for (const hijo of nodo.hijos) {
        const encontrado = this.encontrarCarpetaPorId(hijo, id);
        if (encontrado) return encontrado;
      }
    }
    
    return null;
  }
  
  async cargarArchivosDePortafolio(portafolioId) {
    try {
      const response = await this.apiService.get(`/api/portafolios/${portafolioId}/archivos`);
      
      if (response.success) {
        this.mostrarArchivosEnCarpeta(response.data.archivos);
      } else {
        throw new Error(response.message);
      }
      
    } catch (error) {
      console.error('❌ Error al cargar archivos:', error);
      this.mostrarError('Error al cargar archivos: ' + error.message);
    }
  }
  
  mostrarArchivosEnCarpeta(archivos) {
    const contenedor = document.getElementById('contenidoCarpeta');
    if (!contenedor) return;
    
    if (archivos.length === 0) {
      contenedor.innerHTML = `
        <div class="text-center p-4">
          <i class="fas fa-folder-open fa-3x text-muted mb-3"></i>
          <p class="text-muted">Esta carpeta está vacía</p>
          <p class="small text-muted">Arrastra archivos al panel derecho para subirlos aquí</p>
        </div>
      `;
      return;
    }
    
    let html = '<div class="files-grid">';
    
    archivos.forEach(archivo => {
      const iconoArchivo = this.obtenerIconoArchivo(archivo.formato);
      const claseEstado = this.obtenerClaseEstadoArchivo(archivo.estado);
      const tamanioLegible = this.formatearTamanio(archivo.tamanio);
      
      html += `
        <div class="file-item ${claseEstado}" data-archivo-id="${archivo.id}">
          <div class="file-icon">
            <i class="${iconoArchivo}"></i>
          </div>
          <div class="file-info">
            <div class="file-name" title="${archivo.nombre_original}">
              ${archivo.nombre_original}
            </div>
            <div class="file-meta">
              <span class="file-size">${tamanioLegible}</span>
              <span class="file-status">${this.obtenerTextoEstado(archivo.estado)}</span>
            </div>
            <div class="file-date">
              ${new Date(archivo.subido_en).toLocaleString()}
            </div>
          </div>
          <div class="file-actions">
            <button class="btn btn-sm btn-outline-primary" onclick="portafoliosDocente.descargarArchivo(${archivo.id})" title="Descargar">
              <i class="fas fa-download"></i>
            </button>
            ${archivo.estado !== 'aprobado' ? `
              <button class="btn btn-sm btn-outline-danger" onclick="portafoliosDocente.eliminarArchivo(${archivo.id})" title="Eliminar">
                <i class="fas fa-trash"></i>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    contenedor.innerHTML = html;
  }
  
  obtenerIconoArchivo(formato) {
    const iconos = {
      'pdf': 'fas fa-file-pdf text-danger',
      'docx': 'fas fa-file-word text-primary',
      'xlsx': 'fas fa-file-excel text-success',
      'pptx': 'fas fa-file-powerpoint text-warning',
      'txt': 'fas fa-file-alt text-secondary',
      'jpg': 'fas fa-file-image text-info',
      'png': 'fas fa-file-image text-info',
      'otros': 'fas fa-file text-muted'
    };
    
    return iconos[formato] || iconos['otros'];
  }
  
  obtenerClaseEstadoArchivo(estado) {
    const clases = {
      'pendiente': 'file-pending',
      'aprobado': 'file-approved',
      'rechazado': 'file-rejected',
      'revisado': 'file-review',
      'observado': 'file-observation'
    };
    
    return clases[estado] || 'file-pending';
  }
  
  obtenerTextoEstado(estado) {
    const textos = {
      'pendiente': 'Pendiente',
      'aprobado': 'Aprobado',
      'rechazado': 'Rechazado',
      'revisado': 'En Revisión',
      'observado': 'Con Observaciones'
    };
    
    return textos[estado] || 'Desconocido';
  }
  
  formatearTamanio(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Manejo de subida de archivos
  manejarSeleccionArchivos(event) {
    const files = Array.from(event.target.files);
    this.manejarArchivosSeleccionados(files);
  }
  
  async manejarArchivosSeleccionados(files) {
    if (!this.carpetaSeleccionada) {
      this.mostrarError('Selecciona una carpeta primero');
      return;
    }
    
    if (files.length === 0) {
      this.mostrarError('No se seleccionaron archivos');
      return;
    }
    
    try {
      await this.subirArchivos(files, this.carpetaSeleccionada.id);
    } catch (error) {
      console.error('❌ Error al subir archivos:', error);
      this.mostrarError('Error al subir archivos: ' + error.message);
    }
  }
  
  async subirArchivos(files, portafolioId) {
    try {
      const formData = new FormData();
      
      files.forEach(file => {
        formData.append('archivos', file);
      });
      
      // Mostrar progreso
      this.mostrarProgresoSubida(true);
      
      const response = await this.apiService.post(`/api/archivos/${portafolioId}/subir`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.success) {
        this.mostrarExito(`${response.data.total_archivos} archivo(s) subido(s) correctamente`);
        
        // Recargar archivos de la carpeta
        await this.cargarArchivosDePortafolio(portafolioId);
        
        // Recargar portafolios para actualizar estadísticas
        await this.cargarMisPortafolios();
        
        // Limpiar input de archivos
        const input = document.getElementById('archivoInput');
        if (input) input.value = '';
        
      } else {
        throw new Error(response.message);
      }
      
    } catch (error) {
      throw error;
    } finally {
      this.mostrarProgresoSubida(false);
    }
  }
  
  mostrarProgresoSubida(mostrar) {
    const contenedor = document.getElementById('progresoSubida');
    if (!contenedor) return;
    
    if (mostrar) {
      contenedor.style.display = 'block';
      contenedor.innerHTML = `
        <div class="progress">
          <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 100%">
            Subiendo...
          </div>
        </div>
      `;
    } else {
      contenedor.style.display = 'none';
    }
  }
  
  // Acciones de archivos
  async descargarArchivo(archivoId) {
    try {
      window.open(`/api/archivos/${archivoId}/descargar`, '_blank');
    } catch (error) {
      console.error('❌ Error al descargar archivo:', error);
      this.mostrarError('Error al descargar archivo: ' + error.message);
    }
  }
  
  async eliminarArchivo(archivoId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este archivo?')) {
      return;
    }
    
    try {
      const response = await this.apiService.delete(`/api/archivos/${archivoId}`);
      
      if (response.success) {
        this.mostrarExito('Archivo eliminado correctamente');
        
        // Recargar archivos de la carpeta
        if (this.carpetaSeleccionada) {
          await this.cargarArchivosDePortafolio(this.carpetaSeleccionada.id);
        }
        
        // Recargar portafolios para actualizar estadísticas
        await this.cargarMisPortafolios();
        
      } else {
        throw new Error(response.message);
      }
      
    } catch (error) {
      console.error('❌ Error al eliminar archivo:', error);
      this.mostrarError('Error al eliminar archivo: ' + error.message);
    }
  }
  
  // Utilidades
  resaltarCarpetaSeleccionada(carpetaId) {
    // Remover selección anterior
    document.querySelectorAll('.folder-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    // Agregar selección actual
    const carpetaElement = document.querySelector(`[data-carpeta-id="${carpetaId}"]`);
    if (carpetaElement) {
      carpetaElement.classList.add('selected');
    }
  }
  
  actualizarBreadcrumb(ruta) {
    const breadcrumb = document.getElementById('breadcrumbPortafolio');
    if (!breadcrumb) return;
    
    let html = '';
    ruta.forEach((item, index) => {
      const esUltimo = index === ruta.length - 1;
      
      if (esUltimo) {
        html += `<li class="breadcrumb-item active">${item}</li>`;
      } else {
        html += `<li class="breadcrumb-item"><a href="#" onclick="portafoliosDocente.navegarBreadcrumb(${index})">${item}</a></li>`;
      }
    });
    
    breadcrumb.innerHTML = html;
  }
  
  actualizarBreadcrumbCarpeta(carpeta) {
    // Construir ruta desde la raíz hasta la carpeta actual
    const ruta = this.construirRutaCarpeta(carpeta);
    this.actualizarBreadcrumb(ruta);
  }
  
  construirRutaCarpeta(carpeta) {
    const ruta = [this.portafolioActual.nombre];
    
    if (carpeta && carpeta.id !== this.estructuraActual.id) {
      ruta.push(carpeta.nombre);
    }
    
    return ruta;
  }
  
  async refrescarExplorador() {
    if (this.portafolioActual) {
      await this.cargarMisPortafolios();
      this.actualizarExploradorPortafolio();
    }
  }
  
  // Mostrar modal simple de subida
  mostrarModalSubida(portafolioId) {
    // Por ahora, abrir el explorador directamente
    this.abrirPortafolio(portafolioId);
  }
  
  // Métodos de utilidad para mostrar mensajes
  mostrarError(mensaje) {
    console.error('❌', mensaje);
    
    // Crear toast de error
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-danger border-0';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <i class="fas fa-exclamation-circle me-2"></i>
          ${mensaje}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    
    this.mostrarToast(toast);
  }
  
  mostrarExito(mensaje) {
    console.log('✅', mensaje);
    
    // Crear toast de éxito
    const toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-success border-0';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <i class="fas fa-check-circle me-2"></i>
          ${mensaje}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    
    this.mostrarToast(toast);
  }
  
  mostrarToast(toastElement) {
    // Agregar al container de toasts
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container position-fixed top-0 end-0 p-3';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }
    
    container.appendChild(toastElement);
    
    const bsToast = new bootstrap.Toast(toastElement, {
      autohide: true,
      delay: 5000
    });
    
    bsToast.show();
    
    // Eliminar del DOM después de ocultarse
    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove();
    });
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  if (typeof window.ApiService !== 'undefined') {
    window.portafoliosDocente = new PortafoliosDocente();
  } else {
    console.error('❌ ApiService no está disponible. Asegúrate de cargar configuracion.js primero.');
  }
}); 