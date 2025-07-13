const { Asignatura, CicloAcademico, Usuario } = require('../../modelos');
const { Op } = require('sequelize');
const XLSX = require('xlsx');
const { info, error: logError } = require('../../config/logger');
const { registrarError } = require('./utils');

/**
 * Procesa el archivo Excel de asignaturas
 * @param {Object} archivo - Archivo Excel subido
 * @param {Object} transaction - Transacción de la base de datos
 * @returns {Object} Resultados del procesamiento
 */
const procesar = async (archivo, transaction) => {
    try {
        info('Iniciando procesamiento de asignaturas', {
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

        // Obtener el ciclo académico activo
        const cicloActivo = await CicloAcademico.findOne({
            where: { estado: 'activo' },
            attributes: ['id', 'nombre'],
            transaction
        });

        if (!cicloActivo) {
            throw new Error('No hay un ciclo académico activo configurado');
        }

        info(`Usando ciclo académico: ${cicloActivo.nombre} (ID: ${cicloActivo.id})`);

        for (let i = 0; i < data.length; i++) {
            try {
                const fila = data[i];
                const { 
                    codigo,
                    nombre,
                    carrera_codigo,
                    ciclo,
                    creditos,
                    horas_teoricas,
                    horas_practicas,
                    pre_requisitos = '',
                    tipo = 'OBLIGATORIO',
                    activo = 'SI'
                } = fila;

                // Validar campos requeridos
                if (!codigo || !nombre || !creditos) {
                    throw new Error('Faltan campos requeridos (codigo, nombre, creditos)');
                }

                // Usar el ciclo académico activo
                const cicloId = cicloActivo.id;

                // Validar valores numéricos
                if (isNaN(parseInt(creditos))) {
                    throw new Error('El campo creditos debe ser un valor numérico');
                }

                // Buscar asignatura existente por código y ciclo
                const [asignatura, created] = await Asignatura.findOrCreate({
                    where: { 
                        codigo,
                        ciclo_id: cicloId
                    },
                    defaults: {
                        nombre,
                        codigo,
                        carrera: carrera_codigo || '',
                        semestre: ciclo || '',
                        anio: new Date().getFullYear(),
                        creditos: parseInt(creditos),
                        horas_teoricas: parseInt(horas_teoricas) || 0,
                        tipo: determinarTipo(tipo, horas_teoricas, horas_practicas),
                        ciclo_id: cicloId,
                        prerequisitos: pre_requisitos || null,
                        activo: activo === 'SI' ? true : false
                    },
                    transaction
                });

                // Si la asignatura ya existe, actualizarla
                if (!created) {
                    const updateData = {
                        nombre,
                        carrera: carrera_codigo || asignatura.carrera,
                        semestre: ciclo || asignatura.semestre,
                        anio: new Date().getFullYear(),
                        creditos: parseInt(creditos),
                        horas_teoricas: parseInt(horas_teoricas) || asignatura.horas_teoricas || 0,
                        tipo: determinarTipo(tipo, horas_teoricas, horas_practicas) || asignatura.tipo,
                        prerequisitos: pre_requisitos || asignatura.prerequisitos,
                        activo: activo === 'SI' ? true : false
                    };
                    
                    // Actualizar asignatura con verificación explícita
                    try {
                        await asignatura.update(updateData, { transaction });
                        info(`Asignatura actualizada: ${codigo} - ${nombre}`, { 
                            camposActualizados: Object.keys(updateData) 
                        });
                        
                        // Verificar que la actualización se haya realizado correctamente
                        const asignaturaActualizada = await Asignatura.findByPk(asignatura.id, { transaction });
                        if (!asignaturaActualizada) {
                            throw new Error(`No se pudo verificar la actualización de la asignatura: ${codigo}`);
                        }
                        resultados.actualizadas++;
                    } catch (updateError) {
                        logError(`Error al actualizar asignatura ${codigo}`, {
                            error: updateError.message,
                            codigo
                        });
                        throw new Error(`Error al actualizar asignatura ${codigo}: ${updateError.message}`);
                    }
                } else {
                    // Verificar que la asignatura creada exista en la base de datos
                    try {
                        const asignaturaCreada = await Asignatura.findByPk(asignatura.id, { transaction });
                        if (!asignaturaCreada) {
                            throw new Error(`No se pudo verificar la creación de la asignatura: ${codigo}`);
                        }
                        info(`Asignatura creada: ${codigo} - ${nombre}`);
                        resultados.creadas++;
                    } catch (verifyError) {
                        logError(`Error al verificar la creación de la asignatura ${codigo}`, {
                            error: verifyError.message,
                            codigo
                        });
                        throw new Error(`Error al verificar la creación de la asignatura ${codigo}: ${verifyError.message}`);
                    }
                }
            } catch (error) {
                logError(`Error en fila ${i + 2} de asignaturas`, {
                    error: error.message,
                    fila: i + 2,
                    valores: data[i]
                });
                resultados.errores.push({
                    fila: i + 2,
                    valores: data[i],
                    error: error.message
                });
            }
        }

        info('Procesamiento de asignaturas completado', {
            creadas: resultados.creadas,
            actualizadas: resultados.actualizadas,
            errores: resultados.errores.length
        });
        
        return resultados;
    } catch (error) {
        registrarError(error, 'procesarAsignaturas');
        throw new Error(`Error al procesar el archivo de asignaturas: ${error.message}`);
    }
};

/**
 * Determina el tipo de asignatura basado en las horas teóricas y prácticas
 * @param {string} tipoOriginal - Tipo original del CSV (OBLIGATORIO, ELECTIVO, etc.)
 * @param {number} horasTeoricas - Horas teóricas
 * @param {number} horasPracticas - Horas prácticas
 * @returns {string} Tipo válido para el ENUM ('teoria', 'practica', 'laboratorio')
 */
function determinarTipo(tipoOriginal, horasTeoricas, horasPracticas) {
    const teoricas = parseInt(horasTeoricas) || 0;
    const practicas = parseInt(horasPracticas) || 0;
    
    // Si tiene más horas prácticas que teóricas, es práctica/laboratorio
    if (practicas > teoricas && practicas > 0) {
        return 'laboratorio';
    }
    // Si tiene horas prácticas pero más teóricas, es práctica
    else if (practicas > 0) {
        return 'practica';
    }
    // Solo horas teóricas o por defecto
    else {
        return 'teoria';
    }
}

module.exports = {
    procesar
};
