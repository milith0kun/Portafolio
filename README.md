# 📋 SISTEMA PORTAFOLIO DOCENTE UNSAAC

## 🎯 ¿QUÉ ES ESTE SISTEMA?

**Google Drive para universidades** - Un sistema digital que reemplaza el caos de papeles físicos en los procesos de acreditación universitaria.

### **¿Por qué es necesario?**
Las universidades necesitan **acreditarse** (obtener certificaciones de calidad). Para esto, deben demostrar que sus profesores:
- Planifican bien sus clases
- Tienen materiales educativos de calidad  
- Evalúan correctamente a los estudiantes
- Documentan todo su trabajo académico

**Tradicionalmente** → Papeles físicos (caótico, lento, se pierde)
**Con este sistema** → Digital (organizado, rápido, seguro)

---

## 👥 ROLES DEL SISTEMA

### **👨‍🏫 DOCENTE**
**Funciones:**
- Organiza documentos por curso en portafolios digitales
- Sube archivos (PDF, DOCX, XLSX) a carpetas específicas
- Ve progreso de completitud de sus portafolios
- Recibe notificaciones de observaciones de verificadores
- Reemplaza archivos mientras estén en estado pendiente o rechazado

**Vista:** Solo sus cursos asignados por semestre

### **🔍 VERIFICADOR** 
**Funciones:**
- Revisa portafolios de docentes asignados
- Aprueba, rechaza o solicita correcciones de documentos
- Deja observaciones específicas por archivo
- Ve progreso general de cada docente
- Verifica múltiples archivos simultáneamente

**Vista:** Solo docentes asignados, acceso completo de lectura

### **👨‍💼 ADMINISTRADOR**
**Funciones:**
- Configura todo el sistema al inicio del semestre
- Carga datos masivos desde Excel (usuarios, cursos, asignaciones)
- Asigna verificadores a docentes
- Supervisa progreso general
- Genera reportes para autoridades
- Descarga portafolios completos

**Vista:** Estructura completa de todos los portafolios

---

## 🎭 SISTEMA MULTI-ROL

### **¿Cómo funciona?**
Una persona puede tener **varios roles simultáneamente**:

**Ejemplo:** Dr. Pedro es docente Y verificador
- **Por la mañana** → Actúa como docente (sube archivos)
- **Por la tarde** → Actúa como verificador (revisa otros docentes)
- **Cambia de rol** → Con un simple click en el sistema

### **Restricciones:**
- ✅ Docente puede ser verificador
- ✅ Verificador puede ser docente  
- ✅ Administrador puede ser docente
- ❌ Docente NUNCA puede ser administrador (por seguridad)

---

## 🏗️ ESTRUCTURA TÉCNICA

### **Arquitectura Profesional:**
```
portafolio-docente-unsaac/
├── 📁 BACKEND/                          # Servidor Node.js/Express
│   ├── servidor.js                      # Servidor principal
│   ├── package.json                     # Dependencias
│   ├── 📁 controladores/                # Lógica de negocio
│   ├── 📁 modelos/                      # Modelos de datos
│   ├── 📁 rutas/                        # APIs/Endpoints
│   ├── 📁 middleware/                   # Seguridad y validaciones
│   ├── 📁 servicios/                    # Procesamiento complejo
│   └── 📁 uploads/                      # Archivos subidos
├── 📁 FRONTEND/                         # Cliente web
│   ├── index.html                       # Página principal
│   ├── 📁 paginas/                      # Páginas HTML
│   ├── 📁 assets/                       # Recursos estáticos
│   │   ├── 📁 css/                      # Estilos CSS
│   │   ├── 📁 js/                       # JavaScript
│   │   └── 📁 imagenes/                 # Imágenes
│   └── 📁 componentes/                  # Componentes reutilizables
└── 📁 BASE-DE-DATOS/                    # Scripts SQL
    ├── 01-tablas-basicas.sql           # Tablas básicas
    ├── 02-tablas-completas.sql         # Tablas académicas
    ├── 03-tablas-archivos.sql          # Tablas archivos
    └── 04-optimizaciones.sql           # Optimizaciones
```

---

## 📦 ESTRUCTURA DE PORTAFOLIOS

