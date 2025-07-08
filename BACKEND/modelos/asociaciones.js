/**
 * Archivo de asociaciones entre modelos
 * Define las relaciones entre los diferentes modelos de la aplicación
 */

const Usuario = require('./Usuario');
const UsuarioRol = require('./UsuarioRol');
const CicloAcademico = require('./CicloAcademico');
const EstadoSistema = require('./EstadoSistema');
const Semestre = require('./Semestre');
const Carrera = require('./Carrera');
const CodigoInstitucional = require('./CodigoInstitucional');
const Asignatura = require('./Asignatura');
const DocenteAsignatura = require('./DocenteAsignatura');
const Actividad = require('./Actividad');
const Portafolio = require('./Portafolio');
const Estructura = require('./Estructura');
const Notificacion = require('./Notificacion');
const ArchivoSubido = require('./ArchivoSubido');
const Observacion = require('./Observacion');
const RespuestaObservacion = require('./RespuestaObservacion');
const VerificadorDocente = require('./VerificadorDocente');
const ArchivoCargaMasiva = require('./ArchivoCargaMasiva');

// Asociaciones de Usuario y Roles
Usuario.hasMany(UsuarioRol, { foreignKey: 'usuario_id', as: 'roles' });
UsuarioRol.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
UsuarioRol.belongsTo(Usuario, { foreignKey: 'asignado_por', as: 'asignador' });

// Asociaciones de Actividad
Actividad.belongsTo(Usuario, { 
    foreignKey: 'usuario_id', 
    as: 'usuario',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});
Usuario.hasMany(Actividad, { 
    foreignKey: 'usuario_id', 
    as: 'actividades',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});

// Asociaciones de CicloAcademico
CicloAcademico.belongsTo(Usuario, { foreignKey: 'creado_por', as: 'creador' });
CicloAcademico.belongsTo(Usuario, { foreignKey: 'cerrado_por', as: 'cerrador' });

// Asociaciones de Semestre
Semestre.belongsTo(CicloAcademico, { foreignKey: 'ciclo_id', as: 'ciclo' });
CicloAcademico.hasMany(Semestre, { foreignKey: 'ciclo_id', as: 'semestres' });
 
// Asociaciones de Asignatura
Asignatura.belongsTo(CicloAcademico, { foreignKey: 'ciclo_id', as: 'ciclo' });
CicloAcademico.hasMany(Asignatura, { foreignKey: 'ciclo_id', as: 'asignaturas' });

// Asociaciones de Asignatura con Carrera - COMENTADO porque no existe carrera_id
// La tabla asignaturas tiene 'carrera' como string, no como foreign key
// Asignatura.belongsTo(Carrera, { foreignKey: 'carrera_id', as: 'carrera_info' });
// Carrera.hasMany(Asignatura, { foreignKey: 'carrera_id', as: 'asignaturas' });

// Asociaciones de DocenteAsignatura (docentes_asignaturas)
DocenteAsignatura.belongsTo(Usuario, { foreignKey: 'docente_id', as: 'docente' });
Usuario.hasMany(DocenteAsignatura, { foreignKey: 'docente_id', as: 'asignaciones_docente' });

DocenteAsignatura.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });
Asignatura.hasMany(DocenteAsignatura, { foreignKey: 'asignatura_id', as: 'asignaciones_docente' });

DocenteAsignatura.belongsTo(CicloAcademico, { foreignKey: 'ciclo_id', as: 'ciclo' });
CicloAcademico.hasMany(DocenteAsignatura, { foreignKey: 'ciclo_id', as: 'asignaciones_docente' });

DocenteAsignatura.belongsTo(Usuario, { foreignKey: 'asignado_por', as: 'asignador' });

// Asociaciones de VerificadorDocente
VerificadorDocente.belongsTo(Usuario, { foreignKey: 'verificador_id', as: 'verificador' });
VerificadorDocente.belongsTo(Usuario, { foreignKey: 'docente_id', as: 'docente' });
VerificadorDocente.belongsTo(CicloAcademico, { foreignKey: 'ciclo_id', as: 'ciclo' });
VerificadorDocente.belongsTo(Usuario, { foreignKey: 'asignado_por', as: 'asignador' });
VerificadorDocente.belongsTo(Portafolio, { foreignKey: 'portafolio_id', as: 'portafolio' });

Usuario.hasMany(VerificadorDocente, { foreignKey: 'verificador_id', as: 'docentes_asignados' });
Usuario.hasMany(VerificadorDocente, { foreignKey: 'docente_id', as: 'verificadores_asignados' });
Portafolio.hasMany(VerificadorDocente, { foreignKey: 'portafolio_id', as: 'verificadores' });

