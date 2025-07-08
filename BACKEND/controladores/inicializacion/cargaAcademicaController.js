const { Usuario, UsuarioRol, Asignatura, CicloAcademico, DocenteAsignatura, Portafolio, Estructura, EstadoSistema } = require('../../modelos');
const { Op } = require('sequelize');
const XLSX = require('xlsx');
const logger = require('../../config/logger');
const { registrarError } = require('./utils');

/**
 * Genera automáticamente los portafolios para una asignación docente-asignatura
 * @param {Object} docenteAsignatura - Instancia de DocenteAsignatura
 * @param {Object} asignatura - Instancia de Asignatura
 * @param {number} cicloId - ID del ciclo académico
 * @param {number} adminId - ID del administrador
 * @param {Object} transaction - Transacción de la base de datos
 * @returns {Promise<Object>} Resultado de la generación
 */
const generarPortafoliosAutomaticos = async (docenteAsignatura, asignatura, cicloId, adminId, transaction) => {
    try {
        // Verificar si ya existe un portafolio para esta asignación
        const portafolioExistente = await Portafolio.findOne({
            where: {
                asignacion_id: docenteAsignatura.id,
                ciclo_id: cicloId,
                nivel: 0 // Portafolio raíz
            },
            transaction
        });

        if (portafolioExistente) {
            logger.info(`Portafolio ya existe para asignación ${docenteAsignatura.id}`);
            return { creado: false, portafolio: portafolioExistente };
        }

        // Obtener la estructura base de portafolios
        const estructuraBase = await Estructura.findAll({
            order: [['nivel', 'ASC'], ['orden', 'ASC']],
            transaction
        });

        if (estructuraBase.length === 0) {
            logger.warn('No se encontró estructura base de portafolios');
            return { creado: false, error: 'Sin estructura base' };
        }

        // Crear portafolio raíz con estructura UNSAAC
        const nombrePortafolio = `Portafolio ${asignatura.nombre} - Grupo ${docenteAsignatura.grupo}`;
        const portafolioRaiz = await Portafolio.create({
            nombre: nombrePortafolio,
            docente_id: docenteAsignatura.docente_id,
            asignatura_id: docenteAsignatura.asignatura_id,
            grupo: docenteAsignatura.grupo,
            asignacion_id: docenteAsignatura.id,
            semestre_id: 1, // Asumiendo semestre por defecto
            ciclo_id: cicloId,
            estructura_id: null,
            carpeta_padre_id: null,
            nivel: 0,
            ruta: `/${docenteAsignatura.docente_id}/${asignatura.codigo}`,
            estado: 'activo',
            activo: true,
            progreso_completado: 0.00,
            metadatos: {
                tipo_portafolio: 'curso',
                codigo_asignatura: asignatura.codigo,
                creditos: asignatura.creditos || 3,
                semestre_academico: `2025-I` // TODO: Hacer dinámico
            },
            creado_por: adminId,
            actualizado_por: adminId
        }, { transaction });

        // Usar la función actualizada para crear estructura jerárquica UNSAAC
        const { crearEstructuraPortafolio } = require('../portafoliosController');
        
        const resultadoEstructura = await crearEstructuraPortafolio(
            portafolioRaiz.id,
            cicloId,
            1, // semestre_id
            transaction
        );
        
        const carpetasCreadas = resultadoEstructura?.carpetas_creadas || 0;

        logger.info(`Portafolio generado para ${nombrePortafolio}: ${carpetasCreadas.length + 1} carpetas creadas`);
        
        return { 
            creado: true, 
            portafolio: portafolioRaiz,
            carpetas: carpetasCreadas.length 
        };

    } catch (error) {
        logger.error(`Error al generar portafolio automático: ${error.message}`);
        throw error;
    }
};

/**
 * Actualiza el estado del sistema para habilitar la gestión de portafolios
 * @param {number} cicloId - ID del ciclo académico
 * @param {number} adminId - ID del administrador
 * @param {Object} transaction - Transacción de la base de datos
 */
const actualizarEstadoSistema = async (cicloId, adminId, transaction) => {
    try {
        // Deshabilitar el módulo de carga de datos
        await EstadoSistema.upsert({
            ciclo_id: cicloId,
            modulo: 'carga_datos',
            habilitado: false,
            fecha_deshabilitacion: new Date(),
            observaciones: 'Carga de datos completada. Sistema listo para gestión de portafolios.',
            actualizado_por: adminId,
            actualizado_en: new Date()
        }, { transaction });

        // Habilitar el módulo de gestión de documentos
        await EstadoSistema.upsert({
            ciclo_id: cicloId,
            modulo: 'gestion_documentos',
            habilitado: true,
            fecha_habilitacion: new Date(),
            observaciones: 'Módulo habilitado tras completar la carga académica y generación de portafolios.',
            actualizado_por: adminId,
            actualizado_en: new Date()
        }, { transaction });

        // Habilitar el módulo de verificación
        await EstadoSistema.upsert({
            ciclo_id: cicloId,
            modulo: 'verificacion',
            habilitado: true,
            fecha_habilitacion: new Date(),
            observaciones: 'Módulo habilitado para verificación de portafolios.',
            actualizado_por: adminId,
            actualizado_en: new Date()
        }, { transaction });

        logger.info(`Estado del sistema actualizado para ciclo ${cicloId}: gestion_documentos y verificacion habilitados`);
    } catch (error) {
        logger.error(`Error al actualizar estado del sistema: ${error.message}`);
        throw error;
    }
};

