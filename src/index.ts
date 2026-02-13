import { initWhatsApp } from './whatsapp';
import { startDashboard } from './dashboard';
import { startReminders } from './reminders';
import { getAllConfig } from './database';

// Run setup if no config exists
const config = getAllConfig();
if (!config.practice_name) {
  console.log('⚙️  Primera ejecución, configurando datos de demo...');
  require('./setup');
}

console.log(`
╔═══════════════════════════════════════╗
║          🦷 ATENDIA v1.0             ║
║   Asistente IA para consultorios     ║
╚═══════════════════════════════════════╝
`);

// Start dashboard
const port = parseInt(process.env.PORT || '3000');
startDashboard(port);

// Start WhatsApp
console.log('📱 Iniciando conexión WhatsApp...');
initWhatsApp();

// Start reminders
startReminders();

console.log('\n🚀 Atendia corriendo. Esperando conexión WhatsApp...\n');
