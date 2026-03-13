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

async function addTask() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('Uso: node add_task.js "Título" "Notas" "Prioridad" "Responsable" "Tags (separados por coma)"');
        process.exit(1);
    }

    const [title, notes, priority, owner, tagsRaw] = args;
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [];

    const newTask = {
        id: Date.now(),
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
        .from('tasks')
        .insert([newTask]);

    if (error) {
        console.error('Error al insertar:', error.message);
        process.exit(1);
    } else {
        console.log('Tarea creada con éxito en la nube!');
    }
}

addTask();
