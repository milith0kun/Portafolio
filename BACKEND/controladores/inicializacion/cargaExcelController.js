const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { Usuario, UsuarioRol, Carrera, Asignatura, DocenteAsignatura, CicloAcademico, Semestre, VerificadorDocente, CodigoInstitucional } = require('../../modelos');
const { sequelize } = require('../../config/database');

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${ext}. Solo se permiten: ${allowedTypes.join(', ')}`));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

/**
 * Procesar archivo de usuarios masivos
 */
async function procesarUsuarios(filePath, cicloId) {
  console.log('📋 Procesando archivo de usuarios...');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  const resultados = {
    exitosos: 0,
    errores: 0,
    detalles: []
  };

  const transaction = await sequelize.transaction();

  try {
    for (let i = 0; i < data.length; i++) {
      const fila = data[i];
      
      try {
        // Validar campos requeridos
        if (!fila.nombres || !fila.apellidos || !fila.correo) {
          throw new Error('Faltan campos requeridos: nombres, apellidos, correo');
        }

        // Verificar si el usuario ya existe
        const usuarioExistente = await Usuario.findOne({
          where: { correo: fila.correo },
          transaction
        });

        if (usuarioExistente) {
          resultados.detalles.push({
            fila: i + 2,
            mensaje: `Usuario ${fila.correo} ya existe`,
            tipo: 'advertencia'
          });
          continue;
        }

        // Generar contraseña por defecto si no se proporciona
        const contrasenaDefault = fila.contrasena || 'password123';

        // Crear usuario
        const nuevoUsuario = await Usuario.create({
          nombres: fila.nombres.trim(),
          apellidos: fila.apellidos.trim(),
          correo: fila.correo.trim().toLowerCase(),
          contrasena: contrasenaDefault, // Se encriptará automáticamente
          telefono: fila.telefono || null,
          activo: true,
          creado_en: new Date(),
          actualizado_en: new Date()
        }, { transaction });

        // Asignar roles si se especifican
        const rolesUsuario = [];
        if (fila.rol_principal) {
          const rolesPermitidos = ['administrador', 'docente', 'verificador'];
          const rolesList = fila.rol_principal.split(',').map(r => r.trim().toLowerCase());
          
          for (const rol of rolesList) {
            if (rolesPermitidos.includes(rol)) {
              await UsuarioRol.create({
                usuario_id: nuevoUsuario.id,
                rol: rol,
                activo: true,
                asignado_por: 1, // Usuario admin por defecto
                fecha_asignacion: new Date()
              }, { transaction });
              rolesUsuario.push(rol);
            }
          }
        }

        resultados.exitosos++;
        resultados.detalles.push({
          fila: i + 2,
          mensaje: `Usuario ${fila.correo} creado exitosamente con roles: ${rolesUsuario.join(', ')}`,
          tipo: 'exito'
        });

      } catch (error) {
        resultados.errores++;
        resultados.detalles.push({
          fila: i + 2,
          mensaje: `Error: ${error.message}`,
          tipo: 'error'
        });
      }
    }

    await transaction.commit();
    console.log(`✅ Usuarios procesados: ${resultados.exitosos} exitosos, ${resultados.errores} errores`);
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return resultados;
}

/**
 * Procesar archivo de carreras
 */
async function procesarCarreras(filePath, cicloId) {
  console.log('🏫 Procesando archivo de carreras...');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  const resultados = {
    exitosos: 0,
    errores: 0,
    detalles: []
  };

  const transaction = await sequelize.transaction();

  try {
    for (let i = 0; i < data.length; i++) {
      const fila = data[i];
      
      try {
        // Validar campos requeridos
        if (!fila.codigo || !fila.nombre || !fila.facultad) {
          throw new Error('Faltan campos requeridos: codigo, nombre, facultad');
        }

        // Verificar si la carrera ya existe
        const carreraExistente = await Carrera.findOne({
          where: { codigo: fila.codigo },
          transaction
        });

        if (carreraExistente) {
          // Actualizar carrera existente
          await carreraExistente.update({
            nombre: fila.nombre.trim(),
            facultad: fila.facultad.trim(),
            duracion_semestres: fila.duracion_semestres || 10,
            grado_otorgado: fila.grado_otorgado || fila.grado_academico || 'Licenciado',
            activo: true,
            actualizado_en: new Date()
          }, { transaction });

          resultados.detalles.push({
            fila: i + 2,
            mensaje: `Carrera ${fila.codigo} actualizada`,
            tipo: 'advertencia'
          });
        } else {
          // Crear nueva carrera
          await Carrera.create({
            codigo: fila.codigo.trim(),
            nombre: fila.nombre.trim(),
            facultad: fila.facultad.trim(),
            duracion_semestres: fila.duracion_semestres || 10,
            grado_otorgado: fila.grado_otorgado || fila.grado_academico || 'Licenciado',
            activo: true,
            creado_en: new Date(),
            actualizado_en: new Date()
          }, { transaction });

          resultados.detalles.push({
            fila: i + 2,
            mensaje: `Carrera ${fila.codigo} - ${fila.nombre} creada exitosamente`,
            tipo: 'exito'
          });
        }

        resultados.exitosos++;

      } catch (error) {
        resultados.errores++;
        resultados.detalles.push({
          fila: i + 2,
          mensaje: `Error: ${error.message}`,
          tipo: 'error'
        });
      }
    }

    await transaction.commit();
    console.log(`✅ Carreras procesadas: ${resultados.exitosos} exitosas, ${resultados.errores} errores`);
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return resultados;
}

/**
 * Procesar archivo de asignaturas
 */
async function procesarAsignaturas(filePath, cicloId) {
  console.log('📖 Procesando archivo de asignaturas...');
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  const resultados = {
    exitosos: 0,
    errores: 0,
    detalles: []
  };

  // Obtener ciclo académico
  const ciclo = await CicloAcademico.findByPk(cicloId, {
    attributes: {
      exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
    }
  });
  if (!ciclo) {
    throw new Error('Ciclo académico no encontrado');
  }

  const transaction = await sequelize.transaction();

  try {
    for (let i = 0; i < data.length; i++) {
      const fila = data[i];
      
      try {
        // Validar campos requeridos
        if (!fila.codigo || !fila.nombre || !fila.carrera) {
          throw new Error('Faltan campos requeridos: codigo, nombre, carrera');
        }

        // Verificar si la asignatura ya existe en este ciclo
        const asignaturaExistente = await Asignatura.findOne({
          where: { 
            codigo: fila.codigo,
            ciclo_id: cicloId
          },
          transaction
        });

        if (asignaturaExistente) {
          resultados.detalles.push({
            fila: i + 2,
            mensaje: `Asignatura ${fila.codigo} ya existe en este ciclo`,
            tipo: 'advertencia'
          });
          continue;
        }

        // Crear asignatura
        await Asignatura.create({
          codigo: fila.codigo.trim(),
          nombre: fila.nombre.trim(),
          carrera: fila.carrera.trim(),
          semestre: fila.semestre || 'I',
          anio: ciclo.anio_actual,
          creditos: fila.creditos || 3,
          horas_teoricas: fila.horas_teoricas || 3,
          tipo: fila.tipo || 'teoria',
          ciclo_id: cicloId,
          activo: true,
          creado_en: new Date(),
          actualizado_en: new Date()
        }, { transaction });

        resultados.exitosos++;
        resultados.detalles.push({
          fila: i + 2,
          mensaje: `Asignatura ${fila.codigo} - ${fila.nombre} creada exitosamente`,
          tipo: 'exito'
        });

      } catch (error) {
        resultados.errores++;
        resultados.detalles.push({
          fila: i + 2,
          mensaje: `Error: ${error.message}`,
          tipo: 'error'
        });
      }
    }

    await transaction.commit();
    console.log(`✅ Asignaturas procesadas: ${resultados.exitosos} exitosas, ${resultados.errores} errores`);
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return resultados;
}

/**
 * Controlador principal para carga masiva
 */
exports.cargarArchivos = [
  upload.array('archivos', 10),
  async (req, res) => {
    try {
      console.log('🚀 Iniciando carga masiva de archivos...');
      console.log('Archivos recibidos:', req.files?.length || 0);
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          exito: false,
          mensaje: 'No se recibieron archivos'
        });
      }

      // Obtener ciclo académico activo
      const cicloActivo = await CicloAcademico.findOne({
        where: { estado: 'activo' },
        attributes: {
          exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
        }
      });

      if (!cicloActivo) {
        return res.status(400).json({
          exito: false,
          mensaje: 'No hay ciclo académico activo'
        });
      }

      const resultadosGenerales = {
        archivos_procesados: 0,
        errores: [],
        resultados: []
      };

      // Procesar cada archivo
      for (const archivo of req.files) {
        console.log(`📁 Procesando archivo: ${archivo.originalname}`);
        
        try {
          let resultados;
          const nombreArchivo = archivo.originalname.toLowerCase();

          // Determinar tipo de archivo y procesarlo
          if (nombreArchivo.includes('usuario')) {
            resultados = await procesarUsuarios(archivo.path, cicloActivo.id);
          } else if (nombreArchivo.includes('carrera')) {
            resultados = await procesarCarreras(archivo.path, cicloActivo.id);
          } else if (nombreArchivo.includes('asignatura')) {
            resultados = await procesarAsignaturas(archivo.path, cicloActivo.id);
          } else {
            throw new Error(`Tipo de archivo no reconocido: ${archivo.originalname}`);
          }

          resultadosGenerales.resultados.push({
            archivo: archivo.originalname,
            tipo: nombreArchivo.includes('usuario') ? 'usuarios' : 
                  nombreArchivo.includes('carrera') ? 'carreras' : 'asignaturas',
            exitosos: resultados.exitosos,
            errores: resultados.errores,
            detalles: resultados.detalles
          });

          resultadosGenerales.archivos_procesados++;

          // Limpiar archivo temporal
          if (fs.existsSync(archivo.path)) {
            fs.unlinkSync(archivo.path);
          }

        } catch (error) {
          console.error(`❌ Error procesando ${archivo.originalname}:`, error);
          resultadosGenerales.errores.push({
            archivo: archivo.originalname,
            error: error.message
          });

          // Limpiar archivo temporal en caso de error
          if (fs.existsSync(archivo.path)) {
            fs.unlinkSync(archivo.path);
          }
        }
      }

      console.log('✅ Carga masiva completada');

      res.json({
        exito: true,
        mensaje: 'Carga masiva completada',
        ciclo_academico: cicloActivo.nombre,
        resultados: resultadosGenerales
      });

    } catch (error) {
      console.error('❌ Error en carga masiva:', error);
      res.status(500).json({
        exito: false,
        mensaje: 'Error interno del servidor',
        error: error.message
      });
    }
  }
];

/**
 * Obtener plantillas de ejemplo
 */
exports.obtenerPlantillas = async (req, res) => {
  try {
    const plantillas = {
      usuarios: {
        nombre: '01_usuarios_masivos.xlsx',
        descripcion: 'Plantilla para carga de usuarios del sistema',
        columnas: ['nombres', 'apellidos', 'correo', 'telefono', 'rol_principal', 'contrasena']
      },
      carreras: {
        nombre: '02_carreras_completas.xlsx',
        descripcion: 'Plantilla para carga de carreras y programas',
        columnas: ['codigo', 'nombre', 'facultad', 'duracion_semestres', 'grado_otorgado']
      },
      asignaturas: {
        nombre: '03_asignaturas_completas.xlsx',
        descripcion: 'Plantilla para carga de asignaturas',
        columnas: ['codigo', 'nombre', 'carrera', 'semestre', 'creditos', 'horas_teoricas', 'tipo']
      }
    };

    res.json({
      exito: true,
      plantillas
    });

  } catch (error) {
    console.error('Error obteniendo plantillas:', error);
    res.status(500).json({
      exito: false,
      mensaje: 'Error obteniendo plantillas',
      error: error.message
    });
  }
};