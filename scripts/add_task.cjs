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

async function manageTask() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Uso: node add_task.js "Título" "Notas" "Prioridad" "Responsable" "Tags (separados por coma)" [ID]');
        process.exit(1);
    }

    const [title, notes, priority, owner, tagsRaw, idFromArgs] = args;
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [];
    
    // Si viene ID de los argumentos, lo usamos, si no, generamos uno nuevo (solo para creación real)
    const taskId = idFromArgs ? parseInt(idFromArgs) : Date.now();

    const task = {
        id: taskId,
        title: title || 'Nueva Tarea sin título',
        notes: notes || '',
        status: 'To Do',
        priority: priority || 'Media',
        owner: owner || 'Samuel Gamito',
        created: new Date().toISOString().split('T')[0],
        deadline: null,
        tags: tags
    };

    const { data, error } = await supabase
        .from('tasks_sales')
        .upsert([task], { onConflict: 'id' });

    if (error) {
        console.error('Error al persistir:', error.message);
        process.exit(1);
    } else {
        console.log(`✅ Tarea ${idFromArgs ? 'actualizada' : 'creada'} con éxito (ID: ${taskId})`);
    }
}

manageTask();
