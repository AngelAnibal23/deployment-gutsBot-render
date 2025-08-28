const { logActivity } = require('./database');

async function handleMessage(message, bot) {
  try {
    const body = message.body.toLowerCase();

    // Actualizar actividad
    await bot.updateBotState({ lastActivity: new Date() });

    // Comandos
    switch (body) {
      case '/ping':
        await message.reply('🤖 ¡Bot activo!');
        break;
        
      case '/status':
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        await message.reply(
          `📊 *Estado del Bot*\n` +
          `⏱️ Activo: ${hours}h ${minutes}m\n` +
          `🌐 Plataforma: ${process.env.RENDER ? 'Render' : 'Local'}\n` +
          `✅ Funcionando`
        );
        break;
        
      case '/info':
        const phoneNumber = bot.botState?.phoneNumber || 'No disponible';
        const lastActivity = bot.botState?.lastActivity?.toLocaleString() || 'Desconocido';
        await message.reply(
          `ℹ️ *Información*\n` +
          `📱 Teléfono: ${phoneNumber}\n` +
          `🕐 Última actividad: ${lastActivity}\n` +
          `✅ Estado: Activo`
        );
        break;
        
      default:
        // Aquí puedes añadir más lógica para otros mensajes
        break;
    }

    await logActivity('info', 'Mensaje procesado', { 
      from: message.from, 
      command: body
    });
    
  } catch (error) {
    await logActivity('error', 'Error procesando mensaje', { error: error.message });
  }
}

module.exports = { handleMessage };