// Asociaciones de Estructura
Estructura.belongsTo(Estructura, { foreignKey: 'carpeta_padre_id', as: 'padre' });
Estructura.hasMany(Estructura, { foreignKey: 'carpeta_padre_id', as: 'subcarpetas' });

// Asociaciones de Portafolio
Portafolio.belongsTo(Usuario, { foreignKey: 'docente_id', as: 'docente' });
Usuario.hasMany(Portafolio, { foreignKey: 'docente_id', as: 'portafolios' });

Portafolio.belongsTo(Asignatura, { foreignKey: 'asignatura_id', as: 'asignatura' });
Asignatura.hasMany(Portafolio, { foreignKey: 'asignatura_id', as: 'portafolios' });

Portafolio.belongsTo(Semestre, { foreignKey: 'semestre_id', as: 'semestre' });
Semestre.hasMany(Portafolio, { foreignKey: 'semestre_id', as: 'portafolios' });

Portafolio.belongsTo(CicloAcademico, { foreignKey: 'ciclo_id', as: 'ciclo' });
CicloAcademico.hasMany(Portafolio, { foreignKey: 'ciclo_id', as: 'portafolios' });

Portafolio.belongsTo(Estructura, { foreignKey: 'estructura_id', as: 'estructura_base' });
Estructura.hasMany(Portafolio, { foreignKey: 'estructura_id', as: 'portafolios' });

Portafolio.belongsTo(Portafolio, { foreignKey: 'carpeta_padre_id', as: 'carpeta_padre' });
Portafolio.hasMany(Portafolio, { foreignKey: 'carpeta_padre_id', as: 'subcarpetas' });

Portafolio.belongsTo(DocenteAsignatura, { foreignKey: 'asignacion_id', as: 'asignacion' });
DocenteAsignatura.hasMany(Portafolio, { foreignKey: 'asignacion_id', as: 'portafolios' });

// ============================================
// ASOCIACIONES DE ARCHIVOS SUBIDOS
// ============================================

/**
 * Un archivo subido pertenece a un portafolio
 * Un portafolio puede tener muchos archivos subidos
 */
