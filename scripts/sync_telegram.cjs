const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INBOX_DIR = path.join(__dirname, '..', 'inbox_telegram');
const PROCESSED_DIR = path.join(INBOX_DIR, 'processed');
const ADD_TASK_SCRIPT = path.join(__dirname, 'add_task.cjs');

async function sync() {
    console.log('--- Iniciando Sincronización Telegram SecretariaSGM ---');

    if (!fs.existsSync(INBOX_DIR)) {
        console.error('El directorio de entrada no existe.');
        return;
    }

    const files = fs.readdirSync(INBOX_DIR).filter(f => f.endsWith('.json') || f.endsWith('.txt'));

    if (files.length === 0) {
        console.log('No hay mensajes nuevos en el buzón.');
        return;
    }

    for (const file of files) {
        const filePath = path.join(INBOX_DIR, file);
        console.log(`Procesando: ${file}...`);

        try {
            let taskData = {};
            const content = fs.readFileSync(filePath, 'utf8');

            if (file.endsWith('.json')) {
                taskData = JSON.parse(content);
            } else {
                const lines = content.split('\n');
                taskData = {
                    title: lines[0].trim(),
                    notes: lines.slice(1).join(' ').trim() || 'Importado desde Telegram'
                };
            }

            // Ejecutar el script add_task.cjs con los datos
            const cmd = `node "${ADD_TASK_SCRIPT}" "${taskData.title || 'Misión sin título'}" "${taskData.notes || ''}" "${taskData.priority || 'Media'}" "${taskData.owner || 'Samuel Gamito'}" "${taskData.tags || 'Telegram'}"`;

            execSync(cmd, { stdio: 'inherit' });

            // Mover a procesados
            const destPath = path.join(PROCESSED_DIR, file);
            fs.renameSync(filePath, destPath);
            console.log(`✅ Tarea "${taskData.title}" sincronizada con éxito.`);

        } catch (error) {
            console.error(`❌ Error procesando ${file}:`, error.message);
        }
    }
    console.log('--- Sincronización Finalizada ---');
}

sync();
