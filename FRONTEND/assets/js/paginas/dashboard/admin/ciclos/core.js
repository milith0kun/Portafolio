/**
 * CICLOS - MÓDULO CORE
 * Configuración, autenticación y utilidades básicas
 */

export class CiclosCore {
    constructor() {
        this.cicloActivo = null;
        this.estadosModulos = {};
        this.verificandoCicloActivo = false;
        this.ultimaVerificacionCiclo = 0;
        this.CONFIG = CONFIG;
        this.debug = window.ciclosDebug || false;
        
        this.log('Módulo Core inicializado');
    }

    /**
     * Configuración centralizada de toastr
     */
    configurarToastr() {
        if (typeof toastr !== 'undefined') {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                positionClass: "toast-top-right",
                timeOut: 5000,
                extendedTimeOut: 2000
            };
            this.log('Toastr configurado');
        }
    }

    /**
     * Verificar autenticación requerida
     */
    verificarAutenticacion() {
        try {
            if (typeof verificarAutenticacion === 'function') {
                const result = verificarAutenticacion(['administrador']);
                this.log('Verificación de autenticación:', result);
                return result;
            }
            
            // Función verificarAutenticacion no disponible
            return true;
        } catch (error) {
            // Error en verificación de autenticación
            return false;
        }
    }

    /**
     * Obtener token de autenticación
     */
    obtenerToken() {
        try {
            return localStorage.getItem('token') || null;
        } catch (error) {
            // Error al obtener token
            return null;
        }
    }

    /**
     * Realizar petición segura con reintentos
     */
    async realizarPeticionSegura(url, options = {}, reintentos = 3) {
        let ultimoError = null;
        
        for (let i = 0; i <= reintentos; i++) {
            try {
                const token = this.obtenerToken();
                
                if (!options.headers) {
                    options.headers = {};
                }
                
                if (token) {
                    options.headers['Authorization'] = `Bearer ${token}`;
                }
                
                this.log(`Intento ${i + 1} para ${url}`);
                
                const response = await fetch(url, options);
                
                if (response.status === 401) {
                    // Token inválido o expirado
                    localStorage.removeItem('token');
                    window.location.href = CONFIG.getRoute?.('LOGIN') || CONFIG.ROUTES?.LOGIN || '/FRONTEND/paginas/autenticacion/login.html';
                    return { success: false, message: 'Sesión expirada' };
                }
                
                if (response.status === 403) {
                    throw new Error('No tiene permisos para realizar esta acción');
                }
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || `Error HTTP ${response.status}`);
                }
                
                this.log('Petición exitosa:', url);
                return data;
                
            } catch (error) {
                ultimoError = error;
                this.log(`Error en intento ${i + 1}:`, error.message);
                
                if (i < reintentos) {
                    await this.esperar(1000 * (i + 1)); // Backoff exponencial
                }
            }
        }
        
        throw ultimoError;
    }

    /**
     * Utilidad para esperar
     */
    esperar(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Mostrar/ocultar indicador de carga
     */
    mostrarCargando() {
        const loader = document.getElementById('loadingOverlay');
        if (loader) {
            loader.style.display = 'flex';
            this.log('Indicador de carga mostrado');
        }
    }

    ocultarCargando() {
        const loader = document.getElementById('loadingOverlay');
        if (loader) {
            loader.style.display = 'none';
            this.log('Indicador de carga oculto');
        }
    }

    /**
     * Mostrar alerta del sistema
     */
    mostrarAlertaSistema(titulo, mensaje, tipo = 'info') {
        const alertaDiv = document.getElementById('alertaSistema');
        if (!alertaDiv) return;

        const iconos = {
            info: 'fas fa-info-circle text-primary',
            warning: 'fas fa-exclamation-triangle text-warning',
            success: 'fas fa-check-circle text-success',
            error: 'fas fa-times-circle text-danger'
        };

        alertaDiv.innerHTML = `
            <i class="${iconos[tipo] || iconos.info}"></i>
            <strong>${titulo}:</strong> ${mensaje}
        `;
        alertaDiv.style.display = 'block';
        
        this.log('Alerta del sistema mostrada:', titulo);
    }

    /**
     * Validar fechas
     */
    validarFechas() {
        const fechaInicio = document.getElementById('fechaInicio')?.value;
        const fechaFin = document.getElementById('fechaFin')?.value;
        
        if (fechaInicio && fechaFin) {
            const inicio = new Date(fechaInicio);
            const fin = new Date(fechaFin);
            
            if (fin <= inicio) {
                const inputFin = document.getElementById('fechaFin');
                inputFin.classList.add('is-invalid');
                
                // Remover feedback previo
                const prevFeedback = inputFin.nextElementSibling;
                if (prevFeedback?.classList.contains('invalid-feedback')) {
                    prevFeedback.remove();
                }
                
                // Agregar nuevo feedback
                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = 'La fecha de fin debe ser posterior a la fecha de inicio';
                inputFin.parentNode.insertBefore(feedback, inputFin.nextSibling);
                
                return false;
            } else {
                const inputFin = document.getElementById('fechaFin');
                inputFin.classList.remove('is-invalid');
                inputFin.classList.add('is-valid');
                
                const feedback = inputFin.nextElementSibling;
                if (feedback?.classList.contains('invalid-feedback')) {
                    feedback.remove();
                }
                
                return true;
            }
        }
        return true;
    }

    /**
     * Validar formulario completo
     */
    validarFormularioCiclo() {
        let esValido = true;
        
        // Limpiar validaciones anteriores
        document.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('is-invalid', 'is-valid');
        });
        document.querySelectorAll('.invalid-feedback').forEach(feedback => {
            feedback.remove();
        });
        
        // Validar campos requeridos
        const camposRequeridos = ['nombre', 'fechaInicio', 'fechaFin', 'semestreActual', 'anioActual'];
        
        camposRequeridos.forEach(campo => {
            const input = document.getElementById(campo);
            const valor = input?.value.trim();
            
            if (!valor) {
                input.classList.add('is-invalid');
                const feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = 'Este campo es obligatorio';
                input.parentNode.insertBefore(feedback, input.nextSibling);
                esValido = false;
            } else {
                input.classList.add('is-valid');
            }
        });
        
        // Validar fechas
        if (!this.validarFechas()) {
            esValido = false;
        }
        
        // Validar año
        const anioInput = document.getElementById('anioActual');
        const anio = parseInt(anioInput?.value);
        const anioActual = new Date().getFullYear();
        
        if (anio < anioActual - 1 || anio > anioActual + 5) {
            anioInput.classList.add('is-invalid');
            const feedback = document.createElement('div');
            feedback.className = 'invalid-feedback';
            feedback.textContent = `El año debe estar entre ${anioActual - 1} y ${anioActual + 5}`;
            anioInput.parentNode.insertBefore(feedback, anioInput.nextSibling);
            esValido = false;
        }
        
        this.log('Validación de formulario:', esValido);
        return esValido;
    }

    /**
     * Limpiar formulario
     */
    limpiarFormularioCiclo() {
        document.getElementById('formCiclo')?.reset();
        document.getElementById('cicloId').value = '';
        
        // Limpiar clases de validación
        document.querySelectorAll('.form-control').forEach(input => {
            input.classList.remove('is-invalid', 'is-valid');
        });
        document.querySelectorAll('.invalid-feedback').forEach(feedback => {
            feedback.remove();
        });
        
        this.log('Formulario limpiado');
    }

    /**
     * Logging para desarrollo
     */
    log(...args) {
        if (this.debug) {
            // [CiclosCore]
        }
    }

    /**
     * Verificar salud del módulo
     */
    verificarSalud() {
        const checks = {
            config: !!this.CONFIG,
            dom: !!document.getElementById('tablaCiclos'),
            auth: !!this.obtenerToken(),
            jquery: typeof $ !== 'undefined',
            moment: typeof moment !== 'undefined'
        };
        
        this.log('Verificación de salud:', checks);
        return checks;
    }
}