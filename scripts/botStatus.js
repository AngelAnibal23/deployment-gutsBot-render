const mongoose = require('mongoose');
require('dotenv').config();

const BotState = mongoose.model('BotState', new mongoose.Schema({
  sessionId: String,
  isActive: Boolean,
  lastActivity: Date,
  isAuthenticated: Boolean,
  phoneNumber: String
}));

async function getBotStatus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const state = await BotState.findOne({ sessionId: 'main' });

    console.log('\n🤖 ESTADO DEL BOT');
    console.log('==================');
    
    if (state) {
      console.log(`📱 Teléfono: ${state.phoneNumber || 'No asignado'}`);
      console.log(`✅ Estado: ${state.isActive ? 'ACTIVO' : 'INACTIVO'}`);
      console.log(`🔐 Autenticado: ${state.isAuthenticated ? 'SÍ' : 'NO'}`);
      console.log(`🕐 Última actividad: ${state.lastActivity?.toLocaleString() || 'Desconocido'}`);
    } else {
      console.log('❌ No se encontró estado del bot');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

getBotStatus();