### **Estructura Automática por Curso:**
```
📦 Portafolio del Docente – Semestre 2025-I
├── 📁 0. PRESENTACIÓN DEL PORTAFOLIO (compartida entre todos sus cursos)
│   ├── 0.1 CARÁTULA
│   ├── 0.2 CARGA ACADÉMICA
│   ├── 0.3 FILOSOFÍA DOCENTE
│   └── 0.4 CURRÍCULUM VITAE

├── 📚 Curso: [NOMBRE DEL CURSO] – [CÓDIGO]
│   ├── 📁 1. SILABOS
│   │   ├── 1.1 SILABO UNSAAC
│   │   ├── 1.2 SILABO ICACIT
│   │   └── 1.3 REGISTRO DE ENTREGA DE SILABO
│   ├── 📁 2. AVANCE ACADÉMICO POR SESIONES
│   ├── 📁 3. MATERIAL DE ENSEÑANZA
│   │   ├── 3.1 PRIMERA UNIDAD
│   │   ├── 3.2 SEGUNDA UNIDAD
│   │   └── 3.3 TERCERA UNIDAD ⭐ (solo si tiene 4–5 créditos)
│   ├── 📁 4. ASIGNACIONES
│   ├── 📁 5. ENUNCIADO DE EXÁMENES Y SOLUCIÓN
│   │   ├── 📁 5.1 EXAMEN DE ENTRADA
│   │   ├── 📁 5.2 PRIMER EXAMEN
│   │   ├── 📁 5.3 SEGUNDO EXAMEN
│   │   └── 📁 5.4 TERCER EXAMEN ⭐ (solo si tiene 4–5 créditos)
│   ├── 📁 6. TRABAJOS ESTUDIANTILES
│   │   ├── 6.1 EXCELENTE (19–20)
│   │   ├── 6.2 BUENO (16–18)
│   │   ├── 6.3 REGULAR (14–15)
│   │   ├── 6.4 MALO (10–13)
│   │   └── 6.5 POBRE (0–07)
│   └── 📁 7. ARCHIVOS PORTAFOLIO DOCENTE
       ├── 7.1 ASISTENCIA DE ALUMNOS
       ├── 7.2 REGISTRO DE NOTAS DEL CENTRO DE CÓMPUTO
       └── 7.3 CIERRE DE PORTAFOLIO
```

### **Estados de Verificación:**
- `pendiente`: Esperando verificación
- `en_revision`: Siendo revisado por verificador
- `observado`: Con observaciones, requiere corrección
- `aprobado`: Sección aprobada
- `rechazado`: Sección rechazada (requiere resubmisión)

---

## 🚀 PLAN DE IMPLEMENTACIÓN - 4 ETAPAS

### **📅 ETAPA 1: FUNDAMENTOS (2 semanas)**
**Objetivo:** Sistema básico de autenticación y navegación multi-rol

**Archivos a crear (19 total):**
```
BACKEND/ (8 archivos)
├── servidor.js, package.json, .env
├── controladores/autenticacion.js
├── modelos/Usuario.js
├── rutas/auth.js
├── middleware/verificar-jwt.js
└── uploads/ (carpeta)

FRONTEND/ (10 archivos)
├── index.html
├── paginas/tablero-*.html (3 dashboards)
├── paginas/selector-rol.html
├── assets/css/principal.css
├── assets/js/nucleo.js
├── assets/js/autenticacion.js
└── componentes/ (cabecera.html, pie-pagina.html)

BASE-DE-DATOS/ (1 archivo)
└── 01-tablas-basicas.sql
```

**Criterios de éxito:**
- ✅ 3 tipos de usuario pueden entrar
- ✅ Login y cambio de rol funcionan
- ✅ Cada rol ve su interfaz correcta
- ✅ Navegación básica sin errores

### **📅 ETAPA 2: ADMINISTRACIÓN COMPLETA (3 semanas)**
**Objetivo:** Carga masiva de Excel y gestión del sistema

**Archivos adicionales (+30 = 49 total):**
```
BACKEND/ (+16 archivos)
├── controladores/ (usuarios.js, excel.js, ciclos.js, etc.)
├── modelos/ (Ciclo.js, Asignatura.js, Portafolio.js, etc.)
├── rutas/ (usuarios.js, excel.js, ciclos.js, reportes.js)
└── servicios/ (procesador-excel.js, generador-reportes.js, etc.)

FRONTEND/ (+13 archivos)
├── paginas/ (gestion-usuarios.html, carga-excel.html, etc.)
├── assets/css/ (formularios.css, tablas.css, reportes.css)
└── assets/js/ (gestion-usuarios.js, procesador-excel.js, etc.)

BASE-DE-DATOS/ (+1 archivo)
└── 02-tablas-completas.sql
```

