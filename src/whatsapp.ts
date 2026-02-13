import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { handleMessage } from './ai';
import { appendMessage } from './database';

let client: Client;
let isReady = false;

export function getWhatsAppClient(): Client {
  return client;
}

export function isWhatsAppReady(): boolean {
  return isReady;
}

export function initWhatsApp(): Client {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: '.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    }
  });

  client.on('qr', (qr: string) => {
    console.log('\n📱 Escaneá este QR con WhatsApp:\n');
    qrcode.generate(qr, { small: true });
    console.log('\nAbrí WhatsApp > Dispositivos vinculados > Vincular dispositivo\n');
  });

  client.on('ready', () => {
    isReady = true;
    console.log('✅ WhatsApp conectado y listo!');
  });

  client.on('authenticated', () => {
    console.log('🔐 WhatsApp autenticado');
  });

  client.on('auth_failure', (msg: string) => {
    console.error('❌ Error de autenticación:', msg);
  });

  client.on('disconnected', (reason: string) => {
    isReady = false;
    console.log('📴 WhatsApp desconectado:', reason);
  });

  client.on('message', async (msg: Message) => {
    // Ignore group messages, status updates, and own messages
    if (msg.isStatus || msg.from.includes('@g.us') || msg.fromMe) return;
    
    const phone = msg.from; // e.g., 5491112345678@c.us
    const userText = msg.body;

    if (!userText || userText.trim() === '') return;

    console.log(`📨 ${phone}: ${userText}`);

    try {
      // Save user message
      appendMessage(phone, 'user', userText);

      // Get AI response
      const reply = await handleMessage(userText, phone);

      // Save and send response
      appendMessage(phone, 'assistant', reply);
      await msg.reply(reply);

      console.log(`📤 → ${phone}: ${reply.substring(0, 80)}...`);
    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);
      try {
        await msg.reply('Disculpá, tuve un problema técnico. ¿Podés intentar de nuevo en un momento?');
      } catch (e) {
        console.error('❌ Error enviando respuesta de error:', e);
      }
    }
  });

  client.initialize();
  return client;
}

export async function sendMessage(to: string, message: string): Promise<void> {
  if (!client || !isReady) throw new Error('WhatsApp not ready');
  await client.sendMessage(to, message);
}
