const mongoose = require('mongoose');
require('dotenv').config();

const BotLog = mongoose.model('BotLog', new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  level: String,
  message: String,
  data: mongoose.Schema.Types.Mixed
}));

async function viewLogs(limit = 20, level = null) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const filter = level ? { level } : {};
    const logs = await BotLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit);

    console.log(`\n📋 Últimos ${logs.length} logs:\n`);
    
    logs.reverse().forEach(log => {
      const emoji = log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : 'ℹ️';
      console.log(`${emoji} [${log.timestamp.toLocaleString()}] ${log.message}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

const limit = parseInt(process.argv[2]) || 20;
const level = process.argv[3] || null;

viewLogs(limit, level);