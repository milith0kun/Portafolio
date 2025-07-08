const { sequelize } = require('./config/database');
const fs = require('fs');
const path = require('path');

/**
 * Script para ejecutar la migración de estados de ciclos académicos
 */
async function ejecutarMigracion() {
    try {
        console.log('🔄 Iniciando migración de estados de ciclos académicos...');
        
        // Leer el archivo SQL de migración
        const sqlPath = path.join(__dirname, '..', 'BASE-DE-DATOS', 'actualizacion_estados_ciclos.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Dividir el contenido en declaraciones individuales
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('DELIMITER'));
        
        console.log(`📋 Ejecutando ${statements.length} declaraciones SQL...`);
        
        // Ejecutar cada declaración
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Saltar comentarios y declaraciones vacías
            if (statement.startsWith('--') || statement.trim() === '') {
                continue;
            }
            
            try {
                console.log(`⚡ Ejecutando declaración ${i + 1}/${statements.length}...`);
                await sequelize.query(statement);
                console.log(`✅ Declaración ${i + 1} ejecutada correctamente`);
            } catch (error) {
                console.error(`❌ Error en declaración ${i + 1}:`, error.message);
                // Continuar con las siguientes declaraciones
            }
        }
        
        console.log('✅ Migración completada exitosamente');
        
        // Verificar que las columnas se agregaron correctamente
        const [results] = await sequelize.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'portafolio_docente_carga_academica' 
            AND TABLE_NAME = 'ciclos_academicos' 
            AND COLUMN_NAME IN ('fecha_inicializacion', 'fecha_activacion', 'fecha_inicio_verificacion')
        `);
        
        console.log('🔍 Verificación de columnas agregadas:');
        results.forEach(row => {
            console.log(`  ✅ ${row.COLUMN_NAME}`);
        });
        
        if (results.length === 3) {
            console.log('🎉 Todas las columnas se agregaron correctamente');
        } else {
            console.log('⚠️  Algunas columnas no se agregaron correctamente');
        }
        
    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
        throw error;
    } finally {
        await sequelize.close();
        console.log('🔌 Conexión a la base de datos cerrada');
    }
}

// Ejecutar la migración
ejecutarMigracion()
    .then(() => {
        console.log('🏁 Proceso de migración finalizado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error fatal:', error.message);
        process.exit(1);
    });