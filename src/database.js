const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_bot';

// Esquemas
const BotStateSchema = new mongoose.Schema({
  sessionId: { type: String, default: 'main' },
  isActive: { type: Boolean, default: false },
  lastActivity: { type: Date, default: Date.now },
  qrCode: { type: String, default: null },
  isAuthenticated: { type: Boolean, default: false },
  phoneNumber: { type: String, default: null }
});

const BotLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
  message: String,
  data: mongoose.Schema.Types.Mixed
});

const BotState = mongoose.model('BotState', BotStateSchema);
const BotLog = mongoose.model('BotLog', BotLogSchema);

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000
    });
    console.log('✅ Conectado a MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Error MongoDB:', error.message);
    throw error;
  }
}

async function logActivity(level, message, data = null) {
  try {
    const log = new BotLog({ level, message, data });
    await log.save();
    
    if (process.env.RENDER === 'true') {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  } catch (error) {
    console.error('Error guardando log:', error.message);
  }
}

module.exports = {
  BotState,
  BotLog,
  connectDatabase,
  logActivity
};
