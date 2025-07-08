/**
 * USUARIOS ADMIN - MÓDULO DATA
 * Operaciones CRUD y manejo de datos de la API
 */

// ================================================
// CONFIGURACIÓN DE ENDPOINTS
// ================================================

const endpoints = {
    usuarios: '/usuarios',
    verificadores: '/usuarios/verificadores',
    asignaciones: '/usuarios/asignaciones'
};

// ================================================
// INICIALIZACIÓN DEL MÓDULO
// ================================================

async function initialize() {
    try {
        // Verificar que el core esté inicializado
        if (!window.UsuariosCore?.estaInicializado()) {
            throw new Error('Módulo core no inicializado');
        }
        
        return true;
        
    } catch (error) {
        throw error;
    }
}

// ================================================
// OPERACIONES CRUD DE USUARIOS
// ================================================

/**
 * Cargar todos los usuarios
 */
async function cargarUsuarios() {
    try {
        const baseUrl = CONFIG.API.BASE_URL;
        const url = `${baseUrl}${endpoints.usuarios}`;
        
        const response = await window.UsuariosCore.realizarPeticionSegura(url, {
            method: 'GET'
        });
        
        if (response.success && Array.isArray(response.data)) {
            return response.data;
        } else {
            throw new Error('Formato de respuesta inválido');
        }
        
    } catch (error) {
        window.UsuariosCore.mostrarError('Error al cargar usuarios: ' + error.message);
        throw error;
    }
}

/**
 * Cargar un usuario específico por ID
 */
async function cargarUsuario(id) {
    if (!id) {
        throw new Error('ID de usuario requerido');
    }
    
    try {
        const baseUrl = CONFIG.API.BASE_URL;
        const url = `${baseUrl}${endpoints.usuarios}/${id}`;
        
        const response = await window.UsuariosCore.realizarPeticionSegura(url, {
            method: 'GET'
        });
        
        if (response.success && response.data) {
            return response.data;
        } else {
            throw new Error('Usuario no encontrado');
        }
        
    } catch (error) {
        window.UsuariosCore.mostrarError('Error al cargar usuario: ' + error.message);
        throw error;
    }
}

/**
 * Guardar usuario (crear o actualizar)
 */
async function guardarUsuario(datosUsuario, esEdicion = false) {
    try {
        // Validar datos básicos
        if (!datosUsuario.nombres || !datosUsuario.correo) {
            throw new Error('Nombre y correo son requeridos');
        }
        
        const baseUrl = CONFIG.API.BASE_URL;
        const method = esEdicion ? 'PUT' : 'POST';
        const url = esEdicion 
            ? `${baseUrl}${endpoints.usuarios}/${datosUsuario.id}`
            : `${baseUrl}${endpoints.usuarios}`;
        
        const response = await window.UsuariosCore.realizarPeticionSegura(url, {
            method: method,
            body: JSON.stringify(datosUsuario)
        });
        
        if (response.success) {
            const accion = esEdicion ? 'actualizado' : 'creado';
            window.UsuariosCore.mostrarExito(`Usuario ${accion} exitosamente`);
            return response.data;
        } else {
            throw new Error(response.message || 'Error al guardar usuario');
        }
        
    } catch (error) {
        window.UsuariosCore.mostrarError('Error al guardar usuario: ' + error.message);
        throw error;
    }
}

/**
 * Eliminar usuario
 */
async function eliminarUsuario(id) {
    if (!id) {
        throw new Error('ID de usuario requerido');
    }
    
    try {
        const baseUrl = CONFIG.API.BASE_URL;
        const url = `${baseUrl}${endpoints.usuarios}/${id}`;
        
        const response = await window.UsuariosCore.realizarPeticionSegura(url, {
            method: 'DELETE'
        });
        
        if (response.success) {
            window.UsuariosCore.mostrarExito('Usuario eliminado exitosamente');
            return true;
        } else {
            throw new Error(response.message || 'Error al eliminar usuario');
        }
        
    } catch (error) {
        window.UsuariosCore.mostrarError('Error al eliminar usuario: ' + error.message);
        throw error;
    }
}

// ================================================
// OPERACIONES DE VERIFICADORES
// ================================================

/**
 * Cargar verificadores disponibles
 */
async function cargarVerificadores() {
    // Cargando verificadores
    
    try {
        const baseUrl = CONFIG.API.BASE_URL;
        const url = `${baseUrl}${endpoints.verificadores}`;
        
        const response = await window.UsuariosCore.realizarPeticionSegura(url, {
            method: 'GET'
        });
        
        if (response.success && Array.isArray(response.data)) {
            // Verificadores cargados
            return response.data;
        } else {
            // No se encontraron verificadores
            return [];
        }
        
    } catch (error) {
        // Error cargando verificadores
        window.UsuariosCore.mostrarError('Error al cargar verificadores: ' + error.message);
        return [];
    }
}

/**
 * Guardar asignación de verificador
 */
async function guardarAsignacionVerificador(datosAsignacion) {
    // Guardando asignación de verificador
    
    try {
        // Validar datos
        if (!datosAsignacion.docenteId || !datosAsignacion.verificadorId) {
            throw new Error('ID de docente y verificador son requeridos');
        }
        
        const baseUrl = CONFIG.API.BASE_URL;
        const url = `${baseUrl}${endpoints.asignaciones}`;
        
        const response = await window.UsuariosCore.realizarPeticionSegura(url, {
            method: 'POST',
            body: JSON.stringify(datosAsignacion)
        });
        
        if (response.success) {
            // Asignación guardada exitosamente
            window.UsuariosCore.mostrarExito('Asignación guardada exitosamente');
            return response.data;
        } else {
            throw new Error(response.message || 'Error al guardar asignación');
        }
        
    } catch (error) {
        // Error guardando asignación
        window.UsuariosCore.mostrarError('Error al guardar asignación: ' + error.message);
        throw error;
    }
}

