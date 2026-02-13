import cron from 'node-cron';
import { getDb } from './database';
import { sendMessage } from './whatsapp';

export function startReminders() {
  // Run every hour between 8-20
  cron.schedule('0 8-20 * * *', async () => {
    console.log('⏰ Checking for upcoming turnos to remind...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const turnos = getDb().prepare(`
      SELECT * FROM turnos 
      WHERE date = ? AND status = 'confirmed' AND notes NOT LIKE '%reminder_sent%'
    `).all(tomorrowStr) as any[];

    for (const turno of turnos) {
      try {
        const msg = `👋 ¡Hola ${turno.patient_name}! Te recordamos que mañana tenés turno a las ${turno.time} en el consultorio. Si necesitás cancelar o reprogramar, escribinos por acá. ¡Te esperamos!`;
        await sendMessage(turno.patient_phone, msg);
        
        // Mark as reminded
        getDb().prepare("UPDATE turnos SET notes = COALESCE(notes, '') || ' reminder_sent'").run();
        console.log(`📬 Reminder sent to ${turno.patient_name}`);
      } catch (e) {
        console.error(`Failed to send reminder to ${turno.patient_name}:`, e);
      }
    }
  });

  console.log('⏰ Reminder system active');
}
