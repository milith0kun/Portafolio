/**
 * Gestión de Documentos Pendientes - Verificador
 * Maneja la interfaz y lógica para verificación de documentos
 */

class GestorDocumentosPendientes {
  constructor() {
    this.portafolios = [];
    this.documentosSeleccionados = new Set();
    this.filtros = {
      cicloId: '',
      docenteId: '',
      seccion: '',
      estado: ''
    };
    this.documentoActual = null;
    
    this.inicializar();
  }

  async inicializar() {
    try {
      // Verificar autenticación
      if (!verificarAutenticacion()) {
        window.location.href = '/paginas/autenticacion/login.html';
        return;
      }

      // Verificar rol de verificador
      const usuario = obtenerUsuarioActual();
      if (!usuario || !usuario.roles.includes('verificador')) {
        mostrarMensaje('Acceso denegado. Solo verificadores pueden acceder a esta página.', 'error');
        setTimeout(() => {
          window.location.href = '/paginas/autenticacion/login.html';
        }, 2000);
        return;
      }

      this.configurarEventos();
      await this.cargarDatosIniciales();
      await this.cargarPortafoliosPendientes();
      
    } catch (error) {
      console.error('Error al inicializar:', error);
      mostrarMensaje('Error al cargar la página', 'error');
    }
  }

  configurarEventos() {
    // Filtros
    document.getElementById('btnAplicarFiltros').addEventListener('click', () => this.aplicarFiltros());
    document.getElementById('btnLimpiarFiltros').addEventListener('click', () => this.limpiarFiltros());
    
    // Botones principales
    document.getElementById('btnActualizar').addEventListener('click', () => this.actualizarDatos());
    document.getElementById('btnVerificacionMasiva').addEventListener('click', () => this.abrirModalVerificacionMasiva());
    
    // Modal de verificación individual
    document.getElementById('btnCerrarModal').addEventListener('click', () => this.cerrarModalVerificacion());
    document.getElementById('btnCancelarVerificacion').addEventListener('click', () => this.cerrarModalVerificacion());
    document.getElementById('btnConfirmarVerificacion').addEventListener('click', () => this.confirmarVerificacion());
    
    // Modal de verificación masiva
    document.getElementById('btnCerrarModalMasiva').addEventListener('click', () => this.cerrarModalVerificacionMasiva());
    document.getElementById('btnCancelarMasiva').addEventListener('click', () => this.cerrarModalVerificacionMasiva());
    document.getElementById('btnConfirmarMasiva').addEventListener('click', () => this.confirmarVerificacionMasiva());
    
    // Eventos de formularios
    document.getElementById('verificacionEstado').addEventListener('change', (e) => this.toggleObservacion(e.target.value));
    document.getElementById('bulkEstado').addEventListener('change', (e) => this.toggleObservacionMasiva(e.target.value));
    
    // Búsqueda
    document.querySelector('.search-input').addEventListener('input', (e) => this.filtrarPorBusqueda(e.target.value));
  }

  async cargarDatosIniciales() {
    try {
      // Cargar ciclos académicos
      const ciclosResponse = await fetch(`${API_BASE_URL}/ciclos`, {
        headers: {
          'Authorization': `Bearer ${obtenerToken()}`
        }
      });
      
      if (ciclosResponse.ok) {
        const ciclos = await ciclosResponse.json();
        this.cargarOpcionesCiclos(ciclos.data || []);
      }
      
      // Cargar estadísticas
      await this.cargarEstadisticas();
      
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
    }
  }