// ================================================
// FUNCIONES DE BÚSQUEDA Y FILTRADO
// ================================================

/**
 * Buscar usuarios por criterio
 */
async function buscarUsuarios(criterio, valor) {
    // Buscando usuarios
    
    try {
        const baseUrl = CONFIG.API.BASE_URL;
        const params = new URLSearchParams();
        params.append(criterio, valor);
        const url = `${baseUrl}${endpoints.usuarios}?${params}`;
        
        const response = await window.UsuariosCore.realizarPeticionSegura(url, {
            method: 'GET'
        });
        
        if (response.success && Array.isArray(response.data)) {
            // Usuarios encontrados
            return response.data;
        } else {
            return [];
        }
        
    } catch (error) {
        // Error buscando usuarios
        return [];
    }
}

/**
 * Obtener estadísticas de usuarios
 */
async function obtenerEstadisticasUsuarios(cicloId = null) {
    // Obteniendo estadísticas de usuarios
    
    try {
        const baseUrl = CONFIG.API.BASE_URL;
        let url = `${baseUrl}${endpoints.usuarios}/estadisticas`;
        
        // Agregar parámetro de ciclo si se proporciona
        if (cicloId) {
            url += `?ciclo=${cicloId}`;
        }
        
        // URL de estadísticas
        
        const response = await window.UsuariosCore.realizarPeticionSegura(url, {
            method: 'GET'
        });
        
        if (response.success && response.data) {
            // Estadísticas obtenidas
            return response.data;
        } else {
            // Respuesta sin datos válidos
            return {
                totalUsuarios: 0,
                usuariosActivos: 0,
                verificadores: 0,
                administradores: 0
            };
        }
        
    } catch (error) {
        // Error obteniendo estadísticas
        return {
            totalUsuarios: 0,
            usuariosActivos: 0,
            verificadores: 0,
            administradores: 0
        };
    }
}

// ================================================
// FUNCIONES DE VALIDACIÓN DE DATOS
// ================================================

/**
 * Validar email único
 */
async function validarEmailUnico(email, idUsuarioExcluir = null) {
    // Validando email único
    
    try {
        const baseUrl = CONFIG.API.BASE_URL;
        const params = new URLSearchParams();
        params.append('email', email);
        if (idUsuarioExcluir) {
            params.append('excluir_id', idUsuarioExcluir);
        }
        
        const url = `${baseUrl}${endpoints.usuarios}/validar-email?${params}`;
        
        const response = await window.UsuariosCore.realizarPeticionSegura(url, {
            method: 'GET'
        });
        
        return response.success && response.data?.esUnico;
        
    } catch (error) {
        // Error validando email
        return false;
    }
}

/**
 * Validar formato de datos de usuario
 */
function validarDatosUsuario(datos) {
    const errores = [];
    
    // Validaciones básicas
    if (!datos.nombres || datos.nombres.trim().length < 2) {
        errores.push('El nombre debe tener al menos 2 caracteres');
    }
    
    if (!datos.correo || !validarFormatoEmail(datos.correo)) {
        errores.push('El correo electrónico no es válido');
    }
    
    if (!datos.rol_id) {
        errores.push('Debe seleccionar un rol');
    }
    
    // Validación de contraseña solo para nuevos usuarios
    if (!datos.id && (!datos.password || datos.password.length < 6)) {
        errores.push('La contraseña debe tener al menos 6 caracteres');
    }
    
    return {
        esValido: errores.length === 0,
        errores
    };
}

/**
 * Validar formato de email
 */
function validarFormatoEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// ================================================
// FUNCIONES DE UTILIDAD
// ================================================

/**
 * Formatear datos de usuario para la tabla
 */
function formatearUsuarioParaTabla(usuario) {
    return {
        id: usuario.id,
        nombres: usuario.nombres || 'Sin nombre',
        correo: usuario.correo || '',
        rol: usuario.rol?.nombre || 'Sin rol',
        estado: usuario.activo ? 'Activo' : 'Inactivo',
        fechaCreacion: formatearFecha(usuario.created_at),
        acciones: generarBotonesAccion(usuario.id)
    };
}

/**
 * Formatear fecha
 */
function formatearFecha(fecha) {
    if (!fecha) return 'N/A';
    
    try {
        const date = new Date(fecha);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Fecha inválida';
    }
}

/**
 * Generar botones de acción para la tabla
 */
function generarBotonesAccion(usuarioId) {
    return `
        <div class="btn-group btn-group-sm" role="group">
            <button type="button" class="btn btn-outline-primary btn-editar" data-id="${usuarioId}" title="Editar">
                <i class="fas fa-edit"></i>
            </button>
            <button type="button" class="btn btn-outline-danger btn-eliminar" data-id="${usuarioId}" title="Eliminar">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

// ================================================
// EXPORTACIÓN DEL MÓDULO
// ================================================

window.DataUsuarios = {
    // Inicialización
    initialize,
    
    // CRUD Usuarios
    cargarUsuarios,
    cargarUsuario,
    guardarUsuario,
    eliminarUsuario,
    
    // Verificadores
    cargarVerificadores,
    guardarAsignacionVerificador,
    
    // Búsqueda y filtrado
    buscarUsuarios,
    obtenerEstadisticasUsuarios,
    
    // Validación
    validarEmailUnico,
    validarDatosUsuario,
    validarFormatoEmail,
    
    // Utilidades
    formatearUsuarioParaTabla,
    formatearFecha,
    generarBotonesAccion
};

// Módulo Data de Usuarios cargado