**Criterios de éxito:**
- ✅ Admin puede cargar Excel de 1000 registros
- ✅ Se crean usuarios y portafolios automáticamente
- ✅ Asignaciones funcionan correctamente
- ✅ Reportes se generan en menos de 10 segundos

### **📅 ETAPA 3: GESTIÓN DE ARCHIVOS (2 semanas)**
**Objetivo:** Subida y verificación de documentos

**Archivos adicionales (+21 = 70 total):**
```
BACKEND/ (+12 archivos)
├── controladores/ (archivos.js, verificacion.js)
├── modelos/ (Archivo.js, Observacion.js)
├── rutas/ (archivos.js, verificacion.js)
├── servicios/ (subir-archivos.js, validar-archivos.js, etc.)
└── middleware/ (upload-multer.js, validar-archivo.js, etc.)

FRONTEND/ (+8 archivos)
├── paginas/ (mis-portafolios.html, subir-archivos.html, etc.)
├── assets/css/archivos.css
└── assets/js/ (subir-archivos.js, lista-archivos.js, verificacion.js)

BASE-DE-DATOS/ (+1 archivo)
└── 03-tablas-archivos.sql
```

**Criterios de éxito:**
- ✅ Docente sube archivo de 20MB en menos de 1 minuto
- ✅ Rechaza archivos de formato incorrecto
- ✅ Verificador ve solo archivos asignados
- ✅ Descarga funciona sin errores

### **📅 ETAPA 4: EXPLORADOR AVANZADO (3 semanas)**
**Objetivo:** Interfaz tipo Windows Explorer con drag & drop

**Archivos adicionales (+18 = 88 total):**
```
BACKEND/ (+8 archivos)
├── controladores/ (explorador.js, busqueda.js)
├── servicios/ (auto-distribucion.js, generador-zip.js, etc.)
└── rutas/ (explorador.js, busqueda.js)

FRONTEND/ (+9 archivos)
├── paginas/explorador-completo.html
├── assets/css/ (explorador-windows.css, arrastrar-soltar.css, etc.)
└── assets/js/ (explorador-principal.js, arrastrar-soltar.js, etc.)

BASE-DE-DATOS/ (+1 archivo)
└── 04-optimizaciones.sql
```

**Criterios de éxito:**
- ✅ Interfaz se ve exactamente como Windows Explorer
- ✅ Drag & drop de 10 archivos simultáneos funciona
- ✅ Auto-distribución acierta 80% de las veces
- ✅ Búsqueda encuentra archivos en menos de 2 segundos

---

## 🔄 FLUJO DE TRABAJO COMPLETO

### **FASE 1: PREPARACIÓN (Solo Administrador)**
1. **Configurar semestre** → Crear "Ciclo 2024-I"
2. **Cargar Excel** → Procesar 8 archivos en orden específico
3. **Asignar verificadores** → Manual o automático
4. **Generar portafolios** → Estructura automática por curso
5. **Activar sistema** → Enviar notificaciones a todos

### **FASE 2: TRABAJO ACTIVO (Todos los usuarios)**
**Docente:**
- Entra al sistema → Ve cursos asignados
- Selecciona curso → Ve estructura de carpetas
- Sube archivos → Drag & drop o selección tradicional
- Ve progreso → "Curso 80% completo"

**Verificador:**
- Entra al sistema → Ve docentes asignados
- Revisa documentos → Abre archivos para evaluar
- Toma decisión → Aprobar/rechazar/observar
- Escribe observaciones → Docente recibe notificación

**Administrador:**
- Dashboard general → Ve progreso de todos
- Identifica problemas → "5 docentes atrasados"
- Interviene si es necesario → Envía recordatorios
- Genera reportes → Para autoridades

### **FASE 3: CIERRE (Solo Administrador)**
- Sistema identifica qué falta
- Envía alertas finales
- Cierra ciclo oficialmente
- Genera reportes finales
- Prepara siguiente ciclo

---

## 🖥️ INTERFAZ PRINCIPAL