ArchivoSubido.belongsTo(Portafolio, { 
    foreignKey: 'portafolio_id', 
    as: 'portafolio',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
Portafolio.hasMany(ArchivoSubido, { 
    foreignKey: 'portafolio_id', 
    as: 'archivos',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

/**
 * Un archivo subido pertenece a un usuario que lo subió
 * Un usuario puede haber subido muchos archivos
 */
ArchivoSubido.belongsTo(Usuario, { 
    foreignKey: 'subido_por', 
    as: 'usuario',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});
Usuario.hasMany(ArchivoSubido, { 
    foreignKey: 'subido_por', 
    as: 'archivos_subidos',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});

/**
 * Un archivo puede tener una estructura asociada (opcional)
 * Una estructura puede estar en muchos archivos
 */
ArchivoSubido.belongsTo(Estructura, { 
    foreignKey: 'estructura_id', 
    as: 'estructura',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});
Estructura.hasMany(ArchivoSubido, { 
    foreignKey: 'estructura_id', 
    as: 'archivos',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});

/**
 * Un archivo puede ser verificado por un usuario
 * Un usuario puede verificar muchos archivos
 */
ArchivoSubido.belongsTo(Usuario, { 
    foreignKey: 'verificado_por', 
    as: 'verificador',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});
Usuario.hasMany(ArchivoSubido, { 
    foreignKey: 'verificado_por', 
    as: 'archivos_verificados',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});

// ============================================
// ASOCIACIONES DE OBSERVACIONES
// ============================================

/**
 * Una observación pertenece a un archivo subido
 * Un archivo puede tener muchas observaciones
 */
Observacion.belongsTo(ArchivoSubido, { 
    foreignKey: 'archivo_id', 
    as: 'archivo',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
ArchivoSubido.hasMany(Observacion, { 
    foreignKey: 'archivo_id', 
    as: 'observaciones',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

/**
 * Una observación es realizada por un verificador (usuario con rol de verificador)
 * Un verificador puede realizar muchas observaciones
 */
Observacion.belongsTo(Usuario, { 
    foreignKey: 'verificador_id', 
    as: 'verificador',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});
Usuario.hasMany(Observacion, { 
    foreignKey: 'verificador_id', 
    as: 'observaciones_realizadas',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});

/**
 * Una observación puede ser resuelta por un usuario
 * Un usuario puede resolver muchas observaciones
 */
Observacion.belongsTo(Usuario, { 
    foreignKey: 'resuelto_por', 
    as: 'resuelto_por_usuario',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});
Usuario.hasMany(Observacion, { 
    foreignKey: 'resuelto_por', 
    as: 'observaciones_resueltas',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});

// ============================================
// ASOCIACIONES DE RESPUESTAS A OBSERVACIONES
// ============================================

/**
 * Una respuesta pertenece a una observación
 * Una observación puede tener muchas respuestas
 */
RespuestaObservacion.belongsTo(Observacion, { 
    foreignKey: 'observacion_id', 
    as: 'observacion',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
Observacion.hasMany(RespuestaObservacion, { 
    foreignKey: 'observacion_id', 
    as: 'respuestas',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

/**
 * Una respuesta es realizada por un usuario
 * Un usuario puede realizar muchas respuestas
 */
RespuestaObservacion.belongsTo(Usuario, { 
    foreignKey: 'usuario_id', 
    as: 'usuario',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});
Usuario.hasMany(RespuestaObservacion, { 
    foreignKey: 'usuario_id', 
    as: 'respuestas_observaciones',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});

/**
 * Una respuesta puede tener un adjunto (archivo subido)
 * Un archivo puede ser adjunto en muchas respuestas
 */
RespuestaObservacion.belongsTo(ArchivoSubido, { 
    foreignKey: 'adjunto_id', 
    as: 'adjunto',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});
ArchivoSubido.hasMany(RespuestaObservacion, { 
    foreignKey: 'adjunto_id', 
    as: 'respuestas_adjuntas',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});

// ============================================
// ASOCIACIONES DE NOTIFICACIONES
// ============================================

/**
 * Una notificación pertenece a un usuario
 * Un usuario puede tener muchas notificaciones
 */
Notificacion.belongsTo(Usuario, { 
    foreignKey: 'usuario_id', 
    as: 'usuario',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
Usuario.hasMany(Notificacion, { 
    foreignKey: 'usuario_id', 
    as: 'notificaciones',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

// ============================================
// ASOCIACIONES DE ESTADOS DEL SISTEMA
// ============================================

/**
 * Un estado del sistema pertenece a un ciclo académico
 * Un ciclo puede tener muchos estados del sistema
 */
EstadoSistema.belongsTo(CicloAcademico, { 
    foreignKey: 'ciclo_id', 
    as: 'ciclo',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
CicloAcademico.hasMany(EstadoSistema, { 
    foreignKey: 'ciclo_id', 
    as: 'estados_sistema',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

/**
 * Un estado del sistema es actualizado por un usuario
 * Un usuario puede actualizar muchos estados del sistema
 */
EstadoSistema.belongsTo(Usuario, { 
    foreignKey: 'actualizado_por', 
    as: 'actualizador',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});
Usuario.hasMany(EstadoSistema, { 
    foreignKey: 'actualizado_por', 
    as: 'estados_actualizados',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});

// ============================================
// ASOCIACIONES DE ARCHIVOS DE CARGA MASIVA
// ============================================

/**
 * Un archivo de carga masiva pertenece a un ciclo académico
 * Un ciclo puede tener muchos archivos de carga masiva
 */
ArchivoCargaMasiva.belongsTo(CicloAcademico, { 
    foreignKey: 'ciclo_id', 
    as: 'ciclo',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});
CicloAcademico.hasMany(ArchivoCargaMasiva, { 
    foreignKey: 'ciclo_id', 
    as: 'archivos_carga_masiva',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

/**
 * Un archivo de carga masiva es subido por un usuario (administrador)
 * Un usuario puede subir muchos archivos de carga masiva
 */
ArchivoCargaMasiva.belongsTo(Usuario, { 
    foreignKey: 'subido_por', 
    as: 'subidoPor',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});
Usuario.hasMany(ArchivoCargaMasiva, { 
    foreignKey: 'subido_por', 
    as: 'archivos_carga_subidos',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});

module.exports = {
  Usuario,
  UsuarioRol,
  CicloAcademico,
  EstadoSistema,
  Semestre,
    Carrera,
    CodigoInstitucional,
  Asignatura,
    DocenteAsignatura,
  Portafolio,
  Estructura,
  Notificacion,
  ArchivoSubido,
  Observacion,
  RespuestaObservacion,
  VerificadorDocente,
  ArchivoCargaMasiva
};
