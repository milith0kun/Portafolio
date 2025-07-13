const { Usuario, UsuarioRol } = require('../../modelos');
const { Op } = require('sequelize');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { info, error: logError } = require('../../config/logger');

/**
 * Procesa el archivo Excel de usuarios
 * @param {Object} archivo - Archivo Excel subido
 * @param {Object} transaction - Transacción de la base de datos
 * @returns {Object} Resultados del procesamiento
 */
const procesar = async (archivo, transaction) => {
    info(`Iniciando procesamiento de usuarios: ${archivo.originalname}`);
    
    try {
        // Leer archivo dependiendo de la extensión
        let data = [];
        const extension = archivo.originalname.toLowerCase().split('.').pop();
        
        if (extension === 'csv') {
            info('Procesando archivo CSV');
            // Para CSV, especificar opciones de lectura
            const workbook = XLSX.readFile(archivo.path, {
                type: 'file',
                raw: false,
                codepage: 65001 // UTF-8
            });
            const sheetName = workbook.SheetNames[0];
            data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
                header: 1,
                defval: '',
                blankrows: false
            });
            
            // Convertir array de arrays a array de objetos
            if (data.length > 0) {
                const headers = data[0];
                data = data.slice(1).map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index] || '';
                    });
                    return obj;
                });
            }
        } else {
            info('Procesando archivo Excel');
            const workbook = XLSX.readFile(archivo.path);
            const sheetName = workbook.SheetNames[0];
            data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        }
        
        info(`Datos leídos: ${data.length} filas`);

        const resultados = {
            total: data.length,
            creados: 0,
            actualizados: 0,
            rolesAsignados: 0,
            errores: []
        };

        // Obtener el ID del administrador para el campo creado_por
        const admin = await Usuario.findOne({
            where: { correo: 'admin@unsaac.edu.pe' },
            transaction
        });

        const adminId = admin ? admin.id : null;

        for (let i = 0; i < data.length; i++) {
            try {
                const fila = data[i];
                const { 
                    nombres, 
                    apellidos, 
                    correo, 
                    telefono = '',
                    departamento = '',
                    categoria = '',
                    especialidad = '',
                    rol_principal = 'DOCENTE',
                    roles_secundarios = '',
                    fecha_ingreso,
                    activo = 'SI'
                } = fila;

                // Validar campos requeridos
                if (!nombres || !apellidos || !correo) {
                    throw new Error('Faltan campos requeridos (nombres, apellidos, correo)');
                }

                // Validar formato de correo
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
                    throw new Error('Formato de correo electrónico inválido');
                }

                // Generar contraseña por defecto
                const contrasenaDefault = 'defaultPassword123';

                // Encriptar contraseña
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(contrasenaDefault, salt);

                // Buscar usuario existente por correo
                const [usuario, created] = await Usuario.findOrCreate({
                    where: { correo },
                    defaults: {
                        nombres,
                        apellidos,
                        correo,
                        telefono,
                        contrasena: hashedPassword,
                        avatar: null,
                        activo: activo === 'SI' ? 1 : 0,
                        ultimo_acceso: null,
                        token_recuperacion: null,
                        expiracion_token: null
                    },
                    transaction
                });

                // Si el usuario ya existe, actualizarlo
                if (!created) {
                    const updateData = {
                        nombres,
                        apellidos,
                        telefono: telefono || usuario.telefono,
                        activo: activo === 'SI' ? 1 : 0
                    };

                    await usuario.update(updateData, { transaction });
                    info(`Usuario actualizado: ${correo}`);
                    resultados.actualizados++;
                } else {
                    info(`Usuario creado: ${correo}`);
                    resultados.creados++;
                }

                // Procesar roles
                const rolesAAsignar = [];
                
                // Agregar rol principal
                if (rol_principal) {
                    rolesAAsignar.push(rol_principal.toLowerCase());
                }
                
                // Agregar roles secundarios si existen
                if (roles_secundarios) {
                    const rolesSecundariosArray = roles_secundarios.split(',')
                        .map(rol => rol.trim().toLowerCase())
                        .filter(rol => rol.length > 0);
                    rolesAAsignar.push(...rolesSecundariosArray);
                }

                // Eliminar duplicados
                const rolesUnicos = [...new Set(rolesAAsignar)];

                // Asignar roles al usuario
                for (const nombreRol of rolesUnicos) {
                    try {
                        // Buscar o crear el rol
                        const [usuarioRol, rolCreated] = await UsuarioRol.findOrCreate({
                            where: { 
                                usuario_id: usuario.id,
                                rol: nombreRol
                            },
                            defaults: {
                                usuario_id: usuario.id,
                                rol: nombreRol,
                                activo: 1,
                                asignado_por: adminId,
                                fecha_asignacion: new Date(),
                                observaciones: `Rol asignado durante carga masiva - ${departamento ? 'Departamento: ' + departamento : ''}`
                            },
                            transaction
                        });

                        if (rolCreated) {
                            resultados.rolesAsignados++;
                            info(`Rol ${nombreRol} asignado a usuario ${correo}`);
                        } else {
                            // Si ya existe el rol, actualizarlo para asegurarse de que esté activo
                            await usuarioRol.update({
                                activo: 1,
                                asignado_por: adminId,
                                observaciones: `Rol actualizado durante carga masiva - ${departamento ? 'Departamento: ' + departamento : ''}`
                            }, { transaction });
                            info(`Rol ${nombreRol} actualizado para usuario ${correo}`);
                        }
                    } catch (roleError) {
                        logError(`Error al asignar rol ${nombreRol} a usuario ${correo}: ${roleError.message}`);
                    }
                }

            } catch (error) {
                logError(`Error en fila ${i + 2}: ${error.message}`);
                resultados.errores.push({
                    fila: i + 2,
                    valores: data[i],
                    error: error.message
                });
            }
        }

        info(`Procesamiento de usuarios completado: ${resultados.creados} creados, ${resultados.actualizados} actualizados, ${resultados.rolesAsignados} roles asignados, ${resultados.errores.length} errores`);
        
        return resultados;
    } catch (error) {
        logError(`Error en procesarUsuarios: ${error.message}`);
        throw new Error(`Error al procesar el archivo de usuarios: ${error.message}`);
    }
};

module.exports = {
    procesar
};
