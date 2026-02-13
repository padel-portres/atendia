import { setConfig, getAllConfig } from './database';

// Default practice configuration for demo
const defaults: Record<string, string> = {
  practice_name: 'Consultorio Dental Dra. García',
  practice_address: 'Av. Corrientes 1234, CABA',
  practice_phone: '011-4567-8900',
  operating_hours: JSON.stringify({
    lunes: { open: true, start: '09:00', end: '18:00' },
    martes: { open: true, start: '09:00', end: '18:00' },
    miercoles: { open: true, start: '09:00', end: '18:00' },
    jueves: { open: true, start: '09:00', end: '18:00' },
    viernes: { open: true, start: '09:00', end: '18:00' },
    sabado: { open: true, start: '09:00', end: '13:00' },
    domingo: { open: false, start: '', end: '' },
  }),
  services: JSON.stringify([
    'Limpieza dental',
    'Extracción',
    'Ortodoncia',
    'Implantes',
    'Blanqueamiento',
    'Control general',
    'Endodoncia',
    'Prótesis',
  ]),
  obras_sociales: JSON.stringify([
    'OSDE',
    'Swiss Medical',
    'Galeno',
    'Medifé',
    'IOMA',
    'Particular',
  ]),
  turno_duration: '30',
  max_turnos_per_day: '20',
};

console.log('🏥 Configurando Atendia con datos de demo...\n');

const existing = getAllConfig();

for (const [key, value] of Object.entries(defaults)) {
  if (!existing[key]) {
    setConfig(key, value);
    console.log(`  ✅ ${key}`);
  } else {
    console.log(`  ⏭️  ${key} (ya configurado)`);
  }
}

console.log('\n✨ Configuración lista!\n');
console.log('Para iniciar: npm run dev');
