const { Usuario, UsuarioRol, VerificadorDocente, Portafolio, CicloAcademico } = require('../../modelos');
const { Op } = require('sequelize');
const XLSX = require('xlsx');
const { info, error: logError } = require('../../config/logger');
const { registrarError } = require('./utils');

/**
 * Procesa el archivo Excel de verificaciones (relaciones verificador-docente)
 * @param {Object} archivo - Archivo Excel subido
 * @param {Object} transaction - Transacción de la base de datos
 * @returns {Object} Resultados del procesamiento
 */
const procesar = async (archivo, transaction) => {
    try {
        info('Iniciando procesamiento de verificaciones', {
            archivo: archivo.originalname,
            tamanio: archivo.size
        });

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

        // Obtener ciclo activo
        const cicloActivo = await CicloAcademico.findOne({
            where: { estado: 'activo' },
            attributes: ['id', 'nombre'],
            transaction
        });

        if (!cicloActivo) {
            throw new Error('No hay ciclo académico activo disponible');
        }

        // Obtener todos los usuarios para validación (optimizado)
        const usuarios = await Usuario.findAll({
            include: [{
                model: UsuarioRol,
                as: 'roles',
                where: { activo: true },
                attributes: ['rol']
            }],
            attributes: ['id', 'nombres', 'apellidos', 'correo'],
            transaction
        });

        const usuariosPorId = {};
        usuarios.forEach(usuario => {
            usuariosPorId[usuario.id] = usuario;
        });

        info(`Procesando ${data.length} verificaciones para ciclo ${cicloActivo.nombre}`);

        for (let i = 0; i < data.length; i++) {
            try {
                const fila = data[i];
                const { 
                    docente_id,
                    verificador_id,
                    fecha_asignacion,
                    fecha_verificacion,
                    estado = 'PENDIENTE',
                    observaciones
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

                // Buscar si ya existe la relación verificador-docente
                const [verificadorDocente, created] = await VerificadorDocente.findOrCreate({
                    where: { 
                        verificador_id,
                        docente_id,
                        ciclo_id: cicloActivo.id
                    },
                    defaults: {
                        verificador_id,
                        docente_id,
                        ciclo_id: cicloActivo.id,
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
                    info(`Relación verificador-docente actualizada`, {
                        verificador_id,
                        docente_id,
                        ciclo: cicloActivo.nombre
                    });
                } else {
                    resultados.creadas++;
                    info(`Relación verificador-docente creada`, {
                        verificador_id,
                        docente_id,
                        ciclo: cicloActivo.nombre
                    });
                }
            } catch (error) {
                const mensajeError = `Error en fila ${i + 1}: ${error.message}`;
                resultados.errores.push({
                    fila: i + 1,
                    mensaje: error.message,
                    data: data[i]
                });
                logError(mensajeError, { fila: i + 1, data: data[i] });
                registrarError(error, 'procesarVerificaciones');
            }
        }

        info('Procesamiento de verificaciones completado', {
            total: resultados.total,
            creadas: resultados.creadas,
            actualizadas: resultados.actualizadas,
            errores: resultados.errores.length,
            ciclo: cicloActivo.nombre
        });

        return resultados;
    } catch (error) {
        logError('Error al procesar archivo de verificaciones', {
            error: error.message,
            archivo: archivo.originalname
        });
        throw error;
    }
};

module.exports = {
    procesar
};
