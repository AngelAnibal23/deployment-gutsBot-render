const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const SessionData = mongoose.model('SessionData', new mongoose.Schema({
  sessionId: String,
  authData: String,
  lastSync: Date,
  environment: String
}));

async function syncSessionToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const sessionPath = './wwebjs_auth/session-main';
    
    try {
      const authData = await fs.readFile(sessionPath, 'utf8');
      
      await SessionData.findOneAndUpdate(
        { sessionId: 'main' },
        { 
          authData: authData,
          lastSync: new Date(),
          environment: 'manual-sync'
        },
        { upsert: true }
      );
      
      console.log('✅ Sesión sincronizada manualmente a MongoDB');
      
    } catch (fileError) {
      console.log('❌ No se encontró archivo de sesión local');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  syncSessionToMongoDB();
}

module.exports = syncSessionToMongoDB;