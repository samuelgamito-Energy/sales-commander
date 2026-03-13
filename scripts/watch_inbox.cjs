const { execSync } = require('child_process');
const path = require('path');

const SYNC_SCRIPT = path.join(__dirname, 'sync_telegram.cjs');
const INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

console.log(`🚀 Vigilante de Alumbra Commander Iniciado (Intervalo: 5 min)`);
console.log(`Presiona Ctrl+C para detener.`);

function runSync() {
    try {
        console.log(`[${new Date().toLocaleTimeString()}] Ejecutando sincronización...`);
        execSync(`node "${SYNC_SCRIPT}"`, { stdio: 'inherit' });
    } catch (error) {
        console.error('Error en el vigilante:', error.message);
    }
}

// Ejecutar una primera vez al arrancar
runSync();

// Configurar el ciclo infinito
setInterval(runSync, INTERVAL_MS);
