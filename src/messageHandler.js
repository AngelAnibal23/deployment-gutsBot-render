const { logActivity } = require('./database');
const { checkIfUserIsAdmin } = require('./validations');


// Funciones de comandos
async function pingCommand(message) {
  await message.reply('🤖 ¡Bot activo!');
}

async function statusCommand(message) {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  await message.reply(
    `📊 *Estado del Bot*\n` +
    `⏱️ Activo: ${hours}h ${minutes}m\n` +
    `🌐 Plataforma: ${process.env.RENDER ? 'Render' : 'Local'}\n` +
    `✅ Funcionando`
  );
}

async function commandsCommand(message) {
  await message.reply(
    `📋 *Comandos Disponibles:*\n\n` +
    `🤖 /ping - Verificar si el bot está activo\n` +
    `📊 /status - Ver estado del bot\n` +
    `👥 /everyone [mensaje] - Mencionar a todos (solo admins)\n` +
    `📅 /horario [día] - Ver horario del día\n` +
    `📋 /commands - Mostrar esta lista`
  );
}

async function everyoneCommand(message, bot) {
  const chat = await message.getChat();

  if (!chat.isGroup) {
    await message.reply('🚫 Este comando solo funciona en grupos.');
    return;
  }

  const isAdmin = await checkIfUserIsAdmin(message, chat);

  if (!isAdmin) {
    await message.reply('🚫 Solo los administradores pueden usar el comando /everyone.');
    return;
  }

  const command = message.body.split(' ');
  const customMessage = command.slice(1).join(' ') || '🔔 ¡Atención a todos!';

  const mentions = [];
  let text = `${customMessage}\n`;

  console.log(bot.client.info); 

  const botId = bot.client.info.wid._serialized; 
  

  for (let participant of chat.participants) {
    if (participant.id._serialized === botId) continue;
    const contact = await bot.client.getContactById(participant.id._serialized);
    mentions.push(contact);
    text += `@${contact.number} `;
  }

  await chat.sendMessage(text, { mentions });
}

async function horarioCommand(message) {
  const params = message.body.split(' ');
  const dia = params[1] ? params[1].toLowerCase() : '';
  
  if (!dia) {
    await message.reply('🚫 Especifica un día. Ejemplo: /horario lunes');
    return;
  }
  
  // Aquí implementarías la lógica del horario
  await message.reply(`📅 Horario para ${dia} - Funcionalidad pendiente`);
}

// Mapa de comandos - aquí defines qué función ejecutar para cada comando
const commands = {
  // Comandos exactos (sin parámetros)
  exact: {
    '/ping': pingCommand,
    '/status': statusCommand,
    '/commands': commandsCommand
  },
  // Comandos que empiezan con (con parámetros)
  startsWith: {
    '/everyone': everyoneCommand,
    '/horario': horarioCommand
  }
};

// Función para encontrar qué comando ejecutar
function findCommand(body) {
  const lowerBody = body.toLowerCase();
  const firstWord = lowerBody.split(' ')[0];
  
  // Primero buscar comandos exactos
  if (commands.exact[firstWord]) {
    return commands.exact[firstWord];
  }
  
  // Luego buscar comandos que empiecen con
  for (const commandStart in commands.startsWith) {
    if (lowerBody.startsWith(commandStart)) {
      return commands.startsWith[commandStart];
    }
  }
  
  return null;
}

async function handleMessage(message, bot) {
  try {
    // Preservar el mensaje original
    const originalBody = message.body;
    
    // Actualizar actividad
    await bot.updateBotState({ lastActivity: new Date() });

    // Encontrar el comando a ejecutar
    const commandFunction = findCommand(originalBody);
    if (commandFunction) {
      await commandFunction(message, bot);
    }

    await logActivity('info', 'Mensaje procesado', { 
      from: message.from, 
      originalMessage: originalBody
    });
    
  } catch (error) {
    await logActivity('error', 'Error procesando mensaje', { error: error.message });
    console.error('Error en handleMessage:', error);
  }
}

module.exports = { 
  handleMessage,
  commands,
  findCommand,
  pingCommand,
  statusCommand,
  commandsCommand,
  everyoneCommand,
  horarioCommand
};