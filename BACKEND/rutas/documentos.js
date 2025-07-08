/**
 * Rutas de Documentos
 * Endpoints para gestión de documentos en portafolios docentes
 */

const express = require('express');
const router = express.Router();
const documentosController = require('../controladores/documentosController');
const { verificarToken, verificarRol } = require('../middleware/authJwt');

// Middleware global para todas las rutas
router.use(verificarToken);

/**
 * @route POST /api/documentos/subir
 * @desc Subir documento a portafolio
 * @access Docente
 */
router.post('/subir', 
  verificarRol(['docente', 'administrador']),
  documentosController.upload.single('archivo'),
  documentosController.subirDocumento
);

/**
 * @route GET /api/documentos/portafolio/:portafolioId
 * @desc Obtener documentos de un portafolio
 * @access Docente, Verificador, Admin
 * @query ?seccion=nombre_seccion (opcional)
 */
router.get('/portafolio/:portafolioId',
  verificarRol(['docente', 'verificador', 'administrador']),
  documentosController.obtenerDocumentosPortafolio
);

/**
 * @route GET /api/documentos/descargar/:archivoId
 * @desc Descargar documento específico
 * @access Docente (propio), Verificador (asignado), Admin
 */
router.get('/descargar/:archivoId',
  verificarRol(['docente', 'verificador', 'administrador']),
  documentosController.descargarDocumento
);

/**
 * @route DELETE /api/documentos/:archivoId
 * @desc Eliminar documento
 * @access Docente (propio), Admin
 */
router.delete('/:archivoId',
  verificarRol(['docente', 'administrador']),
  documentosController.eliminarDocumento
);

/**
 * @route GET /api/documentos/progreso/:portafolioId
 * @desc Obtener progreso de completitud del portafolio
 * @access Docente (propio), Verificador (asignado), Admin
 */
router.get('/progreso/:portafolioId',
  verificarRol(['docente', 'verificador', 'administrador']),
  documentosController.obtenerProgresoPortafolio
);

/**
 * @route POST /api/documentos/multiples
 * @desc Subir múltiples documentos a la vez
 * @access Docente, Admin
 */
