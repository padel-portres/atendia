import Anthropic from '@anthropic-ai/sdk';
import { getAllConfig, getAvailableSlots, getTurnosByPhone, createTurno, cancelTurno, getTurnoById, getOrCreateConversation } from './database';

const client = new Anthropic();

function buildSystemPrompt(): string {
  const config = getAllConfig();
  const hours = JSON.parse(config.operating_hours || '{}');
  const services = JSON.parse(config.services || '[]');
  const obrasSociales = JSON.parse(config.obras_sociales || '[]');
  
  const hoursText = Object.entries(hours)
    .map(([day, h]: [string, any]) => `  ${day}: ${h.open ? `${h.start} a ${h.end}` : 'cerrado'}`)
    .join('\n');

  const now = new Date();
  const currentDay = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][now.getDay()];
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const currentDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  
  // Check if currently open
  const todayHours = hours[currentDay];
  const isOpen = todayHours?.open && currentTime >= todayHours.start && currentTime < todayHours.end;

  return `Sos el asistente virtual de ${config.practice_name || 'el consultorio'}. 
Hablás en español rioplatense (usás "vos", "tenés", "podés", etc). Sos cálido, profesional y conciso.

INFORMACIÓN DEL CONSULTORIO:
- Nombre: ${config.practice_name || 'Consultorio'}
- Dirección: ${config.practice_address || 'No configurada'}
- Teléfono: ${config.practice_phone || 'No configurado'}
- Horarios:\n${hoursText}
- Servicios: ${services.join(', ')}
- Obras sociales: ${obrasSociales.join(', ')}
- Duración de turno: ${config.turno_duration || 30} minutos

ESTADO ACTUAL:
- Fecha: ${currentDate} (${currentDay})
- Hora: ${currentTime}
- El consultorio está: ${isOpen ? 'ABIERTO' : 'CERRADO'}

INSTRUCCIONES:
1. Cuando alguien quiere sacar un turno, necesitás:
   - Nombre del paciente
   - Obra social (o particular)
   - Fecha y hora preferida
   - Motivo/servicio
   Pedí estos datos de forma conversacional, no todo junto.

2. Antes de confirmar un turno, SIEMPRE usá la función check_availability para verificar disponibilidad real.

3. Para confirmar un turno, usá la función book_turno.

4. Para cancelar, usá cancel_turno.

5. Si el consultorio está CERRADO, decí algo como: "El consultorio está cerrado en este momento, pero podés sacar turno para cuando abramos."

6. Si no estás seguro de algo médico, decí: "Dejame consultar con el/la doctor/a y te aviso."

7. NUNCA inventes disponibilidad. Siempre verificá con check_availability.

8. Sé breve. No hagas mensajes largos. Esto es WhatsApp, no un email.

9. Si el paciente dice una fecha como "mañana", "el lunes", "la semana que viene", convertila a formato YYYY-MM-DD.

10. Cuando listes horarios disponibles, mostrá máximo 5-6 opciones para no abrumar.`;
}

const tools: Anthropic.Tool[] = [
  {
    name: 'check_availability',
    description: 'Check available turno slots for a given date. Returns list of available times.',
    input_schema: {
      type: 'object' as const,
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' }
      },
      required: ['date']
    }
  },
  {
    name: 'book_turno',
    description: 'Book a turno for a patient. All fields required.',
    input_schema: {
      type: 'object' as const,
      properties: {
        patient_name: { type: 'string', description: 'Patient full name' },
        date: { type: 'string', description: 'Date YYYY-MM-DD' },
        time: { type: 'string', description: 'Time HH:MM' },
        service: { type: 'string', description: 'Service/reason' },
        obra_social: { type: 'string', description: 'Obra social or Particular' }
      },
      required: ['patient_name', 'date', 'time', 'service', 'obra_social']
    }
  },
  {
    name: 'cancel_turno',
    description: 'Cancel a turno by ID',
    input_schema: {
      type: 'object' as const,
      properties: {
        turno_id: { type: 'number', description: 'Turno ID to cancel' }
      },
      required: ['turno_id']
    }
  },
  {
    name: 'get_patient_turnos',
    description: 'Get all turnos for a patient by phone number',
    input_schema: {
      type: 'object' as const,
      properties: {
        phone: { type: 'string', description: 'Patient phone number' }
      },
      required: ['phone']
    }
  }
];

function executeTool(name: string, input: any, patientPhone: string): string {
  switch (name) {
    case 'check_availability': {
      const slots = getAvailableSlots(input.date);
      if (slots.length === 0) {
        return JSON.stringify({ available: false, message: 'No hay turnos disponibles para esa fecha.' });
      }
      return JSON.stringify({ available: true, slots: slots.slice(0, 8), total: slots.length });
    }
    case 'book_turno': {
      // Verify slot is still available
      const slots = getAvailableSlots(input.date);
      if (!slots.includes(input.time)) {
        return JSON.stringify({ success: false, error: 'Ese horario ya no está disponible.' });
      }
      const turno = createTurno({
        patient_name: input.patient_name,
        patient_phone: patientPhone,
        date: input.date,
        time: input.time,
        service: input.service,
        obra_social: input.obra_social,
        status: 'confirmed'
      });
      return JSON.stringify({ success: true, turno_id: turno.id, message: 'Turno confirmado' });
    }
    case 'cancel_turno': {
      const turno = getTurnoById(input.turno_id);
      if (!turno) return JSON.stringify({ success: false, error: 'Turno no encontrado.' });
      cancelTurno(input.turno_id);
      return JSON.stringify({ success: true, message: 'Turno cancelado' });
    }
    case 'get_patient_turnos': {
      const turnos = getTurnosByPhone(input.phone);
      const upcoming = turnos.filter(t => t.date >= new Date().toISOString().split('T')[0] && t.status === 'confirmed');
      return JSON.stringify({ turnos: upcoming });
    }
    default:
      return JSON.stringify({ error: 'Unknown tool' });
  }
}

export async function handleMessage(userMessage: string, phone: string): Promise<string> {
  const conv = getOrCreateConversation(phone);
  
  // Build messages from conversation history
  const messages: Anthropic.MessageParam[] = conv.messages
    .filter((m: any) => m.role === 'user' || m.role === 'assistant')
    .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  
  messages.push({ role: 'user', content: userMessage });

  let response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: buildSystemPrompt(),
    tools,
    messages,
  });

  // Handle tool use loop
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    const toolResults: Anthropic.MessageParam = {
      role: 'user',
      content: toolUseBlocks.map(block => {
        if (block.type !== 'tool_use') return block;
        const result = executeTool(block.name, block.input, phone);
        return {
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: result
        };
      })
    };

    messages.push({ role: 'assistant', content: response.content });
    messages.push(toolResults);

    response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: buildSystemPrompt(),
      tools,
      messages,
    });
  }

  // Extract text response
  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock && textBlock.type === 'text' ? textBlock.text : 'Disculpá, hubo un error. ¿Podés repetir?';
}
