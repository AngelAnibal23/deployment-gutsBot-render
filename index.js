require('dotenv').config();
const WhatsAppBot = require('./src/bot');
const { connectDatabase } = require('./src/database');
const { createWebServer } = require('./src/server');

const IS_RENDER = process.env.RENDER === 'true';

async function main() {
  try {
    console.log('🚀 Iniciando WhatsApp Bot...');
    
    // Conectar a la base de datos
    await connectDatabase();
    
    // Crear servidor web (necesario para Render)
    const server = createWebServer();
    
    // Crear e iniciar el bot
    const bot = new WhatsAppBot();
    await bot.start();
    
    // Manejar cierre graceful
    process.on('SIGINT', () => gracefulShutdown(bot, server));
    process.on('SIGTERM', () => gracefulShutdown(bot, server));
    
    // Manejar errores no capturados
    process.on('uncaughtException', (error) => {
      console.error('💥 Error no capturado:', error);
      if (IS_RENDER) process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('💥 Promesa rechazada:', reason);
    });
    
    console.log('✅ Bot iniciado correctamente');
    
  } catch (error) {
    console.error('❌ Error iniciando la aplicación:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(bot, server) {
  console.log('\n🛑 Cerrando aplicación...');
  
  try {
    await bot.stop();
    server.close();
    console.log('✅ Aplicación cerrada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cerrando aplicación:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
