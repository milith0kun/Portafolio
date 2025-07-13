const { sequelize } = require('../../config/database');
const { info, error: logError } = require('../../config/logger');
const { actualizarProgreso, registrarError, limpiarArchivosTemporales } = require('./utils');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ResponseHandler = require('../utils/responseHandler');

// Configuración de validación de archivos
const TIPOS_PERMITIDOS = ['.xlsx', '.xls', '.csv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 6;

// Importar controladores específicos
const usuariosController = require('./usuariosController');
const carrerasController = require('./carrerasController');
const asignaturasController = require('./asignaturasController');
const cargaAcademicaController = require('./cargaAcademicaController');
const verificacionesController = require('./verificacionesController');
const codigosInstitucionalesController = require('./codigosInstitucionalesController');
const ArchivoCargaMasiva = require('../../modelos/ArchivoCargaMasiva');

// Nombres de archivos esperados (flexibles)
const ARCHIVOS_ESPERADOS = {
    USUARIOS: ['01_usuarios_masivos.xlsx', '01_usuarios_masivos.csv', 'usuarios_masivos.xlsx', 'usuarios.xlsx', 'usuarios.csv'],
    CARRERAS: ['02_carreras_completas.xlsx', '02_carreras_completas.csv', 'carreras_completas.xlsx', 'carreras.xlsx', 'carreras.csv'],
    ASIGNATURAS: ['03_asignaturas_completas.xlsx', '03_asignaturas_completas.csv', 'asignaturas_completas.xlsx', 'asignaturas.xlsx', 'asignaturas.csv'],
    CARGA_ACADEMICA: ['04_carga_academica.xlsx', '04_carga_academica.csv', 'carga_academica.xlsx', 'carga.xlsx', 'carga.csv'],
    VERIFICACIONES: ['05_verificaciones.xlsx', '05_verificaciones.csv', 'verificaciones.xlsx', 'verificaciones.csv'],
    CODIGOS_INSTITUCIONALES: ['06_codigos_institucionales.xlsx', '06_codigos_institucionales.csv', 'codigos_institucionales.xlsx', 'codigos.xlsx', 'codigos.csv']
};

/**
 * Valida un archivo según los criterios establecidos
 * @param {Object} archivo - Archivo a validar
 * @returns {Object} Resultado de la validación
 */
const validarArchivo = (archivo) => {
    const errores = [];
    
    // Validar tipo de archivo
    const extension = path.extname(archivo.originalname).toLowerCase();
    if (!TIPOS_PERMITIDOS.includes(extension)) {
        errores.push(`Tipo de archivo no permitido: ${archivo.originalname}. Tipos permitidos: ${TIPOS_PERMITIDOS.join(', ')}`);
    }
    
    // Validar tamaño
    if (archivo.size > MAX_FILE_SIZE) {
        errores.push(`Archivo demasiado grande: ${archivo.originalname} (${(archivo.size / 1024 / 1024).toFixed(2)}MB). Tamaño máximo: 10MB`);
    }
    
    return {
        valido: errores.length === 0,
        errores
    };
};

/**
 * Identifica el tipo de archivo basado en su nombre
 * @param {string} nombreArchivo - Nombre del archivo
 * @returns {string|null} Tipo de archivo identificado
 */
const identificarTipoArchivo = (nombreArchivo) => {
    const nombreLower = nombreArchivo.toLowerCase();
    
    for (const [tipo, variantes] of Object.entries(ARCHIVOS_ESPERADOS)) {
        if (variantes.some(variante => nombreLower.includes(variante.replace(/\.(xlsx|csv)$/, '')) || nombreLower === variante)) {
            return tipo.toLowerCase();
        }
    }
    
    // Identificación por palabras clave
    if (nombreLower.includes('usuario')) return 'usuarios';
    if (nombreLower.includes('carrera')) return 'carreras';
    if (nombreLower.includes('asignatura') || nombreLower.includes('materia')) return 'asignaturas';
    if (nombreLower.includes('carga') || nombreLower.includes('academica')) return 'carga_academica';
    if (nombreLower.includes('verificacion')) return 'verificaciones';
    if (nombreLower.includes('codigo') || nombreLower.includes('institucional')) return 'codigos_institucionales';
    
    return null;
};

/**
 * Inicializa el sistema con los archivos Excel/CSV requeridos
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const inicializarSistema = async (req, res) => {
    // Verificar que se hayan subido archivos
    if (!req.files || req.files.length === 0) {
        return ResponseHandler.badRequest(res, 'No se han subido archivos para procesar');
    }

    // Validar número máximo de archivos
    if (req.files.length > MAX_FILES) {
        return ResponseHandler.badRequest(res, `Se permiten máximo ${MAX_FILES} archivos`);
    }

    // Validar cada archivo
    const erroresValidacion = [];
    req.files.forEach(archivo => {
        const validacion = validarArchivo(archivo);
        if (!validacion.valido) {
            erroresValidacion.push(...validacion.errores);
        }
    });

    if (erroresValidacion.length > 0) {
        return ResponseHandler.validationError(res, erroresValidacion);
    }

    // Organizar archivos por tipo
    const archivos = {};
    const archivosNoIdentificados = [];
    
    req.files.forEach(archivo => {
        const tipoIdentificado = identificarTipoArchivo(archivo.originalname);
        
        if (tipoIdentificado) {
            archivos[tipoIdentificado] = archivo;
            info(`Archivo identificado: ${archivo.originalname} como ${tipoIdentificado}`);
        } else {
            archivosNoIdentificados.push(archivo.originalname);
        }
    });

    // Verificar archivos no identificados
    if (archivosNoIdentificados.length > 0) {
        return ResponseHandler.badRequest(res, `No se pudieron identificar los siguientes archivos: ${archivosNoIdentificados.join(', ')}`);
    }

    // Verificar que se hayan subido los archivos básicos necesarios
    const archivosBasicos = ['usuarios', 'carreras', 'asignaturas'];
    const archivosFaltantes = archivosBasicos.filter(tipo => !archivos[tipo]);
    
    if (archivosFaltantes.length > 0) {
        return ResponseHandler.badRequest(res, `Debe subir al menos los archivos: ${archivosBasicos.join(', ')}`);
    }

    // Inicializar resultados
    const resultados = {
        totalArchivos: Object.keys(archivos).length,
        procesados: 0,
        detalles: {},
        errores: []
    };

    // Iniciar transacción
    const transaction = await sequelize.transaction();

    try {
        info('=== INICIANDO CARGA MASIVA DE DATOS ===');
        
        // 1. Procesar usuarios (REQUERIDO)
        if (archivos.usuarios) {
            try {
                actualizarProgreso('Procesando usuarios masivos');
                const resultado = await usuariosController.procesar(archivos.usuarios, transaction);
                resultados.detalles.usuarios = resultado;
                resultados.procesados++;
                info(`Usuarios procesados`, {
                    creados: resultado.creados,
                    actualizados: resultado.actualizados,
                    rolesAsignados: resultado.rolesAsignados || 0,
                    errores: resultado.errores.length
                });
                
                // Registrar archivo en BD
                try {
                    await registrarArchivoProcesado(archivos.usuarios, 'usuarios', 1, req.user?.id || 1, resultado.creados, resultado.errores.length, resultado);
                    info(`Archivo usuarios registrado en BD`);
                } catch (errorRegistro) {
                    logError('Error al registrar archivo usuarios', errorRegistro);
                }
            } catch (error) {
                const mensajeError = `Error al procesar usuarios: ${error.message}`;
                logError(mensajeError, { error: error.message });
                registrarError(error, 'procesarUsuarios');
                throw new Error(mensajeError);
            }
        }

        // 2. Procesar carreras (REQUERIDO)
        if (archivos.carreras) {
            try {
                actualizarProgreso('Procesando carreras completas');
                const resultado = await carrerasController.procesar(archivos.carreras, transaction);
                resultados.detalles.carreras = resultado;
                resultados.procesados++;
                info(`Carreras procesadas`, {
                    creadas: resultado.creadas,
                    actualizadas: resultado.actualizadas,
                    errores: resultado.errores.length
                });
                
                // Registrar archivo en BD
                try {
                    await registrarArchivoProcesado(archivos.carreras, 'carreras', 1, req.user?.id || 1, resultado.creadas, resultado.errores.length, resultado);
                    info(`Archivo carreras registrado en BD`);
                } catch (errorRegistro) {
                    logError('Error al registrar archivo carreras', errorRegistro);
                }
            } catch (error) {
                const mensajeError = `Error al procesar carreras: ${error.message}`;
                logError(mensajeError, { error: error.message });
                registrarError(error, 'procesarCarreras');
                throw new Error(mensajeError);
            }
        }

        // 3. Procesar asignaturas (REQUERIDO)
        if (archivos.asignaturas) {
            try {
                actualizarProgreso('Procesando asignaturas completas');
                const resultado = await asignaturasController.procesar(archivos.asignaturas, transaction);
                resultados.detalles.asignaturas = resultado;
                resultados.procesados++;
                info(`Asignaturas procesadas`, {
                    creadas: resultado.creadas,
                    actualizadas: resultado.actualizadas,
                    errores: resultado.errores.length
                });
                
                // Registrar archivo en BD
                try {
                    await registrarArchivoProcesado(archivos.asignaturas, 'asignaturas', 1, req.user?.id || 1, resultado.creadas, resultado.errores.length, resultado);
                    info(`Archivo asignaturas registrado en BD`);
                } catch (errorRegistro) {
                    logError('Error al registrar archivo asignaturas', errorRegistro);
                }
            } catch (error) {
                const mensajeError = `Error al procesar asignaturas: ${error.message}`;
                logError(mensajeError, { error: error.message });
                registrarError(error, 'procesarAsignaturas');
                throw new Error(mensajeError);
            }
        }

        // 4. Procesar carga académica (OPCIONAL)
        if (archivos.carga_academica) {
            try {
                actualizarProgreso('Procesando carga académica');
                const resultado = await cargaAcademicaController.procesar(archivos.carga_academica, transaction);
                resultados.detalles.cargaAcademica = resultado;
                resultados.procesados++;
                info(`Carga académica procesada`, {
                    creadas: resultado.creadas,
                    actualizadas: resultado.actualizadas,
                    portafoliosGenerados: resultado.portafoliosGenerados || 0,
                    errores: resultado.errores.length
                });
                
                // Registrar archivo en BD
                try {
                    await registrarArchivoProcesado(archivos.carga_academica, 'carga_academica', 1, req.user?.id || 1, resultado.creadas, resultado.errores.length, resultado);
                    info(`Archivo carga_academica registrado en BD`);
                } catch (errorRegistro) {
                    logError('Error al registrar archivo carga_academica', errorRegistro);
                }
            } catch (error) {
                const mensajeError = `Error al procesar carga académica: ${error.message}`;
                logError(mensajeError, { error: error.message });
                registrarError(error, 'procesarCargaAcademica');
                // No lanzar error para archivos opcionales
                resultados.errores.push(mensajeError);
            }
        }

        // 5. Procesar verificaciones (OPCIONAL)
        if (archivos.verificaciones) {
            try {
                actualizarProgreso('Procesando verificaciones');
                const resultado = await verificacionesController.procesar(archivos.verificaciones, transaction);
                resultados.detalles.verificaciones = resultado;
                resultados.procesados++;
                info(`Verificaciones procesadas`, {
                    creadas: resultado.creadas,
                    actualizadas: resultado.actualizadas,
                    errores: resultado.errores.length
                });
                
                // Registrar archivo en BD
                try {
                    await registrarArchivoProcesado(archivos.verificaciones, 'verificaciones', 1, req.user?.id || 1, resultado.creadas, resultado.errores.length, resultado);
                    info(`Archivo verificaciones registrado en BD`);
                } catch (errorRegistro) {
                    logError('Error al registrar archivo verificaciones', errorRegistro);
                }
            } catch (error) {
                const mensajeError = `Error al procesar verificaciones: ${error.message}`;
                logError(mensajeError, { error: error.message });
                registrarError(error, 'procesarVerificaciones');
                // No lanzar error para archivos opcionales
                resultados.errores.push(mensajeError);
            }
        }

        // 6. Procesar códigos institucionales (OPCIONAL)
        if (archivos.codigos_institucionales) {
            try {
                actualizarProgreso('Procesando códigos institucionales');
                const resultado = await codigosInstitucionalesController.procesar(archivos.codigos_institucionales, transaction);
                resultados.detalles.codigosInstitucionales = resultado;
                resultados.procesados++;
                info(`Códigos institucionales procesados`, {
                    creados: resultado.creados,
                    actualizados: resultado.actualizados,
                    errores: resultado.errores.length
                });
                
                // Registrar archivo en BD
                try {
                    await registrarArchivoProcesado(archivos.codigos_institucionales, 'codigos_institucionales', 1, req.user?.id || 1, resultado.creados, resultado.errores.length, resultado);
                    info(`Archivo codigos_institucionales registrado en BD`);
                } catch (errorRegistro) {
                    logError('Error al registrar archivo codigos_institucionales', errorRegistro);
                }
            } catch (error) {
                const mensajeError = `Error al procesar códigos institucionales: ${error.message}`;
                logError(mensajeError, { error: error.message });
                registrarError(error, 'procesarCodigosInstitucionales');
                // No lanzar error para archivos opcionales
                resultados.errores.push(mensajeError);
            }
        }

        // Confirmar transacción
        await transaction.commit();
        info('TRANSACCIÓN CONFIRMADA - Todos los datos han sido guardados');
        
        // Limpiar archivos temporales
        await limpiarArchivosTemporales(req.files);

        // Generar reporte de inicialización
        const reporte = generarReporteInicializacion(resultados);

        info('=== CARGA MASIVA COMPLETADA EXITOSAMENTE ===');

        return ResponseHandler.success(res, reporte, 'Sistema inicializado correctamente');

    } catch (error) {
        // Revertir transacción en caso de error
        await transaction.rollback();
        logError('TRANSACCIÓN REVERTIDA - Se produjo un error', { error: error.message });
        
        // Limpiar archivos temporales
        await limpiarArchivosTemporales(req.files);

        logError('Error en la inicialización del sistema', { 
            error: error.message,
            resultados 
        });
        
        return ResponseHandler.serverError(res, error, 'Error en la inicialización del sistema');
    }
};

/**
 * Genera un reporte de la inicialización
 * @param {Object} resultados - Resultados de la inicialización
 * @returns {Object} Datos del reporte generado
 */
const generarReporteInicializacion = (resultados) => {
    const reporte = {
        fecha: new Date().toISOString(),
        archivos: {
            total: resultados.totalArchivos,
            procesados: resultados.procesados
        },
        resumen: {
            totalCreados: 0,
            totalActualizados: 0,
            totalErrores: 0
        },
        detalles: {}
    };

    // Procesar cada tipo de archivo
    Object.keys(resultados.detalles).forEach(tipo => {
        const detalle = resultados.detalles[tipo];
        if (detalle) {
            reporte.detalles[tipo] = {
                creados: detalle.creados || detalle.creadas || 0,
                actualizados: detalle.actualizados || detalle.actualizadas || 0,
                errores: detalle.errores ? detalle.errores.length : 0,
                rolesAsignados: detalle.rolesAsignados || 0
            };

            // Sumar al resumen general
            reporte.resumen.totalCreados += reporte.detalles[tipo].creados;
            reporte.resumen.totalActualizados += reporte.detalles[tipo].actualizados;
            reporte.resumen.totalErrores += reporte.detalles[tipo].errores;
        }
    });

    // Añadir errores generales
    reporte.resumen.totalErrores += resultados.errores.length;
    reporte.erroresGenerales = resultados.errores;

    return reporte;
};

/**
 * Obtiene el progreso actual de la inicialización del sistema
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 */
const obtenerProgreso = (req, res) => {
    const progreso = global.inicializacionProgress || {
        enProgreso: false,
        pasoActual: 'No iniciado',
        progreso: 0,
        totalPasos: 6,
        inicio: null,
        finalizado: null,
        error: null
    };

    return ResponseHandler.success(res, progreso, 'Progreso obtenido correctamente');
};

// Función para registrar archivo procesado
async function registrarArchivoProcesado(archivo, tipoArchivo, cicloId, usuarioId, registrosProcesados, registrosErrores, detalles) {
    try {
        // Calcular hash del archivo
        const contenidoArchivo = fs.readFileSync(archivo.path);
        const hash = crypto.createHash('sha256').update(contenidoArchivo).digest('hex');
        
        // Generar nombre único del sistema
        const timestamp = Date.now();
        const nombreSistema = `${tipoArchivo}_${cicloId}_${timestamp}_${archivo.originalname}`;
        
        // Registrar en base de datos
        const archivoRegistrado = await ArchivoCargaMasiva.create({
            ciclo_id: cicloId,
            tipo_archivo: tipoArchivo,
            nombre_original: archivo.originalname,
            nombre_sistema: nombreSistema,
            ruta_archivo: archivo.path,
            tamanio_bytes: archivo.size,
            registros_procesados: registrosProcesados,
            registros_errores: registrosErrores,
            estado: registrosErrores > 0 ? 'procesado' : 'activo',
            detalles_procesamiento: detalles,
            hash_archivo: hash,
            subido_por: usuarioId,
            fecha_procesamiento: new Date()
        });
        
        info(`Archivo registrado en BD: ${archivoRegistrado.id} - ${tipoArchivo}`);
        return archivoRegistrado;
        
    } catch (error) {
        logError('Error al registrar archivo procesado', {
            error: error.message,
            tipoArchivo,
            archivo: archivo.originalname
        });
        throw error;
    }
}

module.exports = {
    inicializarSistema,
    obtenerProgreso
};
