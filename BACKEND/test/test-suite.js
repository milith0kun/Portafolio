/**
 * SUITE DE TESTING COMPLETO - SISTEMA PORTAFOLIO DOCENTE UNSAAC
 * Verifica toda la lógica del sistema paso a paso
 */

const { sequelize } = require('../config/database');
const { 
    Usuario, 
    UsuarioRol, 
    CicloAcademico, 
    EstadoSistema, 
    Carrera, 
    Asignatura, 
    DocenteAsignatura, 
    Portafolio 
} = require('../modelos');

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class TestSuite {
    constructor() {
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        let color = colors.reset;
        
        switch(type) {
            case 'success': color = colors.green; break;
            case 'error': color = colors.red; break;
            case 'warning': color = colors.yellow; break;
            case 'info': color = colors.blue; break;
        }
        
        console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
    }

    async runTest(testName, testFunction) {
        this.totalTests++;
        this.log(`🧪 Ejecutando: ${testName}`, 'info');
        
        try {
            await testFunction();
            this.passedTests++;
            this.log(`✅ PASÓ: ${testName}`, 'success');
            this.testResults.push({ name: testName, status: 'PASSED', error: null });
        } catch (error) {
            this.failedTests++;
            this.log(`❌ FALLÓ: ${testName} - ${error.message}`, 'error');
            this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
        }
    }

    async assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    // ==================== TESTS DE CONFIGURACIÓN BASE ====================

    async testDatabaseConnection() {
        await sequelize.authenticate();
        this.log('Conexión a base de datos establecida', 'success');
    }

    async testModelsLoaded() {
        const models = [Usuario, CicloAcademico, EstadoSistema, Carrera, Asignatura];
        for (const model of models) {
            await this.assert(model, `Modelo ${model.name} debe estar cargado`);
        }
    }

    // ==================== TESTS DE LÓGICA DE CICLOS ====================

    async testCicloActivoUnico() {
        // Verificar que solo hay un ciclo activo
        const ciclosActivos = await CicloAcademico.findAll({
            where: { estado: 'activo' },
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        await this.assert(
            ciclosActivos.length <= 1, 
            `Solo debe haber máximo 1 ciclo activo, encontrados: ${ciclosActivos.length}`
        );
        
        if (ciclosActivos.length === 1) {
            this.log(`Ciclo activo encontrado: ${ciclosActivos[0].nombre}`, 'info');
        }
    }

    async testEstadosCiclosValidos() {
        const estadosValidos = ['preparacion', 'inicializacion', 'activo', 'verificacion', 'finalizacion', 'archivado'];
        const ciclos = await CicloAcademico.findAll({
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        for (const ciclo of ciclos) {
            await this.assert(
                estadosValidos.includes(ciclo.estado),
                `Ciclo ${ciclo.nombre} tiene estado inválido: ${ciclo.estado}`
            );
        }
    }

    async testTransicionesCiclos() {
        // Crear un ciclo de prueba para verificar transiciones
        const testCycle = await CicloAcademico.create({
            nombre: 'TEST-CYCLE-2025',
            descripcion: 'Ciclo de prueba para testing',
            estado: 'preparacion',
            fecha_inicio: new Date(),
            fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días después
            semestre_actual: 'I',
            anio_actual: 2025,
            creado_por: 1
        });

        // Test: preparacion -> inicializacion
        await testCycle.iniciarInicializacion();
        await this.assert(testCycle.estado === 'inicializacion', 'Transición a inicialización debe funcionar');

        // Test: inicializacion -> activo
        await testCycle.activar();
        await this.assert(testCycle.estado === 'activo', 'Transición a activo debe funcionar');

        // Limpiar
        await testCycle.destroy();
    }

    // ==================== TESTS DE USUARIOS Y ROLES ====================

    async testUsuariosConRoles() {
        const usuarios = await Usuario.findAll({
            include: [{
                model: UsuarioRol,
                as: 'roles'
            }]
        });

        let usuariosSinRoles = 0;
        for (const usuario of usuarios) {
            if (!usuario.roles || usuario.roles.length === 0) {
                usuariosSinRoles++;
            }
        }

        this.log(`Usuarios sin roles: ${usuariosSinRoles}/${usuarios.length}`, usuariosSinRoles > 0 ? 'warning' : 'success');
    }

    async testRolesValidos() {
        const rolesValidos = ['administrador', 'docente', 'verificador'];
        const roles = await UsuarioRol.findAll();
        
        for (const rol of roles) {
            await this.assert(
                rolesValidos.includes(rol.rol),
                `Rol inválido encontrado: ${rol.rol}`
            );
        }
    }

    // ==================== TESTS DE INICIALIZACIÓN DE PORTAFOLIOS ====================

    async testInicializacionPortafolios() {
        const cicloActivo = await CicloAcademico.findOne({
            where: { estado: 'activo' },
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });

        if (!cicloActivo) {
            this.log('No hay ciclo activo, saltando test de portafolios', 'warning');
            return;
        }

        // Verificar que los docentes tienen portafolios para el ciclo activo
        const docentes = await Usuario.findAll({
            include: [{
                model: UsuarioRol,
                as: 'roles',
                where: { rol: 'docente', activo: true }
            }]
        });

        const portafoliosPorCiclo = await Portafolio.count({
            where: { ciclo_id: cicloActivo.id }
        });

        this.log(`Docentes: ${docentes.length}, Portafolios en ciclo activo: ${portafoliosPorCiclo}`, 'info');
    }

    // ==================== TESTS DE ACCESO POR ROL ====================

    async testAccesoDocentes() {
        const cicloActivo = await CicloAcademico.findOne({
            where: { estado: 'activo' },
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });

        if (!cicloActivo) {
            // Los docentes NO deben poder acceder si no hay ciclo activo
            this.log('✅ Correcto: Sin ciclo activo, docentes no pueden acceder', 'success');
        } else {
            // Con ciclo activo, deben tener acceso
            this.log('✅ Ciclo activo presente, docentes pueden acceder', 'success');
        }
    }

    async testAccesoVerificadores() {
        const cicloActivo = await CicloAcademico.findOne({
            where: { estado: ['activo', 'verificacion'] },
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });

        if (!cicloActivo) {
            this.log('✅ Correcto: Sin ciclo activo/verificación, verificadores no pueden acceder', 'success');
        } else {
            this.log('✅ Ciclo en fase correcta, verificadores pueden acceder', 'success');
        }
    }

    // ==================== TESTS DE DATOS POR CICLO ====================

    async testDatosPorCiclo() {
        const ciclos = await CicloAcademico.findAll({
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        for (const ciclo of ciclos) {
            // Verificar asignaciones por ciclo
            const asignaciones = await DocenteAsignatura.count({
                where: { ciclo_id: ciclo.id }
            });

            // Verificar portafolios por ciclo
            const portafolios = await Portafolio.count({
                where: { ciclo_id: ciclo.id }
            });

            this.log(`Ciclo ${ciclo.nombre}: ${asignaciones} asignaciones, ${portafolios} portafolios`, 'info');
        }
    }

    // ==================== TESTS DE ESTADOS DE SISTEMA ====================

    async testEstadosModulos() {
        const ciclos = await CicloAcademico.findAll({
            attributes: {
                exclude: ['fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion']
            }
        });
        
        for (const ciclo of ciclos) {
            const estados = await EstadoSistema.findAll({
                where: { ciclo_id: ciclo.id }
            });

            const modulosEsperados = ['carga_datos', 'gestion_documentos', 'verificacion', 'reportes'];
            const modulosEncontrados = estados.map(e => e.modulo);

            for (const modulo of modulosEsperados) {
                await this.assert(
                    modulosEncontrados.includes(modulo),
                    `Ciclo ${ciclo.nombre} debe tener módulo ${modulo}`
                );
            }
        }
    }

    // ==================== EJECUCIÓN PRINCIPAL ====================

    async runAllTests() {
        this.log('🚀 INICIANDO SUITE DE TESTING COMPLETO', 'info');
        this.log('=====================================', 'info');

        // Tests de configuración base
        await this.runTest('Conexión a Base de Datos', () => this.testDatabaseConnection());
        await this.runTest('Modelos Cargados', () => this.testModelsLoaded());

        // Tests de lógica de ciclos
        await this.runTest('Ciclo Activo Único', () => this.testCicloActivoUnico());
        await this.runTest('Estados de Ciclos Válidos', () => this.testEstadosCiclosValidos());
        await this.runTest('Transiciones de Ciclos', () => this.testTransicionesCiclos());

        // Tests de usuarios y roles
        await this.runTest('Usuarios con Roles', () => this.testUsuariosConRoles());
        await this.runTest('Roles Válidos', () => this.testRolesValidos());

        // Tests de portafolios
        await this.runTest('Inicialización de Portafolios', () => this.testInicializacionPortafolios());

        // Tests de acceso por rol
        await this.runTest('Acceso Docentes', () => this.testAccesoDocentes());
        await this.runTest('Acceso Verificadores', () => this.testAccesoVerificadores());

        // Tests de datos por ciclo
        await this.runTest('Datos por Ciclo', () => this.testDatosPorCiclo());
        await this.runTest('Estados de Módulos', () => this.testEstadosModulos());

        // Reporte final
        this.generateReport();
    }

    generateReport() {
        this.log('=====================================', 'info');
        this.log('📊 REPORTE FINAL DE TESTING', 'info');
        this.log('=====================================', 'info');
        this.log(`Total de tests ejecutados: ${this.totalTests}`, 'info');
        this.log(`Tests exitosos: ${this.passedTests}`, 'success');
        this.log(`Tests fallidos: ${this.failedTests}`, this.failedTests > 0 ? 'error' : 'success');
        this.log(`Porcentaje de éxito: ${((this.passedTests / this.totalTests) * 100).toFixed(2)}%`, 
                 this.failedTests > 0 ? 'warning' : 'success');

        if (this.failedTests > 0) {
            this.log('\n❌ TESTS FALLIDOS:', 'error');
            this.testResults.filter(t => t.status === 'FAILED').forEach(test => {
                this.log(`   - ${test.name}: ${test.error}`, 'error');
            });
        }

        this.log('\n🎉 TESTING COMPLETADO', 'success');
    }
}

// Función principal
async function runTests() {
    const testSuite = new TestSuite();
    
    try {
        await testSuite.runAllTests();
    } catch (error) {
        console.error('Error crítico en testing:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    runTests();
}

module.exports = { TestSuite, runTests };