### **Diseño tipo Windows Explorer:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [BREADCRUMB] Inicio > Mis Portafolios > Algoritmos > Syllabus   │
├──────────────┬──────────────────────────┬─────────────────────────┤
│              │                          │                         │
│   ÁRBOL DE   │     VISTA DE ARCHIVOS    │   PANEL DE CARGA       │
│   CARPETAS   │                          │                         │
│              │  ┌─────┬─────┬─────┐    │  ┌─────────────────────┐ │
│ 📁 Curso 1   │  │ 📄  │ 📄  │ 📄  │    │  │ Arrastra archivos   │ │
│ 📁 Curso 2   │  │Doc1 │Doc2 │Doc3 │    │  │ aquí o haz clic     │ │
│ 📁 Curso 3   │  └─────┴─────┴─────┘    │  │                     │ │
│              │                          │  │  [Seleccionar]      │ │
│              │  [Lista] [Grid] [Detalles] │  └─────────────────────┘ │
│              │                          │                         │
│              │  Filtros: [Tipo] [Estado] │ Distribución:           │
│              │  Buscar: [_____________] │ ✅ Automática            │
└──────────────┴──────────────────────────┴─────────────────────────┘
```

### **Características:**
- **Panel izquierdo:** Árbol de carpetas con indicadores de estado
- **Panel central:** Vista de archivos (lista, cuadrícula, detalles)
- **Panel derecho:** Área de subida con drag & drop
- **Navegación:** Breadcrumb tipo "migas de pan"
- **Búsqueda:** Filtros avanzados por tipo, estado, fecha

---

## 🔧 SISTEMA DE VERIFICACIÓN

### **Backend Implementado:**
- **Controlador:** `verificacionesController.js` con funciones completas
- **Rutas:** `/api/verificaciones/*` con endpoints seguros
- **Seguridad:** JWT + validación de roles + permisos por verificador
- **Transacciones:** Base de datos para consistencia

### **Frontend Implementado:**
- **Página:** `pendientes.html` con interfaz completa
- **JavaScript:** `pendientes.js` con clase `GestorDocumentosPendientes`
- **CSS:** Diseño moderno y responsivo
- **Funcionalidades:** Verificación individual y masiva

### **Estados de Verificación:**
- ✅ **Aprobado:** Documento cumple requisitos
- ❌ **Rechazado:** Falta información importante
- ⚠️ **Observado:** Está bien pero mejorar X
- 🔄 **Pendiente:** Esperando verificación

---

## 🧭 SISTEMA DE NAVEGACIÓN UNIFICADO

### **Características:**
- **Autenticación automática** en cada página
- **Navegación dinámica** según rol del usuario
- **Multi-rol** con cambio sin perder sesión
- **Responsive** para móviles y tablets

### **Archivos principales:**
- `navegacion.js` - Núcleo del sistema
- `admin-auth.js` - Autenticación específica
- `navegacion-unificada.css` - Estilos
- `nucleo.js` - Funciones base
- `configuracion.js` - Configuración global

### **Funciones clave:**
- `inicializarNavegacion()` - Inicializa sistema completo
- `navegarAPagina(pagina)` - Navegación inteligente
- `verificarAutenticacion(roles)` - Validación de permisos
- `actualizarInfoUsuario()` - Actualiza interfaz

---

## 📊 CARGA MASIVA DE EXCEL

### **8 Archivos Excel en Orden Específico:**
1. `01_usuarios_masivos.xlsx` - Lista de docentes y verificadores
2. `02_carreras_completas.xlsx` - Carreras y programas
3. `03_asignaturas_completas.xlsx` - Asignaturas por carrera
4. `04_carga_academica.xlsx` - Qué docente enseña qué curso
5. `05_verificaciones.xlsx` - Asignaciones verificador-docente
6. `06_estructura_portafolio.xlsx` - Estructura base de carpetas
7. `07_carga_academica.xlsx` - Datos específicos de cursos
8. `08_asignacion_verificadores.xlsx` - Asignaciones finales

### **Lógica de Auto-Creación:**
```
PARA CADA fila en carga_academica:
    1. Crear portafolio principal
    2. Leer estructura_portafolio_base ordenada
    3. Crear carpetas según nivel y orden
    4. LÓGICA ESPECIAL para créditos:
       - Si CREDITOS >= 4: incluir "3.3 TERCERA UNIDAD" y "5.4 TERCER EXAMEN"
       - Si CREDITOS < 4: omitir esas carpetas
    5. Crear carpeta "0. PRESENTACIÓN" (común a todos los cursos)
    6. Asignar permisos según roles
```

### **Validaciones Críticas:**
- Emails únicos en todo el sistema
- Códigos de docente únicos
- Referencias válidas entre tablas
- Formatos JSON válidos
- Rollback completo si falla cualquier archivo

---

## 🛠️ DESARROLLO Y FLUJO DE TRABAJO

### **Comandos Git Básicos:**
```bash
# Crear rama para nueva característica
git checkout -b feature/nombre-caracteristica

# Trabajar y hacer commit
git add .
git commit -m "tipo: descripción clara"

# Subir cambios
git push -u origin feature/nombre-caracteristica

# Sincronizar con main
git fetch origin
git merge origin/main
```

### **Buenas Prácticas:**
- Commits pequeños y atómicos
- Mensajes descriptivos (`feat:`, `fix:`, `docs:`)
- Nunca trabajar directamente en `main`
- Mantener rama actualizada
- Revisar cambios antes de commit

### **Estructura de Desarrollo:**
- **Backend:** Node.js/Express con arquitectura MVC
- **Frontend:** HTML/CSS/JS vanilla (sin frameworks)
- **Base de datos:** MySQL con scripts evolutivos
- **Separación:** Backend, Frontend y BD independientes

---

## 📈 CRECIMIENTO CONTROLADO

### **Evolución de Archivos:**
```
ETAPA 1: 19 archivos básicos
├── BACKEND: 8 archivos (servidor, auth básico)
├── FRONTEND: 10 archivos (páginas básicas)  
└── BASE-DE-DATOS: 1 archivo (tablas usuarios)

ETAPA 2: +30 archivos = 49 archivos
├── BACKEND: +16 archivos (administración completa)
├── FRONTEND: +13 archivos (interfaces admin)
└── BASE-DE-DATOS: +1 archivo (tablas académicas)

ETAPA 3: +21 archivos = 70 archivos  
├── BACKEND: +12 archivos (gestión archivos)
├── FRONTEND: +8 archivos (interfaces archivos)
└── BASE-DE-DATOS: +1 archivo (tablas archivos)

ETAPA 4: +18 archivos = 88 archivos FINALES
├── BACKEND: +8 archivos (explorador avanzado)
├── FRONTEND: +9 archivos (interfaz Windows)
└── BASE-DE-DATOS: +1 archivo (optimizaciones)
```

### **Distribución Final:**
- **BACKEND:** 44 archivos (servidor, controladores, modelos, rutas, etc.)
- **FRONTEND:** 40 archivos (páginas, CSS, JS, componentes)
- **BASE-DE-DATOS:** 4 scripts SQL evolutivos

---

## 🎯 CRITERIOS DE ÉXITO

### **Etapa 1 Lista:**
- ✅ 3 tipos de usuario pueden entrar
- ✅ Login y cambio de rol funcionan
- ✅ Cada rol ve su interfaz correcta
- ✅ Navegación básica sin errores

### **Etapa 2 Lista:**
- ✅ Admin puede cargar Excel de 1000 registros
- ✅ Se crean usuarios y portafolios automáticamente
- ✅ Asignaciones funcionan correctamente
- ✅ Reportes se generan en menos de 10 segundos

### **Etapa 3 Lista:**
- ✅ Docente sube archivo de 20MB en menos de 1 minuto
- ✅ Rechaza archivos de formato incorrecto
- ✅ Verificador ve solo archivos asignados
- ✅ Descarga funciona sin errores

### **Etapa 4 Lista:**
- ✅ Interfaz se ve exactamente como Windows Explorer
- ✅ Drag & drop de 10 archivos simultáneos funciona
- ✅ Auto-distribución acierta 80% de las veces
- ✅ Búsqueda encuentra archivos en menos de 2 segundos

---

## 🚀 PRÓXIMOS PASOS

### **Inmediato:**
1. **Empezar Etapa 1** - Sistema básico funcional en 2 semanas
2. **Validar arquitectura** - Probar separación Backend/Frontend/BD
3. **Obtener feedback** - Usuarios reales prueban funcionalidad básica

### **Mediano plazo:**
1. **Completar Etapa 2** - Administración completa
2. **Implementar Etapa 3** - Gestión de archivos
3. **Finalizar Etapa 4** - Explorador avanzado

### **Largo plazo:**
1. **Optimización** - Performance y escalabilidad
2. **Nuevas funcionalidades** - Basadas en feedback real
3. **Deployment** - Producción en servidor universitario

---

## 📞 CONTACTO Y SOPORTE

**Este sistema transformará la gestión de portafolios académicos en UNSAAC, facilitando los procesos de acreditación con una arquitectura profesional, escalable y mantenible.**

**Estado actual:** Sistema en desarrollo con arquitectura sólida y plan de implementación detallado.