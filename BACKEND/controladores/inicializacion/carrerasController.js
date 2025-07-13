const { Carrera } = require('../../modelos');
const { Op } = require('sequelize');
const XLSX = require('xlsx');
const { info, error: logError } = require('../../config/logger');
const { registrarError } = require('./utils');

/**
 * Procesa el archivo Excel de carreras
 * @param {Object} archivo - Archivo Excel subido
 * @param {Object} transaction - Transacción de la base de datos
 * @returns {Object} Resultados del procesamiento
 */
const procesar = async (archivo, transaction) => {
    try {
        info('Iniciando procesamiento de carreras', {
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

        info(`Procesando ${data.length} carreras`);

        for (let i = 0; i < data.length; i++) {
            try {
                const fila = data[i];
                const { 
                    codigo,
                    nombre,
                    facultad,
                    duracion_semestres = 10,
                    grado_otorgado,
                    activo = true
                } = fila;

                // Validar campos requeridos
                if (!codigo || !nombre || !facultad) {
                    throw new Error('Faltan campos requeridos (codigo, nombre, facultad)');
                }

                // Validar que la duración sea un número
                if (duracion_semestres && isNaN(parseInt(duracion_semestres))) {
                    throw new Error('La duración debe ser un número');
                }

                // Buscar si la carrera ya existe por código
                const [carrera, created] = await Carrera.findOrCreate({
                    where: { codigo },
                    defaults: {
                        codigo,
                        nombre,
                        facultad,
                        duracion_semestres: parseInt(duracion_semestres) || 10,
                        grado_otorgado: grado_otorgado || 'Bachiller',
                        activo: activo === true || activo === 'true' || activo === 'SI' || activo === 1
                    },
                    transaction
                });

                // Si la carrera ya existe, actualizarla
                if (!created) {
                    await carrera.update({
                        nombre,
                        facultad,
                        duracion_semestres: parseInt(duracion_semestres) || carrera.duracion_semestres,
                        grado_otorgado: grado_otorgado || carrera.grado_otorgado,
                        activo: activo === true || activo === 'true' || activo === 'SI' || activo === 1
                    }, { transaction });

                    resultados.actualizadas++;
                    info(`Carrera actualizada`, {
                        codigo,
                        nombre,
                        facultad
                    });
                } else {
                    resultados.creadas++;
                    info(`Carrera creada`, {
                        codigo,
                        nombre,
                        facultad
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
                registrarError(error, 'procesarCarreras');
            }
        }

        info('Procesamiento de carreras completado', {
            total: resultados.total,
            creadas: resultados.creadas,
            actualizadas: resultados.actualizadas,
            errores: resultados.errores.length
        });

        return resultados;
    } catch (error) {
        logError('Error al procesar archivo de carreras', {
            error: error.message,
            archivo: archivo.originalname
        });
        throw error;
    }
};

module.exports = {
    procesar
};
