const { CodigoInstitucional, Usuario } = require('../../modelos');
const { Op } = require('sequelize');
const XLSX = require('xlsx');
const { info, error: logError } = require('../../config/logger');
const { registrarError } = require('./utils');

/**
 * Procesa el archivo Excel de códigos institucionales
 * @param {Object} archivo - Archivo Excel subido
 * @param {Object} transaction - Transacción de la base de datos
 * @returns {Object} Resultados del procesamiento
 */
const procesar = async (archivo, transaction) => {
    try {
        info('Iniciando procesamiento de códigos institucionales', {
            archivo: archivo.originalname,
            tamanio: archivo.size
        });

        const workbook = XLSX.readFile(archivo.path);
        const sheetName = workbook.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const resultados = {
            total: data.length,
            creados: 0,
            actualizados: 0,
            errores: []
        };

        // Obtener el ID del administrador para el campo creado_por
        const admin = await Usuario.findOne({
            where: { correo: 'admin@unsaac.edu.pe' },
            transaction
        });

        const adminEmail = admin ? admin.correo : 'admin@unsaac.edu.pe';

        info(`Procesando ${data.length} códigos institucionales`);

        for (let i = 0; i < data.length; i++) {
            try {
                const fila = data[i];
                const { 
                    codigo,
                    descripcion,
                    tipo,
                    estado = 'ACTIVO'
                } = fila;

                // Validar campos requeridos
                if (!codigo || !descripcion || !tipo) {
                    throw new Error('Faltan campos requeridos (codigo, descripcion, tipo)');
                }

                // Validar tipo
                const tiposValidos = ['REGULACION', 'CONVENIO', 'ACTA', 'OFICIO', 'MEMORANDUM', 'CIRCULAR', 'RESOLUCION', 'MANUAL'];
                if (!tiposValidos.includes(tipo.toUpperCase())) {
                    throw new Error(`Tipo inválido: ${tipo}. Debe ser uno de: ${tiposValidos.join(', ')}`);
                }

                // Buscar si el código institucional ya existe
                const [codigoInstitucional, created] = await CodigoInstitucional.findOrCreate({
                    where: { codigo },
                    defaults: {
                        codigo,
                        descripcion,
                        tipo: tipo.toUpperCase(),
                        estado: estado.toUpperCase(),
                        creado_por: adminEmail
                    },
                    transaction
                });

                // Si ya existe, actualizarlo
                if (!created) {
                    await codigoInstitucional.update({
                        descripcion,
                        tipo: tipo.toUpperCase(),
                        estado: estado.toUpperCase()
                    }, { transaction });

                    resultados.actualizados++;
                    info(`Código institucional actualizado`, {
                        codigo,
                        descripcion,
                        tipo: tipo.toUpperCase()
                    });
                } else {
                    resultados.creados++;
                    info(`Código institucional creado`, {
                        codigo,
                        descripcion,
                        tipo: tipo.toUpperCase()
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
                registrarError(error, 'procesarCodigosInstitucionales');
            }
        }

        info('Procesamiento de códigos institucionales completado', {
            total: resultados.total,
            creados: resultados.creados,
            actualizados: resultados.actualizados,
            errores: resultados.errores.length
        });

        return resultados;
    } catch (error) {
        logError('Error al procesar archivo de códigos institucionales', {
            error: error.message,
            archivo: archivo.originalname
        });
        throw error;
    }
};

module.exports = {
    procesar
};
