const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer credenciales del archivo .env que está en la carpeta raíz de alumbra-commander
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function logChat() {
    const args = process.argv.slice(2);
    if (args.length < 4) {
        console.error('Uso: node log_chat_supabase.cjs <chat_id> <agent> <role> <content_json>');
        process.exit(1);
    }

    const [chatId, agent, role, contentJson] = args;
    
    try {
        const content = JSON.parse(contentJson);
        const { error } = await supabase
            .from('chat_history')
            .insert([
                { 
                    chat_id: parseInt(chatId), 
                    agent: agent, 
                    role: role, 
                    content: content 
                }
            ]);

        if (error) {
            console.error('Error insertando en Supabase:', error.message);
            process.exit(1);
        } else {
            console.log(`✅ Mensaje guardado en Supabase (${role} -> ${agent})`);
        }
    } catch (e) {
        console.error('Error procesando JSON o Supabase:', e.message);
        process.exit(1);
    }
}

logChat();