router.post('/multiples',
  verificarRol(['docente', 'administrador']),
  documentosController.upload.array('archivos', 10), // Máximo 10 archivos
  async (req, res) => {
    try {
      const resultados = [];
      const errores = [];
      
      for (const archivo of req.files) {
        try {
          // Simular req.file para cada archivo
          req.file = archivo;
          const resultado = await documentosController.subirDocumento(req, res);
          resultados.push(resultado);
        } catch (error) {
          errores.push({
            archivo: archivo.originalname,
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        data: {
          subidos: resultados.length,
          errores: errores.length,
          detalles: { resultados, errores }
        },
        message: `${resultados.length} archivos subidos, ${errores.length} errores`
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al subir múltiples archivos',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/documentos/tipos-permitidos
 * @desc Obtener lista de tipos de archivos permitidos
 * @access Autenticado
 */
router.get('/tipos-permitidos', (req, res) => {
  const tiposPermitidos = {
    documentos: [
      { tipo: 'application/pdf', extension: '.pdf', descripcion: 'Documento PDF' },
      { tipo: 'application/msword', extension: '.doc', descripcion: 'Microsoft Word 97-2003' },
      { tipo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: '.docx', descripcion: 'Microsoft Word' }
    ],
    hojas_calculo: [
      { tipo: 'application/vnd.ms-excel', extension: '.xls', descripcion: 'Microsoft Excel 97-2003' },
      { tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: '.xlsx', descripcion: 'Microsoft Excel' }
    ],
    presentaciones: [
      { tipo: 'application/vnd.ms-powerpoint', extension: '.ppt', descripcion: 'Microsoft PowerPoint 97-2003' },
      { tipo: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extension: '.pptx', descripcion: 'Microsoft PowerPoint' }
    ],
    imagenes: [
      { tipo: 'image/jpeg', extension: '.jpg', descripcion: 'Imagen JPEG' },
      { tipo: 'image/png', extension: '.png', descripcion: 'Imagen PNG' },
      { tipo: 'image/gif', extension: '.gif', descripcion: 'Imagen GIF' }
    ]
  };
  
  res.json({
    success: true,
    data: tiposPermitidos,
    message: 'Tipos de archivos permitidos obtenidos exitosamente'
  });
});

/**
 * @route GET /api/documentos/secciones-portafolio
 * @desc Obtener estructura de secciones del portafolio
 * @access Autenticado
 */
router.get('/secciones-portafolio', (req, res) => {
  const secciones = {
    presentacion_portafolio: {
      nombre: '0. PRESENTACIÓN DEL PORTAFOLIO',
      descripcion: 'Información general del docente aplicable a todos sus cursos',
      subcarpetas: {
        '0.1': { nombre: 'CARÁTULA', descripcion: 'Carátula del portafolio docente' },
        '0.2': { nombre: 'CARGA ACADÉMICA', descripcion: 'Resumen de carga académica del semestre' },
        '0.3': { nombre: 'FILOSOFÍA DOCENTE', descripcion: 'Filosofía y metodología de enseñanza' },
        '0.4': { nombre: 'CURRÍCULUM VITAE', descripcion: 'CV actualizado del docente' }
      },
      peso_evaluacion: 10,
      es_global: true
    },
    silabos: {
      nombre: '1. SILABOS',
      descripcion: 'Documentos de planificación académica oficial',
      subcarpetas: {
        '1.1': { nombre: 'SILABO UNSAAC', descripcion: 'Sílabo en formato oficial UNSAAC' },
        '1.2': { nombre: 'SILABO ICACIT', descripcion: 'Sílabo en formato ICACIT para acreditación' },
        '1.3': { nombre: 'REGISTRO DE ENTREGA DE SILABO', descripcion: 'Constancia de entrega de sílabo' }
      },
      peso_evaluacion: 15
    },
    avance_academico: {
      nombre: '2. AVANCE ACADÉMICO POR SESIONES',
      descripcion: 'Registro del desarrollo de cada sesión de clase',
      documentos_requeridos: [
        'Registro de avance por cada sesión',
        'Evidencias de desarrollo de contenidos'
      ],
      peso_evaluacion: 15
    },
    material_ensenanza: {
      nombre: '3. MATERIAL DE ENSEÑANZA',
      descripcion: 'Material didáctico organizado por unidades',
      subcarpetas: {
        '3.1': { nombre: 'PRIMERA UNIDAD', descripcion: 'Material didáctico de la primera unidad' },
        '3.2': { nombre: 'SEGUNDA UNIDAD', descripcion: 'Material didáctico de la segunda unidad' },
        '3.3': { nombre: 'TERCERA UNIDAD', descripcion: 'Material didáctico de la tercera unidad (solo cursos 4-5 créditos)', condicional: true }
      },
      peso_evaluacion: 20
    },
    asignaciones: {
      nombre: '4. ASIGNACIONES',
      descripcion: 'Tareas y trabajos asignados a los estudiantes',
      documentos_requeridos: [
        'Enunciados de tareas y trabajos',
        'Rúbricas de evaluación',
        'Cronograma de entregas'
      ],
      peso_evaluacion: 10
    },
    examenes: {
      nombre: '5. ENUNCIADO DE EXÁMENES Y SOLUCIÓN',
      descripcion: 'Evaluaciones aplicadas durante el semestre',
      subcarpetas: {
        '5.1': {
          nombre: 'EXAMEN DE ENTRADA',
          subcarpetas: {
            '5.1.1': { nombre: 'ENUNCIADO DE EXAMEN Y RESOLUCIÓN' },
            '5.1.2': { nombre: 'ASISTENCIA AL EXAMEN' },
            '5.1.3': { nombre: 'INFORME DE RESULTADOS' }
          }
        },
        '5.2': {
          nombre: 'PRIMER EXAMEN',
          subcarpetas: {
            '5.2.1': { nombre: 'ENUNCIADO Y RESOLUCIÓN DE EXAMEN' },
            '5.2.2': { nombre: 'ASISTENCIA AL EXAMEN' },
            '5.2.3': { nombre: 'INFORME DE RESULTADOS' }
          }
        },
        '5.3': {
          nombre: 'SEGUNDO EXAMEN',
          subcarpetas: {
            '5.3.1': { nombre: 'ENUNCIADO Y RESOLUCIÓN DE EXAMEN' },
            '5.3.2': { nombre: 'ASISTENCIA AL EXAMEN' },
            '5.3.3': { nombre: 'INFORME DE RESULTADOS' }
          }
        },
        '5.4': {
          nombre: 'TERCER EXAMEN',
          descripcion: 'Solo para cursos de 4-5 créditos',
          condicional: true,
          subcarpetas: {
            '5.4.1': { nombre: 'ENUNCIADO Y RESOLUCIÓN DE EXAMEN' },
            '5.4.2': { nombre: 'ASISTENCIA AL EXAMEN' },
            '5.4.3': { nombre: 'INFORME DE RESULTADOS' }
          }
        }
      },
      peso_evaluacion: 15
    },
    trabajos_estudiantiles: {
      nombre: '6. TRABAJOS ESTUDIANTILES',
      descripcion: 'Muestra representativa de trabajos por nivel de calificación',
      subcarpetas: {
        '6.1': { nombre: 'EXCELENTE (19–20)', descripcion: 'Trabajos con calificación excelente' },
        '6.2': { nombre: 'BUENO (16–18)', descripcion: 'Trabajos con calificación buena' },
        '6.3': { nombre: 'REGULAR (14–15)', descripcion: 'Trabajos con calificación regular' },
        '6.4': { nombre: 'MALO (10–13)', descripcion: 'Trabajos con calificación mala' },
        '6.5': { nombre: 'POBRE (0–07)', descripcion: 'Trabajos con calificación pobre' }
      },
      peso_evaluacion: 10
    },
    archivos_portafolio: {
      nombre: '7. ARCHIVOS PORTAFOLIO DOCENTE',
      descripcion: 'Documentos administrativos y de cierre',
      subcarpetas: {
        '7.1': { nombre: 'ASISTENCIA DE ALUMNOS', descripcion: 'Registro completo de asistencia' },
        '7.2': { nombre: 'REGISTRO DE NOTAS DEL CENTRO DE CÓMPUTO', descripcion: 'Notas oficiales del sistema' },
        '7.3': { nombre: 'CIERRE DE PORTAFOLIO', descripcion: 'Documentos de cierre y evaluación final' }
      },
      peso_evaluacion: 5
    }
  };
  
  res.json({
    success: true,
    data: secciones,
    message: 'Estructura de secciones obtenida exitosamente'
  });
});

/**
 * @route GET /api/documentos/estadisticas/:portafolioId
 * @desc Obtener estadísticas detalladas del portafolio
 * @access Docente (propio), Verificador (asignado), Admin
 */
router.get('/estadisticas/:portafolioId',
  verificarRol(['docente', 'verificador', 'administrador']),
  async (req, res) => {
    try {
      const { portafolioId } = req.params;
      const { ArchivoSubido } = require('../modelos');
      
      // Obtener estadísticas detalladas
      const estadisticas = await ArchivoSubido.findAll({
        where: { 
          portafolio_id: portafolioId,
          activo: true 
        },
        attributes: [
          'seccion_portafolio',
          'estado_verificacion',
          [require('sequelize').fn('COUNT', '*'), 'total'],
          [require('sequelize').fn('SUM', require('sequelize').col('tamano')), 'tamano_total']
        ],
        group: ['seccion_portafolio', 'estado_verificacion']
      });
      
      res.json({
        success: true,
        data: estadisticas,
        message: 'Estadísticas obtenidas exitosamente'
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
);

module.exports = router; 