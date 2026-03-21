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

async function listTasks() {
    const args = process.argv.slice(2);
    // Podemos filtrar por responsable si se pasa como argumento
    const filterOwner = args[0];

    let query = supabase
        .from('tasks')
        .select('id, title, status, priority, owner, deadline')
        .order('created', { ascending: false })
        .limit(15);

    if (filterOwner && filterOwner !== 'Todos') {
        query = query.eq('owner', filterOwner);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error al listar:', error.message);
        process.exit(1);
    } else {
        console.log('--- TAREAS EN COMMANDER ---');
        data.forEach(t => {
            console.log(`[${t.id}] ${t.title} | ${t.status} | ${t.owner} | ${t.priority} ${t.deadline ? '| Vence: ' + t.deadline : ''}`);
        });
    }
}

listTasks();