/**
 * Procesa el archivo Excel de carga académica
 * @param {Object} archivo - Archivo Excel subido
 * @param {Object} transaction - Transacción de la base de datos
 * @returns {Object} Resultados del procesamiento
 */
const procesar = async (archivo, transaction) => {
    try {
        const workbook = XLSX.readFile(archivo.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const resultados = {
            total: data.length,
            creadas: 0,
            actualizadas: 0,
            portafoliosGenerados: 0,
            errores: []
        };

        // Obtener el ID del administrador para el campo creado_por
        const admin = await Usuario.findOne({
            where: { correo: 'admin@unsaac.edu.pe' },
            transaction
        });

        if (!admin) {
            throw new Error('No se encontró un usuario administrador para registrar los cambios');
        }

        const adminId = admin.id;

        // Obtener todos los usuarios para referencia
        const usuarios = await Usuario.findAll({
            attributes: ['id', 'correo', 'nombres', 'apellidos'],
            transaction
        });

        const usuariosPorId = {};
        usuarios.forEach(usuario => {
            usuariosPorId[usuario.id] = usuario;
        });

        // Obtener todas las asignaturas para referencia
        const asignaturas = await Asignatura.findAll({
            attributes: ['id', 'codigo', 'nombre'],
            transaction
        });

        const asignaturasPorCodigo = {};
        asignaturas.forEach(asignatura => {
            asignaturasPorCodigo[asignatura.codigo] = asignatura;
        });

        // Obtener ciclo activo
        const cicloActivo = await CicloAcademico.findOne({
            where: { estado: 'activo' },
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            },
            transaction
        });

        if (!cicloActivo) {
            throw new Error('No hay ciclo académico activo');
        }

        for (let i = 0; i < data.length; i++) {
            try {
                const fila = data[i];
                const { 
                    docente_id,
                    asignatura_codigo,
                    grupo = 'A'
                } = fila;

                // Validar campos requeridos
                if (!docente_id || !asignatura_codigo) {
                    throw new Error('Faltan campos requeridos (docente_id, asignatura_codigo)');
                }

                // Validar que el docente exista
                if (!usuariosPorId[docente_id]) {
                    throw new Error(`El docente con ID ${docente_id} no existe`);
                }

                // Validar que la asignatura exista
                const asignatura = asignaturasPorCodigo[asignatura_codigo];
                if (!asignatura) {
                    throw new Error(`La asignatura con código ${asignatura_codigo} no existe`);
                }

                // Buscar si ya existe la asignación
                const [docenteAsignatura, created] = await DocenteAsignatura.findOrCreate({
                    where: { 
                        docente_id,
                        asignatura_id: asignatura.id,
                        ciclo_id: cicloActivo.id,
                        grupo
                    },
                    defaults: {
                        docente_id,
                        asignatura_id: asignatura.id,
                        ciclo_id: cicloActivo.id,
                        grupo,
                        activo: true,
                        asignado_por: adminId
                    },
                    transaction
                });

                // Si ya existe, actualizarla
                if (!created) {
                    await docenteAsignatura.update({
                        activo: true,
                        asignado_por: adminId
                    }, { transaction });

                    resultados.actualizadas++;
                    logger.info(`Asignación actualizada: Docente ${docente_id}, Asignatura ${asignatura_codigo}, Grupo ${grupo}`);
                } else {
                    resultados.creadas++;
                    logger.info(`Asignación creada: Docente ${docente_id}, Asignatura ${asignatura_codigo}, Grupo ${grupo}`);
                }

                // Generar portafolio automáticamente para esta asignación
                try {
                    const resultadoPortafolio = await generarPortafoliosAutomaticos(
                        docenteAsignatura, 
                        asignatura, 
                        cicloActivo.id, 
                        adminId, 
                        transaction
                    );
                    
                    if (resultadoPortafolio.creado) {
                        resultados.portafoliosGenerados++;
                        logger.info(`✅ Portafolio generado para ${asignatura.nombre} - Grupo ${grupo}`);
                    }
                } catch (errorPortafolio) {
                    logger.error(`❌ Error al generar portafolio para ${asignatura.nombre}: ${errorPortafolio.message}`);
                    // No detener el proceso por errores de portafolio
                }
            } catch (error) {
                const mensajeError = `Error en fila ${i + 1}: ${error.message}`;
                resultados.errores.push({
                    fila: i + 1,
                    mensaje: error.message,
                    data: data[i]
                });
                logger.error(mensajeError);
                registrarError(error, 'procesarCargaAcademica');
            }
        }

        // Si se procesó exitosamente y se generaron portafolios, actualizar estado del sistema
        if (resultados.portafoliosGenerados > 0) {
            try {
                await actualizarEstadoSistema(cicloActivo.id, adminId, transaction);
                logger.info(`✅ Estado del sistema actualizado para permitir gestión de portafolios`);
            } catch (errorEstado) {
                logger.error(`❌ Error al actualizar estado del sistema: ${errorEstado.message}`);
            }
        }

        return resultados;
    } catch (error) {
        logger.error(`Error al procesar archivo de carga académica: ${error.message}`, { error });
        throw error;
    }
};

module.exports = {
    procesar,
    generarPortafoliosAutomaticos
};
