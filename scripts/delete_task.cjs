const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer credenciales del archivo .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function deleteTask() {
    const args = process.argv.slice(2);
    const identifier = args[0];

    if (!identifier) {
        console.error('Uso: node delete_task.cjs "ID o Título"');
        process.exit(1);
    }

    // 1. Intentar borrar por ID
    if (!isNaN(identifier)) {
        const { error } = await supabase.from('tasks').delete().eq('id', identifier);
        if (!error) {
            console.log(`✅ Tarea con ID ${identifier} eliminada.`);
            process.exit(0);
        }
    }

    // 2. Si no es número o falló por ID, buscar por título
    const { data, error: searchError } = await supabase
        .from('tasks')
        .select('id, title')
        .ilike('title', `%${identifier}%`);

    if (searchError) {
        console.error('Error buscando:', searchError.message);
        process.exit(1);
    }

    if (!data || data.length === 0) {
        console.log(`🔍 No se encontró ninguna tarea con "${identifier}".`);
    } else if (data.length > 1) {
        console.log(`⚠️ Se encontraron varias coincidencias. Por favor usa el ID:\n${data.map(t => `- [${t.id}] ${t.title}`).join('\n')}`);
    } else {
        const { error: delError } = await supabase.from('tasks').delete().eq('id', data[0].id);
        if (delError) {
            console.error('Error al borrar:', delError.message);
            process.exit(1);
        }
        console.log(`✅ Tarea "${data[0].title}" eliminada con éxito.`);
    }
}

deleteTask();
