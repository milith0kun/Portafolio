const { Usuario, UsuarioRol, VerificadorDocente, Portafolio, CicloAcademico } = require('../../modelos');
const { Op } = require('sequelize');
const XLSX = require('xlsx');
const logger = require('../../config/logger');
const { registrarError } = require('./utils');

/**
 * Procesa el archivo Excel de verificaciones (relaciones verificador-docente)
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

        // Obtener todos los ciclos académicos para referencia
        const ciclos = await CicloAcademico.findAll({
            attributes: ['id', 'nombre'],
            transaction
        });

        const ciclosPorNombre = {};
        ciclos.forEach(ciclo => {
            ciclosPorNombre[ciclo.nombre] = ciclo.id;
        });

        // Obtener todos los usuarios para validación
        const usuarios = await Usuario.findAll({
            include: [{
                model: UsuarioRol,
                as: 'roles',
                where: { activo: true }
            }],
            transaction
        });

        const usuariosPorId = {};
        usuarios.forEach(usuario => {
            usuariosPorId[usuario.id] = usuario;
        });

        for (let i = 0; i < data.length; i++) {
            try {
                const fila = data[i];
                const { 
                    docente_id,
                    verificador_id,
                    fecha_asignacion,
                    fecha_verificacion,
                    estado = 'PENDIENTE',
                    observaciones,
                    creado_por = 'admin@unsaac.edu.pe',
                    actualizado_por
                } = fila;

                // Validar campos requeridos
                if (!docente_id || !verificador_id) {
                    throw new Error('Faltan campos requeridos (docente_id, verificador_id)');
                }

                // Validar que el docente exista
                if (!usuariosPorId[docente_id]) {
                    throw new Error(`El docente con ID ${docente_id} no existe`);
                }

                // Validar que el verificador exista
                if (!usuariosPorId[verificador_id]) {
                    throw new Error(`El verificador con ID ${verificador_id} no existe`);
                }

                // Obtener ciclo activo (usar el primer ciclo disponible si no se especifica)
                let cicloId = null;
                const ciclosActivos = await CicloAcademico.findOne({
                    where: { estado: 'activo' },
                    transaction,
                    attributes: {
                        exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
                    }
                });
                
                if (ciclosActivos) {
                    cicloId = ciclosActivos.id;
                } else {
                    // Si no hay ciclo activo, usar el primero disponible
                    const primerCiclo = await CicloAcademico.findOne({ 
                        transaction,
                        attributes: {
                            exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
                        }
                    });
                    if (primerCiclo) {
                        cicloId = primerCiclo.id;
                    } else {
                        throw new Error('No hay ciclos académicos disponibles');
                    }
                }

                // Buscar si ya existe la relación verificador-docente
                const [verificadorDocente, created] = await VerificadorDocente.findOrCreate({
                    where: { 
                        verificador_id,
                        docente_id,
                        ciclo_id: cicloId
                    },
                    defaults: {
                        verificador_id,
                        docente_id,
                        ciclo_id: cicloId,
                        activo: true,
                        fecha_asignacion: fecha_asignacion ? new Date(fecha_asignacion) : new Date(),
                        observaciones: observaciones || null,
                        asignado_por: adminId
                    },
                    transaction
                });

                // Si ya existe, actualizarla
                if (!created) {
                    await verificadorDocente.update({
                        activo: true,
                        observaciones: observaciones || verificadorDocente.observaciones,
                        asignado_por: adminId
                    }, { transaction });

                    resultados.actualizadas++;
                    logger.info(`Relación verificador-docente actualizada: Verificador ${verificador_id}, Docente ${docente_id}`);
                } else {
                    resultados.creadas++;
                    logger.info(`Relación verificador-docente creada: Verificador ${verificador_id}, Docente ${docente_id}`);
                }
            } catch (error) {
                const mensajeError = `Error en fila ${i + 1}: ${error.message}`;
                resultados.errores.push({
                    fila: i + 1,
                    mensaje: error.message,
                    data: data[i]
                });
                logger.error(mensajeError);
                registrarError(error, 'procesarVerificaciones');
            }
        }

        return resultados;
    } catch (error) {
        logger.error(`Error al procesar archivo de verificaciones: ${error.message}`, { error });
        throw error;
    }
};

module.exports = {
    procesar
};
