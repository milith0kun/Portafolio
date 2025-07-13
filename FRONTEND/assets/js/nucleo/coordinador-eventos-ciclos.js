/**
 * Coordinador de Eventos de Ciclos
 * Sistema centralizado para gestionar eventos de cambio de ciclo y evitar conflictos
 */

const CoordinadorEventosCiclos = {
    // Estado del coordinador
    estado: {
        ultimoEvento: null,
        procesandoEvento: false,
        colaEventos: [],
        suscriptores: new Map(),
        timeoutProcesamiento: null
    },

    /**
     * Inicializar el coordinador
     */
    inicializar() {
        console.log('🎯 Inicializando Coordinador de Eventos de Ciclos...');
        
        // Interceptar todos los eventos de ciclo
        this.interceptarEventos();
        
        console.log('✅ Coordinador de Eventos de Ciclos inicializado');
    },

    /**
     * Interceptar y coordinar eventos de ciclo
     */
    interceptarEventos() {
        // Lista de eventos a interceptar
        const eventosACoordenar = [
            'cicloActivoCambiado',
            'ciclo-cambiado',
            'cicloSeleccionado',
            'sincronizar-ciclo',
            'cicloAcademicoChange'
        ];

        eventosACoordenar.forEach(tipoEvento => {
            document.addEventListener(tipoEvento, (event) => {
                this.procesarEvento(tipoEvento, event.detail, event);
            }, { capture: true }); // Usar capture para interceptar antes
        });
    },

    /**
     * Procesar evento de ciclo de manera coordinada
     */
    async procesarEvento(tipo, detalle, eventoOriginal) {
        // Extraer cicloId del detalle
        const cicloId = this.extraerCicloId(detalle);
        
        if (!cicloId) {
            return; // Ignorar eventos sin cicloId válido
        }

        // Verificar si es un evento duplicado reciente
        if (this.esDuplicado(tipo, cicloId)) {
            console.log(`🔄 Evento duplicado ignorado: ${tipo} - ${cicloId}`);
            eventoOriginal.stopPropagation();
            return;
        }

        // Agregar a la cola de procesamiento
        this.estado.colaEventos.push({
            tipo,
            cicloId,
            detalle,
            timestamp: new Date(),
            eventoOriginal
        });

        // Procesar la cola
        this.procesarCola();
    },

    /**
     * Extraer cicloId de diferentes formatos de detalle
     */
    extraerCicloId(detalle) {
        if (!detalle) return null;
        
        // Diferentes formatos posibles
        return detalle.cicloId || 
               detalle.cicloActivo?.id || 
               detalle.informacion?.id || 
               detalle.id;
    },

    /**
     * Verificar si es un evento duplicado
     */
    esDuplicado(tipo, cicloId) {
        if (!this.estado.ultimoEvento) {
            return false;
        }

        const tiempoTranscurrido = Date.now() - this.estado.ultimoEvento.timestamp;
        const mismoCiclo = this.estado.ultimoEvento.cicloId === cicloId;
        
        // Considerar duplicado si es el mismo ciclo en menos de 500ms
        return mismoCiclo && tiempoTranscurrido < 500;
    },

    /**
     * Procesar cola de eventos con debounce
     */
    procesarCola() {
        // Cancelar procesamiento anterior
        if (this.estado.timeoutProcesamiento) {
            clearTimeout(this.estado.timeoutProcesamiento);
        }

        // Procesar después de un breve delay
        this.estado.timeoutProcesamiento = setTimeout(() => {
            this.ejecutarProcesamiento();
        }, 200);
    },

    /**
     * Ejecutar procesamiento de eventos
     */
    async ejecutarProcesamiento() {
        if (this.estado.procesandoEvento || this.estado.colaEventos.length === 0) {
            return;
        }

        this.estado.procesandoEvento = true;

        try {
            // Tomar el evento más reciente de cada tipo
            const eventosUnicos = this.consolidarEventos();
            
            for (const evento of eventosUnicos) {
                await this.ejecutarEvento(evento);
            }

            // Limpiar cola
            this.estado.colaEventos = [];

        } finally {
            this.estado.procesandoEvento = false;
        }
    },

    /**
     * Consolidar eventos para evitar duplicados
     */
    consolidarEventos() {
        const eventosPorCiclo = new Map();

        // Agrupar por cicloId, manteniendo solo el más reciente
        this.estado.colaEventos.forEach(evento => {
            const clave = evento.cicloId;
            if (!eventosPorCiclo.has(clave) || 
                eventosPorCiclo.get(clave).timestamp < evento.timestamp) {
                eventosPorCiclo.set(clave, evento);
            }
        });

        return Array.from(eventosPorCiclo.values());
    },

    /**
     * Ejecutar evento coordinado
     */
    async ejecutarEvento(evento) {
        // Solo mostrar en modo debug
        if (window.CONFIG?.DEBUG) {
            console.log(`🎯 Ejecutando evento coordinado: ${evento.tipo} - ${evento.cicloId}`);
        }

        // Actualizar último evento
        this.estado.ultimoEvento = {
            tipo: evento.tipo,
            cicloId: evento.cicloId,
            timestamp: Date.now()
        };

        // Detener propagación del evento original
        if (evento.eventoOriginal) {
            evento.eventoOriginal.stopPropagation();
        }

        // Emitir evento coordinado unificado
        const eventoCoordinado = new CustomEvent('cicloCoordinado', {
            detail: {
                cicloId: evento.cicloId,
                tipoOriginal: evento.tipo,
                detalle: evento.detalle,
                timestamp: new Date()
            },
            bubbles: true
        });

        // Notificar a suscriptores específicos
        this.notificarSuscriptores(evento);

        // Emitir evento coordinado
        document.dispatchEvent(eventoCoordinado);
    },

    /**
     * Suscribirse a eventos coordinados
     */
    suscribirse(callback, filtros = {}) {
        const id = Date.now() + Math.random();
        this.estado.suscriptores.set(id, { callback, filtros });
        
        console.log('✅ Suscriptor agregado al coordinador de eventos');
        
        // Devolver función para desuscribirse
        return () => {
            this.estado.suscriptores.delete(id);
            console.log('✅ Suscriptor removido del coordinador de eventos');
        };
    },

    /**
     * Notificar a suscriptores
     */
    notificarSuscriptores(evento) {
        this.estado.suscriptores.forEach(({ callback, filtros }) => {
            try {
                // Aplicar filtros si existen
                if (filtros.tipos && !filtros.tipos.includes(evento.tipo)) {
                    return;
                }
                
                if (filtros.cicloId && filtros.cicloId !== evento.cicloId) {
                    return;
                }

                callback(evento);
            } catch (error) {
                console.error('❌ Error en suscriptor del coordinador:', error);
            }
        });
    },

    /**
     * Obtener estadísticas del coordinador
     */
    obtenerEstadisticas() {
        return {
            ultimoEvento: this.estado.ultimoEvento,
            eventosEnCola: this.estado.colaEventos.length,
            suscriptores: this.estado.suscriptores.size,
            procesando: this.estado.procesandoEvento
        };
    },

    /**
     * Limpiar estado del coordinador
     */
    limpiar() {
        if (this.estado.timeoutProcesamiento) {
            clearTimeout(this.estado.timeoutProcesamiento);
        }
        
        this.estado.colaEventos = [];
        this.estado.ultimoEvento = null;
        this.estado.procesandoEvento = false;
        
        console.log('🧹 Estado del coordinador limpiado');
    }
};

// Inicializar automáticamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CoordinadorEventosCiclos.inicializar();
    });
} else {
    CoordinadorEventosCiclos.inicializar();
}

// Exportar al scope global
window.CoordinadorEventosCiclos = CoordinadorEventosCiclos;

console.log('✅ Coordinador de Eventos de Ciclos cargado');