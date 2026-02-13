# 🦷 Atendia

Asistente IA por WhatsApp para consultorios dentales/médicos en Argentina.

## Setup rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar API key de Anthropic
export ANTHROPIC_API_KEY="tu-key-aquí"

# 3. Iniciar (configura datos demo + WhatsApp + dashboard)
npm run dev

# 4. Escanear QR de WhatsApp con el celular
# 5. Abrir dashboard: http://localhost:3000
```

## ¿Qué hace?

1. **Paciente escribe por WhatsApp** → La IA responde en español rioplatense
2. **Saca turnos** preguntando nombre, obra social, fecha/hora, motivo
3. **Cancela/reprograma** turnos existentes
4. **Responde FAQs** (dirección, obras sociales, horarios)
5. **Envía recordatorios** el día anterior al turno
6. **Dashboard web** para ver turnos y conversaciones

## Configuración del consultorio

Editá `src/setup.ts` para cambiar:
- Nombre y dirección del consultorio
- Horarios de atención
- Servicios ofrecidos
- Obras sociales aceptadas
- Duración de turnos

## Tech Stack

- Node.js + TypeScript
- whatsapp-web.js (conexión WhatsApp)
- Anthropic Claude (IA conversacional)
- SQLite (base de datos)
- Express (dashboard web)
