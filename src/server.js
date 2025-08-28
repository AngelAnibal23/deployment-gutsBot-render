const express = require('express');
const { BotState } = require('./database');

function createWebServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({
      status: 'running',
      service: 'WhatsApp Bot',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString()
    });
  });

  app.get('/qr', async (req, res) => {
    try {
      const state = await BotState.findOne({ sessionId: 'main' });
      if (state?.qrCode) {
        res.json({ 
          qrCode: state.qrCode, 
          hasQR: true,
          instructions: 'Escanea este código QR con WhatsApp'
        });
      } else {
        res.json({ 
          hasQR: false, 
          message: 'No hay código QR disponible. El bot podría estar ya autenticado.'
        });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/status', async (req, res) => {
    try {
      const state = await BotState.findOne({ sessionId: 'main' });
      res.json({
        bot: {
          active: state?.isActive || false,
          authenticated: state?.isAuthenticated || false,
          phoneNumber: state?.phoneNumber || null,
          lastActivity: state?.lastActivity || null
        },
        server: {
          uptime: process.uptime(),
          environment: process.env.NODE_ENV || 'development',
          platform: process.env.RENDER ? 'Render' : 'Local'
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Servidor ejecutándose en puerto ${PORT}`);
  });

  return server;
}

module.exports = { createWebServer };