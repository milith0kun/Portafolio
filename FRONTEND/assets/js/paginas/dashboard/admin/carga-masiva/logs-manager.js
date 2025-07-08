/**
 * Gestor de Logs para Carga Masiva
 * Maneja todos los logs, mensajes y notificaciones del sistema
 */

class LogsManager {
    constructor() {
        this.logs = {
            uploadLogSingle: [],
            uploadLogBulk: [],
            verificacionLog: [],
            initLog: []
        };
        
        this.maxLogEntries = 1000;
        this.debug = false;
        
        this.callbacks = {
            onLogAdd: [],
            onError: [],
            onSuccess: [],
            onWarning: []
        };
    }

    /**
     * Inicializar el gestor de logs
     */
    inicializar(debug = false) {
        this.debug = debug;
        
        // Limpiar logs existentes en la interfaz
        this.limpiarTodosLosLogs();
        
        return true;
    }

    /**
     * Agregar entrada al log
     */
    agregarLog(mensaje, tipo = 'info', fase = 'uploadLogSingle') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            mensaje,
            tipo,
            fase
        };
        
        // Agregar al array de logs
        if (!this.logs[fase]) {
            this.logs[fase] = [];
        }
        
        this.logs[fase].push(logEntry);
        
        // Limitar número de entradas
        if (this.logs[fase].length > this.maxLogEntries) {
            this.logs[fase] = this.logs[fase].slice(-this.maxLogEntries);
        }
        
        // Mostrar en la interfaz
        this.mostrarLogEnInterfaz(logEntry, fase);
        
        // Debug en consola si está habilitado
        if (this.debug) {
            console.log(`[${fase}] ${timestamp}: ${mensaje}`);
        }
        
        // Emitir evento
        this.emitirLogAdd(logEntry, fase);
    }

    /**
     * Mostrar log en la interfaz
     */
    mostrarLogEnInterfaz(logEntry, fase) {
        const logContainer = document.getElementById(fase);
        if (!logContainer) return;
        
        const logElement = document.createElement('div');
        logElement.className = `log-entry log-${logEntry.tipo}`;
        
        // Crear contenido del log
        const iconos = {
            info: '📝',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            debug: '🔍'
        };
        
        const icono = iconos[logEntry.tipo] || '📝';
        
        logElement.innerHTML = `
            <span class="log-timestamp">[${logEntry.timestamp}]</span>
            <span class="log-icon">${icono}</span>
            <span class="log-message">${logEntry.mensaje}</span>
        `;
        
        // Agregar al contenedor
        logContainer.appendChild(logElement);
        
        // Scroll automático al final
        logContainer.scrollTop = logContainer.scrollHeight;
        
        // Aplicar estilos según el tipo
        this.aplicarEstilosLog(logElement, logEntry.tipo);
    }

    /**
     * Aplicar estilos al elemento de log
     */
    aplicarEstilosLog(elemento, tipo) {
        // Remover clases anteriores
        elemento.classList.remove('text-success', 'text-warning', 'text-danger', 'text-info', 'text-muted');
        
        // Aplicar clase según el tipo
        switch (tipo) {
            case 'success':
                elemento.classList.add('text-success');
                break;
            case 'warning':
                elemento.classList.add('text-warning');
                break;
            case 'error':
                elemento.classList.add('text-danger');
                break;
            case 'debug':
                elemento.classList.add('text-muted');
                break;
            default:
                elemento.classList.add('text-info');
        }
    }

    /**
     * Limpiar log específico
     */
    limpiarLog(fase = 'uploadLogSingle') {
        // Limpiar array
        this.logs[fase] = [];
        
        // Limpiar interfaz
        const logContainer = document.getElementById(fase);
        if (logContainer) {
            logContainer.innerHTML = '';
        }
    }

    /**
     * Limpiar todos los logs
     */
    limpiarTodosLosLogs() {
        Object.keys(this.logs).forEach(fase => {
            this.limpiarLog(fase);
        });
    }

    /**
     * Obtener logs de una fase específica
     */
    obtenerLogs(fase = 'uploadLogSingle') {
        return this.logs[fase] || [];
    }

    /**
     * Obtener todos los logs
     */
    obtenerTodosLosLogs() {
        return { ...this.logs };
    }

    /**
     * Mostrar mensaje de error
     */
    mostrarError(mensaje, fase = 'uploadLogSingle') {
        this.agregarLog(mensaje, 'error', fase);
        
        // Mostrar notificación toast si está disponible
        this.mostrarToast(mensaje, 'error');
        
        // Emitir evento de error
        this.emitirError(mensaje, fase);
    }

    /**
     * Mostrar mensaje de éxito
     */
    mostrarExito(mensaje, fase = 'uploadLogSingle') {
        this.agregarLog(mensaje, 'success', fase);
        
        // Mostrar notificación toast si está disponible
        this.mostrarToast(mensaje, 'success');
        
        // Emitir evento de éxito
        this.emitirSuccess(mensaje, fase);
    }

    /**
     * Mostrar mensaje de advertencia
     */
    mostrarAdvertencia(mensaje, fase = 'uploadLogSingle') {
        this.agregarLog(mensaje, 'warning', fase);
        
        // Mostrar notificación toast si está disponible
        this.mostrarToast(mensaje, 'warning');
        
        // Emitir evento de advertencia
        this.emitirWarning(mensaje, fase);
    }

    /**
     * Mostrar mensaje informativo
     */
    mostrarInfo(mensaje, fase = 'uploadLogSingle') {
        this.agregarLog(mensaje, 'info', fase);
    }

    /**
     * Mostrar mensaje de debug
     */
    mostrarDebug(mensaje, fase = 'uploadLogSingle') {
        if (this.debug) {
            this.agregarLog(mensaje, 'debug', fase);
        }
    }

    /**
     * Mostrar notificación toast
     */
    mostrarToast(mensaje, tipo = 'info') {
        // Verificar si Bootstrap toast está disponible
        if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
            this.crearToastBootstrap(mensaje, tipo);
        } else {
            // Fallback a alert nativo
            this.mostrarAlertNativo(mensaje, tipo);
        }
    }

    /**
     * Crear toast de Bootstrap
     */
    crearToastBootstrap(mensaje, tipo) {
        // Crear contenedor de toasts si no existe
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
        
        // Crear toast
        const toastId = `toast-${Date.now()}`;
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header bg-${this.getTipoBootstrap(tipo)} text-white">
                    <strong class="me-auto">${this.getTituloTipo(tipo)}</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${mensaje}
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        // Mostrar toast
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: tipo === 'error' ? 8000 : 5000
        });
        
        toast.show();
        
        // Remover del DOM después de ocultarse
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    /**
     * Mostrar alert nativo como fallback
     */
    mostrarAlertNativo(mensaje, tipo) {
        const titulo = this.getTituloTipo(tipo);
        alert(`${titulo}: ${mensaje}`);
    }

    /**
     * Obtener clase de Bootstrap según el tipo
     */
    getTipoBootstrap(tipo) {
        const tipos = {
            success: 'success',
            error: 'danger',
            warning: 'warning',
            info: 'info',
            debug: 'secondary'
        };
        return tipos[tipo] || 'info';
    }

    /**
     * Obtener título según el tipo
     */
    getTituloTipo(tipo) {
        const titulos = {
            success: 'Éxito',
            error: 'Error',
            warning: 'Advertencia',
            info: 'Información',
            debug: 'Debug'
        };
        return titulos[tipo] || 'Información';
    }

    /**
     * Exportar logs a texto
     */
    exportarLogs(fase = null) {
        let logsToExport = [];
        
        if (fase && this.logs[fase]) {
            logsToExport = this.logs[fase];
        } else {
            // Exportar todos los logs
            Object.keys(this.logs).forEach(f => {
                logsToExport = logsToExport.concat(
                    this.logs[f].map(log => ({ ...log, fase: f }))
                );
            });
        }
        
        // Ordenar por timestamp
        logsToExport.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Convertir a texto
        const texto = logsToExport.map(log => {
            const faseInfo = fase ? '' : `[${log.fase}] `;
            return `${faseInfo}[${log.timestamp}] ${log.tipo.toUpperCase()}: ${log.mensaje}`;
        }).join('\n');
        
        return texto;
    }

    /**
     * Descargar logs como archivo
     */
    descargarLogs(fase = null) {
        const texto = this.exportarLogs(fase);
        const filename = fase ? `logs-${fase}-${new Date().toISOString().split('T')[0]}.txt` : `logs-completos-${new Date().toISOString().split('T')[0]}.txt`;
        
        const blob = new Blob([texto], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    /**
     * Configurar callbacks
     */
    onLogAdd(callback) {
        this.callbacks.onLogAdd.push(callback);
    }

    onError(callback) {
        this.callbacks.onError.push(callback);
    }

    onSuccess(callback) {
        this.callbacks.onSuccess.push(callback);
    }

    onWarning(callback) {
        this.callbacks.onWarning.push(callback);
    }

    /**
     * Emitir eventos
     */
    emitirLogAdd(logEntry, fase) {
        this.callbacks.onLogAdd.forEach(callback => {
            try {
                callback(logEntry, fase);
            } catch (error) {
                console.error('Error en callback de log add:', error);
            }
        });
    }

    emitirError(mensaje, fase) {
        this.callbacks.onError.forEach(callback => {
            try {
                callback(mensaje, fase);
            } catch (error) {
                console.error('Error en callback de error:', error);
            }
        });
    }

    emitirSuccess(mensaje, fase) {
        this.callbacks.onSuccess.forEach(callback => {
            try {
                callback(mensaje, fase);
            } catch (error) {
                console.error('Error en callback de success:', error);
            }
        });
    }

    emitirWarning(mensaje, fase) {
        this.callbacks.onWarning.forEach(callback => {
            try {
                callback(mensaje, fase);
            } catch (error) {
                console.error('Error en callback de warning:', error);
            }
        });
    }

    /**
     * Habilitar/deshabilitar debug
     */
    setDebug(enabled) {
        this.debug = enabled;
    }

    /**
     * Obtener estadísticas de logs
     */
    obtenerEstadisticas() {
        const stats = {};
        
        Object.keys(this.logs).forEach(fase => {
            const logs = this.logs[fase];
            stats[fase] = {
                total: logs.length,
                errores: logs.filter(log => log.tipo === 'error').length,
                advertencias: logs.filter(log => log.tipo === 'warning').length,
                exitos: logs.filter(log => log.tipo === 'success').length,
                info: logs.filter(log => log.tipo === 'info').length
            };
        });
        
        return stats;
    }
}

// Exportar para uso en otros módulos
window.LogsManager = LogsManager;