const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar env de Sales
const envPath = 'c:/Users/SAMUEL/Desktop/Antigravity/Seguimiento comercial/sales-commander/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function migrate() {
    console.log('--- INICIANDO MIGRACIÓN ---');
    
    // 1. Obtener tareas de Fernando Nieto de la tabla principal
    const { data: fernandoTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('owner', 'Fernando Nieto');

    if (fetchError) {
        console.error('Error al recuperar tareas:', fetchError);
        return;
    }

    if (!fernandoTasks || fernandoTasks.length === 0) {
        console.log('No se encontraron tareas de Fernando Nieto para migrar.');
        return;
    }

    console.log(`Encontradas ${fernandoTasks.length} tareas. Migrando a 'tasks_sales'...`);

    // 2. Insertar en la nueva tabla
    // Nota: La tabla debe existir. Si no existe, este paso fallará.
    const { error: insertError } = await supabase
        .from('tasks_sales')
        .upsert(fernandoTasks);

    if (insertError) {
        console.error('Error al insertar en tasks_sales (¿Existe la tabla?):', insertError);
        console.log('IMPORTANTE: Asegúrate de ejecutar el SQL adjunto en Supabase primero.');
        return;
    }

    // 3. Eliminar de la tabla personal
    const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('owner', 'Fernando Nieto');

    if (deleteError) {
        console.error('Error al borrar de la tabla original:', deleteError);
    } else {
        console.log('Migración completada con éxito. Tareas movidas.');
    }
}

migrate();
