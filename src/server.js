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
        // Generar página HTML con QR code visual
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
              <title>WhatsApp QR Code</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
              <style>
                  body { 
                      font-family: Arial, sans-serif; 
                      text-align: center; 
                      padding: 20px;
                      background: #f5f5f5;
                  }
                  .container { 
                      max-width: 400px; 
                      margin: 0 auto; 
                      background: white;
                      padding: 30px;
                      border-radius: 10px;
                      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                  }
                  #qrcode { margin: 20px 0; }
                  .instructions {
                      color: #666;
                      font-size: 14px;
                      margin-top: 15px;
                  }
                  .refresh-btn {
                      background: #25d366;
                      color: white;
                      border: none;
                      padding: 10px 20px;
                      border-radius: 5px;
                      cursor: pointer;
                      margin-top: 15px;
                  }
                  .refresh-btn:hover {
                      background: #128c7e;
                  }
                  .status { 
                      margin: 10px 0; 
                      padding: 10px;
                      border-radius: 5px;
                      background: #e3f2fd;
                      color: #1976d2;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <h2>🤖 WhatsApp Bot</h2>
                  <div class="status">
                      ✅ Bot ejecutándose - Listo para escanear
                  </div>
                  <div id="qrcode"></div>
                  <div class="instructions">
                      📱 <strong>Instrucciones:</strong><br>
                      1. Abre WhatsApp en tu teléfono<br>
                      2. Ve a Configuración → Dispositivos vinculados<br>
                      3. Toca "Vincular un dispositivo"<br>
                      4. Escanea este código QR
                  </div>
                  <button class="refresh-btn" onclick="location.reload()">🔄 Actualizar QR</button>
              </div>
              
              <script>
                  const qrString = '${state.qrCode}';
                  QRCode.toCanvas(document.getElementById('qrcode'), qrString, {
                      width: 300,
                      margin: 2,
                      color: {
                          dark: '#000000',
                          light: '#FFFFFF'
                      }
                  }, function (error) {
                      if (error) {
                          document.getElementById('qrcode').innerHTML = 
                              '<p style="color: red;">Error generando QR: ' + error + '</p>';
                      }
                  });
                  
                  // Auto-refresh cada 30 segundos
                  setTimeout(() => {
                      location.reload();
                  }, 30000);
              </script>
          </body>
          </html>
        `;
        res.send(html);
      } else {
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>WhatsApp Bot Status</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                  body { 
                      font-family: Arial, sans-serif; 
                      text-align: center; 
                      padding: 20px;
                      background: #f5f5f5;
                  }
                  .container { 
                      max-width: 400px; 
                      margin: 0 auto; 
                      background: white;
                      padding: 30px;
                      border-radius: 10px;
                      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                  }
                  .status-ok { 
                      background: #e8f5e8;
                      color: #2e7d32;
                      padding: 20px;
                      border-radius: 5px;
                  }
                  .refresh-btn {
                      background: #25d366;
                      color: white;
                      border: none;
                      padding: 10px 20px;
                      border-radius: 5px;
                      cursor: pointer;
                      margin-top: 15px;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <h2>🤖 WhatsApp Bot</h2>
                  <div class="status-ok">
                      ✅ <strong>Bot ya autenticado</strong><br>
                      No necesitas escanear QR.<br>
                      El bot está listo para usar.
                  </div>
                  <button class="refresh-btn" onclick="location.reload()">🔄 Actualizar</button>
              </div>
          </body>
          </html>
        `);
      }
    } catch (error) {
      res.status(500).send(`
        <html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>❌ Error</h2>
          <p>${error.message}</p>
          <button onclick="location.reload()">Reintentar</button>
        </body>
        </html>
      `);
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