  async cargarPortafoliosPendientes() {
    try {
      mostrarCargando();
      
      const params = new URLSearchParams();
      if (this.filtros.cicloId) params.append('cicloId', this.filtros.cicloId);
      if (this.filtros.docenteId) params.append('docenteId', this.filtros.docenteId);
      if (this.filtros.estado) params.append('estado', this.filtros.estado);
      
      const response = await fetch(`${API_BASE_URL}/verificaciones/portafolios?${params}`, {
        headers: {
          'Authorization': `Bearer ${obtenerToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.portafolios = data.data.portafolios || [];
        this.renderizarPortafolios();
        this.actualizarEstadisticas();
      } else {
        throw new Error('Error al cargar portafolios');
      }
      
    } catch (error) {
      console.error('Error al cargar portafolios:', error);
      mostrarMensaje('Error al cargar portafolios pendientes', 'error');
    } finally {
      ocultarCargando();
    }
  }

  async cargarEstadisticas() {
    try {
      const response = await fetch(`${API_BASE_URL}/verificaciones/estadisticas`, {
        headers: {
          'Authorization': `Bearer ${obtenerToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.actualizarEstadisticasUI(data.data);
      }
      
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  }

  renderizarPortafolios() {
    const container = document.getElementById('portfoliosContainer');
    
    if (this.portafolios.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <i class="fas fa-folder-open"></i>
          </div>
          <h3>No hay portafolios pendientes</h3>
          <p>Todos los portafolios asignados han sido revisados o no hay asignaciones activas.</p>
        </div>
      `;
      return;
    }
    
    const html = this.portafolios.map(portafolio => this.generarHTMLPortafolio(portafolio)).join('');
    container.innerHTML = html;
    
    // Configurar eventos de los portafolios renderizados
    this.configurarEventosPortafolios();
  }

  generarHTMLPortafolio(portafolio) {
    const estadoClass = this.obtenerClaseEstado(portafolio.estado_general);
    const progreso = Math.round(portafolio.progreso_completado);
    
    return `
      <div class="portfolio-card" data-portfolio-id="${portafolio.id}">
        <div class="portfolio-header">
          <div class="portfolio-info">
            <h3>${portafolio.nombre}</h3>
            <div class="portfolio-meta">
              <span class="docente">${portafolio.docente.nombres} ${portafolio.docente.apellidos}</span>
              <span class="asignatura">${portafolio.asignatura.nombre}</span>
              <span class="ciclo">${portafolio.ciclo.nombre}</span>
            </div>
          </div>
          <div class="portfolio-status">
            <span class="status-badge ${estadoClass}">${this.obtenerTextoEstado(portafolio.estado_general)}</span>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progreso}%"></div>
              <span class="progress-text">${progreso}%</span>
            </div>
          </div>
        </div>
        
        <div class="portfolio-stats">
          <div class="stat-item">
            <span class="stat-label">Total:</span>
            <span class="stat-value">${portafolio.estadisticas.total_documentos}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Aprobados:</span>
            <span class="stat-value approved">${portafolio.estadisticas.aprobados}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Observados:</span>
            <span class="stat-value observed">${portafolio.estadisticas.observados}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Pendientes:</span>
            <span class="stat-value pending">${portafolio.estadisticas.pendientes}</span>
          </div>
        </div>
        
        <div class="portfolio-actions">
          <button class="btn btn-primary btn-ver-documentos" data-portfolio-id="${portafolio.id}">
            <i class="fas fa-eye"></i> Ver Documentos
          </button>
          <button class="btn btn-success btn-verificar-todos" data-portfolio-id="${portafolio.id}" 
                  ${portafolio.estadisticas.pendientes === 0 ? 'disabled' : ''}>
            <i class="fas fa-check-double"></i> Verificar Todos
          </button>
        </div>
      </div>
    `;
  }

  configurarEventosPortafolios() {
    // Botones "Ver Documentos"
    document.querySelectorAll('.btn-ver-documentos').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const portfolioId = e.target.closest('.btn-ver-documentos').dataset.portfolioId;
        this.verDocumentosPortafolio(portfolioId);
      });
    });
    
    // Botones "Verificar Todos"
    document.querySelectorAll('.btn-verificar-todos').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const portfolioId = e.target.closest('.btn-verificar-todos').dataset.portfolioId;
        this.verificarTodosDocumentos(portfolioId);
      });
    });
  }

  async verDocumentosPortafolio(portfolioId) {
    try {
      const response = await fetch(`${API_BASE_URL}/verificaciones/portafolios/${portfolioId}/documentos`, {
        headers: {
          'Authorization': `Bearer ${obtenerToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.mostrarDocumentosPortafolio(data.data);
      } else {
        throw new Error('Error al cargar documentos');
      }
      
    } catch (error) {
      console.error('Error al ver documentos:', error);
      mostrarMensaje('Error al cargar documentos del portafolio', 'error');
    }
  }

  mostrarDocumentosPortafolio(data) {
    const { portafolio, documentos, estadisticas } = data;
    
    // Crear modal para mostrar documentos
    const modalHTML = `
      <div class="modal" id="modalDocumentosPortafolio">
        <div class="modal-content modal-large">
          <div class="modal-header">
            <h3><i class="fas fa-folder-open"></i> Documentos - ${portafolio.nombre}</h3>
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="documents-overview">
              <div class="documents-stats">
                <div class="stat-item">
                  <span class="stat-label">Total:</span>
                  <span class="stat-value">${estadisticas.total || 0}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Aprobados:</span>
                  <span class="stat-value approved">${estadisticas.aprobados || 0}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Observados:</span>
                  <span class="stat-value observed">${estadisticas.observados || 0}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Pendientes:</span>
                  <span class="stat-value pending">${estadisticas.pendientes || 0}</span>
                </div>
              </div>
            </div>
            
            <div class="documents-sections">
              ${this.generarHTMLSeccionesDocumentos(documentos)}
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  generarHTMLSeccionesDocumentos(documentos) {
    let html = '';
    
    Object.keys(documentos).forEach(seccion => {
      const docs = documentos[seccion];
      const seccionInfo = this.obtenerInfoSeccion(seccion);
      
      html += `
        <div class="document-section">
          <h4>${seccionInfo.nombre}</h4>
          <div class="documents-list">
            ${docs.map(doc => this.generarHTMLDocumento(doc)).join('')}
          </div>
        </div>
      `;
    });
    
    return html;
  }

  generarHTMLDocumento(documento) {
    const estadoClass = this.obtenerClaseEstadoDocumento(documento.estado_verificacion);
    const fecha = new Date(documento.created_at).toLocaleDateString('es-ES');
    
    return `
      <div class="document-item" data-document-id="${documento.id}">
        <div class="document-info">
          <div class="document-icon">
            <i class="fas fa-file-alt"></i>
          </div>
          <div class="document-details">
            <h5>${documento.nombre_original}</h5>
            <span class="document-meta">Subido: ${fecha}</span>
            ${documento.observaciones && documento.observaciones.length > 0 ? 
              `<span class="document-observations">${documento.observaciones.length} observación(es)</span>` : ''}
          </div>
        </div>
        <div class="document-status">
          <span class="status-badge ${estadoClass}">${this.obtenerTextoEstadoDocumento(documento.estado_verificacion)}</span>
        </div>
        <div class="document-actions">
          <button class="btn btn-sm btn-primary btn-ver-documento" data-document-id="${documento.id}">
            <i class="fas fa-eye"></i> Ver
          </button>
          ${documento.estado_verificacion === 'pendiente' ? 
            `<button class="btn btn-sm btn-success btn-verificar-documento" data-document-id="${documento.id}">
              <i class="fas fa-check"></i> Verificar
            </button>` : ''}
        </div>
      </div>
    `;
  }

  async verificarDocumento(documentoId) {
    try {
      // Cargar información del documento
      const response = await fetch(`${API_BASE_URL}/documentos/${documentoId}`, {
        headers: {
          'Authorization': `Bearer ${obtenerToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.documentoActual = data.data;
        this.abrirModalVerificacion();
      } else {
        throw new Error('Error al cargar documento');
      }
      
    } catch (error) {
      console.error('Error al verificar documento:', error);
      mostrarMensaje('Error al cargar documento para verificación', 'error');
    }
  }

  abrirModalVerificacion() {
    if (!this.documentoActual) return;
    
    const modal = document.getElementById('modalVerificacion');
    const nombre = document.getElementById('modalDocumentName');
    const meta = document.getElementById('modalDocumentMeta');
    const preview = document.getElementById('modalDocumentPreview');
    
    nombre.textContent = this.documentoActual.nombre_original;
    meta.textContent = `${this.documentoActual.portafolio.docente.nombres} ${this.documentoActual.portafolio.docente.apellidos} • ${this.documentoActual.portafolio.asignatura.nombre} • ${new Date(this.documentoActual.created_at).toLocaleDateString('es-ES')}`;
    
    // Generar vista previa del documento
    preview.innerHTML = this.generarVistaPreviaDocumento(this.documentoActual);
    
    modal.style.display = 'block';
  }

  generarVistaPreviaDocumento(documento) {
    const extension = documento.nombre_original.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      return `<img src="${API_BASE_URL}/documentos/${documento.id}/descargar" alt="Vista previa" style="max-width: 100%; height: auto;">`;
    } else if (['pdf'].includes(extension)) {
      return `<iframe src="${API_BASE_URL}/documentos/${documento.id}/descargar" width="100%" height="400" style="border: none;"></iframe>`;
    } else {
      return `
        <div class="document-preview-placeholder">
          <i class="fas fa-file-alt"></i>
          <p>${documento.nombre_original}</p>
          <a href="${API_BASE_URL}/documentos/${documento.id}/descargar" target="_blank" class="btn btn-primary">
            <i class="fas fa-download"></i> Descargar
          </a>
        </div>
      `;
    }
  }

  cerrarModalVerificacion() {
    const modal = document.getElementById('modalVerificacion');
    modal.style.display = 'none';
    this.documentoActual = null;
    
    // Limpiar formulario
    document.getElementById('verificacionEstado').value = '';
    document.getElementById('verificacionObservacion').value = '';
    document.getElementById('verificacionComentario').value = '';
    document.getElementById('observacionGroup').style.display = 'none';
  }

  async confirmarVerificacion() {
    try {
      const estado = document.getElementById('verificacionEstado').value;
      const observacion = document.getElementById('verificacionObservacion').value;
      const comentario = document.getElementById('verificacionComentario').value;
      
      if (!estado) {
        mostrarMensaje('Debe seleccionar un estado de verificación', 'error');
        return;
      }
      
      if ((estado === 'observado' || estado === 'rechazado') && !observacion.trim()) {
        mostrarMensaje('Debe proporcionar una observación para este estado', 'error');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/verificaciones/documentos/${this.documentoActual.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${obtenerToken()}`
        },
        body: JSON.stringify({
          estado,
          observacion: observacion.trim(),
          comentario: comentario.trim()
        })
      });
      
      if (response.ok) {
        mostrarMensaje('Documento verificado exitosamente', 'success');
        this.cerrarModalVerificacion();
        await this.cargarPortafoliosPendientes();
        await this.cargarEstadisticas();
      } else {
        throw new Error('Error al verificar documento');
      }
      
    } catch (error) {
      console.error('Error al confirmar verificación:', error);
      mostrarMensaje('Error al verificar documento', 'error');
    }
  }

  toggleObservacion(estado) {
    const observacionGroup = document.getElementById('observacionGroup');
    const observacionField = document.getElementById('verificacionObservacion');
    
    if (estado === 'observado' || estado === 'rechazado') {
      observacionGroup.style.display = 'block';
      observacionField.required = true;
    } else {
      observacionGroup.style.display = 'none';
      observacionField.required = false;
    }
  }

  toggleObservacionMasiva(estado) {
    const observacionGroup = document.getElementById('bulkObservacionGroup');
    const observacionField = document.getElementById('bulkObservacion');
    
    if (estado === 'observado' || estado === 'rechazado') {
      observacionGroup.style.display = 'block';
      observacionField.required = true;
    } else {
      observacionGroup.style.display = 'none';
      observacionField.required = false;
    }
  }

  aplicarFiltros() {
    this.filtros = {
      cicloId: document.getElementById('filterCiclo').value,
      docenteId: document.getElementById('filterDocente').value,
      seccion: document.getElementById('filterSeccion').value,
      estado: document.getElementById('filterEstado').value
    };
    
    this.cargarPortafoliosPendientes();
  }

  limpiarFiltros() {
    document.getElementById('filterCiclo').value = '';
    document.getElementById('filterDocente').value = '';
    document.getElementById('filterSeccion').value = '';
    document.getElementById('filterEstado').value = '';
    
    this.filtros = {
      cicloId: '',
      docenteId: '',
      seccion: '',
      estado: ''
    };
    
    this.cargarPortafoliosPendientes();
  }

  async actualizarDatos() {
    await this.cargarPortafoliosPendientes();
    await this.cargarEstadisticas();
    mostrarMensaje('Datos actualizados', 'success');
  }

  actualizarEstadisticas() {
    const totalPendientes = this.portafolios.reduce((total, p) => total + p.estadisticas.pendientes, 0);
    const urgentes = this.portafolios.filter(p => p.estadisticas.pendientes > 0).length;
    const nuevosHoy = this.portafolios.filter(p => {
      const hoy = new Date().toDateString();
      const fechaPortafolio = new Date(p.created_at).toDateString();
      return fechaPortafolio === hoy;
    }).length;
    const docentesActivos = new Set(this.portafolios.map(p => p.docente.id)).size;
    
    document.getElementById('totalPendientes').textContent = totalPendientes;
    document.getElementById('urgentes').textContent = urgentes;
    document.getElementById('nuevosHoy').textContent = nuevosHoy;
    document.getElementById('docentesActivos').textContent = docentesActivos;
  }

  actualizarEstadisticasUI(estadisticas) {
    // Actualizar estadísticas desde el backend si es necesario
  }

  obtenerClaseEstado(estado) {
    const clases = {
      'aprobado': 'status-approved',
      'observado': 'status-observed',
      'rechazado': 'status-rejected',
      'pendiente': 'status-pending',
      'en_revision': 'status-reviewing'
    };
    return clases[estado] || 'status-pending';
  }

  obtenerTextoEstado(estado) {
    const textos = {
      'aprobado': 'Aprobado',
      'observado': 'Observado',
      'rechazado': 'Rechazado',
      'pendiente': 'Pendiente',
      'en_revision': 'En Revisión'
    };
    return textos[estado] || 'Pendiente';
  }

  obtenerClaseEstadoDocumento(estado) {
    const clases = {
      'aprobado': 'status-approved',
      'observado': 'status-observed',
      'rechazado': 'status-rejected',
      'pendiente': 'status-pending'
    };
    return clases[estado] || 'status-pending';
  }

  obtenerTextoEstadoDocumento(estado) {
    const textos = {
      'aprobado': 'Aprobado',
      'observado': 'Observado',
      'rechazado': 'Rechazado',
      'pendiente': 'Pendiente'
    };
    return textos[estado] || 'Pendiente';
  }

  obtenerInfoSeccion(seccion) {
    const secciones = {
      '1.1': { nombre: '1.1 - Información General' },
      '1.2': { nombre: '1.2 - Información Académica' },
      '2.1': { nombre: '2.1 - Programación Académica' },
      '2.2': { nombre: '2.2 - Programación de Evaluación' },
      '3.1': { nombre: '3.1 - Materiales de Enseñanza' },
      '3.2': { nombre: '3.2 - Recursos de Aprendizaje' },
      '4.1': { nombre: '4.1 - Actividades de Evaluación' },
      '4.2': { nombre: '4.2 - Resultados de Evaluación' },
      '5.1': { nombre: '5.1 - Investigación' },
      '5.2': { nombre: '5.2 - Publicaciones' },
      '6.1': { nombre: '6.1 - Extensión Universitaria' },
      '6.2': { nombre: '6.2 - Vinculación' },
      '7.1': { nombre: '7.1 - Gestión Académica' },
      '7.2': { nombre: '7.2 - Gestión Administrativa' },
      '8.1': { nombre: '8.1 - Desarrollo Profesional' },
      '8.2': { nombre: '8.2 - Logros y Reconocimientos' }
    };
    return secciones[seccion] || { nombre: seccion };
  }

  cargarOpcionesCiclos(ciclos) {
    const select = document.getElementById('filterCiclo');
    ciclos.forEach(ciclo => {
      const option = document.createElement('option');
      option.value = ciclo.id;
      option.textContent = ciclo.nombre;
      select.appendChild(option);
    });
  }

  filtrarPorBusqueda(termino) {
    // Implementar búsqueda en tiempo real si es necesario
  }
}

// Funciones auxiliares
function mostrarCargando() {
  const container = document.getElementById('portfoliosContainer');
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Cargando portafolios pendientes...</p>
    </div>
  `;
}

function ocultarCargando() {
  // El cargando se oculta automáticamente al renderizar
}

function mostrarMensaje(mensaje, tipo = 'info') {
  // Implementar sistema de notificaciones
  console.log(`${tipo.toUpperCase()}: ${mensaje}`);
  
  // Crear notificación temporal
  const notificacion = document.createElement('div');
  notificacion.className = `notificacion notificacion-${tipo}`;
  notificacion.innerHTML = `
    <div class="notificacion-contenido">
      <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${mensaje}</span>
    </div>
  `;
  
  document.body.appendChild(notificacion);
  
  setTimeout(() => {
    notificacion.remove();
  }, 5000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new GestorDocumentosPendientes();
}); 