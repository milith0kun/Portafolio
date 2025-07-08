/**
 * Controlador de Archivos
 * Maneja la subida, validación y gestión de archivos en portafolios
 */

const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const ResponseHandler = require('./utils/responseHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Configuración de Multer para subida de archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadPath = path.join(__dirname, '../../uploads/portafolios');
      
      // Crear directorio si no existe
      await fs.mkdir(uploadPath, { recursive: true });
      
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(file.originalname);
    const nombreSistema = `${timestamp}_${randomString}${extension}`;
    
    cb(null, nombreSistema);
  }
});

// Filtros y validaciones de archivos
const fileFilter = (req, file, cb) => {
  // Tipos de archivo permitidos
  const tiposPermitidos = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain', // .txt
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];
  
  if (tiposPermitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten: PDF, DOCX, XLSX, PPTX, TXT, JPG, PNG`), false);
  }
};

// Configuración de Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo
    files: 10 // Máximo 10 archivos simultáneos
  }
});

/**
 * Middleware para subir archivos
 */
const uploadMiddleware = upload.array('archivos', 10);

/**
 * Subir archivos a un portafolio específico
 */
const subirArchivos = async (req, res) => {
  try {
    
    const { portafolioId } = req.params;
    const usuarioId = req.usuario.id;
    const rolActual = req.usuario.rol_actual;
    
    await sequelize.authenticate();
    
    const { Portafolio, ArchivoSubido, Usuario } = require('../modelos');
    
    // Verificar que el portafolio existe y el usuario tiene permisos
    const portafolio = await Portafolio.findByPk(portafolioId, {
      include: [
        {
          model: Usuario,
          as: 'docente',
          attributes: ['id', 'nombres', 'apellidos']
        }
      ]
    });
    
    if (!portafolio) {
      return ResponseHandler.error(res, 'Portafolio no encontrado', 404);
    }
    
    // Solo el docente propietario puede subir archivos
    if (rolActual === 'docente' && portafolio.docente_id !== usuarioId) {
      return ResponseHandler.error(res, 'No tienes permisos para subir archivos a este portafolio', 403);
    }
    
    // Los administradores pueden subir archivos a cualquier portafolio
    if (rolActual !== 'docente' && rolActual !== 'administrador') {
      return ResponseHandler.error(res, 'Solo docentes y administradores pueden subir archivos', 403);
    }
    
    // Verificar que se subieron archivos
    if (!req.files || req.files.length === 0) {
      return ResponseHandler.error(res, 'No se recibieron archivos para subir', 400);
    }
    
    const transaction = await sequelize.transaction();
    
    try {
      const archivosSubidos = [];
      
      for (const file of req.files) {
        // Calcular hash del archivo para verificación de integridad
        const hashContenido = await calcularHashArchivo(file.path);
        
        // Determinar formato basado en extensión
        const formato = determinarFormato(file.mimetype, file.originalname);
        
        // Crear registro en base de datos
        const archivoSubido = await ArchivoSubido.create({
          portafolio_id: portafolioId,
          nombre_original: file.originalname,
          nombre_sistema: file.filename,
          ruta: `uploads/portafolios/${file.filename}`,
          tipo_mime: file.mimetype,
          formato: formato,
          tamanio: file.size,
          hash_contenido: hashContenido,
          estado: 'pendiente',
          subido_por: usuarioId,
          version: 1
        }, { transaction });
        
        archivosSubidos.push({
          id: archivoSubido.id,
          nombre_original: file.originalname,
          nombre_sistema: file.filename,
          formato: formato,
          tamanio: file.size,
          estado: 'pendiente',
          subido_en: archivoSubido.subido_en
        });
        
        // Archivo subido
      }
      
      await transaction.commit();
      
      // Actualizar progreso del portafolio
      await actualizarProgresoPortafolio(portafolioId);
      
      return ResponseHandler.success(res, {
        portafolio: {
          id: portafolio.id,
          nombre: portafolio.nombre,
          ruta: portafolio.ruta
        },
        archivos_subidos: archivosSubidos,
        total_archivos: archivosSubidos.length
      }, `${archivosSubidos.length} archivo(s) subido(s) correctamente`);
      
    } catch (error) {
      await transaction.rollback();
      
      // Limpiar archivos si hubo error en BD
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          
        }
      }
      
      throw error;
    }
    
  } catch (error) {
    
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Descargar un archivo específico
 */
const descargarArchivo = async (req, res) => {
  try {
    
    const { archivoId } = req.params;
    const usuarioId = req.usuario.id;
    const rolActual = req.usuario.rol_actual;
    
    await sequelize.authenticate();
    
    const { ArchivoSubido, Portafolio, Usuario } = require('../modelos');
    
    // Obtener información del archivo
    const archivo = await ArchivoSubido.findByPk(archivoId, {
      include: [
        {
          model: Portafolio,
          as: 'portafolio',
          include: [
            {
              model: Usuario,
              as: 'docente',
              attributes: ['id', 'nombres', 'apellidos']
            }
          ]
        }
      ]
    });
    
    if (!archivo) {
      return ResponseHandler.error(res, 'Archivo no encontrado', 404);
    }
    
    // Verificar permisos de descarga
    const tienePermiso = await verificarPermisosArchivo(usuarioId, rolActual, archivo);
    
    if (!tienePermiso) {
      return ResponseHandler.error(res, 'No tienes permisos para descargar este archivo', 403);
    }
    
    // Construir ruta completa del archivo
    const rutaCompleta = path.join(__dirname, '../../', archivo.ruta);
    
    // Verificar que el archivo existe físicamente
    try {
      await fs.access(rutaCompleta);
    } catch (error) {
      return ResponseHandler.error(res, 'El archivo no existe en el sistema de archivos', 404);
    }
    
    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${archivo.nombre_original}"`);
    res.setHeader('Content-Type', archivo.tipo_mime);
    
    // Enviar archivo
    res.sendFile(rutaCompleta);
    
    // Archivo descargado
    
  } catch (error) {
    
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Eliminar un archivo
 */
const eliminarArchivo = async (req, res) => {
  try {
    console.log('=== ELIMINANDO ARCHIVO ===');
    
    const { archivoId } = req.params;
    const usuarioId = req.usuario.id;
    const rolActual = req.usuario.rol_actual;
    
    await sequelize.authenticate();
    
    const { ArchivoSubido, Portafolio, Usuario } = require('../modelos');
    
    // Obtener información del archivo
    const archivo = await ArchivoSubido.findByPk(archivoId, {
      include: [
        {
          model: Portafolio,
          as: 'portafolio',
          include: [
            {
              model: Usuario,
              as: 'docente',
              attributes: ['id', 'nombres', 'apellidos']
            }
          ]
        }
      ]
    });
    
    if (!archivo) {
      return ResponseHandler.error(res, 'Archivo no encontrado', 404);
    }
    
    // Solo el docente propietario o administrador pueden eliminar
    if (rolActual === 'docente' && archivo.portafolio.docente_id !== usuarioId) {
      return ResponseHandler.error(res, 'No tienes permisos para eliminar este archivo', 403);
    }
    
    if (rolActual !== 'docente' && rolActual !== 'administrador') {
      return ResponseHandler.error(res, 'Solo docentes y administradores pueden eliminar archivos', 403);
    }
    
    // No permitir eliminar archivos aprobados (solo administrador puede)
    if (archivo.estado === 'aprobado' && rolActual !== 'administrador') {
      return ResponseHandler.error(res, 'No se pueden eliminar archivos aprobados', 400);
    }
    
    const transaction = await sequelize.transaction();
    
    try {
      // Marcar como eliminado en lugar de borrar físicamente
      await archivo.update({
        estado: 'eliminado',
        actualizado_en: new Date()
      }, { transaction });
      
      await transaction.commit();
      
      // Actualizar progreso del portafolio
      await actualizarProgresoPortafolio(archivo.portafolio_id);
      
      return ResponseHandler.success(res, {
        archivo_id: archivo.id,
        nombre_original: archivo.nombre_original,
        estado_anterior: archivo.estado,
        estado_nuevo: 'eliminado'
      }, 'Archivo eliminado correctamente');
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error al eliminar archivo:', error);
    return ResponseHandler.error(res, error.message, 500);
  }
};

/**
 * Funciones auxiliares
 */

// Calcular hash SHA-256 de un archivo
async function calcularHashArchivo(rutaArchivo) {
  try {
    const contenido = await fs.readFile(rutaArchivo);
    return crypto.createHash('sha256').update(contenido).digest('hex');
  } catch (error) {
    console.error('Error al calcular hash:', error);
    return null;
  }
}

// Determinar formato basado en MIME type y extensión
function determinarFormato(mimeType, nombreOriginal) {
  const extension = path.extname(nombreOriginal).toLowerCase();
  
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('wordprocessingml')) return 'docx';
  if (mimeType.includes('spreadsheetml')) return 'xlsx';
  if (mimeType.includes('presentationml')) return 'pptx';
  if (mimeType === 'text/plain') return 'txt';
  if (mimeType.includes('image/jpeg') || extension === '.jpg' || extension === '.jpeg') return 'jpg';
  if (mimeType.includes('image/png')) return 'png';
  
  return 'otros';
}

// Verificar permisos de acceso a archivo
async function verificarPermisosArchivo(usuarioId, rolActual, archivo) {
  if (rolActual === 'administrador') {
    return true; // Administrador puede acceder a todo
  }
  
  if (rolActual === 'docente') {
    // Docente solo puede acceder a sus propios archivos
    return archivo.portafolio.docente_id === usuarioId;
  }
  
  if (rolActual === 'verificador') {
    // Verificar si tiene asignado este docente
    const { VerificadorDocente } = require('../modelos');
    const asignacion = await VerificadorDocente.findOne({
      where: { 
        verificador_id: usuarioId, 
        docente_id: archivo.portafolio.docente_id,
        activo: true 
      }
    });
    return !!asignacion;
  }
  
  return false;
}

// Actualizar progreso de un portafolio
async function actualizarProgresoPortafolio(portafolioId) {
  try {
    const { Portafolio, ArchivoSubido } = require('../modelos');
    
    // Obtener todas las carpetas del portafolio
    const carpetas = await Portafolio.findAll({
      where: {
        [Op.or]: [
          { id: portafolioId },
          { carpeta_padre_id: { [Op.not]: null } }
        ],
        activo: true
      },
      attributes: ['id']
    });
    
    const carpetaIds = carpetas.map(c => c.id);
    
    // Contar archivos por estado
    const archivos = await ArchivoSubido.findAll({
      where: {
        portafolio_id: carpetaIds,
        estado: { [Op.ne]: 'eliminado' }
      },
      attributes: ['estado']
    });
    
    if (archivos.length === 0) {
      return; // No hay archivos, no actualizar progreso
    }
    
    const archivosAprobados = archivos.filter(a => a.estado === 'aprobado').length;
    const progresoPorcentaje = Math.round((archivosAprobados / archivos.length) * 100);
    
    // Actualizar portafolio raíz
    const portafolioRaiz = await Portafolio.findOne({
      where: {
        [Op.or]: [
          { id: portafolioId },
          { carpeta_padre_id: null, id: { [Op.in]: carpetaIds } }
        ]
      }
    });
    
    if (portafolioRaiz) {
      await portafolioRaiz.update({
        progreso_completado: progresoPorcentaje
      });
    }
    
    // Progreso actualizado
    
  } catch (error) {
    console.error('Error al actualizar progreso:', error);
  }
}

module.exports = {
  uploadMiddleware,
  subirArchivos,
  descargarArchivo,
  eliminarArchivo
};